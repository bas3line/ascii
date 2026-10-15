/*
 * volcano night: a stratovolcano erupting over a black lava field. Fountains
 * of lava burst from the crater and fall back as sparks, rivers of lava wind
 * down the slopes carrying dark crust plates, and an ash plume towers over it
 * all, lit red from below, with lightning flickering inside. The lake in front
 * holds the glow, broken up by ripples.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "volcano night",
  category: "scenes",
  note: "a volcano erupting at night, lava rivers, an ash plume full of lightning",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#070405",
  palette: [
    "#5a1a10", "#7a2410", "#982e0e", "#b8380b", "#d4480b", "#ea5e10", "#f77a18", "#ff9628",
    "#ffb244", "#ffcc63", "#ffe28c", "#fff3c0", "#fffcec",
    "#4a3a37", "#63504b", "#7d6863", "#98827b", "#b39d94", "#cdb9af",
    "#8a4a3a", "#a85a40", "#c87048",
    "#3c4258", "#5d6280", "#8a90b4", "#b4b9dc", "#dfe2f7", "#b9a8ff", "#f4f0ff",
    "#1a1012", "#2c1a18",
  ],
} satisfies Meta;

const W = 200, H = 100;
const CX = 100; // the crater
const RIM = 40; // the summit's height, in rows
const BASE = 86; // where the cone's slopes would meet flat ground
const HIGH = BASE - RIM;
const SPAN = 32; // how broadly the slopes flare
const PLAIN = 76; // the far edge of the lava field
const SHORE = 81; // the lake's edge, roughly
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, ROCK = 1, LAKE = 2;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise, wrapping every `px` lattice cells in x and `py` in y when set.
function noise(x: number, y: number, px = 0, py = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let x0 = xi, x1 = xi + 1, y0 = yi, y1 = yi + 1;
  if (px) (x0 = ((xi % px) + px) % px), (x1 = (x0 + 1) % px);
  if (py) (y0 = ((yi % py) + py) % py), (y1 = (y0 + 1) % py);
  const a = hash(x0, y0), b = hash(x1, y0), c = hash(x0, y1), d = hash(x1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, py = 0): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, 0, py * f);
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

// The cone's profile: flat at the summit, concave slopes flaring to the plain.
const coneY = (x: number) => {
  const d = Math.abs(x - CX);
  if (d < 6) return RIM + 0.9 * (1 - (d / 6) ** 2) - 0.6;
  return BASE - HIGH / (1 + ((d - 6) / SPAN) ** 1.6) + 1.4 * (fbm(x * 0.13, 1.3, 3) - 0.5) * smooth(6, 20, d);
};
// How far from the crater the slope reaches at a given row (the inverse of coneY).
const reach = (y: number) => {
  const f = (BASE - y) / HIGH;
  if (f >= 1) return 6;
  if (f <= 0.05) return 95;
  return Math.min(95, 6 + SPAN * Math.pow(1 / f - 1, 1 / 1.6));
};
// The plume's spine leans right as it rises; it widens and mushrooms at the top.
const plumeX = (y: number) => CX + 0.01 * (RIM - y) ** 2;
const plumeW = (y: number) => 8 + 27 * Math.pow(Math.max(0, RIM - y) / RIM, 0.55) + 16 * smooth(14, -3, y);

export default function volcanoNight(): Frame {
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

  // --- the land and the lake, built once ----------------------------------
  const mat = new Uint8Array(N);
  const rock = new Float32Array(N); // gullies and rubble texture, 0..1
  const crack = new Float32Array(N); // glowing seams in the lava field
  const phase = new Float32Array(N);
  const shoreAt = new Float32Array(W);
  const topAt = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    shoreAt[x] = SHORE + 2 * (fbm(x * 0.045, 9, 3) - 0.5) * 2 + 0.7 * noise(x * 0.3, 2);
    topAt[x] = Math.min(coneY(x + 0.5), PLAIN + 1.6 * (fbm(x * 0.06, 5, 3) - 0.5));
  }
  // Worley seams for the cooled field, squashed by distance into thin lines.
  const cellPt = (i: number, j: number) => [i + hash(i, j * 7 + 1), j + hash(i * 3 + 5, j)];
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      if (y >= shoreAt[x]) mat[k] = LAKE;
      else if (y >= topAt[x]) {
        mat[k] = ROCK;
        // gullies run down the slope, rubble below
        rock[k] = 0.55 * fbm(x * 0.3 + y * 0.04 * (x < CX ? -1 : 1) * 3, y * 0.07, 3) + 0.45 * fbm(x * 0.5, y * 0.5, 2);
        if (y > PLAIN - 3) {
          const sx = x / 7, sy = (y - PLAIN) / 2.6 + 40;
          const ix = Math.floor(sx), iy = Math.floor(sy);
          let f1 = 9, f2 = 9;
          for (let j = iy - 1; j <= iy + 1; j++)
            for (let i = ix - 1; i <= ix + 1; i++) {
              const [px, py] = cellPt(i, j);
              const d = Math.hypot(px - sx, py - sy);
              if (d < f1) (f2 = f1), (f1 = d);
              else if (d < f2) f2 = d;
            }
          const near = smooth(PLAIN - 3, PLAIN + 3, y);
          crack[k] = smooth(0.16, 0.02, f2 - f1) * near * (0.4 + 0.6 * fbm(x * 0.08, y * 0.2, 2));
          phase[k] = fbm(x * 0.05, y * 0.1, 2) * 12;
        }
      }
    }
  }

  // --- the lava rivers: winding lines down the face of the cone -------------
  // Each row of the table: start row, end row, start and end fraction of the
  // slope's reach (negative is left), width, wiggle, phase.
  const RIVERS = [
    [41.5, 75, -0.55, -0.5, 1, 0.09, 0.3],
    [41.5, 77, 0.45, 0.32, 1, 0.08, 2.1],
    [42, 80, -0.08, -0.22, 1.3, 0.06, 4.0],
    [43, 70, 0.15, 0.7, 0.8, 0.07, 5.2],
    [45, 73, -0.3, -0.85, 0.75, 0.05, 1.4],
  ];
  const rivId = new Uint8Array(N).fill(255);
  const rivS = new Float32Array(N); // distance along the river
  const rivA = new Float32Array(N); // across it, -1 at one bank to 1 at the other
  const rivK = new Float32Array(N); // how far down, 0 at the crater to 1 at the toe
  const rivGlow = new Float32Array(N); // light the rivers throw on the rock around them
  RIVERS.forEach(([y0, y1, f0, f1, wm, amp, ph], id) => {
    const pts: number[][] = [];
    let s = 0, lx = 0, ly = 0;
    for (let y = y0; y <= y1; y += 0.25) {
      const k = (y - y0) / (y1 - y0);
      const f = f0 + (f1 - f0) * smooth(0, 1, k) + amp * Math.sin(k * Math.PI * 4 + ph) + 0.05 * (noise(k * 7, id * 7) - 0.5);
      const x = CX + f * reach(y);
      if (pts.length) s += Math.hypot(x - lx, y - ly);
      pts.push([x, y, s, k]);
      (lx = x), (ly = y);
    }
    for (let r = Math.floor(y0) - 3; r < Math.min(H, y1 + 5); r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (mat[k] !== ROCK) continue;
        const y = r + 0.5;
        let bd = 1e9, bi = 0;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (Math.abs(p[1] - y) > 7) continue;
          const d = (p[0] - x - 0.5) ** 2 + (p[1] - y) ** 2;
          if (d < bd) (bd = d), (bi = i);
        }
        if (bd > 1e8) continue;
        const [px, , ps, pk] = pts[bi];
        const d = Math.sqrt(bd);
        // narrow at the vent, broader downhill, fanning out where it pools
        const hw = (0.55 + 1.3 * pk + 1.4 * smooth(0.85, 1, pk)) * wm;
        const heat = 1 - 0.55 * pk;
        rivGlow[k] = Math.max(rivGlow[k], Math.exp(-Math.max(0, d - hw) / 2.2) * heat);
        if (d < hw && (rivId[k] === 255 || d / hw < Math.abs(rivA[k]))) {
          rivId[k] = id;
          rivS[k] = ps;
          rivA[k] = (x + 0.5 < px ? -1 : 1) * (d / hw);
          rivK[k] = pk;
        }
      }
    }
  });

  // --- the plume: two tall noise textures that wrap, scrolled upward ---------
  const PH = 160;
  const texA = new Float32Array(W * PH);
  const texB = new Float32Array(W * PH);
  for (let r = 0; r < PH; r++)
    for (let x = 0; x < W; x++) {
      const q = fbm(x * 0.03, r * 0.03, 3, PH * 0.03);
      texA[r * W + x] = fbm(x * 0.07 + q * 1.5, r * 0.07, 4, PH * 0.07);
      texB[r * W + x] = fbm(x * 0.12 + 40, r * 0.12, 3, PH * 0.12);
    }
  const sample = (tex: Float32Array, x: number, y: number) => {
    const yi = Math.floor(y), fy = y - yi;
    const r0 = ((yi % PH) + PH) % PH, r1 = (r0 + 1) % PH;
    const xi = Math.max(0, Math.min(W - 1, x | 0));
    return tex[r0 * W + xi] + (tex[r1 * W + xi] - tex[r0 * W + xi]) * fy;
  };

  // a faint unevenness in the night sky
  const haze = new Float32Array(N);
  for (let k = 0; k < N; k++) haze[k] = fbm((k % W) * 0.04, Math.floor(k / W) * 0.07, 3);

  // --- the lava fountains: glowing arcs, and loose sparks, each its own clock --
  const ARCS = 34;
  const SPARKS = 110;
  const G = 50;
  const sp = Array.from({ length: ARCS + SPARKS }, (_, i) => ({
    vx: (hash(i, 1) - 0.5) * 2,
    vy: hash(i, 2),
    period: 2.6 + 1.4 * hash(i, 3),
    off: hash(i, 4) * 10,
    x0: (hash(i, 5) - 0.5) * 4,
  }));

  const R = new Float32Array(N), Gc = new Float32Array(N), B = new Float32Array(N);
  const floorAt = new Float32Array(N);
  const fadeAt = new Float32Array(N).fill(1);
  for (let k = 0; k < N; k++) {
    const r = Math.floor(k / W);
    // the dark should stay dark: no floor, so unlit cells are bare ground
    floorAt[k] = 0;
    if (mat[k] === LAKE) fadeAt[k] = smooth(H + 6, H - 6, r + 0.5);
  }
  const addR = new Float32Array(N), addG = new Float32Array(N), addB = new Float32Array(N);
  const splat = (x: number, y: number, a: number, cr: number, cg: number, cb: number) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= W || yi < 0 || yi >= H) return;
    const k = yi * W + xi;
    if (mat[k] === LAKE) return;
    // the brightest pass wins, so crossing arcs never melt into a blob
    if (cr * a > addR[k]) (addR[k] = cr * a), (addG[k] = cg * a), (addB[k] = cb * a);
  };

  return (t, { color } = {}) => {
    addR.fill(0), addG.fill(0), addB.fill(0);

    // Fountains, beating harder every few seconds.
    const surge = 0.65 + 0.35 * Math.sin(t * 1.3) * Math.sin(t * 0.47 + 1);
    for (let i = 0; i < ARCS + SPARKS; i++) {
      const s = sp[i];
      const tt = t + s.off;
      const n = Math.floor(tt / s.period);
      const tau = tt - n * s.period;
      // Each launch a little different in height and lean. An arc is a clot of
      // lava thrown wide that leaves a long glowing trail; a spark is a point.
      const arc = i < ARCS;
      const kick = (0.82 + 0.3 * hash(i, n + 99)) * (0.8 + 0.25 * surge);
      const vy = (arc ? 30 + 18 * s.vy : 18 + 24 * s.vy) * kick;
      const vx = (arc ? (0.35 + 0.65 * Math.abs(s.vx)) * Math.sign(s.vx) * 20 : s.vx * 11) * kick + 1;
      const life = (2 * vy) / G + 0.7;
      if (tau > life) continue;
      const tail = arc ? 0.34 : 0.04;
      const steps = arc ? 26 : 2;
      for (let j = 0; j <= steps; j++) {
        const u = tau - (j / steps) * tail;
        if (u < 0) break;
        const x = CX + s.x0 + vx * u;
        const y = RIM - 0.8 - vy * u + 0.5 * G * u * u;
        if (y > coneY(x) + 1.5) continue; // landed
        const age = u / life;
        // white-hot at the head, cooling to deep orange down the trail
        const f = j / steps;
        const a = (1 - 0.75 * f) * (1 - 0.5 * age) * (arc ? 1.1 : 0.75);
        splat(x, y, a, 1, mix(0.95, 0.35, Math.min(1, age + f * 0.6)), mix(0.65, 0.04, Math.min(1, age * 1.4 + f)));
      }
    }

    // Lightning: a bolt in some quarter-second slots, struck twice and fading.
    const slot = Math.floor(t / 0.3), sf = t / 0.3 - slot;
    let bolt = 0, bx = 0, by = 0;
    const boltCells: number[] = [];
    if (hash(slot, 77) > 0.8) {
      bolt = sf < 0.15 ? 1 : sf < 0.3 ? 0.25 : sf < 0.5 ? 0.85 : Math.max(0, 0.85 - (sf - 0.5) * 2);
      let y = 4 + hash(slot, 3) * 8;
      let x = plumeX(y) + (hash(slot, 4) - 0.5) * plumeW(y) * 1.1;
      const len = 10 + hash(slot, 5) * 12;
      (bx = x), (by = y + len / 2);
      const branchAt = 3 + Math.floor(hash(slot, 6) * 5);
      let brx = 0, bry = 0;
      for (let i = 0; i < len; i++) {
        const nx = x + (hash(slot * 31 + i, 8) - 0.5) * 3.2;
        const ny = y + 1;
        for (let q = 0; q <= 2; q++) boltCells.push(Math.round(mix(x, nx, q / 2)) + Math.round(mix(y, ny, q / 2)) * W);
        (x = nx), (y = ny);
        if (i === branchAt) (brx = x), (bry = y);
      }
      // a short fork
      for (let i = 0; i < 6 && brx; i++) {
        brx += hash(slot, 40 + i) < 0.5 ? 1.3 : -1.3;
        bry += 0.8;
        boltCells.push(Math.round(brx) + Math.round(bry) * W);
      }
    }

    const rise = t * 3.2;
    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = 0, cg = 0, cb = 0;
        const dcx = x + 0.5 - CX, dcy = (y - RIM + 1) * 1.4;
        const dc = Math.sqrt(dcx * dcx + dcy * dcy);

        if (m === SKY) {
          // The eruption's glow fills the sky behind the cone: hottest low
          // around the summit, deep red higher up, fading into night, so the
          // cone stands out black against it.
          const v = y / PLAIN;
          const veil = 0.85 + 0.3 * haze[k];
          const gx = dcx / 66, gy = (y - RIM - 12) / 38;
          const glow = 0.5 * Math.exp(-(gx * gx + gy * gy) * 2.2) + 0.16 * Math.exp(-dc / 14) + 0.2 * Math.pow(v, 6);
          const warm = smooth(0, RIM + 20, y); // orange low down, deep red higher
          cr = (0.005 + glow) * veil;
          cg = (0.005 + glow * (0.1 + 0.22 * warm)) * veil;
          cb = (0.012 + glow * 0.05) * veil;

          // the plume
          let c = 0;
          if (y < RIM + 1) {
            // swellings that climb the column, so its flanks billow as it rises
            const px = plumeX(y), pw = plumeW(y) * (1 + 0.13 * Math.sin((y + rise) * 0.42) + 0.07 * Math.sin((y + rise) * 0.9 + 2));
            const e = 1 - Math.abs(x + 0.5 - px) / pw;
            if (e > -0.5) {
              const a = sample(texA, x, y + rise);
              const b = sample(texB, x - t * 1.5, y + rise * 1.6);
              const d = 0.65 * a + 0.35 * b;
              c = smooth(0.0, 0.2, e + (a - 0.5) * 2.5 + (b - 0.5) * 0.7) * smooth(-1, 3, y);
              if (c > 0.01) {
                // billows lit from beneath: denser than the air just below
                const below = 0.65 * sample(texA, x, y + 3.5 + rise) + 0.35 * sample(texB, x - t * 1.5, y + 3.5 + rise * 1.6);
                const lb = clamp(0.45 + (d - below) * 13);
                const up = RIM - y;
                // charcoal ash, and the fire's light caught on the undersides
                const heat = Math.exp(-up / 10) * 0.6 + 0.16 * Math.exp(-up / 30);
                // just above the vent the column is darker, so the arcs show against it
                const young = 0.3 + 0.7 * smooth(RIM - 4, RIM - 20, y);
                const l2 = lb * lb;
                // heavy lumps: shadowed folds near black, lit bulges pale grey
                const body = (0.15 + 0.5 * l2) * (0.7 + 0.3 * clamp(e * 2)) * young;
                const fire = heat * (0.2 + 1.1 * l2) * (0.45 + 0.55 * smooth(RIM - 2, RIM - 12, y));
                let pr = body + fire * 0.95;
                let pg = body * 0.86 + fire * (0.18 + 0.25 * Math.exp(-up / 6));
                let pb = body * 0.8 + fire * 0.05;
                if (bolt) {
                  const dl = Math.hypot(x + 0.5 - bx, (y - by) * 0.8);
                  const L = bolt * (Math.exp(-dl / 5) * 0.6 + Math.exp(-dl / 16) * 0.22) * (0.3 + 0.9 * lb);
                  (pr += 0.7 * L), (pg += 0.66 * L), (pb += 0.95 * L);
                }
                const al = Math.min(1, c * 1.15);
                cr = mix(cr, pr, al);
                cg = mix(cg, pg, al);
                cb = mix(cb, pb, al);
              }
            }
          }
          if (c < 0.05 && hash(x, r * 3 + 11) > 0.982) {
            // stars, washed out near the glow
            const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + hash(x, r) * 3) + hash(r, x) * 6.28);
            const s = (0.35 + 0.5 * tw) * smooth(0.25, 0.04, glow) * smooth(PLAIN - 4, 20, y);
            (cr = Math.max(cr, s * 0.85)), (cg = Math.max(cg, s * 0.87)), (cb = Math.max(cb, s));
          }
        } else if (m === ROCK) {
          // black basalt, rimmed red by the light falling on it
          const s = rock[k];
          cr = 0.012 + 0.04 * s;
          cg = 0.01 + 0.024 * s;
          cb = 0.012 + 0.024 * s;
          const rg = rivGlow[k];
          const up = Math.exp(-dc / 6) * 0.9 + Math.exp(-dc / 22) * 0.06;
          // a thin rim of light along the crest, and the lava's glow on the slopes
          const brow = smooth(topAt[x] + 1.4, topAt[x], y) * 0.55 * Math.exp(-dc / 90);
          const lit = (rg * 0.22 + rg * rg * 0.3 + up + brow) * (0.4 + 0.9 * s);
          cr += lit * 0.9;
          cg += lit * 0.22;
          cb += lit * 0.05;
          const id = rivId[k];
          if (id !== 255) {
            const a = rivA[k], kk = rivK[k];
            const sv = rivS[k];
            // a hot core, cooler at the banks and downhill
            const heat = clamp((1 - 0.75 * a * a) * (1 - 0.5 * kk) + 0.2 * (noise(sv * 0.9 - t * 4.5, a * 2 + id * 9) - 0.5));
            let lr = 0.75 + 0.3 * heat, lg = 0.12 + 0.75 * heat * heat, lb = 0.02 + 0.35 * heat ** 4;
            // crust plates riding the flow, more of them as it cools
            const pn = noise(sv * 0.32 - t * 0.95, a * 1.3 + id * 13) * 0.7 + noise(sv * 0.8 - t * 2.4, a * 2.6 + id * 5) * 0.3;
            const th = 0.6 - 0.22 * kk + 0.12 * a * a;
            const plate = smooth(th, th + 0.05, pn);
            const seam = smooth(th - 0.05, th, pn) * (1 - plate);
            const dark = 0.13 + 0.12 * noise(sv * 1.5 - t * 0.95 * 4.7, a * 4);
            lr = mix(lr, dark, plate) + seam * 0.3;
            lg = mix(lg, dark * 0.3, plate) + seam * 0.15;
            lb = mix(lb, dark * 0.2, plate);
            const edge = smooth(1, 0.75, Math.abs(a));
            cr = mix(cr, lr, edge);
            cg = mix(cg, lg, edge);
            cb = mix(cb, lb, edge);
          } else if (crack[k] > 0.01) {
            const pulse = 0.55 + 0.45 * Math.sin(t * 0.9 + phase[k]);
            const g = crack[k] * pulse * (0.5 + rg);
            cr += 0.75 * g;
            cg += 0.18 * g;
            cb += 0.03 * g;
          }
        } else {
          // the lake: the scene above, stretched down and torn into ripples
          const sh = shoreAt[x];
          const depth = y - sh;
          const w = noise(x * 0.05 + t * 0.15, y * 0.9 - t * 0.9) * 0.6 + noise(x * 0.15 - t * 0.3, y * 1.6 - t * 1.6) * 0.4;
          const sx = Math.max(1, Math.min(W - 2, Math.round(x + (w - 0.5) * 4)));
          const sy = Math.max(0, Math.min(Math.floor(shoreAt[sx]) - 1, Math.round(sh - depth * 3 - 1 - (w - 0.5) * 4)));
          const sk = sy * W + sx;
          const band = 0.3 + 1.1 * smooth(0.35, 0.7, w);
          const dim = 1.05 * (1 - depth / 45);
          // a little smeared sideways, as ripples do
          const rr = 0.5 * R[sk] + 0.25 * (R[sk - 1] + R[sk + 1]);
          const rg = 0.5 * Gc[sk] + 0.25 * (Gc[sk - 1] + Gc[sk + 1]);
          const rb = 0.5 * B[sk] + 0.25 * (B[sk - 1] + B[sk + 1]);
          cr = 0.01 + rr * band * dim;
          cg = 0.01 + rg * band * dim * 0.9;
          cb = 0.02 + rb * band * dim * 0.9;
          // a dark line where the water meets the shore
          const lip = smooth(1.5, 0, depth);
          (cr *= 1 - 0.7 * lip), (cg *= 1 - 0.7 * lip), (cb *= 1 - 0.7 * lip);
        }

        if (m !== LAKE) {
          // the vent's own light, and the fountains
          const vg = Math.exp(-dc / 1.4) * 1.3 + Math.exp(-dc / 5) * 0.2;
          cr += vg + addR[k];
          cg += vg * 0.55 + addG[k];
          cb += vg * 0.18 + addB[k];
        }
        (R[k] = cr), (Gc[k] = cg), (B[k] = cb);
      }
    }
    for (const c of boltCells) {
      if (c < 0 || c >= N || mat[c] !== SKY) continue;
      const v = Math.min(1, bolt * 1.4);
      (R[c] = mix(R[c], 0.92, v)), (Gc[c] = mix(Gc[c], 0.9, v)), (B[c] = mix(B[c], 1, v));
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        // a black point, so the faintest light leaves the ground bare
        const cr = Math.max(0, R[k] - 0.025), cg = Math.max(0, Gc[k] - 0.025), cbl = Math.max(0, B[k] - 0.025);
        const floor = floorAt[k];
        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fadeAt[k];
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
