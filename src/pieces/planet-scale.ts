/*
 * planet scale: a huge dark planet in deep space, cut by two chasms into the
 * PlanetScale mark. A star behind it pours light through the cuts and round
 * its rim, the sun on its left lays a thin bright crescent and a terminator
 * that runs with the cuts, faint data lights crawl over its night side, and a
 * small moon circles it, crossing in front and slipping behind.
 *
 * The planet's outline is the library's own planetscale logo grid, scaled up
 * and smoothed. Each frame is shaded in grey cell by cell on a square grid,
 * then drawn as a halftone: every cell is a dot whose size is its brightness,
 * ordered-dithered so gradients read as texture, in the nearest palette grey.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of planet scale. Defaults are the original values. */
export interface PlanetScaleOptions {
  [key: string]: unknown;
  /** The planet's centre column. */
  centreX: number;
  /** The planet's centre row. */
  centreY: number;
  /** The planet's radius in cells. */
  radius: number;
  /** The backlight star's offset from the planet's centre. */
  backX: number;
  /** The backlight star's offset from the planet's centre. */
  backY: number;
  /** The moon's radius in cells. */
  moonRadius: number;
  /** Seconds for the moon to go round. */
  orbit: number;
  /** The moon's wide orbit radius. */
  orbitWidth: number;
  /** The moon's tall orbit radius. */
  orbitHeight: number;
}

export const meta = {
  name: "planet scale",
  category: "scenes",
  note: "a dark planet cut into the planetscale mark, backlit, a moon circling",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#050505",
  options: {
    centreX: 100,
    centreY: 50,
    radius: 41,
    backX: 18,
    backY: 18,
    moonRadius: 7,
    orbit: 16,
    orbitWidth: 66,
    orbitHeight: 11,
  },
  params: {
    centreX: { label: "planet position", min: 40, max: 160, step: 1 },
    centreY: { label: "planet height", min: 30, max: 70, step: 1 },
    radius: { label: "planet radius", min: 20, max: 60, step: 1 },
    backX: { label: "backlight position", min: 0, max: 60, step: 1 },
    backY: { label: "backlight height", min: 0, max: 60, step: 1 },
    moonRadius: { label: "moon radius", min: 3, max: 14, step: 0.5 },
    orbit: { label: "moon orbit", min: 6, max: 36, step: 1 },
    orbitWidth: { label: "moon orbit width", min: 30, max: 100, step: 1 },
    orbitHeight: { label: "moon orbit height", min: 6, max: 30, step: 1 },
  },
  palette: [
    "#101010", "#181818", "#202020", "#282828", "#303030", "#3a3a3a", "#444444", "#4e4e4e",
    "#585858", "#636363", "#6e6e6e", "#797979", "#858585", "#919191", "#9d9d9d", "#a9a9a9",
    "#b5b5b5", "#c1c1c1", "#cccccc", "#d7d7d7", "#e1e1e1", "#eaeaea", "#f3f3f3", "#ffffff",
  ],
    } satisfies Meta<PlanetScaleOptions>;

// The silhouette of src/pieces/planetscale.ts: 0 is the logo, a space is not.
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000000000000000
         00000000000000000000000000000000000000
       000000000000000000000000000000000000000000
      00000000000000000000000000000000000000000000
     0000000000000000000000000000000000000000000000
    000000000000000000000000000000000000000000000000
   000000000000000000000000000000000000000000000000
  00000000000000000000000000000000000000000000000
  000000000000000000000000000000000000000000000
  0000000000000000000000000000000000000000000
  00000000000000000000000000000000000000000
  00000000000000000000000000    000000000           00
  000000000000000000000000    000000000           0000
  0000000000000000000000    000000000           000000
  00000000000000000000    000000000           00000000
   00000000000000000    000000000           000000000
    00000000000000    000000000           0000000000
     00000000000    000000000           00000000000
      00000000    000000000           000000000000
       00000    000000000           0000000000000
         0    000000000           0000000000000
             00000000           0000000000000
              00000           000000000000
                            0000000000

