/*
 * kit fx: effects that take any piece and give back a new one. The source can
 * be a library piece such as donut, a banner(), a piece of your own, a block of
 * text or a grid: the effect plays it, reads each frame back into a grid with
 * its colours, and works on that. A glint crossing it, typing it in, dissolving
 * or fading it in and out, a scan line, a glitch, a wave, a rainbow, a shake,
 * an outline and a drop shadow. What comes out is a normal piece, so it plays
 * wherever one does, in colour or in one ink, on a dark page or on paper, and
 * effects chain: each takes what the last one made.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { chain, dissolve, glint, wave } from "ascii.rest/kit";
 *   import { banner } from "ascii.rest/banner";
 *   import * as donut from "ascii.rest/pieces/donut";
 *
 *   export const fading = dissolve(donut);
 *   export const hello = chain(banner("hello", { effect: "still" }), (p) => glint(p), (p) => wave(p));
 */
import type { Meta, Options, Piece } from "../types.ts";
import {
  EMPTY,
  INK,
  MAX,
  NONE,
  Surface,
  TAU,
  asPiece,
  bayer,
  fail,
  gradient,
  hash,
  isHex,
  mix,
  nearest,
  piece,
  ramp,
  ramps,
  sample,
  smoothstep,
  snapshot,
  valueNoise,
  type Context,
  type KitPiece,
  type PaletteSpec,
  type RampName,
  type Source,
} from "./core.ts";

// --- what every effect takes ---------------------------------------------------------

/** What every effect takes besides its own options. */
export interface FxOptions {
  /** The new piece's name: the source's by default. */
  name?: string;
  /** One line, up to 72 characters, saying what you see: the name and the effect by default. */
  note?: string;
  /**
   * Options for the source, over its own defaults: `{ shine: 0 }` keeps a logo's own glint still. They become the new
   * piece's options too, so a player can still change them.
   */
  options?: Options;
}

/** How a dissolve or a fade runs each period: in then held, held then out, or in, held, out and gone. */
export type FxMode = "in" | "out" | "inout";

// --- checking what a caller passes ---------------------------------------------------

// A value as an error message shows it.
const show = (v: unknown) => (typeof v === "string" ? JSON.stringify(v) : v !== null && typeof v === "object" ? (Array.isArray(v) ? "a list" : "an object") : String(v));
// Words as a sentence offers them: "a, b or c".
const or = (words: readonly string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words.at(-1)}` : (words[0] ?? ""));

// The rules a number can be held to, and how an error words each.
const RULES = {
  seconds: [(v: number) => v > 0, "a number of seconds above 0"],
  time: [(v: number) => v >= 0, "a number of seconds, 0 or more"],
  positive: [(v: number) => v > 0, "a number above 0"],
  number: [() => true, "a number"],
  share: [(v: number) => v >= 0 && v <= 1, "a number from 0 to 1"],
  cells: [(v: number) => Number.isInteger(v) && v >= 1, "a whole number of cells, 1 or more"],
  shift: [(v: number) => Number.isInteger(v), "a whole number of cells"],
  whole: [(v: number) => Number.isInteger(v), "a whole number"],
  steps: [(v: number) => Number.isInteger(v) && v >= 1 && v <= 32, "a whole number from 1 to 32"],
} as const satisfies Record<string, readonly [(v: number) => boolean, string]>;

function num(v: unknown, name: string, fallback: number, rule: keyof typeof RULES): number {
  if (v === undefined) return fallback;
  const [ok, words] = RULES[rule];
  if (typeof v !== "number" || !Number.isFinite(v) || !ok(v)) fail(`${name} takes ${words}, not ${show(v)}`);
  return v;
}

function choice<T extends string>(v: unknown, name: string, choices: readonly T[], fallback: T): T {
  if (v === undefined) return fallback;
  if (!choices.includes(v as T)) fail(`${name} takes ${or(choices.map((c) => JSON.stringify(c)))}, not ${show(v)}`);
  return v as T;
}

// A character a frame can hold in a cell: printable, one UTF-16 unit, as mount() reads a frame.
const printable = (c: string) => {
  const k = c.charCodeAt(0);
  return c.length === 1 && k >= 32 && !(k >= 0x7f && k <= 0x9f) && !(k >= 0xd800 && k <= 0xdfff);
};

// Characters for the art: from `least` to `most` of them, each one a cell can hold.
function chars(v: unknown, name: string, fallback: string, least = 1, most = Infinity): string {
  if (v === undefined) return fallback;
  if (typeof v !== "string" || v.length < least || v.length > most || ![...v].every(printable)) {
    const many = most === 1 ? "one character" : least === most ? `${least} characters` : most === 2 ? "one or two characters" : least === 1 ? "one or more characters" : `${least} or more characters`;
    fail(`${name} takes ${many}, each a printable one from the Basic Multilingual Plane, not ${show(v)}`);
  }
  return v;
}

function colour(v: unknown, name: string): string | undefined {
  if (v === undefined) return undefined;
  if (!isHex(v)) fail(`${name} takes a colour as #rrggbb, not ${show(v)}`);
  return v;
}

function optionsOf<T extends object>(o: T | undefined, fx: string): T {
  if (o === undefined) return {} as T;
  if (o === null || typeof o !== "object" || Array.isArray(o)) fail(`${fx}() takes its options as an object, such as { period: 4 }, not ${show(o)}`);
  return o;
}

// --- small sums ---------------------------------------------------------------------

/** a modulo n, always 0 to n, for negative a too. */
const mod = (a: number, n: number) => ((a % n) + n) % n;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
// The least common multiple of two periods, on hundredths of a second, when it is at most 60 seconds.
function lcm(a: number, b: number): number | undefined {
  const x = Math.round(a * 100), y = Math.round(b * 100);
  if (x < 1 || y < 1) return undefined;
  const l = (x / gcd(x, y)) * y;
  return l <= 6000 ? l / 100 : undefined;
}

// The middle of the first stretch, from t on and within `span` seconds, when `busy` says the effect shows nothing:
// the moment a still shows, and where an SVG's loop starts.
function quiet(t: number, busy: (t: number) => boolean, span: number): number {
  const n = 480;
  let from = -1;
  for (let k = 0; k <= n; k++) {
    const u = t + (span * k) / n;
    if (from < 0 && !busy(u)) from = u;
    else if (from >= 0 && busy(u)) return +((from + u) / 2 - span / n / 2).toFixed(3);
  }
  return from < 0 ? t : +((from + t + span) / 2).toFixed(3);
}

// --- the new piece's colours -----------------------------------------------------------

