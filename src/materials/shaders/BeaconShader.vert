precision mediump float;

uniform float scaling;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * scaling, 1.0);
}