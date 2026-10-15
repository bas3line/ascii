/*
 * studio layer: water
 * Fluid plane, Gerstner swell waves, solar glitter streak and reflections.
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

export const waterSchema: ParamSchema = {
  horizon: {
    type: "number",
    label: "horizon row",
    default: 56,
    min: 10,
    max: 90,
    step: 1,
  },
  waveSpeed: {
    type: "number",
    label: "swell velocity",
    default: 1.0,
    min: 0,
    max: 4.0,
    step: 0.1,
  },
  waveChop: {
    type: "number",
    label: "chop amplitude",
    default: 0.08,
    min: 0,
    max: 0.3,
    step: 0.01,
  },
  sunColumn: {
    type: "number",
    label: "sun glitter column",
    default: 134,
    min: 0,
    max: 200,
    step: 1,
  },
  glitter: {
    type: "number",
    label: "glitter intensity",
    default: 1.5,
    min: 0,
    max: 4.0,
    step: 0.1,
  },
  deepColor: {
    type: "color",
    label: "deep water color",
    default: "#0e1230",
  },
  reflectColor: {
    type: "color",
    label: "sky reflection color",
    default: "#ea6a78",
  },
  crestColor: {
    type: "color",
    label: "glitter crest color",
    default: "#ffcd62",
  },
};

// Gerstner harmonic wave components: [dir_x, dir_z, wavenumber, slope, speed, phase]
const HARMONICS = [
  [-0.45, 0.89, 22, 0.07, 2.1, 0.4],
  [0.5, 0.87, 37, 0.06, 2.9, 2.1],
  [-0.15, 0.99, 61, 0.05, 3.7, 4.4],
  [0.3, 0.95, 97, 0.04, 4.6, 1.3],
];

export class WaterLayer implements LayerInstance {
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
    const waveSpeed = params.waveSpeed ?? 1.0;
    const waveChop = params.waveChop ?? 0.08;
    const sunColumn = params.sunColumn ?? 134;
    const glitter = params.glitter ?? 1.5;

    const cDeep = hexToRgb(params.deepColor ?? "#0e1230");
    const cReflect = hexToRgb(params.reflectColor ?? "#ea6a78");
    const cCrest = hexToRgb(params.crestColor ?? "#ffcd62");

    const t = ctx.t * waveSpeed;
    const W = ctx.cols;
    const H = ctx.rows;

    for (let r = horizon; r < H; r++) {
      // Perspective depth scaling: closer to camera as r approaches bottom
      const z = Math.max(0.01, (H - horizon) / (r - horizon + 1));
      const depth = clamp(z / 10.0, 0.1, 1.0);

      for (let x = 0; x < W; x++) {
        const idx = r * W + x;

        // Skip if a foreground object occludes this cell
        if (bufDepth[idx] < 20.0) continue;

        // Perspective normalized coordinates
        const u = ((x - W / 2) * z) / 80.0;
        const v = z * 2.5;

        // Harmonic Gerstner wave elevation & slope
        let crest = 0;
        let slopeX = 0;
        for (let i = 0; i < HARMONICS.length; i++) {
          const h = HARMONICS[i];
          const phase = (h[0] * u + h[1] * v) * h[2] + h[4] * t + h[5];
          const s = Math.sin(phase);
          const c = Math.cos(phase);
          crest += s * h[3] * (waveChop / 0.08);
          slopeX += c * h[0] * h[2] * h[3];
        }

        // Specular glitter streak along sun column
        const dx = Math.abs(x - sunColumn);
        const streakFalloff = Math.exp(-dx / 18.0) * glitter;
        const glint = Math.pow(clamp(crest * 3.0 + slopeX * 0.5 + 0.4), 3.0) * streakFalloff;

        // Sky reflection weighted by Fresnel view angle
        const fresnel = smoothstep(0, H - horizon, r - horizon);
        const refAmount = clamp(0.25 + 0.4 * (1 - fresnel) + crest * 0.2);

        // Blend deep water -> sky reflection -> specular crest glitter
        let red = cDeep[0] * (1 - refAmount) + cReflect[0] * refAmount;
        let green = cDeep[1] * (1 - refAmount) + cReflect[1] * refAmount;
        let blue = cDeep[2] * (1 - refAmount) + cReflect[2] * refAmount;

        if (glint > 0) {
          red = red * (1 - glint) + cCrest[0] * glint;
          green = green * (1 - glint) + cCrest[1] * glint;
          blue = blue * (1 - glint) + cCrest[2] * glint;
        }

        bufR[idx] = clamp(red);
        bufG[idx] = clamp(green);
        bufB[idx] = clamp(blue);
        bufDepth[idx] = 20.0 + depth * 10.0;
      }
    }
  }
}

export const waterDefinition: LayerDefinition = {
  type: "water",
  label: "Ocean Swells & Water Plane",
  description: "Gerstner wave chop, perspective water plane, sky reflections and specular sun glitter",
  schema: waterSchema,
  create: () => new WaterLayer(),
};
