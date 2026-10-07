/*
 * glider gun: Gosper's glider gun in Conway's life, two cells to a character
 * so every cell is square. It fires a glider every 30 generations, and an
 * eater below the frame swallows each one, so the field repeats exactly.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "glider gun",
  category: "generative",
  note: "gosper's gun firing a glider every 30 generations",
  cols: 56,
  rows: 20,
  fps: 10,
} satisfies Meta;

const GUN = [
  "........................o",
  "......................o.o",
  "............oo......oo............oo",
  "...........o...o....oo............oo",
  "oo........o.....o...oo",
  "oo........o...o.oo....o.o",
  "..........o.....o.......o",
  "...........o...o",
  "............oo",
];
const EATER = ["oo", "o", ".ooo", "...o"];
const PERIOD = 30;

export default function gliderGun(): Frame {
  const { cols, rows, fps } = meta;
  const PAD = 4;
  const GX = 2, GY = 2; // the gun's top left in the picture, in cells
  const K = 30; // how far down the glider lane the eater sits, past the frame
  const W = cols + 2 * PAD + 8;
  const H = rows * 2 + 2 * PAD + 8;
  let cur = new Uint8Array(W * H);
  let nxt = new Uint8Array(W * H);
  const place = (shape: string[], x0: number, y0: number) =>
    shape.forEach((row, y) => [...row].forEach((c, x) => c === "o" && (cur[(PAD + y0 + y) * W + PAD + x0 + x] = 1)));
  place(GUN, GX, GY);
  place(EATER, GX + 28 + K, GY + 15 + K);

  // The outer ring is never written, so it stays dead.
  const step = () => {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const n = cur[i - W - 1] + cur[i - W] + cur[i - W + 1] + cur[i - 1] + cur[i + 1] + cur[i + W - 1] + cur[i + W] + cur[i + W + 1];
        nxt[i] = n === 3 || (n === 2 && cur[i]) ? 1 : 0;
      }
    }
    [cur, nxt] = [nxt, cur];
  };

  // One character holds a cell over the cell below it.
  const GLYPH = [" ", "▀", "▄", "█"];
  const text = () => {
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      const a = (PAD + 2 * r) * W + PAD;
      for (let c = 0; c < cols; c++) line += GLYPH[cur[a + c] + 2 * cur[a + W + c]];
      lines.push(line);
    }
    return lines.join("\n");
  };

  // Run until the lane is full of gliders, then keep one period of frames.
  for (let g = 0; g < 4 * (K + 40) + 60; g++) step();
  const cycle: string[] = [];
  for (let g = 0; g < PERIOD; g++) {
    cycle.push(text());
    step();
  }

  return (t) => cycle[Math.floor(t * fps + 1e-6) % PERIOD];
}
