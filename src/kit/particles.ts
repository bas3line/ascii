/*
 * kit particles: snow, rain, sparks, fireworks, fireflies and anything else
 * made of many small moving things, as systems of particles. Nothing is
 * stepped from frame to frame: each particle is born at a set moment with
 * numbers of its own drawn from its seed, and where it is at any age is the
 * closed form of its throw, gravity, wind and drag. So a frame depends only
 * on t: svg() can sample a loop out of order, a player can seek, and reduced
 * motion can jump straight to its still.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 * No maths needed: say where particles come from and which way they go in
 * words, and the rest has a default that looks right. When you do want the
 * maths, every part opens up: born on the letters of any text or piece
 * (`emitter: { text }`), moved along a path of your own (`path`), drawn and
 * coloured by functions of the particle (`glyph`, `color`).
 *
 *   import { particles } from "ascii.rest/kit";
 *
 *   export default particles({ name: "snow" }, "snow", { wind: 3 });
 *
 *   export default particles({ name: "embers" }, {
 *     emitter: "bottom", direction: "up", spread: 40, speed: [4, 9], life: [2, 4],
 *     sway: 1, glyphs: "*+'.", colors: ["#fde047", "#f97316", "#7f1d1d"],
 *   });
 *
 *   // A word that holds for a second, then blows apart, each letter flying as itself.
 *   export default particles({ name: "boom", period: 3 }, {
 *     emitter: { text: "BOOM" }, burst: { every: 3 }, hold: 1, speed: [6, 14], gravity: 12, life: 3,
 *   });
 *
 * Units. Positions (an emitter's, a particle's x and y, `floor`) are columns
 * and rows of the grid. Speeds, gravity, wind and sway are in cells, a cell
 * being a column's width both ways: a row is s.aspect cells tall (2, the
 * shape of a character), so a burst thrown at the same speed every way is
 * round on the screen rather than twice as tall as it is wide.
 */
import type { Options } from "../types.ts";
import {
  EMPTY,
  INK,
  NONE,
  type Color,
  type KitPiece,
  type MakerSpec,
  type Palette,
  type PaletteSpec,
  type Region,
  type Source,
  Surface,
  TAU,
  type Themed,
  and,
  code,
  fail,
  hash,
  isHex,
  mix,
  piece,
  snapshot,
  specOf,
  spread,
} from "./core.ts";

// --- the public shapes -----------------------------------------------------------

/** A point: [column, row]. */
export type Vec2 = [number, number];

/** One number, or [low, high]: each particle draws its own between them. */
export type Range = number | readonly [number, number];

/** A side of the grid (or of the region drawn in). */
export type Edge = "top" | "bottom" | "left" | "right";

/** A spot on the grid by name: its middle, the middle of a side, or a corner. "bottom" is the middle of the bottom row. */
export type Place = "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Where particles are born. In words: "top", "bottom", "left" or "right" is anywhere along that side, "everywhere" is
 * anywhere on the grid, "center" is its middle. Or, in columns and rows: `point`, one place (a Place by name, [column,
 * row], or a function of the birth time for one that moves, repeating with the piece's period if it has one); `line`,
 * anywhere along a line from one point to another; `area`, anywhere in a region; `edge`, anywhere along a side. A
 * particle born on a side is thrown straight in unless the system says another direction.
 *
 * `text`: on the characters of a picture, never its spaces: text as you would type it, or a piece, such as a
 * banner("hi"), whose still frame is taken, or a Surface. It sits at `at` ("center"), laid out as a Scenery is. Each
 * particle knows the character it was born on (`char`) and is drawn as it unless `glyphs` or `glyph` say otherwise, and a
 * burst puts one particle on each character, so the picture itself comes apart.
 */
export type Emitter =
  | Edge
  | "everywhere"
  | "center"
  | { point: Place | readonly [number, number] | ((t: number) => readonly [number, number]) }
  | { line: readonly [readonly [number, number], readonly [number, number]] }
  | { area: Region }
  | { edge: Edge }
  | { text: Source; at?: Place };

/** The way particles are thrown, by name: "out" is every way at once, as a burst. */
export type Direction = "up" | "down" | "left" | "right" | "up-left" | "up-right" | "down-left" | "down-right" | "out";

/**
 * What happens at the edges of the grid. "die": a particle that leaves is gone, even if its path would bring it back.
 * "wrap": it comes back in on the far side. "bounce": it bounces back off the edge, turned round with the speed it hit
 * it at (times `bounciness`), so a ball thrown down bounces back up to where it fell from. "none": it carries on out of
 * sight, and shows again if its path brings it back.
 */
export type Bounds = "wrap" | "bounce" | "die" | "none";

/**
 * A particle as a `glyph` or `color` function sees it. One object is reused for every particle of a system, so copy
 * what you want to keep.
 */
export interface Particle {
  /** Its number in its system, the same every frame. With a period, ids repeat each period. */
  id: number;
  /** Seconds since it was born. */
  age: number;
  /** Seconds it lives. */
  life: number;
  /** age / life: 0 at birth, near 1 as it dies. */
  k: number;
  /** Where it is: the column and the row, fractions included. */
  x: number;
  y: number;
  /** Its velocity in cells a second, y down. A cell is a column's width both ways, so Math.atan2(vy, vx) is its heading on the screen. */
  vx: number;
  vy: number;
  /** The play time of this frame, in seconds. */
  t: number;
  /** A number 0 to 1 of its own, the same all its life: for giving each particle its own glyph or colour. */
  rand: number;
  /** 0 for the particle itself. For a cell of its trail, how far back along the trail it is, above 0 and up to 1; x, y, vx and vy are then the trail's there. */
  back: number;
  /** Where it was born: the column and the row. */
  x0: number;
  y0: number;
  /** The way it was thrown, in radians (0 right, TAU / 4 down), and how fast, in cells a second. */
  angle: number;
  speed: number;
  /** Seconds it holds still after its birth before it is thrown, its own share of the system's `hold`: still while age < hold. */
  hold: number;
  /** The character it was born on, from an emitter of text; "" from any other. */
  char: string;
}

/**
 * A particle system: where particles are born, how many, how they move, and how they look as they age. Every field
 * but `emitter` is optional; the defaults make small stars thrown every way from the emitter, fading "*", "+", ".".
 * Everything can be said in words and plain numbers (seconds, cells, degrees); `angle`, `wind` as a function and the
 * `glyph` and `color` functions are there for when you want the maths.
 */
export interface System {
  /** Where particles are born: "top", "bottom", "left", "right", "everywhere", "center", or a point, line, area or edge. */
  emitter: Emitter;
  /** Particles born a second, spread evenly with a little jitter: 20. A system has a rate or a burst, not both. */
  rate?: number;
  /**
   * Instead of a rate: `count` particles at once, every `every` seconds (Infinity for one burst only, which comes
   * once each period in a piece that repeats), the first at `first` (0). Bursts are spaced exactly `every` apart
   * unless there is a period, when they are spread to a whole number of bursts each period (its nearest to `every`).
   * A burst comes from one place on its emitter, as a firework shell does, its particles spaced evenly round their
   * angles so it opens as a ring, unless `scatter` (false) gives each particle its own place. `rise`: seconds the burst
   * first climbs from the bottom edge to where it bursts, drawn as a rising spark with a trail, as a shell is launched:
   * 0, none. From text, a burst is spread evenly over its characters, and `count` is one a character unless you say.
   */
  burst?: { every: number; count?: number; first?: number; scatter?: boolean; rise?: number };
  /** Seconds a particle lives: [1, 2]. */
  life?: Range;
  /**
   * Seconds a particle holds still where it was born before it is thrown: 0. [low, high] for each to go in its own time,
   * so a word crumbles letter by letter. Its life counts from its birth, the hold included. A `path` is told the age
   * from birth and holds as it likes.
   */
  hold?: Range;
  /** Cells a second it is thrown at: [2, 6]. */
  speed?: Range;
  /**
   * The way it is thrown, by name: "up", "down", "left", "right", the four between ("up-left" and so on), or "out",
   * every way. By default straight in from a side, and "out" from anywhere else. Give this or `angle`, not both.
   */
  direction?: Direction;
  /** Degrees the throw fans out across, centred on `direction`: 0, every particle the same way. 40 is a plume, 360 every way. */
  spread?: number;
  /** Or the way it is thrown in radians, 0 to the right and TAU / 4 down, one angle or [low, high] for each to draw its own. */
  angle?: Range;
  /** Cells a second squared, down; below 0 pulls up, as bubbles rise: 0. */
  gravity?: number;
  /**
   * Cells a second the air carries every particle to the right (left below 0), or a function of the time, for gusts: 0.
   * In a piece that repeats, a function should repeat with its period, or the loop jumps where it starts again.
   */
  wind?: number | ((t: number) => number);
  /** How fast a particle loses the speed it was thrown at, a second: 0, none. 1 spends most of it in about two seconds. */
  drag?: number;
  /**
   * A side to side drift, as a falling leaf's: cells each way, swinging slowly (0.3 swings a second), or { amount, speed }
   * for cells each way and swings a second. Each particle swings in its own time. 0, none.
   */
  sway?: number | { amount: number; speed: number };
  /** Characters by age, the first at birth and the last as it dies: "*+.". A space shows nothing, for fading in or out. */
  glyphs?: string;
  /** Or a character of your own for each particle (and for each cell of its trail, where `back` is above 0). */
  glyph?: (p: Particle) => string;
  /** Colours by age, from birth to death: these stops spread to `steps` colours. None by default: the page's ink. */
  colors?: PaletteSpec;
  /** Or several fades: each burst takes the next in turn, and with a rate each particle takes one at random. */
  palettes?: readonly PaletteSpec[];
  /** How many colours `colors`, each of `palettes`, and `trailColors` spread to: 8. */
  steps?: number;
  /** Or a colour of your own for each particle: an index into the piece's palette, or #rrggbb found in it (give the piece a palette). */
  color?: (p: Particle) => Color;
  /** 0 to 1: the share of each tenth of a second a particle is hidden, at random, so it twinkles: 0. */
  twinkle?: number;
  /** At the edges, for both axes or for each: "die" (the default), "wrap", "bounce" or "none". */
  bounds?: Bounds | { x?: Bounds; y?: Bounds };
  /**
   * The share of its speed a particle keeps each time it bounces, 0 to 1: 1, losing nothing. Below 1, a ball bounces
   * lower each time and comes to rest on the floor, as confetti settles.
   */
  bounciness?: number;
  /**
   * The row of the ground. Particles never go into it: they land on it and bounce back up if y bounds are "bounce",
   * or die there otherwise, showing their `splash`. None by default.
   */
  floor?: number;
  /**
   * Characters drawn where a particle lands, one after another for a tenth of a second each, in the row just above
   * the floor (or in the last row, landing on the bottom edge with y bounds "die"): none.
   */
  splash?: string;
  /** Seconds of its path drawn behind each particle, as a line along its heading (- / | \) thinning to dots: 0, none. */
  trail?: number;
  /** The trail's characters from just behind the particle to the end, instead of the line. */
  trailGlyphs?: string;
  /** The trail's colours from just behind the particle to the end: by default it takes the particle's colour. */
  trailColors?: PaletteSpec;
  /**
   * Or where a particle is, worked out your own way: (p) => [column, row] at p.age, for spirals, orbits, swarms and
   * anything else. p.x0 and p.y0 are where it was born, p.angle and p.speed how it was thrown, p.k how far through its
   * life, and p.rand and p.id its own. Speed, gravity, wind, drag and sway then move nothing, though the throw is still
   * drawn for p.angle and p.speed; the edges still count ("die" looks only at where it is now). It should depend only on
   * p, so that any frame can be drawn first.
   */
  path?: (p: Particle) => readonly [number, number];
  /**
   * The moment it starts: by default it has always been going, so the first frame is already full. A piece that starts
   * empty can't repeat exactly, so particles() then sets no loop.
   */
  start?: number;
  /** A whole number: the same seed, the same particles. 1, plus its place in a list of systems. */
  seed?: number;
}

/** One system or several, drawn in order, each over the last. */
export type Systems = System | readonly System[];

/** What drawParticles() takes besides the systems. */
export interface DrawOptions {
  /**
   * Seconds after which every system repeats exactly: rates and bursts are rounded to a whole number each period. None.
   * Moving points, wind functions and starts are not checked here as particles() checks them: keep them to the period.
   */
  period?: number;
  /** The part of the surface the systems live in, for their edges, wrapping and bouncing: all of it. */
  region?: Region;
}

/**
 * A picture drawn with the particles, written as text: a skyline under fireworks, a cabin in the snow, a moon. Text alone
 * sits on the bottom row, in the middle, in the piece's ink; the object form says more.
 */
export interface Scenery {
  /** The picture, as you would type it: blank lines at its start and end are dropped, the rest is laid out as written. */
  art: string;
  /** Where it sits on the grid: "bottom" (the middle of the bottom row) by default, or another Place. */
  at?: Place;
  /** Its colour, #rrggbb or { light, dark }: the piece's ink by default. */
  color?: Themed<string>;
  /** Colours for some of its characters, as #rrggbb or { light, dark }: { "▪": "#fcd34d" } lights the windows. */
  paint?: Readonly<Record<string, Themed<string>>>;
  /**
   * True (the default): a space with some of the picture above it in its column hides what is behind it, as the inside
   * of a house does, while the sky between the roofs still shows. False: every space shows what is behind.
   */
  solid?: boolean;
}

/** What particles() takes besides a piece's spec. */
export interface ParticlesOptions {
  /**
   * Seconds after which it repeats exactly, so svg() plays a seamless loop: 8. Rates and bursts are rounded to a whole
   * number each period. 0 for a piece that never repeats. Left to its default, it is 0 when a system can't repeat: one
   * with a start, or a moving point or a wind function that isn't the same 8 seconds on. Given, it throws for those.
   */
  period?: number;
  /** A picture drawn in front of the particles, so they pass behind it: text, or a Scenery. */
  front?: string | Scenery;
  /** A picture drawn behind the particles, so they pass in front of it. */
  back?: string | Scenery;
}

// --- checking a system and filling in its defaults -------------------------------

// Each character of a splash shows this many seconds.
const SPLASH = 0.1;
// Swings a second of a sway given as a number of cells: a falling leaf's.
const SWING = 0.3;
// The most particles one system may keep alive at once, so a frame stays fast.
const ALIVE = 20000;
// A small step in, so a particle born on the far edge is inside the grid.
const IN = 1e-6;
// The wind, as a function of time, is added up on a grid of times this far apart.
const GUST = 1 / 30;
const BOUNDS: readonly Bounds[] = ["die", "wrap", "bounce", "none"];
const EDGES: readonly Edge[] = ["top", "bottom", "left", "right"];
const PLACES: readonly Place[] = ["center", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"];
// Where each Place is, as a share of the way across and of the way down.
const SPOT: Record<Place, readonly [number, number]> = {
  center: [0.5, 0.5], top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5],
  "top-left": [0, 0], "top-right": [1, 0], "bottom-left": [0, 1], "bottom-right": [1, 1],
};
// Each direction's angle on the screen, y down.
const HEADING: Record<Exclude<Direction, "out">, number> = {
  right: 0, "down-right": TAU / 8, down: TAU / 4, "down-left": (3 * TAU) / 8,
  left: TAU / 2, "up-left": (-3 * TAU) / 8, up: -TAU / 4, "up-right": -TAU / 8,
};
const DIRECTIONS = [...Object.keys(HEADING), "out"] as readonly Direction[];
// The direction a particle born on an edge is thrown: straight in.
const INWARD: Record<Edge, number> = { top: TAU / 4, bottom: -TAU / 4, left: 0, right: Math.PI };

const mod = (a: number, n: number) => ((a % n) + n) % n;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const quoted = (list: readonly string[]) => and(list.map((x) => `"${x}"`));

// Text laid out for an emitter: its size, where it sits, and each character's cell from its top left, its code and the
// one-character string a Particle's `char` takes, made once so a frame allocates nothing.
interface Letters {
  w: number;
  h: number;
  at: Place;
  dx: Int32Array;
  dy: Int32Array;
  codes: Uint16Array;
  chars: string[];
}

// An emitter as drawing works with it: words turned into the objects they stand for, `area: null` being the whole box,
// and text laid out.
type Emit =
  | { point: Place | readonly [number, number] | ((t: number) => readonly [number, number]) }
  | { line: readonly [readonly [number, number], readonly [number, number]] }
  | { area: Region | null }
  | { edge: Edge }
  | { letters: Letters };

// Colours by age for both themes: a plain list is the same on both.
interface Fade {
  light: readonly string[];
  dark: readonly string[];
}

// The box a system lives in, in columns and rows.
interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

// What drawing one system's frame works with, kept on its plan so that a frame allocates nothing. The box in cells (x
// in columns, y in cells down: rows times the aspect, its bottom the floor when there is one), the cells it covers and
// where text sits in it; the wind's running totals and the step they are added up on; and the particle being drawn (a
// new `stamp` each, for its logs of bounces): when it set off and where it was born (x in columns, y in cells), how it
// was thrown, its sway's phase, the wind's total when it set off, the character of text it was born on (-1 for none),
// where a bounce or a path puts it (eu, ev) and a path's velocity (du, dv).
interface Work {
  s: Surface | null;
  t: number;
  A: number;
  lx: number;
  hx: number;
  ly: number;
  hy: number;
  c0: number;
  c1: number;
  r0: number;
  r1: number;
  tx: number;
  ty: number;
  slot: number;
  colored: boolean;
  landing: boolean;
  gust: number;
  j0: number;
  n: number;
  stamp: number;
  born: number;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  ph: number;
  w0: number;
  cell: number;
  lo: number;
  hi: number;
  eu: number;
  ev: number;
  du: number;
  dv: number;
  out: [number, number];
}

// A system checked, with its defaults filled in and what drawing it keeps between frames. `logX` and `logY` are there
// for an axis that bounces as a ball does, wall by wall, because something speeds or slows it along that axis: folding
// its free path back in, as the other axes do, is exact only for a particle that keeps its speed.
interface Plan {
  what: string;
  seed: number;
  rate: number;
  burst: { every: number; count: number; first: number; scatter: boolean; rise: number } | null;
  life: readonly [number, number];
  hold: readonly [number, number];
  speed: readonly [number, number];
  angle: readonly [number, number];
  gravity: number;
  wind: number;
  gusts: ((t: number) => number) | null;
  drag: number;
  sway: number;
  swing: number;
  glyphs: Uint16Array;
  glyph: ((p: Particle) => string) | null;
  fades: Fade[];
  color: ((p: Particle) => Color) | null;
  twinkle: number;
  bx: Bounds;
  by: Bounds;
  bounciness: number;
  logX: Log | null;
  logY: Log | null;
  floor: number | null;
  splash: Uint16Array;
  trail: number;
  trailGlyphs: Uint16Array | null;
  trailFade: Fade | null;
  path: ((p: Particle) => readonly [number, number]) | null;
  // Drawn as the character of text it was born on: an emitter of text with no glyphs or glyph.
  own: boolean;
  start: number;
  emitter: Emit;
  // The particle handed to glyph and colour functions, the heads drawn after the trails, the palette indices of the
  // colours for the surface last drawn on (and for this frame's theme), and the wind's running totals.
  p: Particle;
  heads: { at: Int32Array; ch: Uint16Array; col: Uint8Array; n: number };
  inks: { palette: Palette | null; paper: Uint8Array[]; dark: Uint8Array[]; trailPaper: Uint8Array | null; trailDark: Uint8Array | null } | null;
  now: Uint8Array[] | null;
  trailNow: Uint8Array | null;
  sum: Float64Array;
  work: Work;
}

// A Range as [low, high], checked: `above` says whether the low end must be above `min` or may equal it.
function range(v: Range | undefined, fallback: readonly [number, number], what: string, min = -Infinity, above = false): readonly [number, number] {
  if (v === undefined) return fallback;
  const r = num(v) ? [v, v] : Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1]) && v[0] <= v[1] ? [v[0], v[1]] : null;
  if (!r || r[0] < min || (above && r[0] === min)) {
    const floor = min === -Infinity ? "" : above ? ` above ${min}` : ` of ${min} or more`;
    fail(`${what} takes a number${floor}, or [low, high] with low no more than high, not ${JSON.stringify(v)}`);
  }
  return r as [number, number];
}

