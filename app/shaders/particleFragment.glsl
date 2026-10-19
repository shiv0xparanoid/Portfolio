varying vec3 vColor;
varying vec3 vPosition;

void main() {
  vec2 uv = gl_PointCoord;
  float dist = length(uv - vec2(0.5));

  float smoothOuter = 0.48;
  float smoothInner = 0.35;
  float alpha = 1.0 - smoothstep(smoothInner, smoothOuter, dist);

  if (dist > 0.5) {
    discard;
  }

  float innerGlow = smoothstep(0.5, 0.1, dist);
  vec3 finalColor = vColor * (0.6 + innerGlow * 0.6);

  float softCore = 1.0 - smoothstep(0.0, 0.2, dist);
  finalColor += vec3(1.0) * softCore * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