/**
 * The colours of the piece an effect makes: the source's, each once, then any the effect adds, up to the 64 a piece can
 * have. Past 64 a colour is drawn in the nearest one there is, rather than failing: a glint on a banner fading through
 * thirty colours asks for sixty more.
 */
class Inks {
  readonly list: string[] = [];
  #at = new Map<string, number>();
  /** From the source's palette index to the index here. */
  readonly map: Uint8Array;
  /** How many of the colours are the source's own. */
  readonly own: number;

  constructor(src: readonly string[] | null) {
    this.map = Uint8Array.from(src ?? [], (c) => this.add(c));
    this.own = this.list.length;
  }

  /** The index of a colour, added if it is new. */
  add(c: string): number {
    const k = c.toLowerCase();
    let i = this.#at.get(k);
    if (i === undefined) {
      i = this.list.length < 64 ? this.list.push(c) - 1 : nearest(this.list, c);
      this.#at.set(k, i);
    }
    return i;
  }
}

// The kit's quieter ink, for a shadow on a coloured piece: GitHub's muted text colours, as banner()'s shadow.
const QUIET = { light: "#59636e", dark: "#9198a1" } as const;

// --- the effect a piece is made of ------------------------------------------------------

/** Draws the effect at t into `s`, from the source's frame at t in the new piece's colours. */
type FxDraw = (t: number, s: Surface, src: Surface, ctx: Context) => void;

// What an effect works out once, when its piece is made.
interface Made {
  /** The new piece's size: the source's by default. */
  cols?: number;
  rows?: number;
  /** True when the effect changes by itself over time. */
  moves: boolean;
  /** The seconds it repeats in exactly, if it does. */
  period?: number;
  /** The moment to hold still, for a reader who prefers reduced motion: the source's by default. */
  still?: number;
  /** For the note: "glinting now and then". */
  what: string;
  /** Runs once for each play: the place for buffers. */
  setup: () => FxDraw;
}

// What an effect knows of its source when it is made.
interface Given {
  meta: Meta;
  inks: Inks;
  piece: Piece;
  options: Options;
}

// The categories whose pieces glint or scan on a period an option sets, as svg() plays them.
const LOOPS: Record<string, string> = { logos: "shine", companies: "shine", distros: "scan" };

// The source's own period: its loop, or a logo's glint or a distro's scan; none for a still or a piece that never repeats.
function periodOf(m: Meta, options: Options): number | undefined {
  if (!m.fps) return undefined;
  if (m.loop) return m.loop;
  const v = Object.hasOwn(LOOPS, m.category) ? options[LOOPS[m.category]] : undefined;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

// Any source as a piece, text named by its first line.
function sourceOf(src: Source, fx: string): Piece {
  if (typeof src === "string") return asPiece(src, src.split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 40) ?? "text");
  if (src instanceof Surface) return asPiece(src, "grid");
  if (!src || typeof src !== "object" || !(src as Piece).meta || typeof (src as Piece).default !== "function")
    fail(`${fx}() takes a piece, a block of text or a Surface, not ${src === null ? "null" : typeof src}`);
  return src;
}

/**
 * The piece an effect makes: the source played with its options, each frame read back into a grid in the new piece's
 * colours, and the effect drawn from it. The loop follows the kit's time rule: the least common multiple of the
 * source's period and the effect's, up to 60 seconds, a still source or one that never repeats counting as the
 * effect's.
 */
function effect(fx: string, src: Source, o: FxOptions, make: (g: Given) => Made): KitPiece {
  const p = sourceOf(src, fx);
  const m = p.meta;
  if (o.options !== undefined && (o.options === null || typeof o.options !== "object" || Array.isArray(o.options)))
    fail(`${fx}.options takes the source's options as an object, such as { shine: 0 }, not ${show(o.options)}`);
  const options: Options | undefined = m.options || o.options ? { ...m.options, ...o.options } : undefined;
  const inks = new Inks(m.palette ?? null);
  const e = make({ meta: m, inks, piece: p, options: options ?? {} });
  // A source in one ink that the effect adds colours to is drawn in the kit's ink, by theme.
  const ink = !m.palette && inks.list.length ? { light: inks.add(INK.light), dark: inks.add(INK.dark) } : null;
  const cols = e.cols ?? m.cols, rows = e.rows ?? m.rows;
  if (cols > MAX.cols || rows > MAX.rows)
    fail(`${fx}() makes a piece ${cols} by ${rows} from one ${m.cols} by ${m.rows}, past the ${MAX.cols} by ${MAX.rows} a piece can be: use a smaller source, or a smaller reach`);
  const own = periodOf(m, options ?? {});
  const loop = !e.moves ? own : e.period ? lcm(own ?? e.period, e.period) : undefined;
  const name = o.name === undefined ? m.name : typeof o.name === "string" ? o.name : fail(`${fx}.name takes a string, not ${show(o.name)}`);
  const note = o.note ?? `${name}, ${e.what}`.slice(0, 72);
  const still = e.still ?? m.still;
  const made = piece<Options>(
    {
      name,
      note,
      category: m.category,
      cols,
      rows,
      fps: e.moves ? m.fps || 24 : m.fps,
      ...(inks.list.length ? { palette: inks.list, ink: ink ?? 0 } : {}),
      ground: m.ground,
      cell: m.cell,
      loop,
      still: still ? +still.toFixed(3) : undefined,
      clock: m.clock,
      options,
    },
    {
      setup: (opts) => {
        const play = sample(p, opts);
        const grid = new Surface(m.cols, m.rows, { aspect: m.cell ?? 2 });
        const draw = e.setup();
        const { map } = inks;
        return (t, s, ctx) => {
          const g = play.at(t, { paper: ctx.paper, mono: ctx.mono });
          grid.chars.set(g.chars);
          for (let i = 0; i < g.colors.length; i++) {
            const c = g.colors[i];
            grid.colors[i] = c === NONE ? NONE : (map[c] ?? NONE);
          }
          grid.paper = ctx.paper;
          grid.mono = ctx.mono;
          draw(t, s, grid, ctx);
        };
      },
    },
  );
  // svg() reads a piece's `motion`, as it does a banner's, to start its loop on the held moment: an SVG of a dissolve
  // then starts whole, and that is the frame it shows for reduced motion, not an empty one.
  return loop && made.meta.still ? Object.assign(made, { motion: { seconds: loop, from: made.meta.still, once: false } }) : made;
}

// Copies a source's frame into the new piece's grid as it is, when the two are the same size.
const copy = (s: Surface, g: Surface) => {
  s.chars.set(g.chars);
  s.colors.set(g.colors);
};

