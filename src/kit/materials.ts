/*
 * materials: build any object by saying what it is, not how to draw it. An
 * area is where something is: a cup, a bottle, a flame, a cloud, a house, a
 * star, or a rect, ellipse, polygon, path or text of your own, placed by
 * words ("bottom", "large") and combined with union, subtract and intersect;
 * inside() is the room in a vessel, filled to a level. A material is what it
 * is made of, and moves on its own: water with waves that bends what is
 * behind it, glass with a rim and a highlight, fire, smoke, cloud, metal with
 * a sheen, wood, grass that sways, sand, lava, ice, neon that glows. An
 * emission is what it gives off: bubbles rising in water, smoke from a
 * chimney, sparks off a fire, rain from a cloud, steam over a mug. picture()
 * lays the parts over each other, in order, into one piece that loops, in
 * colour and in one ink, on light and dark pages, and plays wherever a piece
 * does: mount(), <Ascii>, <ascii-art>, svg() for a README, play() in a terminal.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { picture, shape, emit, cup, inside, glass, water, bubbles } from "ascii.rest/kit";
 *
 *   const tumbler = cup({ size: "large" });
 *   const drink = inside(tumbler, { fill: "half" });
 *   export default picture([shape(tumbler, glass()), shape(drink, water()), emit(bubbles(), { inside: drink })]);
 */
import type { Options } from "../types.ts";
import {
  EMPTY,
  INK,
  NONE,
  TAU,
  and,
  clamp,
  fail,
  fract,
  hash,
  isHex,
  lerp,
  piece,
  smoothstep,
  specOf,
  spread,
  type KitPiece,
  type MakerSpec,
  type PaletteSpec,
  type Surface,
} from "./core.ts";

// --- checking what a user passes ---------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

// A value as an error shows it: NaN as NaN, a string in quotes, an object as JSON where it can be.
function show(v: unknown): string {
  if (typeof v !== "object" || v === null) return typeof v === "string" ? JSON.stringify(v) : String(v);
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

// An options object, checked for keys it does not know, so a typo says so instead of doing nothing.
function optionsOf<T extends object>(what: string, o: T | undefined, keys: readonly string[]): T {
  if (o === undefined) return {} as T;
  if (!isObject(o)) fail(`${what} takes an options object, such as { ${keys[0]}: ... }, not ${show(o)}`);
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${what} has no option ${JSON.stringify(k)}: it takes ${and(keys.map((x) => JSON.stringify(x)))}`);
  return o;
}

// A number option between lo and hi, or its default.
function numberOf(what: string, v: unknown, def: number, lo = -Infinity, hi = Infinity, words = ""): number {
  if (v === undefined) return def;
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) {
    const range = words || (hi === Infinity ? (lo === -Infinity ? "" : ` of ${lo} or more`) : ` from ${lo} to ${hi}`);
    fail(`${what} takes a number${range}, not ${show(v)}`);
  }
  return v;
}

// A period in seconds, above 0 and at most 60.
function periodOf(what: string, v: unknown, def: number): number {
  const p = numberOf(what, v, def, 0, 60, " of seconds above 0, up to 60");
  if (p <= 0) fail(`${what} takes a number of seconds above 0, up to 60, not ${p}`);
  return p;
}

function wordOf<W extends string>(what: string, v: unknown, words: readonly W[], def: W): W {
  if (v === undefined) return def;
  if (!words.includes(v as W)) fail(`${what} takes ${and(words.map((w) => JSON.stringify(w)))}, not ${show(v)}`);
  return v as W;
}

function boolOf(what: string, v: unknown, def: boolean): boolean {
  if (v === undefined) return def;
  if (typeof v !== "boolean") fail(`${what} takes true or false, not ${show(v)}`);
  return v;
}

function seedOf(what: string, v: unknown, def: number): number {
  if (v === undefined) return def;
  if (!Number.isInteger(v)) fail(`${what} takes a whole number, not ${show(v)}`);
  return v as number;
}

function charOf(what: string, v: unknown, def: string, many = false): string {
  if (v === undefined) return def;
  if (typeof v !== "string" || !v.length || (!many && v.length !== 1) || /[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/.test(v))
    fail(`${what} takes ${many ? "one or more printable characters" : "one printable character"}, not ${show(v)}`);
  return v;
}

// --- colours by name ---------------------------------------------------------------

/** A list of colours for each page: `light` is drawn on a light page (paper), `dark` on a dark one. */
export interface Duo {
  readonly light: readonly string[];
  readonly dark: readonly string[];
}

/**
 * Colours by name, each a list for a light page and one for a dark page. Any material or emission takes one of these
 * names as `colors`, or colours of your own, spread along their fade to the colours it draws with, in this order:
 * water [deep, mid, near the surface, surface]; glass [walls, highlight, base]; fire [embers to white heat, five];
 * smoke, steam and sand [three, faint to strong]; cloud [outline, body, shadow]; metal [dark, mid, light, sheen];
 * wood and grass [dark, mid, light]; lava [four, cool to hot]; ice [outline, body, glint]; neon [glow, tube, hot core];
 * ceramic [outline, body, gleam]; starfield [dim, bright]; bubbles [rim, small]; sparks [hot, warm, cool]; rain
 * [drop, splash]; snow [flake, star].
 */
export const palettes = {
  water: { light: ["#0c4a6e", "#075985", "#0369a1", "#0284c7"], dark: ["#1e40af", "#2563eb", "#38bdf8", "#bae6fd"] },
  sea: { light: ["#134e4a", "#115e59", "#0f766e", "#0d9488"], dark: ["#0f766e", "#14b8a6", "#2dd4bf", "#ccfbf1"] },
  cola: { light: ["#2b1408", "#431d0b", "#5c2a10", "#92400e"], dark: ["#7c3a12", "#9a4a1c", "#c07a3e", "#ecc89c"] },
  coffee: { light: ["#3b2314", "#4a2c18", "#5b3a24", "#7c4a2a"], dark: ["#7b5135", "#946446", "#b8875e", "#e2c9a6"] },
  tea: { light: ["#713f12", "#854d0e", "#a16207", "#b45309"], dark: ["#b45309", "#d97706", "#f59e0b", "#fde68a"] },
  juice: { light: ["#9a3412", "#c2410c", "#ea580c", "#c2410c"], dark: ["#c2410c", "#ea580c", "#fb923c", "#fed7aa"] },
  wine: { light: ["#4c0519", "#881337", "#9f1239", "#be123c"], dark: ["#9f1239", "#be123c", "#e11d48", "#fda4af"] },
  milk: { light: ["#64748b", "#94a3b8", "#94a3b8", "#64748b"], dark: ["#cbd5e1", "#e2e8f0", "#f1f5f9", "#ffffff"] },
  glass: { light: ["#475569", "#94a3b8", "#64748b"], dark: ["#94a3b8", "#f8fafc", "#cbd5e1"] },
  fire: { light: ["#7f1d1d", "#b91c1c", "#c2410c", "#d97706", "#a16207"], dark: ["#7f1d1d", "#dc2626", "#f97316", "#facc15", "#fef9c3"] },
  candle: { light: ["#9a3412", "#c2410c", "#d97706", "#b45309", "#92400e"], dark: ["#c2410c", "#f97316", "#fbbf24", "#fde68a", "#fffbeb"] },
  lava: { light: ["#7f1d1d", "#b91c1c", "#ea580c", "#ca8a04"], dark: ["#991b1b", "#ef4444", "#f97316", "#fde047"] },
  smoke: { light: ["#9ca3af", "#6b7280", "#4b5563"], dark: ["#4b5563", "#9ca3af", "#d1d5db"] },
  steam: { light: ["#94a3b8", "#64748b"], dark: ["#94a3b8", "#e2e8f0"] },
  cloud: { light: ["#6b7280", "#9ca3af", "#4b5563"], dark: ["#e5e7eb", "#6b7280", "#9ca3af"] },
  storm: { light: ["#374151", "#6b7280", "#1f2937"], dark: ["#9ca3af", "#374151", "#4b5563"] },
  steel: { light: ["#1e293b", "#475569", "#64748b", "#94a3b8"], dark: ["#475569", "#94a3b8", "#cbd5e1", "#ffffff"] },
  gold: { light: ["#713f12", "#854d0e", "#a16207", "#ca8a04"], dark: ["#a16207", "#eab308", "#fde047", "#fffbeb"] },
  copper: { light: ["#7c2d12", "#9a3412", "#c2410c", "#ea580c"], dark: ["#9a3412", "#c2410c", "#fb923c", "#ffedd5"] },
  wood: { light: ["#3f2a14", "#6b4423", "#8b5a2b"], dark: ["#6b4423", "#a0682f", "#d29b5c"] },
  grass: { light: ["#14532d", "#15803d", "#16a34a"], dark: ["#166534", "#22c55e", "#86efac"] },
  seaweed: { light: ["#064e3b", "#047857", "#059669"], dark: ["#065f46", "#10b981", "#6ee7b7"] },
  sand: { light: ["#713f12", "#92400e", "#a16207"], dark: ["#a16207", "#d4a24c", "#f5deb3"] },
  ice: { light: ["#0369a1", "#0284c7", "#0c4a6e"], dark: ["#7dd3fc", "#bae6fd", "#ffffff"] },
  neon: { light: ["#f9a8d4", "#db2777", "#831843"], dark: ["#9d174d", "#ec4899", "#fce7f3"] },
  cyan: { light: ["#67e8f9", "#0891b2", "#164e63"], dark: ["#155e75", "#22d3ee", "#ecfeff"] },
  lamp: { light: ["#fcd34d", "#d97706", "#92400e"], dark: ["#92400e", "#f59e0b", "#fef3c7"] },
  ceramic: { light: ["#374151", "#9ca3af", "#6b7280"], dark: ["#e5e7eb", "#6b7280", "#ffffff"] },
  wax: { light: ["#92400e", "#d6b98c", "#78350f"], dark: ["#fef3c7", "#a8a29e", "#ffffff"] },
  moon: { light: ["#a16207", "#ca8a04", "#854d0e"], dark: ["#fef9c3", "#fde68a", "#ffffff"] },
  night: { light: ["#334155", "#94a3b8", "#475569"], dark: ["#cbd5e1", "#475569", "#f1f5f9"] },
  stars: { light: ["#94a3b8", "#334155"], dark: ["#64748b", "#f8fafc"] },
  rose: { light: ["#be123c", "#e11d48", "#9f1239"], dark: ["#e11d48", "#fb7185", "#ffe4e6"] },
  goldfish: { light: ["#c2410c", "#ea580c", "#9a3412"], dark: ["#ea580c", "#fb923c", "#ffedd5"] },
  brick: { light: ["#7f1d1d", "#9a3412"], dark: ["#b91c1c", "#f97316"] },
  bubbles: { light: ["#0284c7", "#0369a1"], dark: ["#7dd3fc", "#f0f9ff"] },
  fizz: { light: ["#92400e", "#b45309"], dark: ["#e0b98a", "#fef3c7"] },
  sparks: { light: ["#ca8a04", "#ea580c", "#b91c1c"], dark: ["#fde047", "#f97316", "#dc2626"] },
  rain: { light: ["#1d4ed8", "#2563eb"], dark: ["#60a5fa", "#bfdbfe"] },
  snow: { light: ["#64748b", "#94a3b8"], dark: ["#e2e8f0", "#ffffff"] },
  ink: { light: [INK.light], dark: [INK.dark] },
  sunset: { light: ["#1e1b4b", "#6d28d9", "#c2410c", "#ca8a04"], dark: ["#1e1b4b", "#7c3aed", "#f97316", "#fde047"] },
  sky: { light: ["#1e3a8a", "#2563eb", "#0ea5e9"], dark: ["#0f172a", "#1e3a8a", "#38bdf8"] },
} as const satisfies Record<string, Duo>;

/** The name of a palette in `palettes`. */
export type PaletteName = keyof typeof palettes;

// What a material or an emission takes as `colors`: a palette's name, stops for both pages, or { light, dark }.
type Colors = PaletteName | PaletteSpec;

// A material's colours: the named palette or the user's, spread along their fade to the n roles it draws with.
function colorsOf(what: string, v: unknown, def: PaletteName, n: number): Duo {
  let spec: PaletteSpec;
  if (v === undefined) spec = palettes[def];
  else if (typeof v === "string") {
    if (!Object.hasOwn(palettes, v)) fail(`${what} takes a palette's name, one of ${and(Object.keys(palettes))}, or colours as #rrggbb, not ${JSON.stringify(v)}`);
    spec = palettes[v as PaletteName];
  } else if (Array.isArray(v)) {
    if (!v.length || !v.every(isHex)) fail(`${what} takes colours as #rrggbb, one or more, not ${JSON.stringify(v)}`);
    spec = v;
  } else if (isObject(v) && Array.isArray(v.light) && Array.isArray(v.dark)) {
    if (!v.light.length || !v.dark.length || !v.light.every(isHex) || !v.dark.every(isHex))
      fail(`${what} takes { light, dark }, each one or more colours as #rrggbb, not ${JSON.stringify(v)}`);
    spec = v as unknown as PaletteSpec;
  } else fail(`${what} takes a palette's name, colours as #rrggbb, or { light, dark }, not ${show(v)}`);
  const s = spread(spec, n);
  return Array.isArray(s) ? { light: s, dark: s } : (s as Duo);
}

// --- areas: where something is -------------------------------------------------------

/** Where in its room a shape goes: a corner, an edge's middle, or the centre. */
export type Anchor = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
/** A point in cells: x columns across and y rows down from the top left. */
export type Point = readonly [number, number];
/** A size as a word: a share of the room's height. tiny 0.2, small 0.35, medium 0.55, large 0.75, huge 0.9, full 1. */
export type SizeWord = "tiny" | "small" | "medium" | "large" | "huge" | "full";

const ANCHORS: readonly Anchor[] = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
const SIZES: Record<SizeWord, number> = { tiny: 0.2, small: 0.35, medium: 0.55, large: 0.75, huge: 0.9, full: 1 };
// A cell's height in cell widths: every picture has the tall cells of a character.
const ASPECT = 2;

/**
 * An area laid out in a picture of a given size: which points are in it, and the box they lie in. x is columns
 * across and y rows down, fractions inside a cell; the cell at column 3, row 2 spans x 3 to 4 and y 2 to 3.
 */
