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
// Every piece the kit makes chains through compose's and fx's makers. They import this file too: theirs read nothing of
// it as they load, only when called, so either may load first.
import * as compose from "./compose.ts";
import * as fx from "./fx.ts";

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

/**
 * A text's 32-bit FNV-1a hash, a whole number 0 to 2^32 - 1: the same text, the same number, in every browser and in
 * Node. It hashes the text's code points, so for plain ASCII it is FNV-1a of its bytes. A seed from words, for
 * mulberry32: mulberry32(fnv1a32("bas3line")).
 */
export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193) >>> 0;
  return h >>> 0;
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

// --- colours by name --------------------------------------------------------------------

/** Colours for each page: `light` is drawn on a light page (paper), `dark` on a dark one. */
export interface Scheme {
  readonly light: readonly string[];
  readonly dark: readonly string[];
}

/**
 * The looks' palettes by name, each a list of colours from faint to strong for a light page and for a dark one: on a
 * dark page from dim to bright, on a light page from pale to deep, the way ink builds up on each. Any option in the kit
 * that takes colours takes one of these names, and colorOf() gives one name's strong colour on each page.
 *
 * - ocean: deep navy to sea foam. sunset: violet through rose to gold. neon: violet, magenta and electric cyan.
 * - fire: embers to white heat. aurora: violet sky into green curtains. forest: moss to new leaves.
 * - candy: pink, lilac, mint and lemon. mono: greys. ink: GitHub's text colour, one colour on each page.
 * - paper: sepia, pencil and old paper. github: the contribution graph's greens.
 * - ice, gold, lava, matrix, night and space: for snow, suns, lamps, code rain, rain and galaxies.
 */
