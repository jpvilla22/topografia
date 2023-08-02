import { findObjectsBy } from '../utils/findObjectBy';
import { VRObject } from './VRObject';

export class Hub extends VRObject {
  constructor(obj: THREE.Object3D) {
    super(obj);

    obj.translateY(-0.5);

    // Debug stuff
    findObjectsBy(obj, (o) => o.name.startsWith('hitSurface')).forEach((hit) => (hit.visible = false));
  }
}
