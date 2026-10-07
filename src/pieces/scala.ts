/*
 * scala: the Scala logo, a red spiral stair, with a glint crossing it every
 * few seconds.
 *
 * Drawn from devicon's scala-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from scala-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ScalaOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "scala",
  category: "logos",
  note: "the red spiral stair, glinting now and then",
  cols: 37,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#3a0d09", "#e33524", "#7f625f", "#ed7c71", "#c4b6b5", "#f7c2bd",
    "#b6291c", "#e33524", "#d0746b", "#ed7c71", "#e9bfbb", "#f7c2bd",
  ],
} satisfies Meta<ScalaOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                               __pp
                        ___ppp88888
          ______ppppp88888888888888
  q88888888888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  88888888888888888888888888888888P
  888888888888888888888888888P""'
  88888888888888888PP""""'      ._p
  YYY^""""""''            ___pp8888
              ._____pppq88888888888
  qqqqqqq88888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  88888888888888888888888888888888P
  8888888888888888888888888888P""'
  8888888888888888888PP"""'      __
  888PPPP"""""''           ___pp888
                 _____pppq888888888
  qqqqpppppqq8888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  88888888888888888888888888888PY"
  8888888888888888888888PY""'
  88888888PPP"""""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                               __pp
                        ___ppp88888
          ______ppppp88888888888888
  q88888888888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  88888888888888888888888888888888P
  88888888888888888888888888888888q
  888888888888888888888888888888888
  888888888888888888888888888888888
    '""Y888888888888888888888888888
  qqqqqqq88888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  88888888888888888888888888888888q
  888888888888888888888888888888888
  888888888888888888888888888888888
   '""Y8888888888888888888888888888
  qqqqpppp8888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  888888888888888888888888888888888
  88888888888888888888888888888PY"
  8888888888888888888888PY""'
  88888888PPP"""""'

`;
const INK = String.raw`

                               1111
                        11111111111
          1111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111100000
  111111111111111111100000000000000
  111100000000000000000000000111111
    0000000000000000111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111110000
  111111111111111111111000000000000
  111111100000000000000000000011111
   00000000000000000001111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  111111111111111111111111111111111
  11111111111111111111111111111111
  111111111111111111111111111
  11111111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function scala({ shine = meta.options.shine }: Partial<ScalaOptions> = {}): Frame {
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
