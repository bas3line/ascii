/*
 * keiki: the Keiki logo, a rocking horse on curled rockers, with a glint
 * crossing it every few seconds.
 *
 * Drawn from Keiki's own logo, onkeiki.com/favicon.png: each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it is black, and a light grey on a dark page,
 * where black would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * company.
 */
import type { Frame, Meta } from "../types.ts";

export interface KeikiOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "keiki",
  category: "companies",
  note: "the rocking horse, glinting now and then",
  cols: 62,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#000000", "#595959", "#b3b3b3", "#e8ebef", "#f0f2f5", "#f8f9fa",
  ],
} satisfies Meta<KeikiOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

          ___8qqpqq___,
          O888888888888p
         \d88888888888888qp
         '"8888888888888888(
           88888888888888888q,
           d88888888888888888q,
          _88888  |888888888888,
          Y88888qqp888888888888q               __pqqq_
           ''    "88888888888888|  _pp8(__,._qp8888888q,
                 _88888888888888888888888888888888888888
                 |8888888888888888888888888888  d8888888qq,
                 |8888888888888888888888888888qq8888888888"
              ._p888888888888888888888888888888888888888('
            _888888888888888888888888888888888''88888888qq_
            O88|  _8888"'  '")888(""8888888888__88888888888,
             Y8qqp88P"       q"'"b  "888888888888|  '888888p
              888888        _8___8,    "888P""888| .p888888"
   .____,     '88888,       '"""""'     d88"   88p '88888P
  q888888q,  .p88888|                 _p8P     |88,  d888q_
  888888888qq88P'                    q88P      q88qqp888888p
  '"8PPP8888888P   __        _p_   _p88|      q888888888888"
         Y888888qqqd88qq____qb dqqp8888p .__pp8888888"''""
          'Y88888888888888888888888888888888888888P"
             "8888888888888888888888888888888888P'
                "Y88888888888888888888888888P"'
                    '""Y88888888888888P"""

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

          ___8qqpqq___,
          O888888888888p
         \d88888888888888qp
         '"8888888888888888(
           88888888888888888q,
           d88888888888888888q,
          _88888  |888888888888,
          Y88888qqp888888888888q               __pqqq_
           ''    "88888888888888|  _pp8(__,._qp8888888q,
                 _88888888888888888888888888888888888888
                 |8888888888888888888888888888  d8888888qq,
                 |8888888888888888888888888888qq8888888888"
              ._p888888888888888888888888888888888888888('
            _888888888888888888888888888888888''88888888qq_
            O88|  _8888"'  '")888(""8888888888__88888888888,
             Y8qqp88P"       q"'"b  "888888888888|  '888888p
              888888        _8___8,    "888P""888| .p888888"
   .____,     '88888,       '"""""'     d88"   88p '88888P
  q888888q,  .p88888|                 _p8P     |88,  d888q_
  888888888qq88P'                    q88P      q88qqp888888p
  '"8PPP8888888P   __        _p_   _p88|      q888888888888"
         Y888888qqqd88qq____qb dqqp8888p .__pp8888888"''""
          'Y88888888888888888888888888888888888888P"
             "8888888888888888888888888888888888P'
                "Y88888888888888888888888888P"'
                    '""Y88888888888888P"""

`;
const INK = String.raw`

          0000000000000
          00000000000000
         000000000000000000
         0000000000000000000
           0000000000000000000
           00000000000000000000
          000000  00000000000000
          0000000000000000000000               0000000
           00    0000000000000000  000000000000000000000
                 000000000000000000000000000000000000000
                 00000000000000000000000000000  00000000000
                 000000000000000000000000000000000000000000
              00000000000000000000000000000000000000000000
            00000000000000000000000000000000000000000000000
            0000  0000000  000000000000000000000000000000000
             000000000       00000  00000000000000  00000000
              000000        0000000    00000000000 000000000
   000000     0000000       0000000     0000   000 0000000
  000000000  00000000                 0000     0000  000000
  000000000000000                    0000      0000000000000
  00000000000000   00        000   00000      00000000000000
         000000000000000000000 000000000 00000000000000000
          000000000000000000000000000000000000000000
             0000000000000000000000000000000000000
                0000000000000000000000000000000
                    0000000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function keiki({ shine = meta.options.shine }: Partial<KeikiOptions> = {}): Frame {
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
