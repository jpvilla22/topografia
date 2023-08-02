import * as THREE from 'three';
import { VRObject } from './VRObjectsFactory';
import { ThickLineGeometry } from '../ThickLineGeometry';

import { MaterialLibrary } from '../materials/MaterialLibrary';

export type MapLineProps = {
  points?: THREE.Vector3[];
  thickness?: number;
  color?: THREE.ColorRepresentation;
};

export class TerrainLine extends VRObject {
  geometry: ThickLineGeometry;

  private material: THREE.MeshPhongMaterial;
  private nextSegmentPlaceholder: THREE.Mesh;

  constructor(props: MapLineProps = {}) {
    const { points = [], thickness = 0.75, color = new THREE.Color().setHSL(Math.random(), 1, 0.5).getHex() } = props;

    const geometry = new ThickLineGeometry();
    geometry.points = points;
    geometry.thickness = thickness;
    geometry.generate();

    const envMap = MaterialLibrary.getTexture('envMap1');
    if (envMap) envMap.mapping = THREE.EquirectangularReflectionMapping;

    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 32,
      wireframe: false,
      envMap: envMap,
      reflectivity: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    //mesh.frustumCulled = false;
    mesh.name = 'terrainLine';
    (mesh.castShadow = true), (mesh.receiveShadow = true);

    super(mesh);
    this.geometry = geometry;
    this.material = material;
    this.type = 'terrainLine';

    this.hitSurface = new THREE.Mesh(geometry);
    this.hitSurface.name = 'hitSurface'; // Unnecessary, but for consistency

    // Build placeholder
    const placeholderGeom = new ThickLineGeometry();
    placeholderGeom.points = points.slice(-2);
    placeholderGeom.thickness = thickness;
    placeholderGeom.generate();
    const placeholderMat = material.clone();
    placeholderMat.transparent = true;
    placeholderMat.opacity = 0.3;
    this.nextSegmentPlaceholder = new THREE.Mesh(placeholderGeom, placeholderMat);
    this.object.add(this.nextSegmentPlaceholder);
    this.object.userData.type = 'terrainLine';
    this.object.userData.points = points;

    this.disablePlaceholder();

    // Build hitSurface
    this.hitSurface = new THREE.Mesh(this.geometry);
    this.hitSurface.visible = false;
    this.populateHighlightMaterials();
  }

  get points(): THREE.Vector3[] {
    return [...this.geometry.points];
  }

  set points(points: THREE.Vector3[]) {
    this.geometry.points = points;
    this.geometry.generate();
  }

  get color(): THREE.Color {
    return this.material.color.clone();
  }

  set color(newColor: THREE.ColorRepresentation) {
    this.material.color.set(newColor);

    let c = this.material.color;
    this.object.userData.color = [c.r, c.g, c.b];
    const placeholderMat = this.nextSegmentPlaceholder.material as typeof this.material;
    placeholderMat.color.set(newColor);
  }

  enablePlaceholder() {
    this.nextSegmentPlaceholder.visible = true;
  }

  disablePlaceholder() {
    this.nextSegmentPlaceholder.visible = false;
  }

  updatePlaceholder(lastPoint: THREE.Vector3) {
    if (this.geometry.points.length < 1) return;

    const placeholderGeom = this.nextSegmentPlaceholder.geometry as ThickLineGeometry;
    placeholderGeom.points[1].copy(lastPoint);
    placeholderGeom.generate();
  }

  addPoint(newPoint: THREE.Vector3) {
    this.geometry.points.push(newPoint.clone());
    this.geometry.generate();

    const placeholderGeom = this.nextSegmentPlaceholder.geometry as ThickLineGeometry;
    placeholderGeom.points[0] = newPoint.clone();
    placeholderGeom.points[1] = newPoint.clone();
  }

  onTriggerDown(): void {
    console.log('MapLine color:', this.material.color.getHexString());
  }
}
