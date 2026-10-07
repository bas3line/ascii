/*
 * r: the R logo, a blue R over a grey ring, with a glint crossing it every few
 * seconds.
 *
 * Drawn from devicon's r-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from r-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ROptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "r",
  category: "logos",
  note: "a blue r over a grey ring, glinting now and then",
  cols: 69,
  rows: 27,
  fps: 30,
  options: { shine: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#b0b2b6", "#2066b9", "#97989e", "#cccdd0", "#6e9cd2", "#bbbcc0",
    "#e7e8e9", "#bcd1ea", "#e0e0e2", "#b0b2b6", "#2066b9", "#97989e",
    "#cccdd0", "#6e9cd2", "#bbbcc0", "#e7e8e9", "#bcd1ea", "#e0e0e2",
  ],
} satisfies Meta<ROptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                     ___ppppq88888888888qqqqq__,
                __pp88888888888888888888888888888qq__
            __p888888888888888888888888888888888888888q_,
         _pp888888888888888888888888888888888888888888888qq,
       _p8888888888888888888888PP""""""""""""""YP88888888888q,
     _p888888888888888888P"'                        '"Y8888888q,
    _8888888888888888P"     .________________________,  '"888888,
   )88888888888888P"        |88888888888888888888888888qq_ "88888(
  _88888888888888"          |88888888888888888888888888888q, )8888,
  d8888888888888'           |8888888888888888888888888888888, O888b
  8888888888888'            |88888888888888888888888888888888 '8888
  8888888888888             |88888888888         Y88888888888. 8888
  d888888888888,            |88888888888         |88888888888  888P
  '888888888888p            |88888888888________p88888888888P )888'
   '888888888888q,          |888888888888888888888888888888P _888'
    '8888888888888p,        |8888888888888888888888888888P" _88P'
      "8888888888888q_      |888888888888888888888888P"" ._888"
        "88888888888888qq_, |888888888888888888888888qq_Y888"
          'Y8888888888888888|88888888888    "88888888888q/'
             '"8888888888888|88888888888|8888(888888888888,
                 '""88888888|88888888888|88888p888888888888_
                       ''"""|88888888888""""''  O88888888888p
                            |88888888888         Y88888888888p
                            |88888888888          )88888888888q,
                            |88888888888           )888888888888,

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                     ___ppppq88888888888qqqqq__,
                __pp88888888888888888888888888888qq__
            __p888888888888888888888888888888888888888q_,
         _pp888888888888888888888888888888888888888888888qq,
       _p8888888888888888888888PP""""""""""""""YP88888888888q,
     _p888888888888888888P"'                        '"Y8888888q,
    _8888888888888888P"     .________________________,  '"888888,
   )88888888888888P"        |88888888888888888888888888qq_ "88888(
  _88888888888888"          |88888888888888888888888888888q, )8888,
  d8888888888888'           |8888888888888888888888888888888, O888b
  8888888888888'            |88888888888888888888888888888888 '8888
  8888888888888             |88888888888         Y88888888888. 8888
  d888888888888,            |88888888888         |88888888888  888P
  '888888888888p            |88888888888________p88888888888P )888'
   '888888888888q,          |888888888888888888888888888888P _888'
    '8888888888888_,        |8888888888888888888888888888P" _88P'
      "8888888888888q_      |888888888888888888888888P"" ._888"
        "88888888888888qq_  |8888888888888888888888888qpp888"
          'Y8888888888888888q88888888888    "888888888888P'
             '"8888888888888888888888888888888888888888888,
                 '""888888888888888888888888888888888888888_
                       ''"""Y88888888888P"""''  O88888888888p
                            |88888888888         Y88888888888p
                            |88888888888          )88888888888q,
                            |88888888888           )888888888888,

`;
const INK = String.raw`

                     000000000000000000000000000
                0000000000000000000000000000000000000
            000000000000000000000000000000000000000000000
         000000000000000000000000000000000000000000000000000
       0000000000000000000000000000000000000000000000000000022
     00000000000000000000000                        000002222222
    0000000000000000000     11111111111111111111111111  222222222
   00000000000000000        111111111111111111111111111111 2222222
  0000000000000000          11111111111111111111111111111111 222222
  000000000000000           111111111111111111111111111111111 22222
  00000000000000            111111111111111111111111111111111 22222
  0000000000000             111111111111         1111111111111 2222
  00000000000000            111111111111         111111111111  2222
  00000000000000            111111111111111111111111111111111 22222
   000000000000000          11111111111111111111111111111111 22222
    0000000000000000        1111111111111111111111111111111 22222
      0000000000000000      1111111111111111111111111111 222222
        000000000000002222  111111111111111111111111111122222
          000000000222222222211111111111    111111111111122
             0002222222222222111111111112222221111111111111
                 2222222222221111111111122222221111111111111
                       22222211111111111222222  1111111111111
                            111111111111         1111111111111
                            111111111111          11111111111111
                            111111111111           11111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function r({ shine = meta.options.shine }: Partial<ROptions> = {}): Frame {
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
