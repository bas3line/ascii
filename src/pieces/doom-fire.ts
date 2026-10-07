/*
 * doom fire: the PSX fire spread. Each step every cell climbs one row, drifts
 * a column either way and cools a little, on a grid of square cells two
 * across and four down to a character. Columns cool at different rates, so
 * the fire stands up in separate tongues over a bed that never dims.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "doom fire",
  category: "effects",
  note: "the psx fire spread, tongues climbing off a white-hot bed",
  cols: 60,
  rows: 18,
  fps: 24,
} satisfies Meta;

const SX = 2;
const SY = 4;
const MAX = 36;
const RAMP = " .:;!+*#%@"; // coolest to hottest, upright strokes in the middle
const RATE = 24; // spread steps a second
const BED = 0.72; // the share of the width that burns
// Tongues: [place across the bed from -1 to 1, tallest as a share of the
// frame, half width in cells]. Between them the fire cools fast.
const TONGUES: [number, number, number][] = [
  [-0.66, 1.05, 11],
  [-0.18, 2.1, 15],
  [0.3, 1.6, 13],
  [0.73, 0.95, 9],
];
const DRIFT = 34; // steps for a tongue's height to wander through one knot
const FLOOR = 0.16;

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number): number {
  const i = Math.floor(x), j = Math.floor(y), u = ease(x - i), v = ease(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export default function doomFire(): Frame {
  const { cols, rows } = meta;
  const W = cols * SX;
  const H = rows * SY + 1;
  const rand = mulberry32(9);
  const heat = new Float32Array(W * H);
  const cool = new Float32Array(W);
  const tall = new Float32Array(W);
  // The bed: white hot right across, dropping off over the last few columns.
  const bed = Float32Array.from({ length: W }, (_, x) => {
    const d = Math.abs((2 * x + 1) / W - 1) / BED;
    return d < 0.88 ? 1 : d < 1 ? ease((1 - d) / 0.12) : 0;
  });
  let n = 0;

  const step = () => {
    n++;
    // Each column cools at the rate that lets the nearest tongue reach its
    // height, and each tongue's height wanders on its own, so they stand
    // apart and rise and fall out of step.
    tall.fill(0.28);
    TONGUES.forEach(([at, top, half], i) => {
      const lift = top * (0.55 + 0.45 * (noise(i * 7.3, n / DRIFT) * 0.7 + noise(i * 3.1 + 40, n / (DRIFT * 0.4)) * 0.3));
      const mid = (W / 2) * (1 + at * BED) + 6 * (noise(i * 5.7 + 90, n / (DRIFT * 2)) - 0.5);
      for (let x = Math.max(0, Math.floor(mid - half)); x < Math.min(W, mid + half); x++) {
        const d = (x + 0.5 - mid) / half;
        tall[x] = Math.max(tall[x], lift * (1 - Math.abs(d) ** 1.3));
      }
    });
    for (let x = 0; x < W; x++) cool[x] = MAX / (rows * SY * tall[x]);
    const base = (H - 1) * W;
    for (let x = 0; x < W; x++) heat[base + x] = MAX * bed[x];
    // The spread runs in place, so the last writer wins; alternating the scan
    // keeps that from turning into a wind. Pockets of extra cooling rise with
    // the flame, so near the top the tips tear off and fade on their own.
    for (let y = 1; y < H; y++) {
      const row = y * W;
      const up = 1 - y / H;
      const flip = (y + n) & 1;
      for (let i = 0; i < W; i++) {
        const x = flip ? W - 1 - i : i;
        const r = rand();
        const to = x + (r < 0.3 ? -1 : r > 0.7 ? 1 : 0);
        if (to < 0 || to >= W) continue;
        const tear = 1 + 2.2 * up * up * Math.max(0, noise(x / 5, (y + n) / 6) - 0.45);
        const v = heat[row + x] - rand() * 2 * cool[x] * tear;
        heat[row - W + to] = v > 0 ? v : 0;
      }
    }
  };

  for (let i = 0; i < 200; i++) step();
  const lv = new Float32Array(cols * rows);
  let last = 0;
  let acc = 0;

  return (t) => {
    acc += Math.min(Math.max(t - last, 0), 0.25);
    last = t;
    while (acc >= 1 / RATE - 1e-6) {
      step();
      acc -= 1 / RATE;
    }
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        let sum = 0;
        for (let j = 0; j < SY; j++) {
          const at = (cy * SY + j) * W + cx * SX;
          for (let i = 0; i < SX; i++) sum += heat[at + i];
        }
        const v = (sum / (SX * SY * MAX) - FLOOR) / (1 - FLOOR);
        lv[cy * cols + cx] = v <= 0 ? 0 : Math.min(RAMP.length - 1, 1 + ((v * (RAMP.length - 1)) | 0));
      }
    // A faint glyph only stands with flame beside or below it, and a lone
    // one not at all, so the tips keep clean edges instead of a haze of specks.
    const lines: string[] = [];
    for (let cy = 0; cy < rows; cy++) {
      let line = "";
      for (let cx = 0; cx < cols; cx++) {
        let k = lv[cy * cols + cx];
        if (k > 0 && k < 5) {
          let any = 0, under = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const y = cy + dy, x = cx + dx;
              if ((dy || dx) && y >= 0 && y < rows && x >= 0 && x < cols) {
                const o = lv[y * cols + x];
                if (o) any++;
                if (dy >= 0 && o > under) under = o;
              }
            }
          if (any < 2 || (k < 3 && under < 3)) k = 0;
        }
        line += RAMP[k];
      }
      lines.push(line);
    }
    return lines.join("\n");
  };
}
