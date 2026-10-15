/*
 * prism city: a skyline at blue hour seen across a river. In the middle stands
 * the tallest tower, black glass under a pyramid spire, its white beacon
 * blinking and a thin line of light running up its edges every few seconds.
 * Above the city hangs one low cloud, two lobes on a flat base, lit orange from
 * below by the streets. Windows come on and go off, warning lights blink on the
 * rooftops, a train crosses the viaduct, and the river smears it all into
 * rippling streaks.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 * The river is drawn last, from the frame above it, so whatever moves in the
 * city moves in the water too. Everything repeats every twelve seconds.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "prism city",
  category: "scenes",
  note: "a black spire and an orange cloud over a blue hour city and its river",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#06080f",
  palette: [
    "#111a33", "#16213f", "#1c2a50", "#233463", "#2b4077", "#364e8b", "#445f9f", "#5874b2", "#7089c0", "#8a9cc4",
    "#a3b1cf", "#c8d2e4", "#eef1f6", "#ffffff",
    "#ffe9ae", "#ffd27c",
    "#4a2a2a", "#6e3a24", "#9a4a1c", "#c85f17", "#f38020", "#f8a040", "#fbc06e", "#ffdca6",
    "#3a3352", "#544766",
    "#0e1220", "#1a2030", "#283044",
    "#9c2a26", "#ff4b3e",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 12; // seconds, after which every motion is back where it began
const TAU = Math.PI * 2;
const BANK = 64; // the top of the viaduct, where the buildings stand
const WL = 70; // the first row of water
const TX = 100.5; // the tower's axis
const SHAFT_HALF = 7; // the shaft's half width
const HALF = 10; // the spire's, at its base
const SHOULDER = 37; // where the shaft ends and the spire begins
const APEX = SHOULDER - HALF * Math.sqrt(3); // an equilateral spire
const CLOUD_BASE = 42;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, CLOUD = 1, BACK = 2, FRONT = 3, TOWER = 4, SPIRE = 5, DECK = 6, ARCH = 7, WATER = 8;

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

// The cloud's outline as a signed distance: a big lobe on the left, a smaller
// one on the right, small feet at either end, all cut off on one flat base.
function cloudDist(x: number, y: number): number {
  const circ = (cx: number, cy: number, r: number) => Math.hypot(x - cx, y - cy) - r;
  const bx = Math.max(62 - x, x - 128, 0), by = Math.max(32 - y, 0);
  let d = Math.min(circ(84, 25, 17), circ(114, 30, 11), circ(64, 35, 7), circ(126, 36, 6), Math.hypot(bx, by) - 0.01);
  d += (fbm(x * 0.13, y * 0.13, 3) - 0.5) * 3.2 * smooth(CLOUD_BASE, CLOUD_BASE - 6, y);
  return Math.max(d, y - CLOUD_BASE);
}

interface Block {
  x0: number;
  x1: number;
  top: number;
  kind: number; // 0 grid of windows, 1 lit floors in bands, 2 sparse
}

export default function prismCity(): Frame {
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

  // --- the skyline, two rows of blocks ------------------------------------
  const back: Block[] = [];
  for (let x = -2, i = 0; x < W; i++) {
    const w = 5 + Math.floor(hash(i, 1) * 7);
    // a little taller toward the middle, where the tower draws them up
    const top = 55 + Math.floor(hash(i, 2) * 6) - Math.round(7 * Math.exp(-(((x - 100) / 45) ** 2)));
    back.push({ x0: x, x1: x + w, top, kind: hash(i, 3) < 0.5 ? 2 : 0 });
    x += w;
  }
  const front: Block[] = [
    // a few tall ones, so the skyline has a shape and frames the tower
    { x0: 28, x1: 37, top: 41, kind: 0 },
    { x0: 59, x1: 67, top: 46, kind: 1 },
    { x0: 141, x1: 150, top: 44, kind: 0 },
    { x0: 166, x1: 173, top: 39, kind: 1 },
  ];
  for (let x = -3, i = 0; x < W; i++) {
    const w = 6 + Math.floor(hash(i, 11) * 9);
    let top = 52 + Math.floor(hash(i, 12) * 10);
    if (x + w > 86 && x < 115) top = Math.max(top, 58); // keep the tower's shaft clear
    front.push({ x0: x, x1: x + w, top, kind: Math.floor(hash(i, 13) * 3) });
    x += w + Math.floor(hash(i, 14) * 2);
  }

  // --- the static picture -------------------------------------------------
  const mat = new Uint8Array(N);
  const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
  const flo = new Float32Array(N);
  const win = new Float32Array(N); // how bright a lit pane is; negative for a cool white one
  const edge = new Float32Array(N).fill(-1); // distance up the tower's lit edge, 0 at the street to 1 at the apex
  const stars: [number, number, number][] = []; // [cell, rate, phase]
  const reds: [number, number, number][] = []; // rooftop warning lights: [x, row, phase]

  const SHAFT = BANK - SHOULDER, SIDE = 2 * HALF; // the spire's sides are as long as its base
  const PATH = SHAFT + SIDE;

  for (let r = 0; r < WL; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const xc = x + 0.5, y = r + 0.5;
      const v = y / BANK;
      // sky: deep blue overhead to a paler, faintly warm haze over the city
      const veil = 0.9 + 0.2 * fbm(x * 0.04, y * 0.07, 3);
      const low = Math.exp(-(BANK - y) / 7) * 0.2;
      let cr = (0.025 + 0.2 * v * v) * veil + low * 0.75;
      let cg = (0.045 + 0.29 * v * v) * veil + low * 0.55;
      let cb = (0.12 + 0.48 * Math.pow(v, 1.5)) * veil + low * 0.5;
      let m = SKY, fl = 0.15;

      // the cloud, lit from below: hot orange along the base, cooler and
      // darker up into the lobes, brightest over the middle of the city
      const d = cloudDist(xc, y);
      if (d < 1.2) {
        const c = smooth(1.2, -1.2, d);
        const lb = Math.pow(smooth(6, CLOUD_BASE, y), 1.6);
        const hb = Math.exp(-(((xc - 98) / 40) ** 2));
        const puff = fbm(x * 0.09, y * 0.12, 4) - fbm(x * 0.09, (y + 2.5) * 0.12, 4); // billows that face down catch the light
        const belly = smooth(CLOUD_BASE - 7, CLOUD_BASE - 1, y) * 0.25; // the flat underside, closest to the streets
        const b = clamp(0.1 + 0.8 * lb * (0.55 + 0.45 * hb) + 1.0 * puff + belly);
        let kr, kg, kb;
        if (b < 0.35) (kr = mix(0.28, 0.6, b / 0.35)), (kg = mix(0.14, 0.27, b / 0.35)), (kb = mix(0.16, 0.12, b / 0.35));
        else if (b < 0.72) (kr = mix(0.6, 0.95, (b - 0.35) / 0.37)), (kg = mix(0.27, 0.5, (b - 0.35) / 0.37)), (kb = mix(0.12, 0.12, (b - 0.35) / 0.37));
        else (kr = mix(0.95, 1, (b - 0.72) / 0.28)), (kg = mix(0.5, 0.85, (b - 0.72) / 0.28)), (kb = mix(0.12, 0.6, (b - 0.72) / 0.28));
        const s = 0.35 + 0.65 * b;
        cr = mix(cr, kr * s, c), cg = mix(cg, kg * s, c), cb = mix(cb, kb * s, c);
        if (c > 0.5) m = CLOUD;
      }
      if (m === SKY) {
        // the cloud's light spilling onto the sky round it, mostly underneath
        const halo = Math.exp(-Math.max(0, d) / 4.5) * (0.08 + 0.22 * smooth(20, CLOUD_BASE + 4, y)) * Math.exp(-(((xc - 96) / 50) ** 2));
        cr += halo, cg += halo * 0.45, cb += halo * 0.12;
        if (y < 26 && d > 3 && hash(x, r * 3 + 11) > 0.99) stars.push([k, 1 + Math.floor(hash(x, r) * 3), hash(r, x) * TAU]);
      }

      // the back row: hazy, blue grey, its windows dim
      for (const b of back) {
        if (xc < b.x0 || xc >= b.x1 || y < b.top || y >= BANK) continue;
        m = BACK;
        const lx = x - Math.floor(b.x0), ry = r - b.top;
        cr = 0.06, cg = 0.085, cb = 0.16;
        if (ry === 0) (cr += 0.04), (cg += 0.05), (cb += 0.08);
        if (lx === 0) (cr -= 0.02), (cg -= 0.025), (cb -= 0.04);
        const hz = smooth(BANK - 14, BANK, y) * 0.04; // the haze thickens at the foot
        cr += hz, cg += hz * 1.1, cb += hz * 1.4;
        fl = 0.05;
        if (ry >= 2 && ry % 2 === 0 && lx % 2 === 1 && xc < b.x1 - 1 && hash(k, 4) < (b.kind === 2 ? 0.18 : 0.3)) win[k] = (hash(k, 5) < 0.3 ? -1 : 1) * (0.35 + 0.2 * hash(k, 6));
      }

      // the front row: darker, nearer, brighter windows
      for (let bi = 0; bi < front.length; bi++) {
        const b = front[bi];
        if (xc < b.x0 || xc >= b.x1 || y < b.top || y >= BANK) continue;
        m = FRONT;
        const lx = x - Math.floor(b.x0), ry = r - b.top, bw = b.x1 - b.x0;
        const tone = 0.85 + 0.3 * hash(bi, 31);
        cr = 0.025 * tone, cg = 0.033 * tone, cb = 0.065 * tone;
        if (ry === 0) (cr += 0.07), (cg += 0.09), (cb += 0.14); // the parapet catches the sky
        if (lx === bw - 1) (cr += 0.03), (cg += 0.04), (cb += 0.07);
        fl = 0.02;
        win[k] = 0;
        if (ry >= 2 && lx >= 1 && lx < bw - 1) {
          let lit = 0;
          if (b.kind === 0) lit = ry % 2 === 0 && lx % 2 === 1 && hash(k, 7) < 0.4 ? 1 : 0;
          else if (b.kind === 1) lit = ry % 3 === 0 && hash(bi * 64 + ry, 8) < 0.4 && hash(k, 8) < 0.75 ? 1 : 0;
          else lit = ry % 2 === 0 && lx % 3 === 1 && hash(k, 9) < 0.3 ? 1 : 0;
          if (lit) win[k] = (hash(bi, 10) < 0.35 ? -1 : 1) * (0.6 + 0.35 * hash(k, 11));
        }
        if (b.top < 50 && ry === 0 && lx === Math.floor(bw / 2)) reds.push([x, r - 1, hash(bi, 12) * 2]);
      }
      // the tower: black glass, then the spire, an exact triangle
      const dx = Math.abs(xc - TX);
      if (y >= SHOULDER && y < BANK && dx <= SHAFT_HALF) {
        m = TOWER;
        win[k] = 0;
        // near black, one cool line down the edge the sky lights, floors only
        // just visible
        cr = 0.01, cg = 0.012, cb = 0.022;
        if (xc - TX > SHAFT_HALF - 1) (cr += 0.05), (cg += 0.07), (cb += 0.11);
        if (r % 4 === 0) (cr += 0.008), (cg += 0.01), (cb += 0.016);
        fl = 0;
        if (dx > SHAFT_HALF - 1) edge[k] = (BANK - y) / PATH;
      }
      if (y >= APEX && y < SHOULDER) {
        // wider than the shaft, so it reads as a triangle set on top
        const hw = ((y - APEX) / (SHOULDER - APEX)) * HALF;
        if (dx <= hw + 0.25) {
          m = SPIRE;
          win[k] = 0;
          cr = 0.012, cg = 0.012, cb = 0.02;
          fl = 0;
          if (dx > hw - 1) {
            edge[k] = (SHAFT + ((SHOULDER - y) / (SHOULDER - APEX)) * SIDE) / PATH;
            (cr += 0.05), (cg += 0.05), (cb += 0.065); // the spire's edges, just catching light
          }
        }
      }

      // the viaduct along the far bank, arches down to the water
      if (y >= BANK) {
        const ax = x % 16;
        const crown = BANK + 2.2 + 2.6 * ((ax - 8.5) / 6.5) ** 2;
        if (y < BANK + 2 || ax < 2 || y < crown) {
          m = DECK;
          const s = r === BANK ? 0.1 : 0.03 + 0.015 * fbm(x * 0.4, y * 0.4, 2);
          cr = s * 0.9, cg = s, cb = s * 1.5;
          fl = 0.02;
          // a lamp on the face of every pier
          if (ax === 0 && r === BANK + 2) (cr = 0.95), (cg = 0.72), (cb = 0.4), (fl = 0.3);
        } else {
          m = ARCH;
          cr = 0.012, cg = 0.016, cb = 0.03;
          fl = 0.02;
        }
      }
      mat[k] = m;
      sR[k] = cr, sG[k] = cg, sB[k] = cb, flo[k] = fl;
    }
  }

  // The water: a fixed phase per cell, so its ripples have grain.
  const ph1 = new Float32Array(N), ph2 = new Float32Array(N);
  for (let r = WL; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      mat[k] = WATER;
      ph1[k] = fbm(x * 0.05, r * 0.4, 3) * 9;
      ph2[k] = fbm(x * 0.03 + 40, r * 0.25, 3) * 7;
    }
  }

  const fR = new Float32Array(N), fG = new Float32Array(N), fB = new Float32Array(N);
  const fF = new Float32Array(N); // this frame's floors: the static ones, plus the train's while it passes
  const w1 = (TAU * 3) / LOOP, w2 = (TAU * 2) / LOOP;
  const TRAIN = 4 * 13 - 1; // four cars of twelve, a gap between each
  // the lights that streak down the river, found afresh each frame
  const lc = new Uint8Array(W);
  const lRow = new Float32Array(W * 8), lA = new Float32Array(W * 8);
  const lR = new Float32Array(W * 8), lG = new Float32Array(W * 8), lB = new Float32Array(W * 8);

  // Adds a soft light round (lx, ly) to the city above the water.
  const glow = (lx: number, ly: number, rad: number, a: number, gr: number, gg: number, gb: number, skipTower: boolean) => {
    const n = Math.ceil(rad * 3);
    for (let r = Math.max(0, Math.floor(ly - n)); r < Math.min(WL, ly + n); r++) {
      for (let x = Math.max(0, Math.floor(lx - n)); x < Math.min(W, lx + n); x++) {
        const k = r * W + x;
        if (skipTower && (mat[k] === TOWER || mat[k] === SPIRE)) continue;
        const dd = Math.hypot(x + 0.5 - lx, r + 0.5 - ly);
        const g = a * Math.exp(-dd / rad);
        fR[k] += g * gr, fG[k] += g * gg, fB[k] += g * gb;
      }
    }
  };

  return (t, { color } = {}) => {
    const tl = ((t % LOOP) + LOOP) % LOOP;
    // the light runs up the tower's edges every four seconds, then the
    // beacon at the apex flares as it arrives
    const run = (tl % 4) / 1.6;
    const flare = Math.exp(-((((tl % 4) - 1.75) / 0.35) ** 2));
    const blink = tl % 1.5 < 0.3 ? 1 : 0.15;
    const head = ((tl / LOOP) * 300 + 130) % 300 - 10; // the train's nose

    // --- the city ----------------------------------------------------------
    fF.set(flo);
    for (let r = 0; r < WL; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr = sR[k], cg = sG[k], cb = sB[k];
        const wv = win[k];
        if (wv !== 0) {
          // most windows stay as they are; some switch every three seconds
          const ph = hash(k, 21) * LOOP;
          const on = hash(k, 22) < 0.7 ? true : hash(k, 23 + (Math.floor((tl + ph) / 3) % 4)) < 0.55;
          if (on) {
            const s = Math.abs(wv);
            if (wv > 0) (cr += s), (cg += s * 0.78), (cb += s * 0.42);
            else (cr += s * 0.82), (cg += s * 0.88), (cb += s);
          }
        }
        const e = edge[k];
        if (e >= 0 && run < 1.5) {
          // a bright head drawing the line behind it, which holds until the
          // beacon flares and then fades
          const hold = run <= 1 ? 1 : smooth(1.5, 1, run);
          const g = (e <= run ? 0.3 + 0.7 * Math.exp(-(run - e) * 10) : Math.exp(-(((e - run) * 40) ** 2))) * hold;
          cr += g, cg += g, cb += g;
        }
        fR[k] = cr, fG[k] = cg, fB[k] = cb;
      }
    }
    for (const [k, rate, ph] of stars) {
      const s = 0.35 + 0.3 * Math.sin((TAU * rate * tl) / LOOP * 3 + ph);
      fR[k] = Math.max(fR[k], s * 0.9), fG[k] = Math.max(fG[k], s * 0.93), fB[k] = Math.max(fB[k], s);
    }
    for (const [x, r, ph] of reds) {
      const on = (tl + ph) % 2 < 0.45 ? 1 : 0;
      if (!on) continue;
      const k = r * W + x;
      fR[k] = 1, fG[k] = 0.3, fB[k] = 0.25;
      glow(x + 0.5, r + 0.5, 1.2, 0.35, 1, 0.25, 0.2, false);
    }
    // the train, running left to right along the deck, lit carriages and a headlamp
    for (let x = Math.max(0, Math.floor(head - TRAIN)); x < Math.min(W, head + 1); x++) {
      const u = Math.floor(head - x); // cells back from the nose
      if (u < 0 || u >= TRAIN || u % 13 === 12) continue;
      const c = u % 13;
      for (let r = BANK - 4; r < BANK; r++) {
        const k = r * W + x;
        let cr = 0.12, cg = 0.14, cb = 0.2;
        const row = r - (BANK - 4);
        if (row === 0) (cr = 0.2), (cg = 0.23), (cb = 0.3);
        else if (row === 3) (cr = 0.04), (cg = 0.05), (cb = 0.08);
        else if (c > 0 && c < 11 && c % 3 !== 0) (cr = 0.8), (cg = 0.68), (cb = 0.45);
        if (u === 0 && row === 2) (cr = 1), (cg = 1), (cb = 1);
        fR[k] = cr, fG[k] = cg, fB[k] = cb;
        fF[k] = 0.1;
      }
    }
    if (head >= 0 && head < W + 6) glow(head + 1, BANK - 1.5, 2.2, 0.45, 1, 0.95, 0.85, false);
    // the beacon on the apex
    const bk = Math.floor(APEX - 1) * W + Math.floor(TX);
    const bv = Math.max(blink, flare);
    fR[bk] += bv, fG[bk] += bv, fB[bk] += bv;
    glow(TX, APEX - 0.5, 1.4 + 2.2 * flare, 0.3 * blink + 0.75 * flare, 1, 0.98, 0.95, true);

    // --- the river ------------------------------------------------------------
    // Every bright point below the cloud, plus the beacon, throws a long
    // streak down the water: up to eight a column, nearest the bank first.
    lc.fill(0);
    for (let x = 0; x < W; x++) {
      for (let r = WL - 1; r > CLOUD_BASE && lc[x] < 8; r--) {
        const k = r * W + x;
        // lights, not the bright sky between the towers (unless the train is passing in front of it)
        const train = r >= BANK - 4 && head - x >= 0 && head - x < TRAIN;
        if ((mat[k] === SKY || mat[k] === CLOUD) && !train) continue;
        const pk = Math.max(fR[k], fG[k], fB[k]);
        if (pk < 0.45) continue;
        const i = x * 8 + lc[x]++;
        lRow[i] = r, lA[i] = (0.55 * Math.min(0.8, pk - 0.3)) / pk;
        lR[i] = fR[k], lG[i] = fG[k], lB[i] = fB[k];
      }
    }
    {
      const x = Math.floor(TX), i = x * 8 + Math.min(7, lc[x]);
      lc[x] = Math.min(8, lc[x] + 1);
      lRow[i] = APEX - 1, lA[i] = 0.5 * bv + 0.2;
      lR[i] = 1, lG[i] = 1, lB[i] = 1;
    }

    for (let r = WL; r < H; r++) {
      const d = r - WL + 0.5;
      // the mirror is squeezed toward the far bank, so the cloud reaches the water
      const src = WL - 0.5 - d * 2.1 - d * d * 0.015;
      const near = d / (H - WL);
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const w = 0.55 * Math.sin(x * 0.09 + r * 1.3 + ph1[k] - w1 * tl) + 0.45 * Math.sin(x * 0.04 - r * 0.7 + ph2[k] + w2 * tl);
        // the swell: cold blue, darker toward us
        const swell = 0.5 + 0.45 * w;
        let cr = (0.045 - 0.015 * near) * swell, cg = (0.085 - 0.025 * near) * swell, cb = (0.2 - 0.06 * near) * swell;
        // rows pushed sideways together, more so near us, so streaks waver
        const wob = (0.55 * Math.sin(r * 0.8 + 1.7 * Math.sin(x * 0.05) - w1 * 2 * tl) + 0.45 * Math.sin(r * 0.37 + x * 0.03 + w2 * tl)) * (0.6 + 2.6 * near);
        const sx = Math.min(W - 1, Math.max(0, Math.round(x + wob)));
        // the mirror itself, faint: sky, cloud and the dark shapes of the towers
        let rr = 0, gg = 0, bb = 0;
        for (let i = 0; i < 3; i++) {
          const j = Math.max(0, Math.min(WL - 1, Math.round(src - i * 1.2))) * W + sx;
          rr += fR[j], gg += fG[j], bb += fB[j];
        }
        const dash = 0.3 + 0.9 * smooth(-0.2, 0.6, Math.sin(r * 1.1 + ph2[k] - w1 * 2 * tl)); // broken by the ripples
        const ma = 0.16 * (0.5 + 0.5 * swell + 0.3 * dash);
        rr *= ma, gg *= ma, bb *= ma;
        // and the streaks, each reaching from the bank to past its mirror image
        for (let i = sx * 8, e = i + lc[sx]; i < e; i++) {
          const dm = (WL - lRow[i]) / 2.1;
          const g = lA[i] * dash * smooth(-1.5, dm * 0.4 + 0.5, d) * Math.exp(-Math.max(0, d - dm) / 9) * (0.85 - 0.3 * near);
          rr += lR[i] * g, gg += lG[i] * g, bb += lB[i] * g;
        }
        // where warm light lies on the water it replaces the blue, so the
        // streaks stay gold instead of mixing to grey
        const kill = 1 - 0.85 * clamp((rr - bb) * 3);
        cr = cr * kill + rr, cg = cg * kill + gg, cb = cb * kill + bb;
        const haze = Math.exp(-d / 2.2) * 0.06; // a pale line where the bank meets the water
        cr += haze * 0.7, cg += haze * 0.85, cb += haze;
        fR[k] = cr, fG[k] = cg, fB[k] = cb;
        fF[k] = 0.14;
      }
    }

    // --- halftone -----------------------------------------------------------
    for (let r = 0; r < H; r++) {
      const fade = r >= WL ? smooth(H, H - 16, r + 0.5) : 1; // the bottom rows thin out into the ground
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = fR[k], cg = fG[k], cbl = fB[k];
        const floor = fF[k];
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
