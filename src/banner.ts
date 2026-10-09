/*
 * banner: any text in block letters with a drop shadow, as a piece. It plays
 * wherever a piece does: mount(), <Ascii>, <ascii-banner>, play() in a
 * terminal, svg() for a README. Everything about it is an option: the font,
 * the size of its pixels and the room between letters, the shadow's lines,
 * the letters' characters, how it moves and how fast, and its colours, one,
 * a fade, or one for each theme. With no colour it is text in the page's own.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { banner } from "ascii.rest/banner";
 *   import { mount } from "ascii.rest";
 *
 *   mount(canvas, banner("hello", { color: ["#f97316", "#f778ba"], shadow: "rounded" }));
 */
import type { Env, Frame, Meta, Piece } from "./types.ts";

/**
 * A pixel font: each character's rows joined by "|", "#" for a pixel and anything else for none, every row as wide as
 * the first. `height` is the number of rows. Without `cased`, text is drawn in capitals.
 */
export interface Font {
  height: number;
  glyphs: Readonly<Record<string, string>>;
  cased?: boolean;
}

/** block: five rows, letters of four or five pixels. slim: five rows, three pixels wide. */
export const fonts = {
  block: {
    height: 5,
    glyphs: {
      A: ".##.|#..#|####|#..#|#..#", B: "###.|#..#|###.|#..#|###.", C: ".###|#...|#...|#...|.###",
      D: "###.|#..#|#..#|#..#|###.", E: "####|#...|###.|#...|####", F: "####|#...|###.|#...|#...",
      G: ".###|#...|#.##|#..#|.###", H: "#..#|#..#|####|#..#|#..#", I: "#|#|#|#|#",
      J: "...#|...#|...#|#..#|.##.", K: "#..#|#.#.|##..|#.#.|#..#", L: "#...|#...|#...|#...|####",
      M: "#...#|##.##|#.#.#|#...#|#...#", N: "#...#|##..#|#.#.#|#..##|#...#", O: ".##.|#..#|#..#|#..#|.##.",
      P: "###.|#..#|###.|#...|#...", Q: ".##.|#..#|#..#|#.#.|.#.#", R: "###.|#..#|###.|#.#.|#..#",
      S: ".###|#...|.##.|...#|###.", T: "#####|..#..|..#..|..#..|..#..", U: "#..#|#..#|#..#|#..#|.##.",
      V: "#...#|#...#|#...#|.#.#.|..#..", W: "#...#|#...#|#.#.#|##.##|#...#", X: "#...#|.#.#.|..#..|.#.#.|#...#",
      Y: "#...#|.#.#.|..#..|..#..|..#..", Z: "####|...#|..#.|.#..|####",
      0: "###|#.#|#.#|#.#|###", 1: ".#.|##.|.#.|.#.|###", 2: "###|..#|###|#..|###", 3: "###|..#|.##|..#|###",
      4: "#.#|#.#|###|..#|..#", 5: "###|#..|###|..#|###", 6: "###|#..|###|#.#|###", 7: "###|..#|..#|..#|..#",
      8: "###|#.#|###|#.#|###", 9: "###|#.#|###|..#|###",
      ".": ".|.|.|.|#", ",": ".|.|.|#|#", "!": "#|#|#|.|#", "?": "###|..#|.##|...|.#.", "'": "#|#|.|.|.",
      ":": ".|#|.|#|.", "-": "...|...|###|...|...", "+": "...|.#.|###|.#.|...", "=": "...|###|...|###|...",
      "/": "..#|..#|.#.|#..|#..", _: "...|...|...|...|###", " ": "..",
    },
  },
  slim: {
    height: 5,
    glyphs: {
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
      "/": "..#|..#|.#.|#..|#..", _: "...|...|...|...|###", " ": "..",
    },
  },
} as const satisfies Record<string, Font>;

export type FontName = keyof typeof fonts;

/**
 * The shadow's line styles, each the 16 characters of a cell by the edges that meet in it: up 1, down 2, left 4,
 * right 8, so " ║║║═╝╗╣═╚╔╠═╩╦╬" for double. Pass 16 characters of your own for any other.
 */
