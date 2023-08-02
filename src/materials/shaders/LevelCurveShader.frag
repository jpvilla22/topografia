precision mediump float;

uniform float levelHeight;
uniform float curveWidth;
uniform float smoothness;

varying float yPosition;

void main() {
  float rH = abs(mod(yPosition, levelHeight));


  float hW1=curveWidth/2.0;
  float hW2=hW1*(1.0-smoothness)*0.99;

  float luminance=0.2;
  luminance+=0.8*smoothstep(hW1,hW2,rH);
  luminance+=0.8*smoothstep(levelHeight-hW1,levelHeight-hW2,rH);


  gl_FragColor = vec4(luminance, luminance, luminance, 1.0);
   
}