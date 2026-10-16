/*
 * black prism: the Vercel triangle as a glass prism in a black void. A white
 * beam comes in low from the left, strikes the left face, crosses the glass
 * and leaves the right face fanned out into a full spectrum. The beam pulses,
 * dust sparkles where the light passes, the spectrum shimmers, and a glossy
 * floor holds a faint reflection of all of it.
 *
 * Design idea by @satvikxs (github.com/satvikxs).
 *
 * The prism is the library's own vercel logo: its ink grid is read as a mask,
 * sampled up with bilinear filtering and a smooth threshold, its rows halved
 * so the triangle keeps its true proportions on square cells.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of black prism. Defaults are the original values. */
export interface BlackPrismOptions {
  [key: string]: unknown;
  /** The apex's row. */
  top: number;
  /** Scene cells to one logo column. */
  scale: number;
  /** Where the beam meets the left face, as a fraction from the apex. */
  enter: number;
  /** Where the beam leaves the right face, as a fraction from the apex. */
  leave: number;
  /** How many dust motes drift through the light. */
  dust: number;
  /** How strongly the beam pulses. */
  pulse: number;
}

export const meta = {
  name: "black prism",
  category: "scenes",
  note: "the vercel triangle as a glass prism, splitting white light to a rainbow",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#000000",
    options: {
      top: 12,
      scale: 1.36,
      enter: 0.46,
      leave: 0.5,
      dust: 700,
      pulse: 0.16,
    },
    params: {
      top: { label: "apex row", min: 2, max: 30, step: 1 },
      scale: { label: "prism scale", min: 0.8, max: 2.2, step: 0.02 },
      enter: { label: "beam entry", min: 0.1, max: 0.8, step: 0.01 },
      leave: { label: "beam exit", min: 0.1, max: 0.8, step: 0.01 },
      dust: { label: "dust motes", min: 0, max: 2000, step: 50 },
      pulse: { label: "beam pulse", min: 0, max: 0.4, step: 0.01 },
    },
    palette: [
    "#161616", "#242424", "#363636", "#4a4a4a", "#636363", "#7e7e7e", "#9c9c9c", "#bcbcbc",
    "#dcdcdc", "#ffffff",
    "#ff2a3c", "#9a1c28", "#ff7417", "#a04a10", "#ffdf2e", "#a08c1c",
    "#38f56a", "#1f9a42", "#24dcff", "#16879e", "#3a64ff", "#233f9e",
    "#9a4cff", "#5f2f9e", "#fff4c8", "#d4f6ff", "#ffd2d6",
  ],
  } satisfies Meta<BlackPrismOptions>;

// The vercel logo's ink, as src/pieces/vercel.ts draws it: non-space is inside.
const INK = String.raw`
                               00
                             000000
                            00000000
                           0000000000
                          000000000000
                         00000000000000
                        0000000000000000
                       000000000000000000
                     0000000000000000000000
                    000000000000000000000000
                   00000000000000000000000000
                  0000000000000000000000000000
                 000000000000000000000000000000
                00000000000000000000000000000000
              000000000000000000000000000000000000
             00000000000000000000000000000000000000
            0000000000000000000000000000000000000000
           000000000000000000000000000000000000000000
          00000000000000000000000000000000000000000000
         0000000000000000000000000000000000000000000000
        000000000000000000000000000000000000000000000000
      0000000000000000000000000000000000000000000000000000
     000000000000000000000000000000000000000000000000000000
    00000000000000000000000000000000000000000000000000000000
   0000000000000000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000000000000000000
`;

const W = 200, H = 100;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// The spread of the spectrum the beam leaves as, in radians below the horizontal.
const RED = 0.05, VIOLET = 0.4;

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

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// Distance from (px, py) to the segment a to b, and how far along it (0 to 1).
function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const s = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * s - px, ey = ay + dy * s - py;
  return [Math.sqrt(ex * ex + ey * ey), s];
}