export const schemes = {
  ocean: {
    light: ["#7fb8d6", "#3a8fc4", "#0077b6", "#025a8c", "#023e6b", "#03045e"],
    dark: ["#0a1f5c", "#0353a4", "#0077b6", "#00b4d8", "#90e0ef", "#e0fbfc"],
  },
  sunset: {
    light: ["#f4a261", "#e76f51", "#c9184a", "#9d0b4a", "#6a0d6b", "#3b0f5c"],
    dark: ["#3b0f5c", "#7b2cbf", "#c9184a", "#ff6b35", "#ffb627", "#ffe8a3"],
  },
  neon: {
    light: ["#c77dff", "#9d4edd", "#e0218a", "#b5179e", "#7209b7", "#3a0ca3"],
    dark: ["#3c096c", "#7b2ff7", "#f107a3", "#ff5edf", "#00e5ff", "#e0ffff"],
  },
  fire: {
    light: ["#fbbf24", "#f59e0b", "#ea580c", "#c2410c", "#991b1b", "#5b0f0f"],
    dark: ["#4a0d02", "#991b1b", "#dc2626", "#f97316", "#facc15", "#fef9c3"],
  },
  aurora: {
    light: ["#a78bfa", "#7c3aed", "#0d9488", "#047857", "#065f46", "#064e3b"],
    dark: ["#312e81", "#0e7490", "#059669", "#22c55e", "#86efac", "#ecfdf5"],
  },
  forest: {
    light: ["#a3d9a5", "#4ade80", "#16a34a", "#15803d", "#166534", "#14532d"],
    dark: ["#052e16", "#14532d", "#15803d", "#22c55e", "#86efac", "#dcfce7"],
  },
  candy: {
    light: ["#f9a8d4", "#f472b6", "#db2777", "#a21caf", "#7e22ce", "#0e7490"],
    dark: ["#831843", "#db2777", "#f472b6", "#c084fc", "#67e8f9", "#fef08a"],
  },
  mono: {
    light: ["#d4d4d8", "#a1a1aa", "#71717a", "#3f3f46", "#18181b"],
    dark: ["#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#fafafa"],
  },
  ink: { light: [INK.light], dark: [INK.dark] },
  paper: {
    light: ["#d6c4a8", "#b08d62", "#8b6a43", "#5c4630", "#3b2a1d"],
    dark: ["#3f2d20", "#6b4f3a", "#a07850", "#d4b483", "#f3e3c3"],
  },
  github: {
    light: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  ice: {
    light: ["#7dd3fc", "#38bdf8", "#0284c7", "#075985", "#0c4a6e"],
    dark: ["#0c4a6e", "#0369a1", "#38bdf8", "#bae6fd", "#f0f9ff"],
  },
  gold: {
    light: ["#facc15", "#eab308", "#ca8a04", "#a16207", "#713f12"],
    dark: ["#713f12", "#ca8a04", "#facc15", "#fef08a", "#fffbeb"],
  },
  lava: {
    light: ["#fdba74", "#f97316", "#dc2626", "#991b1b", "#450a0a"],
    dark: ["#450a0a", "#991b1b", "#ef4444", "#f97316", "#fde047"],
  },
  matrix: {
    light: ["#86efac", "#4ade80", "#16a34a", "#15803d", "#14532d"],
    dark: ["#022c0f", "#15803d", "#22c55e", "#86efac", "#f0fdf4"],
  },
  night: {
    light: ["#93c5fd", "#60a5fa", "#2563eb", "#1e40af", "#172554"],
    dark: ["#1e293b", "#1e40af", "#3b82f6", "#93c5fd", "#f8fafc"],
  },
  space: {
    light: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#6d28d9", "#4338ca", "#1e1b4b"],
    dark: ["#2e1065", "#5b21b6", "#7c3aed", "#60a5fa", "#e0e7ff", "#fff7ed"],
  },
} as const satisfies Record<string, Scheme>;

/** The name of a palette in `schemes`: "ocean", "sunset", "neon", "fire", "aurora", "forest", "candy", "mono" and the rest. */
export type SchemeName = keyof typeof schemes;

/**
 * A material's colours by name, each a list for a light page and one for a dark page, in the order the material draws
 * with them: water [deep, mid, near the surface, surface]; glass [walls, highlight, base]; fire [embers to white heat,
 * five]; smoke, steam and sand [three, faint to strong]; cloud [outline, body, shadow]; metal [dark, mid, light,
 * sheen]; wood and grass [dark, mid, light]; lava [four, cool to hot]; ice [outline, body, glint]; neon [glow, tube,
 * hot core]; ceramic [outline, body, gleam]; starfield [dim, bright]; bubbles [rim, small]; sparks [hot, warm, cool];
 * rain [drop, splash]; snow [flake, star]. A material's `colors` takes these names first and the looks' `schemes`
 * after; anything else that takes colours takes the looks' first.
 */
export const materialColors = {
  water: { light: ["#1e3a8a", "#1d4ed8", "#60a5fa", "#0369a1"], dark: ["#2563eb", "#60a5fa", "#a5d8ff", "#e0f2fe"] },
  sea: { light: ["#134e4a", "#115e59", "#0f766e", "#0d9488"], dark: ["#0f766e", "#14b8a6", "#2dd4bf", "#ccfbf1"] },
  cola: { light: ["#2b1408", "#431d0b", "#7c3a12", "#92400e"], dark: ["#5a250c", "#74351a", "#94532a", "#ead0a8"] },
  lemonade: { light: ["#854d0e", "#a16207", "#ca8a04", "#a16207"], dark: ["#ca8a04", "#eab308", "#fde047", "#fef9c3"] },
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
  moon: { light: ["#a16207", "#ca8a04", "#ca8a04"], dark: ["#fef9c3", "#fde68a", "#ffffff"] },
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
} as const satisfies Record<string, Scheme>;

/** The name of a material's colours in `materialColors`: "water", "cola", "fire", "smoke", "steel" and the rest. */
export type MaterialColorName = keyof typeof materialColors;

/** Any colour's name the kit knows: a look's palette (`schemes`) or a material's (`materialColors`). */
export type ColorName = SchemeName | MaterialColorName;

/**
 * Colours as every option in the kit that takes several takes them: a palette's name ("ocean", "fire", "cola" and the
 * rest), one colour as #rrggbb, colours of your own faint to strong, or { light, dark } with a list for each page.
 */
export type PaletteLike = ColorName | (string & {}) | readonly string[] | Scheme;

/** One colour as every option in the kit that takes one takes it: #rrggbb, { light, dark }, or a palette's name, its strong colour on each page. */
export type ColorLike = ColorName | (string & {}) | { readonly light: string; readonly dark: string };

// The table a name is in, the materials' first or the looks'.
const named = (name: string, prefer: "looks" | "materials"): Scheme | undefined => {
  const [a, b] = prefer === "materials" ? [materialColors, schemes] : [schemes, materialColors];
  return Object.hasOwn(a, name) ? (a as Record<string, Scheme>)[name] : Object.hasOwn(b, name) ? (b as Record<string, Scheme>)[name] : undefined;
};

const NAMES = () => `a palette's name such as "ocean", "fire" or "cola" (see schemes and materialColors)`;

/**
 * Colours from anything the kit takes for several: a palette's name from `schemes` or `materialColors`, one #rrggbb, a
 * list of them, or { light, dark } with a list for each page. A name in both tables is the looks' unless `prefer` is
 * "materials". Returns a list, the same on both pages, or { light, dark }, copied. Throws, naming what it takes, for
 * anything else; `what` names the option in the error.
 *
 *   colorsOf("ocean")              // { light: [6 blues], dark: [6 blues] }
 *   field({ colors: "ocean" }, fn) // what every colours option does with a name
 */
export function colorsOf(v: PaletteLike | unknown, what = "colors", prefer: "looks" | "materials" = "looks"): PaletteSpec {
  if (typeof v === "string") {
    if (isHex(v)) return [v];
    const s = named(v, prefer);
    if (s) return { light: [...s.light], dark: [...s.dark] };
    return fail(`${what} takes ${NAMES()}, colours as #rrggbb, or { light, dark }, not ${JSON.stringify(v)}: ${didYouMean(v)}`);
  }
  if (Array.isArray(v)) {
    if (!v.length || !v.every(isHex)) fail(`${what} takes colours as #rrggbb, one or more, not ${JSON.stringify(v)}`);
    return [...v];
  }
  if (v !== null && typeof v === "object" && Array.isArray((v as Scheme).light) && Array.isArray((v as Scheme).dark)) {
    const { light, dark } = v as Scheme;
    if (!light.length || !dark.length || !light.every(isHex) || !dark.every(isHex)) fail(`${what} takes { light, dark }, each one or more colours as #rrggbb, not ${JSON.stringify(v)}`);
    return { light: [...light], dark: [...dark] };
  }
  return fail(`${what} takes ${NAMES()}, colours as #rrggbb, or { light, dark }, not ${typeof v === "object" ? JSON.stringify(v) ?? String(v) : String(v)}`);
}

/**
 * One colour for each page from anything the kit takes for one: #rrggbb (the same on both), { light, dark }, or a
 * palette's name, which gives that palette's strong colour on each page, as `colorOf("ocean")` is a deep blue on paper
 * and a bright one on a dark page. Throws, naming what it takes, for anything else.
 */
export function colorOf(v: ColorLike | unknown, what = "color"): { light: string; dark: string } {
  if (isHex(v)) return { light: v, dark: v };
  if (typeof v === "string") {
    const s = named(v, "looks");
    if (!s) return fail(`${what} takes a colour as #rrggbb, { light, dark }, or ${NAMES()}, not ${JSON.stringify(v)}: ${didYouMean(v)}`);
    const strong = (list: readonly string[]) => list[Math.min(list.length - 1, Math.floor(list.length * 0.6))];
    return { light: strong(s.light), dark: strong(s.dark) };
  }
  const o = v as { light?: unknown; dark?: unknown };
  if (v !== null && typeof v === "object" && !Array.isArray(v) && isHex(o.light) && isHex(o.dark)) return { light: o.light, dark: o.dark };
  return fail(`${what} takes a colour as #rrggbb, { light, dark }, or ${NAMES()}, not ${typeof v === "object" ? JSON.stringify(v) ?? String(v) : String(v)}`);
}

// The names nearest one that is not a palette's, for an error to offer: "oceans" is one letter from "ocean".
function didYouMean(word: string): string {
  const all = [...new Set([...Object.keys(schemes), ...Object.keys(materialColors)])];
  const near = nearWords(word, all);
  return near.length ? `did you mean ${near.map((n) => JSON.stringify(n)).join(" or ")}?` : `a colour of your own is #rrggbb, and the names are ${and(all)}`;
}

// How many letters apart two words are: Levenshtein's distance.
function lettersApart(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return d[b.length];
}

// Words people reach for that the kit says another way, each with the kit's words for the same thing.
const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  middle: ["center", "middle"], centre: ["center"], centred: ["center"], mid: ["center", "middle"],
  colour: ["color", "colors", "palette"], colours: ["colors", "palette", "color"], palette: ["colors", "color"], colors: ["palette", "color"], color: ["colors", "palette"],
  size: ["scale", "size"], scale: ["size", "scale"], dir: ["to", "toward", "way"], direction: ["to", "toward", "way", "direction"], heading: ["to"], towards: ["toward", "to"],
  big: ["large", "strong", "big"], large: ["huge", "large", "strong"], little: ["small", "subtle"], tiny: ["small", "subtle", "tiny"], huge: ["huge", "large"],
  quick: ["fast"], quickly: ["fast"], rapid: ["fast"], slowly: ["slow"], medium: ["normal", "medium"], normal: ["medium", "normal"],
  light: ["subtle", "light"], heavy: ["strong", "heavy"], weak: ["subtle"], soft: ["subtle", "soft"], hard: ["strong"],
  duration: ["period", "seconds"], time: ["period", "seconds"], length: ["period", "seconds", "length"], loop: ["period", "loop"], delay: ["first", "start", "delay"],
  text: ["label", "title", "text"], title: ["label", "title"], label: ["title", "label"], caption: ["label", "title"],
  width: ["cols", "width"], height: ["rows", "height"], columns: ["cols", "columns"],
  speed: ["speed", "period"], rate: ["speed", "rate"], amount: ["amount", "size"], strength: ["amount"], intensity: ["amount"],
};

