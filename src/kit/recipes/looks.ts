/*
 * looks: ready-made moving pictures you ask for by name, with options in
 * words: sea(), plasma(), aurora(), flames(), rainfall(), a galaxy, a sun and
 * the rest, each { speed: "slow", scale: "large", palette: "ocean" } and
 * nothing more to work out. A look is a normal piece, so it plays wherever one does:
 * mount(), <Ascii>, <ascii-art>, svg() for a README, play() in a terminal.
 * Looks also chain, each step a word that returns a new look: mix and add
 * another, mask to a shape, a word or an image, move, zoom, rotate, warp,
 * blur, threshold, invert, posterize, then lay it over anything else. Every
 * look here is a field from ascii.rest/kit's field() and noise from its math,
 * a few lines each, so read one to make your own: the maths is in here so it
 * need not be in your piece.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { sea, plasma, waves, below } from "ascii.rest/kit";
 *
 *   export default sea({ palette: "ocean" });
 *   export const glow = plasma({ palette: "neon", speed: "slow" }).mask("HI");
 *   export const shore = waves({ speed: 0.5 }).mask(below(0.4));
 */
import type { Meta } from "../../types.ts";
import { over as overOf } from "../compose.ts";
import { EMPTY, Surface, TAU, clamp, fail, fract, hash, ramp as rampOf, sample, smoothstep, type KitPiece, type Sampler, type Source } from "../core.ts";
import { field, type FieldCell } from "../field.ts";
import { area, type Area } from "../materials.ts";
import { lcm, noise, twinkle, type NoiseOptions } from "../math.ts";
import {
  AMOUNTS,
  DENSITIES,
  HEADINGS,
  SCALES,
  isArea,
  isPiece,
  numberOf,
  optionsOf,
  seedOf,
  show,
  sizeOf as wordsOr,
  speedOf as speedIn,
  wordOf,
  type Amount,
  type Density,
  type Heading,
  type Scale,
  type Speed,
} from "./checks.ts";
import { schemeOf, type PaletteLike, type Scheme } from "./palettes.ts";

// A word from a table, or a number from lo to hi: an amount, a level, a share.
const wordOr = <W extends string>(what: string, v: unknown, words: Readonly<Record<W, number>>, def: NoInfer<W> | number, lo: number, hi: number) =>
  wordsOr(what, v, words, def, lo, hi);

// A look's speed: "still" too, as 0.
const speedOf = (what: string, v: unknown) => speedIn(what, v, { still: true });
const scaleOf = (what: string, v: unknown) => {
  const s = wordOr(`${what}'s scale`, v, SCALES, "medium", 0, 10);
  if (s <= 0) fail(`${what}'s scale takes a number above 0, not ${s}`);
  return s;
};
const densityOf = (what: string, v: unknown) => wordOr(`${what}'s density`, v, DENSITIES, "normal", 0, 10);
const DIRECTIONS = HEADINGS;

// --- a look ----------------------------------------------------------------------------------

/**
 * What a look draws at a cell: x and y as field() gives them (0, 0 in the middle, the shorter side -1 to 1, y down), the
 * time, and field()'s cell. It returns how much is there, 0 to 1, or null for nothing (the cell is not drawn).
 */
type Fn = (x: number, y: number, t: number, at: FieldCell) => number | null;

// Everything a look is, before it is made into a piece. Combining looks combines these.
interface Def {
  name: string;
  note: string;
  cols: number;
  rows: number;
  scheme: Scheme;
  ramp: string;
  // A light look (a plasma, a tunnel) is brightness filling the picture: its ramp turns round on a light page so bright
  // stays bright. Otherwise the value is how much ink, on an empty ground: stars, rain, flames.
  light: boolean;
  dither: boolean;
  // The loops of its moving parts, in seconds: its own loop is their least common multiple. Empty for a still.
  periods: readonly number[];
  fn: Fn;
}

/**
 * A look: a piece (it has meta and default, and plays wherever a piece does) that also chains. Each method returns a new
 * look and leaves this one as it was; the result keeps this look's size, palette and characters.
 *
 *   plasma().mask(heart()).zoom("in")
 *   clouds().mix(sea(), "half")
 */
export class Look implements KitPiece {
  readonly meta: Meta;
  readonly default: KitPiece["default"];
  readonly #def: Def;

  constructor(def: Def) {
    this.#def = def;
    const loop = def.periods.length ? lcm(def.periods) : undefined;
    // On a light page a light look's ramp is turned round, bright being little ink, so its colours turn round with it.
    const light = def.light ? [...def.scheme.light].reverse() : def.scheme.light;
    const one = def.scheme.light.length === 1 && def.scheme.dark.length === 1;
    // A glyph a part chose for itself (a star, a raindrop) is only drawn where something is there: a threshold or a
    // mask that took its value away takes the glyph too.
    const fn = def.fn;
    const drawn: Fn = (x, y, t, at) => {
      const v = fn(x, y, t, at);
      if (at.char !== undefined && !(v !== null && v > 0)) at.char = undefined;
      return v;
    };
    const made = field(
      {
        name: def.name,
        note: def.note,
        category: "generative",
        cols: def.cols,
        rows: def.rows,
        fps: def.periods.length ? 24 : 0,
        ramp: def.ramp,
        colors: { light, dark: def.scheme.dark },
        steps: one ? 1 : 16,
        invert: def.light ? "auto" : false,
        dither: def.dither,
        ...(loop ? { loop } : {}),
      },
      drawn,
    );
    this.meta = made.meta;
    this.default = made.default;
  }

  // A new look like this one with some of it changed.
  #with(change: Partial<Def>): Look {
    return new Look({ ...this.#def, ...change });
  }

  // The definition of another look, checked.
  static #of(what: string, v: unknown): Def {
    if (!(v instanceof Look)) fail(`${what} takes another look, such as waves() or clouds(), not ${show(v)}`);
    return v.#def;
  }