// --- glint ---------------------------------------------------------------------------

export interface GlintOptions extends FxOptions {
  /** Seconds from one glint to the next: 4. */
  every?: number;
  /** Seconds a glint takes to cross the piece: 1.2. */
  sweep?: number;
  /** Seconds before the first glint: 0.5. */
  first?: number;
  /** The band's bright core, in cells across: 3. A cell of softer edge runs along each side of it. */
  width?: number;
  /** Cells the band leans back for each row down, so it slants like a slash: 1. Negative leans it the other way, 0 stands it up. */
  slant?: number;
  /**
   * The core's character then the edge's: "█▓" on a dark page and "▒▓" on paper, as banner()'s glint. One character
   * is both. null keeps the source's characters and lights only their colour, so in one ink it shows nothing.
   */
  chars?: string | null;
  /**
   * The band's colour as #rrggbb. By default, on a coloured piece, each cell's own colour lifted toward white (by 0.6
   * in the core and 0.3 at the edge); a piece in one ink then stays in one ink, the glint drawn by its characters.
   */
  color?: string;
}

/**
 * A light band that crosses the piece's ink now and then, slanting like a slash: the logos' and the banners' glint, on
 * anything. Between glints the piece is exactly its source.
 *
 *   export default glint(banner("hello", { effect: "still" }), { every: 3 });
 */
export function glint(src: Source, options?: GlintOptions): KitPiece {
  const o = optionsOf(options, "glint");
  const every = num(o.every, "glint.every", 4, "seconds");
  const sweep = num(o.sweep, "glint.sweep", 1.2, "seconds");
  const first = num(o.first, "glint.first", 0.5, "number");
  const width = num(o.width, "glint.width", 3, "positive");
  const slant = num(o.slant, "glint.slant", 1, "number");
  const keep = o.chars === null;
  const given = keep ? "" : chars(o.chars, "glint.chars", "", 1, 2);
  const color = colour(o.color, "glint.color");
  return effect("glint", src, o, ({ meta: m, inks }) => {
    // Each colour's lift, the core's and the edge's, indexed by the cell's colour; NONE stays NONE unless a colour is given.
    const core = new Uint8Array(256).fill(NONE), edge = new Uint8Array(256).fill(NONE);
    if (color) {
      core.fill(inks.add(color));
      edge.fill(inks.add(color));
    } else {
      const own = inks.list.slice(0, inks.own);
      own.forEach((c, i) => (core[i] = inks.add(mix(c, "#ffffff", 0.6))));
      own.forEach((c, i) => (edge[i] = inks.add(mix(c, "#ffffff", 0.3))));
    }
    // The band runs from wholly off the grid on one side to wholly off it on the other.
    const reach = width / 2 + 1;
    const lo = Math.min(0, slant * (m.rows - 1)) - reach, hi = m.cols - 1 + Math.max(0, slant * (m.rows - 1)) + reach;
    const busy = (t: number) => mod(t - first, every) < sweep;
    return {
      moves: true,
      period: every,
      still: quiet(m.still ?? 0, busy, every),
      what: "glinting now and then",
      setup: () => (t, s, g, ctx) => {
        copy(s, g);
        const u = mod(t - first, every) / sweep;
        if (u >= 1) return;
        const at = lo + (hi - lo) * u;
        const pair = given || (ctx.paper ? "▒▓" : "█▓");
        const c0 = pair.charCodeAt(0), c1 = pair.charCodeAt(pair.length - 1);
        for (let y = 0, i = 0; y < g.rows; y++)
          for (let x = 0; x < g.cols; x++, i++) {
            if (g.chars[i] === EMPTY) continue;
            const d = Math.abs(x + slant * y - at);
            if (d >= reach) continue;
            const inCore = d < width / 2;
            if (!keep) s.chars[i] = inCore ? c0 : c1;
            if (!ctx.mono) s.colors[i] = (inCore ? core : edge)[g.colors[i]];
          }
      },
    };
  });
}

// --- typeIn --------------------------------------------------------------------------

export interface TypeInOptions extends FxOptions {
  /** Characters a second: 40, or quicker for a big piece, so that more than 120 characters are all in within 3 seconds. */
  speed?: number;
  /** Seconds before the first character, the cursor blinking where it will start: 0. */
  start?: number;
  /**
   * The cursor's character: "▌", or none for order "random", where it would hop about. It sits on the next cell to
   * type, and once all is in it blinks after the last, in reading order, where there is room; text gets a column for
   * it. false for none.
   */
  cursor?: string | false;
  /** The order cells appear in: "reading", left to right a row at a time; "columns", top to bottom a column at a time; or "random". */
  order?: "reading" | "random" | "columns";
  /** Seconds it holds once all in, before it starts again, so it loops. By default it types once and stays. */
  hold?: number;
  /** The order for "random": 1. Another seed, another order. */
  seed?: number;
}

/**
 * The piece typed in, a character at a time, behind a cursor: text, a banner, a logo, or a moving piece, whose frames
 * show through the cells typed so far. Cells with nothing in them take no time.
 *
 *   export default typeIn("$ npx ascii.rest add donut", { hold: 2 });
 */