// The kit's words a word that is not one of them most likely meant: its synonyms that are, then those a letter or two
// away, at most three.
function nearWords(word: string, words: readonly string[]): string[] {
  const w = word.toLowerCase().slice(0, 40);
  const same = (SYNONYMS[w] ?? []).filter((s) => words.includes(s) && s !== word);
  const close = words.filter((n) => !same.includes(n) && lettersApart(w, n.toLowerCase()) <= (w.length <= 4 ? 1 : 2));
  return [...same, ...close].slice(0, 3);
}

/**
 * A hint for an error, when `word` is not one of `words`: the kit's word for it when it is a synonym ("center" for
 * "middle", "color" for "colour"), or the nearest by spelling, as ` (did you mean "center"?)`; "" when none is near.
 * For makers of your own, after the word in their own "has no option" or "takes ... not" message.
 *
 *   fail(`glow() has no option ${JSON.stringify(k)}${suggest(k, keys)}: it takes ${and(keys)}`);
 */
export function suggest(word: unknown, words: readonly string[]): string {
  if (typeof word !== "string") return "";
  const near = nearWords(word, words);
  return near.length ? ` (did you mean ${near.map((n) => JSON.stringify(n)).join(" or ")}?)` : "";
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

/**
 * What every piece the kit makes can do besides play: each step returns a new piece, which chains again, and leaves
 * this one as it was, so a recipe, a scene, particles or a layout is one line. Each is a function of the kit's own
 * (compose's over(), border() and speed(), fx's glint() and shake() and the rest) with this piece as its source.
 *
 *   stars().behind(pulsing(heart())).named("love in space")
 *   gauge({ label: "cpu" }).border({ title: true }).glint({ every: "rarely" })
 */
export interface Chain {
  /** The piece under another name, and a line saying what it shows: compose's named(). */
  named(name: string, note?: string): KitPiece;
  /** The piece with a line of its own saying what it shows, as screen readers and svg() read it. */
  note(note: string): KitPiece;
  /** This piece laid over another, in that one's size, centred: compose's over(this, bottom). */
  over(bottom: Source | ComposeLayer, o?: OverOptions): KitPiece;
  /** Another piece laid over this one, centred: a banner on a starfield. compose's over(top, this). */
  behind(top: Source | ComposeLayer, o?: OverOptions): KitPiece;
  /** Played `factor` times as fast: compose's speed(). */
  speed(factor: number): KitPiece;
  /** Waiting `seconds` on its first frame before it plays: compose's delay(). */
  delay(seconds: number): KitPiece;
  /** Its first `seconds` over and over, which becomes its loop: compose's repeat(). */
  repeat(seconds: number): KitPiece;
  /** A still of it at `at` seconds: compose's freeze(). */
  freeze(at: number): KitPiece;
  /** Blank cells round it: compose's pad(). */
  pad(n: number | readonly [number, number] | { top?: number; right?: number; bottom?: number; left?: number }): KitPiece;
  /** In a box with a title if you like: compose's border(). */
  border(o?: ComposeBorderOptions): KitPiece;
  /** A part of it, cells of a region: compose's crop(). */
  crop(region: Region): KitPiece;
  /** Mirrored: compose's flip(). */
  flip(axis: "x" | "y" | "both"): KitPiece;
  /** Made bigger by whole numbers: compose's scale(). */
  scale(factor: number | readonly [number, number]): KitPiece;
  /** A light band crossing it now and then: fx's glint(). */
  glint(o?: FxOptionsOf<"glint">): KitPiece;
  /** Jolting now and then: fx's shake(). */
  shake(o?: FxOptionsOf<"shake">): KitPiece;
  /** Breaking up now and then: fx's glitch(). */
  glitch(o?: FxOptionsOf<"glitch">): KitPiece;
  /** Swaying as a wave runs down it: fx's wave(). */
  wave(o?: FxOptionsOf<"wave">): KitPiece;
  /** Fading in and out down a ramp: fx's fade(). */
  fade(o?: FxOptionsOf<"fade">): KitPiece;
  /** Dissolving in and out in patches: fx's dissolve(). */
  dissolve(o?: FxOptionsOf<"dissolve">): KitPiece;
  /** Its ink in colours running across it: fx's rainbow(). */
  rainbow(o?: FxOptionsOf<"rainbow">): KitPiece;
  /** All its ink in one colour going round the wheel: fx's hueCycle(). */
  hueCycle(o?: FxOptionsOf<"hueCycle">): KitPiece;
  /** A line round its ink: fx's outline(). */
  outline(o?: FxOptionsOf<"outline">): KitPiece;
  /** A shadow behind its ink: fx's shadow(). */
  shadow(o?: FxOptionsOf<"shadow">): KitPiece;
  /** A line scanning across it: fx's scan(). */
  scan(o?: FxOptionsOf<"scan">): KitPiece;
  /** Typed in a character at a time: fx's typeIn(). */
  typeIn(o?: FxOptionsOf<"typeIn">): KitPiece;
}

// The options compose's and fx's makers take, by name, for Chain's methods.
type OverOptions = Parameters<typeof compose.over>[2];
type ComposeLayer = Parameters<typeof compose.layer>[0] & object;
type ComposeBorderOptions = Parameters<typeof compose.border>[1];
type FxOptionsOf<K extends "glint" | "shake" | "glitch" | "wave" | "fade" | "dissolve" | "rainbow" | "hueCycle" | "outline" | "shadow" | "scan" | "typeIn"> = Parameters<(typeof fx)[K]>[1];

/** What a piece made by the kit is: a normal piece, its meta typed for its options, that chains. */
export interface KitPiece<O extends Options = Options> extends Piece<O>, Chain {
  meta: Meta<O>;
}

/**
 * The methods every piece the kit makes has, on its prototype: a piece is still a plain { meta, default } to mount(),
 * svg() and the rest. chained() gives any piece them.
 */
export class Chainable implements Chain {
  named(name: string, note?: string): KitPiece {
    return compose.named(this as unknown as Piece, name, note === undefined ? {} : { note });
  }
  note(note: string): KitPiece {
    return compose.named(this as unknown as Piece, (this as unknown as Piece).meta.name, { note });
  }
  over(bottom: Source | ComposeLayer, o?: OverOptions): KitPiece {
    return compose.over(this as unknown as Piece, bottom, o);
  }
  behind(top: Source | ComposeLayer, o?: OverOptions): KitPiece {
    return compose.over(top, this as unknown as Piece, o);
  }
  speed(factor: number): KitPiece {
    return compose.speed(this as unknown as Piece, factor);
  }
  delay(seconds: number): KitPiece {
    return compose.delay(this as unknown as Piece, seconds);
  }
  repeat(seconds: number): KitPiece {
    return compose.repeat(this as unknown as Piece, seconds);
  }
  freeze(at: number): KitPiece {
    return compose.freeze(this as unknown as Piece, at);
  }
  pad(n: number | readonly [number, number] | { top?: number; right?: number; bottom?: number; left?: number }): KitPiece {
    return compose.pad(this as unknown as Piece, n);
  }
  border(o?: ComposeBorderOptions): KitPiece {
    return compose.border(this as unknown as Piece, o);
  }
  crop(region: Region): KitPiece {
    return compose.crop(this as unknown as Piece, region);
  }
  flip(axis: "x" | "y" | "both"): KitPiece {
    return compose.flip(this as unknown as Piece, axis);
  }
  scale(factor: number | readonly [number, number]): KitPiece {
    return compose.scale(this as unknown as Piece, factor);
  }
  glint(o?: FxOptionsOf<"glint">): KitPiece {
    return fx.glint(this as unknown as Piece, o);
  }
  shake(o?: FxOptionsOf<"shake">): KitPiece {
    return fx.shake(this as unknown as Piece, o);
  }
  glitch(o?: FxOptionsOf<"glitch">): KitPiece {
    return fx.glitch(this as unknown as Piece, o);
  }
  wave(o?: FxOptionsOf<"wave">): KitPiece {
    return fx.wave(this as unknown as Piece, o);
  }
  fade(o?: FxOptionsOf<"fade">): KitPiece {
    return fx.fade(this as unknown as Piece, o);
  }
  dissolve(o?: FxOptionsOf<"dissolve">): KitPiece {
    return fx.dissolve(this as unknown as Piece, o);
  }
  rainbow(o?: FxOptionsOf<"rainbow">): KitPiece {
    return fx.rainbow(this as unknown as Piece, o);
  }
  hueCycle(o?: FxOptionsOf<"hueCycle">): KitPiece {
    return fx.hueCycle(this as unknown as Piece, o);
  }
  outline(o?: FxOptionsOf<"outline">): KitPiece {
    return fx.outline(this as unknown as Piece, o);
  }
  shadow(o?: FxOptionsOf<"shadow">): KitPiece {
    return fx.shadow(this as unknown as Piece, o);
  }
  scan(o?: FxOptionsOf<"scan">): KitPiece {
    return fx.scan(this as unknown as Piece, o);
  }
  typeIn(o?: FxOptionsOf<"typeIn">): KitPiece {
    return fx.typeIn(this as unknown as Piece, o);
  }
}

/**
 * Any piece with the methods every kit piece has, so it chains: a kit piece as it is, anything else (a library piece,
 * an object of your own with meta and default) as a copy of it with them, everything it carried kept.
 *
 *   chained(donut).glint().named("shiny donut")
 */
export function chained<P extends Piece>(p: P): P & KitPiece {
  if (p instanceof Chainable) return p as P & KitPiece;
  if (!p || typeof p !== "object" || !p.meta || typeof p.default !== "function") fail(`chained() takes a piece, meta and a default function, not ${String(p)}`);
  return Object.assign(Object.create(Chainable.prototype) as Chainable, p) as unknown as P & KitPiece;
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
  /**
   * Its colours: one list, { light, dark } of the same length, or a palette's name such as "ocean" (its colours for
   * each page). Without, it is text in the page's own colour.
   */
  palette?: PaletteSpec | ColorName;
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

/**
 * A maker's spec, its name and size filled in: `name`, and 64 by 24 unless `size` says otherwise. A palette given by
 * name is its colours.
 */
export function specOf<O extends Options>(spec: MakerSpec<O> | undefined, name: string, size: { cols: number; rows: number } = { cols: 64, rows: 24 }): Omit<PieceSpec<O>, "palette"> & { palette?: PaletteSpec } {
  if (spec !== undefined && (spec === null || typeof spec !== "object")) fail(`${name}() takes a spec object, such as { cols: 64, rows: 24 }`);
  const { palette: given, ...rest } = spec ?? {};
  const palette = given === undefined ? undefined : colorsOf(given, `${name}()'s palette`);
  return { ...rest, name: spec?.name ?? name, cols: spec?.cols ?? size.cols, rows: spec?.rows ?? size.rows, ...(palette !== undefined ? { palette } : {}) };
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
  const palette = spec.palette === undefined ? null : new Palette(typeof spec.palette === "string" ? colorsOf(spec.palette, "palette") : spec.palette, spec.ink ?? 0);
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
  return chained({
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
  });
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
    // Its colours were found for the page it was drawn for. A themed palette has each colour twice, light then dark,
    // so on the other page each cell takes the same colour's other half: drawn for a dark page, it shows its paper
    // colours on paper, not white text on a white page.
    const other = grid.clone();
    if (palette?.themed) {
      const n = palette.size;
      for (let i = 0; i < other.colors.length; i++) {
        const c = other.colors[i];
        if (c !== NONE) other.colors[i] = grid.paper ? (c < n ? c + n : c) : c >= n ? c - n : c;
      }
    }
    other.paper = !grid.paper;
    return chained<Piece>({
      meta,
      default: () => (t, env = {}) => (!!env.paper === grid.paper ? grid : other).frame(env),
    });
  }
  if (typeof src === "string") {
    let lines = src.replace(/\r\n?/g, "\n").split("\n");
    // Art in a template literal, starting on the line after the backtick, is read as draw's stamp() reads it: its
    // blank first and last lines and the indent its lines share are left out.
    if (lines.length > 1 && lines[0] === "") {
      while (lines.length > 1 && !lines[0].trim()) lines.shift();
      while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
      const indent = lines.reduce((n, l) => (l.trim() ? Math.min(n, l.length - l.trimStart().length) : n), Infinity);
      if (Number.isFinite(indent)) lines = lines.map((l) => l.slice(indent));
    }
    const cols = Math.max(1, ...lines.map((l) => l.length));
    if (CONTROL.test(lines.join(""))) fail("text takes printable characters and newlines, not control characters");
    const text = lines.map((l) => l.padEnd(cols)).join("\n");
    const meta: Meta = checkMeta({ name, category: "type", note: name, cols, rows: lines.length, fps: 0 });
    return chained<Piece>({ meta, default: () => () => text });
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
