/*
 * julia-set: the Julia set of z*z + c, drawn as a glow on its edge, with c
 * going round a circle so the set melts from one shape into the next.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "julia set",
  category: "generative",
  note: "a julia set changing shape as its constant c goes round",
  cols: 66,
  rows: 24,
  fps: 20,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const P = 40; // seconds for c to go once round
const CX = -0.4, R = 0.68; // c's circle: it stays close to the Mandelbrot set's edge
const A0 = Math.PI / 2; // c starts at -0.4 + 0.68i
const MAX = 120;
const SPAN = 3.7; // the width of the view
const REACH = 4; // how far the glow reaches from the edge, in cells

export default function juliaSet(): Frame {
  const { cols, rows } = meta;
  const N = RAMP.length;
  const dx = SPAN / cols, dy = dx * 2; // a cell is twice as tall as it is wide
  const half = rows / 2;
  const grid = Array.from({ length: half }, () => new Array<string>(cols));

  return (t) => {
    const a = A0 + (2 * Math.PI * t) / P;
    const cr = CX + R * Math.cos(a), ci = R * Math.sin(a);
    // The set is symmetric through the origin, so the bottom half is the top turned round.
    for (let r = 0; r < half; r++) {
      const y0 = (r + 0.5 - half) * dy;
      for (let c = 0; c < cols; c++) {
        let x = (c + 0.5 - cols / 2) * dx, y = y0, n = 0, m = 0;
        let ex = 1, ey = 0; // the orbit's derivative, for the distance to the set
        for (; n < MAX; n++) {
          const xx = x * x, yy = y * y;
          m = xx + yy;
          if (m > 1e4) break;
          const t2 = 2 * (x * ex - y * ey);
          ey = 2 * (x * ey + y * ex);
          ex = t2;
          y = 2 * x * y + ci;
          x = xx - yy + cr;
        }
        if (n === MAX) {
          grid[r][c] = " "; // inside: the glow is on the edge alone
          continue;
        }
        const z = Math.sqrt(m);
        const d = (0.5 * z * Math.log(z)) / Math.hypot(ex, ey) / dx; // cells to the edge
        const k = Math.max(0, 1 - Math.pow(d / REACH, 0.6));
        grid[r][c] = RAMP[Math.min(N - 1, Math.floor(k * N))];
      }
    }
    const lines = grid.map((row) => row.join(""));
    for (let r = half - 1; r >= 0; r--) lines.push(grid[r].slice().reverse().join(""));
    return lines.join("\n");
  };
}
