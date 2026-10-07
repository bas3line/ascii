/*
 * varanasi ghats: dusk on the ganga. Stepped ghats run along the bank and
 * away toward the afterglow, temple spires black against an indigo to amber
 * sky. Priests raise the aarti lamps on the steps, diyas drift downstream on
 * the dark water, and a boatman rows slowly across the bright reach.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: a dot whose size is
 * the cell's brightness, ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "varanasi ghats",
  category: "scenes",
  note: "dusk aarti on the ganga, lamps on the steps and diyas on the water",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0b0812",
  palette: [
    // the sky, indigo through violet
    "#141230", "#1d1a42", "#272257", "#332b6a", "#45357a", "#5a4388", "#7259a8",
    // plum, orchid, mauve and rose
    "#6d3a73", "#8a4677", "#a8527a", "#c4607a", "#d97a92", "#b866a0", "#9a68c8", "#c868b0", "#e8707a",
    // coral to gold
    "#d9705f", "#e88552", "#f29f4a", "#f8b85a", "#fcd07a", "#ffe3a6", "#fff2d2",
    // stone in shadow, and the violet treads
    "#1a1220", "#24182a", "#301f33", "#3f2838", "#523340", "#3a2c4c", "#4d3a64",
    // stone in lamplight
    "#5e3524", "#7d4527", "#a0582a", "#c06e2e", "#d98a46",
    // flame
    "#ffffff", "#fff6d8", "#ffd860", "#ff9f2a", "#f06a1e", "#c8401a", "#8a2a16",
    // dark water
    "#0f1a2c", "#162540", "#20325a",
    // starlight, set directly and never matched
    "#d6d4ee",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 60; // the far bank
const END = 150; // where the ghats meet the far bank
const GLOW = [156, HZ - 1.5]; // the afterglow, sitting on the far bank
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
// how far a dot's colour may be brightened to make up for its size: small dots
// in dark areas stay dark instead of turning into a pale speckle
const LIFT = [0, 2.5, 1.7, 1.35];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const FLAME = [1, 0.62, 0.22];
const WASH = [1, 0.5, 0.2];

const SKY = 0, WATER = 1, BANK = 2, STEPS = 3, BLD = 4, SPIRE = 5, UMB = 6, FIG = 7, PLAT = 8;

// heat, then colour: indigo overhead, violet, plum, rose, coral, amber, gold
const RAMP: [number, number, number, number][] = [
  [0.0, 0.085, 0.07, 0.24],
  [0.14, 0.13, 0.1, 0.34],
  [0.28, 0.22, 0.14, 0.44],
  [0.42, 0.34, 0.17, 0.48],
  [0.52, 0.47, 0.21, 0.47],
  [0.62, 0.6, 0.26, 0.42],
  [0.7, 0.7, 0.31, 0.36],
  [0.78, 0.8, 0.39, 0.3],
  [0.86, 0.88, 0.5, 0.26],
  [0.92, 0.95, 0.65, 0.32],
  [0.97, 1.0, 0.8, 0.48],
  [1.0, 1.0, 0.92, 0.7],
];

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

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
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// The heat ramp, tabulated.
const RL = 256;
const RT = new Float32Array((RL + 1) * 3);
for (let i = 0; i <= RL; i++) {
  const h = i / RL;
  let j = 0;
  while (j < RAMP.length - 2 && h > RAMP[j + 1][0]) j++;
  const [h0, r0, g0, b0] = RAMP[j], [h1, r1, g1, b1] = RAMP[j + 1];
  const k = clamp((h - h0) / (h1 - h0));
  RT[i * 3] = mix(r0, r1, k), RT[i * 3 + 1] = mix(g0, g1, k), RT[i * 3 + 2] = mix(b0, b1, k);
}
const rampAt = (h: number) => ((h < 0 ? 0 : h > 1 ? 1 : h) * RL + 0.5) | 0;

// The waterline along the ghats, near at the left and running away to the right.
const wlF = (x: number) => (x < END ? HZ + 0.5 + 20 * Math.pow(1 - x / END, 1.6) : HZ + 0.5);
const scF = (x: number) => 0.45 + 1.75 * Math.pow(Math.max(0, 1 - x / END), 1.3);
const stepTopF = (x: number) => wlF(x) - 9.5 * scF(x) * (0.3 + 0.7 * smooth(END, END - 16, x));

// The dusk sky's heat: low overhead, rising toward the horizon, hottest at the glow.
function skyHeat(x: number, y: number): number {
  const v = clamp(y / HZ);
  const dx = Math.abs(x - GLOW[0]), dy = Math.abs(GLOW[1] - y);
  // a wide warm band along the horizon, and a small hot core on the bank
  const wide = 0.46 * Math.exp(-dx / 55 - dy / 23);
  const core = 0.24 * Math.exp(-Math.sqrt((dx / 13) ** 2 + (dy / 4.5) ** 2));
  return 0.06 + 0.42 * v * v + wide + core;
}

export default function varanasiGhats(): Frame {
  const P = meta.palette.map(hex);
  const STAR = P.length - 1;
  const N = W * H;
  const out = new Array<string>(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < STAR; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the bank -------------------------------------------------------------
  // Buildings along the ghats: [x0, x1, height above the steps in scale units, seed]
  const blds: [number, number, number, number][] = [];
  for (let x = -6; x < END - 10; ) {
    const s = scF(Math.max(0, x));
    const w = (8 + 10 * hash(x | 0, 3)) * s;
    const low = (x > 110 ? 0.8 : 1) * (0.45 + 0.55 * smooth(END - 8, END - 34, x));
    blds.push([x, x + w, (7 + 9 * hash(x | 0, 4)) * low, hash(x | 0, 5)]);
    x += w;
  }
  // Temple spires: [centre x, height in rows, half width at the base]
  const spires: [number, number, number][] = [[118, 33, 5.2], [64, 19, 4], [31, 15, 3.6], [139, 8, 1.6], [90, 11, 2.4], [129, 10, 2]];
  // Aarti stations on the near ghat, unevenly spaced: [x, streak width, streak length]
  const aarti: [number, number, number][] = [[11, 1.15, 1.25], [24, 0.8, 0.85], [39, 1.25, 1.1], [54, 0.75, 0.75]];
  // Umbrellas on the far steps
  const umbs = [70, 83, 98, 109];

  const mat = new Uint8Array(N);
  const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
  const flo = new Float32Array(N);
  const alb = new Float32Array(N); // how much the lamps' wash lights each cell
  const skyH = new Float32Array(N);
  const warm = new Float32Array(N);

  const roofOf = (x: number) => {
    for (const [x0, x1, h] of blds) if (x >= x0 && x < x1) return stepTopF(x) - h * scF(x);
    return stepTopF(x);
  };

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const xc = x + 0.5, y = r + 0.5;
      const wl = wlF(xc);
      if (y >= wl) {
        mat[k] = WATER;
        alb[k] = 0.25;
        continue;
      }
      let m: number = SKY, cr = 0, cg = 0, cb = 0, fl = 0.06, al = 0;
      const s = scF(xc);

      // the far bank: an embankment and clumps of trees against the glow
      const clump = smooth(0.42, 0.72, fbm(xc * 0.11, 3, 3, 0)) * smooth(160, 172, xc);
      const bankTop = HZ - 2.2 - 0.6 * fbm(xc * 0.4, 7, 2, 0) - 4 * clump;
      if (xc >= END - 4 && y >= bankTop) (m = BANK), (cr = 0.1), (cg = 0.07), (cb = 0.125), (fl = 0.03);

      if (xc < END) {
        const st = stepTopF(xc);
        // buildings and their rooftop pavilions
        let roof = st, bi = -1;
        for (let i = 0; i < blds.length; i++) if (xc >= blds[i][0] && xc < blds[i][1]) (roof = st - blds[i][2] * s), (bi = i);
        let top = roof;
        if (bi >= 0) {
          const [x0, x1, , hb] = blds[bi];
          const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
          if (hb > 0.45) {
            // a chhatri: a small dome on four posts
            const cx = hb > 0.75 ? x0 + half * 0.4 : mid;
            const dx = Math.abs(xc - cx) / (1.6 * s);
            if (dx < 1) top = Math.min(top, roof - 1.4 * s - 1.5 * s * Math.sqrt(1 - dx * dx));
            if (dx < 1.1 && dx > 0.7) top = Math.min(top, roof - 1.4 * s);
          }
          if (Math.abs(xc - x0) < 0.6 * s || Math.abs(xc - x1) < 0.6 * s) top = Math.min(top, roof - 0.6 * s); // parapet ends
        }
        if (y >= top && y < st) {
          m = BLD;
          // backlit stone, a little violet from the sky, darker low down
          cr = 0.075, cg = 0.05, cb = 0.09;
          const fy = (y - top) / Math.max(1, st - top);
          cr *= 1.1 - 0.4 * fy, cg *= 1.1 - 0.4 * fy, cb *= 1.1 - 0.3 * fy;
          al = 0.5;
          // rows of arched openings, a fair number lit on the near ghats
          if (bi >= 0 && s > 0.6) {
            const fx = (xc - blds[bi][0]) / (2.4 * s), fz = (st - y) / (3 * s);
            const ix = Math.floor(fx), iz = Math.floor(fz);
            if (fx - ix > 0.35 && fx - ix < 0.7 && fz - iz > 0.25 && fz - iz < 0.75 && iz >= 1 && st - y < blds[bi][2] * s - 1.5 * s) {
              const lit = hash(bi * 31 + ix, iz * 7) < (s > 1.2 ? 0.28 : 0.2);
              if (lit) (cr += 0.5), (cg += 0.28), (cb += 0.08);
              else (cr *= 0.55), (cg *= 0.55), (cb *= 0.65), (al = 0.2);
            }
          }
          fl = 0.14;
        }
        if (y >= st) {
          // the steps: treads catch the violet sky, risers fall in shadow
          m = STEPS;
          const sp = 1.6 * s;
          const near = (wl - y) / (wl - st);
          if (sp < 2.2) {
            // too far to count the steps: a faint alternating tread
            const odd = Math.floor(wl - y) & 1;
            (cr = 0.19), (cg = 0.13), (cb = 0.25);
            if (odd) (cr *= 0.55), (cg *= 0.55), (cb *= 0.58);
            al = odd ? 0.4 : 0.75;
          } else {
            const ph = ((wl - y) / sp) % 1;
            if (ph < 0.6) (cr = 0.24 + 0.05 * (1 - near)), (cg = 0.15), (cb = 0.2), (al = 1);
            else (cr = 0.05), (cg = 0.035), (cb = 0.06), (al = 0.3);
          }
          // the wet bottom steps darker
          if (wl - y < 1.2 * s) (cr *= 0.6), (cg *= 0.6), (cb *= 0.75), (al *= 0.6);
          fl = 0.12;
        }
      }

      // spires
      for (const [sx, sh, sw] of spires) {
        const base = roofOf(sx) + 1;
        const h = base - y;
        if (h < -1 || h > sh + 2.5) continue;
        const dx = Math.abs(xc - sx);
        const f = h / sh;
        // the curved shikhara, an amalaka disc and the kalash on top
        let hw = f <= 1 ? sw * Math.pow(Math.max(0, 1 - Math.pow(f, 1.8)), 0.6) : 0;
        if (f > 0.92 && f < 1.02) hw = Math.max(hw, sw * 0.32);
        if (f >= 1.02 && h < sh + 2.2) hw = Math.max(hw, 0.35 + 0.2 * Math.sin(((h - sh) / 2.2) * Math.PI));
        if (h >= -1 && h < 0.5) hw = sw * 1.15;
        if (dx <= hw) {
          m = SPIRE;
          const band = Math.floor(h / 1.6) % 2 ? 0.8 : 1;
          cr = 0.085 * band, cg = 0.055 * band, cb = 0.095 * band;
          fl = 0.12, al = 0.35;
        }
      }

      // the big umbrellas on the far steps
      for (const ux of umbs) {
        const s2 = scF(ux), wl2 = wlF(ux);
        const cy = wl2 - (wl2 - stepTopF(ux)) * 0.55;
        const dx = (xc - ux) / (3 * s2), dy = (cy - y) / (1.4 * s2);
        if (dy > 0 && dy < 1 && Math.abs(dx) < Math.sqrt(1 - dy * dy)) (m = UMB), (cr = 0.07), (cg = 0.045), (cb = 0.075), (al = 0.4);
        if (dy <= 0 && dy > -0.25 && Math.abs(dx) < 1) (m = UMB), (cr = 0.05), (cg = 0.03), (cb = 0.05), (al = 0.2);
        if (Math.abs(xc - ux) < 0.5 && y > cy && y < cy + 2.2 * s2) (m = UMB), (cr = 0.04), (cg = 0.03), (cb = 0.04), (al = 0.1);
      }

      // the priests on their platforms, dark against the lit steps
      for (const [ax] of aarti) {
        const s2 = scF(ax), u = 1.3 * s2, base = wlF(ax) - 2.6 * s2;
        const dx = (xc - ax) / u;
        const fy = (base - y) / u;
        // a dhoti, a broad-shouldered torso, a neck and the head
        const bw = fy < 0 ? -1 : fy < 2.2 ? 0.66 - 0.04 * fy : fy < 4.1 ? 0.58 + 0.32 * smooth(2.2, 3.7, fy) : fy < 4.5 ? 0.28 : -1;
        const head = Math.hypot(dx * 1.05, fy - 5.05) < 0.62;
        if (Math.abs(dx) < bw || head) (m = FIG), (cr = 0.035), (cg = 0.022), (cb = 0.035), (fl = 0.02), (al = 0.04);
        if (y >= base && y < base + 0.7 * s2 && Math.abs(xc - ax) < 2.3 * u) (m = PLAT), (cr = 0.12), (cg = 0.07), (cb = 0.06), (fl = 0.04), (al = 0.8);
      }

      if (m === SKY) {
        const veil = 0.92 + 0.16 * fbm(x * 0.05, r * 0.1, 3, 0);
        const hh = skyHeat(xc, y) + 0.05 * (fbm(x * 0.07 + 11, r * 0.16, 2, 0) - 0.5) + 0.1 * (fbm(x * 0.025 + 3, r * 0.09 + 5, 3, 0) - 0.5);
        skyH[k] = hh;
        warm[k] = smooth(0.3, 0.9, hh);
        const i = rampAt(hh) * 3;
        cr = RT[i] * veil, cg = RT[i + 1] * veil, cb = RT[i + 2] * veil;
        fl = 0.2;
      }
      mat[k] = m;
      sR[k] = cr, sG[k] = cg, sB[k] = cb, flo[k] = fl, alb[k] = al;
    }
  }

  // rim light: silhouette edges facing the glow, and their tops, take the sky's colour
  const rimR = new Float32Array(N), rimG = new Float32Array(N), rimB = new Float32Array(N);
  for (let r = 1; r < H - 1; r++) {
    for (let x = 2; x < W - 2; x++) {
      const k = r * W + x;
      const m = mat[k];
      if (m === SKY || m === WATER) continue;
      // the edge facing the glow takes its orange light, the top the sky's colour
      const toward = x < GLOW[0] ? 1 : -1;
      const strong = 0.75 * Math.exp(-Math.abs(x - GLOW[0]) / 42);
      let a = 0;
      if (mat[k + toward] === SKY) a = strong;
      else if (mat[k + 2 * toward] === SKY) a = strong * 0.4;
      if (a > 0) (rimR[k] = 0.85 * a), (rimG[k] = 0.45 * a), (rimB[k] = 0.26 * a);
      if (mat[k - W] === SKY) (rimR[k] += sR[k - W] * 0.3), (rimG[k] += sG[k - W] * 0.3), (rimB[k] += sB[k - W] * 0.3);
    }
  }
  for (let k = 0; k < N; k++) (sR[k] += rimR[k]), (sG[k] += rimG[k]), (sB[k] += rimB[k]);

  // small diyas lining the steps near the aarti, twinkling
  const stepLamps: [number, number][] = [];
  for (let x = 2; x < 118; x++) {
    const s = scF(x + 0.5);
    for (let r = Math.floor(stepTopF(x + 0.5)); r < wlF(x + 0.5) - 1; r++) {
      const k = r * W + x;
      if (mat[k] !== STEPS) continue;
      const near = Math.exp(-(((x - 33) / 36) ** 2));
      if (hash(x * 3 + 7, r * 5) < 0.035 * near + 0.006 && ((wlF(x + 0.5) - r - 0.5) / (1.6 * s)) % 1 < 0.3) stepLamps.push([k, hash(x, r) * 40]);
    }
  }

  // electric lamps along the far ghats, each with its thin road on the water
  const sref = new Float32Array(N);
  for (let x = 58; x < END - 3; ) {
    const s = scF(x);
    const ly = stepTopF(x) - 0.4 * s + (wlF(x) - stepTopF(x)) * 0.55 * hash(x | 0, 78) ** 2;
    const halo = 1 + 3.2 * s, R = Math.ceil(halo * 3);
    for (let r = Math.max(0, Math.floor(ly - R)); r < Math.min(H, ly + R); r++) {
      for (let xx = Math.max(0, Math.floor(x - R)); xx < Math.min(W, x + R); xx++) {
        const k = r * W + xx;
        if (mat[k] === WATER || mat[k] === SKY) continue;
        const dx = xx + 0.5 - x, dy = r + 0.5 - ly;
        const d = Math.sqrt(dx * dx + dy * dy);
        // the lamp, and the pool of light it throws on the stone round it
        const v = Math.exp(-((d / 0.6) ** 2)) * 1.3 + Math.exp(-d / 1.4) * 0.12;
        const p = Math.exp(-d / halo) * 0.3 * alb[k];
        sR[k] += v + p * WASH[0], sG[k] += v * 0.76 + p * WASH[1], sB[k] += v * 0.42 + p * WASH[2];
      }
    }
    const wl = wlF(x), width = 0.35 + 0.35 * s, len = 9 * s;
    for (let r = Math.floor(wl); r < H; r++) {
      const a = Math.exp(-(r + 0.5 - wl) / len) * 0.5;
      if (a < 0.01) break;
      for (let xx = Math.floor(x - 3); xx < x + 3; xx++) sref[r * W + xx] += a * Math.exp(-(((xx + 0.5 - x) / width) ** 2));
    }
    x += (5 + 10 * hash(x | 0, 77)) * Math.max(0.8, s);
  }

  // --- the reflection: the bank and sky mirrored at the waterline -----------
  const refl = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  const mirK = new Int32Array(N).fill(-1); // the lit cell each water cell mirrors
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] !== WATER) continue;
      const wl = wlF(x + 0.5), d = r + 0.5 - wl;
      let ar = 0, ag = 0, ab = 0;
      for (let o = 0; o < 2; o++) {
        const ym = wl - d * 0.85 - 0.4 - o * 0.8;
        let cr: number, cg: number, cb: number;
        const q = ym < 0 ? -1 : Math.floor(ym) * W + x;
        // the rippled water stretches the sky's light down toward us
        const i = rampAt(skyHeat(x + 0.5, Math.max(0, wl - d * 0.36 - 1 - o * 0.6))) * 3;
        if (q < 0 || mat[q] === WATER || mat[q] === SKY) (cr = RT[i]), (cg = RT[i + 1]), (cb = RT[i + 2]);
        else {
          // tilted ripples under the bank still catch a little sky
          (cr = sR[q] + RT[i] * 0.22), (cg = sG[q] + RT[i + 1] * 0.22), (cb = sB[q] + RT[i + 2] * 0.22);
          if (o === 0) mirK[k] = q;
        }
        ar += cr, ag += cg, ab += cb;
      }
      const a = 0.8 - 0.4 * smooth(HZ, H, r);
      refl[0][k] = (ar / 2) * a, refl[1][k] = (ag / 2) * a, refl[2][k] = (ab / 2) * a;
    }
  }

  // --- clouds: long dusk streaks, dark on top and lit from below --------------
  const CW = 800, CH = HZ - 6;
  const cover = new Float32Array(CW * CH);
  const clit = new Float32Array(CW * CH);
  // stretched, warped noise, gathered into three loose bands
  const density = (x: number, y: number) => {
    const q = fbm(x * 0.005, y * 0.03, 3, 4);
    const d = fbm(x * 0.0125 + q * 1.8, y * 0.09 + q * 0.9, 5, 10);
    const env = 0.03 * Math.exp(-(((y - 13) / 4) ** 2)) + 0.1 * Math.exp(-(((y - 29) / 5.5) ** 2));
    // and one thin, broken streak low down, to cross the glow
    const c = 46.5 + 3 * (fbm(x * 0.01, 9.5, 2, 8) - 0.5);
    const th = 1 + 0.9 * fbm(x * 0.05, 3.5, 2, 40);
    const streak = Math.exp(-(((y - c) / th) ** 2)) * smooth(0.42, 0.6, fbm(x * 0.0125, 21.5, 3, 10)) * (0.75 + 0.5 * fbm(x * 0.05, y * 0.3, 3, 40));
    return Math.max(d + env - 0.08, 0.36 + 0.3 * streak);
  };
  for (let r = 0; r < CH; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const d = density(x, y);
      cover[r * CW + x] = smooth(0.47, 0.62, d);
      // the undersides catch the light from below the horizon, the tops go dark
      clit[r * CW + x] = clamp(0.4 + (d - density(x, y + 2)) * 5.5 + (density(x, y - 2.5) - d) * 1.5);
    }
  }

  // --- the floating diyas ------------------------------------------------------
  const diyas: [number, number, number, number][] = [];
  for (let i = 0; i < 34; i++) {
    const q = hash(i, 61);
    const y = HZ + 5 + 34 * Math.pow(q, 1.3);
    diyas.push([hash(i, 62) * 260 - 30, y, hash(i, 63) * 50, 0.6 + 0.6 * hash(i, 64)]);
  }

  const dyn = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  const dref = new Float32Array(N); // warm light to be reflected
  const arm = new Uint8Array(N); // the priests' raised arms, this frame
  const addGlow = (fx: number, fy: number, core: number, halo: number, amp: number) => {
    const R = Math.ceil(halo * 3.2);
    for (let r = Math.max(0, Math.floor(fy - R)); r < Math.min(H, fy + R); r++) {
      for (let x = Math.max(0, Math.floor(fx - R)); x < Math.min(W, fx + R); x++) {
        const k = r * W + x;
        const dx = x + 0.5 - fx, dy = (r + 0.5 - fy) * 0.85;
        const d = Math.sqrt(dx * dx + dy * dy);
        // a white-hot heart inside an orange halo; the priests are not lit
        const am = mat[k] === FIG ? amp * 0.15 : amp;
        const c = Math.exp(-((d / core) ** 2)) * 1.6 * am, v = Math.exp(-d / halo) * 0.35 * am;
        dyn[0][k] += c + v * FLAME[0], dyn[1][k] += c * 0.86 + v * FLAME[1], dyn[2][k] += c * 0.55 + v * FLAME[2];
      }
    }
  };
  // the lamps' wide warm wash on the stone, by how much each surface takes it
  const addWash = (fx: number, fy: number, halo: number, amp: number) => {
    const R = Math.ceil(halo * 2.6);
    for (let r = Math.max(0, Math.floor(fy - R)); r < Math.min(H, fy + R); r++) {
      for (let x = Math.max(0, Math.floor(fx - R)); x < Math.min(W, fx + R); x++) {
        const k = r * W + x;
        const a = alb[k];
        if (!a) continue;
        const dx = x + 0.5 - fx, dy = r + 0.5 - fy;
        const v = Math.exp(-Math.sqrt(dx * dx + dy * dy) / halo) * amp * a;
        dyn[0][k] += v * WASH[0], dyn[1][k] += v * WASH[1], dyn[2][k] += v * WASH[2];
      }
    }
  };
  const addStreak = (fx: number, wl: number, width: number, len: number, amp: number) => {
    for (let r = Math.max(0, Math.floor(wl)); r < H; r++) {
      const dy = r + 0.5 - wl;
      const a = Math.exp(-dy / len) * amp * smooth(-0.5, 1, dy);
      if (a < 0.01) break;
      for (let x = Math.max(0, Math.floor(fx - 3 * width - 1)); x < Math.min(W, fx + 3 * width + 1); x++) {
        const k = r * W + x;
        if (mat[k] === WATER) dref[k] += a * Math.exp(-(((x + 0.5 - fx) / width) ** 2));
      }
    }
  };

  // the boat crossing the bright reach
  const BS = 0.85;
  const boatAt = (lx: number, ly: number) => {
    // local coordinates: lx along the boat, ly up from the waterline
    const L = 9;
    if (Math.abs(lx) < L && ly > -0.6 && ly < 1.2 + 1.4 * Math.pow(Math.abs(lx) / L, 3)) return 1;
    if (lx > 4.6 && lx < 5.8 && ly > 0 && ly < 6.6) return 1; // the boatman
    if (Math.abs(lx - 5.2) < 0.7 && Math.abs(ly - 7.2) < 0.7) return 1;
    const ox = lx - 5.6, oy = ly - 5.4; // his oar, raked back into the water
    const along = ox * 0.42 - oy * 0.91;
    if (along > 0 && along < 8 && Math.abs(ox * 0.91 + oy * 0.42) < 0.32) return 1;
    if (lx > -4 && lx < -0.5 && ly > 0 && ly < 2.6 - 0.25 * Math.abs(lx + 2.2)) return 1; // a passenger
    return 0;
  };

  return (t, { color } = {}) => {
    for (let c = 0; c < 3; c++) dyn[c].fill(0);
    dref.fill(0);

    // aarti: each lamp is raised and turned in slow circles
    arm.fill(0);
    aarti.forEach(([ax, sw, sl], i) => {
      const s = scF(ax), u = 1.3 * s, base = wlF(ax) - 2.6 * s;
      const ph = t * 1.1 + i * 1.3;
      const fx = ax + 0.9 * u + Math.cos(ph) * 1.1 * u, fy = base - 7.2 * u + Math.sin(ph) * 0.6 * u;
      // the arm from the shoulder to the lamp
      const sx0 = ax + 0.62 * u, sy0 = base - 3.8 * u;
      const ex = fx - sx0, ey = fy + 0.6 * u - sy0, el = ex * ex + ey * ey;
      for (let r = Math.floor(Math.min(sy0, fy) - 1); r <= Math.max(sy0, fy) + 1; r++) {
        for (let x = Math.floor(Math.min(sx0, fx) - 1); x <= Math.max(sx0, fx) + 1; x++) {
          if (x < 0 || x >= W || r < 0 || r >= H) continue;
          const px = x + 0.5 - sx0, py = r + 0.5 - sy0;
          const q = clamp((px * ex + py * ey) / el);
          if (Math.hypot(px - q * ex, py - q * ey) < 0.28 * u) arm[r * W + x] = 1;
        }
      }
      const fl = 0.85 + 0.15 * Math.sin(t * 13 + i * 5) * Math.sin(t * 7.3 + i);
      addGlow(fx, fy, 0.6 * u, 1.7 * u, fl);
      addWash(fx, fy + 2 * u, 7.5 * s, 0.34 * fl);
      addStreak(fx, wlF(fx), 0.8 * s * sw, 15 * s * sl, 0.75 * fl);
    });
    // the step lamps
    for (const [k, ph] of stepLamps) {
      const v = 0.7 + 0.3 * Math.sin(t * 5 + ph);
      dyn[0][k] += v * FLAME[0], dyn[1][k] += v * FLAME[1] * 0.95, dyn[2][k] += v * FLAME[2];
    }
    // diyas drifting downstream, nearer ones faster
    for (const [x0, y, ph, sz] of diyas) {
      const near = (y - HZ) / (H - HZ);
      const x = ((((x0 + t * (0.25 + 0.9 * near)) % 260) + 260) % 260) - 30;
      if (x < -3 || x > W + 3 || y < wlF(x) + 0.8) continue;
      const fl = 0.8 + 0.2 * Math.sin(t * 9 + ph);
      const s = (0.35 + 0.9 * near) * sz;
      addGlow(x, y - 0.3, 0.45 + 0.3 * s, 0.6 + 1.2 * s, fl * 0.8);
      addStreak(x, y + 0.2, 0.3 + 0.35 * s, 2 + 5 * s, 0.6 * fl);
    }

    const drift = t * 0.9 + 720; // starts with the long streaks over the glow
    const bx = ((((159 - t * 0.1 + 24) % 250) + 250) % 250) - 24, by = 71 + Math.sin(t * 0.9) * 0.15;

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = sR[k], cg = sG[k], cb = sB[k], floor = flo[k], fade = 1, star = false;

        if (m === SKY) {
          if (r < CH) {
            const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
            const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
            const c = cover[i0] + (cover[i1] - cover[i0]) * fx;
            if (c > 0.01) {
              // high streaks glow rose from below; low ones stand dark against
              // the afterglow with only their undersides lit, gold near the glow
              const l = clit[i0] + (clit[i1] - clit[i0]) * fx;
              const lo = smooth(12, 30, y);
              const lit = mix(0.3 + 0.7 * l, 0.9 * l * l, lo);
              const i = rampAt(0.56 + 0.38 * warm[k] + 0.08 * l) * 3;
              const kr = mix(0.075, RT[i], lit), kg = mix(0.05, RT[i + 1], lit), kb = mix(0.15, RT[i + 2], lit);
              cr = mix(cr, kr, c), cg = mix(cg, kg, c), cb = mix(cb, kb, c);
              floor = mix(floor, 0.06, c * (1 - lit));
            } else if (y < 24 && hash(x, r * 3 + 11) > 0.993) {
              const tw = 0.4 + 0.25 * Math.sin(t * (1.3 + hash(x, r) * 2) + hash(r, x) * 6.28);
              cr = Math.max(cr, tw * 0.9), cg = Math.max(cg, tw * 0.88), cb = Math.max(cb, tw);
              star = true;
            }
          }
        } else if (m === WATER) {
          const v = (y - HZ) / (H - HZ);
          const w = 0.6 * noise(x * 0.05 + t * 0.08, y * 0.45 - t * 0.45, 0) + 0.4 * noise(x * 0.16 - t * 0.15, y * 0.95 - t * 0.9, 0);
          const swell = 0.55 + 0.9 * w;
          cr = 0.035 * swell, cg = 0.045 * swell, cb = 0.12 * swell;
          const wob = (noise(x * 0.04 + 7, y * 0.3 - t * 0.6, 0) - 0.5) * (1.2 + 4 * v);
          let sx = x + wob;
          if (sx < 0) sx = 0;
          if (sx > W - 1.001) sx = W - 1.001;
          const i0 = r * W + (sx | 0), fx = sx - (sx | 0);
          const dash = smooth(0.25, 0.75, noise(x * 0.12 + 3, y * 0.8 - t * 1.1, 0));
          const ref = (a: Float32Array) => a[i0] + (a[i0 + 1] - a[i0]) * fx;
          // broken bands, except in the bright reach under the glow
          const reach = Math.exp(-(((x + 0.5 - GLOW[0]) / 15) ** 2)) * smooth(HZ + 2.5, HZ + 5.5, y);
          const da = mix(0.15 + 1.1 * dash, 0.7 + 0.5 * dash, reach);
          cr += ref(refl[0]) * da, cg += ref(refl[1]) * da, cb += ref(refl[2]) * da;
          // the lamplit stone above, given back in broken bands
          const q = mirK[k];
          if (q >= 0) (cr += dyn[0][q] * 0.4 * da), (cg += dyn[1][q] * 0.4 * da), (cb += dyn[2][q] * 0.4 * da);
          const fl = (ref(dref) + ref(sref)) * (0.2 + 1.1 * dash);
          cr += fl * FLAME[0], cg += fl * FLAME[1], cb += fl * FLAME[2];
          // a narrow road of glitter straight under the glow
          const gw = 1.3 + (y - HZ) * 0.15;
          const gx = (x + 0.5 - GLOW[0]) / gw;
          if (gx > -3 && gx < 3) {
            const road = Math.exp(-gx * gx) * Math.exp(-(y - HZ) / 24);
            const rip = noise(x * 0.45 + y * 0.1 - t * 0.3, y * 1.3 - t * 1.6, 0);
            const glint = smooth(0.42, 0.78, 0.45 * w + 0.55 * rip) * road;
            cr += 1.0 * glint + 0.12 * road, cg += 0.78 * glint + 0.07 * road, cb += 0.42 * glint + 0.04 * road;
          }
          floor = 0.12;
          fade = smooth(H + 4, H - 16, y);
        }

        // the boat and its dark reflection
        const lx = x + 0.5 - bx;
        if (lx > -14 && lx < 15 && r > by - 11 && r < by + 11) {
          let cov = 0, rc = 0;
          for (let sy2 = 0; sy2 < 2; sy2++)
            for (let sx2 = 0; sx2 < 2; sx2++) {
              const px = (lx - 0.25 + sx2 * 0.5) / BS, py = (by - (r + 0.25 + sy2 * 0.5)) / BS;
              cov += boatAt(px, py);
              if (m === WATER) rc += boatAt(px, -py * 0.9);
            }
          cov /= 4, rc /= 4;
          if (cov > 0) {
            cr = mix(cr, 0.035, cov), cg = mix(cg, 0.022, cov), cb = mix(cb, 0.035, cov);
            floor = mix(floor, 0.02, cov), star = false;
          } else if (rc > 0) (cr *= 1 - 0.8 * rc), (cg *= 1 - 0.8 * rc), (cb *= 1 - 0.75 * rc);
        }

        if (arm[k]) (cr = 0.035 + dyn[0][k] * 0.12), (cg = 0.022 + dyn[1][k] * 0.12), (cb = 0.035 + dyn[2][k] * 0.12), (floor = 0.02);
        else (cr += dyn[0][k]), (cg += dyn[1][k]), (cb += dyn[2][k]);

        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.72) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          if (star) color[k] = STAR;
          else {
            const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
            const s = Math.min(LIFT[step], (0.3 + 0.7 * want) / peak);
            color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
          }
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
