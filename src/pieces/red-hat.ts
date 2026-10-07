/*
 * red hat: the Red Hat logo, the man in the red hat, with a scan line running
 * down it every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's redhat-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from devicon's
 * redhat-plain.svg (MIT). The logo is a trademark of its owner, shown here to
 * name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface RedHatOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "red hat",
  category: "distros",
  note: "the man in the red hat, scanned now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#000000", "#ffffff", "#e93442", "#595959", "#ffffff", "#f17b84",
    "#b3b3b3", "#ffffff", "#f8c2c6", "#545454", "#ffffff", "#e93442",
    "#909090", "#ffffff", "#f17b84", "#cccccc", "#ffffff", "#f8c2c6",
  ],
} satisfies Meta<RedHatOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`


                     ____ppqqqq____
                __pq8888888888888888qq__
             _p88888888888888888888888888q_
          _p8888888P""""YPPPP"____"Y88888888q,
        _p88888888"            _)88('888888888q,
       p888888888P qq_____,    '''    Y888888888p
     _p8888888888' "88888PP"           O888888888q,
    _888888888888    "'                 88888888888,
   .88888P"""""\8q_                     "88888888888,
   d888P       "8888qqq___               88888888888p
  |8888p        'Y888888888qp           .8"'"Y8888888,
  d88888q_         '"Y8888888,          "'     'O8888b
  88888888q_            '"""YP"                  88888
  88888888888q_,                                .88888
  888888888888P8bq_,                           _p88888
  O8888888888"   "888q__,                    _p888888P
  "8888888888q,   '' "8888qqq____________ppp888888888|
   YPPP""' 'Y88_,      "8888888888888888888888888888P
             '""                       q888888888888'
                             \q__p     888888888888"
                              '""'    q888PP"""""Y'
                                    _p88P"
                                   _8P"
                                  """


`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __pppq88888888qqqq_,
              __p8888888888888888888888q_,
           ._p8888888888888888888888888888q_,
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
  d88888888888888888888888888888888888888888888888888P
  '88888888888888888888888888888888888888888888888888'
   "888888888888888888888888888888888888888888888888(
    )8888888888888888888888888888888888888888888888P
     )88888888888888888888888888888888888888888888P
      "888888888888888888888888888888888888888888"
        Y88888888888888888888888888888888888888P'
         'Y8888888888888888888888888888888888P'
            "888888888888888888888888888888"'
              '"Y8888888888888888888888P"'
                   ""Y88888888888PP""'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000000000000000
         00000000002222222222222000220000000000
       000000000002222222222222200022200000000000
      00000000000220000000022222222222200000000000
     0000000000002222002222222222222222200000000000
    000000000000022222222222222222222222000000000000
   00000222222220002222222222222222222222000000000000
  0000022222222200000000002222222222222220000000000000
  0000002222222222200000000002222222222220222220000000
  0000000022222222222222000000222222222222222222200000
  0000000000222222222222222222222222222222222222200000
  0000000000000222222222222222222222222222222222200000
  0000000000001110022222222222222222222222222220000000
  0000000000011111101000022222222222222222222000000000
  0000000010001111111100000000000000000000000000000000
   11111111110001111111111001111111111110000000000000
    111111111111111111111111111111111110000000000000
     1111111111111111111111111000011111000000000000
      11111111111111111111111111111111000011111111
        11111111111111111111111111110001111111111
         11111111111111111111111111001111111111
            111111111111111111111111111111111
              1111111111111111111111111111
                   1111111111111111111

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

export default function redHat({ scan = meta.options.scan }: Partial<RedHatOptions> = {}): Frame {
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
