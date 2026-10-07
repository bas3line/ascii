/*
 * erlang: the Erlang logo, an e between brackets, with a glint crossing it
 * every few seconds.
 *
 * Drawn from devicon's erlang-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from
 * erlang-plain.svg. The logo is a trademark of its owner, shown here to name
 * the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ErlangOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "erlang",
  category: "logos",
  note: "the red e in brackets, glinting now and then",
  cols: 70,
  rows: 23,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ad0534", "#ca5d7b", "#e6b4c2", "#bc0538", "#d35d7e", "#ebb4c3",
  ],
} satisfies Meta<ErlangOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

  88888888"                    .__pqqq_,                   '88888888
  888888P'                   _p888888888q_                  '8888888
  88888P                   _p8888888888888p                   888888
  8888P                   .8888888888888888p                  "88888
  8888'                   d88888888888888888                   d8888
  888(                                                         '8888
  888                                                           8888
  88P                                                           8888
  88|                                                           8888
  88|                    .______________________________________8888
  88|                    |888888888888888888888888888888888888888888
  88|                    '888888888888888888888888888888888888888888
  88p                     888888888888888888888888888888888888888888
  888                     d88888888888888888888888888888888888888888
  888|                    '8888888888888888888888888888PY88888888888
  8888,                    "88888888888888888888888888"    "Y8888888
  8888p                     "88888888888888888888888P          "Y888
  88888p                     "88888888888888888888P'            _888
  888888q                      "888888888888888P"              q8888
  8888888q,                       ""Y88888PP"'               _p88888
  888888888q,                                               p8888888

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

  88888888"                     ___qq__                    '88888888
  888888P'                   _p888888888q_                  '8888888
  88888P                   _p8888888888888p                   888888
  8888P                   .8888888888888888p                  "88888
  8888'                   d88888888888888888                   d8888
  888(                                                         |8888
  888                                                           8888
  88P                                                           8888
  88|                                                           8888
  88|                    .______________________________________8888
  88|                    |888888888888888888888888888888888888888888
  88|                    '888888888888888888888888888888888888888888
  88b                     888888888888888888888888888888888888888888
  888                     d88888888888888888888888888888888888888888
  888|                    '8888888888888888888888888888""88888888888
  8888,                    "88888888888888888888888888"    ""8888888
  8888p                     "88888888888888888888888"          ""888
  88888p                     "88888888888888888888P'            _888
  888888q,                     "888888888888888P"              q8888
  8888888q,                       ""YP8888PP"'               _p88888
  888888888q                                                p8888888

`;
const INK = String.raw`

  000000000                     0000000                    000000000
  00000000                   0000000000000                  00000000
  000000                   0000000000000000                   000000
  00000                   000000000000000000                  000000
  00000                   000000000000000000                   00000
  0000                                                         00000
  000                                                           0000
  000                                                           0000
  000                                                           0000
  000                    0000000000000000000000000000000000000000000
  000                    0000000000000000000000000000000000000000000
  000                    0000000000000000000000000000000000000000000
  000                     000000000000000000000000000000000000000000
  000                     000000000000000000000000000000000000000000
  0000                    000000000000000000000000000000000000000000
  00000                    0000000000000000000000000000    000000000
  00000                     0000000000000000000000000          00000
  000000                     00000000000000000000000            0000
  00000000                     000000000000000000              00000
  000000000                       000000000000               0000000
  0000000000                                                00000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function erlang({ shine = meta.options.shine }: Partial<ErlangOptions> = {}): Frame {
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
