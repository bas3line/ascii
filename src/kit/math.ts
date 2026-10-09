/*
 * kit math: the maths every piece writes for itself, done once, so a piece
 * says what it wants and not how to work it out. You talk in cells and
 * seconds: noise() makes hills, ridges or cells a given number of cells
 * across that drift, change and come round on their own; scatter() spreads
 * things evenly over the grid from a seed; twinkle(), tween() and progress()
 * animate in seconds with the standard easings; camera() turns 3D points and
 * lands them on the grid, fitted. Under those are the parts, for when you
 * want them: seeded random numbers, simplex noise in 2, 3 and 4 dimensions,
 * fractal noise, remap and wrap, vectors, rotation and projection, and time
 * helpers that come round exactly. All of it is deterministic: the same seed
 * and the same t give the same frame every time. The random numbers and the
 * noise of noise2, noise3, noise4, fbm and ridged are plain arithmetic, the
 * same to the last bit in every browser and in Node; what goes through sin,
 * cos, log or powers (loops, turns, easings, normal()) may differ in its last
 * digit between engines, which almost never changes a character.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { piece, noise } from "ascii.rest/kit";
 *
 *   const sky = noise({ size: 16, drift: 3 });
 *
 *   export default piece({ name: "clouds", cols: 64, rows: 16 }, (t, s) => {
 *     for (let y = 0; y < s.rows; y++)
 *       for (let x = 0; x < s.cols; x++) if (sky(x, y, t) > 0.6) s.set(x, y, "~");
 *   });
 */
import { TAU, and, clamp, fail, hash, mulberry32 } from "./core.ts";

// The maths core already has, so one import brings all of it.
export { TAU, bayer, clamp, fract, hash, lerp, mulberry32, smoothstep, valueNoise } from "./core.ts";

// A value as an error shows it: strings quoted, so the string "7" doesn't read as the number 7.
const said = (v: unknown) => (typeof v === "string" ? JSON.stringify(v) : String(v));
// A number that is finite, and not a string that looks like one.
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// --- numbers ------------------------------------------------------------------------

/** Where v sits from a to b: 0 at a, 1 at b, below 0 or above 1 past them. 0 when a and b are the same. */
export const invLerp = (a: number, b: number, v: number): number => (a === b ? 0 : (v - a) / (b - a));

/**
 * v taken from the range inLo..inHi to the range outLo..outHi, as p5's map(): remap(5, 0, 10, 100, 200) is 150.
 * Past the input range it carries on past the output range, unless `clamped` (false) keeps it inside. Either range
 * may run downwards. An input range of no width gives outLo.
 */
export function remap(v: number, inLo: number, inHi: number, outLo: number, outHi: number, clamped = false): number {
  let k = inLo === inHi ? 0 : (v - inLo) / (inHi - inLo);
  if (clamped) k = k < 0 ? 0 : k > 1 ? 1 : k;
  return outLo + (outHi - outLo) * k;
}

/** a modulo n, never negative: from 0 up to n, for a below 0 too (mod(-1, 4) is 3, where -1 % 4 is -1). n above 0. */
export function mod(a: number, n: number): number {
  // % is exact; only a negative remainder needs n added, and that can round up to n itself, which is 0 round again.
  const r = a % n;
  return r < 0 ? (r + n < n ? r + n : 0) : r + 0;
}

/** v wrapped into lo..hi, coming back round to lo at hi: wrap(370, 0, 360) is 10, wrap(-1, 0, 64) is 63. hi above lo. */
export const wrap = (v: number, lo: number, hi: number): number => (hi === lo ? lo : lo + mod(v - lo, hi - lo));

/** v bounced between 0 and length: up from 0 to length, back down to 0 at twice length, and again. */
export const pingpong = (v: number, length: number): number => (length > 0 ? length - Math.abs(mod(v, 2 * length) - length) : 0);

/** 0 below edge and 1 from it on, as GLSL's step(). */
export const step = (edge: number, v: number): number => (v < edge ? 0 : 1);

/** Radians in degrees. */
export const degrees = (rad: number): number => (rad * 180) / Math.PI;
/** Degrees in radians: the kit's angles are radians. */
export const radians = (deg: number): number => (deg * Math.PI) / 180;

// --- random numbers -------------------------------------------------------------------

/**
 * Seeded random numbers: call it for the next number from 0 up to 1, or use its helpers. The same seed gives the same
 * numbers, in the same order, everywhere. Draw them in a piece's setup or at the top of its file, not in its frames, so
 * a frame depends only on t.
 */
export interface Random {
  /** The next number, from 0 up to (never reaching) 1. */
  (): number;
  /** The seed it was made with. */
  readonly seed: number;
  /** A number from lo up to hi. */
  range(lo: number, hi: number): number;
  /** A whole number from lo to hi, both included: int(1, 6) is a die. Throws for fractions or hi below lo. */
  int(lo: number, hi: number): number;
  /** One item of a list, each as likely. Throws for an empty list. */
  pick<T>(list: readonly T[]): T;
  /** True with probability p, 0 to 1: chance(0.25) is true about a quarter of the time. */
  chance(p: number): boolean;
  /** A number from a bell curve around `mean` (0) with spread `sd` (1): most within one sd, nearly all within three. */
  normal(mean?: number, sd?: number): number;
  /** 1 or -1, as likely. */
  sign(): 1 | -1;
  /** An angle in radians, 0 up to TAU. */
  angle(): number;
  /** The list in a random order, shuffled in place and returned. */
  shuffle<T>(list: T[]): T[];
  /** A point anywhere inside a circle of radius `r` (1) round 0, 0, every part of it as likely. */
  inCircle(r?: number): Vec2;
  /** A point on a circle of radius `r` (1) round 0, 0: a direction, `r` long. */
  onCircle(r?: number): Vec2;
  /** A point anywhere inside a ball of radius `r` (1) round the origin. */
  inSphere(r?: number): Vec3;
  /** A point on a sphere of radius `r` (1) round the origin, every part of it as likely: dots for a globe. */
  onSphere(r?: number): Vec3;
  /**
   * Another generator, independent of this one: stream `n` of this seed. It depends only on the seed and n, not on how
   * many numbers were drawn, so random(7).fork(2) is always the same stream. A whole number.
   */
  fork(n: number): Random;
}

/**
 * A seeded generator (mulberry32 underneath) with helpers: random(7).int(1, 6). `seed` is a whole number, 1 by default;
 * its lowest 32 bits are what count. Throws for a fraction.
 *
 *   const rnd = random(42);
 *   const dots = Array.from({ length: 500 }, () => rnd.onSphere());
 */
export function random(seed = 1): Random {
  if (!Number.isInteger(seed)) fail(`random() takes a whole number seed, such as 7, not ${said(seed)}`);
  const next = mulberry32(seed);
  const r = (() => next()) as Random;
  Object.defineProperty(r, "seed", { value: seed, enumerable: true });
  r.range = (lo, hi) => lo + (hi - lo) * next();
  r.int = (lo, hi) => {
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) fail(`int() takes whole numbers lo and hi, with hi at least lo, not ${lo} and ${hi}`);
    return lo + Math.floor(next() * (hi - lo + 1));
  };
  r.pick = <T>(list: readonly T[]): T => {
    if (!list || !list.length) fail("pick() takes a list of one or more things to pick from");
    return list[Math.floor(next() * list.length)];
  };
  r.chance = (p) => {
    if (!(finite(p) && p >= 0 && p <= 1)) fail(`chance() takes a probability from 0 to 1, not ${said(p)}`);
    return next() < p;
  };
  // Box and Muller's way: two even draws make one from the bell curve.
  r.normal = (mean = 0, sd = 1) => mean + sd * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(TAU * next());
  r.sign = () => (next() < 0.5 ? -1 : 1);
  r.angle = () => next() * TAU;
  r.shuffle = <T>(list: T[]): T[] => {
    if (!Array.isArray(list)) fail(`shuffle() takes a list to shuffle in place, not ${said(list)}`);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const v = list[i];
      list[i] = list[j];
      list[j] = v;
    }
    return list;
  };
  r.onCircle = (radius = 1) => {
    const a = next() * TAU;
    return [radius * Math.cos(a), radius * Math.sin(a)];
  };
  // The square root spreads points out to the rim, so the middle isn't crowded.
  r.inCircle = (radius = 1) => {
    const a = next() * TAU, k = radius * Math.sqrt(next());
    return [k * Math.cos(a), k * Math.sin(a)];
  };
  // Archimedes: a sphere's area is even in height, so an even height and an even angle cover it evenly.
  r.onSphere = (radius = 1) => {
    const y = 2 * next() - 1, a = next() * TAU, k = Math.sqrt(1 - y * y);
    return [radius * k * Math.cos(a), radius * y, radius * k * Math.sin(a)];
  };
  r.inSphere = (radius = 1) => {
    const p = r.onSphere(radius), k = Math.cbrt(next());
    return [p[0] * k, p[1] * k, p[2] * k];
  };
  r.fork = (n) => {
    if (!Number.isInteger(n)) fail(`fork() takes a whole number for the stream, such as 1, not ${said(n)}`);
    return random(Math.floor(hash(seed, n, 0x2545f491) * 4294967296) | 0);
  };
  return r;
}

