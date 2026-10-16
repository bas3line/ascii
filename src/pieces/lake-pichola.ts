/*
 * lake pichola: sunset over Udaipur's lake. The long white City Palace glows
 * on the right shore in the last light, the Lake Palace floats mid-water, and
 * the Aravalli hills stand purple behind with the Monsoon Palace on its peak.
 * Clouds drift, boats cross trailing wakes, birds pass, and one by one the
 * palace lamps flicker on.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 * The lake is shaded last, from the rows above it, mirrored and rippled.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of lake pichola. Defaults are the original values. */
export interface LakePicholaOptions {
  [key: string]: unknown;
  /** The far shore's row: the lake begins here. */
  horizon: number;
  /** The sun's column. */
  sunX: number;
  /** The sun's row. */
  sunY: number;
  /** The Lake Palace's waterline. */
  lakePalaceY: number;
  /** Where the City Palace stands on its terrace. */
  plinth: number;
  /** Speed of the drifting clouds. */
  cloudDrift: number;
}

export const meta = {
  name: "lake pichola",
  category: "scenes",
  note: "sunset on lake pichola, udaipur's palaces glowing over the water",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#120a1a",
  palette: [
    "#1c1028", "#2a1840", "#3d2058", "#55286a", "#6e3178", "#8a3c7c", "#a8477a", "#c85a6e",
    "#e0704e", "#f08a40", "#f8a840", "#ffc65a", "#ffe08a", "#fff2c8", "#fffaf0",
    "#2b1c40", "#3c2852", "#4f3666", "#6a4a7e", "#9a7aa0",
    "#f6e6d0", "#e8cdb0", "#d4a888", "#b88a78", "#8e6a6a", "#6a4a58", "#c88a9a",
    "#ffd070", "#ff9a3c", "#b8323a", "#140c1c",
  ],
      options: {
        horizon: 62,
        sunX: 58,
        sunY: 48,
        lakePalaceY: 72,
        plinth: 54,
        cloudDrift: 0.6,
      },
      params: {
        horizon: { label: "far shore", min: 45, max: 75, step: 1 },
        sunX: { label: "sun position", min: 20, max: 140, step: 1 },
        sunY: { label: "sun height", min: 25, max: 60, step: 1 },
        lakePalaceY: { label: "lake palace", min: 60, max: 85, step: 1 },
        plinth: { label: "city palace", min: 40, max: 62, step: 1 },
        cloudDrift: { label: "cloud drift", min: 0, max: 2, step: 0.05 },
      },
    } satisfies Meta<LakePicholaOptions>;

    const W = 200, H = 100;
    const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const AIR = 0, FAR = 1, NEAR = 2, BUILT = 3, LAMP = 4;

// The City Palace, left to right: [x0, x1, roof row, tower with a dome].
const BLOCKS: [number, number, number, boolean][] = [
  [114, 125, 49, false],
  [125, 138, 41, false],
  [138, 144, 33, true],
  [144, 158, 38, false],
  [158, 165, 28, true],
  [165, 178, 36, false],
  [178, 184, 31, true],
  [184, 200, 40, false],
];

