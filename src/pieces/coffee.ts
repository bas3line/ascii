/*
 * coffee: a cup of coffee on its saucer, lit from the upper left, with a few
 * thin wisps of steam lifting off the surface and curling as they climb.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "coffee",
  category: "objects",
  note: "steam curling up from a cup of coffee on its saucer",
  cols: 52,
  rows: 24,
  fps: 20,
} satisfies Meta;

type Vec = [number, number, number];

const RAMP = " .:-=+*#%@";
const TILT = 0.34; // how steeply we look down at the table
const H = 7.6, RT = 6.2; // the cup's height and its radius at the rim, in rows
const HC = H - 0.55; // the coffee's level
const PERIOD = 6; // seconds before the steam repeats
// Wisps: x and z where they leave the coffee, height in rows, phase, lean.
const WISPS: [number, number, number, number, number][] = [
  [-2.4, 0.6, 11, 0, -0.12],
  [0.3, -1.4, 14, 2.2, 0.05],
  [2.9, 0.5, 10, 4.1, 0.15],
];
// The saucer turned on a lathe, as [radius, height]: a flat well, rising to a rounded lip.
const SAUCER: [number, number][] = [[0, 0], [4.4, 0], [6.5, 0.12], [8.7, 0.45], [9.9, 0.78], [10.4, 0.92], [10.6, 0.8], [10.55, 0.55], [10.2, 0.4]];

const cupR = (h: number) => RT * (0.62 + 0.38 * Math.sin((Math.PI / 2) * Math.min(1, Math.max(0, h) / H)));
const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const norm = (x: number, y: number, z: number): Vec => {
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m];
};

export default function coffee(): Frame {
  const { cols, rows } = meta;
  const SX = 2, SY = 4; // looks per cell, across and down
  const W = cols * SX, HH = rows * SY, N = cols * rows;
  const depth = new Float32Array(W * HH).fill(-1e9);
  const lum = new Float32Array(W * HH).fill(-1);
  const part = new Uint8Array(W * HH); // 1 saucer, 2 cup, 3 lip, 4 coffee, 5 handle
  const cs = Math.sqrt(1 - TILT * TILT), sn = TILT;
  const CX = cols / 2 - 1.5, BASE = rows - 4.4; // the saucer's centre, a little left so the handle fits
  const L = norm(-0.62, 0.62, 0.48);
  const toCell = (x: number, y: number, z: number): [number, number] => [CX + 2 * x, BASE - (y * cs - z * sn)];

  let id = 1;
  const plot = (x: number, y: number, z: number, n: Vec, albedo: number, extra = 0) => {
    const [c, r] = toCell(x, y, z);
    const px = Math.floor(c * SX), py = Math.floor(r * SY);
    if (px < 0 || px >= W || py < 0 || py >= HH) return;
    const k = py * W + px, d = z * cs + y * sn;
    if (d <= depth[k]) return;
    depth[k] = d;
    part[k] = id;
    const diff = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    lum[k] = albedo * (0.1 + 0.9 * diff) + extra;
  };
  // A glaze's glint, where the light bounces toward us.
  const HV = norm(L[0], L[1] + sn, L[2] + cs);
  const glint = (n: Vec, p: number) => Math.max(0, n[0] * HV[0] + n[1] * HV[1] + n[2] * HV[2]) ** p;
  // Is the cup in the way between this point and the light?
  const shadowed = (x: number, y: number, z: number) => {
    for (let s = 0.3; s < 16; s += 0.25) {
      const yy = y + L[1] * s;
      if (yy > H) return false;
      if (yy > 0 && Math.hypot(x + L[0] * s, z + L[2] * s) < cupR(yy)) return true;
    }
    return false;
  };

  // The saucer: lit more on the left as it turns from the light, shaded by the cup
  // and darkened close round its foot.
  for (let s = 0; s < SAUCER.length - 1; s++) {
    const [r1, y1] = SAUCER[s], [r2, y2] = SAUCER[s + 1];
    const len = Math.hypot(r2 - r1, y2 - y1), nr = -(y2 - y1) / len, ny = (r2 - r1) / len;
    for (let f = 0; f <= 1; f += 0.04 / len) {
      const p = r1 + (r2 - r1) * f, y = y1 + (y2 - y1) * f;
      for (let a = 0; a < 2 * Math.PI; a += 0.09 / Math.max(p, 0.5)) {
        const x = p * Math.cos(a), z = p * Math.sin(a), n = norm(nr * Math.cos(a), ny, nr * Math.sin(a));
        const side = 0.78 - 0.22 * (x / 10.6);
        const ao = 0.35 + 0.65 * smooth(cupR(0) - 0.1, cupR(0) + 1.4, p);
        plot(x, y, z, n, 0.78 * side * ao * (shadowed(x, y, z) ? 0.35 : 1), 0.25 * glint(n, 12));
      }
    }
  }
  // The cup, outside and in, its rounded lip, and the coffee.
  id = 2;
  for (let h = 0; h <= H; h += 0.05) {
    const r = cupR(h), dr = (cupR(h + 0.05) - cupR(h - 0.05)) / 0.1;
    for (let a = 0; a < 2 * Math.PI; a += 0.1 / r) {
      const ca = Math.cos(a), sa = Math.sin(a);
      if (sa > -0.3) {
        const n = norm(ca, -dr, sa);
        plot(r * ca, h, r * sa, n, 0.95, 0.35 * glint(n, 10));
      }
      if (h > HC && sa < 0.3) plot((r - 0.4) * ca, h, (r - 0.4) * sa, norm(-ca, dr, -sa), 0.75);
    }
  }
  // The lip, lit as one rounded edge facing out and up: bright on the left, falling off to the right.
  id = 3;
  const R = cupR(H);
  for (let v = 0; v <= Math.PI; v += 0.12)
    for (let a = 0; a < 2 * Math.PI; a += 0.06 / R) {
      const p = R - 0.2 - 0.2 * Math.cos(v), y = H + 0.12 * Math.sin(v), ca = Math.cos(a), sa = Math.sin(a);
      plot(p * ca, y, p * sa, norm(0.6 * ca, 0.8, 0.6 * sa), 0.95, 0.12);
    }
  // The coffee: a dark pool, a paler ring of crema at the wall, one glint of the light.
  id = 4;
  const RC = cupR(HC) - 0.4;
  for (let p = 0; p < RC; p += 0.08)
    for (let a = 0; a < 2 * Math.PI; a += 0.08 / Math.max(p, 0.5)) {
      const x = p * Math.cos(a), z = p * Math.sin(a);
      const shine = Math.exp(-(((x + 2.4) / 1.1) ** 2 + ((z + 1.4) / 0.8) ** 2));
      plot(x, HC, z, [0, 1, 0], 0.04 + 0.16 * smooth(0.82 * RC, RC, p), 0.85 * shine);
    }
  // The handle: a thin loop on the right, standing out from the wall at z = 0.
  const HY = 4.1, AX = 3.9, AY = 2.6, TUBE = 0.42, X0 = cupR(HY) - 1.3;
  const loop = (u: number): [number, number] => [X0 + AX * Math.cos(u), HY + AY * Math.sin(u)];

  // Down to cells: the lip wins any cell it is in, so it reads as one line; elsewhere
  // the mean light where most looks land, and a soft edge where a few do.
  const still: (number | string | null)[] = [], kind: number[] = [];
  for (let k = 0; k < N; k++) {
    const c = k % cols, r = Math.floor(k / cols);
    let n = 0, sum = 0, low = 0, lip = 0, lipSum = 0, owner = 0;
    for (let j = 0; j < SY; j++)
      for (let i = 0; i < SX; i++) {
        const q = (r * SY + j) * W + c * SX + i, v = lum[q];
        if (v < 0) continue;
        n++;
        sum += v;
        if (j >= SY / 2) low++;
        if (part[q] === 3) lip++, (lipSum += v);
        owner = Math.max(owner, part[q] === 1 ? 1 : 2);
      }
    kind.push(owner);
    still.push(lip >= 2 ? Math.min(1, lipSum / lip) : n === 0 ? null : n < 3 ? (low * 2 > n ? "_" : "'") : Math.min(1, sum / n));
  }
  // One thin dark line where the cup stands in front of the saucer, darkest under its foot.
  const foot = toCell(0, 0, 0)[1];
  const was = kind.slice();
  for (let k = cols; k < N - 1; k++) {
    if (was[k] !== 1 || typeof still[k] !== "number") continue;
    if (was[k - cols] === 2 && k / cols > foot - 0.5) still[k] = Math.min(still[k] as number, 0.06);
    else if (was[k - 1] === 2 || was[k + 1] === 2) (still[k] as number) *= 0.4;
  }
  // The handle, a cell thick: each cell near its line lit by the tube's own normal there.
  // Through its loop the saucer is in shade, so the hole reads open.
  const ring: [number, number][] = [];
  for (let u = -2.1; u <= 2.1; u += 0.02) ring.push(loop(u));
  for (let k = 0; k < N; k++) {
    const c = k % cols, r = Math.floor(k / cols);
    const x = (c + 0.5 - CX) / 2, y = (BASE - (r + 0.5)) / cs;
    if (x < cupR(y) - 0.1 || x > X0 + AX + 1) continue;
    let best = 9, ox = 0, oy = 0;
    for (const [lx, ly] of ring) {
      const d = Math.hypot(x - lx, y - ly);
      if (d < best) (best = d), (ox = (x - lx) / TUBE), (oy = (y - ly) / TUBE);
    }
    if (best < TUBE + 0.12) {
      const n = norm(ox, oy, Math.sqrt(Math.max(0.05, 1 - ox * ox - oy * oy)));
      still[k] = Math.min(1, 0.1 + 0.85 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) + 0.3 * glint(n, 10));
      continue;
    }
    const inside = (x - X0) ** 2 / AX ** 2 + (y - HY) ** 2 / AY ** 2 < 1;
    if (inside && kind[k] !== 2) still[k] = null;
  }
  const top = Math.floor(toCell(0, HC, 0)[1]);

  // Where a wisp is at height s rows: a bend that rides up it and grows as it climbs.
  const W0 = WISPS.map(([x, z]) => toCell(x, HC, z));
  const colAt = (i: number, s: number, t: number) => {
    const [, , len, ph, lean] = WISPS[i];
    const f = s / len, w = (2 * Math.PI * t) / PERIOD;
    return W0[i][0] + 2 * (lean * s + (0.2 + 1.7 * f ** 1.5) * Math.sin(0.75 * s - 2 * w + ph) + 0.3 * f * Math.sin(w + ph));
  };

  return (t, { paper = false } = {}) => {
    const out = still.map((v) => (v === null ? " " : typeof v === "string" ? v : RAMP[Math.max(1, Math.round((paper ? 1 - v : v) * 9))]));
    const free = (k: number, r: number) => still[k] === null || (r >= top && typeof still[k] === "number" && still[k] < 0.3);
    WISPS.forEach(([, , len, ph], i) => {
      for (let r = Math.floor(W0[i][1] - 0.5); r >= 0; r--) {
        const s = W0[i][1] - (r + 0.5);
        if (s > len) break;
        const c = colAt(i, s, t), cc = Math.floor(c), k = r * cols + cc;
        if (cc < 0 || cc >= cols || !free(k, r)) continue;
        // Faint off the surface and at the top, with breaks that rise with it.
        const thin = 0.5 + 0.5 * Math.sin(0.55 * s - (2 * Math.PI * t) / PERIOD + ph * 2);
        const a = smooth(0.3, 1.8, s) * (1 - smooth(0.6 * len, len, s)) * (0.3 + 0.7 * thin);
        if (a < 0.2) continue;
        const up = colAt(i, s + 1, t), dn = colAt(i, s - 1, t);
        const lean = (up - dn) / 2, bow = c - (up + dn) / 2;
        out[k] = a < 0.32 ? "." : Math.abs(lean) > 0.7 ? (lean > 0 ? "/" : "\\") : bow > 0.15 ? ")" : bow < -0.15 ? "(" : "|";
        // Where it swings across faster than it climbs, it curls over: a run along the row.
        const run = Math.round(up - c), n = Math.abs(run), dir = Math.sign(run);
        if (a < 0.32 || n < 2) continue;
        out[k] = "_";
        for (let j = 1; j < n; j++)
          if (cc + dir * j >= 0 && cc + dir * j < cols && free(k + dir * j, r)) out[k + dir * j] = j < n - 1 ? "_" : dir > 0 ? "/" : "\\";
      }
    });
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
