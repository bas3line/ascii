/*
 * elixir: the Elixir logo, a purple drop, with a glint crossing it every few
 * seconds.
 *
 * Drawn from devicon's elixir-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ElixirOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "elixir",
  category: "logos",
  note: "the purple drop, glinting now and then",
  cols: 38,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 7 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#9c88ad", "#f4f3f4", "#664a78", "#cec5d7", "#816a92", "#46265c",
    "#afa2b9", "#bfb2ca", "#f8f7f8", "#9c89a7", "#dfd9e5", "#ad9eb8",
    "#877295", "#cbc3d2", "#e1dbe6", "#fcfbfc", "#d1c9d7", "#f0eef3",
    "#d9d2de", "#c8bece", "#e7e3ea", "#9c88ad", "#f4f3f4", "#715285",
    "#cec5d7", "#816a92", "#7d44a4", "#afa2b9", "#bfb2ca", "#f8f7f8",
    "#a38fb0", "#dfd9e5", "#ad9eb8", "#ab85c4", "#cbc3d2", "#e1dbe6",
    "#fcfbfc", "#d4cbda", "#f0eef3", "#d9d2de", "#d8c7e4", "#e7e3ea",
  ],
} satisfies Meta<ElixirOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                 __p|
               _p888p
             _p888888
            q88888888,
          _q888888888p
         _888888888888,
        q88888888888888,
       q8888888888888888_
      q888888888888888888q,
     q888888888888888888888_
    \88888888888888888888888p,
    8888888888888888888888888p,
   q888888888888888888888888888p
  .88888888888888888888888888888q,
  |8888888888888888888888888888888,
  q88888888888888888888888888888888,
  888888888888888888888888888888888p
  d888888888888888888888888888888888
  |88888888888888888888888888888888O
  '88888888888888888888888888888888|
   )888888888888888888888888888888O
    Y8888888888888888888888888888O'
     "88888888888888888888888888P
       "8888888888888888888888P'
         "88888888888888OOOY"
            ""Y88888OYY""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                 __p|
               _p888p
             _p888888
            q88888888,
          _q888888888p
         _888888888888,
        q88888888888888,
       q8888888888888888_
      q888888888888888888q,
     q888888888888888888888_
    \88888888888888888888888p,
    8888888888888888888888888p,
   q888888888888888888888888888p
  .88888888888888888888888888888q,
  |8888888888888888888888888888888,
  q88888888888888888888888888888888,
  888888888888888888888888888888888p
  d888888888888888888888888888888888
  |88888888888888888888888888888888O
  '88888888888888888888888888888888|
   )888888888888888888888888888888O
    Y8888888888888888888888888888O'
     "88888888888888888888888888P
       "8888888888888888888888P'
         "88888888888888OOOY"
            ""Y88888OYY""'

`;
const INK = String.raw`

                 0000
               550000
             55550004
            3555554444
          335555554444
         33555555554400
        0355555555554000
       035555555555225000
      033555555555525550000
     00355555555552555555011
    00035555555552222222222111
    444355522555522222222222211
   44445555525552222222222244222
  44444555555555222244442224442222
  444442555555554444444444444422222
  4444422555555544444444444000222222
  4444422225555524444444444222222222
  4444422222555522200222222222222222
  0422222222255222222222222222222226
  0002222222224222222222222222222666
   00000002224442222222222226666666
    0000000066666644444444443333333
     0000000666666664440440000000
       0000066666666666040000000
         00006166666600333333
            00001106333333

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function elixir({ shine = meta.options.shine }: Partial<ElixirOptions> = {}): Frame {
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
