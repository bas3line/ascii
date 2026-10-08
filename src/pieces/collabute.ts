/*
 * collabute: the Collabute logo, a disc shading round from white to black,
 * with a white tab at its corner, in a black disc, with a glint crossing it
 * every few seconds.
 *
 * Drawn from Collabute's own logo, collabute.ai/logo.png: each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from the
 * logo's dark half. The logo is a trademark of its owner, shown here to name
 * the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface CollabuteOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "collabute",
  category: "companies",
  note: "the disc shading white to black, in a black disc, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 8 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#010101", "#fcfcfc", "#858585", "#3d3d3d", "#d6d6d6", "#acacac",
    "#606060", "#1c1c1c", "#5a5a5a", "#fdfdfd", "#b0b0b0", "#818181",
    "#e4e4e4", "#c9c9c9", "#989898", "#6b6b6b", "#b3b3b3", "#fefefe",
    "#dadada", "#c5c5c5", "#f3f3f3", "#e6e6e6", "#cfcfcf", "#bbbbbb",
    "#555555", "#fcfcfc", "#858585", "#545454", "#d6d6d6", "#acacac",
    "#606060", "#545454", "#919191", "#fdfdfd", "#b0b0b0", "#909090",
    "#e4e4e4", "#c9c9c9", "#989898", "#909090", "#cccccc", "#fefefe",
    "#dadada", "#cccccc", "#f3f3f3", "#e6e6e6", "#cfcfcf", "#cccccc",
  ],
} satisfies Meta<CollabuteOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  ___ppp88888888qqq__,
              __p8888888888888888888888q_,
           ._p8888888888888888888888888888q_,
         _p8888888888888888888888888888888888q,
       .p888888888888888888PPPPPPPPPPPPPPPPP888q,
      _8888888888888P"'                      d888_
     q88888888888"'                          d8888p
    q8888888888"                             d88888p
   )888888888P'                              d888888(
  .888888888P                                d8888888,
  q888888888                                _88888888p
  d88888888|                               _888888888b
  888888888.                            __p88888888888
  888888888.              __pqpqqqqqqqp888888888888888
  888888888|           ._p8888888888888888888888888888
  )88888888b         _p888888888888888888888888888888P
  '888888888p     _p888888888888888888888888888888888'
   "888888888q_ _p8888888888888888888888888888888888"
    )8888888888888888888888888888888888888888888888P
     "88888888888888888888888888888888888888888888P
      "888888888888888888888888888888888888888888"
        Y88888888888888888888888888888888888888P
         'Y8888888888888888888888888888888888P'
            "888888888888888888888888888888"
              '"Y8888888888888888888888P"'
                  '""Y88888888888PP""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __pppq88888888qqqq_,
              __p8888888888888888888888q_,
           ._p8888888888888888888888888888q_,
         _p8888888888888888888888888888888888q,
       .p88888888888888888888888888888888888888q,
      _888888888888888888888888888888888888888888_
     q88888888888888888888888888888888888888888888p
    q8888888888888888888888888888888888888888888888p
   )888888888888888888888888888888888888888888888888p
  .88888888888888888888888888888888888888888888888888,
  q88888888888888888888888888888888888888888888888888p
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  d88888888888888888888888888888888888888888888888888P
  '88888888888888888888888888888888888888888888888888'
   "888888888888888888888888888888888888888888888888"
    Y8888888888888888888888888888888888888888888888P
     )88888888888888888888888888888888888888888888P
      "888888888888888888888888888888888888888888"
       'Y88888888888888888888888888888888888888P'
         'Y8888888888888888888888888888888888P'
           '"888888888888888888888888888888"'
              '"88888888888888888888888P"'
                  '""Y88888888888PP""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000000000000000
         00000000000000000000000000000000000000
       000000000000000000000000000000000000000000
      00000000000000011111111111111111111111100000
     0000000000000111111111111111111111111111000000
    000000000004444111111111111111111111111110000000
   00000000000444444111111111111111111111111100000000
  0000000000444444444411111111111111111111111000000000
  0000000000444444444441111111111111111111111000000000
  0000000005555444444444411111111111111111117000000000
  0000000005555555555544444111111111111111000000000000
  0000000005555555555555552670000000000000000000000000
  0000000005555555552222226337770000000000000000000000
  0000000005522222222222666337777777000000000000000000
  0000000000222222222266666333777777777700000000000000
   00000000002222222666666333377777777777700000000000
    000000000022226666666633333777777777770000000000
     0000000000066666666633333337777777700000000000
      00000000000066666663333333777777000000000000
       000000000000000663333333370000000000000000
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

export default function collabute({ shine = meta.options.shine }: Partial<CollabuteOptions> = {}): Frame {
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
