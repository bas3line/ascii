/*
 * kyoto dusk: a five-storey pagoda dark against an indigo to rose sky with a
 * thin crescent moon, a temple pond holding its reflection, and in front a
 * cherry tree in full bloom lit from below by a stone lantern. Petals fall
 * and drift through the frame, the lantern flickers, the pond shivers.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "kyoto dusk",
  category: "scenes",
  note: "a pagoda at dusk behind a cherry tree lit by a stone lantern",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0b0a16",
  palette: [
    "#1c1d4a", "#262759", "#33316b", "#433d7c", "#574a8c", "#6e5a9a",
    "#8a5a92", "#a8668f", "#c4748f", "#db8a95", "#ec9f9c", "#f6b8a8", "#fbd0b8",
    "#fff1d8", "#fffaf0", "#7e5f9e",
    "#f9d3dc", "#f2b2c4", "#e28fab", "#c66e92", "#9c5279", "#74405f",
    "#ffd9a0", "#ffbb6a", "#f29a4a", "#d0763a", "#a35a35",
    "#2a2240", "#3a2c50", "#4a3860",
    "#5b4f86", "#7a6aa0",
    "#2c3a3a", "#3d4c46", "#56604f",
    "#9a6aa0", "#b47ea6",
    "#4a3038", "#6a4448",
    "#2b3a6a", "#3e4f86",
  ],
} satisfies Meta;

const W = 200, H = 100;
const SHORE = 80; // the far bank of the pond, where the pagoda stands
const PX = 141; // the pagoda's axis
const MOON = [176, 17];
const LX = 53, LB = 98, LS = 1.8; // the lantern's axis, foot and scale
const LAMP = [LX, LB - (LB - 83) * LS]; // its lit opening
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, HILL = 1, TOWN = 2, PAGODA = 3, POND = 4, BANK = 5, TREE = 6, BLOOM = 7, STONE = 8, FLAME = 9;

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

// distance from a point to a segment, and how far along it the nearest point is
function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return [Math.sqrt(ex * ex + ey * ey), k];
}

/*
 * The pagoda, in cells about its axis: returns a shade code or 0 for air.
 * 1 body, 2 roof top, 3 roof underside, 4 roof rim, 5 spire, 6 lit doorway.
 */
const EAVE = [68.5, 58, 48.5, 40, 32.5]; // where each roof's eave sits
const ROOF = [14.5, 13.4, 12.3, 11.2, 10.1]; // each roof's half-width
const BODY = [6.4, 5.9, 5.4, 4.9, 4.4];
function pagoda(dx: number, y: number): number {
  const ax = Math.abs(dx);
  // stone base
  if (y >= 76 && y < SHORE + 0.5) return ax <= 9.5 - (y < 77 ? 1 : 0) ? 1 : 0;
  for (let i = 0; i < 5; i++) {
    const e = EAVE[i], R = ROOF[i];
    // a roof: thin at its upturned tips, rising in a shallow concave curve to the body
    const u = ax / R;
    if (u <= 1) {
      const lift = 3.5 * u * u * u * u;
      const bottom = e - lift + 0.6;
      const top = e - lift - 1.2 - 3.6 * Math.pow(1 - u, 1.7);
      if (y >= top && y < bottom) {
        if (y < top + 0.9) return 4;
        if (y > bottom - 1.0) return 3;
        return 2;
      }
    }
    // the storey beneath this roof, up from the roof below it (or the base)
    const floor = i === 0 ? 76 : EAVE[i - 1] - 3.6;
    if (y >= e + 0.6 && y < floor && ax <= BODY[i]) {
      if (i === 0 && ax <= 1 && y > 72 && y < 75.5) return 6;
      // a railed balcony under each roof
      if (y < e + 2 && ax <= BODY[i] + 1.2) return 3;
      return 1;
    }
    if (i > 0 && y >= e + 0.6 && y < e + 2 && ax <= BODY[i] + 1.2) return 3;
  }
  // the spire: a mast with nine rings and a flame-shaped finial
  const top = EAVE[4] - 1.2 - 3.6 - 0.2;
  if (y < top && y >= 9) {
    if (y >= top - 1.5) return ax <= 2.4 ? 3 : 0; // the roof box
    if (y >= 15 && y < top - 1.5) {
      const ring = Math.floor((y - 15) / 1.2) & 1;
      return ax <= (ring ? 1.4 : 0.55) ? 5 : 0;
    }
    if (y >= 12) return ax <= 1.3 - (y - 12) * 0.2 ? 5 : 0;
    return ax <= 0.6 ? 5 : 0;
  }
  return 0;
}

