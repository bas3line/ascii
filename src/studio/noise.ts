/*
 * studio noise: the shared celular-value noise used by studio layers and scenes.
 * Part of ascii.rest, MIT licensed.
 */

/** Stable integer hash folding down to [0, 1). */
export function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise with optional lattice wrapping in x. */
export function noise(x: number, y: number, period = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  let x0 = xi;
  let x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }

  const a = hash(x0, yi);
  const b = hash(x1, yi);
  const c = hash(x0, yi + 1);
  const d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal brownian motion: `octaves` summed octaves in [0, 1). */
export function fbm(x: number, y: number, octaves = 3, period = 0): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq, period * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  const norm = 1 - Math.pow(0.5, octaves);
  return sum / Math.max(1e-6, norm);
}