  /**
   * This look and another, `amount` of the way to the other: "half" (the default, 0.5), "a little" (0.25), "mostly"
   * (0.75), or a number 0 to 1. Where neither draws anything, nothing is drawn.
   */
  mix(other: Look, amount: "a little" | "half" | "mostly" | number = "half"): Look {
    const b = Look.#of("mix()", other);
    const k = wordOr("mix()'s amount", amount, { "a little": 0.25, half: 0.5, mostly: 0.75 }, "half", 0, 1);
    const fa = this.#def.fn, fb = b.fn;
    return this.#with({
      periods: [...this.#def.periods, ...b.periods],
      fn: (x, y, t, at) => {
        const va = fa(x, y, t, at), vb = fb(x, y, t, at);
        if (va === null && vb === null) return null;
        return (va ?? 0) * (1 - k) + (vb ?? 0) * k;
      },
    });
  }

  /** Another look added on top: bright where either is, brightest where both are. `amount` of the other: 1. */
  add(other: Look, amount: Amount = 1): Look {
    const b = Look.#of("add()", other);
    const k = wordOr("add()'s amount", amount, AMOUNTS, 1, 0, 4);
    const fa = this.#def.fn, fb = b.fn;
    return this.#with({
      periods: [...this.#def.periods, ...b.periods],
      fn: (x, y, t, at) => {
        const va = fa(x, y, t, at), vb = fb(x, y, t, at);
        if (va === null && vb === null) return null;
        const v = (va ?? 0) + (vb ?? 0) * k;
        return v > 1 ? 1 : v;
      },
    });
  }

  /** This look shaded by another: only bright where both are, as light through a pattern. */
  multiply(other: Look): Look {
    const b = Look.#of("multiply()", other);
    const fa = this.#def.fn, fb = b.fn;
    return this.#with({
      periods: [...this.#def.periods, ...b.periods],
      fn: (x, y, t, at) => {
        const va = fa(x, y, t, at), vb = fb(x, y, t, at);
        if (va === null || vb === null) return null;
        return va * vb;
      },
    });
  }

  /**
   * Only the part of this look inside a shape; nothing is drawn outside it. The shape is any of: below(0.4) and
   * above(0.3), the bottom or top share of the picture; a word, "HI", in big letters; a shape from ascii.rest/kit's
   * materials, such as heart(), ball(), star() or cup(), or area.rect() and its kin; any piece or block of text, its inked
   * cells, centred (a banner, a logo from fromImage(), another look); outside(shape) for the rest; or a function of x,
   * y, t and the cell that returns true where to draw.
   */
  mask(shape: MaskLike): Look {
    const m = maskOf("mask()", shape);
    const f = this.#def.fn;
    return this.#with({ periods: [...this.#def.periods, ...m.periods], fn: (x, y, t, at) => (m.test(x, y, t, at) ? f(x, y, t, at) : null) });
  }

  /**
   * The look sliding one way: "left" (the default), "right", "up", "down" or a diagonal such as "up-left", at `speed`
   * ("normal": about a picture's height every 8 seconds). It comes round seamlessly, so it loops.
   */
  move(direction: Heading = "left", speed: Speed | "still" = "normal"): Look {
    wordOf("move()", direction, Object.keys(DIRECTIONS) as Heading[], "left");
    const s = speedOf("move()", speed);
    if (s === 0) return this;
    const [dx, dy] = DIRECTIONS[direction];
    const P = 8 / s, D = 2;
    const f = this.#def.fn;
    // Two copies a loop apart, crossfaded: each slides on at the same speed and the one ending fades as the next comes
    // in, so the end of the loop is its start. The contrast lost in the middle of the fade is put back.
    return this.#with({
      periods: [...this.#def.periods, P],
      fn: (x, y, t, at) => {
        const k = fract(t / P), w = k * k * (3 - 2 * k);
        const a = f(x - dx * D * k, y - dy * D * k, t, at), b = f(x - dx * D * (k - 1), y - dy * D * (k - 1), t, at);
        if (a === null && b === null) return null;
        const v = (a ?? 0) * (1 - w) + (b ?? 0) * w, lift = 1 / Math.sqrt(w * w + (1 - w) * (1 - w));
        return clamp(0.5 + (v - 0.5) * lift);
      },
    });
  }

  /** Closer or further: "in" (twice as big), "out" (half as big), or a number of times as big: 2 is twice. */
  zoom(amount: "in" | "out" | number = "in"): Look {
    const k = wordOr("zoom()", amount, { in: 2, out: 0.5 }, "in", 0.05, 20);
    if (k <= 0.05 && k !== 0.05) fail(`zoom() takes a number above 0, not ${k}`);
    const f = this.#def.fn;
    return this.#with({ fn: (x, y, t, at) => f(x / k, y / k, t, at) });
  }

  /**
   * Turned round its middle. A speed, "slow" (a turn in 16 seconds, the default), "normal" (8) or "fast" (4), or a
   * number (1 is normal, below 0 the other way), spins it for ever, looping each turn; "eighth", "quarter" or "half"
   * turns it that far and holds it there.
   */
  rotate(by: "slow" | "normal" | "fast" | "eighth" | "quarter" | "half" | number = "slow"): Look {
    const f = this.#def.fn;
    const fixed = { eighth: 1 / 8, quarter: 1 / 4, half: 1 / 2 } as const;
    if (typeof by === "string" && Object.hasOwn(fixed, by)) {
      const a = TAU * fixed[by as keyof typeof fixed], c = Math.cos(a), s = Math.sin(a);
      return this.#with({ fn: (x, y, t, at) => f(c * x + s * y, -s * x + c * y, t, at) });
    }
    const v = typeof by === "number" ? by : wordOr("rotate()", by, { slow: 0.5, normal: 1, fast: 2 }, "slow", -10, 10);
    if (!Number.isFinite(v) || v < -10 || v > 10) fail(`rotate() takes "slow", "normal", "fast", "eighth", "quarter", "half", or a speed from -10 to 10, not ${show(by)}`);
    if (v === 0) return this;
    const P = 8 / Math.abs(v), sign = Math.sign(v);
    return this.#with({
      periods: [...this.#def.periods, P],
      fn: (x, y, t, at) => {
        const a = sign * TAU * fract(t / P), c = Math.cos(a), s = Math.sin(a);
        return f(c * x + s * y, -s * x + c * y, t, at);
      },
    });
  }

  /** Bent, as if seen through moving water or heat haze: `amount` "subtle", "medium" (the default) or "strong". */
  warp(amount: Amount = "medium"): Look {
    const k = 0.18 * wordOr("warp()", amount, AMOUNTS, "medium", 0, 5);
    const P = 8, nx = noise({ size: [0.7, 0.7], detail: 2, period: P, morph: 1 / 4 }), ny = noise({ size: [0.7, 0.7], detail: 2, period: P, morph: 1 / 4, seed: 9 });
    const f = this.#def.fn;
    return this.#with({
      periods: [...this.#def.periods, P],
      fn: (x, y, t, at) => f(x + k * (nx(x, y, t) - 0.5) * 2, y + k * (ny(x, y, t) - 0.5) * 2, t, at),
    });
  }

  /** Softened, each cell the average of those round it: `amount` "subtle", "medium" (the default), "strong", or cells. */
  blur(amount: Amount = "medium"): Look {
    const r = wordOr("blur()", amount, { subtle: 0.75, medium: 1.25, strong: 2 }, "medium", 0, 8);
    if (r === 0) return this;
    const f = this.#def.fn;
    // Nine samples: the cell and eight round it, nearer ones counting more.
    const taps = [[0, 0, 4], [1, 0, 2], [-1, 0, 2], [0, 1, 2], [0, -1, 2], [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1]] as const;
    return this.#with({
      fn: (x, y, t, at) => {
        const cw = (at.width / at.cols) * r, rh = (at.height / at.rows) * r;
        let sum = 0, weight = 0, any = false;
        for (const [i, j, w] of taps) {
          const v = f(x + i * cw, y + j * rh, t, at);
          if (v !== null) any = true;
          sum += (v ?? 0) * w;
          weight += w;
        }
        // A blur reads by its ramp: a character a sample picked for itself is not kept.
        at.char = undefined;
        return any ? sum / weight : null;
      },
    });
  }

  /** Hard edged: full where the look is above `level`, empty where it is below. "low" 0.3, "half" 0.5 (the default), "high" 0.7, or 0 to 1. */
  threshold(level: "low" | "half" | "high" | number = "half"): Look {
    const k = wordOr("threshold()", level, { low: 0.3, half: 0.5, high: 0.7 }, "half", 0, 1);
    const f = this.#def.fn;
    return this.#with({
      fn: (x, y, t, at) => {
        const v = f(x, y, t, at);
        return v === null ? null : v >= k ? 1 : 0;
      },
    });
  }

  /** Turned inside out: bright where it was dark and dark where it was bright. Where nothing was drawn, nothing is. */
  invert(): Look {
    const f = this.#def.fn;
    return this.#with({
      fn: (x, y, t, at) => {
        const v = f(x, y, t, at);
        return v === null ? null : 1 - v;
      },
    });
  }

  /** In a few flat bands instead of a smooth fade, as a poster is printed: `levels` from 2 to 16, 4 by default. */
  posterize(levels = 4): Look {
    if (!Number.isInteger(levels) || levels < 2 || levels > 16) fail(`posterize() takes a whole number of levels from 2 to 16, not ${show(levels)}`);
    const f = this.#def.fn;
    return this.#with({
      fn: (x, y, t, at) => {
        const v = f(x, y, t, at);
        return v === null ? null : Math.min(levels - 1, Math.floor(v * levels)) / (levels - 1);
      },
    });
  }

  /** The same look in other colours: a palette's name such as "ocean", colours of your own faint to strong, or { light, dark }. */
  palette(colors: PaletteLike): Look {
    return this.#with({ scheme: schemeOf("palette()", colors) });
  }

  /** The same look in other characters: a ramp's name, "blocks", "dots" and the rest, or two or more of your own, faint to strong. */
  ramp(chars: string): Look {
    return this.#with({ ramp: rampOf(chars) });
  }

  /** The same look at another size, in columns and rows. */
  size(cols: number, rows: number): Look {
    return this.#with(sizeOf("size()", { cols, rows }, this.#def));
  }

  /** The same look with another name, and a line saying what it shows. */
  named(name: string, note?: string): Look {
    if (typeof name !== "string" || !name.trim()) fail(`named() takes a name, such as "harbour", not ${show(name)}`);
    return this.#with({ name, note: note ?? name });
  }

  /** This look laid over another piece, in that piece's size: its empty cells let the piece show. Options as compose's over(). */
  over(bottom: Source, o?: Parameters<typeof overOf>[2]): KitPiece {
    return overOf(this, bottom, o);
  }

  /** Another piece laid over this look, centred: a banner on a starfield, a logo on a sea. Options as compose's over(). */
  behind(top: Source, o?: Parameters<typeof overOf>[2]): KitPiece {
    return overOf(top, this, o);
  }
}

