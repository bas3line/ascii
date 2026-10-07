/*
 * tux: the Linux logo, Tux, the penguin, with a scan line running down it
 * every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's linux-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from devicon's
 * linux-plain.svg (MIT). The logo is a trademark of its owner, shown here to
 * name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface TuxOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "tux",
  category: "distros",
  note: "tux the penguin, scanned now and then",
  cols: 49,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#030202", "#fcfcfc", "#a58137", "#fdcc1b", "#5b5b5b", "#fdfdfd",
    "#c5ad7d", "#fede6b", "#b3b3b3", "#fefefe", "#e4d9c3", "#fef0bb",
    "#545454", "#fcfcfc", "#a58137", "#fdcc1b", "#909090", "#fdfdfd",
    "#c5ad7d", "#fede6b", "#cccccc", "#fefefe", "#e4d9c3", "#fef0bb",
  ],
} satisfies Meta<TuxOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                   _pq8888qq_,
                 _888888888888p
                 88888888888888p
                 88P88888P^88888,
                 8'_,)88 __,"888p
                 8,8p)88_d8P 888b
                 dqp888888qqp888b
                 d888888888888888,
                 d|"88888P"' 88888,
                q8'  '""     '88888_
              _p8'            "88888q,
             q88'              "88888q,
            q88"                )888888,
           )88P                  )888888,
          _88P                    8888888,
         _888                     d888888p
        _888P                     d8888888
        d888p                     d8888888
        p8888q,                 qp8888888q,
    ._p88888888q_               8888888888,
  |888888888888888p             88888888888_
  |888888888888888P'          _p8888888888888_,
  |88888888888888q,        ._p8888888888888888"
  |8888888888888888qqqqppp8888888888888888P"'
   ""Y888888888888888PPPPP8888888888888P"
          ""Y8888P"            "88888P'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                    __p88888qq_
                   )88888888888q,
                  .88888888888888,
                  |88888888888888b
                  |888888888888888
                  |888888888888888
                   888888888888888,
                   888888888888888b
                  _8888888888888888q,
                 _888888888888888888q,
               _p888888888888888888888p
              _888888888888888888888888q,
             _88888888888888888888888888q,
            .8888888888888888888888888888q,
            q88888888888888888888888888888p
           p8888888888888888888888888888888
          |88888888888888888888888888888888
          q8888888888888888888888888888888p
      __pp888888888888888888888888888888888
     88888888888888888888888888888888888888q_
     8888888888888888888888888888888888888888q_
     88888888888888888888888888888888888888888"
    |88888888888888888888888888888888888888""
    .'"YY88888888888888PPPPPPP8888888888Y|:'.
      ''''|||""Y888"'''''''''|||"8888P"''''
           '''''''            ''''''''

`;
const INK = String.raw`

                    00000000000
                   00000000020000
                  0000000000000000
                  0000000000000000
                  0011100110110000
                  0010133300010000
                   0233333333300000
                   0233333333200200
                  0022233211111000000
                 000111211111111000000
               000111111111111110000000
              000021111111111122100000000
             00001111111111111111100000000
            0000111111111111111111100000000
            0001111111111111111111100000000
           00001111111111111111111100000000
          000001111111111111111111100000000
          333300111111111111111113300000003
      2223333333001111111111111113320000333
     3333333333330001111111111112233333333333
     333333333333300011111111111223333333333333
     333333333333333111111111100023333333333333
    33333333333333332000000000002333333333333
    02222222333333322000000000002233333222000
      0000002222222220000000000022222222000
           0000000            00000000

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

export default function tux({ scan = meta.options.scan }: Partial<TuxOptions> = {}): Frame {
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
