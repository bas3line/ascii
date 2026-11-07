/*
 * gta-vi: the "VI" of Grand Theft Auto VI, in the mark's pink gradient, with a
 * glint crossing it every few seconds.
 *
 * Drawn from Rockstar Games' Grand Theft Auto VI mark: each cell holds the
 * character whose shape best matches the letter's edge through it, and 8 where
 * a letter is solid. The ink digits carry the gradient, pale pink at the top of
 * the letters and deep pink at the bottom. On a canvas it takes those colours,
 * lifted on a dark page where they would sink into it; in a <pre> it is one
 * ink, from the same drawing. Grand Theft Auto is a trademark of its owner,
 * shown here to name the game.
 */
import type { Frame, Meta } from "../types.ts";

export interface GtaViOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the mark still. */
  shine: number;
}

export const meta = {
  name: "gta vi",
  category: "companies",
  note: "the vi of grand theft auto vi, in pink, glinting now and then",
  cols: 70,
  rows: 24,
  fps: 30,
  options: { shine: 5 },
  // The mark's gradient for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ffc4e6", "#ff8cc9", "#ff54ac", "#f01e90",
    "#ffd9ef", "#ffb2de", "#ff8fca", "#ff63b4",
    "#fff0f9", "#ffdcf1", "#ffc4e4", "#ff9ad4",
    "#ffd0ec", "#ff9ad3", "#ff64b8", "#ff2f9e",
    "#ffe0f4", "#ffbce2", "#ff92d0", "#ff5fb4",
    "#fff4fa", "#ffdef1", "#ffc6e5", "#ff9fd8",
  ],
} satisfies Meta<GtaViOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

   8888888888888.                       8888888888888. 8888888888
    888888888888                        888888888888   8888888888
    8888888888888.                     8888888888888.    888888
     888888888888                      888888888888      888888
     8888888888888.                   8888888888888.     888888
      888888888888                   8888888888888       888888
      8888888888888                  8888888888888.      888888
       8888888888888.               8888888888888.       888888
         88888888888                88888888888          888888
          88888888888.             88888888888.          888888
           8888888888              8888888888.           888888
             888888888            888888888              888888
              888888888.         888888888.              888888
               88888888          88888888.               888888
                 8888888.       8888888                  888888
                  888888        888888.                  888888
                   888888.     888888.                   888888
                     88888.   88888                      888888
                      8888    8888.                      888888
                       8888. 8888.                       888888
                         88  88                        8888888888
                          8888.                        8888888888

`;

// On a canvas, and the colour of each cell: an index into the mark's colours.
const ART = String.raw`

   8888888888888.                       8888888888888. 8888888888
    888888888888                        888888888888   8888888888
    8888888888888.                     8888888888888.    888888
     888888888888                      888888888888      888888
     8888888888888.                   8888888888888.     888888
      888888888888                   8888888888888       888888
      8888888888888                  8888888888888.      888888
       8888888888888.               8888888888888.       888888
         88888888888                88888888888          888888
          88888888888.             88888888888.          888888
           8888888888              8888888888.           888888
             888888888            888888888              888888
              888888888.         888888888.              888888
               88888888          88888888.               888888
                 8888888.       8888888                  888888
                  888888        888888.                  888888
                   888888.     888888.                   888888
                     88888.   88888                      888888
                      8888    8888.                      888888
                       8888. 8888.                       888888
                         88  88                        8888888888
                          8888.                        8888888888

`;
const INK = String.raw`

   00000000000000                       00000000000000 0000000000
    000000000000                        000000000000   0000000000
    00000000000000                     00000000000000    000000
     000000000000                      000000000000      000000
     00000000000000                   00000000000000     000000
      000000000000                   0000000000000       000000
      1111111111111                  11111111111111      111111
       11111111111111               11111111111111       111111
         11111111111                11111111111          111111
          111111111111             111111111111          111111
           1111111111              11111111111           111111
             222222222            222222222              222222
              2222222222         2222222222              222222
               22222222          222222222               222222
                 22222222       2222222                  222222
                  222222        2222222                  222222
                   2222222     2222222                   222222
                     333333   33333                      333333
                      3333    33333                      333333
                       33333 33333                       333333
                         33  33                        3333333333
                          33333                        3333333333

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function gtaVi({ shine = meta.options.shine }: Partial<GtaViOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the mark's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
    });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
