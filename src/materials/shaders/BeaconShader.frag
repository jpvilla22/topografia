precision mediump float;

uniform vec3 baseColor;
uniform float opacity;

void main() {
  gl_FragColor = vec4(baseColor, opacity);
}