/*
 * marquee: a theatre sign. Its text scrolls across an LED panel a pixel at a
 * time and loops without a seam, while the bulbs round the edge chase.
 */
import type { Frame, Meta } from "../types.ts";

export interface MarqueeOptions {
  [key: string]: unknown;
  text: string;
  speed: number;
}

export const meta = {
  name: "marquee",
  category: "type",
  note: "a scrolling led sign framed by chasing bulbs",
  cols: 61,
  rows: 10,
  fps: 24,
  options: { text: "now showing · doors open at 7:30 ·", speed: 12 },
} satisfies Meta<MarqueeOptions>;

// 5x7 glyphs: the character, then one base-32 digit per row (bit 4 is the left pixel).
const PACKED =
  "0ehjlphe14c4444e2eh1248v3v2421he426aiv225vgu11he668guhhe7v1248888ehhehhe9ehhf12c" +
  "AehhvhhhBuhhuhhuCehgggheDuhhhhhuEvgguggvFvggugggGehgnhhfHhhhvhhhIe44444eJ72222ic" +
  "KhikokihLggggggvMhrllhhhNhhpljhhOehhhhhePuhhugggQehhhlidRuhhukihSfgge11uTv444444" +
  "UhhhhhheVhhhhha4WhhhlllaXhha4ahhYhha4444Zv1248gv.0000004,0000048:0040040!4444404" +
  "?eh12404-000e000'4400000\"aa00000/11248gg&cik8lid+044v440·0004000*04lel40#aavavaa" +
  "(2488842)8422248@ehnlngf%op248j3=00v0v00_000000v 0000000";
const FONT: Record<string, number[]> = {};
for (let i = 0; i < PACKED.length; i += 8) {
  FONT[PACKED[i]] = [...PACKED.slice(i + 1, i + 8)].map((d) => parseInt(d, 32));
}

// The text as a strip of pixel columns, each a 7-bit mask with bit 0 at the top.
function strip(text: string): number[] {
  const out: number[] = [];
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] || FONT["?"];
    const col = (x: number) => g.reduce((m, b, y) => m | (b & (16 >> x) ? 1 << y : 0), 0);
    const cs = ch === " " ? [0, 0, 0] : [0, 1, 2, 3, 4].map(col).filter((m, x, a) => m || (a.slice(0, x).some(Boolean) && a.slice(x).some(Boolean)));
    out.push(...cs, 0);
  }
  return out;
}

export default function marquee({ text = meta.options.text, speed = meta.options.speed }: Partial<MarqueeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const left = 4, width = cols - 8; // the panel, inside the frame
  const band = 3; // first of the four rows the letters light
  // Pad the loop with a gap, then repeat it until it is wider than the panel.
  const unit = strip(String(text).trim());
  unit.push(...new Array<number>(12).fill(0));
  let loop = unit.slice();
  while (loop.length < width + 1) loop = loop.concat(unit);
  const L = loop.length;

  // Bulbs every other cell along the top and bottom, every row down the sides,
  // numbered clockwise so a chase can run round them.
  const bulbs: [number, number][] = [];
  for (let c = 0; c < cols; c += 2) bulbs.push([0, c]);
  for (let r = 1; r < rows - 1; r++) bulbs.push([r, cols - 1]);
  for (let c = cols - 1; c >= 0; c -= 2) bulbs.push([rows - 1, c]);
  for (let r = rows - 2; r > 0; r--) bulbs.push([r, 0]);

  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) grid.push(new Array<string>(cols).fill(" "));
  // The sign's frame, inset from the bulbs.
  grid[1][2] = "╔";
  grid[1][cols - 3] = "╗";
  grid[rows - 2][2] = "╚";
  grid[rows - 2][cols - 3] = "╝";
  for (let c = 3; c < cols - 3; c++) grid[1][c] = grid[rows - 2][c] = "═";
  for (let r = 2; r < rows - 2; r++) grid[r][2] = grid[r][cols - 3] = "║";

  return (t) => {
    const off = Math.floor(t * speed) % L;
    for (let j = 0; j < width; j++) {
      const m = loop[(off + j) % L];
      for (let i = 0; i < 4; i++) {
        // Each cell holds two pixel rows; the letters sit one pixel down.
        const top = (m >> (2 * i - 1)) & (i ? 1 : 0), bot = (m >> (2 * i)) & 1;
        grid[band + i][left + j] = top && bot ? "█" : top ? "▀" : bot ? "▄" : " ";
      }
    }
    // Two of every three bulbs lit, the dark one walking clockwise.
    const step = Math.floor(t * 7);
    bulbs.forEach(([r, c], i) => (grid[r][c] = (((i - step) % 3) + 3) % 3 === 0 ? "·" : "o"));
    return grid.map((row) => row.join("")).join("\n");
  };
}
