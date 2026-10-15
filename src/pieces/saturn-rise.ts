/*
 * saturn rise: Saturn hanging huge over the cracked ice of one of its small
 * moons. The rings are tilted toward us and cut razor thin, the planet's
 * shadow falls across them behind the globe, and their own shadow lies in a
 * band on the clouds. Geysers vent ice from the fractures in slow glittering
 * fans, the ring particles shimmer as they orbit, a tiny moon crosses, and the
 * small far sun burns low over the ridges.
 *
 * Saturn and its rings are traced once, cell by cell, as a sphere and a plane
 * seen from far away, so every shadow is real and static; each frame only the
 * cloud bands turn and the rings' texture slides round at its own speed for
 * each radius. Every cell is then drawn as a halftone dot sized by its
 * brightness, ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "saturn rise",
  category: "scenes",
  note: "saturn and its rings hanging over the cracked ice and geysers of a moon",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#04050a",
  palette: [
    "#0b0d14", "#161922", "#252935", "#3a3f4c",
    "#3b2a1a", "#5c4027", "#7f5a35", "#a37645", "#c4925a", "#dcae74", "#ecc893", "#f6e0b8",
    "#6b6a6c", "#8a8070", "#b3a892", "#d8cfba", "#7f8a96",
    "#0e1a2e", "#15284a", "#1f3a66", "#2c5085", "#3f6aa3", "#5e8bbf", "#89afd6", "#b6d0ea", "#ddebf8",
    "#2a7fb0", "#56b3dc",
    "#ffffff", "#fff0c8",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 70; // the horizon row
const F = 110; // focal length in cells, for the sky
const FG = 60; // and a wider one for the ice, so the near plates are not squashed flat
const CAM = 8; // eye height over the ice
const SC = [84, 33], SR = 25; // Saturn's centre and radius on screen
const INC = 0.34, ROLL = 0.14; // the rings open toward us and lean up to the right
const SUN = [173, 55]; // the sun on screen
const MOON_R = 2.85, MOON_T = 140; // the small moon's orbit, in Saturn radii, and its period
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
// the bright stars, which twinkle: [col, row, brightness, period in seconds]
const BRIGHT = [[176, 12, 1, 4.4], [12, 9, 0.85, 3.6], [194, 33, 0.8, 5.2], [150, 5, 0.75, 4.9], [7, 44, 0.7, 3.9]];
// the geysers: [base col, base row, height in rows, spread, brightness]
const PLUMES = [[146, 72, 40, 0.2, 0.9], [162, 75, 58, 0.22, 1.1], [124, 71, 26, 0.18, 0.8], [22, 77, 38, 0.2, 0.85]];
const STRIPES = [25, 46, 92]; // the tiger stripes, by distance

const norm = (v: number[]): number[] => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
// the ring plane's normal, and two axes in it
const NR = [-Math.sin(ROLL) * Math.cos(INC), Math.cos(ROLL) * Math.cos(INC), Math.sin(INC)];
const E1 = norm([NR[1], -NR[0], 0]);
const E2 = [-NR[2] * E1[1], NR[2] * E1[0], NR[0] * E1[1] - NR[1] * E1[0]];
// toward the sun, for Saturn (z toward us) and for the ice (z away from us)
const LS = norm([0.6, 0.28, 0.72]);
const LG = norm([0.78, 0.42, 0.3]);
const LV = norm([(SUN[0] - 100) / F, (HZ - SUN[1]) / F, 1]); // the sun's real direction, for glare

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

const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number): number => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
const hex = (s: string): number[] => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// The rings by radius, in Saturn radii: how much light they stop, and their
// colour. C ring faint and grey, B ring dense and cream, the Cassini division
// nearly empty, A ring greyer with the Encke gap, then the thin F ring.
function ring(r: number): [a: number, cr: number, cg: number, cb: number] {
  const fine = 0.88 + 0.24 * fbm(r * 90, 3.3, 2, 0); // ringlets
  let a = 0, c = [0, 0, 0];
  if (r > 1.24 && r < 1.53) (a = 0.2 * fine), (c = [0.55, 0.52, 0.48]);
  else if (r >= 1.53 && r < 1.95) (a = Math.min(1, (0.7 + 0.4 * smooth(1.53, 1.7, r)) * fine)), (c = [1, 0.9, 0.72]);
  else if (r >= 1.95 && r < 2.03) (a = 0.02), (c = [0.5, 0.48, 0.45]);
  else if (r >= 2.03 && r < 2.27) (a = r > 2.2 && r < 2.23 ? 0.04 : 0.55 * fine), (c = [0.78, 0.74, 0.68]);
  else if (r > 2.315 && r < 2.335) (a = 0.4), (c = [0.85, 0.82, 0.76]);
  return [clamp(a), c[0], c[1], c[2]];
}

// The ice: low hummocks, long sharp pressure ridges wandering across the
// plain, and the tiger stripes, trenches with a low ridge either side.
function ice(X: number, Z: number): number {
  let h = 0.9 * fbm(X * 0.03 + 11, Z * 0.03, 3, 0);
  const w = fbm(X * 0.012, Z * 0.012 + 5, 2, 0);
  const crest = 1 - Math.abs(2 * noise(X * 0.016 + w * 2.5, Z * 0.045 + w * 3, 0) - 1);
  h += 4.5 * crest ** 8 * smooth(0.45, 0.65, fbm(X * 0.02 + 3, Z * 0.02, 2, 0));
  for (const zc of STRIPES) {
    const zs = zc + 0.08 * X + zc * 0.12 * (fbm(X * 0.01, zc, 2, 0) - 0.5);
    const wd = zc * 0.07, d = Math.abs(Z - zs) / wd;
    h += wd * (-0.45 * Math.exp(-d * d) + 0.25 * Math.exp(-(((d - 1.8) / 0.7) ** 2)));
  }
  return h;
}

// The plates the ice is broken into: cellular noise, giving the distance to
// the nearest crack and which plate this is.
function plates(X: number, Z: number): [edge: number, id: number] {
  const xi = Math.floor(X), zi = Math.floor(Z);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cz = zi + j;
      const dx = cx + hash(cx, cz + 41) - X, dz = cz + hash(cx + 43, cz) - Z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < d1) (d2 = d1), (d1 = d), (id = hash(cx + 7, cz + 9));
      else if (d < d2) d2 = d;
    }
  }
  return [d2 - d1, id];
}

export default function saturnRise(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;

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

  // Halftone one cell: dot size from brightness, colour from hue, with the
  // colour making up what the dot size could not.
  const chars: string[] = new Array(N).fill(" ");
  const cols = new Uint8Array(N);
  const dot = (k: number, cr: number, cg: number, cb: number, floor: number, cap: number) => {
    const x = k % W, r = (k / W) | 0;
    const peak = Math.max(cr, cg, cb, 1e-4);
    const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
    const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
    chars[k] = DOTS[step];
    const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
    const s = Math.min(cap, 0.3 + 0.7 * want) / peak;
    cols[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
  };

  // --- the static picture: sky, ridges and ice -----------------------------
  const sr = new Float32Array(N), sg = new Float32Array(N), sb = new Float32Array(N), sf = new Float32Array(N), scap = new Float32Array(N).fill(1);
  const solid = new Uint8Array(N); // ridge or ice, which hides anything in the sky
  // the far ridges, a jagged line along the horizon, highest at the left
  const crest = new Float32Array(W + 2);
  for (let x = -1; x <= W; x++) {
    const m = 1 - Math.abs(2 * fbm(x * 0.035 + 4, 1.5, 3, 0) - 1);
    crest[x + 1] = HZ - 0.5 - (1.2 + 4.5 * m * m + 6 * Math.exp(-(((x - 38) / 30) ** 2)) + 3 * Math.exp(-(((x - 190) / 14) ** 2)) + 0.8 * hash(x, 7));
  }
  // The ice, marched column by column from our feet to the skyline, so the
  // near ridges stand up against what lies behind them.
  const gnd = new Uint8Array(N);
  const gx = new Float32Array(N), gz = new Float32Array(N), gy = new Float32Array(N);
  for (let c = 0; c < W; c++) {
    const dir = (c + 0.5 - 100) / FG;
    let topR = H, Z = 10, prevF = 1e9, prevZ = 0, prevY = 0;
    while (Z < 3000 && topR > 0) {
      const hy = ice(dir * Z, Z);
      const yf = HZ + (FG * (CAM - hy)) / Z;
      const r0 = Math.max(0, Math.ceil(yf - 0.5));
      for (let r = r0; r < topR; r++) {
        // place the cell between this sample and the last, by where its row falls
        const a = prevF > yf + 1e-6 ? clamp((prevF - (r + 0.5)) / (prevF - yf)) : 1;
        const k = r * W + c;
        gnd[k] = 1;
        gz[k] = prevZ ? mix(prevZ, Z, a) : Z;
        gx[k] = dir * gz[k];
        gy[k] = prevZ ? mix(prevY, hy, a) : hy;
      }
      if (r0 < topR) topR = r0;
      (prevF = yf), (prevY = hy), (prevZ = Z);
      Z += 0.05 + Z * 0.012;
    }
  }

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      let cr = 0, cg = 0, cb = 0, floor = 0, cap = 1;
      const ds = Math.hypot(x + 0.5 - SUN[0], y - SUN[1]);
      if (gnd[k]) {
        solid[k] = 1;
        const X = gx[k], Z = gz[k], Y = gy[k];
        const e = 0.1 + Z * 0.006;
        const hx = (ice(X + e, Z) - ice(X - e, Z)) / (2 * e), hz = (ice(X, Z + e) - ice(X, Z - e)) / (2 * e);
        const nl = Math.hypot(hx, 1, hz);
        const nx = -hx / nl, ny = 1 / nl, nz = -hz / nl;
        let lam = Math.max(0, nx * LG[0] + ny * LG[1] + nz * LG[2]);
        // the low sun throws long shadows off the ridges
        if (lam > 0 && Z < 400) {
          for (let s = 0.3 + Z * 0.004; s < 80; s += 0.25 + s * 0.15) {
            if (ice(X + LG[0] * s, Z + LG[2] * s) > Y + 0.02 + LG[1] * s) {
              lam = 0;
              break;
            }
          }
        }
        // hairline cracks between the plates the crust has broken into
        const [edge] = plates(X * 0.14, Z * 0.14);
        const near = smooth(130, 30, Z);
        const crack = smooth(0.05 + 0.6 / Z, 0.01, edge) * near;
        // fresh blue ice down in the stripes
        let deep = 0;
        for (const zc of STRIPES) {
          const zs = zc + 0.08 * X + zc * 0.12 * (fbm(X * 0.01, zc, 2, 0) - 0.5);
          deep = Math.max(deep, Math.exp(-((Math.abs(Z - zs) / (zc * 0.07)) ** 2) * 1.6));
        }
        const albedo = 0.85 + 0.25 * (fbm(X * 0.2, Z * 0.2, 2, 0) - 0.5);
        const sun = Math.max(0, 2.2 * lam - 0.25);
        cr = albedo * (sun * 1.0 + 0.06);
        cg = albedo * (sun * 0.98 + 0.12);
        cb = albedo * (sun * 0.95 + 0.28);
        cr = mix(cr, 0.08, deep * 0.9), cg = mix(cg, 0.36, deep * 0.9), cb = mix(cb, 0.62, deep * 0.9);
        // the cracks: black seams between the plates
        cr = mix(cr, 0, crack), cg = mix(cg, 0.02, crack), cb = mix(cb, 0.06, crack);
        // the sun's glare on the ice, a scatter of glints under it
        const vx = -X, vy = CAM - Y, vz = -Z, vl = Math.hypot(vx, vy, vz);
        const hvx = LV[0] + vx / vl, hvy = LV[1] + vy / vl, hvz = LV[2] + vz / vl, hl = Math.hypot(hvx, hvy, hvz);
        const glint = Math.pow(Math.max(0, (nx * hvx + ny * hvy + nz * hvz) / hl), 60) * smooth(0.6, 0.9, hash(x, r * 5)) * (1 - crack);
        cr += 1.2 * glint, cg += 1.15 * glint, cb += 1.05 * glint;
        // far ice is flatter in tone
        // far ice fades to a dim blue plain, lit along the skyline under the sun
        const far = smooth(35, 260, Z) * 0.8;
        const toward = Math.exp(-Math.abs(x - SUN[0]) / 28) * smooth(150, 600, Z);
        cr = mix(cr, 0.22 + 0.6 * toward, far), cg = mix(cg, 0.3 + 0.55 * toward, far), cb = mix(cb, 0.48 + 0.4 * toward, far);
        floor = 0.02;
        cap = 0.5 + 0.6 * clamp(Math.max(cr, cg, cb)); // dim ice draws in darker ink
      } else if (y >= crest[x + 1]) {
        solid[k] = 1;
        // the ridges, backlit: a dark blue wall, slopes that face the sun lit,
        // and the crest itself catching the light, brightest near the sun
        const slope = crest[x + 2] - crest[x];
        const face = clamp(slope * 0.5) * 0.4;
        const below = y - crest[x + 1];
        const rim = Math.exp(-below / 0.9) * (0.25 + 0.9 * Math.exp(-Math.abs(x - SUN[0]) / 30));
        const streak = 0.75 + 0.5 * hash(x, 3);
        const b = (0.12 + face) * streak;
        cr = 0.1 * b + rim * 1.0;
        cg = 0.18 * b + rim * 0.97;
        cb = 0.38 * b + rim * 0.9;
        cr += 0.3 * Math.exp(-ds / 7);
        cg += 0.26 * Math.exp(-ds / 7);
        cb += 0.2 * Math.exp(-ds / 7);
        floor = 0.03;
        cap = 0.22 + 0.85 * clamp(Math.max(cr, cg, cb));
      } else {
        // a black sky, the faint stars thicker in a band of the galaxy
        const band = Math.exp(-((((r - (90 - x * 0.45)) / 12) ** 2))) * smooth(0.4, 0.7, fbm(x * 0.05, r * 0.08, 3, 0));
        const hs = hash(x * 3 + 1, r * 7 + 2);
        if (hs > 0.992 - 0.04 * band) {
          const m = Math.pow(hash(x + 17, r + 29), 3);
          const s = 0.18 + 0.5 * m;
          const tint = hash(x + 5, r + 77);
          const [tr, tg, tb] = tint < 0.3 ? [0.84, 0.9, 1] : tint > 0.88 ? [1, 0.93, 0.84] : [0.96, 0.96, 0.98];
          (cr = s * tr), (cg = s * tg), (cb = s * tb);
        }
        cr += 0.015 * band, cg += 0.018 * band, cb += 0.03 * band;
      }
      sr[k] = cr, sg[k] = cg, sb[k] = cb, sf[k] = floor, scap[k] = cap;
    }
  }
  for (let k = 0; k < N; k++) dot(k, sr[k], sg[k], sb[k], sf[k], scap[k]);

  // --- Saturn's cloud bands, an equirectangular map wrapping in longitude --
  const TW = 256, TH = 128;
  const tr = new Float32Array(TW * TH), tg = new Float32Array(TW * TH), tb = new Float32Array(TW * TH);
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const u = i / TW, v = (j + 0.5) / TH;
      const lat = (0.5 - v) * Math.PI;
      // the bands wave a little along their length, more near the equator
      const warp = 0.035 * (fbm(u * 10, v * 18, 3, 10) - 0.5) * (1 + 1.5 * Math.exp(-((lat / 0.3) ** 2)));
      const s = Math.sin(lat + warp);
      const wave = Math.sin(s * 13 + 0.8 * Math.sin(s * 4)) + 0.45 * Math.sin(s * 33 + 1.3);
      let tone = 0.56 + 0.3 * wave + 0.25 * (fbm(s * 22 + 3, 0.5, 3, 0) - 0.5);
      tone += 0.05 * (fbm(u * 40, v * 20, 2, 40) - 0.5);
      tone = clamp(tone);
      let r = mix(0.5, 1.0, tone), g = mix(0.3, 0.86, tone), b = mix(0.13, 0.6, tone);
      // a bright cream zone at the equator, cold grey-blue toward the poles
      const eq = Math.exp(-((s / 0.1) ** 2));
      r = mix(r, 1.0, 0.55 * eq), g = mix(g, 0.9, 0.55 * eq), b = mix(b, 0.66, 0.55 * eq);
      const pole = smooth(0.72, 0.96, Math.abs(s));
      r = mix(r, 0.48, 0.65 * pole), g = mix(g, 0.53, 0.65 * pole), b = mix(b, 0.58, 0.65 * pole);
      const t = j * TW + i;
      tr[t] = r, tg[t] = g, tb[t] = b;
    }
  }
  const sample = (A: Float32Array, u: number, vy: number): number => {
    const fx = (((u % 1) + 1) % 1) * TW;
    const x0 = Math.floor(fx), ax = fx - x0, x1 = (x0 + 1) % TW;
    const y0 = Math.max(0, Math.min(TH - 2, Math.floor(vy))), ay = clamp(vy - y0);
    const a = A[y0 * TW + x0], b = A[y0 * TW + x1], c = A[y0 * TW + TW + x0], d = A[y0 * TW + TW + x1];
    return a + (b - a) * ax + (c - a) * ay + (a - b - c + d) * ax * ay;
  };

  // The rings' texture: clumps and wakes by radius and angle, wrapping in
  // angle, each radius sliding round at its own orbital speed.
  const RB = 520, TB = 720, R0 = 1.1, R1 = 2.4;
  const rt = new Float32Array(RB * TB);
  const omega = new Float32Array(RB);
  for (let i = 0; i < RB; i++) {
    const rr = R0 + ((R1 - R0) * (i + 0.5)) / RB;
    omega[i] = 0.05 * Math.pow(rr, -1.5);
    for (let j = 0; j < TB; j++) rt[i * TB + j] = 0.8 + 0.4 * fbm(j / 16, i * 0.3, 3, 45);
  }

  // --- trace Saturn and its rings once -------------------------------------
  // per cell: the globe's coverage, light and map position; the ring's
  // premultiplied colour, its coverage, radius bin and angle; which is in front
  const sat: number[] = [];
  const pa = new Float32Array(N), pl = new Float32Array(N), pu = new Float32Array(N), pv = new Float32Array(N), pz = new Float32Array(N).fill(-9);
  const ra = new Float32Array(N), rcr = new Float32Array(N), rcg = new Float32Array(N), rcb = new Float32Array(N), rz = new Float32Array(N), rbin = new Int16Array(N), rth = new Float32Array(N);
  const SUB = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
  for (let r = 0; r < HZ; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (solid[k]) continue;
      let acov = 0, ar = 0, ag = 0, ab = 0, pcov = 0;
      for (const [ox, oy] of SUB) {
        const px = (x + ox - SC[0]) / SR, py = -(r + oy - SC[1]) / SR;
        const q2 = px * px + py * py;
        const zs = q2 < 1 ? Math.sqrt(1 - q2) : -9;
        if (q2 < 1) pcov += 0.25;
        const zr = -(NR[0] * px + NR[1] * py) / NR[2];
        const rr = Math.sqrt(q2 + zr * zr);
        if (rr < R0 || rr > R1 || zr < zs) continue; // no ring here, or it is behind the globe
        const [a, cr, cg, cb] = ring(rr);
        if (a <= 0) continue;
        // in the planet's shadow?
        const d = px * LS[0] + py * LS[1] + zr * LS[2];
        const perp = Math.sqrt(Math.max(0, rr * rr - d * d));
        const lit = d < 0 ? smooth(0.98, 1.03, perp) : 1;
        const b = 0.92 * (0.08 + 0.92 * lit);
        acov += a * 0.25, ar += a * cr * b * 0.25, ag += a * cg * b * 0.25, ab += a * cb * b * 0.25;
      }
      const px = (x + 0.5 - SC[0]) / SR, py = -(r + 0.5 - SC[1]) / SR;
      const q2 = px * px + py * py;
      if (pcov > 0) {
        const qc = Math.min(0.999, Math.sqrt(q2));
        const nz = Math.sqrt(1 - qc * qc), nx = q2 > 0.998 ? px / Math.sqrt(q2) * qc : px, ny = q2 > 0.998 ? py / Math.sqrt(q2) * qc : py;
        const ndl = nx * LS[0] + ny * LS[1] + nz * LS[2];
        // the rings' shadow: walk toward the sun to the ring plane
        let shade = 1;
        const dn = NR[0] * LS[0] + NR[1] * LS[1] + NR[2] * LS[2];
        const tt = -(NR[0] * nx + NR[1] * ny + NR[2] * nz) / dn;
        if (tt > 0) {
          const qx = nx + tt * LS[0], qy = ny + tt * LS[1], qz = nz + tt * LS[2];
          shade = 1 - 0.88 * ring(Math.hypot(qx, qy, qz))[0];
        }
        const day = smooth(-0.03, 0.14, ndl) * (0.3 + 0.85 * Math.sqrt(clamp(ndl)));
        const limb = 0.5 + 0.5 * Math.sqrt(nz);
        pl[k] = day * limb * shade + 0.05 * limb; // ringshine keeps the night side from pure black
        // latitude and longitude about the ring plane's pole
        const sy = nx * NR[0] + ny * NR[1] + nz * NR[2];
        const s1 = nx * E1[0] + ny * E1[1] + nz * E1[2], s2 = nx * E2[0] + ny * E2[1] + nz * E2[2];
        pu[k] = Math.atan2(s1, s2) / (Math.PI * 2);
        pv[k] = (0.5 - Math.asin(Math.max(-1, Math.min(1, sy))) / Math.PI) * TH - 0.5;
        pa[k] = pcov;
        pz[k] = nz;
      }
      const zr = -(NR[0] * px + NR[1] * py) / NR[2];
      const rr = Math.sqrt(q2 + zr * zr);
      if (acov > 0.002) {
        ra[k] = acov, rcr[k] = ar, rcg[k] = ag, rcb[k] = ab, rz[k] = zr;
        rbin[k] = Math.max(0, Math.min(RB - 1, Math.floor(((rr - R0) / (R1 - R0)) * RB)));
        const th = Math.atan2(px * E2[0] + py * E2[1] + zr * E2[2], px * E1[0] + py * E1[1] + zr * E1[2]);
        rth[k] = th;
      }
      if (pcov > 0 || acov > 0.002) sat.push(k);
    }
  }

  // --- the geysers' particles, launched in a steady stream ---------------
  type Grain = [phase: number, life: number, vx: number, vy: number, g: number, tw: number];
  const grains: Grain[][] = PLUMES.map(([, , ph, sp], pi) => {
    const list: Grain[] = [];
    for (let i = 0; i < 150; i++) {
      const life = 16 + 12 * hash(i, pi * 7 + 1);
      const vy = (ph * (0.75 + 0.5 * hash(i, pi * 7 + 2))) / (life * 0.8);
      const vx = (hash(i, pi * 7 + 3) - 0.5) * 3.2 * sp * vy;
      list.push([hash(i, pi * 7 + 4), life, vx, vy, vy / life * 0.35, hash(i, pi * 7 + 5) * 6.28]);
    }
    return list;
  });

  // every cell that can change: Saturn, the moon's whole orbit, the plumes,
  // the sun's flare and the bright stars
  const live = new Uint8Array(N);
  for (const k of sat) live[k] = 1;
  const orbit = (a: number): number[] => {
    const ca = Math.cos(a) * MOON_R, sa = Math.sin(a) * MOON_R;
    return [ca * E1[0] + sa * E2[0], ca * E1[1] + sa * E2[1], ca * E1[2] + sa * E2[2]];
  };
  for (let i = 0; i < 720; i++) {
    const [ox, oy] = orbit((i / 720) * Math.PI * 2);
    const cx = Math.round(SC[0] + ox * SR), cy = Math.round(SC[1] - oy * SR);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = cx + dx, r = cy + dy;
      if (x >= 0 && x < W && r >= 0 && r < H) live[r * W + x] = 1;
    }
  }
  for (const [bx, by, ph, sp] of PLUMES) {
    for (let r = Math.max(0, by - ph - 8); r <= by; r++) {
      const hw = Math.ceil((0.7 + (by - r) * sp * 1.4) * 2.2) + 3;
      for (let x = Math.max(0, Math.floor(bx - hw)); x <= Math.min(W - 1, Math.ceil(bx + hw)); x++) live[r * W + x] = 1;
    }
  }
  for (let r = SUN[1] - 14; r <= SUN[1] + 14; r++) for (let x = SUN[0] - 26; x <= SUN[0] + 26; x++) if (x >= 0 && x < W) live[r * W + x] = 1;
  for (const [x, r] of BRIGHT) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) live[(r + dy) * W + x + dx] = 1;
  const cells: number[] = [];
  for (let k = 0; k < N; k++) if (live[k]) cells.push(k);
  const dirty = new Uint8Array(H);
  for (const k of cells) dirty[(k / W) | 0] = 1;

  const fr = new Float32Array(N), fg = new Float32Array(N), fb = new Float32Array(N), ff = new Float32Array(N), fc = new Float32Array(N);
  const lines: string[] = [];
  for (let r = 0; r < H; r++) lines.push(chars.slice(r * W, (r + 1) * W).join(""));

  return (t, { color } = {}) => {
    for (const k of cells) (fr[k] = sr[k]), (fg[k] = sg[k]), (fb[k] = sb[k]), (ff[k] = sf[k]), (fc[k] = scap[k]);

    // the small moon, where it is on its orbit
    const [mx, my, mz] = orbit(1.9 + (t / MOON_T) * Math.PI * 2);
    const msx = SC[0] + mx * SR, msy = SC[1] - my * SR;
    const moonAt = (k: number): number => {
      const x = k % W, r = (k / W) | 0;
      const d = Math.hypot(x + 0.5 - msx, r + 0.5 - msy);
      return smooth(1.9, 1.2, d);
    };
    const moonLit = (k: number): number => {
      const x = k % W, r = (k / W) | 0;
      return 0.35 + 0.65 * smooth(-0.4, 0.6, ((x + 0.5 - msx) * LS[0] - (r + 0.5 - msy) * LS[1]) / 1.4);
    };

    // Saturn: under the rings or over them, as they lie; the moon between
    const spin = t * 0.0025;
    const lay = (k: number, c: number, cr: number, cg: number, cb: number) => {
      fr[k] = mix(fr[k], cr, c), fg[k] = mix(fg[k], cg, c), fb[k] = mix(fb[k], cb, c);
    };
    for (const k of sat) {
      const m = moonAt(k), mzBehind = mz < pz[k] && pa[k] > 0.5;
      if (m > 0 && !mzBehind && (ra[k] === 0 || mz < rz[k])) lay(k, m, 0.82 * moonLit(k), 0.8 * moonLit(k), 0.76 * moonLit(k));
      const ringOver = ra[k] > 0 && (pa[k] === 0 || rz[k] > pz[k] - 1e-3);
      const drawRing = () => {
        const b = rbin[k];
        let th = (rth[k] - omega[b] * t) / (Math.PI * 2);
        th = (((th % 1) + 1) % 1) * TB;
        const j0 = th | 0, j1 = (j0 + 1) % TB, aj = th - j0;
        let s = rt[b * TB + j0] * (1 - aj) + rt[b * TB + j1] * aj;
        // two dark spokes riding round the B ring
        let sp = (rth[k] - 0.4 - t * 0.016) / (Math.PI * 2);
        sp = Math.abs(sp - Math.round(sp * 2) / 2);
        s *= 1 - 0.3 * Math.exp(-((sp / 0.012) ** 2)) * smooth(1.6, 1.7, R0 + ((R1 - R0) * b) / RB) * smooth(1.92, 1.82, R0 + ((R1 - R0) * b) / RB);
        const a = ra[k];
        fr[k] = fr[k] * (1 - a) + rcr[k] * s, fg[k] = fg[k] * (1 - a) + rcg[k] * s, fb[k] = fb[k] * (1 - a) + rcb[k] * s;
        fc[k] = 1;
      };
      if (ra[k] > 0 && !ringOver) drawRing();
      if (pa[k] > 0) {
        const u = pu[k] + spin, v = pv[k], l = pl[k];
        lay(k, pa[k], sample(tr, u, v) * l, sample(tg, u, v) * l, sample(tb, u, v) * l);
        ff[k] = 0.1 * Math.min(1, l) * pa[k];
        // belts draw in darker ink than zones, so the bands survive the halftone
        fc[k] = 0.35 + 0.7 * clamp(Math.max(fr[k], fg[k], fb[k]));
      }
      if (ringOver) drawRing();
      if (m > 0 && mz > Math.max(pa[k] > 0.5 ? pz[k] : -9, ra[k] > 0 ? rz[k] : -9)) lay(k, m, 0.82 * moonLit(k), 0.8 * moonLit(k), 0.76 * moonLit(k));
    }
    // the moon out past the rings, over the plain sky
    for (let r = Math.max(0, Math.floor(msy - 2)); r <= Math.min(HZ, Math.ceil(msy + 2)); r++) {
      for (let x = Math.max(0, Math.floor(msx - 2)); x <= Math.min(W - 1, Math.ceil(msx + 2)); x++) {
        const k = r * W + x;
        if (solid[k] || pa[k] > 0 || ra[k] > 0) continue;
        const m = moonAt(k);
        if (m > 0) lay(k, m, 0.82 * moonLit(k), 0.8 * moonLit(k), 0.76 * moonLit(k)), (fc[k] = 1);
      }
    }

    // the geysers: a soft fan of vapour rising, and the glittering grains in it
    for (let p = 0; p < PLUMES.length; p++) {
      const [bx, by, ph, sp, pb] = PLUMES[p];
      // lit from behind: the nearer the sun, the brighter they glow
      const fs = pb * (0.55 + 1.3 * Math.exp(-Math.abs(bx - SUN[0]) / 25));
      for (let r = Math.max(0, by - ph - 8); r < by; r++) {
        const h = by - (r + 0.5);
        const w = 0.7 + h * sp * 1.4;
        const hw = Math.ceil(w * 2.2);
        for (let x = Math.max(0, Math.floor(bx - hw)); x <= Math.min(W - 1, Math.ceil(bx + hw)); x++) {
          const k = r * W + x;
          const dx = x + 0.5 - bx;
          const fan = Math.exp(-((dx / w) ** 2));
          const rise = noise(dx * 0.22 + p * 9, (h - t * 1.3) * 0.11, 0);
          // the same vapour spread wider as it climbs, so thinner, then gone
          let d = fan * (3 / (w + 2)) * smooth(ph * 1.2, ph * 0.25, h) * (0.5 + 0.8 * rise) * smooth(0, 5, h) * fs * 0.55;
          d = Math.max(0, d - 0.03); // no stray haze dots out in space
          fr[k] += d * 0.72, fg[k] += d * 0.86, fb[k] += d;
          if (d > 0.05) (fc[k] = 1), (ff[k] = Math.max(ff[k], 0.12 * smooth(0.05, 0.3, d)));
        }
      }
      for (const [phase, life, vx, vy, g, tw] of grains[p]) {
        const age = (((t / life + phase) % 1) + 1) % 1 * life;
        const gx = bx + vx * age, gy = by - vy * age + g * age * age;
        if (gy >= by) continue;
        const x = Math.floor(gx), r = Math.floor(gy);
        if (x < 0 || x >= W || r < 0) continue;
        const k = r * W + x;
        if (!live[k]) continue;
        const v = (1 - age / life) * (0.55 + 0.45 * Math.sin(t * 3 + tw)) * fs * 0.7;
        fr[k] += v * 0.85, fg[k] += v * 0.93, fb[k] += v;
        fc[k] = 1;
      }
    }

    // the sun: a hard white point, a small glow, and a long flare along the horizon
    const breathe = 1 + 0.12 * Math.sin(t * 0.9);
    for (let r = SUN[1] - 14; r <= SUN[1] + 14; r++) {
      for (let x = Math.max(0, SUN[0] - 26); x <= Math.min(W - 1, SUN[0] + 26); x++) {
        const k = r * W + x;
        const dx = x + 0.5 - SUN[0], dy = r + 0.5 - SUN[1], d = Math.hypot(dx, dy);
        let g = Math.exp(-d / 2) * 1.4 + Math.exp(-d / 8) * 0.2;
        g += Math.exp(-dy * dy * 2) * Math.exp(-Math.abs(dx) / (8 * breathe)) * 1.1;
        g += Math.exp(-dx * dx * 2) * Math.exp(-Math.abs(dy) / (4 * breathe)) * 0.9;
        if (d < 1.6) g = 3;
        if (solid[k]) g *= 0.4;
        fr[k] += g, fg[k] += g * 0.96, fb[k] += g * 0.86;
        if (g > 0.08) fc[k] = 1;
      }
    }

    for (const [x, r, s, p] of BRIGHT) {
      const v = s * (0.8 + 0.2 * Math.sin((t / p) * Math.PI * 2 + hash(x, r) * 6.28));
      const k = r * W + x;
      if (pa[k] > 0 || ra[k] > 0) continue;
      fr[k] = Math.max(fr[k], v * 0.95), fg[k] = Math.max(fg[k], v * 0.97), fb[k] = Math.max(fb[k], v);
      for (const o of [-1, 1, -W, W]) (fr[k + o] += v * 0.16), (fg[k + o] += v * 0.17), (fb[k + o] += v * 0.2);
    }

    for (const k of cells) dot(k, fr[k], fg[k], fb[k], ff[k], fc[k]);
    for (let r = 0; r < H; r++) if (dirty[r]) lines[r] = chars.slice(r * W, (r + 1) * W).join("");
    if (color) color.set(cols);
    return lines.join("\n");
  };
}
