/*
 * elementary os: the elementary OS logo, an e in a ring, with a scan line
 * running down it every few seconds that scrambles what it passes.
 *
 * Drawn from Simple Icons' elementary.svg (CC0): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from the same drawing.
 * The logo is a trademark of its owner, shown here to name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface ElementaryOsOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "elementary os",
  category: "distros",
  note: "the e in a ring, scanned now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#64baff", "#9ad2ff", "#d1eaff", "#64baff", "#9ad2ff", "#d1eaff",
  ],
} satisfies Meta<ElementaryOsOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  __pppq88888888qqqq__
              __p888PP"""''''''"""Y8888q_,
           _pp88P"'      _______     '"Y88qq,
         _p88P"      _pp8PP^^Y888q_      'Y88q,
       _p88"      _p88"'        'Y88_       "88q,
      _88P      _p8P"             "88p        "88_
     q88"      p88"                |88,        "88p
    q8P'     _p88"                  88|         '88p
   q88'     .888"                  .88'          '88p
  .88"      q88"                   q8P            "88,
  q8P      |88P                   q88            .p88p
  88|      d88|                  q8P'           _p8888
  88|      888'                _p8P            _88"|88
  88|      888,              _p8P"           _p88" |88
  88|      )88p            _p88"            q88P   |88
  d8b       888,         _p88"            _88P"    d8P
  '88,      '888_    ._p88P"           _p888"     \88'
   )88,      '888q_pp88P"           ._p88P"      .88(
    Y8q,   ___p888888_,         __pp888P'       .p8P
     Y88q888888P""O88888qqqqpp88888P"'         _88P
      "888"""       '"YP888888P""'            q88"
       'Y88_                                _88P'
         'Y88q_                          _p88P'
           '"888q_,                  __p888"'
              '"8888qq____________pp888P"'
                  '""Y888888888888P""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __pppq88888888qqqq__
              __p888PP"""''''''"""Y8888q_,
           _pp88P"'      _______     '"Y88qq,
         _p88P"      _pp8PP^^Y888q_      'Y88q,
       _p88"      _p88"'        'Y88_       "88q,
      _88P      _p8P"             "88p        "88_
     q88"      p88"                |88,        "88p
    q8P'     _p88"                  88|         '88p
   q88'     .888"                  .88'          '88p
  .88"      q88"                   q8P            "88,
  q8P      |88P                   q88            .p88p
  88|      d88|                  q8P'           _p8888
  88|      888'                _p8P            _88"|88
  88|      888,              _p8P"           _p88" |88
  88|      )88p            _p88"            q88P   |88
  d8b       888,         _p88"            _88P"    d8P
  '88,      '888_    ._p88P"           _p888"     \88'
   )88,      '888q_pp88P"           ._p88P"      .88(
    Y8q,   ___p888888_,         __pp888P'       .p8P
     Y88q888888P""O88888qqqqpp88888P"'         _88P
      "888"""       '"YP888888P""'            q88"
       'Y88_                                _88P'
         'Y88q_                          _p88P'
           '"888q_,                  __p888"'
              '"8888qq____________pp888P"'
                  '""Y888888888888P""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           00000000      0000000     00000000
         000000      00000000000000      000000
       00000      000000        00000       00000
      0000      00000             0000        0000
     0000      0000                0000        0000
    0000     00000                  000         0000
   0000     00000                  0000          0000
  0000      0000                   000            0000
  000      0000                   000            00000
  000      0000                  0000           000000
  000      0000                0000            0000000
  000      0000              00000           00000 000
  000      0000            00000            0000   000
  000       0000         00000            00000    000
  0000      00000    0000000           000000     0000
   0000      000000000000           0000000      0000
    0000   000000000000         000000000       0000
     000000000000000000000000000000000         0000
      0000000       00000000000000            0000
       00000                                00000
         000000                          000000
           00000000                  00000000
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

export default function elementaryOs({ scan = meta.options.scan }: Partial<ElementaryOsOptions> = {}): Frame {
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
