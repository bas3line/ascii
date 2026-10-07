/*
 * dissolve: a word in smooth stroked capitals crumbles letter by letter, its dust
 * sinking out of each letter, while the next word's dust gathers onto its strokes.
 */
import type { Frame, Meta } from "../types.ts";

export interface DissolveOptions {
  [key: string]: unknown;
  /** A list of words, or one string of them split at commas and spaces. */
  words: string[] | string;
}

export const meta = {
  name: "dissolve",
  category: "type",
  note: "words that crumble to dust and condense into the next",
  cols: 64,
  rows: 13,
  fps: 20,
  options: { words: ["hello", "hola", "ciao", "salut"] },
} satisfies Meta<DissolveOptions>;

// Capitals as polylines in a 4 by 6 box, y down.
const STROKES: Record<string, number[][]> = {
  A: [[0, 6, 1.6, 0, 2.4, 0, 4, 6], [0.7, 4, 3.3, 4]],
  B: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [0, 0, 2.5, 0, 3.5, 1, 3.5, 2, 2.5, 3]],
  C: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5]],
  D: [[0, 0, 0, 6, 2.5, 6, 4, 4.5, 4, 1.5, 2.5, 0, 0, 0]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
  F: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]],
  G: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3, 2, 3]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[1, 0, 3, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
  J: [[1.5, 0, 4, 0], [3, 0, 3, 5, 2, 6, 1, 6, 0, 5]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.6], [1.5, 2.25, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3.5, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0]],
  P: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3]],
  Q: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0], [2.4, 4.4, 4, 6.2]],
  R: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3], [2.2, 3, 4, 6]],
  S: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 1, 6, 2, 2, 3, 6, 4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3], [4, 0, 2, 3, 2, 6]],
  Z: [[0, 0, 4, 0, 0, 6, 4, 6]],
  0: [[1, 0, 2, 0, 3, 1, 3, 5, 2, 6, 1, 6, 0, 5, 0, 1, 1, 0]],
  1: [[0.5, 1, 1.5, 0, 1.5, 6], [0.5, 6, 2.5, 6]],
  2: [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 0, 6, 4, 6]],
  3: [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1.5, 3], [3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
  4: [[3, 6, 3, 0, 0, 4, 4, 4]],
  5: [[4, 0, 0, 0, 0, 3, 3, 3, 4, 4, 4, 5, 3, 6, 0, 6]],
  6: [[3.5, 0, 1.5, 0, 0, 1.5, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3, 1, 3, 0, 4]],
  7: [[0, 0, 4, 0, 1.5, 6]],
  8: [[1, 3, 0, 2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1, 3, 0, 4, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3]],
  9: [[0.5, 6, 2.5, 6, 4, 4.5, 4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 4, 3]],
  ".": [[2, 6, 2, 6]],
  ",": [[2, 5.6, 1.5, 7]],
  "!": [[2, 0, 2, 4], [2, 6, 2, 6]],
  "?": [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 2, 3.5, 2, 4.2], [2, 6, 2, 6]],
  "'": [[2, 0, 2, 1.5]],
  "-": [[1, 3, 3, 3]],
};
const RAMP = " .·░▒▓█";
const HOLD = 1.6, TRANS = 2.6; // seconds each word rests, and the change to the next
const STAGGER = 0.2, JITTER = 0.22; // letter by letter, and cell by cell within one
const ERODE = 0.3, FADE = 0.5, LATER = 1; // a cell wearing away, a cell filling in, the new word's lag
const R = 0.5, RD = 0.6; // stroke radius, a little more on slanted strokes so they hold their weight
const GAP = 4; // columns from one letter's last stroke to the next one's first

