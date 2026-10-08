/*
 * command code: the Command Code logo, its wordmark, command in ink and code
 * in grey, with a glint crossing it every few seconds.
 *
 * Drawn from Command Code's own wordmark, from commandcode.ai/brand, its
 * strokes thinned by a third of a cell so the slits between its blocky letters
 * stay open: each cell holds the character whose shape best matches the logo's
 * edge through it, and 8 where the logo is solid. On a canvas it is in the
 * wordmark's own two inks, black and grey, and in light ones on a dark page,
 * where black would sink into it; in a <pre> it is one ink, from the same
 * drawing. The logo is a trademark of its owner, shown here to name the
 * company.
 */
import type { Frame, Meta } from "../types.ts";

export interface CommandCodeOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "command code",
  category: "companies",
  note: "the command code wordmark, glinting now and then",
  cols: 78,
  rows: 10,
  fps: 30,
  options: { shine: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#000000", "#c1c1c1", "#595959", "#d7d7d7", "#b3b3b3", "#ececec",
    "#e8ebef", "#aeb4bc", "#f0f2f5", "#caced3", "#f8f9fa", "#e7e9eb",
  ],
} satisfies Meta<CommandCodeOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

  q8888||8888(|8888888p.8888888p 8888p q8888p   q8p :8888p:8888p   88p|8888(
  |8PY8||P"Y8||8PY8PY8P.8P"8P"8b 88"88 88""8b __d88 :8PY8P:8"Y8P.__88||8("8|
  |8||8||b |8||8||8P:8P.8b 8b 8b 8b 88 88  8b 88888 :8P:8P:b |8P|8888||8||8|
  |8|   |b |8||8||8P:8P.8b 8b 8b 88q88 88  8b 8b 88 :8P   :b |8P|8P|8||8(_8|
  |8| . |b |8||8||8P:8P.8b 8b 8b 88888 88  8b 8b 88 :8P . :b |8P|8P|8||8888(
  |8||8||b |8||8||8P:8P.8b 8b 8b 88888 88  8b 8b 88 :8P:8P:b |8P|8P|8||88|
  |8qp8||bqp8||8||8P:8P.8b 8b 8b 88"88 88  8b 8bq88 :8qp8P:8qp8P|8qp8||88__,
  )8888|)8888(|8(|8P'8P'8P 8P 8P 8P 88 88  8P 8888P '8888P:8888P:8888(|8888(

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

  q8888||8888(|8888888p.8888888p 8888p q8888p   q8p :8888p:8888p   88p|8888(
  |8PY8||P"Y8||8PY8PY8P.8P"8P"8b 88"88 88""8b __d88 :8PY8P:8"Y8P.__88||8("8|
  |8||8||b |8||8||8P:8P.8b 8b 8b 8b 88 88  8b 88888 :8P:8P:b |8P|8888||8||8|
  |8|   |b |8||8||8P:8P.8b 8b 8b 88q88 88  8b 8b 88 :8P   :b |8P|8P|8||8(_8|
  |8| . |b |8||8||8P:8P.8b 8b 8b 88888 88  8b 8b 88 :8P . :b |8P|8P|8||8888(
  |8||8||b |8||8||8P:8P.8b 8b 8b 88888 88  8b 8b 88 :8P:8P:b |8P|8P|8||88|
  |8qp8||bqp8||8||8P:8P.8b 8b 8b 88"88 88  8b 8bq88 :8qp8P:8qp8P|8qp8||88__,
  )8888|)8888(|8(|8P'8P'8P 8P 8P 8P 88 88  8P 8888P '8888P:8888P:8888(|8888(

`;
const INK = String.raw`

  000000000000000000000000000000 00000 000000   000 111111111111   111111111
  000000000000000000000000000000 00000 000000 00000 111111111111111111111111
  00000000 000000000000000 00 00 00 00 00  00 00000 11111111 111111111111111
  000   00 000000000000000 00 00 00000 00  00 00 00 111   11 111111111111111
  000 0 00 000000000000000 00 00 00000 00  00 00 00 111 1 11 111111111111111
  00000000 000000000000000 00 00 00000 00  00 00 00 11111111 1111111111111
  000000000000000000000000 00 00 00000 00  00 00000 111111111111111111111111
  000000000000000000000000 00 00 00 00 00  00 00000 111111111111111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function commandCode({ shine = meta.options.shine }: Partial<CommandCodeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the logo's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
    });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
