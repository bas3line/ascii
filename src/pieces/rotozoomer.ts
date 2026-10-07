/*
 * rotozoomer: the demo-scene classic. A wall of bevelled bricks set in deep
 * mortar, turned and scaled about the middle of the screen every frame.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "rotozoomer",
  category: "effects",
  note: "a brick wall texture turning and zooming about the centre",
  cols: 64,
  rows: 24,
  fps: 30,
} satisfies Meta;

// One shade for each surface of the wall, as in text-mode demos: mortar,
// shadowed bevel, brick face, side-lit bevel, top-lit bevel.
const SHADES = " ░▒▓█";
const CUT = [0.12, 0.44, 0.78, 0.93]; // where each shade gives way to the next
const P = 16; // seconds for one full turn; the zoom and the drift repeat in it
const W = (2 * Math.PI) / P;
const M = 0.085; // half the mortar joint, in brick heights
const B = 0.15; // bevel width, in brick heights
const FACE = 0.66, MORTAR = 0.02;
const EDGE = [1, 0.86, 0.3, 0.22]; // top, left, right and bottom bevels: lit from the upper left

// Brightness at (u, v), in brick heights; a brick is two long and every other
// course is set half a brick over.
const tex = (u: number, v: number) => {
  const iv = Math.floor(v);
  const x = u + (iv & 1);
  const lx = x - 2 * Math.floor(x / 2) - M, ly = v - iv - M;
  const w = 2 - 2 * M, h = 1 - 2 * M;
  if (lx < 0 || ly < 0 || lx > w || ly > h) return MORTAR;
  const e = Math.min(ly, lx, w - lx, h - ly);
  if (e > B) return FACE;
  return EDGE[e === ly ? 0 : e === lx ? 1 : e === w - lx ? 2 : 3];
};

export default function rotozoomer(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols);
  // Nine samples to a cell, in cell widths from its centre, rows counted double.
  const SX: number[] = [], SY: number[] = [];
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      SX.push((i - 1) / 3);
      SY.push(((j - 1) / 3) * 2);
    }

  return (t, { paper = false } = {}) => {
    // The turn lingers where the courses run square to the screen.
    const th = W * t + 0.08;
    const a = th - 0.14 * Math.sin(4 * th);
    const L = 13 * Math.exp(0.25 * Math.cos(2 * W * t)); // brick height, in cell widths
    const ca = Math.cos(a) / L, sa = Math.sin(a) / L;
    // The wall drifts two bricks along and two courses up a loop, so it closes.
    const u0 = (4 * t) / P + 0.7 * Math.sin(W * t) + 0.35;
    const v0 = (2 * t) / P + 0.7 * Math.cos(W * t) - 0.2;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5 - rows / 2) * 2;
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5 - cols / 2;
        let v = 0;
        for (let s = 0; s < 9; s++) {
          const px = x + SX[s], py = y + SY[s];
          v += tex(px * ca + py * sa + u0, py * ca - px * sa + v0);
        }
        v /= 9;
        let i = 0;
        while (i < 4 && v > CUT[i]) i++;
        out[c] = SHADES[paper ? 4 - i : i];
      }
      lines.push(out.join(""));
    }
    return lines.join("\n");
  };
}
