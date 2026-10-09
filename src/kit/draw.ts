/*
 * kit draw: drawing on a grid of cells, with no maths to do. Text that aligns
 * and wraps in a box, or sits centred on a point as a label; lines that pick
 * their own slope characters; boxes in five styles; circles that look round
 * on a 1:2 cell; polygons; and grids or frames stamped over each other. Things
 * that go round take a fraction of a turn, as a clock does: ray() for a hand,
 * around() for a point on a dial. And two finer canvases on the same grid:
 * braille, 2 by 4 dots a cell for smooth lines, curves and plots of a function
 * or a list of numbers, and half blocks, two square pixels a cell for pixel
 * art and sprites. Every drawing takes a colour: an index into the piece's
 * colours, or #rrggbb, found in them.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { circle, piece, ray } from "ascii.rest/kit";
 *
 *   export default piece({ name: "dial", cols: 31, rows: 15, loop: 60 }, (t, s) => {
 *     circle(s, s.cols / 2, s.rows / 2, 14, { char: "auto" });
 *     ray(s, s.cols / 2, s.rows / 2, 12, t / 60);   // once round a minute
 *   });
 */
import { EMPTY, NONE, TAU, and, code, fail, isHex } from "./core.ts";
import type { Color, Region, Surface } from "./core.ts";

// --- what every drawing shares ----------------------------------------------------

/** A point as [x, y]: a column and a row, fractions within the cell. */
export type Point = readonly [number, number];

// The grid a drawing is given, checked by its shape rather than its class, so a grid from another copy of the kit works.
function grid(s: unknown, what: string): Surface {
  const g = s as Surface;
  if (!g || typeof g !== "object" || !(g.chars instanceof Uint16Array) || !(g.colors instanceof Uint8Array) || typeof g.put !== "function")
    fail(`${what}() takes the Surface to draw on first: the grid a drawing is given, (t, s) => { ${what}(s, ...) }`);
  return g;
}

// A colour for this frame as the palette index a cell stores: NONE for none. On a piece in one ink a colour is not
// drawn, but it is still checked, so a typo shows at once rather than when colours are added.
function paint(s: Surface, color: Color | null | undefined): number {
  if (color === undefined || color === null) return NONE;
  if (s.palette) return s.palette.index(color, s.paper);
  if (typeof color === "number" ? !(Number.isInteger(color) && color >= 0) : !isHex(color))
    fail(`a colour takes #rrggbb or an index into the palette, not ${JSON.stringify(color)}`);
  return NONE;
}

// One character to draw with, as its char code: "" is EMPTY, which clears.
function brush(ch: unknown, what: string): number {
  if (ch === "") return EMPTY;
  if (typeof ch !== "string" || [...ch].length !== 1) fail(`${what} takes one character, or "" to clear, not ${JSON.stringify(ch)}`);
  return code(ch);
}

const finite = (...v: number[]) => v.every((n) => typeof n === "number" && Number.isFinite(n));

// Choices as a sentence offers them: "a", "b" or "c".
const or = (words: readonly string[]) => and(words.map((w) => `"${w}"`)).replace(/ and ("[^"]*")$/, " or $1");

// An options object, or nothing.
function opts<T extends object>(o: T | undefined, what: string): Partial<T> {
  if (o === undefined) return {};
  if (o === null || typeof o !== "object") fail(`${what}() takes its options as an object, such as { color: 1 }`);
  return o;
}

// A true or false option, checked.
function yes(v: unknown, name: string, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  if (typeof v !== "boolean") fail(`${name} takes true or false, not ${String(v)}`);
  return v;
}

// A part of the grid to draw in, checked and cut to the grid: all of it when none is given.
function area(s: Surface, region: Region | undefined, what: string): Region {
  if (region === undefined) return s.clip();
  if (!region || typeof region !== "object" || !finite(region.x, region.y, region.cols, region.rows))
    fail(`${what}() takes a region as { x, y, cols, rows } in numbers, not ${JSON.stringify(region)}`);
  return s.clip(region);
}

// The cells of a line, Bresenham's, from the cell of x0, y0 to the cell of x1, y1, into XS and YS; returns how many.
// A line reaching far past a w by h grid is first cut to a margin around it, so a stray coordinate can't run for ever.
let XS = new Int32Array(256), YS = new Int32Array(256);
function trace(x0: number, y0: number, x1: number, y1: number, w: number, h: number): number {
  if (!finite(x0, y0, x1, y1)) return 0;
  if (Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) > 2 * (w + h) + 8) {
    // Liang and Barsky's clip to the grid and two cells round it.
    const dx = x1 - x0, dy = y1 - y0;
    let a = 0, b = 1;
    for (const [p, q] of [[-dx, x0 + 2], [dx, w + 2 - x0], [-dy, y0 + 2], [dy, h + 2 - y0]]) {
      if (p === 0) {
        if (q < 0) return 0;
        continue;
      }
      const r = q / p;
      if (p < 0) a = Math.max(a, r);
      else b = Math.min(b, r);
      if (a > b) return 0;
    }
    [x0, y0, x1, y1] = [x0 + a * dx, y0 + a * dy, x0 + b * dx, y0 + b * dy];
  }
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  x1 = Math.floor(x1);
  y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  if (XS.length < dx - dy + 1) (XS = new Int32Array(dx - dy + 1)), (YS = new Int32Array(dx - dy + 1));
  let err = dx + dy, n = 0;
  for (;;) {
    XS[n] = x0;
    YS[n++] = y0;
    if (x0 === x1 && y0 === y1) return n;
    const e2 = 2 * err;
    if (e2 >= dy) (err += dy), (x0 += sx);
    if (e2 <= dx) (err += dx), (y0 += sy);
  }
}

// The slope characters of a line, by how it climbs: upright, rising, falling, a run along a row it meets the next row
// from, a run lying flat in one row, and a point.
const UP = 124, RISE = 47, FALL = 92, RUN = 95, FLAT = 45, DOT = 42; // | / \ _ - *

// A line of n traced cells drawn with one character, or "auto": "|" when it is within about 14 degrees of upright
// on screen, runs of "_" along each row stepped up with "/" or down with "\" where it crosses more than 1.3 columns a
// row (as analog-clock draws its hands), "-" when it lies in one row, and "/" or "\" a cell between.
function strokeCells(s: Surface, n: number, ch: number | "auto", k: number): void {
  if (ch !== "auto") {
    const col = ch === EMPTY ? NONE : k;
    for (let i = 0; i < n; i++) {
      const j = s.index(XS[i], YS[i]);
      if (j >= 0) s.put(j, ch, col);
    }
    return;
  }
  const dx = XS[n - 1] - XS[0], dy = YS[n - 1] - YS[0];
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const rising = dx > 0 !== dy > 0;
  const runs = ax > 1.3 * ay;
  const upright = ay * s.aspect > 4 * ax;
  for (let i = 0; i < n; i++) {
    const j = s.index(XS[i], YS[i]);
    if (j < 0) continue;
    let c: number;
    if (n === 1) c = DOT;
    else if (upright) c = UP;
    else if (!runs) c = rising ? RISE : FALL;
    else if (!dy) c = FLAT;
    else if (rising) {
      // the cell where the run steps up to the row above, left to right
      const r = dx > 0 ? i + 1 : i - 1;
      c = r >= 0 && r < n && YS[r] !== YS[i] ? RISE : RUN;
    } else {
      // the cell just down from the run in the row above
      const l = dx > 0 ? i - 1 : i + 1;
      c = l >= 0 && l < n && YS[l] !== YS[i] ? FALL : RUN;
    }
    s.put(j, c, k);
  }
}

