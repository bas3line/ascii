/*
 * python: the Python logo, two snakes, one blue and one yellow, with a glint
 * crossing it every few seconds.
 *
 * Drawn from devicon's python-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from
 * python-plain.svg. The logo is a trademark of its owner, shown here to name
 * the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface PythonOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "python",
  category: "logos",
  note: "two snakes, blue and yellow, glinting now and then",
  cols: 51,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#417fb0", "#ffe05c", "#336d9d", "#84accc", "#ffeb95", "#7aa0bf",
    "#c6d9e7", "#fff6ce", "#c2d3e2", "#417fb0", "#ffe05c", "#336d9d",
    "#84accc", "#ffeb95", "#7aa0bf", "#c6d9e7", "#fff6ce", "#c2d3e2",
  ],
} satisfies Meta<PythonOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`


                __pppqq88888qqqqq_
              _p8888888888888888888p
              d88"  '888888888888888p
              888_, _8888888888888888
              88888888888888888888888
              """""""""""O88888888888
     _ppqq888888888888888888888888888 q8888qq_
   .p88888888888888888888888888888888 d8888888q,
   p888888888888888888888888888888888 d88888888b
  q888888888888888888888888888888888P 8888888888|
  d88888888888888888888888888888888P_p8888888888b
  8888888888888888PPPPPPPPPPPPPPY"_p8888888888888
  8888888888888"_ppqqqqqqqqqqqqq88888888888888888
  88888888888P.p888888888888888888888888888888888
  |8888888888 q888888888888888888888888888888888"
   888888888b 888888888888888888888888888888888P
    Y8888888b 88888888888888888888888888888888P
     '"YPPPPY 88888888888PPPPPPPPPPPPPPPPPPP"'
              88888888888qqqqqqqqqqqp
              88888888888888888888888
              8888888888888888'  "888
              "888888888888888_ .q88"
               "O88888888888888888P"
                  ""Y88888888PP""


`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                _pppq888888888qqq_,
              \88888888888888888888p
              d88'  '888888888888888p
              888q___8888888888888888
              88888888888888888888888
              """""""""""O88888888888
     _pp88888888888888888888888888888 888888qq,
   _p88888888888888888888888888888888 888888888,
  .8888888888888888888888888888888888 888888888b
  q888888888888888888888888888888888P.8888888888|
  888888888888888888888888888888888"_88888888888b
  888888888888888P^""""""""""""""'_p8888888888888
  888888888888P"_pp888888888888888888888888888888
  O8888888888"_p88888888888888888888888888888888P
  "8888888888 d888888888888888888888888888888888"
   O88888888b 888888888888888888888888888888888P
    Y8888888b 88888888888888888888888888888888"
      ""YYYY" 88888888888PYYYYYYYYYYYYYYYYY^"
              888888888888qqqqqqqqqqp
              88888888888888888888888
              8888888888888888   "888
              "888888888888888___p88"
               'Y88888888888888888P'
                  '""YP8888PPY""
                  ..::::|||::::..
                     '''''''''

`;
const INK = String.raw`

                0000000000000000000
              0000000000000000000022
              0000  00000000000022222
              00000000000000002222222
              00000000000000022222222
              00000000000002222222222
     00000000000000000000222222222222 111111111
   0000000000000000000022222222222222 1111111111
  00000000000000000000222222222222222 1111111111
  00000000000000000022222222222222222111111111111
  00000000000000002222222222222222221111111111111
  00000000000000022222222222222222111111111111111
  00000000000000111111111111111111111111111111111
  00000000000011111111111111111111111111111111111
  00000000022 11111111111111111111111111111111111
   0000000222 1111111111111111111111111111111111
    000022222 111111111111111111111111111111111
      0222222 1111111111111111111111111111111
              11111111111111111111111
              11111111111111111111111
              1111111111111111   1111
              11111111111111111111111
               111111111111111111111
                  11111111111111
                  000000000000000
                     000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function python({ shine = meta.options.shine }: Partial<PythonOptions> = {}): Frame {
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
