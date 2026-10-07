/*
 * fedora: the Fedora logo, an f in a blue speech bubble, with a scan line
 * running down it every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's fedora-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from devicon's
 * fedora-plain.svg (MIT). The logo is a trademark of its owner, shown here to
 * name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface FedoraOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "fedora",
  category: "distros",
  note: "the f in its blue bubble, scanned now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#294172", "#ffffff", "#3c6eb4", "#7484a3", "#ffffff", "#80a1ce",
    "#bfc6d5", "#ffffff", "#c5d4e9", "#3b5da3", "#ffffff", "#3c6eb4",
    "#8096c3", "#ffffff", "#80a1ce", "#c4cee3", "#ffffff", "#c5d4e9",
  ],
} satisfies Meta<FedoraOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  __pppq88888888qqq__,
              __p8888888888888888888888q_,
           ._p8888888888888888888888888888q_,
         _p8888888888888888888888888888888888q,
        p88888888888888888888888888888888888888q,
      _88888888888888888888888P""""^8888888888888,
     )888888888888888888888P'         "88888888888p
    q888888888888888888888"    _pq__    "8888888888p
   \888888888888888888888|   _8888888,   )8888888888,
   8888888888888888888888:   d8888888|   |88888888888
  |8888888888888888888888:   d8888888q_ _p88888888888|
  d8888888888888888888888:   d88888888888888888888888b
  88888888888888888PPPP88:   /PPPP88888888888888888888
  888888888888P"       d8:         8888888888888888888
  8888888888P      ____d8:   ______888888888888888888P
  888888888"   .p88888888:   d88888888888888888888888|
  88888888P   .8888888888:   d88888888888888888888888
  88888888|   |8888888888:   d8888888888888888888888"
  88888888p   '888888888P    d888888888888888888888P
  888888888,   'Y888888"    q888888888888888888888"
  8888888888p      ''     _p888888888888888888888"
  888888888888q_       ._p888888888888888888888P
  8888888888888888qqpq88888888888888888888888P'
  88888888888888888888888888888888888888888"
  "888888888888888888888888888888888888P"'
    "8888888888888888888888888888PP""'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __pppq88888888qqqq_,
              __p8888888888888888888888q_,
           __p8888888888888888888888888888q_,
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
  888888888888888888888888888888888888888888888888888P
  888888888888888888888888888888888888888888888888888'
  88888888888888888888888888888888888888888888888888(
  8888888888888888888888888888888888888888888888888P
  888888888888888888888888888888888888888888888888P
  88888888888888888888888888888888888888888888888"
  888888888888888888888888888888888888888888888P'
  8888888888888888888888888888888888888888888P'_
  88888888888888888888888888888888888888888"'  (YY
  "888888888888888888888888888888888888P"'
   '"8888888888888888888888888888PP""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000000000000000
         00000000000000000000001111111110000000
       000000000000000000000111111111111122000000
      00000000000000000000111111111111112222200000
     0000000000000000000011111110000000222222220000
    000000000000000000001111110000000000022222200000
   00000000000000000000011111000000000000022222200000
  0000000000000000000001111110000000000000222222000000
  0000000000000000000001111110000000000000222222000000
  0000000000000000000001111110000000000022222220000000
  0000000000002201111111111111111111222222222200000000
  0000000022222211111111111111111111122222220000000000
  0000002222222211111111111111111111122222000000000000
  0000222222222000000001111110000000000000000000000000
  0002222222000000000001111110000000000000000000000000
  000222222000000000000111111000000000000000000000000
  00022222200000000000011111100000000000000000000000
  0002222220000000000001111110000000000000000000000
  000222222200000000001111111000000000000000000000
  00002222222200000111111111000000000000000000000
  0000002222111111111111110000000000000000000002
  0000000022111111111111000000000000000000000  222
  0000000000000111100000000000000000000000
   00000000000000000000000000000000000

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

export default function fedora({ scan = meta.options.scan }: Partial<FedoraOptions> = {}): Frame {
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
