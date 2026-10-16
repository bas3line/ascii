/*
 * salt flat: the Vercel triangle, black and exactly equilateral, hangs just
 * above the horizon of a salt flat that holds it upside down like a mirror.
 * The sun rises exactly behind its apex, so rays fan out from the tip across
 * a black sky, both slanted edges burn as a razor white rim with a faint
 * spectral fringe, and the horizon runs as a thin line of light through the
 * gap under it. The crust toward us is cracked into hexagons that recede to
 * the horizon. The rays turn slowly, the colours drift along the rim, a glint
 * climbs both edges to the tip every six seconds and the water barely moves.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of salt flat. Defaults are the original values. */
export interface SaltFlatOptions {
  [key: string]: unknown;
  /** The triangle's centre line. */
  centre: number;
  /** Half the triangle's base. */
  halfBase: number;
  /** The horizon row. */
  horizon: number;
  /** How far the triangle hangs above the horizon and its reflection below. */
  lift: number;
  /** How far the sun sits below the triangle's tip. */
  sunHeight: number;
  /** How wide each salt plate is, in ground units. */
  plate: number;
  /** The loop period, in seconds. */
  loop: number;
  /** Strength of the mirror's ripple. */
  ripple: number;
}

export const meta = {
  name: "salt flat",
  category: "scenes",
  note: "the vercel triangle over a mirror of salt, the sun rising behind its tip",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#000000",
  options: {
    centre: 100,
    halfBase: 22,
    horizon: 57,
    lift: 1.7,
    sunHeight: 3.2,
    plate: 2,
    loop: 24,
    ripple: 1,
  },
  params: {
    centre: { label: "triangle centre", min: 50, max: 150, step: 1 },
    halfBase: { label: "triangle width", min: 8, max: 40, step: 0.5 },
    horizon: { label: "horizon", min: 40, max: 70, step: 1 },
    lift: { label: "triangle height", min: 0, max: 12, step: 0.2 },
    sunHeight: { label: "sun height", min: 0, max: 8, step: 0.2 },
    plate: { label: "salt plate size", min: 1, max: 5, step: 0.1 },
    loop: { label: "loop", min: 12, max: 48, step: 1 },
    ripple: { label: "mirror ripple", min: 0, max: 3, step: 0.05 },
  },
  palette: [
    "#0d0d0e", "#161617", "#1f1f21", "#2a2a2c", "#363638", "#444446", "#555557",
    "#69696b", "#808082", "#9a9a9c", "#b8b8ba", "#d8d8da", "#ffffff",
    // Vercel's spectrum, at full strength, pale and dim
    "#50e3c2", "#0070f3", "#7928ca", "#ff0080", "#ff4d4d", "#f9cb28",
    "#b0f2e3", "#8cbcf9", "#bb94e4", "#ff8cc0", "#ffa6a6", "#fce59a",
    "#24665a", "#00326d", "#36125b", "#73003a", "#732323", "#705b12",
      ],
    } satisfies Meta<SaltFlatOptions>;

    const W = 200, H = 100;
    const S3 = Math.sqrt(3) / 2;
    const TAU = Math.PI * 2;
    const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// Vercel's gradient stops, round a wheel: cyan, blue, violet, magenta, red, amber.
const SPECTRUM = [
  [0.31, 0.89, 0.76], [0.0, 0.44, 0.95], [0.47, 0.16, 0.79],
  [1.0, 0.0, 0.5], [1.0, 0.3, 0.3], [0.98, 0.8, 0.16],
];

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
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// A colour off the spectrum wheel, h wrapping at 1.
const spec = [0, 0, 0];
function spectrum(h: number): void {
  const p = (((h % 1) + 1) % 1) * 6;
  const i = Math.floor(p), f = p - i;
  const a = SPECTRUM[i], b = SPECTRUM[(i + 1) % 6];
  for (let c = 0; c < 3; c++) spec[c] = a[c] + (b[c] - a[c]) * f;
}

