/*
 * rust: the Rust logo, an R in a cog, in Ferris orange, with a glint crossing
 * it every few seconds.
 *
 * Drawn from devicon's rust-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from the same drawing.
 * The logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface RustOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "rust",
  category: "logos",
  note: "the r in its cog, in ferris orange, glinting now and then",
  cols: 64,
  rows: 32,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#f74c00", "#fa8b59", "#fdc9b3", "#f74c00", "#fa8b59", "#fdc9b3",
  ],
} satisfies Meta<RustOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                         qq_  _8q,  _p,
                   .pq_,_888qp8888qp888,__pq
               p__ q88888888888P888888888888, _pq
              '888888888888888,  )888888888888888
          \qqqp888888888P""'"88qp88"'""Y888888888qppq,
          "888888888P"        "8P"        "Y888888888'
       pqqp888888P"                          "8888888qqqp
       888888888qq________________________     "88888888P
     .__88888888888888888888888888888888888q_    "888888__
    d8888888888888888888888888888888888888888q,   |88888888P
     Y8888888888888888888888888888888888888888b  .88888888"
  ._pp888   88p  8888888888        '"8888888888  p8|  |888qq_
  "888888qqp88P  8888888888        __888888888" '888qpp88888P'
    "88888P"'    888888888888888888888888888P'    '"Y888888"
  _p888888       88888888888888888888888888_         '888888q_
  "8888888       888888888888888888888888888q,     ___888888P"
    _88888,      8888888888      '"8888888888p     88888888_
  \p888888p......8888888888        '8888888888__._p888888888q,
   "Y888888888888888888888888888p   )888888888888888888888PY"
     q88888888888888888888888888b   '888888888888888888888p
    d888888888888888888888888888P    "888888888888888888888b
      '"888888P""""""""""""""""""      """"""""""8888888"'
       q8888888qpppqqp                    pqqqqp88888888p
       "^^Y888888P""88,                  q88""8888888Y^^"
          |888888_ _d8p                  88(  _888888,
          /8P^"888888888qqq__________ppq888888888"YP8"
              .8888888888888888888888888888888888
               ""' )888888888888888888888888| """
                   '8P"'"888PY8888P8888"'"88
                         "P"  "88"  "8"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                         qq_  _8q,  _p,
                   .pq_,_888qp8888qp888,__pq
               p__ q88888888888P888888888888, _pq
              '888888888888888,  )888888888888888
          \qqqp888888888P""'"88qp88"'""Y888888888qppq,
          "888888888P"        "8P"        "Y888888888'
       pqqp888888P"                          "8888888qqqp
       888888888qq________________________     "88888888P
     .__88888888888888888888888888888888888q_    "888888__
    d8888888888888888888888888888888888888888q,   |88888888P
     Y8888888888888888888888888888888888888888b  .88888888"
  ._pp888   88p  8888888888        '"8888888888  p8|  |888qq_
  "888888qqp88P  8888888888        __888888888" '888qpp88888P'
    "88888P"'    888888888888888888888888888P'    '"Y888888"
  _p888888       88888888888888888888888888_         '888888q_
  "8888888       888888888888888888888888888q,     ___888888P"
    _88888,      8888888888      '"8888888888p     88888888_
  \p888888p......8888888888        '8888888888__._p888888888q,
   "Y888888888888888888888888888p   )888888888888888888888PY"
     q88888888888888888888888888b   '888888888888888888888p
    d888888888888888888888888888P    "888888888888888888888b
      '"888888P""""""""""""""""""      """"""""""8888888"'
       q8888888qpppqqp                    pqqqqp88888888p
       "^^Y888888P""88,                  q88""8888888Y^^"
          |888888_ _d8p                  88(  _888888,
          /8P^"888888888qqq__________ppq888888888"YP8"
              .8888888888888888888888888888888888
               ""' )888888888888888888888888| """
                   '8P"'"888PY8888P8888"'"88
                         "P"  "88"  "8"

`;
const INK = String.raw`

                         000  0000  000
                   0000000000000000000000000
               000 00000000000000000000000000 000
              00000000000000000  0000000000000000
          00000000000000000000000000000000000000000000
          000000000000        0000        000000000000
       000000000000                          000000000000
       00000000000000000000000000000000000     0000000000
     0000000000000000000000000000000000000000    000000000
    0000000000000000000000000000000000000000000   0000000000
     000000000000000000000000000000000000000000  0000000000
  0000000   000  0000000000        000000000000  000  0000000
  0000000000000  0000000000        000000000000 00000000000000
    000000000    00000000000000000000000000000    0000000000
  00000000       000000000000000000000000000         000000000
  00000000       00000000000000000000000000000     00000000000
    0000000      0000000000      0000000000000     000000000
  0000000000000000000000000        000000000000000000000000000
   000000000000000000000000000000   0000000000000000000000000
     0000000000000000000000000000   00000000000000000000000
    00000000000000000000000000000    00000000000000000000000
      000000000000000000000000000      0000000000000000000
       000000000000000                    000000000000000
       0000000000000000                  0000000000000000
          00000000 0000                  000  00000000
          00000000000000000000000000000000000000000000
              00000000000000000000000000000000000
               000 00000000000000000000000000 000
                   0000000000000000000000000
                         000  0000  000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function rust({ shine = meta.options.shine }: Partial<RustOptions> = {}): Frame {
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
