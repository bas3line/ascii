/*
 * kali linux: the Kali Linux logo, the dragon, with a scan line running down
 * it every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's kalilinux-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface KaliLinuxOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "kali linux",
  category: "distros",
  note: "the blue dragon, scanned now and then",
  cols: 71,
  rows: 27,
  fps: 30,
  options: { scan: 5 },
  // The logo's colour for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#287aff", "#73a9ff", "#bfd7ff", "#287aff", "#73a9ff", "#bfd7ff",
  ],
} satisfies Meta<KaliLinuxOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

       ''''""""""^YYY0bqqqq___,
                          '""^Y88qq__
                ___________________"Y8p
       __,ooOYYY"""""""""""""""""""YY/b
  .'"'''                 .___pppp88888O,        .
                   __pp88PY"""'        8p,       ':-_
              ._pdP""'                 _888qqqqqq___'"~_
           _oY""                     p88P"""""""Y888qp_|Y_
        .""                        _88"             ""888qq,
                                   d8"                  "888_
                                  :88                    '"Y8q_
                                  '88,                       "P"
                                   88q,
                                    O88_,
                                     "888qq_______,
                                        ""Y888888888888qpq__,
                                                    ''"^88q/Y0q_
                                                          "Yq_ "Oq,
                                                            'Oq, 'O_
                                                              "q,  "(
                                                               "b   )
                                                                ),
                                                                 \
                                                                 |
                                                                  '

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

       ''''""""""^YYY0bqqqq___,
                          '""^Y88qq__
                ___________________"Y8p
       __,ooOYYY"""""""""""""""""""YY/b
  .'"'''                 .___pppp88888O,        .
                   __pp88PY"""'        8p,       ':-_
              ._pdP""'                 _888qqqqqq___'"~_
           _oY""                     p88P"""""""Y888qp_|Y_
        .""                        _88"             ""888qq,
                                   d8"                  "888_
                                  :88                    '"Y8q_
                                  '88,                       "P"
                                   88q,
                                    O88_,
                                     "888qq_______,
                                        ""Y888888888888qpq__,
                                                    ''"^88q/Y0q_
                                                          "Yq_ "Oq,
                                                            'Oq, 'O_
                                                              "q,  "(
                                                               "b   )
                                                                ),
                                                                 \
                                                                 |
                                                                  '

`;
const INK = String.raw`

       000000000000000000000000
                          00000000000
                00000000000000000000000
       00000000000000000000000000000000
  000000                 000000000000000        0
                   000000000000        000       0000
              00000000                 00000000000000000
           00000                     000000000000000000000
        000                        0000             00000000
                                   000                  00000
                                  000                    000000
                                  0000                       000
                                   0000
                                    00000
                                     00000000000000
                                        000000000000000000000
                                                    000000000000
                                                          0000 0000
                                                            0000 000
                                                              000  00
                                                               00   0
                                                                00
                                                                 0
                                                                 0
                                                                  0

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

export default function kaliLinux({ scan = meta.options.scan }: Partial<KaliLinuxOptions> = {}): Frame {
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
