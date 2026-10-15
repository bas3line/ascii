/*
 * studio types: the data model, parameter schemas and layer contracts
 * for the ascii.rest scene studio engine.
 * Part of ascii.rest, MIT licensed.
 */
import type { Frame, Meta, Piece } from "../types.ts";

export type ParamType = "number" | "color" | "vec2" | "select" | "boolean";

export interface NumberParamDef {
  type: "number";
  label: string;
  default: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface ColorParamDef {
  type: "color";
  label: string;
  default: string; // hex color string
}

export interface Vec2ParamDef {
  type: "vec2";
  label: string;
  default: [number, number];
  min: [number, number];
  max: [number, number];
  step?: number;
}

export interface SelectParamDef {
  type: "select";
  label: string;
  default: string;
  options: { label: string; value: string }[];
}

export interface BooleanParamDef {
  type: "boolean";
  label: string;
  default: boolean;
}

export type ParamDef =
  | NumberParamDef
  | ColorParamDef
  | Vec2ParamDef
  | SelectParamDef
  | BooleanParamDef;

export type ParamSchema = Record<string, ParamDef>;
export type ParamValues = Record<string, any>;

/** A configured layer instance within a scene specification. */
export interface LayerSpec {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  params: ParamValues;
}

/** Complete serializable definition of a scene. */
export interface SceneSpec {
  name: string;
  note?: string;
  ground: string;
  palette: string[];
  fps?: number;
  halftone?: {
    ramp?: string;
    dither?: "bayer4" | "bayer8" | "none";
    contrast?: number;
  };
  layers: LayerSpec[];
}

/** Context provided to layer instances during rendering. */
export interface RenderContext {
  t: number;
  cols: number;
  rows: number;
  groundRgb: [number, number, number];
  paletteRgb: [number, number, number][];
  nearestColor: (r: number, g: number, b: number) => number;
}

/** An active layer instance capable of rendering into pixel and depth buffers. */
export interface LayerInstance {
  init(ctx: RenderContext, params: ParamValues): void;
  render(
    ctx: RenderContext,
    params: ParamValues,
    bufR: Float32Array,
    bufG: Float32Array,
    bufB: Float32Array,
    bufDepth: Float32Array
  ): void;
}

/** Definition and factory for a layer type in the registry. */
export interface LayerDefinition {
  type: string;
  label: string;
  description: string;
  schema: ParamSchema;
  create(): LayerInstance;
}

/** Live interactive studio session wrapping an active scene and engine state. */
export interface StudioSession {
  spec: SceneSpec;
  piece: Piece;
  setParam(layerId: string, paramKey: string, value: any): void;
  toggleLayer(layerId: string, enabled?: boolean): void;
  updatePalette(palette: string[], ground?: string): void;
  getFrame(t: number): string;
}
