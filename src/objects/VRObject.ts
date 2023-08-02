import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { HandController } from '../xr/HandController';
import { findObjectBy } from '../utils/findObjectBy';
import { VRObjectType, VRObjectsFactory } from './VRObjectsFactory';
import { PlaceholderMaterial } from '../materials/PlaceholderMaterial';

const HIGHLIGHT_EMISSIVE = new THREE.Color(0x00aa00);

export class VRObject {
  type: VRObjectType;
  name: string;
  object: THREE.Object3D;

  holdingPoint: THREE.Object3D;
  hitSurface: THREE.Object3D;

  grabbable: boolean = true;
  controller?: HandController; // The controller that is grabbing the current object
  enabled: boolean = true; // Enabled for interaction

  protected highlightMaterials: THREE.MeshStandardMaterial[] = [];
  protected placeholderObject = new THREE.Object3D();

  constructor(obj: THREE.Object3D) {
    this.object = obj;
    this.name = this.object.name;
    this.type = VRObjectsFactory.getType(obj);
  }

  get isInteractable() {
    return this.hitSurface != undefined;
  }

  get placeholder(): THREE.Object3D {
    return this.placeholderObject;
  }

  get isHighlighted(): boolean {
    return this.highlightMaterials[0]?.emissive == HIGHLIGHT_EMISSIVE;
  }

  highlight(value = true) {
    this.highlightMaterials.forEach((mat) => {
      const emissive = value ? HIGHLIGHT_EMISSIVE : mat.userData.originalEmissive;
      mat.emissive = emissive;
    });
  }

  rayIntersection(raycaster: THREE.Raycaster): THREE.Vector3 | undefined {
    const intersections = raycaster.intersectObjects([this.hitSurface]);
    return intersections[0]?.point;
  }

  clone(deep = true): VRObject {
    const clonedObj = this.object.clone();

    if (deep) {
      clonedObj.traverse((child: THREE.Mesh) => {
        if (!child.isMesh) return;

        const mat = child.material as THREE.Material;
        if (!mat.isMaterial) return;

        child.material = mat.clone();
      });
    }

    return VRObjectsFactory.buildFrom(clonedObj);
  }

  onTriggerDown(): void {}

  onGrabbed(): void {}

  onDropped(): void {}

  /** Populates property `highlightMaterials` from all materials in `this.object` and descendants */
  protected populateHighlightMaterials() {
    if (!this.object) return;

    this.highlightMaterials = [];

    this.object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry && mesh.material) {
        let materials = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
        if (!Array.isArray(materials)) materials = [materials];

        materials.forEach((mat) => {
          mat.userData.originalEmissive = mat.emissive;
          this.highlightMaterials.push(mat);
        });
      }
    });
  }

  protected populateHitSurface() {
    this.hitSurface = this.findObjectFromPrefix('hitSurface');
    this.hitSurface.visible = false;
  }

  protected findObjectFromPrefix(prefix: string) {
    return findObjectBy(this.object, (obj) => obj.name.startsWith(prefix));
  }

  protected buildPlaceholder(): void {
    function getAllGeometries(obj: THREE.Object3D, parent: THREE.Matrix4): THREE.BufferGeometry[] {
      const geometries: THREE.BufferGeometry[] = [];

      if (obj.name.startsWith('hitSurface')) return geometries;

      obj.updateMatrix();
      const transformation = parent.clone().multiply(obj.matrix);

      // Add current object's geometry
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const geom = mesh.geometry.clone();

        // Clean attributes
        const validAttrs = ['position', 'normal'];
        Object.keys(geom.attributes).forEach((attr) => {
          if (!validAttrs.includes(attr)) geom.deleteAttribute(attr);
        });

        // Apply transformation
        geom.applyMatrix4(transformation);
        geometries.push(geom);
      }

      // Add children geometries
      obj.children.forEach((child) => {
        geometries.push(...getAllGeometries(child, transformation));
      });

      return geometries;
    }

    // We merge all geometries into one
    const geometries = getAllGeometries(this.object, new THREE.Matrix4());
    const placeholderGeom = mergeBufferGeometries(geometries);

    // const translation = this.object.position.clone().negate();
    // placeholderGeom.translate(translation.x, translation.y, translation.z);

    const placeholderMat = new PlaceholderMaterial(placeholderGeom);

    this.placeholderObject = new THREE.Mesh(placeholderGeom, placeholderMat);
    this.placeholderObject.visible = false;
  }
}
