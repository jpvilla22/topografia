import { VRObject as VRObjectRef } from './VRObject';
import { Flag } from './Flag';
import { Hub } from './Hub';

// To avoid circular dependencies you can import VRObject from here
export const VRObject = VRObjectRef;

const VRObjectTypeMapping = {
  flag: Flag,
  hub: Hub,
} satisfies { [key: string]: typeof VRObjectRef };

type MappedVRObjectType = keyof typeof VRObjectTypeMapping;
type UnmappedVRObjectType = 'terrainLine';
export type VRObjectType = MappedVRObjectType | UnmappedVRObjectType;

export namespace VRObjectsFactory {
  export function isVRObject(obj: THREE.Object3D): boolean {
    return getType(obj) != undefined;
  }

  export function getType(obj: THREE.Object3D): MappedVRObjectType {
    const types = Object.keys(VRObjectTypeMapping) as MappedVRObjectType[];
    return types.find((type) => obj.name.startsWith(type));
  }

  export function buildFrom(obj: THREE.Object3D): VRObjectRef {
    const type = getType(obj);
    if (!type) return undefined;

    const objClass = VRObjectTypeMapping[type];
    const vrobj = new objClass(obj);
    vrobj.type = type;
    return vrobj;
  }
}
