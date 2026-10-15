/*
 * kite festival: Makar Sankranti over Jaipur at golden hour. Hundreds of paper
 * patangs crowd the sky at every depth, swaying on their strings, while a few
 * cut kites tumble down; below, the pink city's flat roofs stack away to the
 * ridge where Nahargarh fort sits in the haze, people fly kites from every
 * terrace, and birds wheel through the dust under a low sun.
 *
 * The sky, the hills and the town are shaded once into a colour buffer that
 * keeps a depth for every cell. Each frame copies it, paints the kites, their
 * strings and the birds far to near wherever they sit in front, then draws the
 * halftone: every cell is a dot whose size is its brightness, ordered-dithered,
 * in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "kite festival",
  category: "scenes",
  note: "sankranti kites crowding a golden sky over the pink roofs of jaipur",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#1a0f17",
  // Dot size carries the dark; every colour here is a hue at full strength.
  palette: [
    "#6a5af0", "#8a78d0", "#c08cc8", "#f0a0c0", "#ffab7a", "#ffc25e", "#ffdc8c", "#fff6dc",
    "#9c7ae0", "#7a62c4", "#b89ae8",
    "#ff5f58", "#ff8478", "#ffaa9c", "#ffd6c4",
    "#ff2f7d", "#ff8fc4", "#ffd400", "#22c55e", "#a3e635", "#e8102a", "#1f6fff", "#5ec8ff",
    "#8b3dff", "#ffffff", "#ff7a00",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 62; // where the farthest roofs meet the hills
const SUN = [56, 50];
const SUN_R = 6.5;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// Depths, far to near: the higher, the nearer. Kites carry a depth on the same scale.
const SKY = -1, BACK = -0.6, HILL = -0.3;

type RGB = [number, number, number];

// kite papers, as bright as tissue gets
const PAPER: RGB[] = [
  [1, 0.17, 0.5], // rani pink
  [1, 0.55, 0.78], // light pink
  [1, 0.84, 0.02], // haldi yellow
  [0.12, 0.78, 0.38], // parrot green
  [0.62, 0.9, 0.2], // lime
  [0.92, 0.06, 0.16], // red
  [0.12, 0.43, 1], // blue
  [0.36, 0.78, 1], // sky blue
  [0.56, 0.25, 1], // purple
  [1, 1, 1], // white
  [1, 0.5, 0.02], // marigold
];
// what people wear on the roofs
const CLOTH: RGB[] = [[1, 1, 0.95], [1, 0.82, 0.1], [0.95, 0.12, 0.2], [1, 0.3, 0.6], [0.2, 0.5, 1], [1, 0.55, 0.1], [0.2, 0.75, 0.4]];
// plaster: pink, terracotta, ochre, whitewash
const PLASTER: RGB[] = [[0.96, 0.57, 0.49], [0.87, 0.45, 0.37], [0.95, 0.66, 0.43], [0.97, 0.85, 0.75]];

const LAYERS = [
  { base: 66, hmin: 1, hmax: 4, wmin: 3, wmax: 7, haze: 0.58, d: 0.1, chh: 0.14, fig: 0, size: 0 },
  { base: 72, hmin: 2, hmax: 6, wmin: 5, wmax: 10, haze: 0.42, d: 0.3, chh: 0.25, fig: 0, size: 1 },
  { base: 79, hmin: 2, hmax: 7, wmin: 7, wmax: 14, haze: 0.27, d: 0.5, chh: 0.32, fig: 0.12, size: 2 },
  { base: 89, hmin: 3, hmax: 10, wmin: 10, wmax: 19, haze: 0.13, d: 0.7, chh: 0.35, fig: 0.22, size: 3 },
  { base: 101, hmin: 6, hmax: 13, wmin: 16, wmax: 30, haze: 0.04, d: 0.9, chh: 0.3, fig: 0.4, size: 4 },
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

// The sky: dusty violet overhead, through rose and apricot, to gold at the
// horizon, all of it lit by the low sun and the long band of glow beside it.
const STOPS: [number, RGB][] = [
  [0, [0.1, 0.085, 0.25]],
  [0.3, [0.22, 0.18, 0.42]],
  [0.55, [0.6, 0.38, 0.5]],
  [0.75, [0.97, 0.62, 0.4]],
  [0.9, [1, 0.76, 0.38]],
  [1, [1, 0.86, 0.52]],
];
function skyAt(x: number, y: number): RGB {
  const v = clamp(y / HZ);
  let i = 0;
  while (i < STOPS.length - 2 && v > STOPS[i + 1][0]) i++;
  const [v0, a] = STOPS[i], [v1, b] = STOPS[i + 1];
  const k = (v - v0) / (v1 - v0);
  const dx = x - SUN[0], dy = y - SUN[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  const glow = 0.3 * Math.exp(-d / 7) + 0.22 * Math.exp(-d / 24) + 0.12 * Math.exp(-Math.abs(dy) / 7 - Math.abs(dx) / 90);
  return [mix(a[0], b[0], k) + glow, mix(a[1], b[1], k) + glow * 0.82, mix(a[2], b[2], k) + glow * 0.48];
}
// the dust that lies over the town, a dimmer gold than the sky above it
function hazeAt(x: number): RGB {
  const c = skyAt(x, HZ - 4);
  return [c[0] * 0.8, c[1] * 0.72, c[2] * 0.72];
}

// A kite in the sky. Position is its anchor; it sways round it.
type Kite = {
  x: number; y: number; z: number; h: number; w: number;
  A: RGB; B: RGB; design: number; tilt: number;
  amp: number; w1: number; w2: number; p1: number; p2: number; dive: number;
  cut: number; period: number; drop: number; // a cut kite falls, `cut` > 0
  hand: number[] | null; // the flier's hand, when the string runs to someone we can see
  tail: number; // a loose string running off-picture, its length
};

export default function kiteFestival(): Frame {
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
  const bgR = new Float32Array(N), bgG = new Float32Array(N), bgB = new Float32Array(N);
  const skR = new Float32Array(N), skG = new Float32Array(N), skB = new Float32Array(N);
  const dep = new Float32Array(N).fill(SKY);
  const flo = new Float32Array(N).fill(0.02);
  const put = (x: number, r: number, c: RGB, d: number, f = 0.14) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    (bgR[k] = c[0]), (bgG[k] = c[1]), (bgB[k] = c[2]), (dep[k] = d), (flo[k] = f);
  };

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const [sr, sg, sb] = skyAt(x + 0.5, y);
      (skR[k] = sr), (skG[k] = sg), (skB[k] = sb);
      let cr = sr, cg = sg, cb = sb;
      const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
      const ds = Math.sqrt(dx * dx + dy * dy);
      if (ds < SUN_R + 0.6) {
        // the sun, paler at the top, redder where it sinks into the dust
        const a = smooth(SUN_R + 0.6, SUN_R - 0.6, ds);
        const low = smooth(-SUN_R, SUN_R, dy);
        const streak = 1;
        cr = mix(cr, 1.2 * streak, a);
        cg = mix(cg, (1.15 - 0.2 * low) * streak, a);
        cb = mix(cb, (1.0 - 0.35 * low) * streak, a);
      }
      (bgR[k] = cr), (bgG[k] = cg), (bgB[k] = cb);
    }
  }

  // --- the hills, and Nahargarh along the ridge ------------------------------
  const ridgeS = (x: number) =>
    59.5 - 12 * Math.exp(-(((x - 156) / 36) ** 2)) - 5 * Math.exp(-(((x - 102) / 20) ** 2)) - 3 * Math.exp(-(((x - 14) / 16) ** 2));
  const ridge = (x: number) => ridgeS(x) - 1.8 * fbm(x * 0.09, 2.1, 3, 0) + 0.9;
  const back = (x: number) => 55.5 - 3 * fbm(x * 0.03, 7.3, 3, 0) - 4 * Math.exp(-(((x - 60) / 30) ** 2));
  for (let x = 0; x < W; x++) {
    const rt = ridge(x + 0.5), bt = back(x + 0.5);
    const slope = ridge(x + 1.5) - ridge(x - 0.5); // down to the right faces away from the sun
    for (let r = Math.floor(Math.min(rt, bt)); r < H; r++) {
      const y = r + 0.5;
      const k = r * W + x;
      if (y >= rt) {
        // hazy violet scrub, the slopes toward the sun a little lighter
        const s = clamp(0.5 - slope * 0.5 + 0.4 * (fbm(x * 0.3, y * 0.3, 3, 0) - 0.5));
        const hz = 0.04 + 0.12 * smooth(rt + 2, rt + 14, y); // the valley floor fills with dust
        const c: RGB = [0.11 + 0.06 * s, 0.08 + 0.04 * s, 0.2 + 0.06 * s];
        put(x, r, [mix(c[0], 0.62, hz), mix(c[1], 0.44, hz), mix(c[2], 0.66, hz)], HILL, 0);
      } else if (y >= bt) {
        put(x, r, [mix(0.3, skR[k], 0.12), mix(0.24, skG[k], 0.12), mix(0.46, skB[k], 0.12)], BACK, 0.02);
      }
    }
  }

  // The fort, a darker silhouette than the hill: a crenellated wall along the
  // crest, round bastions with little domes, and the palace block in the middle.
  const fortCol = (lit: number): RGB => [0.08 + 0.9 * lit, 0.06 + 0.5 * lit, 0.16 + 0.22 * lit];
  for (let x = 112; x < 197; x++) {
    const base = ridgeS(x + 0.5) + 1;
    const wt = base - 3;
    for (let r = Math.floor(wt) - 1; r < base + 2; r++) {
      const y = r + 0.5;
      if (y < wt && x % 2 === 1) continue; // the merlons along the top
      if (y < wt - 1) continue;
      put(x, r, fortCol(y < wt + 0.5 ? 0.6 : 0), HILL + 0.02, 0.04);
    }
  }
  for (const bx of [114, 127, 139, 171, 184, 195]) {
    const base = ridgeS(bx) + 1;
    for (let r = Math.floor(base - 9); r < base + 2; r++) {
      for (let x = bx - 3; x <= bx + 3; x++) {
        const y = r + 0.5, dx = x + 0.5 - bx;
        const top = base - 6;
        const tower = Math.abs(dx) <= 2.4 && y >= top;
        const dome = (dx / 2) ** 2 + ((y - top) / 2.2) ** 2 <= 1 && y < top;
        if (tower || dome) put(x, r, fortCol(dx < -1.2 ? 0.6 : 0), HILL + 0.03, 0.04);
      }
    }
  }
  {
    const top = ridgeS(153) - 8;
    for (let r = Math.floor(top) - 4; r < ridgeS(153) + 2; r++) {
      for (let x = 142; x < 165; x++) {
        const y = r + 0.5;
        let on = y >= top;
        let lit = x < 144 ? 0.6 : y < top + 1 ? 0.5 : 0;
        if (on && (x - 142) % 3 === 1 && (r - Math.floor(top)) % 3 === 1 && y > top + 1) lit = 0.3; // windows with the sky through them
        for (const cx of [145, 153.5, 162]) {
          const dx = x + 0.5 - cx, dy = y - top;
          if ((dx / 1.7) ** 2 + (dy / 2.2) ** 2 <= 1 && dy < 0) (on = true), (lit = dx < -0.5 ? 0.6 : 0);
          if (Math.abs(dx) < 0.5 && dy < -2.2 && dy > -3.2) (on = true), (lit = 0.3);
        }
        if (on) put(x, r, fortCol(lit), HILL + 0.04, 0.04);
      }
    }
  }

  // --- the old city: rows of flat roofs, far to near --------------------------
  const hands: { x: number; y: number; d: number }[] = [];
  const drawFigure = (fx: number, top: number, size: number, s: number, d: number) => {
    const cloth = CLOTH[Math.floor(hash(s, 31) * CLOTH.length)];
    const skin: RGB = [0.32, 0.18, 0.16];
    const legs: RGB = hash(s, 32) < 0.5 ? [0.92, 0.9, 0.86] : [0.3, 0.18, 0.24];
    const cells: [number, number, RGB][] = [];
    let hand: [number, number];
    if (size === 2) {
      cells.push([0, -3, skin], [0, -2, cloth], [0, -1, legs], [-1, -3, cloth]);
      hand = [-1, -4];
    } else if (size === 3) {
      cells.push([0, -5, skin], [0, -4, cloth], [0, -3, cloth], [1, -4, cloth], [0, -2, legs], [0, -1, legs], [-1, -5, cloth], [-2, -6, skin]);
      hand = [-2, -6.5];
    } else {
      cells.push([0, -8, skin], [1, -8, skin], [0, -7, skin], [1, -7, skin]);
      for (let yy = -6; yy <= -3; yy++) cells.push([0, yy, cloth], [1, yy, cloth]);
      cells.push([2, -5, cloth], [2, -4, cloth]);
      cells.push([0, -2, legs], [0, -1, legs], [1, -2, legs], [1, -1, legs]);
      cells.push([-1, -6, cloth], [-2, -7, cloth], [-3, -8, skin]);
      hand = [-3, -8.5];
    }
    for (const [ox, oy, c] of cells) put(fx + ox, top + oy, c, d + 0.01, 0.1);
    hands.push({ x: fx + hand[0] + 0.5, y: top + hand[1], d: d + 0.01 });
  };

  // a wall colour, lit by `light`, sunk into the dust by `haze`
  const wall = (x: number, r: number, c: RGB, light: number, haze: number, d: number) => {
    const hz = hazeAt(x + 0.5);
    put(x, r, [mix(c[0] * light, hz[0], haze), mix(c[1] * light, hz[1], haze), mix(c[2] * light, hz[2], haze)], d, 0.04);
  };

  // Hawa Mahal: the honeycomb of little windows stepping up to a crown, pink
  // with white trim, standing over the roofs in the middle distance.
  const hawaMahal = (cx: number, base: number, d: number) => {
    const spans = [17, 17, 15, 11, 6]; // half-widths, storey by storey
    const pink: RGB = [0.95, 0.5, 0.42], trim: RGB = [1, 0.86, 0.74];
    for (let tier = 0; tier < spans.length; tier++) {
      const tTop = base - 4 * (tier + 1);
      const hw = spans[tier], up = spans[tier + 1] ?? -1;
      for (let x = cx - hw; x < cx + hw; x++) {
        const lx = x - (cx - hw);
        for (let tr = 0; tr < 4; tr++) {
          const r = tTop + tr;
          if (tr === 0) wall(x, r, trim, 1, 0.1, d); // the cornice
          else if (tr === 3) wall(x, r, pink, 0.26, 0.1, d); // shadow under the jharokhas
          else if (lx % 2 === 1) wall(x, r, trim, tr === 1 ? 1 : 0.8, 0.1, d);
          else wall(x, r, pink, 0.3, 0.1, d);
        }
        // little domes along each ledge the storey above leaves open
        if (Math.abs(x + 0.5 - cx) > up && lx % 3 === 1) wall(x, tTop - 1, trim, 0.9, 0.1, d);
      }
    }
    // the crown: a pointed gable and its finial
    const ct = base - 4 * spans.length;
    for (let r = ct - 4; r < ct; r++)
      for (let x = cx - 4; x < cx + 4; x++)
        if (Math.abs(x + 0.5 - cx) <= (r - (ct - 4)) * 1.2 + 0.6) wall(x, r, r === ct - 1 ? trim : pink, r === ct - 1 ? 1 : 0.7, 0.1, d);
    wall(cx, ct - 5, trim, 0.9, 0.1, d);
  };

  for (let li = 0; li < LAYERS.length; li++) {
    const L = LAYERS[li];
    if (li === 4) hawaMahal(108, 93, 0.8);
    const rp = [1, 1, 2, 2, 3][li]; // how much roof we see from up here
    let x0 = -2 - Math.floor(hash(li, 99) * 6);
    for (let bi = 0; x0 < W + 2; bi++) {
      const s = li * 1000 + bi;
      const w = Math.round(L.wmin + hash(s, 1) * (L.wmax - L.wmin));
      const h = Math.round(L.hmin + hash(s, 2) * (L.hmax - L.hmin));
      const top = L.base - h;
      const pick = hash(s, 3);
      const pc = PLASTER[pick < 0.6 ? 0 : pick < 0.85 ? 1 : pick < 0.95 ? 2 : 3];
      const tone = 0.92 + 0.12 * hash(s, 5);
      const roof: RGB = [mix(pc[0], 1, 0.3) * tone, mix(pc[1], 0.84, 0.3) * tone, mix(pc[2], 0.72, 0.3) * tone];
      const face: RGB = [pc[0] * tone, pc[1] * tone, pc[2] * tone];
      const kangura = li >= 1 && hash(s, 4) < 0.65;
      const px = li <= 2 ? 3 : 4, py = li <= 2 ? 4 : 5, ww = li === 4 ? 2 : 1, wh = li >= 3 ? 3 : 2;
      for (let r = Math.max(0, top - (kangura ? (li === 4 ? 2 : 1) : 0)); r < H; r++) {
        for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
          const lx = x - x0, ly = r - top, fy = ly - rp; // fy: rows down the facade
          // We look toward the sun, so the walls facing us are in shade; the
          // roofs, the parapets and the edges take the light.
          let light = 0.72, c = face;
          if (lx >= w - 1 && li >= 1 && ly >= 0) {
            // the gap to the next house, in deep shade
            wall(x, r, face, 0.12, L.haze * 0.5, L.d);
            continue;
          }
          if (ly < 0) {
            // the scalloped parapet along the back, kanguras catching the sun
            if (li === 4 ? lx % 4 >= 2 : li === 3 ? lx % 3 === 2 : lx % 2 === 1) continue;
            light = 1.1;
          } else if (fy < 0) (c = roof), (light = (ly === 0 ? 1.05 : 0.85) - 0.05 * li); // the terrace
          else if (fy < 1) light = li < 2 ? 0.8 : 1.25; // the front parapet's coping
          else if (fy < 2) light *= 0.5;
          else {
            if (lx < 1 && li >= 2) light *= 1.3;
            else if (lx >= w - 2) light *= 0.6;
            light *= 1 - 0.8 * smooth(2, 9, fy); // down into the shaded lane
            if (li >= 3 && lx >= 1 && lx < w - 1 && fy >= 3 && (lx - 1) % px < ww && (fy - 3) % py < wh &&
              hash(s * 7 + Math.floor((lx - 1) / px), Math.floor((fy - 3) / py)) > 0.5)
              light *= 0.35;
          }
          wall(x, r, c, light + (fy < 1 ? 0.25 * Math.exp(-Math.abs(x - SUN[0]) / 45) : 0), L.haze, L.d);
          if (fy >= 2) flo[r * W + x] = 0;
        }
      }
      // on the roof: a stair room, a black water tank
      if (li >= 2 && w >= 7 && hash(s, 12) < 0.4) {
        const mw = li + 1, mh = li, mx = x0 + 1 + Math.floor(hash(s, 14) * (w - mw - 2));
        for (let r = top - mh; r < top; r++)
          for (let x = mx; x < mx + mw; x++)
            wall(x, r, roof, r === top - mh ? 1.1 : x === mx ? 0.6 : 0.42, L.haze, L.d);
      }
      if (li >= 2 && w >= 6 && hash(s, 13) < 0.45) {
        const tw = li === 4 ? 3 : 2, th = li - 1, tx = x0 + w - tw - 1 - Math.floor(hash(s, 15) * 3);
        for (let r = top - th; r < top; r++) for (let x = tx; x < tx + tw; x++) put(x, r, [0.1, 0.08, 0.12], L.d, 0.02);
      }
      // a chhatri on the roof: a little domed pavilion on pillars
      if (li >= 1 && w >= 5 && hash(s, 6) < L.chh) {
        const cw = [0, 3, 4, 6, 8][li];
        const cx = x0 + w * (0.25 + 0.5 * hash(s, 7));
        const ch = Math.max(1, Math.round(cw * 0.75));
        const rr = cw / 2 + 0.3;
        const slab = top - ch - 1;
        for (let r = Math.floor(slab - rr * 1.1 - 2); r < top; r++) {
          for (let x = Math.floor(cx - rr - 1); x <= cx + rr + 1; x++) {
            const y = r + 0.5, dx = x + 0.5 - cx;
            let light = -1;
            if (y >= top - ch && Math.abs(dx) <= cw / 2) light = Math.abs(dx) > cw / 2 - 1 || cw < 3 ? 0.75 : 0.12;
            else if (y >= slab && y < top - ch && Math.abs(dx) <= cw / 2 + 0.7) light = 1.15;
            else if (y < slab && (dx / rr) ** 2 + ((y - slab) / (rr * 0.95)) ** 2 <= 1) light = 0.6 + 0.5 * clamp(-dx / rr + 0.3);
            else if (y < slab && Math.abs(dx) < 0.5 && y > slab - rr * 0.95 - 1.1) light = 0.9;
            if (light < 0 || x < 0 || x >= W || r < 0) continue;
            const hz = hazeAt(x + 0.5);
            const c: RGB = [1 * light, 0.84 * light, 0.72 * light]; // whitewashed, as most of them are
            put(x, r, [mix(c[0], hz[0], L.haze), mix(c[1], hz[1], L.haze), mix(c[2], hz[2], L.haze)], L.d, 0.04);
          }
        }
      }
      // people on the roof, flying
      if (L.size >= 2 && w >= 5) {
        const n = li === 4 && w > 20 ? 2 : 1;
        for (let j = 0; j < n; j++) {
          if (hash(s, 40 + j) > L.fig) continue;
          const fx = Math.round(x0 + 2 + (j + hash(s, 42 + j)) / n * (w - 4));
          if (fx < 3 || fx > W - 3) continue;
          drawFigure(fx, top + rp, L.size, s * 3 + j, L.d);
        }
      }
      x0 += w;
    }
  }

  // --- the kites ---------------------------------------------------------------
  const kites: Kite[] = [];
  const makeKite = (seed: number, x: number, y: number, z: number): Kite => {
    const a = Math.floor(hash(seed, 1) * PAPER.length);
    let b = Math.floor(hash(seed, 2) * PAPER.length);
    if (b === a) b = (b + 3) % PAPER.length;
    const h = 1.8 + 6.4 * Math.pow(z, 1.5);
    return {
      x, y, z, h, w: h * (0.8 + 0.08 * hash(seed, 3)),
      A: PAPER[a], B: PAPER[b], design: Math.floor(hash(seed, 4) * 6),
      tilt: -0.12 + 0.24 * hash(seed, 5),
      amp: 0.4 + 1.6 * z, w1: 0.5 + 0.7 * hash(seed, 6), w2: 0.7 + 0.9 * hash(seed, 7),
      p1: hash(seed, 8) * 6.28, p2: hash(seed, 9) * 6.28,
      dive: hash(seed, 10) < 0.12 ? 1 : 0,
      cut: 0, period: 0, drop: 0, hand: null, tail: z > 0.55 && hash(seed, 11) < 0.6 ? 14 + 26 * z : 0,
    };
  };
  // Each kite keeps clear sky round it, so every one reads as a diamond.
  const room = (x: number, y: number, z: number) => {
    const h = 1.8 + 6.4 * Math.pow(z, 1.5);
    if (Math.hypot(x - SUN[0], y - SUN[1]) < SUN_R + h + 3) return false; // leave the sun clear
    if (y > ridgeS(x) - h - 2 || y < h - 2) return false; // and the fort's skyline
    for (const K of kites) if (Math.hypot(K.x - x, (K.y - y) * 0.8) < (K.h + h) * 1.05 + 4) return false;
    return true;
  };
  // a few big ones close by, so the sky has a foreground
  const HERO: [number, number, number, number, number, number][] = [
    [30, 15, 1.08, 0, 2, 2], [152, 12, 0.98, 3, 9, 1], [96, 28, 0.8, 5, 2, 0], [182, 40, 0.86, 6, 9, 5], [74, 8, 0.72, 2, 8, 3], [124, 34, 0.62, 1, 4, 1],
  ];
  HERO.forEach(([x, y, z, a, b, design], i) => {
    const k = makeKite(900 + i, x, y, z);
    (k.A = PAPER[a]), (k.B = PAPER[b]), (k.design = design), (k.dive = i === 2 ? 1 : 0);
    kites.push(k);
  });
  // the kites people below are flying: up and to the left of them, downwind
  hands.forEach((hd, i) => {
    const z = 0.2 + 0.55 * hd.d + (hash(i, 51) - 0.5) * 0.2;
    const alt = 14 + hash(i, 52) * 46;
    const x = hd.x - (6 + hash(i, 53) * 34) * (0.5 + z);
    const y = Math.min(hd.y - 10, HZ - 2 - alt * (0.3 + 0.75 * z));
    if (!room(x, y, z)) return;
    const k = makeKite(500 + i, x, y, z);
    k.hand = [hd.x, hd.y, hd.d];
    kites.push(k);
  });
  // and the crowd, more of them small and far, till the sky holds about seventy
  for (let i = 0; i < 2000 && kites.length < 66; i++) {
    const z = 0.04 + 0.7 * Math.pow(hash(i, 61), 1.6);
    const alt = 6 + hash(i, 62) * 72;
    const y = HZ - 3 - alt * (0.3 + 0.8 * z);
    const x = 2 + hash(i, 63) * 196;
    if (room(x, y, z)) kites.push(makeKite(i, x, y, z));
  }
  // cut loose, tumbling down
  for (let i = 0; i < 6; i++) {
    const k = makeKite(1200 + i, 15 + i * 33 + hash(i, 71) * 14, 0, 0.45 + 0.35 * hash(i, 72));
    (k.cut = 1.2 + hash(i, 73) * 1.6), (k.period = 13 + hash(i, 74) * 7), (k.drop = hash(i, 75)), (k.tail = 14);
    kites.push(k);
  }
  kites.sort((a, b) => a.z - b.z);

  // Each kite lit once: tissue glows where the sun is behind it.
  const lit = kites.map((K) => {
    const d = Math.hypot(K.x - SUN[0], K.y - SUN[1]);
    const g = Math.exp(-d / 22);
    const f = (c: RGB): RGB => [c[0] * (0.8 + 0.3 * g) + 0.3 * g, c[1] * (0.8 + 0.3 * g) + 0.24 * g, c[2] * (0.8 + 0.3 * g) + 0.1 * g];
    return [f(K.A), f(K.B)];
  });

  // birds: pigeons crossing low through the gold in a loose flock, and three
  // black kites, the birds, wheeling over the fort
  const BIRDS = Array.from({ length: 12 }, (_, i) => ({
    x: i * 5 + hash(i, 81) * 6, y: 33 + hash(i, 82) * 9 + (i % 3) * 2, p: hash(i, 84) * 6.28,
    circle: i >= 9, r: 8 + hash(i, 85) * 9,
  }));

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N), F = new Float32Array(N);

  const blend = (k: number, c0: number, c1: number, c2: number, a: number) => {
    R[k] += (c0 - R[k]) * a;
    G[k] += (c1 - G[k]) * a;
    B[k] += (c2 - B[k]) * a;
  };

  // A string: from the hand, sagging, up to the kite, glinting where the sun is behind it.
  const string = (x0: number, y0: number, d0: number, x1: number, y1: number, d1: number, fadeOut: boolean, z: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(len * 1.4);
    const sag = 0.07 * len;
    let last = -1;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const x = mix(x0, x1, s), y = mix(y0, y1, s) + sag * 4 * s * (1 - s);
      const ix = Math.floor(x), iy = Math.floor(y);
      if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
      const k = iy * W + ix;
      if (k === last) continue;
      last = k;
      if (dep[k] >= mix(d0, d1, s)) continue;
      // the thread shades whatever is behind it: a line of smaller dots
      // a hand's string shows near the hand and near the kite and is lost in
      // the haze between; a loose one fades as it runs away
      const seen = fadeOut ? 1 - s : Math.max(smooth(0.15, 0.03, s), smooth(0.5, 0.8, s));
      const a = (0.3 + 0.3 * z) * seen;
      if (a < 0.05) continue;
      R[k] *= 1 - a, G[k] *= 1 - a, B[k] *= 1 - a;
      F[k] = Math.min(F[k], 0.04);
    }
  };

  const drawKite = (K: Kite, cols: RGB[], cx: number, cy: number, ang: number, fl: number, t: number) => {
    const h = K.h, w = K.w;
    const hz = Math.pow(1 - Math.min(1, K.z), 1.4) * 0.25;
    const [A, Bc] = cols;
    if (h < 1.7) {
      // too far to have a shape: one fleck of colour, its tail a fainter one under it
      const ix = Math.floor(cx), iy = Math.floor(cy);
      if (ix < 0 || ix >= W || iy < 0 || iy >= H - 1) return;
      const k = iy * W + ix;
      if (dep[k] < K.z) {
        blend(k, mix(A[0], skR[k], hz), mix(A[1], skG[k], hz), mix(A[2], skB[k], hz), 1);
        F[k] = 0.3;
      }
      if (h > 1.3 && dep[k + W] < K.z) blend(k + W, Bc[0], Bc[1], Bc[2], 0.4);
      return;
    }
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const tri = h > 1.8 ? 0.26 * h + 0.5 : 0;
    const tl = h > 5.5 ? h * 0.55 : 0;
    const rad = Math.ceil(Math.max(h + tri + tl, w) + 1.5);
    const big = h >= 2.6;
    const edge = Math.max(0.7, Math.min(w * fl, h));
    for (let r = Math.max(0, Math.floor(cy - rad)); r <= Math.min(H - 1, cy + rad); r++) {
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(W - 1, cx + rad); x++) {
        const k = r * W + x;
        if (dep[k] >= K.z) continue;
        const dx = x + 0.5 - cx, dy = r + 0.5 - cy;
        const u = (dx * ca + dy * sa) / fl, v = -dx * sa + dy * ca;
        const q = Math.abs(u) / w + Math.abs(v) / (v < 0 ? h * 0.92 : h);
        // hard edges: on a grid of dots a half-covered cell only muddies the hue
        const cov = q <= 1 + 0.3 / edge ? 1 : 0;
        let c = A;
        if (cov) {
          // the pattern: a second paper pasted on in one of the usual cuts
          let two = false;
          switch (K.design) {
            case 0: two = v < -0.38 * h; break; // a contrasting cap
            case 1: two = u > 0; break; // split down the spine
            case 2: two = u * u + (v + 0.05 * h) ** 2 < (0.36 * w) ** 2; break; // the chand
            case 3: two = Math.abs(v) < 0.2 * h; break; // a band across
            case 4: two = v > 0; break; // top and bottom
            default: two = q > 0.72; // a border
          }
          if (two) c = Bc;
          let s = 1;
          if (big) {
            // the bamboo spine and the bowed crossbar, seen through the paper
            if (Math.abs(u) < 0.4 && v > -h * 0.9) s = 0.72;
            const bow = -0.15 * h + 0.32 * h * (u / w) ** 2;
            if (h >= 4 && Math.abs(v - bow) < 0.42) s = Math.min(s, 0.76);
          }
          blend(k, mix(c[0] * s, skR[k], hz), mix(c[1] * s, skG[k], hz), mix(c[2] * s, skB[k], hz), 1);
          F[k] = 0.24;
          continue;
        }
        // the tail: a small paper triangle off the bottom tip, and streamers on the big ones
        const tv = v - h;
        let tc = 0;
        if (tri && tv > -0.3 && tv < tri && Math.abs(u * fl) <= 0.35 + tv * 0.75) tc = 1;
        else if (tl && tv > 0 && tv < tri + tl) {
          for (const side of [-1, 1]) {
            const uc = side * (0.3 + tv * 0.18) + 0.6 * Math.sin(tv * 0.6 - t * 7 + K.p1 + side);
            if (Math.abs(u * fl - uc) < 0.45) tc = 1;
          }
        }
        if (tc) {
          blend(k, mix(Bc[0], skR[k], hz), mix(Bc[1], skG[k], hz), mix(Bc[2], skB[k], hz), tc);
          F[k] = 0.24;
        }
      }
    }
  };

  return (t, { color } = {}) => {
    R.set(bgR), G.set(bgG), B.set(bgB), F.set(flo);

    // the sky's traffic, far to near
    let bird = false;
    for (let i = 0; i < kites.length; i++) {
      const K = kites[i];
      if (!bird && K.z > 0.6) {
        bird = true;
        for (const b of BIRDS) {
          let bx: number, by: number, cells: number[][];
          if (b.circle) {
            const a = t * 0.3 + b.p;
            bx = 152 + b.r * 1.8 * Math.cos(a);
            by = 24 + b.r * 0.5 * Math.sin(a);
            const tip = Math.sin(a) > 0 ? 1 : 0; // banking on the turn
            cells = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [-3, tip], [3, 1 - tip], [0, 1]];
          } else {
            bx = ((b.x + 75 + t * 4.5) % 280) - 50;
            by = b.y + 1.2 * Math.sin(t * 0.8 + b.p);
            const flap = Math.sin(t * 10 + b.p);
            const wing = flap > 0.3 ? -1 : flap < -0.3 ? 1 : 0;
            cells = [[0, 0], [-1, 0], [1, 0], [-2, wing], [2, wing]];
          }
          const ix = Math.floor(bx), iy = Math.floor(by);
          for (const [ox, oy] of cells) {
            const x = ix + ox, y = iy + oy;
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const k = y * W + x;
            if (dep[k] >= 0.6) continue;
            blend(k, 0.07, 0.05, 0.1, 1);
            F[k] = 0;
          }
        }
      }
      let cx: number, cy: number, ang: number, fl = 1;
      if (K.cut) {
        // falling free: spinning, flipping, sliding off downwind
        const ph = (t / K.period + K.drop) % 1;
        cx = K.x + 10 * Math.sin(ph * 7 + K.p1) - ph * 26;
        cy = -14 + ph * 96;
        ang = t * K.cut + K.p2;
        fl = Math.max(0.22, Math.abs(Math.cos(t * K.cut * 0.7 + K.p1)));
        string(cx, cy, K.z, cx + 9 + 3 * Math.sin(t * 3 + K.p1), cy - 14, K.z, true, K.z);
      } else {
        const sw = Math.sin(t * K.w1 + K.p1), sw2 = Math.sin(t * K.w2 + K.p2);
        cx = K.x + K.amp * sw;
        cy = K.y + 0.6 * K.amp * sw2;
        ang = K.tilt + 0.2 * Math.sin(t * K.w1 * 1.3 + K.p1 + 1);
        if (K.dive) {
          // somebody working their kite: a figure of eight, the kite leaning into it
          const a = t * 0.9 + K.p2;
          cx += (2 + 4 * K.z) * Math.sin(a);
          cy += (1.2 + 2.5 * K.z) * Math.sin(2 * a);
          ang += 0.45 * Math.cos(a);
        }
        if (K.hand) string(K.hand[0], K.hand[1], K.hand[2], cx, cy, K.z, false, K.z);
        else if (K.tail) string(cx, cy, K.z, cx + K.tail * 0.42, cy + K.tail, K.z, true, K.z);
      }
      drawKite(K, lit[i], cx, cy, ang, fl, t);
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = R[k], cg = G[k], cbl = B[k], floor = F[k];
        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
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
