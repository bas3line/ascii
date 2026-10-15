/*
 * svelte: the Svelte logo, an orange ribbon folded round a white S, with a
 * glint crossing it every few seconds.
 *
 * Drawn from devicon's svelte-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from
 * svelte-plain.svg. The logo is a trademark of its owner, shown here to name
 * the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface SvelteOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "svelte",
  category: "logos",
  note: "the orange ribbon folded round an s, glinting now and then",
  cols: 47,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ff3e00", "#fffffe", "#ff8259", "#fffffe", "#ffc5b3", "#ffffff",
    "#ff3e00", "#fffffe", "#ff8259", "#fffffe", "#ffc5b3", "#ffffff",
  ],
} satisfies Meta<SvelteOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                      __ppq88888qqq_,
                   _p8888888888888888qq,
                _p8888888888888888888888q,
            ._p888888888P""'   '""88888888_
         __p888888888P"            'Y888888p
       _p888888888P"                 "888888,
     _888888888P"         _pp88q,     |88888b
    q8888888P"         _pp888888p      888888
   q888888"         _p888888888888qq_,|888888
  .888888"       _p8888888888888888888888888P
  |88888P      q888888888P""""""Y88888888888
  |88888b      888888P"'          "Y8888888'
  '888888,     '"PP"'               "888888p
   )888888,               __pq_,     '888888,
   _8888888q_          _pp88888b      d88888|
  .88888888888qq____ppq88888888"      d88888|
  q8888888888888888888888888P"       _888888'
  888888" "Y8888888888888P"         q888888P
  888888      d8888888"'         _p8888888P
  888888,     'Y88P"'         _p888888888"
  "888888,                ._p8888888888"
   )888888q,           ._p888888888P"'
    "8888888qq__.  __pp888888888P"
     'Y8888888888888888888888P"
       '"88888888888888888P"
           ""Y8888888PP"'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                      __ppq8888qqqq_,
                   _p8888888888888888q_,
                _p8888888888888888888888q,
            ._p888888888888888888888888888_
         __p8888888888888888888888888888888p
       _p88888888888888888888888888888888888,
     _88888888888888888888888888888888888888b
    q8888888888888888888888888888888888888888
   q88888888888888888888888888888888888888888
  .88888888888888888888888888888888888888888P
  |88888888888888888888888888888888888888888
  |8888888888888888888888888888888888888888'
  '8888888888888888888888888888888888888888p
   )8888888888888888888888888888888888888888,
   _8888888888888888888888888888888888888888|
  .d8888888888888888888888888888888888888888|
  q88888888888888888888888888888888888888888'
  88888888888888888888888888888888888888888P
  8888888888888888888888888888888888888888P
  888888888888888888888888888888888888888"
  "88888888888888888888888888888888888P"
   )8888888888888888888888888888888P"'
    "888888888888888888888888888P"
     'Y8888888888888888888888P"
        "88888888888888888P"
           ""Y8888888PP"'

`;
const INK = String.raw`

                      000000000000000
                   000000000000000000000
                00000000000000000000000000
            0000000000000111111111000000000
         00000000000001111111111111100000000
       00000000000011111111111111111110000000
     0000000000011111111111100001111111000000
    00000000011111111111100000000111111000000
   000000011111111111000000000000000111000000
  0000000111111111000000000000000000000000000
  000000011111110000000000111111000000000000
  000000011111100000001111111111111000000000
  000000011111111001111111111111111110000000
   000000011111111111111111100111111110000000
   000000000111111111111100000001111110000000
  0000000000000111111000000000011111110000000
  0000000000000000000000000001111111110000000
  000000111000000000000000111111111100000000
  00000011111100000000111111111111000000000
  0000001111111000011111111111100000000000
  00000001111111111111111111000000000000
   00000000111111111111110000000000000
    000000000111111111000000000000
     00000000000000000000000000
        00000000000000000000
           00000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function svelte({ shine = meta.options.shine }: Partial<SvelteOptions> = {}): Frame {
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
