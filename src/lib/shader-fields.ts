// Every field returns charcoal ink density 0..1 (0 = bare paper) for aspect-corrected
// full-screen coords: y in -0.5..0.5, x in about -0.9..0.9.
export const FIELDS_GLSL = `
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

float dustInk(vec2 uv, float t){
  float ink = .45 - uv.y * .25;
  vec2 axis = normalize(vec2(1., -.85));
  vec2 across = vec2(-axis.y, axis.x);
  float width = .17 + .03 * sin(t * .15);
  float beamDist = abs(dot(uv - vec2(-.05, .05), across));
  float beam = 1. - smoothstep(width * .2, width * 2.2, beamDist);
  ink = mix(ink, .08, beam);

  vec2 p = uv / .06;
  vec2 cell = floor(p);
  float motes = 0.;
  for (int j = -1; j <= 1; j++){
    for (int i = -1; i <= 1; i++){
      vec2 c = cell + vec2(float(i), float(j));
      float h = hash12(c);
      float h2 = hash12(c + 19.1);
      vec2 slow = vec2(sin(t * .31 + h * 6.28), cos(t * .27 + h2 * 6.28)) * .3;
      vec2 jitter = vec2(sin(t * .77 + h2 * 40.), cos(t * .63 + h * 40.)) * .08;
      vec2 pos = c + .2 + vec2(h, h2) * .6 + slow + jitter;
      float dist = length(p - pos) * .06;
      float radius = .004 + .006 * hash12(c + 3.7);
      float twinkle = .5 + .5 * sin(t * (.6 + h * 1.4) + h2 * 30.);
      float present = step(.4, hash12(c + 7.7));
      motes += present * twinkle * (1. - smoothstep(radius * .3, radius, dist));
    }
  }
  float visibility = .2 + .8 * beam;
  return clamp(ink - motes * visibility * .8, 0., 1.);
}

float windowInk(vec2 uv, float t){
  float breath = sin(t * .698);
  float skew = uv.y + uv.x * .14 + breath * .018;
  float slats = .5 + .5 * sin(skew * (34. + uv.x * 8.));
  float ink = mix(.12, .5, smoothstep(.15, .85, slats));

  float verticalOffset = uv.x - .06 - sin(t * .698 + 1.) * .01 + uv.y * .12;
  float verticalBar = 1. - smoothstep(0., .06, abs(verticalOffset));
  float horizontalOffset = uv.y - .08 + uv.x * .05 + breath * .018;
  float horizontalBar = 1. - smoothstep(0., .05, abs(horizontalOffset));
  return max(ink, .55 * max(verticalBar, horizontalBar));
}

// Returns ink to subtract: positive where a drop clears the fog, negative on its dark refraction rim.
float glassDrops(vec2 uv, float t, float scale, float seed){
  vec2 g = uv * scale + seed;
  vec2 id = floor(g);
  vec2 f = fract(g) - .5;

  float hasDrop = step(.72, hash12(id + seed));
  vec2 jitter = (vec2(hash12(id + seed * 3.1), hash12(id + seed * 5.7)) - .5) * .6;
  float radius = .04 + .14 * pow(hash12(id + seed * 2.3), 2.);

  float slides = step(.7, hash12(id + seed * 4.1));
  // Per-drop phase offset so neighbours never slide in sync.
  float phase = fract(t * .035 + hash12(id + seed * 6.3) * 3.);
  float slideFade = smoothstep(0., .08, phase) * (1. - smoothstep(.85, 1., phase));
  vec2 c = vec2(jitter.x, jitter.y - slides * phase * .4);

  vec2 d = vec2(f.x - c.x, (f.y - c.y) * .8);
  float dist = length(d) + (vnoise(f * 9. + id) - .5) * .03;
  float drop = 1. - smoothstep(radius * .5, radius, dist);

  float trailWidth = 1. - smoothstep(0., .05, abs(f.x - c.x));
  float trailSpan = smoothstep(0., .05, f.y - c.y) * (1. - smoothstep(.12, .2, f.y - c.y));
  float trail = slides * trailWidth * trailSpan;

  float rimBand = smoothstep(radius, radius * 1.1, dist) * (1. - smoothstep(radius * 1.1, radius * 1.5, dist));
  float lowerHalf = 1. - smoothstep(0., .04, f.y - c.y);
  float ring = rimBand * lowerHalf;

  float dropFade = mix(1., slideFade, slides);
  return hasDrop * dropFade * (drop * .26 + trail * .07 + ring * -.08);
}

float rainInk(vec2 uv, float t){
  float ink = mix(.62, .48, uv.y + .5);
  ink += (fbm(uv * 3. + vec2(0., t * .02)) - .5) * .12;

  for (int i = 0; i < 8; i++){
    float fi = float(i);
    vec2 pos = vec2((hash11(fi * 7.1 + 1.) - .5) * 1.6, (hash11(fi * 3.3 + 2.) - .5) * .8);
    pos.x += sin(t * .07 + fi) * .03;
    float radius = .07 + .1 * hash11(fi * 5.7 + 3.);
    float pulse = .6 + .4 * sin(t * .5 + fi * 2.1);
    float blob = 1. - smoothstep(radius * .1, radius, length(uv - pos));
    ink -= blob * pulse * .4;
  }

  float xs = uv.x + uv.y * .12;
  float lane = floor(xs * 110.);
  float laneSpeed = hash11(lane + 11.);
  float laneActive = step(.82, hash11(lane + 4.4));
  float laneShape = 1. - smoothstep(.05, .22, abs(fract(xs * 110.) - .5));
  float fall = fract(uv.y * .8 + t * (1.4 + laneSpeed * 1.6) + laneSpeed * 10.);
  float streak = smoothstep(0., .01, fall) * (1. - smoothstep(.01, .22, fall));
  ink -= laneActive * laneShape * streak * .2;

  ink -= glassDrops(uv, t, 7., 1.3);
  ink -= glassDrops(uv, t, 16., 7.9) * .7;
  return clamp(ink, 0., 1.);
}

float capsuleDist(vec2 p, vec2 a, vec2 b, float r){
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - r;
}

float fallingLeaves(vec2 uv, float t){
  float mask = 0.;
  for (int i = 0; i < 7; i++){
    float fi = float(i);
    float speed = .035 + .035 * hash11(fi * 9.1 + 1.);
    float progress = fract(t * speed + hash11(fi * 2.7 + 1.));
    float x = (hash11(fi * 5.3 + 1.) - .5) * .7 + sin(t * .7 + fi * 3.) * .05 + progress * .18;
    vec2 d = uv - vec2(x, .2 - progress * .65);
    float spin = t * (.8 + hash11(fi * 1.3 + 1.)) + fi * 2.;
    vec2 q = vec2(cos(spin) * d.x - sin(spin) * d.y, sin(spin) * d.x + cos(spin) * d.y);
    float fade = smoothstep(0., .1, progress) * (1. - smoothstep(.85, 1., progress));
    mask = max(mask, (1. - smoothstep(.012, .024, length(q * vec2(1., 2.8)))) * fade);
  }
  return mask;
}

float treeInk(vec2 uv, float t){
  float ink = mix(.2, .08, smoothstep(-.5, .4, uv.y));
  ink = mix(ink, .32, 1. - smoothstep(-.43, -.38, uv.y));

  float branchDist = 1.;
  float tipGlow = 0.;
  if (abs(uv.x) < .6 && uv.y < .4){
    float angle[32];
    vec2 tip[32];
    angle[0] = 0.;
    tip[0] = vec2(0., -.44);
    for (int k = 1; k < 32; k++){
      int parent = k / 2;
      int depth = k < 2 ? 0 : k < 4 ? 1 : k < 8 ? 2 : k < 16 ? 3 : 4;
      float fk = float(k);
      float fd = float(depth);
      float side = (k % 2 == 0) ? -1. : 1.;
      float spread = (.3 + .3 * hash11(fk * 1.7 + 3.)) * side + (hash11(fk * 2.3 + 1.) - .5) * .25;
      if (k == 1) spread = 0.;
      float a = angle[parent] + spread + sin(t * .6 + fd) * .03 * fd;
      float len = .19 * pow(.76, fd) * (.8 + .4 * hash11(fk * 4.1 + 1.));
      vec2 start = tip[parent];
      vec2 end = start + vec2(sin(a), cos(a)) * len;
      branchDist = min(branchDist, capsuleDist(uv, start, end, .013 * pow(.6, fd)));
      angle[k] = a;
      tip[k] = end;
      if (depth == 4) tipGlow += 1. - smoothstep(0., .17, length(uv - end));
    }
  }

  float branch = 1. - smoothstep(0., .006, branchDist);
  float leafy = tipGlow * (.35 + 1.1 * fbm(uv * 11. + vec2(t * .08, -t * .05)));
  float canopy = smoothstep(.3, .8, leafy);
  ink = mix(ink, .8, branch);
  ink = mix(ink, .66, canopy * .9);
  return mix(ink, .78, fallingLeaves(uv, t));
}

float seaInk(vec2 uv, float t){
  float horizon = .06;
  float aboveHorizon = uv.y - horizon;
  vec2 sunPos = vec2(.1, .2);
  float sunDist = length(uv - sunPos);
  float sky = .1 + .15 * smoothstep(0., .5, aboveHorizon);
  sky -= (1. - smoothstep(0., .05, sunDist)) * .12 + exp(-sunDist * sunDist * 40.) * .1;

  float depth = max(-aboveHorizon, 0.);
  float z = 1. / (depth + .12);
  float phase = z * 4. - t * .45 + fbm(vec2(uv.x * z * .3, z * .5 + t * .04)) * 3.;
  float wave = smoothstep(.6, .95, .5 + .5 * sin(phase));
  float sea = .45 + wave * .12;
  sea = mix(sea, .22, exp(-depth * 16.));

  float gx = uv.x - sunPos.x;
  float spread = .025 + depth * .22;
  float column = exp(-gx * gx / (spread * spread));
  float shimmer = smoothstep(.35, .75, vnoise(vec2(gx * 55. / (1. + depth * 3.), z * 3. - t * .7)));
  sea -= column * shimmer * .38 * (1. - .5 * smoothstep(0., .5, depth));

  float skyBlend = smoothstep(-.004, .004, aboveHorizon);
  return clamp(mix(sea, max(sky, 0.), skyBlend), 0., 1.);
}

float smokeInk(vec2 uv){
  return smokeTone(uv * .9 + .5) * .8;
}
`;
