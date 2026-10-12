export type ParamKey =
  | 'smudge'
  | 'bloom'
  | 'contrast'
  | 'tooth'
  | 'grain'
  | 'boil'
  | 'frame'
  | 'glow';

export type Params = Record<ParamKey, number>;

export const DEFAULT_PARAMS: Params = {
  smudge: 7,
  bloom: 0.2,
  contrast: 1.05,
  tooth: 0.85,
  grain: 1.5,
  boil: 10,
  frame: 1,
  glow: 0.45,
};

type SceneValues = readonly [
  number, number, number, number, number, number, number, number, number, number,
];
type LayoutKey = 'plateScale' | 'plateX' | 'plateY';
export type KeyframeName = LayoutKey | 'smudge' | 'bloom' | 'grain' | 'tooth' | 'boil'
  | 'frameW' | 'wash' | 'echo' | 'fragments' | 'plateAlpha'
  | 'dust' | 'window' | 'rain' | 'tree' | 'sea' | 'smokeField';

// Columns follow umbral, llegada, eco, lluvia, fragmentos, arbol, desvanecer, mar, humo, regreso.
export const KEYFRAMES: Record<KeyframeName, SceneValues> = {
  smudge:     [1.8, 0.8, 1.1, 1.2, 0.75, 1.1, 2.8, 1.3, 1.7, 1.8],
  bloom:      [1.5, 0.8, 1.2, 1.0, 0.7, 1.0, 4.5, 1.2, 1.8, 1.5],
  grain:      [1.1, 1, 1.25, 1.3, 1.4, 1.2, 1.8, 1.3, 1.4, 1.1],
  tooth:      [0.7, 0.85, 0.7, 0.8, 1, 0.9, 0.35, 0.8, 0.6, 0.7],
  boil:       [0.5, 0.6, 0.4, 0.7, 0.8, 0.6, 0.2, 0.5, 0.35, 0.5],
  frameW:     [0.4, 0.7, 0.55, 0.55, 0.6, 0.55, 0.2, 0.5, 0.4, 0.4],
  wash:       [0.3, 0.12, 0.18, 0.15, 0.1, 0.15, 0.7, 0.2, 0.2, 0.45],
  echo:       [0, 0, 0.48, 0, 0.16, 0, 0.1, 0, 0, 0],
  fragments:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  plateAlpha: [0, 1, 1, 0, 1, 0, 1, 0, 0, 0],
  dust:       [1, 0.35, 0, 0, 0.3, 0, 0, 0, 0, 1],
  window:     [0, 0.6, 0.5, 0, 0, 0, 0, 0, 0, 0],
  rain:       [0, 0, 0.45, 1, 0, 0, 0, 0, 0, 0],
  tree:       [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  sea:        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  smokeField: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  plateScale: [0.44, 0.44, 0.54, 0.5, 0.42, 0.6, 1.08, 0.6, 0.5, 0.44],
  plateX:     [0.5, 0.5, 0.5, 0.5, 0.53, 0.5, 0.5, 0.5, 0.5, 0.5],
  plateY:     [0.5, 0.5, 0.48, 0.5, 0.48, 0.5, 0.5, 0.5, 0.5, 0.5],
};

const PORTRAIT_KEYFRAMES: Record<LayoutKey, SceneValues> = {
  plateScale: [0.25, 0.25, 0.29, 0.27, 0.2, 0.4, 1.08, 0.4, 0.3, 0.25],
  plateX:     [0.5, 0.5, 0.5, 0.5, 0.51, 0.5, 0.5, 0.5, 0.5, 0.5],
  plateY:     [0.5, 0.5, 0.46, 0.5, 0.47, 0.5, 0.5, 0.5, 0.5, 0.5],
};

export function keyframe(name: KeyframeName, progress: number, portrait = false): number {
  const values = portrait && name in PORTRAIT_KEYFRAMES
    ? PORTRAIT_KEYFRAMES[name as LayoutKey]
    : KEYFRAMES[name];
  const i = Math.max(0, Math.min(values.length - 2, Math.floor(progress)));
  let f = Math.max(0, Math.min(1, progress - i));
  f = f * f * (3 - 2 * f);
  return values[i] + (values[i + 1] - values[i]) * f;
}
