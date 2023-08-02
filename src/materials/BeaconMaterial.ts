import * as THREE from 'three';
import fragmentShader from './shaders/BeaconShader.frag';
import vertexShader from './shaders/BeaconShader.vert';
import { Clock } from '../utils/Clock';

export type BeaconMaterialProps = {
  color?: THREE.ColorRepresentation;
};

const defaultProps = {
  color: 0xbbbb00,
};

export class BeaconMaterial extends THREE.ShaderMaterial {
  private static PERIOD: number = 3.5; // Seconds
  private static MAX_SCALE: number = 20;

  private scaling: THREE.Uniform;
  private opacityUniform: THREE.Uniform;

  constructor(props: BeaconMaterialProps = defaultProps) {
    const color = new THREE.Color(props.color);
    const scaling = new THREE.Uniform(20.0);
    const opacity = new THREE.Uniform(0.2);

    super({
      uniforms: {
        baseColor: new THREE.Uniform(new THREE.Vector3(color.r, color.g, color.b)),
        scaling,
        opacity,
      },
      transparent: true,
      fragmentShader,
      vertexShader,
    });

    this.scaling = scaling;
    this.opacityUniform = opacity;

    setInterval(this.updateUniforms.bind(this), 1 / 30);
  }

  private updateUniforms() {
    this.scaling.value = this.scalingFn();
    this.opacityUniform.value = this.opacityFn();
  }

  private scalingFn(): number {
    const t = (Clock.elapsed / BeaconMaterial.PERIOD) % 1;
    return t * BeaconMaterial.MAX_SCALE;
  }

  private opacityFn(): number {
    const t = (Clock.elapsed / BeaconMaterial.PERIOD) % 1;
    const zeroX = 0.8;

    if (t > zeroX) return 0;
    else return 1 - t / zeroX;
  }
}
