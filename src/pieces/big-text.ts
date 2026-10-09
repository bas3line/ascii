/*
 * big-text: a banner in a hand-made five-row block font with a drop shadow
 * drawn in double lines, and a glint that sweeps across now and then. fit()
 * sizes it to its text, for the README banners and banner() in a terminal.
 */
import type { Frame, Meta } from "../types.ts";

export interface BigTextOptions {
  [key: string]: unknown;
  text: string;
}

export const meta = {
  name: "big text",
  category: "type",
  note: "a block-letter banner with a line shadow and a passing glint",
  cols: 66,
  rows: 8,
  fps: 24,
  options: { text: "hello" },
} satisfies Meta<BigTextOptions>;

// Five rows each, # is ink. Widths vary, so I is one pixel and M is five.
const FONT: Record<string, string> = {
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
};

// Shadow cells by which neighbours they join: up 1, down 2, left 4, right 8.
const JOIN = " ║║║═╝╗╣═╚╔╠═╩╦╬";
const U = 1, D = 2, L = 4, R = 8;

// The glint starts across at 0.5 s, takes 2.4 s to cross, and comes round every 3.2 s.
const FIRST = 0.5, SWEEP = 2.4, PERIOD = 3.2;

/** The characters of a text that the font draws, in the case they came in; fit() leaves out the rest. */
export const drawable = (text: string) => [...String(text)].filter((ch) => Object.hasOwn(FONT, ch.toUpperCase())).join("");

// The letters of a text that the font has, each as its five rows.
const shapes = (text: string) => [...String(text).toUpperCase()].map((ch) => FONT[ch]).filter(Boolean).map((g) => g.split("|"));
// The columns they take at s columns a pixel, two between letters and one for the shadow.
const span = (glyphs: string[][], s: number) => glyphs.reduce((w, g) => w + g[0].length * s + 2, -1);

export default function bigText({ text = meta.options.text }: Partial<BigTextOptions> = {}): Frame {
  const { cols, rows } = meta;
  const glyphs = shapes(text);
  // Each pixel is two columns by one row, so it is square; one column narrower if it would not fit.
  const s = span(glyphs, 2) <= cols - 2 ? 2 : 1;
  return draw(glyphs, s, cols, rows, Math.max(0, Math.floor((cols - span(glyphs, s)) / 2)), Math.floor((rows - 6) / 2));
}

/**
 * The same banner sized to its text instead of to the piece's 66 by 8, for a README or a terminal: the letters and
 * their shadow with nothing around them, in square pixels while that is at most `max` columns wide and one column a
 * pixel when it is not. `cols` is 0 when the font has none of the text's characters. The glint first crosses from
 * `glint.from` to `glint.to` seconds, and again every `glint.every`.
 */
export function fit(text: string, max = Infinity) {
  const glyphs = shapes(drawable(text));
  const s = span(glyphs, 2) <= max ? 2 : 1;
  const cols = Math.max(0, span(glyphs, s)), rows = 6;
  return { cols, rows, frame: draw(glyphs, s, cols, rows, 0, 0), glint: { from: FIRST, to: FIRST + SWEEP, every: PERIOD } };
}

// The letters at s columns a pixel from column x0 and row y0, on a frame of cols by rows.
function draw(glyphs: string[][], s: number, cols: number, rows: number, x0: number, y0: number): Frame {
  const ink = new Uint8Array(cols * rows);
  let x = x0;
  for (const g of glyphs) {
    g.forEach((line, y) => {
      for (let i = 0; i < line.length; i++)
        if (line[i] === "#") for (let k = 0; k < s; k++) if (x + i * s + k < cols) ink[(y0 + y) * cols + x + i * s + k] = 1;
    });
    x += g[0].length * s + 2;
  }
  const at = (c: number, r: number) => (c >= 0 && c < cols && r >= 0 && r < rows ? ink[r * cols + c] : 0);

  // The shadow is the letters' outline moved half a cell right and down, so
  // each empty cell draws the outline edges that meet at its top left corner.
  const grid: (string | null)[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (at(c, r)) {
        grid.push(null);
        continue;
      }
      const a = at(c - 1, r - 1), b = at(c, r - 1), d = at(c - 1, r);
      const edges = (a !== b ? U : 0) | (d ? D : 0) | (a !== d ? L : 0) | (b ? R : 0);
      // Where two letters touch only at that corner, the shadow turns down and right.
      grid.push(JOIN[edges === 15 ? D | R : edges]);
    }
  }

  const left = x0 - 2, right = x0 + span(glyphs, s) + 9;
  return (t, { paper = false } = {}) => {
    // The glint crosses at an even pace, then rests out of sight. Frame 0 is at rest.
    const u = (((t - FIRST) % PERIOD) + PERIOD) % PERIOD / SWEEP;
    const p = u < 1 ? left + (right - left) * u : -99;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const g = grid[r * cols + c];
        if (g !== null) {
          line += g;
          continue;
        }
        const d = Math.abs(c + 1.2 * r - p);
        // Ink is a dense shade on a dark page so the glint can be brighter, and solid on paper.
        if (paper) line += d < 1.2 ? "▒" : d < 2.4 ? "▓" : "█";
        else line += d < 2.4 ? "█" : "▓";
      }
      lines.push(line);
    }
    return lines.join("\n");
  };
}
