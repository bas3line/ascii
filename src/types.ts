/*
 * The piece contract. A piece module exports `meta` and a default function:
 * the function takes the options and returns `frame(t, env)`, which returns
 * the picture at `t` seconds as one string of `rows` lines of `cols` characters.
 */

export type Category =
  | "scenes"
  | "shapes"
  | "space"
  | "physics"
  | "nature"
  | "creatures"
  | "objects"
  | "generative"
  | "effects"
  | "ui"
  | "data"
  | "type";

export type Options = Record<string, unknown>;

export interface Meta<O extends Options = Options> {
  /** Lowercase display name: "newton's cradle". */
  name: string;
  category: Category;
  /** One lowercase line, at most 72 characters, saying what you see. */
  note: string;
  /** Frame size in cells: every frame is exactly `rows` lines of `cols` characters. */
  cols: number;
  rows: number;
  /** Frames a second; 0 for a still. */
  fps: number;
  /** Defaults for every option the default function takes. */
  options?: O;
  /** True if the picture depends on the real time or date. */
  clock?: boolean;
  /** Up to 64 colours as #rrggbb, indexed by `env.color`; such a piece draws on a canvas. */
  palette?: readonly string[];
  /** The colour behind a coloured piece. */
  ground?: string;
  /** Cell height in cell widths on a canvas: 2, the shape of a character, by default; 1 is square. */
  cell?: 1 | 2;
}

export interface Env {
  /** True when the text is dark on a light ground, so shaded pieces can flip their ramp. */
  paper?: boolean;
  /** For coloured pieces: one palette index a cell, row by row, written by the frame. */
  color?: Uint8Array;
}

/** The picture at `t` seconds of play time. */
export type Frame = (t: number, env?: Env) => string;

/** A piece module, as `import * as donut from ".../donut"` gives it. */
export interface Piece<O extends Options = Options> {
  meta: Meta<O>;
  // A method, so a piece whose options are { text: string } still counts as a Piece.
  default(options?: Partial<O>): Frame;
}
