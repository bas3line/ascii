/*
 * kit core: the grid of cells every part of the kit draws into, and piece(),
 * which turns a drawing into a piece that plays wherever one does: mount(),
 * <Ascii>, <ascii-art>, svg() for a README, play() in a terminal. Also the
 * small things every part needs: colours, ramps, and a handful of seeded,
 * deterministic maths.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { piece } from "ascii.rest/kit";
 *
 *   export default piece({ name: "orbit", cols: 40, rows: 12, palette: ["#f97316"] }, (t, s) => {
 *     s.set(20 + 16 * Math.cos(t), 6 + 5 * Math.sin(t), "@", "#f97316");
 *   });
 */
import type { Category, Env, Frame, Meta, Options, Piece } from "../types.ts";

// --- errors -------------------------------------------------------------------

/** Throws the kit's kind of error: what is wrong and what to change, after "ascii.rest: ". */
export function fail(what: string): never {
  throw new Error(`ascii.rest: ${what}`);
}

// Words as a sentence lists them: "a, b and c".
export const and = (words: readonly string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? ""));

// --- maths every part needs ------------------------------------------------------

export const TAU = Math.PI * 2;

/** v kept between lo and hi: 0 and 1 by default. */
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
/** From a to b by k. */
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 below e0, 1 above e1, and a smooth S between. */
export const smoothstep = (e0: number, e1: number, v: number) => {
  const k = clamp((v - e0) / (e1 - e0));
  return k * k * (3 - 2 * k);
};
/** The part after the point, always 0 to 1, for negative numbers too. */
export const fract = (v: number) => v - Math.floor(v);

/** A number 0 to 1 that depends only on the whole numbers given: the same cell, step or seed gives the same number. */
export function hash(a: number, b = 0, c = 0, d = 0): number {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519) + Math.imul(d | 0, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A seeded generator of numbers 0 to 1, mulberry32: the same seed, the same numbers, in every browser and in Node. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise 0 to 1 on a lattice of whole numbers, seeded. ascii.rest/kit's math has simplex noise and fbm too. */
export function valueNoise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// A 4 by 4 ordered dither, its thresholds -0.5 to 0.5.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
/** The ordered (Bayer) dither's threshold at a cell, -0.5 to 0.5: add it, times a step, before rounding. */
export const bayer = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)];

// --- ramps ------------------------------------------------------------------------

/**
 * Characters from no ink to the most, for shading a brightness. Any string of two or more characters is a ramp too;
 * these have names.
 */
export const ramps = {
  standard: " .:-=+*#%@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  donut: " .,-~:;=!*#$@",
  blocks: " ░▒▓█",
  eighths: " ▁▂▃▄▅▆▇█",
  dots: " .·•●",
  lines: " .-=≡",
  stars: " .·+*",
  binary: " #",
} as const;

export type RampName = keyof typeof ramps;

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** A ramp by name, or a string of your own of two or more characters. Throws for anything else. */
export function ramp(r: RampName | (string & {}) = "standard"): string {
  if (typeof r !== "string") fail(`a ramp takes a name, ${and(Object.keys(ramps))}, or a string of characters, not ${String(r)}`);
  if (Object.hasOwn(ramps, r)) return ramps[r as RampName];
  if (r.length < 2 || CONTROL.test(r) || /[\ud800-\udfff]/.test(r))
    fail(`a ramp takes a name, ${and(Object.keys(ramps))}, or two or more characters of your own, not ${JSON.stringify(r)}`);
  return r;
}

/**
 * The character of `chars` for a brightness `v` 0 to 1, the ramp turned round on paper (`flip`) so dense still reads as
 * bright. `jitter`, -0.5 to 0.5 (bayer() gives one), dithers between neighbouring characters.
 */
export function shadeChar(chars: string, v: number, flip = false, jitter = 0): string {
  const n = chars.length;
  let i = Math.floor(clamp(v) * n + jitter);
  i = i < 0 ? 0 : i >= n ? n - 1 : i;
  return chars[flip ? n - 1 - i : i];
}

// --- colours --------------------------------------------------------------------

/** A colour: an index into the piece's colours (for the page's theme), or #rrggbb, found in them. */
export type Color = number | string;

