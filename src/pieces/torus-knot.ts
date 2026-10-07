/*
 * torus-knot: a (2,3) trefoil knot as a lit tube, z-buffered so the strands
 * pass over and under each other, turning slowly about its axis.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "torus knot",
  category: "shapes",
  note: "a trefoil knot drawn as a lit tube, turning slowly",
  cols: 60,
  rows: 28,
  fps: 30,
} satisfies Meta;

const RAMP = ".:-=+*#%@";

export default function torusKnot(): Frame {
  const { cols, rows } = meta;
  const TUBE = 0.28;
  const NU = 720, NV = 32;
  // The knot's centre line: twice round the z axis, three times through the hole.
  const curve = (u: number, o: number[]) => {
    const r = 2 + Math.cos(3 * u);
    o[0] = r * Math.cos(2 * u);
    o[1] = r * Math.sin(2 * u);
    o[2] = -Math.sin(3 * u);
  };
  // Surface points and normals, built once; each frame only rotates them.
  const px = new Float32Array(NU * NV), py = new Float32Array(NU * NV), pz = new Float32Array(NU * NV);
  const nx = new Float32Array(NU * NV), ny = new Float32Array(NU * NV), nz = new Float32Array(NU * NV);
  const c = [0, 0, 0], d = [0, 0, 0];
  for (let i = 0; i < NU; i++) {
    const u = (i / NU) * 6.2832;
    curve(u, c);
    curve(u + 1e-3, d);
    let tx = d[0] - c[0], ty = d[1] - c[1], tz = d[2] - c[2];
    const tl = Math.hypot(tx, ty, tz);
    tx /= tl; ty /= tl; tz /= tl;
    // A frame across the tube: one axis in the xy plane, the other from a cross product.
    let ax = ty, ay = -tx;
    const al = Math.hypot(ax, ay);
    ax /= al; ay /= al;
    const bx = -tz * ay, by = tz * ax, bz = tx * ay - ty * ax;
    for (let j = 0; j < NV; j++) {
      const v = (j / NV) * 6.2832;
      const cv = Math.cos(v), sv = Math.sin(v);
      const k = i * NV + j;
      nx[k] = ax * cv + bx * sv;
      ny[k] = ay * cv + by * sv;
      nz[k] = bz * sv;
      px[k] = c[0] + TUBE * nx[k];
      py[k] = c[1] + TUBE * ny[k];
      pz[k] = c[2] + TUBE * nz[k];
    }
  }
  const D = 11; // eye to centre
  const ASPECT = 0.5;
  // Spin about the knot's own axis, nodding between 0.2 and 0.76 rad of tilt
  // so the over and under strands separate in depth as it turns.
  const view = (t: number) => [t * 0.3, 0.48 - 0.28 * Math.cos(t * 0.35)];
  let mx = 0, my = 0;
  for (let a = 0; a < 6.283; a += 0.1) {
    for (let T = 0.2; T <= 0.77; T += 0.07) {
      const cS = Math.cos(a), sS = Math.sin(a), cT = Math.cos(T), sT = Math.sin(T);
      for (let k = 0; k < NU * NV; k += 7) {
        const x = cS * px[k] - sS * py[k];
        const y = cT * (sS * px[k] + cS * py[k]) - sT * pz[k];
        const z = sT * (sS * px[k] + cS * py[k]) + cT * pz[k];
        mx = Math.max(mx, Math.abs(x) / (D - z));
        my = Math.max(my, Math.abs(y) / (D - z));
      }
    }
  }
  const K = Math.min((cols - 2) / 2 / mx, (rows - 2) / 2 / ASPECT / my);
  const GAP = TUBE * 0.9; // a depth step this big, between far apart parts of the knot, is a crossing
  const m = Math.hypot(-0.35, 0.45, 1);
  const [lx, ly, lz] = [-0.35 / m, 0.45 / m, 1 / m];
  // Half vector for a specular glint, between the light and the eye (+z).
  const hm = Math.hypot(lx, ly, lz + 1);
  const [hx, hy, hz] = [lx / hm, ly / hm, (lz + 1) / hm];
  const n = cols * rows;
  const out = new Array<string>(n);
  const depth = new Float32Array(n);
  const along = new Int16Array(n); // which step of the centre line each cell shows
  const cut = new Uint8Array(n);
  const stack = new Int32Array(n), part = new Int32Array(n);
  const N = RAMP.length - 1;

  return (t, { paper = false } = {}) => {
    const [S, T] = view(t);
    const cS = Math.cos(S), sS = Math.sin(S), cT = Math.cos(T), sT = Math.sin(T);
    const r00 = cS, r01 = -sS;
    const r10 = cT * sS, r11 = cT * cS, r12 = -sT;
    const r20 = sT * sS, r21 = sT * cS, r22 = cT;
    out.fill(" ");
    depth.fill(0);
    for (let k = 0; k < NU * NV; k++) {
      const wz = r20 * nx[k] + r21 * ny[k] + r22 * nz[k];
      if (wz < -0.15) continue; // faces away from the eye
      const x = r00 * px[k] + r01 * py[k];
      const y = r10 * px[k] + r11 * py[k] + r12 * pz[k];
      const z = r20 * px[k] + r21 * py[k] + r22 * pz[k];
      const ooz = 1 / (D - z);
      const col = Math.floor(cols / 2 + K * ooz * x);
      const row = Math.floor(rows / 2 - K * ASPECT * ooz * y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const q = col + row * cols;
      if (z + 20 <= depth[q]) continue;
      depth[q] = z + 20;
      along[q] = (k / NV) | 0;
      const wx = r00 * nx[k] + r01 * ny[k];
      const wy = r10 * nx[k] + r11 * ny[k] + r12 * nz[k];
      const diff = Math.max(0, wx * lx + wy * ly + wz * lz);
      const spec = Math.max(0, wx * hx + wy * hy + wz * hz) ** 24;
      const i = Math.round(Math.min(1, 0.08 + diff * 0.8 + spec * 0.5) * N);
      out[q] = RAMP[paper ? N - i : i];
    }
    // Where one strand passes over another, clear the one cell of the lower
    // strand beside the upper one's outline, so the crossing reads as a gap.
    const over = (q: number, p: number) => {
      if (depth[p] <= depth[q] + GAP) return false;
      const s = Math.abs(along[p] - along[q]);
      return Math.min(s, NU - s) > NU / 16;
    };
    for (let q = 0; q < n; q++) {
      const c = q % cols;
      cut[q] = depth[q] > 0 && ((c > 0 && over(q, q - 1)) || (c < cols - 1 && over(q, q + 1)) ||
        (q >= cols && over(q, q - cols)) || (q < n - cols && over(q, q + cols))) ? 1 : 0;
    }
    for (let q = 0; q < n; q++) if (cut[q]) { out[q] = " "; depth[q] = 0; }
    // Drop the small scraps a gap can leave, so each strand stays one piece.
    part.fill(0);
    for (let q = 0; q < n; q++) {
      if (out[q] === " " || part[q]) continue;
      let top = 0, size = 0;
      stack[top++] = q;
      part[q] = 1;
      const seen: number[] = [];
      while (top) {
        const p = stack[--top], c = p % cols;
        seen.push(p);
        size++;
        for (const o of [c > 0 ? p - 1 : -1, c < cols - 1 ? p + 1 : -1, p - cols, p + cols]) {
          if (o >= 0 && o < n && !part[o] && out[o] !== " ") { part[o] = 1; stack[top++] = o; }
        }
      }
      if (size < 7) for (const p of seen) out[p] = " ";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