const hash = (a: number, b: number) => {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// Distance from (x, y) to the segment a-b, less the stroke's radius.
function seg(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  const k = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0;
  return Math.hypot(x - ax - k * dx, y - ay - k * dy) - (dx && dy ? RD : R);
}

export default function dissolve({ words = meta.options.words }: Partial<DissolveOptions> = {}): Frame {
  const { cols, rows } = meta;
  const given = (Array.isArray(words) ? words : String(words).split(/[,\s]+/)).filter(Boolean);
  const list = (given.length ? given : ["hello"]).map((w) => [...String(w).toUpperCase()]);
  const glyph = (ch: string) => STROKES[ch] || (ch === " " ? [] : STROKES["?"]);
  const span = (g: number[][]): [number, number] => {
    const xs = g.flatMap((p) => p.filter((_, i) => i % 2 === 0));
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 2];
  };
  // One unit is a row tall and two columns wide, smaller if the longest word needs it.
  const wide = (w: string[], u: number) => w.reduce((a, ch) => a + Math.round(2 * u * (span(glyph(ch))[1] - span(glyph(ch))[0])) + Math.max(2, Math.round(GAP * u)), 0) - Math.max(2, Math.round(GAP * u)) + 4 * u * R;
  let unit = Math.min(1, (rows - 2) / (6 + 2 * R));
  while (unit > 0.3 && Math.max(...list.map((w) => wide(w, unit))) > cols - 4) unit -= 0.02;
  const gap = Math.max(2, Math.round(GAP * unit));

  // Bake each word's ink coverage and which letter every column belongs to. The
  // pen advances in whole columns, so every gap between letters is the same.
  const baked = list.map((w) => {
    const cover = new Float32Array(cols * rows);
    const slot = new Int8Array(cols);
    const y0 = rows / 2 - 3 * unit;
    let pen = Math.round((cols - wide(w, unit)) / 2 + 2 * unit * R);
    const centres: number[] = [];
    for (const ch of w) {
      const g = glyph(ch);
      const [lo, hi] = span(g);
      const width = Math.round(2 * unit * (hi - lo));
      centres.push(pen + width / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = Math.max(0, pen - 3); c < Math.min(cols, pen + width + 3); c++) {
          let hit = 0;
          for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 3; i++) {
              const gx = lo + (c + (i + 0.5) / 3 - pen) / (2 * unit), gy = (r + (j + 0.5) / 3 - y0) / unit;
              let d = 9;
              for (const p of g) for (let k = 0; k + 3 < p.length; k += 2) d = Math.min(d, seg(gx, gy, p[k], p[k + 1], p[k + 2], p[k + 3]));
              if (d <= 0) hit++;
            }
          }
          cover[r * cols + c] = Math.max(cover[r * cols + c], hit / 9);
        }
      }
      pen += width + gap;
    }
    for (let c = 0; c < cols; c++) {
      let best = 0;
      centres.forEach((x, i) => Math.abs(x - c) < Math.abs(centres[best] - c) && (best = i));
      slot[c] = best;
    }
    return { cover, slot };
  });

  const period = list.length * (HOLD + TRANS);
  const val = new Float32Array(cols * rows);
  const dust = new Float32Array(cols * rows);
  const splat = (x: number, y: number, d: number) => {
    const c = Math.round(x), r = Math.round(y);
    if (c >= 0 && c < cols && r >= 0 && r < rows) dust[r * cols + c] = Math.max(dust[r * cols + c], d);
  };

  return (t) => {
    const u = (((t + 1) % period) + period) % period;
    const n = Math.floor(u / (HOLD + TRANS));
    const tau = u - n * (HOLD + TRANS) - HOLD;
    const A = baked[n], B = baked[(n + 1) % list.length];
    dust.fill(0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        const a = A.cover[k], b = B.cover[k];
        let v = a;
        if (tau > 0) {
          v = 0;
          // The old cell wears thin, then about half of them let go as a grain
          // that falls out of the letter, drifting a little right, and fades.
          if (a > 0) {
            const go = A.slot[c] * STAGGER + hash(k, n) * JITTER;
            const e = (tau - go) / ERODE;
            if (a <= 0.3 || hash(k, n + 7) > 0.5) v = a * (1 - ease(e));
            else if (e < 1) v = a * (1 - 0.5 * Math.max(0, e));
            else {
              const age = tau - go - ERODE, life = 0.5 + 0.35 * hash(k, n + 57);
              if (age < life) {
                const vx = 0.6 + 1.4 * hash(k, n + 31), vy = 0.3 + 0.6 * hash(k, n + 83);
                splat(c + 0.5 + vx * age, r + vy * age + 4 * age * age, 0.5 * (1 - 0.7 * age / life));
              }
            }
          }
          // The new cell's grain, for about half of them, gathers in toward its
          // stroke from a cell or two away, and the cell fills in around it.
          if (b > 0) {
            const land = LATER + B.slot[c] * STAGGER + hash(k, n + 977) * JITTER;
            if (tau >= land) v = Math.max(v, b * (b > 0.3 ? 0.4 + 0.6 * ease((tau - land) / FADE) : ease((tau - land) / FADE)));
            else if (b > 0.3 && hash(k, n + 9) < 0.55) {
              const life = 0.45 + 0.3 * hash(k, n + 211), f = (land - tau) / life;
              if (f < 1) {
                const q = f * f, th = 6.283 * hash(k, n + 401), d = 0.8 + 1.2 * hash(k, n + 613);
                splat(c + 1.8 * d * Math.cos(th) * q, r + d * Math.sin(th) * q, 0.17 + 0.3 * (1 - f));
              }
            }
          }
        }
        val[k] = v;
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) line += RAMP[Math.round(Math.max(val[r * cols + c], dust[r * cols + c]) * (RAMP.length - 1))];
      lines.push(line);
    }
    return lines.join("\n");
  };
}
