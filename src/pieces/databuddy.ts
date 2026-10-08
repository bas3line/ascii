/*
 * databuddy: the Databuddy logo, a bunny drawn in a few bold strokes, with a
 * glint crossing it every few seconds.
 *
 * Drawn from Databuddy's own mark, from databuddy.cc: each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it is black, and a light grey on a dark page,
 * where black would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * company.
 */
import type { Frame, Meta } from "../types.ts";

export interface DatabuddyOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "databuddy",
  category: "companies",
  note: "the databuddy bunny, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#000000", "#595959", "#b3b3b3", "#e8ebef", "#f0f2f5", "#f8f9fa",
  ],
} satisfies Meta<DatabuddyOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                _pq8888q_
              _8888P^Y888qqq_
            _p888"     "888888q,
           _888P  _pp      '"888p
           d88P  q8P'         888p
          q88P  q8P    q888q, '888,
          888' |88   .p88888p  d88p
         .888  q8|   q8888888  q88P
         '888  d8   .8888888P  d88|
        _p888, '8   |8888888"  888'
      _p8888P'      |888888P  q88P
    _8888"          |888888' _8888888qqq__
   q888"   _pppqq_   88888P _888PPYYY888888q,
  \888"  _p88888888, |88888pP"         '"8888p
  d88|   d8888  .888q88888"  ___pqqq__    "888q,
  888'  .88888qp8888888888qpp8888888888q,   O88p
  888,   8888888888888888888888888888888p    888
  )88b,  '8888888888888888888888888888888    888qqq_,
   Y88q,   '"88888P""88888888888888888888   .88888888,
    "888q_        _p88888888888888888888'   p8P"  "888
      "8888qqqqpp888888888888888888888"   .p8"     888
        "Y888888888888888888888888P"'    _88P     p88(
            "888888888888888PP""'     ._p8888___p888P
            .888P""'''          .__ppq888888888888P"
             8888qqqqqqqqppppq888888888P"''""""""
              "88888888888888888PP"""

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                _pq8888q_
              _8888P^Y888qqq_
            _p888"     "888888q,
           _888P  _pp      '"888p
           d88P  q8P'         888p
          q88P  q8P    q888q, '888,
          888' |88   .p88888p  d88p
         .888  q8|   q8888888  q88P
         '888  d8   .8888888P  d88|
        _p888, '8   |8888888"  888'
      _p8888P'      |888888P  q88P
    _8888"          |888888' _8888888qqq__
   q888"   _pppqq_   88888P _888PPYYY888888q,
  \888"  _p88888888, |88888pP"         '"8888p
  d88|   d8888  .888q88888"  ___pqqq__    "888q,
  888'  .88888qp8888888888qpp8888888888q,   O88p
  888,   8888888888888888888888888888888p    888
  )88b,  '8888888888888888888888888888888    888qqq_,
   Y88q,   '"88888P""88888888888888888888   .88888888,
    "888q_        _p88888888888888888888'   p8P"  "888
      "8888qqqqpp888888888888888888888"   .p8"     888
        "Y888888888888888888888888P"'    _88P     p88(
            "888888888888888PP""'     ._p8888___p888P
            .888P""'''          .__ppq888888888888P"
             8888qqqqqqqqppppq888888888P"''""""""
              "88888888888888888PP"""

`;
const INK = String.raw`

                000000000
              000000000000000
            000000     000000000
           00000  000      000000
           0000  0000         0000
          0000  000    000000 00000
          0000 000   00000000  0000
         0000  000   00000000  0000
         0000  00   000000000  0000
        000000 00   000000000  0000
      00000000      00000000  0000
    000000          00000000 0000000000000
   00000   0000000   000000 00000000000000000
  00000  00000000000 000000000         0000000
  0000   00000  00000000000  000000000    000000
  0000  000000000000000000000000000000000   0000
  0000   00000000000000000000000000000000    000
  00000  00000000000000000000000000000000    00000000
   00000   000000000000000000000000000000   0000000000
    000000        00000000000000000000000   0000  0000
      000000000000000000000000000000000   0000     000
        00000000000000000000000000000    0000     0000
            000000000000000000000     000000000000000
            0000000000          00000000000000000000
             000000000000000000000000000000000000
              00000000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function databuddy({ shine = meta.options.shine }: Partial<DatabuddyOptions> = {}): Frame {
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
