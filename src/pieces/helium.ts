/*
 * helium: the Helium logo, a six-pointed asterisk, with a glint crossing it
 * every few seconds.
 *
 * Drawn from Simple Icons' heliumbrowser.svg (CC0): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colour, lifted on a dark
 * page where it would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * company.
 */
import type { Frame, Meta } from "../types.ts";

export interface HeliumOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "helium",
  category: "companies",
  note: "the six-point asterisk, in blue, glinting now and then",
  cols: 49,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#3450d1", "#7b8de1", "#c2cbf1", "#3854d2", "#7e90e2", "#c3ccf2",
  ],
} satisfies Meta<HeliumOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                      _p8q_
                   _p8888888q,
                   |888888888|
                   '888888888'
                    888888888
    ._pp_,          d8888888P          ._qq_,
  qq888888q_        |8888888|        _p888888qp
  88888888888q_      8888888      _p88888888888
  d888888888888q_,   8888888   ._p888888888888P
  "888888888888888q_ d88888P _p888888888888888"
     '"Y8888888888888p88888q8888888888888P"'
          ""Y88888888888888888888888P""
               ""88888888888888P""
              ._pp8888888888888qq_,
          _pp88888888888888888888888qq_,
     __pp888888888888Y88888P888888888888qq__
  \p88888888888888P" q88888p "Y88888888888888q,
  q888888888888P"    d88888b    "8888888888888p
  d8888888888P'     .8888888.     'Y8888888888b
  Y8888888P"        |8888888|        "O8888888P
     ""P"           q8888888p           "P""
                    888888888
                   .888888888,
                   |888888888|
                   '"8888888"'
                      "Y8P"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                      _p8q_
                   _p8888888q,
                   |888888888|
                   '888888888'
                    888888888
    ._pp_,          d8888888P          ._qq_,
  qq888888q_        |8888888|        _p888888qp
  88888888888q_      8888888      _p88888888888
  d888888888888q_,   8888888   ._p888888888888P
  "888888888888888q_ d88888P _p888888888888888"
     '"Y8888888888888p88888q8888888888888P"'
          ""Y88888888888888888888888P""
               ""88888888888888P""
              ._pp8888888888888qq_,
          _pp88888888888888888888888qq_,
     __pp888888888888Y88888P888888888888qq__
  \p88888888888888P" q88888p "Y88888888888888q,
  q888888888888P"    d88888b    "8888888888888p
  d8888888888P'     .8888888.     'Y8888888888b
  Y8888888P"        |8888888|        "O8888888P
     ""P"           q8888888p           "P""
                    888888888
                   .888888888,
                   |888888888|
                   '"8888888"'
                      "Y8P"

`;
const INK = String.raw`

                      00000
                   00000000000
                   00000000000
                   00000000000
                    000000000
    000000          000000000          000000
  0000000000        000000000        0000000000
  0000000000000      0000000      0000000000000
  0000000000000000   0000000   0000000000000000
  000000000000000000 0000000 000000000000000000
     000000000000000000000000000000000000000
          00000000000000000000000000000
               0000000000000000000
              000000000000000000000
          000000000000000000000000000000
     000000000000000000000000000000000000000
  000000000000000000 0000000 000000000000000000
  000000000000000    0000000    000000000000000
  0000000000000     000000000     0000000000000
  0000000000        000000000        0000000000
     0000           000000000           0000
                    000000000
                   00000000000
                   00000000000
                   00000000000
                      00000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function helium({ shine = meta.options.shine }: Partial<HeliumOptions> = {}): Frame {
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