export interface Placed {
  /** True for a point in the area. */
  test(x: number, y: number): boolean;
  /** The box the area lies in, in cells: x0 to x1 across and y0 to y1 down. It may reach past the picture. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** For a liquid's area from inside(): the row its surface rests at. */
  readonly level?: number;
  /** For a liquid's area from inside(): the whole room in the vessel, which waves rise into above the level. */
  readonly room?: Placed;
  /** For a vessel such as cup() or bottle(): the room inside its walls and base, which inside() fills. */
  readonly cavity?: Placed;
  /** True for a vessel open at the top, such as a cup: glass draws no lid across it. */
  readonly open?: boolean;
  /** For text: the character at a cell, "" where the material should use its own. */
  readonly char?: (x: number, y: number) => string;
  /** The room a shape was placed in (the picture, or the area given as `within`): a swimming shape keeps to it. */
  readonly frame?: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * Where something is: any shape, laid out once the picture's size is known. Make one with a shape such as cup() or
 * house(), a primitive in `area` such as area.rect(), or by combining others with union(), subtract(), intersect() and
 * inside(). Give it to shape() with a material to fill it, or to emit() as where an emission comes from.
 */
export interface Area {
  readonly kind: "area";
  /** The area in a picture `cols` by `rows`. The kit calls this; it is worked out once for each size. */
  place(cols: number, rows: number): Placed;
  /** The material shape() fills it with when it is given none: fire for a flame, glass for a cup. */
  readonly material?: () => Material;
  /** For an area in fixed cells (area.rect and the other primitives): how far right and down it reaches, so picture() can size itself to it. */
  readonly extent?: { readonly cols: number; readonly rows: number };
  /**
   * For a shape made of parts (a house's walls, roof and chimney; a mug's handle and body): the parts, in the order
   * shape() draws them, each outlined on its own, so a roof keeps its eaves and a mug's side runs past its handle.
   */
  readonly pieces?: readonly Area[];
}

const isArea = (v: unknown): v is Area => isObject(v) && v.kind === "area" && typeof v.place === "function";

// An area from a layout function, worked out once for each picture size.
function makeArea(place: (cols: number, rows: number) => Placed, more: { material?: () => Material; extent?: { cols: number; rows: number }; pieces?: readonly Area[] } = {}): Area {
  let key = "", last: Placed | null = null;
  return {
    kind: "area",
    place(cols, rows) {
      const k = `${cols}x${rows}`;
      if (k !== key || !last) (last = place(cols, rows)), (key = k);
      return last;
    },
    ...more,
  };
}

function areaOf(what: string, v: unknown): Area {
  if (!isArea(v)) fail(`${what} takes an area, such as cup(), area.rect(2, 2, 10, 4) or inside(cup()), not ${show(v)}`);
  return v;
}

/**
 * Where a shape goes and how big it is. Every field is optional: each shape has a size and a place that look right with
 * none.
 */
export interface Placement {
  /**
   * Where it goes in its room: an anchor word ("center", "bottom", "top-left" and the rest), its edge or corner
   * against the room's, or a point [x, y] in cells for its centre. Each shape has its own default, "center" for most and
   * "bottom" for those that stand on something, such as a cup or a house.
   */
  at?: Anchor | Point;
  /** Another area to place it in instead of the picture: at and size are then in that area's box. */
  within?: Area;
  /** Another area to stand it on: its bottom on that area's top, centred across it. Over `at`. */
  on?: Area;
  /** Columns to move it right after placing (left when below 0): 0. */
  x?: number;
  /** Rows to move it down after placing (up when below 0): 0. */
  y?: number;
  /** Its height as a word, "tiny" to "full", or a share of the room's height from 0 to 1. Each shape has a default, "medium" for most. */
  size?: SizeWord | number;
  /** Its width in cells, over size. Given alone, the height follows from the shape's proportions. */
  cols?: number;
  /** Its height in cells, over size. Given alone, the width follows from the shape's proportions. */
  rows?: number;
  /** Mirrors it left to right: false. */
  flip?: boolean;
}

const PLACE_KEYS = ["at", "within", "on", "x", "y", "size", "cols", "rows", "flip"] as const;

// Checks a Placement, now, for the shape called `what`.
function checkPlace(what: string, o: Placement): void {
  if (o.at !== undefined && !ANCHORS.includes(o.at as Anchor) && !(Array.isArray(o.at) && o.at.length === 2 && o.at.every((v) => Number.isFinite(v))))
    fail(`${what}.at takes ${and(ANCHORS.map((a) => JSON.stringify(a)))}, or a point [x, y] in cells, not ${show(o.at)}`);
  if (o.within !== undefined) areaOf(`${what}.within`, o.within);
  if (o.on !== undefined) areaOf(`${what}.on`, o.on);
  numberOf(`${what}.x`, o.x, 0);
  numberOf(`${what}.y`, o.y, 0);
  if (o.size !== undefined && !(typeof o.size === "string" && Object.hasOwn(SIZES, o.size)) && !(typeof o.size === "number" && o.size > 0 && o.size <= 1))
    fail(`${what}.size takes ${and(Object.keys(SIZES).map((s) => JSON.stringify(s)))}, or a share of the room's height above 0, up to 1, not ${show(o.size)}`);
  numberOf(`${what}.cols`, o.cols, 1, 1, 320, " of cells from 1 to 320");
  numberOf(`${what}.rows`, o.rows, 1, 1, 120, " of cells from 1 to 120");
  boolOf(`${what}.flip`, o.flip, false);
}

interface Box {
  x0: number;
  y0: number;
  w: number;
  h: number;
  flip: boolean;
  frame: { x0: number; y0: number; x1: number; y1: number };
}

// The room a shape is placed in: the picture, or the box of the area it is `within`, cut to the picture.
function roomOf(o: Placement,cols: number, rows: number) {
  if (!o.within) return { x0: 0, y0: 0, x1: cols, y1: rows };
  const p = o.within.place(cols, rows);
  return { x0: Math.max(0, p.x0), y0: Math.max(0, p.y0), x1: Math.min(cols, p.x1), y1: Math.min(rows, p.y1) };
}

// Where a shape of true proportions `ratio` (width over height) goes, in whole cells.
function boxOf(o: Placement,ratio: number, cols: number, rows: number, def: { size: SizeWord | number; at: Anchor }): Box {
  const f = roomOf(o, cols, rows);
  const fw = f.x1 - f.x0, fh = f.y1 - f.y0;
  const share = (s: SizeWord | number) => (typeof s === "number" ? s : SIZES[s]);
  let h = o.rows ?? (o.cols !== undefined ? o.cols / (ratio * ASPECT) : share(o.size ?? def.size) * fh);
  let w = o.cols ?? h * ratio * ASPECT;
  // A shape given by size never comes out wider than its room.
  if (o.cols === undefined && o.rows === undefined && w > fw) (h *= fw / w), (w = fw);
  h = Math.max(1, Math.round(h));
  w = Math.max(1, Math.round(w));
  let x0: number, y0: number;
  if (o.on) {
    const p = o.on.place(cols, rows);
    x0 = (p.x0 + p.x1) / 2 - w / 2;
    y0 = p.y0 - h;
  } else if (Array.isArray(o.at)) {
    x0 = o.at[0] - w / 2;
    y0 = o.at[1] - h / 2;
  } else {
    const a = (o.at as Anchor | undefined) ?? def.at;
    x0 = a.endsWith("left") ? f.x0 : a.endsWith("right") ? f.x1 - w : f.x0 + (fw - w) / 2;
    y0 = a.startsWith("top") ? f.y0 : a.startsWith("bottom") ? f.y1 - h : f.y0 + (fh - h) / 2;
  }
  return { x0: Math.round(x0 + (o.x ?? 0)), y0: Math.round(y0 + (o.y ?? 0)), w, h, flip: !!o.flip, frame: f };
}

// A shape drawn in true proportions: `unit` gets px across (-ratio / 2 to ratio / 2) and py down (-0.5 to 0.5), the
// shape's height being 1, so a circle of radius 0.5 is round on the tall cells.
type Unit = (px: number, py: number) => boolean;

function unitTest(b: Box, ratio: number, unit: Unit) {
  return (x: number, y: number) => {
    let u = (x - b.x0) / b.w;
    const v = (y - b.y0) / b.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    if (b.flip) u = 1 - u;
    return unit((u - 0.5) * ratio, v - 0.5);
  };
}

const placedOf = (b: Box, test: (x: number, y: number) => boolean, more: Partial<Placed> = {}): Placed => ({
  test,
  x0: b.x0,
  y0: b.y0,
  x1: b.x0 + b.w,
  y1: b.y0 + b.h,
  frame: b.frame,
  ...more,
});

// A shape of its own: checks its options now and lays it out in true proportions when the picture's size is known.
function unitShape(what: string, o: Placement | undefined, keys: readonly string[], ratio: number, def: { size: SizeWord | number; at: Anchor }, unit: Unit, more: { material?: () => Material; vessel?: { open: boolean; base: (h: number) => number } } = {}): Area {
  const p = optionsOf(`${what}()`, o, [...PLACE_KEYS, ...keys]) as Placement;
  checkPlace(what, p);
  return makeArea((cols, rows) => {
    const b = boxOf(p, ratio, cols, rows, def);
    const test = unitTest(b, ratio, unit);
    if (!more.vessel) return placedOf(b, test);
    const base = Math.max(1, more.vessel.base(b.h));
    const top = more.vessel.open ? 0 : 1;
    const cavity = (x: number, y: number) => test(x, y) && test(x - 1, y) && test(x + 1, y) && test(x, y + base) && (top === 0 || test(x, y - top));
    return placedOf(b, test, { cavity: { test: cavity, x0: b.x0, y0: b.y0, x1: b.x0 + b.w, y1: b.y0 + b.h }, open: more.vessel.open });
  }, { material: more.material });
}

// Inside a polygon of points, by the even-odd rule.
function inPolygon(pts: readonly Point[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// The distance from a point to a segment, on screen: rows count `ASPECT` columns.
function segmentDistance(x: number, y: number, a: Point, b: Point): number {
  const ax = a[0], ay = a[1] * ASPECT, bx = b[0], by = b[1] * ASPECT, py = y * ASPECT;
  const dx = bx - ax, dy = by - ay;
  const k = dx || dy ? clamp(((x - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)) : 0;
  return Math.hypot(x - (ax + dx * k), py - (ay + dy * k));
}

function pointsOf(what: string, v: unknown, min: number): Point[] {
  if (!Array.isArray(v) || v.length < min || !v.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n))))
    fail(`${what} takes a list of ${min} or more points [x, y] in cells, not ${show(v)}`);
  return v as Point[];
}

// The 3 by 5 pixel letters area.text() draws big, from banner's slim font.
const FONT: Record<string, string> = {
  A: ".#.|#.#|###|#.#|#.#", B: "##.|#.#|##.|#.#|##.", C: ".##|#..|#..|#..|.##", D: "##.|#.#|#.#|#.#|##.",
  E: "###|#..|##.|#..|###", F: "###|#..|##.|#..|#..", G: ".##|#..|#.#|#.#|.##", H: "#.#|#.#|###|#.#|#.#",
  I: "###|.#.|.#.|.#.|###", J: "..#|..#|..#|#.#|.#.", K: "#.#|#.#|##.|#.#|#.#", L: "#..|#..|#..|#..|###",
  M: "#.#|###|#.#|#.#|#.#", N: "##.|#.#|#.#|#.#|#.#", O: ".#.|#.#|#.#|#.#|.#.", P: "##.|#.#|##.|#..|#..",
  Q: ".#.|#.#|#.#|##.|.##", R: "##.|#.#|##.|#.#|#.#", S: ".##|#..|.#.|..#|##.", T: "###|.#.|.#.|.#.|.#.",
  U: "#.#|#.#|#.#|#.#|###", V: "#.#|#.#|#.#|.#.|.#.", W: "#.#|#.#|#.#|###|#.#", X: "#.#|#.#|.#.|#.#|#.#",
  Y: "#.#|#.#|.#.|.#.|.#.", Z: "###|..#|.#.|#..|###",
  0: "###|#.#|#.#|#.#|###", 1: ".#.|##.|.#.|.#.|###", 2: "##.|..#|.#.|#..|###", 3: "##.|..#|.#.|..#|##.",
  4: "#.#|#.#|###|..#|..#", 5: "###|#..|##.|..#|##.", 6: ".##|#..|###|#.#|###", 7: "###|..#|.#.|.#.|.#.",
  8: "###|#.#|###|#.#|###", 9: "###|#.#|###|..#|##.",
  ".": ".|.|.|.|#", ",": ".|.|.|#|#", "!": "#|#|#|.|#", "?": "##.|..#|.#.|...|.#.", "'": "#|#|.|.|.",
  ":": ".|#|.|#|.", "-": "...|...|###|...|...", "+": "...|.#.|###|.#.|...", "=": "...|###|...|###|...",
  "/": "..#|..#|.#.|#..|#..", "<": "..#|.#.|#..|.#.|..#", ">": "#..|.#.|..#|.#.|#..", "*": "#.#|.#.|#.#|...|...",
  " ": "..|..|..|..|..",
};

/**
 * The primitives: areas in fixed cells, for when a shape word does not fit. Positions are columns across and rows down
 * from 0, 0 at the top left, fractions allowed; sizes are in cells.
 */
export const area = {
  /** A rectangle: `cols` wide and `rows` tall, its top left cell at x, y. */
  rect(x: number, y: number, cols: number, rows: number): Area {
    numbers("area.rect", { x, y, cols, rows }, ["cols", "rows"]);
    return makeArea(() => ({ test: (px, py) => px >= x && px < x + cols && py >= y && py < y + rows, x0: x, y0: y, x1: x + cols, y1: y + rows }), {
      extent: { cols: x + cols, rows: y + rows },
    });
  },
  /** A rectangle with round corners, `radius` rows round (and twice that many columns, so the corners look round): 1. */
  rounded(x: number, y: number, cols: number, rows: number, radius = 1): Area {
    numbers("area.rounded", { x, y, cols, rows, radius }, ["cols", "rows"]);
    const ry = Math.min(radius, rows / 2), rx = Math.min(radius * ASPECT, cols / 2);
    return makeArea(
      () => ({
        test: (px, py) => {
          if (px < x || px >= x + cols || py < y || py >= y + rows) return false;
          const dx = Math.max(0, Math.max(x + rx - px, px - (x + cols - rx))), dy = Math.max(0, Math.max(y + ry - py, py - (y + rows - ry)));
          return !rx || !ry || (dx / rx) ** 2 + (dy / ry) ** 2 <= 1;
        },
        x0: x,
        y0: y,
        x1: x + cols,
        y1: y + rows,
      }),
      { extent: { cols: x + cols, rows: y + rows } },
    );
  },
  /** An ellipse centred on cx, cy: `rx` columns and `ry` rows from its centre to its edge. */
  ellipse(cx: number, cy: number, rx: number, ry: number): Area {
    numbers("area.ellipse", { cx, cy, rx, ry }, ["rx", "ry"]);
    return makeArea(() => ({ test: (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1, x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }), {
      extent: { cols: cx + rx, rows: cy + ry },
    });
  },
  /** A circle that looks round: `r` columns from its centre, and half as many rows, as draw's circle(). */
  circle(cx: number, cy: number, r: number): Area {
    numbers("area.circle", { cx, cy, r }, ["r"]);
    return area.ellipse(cx, cy, r, r / ASPECT);
  },
  /** A polygon through three or more points [x, y]; where it crosses itself, the even-odd rule says what is in. */
  polygon(points: readonly Point[]): Area {
    const pts = pointsOf("area.polygon", points, 3).map((p) => [p[0], p[1]] as Point);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    return makeArea(() => ({ test: (px, py) => inPolygon(pts, px, py), ...box }), { extent: { cols: box.x1, rows: box.y1 } });
  },
  /** A thick line through two or more points [x, y]: a straw, a stem, a river. `width` is in columns: 1. */
  path(points: readonly Point[], width = 1): Area {
    const pts = pointsOf("area.path", points, 2).map((p) => [p[0], p[1]] as Point);
    numbers("area.path", { width }, ["width"]);
    const r = width / 2;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const box = { x0: Math.min(...xs) - r, y0: Math.min(...ys) - r / ASPECT, x1: Math.max(...xs) + r, y1: Math.max(...ys) + r / ASPECT };
    return makeArea(
      () => ({
        test: (px, py) => {
          for (let i = 1; i < pts.length; i++) if (segmentDistance(px, py, pts[i - 1], pts[i]) <= r) return true;
          return false;
        },
        ...box,
      }),
      { extent: { cols: box.x1, rows: box.y1 } },
    );
  },
  /**
   * Text as an area: each character a cell, which a material fills with that character (neon makes a sign of it).
   * With `big`, letters of 3 by 5 pixels instead, each pixel 2 columns by 1 row, or `big` times that: a material
   * fills them with its own characters. Placed like a shape: "center" by default.
   */
  text(str: string, o?: Placement & { big?: boolean | number }): Area {
    if (typeof str !== "string" || !str.length || /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\ud800-\udfff]/.test(str))
      fail(`area.text takes a string of printable characters, not ${show(str)}`);
    const p = optionsOf("area.text()", o, [...PLACE_KEYS, "big"]) as Placement & { big?: boolean | number };
    checkPlace("area.text", p);
    const big = p.big === true ? 1 : p.big === false || p.big === undefined ? 0 : numberOf("area.text.big", p.big, 1, 1, 8);
    if (big && !Number.isInteger(big)) fail(`area.text.big takes true or a whole number from 1 to 8, not ${big}`);
    // The text as rows of characters ("" for none), drawn once.
    let grid: string[][];
    if (!big) grid = str.split("\n").map((l) => [...l].map((c) => (c === " " ? "" : c)));
    else {
      grid = [];
      for (const line of str.toUpperCase().split("\n")) {
        const rows: string[][] = Array.from({ length: 5 * big }, () => []);
        for (const ch of line) {
          const g = (FONT[ch] ?? FONT["?"]).split("|");
          for (let r = 0; r < 5; r++)
            for (const px of g[r] + ".")
              for (let k = 0; k < 2 * big; k++) for (let q = 0; q < big; q++) rows[r * big + q].push(px === "#" ? "#" : "");
        }
        grid.push(...rows, []);
      }
      grid.pop();
    }
    const w = Math.max(1, ...grid.map((r) => r.length)), h = Math.max(1, grid.length);
    return makeArea((cols, rows) => {
      const b = boxOf({ ...p, cols: w, rows: h, size: undefined }, w / h / ASPECT, cols, rows, { size: "medium", at: "center" });
      const at = (x: number, y: number) => grid[Math.floor(y) - b.y0]?.[Math.floor(x) - b.x0] ?? "";
      return placedOf(b, (x, y) => at(x, y) !== "", { char: (x, y) => (big ? "" : at(x, y)) });
    });
  },
  /**
   * An area of your own: `test(x, y)` says whether a point is in it, given the picture's size too. `box` is where to
   * look, in cells: the whole picture by default.
   */
  where(test: (x: number, y: number, cols: number, rows: number) => boolean, box?: { x: number; y: number; cols: number; rows: number }): Area {
    if (typeof test !== "function") fail("area.where takes a function (x, y, cols, rows) => true for a point in the area");
    if (box !== undefined) numbers("area.where's box", box as unknown as Record<string, number>, ["cols", "rows"]);
    return makeArea((cols, rows) => ({
      test: (x, y) => !!test(x, y, cols, rows),
      x0: box ? box.x : 0,
      y0: box ? box.y : 0,
      x1: box ? box.x + box.cols : cols,
      y1: box ? box.y + box.rows : rows,
    }));
  },
  /** The whole picture: for a sky, or a wash behind everything. */
  all(): Area {
    return makeArea((cols, rows) => ({ test: () => true, x0: 0, y0: 0, x1: cols, y1: rows }));
  },
};

// Checks numbers given to a primitive: all finite, and `positive` ones above 0.
function numbers(what: string, o: Record<string, number>, positive: readonly string[]): void {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== "number" || !Number.isFinite(v)) fail(`${what} takes a number for ${k}, not ${show(v)}`);
    if (positive.includes(k) && v <= 0) fail(`${what} takes ${k} above 0, not ${v}`);
  }
}

/** The whole picture, for a sky: shape(sky(), starfield()). */
export const sky = (): Area => area.all();

/** A band along the bottom of the picture, for grass, sand or a floor: `rows` tall, or `size` of the picture's height ("tiny" by default, 0.2). */
export function ground(o?: { size?: SizeWord | number; rows?: number; within?: Area }): Area {
  const p = optionsOf("ground()", o, ["size", "rows", "within"]);
  checkPlace("ground", p);
  return makeArea((cols, rows) => {
    const f = roomOf(p, cols, rows);
    const share = p.size === undefined ? 0.2 : typeof p.size === "number" ? p.size : SIZES[p.size];
    const h = p.rows ?? Math.max(1, Math.round((f.y1 - f.y0) * share));
    // on the picture, it runs on past the bottom and the sides, so it has no edge there
    const test = p.within ? (x: number, y: number) => x >= f.x0 && x < f.x1 && y >= f.y1 - h && y < f.y1 : (_x: number, y: number) => y >= f.y1 - h;
    return { test, x0: f.x0, y0: f.y1 - h, x1: f.x1, y1: f.y1 };
  });
}

// --- combining areas -------------------------------------------------------------------

/** Every point in any of the areas: a body and a handle, a house and its chimney. */
export function union(...areas: Area[]): Area {
  if (!areas.length) fail("union takes one or more areas");
  areas.forEach((a, i) => areaOf(`union's area ${i + 1}`, a));
  return makeArea((cols, rows) => {
    const ps = areas.map((a) => a.place(cols, rows));
    return {
      test: (x, y) => ps.some((p) => p.test(x, y)),
      x0: Math.min(...ps.map((p) => p.x0)),
      y0: Math.min(...ps.map((p) => p.y0)),
      x1: Math.max(...ps.map((p) => p.x1)),
      y1: Math.max(...ps.map((p) => p.y1)),
    };
  }, { material: areas[0].material });
}

/** The first area with the others taken out of it: a crescent from two circles, a door cut from a wall. */
export function subtract(from: Area, ...areas: Area[]): Area {
  areaOf("subtract's first area", from);
  areas.forEach((a, i) => areaOf(`subtract's area ${i + 2}`, a));
  return makeArea((cols, rows) => {
    const p = from.place(cols, rows), ps = areas.map((a) => a.place(cols, rows));
    const out = (x: number, y: number) => !ps.some((q) => q.test(x, y));
    // a liquid's room loses the same, so its waves stay out of what was taken out too
    const room = p.room && { ...p.room, test: (x: number, y: number) => p.room!.test(x, y) && out(x, y) };
    return { ...p, test: (x, y) => p.test(x, y) && out(x, y), cavity: undefined, room };
  }, { material: from.material });
}

