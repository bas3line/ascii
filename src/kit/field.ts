/*
 * field: ascii art from a formula, the way a shader draws a picture. Give it
 * a function of x, y and t that says what each cell is, and it does the rest:
 * the character from a ramp, colours by value from a few stops (or by a
 * function of your own), ordered dithering between characters, coordinates
 * that keep a circle round on the tall 1:2 cells, and the ramp turned round
 * on a light page so bright still reads as bright. The function returns a
 * brightness, true for solid ink (a shape), or null for nothing there; it can
 * also set at.char and at.color to pick a cell's character and colour itself,
 * so one function draws a whole scene, sky, sun and sea, each in its own
 * colour. A field is a piece in one call, field(), or is drawn into a grid
 * you are drawing already, all of it or a region, with drawField().
 * With a `period`, at.phase runs 0 to 1 through it, so a function of
 * TAU * at.phase loops exactly. A number is light by default, and a light
 * page turns the ramp round; for a glow or anything else on an empty ground,
 * where the number means how much ink, give `invert: false`, or svg()'s
 * light page draws the ground as solid ink.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { TAU, field } from "ascii.rest/kit";
 *
 *   export default field({ name: "sea", ramp: "blocks", colors: ["#0b3d91", "#7fdbff"], period: 2 },
 *     (x, y, t, at) => 0.5 + 0.5 * Math.sin(x * 6 + y * 2 + TAU * at.phase));
 *
 *   export const glow = field({ invert: false, period: 2 }, (x, y, t, at) => Math.exp(-at.r * (3 + Math.sin(TAU * at.phase))));
 */
import type { Options } from "../types.ts";
import {
  EMPTY,
  NONE,
  Palette,
  bayer,
  code,
  colorsOf,
  fail,
  fract,
  piece,
  ramp as rampOf,
  specOf,
  spread,
  type Color,
  type KitPiece,
  type MakerSpec,
  type PaletteLike,
  type PaletteSpec,
  type RampName,
  type Region,
  type Surface,
} from "./core.ts";

/**
 * Where a cell is, besides x and y, for a field's function, and two things the function may set for the cell. One
 * object is reused for every cell of a frame, so read what you need from it and keep nothing of it.
 */
export interface FieldCell<O extends Options = Options> {
  /** The cell's column in the field's region, from 0 at its left. */
  col: number;
  /** The cell's row in the field's region, from 0 at its top. */
  row: number;
  /** 0 to 1 across the region, at the cell's centre: 0.5 is the middle. */
  u: number;
  /** 0 to 1 down the region, at the cell's centre: 0.5 is the middle. */
  v: number;
  /** The distance from the region's centre, in the units of x and y: Math.hypot(x, y). */
  r: number;
  /** The angle from the region's centre, Math.atan2(y, x): 0 points right and TAU / 4 points down, -PI to PI. */
  a: number;
  /** The region's width in cells. */
  cols: number;
  /** The region's height in cells. */
  rows: number;
  /** The region's width in the units of x: x runs from -width / 2 at its left edge to width / 2 at its right. */
  width: number;
  /** The region's height in the units of y: y runs from -height / 2 at its top edge to height / 2 at its bottom. */
  height: number;
  /**
   * How far through `period` the frame is, 0 up to 1, the same for every cell: Math.sin(x * 6 - TAU * at.phase) moves
   * and repeats exactly with the field, so the loop never needs its length written twice. 0 without a period.
   */
  phase: number;
  /** The piece's options, for field(): its defaults with the caller's on top. drawField() gives {}: your drawing has ctx.options. */
  options: O;
  /**
   * Set it inside your function to draw this cell's character yourself instead of the ramp's: one character, " " for
   * a blank that covers what is under it, "" for nothing. The value you return still picks the colour, and null still
   * draws nothing. Read back as undefined at the next cell.
   */
  char?: string;
  /**
   * Set it inside your function to colour this cell yourself: an index into the piece's colours or #rrggbb, found in
   * them, the nearest when it is not one of them. It needs colours to pick from, `palette` or `colors` in field()'s spec
   * or the surface's palette for drawField(), and is not shown in one ink. Read back as undefined at the next cell.
   */
  color?: Color;
}

