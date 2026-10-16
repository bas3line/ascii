/*
 * snow train: a winter night in the mountains. A long stone viaduct spans a
 * deep valley, and a red train with warm windows comes out of a tunnel and
 * crosses it slowly to the left, its headlight cutting a cone through snow
 * that falls at three depths. Pines stand in the snow, a frozen river below
 * takes the lights, a full moon sits behind thin cloud, and the chimneys of a
 * small village smoke into the cold.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of snow train. Defaults are the original values. */
export interface SnowTrainOptions {
  [key: string]: unknown;
  /** The moon's column. */
  moonX: number;
  /** The moon's row. */
  moonY: number;
  /** The moon's radius in cells. */
  moonRadius: number;
  /** The train's speed in cells a second. */
  speed: number;
  /** The train's roof row. */
  roof: number;
  /** The column past which the train is inside the hill. */
  tunnelMouth: number;
  /** The engine and coaches, nose to tail, in cells. */
  trainLength: number;
  /** The row of the train's lamps. */
  lampHeight: number;
}

export const meta = {
  name: "snow train",
  category: "scenes",
  note: "a lit train crossing a snowy stone viaduct at night as snow falls",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#070b16",
  palette: [
    "#0c1428", "#121d38", "#19284a", "#22345e", "#2d4374", "#3b548a", "#4d68a0", "#6480b4",
    "#7f99c6", "#9db3d6", "#bccde4", "#d9e4f1", "#f1f5fb",
    "#ffe7b0", "#ffc56e", "#f29a3c", "#b8642a", "#6e3a22",
    "#3e1420", "#6a1e26", "#9a2c2e", "#ff4a3d",
    "#0b1a1e", "#11262a", "#1a3436", "#26474a",
    "#1e2230", "#2c3242", "#3e4658", "#586276", "#7c8698",
  ],
options: {
    moonX: 152,
    moonY: 15,
    moonRadius: 7,
    speed: 7,
    roof: 42,
    tunnelMouth: 185,
    trainLength: 156,
    lampHeight: 47,
  },
  params: {
    moonX: { label: "moon position", min: 60, max: 190, step: 1 },
    moonY: { label: "moon height", min: 2, max: 40, step: 1 },
    moonRadius: { label: "moon radius", min: 3, max: 16, step: 0.5 },
    speed: { label: "train speed", min: 0, max: 20, step: 0.5 },
    roof: { label: "train height", min: 30, max: 55, step: 1 },
    tunnelMouth: { label: "tunnel mouth", min: 150, max: 195, step: 1 },
    trainLength: { label: "train length", min: 60, max: 220, step: 1 },
    lampHeight: { label: "lamp height", min: 36, max: 52, step: 1 },
  },
} satisfies Meta<SnowTrainOptions>;

const W = 200, H = 100;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// What a cell is, for the parts of the frame that change with time.
const SKY = 0, FAR = 1, STONE = 2, CAP = 3, FRONT = 4, RIVER = 5, PANE = 6, MOUTH_K = 7;

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

// The near ground: a bank on the left, the valley floor, and the hillside on
// the right that rises past the track into the mountain with the tunnel.
const ground = (x: number) =>
  Math.min(80 + 8 * smooth(0, 48, x), 88 - 39 * smooth(104, 172, x) - 30 * smooth(170, 200, x)) +
  1.6 * (fbm(x * 0.09, 2.3, 3, 0) - 0.5);
// The far range, a big peak on the left and a lower one under the moon.
const ridge = (x: number) =>
  34 - 18 * Math.exp(-(((x - 52) / 30) ** 2)) - 9 * Math.exp(-(((x - 118) / 16) ** 2)) - 5 * Math.exp(-(((x - 178) / 22) ** 2)) +
  7 * (fbm(x * 0.06, 0.5, 4, 0) - 0.5) + 2.5 * (fbm(x * 0.3, 4.5, 2, 0) - 0.5);
// The wooded slopes behind the viaduct, seen through its arches.
const woods = (x: number) => 76 + 6 * (fbm(x * 0.04, 7.1, 3, 0) - 0.5) - 6 * smooth(40, 0, x) - 6 * smooth(110, 160, x);
const riverY = (x: number) => 93.5 + 1.8 * Math.sin(x * 0.045 + 0.6) + 0.8 * Math.sin(x * 0.13);
const riverW = (x: number) => 2.4 + 0.8 * Math.sin(x * 0.07 + 2);

