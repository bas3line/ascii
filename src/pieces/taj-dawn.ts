/*
 * taj dawn: the Taj Mahal at first light, seen down its long reflecting canal
 * between rows of cypress. The sun has just cleared the red sandstone mosque
 * on the left; the haze and the clouds drift, the canal's reflection ripples,
 * light glints along its far end, and a few birds cross.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "taj dawn",
  category: "scenes",
  note: "the taj mahal at sunrise, mirrored in its pool through morning haze",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0d0a13",
  palette: [
    "#2e2a55", "#3d3870", "#514a8a", "#6a62a3", "#8a83bd",
    "#5a3a5e", "#7a4d72", "#9a6284", "#b97a92", "#d495a2",
    "#b8705a", "#d98d66", "#efab78", "#f8c98e", "#ffe2ae", "#fff3d8", "#fffcf2",
    "#8e7f9e", "#ad9cb4", "#cbb6c4", "#e3cdd2", "#f3e0dc",
    "#2a4a3e", "#36584a", "#4a6c58", "#66845f", "#8a9a68",
    "#8a4a3e", "#b0624a", "#3a2f4a", "#4e3d5a", "#f6d6c0", "#e9bfae",
    "#5e6a40", "#7d8a52", "#a3a064", "#c2b274",
  ],
} satisfies Meta;

const W = 200, H = 100;
const CX = 128; // the Taj's axis, and the canal's vanishing point
const BASE = 68; // where the Taj meets the garden, and the far end of the canal
const HZ = 60; // eye level
const S = 0.7; // cells per metre on the Taj
const SUN = [36, 40];
const MX = 45, MB = 67; // the mosque's axis and foot
const KR = 1.55; // the reflection is foreshortened so the dome reaches the canal
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// materials
const SKY = 0, BGTREE = 1, MARBLE = 2, LAWN = 3, WALK = 4, POOL = 5, CYPRESS = 6, MOSQUE = 7;

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

// The onion dome's profile: swelling out past the drum, then drawn to a point.
const onion = (h: number) => (h < 0.3 ? 0.8 + 0.2 * Math.sin((h / 0.3) * Math.PI * 0.5) : Math.pow(Math.cos(((h - 0.3) / 0.7) * Math.PI * 0.5), 1.45));

// Pointed arch: half-width at height h above the springline, for an arch of
// half-width w; zero above the apex.
const arch = (w: number, h: number) => {
  if (h <= 0) return w;
  const c = w * 0.5, R = w + c;
  const q = R * R - h * h;
  return q > 0 ? Math.max(0, Math.sqrt(q) - c) : 0;
};

/*
 * The Taj in metres: X across from the axis, Y up from the garden. Returns
 * [lit, recess] for marble, or null for air. lit runs 0 (shadow, facing away
 * from the sun) to 1 (facing it); recess darkens arches and niches.
 */
