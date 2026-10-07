/*
 * julia: the Julia logo, three dots, green, red and purple, with a glint
 * crossing it every few seconds.
 *
 * Drawn from devicon's julia-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from julia-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface JuliaOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "julia",
  category: "logos",
  note: "three dots, green, red and purple, glinting now and then",
  cols: 60,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#eeeeee", "#cb3c33", "#389826", "#9558b2", "#f4f4f4", "#dd807a",
    "#7ebc72", "#ba92cd", "#fafafa", "#efc5c2", "#c3e0be", "#dfcde8",
    "#eeeeee", "#cb3c33", "#389826", "#9558b2", "#f4f4f4", "#dd807a",
    "#7ebc72", "#ba92cd", "#fafafa", "#efc5c2", "#c3e0be", "#dfcde8",
  ],
} satisfies Meta<JuliaOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                       __pp888888qq_,
                     _p88888888888888q_
                   _p888888888888888888q,
                  )8888888888888888888888(
                 .888888888888888888888888,
                 q888888888888888888888888p
                 d888888888888888888888888b
                 d888888888888888888888888P
                 '888888888888888888888888'
                  "8888888888888888888888"
                   'Y888888888888888888P'
                     'Y88888888888888P'
                        '"YP8888PP"'
         __pppqqqqq_,                  __ppppqqqq__
      _p8888888888888q_,            ._p8888888888888q_
    _p888888888888888888p          q888888888888888888q,
   q888888888888888888888q,      .p888888888888888888888p
  \88888888888888888888888p      q88888888888888888888888,
  d888888888888888888888888,    |888888888888888888888888b
  8888888888888888888888888P    |8888888888888888888888888
  8888888888888888888888888|    |8888888888888888888888888
  )888888888888888888888888      888888888888888888888888(
   Y8888888888888888888888"      "8888888888888888888888P
    "8888888888888888888P'        '88888888888888888888"
      "888888888888888P"            "8888888888888888"
        '"Y8888888PP"                  "Y88888888P"'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                       __pp888888qq__
                    .pp88888888888888q_,
                   _88888888888888888888_
                  q8888888888888888888888p
                 q888888888888888888888888p
                 88888888888888888888888888
                :88888888888888888888888888.
                 88888888888888888888888888
                 d888888888888888888888888P
                  88888888888888888888888P
                   Y88888888888888888888P
                    'Y8888888888888888P'
             ____      "Y888888888PP"      ___,
        _pp88888888qq_,     ''''     ._pp88888888qq_
     _p8888888888888888q,          _p8888888888888888q,
    q88888888888888888888q,      .p88888888888888888888_
   q8888888888888888888888q,    .p8888888888888888888888p
  q888888888888888888888888p    q888888888888888888888888p
  88888888888888888888888888,  .88888888888888888888888888
  88888888888888888888888888|  |88888888888888888888888888
  88888888888888888888888888'  '88888888888888888888888888
  "888888888888888888888888P    O888888888888888888888888"
   )8888888888888888888888P      88888888888888888888888P
    "88888888888888888888"        "88888888888888888888"
      "8888888888888888"'          '"8888888888888888"
        '"Y88888888P"'                '"Y88888888P"'

`;
const INK = String.raw`

                       00000000000000
                    00002222222222220000
                   0002222222222222222000
                  002222222222222222222200
                 00222222222222222222222200
                 00222222222222222222222200
                0022222222222222222222222200
                 02222222222222222222222200
                 00222222222222222222222200
                  002222222222222222222200
                   0022222222222222222200
                    00002222222222220000
             0000      00000000000000      0000
        000000000000000     0000     000000000000000
     00001111111111110000          00003333333333330000
    00011111111111111111000      00033333333333333333000
   0011111111111111111111000    0003333333333333333333300
  00111111111111111111111100    00333333333333333333333300
  001111111111111111111111100  003333333333333333333333300
  011111111111111111111111100  003333333333333333333333300
  001111111111111111111111100  003333333333333333333333300
  00111111111111111111111100    00333333333333333333333300
   001111111111111111111100      003333333333333333333300
    0001111111111111111100        0033333333333333333000
      0001111111111110000          0000333333333333000
        00000000000000                00000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function julia({ shine = meta.options.shine }: Partial<JuliaOptions> = {}): Frame {
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
