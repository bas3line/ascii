/*
 * lantern lake: sky lanterns rising over a still mountain lake at night. A
 * festival on the far shore lets them go by the hundred: they climb from
 * behind the trees, lean on a slow breeze and burn out high over the water.
 * Nearer ones sail up past us, and a figure standing in a boat, a lamp on its
 * bow, holds one up, lets it go, and lights the next.
 *
 * Shaded in colour per cell on a square grid, then drawn as a halftone: dot
 * size is brightness, ordered-dithered, in the palette colour nearest its hue.
 * A lantern's size, speed and drift all come from its distance, so the far
 * ones crawl up as sparks and the near ones sail past large. Each one starts
 * a new flight, somewhere new, only where it can't be seen: behind the trees
 * or below the frame.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lantern lake",
  category: "scenes",
  note: "sky lanterns rising over a still mountain lake, one let go from a boat",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#04060d",
  palette: [
    "#141b30", "#1c2a52", "#22346a", "#2a4080", "#324c96", "#3c58a8",
    "#33306e", "#433c88", "#54449a",
    "#62407e", "#7a4a88", "#934e86",
    "#a4546e", "#bc5e66", "#d06a62",
    "#dc7650", "#e88444", "#f09238",
    "#d4581a", "#ea6c1e", "#f78226", "#ff9530", "#ffa83c", "#ffbb4e", "#ffcc66", "#ffdc86", "#ffe8a8",
    "#fff3cf", "#fffbec",
    "#b8341a", "#d84420",
    "#2f3748", "#4f586c", "#5e5a7e", "#7a6a8c",
    "#5a3220", "#7c4628",
    // the far range's slate, then the stars: written straight in, never
    // matched, so the sky's violets can't turn slate and a greyed mix of warm
    // and blue can't come out as a white star
    "#4a5578", "#5d6a92", "#7381ab",
    "#c4cdec", "#e4e9fb", "#ffffff",
  ],
} satisfies Meta;

const W = 200, H = 100;
const WL = 64; // the waterline
const SRC = 100; // the middle of the festival on the far shore
// the boat's middle and its waterline, far enough out that the lantern held
// over its head sits against the dark trees' reflection
const BX = 108.5, BW = 90;
const SC = 1.4; // the boat's scale
const FX = BX - 3 * SC; // where the figure stands in it
// The figure lets a lantern go this far into every cycle and lights the
// next one at LIT, so it holds one up most of the time.
const CYCLE = 20, LET_GO = 3, LIT = 6;
const HELD = 5 * SC; // the boat's lanterns, in cells tall
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const AIR = 0, FAR = 1, BACK = 2, PEAK = 3, TREE = 4;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f);
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

// distance from a point to a segment
function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return Math.sqrt(ex * ex + ey * ey);
}

// Ranges as tent peaks [x, height, slope], roughened: the high peaks either
// side, the nearer shoulders in front of them, and a distant range between.
const PEAKS: [number, number, number][] = [[22, 42, 1.2], [-4, 33, 0.9], [172, 33, 1.05], [215, 22, 0.6]];
const SHOULDERS: [number, number, number][] = [[50, 25, 1], [64, 12, 0.75], [150, 17, 0.95], [196, 21, 0.75]];
const DISTANT: [number, number, number][] = [[98, 17, 0.42], [122, 14, 0.5], [82, 12, 0.45], [140, 11, 0.5]];

function range(x: number, peaks: [number, number, number][], seed: number, rough: number): [number, number] {
  let m = -99, px = 0;
  for (const [cx, h, s] of peaks) {
    const v = h - Math.abs(x - cx) * s;
    if (v > m) (m = v), (px = cx);
  }
  const j = rough * (fbm(x * 0.09, seed, 3) - 0.5) + rough * 0.45 * (noise(x * 0.45, seed + 5) - 0.5);
  return [m + j * Math.min(1, Math.max(0, m) / 6), px];
}

// A sky lantern's outline, in units of its height from its top: wider at the
// shoulders than at the open bottom, the shoulders rounded.
function inside(u: number, v: number): boolean {
  if (v < 0 || v > 1) return false;
  let hw = 0.34 - 0.08 * v;
  if (v < 0.14) hw *= Math.sqrt(1 - 0.6 * ((0.14 - v) / 0.14) ** 2);
  return u <= hw && u >= -hw;
}

interface Flight {
  i: number;
  s: number; // size, in cells tall
  v: number; // rise, cells a second
  life: number; // seconds from one start to the next
  off: number;
  wd: number; // lean on the breeze, cells across for each row climbed
  sw: number;
  sf: number;
  ph: number;
  f1: number;
  f2: number;
  out: boolean; // sails off the top rather than burning out
  wide: boolean; // starts anywhere along the shore, not just at the festival
}

export default function lanternLake(): Frame {
  const P = meta.palette.map(hex);
  const STAR = P.length - 3; // the first of the stars' colours
  const SL = STAR - 3; // and of the far range's slate
  const N = W * H, S = WL * W;
  const out: string[] = new Array(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < SL; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the land and the sky, built once ----------------------------------------
  const mat = new Uint8Array(S);
  const sR = new Float32Array(S), sG = new Float32Array(S), sB = new Float32Array(S);
  const take = new Float32Array(S); // how much of the festival's warm light each cell takes
  const backTop = new Float32Array(W), backX = new Float32Array(W);
  const frontTop = new Float32Array(W), frontX = new Float32Array(W), farTop = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const [hb, pb] = range(x + 0.5, PEAKS, 3.1, 4);
    const [hf, pf] = range(x + 0.5, SHOULDERS, 7.7, 3);
    const [hd] = range(x + 0.5, DISTANT, 11.3, 2.2);
    backTop[x] = WL - Math.max(hb, 0), backX[x] = pb;
    frontTop[x] = WL - Math.max(hf, 0), frontX[x] = pf;
    farTop[x] = WL - Math.max(hd, 0);
  }
  // The festival's light: a warm dome in the air over the middle of the far
  // shore, leaning the way the breeze carries the lanterns.
  const dome = (x: number, y: number) => {
    const up = Math.max(0, WL - 6 - y); // from the tops of the trees
    const dx = (x - SRC - 0.3 * up) / (44 + up);
    return Math.exp(-dx * dx) * (0.6 * Math.exp(-up / 14) + 0.4 * Math.exp(-up / 40));
  };
  // The sky's hue by how warm it is: night blue, through violet, mauve and
  // rose, to amber right over the trees. Mixing the glow into the blue would
  // grey it, and a grey dot is drawn pale, so the hue walks round instead.
  const HUES = [[0.22, 0.36, 1], [0.46, 0.36, 1], [0.76, 0.42, 0.92], [1, 0.48, 0.58], [1, 0.54, 0.34], [1, 0.58, 0.2]];
  const hue = (w: number, j: number) => {
    const f = clamp(w) * 5, i = Math.min(4, Math.floor(f));
    return mix(HUES[i][j], HUES[i + 1][j], f - i);
  };
  // A mountainside: the faces turned toward the festival take a little of its
  // light, the ridge between them wandering as it comes down from the peak,
  // and the ridgeline catches the sky behind it, blue away from the festival
  // and warm near it. `haze` lifts a range, `relief` is how far its faces
  // stand out from its gullies, `edge` is how bright its ridgeline is and
  // `warm` is how much the festival's light tints it. Returns that light.
  const slope = (k: number, x: number, y: number, top: number, px: number, haze: number, relief: number, edge: number, warm: number) => {
    const xc = x + 0.5, depth = y - top;
    const inward = px < SRC ? 1 : -1;
    const ridge = px + (depth + 1) * 0.6 * (noise(y * 0.1, px) - 0.5);
    const face = smooth(-4, 4, (xc - ridge) * inward);
    const u = x + depth * 0.45 * Math.sign(xc - px || 1);
    const rib = (q: number) => fbm(q * 0.13, px * 0.37, 3);
    const grad = (rib(u + 1) - rib(u - 1)) * 7 * inward;
    const lit = clamp(0.3 + 0.5 * face + grad * 0.5);
    const tex = 0.8 + 0.4 * fbm(x * 0.35, y * 0.35, 2);
    const w = lit * Math.exp(-(((xc - SRC) / 70) ** 2)) * (0.4 + 0.6 * smooth(top + 2, WL, y)) * 0.9;
    const b = (haze + relief * lit * lit) * tex + 0.16 * w;
    const rim = smooth(1.8, 0.3, depth) * edge, sky = dome(xc, top - 1);
    const c = (j: number) => b * hue(w * warm, j) + rim * hue(sky, j);
    sR[k] = c(0), sG[k] = c(1), sB[k] = c(2);
    return w;
  };
  // The far range's cells, drawn in slate, a greyed blue no other part of the
  // picture uses: the air in front of it greys it, so it stands apart from the
  // saturated sky above and the dark shoulders below. Written straight in, as
  // the stars are, since matching would pull the sky's violets to it as well.
  const far = new Uint8Array(S);
  for (let r = 0; r < WL; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5, xc = x + 0.5;
      if (y >= frontTop[x]) {
        mat[k] = PEAK;
        slope(k, x, y, frontTop[x], frontX[x], 0.05, 0.06, 0.3, 1);
      } else if (y >= backTop[x]) {
        mat[k] = BACK;
        // slate, but not where the festival lights it or on the ridgeline,
        // which keeps the sky's own blue
        if (slope(k, x, y, backTop[x], backX[x], 0.24, 0.3, 0.35, 0.5) < 0.3 && y - backTop[x] > 1.2) far[k] = 1;
      } else if (y >= farTop[x]) {
        mat[k] = FAR;
        // a distant range behind the festival, veiled in the warm haze its
        // light makes in the air in front, dark up on the ridge
        const tex = fbm(x * 0.2, y * 0.3, 3);
        const w = dome(xc, y);
        const b = 0.06 + 0.04 * tex + 0.3 * w + 0.7 * w ** 3;
        sR[k] = b * hue(w, 0), sG[k] = b * hue(w, 1), sB[k] = b * hue(w, 2);
      } else {
        // night blue overhead, lighter on the horizon, warmed over the festival
        const v = Math.pow(y / WL, 1.5);
        const hz = 0.85 + 0.3 * fbm(x * 0.04, r * 0.07, 3);
        const w = dome(xc, y);
        const b = (0.18 + 0.32 * v) * hz + 0.5 * w;
        sR[k] = b * hue(w, 0), sG[k] = b * hue(w, 1), sB[k] = b * hue(w, 2);
        take[k] = w;
      }
    }
  }

  // The far shore's trees: a low band of scrub along the water with spruce
  // standing out of it, shorter in the clearing where the festival is.
  const scrub = (x: number) => WL - 2.4 - 1.4 * fbm(x * 0.15, 5.5, 3);
  for (let r = 0; r < WL; r++) for (let x = 0; x < W; x++) if (r + 0.5 >= scrub(x + 0.5)) mat[r * W + x] = TREE;
  const spruce = (tx: number, th: number, tw: number, tb: number) => {
    for (let r = Math.max(0, Math.floor(tb - th)); r < WL; r++) {
      const y = r + 0.5, dy = y - (tb - th);
      if (dy < 0 || y >= tb + 0.5) continue;
      const tier = (dy + th * 0.3) / 1.6;
      const w = (dy / th) * tw * (0.7 + 0.45 * (tier - Math.floor(tier))) + 0.3;
      for (let x = Math.max(0, Math.floor(tx - tw - 1)); x <= Math.min(W - 1, tx + tw + 1); x++) {
        if (Math.abs(x + 0.5 - tx) <= w) mat[r * W + x] = TREE;
      }
    }
  };
  for (let x = -2; x < W + 2; ) {
    const h = hash(Math.floor(x * 7), 21);
    const clearing = smooth(22, 0, Math.abs(x - SRC));
    const th = (2.6 + 4.4 * hash(Math.floor(x * 3), 5) ** 1.2) * (1 - 0.3 * clearing);
    spruce(x + hash(Math.floor(x), 2), th, 1 + 0.8 * hash(Math.floor(x), 4), scrub(x) + 1);
    x += 1.2 + 1.8 * h;
  }
  for (let k = 0; k < S; k++) {
    if (mat[k] !== TREE) continue;
    const x = k % W, r = (k / W) | 0;
    const h = hash(x * 13 + r, 5);
    sR[k] = 0.004 + 0.004 * h, sG[k] = 0.006 + 0.006 * h, sB[k] = 0.012 + 0.008 * h;
    // the tops of the trees, backlit by the festival behind them
    const edge = r === 0 || mat[k - W] !== TREE ? 1 : r > 1 && mat[k - 2 * W] !== TREE ? 0.35 : 0;
    const g = edge * dome(x + 0.5, r + 0.5) * 0.45;
    sR[k] += g, sG[k] += g * 0.5, sB[k] += g * 0.18;
    take[k] = edge * 0.5;
  }
  const floorS = new Float32Array(S);
  for (let k = 0; k < S; k++) floorS[k] = mat[k] === AIR ? 0.04 + 0.08 * ((k / W) | 0) / WL : mat[k] === FAR || mat[k] === BACK ? 0.03 : 0;

  // people on the shore with lanterns still in their hands
  const shoreLights: [number, number, number][] = [];
  for (let i = 0, x = SRC - 24; i < 8; i++) {
    shoreLights.push([Math.round(x), WL - 1 - (hash(i, 62) > 0.6 ? 1 : 0), hash(i, 63) * 6.28]);
    x += 2 + 9 * hash(i, 61) ** 2;
  }

  // stars, thinning out where the festival lights the sky
  const stars: [number, number, number, number][] = [];
  for (let k = 0; k < S; k++) {
    if (mat[k] !== AIR) continue;
    const h = hash(k % W, Math.floor(k / W) + 101);
    if (h > 0.985 && take[k] < 0.25) stars.push([k, hash(k, 3) * 6.28, 0.8 + hash(k, 4) * 2.5, (0.45 + (h - 0.985) * 40) * (1 - take[k] * 2.5)]);
  }
  // rows of the water that break the reflection into strips
  const gap = new Uint8Array(H);
  for (let r = WL; r < H; r++) gap[r] = hash(r, 404) < 0.3 ? 1 : 0;

  // --- the lanterns -----------------------------------------------------------
  // Let go on the far shore. Each climbs from below the scrub, so its start is
  // hidden, and either burns out or sails off the top before it starts again.
  const shore: Flight[] = [];
  for (let i = 0; i < 240; i++) {
    const near = i >= 196;
    const s = near ? 1.5 + 1.7 * hash(i, 11) ** 1.5 : 0.45 + 0.9 * hash(i, 11) ** 1.4;
    const v = 0.3 + 0.62 * s;
    const out = near && hash(i, 12) < 0.7;
    const climb = out ? WL + 3 * s + 4 : 12 + 46 * hash(i, 13) ** 0.8;
    shore.push({
      i, s, v, life: (climb + s + 1) / v, off: hash(i, 14), wd: 0.12 + 0.3 * hash(i, 15),
      sw: 0.25 * s + 0.2, sf: 0.3 + 0.5 * hash(i, 16), ph: hash(i, 17) * 6.28, f1: 2 + 3 * hash(i, 18), f2: 5 + 4 * hash(i, 19),
      out, wide: near || hash(i, 20) < 0.08,
    });
  }
  shore.sort((a, b) => a.s - b.s);
  const startX = (f: Flight, lap: number) => {
    const n = f.i * 7 + lap * 131;
    if (f.wide) return 12 + 176 * hash(n, 23);
    return SRC - 6 + 30 * (hash(n, 23) + hash(n, 24) + hash(n, 25) - 1.5);
  };
  // The breeze leans the plume over to the right, more the higher it gets.
  const lean = (f: Flight, climb: number) => climb * f.wd + climb * climb * 0.004;

  // Let go near us, below the frame: they rise past large and fast.
  // [size, where it is across and down at the start]; the last few are still
  // below the frame, on their way up
  const NEAR: [number, number, number][] = [
    [12.5, 34, 30], [8.5, 178, 14], [6.5, 66, 74], [5.2, 154, 46], [4.4, 18, 86], [4.6, 136, 4],
    [9.5, 190, 116], [10.5, 150, 160], [5.8, 80, 128], [7, 28, 190], [4.2, 172, 150],
  ];
  const close = NEAR.map(([s, x, y], i) => {
    const v = 0.35 + 0.42 * s;
    const path = H + 5 * s; // from below the frame to above it, glow and all
    const life = (path / v) * (1.08 + 0.3 * hash(i, 41));
    return { i, s, v, x, path, life, off: (H + 2.5 * s - y) / v / life, wd: s * 0.05, sw: 0.35 * s, sf: 0.2 + 0.2 * hash(i, 42), ph: hash(i, 43) * 6.28 };
  });

  // --- the boat and the figure in it --------------------------------------------
  // Drawn in boat units, SC cells each, measured across from the figure (or
  // the boat's middle) and up from the waterline.
  // [shoulder, elbow, hand] for each pose, one arm; the other mirrors it
  const ARMS = {
    up: [[1.3, 9.4], [3, 11.5], [2, 14.1]],
    down: [[1.3, 9.4], [2, 6.6], [1.9, 4.4]],
    chest: [[1.3, 9.4], [2.4, 7.2], [1.2, 6]],
  };
  // a long low hull, its ends sweeping up, the bow (on the right) higher
  const gunwale = (dx: number) => 2.4 + (dx > 0 ? 3 : 1.8) * smooth(4, 12.5, Math.abs(dx)) ** 2;
  const hull = (dx: number, up: number) => up <= gunwale(dx) && up > -0.6 && Math.abs(dx) <= 12.5 - Math.max(0, 1.8 - up) * 2.4;
  const body = (dx: number, up: number, arms: number[][]) => {
    if ((dx * dx) / 1.3 + (up - 11.2) ** 2 / 1.5 < 1) return true; // the head
    if (up <= 9.8 && up > 1 && Math.abs(dx) <= 1.35 + 0.5 * smooth(9.8, 2, up)) return true; // a long coat
    const ax = Math.abs(dx);
    return seg(ax, up, arms[0][0], arms[0][1], arms[1][0], arms[1][1]) < 0.66 || seg(ax, up, arms[1][0], arms[1][1], arms[2][0], arms[2][1]) < 0.58;
  };
  // The boat and the figure, drawn into a box of cells round the boat each
  // frame (1 boat, 2 figure) with the arms partway between two poses, so they
  // move rather than snap from one to the next.
  const BOX = [Math.floor(BX - 13 * SC), BW - Math.ceil(16 * SC), Math.ceil(27 * SC), Math.ceil(16 * SC) + 2]; // x, row, cols, rows
  const hulls = new Uint8Array(BOX[2] * BOX[3]), shape = new Uint8Array(BOX[2] * BOX[3]);
  for (let j = 0; j < BOX[3]; j++) {
    for (let i = 0; i < BOX[2]; i++) if (hull((BOX[0] + i + 0.5 - BX) / SC, (BW - (BOX[1] + j + 0.5)) / SC)) hulls[j * BOX[2] + i] = 1;
  }
  const arms = ARMS.up.map((p) => [...p]);
  const pose = (a: number[][], b: number[][], k: number) => {
    for (let i = 0; i < 3; i++) (arms[i][0] = mix(a[i][0], b[i][0], k)), (arms[i][1] = mix(a[i][1], b[i][1], k));
    for (let j = 0; j < BOX[3]; j++) {
      for (let i = 0; i < BOX[2]; i++) {
        const q = j * BOX[2] + i;
        shape[q] = hulls[q] || (body((BOX[0] + i + 0.5 - FX) / SC, (BW - (BOX[1] + j + 0.5)) / SC, arms) ? 2 : 0);
      }
    }
  };
  // a small lamp on the bow, always lit, so the boat never goes dark between
  // one lantern and the next
  const BOWX = BX + 11.2 * SC, BOWY = BW - (gunwale(11.2) + 1.2) * SC;

  // --- per frame ----------------------------------------------------------------
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const FL = new Float32Array(N);

  const paint = (k: number, pr: number, pg: number, pb: number, a: number) => {
    R[k] += (pr - R[k]) * a, G[k] += (pg - G[k]) * a, B[k] += (pb - B[k]) * a;
    if (FL[k] < 0.12 * a) FL[k] = 0.12 * a;
  };
  // Draws a lantern h cells tall centred on (cx, cy) at brightness I and
  // opacity a, above row `limit`, leaving out the cells `hide` marks.
  const lantern = (cx: number, cy: number, h: number, I: number, a: number, limit: number, hide: Uint8Array | null) => {
    if (h < 1.4) {
      // a spark: one cell
      const x = Math.floor(cx), r = Math.floor(cy);
      if (x < 0 || x >= W || r < 0 || r >= limit) return;
      const k = r * W + x;
      if (hide && hide[k]) return;
      const q = I * (0.85 + 0.15 * h);
      paint(k, q, q * (0.42 + 0.3 * q), q * (0.1 + 0.18 * q * q), a);
      return;
    }
    if (h < 2.6) {
      // two cells tall, the paper above and the burner's glow below, spread
      // over the rows it straddles so it slides up rather than jumping
      const x = Math.floor(cx), top = cy - 1, r0 = Math.floor(top);
      if (x < 0 || x >= W) return;
      for (let r = r0; r <= r0 + 2; r++) {
        if (r < 0 || r >= limit) continue;
        const k = r * W + x;
        if (hide && hide[k]) continue;
        const up = Math.max(0, Math.min(r + 1, top + 1) - Math.max(r, top)); // overlap with the paper
        const dn = Math.max(0, Math.min(r + 1, top + 2) - Math.max(r, top + 1)); // and with the glow
        if (up + dn < 0.02) continue;
        const q = I * (0.8 * up + 1.1 * dn) / (up + dn);
        paint(k, q, q * (0.34 + 0.36 * q), q * (0.06 + 0.2 * q * q), a * (up + dn));
      }
      return;
    }
    const top = cy - h / 2;
    const x0 = Math.max(0, Math.floor(cx - 0.36 * h)), x1 = Math.min(W - 1, Math.floor(cx + 0.36 * h));
    const r0 = Math.max(0, Math.floor(top)), r1 = Math.min(limit - 1, Math.floor(top + h));
    for (let r = r0; r <= r1; r++) {
      for (let x = x0; x <= x1; x++) {
        const k = r * W + x;
        if (hide && hide[k]) continue;
        let cov = 0;
        for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) if (inside((x + (sx + 0.5) / 3 - cx) / h, (r + (sy + 0.5) / 3 - top) / h)) cov++;
        if (!cov) continue;
        const u = (x + 0.5 - cx) / h, v = clamp((r + 0.5 - top) / h);
        const xn = Math.min(1, Math.abs(u) / (0.34 - 0.08 * v));
        // Lit through: past full brightness, so the body is solid, its colour
        // deep orange up under the crown and pale gold over the burner.
        const q = I * (1 - 0.3 * xn * xn) * (0.78 + 0.42 * v);
        const fl = Math.exp(-((u / 0.13) ** 2) - ((v - 0.9) / 0.1) ** 2) * I;
        paint(k, q + fl * 0.3, q * (0.3 + 0.42 * q) + fl * 0.6, q * (0.04 + 0.2 * q * q) + fl * 0.5, (cov / 9) * a);
      }
    }
  };
  // the warm air round a lantern
  const halo = (cx: number, cy: number, h: number, g: number, limit: number) => {
    const e = 0.4 + 0.32 * h;
    const reach = Math.ceil(e * 4);
    const r0 = Math.max(0, Math.floor(cy - reach)), r1 = Math.min(limit - 1, Math.floor(cy + reach));
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(W - 1, Math.floor(cx + reach));
    for (let r = r0; r <= r1; r++) {
      const dy = r + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - 0.3 * h);
        const q = g * (Math.exp(-d / e) + 0.25 * Math.exp(-d / (e * 2.5)));
        const k = r * W + x;
        R[k] += q, G[k] += q * 0.5, B[k] += q * 0.17;
      }
    }
  };
  const hide = new Uint8Array(S);
  for (let k = 0; k < S; k++) hide[k] = mat[k] === TREE ? 1 : 0;
  // the festival's light laid on the water as a broad road, widening toward us
  const roadX = new Float32Array(H), roadW = new Float32Array(H), roadA = new Float32Array(H);
  for (let r = WL; r < H; r++) {
    const dw = r + 0.5 - WL;
    roadX[r] = SRC + 4 + dw * 0.12;
    roadW[r] = 7 + dw * 0.9;
    // near the shore the mirror carries the festival's light; the road takes
    // over further out
    roadA[r] = 0.9 * smooth(3, 16, dw) * Math.exp(-dw / 60);
  }

  return (t, { color } = {}) => {
    const breathe = 0.06 * Math.sin(t * 0.5) + 0.04 * Math.sin(t * 1.7 + 1);

    // --- the sky and the land -------------------------------------------------------
    for (let k = 0; k < S; k++) {
      const g = 1 + take[k] * breathe;
      R[k] = sR[k] * g, G[k] = sG[k] * g, B[k] = sB[k] * g;
      FL[k] = floorS[k];
    }

    // lanterns from the far shore, the furthest first
    for (const f of shore) {
      const u = t / f.life + f.off;
      const lap = Math.floor(u);
      const a = (u - lap) * f.life;
      const cx = startX(f, lap) + lean(f, f.v * a) + f.sw * (Math.sin(a * f.sf + f.ph) - Math.sin(f.ph));
      const cy = WL + f.s * 0.5 + 0.6 - f.v * a;
      if (cy < -2 * f.s - 2) continue;
      let I = (0.7 + 0.45 * Math.min(1, f.s)) * (0.88 + 0.08 * Math.sin(t * f.f1 + f.ph) + 0.04 * Math.sin(t * f.f2));
      let alpha = 1;
      if (!f.out) {
        // burning out: it gutters, reddens and goes
        const end = smooth(f.life - 4, f.life, a);
        I *= 1 - 0.55 * end * (0.6 + 0.4 * Math.sin(a * 11 + f.ph));
        alpha = 1 - end;
      }
      if (alpha <= 0.01) continue;
      if (f.s >= 1.4) halo(cx, cy, f.s, 0.07 * I * alpha * smooth(0, 2, a), WL);
      lantern(cx, cy, f.s, I, alpha, WL, hide);
    }
    for (const [x, r, ph] of shoreLights) {
      const k = r * W + x;
      const q = 0.9 + 0.15 * Math.sin(t * 3.1 + ph) + 0.1 * Math.sin(t * 7.3 + ph * 2);
      R[k] = q, G[k] = q * 0.62, B[k] = q * 0.24, FL[k] = 0.2;
    }

    // --- the lake: the sky upside down, stretched and broken by slow ripples ----
    for (let r = WL; r < H; r++) {
      const y = r + 0.5;
      const dw = y - WL;
      const deep = mix(1, 0.65, dw / (H - WL));
      const ry = WL - 1 - (r - WL);
      const r0 = Math.max(0, ry) * W, r1 = Math.max(0, ry - 1) * W, r2 = Math.max(0, ry - 2) * W;
      const fade = smooth(H + 4, H - 7, y);
      const rx = roadX[r], rw = roadW[r], ra = roadA[r];
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const wave = noise(x * 0.04 + t * 0.05, r * 0.55 - t * 0.35);
        const sx = x + (0.45 + dw * 0.075) * Math.sin(r * 1.3 + t * 1.6 + wave * 4);
        let ix = Math.floor(sx);
        const fx = sx - ix;
        ix = Math.max(0, Math.min(W - 2, ix));
        const a0 = r0 + ix, a1 = r1 + ix, a2 = r2 + ix;
        const sky = mat[a0] !== TREE;
        // long level streaks where the ripples face us, darker troughs between
        const streak = smooth(0.25, 0.75, noise(x * 0.035 + t * 0.04, r * 0.75 - t * 0.3));
        let kr = 0.9 * (0.5 + 0.5 * streak) * (0.85 + 0.25 * wave) * deep;
        if (gap[r] && wave < 0.45) kr *= 0.2;
        const gx = 1 - fx;
        let cr = ((R[a0] * gx + R[a0 + 1] * fx) * 0.5 + (R[a1] * gx + R[a1 + 1] * fx) * 0.3 + (R[a2] * gx + R[a2 + 1] * fx) * 0.2) * kr + 0.006;
        let cg = ((G[a0] * gx + G[a0 + 1] * fx) * 0.5 + (G[a1] * gx + G[a1 + 1] * fx) * 0.3 + (G[a2] * gx + G[a2 + 1] * fx) * 0.2) * kr + 0.012;
        let cb = ((B[a0] * gx + B[a0 + 1] * fx) * 0.5 + (B[a1] * gx + B[a1 + 1] * fx) * 0.3 + (B[a2] * gx + B[a2 + 1] * fx) * 0.2) * kr + 0.028;
        // the festival's road: a glow on the water, broken into short level
        // dashes where the ripples catch it
        let g = 0;
        const qx = (x + 0.5 - rx) / rw;
        if (qx > -2.2 && qx < 2.2) {
          const dash = smooth(0.42, 0.72, noise(x * 0.11 + t * 0.1, r * 0.9 - t * 0.55));
          g = ra * Math.exp(-qx * qx) * (0.3 + 0.7 * dash) * (gap[r] ? 0.55 : 1);
        }
        // the shore lights laid on the water
        if (dw < 10) {
          for (const [lx, , ph] of shoreLights) {
            const d = x - lx;
            if (d > 3 || d < -3) continue;
            g += Math.exp(-d * d * 1.5) * Math.exp(-dw / 4) * smooth(0.35, 0.7, noise(x * 0.6 + ph, y * 1.3 - t * 1.4)) * 0.8;
          }
        }
        // where the warm light lies on the water it replaces the blue, so it
        // stays gold instead of greying
        if (g > 0) {
          const keep = 1 - Math.min(0.9, g * 4);
          cr = cr * keep + g, cg = cg * keep + g * 0.56, cb = cb * keep + g * 0.2;
        }
        // elsewhere the crests of the ripples catch the blue of the sky
        if (g < 0.2) {
          const sheen = smooth(0.6, 0.85, noise(x * 0.07 + t * 0.03, r * 1.1 - t * 0.25)) * 0.12 * (1 - g * 5) * deep;
          cr += sheen * 0.3, cg += sheen * 0.48, cb += sheen;
        }
        R[k] = cr * fade, G[k] = cg * fade, B[k] = cb * fade;
        FL[k] = (sky ? 0.07 * deep : 0.03) * fade;
      }
    }

    // --- the boat ------------------------------------------------------------------
    const tc = ((t % CYCLE) + CYCLE) % CYCLE;
    const bob = (at: number) => 0.3 * Math.sin(at * 1.3);
    const holdY = BW - 14.1 * SC - HELD / 2;
    // each of the boat's lanterns flickers in its own time, the same in the
    // hands and after it is let go: m is the cycle it is let go in
    const flick = (m: number) => 1.1 + 0.05 * Math.sin(t * 4.7 + m * 2.1) + 0.03 * Math.sin(t * 11.3 + m * 5.3);
    const n = Math.floor(t / CYCLE);
    const mine = flick(tc < LET_GO ? n : n + 1);
    // the lantern in the figure's hands, if there is one, and how lit it is
    let hy = 0, hs = HELD, ha = 0;
    if (tc < LET_GO || tc >= LIT + 5) (hy = holdY + bob(t)), (ha = 1);
    else if (tc >= LIT) {
      // lit at the chest, filling with light, then lifted over the head
      ha = smooth(LIT, LIT + 2.5, tc);
      hs = HELD * (0.75 + 0.25 * smooth(LIT, LIT + 3, tc));
      hy = mix(BW - 8.6 * SC, holdY + bob(t), smooth(LIT + 3.5, LIT + 5, tc));
    }
    // the arms: held up a moment after the let-go, lowered, brought up to the
    // chest to light the next, and lifted with it over the head
    if (tc < LET_GO + 2) pose(ARMS.up, ARMS.down, smooth(LET_GO + 1, LET_GO + 2, tc));
    else if (tc < LIT + 1) pose(ARMS.down, ARMS.chest, smooth(LIT - 0.6, LIT, tc));
    else pose(ARMS.chest, ARMS.up, smooth(LIT + 3.5, LIT + 5, tc));
    // the lanterns already let go: this cycle's and the two before
    const flights: [number, number, number][] = [];
    for (let m = n; m >= n - 2; m--) {
      const tr = m * CYCLE + LET_GO, age = t - tr;
      if (age < 0) continue;
      const y = holdY + bob(tr) - 2.8 * (age - 1.5 * (1 - Math.exp(-age / 1.5)));
      if (y < -3 * HELD) continue;
      flights.push([FX + 0.3 * age + 1.2 * Math.sin(age * 0.35), y, flick(m)]);
    }

    // their light: a glow in the air round each, and on the water a pool
    // round the boat and a broken road toward us, fading as a lantern rises
    // [x, the bottom of the lantern, how much of it reaches the water and the
    // boat, how big its pool is]
    const lights: [number, number, number, number][] = [];
    const lamp = 1.2 + 0.04 * Math.sin(t * 5.3) + 0.03 * Math.sin(t * 12.7);
    lights.push([BOWX, BOWY + 1, 0.4 * lamp, 0.4]);
    halo(BOWX, BOWY, 2, 0.07 * lamp, H);
    if (ha > 0) lights.push([FX, hy + hs / 2, ha * mine, 1]);
    for (const [x, y, l] of flights) {
      halo(x, y, HELD, 0.2 * l, H);
      lights.push([x, y + HELD / 2, l * Math.exp(-Math.max(0, holdY - y) / 8), 1]);
    }
    if (ha > 0) halo(FX, hy, HELD, 0.2 * ha * mine, H);
    for (const [lx, , q, sz] of lights) {
      if (q < 0.003) continue;
      for (let r = Math.floor(BW - 9 * SC); r < H; r++) {
        const y = r + 0.5, dw = y - BW;
        for (let x = Math.max(0, Math.floor(lx - 34 * sz)); x < Math.min(W, lx + 34 * sz); x++) {
          const k = r * W + x;
          const dx = x + 0.5 - lx;
          // the water behind the boat is further off, so its pool is squashed
          let g = Math.exp(-Math.sqrt((dx / (16 * SC * 0.8 * sz)) ** 2 + (dw / ((dw < 0 ? 2.6 : 3.6) * SC * sz)) ** 2)) * 0.5;
          if (dw > -1) {
            const w = (1.4 + 0.2 * Math.max(0, dw)) * (0.5 + 0.5 * sz);
            g += Math.exp(-((dx / w) ** 2)) * Math.exp(-Math.max(0, dw) / (16 * sz)) * smooth(0.4, 0.72, noise(x * 0.45 + 3, y * 1.2 - t * 1.3)) * 1.1;
          }
          g *= q;
          const keep = 1 - Math.min(0.9, g * 4);
          R[k] = R[k] * keep + g, G[k] = G[k] * keep + g * 0.62, B[k] = B[k] * keep + g * 0.26;
        }
      }
    }
    // the boat and the figure, dark against it, their edges lit from above
    for (let j = 0; j < BOX[3]; j++) {
      for (let i = 0; i < BOX[2]; i++) {
        const m = shape[j * BOX[2] + i];
        if (!m) continue;
        const x = BOX[0] + i, r = BOX[1] + j;
        if (x < 0 || x >= W || r >= H) continue;
        const k = r * W + x;
        // the sides of the figure, a thin rim against the road behind
        let g = m === 2 && (i === 0 || i === BOX[2] - 1 || !shape[j * BOX[2] + i - 1] || !shape[j * BOX[2] + i + 1]) ? 0.16 : 0;
        const top = j === 0 || !shape[(j - 1) * BOX[2] + i];
        for (const [lx, ly, lq] of lights) {
          if (lq < 0.003) continue;
          const dx = lx - (x + 0.5), dy = ly - (r + 0.5);
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (m === 2) {
            // the neighbour toward the light: if it is open, this cell is an edge facing it
            const ni = i + Math.round(dx / d), nj = j + Math.round(dy / d);
            const open = ni < 0 || nj < 0 || ni >= BOX[2] || nj >= BOX[3] || !shape[nj * BOX[2] + ni];
            g += lq * (open ? 0.95 : 0.05) * Math.exp(-d / (6 * SC));
          } else {
            // the gunwale catches the light along its length
            g += lq * (top ? 0.6 * Math.exp(-Math.abs(dx) / (11 * SC)) : 0.02);
          }
        }
        R[k] = 0.01 + g, G[k] = 0.008 + g * 0.55, B[k] = 0.014 + g * 0.22;
        FL[k] = 0;
      }
    }
    lantern(BOWX, BOWY, 2, lamp, 1, H, null);
    for (const [x, y, q] of flights) lantern(x, y, HELD, q, 1, H, null);
    if (ha > 0) lantern(FX, hy, hs, ha * mine, Math.min(1, ha * 1.4), H, null);

    // --- lanterns rising past us ------------------------------------------------------
    for (const c of close) {
      const u = t / c.life + c.off;
      const lap = Math.floor(u);
      const a = (u - lap) * c.life;
      // before its first flight it is still waiting below the frame
      if (lap < 0 || a * c.v > c.path) continue;
      let x0 = c.x;
      if (lap) {
        x0 = 6 + 188 * hash(c.i * 17 + lap, 44);
        if (x0 > 84 && x0 < 132) x0 = x0 < 108 ? x0 - 32 : x0 + 32; // clear of the boat
      }
      const cx = x0 + c.wd * a + c.sw * (Math.sin(a * c.sf + c.ph) - Math.sin(c.ph));
      const cy = H + 2.5 * c.s - c.v * a;
      const I = 1.15 + 0.05 * Math.sin(t * 3.3 + c.ph) + 0.03 * Math.sin(t * 8.1 + c.i);
      halo(cx, cy, c.s, 0.1 * I, H);
      lantern(cx, cy, c.s, I, 1, H, null);
    }

    // --- dots ---------------------------------------------------------------------------
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = R[k], cg = G[k], cb = B[k];
        const floor = FL[k];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          // the far range in slate, unless a lantern or its glow is over it
          if (k < S && far[k] && FL[k] < 0.05 && cb >= cr) {
            color[k] = SL + (level > 0.42 ? 2 : level > 0.3 ? 1 : 0);
            continue;
          }
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    // stars twinkle, wherever nothing brighter is in front of them
    // (a star needs a bigger dot than the sky's own to be seen against it)
    for (const [k, ph, rate, b] of stars) {
      const s = b * (0.7 + 0.3 * Math.sin(t * rate + ph));
      if (s < 0.3 || Math.max(R[k], G[k], B[k]) > 0.4) continue;
      out[k] = s > 0.95 ? "●" : s > 0.45 ? "•" : "·";
      if (color) color[k] = STAR + (s > 0.8 ? 2 : s > 0.55 ? 1 : 0);
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