// --- masks -------------------------------------------------------------------------------------

/** A shape that mask() keeps a look inside. Make one with below(), above(), letters() or outside(). */
export interface Mask {
  readonly kind: "mask";
  /** The loops of anything in it that moves, in seconds. */
  readonly periods: readonly number[];
  /** True for a cell to draw. */
  test(x: number, y: number, t: number, at: FieldCell): boolean;
}

/** Anything mask() takes: a Mask, a material's shape (an Area), a piece, a word, or a function that returns true where to draw. */
export type MaskLike = Mask | Area | Source | ((x: number, y: number, t: number, at: FieldCell) => boolean);

const isMask = (v: unknown): v is Mask => v !== null && typeof v === "object" && (v as Mask).kind === "mask" && typeof (v as Mask).test === "function";

// A mask's test worked out once for each picture size.
function perSize<T>(make: (cols: number, rows: number) => T): (at: FieldCell) => T {
  let key = -1, last: T | undefined;
  return (at) => {
    const k = at.cols * 1000 + at.rows;
    if (k !== key || last === undefined) (last = make(at.cols, at.rows)), (key = k);
    return last;
  };
}

function maskOf(what: string, v: unknown): Mask {
  if (isMask(v)) return v;
  if (typeof v === "string") return letters(v);
  if (isArea(v)) {
    const placed = perSize((cols, rows) => v.place(cols, rows));
    return { kind: "mask", periods: [], test: (_x, _y, _t, at) => placed(at).test(at.col + 0.5, at.row + 0.5) };
  }
  if (typeof v === "function") return { kind: "mask", periods: [], test: (x, y, t, at) => !!(v as (x: number, y: number, t: number, at: FieldCell) => boolean)(x, y, t, at) };
  if (v instanceof Surface || isPiece(v)) {
    const player: Sampler = sample(v as Source);
    const loop = player.meta.fps > 0 ? player.meta.loop : undefined;
    let when = NaN, grid: Surface | null = null;
    return {
      kind: "mask",
      periods: loop ? [loop] : [],
      test: (_x, _y, t, at) => {
        // Played once a frame, not once a cell, and centred on the look.
        if (t !== when || !grid) (grid = player.at(t, { mono: true })), (when = t);
        const c = at.col - ((at.cols - grid.cols) >> 1), r = at.row - ((at.rows - grid.rows) >> 1);
        return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.chars[r * grid.cols + c] !== EMPTY;
      },
    };
  }
  return fail(`${what} takes a shape: below(0.4), above(0.3), a word such as "HI", a material's shape such as heart(), a piece, outside(...) of one of these, or a function (x, y, t) => true where to draw, not ${show(v)}`);
}

/** The bottom `share` of the picture, 0 to 1: below(0.4) is its bottom 40%. "third" and "half" are words for 1/3 and 1/2. */
export function below(share: "third" | "half" | number): Mask {
  const k = wordOr("below()", share, { third: 1 / 3, half: 1 / 2 }, "half", 0, 1);
  return { kind: "mask", periods: [], test: (_x, _y, _t, at) => at.v >= 1 - k };
}

/** The top `share` of the picture, 0 to 1: above(0.3) is its top 30%. "third" and "half" are words for 1/3 and 1/2. */
export function above(share: "third" | "half" | number): Mask {
  const k = wordOr("above()", share, { third: 1 / 3, half: 1 / 2 }, "half", 0, 1);
  return { kind: "mask", periods: [], test: (_x, _y, _t, at) => at.v < k };
}

/** Everywhere a shape is not: outside(ball()) keeps a look round a ball and leaves the ball empty. Takes what mask() takes. */
export function outside(shape: MaskLike): Mask {
  const m = maskOf("outside()", shape);
  return { kind: "mask", periods: m.periods, test: (x, y, t, at) => !m.test(x, y, t, at) };
}

/**
 * A word in big letters, as large as fits the picture, centred: a look masked by it fills the letters. `big` sets the
 * letters' size instead, a whole number from 1 (5 rows tall) to 8.
 */
