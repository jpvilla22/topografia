import * as THREE from 'three';
import { MinimapTextureGenerator } from '../materials/MinimapTextureGenerator';
import { VRObject } from './VRObject';
import { Flag } from './Flag';
import { TerrainLine } from './TerrainLine';
import { findObjectBy } from '../utils/findObjectBy';
import { BeaconMaterial } from '../materials/BeaconMaterial';

export class Minimap extends VRObject {
  private static CURVES_COLOR = 0xffffff;
  private static WIDTH = 1.5; // width in meters

  generator: MinimapTextureGenerator;

  private flags: Flag[] = [];
  private scaleFactor: number = 1;

  constructor(terrainGeometry: THREE.BufferGeometry) {
    const generator = new MinimapTextureGenerator(terrainGeometry);
    generator.render();

    super(Minimap.buildObject(generator));
    this.generator = generator;
    this.object.name = 'minimap';
    this.toggleVisibility(false);
  }

  get width() {
    return Minimap.WIDTH;
  }

  get height() {
    return (Minimap.WIDTH / this.generator.width) * this.generator.height;
  }

  toggleVisibility(value = !this.object.visible) {
    this.object.visible = value;
  }

  updateLevelHeight(value: number) {
    this.generator.levelHeight = value;
    this.generator.render();
  }

  /** @param pos New position in map's world coordinates */
  updateUserIcon(pos: THREE.Vector3) {
    const user = this.findObjectFromPrefix('user');
    const coords = this.terrainToMinimap(pos);
    user.position.set(coords.x, coords.y, 0.001);
  }

  addFlagIcon(flag: Flag) {
    this.flags.push(flag);

    // Build the flag representation mesh
    const iconGeom = new THREE.RingGeometry(0.002, 0.003, 16);
    const iconMat = new THREE.MeshBasicMaterial({ color: flag.color });
    const icon = new THREE.Mesh(iconGeom, iconMat);
    icon.name = 'flag';
    icon.userData.objectID = flag.object.uuid;

    // Get the position in minimap
    const coords = this.terrainToMinimap(flag.position);
    icon.position.set(coords.x, coords.y, 0.001);

    this.elements.add(icon);
  }

  addLine(line: TerrainLine) {
    const geometry = line.geometry.clone();
    geometry.points.forEach((point) => {
      const coord = this.terrainToMinimap(point);
      point.set(coord.x, coord.y, 0.001);
    });

    geometry.thickness = 0.002;
    geometry.generate();

    const mat = new THREE.MeshBasicMaterial({ color: line.color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = 'line';
    mesh.userData.objectID = line.object.uuid;
    this.elements.add(mesh);
  }

  removeIcon(element: VRObject) {
    this.findElement(element)?.removeFromParent();
  }

  set scale(v: number) {
    this.scaleFactor = v;
    this.object.scale.setScalar(this.scaleFactor * v);
  }

  get scale() {
    return this.scaleFactor;
  }

  private static buildObject(generator: MinimapTextureGenerator): THREE.Object3D {
    const object = new THREE.Object3D();

    // Build the minimap
    const minimapGeom = new THREE.PlaneGeometry(generator.width, generator.height);
    const minimapMat = new THREE.MeshBasicMaterial({ color: Minimap.CURVES_COLOR });
    minimapMat.map = generator.texture;
    const minimap = new THREE.Mesh(minimapGeom, minimapMat);
    const scale = Minimap.WIDTH / generator.width;
    minimap.scale.setScalar(scale);

    minimap.name = 'minimap-texture';
    object.add(minimap);

    // Add a frame to the minimap
    const frameGeom = new THREE.PlaneGeometry(generator.width * scale + 0.02, generator.height * scale + 0.02);
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x140c02, side: THREE.DoubleSide });
    const frame = new THREE.Mesh(frameGeom, frameMaterial);
    frame.position.z -= 0.001;
    frame.name = 'frame';
    object.add(frame);

    // Other elements group
    const elements = new THREE.Group();
    elements.name = 'elements';
    object.add(elements);

    // User icon
    const userGeom = new THREE.CircleGeometry(0.003, 32);
    const userMat = new THREE.MeshStandardMaterial({ color: 0xbbbb00 });
    const userIcon = new THREE.Mesh(userGeom, userMat);
    userIcon.name = 'user';
    userIcon.position.set(0, 0, 0.001);
    elements.add(userIcon);
    const beaconMat = new BeaconMaterial({ color: 0xbbbb00 });
    const beaconIcon = new THREE.Mesh(userGeom, beaconMat);
    userIcon.add(beaconIcon);

    return object;
  }

  private get elements(): THREE.Object3D {
    return this.object.getObjectByName('elements');
  }

  /** Convert terrain coordinates (scale = 1) to minimap coordinates */
  private terrainToMinimap(coords: THREE.Vector3): THREE.Vector2 {
    const x = (coords.x / this.generator.width) * this.width;
    const y = -(coords.z / this.generator.height) * this.height;
    return new THREE.Vector2(x, y);
  }

  private findElement(vrobj: VRObject) {
    const uuid = vrobj.object.uuid;
    return findObjectBy(this.elements, (child) => child.userData.objectID == uuid);
  }
}