// Boats, bottom row on the waterline: c canopy, p post, s shade under the
// canopy, r boatman, o lantern, g gilded rail, h hull.
const SMALL = [
  "...cccccc...",
  "..cccccccc..",
  "r..pssosp...",
  "r..pssssp...",
  "gggggggggggg",
  "hhhhhhhhhhhh",
  ".hhhhhhhhhh.",
];
const MEDIUM = [
  ".....cccccccccc.....",
  "....cccccccccccc....",
  "...cccccccccccccc...",
  ".r...psssossssp.....",
  ".r...pssssssssp.....",
  ".r...pssssssssp.....",
  "gggggggggggggggggggg",
  "hhhhhhhhhhhhhhhhhhhh",
  ".hhhhhhhhhhhhhhhhhh.",
  "...hhhhhhhhhhhhhh...",
];
const LARGE = [
  "........cccccccccccccc......",
  ".......cccccccccccccccc.....",
  "......cccccccccccccccccc....",
  "......cccccccccccccccccc....",
  "..r.....psssssssosssssp.....",
  "..r.....psssssssssssssp.....",
  ".rr.....psssssssssssssp.....",
  "..r.....psssssssssssssp.....",
  "gggggggggggggggggggggggggggg",
  "hhhhhhhhhhhhhhhhhhhhhhhhhhhh",
  ".hhhhhhhhhhhhhhhhhhhhhhhhhh.",
  "...hhhhhhhhhhhhhhhhhhhhhh...",
];
const BOATS: { art: string[]; y: number; v: number; x0: number; h: number }[] = [
  { art: SMALL, y: 79, v: 1.8, x0: 120, h: 0.31 },
  { art: MEDIUM, y: 88, v: -2.6, x0: 175, h: 0.62 },
  { art: LARGE, y: 95, v: 3.2, x0: 60, h: 0.87 },
];

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
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// The sky from zenith to horizon: violet, magenta, rose, orange, gold.
const STOPS: number[][] = [
  [0, 0.05, 0.025, 0.12],
  [0.25, 0.18, 0.07, 0.27],
  [0.5, 0.7, 0.2, 0.42],
  [0.7, 1.0, 0.4, 0.3],
  [0.85, 1.0, 0.58, 0.3],
  [1.0, 1.0, 0.72, 0.4],
];
const ramp = (v: number, i: number) => {
  for (let s = 1; s < STOPS.length; s++) {
    if (v <= STOPS[s][0]) {
      const a = STOPS[s - 1], b = STOPS[s];
      return mix(a[i], b[i], (v - a[0]) / (b[0] - a[0]));
    }
  }
  return STOPS[STOPS.length - 1][i];
};

// A lamp's glow at t: each switches on with a stutter once a cycle, at its own
// moment, then burns with a slow flame flicker.
const lampGlow = (h: number, t: number) => {
  const c = (((t / 36 + h * 7.3) % 1) + 1) % 1;
  let on = smooth(0, 0.035, c);
  if (c < 0.06 && Math.sin(t * 31 + h * 90) < 0) on *= 0.3;
  return on * (0.86 + 0.14 * Math.sin(t * (3 + h * 5) + h * 60));
};

