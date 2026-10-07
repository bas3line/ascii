/*
 * java: the Java logo, a steaming cup, with a glint crossing it every few
 * seconds.
 *
 * Drawn from devicon's java-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from java-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface JavaOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "java",
  category: "logos",
  note: "the steaming cup, glinting now and then",
  cols: 42,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#ef2e2f", "#0077c1", "#f57778", "#59a7d7", "#fac0c1", "#b3d6ec",
    "#ef2e2f", "#0077c1", "#f57778", "#59a7d7", "#fac0c1", "#b3d6ec",
  ],
} satisfies Meta<JavaOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                          \
                          dp
                         .8P
                        _p8
                      _p8P'
                    _p88"    __-
                 _p88P"  __pP"
               _p88P'  _p8"'
              \888"  _p8P
              d88'   d88,
              "88,   888q,
               "8p   '8888,
                 Yq,   Y888
                  'Y(   d8"
        .__p=^'        )P'       ^""Oqq,
      q888__________________pp='     "88
       '""""^YYYYYYY^"""""''         q8P
          _p/              _       _p8"
          "888qqqqqqqppq88888=  _)P""
              '""""""""''
           .pq____,..______,
        _,  "88888888888888P"
  ._pd^"''       ''''''             _p
  8888qq_______,......_________ppod^"  _
     '"""""^YYPPPPPPPPPPY^""""' ___pp0"'
         '^^==ooooooooooood00OPP"""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                          \
                          dp
                         .8P
                        _p8
                      _p8P'
                    _p88"    __-
                 _p88P"  __pP"
               _p88P'  _p8"'
              \888"  _p8P
              d88'   d88,
              "88,   888q,
               "8p   '8888,
                 Yq,   Y888
                  'Y(   d8"
        .__p=^'        )P'       ^""Oqq,
      q888__________________pp='     "88
       '""""^YYYYYYY^"""""''         q8P
          _p/              _       _p8"
          "888qqqqqqqppq88888=  _)P""
              '""""""""''
           .pq____,..______,
        _,  "88888888888888P"
  ._pd^"''       ''''''             _p
  8888qq_______,......_________ppod^"  _
     '"""""^YYPPPPPPPPPPY^""""' ___pp0"'
         '^^==ooooooooooood00OPP"""'

`;
const INK = String.raw`

                          0
                          00
                         000
                        000
                      00000
                    00000    000
                 000000  00000
               000000  00000
              00000  0000
              0000   0000
              0000   00000
               000   000000
                 000   0000
                  000   000
        1111111        000       1111111
      11111111111111111111111111     111
       111111111111111111111         111
          111              1       1111
          11111111111111111111  11111
              11111111111
           11111111111111111
        11  11111111111111111
  11111111       111111             11
  11111111111111111111111111111111111  1
     11111111111111111111111111 11111111
         111111111111111111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function java({ shine = meta.options.shine }: Partial<JavaOptions> = {}): Frame {
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