// Signed distance to each side of the triangle, positive outside: the two
// slanted edges, then the base; defined once the triangle's geometry is known.
function sideL(x: number, y: number, CX: number, HW: number, BASE: number): number {
  return -(x - (CX - HW)) * S3 - (y - BASE) * 0.5;
}
function sideR(x: number, y: number, CX: number, HW: number, BASE: number): number {
  return (x - (CX + HW)) * S3 - (y - BASE) * 0.5;
}

export default function saltFlat(o: Partial<SaltFlatOptions> = {}): Frame {
  const { centre = meta.options.centre, halfBase = meta.options.halfBase, horizon = meta.options.horizon, lift = meta.options.lift, sunHeight = meta.options.sunHeight, plate = meta.options.plate, loop = meta.options.loop, ripple = meta.options.ripple } = o;
  const CX = centre;
  const HW = halfBase;
  const PH = HW * Math.sqrt(3); // equilateral, so this tall
  const HORIZON = horizon;
  const LIFT = lift;
  const BASE = HORIZON - LIFT;
  const APEX = BASE - PH;
  const SUNY = APEX + sunHeight; // the sun sits just behind the tip
  const LOOP = loop;
  const SIZE = plate;
  const RIP = ripple;
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

  // --- the crust, built once -----------------------------------------------
  // Each row below the horizon is a strip of the flat at some distance. The
  // crust is a lattice of flat-topped hexagons on the ground; the cracks are
  // drawn about one cell wide on screen at any distance, using how fast the
  // distance to the nearest edge changes from cell to cell, and fade out
  // where the cells shrink to a few rows near the horizon.
  const CAM = 250, F = 64; // camera height, lens
  const ridge = new Float32Array(N);
  const stars = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      if (y < HORIZON) {
        if (y < HORIZON - 14 && hash(x, r * 5 + 3) > 0.988) stars[k] = 0.4 + 0.6 * hash(r, x);
        continue;
      }
      const d = y - HORIZON;
      const Z = CAM / d, X = ((x + 0.5 - CX) * Z) / F;
      // a slight warp, so the plates are not machined
      const wx = X + 0.16 * (noise(X * 0.5, Z * 0.5) - 0.5);
      const wz = Z + 0.16 * (noise(X * 0.5 + 7.3, Z * 0.5 + 1.9) - 0.5);
      // axial hex coordinates, rounded to the nearest centre
      const q = ((2 / 3) * wx) / SIZE, rr = ((-1 / 3) * wx + (Math.sqrt(3) / 3) * wz) / SIZE;
      let cx = Math.round(q), cz = Math.round(rr), cy = Math.round(-q - rr);
      const dx = Math.abs(cx - q), dz = Math.abs(cz - rr), dy = Math.abs(cy + q + rr);
      if (dx > dz && dx > dy) cx = -cz - cy;
      else if (dz > dy) cz = -cx - cy;
      const vx = wx - SIZE * 1.5 * cx, vz = wz - SIZE * Math.sqrt(3) * (cz + cx / 2);
      // the nearest of the three edge directions, and how far in from it
      const a0 = Math.abs(vz), a1 = Math.abs(S3 * vx + 0.5 * vz), a2 = Math.abs(S3 * vx - 0.5 * vz);
      let nx = 0, nz = Math.sign(vz), h = a0;
      if (a1 > h) (h = a1), (nx = S3 * Math.sign(S3 * vx + 0.5 * vz)), (nz = 0.5 * Math.sign(S3 * vx + 0.5 * vz));
      if (a2 > h) (h = a2), (nx = S3 * Math.sign(S3 * vx - 0.5 * vz)), (nz = -0.5 * Math.sign(S3 * vx - 0.5 * vz));
      const e = SIZE * S3 - h;
      // the same distance in screen cells
      const dZy = -(Z * Z) / CAM, dXx = Z / F, dXy = ((x + 0.5 - CX) / F) * dZy;
      const gx = nx * dXx, gy = nx * dXy + nz * dZy;
      const px = e / Math.sqrt(gx * gx + gy * gy + 1e-9);
      // how tall a plate is on screen: below about three rows the cracks would alias
      const tall = (SIZE * 2 * S3) / Math.abs(dZy);
      ridge[k] = smooth(0.95, 0.25, px) * smooth(5, 15, tall);
    }
  }

  // --- the sky, built once ------------------------------------------------
  // Everything about the sky that does not move, for each cell above the
  // water and, below it, for the point it mirrors. The ripples barely shift
  // that point, so only the triangle's reflection follows them.
  const FANS = 1024;
  const fans = new Float32Array(FANS);
  const still = new Float32Array(N), corona = new Float32Array(N), fall = new Float32Array(N);
  const angle = new Uint16Array(N);
  const shine = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const xc = x + 0.5;
      const y = r + 0.5 < HORIZON ? r + 0.5 : 2 * HORIZON - r - 0.5;
      const dx = xc - CX, ds = y - SUNY;
      const dist = Math.sqrt(dx * dx + ds * ds);
      const up = HORIZON - y;
      // black overhead, a band of dawn low down, a white line at the edge,
      // and a faint lens streak through the sun
      still[k] = 0.22 * Math.exp(-up / 3) + 0.025 * Math.exp(-up / 10) + 0.8 * Math.exp(-(up * up) / 0.7) +
        0.35 * Math.exp(-(ds * ds) / 0.5) * Math.exp(-Math.abs(dx) / 32) + (dist < 4.5 ? 1 : 0);
      // the sun: a white core behind the tip and a soft corona
      corona[k] = 0.9 * Math.exp(-dist / 2.5) + 0.25 * Math.exp(-dist / 8);
      // the rays fade with distance and are kept off the triangle's flanks,
      // so the rim stands against black
      const th = Math.atan2(dx, -ds);
      fall[k] = smooth(4, 12, dist) * Math.exp(-dist / 50) * smooth(2.35, 1.75, Math.abs(th));
      angle[k] = Math.min(FANS - 1, Math.floor(((th + Math.PI) / TAU) * FANS));
      // the salt ridges are lit brighter toward the sun's line
      shine[k] = (0.3 + 0.25 * Math.exp(-(dx * dx) / 2500)) * smooth(HORIZON + 2, HORIZON + 12, r + 0.5);
    }
  }

  return (t, { color } = {}) => {
    const w = TAU / LOOP;
    const breathe = 0.92 + 0.08 * Math.sin(t * w * 2);
    const spin = t * w; // the rays turn one notch each loop
    // The glint: climbs both edges from the base corners to the tip in
    // 1.4 s, every six seconds, then flares at the top.
    const gp = (t % 6) / 1.4;
    const ge = Math.min(1, gp);
    const gI = gp < 1 ? 0.5 + 0.5 * gp : gp < 1.5 ? 1 - (gp - 1) * 2 : 0;
    const gy = BASE - PH * ge * ge;
    const flare = gp > 0.8 && gp < 1.5 ? Math.sin(((gp - 0.8) / 0.7) * Math.PI) : 0;

    // What a point of the world above the water looks like, into R G B: the
    // sky and sun, then the triangle laid over them with its rim and fringe.
    // The rays, round the sun by angle: irregular narrow beams with true
    // black between them, turning slowly.
    for (let i = 0; i < FANS; i++) {
      const th = (i / FANS) * TAU - Math.PI;
      let a = 0.5 + 0.5 * Math.cos(14 * th + spin + 1.4 * Math.sin(5 * th - spin * 2));
      let b = 0.5 + 0.5 * Math.cos(23 * th - spin * 3 + 0.9 * Math.sin(3 * th + spin));
      a *= a, a *= a, a *= a; // to the 8th
      b *= b, b *= b, b *= b, b *= b; // to the 16th
      fans[i] = (a * 0.55 + b * 0.18) * breathe;
    }

    // What a point of the world above the water looks like, into R G B: the
    // sky and sun, then the triangle laid over them with its rim and fringe.
    // The sky's still parts come from cell k, worked out once.
    let R = 0, G = 0, B = 0, COV = 0;
    const world = (x: number, y: number, k: number, near: boolean) => {
      const dx = x - CX;
      let l = still[k] + corona[k] * breathe + fall[k] * fans[angle[k]];
      // the glint's halo, one on each edge as it climbs
      if (gI > 0) {
        const gh = HW * (1 - (BASE - gy) / PH), gdy = y - gy;
        const gl = Math.min((x - CX + gh) ** 2, (x - CX - gh) ** 2) + gdy * gdy;
        l += Math.exp(-gl / 5) * gI * 0.7;
      }
      // when the glint reaches the tip, a four-pointed star there
      if (flare > 0) {
        const da = y - APEX;
        l += flare * (Math.exp(-(da * da) / 0.35) * Math.exp(-Math.abs(dx) / 16) + Math.exp(-(dx * dx) / 0.35) * Math.exp(-Math.abs(da) / 12)) * 0.9;
      }
      if (near) {
        const s = stars[Math.floor(y) * W + Math.floor(x)];
        if (s) l = Math.max(l, s * (0.65 + 0.35 * Math.sin(t * w * (2 + ((s * 10) | 0)) + s * 40)) * smooth(0.25, 0.04, l));
      }
      R = l, G = l, B = l;
      COV = 0;

      // the triangle
      const sl = sideL(x, y, CX, HW, BASE), sr = sideR(x, y, CX, HW, BASE), sb = y - BASE;
      const edge = Math.max(sl, sr);
      const sd = Math.max(edge, sb);
      if (sd > 4) return;
      const cov = clamp(0.5 - sd * 1.4);
      COV = clamp(0.5 - sd * 0.5);
      R *= 1 - cov, G *= 1 - cov, B *= 1 - cov;
      // how high up the edge, 0 at the base and 1 at the tip
      const hgt = clamp((BASE - y) / PH);
      if (sb < 0.4) {
        // the razor rim, brightest toward the sun, and the glint on it
        let rim = Math.exp(-((edge + 0.55) * (edge + 0.55)) / 0.3) * (0.8 + 0.4 * hgt);
        if (gI > 0) rim += Math.exp(-((y - gy) * (y - gy)) / 3) * gI * Math.exp(-((edge + 0.5) * (edge + 0.5)) / 0.6) * 1.2;
        rim *= smooth(0.4, -0.6, sb);
        R += rim, G += rim, B += rim;
        // the fringe just outside it, dispersing into Vercel's spectrum
        if (edge > -0.5) {
          const fr = Math.exp(-((edge - 0.7) * (edge - 0.7)) / 0.5) * (0.45 + 0.3 * hgt) * smooth(0.4, -1.2, sb);
          spectrum(edge * 0.18 + hgt * 0.9 - t / 6 + (sl > sr ? 0 : 0.5));
          R += fr * spec[0], G += fr * spec[1], B += fr * spec[2];
        }
      }
      // the underside, lit faintly by the water
      const under = Math.exp(-((sb + 0.5) * (sb + 0.5)) / 0.2) * (edge < 0 ? 1 : 0) * 0.32;
      R += under, G += under, B += under;
    };

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        const xc = x + 0.5;
        let floor = 0;
        if (y < HORIZON) {
          world(xc, y, k, true);
          floor = 0.05 * smooth(10, HORIZON, y);
        } else {
          // the mirror: the world flipped about the horizon, shaken a little
          // more as the water comes toward us
          const d = y - HORIZON;
          const amp = RIP * (0.06 + d * 0.011);
          const ph = t * w;
          const sx = xc + amp * (Math.sin(y * 0.8 - ph * 6 + Math.sin(xc * 0.05) * 2) * 0.7 + Math.sin(xc * 0.11 + y * 1.3 - ph * 4) * 0.35);
          const sy = 2 * HORIZON - y + amp * 0.4 * Math.sin(xc * 0.07 - ph * 3 + y * 0.6);
          world(sx, sy, k, false);
          // like any water it mirrors most at a grazing angle, less toward us
          const film = 0.8 - 0.5 * smooth(HORIZON, H, y);
          R *= film, G *= film, B *= film;
          // the ridges of salt, lit pale, hardly at all where they cross the
          // black of the reflection so it stays crisp
          const rg = ridge[k] * (1 - 0.85 * COV);
          if (rg > 0) {
            const lit = shine[k];
            const sh = 1 - 0.55 * rg;
            R = R * sh + rg * lit, G = G * sh + rg * lit, B = B * sh + rg * lit;
          }
          floor = 0.02;
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const cr = R, cg = G, cbl = B;
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = peak < 0.008 ? 0 : clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
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