/** Only the points in every one of the areas: a window's glass cut to a circle. */
export function intersect(...areas: Area[]): Area {
  if (!areas.length) fail("intersect takes one or more areas");
  areas.forEach((a, i) => areaOf(`intersect's area ${i + 1}`, a));
  return makeArea((cols, rows) => {
    const ps = areas.map((a) => a.place(cols, rows));
    return {
      test: (x, y) => ps.every((p) => p.test(x, y)),
      x0: Math.max(...ps.map((p) => p.x0)),
      y0: Math.max(...ps.map((p) => p.y0)),
      x1: Math.min(...ps.map((p) => p.x1)),
      y1: Math.min(...ps.map((p) => p.y1)),
    };
  }, { material: areas[0].material });
}

/** How full: a share from 0 to 1, or "low" 0.3, "half" 0.5, "high" 0.75, "full" 0.9 or "brim" 1. */
export type Fill = number | "low" | "half" | "high" | "full" | "brim";
const FILLS = { low: 0.3, half: 0.5, high: 0.75, full: 0.9, brim: 1 } as const;

/**
 * The room inside a vessel, up to a level: the water in a glass, the coffee in a mug, the lava in a lamp. A vessel
 * made by cup(), mug(), bottle() or lamp().globe knows its walls and base; any other area is taken in by `wall`
 * columns at the sides and `base` rows at the bottom. A liquid (water) rests its surface at the level and its waves
 * rise into the room above it, never past the walls.
 */
export function inside(vessel: Area, o?: { fill?: Fill; wall?: number; base?: number }): Area {
  areaOf("inside", vessel);
  const p = optionsOf("inside()", o, ["fill", "wall", "base"]);
  const fill = typeof p.fill === "string" ? (Object.hasOwn(FILLS, p.fill) ? FILLS[p.fill] : fail(`inside's fill takes ${and(Object.keys(FILLS).map((f) => JSON.stringify(f)))}, or a share from 0 to 1, not ${JSON.stringify(p.fill)}`)) : numberOf("inside's fill", p.fill, 1, 0, 1);
  const wall = numberOf("inside's wall", p.wall, 1, 0, 40), base = numberOf("inside's base", p.base, 1, 0, 40);
  return makeArea((cols, rows) => {
    const v = vessel.place(cols, rows);
    const room: Placed =
      v.cavity && p.wall === undefined && p.base === undefined
        ? v.cavity
        : { test: (x, y) => v.test(x, y) && v.test(x - wall, y) && v.test(x + wall, y) && v.test(x, y + base), x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1 };
    // The room's extent, by its cells' centres, so what is placed within it lands inside the walls.
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    for (let y = Math.max(0, Math.floor(room.y0)); y < Math.min(rows, Math.ceil(room.y1)); y++)
      for (let x = Math.max(0, Math.floor(room.x0)); x < Math.min(cols, Math.ceil(room.x1)); x++)
        if (room.test(x + 0.5, y + 0.5)) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y + 1);
          left = Math.min(left, x);
          right = Math.max(right, x + 1);
        }
    if (top === Infinity) return { test: () => false, x0: 0, y0: 0, x1: 0, y1: 0, level: 0, room };
    const level = bottom - fill * (bottom - top);
    const bounds = { test: room.test, x0: left, y0: top, x1: right, y1: bottom };
    return { test: (x, y) => y >= level && room.test(x, y), x0: left, y0: Math.floor(level), x1: right, y1: bottom, level, room: bounds };
  });
}

// --- shapes: common things by name --------------------------------------------------------

type ShapeOpts<E = object> = Placement & E;

/** A tumbler, wider at the rim than the base by `taper` (0 to 0.6: 0.15), with a thick glass base. Glass by default; a vessel for inside(). */
export function cup(o?: ShapeOpts<{ taper?: number }>): Area {
  const taper = numberOf("cup.taper", o?.taper, 0.15, 0, 0.6);
  const ratio = 0.72, hw = ratio / 2;
  return unitShape("cup", o, ["taper"], ratio, { size: "large", at: "bottom" }, (px, py) => {
    const w = hw * (1 - taper * (py + 0.5));
    if (Math.abs(px) > w) return false;
    // round the bottom corners a little
    const r = 0.1, cy = 0.5 - r, cx = w - r;
    return py < cy || Math.abs(px) < cx || Math.hypot(Math.abs(px) - cx, py - cy) <= r;
  }, { material: () => glass(), vessel: { open: true, base: (h) => Math.max(1, Math.round(h * 0.15)) } });
}

/** A mug with a handle on the right (`flip` puts it on the left). Ceramic by default; a vessel for inside(), the handle left out. */
export function mug(o?: ShapeOpts): Area {
  const p = optionsOf("mug()", o, PLACE_KEYS) as Placement;
  checkPlace("mug", p);
  // laid out in whole cells, so the body comes out the same on both sides
  const layout = (cols: number, rows: number) => {
    const b = boxOf(p, 0.95, cols, rows, { size: "medium", at: "bottom" });
    const bw = Math.max(3, Math.round(b.w * 0.72)), hw = b.w - bw;
    const bx0 = b.flip ? b.x0 + hw : b.x0, bx1 = bx0 + bw, y1 = b.y0 + b.h;
    const ry = Math.max(0.5, b.h * 0.1), rx = ry * ASPECT;
    const body = (x: number, y: number) => {
      if (x < bx0 || x >= bx1 || y < b.y0 || y >= y1) return false;
      const dx = Math.max(0, bx0 + rx - x, x - (bx1 - rx)), dy = Math.max(0, y - (y1 - ry));
      return (dx / rx) ** 2 + (dy / ry) ** 2 <= 1;
    };
    // the handle: a bracket a cell thick off the body's side, a little above the middle, "--." over "|" over "--'"
    const hl = Math.min(hw, 4), hh = Math.max(3, Math.round(b.h * 0.45)), ht = Math.round(b.y0 + b.h * 0.22);
    const hx0 = b.flip ? bx0 - hl : bx1, hx1 = hx0 + hl;
    const handle = (x: number, y: number) => {
      if (x < hx0 || x >= hx1 || y < ht || y >= ht + hh) return false;
      return y < ht + 1 || y >= ht + hh - 1 || (b.flip ? x < hx0 + 1 : x >= hx1 - 1);
    };
    const base = Math.max(1, Math.round(b.h * 0.08));
    const cavity = (x: number, y: number) => body(x, y) && body(x - 1, y) && body(x + 1, y) && body(x, y + base);
    return { b, body, handle, cavity: { test: cavity, x0: bx0, y0: b.y0, x1: bx1, y1 } };
  };
  const vessel = (l: ReturnType<typeof layout>, test: (x: number, y: number) => boolean) => placedOf(l.b, test, { cavity: l.cavity, open: true });
  const handle = makeArea((cols, rows) => {
    const l = layout(cols, rows);
    return placedOf(l.b, l.handle);
  });
  const body = makeArea((cols, rows) => {
    const l = layout(cols, rows);
    return vessel(l, l.body);
  });
  return makeArea((cols, rows) => {
    const l = layout(cols, rows);
    return vessel(l, (x, y) => l.body(x, y) || l.handle(x, y));
  }, { material: () => ceramic(), pieces: [handle, body] });
}

/** A bottle: a narrow neck, round shoulders and a body. Glass by default; a vessel for inside(). */
export function bottle(o?: ShapeOpts): Area {
  const ratio = 0.42;
  return unitShape("bottle", o, [], ratio, { size: "large", at: "bottom" }, (px, py) => {
    const neck = py < -0.45 ? 0.1 : 0.085;
    const w = py < -0.12 ? neck : py < 0.08 ? lerp(0.085, 0.21, smoothstep(-0.12, 0.08, py)) : 0.21;
    if (Math.abs(px) > w) return false;
    const r = 0.06, cy = 0.5 - r, cx = w - r;
    return py < cy || Math.abs(px) < cx || Math.hypot(Math.abs(px) - cx, py - cy) <= r;
  }, { material: () => glass(), vessel: { open: true, base: (h) => Math.max(1, Math.round(h * 0.06)) } });
}

/**
 * A straw leaning in a vessel: give it the vessel as `within`, and it stands on the vessel's floor and reaches a third
 * again above its rim. `lean` is how far its top leans right, as a share of its height (0.35; below 0 leans left).
 * Drawn before the glass and the drink, the drink bends it where it goes under, as water does. Red stripes by default.
 */
export function straw(o?: ShapeOpts<{ lean?: number }>): Area {
  const p = optionsOf("straw()", o, [...PLACE_KEYS, "lean"]) as Placement & { lean?: number };
  checkPlace("straw", p);
  const lean = numberOf("straw.lean", p.lean, 0.35, -2, 2);
  return makeArea((cols, rows) => {
    const f = roomOf(p, cols, rows);
    const h = p.rows ?? Math.round((f.y1 - f.y0) * (p.size === undefined ? 1.3 : typeof p.size === "number" ? p.size : SIZES[p.size]));
    // its foot in the middle of the room's floor, unless placed by at or a point
    const b = p.at !== undefined || p.on ? boxOf({ ...p, rows: h, cols: Math.max(2, Math.round(Math.abs(lean) * h * ASPECT) + 2) }, 1, cols, rows, { size: "large", at: "bottom" }) : null;
    const foot: Point = b ? [lean >= 0 ? b.x0 + 1 : b.x0 + b.w - 1, b.y0 + b.h - 0.5] : [Math.round((f.x0 + f.x1) / 2 - (lean * h * ASPECT) / 3) + (p.x ?? 0), f.y1 - 1.5 + (p.y ?? 0)];
    const tip: Point = [foot[0] + lean * h * ASPECT, foot[1] - h];
    // one cell a row: across, it is a column wide wherever it is
    return {
      test: (x, y) => y >= tip[1] && y <= foot[1] && Math.abs(x - lerp(foot[0], tip[0], (foot[1] - y) / h)) <= 0.5,
      x0: Math.min(foot[0], tip[0]) - 1,
      y0: tip[1] - 1,
      x1: Math.max(foot[0], tip[0]) + 1,
      y1: foot[1] + 1,
    };
  }, {
    material: () => {
      const ch = lean > 0.2 ? "/" : lean < -0.2 ? "\\" : "|";
      return material((c) => [ch, c.y % 2], { name: "straw", colors: { light: ["#dc2626", "#94a3b8"], dark: ["#ef4444", "#f8fafc"] } });
    },
  });
}

/**
 * A box: square on screen unless given `ratio` (width over height, 1) or cols and rows. Solid by default; a closed
 * vessel for inside(), a wall of one cell all round, so a tank of glass() holds water().
 */
export function box(o?: ShapeOpts<{ ratio?: number }>): Area {
  const ratio = numberOf("box.ratio", o?.ratio, 1, 0.05, 20);
  return unitShape("box", o, ["ratio"], ratio, { size: "small", at: "center" }, () => true, { vessel: { open: false, base: () => 1 } });
}

/** A ball: a circle, round on screen. Solid by default. */
export function ball(o?: ShapeOpts): Area {
  return unitShape("ball", o, [], 1, { size: "small", at: "center" }, (px, py) => px * px + py * py <= 0.25);
}

/** A soft, lumpy blob, a different one for each `seed` (1). Lava by default. */
export function blob(o?: ShapeOpts<{ seed?: number }>): Area {
  const seed = seedOf("blob.seed", o?.seed, 1);
  const a = hash(seed, 1) * TAU, b = hash(seed, 2) * TAU, c = hash(seed, 3) * TAU;
  return unitShape("blob", o, ["seed"], 1.2, { size: "small", at: "center" }, (px, py) => {
    const t = Math.atan2(py, px / 1.2);
    const r = 0.5 * (0.84 + 0.08 * Math.sin(3 * t + a) + 0.05 * Math.sin(5 * t + b) + 0.03 * Math.sin(2 * t + c));
    return Math.hypot(px / 1.2, py) <= r;
  }, { material: () => lava() });
}

// The puffs of cloud(), as circles [x, y, r] in its true proportions, over a flat base.
const PUFFS: readonly (readonly [number, number, number])[] = [[-0.78, 0.18, 0.24], [-0.38, -0.02, 0.36], [0.12, -0.2, 0.32], [0.55, 0.02, 0.3], [0.88, 0.2, 0.22]];

/**
 * A cloud, as a shape and as a material. As a shape, cloud() is puffs on a flat base, filled with cloud by default:
 * shape(cloud({ at: "top-left" })). As a material, shape(anyArea, cloud()) fills any area with soft cloud and a round
 * outline. `colors`: "cloud" (or "storm" for a dark one); `period` of its drift: 8 seconds.
 */
export function cloud(o?: ShapeOpts<{ colors?: Colors; period?: number }>): Area & Material {
  const shapeArea = unitShape("cloud", o, ["colors", "period"], 2.2, { size: "small", at: "top" }, (px, py) => {
    if (py > 0.42) return false;
    if (py > 0.22 && px > -0.9 && px < 1.0) return true;
    return PUFFS.some(([x, y, r]) => (px - x) ** 2 + (py - y) ** 2 <= r * r);
  });
  const fill = cloudMaterial(o?.colors, o?.period);
  return { ...shapeArea, ...fill, kind: "area", material: () => fill } as unknown as Area & Material;
}

/** A flame: round at the bottom and pointed at the top. Fire by default: shape(flame({ on: candle })). */
export function flame(o?: ShapeOpts): Area {
  return unitShape("flame", o, [], 0.55, { size: "small", at: "center" }, (px, py) => {
    if (py >= 0.2) return px * px + (py - 0.2) ** 2 <= 0.075;
    const k = (py + 0.5) / 0.7;
    return Math.abs(px) <= 0.274 * Math.pow(k, 1.4) * (1 + 0.15 * Math.sin(k * 3));
  }, { material: () => fire() });
}

/** A leaf, pointed at both ends. Grass's greens by default. */
export function leaf(o?: ShapeOpts): Area {
  return unitShape("leaf", o, [], 0.6, { size: "small", at: "center" }, (px, py) => Math.abs(px) <= 0.3 * Math.pow(Math.sin(Math.PI * (py + 0.5)), 0.9), {
    material: () => solid({ colors: "grass", char: "▓" }),
  });
}

/** A heart. Rose red by default. */
export function heart(o?: ShapeOpts): Area {
  return unitShape("heart", o, [], 1.1, { size: "small", at: "center" }, (px, py) => {
    const x = px * 2.1, y = -py * 2.3 + 0.12;
    return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0;
  }, { material: () => solid({ colors: "rose" }) });
}

/** A star of `points` points (5), its inner corners `inner` of the way out (0.45). Gold by default. */
export function star(o?: ShapeOpts<{ points?: number; inner?: number }>): Area {
  const n = numberOf("star.points", o?.points, 5, 3, 24);
  if (!Number.isInteger(n)) fail(`star.points takes a whole number from 3 to 24, not ${n}`);
  const inner = numberOf("star.inner", o?.inner, 0.45, 0.05, 1);
  const pts: Point[] = Array.from({ length: 2 * n }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? 0.5 * inner : 0.5;
    return [r * Math.cos(a), 0.04 + r * Math.sin(a)];
  });
  return unitShape("star", o, ["points", "inner"], 1, { size: "small", at: "center" }, (px, py) => inPolygon(pts, px, py), {
    material: () => solid({ colors: "gold" }),
  });
}

/** A crescent moon, lit on its left: `flip` lights its right. Pale yellow by default. */
export function moon(o?: ShapeOpts): Area {
  return unitShape("moon", o, [], 1, { size: "small", at: "top-right" }, (px, py) => px * px + py * py <= 0.25 && (px - 0.2) ** 2 + py * py > 0.42 * 0.42, {
    material: () => solid({ colors: "moon", char: "█" }),
  });
}

/** A fish facing right (`flip` turns it left), with an eye, for shape(fish(), { move: "swim" }). An outlined goldfish by default. */
export function fish(o?: ShapeOpts): Area {
  const p = optionsOf("fish()", o, PLACE_KEYS) as Placement;
  checkPlace("fish", p);
  const ratio = 1.8;
  // a body, and a tail forked at the back
  const unit: Unit = (px, py) => {
    if (((px - 0.15) / 0.6) ** 2 + (py / 0.4) ** 2 <= 1) return true;
    return px < -0.38 && px > -0.9 + 0.3 * (1 - Math.abs(py) / 0.4) && Math.abs(py) <= 0.08 + (-0.38 - px) * 0.8;
  };
  return makeArea((cols, rows) => {
    const b = boxOf(p, ratio, cols, rows, { size: "tiny", at: "center" });
    // the eye: a cell back from the nose, a little above the middle; a material that takes text draws it
    const ex = Math.floor(b.flip ? b.x0 + b.w * 0.22 : b.x0 + b.w * 0.78), ey = Math.floor(b.y0 + b.h * 0.4);
    return placedOf(b, unitTest(b, ratio, unit), { char: (x, y) => (Math.floor(x) === ex && Math.floor(y) === ey ? "o" : "") });
  }, { material: () => solid({ colors: "goldfish", char: " ", edge: true }) });
}

/** A house's parts, each an area of its own, besides the whole house. */
export interface House extends Area {
  readonly walls: Area;
  readonly roof: Area;
  readonly chimney: Area;
  readonly door: Area;
  readonly windows: Area;
}

/** A house: walls, a pitched roof with eaves, a chimney, a door and two windows, each an area too: house().chimney. Ceramic by default. */
export function house(o?: ShapeOpts): House {
  const p = optionsOf("house()", o, PLACE_KEYS) as Placement;
  checkPlace("house", p);
  const ratio = 1.15;
  const rect = (x0: number, y0: number, x1: number, y1: number): Unit => (px, py) => px >= x0 && px <= x1 && py >= y0 && py <= y1;
  // the roof reaches a little below the walls' top, so its eaves are the one line there
  const roofPts: Point[] = [[0, -0.36], [-0.56, 0.12], [0.56, 0.12]];
  const units: Record<string, Unit> = {
    walls: rect(-0.42, 0.06, 0.42, 0.5),
    roof: (px, py) => inPolygon(roofPts, px, py),
    chimney: rect(0.22, -0.5, 0.33, -0.1),
    door: rect(-0.08, 0.24, 0.08, 0.5),
    windows: (px, py) => py >= 0.14 && py <= 0.32 && ((px >= -0.34 && px <= -0.16) || (px >= 0.16 && px <= 0.34)),
  };
  const part = (u: Unit, more: { pieces?: Area[] } = {}) => makeArea((cols, rows) => {
    const b = boxOf(p, ratio, cols, rows, { size: "large", at: "bottom" });
    return placedOf(b, unitTest(b, ratio, u));
  }, more);
  const walls = part(units.walls), roof = part(units.roof), chimney = part(units.chimney);
  // drawn chimney, walls, then the roof over them both, so the roof keeps its eaves
  const whole = part((px, py) => units.walls(px, py) || units.roof(px, py) || units.chimney(px, py), { pieces: [chimney, walls, roof] });
  return Object.assign(whole, {
    material: () => ceramic({ colors: "night" }),
    walls,
    roof,
    chimney,
    door: part(units.door),
    windows: part(units.windows),
  });
}