export function typeIn(src: Source, options?: TypeInOptions): KitPiece {
  const o = optionsOf(options, "typeIn");
  const start = num(o.start, "typeIn.start", 0, "time");
  const order = choice(o.order, "typeIn.order", ["reading", "random", "columns"], "reading");
  const cursor = o.cursor === false ? "" : chars(o.cursor, "typeIn.cursor", order === "random" ? "" : "▌", 1, 1);
  const hold = o.hold === undefined ? undefined : num(o.hold, "typeIn.hold", 0, "time");
  const seed = num(o.seed, "typeIn.seed", 1, "whole");
  if (o.speed !== undefined) num(o.speed, "typeIn.speed", 40, "positive");
  // Text gets a column after its longest line, for the cursor to blink in once it is all typed.
  const text = typeof src === "string" && cursor ? src.split("\n").map((l) => l + " ").join("\n") : src;
  return effect("typeIn", text, o, ({ meta: m, piece: p, options: opts }) => {
    const { cols, rows } = m;
    // The characters to type: as many as its frame has at the moment it names to be held, its first by default, so a
    // source that starts empty, a dissolve say, still counts whole.
    const total = snapshot(p, m.still ?? 0, { options: opts }).text.replace(/\s/g, "").length;
    const speed = o.speed ?? Math.max(40, total / 3);
    const typing = total / speed;
    const cycle = hold === undefined ? 0 : start + typing + hold;
    // The cells in the order they are typed in; reading order needs no list.
    let seq: Int32Array | null = null;
    if (order === "columns") {
      seq = new Int32Array(cols * rows);
      for (let x = 0, k = 0; x < cols; x++) for (let y = 0; y < rows; y++) seq[k++] = y * cols + x;
    } else if (order === "random") {
      const key = Float64Array.from({ length: cols * rows }, (_, i) => hash(seed, i, 7));
      seq = Int32Array.from({ length: cols * rows }, (_, i) => i).sort((a, b) => key[a] - key[b]);
    }
    const code = cursor ? cursor.charCodeAt(0) : 0;
    const blink = (u: number) => mod(u, 1.06) < 0.53;
    const still = hold === undefined ? start + typing + 0.5 : hold > 0 ? start + typing + Math.min(hold, 1) / 2 : Math.max(0, start + typing - 0.001);
    return {
      moves: true,
      period: cycle || undefined,
      still,
      what: "typed in",
      setup: () => (t, s, g) => {
        const local = cycle ? mod(t, cycle) : t;
        const n = Math.floor((local - start) * speed + 1e-6);
        const all = g.chars.length;
        let shown = 0, next = -1, last = -1;
        for (let k = 0; k < all; k++) {
          const i = seq ? seq[k] : k;
          if (g.chars[i] === EMPTY) continue;
          if (shown >= n) {
            next = i;
            break;
          }
          s.chars[i] = g.chars[i];
          s.colors[i] = g.colors[i];
          shown++;
          last = i;
        }
        if (!code) return;
        // Typing, the cursor sits solid on the next cell; waiting to start, it blinks there.
        if (next >= 0) {
          if (local >= start || blink(local - start)) s.put(next, code, g.colors[next]);
          return;
        }
        // All in: it blinks after the last cell, in reading order, where there is an empty cell in the same row.
        if (seq || last < 0 || !blink(local - start - typing)) return;
        if ((last % cols) + 1 < cols && g.chars[last + 1] === EMPTY) s.put(last + 1, code, g.colors[last]);
      },
    };
  });
}

// --- dissolve and fade ------------------------------------------------------------------

// How much of the piece shows at t, 0 to 1, eased: in, held, out and gone, by mode, each period.
function level(t: number, period: number, mode: FxMode): number {
  const u = mod(t, period) / period;
  const ease = (k: number) => smoothstep(0, 1, k);
  if (mode === "in") return u < 0.4 ? ease(u / 0.4) : 1;
  if (mode === "out") return u < 0.6 ? 1 : 1 - ease((u - 0.6) / 0.4);
  return u < 0.3 ? ease(u / 0.3) : u < 0.6 ? 1 : u < 0.9 ? 1 - ease((u - 0.6) / 0.3) : 0;
}
// The middle of each mode's hold, as a share of the period: what a still shows.
const HELD: Record<FxMode, number> = { in: 0.7, out: 0.3, inout: 0.45 };
const MODES: readonly FxMode[] = ["in", "out", "inout"];
const MODE_WHAT: Record<FxMode, string> = { in: "in", out: "out", inout: "in and out" };

export interface DissolveOptions extends FxOptions {
  /** Seconds a cycle takes: 6. */
  period?: number;
  /**
   * "inout" (the default): in over the first 30% of each period, held, out from 60% to 90%, then gone. "in": in over the
   * first 40%, then held. "out": held, then out over the last 40%.
   */
  mode?: FxMode;
  /** How fine the noise is, in cycles a cell: 0.15, blobs about 7 cells across; higher is finer, up to 1. */
  scale?: number;
  /** Characters a cell shows as the front crosses it, from just appearing to nearly whole: ".:". "" for none. */
  edge?: string;
  /** 1. Another seed, another pattern. */
  seed?: number;
}

/**
 * The piece appearing and vanishing through noise: each cell of its ink comes and goes on its own threshold, blobs of
 * them together, with a sparse edge where the front is crossing. Held whole, it is exactly its source.
 *
 *   export default dissolve(donut);
 */
export function dissolve(src: Source, options?: DissolveOptions): KitPiece {
  const o = optionsOf(options, "dissolve");
  const period = num(o.period, "dissolve.period", 6, "seconds");
  const mode = choice(o.mode, "dissolve.mode", MODES, "inout");
  const scale = num(o.scale, "dissolve.scale", 0.15, "positive");
  if (scale > 1) fail(`dissolve.scale takes a number above 0, up to 1, not ${scale}`);
  const edge = o.edge === "" ? "" : chars(o.edge, "dissolve.edge", ".:", 1);
  const seed = num(o.seed, "dissolve.seed", 1, "whole");
  return effect("dissolve", src, o, ({ meta: m }) => {
    // Each cell's threshold: smooth noise with a little grain, ranked so the front moves at an even pace.
    const n = m.cols * m.rows, aspect = m.cell ?? 2;
    const v = new Float64Array(n);
    for (let y = 0, i = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++, i++) v[i] = 0.8 * valueNoise(x * scale, y * scale * aspect, seed) + 0.2 * hash(x, y, seed, 3);
    const at = new Float32Array(n);
    Int32Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => v[a] - v[b])
      .forEach((i, rank) => (at[i] = (rank + 0.5) / n));
    const band = edge ? 0.12 : 0;
    const codes = [...edge].map((c) => c.charCodeAt(0));
    return {
      moves: true,
      period,
      still: HELD[mode] * period,
      what: `dissolving ${MODE_WHAT[mode]}`,
      setup: () => (t, s, g) => {
        const k = level(t, period, mode);
        if (k >= 1) return copy(s, g);
        const front = k * (1 + band);
        for (let i = 0; i < n; i++) {
          if (g.chars[i] === EMPTY) continue;
          const d = front - at[i];
          if (d <= 0) continue;
          s.put(i, d >= band ? g.chars[i] : codes[Math.min(codes.length - 1, Math.floor((d / band) * codes.length))], g.colors[i]);
        }
      },
    };
  });
}

