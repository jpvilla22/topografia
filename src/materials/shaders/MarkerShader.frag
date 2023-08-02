      uniform vec3 color;     
      varying vec3 vUv;
      varying vec3 vPos;
      uniform float time;
      uniform float height;      

      void main() {
        float amplitude = max(0.0, 1.0 - vPos.y / height) * 0.5;
        float opacity = (0.6 + 0.4 * sin(vPos.y * 10.0 - time * 10.0)) * amplitude;

        gl_FragColor = vec4(color, opacity);
      }