export default function kyotoDusk(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out = new Array<string>(N);

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
  const warmth = new Float32Array(N); // how much of the lantern's light each cell takes

  // --- sky ----------------------------------------------------------------
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / SHORE);
    // indigo overhead, through violet, to rose and peach low in the west (left)
    const west = Math.exp(-Math.abs(x - 80) / 120);
    let a = smooth(0, 0.5, v);
    let r = mix(0.07, 0.22, a), g = mix(0.07, 0.14, a), b = mix(0.25, 0.38, a);
    a = smooth(0.42, 0.86, v);
    r = mix(r, 0.52, a), g = mix(g, 0.32, a), b = mix(b, 0.58, a);
    a = smooth(0.78, 0.98, v) * (0.55 + 0.45 * west);
    r = mix(r, 1.0, a), g = mix(g, 0.62, a), b = mix(b, 0.48, a);
    const band = Math.exp(-Math.abs(y - 74) / 4) * west * 0.18;
    r += band, g += band * 0.66, b += band * 0.45;
    // a faint unevenness, so no stretch of sky is one flat tone
    const veil = 0.86 + 0.28 * fbm(x * 0.035, y * 0.09, 3, 0);
    r *= veil, g *= veil, b *= veil;
    // the moon's halo
    const dx = x - MOON[0], dy = y - MOON[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    const halo = Math.exp(-d / 5) * 0.24 + Math.exp(-d / 16) * 0.07;
    r += halo * 0.75, g += halo * 0.72, b += halo;
    return [r, g, b];
  };

  // --- the far side: hills, town roofs, the pagoda -------------------------
  // low in the west where the glow is, rising behind the pagoda and the town
  const hillA = (x: number) => 77.5 - (3 + 13 * smooth(70, 175, x)) * (0.3 + 1.1 * fbm(x * 0.022 + 3, 1, 4, 0));
  const hillB = (x: number) => 77 - 2.5 * fbm(x * 0.04 + 9, 2, 4, 0);
  // low tiled roofs along the far bank, a few lit
  const town = (x: number) => {
    const i = Math.floor((x + 3) / 11);
    const f = (x + 3) / 11 - i;
    // a hipped roof: a short level ridge, sloping ends, a gap between houses
    const h = 2 + hash(i, 5) * 2.5;
    const e = Math.abs(f - 0.5) * 2;
    return e > 0.86 ? SHORE : SHORE - 1 - h + Math.max(0, e - 0.35) * 6;
  };

  // --- the cherry tree's skeleton ----------------------------------------
  const branches: number[][] = [
    // trunk, leaning up and to the right
    [16, 101, 20, 86, 5.2, 4.4], [20, 86, 27, 70, 4.4, 3.6], [27, 70, 31, 58, 3.6, 3],
    // limbs
    [31, 58, 50, 46, 3, 2.1], [50, 46, 74, 37, 2.1, 1.4], [74, 37, 98, 31, 1.4, 0.9], [98, 31, 116, 30, 0.9, 0.5],
    [31, 58, 24, 40, 2.6, 1.8], [24, 40, 12, 26, 1.8, 1.1], [12, 26, 0, 18, 1.1, 0.7],
    [29, 50, 42, 30, 2, 1.3], [42, 30, 52, 19, 1.3, 0.8], [52, 19, 70, 13, 0.8, 0.5],
    [50, 46, 60, 52, 1.2, 0.7], [74, 37, 86, 44, 1, 0.5], [42, 30, 66, 24, 1, 0.6], [66, 24, 90, 21, 0.6, 0.4],
    [24, 40, 34, 25, 1, 0.6], [12, 26, 6, 16, 0.7, 0.4], [98, 31, 104, 40, 0.6, 0.35],
    // sprays drooping low over the lantern
    [40, 51, 44, 58, 1.1, 0.4], [58, 43, 62, 55, 0.9, 0.35], [70, 38, 76, 47, 0.7, 0.3],
  ];
  // short twigs off every limb, reaching up and out
  const limbs = branches.length;
  for (let b = 3; b < limbs; b++) {
    const [ax, ay, bx, by, w0, w1] = branches[b];
    const ang = Math.atan2(by - ay, bx - ax);
    for (let j = 0; j < 3; j++) {
      const k = 0.25 + 0.65 * hash(b * 7 + j, 31);
      const sx = mix(ax, bx, k), sy = mix(ay, by, k);
      const turn = (j & 1 ? 1 : -1) * (0.5 + 0.6 * hash(b, j + 40));
      const len = 4 + 7 * hash(b + j, 41);
      const a2 = ang + turn - 0.25;
      branches.push([sx, sy, sx + Math.cos(a2) * len, sy + Math.sin(a2) * len, mix(w0, w1, k) * 0.55, 0.3]);
    }
  }
  // blossom clumps all along the limbs and twigs, thickest at their ends
  const clusters: [number, number, number][] = [];
  for (let b = 3; b < branches.length; b++) {
    const [ax, ay, bx, by, w0] = branches[b];
    const len = Math.hypot(bx - ax, by - ay);
    const n = 1 + Math.round(len / 1.7);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      if (k < 0.3 && w0 > 2) continue;
      const h1 = hash(b * 13 + i, 7), h2 = hash(b * 5 + i, 11), h3 = hash(b * 3 + i, 17);
      const cx = mix(ax, bx, k) + (h1 - 0.5) * 6, cy = mix(ay, by, k) + (h2 - 0.5) * 4.5 - 1;
      // only the drooping sprays (and their twigs) hang below the crown
      const spray = (b >= limbs - 3 && b < limbs) || b >= limbs + 3 * (limbs - 6);
      // the crown is domed: thinner toward its top, never cut by the frame
      const dome = 9 + 10 * Math.pow(clamp(Math.abs(cx - 52) / 70), 1.6);
      if (cx > 122 || cy < dome || cy > (spray ? 55 : 47)) continue;
      clusters.push([cx, cy, 1.4 + 1.6 * h3 + 0.8 * k]);
    }
  }

  const bankX = (y: number) => 38 + (y - SHORE) * 2.3 + 4 * fbm(y * 0.2, 4, 2, 0);

  // build the static picture
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5, xc = x + 0.5;
      let m = SKY, cr: number | undefined, cg: number | undefined, cb: number | undefined, fl = 0.12, warm = 0;
      if (y < SHORE) {
        [cr, cg, cb] = skyAt(xc, y);
        fl = 0.04;
        // distant hills in haze, then a nearer ridge
        if (y >= hillA(xc)) {
          // the Higashiyama hills, flat and violet in the haze
          m = HILL;
          const s = skyAt(xc, hillA(xc));
          const d = smooth(hillA(xc), hillA(xc) + 8, y);
          // wooded slopes: clumps of trees in the haze
          const tex = fbm(xc * 0.3, y * 0.45, 3, 0);
          const a = 0.6 + 0.2 * d + 0.25 * (tex - 0.5);
          cr = mix(s[0], 0.14, a), cg = mix(s[1], 0.08, a), cb = mix(s[2], 0.24, a);
          // the ridge line catches the afterglow
          const lip = smooth(hillA(xc) + 1.4, hillA(xc), y) * 0.3;
          cr = mix(cr, s[0] * 1.1, lip), cg = mix(cg, s[1] * 1.05, lip), cb = mix(cb, s[2], lip);
        }
        if (y >= hillB(xc)) {
          m = HILL;
          const tex = fbm(xc * 0.3, y * 0.3, 3, 0);
          cr = 0.1 + 0.05 * tex, cg = 0.07 + 0.03 * tex, cb = 0.17 + 0.05 * tex;
          // mist settling along the water
          const mist = smooth(hillB(xc) + 1, SHORE, y) * 0.5;
          cr = mix(cr, 0.7, mist), cg = mix(cg, 0.44, mist), cb = mix(cb, 0.58, mist);
        }
        if (y >= town(xc) && xc > 70) {
          m = TOWN;
          cr = 0.08, cg = 0.06, cb = 0.14;
          // the roof ridges catch the sky
          const tf = Math.abs(((xc + 3) / 11) % 1 - 0.5) * 2;
          if (y < town(xc) + 0.9 && tf < 0.45) (cr = 0.5), (cg = 0.31), (cb = 0.44), (fl = 0.06);
          // a few lit shoji under the eaves
          const wi = Math.floor(xc / 4);
          if (y > SHORE - 1.6 && y < SHORE - 0.5 && (xc % 4) < 1.2 && hash(wi, 7) > 0.74) {
            (cr = 1), (cg = 0.66), (cb = 0.32);
            fl = 0.3;
          }
        }
        const p = pagoda(xc - PX, y);
        if (p) {
          m = PAGODA;
          const dx = xc - PX;
          const rim = Math.exp(-Math.abs(dx + 4) / 30); // the sky to the west lights its left
          // dark timber; the tiled roofs pick up the sky, their ridges most of all
          if (p === 1) (cr = 0.07), (cg = 0.05), (cb = 0.12);
          else if (p === 2) (cr = 0.2 + 0.08 * rim), (cg = 0.13 + 0.03 * rim), (cb = 0.27 + 0.04 * rim);
          else if (p === 3) (cr = 0.05), (cg = 0.04), (cb = 0.1);
          else if (p === 4) (cr = 0.9 * rim + 0.25), (cg = 0.5 * rim + 0.15), (cb = 0.5 * rim + 0.3);
          else if (p === 5) (cr = 0.3 + 0.2 * (dx < 0 ? 1 : 0)), (cg = 0.22), (cb = 0.32);
          else if (p === 6) (cr = 0.7), (cg = 0.42), (cb = 0.24), (fl = 0.2);
        }
      } else {
        // the pond, and the near bank where the lantern stands
        if (xc < bankX(y)) {
          m = BANK;
          const tex = fbm(xc * 0.3, y * 0.5, 3, 0);
          cr = 0.08 + 0.05 * tex, cg = 0.08 + 0.05 * tex, cb = 0.1 + 0.05 * tex;
          // fallen petals on the moss
          if (hash(x * 7, r * 3) > 0.975 - 0.015 * smooth(SHORE + 4, H, y)) (cr = 0.42), (cg = 0.22), (cb = 0.3), (fl = 0.06);
          // the stone lip of the pond
          if (xc > bankX(y) - 2.6) {
            const s = 0.85 + 0.3 * hash(x * 3, r * 5);
            (cr = 0.45 * s), (cg = 0.38 * s), (cb = 0.46 * s), (fl = 0.1);
          }
          warm = 1;
        } else m = POND;
      }
      mat[k] = m;
      R[k] = cr || 0, G[k] = cg || 0, B[k] = cb || 0;
      floorA[k] = fl;
      warmth[k] = warm;
    }
  }
  // the reflection source: the far side before the tree covers it
  const RR = R.slice(), RG = G.slice(), RB = B.slice();

  // --- the stone lantern ----------------------------------------------------
  const lantern = (dx: number, y: number): number => {
    const ax = Math.abs(dx);
    if (y >= 93.5 && y < LB) return ax <= 4.2 - (y < 94.5 ? 0.8 : 0) ? 1 : 0; // foot
    if (y >= 87 && y < 93.5) return ax <= 1.4 ? 1 : 0; // post
    if (y >= 85.5 && y < 87) return ax <= 3.6 - (y < 86.2 ? 0.6 : 0) ? 1 : 0; // platform
    if (y >= 80 && y < 85.5) {
      if (ax <= 1.7 && y >= 80.8 && y < 84.8) return 2; // lit opening
      return ax <= 2.9 ? 1 : 0;
    }
    if (y >= 76.5 && y < 80) {
      // the roof, flaring out with upturned corners
      const u = (80 - y) / 3.5;
      const hw = 5.6 - 4.1 * Math.pow(u, 0.8) + (y > 79.2 ? 0.6 : 0);
      return ax <= hw ? 3 : 0;
    }
    if (y >= 73.5 && y < 76.5) return ax <= 1.3 - Math.abs(y - 75) * 0.25 ? 3 : ax <= 0.5 ? 3 : 0; // finial
    return 0;
  };
  // drawn a size up from its plan, standing on the bank
  const at = (xc: number, y: number) => lantern((xc - LX) / LS, LB - (LB - y) / LS);
  for (let r = 45; r < H; r++) {
    for (let x = LX - 14; x <= LX + 14; x++) {
      const y = r + 0.5, xc = x + 0.5;
      const l = at(xc, y);
      if (!l) continue;
      const k = r * W + x;
      const py = LB - (LB - y) / LS, pdx = (xc - LX) / LS;
      if (l === 2) {
        mat[k] = FLAME;
        // hottest at the heart of the firebox
        const c = Math.exp(-(pdx * pdx * 0.5 + (py - 82.8) * (py - 82.8) * 0.35));
        (R[k] = 0.85 + 0.15 * c), (G[k] = 0.5 + 0.38 * c), (B[k] = 0.2 + 0.4 * c * c), (floorA[k] = 0.35);
      } else {
        mat[k] = STONE;
        // dark granite, its top surfaces catching the last of the sky
        const g = 0.8 + 0.4 * hash(x * 5, r * 3);
        const edge = !at(xc, y - 1) ? 1 : 0;
        (R[k] = (0.05 + 0.22 * edge) * g), (G[k] = (0.04 + 0.14 * edge) * g), (B[k] = (0.08 + 0.2 * edge) * g);
        // the roof's underside and the platform take the flame's light
        const under = (l === 3 && py > 78.6) || (py >= 85.5 && py < 86.4);
        if (under) {
          const f = Math.exp(-Math.abs(py - 82.8) / 3) * 0.75;
          (R[k] += f), (G[k] += f * 0.5), (B[k] += f * 0.18);
        }
        floorA[k] = 0.02;
      }
      warmth[k] = l === 2 ? 0 : 0.75;
    }
  }

  // --- the cherry tree -------------------------------------------------------
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < 130; x++) {
      const k = r * W + x;
      const y = r + 0.5, xc = x + 0.5;
      // blossom density: soft clouds, broken up by noise into clumps
      let d = 0, best = 0, up = 0;
      for (const [cx, cy, rad] of clusters) {
        const dx = xc - cx, dy = (y - cy) * 1.15;
        const q = (dx * dx + dy * dy) / (rad * rad);
        if (q < 3) {
          const c = Math.exp(-q * 1.4);
          d += c;
          if (c > best) (best = c), (up = (dy + dx * 0.4) / rad);
        }
      }
      // big holes where the sky shows through, small ones between clumps
      const n = fbm(xc * 0.11, y * 0.15, 3, 0), n2 = noise(xc * 0.5, y * 0.6, 0);
      const bloom = (1 - Math.exp(-d * 1.5)) * (0.15 + 1.35 * n) * (0.75 + 0.5 * n2);
      let onBranch = false, bw = 0;
      for (const [ax, ay, bx, by, w0, w1] of branches) {
        const [dist, kk] = seg(xc, y, ax, ay, bx, by);
        const w = mix(w0, w1, kk) * 0.5 + 0.15;
        if (dist < w) {
          onBranch = true;
          bw = Math.max(bw, (dist / w) * (xc < ax + (bx - ax) * kk ? -1 : 1));
        }
      }
      if (onBranch && bloom < 0.85) {
        mat[k] = TREE;
        // dark bark threading through the blossom; the side toward the lantern catches it
        const lit = smooth(0.35, 1, bw);
        (R[k] = 0.05 + 0.03 * lit), (G[k] = 0.035 + 0.01 * lit), (B[k] = 0.07);
        floorA[k] = 0;
        warmth[k] = 0.8;
      } else if (bloom > 0.5) {
        mat[k] = BLOOM;
        // each spray pale pink on top where the sky lights it, deep rose beneath
        const inner = hash(x * 3, r * 7);
        let b = clamp(0.62 - 0.6 * up + 0.26 * (inner - 0.5) - 0.3 * smooth(0.75, 0.5, bloom));
        b = mix(b, 0.12, smooth(0.3, 1.1, up));
        // the lower crown sits in its own shade
        b *= 1 - 0.3 * smooth(28, 48, y);
        (R[k] = 0.34 + 0.64 * b), (G[k] = 0.08 + 0.62 * b * b), (B[k] = 0.2 + 0.5 * b);
        floorA[k] = 0.1;
        warmth[k] = 1;
      }
    }
  }

  // the lantern's light: how far each cell sits from the lit opening
  const glow = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - LAMP[0], dy = (r + 0.5 - LAMP[1]) * 1.1;
      const d = Math.sqrt(dx * dx + dy * dy);
      glow[r * W + x] = Math.exp(-d / 4) * 0.6 + Math.exp(-d / 11) * 0.32 + Math.exp(-d / 32) * 0.1;
      // the blossom overhead takes the lamp's light from below, from further off
      const m = mat[r * W + x];
      if (m === BLOOM || m === TREE) glow[r * W + x] += Math.exp(-d / 11) * 1.6;
      // and a pool of light on the moss round its foot
      if (m === BANK) {
        const px = (x + 0.5 - LX) / 20, py = (r + 0.5 - LB + 3) / 8;
        glow[r * W + x] += Math.exp(-(px * px + py * py)) * 0.6;
      }
    }

  // a few faint stars in the indigo
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 400; i++) {
    const x = Math.floor(hash(i, 91) * W), r = Math.floor(hash(i, 92) * 40);
    const k = r * W + x;
    if (mat[k] === SKY && hash(i, 93) > 0.72) stars.push([k, hash(i, 94) * 6.28, 0.6 + hash(i, 95) * 1.6]);
  }

  // thin streaks of cloud low in the sky, dark violet, their undersides lit
  // by the set sun; they wrap so they can drift forever
  const CW = 500, C0 = 34, C1 = 68;
  const cdens = (x: number, y: number) =>
    fbm(x * 0.014, y * 0.13, 4, CW * 0.014) - 0.3 * (1 - smooth(C0, C0 + 10, y) * smooth(C1, C1 - 8, y));
  const ccov = new Float32Array(CW * (C1 - C0)), clit = new Float32Array(CW * (C1 - C0));
  for (let r = C0; r < C1; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, d = cdens(x, y);
      ccov[(r - C0) * CW + x] = smooth(0.56, 0.7, d);
      clit[(r - C0) * CW + x] = clamp(0.5 + (d - cdens(x - 1, y + 2.2)) * 7);
    }

  // petals: each with its own drift, fall, sway and tumble
  const petals: { x: number; y: number; vx: number; vy: number; sw: number; sf: number; ph: number; tum: number }[] = [];
  for (let i = 0; i < 50; i++)
    petals.push({
      // most of them near the tree, thinning out downwind
      x: Math.pow(hash(i, 101), 2.2) * 140, y: hash(i, 102) * (H + 20),
      vx: 3 + hash(i, 103) * 4, vy: 1.6 + hash(i, 104) * 2.2,
      sw: 1 + hash(i, 105) * 2, sf: 0.6 + hash(i, 106) * 1.2, ph: hash(i, 107) * 6.28, tum: 2 + hash(i, 108) * 4,
    });
  // petals afloat on the pond, drifting slowly
  const floaters: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) floaters.push([hash(i, 111) * W, SHORE + 3 + hash(i, 112) * 20, 0.3 + hash(i, 113) * 0.5]);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  const pr = new Float32Array(N), pg = new Float32Array(N), pb = new Float32Array(N);
  const pmask = new Uint8Array(N);

  return (t, { color } = {}) => {
    // the flame breathes, with now and then a gutter
    const flick = 0.82 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + 0.12 * (noise(t * 4, 3.3, 0) - 0.5) * 2;
    const cdrift = (((t * 0.8) % CW) + CW) % CW;

    // petals in the air this frame
    pmask.fill(0);
    for (const p of petals) {
      const xx = ((((p.x + p.vx * t + p.sw * Math.sin(t * p.sf + p.ph)) % (W + 40)) + W + 40) % (W + 40)) - 20;
      const yy = ((((p.y + p.vy * t + 0.6 * Math.sin(t * p.sf * 1.7 + p.ph)) % (H + 20)) + H + 20) % (H + 20)) - 10;
      const x = Math.round(xx), r = Math.round(yy);
      if (x < 0 || x >= W || r < 0 || r >= H) continue;
      const k = r * W + x;
      // tumbling, catching light; dim against the dark bank and water
      const face = (0.55 + 0.45 * Math.abs(Math.sin(t * p.tum + p.ph))) * (mat[k] === POND || mat[k] === BANK ? 0.6 : 1);
      const lg = glow[k] * flick * 1.6;
      pr[k] = (1.0 * face + lg * 0.6), pg[k] = (0.76 * face + lg * 0.35), pb[k] = (0.84 * face + lg * 0.1);
      pmask[k] = 1;
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr: number, cg: number, cb: number, fl = floorA[k], fade = 1;
        if (m === POND) {
          // the far side, upside down, shaken by small ripples
          const depth = (y - SHORE) / (H - SHORE);
          const wob = Math.sin(y * 1.7 - t * 2 + Math.sin(x * 0.13 + t * 0.6) * 1.4) * (0.05 + 0.8 * depth);
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          const w = noise(x * 0.14 + t * 0.2, y * 1.1 - t * 0.8, 0);
          // ripples also tip the image up and down, so level lines break
          // (drawn a little stretched, so the pagoda's lower roofs land in the pond)
          let sr = Math.round(SHORE - 1 - (r - SHORE) * 1.35 + (w - 0.5) * 3 * depth);
          sr = sr < 0 ? 0 : sr > SHORE - 1 ? SHORE - 1 : sr;
          const j = sr * W + sx;
          // crisp and bright right under the bank, darker further out
          const lit = mix(0.95, 0.6, smooth(SHORE + 1, SHORE + 6, y)) * (0.8 + 0.4 * w);
          cr = RR[j] * lit * 0.9, cg = RG[j] * lit * 0.92, cb = RB[j] * lit + 0.03;
          const glint = smooth(0.74, 0.95, w) * 0.06;
          cr += glint, cg += glint * 0.8, cb += glint;
          // the lantern's light laid on the water as a broken warm streak
          const sl = Math.exp(-Math.abs(x + 0.5 - LX - 9 - (y - SHORE) * 0.25) / (3.5 + depth * 3)) * smooth(0.45, 0.8, w) * 1.0 * flick;
          cr += sl, cg += sl * 0.62, cb += sl * 0.25;
          fade = smooth(H + 2, H - 9, y);
        } else {
          cr = R[k], cg = G[k], cb = B[k];
          if (m === SKY && r >= C0 && r < C1) {
            const sx = x + cdrift, ix = Math.floor(sx), fx = sx - ix;
            const i0 = (r - C0) * CW + (ix % CW), i1 = (r - C0) * CW + ((ix + 1) % CW);
            const c = ccov[i0] + (ccov[i1] - ccov[i0]) * fx;
            if (c > 0.01) {
              const l = clit[i0] + (clit[i1] - clit[i0]) * fx;
              // brighter undersides toward the west and the horizon
              const sun = l * (0.45 + 0.55 * smooth(C0, C1, y)) * (0.6 + 0.4 * Math.exp(-Math.abs(x - 80) / 90));
              const a = c * 0.85;
              cr = mix(cr, mix(0.2, 1.0, sun), a), cg = mix(cg, mix(0.12, 0.58, sun), a), cb = mix(cb, mix(0.27, 0.5, sun), a);
            }
          }
        }
        // lamplight on everything near the lantern
        const wm = warmth[k];
        if (wm > 0) {
          const g = glow[k] * flick * wm;
          cr += g * 1.0, cg += g * 0.58, cb += g * 0.22;
        } else if (m === SKY || m === POND) {
          const g = glow[k] * flick * 0.6;
          cr += g, cg += g * 0.6, cb += g * 0.3;
        }
        if (m === FLAME) {
          const f = 0.85 + 0.25 * flick;
          (cr = f), (cg = 0.72 * f), (cb = 0.38 * f);
        }
        if (pmask[k] && m !== FLAME) {
          cr = pr[k], cg = pg[k], cb = pb[k], fl = 0.3;
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.02) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    // the moon: a thin crescent, lit on the side toward the set sun
    for (let r = MOON[1] - 6; r <= MOON[1] + 6; r++) {
      for (let x = MOON[0] - 6; x <= MOON[0] + 6; x++) {
        const dx = x + 0.5 - MOON[0], dy = r + 0.5 - MOON[1];
        const inside = dx * dx + dy * dy < 5.2 * 5.2;
        const ex = dx - 2.2, ey = dy + 1.6; // the shadowed disc, offset up and right
        if (inside && ex * ex + ey * ey > 4.9 * 4.9) {
          const k = r * W + x;
          out[k] = "●";
          if (color) color[k] = nearest(1, 0.96, 0.86);
        }
      }
    }
    // stars twinkle
    for (const [k, ph, sp] of stars) {
      const s = Math.sin(t * sp + ph);
      if (s > -0.3) {
        out[k] = s > 0.7 ? "•" : "·";
        if (color) color[k] = nearest(0.9, 0.88, 1);
      }
    }
    // petals resting on the pond
    for (const [fx, fy, sp] of floaters) {
      const x = Math.round((fx + t * sp) % W), r = Math.round(fy + 0.3 * Math.sin(t * 0.8 + fx));
      if (r >= H) continue;
      const k = r * W + x;
      if (mat[k] !== POND) continue;
      out[k] = "•";
      if (color) color[k] = nearest(0.95, 0.72, 0.8);
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