// A string of characters for cells, as char codes; a space shows nothing.
function glyphCodes(v: unknown, what: string): Uint16Array {
  if (typeof v !== "string" || !v.length) fail(`${what} takes a string of one or more characters, not ${JSON.stringify(v)}`);
  return Uint16Array.from(v, (ch) => code(ch));
}

// Colour stops spread to `steps`, for both themes. A single colour stays one colour.
function fadeOf(spec: PaletteSpec, steps: number, what: string): Fade {
  const themed = !!spec && typeof spec === "object" && !Array.isArray(spec);
  const f = spec as Fade;
  const ok = Array.isArray(spec)
    ? spec.length > 0 && spec.every(isHex)
    : themed && Array.isArray(f.light) && Array.isArray(f.dark) && f.light.length > 0 && f.light.length === f.dark.length && [...f.light, ...f.dark].every(isHex);
  if (!ok) fail(`${what} takes colours as #rrggbb: a list, or { light, dark } lists of the same length, not ${JSON.stringify(spec)}`);
  const one = Array.isArray(spec) ? spec.length === 1 : f.light.length === 1;
  const s = spread(spec, one ? 1 : steps);
  return Array.isArray(s) ? { light: s, dark: s } : (s as Fade);
}

// The emitter words and what each stands for.
const WORDS = [...EDGES, "everywhere", "center"] as const;
const KINDS = ["point", "line", "area", "edge", "text"];

// A picture's lines as written, without blank lines at either end or spaces at the ends of lines.
function linesOf(art: string): string[] {
  const lines = art.split("\n").map((l) => l.trimEnd());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines.at(-1)) lines.pop();
  return lines;
}

// Text, a piece's still frame or a grid, laid out for an emitter: every character that isn't a space.
function lettersOf(src: unknown, at: unknown, what: string): Letters {
  const isPiece = !!src && typeof src === "object" && "meta" in src && typeof (src as { default?: unknown }).default === "function";
  if (typeof src !== "string" && !(src instanceof Surface) && !isPiece)
    fail(`${what}.emitter.text takes text, a piece such as banner("hi"), or a Surface, not ${JSON.stringify(src)}`);
  if (at !== undefined && !PLACES.includes(at as Place)) fail(`${what}.emitter.at takes a place, ${quoted(PLACES)}, not ${JSON.stringify(at)}`);
  const text = typeof src === "string" ? src : snapshot(src as Source, isPiece ? ((src as { meta: { still?: number } }).meta.still ?? 0) : 0, { mono: true }).text;
  const lines = linesOf(text);
  const dx: number[] = [], dy: number[] = [], codes: number[] = [], chars: string[] = [];
  lines.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] === " ") continue;
      codes.push(code(line[c]));
      dx.push(c), dy.push(r), chars.push(line[c]);
    }
  });
  if (!codes.length) fail(`${what}.emitter.text takes text with at least one character that isn't a space`);
  return {
    w: Math.max(...lines.map((l) => l.length)), h: lines.length, at: (at as Place | undefined) ?? "center",
    dx: Int32Array.from(dx), dy: Int32Array.from(dy), codes: Uint16Array.from(codes), chars,
  };
}

function checkEmitter(e: unknown, what: string): Emit {
  const pt = (p: unknown) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1]);
  if (typeof e === "string") {
    if (EDGES.includes(e as Edge)) return { edge: e as Edge };
    if (e === "everywhere") return { area: null };
    if (e === "center") return { point: "center" };
    fail(`${what}.emitter takes ${quoted(WORDS)}, or { point }, { line }, { area }, { edge } or { text }, not ${JSON.stringify(e)}`);
  }
  if (!e || typeof e !== "object") fail(`${what}.emitter takes ${quoted(WORDS)}, or { point }, { line }, { area }, { edge } or { text }, not ${JSON.stringify(e)}`);
  const keys = Object.keys(e).filter((k) => KINDS.includes(k));
  if (keys.length !== 1) fail(`${what}.emitter takes one of point, line, area, edge and text, not ${keys.length ? and(keys) : JSON.stringify(e)}`);
  const em = e as Record<string, unknown>;
  if (keys[0] === "text") return { letters: lettersOf(em.text, em.at, what) };
  if (keys[0] === "point") {
    const p = em.point;
    if (typeof p === "function") {
      const at = p(0);
      if (!pt(at)) fail(`${what}.emitter.point as a function takes the time and returns [column, row], not ${JSON.stringify(at)}`);
    } else if (typeof p === "string") {
      if (!PLACES.includes(p as Place)) fail(`${what}.emitter.point takes a place, ${quoted(PLACES)}, or [column, row], not ${JSON.stringify(p)}`);
    } else if (!pt(p)) fail(`${what}.emitter.point takes a place such as "center", [column, row], or a function of the time, not ${JSON.stringify(p)}`);
  } else if (keys[0] === "line") {
    const l = em.line;
    if (!Array.isArray(l) || l.length !== 2 || !pt(l[0]) || !pt(l[1])) fail(`${what}.emitter.line takes two points, [[column, row], [column, row]], not ${JSON.stringify(l)}`);
  } else if (keys[0] === "area") {
    const r = em.area as Region;
    if (!r || typeof r !== "object" || ![r.x, r.y, r.cols, r.rows].every(num) || r.cols <= 0 || r.rows <= 0)
      fail(`${what}.emitter.area takes a region, { x, y, cols, rows } with cols and rows above 0, not ${JSON.stringify(r)}`);
  } else if (!EDGES.includes(em.edge as Edge)) fail(`${what}.emitter.edge takes ${quoted(EDGES)}, not ${JSON.stringify(em.edge)}`);
  return e as Emit;
}

// The way a system throws its particles, as [low, high] in radians, from its direction and spread, or its angle.
function headingOf(sys: System, edge: Edge | null, what: string): readonly [number, number] {
  const { direction, spread: fan } = sys;
  if (direction !== undefined && sys.angle !== undefined) fail(`${what} takes a direction or an angle, not both`);
  if (fan !== undefined && sys.angle !== undefined) fail(`${what}.spread goes with a direction: with an angle, give [low, high] instead`);
  if (direction !== undefined && !DIRECTIONS.includes(direction)) fail(`${what}.direction takes ${quoted(DIRECTIONS)}, not ${JSON.stringify(direction)}`);
  if (fan !== undefined && !(num(fan) && fan >= 0 && fan <= 360)) fail(`${what}.spread takes degrees from 0 to 360, not ${String(fan)}`);
  if (direction === "out" || (direction === undefined && sys.angle === undefined && !edge)) {
    if (fan !== undefined && direction !== "out") fail(`${what}.spread fans out round a direction: give one too, such as direction: "up"`);
    return [0, TAU];
  }
  if (sys.angle !== undefined) return range(sys.angle, [0, TAU], `${what}.angle`);
  const h = direction ? HEADING[direction] : INWARD[edge!];
  const w = ((fan ?? 0) / 360) * Math.PI;
  return [h - w, h + w];
}

