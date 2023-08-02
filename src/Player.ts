import * as THREE from 'three';
import { WebXRManager } from 'three';
import { error } from './utils/logger';
import { EventsDispatcher } from './xr/EventsDispatcher';

export enum EventTypes {
  ON_POSITION_CHANGE = 'onPositionChange',
}
export class Player extends EventsDispatcher {
  worldPosition: THREE.Vector3; // Feet position
  viewerYRotation = 0;

  private xr: WebXRManager;
  private baseReferenceSpace: XRReferenceSpace;
  private heightOffset = 1;
  private position: THREE.Vector3 = new THREE.Vector3(0, -this.heightOffset, 0);

  private offsetPosition: any;
  private offsetRotation: THREE.Quaternion;

  constructor(xr: WebXRManager) {
    super();
    this.xr = xr;
    this.worldPosition = new THREE.Vector3();

    this.xr.addEventListener('sessionstart', this.onSessionStart.bind(this));
  }

  get height(): number {
    return this.heightOffset;
  }

  get yPosition(): number {
    return this.heightOffset;
  }
  getOffsetPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.offsetPosition.x, this.offsetPosition.y, this.offsetPosition.z);
  }

  setHeightOffset(value: number) {
    this.heightOffset = value;
    this.teleport();
  }

  teleport(newWorldPos?: THREE.Vector3) {
    if (!this.baseReferenceSpace) {
      error('Cannot teleport before VR session has started');
      return;
    }

    if (newWorldPos) this.worldPosition.copy(newWorldPos);

    this.position = this.worldPosition.clone();

    const mRotation = new THREE.Matrix4();
    mRotation.makeRotationY(this.viewerYRotation);
    this.position.applyMatrix4(mRotation);

    this.offsetPosition = {
      x: -this.position.x,
      y: -this.position.y - this.heightOffset,
      z: -this.position.z,
      w: 1,
    };

    this.offsetRotation = new THREE.Quaternion();
    this.offsetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.viewerYRotation);

    const transform = new XRRigidTransform(this.offsetPosition, this.offsetRotation);
    const spaceOffset = this.baseReferenceSpace.getOffsetReferenceSpace(transform);

    this.xr.setReferenceSpace(spaceOffset);
    this.dispatchEvent({
      type: EventTypes.ON_POSITION_CHANGE,
      position: this.position,
      offsetPosition: this.offsetPosition,
      heightOffset: this.heightOffset,
    });
  }

  private onSessionStart() {
    this.baseReferenceSpace = this.xr.getReferenceSpace();
    this.teleport();
  }
}
