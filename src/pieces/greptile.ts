/*
 * greptile: the Greptile logo, a G folded into an open cube, with a glint
 * crossing it every few seconds.
 *
 * Drawn from Greptile's own mark, from greptile.com: each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colour, and a deeper
 * shade of it on a light page, where it would fade into it; in a <pre> it is
 * one ink, from the same drawing. The logo is a trademark of its owner, shown
 * here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface GreptileOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "greptile",
  category: "companies",
  note: "the g folded into a cube, in green, glinting now and then",
  cols: 49,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#11a96f", "#64c7a1", "#b8e5d4", "#28e99f", "#73f1c1", "#bff8e2",
  ],
} satisfies Meta<GreptileOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                       _pq_
                    ._88888q_
                  _p888888888q_
                _p888888888888P'
             ._8888888888888P' _88_,
           _p8888888888888" _p888888q,
         _p888888888888P" _p8888888888q,
      ._8888888888888P"   'O888888888888q_
    _p8888888888888P'       'Y888888888888q_
  \p8888888888888"            'Y888888888888q_
   "8888888888888q,           .p8888888888888P'
  8q,"8888888888888q,       _p8888888888888"'_p
  888q,'Y888888888888q_   _p8888888888888" _p88
  88888q,'Y888888888888qp8888888888888P" _p8888
  8888888q_'"88888888888888888888888"'_p8888888
  888888888q_ "888888888888888888P" _p888888888
  "8888888888q_ "88888888888888P" _p8888888888P
    'Y8888888888_ "8888888888"'.p88888888888"
      'Y8888888888q,"88888P" _p8888888888P"
         "8888888888q,'YP" _p8888888888P"
           "8888888888q, _88888888888P'
             "888888888| 8888888888"
               "8888888| 8888888P"
                 "88888| 88888P'
                   'Y88| 888"
                     'Y| P"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                       _pq_
                    ._88888q_
                  _p888888888q_
                _p888888888888P'
             ._8888888888888P' _88_,
           _p8888888888888" _p888888q,
         _p888888888888P" _p8888888888q,
      ._8888888888888P"   'O888888888888q_
    _p8888888888888P'       'Y888888888888q_
  \p8888888888888"            'Y888888888888q_
   "8888888888888q,           .p8888888888888P'
  8q,"8888888888888q,       _p8888888888888"'_p
  888q,'Y888888888888q_   _p8888888888888" _p88
  88888q,'Y888888888888qp8888888888888P" _p8888
  8888888q_'"88888888888888888888888"'_p8888888
  888888888q_ "888888888888888888P" _p888888888
  "8888888888q_ "88888888888888P" _p8888888888P
    'Y8888888888_ "8888888888"'.p88888888888"
      'Y8888888888q,"88888P" _p8888888888P"
         "8888888888q,'YP" _p8888888888P"
           "8888888888q, _88888888888P'
             "888888888| 8888888888"
               "8888888| 8888888P"
                 "88888| 88888P'
                   'Y88| 888"
                     'Y| P"

`;
const INK = String.raw`

                       0000
                    000000000
                  0000000000000
                0000000000000000
             00000000000000000 00000
           0000000000000000 0000000000
         0000000000000000 00000000000000
      00000000000000000   0000000000000000
    00000000000000000       0000000000000000
  0000000000000000            0000000000000000
   0000000000000000           00000000000000000
  0000000000000000000       0000000000000000000
  000000000000000000000   0000000000000000 0000
  00000000000000000000000000000000000000 000000
  000000000000000000000000000000000000000000000
  00000000000 000000000000000000000 00000000000
  0000000000000 00000000000000000 0000000000000
    0000000000000 000000000000000000000000000
      0000000000000000000000 00000000000000
         00000000000000000 00000000000000
           0000000000000 00000000000000
             00000000000 00000000000
               000000000 000000000
                 0000000 0000000
                   00000 0000
                     000 00

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function greptile({ shine = meta.options.shine }: Partial<GreptileOptions> = {}): Frame {
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
