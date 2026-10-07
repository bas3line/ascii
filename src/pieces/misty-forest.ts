/*
 * misty forest: morning in a pine forest. Ridge after ridge of pines recedes
 * into fog, each paler than the one in front, with mist lying in sheets in the
 * valleys between them. A low sun sits behind the farthest trees and sends
 * beams slanting down through the fog to a clearing on the forest floor. The
 * fog drifts, the beams shimmer, and motes of dust float in the light.
 *
 * Every cell is shaded in colour, layer by layer with the haze of its depth,
 * then drawn as a halftone: dot size from brightness with an ordered dither,
 * colour from the palette entry nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "misty forest",
  category: "scenes",
  note: "pine ridges fading into morning fog, sunbeams slanting through",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#090f0e",
  palette: [
    // sunlight and the warm fog around it
    "#fffbea", "#fff0c8", "#fbe2a6", "#f2c97e", "#e0a95e", "#b9834a",
    // cool fog, pale to sea-green
    "#e4ebe6", "#cbe0dc", "#a8d2d0", "#86c0c2", "#68a7ac", "#4f8c93", "#3b7078",
    // pines, from the haze to the dark in front of us
    "#557570", "#456761", "#365952", "#2a4a44", "#1f3c37", "#172f2b", "#11231f",
    // moss and bark where the light touches the floor
    "#a4a35a", "#8a8f4c", "#6d7440", "#4d5530", "#7a5a3a", "#5b4532",
    // the clear sky above the fog, deepening overhead
    "#a9c3cc", "#8eadb8", "#6f93a2", "#53798a", "#3d6172", "#2b4a5a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const SUN: [number, number] = [146, 45.5];
const SUN_R = 3.4;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const SKY = -1, FLOOR = 5, GIANT = 6;

function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, period: number) {
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

function fbm(x: number, y: number, octaves: number, period: number) {
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

// The ridges, far to near: [ridge row, its rise and fall, tree spacing, tree
// heights from and to, haze, how fast its fog drifts, mist lying in the
// valley below it, drifting fog in front of it, sunbeam in front of it]
const LAYERS = [
  [50, 6, 1.6, 1, 2.5, 0.48, 0.8, 1, 0.14, 0.6],
  [59, 6, 2, 3, 5.5, 0.3, 1.3, 0.8, 0.16, 0.8],
  [69, 7, 2.6, 4, 7, 0.13, 2, 0.66, 0.18, 0.9],
  [80, 6, 3.4, 5, 9, 0.03, 2.8, 0.44, 0.14, 1],
  [90, 1.5, 10, 9, 24, 0.03, 3.4, 0, 0.08, 0.6],
];
const NEAR = LAYERS.length - 1;

export default function mistyForest(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number) => {
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

  // the colour of the fog: cool and green-grey, warming to cream by the sun
  const fogR = (s: number) => mix(0.7, 1.05, s), fogG = (s: number) => mix(0.92, 0.92, s), fogB = (s: number) => mix(0.9, 0.6, s);

  // --- the layers, rasterised far to near so nearer ones cover farther -----
  const layer = new Int8Array(N).fill(SKY);
  const edge = new Float32Array(N); // how much a cell sits on a silhouette's sunward rim
  const below = new Float32Array(N); // rows below the layer's tree line
  const tex = new Float32Array(N); // the lower edge of a tier of boughs, near trees only
  const ground = new Float32Array(N); // the row a cell's ridge rises from, for its valley mist
  LAYERS.forEach(([Y, amp, gap, h0, h1], i) => {
    // nearer ridges dip toward the sun, a valley opening onto the light
    const ridge = (x: number) => Y + amp * (fbm(x * (0.018 + i * 0.003), i * 13 + 2, 3, 0) - 0.5) * (i < 3 ? 4 : 3) + (i > 0 && i < NEAR ? (2 + i * 2) * Math.exp(-(((x - SUN[0] - 4) / 38) ** 2)) : 0);
    const base = Float32Array.from({ length: W }, (_, x) => ridge(x));
    const fill = new Uint8Array(N);
    const spire = new Uint8Array(N);
    for (let x = 0; x < W; x++) for (let r = Math.max(0, Math.floor(ridge(x))); r < H; r++) fill[r * W + x] = 1;
    // pines: a spire of tiers, each tier flaring out and stepping back in
    for (let tx = -2 + hash(i, 1) * gap; tx < W + 2; tx += gap * (0.7 + hash(tx | 0, i + 3) * 0.7)) {
      // the nearest trees leave a clearing under the sun for the light to land in
      if (i === NEAR && tx > 92 && tx < 140) continue;
      const th = h0 + (h1 - h0) * hash(tx * 7 | 0, i + 5);
      const tip = ridge(tx) - th;
      const tier = 2 + th * 0.12;
      for (let r = Math.max(0, Math.floor(tip)); r < Math.min(H, ridge(tx) + 2); r++) {
        const d = r + 0.5 - tip;
        if (d < 0) continue;
        const saw = (d % tier) / tier;
        const half = d * 0.3 * (0.6 + 0.5 * saw) + 0.35;
        for (let x = Math.max(0, Math.floor(tx - half)); x <= Math.min(W - 1, Math.ceil(tx + half)); x++) {
          const dx = Math.abs(x + 0.5 - tx);
          if (dx > half) continue;
          const k = r * W + x;
          fill[k] = spire[k] = 1;
          if (i === NEAR) tex[k] = smooth(0.62, 0.95, saw) * smooth(0.3, 0.85, dx / half) * (0.55 + 0.45 * hash(x, r * 5));
        }
      }
    }
    // where the silhouette starts in each column, smoothed a little so the
    // mist line follows the forest rather than every single spire
    const top = new Float32Array(W).fill(H);
    for (let x = 0; x < W; x++)
      for (let r = 0; r < H; r++)
        if (fill[r * W + x]) {
          top[x] = r;
          break;
        }
    const line = top.map((_, x) => {
      let s = 0;
      for (let d = -3; d <= 3; d++) s += top[Math.min(W - 1, Math.max(0, x + d))];
      return Math.max(s / 7, top[x]);
    });
    const open = (xx: number, rr: number) => xx >= 0 && xx < W && (rr < 0 || !fill[rr * W + xx]);
    for (let r = 0; r < H; r++)
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (!fill[k]) continue;
        layer[k] = i === NEAR && !spire[k] ? FLOOR : i;
        if (i !== NEAR) tex[k] = 0;
        below[k] = r + 0.5 - line[x];
        ground[k] = base[x];
        // a rim where the sky (or a farther layer) shows beside or above
        const toward = x < SUN[0] ? 1 : -1;
        edge[k] = open(x + toward, r) || open(x, r - 1) ? 1 : open(x + 2 * toward, r) ? 0.5 : 0;
      }
  });

  // --- what stands in front: a giant pine cut by the left of the frame, and a
  // smaller one at the right edge, so the frame is not a symmetric curtain ---
  const giant = new Uint8Array(N);
  for (const [gx, tip, spread, tier] of [[9, -12, 15, 7], [192, 12, 7, 5]]) {
    for (let r = Math.max(0, Math.floor(tip)); r < H; r++) {
      const d = r + 0.5 - tip;
      const saw = (d % tier) / tier;
      // each tier of boughs sweeps out and droops, so the outline is a stack
      // of points rather than a straight edge where it meets the frame
      const half = Math.min(spread * (0.5 + 0.5 * saw), d * 0.34 * (0.45 + 0.7 * saw) + 0.5);
      for (let x = Math.max(0, Math.floor(gx - half)); x <= Math.min(W - 1, Math.ceil(gx + half)); x++) {
        const dx = Math.abs(x + 0.5 - gx);
        // the side toward the frame stays full, so no sliver of sky shows there
        const outer = (x + 0.5 - gx) * (gx - W / 2) > 0 ? 1.6 : 1;
        const ragged = half * outer * (0.82 + 0.3 * noise(x * 0.5, r * 0.4, 0));
        if (dx <= ragged || dx < 0.9) {
          const k = r * W + x;
          giant[k] = 1;
          tex[k] = smooth(0.66, 0.96, saw) * smooth(0.25, 0.8, dx / ragged) * (0.5 + 0.5 * hash(x * 3, r));
        }
      }
    }
  }
  for (let k = 0; k < N; k++) if (giant[k]) (layer[k] = GIANT), (below[k] = 0);
  // a rim two cells deep on the side that faces the sun
  {
    const open = (x: number, r: number) => x >= 0 && x < W && (r < 0 || !giant[r * W + x]);
    for (let r = 0; r < H; r++)
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (!giant[k]) continue;
        const tx = x < SUN[0] ? 1 : -1;
        edge[k] = open(x + tx, r) || open(x, r - 1) ? 1 : open(x + 2 * tx, r) ? 0.6 : 0;
      }
  }

  // --- static colour --------------------------------------------------------
  const sr = new Float32Array(N), sg = new Float32Array(N), sb = new Float32Array(N);
  const fogAmt = new Float32Array(N); // how much drifting fog shows in front of a cell
  const fogSpeed = new Float32Array(N);
  const rayAmt = new Float32Array(N); // how much of a sunbeam the air in front of it holds
  const sunS = new Float32Array(N); // nearness to the sun, for the fog's warmth
  const floorLit = new Float32Array(N); // where a beam that reaches the floor lights it
  const lift = new Float32Array(N); // the dot floor, so the darkest air still shows
  const cloudAmt = new Float32Array(N); // where high cloud can show, in the sky only
  const abin = new Float32Array(N), dist = new Float32Array(N);
  const RA = 720;
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const L = layer[k];
      const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
      const ang = Math.atan2(dy, dx);
      abin[k] = ((ang / (Math.PI * 2)) * RA + RA) % RA;
      const d = (dist[k] = Math.sqrt(dx * dx + dy * dy));
      const s = (sunS[k] = Math.exp(-Math.sqrt(dx * dx + dy * dy * 1.96) / 30));
      // a soft warm bloom over a wide radius, in the air and the fog
      const bloom = Math.exp(-d / 16) * 0.25 + Math.exp(-d / 6) * 0.1;
      let cr: number, cg: number, cb: number, ray: number;
      if (L === SKY) {
        // sky: deep overhead, paling to the fog band low down, warm by the sun
        const v = clamp(y / 52);
        const p = Math.pow(v, 1.6);
        const veil = 0.95 + 0.1 * fbm(x * 0.04, y * 0.08, 3, 0);
        cr = mix(0.065, 0.36, p) * veil, cg = mix(0.14, 0.58, p) * veil, cb = mix(0.17, 0.62, p) * veil;
        // the fog band the far ridge stands in
        const band = 0.75 * smooth(28, 50, y) * (0.55 + 0.75 * fbm(x * 0.025, y * 0.16, 3, 0));
        cr = mix(cr, fogR(0), band), cg = mix(cg, fogG(0), band), cb = mix(cb, fogB(0), band);
        // warm in hue round the sun, but falling off in brightness, so the
        // disc stands in a halo rather than a flat blaze
        const kw = s * 0.55, kb = 0.5 + 0.5 * Math.exp(-d / 9);
        cr = mix(cr, fogR(s) * kb, kw), cg = mix(cg, fogG(s) * kb, kw), cb = mix(cb, fogB(s) * kb, kw);
        const glow = Math.exp(-d / 3) * 0.3 + Math.exp(-d / 10) * 0.18;
        cr += glow + bloom, cg += glow * 0.9 + bloom * 0.78, cb += glow * 0.66 + bloom * 0.45;
        // the disc itself, a little brighter in the middle
        const disc = smooth(SUN_R + 0.6, SUN_R - 0.4, d);
        cr = mix(cr, 1.3, disc), cg = mix(cg, 1.24, disc), cb = mix(cb, 1.08, disc);
        fogAmt[k] = 0.3 * smooth(30, 50, y);
        fogSpeed[k] = 0.4;
        cloudAmt[k] = 0.75 * smooth(5, 15, y) * smooth(44, 28, y) * smooth(SUN_R + 2, SUN_R + 8, d);
        ray = 0.35 * smooth(26, 46, y);
        lift[k] = 0.04;
      } else if (L <= NEAR - 1) {
        const [, , , , , haze, speed, M, drift, beam] = LAYERS[L];
        // pine: dark teal, paling with distance; mist pooled just under the
        // tree line, and a sheet of it lying along the valley floor below
        const pool = smooth(2.5, 8 + L * 1.5, below[k]) * smooth(20, 11, below[k]);
        // the sheet follows the lie of the land, smoothly, so it never streaks
        const sheet = Math.exp(-(((y - (ground[k] + 5)) / 3) ** 2)) * (0.75 + 0.5 * fbm(x * 0.035, L * 7.3, 3, 0));
        const mist = clamp(Math.max(pool * 0.5, sheet) * M);
        const h = clamp(haze + (1 - haze) * mist);
        const veil = 0.9 + 0.2 * fbm(x * 0.06, y * 0.12, 3, 0);
        const pr = 0.02, pg = 0.075, pb = 0.07;
        cr = mix(pr, fogR(s) * veil, h), cg = mix(pg, fogG(s) * veil, h), cb = mix(pb, fogB(s) * veil, h);
        cr += bloom * h, cg += bloom * 0.78 * h, cb += bloom * 0.45 * h;
        const rim = edge[k] * s * (0.2 + 0.6 * (1 - haze));
        cr += rim * 0.95, cg += rim * 0.8, cb += rim * 0.45;
        fogAmt[k] = drift;
        fogSpeed[k] = speed;
        // the trees stop most of the light; the beams show in the mist between
        // (far off there is more air in front of them to hold the light)
        ray = beam * (L < 3 ? 0.45 + 0.55 * clamp(mist / M) : 0.25 + 0.75 * clamp(mist / M));
        lift[k] = 0.03;
      } else if (L === NEAR) {
        // the nearest pines: near-black, a faint teal on each tier's lower edge
        const g = tex[k] * 0.12;
        // (the body itself stays black, or the dither would screen it evenly)
        cr = 0.001 + g * 0.35, cg = 0.004 + g, cb = 0.004 + g * 0.9;
        const rim = edge[k] * (0.12 + 0.6 * s);
        cr += rim * 0.9, cg += rim * 0.7, cb += rim * 0.38;
        fogAmt[k] = LAYERS[L][8];
        fogSpeed[k] = LAYERS[L][6];
        ray = 0.12;
        lift[k] = 0;
      } else if (L === FLOOR) {
        // the forest floor: moss in clumps, sparse, fading out toward the frame
        const clump = smooth(0.42, 0.72, fbm(x * 0.09, y * 0.4, 3, 0));
        const speck = hash(x * 7, r * 11) > 0.55 ? 1 : 0.35;
        const m = (0.06 + 0.3 * clump) * speck * smooth(H + 2, H - 8, y);
        cr = 0.02 + m * 0.6, cg = 0.03 + m * 0.62, cb = 0.02 + m * 0.3;
        fogAmt[k] = 0.06;
        fogSpeed[k] = 3.4;
        ray = 0;
        // dappled patches the beams can land on
        floorLit[k] = smooth(0.32, 0.56, fbm(x * 0.06 + 3, y * 0.24, 3, 0)) * smooth(H + 3, H - 6, y);
        lift[k] = 0;
      } else {
        // the giants: near-black needles, the tiers drawn by a faint teal edge,
        // a warm rim two cells deep toward the light
        const g = tex[k] * 0.15;
        cr = 0.001 + g * 0.35, cg = 0.004 + g, cb = 0.004 + g * 0.9;
        // warm on the side near the sun, a cool fog-lit edge far from it
        const warm = Math.exp(-d / 50);
        const rim = edge[k] * (0.13 + 0.55 * warm);
        cr += rim * mix(0.4, 0.95, warm), cg += rim * mix(0.75, 0.66, warm), cb += rim * mix(0.72, 0.32, warm);
        fogAmt[k] = 0.04;
        fogSpeed[k] = 4;
        ray = 0.04;
        lift[k] = 0;
      }
      // the beams fan out mostly down and to the west, the way the gaps face
      ray *= 0.2 + 0.8 * smooth(1.25, 1.75, ang) * smooth(3.1, 2.6, ang);
      rayAmt[k] = ray;
      sr[k] = cr, sg[k] = cg, sb[k] = cb;
    }

  // drifting fog banks: wide soft noise that wraps so it can slide forever
  const FW = 400;
  const fog = new Float32Array(FW * H);
  for (let r = 0; r < H; r++)
    for (let u = 0; u < FW; u++) fog[r * FW + u] = smooth(0.42, 0.75, fbm(u * 0.022, r * 0.09, 4, FW * 0.022));

  // thin high cloud, long and flat, lit from below by the low sun
  const CH = 46;
  const cloud = new Float32Array(FW * CH);
  for (let r = 0; r < CH; r++)
    for (let u = 0; u < FW; u++) {
      const q = fbm(u * 0.01, r * 0.05, 2, FW * 0.01);
      cloud[r * FW + u] = smooth(0.44, 0.68, fbm(u * 0.016 + q * 1.5, r * 0.17, 4, FW * 0.016));
    }

  // sunbeams: a handful of wide shafts through the gaps, [angle, half width,
  // strength], with a faint grain along each, and a slower pattern sliding
  // across them so they brighten and fade
  const SHAFTS = [[1.42, 0.05, 0.7], [1.66, 0.07, 1], [1.93, 0.05, 0.8], [2.18, 0.08, 1], [2.45, 0.05, 0.75], [2.7, 0.06, 0.9], [2.95, 0.04, 0.6]];
  const rayA = new Float32Array(RA), rayB = new Float32Array(RA);
  for (let i = 0; i < RA; i++) {
    const a = (i / RA) * Math.PI * 2;
    let v = 0;
    for (const [c, w, st] of SHAFTS) v = Math.max(v, st * smooth(w, w * 0.35, Math.abs(a - c)));
    rayA[i] = v * (0.8 + 0.2 * fbm(i * 0.4, 3.1, 2, RA * 0.4));
    rayB[i] = smooth(0.4, 0.7, fbm(i * 0.03, 8.7, 2, RA * 0.03));
  }

  // dust in the air: [x, y, drift speed, bob phase, size]
  const motes: [number, number, number, number, number][] = [];
  for (let i = 0; i < 110; i++) motes.push([hash(i, 1) * W, 50 + hash(i, 2) * 44, 0.3 + hash(i, 3) * 0.8, hash(i, 4) * 6.28, hash(i, 5)]);
  const mote = new Float32Array(N);
  const moteCells: number[] = [];

  return (t, { color } = {}) => {
    for (const k of moteCells) mote[k] = 0;
    moteCells.length = 0;
    for (const [mx, my, sp, ph, sz] of motes) {
      const x = Math.floor((((mx + t * sp + 2.5 * Math.sin(t * 0.4 + ph)) % W) + W) % W);
      const y = Math.floor(my + 2 * Math.sin(t * 0.3 + ph * 1.7) - ((t * sp * 0.2) % 6));
      if (y < 0 || y >= H) continue;
      const k = y * W + x;
      mote[k] = 0.5 + 0.5 * sz;
      moteCells.push(k);
    }
    // the beams hold their places (the gaps in the trees do not move) and
    // only sway a hair; a second, slower pattern drifts across them
    const shiftA = 2 * Math.sin(t * 0.35), shiftB = -t * 1.6;
    const pulse = 0.88 + 0.12 * Math.sin(t * 0.7);

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr = sr[k], cg = sg[k], cb = sb[k];
        const s = sunS[k];

        // the fog banks drift, nearer ones faster
        const fa = fogAmt[k];
        if (fa > 0.01) {
          const u = x + t * fogSpeed[k], ui = Math.floor(u), uf = u - ui;
          const f0 = fog[r * FW + (ui % FW)], f1 = fog[r * FW + ((ui + 1) % FW)];
          const a = (f0 + (f1 - f0) * uf) * fa;
          cr = mix(cr, fogR(s), a), cg = mix(cg, fogG(s), a), cb = mix(cb, fogB(s), a);
        }

        const ca = cloudAmt[k];
        if (ca > 0.01) {
          const u = x + t * 0.6, ui = Math.floor(u), uf = u - ui;
          const c0 = cloud[r * FW + (ui % FW)], c1 = cloud[r * FW + ((ui + 1) % FW)];
          const a = (c0 + (c1 - c0) * uf) * ca;
          if (a > 0.005) {
            // cool grey-teal, warming to gold on the undersides near the sun
            const w = Math.exp(-dist[k] / 40);
            cr = mix(cr, mix(0.26, 0.95, w), a), cg = mix(cg, mix(0.38, 0.72, w), a), cb = mix(cb, mix(0.42, 0.45, w), a);
          }
        }

        // the beams: brightest near the sun, fading with distance
        const ra = rayAmt[k], fl = floorLit[k];
        let beam = 0;
        if (ra > 0.01 || fl > 0.01) {
          const ai = abin[k];
          const ia = Math.floor(ai + shiftA), ib = Math.floor(ai + shiftB);
          beam = rayA[((ia % RA) + RA) % RA] * (0.6 + 0.4 * rayB[((ib % RA) + RA) % RA]) * pulse;
        }
        if (ra > 0.01 && dist[k] > SUN_R) {
          // lit shafts brighten the air, the shadows between them dim it
          const fall = Math.exp(-dist[k] / 80) * smooth(SUN_R, 12, dist[k]);
          const b = (beam - 0.3) * fall * ra * 2.2;
          if (b > 0) cr += b * 1.05, cg += b * 0.8, cb += b * 0.42;
          else {
            const dim = 1 + b;
            cr *= dim, cg *= dim, cb *= dim;
          }
        }
        if (fl > 0.01) {
          // a patch of sun on the moss where a beam lands
          const b = beam * fl * 1.1;
          cr += b * 1.0, cg += b * 0.78, cb += b * 0.4;
        }

        let floor = lift[k];
        if (mote[k] && dist[k] > 6) {
          // a mote shows up where a beam catches it
          const ia = Math.floor(abin[k] + shiftA);
          const lit = rayA[((ia % RA) + RA) % RA] * Math.exp(-dist[k] / 90);
          const v = mote[k] * (0.1 + 1.6 * lit) * Math.min(1, rayAmt[k] * 2);
          if (v > 0.18) {
            cr = Math.max(cr, v * 1.05), cg = Math.max(cg, v * 0.97), cb = Math.max(cb, v * 0.7);
            floor = 0.3;
          }
        }

        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.9) * 0.95);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const sc = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * sc), clamp(cg * sc), clamp(cb * sc));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