/** The kit's ink for text with no colour of its own on a coloured piece: GitHub's text colours, as banner() uses. */
export const INK = { light: "#1f2328", dark: "#f0f6fc" } as const;

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** #rrggbb as [r, g, b], 0 to 255. Throws for anything else. */
export function rgb(hex: string): [number, number, number] {
  if (!isHex(hex)) fail(`a colour takes #rrggbb, not ${JSON.stringify(hex)}`);
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** [r, g, b], 0 to 255, as #rrggbb. */
export const hex = ([r, g, b]: readonly number[]) =>
  "#" + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");

/** From colour a to colour b by k, as #rrggbb. */
export const mix = (a: string, b: string, k: number) => {
  const x = rgb(a), y = rgb(b);
  return hex(x.map((v, i) => lerp(v, y[i], clamp(k))));
};

/** `n` colours evenly along a fade through `stops`, as #rrggbb. One stop gives n of it. */
export function gradient(stops: readonly string[], n: number): string[] {
  if (!Array.isArray(stops) || !stops.length) fail("a gradient takes one or more colours as #rrggbb");
  if (!Number.isInteger(n) || n < 1) fail(`a gradient takes a whole number of colours of 1 or more, not ${String(n)}`);
  const c = stops.map(rgb);
  return Array.from({ length: n }, (_, i) => {
    const k = n > 1 ? (i / (n - 1)) * (c.length - 1) : 0;
    const a = Math.min(c.length - 2, Math.floor(k));
    return c.length === 1 ? hex(c[0]) : hex(c[a].map((v, j) => lerp(v, c[a + 1][j], k - a)));
  });
}

// How far apart two colours look, roughly: green counts most.
const distance = (a: readonly number[], b: readonly number[]) => 0.3 * (a[0] - b[0]) ** 2 + 0.59 * (a[1] - b[1]) ** 2 + 0.11 * (a[2] - b[2]) ** 2;

/** The index of the colour in `colors` nearest to `color`, from `from` up to `to`. */
export function nearest(colors: readonly string[], color: string, from = 0, to = colors.length): number {
  const want = rgb(color);
  let best = from, bd = Infinity;
  for (let i = from; i < to; i++) {
    const d = distance(rgb(colors[i]), want);
    if (d < bd) (bd = d), (best = i);
  }
  return best;
}

/** A piece's colours: one list for both themes, or a list for each, the same length. */
export type PaletteSpec = readonly string[] | { readonly light: readonly string[]; readonly dark: readonly string[] };
/** A colour for both themes, or one for each. */
export type Themed<T> = T | { readonly light: T; readonly dark: T };

const themed = <T>(v: Themed<T>): v is { light: T; dark: T } => v !== null && typeof v === "object" && !Array.isArray(v) && "light" in v && "dark" in v;

/**
 * A piece's colours as `meta.palette` holds them, and the theme's index for a colour. A themed palette is laid out as
 * the library's logos are: the light page's colours, then the dark page's, so index i is i on paper and size + i on a
 * dark page. #rrggbb is found in the theme's own colours, the nearest if it isn't one of them.
 */
export class Palette {
  /** As meta.palette: the light colours then the dark ones when themed. At least two: one colour is listed twice. */
  readonly colors: readonly string[];
  readonly themed: boolean;
  /** Colours a theme. */
  readonly size: number;
  #cache = [new Map<string, number>(), new Map<string, number>()];
  #ink: Themed<Color>;

  constructor(spec: PaletteSpec, ink: Themed<Color> = 0) {
    if (Array.isArray(spec)) {
      if (!spec.length) fail("a palette takes one or more colours as #rrggbb, not an empty list");
      this.themed = false;
      this.size = spec.length;
      this.colors = spec.length === 1 ? [spec[0], spec[0]] : [...spec];
    } else if (spec && typeof spec === "object" && Array.isArray((spec as { light: unknown }).light) && Array.isArray((spec as { dark: unknown }).dark)) {
      const { light, dark } = spec as { light: readonly string[]; dark: readonly string[] };
      if (!light.length || light.length !== dark.length)
        fail(`a palette's light and dark lists take the same number of colours, one or more, not ${light.length} and ${dark.length}`);
      this.themed = true;
      this.size = light.length;
      this.colors = [...light, ...dark];
    } else fail(`a palette takes a list of colours as #rrggbb, or { light, dark }, not ${JSON.stringify(spec)}`);
    for (const c of this.colors) if (!isHex(c)) fail(`a palette takes colours as #rrggbb, not ${JSON.stringify(c)}`);
    if (this.colors.length > 64) fail(`a palette takes up to 64 colours, light and dark together, not ${this.colors.length}`);
    this.#ink = ink;
  }

  /** The index into meta.palette, for env.color, of a colour on paper or on a dark page. */
  index(c: Color, paper = false): number {
    const base = this.themed && !paper ? this.size : 0;
    if (typeof c === "number") {
      if (!Number.isInteger(c) || c < 0 || c >= this.size)
        fail(`colour ${c} is not one of the palette's ${this.size}: a colour index takes a whole number from 0 to ${this.size - 1}`);
      return base + c;
    }
    const cache = this.#cache[paper ? 0 : 1];
    let i = cache.get(c);
    if (i === undefined) {
      if (!isHex(c)) fail(`a colour takes #rrggbb or an index into the palette, not ${JSON.stringify(c)}`);
      const lc = c.toLowerCase();
      i = -1;
      for (let k = base; k < base + this.size; k++) if (this.colors[k].toLowerCase() === lc) (i = k), (k = Infinity);
      if (i < 0) i = nearest(this.colors, c, base, base + this.size);
      cache.set(c, i);
    }
    return i;
  }

  /** The index of the ink a cell with no colour of its own takes. */
  ink(paper = false): number {
    const ink = this.#ink;
    return this.index(themed<Color>(ink) ? (paper ? ink.light : ink.dark) : (ink as Color), paper);
  }
}

/**
 * Several pieces' colours as one palette: each colour once, and for each piece a map from its own index to the new one.
 * A piece with no colours (undefined) is drawn in INK, which is added for it, and `ink` says where. Throws when they come
 * to more than 64 colours.
 */
export function mergePalettes(parts: readonly (readonly string[] | undefined)[]): { palette: string[]; maps: Uint8Array[]; ink: { light: number; dark: number } | null } {
  const palette: string[] = [];
  const at = new Map<string, number>();
  const add = (c: string) => {
    const k = c.toLowerCase();
    let i = at.get(k);
    if (i === undefined) at.set(k, (i = palette.push(c) - 1));
    return i;
  };
  const maps = parts.map((p) => Uint8Array.from(p ?? [], (c) => add(c)));
  let ink: { light: number; dark: number } | null = null;
  if (palette.length && parts.some((p) => !p)) ink = { light: add(INK.light), dark: add(INK.dark) };
  if (palette.length > 64) fail(`these pieces have ${palette.length} colours between them, past the 64 a piece can have: use fewer, or a piece in fewer colours`);
  if (palette.length === 1) palette.push(palette[0]);
  return { palette, maps, ink };
}

// --- the grid ---------------------------------------------------------------------

/** A cell's character that is not there: transparent when laid over another, a space in the frame. */
export const EMPTY = 0;
/** A cell's colour that is not set: it takes the piece's ink. */
export const NONE = 255;

/**
 * A character's char code for a cell, EMPTY for "". Throws for a control character or one outside the Basic
 * Multilingual Plane: a frame holds one UTF-16 unit a cell, as mount() reads it.
 */
export function code(ch: string): number {
  if (typeof ch !== "string") fail(`a cell takes a character as a string, not ${String(ch)}`);
  const c = ch.length ? ch.charCodeAt(0) : EMPTY;
  if (c && (c < 32 || (c >= 0x7f && c <= 0x9f) || (c >= 0xd800 && c <= 0xdfff)))
    fail(`a cell takes one printable character from the Basic Multilingual Plane, not ${JSON.stringify(ch)}`);
  return c;
}

/** A part of a grid: columns from x and rows from y. */
export interface Region {
  x: number;
  y: number;
  cols: number;
  rows: number;
}

/**
 * A grid of cells, `cols` by `rows`, each a character and a colour: what a frame is made of. Coordinates are columns
 * across and rows down from 0, 0 at the top left; a fraction is taken down to its cell, and anything outside the grid
 * is left out. A cell's character is a char code, EMPTY where nothing is drawn; its colour an index into the piece's
 * palette, the one env.color takes, or NONE for the piece's ink.
 */
export class Surface {
  readonly cols: number;
  readonly rows: number;
  readonly chars: Uint16Array;
  readonly colors: Uint8Array;
  /** A cell's height in cell widths: 2, the shape of a character, or 1 for a square grid (meta.cell). */
  readonly aspect: number;
  /** The piece's colours, which a colour given by #rrggbb or index is found in; null for a piece in one ink. */
  palette: Palette | null;
  /** True when the frame is drawn dark on a light page (env.paper). */
  paper = false;
  /** True when the frame is drawn as text in one ink, so colours are not shown (no env.color). */
  mono = true;
  #line: Uint16Array;

  constructor(cols: number, rows: number, { palette = null, aspect = 2 }: { palette?: Palette | null; aspect?: number } = {}) {
    if (!Number.isInteger(cols) || cols < 1 || !Number.isInteger(rows) || rows < 1) fail(`a surface takes whole numbers of columns and rows of 1 or more, not ${cols} by ${rows}`);
    this.cols = cols;
    this.rows = rows;
    this.chars = new Uint16Array(cols * rows);
    this.colors = new Uint8Array(cols * rows).fill(NONE);
    this.aspect = aspect;
    this.palette = palette;
    this.#line = new Uint16Array(cols);
  }

  /** The cell's index into chars and colors, or -1 outside the grid. */
  index(x: number, y: number): number {
    x = Math.floor(x);
    y = Math.floor(y);
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows ? y * this.cols + x : -1;
  }

  /** The palette index of a colour for this frame's theme; NONE for no colour, or on a piece with no palette. */
  resolve(color: Color | undefined): number {
    if (color === undefined || color === null || !this.palette) return NONE;
    return this.palette.index(color, this.paper);
  }

  /**
   * Draws one character at a cell, in a colour if given: an index into the piece's colours or #rrggbb. "" clears the
   * cell; " " is a blank that still covers what is under it. Throws for a control character or one outside the BMP,
   * which a frame can't hold a cell of.
   */
  set(x: number, y: number, ch: string, color?: Color): void {
    const i = this.index(x, y);
    if (i < 0) return;
    const c = code(ch);
    this.chars[i] = c;
    this.colors[i] = c === EMPTY ? NONE : this.resolve(color);
  }

  /** Draws by index with a char code and a palette index as they are, for drawing loops that have them already. */
  put(i: number, code: number, color: number = NONE): void {
    this.chars[i] = code;
    this.colors[i] = color;
  }

  /** The character at a cell: "" where nothing is drawn or outside the grid. */
  get(x: number, y: number): string {
    const i = this.index(x, y);
    return i < 0 || this.chars[i] === EMPTY ? "" : String.fromCharCode(this.chars[i]);
  }

  /** The palette index at a cell, NONE where it has no colour or outside the grid. */
  colorAt(x: number, y: number): number {
    const i = this.index(x, y);
    return i < 0 ? NONE : this.colors[i];
  }

  /** Empties every cell, or every cell of a region. */
  clear(region?: Region): void {
    if (!region) {
      this.chars.fill(EMPTY);
      this.colors.fill(NONE);
      return;
    }
    this.fill("", undefined, region);
  }

  /** Fills every cell, or a region's, with one character in one colour. */
  fill(ch: string, color?: Color, region?: Region): void {
    const { x, y, cols, rows } = this.clip(region);
    const c = code(ch), k = c === EMPTY ? NONE : this.resolve(color);
    for (let r = y; r < y + rows; r++) {
      this.chars.fill(c, r * this.cols + x, r * this.cols + x + cols);
      this.colors.fill(k, r * this.cols + x, r * this.cols + x + cols);
    }
  }

  /** A region cut down to the grid, whole cells; the whole grid when none is given. */
  clip(region?: Region): Region {
    if (!region) return { x: 0, y: 0, cols: this.cols, rows: this.rows };
    const x0 = Math.max(0, Math.floor(region.x)), y0 = Math.max(0, Math.floor(region.y));
    const x1 = Math.min(this.cols, Math.floor(region.x) + Math.floor(region.cols)), y1 = Math.min(this.rows, Math.floor(region.y) + Math.floor(region.rows));
    return { x: x0, y: y0, cols: Math.max(0, x1 - x0), rows: Math.max(0, y1 - y0) };
  }

  /**
   * Writes text from a cell, left to right, a newline starting the next row back at x. Spaces cover what is under
   * them. ascii.rest/kit's draw has text() with alignment and wrapping.
   */
  write(x: number, y: number, text: string, color?: Color): void {
    let cx = Math.floor(x), cy = Math.floor(y);
    for (const ch of String(text)) {
      if (ch === "\n") (cx = Math.floor(x)), cy++;
      else this.set(cx++, cy, ch, color);
    }
  }

  /**
   * Lays another grid over this one with its top left at x, y. Its EMPTY cells, and its `mask` character (a space by
   * default; null for none), let this one show through. Its colours are copied as they are, or through `map`, from its
   * palette's indices to this one's (mergePalettes() makes these).
   */
  paste(src: Surface, x: number, y: number, { mask = " ", map }: { mask?: string | null; map?: ArrayLike<number> } = {}): void {
    const m = mask === null || mask === "" ? -1 : mask.charCodeAt(0);
    x = Math.floor(x);
    y = Math.floor(y);
    for (let r = Math.max(0, -y); r < src.rows && r + y < this.rows; r++)
      for (let c = Math.max(0, -x); c < src.cols && c + x < this.cols; c++) {
        const i = r * src.cols + c;
        const ch = src.chars[i];
        if (ch === EMPTY || ch === m) continue;
        const k = (r + y) * this.cols + c + x;
        const col = src.colors[i];
        this.chars[k] = ch;
        this.colors[k] = col === NONE || !map ? col : (map[col] ?? NONE);
      }
  }

  /**
   * Reads a frame back into the grid: the string a piece returned and, for a coloured one, the env.color it wrote.
   * Spaces become EMPTY, so the frame can be laid over another; lines are cut or padded to the grid.
   */
  load(text: string, color?: ArrayLike<number>): this {
    this.clear();
    let x = 0, y = 0;
    for (let k = 0; k < text.length && y < this.rows; k++) {
      const c = text.charCodeAt(k);
      if (c === 10) {
        x = 0;
        y++;
        continue;
      }
      if (x < this.cols && c !== 32) {
        const i = y * this.cols + x;
        this.chars[i] = c;
        this.colors[i] = color ? color[i] : NONE;
      }
      x++;
    }
    return this;
  }

  /**
   * The frame: `rows` lines of `cols` characters, EMPTY as a space. Given env.color (a coloured piece drawn in colour),
   * it writes every cell's palette index into it, the ink where a cell has no colour.
   */
  frame(env: Env = {}): string {
    const { cols, rows, chars, colors } = this;
    const color = env.color;
    if (color && this.palette) {
      const ink = this.palette.ink(this.paper);
      const n = Math.min(color.length, chars.length);
      for (let i = 0; i < n; i++) color[i] = colors[i] === NONE ? ink : colors[i];
    }
    const line = this.#line;
    let out = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0, i = r * cols; c < cols; c++, i++) line[c] = chars[i] || 32;
      out += (r ? "\n" : "") + String.fromCharCode.apply(null, line as unknown as number[]);
    }
    return out;
  }

  /** The frame as text in one ink. */
  toString(): string {
    return this.frame();
  }

  /** A copy, with the same palette and theme. */
  clone(): Surface {
    const s = new Surface(this.cols, this.rows, { palette: this.palette, aspect: this.aspect });
    s.chars.set(this.chars);
    s.colors.set(this.colors);
    s.paper = this.paper;
    s.mono = this.mono;
    return s;
  }

  /** A grid of a frame's text, as wide as its longest line, and its colours if given. */
  static from(text: string, color?: ArrayLike<number>, palette: Palette | null = null): Surface {
    const lines = String(text).split("\n");
    const s = new Surface(Math.max(1, ...lines.map((l) => l.length)), Math.max(1, lines.length), { palette });
    return s.load(String(text), color);
  }
}

