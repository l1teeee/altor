export const VERTEX_SHADER = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uVideo;
uniform int uMode;
uniform vec4 uPlate;
uniform float uK;
uniform float uSmudge;
uniform float uBloom;
uniform float uContrast;
uniform float uTooth;
uniform float uToothScale;
uniform float uBoil;
uniform float uFrame;
uniform float uFrameW;
uniform float uDark;
uniform float uGlow;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uTrail[10];
out vec4 outColor;

float hash11(float p){
  p = fract(p * .1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3. - 2. * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1., 0.));
  float c = hash12(i + vec2(0., 1.));
  float d = hash12(i + vec2(1., 1.));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.;
  float a = .5;
  for (int i = 0; i < 5; i++){
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= .5;
  }
  return v;
}
float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }

float blurLum(vec2 uv, vec2 rad, float rot, float lod){
  float acc = 0.;
  for (int i = 0; i < 12; i++){
    float fi = float(i) + .5;
    float r = sqrt(fi / 12.);
    float a = fi * 2.39996323 + rot;
    acc += lum(textureLod(uVideo, uv + vec2(cos(a), sin(a)) * r * rad, lod).rgb);
  }
  return acc / 12.;
}
float bloomLum(vec2 uv, vec2 rad, float rot, float lod){
  float acc = 0.;
  for (int i = 0; i < 10; i++){
    float fi = float(i) + .5;
    float r = sqrt(fi / 10.);
    float a = fi * 2.39996323 + rot;
    acc += max(lum(textureLod(uVideo, uv + vec2(cos(a), sin(a)) * r * rad, lod).rgb) - .62, 0.);
  }
  return acc / 10. * 1.4;
}
float smokeTone(vec2 uv){
  vec2 p = (uv - .5) * vec2(2.4, 1.8);
  float t = uTime * .12;
  vec2 q = vec2(fbm(p + vec2(0., t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 2.4 * q + vec2(1.7, 9.2) + t * .8), fbm(p + 2.4 * q + vec2(8.3, 2.8) - t * .6));
  float f = fbm(p + 2.6 * r);
  vec2 c = p - vec2(.35 * sin(t * 2.), .2 * cos(t * 1.7));
  float core = exp(-dot(c, c) * 1.4);
  return clamp(smoothstep(.28, .85, f) * .85 + core * .35, 0., 1.);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 P = frag / uK;
  float sa = uBoil > .01 ? floor(uTime * uBoil) : 0.;
  float sb = uBoil > .01 ? floor(uTime * uBoil * .5) : 0.;
  vec2 offA = vec2(hash11(sa), hash11(sa + 31.7)) * 400.;
  vec2 offB = vec2(hash11(sb + 7.3), hash11(sb + 53.1)) * 400.;

  vec2 hs = uPlate.zw;
  vec2 pl = frag - uPlate.xy;
  vec2 uvp = pl / (2. * hs) + .5;

  vec2 qd = (abs(pl) - hs) / uK;
  float sdf = length(max(qd, 0.)) + min(max(qd.x, qd.y), 0.);
  float edgeN = (fbm(P * .035 + offB * .02) - .5) * 26. + (vnoise(P * .22 + offA) - .5) * 5.;
  float d = sdf + edgeN * uFrame;
  float inside = 1. - smoothstep(-1.5, 1.5, d);

  float tone = 0.;
  if (inside > .001){
    vec2 vuv = vec2(mix(.05, .95, uvp.x), mix(.06, .94, uvp.y));
    if (uMode == 1){
      tone = smokeTone(uvp);
    } else {
      vec2 ppx = 1. / (2. * hs);
      float rot = hash12(floor(frag)) * 6.2831853;
      float texels = max(uSmudge * uK * ppx.x * float(textureSize(uVideo, 0).x), 1.);
      float lod = max(log2(texels) - .2, 0.);
      float b = blurLum(vuv, ppx * uSmudge * uK, rot, lod);
      float bl = bloomLum(vuv, ppx * uSmudge * uK * 5., rot, lod + 2.2);
      tone = b + bl * uBloom;
    }
    for (int i = 0; i < 10; i++){
      vec3 tr = uTrail[i];
      vec2 dd = (frag - tr.xy) / uK;
      tone += tr.z * uGlow * exp(-dot(dd, dd) / (2. * 70. * 70.)) * .6;
    }
    tone = pow(clamp((tone - .5) * uContrast + .5, 0., 1.), 1.15);
    float vg = smoothstep(1.25, .3, length((uvp - .5) * vec2(1.25, 1.)));
    tone *= mix(.7, 1., vg);
  }

  float ink = mix(1. - tone, tone, uDark);
  float bw = 30. * uFrameW;
  float band = 1. - smoothstep(bw * .25, bw, -d);
  float stroke = clamp(band * (.55 + .9 * vnoise(P * .12 + offB)), 0., 1.) * uFrame;
  ink = mix(ink, 1., stroke);
  float dust = exp(-max(d, 0.) / 10.) * (.25 + .75 * fbm(P * .08 + offB)) * .28 * uFrame;
  ink = mix(dust, ink, inside);
  ink = max(ink, .05 * inside);

  vec2 tq = (P + offA) * vec2(.22, .5) / uToothScale;
  float h = .5 * vnoise(tq) + .3 * vnoise(tq * 2.13 + 7.) + .2 * vnoise(tq * 4.7 + 3.);
  h = (h - .5) * 1.6 + .5;
  float cr = abs(fbm((P + offB) * vec2(.05, .006) / uToothScale) - .5);
  float cm = smoothstep(.52, .6, vnoise((P + offB) * .012 + 5.));
  float crack = (1. - smoothstep(0., .012, cr)) * cm;
  float amp = uTooth * (.03 + .28 * 4. * ink * (1. - ink));
  float inkF = ink + amp * (.5 - h) * 2.;
  inkF += crack * .22 * (1. - ink) * uTooth * step(.02, ink);
  float streak = vnoise(vec2(P.x * .14, P.y * .012) + offB) - .5;
  inkF += streak * .14 * smoothstep(.15, .7, ink) * uTooth;
  float vis = smoothstep(h - .2, h + .2, ink) * smoothstep(0., .1, ink);
  inkF = clamp(mix(inkF, vis, .06 * uTooth), 0., 1.);
  outColor = vec4(mix(uPaper, uInk, inkF), 1.);
}`;
