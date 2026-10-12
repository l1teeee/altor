import { keyframe } from './params';
import { plateLayout } from './plate-layout';

export function publishScroll(sections: HTMLElement[], counter: HTMLElement | null, reducedMotion: boolean) {
  const root = document.documentElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const bounds = sections.map((section) => section.getBoundingClientRect());
  const centers = bounds.map((rect) => rect.top + rect.height / 2);
  let scene = 0;

  for (let i = 0; i < centers.length - 1; i++) {
    const progress = (height / 2 - centers[i]) / (centers[i + 1] - centers[i]);
    scene = i + Math.max(0, Math.min(1, progress));
    if (progress < 1) break;
  }

  bounds.forEach((rect, i) => {
    const progress = Math.max(0, Math.min(1, (height - rect.top) / (height + rect.height)));
    sections[i].style.setProperty('--p', String(progress));
    root.style.setProperty(`--p-${i}`, String(progress));
  });
  root.style.setProperty('--scene', String(scene));
  root.style.setProperty('--scroll-progress', String(scene / (sections.length - 1)));
  root.style.setProperty('--wash', String(keyframe('wash', scene)));

  const plates = plateLayout(scene, width, height, reducedMotion);
  root.style.setProperty('--plate-x', `${plates[0].x}px`);
  root.style.setProperty('--plate-y', `${plates[0].y}px`);
  for (let i = 1; i < plates.length; i++) {
    const dx = plates[i].x - plates[0].x;
    const dy = plates[i].y - plates[0].y;
    root.style.setProperty(`--link-${i}-length`, `${Math.hypot(dx, dy)}px`);
    root.style.setProperty(`--link-${i}-angle`, `${Math.atan2(dy, dx)}rad`);
  }

  if (counter) {
    const seconds = Math.round(Math.max(0, Math.min(1, scene - 1)) * 59);
    counter.textContent = `00:${String(seconds).padStart(2, '0')}`;
  }
  return scene;
}