// --- pieces -----------------------------------------------------------------------

const CATEGORIES: readonly Category[] = ["scenes", "shapes", "space", "physics", "nature", "creatures", "objects", "generative", "effects", "ui", "data", "type", "logos", "companies", "distros"];
/** The largest a piece may be: a scene's size. The library's own pieces other than scenes keep to 80 by 32. */
export const MAX = { cols: 320, rows: 120 } as const;

/**
 * Checks a meta as scripts/check.ts checks a library piece's, and throws, saying what to change, for the first thing
 * wrong. Any piece may be up to MAX in size.
 */
export function checkMeta<M extends Meta>(m: M): M {
  if (!m || typeof m !== "object") fail("a piece takes a meta object");
  if (typeof m.name !== "string" || !m.name.trim()) fail("a piece takes a name: one line, such as \"orbit\"");
  if (!CATEGORIES.includes(m.category)) fail(`category takes one of ${and(CATEGORIES)}, not ${JSON.stringify(m.category)}`);
  if (typeof m.note !== "string" || !m.note || m.note.length > 72) fail(`note takes one line of 1 to 72 characters, not ${JSON.stringify(m.note)}`);
  if (!Number.isInteger(m.cols) || m.cols < 1 || m.cols > MAX.cols) fail(`cols takes a whole number from 1 to ${MAX.cols}, not ${String(m.cols)}`);
  if (!Number.isInteger(m.rows) || m.rows < 1 || m.rows > MAX.rows) fail(`rows takes a whole number from 1 to ${MAX.rows}, not ${String(m.rows)}`);
  if (!Number.isInteger(m.fps) || m.fps < 0 || m.fps > 60) fail(`fps takes a whole number from 0 (a still) to 60, not ${String(m.fps)}`);
  if (m.options !== undefined && (typeof m.options !== "object" || m.options === null)) fail("options takes an object of the piece's options and their defaults");
  if (m.palette !== undefined && !(Array.isArray(m.palette) && m.palette.length >= 2 && m.palette.length <= 64 && m.palette.every(isHex)))
    fail("a palette takes 2 to 64 colours as #rrggbb");
  if (m.ground !== undefined && !isHex(m.ground)) fail(`ground takes a colour as #rrggbb, not ${JSON.stringify(m.ground)}`);
  if (m.cell !== undefined && m.cell !== 1 && m.cell !== 2) fail(`cell takes 1 (square) or 2, not ${String(m.cell)}`);
  if (m.loop !== undefined && !(typeof m.loop === "number" && Number.isFinite(m.loop) && m.loop > 0)) fail(`loop takes a number of seconds above 0, not ${String(m.loop)}`);
  if (m.still !== undefined && !(typeof m.still === "number" && Number.isFinite(m.still) && m.still >= 0)) fail(`still takes a number of seconds of 0 or more, not ${String(m.still)}`);
  return m;
}