export const shadows = {
  double: " ║║║═╝╗╣═╚╔╠═╩╦╬",
  single: " │││─┘┐┤─└┌├─┴┬┼",
  heavy: " ┃┃┃━┛┓┫━┗┏┣━┻┳╋",
  rounded: " │││─╯╮┤─╰╭├─┴┬┼",
  ascii: " |||-+++-+++-+++",
} as const;

export type ShadowName = keyof typeof shadows;

/** How it moves. glint: a glint crosses it now and then. type: its letters type in, one at a time, and stay. still. */
export type Effect = "glint" | "type" | "still";

/** A colour as #rrggbb, or two or more for a fade along the letters from the first to the last. */
export type Colors = string | readonly string[];
/** One colour, or fade, for both a light page and a dark one, or one of each. */
export type Themed<T> = T | { light?: T; dark?: T };

/** Characters by the ground they are drawn on. */
type Grounds = { dark?: string; light?: string };

export interface BannerOptions {
  /** The letters: "block" by default, "slim", or a font of your own. */
  font?: FontName | Font;
  /** Columns a pixel of the font takes: 2 by default, so the pixels are square on a 1:2 cell; 1 for narrow letters. */
  pixel?: number;
  /** Columns between letters: 2. */
  gap?: number;
  /** The drop shadow's lines: "double" by default, "single", "heavy", "rounded", "ascii", 16 characters of your own, or "none". */
  shadow?: ShadowName | "none" | (string & {});
  /** The letters' character: "▓" on a dark page and "█" on a light one, or one for both. */
  fill?: string | Grounds;
  /** How it moves: "glint" by default, "type" or "still". */
  effect?: Effect;
  /** How fast it moves: 1 by default, 2 for twice as fast. */
  speed?: number;
  /** The glint: when it first crosses, how long it takes, how often it comes, its width and slant in cells, its characters. */
  glint?: { first?: number; sweep?: number; every?: number; width?: number; slant?: number; chars?: string | Grounds };
  /** Typing: seconds for each letter. */
  type?: { step?: number };
  /** The letters' colour, a fade of several, or one for each theme. Without any colour, it is text in the page's colour. */
  color?: Themed<Colors>;
  /** The shadow's colour, or one for each theme; a quieter one by default when the letters have a colour. */
  shadowColor?: Themed<string>;
  /** Blank cells around it: one number for every side, or [rows, columns]. */
  pad?: number | readonly [number, number];
  /** A fixed size to centre it in, rather than its own; narrower pixels if it would not fit. */
  size?: { cols: number; rows: number };
  /** The widest it may be: narrower pixels, then 1, when it would be wider. */
  max?: number;
  /** Its name, for screen readers and titles: the text by default. */
  name?: string;
}

/** A banner: a piece, and what it drew and how its motion runs. */
export interface BannerPiece extends Piece {
  /** The characters it drew, in the case they came in. */
  text: string;
  /**
   * Its motion: a loop of `seconds` from `from` for a glint, whose first pass runs from `pass[0]` to `pass[1]`; one play
   * of `seconds` for typing; 0 seconds for a still.
   */
  motion: { seconds: number; from: number; once: boolean; pass?: readonly [number, number] };
}

// The default inks when a banner has colour and leaves one out: GitHub's own text colours, default and muted.
const INK = { light: "#1f2328", dark: "#f0f6fc" };
const QUIET = { light: "#59636e", dark: "#9198a1" };
const HEX = /^#[0-9a-f]{6}$/i;

const resolve = (font: BannerOptions["font"]): Font => (typeof font === "object" ? font : fonts[font ?? "block"] ?? fonts.block);

/** The characters of a text that a font draws, in the case they came in; a banner leaves out the rest. */
export function drawable(text: string, font: BannerOptions["font"] = "block"): string {
  const f = resolve(font);
  return [...String(text)].filter((ch) => [...(f.cased ? ch : ch.toUpperCase())].some((c) => Object.hasOwn(f.glyphs, c))).join("");
}

// The pixels of each letter the font has, as its rows.
const shapes = (text: string, f: Font) =>
  [...String(text)]
    .flatMap((ch) => [...(f.cased ? ch : ch.toUpperCase())])
    .map((c) => (Object.hasOwn(f.glyphs, c) ? f.glyphs[c] : undefined))
    .filter((g): g is string => Boolean(g))
    .map((g) => g.split("|"));

