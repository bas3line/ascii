/*
 * candle: a candle in a brass candlestick. The flame flickers and sways, its
 * glow lighting the wax and the metal, and the candle burns slowly down; when
 * it gutters out the stub is lifted away and a fresh one is set in and lit.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "candle",
  category: "objects",
  note: "a flickering candle burning down in its holder, then renewed",
  cols: 40,
  rows: 30,
  fps: 15,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const SN = 0.4, CS = Math.sqrt(1 - SN * SN); // how steeply we look down on it
const R = 2.1; // the candle's radius, in rows
const FULL = 9.6, STUB = 1.2; // the candle's height new and spent, above the socket
const SOCKET = 11; // where it stands in the holder
// The cycle, in seconds: lit, burning down, guttering, smoke, the stub out, a new one in, a breath.
const STEPS = [1.2, 26, 1.4, 2.4, 1.6, 2.2, 0.5];
const CYCLE = STEPS.reduce((a, b) => a + b, 0);
const T0 = 4.6; // a little way down, with a few drips
// The candlestick, foot to socket, as [radius, height] round its axis.
const STICK: [number, number][] = [
  [4.4, 0], [4.6, 0.3], [4.4, 0.65], [3.6, 0.95], [2.4, 1.25], [1.35, 1.6], [0.82, 2.1], [0.66, 3],
  [0.7, 4.1], [1.05, 4.45], [1.5, 4.9], [1.6, 5.4], [1.45, 5.9], [1.0, 6.2], [0.66, 6.5], [0.6, 7.6],
  [0.6, 8.7], [1.0, 9.1], [2.4, 9.55], [3.8, 9.75], [4.3, 10], [4.35, 10.3], [4.1, 10.35], [3.5, 10.1],
  [2.7, 10.05], [2.45, 10.1], [2.45, 11.15], [2.25, 11.3],
];
// Drips: angle round the front, longest run in rows, seconds into the burn they start, fatness.
const DRIPS: [number, number, number, number][] = [[-1.3, 4.5, 0.5, 0.42], [0.45, 3, 2, 0.34], [1.32, 5, 3.5, 0.42], [-0.5, 2.2, 6, 0.32], [0.95, 3.6, 10, 0.36], [-1.05, 4, 14, 0.38], [0.15, 2.6, 18, 0.3], [1.25, 3, 21, 0.38]];

const hash = (n: number) => {
  let h = Math.imul(n ^ 0x5bd1e995, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const noise = (x: number) => {
  const i = Math.floor(x), u = x - i, e = u * u * (3 - 2 * u);
  return hash(i) + (hash(i + 1) - hash(i)) * e;
};
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (u: number) => clamp(u) * clamp(u) * (3 - 2 * clamp(u));

export default function candle(): Frame {
  const { cols, rows } = meta;
  const SX = 2, SY = 4, W = cols * SX, HH = rows * SY;
  const CX = cols / 2, BASE = rows - 2.4; // the screen row of the foot's centre
  const rowOf = (y: number, z: number) => BASE - (y * CS - z * SN);
  const KEY = [-0.45, 0.35, 0.82]; // the room's light, from the front left
  const km = Math.hypot(KEY[0], KEY[1] + SN, KEY[2] + CS), KH = [KEY[0] / km, (KEY[1] + SN) / km, (KEY[2] + CS) / km];

  // The candlestick, turned on a lathe: the nearest surface behind each look,
  // kept with its position and normal so the flame can light it each frame.
  const depth = new Float32Array(W * HH).fill(-1e9);
  const geo = new Float32Array(W * HH * 6);
  for (let s = 0; s < STICK.length - 1; s++) {
    const [r1, y1] = STICK[s], [r2, y2] = STICK[s + 1];
    const len = Math.hypot(r2 - r1, y2 - y1), nr = (y2 - y1) / len, ny = -(r2 - r1) / len;
    for (let f = 0; f <= 1; f += 0.03 / len) {
      const r = r1 + (r2 - r1) * f, y = y1 + (y2 - y1) * f;
      for (let a = 0; a < 2 * Math.PI; a += 0.08 / Math.max(r, 0.5)) {
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const px = Math.floor((CX + 2 * x) * SX), py = Math.floor(rowOf(y, z) * SY);
        if (px < 0 || px >= W || py < 0 || py >= HH) continue;
        const k = py * W + px, d = z * CS + y * SN;
        if (d <= depth[k]) continue;
        depth[k] = d;
        geo.set([x, y, z, nr * Math.cos(a), ny, nr * Math.sin(a)], k * 6);
      }
    }
  }

  const lum = new Float32Array(W * HH);
  const kind = new Uint8Array(W * HH); // 1 metal, 2 wax
  const solid = new Uint8Array(cols * rows), out: string[] = new Array(cols * rows);

  return (time, { paper = false } = {}) => {
    // Where in the cycle we are: how far burnt, the flame's strength, the candle's lift and fade.
    let k0 = (((T0 + time) % CYCLE) + CYCLE) % CYCLE, step = 0;
    while (k0 > STEPS[step]) k0 -= STEPS[step++];
    const u = k0 / STEPS[step];
    let tb = 0, flame = 1, flare = 0, smoke = -1, lift = 0, fade = 1;
    if (step === 0) (flame = ease(u * 4)), (flare = Math.sin(Math.PI * clamp(u * 1.6)) * (1 - u));
    else if (step === 1) tb = k0;
    else {
      tb = STEPS[1];
      flame = step === 2 ? (1 - u) * (0.6 + 0.4 * noise(time * 14)) : 0;
      if (step === 3) smoke = k0;
      if (step === 4) (lift = 4.5 * ease(u)), (fade = 1 - ease(u * 1.15)), (smoke = STEPS[3] + k0);
      if (step === 5) lift = 13 * (1 - Math.sin((Math.PI / 2) * u));
      if (step >= 5) tb = 0;
    }
    const h = FULL - (FULL - STUB) * (tb / STEPS[1]);
    const yTop = SOCKET + h + lift, ys = SOCKET - 0.6 + lift;

    // The flame: its height, lean and brightness wander, with a gust now and then.
    const gust = clamp((noise(time * 0.45 + 3) - 0.62) * 3);
    const hf = flame * (4.3 + 1.1 * noise(time * 2.3) - 1.3 * gust * noise(time * 9 + 1)) * (1 + 0.7 * flare);
    const sway = 0.4 * (noise(time * 1.2 + 7) - 0.5) + 0.25 * gust * Math.sin(time * 11);
    const bright = Math.min(1.3, flame * (0.75 + 0.25 * noise(time * 3.1 + 11)) + 0.4 * flare);
    const fx = sway * 0.3, fy = yTop + 0.4 + hf * 0.32; // its heart, where the light comes from

    // The wax: a cylinder lit by the room, glowing through near the top; drips are raised runs.
    const wax = (nx: number, nz: number, below: number) => {
      const key = Math.max(0, nx * KEY[0] + nz * KEY[2]);
      const glow = (0.55 * Math.exp(-below / 2.2) + 0.25 * Math.exp(-below / 0.6)) * bright;
      return 0.05 + 0.7 * key * (0.55 + 0.45 * Math.min(1, bright)) + glow * (0.5 + 0.5 * nz);
    };
    // Each drip under way: its foot, the top of its run, and where it sits round the candle.
    const drips: [number, number, number, number, number][] = [];
    for (const [da, dl, start, fat] of DRIPS) {
      const y0 = SOCKET + FULL - (FULL - STUB) * (start / STEPS[1]) + lift - 0.3;
      const run = Math.min(dl, (tb - start) * 0.8);
      if (run <= 0 || y0 - run > yTop - 0.2) continue;
      drips.push([(R + 0.05) * Math.sin(da), (R + 0.05) * Math.cos(da), Math.max(ys, y0 - run), Math.min(y0, yTop - 0.15), fat]);
    }
    for (let k = 0; k < W * HH; k++) {
      const sx = (k % W + 0.5) / SX, sy = (Math.floor(k / W) + 0.5) / SY;
      const x = (sx - CX) / 2;
      let v = -1, d = depth[k], kd = 0;
      if (d > -1e8) {
        const o = k * 6, gx = geo[o], gy = geo[o + 1], gz = geo[o + 2], nx = geo[o + 3], ny = geo[o + 4], nz = geo[o + 5];
        const lx = fx - gx, ly = fy - gy, lz = -gz, ld = Math.hypot(lx, ly, lz);
        const diff = Math.max(0, (nx * lx + ny * ly + nz * lz) / ld);
        // Brass: the flame's light and its glint, and the room's from the left, glinting too.
        const hx = lx / ld, hy = ly / ld + SN, hz = lz / ld + CS, hm = Math.hypot(hx, hy, hz);
        const spec = Math.max(0, (nx * hx + ny * hy + nz * hz) / hm) ** 6;
        const key = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
        const kspec = Math.max(0, nx * KH[0] + ny * KH[1] + nz * KH[2]) ** 6;
        v = 0.08 + (0.4 * diff + 0.7 * spec) * bright / (1 + (ld / 14) ** 2) + 0.16 * key + 0.85 * kspec;
        kd = 1;
      }
      if (fade > 0.02 && Math.abs(x) < R + 0.4) {
        const z = Math.sqrt(Math.max(0, R * R - x * x));
        const yb = (BASE - sy + z * SN) / CS; // the body's front, here
        const zt = (sy - BASE + yTop * CS) / SN; // the top's plane, here
        if (x * x + zt * zt < R * R && zt * CS + yTop * SN > d) {
          // The top: a pool of melted wax lit by the flame, its rim brightest.
          const rim = Math.hypot(x, zt) / R;
          v = (0.3 + 0.35 * bright + 0.25 * bright * rim ** 4) * fade;
          (kd = 2), (d = zt * CS + yTop * SN);
        } else if (Math.abs(x) < R && yb < yTop && yb > ys && z * CS + yb * SN > d) {
          v = wax(x / R, z / R, yTop - yb) * fade;
          (kd = 2), (d = z * CS + yb * SN);
          // A drip throws a thin shadow on the wax to its right.
          for (const [cx, , y1, y0, fat] of drips) if (x > cx + fat * 0.9 && x < cx + fat + 0.32 && yb < y0 && yb > y1 - 0.2) v *= 0.55;
        }
        // The drips, each a rounded run down the side, standing out from it.
        for (const [cx, cz, y1, y0, fat] of drips) {
          const dx = x - cx;
          if (Math.abs(dx) >= fat) continue;
          const dz = Math.sqrt(fat * fat - dx * dx), zz = cz + dz, yy = (BASE - sy + zz * SN) / CS;
          if (yy < y1 + fat && dx * dx + (y1 + fat - yy) ** 2 > fat * fat) continue; // the round bulb at its foot
          if (yy > y0 || zz * CS + yy * SN <= d - 0.02) continue;
          v = (wax(dx / fat, dz / fat, yTop - yy) + 0.1) * fade;
          (kd = 2), (d = zz * CS + yy * SN);
        }
      }
      lum[k] = v;
      kind[k] = kd;
    }

    // Down to cells, then the glow round the flame, then the flame over all.
    out.fill(" ");
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let n = 0, s = 0;
        for (let q = r * SY * W + c * SX, j = 0; j < SY; j++, q += W)
          for (let i = 0; i < SX; i++) if (kind[q + i]) n++, (s += lum[q + i]);
        solid[r * cols + c] = n > 0 ? 1 : 0;
        if (n >= 3) {
          const i = Math.max(1, Math.min(9, Math.round(clamp(s / n) * 9)));
          out[r * cols + c] = RAMP[paper ? 10 - i : i];
        }
      }
    const fc = CX + 2 * fx, fr = rowOf(fy, 0);
    if (bright > 0.05)
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          // A soft halo, a ring of fine dots inside a ring of fainter ones, kept clear of the solid.
          const g = Math.hypot((c + 0.5 - fc) / 2 / 1.05, (r + 0.5 - fr) / 1.35) / (2.4 + 1.4 * Math.min(1, bright));
          if (g > 1 || (g > 0.66 && g < 0.84) || out[r * cols + c] !== " ") continue;
          const near = [-1, 0, 1].some((j) => [-1, 0, 1].some((i) => solid[(r + j) * cols + c + i]));
          if (!near) out[r * cols + c] = g < 0.66 ? "·" : ".";
        }
    // A teardrop on the wick, swaying at the tip, with a dim root and the wick dark in its heart.
    if (hf > 0.2) {
      const y0 = yTop + 0.1;
      for (let r = Math.floor(rowOf(y0 + hf + 0.5, 0)); r <= Math.ceil(rowOf(y0 - 0.5, 0)); r++)
        for (let c = Math.floor(fc - 5); c <= fc + 5; c++) {
          if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
          let s = 0;
          for (let j = 0; j < SY; j++)
            for (let i = 0; i < SX; i++) {
              const y = (BASE - (r + (j + 0.5) / SY)) / CS - y0 + 0.35;
              const uu = y / (hf + 0.35);
              if (uu <= 0 || uu >= 1) continue;
              const w = (1.2 + 0.25 * flare) * (Math.sqrt(uu) * (1 - uu) ** 1.2) / 0.36;
              const q = ((c + (i + 0.5) / SX - CX) / 2 - fx - sway * uu * uu) / w;
              if (Math.abs(q) >= 1) continue;
              s += (1 - q * q) * (uu < 0.18 ? 0.4 : uu < 0.32 && Math.abs(q) < 0.35 ? 0.55 : 0.8 + 0.4 * Math.min(1, uu * 2.5));
            }
          const v = s / (SX * SY);
          if (v > 0.06) out[r * cols + c] = RAMP[Math.max(1, Math.min(9, Math.round(v * 9 + 0.3)))];
        }
    }
    // The wick, standing bare once the flame is out.
    const wr = Math.floor(rowOf(yTop + 0.35, 0)), wc = Math.floor(CX);
    if (hf <= 0.2 && fade > 0.5 && wr >= 0 && wr < rows) out[wr * cols + wc] = "'";
    // Once it is out, a thread of smoke from the wick, thinning as it climbs.
    if (smoke >= 0)
      for (let s = 1.5; s < 11; s += 1) {
        const r = Math.floor(rowOf(yTop - lift + 0.4, 0) - s), age = smoke - s / 4;
        if (r < 0 || age < 0 || age > 2) continue;
        const x = CX + 0.4 + 0.5 * (s / 3) * Math.sin(0.9 * s - smoke * 3);
        const lean = Math.cos(0.9 * s - smoke * 3);
        out[r * cols + Math.floor(x)] = age > 1.4 ? "." : lean > 0.5 ? ")" : lean < -0.5 ? "(" : "|";
      }
    return Array.from({ length: rows }, (_, r) => out.slice(r * cols, (r + 1) * cols).join("")).join("\n");
  };
}