/** What a piece made by the kit is: a normal piece, its meta typed for its options. */
export interface KitPiece<O extends Options = Options> extends Piece<O> {
  meta: Meta<O>;
}

/** What piece() takes: the meta's fields, most of them with a default, and the piece's colours. */
export interface PieceSpec<O extends Options = Options> {
  /** Lowercase display name: "orbit". */
  name: string;
  /** One line, up to 72 characters, saying what you see: the name by default. */
  note?: string;
  /** "generative" by default. */
  category?: Category;
  /** Its size in cells. */
  cols: number;
  rows: number;
  /** Frames a second: 30 by default, 0 for a still. */
  fps?: number;
  /** Its colours: one list, or { light, dark } of the same length. Without, it is text in the page's own colour. */
  palette?: PaletteSpec;
  /** The colour of a cell drawn with none: the first colour by default, or one for each theme. */
  ink?: Themed<Color>;
  /** The colour behind it, as #rrggbb; it is then drawn for that ground whatever the page. */
  ground?: string;
  /** Cell height in cell widths: 2 by default, 1 for a square grid. */
  cell?: 1 | 2;
  /** Its period in seconds, if it repeats exactly: the loop svg() plays. */
  loop?: number;
  /** The moment to show held still, for reduced motion: 0 by default. */
  still?: number;
  /** True if it shows the real time or date. */
  clock?: boolean;
  /** Its options and their defaults, passed to the drawing as ctx.options. */
  options?: O;
  /** Empty the grid before each frame: true by default. */
  clear?: boolean;
}