/**
 * A field: what the cell at x, y is at t seconds. x and y are centred on the region, 0, 0 in its middle, y down. With
 * `aspect` (the default) they share one unit, the shorter side running -1 to 1, so a circle comes out round on the tall
 * cells; without it each axis runs -1 to 1. It returns one of:
 *
 * - a number, the brightness: 0 (no light) to 1 (the most), or from `range`, a value past either end counting as that
 *   end. Light shows as dense characters on a dark page; a light page turns the ramp round (`invert`), so there bright
 *   is little ink and 0 is the densest.
 * - true for solid ink, the ramp's densest character on any page, and false for nothing: a shape, such as
 *   `(x, y, t, at) => at.r < 0.8`, a disc on both pages.
 * - null, or NaN, where there is nothing, such as the sky over a sea or the corners round a ball: the cell is not drawn,
 *   on any page, and what is under it shows.
 */
export type FieldFn<O extends Options = Options> = (x: number, y: number, t: number, at: FieldCell<O>) => number | boolean | null;

/** How a field is shaded: every option has a default that looks right with no tuning. */
export interface FieldOptions<O extends Options = Options> {
  /**
   * The characters from no ink to the most: a name, "standard" (" .:-=+*#%@", the default), "detailed", "donut",
   * "blocks" (" ░▒▓█"), "eighths", "dots", "lines", "stars" or "binary", or two or more characters of your own. A space
   * in it is not drawn, so the field leaves those cells empty and anything under them shows.
   */
  ramp?: RampName | (string & {});
  /**
   * Colour by value: a palette's name such as "ocean" (its colours for each page, faint to strong), colours as #rrggbb
   * from the lowest value to the highest, spread along their fade to `steps` colours; or { light, dark }, stops for
   * each page, each spread to `steps`. Without it (and without `color` or at.color)
   * the field is one ink. Colours follow the value, not the ramp turned round on paper: give { light, dark } to pick
   * colours that read on a light page. field() may take a `palette` too, colours of its own for at.color and `color`
   * to pick, which come after the spread ones. drawField() finds each colour in the surface's palette, the nearest when
   * it is not one of them, and draws none on a surface with no palette.
   */
  colors?: PaletteLike;
  /** How many colours `colors` is spread to: 16. A whole number from 1 to 64, or up to 32 when `colors` is { light, dark }. */
  steps?: number;
  /**
   * Colour by a function of your own instead: it gets the value (0 to 1, after `range` and `gamma`; 1 for true), x, y,
   * t and the cell, and returns a colour: an index into the piece's colours or #rrggbb, found in them. field() needs
   * `palette` (or `colors`) in its spec to pick from. It is not called for cells left empty, for cells whose function
   * set at.color, nor when colours are not shown.
   */
  color?: (value: number, x: number, y: number, t: number, at: FieldCell<O>) => Color;
  /**
   * Ordered 4 by 4 (Bayer) dithering: each cell's value nudged by up to half a step before it is rounded to a
   * character (and a colour), so a smooth slope shows as a fine mix of neighbouring characters instead of hard bands.
   * A character only ever moves to its neighbour on the ramp. false by default.
   */
  dither?: boolean;
  /**
   * Turns the ramp round, the densest character for 0. "auto" (the default) does it on a light page (env.paper): dense
   * characters are bright light on a dark page but dark ink on paper, so bright parts stay bright. true always, false
   * never. Cells where the function returns null are empty, and true is solid ink, whichever way the ramp runs. "auto"
   * suits light, such as a plasma or a lit ball; when your number means how much ink, such as a sea or a glow on an
   * empty ground, false with { light, dark } colours draws it in dark ink on paper.
   */
  invert?: boolean | "auto";
  /**
   * true (the default): x and y share one unit, the shorter side -1 to 1, rows counted at their true height (the
   * surface's aspect, 2 for the usual cell), so circles are round. false: each axis -1 to 1 whatever the shape.
   */
  aspect?: boolean;
  /** The value raised to this power before shading: 1. Above 1 darkens the middle values and sharpens the bright, below 1 lifts them. */
  gamma?: number;
  /**
   * The lowest and highest values your function returns, mapped to 0 and 1 before anything else: [0, 1]. [-1, 1] lets
   * it return a sine as it is; a sum of four sines might be [-4, 4]. High before low turns it round.
   */
  range?: readonly [number, number];
  /** Where in the surface to draw, in cells: all of it by default. Cells outside the surface are left out, the field keeping its shape. */
  region?: Region;
  /**
   * The field's loop in seconds: at.phase runs 0 to 1 through it, and field() sets meta.loop from it, the loop svg()
   * plays, so write the function in TAU * at.phase and it repeats exactly. None by default, at.phase then 0.
   */
  period?: number;
}