// Checks a system, saying what to change, and fills in its defaults. `n` is its place in its list.
function plan(sys: System, n: number, what: string): Plan {
  if (!sys || typeof sys !== "object") fail(`${what} takes a system, { emitter, ... }, not ${JSON.stringify(sys)}`);
  const emitter = checkEmitter(sys.emitter, what);
  if (sys.rate !== undefined && sys.burst !== undefined) fail(`${what} takes a rate or a burst, not both`);
  const rate = sys.rate ?? 20;
  if (!num(rate) || rate <= 0) fail(`${what}.rate takes a number of particles a second above 0, not ${String(sys.rate)}`);
  const letters = "letters" in emitter ? emitter.letters : null;
  let burst: Plan["burst"] = null;
  if (sys.burst !== undefined) {
    const b = sys.burst;
    if (!b || typeof b !== "object") fail(`${what}.burst takes { every, count }, not ${JSON.stringify(b)}`);
    if (!(typeof b.every === "number" && b.every > 0)) fail(`${what}.burst.every takes a number of seconds above 0 (Infinity for once), not ${String(b.every)}`);
    const count = b.count ?? (letters ? letters.codes.length : undefined);
    if (!Number.isInteger(count) || count! < 1) fail(`${what}.burst.count takes a whole number of particles of 1 or more, not ${String(b.count)}`);
    if (b.first !== undefined && !num(b.first)) fail(`${what}.burst.first takes a number of seconds, not ${String(b.first)}`);
    if (b.rise !== undefined && !(num(b.rise) && b.rise >= 0)) fail(`${what}.burst.rise takes a number of seconds of 0 or more, not ${String(b.rise)}`);
    if (b.rise && b.scatter) fail(`${what}.burst.rise launches a burst from one place, so it can't scatter: drop one of them`);
    if (b.rise && letters) fail(`${what}.burst.rise launches a burst from one place, so it can't come from text: drop rise, or use a point`);
    burst = { every: b.every, count: count!, first: b.first ?? 0, scatter: !!b.scatter || !!letters, rise: b.rise ?? 0 };
  }
  const life = range(sys.life, [1, 2], `${what}.life`, 0, true);
  const hold = range(sys.hold, [0, 0], `${what}.hold`, 0);
  const speed = range(sys.speed, [2, 6], `${what}.speed`, 0);
  const angle = headingOf(sys, "edge" in emitter ? emitter.edge : null, what);
  const gravity = sys.gravity ?? 0;
  if (!num(gravity)) fail(`${what}.gravity takes a number of cells a second squared, not ${String(sys.gravity)}`);
  let wind = 0, gusts: Plan["gusts"] = null;
  if (typeof sys.wind === "function") {
    gusts = sys.wind;
    const w = gusts(0);
    if (!num(w)) fail(`${what}.wind as a function takes the time and returns cells a second, not ${String(w)}`);
  } else if (sys.wind !== undefined) {
    if (!num(sys.wind)) fail(`${what}.wind takes a number of cells a second or a function of the time, not ${String(sys.wind)}`);
    wind = sys.wind;
  }
  const drag = sys.drag ?? 0;
  if (!num(drag) || drag < 0) fail(`${what}.drag takes a number of 0 or more, not ${String(sys.drag)}`);
  let sway = 0, swing = 0;
  if (typeof sys.sway === "number") {
    if (!num(sys.sway) || sys.sway < 0) fail(`${what}.sway takes cells each way, 0 or more, or { amount, speed }, not ${String(sys.sway)}`);
    (sway = sys.sway), (swing = SWING);
  } else if (sys.sway !== undefined) {
    const s = sys.sway;
    if (!s || typeof s !== "object" || !num(s.amount) || s.amount < 0 || !num(s.speed) || s.speed < 0)
      fail(`${what}.sway takes cells each way, or { amount, speed } in cells and swings a second of 0 or more, not ${JSON.stringify(s)}`);
    (sway = s.amount), (swing = s.speed);
  }
  const glyphs = glyphCodes(sys.glyphs ?? "*+.", `${what}.glyphs`);
  if (sys.glyph !== undefined && typeof sys.glyph !== "function") fail(`${what}.glyph takes a function of the particle that returns a character`);
  if (sys.color !== undefined && typeof sys.color !== "function") fail(`${what}.color takes a function of the particle that returns a colour: for colours by age, use colors`);
  const steps = sys.steps ?? 8;
  if (!Number.isInteger(steps) || steps < 1 || steps > 32) fail(`${what}.steps takes a whole number from 1 to 32, not ${String(sys.steps)}`);
  if (sys.colors !== undefined && sys.palettes !== undefined) fail(`${what} takes colors or palettes, not both`);
  let fades: Fade[] = [];
  if (sys.colors !== undefined) fades = [fadeOf(sys.colors, steps, `${what}.colors`)];
  if (sys.palettes !== undefined) {
    if (!Array.isArray(sys.palettes) || !sys.palettes.length) fail(`${what}.palettes takes a list of one or more fades, each a list of #rrggbb or { light, dark }`);
    fades = sys.palettes.map((p, i) => fadeOf(p, steps, `${what}.palettes[${i}]`));
  }
  const twinkle = sys.twinkle ?? 0;
  if (!num(twinkle) || twinkle < 0 || twinkle > 1) fail(`${what}.twinkle takes a share from 0 to 1, not ${String(sys.twinkle)}`);
  const b = sys.bounds ?? "die";
  const axis = (v: unknown, name: string): Bounds => {
    if (v === undefined) return "die";
    if (!BOUNDS.includes(v as Bounds)) fail(`${what}.bounds${name} takes ${quoted(BOUNDS)}, not ${JSON.stringify(v)}`);
    return v as Bounds;
  };
  const both = b === null || typeof b !== "object";
  const bx = both ? axis(b, "") : axis(b.x, ".x");
  const by = both ? axis(b, "") : axis(b.y, ".y");
  const bounciness = sys.bounciness ?? 1;
  if (!num(bounciness) || bounciness < 0 || bounciness > 1) fail(`${what}.bounciness takes a share of its speed from 0 to 1, not ${String(sys.bounciness)}`);
  if (sys.path !== undefined && typeof sys.path !== "function") fail(`${what}.path takes a function of the particle that returns [column, row]`);
  const path = sys.path ?? null;
  if (bounciness < 1 && bx === "bounce" && gusts && !path)
    fail(`${what}.bounciness can't slow a bounce off the sides in a wind that is a function: give the wind as a number, or bounds { x: "wrap" }`);
  if (sys.floor !== undefined && !num(sys.floor)) fail(`${what}.floor takes a row, not ${String(sys.floor)}`);
  const splash = sys.splash === undefined || sys.splash === "" ? new Uint16Array(0) : glyphCodes(sys.splash, `${what}.splash`);
  const trail = sys.trail ?? 0;
  if (!num(trail) || trail < 0) fail(`${what}.trail takes a number of seconds of 0 or more, not ${String(sys.trail)}`);
  const trailGlyphs = sys.trailGlyphs === undefined ? null : glyphCodes(sys.trailGlyphs, `${what}.trailGlyphs`);
  const trailFade = sys.trailColors === undefined ? null : fadeOf(sys.trailColors, steps, `${what}.trailColors`);
  const start = sys.start ?? -Infinity;
  if (!(num(start) || start === -Infinity)) fail(`${what}.start takes a number of seconds, not ${String(sys.start)}`);
  const seed = sys.seed ?? 1 + n;
  if (!Number.isInteger(seed)) fail(`${what}.seed takes a whole number, not ${String(sys.seed)}`);
  const pl: Plan = {
    what, seed, rate: burst ? 0 : rate, burst, life, hold, speed, angle, gravity, wind, gusts, drag, sway, swing,
    glyphs, glyph: sys.glyph ?? null, fades, color: sys.color ?? null, twinkle, bx, by, bounciness,
    // Across, a wind with drag pushes as gravity does down; a wind as a function is folded, as the sides are.
    logX: bx === "bounce" && !path && !gusts && (bounciness < 1 || (drag > 0 && wind !== 0)) ? newLog() : null,
    logY: by === "bounce" && !path && (bounciness < 1 || gravity !== 0) ? newLog() : null,
    floor: sys.floor ?? null, splash, trail, trailGlyphs, trailFade, path,
    own: !!letters && sys.glyphs === undefined && sys.glyph === undefined, start, emitter,
    p: { id: 0, age: 0, life: 0, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, rand: 0, back: 0, x0: 0, y0: 0, angle: 0, speed: 0, hold: 0, char: "" },
    heads: { at: new Int32Array(64), ch: new Uint16Array(64), col: new Uint8Array(64), n: 0 },
    inks: null,
    now: null,
    trailNow: null,
    sum: new Float64Array(0),
    work: {
      s: null, t: 0, A: 2, lx: 0, hx: 0, ly: 0, hy: 0, c0: 0, c1: 0, r0: 0, r1: 0, tx: 0, ty: 0, slot: 0, colored: false,
      landing: false, gust: GUST, j0: 0, n: 0, stamp: 0, born: 0, x0: 0, y0: 0, vx: 0, vy: 0, ph: 0, w0: 0, cell: -1, lo: 0, hi: 0,
      eu: 0, ev: 0, du: 0, dv: 0, out: [0, 0],
    },
  };
  checkAlive(pl, 0);
  // A path is called now, on a particle at its birth, so one that can't answer throws here and not on the first frame.
  if (path) {
    pl.p.life = life[0];
    pl.p.rand = 0.5;
    const at = path(pl.p);
    if (!Array.isArray(at) || at.length !== 2 || !num(at[0]) || !num(at[1]))
      fail(`${what}.path takes a function of the particle that returns [column, row], not one that returns ${JSON.stringify(at)}`);
  }
  return pl;
}

// How many particles a plan keeps alive at once, at most, repeating every `period` seconds (0 for none): a frame visits
// each of them, so past ALIVE it throws. A period can make bursts come more often than `every` says, so this is checked
// again with it.
function checkAlive(pl: Plan, period: number) {
  const reach = pl.life[1] + pl.splash.length * SPLASH;
  let alive: number;
  if (pl.burst) {
    let every = pl.burst.every;
    if (period) every = period / Math.max(1, Math.round(period / (every === Infinity ? period : every)));
    alive = pl.burst.count * (every === Infinity ? 1 : Math.ceil(reach / every) + 1);
  } else alive = (period ? Math.max(1, Math.round(pl.rate * period)) / period : pl.rate) * reach;
  if (alive > ALIVE)
    fail(`${pl.what} would keep ${Math.round(alive)} particles alive at once${period ? `, repeating every ${period} seconds` : ""}, past the ${ALIVE} a frame can draw in time: lower its rate, count or life`);
}

const listOf = (systems: Systems): readonly System[] => (Array.isArray(systems) ? systems : [systems as System]);

// Plans are kept for each system object, so a drawing handed the same systems every frame checks them once.
const kept = new WeakMap<System, Plan[]>();
function plansOf(systems: Systems, what: string): Plan[] {
  if (systems === null || typeof systems !== "object") fail(`${what} takes a system, { emitter, ... }, or a list of them, not ${JSON.stringify(systems)}`);
  const list = listOf(systems);
  return list.map((sys, n) => {
    const at = list.length > 1 ? `${what} (system ${n + 1})` : what;
    if (!sys || typeof sys !== "object") return plan(sys, n, at);
    let plans = kept.get(sys);
    if (!plans) kept.set(sys, (plans = []));
    return (plans[n] ??= plan(sys, n, at));
  });
}

// --- the motion -------------------------------------------------------------------

// How far a particle has gone along one axis at age a: thrown at v0 through air moving at w, pulled by g, its speed
// through the air spent by drag k a second. The closed form of dv/da = g - k (v - w); without drag, the parabola.
function travel(v0: number, g: number, w: number, k: number, a: number): number {
  if (k === 0) return (v0 + w) * a + 0.5 * g * a * a;
  return (w + g / k) * a + ((v0 - g / k) * (1 - Math.exp(-k * a))) / k;
}

// Its speed along the axis at age a.
function pace(v0: number, g: number, w: number, k: number, a: number): number {
  if (k === 0) return v0 + w + g * a;
  return w + g / k + (v0 - g / k) * Math.exp(-k * a);
}

// The age at which its speed along the axis turns through zero, the top of its arc, or -1 if it never does.
function apex(v0: number, g: number, w: number, k: number): number {
  if (k === 0) return g !== 0 && -(v0 + w) / g > 0 ? -(v0 + w) / g : -1;
  const c = w + g / k, d = v0 - g / k;
  const e = d === 0 ? 0 : -c / d;
  return e > 0 && e < 1 ? -Math.log(e) / k : -1;
}

