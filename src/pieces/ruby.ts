/*
 * ruby: the Ruby logo, a cut red gem, with a glint crossing it every few
 * seconds.
 *
 * Drawn from devicon's ruby-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from ruby-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface RubyOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "ruby",
  category: "logos",
  note: "the cut red gem, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 7 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#fefbfb", "#960f05", "#e37a63", "#cc2312", "#f0b7a9", "#da4a32",
    "#b31405", "#fefcfc", "#bb635d", "#eda99a", "#de7065", "#f5d0c7",
    "#e7897a", "#ce665d", "#fffefe", "#e0b7b4", "#f7d7d0", "#f0bdb8",
    "#fbe9e5", "#f4c9c2", "#e8b9b4", "#fefbfb", "#bd1306", "#e37a63",
    "#cc2312", "#f0b7a9", "#da4a32", "#bd1505", "#fefcfc", "#d4665d",
    "#eda99a", "#de7065", "#f5d0c7", "#e7897a", "#d4675d", "#fffefe",
    "#ebb8b4", "#f7d7d0", "#f0bdb8", "#fbe9e5", "#f4c9c2", "#ebb9b4",
  ],
} satisfies Meta<RubyOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                                      .___,-.    __,
                             _, 'Y0P^""'___pppp88888,
                         __p8888q- ___,""Y8888888888p
                      _pp8888888P p88888qqq___""Y8888(
                   _p8888888888P p888888888888PY^' ,''
                 _p88888888888P dPP^"""____ppppq888"_p
               _888888888888P'_,~ppq8888888888888P q88
            .p888888888888" _888,O88888888888888".p88b
          _p888888888888"_p88888q 8888888888888"_8888P
         _88888888888P"_p88888888p'8888888888P q88888P
       .p8888888888P"_p88888888888p"88888888".p888888|
      _p88888888P"' ^88888888888888,"888888"_88888888|
      888888P"'_pp'qqq__,"Y888888888,)888P )888888888|
    .q,"Y"'_pp888P 8888888qqq__""8888,O8".p8888888888'
    q88( q8888888"|8888888888888qqq__' "_888888888888
    88P ,"888888P d88888888888888888"'_,O888888888888
   |8P q8,)88888"|88888888888888P"'_p888,Y88888888888
   d8'q88b 8888P d88888888888P" _p8888888_"888888888b
  .8")8888p'888"|888888888P"._p88888888888p"88888888P
  q"_888888p"8P d888888P"__p888888888888888q'8888888P
  ".88888888,""|8888P"__p8888888888888888888q,O88888|
   p888888888, q8P"_pp888888888888888888888888,Y8888|
  d888888PPPPY '_qp8888888888888888888888888888_"888|
    -~~~oqqqqqqqq_____"""YP888888888888888888888p"88'
             '''""""""^YYYOOoooq____"""^YP8888888q'8
                                   ''''""""     '''

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                          __ppq888888888888888qqq_
                     __pp88888888888888888888888888q
                  _p88888888888888888888888888888888q,
                _p88888888888888888888888888888888888p
              _p88888888888888888888888888888888888888
            _88888888888888888888888888888888888888888
         .p8888888888888888888888888888888888888888888
        _88888888888888888888888888888888888888888888P
       q888888888888888888888888888888888888888888888P
      q8888888888888888888888888888888888888888888888|
     q88888888888888888888888888888888888888888888888|
    q888888888888888888888888888888888888888888888888
   p8888888888888888888888888888888888888888888888888
  |88888888888888888888888888888888888888888888888888
  |8888888888888888888888888888888888888888888888888P
  q8888888888888888888888888888888888888888888888888|
  d8888888888888888888888888888888888888888888888888|
  d8888888888888888888888888888888888888888888888888'
  88888888888888888888888888888888888888888888888888
  88888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888P
  8888888888888888888888888888888888888888888888888P
  d888888888888888888888888888888888888888888888888|
   888888888888888888888888888888888888888888888888|
    "888888888888888888888888888888888888888888888P
      "Y8888888888888PPPPY^""""""""''''

`;
const INK = String.raw`

                          000000044425533366611111
                     0006333333333342253366611111111
                  000666666333333333000666661111111111
                00666666666663333333000011111111111111
              0666666666666666633333045555511111111111
            066666666666666666666330553333333111111111
         006666666666666666666666603333333666666111111
        0066666666666666666666666006666666666666661111
       01116666666666666666666660066666666666666666111
      011111166666666666666666600011111111111111111111
     0111111111666666666666660044411111111111111111111
    0111111111111666666666602222222111111111111111111
   03611111111111116666660555555555111111111111111111
  005336111111111111166033333333333311111111111111111
  002553361111111111006666666666666611111111111111111
  444225533611111000666666666666666661111111111111111
  555002255300000001116666666666666661111111111111666
  333000444444444411111111116666666666111111111116666
  33166222222222261111111111111111666611111111111666
  61166655555555511111111111111111111111111111111133
  11166655533333611111111111111111116666661111111133
  11111113333336111111111111111111666666663311111133
  11111111666666111111111111111666666633333333111113
   1111111166661111111111111666666633333333333331115
    11111111116111111111111111111111111111111155551
      111111161111111111111111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function ruby({ shine = meta.options.shine }: Partial<RubyOptions> = {}): Frame {
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