/** A lava lamp's parts: a cap, a glass globe (a vessel for inside()) and a base, besides the whole lamp. */
export interface Lamp extends Area {
  readonly cap: Area;
  readonly globe: Area;
  readonly base: Area;
}

/** A lava lamp: a metal cap and base round a tapering glass globe. Fill inside(lamp.globe) with lava(). */
export function lamp(o?: ShapeOpts): Lamp {
  const p = optionsOf("lamp()", o, PLACE_KEYS) as Placement;
  checkPlace("lamp", p);
  const ratio = 0.42;
  const units: Record<string, Unit> = {
    cap: (px, py) => py >= -0.5 && py < -0.38 && Math.abs(px) <= lerp(0.05, 0.1, (py + 0.5) / 0.12),
    globe: (px, py) => {
      if (py < -0.38 || py > 0.24) return false;
      const k = (py + 0.38) / 0.62;
      const w = lerp(0.1, 0.18, Math.sin((k * Math.PI) / 2) ** 1.5) - (k > 0.85 ? (k - 0.85) * 0.25 : 0);
      return Math.abs(px) <= w;
    },
    base: (px, py) => py > 0.24 && py <= 0.5 && Math.abs(px) <= lerp(0.13, 0.21, (py - 0.24) / 0.26),
  };
  const part = (u: Unit, vessel = false) => makeArea((cols, rows) => {
    const b = boxOf(p, ratio, cols, rows, { size: "large", at: "bottom" });
    const test = unitTest(b, ratio, u);
    if (!vessel) return placedOf(b, test);
    const cavity = (x: number, y: number) => test(x, y) && test(x - 1, y) && test(x + 1, y) && test(x, y + 1) && test(x, y - 1);
    return placedOf(b, test, { cavity: { test: cavity, x0: b.x0, y0: b.y0, x1: b.x0 + b.w, y1: b.y0 + b.h }, open: false });
  });
  const cap = part(units.cap), globe = part(units.globe, true), base = part(units.base);
  const whole = Object.assign(part((px, py) => units.cap(px, py) || units.globe(px, py) || units.base(px, py)), { pieces: [globe, base, cap] });
  return Object.assign(whole, { material: () => metal(), cap, globe, base });
}

// --- cells: an area worked out on the picture's grid -----------------------------------------------

/**
 * An area worked out on the picture's grid, for a material to draw: which cells are in it, how much of each it covers,
 * its outline and which way is in, and how far each cell is from its edge. Arrays have one entry a cell of the
 * picture, row by row; a material reads them and keeps nothing between frames.
 */
export interface Cells {
  /** The picture's size. */
  readonly cols: number;
  readonly rows: number;
  /** The index of every cell in the area, row by row. */
  readonly list: Int32Array;
  /** 1 for a cell in the area (half or more of it covered), 0 for one out of it. */
  readonly inside: Uint8Array;
  /** How much of each cell the area covers, 0 to 1. */
  readonly cover: Float32Array;
  /** 1 for a cell on the area's edge: in it, with a cell above, below, left or right that is not. */
  readonly border: Uint8Array;
  /** 1 for a cell just outside a sloping top or bottom that the edge passes through: part of outline(), not of the area. */
  readonly fringe: Uint8Array;
  /** True for a cell in the area, one cell past the picture on each side included (false further out). */
  has(x: number, y: number): boolean;
  /**
   * The area's outline as characters: its edge cells (edgeChar()), and the cells just outside a sloping top or bottom
   * that the edge passes through low or high, so a shallow slope reads "_.-" rather than stepping. Worked out once for
   * each style. Outlining materials (glass, ceramic, ice, metal, cloud) draw it.
   */
  outline(style?: EdgeStyle): { readonly cells: Int32Array; readonly chars: Uint16Array };
  /** Which way is in, at the edge, on screen (rows count 2): a unit vector, 0, 0 off the edge. */
  readonly nx: Float32Array;
  readonly ny: Float32Array;
  /** How far a cell is from the area's edge, in columns (a row counts 2): 0 on the edge. */
  readonly depth: Float32Array;
  /** The deepest a cell is. */
  readonly maxDepth: number;
  /** The box of the cells in it: columns x0 to x1 - 1, rows y0 to y1 - 1. Empty when x1 <= x0. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** For each column of the picture, the first and last row in the area, -1 for none. */
  readonly top: Int16Array;
  readonly bottom: Int16Array;
  /** For each row of the picture, the first and last column in the area, -1 for none. */
  readonly left: Int16Array;
  readonly right: Int16Array;
  /** A liquid's resting surface (from inside()), as a row with a fraction: null for an area that is not a liquid's. */
  readonly level: number | null;
  /** A liquid's whole room, waves and all (from inside()): null otherwise. */
  readonly room: Cells | null;
  /** A vessel's room inside its walls (cup(), mug(), bottle(), lamp().globe): null otherwise. */
  readonly cavity: Cells | null;
  /** True for a vessel open at the top. */
  readonly open: boolean;
  /** Text's character at a cell, "" for none: null for an area that is not text. */
  readonly char: ((x: number, y: number) => string) | null;
  /** The area as placed. */
  readonly placed: Placed;
}

// Points looked at across and down each cell, to know how much of it an area covers.
const SAMPLES = 4;

/** Works an area out on a grid of `cols` by `rows`: what a material draws from. */
export function cellsOf(a: Area | Placed, cols: number, rows: number): Cells {
  const p: Placed = isArea(a) ? a.place(cols, rows) : a;
  const n = cols * rows;
  const cover = new Float32Array(n);
  // Coverage is worked out a cell past the picture on every side too, so an area that runs off it (a sky, a
  // ground) has no edge there, and one that stops at it (a cup on the bottom row) still does.
  const W = cols + 2;
  const pad = new Float32Array(W * (rows + 2));
  const bx0 = clamp(Math.floor(p.x0) - 1, -1, cols + 1), bx1 = clamp(Math.ceil(p.x1) + 1, -1, cols + 1);
  const by0 = clamp(Math.floor(p.y0) - 1, -1, rows + 1), by1 = clamp(Math.ceil(p.y1) + 1, -1, rows + 1);
  const step = 1 / SAMPLES, all = SAMPLES * SAMPLES;
  for (let y = by0; y < by1; y++)
    for (let x = bx0; x < bx1; x++) {
      let k = 0;
      for (let j = 0; j < SAMPLES; j++) for (let i = 0; i < SAMPLES; i++) if (p.test(x + (i + 0.5) * step, y + (j + 0.5) * step)) k++;
      pad[(y + 1) * W + x + 1] = k / all;
      if (x >= 0 && x < cols && y >= 0 && y < rows) cover[y * cols + x] = k / all;
    }
  const inside = new Uint8Array(n);
  const list: number[] = [];
  let x0 = cols, y0 = rows, x1 = 0, y1 = 0;
  const top = new Int16Array(cols).fill(-1), bottom = new Int16Array(cols).fill(-1), left = new Int16Array(rows).fill(-1), right = new Int16Array(rows).fill(-1);
  for (let y = Math.max(0, by0); y < Math.min(rows, by1); y++)
    for (let x = Math.max(0, bx0); x < Math.min(cols, bx1); x++) {
      const i = y * cols + x;
      if (cover[i] < 0.5) continue;
      inside[i] = 1;
      list.push(i);
      if (x < x0) x0 = x;
      if (x >= x1) x1 = x + 1;
      if (y < y0) y0 = y;
      if (y >= y1) y1 = y + 1;
      if (top[x] < 0) top[x] = y;
      bottom[x] = y;
      if (left[y] < 0) left[y] = x;
      right[y] = x;
    }
  // A cell's coverage and whether it is in, a cell past the picture included.
  const cv = (x: number, y: number) => pad[(y + 1) * W + x + 1];
  const isIn = (x: number, y: number) => (cv(x, y) >= 0.5 ? 1 : 0);
  const border = new Uint8Array(n), nx = new Float32Array(n), ny = new Float32Array(n);
  for (const i of list) {
    const x = i % cols, y = (i - x) / cols;
    if (isIn(x - 1, y) && isIn(x + 1, y) && isIn(x, y - 1) && isIn(x, y + 1)) continue;
    border[i] = 1;
    const c = (dx: number, dy: number) => cv(x + dx, y + dy);
    let gx = c(1, -1) + 2 * c(1, 0) + c(1, 1) - c(-1, -1) - 2 * c(-1, 0) - c(-1, 1);
    let gy = (c(-1, 1) + 2 * c(0, 1) + c(1, 1) - c(-1, -1) - 2 * c(0, -1) - c(1, -1)) / ASPECT;
    if (Math.abs(gx) + Math.abs(gy) < 1e-6) {
      // a sliver: in is wherever the neighbours are
      gx = isIn(x + 1, y) - isIn(x - 1, y);
      gy = (isIn(x, y + 1) - isIn(x, y - 1)) / ASPECT;
    }
    const len = Math.hypot(gx, gy) || 1;
    nx[i] = gx / len;
    ny[i] = gy / len;
  }
  // Distance from the edge: two passes of a chamfer, a column 1, a row ASPECT, a diagonal between.
  const depth = new Float32Array(n);
  const D = Math.hypot(1, ASPECT), far = 4 * (cols + rows * ASPECT);
  for (const i of list) depth[i] = far;
  // a neighbour's distance plus the step to it; past the picture, 0 where the area stops there
  const d = (x: number, y: number, w: number) => (x < 0 || x >= cols || y < 0 || y >= rows ? (isIn(x, y) ? far : 0) : depth[y * cols + x]) + w;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = y * cols + x;
      if (inside[i]) depth[i] = Math.min(depth[i], d(x - 1, y, 1), d(x, y - 1, ASPECT), d(x - 1, y - 1, D), d(x + 1, y - 1, D));
    }
  for (let y = y1 - 1; y >= y0; y--)
    for (let x = x1 - 1; x >= x0; x--) {
      const i = y * cols + x;
      if (inside[i]) depth[i] = Math.min(depth[i], d(x + 1, y, 1), d(x, y + 1, ASPECT), d(x + 1, y + 1, D), d(x - 1, y + 1, D));
    }
  let maxDepth = 0;
  for (const i of list) {
    depth[i] = border[i] ? 0 : Math.max(0, Math.min(depth[i], far) - 1);
    if (depth[i] >= far - 2) depth[i] = cols + rows * ASPECT;
    if (depth[i] > maxDepth) maxDepth = depth[i];
  }
  // The fringe: cells just outside a top or a bottom that the edge still passes through, where the edge slopes (its
  // height changes along the row) and runs nearer flat than upright. A flat edge or a steep side has none.
  const fringe: number[] = [];
  for (let y = Math.max(0, y0 - 1); y < Math.min(rows, y1 + 1); y++)
    for (let x = Math.max(0, x0 - 1); x < Math.min(cols, x1 + 1); x++) {
      const i = y * cols + x;
      if (inside[i] || cover[i] < 0.12 || isIn(x, y + 1) === isIn(x, y - 1) || Math.abs(cv(x - 1, y) - cv(x + 1, y)) < 0.08) continue;
      const gx = cv(x + 1, y - 1) + 2 * cv(x + 1, y) + cv(x + 1, y + 1) - cv(x - 1, y - 1) - 2 * cv(x - 1, y) - cv(x - 1, y + 1);
      const gy = cv(x - 1, y + 1) + 2 * cv(x, y + 1) + cv(x + 1, y + 1) - cv(x - 1, y - 1) - 2 * cv(x, y - 1) - cv(x + 1, y - 1);
      if (Math.abs(gy) / ASPECT > Math.abs(gx)) fringe.push(i);
    }
  const isFringe = new Uint8Array(n);
  for (const i of fringe) isFringe[i] = 1;
  const outlines = new Map<EdgeStyle, { cells: Int32Array; chars: Uint16Array }>();
  const cells: Cells = {
    cols,
    rows,
    list: Int32Array.from(list),
    inside,
    cover,
    border,
    fringe: isFringe,
    has: (x: number, y: number) => x >= -1 && x <= cols && y >= -1 && y <= rows && isIn(x, y) === 1,
    outline(style: EdgeStyle = "line") {
      let o = outlines.get(style);
      if (!o) {
        const at = [...list.filter((i) => border[i]), ...fringe];
        o = { cells: Int32Array.from(at), chars: Uint16Array.from(at, (i) => (border[i] ? edgeChar(cells, i, style) : fringeChar(cells, i)).charCodeAt(0)) };
        outlines.set(style, o);
      }
      return o;
    },
    nx,
    ny,
    depth,
    maxDepth,
    x0: x1 > x0 ? x0 : 0,
    y0: y1 > y0 ? y0 : 0,
    x1: x1 > x0 ? x1 : 0,
    y1: y1 > y0 ? y1 : 0,
    top,
    bottom,
    left,
    right,
    level: p.level ?? null,
    room: p.room ? cellsOf(p.room, cols, rows) : null,
    cavity: p.cavity ? cellsOf(p.cavity, cols, rows) : null,
    open: !!p.open,
    char: p.char ?? null,
    placed: p,
  };
  return cells;
}

// A fringe cell's character: low in the cell over a top, "_" or "."; high in it under a bottom, "'" or "-".
function fringeChar(c: Cells, i: number): string {
  const x = i % c.cols, y = (i - x) / c.cols;
  const k = c.cover[i];
  return c.has(x, y + 1) ? (k < 0.3 ? "_" : ".") : k < 0.3 ? "'" : "-";
}

/** Outline characters: "line" ("|" up the sides) or "round" ("(" and ")" up the sides, as a cloud's). */
export type EdgeStyle = "line" | "round";

/**
 * The outline character for a cell on an area's edge, from which of the cells round it are out: "-" along a top, "_"
 * along a bottom, "|" up a side (or "(" and ")" when `style` is "round"), "/" and "\\" where it slopes, "." at a top
 * corner and where a curve only just reaches into the cell, and "'" at the bottom of a curve. A side that steps a
 * column in or out on the next row slopes there, so a taper reads as one line.
 */
export function edgeChar(c: Cells, i: number, style: EdgeStyle = "line"): string {
  const { cols } = c;
  const x = i % cols, y = (i - x) / cols;
  const has = c.has;
  const L = !has(x - 1, y), R = !has(x + 1, y), U = !has(x, y - 1), D = !has(x, y + 1);
  const left = style === "round" ? "(" : "|", right = style === "round" ? ")" : "|";
  const n = +L + +R + +U + +D;
  // a top or bottom whose line the fringe above or below already draws
  const fringeAt = (yy: number) => yy >= 0 && yy < c.rows && c.fringe[yy * cols + x] === 1;
  if (n === 1) {
    if (U) return fringeAt(y - 1) ? " " : "-";
    if (D) return fringeAt(y + 1) ? " " : "_";
    // a side: a slope where it steps in or out a column on the next row
    const d = L ? 1 : -1;
    const out = (yy: number) => !has(x, yy) && has(x + d, yy);
    if (style === "line" && out(y + 1) && !out(y - 1)) return d > 0 ? "\\" : "/";
    if (style === "line" && out(y - 1) && !out(y + 1)) return d > 0 ? "/" : "\\";
    return d > 0 ? left : right;
  }
  if (n === 2) {
    if (L && R) return "|";
    if (U && D) return "-";
    // a corner, h and v the way in across and down
    const h = L ? 1 : -1, v = U ? 1 : -1;
    // round outlines bulge: every slope on the left is "(" and on the right ")"
    const slope = style === "round" ? (h > 0 ? "(" : ")") : (v > 0) === (h > 0) ? "/" : "\\";
    // a shallow slope's fringe beside it carries the slope: here it is the top or the bottom
    if (x - h >= 0 && x - h < cols && c.fringe[i - h]) return v > 0 ? "-" : "_";
    const square = has(x, y + v) && !has(x - h, y + v) && has(x + h, y) && !has(x + h, y - v);
    // a square corner: "." at the top; at the bottom the side goes on, or "'" closing a stroke a cell thick
    if (square) return v > 0 ? "." : !has(x + h, y + v) ? "'" : h > 0 ? left : right;
    // the edge going on past the corner the other way is a step in a slope
    if (has(x + h, y - v)) return slope;
    if (c.cover[i] < 0.62) return v > 0 ? "." : "'";
    return slope;
  }
  // a tip: a point at the top or the bottom, or the end of a stroke across, sloping if the edge goes on up or down
  if (n === 3) {
    if (!D) return ".";
    if (!U) return "'";
    const d = !R ? 1 : -1;
    if (style === "round" && (has(x + d, y - 1) || has(x + d, y + 1))) return d > 0 ? "(" : ")";
    return has(x + d, y - 1) ? (d > 0 ? "/" : "\\") : has(x + d, y + 1) ? (d > 0 ? "\\" : "/") : "-";
  }
  return ".";
}

// --- materials: what something is made of ----------------------------------------------------

/**
 * What a material draws with each frame: the grid, the page, its own colours, and what was under it before it drew.
 */
export interface Paint {
  /** The picture's grid. */
  readonly s: Surface;
  /** Dark on a light page. */
  readonly paper: boolean;
  /** Drawn in one ink: colours are not shown, so say it with characters. */
  readonly mono: boolean;
  /** The palette index of the material's colour `i` (in its list's order) for this frame's page. */
  color(i: number): number;
  /**
   * The grid's characters and colours as they were before this part drew: what a see-through material shows. It is
   * copied the first time a part reads it in a frame, so read it before drawing anything.
   */
  readonly under: { readonly chars: Uint16Array; readonly colors: Uint8Array };
}

/** Draws a material's frame at t seconds. */
export type MaterialDraw = (t: number, p: Paint) => void;

/**
 * What something is made of: it fills any area, and moves on its own from t. Make one with water(), glass(), fire()
 * and the rest, or material() for your own.
 */
