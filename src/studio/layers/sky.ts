/*
 * studio layer: sky
 * Procedural atmospheric sky, solar/lunar disk, glare falloff, haze and stars.
 * Part of ascii.rest, MIT licensed.
 */
import { clamp, hexToRgb, smoothstep } from "../halftone.ts";
import type {
  LayerDefinition,
  LayerInstance,
  ParamSchema,
  ParamValues,
  RenderContext,
} from "../types.ts";

export const skySchema: ParamSchema = {
  horizon: {
    type: "number",
    label: "horizon line",
    default: 56,
    min: 10,
    max: 90,
    step: 1,
  },
  sunPos: {
    type: "vec2",
    label: "sun position",
    default: [134, 51.5],
    min: [0, 0],
    max: [200, 100],
    step: 1,
  },
  sunRadius: {
    type: "number",
    label: "sun radius",
    default: 8.5,
    min: 0,
    max: 30,
    step: 0.5,
  },
  glare: {
    type: "number",
    label: "sun glare intensity",
    default: 1.0,
    min: 0,
    max: 3.0,
    step: 0.1,
  },
  haze: {
    type: "number",
    label: "haze turbulence",
    default: 0.3,
    min: 0,
    max: 1.0,
    step: 0.05,
  },
  stars: {
    type: "boolean",
    label: "twinkling stars",
    default: false,
  },
  gradientTop: {
    type: "color",
    label: "zenith color",
    default: "#14194c",
  },
  gradientHorizon: {
    type: "color",
    label: "horizon sky color",
    default: "#ea6a78",
  },
  sunColor: {
    type: "color",
    label: "sun body color",
    default: "#fff5d8",
  },
};

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export class SkyLayer implements LayerInstance {
  init(_ctx: RenderContext, _params: ParamValues): void {}

  render(
    ctx: RenderContext,
    params: ParamValues,
    bufR: Float32Array,
    bufG: Float32Array,
    bufB: Float32Array,
    bufDepth: Float32Array
  ): void {
    const horizon = params.horizon ?? 56;
    const sunPos = params.sunPos ?? [134, 51.5];
    const sunRadius = params.sunRadius ?? 8.5;
    const glare = params.glare ?? 1.0;
    const haze = params.haze ?? 0.3;
    const stars = params.stars ?? false;

    const cTop = hexToRgb(params.gradientTop ?? "#14194c");
    const cHoriz = hexToRgb(params.gradientHorizon ?? "#ea6a78");
    const cSun = hexToRgb(params.sunColor ?? "#fff5d8");

    const t = ctx.t;
    const W = ctx.cols;
    const H = ctx.rows;

    for (let r = 0; r < Math.min(H, horizon); r++) {
      const v = r / Math.max(1, horizon);
      for (let x = 0; x < W; x++) {
        const idx = r * W + x;

        // Skip if something in front has already drawn at closer depth
        if (bufDepth[idx] <= 10.0) continue;

        // Vertical sky gradient interpolation
        let red = cTop[0] + (cHoriz[0] - cTop[0]) * v;
        let green = cTop[1] + (cHoriz[1] - cTop[1]) * v;
        let blue = cTop[2] + (cHoriz[2] - cTop[2]) * v;

        // Sun distance and glare
        const dx = x + 0.5 - sunPos[0];
        const dy = (r + 0.5 - sunPos[1]) * 1.5;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (sunRadius > 0 && d < sunRadius) {
          // Inside sun disk
          const edge = smoothstep(sunRadius, sunRadius - 1.2, d);
          red = red * (1 - edge) + cSun[0] * edge;
          green = green * (1 - edge) + cSun[1] * edge;
          blue = blue * (1 - edge) + cSun[2] * edge;
        } else if (glare > 0) {
          // Radial glow falloff
          const glow = (Math.exp(-d / 38) * 0.25 + Math.exp(-d / 12) * 0.35) * glare;
          red += cSun[0] * glow;
          green += cSun[1] * glow * 0.8;
          blue += cSun[2] * glow * 0.4;
        }

        // Atmospheric haze banding
        if (haze > 0) {
          const turb = 0.85 + 0.3 * noise(x * 0.04, r * 0.15 + t * 0.05);
          red *= turb;
          green *= turb;
          blue *= turb;
        }

        // Night stars twinkle
        if (stars && v < 0.75) {
          const starSeed = hash(x * 17, r * 31);
          if (starSeed > 0.985) {
            const twinkle = 0.5 + 0.5 * Math.sin(t * 3.0 + starSeed * 100);
            red += twinkle * 0.8;
            green += twinkle * 0.8;
            blue += twinkle * 0.9;
          }
        }

        bufR[idx] = clamp(red);
        bufG[idx] = clamp(green);
        bufB[idx] = clamp(blue);
        bufDepth[idx] = 100.0; // Far sky depth
      }
    }
  }
}

export const skyDefinition: LayerDefinition = {
  type: "sky",
  label: "Atmospheric Sky",
  description: "Sky gradient, sun/moon disk, radial glare, atmospheric haze and stars",
  schema: skySchema,
  create: () => new SkyLayer(),
};
