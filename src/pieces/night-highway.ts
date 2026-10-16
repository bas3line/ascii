/*
 * night highway: driving a straight desert road at dusk, toward a mountain
 * range with the last of the sunset behind it. The centre dashes rush at us,
 * reflector posts and telephone poles stream past, oncoming headlights swell
 * out of the vanishing point and flash by, a car ahead keeps its tail lights
 * in our beams, and now and then a motel sign glows on the roadside.
 *
 * The road is a one-point perspective: a ground point Z camera heights ahead
 * sits F/Z rows below the horizon, and a point X camera heights to the side
 * sits X F/Z columns off the vanishing point. Everything moves with the
 * camera, and is blurred over the shutter by how far it travelled, which is
 * what makes the near things streak.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of night highway. Defaults are the original values. */
export interface NightHighwayOptions {
  [key: string]: unknown;
  /** The horizon row. */
  horizon: number;
  /** The vanishing point's column. */
  vanishX: number;
  /** Focal length in cells. */
  focal: number;
  /** Driving speed, in camera heights a second. */
  speed: number;
  /** The moon's column. */
  moonX: number;
  /** The moon's row. */
  moonY: number;
  /** The moon's radius in cells. */
  moonRadius: number;
  /** How high the telephone poles stand. */
  poleHeight: number;
}

export const meta = {
  name: "night highway",
  category: "scenes",
  note: "a desert highway at dusk, rushing toward the mountains and last light",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  loop: 12,
  ground: "#07080f",
  options: {
    horizon: 50,
    vanishX: 100,
    focal: 110,
    speed: 16,
    moonX: 158,
    moonY: 14,
    moonRadius: 4.6,
    poleHeight: 6.3,
  },
  params: {
    horizon: { label: "horizon", min: 30, max: 70, step: 1 },
    vanishX: { label: "vanishing point", min: 40, max: 160, step: 1 },
    focal: { label: "focal length", min: 70, max: 160, step: 1 },
    speed: { label: "driving speed", min: 0, max: 40, step: 0.5 },
    moonX: { label: "moon position", min: 100, max: 200, step: 1 },
    moonY: { label: "moon height", min: 5, max: 30, step: 0.5 },
    moonRadius: { label: "moon radius", min: 2, max: 10, step: 0.2 },
    poleHeight: { label: "pole height", min: 4, max: 10, step: 0.2 },
  },
  palette: [
    "#0d1226", "#141b38", "#1c264c", "#263463", "#34457a", "#4a5d96", "#6b7fb3", "#9aa8d0", "#cdd5ea", "#f4f6fc",
    "#2a1d45", "#43285e", "#643474", "#8a4683",
    "#b85a78", "#e0766a", "#f59a5c", "#ffc477", "#ffe6b0",
    "#16161e", "#24232d", "#383744", "#55535f",
    "#7a1622", "#d42a32", "#ff6a5c",
    "#d9b44a", "#3fd6c8", "#fff4d8", "#3a2a2a",
      ],
    } satisfies Meta<NightHighwayOptions>;

    const W = 200, H = 100;
    const T = 12; // the loop, in seconds: every motion below repeats in it
    const FAR = 112; // nothing is drawn beyond this depth
    const ROAD_R = 0.68, ROAD_L = -1.92, CENTRE = -0.62, LANE_L = -1.27;
    const POLE_X = 2.2, POLE_GAP = 24, POST_GAP = 12, DASH = 1.2, DASH_GAP = 3;
    const ONCOMING = [9.4, 2.6, 6.0]; // when each oncoming car leaves the horizon
    const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// MOTEL in a three by five face, one string a row.
