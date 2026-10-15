/*
 * studio layer: heightfield
 * Mountain ridges, headlands, hills and architectural silhouettes.
 * Part of ascii.rest, MIT licensed.
 */
import { clamp, hexToRgb, smoothstep } from "../halftone.ts";
import { fbm, hash, noise } from "../noise.ts";
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
  style: {
    type: "select",
    label: "silhouette style",
    default: "peaks",
    options: [
      { label: "Alpine Peaks", value: "peaks" },
      { label: "Rolling Hills", value: "hills" },
      { label: "Dunes", value: "dunes" },
      { label: "City Skyline", value: "city" },
      { label: "Pine Ridges", value: "pines" },
    ],
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

/** The ridge elevation at a column, per silhouette style. */
function elevationAt(
  x: number,
  horizon: number,
  peakHeight: number,
  freq: number,
  style: string,
  W: number
): number {
  const n = fbm(x * freq, 12.34, 4);

  switch (style) {
    case "hills": {
      // soft rounded hills that rise and fall gently, more sun-like mounds
      const e = peakHeight * Math.pow(n, 1.1) + 0.3 * Math.sin(x * 0.04 + 1.7);
      return horizon - e;
    }
    case "dunes": {
      // long windswept dunes: broad swells broken by fine ripples
      const broad = Math.sin(x * 0.021 + 2.3) * 0.5 + 0.5;
      const ripple = noise(x * 0.08, 3.1) * 0.25;
      const e = peakHeight * 0.6 * broad + ripple * 4.0;
      return horizon - e;
    }
    case "city": {
      // blocky skyline of varying heights, mostly flat with sharp steps
      const cell = Math.floor(x / 4.0);
      const seed = hash(cell, 7) * 1.3;
      const h = (0.25 + 0.65 * seed) * peakHeight;
      const wobble = noise(x * 0.6, cell) * 2.5;
      return Math.floor(horizon - h * (1 + wobble * 0.15));
    }
    case "pines": {
      // irregular ridges under fine conifer fuzz, lower than alpine peaks
      const e = peakHeight * 0.55 * Math.pow(n, 1.15) + 0.25 * noise(x * 0.5, 0.9) * peakHeight * 0.5;
      return horizon - e;
    }
    case "peaks":
    default:
      return horizon - peakHeight * Math.pow(n, 1.2);
  }
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
    const style = params.style ?? "peaks";

    const cBase = hexToRgb(params.color ?? "#1c1432");
    const cHigh = hexToRgb(params.highlight ?? "#b23c7c");

    const W = ctx.cols;
    const H = ctx.rows;

    for (let x = 0; x < W; x++) {
      // Calculate ridge curve elevation at column x
      const ridgeY = elevationAt(x, horizon, peakHeight, freq, style, W);

      // Slope derivative for lighting (catch light on the rising faces)
      const n = elevationAt(x, horizon, peakHeight, freq, style, W);
      const nNext = elevationAt(x + 1, horizon, peakHeight, freq, style, W);
      const slope = (nNext - n) * 0.5;
      const lightCatch = smoothstep(-1.5, 2.0, slope);

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