// A line's brush: "auto", or one character as its code.
const lineBrush = (ch: unknown, what: string): number | "auto" => (ch === undefined || ch === "auto" ? "auto" : brush(ch, what));

// --- text --------------------------------------------------------------------------

/** Where each line of text sits across its box: at the box's left, in its middle, or at its right. */
export type Align = "left" | "center" | "right";
/** Where the lines sit down their box: from its top, in its middle, or at its bottom. */
export type VAlign = "top" | "middle" | "bottom";

export interface TextOptions {
  /** Its colour: an index into the piece's colours or #rrggbb. None by default: the piece's ink. */
  color?: Color;
  /**
   * How each line sits across the box: "left" by default, starting at x; "center", in its middle, an odd column over
   * going on the right; "right", ending at the box's right edge. With no `width` the box runs to the end of the row,
   * so text(s, 0, 0, "title", { align: "center" }) is centred in the top row and text(s, 0, 0, "9:41", { align:
   * "right" }) is flush with the right edge. To centre text on a point instead, use label().
   */
  align?: Align;
  /**
   * The box's width in columns from x, to align and wrap in: the rest of the row by default, from x to the grid's right
   * edge. A line longer than the box is wrapped, or with `wrap: false` cut to it.
   */
  width?: number;
  /**
   * Wrap at spaces to the box's width, a word longer than a line broken across lines: true when `width` is given,
   * false otherwise (a line is then cut where the row ends). Wrapping joins a line's words with one space; "\n" always
   * starts a new line.
   */
  wrap?: boolean;
  /**
   * How the lines sit down the box: "top" by default, the first on row y; "middle", in its middle, an odd row over
   * going below; "bottom", the last on its bottom row. With no `height` the box runs to the grid's bottom edge, so
   * text(s, 0, 0, "hi", { align: "center", valign: "middle" }) is in the middle of the grid.
   */
  valign?: VAlign;
  /** The box's height in rows from y: the rest of the grid by default, from y to its bottom edge. Lines past it are left out. */
  height?: number;
  /** Spaces in the text leave what is under them, rather than covering it: false by default. */
  transparent?: boolean;
}

const ALIGN = ["left", "center", "right"], VALIGN = ["top", "middle", "bottom"];

// A box's size, as a whole number of cells: fractions are taken down.
function size(v: unknown, what: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 1) fail(`${what} takes a number of cells of 1 or more, not ${String(v)}`);
  return Math.floor(v);
}

// Text to write: a string, or a number as it reads, with \r\n as \n. Every character is checked here, before any is
// drawn, so a bad one throws wherever the text lands, on the grid or off it.
const BAD = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\ud800-\udfff]/;
function words(str: unknown, what: string): string {
  if (typeof str === "number") return String(str);
  if (typeof str !== "string") fail(`${what}() takes a string to write, or a number, not ${String(str)}`);
  const t = str.replace(/\r\n?/g, "\n");
  const bad = BAD.exec(t);
  if (bad) code(bad[0]);
  return t;
}

// Writes lines, each from its own column, from row `top`; returns the region they take.
function writeLines(s: Surface, lines: readonly string[], lefts: readonly number[], top: number, k: number, transparent: boolean): Region {
  let left = Infinity, right = -Infinity;
  lines.forEach((line, r) => {
    const lx = lefts[r], len = line.length;
    if (len) (left = Math.min(left, lx)), (right = Math.max(right, lx + len));
    for (let i = 0; i < len; i++) {
      const c = line.charCodeAt(i);
      if (transparent && c === 32) continue;
      const j = s.index(lx + i, top + r);
      if (j >= 0) s.put(j, c, k);
    }
  });
  return left === Infinity ? { x: lefts[0] ?? 0, y: top, cols: 0, rows: lines.length } : { x: left, y: top, cols: right - left, rows: lines.length };
}