// --- noise ----------------------------------------------------------------------------

// Each seed's permutation of 0 to 255, twice over so lookups never wrap, and the same mod 12 for the 3D gradients.
// Made the first time a seed is used and kept: a few hundred bytes a seed, and at most 256 seeds before starting over.
interface Table {
  perm: Uint8Array;
  mod12: Uint8Array;
}
const tables = new Map<number, Table>();
let lastSeed = 0;
let last: Table | null = null;

function table(seed: number): Table {
  seed |= 0;
  if (seed === lastSeed && last) return last;
  let t = tables.get(seed);
  if (!t) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    const r = mulberry32(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const v = p[i];
      p[i] = p[j];
      p[j] = v;
    }
    const perm = new Uint8Array(512), mod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      mod12[i] = perm[i] % 12;
    }
    if (tables.size >= 256) tables.clear();
    tables.set(seed, (t = { perm, mod12 }));
  }
  lastSeed = seed;
  last = t;
  return t;
}

// Gradients for 2D and 3D: the midpoints of a cube's twelve edges (Gustavson's grad3). 2D uses their x and y.
const G3 = new Float64Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
// Gradients for 4D: the midpoints of a tesseract's 32 edges.
const G4 = new Float64Array([
  0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
  1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1, -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
  1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1, -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
  1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0,
]);

const F2 = 0.5 * (Math.sqrt(3) - 1), H2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3, H3 = 1 / 6;
const F4 = (Math.sqrt(5) - 1) / 4, H4 = (5 - Math.sqrt(5)) / 20;
// Gustavson's scales: measured over four million points each, they reach -0.998..0.998 in 2D, -0.978..0.978 in 3D and
// -0.985..0.985 in 4D, so 0..1 is used nearly to its ends. Anything past is clamped.
const S2 = 70, S3 = 32, S4 = 27;

const unit = (n: number) => (n <= -1 ? 0 : n >= 1 ? 1 : 0.5 + 0.5 * n);

// A 4D gradient (by its index into G4) dotted with an offset.
const dot4 = (g: number, a: number, b: number, c: number, d: number) => G4[g] * a + G4[g + 1] * b + G4[g + 2] * c + G4[g + 3] * d;

// Simplex noise in 2D, -1..1: Stefan Gustavson's, from "Simplex noise demystified" (2005, 2012).
function simplex2(x: number, y: number, seed: number): number {
  const { perm, mod12 } = table(seed);
  const s = (x + y) * F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * H2;
  const x0 = x - (i - t), y0 = y - (j - t);
  // Which of the cell's two triangles the point is in.
  const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + H2, y1 = y0 - j1 + H2;
  const x2 = x0 - 1 + 2 * H2, y2 = y0 - 1 + 2 * H2;
  const ii = i & 255, jj = j & 255;
  let n = 0, k: number, g: number;
  if ((k = 0.5 - x0 * x0 - y0 * y0) > 0) (g = mod12[ii + perm[jj]] * 3), (k *= k), (n += k * k * (G3[g] * x0 + G3[g + 1] * y0));
  if ((k = 0.5 - x1 * x1 - y1 * y1) > 0) (g = mod12[ii + i1 + perm[jj + j1]] * 3), (k *= k), (n += k * k * (G3[g] * x1 + G3[g + 1] * y1));
  if ((k = 0.5 - x2 * x2 - y2 * y2) > 0) (g = mod12[ii + 1 + perm[jj + 1]] * 3), (k *= k), (n += k * k * (G3[g] * x2 + G3[g + 1] * y2));
  return S2 * n;
}

// Simplex noise in 3D, -1..1.
function simplex3(x: number, y: number, z: number, seed: number): number {
  const { perm, mod12 } = table(seed);
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s), j = Math.floor(y + s), l = Math.floor(z + s);
  const t = (i + j + l) * H3;
  const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (l - t);
  // Which of the cell's six tetrahedra the point is in: the order of x0, y0 and z0.
  let i1, j1, l1, i2, j2, l2;
  if (x0 >= y0) {
    if (y0 >= z0) (i1 = 1), (j1 = 0), (l1 = 0), (i2 = 1), (j2 = 1), (l2 = 0);
    else if (x0 >= z0) (i1 = 1), (j1 = 0), (l1 = 0), (i2 = 1), (j2 = 0), (l2 = 1);
    else (i1 = 0), (j1 = 0), (l1 = 1), (i2 = 1), (j2 = 0), (l2 = 1);
  } else if (y0 < z0) (i1 = 0), (j1 = 0), (l1 = 1), (i2 = 0), (j2 = 1), (l2 = 1);
  else if (x0 < z0) (i1 = 0), (j1 = 1), (l1 = 0), (i2 = 0), (j2 = 1), (l2 = 1);
  else (i1 = 0), (j1 = 1), (l1 = 0), (i2 = 1), (j2 = 1), (l2 = 0);
  const x1 = x0 - i1 + H3, y1 = y0 - j1 + H3, z1 = z0 - l1 + H3;
  const x2 = x0 - i2 + 2 * H3, y2 = y0 - j2 + 2 * H3, z2 = z0 - l2 + 2 * H3;
  const x3 = x0 - 1 + 3 * H3, y3 = y0 - 1 + 3 * H3, z3 = z0 - 1 + 3 * H3;
  const ii = i & 255, jj = j & 255, ll = l & 255;
  let n = 0, k: number, g: number;
  if ((k = 0.6 - x0 * x0 - y0 * y0 - z0 * z0) > 0) (g = mod12[ii + perm[jj + perm[ll]]] * 3), (k *= k), (n += k * k * (G3[g] * x0 + G3[g + 1] * y0 + G3[g + 2] * z0));
  if ((k = 0.6 - x1 * x1 - y1 * y1 - z1 * z1) > 0)
    (g = mod12[ii + i1 + perm[jj + j1 + perm[ll + l1]]] * 3), (k *= k), (n += k * k * (G3[g] * x1 + G3[g + 1] * y1 + G3[g + 2] * z1));
  if ((k = 0.6 - x2 * x2 - y2 * y2 - z2 * z2) > 0)
    (g = mod12[ii + i2 + perm[jj + j2 + perm[ll + l2]]] * 3), (k *= k), (n += k * k * (G3[g] * x2 + G3[g + 1] * y2 + G3[g + 2] * z2));
  if ((k = 0.6 - x3 * x3 - y3 * y3 - z3 * z3) > 0)
    (g = mod12[ii + 1 + perm[jj + 1 + perm[ll + 1]]] * 3), (k *= k), (n += k * k * (G3[g] * x3 + G3[g + 1] * y3 + G3[g + 2] * z3));
  return S3 * n;
}

