import { FIELDS_GLSL } from './shader-fields';
import { NOISE_GLSL } from './shader-noise';

export const VERTEX_SHADER = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

const HEADER_GLSL = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uVideo;
uniform sampler2D uVideoPrev;
uniform sampler2D uTreeVideo;
uniform float uTreeMix;
uniform float uWash;
uniform float uEcho;
uniform float uSmoke;
uniform float uFragments;
uniform float uPlateAlpha;
uniform float uFields[5];
uniform vec4 uPlates[3];
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
`;

const PLATE_GLSL = `
// Crossfades cosmos into the tree clip, skipping the texture that is fully hidden.
float sourceLum(vec2 uv, float lod){
  float cosmos = uTreeMix < .999 ? lum(textureLod(uVideo, uv, lod).rgb) : 0.;
  float tree = uTreeMix > .001 ? lum(textureLod(uTreeVideo, uv, lod).rgb) : 0.;
  return mix(cosmos, tree, uTreeMix);
}
float blurLum(vec2 uv, vec2 rad, float rot, float lod){
  float acc = 0.;
  for (int i = 0; i < 12; i++){
    float fi = float(i) + .5;
    float r = sqrt(fi / 12.);
    float a = fi * 2.39996323 + rot;
    vec2 sampleUV = uv + vec2(cos(a), sin(a)) * r * rad;
    float current = sourceLum(sampleUV, lod);
    if (uEcho > .001){
      float previous = lum(textureLod(uVideoPrev, sampleUV + vec2(.015, -.012), lod).rgb);
      current = mix(current, previous, uEcho);
    }
    acc += current;
  }
  return acc / 12.;
}
float bloomLum(vec2 uv, vec2 rad, float rot, float lod){
  float acc = 0.;
  for (int i = 0; i < 10; i++){
    float fi = float(i) + .5;
    float r = sqrt(fi / 10.);
    float a = fi * 2.39996323 + rot;
    acc += max(sourceLum(uv + vec2(cos(a), sin(a)) * r * rad, lod) - .62, 0.);
  }
  return acc / 10. * 1.4;
}

// Returns vec2(ink inside the plate, halo ink outside it).
vec2 plateInk(vec2 frag, vec4 plate, vec2 crop, float zoom, float edgeN, vec2 offB, out float inside){
  float k = uK * plate.z / uPlates[0].z;
  vec2 P = frag / k;
  vec2 hs = plate.zw;
  vec2 pl = frag - plate.xy;
  vec2 uvp = pl / (2. * hs) + .5;

  vec2 qd = (abs(pl) - hs) / k;
  float sdf = length(max(qd, 0.)) + min(max(qd.x, qd.y), 0.);
  float d = sdf + edgeN * uFrame;
  inside = 1. - smoothstep(-1.5, 1.5, d);

  float tone = 0.;
  if (inside > .001){
    vec2 vuv = (uvp - .5) * vec2(.9, .88) * zoom + .5 + crop;
    float videoTone = 0.;
    if (uSmoke < .999){
      vec2 ppx = 1. / (2. * hs);
      float rot = hash12(floor(frag)) * 6.2831853;
      float texels = max(uSmudge * k * ppx.x * float(textureSize(uVideo, 0).x), 1.);
      float lod = max(log2(texels) - .2, 0.);
      float b = blurLum(vuv, ppx * uSmudge * k, rot, lod);
      float bl = bloomLum(vuv, ppx * uSmudge * k * 5., rot, lod + 2.2);
      videoTone = b + bl * uBloom;
    }
    float smoke = uSmoke > .001 ? smokeTone(vuv) : 0.;
    tone = mix(videoTone, smoke, uSmoke);
    for (int i = 0; i < 10; i++){
      vec3 tr = uTrail[i];
      vec2 dd = (frag - tr.xy) / uK;
      tone += tr.z * uGlow * exp(-dot(dd, dd) / (2. * 70. * 70.)) * .6;
    }
    tone = pow(clamp((tone - .5) * uContrast + .5, 0., 1.), 1.15);
    float vg = 1. - smoothstep(.3, 1.25, length((uvp - .5) * vec2(1.25, 1.)));
    tone *= mix(.7, 1., vg);
  }

  float ink = mix(1. - tone, tone, uDark);
  float bw = 30. * uFrameW;
  float band = 1. - smoothstep(bw * .25, bw, -d);
  float stroke = clamp(band * (.55 + .9 * vnoise(P * .12 + offB)), 0., 1.) * uFrame;
  ink = mix(ink, 1., stroke);
  float halo = exp(-max(d, 0.) / 10.) * (.25 + .75 * fbm(P * .08 + offB)) * .28 * uFrame;
  return vec2(max(ink, .05), halo);
}