export interface Material {
  readonly kind: "material";
  /** Its name, for errors. */
  readonly name: string;
  /** Its colours, a list for each page, in the order its drawing asks for them by index. */
  readonly colors: Duo;
  /** How often it repeats exactly, in seconds; undefined for a material that does not move. */
  readonly period?: number;
  /** Gets ready for an area (once, when a picture is set up) and returns its drawing of a frame. */
  prepare(c: Cells): MaterialDraw;
}

const isMaterial = (v: unknown): v is Material => isObject(v) && typeof v.prepare === "function" && isObject(v.colors) && typeof v.name === "string";

function makeMaterial(name: string, colors: Duo, period: number | undefined, prepare: (c: Cells) => MaterialDraw): Material {
  return { kind: "material", name, colors, period, prepare };
}

const code = (ch: string) => ch.charCodeAt(0);
const SPACE = 32;

// A smooth noise 0 to 1 that wraps every `wx` lattice steps across and `wy` down (0 for no wrap): moved by whole
// wraps over a period, it repeats exactly.
function tiled(x: number, y: number, wx: number, wy: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const X = (k: number) => (wx ? ((k % wx) + wx) % wx : k), Y = (k: number) => (wy ? ((k % wy) + wy) % wy : k);
  const a = hash(X(xi), Y(yi), seed), b = hash(X(xi + 1), Y(yi), seed), c = hash(X(xi), Y(yi + 1), seed), d = hash(X(xi + 1), Y(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// --- the materials ---

/** What every material and emission takes: its colours. Those that move take a `period` too, said on each. */
export interface MaterialOptions {
  /** A palette's name from `palettes`, colours as #rrggbb for both pages (spread along their fade to what it needs), or { light, dark }. */
  colors?: Colors;
}

/** How a liquid's surface moves. */
export type Waves = "still" | "gentle" | "slosh" | "rough";

/**
 * Water, or any liquid: a surface of waves, darker with depth, that shows what is behind it bent a little, as water
 * does a straw. In a vessel's inside() it rests at the level and sloshes against the walls; on any other area its
 * surface is the area's top.
 */
export function water(o?: MaterialOptions & {
  /** "still", "gentle" (the default), "slosh" (the whole surface tilting side to side) or "rough". */
  waves?: Waves;
  /** Seconds for the waves to come round: 4. */
  period?: number;
  /** How far, in columns, what is behind the water is shifted below its surface: 1. 0 shows it straight. */
  bend?: number;
  /** How much texture the water shows where nothing is behind it, 0 (clear) to 1: 0.5. */
  texture?: number;
}): Material {
  const p = optionsOf("water()", o, ["colors", "waves", "period", "bend", "texture"]);
  const colors = colorsOf("water.colors", p.colors, "water", 4);
  const waves = wordOf("water.waves", p.waves, ["still", "gentle", "slosh", "rough"] as const, "gentle");
  const period = periodOf("water.period", p.period, 4);
  const bend = numberOf("water.bend", p.bend, 1, 0, 8);
  const texture = numberOf("water.texture", p.texture, 0.5, 0, 1);
  return makeMaterial("water", colors, waves === "still" && texture === 0 ? undefined : period, (c) => {
    const room = c.room ?? c;
    // the surface rests mid row, so small waves stay one wavy line instead of breaking over two rows
    const level = Math.floor(c.level ?? c.y0) + 0.5;
    const { cols } = c;
    const surface = new Float32Array(cols);
    const xs: number[] = [];
    for (let x = room.x0; x < room.x1; x++) if (room.top[x] >= 0) xs.push(x);
    const xa = room.x0, xb = Math.max(room.x0 + 1, room.x1), mid = (xa + xb) / 2, half = Math.max(1, (xb - xa) / 2);
    const depthRows = Math.max(1, room.y1 - level);
    const amp = waves === "still" ? 0 : waves === "gentle" ? 0.45 : waves === "rough" ? 1 : Math.min(2.2, Math.max(0.8, depthRows * 0.25));
    const wl = TAU / Math.max(6, (xb - xa) * 0.6);
    return (t, pt) => {
      const { s } = pt;
      const w = (TAU * t) / period;
      for (const x of xs) {
        const k = x + 0.5;
        let h = 0;
        if (waves === "gentle") h = amp * (Math.sin(k * wl - w) * 0.7 + 0.3 * Math.sin(k * wl * 2.3 + 2 * w));
        else if (waves === "rough") h = amp * (Math.sin(k * wl * 1.6 - 2 * w) * 0.6 + 0.4 * Math.sin(k * wl * 3.1 + 3 * w));
        else if (waves === "slosh") h = amp * ((k - mid) / half) * Math.sin(w) + 0.25 * Math.sin(k * wl * 2 - 2 * w);
        surface[x] = level - h;
      }
      const under = pt.under;
      for (const i of room.list) {
        const x = i % cols, y = (i - x) / cols;
        const sy = surface[x];
        if (y + 1 <= sy) continue;
        let ch: number, col: number;
        if (y <= sy) {
          // the cell the surface crosses: lower in the cell is a lower line
          const f = sy - y;
          ch = code(f < 0.25 ? "-" : f < 0.7 ? "~" : "_");
          col = pt.color(3);
        } else {
          const d = y - sy;
          // what is behind, bent sideways below the surface; never the walls round the room
          const dx = Math.round(bend * (1 + 0.5 * Math.sin(y * 1.3 + w)));
          const bi = room.inside[i + dx] && x + dx < cols && x + dx >= 0 ? i + dx : i;
          const behind = under.chars[bi];
          if (behind !== EMPTY && behind !== SPACE) {
            ch = behind;
            col = under.colors[bi];
          } else {
            // ripples drifting in the body, sparser and darker with depth
            const r = Math.sin(x * 0.55 - y * 1.7 + w) * Math.sin(x * 0.23 + y * 0.9 - 2 * w);
            const sparkle = hash(x, y, 7) < 0.04 * texture && fract(t / period + hash(x, y, 9)) < 0.4;
            ch = r > 1 - 0.5 * texture ? code("~") : r > 1 - 0.7 * texture ? code("-") : sparkle ? code("·") : SPACE;
            col = pt.color(d < 1.5 ? 2 : d < depthRows * 0.6 ? 1 : 0);
          }
        }
        s.put(i, ch, col);
      }
    };
  });
}

/**
 * Glass: see-through, so what is behind it shows. It draws the outline in the glass's colour, a vessel's open rim and
 * thick base, and a highlight streak down one side like a reflection, a glint running down it now and then.
 */
export function glass(o?: MaterialOptions & {
  /** The highlight streak: true. */
  highlight?: boolean;
  /** Seconds between glints down the streak: 4. */
  period?: number;
}): Material {
  const p = optionsOf("glass()", o, ["colors", "highlight", "period"]);
  const colors = colorsOf("glass.colors", p.colors, "glass", 3);
  const highlight = boolOf("glass.highlight", p.highlight, true);
  const period = periodOf("glass.period", p.period, 4);
  return makeMaterial("glass", colors, highlight ? period : undefined, (c) => {
    const { cols } = c;
    const cav = c.cavity;
    // The fixed cells: the outline, an open vessel's rim, the top of a thick base, and the rest of the walls blank.
    const cells: number[] = [], chars: number[] = [], roles: number[] = [];
    const line = c.outline();
    line.cells.forEach((i, k) => {
      const x = i % cols, y = (i - x) / cols;
      if (cav?.inside[i]) return;
      // an open vessel has no lid: nothing is drawn over its mouth, and its walls end in a rim
      if (c.open && cav && (cav.inside[i + cols] || (c.fringe[i] && cav.top[x] >= 0 && cav.top[x] <= y + 1))) return;
      const rim = c.open && cav && c.border[i] && y === c.top[x] && c.ny[i] > 0.3;
      cells.push(i), chars.push(rim ? code(".") : line.chars[k]), roles.push(0);
    });
    // a vessel's walls and base are solid glass; anything else (a pane) is see-through inside its outline
    if (cav) {
      let floor = -1;
      for (let x = cav.x0; x < cav.x1; x++) floor = Math.max(floor, cav.bottom[x]);
      for (const i of c.list) {
        const y = (i - (i % cols)) / cols;
        if (cav.inside[i] || c.border[i]) continue;
        cells.push(i), chars.push(y === floor + 1 ? code("_") : SPACE), roles.push(2);
      }
    }
    // the streak: a column in from the left wall, down the upper part of the room
    const streak: number[] = [];
    const room = cav ?? c;
    if (highlight && room.x1 - room.x0 >= 5) {
      const h = room.y1 - room.y0;
      for (let y = room.y0 + Math.max(1, Math.round(h * 0.15)); y < room.y0 + Math.round(h * 0.7); y++) {
        const l = room.left[y];
        if (l >= 0) streak.push(y * cols + l + 1);
      }
    }
    return (t, pt) => {
      const { s } = pt;
      for (let k = 0; k < cells.length; k++) s.put(cells[k], chars[k], pt.color(roles[k]));
      if (!streak.length) return;
      // a glint runs down the streak once a period
      const g = fract(t / period) * (streak.length + 6) - 3;
      streak.forEach((i, k) => {
        const near = Math.abs(k - g) < 0.75;
        s.put(i, code(near ? "|" : "'"), pt.color(1));
      });
    };
  });
}

/** Fire: flickering flames, hottest and densest at the base and core, tongues licking up and breaking off at the top. */
export function fire(o?: MaterialOptions & {
  /** Seconds for the flicker to come round: 2. */
  period?: number;
  /** How fierce, 0.2 to 2: 1. */
  heat?: number;
  /** The characters from the faintest flame to the hottest: " .:^*#%@". */
  ramp?: string;
}): Material {
  const p = optionsOf("fire()", o, ["colors", "period", "heat", "ramp"]);
  const colors = colorsOf("fire.colors", p.colors, "fire", 5);
  const period = periodOf("fire.period", p.period, 2);
  const heat = numberOf("fire.heat", p.heat, 1, 0.2, 2);
  const chars = charOf("fire.ramp", p.ramp, " .:^*#%@", true);
  if (chars.length < 2) fail(`fire.ramp takes two or more characters, not ${JSON.stringify(chars)}`);
  return makeMaterial("fire", colors, period, (c) => {
    const { cols } = c;
    const h = Math.max(1, c.y1 - c.y0), md = Math.max(1, c.maxDepth);
    const scale = Math.max(1, h / 6);
    return (t, pt) => {
      const { s } = pt;
      // the flames rise through a noise that wraps, so a period moves it by whole wraps
      const rise = (t / period) * 4;
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        const up = (c.y1 - y - 0.5) / h; // 0 at the bottom, 1 at the top
        const core = Math.min(1, c.depth[i] / md + 0.15);
        const n = tiled((x * 0.7) / scale, y / scale + rise, 0, 4, 11) * 0.65 + tiled((x * 1.6) / scale, (y * 2) / scale + 2 * rise, 0, 8, 12) * 0.35;
        // hot in the core and low down; the noise makes the edges and the tips come and go
        const v = heat * (0.55 * core + 0.45 * (1 - up)) + 0.6 * (n - 0.5) + 0.12 - 0.1 * up;
        if (v < 0.08) continue;
        const k = clamp((v - 0.08) / 0.9);
        const ch = chars[Math.min(chars.length - 1, 1 + Math.floor(k * (chars.length - 1)))];
        if (ch === " ") continue;
        s.put(i, code(ch), pt.color(Math.min(4, Math.floor(k * 5))));
      }
    };
  });
}

// Puffs of smoke or steam that drift up an area, thinning as they go.
function hazeMaterial(name: string, colorsIn: unknown, def: PaletteName, periodIn: unknown, rampIn: unknown): Material {
  const colors = colorsOf(`${name}.colors`, colorsIn, def, 3);
  const period = periodOf(`${name}.period`, periodIn, 4);
  const chars = charOf(`${name}.ramp`, rampIn, " .:-~=o", true);
  return makeMaterial(name, colors, period, (c) => {
    const { cols } = c;
    const h = Math.max(1, c.y1 - c.y0);
    return (t, pt) => {
      const { s } = pt;
      const rise = (t / period) * 2;
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        const n = tiled(x * 0.18, y * 0.35 + rise, 0, 2, 21) * 0.6 + tiled(x * 0.4, y * 0.7 + 2 * rise, 0, 4, 22) * 0.4;
        const up = (c.y1 - y - 0.5) / h;
        const v = n * (1 - 0.45 * up) * Math.min(1, 0.4 + c.depth[i] / 3);
        if (v < 0.42) continue;
        const k = clamp((v - 0.42) / 0.4);
        const ch = chars[Math.min(chars.length - 1, 1 + Math.floor(k * (chars.length - 1)))];
        if (ch !== " ") s.put(i, code(ch), pt.color(Math.min(2, Math.floor(k * 3))));
      }
    };
  });
}

/** Options for smoke(), as a material and as an emission. */
export interface SmokeOptions extends MaterialOptions {
  /** Seconds for it to come round: 4. */
  period?: number;
  /** As a material: the characters from the thinnest to the thickest, " .:-~=o". */
  ramp?: string;
  /** As an emission: how many rows the column rises, 8. */
  height?: number;
  /** As an emission: how many columns each side moves out a row as it rises, 0.3. */
  spread?: number;
  /** As an emission: how many columns a row the wind leans it, right (left below 0): 0.3. */
  wind?: number;
  /** As an emission: its seed, 1. */
  seed?: number;
}

/**
 * Smoke, as a material and as an emission. As a material, shape(area, smoke()) fills an area with drifting smoke. As an
 * emission, emit(smoke(), { from: chimney }) sends a column of it up from the top of an area (or a point), leaning in
 * the wind, swaying and opening out as it rises, and breaking up at the top.
 */
export function smoke(o?: SmokeOptions): Material & Emission {
  const p = optionsOf("smoke()", o, ["colors", "period", "ramp", "height", "spread", "wind", "seed"]);
  const m = hazeMaterial("smoke", p.colors, "smoke", p.period, p.ramp);
  const e = plume("smoke", p);
  return { ...e, ...m, kind: "material", emits: e.emits } as Material & Emission;
}

function cloudMaterial(colorsIn: unknown, periodIn: unknown): Material {
  const colors = colorsOf("cloud.colors", colorsIn, "cloud", 3);
  const period = periodOf("cloud.period", periodIn, 8);
  return makeMaterial("cloud", colors, period, (c) => {
    const { cols } = c;
    const h = Math.max(1, c.y1 - c.y0);
    const line = c.outline("round");
    return (t, pt) => {
      const { s } = pt;
      const drift = (t / period) * 4;
      line.cells.forEach((i, k) => s.put(i, line.chars[k], pt.color(0)));
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        if (c.border[i]) continue;
        // the underside is in shadow; soft billows drift across inside
        const down = (y - c.y0 + 0.5) / h;
        const n = tiled(x * 0.25 + drift, y * 0.6, 4, 0, 31);
        const ch = down > 0.72 && n > 0.45 ? "." : n > 0.82 ? "-" : " ";
        s.put(i, code(ch), pt.color(down > 0.72 ? 2 : 1));
      }
    };
  });
}

/** Metal: shaded round like a can or a pipe, with a sheen that sweeps across it once a period. */
export function metal(o?: MaterialOptions & {
  /** The sheen sweeping across: true. */
  sheen?: boolean;
  /** Seconds between sheens: 4. */
  period?: number;
  /** The characters from the darkest metal to the brightest: "░▒▓█". */
  ramp?: string;
  /** Outline it: true. */
  edge?: boolean;
}): Material {
  const p = optionsOf("metal()", o, ["colors", "sheen", "period", "ramp", "edge"]);
  const colors = colorsOf("metal.colors", p.colors, "steel", 4);
  const sheen = boolOf("metal.sheen", p.sheen, true);
  const period = periodOf("metal.period", p.period, 4);
  const chars = charOf("metal.ramp", p.ramp, "░▒▓█", true);
  const edge = boolOf("metal.edge", p.edge, true);
  return makeMaterial("metal", colors, sheen ? period : undefined, (c) => {
    const { cols } = c;
    const w = Math.max(1, c.x1 - c.x0), h = Math.max(1, c.y1 - c.y0);
    const line = c.outline();
    return (t, pt) => {
      const { s } = pt;
      if (edge) line.cells.forEach((i, k) => s.put(i, line.chars[k], pt.color(2)));
      // the sheen crosses from left to right, leaning, then rests off the metal
      const at = fract(t / period) * 2.2 - 0.6;
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        const u = (x - c.x0 + 0.5) / w, v = (y - c.y0 + 0.5) / h;
        if (edge && c.border[i]) continue;
        // brightest a third of the way across, as a cylinder lit from the upper left
        const lit = clamp(1 - Math.abs(u - 0.33) * 1.5);
        const shine = sheen && Math.abs(u + 0.35 * v - at) < 0.07;
        if (shine) s.put(i, code("/"), pt.color(3));
        else s.put(i, code(chars[Math.min(chars.length - 1, Math.floor(lit * chars.length))]), pt.color(Math.min(2, Math.floor(lit * 3))));
      }
    };
  });
}

/** Wood: grain in wavy lines with a knot here and there, or planks, or a log's rings. It does not move. */
export function wood(o?: MaterialOptions & {
  /** "grain" (the default), "planks" (boards side by side) or "rings" (a cut log). */
  grain?: "grain" | "planks" | "rings";
  /** Outline it: true. */
  edge?: boolean;
  /** Its seed, for the knots and the waves in the grain: 1. */
  seed?: number;
}): Material {
  const p = optionsOf("wood()", o, ["colors", "grain", "edge", "seed"]);
  const colors = colorsOf("wood.colors", p.colors, "wood", 3);
  const grain = wordOf("wood.grain", p.grain, ["grain", "planks", "rings"] as const, "grain");
  const edge = boolOf("wood.edge", p.edge, true);
  const seed = seedOf("wood.seed", p.seed, 1);
  return makeMaterial("wood", colors, undefined, (c) => {
    const { cols } = c;
    const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
    const out = new Uint16Array(c.list.length), role = new Uint8Array(c.list.length);
    c.list.forEach((i, k) => {
      const x = i % cols, y = (i - x) / cols;
      let ch = " ", r = 1;
      // the edge is drawn by the outline, over this
      if (edge && c.border[i]) r = 0;
      else if (grain === "rings") {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * ASPECT);
        const ring = Math.sin(d * 1.3 + 2 * tiled(x * 0.3, y * 0.6, 0, 0, seed));
        ch = d < 1.2 ? "o" : ring > 0.6 ? "(" : ring < -0.6 ? ")" : " ";
        if (ch === "(" && x + 0.5 > cx) ch = ")";
        else if (ch === ")" && x + 0.5 < cx) ch = "(";
        r = ring > 0 ? 2 : 1;
      } else {
        const seam = grain === "planks" && (x - c.x0) % 6 === 5;
        const g = Math.sin((y + 0.9 * tiled(x * 0.12, y * 0.5, 0, 0, seed)) * 3.1);
        const knot = hash(x >> 3, y >> 1, seed) > 0.93 && hash(x, y, seed) > 0.6;
        ch = seam ? "|" : knot ? "@" : g > 0.55 ? "=" : g > -0.2 ? "-" : g > -0.75 ? "~" : " ";
        r = seam || knot ? 0 : g > 0.55 ? 2 : 1;
      }
      out[k] = code(ch);
      role[k] = r;
    });
    const line = edge ? c.outline() : null;
    return (_t, pt) => {
      c.list.forEach((i, k) => pt.s.put(i, out[k], pt.color(role[k])));
      line?.cells.forEach((i, k) => pt.s.put(i, line.chars[k], pt.color(0)));
    };
  });
}

