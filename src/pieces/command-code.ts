/*
 * command code: the Command Code logo, its wordmark, command in ink and code
 * in grey, with a glint crossing it every few seconds.
 *
 * Drawn from Command Code's own wordmark, from commandcode.ai/brand, in
 * quadrant blocks: each cell is split into four quarters, each one inked where
 * the logo covers most of it, and holds the block character with those
 * quarters, so the blocky letters keep their own square shapes and the slits
 * between them stay open. On a canvas it is in the wordmark's own two inks,
 * black and grey, and in light ones on a dark page, where black would sink
 * into it; in a <pre> it is one ink, from the same drawing. On a canvas the
 * glint is a lighter band of the same blocks; in a <pre>, with no colour to
 * show it, it shades the solid blocks it crosses. The logo is a trademark of
 * its owner, shown here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface CommandCodeOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "command code",
  category: "companies",
  note: "the command code wordmark, glinting now and then",
  cols: 78,
  rows: 10,
  fps: 30,
  options: { shine: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#000000", "#c1c1c1", "#595959", "#d7d7d7", "#b3b3b3", "#ececec",
    "#e8ebef", "#aeb4bc", "#f0f2f5", "#caced3", "#f8f9fa", "#e7e9eb",
  ],
} satisfies Meta<CommandCodeOptions>;

// The same drawing in a <pre> and on a canvas.
const ART = String.raw`

  █████▌█████▌▐███████▌▐████████▐█████ ██████   ███ ▐█████▐█████   ███▐█████
  ██▛██▌█▛▀██▌▐█▛▜█▛▜█▌▐██▜██▜██▐██▜██ ██▀▜██ ▄▄███ ▐██▜██▐█▀▜██▗▄▄███▐██▜██
  ██▌██▌█▌ ██▌▐█▌▐█▌▐█▌▐██▐██▐██▐██▐██ ██ ▐██▐█████ ▐██▐██▐█ ▐██▐█████▐██▐██
  ██▌   █▌ ██▌▐█▌▐█▌▐█▌▐██▐██▐██▐█████ ██ ▐██▐██▝██ ▐██   ▐█ ▐██▐██▐██▐██▟██
  ██▌   █▌ ██▌▐█▌▐█▌▐█▌▐██▐██▐██▐█████ ██ ▐██▐██ ██ ▐██   ▐█ ▐██▐██▐██▐█████
  ██▌██▌█▌ ██▌▐█▌▐█▌▐█▌▐██▐██▐██▐█████ ██ ▐██▐██ ██ ▐██▐██▐█ ▐██▐██▐██▐██▌
  ██▙██▌█▙▄██▌▐█▌▐█▌▐█▌▐██▐██▐██▐██▜██ ██ ▐██▐██▟██ ▐██▟██▐█▄▟██▐██▟██▐██▙▄▄
  █████▌█████▌▐█▌▐█▌▐█▌▐██▐██▐██▐██▐██ ██ ▐██▐█████ ▐█████▐█████▐█████▐█████

`;

// The colour of each cell on a canvas: an index into the logo's colours.
const INK = String.raw`

  000000000000000000000000000000000000 000000   000 111111111111   111111111
  000000000000000000000000000000000000 000000 00000 111111111111111111111111
  00000000 000000000000000000000000000 00 000000000 11111111 111111111111111
  000   00 000000000000000000000000000 00 000000000 111   11 111111111111111
  000   00 000000000000000000000000000 00 000000 00 111   11 111111111111111
  00000000 000000000000000000000000000 00 000000 00 11111111 1111111111111
  000000000000000000000000000000000000 00 000000000 111111111111111111111111
  000000000000000000000000000000000000 00 000000000 111111111111111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "█"; // what the glint shades in a <pre>; the part blocks at the edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function commandCode({ shine = meta.options.shine }: Partial<CommandCodeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the logo's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  art.forEach((line, y) => {
    for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
  });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = art[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && ch === SOLID && !color) ch = "▓";
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
