/*
 * studio layer: heightfield
 * Mountain ridges, headlands, hills and architectural silhouettes.
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

export const heightfieldSchema: ParamSchema = {
  horizon: {
    type: "number",
    label: "horizon row",
    default: 56,
    min: 10,
    max: 90,
    step: 1,
  },
  peakHeight: {
    type: "number",
    label: "peak elevation",
    default: 24,
    min: 2,
    max: 60,
    step: 1,
  },
  frequency: {
    type: "number",
    label: "ridge frequency",
    default: 0.03,
    min: 0.01,
    max: 0.15,
    step: 0.005,
  },
  roughness: {
    type: "number",
    label: "strata roughness",
    default: 0.5,
    min: 0,
    max: 1.0,
    step: 0.05,
  },
  color: {
    type: "color",
    label: "terrain base color",
    default: "#1c1432",
  },
  highlight: {
    type: "color",
    label: "slope highlight color",
    default: "#b23c7c",
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

function fbm(x: number, y: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum;
}

export class HeightfieldLayer implements LayerInstance {
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
    const peakHeight = params.peakHeight ?? 24;
    const freq = params.frequency ?? 0.03;
    const roughness = params.roughness ?? 0.5;

    const cBase = hexToRgb(params.color ?? "#1c1432");
    const cHigh = hexToRgb(params.highlight ?? "#b23c7c");

    const W = ctx.cols;
    const H = ctx.rows;

    for (let x = 0; x < W; x++) {
      // Calculate ridge curve elevation at column x
      const n = fbm(x * freq, 12.34, 4);
      const elevation = peakHeight * Math.pow(n, 1.2);
      const ridgeY = horizon - elevation;

      // Slope derivative for lighting (catch light on eastward facing slopes)
      const nNext = fbm((x + 1) * freq, 12.34, 4);
      const slope = (nNext - n) * 15.0;
      const lightCatch = smoothstep(-0.2, 0.8, slope);

      const startRow = Math.max(0, Math.floor(ridgeY));
      for (let r = startRow; r < Math.min(H, horizon + 2); r++) {
        const idx = r * W + x;

        // Depth is midground
        const depth = 40.0;
        if (bufDepth[idx] <= depth) continue;

        // Rock texture and stratification
        const rockStrata = fbm(x * 0.18, r * 0.45, 2) * roughness;
        const shade = clamp(0.7 + 0.6 * lightCatch + rockStrata * 0.3);

        const blendHigh = clamp(lightCatch * 0.6 + rockStrata * 0.3);
        const red = cBase[0] * (1 - blendHigh) + cHigh[0] * blendHigh;
        const green = cBase[1] * (1 - blendHigh) + cHigh[1] * blendHigh;
        const blue = cBase[2] * (1 - blendHigh) + cHigh[2] * blendHigh;

        bufR[idx] = clamp(red * shade);
        bufG[idx] = clamp(green * shade);
        bufB[idx] = clamp(blue * shade);
        bufDepth[idx] = depth;
      }
    }
  }
}

export const heightfieldDefinition: LayerDefinition = {
  type: "heightfield",
  label: "Mountain & Ridge Silhouettes",
  description: "Procedural terrain ridges, headlands, rock strata and slope lighting",
  schema: heightfieldSchema,
  create: () => new HeightfieldLayer(),
};