// A position kept between lo and hi: wrapped round, or bounced back off the ends (folded, so a bounce loses nothing).
// hi itself is the first cell past the box, so one that reaches it is kept just inside.
function fold(p: number, lo: number, hi: number, how: Bounds): number {
  const span = hi - lo;
  if (span <= 0 || how === "die" || how === "none") return p;
  if (how === "wrap") return lo + mod(p - lo, span);
  const m = mod(p - lo, 2 * span);
  return Math.min(hi - IN, lo + (m < span ? m : 2 * span - m));
}

// -1 where a bounce has turned a particle round, else 1: its velocity along the axis is flipped there.
function turned(p: number, lo: number, hi: number, how: Bounds): number {
  const span = hi - lo;
  return how === "bounce" && span > 0 && mod(p - lo, 2 * span) >= span ? -1 : 1;
}

/**
 * The line character for a heading on the screen, "-", "\", "|" or "/", from a velocity in cells a second, y down: a
 * Particle's vx and vy. For a glyph that points the way a particle goes, `glyph: streak`.
 */
export function streak(p: { vx: number; vy: number }): string {
  let a = Math.atan2(p.vy, p.vx);
  if (a < 0) a += Math.PI;
  return a < Math.PI / 8 || a >= (7 * Math.PI) / 8 ? "-" : a < (3 * Math.PI) / 8 ? "\\" : a < (5 * Math.PI) / 8 ? "|" : "/";
}

// The wind's running total at a time, from the totals added up for this frame.
function windAt(pl: Plan, time: number): number {
  const wk = pl.work, sum = pl.sum;
  const f = time / wk.gust - wk.j0;
  const j = Math.max(0, Math.min(wk.n - 2, Math.floor(f)));
  return sum[j] + (sum[j + 1] - sum[j]) * (f - j);
}

// Adds up the wind on a fixed grid of times from `from` to `to`, so that how far it has carried a particle between two
// moments is a difference of two totals, and depends only on those moments, not on the frame. With a period the grid
// fits it a whole number of times, so the totals repeat with it.
function addWind(pl: Plan, from: number, to: number) {
  const gusts = pl.gusts!, wk = pl.work, step = wk.gust;
  wk.j0 = Math.floor(from / step);
  wk.n = Math.ceil(to / step) + 2 - wk.j0;
  if (pl.sum.length < wk.n) pl.sum = new Float64Array(wk.n * 2);
  const sum = pl.sum;
  sum[0] = 0;
  let prev = +gusts(wk.j0 * step) || 0;
  for (let j = 1; j < wk.n; j++) {
    const w = +gusts((wk.j0 + j) * step) || 0;
    sum[j] = sum[j - 1] + ((prev + w) / 2) * step;
    prev = w;
  }
}

// The age, within lo to hi, at which a path along one axis (thrown at v0 through air moving at w, pulled by g, drag k,
// from u0) crosses `wall`, its distance from the wall changing one way only between those ages. Exact for no drag, else
// halved down to well under a millionth of a second.
function crossing(u0: number, v0: number, g: number, w: number, k: number, wall: number, lo: number, hi: number): number {
  if (k === 0) {
    // u0 + (v0 + w) a + g a^2 / 2 = wall, by the quadratic formula in the form that keeps its precision.
    const A = g / 2, B = v0 + w, C = u0 - wall;
    let a = -1;
    if (A === 0) a = B === 0 ? -1 : -C / B;
    else {
      const d = B * B - 4 * A * C;
      if (d >= 0) {
        const q = -0.5 * (B + (B < 0 ? -1 : 1) * Math.sqrt(d));
        const r1 = q / A, r2 = q === 0 ? r1 : C / q;
        const e = 1e-9 * (1 + hi);
        const in1 = r1 >= lo - e && r1 <= hi + e, in2 = r2 >= lo - e && r2 <= hi + e;
        a = in1 && in2 ? Math.min(r1, r2) : in1 ? r1 : in2 ? r2 : -1;
      }
    }
    if (a >= lo - 1e-9 * (1 + hi)) return Math.min(hi, Math.max(lo, a));
  }
  // With drag: Newton's steps, kept inside the ages where it must be by halving them where a step would leave.
  const f0 = u0 + travel(v0, g, w, k, lo) - wall;
  let x = (lo + hi) / 2;
  for (let i = 0; i < 64 && hi - lo > 1e-10; i++) {
    const f = u0 + travel(v0, g, w, k, x) - wall;
    if (Math.abs(f) < 1e-9) return x;
    if (f < 0 === f0 < 0) lo = x;
    else hi = x;
    const d = pace(v0, g, w, k, x);
    const next = d !== 0 ? x - f / d : lo;
    x = next > lo && next < hi ? next : (lo + hi) / 2;
  }
  return hi;
}

// The most bounces kept for one particle: a ball that loses speed comes to rest well before.
const BOUNCES = 256;

/*
 * A particle's bounces along one axis, worked out once for it each frame and kept, so its trail, asking where it was a
 * moment ago, needs no more working out: each bounce's age, place and velocity through the air (the first entry is its
 * throw), whether it rests after the last, how far on from the last it is known to fly free, and, for one that loses
 * nothing, the round its bounces repeat on from `from`. `owner` says which particle it is for.
 */
interface Log {
  owner: number;
  n: number;
  s: Float64Array;
  u: Float64Array;
  v: Float64Array;
  rest: boolean;
  done: number;
  from: number;
  round: number;
}

const newLog = (): Log => ({
  owner: -1, n: 0, s: new Float64Array(BOUNCES + 1), u: new Float64Array(BOUNCES + 1), v: new Float64Array(BOUNCES + 1),
  rest: false, done: 0, from: 0, round: 0,
});

// Works out a particle's bounces on from the last one in the log until age a: its free path (pulled by g, through air
// moving at w, drag k) to each wall it meets, turned round there with `bounciness` of the speed it hit at. One too slow
// to hop more than a quarter of a cell off the wall it is pushed against, which no grid would show, rests there. One that
// loses nothing and has no drag meets the same wall again at the same speed, and from then on its bounces repeat.
function extend(pl: Plan, log: Log, g: number, w: number, a: number, lo: number, hi: number) {
  const k = pl.drag, keep = pl.bounciness;
  // The push along the axis on a particle at rest: g, and the air's pull k w.
  const push = g + k * w;
  for (;;) {
    const n = log.n, s = log.s[n - 1], u = log.u[n - 1], v = log.v[n - 1];
    const left = a - s;
    // Its free path from here goes one way to the top of its arc, if it gets there, then the other way.
    const top = apex(v, g, w, k);
    const ends = top > 0 && top < left ? 2 : 1;
    let hit = -1, wall = 0;
    for (let piece = 0, from = 0; piece < ends && hit < 0; piece++) {
      const to = piece === 0 && ends === 2 ? top : left;
      const at = u + travel(v, g, w, k, to);
      if (at > hi) (wall = hi), (hit = crossing(u, v, g, w, k, hi, from, to));
      else if (at < lo) (wall = lo), (hit = crossing(u, v, g, w, k, lo, from, to));
      from = to;
    }
    if (hit < 0) {
      log.done = a;
      return;
    }
    // Out of room: what is left is too small to see, so it rests on the wall it last met.
    if (n === log.s.length) {
      log.rest = true;
      return;
    }
    const speed = -pace(v, g, w, k, hit) * keep;
    log.s[n] = s + hit;
    log.u[n] = wall;
    log.v[n] = speed - w;
    log.n = n + 1;
    if ((wall === hi ? push > 0 : push < 0) && speed * speed < 0.5 * Math.abs(push)) {
      log.rest = true;
      return;
    }
    if (keep === 1 && k === 0) {
      let j = n - 1;
      while (j > 0 && log.u[j] !== wall) j--;
      const round = log.s[n] - log.s[j];
      if (j > 0 && round > 1e-9) {
        log.from = log.s[j];
        log.round = round;
        log.done = log.s[n];
        return;
      }
    }
  }
}

// Where a particle is along one axis at age a, and how fast it goes, into work.eu and work.ev, bouncing as a ball does
// between lo and hi (see extend), from its log of bounces, worked out further as far as it needs. A position at hi is
// kept just inside, hi being the first cell past the box.
function bounced(pl: Plan, log: Log, u0: number, v0: number, g: number, w: number, a: number, lo: number, hi: number) {
  const wk = pl.work, k = pl.drag;
  // Started outside the walls, it is folded back in as a particle that keeps its speed would be.
  if (u0 < lo || u0 > hi || hi <= lo) {
    const u = u0 + travel(v0, g, w, k, a);
    wk.eu = fold(u, lo, hi, "bounce");
    wk.ev = pace(v0, g, w, k, a) * turned(u, lo, hi, "bounce");
    return;
  }
  if (log.owner !== wk.stamp) {
    log.owner = wk.stamp;
    log.n = 1;
    log.s[0] = 0;
    log.u[0] = u0;
    log.v[0] = v0;
    log.rest = false;
    log.done = 0;
    log.round = 0;
  }
  if (log.round && a > log.from + log.round) a = log.from + mod(a - log.from, log.round);
  if (a > log.done && !log.rest) {
    extend(pl, log, g, w, a, lo, hi);
    if (log.round && a > log.from + log.round) a = log.from + mod(a - log.from, log.round);
  }
  let i = log.n - 1;
  while (i > 0 && log.s[i] > a) i--;
  if (log.rest && i === log.n - 1) {
    wk.eu = Math.min(hi - IN, log.u[i]);
    wk.ev = 0;
    return;
  }
  const d = a - log.s[i];
  wk.eu = Math.min(hi - IN, Math.max(lo, log.u[i] + travel(log.v[i], g, w, k, d)));
  wk.ev = pace(log.v[i], g, w, k, d);
}

// Where the particle being drawn is across at age a, in columns, before its sway and the edges.
function across(pl: Plan, a: number): number {
  const wk = pl.work;
  return wk.x0 + travel(wk.vx, 0, pl.wind, pl.drag, a) + (pl.gusts ? windAt(pl, wk.born + a) - wk.w0 : 0);
}

// Where it is down at age a, in cells, before the edges.
function down(pl: Plan, a: number): number {
  const wk = pl.work;
  return wk.y0 + travel(wk.vy, pl.gravity, 0, pl.drag, a);
}

// The least and most of its path across (or down) over ages 0 to a, into work.lo and work.hi: its ends and the top of
// its arc between them. Sway is left out; with wind as a function, only where it is at a counts across.
function extent(pl: Plan, a: number, vertical: boolean) {
  const wk = pl.work;
  const start = vertical ? wk.y0 : wk.x0, end = vertical ? down(pl, a) : across(pl, a);
  wk.lo = Math.min(start, end);
  wk.hi = Math.max(start, end);
  if (!vertical && pl.gusts) {
    wk.lo = wk.hi = end;
    return;
  }
  const top = vertical ? apex(wk.vy, pl.gravity, 0, pl.drag) : apex(wk.vx, 0, pl.wind, pl.drag);
  if (top > 0 && top < a) {
    const v = vertical ? down(pl, top) : across(pl, top);
    wk.lo = Math.min(wk.lo, v);
    wk.hi = Math.max(wk.hi, v);
  }
}

// Where a path of your own puts the particle at age a, into work.eu (columns) and work.ev (cells down), and its velocity
// from where it was a moment before, into work.du and work.dv. The particle's age and k are its own again after.
const MOMENT = 1 / 120;
function walk(pl: Plan, a: number) {
  const wk = pl.work, p = pl.p, path = pl.path!, age = p.age, k = p.k;
  p.age = a;
  p.k = a / p.life;
  let r = path(p);
  const x = +r[0], y = +r[1] * wk.A;
  // A moment before, or after for a particle just born.
  const b = a >= MOMENT ? a - MOMENT : a + MOMENT;
  p.age = b;
  p.k = b / p.life;
  r = path(p);
  const toward = a >= MOMENT ? MOMENT : -MOMENT;
  wk.du = (x - +r[0]) / toward;
  wk.dv = (y - +r[1] * wk.A) / toward;
  wk.eu = x;
  wk.ev = y;
  p.age = age;
  p.k = k;
}

// Puts the particle being drawn at age a into pl.p: its column and row, kept inside the edges, and its velocity.
function place(pl: Plan, a: number) {
  const wk = pl.work, p = pl.p;
  if (pl.path) {
    walk(pl, a);
    const ux = wk.eu, uy = wk.ev, vx = wk.du, vy = wk.dv;
    p.x = fold(ux, wk.lx, wk.hx, pl.bx);
    p.vx = vx * turned(ux, wk.lx, wk.hx, pl.bx);
    p.y = (pl.by === "bounce" || pl.by === "wrap" ? fold(uy, wk.ly, wk.hy, pl.by) : uy) / wk.A;
    p.vy = vy * turned(uy, wk.ly, wk.hy, pl.by);
    return;
  }
  const turn = TAU * pl.swing * a + wk.ph;
  const sway = pl.sway * Math.sin(turn), swaying = pl.sway * TAU * pl.swing * Math.cos(turn);
  if (pl.logX) {
    // Bounced off the sides wall by wall; its sway is folded in after, as the sides fold any small swing.
    bounced(pl, pl.logX, wk.x0, wk.vx, 0, pl.wind, a, wk.lx, wk.hx);
    const ux = wk.eu + sway;
    p.x = fold(ux, wk.lx, wk.hx, "bounce");
    p.vx = (wk.ev + swaying) * turned(ux, wk.lx, wk.hx, "bounce");
  } else {
    const ux = across(pl, a) + sway;
    const vx = pace(wk.vx, 0, pl.wind, pl.drag, a) + (pl.gusts ? +pl.gusts(wk.born + a) || 0 : 0) + swaying;
    p.x = fold(ux, wk.lx, wk.hx, pl.bx);
    p.vx = vx * turned(ux, wk.lx, wk.hx, pl.bx);
  }
  if (pl.logY) {
    bounced(pl, pl.logY, wk.y0, wk.vy, pl.gravity, 0, a, wk.ly, wk.hy);
    p.y = wk.eu / wk.A;
    p.vy = wk.ev;
  } else {
    const uy = down(pl, a);
    p.y = (pl.by === "bounce" || pl.by === "wrap" ? fold(uy, wk.ly, wk.hy, pl.by) : uy) / wk.A;
    p.vy = pace(wk.vy, pl.gravity, 0, pl.drag, a) * turned(uy, wk.ly, wk.hy, pl.by);
  }
}