/**
 * Grass: blades growing up from the bottom of the area, each its own height, swaying in the wind, over a line of turf.
 * "seaweed" waves slowly, as under water, and lets what is behind it show between its fronds; "reeds" are tall and
 * straight.
 */
export function grass(o?: MaterialOptions & {
  /** "lawn" (the default), "reeds" or "seaweed". */
  kind?: "lawn" | "reeds" | "seaweed";
  /** How far the tips sway, 0 to 3 columns: 1. */
  sway?: number;
  /** Seconds for a sway to come round: 4. */
  period?: number;
  /** The share of columns with a blade, 0 to 1: 0.85 (0.3 for seaweed). */
  density?: number;
  /** Hides what is behind it between the blades: true, false for seaweed. */
  opaque?: boolean;
  /** Its seed, for the blades' heights: 1. */
  seed?: number;
}): Material {
  const p = optionsOf("grass()", o, ["colors", "kind", "sway", "period", "density", "opaque", "seed"]);
  const kind = wordOf("grass.kind", p.kind, ["lawn", "reeds", "seaweed"] as const, "lawn");
  const colors = colorsOf("grass.colors", p.colors, kind === "seaweed" ? "seaweed" : "grass", 3);
  const sway = numberOf("grass.sway", p.sway, 1, 0, 3);
  const period = periodOf("grass.period", p.period, 4);
  const density = numberOf("grass.density", p.density, kind === "seaweed" ? 0.3 : 0.85, 0, 1);
  const opaque = boolOf("grass.opaque", p.opaque, kind !== "seaweed");
  const seed = seedOf("grass.seed", p.seed, 1);
  return makeMaterial("grass", colors, sway ? period : undefined, (c) => {
    const { cols } = c;
    return (t, pt) => {
      const { s } = pt;
      const w = (TAU * t) / period;
      // an opaque lawn covers what is behind it, a line of turf along its bottom
      if (opaque)
        for (const i of c.list) {
          const turf = kind === "lawn" && c.bottom[i % cols] === (i - (i % cols)) / cols;
          s.put(i, turf ? code(hash(i, seed, 5) > 0.5 ? "\"" : ",") : SPACE, pt.color(0));
        }
      for (let x = c.x0; x < c.x1; x++) {
        const b = c.bottom[x], tp = c.top[x];
        if (b < 0 || hash(x, seed, 1) > density) continue;
        const room = b - tp + 1;
        const tall = kind === "lawn" ? 0.45 + 0.55 * hash(x, seed, 2) : kind === "reeds" ? 0.7 + 0.3 * hash(x, seed, 2) : 0.45 + 0.55 * hash(x, seed, 2);
        const len = Math.max(1, Math.round(room * tall));
        for (let k = 0; k < len; k++) {
          const y = b - k, f = (k + 1) / len;
          const phase = kind === "seaweed" ? w - k * 0.7 + x * 0.4 : w + x * 0.35;
          const lean = sway * Math.sin(phase) * (kind === "seaweed" ? 0.8 : f * f);
          const xx = x + Math.round(lean * (kind === "seaweed" ? 1 : f));
          const i = y * cols + xx;
          if (xx < 0 || xx >= cols || !c.inside[i]) continue;
          let ch: string;
          if (kind === "seaweed") ch = Math.cos(phase) > 0 ? ")" : "(";
          else if (k === len - 1) ch = lean > 0.35 ? "/" : lean < -0.35 ? "\\" : kind === "reeds" ? "|" : "'";
          else ch = kind === "lawn" && k === 0 ? (hash(x, seed, 3) > 0.5 ? "\"" : "|") : lean > 0.6 && f > 0.5 ? "/" : lean < -0.6 && f > 0.5 ? "\\" : "|";
          s.put(i, code(ch), pt.color(f < 0.34 ? 0 : f < 0.75 ? 1 : 2));
        }
      }
    };
  });
}

/** Sand: a stipple of grains, denser lower down, with a ripple now and then. It does not move. */
export function sand(o?: MaterialOptions & {
  /** Ripples drawn in it: true. */
  ripples?: boolean;
  /** Its seed, for where the grains fall: 1. */
  seed?: number;
}): Material {
  const p = optionsOf("sand()", o, ["colors", "ripples", "seed"]);
  const colors = colorsOf("sand.colors", p.colors, "sand", 3);
  const ripples = boolOf("sand.ripples", p.ripples, true);
  const seed = seedOf("sand.seed", p.seed, 1);
  return makeMaterial("sand", colors, undefined, (c) => {
    const { cols } = c;
    const out = new Uint16Array(c.list.length), role = new Uint8Array(c.list.length);
    c.list.forEach((i, k) => {
      const x = i % cols, y = (i - x) / cols;
      const down = c.y1 - c.y0 > 1 ? (y - c.top[x]) / Math.max(1, c.bottom[x] - c.top[x]) : 0.5;
      const r = hash(x, y, seed);
      const top = y === c.top[x];
      let ch = top ? (r < 0.5 ? "." : r < 0.8 ? "," : "_") : r < 0.25 + 0.3 * down ? ":" : r < 0.6 + 0.2 * down ? "." : r < 0.8 ? "," : " ";
      if (ripples && !top && Math.sin(x * 0.45 + y * 2.1 + 3 * tiled(x * 0.1, y * 0.3, 0, 0, seed)) > 0.93) ch = "~";
      out[k] = code(ch);
      role[k] = top ? 2 : r < 0.3 ? 0 : 1;
    });
    return (_t, pt) => c.list.forEach((i, k) => pt.s.put(i, out[k], pt.color(role[k])));
  });
}

/** Lava, as in a lava lamp: glowing blobs that rise, round off and sink again, over a pool at the bottom. */
export function lava(o?: MaterialOptions & {
  /** How many blobs, 0 to 12: 5. */
  blobs?: number;
  /** Seconds for the blobs to come round: 8. */
  period?: number;
  /** Its seed, for where the blobs start: 1. */
  seed?: number;
}): Material {
  const p = optionsOf("lava()", o, ["colors", "blobs", "period", "seed"]);
  const colors = colorsOf("lava.colors", p.colors, "lava", 4);
  const count = numberOf("lava.blobs", p.blobs, 5, 0, 12);
  if (!Number.isInteger(count)) fail(`lava.blobs takes a whole number from 0 to 12, not ${count}`);
  const period = periodOf("lava.period", p.period, 8);
  const seed = seedOf("lava.seed", p.seed, 1);
  return makeMaterial("lava", colors, period, (c) => {
    const { cols } = c;
    const w = Math.max(1, c.x1 - c.x0), h = Math.max(1, c.y1 - c.y0);
    const blobs = Array.from({ length: count }, (_, k) => ({
      u: 0.3 + 0.4 * hash(k, seed, 1),
      r: Math.max(0.8, w * (0.1 + 0.08 * hash(k, seed, 2))),
      turns: 1 + (hash(k, seed, 3) > 0.6 ? 1 : 0),
      phase: hash(k, seed, 4) * TAU,
    }));
    const xs = new Float32Array(count), ys = new Float32Array(count);
    return (t, pt) => {
      const { s } = pt;
      const a = (TAU * t) / period;
      blobs.forEach((b, k) => {
        const rise = 0.5 - 0.5 * Math.cos(a * b.turns + b.phase);
        xs[k] = c.x0 + w * b.u + w * 0.12 * Math.sin(a + b.phase * 2);
        ys[k] = c.y1 - 1 - (h - 2) * rise;
      });
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        const px = x + 0.5, py = y + 0.5;
        // the pool at the bottom, and each blob's pull, falling off with distance
        let f = Math.max(0, 1.6 - ((c.y1 - py) / Math.max(1, h * 0.08)) ** 2 * 0.8);
        blobs.forEach((b, k) => {
          const d2 = (px - xs[k]) ** 2 + ((py - ys[k]) * ASPECT) ** 2;
          f += (b.r * b.r) / (d2 + 0.01);
        });
        if (f < 0.8) continue;
        const ch = f > 2.2 ? "@" : f > 1.4 ? "%" : f > 1 ? "o" : ".";
        s.put(i, code(ch), pt.color(f > 2.2 ? 3 : f > 1.4 ? 2 : f > 1 ? 1 : 0));
      }
    };
  });
}

/** Ice: a clear block with a pale outline, a facet across its upper left, and a glint that comes and goes in it. */
export function ice(o?: MaterialOptions & {
  /** Seconds between glints: 4. */
  period?: number;
}): Material {
  const p = optionsOf("ice()", o, ["colors", "period"]);
  const colors = colorsOf("ice.colors", p.colors, "ice", 3);
  const period = periodOf("ice.period", p.period, 4);
  return makeMaterial("ice", colors, period, (c) => {
    const { cols } = c;
    const h = Math.max(1, c.y1 - c.y0);
    // the facet: the first inner cell of each of the upper rows, a step in from the last
    const facet = new Set<number>();
    for (let y = c.y0 + 1, k = 0; y < c.y0 + Math.max(2, h / 2); y++, k++) {
      const l = c.left[y];
      if (l >= 0 && l + 1 + k * 2 < c.right[y]) facet.add(y * cols + l + 1 + k * 2);
    }
    const line = c.outline();
    return (t, pt) => {
      const { s } = pt;
      const glint = fract(t / period) < 0.2;
      for (const i of c.list) {
        if (c.border[i]) continue;
        if (facet.has(i)) s.put(i, code(glint ? "*" : "`"), pt.color(glint ? 2 : 1));
        else s.put(i, SPACE, pt.color(1));
      }
      line.cells.forEach((i, k) => s.put(i, line.chars[k], pt.color(0)));
    };
  });
}

/**
 * Neon: a bright tube of light with a glow round it, flickering now and then. On text, the letters themselves glow:
 * shape(area.text("OPEN"), neon()).
 */
export function neon(o?: MaterialOptions & {
  /** How far the glow reaches round it, in columns: 2. 0 for none. */
  glow?: number;
  /** A flicker once a period: true. */
  flicker?: boolean;
  /** Seconds between flickers: 4. */
  period?: number;
  /** The tube's character where the area gives none: "█". */
  char?: string;
}): Material {
  const p = optionsOf("neon()", o, ["colors", "glow", "flicker", "period", "char"]);
  const colors = colorsOf("neon.colors", p.colors, "neon", 3);
  const glow = numberOf("neon.glow", p.glow, 2, 0, 6);
  const flicker = boolOf("neon.flicker", p.flicker, true);
  const period = periodOf("neon.period", p.period, 4);
  const tube = code(charOf("neon.char", p.char, "█"));
  return makeMaterial("neon", colors, flicker ? period : undefined, (c) => {
    const { cols, rows } = c;
    const core = c.list.map((i) => {
      const x = i % cols;
      const ch = c.char?.(x, (i - x) / cols);
      return ch ? code(ch) : tube;
    });
    // the glow: cells round the area within `glow`, nearer ones brighter
    const halo: number[] = [], haloCh: number[] = [];
    if (glow > 0) {
      const g = Math.ceil(glow);
      const near = new Float32Array(cols * rows).fill(Infinity);
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        for (let dy = -Math.ceil(g / ASPECT); dy <= Math.ceil(g / ASPECT); dy++)
          for (let dx = -g; dx <= g; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
            const j = yy * cols + xx;
            if (c.inside[j]) continue;
            near[j] = Math.min(near[j], Math.hypot(dx, dy * ASPECT));
          }
      }
      near.forEach((d, j) => {
        if (d <= glow) halo.push(j), haloCh.push(code(d <= glow / 2 ? ":" : "."));
      });
    }
    return (t, pt) => {
      const { s } = pt;
      const f = fract(t / period);
      const off = flicker && ((f > 0.62 && f < 0.65) || (f > 0.7 && f < 0.72));
      halo.forEach((j, k) => {
        if (!off && s.chars[j] === EMPTY) s.put(j, haloCh[k], pt.color(0));
      });
      c.list.forEach((i, k) => s.put(i, off ? code(".") : core[k], pt.color(off ? 0 : c.depth[i] >= 1 ? 2 : 1)));
    };
  });
}

/**
 * A solid fill in one character and colour, or shaded from the edge in: give `char` two or more characters, from the
 * edge's to the middle's ("░▒▓█"). On text, each letter stays itself.
 */
export function solid(o?: MaterialOptions & {
  /** The character, or two or more from the edge in: "█". */
  char?: string;
  /** Outline it with "|", "-", "/" and the like instead of filling the edge: false. */
  edge?: boolean;
}): Material {
  const p = optionsOf("solid()", o, ["colors", "char", "edge"]);
  const colors = colorsOf("solid.colors", p.colors, "ink", 3);
  const chars = charOf("solid.char", p.char, "█", true);
  const edge = boolOf("solid.edge", p.edge, false);
  return makeMaterial("solid", colors, undefined, (c) => {
    const { cols } = c;
    const md = Math.max(1, c.maxDepth);
    const out = c.list.map((i) => {
      const x = i % cols, y = (i - x) / cols;
      // the edge is drawn by the outline, over this
      if (edge && c.border[i]) return SPACE;
      const t = c.char?.(x, y);
      if (t) return code(t);
      return code(chars.length === 1 ? chars : chars[Math.min(chars.length - 1, Math.floor((c.depth[i] / md) * chars.length))]);
    });
    const role = c.list.map((i) => (edge && c.border[i] ? 0 : Math.min(2, Math.floor((c.depth[i] / md) * 3))));
    const line = edge ? c.outline() : null;
    return (_t, pt) => {
      c.list.forEach((i, k) => pt.s.put(i, out[k], pt.color(role[k])));
      line?.cells.forEach((i, k) => pt.s.put(i, line.chars[k], pt.color(0)));
    };
  });
}

/** A gradient: colours fading across the area in a direction, and characters from a ramp along it. */
export function gradientFill(o?: MaterialOptions & {
  /** Which way it fades from the first colour: "down" (the default), "up", "left", "right" or "out" (from the middle). */
  direction?: "down" | "up" | "left" | "right" | "out";
  /** How many steps of colour: 8. */
  steps?: number;
  /** The characters along the fade, the first colour's first: "█". */
  chars?: string;
}): Material {
  const p = optionsOf("gradientFill()", o, ["colors", "direction", "steps", "chars"]);
  const steps = numberOf("gradientFill.steps", p.steps, 8, 1, 24);
  if (!Number.isInteger(steps)) fail(`gradientFill.steps takes a whole number from 1 to 24, not ${steps}`);
  const colors = colorsOf("gradientFill.colors", p.colors, "sunset", steps);
  const direction = wordOf("gradientFill.direction", p.direction, ["down", "up", "left", "right", "out"] as const, "down");
  const chars = charOf("gradientFill.chars", p.chars, "█", true);
  return makeMaterial("gradient", colors, undefined, (c) => {
    const { cols } = c;
    const w = Math.max(1, c.x1 - c.x0), h = Math.max(1, c.y1 - c.y0), md = Math.max(1, c.maxDepth);
    const ks = Array.from(c.list, (i) => {
      const x = i % cols, y = (i - x) / cols;
      const u = (x - c.x0 + 0.5) / w, v = (y - c.y0 + 0.5) / h;
      return direction === "down" ? v : direction === "up" ? 1 - v : direction === "right" ? u : direction === "left" ? 1 - u : 1 - c.depth[i] / md;
    });
    return (_t, pt) =>
      c.list.forEach((i, k) => {
        const f = clamp(ks[k], 0, 0.9999);
        pt.s.put(i, code(chars[Math.floor(f * chars.length)]), pt.color(Math.floor(f * steps)));
      });
  });
}

/** The patterns pattern() knows by name: tiles of text, repeated. */
export const patterns = {
  bricks: ["___|", "_|__"],
  tiles: ["+--", "|  "],
  checks: ["▓░", "░▓"],
  stripes: ["\\  ", " \\ ", "  \\"],
  dots: [". ", "  "],
  waves: ["~-~ ", " ~-~"],
  hatch: ["/"],
  zigzag: ["/\\"],
  scales: ["(_)", "_)("],
  shingles: ["\\_/", "/ \\"],
} as const satisfies Record<string, readonly string[]>;

/**
 * A repeating pattern: a name from `patterns` ("bricks", "tiles", "checks", "stripes", "dots", "waves", "hatch",
 * "zigzag", "scales", "shingles") or a tile of your own, rows of text. A space in it leaves what is under it.
 */
export function pattern(tile: keyof typeof patterns | readonly string[], o?: MaterialOptions & {
  /** Which way it scrolls, if it does: "none" (the default), "left", "right", "up" or "down". */
  move?: "none" | "left" | "right" | "up" | "down";
  /** Seconds for it to scroll one tile: 2. */
  period?: number;
}): Material {
  const rowsOf = typeof tile === "string" ? (Object.hasOwn(patterns, tile) ? patterns[tile] : fail(`pattern takes a name, one of ${and(Object.keys(patterns))}, or rows of text, not ${JSON.stringify(tile)}`)) : tile;
  if (!Array.isArray(rowsOf) || !rowsOf.length || !rowsOf.every((r) => typeof r === "string" && r.length && !/[\u0000-\u001f\ud800-\udfff]/.test(r)))
    fail(`pattern takes a name or rows of text, one or more, not ${JSON.stringify(tile)}`);
  const p = optionsOf("pattern()", o, ["colors", "move", "period"]);
  const colors = colorsOf("pattern.colors", p.colors, "ink", 2);
  const move = wordOf("pattern.move", p.move, ["none", "left", "right", "up", "down"] as const, "none");
  const period = periodOf("pattern.period", p.period, 2);
  const tw = Math.max(...rowsOf.map((r) => r.length)), th = rowsOf.length;
  const grid = rowsOf.map((r) => r.padEnd(tw));
  return makeMaterial("pattern", colors, move === "none" ? undefined : period, (c) => {
    const { cols } = c;
    return (t, pt) => {
      const k = move === "none" ? 0 : Math.floor(fract(t / period) * (move === "left" || move === "right" ? tw : th));
      const dx = move === "left" ? k : move === "right" ? -k : 0, dy = move === "up" ? k : move === "down" ? -k : 0;
      for (const i of c.list) {
        const x = i % cols, y = (i - x) / cols;
        const row = grid[(((y + dy) % th) + th) % th];
        const ch = row[(((x + dx) % tw) + tw) % tw];
        if (ch !== " ") pt.s.put(i, code(ch), pt.color((y + dy) % 2 ? 1 : 0));
      }
    };
  });
}