/**
 * What a maker such as field() or scene() takes: piece()'s spec with the name and size optional, since the maker has
 * its own name and a size to fall back on.
 */
export type MakerSpec<O extends Options = Options> = Omit<PieceSpec<O>, "name" | "cols" | "rows"> & { name?: string; cols?: number; rows?: number };

/** A maker's spec, its name and size filled in: `name`, and 64 by 24 unless `size` says otherwise. */
export function specOf<O extends Options>(spec: MakerSpec<O> | undefined, name: string, size: { cols: number; rows: number } = { cols: 64, rows: 24 }): PieceSpec<O> {
  if (spec !== undefined && (spec === null || typeof spec !== "object")) fail(`${name}() takes a spec object, such as { cols: 64, rows: 24 }`);
  return { ...spec, name: spec?.name ?? name, cols: spec?.cols ?? size.cols, rows: spec?.rows ?? size.rows };
}

/** A palette spec's colours spread to `n` along their fade, for each theme it has: colours by value, from a few stops. */
export function spread(stops: PaletteSpec, n: number): PaletteSpec {
  if (Array.isArray(stops)) return gradient(stops, n);
  const { light, dark } = stops as { light: readonly string[]; dark: readonly string[] };
  if (!Array.isArray(light) || !Array.isArray(dark)) fail(`colours take a list of #rrggbb, or { light, dark }, not ${JSON.stringify(stops)}`);
  return { light: gradient(light, n), dark: gradient(dark, n) };
}