// The lines of a text in a box `width` wide: wrapped at spaces, or cut to it.
function layout(str: string, width: number, wrap: boolean): string[] {
  const out: string[] = [];
  for (const para of str.split("\n")) {
    if (!wrap) {
      out.push(para.slice(0, width));
      continue;
    }
    let line = "";
    for (let word of para.split(" ").filter(Boolean)) {
      // a word longer than the box is broken across lines
      while (word.length > width) {
        if (line) out.push(line);
        line = "";
        out.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += " " + word;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Text in a box from x, y, in a colour: a string, or a number as it reads. The box is `width` columns by `height` rows,
 * or by default the rest of the grid from x, y; each line sits across it by `align` and the lines down it by `valign`.
 * Given a `width`, lines wrap to it. "\n" starts a new line. Returns the region its lines take (where they start, how
 * wide and how many), which may reach past the grid's edges, for a frame round it or the next text under it. Throws
 * for a control character such as a tab, or one outside the Basic Multilingual Plane (emoji), which a cell can't hold.
 *
 *   text(s, 2, 1, "hello");                                   // from column 2 of row 1
 *   text(s, 0, 0, "ascii.rest", { align: "center" });         // centred in the top row
 *   const box = text(s, 2, 3, notes, { width: 30, color: 1 }); // wrapped to 30 columns
 *   text(s, 2, box.y + box.rows + 1, "the end");              // and a line under it
 */
export function text(s: Surface, x: number, y: number, str: string | number, o?: TextOptions): Region {
  grid(s, "text");
  const { color, align = "left", valign = "top", width: w, height: h } = opts(o, "text");
  if (!ALIGN.includes(align)) fail(`align takes ${or(ALIGN)}, not ${JSON.stringify(align)}`);
  if (!VALIGN.includes(valign)) fail(`valign takes ${or(VALIGN)}, not ${JSON.stringify(valign)}`);
  const transparent = yes(o?.transparent, "transparent", false);
  const width = w === undefined ? undefined : size(w, "width"), height = h === undefined ? undefined : size(h, "height");
  const wrap = yes(o?.wrap, "wrap", width !== undefined);
  const t = words(str, "text");
  const k = paint(s, color);
  if (!finite(x, y)) return { x: 0, y: 0, cols: 0, rows: 0 };
  const fx = Math.floor(x), fy = Math.floor(y);
  // the box: `width` columns from x, else to the right edge; `height` rows from y, else to the bottom
  const bw = width ?? s.cols - fx, bh = height ?? s.rows - fy;
  if (t === "" || bw < 1 || bh < 1) return { x: fx, y: fy, cols: 0, rows: 0 };
  let lines = layout(t, bw, wrap);
  if (lines.length > bh) lines = lines.slice(0, bh);
  const n = lines.length;
  const top = valign === "top" ? fy : valign === "middle" ? fy + Math.floor((bh - n) / 2) : fy + bh - n;
  const lefts = lines.map((l) => (align === "left" ? fx : align === "center" ? fx + Math.floor((bw - l.length) / 2) : fx + bw - l.length));
  return writeLines(s, lines, lefts, top, k, transparent);
}

/**
 * Text centred on a point, across and down: a number on a dial, a name by a dot, a tag that follows something round.
 * One character lands in the cell x, y is in, as set() would draw it; a longer line has its middle as near to x as
 * whole cells allow, an even one's extra half on the right. "\n" starts a new line, each centred, and the lines
 * together are centred on y the same way. Returns the region it takes, as text() does. `color` is its colour (none by
 * default: the piece's ink); `transparent` lets spaces show what is under them (false by default).
 *
 *   for (let h = 1; h <= 12; h++) label(s, ...around(s, 20.5, 10.5, 15, h / 12), h);   // a dial's numbers
 */
export function label(s: Surface, x: number, y: number, str: string | number, o?: { color?: Color; transparent?: boolean }): Region {
  grid(s, "label");
  const { color } = opts(o, "label");
  const transparent = yes(o?.transparent, "transparent", false);
  const t = words(str, "label");
  const k = paint(s, color);
  if (!finite(x, y) || t === "") return { x: finite(x) ? Math.floor(x) : 0, y: finite(y) ? Math.floor(y) : 0, cols: 0, rows: 0 };
  const lines = t.split("\n");
  // a run of n cells whose middle is nearest v starts at v - n / 2, rounded half up: n = 1 gives floor(v), v's own cell
  const start = (v: number, n: number) => Math.floor(v - n / 2 + 0.5);
  return writeLines(s, lines, lines.map((l) => start(x, l.length)), start(y, lines.length), k, transparent);
}

// --- lines -------------------------------------------------------------------------

export interface LineOptions {
  /**
   * What it is drawn with: "auto" by default, which picks - | / \ and _ by the slope as it goes; or one character as
   * a brush; or "" to clear the cells it crosses.
   */
  char?: string;
  /** Its colour: an index into the piece's colours or #rrggbb. None by default: the piece's ink. */
  color?: Color;
}

/**
 * A straight line from the cell of x0, y0 to the cell of x1, y1, both ends drawn: Bresenham's, so it is one cell
 * thick and has no gaps. With the default "auto" character it picks its own slope characters, | / \ - and runs of _,
 * judged on screen, where a cell is s.aspect (2 by default) times as tall as it is wide.
 *
 *   line(s, 2, 10, 30, 3);                                // auto: ___/ steps up to the right
 *   line(s, 0, 0, 9, 9, { char: "#", color: "#f97316" }); // a brush
 */
export function line(s: Surface, x0: number, y0: number, x1: number, y1: number, o?: LineOptions): void {
  grid(s, "line");
  const { char, color } = opts(o, "line");
  const ch = lineBrush(char, "a line's char");
  const k = paint(s, color);
  const n = trace(x0, y0, x1, y1, s.cols, s.rows);
  if (n) strokeCells(s, n, ch, k);
}

/** Lines through points in turn, each drawn as line() draws; `closed` joins the last back to the first (false by default). */
export function polyline(s: Surface, points: readonly Point[], o?: LineOptions & { closed?: boolean }): void {
  grid(s, "polyline");
  const { char, color } = opts(o, "polyline");
  path(s, checkPoints(points, "polyline"), lineBrush(char, "a polyline's char"), paint(s, color), yes(o?.closed, "closed", false));
}

// Lines through points with a brush and a colour already checked; a single point is a dot.
function path(s: Surface, pts: readonly Point[], ch: number | "auto", k: number, closed: boolean): void {
  if (pts.length === 1) {
    const n = trace(pts[0][0], pts[0][1], pts[0][0], pts[0][1], s.cols, s.rows);
    if (n) strokeCells(s, n, ch, k);
    return;
  }
  const last = closed && pts.length > 2 ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const n = trace(a[0], a[1], b[0], b[1], s.cols, s.rows);
    if (n) strokeCells(s, n, ch, k);
  }
}

function checkPoints(points: unknown, what: string): readonly Point[] {
  if (!Array.isArray(points) || !points.every((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number"))
    fail(`${what}() takes a list of points as [x, y], such as [[0, 0], [10, 4]]`);
  return points as readonly Point[];
}

// --- round things, in turns ----------------------------------------------------------

/**
 * The point `turn` of the way round a circle of radius `r` about cx, cy, as a clock's hand goes: 0 at the top, 0.25 at
 * the right, 0.5 at the bottom, 0.75 at the left, and on round. So h / 12 is the hour h on a dial, and t / 60 goes round
 * once a minute. `r` is in columns (dots or pixels on a canvas), and the rows are scaled so the circle looks round, as
 * circle() draws it. A point that lands exactly between two cells is taken a hair towards the centre, so the cells
 * either side of a dial mirror each other. Give it the grid, or a braille() or pixels() canvas, to draw on.
 *
 *   for (let h = 1; h <= 12; h++) label(s, ...around(s, 20.5, 10.5, 15, h / 12), h);
 */
export function around(on: Surface | Braille | Pixels, cx: number, cy: number, r: number, turn: number): Point {
  const aspect = on && typeof on === "object" ? on.aspect : undefined;
  if (typeof aspect !== "number" || !(aspect > 0)) fail("around() takes the grid, or a braille() or pixels() canvas, the circle is on first, then cx, cy, r and turn");
  const a = turn * TAU, k = r * (1 - 1e-9);
  return [cx + Math.sin(a) * k, cy - (Math.cos(a) * k) / aspect];
}

/**
 * A line from x, y, `length` columns long, pointing `turn` of the way round as a clock's hand does (0 up, 0.25 right,
 * 0.5 down): a hand, a needle, a ray of the sun. Drawn as line() draws it, with "auto" slope characters by default.
 *
 *   ray(s, 20.5, 10.5, 12, t / 60, { color: 1 });   // a second hand, once round a minute
 *   ray(s, 20.5, 10.5, 7, 10 / 12);                 // an hour hand at ten
 */
export function ray(s: Surface, x: number, y: number, length: number, turn: number, o?: LineOptions): void {
  const [x1, y1] = around(grid(s, "ray"), x, y, length, turn);
  line(s, x, y, x1, y1, o);
}

// --- boxes -------------------------------------------------------------------------

/** A box's border: one of `boxes` by name. */
export type BoxStyle = "single" | "double" | "rounded" | "heavy" | "ascii";

/** The borders, 6 characters each: top left, top right, bottom left, bottom right, across, down. */
export const boxes: Record<BoxStyle, string> = {
  single: "┌┐└┘─│",
  double: "╔╗╚╝═║",
  rounded: "╭╮╰╯─│",
  heavy: "┏┓┗┛━┃",
  ascii: "++++-|",
};

export interface RectOptions {
  /**
   * The border: "single" by default, "double", "rounded", "heavy", "ascii", 6 characters of your own as `boxes` lays
   * them out (not all letters, which would be a name spelt wrong), or "none".
   */
  style?: BoxStyle | "none" | (string & {});
  /** The inside's character: false by default, for none, so what is under it shows. With style "none", the whole box. "" clears it. */
  fill?: string | false;
  /** The border's (and title's) colour. None by default: the piece's ink. */
  color?: Color;
  /** The inside's colour: the border's by default. */
  fillColor?: Color;
  /** A title on the top edge, after the corner and one across, with a space either side; cut to fit, and left out if the box is narrower than 7. */
  title?: string;
}

/**
 * A box `w` columns by `h` rows with its top left at x, y: a border in one of five styles or your own, a fill, a title.
 * A box one row tall is a line across; one column wide, a line down.
 *
 *   rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "status" });
 *   rect(s, 4, 2, 10, 4, { style: "none", fill: "░", color: 2 });   // a filled block
 */
export function rect(s: Surface, x: number, y: number, w: number, h: number, o?: RectOptions): void {
  grid(s, "rect");
  const { style = "single", fill, color, fillColor, title } = opts(o, "rect");
  let edges: number[] | null = null;
  if (style !== "none") {
    const chars = typeof style === "string" ? (Object.hasOwn(boxes, style) ? boxes[style as BoxStyle] : style) : "";
    // six letters are a name spelt wrong, such as "dotted", rather than a border of your own
    if ([...chars].length !== 6 || /^[a-z]+$/i.test(chars))
      fail(`style takes ${or([...Object.keys(boxes), "none"])}, or 6 characters of your own (top left, top right, bottom left, bottom right, across, down), not ${JSON.stringify(style)}`);
    edges = [...chars].map(code);
  }
  const f = fill === undefined || fill === false ? null : brush(fill, "fill");
  if (title !== undefined && typeof title !== "string") fail(`title takes a string, not ${String(title)}`);
  const k = paint(s, color), fk = fillColor === undefined ? k : paint(s, fillColor);
  if (!finite(x, y, w, h)) return;
  x = Math.floor(x);
  y = Math.floor(y);
  w = Math.floor(w);
  h = Math.floor(h);
  if (w < 1 || h < 1) return;
  const put = (cx: number, cy: number, c: number, col: number) => {
    const j = s.index(cx, cy);
    if (j >= 0) s.put(j, c, c === EMPTY ? NONE : col);
  };
  if (f !== null) {
    const inset = edges ? 1 : 0;
    const r = s.clip({ x: x + inset, y: y + inset, cols: w - 2 * inset, rows: h - 2 * inset });
    for (let cy = r.y; cy < r.y + r.rows; cy++) for (let cx = r.x; cx < r.x + r.cols; cx++) put(cx, cy, f, fk);
  }
  if (edges) {
    const [tl, tr, bl, br, across, down] = edges;
    if (h === 1) for (let i = 0; i < w; i++) put(x + i, y, across, k);
    else if (w === 1) for (let i = 0; i < h; i++) put(x, y + i, down, k);
    else {
      for (let i = 1; i < w - 1; i++) {
        put(x + i, y, across, k);
        put(x + i, y + h - 1, across, k);
      }
      for (let i = 1; i < h - 1; i++) {
        put(x, y + i, down, k);
        put(x + w - 1, y + i, down, k);
      }
      put(x, y, tl, k);
      put(x + w - 1, y, tr, k);
      put(x, y + h - 1, bl, k);
      put(x + w - 1, y + h - 1, br, k);
    }
  }
  // " title ", leaving the corner and one across at each end; cut with an ellipsis when it is too long
  const room = w - 6;
  if (title && room >= 1) {
    const t = title.length > room ? (room > 1 ? title.slice(0, room - 1) + "…" : title.slice(0, 1)) : title;
    const label = ` ${t} `;
    for (let i = 0; i < label.length; i++) put(x + 2 + i, y, code(label[i]), k);
  }
}

// --- circles, ellipses and polygons ----------------------------------------------------

export interface ShapeOptions {
  /**
   * The outline's character: "*" by default; "auto" draws it as a line's "auto" does, runs of _ where it is flat
   * stepped with / and \, and | where it is steep; "" clears the outline's cells.
   */
  char?: string;
  /** The inside's character: false by default, for none, so what is under it shows. "" clears it. */
  fill?: string | false;
  /** The outline's colour. None by default: the piece's ink. */
  color?: Color;
  /** The inside's colour: the outline's by default. */
  fillColor?: Color;
}

// The outline's cells of the ellipse being drawn, over its box on the grid; grown as needed, never shrunk.
let EDGE = new Uint8Array(1024);

// The cells of an ellipse on a w by h grid: visit(x, y, edge, slope) for each. The outline (edge true) is the cell the
// curve passes through in each column where it is flatter than a diagonal, and in each row where it is steeper, as the
// midpoint algorithm draws it: one cell thick, no gaps, no lone cell at the top. On an exact cell boundary it takes
// the cell inside, so an ellipse centred on a cell's centre is symmetric about it. The inside (edge false, visited
// only when `inside` is true) is every other cell whose centre is inside. A tiny ellipse is the cell its centre is in.
// Given the grid's `aspect`, `slope` is the outline's character as a line's "auto" draws it: runs of _ along the rows
// where it is flat, stepped with / and \, and | or a diagonal where it is steep.
function ellipseCells(w: number, h: number, cx: number, cy: number, rx: number, ry: number, inside: boolean, visit: (x: number, y: number, edge: boolean, slope: number) => void, aspect = 0): void {
  if (!finite(cx, cy, rx, ry) || rx <= 0 || ry <= 0) return;
  const i0 = Math.max(0, Math.floor(cx - rx) - 1), i1 = Math.min(w - 1, Math.ceil(cx + rx));
  const j0 = Math.max(0, Math.floor(cy - ry) - 1), j1 = Math.min(h - 1, Math.ceil(cy + ry));
  if (i0 > i1 || j0 > j1) return;
  const bw = i1 - i0 + 1, n = bw * (j1 - j0 + 1);
  if (EDGE.length < n) EDGE = new Uint8Array(n);
  const edge = EDGE;
  edge.fill(0, 0, n);
  // 1 for a cell of a run along a row, where the curve is flat; 2 for one where it is steep
  const mark = (i: number, j: number, kind: number) => {
    if (i >= i0 && i <= i1 && j >= j0 && j <= j1) edge[(j - j0) * bw + i - i0] |= kind;
  };
  const has = (i: number, j: number) => i >= i0 && i <= i1 && j >= j0 && j <= j1 && edge[(j - j0) * bw + i - i0] !== 0;
  for (let i = i0; i <= i1; i++) {
    const x = i + 0.5 - cx;
    if (x * x > rx * rx) continue;
    const yo = ry * Math.sqrt(1 - (x * x) / (rx * rx));
    if (ry * ry * Math.abs(x) <= rx * rx * yo) {
      mark(i, Math.floor(cy - yo), 1);
      mark(i, Math.ceil(cy + yo) - 1, 1);
    }
  }
  for (let j = j0; j <= j1; j++) {
    const y = j + 0.5 - cy;
    if (y * y > ry * ry) continue;
    const xo = rx * Math.sqrt(1 - (y * y) / (ry * ry));
    if (rx * rx * Math.abs(y) <= ry * ry * xo) {
      mark(Math.floor(cx - xo), j, 2);
      mark(Math.ceil(cx + xo) - 1, j, 2);
    }
  }
  let any = false;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const e = edge[(j - j0) * bw + i - i0];
      if (e) {
        any = true;
        let c = 0;
        // in a run, the cell just down from the run on its left steps with \, the one stepping up to the right with /
        if (aspect && e & 1) c = !has(i - 1, j) && has(i - 1, j - 1) ? FALL : !has(i + 1, j) && has(i + 1, j - 1) ? RISE : RUN;
        else if (aspect) c = tangentChar(i, j, cx, cy, rx, ry, aspect);
        visit(i, j, true, c);
      } else if (inside) {
        const u = (i + 0.5 - cx) / rx, v = (j + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) visit(i, j, false, 0);
      }
    }
  const i = Math.floor(cx), j = Math.floor(cy);
  if (!any && i >= i0 && i <= i1 && j >= j0 && j <= j1) visit(i, j, true, DOT);
}

// Where an ellipse is steep, its outline's character at a cell for "auto": | within about 23 degrees of upright on
// screen, else / or \, from the tangent at the cell's centre.
function tangentChar(x: number, y: number, cx: number, cy: number, rx: number, ry: number, aspect: number): number {
  // the normal in cells, then on screen, where rows are `aspect` times as tall; the tangent turns it a quarter
  const nx = (x + 0.5 - cx) / (rx * rx), ny = (y + 0.5 - cy) / (ry * ry) / aspect;
  const tx = -ny, ty = nx;
  if (Math.abs(ty) > 2.4 * Math.abs(tx)) return UP;
  return tx > 0 !== ty > 0 ? RISE : FALL;
}

function shape(s: Surface, cx: number, cy: number, rx: number, ry: number, o: ShapeOptions | undefined, what: string): void {
  const { char = "*", fill, color, fillColor } = opts(o, what);
  const ch = char === "auto" ? "auto" : brush(char, `a ${what}'s char`);
  const f = fill === undefined || fill === false ? null : brush(fill, "fill");
  const k = paint(s, color), fk = fillColor === undefined ? k : paint(s, fillColor);
  ellipseCells(
    s.cols,
    s.rows,
    cx,
    cy,
    rx,
    ry,
    f !== null,
    (x, y, edge, slope) => {
      const j = y * s.cols + x;
      if (edge) {
        const c = ch === "auto" ? slope : ch;
        s.put(j, c, c === EMPTY ? NONE : k);
      } else s.put(j, f!, f === EMPTY ? NONE : fk);
    },
    ch === "auto" ? s.aspect : 0,
  );
}

/**
 * A circle that looks round: centred at cx, cy with a radius of `r` columns, its rows scaled by the cell's shape
 * (s.aspect, 2 by default), so r 8 is about 16 columns and 8 rows across. Its outline is the cell the curve passes
 * through in each column (or row, where it is steep): one cell thick, no gaps. Its fill is every other cell whose
 * centre is inside. circle(s, s.cols / 2, s.rows / 2, 8) is centred in the grid, whatever its size. A circle too
 * small to reach a cell's centre is the cell it is in.
 *
 *   circle(s, 20, 10, 9, { char: "o", fill: "·", fillColor: 2 });
 *   circle(s, s.cols / 2, s.rows / 2, 16, { char: "auto" });   // a clock face: ___/ and \___ round the top and bottom, | at the sides
 */
export function circle(s: Surface, cx: number, cy: number, r: number, o?: ShapeOptions): void {
  grid(s, "circle");
  shape(s, cx, cy, r, r / s.aspect, o, "circle");
}

/** An ellipse centred at cx, cy, `rx` columns and `ry` rows from its centre to its edge; otherwise as circle(). */
export function ellipse(s: Surface, cx: number, cy: number, rx: number, ry: number, o?: ShapeOptions): void {
  grid(s, "ellipse");
  shape(s, cx, cy, rx, ry, o, "ellipse");
}

/**
 * A polygon through points, closed: its outline as lines (char "*" by default; "auto" for slope characters), and with
 * `fill`, its inside by the even-odd rule, a cell inside when its centre is, so a star's middle stays empty.
 *
 *   polygon(s, [[4, 10], [16, 1], [28, 10]], { char: "auto", fill: ":" });   // a tent
 */
export function polygon(s: Surface, points: readonly Point[], o?: ShapeOptions): void {
  grid(s, "polygon");
  const { char = "*", fill, color, fillColor } = opts(o, "polygon");
  const pts = checkPoints(points, "polygon");
  const ch = lineBrush(char, "a polygon's char");
  const f = fill === undefined || fill === false ? null : brush(fill, "fill");
  const k = paint(s, color), fk = fillColor === undefined ? k : paint(s, fillColor);
  if (f !== null && pts.length > 2 && pts.every((p) => finite(p[0], p[1]))) {
    const ys = pts.map((p) => p[1]);
    const j0 = Math.max(0, Math.floor(Math.min(...ys))), j1 = Math.min(s.rows - 1, Math.ceil(Math.max(...ys)));
    const xs: number[] = [];
    for (let j = j0; j <= j1; j++) {
      const yc = j + 0.5;
      xs.length = 0;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        // each edge counted once at a corner: it crosses the row's centre if it starts on or below it and ends above, or the other way
        if (ay <= yc !== by <= yc) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let p = 0; p + 1 < xs.length; p += 2) {
        const i0 = Math.max(0, Math.ceil(xs[p] - 0.5)), i1 = Math.min(s.cols - 1, Math.ceil(xs[p + 1] - 0.5) - 1);
        for (let i = i0; i <= i1; i++) s.put(j * s.cols + i, f, f === EMPTY ? NONE : fk);
      }
    }
  }
  path(s, pts, ch, k, true);
}

// --- stamping ------------------------------------------------------------------------

export interface StampOptions {
  /**
   * The character that lets what is under it show, besides an EMPTY cell: " " by default, so a frame read back from a
   * piece lays over another; null for none, so spaces cover what is under them.
   */
  mask?: string | null;
  /** One colour for everything stamped. Without, a grid's own colours are kept, found in this piece's colours if it has others. */
  color?: Color;
  /** A grid's colours mapped to this one's: map[i] for its colour i, as mergePalettes() makes. */
  map?: ArrayLike<number>;
}

// Two palettes the same, so a grid's colours need no mapping.
const samePalette = (a: Surface["palette"], b: Surface["palette"]) =>
  a === b || (!!a && !!b && a.colors.length === b.colors.length && a.colors.every((c, i) => c.toLowerCase() === b.colors[i].toLowerCase()));

/**
 * Another grid, or a block of text such as a frame, laid over this one with its top left at x, y. Its EMPTY cells and
 * its `mask` character (a space by default) let this one show through. A grid keeps its colours: as they are when it
 * has this grid's palette, through `map` when given, else each found in this grid's colours (the nearest for the
 * page's theme); on a grid with no colours they are left out.
 *
 *   stamp(s, "  /\\_/\\\n ( o.o )\n  > ^ <", 10, 4);   // a cat over whatever is drawn
 */
export function stamp(s: Surface, src: Surface | string, x: number, y: number, o?: StampOptions): void {
  grid(s, "stamp");
  const { mask = " ", color, map } = opts(o, "stamp");
  if (mask !== null && (typeof mask !== "string" || mask.length > 1)) fail(`mask takes one character, or null for none, not ${JSON.stringify(mask)}`);
  if (map !== undefined && (map === null || typeof map !== "object" || typeof (map as ArrayLike<number>).length !== "number"))
    fail("map takes a list of palette indices, one for each of the grid's colours, as mergePalettes() makes");
  const m = mask === null || mask === "" ? -1 : mask.charCodeAt(0);
  const k = color === undefined ? -1 : paint(s, color);
  if (typeof src === "string") {
    // every character is checked before any is drawn, wherever the text lands
    const lines = src.replace(/\r\n?/g, "\n").split("\n").map((l) => Array.from(l, (ch) => code(ch)));
    if (!finite(x, y)) return;
    x = Math.floor(x);
    y = Math.floor(y);
    lines.forEach((l, r) => {
      for (let c = 0; c < l.length; c++) {
        if (l[c] === m) continue;
        const j = s.index(x + c, y + r);
        if (j >= 0) s.put(j, l[c], k < 0 ? NONE : k);
      }
    });
    return;
  }
  const g = src as Surface;
  if (!g || typeof g !== "object" || !(g.chars instanceof Uint16Array) || !(g.colors instanceof Uint8Array))
    fail("stamp() takes a Surface or a string of text to lay over the grid");
  if (!finite(x, y)) return;
  x = Math.floor(x);
  y = Math.floor(y);
  let to: ArrayLike<number> | null = map ?? null;
  if (!to && k < 0 && s.palette && g.palette && !samePalette(s.palette, g.palette)) {
    const pal = s.palette, from = g.palette.colors;
    to = from.map((c) => pal.index(c, s.paper));
  }
  for (let r = Math.max(0, -y); r < g.rows && r + y < s.rows; r++)
    for (let c = Math.max(0, -x); c < g.cols && c + x < s.cols; c++) {
      const i = r * g.cols + c, ch = g.chars[i];
      if (ch === EMPTY || ch === m) continue;
      const col = g.colors[i];
      s.put((r + y) * s.cols + c + x, ch, k >= 0 ? k : !s.palette || col === NONE ? NONE : to ? (to[col] ?? NONE) : col);
    }
}

// --- braille --------------------------------------------------------------------------

/** What plot() takes besides the curve. */
export interface PlotOptions {
  /** The x the left edge stands for, given a function: 0 by default. */
  x0?: number;
  /** The x the right edge stands for, given a function: TAU by default, so Math.sin is one whole wave across. */
  x1?: number;
  /** The value at the bottom row: -1 by default for a function; for a list, its smallest number. */
  y0?: number;
  /** The value at the top row: 1 by default for a function; for a list, its largest number. */
  y1?: number;
  /** The curve's colour. None by default: each cell keeps the colour it has. */
  color?: Color;
}

/**
 * A braille canvas: 2 by 4 dots a cell (U+2800 to U+28FF), for smooth lines, curves and plots. Dots are square on a
 * cell twice as tall as it is wide. Coordinates are in dots from the top left of its region; fractions are taken down,
 * and dots outside are left out. Draw on it, then call draw() to write it into the grid.
 */
export interface Braille {
  /** Dots across: 2 a column of its region. */
  readonly width: number;
  /** Dots down: 4 a row of its region. */
  readonly height: number;
  /** A dot's height in its widths: 1 on the usual 1:2 cell, so circles are round; 0.5 on a square grid. around() reads it. */
  readonly aspect: number;
  /**
   * Puts a dot at x, y. With a colour, the cell the dot is in takes it; without, that cell keeps the colour the canvas
   * last gave it (none at first: the piece's ink). Every drawing below takes its colour the same way.
   */
  set(x: number, y: number, color?: Color): void;
  /** Takes the dot at x, y away. */
  unset(x: number, y: number): void;
  /** Puts a dot at x, y if there is none, else takes it away. */
  toggle(x: number, y: number): void;
  /** True if there is a dot at x, y. */
  get(x: number, y: number): boolean;
  /** A line of dots from x0, y0 to x1, y1, both ends set: Bresenham's. */
  line(x0: number, y0: number, x1: number, y1: number, color?: Color): void;
  /** A line of dots from x, y, `length` dots long, `turn` of the way round as a clock's hand goes (0 up, 0.25 right), as ray() draws on the grid. */
  ray(x: number, y: number, length: number, turn: number, color?: Color): void;
  /** A round circle of radius r dots at cx, cy, its outline one dot thick; `fill: true` makes it a disc (false by default). */
  circle(cx: number, cy: number, r: number, o?: { fill?: boolean; color?: Color }): void;
  /** A rectangle w by h dots from x, y, its edge one dot thick; `fill: true` sets all of it (false by default). */
  rect(x: number, y: number, w: number, h: number, o?: { fill?: boolean; color?: Color }): void;
  /**
   * A curve across the whole canvas, scaled to fit, its points joined so it has no gaps. Give it a function, y = f(x)
   * for x from x0 to x1 (0 to TAU by default), drawn so y0 (-1) is the bottom row and y1 (1) the top; or a list of
   * numbers, spread evenly from the left edge to the right, its smallest at the bottom and its largest at the top
   * unless y0 and y1 say otherwise. Past y0 and y1 the curve goes off the canvas and is cut where it leaves; a value
   * that is not a number (NaN, Infinity) leaves a gap.
   *
   *   b.plot(Math.sin);                           // one wave across
   *   b.plot([3, 5, 2, 8, 6, 9], { color: 1 });   // a list of numbers, scaled for you
   */
  plot(f: ((x: number) => number) | readonly number[], o?: PlotOptions): void;
  /** Takes every dot and colour away. */
  clear(): void;
  /** Writes the dots into the grid, a braille character a cell. A cell with no dots is left as it was. */
  draw(): void;
}

// A dot's bit in its cell's braille character, by its column and row in the cell: dots 1 2 3 7 down the left, 4 5 6 8
// down the right, dot 1 the lowest bit.
const BITS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];

// Checks a fill-and-colour options object for a canvas shape.
function canvasOpts(o: { fill?: boolean; color?: Color } | undefined, what: string): { fill: boolean; color: Color | undefined } {
  const { color } = opts(o, what);
  return { fill: yes(o?.fill, `${what}'s fill`, false), color };
}

class BrailleCanvas implements Braille {
  readonly width: number;
  readonly height: number;
  readonly aspect: number;
  #s: Surface;
  #r: Region;
  #bits: Uint8Array;
  #ink: Uint8Array;

  constructor(s: Surface, r: Region) {
    this.#s = s;
    this.#r = r;
    this.width = r.cols * 2;
    this.height = r.rows * 4;
    // a dot is half a cell across and a quarter down
    this.aspect = s.aspect / 2;
    this.#bits = new Uint8Array(r.cols * r.rows);
    this.#ink = new Uint8Array(r.cols * r.rows).fill(NONE);
  }

  // A dot by its whole coordinates, with a resolved colour, or -1 to keep the cell's.
  #dot(x: number, y: number, k: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y >> 2) * this.#r.cols + (x >> 1);
    this.#bits[i] |= BITS[x & 1][y & 3];
    if (k >= 0) this.#ink[i] = k;
  }

  #k(color: Color | undefined): number {
    return color === undefined || color === null ? -1 : paint(this.#s, color);
  }

  set(x: number, y: number, color?: Color): void {
    const k = this.#k(color);
    if (finite(x, y)) this.#dot(Math.floor(x), Math.floor(y), k);
  }

  unset(x: number, y: number): void {
    if (!this.get(x, y)) return;
    x = Math.floor(x);
    y = Math.floor(y);
    this.#bits[(y >> 2) * this.#r.cols + (x >> 1)] &= ~BITS[x & 1][y & 3];
  }

  toggle(x: number, y: number): void {
    if (this.get(x, y)) this.unset(x, y);
    else this.set(x, y);
  }

  get(x: number, y: number): boolean {
    if (!finite(x, y)) return false;
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return (this.#bits[(y >> 2) * this.#r.cols + (x >> 1)] & BITS[x & 1][y & 3]) !== 0;
  }

  line(x0: number, y0: number, x1: number, y1: number, color?: Color): void {
    const k = this.#k(color);
    const n = trace(x0, y0, x1, y1, this.width, this.height);
    for (let i = 0; i < n; i++) this.#dot(XS[i], YS[i], k);
  }

  ray(x: number, y: number, length: number, turn: number, color?: Color): void {
    const [x1, y1] = around(this, x, y, length, turn);
    this.line(x, y, x1, y1, color);
  }

  circle(cx: number, cy: number, r: number, o?: { fill?: boolean; color?: Color }): void {
    const { fill, color } = canvasOpts(o, "circle");
    const k = this.#k(color);
    ellipseCells(this.width, this.height, cx, cy, r, r / this.aspect, fill, (x, y) => this.#dot(x, y, k));
  }

  rect(x: number, y: number, w: number, h: number, o?: { fill?: boolean; color?: Color }): void {
    const { fill, color } = canvasOpts(o, "rect");
    const k = this.#k(color);
    boxDots(x, y, w, h, fill, (dx, dy) => this.#dot(dx, dy, k), this.width, this.height);
  }

  plot(f: ((x: number) => number) | readonly number[], o?: PlotOptions): void {
    const list = Array.isArray(f) ? (f as readonly number[]) : null;
    if (!list && typeof f !== "function") fail("plot() takes a function of x, such as Math.sin or (x) => x * x, or a list of numbers");
    const { x0 = 0, x1 = TAU, color } = opts(o, "plot");
    let { y0, y1 } = opts(o, "plot");
    for (const [v, name] of [[x0, "x0"], [x1, "x1"], [y0 ?? 0, "y0"], [y1 ?? 0, "y1"]] as const)
      if (typeof v !== "number" || !Number.isFinite(v)) fail(`plot's ${name} takes a number, not ${String(v)}`);
    const k = this.#k(color);
    if (list && (y0 === undefined || y1 === undefined)) {
      // a list's range is its own, its smallest number to its largest
      let lo = Infinity, hi = -Infinity;
      for (const v of list) if (typeof v === "number" && Number.isFinite(v)) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
      if (lo === Infinity) return;
      if (lo === hi) (lo -= 1), (hi += 1);
      y0 ??= lo;
      y1 ??= hi;
    }
    y0 ??= -1;
    y1 ??= 1;
    if (y0 === y1) fail(`plot's y0 and y1 take two different numbers, the values at the bottom and the top, not ${y0} and ${y1}`);
    const w = this.width, h = this.height, n = list ? list.length : w;
    let px = 0, py = NaN;
    for (let i = 0; i < n; i++) {
      const v = list ? list[i] : (f as (x: number) => number)(x0 + ((x1 - x0) * i) / Math.max(1, w - 1));
      const x = list ? (n > 1 ? Math.round((i * (w - 1)) / (n - 1)) : 0) : i;
      const y = typeof v === "number" && Number.isFinite(v) ? Math.round(((y1 - v) / (y1 - y0)) * (h - 1)) : NaN;
      if (Number.isFinite(y)) {
        // joined to the last point, so a steep stretch has no gaps
        const m = Number.isFinite(py) ? trace(px, py, x, y, w, h) : trace(x, y, x, y, w, h);
        for (let d = 0; d < m; d++) this.#dot(XS[d], YS[d], k);
      }
      px = x;
      py = y;
    }
  }

  clear(): void {
    this.#bits.fill(0);
    this.#ink.fill(NONE);
  }

  draw(): void {
    const s = this.#s, { x, y, cols, rows } = this.#r;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, b = this.#bits[i];
        if (b) s.put((y + r) * s.cols + x + c, 0x2800 + b, this.#ink[i]);
      }
  }
}

// The cells of a w by h rectangle from x, y on a grid of gw by gh: its edge, or all of it.
function boxDots(x: number, y: number, w: number, h: number, fill: boolean, dot: (x: number, y: number) => void, gw: number, gh: number): void {
  if (!finite(x, y, w, h)) return;
  x = Math.floor(x);
  y = Math.floor(y);
  w = Math.floor(w);
  h = Math.floor(h);
  for (let j = Math.max(0, y); j < Math.min(gh, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(gw, x + w); i++) if (fill || i === x || j === y || i === x + w - 1 || j === y + h - 1) dot(i, j);
}

/**
 * A braille canvas on the grid, or on a region of it: 2 by 4 dots a cell, for lines, curves and plots far smoother
 * than whole characters. Draw on it, then call draw(). Making one is cheap: make it in the drawing, each frame.
 *
 *   const b = braille(s);
 *   b.plot((x) => Math.sin(x + t), { color: 1 });
 *   b.circle(b.width / 2, b.height / 2, 20);
 *   b.draw();
 */
export function braille(s: Surface, region?: Region): Braille {
  grid(s, "braille");
  return new BrailleCanvas(s, area(s, region, "braille"));
}

// --- half blocks -------------------------------------------------------------------------

/** What sprite() takes besides the art, its colours and where it goes. */
export interface SpriteOptions {
  /**
   * How many frames the art holds side by side, a sprite sheet: 1 by default. With 2, the left half of every row is
   * the first frame and the right half the second. A list of drawings is cut the same way, each in turn.
   */
  frames?: number;
  /**
   * Which frame to draw: a number that counts up, taken down to a whole one and round the frames, so `frame: t * 4`
   * shows four frames a second, over and over. 0 by default.
   */
  frame?: number;
  /**
   * Pixels past an edge come back in at the opposite one, so a sprite at x = t * 12 walks off the right and back on at
   * the left, for ever, with no sums to do: false by default.
   */
  wrap?: boolean;
}

/**
 * A half-block canvas: two square pixels a cell, the upper and the lower half, for pixel art. A cell can hold one
 * colour, so where both halves are lit in different colours the cell is a full block in the upper one. Coordinates
 * are in pixels from the top left of its region; fractions are taken down, and pixels outside are left out. Draw on
 * it, then call draw() to write it into the grid.
 */
export interface Pixels {
  /** Pixels across: one a column of its region. */
  readonly width: number;
  /** Pixels down: two a row of its region. */
  readonly height: number;
  /** A pixel's height in its widths: 1 on the usual 1:2 cell, so circles are round; 0.5 on a square grid. around() reads it. */
  readonly aspect: number;
  /** Lights the pixel at x, y, in a colour: none by default, the piece's ink. Every drawing below takes its colour the same way. */
  set(x: number, y: number, color?: Color): void;
  /** Clears the pixel at x, y. */
  unset(x: number, y: number): void;
  /** True if the pixel at x, y is lit. */
  get(x: number, y: number): boolean;
  /** A line of pixels from x0, y0 to x1, y1, both ends lit: Bresenham's. */
  line(x0: number, y0: number, x1: number, y1: number, color?: Color): void;
  /** A line of pixels from x, y, `length` pixels long, `turn` of the way round as a clock's hand goes (0 up, 0.25 right), as ray() draws on the grid. */
  ray(x: number, y: number, length: number, turn: number, color?: Color): void;
  /** A rectangle w by h pixels from x, y, its edge one pixel thick; `fill: true` lights all of it (false by default). */
  rect(x: number, y: number, w: number, h: number, o?: { fill?: boolean; color?: Color }): void;
  /** A round circle of radius r pixels at cx, cy, its outline one pixel thick; `fill: true` makes it a disc (false by default). */
  circle(cx: number, cy: number, r: number, o?: { fill?: boolean; color?: Color }): void;
  /**
   * Pixel art from text, its top left at x, y: one character a pixel, a line a row. "." and " " are clear, letting what
   * is under show; every other character is lit in its colour from `colors`, or the piece's ink if it has none there.
   * Written in a template literal, its blank first and last lines and the indent its lines share are left out. To
   * animate, draw the frames side by side and say how many (`frames`), or give a list of drawings, and pick one with
   * `frame`; `wrap` brings it round the edges.
   *
   *   p.sprite(walker, { h: "#7d4e24", b: "#2f81f7" }, t * 12, 10, { frames: 2, frame: t * 4, wrap: true });
   */
  sprite(art: string | readonly string[], colors: Record<string, Color>, x: number, y: number, o?: SpriteOptions): void;
  /** Clears every pixel. */
  clear(): void;
  /** Writes the pixels into the grid: ▀ ▄ or █ a cell. A cell with no pixel lit is left as it was. */
  draw(): void;
}

const UPPER = 0x2580, LOWER = 0x2584, FULL = 0x2588; // ▀ ▄ █

// The rows of pixel art: blank first and last lines and a shared indent left out.
function artRows(art: string): string[] {
  const lines = art.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(indent));
}

class PixelCanvas implements Pixels {
  readonly width: number;
  readonly height: number;
  readonly aspect: number;
  #s: Surface;
  #r: Region;
  // 0 for a clear pixel, else its palette index plus 1 (NONE, the ink, is 256)
  #px: Uint16Array;

  constructor(s: Surface, r: Region) {
    this.#s = s;
    this.#r = r;
    this.width = r.cols;
    this.height = r.rows * 2;
    // a pixel is a whole cell across and half a cell down
    this.aspect = s.aspect / 2;
    this.#px = new Uint16Array(this.width * this.height);
  }

  #on(x: number, y: number, k: number): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.#px[y * this.width + x] = k + 1;
  }

  set(x: number, y: number, color?: Color): void {
    const k = paint(this.#s, color);
    if (finite(x, y)) this.#on(Math.floor(x), Math.floor(y), k);
  }

  unset(x: number, y: number): void {
    if (this.get(x, y)) this.#px[Math.floor(y) * this.width + Math.floor(x)] = 0;
  }

  get(x: number, y: number): boolean {
    if (!finite(x, y)) return false;
    x = Math.floor(x);
    y = Math.floor(y);
    return x >= 0 && y >= 0 && x < this.width && y < this.height && this.#px[y * this.width + x] !== 0;
  }

  line(x0: number, y0: number, x1: number, y1: number, color?: Color): void {
    const k = paint(this.#s, color);
    const n = trace(x0, y0, x1, y1, this.width, this.height);
    for (let i = 0; i < n; i++) this.#on(XS[i], YS[i], k);
  }

  ray(x: number, y: number, length: number, turn: number, color?: Color): void {
    const [x1, y1] = around(this, x, y, length, turn);
    this.line(x, y, x1, y1, color);
  }

  rect(x: number, y: number, w: number, h: number, o?: { fill?: boolean; color?: Color }): void {
    const { fill, color } = canvasOpts(o, "rect");
    const k = paint(this.#s, color);
    boxDots(x, y, w, h, fill, (px, py) => this.#on(px, py, k), this.width, this.height);
  }

  circle(cx: number, cy: number, r: number, o?: { fill?: boolean; color?: Color }): void {
    const { fill, color } = canvasOpts(o, "circle");
    const k = paint(this.#s, color);
    ellipseCells(this.width, this.height, cx, cy, r, r / this.aspect, fill, (x, y) => this.#on(x, y, k));
  }

  sprite(art: string | readonly string[], colors: Record<string, Color>, x: number, y: number, o?: SpriteOptions): void {
    const frames = Array.isArray(art) ? (art as readonly string[]) : [art as string];
    if (!frames.every((f) => typeof f === "string")) fail("sprite() takes its art as a string, a line a row and a character a pixel, or a list of them for frames");
    if (colors === null || typeof colors !== "object") fail('sprite() takes its colours as an object of characters to colours, such as { r: "#e11d48" }, or {} for none');
    const { frame = 0, frames: across = 1 } = opts(o, "sprite");
    if (typeof frame !== "number") fail(`sprite's frame takes a number, such as t * 4 for four frames a second, not ${String(frame)}`);
    if (!Number.isInteger(across) || across < 1) fail(`sprite's frames takes a whole number of frames side by side, 1 or more, not ${String(across)}`);
    const wrap = yes(o?.wrap, "sprite's wrap", false);
    // each character's colour, found once
    const ink = new Map<string, number>();
    for (const ch of Object.keys(colors)) {
      if (ch.length !== 1) fail(`sprite()'s colours take one character of the art each, such as { r: "#e11d48" }, not ${JSON.stringify(ch)}`);
      ink.set(ch, paint(this.#s, colors[ch]));
    }
    if (!frames.length || !finite(x, y)) return;
    // the frame wanted, counting each drawing's frames left to right, then the next drawing's
    const count = frames.length * across;
    const f = ((Math.floor(Number.isFinite(frame) ? frame : 0) % count) + count) % count;
    const sheet = artRows(frames[Math.floor(f / across)]);
    const fw = Math.ceil(Math.max(0, ...sheet.map((l) => l.length)) / across), from = (f % across) * fw;
    const rows = across === 1 ? sheet : sheet.map((l) => l.slice(from, from + fw));
    const w = this.width, h = this.height;
    x = Math.floor(x);
    y = Math.floor(y);
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === "." || ch === " ") continue;
        // round the edges, with wrap: a remainder that is never negative
        const px = wrap ? (((x + c) % w) + w) % w : x + c, py = wrap ? (((y + r) % h) + h) % h : y + r;
        this.#on(px, py, ink.get(ch) ?? NONE);
      }
    });
  }

  clear(): void {
    this.#px.fill(0);
  }

  draw(): void {
    const s = this.#s, { x, y, cols, rows } = this.#r, w = this.width, px = this.#px;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const up = px[2 * r * w + c], down = px[(2 * r + 1) * w + c];
        if (!up && !down) continue;
        const j = (y + r) * s.cols + x + c;
        if (up && down) s.put(j, FULL, up - 1);
        else if (up) s.put(j, UPPER, up - 1);
        else s.put(j, LOWER, down - 1);
      }
  }
}

/**
 * A half-block canvas on the grid, or on a region of it: two square pixels a cell, for pixel art and sprites. Draw on
 * it, then call draw(). Making one is cheap: make it in the drawing, each frame.
 *
 *   const p = pixels(s);
 *   p.sprite(`
 *     .rr.
 *     rrrr
 *     .rr.`, { r: "#e11d48" }, 10, 4);
 *   p.draw();
 */
export function pixels(s: Surface, region?: Region): Pixels {
  grid(s, "pixels");
  return new PixelCanvas(s, area(s, region, "pixels"));
}