/**
 * What field() takes: a piece's spec (all optional, 64 by 24 by default) and the field's options, `period` among them.
 * Its `palette` is colours for at.color and `color` to pick from; with `colors` as well, they come after the spread ones.
 */
export type FieldSpec<O extends Options = Options> = MakerSpec<O> & FieldOptions<O>;

// --- the plan: options checked and worked out once -------------------------------

interface Plan<O extends Options> {
  codes: Uint16Array; // the ramp's characters as char codes
  invert: boolean | "auto";
  dither: boolean;
  aspect: boolean;
  gamma: number;
  lo: number; // value = (returned - lo) * scale
  scale: number;
  region: Region | undefined;
  period: number; // 0 for none
  steps: number;
  palette: PaletteSpec | null; // `colors` spread to `steps`, as a piece's palette takes it
  light: readonly string[] | null; // the spread colours for each page
  dark: readonly string[] | null;
  color: FieldOptions<O>["color"];
  // Colour step to palette index, worked out once a palette and a page: [dark page, paper].
  lut: [Uint8Array, Uint8Array];
  lutFor: [Palette | null, Palette | null];
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
// A value as an error message shows it. JSON can't write a bigint or an object that contains itself, so those are
// named by their kind instead of the message itself throwing.
const show = (v: unknown): string => {
  if (typeof v === "function") return "a function";
  if (typeof v === "bigint") return `${v}n`;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return Array.isArray(v) ? "a list that contains itself" : "an object that contains itself";
  }
};

// Checks every option a field takes, throwing for the first one it can't, and works out what each frame needs.
function plan<O extends Options>(o: FieldOptions<O> | undefined, who: string): Plan<O> {
  if (o === undefined || o === null) o = {};
  else if (typeof o !== "object") fail(`${who} takes its options as an object, such as { ramp: "blocks" }, not ${show(o)}`);
  const chars = rampOf(o.ramp ?? "standard");
  const codes = Uint16Array.from(chars, (ch) => ch.charCodeAt(0));

  const steps = o.steps ?? 16;
  if (!Number.isInteger(steps) || steps < 1 || steps > 64) fail(`steps takes a whole number of colours from 1 to 64, not ${show(steps)}`);
  let palette: PaletteSpec | null = null, light: readonly string[] | null = null, dark: readonly string[] | null = null;
  if (o.colors !== undefined) {
    const c = colorsOf(o.colors, "colors");
    if (!Array.isArray(c) && steps > 32) fail(`steps takes up to 32 when colors has a light and a dark list (64 colours in all), not ${steps}`);
    palette = spread(c, steps);
    if (Array.isArray(palette)) light = dark = palette as readonly string[];
    else ({ light, dark } = palette as { light: readonly string[]; dark: readonly string[] });
  }
  if (o.color !== undefined && typeof o.color !== "function")
    fail(`color takes a function of the value, x, y, t and the cell that returns a colour, such as (v) => (v > 0.5 ? 1 : 0), not ${show(o.color)}`);
  if (o.dither !== undefined && typeof o.dither !== "boolean") fail(`dither takes true or false, not ${show(o.dither)}`);
  const invert = o.invert ?? "auto";
  if (invert !== true && invert !== false && invert !== "auto") fail(`invert takes true, false or "auto", not ${show(invert)}`);
  if (o.aspect !== undefined && typeof o.aspect !== "boolean") fail(`aspect takes true (circles round) or false (each axis -1 to 1), not ${show(o.aspect)}`);
  const gamma = o.gamma ?? 1;
  if (!finite(gamma) || gamma <= 0) fail(`gamma takes a number above 0, such as 1.5, not ${show(gamma)}`);
  const range = o.range ?? [0, 1];
  if (!Array.isArray(range) || range.length !== 2 || !finite(range[0]) || !finite(range[1]) || range[0] === range[1])
    fail(`range takes the lowest and highest values the function returns, two different numbers such as [-1, 1], not ${show(range)}`);
  const region = o.region;
  if (region !== undefined && (region === null || typeof region !== "object" || ![region.x, region.y, region.cols, region.rows].every(finite)))
    fail(`region takes { x, y, cols, rows } in cells, all numbers, not ${show(region)}`);
  const period = o.period;
  if (period !== undefined && !(finite(period) && period > 0)) fail(`period takes the field's loop in seconds, a number above 0, not ${show(period)}`);

  return {
    codes,
    invert,
    dither: o.dither ?? false,
    aspect: o.aspect ?? true,
    gamma,
    lo: range[0],
    scale: 1 / (range[1] - range[0]),
    // A copy: changing the object afterwards doesn't move a piece already made.
    region: region && { x: region.x, y: region.y, cols: region.cols, rows: region.rows },
    period: period ?? 0,
    steps,
    palette,
    light,
    dark,
    color: o.color,
    lut: [new Uint8Array(steps), new Uint8Array(steps)],
    lutFor: [null, null],
  };
}

