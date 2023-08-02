import * as THREE from 'three';
import fragShader from './shaders/LevelCurveShader.frag';
import vertShader from './shaders/LevelCurveShader.vert';

export class LevelCurveMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        levelHeight: { value: 10 },
        curveWidth: { value: 1 },
        smoothness: { value: 1.0 },

      },
      fragmentShader: fragShader,
      vertexShader: vertShader,
    });
  }

  set levelHeight(value: number) {
    this.uniforms.levelHeight.value = value;
  }

  set curveWidth(value: number) {
    this.uniforms.curveWidth.value = value;
  }
}