/** What a drawing knows besides the time and the grid. */
export interface Context<O extends Options = Options> {
  /** The piece's options: its defaults with the caller's on top. */
  options: O;
  /** Dark on a light page (env.paper). */
  paper: boolean;
  /** Drawn as text in one ink: colours are not shown. */
  mono: boolean;
  cols: number;
  rows: number;
}

/** Draws the frame at `t` seconds into `s`. It should depend only on t (and the options), so any frame can be drawn first. */
export type Draw<O extends Options = Options> = (t: number, s: Surface, ctx: Context<O>) => void;
/** Runs once for each play of the piece, with its options, and returns the drawing: the place for work done once. */
export type Setup<O extends Options = Options> = (options: O, size: { cols: number; rows: number }) => Draw<O>;

/** The meta and palette for a spec, checked. */
export function metaOf<O extends Options>(spec: PieceSpec<O>): { meta: Meta<O>; palette: Palette | null } {
  if (!spec || typeof spec !== "object") fail("piece() takes a spec: { name, cols, rows } at least");
  const palette = spec.palette === undefined ? null : new Palette(spec.palette, spec.ink ?? 0);
  // An ink that isn't one of the colours throws now, not on the first frame.
  if (palette) {
    palette.ink(true);
    palette.ink(false);
  }
  const name = typeof spec.name === "string" ? spec.name.trim() : spec.name;
  const meta: Meta<O> = {
    name,
    category: spec.category ?? "generative",
    note: spec.note ?? (typeof name === "string" ? name.slice(0, 72) : name),
    cols: spec.cols,
    rows: spec.rows,
    fps: spec.fps ?? 30,
    ...(spec.options !== undefined ? { options: spec.options } : {}),
    ...(spec.clock ? { clock: true } : {}),
    ...(palette ? { palette: palette.colors } : {}),
    ...(spec.ground !== undefined ? { ground: spec.ground } : {}),
    ...(spec.cell !== undefined ? { cell: spec.cell } : {}),
    ...(spec.loop !== undefined ? { loop: spec.loop } : {}),
    ...(spec.still !== undefined ? { still: spec.still } : {}),
  };
  return { meta: checkMeta(meta), palette };
}

