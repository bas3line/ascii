/*
 * linux mint: the Linux Mint logo, lm in a green circle, with a scan line
 * running down it every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's linuxmint-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from Simple
 * Icons' linuxmint.svg (CC0). The logo is a trademark of its owner, shown here
 * to name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface LinuxMintOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "linux mint",
  category: "distros",
  note: "lm in a green circle, scanned now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#fcfcfc", "#69b53f", "#fdfdfd", "#9ecf82", "#fefefe", "#d2e9c5",
    "#fcfcfc", "#69b53f", "#fdfdfd", "#9ecf82", "#fefefe", "#d2e9c5",
  ],
} satisfies Meta<LinuxMintOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  __pppq88888888qqqq_,
              __p8888888888888888888888q_,
           ._p888888PP""''    ''""Y8888888q_,
         _p88888P"'                  '"888888q,
       .p8888P"                          "88888q,
      _8888P"                              "88888_
     q8888"  .qqqp                           "8888p
    q8888'   |8888      ._ppqq_, _ppqq_,      '8888p
   q8888'    |8888    .p8888888888888888q,     '8888p
  .8888"     |8888    q8888""888888Y"88888      "8888,
  q888P      |8888   .8888    8888'   8888|      O888p
  8888|      |8888   .8888    8888.   8888|      |8888
  8888'      |8888   .8888    8888.   8888|      '8888
  8888.      |8888   .8888    8888.   8888|      .8888
  8888,      |8888   .8888    8888.   8888|      |8888
  d888p      |8888   'YYYY    YYYY'   8888|      q888P
  '8888,      8888_                  _8888      \8888'
   )8888,     "8888qqq____________ppp8888"     _8888(
    Y8888,     'Y8888888888888888888888P'     _8888P
     Y8888_       ""YPPPPPPPPPPPPPPP""       _8888P
      "8888q_                              _p8888"
       'Y8888q_                          _p8888P'
         'Y88888q_,                  __p88888P'
           '"8888888qq____.  .____pp8888888"'
              '"88888888888888888888888P"'
                  '""Y888888888888P""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __pppq88888888qqqq__
              __p8888888888888888888888q_,
           _pp8888888888888888888888888888qq,
         _p8888888888888888888888888888888888q,
       _p88888888888888888888888888888888888888q,
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
   )888888888888888888888888888888888888888888888888(
    Y8888888888888888888888888888888888888888888888P
     Y88888888888888888888888888888888888888888888P
      "888888888888888888888888888888888888888888"
       'Y88888888888888888888888888888888888888P'
         'Y8888888888888888888888888888888888P'
           '"888888888888888888888888888888"'
              '"88888888888888888888888P"'
                  '""Y888888888888P""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000011111111111100000000000
         00000000111111111111111111111100000000
       000000011111111111111111111111111110000000
      00000011111111111111111111111111111111000000
     0000011110000111111111111111111111111111100000
    000001111100001111111110011111100111111111100000
   00000111111000011111000000000000000000111111100000
  0000011111110000111100000110000000100000111111100000
  0000011111110000111100001111000011110000111111100000
  0000111111110000111100001111000011110000111111110000
  0000111111110000111100001111000011110000111111110000
  0000111111110000111100001111000011110000111111110000
  0000111111110000111100001111000011110000111111110000
  0000011111110000111100001111000011110000111111100000
  0000011111110000111111111111111111110000111111100000
   00000111111100000011111111111111000000111111100000
    000001111111000000000000000000000000111111100000
     0000011111111110000000000000000111111111100000
      00000011111111111111111111111111111111000000
       000000011111111111111111111111111110000000
         00000000111111111111111111111100000000
           0000000000011111111111100000000000
              0000000000000000000000000000
                  00000000000000000000

`;

const START = 0.5; // seconds before the first scan
const PASS = 2; // seconds a scan takes, top to bottom
const HEAD = 2; // rows the line scrambles
const TRAIL = 5; // rows of afterglow behind it
const NOISE = "#$%&*+<=>?@[]{}"; // what the line scrambles the logo into

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

function hash(x: number, y: number, k: number) {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export default function linuxMint({ scan = meta.options.scan }: Partial<LinuxMintOptions> = {}): Frame {
  const { cols, rows, fps } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = scan > 0 ? Math.max(scan, PASS + 0.5) : 0;
  // The line runs from the logo's first row to past its last, rather than the whole frame.
  let first = rows, last = -1;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      if (line.trim()) (first = Math.min(first, y)), (last = Math.max(last, y));
    });
  const span = last - first + 1 + HEAD + TRAIL;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? first + (span * (since % every)) / PASS : -Infinity;
    const tick = Math.floor((t * fps) / 2); // the noise changes every other frame
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      const d = at - y; // rows since the line reached this one
      const level = d >= 0 && d < HEAD ? 2 : d >= HEAD && d < HEAD + TRAIL ? 1 : 0;
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          if (level === 2) {
            const h = hash(x, y, tick);
            if (h % 4) ch = NOISE[(h >>> 2) % NOISE.length];
          }
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + level * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
