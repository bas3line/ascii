/*
 * ocean sunset: golden hour at sea. The sun rests on the horizon beyond a dark
 * pine headland, heaped cloud overhead lit from below, a glitter path running
 * across the water toward us, and long swells rolling in, their crests
 * catching the light.
 *
 * Shaded in colour per cell on a square grid, then drawn as a halftone: dot
 * size is brightness, ordered-dithered, in the palette colour nearest its hue.
 * The land and clear sky are built once, the clouds are wrapping fields that
 * drift, and the sea is shaded each frame. A small sloop sits dark against
 * the glow just left of the sun.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ocean sunset",
  category: "scenes",
  note: "the sun sets past a pine headland, lit cloud, glitter on rolling sea",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0b0817",
  palette: [
    "#140f2c", "#1e1640", "#2b1c52", "#3d2266", "#552a74",
    "#6e2c78", "#90327c", "#b23c7c", "#d24f7a", "#ea6a78",
    "#c2306a", "#ff5d8f", "#ff8a9a", "#7a2456", "#f05d5e",
    "#f2804f", "#f99a43", "#ffb44a", "#ffcd62", "#ffe39a", "#fff5d8",
    "#a8323c", "#d2453c", "#e8603e",
    "#2f1a3e", "#47234f", "#63305c", "#874266", "#ac5b70",
    "#ff9e86", "#ffc4a2", "#ffdcc0",
    "#0e1230", "#171a46", "#232059", "#33286a", "#4a2f78",
    "#1c2a5c", "#2e4078",
    "#7d3f8f", "#a24f98", "#c8649e", "#de8bb5",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 56; // the horizon
const SUN = [134, HZ - 4.5];
const SR = 8.5; // the sun's radius
const BOAT = 112; // the sloop's mast
// wind chop on the swell: [dir x, dir z, wavenumber, slope, speed, offset]
const CHOP = [
  [-0.45, 0.89, 22, 0.07, 2.1, 0.4],
  [0.5, 0.87, 37, 0.06, 2.9, 2.1],
  [-0.15, 0.99, 61, 0.05, 3.7, 4.4],
  [0.3, 0.95, 97, 0.04, 4.6, 1.3],
];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
// pines on the headland: [x, height, half width at the foot]
const PINES = [[2.5, 10, 2.6], [8, 13, 3], [13, 18, 3.6], [18.5, 11, 2.8], [24, 20, 3.8], [30, 12, 2.9], [35, 8, 2.3], [39.5, 5, 1.8]];

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

// The sky's gradient, top to horizon, as [stop, r, g, b].
const STOPS = [
  [0, 0.08, 0.1, 0.3],
  [0.3, 0.15, 0.1, 0.34],
  [0.52, 0.4, 0.15, 0.4],
  [0.72, 0.68, 0.27, 0.4],
  [0.88, 0.8, 0.32, 0.4],
  [1, 0.88, 0.4, 0.4],
];
function gradient(v: number, out: number[]): void {
  let i = 1;
  while (i < STOPS.length - 1 && v > STOPS[i][0]) i++;
  const a = STOPS[i - 1], b = STOPS[i];
  const k = clamp((v - a[0]) / (b[0] - a[0]));
  out[0] = mix(a[1], b[1], k), out[1] = mix(a[2], b[2], k), out[2] = mix(a[3], b[3], k);
}

// The headland: its skyline row at x, and the row where its foot meets the sea.
const ridge = (x: number) =>
  HZ + 2.5 - 11 * Math.pow(smooth(54, 32, x), 0.7) - 2.4 * Math.exp(-(((x - 19) / 9) ** 2)) - 2 * fbm(x * 0.21, 3.3, 3, 0);
const shore = (x: number) => HZ + 1.5 + 5 * smooth(54, 4, x);
// a sea stack off the point
const stack = (x: number) => (x > 52 && x < 58 ? HZ - 3.5 - 1.6 * fbm(x * 0.6, 8.1, 2, 0) + 2.5 * ((x - 55) / 3) ** 4 : 1e9);

export default function oceanSunset(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);

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
  // dot and colour for one shaded cell
  const halftone = (k: number, r: number, x: number, cr: number, cg: number, cb: number, floor: number, fade: number, color: Uint8Array | undefined) => {
    const peak = Math.max(cr, cg, cb, 1e-4);
    const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
    const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
    out[k] = DOTS[step];
    if (color) {
      // small dots are drawn brighter to make up their size, but the darkest
      // cells keep a dim colour, so the shadows stay deep instead of glittering
      const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
      const s = ((0.3 + 0.7 * want) * (0.4 + 0.6 * smooth(0.14, 0.5, level))) / peak;
      color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
    }
  };

  // --- the clear sky, built once ------------------------------------------
  const sky = new Float32Array(HZ * W * 3);
  const g = [0, 0, 0];
  for (let r = 0; r < HZ; r++) {
    for (let x = 0; x < W; x++) {
      const y = r + 0.5;
      const dx = x + 0.5 - SUN[0], dy = (y - SUN[1]) * 1.6;
      const d = Math.sqrt(dx * dx + dy * dy);
      // rose and violet everywhere, burning gold only toward the sun
      const near = Math.exp(-Math.abs(dx) / 62);
      const v = y / HZ;
      gradient(Math.pow(v, 1.0 + 0.12 * (1 - near)), g);
      const warm = Math.exp(-Math.abs(dx) / 36) * smooth(0.45, 1, v) * 0.9;
      g[0] = mix(g[0], 1.0 * mix(0.6, 1, v), warm), g[1] = mix(g[1], 0.64 * mix(0.6, 1, v), warm), g[2] = mix(g[2], 0.3, warm);
      const fall = mix(1, 0.86 + 0.14 * near, smooth(0.6, 1, v));
      const glow = Math.exp(-d / 40) * 0.15 + Math.exp(-d / 9) * 0.1;
      // high haze in long thin bands, so no stretch of sky is one flat tone
      const haze = 0.82 + 0.36 * fbm(x * 0.03, y * 0.12, 3, 0);
      const k = (r * W + x) * 3;
      const vig = (1 - 0.08 * Math.pow(Math.abs(x + 0.5 - 100) / 100, 2)) * haze * fall;
      sky[k] = g[0] * (0.85 + 0.15 * near) * vig + glow;
      sky[k + 1] = g[1] * (0.65 + 0.35 * near) * vig + glow * 0.7;
      sky[k + 2] = g[2] * (1.1 - 0.2 * near) * vig + glow * 0.3;
    }
  }

  // --- the headland and its pines, built once ------------------------------
  const LANDW = 60, LANDH = HZ + 10;
  const land = new Uint8Array(N); // 1 rock, 2 pine
  const LR = new Float32Array(N), LG = new Float32Array(N), LB = new Float32Array(N);
  // the rock's seaward edge on each row, for the light on the cliff face
  const edge = new Float32Array(LANDH).fill(-1);
  for (let r = 0; r < LANDH; r++) {
    const y = r + 0.5;
    for (let x = 0; x < LANDW; x++) if (y >= ridge(x + 0.5) && y < shore(x + 0.5)) edge[r] = x;
  }
  for (let r = 0; r < LANDH; r++) {
    const y = r + 0.5;
    for (let x = 0; x < LANDW; x++) {
      const k = r * W + x, xc = x + 0.5;
      const t0 = ridge(xc), st = stack(xc);
      let cr!: number, cg!: number, cb!: number;
      if ((y >= t0 && y < shore(xc)) || (y >= st && y < HZ + 1.2)) {
        land[k] = 1;
        const isStack = !(y >= t0 && y < shore(xc));
        const top = isStack ? st : t0;
        // dark violet rock in rough strata
        const s = 0.6 + 0.8 * fbm(x * 0.22, y * 0.7, 3, 0);
        cr = 0.06 * s, cg = 0.042 * s, cb = 0.15 * s;
        // the sun is low and to the right: slopes that drop toward it catch it
        const facing = clamp(0.4 + (isStack ? 0.5 : (ridge(xc + 1.2) - ridge(xc - 1.2)) * 0.45));
        const rim = smooth(top + 2.4, top + 0.4, y) * facing;
        // the cliff face, warm where it turns to the sun, broken by crags
        const crag = smooth(0.35, 0.75, fbm(x * 0.4 + 3, y * 0.5, 3, 0));
        const face = isStack ? smooth(53.5, 57.5, xc) * 0.7 : edge[r] > 30 ? Math.exp(-(edge[r] - x) / 4) * smooth(HZ + 5, HZ - 4, y) : 0;
        const lit = clamp(Math.max(rim * 0.9, face * (0.3 + 0.7 * crag) * 0.75));
        cr = mix(cr, 0.95, lit), cg = mix(cg, 0.38, lit * 0.95), cb = mix(cb, 0.3, lit * 0.9);
      }
      for (const [tx, th, tw] of PINES) {
        const tb = ridge(tx);
        const dy = y - (tb - th);
        // a conifer: a spire that widens in tiers of branches
        const tier = (dy + th * 0.3) / 2.4;
        const half = (dy / th) * tw * (0.5 + 0.75 * (tier - Math.floor(tier))) + 0.35;
        const ex = xc - tx;
        if (dy >= 0 && y < tb + 1.5 && Math.abs(ex) <= half) {
          land[k] = 2;
          const s = 0.7 + 0.6 * hash(x * 13 + r, 5);
          cr = 0.045 * s, cg = 0.03 * s, cb = 0.1 * s;
          // the right flank faces the sun
          const e = ex > 0 && ex > half - 1.1 ? 0.3 + 0.3 * smooth(th, 0, dy) : 0;
          cr = mix(cr, 0.85, e), cg = mix(cg, 0.3, e), cb = mix(cb, 0.3, e);
        }
      }
      if (land[k]) LR[k] = cr, LG[k] = cg, LB[k] = cb;
    }
  }
  // a small sloop out on the water, dark against the glow left of the sun
  for (let r = HZ - 10; r < HZ + 4; r++) {
    const y = r + 0.5;
    for (let x = BOAT - 6; x <= BOAT + 6; x++) {
      const k = r * W + x, ex = x + 0.5 - BOAT;
      const hull = y >= HZ + 1 && y < HZ + 3 && Math.abs(ex - 0.3) < 4.6 - (y - HZ - 1) * 1.3;
      const mast = Math.abs(ex) < 0.5 && y >= HZ - 9 && y < HZ + 1;
      const main = ex > 0 && y >= HZ - 8.5 && y < HZ + 0.5 && ex < 0.6 + (y - (HZ - 8.5)) * 0.42;
      const jib = ex < 0 && y >= HZ - 7 && y < HZ + 0.5 && -ex < (y - (HZ - 7)) * 0.36;
      if (hull || mast || main || jib) {
        land[k] = 3;
        // the sails are thin enough to glow a little with the sun behind them
        const glow = main ? 0.12 + 0.18 * smooth(0, 3.5, ex) : 0;
        LR[k] = 0.05 + glow, LG[k] = 0.03 + glow * 0.45, LB[k] = 0.09 + glow * 0.35;
      }
    }
  }

  // --- the cloud deck: a sheet of heaped cloud seen from below, laid out on
  // its own plane so it shrinks and flattens toward the horizon -------------
  const U = 640, V = 128;
  const deck = new Float32Array(U * V), deckLit = new Float32Array(U * V);
  const deckAt = (u: number, v: number) => {
    const q = fbm(u * 0.0125, v * 0.06, 2, 8);
    const patch = fbm(u * 0.00625, v * 0.03 + 7, 2, 4);
    return fbm(u * 0.040625 + q * 1.6, v * 0.3, 5, 26) + 0.25 * (patch - 0.5);
  };
  for (let v = 0; v < V; v++) {
    for (let u = 0; u < U; u++) {
      const d = deckAt(u, v);
      deck[v * U + u] = d;
      // the side of each heap that faces the horizon, and the sun, is lit
      deckLit[v * U + u] = clamp(0.5 + (d - deckAt(u, v + 2.5)) * 9);
    }
  }
  // thinning toward the zenith, ragged rather than a ruled line
  const thinTop = new Float32Array(W * HZ);
  for (let r = 0; r < HZ; r++) for (let x = 0; x < W; x++) thinTop[r * W + x] = fbm(x * 0.05 + 11, r * 0.15, 2, 0);

  // --- low bars over the horizon: a wrapping field that drifts -------------
  const CW = 720;
  const loCover = new Float32Array(CW * HZ), loLit = new Float32Array(CW * HZ);
  const lower = (x: number, y: number) => {
    // long thin bars low over the horizon
    const b = fbm(x / 40, y * 0.3, 4, CW / 40);
    const gaps = fbm(x / 120, 5, 2, CW / 120);
    return b + 0.01 + 0.5 * (gaps - 0.5) - 0.35 * smooth(HZ - 14, HZ - 20, y) - 0.25 * smooth(HZ - 4, HZ - 1, y);
  };
  for (let r = 0; r < HZ; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const k = r * CW + x;
      const dl = lower(x, y);
      loCover[k] = smooth(0.58, 0.66, dl);
      loLit[k] = clamp(0.5 + (dl - lower(x, y + 1.2)) * 6);
    }
  }

  // this frame's sky, finished, for the sea to mirror
  const SKR = new Float32Array(HZ * W), SKG = new Float32Array(HZ * W), SKB = new Float32Array(HZ * W);

  return (t, { color } = {}) => {
    const dUp = t * 0.9, dLo = t * 1.7;
    for (let r = 0; r < HZ; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const s = k * 3;
        let cr = sky[s], cg = sky[s + 1], cb = sky[s + 2];
        const dx = x + 0.5 - SUN[0];
        const dy = y - SUN[1];
        let disc = 0;
        const ds = Math.sqrt(dx * dx + (dy / 0.9) ** 2);
        if (ds < SR + 0.6) {
          // the disc, a little flattened, hot at the core and redder at the rim
          const e = ds / SR;
          disc = smooth(SR + 0.45, SR - 0.45, ds);
          const e4 = e * e * e * e;
          cr = mix(cr, 1.0, disc);
          cg = mix(cg, 0.95 - 0.2 * e4, disc);
          cb = mix(cb, 0.78 - 0.38 * e4, disc);
        }
        const near = Math.exp(-Math.sqrt(dx * dx + dy * dy * 2.5) / 45);
        const v = y / HZ;
        // the cloud deck, found on its plane: far rows are far away
        const D = 58 / (HZ - y + 2.5);
        // a band of heaped cloud mid-sky: clear above and clear in the low glow
        const far = smooth(4.8, 2.7, D) * smooth(1.08, 1.7, D);
        let cloud = 0;
        if (far > 0) {
          const su = dx * D + dUp + 64200, sv = (D - 0.9) * 10;
          let iu = Math.floor(su);
          const fu = su - iu, iv = Math.floor(sv), fv = sv - iv;
          iu %= U;
          const iu1 = (iu + 1) % U, a0 = iv * U, a1 = a0 + U;
          const d0 = deck[a0 + iu] + (deck[a0 + iu1] - deck[a0 + iu]) * fu;
          const d1 = deck[a1 + iu] + (deck[a1 + iu1] - deck[a1 + iu]) * fu;
          const dd = d0 + (d1 - d0) * fv - 0.22 * (1 - far) * thinTop[k];
          const c = smooth(0.56, 0.68, dd) * Math.sqrt(far);
          if (c > 0.01) {
            cloud = c;
            const l0 = deckLit[a0 + iu] + (deckLit[a0 + iu1] - deckLit[a0 + iu]) * fu;
            const l1 = deckLit[a1 + iu] + (deckLit[a1 + iu1] - deckLit[a1 + iu]) * fu;
            const l = l0 + (l1 - l0) * fv;
            // undersides glow gold toward the sun and rose away from it, and
            // more the lower they sit; thick cores stay dusk violet
            const az = Math.exp(-Math.abs(dx) / 60);
            const low = v * v;
            const thin = 1 - smooth(0.6, 0.76, dd);
            const b = clamp(Math.pow(smooth(0.45, 0.85, l), 1.5) * (0.55 + 0.25 * low + 0.35 * az) + 0.3 * thin * az * low);
            const warm = clamp(az * (0.1 + 1.2 * low));
            const hr = 1.0, hg = mix(0.45, 0.72, warm), hb = mix(0.52, 0.38, warm);
            const sr = mix(0.1, 0.2, v), sg = mix(0.065, 0.07, v), sb = mix(0.23, 0.27, v);
            cr = mix(cr, mix(sr, hr, b), c);
            cg = mix(cg, mix(sg, hg, b), c);
            cb = mix(cb, mix(sb, hb, b), c);
          }
        }
        // the low bars, dark against the glow with burning edges
        const sx = x + dLo, ix = Math.floor(sx), fx = sx - ix;
        const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
        // thinned over the sun and kept off the sky behind the headland
        const c = (loCover[i0] + (loCover[i1] - loCover[i0]) * fx) * (1 - 0.75 * Math.exp(-((dx / 13) ** 2))) * (1 - 0.85 * smooth(76, 50, x));
        if (c > 0.01) {
          cloud = Math.max(cloud, c);
          const l = loLit[i0] + (loLit[i1] - loLit[i0]) * fx;
          const rim = Math.pow(l, 2) * (0.35 + 0.9 * near);
          const a = Math.min(1, c * 1.2) * 0.92;
          cr = mix(cr, 0.3 + 0.7 * rim, a);
          cg = mix(cg, 0.09 + 0.55 * rim, a);
          cb = mix(cb, 0.24 + 0.18 * rim, a);
        }
        // the first stars, high up where the sky has gone to indigo
        if (r < 22 && cloud < 0.05 && hash(x, r * 5 + 3) > 0.993) {
          const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + hash(r, x) * 1.6) + hash(x, r) * 6.28);
          const st = tw * smooth(22, 4, r) * 0.75;
          cr = Math.max(cr, st * 0.95), cg = Math.max(cg, st * 0.85), cb = Math.max(cb, st);
        }
        // the sea is too rough to mirror the disc whole: it gives back glitter
        const keep = 1 - 0.75 * disc;
        SKR[k] = cr * keep, SKG[k] = cg * keep, SKB[k] = cb * keep;
        if (land[k]) {
          cr = LR[k], cg = LG[k], cb = LB[k];
          halftone(k, r, x, cr, cg, cb, 0.02, 1, color);
        } else halftone(k, r, x, cr, cg, cb, 0.05, 1, color);
      }
    }

    for (let r = HZ; r < H; r++) {
      const y = r + 0.5;
      // the sea: each cell is a facet of water that mirrors whatever part
      // of the sky its tilt points it at
      const dz = y - HZ;
      const Z = 36 / dz; // distance out
      const rows = 36 / (dz * dz); // how much sea one row spans
      const swellAmt = smooth(8, 26, dz);
      const hot = Math.exp(-dz / 9);
      const pw = 3 + dz * 0.8; // the glitter path, wider as it comes toward us
      const fx = (0.9 / (1 + dz * 0.06)) * 0.35, fy = 1.6 / (1 + dz * 0.05);
      const fres = 0.24 + 0.46 * Math.exp(-dz / 8);
      const depth = smooth(HZ, H, y);
      const fade = smooth(H + 6, H - 4, y);
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (land[k]) {
          halftone(k, r, x, LR[k], LG[k], LB[k], 0.02, 1, color);
          continue;
        }
        const dx = x + 0.5 - SUN[0];
        const X = (x + 0.5 - 100) / dz;
        // the long swell rolls toward us; shorter chop rides on it
        const p = 13 * (Z + 0.05 * X) + 2.2 * fbm(X * 0.35 + 3, Z * 0.4, 2, 0) + t * 0.8;
        const wv = Math.sin(p), slope = Math.cos(p);
        let sz = 0.11 * slope * clamp(1.4 / (13 * rows)), sxl = 0.015 * slope;
        for (let i = 0; i < CHOP.length; i++) {
          const [kx, kz, kk, a, w, f] = CHOP[i];
          const ph = kk * (kx * X + kz * Z) - w * t + f;
          const c = Math.cos(ph) * a * clamp(1.6 / (kk * rows));
          sz += c * kz, sxl += c * kx;
        }
        let ry = Math.round(HZ - 1 - dz * 0.85 - 70 * sz);
        ry = ry < 0 ? 0 : ry > HZ - 1 ? HZ - 1 : ry;
        let rx = Math.round(x - 60 * sxl);
        rx = rx < 0 ? 0 : rx > W - 1 ? W - 1 : rx;
        const q = ry * W + rx;
        // violet near the horizon, deepening to indigo toward us
        // broken into long horizontal ripples, each giving back a little more
        // or less of the sky
        const rip = noise(x * fx * 1.4 + 13 - t * 0.15, y * fy * 1.1 + t * 0.25, 0);
        const rf = fres * (0.5 + 1.1 * rip * rip);
        let cr = SKR[q] * rf * 0.8 + 0.03 - 0.01 * depth;
        let cg = SKG[q] * rf * 0.75 + 0.022;
        let cb = SKB[q] * rf + 0.095 + 0.03 * depth;
        // ripple facets that catch the sun: short dashes far out, longer
        // close in, each turning toward the sun and away again
        const n = 0.55 * noise(x * fx + t * 0.3, y * fy * 1.3 - t * 0.4, 0) + 0.45 * noise(x * fx * 1.7 - t * 0.4, y * fy * 2 + t * 0.3 + 40, 0);
        const wave = Math.floor(p / (2 * Math.PI));
        const crest = Math.pow(0.5 + 0.5 * wv, 7) * swellAmt * smooth(0.4, 0.65, noise(X * 2.5 + 7, wave * 3.7, 0));
        const path = Math.exp(-((dx / pw) ** 2));
        const soft = Math.exp(-((dx / (pw * 1.6)) ** 2));
        // the near face of a swell is in shadow
        if (slope > 0) {
          const d = 1 - 0.7 * swellAmt * slope;
          cr *= d, cg *= d, cb *= d;
        }
        const th = 0.84 - 0.3 * path * (0.45 + 0.55 * hot);
        const glint = smooth(th, th + 0.08, n) * (0.25 + 0.75 * path) * soft;
        const white = path * path * smooth(th + 0.04, th + 0.2, n);
        cr += 0.2 * soft * (0.4 + hot) + glint * 1.1;
        cg += 0.1 * soft * (0.4 + hot) + glint * (0.55 + 0.3 * hot + 0.35 * white);
        cb += 0.04 * soft + glint * (0.2 + 0.25 * hot + 0.45 * white);
        // the crests catch it: gold in the path, rose out to the sides
        const catchL = crest * (0.15 + 0.85 * soft) * (0.6 + 0.6 * n);
        cr += catchL * 0.95, cg += catchL * mix(0.3, 0.7, soft), cb += catchL * mix(0.5, 0.3, soft);
        // the sun's own column: a gap under the disc, then broken dashes
        const dash = smooth(0.4, 0.7, noise(x * 0.18 + t * 0.25, y * 0.9 - t * 0.5, 0));
        const col = Math.exp(-((dx / (1.0 + dz * 0.22)) ** 2)) * Math.exp(-dz / 5) * (0.6 + 0.4 * n) * smooth(0, 3, dz) * dash;
        cr += col, cg += col * 0.8, cb += col * 0.45;
        // the headland upside down in the water, broken by ripples
        if (x < LANDW + 4 && dz < 26) {
          const xs = x + 0.5 + 1.3 * Math.sin(y * 1.1 + t * 1.2 + x * 0.05);
          const ix = Math.max(0, Math.min(LANDW - 1, xs | 0));
          const ft = shore(ix + 0.5);
          if (y > ft) {
            const my = Math.floor(2 * ft - y);
            if (my >= 0 && my < LANDH) {
              const m = my * W + ix;
              if (land[m]) {
                const a = 0.8 * smooth(ft + 24, ft + 4, y);
                cr = mix(cr, LR[m] * 0.8 + 0.02, a), cg = mix(cg, LG[m] * 0.7 + 0.015, a), cb = mix(cb, LB[m] * 0.85 + 0.05, a);
              }
            }
            // a line of surf where rock meets water
            const foam = smooth(ft + 1.6, ft + 0.3, y) * smooth(0.45, 0.8, noise(x * 0.5 - t * 0.4, t * 0.3, 0));
            cr += 0.5 * foam, cg += 0.3 * foam, cb += 0.35 * foam;
          }
        }
        // and the sloop's, shorter and more broken
        if (dz > 2.5 && dz < 14 && x > BOAT - 8 && x < BOAT + 8) {
          const ix = (x + 0.5 + 0.9 * Math.sin(y * 1.3 + t * 1.6)) | 0;
          const m = Math.floor(2 * (HZ + 3) - y) * W + ix;
          if (land[m] === 3) {
            const a = 0.7 * smooth(HZ + 14, HZ + 4, y) * (0.6 + 0.4 * rip);
            cr = mix(cr, 0.04, a), cg = mix(cg, 0.03, a), cb = mix(cb, 0.1, a);
          }
        }
        // a crisp dark line at the horizon for the sun to sit on
        if (dz < 1.5) cr *= 0.55, cg *= 0.55, cb *= 0.55;
        halftone(k, r, x, cr, cg, cb, 0.18, fade, color);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
