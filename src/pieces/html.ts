/*
 * html: the HTML logo, an orange shield with a 5, with a glint crossing it
 * every few seconds.
 *
 * Drawn from devicon's html5-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from html5-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface HtmlOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "html",
  category: "logos",
  note: "the orange shield with a 5, glinting now and then",
  cols: 50,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#e44d26", "#ffffff", "#ebebea", "#f1652a", "#ed8b72", "#ffffff",
    "#f2f2f1", "#f69b75", "#f7cabe", "#ffffff", "#f9f9f9", "#fbd1bf",
    "#e44d26", "#ffffff", "#ebebea", "#f1652a", "#ed8b72", "#ffffff",
    "#f2f2f1", "#f69b75", "#f7cabe", "#ffffff", "#f9f9f9", "#fbd1bf",
  ],
} satisfies Meta<HtmlOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

  8888888888888888888888888888888888888888888888
  d88888888888888888888888888888888888888888888P
  d88888888888888888888888888888888888888888888P
  |88888888888888888888888888888888888888888888|
  '88888888888888888888888888888888888888888888'
   8888888b                            d8888888
   88888888                            88888888
   d8888888,     ______________________8888888P
   |8888888|     88888888888888888888888888888|
   |8888888p     88888888888888888888888888888|
   '8888888b     YPPPPPPPPPPPPPPPPPPPP88888888'
    88888888                          88888888
    88888888                          8888888P
    d8888888q___________________     :8888888P
    |888888888888888888888888888     |8888888|
    |8888888p     88888888888888     q8888888|
     8888888b     d888888888888P     d8888888
     88888888     '"Y8888888P""'     88888888
     d8888888.          '           .8888888P
     d8888888q___                __pp8888888P
     |8888888888888qqq__,.__ppp8888888888888|
     '88888888888888888888888888888888888888'
      88888888888888888888888888888888888888
      "Y8888888888888888888888888888888888P"
           '""Y8888888888888888888PP""'
                  '""Y88888PP""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

  8888888888888888888888888888888888888888888888
  d88888888888888888888888888888888888888888888P
  d88888888888888888888888888888888888888888888P
  |88888888888888888888888888888888888888888888|
  '88888888888888888888888888888888888888888888'
   88888888888888888888888888888888888888888888
   88888888888888888888888888888888888888888888
   d888888888888888888888888888888888888888888P
   |888888888888888888888888888888888888888888|
   |888888888888888888888888888888888888888888|
    888888888888888888888888888888888888888888
    888888888888888888888888888888888888888888
    d8888888888888888888888888888888888888888P
    d8888888888888888888888888888888888888888P
    |8888888888888888888888888888888888888888|
    '8888888888888888888888888888888888888888'
     8888888888888888888888888888888888888888
     8888888888888888888888888888888888888888
     d88888888888888888888888888888888888888P
     |88888888888888888888888888888888888888|
     |88888888888888888888888888888888888888|
     '88888888888888888888888888888888888888'
      88888888888888888888888888888888888888
      "Y888888888888888888888888888888888PP"
           '""Y8888888888888888888PP""'
                  '""Y88888PY""'

`;
const INK = String.raw`

  0000000000000000000000000000000000000000000000
  0000000000000000000000000000000000000000000000
  0000000000000000000000033333333333333333330000
  0000000000000000000000033333333333333333300000
  0000000000000000000000033333333333333333300000
   00000000222222222222221111111111111133330000
   00000000222222222222221111111111111133330000
   00000000222222222222221111111111111133330000
   00000000222222000000003333333333333333330000
   00000000222222000000003333333333333333300000
    000000002222220000000333333333333333330000
    000000002222222222222111111111111133330000
    000000002222222222222111111111111133330000
    000000000000000000000333333311111133330000
    000000000000000000000333333311111133300000
    000000000222220000000333333311111333300000
     0000000022222000000033333331111133330000
     0000000022222222000033331111111133330000
     0000000022222222222211111111111133330000
     0000000002222222222211111111111333330000
     0000000000000000222211113333333333300000
     0000000000000000000033333333333333300000
      00000000000000000003333333333300000000
      00000000000000000003333000000000000000
           0000000000000000000000000000
                  00000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function html({ shine = meta.options.shine }: Partial<HtmlOptions> = {}): Frame {
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
