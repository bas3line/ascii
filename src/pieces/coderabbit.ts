/*
 * coderabbit: the CodeRabbit logo, a sitting rabbit with two leaf-shaped ears,
 * cut out of an orange disc, with a glint crossing it every few seconds.
 *
 * Drawn from CodeRabbit's own mark, from coderabbit.ai/press-kit: each cell
 * holds the character whose shape best matches the logo's edge through it, and
 * 8 where the logo is solid. On a canvas it takes the logo's colour, lifted on
 * a dark page where it would sink into it; in a <pre> it is one ink, from the
 * same drawing. The logo is a trademark of its owner, shown here to name the
 * company.
 */
import type { Frame, Meta } from "../types.ts";

export interface CoderabbitOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "coderabbit",
  category: "companies",
  note: "the sitting rabbit in its orange disc, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ff570a", "#ff9260", "#ffcdb6", "#ff570a", "#ff9260", "#ffcdb6",
  ],
} satisfies Meta<CoderabbitOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  __pppq88888888qqqq__
              __p8888888888888888888888q_,
           _pp8888888888888888888888888888qq,
         _p888888888888PP88888888888888888888q,
       _p88888888888888p   ""888888888888888888q,
      _88888888888888888(     "888888888888888888_
     q8888888888888888888q_     888888888888888888p
    q888888888888888"'''"""Oq,  '888888888888888888p
   q8888888888888888q_       "\, """"""Y888888888888p
  .8888888888888888888q_,      '         '"8888888888,
  q8888888888888888888888qq___              "88888888p
  8888888888888888888PP^"^Y888b              d88888888
  8888888888888888"'          ''            _888888888
  88888888888888P                         _p8888888888
  8888888888888P                       _pp888888888888
  d8888888888""                     _p888888888888888P
  '888888888(  ,                  _p88888888888888888'
   )888888888qq|            ~,    d88888888888888888(
    Y8888888888,             )q,  Y8888888888888888P
     Y8888888888_            q88_,  |8888888888888P
      "888888888888888888888888888888888888888888"
       'Y88888888888888888888888888888888888888P'
         'Y8888888888888888888888888888888888P'
           '"888888888888888888888888888888"'
              '"88888888888888888888888P"'
                  '""Y888888888888P""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __pppq88888888qqqq__
              __p8888888888888888888888q_,
           _pp8888888888888888888888888888qq,
         _p888888888888PP88888888888888888888q,
       _p88888888888888p   ""888888888888888888q,
      _88888888888888888(     "888888888888888888_
     q8888888888888888888q_     888888888888888888p
    q888888888888888"'''"""Oq,  '888888888888888888p
   q8888888888888888q_       "\, """"""Y888888888888p
  .8888888888888888888q_,      '         '"8888888888,
  q8888888888888888888888qq___              "88888888p
  8888888888888888888PP^"^Y888b              d88888888
  8888888888888888"'          ''            _888888888
  88888888888888P                         _p8888888888
  8888888888888P                       _pp888888888888
  d8888888888""                     _p888888888888888P
  '888888888(  ,                  _p88888888888888888'
   )888888888qq|            ~,    d88888888888888888(
    Y8888888888,             )q,  Y8888888888888888P
     Y8888888888_            q88_,  |8888888888888P
      "888888888888888888888888888888888888888888"
       'Y88888888888888888888888888888888888888P'
         'Y8888888888888888888888888888888888P'
           '"888888888888888888888888888888"'
              '"88888888888888888888888P"'
                  '""Y888888888888P""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000000000000000
         00000000000000000000000000000000000000
       00000000000000000   0000000000000000000000
      0000000000000000000     00000000000000000000
     0000000000000000000000     0000000000000000000
    00000000000000000000000000  00000000000000000000
   0000000000000000000       000 00000000000000000000
  00000000000000000000000      0         0000000000000
  0000000000000000000000000000              0000000000
  00000000000000000000000000000              000000000
  000000000000000000          00            0000000000
  000000000000000                         000000000000
  00000000000000                       000000000000000
  0000000000000                     000000000000000000
  00000000000  0                  00000000000000000000
   0000000000000            00    0000000000000000000
    000000000000             000  000000000000000000
     000000000000            00000  000000000000000
      00000000000000000000000000000000000000000000
       000000000000000000000000000000000000000000
         00000000000000000000000000000000000000
           0000000000000000000000000000000000
              0000000000000000000000000000
                  00000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function coderabbit({ shine = meta.options.shine }: Partial<CoderabbitOptions> = {}): Frame {
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