// How much ink a character puts down, 0 to 1: its place on the detailed ramp, or a guess by its kind.
const DENSE = ramps.detailed;
function density(c: number): number {
  const k = DENSE.indexOf(String.fromCharCode(c));
  if (k > 0) return k / (DENSE.length - 1);
  if (c === 0x2588) return 1; // █
  if (c === 0x2593) return 0.8; // ▓
  if (c === 0x2592) return 0.55; // ▒
  if (c === 0x2591) return 0.3; // ░
  if (c >= 0x2580 && c <= 0x259f) return 0.5; // halves, quarters and eighths of a block
  if (c >= 0x2800 && c <= 0x28ff) {
    let dots = 0;
    for (let b = c - 0x2800; b; b >>= 1) dots += b & 1;
    return 0.1 + dots / 10;
  }
  if (c >= 0x2500 && c <= 0x257f) return 0.35; // box drawing
  if (c === 0x25cf) return 0.7; // ●
  if (c === 0x2022) return 0.4; // •
  if (c === 0xb7) return 0.15; // ·
  return 0.5;
}

export interface FadeOptions extends FxOptions {
  /** Seconds a cycle takes: 6. */
  period?: number;
  /** "inout" (the default), "in" or "out", as dissolve's. */
  mode?: FxMode;
  /**
   * The ramp each character steps down toward a space: "standard", " .:-=+*#%@". A character on it starts from its own
   * place; any other from the place its density gives it, so a block steps down from "@".
   */
  ramp?: RampName | (string & {});
}

/**
 * The piece fading toward nothing and back: every character steps down the ramp to a space, dithered so the steps
 * blend. Held whole, it is exactly its source.
 *
 *   export default fade(banner("hello", { effect: "still" }), { mode: "in" });
 */
export function fade(src: Source, options?: FadeOptions): KitPiece {
  const o = optionsOf(options, "fade");
  const period = num(o.period, "fade.period", 6, "seconds");
  const mode = choice(o.mode, "fade.mode", MODES, "inout");
  const chars = ramp(o.ramp ?? "standard");
  if (chars[0] !== " ") fail(`fade.ramp starts with a space, the place every character fades to, not ${JSON.stringify(chars)}`);
  const codes = [...chars].map((c) => c.charCodeAt(0));
  const top = codes.length - 1;
  return effect("fade", src, o, () => ({
    moves: true,
    period,
    still: HELD[mode] * period,
    what: `fading ${MODE_WHAT[mode]}`,
    setup: () => {
      // Each character's place on the ramp, worked out once.
      const place = new Map<number, number>();
      const placeOf = (c: number) => {
        let k = place.get(c);
        if (k === undefined) {
          const own = codes.indexOf(c);
          place.set(c, (k = own > 0 ? own : Math.max(1, Math.round(density(c) * top))));
        }
        return k;
      };
      return (t, s, g) => {
        const k = level(t, period, mode);
        if (k >= 1) return copy(s, g);
        for (let y = 0, i = 0; y < g.rows; y++)
          for (let x = 0; x < g.cols; x++, i++) {
            if (g.chars[i] === EMPTY) continue;
            const p = placeOf(g.chars[i]);
            const step = Math.max(0, Math.min(p, Math.floor(p * k + 0.5 + bayer(x, y))));
            if (step) s.put(i, step === p && codes.indexOf(g.chars[i]) === p ? g.chars[i] : codes[step], g.colors[i]);
          }
      };
    },
  }));
}

// --- scan ----------------------------------------------------------------------------

export interface ScanOptions extends FxOptions {
  /** Seconds a cycle takes: 3. */
  period?: number;
  /** Which way the line moves: "down", "up", "right" or "left". */
  direction?: "down" | "up" | "right" | "left";
  /** The line's character: "─" across the piece for "down" and "up", "│" for "right" and "left". */
  char?: string;
  /** The line's colour as #rrggbb: by default each cell's own colour where it crosses ink, and the piece's ink elsewhere. */
  color?: string;
  /**
   * false (the default): the piece shows whole and the line crosses it, the whole period, off one edge and on at the
   * other. true: the piece shows only where the line has been, so the line reveals it over the first 60% of each
   * period, and it holds whole for the rest.
   */
  reveal?: boolean;
}

/**
 * A line sweeping across the piece, as a screen scans: over it, or revealing it.
 *
 *   export default scan(rust, { reveal: true });
 */
export function scan(src: Source, options?: ScanOptions): KitPiece {
  const o = optionsOf(options, "scan");
  const period = num(o.period, "scan.period", 3, "seconds");
  const direction = choice(o.direction, "scan.direction", ["down", "up", "right", "left"], "down");
  const across = direction === "down" || direction === "up";
  const char = chars(o.char, "scan.char", across ? "─" : "│", 1, 1).charCodeAt(0);
  const color = colour(o.color, "scan.color");
  if (o.reveal !== undefined && typeof o.reveal !== "boolean") fail(`scan.reveal takes true or false, not ${show(o.reveal)}`);
  const reveal = o.reveal ?? false;
  const forward = direction === "down" || direction === "right";
  return effect("scan", src, o, ({ meta: m, inks }) => {
    const ink = color ? inks.add(color) : -1;
    const along = across ? m.rows : m.cols;
    // The line's row or column at t, from -1 (not yet on) to `along` (gone), counted in the way it moves; null when the
    // reveal is over and the piece holds whole.
    const lineAt = (t: number): number | null => {
      const u = mod(t, period) / period;
      if (reveal) return u >= 0.6 ? null : Math.floor(-1 + (u / 0.6) * (along + 1));
      return Math.floor(-1 + u * (along + 2));
    };
    const busy = (t: number) => {
      const p = lineAt(t);
      return p !== null && (reveal || (p >= 0 && p < along));
    };
    return {
      moves: true,
      period,
      still: quiet(0, busy, period),
      what: reveal ? "revealed by a scan line" : "with a scan line passing",
      setup: () => (t, s, g) => {
        const pos = lineAt(t);
        if (pos === null) return copy(s, g);
        const line = forward ? pos : along - 1 - pos;
        for (let y = 0, i = 0; y < g.rows; y++)
          for (let x = 0; x < g.cols; x++, i++) {
            const q = across ? y : x;
            if (q === line) s.put(i, char, ink >= 0 ? ink : g.chars[i] === EMPTY ? NONE : g.colors[i]);
            else if (!reveal || (forward ? q < line : q > line)) {
              s.chars[i] = g.chars[i];
              s.colors[i] = g.colors[i];
            }
          }
      },
    };
  });
}

// --- glitch --------------------------------------------------------------------------

export interface GlitchOptions extends FxOptions {
  /** Seconds from one burst to the next: 2.5. */
  every?: number;
  /** Seconds a burst lasts: 0.35. Within it the damage changes about 16 times a second. */
  length?: number;
  /** Seconds before the first burst: 0.5. */
  first?: number;
  /** How hard a burst hits, 0 to 1: 0.5. More bands of rows slide, further, and more cells turn to junk. */
  amount?: number;
  /** The junk cells turn to: "#%&@$/\|<>". */
  chars?: string;
  /** 1. Another seed, other bursts. Every burst is worked out from t and the seed, so any frame can be drawn first. */
  seed?: number;
}