export function letters(text: string, o?: { big?: number }): Mask {
  if (typeof text !== "string" || !text.trim() || text.includes("\n")) fail(`letters() takes a word or a few on one line, such as "HELLO", not ${show(text)}`);
  const opts = optionsOf("letters()", o, ["big"]);
  if (opts.big !== undefined && !(Number.isInteger(opts.big) && opts.big >= 1 && opts.big <= 8)) fail(`letters()'s big takes a whole number from 1 to 8, not ${show(opts.big)}`);
  // Checked now: a word the letters can't draw throws here, not on the first frame.
  area.text(text, { big: 1 });
  const placed = perSize((cols, rows) => {
    let big = opts.big ?? 1;
    if (opts.big === undefined)
      for (let b = 8; b >= 1; b--) {
        const p = area.text(text, { big: b }).place(cols, rows);
        if (p.x1 - p.x0 <= cols - 2 && p.y1 - p.y0 <= rows - 2) {
          big = b;
          break;
        }
      }
    return area.text(text, { big }).place(cols, rows);
  });
  return { kind: "mask", periods: [], test: (_x, _y, _t, at) => placed(at).test(at.col + 0.5, at.row + 0.5) };
}

// --- making a look -------------------------------------------------------------------------------

/** What every look takes. Each look's own options are listed on it. */
export interface LookOptions {
  /** Its colours: a palette's name ("ocean", "sunset", "neon" and the rest), one #rrggbb, colours faint to strong, or { light, dark }. Each look has its own default. */
  palette?: PaletteLike;
  /** How fast it moves: "slow", "normal" (the default), "fast", "still", or a number, 1 being normal and 2 twice as fast. */
  speed?: Speed | "still";
  /** Seconds for one loop, over speed: each look says its own at normal speed. */
  period?: number;
  /** How big its features are: "small", "medium" (the default), "large", "huge", or a number, 1 being medium. */
  scale?: Scale;
  /** Its characters, faint to strong: a ramp's name ("standard", "blocks", "dots" and the rest) or two or more of your own. Each look has its own default. */
  ramp?: string;
  /** Ordered dithering between neighbouring characters, for smooth fades: false for most looks. */
  dither?: boolean;
  /** Its size: 64 columns by 24 rows. */
  cols?: number;
  rows?: number;
  /** Its name, the look's own by default, and one line saying what it shows. */
  name?: string;
  note?: string;
}

const COMMON = ["palette", "speed", "period", "scale", "ramp", "dither", "cols", "rows", "name", "note"] as const;

function sizeOf(what: string, o: { cols?: unknown; rows?: unknown }, def: { cols: number; rows: number }): { cols: number; rows: number } {
  const cols = o.cols ?? def.cols, rows = o.rows ?? def.rows;
  if (!Number.isInteger(cols) || (cols as number) < 1 || (cols as number) > 320) fail(`${what} takes cols as a whole number from 1 to 320, not ${show(cols)}`);
  if (!Number.isInteger(rows) || (rows as number) < 1 || (rows as number) > 120) fail(`${what} takes rows as a whole number from 1 to 120, not ${show(rows)}`);
  return { cols: cols as number, rows: rows as number };
}

/**
 * What a look of your own draws at each cell: x and y as field() gives them (0, 0 in the middle, the shorter side
 * -1 to 1, y down), t in seconds, and field()'s cell. It returns how much is there, 0 to 1, or null for nothing.
 */
export type LookFn = Fn;

/** What look() hands a look's body: its options worked out, and helpers that keep it looping. */
export interface LookKit {
  /** The scale asked for as a number: 1 for "medium", 1.6 for "large". Divide x and y by it. */
  scale: number;
  /** The speed asked for as a number: 1 for "normal", 0 for "still". */
  speed: number;
  /** The look's loop in seconds at this speed, 0 when still. */
  period: number;
  /** Where in its loop t is, 0 up to 1, always 0 when still: TAU * phase(t) in a sine, times a whole number, loops. */
  phase(t: number): number;
  /**
   * Noise that loops with the look: `travel` [x, y] is how far it slides in one loop, or `change` how many times it
   * turns into new shapes in place (1); `size`, `kind`, `detail` and `seed` as math's noise(), in the units of x and
   * y. It holds still when the look does.
   */
  noise(o?: NoiseOptions & { travel?: readonly [number, number]; change?: number }): (x: number, y: number, t: number) => number;
  /** The column x falls in, as a fraction, 0 at the left edge: Math.floor() it for the cell. */
  column(x: number, at: FieldCell): number;
  /** The row y falls in, as a fraction, 0 at the top edge. */
  row(y: number, at: FieldCell): number;
}

/** How a look of your own is made when its user asks for nothing: each has a default. */
export interface LookRecipe {
  /** One line saying what it shows: its name by default. */
  note?: string;
  /** Its palette: "mono" by default. */
  palette?: PaletteLike;
  /** Its characters, faint to strong: "standard" by default. */
  ramp?: string;
  /**
   * true for brightness that fills the picture, such as a plasma: the ramp turns round on a light page so bright stays
   * bright. false (the default) for ink on an empty ground, such as stars or flames.
   */
  light?: boolean;
  /** Its loop at normal speed, in seconds: 8. speed: "slow" doubles it, "fast" halves it. */
  period?: number;
  /** Dithering by default: false. */
  dither?: boolean;
  /** The names of the options of its own that it takes besides LookOptions, so a misspelt one throws: none. */
  options?: readonly string[];
}

/**
 * A look of your own, made the way every look here is: a name, the options its user passed, how it looks by default,
 * and a body that is given a LookKit and the options once and returns what each cell is. speed, scale, palette, ramp,
 * size, name and note are worked out and checked for you, and the result chains like any look.
 *
 *   export const embers = (o?: LookOptions) =>
 *     look("embers", o, { palette: "fire", period: 4 }, (k) => {
 *       const n = k.noise({ size: [0.3, 0.3], travel: [0, -3] });
 *       return (x, y, t) => n(x, y, t) * (0.5 + 0.5 * y);
 *     });
 */
