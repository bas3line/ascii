/*
 * campfire: two logs lying crossed on the ground, burning where they meet.
 * Tongues of flame sway and tear over a low body of fire, the bark chars and
 * glows beneath them, and sparks lift off the tips as they climb.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "campfire",
  category: "nature",
  note: "a log fire flickering, sparks rising; denser ink is hotter",
  cols: 52,
  rows: 22,
  fps: 20,
} satisfies Meta;

// Coolest to hottest. Fire is light, so it keeps its ramp on paper, where
// the hottest parts print as the densest ink.
const FIRE = " .,:;=+*#%@";
const EMBER = ":;+*#%";
const SURF = "_.-'"; // a log's edge by where it crosses its cell, bottom to top
const BED = 18.4; // the row the flames stand on
// Tongues: [columns off centre, height in rows, half width, phase].
const TONGUES: [x0: number, h0: number, w0: number, ph: number][] = [
  [-7.4, 9.5, 3.4, 2.4],
  [-4.4, 12.5, 3.5, 0.0],
  [-1.4, 15, 3.5, 1.7],
  [1.7, 15.5, 3.5, 3.1],
  [4.7, 12.5, 3.5, 4.4],
  [7.6, 10, 3.4, 5.6],
];
// The logs cross in the fire, each lying low across the frame: [the side
// its near end lies on, half its length in columns, rows it drops a column
// toward that end, radius in rows].
const MID = 16.8; // the row their axes cross at
const LOGS: [side: number, half: number, k: number, R: number][] = [[1, 22, 0.115, 1.4], [-1, 22, 0.115, 1.4]];
const SPARKS = 9;

const hash = (x: number, y: number): number => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number): number => t * t * (3 - 2 * t);
function noise(x: number, y: number): number {
  const i = Math.floor(x), j = Math.floor(y), u = ease(x - i), v = ease(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export default function campfire(): Frame {
  const { cols, rows } = meta;
  const cx = cols / 2;

  // Each log as cells: a glyph, and how hot the fire makes it (the top of
  // the log most, and the more the nearer the middle). The near half of a
  // log, toward us, is drawn over the far half of the other.
  const logs: (string | null)[] = new Array(cols * rows).fill(null);
  const heat = new Float32Array(cols * rows);
  const near = new Uint8Array(cols * rows);
  for (const [side, half, k, R] of LOGS) {
    const seed = side > 0 ? 3 : 8;
    for (let c = Math.floor(cx - half); c < cx + half; c++) {
      const x = c + 0.5 - cx, y = MID + k * x * side;
      const front = x * side > 0 ? 1 : 0; // the near end is cut and shows its rings
      const r0 = Math.floor(y - R), r1 = Math.floor(y + R);
      const warm = Math.exp(-((x / 13) ** 2));
      const set = (r: number, ch: string, h = 0) => {
        const i = c + r * cols;
        if (r < 0 || r >= rows || (near[i] && !front)) return;
        logs[i] = ch;
        heat[i] = h;
        near[i] = front;
      };
      // How far in from the end of the log, in columns.
      const e = Math.min(c - Math.floor(cx - half), Math.ceil(cx + half) - 1 - c);
      set(r0, e === 0 || (front && e === 1) ? " " : SURF[Math.min(3, Math.floor((1 - (y - R - r0)) * 4))], warm);
      set(r1, e === 0 || (front && e < 3) ? " " : SURF[Math.min(3, Math.floor((1 - (y + R - r1)) * 4))]);
      // Bark in runs along the log that break and change: ridged where the
      // firelight catches it on top, plainer in its own shadow below.
      for (let r = r0 + 1; r < r1; r++) {
        const upper = r === r0 + 1;
        const u = x * side + (upper ? 0 : 1.7) + 40, run = Math.floor(u / 2.6), h = hash(run, seed + (upper ? 0 : 5));
        let ch = run % 2 ? (upper ? "=" : "-") : upper ? (h < 0.6 ? "#" : ":") : h < 0.6 ? "=" : ".";
        if (e === 0) ch = front ? (upper === x < 0 ? "/" : "\\") : x < 0 ? "(" : ")";
        else if (front && e === 1) ch = upper ? "@" : "_";
        else if (front && e === 2) ch = upper === x < 0 ? "\\" : "/";
        set(r, ch, warm * (upper ? 0.7 : 0.3));
      }
    }
  }

  // Sparks: each rises from the flames on its own period, wavering.
  const sparks = Array.from({ length: SPARKS }, (_, i) => ({
    x: (hash(i, 1) - 0.5) * 12,
    period: 2.6 + hash(i, 2) * 2.4,
    phase: (i + hash(i, 3) * 0.5) / SPARKS,
    rise: 7 + hash(i, 4) * 6,
    drift: (hash(i, 5) - 0.5) * 8,
  }));

  // Coals on the ground under the crossing, brightest in the middle.
  const coals: [k: number, w: number, ph: number][] = [];
  for (let r = Math.ceil(BED) - 1; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = c + 0.5 - cx, k = c + r * cols;
      if (logs[k] || Math.abs(x) > 10) continue;
      coals.push([k, Math.exp(-((x / 6) ** 2)) * (1.3 - (r + 1 - BED) * 0.35), hash(c, r + 60) * 9]);
    }

  const fire = new Float32Array(cols * rows);
  const out: string[] = new Array(cols * rows);
  return (t) => {
    out.fill(" ");
    const glow = (k: number, ch: string): string => {
      const c = k % cols, r = (k - c) / cols;
      const g = heat[k] * (0.45 + 0.75 * noise(c * 0.7 + 3, t * 2.2 + r * 3)) - 0.3;
      return g > 0 ? EMBER[Math.min(EMBER.length - 1, Math.floor(g * 1.6 * EMBER.length))] : ch;
    };
    const breath = 0.85 + 0.3 * noise(t * 3, 7.5);
    fire.fill(0);
    for (let r = 0; r < Math.ceil(BED); r++)
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5 - cx;
        let v = 0;
        for (const sub of [0.25, 0.75]) {
          const h = BED - (r + sub);
          // A low body of fire across the crossing, and the tongues rising
          // out of it, the outer ones leaning in toward the middle.
          const low = h / (5.5 * breath);
          let m = low < 1 ? (1 - (x / (10.5 * Math.sqrt(1 - low) + 0.5)) ** 2) * (0.85 - low * 0.5) : 0;
          let top = low < 1 ? low * 0.5 : 0;
          for (const [x0, h0, w0, ph] of TONGUES) {
            const lift = h / (h0 * (0.72 + 0.5 * noise(t * 1.6 + ph * 3, ph * 5)) * breath);
            if (lift >= 1) continue;
            const sway = 1.4 * lift ** 1.4 * Math.sin(h * 0.55 - t * 5.5 + ph) + 0.5 * lift * Math.sin(t * 8.3 + ph * 2);
            const q = (x - x0 * (1 - 0.45 * lift) - sway) / (w0 * (1 - lift) ** 0.6 + 0.5);
            const f = (1 - q * q) * (1 - lift * 0.6);
            if (f > m) [m, top] = [f, lift];
          }
          // Rising noise tears the fire, more toward the tips than the base.
          const n = noise(x * 0.45, (h - t * 6) * 0.35) * 0.6 + noise(x * 0.9 + 9, (h - t * 8) * 0.7) * 0.4;
          v += m - 0.55 * n * (0.35 + top * 0.65);
        }
        fire[c + r * cols] = v / 2;
      }
    // Only flame that joins the body of the fire is drawn: a tongue that
    // tears free goes out.
    const stack: number[] = [];
    for (let c = 0, r = Math.ceil(BED) - 1; c < cols; c++) if (fire[c + r * cols] > 0.03) stack.push(c + r * cols), (fire[c + r * cols] += 2);
    while (stack.length) {
      const k = stack.pop()!, c = k % cols;
      for (const d of [-cols - 1, -cols, -cols + 1, -1, 1]) {
        const j = k + d;
        if (j < 0 || Math.abs((j % cols) - c) > 1 || !(fire[j] > 0.03 && fire[j] < 2)) continue;
        fire[j] += 2;
        stack.push(j);
      }
    }
    // The near halves of the logs stand in front of all but the hottest
    // flame; the far halves go behind it.
    for (let k = 0; k < cols * rows; k++) {
      const v = fire[k] - 2;
      if (v > 0.03 && !(near[k] && v < 0.6)) out[k] = FIRE[Math.min(FIRE.length - 1, 1 + Math.floor(((v - 0.03) / 0.85) * (FIRE.length - 1)))];
      else if (logs[k]) out[k] = glow(k, logs[k]!);
    }
    // Coals glow on the ground under the crossing.
    for (const [k, w, ph] of coals) {
      const b = w * (0.35 + 0.8 * noise(ph + t * 1.3, ph * 3)) - 0.2;
      if (b > 0 && out[k] === " ") out[k] = EMBER[Math.min(EMBER.length - 1, Math.floor(b * EMBER.length))];
    }
    for (const s of sparks) {
      const u = (t / s.period + s.phase) % 1;
      if (u > 0.8) continue;
      const y = BED - 8 - u * s.rise;
      const x = cx + s.x + s.drift * u + Math.sin(u * 11 + s.phase * 6);
      const c = Math.floor(x), r = Math.floor(y), k = c + r * cols;
      if (r < 0 || c < 0 || c >= cols || out[k] !== " ") continue;
      out[k] = u < 0.25 ? "*" : u < 0.45 ? "+" : u < 0.65 ? "'" : ".";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
