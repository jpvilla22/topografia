import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

export class BVHMesh extends THREE.Mesh {
  static newFrom(mesh: THREE.Mesh): BVHMesh {
    if (!mesh.isMesh) throw Error(`BVHMesh must be instanced with a mesh`);

    const bvhmesh = new BVHMesh(mesh.geometry, mesh.material);
    bvhmesh.copy(mesh);
    return bvhmesh;
  }

  constructor(geometry?: THREE.BufferGeometry, material?: THREE.Material | THREE.Material[]) {
    super(geometry, material);

    this.raycast = acceleratedRaycast.bind(this);

    if (geometry) {
      geometry.computeBoundsTree = computeBoundsTree.bind(geometry);
      geometry.disposeBoundsTree = disposeBoundsTree.bind(geometry);
      geometry.computeBoundsTree();
    }
  }
}