export function look<O extends LookOptions>(name: string, o: O | undefined, how: LookRecipe, body: (k: LookKit, o: O) => LookFn): Look {
  if (typeof name !== "string" || !name.trim()) fail(`look() takes a name first, such as "embers", not ${show(name)}`);
  if (how === null || typeof how !== "object" || Array.isArray(how)) fail(`look() takes how it looks third, such as { palette: "fire", period: 4 }, not ${show(how)}`);
  if (typeof body !== "function") fail(`look() takes a body last: (k, options) => (x, y, t) => a value 0 to 1, not ${show(body)}`);
  const what = `${name}()`;
  const opts = optionsOf(what, o, [...COMMON, ...(how.options ?? [])]);
  const scale = scaleOf(what, opts.scale);
  const base = how.period ?? 8;
  if (!(typeof base === "number" && Number.isFinite(base) && base > 0 && base <= 60)) fail(`look()'s period takes seconds above 0, up to 60, not ${show(base)}`);
  // A period of the user's own wins over speed, as in every recipe; the speed is then what that period makes it.
  const own = opts.period === undefined ? undefined : numberOf(`${what}'s period`, opts.period, base, 0.05, 60);
  const speed = own === undefined ? speedOf(what, opts.speed) : base / own;
  const period = own ?? (speed > 0 ? base / speed : 0);
  if (period > 600) fail(`${what}'s speed is too slow to loop: use ${+(base / 600).toFixed(3)} or more, or "still"`);
  if (opts.dither !== undefined && typeof opts.dither !== "boolean") fail(`${what}'s dither takes true or false, not ${show(opts.dither)}`);
  if (opts.name !== undefined && (typeof opts.name !== "string" || !opts.name.trim())) fail(`${what}'s name takes a line of text, not ${show(opts.name)}`);
  if (opts.note !== undefined && (typeof opts.note !== "string" || !opts.note.trim() || opts.note.length > 72)) fail(`${what}'s note takes one line of 1 to 72 characters, not ${show(opts.note)}`);
  const kit: LookKit = {
    scale,
    speed,
    period,
    phase: period ? (t) => fract(t / period) : () => 0,
    noise: (n = {}) => {
      const { travel, change, ...rest } = n;
      if (!period) return noise({ ...rest, morph: 0 });
      if (travel) return noise({ ...rest, drift: [travel[0] / period, travel[1] / period], period });
      return noise({ ...rest, morph: (change ?? 1) / period, period });
    },
    column: (x, at) => ((x + at.width / 2) / at.width) * at.cols,
    row: (y, at) => ((y + at.height / 2) / at.height) * at.rows,
  };
  const fn = body(kit, opts);
  if (typeof fn !== "function") fail(`${what}'s body returns what each cell is, (x, y, t) => a value 0 to 1, not ${show(fn)}`);
  return new Look({
    name: opts.name ?? name,
    note: opts.note ?? how.note ?? name.slice(0, 72),
    ...sizeOf(what, opts, { cols: 64, rows: 24 }),
    scheme: schemeOf(`${what}'s palette`, opts.palette ?? how.palette ?? "mono"),
    ramp: rampOf(opts.ramp ?? how.ramp ?? "standard"),
    light: how.light ?? false,
    dither: opts.dither ?? how.dither ?? false,
    periods: period ? [period] : [],
    fn,
  });
}

// --- the looks ---------------------------------------------------------------------------------

/** Rolling bands of water, crests wandering as they travel `to` "right" (the default) or "left". Ocean blues, " .-~≈" by default. */
export function waves(o?: LookOptions & { to?: "left" | "right" }): Look {
  return look("waves", o, { options: ["to"], note: "rolling rows of waves", palette: "ocean", ramp: " .-~≈", light: false, period: 4 }, (k, opts) => {
    const d = wordOf("waves()'s to", opts.to, ["left", "right"], "right") === "right" ? 1 : -1;
    return (x, y, t) => {
      const a = TAU * k.phase(t), X = x / k.scale, Y = y / k.scale;
      // Rows of crests rolling down the picture, each bent by two sines travelling across it.
      const v = 0.5 + 0.5 * Math.sin(Y * 11 - a + 1.1 * Math.sin(X * 3 - d * a + Y * 2) + 0.45 * Math.sin(X * 7 - Y * 3 - 2 * d * a));
      return v * v * (0.55 + 0.45 * v);
    };
  });
}

/**
 * The open sea to the horizon: swell coming in, larger and brighter near, finer far off, an empty sky above.
 * `horizon` "high", "middle" (the default) or "low". Ocean blues by default.
 */
export function sea(o?: LookOptions & { horizon?: "high" | "middle" | "low" }): Look {
  return look("sea", o, { options: ["horizon"], note: "the open sea to the horizon", palette: "ocean", ramp: " .-~=≈", light: false, period: 8 }, (k, opts) => {
    const h = { high: -0.55, middle: -0.25, low: 0.1 }[wordOf("sea()'s horizon", opts.horizon, ["high", "middle", "low"], "middle")];
    const swell = k.noise({size: [1.1 * k.scale, 0.22 * k.scale], detail: 3, travel: [0, -2.2] });
    return (x, y, t) => {
      if (y < h) return null;
      // Depth grows towards the horizon; the sea is sampled across and into the distance at that depth, so near swells
      // are long and far ones are fine lines.
      const z = 0.5 / (y - h + 0.05);
      const n = swell(x * z, z, t);
      const near = clamp(1.1 - z / 8);
      return clamp(smoothstep(0.3, 0.85, n) * (0.45 + 0.55 * near) + 0.12 * near);
    };
  });
}

/** The demo-scene plasma: soft interference blobs drifting through the palette. Sunset colours by default. */
export function plasma(o?: LookOptions): Look {
  return look("plasma", o, { note: "soft interference blobs", palette: "sunset", ramp: "standard", light: true, period: 8 }, (k) => (x, y, t) => {
    const a = TAU * k.phase(t), X = x / k.scale, Y = y / k.scale;
    const v = Math.sin(X * 3 + a) + Math.sin(Y * 4 - 2 * a) + Math.sin((X + Y) * 2.5 + 3 * a) + Math.sin(Math.hypot(X - Math.sin(a), Y - 0.5 * Math.cos(2 * a)) * 6 - 4 * a);
    return 0.5 + 0.5 * Math.sin(v * 1.3);
  });
}

/** Northern lights: curtains hanging from a wandering edge, streaked and fading downwards, over an empty sky. Aurora colours by default. */
export function aurora(o?: LookOptions): Look {
  return look("aurora", o, { note: "curtains of northern lights", palette: "aurora", ramp: " .:|!I", light: false, period: 8 }, (k) => {
    const edge = k.noise({size: [1.6 * k.scale, 1], detail: 2, change: 1.5 });
    const rays = k.noise({size: [0.07 * k.scale, 3], detail: 2, travel: [1.2, 0] });
    const length = k.noise({size: [0.8 * k.scale, 1], detail: 1, change: 1, seed: 5 });
    return (x, y, t) => {
      const top = -0.85 + 0.75 * edge(x, 0, t);
      const d = (y - top) / (0.5 + 0.9 * length(x, 0, t));
      if (d < -0.15) return 0;
      if (d < 0) return 0.35 * (1 + d / 0.15);
      const fall = (1 - Math.min(1, d)) ** 1.6;
      return clamp(fall * (0.35 + 0.85 * rays(x, y * 0.1, t)));
    };
  });
}