// Simplex noise in 4D, -1..1: what loopNoise() travels a circle through, two axes of it, so x and y stay where they are.
function simplex4(x: number, y: number, z: number, w: number, seed: number): number {
  const { perm } = table(seed);
  const s = (x + y + z + w) * F4;
  const i = Math.floor(x + s), j = Math.floor(y + s), l = Math.floor(z + s), m = Math.floor(w + s);
  const t = (i + j + l + m) * H4;
  const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (l - t), w0 = w - (m - t);
  // Which of the 24 simplices: rank the four offsets, largest first.
  let rx = 0, ry = 0, rz = 0, rw = 0;
  if (x0 > y0) rx++;
  else ry++;
  if (x0 > z0) rx++;
  else rz++;
  if (x0 > w0) rx++;
  else rw++;
  if (y0 > z0) ry++;
  else rz++;
  if (y0 > w0) ry++;
  else rw++;
  if (z0 > w0) rz++;
  else rw++;
  const i1 = rx >= 3 ? 1 : 0, j1 = ry >= 3 ? 1 : 0, l1 = rz >= 3 ? 1 : 0, m1 = rw >= 3 ? 1 : 0;
  const i2 = rx >= 2 ? 1 : 0, j2 = ry >= 2 ? 1 : 0, l2 = rz >= 2 ? 1 : 0, m2 = rw >= 2 ? 1 : 0;
  const i3 = rx >= 1 ? 1 : 0, j3 = ry >= 1 ? 1 : 0, l3 = rz >= 1 ? 1 : 0, m3 = rw >= 1 ? 1 : 0;
  const x1 = x0 - i1 + H4, y1 = y0 - j1 + H4, z1 = z0 - l1 + H4, w1 = w0 - m1 + H4;
  const x2 = x0 - i2 + 2 * H4, y2 = y0 - j2 + 2 * H4, z2 = z0 - l2 + 2 * H4, w2 = w0 - m2 + 2 * H4;
  const x3 = x0 - i3 + 3 * H4, y3 = y0 - j3 + 3 * H4, z3 = z0 - l3 + 3 * H4, w3 = w0 - m3 + 3 * H4;
  const x4 = x0 - 1 + 4 * H4, y4 = y0 - 1 + 4 * H4, z4 = z0 - 1 + 4 * H4, w4 = w0 - 1 + 4 * H4;
  const ii = i & 255, jj = j & 255, ll = l & 255, mm = m & 255;
  let n = 0, k: number;
  if ((k = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0) > 0) (k *= k), (n += k * k * dot4((perm[ii + perm[jj + perm[ll + perm[mm]]]] & 31) * 4, x0, y0, z0, w0));
  if ((k = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1) > 0)
    (k *= k), (n += k * k * dot4((perm[ii + i1 + perm[jj + j1 + perm[ll + l1 + perm[mm + m1]]]] & 31) * 4, x1, y1, z1, w1));
  if ((k = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2) > 0)
    (k *= k), (n += k * k * dot4((perm[ii + i2 + perm[jj + j2 + perm[ll + l2 + perm[mm + m2]]]] & 31) * 4, x2, y2, z2, w2));
  if ((k = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3) > 0)
    (k *= k), (n += k * k * dot4((perm[ii + i3 + perm[jj + j3 + perm[ll + l3 + perm[mm + m3]]]] & 31) * 4, x3, y3, z3, w3));
  if ((k = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4) > 0)
    (k *= k), (n += k * k * dot4((perm[ii + 1 + perm[jj + 1 + perm[ll + 1 + perm[mm + 1]]]] & 31) * 4, x4, y4, z4, w4));
  return S4 * n;
}

/**
 * Simplex noise at x, y: smooth hills and hollows, 0 to 1, about one feature a unit, so divide cell positions by the
 * size you want (noise2(x / 8, y / 4) has features about 8 columns wide), or let noise() do it. `seed` is a whole
 * number, 0 by default: each seed is a different pattern (fractions are dropped).
 */
export const noise2 = (x: number, y: number, seed = 0): number => unit(simplex2(x, y, seed));
/** Simplex noise in 3D, 0 to 1: the third axis is often time, noise3(x, y, t) for a pattern that changes in place. */
export const noise3 = (x: number, y: number, z: number, seed = 0): number => unit(simplex3(x, y, z, seed));
/** Simplex noise in 4D, 0 to 1: two axes of space and two more, as loopNoise() uses to come round exactly. */
export const noise4 = (x: number, y: number, z: number, w: number, seed = 0): number => unit(simplex4(x, y, z, w, seed));

/** Smooth value noise in 3D, 0 to 1, on a lattice of whole numbers: blockier and cheaper than noise3. `seed` 0. */
export function valueNoise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  // A lattice corner's value: the seed is hash's fourth number.
  const at = (a: number, b: number, c: number) => hash(a, b, c, seed);
  const x00 = at(xi, yi, zi) + (at(xi + 1, yi, zi) - at(xi, yi, zi)) * u;
  const x10 = at(xi, yi + 1, zi) + (at(xi + 1, yi + 1, zi) - at(xi, yi + 1, zi)) * u;
  const x01 = at(xi, yi, zi + 1) + (at(xi + 1, yi, zi + 1) - at(xi, yi, zi + 1)) * u;
  const x11 = at(xi, yi + 1, zi + 1) + (at(xi + 1, yi + 1, zi + 1) - at(xi, yi + 1, zi + 1)) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/** How fractal noise is built: layers (octaves) of noise, each finer and fainter than the last. */
export interface FbmOptions {
  /** Layers of noise, a whole number from 1 to 16: 4. Each adds finer detail and costs as much again. */
  octaves?: number;
  /** How much finer each layer is than the one before: 2 (twice the detail). Above 0. */
  lacunarity?: number;
  /** How much each layer counts against the one before: 0.5. Lower is smoother, higher rougher. 0 or more. */
  gain?: number;
  /** A whole number: 0. Each seed is a different pattern. */
  seed?: number;
}

// Each octave's offset, so the layers don't all line up at the origin, where simplex noise is always 0.
const OFF = Array.from({ length: 16 }, (_, i) => [((i * 0.6180339887) % 1) * 97.3, ((i * 0.7548776662) % 1) * 89.1]);

// Reads and checks fbm options without making anything: this runs once a cell.
let octN = 4, octLac = 2, octGain = 0.5, octSeed = 0;
function octaves(o: FbmOptions | undefined, n = 4): void {
  octN = o?.octaves ?? n;
  octLac = o?.lacunarity ?? 2;
  octGain = o?.gain ?? 0.5;
  octSeed = o?.seed ?? 0;
  if (!(Number.isInteger(octN) && octN >= 1 && octN <= 16)) fail(`octaves takes a whole number from 1 to 16, not ${said(octN)}`);
  if (!(finite(octLac) && octLac > 0)) fail(`lacunarity takes a number above 0, such as 2, not ${said(octLac)}`);
  if (!(finite(octGain) && octGain >= 0)) fail(`gain takes a number of 0 or more, such as 0.5, not ${said(octGain)}`);
  if (!Number.isInteger(octSeed)) fail(`seed takes a whole number, such as 7, not ${said(octSeed)}`);
}

// Layers add up to a narrower spread than one; this widens fractal noise back out to use most of 0..1.
const SPREAD = 1.45;
// 4D noise spreads less than 2D and 3D (a standard deviation of 0.15 in 0..1, against 0.21): widened to about 0.2, so
// swapping noise3(x, y, t) for loopNoise() keeps the contrast, with about 1% at each end clamped.
const WIDEN4 = 1.35;

/**
 * Fractal noise at x, y, 0 to 1: octaves of simplex noise, each finer and fainter, for clouds, terrain, smoke and
 * anything with detail at every scale. Options: octaves (4), lacunarity (2), gain (0.5), seed (0).
 */
export function fbm(x: number, y: number, o?: FbmOptions): number {
  octaves(o);
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < octN; i++) {
    sum += amp * simplex2(x * f + OFF[i][0], y * f + OFF[i][1], octSeed);
    norm += amp;
    amp *= octGain;
    f *= octLac;
  }
  return unit((sum / norm) * SPREAD);
}

/** Fractal noise in 3D, 0 to 1: fbm with a third axis, often time. The same options as fbm(). */
export function fbm3(x: number, y: number, z: number, o?: FbmOptions): number {
  octaves(o);
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < octN; i++) {
    sum += amp * simplex3(x * f + OFF[i][0], y * f + OFF[i][1], z * f + OFF[i][0], octSeed);
    norm += amp;
    amp *= octGain;
    f *= octLac;
  }
  return unit((sum / norm) * SPREAD);
}

// A layer of ridged noise from simplex noise -1..1: 1 on the line where it crosses 0, falling away squared.
const crest = (n: number) => {
  const r = 1 - (n < 0 ? -n : n);
  return r < 0 ? 0 : r * r;
};
// Musgrave's ridged multifractal: each layer after the first counts as much as the one before is high (twice it, up to
// all of it), so the finer detail sits on the crests and the valleys between stay soft.
const weigh = (r: number) => (r > 0.5 ? 1 : 2 * r);

/**
 * Ridged fractal noise at x, y, 0 to 1: sharp crests along the lines where noise crosses its middle, with finer crests
 * branching off them and soft valleys between, for mountain ranges, veins and lightning. The same options as fbm().
 */
