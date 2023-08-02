import * as THREE from 'three';
import { VRObject } from './VRObject';

export class DebugBox extends VRObject {
  constructor() {
    const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const material = new THREE.MeshPhongMaterial({ color: 0xdd0022 });
    const object = new THREE.Mesh(geometry, material);
    super(object);

    this.hitSurface = object.clone();
    this.object.add(this.hitSurface);

    this.populateHighlightMaterials();

    this.holdingPoint = new THREE.Object3D();
    this.object.add(this.holdingPoint);
  }
}