/** Flames licking up from the bottom of the picture, white hot at their roots. Fire colours by default. */
export function flames(o?: LookOptions): Look {
  return look("flames", o, { note: "flames rising from the bottom", palette: "fire", ramp: " .:-=+*#%@", light: false, period: 4 }, (k) => {
    const n = k.noise({size: [0.3 * k.scale, 0.55 * k.scale], detail: 3, travel: [0, -4.4] });
    const tongues = k.noise({size: [0.45 * k.scale, 1.2], detail: 1, travel: [0, -1.6], seed: 2 });
    return (x, y, t, at) => {
      const up = (at.height / 2 - y) / at.height; // 0 at the bottom, 1 at the top
      // How high the flames reach here: tall tongues and low gaps along the bottom.
      const reach = 0.35 + 0.6 * tongues(x, 0, t);
      return clamp((n(x, y, t) * 0.7 + 0.55) * (1 - up / reach) * 1.25);
    };
  });
}

/** Clouds drifting across, soft edged, in an empty sky, `to` "right" (the default) or "left". Mono greys by default. */
export function clouds(o?: LookOptions & { to?: "left" | "right" }): Look {
  return look("clouds", o, { options: ["to"], note: "clouds drifting across", palette: "mono", ramp: " .:-=+*#", light: false, period: 16 }, (k, opts) => {
    const d = wordOf("clouds()'s to", opts.to, ["left", "right"], "right") === "right" ? 1 : -1;
    const n = k.noise({size: [1.1 * k.scale, 0.75 * k.scale], detail: 3, travel: [3 * d, 0] });
    return (x, y, t) => smoothstep(0.5, 0.88, n(x, y, t));
  });
}

/** A plume of smoke curling up from the bottom middle, spreading and thinning as it rises. Mono greys by default. */
export function plume(o?: LookOptions): Look {
  return look("plume", o, { note: "a plume of smoke curling up", palette: "mono", ramp: " .:-=+*", light: false, period: 8 }, (k) => {
    const n = k.noise({size: [0.4 * k.scale, 0.4 * k.scale], detail: 2, travel: [0, -2.6] });
    const sway = k.noise({size: [1, 0.9], detail: 1, travel: [0, -2.6], seed: 3 });
    return (x, y, t, at) => {
      const up = (at.height / 2 - y) / at.height;
      // It leans and curls as it rises, wider and fainter the higher it goes.
      const width = (0.1 + 0.6 * up) * k.scale;
      const cx = (sway(0, y, t) - 0.5) * 1.4 * up;
      const body = Math.exp(-(((x - cx) / width) ** 2));
      return clamp(body * smoothstep(0.2, 0.75, n(x, y, t)) * (1.2 - up * 0.8));
    };
  });
}

/** Rings spreading out over water from `drops` places (1, the middle, by default), crossing where they meet. Ocean blues by default. */
export function ripple(o?: LookOptions & { drops?: number; seed?: number }): Look {
  return look("ripple", o, { options: ["drops", "seed"], note: "rings spreading over water", palette: "ocean", ramp: " .-~=", light: false, period: 4 }, (k, opts) => {
    const drops = opts.drops ?? 1;
    if (!Number.isInteger(drops) || drops < 1 || drops > 8) fail(`ripple()'s drops takes a whole number from 1 to 8, not ${show(drops)}`);
    const seed = seedOf("ripple()", opts.seed);
    const at = Array.from({ length: drops }, (_, i) => (drops === 1 ? [0, 0] : [(hash(seed, i, 1) - 0.5) * 2, (hash(seed, i, 2) - 0.5) * 1.4]));
    return (x, y, t) => {
      const a = TAU * k.phase(t);
      let v = 0;
      for (const [cx, cy] of at) {
        const r = Math.hypot(x - cx, y - cy) / k.scale;
        // Two rings go out from each drop a loop.
        v += Math.max(0, Math.cos(r * 16 - 2 * a)) ** 2 * Math.exp(-r * 1.1);
      }
      return clamp(v / Math.sqrt(drops));
    };
  });
}

/** Rings flowing from the middle without end, `to` "out" (the default) or "in". Candy colours by default. */
export function rings(o?: LookOptions & { to?: "in" | "out" }): Look {
  return look("rings", o, { options: ["to"], note: "rings flowing out from the middle", palette: "candy", ramp: "standard", light: true, period: 4 }, (k, opts) => {
    const d = wordOf("rings()'s to", opts.to, ["in", "out"], "out") === "out" ? 1 : -1;
    return (x, y, t) => 0.5 + 0.5 * Math.sin((Math.hypot(x, y) / k.scale) * 12 - d * 2 * TAU * k.phase(t));
  });
}

/** Flying down an endless tunnel of tiles, dark in the distance. Neon colours by default. */
export function tunnel(o?: LookOptions): Look {
  return look("tunnel", o, { note: "flying down an endless tunnel", palette: "neon", ramp: "standard", light: true, period: 2 }, (k) => (x, y, t) => {
    const r = Math.hypot(x, y) + 1e-6, depth = (0.6 * k.scale) / r;
    // Hoops coming towards you, one a loop, ribbed round the wall, and dark far down the middle.
    const hoops = 0.5 + 0.5 * Math.cos(TAU * (depth - k.phase(t)));
    const ribs = 0.65 + 0.35 * Math.cos(Math.atan2(y, x) * 10);
    return clamp(hoops ** 1.5 * ribs * smoothstep(0.08, 0.9, r));
  });
}

/** A spiral of `arms` (2 by default) turning round the middle. Candy colours by default. */
export function spiral(o?: LookOptions & { arms?: number }): Look {
  return look("spiral", o, { options: ["arms"], note: "a spiral turning", palette: "candy", ramp: "standard", light: true, period: 8 }, (k, opts) => {
    const arms = opts.arms ?? 2;
    if (!Number.isInteger(arms) || arms < 1 || arms > 12) fail(`spiral()'s arms takes a whole number from 1 to 12, not ${show(arms)}`);
    return (x, y, t) => 0.5 + 0.5 * Math.sin(arms * (Math.atan2(y, x) - TAU * k.phase(t)) + (Math.hypot(x, y) / k.scale) * 9);
  });
}

/** Clouds swirling into a whirlpool, faster near the middle. Space colours by default. */
export function vortex(o?: LookOptions): Look {
  return look("vortex", o, { note: "clouds swirling into a whirlpool", palette: "space", ramp: "standard", light: true, period: 16 }, (k) => {
    const n = noise({ size: [0.7 * k.scale, 0.7 * k.scale], detail: 2, seed: 4 });
    return (x, y, t) => {
      const r = Math.hypot(x, y);
      // Each ring of the cloud turned further the nearer the middle it is, and all of it once round a loop.
      const a = 4 * Math.exp(-r * 1.1) + TAU * k.phase(t), c = Math.cos(a), s = Math.sin(a);
      return clamp(smoothstep(0.25, 0.8, n(c * x - s * y, s * x + c * y)) * smoothstep(0.05, 0.6, r));
    };
  });
}

/** Stripes sliding `to` "right" (the default), "left", "up", "down" or a diagonal such as "up-left". Neon colours by default. */
export function stripes(o?: LookOptions & { to?: Heading }): Look {
  return look("stripes", o, { options: ["to"], note: "stripes sliding along", palette: "neon", ramp: " ░▒▓█", light: true, period: 2 }, (k, opts) => {
    const [dx, dy] = DIRECTIONS[wordOf("stripes()'s to", opts.to, Object.keys(DIRECTIONS) as Heading[], "right")];
    return (x, y, t) => smoothstep(-0.35, 0.35, Math.sin(((x * dx + y * dy * 2) / k.scale) * 6 - TAU * k.phase(t)));
  });
}