export function ridged(x: number, y: number, o?: FbmOptions): number {
  octaves(o);
  let sum = 0, amp = 1, norm = 0, f = 1, w = 1;
  for (let i = 0; i < octN; i++) {
    const r = crest(simplex2(x * f + OFF[i][0], y * f + OFF[i][1], octSeed)) * w;
    sum += amp * r;
    norm += amp;
    w = weigh(r);
    amp *= octGain;
    f *= octLac;
  }
  return sum / norm;
}

/** What loopNoise() takes: fbm's options (octaves 1 here, plain noise), and these. */
export interface LoopNoiseOptions extends FbmOptions {
  /** How much it changes over one period: the radius of the circle it travels, in noise units, 1. Larger changes more. */
  radius?: number;
  /** true: ridged noise, as ridged() makes, sharp crests and soft hollows. false (the default): smooth noise. */
  ridged?: boolean;
}

/**
 * Noise at x, y that moves with t and comes back exactly every `period` seconds, so a piece made with it loops
 * seamlessly (set meta.loop to the period). It travels a circle through two more axes of simplex noise (4D), so the
 * pattern changes in place instead of sliding. noise({ period }) does this for you, in cells. Options: radius (1),
 * ridged (false), and fbm's octaves (1), lacunarity, gain and seed.
 *
 *   const v = loopNoise(x / 8, y / 4, t, 4, { octaves: 3 });
 */
export function loopNoise(x: number, y: number, t: number, period: number, o?: LoopNoiseOptions): number {
  octaves(o, 1);
  checkPeriod("loopNoise()", period);
  const radius = o?.radius ?? 1;
  if (!(finite(radius) && radius > 0)) fail(`loopNoise's radius takes a number above 0, such as 1, not ${said(radius)}`);
  const ridge = !!o?.ridged;
  const a = TAU * place(t, period);
  const z = radius * Math.cos(a), w = radius * Math.sin(a);
  let sum = 0, amp = 1, norm = 0, f = 1, weight = 1;
  for (let i = 0; i < octN; i++) {
    let n = simplex4(x * f + OFF[i][0], y * f + OFF[i][1], z * f, w * f, octSeed) * WIDEN4;
    if (ridge) (n = crest(n) * weight), (weight = weigh(n));
    sum += amp * n;
    norm += amp;
    amp *= octGain;
    f *= octLac;
  }
  return ridge ? sum / norm : unit(octN > 1 ? (sum / norm) * SPREAD : sum);
}

/** What worley() measures. */
export interface WorleyOptions {
  /** A whole number: 0. */
  seed?: number;
  /** false (the default): the distance to the nearest point, 0 at the points. true: how far from the edge between two cells, 0 on the edge. */
  edge?: boolean;
}

/**
 * Cellular (Worley) noise at x, y, 0 to 1: one scattered point in each unit square, and the distance to the nearest,
 * for cells, scales, stones and caustics; with `edge`, the gap to the second nearest, for cracks and webs.
 */
export function worley(x: number, y: number, o?: WorleyOptions): number {
  const seed = o?.seed ?? 0;
  if (!Number.isInteger(seed)) fail(`seed takes a whole number, such as 7, not ${said(seed)}`);
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = Infinity, d2 = Infinity;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy;
      const px = cx + hash(cx, cy, seed, 1) - x, py = cy + hash(cx, cy, seed, 2) - y;
      const d = px * px + py * py;
      if (d < d1) (d2 = d1), (d1 = d);
      else if (d < d2) d2 = d;
    }
  const v = o?.edge ? Math.sqrt(d2) - Math.sqrt(d1) : Math.sqrt(d1);
  return v > 1 ? 1 : v;
}

// --- noise in cells ---------------------------------------------------------------------

/** What noise() makes: "smooth" hills and clouds, "ridged" crests, or "cells" with walls between. */
export type NoiseKind = "smooth" | "ridged" | "cells";
const KINDS: readonly NoiseKind[] = ["smooth", "ridged", "cells"];

/** What noise() takes. Every option has a default, so noise() alone is soft clouds that change slowly. */
export interface NoiseOptions {
  /**
   * How big a feature is, in cells: 12, hills about 12 columns across and 6 rows tall, which is round on the grid's
   * cells (a row is two columns tall). Or [columns, rows] for a stretched one.
   */
  size?: number | readonly [number, number];
  /**
   * "smooth" (the default): rolling hills, clouds, smoke. "ridged": sharp crests and soft hollows, for mountains, veins
   * and lightning. "cells": cells with walls between them, 0 on a wall rising to the middle, for scales, stones and
   * the light on a pool's floor.
   */
  kind?: NoiseKind;
  /** Layers of finer detail on top of the first, a whole number from 1 to 8: 3 (1 for "cells"). Each costs as much again. */
  detail?: number;
  /** Cells a second the whole pattern slides: a number goes across (negative goes left), [x, y] any way, y down: 0. */
  drift?: number | readonly [number, number];
  /**
   * How fast it changes where it is, in features a second: 0.25, a hill turning into another in about 4 seconds. 0 when
   * it drifts (it slides instead), and 0 to hold it still.
   */
  morph?: number;
  /**
   * Seconds after which it comes back exactly, so the piece loops seamlessly: set meta.loop to the same. None by
   * default. A morphing pattern changes in a loop. A drifting one becomes a band that slides round once a period, so it
   * repeats every drift * period cells along the way it goes: make that the grid's width or more and the repeat never
   * shows; under one feature (size) it would flatten out, and throws. It can't drift and morph and loop at once: with
   * drift and period, leave morph at 0.
   */
  period?: number;
  /** The numbers it gives, from low to high: [0, 1]. [4, 12] gives a row from 4 to 12 directly, for a skyline. */
  range?: readonly [number, number];
  /** A whole number: 0. Each seed is another pattern, the same each time. */
  seed?: number;
}

/**
 * Noise made by noise(): its value at a cell at t seconds, within its range. x and y may be fractions; y and t are 0
 * when left out, so top(x) is a skyline that doesn't move.
 */
export type Noise = (x: number, y?: number, t?: number) => number;

// Cellular noise for noise(): the gap between the nearest and second nearest of one point a unit square, 0 on the walls
// between cells. Each point goes round a small circle by `turn` radians (every other one the other way), so the cells
// change shape; `wrap` repeats the pattern every that many squares across, for a band that comes round.
function cellular(x: number, y: number, turn: number, wrap: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, hx = wrap ? mod(cx, wrap) : cx;
      const h = hash(hx, cy, seed, 3), a = TAU * h + (h < 0.5 ? turn : -turn);
      // Each point stays inside its own square, so the nine squares round x, y always hold the two nearest.
      const px = cx + 0.5 + 0.5 * (hash(hx, cy, seed, 1) - 0.5) + 0.2 * Math.cos(a) - x;
      const py = cy + 0.5 + 0.5 * (hash(hx, cy, seed, 2) - 0.5) + 0.2 * Math.sin(a) - y;
      const d = px * px + py * py;
      if (d < d1) (d2 = d1), (d1 = d);
      else if (d < d2) d2 = d;
    }
  return Math.sqrt(d2) - Math.sqrt(d1);
}
// Measured over a million points, 99% of cellular() is below this (half is below 0.26): it is scaled to 1 there, and
// anything past is 1.
const CELLS = 0.83;

/**
 * Noise you describe instead of work out: how big, what kind, which way it drifts, how fast it changes, when it comes
 * round. Returns a function of a cell and a time, `(x, y, t) => value`, made once (at the top of a file, or in setup)
 * and called for each cell. Every option is checked here, when it is made.
 *
 *   const sea = noise({ size: 10, drift: 6, period: 8 });         // slides right, the same again every 8 s
 *   const ridge = noise({ kind: "ridged", range: [6, 14] });      // ridge(x) is a row: a mountain's top
 *   const pool = noise({ kind: "cells", size: 8, period: 4 });    // cells that change and come round
 */
