/*
 * c: the C logo, a C on a hexagon, with a glint crossing it every few seconds.
 *
 * Drawn from devicon's c-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from c-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface COptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "c",
  category: "logos",
  note: "a c on a blue hexagon, glinting now and then",
  cols: 49,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#659ad3", "#ffffff", "#03599c", "#9bbde2", "#ffffff", "#5b93bf",
    "#d1e1f2", "#ffffff", "#b3cde1", "#659ad3", "#ffffff", "#0362ab",
    "#9bbde2", "#ffffff", "#5b99c8", "#d1e1f2", "#ffffff", "#b3d0e6",
  ],
} satisfies Meta<COptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                     _pp8qq_
                 __p888888888q_,
              _pp888888888888888qq_
          ._p88888888888888888888888q_,
       _pp88888888888888888888888888888qq_
   ._p88888888888P"'         '"Y88888888888q_,
  q88888888888"'                 '"88888888888p
  8888888888"          ___          "8888888888
  88888888P       _pp8888888qq_       888888888
  8888888P      _p8888888888888q,  __p888888888
  8888888      q88888888888888888q8888888888888
  888888|     \88888888888888888888888888888888
  888888'     d88888888888888888888888888888888
  888888,     d88888888888888888888888888888888
  888888|     "88888888888888888888888888888888
  888888b      "88888888888888888P8888888888888
  8888888p      '88888888888888P"  '"8888888888
  88888888q,      '"88888888P"'      .p88888888
  8888888888_           '           _8888888888
  O88888888888q_                 _p88888888888P
    "Y88888888888q__,        __pp8888888888P"
       ""88888888888888qqq8888888888888P"'
          '"888888888888888888888888P"
              "Y88888888888888888""
                 '"8888888888P"'
                     "Y888P"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                     _pp8qq_
                 __p888888888q_,
              _pp888888888888888qq_
          ._p88888888888888888888888q_,
       _pp88888888888888888888888888888qq_
    _p8888888888888888888888888888888888888q_,
  q8888888888888888888888888888888888888888888p
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  888888888888888888888888888888888888888888888
  Y8888888888888888888888888888888888888888888P
    "Y8888888888888888888888888888888888888P"
       '"888888888888888888888888888888P"'
           "Y88888888888888888888888P"
              ""88888888888888888""
                 '"8888888888P"'
                     "Y888P"

`;
const INK = String.raw`

                     0000000
                 000000000000000
              000000000000000000000
          00000000000000000000000000000
       00000000000000000000000000000000000
    000000000000001111111111111000000000000000
  000000000000111111111111111111111000000000000
  000000000011111111111111111111111110000000222
  000000000111111111000000000111111111002222222
  000000001111111000000000000000111112222222222
  000000011111110000000000000000022222222222222
  000000111111100000000000000022222222222222222
  000000111111000000000000222222222222222222222
  000000111111000000000222222222222222222222222
  000000111111100000222222222222222222222222222
  000000011111112222222222222222222222222222222
  000000001111111222222222222222111112222222222
  000000022111111111222222222111111111222222222
  000022222211111111111111111111111112222222222
  022222222222111111111111111111111222222222222
    22222222222222111111111111122222222222222
       22222222222222222222222222222222222
           222222222222222222222222222
              222222222222222222222
                 222222222222222
                     2222222

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function c({ shine = meta.options.shine }: Partial<COptions> = {}): Frame {
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
