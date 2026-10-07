/*
 * dart: the Dart logo, the dart, in blue and teal, with a glint crossing it
 * every few seconds.
 *
 * Drawn from devicon's dart-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from dart-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface DartOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "dart",
  category: "logos",
  note: "the dart, in blue and teal, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#00c4b3", "#0075c9", "#00a8e1", "#22d3c5", "#59d9ce", "#59a5dc",
    "#59c6ec", "#6fe2d9", "#b3ede8", "#b3d6ef", "#b3e5f6", "#bdf2ee",
    "#00c4b3", "#0075c9", "#00a8e1", "#22d3c5", "#59d9ce", "#59a5dc",
    "#59c6ec", "#6fe2d9", "#b3ede8", "#b3d6ef", "#b3e5f6", "#bdf2ee",
  ],
} satisfies Meta<DartOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                          __p88q_
                       _pp88888888_
                    _pp8888888888888p,
                 _pp888888888888888888p
              _pp8888888888888888888888,
              ._________________________ _,
           q|q_"888888888888888888888888,Y8q_,
         _p8|d88_"8888888888888888888888b 8888q,
        _888|d8888_"888888888888888888888p"88888q,
       q8888|d888888_"88888888888888888888,)888888q,
     .p88888|d88888888_"8888888888888888888,88888888q,
    _8888888|d8888888888_"88888888888888888p'88888888b
   q88888888|d888888888888_"8888888888888888("8888888b
  q888888888|d88888888888888_"888888888888888,O888888b
  )888888888|d8888888888888888_"8888888888888p'888888b
   "88888888|d888888888888888888_"888888888888p"88888b
     "888888|d88888888888888888888_"88888888888,Y8888b
       "8888|d8888888888888888888888_"888888888b 8888b
         "Y8()888888888888888888888888_"88888888p"888b
             )q__"Y888888888888888888888_"888888"q888b
              )888qq__""O88888888888888888_"888"\8888b
               "88888888qq__"Y88888888888888_""_88P""'
                 "888888888888qq__"Y8888888P"_,
                   "888888888888888qqq_"__pp8P
                     "88888888888888888888888'
                       "88888888888888888888P

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                          __p88q_
                       _pp88888888_
                    _pp8888888888888p,
                 _pp888888888888888888p
              _pp8888888888888888888888,
            _p88888888888888888888888888__,
           q8888888888888888888888888888888q_,
         _p88888888888888888888888888888888888q,
        _888888888888888888888888888888888888888q,
       q888888888888888888888888888888888888888888q,
     .p888888888888888888888888888888888888888888888q,
    _888888888888888888888888888888888888888888888888b
   q8888888888888888888888888888888888888888888888888b
  q88888888888888888888888888888888888888888888888888b
  )88888888888888888888888888888888888888888888888888b
   "8888888888888888888888888888888888888888888888888b
     "88888888888888888888888888888888888888888888888b
       "888888888888888888888888888888888888888888888b
         "Y888888888888888888888888888888888888888888b
             "888888888888888888888888888888888888888b
              )88888888888888888888888888888888888888b
               "8888888888888888888888888888888888P""'
                 "8888888888888888888888888888(
                   "8888888888888888888888888P
                     "88888888888888888888888'
                       "88888888888888888888P

`;
const INK = String.raw`

                          0000000
                       000000000000
                    000000000000000000
                 0000000000000000000000
              00000000000000000000000000
            1011111111111111111111111111222
           11001111111111111111111111111122222
         111100001111111111111111111111112222222
        111110000001111111111111111111111122222222
       111111000000001111111111111111111111222222222
     1111111100000000001111111111111111111112222222222
    11111111100000000000011111111111111111112222222222
   111111111100000000000000111111111111111111222222222
  1111111111100000000000000001111111111111111122222222
  1111111111100000000000000000011111111111111122222222
   111111111100000000000000000000111111111111112222222
     1111111100000000000000000000001111111111111222222
       11111100000000000000000000000011111111111222222
         111100000000000000000000000000111111111122222
             33300000000000000000000000001111111122222
              3333333300000000000000000000011111222222
               333333333333300000000000000000112222222
                 333333333333333300000000000033
                   333333333333333333330033333
                     3333333333333333333333333
                       3333333333333333333333

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function dart({ shine = meta.options.shine }: Partial<DartOptions> = {}): Frame {
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
