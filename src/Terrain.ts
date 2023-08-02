import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { BVHMesh } from './xr/BVHMesh';
import { error } from './utils/logger';
import { MaterialLibrary } from './materials/MaterialLibrary';
import beginVertexChunk from './materials/shaders/chunks/TerrainBeginVertexChunk.glsl';
import mapFragmentChunk from './materials/shaders/chunks/TerrainMapFragmentChunk.glsl';

export const Terrains = {
  //mountains: 'models/model1-mountains.glb',
  mountains: 'models/model2-3163-31-1-despenaderos.glb',
};

export type TerrainType = keyof typeof Terrains;

type OnProgress = (event: ProgressEvent<EventTarget>) => void;

export class Terrain {
  type: TerrainType;
  object: THREE.Object3D;

  private mesh: BVHMesh;
  private onProgressCallback?: OnProgress;

  constructor() {
    this.object = new THREE.Object3D();
    this.object.name = 'terrain-container';
  }

  get geometry(): THREE.BufferGeometry {
    return this.mesh.geometry;
  }

  /** Setup optional callback while GLB is loading */
  onProgress(callback: OnProgress) {
    this.onProgressCallback = callback;
  }

  async load(type: TerrainType): Promise<GLTF> {
    this.type = type;
    const filepath = Terrains[this.type];

    return new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      return loader.load(
        filepath,
        (gltf: GLTF) => {
          this.onTerrainLoaded(gltf);
          resolve(gltf);
        },
        this.onProgressCallback,
        (err) => {
          reject(err);
          error(`Error loading GLB '${filepath}': ${err.message}`);
        }
      );
    });
  }

  getHeightAt(x: number, z: number): number {
    if (!this.mesh.geometry.boundingBox) this.mesh.geometry.computeBoundingBox();
    const box = this.mesh.geometry.boundingBox;

    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin = new THREE.Vector3(x, box.max.y + 1, z);
    raycaster.ray.direction = new THREE.Vector3(0, -1, 0);

    const intersection = raycaster.intersectObject(this.mesh)[0];

    return intersection?.point.y;
  }

  getUniform(key: string) {
    const material = this.mesh.material as THREE.Material;
    return material.userData[key];
  }

  private onTerrainLoaded(gltf: GLTF) {
    MaterialLibrary.updateSpecialMaterials(gltf.scene);

    // Create BVH Mesh
    const glbMesh = gltf.scene.getObjectByName('terrain') as THREE.Mesh;
    this.mesh = BVHMesh.newFrom(glbMesh);

    this.mesh.position.y = 0.5;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;

    this.object.clear();
    this.object.add(this.mesh);

    this.overloadTerrainMaterial();
  }

  private overloadTerrainMaterial() {
    const oldMat = this.mesh.material as THREE.MeshStandardMaterial;
    const newMat = oldMat.clone();

    newMat.userData.levelCurveRange = { value: 3 };
    newMat.userData.levelCurveThickness = { value: 0.01 };
    newMat.userData.mixFactor = { value: 1 };
    newMat.userData.lowLevel = { value: 20 };
    newMat.userData.highLevel = { value: 85 };

    // https://medium.com/@pailhead011/extending-three-js-materials-with-glsl-78ea7bbb9270
    newMat.onBeforeCompile = (shader) => {
      shader.uniforms.levelCurveRange = newMat.userData.levelCurveRange;
      shader.uniforms.levelCurveThickness = newMat.userData.levelCurveThickness;
      shader.uniforms.mixFactor = newMat.userData.mixFactor;
      shader.uniforms.lowLevel = newMat.userData.lowLevel;
      shader.uniforms.highLevel = newMat.userData.highLevel;

      shader.vertexShader = 'varying vec3 vWorldPos;\n' + shader.vertexShader;

      let txt = `
      varying vec3 vWorldPos;
      uniform float levelCurveRange;\n
      uniform float levelCurveThickness;\n
      uniform float mixFactor;\n
      uniform float lowLevel;\n
      uniform float highLevel;\n`;

      shader.fragmentShader = txt + shader.fragmentShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        beginVertexChunk // with our own
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        mapFragmentChunk // with our own
      );
    };

    this.mesh.material = newMat;
  }
}
