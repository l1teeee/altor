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

export interface ParamDef {
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

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

export const PARAM_DEFS: ParamDef[] = [
  { key: 'smudge', label: 'Difuminado', min: 3, max: 20, step: 0.5 },
  { key: 'bloom', label: 'Brillo', min: 0, max: 1.5, step: 0.05 },
  { key: 'contrast', label: 'Contraste', min: 0.8, max: 2.2, step: 0.05 },
  { key: 'tooth', label: 'Grano', min: 0, max: 1, step: 0.05 },
  { key: 'grain', label: 'Tamaño de grano', min: 0.5, max: 3, step: 0.1 },
  { key: 'boil', label: 'Pulso (cuadros/s)', min: 0, max: 24, step: 1 },
  { key: 'frame', label: 'Marco', min: 0, max: 1, step: 0.05 },
  { key: 'glow', label: 'Luz del cursor', min: 0, max: 1.5, step: 0.05 },
];

export type KeyframeName = 'smudge' | 'bloom' | 'grain' | 'tooth' | 'boil' | 'frameW';

const KEYFRAMES: Record<KeyframeName, number[]> = {
  smudge: [1, 2.2, 0.9, 1, 1, 1],
  bloom: [1, 1.7, 1, 1, 1, 1],
  grain: [1, 1, 2.2, 1, 1, 1],
  tooth: [1, 0.55, 1.15, 1, 1, 1],
  boil: [1, 1, 1, 0.4, 1, 1],
  frameW: [1, 1, 1, 1, 2, 1],
};

export function keyframe(name: KeyframeName, progress: number): number {
  const values = KEYFRAMES[name];
  const i = Math.max(0, Math.min(values.length - 2, Math.floor(progress)));
  let f = Math.max(0, Math.min(1, progress - i));
  f = f * f * (3 - 2 * f);
  return values[i] + (values[i + 1] - values[i]) * f;
}
