import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import { keyframe, type Params } from './params';
import { plateLayout } from './plate-layout';

export type RGB = [number, number, number];

export interface RenderState {
  params: Params;
  scene: number;
  forceSmoke: boolean;
  paper: RGB;
  ink: RGB;
  dark: number;
}

export interface RendererOptions {
  fixedQuality: boolean;
  reducedMotion: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  w: number;
}

const UNIFORM_NAMES = [
  'uRes',
  'uTime',
  'uVideo',
  'uVideoPrev',
  'uWash',
  'uEcho',
  'uSmoke',
  'uFragments',
  'uPlateAlpha',
  'uFields',
  'uPlates',
  'uK',
  'uSmudge',
  'uBloom',
  'uContrast',
  'uTooth',
  'uToothScale',
  'uBoil',
  'uFrame',
  'uFrameW',
  'uDark',
  'uGlow',
  'uPaper',
  'uInk',
  'uTrail',
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

const TRAIL_LENGTH = 10;
const INTRO_MS = 2600;
const FIELD_KEYFRAMES = ['dust', 'window', 'rain', 'tree', 'sea', 'smokeField'] as const;

export class CharcoalRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly previousTexture: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private readonly uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;
  private readonly trail: TrailPoint[] = Array.from({ length: TRAIL_LENGTH }, () => ({ x: -9999, y: -9999, w: 0 }));
  private readonly trailData = new Float32Array(TRAIL_LENGTH * 3);
  private readonly pointer = { x: 0, y: 0, sx: 0, sy: 0, t: -1e9, has: false };
  private readonly plate = { cx: 0, cy: 0, hw: 0, hh: 0 };
  private readonly plateData = new Float32Array(12);
  private readonly fieldData = new Float32Array(FIELD_KEYFRAMES.length);
  private quality = 1;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private scale = 1;
  private lastPush = 0;
  private frames = 0;
  private ema = 16;
  private lastFrame = 0;
  private startTime = 0;
  private lastEchoUpload = -Infinity;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
    private readonly options: RendererOptions,
    gl: WebGL2RenderingContext,
  ) {
    this.gl = gl;
    this.program = this.createProgram();
    gl.useProgram(this.program);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    UNIFORM_NAMES.forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    });
    this.texture = this.createTexture(0);
    this.previousTexture = this.createTexture(1);
    gl.uniform1i(this.uniforms.uVideo, 0);
    gl.uniform1i(this.uniforms.uVideoPrev, 1);
    this.resize();
  }

  static create(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    options: RendererOptions,
  ): CharcoalRenderer | null {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return null;
    return new CharcoalRenderer(canvas, video, options, gl);
  }

  private compile(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  private createProgram(): WebGLProgram {
    const { gl } = this;
    const program = gl.createProgram()!;
    gl.attachShader(program, this.compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }
    return program;
  }

  private createTexture(unit: number): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([24, 24, 24, 255]));
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5) * this.quality;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const { width: W, height: H, dpr } = this;
    this.canvas.width = Math.max(2, Math.round(W * dpr));
    this.canvas.height = Math.max(2, Math.round(H * dpr));
  }

  private updatePlates(scene: number): void {
    const { width, height, dpr } = this;
    const plates = plateLayout(scene, width, height, this.options.reducedMotion);
    plates.forEach((plate, i) => {
      this.plateData[i * 4] = plate.x * dpr;
      this.plateData[i * 4 + 1] = (height - plate.y) * dpr;
      this.plateData[i * 4 + 2] = plate.width * dpr / 2;
      this.plateData[i * 4 + 3] = plate.height * dpr / 2;
    });
    this.plate.cx = this.plateData[0];
    this.plate.cy = this.plateData[1];
    this.plate.hw = this.plateData[2];
    this.plate.hh = this.plateData[3];
    this.scale = plates[0].height * dpr / 720;
  }

  private uploadVideo(now: number): void {
    const { gl, video } = this;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (now - this.lastEchoUpload >= 350) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.previousTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.lastEchoUpload = now;
    }
  }

  setPointer(x: number, y: number, now: number): void {
    const p = this.pointer;
    p.x = x;
    p.y = y;
    p.t = now;
    if (!p.has) {
      p.sx = x;
      p.sy = y;
      p.has = true;
    }
  }

  private stepTrail(now: number, scene: number): void {
    const { pointer: p, trail, plate, dpr, height } = this;
    const active = p.has && now - p.t < 2200;
    let x: number;
    let y: number;
    let w: number;
    if (active) {
      p.sx += (p.x - p.sx) * 0.22;
      p.sy += (p.y - p.sy) * 0.22;
      x = p.sx * dpr;
      y = (height - p.sy) * dpr;
      w = 1;
    } else if (!this.options.reducedMotion) {
      const t = now / 1000;
      if (keyframe('plateAlpha', scene) < 0.5) {
        x = (this.width / 2) * dpr + Math.cos(t * 0.4) * this.width * dpr * 0.25;
        y = (height / 2) * dpr + Math.sin(t * 0.55) * height * dpr * 0.25;
      } else {
        x = plate.cx + Math.cos(t * 0.4) * plate.hw * 0.45;
        y = plate.cy + Math.sin(t * 0.55) * plate.hh * 0.35;
      }
      w = 0.4;
    } else {
      x = -9999;
      y = -9999;
      w = 0;
    }
    if (now - this.lastPush > 32) {
      for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
        trail[i].x = trail[i - 1].x;
        trail[i].y = trail[i - 1].y;
        trail[i].w = trail[i - 1].w * 0.84;
      }
      this.lastPush = now;
    }
    trail[0].x = x;
    trail[0].y = y;
    trail[0].w = w;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailData[i * 3] = trail[i].x;
      this.trailData[i * 3 + 1] = trail[i].y;
      this.trailData[i * 3 + 2] = trail[i].w;
    }
  }

  private introProgress(now: number): number {
    if (this.options.reducedMotion) return 1;
    const linear = Math.min(1, (now - this.startTime) / INTRO_MS);
    return linear * linear * (3 - 2 * linear);
  }

  render(now: number, state: RenderState): void {
    const { gl, uniforms: u } = this;
    if (this.startTime === 0) {
      this.startTime = now;
      this.lastFrame = now;
    }
    const dt = now - this.lastFrame;
    this.lastFrame = now;
    this.ema += (dt - this.ema) * 0.08;
    this.frames++;
    if (!this.options.fixedQuality && this.frames > 90 && this.frames % 45 === 0 && this.ema > 26 && this.quality > 0.55) {
      this.quality = Math.max(0.55, this.quality * 0.82);
      this.resize();
    }
    this.uploadVideo(now);
    this.updatePlates(state.scene);
    this.stepTrail(now, state.scene);

    const { params: P, scene } = state;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.options.reducedMotion ? 0 : (now - this.startTime) / 1000);
    const intro = this.introProgress(now);
    gl.uniform1f(u.uWash, 1 + (keyframe('wash', scene) - 1) * intro);
    gl.uniform1f(u.uEcho, keyframe('echo', scene));
    gl.uniform1f(u.uSmoke, state.forceSmoke ? 1 : 0);
    gl.uniform1f(u.uFragments, keyframe('fragments', scene));
    gl.uniform1f(u.uPlateAlpha, keyframe('plateAlpha', scene));
    FIELD_KEYFRAMES.forEach((name, i) => {
      this.fieldData[i] = keyframe(name, scene);
    });
    gl.uniform1fv(u.uFields, this.fieldData);
    gl.uniform4fv(u.uPlates, this.plateData);
    gl.uniform1f(u.uK, this.scale);
    gl.uniform1f(u.uSmudge, P.smudge * keyframe('smudge', scene));
    gl.uniform1f(u.uBloom, P.bloom * keyframe('bloom', scene));
    gl.uniform1f(u.uContrast, P.contrast);
    gl.uniform1f(u.uTooth, Math.min(1, P.tooth * keyframe('tooth', scene)));
    gl.uniform1f(u.uToothScale, P.grain * keyframe('grain', scene));
    gl.uniform1f(u.uBoil, this.options.reducedMotion ? 0 : P.boil * keyframe('boil', scene));
    gl.uniform1f(u.uFrame, P.frame);
    gl.uniform1f(u.uFrameW, keyframe('frameW', scene));
    gl.uniform1f(u.uDark, state.dark);
    gl.uniform1f(u.uGlow, P.glow);
    gl.uniform3f(u.uPaper, state.paper[0], state.paper[1], state.paper[2]);
    gl.uniform3f(u.uInk, state.ink[0], state.ink[1], state.ink[2]);
    gl.uniform3fv(u.uTrail, this.trailData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    const { gl } = this;
    gl.deleteTexture(this.texture);
    gl.deleteTexture(this.previousTexture);
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
  }
}