/**
 * A piece from a drawing: give it a name and a size (and colours, if it has any), and a function that draws the frame
 * at t seconds into a grid. It plays wherever a piece does. The second argument may instead be { setup }, which runs
 * once for each play with the options and returns the drawing. Throws, saying what to change, for a spec it can't take.
 *
 *   export default piece({ name: "pulse", cols: 32, rows: 9 }, (t, s) => {
 *     s.write(10, 4, Math.sin(t * 3) > 0 ? "* beat *" : "  beat  ");
 *   });
 */
export function piece<O extends Options = Options>(spec: PieceSpec<O>, draw: Draw<O> | { setup: Setup<O> }): KitPiece<O> {
  const { meta, palette } = metaOf(spec);
  const setup: Setup<O> =
    typeof draw === "function"
      ? () => draw
      : draw && typeof draw === "object" && typeof draw.setup === "function"
        ? draw.setup
        : fail("piece() takes a drawing, (t, s, ctx) => { ... }, or { setup: (options) => drawing }");
  const wipe = spec.clear ?? true;
  return {
    meta,
    default(options?: Partial<O>): Frame {
      const opts = { ...meta.options, ...options } as O;
      const s = new Surface(meta.cols, meta.rows, { palette, aspect: meta.cell ?? 2 });
      const ctx: Context<O> = { options: opts, paper: false, mono: true, cols: meta.cols, rows: meta.rows };
      const fn = setup(opts, { cols: meta.cols, rows: meta.rows });
      if (typeof fn !== "function") fail("a piece's setup returns its drawing, (t, s, ctx) => { ... }");
      return (t: number, env: Env = {}) => {
        s.paper = ctx.paper = !!env.paper;
        s.mono = ctx.mono = !env.color;
        if (wipe) s.clear();
        fn(Number.isFinite(t) ? t : 0, s, ctx);
        return s.frame(env);
      };
    },
  };
}