// The colours of a fade at `n` evenly spaced points.
function fade(stops: readonly string[], n: number): string[] {
  const rgb = stops.map((s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)));
  return Array.from({ length: n }, (_, i) => {
    const k = n > 1 ? (i / (n - 1)) * (rgb.length - 1) : 0;
    const a = Math.min(rgb.length - 2, Math.floor(k)), f = k - a;
    const c = rgb.length === 1 ? rgb[0] : rgb[a].map((v, j) => Math.round(v + (rgb[a + 1][j] - v) * f));
    return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  });
}

const pick = <T>(themed: Themed<T> | undefined, theme: "light" | "dark"): T | undefined =>
  themed !== null && typeof themed === "object" && !Array.isArray(themed) ? (themed as { light?: T; dark?: T })[theme] : (themed as T | undefined);

/** A banner of `text`, as a piece. It throws when the font draws none of the text. */
export function banner(text: string, options: BannerOptions = {}): BannerPiece {
  const font = resolve(options.font);
  const glyphs = shapes(text, font);
  if (!glyphs.length) throw new Error(`ascii.rest: the font draws none of "${text}"`);
  const gap = options.gap ?? 2;
  const shade = options.shadow === "none" ? null : (shadows[options.shadow as ShadowName] ?? options.shadow ?? shadows.double);
  if (shade !== null && [...shade].length !== 16) throw new Error(`ascii.rest: a shadow takes 16 characters, not ${[...shade].length}`);
  const joins = shade === null ? [] : [...shade];
  const h = font.height;
  // The letters' columns at s columns a pixel, the shadow's one included.
  const span = (s: number) => glyphs.reduce((w, g) => w + g[0].length * s, 0) + gap * (glyphs.length - 1) + (shade ? 1 : 0);
  const [padY, padX] = typeof options.pad === "number" ? [options.pad, options.pad] : (options.pad ?? [0, 0]);
  const tall = h + (shade ? 1 : 0);

  let s = Math.max(1, Math.round(options.pixel ?? 2));
  let cols: number, rows: number, x0: number, y0: number;
  if (options.size) {
    ({ cols, rows } = options.size);
    // Square pixels while they leave a column each side; one column a pixel when they would not.
    if (span(s) > cols - 2) s = 1;
    x0 = Math.max(0, Math.floor((cols - span(s)) / 2));
    y0 = Math.floor((rows - tall) / 2);
  } else {
    if (options.max !== undefined) while (s > 1 && span(s) + 2 * padX > options.max) s--;
    cols = span(s) + 2 * padX;
    rows = tall + 2 * padY;
    x0 = padX;
    y0 = padY;
  }

  const ink = new Uint8Array(cols * rows);
  let x = x0;
  for (const g of glyphs) {
    g.forEach((line, y) => {
      for (let i = 0; i < line.length; i++)
        if (line[i] === "#") for (let k = 0; k < s; k++) if (x + i * s + k < cols && y0 + y < rows) ink[(y0 + y) * cols + x + i * s + k] = 1;
    });
    x += g[0].length * s + gap;
  }
  const at = (c: number, r: number) => (c >= 0 && c < cols && r >= 0 && r < rows ? ink[r * cols + c] : 0);

  // The shadow is the letters' outline moved half a cell right and down, so each empty cell draws the outline edges
  // that meet at its top left corner. null is a letter's cell.
  const grid: (string | null)[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (at(c, r)) {
        grid.push(null);
        continue;
      }
      if (!shade) {
        grid.push(" ");
        continue;
      }
      const a = at(c - 1, r - 1), b = at(c, r - 1), d = at(c - 1, r);
      const edges = (a !== b ? 1 : 0) | (d ? 2 : 0) | (a !== d ? 4 : 0) | (b ? 8 : 0);
      // Where two letters touch only at that corner, the shadow turns down and right.
      grid.push(joins[edges === 15 ? 2 | 8 : edges]);
    }
  }

  // Characters, by ground.
  const both = (v: string | Grounds | undefined, dark: string, light: string) =>
    typeof v === "string" ? { dark: v, light: v } : { dark: v?.dark ?? dark, light: v?.light ?? light };
  const fill = both(options.fill, "▓", "█");
  const gl = options.glint ?? {};
  const shine = both(gl.chars, "██", "▒▓");
  const speed = options.speed && options.speed > 0 ? options.speed : 1;
  const first = (gl.first ?? 0.5) / speed, sweep = (gl.sweep ?? 2.4) / speed, every = (gl.every ?? 3.2) / speed;
  const width = gl.width ?? 2.4, slant = gl.slant ?? 1.2;
  const effect = options.effect ?? "glint";
  const step = (options.type?.step ?? 2 / 15) / speed;

  // Typing: the columns up to the end of each letter's shadow, in turn.
  const ends: number[] = [];
  for (let i = 0, e = x0; i < glyphs.length; i++) ends.push((e += glyphs[i][0].length * s + (i ? gap : 0)) + (shade ? 1 : 0));

  // Colour: a palette of two halves, light then dark, each the shadow's colour then the letters' along their width.
  const colored = options.color !== undefined || options.shadowColor !== undefined;
  const steps = (() => {
    const c = [pick(options.color, "light"), pick(options.color, "dark")];
    return c.some((v) => Array.isArray(v) && v.length > 1) ? Math.max(2, Math.min(30, cols)) : 1;
  })();
  let palette: string[] | undefined;
  if (colored) {
    palette = [];
    for (const theme of ["light", "dark"] as const) {
      const c = pick(options.color, theme);
      const stops = c === undefined ? [INK[theme]] : typeof c === "string" ? [c] : [...c];
      const quiet = pick(options.shadowColor, theme) ?? QUIET[theme];
      for (const v of [...stops, quiet]) if (!HEX.test(v)) throw new Error(`ascii.rest: a colour takes #rrggbb, not "${v}"`);
      palette.push(quiet, ...fade(stops, steps));
    }
  }
  const half = steps + 1;
  const lo = x0, hi = x0 + span(s) - (shade ? 2 : 1);
  const bucket = (c: number) => (steps === 1 ? 0 : Math.max(0, Math.min(steps - 1, Math.round(((c - lo) / Math.max(1, hi - lo)) * (steps - 1)))));

  const left = x0 - 2, right = x0 + span(s) + 9;
  const frame = (t: number, { paper = false, color }: Env = {}) => {
    const glinting = effect === "glint";
    let p = -99;
    if (glinting) {
      // The glint crosses at an even pace, then rests out of sight. Frame 0 is at rest.
      const u = (((t - first) % every) + every) % every / sweep;
      if (u < 1) p = left + (right - left) * u;
    }
    const upTo = effect === "type" ? ends[Math.min(ends.length - 1, Math.max(0, Math.floor(t / step + 1e-9)))] : cols;
    const g = paper ? "light" : "dark";
    const [core, edge] = [...shine[g]];
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        const cell = grid[k];
        if (c >= upTo) {
          line += " ";
          continue;
        }
        if (cell !== null) {
          line += cell;
          if (color && palette && cell !== " ") color[k] = (paper ? 0 : half) + 0;
          continue;
        }
        const d = Math.abs(c + slant * r - p);
        // Ink is a dense shade on a dark page so the glint can be brighter, and solid on paper.
        line += d < width / 2 ? core : d < width ? (edge ?? core) : fill[g];
        if (color && palette) color[k] = (paper ? 0 : half) + 1 + bucket(c);
      }
      lines.push(line);
    }
    return lines.join("\n");
  };

  const motion =
    effect === "glint"
      ? { seconds: every, from: 0, once: false, pass: [first, first + sweep] as const }
      : effect === "type"
        ? { seconds: step * ends.length + 4 / 15, from: 0, once: true }
        : { seconds: 0, from: 0, once: false };
  const name = options.name ?? drawable(text, font).trim();
  const meta: Meta = {
    name,
    category: "type",
    note: `"${name}" in block letters`,
    cols,
    rows,
    fps: effect === "still" ? 0 : 24,
    ...(palette ? { palette } : {}),
    ...(effect === "glint" ? { loop: every } : {}),
  };
  return { meta, default: (): Frame => frame, text: drawable(text, font), motion };
}
