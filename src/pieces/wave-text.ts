/*
 * wave-text: a swell rolls into a line of text from the left, lifts and drops
 * each letter in turn, runs off the right, and the line settles level again.
 */
import type { Frame, Meta } from "../types.ts";

export interface WaveTextOptions {
  [key: string]: unknown;
  text: string;
  amp: number;
  wavelength: number;
  speed: number;
  spacing: number;
  settle: boolean;
}

export const meta = {
  name: "wave text",
  category: "type",
  note: "a swell running through a line of text, left to right",
  cols: 36,
  rows: 5,
  fps: 15,
  options: { text: "making waves", amp: 1.25, wavelength: 18, speed: 8, spacing: 0, settle: true },
} satisfies Meta<WaveTextOptions>;

export default function waveText({
  text = meta.options.text,
  amp = meta.options.amp, // rows from the level line to a crest
  wavelength = meta.options.wavelength, // letters from crest to crest
  speed = meta.options.speed, // letters a second the swell travels
  spacing = meta.options.spacing, // blank columns between letters
  settle = meta.options.settle, // level water between swells, or one endless swell
}: Partial<WaveTextOptions> = {}): Frame {
  const { cols, rows } = meta;
  const base = (rows - 1) / 2;
  const A = Math.min(Math.max(Number(amp) || 0, 0), base + 0.45);
  const W = Math.max(Number(wavelength) || 18, 4);
  const v = Math.max(Number(speed) || 8, 0.5);
  const step = 1 + Math.max(0, Math.floor(Number(spacing) || 0));
  const chars = [...String(text)].slice(0, Math.floor((cols - 1) / step) + 1);
  const n = chars.length;
  const x0 = Math.floor((cols - (n - 1) * step - 1) / 2);

  // One pass: half a wavelength to build, a wavelength and a half at full
  // height, half a wavelength to fade, then level water until the tail has
  // cleared the last letter. The envelope is zero at the seam, so the loop
  // never pops.
  const rise = W / 2, top = 1.5 * W, pass = 2 * rise + top;
  const L = pass + n;
  // Settling, t = 0 has the front just reaching the first letter, so the line
  // starts level. Endless, it starts with a crest over the middle letter,
  // where the wave is flattest.
  const start = settle ? 0 : W / 4 + (n - 1) / 2;
  const envelope = (u: number): number => {
    if (!settle) return 1;
    if (u < rise) return Math.sin((Math.PI / 2) * (u / rise)) ** 2;
    if (u < rise + top) return 1;
    if (u < pass) return Math.cos((Math.PI / 2) * ((u - rise - top) / rise)) ** 2;
    return 0;
  };
  const height = (u: number): number => {
    const w = settle ? ((u % L) + L) % L : u;
    return A * envelope(w) * Math.sin((2 * Math.PI * w) / W);
  };

  return (t) => {
    const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    const s = start + t * v;
    for (let i = 0; i < n; i++) {
      if (chars[i] === " ") continue;
      const u = s - i;
      const h = height(u);
      const lift = Math.round(h);
      const x = x0 + i * step;
      grid[base - lift][x] = chars[i];
      // A letter that has only just stepped off the level line leaves a dot
      // where it sat, so the step reads as motion rather than a jump.
      if (lift > 0 && h < 0.7 && height(u + 0.5) > h) grid[base][x] = "·";
    }
    return grid.map((r) => r.join("")).join("\n");
  };
}