// The cell of a column and row inside the box, as an index into the surface, or -1.
function cellAt(pl: Plan, x: number, y: number): number {
  const wk = pl.work;
  const c = Math.floor(x), r = Math.floor(y);
  return c >= wk.c0 && c < wk.c1 && r >= wk.r0 && r < wk.r1 ? r * wk.s!.cols + c : -1;
}

// Where a particle is born, into work.out in columns and rows, from two of its random numbers and its birth time. From
// text, `u` picks the character (into work.cell) and it is born in the middle of its cell.
function birthplace(pl: Plan, u: number, v: number, born: number, box: Box) {
  const e = pl.emitter, wk = pl.work, out = wk.out;
  if ("letters" in e) {
    const L = e.letters, i = Math.min(L.codes.length - 1, Math.floor(u * L.codes.length));
    wk.cell = i;
    (out[0] = wk.tx + L.dx[i] + 0.5), (out[1] = wk.ty + L.dy[i] + 0.5);
    return;
  }
  if ("point" in e) {
    if (typeof e.point === "string") {
      // A place by name, kept just inside the far side and the bottom.
      const [a, b] = SPOT[e.point];
      (out[0] = Math.min(box.x0 + (box.x1 - box.x0) * a, box.x1 - IN)), (out[1] = Math.min(box.y0 + (box.y1 - box.y0) * b, box.y1 - IN));
      return;
    }
    const p = typeof e.point === "function" ? e.point(born) : e.point;
    (out[0] = +p[0]), (out[1] = +p[1]);
  } else if ("line" in e) {
    const [a, b] = e.line;
    (out[0] = a[0] + (b[0] - a[0]) * u), (out[1] = a[1] + (b[1] - a[1]) * u);
  } else if ("area" in e) {
    const r = e.area;
    if (r) (out[0] = r.x + r.cols * u), (out[1] = r.y + r.rows * v);
    else (out[0] = box.x0 + (box.x1 - box.x0) * u), (out[1] = box.y0 + (box.y1 - box.y0) * v);
  } else {
    const x = box.x0 + (box.x1 - box.x0) * u, y = box.y0 + (box.y1 - box.y0) * u;
    if (e.edge === "top") (out[0] = x), (out[1] = box.y0);
    else if (e.edge === "bottom") (out[0] = x), (out[1] = box.y1 - IN);
    else if (e.edge === "left") (out[0] = box.x0), (out[1] = y);
    else (out[0] = box.x1 - IN), (out[1] = y);
  }
}

// --- drawing ------------------------------------------------------------------------

// The palette indices a plan's colours take on this surface, worked out once for each palette.
function inksOf(pl: Plan, s: Surface): NonNullable<Plan["inks"]> {
  if (pl.inks && pl.inks.palette === s.palette) return pl.inks;
  const pal = s.palette;
  const idx = (list: readonly string[], paper: boolean) => Uint8Array.from(list, (c) => (pal ? pal.index(c, paper) : NONE));
  pl.inks = {
    palette: pal,
    paper: pl.fades.map((f) => idx(f.light, true)),
    dark: pl.fades.map((f) => idx(f.dark, false)),
    trailPaper: pl.trailFade ? idx(pl.trailFade.light, true) : null,
    trailDark: pl.trailFade ? idx(pl.trailFade.dark, false) : null,
  };
  return pl.inks;
}

// The colour of the particle in pl.p (its fade `fade` at k through its life), as a palette index, or NONE.
function tint(pl: Plan, fade: number, k: number): number {
  if (!pl.work.colored) return NONE;
  if (pl.color) return pl.work.s!.resolve(pl.color(pl.p));
  const f = pl.now?.[fade];
  return f ? f[Math.min(f.length - 1, Math.floor(k * f.length))] : NONE;
}

// What a glyph function gave, as a cell's char code: its first character, or nothing for "", null or undefined.
function glyphOf(v: unknown): number {
  if (v === undefined || v === null || v === "") return EMPTY;
  const str = String(v), c = str.charCodeAt(0);
  if (c >= 0xd800 && c <= 0xdfff) fail(`a glyph function returns one character from the Basic Multilingual Plane, not ${JSON.stringify(str)}`);
  return code(str[0]);
}

// One more head to draw after the trails, growing the store when it is full.
function pushHead(pl: Plan, at: number, ch: number, col: number) {
  const h = pl.heads;
  if (h.n === h.at.length) {
    const at2 = new Int32Array(h.n * 2), ch2 = new Uint16Array(h.n * 2), col2 = new Uint8Array(h.n * 2);
    at2.set(h.at), ch2.set(h.ch), col2.set(h.col);
    (h.at = at2), (h.ch = ch2), (h.col = col2);
  }
  h.at[h.n] = at;
  h.ch[h.n] = ch;
  h.col[h.n++] = col;
}

// Draws one particle: `m` picks its own numbers, born at `born` at x0, y0 (columns and rows), coloured by fade `fade`.
// `even`, 0 to 1, is its share of the way through its angles, as a burst spaces its particles evenly round; -1 draws one.
function particle(pl: Plan, m: number, born: number, x0: number, y0: number, fade: number, even = -1) {
  const wk = pl.work, s = wk.s!, p = pl.p, seed = pl.seed;
  const age = wk.t - born;
  const life = pl.life[0] + (pl.life[1] - pl.life[0]) * hash(seed, m, 3);
  const splashFor = pl.splash.length * SPLASH;
  if (age < 0 || age >= life + splashFor) return;
  const sp = pl.speed[0] + (pl.speed[1] - pl.speed[0]) * hash(seed, m, 4);
  const th = pl.angle[0] + (pl.angle[1] - pl.angle[0]) * (even >= 0 ? even : hash(seed, m, 5));
  // It holds still for `wait` seconds, then moves: `moved` is how long it has been moving, the age its motion is at, and
  // `shown` the same at the end of its life. wk.born is when it set off, for the wind.
  const wait = pl.hold[1] > 0 && !pl.path ? pl.hold[0] + (pl.hold[1] - pl.hold[0]) * hash(seed, m, 9) : 0;
  const moved = Math.max(0, age - wait), shown = Math.max(0, Math.min(age, life) - wait);
  wk.stamp++;
  wk.born = born + wait;
  wk.x0 = x0;
  wk.y0 = y0 * wk.A;
  wk.vx = sp * Math.cos(th);
  wk.vy = sp * Math.sin(th);
  wk.ph = TAU * hash(seed, m, 6);
  wk.w0 = pl.gusts ? windAt(pl, wk.born) : 0;
  const L = "letters" in pl.emitter ? pl.emitter.letters : null;
  p.id = m;
  p.life = life;
  p.t = wk.t;
  p.rand = hash(seed, m, 7);
  p.back = 0;
  p.x0 = x0;
  p.y0 = y0;
  p.angle = th;
  p.speed = sp;
  p.hold = wait;
  p.char = L && wk.cell >= 0 ? L.chars[wk.cell] : "";

  // Has it left the box? With "die", leaving at any age so far is the end of it; landing on the floor is too. A path of
  // your own can only be asked where it is now.
  let gone = false, landed = -1;
  if (pl.path) {
    if (age >= life) return;
    p.age = age;
    p.k = age / life;
    place(pl, age);
    const uy = p.y * wk.A;
    gone = (pl.bx === "die" && (p.x < wk.lx || p.x >= wk.hx)) || (pl.by === "die" && uy < wk.ly) || (wk.landing && uy >= wk.hy);
  } else if (pl.bx === "die") {
    extent(pl, shown, false);
    if (wk.lo < wk.lx || wk.hi >= wk.hx) gone = true;
  }
  if (!pl.path && (pl.by === "die" || wk.landing)) {
    extent(pl, shown, true);
    const above = pl.by === "die" && wk.lo < wk.ly;
    if (above) gone = true;
    if (wk.landing && wk.hi >= wk.hy) {
      gone = true;
      // When it landed: past the top of its arc it only falls, so halve the time between there and now till it's found.
      if (wk.y0 < wk.hy && !above) {
        const top = apex(wk.vy, pl.gravity, 0, pl.drag);
        let a0 = top > 0 && top < shown ? top : 0, a1 = shown;
        for (let i = 0; i < 24; i++) {
          const mid = (a0 + a1) / 2;
          if (down(pl, mid) >= wk.hy) a1 = mid;
          else a0 = mid;
        }
        landed = a1;
        // One that went off the side first never lands.
        if (pl.bx === "die") {
          extent(pl, landed, false);
          if (wk.lo < wk.lx || wk.hi >= wk.hx) landed = -1;
        }
      }
    }
  }

  // A splash where it landed, for a moment after.
  if (landed >= 0 && landed + wait < life && pl.splash.length) {
    const since = moved - landed;
    const row = Math.ceil(wk.hy / wk.A) - 1;
    if (since < splashFor) {
      place(pl, landed);
      p.age = landed + wait;
      p.k = p.age / life;
      p.y = row;
      p.vx = p.vy = 0;
      const c = cellAt(pl, p.x, row);
      const ch = pl.splash[Math.min(pl.splash.length - 1, Math.floor(since / SPLASH))];
      if (c >= 0 && ch !== 32) s.put(c, ch, tint(pl, fade, p.k));
    }
  }
  if (gone || age >= life) return;
  if (pl.twinkle && hash(seed, m, wk.slot, 8) < pl.twinkle) return;

  p.age = age;
  p.k = age / life;
  if (!pl.path) place(pl, moved);
  const head = cellAt(pl, p.x, p.y);
  const ch = pl.glyph
    ? glyphOf(pl.glyph(p))
    : pl.own && wk.cell >= 0
      ? L!.codes[wk.cell]
      : pl.glyphs[Math.min(pl.glyphs.length - 1, Math.floor(p.k * pl.glyphs.length))];
  const color = tint(pl, fade, p.k);

  // Its trail: the path back over `trail` seconds (no further than where it set off), sampled about a cell apart, each
  // cell once, never over the particle itself. A path of your own is asked at the ages from birth, as it always is.
  const now = pl.path ? age : moved;
  if (pl.trail > 0) {
    const back = Math.min(pl.trail, now);
    const hx = p.x, hy = p.y;
    place(pl, now - back);
    const n = Math.min(64, Math.max(1, Math.ceil(Math.max(Math.abs(p.x - hx), Math.abs(p.y - hy)) * 1.5) + 1));
    let last = head;
    for (let j = 1; j <= n; j++) {
      place(pl, now - (j / n) * back);
      const u = (j / n) * (back / pl.trail);
      p.back = u;
      const c = cellAt(pl, p.x, p.y);
      if (c < 0 || c === last || c === head) continue;
      last = c;
      const tc = pl.trailGlyphs
        ? pl.trailGlyphs[Math.min(pl.trailGlyphs.length - 1, Math.floor(u * pl.trailGlyphs.length))]
        : pl.glyph
          ? glyphOf(pl.glyph(p))
          : (u < 0.75 ? streak(p) : ".").charCodeAt(0);
      if (tc === 32 || tc === 0) continue;
      const tn = pl.trailNow;
      s.put(c, tc, !wk.colored ? NONE : tn ? tn[Math.min(tn.length - 1, Math.floor(u * tn.length))] : pl.color ? tint(pl, fade, p.k) : color);
    }
    p.back = 0;
    place(pl, now);
  }
  if (head >= 0 && ch !== 32 && ch !== 0) pushHead(pl, head, ch, color);
}

// A burst still climbing to where it bursts at `tb`: a spark rising from the bottom of the box, slowing as it nears
// the top, leaning a little, with a short flickering trail of sparks under it.
function rising(pl: Plan, nm: number, tb: number, x: number, y: number, fade: number) {
  const wk = pl.work, b = pl.burst!;
  const q = 1 - (tb - wk.t) / b.rise;
  if (q < 0) return;
  const bottom = wk.hy / wk.A;
  const lean = (hash(pl.seed, nm, 14) - 0.5) * 4;
  const color = wk.colored && pl.now?.length ? pl.now[fade][0] : NONE;
  const tick = Math.floor(q * 24);
  for (let j = 3; j >= 0; j--) {
    if (j && hash(pl.seed, nm, j, tick) < 0.3) continue;
    const qq = Math.max(0, q - j * 0.05), d = (1 - qq) * (1 - qq);
    const c = cellAt(pl, x + lean * d, y + (bottom - y) * d);
    if (c >= 0) wk.s!.put(c, j === 0 ? 124 : j > 1 ? 46 : 58, color);
  }
}