export function noise(o: NoiseOptions = {}): Noise {
  if (o === null || typeof o !== "object") fail("noise() takes options, such as { size: 12, drift: 4 }, or nothing");
  const kind = o.kind ?? "smooth";
  if (!KINDS.includes(kind)) fail(`noise's kind takes ${and(KINDS.map((k) => `"${k}"`))}, not ${JSON.stringify(kind)}`);
  const size = o.size ?? 12;
  const [sx, sy] = typeof size === "number" ? [size, size / 2] : Array.isArray(size) && size.length === 2 ? size : [NaN, NaN];
  if (!(finite(sx) && finite(sy) && sx > 0 && sy > 0))
    fail(`noise's size takes cells above 0, a number such as 12 or [columns, rows], not ${JSON.stringify(size)}`);
  const cells = kind === "cells", ridge = kind === "ridged";
  const detail = o.detail ?? (cells ? 1 : 3);
  if (!(Number.isInteger(detail) && detail >= 1 && detail <= 8)) fail(`noise's detail takes a whole number from 1 to 8, not ${said(detail)}`);
  const drift = o.drift ?? 0;
  const [dx, dy] = typeof drift === "number" ? [drift, 0] : Array.isArray(drift) && drift.length === 2 ? drift : [NaN, NaN];
  if (!(Number.isFinite(dx) && Number.isFinite(dy))) fail(`noise's drift takes cells a second, a number (across) or [x, y], not ${JSON.stringify(drift)}`);
  const drifts = dx !== 0 || dy !== 0;
  const morph = o.morph ?? (drifts ? 0 : 0.25);
  if (!(finite(morph) && morph >= 0)) fail(`noise's morph takes features a second, 0 or more, such as 0.25, not ${said(morph)}`);
  const period = o.period;
  if (period !== undefined && !(finite(period) && period > 0)) fail(`noise's period takes seconds above 0, such as 8, not ${said(period)}`);
  if (period !== undefined && drifts && morph > 0)
    fail("noise() can loop a pattern that drifts or one that morphs, not both at once: with drift and period, leave morph at 0");
  const range = o.range ?? [0, 1];
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite))
    fail(`noise's range takes [low, high], two numbers such as [4, 12], not ${JSON.stringify(range)}`);
  const seed = o.seed ?? 0;
  if (!Number.isInteger(seed)) fail(`noise's seed takes a whole number, such as 7, not ${said(seed)}`);

  const lo = range[0], span = range[1] - range[0];
  // A unit of noise is about one feature, so a cell is 1 / size of one.
  const fx = 1 / sx, fy = 1 / sy;
  // The drift in units a second, its speed, and the way it goes.
  const ux = dx * fx, uy = dy * fy, speed = Math.hypot(ux, uy);
  const ex = drifts ? ux / speed : 1, ey = drifts ? uy / speed : 0;
  // A drift that loops is a band `around` units long that slides round once a period: smooth and ridged noise lie it
  // on a circle that long, cells make it a whole number of cells and wrap.
  const tiled = period !== undefined && drifts;
  const around = tiled ? speed * period : 1, bend = around / TAU, n = Math.max(1, Math.round(around));
  // A band shorter than one feature flattens out along the drift (a fifth of its contrast at a quarter of a feature, all
  // of it lost at a cell), so it is refused, saying what would do.
  if (tiled && around < 1) {
    const fmt = (v: number) => (v = +v.toFixed(2)) + (v === 1 ? " cell" : " cells"), along = Math.hypot(dx, dy);
    fail(`noise() drifting ${fmt(along)} a second with a period of ${period} s repeats every ${fmt(along * period!)}, under one feature (${fmt(along / speed)}), and flattens out: make period ${+(1 / speed).toFixed(2)} s or more, or drift faster`);
  }
  // A morph that loops goes round a circle through two more axes, morph * period units long. Cells turn a whole
  // number of times a period.
  const looped = period !== undefined && !drifts && morph > 0;
  const radius = looped ? (morph * period) / TAU : 0, turns = looped ? Math.max(1, Math.round(morph * period)) : 0;

  return (x: number, y = 0, t = 0): number => {
    let a: number, b: number, c = 0, d = 0, turn = 0, dims = 2;
    if (tiled) {
      const px = x * fx, py = y * fy, u = px * ex + py * ey - speed * t, v = py * ex - px * ey;
      if (cells) (a = (u * n) / around), (b = v);
      else {
        const th = (TAU * u) / around;
        a = bend * Math.cos(th);
        b = bend * Math.sin(th);
        c = v;
        dims = 3;
      }
    } else {
      a = x * fx - ux * t;
      b = y * fy - uy * t;
      if (morph > 0) {
        if (cells) turn = TAU * (looped ? turns * place(t, period!) : morph * t);
        else if (!looped) (c = morph * t), (dims = 3);
        else {
          const th = TAU * place(t, period!);
          c = radius * Math.cos(th);
          d = radius * Math.sin(th);
          dims = 4;
        }
      }
    }
    let sum = 0, amp = 1, norm = 0, f = 1, w = 1;
    for (let i = 0; i < detail; i++) {
      const oa = OFF[i][0], ob = OFF[i][1];
      let v: number;
      if (cells) v = cellular(a * f + oa, b * f + ob, turn, tiled ? n * f : 0, seed);
      else {
        v = dims === 2 ? simplex2(a * f + oa, b * f + ob, seed) : dims === 3 ? simplex3(a * f + oa, b * f + ob, c * f + oa, seed) : simplex4(a * f + oa, b * f + ob, c * f, d * f, seed) * WIDEN4;
        if (ridge) (v = crest(v) * w), (w = weigh(v));
      }
      sum += amp * v;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    let k = sum / norm;
    k = cells ? (k >= CELLS ? 1 : k / CELLS) : ridge ? k : unit(detail > 1 ? k * SPREAD : k);
    return lo + span * k;
  };
}

// --- easing ---------------------------------------------------------------------------

/** The easings' names, as easings.net has them: linear, then in, out and inOut of each curve. */
export type EaseName =
  | "linear"
  | "inQuad" | "outQuad" | "inOutQuad"
  | "inCubic" | "outCubic" | "inOutCubic"
  | "inQuart" | "outQuart" | "inOutQuart"
  | "inSine" | "outSine" | "inOutSine"
  | "inExpo" | "outExpo" | "inOutExpo"
  | "inCirc" | "outCirc" | "inOutCirc"
  | "inBack" | "outBack" | "inOutBack"
  | "inElastic" | "outElastic" | "inOutElastic"
  | "inBounce" | "outBounce" | "inOutBounce";

const B1 = 1.70158, B2 = B1 * 1.525, B3 = B1 + 1, E4 = TAU / 3, E5 = TAU / 4.5;
const bounce = (k: number) => {
  const n = 7.5625, d = 2.75;
  if (k < 1 / d) return n * k * k;
  if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
  if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
  return n * (k -= 2.625 / d) * k + 0.984375;
};
// The curves of easings.net (Robert Penner's), each for k strictly between 0 and 1.
const curves: Record<EaseName, (k: number) => number> = {
  linear: (k) => k,
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  inCubic: (k) => k ** 3,
  outCubic: (k) => 1 - (1 - k) ** 3,
  inOutCubic: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  inQuart: (k) => k ** 4,
  outQuart: (k) => 1 - (1 - k) ** 4,
  inOutQuart: (k) => (k < 0.5 ? 8 * k ** 4 : 1 - (-2 * k + 2) ** 4 / 2),
  inSine: (k) => 1 - Math.cos((k * Math.PI) / 2),
  outSine: (k) => Math.sin((k * Math.PI) / 2),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  inExpo: (k) => 2 ** (10 * k - 10),
  outExpo: (k) => 1 - 2 ** (-10 * k),
  inOutExpo: (k) => (k < 0.5 ? 2 ** (20 * k - 10) / 2 : (2 - 2 ** (-20 * k + 10)) / 2),
  inCirc: (k) => 1 - Math.sqrt(1 - k * k),
  outCirc: (k) => Math.sqrt(1 - (k - 1) ** 2),
  inOutCirc: (k) => (k < 0.5 ? (1 - Math.sqrt(1 - (2 * k) ** 2)) / 2 : (Math.sqrt(1 - (-2 * k + 2) ** 2) + 1) / 2),
  inBack: (k) => B3 * k ** 3 - B1 * k * k,
  outBack: (k) => 1 + B3 * (k - 1) ** 3 + B1 * (k - 1) ** 2,
  inOutBack: (k) => (k < 0.5 ? ((2 * k) ** 2 * ((B2 + 1) * 2 * k - B2)) / 2 : ((2 * k - 2) ** 2 * ((B2 + 1) * (k * 2 - 2) + B2) + 2) / 2),
  inElastic: (k) => -(2 ** (10 * k - 10)) * Math.sin((k * 10 - 10.75) * E4),
  outElastic: (k) => 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * E4) + 1,
  inOutElastic: (k) =>
    k < 0.5 ? -(2 ** (20 * k - 10) * Math.sin((20 * k - 11.125) * E5)) / 2 : (2 ** (-20 * k + 10) * Math.sin((20 * k - 11.125) * E5)) / 2 + 1,
  inBounce: (k) => 1 - bounce(1 - k),
  outBounce: bounce,
  inOutBounce: (k) => (k < 0.5 ? (1 - bounce(1 - 2 * k)) / 2 : (1 + bounce(2 * k - 1)) / 2),
};

