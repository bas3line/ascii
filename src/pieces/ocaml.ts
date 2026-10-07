/*
 * ocaml: the OCaml logo, a camel on an orange square, with a glint crossing it
 * every few seconds.
 *
 * Drawn from devicon's ocaml-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from ocaml-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface OcamlOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "ocaml",
  category: "logos",
  note: "the camel on an orange square, glinting now and then",
  cols: 64,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ee760a", "#f4a660", "#fad6b6", "#ee760a", "#f4a660", "#fad6b6",
  ],
} satisfies Meta<OcamlOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

     _pq888888888888888888888888888888888888888888888888qq_
   _88888888888888888888888888888888888888888888888888888888_
  q8888888888888888888888888888888888888888888888888888888888(
  88888888888888888888888888888888888888888888888888888888888b
  888888888888888888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888888888888888888
  888888P""Y8888888P"""Y88888888888888888888888888888888888888
  88888'    "88888P     '8888888888888888888888888888888888888
  8888"      '888P        8888888888888P"""""PPY88888888888888
  888"         "P'        '88888888888P            "8888888888
  8"                       "8888888888|           _ |888888888
                            'Y88888888       _ppq8888888888888
                               '""YY"'      .88888888888888888
                                            p88888888888888888
                                          _p888888888888888888
     .__                               __p88888888888888888888
     q888q___          _,     :qqqqqpq888888888888888888888888
   .p8888888888qqp:  _p88q_   .8888888888888888888888888888888
  _88888888888888'  )888888q,  8888888888888888888888888888888
  88888888888888"  q88888888q  d888888888888888888888888888888
  8888888888888"  q8888888888p  888888888888888888888888888888
  888888888888b  _888888888888,  88888888888888888888888888888
  888888888888( q88888888888888, d8888888888888888888888888888
  888888888888 |8888888888888888,'8888888888888888888888888888
  '""YP888888" """""Y88888888888b "8PP""""""""""''"""^Y8888888

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

     _p88888888888888888888888888888888888888888888888888q_,
   _88888888888888888888888888888888888888888888888888888888_
  q8888888888888888888888888888888888888888888888888888888888p
  888888888888888888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888888888888888888
  888888P""Y8888888P"""Y88888888888888888888888888888888888888
  88888'    "88888P     '8888888888888888888888888888888888888
  8888"      '8888        88888888888888"""""PPY88888888888888
  888"         "P'        '88888888888P            "8888888888
  8"                       "8888888888|           . |888888888
                            'Y88888888       _ppp8888888888888
                               '""YP"'      .88888888888888888
                                            q88888888888888888
                                          _p888888888888888888
     .__                               __p88888888888888888888
     d888q___          _,     .qqqqqpq888888888888888888888888
   .p8888888888qqp:  _p88q_   .8888888888888888888888888888888
  _88888888888888'  _888888q,  8888888888888888888888888888888
  88888888888888"  q88888888q  d888888888888888888888888888888
  8888888888888"  q8888888888p  888888888888888888888888888888
  888888888888b  _888888888888,  88888888888888888888888888888
  888888888888P q8888888888888q, d8888888888888888888888888888
  888888888888 |8888888888888888,'8888888888888888888888888888
  '""Y8888888P "^"""Y88888888888b "8PP"""""""""""""""YP8888888

`;
const INK = String.raw`

     0000000000000000000000000000000000000000000000000000000
   0000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  000000    0000000     00000000000000000000000000000000000000
  00000      00000        000000000000000000000000000000000000
  0000         000        0000000000000            00000000000
  00                       000000000000           0 0000000000
                            0000000000       00000000000000000
                               0000000      000000000000000000
                                            000000000000000000
                                          00000000000000000000
     000                               00000000000000000000000
     00000000          00     00000000000000000000000000000000
   0000000000000000  000000   00000000000000000000000000000000
  0000000000000000  000000000  0000000000000000000000000000000
  000000000000000  0000000000  0000000000000000000000000000000
  00000000000000  000000000000  000000000000000000000000000000
  0000000000000  00000000000000  00000000000000000000000000000
  0000000000000 0000000000000000 00000000000000000000000000000
  000000000000 00000000000000000000000000000000000000000000000
  000000000000 000000000000000000 0000000000000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function ocaml({ shine = meta.options.shine }: Partial<OcamlOptions> = {}): Frame {
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