// --- where each cell is: worked out once a surface and region ----------------------

interface Geometry {
  key: string;
  c0: number; // the visible columns and rows of the region, region-relative: c0 up to c1, r0 up to r1
  c1: number;
  r0: number;
  r1: number;
  width: number; // the region's size in the units of x and y
  height: number;
  x: Float64Array; // by visible column
  u: Float64Array;
  y: Float64Array; // by visible row
  v: Float64Array;
  r: Float64Array; // by visible cell, row by row
  a: Float64Array;
}

// Each surface keeps the last few regions a field was drawn into, so a frame costs no allocation.
const geometries = new WeakMap<Surface, Geometry[]>();
const KEEP = 8;

// Half the region's shorter side in cell widths, the unit of x and y: its true shape is cols wide by rows * k tall.
const unitOf = (cols: number, rows: number, k: number) => Math.min(cols, rows * k) / 2;
// The region's width and height in the units of x and y.
const extent = (cols: number, rows: number, k: number, aspect: boolean): [number, number] =>
  aspect ? [cols / unitOf(cols, rows, k), (rows * k) / unitOf(cols, rows, k)] : [2, 2];

function geometry(s: Surface, x0: number, y0: number, cols: number, rows: number, aspect: boolean): Geometry | null {
  const c0 = Math.max(0, -x0), c1 = Math.min(cols, s.cols - x0);
  const r0 = Math.max(0, -y0), r1 = Math.min(rows, s.rows - y0);
  if (c0 >= c1 || r0 >= r1) return null;
  const key = `${x0} ${y0} ${cols} ${rows} ${aspect ? 1 : 0} ${s.aspect}`;
  let list = geometries.get(s);
  if (!list) geometries.set(s, (list = []));
  for (const g of list) if (g.key === key) return g;

  const w = c1 - c0, h = r1 - r0;
  const k = s.aspect;
  const half = unitOf(cols, rows, k);
  const [width, height] = extent(cols, rows, k, aspect);
  const g: Geometry = {
    key, c0, c1, r0, r1, width, height,
    x: new Float64Array(w), u: new Float64Array(w),
    y: new Float64Array(h), v: new Float64Array(h),
    r: new Float64Array(w * h), a: new Float64Array(w * h),
  };
  for (let c = c0; c < c1; c++) {
    g.x[c - c0] = aspect ? (c + 0.5 - cols / 2) / half : ((c + 0.5) / cols) * 2 - 1;
    g.u[c - c0] = (c + 0.5) / cols;
  }
  for (let r = r0; r < r1; r++) {
    g.y[r - r0] = aspect ? ((r + 0.5 - rows / 2) * k) / half : ((r + 0.5) / rows) * 2 - 1;
    g.v[r - r0] = (r + 0.5) / rows;
  }
  for (let j = 0, i = 0; j < h; j++)
    for (let c = 0; c < w; c++, i++) {
      g.r[i] = Math.hypot(g.x[c], g.y[j]);
      g.a[i] = Math.atan2(g.y[j], g.x[c]);
    }
  list.unshift(g);
  if (list.length > KEEP) list.pop();
  return g;
}