/**
 * The piece breaking up now and then: bands of rows slide sideways and cells turn to junk, for a moment, then it is
 * whole again. Between bursts it is exactly its source.
 *
 *   export default glitch(rust);
 */
export function glitch(src: Source, options?: GlitchOptions): KitPiece {
  const o = optionsOf(options, "glitch");
  const every = num(o.every, "glitch.every", 2.5, "seconds");
  const length = num(o.length, "glitch.length", 0.35, "seconds");
  const first = num(o.first, "glitch.first", 0.5, "number");
  const amount = num(o.amount, "glitch.amount", 0.5, "share");
  const junk = [...chars(o.chars, "glitch.chars", "#%&@$/\\|<>", 1)].map((c) => c.charCodeAt(0));
  const seed = num(o.seed, "glitch.seed", 1, "whole");
  return effect("glitch", src, o, ({ meta: m }) => {
    const busy = (t: number) => mod(t - first, every) < length;
    const reach = 1 + Math.round(amount * 10);
    return {
      moves: true,
      period: every,
      still: quiet(m.still ?? 0, busy, every),
      what: "glitching now and then",
      setup: () => (t, s, g) => {
        const u = mod(t - first, every);
        if (u >= length) return copy(s, g);
        // One look for each sixteenth of a second of each burst.
        const burst = Math.floor((t - first) / every), k = burst * 97 + Math.floor(u * 16);
        const shift = Math.floor(hash(seed, k, 1) * 3);
        const { cols } = g;
        for (let y = 0; y < g.rows; y++) {
          // Rows slide in bands of two, some bands only.
          const band = (y + shift) >> 1;
          const dx = hash(seed, k, 2, band) < amount * 0.7 ? Math.round((hash(seed, k, 3, band) * 2 - 1) * reach) : 0;
          for (let x = 0; x < cols; x++) {
            const from = x - dx;
            if (from < 0 || from >= cols) continue;
            const j = y * cols + from;
            if (g.chars[j] === EMPTY) continue;
            const i = y * cols + x;
            const swap = hash(seed, k, i, 4) < amount * 0.12;
            s.put(i, swap ? junk[Math.floor(hash(seed, k, i, 5) * junk.length)] : g.chars[j], g.colors[j]);
          }
        }
      },
    };
  });
}

// --- wave ----------------------------------------------------------------------------

export interface WaveOptions extends FxOptions {
  /** Cells each row sways each way: 2 for rows, 1 for columns. The piece grows by twice this so nothing is cut off. */
  amplitude?: number;
  /** Rows (or columns) from one crest to the next: 8 rows, or 16 columns. */
  wavelength?: number;
  /** Seconds for a crest to travel one wavelength: 2. */
  period?: number;
  /** "rows" (the default): rows sway from side to side. "columns": columns bob up and down. */
  axis?: "rows" | "columns";
}

/**
 * The piece swaying as a wave runs down it: each row slides sideways on a sine, or each column bobs. It grows by twice
 * the amplitude, rows sliding into the room, so nothing is cut off.
 *
 *   export default wave(banner("hello", { effect: "still" }));
 */
export function wave(src: Source, options?: WaveOptions): KitPiece {
  const o = optionsOf(options, "wave");
  const axis = choice(o.axis, "wave.axis", ["rows", "columns"], "rows");
  const rows = axis === "rows";
  const amplitude = num(o.amplitude, "wave.amplitude", rows ? 2 : 1, "positive");
  const wavelength = num(o.wavelength, "wave.wavelength", rows ? 8 : 16, "positive");
  const period = num(o.period, "wave.period", 2, "seconds");
  const room = Math.ceil(amplitude);
  return effect("wave", src, o, ({ meta: m }) => ({
    cols: m.cols + (rows ? 2 * room : 0),
    rows: m.rows + (rows ? 0 : 2 * room),
    moves: true,
    period,
    what: "swaying in a wave",
    setup: () => (t, s, g) => {
      const { cols: w, rows: h } = g;
      const lines = rows ? h : w;
      for (let k = 0; k < lines; k++) {
        const off = room + Math.round(amplitude * Math.sin(TAU * (k / wavelength - t / period)));
        for (let j = 0, n = rows ? w : h; j < n; j++) {
          const i = rows ? k * w + j : j * w + k;
          if (g.chars[i] === EMPTY) continue;
          s.put(rows ? k * s.cols + off + j : (off + j) * s.cols + k, g.chars[i], g.colors[i]);
        }
      }
    },
  }));
}

// --- rainbow ---------------------------------------------------------------------------

// A colour from its hue (degrees), saturation and lightness, 0 to 1.
function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Twelve hues round the colour wheel: deeper for paper, lighter for a dark page. rainbow()'s colours by default. */
export const hues = {
  light: Array.from({ length: 12 }, (_, i) => hsl(i * 30, 0.8, 0.4)),
  dark: Array.from({ length: 12 }, (_, i) => hsl(i * 30, 0.9, 0.66)),
} as const;

// A cycle of `n` colours: the stops faded into each other and back round to the first.
const cycle = (stops: readonly string[], n: number) => (stops.length === 1 ? Array(n).fill(stops[0]) : gradient([...stops, stops[0]], n + 1).slice(0, n));

export interface RainbowOptions extends FxOptions {
  /** The colours it cycles through, as #rrggbb, or { light, dark }: `hues`, twelve round the wheel, deeper on paper. */
  colors?: PaletteSpec;
  /** Colours in the cycle, the stops faded into each other and back to the first: 12. */
  steps?: number;
  /** Seconds for a colour to come round again: 3. */
  period?: number;
  /**
   * How far round the cycle each column (or row) is from the last: 0.03 for rainbow, a whole cycle across 33 columns;
   * 0 for hueCycle, all one colour at a time.
   */
  spread?: number;
  /** Which way the colours run: "x" across, "y" down, or "diagonal". */
  direction?: "x" | "y" | "diagonal";
}

