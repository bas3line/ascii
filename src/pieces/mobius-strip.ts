/*
 * mobius-strip: a band with one half twist, spinning about its axis while it
 * slowly nods. Z-buffered; the two faces take the light differently.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "mobius strip",
  category: "shapes",
  note: "a mobius strip turning and nodding, lit from above",
  cols: 58,
  rows: 20,
  fps: 30,
} satisfies Meta;

const RAMP = ".:-=+*#%@";

export default function mobiusStrip(): Frame {
  const { cols, rows } = meta;
  const W = 0.46; // half the band's width, the ring's radius being 1
  const NU = 720, NV = 40;
  const n = NU * NV;
  // The standard strip: the band turns half a turn, evenly, on its way round.
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n);
  const tone = new Float32Array(n);
  const rim = new Float32Array(n);
  for (let i = 0; i < NU; i++) {
    const u = (i / NU) * 6.2832, cu = Math.cos(u), su = Math.sin(u);
    const ch = Math.cos(u / 2), sh = Math.sin(u / 2);
    for (let j = 0; j < NV; j++) {
      const v = -W + (2 * W * j) / (NV - 1), k = i * NV + j, h = 1 + v * ch;
      px[k] = h * cu;
      py[k] = h * su;
      pz[k] = v * sh;
      // Normal from the two tangents, d/du and d/dv.
      const ux = -(v / 2) * sh * cu - h * su, uy = -(v / 2) * sh * su + h * cu, uz = (v / 2) * ch;
      const vx = ch * cu, vy = ch * su, vz = sh;
      const mx = uy * vz - uz * vy, my = uz * vx - ux * vz, mz = ux * vy - uy * vx;
      const m = Math.hypot(mx, my, mz);
      nx[k] = mx / m; ny[k] = my / m; nz[k] = mz / m;
      // The two sides of the band, told apart by a shade that runs twice round:
      // at the seam, where the normal flips, it flips too, so it never jumps.
      tone[k] = 0.1 * ch;
      // The edge is drawn a little darker, a thin outline that never outweighs the band.
      rim[k] = j === 0 || j === NV - 1 ? 0.45 : 1;
    }
  }
  const D = 6;
  const ASPECT = 0.5;
  // Spin about the ring's axis, which nods between 0.8 and 1.2 rad from the line of sight.
  const view = (t: number): [number, number] => [2.6 + t * 0.35, 1 - 0.2 * Math.cos(t * 0.3)];
  // The strip is wider where it lies flat than where it stands up, so each
  // frame is centred on its own bounds: [centre x, centre y, half width, half height].
  const box = (cS: number, sS: number, cT: number, sT: number): [number, number, number, number] => {
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (let k = 0; k < n; k += 11) {
      const x = cS * px[k] - sS * py[k], w = sS * px[k] + cS * py[k];
      const y = cT * w + sT * pz[k], z = -sT * w + cT * pz[k];
      const X = x / (D - z), Y = y / (D - z);
      if (X < x0) x0 = X;
      if (X > x1) x1 = X;
      if (Y < y0) y0 = Y;
      if (Y > y1) y1 = Y;
    }
    return [(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2];
  };
  let ex = 0, ey = 0;
  for (let s = 0; s < 6.283; s += 0.05) {
    for (let T = 0.8; T <= 1.21; T += 0.05) {
      const b = box(Math.cos(s), Math.sin(s), Math.cos(T), Math.sin(T));
      ex = Math.max(ex, b[2]);
      ey = Math.max(ey, b[3]);
    }
  }
  const K = Math.min((cols - 3) / 2 / ex, (rows - 2) / 2 / ASPECT / ey);
  const GAP = 0.3;
  // A key light from above, so the band's upper side reads light and its
  // underside dark where the twist turns it toward the eye, and a weak fill.
  const lm = Math.hypot(-0.35, 0.8, 0.5), fm = Math.hypot(0.3, -0.3, 0.9);
  const [lx, ly, lz] = [-0.35 / lm, 0.8 / lm, 0.5 / lm];
  const [fx, fy, fz] = [0.3 / fm, -0.3 / fm, 0.9 / fm];
  const out: string[] = new Array(cols * rows);
  const depth = new Float32Array(cols * rows);
  const along = new Int16Array(cols * rows);
  const cut = new Uint8Array(cols * rows);
  const N = RAMP.length - 1;

  return (t, { paper = false } = {}) => {
    const [S, T] = view(t);
    const cS = Math.cos(S), sS = Math.sin(S), cT = Math.cos(T), sT = Math.sin(T);
    const [mx, my] = box(cS, sS, cT, sT);
    out.fill(" ");
    depth.fill(0);
    for (let k = 0; k < n; k++) {
      const x = cS * px[k] - sS * py[k], y0 = sS * px[k] + cS * py[k];
      const y = cT * y0 + sT * pz[k], z = -sT * y0 + cT * pz[k];
      const ooz = 1 / (D - z);
      const col = Math.floor(cols / 2 + K * (ooz * x - mx));
      const row = Math.floor(rows / 2 - K * ASPECT * (ooz * y - my));
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const q = col + row * cols;
      if (z + 10 <= depth[q]) continue;
      depth[q] = z + 10;
      along[q] = (k / NV) | 0;
      let wx = cS * nx[k] - sS * ny[k];
      const w0 = sS * nx[k] + cS * ny[k];
      let wy = cT * w0 + sT * nz[k], wz = -sT * w0 + cT * nz[k];
      // A band has no inside: light whichever side faces the eye.
      let side = 1;
      if (wz < 0) { wx = -wx; wy = -wy; wz = -wz; side = -1; }
      const diff = Math.max(0, wx * lx + wy * ly + wz * lz), fill = Math.max(0, wx * fx + wy * fy + wz * fz);
      const lit = (0.06 + diff * 0.82 + fill * 0.22 + side * tone[k]) * rim[k];
      const i = Math.round(Math.max(0, Math.min(1, lit)) * N);
      out[q] = RAMP[paper ? N - i : i];
    }
    // Clear a cell of band wherever a part further round the loop passes in
    // front of it, so the layers stay apart.
    const over = (q: number, p: number) => {
      if (depth[p] <= depth[q] + GAP) return false;
      const s = Math.abs(along[p] - along[q]);
      return Math.min(s, NU - s) > NU / 12;
    };
    const m = cols * rows;
    for (let q = 0; q < m; q++) {
      const c = q % cols;
      cut[q] = depth[q] > 0 && ((c > 0 && over(q, q - 1)) || (c < cols - 1 && over(q, q + 1)) ||
        (q >= cols && over(q, q - cols)) || (q < m - cols && over(q, q + cols))) ? 1 : 0;
    }
    for (let q = 0; q < m; q++) if (cut[q]) out[q] = " ";
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