// Draws one system's particles at t into s, inside the box. `period`, if set, makes it repeat exactly.
function drawPlan(s: Surface, pl: Plan, t: number, period: number, box: Box) {
  const wk = pl.work, seed = pl.seed;
  const A = s.aspect;
  wk.s = s;
  wk.t = t;
  wk.A = A;
  wk.lx = box.x0;
  wk.hx = box.x1;
  wk.ly = box.y0 * A;
  wk.hy = (pl.floor !== null ? Math.min(pl.floor, box.y1) : box.y1) * A;
  wk.c0 = Math.floor(box.x0);
  wk.c1 = Math.ceil(box.x1);
  wk.r0 = Math.floor(box.y0);
  wk.r1 = Math.ceil(box.y1);
  wk.landing = pl.floor !== null ? pl.by !== "bounce" : pl.by === "die";
  wk.colored = !s.mono && !!s.palette && (pl.fades.length > 0 || pl.color !== null || pl.trailFade !== null);
  if (wk.colored) {
    const inks = inksOf(pl, s);
    pl.now = s.paper ? inks.paper : inks.dark;
    pl.trailNow = s.paper ? inks.trailPaper : inks.trailDark;
  }
  // Twinkling is drawn by the tenth of a second; with a period, in a whole number of steps a period.
  const slots = period ? Math.max(1, Math.round(period * 10)) : 0;
  wk.slot = slots ? mod(Math.floor((t / period) * slots), slots) : Math.floor(t * 10);
  const reach = pl.life[1] + pl.splash.length * SPLASH;
  if (period) checkAlive(pl, period);
  wk.gust = period ? period / Math.max(1, Math.round(period / GUST)) : GUST;
  if (pl.gusts) addWind(pl, t - reach - 1 - (pl.rate ? 1 / pl.rate : 0), t);
  pl.heads.n = 0;
  // Text sits at its place in the box, laid out as a Scenery is.
  const L = "letters" in pl.emitter ? pl.emitter.letters : null;
  if (L) {
    wk.tx = Math.floor(box.x0 + SPOT[L.at][0] * (box.x1 - box.x0 - L.w));
    wk.ty = Math.floor(box.y0 + SPOT[L.at][1] * (box.y1 - box.y0 - L.h));
  }

  if (pl.burst) {
    const b = pl.burst;
    let every = b.every, M = 0;
    if (period) (M = Math.max(1, Math.round(period / (every === Infinity ? period : every)))), (every = period / M);
    // One burst only: the one at `first`.
    const once = every === Infinity;
    const n0 = once ? 0 : Math.floor((t - reach - b.first) / every);
    const n1 = once ? 0 : Math.floor((t + b.rise - b.first) / every);
    for (let n = n0; n <= n1; n++) {
      const tb = b.first + (once ? 0 : n * every);
      if (tb < pl.start) continue;
      const nm = M ? mod(n, M) : n;
      const fade = pl.fades.length ? mod(nm, pl.fades.length) : 0;
      birthplace(pl, hash(seed, nm, 11), hash(seed, nm, 12), tb, box);
      const x0 = wk.out[0], y0 = wk.out[1];
      if (tb > t) {
        rising(pl, nm, tb, x0, y0, fade);
        continue;
      }
      // Spaced evenly through the burst's angles, each nudged a little, so a shell opens as a ring and not a clump. From
      // text, spread evenly over its characters, every one of them when there are as many particles, and thrown "out"
      // each flies away from the text's middle, so it blows apart rather than through itself.
      const letters = L ? L.codes.length : 0;
      const away = !!L && pl.angle[0] === 0 && pl.angle[1] === TAU;
      for (let j = 0; j < b.count; j++) {
        const m = nm * b.count + j;
        let even = (j + 0.5 + (hash(seed, m, 5) - 0.5) * 0.8) / b.count;
        if (!b.scatter) particle(pl, m, tb, x0, y0, fade, even);
        else {
          birthplace(pl, L ? ((Math.floor(((j + 0.5) * letters) / b.count) % letters) + 0.5) / letters : hash(seed, m, 1), hash(seed, m, 2), tb, box);
          if (L) {
            const i = wk.cell;
            even = away ? mod(Math.atan2((L.dy[i] + 0.5 - L.h / 2) * A, L.dx[i] + 0.5 - L.w / 2) / TAU + (hash(seed, m, 5) - 0.5) * 0.05, 1) : -1;
          }
          particle(pl, m, tb, wk.out[0], wk.out[1], fade, even);
        }
      }
    }
  } else {
    let r = pl.rate, N = 0;
    if (period) (N = Math.max(1, Math.round(r * period))), (r = N / period);
    const i0 = Math.floor((t - reach) * r) - 1, i1 = Math.floor(t * r);
    for (let i = i0; i <= i1; i++) {
      const m = N ? mod(i, N) : i;
      // Born at its turn plus a jitter of up to one gap, so births stay in order but don't tick like a clock.
      const born = (i + 0.999 * hash(seed, m, 0)) / r;
      if (born > t || born < pl.start) continue;
      birthplace(pl, hash(seed, m, 1), hash(seed, m, 2), born, box);
      particle(pl, m, born, wk.out[0], wk.out[1], pl.fades.length > 1 ? Math.floor(hash(seed, m, 13) * pl.fades.length) : 0);
    }
  }
  // The heads last, so no trail covers a particle, and the younger over the older.
  const h = pl.heads;
  for (let i = 0; i < h.n; i++) s.put(h.at[i], h.ch[i], h.col[i]);
  wk.s = null;
}

// What stops a plan repeating every `period` seconds, said as a reason, or "" when nothing does: a start, or a moving
// point or a wind function that isn't the same a period on (asked at two moments).
function unlike(pl: Plan, period: number): string {
  if (pl.start > -Infinity) return "it has a start, and nothing comes before it";
  const e = pl.emitter;
  for (const t of [0, 1.37]) {
    if ("point" in e && typeof e.point === "function") {
      const a = e.point(t), b = e.point(t + period);
      if (Math.abs(+a[0] - +b[0]) > 0.01 || Math.abs(+a[1] - +b[1]) > 0.01)
        return `its emitter.point is at ${JSON.stringify(a)} at ${t} s but ${JSON.stringify(b)} at ${t + period} s`;
    }
    if (pl.gusts) {
      const a = +pl.gusts(t), b = +pl.gusts(t + period);
      if (Math.abs(a - b) > 1e-6) return `its wind is ${a} at ${t} s but ${b} at ${t + period} s`;
    }
  }
  return "";
}

// A period in seconds, 0 for none.
function checkPeriod(v: unknown, what: string): number {
  if (v === undefined) return 0;
  if (!num(v) || v < 0) fail(`${what}'s period takes a number of seconds, 0 for none, not ${String(v)}`);
  return v;
}

/**
 * Draws particle systems into a surface you already have, at t seconds: the drawing function, for mixing particles
 * with anything else in one piece(). Systems are drawn in order, each over the last; within one, younger particles
 * over older ones and every particle over the trails. Colours are found in the surface's palette, so give the piece
 * paletteOf(systems) as its palette; on a surface with no palette, or in mono, particles are drawn in the ink. Make
 * the systems once, outside the drawing: each is checked the first time it is drawn.
 *
 *   const snow = presets.snow({ cols: 64, rows: 24 });
 *   export default piece({ name: "snow", cols: 64, rows: 24, palette: paletteOf(snow) }, (t, s) => drawParticles(s, snow, t));
 */
export function drawParticles(s: Surface, systems: Systems, t: number, o: DrawOptions = {}): void {
  if (!s || typeof s !== "object" || typeof s.put !== "function") fail("drawParticles() takes a Surface first: drawParticles(s, systems, t)");
  if (!o || typeof o !== "object") fail("drawParticles() takes its options as an object: { period, region }");
  const period = checkPeriod(o.period, "drawParticles()");
  const r = o.region;
  if (r !== undefined && (!r || typeof r !== "object" || ![r.x, r.y, r.cols, r.rows].every(num))) fail(`drawParticles()'s region takes { x, y, cols, rows }, not ${JSON.stringify(r)}`);
  const box: Box = r ? { x0: Math.max(0, r.x), x1: Math.min(s.cols, r.x + r.cols), y0: Math.max(0, r.y), y1: Math.min(s.rows, r.y + r.rows) } : { x0: 0, x1: s.cols, y0: 0, y1: s.rows };
  const plans = plansOf(systems, "drawParticles()");
  if (box.x1 <= box.x0 || box.y1 <= box.y0) return;
  const time = Number.isFinite(t) ? t : 0;
  for (const pl of plans) drawPlan(s, pl, time, period, box);
}

// Colours as [light, dark] pairs, in order and each pair once, as a palette: one list when every pair is one colour.
function paletteFrom(pairs: [string, string][], what: string): PaletteSpec | undefined {
  const seen = new Set<string>();
  const list = pairs.filter(([a, b]) => {
    const key = `${a}|${b}`.toLowerCase();
    return !seen.has(key) && !!seen.add(key);
  });
  if (!list.length) return undefined;
  const themed = list.some(([a, b]) => a.toLowerCase() !== b.toLowerCase());
  const total = themed ? list.length * 2 : list.length;
  if (total > 64) fail(`${what} have ${total} colours between them${themed ? ", light and dark" : ""}, past the 64 a piece can have: lower steps, or use fewer fades`);
  return themed ? { light: list.map((p) => p[0]), dark: list.map((p) => p[1]) } : list.map((p) => p[0]);
}

// The pairs of a palette spec, checked.
function pairsOf(spec: PaletteSpec, what: string): [string, string][] {
  const f = fadeOf(spec, Array.isArray(spec) ? spec.length : ((spec as Fade).light?.length ?? 1), what);
  return f.light.map((c, i) => [c, f.dark[i]]);
}

// The palette for systems and anything else drawn with them (`extra`): your own colours first, else INK when something
// is drawn with no colour (`plain`) beside something with one, then `extra`'s colours, then every fade's.
function paletteFor(list: readonly Plan[], own: PaletteSpec | undefined, extra: [string, string][], plain: boolean, what: string): PaletteSpec | undefined {
  const fades = list.flatMap((pl) => [...pl.fades, ...(pl.trailFade ? [pl.trailFade] : [])]);
  const coloured = fades.length > 0 || extra.length > 0;
  const bare = plain || list.some((pl) => !pl.fades.length && !pl.trailFade);
  const pairs: [string, string][] = own !== undefined ? pairsOf(own, `${what}'s palette`) : coloured && bare ? [[INK.light, INK.dark]] : [];
  pairs.push(...extra);
  for (const f of fades) f.light.forEach((c, i) => pairs.push([c, f.dark[i]]));
  return paletteFrom(pairs, `${what}: these particles`);
}

/**
 * The palette a piece needs to draw these systems in colour: your own colours first (`own`, so the piece's ink is the
 * first of them), then every colour the systems fade through, each once. When some systems have colours and some
 * don't, and you give none of your own, the kit's INK comes first, so the plain ones are drawn in the page's text
 * colour. Undefined when nothing has a colour. Throws past the 64 colours a piece can have.
 */
export function paletteOf(systems: Systems, own?: PaletteSpec): PaletteSpec | undefined {
  return paletteFor(plansOf(systems, "paletteOf()"), own, [], false, "paletteOf()");
}

// --- scenery ----------------------------------------------------------------------

// A picture laid out on the piece's grid: the cells it covers, their characters, and the colour pair each takes (-1
// for none), with the palette indices of those pairs worked out once for the surface drawn on.
interface Art {
  at: Int32Array;
  ch: Uint16Array;
  pair: Int16Array;
  pairs: [string, string][];
  plain: boolean;
  inks: { palette: Palette | null; paper: Uint8Array; dark: Uint8Array } | null;
}

const isThemedHex = (v: unknown): v is Themed<string> =>
  isHex(v) || (!!v && typeof v === "object" && isHex((v as { light: unknown }).light) && isHex((v as { dark: unknown }).dark));

