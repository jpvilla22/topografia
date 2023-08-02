    varying vec3 vUv; 
    varying vec3 vPos;

    void main() {
      vUv = position; 

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      vPos=position.xyz;

      gl_Position = projectionMatrix * modelViewPosition; 
    }