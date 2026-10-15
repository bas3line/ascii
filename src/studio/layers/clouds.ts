/*
 * studio layer: clouds
 * A heaped, perspective-projected cloud deck seen from below. Wraps over a
 * lattice so it drifts forever, thins toward the zenith, and its undersides
 * glow where they face the horizon light. Part of ascii.rest, MIT licensed.
 */
import { clamp, hexToRgb, smoothstep } from "../halftone.ts";
import { fbm } from "../noise.ts";
import type {
  LayerDefinition,
  LayerInstance,
  ParamSchema,
  ParamValues,
  RenderContext,
} from "../types.ts";

export const cloudsSchema: ParamSchema = {
  horizon: {
    type: "number",
    label: "horizon line",
    default: 56,
    min: 10,
    max: 90,
    step: 1,
  },
  coverage: {
    type: "number",
    label: "cloud coverage",
    default: 0.55,
    min: 0,
    max: 1.0,
    step: 0.05,
  },
  drift: {
    type: "number",
    label: "drift speed",
    default: 1.0,
    min: 0,
    max: 3.0,
    step: 0.1,
  },
  altitude: {
    type: "number",
    label: "cloud altitude",
    default: 1.0,
    min: 0.5,
    max: 2.0,
    step: 0.05,
  },
  density: {
    type: "number",
    label: "heap density",
    default: 1.0,
    min: 0.3,
    max: 3.0,
    step: 0.05,
  },
  softness: {
    type: "number",
    label: "edge softness",
    default: 0.6,
    min: 0,
    max: 1.0,
    step: 0.05,
  },
  lit: {
    type: "number",
    label: "underside glow",
    default: 0.45,
    min: 0,
    max: 1.2,
    step: 0.05,
  },
  baseColor: {
    type: "color",
    label: "cloud shade",
    default: "#1e1640",
  },
  litColor: {
      type: "color",
      label: "lit color",
      default: "#ffcd62",
    },
  };

  const U = 480;
const V = 96;

interface DeckState {
  deck: Float32Array;
  lit: Float32Array;
}

export class CloudsLayer implements LayerInstance {
  private state: DeckState | null = null;
  private horizon: number = 56;

  init(_ctx: RenderContext, params: ParamValues): void {
      const coverage = params.coverage ?? 0.55;
      const density = params.density ?? 1.0;

      this.horizon = params.horizon ?? 56;
      const deck = new Float32Array(U * V);
      const lit = new Float32Array(U * V);

      for (let v = 0; v < V; v++) {
        for (let u = 0; u < U; u++) {
          const q = fbm(u * 0.0125 / density, v * 0.06, 2);
          // wide swaths of heaped cloud, broken a little by a second scale;
          // coverage shifts the whole deck so the threshold admits more or
          // fewer heaps
          const base = fbm(u * 0.04 + q * 1.5, v * 0.3, 5);
          const patch = fbm(u * 0.00625, v * 0.03 + 7, 2);
          const d = base + 0.25 * (patch - 0.5) + (coverage - 0.5);
          const k = v * U + u;
          deck[k] = d;
          // the side of each heap facing down (toward the horizon light) is lit
          lit[k] = clamp(0.5 + (base - fbm(u * 0.04 + q * 1.5, (v + 2) * 0.3, 5)) * 4.5);
        }
      }

      this.state = { deck, lit };
    }

  render(
    ctx: RenderContext,
    params: ParamValues,
    bufR: Float32Array,
    bufG: Float32Array,
    bufB: Float32Array,
    bufDepth: Float32Array
  ): void {
    const state = this.state;
    if (!state) return;

    const horizon = this.horizon;
    const drift = params.drift ?? 1.0;
    const altitude = params.altitude ?? 1.0;
    const softness = params.softness ?? 0.6;
    const glowAmt = params.lit ?? 0.45;

    const cBase = hexToRgb(params.baseColor ?? "#1e1640");
    const cLit = hexToRgb(params.litColor ?? "#ffcd62");

    const t = ctx.t * drift;
    const W = ctx.cols;
    const H = ctx.rows;
    const div = 58 / altitude;

    for (let r = 0; r < horizon; r++) {
      const y = r + 0.5;
      const D = div / (horizon - y + 2.5);
      // clear near the zenith and clear again in the low glow at the horizon
      const far = smoothstep(4.6, 2.8, D) * smoothstep(1.02, 1.7, D);
      if (far <= 0) continue;

      for (let x = 0; x < W; x++) {
        const idx = r * W + x;
        if (bufDepth[idx] <= 10.0) continue;

        const dx = x + 0.5 - W / 2;
        const su = dx * D + t * 72;
        const sv = (D - 0.9) * 10;

        let iu = Math.floor(su);
        const fu = su - iu;
        const iv = Math.floor(sv);
        const fv = sv - iv;
        iu %= U;
        if (iu < 0) iu += U;
        const iu1 = (iu + 1) % U;
        const a0 = iv * U;
        const a1 = a0 + U;

        const dd =
          state.deck[a0 + iu] + (state.deck[a0 + iu1] - state.deck[a0 + iu]) * fu;
        const c =
                  smoothstep(0.5 - softness * 0.12, 0.5 + softness * 0.12, dd) *
          Math.sqrt(far);

        if (c <= 0.01) continue;

        const l =
          state.lit[a0 + iu] + (state.lit[a0 + iu1] - state.lit[a0 + iu]) * fu;
        const glow = clamp(
          Math.pow(smoothstep(0.45, 0.85, l), 1.5) * (0.35 + 0.55 * glowAmt)
        );

        // mix the cloud's own shade toward the lit color by how much its
                // underside faces the horizon light, then blend onto the sky
                const cr = cBase[0] + (cLit[0] - cBase[0]) * glow;
                const cg = cBase[1] + (cLit[1] - cBase[1]) * glow;
                const cb = cBase[2] + (cLit[2] - cBase[2]) * glow;
                bufR[idx] = clamp(bufR[idx] + (cr - bufR[idx]) * c);
                bufG[idx] = clamp(bufG[idx] + (cg - bufG[idx]) * c);
                bufB[idx] = clamp(bufB[idx] + (cb - bufB[idx]) * c);
      }
    }
  }
}

export const cloudsDefinition: LayerDefinition = {
  type: "clouds",
  label: "Cloud Deck",
  description: "Perspective heaped cloud deck, drifting forever with undersides lit toward the horizon",
  schema: cloudsSchema,
  create: () => new CloudsLayer(),
};