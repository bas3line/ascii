/*
 * aurora: a curtain of light over a spruce treeline at night. Its lower hem
 * is brightest and ripples; streaks rise from it and fade out below a clear
 * sky of stars, and light drifts along it in slow surges.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "aurora",
  category: "nature",
  note: "an aurora curtain rippling over a treeline under stars",
  cols: 64,
  rows: 20,
  fps: 20,
} satisfies Meta;

// Dim to bright, in upright strokes. The curtain is light, not shade, so on
// paper it keeps the ramp and prints as a negative, like the stars.
const RAMP = " .:!|I";
const TAU = Math.PI * 2;
const HEM = 12; // the row the hem ripples about
const RIDGE = 18; // the row the trees stand on

const mulberry32 = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (x: number, y: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number) {
  const i = Math.floor(x), j = Math.floor(y), u = ease(x - i), v = ease(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export default function aurora(): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(5);

  // The treeline: spruces in stepped quarter blocks, a tier of branches
  // every two rows, each standing apart with sky between, on a low ridge.
  const land: (string | null)[] = new Array(cols * rows).fill(null);
  for (let c = 0; c < cols; c++) {
    land[c + RIDGE * cols] = Math.sin(c * 0.13 + 1) > 0.3 ? "█" : "▄";
    for (let r = RIDGE + 1; r < rows; r++) land[c + r * cols] = "█";
  }
  for (let x = 1 + Math.floor(rand() * 2); x < cols - 1; ) {
    const tall = 2 + Math.floor(rand() * 2.2 + rand() * rand() * 2.5); // 2 to 5 rows
    for (let k = 0; k < tall; k++) {
      const r = RIDGE - tall + k, half = 1 + (k >> 1);
      for (let c = x - half + 1; c <= x + half; c++) {
        if (c < 0 || c >= cols) continue;
        const left = c === x - half + 1, right = c === x + half;
        land[c + r * cols] = left ? (k & 1 ? "▟" : "▗") : right ? (k & 1 ? "▙" : "▖") : "█";
      }
    }
    for (let c = x - (tall >> 1); c <= x + 1 + (tall >> 1); c++) if (c >= 0 && c < cols) land[c + RIDGE * cols] = "█";
    x += 2 + 2 * (tall >> 1) + 1 + Math.floor(rand() * 3);
  }

  // Stars, a few of them bright, each twinkling on its own beat.
  const stars: { k: number; bright: boolean; rate: number; ph: number }[] = [];
  while (stars.length < 40) {
    const c = Math.floor(rand() * cols), r = Math.floor(rand() * rand() * (HEM + 2));
    stars.push({ k: c + r * cols, bright: rand() < 0.2, rate: 0.3 + rand() * 1.1, ph: rand() * TAU });
  }

  const field = new Float32Array(cols * rows);
  const out: string[] = new Array(cols * rows);
  return (t) => {
    field.fill(0);
    for (let c = 0; c < cols; c++) {
      const x = c + 0.5;
      // The hem: a slow fold and a quicker ripple running along it.
      const y0 = HEM + 1.2 * Math.sin(x * 0.12 + t * 0.35) + 0.55 * Math.sin(x * 0.31 - t * 0.7 + 1);
      const slope = 1.2 * 0.12 * Math.cos(x * 0.12 + t * 0.35) + 0.55 * 0.31 * Math.cos(x * 0.31 - t * 0.7 + 1);
      // Light surges along the curtain but never leaves it, and gathers
      // where a fold is seen edge on.
      const lit = (0.62 + 0.4 * ease(noise(x * 0.07 - t * 0.25, 3.3))) * (1 + 0.9 * Math.min(1, Math.abs(slope) * 2));
      // Streaks stand on the hem, sliding along it, each fading as it rises.
      const ray = ease(Math.min(1, Math.max(0, (noise(x * 0.9 - t * 1.4, 7 + t * 0.3) - 0.3) / 0.45)));
      const height = 1.5 + 6.5 * ray * (0.6 + 0.6 * noise(x * 0.12 + t * 0.15, 11));
      for (let r = 0; r < rows; r++) {
        const d = y0 - (r + 0.5); // rows above the hem
        // A bright hem, the streaks above it, and below it a glow that
        // settles on the treetops, striped like the streaks.
        const hem = Math.exp(-((Math.max(0, Math.abs(d) - 0.5) / (d > 0 ? 0.6 : 0.35)) ** 2));
        const v = Math.max(hem, d >= 0 ? (0.3 + 0.7 * ray) * Math.max(0, 1 - d / height) ** 1.4 : Math.exp(d / 1.5) * (0.4 + 0.4 * ray));
        field[c + r * cols] = lit * v;
      }
    }
    for (let k = 0; k < cols * rows; k++) {
      const b = field[k] - 0.12;
      out[k] = land[k] || (b > 0 ? RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(b * 5))] : " ");
    }
    for (const s of stars) {
      if (out[s.k] !== " ") continue;
      const tw = Math.sin(t * s.rate * TAU + s.ph);
      out[s.k] = s.bright ? (tw > 0.3 ? "+" : "*") : tw > -0.6 ? "." : " ";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
