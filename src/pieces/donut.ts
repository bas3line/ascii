/*
 * donut: a torus turning on two axes, lit from the upper left. After Andy
 * Sloane's donut.c, with the ring sized so it never clips at any angle.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "donut",
  category: "shapes",
  note: "a lit torus turning on two axes, after donut.c",
  cols: 40,
  rows: 22,
  fps: 30,
} satisfies Meta;

const RAMP = ".,-~:;=!*#$@";

export default function donut(): Frame {
  const { cols, rows } = meta;
  const R1 = 1; // tube radius
  const R2 = 2; // ring radius
  const K2 = 6; // eye to centre
  const ASPECT = 0.5; // a cell is about twice as tall as it is wide
  const K1 = (cols - 2) / 2 / ((R1 + R2) / Math.sqrt(K2 * K2 - (R1 + R2) ** 2));
  const m = Math.hypot(-0.4, 1, -1);
  const [lx, ly, lz] = [-0.4 / m, 1 / m, -1 / m];
  const out: string[] = new Array(cols * rows);
  const depth = new Float32Array(cols * rows);

  return (t, { paper = false } = {}) => {
    const A = 1 + t * 0.8;
    const B = 1 + t * 0.35;
    out.fill(" ");
    depth.fill(0);
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    for (let th = 0; th < 6.283; th += 0.07) {
      const ct = Math.cos(th), st = Math.sin(th);
      for (let ph = 0; ph < 6.283; ph += 0.03) {
        const cp = Math.cos(ph), sp = Math.sin(ph);
        const h = R2 + R1 * ct;
        const x = h * (cB * cp + sA * sB * sp) - R1 * st * cA * sB;
        const y = h * (sB * cp - sA * cB * sp) + R1 * st * cA * cB;
        const ooz = 1 / (K2 + cA * h * sp + R1 * st * sA);
        const col = Math.floor(cols / 2 + K1 * ooz * x);
        const row = Math.floor(rows / 2 - K1 * ASPECT * ooz * y);
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        const k = col + row * cols;
        if (ooz <= depth[k]) continue;
        depth[k] = ooz;
        // The surface normal is the same rotation applied to the tube's circle.
        const nx = ct * (cB * cp + sA * sB * sp) - st * cA * sB;
        const ny = ct * (sB * cp - sA * cB * sp) + st * cA * cB;
        const nz = cA * ct * sp + st * sA;
        const i = Math.round(Math.max(0, nx * lx + ny * ly + nz * lz) * (RAMP.length - 1));
        out[k] = RAMP[paper ? RAMP.length - 1 - i : i];
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