/** A checkerboard rolling diagonally. Mono greys by default. */
export function checker(o?: LookOptions): Look {
  return look("checker", o, { note: "a checkerboard rolling by", palette: "mono", ramp: " ░▒▓█", light: true, period: 2 }, (k) => (x, y, t) => {
    const q = 3 / k.scale, p = 2 * k.phase(t);
    return (Math.floor(x * q + p) + Math.floor(y * q + p)) & 1 ? 0.9 : 0.15;
  });
}

/** The palette from one side to the other, sweeping slowly back and forth. `way` "across" (the default), "down", "diagonal" or "round". Sunset colours by default. */
export function sweep(o?: LookOptions & { way?: "across" | "down" | "diagonal" | "round" }): Look {
  return look("sweep", o, { options: ["way"], note: "colours sweeping across", palette: "sunset", ramp: " ░▒▓█", light: true, period: 8, dither: true }, (k, opts) => {
    const dir = wordOf("sweep()'s way", opts.way, ["across", "down", "diagonal", "round"], "across");
    return (x, y, t, at) => {
      const p = dir === "across" ? x / at.width + 0.5 : dir === "down" ? y / at.height + 0.5 : dir === "diagonal" ? (x / at.width + y / at.height) / 2 + 0.5 : Math.hypot(x, y) / Math.hypot(at.width, at.height) * 2;
      return 0.5 - 0.5 * Math.cos(Math.PI * (p / k.scale) - TAU * k.phase(t));
    };
  });
}

/** Noise, slowly changing: `kind` "smooth" (the default) clouds, "ridged" crests, or "cells" with walls between. Mono greys by default. */
export function turbulence(o?: LookOptions & { kind?: "smooth" | "ridged" | "cells" }): Look {
  return look("turbulence", o, { options: ["kind"], note: "noise, slowly changing", palette: "mono", ramp: "standard", light: true, period: 8 }, (k, opts) => {
    const kind = wordOf("turbulence()'s kind", opts.kind, ["smooth", "ridged", "cells"], "smooth");
    const n = k.noise({size: [0.8 * k.scale, 0.8 * k.scale], kind, detail: kind === "cells" ? 1 : 3, change: 1.5 });
    return (x, y, t) => n(x, y, t);
  });
}

/** Marble: veins bent by noise, slowly flowing. Paper colours by default. */
export function marble(o?: LookOptions): Look {
  return look("marble", o, { note: "veined marble, slowly flowing", palette: "paper", ramp: "standard", light: true, period: 16 }, (k) => {
    const n = k.noise({size: [0.9 * k.scale, 0.9 * k.scale], detail: 4, change: 1 });
    return (x, y, t) => {
      // Bands along a slant, pushed about by the noise: thin veins where the sine is at its lowest, clouded stone between.
      const m = n(x, y, t);
      const band = 0.5 + 0.5 * Math.sin(((x + y * 0.6) / k.scale) * 3 + 4.5 * m);
      return 0.05 + 0.4 * smoothstep(0, 0.22, band) + 0.4 * m * m;
    };
  });
}

/** A lava lamp: blobs that rise, merge and sink. Lava colours by default. */
export function lavaLamp(o?: LookOptions & { blobs?: number; seed?: number }): Look {
  return look("lava lamp", o, { options: ["blobs", "seed"], note: "blobs rising and sinking in a lamp", palette: "lava", ramp: " .:-=+*#%@", light: false, period: 16 }, (k, opts) => {
    const count = opts.blobs ?? 7;
    if (!Number.isInteger(count) || count < 1 || count > 16) fail(`lavaLamp()'s blobs takes a whole number from 1 to 16, not ${show(count)}`);
    const seed = seedOf("lavaLamp()", opts.seed);
    const blobs = Array.from({ length: count }, (_, i) => ({
      x: (hash(seed, i, 1) - 0.5) * 1.6, sway: 0.15 + 0.2 * hash(seed, i, 2), r: (0.16 + 0.14 * hash(seed, i, 3)) * k.scale,
      beat: 1 + Math.floor(hash(seed, i, 4) * 2), at: hash(seed, i, 5),
    }));
    return (x, y, t, at) => {
      const p = k.phase(t), half = at.height / 2;
      let sum = 0;
      for (const b of blobs) {
        const a = TAU * (b.beat * p + b.at);
        const dx = x - (b.x + b.sway * Math.sin(a * 2)), dy = (y - (half * 0.85) * Math.sin(a)) * 0.8;
        sum += (b.r * b.r) / (dx * dx + dy * dy + 1e-4);
      }
      return smoothstep(0.7, 2.2, sum);
    };
  });
}

// A star's glyphs, faint to bright.
const STAR = " .·+*✦";

/** Stars twinkling on their own beats. `density` "sparse", "normal" (the default) or "dense"; `seed` another sky. Night colours by default. */
export function stars(o?: LookOptions & { density?: Density; seed?: number }): Look {
  return look("stars", o, { options: ["density", "seed"], note: "stars twinkling", palette: "night", ramp: STAR, light: false, period: 4 }, (k, opts) => {
    const share = 0.05 * densityOf("stars()", opts.density), seed = seedOf("stars()", opts.seed);
    return (x, y, t, at) => {
      const c = Math.floor(k.column(x / k.scale, at)), r = Math.floor(k.row(y / k.scale, at));
      const h = hash(c, r, seed);
      if (h >= share) return 0;
      const size = hash(c, r, seed, 1);
      const glow = k.period ? twinkle(t, c * 977 + r, { period: k.period, min: 0.15 }) : 0.8;
      const v = clamp((0.35 + 0.65 * size * size) * glow + 0.05);
      // A star keeps its own glyph when it is added to another look, whose ramp would draw it as something else.
      at.char = STAR[1 + Math.min(STAR.length - 2, Math.floor(v * (STAR.length - 1)))];
      return v;
    };
  });
}

