/*
 * collabute: the Collabute logo, a disc shading round from white to black,
 * with a white tab at its corner, in a black ring, with a glint crossing it
 * every few seconds.
 *
 * Drawn from Collabute's own logo, collabute.ai/logo.png, in tones: on a light
 * page the logo's dark is the ink, so its white is the page, and on a dark
 * page its light is, so its black is. Where an edge crosses a cell it holds
 * the character whose shape best matches it, and elsewhere the character from
 * a ramp as dense as the tone; on a canvas each is in a grey as deep, 6 of
 * them, and in a <pre> it is the drawing for its page, in one ink. The logo is
 * a trademark of its owner, shown here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface CollabuteOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "collabute",
  category: "companies",
  note: "the disc shading white to black, in a black ring, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // 6 greys for a light page, palest first, then 6 for a dark one, darkest first; each as drawn, then twice lighter for the glint.
  palette: [
    "#d5d5d5", "#aaaaaa", "#808080", "#555555", "#2a2a2a", "#000000",
    "#e4e4e4", "#c8c8c8", "#acacac", "#919191", "#757575", "#595959",
    "#f2f2f2", "#e6e6e6", "#d9d9d9", "#cccccc", "#bfbfbf", "#b3b3b3",
    "#2b2b2b", "#555555", "#808080", "#aaaaaa", "#d5d5d5", "#ffffff",
    "#757575", "#919191", "#acacac", "#c8c8c8", "#e4e4e4", "#ffffff",
    "#bfbfbf", "#cccccc", "#d9d9d9", "#e6e6e6", "#f2f2f2", "#ffffff",
  ],
} satisfies Meta<CollabuteOptions>;

// For a light page, its dark as the ink, and for a dark page, its light; with each, the grey of each cell, an index into
// that page's greys.
const LIGHT = String.raw`

                  __qppp80088008qqqp__
              __p8888888888888888888888q_,
           __p0888888888888888888888888880q_,
         _q8888888888888888888888888888888888p,
       .q08888888888888888PPPPPPPPPPPPPPPPPPP80p,
      _8888888888808P"'                      d888_
     q08888888888"'..                        d8880p
    q8888888888"......                       d88888p
   |888888888P:-.......                      d888888|
  .888888888P:-----.....                     q8888888,
  q88888888P:::::----....                   _08888888p
  888888880+:::::::::---..                 _8888888888
  088888888::::::::::::::-.             __p00888888880
  088888888++++++++++++++++qqqqqqqqqqpq888888888888880
  888888888++++++++++===***oo0000000000000888888888888
  |88888888p+++======****oooo000000000000000088888888P
  '888888888======******oooooo00000000000000888888888'
   "888888888*=********ooooooo0000000000000888888888"
    Y888888888p*******ooooooooo00000000000888888888P
     Y0888888888p***ooooooooooo0000000000888888880P
      "88888888888poooooooooooo000000008888888888"
       'Y0888888888808ooooooooo0000088888888880P'
         'Y8888888888888888888888888888888888P'
           '"808888888888888888888888888808"'
              '"88888888888888888888888P"'
                  '""Y88880000888PP""'

`;
const LIGHT_INK = String.raw`

                  55555555555555555555
              5555555555555555555555555555
           5555555555555555555555555555555555
         55555555555555555555555555555555555555
       555555555555555555544444444444444444445555
      55555555555555432                      45555
     5555555555554211                        455555
    555555555553211111                       4555555
   55555555554222211111                      45555555
  5555555555422222221111                     555555555
  55555555552222222222111                   2555555555
  555555555333322222222211                 35555555555
  5555555553333333333322221             23555555555555
  5555555553333333333333333344444444445555555555555555
  5555555553333333333334444555555555555555555555555555
  5555555554333333344444444555555555555555555555555555
  5555555555434444444444444555555555555555555555555555
   55555555554444444444444555555555555555555555555555
    555555555544444444444455555555555555555555555555
     5555555555544444444455555555555555555555555555
      55555555555554444445555555555555555555555555
       555555555555555555555555555555555555555555
         55555555555555555555555555555555555555
           5555555555555555555555555555555555
              5555555555555555555555555555
                  55555555555555555555

`;
const DARK = String.raw`





                       ._____________________,
                   _qq80088888888888888888888|
                _q800000008888888888888888888|
              _q00000000008888888888888888888|
             )o000000000008888888888888888888|
            qo0000000000000888888888888888888|
           |ooooo000000000088888888888888888P
           oooooooooo0000008888888888888888P'
          |oooooooooooooo0008888888888888P"
          |ooooooooooooooooY"""""""""""'
          'oooooooo******=+::...
           |***********==++::-......
           '********===+++:::--.........
            '*****====++++::::--..........
             '|=====+++++::::::--.........
               "|==++++++::::::---......
                 '"+++++:::::::----...
                    .'-::::::::-..





`;
const DARK_INK = String.raw`





                       12333333333333333333332
                   244555555555555555555555553
                245555555555555555555555555553
              24555555555555555555555555555553
             355555555555555555555555555555553
            3555555555555555555555555555555553
           3555555555555555555555555555555555
           4555555555555555555555555555555542
          255555555555555555555555555555542
          244444444444444444333333333322
          2444444444444444332211
           4444444444444333322211111
           24444444444333333222221111111
            244444443333333322222211111111
             13444433333333322222222111111
               2333333333333222222222111
                 123333333332222222211
                    12223332222221





`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0*+="; // what the glint turns to slashes; thin edges and faint tones keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function collabute({ shine = meta.options.shine }: Partial<CollabuteOptions> = {}): Frame {
  const { cols, rows } = meta;
  const light = lines(LIGHT), lightInk = lines(LIGHT_INK), dark = lines(DARK), darkInk = lines(DARK_INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the ink of the drawing for the page, edge to edge, rather than the whole frame.
  const reach = (pic: string[]) => {
    let lo = Infinity, hi = -Infinity;
    pic.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
    });
    return { lo, span: hi - lo + 2 * HALF };
  };
  const onLight = reach(light), onDark = reach(dark);

  return (t, { paper = false, color } = {}) => {
    const pic = paper ? light : dark, ink = paper ? lightInk : darkInk;
    const { lo, span } = paper ? onLight : onDark;
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
