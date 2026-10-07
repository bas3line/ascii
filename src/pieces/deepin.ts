/*
 * deepin: the deepin logo, a swirl in a ring, with a scan line running down it
 * every few seconds that scrambles what it passes.
 *
 * Drawn from Simple Icons' deepin.svg (CC0): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from the same drawing.
 * The logo is a trademark of its owner, shown here to name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface DeepinOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "deepin",
  category: "distros",
  note: "the swirl in a blue ring, scanned now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#007cff", "#59aaff", "#b3d8ff", "#007cff", "#59aaff", "#b3d8ff",
  ],
} satisfies Meta<DeepinOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  .__ppq88888888qqqq__
              __p8888888888888888888888q__
           ._p88888888888888888P'   '"Y888qq,
         _p888")8888888888888P          '"888q_
       _p88P"  d88888888888P'           ._pp888q,
      _888"    88888888888"         __pq888888888_
     q88P      8888888888"      _pp888888888888888p
    q88"       888888888'    _p88PP""""""YY88888888p
   q88"        d8888888"   _88" )88" q,       '""888p
  .88P         d888888P  _p8P" q88P _8'q          888,
  q88'         '888888' .P"' _888" .dP dp         "88p
  888           Y88888. |qpp888P' .p8" d8,         888
  88b            O8888| "8888P"  _p8P  88p         d88
  88b             Y8888,  '    _p88P  \88b         d88
  888q_            "8888qq___pp888"  .d88P         888
  d88888q_,          '"88888888P"   _p888"        .88P
  '88888888qq_,           '''     _p8888P         q88'
   "888888888888qq__,         __pp88888P         q88"
    Y8888888888888888888qqqq8888888888P         )88P
     )888888888888888888888888888888P"         q88P
      "888888888888888888888888888P'         _p88"
       'Y8888888888888888888888P"          _p88P'
         'Y88888888888888P^"'           _pp88P'
           '"8888q__                __pp888"'
              '"88888qqqq______pppp8888P"'
                  '""Y88888888888PP""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  .__ppq88888888qqqq__
              __p8888888888888888888888q__
           ._p88888888888888888P'   '"Y888qq,
         _p888")8888888888888P          '"888q_
       _p88P"  d88888888888P'           ._pp888q,
      _888"    88888888888"         __pq888888888_
     q88P      8888888888"      _pp888888888888888p
    q88"       888888888'    _p88PP""""""YY88888888p
   q88"        d8888888"   _88" )88" q,       '""888p
  .88P         d888888P  _p8P" q88P _8'q          888,
  q88'         '888888' .P"' _888" .dP dp         "88p
  888           Y88888. |qpp888P' .p8" d8,         888
  88b            O8888| "8888P"  _p8P  88p         d88
  88b             Y8888,  '    _p88P  \88b         d88
  888q_            "8888qq___pp888"  .d88P         888
  d88888q_,          '"88888888P"   _p888"        .88P
  '88888888qq_,           '''     _p8888P         q88'
   "888888888888qq__,         __pp88888P         q88"
    Y8888888888888888888qqqq8888888888P         )88P
     )888888888888888888888888888888P"         q88P
      "888888888888888888888888888P'         _p88"
       'Y8888888888888888888888P"          _p88P'
         'Y88888888888888P^"'           _pp88P'
           '"8888q__                __pp888"'
              '"88888qqqq______pppp8888P"'
                  '""Y88888888888PP""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000   000000000
         000000000000000000000          0000000
       000000  00000000000000           000000000
      00000    000000000000         00000000000000
     0000      00000000000      0000000000000000000
    0000       0000000000    00000000000000000000000
   0000        000000000   0000 0000 00       0000000
  0000         00000000  00000 0000 0000          0000
  0000         00000000 0000 00000 000 00         0000
  000           0000000 000000000 0000 000         000
  000            000000 0000000  0000  000         000
  000             000000  0    00000  0000         000
  00000            0000000000000000  00000         000
  000000000          000000000000   000000        0000
  0000000000000           000     0000000         0000
   000000000000000000         0000000000         0000
    00000000000000000000000000000000000         0000
     000000000000000000000000000000000         0000
      000000000000000000000000000000         00000
       00000000000000000000000000          000000
         00000000000000000000           0000000
           000000000                000000000
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

export default function deepin({ scan = meta.options.scan }: Partial<DeepinOptions> = {}): Frame {
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