// A Scenery checked and laid out on a grid of `size`, or null for none.
function artOf(v: string | Scenery | undefined, size: Size, what: string): Art | null {
  if (v === undefined) return null;
  const sc: Scenery = typeof v === "string" ? { art: v } : v;
  if (!sc || typeof sc !== "object" || typeof sc.art !== "string") fail(`${what} takes text, or { art, at, color, paint, solid }, not ${JSON.stringify(v)}`);
  const at = sc.at ?? "bottom";
  if (!PLACES.includes(at)) fail(`${what}.at takes a place, ${quoted(PLACES)}, not ${JSON.stringify(sc.at)}`);
  if (sc.color !== undefined && !isThemedHex(sc.color)) fail(`${what}.color takes #rrggbb or { light, dark }, not ${JSON.stringify(sc.color)}`);
  const paint = sc.paint ?? {};
  if (!paint || typeof paint !== "object") fail(`${what}.paint takes { character: colour }, such as { "▪": "#fcd34d" }, not ${JSON.stringify(sc.paint)}`);
  for (const [ch, c] of Object.entries(paint)) {
    if (ch.length !== 1) fail(`${what}.paint takes one character a key, not ${JSON.stringify(ch)}`);
    if (!isThemedHex(c)) fail(`${what}.paint["${ch}"] takes #rrggbb or { light, dark }, not ${JSON.stringify(c)}`);
  }
  if (sc.solid !== undefined && typeof sc.solid !== "boolean") fail(`${what}.solid takes true or false, not ${JSON.stringify(sc.solid)}`);
  const solid = sc.solid ?? true;
  const lines = linesOf(sc.art);
  const w = Math.max(0, ...lines.map((l) => l.length)), h = lines.length;
  const x0 = Math.floor(SPOT[at][0] * (size.cols - w)), y0 = Math.floor(SPOT[at][1] * (size.rows - h));
  const pairs: [string, string][] = [];
  const pairIndex = (c: Themed<string>) => {
    const [l, d] = typeof c === "string" ? [c, c] : [c.light, c.dark];
    const k = pairs.findIndex(([a, b]) => a === l && b === d);
    return k >= 0 ? k : pairs.push([l, d]) - 1;
  };
  const base = sc.color === undefined ? -1 : pairIndex(sc.color);
  const at2: number[] = [], chs: number[] = [], ks: number[] = [];
  let plain = false;
  // Whether some of the picture is above each column yet, for solid spaces.
  const roofed = new Uint8Array(w);
  lines.forEach((line, r) => {
    for (let c = 0; c < w; c++) {
      const ch = line[c] ?? " ";
      const x = x0 + c, y = y0 + r;
      const inside = x >= 0 && x < size.cols && y >= 0 && y < size.rows;
      if (ch === " ") {
        if (solid && roofed[c] && c < line.length && inside) at2.push(y * size.cols + x), chs.push(32), ks.push(-1);
        continue;
      }
      const cc = code(ch);
      roofed[c] = 1;
      if (!inside) continue;
      const k = Object.hasOwn(paint, ch) ? pairIndex(paint[ch]) : base;
      if (k < 0) plain = true;
      at2.push(y * size.cols + x), chs.push(cc), ks.push(k);
    }
  });
  return { at: Int32Array.from(at2), ch: Uint16Array.from(chs), pair: Int16Array.from(ks), pairs, plain, inks: null };
}

// Draws a laid out picture into s, in its colours on a coloured piece.
function drawArt(s: Surface, art: Art) {
  const coloured = !s.mono && !!s.palette;
  let now: Uint8Array | null = null;
  if (coloured && art.pairs.length) {
    if (!art.inks || art.inks.palette !== s.palette) {
      const pal = s.palette!;
      art.inks = {
        palette: pal,
        paper: Uint8Array.from(art.pairs, ([l]) => pal.index(l, true)),
        dark: Uint8Array.from(art.pairs, ([, d]) => pal.index(d, false)),
      };
    }
    now = s.paper ? art.inks.paper : art.inks.dark;
  }
  for (let i = 0; i < art.at.length; i++) {
    const k = art.pair[i];
    s.put(art.at[i], art.ch[i], now && k >= 0 ? now[k] : NONE);
  }
}

// --- the maker ----------------------------------------------------------------------

// The period a piece made by particles() repeats on unless it says: long enough not to notice, short enough for svg().
const PERIOD = 8;

/** A preset's name: particles({ name: "snow" }, "snow"). */
export type PresetName = keyof typeof presets;
/** The options a preset takes, by its name. */
export type PresetOptions<N extends PresetName> = NonNullable<Parameters<(typeof presets)[N]>[1]>;

/**
 * A piece made of particles. The second argument is a preset by name, with its options third, or systems of your own:
 * one, a list, or a function of the piece's size that makes them (a preset function is one, and takes the options
 * third too). `front` and `back` draw a picture of text with them, a skyline or a cabin, in front of the particles or
 * behind. Its colours are your `palette` first, then the pictures', then the systems' own. It repeats exactly every
 * `period` seconds (8) and sets meta.loop to it, so svg() plays a seamless loop. 64 by 24 unless you say.
 *
 *   export default particles({ name: "snow" }, "snow", { wind: 3 });
 *
 *   export default particles({ name: "embers", cols: 48, rows: 16 }, {
 *     emitter: "bottom", direction: "up", spread: 40, speed: [4, 9], life: [2, 4],
 *     sway: 1, glyphs: "*+'.", colors: ["#fde047", "#f97316", "#7f1d1d"],
 *   });
 */
export function particles<O extends Options = Options, N extends PresetName = PresetName>(
  spec: MakerSpec<O> & ParticlesOptions,
  preset: N,
  options?: PresetOptions<N>,
): KitPiece<O>;
export function particles<O extends Options = Options, P = unknown>(
  spec: MakerSpec<O> & ParticlesOptions,
  make: (size: Size, options?: P) => Systems,
  options?: P,
): KitPiece<O>;
export function particles<O extends Options = Options>(spec: MakerSpec<O> & ParticlesOptions, systems: Systems | ((size: Size) => Systems)): KitPiece<O>;
export function particles<O extends Options = Options>(
  spec: MakerSpec<O> & ParticlesOptions,
  systems: PresetName | Systems | ((size: Size, options?: unknown) => Systems),
  options?: unknown,
): KitPiece<O> {
  const full = specOf(spec, "particles");
  let period = spec?.period === undefined ? PERIOD : checkPeriod(spec.period, "particles()");
  const { cols, rows } = full;
  if (!Number.isInteger(cols) || cols < 1 || !Number.isInteger(rows) || rows < 1)
    fail(`particles() takes whole numbers of columns and rows of 1 or more, not ${String(cols)} by ${String(rows)}`);
  const size: Size = period ? { cols, rows, period } : { cols, rows };
  let made: Systems;
  if (typeof systems === "string") {
    if (!Object.hasOwn(presets, systems)) fail(`particles() takes a preset by name, ${quoted(Object.keys(presets))}, or systems of your own, not ${JSON.stringify(systems)}`);
    made = (presets[systems] as (size: Size, o?: unknown) => System[])(size, options);
  } else if (typeof systems === "function") made = systems(size, options);
  else {
    if (options !== undefined) fail("particles() takes options third only for a preset: put them in the systems you give");
    made = systems;
  }
  const plans = plansOf(made, "particles()");
  if (period) {
    // What would stop it repeating: left to the default, the piece then just doesn't loop; asked for, it throws.
    const odd = plans.find((pl) => unlike(pl, period));
    if (odd && spec?.period !== undefined) fail(`${odd.what} can't repeat every ${period} seconds as period asks: ${unlike(odd, period)}. Change that, or give period: 0`);
    if (odd) period = 0;
    for (const pl of plans) checkAlive(pl, period);
  }
  const back = artOf(spec?.back, size, "particles()'s back");
  const front = artOf(spec?.front, size, "particles()'s front");
  const arts = [back, front].filter((a): a is Art => !!a);
  const palette = paletteFor(plans, full.palette, arts.flatMap((a) => a.pairs), arts.some((a) => a.plain), "particles()");
  const { period: _p, front: _f, back: _b, ...rest } = full as typeof full & ParticlesOptions;
  const o = period ? { period } : {};
  return piece<O>({ ...rest, palette, ...(period && rest.loop === undefined ? { loop: period } : {}) }, (t, s) => {
    if (back) drawArt(s, back);
    drawParticles(s, made, t, o);
    if (front) drawArt(s, front);
  });
}

// --- presets ------------------------------------------------------------------------

/** A piece's size: what a preset fits itself to. particles() adds its period, which a preset can time its changes to. */
export interface Size {
  cols: number;
  rows: number;
  period?: number;
}

/** snow's options. */
export interface SnowOptions {
  /** Cells a second the wind carries the nearest flakes to the right (left below 0); farther ones drift less: 1. */
  wind?: number;
  /** How much the wind rises and drops, 0 to 1, a share of `wind`, once each period (8 s without one): 0.5. 0 for steady. */
  gusts?: number;
  /** How many flakes, as a share of the usual: 1. */
  density?: number;
  /** Depths of flakes, 1 to 3, from far small "." to near "*": 3. */
  layers?: number;
  /** Colours from the farthest depth to the nearest: grey to white on a dark page, grey to slate on paper. */
  colors?: PaletteSpec;
}

/** rain's options. */
export interface RainOptions {
  /** Cells a second the wind blows the rain sideways, so it slants: 3. */
  wind?: number;
  /** How many drops, as a share of the usual: 1. */
  density?: number;
  /** Characters the near drops make where they land on the bottom row: "o.". "" for none. */
  splash?: string;
  /** Colours from the far drops to the near ones. */
  colors?: PaletteSpec;
}

/** stars' options. */
export interface StarsOptions {
  /** How many stars, as a share of the usual: 1. */
  density?: number;
  /** Seconds between shooting stars: 7. 0 for none. */
  shooting?: number;
  /** Colours a star fades through, from coming out to going in. */
  colors?: PaletteSpec;
}

/** sparks' options. */
export interface SparksOptions {
  /** Where the fountain stands, [column, row]: the middle of the bottom row. */
  at?: readonly [number, number];
  /** How high it throws, as a share of the rows above it: 0.8. */
  height?: number;
  /** How many sparks, as a share of the usual: 1. */
  density?: number;
  /** Colours a spark cools through, hot to cold. */
  colors?: PaletteSpec;
}

/** fireworks' options. */
export interface FireworksOptions {
  /** Seconds between shells: 1.4. */
  every?: number;
  /** Sparks a shell: 40. */
  count?: number;
  /** Seconds a shell climbs before it bursts: 1.1. 0 to burst out of nothing. */
  rise?: number;
  /** One colour for each shell in turn, as #rrggbb, each fading from white-hot through it: a red, a gold, a green, a blue and a pink. */
  colors?: readonly string[];
}

/** fireflies' options. */
export interface FirefliesOptions {
  /** How many fireflies, as a share of the usual: 1. */
  density?: number;
  /** Colours a firefly glows through, from lighting up to going out. */
  colors?: PaletteSpec;
}

/** bubbles' options. */
export interface BubblesOptions {
  /** How many bubbles, as a share of the usual: 1. */
  density?: number;
  /** Colours a bubble goes through as it rises, small to large. */
  colors?: PaletteSpec;
}

/** matrix's options. */
export interface MatrixOptions {
  /** How many streams, as a share of the usual: 1. */
  density?: number;
  /** How fast the streams fall, as a share of the usual: 1. */
  speed?: number;
  /** The head's colour, then the trail's from just behind it to the end: a list, or { light, dark }. */
  colors?: PaletteSpec;
}

function sizeOf(size: unknown, what: string): Size {
  const s = size as Size;
  if (!s || typeof s !== "object" || !Number.isInteger(s.cols) || s.cols < 1 || !Number.isInteger(s.rows) || s.rows < 1)
    fail(`${what} takes the piece's size, { cols, rows } in whole numbers of 1 or more, not ${JSON.stringify(size)}`);
  return s;
}

function share(v: unknown, what: string, fallback: number): number {
  if (v === undefined) return fallback;
  if (!num(v) || v <= 0) fail(`${what} takes a number above 0, not ${String(v)}`);
  return v;
}

function optionsOf<T extends object>(o: T | undefined, what: string): T {
  if (o === undefined) return {} as T;
  if (!o || typeof o !== "object") fail(`${what} takes its options as an object, not ${JSON.stringify(o)}`);
  return o;
}

// A preset's counts are for 64 by 24: this scales them to the size.
const scaleOf = ({ cols, rows }: Size) => (cols * rows) / (64 * 24);

// A PaletteSpec's stops spread to n, as one colour (for both themes, or one for each) for each of n.
function tones(spec: PaletteSpec, n: number, what: string): PaletteSpec[] {
  const f = fadeOf(spec, n, what);
  const pick = (list: readonly string[], i: number) => list[Math.min(list.length - 1, i)];
  return Array.from({ length: n }, (_, i) => {
    const l = pick(f.light, i), d = pick(f.dark, i);
    return l === d ? [l] : { light: [l], dark: [d] };
  });
}

/**
 * Snow falling in up to three depths, far flakes small, slow and faint, near ones large and quick, each swaying in its
 * own time and carried by a wind that rises and drops, wrapping round the sides. Options: `wind`, `gusts`, `density`,
 * `layers`, `colors`.
 */
function snow(size: Size, o?: SnowOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.snow");
  const { wind = 1, gusts = 0.5, density, layers = 3, colors } = optionsOf(o, "presets.snow");
  if (!num(wind)) fail(`presets.snow's wind takes a number of cells a second, not ${String(wind)}`);
  if (!num(gusts) || gusts < 0 || gusts > 1) fail(`presets.snow's gusts takes a share of the wind from 0 to 1, not ${String(gusts)}`);
  const d = share(density, "presets.snow's density", 1);
  // The wind swells and drops once a period, so a piece that repeats still repeats exactly.
  const every = size.period || 8;
  const blow = (drift: number) => (gusts && wind ? (t: number) => wind * drift * (1 + gusts * Math.sin((TAU * t) / every)) : wind * drift);
  if (!Number.isInteger(layers) || layers < 1 || layers > 3) fail(`presets.snow's layers takes 1, 2 or 3, not ${String(layers)}`);
  // Flakes on the screen at once, fall speed in cells a second, share of the wind, sway in cells and glyph: far to near.
  const depths = [
    { n: 46, v: 2.4, drift: 0.55, sway: 0.5, glyphs: "." },
    { n: 28, v: 3.8, drift: 0.8, sway: 0.9, glyphs: "+" },
    { n: 12, v: 5.6, drift: 1, sway: 1.4, glyphs: "*" },
  ].slice(3 - layers);
  const tint = colors !== undefined ? tones(colors, layers, "presets.snow's colors") : tones({ light: ["#a3afbf", "#64748b", "#1e293b"], dark: ["#5b6b82", "#b6c2d1", "#f8fafc"] }, 3, "snow").slice(3 - layers);
  return depths.map((L, i) => {
    const cross = (rows * 2) / L.v;
    return {
      emitter: { edge: "top" },
      rate: (L.n * d * scaleOf({ cols, rows })) / cross,
      life: cross * 1.6,
      speed: [L.v * 0.8, L.v * 1.2],
      wind: blow(L.drift),
      sway: { amount: L.sway, speed: 0.18 },
      glyphs: L.glyphs,
      colors: tint[i],
      bounds: { x: "wrap", y: "die" },
      seed: 101 + i,
    } satisfies System;
  });
}