export default function lakePichola(o: Partial<LakePicholaOptions> = {}): Frame {
  const HORIZON = o.horizon ?? meta.options.horizon;
  const SUN = [o.sunX ?? meta.options.sunX, o.sunY ?? meta.options.sunY];
  const LP_Y = o.lakePalaceY ?? meta.options.lakePalaceY;
  const PLINTH = o.plinth ?? meta.options.plinth;
  const CLOUD_DRIFT = o.cloudDrift ?? meta.options.cloudDrift;
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

  // --- the sky's base, built once -----------------------------------------
  const skyR = new Float32Array(W * HORIZON), skyG = new Float32Array(W * HORIZON), skyB = new Float32Array(W * HORIZON);
  for (let r = 0; r < HORIZON; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5, v = y / HORIZON;
      const away = Math.abs(x + 0.5 - SUN[0]) / 200; // cooler away from the sun
      const veil = 0.93 + 0.14 * fbm(x * 0.04, y * 0.1, 3, 0);
      let cr = (ramp(v, 1) - 0.2 * away * v) * veil;
      let cg = (ramp(v, 2) - 0.08 * away * v) * veil;
      let cb = (ramp(v, 3) + 0.06 * away * v) * veil;
      const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
      const dm = Math.sqrt(dx * dx + dy * dy);
      const g = Math.exp(-dm / 8) * 0.6 + Math.exp(-dm / 26) * 0.35 + Math.exp(-dm / 70) * 0.18;
      cr += g, cg += g * 0.75, cb += g * 0.4;
      const disk = smooth(6.2, 5.2, dm);
      cr = mix(cr, 1.0, disk), cg = mix(cg, 0.95, disk), cb = mix(cb, 0.8, disk);
      (skyR[k] = cr), (skyG[k] = cg), (skyB[k] = cb);
    }
  }

  // --- hills and palaces, built once --------------------------------------
  const mat = new Uint8Array(N);
  const SR = new Float32Array(N), SG = new Float32Array(N), SB = new Float32Array(N);
  const phase = new Float32Array(N); // each lamp's moment in the cycle
  const lake = new Uint8Array(N); // the Lake Palace's own cells
  const put = (x: number, y: number, cr: number, cg: number, cb: number, m = BUILT) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const k = y * W + x;
    (mat[k] = m), (SR[k] = cr), (SG[k] = cg), (SB[k] = cb);
  };
  const lampAt = (x: number, y: number, h: number, cr: number, cg: number, cb: number) => {
    put(x, y, cr, cg, cb, LAMP);
    if (x >= 0 && x < W && y >= 0 && y < H) phase[y * W + x] = h;
  };

  // The Aravallis in three layers: a long pale range far off that the sun
  // sinks into, a darker one with the Monsoon Palace's peak, a low shore.
  const back = (x: number) =>
    HORIZON - (6 + 9 * Math.exp(-(((x - 150) / 40) ** 2)) + 5 * Math.exp(-(((x - 52) / 18) ** 2)) + 3 * Math.exp(-(((x - 108) / 12) ** 2))) - 3 * fbm(x * 0.05, 1.7, 3, 0);
  const far = (x: number) =>
    HORIZON - (3 + 17 * Math.exp(-(((x - 26) / 20) ** 2)) + 6 * Math.exp(-(((x - 26) / 7) ** 2)) + 7 * Math.exp(-(((x - 6) / 10) ** 2)) + 4 * Math.exp(-(((x - 54) / 11) ** 2))) - 2 * fbm(x * 0.06, 5.3, 3, 0);
  const near = (x: number) => HORIZON - (1.5 + 5 * Math.exp(-(((x - 8) / 22) ** 2)) + 1.5 * Math.exp(-(((x - 60) / 14) ** 2))) - 2.2 * fbm(x * 0.25, 4.1, 2, 0);
  for (let r = 0; r < HORIZON; r++) {
    for (let x = 0; x < W; x++) {
      const y = r + 0.5, k = r * W + x;
      const fr = far(x + 0.5), br = back(x + 0.5);
      const sunward = Math.exp(-Math.abs(x - SUN[0]) / 45);
      if (y >= near(x + 0.5)) {
        const s = 0.75 + 0.5 * fbm(x * 0.3, y * 0.3, 2, 0);
        put(x, r, 0.1 * s, 0.05 * s, 0.13 * s, NEAR);
      } else if (y >= fr) {
        // the nearer range: deep purple, its ridge rimmed where the sun is behind it
        const dd = y - fr;
        const tex = 0.85 + 0.3 * fbm(x * 0.15, y * 0.25, 3, 0);
        const rim = Math.exp(-dd / 0.9) * 0.3 * (0.3 + sunward);
        put(x, r,
          mix(skyR[k], 0.15, 0.86) * tex * (1 - 0.3 * smooth(0, 14, dd)) + rim,
          mix(skyG[k], 0.07, 0.86) * tex * (1 - 0.3 * smooth(0, 14, dd)) + rim * 0.55,
          mix(skyB[k], 0.21, 0.86) * tex * (1 - 0.3 * smooth(0, 14, dd)) + rim * 0.3, FAR);
      } else if (y >= br) {
        // the far range: the sky's own colour sunk into hazy mauve
        const dd = y - br;
        const tex = 0.9 + 0.2 * fbm(x * 0.1, y * 0.2, 3, 0);
        const rim = Math.exp(-dd / 1.2) * 0.4 * sunward;
        put(x, r,
          mix(skyR[k], 0.44, 0.55) * tex + rim,
          mix(skyG[k], 0.24, 0.55) * tex + rim * 0.65,
          mix(skyB[k], 0.42, 0.55) * tex + rim * 0.35, FAR);
      }
    }
  }

  // The Monsoon Palace on the highest peak: a dark crown with a few lit windows.
  {
    const M = 26; // its centre column
    const base = Math.round(far(M + 0.5)) + 1;
    const mc = [0.11, 0.05, 0.14];
    for (let x = M - 8; x < M + 9; x++) for (let y = base - 1; y < far(x + 0.5) + 1; y++) put(x, y, mc[0], mc[1], mc[2], FAR);
    for (let x = M - 6; x < M + 7; x++) for (let y = base - 5; y < base; y++) put(x, y, mc[0], mc[1], mc[2]);
    for (let x = M - 2; x < M + 3; x++) for (let y = base - 9; y < base - 5; y++) put(x, y, mc[0], mc[1], mc[2]);
    const dome = (cx: number, by: number, rx: number, ry: number) => {
      for (let y = Math.floor(by - ry); y < by; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
          if (((x + 0.5 - cx) / rx) ** 2 + ((by - y - 0.5) / ry) ** 2 < 1) put(x, y, mc[0], mc[1], mc[2]);
    };
    dome(M + 0.5, base - 9, 3, 3.4);
    put(M, base - 13, mc[0], mc[1], mc[2]);
    dome(M - 5, base - 5, 1.6, 2);
    dome(M + 6, base - 5, 1.6, 2);
    for (const x of [M - 4, M - 1, M + 2, M + 5]) lampAt(x, base - 3, hash(x, 7), mc[0], mc[1], mc[2]);
    lampAt(M, base - 7, hash(M, 8), mc[0], mc[1], mc[2]);
  }

  // The City Palace, white stone gone gold: the sun still on its upper floors,
  // the lower ones already in the hills' shadow.
  const stone = (x: number, y: number, s: number) => {
    const k = clamp(s);
    return [mix(0.7, 1.0, k), mix(0.5, 0.84, k), mix(0.6, 0.6, k)] as const;
  };
  BLOCKS.forEach(([x0, x1, top, tower], bi) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const off = (w % 5) >> 1;
    for (let y = top; y < PLINTH; y++) {
      for (let x = x0; x < x1; x++) {
        let s = smooth(56, 36, y) * (bi & 1 ? 0.92 : 1);
        if (tower) s += x + 0.5 < cx ? 0.12 : -0.08;
        const ry = y - top, fy = ry % 5;
        const g = Math.floor((x - x0 - off) / 5), fx = x - x0 - off - g * 5;
        const fits = x - x0 - off >= 0 && x0 + off + g * 5 + 5 <= x1;
        const win = fits && ry > 0 && ((fy >= 3 && fx >= 1 && fx <= 3) || (fy === 2 && fx === 2));
        if (fy === 0) s += 0.14; // the ledge of each floor's balconies
        const [cr, cg, cb] = stone(x, y, s);
        if (win) {
          const h = hash(g * 31 + bi * 7, Math.floor(ry / 5) + 3);
          if (h < 0.55) lampAt(x, y, hash(h * 1e4, 2), cr * 0.3, cg * 0.2, cb * 0.32);
          else put(x, y, cr * 0.3, cg * 0.2, cb * 0.32);
        } else put(x, y, cr, cg, cb);
      }
    }
    if (tower) {
      // an onion dome on a drum, a finial on top
      const rx = w / 2 + 0.4, ry = rx * 1.35;
      for (let y = Math.floor(top - ry); y < top; y++)
        for (let x = x0 - 1; x <= x1; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (top - y - 0.5) / ry;
          if (dx * dx + dy * dy < 1) {
            const [cr, cg, cb] = stone(x, y, 1.05 - 0.45 * (dx + 1) * 0.5 - 0.1 * (1 - dy));
            put(x, y, cr, cg, cb);
          }
        }
      const fx = Math.floor(cx);
      put(fx, Math.floor(top - ry) - 1, 1.0, 0.8, 0.5);
      put(fx, Math.floor(top - ry) - 2, 1.0, 0.8, 0.5);
    } else {
      // battlements, and a row of small domed pavilions (chhatris)
      for (let x = x0; x < x1; x++) if (!(x & 1)) put(x, top - 1, ...stone(x, top, 0.9));
      for (let c = x0 + 3.5; c + 2.5 < x1; c += 6) {
        put(Math.floor(c - 1.5), top - 1, ...stone(c, top, 0.85));
        put(Math.floor(c + 1.5), top - 1, ...stone(c, top, 0.6));
        for (let y = top - 4; y < top - 1; y++)
          for (let x = Math.floor(c - 3); x <= c + 3; x++) {
            const dx = (x + 0.5 - c) / 2.4, dy = (top - 1.5 - y - 0.5) / 2.4;
            if (dx * dx + dy * dy < 1) put(x, y, ...stone(x, y, 0.95 - 0.35 * (dx + 1) * 0.5));
          }
      }
    }
  });
  // its terrace in shadow, an arcade along the water, the ghat's steps
  for (let y = PLINTH; y < HORIZON; y++) {
    for (let x = 110; x < W; x++) {
      if (y < near(x + 0.5) - 0 && x < 114) continue;
      const fx = (x - 110) % 6, ry = y - PLINTH;
      let [cr, cg, cb] = stone(x, y, 0.2 + 0.1 * fbm(x * 0.4, y * 0.4, 2, 0));
      if (y >= HORIZON - 2) (cr *= 1.2), (cg *= 1.15), (cb *= 1.1); // steps, worn pale
      if (y === HORIZON - 2) (cr *= 0.8), (cg *= 0.8), (cb *= 0.8);
      const arch = (ry >= 3 && ry <= 5 && fx >= 2 && fx <= 4) || (ry === 2 && fx === 3);
      if (arch) {
        const h = hash(Math.floor((x - 110) / 6), 11);
        if (h < 0.4) lampAt(x, y, hash(x >> 2, 12), cr * 0.4, cg * 0.3, cb * 0.45);
        else put(x, y, cr * 0.4, cg * 0.3, cb * 0.45);
      } else put(x, y, cr, cg, cb);
    }
  }

  // The Lake Palace, white marble floating on the water, lit from the west.
  {
    const marble = (x: number, s: number) => {
      const k = clamp(s * (0.55 + 0.45 * smooth(122, 82, x)));
      return [mix(0.68, 1.0, k), mix(0.48, 0.9, k), mix(0.6, 0.8, k)] as const;
    };
    const LX = -20; // drawn about x 102, set down left of there
    const set = (x: number, y: number, c: readonly number[], m = BUILT) => {
      put(x + LX, y, c[0], c[1], c[2], m);
      lake[y * W + x + LX] = 1;
    };
    const storey = (x0: number, x1: number, top: number, bottom: number) => {
      for (let y = top; y < bottom; y++)
        for (let x = x0; x < x1; x++) {
          const ry = y - top, fx = (x - x0) % 5;
          let s = 0.95;
          if (ry === 0) s = 1.1;
          if (y >= LP_Y - 2) s = 0.7;
          const c = marble(x, s);
          const win = (ry === 2 && fx === 2) || (ry >= 3 && ry <= 4 && fx >= 1 && fx <= 3);
          const gate = y >= LP_Y - 2 && fx === 2 && bottom === LP_Y;
          if (win || gate) {
            const dark = [c[0] * 0.42, c[1] * 0.3, c[2] * 0.42];
            if (win && hash(Math.floor((x - x0) / 5), top) < 0.6) {
              set(x, y, dark, LAMP);
              phase[y * W + x + LX] = hash(Math.floor((x - x0) / 5) + 40, top);
            } else set(x, y, dark);
          } else set(x, y, c);
        }
    };
    storey(84, 120, 64, LP_Y);
    storey(89, 115, 59, 64);
    const dome = (cx: number, by: number, rx: number, ry: number) => {
      for (let y = Math.floor(by - ry); y < by; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (by - y - 0.5) / ry;
          if (dx * dx + dy * dy < 1) set(x, y, marble(x, 1.1 - 0.5 * (dx + 1) * 0.5 - 0.1 * (1 - dy)));
        }
    };
    // the central dome on its drum, chhatris at the corners
    for (let x = 98; x < 107; x++) set(x, 58, marble(x, 0.85));
    dome(102.5, 58, 4.8, 5.4);
    set(102, 52, marble(102, 1.1));
    for (const [c, by] of [[86.5, 64], [117.5, 64], [91.5, 59], [112.5, 59]]) {
      set(Math.floor(c - 1.5), by - 1, marble(c, 0.8));
      set(Math.floor(c + 1.5), by - 1, marble(c, 0.8));
      dome(c, by - 1, 2.4, 2.6);
    }
  }

  // --- the clouds: thin bands lit from below, wrapping so they drift forever
  const CW = 600;
  const cover = new Float32Array(CW * HORIZON);
  const lit = new Float32Array(CW * HORIZON);
  const density = (x: number, y: number) =>
    fbm(x * 0.01, y * 0.12, 4, CW * 0.01) - 0.12 * smooth(16, 6, y) - 0.12 * smooth(34, 44, y);
  for (let r = 0; r < HORIZON; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const d = density(x, y);
      cover[r * CW + x] = smooth(0.54, 0.64, d);
      lit[r * CW + x] = clamp(0.5 + (d - density(x, y + 1.5)) * 9);
    }
  }

  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N);
  const birds = new Uint8Array(N);
  const marked: number[] = [];

  const emit = (k: number, r: number, x: number, cr: number, cg: number, cb: number, floor: number, fade: number, color?: Uint8Array) => {
    (FR[k] = cr), (FG[k] = cg), (FB[k] = cb);
    // Dot size from brightness, dithered. Then the colour makes up what the
    // dot size could not: a small dot is drawn brighter and a large one
    // dimmer, so a gradient stays smooth across the dither's steps.
    const peak = Math.max(cr, cg, cb, 1e-4);
    const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
    const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
    out[k] = DOTS[step];
    if (color) {
      const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
      const s = (0.3 + 0.7 * want) / peak;
      color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
    }
  };

  return (t, { color } = {}) => {
    const drift = t * CLOUD_DRIFT;

    // the birds: a loose flock crossing the afterglow, wings beating
    for (const k of marked) birds[k] = 0;
    marked.length = 0;
    const mark = (x: number, y: number) => {
      x = Math.round(x), y = Math.round(y);
      if (x < 0 || x >= W || y < 0 || y >= HORIZON) return;
      birds[y * W + x] = 1;
      marked.push(y * W + x);
    };
    const flock = ((t * 2.6 + 130) % 300) - 50;
    for (let i = 0; i < 8; i++) {
      const bx = flock - [0, 5, 9, 4, 12, 16, 8, 21][i];
      const by = 30 + [0, 2, 4, -3, 5, 7, -5, 3][i] + 1.2 * Math.sin(t * 0.7 + i);
      const f = Math.sin(t * 6.5 + i * 1.9);
      const lift = f > 0.35 ? -1 : f < -0.35 ? 1 : 0;
      mark(bx, by);
      mark(bx - 1, by - 1 + (lift > 0 ? 1 : 0)), mark(bx + 1, by - 1 + (lift > 0 ? 1 : 0));
      mark(bx - 2, by - 1 + lift), mark(bx + 2, by - 1 + lift);
    }
    const pair = 230 - ((t * 1.8) % 300);
    for (let i = 0; i < 2; i++) {
      const bx = pair + i * 6, by = 18 + i * 2 + Math.sin(t * 0.5 + i);
      const lift = Math.sin(t * 5 + i * 2) > 0 ? -1 : 0;
      mark(bx, by), mark(bx - 1, by - 1), mark(bx + 1, by - 1), mark(bx - 2, by - 1 + lift), mark(bx + 2, by - 1 + lift);
    }

    // where the boats are now
    const span = W + 70;
    const boats = BOATS.map((b) => {
      const w = b.art[0].length, h = b.art.length;
      const x = ((((b.x0 + b.v * t) % span) + span) % span) - 35;
      return { ...b, w, x: Math.round(x), top: b.y - h + 1, hull: b.art.findIndex((l) => l.includes("h")) };
    });

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        const m = mat[k];
        let cr = 0, cg = 0, cb = 0, floor = 0.12, fade = 1;

        if (m === LAMP) {
          const on = lampGlow(phase[k], t);
          cr = mix(SR[k], 1.0, on), cg = mix(SG[k], 0.8, on), cb = mix(SB[k], 0.4, on);
        } else if (m !== AIR) {
          (cr = SR[k]), (cg = SG[k]), (cb = SB[k]);
          if (m === NEAR) floor = 0.02;
          if (m === FAR) floor = 0.05;
          if (m === BUILT) floor = 0.04;
        } else if (r < HORIZON) {
          // sky: the gradient, the sun, a few early stars, the drifting cloud
          (cr = skyR[k]), (cg = skyG[k]), (cb = skyB[k]);
          floor = 0.04 + 0.08 * smooth(0, 30, y);
          const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
          const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
          const c = cover[i0] + (cover[i1] - cover[i0]) * fx;
          if (c < 0.05 && y < 16 && hash(x, r * 3 + 5) > 0.992) {
            const s = (0.55 + 0.45 * Math.sin(t * (1.3 + hash(x, r) * 2) + hash(r, x) * 6.28)) * smooth(16, 4, y);
            cr = Math.max(cr, s * 0.95), cg = Math.max(cg, s * 0.9), cb = Math.max(cb, s);
          }
          if (c > 0.01) {
            const l = lit[i0] + (lit[i1] - lit[i0]) * fx;
            const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
            const nearSun = Math.exp(-Math.sqrt(dx * dx + dy * dy) / 45);
            const low = smooth(6, 42, y);
            const warm = clamp(0.25 + 0.5 * low + 0.8 * nearSun);
            const lr = mix(0.95, 1.0, warm), lg = mix(0.34, 0.78, warm), lb = mix(0.55, 0.42, warm);
            const dr = mix(0.24, 0.5, low), dg = mix(0.11, 0.22, low), db = mix(0.32, 0.38, low);
            const a = Math.min(1, c * 0.95);
            cr = mix(cr, mix(dr, lr, l), a);
            cg = mix(cg, mix(dg, lg, l), a);
            cb = mix(cb, mix(db, lb, l), a);
          }
          if (birds[k]) (cr = 0.1), (cg = 0.04), (cb = 0.1);
        } else {
          // the lake: everything above it, mirrored and broken by ripples
          const depth = (y - HORIZON) / (H - HORIZON);
          const w1 = noise(x * 0.03 + t * 0.03, y * 0.5 - t * 0.25, 0);
          const w2 = noise(x * 0.08 - t * 0.05, y * 1.3 - t * 0.5, 0);
          const sx = Math.max(0, Math.min(W - 1, Math.round(x + (w1 - 0.5) * (1.5 + 5 * depth))));
          const oy = (w2 - 0.5) * (1 + 3 * depth);
          let src = -1;
          if (r >= LP_Y) {
            const ry = Math.round(2 * LP_Y - 1 - r + oy);
            if (ry >= 48 && ry < LP_Y && lake[ry * W + sx]) src = ry * W + sx;
          }
          if (src < 0) src = Math.max(0, Math.min(HORIZON - 1, Math.round(2 * HORIZON - 1 - r + oy))) * W + sx;
          const band = 0.4 + 0.6 * smooth(0.32, 0.68, w2);
          const dim = (0.8 - 0.2 * depth) * (1 - 0.22 * smooth(110, 200, x));
          cr = FR[src] * band * dim + 0.03;
          cg = FG[src] * band * dim * 0.96 + 0.02;
          cb = FB[src] * band * dim * 1.05 + 0.06;
          // the sun's road, broken into glints
          const road = Math.exp(-(((x + 0.5 - SUN[0]) / (2.5 + depth * 16)) ** 2));
          const glint = smooth(0.6, 0.85, w2) * road;
          cr += 0.8 * glint, cg += 0.6 * glint, cb += 0.3 * glint;
          // a soft haze along the far shore
          const haze = Math.exp(-(y - HORIZON) / 2) * 0.12;
          cr += haze, cg += haze * 0.6, cb += haze * 0.5;
          floor = 0.1;
          fade = smooth(H + 8, H - 16, y);

          for (const b of boats) {
            // the wake: two arms spreading behind, and churned water close astern
            const a = b.v > 0 ? b.x - x : x - (b.x + b.w);
            if (a > -1 && a < 70) {
              const s = b.w / 22;
              const dy = Math.abs(y - b.y - 0.2);
              const arm = Math.exp(-(((dy - (a + 1) * 0.09 * s - 0.4) / (0.7 + 0.02 * a)) ** 2)) * Math.exp(-a / (30 * s));
              const churn = Math.exp(-((dy / (0.8 * s + 0.4)) ** 2)) * Math.exp(-a / (12 * s));
              const lap = 0.5 + 0.5 * smooth(0.3, 0.7, noise(x * 0.6 + b.v * t * 0.6, y * 1.7, 0));
              const wk = Math.min(1, arm * 1.3 + churn * 1.1) * lap;
              cr = mix(cr, 1.0, wk * 0.8), cg = mix(cg, 0.86, wk * 0.8), cb = mix(cb, 0.66, wk * 0.8);
            }
            // the boat's dark reflection
            if (r > b.y && r <= b.y + 3 && x >= b.x + 1 && x < b.x + b.w - 1) {
              const q = 0.35 + 0.15 * (r - b.y);
              (cr *= q), (cg *= q), (cb *= q);
            }
          }
        }

        // the boats themselves, in front of everything on the water
        if (r >= HORIZON) {
          for (const b of boats) {
            if (r < b.top || r > b.y || x < b.x || x >= b.x + b.w) continue;
            const col = b.v > 0 ? x - b.x : b.w - 1 - (x - b.x);
            const ch = b.art[r - b.top][col];
            if (ch === ".") continue;
            const row = r - b.top;
            if (ch === "h") {
              // wood catching the sunset, darker toward the water
              const s = 1 - 0.2 * (row - b.hull);
              (cr = 0.55 * s), (cg = 0.26 * s), (cb = 0.16 * s), (floor = 0.04);
            } else if (ch === "g") (cr = 0.98), (cg = 0.7), (cb = 0.34);
            else if (ch === "p") (cr = 0.8), (cg = 0.55), (cb = 0.32);
            else if (ch === "s") (cr = 0.2), (cg = 0.08), (cb = 0.12), (floor = 0.02);
            else if (ch === "r") (cr = 0.1), (cg = 0.04), (cb = 0.08), (floor = 0);
            else if (ch === "c") {
              // the canopy: a pale top, red cloth hanging below it
              if (row === 0) (cr = 1.0), (cg = 0.88), (cb = 0.72);
              else (cr = 0.88), (cg = 0.22), (cb = 0.24);
            } else if (ch === "o") {
              const on = 0.85 + 0.15 * Math.sin(t * 7 + b.h * 40);
              (cr = on), (cg = 0.8 * on), (cb = 0.42 * on);
            }
            fade = 1;
          }
        }

        emit(k, r, x, cr, cg, cb, floor, fade, color);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
