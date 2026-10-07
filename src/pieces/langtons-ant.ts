/*
 * langton's ant: an ant that turns right on a blank square and left on an
 * inked one, flipping each square it leaves. Two squares to a character.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "langton's ant",
  category: "generative",
  note: "order, then chaos, then the ant builds its highway",
  cols: 72,
  rows: 25,
  fps: 30,
} satisfies Meta;

const N = 200; // the board, in squares; the frame shows part of it
const X0 = 31, Y0 = -24; // the board square at the frame's top left, from the start
// Play time against steps taken. The cycle opens as the highway sets off, so
// the first frame already shows all three phases; then the ant walks out of
// the frame, the board fades and it starts again from a blank board. The
// highway starts at step 9977.
const KEYS: [number, number][] = [
  [0, 10350],
  [2.0, 11330],
  [3.2, 11330],
  [3.2, 0],
  [4.3, 100],
  [5.6, 520],
  [12.4, 9977],
  [13.2, 10350],
];
const PERIOD = 13.2;
const FADE = [2.4, 3.2];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function langtonsAnt(): Frame {
  const { cols, rows } = meta;
  const board = new Uint8Array(N * N);
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  let x: number, y: number, dir: number, steps: number;
  const reset = () => {
    board.fill(0);
    x = y = N / 2;
    dir = 0;
    steps = 0;
  };
  const step = () => {
    const i = y * N + x;
    dir = (dir + (board[i] ? 3 : 1)) & 3;
    board[i] ^= 1;
    x += DX[dir];
    y += DY[dir];
    steps++;
  };

  // Each square fades at its own moment.
  const rand = mulberry32(7);
  const fadeAt = new Float32Array(cols * rows * 2).map(() => rand());

  const target = (p: number) => {
    let k = 1;
    while (KEYS[k][0] < p) k++;
    const [p0, s0] = KEYS[k - 1], [p1, s1] = KEYS[k];
    return Math.round(s0 + ((s1 - s0) * (p - p0)) / (p1 - p0));
  };

  // The frame is mirrored so the highway runs off to the lower right.
  const GLYPH = [" ", "▀", "▄", "█"];
  const at = (c: number, r: number) => {
    const bx = N / 2 + X0 - c, by = N / 2 + Y0 + r;
    return board[by * N + bx];
  };

  reset();
  return (t) => {
    const p = t % PERIOD;
    const want = target(p);
    if (want < steps) reset();
    while (steps < want) step();

    const fade = p > FADE[0] && p <= FADE[1] ? (p - FADE[0]) / (FADE[1] - FADE[0]) : 0;
    const ac = N / 2 + X0 - x, ar = Math.floor((y - N / 2 - Y0) / 2);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        if (c === ac && r === ar && fade === 0) {
          line += "@";
          continue;
        }
        const k = (r * cols + c) * 2;
        const top = at(c, 2 * r) && fadeAt[k] >= fade ? 1 : 0;
        const bottom = at(c, 2 * r + 1) && fadeAt[k + 1] >= fade ? 2 : 0;
        line += GLYPH[top + bottom];
      }
      lines.push(line);
    }
    return lines.join("\n");
  };
}