/** Ceramic: an opaque glazed thing, a mug, a vase, a candle, outlined, shaded down its right side, a gleam at its upper left. */
export function ceramic(o?: MaterialOptions & {
  /** The shading down its right side: true. */
  shade?: boolean;
}): Material {
  const p = optionsOf("ceramic()", o, ["colors", "shade"]);
  const colors = colorsOf("ceramic.colors", p.colors, "ceramic", 3);
  const shade = boolOf("ceramic.shade", p.shade, true);
  return makeMaterial("ceramic", colors, undefined, (c) => {
    const { cols } = c;
    // an open vessel's mouth is left open, so what is in it shows at the rim
    const mouth = (i: number) => {
      const x = i % cols;
      return c.open && c.cavity && (c.cavity.inside[i] || c.cavity.inside[i + cols]) && (i - x) / cols <= c.cavity.top[x];
    };
    const at: number[] = [], out: number[] = [], role: number[] = [];
    const line = c.outline();
    line.cells.forEach((i, k) => {
      if (!mouth(i)) at.push(i), out.push(line.chars[k]), role.push(0);
    });
    for (const i of c.list) {
      if (c.border[i] || mouth(i)) continue;
      const x = i % cols, y = (i - x) / cols;
      const l = c.left[y], r = c.right[y];
      const u = r > l ? (x - l) / (r - l) : 0.5;
      const v = c.y1 - c.y0 > 1 ? (y - c.y0) / (c.y1 - c.y0 - 1) : 0.5;
      // the gleam and the shade go down an upright side, not along a slope such as a roof's
      const upright = (side: Int16Array, at: number) => side[Math.max(0, y - 1)] === at && side[Math.min(c.rows - 1, y + 1)] === at;
      const gleam = u < 0.3 && u > 0.1 && v > 0.15 && v < 0.45 && x - l === 2 && upright(c.left, l);
      // the shade: the two columns in from the right side, on rows wide enough to take it
      const dark = shade && r - l >= 6 && r - x <= 2 && upright(c.right, r) ? (r - x === 1 ? ":" : ".") : " ";
      at.push(i), out.push(code(gleam ? "'" : dark)), role.push(gleam ? 2 : 1);
    }
    return (_t, pt) => at.forEach((i, k) => pt.s.put(i, out[k], pt.color(role[k])));
  });
}

/** Stars: a sparse field of points twinkling, for a night sky. */
export function starfield(o?: MaterialOptions & {
  /** The share of cells with a star: 0.04. */
  density?: number;
  /** Seconds for the twinkling to come round: 4. */
  period?: number;
  /** Its seed, for where the stars are: 1. */
  seed?: number;
}): Material {
  const p = optionsOf("starfield()", o, ["colors", "density", "period", "seed"]);
  const colors = colorsOf("starfield.colors", p.colors, "stars", 2);
  const density = numberOf("starfield.density", p.density, 0.04, 0, 1);
  const period = periodOf("starfield.period", p.period, 4);
  const seed = seedOf("starfield.seed", p.seed, 1);
  return makeMaterial("starfield", colors, period, (c) => {
    const { cols } = c;
    const stars = Array.from(c.list).filter((i) => hash(i % cols, Math.floor(i / cols), seed) < density);
    return (t, pt) => {
      for (const i of stars) {
        const x = i % cols, y = (i - x) / cols;
        const b = 0.5 + 0.5 * Math.sin((TAU * t * (1 + Math.floor(hash(x, y, seed + 1) * 2))) / period + hash(x, y, seed + 2) * TAU);
        const big = hash(x, y, seed + 3) > 0.85;
        const ch = big && b > 0.7 ? "*" : b > 0.75 ? "+" : b > 0.25 ? "." : "·";
        pt.s.put(i, code(ch), pt.color(b > 0.6 ? 1 : 0));
      }
    };
  });
}

/** What material() calls your function with: one object for every cell, reused, so read it and keep nothing of it. */
export interface MaterialCell {
  /** The cell: x columns across, y rows down. */
  x: number;
  y: number;
  /** 0 to 1 across and down the area's box, at the cell's centre. */
  u: number;
  v: number;
  /** Columns from the area's edge (a row counts 2): 0 on the edge. */
  depth: number;
  /** The outline character here ("|", "/", "_" and the like), "" inside. */
  edge: string;
  /** The picture's size. */
  cols: number;
  rows: number;
}

/**
 * A material of your own: a function of each cell and t that returns its character, or [character, colour index], or
 * "" (or null) to leave the cell as it is. Colour indices count from 0 in `colors`.
 *
 *   const checks = material((c, t) => ((c.x + c.y + Math.floor(t * 2)) % 2 ? "#" : "."), { period: 1 });
 */
export function material(draw: (cell: MaterialCell, t: number) => string | readonly [string, number] | null | undefined, o?: MaterialOptions & {
  /** Its name, for errors: "material". */
  name?: string;
  /** How many colours `colors` is spread to: as many as it lists. */
  steps?: number;
  /** How often it repeats exactly, in seconds: none (a still) when not given. */
  period?: number;
}): Material {
  if (typeof draw !== "function") fail("material takes a function (cell, t) => a character, [character, colour index] or \"\"");
  const p = optionsOf("material()", o, ["colors", "name", "steps", "period"]);
  const name = p.name ?? "material";
  if (typeof name !== "string" || !name) fail(`material.name takes a string, not ${show(name)}`);
  const n = numberOf("material.steps", p.steps, typeof p.colors === "string" ? palettes[p.colors as PaletteName]?.dark.length ?? 1 : Array.isArray(p.colors) ? p.colors.length : isObject(p.colors) ? (p.colors as Duo).dark.length : 1, 1, 32);
  const colors = colorsOf("material.colors", p.colors, "ink", n);
  const period = p.period === undefined ? undefined : periodOf("material.period", p.period, 4);
  return makeMaterial(name, colors, period, (c) => {
    const { cols, rows } = c;
    const w = Math.max(1, c.x1 - c.x0), h = Math.max(1, c.y1 - c.y0);
    const edges = Array.from(c.list, (i) => (c.border[i] ? edgeChar(c, i) : ""));
    const cell: MaterialCell = { x: 0, y: 0, u: 0, v: 0, depth: 0, edge: "", cols, rows };
    return (t, pt) =>
      c.list.forEach((i, k) => {
        const x = i % cols, y = (i - x) / cols;
        cell.x = x;
        cell.y = y;
        cell.u = (x - c.x0 + 0.5) / w;
        cell.v = (y - c.y0 + 0.5) / h;
        cell.depth = c.depth[i];
        cell.edge = edges[k];
        const r = draw(cell, t);
        if (r === null || r === undefined || r === "") return;
        const [ch, col] = typeof r === "string" ? [r, 0] : r;
        if (typeof ch !== "string" || !ch) return;
        const cc = ch.charCodeAt(0);
        if (cc < 32 || (cc >= 0xd800 && cc <= 0xdfff)) fail(`${name} drew ${JSON.stringify(ch)}: a cell takes one printable character`);
        pt.s.put(i, cc, Number.isInteger(col) && col >= 0 && col < n ? pt.color(col) : NONE);
      });
  });
}

// --- emissions: what something gives off -------------------------------------------------------

/** Where an emission comes from and lives, worked out on the picture's grid, for its drawing. */
export interface Spring {
  /** The area it comes from: smoke and steam rise from its top, rain falls from its bottom. Null for a point or the picture. */
  readonly from: Cells | null;
  /** The point it comes from, in cells, when given one (or an anchor word). */
  readonly point: Point | null;
  /** The area it lives in: born in it and gone when it leaves. Null for anywhere. */
  readonly inside: Cells | null;
  /** The picture's size. */
  readonly cols: number;
  readonly rows: number;
}

/**
 * What something gives off: particles born over time and moving on their own, from an area or a point, or inside an
 * area. Make one with bubbles(), smoke(), sparks(), rain(), steam() or snow(), and give it to emit().
 */
export interface Emission {
  readonly kind: "emission";
  readonly name: string;
  readonly colors: Duo;
  /** How often it repeats exactly, in seconds. */
  readonly period?: number;
  /** Gets ready for where it comes from and returns its drawing of a frame. */
  emits(spring: Spring): MaterialDraw;
}

const isEmission = (v: unknown): v is Emission => isObject(v) && typeof v.emits === "function" && isObject(v.colors) && typeof v.name === "string";

// Calls `fn` for each particle alive at t: particle i is born at i / rate plus a jitter, and its own random draws come
// from hash(seed, i mod n), n being the births in a period, so the whole stream repeats every period exactly. Births
// before 0 count too, so the first frame is already under way.
function eachParticle(t: number, rate: number, period: number, life: number, seed: number, fn: (k: number, age: number) => void) {
  const n = Math.max(1, Math.round(rate * period)), r = n / period;
  for (let i = Math.floor((t - life) * r) - 1; i <= Math.floor(t * r); i++) {
    const k = ((i % n) + n) % n;
    const age = t - (i + 0.85 * hash(seed, k, 101)) / r;
    if (age >= 0 && age <= life) fn(k, age);
  }
}

// The columns of an area, with the rows its top or bottom is at: where a stream comes out of it.
function columnsOf(c: Cells): number[] {
  const xs: number[] = [];
  for (let x = c.x0; x < c.x1; x++) if (c.top[x] >= 0) xs.push(x);
  return xs;
}

/** Bubbles rising through a liquid: born along its bottom, wobbling up, growing a little, popping at the surface. */
export function bubbles(o?: MaterialOptions & {
  /** Bubbles a second: 2.5. */
  rate?: number;
  /** Rows a second they rise: 3. */
  speed?: number;
  /** Columns they wobble side to side: 0.5. */
  wobble?: number;
  /** Seconds for the stream to come round exactly: 4. */
  period?: number;
  /** Its seed: 1. */
  seed?: number;
}): Emission {
  const p = optionsOf("bubbles()", o, ["colors", "rate", "speed", "wobble", "period", "seed"]);
  const colors = colorsOf("bubbles.colors", p.colors, "bubbles", 2);
  const rate = numberOf("bubbles.rate", p.rate, 2.5, 0, 200);
  const speed = numberOf("bubbles.speed", p.speed, 3, 0.1, 100);
  const wobble = numberOf("bubbles.wobble", p.wobble, 0.5, 0, 5);
  const period = periodOf("bubbles.period", p.period, 4);
  const seed = seedOf("bubbles.seed", p.seed, 1);
  return {
    kind: "emission",
    name: "bubbles",
    colors,
    period,
    emits(sp) {
      const home = sp.inside ?? sp.from;
      const { cols, rows } = sp;
      const xs = home ? columnsOf(home) : Array.from({ length: cols }, (_, x) => x);
      const tall = home ? home.y1 - home.y0 : rows;
      const life = (tall + 2) / (speed * 0.8);
      return (t, pt) => {
        if (!xs.length) return;
        eachParticle(t, rate, period, life, seed, (k, age) => {
          const x0 = xs[Math.floor(hash(seed, k, 1) * xs.length)];
          const y0 = home ? home.bottom[x0] + 0.9 : rows - 0.1;
          const v = speed * (0.8 + 0.4 * hash(seed, k, 2));
          const y = y0 - v * age;
          const x = x0 + 0.5 + wobble * Math.sin(age * 4 + hash(seed, k, 3) * TAU);
          const i = Math.floor(y) * cols + Math.floor(x);
          if (y < 0 || x < 0 || x >= cols || y >= rows || (home && !home.inside[i])) return;
          const size = hash(seed, k, 4) + (v * age) / Math.max(1, tall);
          pt.s.put(i, code(size > 1.25 ? "O" : size > 0.7 ? "o" : hash(seed, k, 5) > 0.5 ? "°" : "."), pt.color(size > 0.7 ? 0 : 1));
        });
      };
    },
  };
}

// The point an emission comes out of: the top middle of its area, a point, an anchor word in the picture, or none.
function springPoint(sp: Spring, side: "top" | "bottom"): Point | null {
  if (sp.point) return sp.point;
  if (!sp.from) return null;
  // the middle of a vessel's room, not of it and its handle; the top or bottom of the area itself there
  const c = sp.from, room = c.cavity ?? c;
  const mid = Math.floor((room.x0 + room.x1 - 1) / 2);
  return side === "top" ? [mid + 0.5, Math.max(0, c.top[mid] >= 0 ? c.top[mid] : c.y0)] : [mid + 0.5, (c.bottom[mid] >= 0 ? c.bottom[mid] : c.y1 - 1) + 1];
}

// Smoke rising from a point as a column, its two sides "(" and ")", leaning with the wind, swaying more and opening
// out as it rises, and breaking up towards the top: smoke() as an emission.
function plume(name: string, p: SmokeOptions): Emission {
  const colors = colorsOf(`${name}.colors`, p.colors, "smoke", 3);
  const height = numberOf(`${name}.height`, p.height, 8, 1, 120);
  const spread = numberOf(`${name}.spread`, p.spread, 0.3, 0, 3);
  const wind = numberOf(`${name}.wind`, p.wind, 0.3, -4, 4);
  const period = periodOf(`${name}.period`, p.period, 4);
  const seed = seedOf(`${name}.seed`, p.seed, 1);
  const phase = hash(seed, 7) * TAU;
  return {
    kind: "emission",
    name,
    colors,
    period,
    emits(sp) {
      const { cols, rows } = sp;
      const from = springPoint(sp, "top") ?? [cols / 2, rows];
      return (t, pt) => {
        const { s } = pt;
        const w = (TAU * t) / period;
        const put = (x: number, y: number, ch: string, role: number) => {
          const xx = Math.round(x);
          if (xx >= 0 && xx < cols) s.put(y * cols + xx, code(ch), pt.color(role));
        };
        for (let h = 0; h < height; h++) {
          const y = Math.floor(from[1]) - 1 - h;
          if (y < 0) break;
          const f = (h + 1) / height;
          // the sway runs up the column; gaps open higher up and rise with it
          const centre = from[0] - 0.5 + wind * h + (0.3 + 1.1 * f) * Math.sin(h * 0.6 - 2 * w + phase);
          const half = spread * h;
          const role = f < 0.35 ? 2 : f < 0.7 ? 1 : 0;
          const gone = (side: number) => tiled(side * 3 + 2, h * 0.9 - (t / period) * 8, 0, 8, seed) < f * f * 0.75;
          if (half < 0.75) {
            if (!gone(0)) put(centre, y, Math.cos(h * 0.6 - 2 * w + phase) > 0 ? ")" : "(", role);
          } else {
            if (!gone(0)) put(centre - half, y, "(", role);
            if (!gone(1)) put(centre + half, y, ")", role);
          }
        }
      };
    },
  };
}

/** Steam curling up in a few wisps over a hot drink, fading as it rises. */
export function steam(o?: MaterialOptions & {
  /** How many wisps: 3. */
  wisps?: number;
  /** How many rows it rises: 5. */
  height?: number;
  /** Seconds for it to come round: 4. */
  period?: number;
  /** Its seed: 1. */
  seed?: number;
}): Emission {
  const p = optionsOf("steam()", o, ["colors", "wisps", "height", "period", "seed"]);
  const colors = colorsOf("steam.colors", p.colors, "steam", 2);
  const wisps = numberOf("steam.wisps", p.wisps, 3, 1, 12);
  if (!Number.isInteger(wisps)) fail(`steam.wisps takes a whole number from 1 to 12, not ${wisps}`);
  const height = numberOf("steam.height", p.height, 5, 1, 60);
  const period = periodOf("steam.period", p.period, 4);
  const seed = seedOf("steam.seed", p.seed, 1);
  return {
    kind: "emission",
    name: "steam",
    colors,
    period,
    emits(sp) {
      const { cols, rows } = sp;
      const c = sp.from;
      const base = springPoint(sp, "top") ?? [cols / 2, rows];
      const span = c ? Math.max(1, (c.x1 - c.x0) * 0.5) : wisps * 3;
      const xs = Array.from({ length: wisps }, (_, j) => base[0] - span / 2 + (span * (j + 0.5)) / wisps);
      return (t, pt) => {
        const w = (TAU * t) / period;
        xs.forEach((x0, j) => {
          for (let h = 0; h < height; h++) {
            const y = Math.floor(base[1]) - 1 - h;
            if (y < 0) break;
            // the wisp's sway moves up it; it thins out towards the top
            const ph = h * 1.1 - 2 * w + j * 2.1 + hash(seed, j) * TAU;
            const fade = (h + 1) / (height + 1);
            if (tiled(j * 3.7, h * 0.8 - (2 * t) / period * 4, 0, 4, seed) < fade * 0.9) continue;
            const x = Math.floor(x0 + 0.7 * Math.sin(ph));
            if (x < 0 || x >= cols) continue;
            pt.s.put(y * cols + x, code(Math.cos(ph) > 0 ? ")" : "("), pt.color(fade > 0.5 ? 0 : 1));
          }
        });
      };
    },
  };
}