// Colour step to palette index for this surface's palette and page, worked out on the first frame that needs it.
function lutOf<O extends Options>(s: Surface, p: Plan<O>): Uint8Array {
  const side = s.paper ? 1 : 0;
  const palette = s.palette!;
  const lut = p.lut[side];
  if (p.lutFor[side] !== palette) {
    const list = (s.paper ? p.light : p.dark)!;
    for (let k = 0; k < p.steps; k++) lut[k] = palette.index(list[k], s.paper);
    p.lutFor[side] = palette;
  }
  return lut;
}

// --- drawing -----------------------------------------------------------------------

// The field at t into s, as the plan says. `at` is the one cell object handed to the function, filled in for each cell.
function paint<O extends Options>(s: Surface, fn: FieldFn<O>, t: number, p: Plan<O>, at: FieldCell<O>): void {
  const R = p.region;
  const x0 = R ? Math.floor(R.x) : 0, y0 = R ? Math.floor(R.y) : 0;
  const cols = R ? Math.floor(R.cols) : s.cols, rows = R ? Math.floor(R.rows) : s.rows;
  if (cols < 1 || rows < 1) return;
  const g = geometry(s, x0, y0, cols, rows, p.aspect);
  if (!g) return;

  const { codes, steps, lo, scale, gamma, dither } = p;
  const n = codes.length;
  const flip = p.invert === "auto" ? s.paper : p.invert;
  // Colours are only worked out when they will be shown: a palette, and env.color given.
  const shown = !s.mono && s.palette !== null;
  const byFn = shown && p.color ? p.color : null;
  const lut = shown && !byFn && p.light ? lutOf(s, p) : null;
  const { chars, colors } = s;
  const w = g.c1 - g.c0;
  at.cols = cols;
  at.rows = rows;
  at.width = g.width;
  at.height = g.height;
  at.phase = p.period ? fract(t / p.period) : 0;
  at.char = at.color = undefined;

  for (let r = g.r0; r < g.r1; r++) {
    const j = r - g.r0, y = g.y[j], sy = y0 + r;
    at.row = r;
    at.v = g.v[j];
    for (let c = g.c0, i = j * w; c < g.c1; c++, i++) {
      const x = g.x[c - g.c0], sx = x0 + c;
      at.col = c;
      at.u = g.u[c - g.c0];
      at.r = g.r[i];
      at.a = g.a[i];
      const got = fn(x, y, t, at);
      // What the function chose for this cell itself, cleared for the next.
      const own = at.char, tint = at.color;
      if (own !== undefined) at.char = undefined;
      if (tint !== undefined) at.color = undefined;
      let v: number, ink = false;
      if (typeof got === "number") {
        // NaN is nothing, as null: the cell stays as it was, on any page.
        if (got !== got) continue;
        v = (got - lo) * scale;
        v = v > 0 ? (v < 1 ? v : 1) : 0;
        if (gamma !== 1) v = v ** gamma;
      } else if (got === true) (v = 1), (ink = true);
      else if (got === null || got === false) continue;
      else fail(wrong(got));
      const jitter = dither && !ink ? bayer(sx, sy) : 0;
      let ch: number;
      if (own === undefined) {
        let k = Math.floor(v * n + jitter);
        k = k < 0 ? 0 : k >= n ? n - 1 : k;
        ch = codes[flip && !ink ? n - 1 - k : k];
        // A space is not drawn: the cell stays as it was, EMPTY on a fresh frame.
        if (ch === 32) continue;
      } else if ((ch = charOf(own)) === EMPTY) continue;
      const cell = sy * s.cols + sx;
      chars[cell] = ch;
      if (tint !== undefined && shown) colors[cell] = s.resolve(tint);
      else if (lut) {
        let q = Math.floor(v * steps + jitter);
        q = q < 0 ? 0 : q >= steps ? steps - 1 : q;
        colors[cell] = lut[q];
      } else colors[cell] = byFn ? s.resolve(byFn(v, x, y, t, at)) : NONE;
    }
  }
}

