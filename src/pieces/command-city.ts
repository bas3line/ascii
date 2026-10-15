/*
 * command city: a city at night seen from high above at an angle. Its main
 * boulevards are laid out as the Command Code mark, a command key cut from a
 * rounded square, so the key burns in sodium light against the dark blocks.
 * Traffic streaks round the key's loops, the square is ringed by a black
 * canal, windows are lit in the towers, and a low mist drifts across.
 *
 * The key is the library's own command code logo: its ink grid is read into
 * a mask, sampled smoothly onto the ground plane, and the ground is seen in
 * perspective. Buildings stand on that plane as a height field, each screen
 * cell walking down its ray to find the roof or the wall it meets.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "command city",
  category: "scenes",
  note: "a night city whose boulevards trace the command key in streetlight",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#060607",
  palette: [
    "#101012", "#17171a", "#1f1f23", "#29292e", "#34343a", "#414148", "#505058", "#62626a",
    "#76767e", "#8c8c93", "#a4a4aa", "#bdbdc2", "#d6d6da", "#ececef", "#ffffff",
    "#3a2a1c", "#5a3c20", "#7e5224", "#a86a2a", "#cf8433", "#ee9e45", "#ffb860", "#ffcf88", "#ffe4b4", "#fff3dc",
    "#c9d3e6", "#8d99b0",
    "#ff7a3a", "#c0522a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// The camera: the horizon far above the frame, a row where the ground is drawn
// at its own scale, and how much the tilt squashes the ground up the screen.
const YH = -260, YM = 50, TILT = 1.5, VOFF = 6;
const CX = 100;
const LS = 1.9; // ground units to one column of the logo grid (a row is two)
const DMAX = 9; // the tallest wall, in rows

// The Command Code mark, from command-code.ts: ink is the rounded square,
// the gaps inside it are the command key.
const INK = String.raw`

          00000000000000000000000000000000000000000000
      000000000000000000000000000000000000000000000000000
     000000000000000000000000000000000000000000000000000000
    00000000000000000000000000000000000000000000000000000000
   0000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
  0000000000000000      0000000000000000      0000000000000000
  0000000000000    000    000000000000    000    0000000000000
  000000000000   0000000   0000000000   0000000   000000000000
  000000000000   0000000   000000000    0000000   000000000000
  0000000000000   000000   000000000    000000   0000000000000
  00000000000000                                00000000000000
  0000000000000000000000    00000000    0000000000000000000000
  0000000000000000000000   000000000    0000000000000000000000
  0000000000000000000000   000000000    0000000000000000000000
  0000000000000000000000   000000000    0000000000000000000000
  0000000000000000000000   000000000    0000000000000000000000
  000000000000000000                        000000000000000000
  00000000000000                                00000000000000
  000000000000    000000   000000000    000000   0000000000000
  000000000000   0000000   0000000000   0000000   000000000000
  000000000000    000000   0000000000   000000    000000000000
  0000000000000     00    000000000000    00    00000000000000
  0000000000000000     000000000000000000     0000000000000000
  00000000000000000000000000000000000000000000000000000000000
   0000000000000000000000000000000000000000000000000000000000
    00000000000000000000000000000000000000000000000000000000
     000000000000000000000000000000000000000000000000000000
       00000000000000000000000000000000000000000000000000
          00000000000000000000000000000000000000000000

`;
const LC = 64, LR = 32;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise, wrapping every `period` lattice cells in x when period > 0.
function noise(x: number, y: number, period: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let x0 = xi, x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }
  const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, period: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, period * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// Screen to ground: columns spread and rows stretch with distance.
const scaleAt = (y: number) => (y - YH) / (YM - YH);
const groundV = (y: number) => TILT * (YM - YH) * (1 - (YM - YH) / (y - YH)) + VOFF;

export default function commandCity(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);

  // Nearest palette colour, cached on a 32-step cube.
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the mark, read off the logo grid -----------------------------------
  const grid = INK.slice(1, -1).split("\n").map((line) => line.padEnd(LC));
  const ink = new Float32Array(LC * LR);
  const fill = new Float32Array(LC * LR);
  for (let r = 0; r < LR; r++) {
    const line = grid[r] || "";
    const a = line.search(/\S/), b = line.trimEnd().length - 1;
    for (let c = 0; c < LC; c++) {
      ink[r * LC + c] = line[c] && line[c] !== " " ? 1 : 0;
      fill[r * LC + c] = a >= 0 && c >= a && c <= b ? 1 : 0;
    }
  }
  // the pieces of ink inside the square: the four dots the loops wind round,
  // and the middle block the bars frame
  const comp = new Int32Array(LC * LR).fill(-1);
  const parts: { n: number; c: number; r: number }[] = [];
  for (let s = 0; s < LC * LR; s++) {
    if (!ink[s] || comp[s] >= 0) continue;
    const id = parts.length, part = { n: 0, c: 0, r: 0 };
    const stack = [s];
    comp[s] = id;
    while (stack.length) {
      const q = stack.pop()!;
      const qc = q % LC, qr = (q / LC) | 0;
      part.n++, (part.c += qc + 0.5), (part.r += qr + 0.5);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = qc + dc, nr = qr + dr;
        if (nc < 0 || nr < 0 || nc >= LC || nr >= LR) continue;
        const o = nr * LC + nc;
        if (ink[o] && comp[o] < 0) (comp[o] = id), stack.push(o);
      }
    }
    part.c /= part.n, (part.r /= part.n);
    parts.push(part);
  }
  parts.sort((a, b) => b.n - a.n);
  const mid = parts[1];
  const LCX = mid.c, LCY = mid.r; // the mark is centred on its middle block
  // logo grid to ground, and back
  const gx = (c: number) => (c - LCX) * LS;
  const gy = (r: number) => (r - LCY) * 2 * LS;
  const dots = parts.slice(2, 6).map((p) => [gx(p.c), gy(p.r)]);

  const sample = (g: Float32Array, u: number, v: number) => {
    const c = u / LS + LCX - 0.5, r = v / (2 * LS) + LCY - 0.5;
    const ci = Math.floor(c), ri = Math.floor(r), fc = c - ci, fr = r - ri;
    const at = (cc: number, rr: number) => (cc < 0 || rr < 0 || cc >= LC || rr >= LR ? 0 : g[rr * LC + cc]);
    const a = at(ci, ri), b = at(ci + 1, ri), cc = at(ci, ri + 1), d = at(ci + 1, ri + 1);
    return a + (b - a) * fc + (cc - a) * fr + (a - b - cc + d) * fc * fr;
  };
  const keyAt = (u: number, v: number) => smooth(0.3, 0.7, sample(fill, u, v)) * (1 - smooth(0.3, 0.7, sample(ink, u, v)));
  const squareAt = (u: number, v: number) => smooth(0.3, 0.7, sample(fill, u, v));

  // The key's centre lines: a loop round each dot, joined by straight bars.
  // The loop's radius is where the key's stroke is centred beside a dot.
  let rsum = 0, rn = 0;
  for (const [du, dv] of dots) {
    for (const dir of [-1, 1]) {
      let a = -1, b = -1;
      for (let s = 0; s < 30; s += 0.1) {
        const k = keyAt(du + dir * s, dv);
        if (k > 0.5 && a < 0) a = s;
        if (a >= 0 && k <= 0.5) {
          b = s;
          break;
        }
      }
      if (a >= 0 && b > a) (rsum += (a + b) / 2), rn++;
    }
  }
  const RMID = rsum / rn;
  const left = Math.min(...dots.map((d) => d[0])), right = Math.max(...dots.map((d) => d[0]));
  const top = Math.min(...dots.map((d) => d[1])), bottom = Math.max(...dots.map((d) => d[1]));
  const barX = [left + RMID, right - RMID], barY = [top + RMID, bottom - RMID];

  // Where a point on the key is along its road, and which side of the middle.
  const route = (u: number, v: number): [number, number] => {
    let bi = 0, bd = 1e9;
    for (let i = 0; i < 4; i++) {
      const d = Math.hypot(u - dots[i][0], v - dots[i][1]);
      if (d < bd) (bd = d), (bi = i);
    }
    const [du, dv] = dots[bi];
    const inward = Math.sign(-du) === Math.sign(u - du) && Math.sign(-dv) === Math.sign(v - dv);
    if (!inward && bd < RMID * 1.9) return [Math.atan2(v - dv, u - du) * RMID + bi * 97, bd - RMID];
    const hy = Math.min(Math.abs(v - barY[0]), Math.abs(v - barY[1]));
    const vx = Math.min(Math.abs(u - barX[0]), Math.abs(u - barX[1]));
    if (hy < vx) {
      const by = Math.abs(v - barY[0]) < Math.abs(v - barY[1]) ? barY[0] : barY[1];
      return [u + 300, v - by];
    }
    const bx = Math.abs(u - barX[0]) < Math.abs(u - barX[1]) ? barX[0] : barX[1];
    return [v + 600, u - bx];
  };

  // How far each bit of ground is from the square's edge, in ground units,
  // negative inside: a chamfer distance over a fine raster of the square.
  const DR = 0.5, DU0 = -140, DV0 = -130, DW = 560, DH = 520;
  const dIn = new Float32Array(DW * DH), dOut = new Float32Array(DW * DH);
  for (let j = 0; j < DH; j++)
    for (let i = 0; i < DW; i++) {
      const inside = squareAt(DU0 + (i + 0.5) * DR, DV0 + (j + 0.5) * DR) > 0.5;
      dIn[j * DW + i] = inside ? 1e4 : 0;
      dOut[j * DW + i] = inside ? 0 : 1e4;
    }
  for (const f of [dIn, dOut]) {
    const a = DR, b = DR * Math.SQRT2;
    for (let j = 0; j < DH; j++)
      for (let i = 0; i < DW; i++) {
        const o = j * DW + i;
        if (i > 0) f[o] = Math.min(f[o], f[o - 1] + a);
        if (j > 0) {
          f[o] = Math.min(f[o], f[o - DW] + a);
          if (i > 0) f[o] = Math.min(f[o], f[o - DW - 1] + b);
          if (i < DW - 1) f[o] = Math.min(f[o], f[o - DW + 1] + b);
        }
      }
    for (let j = DH - 1; j >= 0; j--)
      for (let i = DW - 1; i >= 0; i--) {
        const o = j * DW + i;
        if (i < DW - 1) f[o] = Math.min(f[o], f[o + 1] + a);
        if (j < DH - 1) {
          f[o] = Math.min(f[o], f[o + DW] + a);
          if (i < DW - 1) f[o] = Math.min(f[o], f[o + DW + 1] + b);
          if (i > 0) f[o] = Math.min(f[o], f[o + DW - 1] + b);
        }
      }
  }
  const edgeAt = (u: number, v: number) => {
    const i = Math.max(0, Math.min(DW - 1, Math.floor((u - DU0) / DR)));
    const j = Math.max(0, Math.min(DH - 1, Math.floor((v - DV0) / DR)));
    const o = j * DW + i;
    return dOut[o] > 0 ? dOut[o] : -dIn[o];
  };

  // --- the ground plane, under every cell -----------------------------------
  const BLK = 9.5, ST = 1.6; // a city block, and the side street round it
  const RING = 2.6, CANAL = 7; // the boulevard round the square, the water past it
  const gU = new Float32Array(N), gV = new Float32Array(N);
  const key = new Float32Array(N), sq = new Float32Array(N), edge = new Float32Array(N);
  const hgt = new Float32Array(N), lot = new Int32Array(N);
  for (let y = 0; y < H; y++) {
    const s = scaleAt(y + 0.5), v = groundV(y + 0.5);
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      const u = (x + 0.5 - CX) / s;
      gU[k] = u, (gV[k] = v);
      key[k] = keyAt(u, v);
      const e = edgeAt(u, v);
      edge[k] = e;
      sq[k] = smooth(1, -1, e);
      if (key[k] > 0.08 || (e > -RING - 0.8 && e < CANAL + 1.5)) continue;
      // blocks of lots, each lot a building of its own height
      const bu = Math.floor(u / BLK), bv = Math.floor(v / BLK);
      const fu = u - bu * BLK, fv = v - bv * BLK;
      if (fu < ST || fv < ST) continue;
      const split = hash(bu, bv) > 0.5;
      const lu = fu < (split ? BLK * 0.55 : BLK + 1) ? 0 : 1, lv = fv < BLK * 0.58 ? 0 : 1;
      const id = ((bu + 500) * 1000 + (bv + 500)) * 4 + lu * 2 + lv;
      // a lane between lots
      if ((split && Math.abs(fu - BLK * 0.55) < 0.35) || Math.abs(fv - BLK * 0.58) < 0.35) continue;
      const tall = hash(id, 7);
      const inside = e < 0;
      const units = inside ? 1.2 + 4.8 * tall * tall + (tall > 0.93 ? 4 : 0) : 0.8 + 3 * tall * tall;
      lot[k] = id;
      hgt[k] = units * 0.75 * s;
    }
  }
  // Keep towers from hiding the key: a wall in front of it stops short of it.
  for (let x = 0; x < W; x++) {
    let rows = 99;
    for (let y = 0; y < H; y++) {
      const k = y * W + x;
      if (key[k] > 0.35 || (edge[k] > -RING && edge[k] < 0.4)) rows = 0;
      else rows++;
      if (hgt[k] > rows - 0.6) hgt[k] = Math.max(0, rows - 0.6);
    }
  }

  // The key's light spilling onto everything near it: blurred twice.
  const glow = new Float32Array(N), tmp = new Float32Array(N);
  glow.set(key);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let d = -3; d <= 3; d++) s += glow[y * W + Math.min(W - 1, Math.max(0, x + d))];
        tmp[y * W + x] = s / 7;
      }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let d = -2; d <= 2; d++) s += tmp[Math.min(H - 1, Math.max(0, y + d)) * W + x];
        glow[y * W + x] = s / 5;
      }
  }

  // --- each cell's still colour, and what moves on it ----------------------
  const baseR = new Float32Array(N), baseG = new Float32Array(N), baseB = new Float32Array(N);
  const floors = new Float32Array(N);
  // How bright a cell's dot may be drawn: lights at full, roofs and walls a
  // grey, so the dot's colour keeps the material's tone.
  const inks = new Float32Array(N);
  const road = new Float32Array(N); // how much of the key's road this cell shows
  const rP = new Float32Array(N), rL = new Float32Array(N);
  const water = new Float32Array(N);
  const blink = new Float32Array(N); // lit panes that come and go
  for (let y = 0; y < H; y++) {
    const s = scaleAt(y + 0.5);
    const far = smooth(26, 0, y) * 0.8; // the distance, hazed
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      // walk the ray down from the camera: the first wall or roof it meets
      let hit = 0, at = k;
      for (let d = DMAX; d >= 1; d--) {
        if (y + d >= H) continue;
        const j = (y + d) * W + x;
        if (hgt[j] >= d) {
          hit = d;
          at = j;
          break;
        }
      }
      let cr = 0, cg = 0, cb = 0, floor = 0, ink = 1;
      const warm = key[k] > 0.08 && !hit ? 0 : glow[k] * 0.22;
      const dim = 0.25 + 0.75 * sq[at]; // the city round the square is quieter
      if (hit) {
        const id = lot[at];
        const face = hgt[at] - hit >= 1;
        if (face) {
          // a wall facing us, dark, its windows a grid of lit and unlit
          const z = Math.round(hit);
          const lit = hash(id * 31 + x, z * 7 + 3);
          const on = (x + (id & 1)) % 2 === 0 && lit > 0.5 - 0.2 * sq[at];
          (cr = 0.03), (cg = 0.03), (cb = 0.035);
          ink = 0.45;
          if (on) {
            const b = (0.42 + 0.4 * hash(x * 3 + id, z)) * dim;
            const cool = hash(id, 9) > 0.55;
            cr += b * (cool ? 0.84 : 1), cg += b * (cool ? 0.88 : 0.84), cb += b * (cool ? 1 : 0.6);
            ink = 0.7 + 0.3 * sq[at];
            if (hash(x + id * 5, z * 13) > 0.9) blink[k] = 1;
          }
        } else {
          // a flat roof, grey in the city's glow, now and then a lamp on it
          const tone = (0.17 + 0.15 * hash(id, 4)) * dim * (0.8 + 0.2 * Math.min(1, hgt[at] / 3));
          (cr = tone), (cg = tone), (cb = tone * 1.06);
          ink = 0.42 + 0.18 * hash(id, 5);
          if (hash(id, 11) > 0.88 && hash(x, y + id) > 0.8) (cr = 0.8 * dim), (cg = 0.8 * dim), (cb = 0.86 * dim), (ink = 1);
        }
      } else if (key[k] < 0.08 && edge[k] > -RING && edge[k] < 0.4) {
        // the boulevard round the square: white light, the mark's outline
        const lamp = (((gU[k] + gV[k]) % 4) + 4) % 4 < 1.2 ? 1 : 0;
        const b = 0.55 + 0.45 * lamp;
        (cr = b * 0.92), (cg = b * 0.94), (cb = b);
        ink = 0.8 + 0.2 * lamp;
        floor = 0.3;
      } else if (key[k] < 0.08 && edge[k] >= 0.4 && edge[k] < CANAL) {
        // black water round the square, a lamp now and then on the far bank
        (cr = 0.008), (cg = 0.01), (cb = 0.014);
        water[k] = 0.12 + 0.8 * Math.exp(-(edge[k] - 0.4) / 1.6); // the boulevard's lights on it
        if (edge[k] > CANAL - 0.9 && hash(Math.round(gU[k] / 3), Math.round(gV[k] / 3)) > 0.5) (cr = 0.7), (cg = 0.52), (cb = 0.3);
      } else if (key[k] > 0.08) {
        // the key: sodium-lit tarmac, lamps along both kerbs
        const kk = key[k];
        const [p, l] = route(gU[k], gV[k]);
        rP[k] = p, (rL[k] = l);
        road[k] = kk;
        const kerb = smooth(0.95, 0.55, kk);
        const lamp = kerb * ((((p % 4) + 4) % 4) < 1.4 ? 1 : 0.55);
        const b = (0.4 + 0.6 * lamp) * smooth(0.08, 0.45, kk);
        (cr = b), (cg = b * 0.66), (cb = b * 0.32);
        floor = 0.55 * smooth(0.1, 0.5, kk);
      } else {
        // side streets and lanes: dark, with a lamp at most crossings
        const u = gU[k], v = gV[k];
        const fu = ((u % BLK) + BLK) % BLK, fv = ((v % BLK) + BLK) % BLK;
        const street = fu < ST || fv < ST;
        const base = (street ? 0.05 : 0.02) * dim;
        (cr = base), (cg = base), (cb = base * 1.1);
        ink = 0.5;
        if (fu < ST && fv < ST && hash(Math.floor(u / BLK), Math.floor(v / BLK)) > 0.3) {
          (cr = 0.8 * dim), (cg = 0.6 * dim), (cb = 0.34 * dim), (ink = 1);
        }
      }
      // the key's light falling on its neighbours, warm
      cr += warm * 0.9, cg += warm * 0.6, cb += warm * 0.3;
      if (warm > 0.02) ink = Math.min(1, ink + warm * 2);
      // the far city sinks into haze
      cr = cr * (1 - 0.6 * far) + 0.025 * far;
      cg = cg * (1 - 0.6 * far) + 0.025 * far;
      cb = cb * (1 - 0.6 * far) + 0.03 * far;
      baseR[k] = cr, (baseG[k] = cg), (baseB[k] = cb);
      floors[k] = floor * (0.6 + 0.4 * s);
      inks[k] = ink * (1 - 0.3 * far);
    }
  }

  // --- the mist: a wrapping sheet of noise, banded low, that drifts --------
  const MW = 400;
  const mist = new Float32Array(MW * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < MW; x++) {
      const n = fbm(x * 0.016, y * 0.055, 4, MW * 0.016);
      const band = (0.5 + 0.5 * Math.sin(y * 0.09 + 0.6)) * (0.45 + 0.55 * smooth(10, 60, y));
      mist[y * MW + x] = smooth(0.45, 0.75, n) * band;
    }

  return (t, { color } = {}) => {
    const drift = t * 2.2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        let cr = baseR[k], cg = baseG[k], cb = baseB[k];
        let floor = floors[k], ink = inks[k];

        const rd = road[k];
        if (rd > 0.3) {
          // light streaks: headlights one way, tail lights the other, in lanes
          const l = rL[k], dir = l > 0 ? 1 : -1;
          const lane = Math.floor(Math.abs(l) / 1.3);
          const off = hash(lane, dir + 5) * 40;
          const sp = 7 + 3 * hash(lane, dir + 9);
          const ph = (((rP[k] - dir * t * sp + off) % 13) + 13) % 13;
          const len = 7;
          if (ph < len) {
            const a = dir > 0 ? ph / len : 1 - ph / len;
            const b = Math.min(1, a * a * 1.3) * smooth(0.3, 0.75, rd);
            if (dir > 0) (cr += (1 - cr) * b), (cg += (0.97 - cg) * b), (cb += (0.9 - cb) * b);
            else (cr += (1 - cr) * b), (cg += (0.34 - cg) * b), (cb += (0.2 - cb) * b);
          }
        }
        if (water[k] > 0) {
          // the boulevard's lights shaken into ripples
          const w = noise(gU[k] * 0.45 + t * 0.3, gV[k] * 1.2 - t * 0.8, 0);
          const sh = smooth(0.58, 0.85, w) * water[k] * 0.75;
          cr += sh * 0.9, cg += sh * 0.88, cb += sh * 0.84;
        }
        if (blink[k]) {
          const on = Math.sin(t * 0.7 + x * 1.7 + y * 0.9) > -0.2 ? 1 : 0.15;
          cr *= on, cg *= on, cb *= on;
        }
        // the low mist, catching the street light where it passes over it
        const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
        const m0 = mist[y * MW + (ix % MW)], m1 = mist[y * MW + ((ix + 1) % MW)];
        const m = (m0 + (m1 - m0) * fx) * (0.36 - 0.18 * road[k]);
        if (m > 0.005) {
          const lit = 0.2 + glow[k] * 0.6;
          cr = cr * (1 - m) + m * (lit + 0.1), cg = cg * (1 - m) + m * (lit * 0.85 + 0.1), cb = cb * (1 - m) + m * (lit * 0.7 + 0.11);
          floor += m * 0.3;
          ink += (0.6 - ink) * m * 1.5;
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(y & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = ((0.3 + 0.7 * want) / peak) * ink;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
