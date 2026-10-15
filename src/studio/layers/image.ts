/*
 * studio layer: image
 * Photo/raster ingestion layer: depth segmentation, halftone mapping and motion synthesis.
 * Part of ascii.rest, MIT licensed.
 */
import { clamp } from "../halftone.ts";
import type {
  LayerDefinition,
  LayerInstance,
  ParamSchema,
  ParamValues,
  RenderContext,
} from "../types.ts";

export const imageSchema: ParamSchema = {
  horizon: {
    type: "number",
    label: "horizon split",
    default: 50,
    min: 10,
    max: 90,
    step: 1,
  },
  motionType: {
    type: "select",
    label: "motion injection",
    default: "water_ripple",
    options: [
      { label: "Lower Plane Ripple (Water)", value: "water_ripple" },
      { label: "Upper Plane Drift (Clouds)", value: "cloud_drift" },
      { label: "Subtle Micro-Shimmer", value: "shimmer" },
      { label: "Static Halftone", value: "static" },
    ],
  },
  motionSpeed: {
    type: "number",
    label: "motion speed",
    default: 1.0,
    min: 0,
    max: 3.0,
    step: 0.1,
  },
  motionIntensity: {
    type: "number",
    label: "motion amplitude",
    default: 0.08,
    min: 0,
    max: 0.3,
    step: 0.01,
  },
};

export class ImageLayer implements LayerInstance {
  // Pre-decoded 200x100 RGB buffer (values 0..1)
  private pixelBuffer: Float32Array | null = null;

  setImagePixels(rgbFloats: Float32Array): void {
    this.pixelBuffer = rgbFloats;
  }

  init(_ctx: RenderContext, _params: ParamValues): void {}

  render(
    ctx: RenderContext,
    params: ParamValues,
    bufR: Float32Array,
    bufG: Float32Array,
    bufB: Float32Array,
    bufDepth: Float32Array
  ): void {
    if (!this.pixelBuffer) return;

    const horizon = params.horizon ?? 50;
    const motion = params.motionType ?? "water_ripple";
    const speed = params.motionSpeed ?? 1.0;
    const intensity = params.motionIntensity ?? 0.08;

    const t = ctx.t * speed;
    const W = ctx.cols;
    const H = ctx.rows;

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        let srcX = x;
        let srcY = r;

        // Apply procedural motion distortion depending on plane
        if (motion === "water_ripple" && r >= horizon) {
          const depth = (r - horizon + 1) / (H - horizon);
          const wave = Math.sin(x * 0.15 + t * 3.0) * intensity * (1.0 - depth * 0.5);
          srcY = clamp(r + wave * 4.0, horizon, H - 1);
        } else if (motion === "cloud_drift" && r < horizon) {
          const drift = Math.sin(r * 0.2 + t * 0.8) * intensity * 5.0;
          srcX = (x + drift + W) % W;
        } else if (motion === "shimmer") {
          const shimmer = Math.sin(x * 0.3 + r * 0.3 + t * 2.0) * intensity;
          srcX = clamp(x + shimmer * 2.0, 0, W - 1);
        }

        const sampleCol = Math.floor(srcX);
        const sampleRow = Math.floor(srcY);
        const srcIdx = (sampleRow * W + sampleCol) * 3;
        const destIdx = r * W + x;

        const pr = this.pixelBuffer[srcIdx];
        const pg = this.pixelBuffer[srcIdx + 1];
        const pb = this.pixelBuffer[srcIdx + 2];

        // Assign to frame buffer
        bufR[destIdx] = pr;
        bufG[destIdx] = pg;
        bufB[destIdx] = pb;
        bufDepth[destIdx] = r >= horizon ? 30.0 : 70.0;
      }
    }
  }
}

export const imageDefinition: LayerDefinition = {
  type: "image",
  label: "Raster Image & Depth Plane",
  description: "Ingests an image into halftone cells with depth segmentation and procedural motion overlays",
  schema: imageSchema,
  create: () => new ImageLayer(),
};
