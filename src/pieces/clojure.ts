/*
 * clojure: the Clojure logo, a lambda in a green and blue circle, with a glint
 * crossing it every few seconds.
 *
 * Drawn from devicon's clojure-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ClojureOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "clojure",
  category: "logos",
  note: "a lambda in a green and blue circle, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 5 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ffffff", "#5881d8", "#91dc48", "#90b4fe", "#63b132", "#ffffff",
    "#92ade6", "#b8e888", "#b7cefe", "#9acc7a", "#ffffff", "#cdd9f3",
    "#def5c8", "#dee9ff", "#d0e8c2", "#ffffff", "#5881d8", "#91dc48",
    "#90b4fe", "#63b132", "#ffffff", "#92ade6", "#b8e888", "#b7cefe",
    "#9acc7a", "#ffffff", "#cdd9f3", "#def5c8", "#dee9ff", "#d0e8c2",
  ],
} satisfies Meta<ClojureOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`


                    ___pppppqqqqq__,
                _pp888888888888888888qq_
             _p88888888888888888888888888q_
           _p888888888888888888888888888888q_
         _dP"""""""Y88888PPPPP888888888888888q_
                      '  .____,  '"Y88888888888p
          __ppppqp      "8888888qq_  "8888888888q,
        _p888888" .p88p  '8888888888q, "888888888p
      _8888888P' _88888q, '88888888888_ '888888888p
     q88888888' )88888888, "88888888888( '888888888,
    \88888888( .888888888b, 888888888888, |88888888|
    q88888888' |888888888P' "88888888888| '88888888p
    d88888888, |88888888P'_, )8888888888| .88888888P
    |88888888p '8888888P _8b  8888888888' |88888888|
     888888888, "88888P .888p '88888888" .88888888P
     )88888888q, "888P  q8888, '888888" .p8888888P
      O888888888_  Y8' :888888,  "88P' _8888888"'
       8888888888q_    |8888888_      '"""""'
        Y88888888888q_,  ''''''  ___,        __
         "88888888888888qqqqqppp88888888888888"
           "88888888888888888888888888888888"
             "Y88888888888888888888888888P"
                ""88888888888888888888""
                    '""^YP8888PP^""'


`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  .__ppq88888888qqq__,
              __p8888888888888888888888q_,
           ._p8888888888888888888888888888q_,
         _p8888888888888888888888888888888888q,
       .p88888888888888888888888888888888888888q,
      _888888888888888888888888888888888888888888_
     q88888888888888888888888888888888888888888888p
    q8888888888888888888888888888888888888888888888p
   q888888888888888888888888888888888888888888888888p
  .88888888888888888888888888888888888888888888888888,
  q88888888888888888888888888888888888888888888888888p
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  d88888888888888888888888888888888888888888888888888P
  '88888888888888888888888888888888888888888888888888'
   "888888888888888888888888888888888888888888888888"
    )8888888888888888888888888888888888888888888888P
     )88888888888888888888888888888888888888888888P
      "888888888888888888888888888888888888888888"
        Y88888888888888888888888888888888888888P
         'Y8888888888888888888888888888888888P'
            "88888888888888888888888888888P"
              '"Y8888888888888888888888P"'
                   ""YP8888888888PP""

`;
const INK = String.raw`

                  00000000000000000000
              0000000000111111110000000000
           0000000111111111111111111110000000
         00000111111111111111111111111111100000
       000001111111111111111111111111111111100000
      00001100000001111111111111111111111111110000
     0000000000000000000000000000001111111111111000
    000000004444400000000333333333000011111111111000
   00000044444440000220000333333333330001111111111000
  0000044444444000222222000333333333330001111111110000
  0000444444440002222222200033333333333000111111111000
  0004444444400022222222220033333333333300011111111000
  0004444444400022222222220003333333333300011111111000
  0004444444400022222222200003333333333300011111111000
  0004444444400022222222002200333333333300011111111000
  0004444444440002222220022200033333333000111111111000
  0000444444444000222200222220003333330001111111100000
   00044444444440002200022222200003330001111111000000
    000444444444440000002222222000000000000000000000
     0004444444444444000000000000000000000000000000
      00004444444444444444444444444444444444440000
        0000444444444444444444444444444444440000
         00000444444444444444444444444444400000
            00000044444444444444444444000000
              0000000000444444440000000000
                   000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function clojure({ shine = meta.options.shine }: Partial<ClojureOptions> = {}): Frame {
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
