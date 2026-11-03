/*
 * helixdb: the HelixDB logo, two posts joined by a crossbar, stepped rungs
 * stacked above and below it like a helix seen side on, with a glint crossing
 * it every few seconds.
 *
 * Drawn from HelixDB's own mark, from the navbar of helix-db.com: each cell
 * holds the character whose shape best matches the logo's edge through it, and
 * 8 where the logo is solid. On a canvas it is in its cream on a dark page, as
 * on the site, and in its favicon's near-black on a light one; in a <pre> it is
 * one ink, from the same drawing. The logo is a trademark of its owner, shown
 * here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface HelixdbOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "helixdb",
  category: "companies",
  note: "the stepped rungs of a helix between two posts, glinting now and then",
  cols: 64,
  rows: 32,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#1e1715", "#6d6867", "#bcb9b9", "#ebd9af", "#f2e6cb", "#f9f4e7",
  ],
} satisfies Meta<HelixdbOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

  888888888888888888888888                          |888888888
  888888888PPPPPP"                                  |888888888
  888888888|                                        |888888888
  888888888888888888888888888888'                   |888888888
  888888888PPPPPPPPPPPP\                            |888888888
  888888888|                                        |888888888
  8888888888qqqqqqqqqqqqqqqqqqqqqqqqqqqqp           |888888888
  888888888888888888888888888888|                   |888888888
  888888888|                                        |888888888
  888888888qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/  |88888888P
    "888888888888888888888888888888888888""""""""'  |88888P"
       "888|                                        |88P"
          "\________________________________________/"
           d8888888888888888888888888888888888888888b
           d8888888888888888888888888888888888888888b
           d8888888888888888888888888888888888888888b
           d8888888888888888888888888888888888888888b
          _/""""""""""""""""""""""""""""""""""""""""\_
       _p88|                                        |88q_
    _p88888|  .________q8888888888888888888888888888888888q_
  p88888888|  'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP888888888q
  888888888|                                        |888888888
  888888888|                   .qqqqqqqqqqqqqqqqqqqqp888888888
  888888888|           888888888888888888888888888888888888888
  888888888|                                        |888888888
  888888888|                            .qqqqqqqqqqqp888888888
  888888888|                    qqqqqqqq8888888888888888888888
  888888888|                                        |888888888
  888888888|                                  .qqqqqp888888888
  888888888|                          qqqqqqqqq888888888888888

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = MONO;
const INK = String.raw`

  000000000000000000000000                          0000000000
  0000000000000000                                  0000000000
  0000000000                                        0000000000
  0000000000000000000000000000000                   0000000000
  0000000000000000000000                            0000000000
  0000000000                                        0000000000
  000000000000000000000000000000000000000           0000000000
  0000000000000000000000000000000                   0000000000
  0000000000                                        0000000000
  000000000000000000000000000000000000000000000000  0000000000
    0000000000000000000000000000000000000000000000  00000000
       00000                                        00000
          00000000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
          00000000000000000000000000000000000000000000
       00000                                        00000
    00000000  0000000000000000000000000000000000000000000000
  0000000000  000000000000000000000000000000000000000000000000
  0000000000                                        0000000000
  0000000000                   0000000000000000000000000000000
  0000000000           000000000000000000000000000000000000000
  0000000000                                        0000000000
  0000000000                            0000000000000000000000
  0000000000                    000000000000000000000000000000
  0000000000                                        0000000000
  0000000000                                  0000000000000000
  0000000000                          000000000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function helixdb({ shine = meta.options.shine }: Partial<HelixdbOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the logo's ink, edge to edge, rather than the whole frame.
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
