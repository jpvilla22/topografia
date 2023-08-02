
#ifdef USE_MAP

	float th1=levelCurveThickness*0.7;
	float th2=levelCurveThickness;
	float c = mod(vWorldPos.y,levelCurveRange)/levelCurveRange;
	c = (smoothstep(1.0-th2,1.0-th1,c) + smoothstep(th2,th1,c))*0.6 + 0.4*vWorldPos.y/100.0;
	
	vec4 bandsColor = vec4(c,c,c,1.0);
	float high = max(lowLevel,highLevel);
	float m1 = smoothstep(lowLevel-0.2,lowLevel,vWorldPos.y)*smoothstep(high,high-0.2,vWorldPos.y);
	vec4 baseColor = (vWorldPos.y<lowLevel)?vec4(0.0,0.0,1.0,1.0):vec4(1.0,0.0,0.0,1.0);
	vec4 composedColor = mix( baseColor,bandsColor,m1);

	vec4 sampledDiffuseColor = mix(composedColor,texture2D( map, vUv ),mixFactor);

	diffuseColor *= sampledDiffuseColor;

#endif

