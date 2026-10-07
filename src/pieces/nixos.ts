/*
 * nixos: the NixOS logo, the snowflake of lambdas, with a scan line running
 * down it every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's nixos-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from devicon's
 * nixos-plain.svg (MIT). The logo is a trademark of its owner, shown here to
 * name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface NixosOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "nixos",
  category: "distros",
  note: "the snowflake of lambdas, scanned now and then",
  cols: 64,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#5277c3", "#81bfea", "#8fa7d8", "#add5f1", "#cbd6ed", "#d9ecf9",
    "#5277c3", "#81bfea", "#8fa7d8", "#add5f1", "#cbd6ed", "#d9ecf9",
  ],
} satisfies Meta<NixosOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                q8888,       "888888(     _8888p
               )888888,       "888888p   _888888(
                "888888_       "888888p _888888"
                 "888888p       '888888q888888"
           ________888888p________88888888888"
          _88888888888888888888888pO88888888'       q,
         )8888888888888888888888888q)888888,       q88_
        )888888888888888888888888888b"888888(    .p8888p
                  q888888"            "888888p  _p88888P
                 p888888'              "888888p_888888P
               .p88888P'                '88888\888888P
   _qqqqqqqqqqq888888P                    888)888888qqqqqqqq,
  _88888888888888888P                      "q8888888888888888,
  "8888888888888888(p                      q88888888888888888"
   """"""""8888888\88q,                  .p888888"""""""""""'
          q888888\8888q,                _p88888P
         p888888'O888888,              _888888P
       .p88888P'  Y888888,            |888888P
        Y8888P     "888888pqqqqqqqqqqqqqqqqqqqqqqqqqqqp(
         "88P       "888888p88888888888888888888888888"
          ""       _p8888888pO88888888888888888888888"
                  _8888888888q''''''''Y888888,'''''''
                 _888888888888q,       "888888,
                q888888" O888888,       "888888(
               )888888"   )888888,       "888888(
                "8888'     "888888(       "8888"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                q8888,       "888888(     _8888p
               )888888,       "888888p   _888888(
                "888888_       "888888p _888888"
                 "888888p       '888888q888888"
           ________888888p________88888888888"
          _88888888888888888888888pO88888888'       q,
         )8888888888888888888888888q)888888,       q88_
        )888888888888888888888888888b"888888(    .p8888p
                  q888888"            "888888p  _p88888P
                 p888888'              "888888p_888888P
               .p88888P'                '88888\888888P
   _qqqqqqqqqqq888888P                    888)888888qqqqqqqq,
  _88888888888888888P                      "q8888888888888888,
  "8888888888888888(p                      q88888888888888888"
   """"""""8888888\88q,                  .p888888"""""""""""'
          q888888\8888q,                _p88888P
         p888888'O888888,              _888888P
       .p88888P'  Y888888,            |888888P
        Y8888P     "888888/qqqqqqqqqqqqqqqqqqqqqqqqqqqp(
         "88P       "888888p88888888888888888888888888"
          ""       _p8888888pO88888888888888888888888"
                  _8888888888q''''''''Y888888,'''''''
                 _888888888888q,       "888888,
                q888888" Y888888,       "888888(
               )888888"   )888888,       "888888(
                "8888'     "888888(       "8888"

`;
const INK = String.raw`

                000000       11111111     111111
               00000000       11111111   11111111
                00000000       11111111 11111111
                 00000000       111111111111111
           00000000000000000000000111111111111
          00000000000000000000000001111111111       00
         00000000000000000000000000011111111       0000
        0000000000000000000000000000011111111    0000000
                  11111111            11111111  00000000
                 11111111              1111111100000000
               111111111                11111100000000
   1111111111111111111                    1110000000000000000
  1111111111111111111                      1000000000000000000
  1111111111111111110                      0000000000000000000
   11111111111111110000                  00000000000000000000
          11111111000000                00000000
         1111111100000000              00000000
       111111111  00000000            00000000
        111111     0000000011111111111111111111111111111
         1111       00000000111111111111111111111111111
          11       00000000001111111111111111111111111
                  00000000000011111111111111111111111
                 000000000000000       11111111
                00000000 00000000       11111111
               00000000   00000000       11111111
                000000     00000000       111111

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

export default function nixos({ scan = meta.options.scan }: Partial<NixosOptions> = {}): Frame {
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
