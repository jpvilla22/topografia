vec3 transformed = vec3(position);
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;