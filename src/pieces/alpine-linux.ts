/*
 * alpine linux: the Alpine Linux logo, a mountain in a hexagon, with a scan
 * line running down it every few seconds that scrambles what it passes.
 *
 * Drawn from Simple Icons' alpinelinux.svg (CC0): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface AlpineLinuxOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "alpine linux",
  category: "distros",
  note: "the mountain in a hexagon, scanned now and then",
  cols: 64,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#0d597f", "#6293ac", "#b6cdd9", "#0f6692", "#639cb8", "#b7d1de",
  ],
} satisfies Meta<AlpineLinuxOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                q888888888888888888888888888888p
               p88888888888888888888888888888888q,
             _p8888888888888888888888888888888888q,
            _88888888888888888888888888888888888888,
           _8888888888888888888888888888888888888888,
          )888888888888888888888888888888888888888888(
         q88888888888888888888888888888888888888888888p
        p8888888888888888P'"888888888888888888888888888q
      .p888888888888888P'    "8888888P "8888888888888888q,
     _p88888888888888P'        "888P     "888888888888888q,
    _88888888888888P'     _      "\,       "888888888888888,
   _8888888888888P'     _p88_      "(,_      "88888888888888_
  q888888888888P'     _p888888_      "8q_      "8888888888888p
  "8888888888P'     _pP"88888888_      "8q_      "88888888888"
   "8888888P'     _pP" |8888888888_      "8q_      "88888888"
    "88888q_    _p8q_, |888888888888_    __p88_    __p88888"
     '88888888q88888888888888888888888qq88888888qq88888888'
      '8888888888888888888888888888888888888888888888888P'
        O8888888888888888888888888888888888888888888888P
         )88888888888888888888888888888888888888888888P
          "888888888888888888888888888888888888888888"
           "8888888888888888888888888888888888888888"
            "88888888888888888888888888888888888888"
             '88888888888888888888888888888888888P'
               888888888888888888888888888888888P
                Y888888888888888888888888888888P

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                q888888888888888888888888888888p
               p88888888888888888888888888888888q,
             _p8888888888888888888888888888888888q,
            _88888888888888888888888888888888888888,
           _8888888888888888888888888888888888888888,
          )888888888888888888888888888888888888888888(
         q88888888888888888888888888888888888888888888p
        p8888888888888888P'"888888888888888888888888888q
      .p888888888888888P'    "8888888P "8888888888888888q,
     _p88888888888888P'        "888P     "888888888888888q,
    _88888888888888P'     _      "\,       "888888888888888,
   _8888888888888P'     _p88_      "(,_      "88888888888888_
  q888888888888P'     _p888888_      "8q_      "8888888888888p
  "8888888888P'     _pP"88888888_      "8q_      "88888888888"
   "8888888P'     _pP" |8888888888_      "8q_      "88888888"
    "88888q_    _p8q_, |888888888888_    __p88_    __p88888"
     '88888888q88888888888888888888888qq88888888qq88888888'
      '8888888888888888888888888888888888888888888888888P'
        O8888888888888888888888888888888888888888888888P
         )88888888888888888888888888888888888888888888P
          "888888888888888888888888888888888888888888"
           "8888888888888888888888888888888888888888"
            "88888888888888888888888888888888888888"
             '88888888888888888888888888888888888P'
               888888888888888888888888888888888P
                Y888888888888888888888888888888P

`;
const INK = String.raw`

                00000000000000000000000000000000
               00000000000000000000000000000000000
             00000000000000000000000000000000000000
            0000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
          00000000000000000000000000000000000000000000
         0000000000000000000000000000000000000000000000
        000000000000000000000000000000000000000000000000
      0000000000000000000    000000000 0000000000000000000
     000000000000000000        00000     000000000000000000
    00000000000000000     0      000       00000000000000000
   0000000000000000     00000      0000      0000000000000000
  000000000000000     000000000      0000      000000000000000
  0000000000000     0000000000000      0000      0000000000000
   0000000000     0000 000000000000      0000      0000000000
    00000000    000000 00000000000000    000000    000000000
     000000000000000000000000000000000000000000000000000000
      0000000000000000000000000000000000000000000000000000
        000000000000000000000000000000000000000000000000
         0000000000000000000000000000000000000000000000
          00000000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
            0000000000000000000000000000000000000000
             00000000000000000000000000000000000000
               0000000000000000000000000000000000
                00000000000000000000000000000000

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

export default function alpineLinux({ scan = meta.options.scan }: Partial<AlpineLinuxOptions> = {}): Frame {
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