// A pine at (cx, base), h tall, w half-wide at the foot: tiers of boughs with
// snow along their tops and on the moon side. 0 outside, 1 needles, 2 snow.
function pine(x: number, y: number, cx: number, base: number, h: number, w: number): number {
  const dy = y - (base - h);
  if (dy < 0 || dy > h) return 0;
  const dx = x + 0.5 - cx;
  if (dy > h - 1.5) return Math.abs(dx) < 0.6 ? 1 : 0; // the trunk
  const tiers = Math.max(2, Math.round(h / 4));
  const tier = (dy / (h - 1.5)) * tiers;
  const local = tier - Math.floor(tier);
  const hw = w * ((Math.floor(tier) + 0.35 + 0.65 * local) / tiers) + 0.35;
  if (Math.abs(dx) > hw) return 0;
  // snow lies on each tier's upper edge and toward the moon (the right)
  const top = local < 0.3 && Math.abs(dx) > hw * 0.35;
  const lee = dx > hw * 0.45 && hash(x * 3 + 1, y * 7 | 0) > 0.45;
  return top || lee || (dy < 1.2) ? 2 : 1;
}

export default function snowTrain(o: Partial<SnowTrainOptions> = {}): Frame {
  const { moonX = meta.options.moonX, moonY = meta.options.moonY, moonRadius = meta.options.moonRadius, speed = meta.options.speed, roof = meta.options.roof, tunnelMouth = meta.options.tunnelMouth, trainLength = meta.options.trainLength, lampHeight = meta.options.lampHeight } = o;
  const MOON = [moonX, moonY];
  const MOON_R = moonRadius;
  const ROOF = roof; // the train's roof row; the parapet hides it below row 48
  const LAMP_Y = lampHeight;
  const SPEED = speed; // cells a second
  const LEN = trainLength; // engine and five coaches, nose to tail
  const MOUTH = tunnelMouth; // the train is inside the hill past this column
  const PERIOD = MOUTH + LEN + 40; // one crossing and a pause on the empty bridge
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

  // --- the still picture, built once ---------------------------------------
  const kind = new Uint8Array(N);
  const br = new Float32Array(N), bg = new Float32Array(N), bb = new Float32Array(N);
  const flo = new Float32Array(N);
  const set = (k: number, kd: number, r: number, g: number, b: number, f: number) => {
    (kind[k] = kd), (br[k] = r), (bg[k] = g), (bb[k] = b), (flo[k] = f);
  };
  const G = new Float32Array(W + 1), R = new Float32Array(W + 1), B = new Float32Array(W + 1);
  for (let x = 0; x <= W; x++) (G[x] = ground(x + 0.5)), (R[x] = ridge(x + 0.5)), (B[x] = woods(x + 0.5));

  // relief for the far snowfields: a ridged height, lit from the moon's side
  const relief = (x: number, y: number) => {
    const n = fbm(x * 0.05 + y * 0.03, y * 0.11, 4, 0);
    return 1 - Math.abs(2 * n - 1);
  };

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const v = y / 50;
      // sky: deep navy overhead to a paler band behind the peaks, a halo round the moon
      const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
      const dm = Math.sqrt(dmx * dmx + dmy * dmy);
      const halo = Math.exp(-dm / 26) * 0.3 + Math.exp(-dm / 10) * 0.4;
      const veil = 0.88 + 0.24 * fbm(x * 0.05, y * 0.08, 3, 0);
      set(k, SKY, (0.015 + 0.06 * v * v) * veil + 0.26 * halo, (0.025 + 0.08 * v * v) * veil + 0.31 * halo, (0.06 + 0.15 * v * v) * veil + 0.38 * halo, 0.04);

      if (y >= R[x]) {
        // snowfields and rock, lit up-right, sinking into the valley mist
        // faces turned to the moon (the ridge falling away to the right) are lit,
        // couloirs streak down them, and the lower slopes go dark with forest
        const depth = y - R[x];
        const fall = (R[Math.min(W, x + 3)] - R[Math.max(0, x - 3)]) / 6;
        const h0 = relief(x, y);
        const face = clamp(0.45 + fall * 1.6 + 5 * (h0 - relief(x + 1.3, y - 0.9)));
        const streak = noise(x * 0.3 + y * 0.12, y * 0.05, 0);
        const rim = smooth(2, 0, depth) * 0.45;
        const s = ((0.16 + 0.95 * face * face) * (0.7 + 0.45 * streak) + rim) * (1 - 0.75 * smooth(7, 22, depth));
        let cr = 0.52 * s, cg = 0.62 * s, cb = 0.88 * s;
        // the valley mist, pale and luminous, lying behind the bridge
        const mist = smooth(36, 52, y);
        cr = mix(cr, 0.3, mist * 0.92), cg = mix(cg, 0.38, mist * 0.92), cb = mix(cb, 0.57, mist * 0.92);
        set(k, FAR, cr, cg, cb, 0.12);
      }
      if (y >= B[x]) {
        // the woods behind: dark boughs with snow caught in them, paler in the mist
        const fleck = hash(x * 5 + 3, r * 9 + 1) > 0.8 ? 1 : 0;
        const deep = smooth(B[x], B[x] + 10, y);
        const n = fbm(x * 0.2, y * 0.3, 2, 0);
        const m = 0.5 * (1 - deep);
        set(k, FAR, mix(0.03 + 0.2 * fleck * n, 0.2, m), mix(0.06 + 0.25 * fleck * n, 0.26, m), mix(0.09 + 0.36 * fleck * n, 0.4, m), 0.05);
      }
    }
  }

  // the treeline of the back woods, small pines along the top edge
  for (let x = -2; x < W + 2; x += 1.6 + hash(x * 13 | 0, 21) * 1.8) {
    const cx = x + hash(x * 7 | 0, 22);
    const base = woods(cx) + 3;
    const h = 4 + hash(cx * 11 | 0, 23) * 5;
    const w = 1.3 + hash(cx * 5 | 0, 24) * 1;
    for (let r = Math.max(0, Math.floor(base - h)); r < Math.min(H, base + 1); r++) {
      for (let xx = Math.max(0, Math.floor(cx - w - 1)); xx < Math.min(W, cx + w + 1); xx++) {
        const p = pine(xx, r + 0.5, cx, base, h, w);
        if (!p) continue;
        const m = 0.45;
        if (p === 2) set(r * W + xx, FAR, mix(0.32, 0.22, m), mix(0.4, 0.28, m), mix(0.58, 0.42, m), 0.1);
        else set(r * W + xx, FAR, mix(0.05, 0.2, m * 0.6), mix(0.09, 0.26, m * 0.6), mix(0.11, 0.4, m * 0.6), 0.08);
      }
    }
  }

  // the viaduct, the near ground and the river
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const g = G[x];
      if (x < 176 && y >= 49 && y < g + 0.5) {
        const i = Math.round((x + 0.5 - 8) / 20);
        const dx = x + 0.5 - (8 + 20 * i);
        const hw = 7 - Math.max(0, y - 66) * 0.05;
        const open = y > 59 && (y < 66 ? dx * dx + (y - 66) ** 2 < 49 : Math.abs(dx) < hw);
        if (!open) {
          // dressed stone in courses, each block a little different
          const course = Math.floor((r - 49) / 3);
          const bx = Math.floor((x + (course & 1) * 3) / 6);
          const mortar = (r - 49) % 3 === 0 || (x + (course & 1) * 3) % 6 === 0;
          let s = 0.55 + 0.4 * hash(bx, course) + 0.25 * fbm(x * 0.3, y * 0.3, 2, 0);
          if (mortar) s *= 0.6;
          // the arch rings, a step lighter, and the pier edge facing the moon
          const ring = y > 57 && y < 67 && Math.sqrt(dx * dx + (y - 66) ** 2) < 9.2 && Math.abs(dx) < 9;
          if (ring) s *= 1.3;
          if (y >= 59 && Math.abs(dx) > (y < 66 ? Math.sqrt(Math.max(0, 49 - (y - 66) ** 2)) : hw) - 0.1 && dx < 0 && dx > -hw - 1.5) s *= 1.6;
          // lower down the piers stand in the valley mist
          const mist = smooth(62, 92, y) * 0.2;
          let cr = mix(0.07 * s, 0.16, mist), cg = mix(0.085 * s, 0.2, mist), cb = mix(0.13 * s, 0.3, mist);
          let kd = STONE;
          if (r === 49) {
            // snow along the parapet
            const n = 0.85 + 0.15 * hash(x, 77);
            (cr = 0.62 * n), (cg = 0.7 * n), (cb = 0.86 * n), (kd = CAP);
          } else if (r === 53 || r === 66) {
            // snow lying on the cornice and the impost ledges
            const n = hash(x * 3, r) > 0.3 ? 1 : 0.5;
            (cr = 0.5 * n), (cg = 0.58 * n), (cb = 0.76 * n);
          } else if (r === 54) {
            (cr *= 0.45), (cg *= 0.45), (cb *= 0.5); // shade under the cornice
          }
          set(k, kd, cr, cg, cb, kd === CAP ? 0.12 : 0.03);
        }
      }
      if (y >= g) {
        // the near snow, lit where it turns toward the moon, rippled by wind
        const slope = G[Math.min(W, x + 1)] - g;
        const face = clamp(0.5 + slope * 1.4);
        const crest = Math.exp(-(y - g) / 2.5) * 0.18;
        const ripple = 0.06 * Math.sin(x * 0.35 + y * 1.1 + fbm(x * 0.05, y * 0.05, 2, 0) * 9);
        const s = 0.12 + 0.24 * fbm(x * 0.07, y * 0.12, 4, 0) + 0.34 * face + 1.8 * crest + ripple;
        set(k, FRONT, 0.42 * s, 0.53 * s, 0.82 * s, 0.1);
        const ry = riverY(x + 0.5), rw = riverW(x + 0.5);
        if (Math.abs(y - ry) < rw && y > g + 2) {
          // ice: slate blue, smoothed by wind, with pale cracks across it
          const n = fbm(x * 0.12, y * 0.7, 3, 0);
          const crack = Math.abs(noise(x * 0.22, y * 0.9, 0) - 0.5) < 0.035 ? 0.18 : 0;
          const edge = smooth(rw, rw - 1.2, Math.abs(y - ry));
          set(k, RIVER, (0.2 + 0.16 * n + crack) * edge + 0.4 * (1 - edge), (0.28 + 0.2 * n + crack) * edge + 0.46 * (1 - edge), (0.44 + 0.24 * n + crack) * edge + 0.62 * (1 - edge), 0.16);
        }
        if (y > 98 + 1.5 * noise(x * 0.1, 3, 0)) {
          // the near bank, in shadow
          set(k, FRONT, 0.22, 0.27, 0.4, 0.12);
        }
      }
      // the tunnel portal: a stone face with a round-topped mouth
      if (x >= 174 && x < 189 && y >= 35 && y < 53) {
        const dx = x + 0.5 - 181.5;
        const open = (y >= 45 ? Math.abs(dx) < 4.5 : dx * dx + (y - 45) ** 2 < 20.25) && y < 52.5;
        if (open) set(k, MOUTH_K, 0.015, 0.015, 0.03, 0);
        else if (r === 35) set(k, CAP, 0.62, 0.7, 0.86, 0.12);
        else {
          const ring = Math.sqrt(dx * dx + (y - 45) ** 2) < 6.2 && y < 46;
          const mortar = (r - 35) % 3 === 0 || (x + ((r / 3) & 1) * 3) % 5 === 0;
          const s = (0.5 + 0.3 * hash(x >> 2, (r / 3) | 0)) * (mortar ? 0.75 : 1) * (ring ? 1.2 : 1);
          set(k, STONE, 0.21 * s, 0.24 * s, 0.32 * s, 0.12);
        }
      }
    }
  }

  // the village on the hillside: snowed-in houses with lit windows
  const chimneys: [number, number][] = [];
  const panes: [number, number][] = [];
  for (const [x0, w] of [[115, 10], [128, 9], [141, 10]]) {
    let base = 0;
    for (let x = x0; x <= x0 + w; x++) base = Math.max(base, G[x]);
    base = Math.round(base) + 1;
    for (let r = base - 9; r <= base; r++) {
      for (let x = x0 - 1; x <= x0 + w + 1; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        if (r > base - 5 && x >= x0 && x <= x0 + w) {
          // log walls, two warm windows
          const s = 0.6 + 0.4 * hash(x, r * 3);
          set(k, FRONT, 0.06 * s, 0.065 * s, 0.09 * s, 0.02);
          if ((x === x0 + 2 || x === x0 + 3 || x === x0 + w - 3 || x === x0 + w - 2) && r >= base - 3 && r <= base - 2) {
            set(k, PANE, 1, 0.74, 0.34, 0.3);
            panes.push([x + 0.5, y]);
          }
          if (r === base && hash(x, 91) > 0.4) set(k, FRONT, 0.5, 0.58, 0.78, 0.2); // drift at the door
        } else if (r <= base - 5) {
          // a steep roof heavy with snow, a shadowed underside at the eaves
          const half = (w / 2 + 1.5) * ((y - (base - 9)) / 4.5);
          const cx = x0 + w / 2 + 0.5;
          if (Math.abs(x + 0.5 - cx) <= half) {
            const lit = x + 0.5 > cx ? 1 : 0.82;
            set(k, FRONT, 0.84 * lit, 0.89 * lit, 1 * lit, 0.3);
            if (r === base - 5) set(k, FRONT, 0.05, 0.05, 0.08, 0.02);
          }
        }
      }
    }
    const cx = x0 + w - 2;
    for (let r = base - 10; r < base - 7; r++) set(r * W + cx, FRONT, 0.14, 0.1, 0.1, 0.08);
    set((base - 10) * W + cx, FRONT, 0.6, 0.68, 0.86, 0.2);
    chimneys.push([cx + 0.5, base - 10]);
  }

  // pines on the near ground, back to front, the two big ones last
  const trees: [number, number, number, number][] = [];
  const plant = (from: number, to: number, gap: number, hMin: number, hMax: number, seed: number) => {
    for (let x = from; x < to; x += gap + hash(x * 7 | 0, seed) * gap) {
      if (x > 114 && x < 156) continue; // the village keeps its clearing
      const h = hMin + hash(x * 3 | 0, seed + 1) * (hMax - hMin);
      trees.push([x, G[Math.max(0, Math.min(W, Math.round(x)))] + 1.5, h, h * 0.36]);
    }
  };
  plant(26, 70, 3.5, 6, 11, 40);
  plant(102, 174, 3, 6, 12, 50);
  plant(189, 203, 3, 8, 14, 60);
  // and scattered down the slopes, the hillside dark with forest
  for (let i = 0; i < 150; i++) {
    const x = hash(i, 71) * 206 - 3;
    const g = G[Math.max(0, Math.min(W, Math.round(x)))];
    const base = g + 4 + hash(i, 72) * (93 - g);
    if (base > 91 || (x > 108 && x < 156 && base < g + 14) || (x < 96 && x > 40) || (x > 170 && x < 192 && base < 56)) continue;
    const h = 5 + hash(i, 73) * 5;
    trees.push([x, base, h, h * 0.38]);
  }
  trees.push([112, G[112] + 1.5, 12, 4.2], [158, G[158] + 1.5, 10, 3.6], [161, G[161] + 1.5, 13, 4.5]);
  trees.sort((a, b) => a[1] - b[1]);
  trees.push([8, 104, 40, 11], [25, 103, 28, 8], [-2, 102, 22, 7]);
  for (const [cx, base, h, w] of trees) {
    const big = h > 20;
    for (let r = Math.max(0, Math.floor(base - h)); r < Math.min(H, base + 1); r++) {
      for (let x = Math.max(0, Math.floor(cx - w - 1)); x < Math.min(W, cx + w + 1); x++) {
        const p = pine(x, r + 0.5, cx, base, h, w);
        if (!p) continue;
        const k = r * W + x;
        if (p === 2) {
          const s = big ? 0.75 : 0.9 + 0.2 * hash(x, r);
          set(k, FRONT, 0.66 * s, 0.74 * s, 0.94 * s, 0.2);
        } else {
          const s = big ? 0.5 : 0.7 + 0.5 * hash(x * 3, r);
          set(k, FRONT, 0.04 * s, 0.1 * s, 0.11 * s, 0.05);
        }
      }
    }
  }

  // lamplight from the village windows, warm on the snow round them
  for (let r = 0; r < H; r++) {
    for (let x = 100; x < 160; x++) {
      const k = r * W + x;
      if (kind[k] !== FRONT || bb[k] < 0.15) continue; // the snow, not the dark walls
      let a = 0;
      for (const [px, py] of panes) {
        const d = Math.sqrt((x + 0.5 - px) ** 2 + ((r + 0.5 - py) * 1.3) ** 2);
        a += Math.exp(-d / 1.5) * 0.2;
      }
      (br[k] += a), (bg[k] += a * 0.6), (bb[k] += a * 0.22);
    }
  }

  // --- thin cloud: long wrapping streaks that drift across the moon ---------
  const CW = 600, CH = 40;
  const cloud = new Float32Array(CW * CH);
  for (let r = 0; r < CH; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const q = fbm(x * 0.006, y * 0.04, 3, CW * 0.006);
      const d = fbm(x * 0.014 + q * 2, y * 0.09 + q, 5, CW * 0.014);
      cloud[r * CW + x] = smooth(0.5, 0.68, d + 0.06 * Math.sin(y * 0.35)) * smooth(2, 10, y) * smooth(CH, 24, y);
    }
  }

  // the snow, three depths: far flakes behind the bridge, the rest in front
  const LAYERS = [
    { n: 420, fall: 2.4, sway: 0.7, big: false, v: 0.24, front: false },
    { n: 200, fall: 5, sway: 1.3, big: false, v: 0.55, front: true },
    { n: 60, fall: 9.5, sway: 2.4, big: true, v: 0.95, front: true },
  ].map((L, li) => ({
    ...L,
    seeds: Array.from({ length: L.n }, (_, i) => [hash(i, li * 31 + 1) * W, hash(i, li * 31 + 2) * (H + 6), hash(i, li * 31 + 3) * 6.28, 0.6 + hash(i, li * 31 + 4) * 0.8]),
  }));
  const back = new Float32Array(N);
  const front = new Float32Array(N);
  const put = (buf: Float32Array, x: number, r: number, v: number) => {
    if (r < 0 || r >= H) return;
    const xi = ((x % W) + W) % W, k = r * W + xi;
    if (v > buf[k]) buf[k] = v;
  };

  // light from the coaches' windows along the train, by distance from the nose
  const windows = (u: number) => {
    if (u < 0 || u >= LEN) return 0;
    if (u < 26) return u > 8 && u < 12 ? 0.4 : 0;
    const c = (u - 28) % 26;
    return u >= 28 && c >= 2 && c < 22 ? 1 : 0;
  };

  return (t, { color } = {}) => {
    const F = MOUTH - ((SPEED * t + 135) % PERIOD); // the nose's column
    const drift = t * 1.1;
    back.fill(0);
    front.fill(0);
    for (const L of LAYERS) {
      const buf = L.front ? front : back;
      for (const [x0, y0, ph, sp] of L.seeds) {
        const y = ((y0 + L.fall * sp * t) % (H + 6)) - 3;
        const x = x0 - 0.4 * L.fall * sp * t + L.sway * Math.sin(t * 0.9 * sp + ph);
        const xi = Math.round(x), ri = Math.round(y);
        put(buf, xi, ri, L.v);
        if (L.big) {
          put(buf, xi - 1, ri, L.v * 0.45), put(buf, xi + 1, ri, L.v * 0.45);
          put(buf, xi, ri - 1, L.v * 0.45), put(buf, xi, ri + 1, L.v * 0.45);
        }
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = kind[k];
        let cr = br[k], cg = bg[k], cbl = bb[k], floor = flo[k], fade = 1;

        if (m === SKY) {
          const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
          const dm = Math.sqrt(dmx * dmx + dmy * dmy);
          let c = 0;
          if (r < CH) {
            const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
            const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
            c = cloud[i0] + (cloud[i1] - cloud[i0]) * fx;
          }
          if (dm < MOON_R) {
            // the moon, its seas faint, veiled where the cloud crosses it
            const face = 0.84 + 0.16 * fbm(x * 0.45, y * 0.45, 2, 0);
            const a = (1 - c * 0.55) * smooth(MOON_R, MOON_R - 1, dm);
            cr = mix(cr, 0.97 * face, a), cg = mix(cg, 0.97 * face, a), cbl = mix(cbl, 1.0 * face, a);
          } else if (c < 0.1 && hash(x, r * 3 + 11) > 0.984) {
            const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + hash(x, r) * 3) + hash(r, x) * 6.28);
            const s = (0.45 + 0.5 * tw) * smooth(48, 18, y);
            cr = Math.max(cr, s * 0.9), cg = Math.max(cg, s * 0.93), cbl = Math.max(cbl, s);
          }
          if (c > 0.01) {
            // thin cloud, silver near the moon, slate away from it
            const near = Math.exp(-dm / 24);
            const b = 0.35 + 0.9 * near;
            const a = c * (0.6 + 0.35 * near);
            cr = mix(cr, 0.32 * b + 0.06, a), cg = mix(cg, 0.38 * b + 0.07, a), cbl = mix(cbl, 0.52 * b + 0.12, a);
          }
        } else if (m === RIVER) {
          // the moon's glitter on the ice, and the train's windows above it
          const road = Math.exp(-(((x + 0.5 - MOON[0]) / 5) ** 2));
          const spark = hash(x * 7 + ((t * 3) | 0), r * 5) > 0.93 ? 1 : 0;
          cr += road * (0.25 + 0.6 * spark), cg += road * (0.28 + 0.6 * spark), cbl += road * (0.32 + 0.6 * spark);
          const u = x + 0.5 - F;
          if (x < MOUTH) {
            // each lit pane a smeared streak on the ice
            const pane = (((u - 30) % 4) + 4) % 4 < 2.6 ? 1 : 0.25;
            const lit = windows(u) * pane * (0.35 + 0.65 * noise(x * 0.5, y * 1.8, 0)) * smooth(riverW(x + 0.5) + 0.3, 0.5, Math.abs(y - riverY(x + 0.5)));
            cr += 0.95 * lit, cg += 0.6 * lit, cbl += 0.22 * lit;
            const lamp = Math.exp(-(((u + 10) / 9) ** 2)) * 0.5 * (F < MOUTH ? 1 : 0);
            cr += lamp, cg += lamp * 0.9, cbl += lamp * 0.7;
          }
        } else if (m === PANE) {
          const g = 0.85 + 0.15 * Math.sin(t * 2.3 + x * 1.7);
          (cr = g), (cg = 0.72 * g), (cbl = 0.32 * g);
        }

        // the train, between the far hills and the parapet
        const u = x + 0.5 - F;
        if (r >= ROOF && r < 49 && u >= 0 && u < LEN && x < MOUTH && (m === SKY || m === FAR || m === MOUTH_K)) {
          let tr = -1, tg = 0, tb = 0;
          if (u < 26) {
            // the engine: a sloped nose, a dark windscreen, the lamp low down
            const nose = (48 - r) * 0.85;
            if (u >= nose) {
              const s = r === 43 ? 1.25 : 1;
              (tr = 0.46 * s), (tg = 0.09 * s), (tb = 0.1 * s);
              if (r === ROOF) (tr = 0.66), (tg = 0.73), (tb = 0.9);
              if (r >= 43 && r <= 44 && u < nose + 3.5) (tr = 0.12), (tg = 0.1), (tb = 0.14);
              if (r >= 43 && r <= 45 && u > 8.5 && u < 11.5) (tr = 0.8), (tg = 0.52), (tb = 0.22);
              if (r === 46) (tr = 0.62), (tg = 0.56), (tb = 0.5);
              if (r === 47 && u < 1.6) (tr = 1), (tg = 0.97), (tb = 0.85);
            }
          } else if (u >= 28) {
            const c = (u - 28) % 26;
            if (c < 24) {
              (tr = 0.42), (tg = 0.08), (tb = 0.09);
              if (r === 43) (tr = 0.54), (tg = 0.11), (tb = 0.12);
              if (r === ROOF) {
                if (c < 0.9 || c > 23.1) tr = -1;
                else (tr = 0.66), (tg = 0.73), (tb = 0.9);
              } else if ((r === 44 || r === 45) && c >= 2 && c < 22 && (c - 2) % 4 < 2.6) {
                // a lit pane; now and then a passenger in it
                const wi = Math.floor((u - 28) / 4);
                const dim = hash(wi, 5) < 0.12 ? 0.45 : 1;
                const who = hash(wi, 6) < 0.3 && r === 45 && (c - 2) % 4 < 1.3 ? 0.55 : 1;
                const g = (0.9 + 0.1 * Math.sin(t * 1.3 + wi)) * dim * who;
                (tr = g), (tg = 0.72 * g), (tb = 0.34 * g);
              } else if (r === 46) (tr = 0.62), (tg = 0.56), (tb = 0.5);
              else if (r >= 47) (tr = 0.24), (tg = 0.05), (tb = 0.07);
              if (u > LEN - 1.5 && r === 47) (tr = 1), (tg = 0.25), (tb = 0.2);
            } else if (r === 46 || r === 47) (tr = 0.04), (tg = 0.04), (tb = 0.06);
          }
          if (tr >= 0) {
            const dark = m === MOUTH_K || x > 176 ? 0.35 : 1; // still in the tunnel's shadow
            (cr = tr * dark), (cg = tg * dark), (cbl = tb * dark), (floor = 0.1);
          }
        }

        // the headlight: a hot point, a soft glow, and a cone of light ahead
        let beam = 0;
        if (F < MOUTH + 30 && r > 28 && r < 66 && m !== FRONT && !(m === STONE && x >= 174)) {
          const lx = Math.min(F, 176);
          const a = lx - (x + 0.5);
          if (a > 0) {
            const sp = 0.8 + a * 0.2;
            const py = y - LAMP_Y - 0.5 - a * 0.03;
            beam = Math.exp(-a / 60) * (Math.exp(-((py / sp) ** 2)) + 0.18 * Math.exp(-((py / (sp * 2.6)) ** 2))) * (1 - Math.exp(-a / 2));
          }
          const dx = x + 0.5 - F, dy = y - LAMP_Y - 0.5;
          const d = Math.sqrt(dx * dx + dy * dy);
          const glow = F < 177 ? Math.exp(-d / 1.6) * 0.8 + Math.exp(-d / 7) * 0.25 : 0;
          const on = beam * (m === CAP ? 1.2 : 0.6) + glow;
          cr += on, cg += on * 0.92, cbl += on * 0.74;
        }

        // warm spill from the windows onto the snowy parapet and the air above
        let spill = 0;
        if (r > 34 && r < 52 && x < MOUTH) {
          const wu = windows(u) + 0.5 * (windows(u - 2) + windows(u + 2));
          if (wu > 0) {
            spill = wu * (r === 49 ? 0.35 : r < ROOF ? Math.exp(-(ROOF - r) / 2.2) * 0.12 : 0);
            cr += spill, cg += spill * 0.62, cbl += spill * 0.26;
          }
        }

        // chimney smoke, leaning left on the wind and thinning as it climbs
        if (x > 70 && x < 152 && r > 24 && r < 80) {
          let s = 0;
          for (const [sx, sy] of chimneys) {
            const up = sy - y;
            if (up < 0 || up > 30) continue;
            const cx = sx - up * 0.3 - up * up * 0.012 + 2.4 * (noise(up * 0.15 - t * 0.6, sx, 0) - 0.5) * Math.min(1, up / 6);
            const wd = 0.9 + up * 0.2;
            const n = 0.45 + 0.55 * noise(x * 0.22 + t * 0.4, y * 0.3 + t * 0.9, 0);
            s += Math.exp(-(((x + 0.5 - cx) / wd) ** 2)) * Math.exp(-up / 13) * n;
          }
          if (s > 0.01) {
            const a = Math.min(0.8, s * 1.4);
            cr = mix(cr, 0.56, a), cg = mix(cg, 0.6, a), cbl = mix(cbl, 0.74, a);
          }
        }

        // falling snow: moonlit, warm near the windows, blazing in the beam
        let flake = m === SKY || m === FAR ? back[k] : 0;
        if (front[k] > flake) flake = front[k];
        if (flake > 0) {
          const hot = beam * 4 + spill * 3;
          cr += flake * (0.62 + hot), cg += flake * (0.68 + hot * 0.86), cbl += flake * (0.82 + hot * 0.6);
        }

        if (r > 92) fade = smooth(H + 2, H - 8, y);

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cbl * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
