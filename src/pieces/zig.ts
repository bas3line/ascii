/*
 * zig: the Zig logo, a slanted Z between brackets, with a glint crossing it
 * every few seconds.
 *
 * Drawn from devicon's zig-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from the same drawing.
 * The logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ZigOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "zig",
  category: "logos",
  note: "the slanted z in brackets, glinting now and then",
  cols: 61,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#fba81e", "#fcc66d", "#fee5bc", "#fba81e", "#fcc66d", "#fee5bc",
  ],
} satisfies Meta<ZigOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                                                     ._pp'
                                                 __pp88"
                                             _pp88888P
                                        __pp8888888P"
  8888888888888888P  _p888888888888888888888888888"  _88888
  88888888888888P' .p888888888888888888888888888P  _p888888
  8888888888888"  _888888888888888888888888888P"  p88888888
  88888888888P  _p888888888888888888888888888"  _8888888888
  88888888|''   '''''''''''''''_p8888888888P   '"""88888888
  88888888|                   q8888888888P'       |88888888
  88888888|                 _p8888888888"         |88888888
  88888888|               _p8888888888P           |88888888
  88888888|              q8888888888P'            |88888888
  88888888|            _p8888888888"              |88888888
  88888888|          _p8888888888P                |88888888
  88888888|         _8888888888P'                 |88888888
  88888888|       _p8888888888"                   |88888888
  88888888q__,  _p88888888888________________   __p88888888
  8888888888"  _888888888888888888888888888P' _p88888888888
  88888888"  _p88888888888888888888888888P" _p8888888888888
  888888P' .p888888888888888888888888888"  q888888888888888
  8888P"  _888888888888888888888888888P  -88888888888888888
        _p8888888P"'
      .p88888P"'
     _888P"
   .d""

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                                                     ._pp'
                                                 __pp88"
                                             _pp88888P
                                        __pp8888888P"
  8888888888888888P  _p888888888888888888888888888"  _88888
  88888888888888P' .p888888888888888888888888888P  _p888888
  8888888888888"  _888888888888888888888888888P"  p88888888
  88888888888P  _p888888888888888888888888888"  _8888888888
  88888888|''   '''''''''''''''_p8888888888P   '"""88888888
  88888888|                   q8888888888P'       |88888888
  88888888|                 _p8888888888"         |88888888
  88888888|               _p8888888888P           |88888888
  88888888|              q8888888888P'            |88888888
  88888888|            _p8888888888"              |88888888
  88888888|          _p8888888888P                |88888888
  88888888|         _8888888888P'                 |88888888
  88888888|       _p8888888888"                   |88888888
  88888888q__,  _p88888888888________________   __p88888888
  8888888888"  _888888888888888888888888888P' _p88888888888
  88888888"  _p88888888888888888888888888P" _p8888888888888
  888888P' .p888888888888888888888888888"  q888888888888888
  8888P"  _888888888888888888888888888P  -88888888888888888
        _p8888888P"'
      .p88888P"'
     _888P"
   .d""

`;
const INK = String.raw`

                                                     00000
                                                 0000000
                                             000000000
                                        0000000000000
  00000000000000000  000000000000000000000000000000  000000
  0000000000000000 000000000000000000000000000000  00000000
  00000000000000  000000000000000000000000000000  000000000
  000000000000  000000000000000000000000000000  00000000000
  00000000000   0000000000000000000000000000   000000000000
  000000000                   0000000000000       000000000
  000000000                 0000000000000         000000000
  000000000               0000000000000           000000000
  000000000              0000000000000            000000000
  000000000            0000000000000              000000000
  000000000          0000000000000                000000000
  000000000         0000000000000                 000000000
  000000000       0000000000000                   000000000
  000000000000  00000000000000000000000000000   00000000000
  00000000000  000000000000000000000000000000 0000000000000
  000000000  000000000000000000000000000000 000000000000000
  00000000 000000000000000000000000000000  0000000000000000
  000000  00000000000000000000000000000  000000000000000000
        000000000000
      0000000000
     000000
   0000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function zig({ shine = meta.options.shine }: Partial<ZigOptions> = {}): Frame {
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