function taj(X: number, Y: number): [number, number] | null {
  const ax = Math.abs(X);
  const left = X < 0 ? 1 : -1; // +1 on the sun's side
  // finial
  if (Y >= 72 && Y < 80.5 && ax <= 0.75 + (Math.abs(Y - 74.5) < 0.9 ? 0.6 : 0) + (Math.abs(Y - 77) < 0.7 ? 0.4 : 0)) return [0.75 + 0.2 * left, 0];
  // the great dome
  if (Y >= 47.5 && Y < 72) {
    const h = (Y - 47.5) / 24.5;
    const hw = 15 * onion(h);
    if (ax <= hw) {
      // a sphere lit from the left and a little above
      const nx = X / (hw + 0.01);
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      return [clamp(0.3 + 0.5 * (-0.8 * nx + 0.4 * nz) + 0.2 * h), 0];
    }
  }
  // the four chhatris on the roof, two in view
  const cx = ax - 17.5;
  if (Math.abs(cx) <= 4.4 && Y >= 39.5 && Y < 55.5) {
    const nx = (X < 0 ? -cx : cx) / 4.4;
    if (Y < 41) return [clamp(0.5 - 0.4 * nx * left), 0];
    if (Y < 46.5) {
      if (Math.abs(cx) > 3.6) return null;
      const open = Math.abs(cx) < 2.6 && Math.abs(cx) > 0.6 && Y < 45.5;
      return [clamp(0.5 - 0.45 * (X < 0 ? -cx : cx) / 4 * left), open ? 0.75 : 0];
    }
    if (Y < 47.3) return [clamp(0.55 - 0.4 * nx * left), 0];
    const h = (Y - 47.3) / 6.5;
    if (h < 1 && Math.abs(cx) <= 4 * onion(h)) return [clamp(0.55 - 0.6 * ((X < 0 ? -cx : cx) / (4 * onion(h) + 0.01)) * left + 0.1 * h), 0];
    if (h >= 1 && Math.abs(cx) < 0.6) return [0.6, 0];
  }
  // the drum under the dome
  if (Y >= 40 && Y < 47.5 && ax <= 12.2) {
    const nx = X / 12.2;
    const band = Y > 45.8 ? 0.15 : 0;
    return [clamp(0.45 - 0.55 * nx + band), 0];
  }
  // slender pinnacles at the corners of the portal and of the building
  if ((Math.abs(ax - 8.8) < 0.75 && Y >= 40 && Y < 47.5) || (Math.abs(ax - 28.2) < 0.75 && Y >= 38 && Y < 44.5)) return [0.55 + 0.25 * left, 0];
  // the main building
  if (ax <= 28.5 && Y >= 7 && Y < 40) {
    // the portal rises a little above the parapet
    if (Y >= 38.5 && ax > 9 && (Math.floor((ax + 0.5) / 1.5) & 1)) return null;
    if (ax <= 9) {
      // central portal: a calligraphy band round a deep pointed arch
      const hw = arch(6, Y - 25);
      if (ax <= hw && Y < 25 + 9) {
        const door = ax <= 3.2 && ax <= arch(3.2, Y - 15.5);
        return [0.35 + 0.15 * left, door ? 0.82 : 0.6 + 0.12 * (1 - smooth(25, 33, Y))];
      }
      if (ax <= hw + 0.8 && Y < 25 + 10.2) return [0.42, 0.35];
      if (ax > 7.6 && ax <= 9 && Y < 40) return [0.5 + 0.12 * left, 0.08];
      return [0.5 + 0.08 * left, 0];
    }
    if (ax <= 21) {
      // front face either side of the portal: two storeys of arched niches
      const nx = ax - 15;
      for (const [y0, y1] of [[9, 21.5], [24.5, 37]]) {
        if (Y >= y0 && Y < y1 && Math.abs(nx) <= arch(3.6, Y - (y1 - 4.5))) return [0.4 + 0.1 * left, 0.5];
        if (Y >= y0 - 0.6 && Y < y1 + 0.6 && Math.abs(nx) <= arch(4.3, Y - (y1 - 4.2)) && Math.abs(nx) > 3.6) return [0.45, 0.22];
      }
      return [0.5 + 0.1 * left, 0];
    }
    // chamfered corners, turned toward the sun on the left and away on the right
    const lit = 0.5 + 0.48 * left;
    const nx = ax - 24.7;
    for (const [y0, y1] of [[9, 21.5], [24.5, 37]]) {
      if (Y >= y0 && Y < y1 && Math.abs(nx) <= arch(2.2, Y - (y1 - 3))) return [lit * 0.7, 0.45];
    }
    return [lit, 0];
  }
  // minarets at the corners of the plinth, tapering, with three galleries
  const mx = ax - 44;
  if (Y >= 7 && Y < 57) {
    const s = X < 0 ? -mx : mx; // across the shaft, toward the sun negative
    const hw = 2.9 - 0.6 * (Y - 7) / 40;
    for (const g of [19.5, 32, 44.5]) {
      if (Y >= g && Y < g + 1.4 && Math.abs(mx) <= hw + 1.1) return [clamp(0.5 - 0.42 * s / (hw + 1.1) * left), Y < g + 0.5 ? 0.35 : 0];
    }
    if (Y < 46 && Math.abs(mx) <= hw) return [clamp(0.5 - 0.48 * (s / hw) * left), 0];
    if (Y >= 45.9 && Y < 49.5 && Math.abs(mx) <= 2.2) return [clamp(0.5 - 0.4 * s / 2.2 * left), Math.abs(mx) < 1.4 && Math.abs(mx) > 0.3 ? 0.7 : 0];
    if (Y >= 49.5) {
      const h = (Y - 49.5) / 4.5;
      if (h < 1 && Math.abs(mx) <= 2.5 * onion(h)) return [clamp(0.55 - 0.55 * s / (2.5 * onion(h) + 0.01) * left), 0];
      if (h >= 1 && Y < 56 && Math.abs(mx) < 0.5) return [0.6, 0];
    }
  }
  // the plinth, with a row of shallow niches
  if (ax <= 47.5 && Y >= 0 && Y < 7) {
    if (Y > 6.2) return [0.62, 0];
    const k = (ax % 5.2) - 2.6;
    if (Y > 1.5 && Y < 5.2 && Math.abs(k) < 1.1) return [0.42, 0.3];
    return [0.52, 0];
  }
  return null;
}

