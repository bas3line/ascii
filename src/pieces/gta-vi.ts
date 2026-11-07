/*
 * gta-vi: the "VI" of Grand Theft Auto VI, in the mark's pink gradient, with a
 * glint crossing it every few seconds.
 *
 * Drawn from Rockstar Games' Grand Theft Auto VI mark: two strokes tapering to
 * a point and a bar between them, each flaring out like a trumpet at its ends,
 * so the letters are widest where they begin and end. Each cell holds 8 where
 * a stroke is solid and | on the bar's flat sides. The ink digits carry the
 * gradient, pale pink at the top of the letters and deep pink at the bottom,
 * in eight stops. On a canvas it takes those colours, lifted on a dark page
 * where they would sink into it; in a <pre> it is one ink, from the same
 * drawing. Grand Theft Auto is a trademark of its owner, shown here to name
 * the game.
 */
import type { Frame, Meta } from "../types.ts";

export interface GtaViOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the mark still. */
  shine: number;
}

export const meta = {
  name: "gta vi",
  category: "companies",
  note: "the vi of grand theft auto vi, in pink, glinting now and then",
  cols: 72,
  rows: 30,
  fps: 30,
  options: { shine: 5 },
  // The mark's gradient for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ffcbe9", "#ffa8d8", "#ff84c7", "#ff61b6", "#fb46a8", "#f3349d", "#eb2192", "#e30f87",
    "#ffe2f3", "#ffcfea", "#ffbbe0", "#ffa8d7", "#fd99cf", "#f88fc9", "#f485c3", "#f07bbd",
    "#fff0f9", "#ffe7f4", "#ffddef", "#ffd3eb", "#fecbe7", "#fcc6e4", "#f9c1e0", "#f7bcdd",
    "#ffd6ee", "#ffb3de", "#ff90cd", "#ff6dbd", "#fd53b0", "#f940a7", "#f62d9d", "#f21a94",
    "#ffe8f6", "#ffd5ed", "#ffc2e4", "#ffafdb", "#fea0d4", "#fc96cf", "#fa8cc9", "#f881c4",
    "#fff4fa", "#ffeaf6", "#ffe0f1", "#ffd6ed", "#fecfe9", "#fdcae6", "#fcc4e4", "#fbbfe1",
  ],
} satisfies Meta<GtaViOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`


  88888888888                     88888888888    888888888888
   8888888888                      8888888888     8888888888
    888888888                       888888888      8888888888
     88888888                       88888888        88888888
      8888888                       8888888          888888
      8888888                       8888888          |8888|
       888888                       888888           |8888|
        888888                     888888            |8888|
         888888                   888888             |8888|
          888888                 888888              |8888|
           88888                 88888               |8888|
            88888               88888                |8888|
            888888             888888                |8888|
             88888             88888                 |8888|
              88888           88888                  |8888|
               88888         88888                   |8888|
                88888       88888                    |8888|
                 8888       8888                     |8888|
                  8888     8888                      |8888|
                   8888   8888                       |8888|
                    8888 8888                        |8888|
                    8888 8888                        888888
                     8888888                        88888888
                      88888                        8888888888
                       888                         8888888888
                        8                         888888888888


`;

// On a canvas, and the colour of each cell: an index into the mark's colours.
const ART = String.raw`


  88888888888                     88888888888    888888888888
   8888888888                      8888888888     8888888888
    888888888                       888888888      8888888888
     88888888                       88888888        88888888
      8888888                       8888888          888888
      8888888                       8888888          |8888|
       888888                       888888           |8888|
        888888                     888888            |8888|
         888888                   888888             |8888|
          888888                 888888              |8888|
           88888                 88888               |8888|
            88888               88888                |8888|
            888888             888888                |8888|
             88888             88888                 |8888|
              88888           88888                  |8888|
               88888         88888                   |8888|
                88888       88888                    |8888|
                 8888       8888                     |8888|
                  8888     8888                      |8888|
                   8888   8888                       |8888|
                    8888 8888                        |8888|
                    8888 8888                        888888
                     8888888                        88888888
                      88888                        8888888888
                       888                         8888888888
                        8                         888888888888


`;
const INK = String.raw`


  00000000000                     00000000000    000000000000
   0000000000                      0000000000     0000000000
    000000000                       000000000      0000000000
     11111111                       11111111        11111111
      1111111                       1111111          111111
      1111111                       1111111          111111
       222222                       222222           222222
        222222                     222222            222222
         222222                   222222             222222
          222222                 222222              222222
           33333                 33333               333333
            33333               33333                333333
            333333             333333                333333
             44444             44444                 444444
              44444           44444                  444444
               44444         44444                   444444
                55555       55555                    555555
                 5555       5555                     555555
                  5555     5555                      555555
                   6666   6666                       666666
                    6666 6666                        666666
                    6666 6666                        666666
                     6666666                        66666666
                      77777                        7777777777
                       777                         7777777777
                        7                         777777777777

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function gtaVi({ shine = meta.options.shine }: Partial<GtaViOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the mark's ink, edge to edge, rather than the whole frame.
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
