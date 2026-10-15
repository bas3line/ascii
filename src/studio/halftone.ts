/*
 * studio halftone: Bayer dithering, glyph ramps and 15-bit RGB lookup tables.
 * Part of ascii.rest, MIT licensed.
 */

export const DOTS_RAMP = " ·•●";
export const BRAILLE_RAMP = " ⠂⠆⠖⣶";
export const ASCII_RAMP = " .:-=+*#%@";

export const COVER_DOTS = [0, 0.3, 0.6, 1.0];

/** 4x4 Bayer dithering matrix centered around 0. */
export const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => v / 16 - 0.47);

/** 8x8 Bayer dithering matrix centered around 0. */
export const BAYER_8X8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => v / 64 - 0.48);

export function clamp(v: number, min = 0, max = 1): number {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/** Precomputes a 32,768-entry (15-bit 5-5-5 RGB) nearest palette color cache. */
export function buildLut(paletteRgb: [number, number, number][]): {
  lut: Uint8Array;
  nearest: (r: number, g: number, b: number) => number;
} {
  const lut = new Uint8Array(32768).fill(255);

  const nearest = (r: number, g: number, b: number): number => {
    const ir = Math.min(31, Math.max(0, (r * 31.99) | 0));
    const ig = Math.min(31, Math.max(0, (g * 31.99) | 0));
    const ib = Math.min(31, Math.max(0, (b * 31.99) | 0));
    const k = (ir << 10) | (ig << 5) | ib;

    if (lut[k] !== 255) return lut[k];

    let best = 0;
    let bestDist = 1e9;
    for (let i = 0; i < paletteRgb.length; i++) {
      const p = paletteRgb[i];
      const dr = p[0] - r;
      const dg = p[1] - g;
      const db = p[2] - b;
      // Perceptual color distance metric
      const dist = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }

    lut[k] = best;
    return best;
  };

  return { lut, nearest };
}

/** Rasterizes a single cell's RGB and coordinates into a halftone glyph and palette index. */
export function shadeCell(
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  nearest: (r: number, g: number, b: number) => number,
  options?: {
    ramp?: string;
    dither?: "bayer4" | "bayer8" | "none";
    contrast?: number;
  }
): { char: string; colorIdx: number } {
  const ramp = options?.ramp ?? DOTS_RAMP;
  const ditherMode = options?.dither ?? "bayer4";
  const contrast = options?.contrast ?? 1.0;
  const maxLevels = ramp.length - 1;

  const peak = Math.max(r, g, b, 1e-4);
  const adjusted = Math.pow(peak, 0.85 / contrast);
  const level = clamp(adjusted);

  let ditherOffset = 0;
  if (ditherMode === "bayer4") {
    ditherOffset = BAYER_4X4[(y & 3) * 4 + (x & 3)];
  } else if (ditherMode === "bayer8") {
    ditherOffset = BAYER_8X8[(y & 7) * 8 + (x & 7)];
  }

  const step = Math.max(
    0,
    Math.min(maxLevels, Math.round(level * maxLevels + ditherOffset))
  );
  const char = ramp[step] ?? " ";

  // Dot color scaling: small dots boost intensity slightly to maintain perceived brightness
  const coverage = (step / maxLevels) || 0.1;
  const want = step ? Math.min(1, (level + 0.06) / coverage) : 0;
  const boost = ((0.3 + 0.7 * want) * (0.4 + 0.6 * smoothstep(0.14, 0.5, level))) / peak;

  const colorIdx = nearest(
    clamp(r * boost),
    clamp(g * boost),
    clamp(b * boost)
  );

  return { char, colorIdx };
}
