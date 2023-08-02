import * as THREE from 'three';
import fragShader from './shaders/PlaceholderShader.frag';
import vertShader from './shaders/PlaceholderShader.vert';

export class PlaceholderMaterial extends THREE.ShaderMaterial {
  constructor(geometry: THREE.BufferGeometry) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();

    const box = geometry.boundingBox;

    super({
      uniforms: {
        yMin: { value: box.min.y },
        yMax: { value: box.max.y },
        baseColor: new THREE.Uniform(new THREE.Vector3(0, 1, 1)),
      },
      vertexShader: vertShader,
      fragmentShader: fragShader,
      transparent: true,
      depthWrite: false,
    });
  }
}
