import * as THREE from 'three';


class MultiLinerCurve extends THREE.Curve {

    constructor() {

        super();
        this.arcLengthDivisions = 1;

        this.isQuadraticBezierCurve3 = false;

        this.type = 'LinearCurve';


        this.controlPoints = [];

    }

    addControlPoint(v) {
        this.controlPoints.push(v);
    }

    getPoint(t, optionalTarget = new THREE.Vector3()) {

        const point = optionalTarget;


        let len = this.controlPoints.length;

        if (t < 1) {
            let i1 = parseInt(Math.floor((t * (len - 1))));
            let i2 = i1 + 1;

            let uLocal = (t * (len - 1)) % 1;
            let p = new THREE.Vector3();
            p.lerpVectors(this.controlPoints[i1], this.controlPoints[i2], uLocal);
            point.set(p.x, p.y, p.z);

        } else {
            point.copy(this.controlPoints[len - 1].clone());
        }

        return point;

    }

    copy(source) {

        super.copy(source);

        this.v0.copy(source.v0);
        this.v1.copy(source.v1);
        this.v2.copy(source.v2);

        return this;

    }

    toJSON() {

        const data = super.toJSON();

        data.v0 = this.v0.toArray();
        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();

        return data;

    }

    fromJSON(json) {

        super.fromJSON(json);

        this.v0.fromArray(json.v0);
        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);

        return this;

    }

}



export { MultiLinerCurve };