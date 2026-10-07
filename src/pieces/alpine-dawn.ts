/*
 * alpine dawn: jagged snow peaks catch the first pink light on their east
 * faces while their flanks stay in blue shadow. Mist pools along the far shore
 * and a still lake mirrors it all. The light warms toward gold as the sun
 * clears the ridge, the mist drifts, and slow ripples cross the water.
 *
 * The range is a heightfield, raymarched once from a camera just above the
 * water: each cell keeps its depth, height, sunlight (with cast shadows) and
 * snow cover, so a frame only re-tints it. The lake looks up the picture above
 * it along each cell's reflected ray. Every cell is then drawn as a halftone
 * dot, ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "alpine dawn",
  category: "scenes",
  note: "snow peaks catching first light above a still, misty mountain lake",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#090c18",
  palette: [
    "#0e1430", "#151d40", "#1d2752", "#263365", "#314179", "#3e508c", "#4f62a0", "#6577b3", "#8090c4", "#9eaad3", "#bec6e2",
    "#4b3e6c", "#6a5482", "#8c6a92", "#b0829c", "#cf96a4",
    "#e8a9a8", "#f5bcaa", "#ffd0b0", "#ffe2c2", "#fff1e0", "#fdfaf6",
    "#ffc887", "#f7a965", "#f2a08f", "#e58a87", "#f8b59d", "#d97b7e",
    "#7a4c4a", "#a5654f", "#523a4a",
    "#1b2034", "#262c45", "#363c59",
    "#0a1418", "#0f1f24", "#162a2f", "#203a3c",
    "#a3a7c6", "#c6c3d8", "#e0d4dc",
    "#5a4f7e", "#7b6c9c", "#9a8cb6", "#b8a8c8", "#d8bccb",
  ],
} satisfies Meta;

const W = 200, H = 100;
const K = 0.62; // tangent of half the field of view, across the width
const HZ = 56.5; // eye level, in rows
const CAM = 1.5; // camera height above the water
const SHORE_Z = 46; // distance to the far shore
const SHORE = 62; // first row of open water
const SUN = [151, 50];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

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

// Sharp crests where plain noise crosses its middle: rock ribs and couloirs.
function ridged(x: number, y: number, octaves: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    const v = 1 - Math.abs(2 * noise(x * f + i * 17.3, y * f, 0) - 1);
    s += amp * v * v;
    n += amp;
    amp *= 0.5;
    f *= 2.1;
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

// Peaks as pyramids, each turned a little, placed by where their summits
// should land on screen: [column, row, distance, spread, turn].
const PEAKS = [
  [66, 11, 140, 0.95, 0.3],
  [38, 26, 115, 1.1, -0.15],
  [116, 22, 175, 0.9, 0.2],
  [92, 33, 150, 1.0, 0.1],
  [96, 25, 340, 1.1, 0.4],
  [180, 38, 200, 1.5, -0.1],
  [8, 30, 160, 1.2, 0.25],
].map(([sx, row, z, f, a]) => {
  const h = CAM + ((HZ - row) / 100) * K * z - 1.5;
  return [((sx - 100) / 100) * K * z, z, h, h * f, Math.cos(a), Math.sin(a)];
});

function terrain(x: number, z: number): number {
  let h = 0;
  for (const [px, pz, ph, pr, c, s] of PEAKS) {
    const dx = x - px, dz = z - pz;
    const rx = dx * c - dz * s, rz = dx * s + dz * c;
    const v = ph * (1 - (Math.abs(rx) + Math.abs(rz)) / pr);
    if (v > h) h = v;
  }
  const hills = (1 + 3 * fbm(x * 0.04, z * 0.04, 3, 0)) * smooth(SHORE_Z, SHORE_Z + 15, z);
  if (hills > h) h = hills;
  // crags, deeper on the high ground
  h += ((ridged(x * 0.06, z * 0.06, 3) - 0.45) * 6 + (ridged(x * 0.2, z * 0.2, 2) - 0.45) * 1.6) * smooth(4, 22, h);
  return h;
}

// Distance along a ray from height `oy` with slope `v` and spread `u` to the
// terrain beyond the shore, or 0 when it reaches the sky.
function march(u: number, v: number, oy: number): number {
  let z = SHORE_Z, prev = z;
  for (let i = 0; i < 260 && z < 520; i++) {
    const gap = oy + v * z - terrain(u * z, z);
    if (gap < 0) {
      let a = prev, b = z;
      for (let j = 0; j < 7; j++) {
        const m = (a + b) / 2;
        if (oy + v * m - terrain(u * m, m) < 0) b = m;
        else a = m;
      }
      return b;
    }
    prev = z;
    z += Math.max(0.35, gap * 0.45) + z * 0.002;
  }
  return 0;
}

export default function alpineDawn(): Frame {
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

  const L = (() => {
    const v = [0.9, 0.3, 0.14];
    const n = Math.hypot(...v);
    return v.map((c) => c / n);
  })();

  // --- the range, raymarched once ------------------------------------------
  const SR = SHORE; // rows above the open water
  const depth = new Float32Array(SR * W);
  const alt = new Float32Array(SR * W);
  const sun = new Float32Array(SR * W);
  const snow = new Float32Array(SR * W);
  const up = new Float32Array(SR * W);
  for (let r = 0; r < SR; r++) {
    const v = ((HZ - (r + 0.5)) / 100) * K;
    for (let x = 0; x < W; x++) {
      const u = ((x + 0.5 - 100) / 100) * K;
      const z = march(u, v, CAM);
      const k = r * W + x;
      if (!z) continue;
      const px = u * z, py = CAM + v * z;
      const e = 0.35;
      const hx = (terrain(px + e, z) - terrain(px - e, z)) / (2 * e);
      const hz = (terrain(px, z + e) - terrain(px, z - e)) / (2 * e);
      const nl = Math.hypot(hx, 1, hz);
      const nx = -hx / nl, ny = 1 / nl, nz = -hz / nl;
      let lit = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      if (lit > 0) {
        // cast shadow: walk toward the sun
        for (let s = 0.8; s < 160; s += 0.6 + s * 0.04) {
          const qx = px + L[0] * s, qy = py + L[1] * s + 0.15, qz = z + L[2] * s;
          if (qz < SHORE_Z) break;
          if (qy < terrain(qx, qz)) {
            lit = 0;
            break;
          }
        }
      }
      depth[k] = z;
      alt[k] = py;
      sun[k] = lit;
      up[k] = ny;
      const grain = fbm(px * 0.4, py * 0.25, 2, 0);
      // rock shows through in couloirs running down the fall line
      const gully = ridged(px * 0.22 + z * 0.05, py * 0.045, 2);
      snow[k] = smooth(0.36, 0.52, ny + 0.3 * (grain - 0.5)) * smooth(5, 11, py + 5 * grain) * (1 - 0.75 * smooth(0.62, 0.85, gully));
    }
  }

  // sunlit terrain with open sky directly above: the crest line
  const rim = new Uint8Array(SR * W);
  for (let k = W; k < SR * W; k++) rim[k] = depth[k] && !depth[k - W] && sun[k] > 0 ? 1 : 0;

  // --- the far shore's treeline --------------------------------------------
  const treeTop = new Float32Array(W);
  for (let x = 0; x < W; x++) treeTop[x] = SHORE - 0.6 - 1.2 * fbm(x * 0.06, 2.3, 2, 0);
  for (let tx = -2; tx < W + 2; tx += 1.6 + hash(tx * 9, 7) * 2.2) {
    const tip = SHORE - 2.6 - hash(tx * 3, 8) * 4 - 1.5 * smooth(60, 0, tx);
    const slope = 1.1 + hash(tx * 5, 9) * 0.5;
    for (let x = Math.max(0, Math.floor(tx - 6)); x < Math.min(W, tx + 6); x++) {
      treeTop[x] = Math.min(treeTop[x], tip + Math.abs(x + 0.5 - tx) * slope);
    }
  }

  // --- the lake: where each cell's reflected ray lands in the picture above -
  const LR = H - SHORE;
  const src = new Float32Array(LR * W);
  for (let r = SHORE; r < H; r++) {
    const v = ((HZ - (r + 0.5)) / 100) * K;
    for (let x = 0; x < W; x++) {
      const u = ((x + 0.5 - 100) / 100) * K;
      const z = march(u, -v, -CAM);
      const vs = -v - (z ? (2 * CAM) / z : 0);
      let row = HZ - (vs * 100) / K - 0.5;
      const mirror = 2 * SHORE - 1 - r; // the treeline stands on the shore
      if (mirror >= treeTop[x]) row = mirror;
      src[(r - SHORE) * W + x] = row;
    }
  }

  // --- the near pines and the bank they stand on ---------------------------
  const fg = new Uint8Array(N);
  const fgShade = new Float32Array(N);
  const fgRim = new Float32Array(N);
  const PINES = [
    [9, 5, 1.15], [20, 38, 0.85], [32, 66, 0.5],
    [192, 10, 1.15], [181, 40, 0.75], [204, 26, 1],
  ];
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const bankL = 88 + 14 * smooth(0, 52, x) + 2 * fbm(x * 0.2, 1, 2, 0);
      const bankR = 90 + 12 * smooth(W, W - 40, x) + 2 * fbm(x * 0.2, 4, 2, 0);
      if (y > bankL || y > bankR) (fg[k] = 1), (fgShade[k] = 0.15 * hash(x, r));
      for (const [px, tip, s] of PINES) {
        const d = y - tip;
        if (d < 0) continue;
        const tier = 3.4 * s;
        const f = d / tier - Math.floor(d / tier);
        const hw = (0.4 + d * 0.2) * (0.5 + 0.5 * f) * (1 + 0.6 * (hash(r, Math.floor(px) * 7) - 0.5) * smooth(0, 8, d));
        const dx = x + 0.5 - px;
        if (Math.abs(dx) <= hw) {
          fg[k] = 2;
          // the outline catches the dawn sky: a warm rim on the side facing
          // the sun, a dim cool one on the other, the inside stays black
          const edge = hw - Math.abs(dx) < 1;
          const sunward = px < SUN[0] ? dx > 0 : dx < 0;
          fgShade[k] = edge ? (sunward ? 1 : 0.5) : 0.3 * hash(x * 3, r * 5);
          // the rim is light from the sky behind, so it fades out below the shore
          fgRim[k] = edge ? smooth(70, 44, y) * (0.75 + 0.25 * hash(x, r * 7)) : 0;
        }
      }
    }
  }

  // --- mist, a wrapping sheet that drifts along the valley -----------------
  const MW = 480, M0 = 36, MR = SHORE + 2 - M0;
  const mist = new Float32Array(MW * MR);
  for (let r = 0; r < MR; r++) {
    for (let x = 0; x < MW; x++) {
      const y = r + M0;
      const q = fbm(x * 0.0125, y * 0.1, 2, MW * 0.0125);
      mist[r * MW + x] = fbm(x * 0.025 + q * 1.4, y * 0.22 + q, 4, MW * 0.025);
    }
  }

  // --- thin high cloud, streaked and lit from below by the sun -------------
  const CW = 640, CR = 34;
  const cloud = new Float32Array(CW * CR);
  for (let r = 0; r < CR; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const q = fbm(x * 0.0125, y * 0.12, 2, 8);
      const c = fbm(x * 0.025 + q * 2, y * 0.2 + q * 0.8, 4, 16);
      cloud[r * CW + x] = smooth(0.52, 0.7, c - 0.06 * Math.abs(y - 18) / 10) * smooth(5, 13, y) * smooth(33, 24, y);
    }
  }

  // a faint large-scale unevenness, so the open sky and the deep water are
  // never one flat halftone screen
  const hz = new Float32Array(N);
  for (let k = 0; k < N; k++) hz[k] = fbm((k % W) * 0.03, Math.floor(k / W) * 0.06, 3, 0);

  // the sky's colour at a point, for the sky itself and as haze on the peaks
  const skyR = new Float32Array(SR * W), skyG = new Float32Array(SR * W), skyB = new Float32Array(SR * W);
  const glowA = new Float32Array(SR * W);
  for (let r = 0; r < SR; r++) {
    for (let x = 0; x < W; x++) {
      const y = r + 0.5;
      const v = clamp(y / 52);
      const east = smooth(20, 190, x);
      const dx = x + 0.5 - SUN[0], dy = (y - SUN[1]) * 2.2;
      const ds = Math.sqrt(dx * dx + dy * dy);
      const low = Math.pow(v, 1.9);
      // indigo overhead, a soft unevenness in it, then a pale lilac and rose
      // band behind the range, lighter than the mountains' shadowed flanks
      const veil = (hz[r * W + x] - 0.5) * 0.1 * (1 - v);
      let cr = 0.03 + veil + low * (0.56 + 0.2 * east);
      let cg = 0.04 + veil + low * (0.48 + 0.02 * east);
      let cb = 0.13 + veil * 1.6 + low * (0.62 - 0.12 * east);
      skyR[r * W + x] = cr;
      skyG[r * W + x] = cg;
      skyB[r * W + x] = cb;
      // the sun's glow, kept apart so it can breathe
      glowA[r * W + x] = Math.exp(-ds / 6) * 0.65 + Math.exp(-ds / 15) * 0.2 + Math.exp(-ds / 50) * 0.1;
    }
  }

  const AR = new Float32Array(SR * W), AG = new Float32Array(SR * W), AB = new Float32Array(SR * W);
  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N);
  const floor = new Float32Array(N);
  const fade = new Float32Array(N).fill(1);
  const wisp = new Float32Array(W);

  return (t, { color } = {}) => {
    const warm = 0.75 - 0.5 * Math.exp(-t / 60); // rose first light warming toward gold
    const line = 6 + 4 * Math.exp(-t / 70); // the sunlit line creeps down the slopes
    const drift = t * 1.1;
    const pulse = 1 + 0.06 * Math.sin((t / 8) * Math.PI * 2); // the sun's glow breathes
    for (let x = 0; x < W; x++) wisp[x] = noise((x + drift * 0.6) * 0.06, 3.7, 0);

    // the warm light, from rose toward gold
    const lr = 1, lg = mix(0.6, 0.8, warm), lb = mix(0.55, 0.4, warm);

    for (let r = 0; r < SR; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const gl = glowA[k] * pulse;
        const gg = 0.62 + 0.28 * smooth(0.15, 0.7, gl); // gold at the core, rose further out
        let cr = skyR[k] + gl, cg = skyG[k] + gl * gg, cb = skyB[k] + gl * (gg - 0.22), fl = 0.21;
        const z = depth[k];
        if (z) {
          const sn = snow[k];
          const lit = sun[k] * smooth(line, line + 7, alt[k]);
          const amb = (0.55 + 0.45 * up[k]) * (0.55 + 0.5 * smooth(4, 34, alt[k]));
          // snow: deep blue in shadow, rose to gold in the sun, ending sharply
          const sl = smooth(0.08, 0.24, lit);
          // full on faces and summits glow gold, glancing light stays rose
          const gold = clamp(0.6 * smooth(0.25, 0.8, lit) + 0.5 * smooth(14, 36, alt[k]));
          const br = 0.78 + 0.3 * lit;
          const sr = mix(0.13 * amb, lr * br, sl);
          const sg = mix(0.17 * amb, mix(lg - 0.12, lg + 0.14, gold) * br, sl);
          const sb = mix(0.36 * amb, mix(lb + 0.02, lb + 0.12, gold) * br, sl);
          // rock: slate in shadow, warm umber in the sun
          const rr = mix(0.06, 0.4, sl), rg = mix(0.07, 0.2, sl), rb = mix(0.14, 0.2, sl);
          cr = mix(rr, sr, sn);
          cg = mix(rg, sg, sn);
          cb = mix(rb, sb, sn);
          // forested foothills
          const wood = smooth(9, 4, alt[k]) * smooth(110, 75, z);
          cr = mix(cr, 0.07, wood);
          cg = mix(cg, 0.09, wood);
          cb = mix(cb, 0.18, wood);
          // distance hazes toward the sky behind, and haze settles in the
          // far valleys so each ridge stands clear of the one behind it
          const fog = smooth(16, 3, alt[k]) * smooth(70, 150, z) * 0.6;
          const haze = Math.max(fog, clamp(1 - Math.exp(-(z - SHORE_Z) / 260)) * 0.45);
          cr = mix(cr, skyR[k] + gl, haze);
          cg = mix(cg, skyG[k] + gl * gg, haze);
          cb = mix(cb, skyB[k] + gl * (gg - 0.22), haze);
          // the first light catches the crest itself in a bright line
          if (rim[k] && sl > 0.3) {
            const a = rim[k] * sl;
            cr = mix(cr, 1, a);
            cg = mix(cg, mix(0.89, 0.95, warm), a);
            cb = mix(cb, mix(0.76, 0.88, warm), a);
          }
          // the shadowed range still carries a dim blue screen; the wooded
          // foothills in front of it drop away to near black
          fl = mix(mix(0.42, 0.3, wood), 0.04, sl);
        } else {
          // a few stars still out in the west
          if (y < 34 && hash(x, r * 3 + 11) > 0.985) {
            const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + hash(x, r) * 3) + hash(r, x) * 6.28);
            const s = tw * smooth(150, 40, x) * smooth(34, 6, y) * 0.75;
            cr = Math.max(cr, s * 0.9);
            cg = Math.max(cg, s * 0.92);
            cb = Math.max(cb, s);
          }
          // high cloud, rose-gold toward the sun and mauve away from it
          if (r < CR) {
            const sx = x + t * 0.8, ix = Math.floor(sx), fx = sx - ix;
            const c0 = cloud[r * CW + (ix % CW)], c1 = cloud[r * CW + ((ix + 1) % CW)];
            const c = (c0 + (c1 - c0) * fx) * (0.35 + 0.65 * smooth(40, 150, x));
            if (c > 0.01) {
              const g = Math.exp(-Math.hypot(x + 0.5 - SUN[0], (y - SUN[1]) * 1.6) / 55);
              const b = clamp(0.25 + 0.9 * g);
              const kr = mix(0.32, 1, b), kg = mix(0.24, mix(0.62, 0.74, warm), b), kb = mix(0.4, 0.5, b);
              cr = mix(cr, kr, c * 0.75);
              cg = mix(cg, kg, c * 0.75);
              cb = mix(cb, kb, c * 0.75);
            }
          }
          // the sun, just clearing the ridge
          const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
          const ds = Math.sqrt(dx * dx + dy * dy);
          if (ds < 4.5) {
            const a = smooth(4.5, 3.3, ds);
            cr = mix(cr, 1, a);
            cg = mix(cg, 0.96, a);
            cb = mix(cb, 0.86, a);
          }
        }
        // mist pooled in the valley behind the shore, lit rose toward the sun
        const e = smooth(20, 170, x) * (0.6 + 0.4 * warm);
        const near = Math.exp(-Math.abs(x + 0.5 - SUN[0]) / 22) * 0.3;
        const mr = mix(0.48, 0.9, e) + near, mg = mix(0.46, 0.7, e) + near * 0.75, mb = mix(0.7, 0.7, e) + near * 0.5;
        if (r >= M0) {
          const m = mist[(r - M0) * MW + (Math.floor(x + drift) % MW)];
          // a ragged top edge: the sheet heaves in long swells and small tufts
          const edge = 5 * (m - 0.5) + 4 * (wisp[x] - 0.5);
          const band = smooth(M0 + 14, SHORE - 3, y + edge);
          const a = (0.3 + 0.7 * smooth(0.32, 0.64, m)) * band * 0.6;
          cr = mix(cr, mr, a);
          cg = mix(cg, mg, a);
          cb = mix(cb, mb, a);
          if (a > 0.05) fl = Math.max(fl, 0.2);
        }
        if (y >= treeTop[x]) {
          // the far shore's pines, dark against the mist
          const s = 0.4 + 0.6 * hash(x * 7, r * 3);
          cr = 0.04 + 0.03 * s;
          cg = 0.06 + 0.04 * s;
          cb = 0.1 + 0.05 * s;
          fl = 0;
          // and low wisps drifting across their feet
          const m = mist[(r - M0) * MW + (Math.floor(x * 0.7 + drift * 1.9 + 211) % MW)];
          const a = smooth(0.45, 0.72, m) * smooth(treeTop[x] + 1, SHORE, y) * 0.6;
          cr = mix(cr, mr, a);
          cg = mix(cg, mg, a);
          cb = mix(cb, mb, a);
        }
        AR[k] = cr;
        AG[k] = cg;
        AB[k] = cb;
        FR[k] = cr;
        FG[k] = cg;
        FB[k] = cb;
        floor[k] = fl;
      }
    }

    // the lake: the picture above, shaken a little by slow ripples
    for (let r = SHORE; r < H; r++) {
      const y = r + 0.5;
      const d = (y - SHORE) / LR;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const w1 = noise(x * 0.045 + t * 0.06, y * 0.5 - t * 0.35, 0);
        const w2 = noise(x * 0.12 - t * 0.1, y * 1.1 - t * 0.7, 0);
        const sway = (w1 - 0.5) * (0.4 + 1.4 * d) + (w2 - 0.5) * 0.5;
        const sx = Math.max(0, Math.min(W - 1, Math.round(x + sway)));
        const sr = Math.max(0, Math.min(SR - 1, Math.round(src[(r - SHORE) * W + x] + (w2 - 0.5) * 0.6 * d)));
        const sk = sr * W + sx;
        const refl = 0.68 - 0.32 * d;
        const w3 = noise(x * 0.03 + t * 0.04, y * 1.9 - t * 0.45, 0);
        const lift = 1 + (w3 - 0.5) * (0.4 + 0.5 * d); // long, faint ripple lines
        // the water gives back a little less colour than it was sent
        const ar = AR[sk], ag = AG[sk], ab = AB[sk];
        const grey = (ar + ag + ab) / 3;
        const deep = (hz[k] - 0.5) * 0.1 * d; // slow unevenness in the dark water
        let cr = 0.02 + deep + mix(grey, ar, 0.75) * refl * lift;
        let cg = 0.035 + deep + mix(grey, ag, 0.75) * refl * lift;
        let cb = 0.07 + deep * 1.6 + mix(grey, ab, 0.75) * refl * lift;
        // the sun's road
        const roadW = 1.5 + (y - SHORE) * 0.45;
        const road = Math.exp(-(((x + 0.5 - SUN[0]) / roadW) ** 2));
        const glint = smooth(0.55, 0.85, w2) * road * (0.5 + 0.5 * warm);
        cr += glint;
        cg += glint * 0.8;
        cb += glint * 0.6;
        FR[k] = cr;
        FG[k] = cg;
        FB[k] = cb;
        floor[k] = 0.26;
        fade[k] = smooth(H + 2, H - 22, y);
        if (r === SHORE) {
          // a dark seam where the shore meets the water
          FR[k] = 0.06;
          FG[k] = 0.12;
          FB[k] = 0.14;
          floor[k] = 0;
        }
      }
    }

    // the near pines and the bank, black against it all, rimmed on the sun side
    for (let k = 0; k < N; k++) {
      if (!fg[k]) continue;
      const s = fgShade[k];
      FR[k] = 0.02 + 0.05 * s;
      FG[k] = 0.04 + 0.06 * s;
      FB[k] = 0.05 + 0.06 * s;
      floor[k] = 0;
      const e = fgRim[k];
      if (e > 0 && s === 1) {
        // warm on the side facing the sun
        FR[k] = mix(FR[k], 0.62, e), FG[k] = mix(FG[k], 0.4, e), FB[k] = mix(FB[k], 0.38, e);
        floor[k] = 0.12 * e;
      } else if (e > 0 && s === 0.5) {
        // cool lilac from the sky on the other
        FR[k] = mix(FR[k], 0.2, e), FG[k] = mix(FG[k], 0.22, e), FB[k] = mix(FB[k], 0.36, e);
        floor[k] = 0.22 * e;
      }
      fade[k] = 1;
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = FR[k], cg = FG[k], cbl = FB[k], fl = floor[k];
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1)) * fade[k];
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          // dim cells keep some of their darkness in the colour too, so the
          // shadows sit back in deep blues rather than as a bright fine screen
          const s = ((0.3 + 0.7 * want) * mix(0.5, 1, smooth(0.08, 0.5, peak))) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cbl * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
