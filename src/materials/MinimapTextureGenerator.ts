import * as THREE from 'three';
import { LevelCurveMaterial } from './LevelCurveMaterial';

const SIZE = 2048;
export class MinimapTextureGenerator {
  private static renderer: THREE.WebGLRenderer;

  width: number;
  height: number;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private terrain: THREE.Mesh;
  private terrainTop: number;
  private target: THREE.WebGLRenderTarget;

  static init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  constructor(terrainGeometry: THREE.BufferGeometry) {
    this.scene = new THREE.Scene();
    this.terrain = new THREE.Mesh(terrainGeometry, new LevelCurveMaterial());
    this.scene.add(this.terrain);

    if (!terrainGeometry.boundingBox) terrainGeometry.computeBoundingBox();
    const box = terrainGeometry.boundingBox;
    this.width = box.max.x - box.min.x;
    this.height = box.max.z - box.min.z;
    const depth = box.max.y - box.min.y;
    this.terrainTop = box.max.y;

    const freeTopSpace = 2;
    this.camera = new THREE.OrthographicCamera(
      -this.width / 2,
      this.width / 2,
      this.height / 2,
      -this.height / 2,
      -freeTopSpace,
      depth + freeTopSpace
    );

    this.camera.position.set(0, this.terrainTop + freeTopSpace, 0);
    const cameraTarget = this.camera.position.clone().add(new THREE.Vector3(0, -1, 0));
    this.camera.lookAt(cameraTarget);
    this.scene.add(this.camera);

    this.target = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      //minFilter: THREE.LinearFilter, // commented because default mode is better
      //magFilter: THREE.LinearFilter,  // commented because default mode is better
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType, // Important as we need precise coordinates (not ints)
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    });
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  set levelHeight(value: number) {
    const material = this.terrain.material as LevelCurveMaterial;
    material.levelHeight = value;
  }

  set curveWidth(value: number) {
    const material = this.terrain.material as LevelCurveMaterial;
    material.curveWidth = value;
  }

  render() {
    const { renderer } = MinimapTextureGenerator;
    const oldTarget = renderer.getRenderTarget();
    const oldClearColor = renderer.getClearColor(new THREE.Color());
    renderer.xr.enabled = false;

    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0xff0000);

    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.target.texture.generateMipmaps = true;
    this.target.texture.needsUpdate = true;

    renderer.setRenderTarget(oldTarget);
    renderer.setClearColor(oldClearColor);
    renderer.xr.enabled = true;
  }

  dispose() {
    this.target.dispose();
  }
}
