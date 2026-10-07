/*
 * c++: the C++ logo, a C and two plus signs on a hexagon, with a glint
 * crossing it every few seconds.
 *
 * Drawn from devicon's cplusplus-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from
 * cplusplus-plain.svg. The logo is a trademark of its owner, shown here to
 * name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface CppOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "c++",
  category: "logos",
  note: "c++ on a blue hexagon, glinting now and then",
  cols: 50,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#659ad2", "#ffffff", "#004482", "#00599c", "#9bbde2", "#ffffff",
    "#5985ae", "#5993bf", "#d1e1f2", "#ffffff", "#b3c7da", "#b3cde1",
    "#659ad2", "#ffffff", "#005fb5", "#0062ab", "#9bbde2", "#ffffff",
    "#5997cf", "#5999c8", "#d1e1f2", "#ffffff", "#b3cfe9", "#b3d0e6",
  ],
} satisfies Meta<CppOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                     _pp88qq_
                 __p8888888888q_,
              _pp8888888888888888qq_
          __p888888888888888888888888q_,
       _pp888888888888888888888888888888qq_
   ._p88888888888888PP""""""Y888888888888888q_,
  )8888888888888P"'            '"Y8888888888888(
  888888888888"                    "888888888888
  8888888888P                        Y8888888888
  888888888"        __ppqqqq_,     ._p8888888888
  88888888P       _p8888888888q,_pp8888888888888
  88888888       .888888888888888888888888888888
  8888888b       q88888888888888888PY "P8PP" P88
  8888888b       d88888888888888888qp \q8bq, qp8
  88888888,      '8888888888888888888qp8888qq888
  88888888p       '88888888888P''"88888888888888
  888888888(        '"Y8888P"'      "Y8888888888
  8888888888q,                      .p8888888888
  888888888888_,                  ._888888888888
  "8888888888888q_,            __p8888888888888"
    "888888888888888qqq____ppp88888888888888P"
       "Y88888888888888888888888888888888P"
          '"8888888888888888888888888P"'
              "Y888888888888888888P"
                 '"88888888888P"'
                     "Y8888P"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                     _pp88qq_
                 __p8888888888q_,
              _pp8888888888888888qq_
          __p888888888888888888888888q_,
       _pp888888888888888888888888888888qq_
   ._p88888888888888888888888888888888888888q_,
  )88888888888888888888888888888888888888888888(
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888
  "88888888888888888888888888888888888888888888"
    "888888888888888888888888888888888888888P"
       "Y88888888888888888888888888888888P"
          '"8888888888888888888888888P"'
              "Y888888888888888888P"
                 '"88888888888P"'
                     "Y8888P"

`;
const INK = String.raw`

                     00000000
                 0000000000000000
              0000000000000000000000
          000000000000000000000000000000
       000000000000000000000000000000000000
   00000000000000000001111110000000000000000000
  0000000000000001111111111111111000000000000003
  0000000000001111111111111111111111000000003333
  0000000000011111111111111111111111100003333333
  0000000001111111111100000011111111133333333333
  0000000001111111100000000000011133333333333333
  0000000011111111000000000000333333333333333333
  0000000011111110000000000333333333311333311333
  0000000011111110000002222333333333311333311333
  0000000011111111002222222222333333333333333333
  0000000001111111122222222222211133333333333333
  0000000001111111111122222211111111133333333333
  0000000222211111111111111111111111122223333333
  0000222222221111111111111111111111222222223333
  0222222222222221111111111111111222222222222223
    222222222222222222111111222222222222222222
       222222222222222222222222222222222222
          222222222222222222222222222222
              2222222222222222222222
                 2222222222222222
                     22222222

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function cpp({ shine = meta.options.shine }: Partial<CppOptions> = {}): Frame {
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
