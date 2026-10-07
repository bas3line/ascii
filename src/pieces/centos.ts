/*
 * centos: the CentOS logo, four coloured squares in a star, with a scan line
 * running down it every few seconds that scrambles what it passes.
 *
 * Drawn from devicon's centos-original.svg (MIT): each cell holds the
 * character whose shape best matches the logo's edge through it, and 8 where
 * the logo is solid. On a canvas it takes the logo's colours, lifted on a dark
 * page where they would sink into it; in a <pre> it is one ink, from devicon's
 * centos-plain.svg (MIT). The logo is a trademark of its owner, shown here to
 * name the distribution.
 */
import type { Frame, Meta } from "../types.ts";

export interface CentosOptions {
  [key: string]: unknown;
  /** Seconds between scans; 0 keeps the logo still. */
  scan: number;
}

export const meta = {
  name: "centos",
  category: "distros",
  note: "four coloured squares in a star, scanned now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { scan: 5 },
  // The logo's 5 colours for a light page, then for a dark one; each as drawn, then twice lighter for the scan.
  palette: [
    "#fefefe", "#262577", "#9ccd2c", "#93237a", "#efa725", "#fefefe",
    "#7271a7", "#bfdf76", "#b970a9", "#f5c671", "#ffffff", "#bebed6",
    "#e1f0c0", "#dfbdd7", "#fae5be", "#fefefe", "#504ec8", "#9ccd2c",
    "#a8288b", "#efa725", "#fefefe", "#8d8cdb", "#bfdf76", "#c673b4",
    "#f5c671", "#ffffff", "#cbcaef", "#e1f0c0", "#e5bfdc", "#fae5be",
  ],
} satisfies Meta<CentosOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                          _pq_
                        _p8888q_
                      .d88888888b,
         \qqqqqqqqp-_pqqq.d888 qqqq_ __________
         d8888888P_p88888.d888 88888q_"88888888
         d88888P'q8888888.d888 8888888p."888888
         d888P88q_"888888.d888 888888P_p88P8888
         d8P_q,Y88q_"8888.d888 8888P_p88P_p_"88
         "_p888q,Y88q_"88.d888 88P'p88P'p888q_"
         q8888888q,Y88q_"'d888 P'p88P'p8888888p
      _p:d888888888q,Y88q."88P q88P'p8888888888 q_
    _p88:""""""""""""''""   '  """ """""""""""" 88q,
  _p8888888888888888888q,       q8888888888888888888q,
  '88888888888888888888P'       Y8888888888888888888P"
    '888:\qqqqqqqqqqp-._q. .,  qq,-qqqqqqqqqqqp 88P"
      'O:d888888888P'p88P q88p Y88q,Y8888888888 P"
         d8888888P'p88P'p.d888 q,Y88q,Y8888888P
         _'O888P'p88P'p88.d888 88q,Y88q,Y888P"_
         d8q'Y'p88P'p8888.d888 8888q,Y88q,Y"_88
         d888q88P'p888888.d888 888888q,Y88q8888
         d88888_'88888888.d888 8888888P'_888888
         d8888888_"888888.d888 88888P"_88888888
         "^^^^^^^^^ "^^^^'d888 "^^^" '"""""""""
                      "888888888P"
                        "88888P"
                          "8P"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                          _pq_
                        _p8888q_
                      _p88888888q_
         \qqqqqqqqqqqp888888888888qqqqqqqqqqqqp
         d8qqqqqqqqq88888888888888888________p8
         d8888888888888888888888888888888888888
         d8888888888888888888888888888888888888
         d8888888888888888888888888888888888888
         d8888888888888888888888888888888888888
        _d8888888888888888888888888888888888888_
      _p8888888888888888888888888888888888888888q_
    _p88888888888888888888P88P88888888888888888888q,
  _p888888888888888888888q, ' _888888888888888888888q,
  "8888888888888888888888P,   )888888888888888888888P"
    "888888888888888888888q88q88888888888888888888P"
      '88888888888888888888888888888888888888888P"
        '88888888888888888888888888888888888888"
         d888888888888888888888888888888888888b
         d888888888888888888888888888888888888b
         d888888888888888888888888888888888888b
         d888888888888888888888888888888888888b
         d888888888888888888888888888888888888b
         """"""""""""8888888888888P""""""""""""
                      "888888888P"
                        "88888P"
                          "8P"

`;
const INK = String.raw`

                          0000
                        00044000
                      000444444000
         00000000000000004444444000000000000000
         00222222220022220444404443000333333300
         00222222002222220444403333330033333330
         00222222022222220444403333333033333330
         00220002220222220444403333303333003330
         00002220022202220444403330033303330030
        0002222222002220204444030033303333333000
      00000222222222002220044400333033333333330000
    000330022222222200002000000330033333333330011000
  0003333333333333333333000 0 001111111111111111111000
  0003333333333333333333000   001111111111111111111000
    000330011111111110001000000440044444444440011000
      00000111111111001110022204444044444444440000
        0001111111001110102222040444404444444000
         00001110011101110222204440444404440000
         00110001110111110222204444404440004440
         00111111011111110222204444444044444440
         00111111001111110222204444440044444440
         00111111110011110222204444004444444440
         00000000000000022222222000000000000000
                      000222222000
                        00022000
                          0000

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

export default function centos({ scan = meta.options.scan }: Partial<CentosOptions> = {}): Frame {
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