function rainbowOf(fx: string, src: Source, options: RainbowOptions | undefined, spreadBy: number): KitPiece {
  const o = optionsOf(options, fx);
  const steps = num(o.steps, `${fx}.steps`, 12, "steps");
  const period = num(o.period, `${fx}.period`, 3, "seconds");
  const spread = num(o.spread, `${fx}.spread`, spreadBy, "number");
  const direction = choice(o.direction, `${fx}.direction`, ["x", "y", "diagonal"], "x");
  const spec = o.colors ?? hues;
  const list = (v: unknown, name: string) =>
    Array.isArray(v) && v.length && v.every(isHex) ? (v as string[]) : fail(`${name} takes a list of colours as #rrggbb, or { light, dark }, not ${show(v)}`);
  const [light, dark] = Array.isArray(spec)
    ? [list(spec, `${fx}.colors`), list(spec, `${fx}.colors`)]
    : spec && typeof spec === "object"
      ? [list((spec as { light: unknown }).light, `${fx}.colors.light`), list((spec as { dark: unknown }).dark, `${fx}.colors.dark`)]
      : fail(`${fx}.colors takes a list of colours as #rrggbb, or { light, dark }, not ${show(spec)}`);
  return effect(fx, src, o, ({ inks }) => {
    // The cycle's colours for each theme: [on a dark page, on paper].
    const at = [cycle(dark, steps).map((c) => inks.add(c)), cycle(light, steps).map((c) => inks.add(c))];
    return {
      moves: true,
      period,
      what: spread ? "in rainbow colours" : "cycling through colours",
      setup: () => (t, s, g, ctx) => {
        copy(s, g);
        if (ctx.mono) return;
        const idx = at[ctx.paper ? 1 : 0], ph = t / period;
        for (let y = 0, i = 0; y < g.rows; y++)
          for (let x = 0; x < g.cols; x++, i++) {
            if (g.chars[i] === EMPTY) continue;
            const pos = direction === "x" ? x : direction === "y" ? y : x + g.aspect * y;
            s.colors[i] = idx[Math.min(steps - 1, Math.floor(mod(pos * spread - ph, 1) * steps))];
          }
      },
    };
  });
}

/**
 * The piece's ink in bands of colour that run across it, round and round a cycle of hues. In one ink there is no colour
 * to show, and it is the source as it is.
 *
 *   export default rainbow(banner("hello", { effect: "still" }));
 */
export function rainbow(src: Source, options?: RainbowOptions): KitPiece {
  return rainbowOf("rainbow", src, options, 0.03);
}

/** rainbow() with every cell the same colour at a time, the whole piece cycling through the hues. Its spread is 0. */
export const hueCycle: typeof rainbow = (src, options) => rainbowOf("hueCycle", src, options, 0);

// --- shake ---------------------------------------------------------------------------

export interface ShakeOptions extends FxOptions {
  /** Cells it jolts by, each way: 1. The piece grows by this on every side so nothing is cut off. */
  amount?: number;
  /** Seconds from one shake to the next: 2. */
  every?: number;
  /** Seconds a shake lasts: 0.3. It jolts to a new place 20 times a second. */
  length?: number;
  /** Seconds before the first shake: 0.5. */
  first?: number;
  /** 1. Another seed, other jolts. */
  seed?: number;
}

/**
 * The piece shaking now and then, jolting a cell or so each way for a moment. Between shakes it sits still in the
 * middle of its room.
 *
 *   export default shake(banner("boom", { effect: "still" }), { amount: 2 });
 */
export function shake(src: Source, options?: ShakeOptions): KitPiece {
  const o = optionsOf(options, "shake");
  const amount = num(o.amount, "shake.amount", 1, "cells");
  const every = num(o.every, "shake.every", 2, "seconds");
  const length = num(o.length, "shake.length", 0.3, "seconds");
  const first = num(o.first, "shake.first", 0.5, "number");
  const seed = num(o.seed, "shake.seed", 1, "whole");
  return effect("shake", src, o, ({ meta: m }) => ({
    cols: m.cols + 2 * amount,
    rows: m.rows + 2 * amount,
    moves: true,
    period: every,
    still: quiet(m.still ?? 0, (t) => mod(t - first, every) < length, every),
    what: "shaking now and then",
    setup: () => (t, s, g) => {
      const u = mod(t - first, every);
      let dx = 0, dy = 0;
      if (u < length) {
        const k = Math.floor((t - first) / every) * 97 + Math.floor(u * 20);
        dx = Math.round((hash(seed, k, 1) * 2 - 1) * amount);
        dy = Math.round((hash(seed, k, 2) * 2 - 1) * amount);
        // A jolt always moves it.
        if (!dx && !dy) dx = hash(seed, k, 3) < 0.5 ? -amount : amount;
      }
      s.paste(g, amount + dx, amount + dy, { mask: null });
    },
  }));
}

// --- outline and shadow ------------------------------------------------------------------

/**
 * Line styles for an outline, as banner()'s shadows: the 16 characters of a cell by the edges that meet in it, up 1,
 * down 2, left 4, right 8.
 */
export const outlines = {
  single: " │││─┘┐┤─└┌├─┴┬┼",
  double: " ║║║═╝╗╣═╚╔╠═╩╦╬",
  rounded: " │││─╯╮┤─╰╭├─┴┬┼",
  heavy: " ┃┃┃━┛┓┫━┗┏┣━┻┳╋",
  ascii: " |||-+++-+++-+++",
} as const;

export interface OutlineOptions extends FxOptions {
  /** The line: "single", "double", "rounded", "heavy", "ascii", or 16 characters of your own, as `outlines` lays them out. */
  style?: keyof typeof outlines | (string & {});
  /** Its colour as #rrggbb: by default, on a coloured piece, the colour of the ink it runs beside. */
  color?: string;
  /**
   * Empty cells in a row, between ink on both sides, that count as inside rather than outside: 1, so the line goes
   * round words, not between them. 0 traces every gap.
   */
  gap?: number;
}

/**
 * A line traced round the outside of the piece's ink, in box drawing, joined at every corner. Holes inside the ink are
 * left alone. The piece grows by a cell on every side for it.
 *
 *   export default outline("ascii.rest", { style: "rounded" });
 */
