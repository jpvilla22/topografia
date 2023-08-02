import * as THREE from 'three';
import { MaterialLibrary } from './materials/MaterialLibrary';
import { MultiLinerCurve } from './utils/MultiLinerCurve';

export class ThickLineGeometry extends THREE.BufferGeometry {
  points: THREE.Vector3[] = [];
  thickness = 0.03;

  constructor() {
    super();
  }

  clone(): ThickLineGeometry {
    const cloned = super.clone() as ThickLineGeometry;
    cloned.points = this.points.map((p) => p.clone());
    cloned.thickness = this.thickness;
    return cloned;
  }

  generate(): this {
    if (this.points.length < 2) return this;

    // In order to avoid thin corners, we will generate extra points
    const { PI, tan } = Math;
    const points: THREE.Vector3[] = [];
    this.points.forEach((point, idx) => {
      if (idx == 0 || idx == this.points.length - 1) {
        points.push(point);
        return;
      }

      const prev = this.points[idx - 1];
      const next = this.points[idx + 1];
      const v1 = point.clone().sub(prev);
      const v2 = next.clone().sub(point);
      const angle = PI - v1.angleTo(v2);

      if (angle == PI) {
        points.push(point);
        return;
      }

      const offset = this.thickness / 2 / tan(angle / 2);
      v1.setLength(offset);
      v2.setLength(offset);

      let extra = point.clone().sub(v1);
      points.push(extra);
      points.push(point);

      extra = point.clone().add(v2);
      points.push(extra);
    });

    let h = this.thickness * 0.1,
      w = this.thickness;

    let dir = points[1].clone();
    dir.sub(points[0]);
    dir.normalize();

    if (Math.abs(dir.x) > Math.abs(dir.z)) {
      let temp = w;
      w = h;
      h = temp;
    }

    const shape = new THREE.Shape();

    // Regular polygon
    const rad = this.thickness;
    shape.moveTo(rad, 0);
    for (let a = 0; a <= Math.PI * 2; a = a + Math.PI / 4) {
      shape.lineTo(rad * Math.cos(a), rad * Math.sin(a));
    }

    // Rectangle
    // const height = 0.03;
    // shape.moveTo(this.thickness / 2, height / 2);
    // shape.lineTo(-this.thickness / 2, height / 2);
    // shape.lineTo(-this.thickness / 2, -height / 2);
    // shape.lineTo(this.thickness / 2, -height / 2);

    const curve = new MultiLinerCurve();

    points.forEach((v, i) => {
      curve.addControlPoint(v);
    });

    const extrudeSettings = {
      steps: points.length - 1,
      curveSegments: 1,
      extrudePath: curve,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    this.setAttribute('position', geometry.getAttribute('position'));
    this.setAttribute('normal', geometry.getAttribute('normal'));
    this.setIndex(geometry.getIndex());

    this.computeBoundingBox();
    this.computeBoundingSphere();
    return this;
  }
}
