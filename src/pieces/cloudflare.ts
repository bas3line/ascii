/*
 * cloudflare: the Cloudflare logo, an orange cloud, with a glint crossing it
 * every few seconds.
 *
 * Drawn from Simple Icons' cloudflare.svg (CC0): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colour, lifted on a dark page where
 * it would sink into it; in a <pre> it is one ink, from the same drawing. The
 * logo is a trademark of its owner, shown here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface CloudflareOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "cloudflare",
  category: "companies",
  note: "the orange cloud, glinting now and then",
  cols: 79,
  rows: 19,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#f38020", "#f7ac6e", "#fbd9bc", "#f38020", "#f7ac6e", "#fbd9bc",
  ],
} satisfies Meta<CloudflareOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                                  ._ppp8888888qqq_,
                               _pp88888888888888888q_,
                             _p88888888888888888888888q,
                           .p888888888888888888888888888p
                          _888888888888888888888888888888q,
                __ppqqqq__88888888888888888888888888888888q,
              _p8888888888888888888888888888888888888888888p
             q888888888888888888888888888888888888888888888P pqqqq__
            .888888888888888888888888888888888888888888888P q88888888q_,
            :888888888888888888888888888888888888888888888'.888888888888q,
        _pppq8888888888888888888888888888888888888888888P  '88888888888888_
     _p88888888888888888888888888888888888888888888888"'    "88888888888888p
   .p88888888888888888P""""""""""""""""""""""""""""'          '"""""""888888,
  .p8888888888888888888888888888888888888888888qqqqq_      _pppq888888888888b
  q88888888888888888888888888888888888888888888888888p   _p888888888888888888
  8888888888888888888888888888888888888888888888888888 .p88888888888888888888
  888888888888888888888888888888888888888888888888888" d88888888888888888888P

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                                  ._ppp8888888qqq_,
                               _pp88888888888888888q_,
                             _p88888888888888888888888q,
                           .p888888888888888888888888888p
                          _888888888888888888888888888888q,
                __ppqqqq__88888888888888888888888888888888q,
              _p8888888888888888888888888888888888888888888p
             q888888888888888888888888888888888888888888888P pqqqq__
            .888888888888888888888888888888888888888888888P q88888888q_,
            :888888888888888888888888888888888888888888888'.888888888888q,
        _pppq8888888888888888888888888888888888888888888P  '88888888888888_
     _p88888888888888888888888888888888888888888888888"'    "88888888888888p
   .p88888888888888888P""""""""""""""""""""""""""""'          '"""""""888888,
  .p8888888888888888888888888888888888888888888qqqqq_      _pppq888888888888b
  q88888888888888888888888888888888888888888888888888p   _p888888888888888888
  8888888888888888888888888888888888888888888888888888 .p88888888888888888888
  888888888888888888888888888888888888888888888888888" d88888888888888888888P

`;
const INK = String.raw`

                                  00000000000000000
                               00000000000000000000000
                             000000000000000000000000000
                           000000000000000000000000000000
                          000000000000000000000000000000000
                00000000000000000000000000000000000000000000
              0000000000000000000000000000000000000000000000
             00000000000000000000000000000000000000000000000 0000000
            00000000000000000000000000000000000000000000000 000000000000
            00000000000000000000000000000000000000000000000000000000000000
        0000000000000000000000000000000000000000000000000  0000000000000000
     000000000000000000000000000000000000000000000000000    0000000000000000
   0000000000000000000000000000000000000000000000000          000000000000000
  000000000000000000000000000000000000000000000000000      000000000000000000
  0000000000000000000000000000000000000000000000000000   00000000000000000000
  0000000000000000000000000000000000000000000000000000 0000000000000000000000
  0000000000000000000000000000000000000000000000000000 0000000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function cloudflare({ shine = meta.options.shine }: Partial<CloudflareOptions> = {}): Frame {
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
