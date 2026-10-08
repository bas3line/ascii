/*
 * coderabbit: the CodeRabbit logo, a rabbit cut out of an orange disc, with a
 * glint crossing it every few seconds.
 *
 * Drawn from Simple Icons' coderabbit.svg (CC0): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colour, lifted on a dark page where
 * it would sink into it; in a <pre> it is one ink, from the same drawing. The
 * logo is a trademark of its owner, shown here to name the company.
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
  note: "the rabbit in its orange disc, glinting now and then",
  cols: 64,
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

                     .__pppq88888888qqqq__,
                 __p888888888888888888888888q_,
              _pp888888888P88888888888888888888qq_
            _p888888888888,   ""888888888888888888q_
          _888888888888888p       "888888888888888888_
        _888888888888888888p        "88888888888888888q_
       p88888888888888888888q,        O88888888888888888p
     .p88888888888888888888888q_       O88888888888888888q,
    .p88888888888888q,        ""8q_     888888888888888888q,
    p88888888888888888_           "O_   /Y""""""Y8888888888p
   q8888888888888888888q_           '\             "Y8888888p
  .88888888888888888888888q_,                         "888888,
  q88888888888888888888888888qq__,                      "8888|
  d888888888888888888888888888888888p                    |888b
  888888888888888888P""'       '""Y88,                   q888b
  8888888888888888"                                     _8888b
  d8888888888888P                                     .p88888P
  |888888888888"                                    _p8888888|
   88888888888"                                 __p8888888888
   "8888888P""                               _pp888888888888"
    O88888     ,                           q888888888888888P
     O8888,  _P                          .p888888888888888P
      Y8888q_8                  :q,      q888888888888888P
       "888888                    Oq,    )88888888888888"
        'Y8888p                    88p,   '"8888888888P
           ""88q                  )8888q,    88888P""

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                     .__pppq88888888qqqq__,
                 __p888888888888888888888888q_,
              _pp888888888P88888888888888888888qq_
            _p888888888888,   ""888888888888888888q_
          _888888888888888p       "888888888888888888_
        _888888888888888888p        "88888888888888888q_
       p88888888888888888888q,        O88888888888888888p
     .p88888888888888888888888q_       O88888888888888888q,
    .p88888888888888q,        ""8q_     888888888888888888q,
    p88888888888888888_           "O_   /Y""""""Y8888888888p
   q8888888888888888888q_           '\             "Y8888888p
  .88888888888888888888888q_,                         "888888,
  q88888888888888888888888888qq__,                      "8888|
  d888888888888888888888888888888888p                    |888b
  888888888888888888P""'       '""Y88,                   q888b
  8888888888888888"                                     _8888b
  d8888888888888P                                     .p88888P
  |888888888888"                                    _p8888888|
   88888888888"                                 __p8888888888
   "8888888P""                               _pp888888888888"
    O88888     ,                           q888888888888888P
     O8888,  _P                          .p888888888888888P
      Y8888q_8                  :q,      q888888888888888P
       "888888                    Oq,    )88888888888888"
        'Y8888p                    88p,   '"8888888888P
           ""88q                  )8888q,    88888P""

`;
const INK = String.raw`

                     0000000000000000000000
                 000000000000000000000000000000
              000000000000000000000000000000000000
            000000000000000   0000000000000000000000
          00000000000000000       00000000000000000000
        00000000000000000000        00000000000000000000
       00000000000000000000000        0000000000000000000
     000000000000000000000000000       00000000000000000000
    000000000000000000        00000     00000000000000000000
    0000000000000000000           000   00000000000000000000
   0000000000000000000000           00             0000000000
  000000000000000000000000000                         00000000
  00000000000000000000000000000000                      000000
  00000000000000000000000000000000000                    00000
  0000000000000000000000       0000000                   00000
  00000000000000000                                     000000
  000000000000000                                     00000000
  00000000000000                                    0000000000
   000000000000                                 0000000000000
   00000000000                               0000000000000000
    000000     0                           00000000000000000
     000000  00                          000000000000000000
      00000000                  000      00000000000000000
       0000000                    000    0000000000000000
        0000000                    0000   0000000000000
           00000                  0000000    00000000

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