const NO_OPTIONS: Options = Object.freeze({});
const NOTHING = "a field's function returns a brightness, a number 0 to 1, true for solid ink, or null where there is nothing, not undefined: does every path through it return a value?";
// What to say when the function returns something it can't.
const wrong = (v: unknown) =>
  v === undefined ? NOTHING : `a field's function returns a brightness, a number 0 to 1, true for solid ink, or null where there is nothing, not ${show(v)}`;

// The char code for at.char, checked: "" is EMPTY, nothing drawn.
const charOf = (ch: unknown) =>
  typeof ch === "string" ? code(ch) : fail(`at.char takes one character as a string, such as "*", or "" for nothing, not ${show(ch)}`);

const cell = <O extends Options>(options: O): FieldCell<O> =>
  ({ col: 0, row: 0, u: 0, v: 0, r: 0, a: 0, cols: 0, rows: 0, width: 2, height: 2, phase: 0, options, char: undefined, color: undefined });

// A surface is anything shaped like one: duck-typed, so a Surface from another copy of the kit still works.
const isSurface = (s: unknown): s is Surface =>
  !!s && typeof s === "object" && (s as Surface).chars instanceof Uint16Array && (s as Surface).colors instanceof Uint8Array &&
  Number.isInteger((s as Surface).cols) && typeof (s as Surface).resolve === "function";

/**
 * Draws a field into a surface you are drawing already, all of it or `region`: for a field behind text, inside a
 * frame, or beside other drawing in one piece(), or several fields in one grid. Cells whose character is a space are
 * left as they were, so a field drawn over something lets it show where the field is dark. Colours, by `colors`,
 * `color` or at.color, are found in the surface's palette; on a surface with no palette, or drawn in one ink, none are
 * written.
 *
 *   piece({ name: "window", cols: 40, rows: 12 }, (t, s) => {
 *     drawField(s, (x, y, t) => 0.5 + 0.5 * Math.sin(x * 4 + t), t, { region: { x: 2, y: 1, cols: 36, rows: 9 } });
 *     s.write(2, 11, "a field in a window");
 *   });
 */
export function drawField(s: Surface, fn: FieldFn, t: number, o?: FieldOptions): void {
  if (!isSurface(s)) fail(`drawField() takes the Surface to draw into first, then the function and t: drawField(s, (x, y, t) => ..., t), not ${show(s)}`);
  if (typeof fn !== "function") fail(`drawField() takes a function of x, y and t that returns a brightness 0 to 1, such as (x, y, t) => 0.5 + 0.5 * Math.sin(x * 6 + t), not ${show(fn)}`);
  paint(s, fn, finite(t) ? t : 0, plan(o, "drawField()"), cell(NO_OPTIONS));
}

// The spread `colors` with the spec's own `palette` after them: one list, or { light, dark } when either is.
function join(spread: PaletteSpec, own: PaletteSpec): PaletteSpec {
  const sides = (p: PaletteSpec): [readonly string[], readonly string[]] => {
    if (Array.isArray(p)) return [p, p];
    const { light, dark } = (p ?? {}) as { light?: unknown; dark?: unknown };
    if (!Array.isArray(light) || !Array.isArray(dark)) fail(`palette takes a list of #rrggbb, or { light, dark }, not ${show(p)}`);
    return [light, dark];
  };
  if (Array.isArray(spread) && Array.isArray(own)) return [...spread, ...own];
  const [a, b] = sides(spread), [c, d] = sides(own);
  return { light: [...a, ...c], dark: [...b, ...d] };
}