/**
 * Rain in two depths, slanting with the wind, the near drops as streaks that splash where they land on the bottom
 * row. Options: `wind`, `density`, `splash`, `colors`.
 */
function rain(size: Size, o?: RainOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.rain");
  const { wind = 3, density, splash = "o.", colors } = optionsOf(o, "presets.rain");
  if (!num(wind)) fail(`presets.rain's wind takes a number of cells a second, not ${String(wind)}`);
  const d = share(density, "presets.rain's density", 1);
  if (typeof splash !== "string") fail(`presets.rain's splash takes a string of characters, "" for none, not ${JSON.stringify(splash)}`);
  const tint = tones(colors ?? { light: ["#94a3b8", "#475569"], dark: ["#475569", "#a5b4c8"] }, 2, "presets.rain's colors");
  const scale = scaleOf({ cols, rows });
  const far = (rows * 2) / 26, near = (rows * 2) / 40;
  return [
    {
      emitter: { edge: "top" }, rate: (40 * d * scale) / far, life: far * 1.3, speed: [22, 30],
      wind: wind * 0.7, glyphs: "'", trail: 0.04, trailGlyphs: "'", colors: tint[0],
      bounds: { x: "wrap", y: "die" }, seed: 201,
    },
    {
      emitter: { edge: "top" }, rate: (22 * d * scale) / near, life: near * 1.3, speed: [36, 44],
      wind, glyph: streak, trail: 0.06, colors: tint[1], splash,
      bounds: { x: "wrap", y: "die" }, seed: 202,
    },
  ];
}

/**
 * A night sky of stars that come out, shine and go in again, twinkling, with a shooting star now and then.
 * Options: `density`, `shooting`, `colors`.
 */
function stars(size: Size, o?: StarsOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.stars");
  const { density, shooting = 7, colors } = optionsOf(o, "presets.stars");
  const d = share(density, "presets.stars' density", 1);
  if (!num(shooting) || shooting < 0) fail(`presets.stars' shooting takes seconds between shooting stars, 0 for none, not ${String(shooting)}`);
  const field: System = {
    emitter: { area: { x: 0, y: 0, cols, rows } },
    rate: (70 * d * scaleOf({ cols, rows })) / 5.5,
    life: [3, 8],
    speed: 0,
    glyphs: "·+*+·",
    colors: colors ?? { light: ["#cbd5e1", "#475569", "#0f172a", "#475569", "#cbd5e1"], dark: ["#334155", "#cbd5e1", "#fff7d6", "#cbd5e1", "#334155"] },
    twinkle: 0.08,
    bounds: "none",
    seed: 301,
  };
  if (!shooting) return [field];
  return [
    field,
    {
      emitter: { area: { x: cols * 0.35, y: 0, cols: cols * 0.6, rows: rows * 0.3 } },
      burst: { every: shooting, count: 1, first: Math.min(1.5, shooting / 2) },
      life: 0.9,
      speed: [42, 48],
      angle: [Math.PI * 0.86, Math.PI * 0.9],
      glyphs: "*",
      trail: 0.22,
      colors: { light: ["#0f172a"], dark: ["#ffffff"] },
      trailColors: { light: ["#475569", "#cbd5e1"], dark: ["#e2e8f0", "#475569"] },
      bounds: "none",
      seed: 302,
    },
  ];
}

/**
 * A fountain of sparks thrown up from one place, a white-hot cone climbing to a canopy and arcing over to fall on
 * both sides, cooling from white through orange to red as they go. Options: `at`, `height`, `density`, `colors`.
 */
function sparks(size: Size, o?: SparksOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.sparks");
  const { at = [cols / 2, rows - 1], height, density, colors } = optionsOf(o, "presets.sparks");
  if (!Array.isArray(at) || at.length !== 2 || !num(at[0]) || !num(at[1])) fail(`presets.sparks' at takes [column, row], not ${JSON.stringify(at)}`);
  const h = share(height, "presets.sparks' height", 0.8);
  const d = share(density, "presets.sparks' density", 1);
  const g = 26;
  // Thrown just fast enough to climb `height` of the rows above (a row is two cells), all at nearly one speed so
  // each spark traces a clean arc and the arcs together make the fountain's shape.
  const climb = Math.max(1, at[1] * 2 * h);
  const v = Math.sqrt(2 * g * climb);
  // Seconds to climb and fall back to where it was thrown, so it lives till it lands.
  const fall = (2 * v) / g;
  // Fanned out so the widest arcs come down about a third of the width away on each side: a spark thrown at an
  // angle `a` off upright lands 2 * climb * sin(2a) cells from where it was thrown.
  const fan = 0.5 * Math.asin(Math.min(1, (0.7 * cols) / (2 * climb)));
  return [
    {
      emitter: { point: [at[0], at[1]] },
      // As many sparks to the area at any size: 60 a second at 64 by 24, where each is in the air about 3.4 seconds.
      rate: (60 * 3.4 * d * scaleOf({ cols, rows })) / fall,
      life: [fall * 0.9, fall * 1.2],
      speed: [v * 0.92, v],
      angle: [-TAU / 4 - fan, -TAU / 4 + fan],
      gravity: g,
      glyphs: "*+:.",
      colors: colors ?? { light: ["#7c2d12", "#c2410c", "#ea580c", "#f87171", "#fecaca"], dark: ["#fffbeb", "#fde047", "#fb923c", "#dc2626", "#7f1d1d"] },
      bounds: { x: "none", y: "die" },
      seed: 401,
    },
  ];
}

/**
 * Fireworks: shells climb from the bottom on a sparkling trail and burst high up, each in its own colour, the sparks
 * flying out round, slowing, drooping and fading from white-hot through the colour to dark.
 * Options: `every`, `count`, `rise`, `colors`.
 */
function fireworks(size: Size, o?: FireworksOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.fireworks");
  const { every = 1.4, count = 40, rise = 1.1, colors = ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#e879f9"] } = optionsOf(o, "presets.fireworks");
  if (!num(every) || every <= 0) fail(`presets.fireworks' every takes seconds between shells above 0, not ${String(every)}`);
  if (!Number.isInteger(count) || count < 1) fail(`presets.fireworks' count takes a whole number of sparks of 1 or more, not ${String(count)}`);
  if (!num(rise) || rise < 0) fail(`presets.fireworks' rise takes seconds of 0 or more, not ${String(rise)}`);
  if (!Array.isArray(colors) || !colors.length || !colors.every(isHex)) fail(`presets.fireworks' colors takes a list of #rrggbb, one for each shell in turn, not ${JSON.stringify(colors)}`);
  // A shell's size goes with the sky: the smaller of its width and its height in cells.
  const r = Math.min(cols, rows * 2);
  return [
    {
      emitter: { area: { x: cols * 0.2, y: rows * 0.24, cols: cols * 0.6, rows: rows * 0.22 } },
      burst: { every, count, first: 0.4, rise },
      life: [1.2, 2],
      // Nearly one speed, so a shell opens as a round ring rather than a clump, each spark streaking back to the middle.
      speed: [r * 0.33, r * 0.4],
      drag: 1.5,
      gravity: 6,
      glyphs: "**+:.",
      trail: 0.25,
      // Each shell white-hot, then its colour, then a deep shade of it; on paper, a deep shade to a pale one.
      palettes: colors.map((c) => ({
        light: [mix(c, "#000000", 0.55), mix(c, "#000000", 0.2), c, mix(c, "#ffffff", 0.55)],
        dark: ["#fffaf0", mix(c, "#ffffff", 0.35), c, mix(c, "#000000", 0.55)],
      })),
      steps: 4,
      bounds: "none",
      seed: 501,
    },
  ];
}

/**
 * Fireflies drifting low over the ground, each lighting up, glowing and going out again in its own time.
 * Options: `density`, `colors`.
 */
function fireflies(size: Size, o?: FirefliesOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.fireflies");
  const { density, colors } = optionsOf(o, "presets.fireflies");
  const d = share(density, "presets.fireflies' density", 1);
  return [
    {
      emitter: { area: { x: 0, y: rows * 0.3, cols, rows: rows * 0.7 } },
      rate: (36 * d * scaleOf({ cols, rows })) / 4.5,
      life: [3, 6],
      speed: [0.6, 2],
      sway: { amount: 1.5, speed: 0.15 },
      glyphs: " .·•*•·. ",
      colors: colors ?? {
        light: ["#d9f99d", "#84cc16", "#4d7c0f", "#3f6212", "#4d7c0f", "#84cc16", "#d9f99d"],
        dark: ["#1a2e05", "#4d7c0f", "#a3e635", "#fef08a", "#a3e635", "#4d7c0f", "#1a2e05"],
      },
      bounds: "bounce",
      seed: 601,
    },
  ];
}

/**
 * Bubbles rising from the bottom, swaying, speeding up and growing from "." to "O" as they go.
 * Options: `density`, `colors`.
 */
function bubbles(size: Size, o?: BubblesOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.bubbles");
  const { density, colors } = optionsOf(o, "presets.bubbles");
  const d = share(density, "presets.bubbles' density", 1);
  // Seconds to rise the whole height, about: a bubble grows to "O" near the top, and the slow ones pop on the way.
  const cross = (rows * 2) / 6;
  return [
    {
      emitter: { edge: "bottom" },
      rate: (30 * d * scaleOf({ cols, rows })) / cross,
      life: [cross * 0.8, cross * 1.2],
      speed: [2.5, 5],
      gravity: -1.4,
      sway: { amount: 0.9, speed: 0.4 },
      glyphs: "..oooOO",
      colors: colors ?? { light: ["#a5f3fc", "#22d3ee", "#0e7490", "#164e63"], dark: ["#155e75", "#22d3ee", "#a5f3fc", "#ecfeff"] },
      bounds: { x: "wrap", y: "die" },
      seed: 701,
    },
  ];
}

// The matrix's glyphs: heavy ones for the heads, and a mix for the streams behind.
const HEAD = "@#%&$";
const BODY = "0123456789ABCDEFHKMNPRSTXZacdeghkmnorsuvxz:;!|<>=+*";

/**
 * Streams of glyphs falling down the screen, each in its own column at its own pace, a bright head over a trail that
 * fades behind it, its glyphs changing now and then. Options: `density`, `speed`, `colors`.
 */
function matrix(size: Size, o?: MatrixOptions): System[] {
  const { cols, rows } = sizeOf(size, "presets.matrix");
  const { density, speed, colors } = optionsOf(o, "presets.matrix");
  const d = share(density, "presets.matrix's density", 1);
  const v = share(speed, "presets.matrix's speed", 1);
  const lo = 16 * v, hi = 36 * v, trail = 0.9 / v;
  let head: PaletteSpec = { light: ["#052e16"], dark: ["#f0fdf4"] };
  let tail: PaletteSpec = { light: ["#15803d", "#86efac"], dark: ["#4ade80", "#14532d"] };
  if (colors !== undefined) {
    const f = fadeOf(colors, Array.isArray(colors) ? colors.length : ((colors as Fade).light?.length ?? 1), "presets.matrix's colors");
    if (f.light.length < 2) fail("presets.matrix's colors takes two or more colours: the head's, then the trail's");
    head = { light: [f.light[0]], dark: [f.dark[0]] };
    tail = { light: f.light.slice(1), dark: f.dark.slice(1) };
  }
  return [
    {
      emitter: { edge: "top" },
      rate: (cols * 0.5 * d) / ((rows * 2) / ((lo + hi) / 2) + trail),
      life: (rows * 2) / lo + trail,
      speed: [lo, hi],
      trail,
      // The head flickers through heavy glyphs; each cell of the trail keeps a glyph a while, then changes it.
      glyph: (p) => {
        const row = Math.floor(p.y);
        if (p.back === 0) return HEAD[Math.floor(hash(p.id, Math.floor(p.age * 20), 1) * HEAD.length)];
        const every = 0.4 + hash(p.id, row, 2) * 1.6;
        return BODY[Math.floor(hash(p.id, row, Math.floor(p.age / every + hash(p.id, row, 3) * 9)) * BODY.length)];
      },
      colors: head,
      trailColors: tail,
      bounds: "none",
      seed: 801,
    },
  ];
}

/**
 * Ready-made systems that look good at 64 by 24 with no options, each fitting itself to the size it is given:
 * `particles({ name: "snow" }, presets.snow)`, or with options,
 * `particles({ name: "storm" }, (size) => presets.snow(size, { wind: 4, density: 2 }))`.
 * snow, rain, stars (twinkling, with a shooting star now and then), sparks (a fountain), fireworks, fireflies, bubbles
 * and matrix.
 */
export const presets = { snow, rain, stars, sparks, fireworks, fireflies, bubbles, matrix };
