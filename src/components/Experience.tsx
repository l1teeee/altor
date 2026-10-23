'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CharcoalRenderer, type RGB } from '@/lib/renderer';
import { DEFAULT_PARAMS } from '@/lib/params';
import { publishScroll } from '@/lib/scroll-progress';
import { Overlay } from './Overlay';

function parseHex(value: string): RGB | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const MIN_VEIL_MS = 600;
const MAX_VEIL_MS = 4000;

export function Experience({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const treeVideoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef(0);
  const [glOn, setGlOn] = useState(true);
  const [veilLifted, setVeilLifted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const treeVideo = treeVideoRef.current;
    if (!canvas || !video || !treeVideo) return;
    const clips = [video, treeVideo];

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const options = {
      fixedQuality: new URLSearchParams(window.location.search).has('fixed'),
      reducedMotion: motion.matches,
    };
    let forceSmoke = false;
    let active = true;
    const play = () => {
      if (options.reducedMotion) return;
      clips.forEach((clip) => {
        // Autoplay can be denied until the first pointer interaction.
        void clip.play().catch(() => {
          if (active) window.addEventListener('pointerdown', play, { once: true });
        });
      });
    };
    const onLoaded = (event: Event) => {
      const clip = event.currentTarget as HTMLVideoElement;
      if (clip === video) forceSmoke = false;
      if (options.reducedMotion) {
        clip.currentTime = 1.2;
        clip.pause();
      }
    };
    clips.forEach((clip) => {
      clip.addEventListener('loadeddata', onLoaded);
      clip.muted = true;
    });
    video.src = video.canPlayType('video/webm; codecs="vp9"') ? '/cosmos.webm' : '/cosmos.mp4';
    treeVideo.src = treeVideo.canPlayType('video/webm; codecs="vp9"') ? '/arbol.webm' : '/arbol.mp4';
    play();
    const stall = window.setTimeout(() => {
      forceSmoke = video.readyState < 2 || video.videoWidth === 0;
    }, 4000);

    // Keep the veil up until the first video frame and the fonts are in, but never longer than MAX_VEIL_MS.
    const videoReady = new Promise<void>((resolve) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true });
    });
    const waitMs = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    let liftRaf = 0;
    void Promise.race([
      Promise.all([videoReady, document.fonts.ready, waitMs(MIN_VEIL_MS)]),
      waitMs(MAX_VEIL_MS),
    ]).then(() => {
      // Two frames so the canvas has drawn before the veil fades.
      liftRaf = requestAnimationFrame(() => {
        liftRaf = requestAnimationFrame(() => {
          if (active) setVeilLifted(true);
        });
      });
    });

    const renderer = CharcoalRenderer.create(canvas, video, treeVideo, options);
    setGlOn(renderer !== null);
    const theme = { paper: [0.949, 0.925, 0.882] as RGB, ink: [0.118, 0.102, 0.082] as RGB, dark: 0 };
    const readTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      theme.paper = parseHex(styles.getPropertyValue('--paper')) ?? theme.paper;
      theme.ink = parseHex(styles.getPropertyValue('--ink')) ?? theme.ink;
      theme.dark = (theme.paper[0] + theme.paper[1] + theme.paper[2]) / 3 < 0.5 ? 1 : 0;
    };
    readTheme();

    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    let scrollRaf = 0;
    const readScroll = () => {
      scrollRaf = 0;
      sceneRef.current = publishScroll(sections, options.reducedMotion);
    };
    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(readScroll);
    };
    const onResize = () => {
      renderer?.resize();
      onScroll();
    };
    const onMotion = () => {
      options.reducedMotion = motion.matches;
      if (motion.matches) clips.forEach((clip) => clip.pause());
      else play();
      onScroll();
    };
    const onPointer = (event: PointerEvent) => {
      renderer?.setPointer(event.clientX, event.clientY, performance.now());
    };
    readScroll();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    motion.addEventListener('change', onMotion);

    let raf = 0;
    let smoothScene = sceneRef.current;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (options.reducedMotion) smoothScene = sceneRef.current;
      else smoothScene += (sceneRef.current - smoothScene) * 0.075;
      renderer?.render(now, { params: DEFAULT_PARAMS, scene: smoothScene, forceSmoke, ...theme });
    };
    if (renderer) raf = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      cancelAnimationFrame(liftRaf);
      window.clearTimeout(stall);
      clips.forEach((clip) => {
        clip.pause();
        clip.removeEventListener('loadeddata', onLoaded);
      });
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      motion.removeEventListener('change', onMotion);
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="stage" data-gl={glOn ? 'on' : 'off'}>
      <div className="veil" data-lifted={veilLifted} aria-hidden="true">
        <div className="veil-pulse" />
      </div>
      <canvas ref={canvasRef} className="canvas" aria-hidden="true" />
      <video ref={videoRef} className="source" muted loop playsInline preload="auto" aria-hidden="true" />
      <video ref={treeVideoRef} className="source source-tree" muted loop playsInline preload="auto" aria-hidden="true" />
      <main>{children}</main>
      <Overlay />
    </div>
  );
}