// Red through violet, the colour at u in 0..1 across the fan.
const BANDS = [
  [1, 0.08, 0.14], [1, 0.42, 0.04], [1, 0.88, 0.12], [0.2, 1, 0.38],
  [0.12, 0.84, 1], [0.2, 0.36, 1], [0.6, 0.28, 1],
];
function spectrum(u: number): [number, number, number] {
  const f = clamp(u) * (BANDS.length - 1);
  const i = Math.min(BANDS.length - 2, Math.floor(f)), k = f - i;
  const a = BANDS[i], b = BANDS[i + 1];
  return [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
}

export default function blackPrism(o: Partial<BlackPrismOptions> = {}): Frame {
  const { top = meta.options.top, scale = meta.options.scale, enter = meta.options.enter, leave = meta.options.leave, dust = meta.options.dust, pulse = meta.options.pulse } = o;
  const TOP = top, SCALE = scale, ENTER = enter, LEAVE = leave, DUST = dust, PULSE = pulse;
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

  // --- the prism, from the logo's ink --------------------------------------
  const ink = INK.slice(1, -1).split("\n");
  const gw = Math.max(...ink.map((l) => l.length)), gh = ink.length;
  let c0 = gw, c1 = 0;
  for (const l of ink) for (let c = 0; c < l.length; c++) if (l[c] !== " ") (c0 = Math.min(c0, c)), (c1 = Math.max(c1, c));
  const at = (c: number, r: number) => (r >= 0 && r < gh && c >= 0 && c < gw && ink[r][c] && ink[r][c] !== " " ? 1 : 0);
  const bilinear = (gx: number, gy: number) => {
    const x = gx - 0.5, y = gy - 0.5;
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const left = W / 2 - ((c1 + 1 - c0) * SCALE) / 2;
  const base = TOP + gh * 2 * SCALE; // the floor line the prism stands on
  const FLOOR = Math.round(base);
  // a scene point to logo cells; the logo's rows are two cells tall, so halve
  const toGrid = (x: number, y: number): [number, number] => [c0 + (x - left) / SCALE, (y - TOP) / (2 * SCALE)];
  const coverAt = (x: number, y: number) => {
    // a little supersampling smooths the logo's row-by-row steps into a line
    let s = 0;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const [gx, gy] = toGrid(x + i * 0.9, y + j * 1.1);
        s += bilinear(gx, gy);
      }
    return s / 9;
  };
  const cov = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) cov[r * W + x] = smooth(0.38, 0.62, coverAt(x + 0.5, r + 0.5));
  // the rim: wherever the glass begins or ends, a crisp line
  const rim = new Float32Array(N);
  for (let r = 1; r < H - 1; r++)
    for (let x = 1; x < W - 1; x++) {
      const k = r * W + x;
      const gx = cov[k + 1] - cov[k - 1], gy = cov[k + W] - cov[k - W];
      rim[k] = clamp(Math.sqrt(gx * gx + gy * gy) * 1.25);
    }

  // The triangle's corners, read off the mask, for the light's geometry.
  const AX = W / 2, AY = TOP;
  const LX = left, RX = W - left, BY = base;
  const EX = mix(AX, LX, ENTER), EY = mix(AY, BY, ENTER); // where the beam goes in
  const XX = mix(AX, RX, LEAVE), XY = mix(AY, BY, LEAVE); // and where it comes out
  const SX = -4, SY = EY + 21; // the beam's source, low off the left edge
  // a ghost inside the glass: the beam glancing off the base and back up
  const BX = mix(EX, XX, 0.62), BBY = BY - 1;

  // Light that does not move, worked out once: the incoming beam, the path
  // through the glass, the fan's colour and reach.
  const beamD = new Float32Array(N), beamS = new Float32Array(N);
  const inner = new Float32Array(N), ghost = new Float32Array(N);
  const fanU = new Float32Array(N).fill(-1), fanR = new Float32Array(N);
  const sheen = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const px = x + 0.5, py = r + 0.5;
      const [d, s] = seg(px, py, SX, SY, EX, EY);
      beamD[k] = d;
      beamS[k] = s * Math.hypot(EX - SX, EY - SY);
      const [di, si] = seg(px, py, EX, EY, XX, XY);
      inner[k] = Math.exp(-((di / (1 + si * 0.8)) ** 2));
      const [d1] = seg(px, py, EX, EY, BX, BBY);
      const [d2] = seg(px, py, BX, BBY, XX + 2, XY + 9);
      ghost[k] = Math.exp(-((Math.min(d1, d2) / 0.8) ** 2));
      // Inside the glass: a bevel of light just within each face, and a pale
      // inner echo of the two sloped faces a few cells in, as thick glass shows.
      const dL = ((px - AX) * (BY - AY) + (py - AY) * (AX - LX)) / Math.hypot(BY - AY, AX - LX);
      const dR = ((RX - AX) * (py - AY) - (px - AX) * (BY - AY)) / Math.hypot(BY - AY, RX - AX);
      const dB = BY - py;
      const edge = Math.min(dL, dR, dB);
      const up = smooth(BY, AY + 10, py);
      const echo = Math.exp(-(((dL - 6) / 0.8) ** 2)) + 0.6 * Math.exp(-(((dR - 6) / 0.8) ** 2));
      sheen[k] = Math.exp(-edge / 1.4) * 0.07 + echo * up * 0.16 + Math.exp(-(((dB - 5) / 0.8) ** 2)) * 0.06;
      const fx = px - XX, fy = py - XY;
      if (fx > -2 && py < FLOOR) {
        const a = Math.atan2(fy, fx);
        fanU[k] = (a - RED) / (VIOLET - RED);
        fanR[k] = Math.sqrt(fx * fx + fy * fy);
      }
    }
  }

  // Dust: motes that drift slowly through the frame, seen only in the light.
  const motes: number[][] = [];
  for (let i = 0; i < DUST; i++)
    motes.push([hash(i, 1) * W, hash(i, 2) * FLOOR, 0.6 + hash(i, 3) * 2.4, (hash(i, 4) - 0.5) * 1.2, hash(i, 5) * 6.28, 1 + hash(i, 6) * 3]);
  const spark = new Float32Array(N);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);

  return (t, { color } = {}) => {
    const pulse = 0.84 + PULSE * Math.sin(t * 1.6);
    spark.fill(0);
    for (const [mx, my, vx, vy, ph, tw] of motes) {
      const x = (((mx + vx * t + 2 * Math.sin(t * 0.4 + ph)) % W) + W) % W;
      const y = (((my + vy * t + 1.5 * Math.sin(t * 0.3 + ph * 2)) % FLOOR) + FLOOR) % FLOOR;
      const k = Math.floor(y) * W + Math.floor(x);
      spark[k] = Math.max(spark[k], Math.pow(0.5 + 0.5 * Math.sin(t * tw + ph), 3));
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr = 0, cg = 0, cbl = 0, floor = 0;

        if (r >= FLOOR) {
          // the floor: black gloss, holding a soft, darkened copy of the scene
          const below = r - FLOOR;
          const m = (FLOOR - 1 - below) * W;
          const wob = Math.round(0.7 * Math.sin(r * 1.7 + t * 2));
          const x0 = Math.max(0, x - 1 + wob), x1 = Math.min(W - 1, x + 1 + wob), xc = Math.max(0, Math.min(W - 1, x + wob));
          const fall = 0.6 * Math.exp(-below / 10);
          cr = (R[m + x0] + 2 * R[m + xc] + R[m + x1]) * 0.25 * fall;
          cg = (G[m + x0] + 2 * G[m + xc] + G[m + x1]) * 0.25 * fall;
          cbl = (B[m + x0] + 2 * B[m + xc] + B[m + x1]) * 0.25 * fall;
          // a hairline where the floor meets the dark, brightest under the prism
          if (below === 0) {
            const h = 0.1 + 0.25 * Math.exp(-(((x + 0.5 - AX) / 60) ** 2));
            cr += h, cg += h, cbl += h;
          }
          // the spectrum's light spilling down onto the floor ahead of it
          if (x > XX) {
            const u = clamp((x - XX) / (W - XX));
            const [sr, sg, sb] = spectrum(0.55 + 0.45 * u);
            const spill = 0.13 * smooth(0, 0.25, u) * Math.exp(-below / 4) * pulse;
            cr += sr * spill, cg += sg * spill, cbl += sb * spill;
          }
          floor = 0;
        } else {
          const c = cov[k];
          let lr = 0, lg = 0, lb = 0; // the light in the air, before the glass

          // the incoming beam: a hot white core, a soft scatter round it,
          // waves of brightness running toward the prism
          const bd = beamD[k];
          if (bd < 30) {
            const wave = 0.85 + 0.15 * Math.sin(beamS[k] * 0.16 - t * 7);
            const core = Math.exp(-((bd / 1.45) ** 2)) * 1.3 * pulse * wave;
            const halo = Math.exp(-bd / 2.2) * 0.3 * pulse;
            const v = (core + halo) * smooth(0, 6, beamS[k]) * (1 - c * 0.9);
            lr += v, lg += v, lb += v * 1.02;
          }

          // the spectrum: one ray per angle, red on top, violet below
          const u = fanU[k];
          if (u > -0.3 && u < 1.3 && c < 0.9) {
            const d = fanR[k];
            const band = smooth(-0.05, 0.04, u) * smooth(1.05, 0.96, u);
            if (band > 0) {
              const [sr, sg, sb] = spectrum(u);
              const shimmer = 0.82 + 0.18 * noise(u * 16 + t * 0.5, d * 0.05 - t * 0.9) + 0.08 * Math.sin(d * 0.32 - t * 5 + u * 4);
              const v = band * shimmer * pulse * (0.75 + 0.35 * Math.exp(-d / 30)) * smooth(0, 4, d) * (1 - c);
              lr += sr * v, lg += sg * v, lb += sb * v;
            }
            // a faint coloured haze just outside the band's edges
            const edge = Math.exp(-Math.max(0, -u, u - 1) * 12) * (1 - band) * 0.12 * smooth(0, 10, fanR[k]) * (1 - c);
            const [er, eg, eb] = spectrum(u);
            lr += er * edge, lg += eg * edge, lb += eb * edge;
          }

          // hot spots where the light strikes and leaves the glass
          const de = Math.hypot(x + 0.5 - EX, r + 0.5 - EY), dx = Math.hypot(x + 0.5 - XX, r + 0.5 - XY);
          const spot = (Math.exp(-de / 2.2) * 1.1 + Math.exp(-de / 7) * 0.08) * pulse;
          lr += spot, lg += spot, lb += spot;
          const exit = (Math.exp(-dx / 2) * 0.7 + Math.exp(-dx / 7) * 0.08) * pulse;
          lr += exit, lg += exit * 0.97, lb += exit * 0.95;

          // dust, sparkling only where there is light to catch it
          const lp = Math.max(lr, lg, lb);
          if (spark[k] > 0 && lp > 0.02) {
            const s = spark[k] * Math.min(1, lp * 4) * 1.4;
            const n = 1 / Math.max(lp, 1e-3);
            cr += s * (0.5 + 0.5 * lr * n), cg += s * (0.5 + 0.5 * lg * n), cbl += s * (0.5 + 0.5 * lb * n);
          }
          cr += lr, cg += lg, cbl += lb;

          if (c > 0.01) {
            // dark glass: a faint lift toward the base, slow reflections inside,
            // the beam crossing it as a pale thread and a ghost off the base
            const py = (r + 0.5 - AY) / (BY - AY);
            const drift = 0.5 + 0.5 * Math.sin(t * 0.5 + (x - r) * 0.04);
            let g = 0.012 * py + sheen[k] * (0.5 + 0.5 * drift);
            g += inner[k] * 0.55 * pulse + ghost[k] * 0.08;
            const tint = smooth(0.4, 1, (x + 0.5 - EX) / (XX - EX)) * inner[k] * 0.25;
            cr += c * (g + tint * 0.3), cg += c * (g + tint * 0.15), cbl += c * (g + tint * 0.45);
          }

          // the rim: white, brightest near where the light touches it
          const e = rim[k];
          if (e > 0.02) {
            const near = Math.exp(-de / 16) * 0.5 + Math.exp(-dx / 16) * 0.35;
            const top = Math.exp(-Math.hypot(x + 0.5 - AX, r + 0.5 - AY) / 10) * 0.25;
            const v = e * (0.62 + near * pulse + top);
            cr += v, cg += v, cbl += v;
          }
        }

        R[k] = cr, G[k] = cg, B[k] = cbl;

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
