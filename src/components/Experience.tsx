'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { CharcoalRenderer, type RGB, type SourceMode } from '@/lib/renderer';
import { DEFAULT_PARAMS, PARAM_DEFS, type ParamKey, type Params } from '@/lib/params';

export const OpenPanelContext = createContext<() => void>(() => {});

const SOURCES: { id: SourceMode; label: string }[] = [
  { id: 'video', label: 'Video' },
  { id: 'humo', label: 'Humo' },
];

function parseHex(value: string): RGB | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function defaultSource(video: HTMLVideoElement): string {
  return video.canPlayType('video/webm; codecs="vp9"') ? '/cosmos.webm' : '/cosmos.mp4';
}

function formatValue(value: number, step: number): string {
  return step < 1 ? value.toFixed(2).replace(/\.00$/, '') : value.toFixed(0);
}

export function Experience({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const customUrlRef = useRef<string | null>(null);

  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [mode, setMode] = useState<SourceMode>('video');
  const [panelOpen, setPanelOpen] = useState(false);
  const [glOn, setGlOn] = useState(true);
  const [copyLabel, setCopyLabel] = useState('Copiar parámetros');

  const paramsRef = useRef(params);
  const modeRef = useRef(mode);
  const sceneRef = useRef(0);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fixed = new URLSearchParams(window.location.search).has('fixed');
    if (reduce) setParams((p) => ({ ...p, boil: 0 }));

    video.muted = true;
    video.src = defaultSource(video);
    const play = () => {
      video.play().catch(() => {});
    };
    play();
    window.addEventListener('pointerdown', play, { once: true });
    if (reduce) {
      video.addEventListener(
        'loadeddata',
        () => {
          video.currentTime = 1.2;
          video.pause();
        },
        { once: true },
      );
    }
    const stall = window.setTimeout(() => {
      if (!video.videoWidth && modeRef.current === 'video') setMode('humo');
    }, 4000);

    const renderer = CharcoalRenderer.create(canvas, video, { fixedQuality: fixed, reducedMotion: reduce });
    if (!renderer) {
      setGlOn(false);
      return () => {
        window.clearTimeout(stall);
        window.removeEventListener('pointerdown', play);
      };
    }

    const theme = { paper: [0.92, 0.92, 0.91] as RGB, ink: [0.07, 0.07, 0.07] as RGB, dark: 0 };
    const readTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      theme.paper = parseHex(styles.getPropertyValue('--paper')) ?? theme.paper;
      theme.ink = parseHex(styles.getPropertyValue('--ink')) ?? theme.ink;
      theme.dark = (theme.paper[0] + theme.paper[1] + theme.paper[2]) / 3 < 0.5 ? 1 : 0;
    };
    readTheme();
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', readTheme);

    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    const readScroll = () => {
      if (sections.length === 0) return;
      const viewportCenter = window.innerHeight / 2;
      const centers = sections.map((s) => {
        const r = s.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      if (viewportCenter <= centers[0]) {
        sceneRef.current = 0;
        return;
      }
      for (let i = 0; i < centers.length - 1; i++) {
        if (viewportCenter <= centers[i + 1]) {
          sceneRef.current = i + (viewportCenter - centers[i]) / (centers[i + 1] - centers[i]);
          return;
        }
      }
      sceneRef.current = centers.length - 1;
    };
    readScroll();

    const onResize = () => {
      renderer.resize();
      readScroll();
    };
    const onPointer = (e: PointerEvent) => renderer.setPointer(e.clientX, e.clientY, performance.now());

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });

    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      renderer.render(now, {
        params: paramsRef.current,
        scene: sceneRef.current,
        mode: modeRef.current,
        paper: theme.paper,
        ink: theme.ink,
        dark: theme.dark,
      });
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(stall);
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', readScroll);
      window.removeEventListener('pointermove', onPointer);
      scheme.removeEventListener('change', readTheme);
      renderer.dispose();
      if (customUrlRef.current) {
        URL.revokeObjectURL(customUrlRef.current);
        customUrlRef.current = null;
      }
    };
  }, []);

  const setParam = useCallback((key: ParamKey, value: number) => {
    setParams((p) => ({ ...p, [key]: value }));
  }, []);

  const restoreDefaults = useCallback(() => {
    const video = videoRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setParams({ ...DEFAULT_PARAMS, boil: reduce ? 0 : DEFAULT_PARAMS.boil });
    if (video && customUrlRef.current) {
      URL.revokeObjectURL(customUrlRef.current);
      customUrlRef.current = null;
      video.src = defaultSource(video);
      video.play().catch(() => {});
    }
  }, []);

  const copyParams = useCallback(async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(JSON.stringify(paramsRef.current, null, 2));
      ok = true;
    } catch {
      ok = false;
    }
    setCopyLabel(ok ? 'Copiado' : 'No se pudo copiar');
    window.setTimeout(() => setCopyLabel('Copiar parámetros'), 1600);
  }, []);

  const onFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const video = videoRef.current;
    if (!file || !video) return;
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    const url = URL.createObjectURL(file);
    customUrlRef.current = url;
    video.src = url;
    video.loop = true;
    video.play().catch(() => {});
    setMode('video');
    event.target.value = '';
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);

  return (
    <OpenPanelContext.Provider value={openPanel}>
      <div className="stage" data-gl={glOn ? 'on' : 'off'}>
        <canvas ref={canvasRef} className="canvas" aria-hidden="true" />
        <video ref={videoRef} className="source" muted loop playsInline preload="auto" aria-hidden="true" />

        <div className="mark">
          <b>Cosmos</b>
          <span>Carboncillo en vivo</span>
        </div>

        <main>{children}</main>

        <div className="panel" id="panel" hidden={!panelOpen}>
          <div>
            {PARAM_DEFS.map((def) => (
              <label className="row" key={def.key} htmlFor={`param-${def.key}`}>
                <span>{def.label}</span>
                <output>{formatValue(params[def.key], def.step)}</output>
                <input
                  id={`param-${def.key}`}
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={params[def.key]}
                  onChange={(e) => setParam(def.key, parseFloat(e.target.value))}
                />
              </label>
            ))}
          </div>
          <div className="actions">
            <button type="button" onClick={copyParams}>
              {copyLabel}
            </button>
            <button type="button" onClick={restoreDefaults}>
              Restablecer
            </button>
          </div>
        </div>

        <div className="dock" role="group" aria-label="Fuente y ajustes">
          {SOURCES.map((source) => (
            <button
              key={source.id}
              type="button"
              aria-pressed={mode === source.id}
              onClick={() => setMode(source.id)}
            >
              {source.label}
            </button>
          ))}
          <button type="button" aria-pressed={false} onClick={() => fileRef.current?.click()}>
            Mi video
          </button>
          <button
            type="button"
            aria-pressed={panelOpen}
            aria-controls="panel"
            onClick={() => setPanelOpen((open) => !open)}
          >
            Ajustes
          </button>
          <input
            ref={fileRef}
            className="visually-hidden"
            type="file"
            accept="video/*"
            tabIndex={-1}
            aria-label="Cargar tu propio video"
            onChange={onFile}
          />
        </div>
      </div>
    </OpenPanelContext.Provider>
  );
}