const GLYPHS = ["101 111 111 111 100", "111 101 010 100 100", "111 101 010 110 100", "101 101 010 100 100", "101 111 010 111 111"];

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise, wrapping every `period` lattice cells in y when period > 0.
function noise(x: number, y: number, period = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let y0 = yi, y1 = yi + 1;
  if (period) {
    y0 = ((yi % period) + period) % period;
    y1 = (y0 + 1) % period;
  }
  const a = hash(xi, y0), b = hash(xi + 1, y0), c = hash(xi, y1), d = hash(xi + 1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, period = 0): number {
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
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
// How much of [0, u] falls on the first `len` of every `period`.
const span = (u: number, len: number, period: number) => {
  const k = Math.floor(u / period);
  return k * len + Math.min(u - k * period, len);
};

export default function nightHighway(o: Partial<NightHighwayOptions> = {}): Frame {
  const { horizon = meta.options.horizon, vanishX = meta.options.vanishX, focal = meta.options.focal, speed = meta.options.speed, moonX = meta.options.moonX, moonY = meta.options.moonY, moonRadius = meta.options.moonRadius, poleHeight = meta.options.poleHeight } = o;
  const HY = horizon;
  const VPX = vanishX;
  const F = focal;
  const V = speed;
  const SHUT = (V / 15) * 0.9; // how far we travel while the shutter is open
  const MOON = [moonX, moonY], MOON_R = moonRadius;
  const PH = poleHeight;
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

  // How strongly the sunset reaches each column: centred behind the road.
  const warm = new Float32Array(W);
  for (let x = 0; x < W; x++) warm[x] = Math.exp(-(((x + 0.5 - VPX) / 62) ** 2));

  // --- the sky and the mountains, built once ------------------------------
  const sr = new Float32Array(N), sg = new Float32Array(N), sb = new Float32Array(N), sfloor = new Float32Array(N);
  const stars: number[] = []; // cell, rate, phase, strength
  const farTop = (x: number) => {
    const c = smooth(6, 60, Math.abs(x + 0.5 - VPX));
    const ridge = 1 - Math.abs(fbm(x * 0.04, 1.3, 5) * 2 - 1);
    return HY - 2.5 - (4 + 9 * c) * ridge * ridge - 2 * fbm(x * 0.3, 2.2, 2);
  };
  const nearTop = (x: number) => {
    const c = smooth(26, 95, Math.abs(x + 0.5 - VPX));
    const ridge = 1 - Math.abs(fbm(x * 0.022, 7.1, 4) * 2 - 1);
    return HY + 0.5 - c * (6 + 15 * ridge);
  };
  for (let r = 0; r < HY; r++) {
    const y = r + 0.5;
    const v = y / HY;
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const wm = warm[x];
      // night blue overhead, violet lower down, then rose and a last orange
      // band hugging the crest of the far range behind the road
      const ft = farTop(x);
      const above = Math.max(0, ft - y);
      const cool = smooth(0, 0.7, v);
      let cr = mix(0.005, 0.06, cool), cg = mix(0.008, 0.075, cool), cb = mix(0.028, 0.2, cool);
      const violet = Math.exp(-above / 16) * (0.5 + 0.5 * wm);
      const rose = Math.exp(-above / 7) * (0.25 + 0.75 * wm);
      const hot = Math.exp(-above / 3.5) * wm * wm;
      cr += 0.16 * violet + 0.4 * rose * (1 - hot) + 1.0 * hot;
      cg += 0.05 * violet + 0.1 * rose * (1 - hot) + 0.72 * hot;
      cb += 0.22 * violet + 0.3 * rose * (1 - hot) + 0.3 * hot;
      let fl = 0.13 * v * v;
      let open = true; // clear sky, where a star may show

      // long thin clouds low in the west, lit underneath by the sunset
      const cl = fbm(x * 0.011, y * 0.16, 4) + 0.05 * Math.sin(x * 0.02);
      const band = smooth(22, 31, y) * smooth(46, 38, y);
      const c = smooth(0.56, 0.7, cl) * band;
      if (c > 0.01) {
        const under = smooth(0.62, 0.5, fbm(x * 0.011, (y + 1.6) * 0.16, 4));
        const glow = (0.35 + 0.65 * wm) * (0.4 + 0.6 * under) * smooth(24, 42, y);
        cr = mix(cr, 0.16 + 0.85 * glow, c);
        cg = mix(cg, 0.1 + 0.36 * glow, c);
        cb = mix(cb, 0.22 + 0.3 * glow, c);
        open = c < 0.05;
      }

      // the moon, a thin crescent lit from the sun below the horizon
      const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
      const dm = Math.sqrt(dmx * dmx + dmy * dmy);
      const halo = Math.exp(-dm / 7) * 0.22 + Math.exp(-dm / 22) * 0.07;
      cr += halo * 0.8, cg += halo * 0.85, cb += halo;
      if (dm < MOON_R + 0.6) {
        const inside = smooth(MOON_R + 0.5, MOON_R - 0.5, dm);
        const ox = dmx - 2.3, oy = dmy + 1.7;
        const lit = inside * smooth(MOON_R - 0.6, MOON_R + 0.4, Math.sqrt(ox * ox + oy * oy));
        const earth = inside * 0.08;
        cr = mix(cr, 1.0, lit) + earth * 0.6;
        cg = mix(cg, 0.95, lit) + earth * 0.7;
        cb = mix(cb, 0.82, lit) + earth;
        open = false;
      }

      // the far range, violet in the haze, its crest catching the glow
      if (y >= ft) {
        const depth = y - ft;
        const tex = fbm(x * 0.12, y * 0.25, 3);
        const rim = smooth(1.4, 0, depth) * wm;
        const haze = smooth(HY - 4, HY, y) * (0.3 + 0.7 * wm);
        cr = 0.07 + 0.04 * tex + 0.7 * rim + 0.14 * haze;
        cg = 0.04 + 0.02 * tex + 0.28 * rim + 0.06 * haze;
        cb = 0.11 + 0.05 * tex + 0.22 * rim + 0.1 * haze;
        fl = 0.02;
        open = false;
      }
      // the near ridges either side, almost black
      const nt = nearTop(x);
      if (y >= nt) {
        const tex = fbm(x * 0.2, y * 0.3, 3);
        const rim = smooth(1.2, 0, y - nt) * (0.2 + 0.6 * wm);
        cr = 0.025 + 0.02 * tex + 0.3 * rim;
        cg = 0.02 + 0.015 * tex + 0.1 * rim;
        cb = 0.045 + 0.03 * tex + 0.2 * rim;
        fl = 0.01;
        open = false;
      }
      sr[k] = cr, sg[k] = cg, sb[k] = cb, sfloor[k] = fl;

      // the first stars: thick overhead, none yet in the glow
      const chance = 0.993 - 0.02 * (1 - v) * (1 - v);
      if (open && v < 0.7 && hash(x, r * 5 + 3) > chance) {
        const s = (0.55 + 0.45 * hash(r, x + 9)) * smooth(0.7, 0.2, v) * (1 - 0.6 * wm * v);
        stars.push(k, 1 + Math.floor(hash(x, r) * 5), hash(r * 3, x) * 6.283, s);
      }
    }
  }

  // --- the ground, row by row --------------------------------------------
  const gZ = new Float32Array(H), gD = new Float32Array(H), gEZ = new Float32Array(H);
  for (let r = HY; r < H; r++) {
    const d = r + 0.5 - HY;
    gD[r] = d;
    gZ[r] = F / d;
    gEZ[r] = F / Math.max(0.05, d - 0.5) - F / (d + 0.5); // the depth one row spans
  }

  const fr = new Float32Array(N), fg = new Float32Array(N), fb = new Float32Array(N), ff = new Float32Array(N);

  // A rectangle in screen cells, its edges antialiased, blended over the frame.
  const rect = (x0: number, x1: number, y0: number, y1: number, r: number, g: number, b: number, a: number) => {
    const c0 = Math.max(0, Math.floor(x0)), c1 = Math.min(W - 1, Math.ceil(x1) - 1);
    const r0 = Math.max(0, Math.floor(y0)), r1 = Math.min(H - 1, Math.ceil(y1) - 1);
    for (let row = r0; row <= r1; row++) {
      const cy = overlap(row, row + 1, y0, y1);
      for (let col = c0; col <= c1; col++) {
        const k2 = row * W + col;
        const q = a * cy * overlap(col, col + 1, x0, x1);
        fr[k2] += (r - fr[k2]) * q;
        fg[k2] += (g - fg[k2]) * q;
        fb[k2] += (b - fb[k2]) * q;
        ff[k2] += (0.02 - ff[k2]) * q;
      }
    }
  };
  // A box standing on the road at depth Z, smeared sideways by how far it
  // swept across the screen while the shutter was open.
  const box = (xa: number, xb: number, ha: number, hb: number, z: number, r: number, g: number, b: number, a: number) => {
    const d = F / z, dp = F / (z + SHUT * 0.35); // a shorter shutter, so they keep their edges

    const x0 = VPX + xa * d, x1 = VPX + xb * d;
    const p0 = VPX + xa * dp, p1 = VPX + xb * dp;
    const u0 = Math.min(x0, p0), u1 = Math.max(x1, p1);
    rect(u0, u1, HY + (1 - hb) * d, HY + (1 - ha) * d, r, g, b, a * Math.min(1, (x1 - x0 + 0.3) / (u1 - u0 + 0.3)));
  };
  // A light: a hot core, a soft glow, and a flat streak across.
  const glow = (cx: number, cy: number, core: number, rad: number, streak: number, r: number, g: number, b: number, s: number) => {
    const reach = rad * 4 + streak;
    const c0 = Math.max(0, Math.floor(cx - reach)), c1 = Math.min(W - 1, Math.ceil(cx + reach));
    const r0 = Math.max(0, Math.floor(cy - rad * 4)), r1 = Math.min(H - 1, Math.ceil(cy + rad * 4));
    for (let row = r0; row <= r1; row++) {
      const dy = row + 0.5 - cy;
      for (let col = c0; col <= c1; col++) {
        const dx = col + 0.5 - cx;
        const dd = Math.sqrt(dx * dx + dy * dy);
        let e = smooth(core + 0.7, core - 0.3, dd) * 1.2 + Math.exp(-dd / rad) * 0.55;
        if (streak > 0) e += Math.exp(-Math.abs(dy) / 0.7) * Math.exp(-Math.abs(dx) / streak) * 0.35;
        e *= s;
        const k2 = row * W + col;
        fr[k2] += r * e, fg[k2] += g * e, fb[k2] += b * e;
      }
    }
  };

  return (t, { color } = {}) => {
    const tt = ((t % T) + T) % T;
    const cam = V * tt; // how far we have driven this loop
    const ahead = 15 + 4 * Math.sin((tt / T) * Math.PI * 2); // the car in front
    const cars: number[] = [];
    for (const t0 of ONCOMING) {
      const z = FAR - (V + 16) * ((((tt - t0) % T) + T) % T);
      if (z > 0.7) cars.push(z);
    }
    const sign = FAR - V * ((tt + 6.1) % T); // close enough to read on the first frame

    // sky
    fr.set(sr), fg.set(sg), fb.set(sb), ff.set(sfloor);
    for (let i = 0; i < stars.length; i += 4) {
      const k = stars[i];
      const tw = 0.55 + 0.45 * Math.sin((tt / T) * Math.PI * 2 * stars[i + 1] * 3 + stars[i + 2]);
      const s = stars[i + 3] * tw;
      fr[k] = Math.max(fr[k], s * 0.9), fg[k] = Math.max(fg[k], s * 0.93), fb[k] = Math.max(fb[k], s);
    }

    // --- the ground: road, lines, desert, and the light falling on them ----
    for (let r = HY; r < H; r++) {
      const d = gD[r], z = gZ[r], ez = gEZ[r];
      const cw = 1 / d;
      // the centre dashes, blurred over the shutter and the row's depth
      const w0 = z - ez / 2 + cam - SHUT, w1 = z + ez / 2 + cam;
      const dash = (span(w1, DASH, DASH_GAP) - span(w0, DASH, DASH_GAP)) / (w1 - w0);
      const beamZ = smooth(1.2, 3.5, z) / (1 + (z / 13) ** 2);
      const sheen = Math.exp(-d / 2.4);
      const texAmp = smooth(1, 9, d);
      // One loop's drive, V * T = 192, is 24 texture cells, so the ground repeats exactly when the loop does.
      const zw = (z + cam) * 0.125;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const X = (x + 0.5 - VPX) * cw;
        const wm = warm[x];
        const road = X > ROAD_L && X < ROAD_R;
        // light reaching the ground: twilight, our beams, theirs
        let beam = beamZ * (Math.exp(-((X / (0.5 + 0.045 * z)) ** 2)) + 0.25 * Math.exp(-((X / (1.6 + 0.12 * z)) ** 2)));
        if (z > ahead && Math.abs(X) < 0.55) beam *= 0.15; // the car in front's shadow
        let lr = 0.16 + beam, lg = 0.15 + 0.92 * beam, lb = 0.26 + 0.7 * beam;
        for (const cz of cars) {
          if (z >= cz) continue;
          const dz = cz - z;
          const wash = Math.exp(-(((X - LANE_L) / (0.45 + 0.13 * dz)) ** 2)) * smooth(0, 1.5, dz) / (1 + (dz / 9) ** 2) * smooth(FAR, 70, cz);
          lr += 0.75 * wash, lg += 0.8 * wash, lb += 0.95 * wash;
        }
        let cr: number, cg: number, cb: number;
        if (road) {
          const grit = 0.85 + 0.3 * hash(x * 7 + r, ((zw * 10) | 0) % 240) * texAmp;
          const a = 0.16 * grit;
          cr = a * lr, cg = a * lg, cb = a * lb;
          // the far road shines with the sunset
          cr += sheen * (0.5 * wm + 0.12), cg += sheen * (0.24 * wm + 0.08), cb += sheen * (0.22 * wm + 0.16);
        } else {
          // sand and scrub, in streaks that run at us along the road
          const tex = smooth(0.4, 0.72, fbm(X * 5, zw, 2, 24));
          const a = 0.012 + 0.22 * tex * tex * (0.3 + 0.7 * texAmp);
          const l = (lr + lg + lb) / 3;
          cr = a * (l * 1.05 + 0.3 * beam), cg = a * (l * 0.72 + 0.2 * beam), cb = a * (l * 0.9 + 0.05 * beam);
          cr += sheen * 0.3 * wm, cg += sheen * 0.13 * wm, cb += sheen * 0.16 * wm;
        }
        // paint: dashed yellow down the middle, solid white at both edges,
        // throwing the light straight back like the beads in it do
        const lo = X - cw / 2, hi = X + cw / 2;
        const yel = (overlap(lo, hi, CENTRE - 0.05, CENTRE + 0.05) / cw) * dash;
        const wht = (overlap(lo, hi, ROAD_R - 0.04, ROAD_R + 0.04) + overlap(lo, hi, ROAD_L - 0.04, ROAD_L + 0.04)) / cw;
        const back = 0.22 + 1.6 * (lr - 0.16) + 0.25 * sheen;
        if (yel > 0) cr = mix(cr, 1.0 * back, yel), cg = mix(cg, 0.72 * back, yel), cb = mix(cb, 0.24 * back, yel);
        if (wht > 0) cr = mix(cr, 0.85 * back, wht), cg = mix(cg, 0.86 * back, wht), cb = mix(cb, 0.92 * back, wht);
        // red under the car in front, from its tail lights
        if (z < ahead) {
          const dz = ahead - z;
          const s = 0.06 + 0.012 * dz;
          const red = (Math.exp(-(((X - 0.36) / s) ** 2)) + Math.exp(-(((X + 0.36) / s) ** 2))) * Math.exp(-dz / 2.2) * 0.7;
          cr += red, cg += red * 0.12, cb += red * 0.12;
        }
        fr[k] = cr, fg[k] = cg, fb[k] = cb, ff[k] = road ? 0.03 : 0.02;
      }
    }

    // --- telephone wires, sagging from pole to pole ------------------------
    for (const xw of [POLE_X - 0.45, POLE_X + 0.45]) {
      for (let x = VPX + 3; x < W; x++) {
        const dx = x + 0.5 - VPX;
        const z = (F * xw) / dx;
        if (z > FAR) continue;
        const u = (((z + cam - 3) % POLE_GAP) + POLE_GAP) % POLE_GAP / POLE_GAP;
        const h = 5.6 - 2.4 * u * (1 - u);
        const yw = HY + ((1 - h) * dx) / xw;
        const thick = 0.55 * Math.sqrt(1 + ((1 - h) / xw) ** 2);
        const r0 = Math.max(0, Math.floor(yw - thick)), r1 = Math.min(HY + 20, Math.ceil(yw + thick));
        for (let r = r0; r <= r1 && r < H; r++) {
          const a = clamp(1 - Math.abs(r + 0.5 - yw) / thick) * 0.85;
          const k = r * W + x;
          fr[k] = mix(fr[k], 0.03, a), fg[k] = mix(fg[k], 0.025, a), fb[k] = mix(fb[k], 0.05, a), ff[k] = mix(ff[k], 0, a);
        }
      }
    }

    // --- everything standing on the road, far to near ---------------------
    const things: [number, () => void][] = [];
    for (const [xp, off, gap, kind] of [[ROAD_R + 0.3, 0, POST_GAP, 0], [ROAD_L - 0.3, 6, POST_GAP, 1], [POLE_X, 3, POLE_GAP, 2]] as const) {
      for (let z = (((off - cam) % gap) + gap) % gap; z < FAR; z += gap) {
        if (z < 0.7) continue;
        if (kind === 2) {
          things.push([z, () => {
                    box(xp - 0.12, xp + 0.12, 0, PH, z, 0.008, 0.006, 0.012, 1);
                    box(xp - 0.6, xp + 0.6, PH - 0.8, PH - 0.64, z, 0.008, 0.006, 0.012, 1);
          }]);
        } else {
          things.push([z, () => {
            const lit = clamp(7 / z) * (kind === 0 ? 1 : 0.7);
            box(xp - 0.035, xp + 0.035, 0, 0.5, z, 0.06 + 0.26 * lit, 0.06 + 0.25 * lit, 0.08 + 0.24 * lit, 1);
            const s = 0.25 + 1.1 * lit;
            box(xp - 0.04, xp + 0.04, 0.37, 0.47, z, s, s * (kind === 0 ? 0.9 : 0.62), s * (kind === 0 ? 0.75 : 0.2), 1);
          }]);
        }
      }
    }
    if (sign > 0.7) {
      things.push([sign + 3, () => {
        // the motel itself, low, set back, its windows warm
        const d = F / (sign + 3);
        const x0 = VPX + 7 * d, x1 = VPX + 14 * d, y0 = HY + (1 - 1.3) * d, y1 = HY + d;
        rect(x0, x1, y0, y1, 0.06, 0.05, 0.08, 1);
        for (let i = 0; i < 6; i++) {
          if (i === 4) continue;
          const wx = x0 + ((i + 0.3) / 6) * (x1 - x0);
          rect(wx, wx + 0.5 * (x1 - x0) / 6, y0 + 0.35 * (y1 - y0), y0 + 0.6 * (y1 - y0), 1, 0.7, 0.35, 0.9);
        }
      }]);
      things.push([sign, () => {
        const d = F / sign;
        box(4.6, 4.72, 0, 2.4, sign, 0.05, 0.04, 0.06, 1);
        const x0 = VPX + 3.0 * d, x1 = VPX + 6.3 * d, y0 = HY + (1 - 3.6) * d, y1 = HY + (1 - 2.4) * d;
        const bw = x1 - x0;
        const c0 = Math.max(0, Math.floor(x0)), c1 = Math.min(W - 1, Math.ceil(x1) - 1);
        const r0 = Math.max(0, Math.floor(y0)), r1 = Math.min(H - 1, Math.ceil(y1) - 1);
        for (let r = r0; r <= r1; r++) {
          for (let x = c0; x <= c1; x++) {
            const k = r * W + x;
            const u = ((x + 0.5 - x0) / bw) * 22 - 1.5, v = ((r + 0.5 - y0) / (y1 - y0)) * 8 - 1.5;
            let cr = 0.1, cg = 0.04, cb = 0.1;
            if (bw < 9) {
              (cr = 1), (cg = 0.4), (cb = 0.5); // too far to read: a pink point
            } else if (u < -0.8 || u > 19.8 || v < -0.8 || v > 5.8) {
              (cr = 0.3), (cg = 0.95), (cb = 0.88); // the neon border
            } else if (u >= 0 && v >= 0 && u < 19 && v < 5) {
              const col = Math.floor(u), lit = col % 4 !== 3 && GLYPHS[Math.floor(v)][col] === "1";
              if (lit) (cr = 1), (cg = 0.32), (cb = 0.38);
            }
            const a = overlap(x, x + 1, x0, x1) * overlap(r, r + 1, y0, y1);
            fr[k] = mix(fr[k], cr, a), fg[k] = mix(fg[k], cg, a), fb[k] = mix(fb[k], cb, a), ff[k] = mix(ff[k], 0.15, a);
          }
        }
        const fade = smooth(FAR, 85, sign);
        glow((x0 + x1) / 2, (y0 + y1) / 2, 0, 1.5 + bw * 0.35, 0, 1, 0.3, 0.45, 0.35 * fade);
      }]);
    }
    things.push([ahead, () => {
      // the car in front, its back lit by our beams
      const lit = clamp(11 / ahead);
      box(-0.46, 0.46, 0.12, 0.62, ahead, 0.12 + 0.4 * lit, 0.12 + 0.37 * lit, 0.15 + 0.3 * lit, 1);
      box(-0.32, 0.32, 0.62, 0.95, ahead, 0.05, 0.05, 0.08, 1);
      box(-0.46, 0.46, 0, 0.12, ahead, 0.02, 0.02, 0.03, 1);
      box(-0.43, -0.29, 0.44, 0.54, ahead, 1, 0.2, 0.18, 1);
      box(0.29, 0.43, 0.44, 0.54, ahead, 1, 0.2, 0.18, 1);
    }]);
    for (const cz of cars) {
      things.push([cz, () => {
        box(LANE_L - 0.46, LANE_L + 0.46, 0.08, 0.6, cz, 0.04, 0.04, 0.06, smooth(40, 20, cz));
        box(LANE_L - 0.32, LANE_L + 0.32, 0.6, 0.92, cz, 0.03, 0.03, 0.05, smooth(40, 20, cz));
      }]);
    }
    things.sort((a, b) => b[0] - a[0]);
    for (const [, draw] of things) draw();

    // --- lights, added over everything ------------------------------------
    {
      const d = F / ahead;
      for (const sx of [-0.36, 0.36]) glow(VPX + sx * d, HY + (1 - 0.49) * d, 0.07 * d, 0.8 + 0.12 * d, 0, 1, 0.15, 0.12, 0.6);
    }
    for (const cz of cars) {
      const d = F / cz;
      const fade = smooth(FAR, 80, cz);
      const near = clamp(4 / cz);
      for (const sx of [-0.33, 0.33]) {
        glow(VPX + (LANE_L + sx) * d, HY + (1 - 0.34) * d, 0.06 * d, 0.7 + 0.03 * d, 2 + 0.5 * d, 1, 0.96, 0.85, fade * (0.75 + 0.5 * near));
      }
    }

    // Dot size from brightness, dithered. Then the colour makes up what the
    // dot size could not: a small dot is drawn brighter and a large one
    // dimmer, so a gradient stays smooth across the dither's steps.
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = fr[k], cg = fg[k], cbl = fb[k];
        const floor = ff[k];
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