float placePlate(float ink, vec2 plateTerms, float inside, float weight){
  float haloInk = max(ink, plateTerms.y * weight);
  return mix(haloInk, plateTerms.x, inside * weight);
}
`;

const MAIN_GLSL = `
float backgroundInk(vec2 screenUV){
  float total = 0.;
  for (int i = 0; i < 5; i++) total += uFields[i];
  if (total < .001) return 0.;

  // Memories drift: the whole field wanders slowly.
  vec2 wander = vec2(fbm(screenUV * 1.7 + uTime * .04), fbm(screenUV * 1.7 + 7.3 - uTime * .03));
  vec2 uv = screenUV + (wander - .5) * .05;

  float bg = 0.;
  if (uFields[0] > .001) bg += uFields[0] * dustInk(uv, uTime);
  if (uFields[1] > .001) bg += uFields[1] * windowInk(uv, uTime);
  if (uFields[2] > .001) bg += uFields[2] * rainInk(uv, uTime);
  if (uFields[3] > .001) bg += uFields[3] * seaInk(uv, uTime);
  if (uFields[4] > .001) bg += uFields[4] * smokeInk(uv);
  return clamp(bg, 0., 1.);
}

float agedFilm(float ink, vec2 frag, vec2 screenUV, float sa){
  ink += .14 * smoothstep(.45, 1.1, length(screenUV * vec2(.8, 1.)));
  ink *= 1. + (hash11(sa * 3.1) - .5) * .05;

  float aspect = uRes.x / uRes.y;
  float pixel = 1. / uRes.y;
  for (int i = 0; i < 2; i++){
    float fi = float(i);
    float shows = step(.65, hash11(sa * 5.3 + fi * 13.7 + 1.));
    float centerX = (hash11(sa * 7.9 + fi * 3.1 + 1.) - .5) * aspect;
    float centerY = hash11(sa * 2.9 + fi * 5.3 + 1.) - .5;
    float halfLength = .2 + .25 * hash11(sa * 4.7 + fi * 9.1 + 1.);
    float wavyX = screenUV.x - centerX - sin(screenUV.y * 7.) * .002;
    float line = 1. - smoothstep(pixel * .5, pixel * 1.5, abs(wavyX));
    float span = 1. - smoothstep(halfLength * .8, halfLength, abs(screenUV.y - centerY));
    ink -= shows * line * span * .4;
  }

  float specks = max(3., uRes.y / 220.);
  vec2 speckCell = floor(frag / specks);
  vec2 inCell = fract(frag / specks) - .5;
  float speck = step(.9985, hash12(speckCell + sa * 17.3));
  ink += speck * (1. - smoothstep(.2, .5, length(inCell))) * .5;
  return ink;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 P = frag / uK;
  vec2 screenUV = (frag - .5 * uRes) / uRes.y;
  float sa = uBoil > .01 ? floor(uTime * uBoil) : 0.;
  float sb = uBoil > .01 ? floor(uTime * uBoil * .5) : 0.;
  vec2 offA = vec2(hash11(sa), hash11(sa + 31.7)) * 400.;
  vec2 offB = vec2(hash11(sb + 7.3), hash11(sb + 53.1)) * 400.;

  float ink = backgroundInk(screenUV);
  if (uPlateAlpha > .001){
    float edgeN = (fbm(P * .035 + offB * .02) - .5) * 26. + (vnoise(P * .22 + offA) - .5) * 5.;
    float inside;
    vec2 plateTerms = plateInk(frag, uPlates[0], vec2(0.), 1., edgeN, offB, inside);
    ink = placePlate(ink, plateTerms, inside, uPlateAlpha);
    if (uFragments > .001){
      float fragmentWeight = uFragments * uPlateAlpha;
      plateTerms = plateInk(frag, uPlates[1], vec2(-.13, .12), .6, edgeN, offB, inside);
      ink = placePlate(ink, plateTerms, inside, fragmentWeight);
      plateTerms = plateInk(frag, uPlates[2], vec2(.12, -.1), .72, edgeN, offB, inside);
      ink = placePlate(ink, plateTerms, inside, fragmentWeight);
    }
  }

  ink = agedFilm(ink, frag, screenUV, sa);

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
  vec3 computed = mix(uPaper, uInk, inkF);
  outColor = vec4(mix(computed, uPaper, uWash), 1.);
}`;

export const FRAGMENT_SHADER = HEADER_GLSL + NOISE_GLSL + FIELDS_GLSL + PLATE_GLSL + MAIN_GLSL;
