/*
 * debian: the Debian logo, the swirl, with a scan line running down it every
 * few seconds that scrambles what it passes.
 *
 * Drawn from devicon's debian-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from devicon's
 * debian-plain.svg (MIT). The logo is a trademark of its owner, shown here to
 * name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface DebianOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "debian",
  category: "distros",
  note: "the red swirl, scanned now and then",
  cols: 46,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#a80030", "#c65978", "#e5b3c1", "#c20037", "#d7597d", "#edb3c3",
  ],
} satisfies Meta<DebianOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                 _pppqq____q__
             _pp888888888888888qpqp,
          _p888888888PPPPYP8888888888q,
        _p8888888P"            "Y888888q,
       p888888"                   "888888p
   _  q888P"                        Y88888p
    _p88P"                           )888"O
  ,_888"             ._pp0OOo(,       O888 :
  'd88P             q8"'      ''      "888,
  q88P            .pP                  888,
  |88P            qP             ,     888"
  q88|            8|                  '88P
  |88'            8b           _.     q88'
  d88.            )8p      __        q88'
  |88p           ~,"8q,            _p8Y
  '88b            ""("8q__    __pq8P"
   d88,              "YdPP88888P""'
   '8888p                '"^^'
    "888q
     "888p
      '888p
        "88q,
         'Y88q_
           'Y88q,
              "Y8qq_
                 '"YOo___,

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                 __ppqq____q__
             _pp888888888888888qpqp,
          _p888888888PPPPYP8888888888q,
        _p8888888P"            "Y888888q,
       p888888"                   "888888p
   _  q8888"                        Y88888p
    _p888"                           )888"O
  ,_888"             ._pp0OOo(,       O888 :
  'd88P             q8"'      ''      "888,
  q888            .pP                  888,
  |88P            qP             ,     888"
  |88|            8|                  '88P
  |88'            8b           _.     q88'
  |88,            )8p      __        q88'
  |88p           ~,"8q,            _p8Y
  '88b            ""("8q__    __pq88"
   d88,              "YdPP88888PY"'
   '8888p                '"^^'
    "888q'
     "888p
      '888p
        "88q,
         'Y88q_
           'Y88q,
              "Y8qq_
                 '"YOo___,

`;
const INK = String.raw`

                 0000000000000
             00000000000000000000000
          00000000000000000000000000000
        00000000000            0000000000
       00000000                   00000000
   0  000000                        0000000
    000000                           000000
  000000             0000000000       0000 0
  00000             0000      00      00000
  0000            000                  0000
  0000            00             0     0000
  0000            00                  0000
  0000            00           00     0000
  0000            000      00        0000
  0000           000000            0000
  0000            00000000    0000000
   0000              00000000000000
   000000                00000
    000000
     00000
      00000
        00000
         000000
           000000
              000000
                 000000000

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

export default function debian({ scan = meta.options.scan }: Partial<DebianOptions> = {}): Frame {
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