export function outline(src: Source, options?: OutlineOptions): KitPiece {
  const o = optionsOf(options, "outline");
  const style = o.style === undefined ? outlines.single : Object.hasOwn(outlines, o.style) ? outlines[o.style as keyof typeof outlines] : o.style;
  if (typeof style !== "string" || style.length !== 16 || ![...style].every(printable))
    fail(`outline.style takes ${or(Object.keys(outlines).map((k) => JSON.stringify(k)))}, or 16 characters of your own, not ${show(o.style)}`);
  const joins = [...style].map((c) => c.charCodeAt(0));
  const color = colour(o.color, "outline.color");
  const gap = num(o.gap, "outline.gap", 1, "whole");
  if (gap < 0) fail(`outline.gap takes a whole number of cells, 0 or more, not ${gap}`);
  return effect("outline", src, o, ({ meta: m, inks }) => {
    const ink = color ? inks.add(color) : -1;
    const cols = m.cols + 2, rows = m.rows + 2;
    return {
      cols,
      rows,
      moves: false,
      what: "outlined",
      setup: () => {
        const solid = new Uint8Array(cols * rows), out = new Uint8Array(cols * rows), queue = new Int32Array(cols * rows);
        const is = (a: Uint8Array, x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows && a[y * cols + x] === 1;
        return (t, s, g) => {
          solid.fill(0);
          for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (g.chars[y * g.cols + x] !== EMPTY) solid[(y + 1) * cols + x + 1] = 1;
          // Short gaps in a row, ink on both sides, count as inside.
          if (gap)
            for (let y = 1; y < rows - 1; y++)
              for (let x = 1, last = -1; x < cols - 1; x++) {
                if (!solid[y * cols + x]) continue;
                if (last >= 0 && x - last - 1 <= gap) solid.fill(1, y * cols + last + 1, y * cols + x);
                last = x;
              }
          // The outside: every empty cell reached from the border without crossing ink.
          out.fill(0);
          let head = 0, tail = 0;
          for (let i = 0; i < cols * rows; i++) {
            const x = i % cols, y = (i / cols) | 0;
            if ((x === 0 || y === 0 || x === cols - 1 || y === rows - 1) && !solid[i]) (out[i] = 1), (queue[tail++] = i);
          }
          while (head < tail) {
            const i = queue[head++], x = i % cols, y = (i / cols) | 0;
            for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
              if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
              const j = ny * cols + nx;
              if (!out[j] && !solid[j]) (out[j] = 1), (queue[tail++] = j);
            }
          }
          // The line: outside cells touching ink, joined to a neighbour on the line when some ink touches both.
          const line = (x: number, y: number) => is(out, x, y) && (is(solid, x - 1, y - 1) || is(solid, x, y - 1) || is(solid, x + 1, y - 1) || is(solid, x - 1, y) || is(solid, x + 1, y) || is(solid, x - 1, y + 1) || is(solid, x, y + 1) || is(solid, x + 1, y + 1));
          for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
              if (!line(x, y)) continue;
              const up = line(x, y - 1) && (is(solid, x - 1, y) || is(solid, x - 1, y - 1) || is(solid, x + 1, y) || is(solid, x + 1, y - 1));
              const down = line(x, y + 1) && (is(solid, x - 1, y) || is(solid, x - 1, y + 1) || is(solid, x + 1, y) || is(solid, x + 1, y + 1));
              const left = line(x - 1, y) && (is(solid, x, y - 1) || is(solid, x - 1, y - 1) || is(solid, x, y + 1) || is(solid, x - 1, y + 1));
              const right = line(x + 1, y) && (is(solid, x, y - 1) || is(solid, x + 1, y - 1) || is(solid, x, y + 1) || is(solid, x + 1, y + 1));
              const bits = (up ? 1 : 0) | (down ? 2 : 0) | (left ? 4 : 0) | (right ? 8 : 0);
              if (!bits) continue;
              // Its colour: the one given, or the first ink beside it, across then diagonally.
              let c = ink;
              if (c < 0)
                for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                  const sx = x + dx - 1, sy = y + dy - 1;
                  if (sx >= 0 && sx < g.cols && sy >= 0 && sy < g.rows && g.chars[sy * g.cols + sx] !== EMPTY) {
                    c = g.colors[sy * g.cols + sx];
                    break;
                  }
                }
              s.put(y * cols + x, joins[bits], c < 0 ? NONE : c);
            }
          s.paste(g, 1, 1, { mask: null });
        };
      },
    };
  });
}

export interface ShadowOptions extends FxOptions {
  /** Cells the shadow falls to the right: 1. Negative falls left. */
  dx?: number;
  /** Rows it falls down: 1. Negative falls up. */
  dy?: number;
  /** Its character: "░". */
  char?: string;
  /** Its colour as #rrggbb: by default, on a coloured piece, a muted grey for the page's theme. */
  color?: string;
}

/**
 * A drop shadow: the piece's ink, moved a cell right and down, drawn behind it in a light shade. The piece grows by the
 * shadow's reach.
 *
 *   export default shadow(banner("hi", { effect: "still", shadow: "none" }), { char: "▒" });
 */
export function shadow(src: Source, options?: ShadowOptions): KitPiece {
  const o = optionsOf(options, "shadow");
  const dx = num(o.dx, "shadow.dx", 1, "shift");
  const dy = num(o.dy, "shadow.dy", 1, "shift");
  const char = chars(o.char, "shadow.char", "░", 1, 1).charCodeAt(0);
  const color = colour(o.color, "shadow.color");
  return effect("shadow", src, o, ({ meta: m, inks }) => {
    // [on a dark page, on paper]: the colour given, or a muted grey on a coloured piece, or none.
    const tone = color ? [inks.add(color), inks.add(color)] : m.palette ? [inks.add(QUIET.dark), inks.add(QUIET.light)] : [NONE, NONE];
    const cols = m.cols + Math.abs(dx), rows = m.rows + Math.abs(dy);
    const x0 = dx < 0 ? -dx : 0, y0 = dy < 0 ? -dy : 0;
    return {
      cols,
      rows,
      moves: false,
      what: "with a drop shadow",
      setup: () => (t, s, g, ctx) => {
        const c = tone[ctx.paper ? 1 : 0];
        for (let y = 0, i = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++, i++) if (g.chars[i] !== EMPTY) s.put((y + y0 + dy) * cols + x + x0 + dx, char, c);
        s.paste(g, x0, y0, { mask: null });
      },
    };
  });
}

// --- chain ---------------------------------------------------------------------------

/**
 * Effects one after another, each taking the piece the last one made: chain(donut, (p) => glint(p), (p) => wave(p)).
 * Text and grids are made pieces first.
 */
export function chain(src: Source, ...effects: ((p: Piece) => Piece)[]): Piece {
  let p = sourceOf(src, "chain");
  effects.forEach((fx, i) => {
    if (typeof fx !== "function") fail(`chain() takes effects as functions, (p) => glint(p), not ${show(fx)} as effect ${i + 1}`);
    const next = fx(p);
    if (!next || typeof next !== "object" || !next.meta || typeof next.default !== "function") fail(`chain()'s effect ${i + 1} returns a piece, not ${show(next)}`);
    p = next;
  });
  return p;
}
