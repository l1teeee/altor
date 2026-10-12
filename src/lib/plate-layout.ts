import { keyframe } from './params';

export const ASPECT_BREAKPOINT = 23 / 20;

export function plateLayout(scene: number, width: number, height: number, reducedMotion: boolean) {
  const portrait = width / height <= ASPECT_BREAKPOINT;
  const plateWidth = Math.max(width, height * 4 / 3) * keyframe('plateScale', scene, portrait);
  const x = keyframe('plateX', scene, portrait) * width;
  const y = keyframe('plateY', scene, portrait) * height;
  const drift = reducedMotion ? 0 : Math.max(-0.5, Math.min(0.5, scene - 4));
  const offsetX = (portrait ? 0.32 : 0.31) * width;
  const offsetY = (portrait ? 0.25 : 0.27) * height;

  return [
    { x, y, width: plateWidth, height: plateWidth * 0.75 },
    {
      x: x - offsetX,
      y: y - offsetY + drift * height * 0.12,
      width: plateWidth * 0.35,
      height: plateWidth * 0.35 * 0.75,
    },
    {
      x: x + offsetX,
      y: y + offsetY - drift * height * 0.17,
      width: plateWidth * 0.5,
      height: plateWidth * 0.5 * 0.75,
    },
  ];
}