// --- other pieces, inside the kit -------------------------------------------------

/** What an effect or a layout takes: a piece, a block of text, or a grid. */
export type Source = Piece | string | Surface;

/**
 * Any source as a piece: a piece as it is; text or a grid as a still of it, as wide as its longest line (a grid keeps
 * its palette).
 */
export function asPiece(src: Source, name = "text"): Piece {
  if (src instanceof Surface) {
    const grid = src.clone();
    const palette = grid.palette;
    const meta: Meta = checkMeta({ name, category: "type", note: name, cols: grid.cols, rows: grid.rows, fps: 0, ...(palette ? { palette: palette.colors } : {}) });
    return {
      meta,
      default: () => (t, env = {}) => {
        grid.paper = !!env.paper;
        return grid.frame(env);
      },
    };
  }
  if (typeof src === "string") {
    const lines = src.split("\n");
    const cols = Math.max(1, ...lines.map((l) => l.length));
    if (CONTROL.test(src.replace(/\n/g, ""))) fail("text takes printable characters and newlines, not control characters");
    const text = lines.map((l) => l.padEnd(cols)).join("\n");
    const meta: Meta = checkMeta({ name, category: "type", note: name, cols, rows: lines.length, fps: 0 });
    return { meta, default: () => () => text };
  }
  if (!src || typeof src !== "object" || !src.meta || typeof src.default !== "function") fail("this takes a piece, a string of text or a Surface");
  return src;
}

/** A piece being played, frame by frame, as grids: what an effect or a layout reads its parts through. */
export interface Sampler {
  readonly meta: Meta;
  /** Its colours, null for a piece in one ink. Its grids' colours are indices into these. */
  readonly palette: readonly string[] | null;
  /**
   * The frame at t as a grid, its spaces EMPTY: in colour unless `mono`, for paper or a dark page. The same grid is
   * returned each time, so copy it to keep it.
   */
  at(t: number, env?: { paper?: boolean; mono?: boolean }): Surface;
}

/** Plays a source with its options, for reading as grids: sample(donut).at(1.5) is donut's frame at 1.5 seconds. */
export function sample(src: Source, options: Options = {}): Sampler {
  const p = asPiece(src);
  const { meta } = p;
  const frame = p.default({ ...meta.options, ...options });
  const palette = meta.palette ?? null;
  const color = palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
  const grid = new Surface(meta.cols, meta.rows, { palette: palette ? new Palette(palette) : null, aspect: meta.cell ?? 2 });
  return {
    meta,
    palette,
    at(t, { paper = false, mono = false } = {}) {
      const c = mono ? undefined : color;
      const text = frame(t, { paper, color: c });
      grid.paper = paper;
      grid.mono = !c;
      return grid.load(text, c);
    },
  };
}

/** A piece's frame at t as text and colours, as mount() would draw it: for tests, scripts and thumbnails. */
export function snapshot(src: Source, t = 0, { paper = false, mono = false, options = {} }: { paper?: boolean; mono?: boolean; options?: Options } = {}): { text: string; color: Uint8Array | null } {
  const p = asPiece(src);
  const color = p.meta.palette && !mono ? new Uint8Array(p.meta.cols * p.meta.rows) : undefined;
  const text = p.default({ ...p.meta.options, ...options })(t, { paper, color });
  return { text, color: color ?? null };
}