/*
 * The red sandstone mosque that flanks the Taj, in cells: three domes over a
 * five-bay front with a tall central portal. Returns 0 for wall, 1 for dome,
 * 2 for a recess, or -1 for air. It stands against the sun, so it is mostly
 * silhouette.
 */
function mosque(xc: number, y: number): number {
  const dx = xc - MX, ax = Math.abs(dx);
  // plinth
  if (y >= MB - 2.5 && y < MB && ax <= 22) return 0;
  // end towers, each with a small kiosk on top
  const tx = Math.abs(ax - 19.5);
  if (tx <= 1.3 && y >= MB - 13 && y < MB - 2.5) return 0;
  if (y >= MB - 15.5 && y < MB - 13) {
    const h = (MB - 13 - y) / 2.5;
    if (tx <= 1.8 * onion(h)) return 1;
  }
  if (tx < 0.35 && y >= MB - 16.5 && y < MB - 15.5) return 1;
  // central portal, rising above the front
  if (ax <= 5.5 && y >= MB - 15 && y < MB - 2.5) {
    if (y < MB - 14.3 && (Math.floor(xc) & 1)) return -1;
    if (ax <= arch(3.4, MB - 9.5 - y) && y >= MB - 13.5) return 2;
    return 0;
  }
  // the five-bay front and its parapet
  if (ax <= 18 && y >= MB - 10 && y < MB - 2.5) {
    const bay = ((ax - 5.5) % 4.2) - 2.1;
    if (ax > 6 && y >= MB - 8.5 && Math.abs(bay) <= arch(1.4, MB - 6.2 - y)) return 2;
    return 0;
  }
  if (ax <= 18 && y >= MB - 10.8 && y < MB - 10 && (Math.floor(xc * 0.75) & 1)) return 0;
  // side domes on drums
  const sx = Math.abs(ax - 11.5);
  if (sx <= 2.6 && y >= MB - 12 && y < MB - 10) return 0;
  if (y >= MB - 17 && y < MB - 12) {
    const h = (MB - 12 - y) / 5;
    if (sx <= 3.6 * onion(h)) return 1;
  }
  if (sx < 0.35 && y >= MB - 18.5 && y < MB - 17) return 1;
  // the great central dome
  if (ax <= 4 && y >= MB - 16.5 && y < MB - 15) return 0;
  if (y >= MB - 23.5 && y < MB - 16.5) {
    const h = (MB - 16.5 - y) / 7;
    if (ax <= 5.2 * onion(h)) return 1;
  }
  if (ax < 0.4 && y >= MB - 25.5 && y < MB - 23.5) return 1;
  return -1;
}

