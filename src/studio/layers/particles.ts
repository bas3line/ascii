/*
 * studio layer: particles
 * Weather and atmospheric particles: multi-depth parallax snow, rain, embers and fireflies.
 * Part of ascii.rest, MIT licensed.
 */
import { clamp, hexToRgb } from "../halftone.ts";
import type {
  LayerDefinition,
  LayerInstance,
  ParamSchema,
  ParamValues,
  RenderContext,
} from "../types.ts";

export const particlesSchema: ParamSchema = {
  type: {
    type: "select",
    label: "particle style",
    default: "snow",
    options: [
      { label: "Snowfall", value: "snow" },
      { label: "Rain / Downpour", value: "rain" },
      { label: "Floating Embers", value: "embers" },
      { label: "Fireflies", value: "fireflies" },
    ],
  },
  density: {
    type: "number",
    label: "particle count",
    default: 120,
    min: 20,
    max: 400,
    step: 10,
  },
  fallSpeed: {
    type: "number",
    label: "speed",
    default: 1.0,
    min: 0.1,
    max: 4.0,
    step: 0.1,
  },
  wind: {
    type: "number",
    label: "wind drift",
    default: 0.3,
    min: -2.0,
    max: 2.0,
    step: 0.1,
  },
  color: {
    type: "color",
    label: "particle ink",
    default: "#f1f5fb",
  },
};

interface Particle {
  x: number;
  y: number;
  depth: number; // 0 (near), 1 (mid), 2 (far)
  phase: number;
}

export class ParticlesLayer implements LayerInstance {
  private particles: Particle[] = [];

  init(ctx: RenderContext, params: ParamValues): void {
    const count = params.density ?? 120;
    this.particles = new Array(count);
    const W = ctx.cols;
    const H = ctx.rows;

    for (let i = 0; i < count; i++) {
      this.particles[i] = {
        x: Math.random() * W,
        y: Math.random() * H,
        depth: Math.floor(Math.random() * 3),
        phase: Math.random() * Math.PI * 2,
      };
    }
  }

  render(
    ctx: RenderContext,
    params: ParamValues,
    bufR: Float32Array,
    bufG: Float32Array,
    bufB: Float32Array,
    bufDepth: Float32Array
  ): void {
    const style = params.type ?? "snow";
    const speed = params.fallSpeed ?? 1.0;
    const wind = params.wind ?? 0.3;
    const cPart = hexToRgb(params.color ?? "#f1f5fb");

    const t = ctx.t * speed;
    const W = ctx.cols;
    const H = ctx.rows;

    // Check if re-init needed due to density change
    const targetCount = params.density ?? 120;
    if (this.particles.length !== targetCount) {
      this.init(ctx, params);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const depthScale = p.depth === 0 ? 1.0 : p.depth === 1 ? 0.65 : 0.4;
      const zBufferVal = p.depth === 0 ? 5.0 : p.depth === 1 ? 25.0 : 60.0;

      let px = 0;
      let py = 0;

      if (style === "snow") {
        // Drifting swaying snowfall
        py = (p.y + t * 14.0 * depthScale) % H;
        px = (p.x + t * wind * 10.0 * depthScale + Math.sin(t * 2.0 + p.phase) * 3.0) % W;
      } else if (style === "rain") {
        // Fast vertical rainfall streaks
        py = (p.y + t * 45.0 * depthScale) % H;
        px = (p.x + t * wind * 20.0 * depthScale) % W;
      } else if (style === "embers") {
        // Rising warm sparks
        py = (H - ((p.y + t * 12.0 * depthScale) % H)) % H;
        px = (p.x + t * wind * 8.0 * depthScale + Math.cos(t * 1.5 + p.phase) * 4.0) % W;
      } else if (style === "fireflies") {
        // Gentle wandering
        px = (p.x + Math.sin(t * 0.8 + p.phase) * 12.0) % W;
        py = (p.y + Math.cos(t * 0.6 + p.phase * 1.3) * 8.0) % H;
      }

      const col = Math.floor((px + W) % W);
      const row = Math.floor((py + H) % H);
      const idx = row * W + col;

      if (bufDepth[idx] > zBufferVal) {
        // Particle is visible in front of background
        const brightness = depthScale * (style === "fireflies" ? 0.5 + 0.5 * Math.sin(t * 4.0 + p.phase) : 1.0);
        bufR[idx] = clamp(bufR[idx] * (1 - brightness) + cPart[0] * brightness);
        bufG[idx] = clamp(bufG[idx] * (1 - brightness) + cPart[1] * brightness);
        bufB[idx] = clamp(bufB[idx] * (1 - brightness) + cPart[2] * brightness);
        bufDepth[idx] = zBufferVal;
      }
    }
  }
}

export const particlesDefinition: LayerDefinition = {
  type: "particles",
  label: "Weather & Atmospheric Particles",
  description: "Snowfall, rain, rising embers and fireflies with 3-plane parallax depth",
  schema: particlesSchema,
  create: () => new ParticlesLayer(),
};