/**
 * A piece from a field in one call: a spec (a name, its size, 64 by 24 by default, and the field's options), which may
 * be left out, and a function of x, y and t that says what each cell is. With `colors` the piece is coloured by value;
 * with `palette` and a `color` function or at.color, by your own rule; with both, the palette's colours come after the
 * spread ones; with none it is text in the page's own colour. `period` sets meta.loop and at.phase, so a function of
 * TAU * at.phase repeats exactly and svg() plays one seamless loop. Every frame starts empty: a frame depends only on
 * t, as svg() and reduced motion need. Throws, saying what to change, for anything it can't take, when it is called
 * rather than on the first frame.
 *
 *   export default field((x, y, t, at) => at.r < 0.5 + 0.1 * Math.sin(t * 3));
 *   export const rings = field({ name: "rings", ramp: "dots", range: [-1, 1], period: 2 }, (x, y, t, at) => Math.cos(at.r * 9 - TAU * at.phase));
 */
export function field<O extends Options = Options>(fn: FieldFn<O>): KitPiece<O>;
export function field<O extends Options = Options>(spec: FieldSpec<O>, fn: FieldFn<O>): KitPiece<O>;
export function field<O extends Options = Options>(first: FieldSpec<O> | FieldFn<O>, second?: FieldFn<O>): KitPiece<O> {
  // field(fn): every option its default.
  const [spec, fn] = typeof first === "function" && second === undefined ? [{} as FieldSpec<O>, first] : [first as FieldSpec<O>, second];
  if (typeof fn !== "function")
    fail(`field() takes a function of x, y and t that returns a brightness 0 to 1, after a spec if you give one, such as field({ name: "sea" }, (x, y, t) => 0.5 + 0.5 * Math.sin(x * 6 + t)), not ${show(fn)}`);
  const base = specOf<O>(spec, "field");
  const p = plan<O>(spec, "field()");
  // Without the wipe, a cell left empty would show the frame before, so a frame would depend on the ones played first.
  if (spec.clear !== undefined && spec.clear !== true)
    fail(`field() starts every frame empty, so a frame depends only on t, as svg() and reduced motion need: leave clear out, not ${show(spec.clear)}. For trails, draw with drawField() in a piece() of your own`);
  if (p.color && !p.palette && spec.palette === undefined)
    fail('field()\'s color function picks from the piece\'s colours: give the spec a palette, such as palette: ["#f97316", "#38bdf8"], or colors');
  const own = spec.palette === undefined ? undefined : colorsOf(spec.palette, "palette");
  const palette = p.palette && own !== undefined ? join(p.palette, own) : (p.palette ?? own);

  const made = piece<O>(
    { ...base, palette, loop: p.period || spec.loop },
    {
      setup: (options) => {
        const at = cell(options);
        return (t, s) => paint(s, fn, t, p, at);
      },
    },
  );
  // Called once now, at the centre at t = 0, so a function that returns the wrong thing fails here and not on a page.
  const probe = cell<O>({ ...made.meta.options } as O);
  const cols = p.region ? Math.max(1, Math.floor(p.region.cols)) : base.cols, rows = p.region ? Math.max(1, Math.floor(p.region.rows)) : base.rows;
  const [width, height] = extent(cols, rows, base.cell ?? 2, p.aspect);
  Object.assign(probe, { col: cols >> 1, row: rows >> 1, u: 0.5, v: 0.5, cols, rows, width, height });
  const v = fn(0, 0, 0, probe);
  if (v !== null && typeof v !== "number" && typeof v !== "boolean") fail(wrong(v));
  if (probe.char !== undefined) charOf(probe.char);
  if (probe.color !== undefined) {
    if (palette === undefined)
      fail('at.color picks from the piece\'s colours: give the spec a palette, such as palette: ["#f97316", "#38bdf8"], or colors');
    // A colour that isn't a whole index into the colours or #rrggbb throws now, saying so.
    new Palette(palette).index(probe.color);
  }
  return made;
}