/**
 * The standard easings, by name: ease.outCubic(k) for k from 0 to 1. Every one starts at exactly 0 and ends at exactly
 * 1; k outside 0..1 (or NaN) is clamped first. "in" starts slow, "out" ends slow, "inOut" does both; back overshoots,
 * elastic springs and bounce bounces, between the ends. tween() and progress() take these by name, in seconds.
 */
export const ease: Readonly<Record<EaseName, (k: number) => number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(curves).map(([name, f]) => [name, (k: number) => (!(k > 0) ? 0 : k >= 1 ? 1 : f(k))]),
  ) as Record<EaseName, (k: number) => number>,
);

/** When a move happens and how, for progress() and tween(): in seconds, with an easing. */
export interface TweenOptions {
  /** When it starts, in seconds: 0. Into each period, when there is one. */
  start?: number;
  /** How long it takes, in seconds: 1. Above 0. */
  duration?: number;
  /** How it moves: an easing's name, or your own function from 0..1 to 0..1: "inOutSine", gentle at both ends. */
  ease?: EaseName | ((k: number) => number);
  /** Plays it again every `period` seconds: none, it plays once. start + duration must fit in it. */
  period?: number;
}

// Reads tween options, checking each, and returns the eased progress at t.
function moved(t: number, o: TweenOptions | undefined, name: string): number {
  if (o !== undefined && (o === null || typeof o !== "object")) fail(`${name} takes options, such as { duration: 2, ease: "outCubic" }`);
  const start = o?.start ?? 0, duration = o?.duration ?? 1, period = o?.period, how = o?.ease ?? "inOutSine";
  if (!Number.isFinite(start)) fail(`${name}'s start takes seconds, such as 0.5, not ${said(start)}`);
  if (!(finite(duration) && duration > 0)) fail(`${name}'s duration takes seconds above 0, such as 1, not ${said(duration)}`);
  if (period !== undefined) {
    if (!(finite(period) && period > 0)) fail(`${name}'s period takes seconds above 0, such as 4, not ${said(period)}`);
    if (start < 0 || start + duration > period + 1e-9)
      fail(`${name} plays from start to start + duration inside each period: ${start} + ${duration} doesn't fit in ${period} seconds`);
  }
  const curve = typeof how === "function" ? how : Object.hasOwn(curves, how) ? ease[how] : fail(`${name}'s ease takes an easing's name, such as "outCubic", or a function, not ${JSON.stringify(how)}`);
  const k = ((period === undefined ? t : mod(t, period)) - start) / duration;
  return curve(!(k > 0) ? 0 : k >= 1 ? 1 : k);
}

/**
 * How far a move has got at t seconds, 0 to 1 with its easing: 0 before `start`, 1 after `start + duration`, eased
 * between; with a period, again every period. The options are tween()'s.
 *
 *   s.write(2, 2, "loading".slice(0, 7 * progress(t, { duration: 2, period: 3 })));
 */
export function progress(t: number, o?: TweenOptions): number {
  return moved(t, o, "progress()");
}

/**
 * A value moving from `from` to `to` over time, eased: from before it starts, to after it ends. Takes numbers, or
 * points as [x, y] or [x, y, z] of the same length, and returns the same kind. Options: start (0), duration (1),
 * ease ("inOutSine"), period (none: once).
 *
 *   const [x, y] = tween(t, [4, 2], [40, 12], { duration: 1.5, ease: "outBack", period: 4 });
 *   s.set(x, y, "@");
 */
export function tween(t: number, from: number, to: number, o?: TweenOptions): number;
export function tween(t: number, from: readonly [number, number], to: readonly [number, number], o?: TweenOptions): Vec2;
export function tween(t: number, from: readonly [number, number, number], to: readonly [number, number, number], o?: TweenOptions): Vec3;
export function tween(t: number, from: readonly number[], to: readonly number[], o?: TweenOptions): number[];
export function tween(t: number, from: number | readonly number[], to: number | readonly number[], o?: TweenOptions): number | number[] {
  const k = moved(t, o, "tween()");
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * k;
  if (!Array.isArray(from) || !Array.isArray(to) || from.length !== to.length)
    fail("tween() takes two numbers, or two points of the same length, such as [0, 0] and [10, 5]");
  return from.map((v: number, i: number) => v + (to[i] - v) * k);
}

// --- vectors --------------------------------------------------------------------------

/** A point or direction in 2D, [x, y]: x across, y down the grid. */
export type Vec2 = [number, number];
/** A point or direction in 3D, [x, y, z]: as project() takes them, x right, y up, z away from you. */
export type Vec3 = [number, number, number];
type V2 = readonly [number, number];
type V3 = readonly [number, number, number];

/** 2D vectors as [x, y]. Each makes a new vector and leaves the ones it is given as they were. */
export const vec2 = {
  /** a + b. */
  add: (a: V2, b: V2): Vec2 => [a[0] + b[0], a[1] + b[1]],
  /** a - b: the way from b to a. */
  sub: (a: V2, b: V2): Vec2 => [a[0] - b[0], a[1] - b[1]],
  /** v times k. */
  scale: (v: V2, k: number): Vec2 => [v[0] * k, v[1] * k],
  /** The dot product: 0 for vectors at right angles. */
  dot: (a: V2, b: V2): number => a[0] * b[0] + a[1] * b[1],
  /** Its length. */
  length: (v: V2): number => Math.hypot(v[0], v[1]),
  /** The same direction, length 1; [0, 0] stays [0, 0]. */
  normalize: (v: V2): Vec2 => {
    const l = Math.hypot(v[0], v[1]);
    return l ? [v[0] / l, v[1] / l] : [0, 0];
  },
  /** v turned by a radians from x toward y: clockwise on the grid, where y is down. */
  rotate: (v: V2, a: number): Vec2 => {
    const c = Math.cos(a), s = Math.sin(a);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  },
  /** From a to b by k: a at 0, b at 1. */
  lerp: (a: V2, b: V2, k: number): Vec2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k],
  /** How far apart a and b are. */
  dist: (a: V2, b: V2): number => Math.hypot(a[0] - b[0], a[1] - b[1]),
};