/** Rain falling in streaks: `wind` "none" (the default), "left" or "right" leans it; `density` as many drops. Night colours by default. */
export function rainfall(o?: LookOptions & { wind?: "none" | "left" | "right"; density?: Density; seed?: number }): Look {
  return look("rainfall", o, { options: ["wind", "density", "seed"], note: "rain falling in streaks", palette: "night", ramp: " .:|", light: false, period: 4 }, (k, opts) => {
    // Columns a row the rain is blown: a wind to the right carries each drop right as it falls.
    const lean = { none: 0, left: -0.7, right: 0.7 }[wordOf("rainfall()'s wind", opts.wind, ["none", "left", "right"], "none")];
    const share = Math.min(1, 0.35 * densityOf("rainfall()", opts.density)), seed = seedOf("rainfall()", opts.seed);
    const streak = lean > 0 ? "\\" : lean < 0 ? "/" : "|";
    return (x, y, t, at) => {
      const row = k.row(y, at), col = Math.floor(k.column(x, at) - lean * row);
      let best = 0;
      for (let i = 0; i < 2; i++) {
        if (hash(col, i, seed) >= share) continue;
        // Each drop falls a whole number of times a loop, so the loop is seamless.
        const falls = k.period ? 4 + Math.floor(hash(col, i, seed, 1) * 3) : 0, len = 2 + hash(col, i, seed, 2) * 4;
        const head = fract(hash(col, i, seed, 3) + falls * k.phase(t)) * (at.rows + len * 2) - len;
        const d = head - row;
        if (d >= 0 && d < len) best = Math.max(best, 1 - d / len);
      }
      // Its own characters, so it stays rain when added to another look.
      if (best > 0) at.char = streak;
      return best;
    };
  });
}

/** Snow falling and swaying in near, middle and far flakes. `density` as many flakes. Ice colours by default. */
export function snowfall(o?: LookOptions & { density?: Density; seed?: number }): Look {
  return look("snowfall", o, { options: ["density", "seed"], note: "snow falling and swaying", palette: "ice", ramp: " .·+*", light: false, period: 16 }, (k, opts) => {
    const share = Math.min(1, 0.3 * densityOf("snowfall()", opts.density)), seed = seedOf("snowfall()", opts.seed);
    return (x, y, t, at) => {
      const cx = k.column(x, at), cy = k.row(y, at), p = k.phase(t);
      let best = 0;
      // A flake sways up to a column either side of its own, so the columns round this one are looked at too.
      for (let lane = Math.floor(cx) - 1; lane <= Math.floor(cx) + 1; lane++)
        for (let i = 0; i < 2; i++) {
          if (hash(lane, i, seed) >= share) continue;
          const depth = hash(lane, i, seed, 1); // 0 far, 1 near
          const falls = k.period ? 1 + Math.floor(depth * 3.99) : 0;
          const fy = fract(hash(lane, i, seed, 2) + falls * p) * (at.rows + 2) - 1;
          const fx = lane + 0.5 + 0.9 * Math.sin(TAU * (p * (1 + Math.floor(depth * 2)) + hash(lane, i, seed, 3)));
          if (Math.abs(fx - cx) < 0.5 && Math.abs(fy - cy) < 0.5) best = Math.max(best, 0.3 + 0.7 * depth);
        }
      // Far flakes small, near ones large, in their own characters whatever look they are added to.
      if (best > 0) at.char = best < 0.5 ? "." : best < 0.7 ? "·" : best < 0.85 ? "+" : "*";
      return best;
    };
  });
}

// Half-width katakana and digits, the code rain's glyphs.
const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

/** The digital rain: columns of changing glyphs falling, each led by a bright head. `density` as many columns. Matrix greens by default. */
export function matrix(o?: LookOptions & { density?: Density; seed?: number }): Look {
  return look("matrix", o, { options: ["density", "seed"], note: "the digital rain", palette: "matrix", ramp: " .:+*", light: false, period: 8 }, (k, opts) => {
    const share = Math.min(1, 0.55 * densityOf("matrix()", opts.density)), seed = seedOf("matrix()", opts.seed);
    const ticks = k.period ? Math.max(1, Math.round(k.period * 8)) : 0;
    return (x, y, t, at) => {
      const col = Math.floor(k.column(x, at)), row = Math.floor(k.row(y, at));
      if (hash(col, seed) >= share) return 0;
      const falls = k.period ? 1 + Math.floor(hash(col, seed, 1) * 3.99) : 0, len = 6 + hash(col, seed, 2) * 12;
      const p = k.phase(t), head = Math.floor(fract(hash(col, seed, 3) + falls * p) * (at.rows + len)) - 1;
      const d = head - row;
      if (d < 0 || d >= len) return 0;
      // Each glyph changes now and then, a whole number of times a loop.
      const tick = Math.floor(p * ticks);
      at.char = GLYPHS[Math.floor(hash(col, row, seed + tick) * GLYPHS.length)];
      return d === 0 ? 1 : 0.85 * (1 - d / len) + 0.1;
    };
  });
}

/** A spiral galaxy turning, `arms` (2 by default) round a bright core, tilted a little towards you. Space colours by default. */
export function galaxy(o?: LookOptions & { arms?: number; seed?: number }): Look {
  return look("galaxy", o, { options: ["arms", "seed"], note: "a spiral galaxy turning", palette: "space", ramp: " .·:-=+*#@", light: false, period: 16 }, (k, opts) => {
    const arms = opts.arms ?? 2;
    if (!Number.isInteger(arms) || arms < 1 || arms > 8) fail(`galaxy()'s arms takes a whole number from 1 to 8, not ${show(arms)}`);
    const seed = seedOf("galaxy()", opts.seed);
    const dust = noise({ size: [0.25, 0.25], detail: 3, seed });
    return (x, y, t, at) => {
      const X = x / k.scale, Y = (y / k.scale) * 1.8, r = Math.hypot(X, Y) + 1e-6;
      // A turn a loop divided among the arms, so it comes round where it began.
      const a = Math.atan2(Y, X) - (TAU * k.phase(t)) / arms;
      const arm = 0.5 + 0.5 * Math.cos(arms * a + Math.log(r) * 3.2);
      const disc = Math.exp(-r * 2.1), core = 1.1 * Math.exp(-r * r * 16);
      const star = hash(Math.floor(k.column(x, at)), Math.floor(k.row(y, at)), seed) < 0.012 ? 0.2 : 0;
      return clamp(disc * (0.15 + 0.85 * arm ** 3) * (0.55 + 0.9 * dust(X, Y)) * 1.5 + core + star);
    };
  });
}

/** A sun: a bright disc in a soft corona, its rays slowly turning. Gold colours by default. */
export function sun(o?: LookOptions & { rays?: number }): Look {
  return look("sun", o, { options: ["rays"], note: "a sun with turning rays", palette: "gold", ramp: " .:-=+*#%@", light: false, period: 8 }, (k, opts) => {
    const count = opts.rays ?? 12;
    if (!Number.isInteger(count) || count < 0 || count > 48) fail(`sun()'s rays takes a whole number from 0 to 48, not ${show(count)}`);
    const surface = k.noise({size: [0.12, 0.12], detail: 2, change: 1 });
    return (x, y, t) => {
      const R = 0.42 * k.scale, r = Math.hypot(x, y);
      if (r < R) return clamp(0.93 + 0.1 * surface(x, y, t) - 0.12 * (r / R) ** 4);
      const out = r - R;
      // Rays a whole number of times round, turning one ray's gap a loop.
      const ray = count ? Math.max(0, Math.cos(count * Math.atan2(y, x) - TAU * k.phase(t))) ** 6 : 0;
      return clamp(Math.exp(-out * 9) * 0.75 + ray * Math.exp(-out * 2.6) * 0.75);
    };
  });
}