export default function tajDawn(): Frame {
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

  const mat = new Uint8Array(N);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const floorA = new Float32Array(N).fill(0.12);
  const hazeW = new Float32Array(N); // how much drifting haze each cell takes
  const glowA = new Float32Array(N); // how much of the sun's glow a sky cell holds, for its breathing

  // --- the sky ------------------------------------------------------------
  const sunGlow = (x: number, y: number) => {
    const dx = x - SUN[0], dy = (y - SUN[1]) * 1.25;
    const d = Math.sqrt(dx * dx + dy * dy);
    return Math.exp(-d / 4) * 0.9 + Math.exp(-d / 13) * 0.42 + Math.exp(-d / 40) * 0.3;
  };
  const skyAt = (x: number, y: number) => {
    const v = clamp(y / HZ);
    // deep violet overhead, mauve, then rose and peach toward the horizon
    const up = smooth(0.05, 0.8, v);
    let r = mix(0.055, 0.3, up), g = mix(0.05, 0.19, up), b = mix(0.17, 0.36, up);
    const low = smooth(0.62, 1, v);
    r = mix(r, 0.66, low), g = mix(g, 0.4, low), b = mix(b, 0.42, low);
    // cooler and dimmer on the side away from the sun
    const far = smooth(50, 200, x) * 0.18;
    r *= 1 - far, g *= 1 - far * 0.8, b *= 1 - far * 0.3;
    const glow = sunGlow(x, y) + Math.exp(-Math.abs(y - 57) / 5) * 0.25 * Math.exp(-Math.abs(x - SUN[0]) / 50);
    r += glow * 1.0, g += glow * 0.78, b += glow * 0.48;
    // faint shafts of light fanning up from the sun through the haze
    const ang = Math.atan2(y - SUN[1], x - SUN[0]);
    const ray = fbm(ang * 9 + 3, 1.7, 2, 0);
    const rd = Math.hypot(x - SUN[0], y - SUN[1]);
    const shaft = smooth(0.5, 0.75, ray) * Math.exp(-rd / 45) * smooth(4, 14, rd) * 0.12;
    r += shaft, g += shaft * 0.8, b += shaft * 0.55;
    return [r, g, b];
  };

  // Dawn cloud in a wrapping strip that drifts: broken noise, gathered into
  // a bank up and right of the sun and a lower one behind the dome.
  const CW = 400, CH = 50;
  // [x, y, half-width, height above, depth below, strength]
  const banks = [
    [76, 28, 40, 7, 3.5, 1.4], // over the sun's right shoulder
    [152, 36, 52, 9, 4, 1], // behind the dome
    [16, 13, 32, 4, 2.5, 0.8], // a high wisp
    [250, 24, 40, 8, 4, 1],
    [330, 33, 36, 7, 4, 0.95],
  ];
  const cdens = (x: number, y: number) => {
    const q = fbm(x * 0.01, y * 0.04, 2, CW * 0.01);
    const n = fbm(x * 0.025 + q * 1.6, y * 0.075 + q * 0.6, 5, CW * 0.025);
    let m = 0;
    for (const [bx, by, rx, up, down, a] of banks) {
      let dx = x - bx;
      dx -= Math.round(dx / CW) * CW;
      const ex = dx / rx, ey = (y - by) / (y < by ? up : down);
      const e = Math.exp(-ex * ex * ex * ex - ey * ey) * a;
      if (e > m) m = e;
    }
    return 0.62 * m + 1.4 * (n - 0.5) + 0.02;
  };
  const cloud = new Float32Array(CW * CH);
  const cloudLit = new Float32Array(CW * CH);
  for (let r = 0; r < CH; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const d = cdens(x, y);
      cloud[r * CW + x] = smooth(0.46, 0.66, d);
      // the side toward the sun (down and left) catches the light
      const toward = cdens(x - 2, y + 2.5);
      cloudLit[r * CW + x] = clamp(0.56 + (d - toward) * 0.75 - (d - 0.6) * 0.2 + 0.7 * (fbm(x * 0.09, y * 0.2, 2, CW * 0.09) - 0.5));
    }
  }

  // --- the land -----------------------------------------------------------
  // the far tree line: rounded crowns, lower behind the Taj
  const crowns: [number, number, number][] = [];
  for (let x = -12, i = 0; x < W + 12; x += 4 + hash(i, 60) * 5, i++) {
    const rad = 3 + hash(i, 61) * 4.5;
    crowns.push([x, 60.5 - hash(i, 62) * 2.5 - 2.5 * fbm(x * 0.03, 2, 2, 0) + rad * 0.35, rad]);
  }
  const tops = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let t0 = 64;
    for (const [cx, cy, rad] of crowns) {
      const dx = x + 0.5 - cx;
      if (Math.abs(dx) < rad) t0 = Math.min(t0, cy - Math.sqrt(rad * rad - dx * dx) * 0.75);
    }
    tops[x] = t0 - 0.6 * fbm(x * 0.5, 7, 2, 0);
  }
  const treeTop = (x: number) => tops[Math.min(W - 1, Math.max(0, Math.floor(x)))];
  const poolHalf = (y: number) => 0.5 * (y - HZ) + 1;
  const walkHalf = (y: number) => 0.7 * (y - HZ) + 1.5;

  // cypress rows either side of the canal, near ones last
  const trees: { x: number; base: number; h: number; w: number; s: number }[] = [];
  for (const s of [8.5, 10.4, 13, 16.8, 22.5, 31]) {
    for (const side of [-1, 1]) {
      // an inner row along the walks, and a lower outer row further back
      for (const [off, tall] of [[4.3, 0.8], [2.45, 1]]) {
        if (off > 3 && (s > 20 || side > 0)) continue;
        if (side < 0 && s > 30) continue; // leave the sun clear
        const cxp = CX + side * off * s;
        trees.push({ x: cxp + (hash(s * 10, side + off) - 0.5) * 0.6, base: HZ + s, h: 1.6 * tall * s * (0.94 + 0.12 * hash(s * 7, side + 3 + off)), w: 0.26 * s, s });
      }
    }
  }
  // long shadows of the cypresses, cast toward us and to the right
  const shadowAt = (xc: number, y: number) => {
    let lit = 1;
    for (const tr of trees) {
      const dx = xc - tr.x, dy = y - tr.base;
      if (dy < -0.5) continue;
      const along = (dx * 0.6 + dy * 0.8) / tr.s;
      const across = (dx * 0.8 - dy * 0.6) / tr.s;
      if (along > 0 && along < 3 && Math.abs(across) < 0.17 * (1 - along / 3.4) + 0.03) lit *= 0.08 + 0.92 * smooth(1.6, 3, along);
    }
    return lit;
  };

  // the mosque's silhouette, and its edges toward the sun
  const mq = new Int8Array(N).fill(-1);
  for (let r = MB - 27; r < MB; r++) for (let x = MX - 24; x <= MX + 24; x++) mq[r * W + x] = mosque(x + 0.5, r + 0.5);

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5, xc = x + 0.5;
      let m = SKY, cr: number | undefined, cg: number | undefined, cb: number | undefined, fl = 0.18, hz = 0;
      const tt = treeTop(xc);
      if (y < BASE && y >= tt) {
        m = BGTREE;
      } else if (y >= BASE) {
        const dx = Math.abs(xc - CX);
        m = dx < poolHalf(y) ? POOL : dx < walkHalf(y) ? WALK : LAWN;
      }
      if (m === SKY) {
        [cr, cg, cb] = skyAt(xc, y);
        // never one flat tone: a faint unevenness in the dawn air
        const veil = 0.88 + 0.24 * fbm(xc * 0.05, y * 0.09, 3, 0);
        cr *= veil, cg *= veil, cb *= veil;
        glowA[k] = sunGlow(xc, y);
        hz = 0.5 + 0.5 * smooth(20, 58, y);
        fl = 0.05 + 0.13 * smooth(18, 42, y);
      } else if (m === BGTREE) {
        // distant trees, flattened by the haze; rimmed where the sun is close
        const tex = fbm(xc * 0.25, y * 0.3, 3, 0);
        const depth = smooth(tt, BASE, y);
        const sky = skyAt(xc, tt);
        const a = 0.46 - 0.12 * depth + 0.12 * tex;
        cr = mix(0.1, sky[0], a), cg = mix(0.09, sky[1], a), cb = mix(0.15, sky[2], a);
        const rim = smooth(tt + 1.8, tt, y) * Math.exp(-Math.abs(xc - SUN[0]) / 18);
        cr += 0.4 * rim, cg += 0.27 * rim, cb += 0.14 * rim;
        // their feet lost in a bank of ground mist, broken into soft patches
        const patch = 0.45 + 0.75 * smooth(0.3, 0.7, fbm(xc * 0.035 + 11, y * 0.18, 3, 0));
        const mist = smooth(tt + 1, BASE + 1, y) * 0.75 * Math.min(1, patch);
        const mw = Math.exp(-Math.abs(xc - SUN[0]) / 90);
        cr = mix(cr, 0.62 + 0.25 * mw, mist), cg = mix(cg, 0.46 + 0.16 * mw, mist), cb = mix(cb, 0.55 + 0.02 * mw, mist);
        fl = 0.1;
        hz = 0.8;
      } else if (m === LAWN) {
        const v = (y - BASE) / (H - BASE);
        const u = (xc - CX) / (y - HZ); // across the ground plane
        const tex = fbm(u * 3, 40 / (y - HZ), 3, 0);
        const stripe = Math.floor(u * 1.4) & 1 ? 1 : 0.55; // mown bands that run toward the Taj
        // low sun raking across the grass from the left: gold where it lands,
        // violet sky-light in the shade
        let lit = (0.6 + 0.4 * Math.exp(-Math.abs(xc - SUN[0]) / 60)) * stripe * (0.85 + 0.3 * tex);
        lit *= shadowAt(xc, y);
        const vig = 1 - 0.45 * smooth(0.5, 1, v) * (0.6 + 0.4 * smooth(40, 0, Math.min(xc, W - xc)));
        const fall = 1 - 0.35 * v;
        // sunlit grass turns from gold near the sun to rose further off
        const warm = Math.exp(-Math.abs(xc - SUN[0]) / 80);
        // the shade holds the violet of the sky overhead, brighter in the open
        const amb = 0.75 + 0.5 * stripe - 0.25 * v;
        cr = (0.12 * amb + 0.56 * lit * fall) * vig;
        cg = (0.09 * amb + (0.36 + 0.14 * warm) * lit * fall) * vig;
        cb = (0.24 * amb + (0.26 - 0.1 * warm) * lit * fall) * vig;
        // the far lawn sits in the haze
        const far = smooth(BASE + 10, BASE, y) * 0.7;
        const mw = Math.exp(-Math.abs(xc - SUN[0]) / 90);
        cr = mix(cr, 0.62 + 0.25 * mw, far), cg = mix(cg, 0.46 + 0.16 * mw, far), cb = mix(cb, 0.55 + 0.02 * mw, far);
        fl = 0.1;
        hz = 0.7 * (1 - v);
      } else if (m === WALK) {
        const v = (y - BASE) / (H - BASE);
        const lit = xc < CX ? 1 : 0.86;
        // paving joints, closer together into the distance
        const joint = ((90 / (y - HZ)) % 1 < 0.14 ? 0.72 : 1) * (0.5 + 0.5 * shadowAt(xc, y));
        cr = (0.78 - 0.22 * v) * lit * joint, cg = (0.57 - 0.16 * v) * lit * joint, cb = (0.53 - 0.12 * v) * lit * joint;
        fl = 0.15;
        hz = 0.3;
      } else {
        fl = 0.15;
      }
      // the mosque, dark against the sun, its edges caught by it
      const q = mq[k];
      if (q >= 0) {
        m = MOSQUE;
        const sg = sunGlow(xc, y);
        const isDome = q === 1;
        let a = isDome ? [0.2, 0.11, 0.19] : [0.31, 0.13, 0.15];
        if (q === 2) a = [0.07, 0.04, 0.07];
        const air = 0.06 + 0.3 * smooth(MB - 8, MB, y); // the foot sinks into the mist
        cr = mix(a[0], 0.62, air), cg = mix(a[1], 0.44, air), cb = mix(a[2], 0.5, air);
        // rim light where the cell faces open sky toward the sun
        const lft = x > 0 ? mq[k - 1] : -1, up = r > 0 ? mq[k - W] : -1;
        const toward = xc < SUN[0] ? (x < W - 1 ? mq[k + 1] : -1) : lft;
        let rim = (up < 0 ? 0.75 : 0) + (toward < 0 ? 0.9 : 0) + (lft < 0 && up < 0 ? 0.2 : 0);
        rim = Math.min(1, rim) * Math.min(1, 0.25 + sg * 1.6);
        cr = mix(cr, 1.0, rim * 0.8), cg = mix(cg, 0.7, rim * 0.8), cb = mix(cb, 0.48, rim * 0.8);
        fl = 0.04;
        hz = 0.15;
      }
      // the Taj in front of the sky and the trees
      if (y < BASE + 0.01) {
        const t = taj((xc - CX) / S, (BASE - y) / S);
        if (t) {
          m = MARBLE;
          const [lit, rec] = t;
          // lavender shadow, pink-white front, gold where it faces the sun
          const sh = [0.42, 0.36, 0.56], fr = [0.9, 0.76, 0.75], gd = [1.0, 0.88, 0.72];
          let a: number[], b2: number[], kk: number;
          if (lit < 0.5) (a = sh), (b2 = fr), (kk = Math.pow(lit * 2, 1.4));
          else (a = fr), (b2 = gd), (kk = (lit - 0.5) * 2);
          cr = mix(a[0], b2[0], kk), cg = mix(a[1], b2[1], kk), cb = mix(a[2], b2[2], kk);
          if (rec > 0) {
            const d = 1 - rec * 0.78;
            cr *= d * 0.95, cg *= d * 0.92, cb *= d;
          }
          // a little grain in the stone, and the morning haze over the lower storeys
          const g = 0.94 + 0.08 * hash(x * 3 + 1, r * 5 + 2);
          cr *= g, cg *= g, cb *= g;
          const low = smooth(40, BASE, y) * 0.2;
          const sky = skyAt(xc, y);
          cr = mix(cr, sky[0], low), cg = mix(cg, sky[1], low), cb = mix(cb, sky[2], low);
          fl = 0.12;
          hz = 0.55;
        }
      }
      mat[k] = m;
      R[k] = cr as number, G[k] = cg as number, B[k] = cb as number;
      floorA[k] = fl;
      hazeW[k] = hz;
    }
  }

  // cypresses, far to near: dark, with a warm rim on the side toward the sun
  for (const tr of trees) {
    const top = tr.base - tr.h;
    const sunSide = tr.x < CX ? 0.9 : 0.6;
    for (let r = Math.max(0, Math.floor(top)); r < Math.min(H, Math.ceil(tr.base + 0.6)); r++) {
      const y = r + 0.5;
      const u = (tr.base - y) / tr.h; // 0 at the foot, 1 at the tip
      if (u > 1) continue;
      let p = u < 0.06 ? 0.18 : u < 0.3 ? 0.8 + 0.2 * (u / 0.3) : Math.pow((1 - u) / 0.7, 0.8);
      for (let x = Math.max(0, Math.floor(tr.x - tr.w - 2)); x < Math.min(W, Math.ceil(tr.x + tr.w + 2)); x++) {
        const xc = x + 0.5;
        const n = noise(xc * 0.9, y * 0.55 + tr.s, 0);
        const hw = tr.w * p * (0.88 + 0.26 * n) + 0.35;
        const dx = (xc - tr.x) / hw;
        if (Math.abs(dx) > 1) continue;
        const k = r * W + x;
        const leaf = fbm(xc * 0.6, y * 0.35 + tr.s * 3, 2, 0);
        const rim = smooth(-0.2, -0.9, dx) * (0.4 + 0.6 * leaf) * (0.5 + 0.5 * Math.exp(-Math.abs(tr.x - SUN[0]) / 80));
        // clumps of foliage, each a little lit on top
        const clump = smooth(0.45, 0.7, fbm(xc * 0.45, y * 0.3 + tr.s * 3, 3, 0));
        const base = 0.5 + 0.5 * leaf + 0.5 * clump;
        const dist = smooth(30, 8, tr.s); // far trees take more haze
        let cr = 0.045 * base + sunSide * rim, cg = 0.1 * base + sunSide * 0.63 * rim, cb = 0.08 * base + sunSide * 0.27 * rim;
        const sky = [0.7, 0.5, 0.56];
        cr = mix(cr, sky[0], dist * 0.45), cg = mix(cg, sky[1], dist * 0.45), cb = mix(cb, sky[2], dist * 0.45);
        mat[k] = CYPRESS;
        R[k] = cr, G[k] = cg, B[k] = cb;
        floorA[k] = 0.05;
        hazeW[k] = (0.3 + 0.4 * dist) * smooth(tr.base - tr.h * 0.7, tr.base, y);
      }
    }
  }

  // The reflection source: everything above the garden, trees included.
  const RR = R.slice(), RG = G.slice(), RB = B.slice();

  // drifting haze, two layers in a strip that wraps
  const HWd = 400;
  const haze1 = new Float32Array(HWd * H), haze2 = new Float32Array(HWd * H);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < HWd; x++) {
      haze1[r * HWd + x] = smooth(0.4, 0.75, fbm(x * 0.018, r * 0.09, 4, HWd * 0.018));
      haze2[r * HWd + x] = smooth(0.42, 0.8, fbm(x * 0.04 + 7, r * 0.16 + 3, 3, HWd * 0.04));
    }
  }
  // haze is thickest just above the garden
  const hazeRow = new Float32Array(H);
  for (let r = 0; r < H; r++) hazeRow[r] = 0.03 + 0.42 * Math.exp(-Math.abs(r + 0.5 - 63) / 6);

  const birds: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) birds.push([58 + i * 8 + hash(i, 40) * 4, 30 - i * 2.5 + hash(i, 41) * 2, hash(i, 42) * 6.28]);
  // ordered dither, nudged per cell so its grid does not show in flat light
  const dith = new Float32Array(N), jit = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.85;
    jit[k] = hash(k, 77) - 0.5;
  }
  // a gentle shoulder so the brightest light keeps its gradient
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  return (t, { color } = {}) => {
    const d1 = t * 1.1, d2 = t * 2.3;
    const cd = t * 0.5;
    const breathe = 0.035 * Math.sin((t / 6) * Math.PI * 2);
    // where the birds are this frame
    const bx: number[] = [], by: number[] = [], bu: boolean[] = [];
    for (const [x0, y0, ph] of birds) {
      bx.push((((x0 + t * 3.2) % 260) + 260) % 260 - 30);
      by.push(y0 + Math.sin(t * 0.4 + ph) * 1.3);
      bu.push(Math.sin(t * 7 + ph) > 0);
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      const hr = hazeRow[r];
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr: number, cg: number, cb: number, fl = floorA[k], fade = 1;

        if (m === POOL) {
          // the mirror: the scene above, flipped about the far end, shortened
          // and shaken
          const depth = (y - BASE) / (H - BASE);
          const wob = Math.sin(y * 1.9 - t * 2.4 + Math.sin(x * 0.11 + t * 0.7) * 1.5) * (0.2 + 0.7 * depth);
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          let sr = Math.round(BASE - 0.5 - (y - BASE) * KR - (Math.sin(x * 0.3 + t * 1.3 + y) > 0.6 ? 1 : 0));
          sr = sr < 0 ? 0 : sr > BASE - 1 ? BASE - 1 : sr;
          const j = sr * W + sx;
          // stone reflects brighter than the sky does, so the Taj holds its shape
          const src = mat[j] === MARBLE ? 1.0 : 0.85;
          const dim = src - 0.1 * depth;
          cr = RR[j] * dim * 0.9, cg = RG[j] * dim * 0.94, cb = RB[j] * dim + 0.05;
          // ripples catching the sky
          const w = noise(x * 0.12 + t * 0.15, y * 0.9 - t * 0.9, 0);
          const glint = smooth(0.75, 0.95, w) * 0.14;
          cr += glint, cg += glint * 0.85, cb += glint * 0.75;
          // a sparse line of light drifting across the far end
          if (r > BASE && r <= BASE + 4) {
            const gl = smooth(0.62, 0.85, noise(x * 0.55 - t * 0.9, r * 2.7 + t * 0.2, 0)) * (0.5 - 0.08 * (r - BASE));
            cr += gl, cg += gl * 0.85, cb += gl * 0.6;
          }
          // a thin line of light where the far edge meets the plinth
          if (r === BASE) cr += 0.2, cg += 0.16, cb += 0.12;
          fade = 0.8 + 0.2 * smooth(H + 2, H - 6, y);
        } else {
          cr = R[k], cg = G[k], cb = B[k];
          if (m === SKY) {
            const ga = glowA[k] * breathe;
            cr += ga, cg += ga * 0.78, cb += ga * 0.48;
          }
          if (m === SKY && y < CH) {
            // drifting dawn cloud: gold and rose underneath near the sun,
            // violet-grey elsewhere
            const sx = x + cd, ix = Math.floor(sx), fx = sx - ix;
            const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
            const c = cloud[i0] + (cloud[i1] - cloud[i0]) * fx;
            if (c > 0.01) {
              const l = cloudLit[i0] + (cloudLit[i1] - cloudLit[i0]) * fx;
              const near = Math.min(1, glowA[k] * 1.7);
              // a mauve body, rose underneath, gold where the sun is close
              const b2 = clamp(0.2 + 0.6 * l + near * 0.55 * l);
              let kr: number, kg: number, kb: number;
              if (b2 < 0.5) {
                const q = b2 * 2;
                (kr = mix(0.16, 0.6, q)), (kg = mix(0.12, 0.34, q)), (kb = mix(0.3, 0.5, q));
              } else {
                const q = (b2 - 0.5) * 2;
                (kr = mix(0.6, 1.05, q)), (kg = mix(0.34, 0.8, q)), (kb = mix(0.5, 0.55, q));
              }
              const a = Math.min(1, c) * 0.9;
              cr = mix(cr, kr, a), cg = mix(cg, kg, a), cb = mix(cb, kb, a);
            }
          }
          if (m === SKY && r < 24 && x > 96 && hash(x, r * 3 + 11) > 0.988) {
            // the last few stars, fading where the dawn reaches
            const tw = 0.7 + 0.3 * Math.sin(t * (1.2 + hash(x, r) * 2) + hash(r, x) * 6.28);
            const s = tw * 0.62 * smooth(24, 8, r) * smooth(96, 140, x);
            cr = Math.max(cr, s * 0.85), cg = Math.max(cg, s * 0.85), cb = Math.max(cb, s);
          }
          if (m === SKY) {
            // the sun's disc, softened by the haze
            const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
            const dd = dx * dx + dy * dy;
            if (dd < 22) {
              const a = smooth(22, 9, dd);
              cr = mix(cr, 1.05, a), cg = mix(cg, 0.98, a), cb = mix(cb, 0.86, a);
            }
            // birds, dark against the light
            for (let i = 0; i < bx.length; i++) {
              const ox = Math.round(bx[i]) - x, oy = Math.round(by[i]) - r;
              if (ox < -2 || ox > 2) continue;
              const ax = ox < 0 ? -ox : ox;
              const hit = bu[i] ? (ax === 0 && oy === 0) || (ax === 1 && oy === 1) || (ax === 2 && oy === 1) : (ax === 0 && oy === 0) || (ax === 1 && oy === 0) || (ax === 2 && oy === -1);
              if (hit) (cr = 0.16), (cg = 0.1), (cb = 0.17), (fl = 0);
            }
          }
        }

        // the morning haze, drifting
        const hw = hazeW[k];
        if (hw > 0 || m === POOL) {
          const a = (m === POOL ? 0.12 : hw) * hr;
          const sx1 = (x + d1) % HWd, sx2 = (x + d2) % HWd;
          const i1 = r * HWd + (sx1 | 0), i2 = r * HWd + (sx2 | 0);
          const hz = a * (0.35 + 0.75 * haze1[i1] + 0.45 * haze2[i2]);
          cr = mix(cr, 0.9, hz), cg = mix(cg, 0.64, hz), cb = mix(cb, 0.62, hz);
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.02) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k] + jit[k] * (level < 0.3 ? 0.12 : 0.3))));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          let s = (0.3 + 0.7 * want) / peak;
          if (m === SKY && s > 1.6) s = 1.6;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