`;

const W = 200, H = 100;
const SUN = [-0.68, -0.68, 0.2]; // toward the sun: upper left, a little toward us
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

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
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// A 3x3 box blur, `passes` times over, in place.
function blur(a: Float32Array, passes: number) {
  const b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let r = 0; r < H; r++)
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let i = -1; i <= 1; i++) s += a[r * W + Math.min(W - 1, Math.max(0, x + i))];
        b[r * W + x] = s / 3;
      }
    for (let r = 0; r < H; r++)
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let i = -1; i <= 1; i++) s += b[Math.min(H - 1, Math.max(0, r + i)) * W + x];
        a[r * W + x] = s / 3;
      }
  }
}

export default function planetScale(o: Partial<PlanetScaleOptions> = {}): Frame {
  const { centreX = meta.options.centreX, centreY = meta.options.centreY, radius = meta.options.radius, backX = meta.options.backX, backY = meta.options.backY, moonRadius = meta.options.moonRadius, orbit = meta.options.orbit, orbitWidth = meta.options.orbitWidth, orbitHeight = meta.options.orbitHeight } = o;
  const CX = centreX, CY = centreY, R = radius;
  const MOON_R = moonRadius;
  const ORBIT = orbit;
  const OW = orbitWidth, OH = orbitHeight;
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

  // --- the mark, read off the logo grid ------------------------------------
  const ink = INK.slice(1, -1).split("\n");
  const GW = Math.max(...ink.map((l) => l.length)), GH = ink.length;
  const at = (c: number, r: number) => (r >= 0 && r < GH && c >= 0 && c < GW && ink[r][c] && ink[r][c] !== " " ? 1 : 0);
  let c0 = GW, c1 = 0, r0 = GH, r1 = 0;
  for (let r = 0; r < GH; r++)
    for (let c = 0; c < GW; c++)
      if (at(c, r)) (c0 = Math.min(c0, c)), (c1 = Math.max(c1, c + 1)), (r0 = Math.min(r0, r)), (r1 = Math.max(r1, r + 1));
  // Bilinear coverage of the grid at a point in grid units, cell centres at +0.5.
  const cov = (u: number, v: number) => {
    const x = u - 0.5, y = v - 0.5;
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  // The disc gives the outline its clean curve; the grid, scaled to the disc's
  // box (its cells twice as tall as wide), gives the two cuts.
  const body = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - CX) / R, dy = (r + 0.5 - CY) / R;
      const u = c0 + ((dx + 1) / 2) * (c1 - c0), v = r0 + ((dy + 1) / 2) * (r1 - r0);
      body[r * W + x] = cov(u, v);
    }
  blur(body, 2);
  const solid = new Float32Array(N); // 1 on the planet
  const cut = new Float32Array(N); // 1 inside a chasm
  const glow = new Float32Array(N); // the chasms' light spilling onto their walls
  for (let k = 0; k < N; k++) {
    const x = k % W, r = (k / W) | 0;
    const d = Math.hypot(x + 0.5 - CX, r + 0.5 - CY);
    const disc = smooth(R + 0.6, R - 0.6, d);
    const m = smooth(0.38, 0.62, body[k]);
    solid[k] = disc * m;
    cut[k] = disc * (1 - m);
    glow[k] = cut[k];
  }
  blur(glow, 1);

  // --- the planet's surface, a band texture wrapped round its axis ----------
  // The axis points down and right, across the cuts, so the bands, the
  // terminator and the cuts all run the same way.
  const s2 = Math.SQRT1_2;
  const nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N);
  const lat = new Float32Array(N), lon = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const x = k % W, r = (k / W) | 0;
    const a = (x + 0.5 - CX) / R, b = (r + 0.5 - CY) / R;
    const q = a * a + b * b;
    if (q >= 1.02) continue;
    const z = Math.sqrt(Math.max(0, 1 - q));
    nx[k] = a, ny[k] = b, nz[k] = z;
    lat[k] = Math.asin(Math.max(-1, Math.min(1, (a + b) * s2)));
    lon[k] = Math.atan2((a - b) * s2, z);
  }
  const LA = 96, LO = 256;
  const bands = new Float32Array(LA * LO);
  for (let i = 0; i < LA; i++)
    for (let j = 0; j < LO; j++) {
      const la = i / LA, lo = j / LO;
      const warp = fbm(lo * 12, la * 6, 3, 12) * 0.08;
      const stripe = 0.5 + 0.5 * Math.sin((la + warp) * 38 + 1.6 * Math.sin(la * 17));
      bands[i * LO + j] = 0.75 * stripe + 0.25 * fbm(lo * 16, la * 30, 3, 16);
    }

  // The stars, fixed.
  const star = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const x = k % W, r = (k / W) | 0;
    const h = hash(x * 3 + 7, r * 5 + 1);
    if (h > 0.986) star[k] = 0.35 + 0.65 * hash(x, r + 99);
  }

  const L = SUN.map((v) => v / Math.hypot(...SUN));
  const LH = Math.hypot(L[0], L[1]);
  const BACK = [CX + backX, CY + backY]; // the star behind the planet
  // How far each cell is from the hidden star, and how squarely the limb under
  // it faces the sun, both fixed.
  const back = new Float32Array(N), facing = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const x = k % W, r = (k / W) | 0;
    back[k] = Math.hypot(x + 0.5 - BACK[0], r + 0.5 - BACK[1]);
    facing[k] = (nx[k] * L[0] + ny[k] * L[1]) / Math.max(1e-3, Math.hypot(nx[k], ny[k])) / LH;
  }

  return (t, { color } = {}) => {
    const spin = (t / 120) * LO; // the planet turns once in two minutes
    const a = (t / ORBIT) * Math.PI * 2 + 2.2;
    const ex = Math.cos(a) * OW, ey = Math.sin(a) * OH;
    const tilt = -0.32;
    const mx = CX + ex * Math.cos(tilt) - ey * Math.sin(tilt);
    const my = CY + ex * Math.sin(tilt) + ey * Math.cos(tilt);
    const front = Math.sin(a) > 0;
    const mr = MOON_R * (1 + 0.08 * Math.sin(a));

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        let v = 0, floor = 0, fade = 1;
        const px = x + 0.5 - CX, py = y - CY;
        const d = Math.sqrt(px * px + py * py);
        const sp = solid[k];

        // space: black, stars, the backlight's corona round the rim
        const db = back[k];
        const toward = 0.15 + 0.85 * smooth(80, 25, db);
        const corona = Math.exp(-Math.max(0, d - R) / 1.6) * 0.55 + Math.exp(-Math.max(0, d - R) / 6) * 0.14 * toward;
        let bg = corona * toward * smooth(R - 2, R + 0.5, d);
        if (star[k]) {
          const tw = 0.65 + 0.35 * Math.sin(t * (1.3 + hash(x, r) * 2.5) + hash(r, x) * 6.28);
          bg = Math.max(bg, star[k] * tw * smooth(R + 3, R + 14, d));
        }
        // through the chasms: the star itself, white hot
        const c = cut[k];
        if (c > 0) bg = Math.max(bg, c * (0.72 + 0.45 * Math.exp(-db / 30)));
        v = bg;

        if (sp > 0.001) {
          // the planet: banded, lit from the upper left, dark on the night side
          const n0 = nx[k], n1 = ny[k], n2 = nz[k];
          const day = n0 * L[0] + n1 * L[1] + n2 * L[2];
          const li = (lat[k] / Math.PI + 0.5) * (LA - 1);
          let lj = ((lon[k] / (Math.PI * 2) + 0.5) * LO + spin) % LO;
          if (lj < 0) lj += LO;
          const tex = bands[(li | 0) * LO + (lj | 0)];
          const lit = smooth(-0.04, 0.2, day) * (0.03 + 0.7 * Math.pow(Math.max(0, day), 1.5));
          let s = lit * (0.6 + 0.65 * tex);
          // a thin bright crescent along the sunlit limb
          const limb = smooth(0.9, 0.995, d / R);
          const fc = facing[k];
          s += limb * smooth(0.1, 0.8, fc) * 0.9;
          // the walls of the chasms catch the light pouring through
          s += glow[k] * 0.3;
          // the backlight wraps the far rim
          s += smooth(0.86, 0.985, d / R) * 0.95 * toward * (1 - smooth(-0.3, 0.3, fc));
          // data lights on the night side: dotted rows along the bands, a pulse running each
          const night = 1 - smooth(-0.12, 0.06, day);
          // (the rows are the bands' own lines, which run straight across the disc)
          if (night > 0 && n2 > 0.15) {
            const row = ((n0 + n1) * s2 * R) / 4;
            const ri = Math.round(row);
            if (Math.abs(row - ri) < 0.14) {
              const seg = Math.floor((lon[k] + (spin / LO) * Math.PI * 2) * 26);
              if (hash(seg, ri + 40) > 0.5) {
                const pulse = Math.pow(0.5 + 0.5 * Math.sin(seg * 0.5 - t * 2.4 * (0.6 + hash(ri, 3)) + ri * 2), 8);
                s += night * (0.3 + 0.7 * pulse) * (0.3 + 0.7 * n2);
              }
            }
          }
          v = v * (1 - sp) + s * sp;
          floor = 0.07 * sp;
        }

        // the moon, in front of the planet or behind it
        const dmx = x + 0.5 - mx, dmy = y - my;
        const dm = Math.sqrt(dmx * dmx + dmy * dmy);
        if (dm < mr + 0.6 && (front || sp < 0.5)) {
          const a0 = dmx / mr, a1 = dmy / mr;
          const z = Math.sqrt(Math.max(0, 1 - a0 * a0 - a1 * a1));
          const day = a0 * L[0] + a1 * L[1] + z * L[2];
          const crater = 0.75 + 0.25 * fbm(dmx * 0.6 + 40, dmy * 0.6, 2, 0);
          let s = smooth(-0.05, 0.25, day) * (0.3 + 0.8 * Math.max(0, day)) * crater;
          s += smooth(0.75, 1, dm / mr) * smooth(0.2, 0.9, (a0 * L[0] + a1 * L[1]) / Math.max(1e-3, dm / mr) / LH) * 0.7;
          // its night side, a shade off black, so it stays a disc against the planet's light
          s = Math.max(s, 0.05);
          const edge = smooth(mr + 0.6, mr - 0.6, dm);
          v = v * (1 - edge) + s * edge;
          floor = Math.max(floor * (1 - edge), 0.22 * edge);
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(v, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          // grey only: a dim cell keeps a dim dot, so the dark side stays dark
          const g = clamp((0.3 + 0.7 * want) * (0.22 + 0.78 * smooth(0, 0.6, peak)));
          color[k] = nearest(g, g, g);
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