/** Sparks flying up off a fire and falling back, fading from white hot to red. */
export function sparks(o?: MaterialOptions & {
  /** Sparks a second: 8. */
  rate?: number;
  /** Rows a second they leave at: 7. */
  speed?: number;
  /** Rows a second squared pulling them back down: 6. */
  gravity?: number;
  /** Seconds a spark lasts: 1.2. */
  life?: number;
  /** Seconds for the stream to come round exactly: 4. */
  period?: number;
  /** Its seed: 1. */
  seed?: number;
}): Emission {
  const p = optionsOf("sparks()", o, ["colors", "rate", "speed", "gravity", "life", "period", "seed"]);
  const colors = colorsOf("sparks.colors", p.colors, "sparks", 3);
  const rate = numberOf("sparks.rate", p.rate, 8, 0, 200);
  const speed = numberOf("sparks.speed", p.speed, 7, 0, 100);
  const gravity = numberOf("sparks.gravity", p.gravity, 6, -100, 100);
  const life = numberOf("sparks.life", p.life, 1.2, 0.1, 20);
  const period = periodOf("sparks.period", p.period, 4);
  const seed = seedOf("sparks.seed", p.seed, 1);
  return {
    kind: "emission",
    name: "sparks",
    colors,
    period,
    emits(sp) {
      const { cols, rows } = sp;
      const c = sp.from;
      const xs = c ? columnsOf(c) : [];
      const pt0 = springPoint(sp, "top") ?? [cols / 2, rows - 1];
      return (t, pt) => {
        eachParticle(t, rate, period, life, seed, (k, age) => {
          const x0 = xs.length ? xs[Math.floor(xs.length * (0.25 + 0.5 * hash(seed, k, 1)))] + 0.5 : pt0[0];
          const y0 = xs.length && c ? c.top[Math.floor(x0)] : pt0[1];
          const a = -Math.PI / 2 + (hash(seed, k, 2) - 0.5) * 1.1;
          const v = speed * (0.6 + 0.6 * hash(seed, k, 3));
          const x = x0 + Math.cos(a) * v * age * 1.5;
          const y = y0 + Math.sin(a) * v * age + 0.5 * gravity * age * age;
          if (x < 0 || x >= cols || y < 0 || y >= rows) return;
          const f = age / life;
          pt.s.put(Math.floor(y) * cols + Math.floor(x), code(f < 0.25 ? "*" : f < 0.6 ? "+" : f < 0.85 ? "'" : "."), pt.color(f < 0.3 ? 0 : f < 0.7 ? 1 : 2));
        });
      };
    },
  };
}

/** Rain falling from a cloud (the bottom of the area it comes from) or the top of the picture, splashing at the bottom. */
export function rain(o?: MaterialOptions & {
  /** Drops a second: 24. */
  rate?: number;
  /** Rows a second they fall: 12. */
  speed?: number;
  /** Columns a second the wind blows them, right (left below 0): 0. */
  wind?: number;
  /** Seconds for the rain to come round exactly: 4. */
  period?: number;
  /** Its seed: 1. */
  seed?: number;
}): Emission {
  const p = optionsOf("rain()", o, ["colors", "rate", "speed", "wind", "period", "seed"]);
  const colors = colorsOf("rain.colors", p.colors, "rain", 2);
  const rate = numberOf("rain.rate", p.rate, 24, 0, 400);
  const speed = numberOf("rain.speed", p.speed, 12, 0.5, 200);
  const wind = numberOf("rain.wind", p.wind, 0, -50, 50);
  const period = periodOf("rain.period", p.period, 4);
  const seed = seedOf("rain.seed", p.seed, 1);
  return {
    kind: "emission",
    name: "rain",
    colors,
    period,
    emits(sp) {
      const { cols, rows } = sp;
      const c = sp.from;
      const xs = c ? columnsOf(c) : Array.from({ length: cols }, (_, x) => x);
      const life = (rows + 2) / speed + 0.2;
      const slant = wind / speed;
      const drop = code(slant > 0.25 ? "/" : slant < -0.25 ? "\\" : "|");
      return (t, pt) => {
        if (!xs.length) return;
        eachParticle(t, rate, period, life, seed, (k, age) => {
          const x0 = xs[Math.floor(hash(seed, k, 1) * xs.length)];
          const y0 = c ? c.bottom[x0] + 1 : 0;
          const y = y0 + speed * age, x = x0 + 0.5 + wind * age;
          const floor = rows - 1;
          let ch = drop, yy = y;
          if (y >= floor) {
            // a splash for a moment at the bottom, then gone
            if (age - (floor - y0) / speed > 0.15) return;
            (ch = code(hash(seed, k, 2) > 0.5 ? "." : ",")), (yy = floor);
          }
          if (x < 0 || x >= cols) return;
          pt.s.put(Math.floor(yy) * cols + Math.floor(x), ch, pt.color(ch === drop ? 0 : 1));
        });
      };
    },
  };
}

/** Snow drifting down from the top of the picture (or an area's bottom), each flake swaying. */
export function snow(o?: MaterialOptions & {
  /** Flakes a second: 10. */
  rate?: number;
  /** Rows a second they fall: 2. */
  speed?: number;
  /** Columns a second the wind blows them: 0.5. */
  wind?: number;
  /** Seconds for the snow to come round exactly: 8. */
  period?: number;
  /** Its seed: 1. */
  seed?: number;
}): Emission {
  const p = optionsOf("snow()", o, ["colors", "rate", "speed", "wind", "period", "seed"]);
  const colors = colorsOf("snow.colors", p.colors, "snow", 2);
  const rate = numberOf("snow.rate", p.rate, 10, 0, 400);
  const speed = numberOf("snow.speed", p.speed, 2, 0.1, 50);
  const wind = numberOf("snow.wind", p.wind, 0.5, -20, 20);
  const period = periodOf("snow.period", p.period, 8);
  const seed = seedOf("snow.seed", p.seed, 1);
  return {
    kind: "emission",
    name: "snow",
    colors,
    period,
    emits(sp) {
      const { cols, rows } = sp;
      const c = sp.from;
      const xs = c ? columnsOf(c) : Array.from({ length: cols }, (_, x) => x);
      const life = (rows + 1) / (speed * 0.7);
      return (t, pt) => {
        if (!xs.length) return;
        eachParticle(t, rate, period, life, seed, (k, age) => {
          const x0 = xs[Math.floor(hash(seed, k, 1) * xs.length)];
          const y = (c ? c.bottom[x0] + 1 : 0) + speed * (0.7 + 0.6 * hash(seed, k, 2)) * age;
          const x = x0 + 0.5 + wind * age + Math.sin(age * 2 + hash(seed, k, 3) * TAU);
          const xx = ((Math.floor(x) % cols) + cols) % cols;
          if (y >= rows) return;
          pt.s.put(Math.floor(y) * cols + xx, code(hash(seed, k, 4) > 0.7 ? "*" : "."), pt.color(hash(seed, k, 4) > 0.7 ? 1 : 0));
        });
      };
    },
  };
}

// --- parts and the picture ---------------------------------------------------------------------

/** How a shape moves as a whole. */
export type Move = "none" | "bob" | "sway" | "swim" | "drift";

/** How a part moves as a whole, on top of what its material does. */
export interface PartOptions {
  /**
   * "bob" up and down (an ice cube floating), "sway" side to side, "swim" across its room and back, turning to face
   * the way it goes (a fish, which faces right), or "drift" right across the picture and round again (a cloud).
   * "none" by default.
   */
  move?: Move;
  /** How far, in cells: bob 1, sway 2, swim across the room it was placed in, drift the picture's width. */
  amount?: number;
  /** Seconds for one round of the move: bob 4, sway 4, swim 12, drift 24. */
  period?: number;
}

/** One layer of a picture: a shape filled with a material, or an emission. picture() draws them in order. */
export interface Part {
  readonly kind: "part";
  /** Its material or emission: the colours and period picture() gathers. */
  readonly what: Material | Emission;
  /** Its period of moving as a whole, if it moves. */
  readonly period?: number;
  /** Where it reaches in fixed cells, when it is only in fixed cells. */
  readonly extent?: { readonly cols: number; readonly rows: number };
  /** Gets ready on a picture's grid and returns its drawing of a frame. */
  setup(cols: number, rows: number): MaterialDraw;
}

const isPart = (v: unknown): v is Part => isObject(v) && v.kind === "part" && typeof v.setup === "function";

const MOVES: Record<Exclude<Move, "none">, number> = { bob: 4, sway: 4, swim: 12, drift: 24 };

/**
 * A shape: an area filled with a material, drawn over what is already there. With no material it takes the area's own
 * (glass for a cup, fire for a flame), else solid; the options may then come second: shape(cloud(), { move: "drift" }).
 */
export function shape(where: Area, what?: Material | PartOptions, o?: PartOptions): Part {
  areaOf("shape", where);
  if (what !== undefined && !isMaterial(what) && isObject(what) && o === undefined) (o = what as PartOptions), (what = undefined);
  const m = what ?? where.material?.() ?? solid();
  if (!isMaterial(m)) fail(`shape takes a material second, such as water(), glass() or solid(), not ${show(what)}`);
  const p = optionsOf("shape()'s options", o, ["move", "amount", "period"]);
  const move = wordOf("shape's move", p.move, ["none", "bob", "sway", "swim", "drift"] as const, "none");
  const amount = p.amount === undefined ? undefined : numberOf("shape's amount", p.amount, 1, 0, 320);
  const period = move === "none" ? undefined : periodOf("shape's period", p.period, MOVES[move]);
  return {
    kind: "part",
    what: m,
    period,
    extent: move === "none" ? where.extent : undefined,
    setup(cols, rows) {
      const placed = where.place(cols, rows);
      // a shape of parts draws each part in turn, each outlined on its own
      const parts = (where.pieces?.length ? where.pieces : [where]).map((a) => a.place(cols, rows));
      const all = (draws: MaterialDraw[]): MaterialDraw => (draws.length === 1 ? draws[0] : (t, pt) => draws.forEach((d) => d(t, pt)));
      if (move === "none") return all(parts.map((q) => m.prepare(cellsOf(q, cols, rows))));
      // a moving shape: each offset (and facing) is worked out once, when first reached
      const seen = new Map<string, MaterialDraw>();
      const f = placed.frame ?? { x0: 0, y0: 0, x1: cols, y1: rows };
      const w = placed.x1 - placed.x0;
      const reach = amount ?? (move === "bob" ? 1 : move === "sway" ? 2 : move === "swim" ? Math.max(0, Math.floor((f.x1 - f.x0 - w) / 2) - 1) : cols);
      const cx = (placed.x0 + placed.x1) / 2;
      return (t, pt) => {
        const k = fract(t / (period as number));
        let dx = 0, dy = 0, turn = false;
        if (move === "bob") dy = Math.round(reach * Math.sin(TAU * k));
        else if (move === "sway") dx = Math.round(reach * Math.sin(TAU * k));
        else if (move === "swim") {
          // across its room and back, easing at the ends, facing the way it goes
          dx = Math.round(reach * Math.sin(TAU * k)) + Math.round((f.x0 + f.x1) / 2 - cx);
          turn = Math.cos(TAU * k) < 0;
        } else dx = Math.round(k * reach);
        const key = `${dx},${dy},${turn}`;
        let draw = seen.get(key);
        if (!draw) {
          const wrap = move === "drift";
          const moved = (q: Placed): Placed => ({
            ...q,
            test: (x, y) => {
              const xx = x - dx;
              if (q.test(turn ? 2 * cx - xx : xx, y - dy)) return true;
              return wrap && (q.test(xx + reach, y - dy) || q.test(xx - reach, y - dy));
            },
            // a cell's character moves with it; turned, the cell's centre mirrors onto the matching cell
            char: q.char && ((x, y) => q.char!(turn ? 2 * cx - (Math.floor(x) + 0.5 - dx) : x - dx, y - dy)),
            x0: wrap ? 0 : turn ? 2 * cx - q.x1 + dx : q.x0 + dx,
            x1: wrap ? cols : turn ? 2 * cx - q.x0 + dx : q.x1 + dx,
            y0: q.y0 + dy,
            y1: q.y1 + dy,
            cavity: undefined,
          });
          draw = all(parts.map((q) => m.prepare(cellsOf(moved(q), cols, rows))));
          seen.set(key, draw);
        }
        draw(t, pt);
      };
    },
  };
}

/** Where an emission comes from and lives. */
export interface EmitOptions {
  /** Where it comes from: an area (smoke and steam rise from its top, rain and snow fall from its bottom), an anchor word in the picture, or a point [x, y]. */
  from?: Area | Anchor | Point;
  /** The area it lives in: bubbles are born along its bottom and pop where it ends. */
  inside?: Area;
}

/** An emission as a part of a picture: emit(bubbles(), { inside: drink }), emit(smoke(), { from: chimney }). */
export function emit(what: Emission, o?: EmitOptions): Part {
  if (!isEmission(what)) fail(`emit takes an emission first, such as bubbles(), smoke(), sparks(), rain(), steam() or snow(), not ${show(what)}`);
  const p = optionsOf("emit()'s options", o, ["from", "inside"]);
  if (p.from !== undefined && !isArea(p.from) && !ANCHORS.includes(p.from as Anchor) && !(Array.isArray(p.from) && p.from.length === 2 && p.from.every(Number.isFinite)))
    fail(`emit's from takes an area, an anchor word (${and(ANCHORS.map((a) => JSON.stringify(a)))}) or a point [x, y], not ${show(p.from)}`);
  if (p.inside !== undefined) areaOf("emit's inside", p.inside);
  return {
    kind: "part",
    what,
    setup(cols, rows) {
      const f = p.from;
      let point: Point | null = null;
      if (Array.isArray(f)) point = [f[0], f[1]];
      else if (typeof f === "string") {
        const a = f as Anchor;
        point = [a.endsWith("left") ? 0.5 : a.endsWith("right") ? cols - 0.5 : cols / 2, a.startsWith("top") ? 0 : a.startsWith("bottom") ? rows : rows / 2];
      }
      return what.emits({ from: isArea(f) ? cellsOf(f, cols, rows) : null, point, inside: p.inside ? cellsOf(p.inside, cols, rows) : null, cols, rows });
    },
  };
}

// The least common multiple of periods, on hundredths of a second, when it is at most 60 seconds.
function loopOf(periods: readonly number[]): number | undefined {
  if (!periods.length) return undefined;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  let l = 1;
  for (const p of periods) {
    const h = Math.round(p * 100);
    if (h <= 0) return undefined;
    l = (l * h) / gcd(l, h);
    if (l > 6000) return undefined;
  }
  return l / 100;
}

/**
 * A picture: parts laid over each other in order, the first at the bottom, as one piece. Its size is `cols` by `rows`
 * if given; else, when every part is in fixed cells, just big enough for them; else 64 by 24. Its colours are its
 * parts' (up to 32 for each page), and it loops on the least common multiple of their periods when that is a minute or
 * less. It works in colour and in one ink, on light and dark pages, and every frame depends only on t.
 */
export function picture<O extends Options = Options>(parts: readonly Part[], spec?: MakerSpec<O>): KitPiece<O> {
  if (!Array.isArray(parts) || !parts.length) fail("picture takes a list of one or more parts, such as [shape(cup(), glass())]");
  parts.forEach((part, i) => {
    if (!isPart(part)) fail(`picture's part ${i + 1} is not a part: make one with shape(area, material) or emit(emission)`);
  });
  const fixed = parts.every((part) => part.extent);
  const size = fixed && spec?.cols === undefined && spec?.rows === undefined
    ? { cols: Math.max(1, Math.ceil(Math.max(...parts.map((part) => part.extent!.cols)))), rows: Math.max(1, Math.ceil(Math.max(...parts.map((part) => part.extent!.rows)))) }
    : { cols: 64, rows: 24 };
  const s = specOf(spec, "picture", size);
  // The palette: the ink first, then each part's colours, a colour for each page, each pair once.
  const light: string[] = [INK.light], dark: string[] = [INK.dark];
  const seen = new Map<string, number>([[`${INK.light}${INK.dark}`, 0]]);
  const slots: number[][] = parts.map((part) => {
    const { colors } = part.what;
    return colors.dark.map((d: string, i: number): number => {
      const l = colors.light[i] ?? colors.light[colors.light.length - 1];
      const key = `${l.toLowerCase()}${d.toLowerCase()}`;
      const at = seen.get(key);
      if (at !== undefined) return at;
      seen.set(key, light.length);
      dark.push(d);
      return light.push(l) - 1;
    });
  });
  if (light.length > 32) fail(`these parts have ${light.length} colours for each page between them, past the 32 a picture can have: use fewer materials, or give some the same colors`);
  const periods = [...parts.map((part) => part.what.period), ...parts.map((part) => part.period)].filter((v): v is number => v !== undefined);
  const loop = s.loop ?? loopOf(periods);
  const n = light.length;
  return piece<O>(
    { ...s, fps: s.fps ?? (periods.length ? 24 : 0), category: s.category ?? "scenes", palette: { light, dark }, ink: 0, ...(loop ? { loop } : {}) },
    {
      setup: (_o, { cols, rows }) => {
        const draws = parts.map((part) => part.setup(cols, rows));
        // Each part's colours on each page, as palette indices, and its view of the grid before it drew.
        const maps = slots.map((sl) => [Uint8Array.from(sl), Uint8Array.from(sl, (k) => n + k)]);
        const under = { chars: new Uint16Array(cols * rows), colors: new Uint8Array(cols * rows) };
        let copied = false;
        let map = maps[0][0];
        // Copied when a part first reads it, which a see-through material does before it draws.
        const paint = {
          s: null as unknown as Surface,
          paper: false,
          mono: true,
          color: (i: number) => map[i < map.length ? i : map.length - 1] ?? NONE,
          get under() {
            if (!copied) under.chars.set(paint.s.chars), under.colors.set(paint.s.colors), (copied = true);
            return under;
          },
        };
        return (t, grid, ctx) => {
          paint.s = grid;
          paint.paper = ctx.paper;
          paint.mono = ctx.mono;
          draws.forEach((draw, k) => {
            map = maps[k][ctx.paper ? 0 : 1];
            copied = false;
            draw(t, paint);
          });
        };
      },
    },
  );
}

// --- a preset, to show presets are just compositions ---------------------------------------------

/**
 * A glass of water with bubbles, in one call: a preset written with the same parts anyone can use. `fill` how full
 * ("half"), `waves` ("gentle"), `colors` the drink's ("water"; "cola", "juice", "wine", "tea"...), and the size.
 */
export function waterGlass(o: { fill?: Fill; waves?: Waves; colors?: Colors; cols?: number; rows?: number } = {}): KitPiece {
  const tumbler = cup({ size: "huge" });
  const drink = inside(tumbler, { fill: o.fill ?? "half" });
  return picture(
    [shape(tumbler, glass()), shape(drink, water({ waves: o.waves, colors: o.colors })), emit(bubbles(), { inside: drink })],
    { name: "glass of water", note: "a glass of water, its surface rippling, bubbles rising", cols: o.cols ?? 32, rows: o.rows ?? 16 },
  );
}
