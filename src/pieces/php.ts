/*
 * php: the PHP logo, php in an oval, with a glint crossing it every few
 * seconds.
 *
 * Drawn from devicon's php-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from php-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface PhpOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "php",
  category: "logos",
  note: "php in its purple oval, glinting now and then",
  cols: 69,
  rows: 19,
  fps: 30,
  options: { shine: 5 },
  // The logo's 6 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#abafd0", "#000000", "#494d88", "#fefefe", "#777bb3", "#65699d",
    "#c8cbe0", "#595959", "#898bb2", "#fefefe", "#a7a9ce", "#9b9ebf",
    "#e6e7f1", "#b3b3b3", "#c8cadb", "#ffffff", "#d6d7e8", "#d1d2e2",
    "#abafd0", "#000000", "#54589c", "#fefefe", "#777bb3", "#65699d",
    "#c8cbe0", "#595959", "#9092bf", "#fefefe", "#a7a9ce", "#9b9ebf",
    "#e6e7f1", "#b3b3b3", "#cccde1", "#ffffff", "#d6d7e8", "#d1d2e2",
  ],
} satisfies Meta<PhpOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                    ___ppppq8888888888888qqqqq___
              __pp888888888888888888888888888888888qq__
          _pp888888888888888888P"""888888888888888888888qq_
       _p8888888888888888888888'  |8888888888888888888888888q_
     _p88888888888888888888888P   d888888888888888888888888888q_
   .p8888888888|          'Y88|          '88|          "Y8888888q,
  .p88888888888'  |8888q,   d8   q8888p   |8   |8888q,   O8888888q,
  q88888888888P   d88888P   qP   d8888P   dP   d88888P   q88888888p
  888888888888"  .888888"  .8'  |88888"  .8'  .888888'  .8888888888
  d88888888888   )PPPP"'  _pP   q88888   q8   )PPPP"   _p888888888P
   8888888888P        ___p88|   88888P   8|        ___p88888888888
    O88888888'  |8888888888888888888888888'  |888888888888888888P
     "888888P   q888888888888888888888888P   d8888888888888888P"
       'Y8888qqq88888888888888888888888888qqq888888888888888P'
          '"88888888888888888888888888888888888888888888P"'
              '"Y88888888888888888888888888888888888P"'
                    '"""Y888888888888888888PP"""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                    ___ppppq8888888888888qqqqq___
              __pp888888888888888888888888888888888qq__
          _pp8888888888888888888888888888888888888888888qq_
       _p888888888888888888888888888888888888888888888888888q_
     _p8888888888888888888888888888888888888888888888888888888q_
   .p88888888888888888888888888888888888888888888888888888888888q,
  .p8888888888888888888888888888888888888888888888888888888888888q,
  q888888888888888888888888888888888888888888888888888888888888888p
  88888888888888888888888888888888888888888888888888888888888888888
  d888888888888888888888888888888888888888888888888888888888888888P
   888888888888888888888888888888888888888888888888888888888888888
    O88888888888888888888888888888888888888888888888888888888888P
     "88888888888888888888888888888888888888888888888888888888P"
       'Y888888888888888888888888888888888888888888888888888P'
          '"88888888888888888888888888888888888888888888P"'
              '"Y88888888888888888888888888888888888P"'
                    '"""Y888888888888888888PP"""'

`;
const INK = String.raw`

                    00000000000000000004444444555
              00000044444444444444444444444444444522222
          0000444444444444444443111344444444444444444442222
       0000444444444444444444431111444444444444444444444442222
     00044444443444444444444443111134444444434444444444444444222
   400444444444111111111111344111111111111341111111111113444444222
  44444444444431111344431111331111344431111311113444311113444444222
  44444444444431113444443111131113444431113311134444431113444444422
  44444444444411113444431111311113444411113111134444311113444444442
  44444444444311113311111113311134444311113111133111111134444444422
   444444444411111111111134411113444411113111111111111344444444422
    4444444431111344444444444444444444444311113444444444444444422
     44444443111344444444444444444444444431113444444444444444222
       5444434444444444444444444444444444344444444444444442222
          5544444444444444444444444444444444444444444442222
              55555544444444444444444444444444444222222
                    55555555555422222222222222222

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function php({ shine = meta.options.shine }: Partial<PhpOptions> = {}): Frame {
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
