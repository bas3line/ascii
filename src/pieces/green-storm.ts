/*
 * green storm: a night thunderstorm rolling over a dark sea. Every few seconds
 * a giant strike comes down in the shape of the Supabase bolt, emerald with a
 * white hot centre, lighting the undersides of the clouds and the hills below
 * green, and leaving an afterimage that fades. Smaller jagged bolts flicker in
 * between, and rain slants through all of it.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "green storm",
  category: "scenes",
  note: "a thunderstorm at sea, the lightning striking in the supabase bolt",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0e0e0e",
  palette: [
    "#1c1c1c", "#242424", "#2e2e2e", "#3a3a3a", "#4a4a4a", "#5e5e5e", "#777777", "#939393", "#b4b4b4", "#d6d6d6",
    "#1d2a24", "#243a30", "#2d4d3e", "#3a6450", "#4d8066", "#67a084",
    "#0f3324", "#14472f", "#1a5e3e", "#22784f", "#2c9663", "#36b578", "#3ecf8e", "#65dba5", "#8fe6be", "#bdf2d8",
    "#e6fbf1", "#ffffff",
  ],
} satisfies Meta;

// The Supabase bolt, as the library's own supabase piece draws it: anything
// not a space is inside. Its cells are text cells, twice as tall as wide.
const INK = String.raw`
                      000000
                     0000000
                   000000000
                 00000000000
                000000000000
              00000000000000
             000000000000000
           00000000000000000
         0000000000000000000
        00000000000000000000000000000000000000000000
      00000000000000000000000000000000000000000000000
     000000000000000000000000000000000000000000000000
   00000000000000000000000000000000000000000000000000
  00000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000
  00000000000000000000000000000000000000000000000
   00000000000000000000000000000000000000000000
                           000000000000000000
                           00000000000000000
                           000000000000000
                           00000000000000
                           000000000000
                           0000000000
                           000000000
                           0000000
                           000000
`;

const W = 200, H = 100;
const HORIZON = 76;
const BOLT_TOP = 28; // the big strike hangs from the cloud base here down to the horizon
const LOOP = 10.8; // three strikes, then it all comes round again
const STRIKES: [number, number][] = [[0, 100], [3.6, 74], [7.2, 126]]; // [when, centre x]
// The small bolts: [when, seed]. One lands at t = 6, so the still has one.
const FORKS: [number, number][] = [[1.5, 1], [2.95, 2], [5.1, 3], [6.0, 4], [8.8, 5], [9.9, 6]];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const EM = [0.243, 0.812, 0.557]; // #3ecf8e

const AIR = 0, HILL = 1, SEA = 2;

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

// Distance from every cell to the nearest cell where `inside` is false, by a
// two-pass chamfer; good enough for glows and a hot core.
function chamfer(inside: Uint8Array): Float32Array {
  const d = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) d[k] = inside[k] ? 1e4 : 0;
  const A = 1, B = Math.SQRT2;
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (!d[k]) continue;
      let v = d[k];
      if (x > 0) v = Math.min(v, d[k - 1] + A);
      if (r > 0) {
        v = Math.min(v, d[k - W] + A);
        if (x > 0) v = Math.min(v, d[k - W - 1] + B);
        if (x < W - 1) v = Math.min(v, d[k - W + 1] + B);
      }
      d[k] = v;
    }
  for (let r = H - 1; r >= 0; r--)
    for (let x = W - 1; x >= 0; x--) {
      const k = r * W + x;
      if (!d[k]) continue;
      let v = d[k];
      if (x < W - 1) v = Math.min(v, d[k + 1] + A);
      if (r < H - 1) {
        v = Math.min(v, d[k + W] + A);
        if (x < W - 1) v = Math.min(v, d[k + W + 1] + B);
        if (x > 0) v = Math.min(v, d[k + W - 1] + B);
      }
      d[k] = v;
    }
  return d;
}

// The strike's light: a hard first flash, two flickers, then nothing.
const flashAt = (a: number) =>
  a < 0 ? 0 : Math.exp(-a / 0.16) + 0.75 * Math.exp(-(((a - 0.33) / 0.07) ** 2)) + 0.5 * Math.exp(-(((a - 0.6) / 0.08) ** 2));
// The afterimage burnt into the eye, fading for a couple of seconds.
const afterAt = (a: number) => (a < 0 ? 0 : Math.exp(-a / 1.8));

export default function greenStorm(): Frame {
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

  // --- the bolt, scaled up from the logo grid -----------------------------
  const grid = INK.slice(1, -1).split("\n");
  const GR = grid.length, GC = Math.max(...grid.map((l) => l.length));
  const ink = (c: number, r: number) => (r >= 0 && r < GR && c >= 0 && c < GC && grid[r][c] && grid[r][c] !== " " ? 1 : 0);
  const scale = (HORIZON - BOLT_TOP) / (GR * 2); // square cells per logo column
  // the logo's lowest point, so the tip lands on the horizon
  let tipCol = 0;
  for (let c = 0; c < GC; c++) if (ink(c, GR - 1)) tipCol += c / grid[GR - 1].trim().length;
  tipCol += 0.5;
  // and its highest, where the channel leaves the cloud
  let topCol = 0;
  for (let c = 0; c < GC; c++) if (ink(c, 0)) topCol += c / grid[0].trim().length;
  topCol += 0.5;
  const bolts = STRIKES.map(([, cx]) => {
    const x0 = cx - (GC * scale) / 2;
    const mask = new Float32Array(N);
    const solid = new Uint8Array(N);
    for (let r = 0; r < H; r++)
      for (let x = 0; x < W; x++) {
        // bilinear over the logo's cells, then a hard threshold for a crisp edge
        const u = (x + 0.5 - x0) / scale - 0.5, v = (r + 0.5 - BOLT_TOP) / (2 * scale) - 0.5;
        const ui = Math.floor(u), vi = Math.floor(v), fu = u - ui, fv = v - vi;
        const a = ink(ui, vi), b = ink(ui + 1, vi), c = ink(ui, vi + 1), d = ink(ui + 1, vi + 1);
        const s = a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
        mask[r * W + x] = smooth(0.45, 0.55, s);
        solid[r * W + x] = s > 0.5 ? 1 : 0;
      }
    const inner = chamfer(solid);
    const outside = new Uint8Array(N);
    for (let k = 0; k < N; k++) outside[k] = solid[k] ? 0 : 1;
    const outer = chamfer(outside);
    // the channel it fell down: a jagged thread from its top up into the cloud
    const leader = new Float32Array(N);
    let lx = x0 + topCol * scale, ly = BOLT_TOP + 1, dir = 0;
    for (let i = 0; ly > 6; i++) {
      // a zig-zag: lurch one way for a few rows, then the other
      if (i % 4 === 0) dir = (hash(cx, i) > 0.5 ? 1 : -1) * (0.6 + hash(cx, i + 50) * 0.9) - (lx - (x0 + topCol * scale)) * 0.08;
      lx += dir;
      ly -= 0.7;
      for (let dx = -1; dx <= 1; dx++) {
        const k = Math.round(ly) * W + Math.round(lx) + dx;
        leader[k] = Math.max(leader[k], dx ? 0.25 : 1);
      }
    }
    return { mask, inner, outer, leader, tip: x0 + tipCol * scale };
  });

  // --- the small bolts: jagged forks walked down from the cloud -----------
  const forks = FORKS.map(([, seed]) => {
    const glow = new Float32Array(N);
    const sx = 20 + hash(seed, 71) * 160, sy = 24 + hash(seed, 72) * 10;
    const draw = (x: number, y: number, len: number, w: number, depth: number, salt: number) => {
      let dir = (hash(salt, 1) - 0.5) * 0.9;
      for (let i = 0; i < len; i++) {
        // a zig-zag: lurch sideways, then fall, again and again
        if (i % 3 === 0) dir = (hash(salt, i + 7) - 0.5) * 2.2 + (hash(salt, 3) - 0.5) * 0.6;
        x += dir;
        y += 0.8 + hash(salt, i + 40) * 0.5;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const cx = Math.round(x) + dx, cy = Math.round(y) + dy;
            if (cx < 0 || cx >= W || cy < 0 || cy >= HORIZON) continue;
            const dd = Math.hypot(cx + 0.5 - x, cy + 0.5 - y);
            const v = w * (dd < 0.75 ? 1 : 0.3 * Math.exp(-dd / 1.1));
            const k = cy * W + cx;
            if (v > glow[k]) glow[k] = v;
          }
        if (depth < 2 && hash(salt, i + 90) > 0.9) draw(x, y, len * 0.45, w * 0.7, depth + 1, salt * 7 + i);
      }
    };
    draw(sx, sy, 22 + hash(seed, 73) * 22, 1, 0, seed * 131);
    const cells: number[] = [], vals: number[] = [];
    for (let k = 0; k < N; k++) if (glow[k] > 0.02) cells.push(k), vals.push(glow[k]);
    return { cells: Int32Array.from(cells), vals: Float32Array.from(vals), x: sx, y: sy + 14 };
  });

  // --- the land: low hills on either side of the bay -----------------------
  const mat = new Uint8Array(N);
  const slope = new Float32Array(N);
  const rim = new Float32Array(N); // the ridge line, catching the sky's last light
  const hill = (x: number) =>
    HORIZON - 12 * smooth(66, 8, x) - 7 * smooth(136, 192, x) - 2.5 * fbm(x * 0.07, 5.3, 3, 0) * (smooth(70, 50, x) + smooth(130, 150, x)) + 1.2;
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5;
      const top = hill(x);
      if (y >= HORIZON) mat[k] = SEA;
      else if (y >= top && (x < 76 || x > 128)) {
        mat[k] = HILL;
        // faces turned to the bay catch the most light
        slope[k] = clamp(0.5 + (hill(x - 1) - hill(x + 1)) * 0.8 * (x < 100 ? -1 : 1)) * 0.6 + 0.4 * smooth(top + 2.5, top, y);
        rim[k] = smooth(top + 1.6, top, y);
      }
    }

  // --- the storm clouds: heaps of noise that wrap, so they drift forever ---
  const CW = 640, CH = 52;
  const cover = new Float32Array(CW * CH);
  const tone = new Float32Array(CW * CH);
  const under = new Float32Array(CW * CH);
  // where the deck ends, a little higher or lower along its length
  // The deck's ragged belly: big heaps hanging to different depths.
  const baseAt = (x: number) => 14 + 20 * fbm(x * 0.028, 7.7, 4, CW * 0.028);
  // Billows: folded noise, so every lump is a rounded heap with a crease round it.
  const billow = (x: number, y: number) => {
    const n = fbm(x * 0.032, y * 0.052, 4, CW * 0.032);
    return 1 - Math.abs(n * 2 - 1);
  };
  const density = (x: number, y: number) => {
    const b = baseAt(x);
    return 0.62 * smooth(b + 3, b - 3, y) + 0.4 * billow(x, y) - 0.12;
  };
  for (let r = 0; r < CH; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, i = r * CW + x;
      const d = density(x, y);
      const b = baseAt(x);
      cover[i] = smooth(0.42, 0.55, d);
      // each heap shaded round, lit a little on its lower side, creases dark;
      // the deck darkest overhead and brightest along its hanging belly
      const bl = billow(x, y);
      const shade = (bl - billow(x + 1, y - 2.5)) * 3 + (bl - 0.6) * 0.9;
      tone[i] = clamp(0.25 + shade + 0.3 * smooth(b - 8, b, y) - 0.15 * smooth(14, 0, y));
      // the undersides, which face the strikes below
      under[i] = clamp(0.25 + 0.75 * smooth(b - 9, b, y) + (bl - billow(x, y + 2.5)) * 2) * smooth(4, 14, y);
    }

  const fork = new Float32Array(N);

  return (t, { color } = {}) => {
    const lt = ((t % LOOP) + LOOP) % LOOP;
    const drift = t * 1.1;
    // which strikes are lit or still burning in the eye
    let fl = 0, af = 0, bi = 0;
    for (let s = 0; s < STRIKES.length; s++) {
      let a = lt - STRIKES[s][0];
      if (a < 0) a += LOOP;
      const f = flashAt(a), g = afterAt(a);
      if (f + g > fl + af) (fl = f), (af = g), (bi = s);
    }
    const B = bolts[bi];
    const fls = Math.min(1.4, fl);
    // the small bolts, flickering for a few frames each
    let forkLight = 0, fx = 0, fy = 0;
    fork.fill(0);
    for (let i = 0; i < FORKS.length; i++) {
      let a = lt - FORKS[i][0];
      if (a < 0) a += LOOP;
      if (a > 0.6) continue;
      const e = Math.exp(-a / 0.12) + 0.6 * Math.exp(-(((a - 0.22) / 0.05) ** 2));
      const F = forks[i];
      for (let j = 0; j < F.cells.length; j++) fork[F.cells[j]] += F.vals[j] * e;
      if (e > forkLight) (forkLight = e), (fx = F.x), (fy = F.y);
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        const m = mat[k];
        let cr = 0, cg = 0, cbl = 0, floor = 0.22, fade = 1;
        // the strike's light here, falling off with distance from the bolt
        const od = B.outer[k];
        const near = Math.exp(-od / 26);
        // held back right beside the bolt, so its own edge stays the brightest
        const light = fls * (0.12 + 0.88 * near) * (0.2 + 0.8 * smooth(1, 10, od));
        const fd = forkLight ? Math.hypot(x - fx, (y - fy) * 1.4) : 1e3;
        const flight = forkLight * Math.exp(-fd / 20) * 0.6;

        if (m === AIR) {
          // sky behind the rain: near black up top, a dull grey at the horizon
          const v = y / HORIZON;
          // and a pale band low down, from the storm's far edge, for the hills to stand against
          const sky = 0.025 + 0.1 * v * v * v * v + 0.2 * Math.exp(-(HORIZON - y) / 6);
          cr = sky, cg = sky, cbl = sky;
          floor = 0.12;
          // the air itself flashes green near the strike
          const air = light * 0.16 + flight * 0.2;
          cr += air * EM[0], cg += air * EM[1], cbl += air * EM[2];
          if (r < CH) {
            const sx = x + drift, ix = Math.floor(sx), f = sx - ix;
            const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
            const c = cover[i0] + (cover[i1] - cover[i0]) * f;
            if (c > 0.01) {
              const tn = tone[i0] + (tone[i1] - tone[i0]) * f;
              const un = under[i0] + (under[i1] - under[i0]) * f;
              // storm grey, rolled, darker at the heart of the deck
              const g = 0.05 + 0.4 * Math.pow(tn, 1.4);
              // lit from below in the strike's green, whitening where it is hottest
              const lit = (light * (0.15 + 1.1 * un) + flight * (0.3 + un)) * 0.9;
              const hot = smooth(0.7, 1.6, lit) * 0.6;
              // and always a faint green on the bellies, from strikes far off
              const amb = 0.07 * un;
              const kr = g + lit * mix(EM[0], 1, hot) * 0.75 + amb * EM[0];
              const kg = g + lit * mix(EM[1], 1, hot) * 0.75 + amb * EM[1];
              const kb = g + lit * mix(EM[2], 1, hot) * 0.75 + amb * EM[2];
              cr = mix(cr, kr, c), cg = mix(cg, kg, c), cbl = mix(cbl, kb, c);
              floor = mix(0.12, 0.2, c);
            }
          }
        } else if (m === HILL) {
          // dark hills, their bay-facing slopes thrown into green relief
          const s = slope[k];
          const g = 0.008 + 0.015 * s + 0.12 * rim[k];
          const lx = Math.exp(-Math.abs(x - B.tip) / 55);
          const lit = fls * (0.15 + 0.85 * lx) * (0.3 + 0.9 * s) * 0.7 + flight * 0.3 * s;
          cr = g + lit * EM[0], cg = g + lit * EM[1], cbl = g + lit * EM[2];
          floor = 0.06;
        } else {
          // sea: black water, swells catching the green
          const v = (y - HORIZON) / (H - HORIZON);
          const w = 0.6 * noise(x * 0.08 + t * 0.15, y * 0.5 - t * 0.7, 0) + 0.4 * noise(x * 0.22 - t * 0.3, y * 1.0 - t * 1.2, 0);
          const sw = 0.5 + 0.9 * w;
          const g = (0.075 - 0.035 * v) * sw;
          cr = g, cg = g, cbl = g;
          // the bolt again, upside down in the water, broken by the waves
          const ry = Math.round(HORIZON - (y - HORIZON) * 2.1 - 1);
          const rx = Math.round(x + (w - 0.5) * 4);
          let refl = 0;
          if (ry >= 0 && rx >= 0 && rx < W) {
            const j = ry * W + rx;
            refl = (B.mask[j] * (fl * 0.8 + af * 0.5) + Math.exp(-B.outer[j] / 8) * fls * 0.2) * (0.1 + 0.9 * smooth(0.45, 0.8, w));
          }
          const sheen = (fls * Math.exp(-Math.abs(x - B.tip) / 40) * 0.4 + flight * 0.2) * smooth(0.45, 0.8, w);
          const hot = clamp(fl * 0.5 - 0.2) * smooth(0.6, 0.85, w);
          cr += (refl + sheen) * mix(EM[0], 1, hot);
          cg += (refl + sheen) * mix(EM[1], 1, hot);
          cbl += (refl + sheen) * mix(EM[2], 1, hot);
          floor = 0.14;
          fade = smooth(H, H - 22, y); // the bottom rows thin out into the ground
        }

        // the big bolt: emerald, white hot through its middle while it flashes,
        // a green ghost of itself after, haloed either way
        if (m !== SEA) {
          const bm = B.mask[k];
          // the halo starts a step off the edge and stays dim, so the outline
          // is never lost in its own glow
          const halo = smooth(0.5, 3.5, od) * Math.exp(-od / 7) * (fls * 0.2 + af * 0.1) + Math.exp(-od / 20) * fls * 0.05;
          cr += halo * EM[0], cg += halo * EM[1], cbl += halo * EM[2];
          if (bm > 0) {
            // white hot inside a thin emerald edge while it flashes, all emerald after
            const core = smooth(1.2, 2.8, B.inner[k]) * clamp(fl * 1.2);
            const lum = Math.min(1, fl * 1.3 + af * 0.9);
            const br = mix(EM[0], 1, core) * lum, bg = mix(EM[1], 1, core) * lum, bb = mix(EM[2], 1, core) * lum;
            cr = mix(cr, br, bm), cg = mix(cg, bg, bm), cbl = mix(cbl, bb, bm);
          }
          // where it strikes, a burst on the water line
          const dt = Math.hypot(x + 0.5 - B.tip, (y - HORIZON) * 1.6);
          const burst = Math.exp(-dt / 3) * fls * 0.9 + Math.exp(-dt / 10) * (fls * 0.3 + af * 0.15);
          cr += burst * mix(EM[0], 1, 0.4), cg += burst * mix(EM[1], 1, 0.4), cbl += burst * mix(EM[2], 1, 0.4);
        }

        // the small forks, green with a pale core
        const fv = fork[k] + B.leader[k] * Math.min(1.3, fl * 1.3 + af * 0.35);
        if (fv > 0) {
          const h = smooth(0.6, 1.2, fv);
          cr += fv * mix(EM[0], 1, h), cg += fv * mix(EM[1], 1, h), cbl += fv * mix(EM[2], 1, h);
        }

        // rain: thin slanted streaks falling fast, lit by whatever flashes
        const lane = Math.floor(x + y * 0.28);
        const hr = hash(lane, 17);
        if (hr > 0.5 && y > 12 && m !== HILL && B.mask[k] < 0.5) {
          const len = 10 + hash(lane, 18) * 12;
          const p = (y - t * (55 + hr * 25) + hash(lane, 19) * 400) / len;
          const seg = p - Math.floor(p);
          if (seg < 0.3) {
            const d = 0.13 * (1 - seg / 0.3) * smooth(12, 34, y);
            const gl = light * 0.6 + flight * 0.4;
            cr += d + d * gl * EM[0] * 3, cg += d + d * gl * EM[1] * 3, cbl += d + d * gl * EM[2] * 3;
          }
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          // Only bright light is pushed to full colour; the storm's greys keep
          // their own depth, so the night stays dark between strikes.
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / Math.max(peak, 0.8);
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cbl * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
