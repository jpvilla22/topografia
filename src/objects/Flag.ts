import { VRObject } from './VRObject';

export class Flag extends VRObject {
  private static HEIGHT = 1.6;

  grabbable = false;
  enabled = false;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.populateHitSurface();
    this.populateHighlightMaterials();
    this.buildPlaceholder();

    this.object.scale.setScalar(Flag.HEIGHT);
    this.object.castShadow = true;
    this.object.receiveShadow = true;
    this.object.userData.type = 'flag';
  }

  get color(): THREE.ColorRepresentation {
    return (this.fabric.material as THREE.MeshStandardMaterial).color;
  }

  set color(newColor: THREE.ColorRepresentation) {
    const material = this.fabric.material as THREE.MeshStandardMaterial;
    material.color.set(newColor);
    let c = material.color;
    this.object.userData.color = [c.r, c.g, c.b];
  }

  get position(): THREE.Vector3 {
    return this.object.position.clone();
  }

  clone(): Flag {
    const cloned = super.clone() as Flag;
    cloned.fabric.material = (cloned.fabric.material as THREE.Material).clone();
    return cloned;
  }

  private get fabric(): THREE.Mesh {
    return this.findObjectFromPrefix('fabric') as THREE.Mesh;
  }
}
