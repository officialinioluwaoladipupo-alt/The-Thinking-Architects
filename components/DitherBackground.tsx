"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface DitherBackgroundProps {
  theme: "dark" | "cream";
  pixelSize?: number;
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  colorLevels?: number;
  mouseRadius?: number;
  className?: string;
}

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Native WebGL1-compatible FBM Wave + 8x8 Bayer Ordered Dithering shader
const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mouseActive;
uniform float u_mouseRadius;
uniform float u_pixelSize;
uniform float u_waveSpeed;
uniform float u_waveFrequency;
uniform float u_waveAmplitude;
uniform float u_colorLevels;
uniform vec3 u_bgColor;
uniform vec3 u_waveColor;
uniform float u_intensity;

float bayer2(vec2 a) {
  a = mod(floor(a), 2.0);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
  return bayer2(0.5 * floor(a)) * 0.25 + bayer2(a);
}

float bayer8(vec2 a) {
  return bayer4(0.5 * floor(a)) * 0.25 + bayer2(a);
}

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = u_waveFrequency;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= u_waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - u_time * u_waveSpeed;
  return fbm(p + fbm(p2));
}

void main() {
  // Quantize screen pixels into crisp dither blocks
  vec2 cellCoord = floor(gl_FragCoord.xy / u_pixelSize);
  vec2 snappedFrag = cellCoord * u_pixelSize;
  vec2 uv = (snappedFrag / u_resolution) - 0.5;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float f = pattern(uv);

  // Subtle right-hand architectural composition bias so left typography stays quiet & crisp
  float screenX = gl_FragCoord.x / max(u_resolution.x, 1.0);
  float screenY = gl_FragCoord.y / max(u_resolution.y, 1.0);
  float stageBias = smoothstep(0.12, 0.95, screenX * 0.72 + (1.0 - screenY) * 0.28);
  f *= mix(0.28, 1.0, stageBias);

  // Interactive cursor repulsion / ripple field
  if (u_mouseActive > 0.5) {
    vec2 mouseUV = (u_mouse / u_resolution) - 0.5;
    mouseUV.x *= u_resolution.x / max(u_resolution.y, 1.0);
    float dist = length(uv - mouseUV);
    float influence = 1.0 - smoothstep(0.0, u_mouseRadius, dist);
    f -= influence * 0.42;
  }

  f = clamp(f * u_intensity, 0.0, 1.0);

  // 8x8 Bayer ordered dithering threshold with multi-level tone quantization
  float threshold = bayer8(cellCoord) - 0.5;
  float stepSize = 1.0 / max(u_colorLevels - 1.0, 1.0);
  float dithered = clamp(f + threshold * stepSize, 0.0, 1.0);
  dithered = floor(dithered * (u_colorLevels - 1.0) + 0.5) / max(u_colorLevels - 1.0, 1.0);

  vec3 col = mix(u_bgColor, u_waveColor, dithered);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function DitherBackground({
  theme,
  pixelSize = 3,
  waveSpeed = 0.045,
  waveFrequency = 2.6,
  waveAmplitude = 0.34,
  colorLevels = 5,
  mouseRadius = 0.34,
  className = "",
}: DitherBackgroundProps) {
  const prefersReduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const targetColorsRef = useRef({
    bg: theme === "dark" ? [28 / 255, 28 / 255, 28 / 255] : [242 / 255, 237 / 255, 232 / 255],
    wave:
      theme === "dark" ? [217 / 255, 79 / 255, 43 / 255] : [217 / 255, 79 / 255, 43 / 255],
    intensity: theme === "dark" ? 0.55 : 0.24,
  });

  useEffect(() => {
    targetColorsRef.current = {
      bg: theme === "dark" ? [28 / 255, 28 / 255, 28 / 255] : [242 / 255, 237 / 255, 232 / 255],
      wave:
        theme === "dark" ? [217 / 255, 79 / 255, 43 / 255] : [217 / 255, 79 / 255, 43 / 255],
      intensity: theme === "dark" ? 0.56 : 0.25,
    };
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const locs = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      mouse: gl.getUniformLocation(program, "u_mouse"),
      mouseActive: gl.getUniformLocation(program, "u_mouseActive"),
      mouseRadius: gl.getUniformLocation(program, "u_mouseRadius"),
      pixelSize: gl.getUniformLocation(program, "u_pixelSize"),
      waveSpeed: gl.getUniformLocation(program, "u_waveSpeed"),
      waveFrequency: gl.getUniformLocation(program, "u_waveFrequency"),
      waveAmplitude: gl.getUniformLocation(program, "u_waveAmplitude"),
      colorLevels: gl.getUniformLocation(program, "u_colorLevels"),
      bgColor: gl.getUniformLocation(program, "u_bgColor"),
      waveColor: gl.getUniformLocation(program, "u_waveColor"),
      intensity: gl.getUniformLocation(program, "u_intensity"),
    };

    const current = {
      bg: [...targetColorsRef.current.bg],
      wave: [...targetColorsRef.current.wave],
      intensity: targetColorsRef.current.intensity,
    };

    const mouse = { x: 0, y: 0, active: 0 };

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(1, Math.floor(parent.clientWidth));
      const h = Math.max(1, Math.floor(parent.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const stageEl = canvas.parentElement;
    const handlePointerMove = (e: PointerEvent) => {
      if (!stageEl) return;
      const rect = stageEl.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = rect.height - (e.clientY - rect.top);
      mouse.active = 1;
    };
    const handlePointerLeave = () => {
      mouse.active = 0;
    };

    if (stageEl && !prefersReduced) {
      stageEl.addEventListener("pointermove", handlePointerMove);
      stageEl.addEventListener("pointerleave", handlePointerLeave);
    }

    let isVisible = true;
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    let rafId = 0;
    const startTime = performance.now();
    let lastDraw = 0;

    const drawFrame = (now: number) => {
      if (prefersReduced) {
        gl.uniform2f(locs.resolution, canvas.width, canvas.height);
        gl.uniform1f(locs.time, 1.5);
        gl.uniform2f(locs.mouse, 0, 0);
        gl.uniform1f(locs.mouseActive, 0);
        gl.uniform1f(locs.mouseRadius, mouseRadius);
        gl.uniform1f(locs.pixelSize, pixelSize);
        gl.uniform1f(locs.waveSpeed, waveSpeed);
        gl.uniform1f(locs.waveFrequency, waveFrequency);
        gl.uniform1f(locs.waveAmplitude, waveAmplitude);
        gl.uniform1f(locs.colorLevels, colorLevels);
        gl.uniform3f(locs.bgColor, current.bg[0], current.bg[1], current.bg[2]);
        gl.uniform3f(locs.waveColor, current.wave[0], current.wave[1], current.wave[2]);
        gl.uniform1f(locs.intensity, current.intensity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        return;
      }

      rafId = requestAnimationFrame(drawFrame);

      if (!isVisible || document.hidden) return;
      if (now - lastDraw < 32) return;
      lastDraw = now;

      const target = targetColorsRef.current;
      const lerp = 0.14;
      for (let i = 0; i < 3; i++) {
        current.bg[i] += (target.bg[i] - current.bg[i]) * lerp;
        current.wave[i] += (target.wave[i] - current.wave[i]) * lerp;
      }
      current.intensity += (target.intensity - current.intensity) * lerp;

      const elapsed = (now - startTime) * 0.001;

      gl.uniform2f(locs.resolution, canvas.width, canvas.height);
      gl.uniform1f(locs.time, elapsed);
      gl.uniform2f(locs.mouse, mouse.x, mouse.y);
      gl.uniform1f(locs.mouseActive, mouse.active);
      gl.uniform1f(locs.mouseRadius, mouseRadius);
      gl.uniform1f(locs.pixelSize, pixelSize);
      gl.uniform1f(locs.waveSpeed, waveSpeed);
      gl.uniform1f(locs.waveFrequency, waveFrequency);
      gl.uniform1f(locs.waveAmplitude, waveAmplitude);
      gl.uniform1f(locs.colorLevels, colorLevels);
      gl.uniform3f(locs.bgColor, current.bg[0], current.bg[1], current.bg[2]);
      gl.uniform3f(locs.waveColor, current.wave[0], current.wave[1], current.wave[2]);
      gl.uniform1f(locs.intensity, current.intensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      if (stageEl) {
        stageEl.removeEventListener("pointermove", handlePointerMove);
        stageEl.removeEventListener("pointerleave", handlePointerLeave);
      }
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [
    prefersReduced,
    pixelSize,
    waveSpeed,
    waveFrequency,
    waveAmplitude,
    colorLevels,
    mouseRadius,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