/** 3D vectors as [x, y, z]. Each makes a new vector and leaves the ones it is given as they were. */
export const vec3 = {
  /** a + b. */
  add: (a: V3, b: V3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  /** a - b: the way from b to a. */
  sub: (a: V3, b: V3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  /** v times k. */
  scale: (v: V3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k],
  /** The dot product: 0 at right angles; with unit vectors, how much a surface faces a light. */
  dot: (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  /** At right angles to both, by the right hand rule: cross(x, y) is z. */
  cross: (a: V3, b: V3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  /** Its length. */
  length: (v: V3): number => Math.hypot(v[0], v[1], v[2]),
  /** The same direction, length 1; [0, 0, 0] stays [0, 0, 0]. */
  normalize: (v: V3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return l ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
  },
  /** From a to b by k: a at 0, b at 1. */
  lerp: (a: V3, b: V3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  /** How far apart a and b are. */
  dist: (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};

// --- 3D -------------------------------------------------------------------------------

/**
 * v turned by `angles`, radians about x, then y, then z, each the right hand way (about z, x turns toward y). Writes
 * into `out` when given, for a drawing loop that makes nothing; returns it.
 */
export function rotate3(v: V3, angles: V3, out: Vec3 = [0, 0, 0]): Vec3 {
  let x = v[0], y = v[1], z = v[2], c: number, s: number, k: number;
  if (angles[0]) (c = Math.cos(angles[0])), (s = Math.sin(angles[0])), (k = y * c - z * s), (z = y * s + z * c), (y = k);
  if (angles[1]) (c = Math.cos(angles[1])), (s = Math.sin(angles[1])), (k = x * c + z * s), (z = z * c - x * s), (x = k);
  if (angles[2]) (c = Math.cos(angles[2])), (s = Math.sin(angles[2])), (k = x * c - y * s), (y = x * s + y * c), (x = k);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * rotate3 with its angles worked out once: rotation([0.3, t, 0]) turns many points by the same angles, three sums a
 * point, with no sines. The function writes into `out` when given (it may be the point itself) and returns it.
 */
export function rotation(angles: V3): (v: V3, out?: Vec3) => Vec3 {
  const ca = Math.cos(angles[0]), sa = Math.sin(angles[0]), cb = Math.cos(angles[1]), sb = Math.sin(angles[1]);
  const cc = Math.cos(angles[2]), sc = Math.sin(angles[2]);
  // The rows of Rz Ry Rx.
  const m00 = cc * cb, m01 = cc * sb * sa - sc * ca, m02 = cc * sb * ca + sc * sa;
  const m10 = sc * cb, m11 = sc * sb * sa + cc * ca, m12 = sc * sb * ca - cc * sa;
  const m20 = -sb, m21 = cb * sa, m22 = cb * ca;
  return (v, out = [0, 0, 0]) => {
    const x = v[0], y = v[1], z = v[2];
    out[0] = m00 * x + m01 * y + m02 * z;
    out[1] = m10 * x + m11 * y + m12 * z;
    out[2] = m20 * x + m21 * y + m22 * z;
    return out;
  };
}

/** How project() looks at 3D points: the grid it draws on and the camera. */
export interface Projection {
  /** The grid's columns: the view is centred on cols / 2. */
  cols: number;
  /** The grid's rows: the view is centred on rows / 2. */
  rows: number;
  /** How far the eye is from the origin, back along z, in units: 5. Nearer is a stronger perspective. Above 0. */
  distance?: number;
  /**
   * How many rows one unit spans at z = 0: rows / 3, so -1.5 to 1.5 fills the height. Across, a unit spans `scale *
   * aspect` columns, so a unit square looks square.
   */
  scale?: number;
  /** A cell's height in cell widths: 2, as a surface's `aspect`. */
  aspect?: number;
}

/** Where a 3D point lands: the cell (a fraction: floor it, or pass it to s.set, which does) and its depth from the eye. */
export interface Projected {
  x: number;
  y: number;
  /** Distance from the eye along the view: larger is further, for a z-buffer or for shading the far side fainter. */
  depth: number;
}

/**
 * A point in 3D (x right, y up, z away from you) to a cell, in perspective: the origin lands at the grid's centre,
 * things further away come out smaller. Null for a point at or behind the eye. Writes into `out` when given. camera()
 * does this with the turning and the fitting done for you.
 *
 *   const p = project(rotate3([1, 1, 1], [0, t, 0]), { cols: 64, rows: 24 });
 *   if (p) s.set(p.x, p.y, "*");
 */
export function project(p: V3, o: Projection, out?: Projected): Projected | null {
  if (!o || typeof o !== "object") fail("project() takes the grid's size, { cols, rows }, and optionally distance, scale and aspect");
  const distance = o.distance ?? 5;
  if (!(finite(distance) && distance > 0)) fail(`project()'s distance takes a number above 0, such as 5, not ${said(distance)}`);
  const depth = p[2] + distance;
  if (!(depth > 1e-9)) return null;
  const k = ((o.scale ?? o.rows / 3) * distance) / depth;
  const r = out ?? { x: 0, y: 0, depth: 0 };
  r.x = o.cols / 2 + p[0] * k * (o.aspect ?? 2);
  r.y = o.rows / 2 - p[1] * k;
  r.depth = depth;
  return r;
}

/** How camera() looks at what you show it. */
export interface CameraOptions {
  /** How far what you show reaches from its centre, in units: 1. The view is fitted so nothing that far out leaves the grid. */
  size?: number;
  /** How far the eye is from the centre, in units: 4 times size. Nearer looks deeper. More than size. */
  distance?: number;
  /**
   * Seconds one whole turn takes, about the upright axis, so it loops exactly: none, it doesn't turn. A positive turn
   * carries the side facing you to the left; negative turns the other way. Or [x, y, z], seconds a turn about each
   * axis, 0 for none about that one.
   */
  turn?: number | readonly [number, number, number];
  /** How far the view tips to look down on it, in radians: 0.3, a little from above. 0 is level; negative looks up. */
  tilt?: number;
  /** A cell's height in cell widths: 2, or 1 for a piece with meta.cell 1. */
  aspect?: number;
}

/** Where camera() puts a point: its cell (fractions, as s.set takes them), its depth, and how near it is, 0 to 1. */
export interface View {
  x: number;
  y: number;
  /** Distance from the eye: larger is further. */
  depth: number;
  /** 1 at the nearest a point within `size` can be, 0 at the furthest: for shading the far side fainter. */
  near: number;
}

/** A camera made by camera(): where a 3D point is at t seconds, or null if it is behind the eye. */
export type Camera = (p: V3, t?: number) => View | null;

/**
 * A camera on 3D points that turns them and lands them on the grid: points within `size` of the centre always fit,
 * whatever the turn. Points are [x, y, z], y up. The camera returns the same View object every call, so read it
 * before the next.
 *
 *   const view = camera({ cols: 64, rows: 24 }, { turn: 8 });   // a turn every 8 s
 *   const v = view([0, 1, 0], t);
 *   if (v) s.set(v.x, v.y, v.near > 0.5 ? "@" : ".");
 */
export function camera(area: { cols: number; rows: number }, o: CameraOptions = {}): Camera {
  const { cols, rows } = area ?? ({} as { cols: number; rows: number });
  if (!(Number.isInteger(cols) && cols >= 1 && Number.isInteger(rows) && rows >= 1))
    fail(`camera() takes the grid's size first, { cols, rows } in whole numbers, not ${JSON.stringify(area)}`);
  if (o === null || typeof o !== "object") fail("camera() takes options second, such as { turn: 8 }");
  const size = o.size ?? 1;
  if (!(finite(size) && size > 0)) fail(`camera's size takes units above 0, such as 1, not ${said(size)}`);
  const distance = o.distance ?? 4 * size;
  if (!(finite(distance) && distance > size)) fail(`camera's distance takes units more than its size (${size}), such as ${4 * size}, not ${said(distance)}`);
  const turn = o.turn ?? 0;
  const turns = typeof turn === "number" ? [0, turn, 0] : Array.isArray(turn) && turn.length === 3 ? turn : [NaN];
  if (!turns.every(Number.isFinite)) fail(`camera's turn takes seconds a turn, a number or [x, y, z], 0 for none, not ${JSON.stringify(turn)}`);
  const tilt = o.tilt ?? 0.3, aspect = o.aspect ?? 2;
  if (!Number.isFinite(tilt)) fail(`camera's tilt takes radians, such as 0.3, not ${said(tilt)}`);
  if (!(finite(aspect) && aspect > 0)) fail(`camera's aspect takes a cell's height in widths, 2 or 1, not ${said(aspect)}`);
  // Fitted: the eye sees a ball of radius size inside a cone, which must land within the grid, with a little margin.
  const scale = (0.95 * Math.min(rows / 2, cols / (2 * aspect)) * Math.sqrt(distance * distance - size * size)) / (distance * size);
  const lens = { cols, rows, distance, scale, aspect };
  // Looking down from above is the top turned toward the eye, which is a turn about x the left hand way.
  const tipped = rotation([-tilt, 0, 0]);
  const p: Vec3 = [0, 0, 0], at: Projected = { x: 0, y: 0, depth: 0 }, view: View = { x: 0, y: 0, depth: 0, near: 0 };
  // The turn at the last t asked for: a frame asks once for each of its points.
  let when = NaN, spin = rotation([0, 0, 0]);
  const angle = (t: number, period: number) => (period ? TAU * place(t, Math.abs(period)) * Math.sign(period) : 0);
  return (point, t = 0) => {
    if (t !== when) (when = t), (spin = rotation([angle(t, turns[0]), angle(t, turns[1]), angle(t, turns[2])]));
    tipped(spin(point, p), p);
    if (!project(p, lens, at)) return null;
    view.x = at.x;
    view.y = at.y;
    view.depth = at.depth;
    view.near = clamp((distance + size - at.depth) / (2 * size));
    return view;
  };
}

// --- time -----------------------------------------------------------------------------

function checkPeriod(name: string, p: number) {
  if (!(finite(p) && p > 0)) fail(`${name} takes a period in seconds above 0, such as 2, not ${said(p)}`);
}

// phase() without the check, for the functions that have made it already.
function place(t: number, period: number): number {
  const k = mod(t, period) / period;
  return k < 1 ? k : 0;
}

/**
 * How far t is through a cycle of `period` seconds, from 0 up to 1, back to 0 every period exactly: a sawtooth, and
 * the start of every loop. phase(5, 2) is 0.5.
 */
export function phase(t: number, period: number): number {
  checkPeriod("phase()", period);
  return place(t, period);
}

/**
 * A sine wave between lo (-1) and hi (1) that repeats every `period` seconds exactly: oscillate(t, 2, 0, 1) breathes
 * once every two seconds. It starts in the middle, rising; `offset` (0) moves it along its cycle, as a share of the
 * period, 0 to 1: 0.25 starts at the top.
 */
export function oscillate(t: number, period: number, lo = -1, hi = 1, offset = 0): number {
  checkPeriod("oscillate()", period);
  return lo + (hi - lo) * (0.5 + 0.5 * Math.sin(TAU * (place(t, period) + offset)));
}

/** From 0 up to 1 and back down to 0 every `period` seconds, in straight lines: 0 at t = 0, 1 halfway. */
export function triangle(t: number, period: number): number {
  checkPeriod("triangle()", period);
  return 1 - Math.abs(1 - 2 * place(t, period));
}

/**
 * 1 for the first `width` seconds of every `period` and 0 for the rest: a blink, a beat, a light that comes on.
 * `width` is half the period by default, a square wave.
 */
export function pulse(t: number, period: number, width = period / 2): number {
  checkPeriod("pulse()", period);
  return mod(t, period) < width ? 1 : 0;
}

/**
 * Which turn of `period` seconds t is in: 0 for the first, 1 for the next, -1 before 0. It agrees with phase(): t is
 * (cycle + phase) times the period. A seed for what changes each time round: random(cycle(t, 6)).
 */
export function cycle(t: number, period: number): number {
  checkPeriod("cycle()", period);
  return Math.round((t - mod(t, period)) / period) + 0;
}

/**
 * The time after which every one of `periods` comes round together, in seconds: lcm([2, 3, 4]) is 12, lcm([0.7, 0.3])
 * is 2.1, lcm([1 / 3, 1]) is 1. Undefined when that is longer than `max` seconds (60), where svg() would rather play
 * a few seconds than the whole of it. It is the shortest whole number of the longest period that each of the others
 * divides, to a millionth of a turn, so a period that isn't a round number of hundredths still loops exactly.
 */
export function lcm(periods: readonly number[], max = 60): number | undefined {
  if (!Array.isArray(periods) || !periods.length) fail("lcm() takes a list of one or more periods in seconds, such as [2, 3]");
  for (const p of periods) checkPeriod("lcm()", p);
  const top = Math.max(...periods);
  // A million turns of the longest period is past any loop worth playing: stop there rather than search for ever.
  for (let k = 1; k <= 1e6 && k * top <= max * (1 + 1e-9); k++) {
    const l = k * top;
    if (periods.every((p) => Math.abs(l / p - Math.round(l / p)) < 1e-6)) return +l.toPrecision(12);
  }
  return undefined;
}

/** What twinkle() takes. */
export interface TwinkleOptions {
  /** Seconds after which every twinkle comes round, so the piece loops: 4. Each thing twinkles 1, 2 or 3 times in it. */
  period?: number;
  /** The dimmest it gets, 0 to 1: 0.2. 0 lets things go out. */
  min?: number;
}

/**
 * How bright something twinkling is at t seconds, from `min` to 1: each `id` (an index, or a spot's k) on its own
 * beat and out of step with the rest, all coming round together every period. For stars, lights and sparkle.
 *
 *   s.set(p.x, p.y, shadeChar(" .·+*", twinkle(t, p.i)));
 */
export function twinkle(t: number, id: number, o: TwinkleOptions = {}): number {
  if (o === null || typeof o !== "object") fail("twinkle() takes options third, such as { period: 4 }");
  const period = o.period ?? 4, min = o.min ?? 0.2;
  checkPeriod("twinkle()", period);
  if (!(finite(min) && min >= 0 && min <= 1)) fail(`twinkle's min takes a brightness from 0 to 1, such as 0.2, not ${said(min)}`);
  if (!Number.isFinite(id)) fail(`twinkle() takes a number for each thing that twinkles, such as its index, not ${said(id)}`);
  const n = Math.round(id * 1000003) | 0;
  const beats = 1 + Math.floor(hash(n, 0x51) * 3), at = hash(n, 0x52);
  const k = 0.5 + 0.5 * Math.sin(TAU * (beats * place(t, period) + at));
  // Eased, so it lingers bright and dim and passes quickly between.
  return min + (1 - min) * k * k * (3 - 2 * k);
}

// --- spreading things out --------------------------------------------------------------

/** One of scatter()'s spots: its cell, its number, and a seeded number of its own. */
export interface Spot {
  /** Its column, a whole number. */
  x: number;
  /** Its row, a whole number. */
  y: number;
  /** Its number, from 0: for twinkle(t, p.i), or anything else that should differ from spot to spot. */
  i: number;
  /** A number of its own from 0 up to 1, seeded: a size, a brightness, a colour, a chance. */
  k: number;
}

/** What scatter() takes. */
export interface ScatterOptions {
  /** A whole number: 1. Each seed is another spread, the same each time. */
  seed?: number;
  /**
   * true (the default): spread evenly, no clumps and no big gaps (a jittered grid, each spot in its own square-looking
   * box). false: anywhere, as pure chance falls, clumps and all. More spots than half the cells are always placed by
   * chance, which is even enough packed that close.
   */
  even?: boolean;
}

/**
 * `count` spots on different cells of an area, seeded: where the stars, the snow, the flowers go. The area is a size,
 * { cols, rows }, or a region with x and y; the setup's size will do. Throws for more spots than cells.
 *
 *   const stars = scatter(120, { cols: 64, rows: 24 });
 *   for (const p of stars) s.set(p.x, p.y, p.k < 0.1 ? "*" : ".");
 */
export function scatter(count: number, area: { cols: number; rows: number; x?: number; y?: number }, o: ScatterOptions = {}): Spot[] {
  const { cols, rows, x = 0, y = 0 } = area ?? ({} as { cols: number; rows: number });
  if (!(Number.isInteger(cols) && cols >= 1 && Number.isInteger(rows) && rows >= 1 && Number.isInteger(x) && Number.isInteger(y)))
    fail(`scatter() takes an area, { cols, rows } and optionally x and y, in whole numbers, not ${JSON.stringify(area)}`);
  if (!(Number.isInteger(count) && count >= 0 && count <= cols * rows))
    fail(`scatter() takes a whole number of spots from 0 to ${cols * rows}, one a cell of ${cols} by ${rows}, not ${said(count)}`);
  if (o === null || typeof o !== "object") fail("scatter() takes options third, such as { seed: 7 }");
  const seed = o.seed ?? 1, even = o.even ?? true;
  if (!Number.isInteger(seed)) fail(`scatter's seed takes a whole number, such as 7, not ${said(seed)}`);
  const rnd = random(seed), spots: Spot[] = [];
  const add = (c: number, r: number) => spots.push({ x: x + c, y: y + r, i: spots.length, k: rnd() });
  if (!even || count * 2 > cols * rows) {
    // Any cells, every one as likely: the first `count` of all of them shuffled. Packed this close, even is the same.
    const all = rnd.shuffle(Array.from({ length: cols * rows }, (_, i) => i));
    for (let j = 0; j < count; j++) add(all[j] % cols, Math.floor(all[j] / cols));
    return spots;
  }
  // Boxes that look square (a row is two columns tall), at least one a spot; `count` of them chosen at random, and a
  // spot anywhere in each. Boxes don't share cells, so spots never land on each other.
  let gx = Math.max(1, Math.min(cols, Math.round(Math.sqrt((count * cols) / (2 * rows))))), gy = Math.ceil(count / gx);
  if (gy > rows) (gy = rows), (gx = Math.ceil(count / rows));
  for (const b of rnd.shuffle(Array.from({ length: gx * gy }, (_, i) => i)).slice(0, count)) {
    const bx = b % gx, by = Math.floor(b / gx);
    const c0 = Math.floor((bx * cols) / gx), c1 = Math.floor(((bx + 1) * cols) / gx);
    const r0 = Math.floor((by * rows) / gy), r1 = Math.floor(((by + 1) * rows) / gy);
    add(c0 + Math.floor(rnd() * (c1 - c0)), r0 + Math.floor(rnd() * (r1 - r0)));
  }
  return spots;
}
