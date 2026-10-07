/*
 * saptarishi: the seven stars of the Big Dipper where they really sit, with
 * Alcor beside Mizar, in a strip of twinkling sky crossed now and then by a
 * meteor.
 */
import type { Frame, Meta } from "../types.ts";

export interface SaptarishiOptions {
  [key: string]: unknown;
  lines: boolean;
}

export const meta = {
  name: "saptarishi",
  category: "space",
  note: "the big dipper at true positions in a twinkling sky",
  cols: 64,
  rows: 18,
  fps: 12,
  options: { lines: true },
} satisfies Meta<SaptarishiOptions>;

// Right ascension in hours, declination in degrees. Megrez is the dim one,
// and only the seven ever wear a * or a +.
const SEVEN: [number, number, string][] = [
  [11.062, 61.751, "*"], // Dubhe
  [11.031, 56.383, "*"], // Merak
  [11.897, 53.695, "*"], // Phecda
  [12.257, 57.033, "+"], // Megrez
  [12.901, 55.96, "*"], // Alioth
  [13.399, 54.925, "*"], // Mizar
  [13.792, 49.313, "*"], // Alkaid
];
const EDGES: [number, number][] = [[6, 5], [5, 4], [4, 3], [3, 0], [0, 1], [1, 2], [2, 3]];
const METEOR = 11; // seconds between meteors, give or take

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
// A dot sits high, mid or low in its cell, so a slope can pass through.
const dot = (sub: number) => (sub < 0.36 ? "'" : sub < 0.64 ? "·" : ".");

export default function saptarishi({ lines = true }: Partial<SaptarishiOptions> = {}): Frame {
  const { cols, rows } = meta;
  // Facing north, east on the left: a tangent-plane projection in cells,
  // where a row is two columns tall.
  const rad = Math.PI / 180, a0 = 186 * rad, d0 = 55.5 * rad;
  const plane = SEVEN.map(([ra, dec]): [number, number] => {
    const a = ra * 15 * rad - a0, d = dec * rad;
    const k = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a);
    return [(-Math.cos(d) * Math.sin(a)) / k, (Math.sin(d0) * Math.cos(d) * Math.cos(a) - Math.cos(d0) * Math.sin(d)) / k];
  });
  const xs = plane.map((p) => p[0]), ys = plane.map((p) => p[1]);
  const s = (cols - 12) / (Math.max(...xs) - Math.min(...xs));
  const pts = plane.map(([x, y]): [number, number] => [
    cols / 2 - 0.5 + s * (x - (Math.max(...xs) + Math.min(...xs)) / 2),
    rows / 2 - 0.5 + (s / 2) * (y - (Math.max(...ys) + Math.min(...ys)) / 2),
  ]);

  const sky = new Array<string>(cols * rows).fill(" ");
  const used = new Uint8Array(cols * rows);
  const keep = (c: number, r: number, mc: number, mr: number) => {
    for (let j = -mr; j <= mr; j++)
      for (let i = -mc; i <= mc; i++)
        if (r + j >= 0 && r + j < rows && c + i >= 0 && c + i < cols) used[(r + j) * cols + c + i] = 1;
  };

  // The seven, and Alcor a cell up and to the east of Mizar, clear of both
  // of Mizar's lines.
  const cell = pts.map(([x, y]): [number, number] => [Math.round(x), Math.round(y)]);
  cell.forEach(([c, r], i) => ((sky[r * cols + c] = SEVEN[i][2]), keep(c, r, 3, 1)));
  sky[(cell[5][1] - 1) * cols + cell[5][0] - 1] = ".";

  // Each line is a sparse dotted stroke from star cell to star cell: a dot
  // about every two columns, each taken from the point nearest its cell's
  // centre, stopping short of the stars at either end.
  for (const [i, j] of EDGES) {
    const [x0, y0] = cell[i], [x1, y1] = cell[j];
    const n = Math.ceil(Math.hypot(x1 - x0, 2 * (y1 - y0)) * 8);
    const run: { c: number; r: number; off: number; sub: number }[] = [];
    for (let q = 0; q <= n; q++) {
      const x = x0 + ((x1 - x0) * q) / n, y = y0 + ((y1 - y0) * q) / n;
      const c = Math.round(x), r = Math.round(y), sub = y - r + 0.5;
      keep(c, r, 1, 1);
      const off = (x - c) ** 2 + (2 * (sub - 0.5)) ** 2;
      const last = run[run.length - 1];
      if (last && last.c === c && last.r === r) {
        if (off < last.off) Object.assign(last, { off, sub });
      } else run.push({ c, r, off, sub });
    }
    const clear = ({ c, r }: { c: number; r: number }) =>
      [cell[i], cell[j]].every(([sc, sr]) => Math.abs(sr - r) > 1 || Math.abs(sc - c) > (sr === r ? 2 : 1));
    let lc = -9, ly = -9;
    for (const p of run) {
      if (!lines || !clear(p) || Math.hypot(p.c - lc, 2 * (p.r + p.sub - ly)) < 1.8) continue;
      [lc, ly] = [p.c, p.r + p.sub];
      if (sky[p.r * cols + p.c] === " ") sky[p.r * cols + p.c] = dot(p.sub);
    }
  }

  // Field stars: sparse, never touching, thinning toward the ends. Most are
  // a faint . and a few a ·, and each now and then dims out for a moment.
  const field: { k: number; ch: string; rate: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (used[r * cols + c] || hash(c, r) >= 0.058 * ease(clamp(Math.min(c, cols - 1 - c) / 9))) continue;
      field.push({ k: r * cols + c, ch: hash(r, c + 99) > 0.85 ? "·" : ".", rate: 0.35 + 0.7 * hash(c, r + 7) });
      keep(c, r, 2, 1);
    }

  const out = new Array<string>(cols * rows);
  return (t) => {
    for (let i = 0; i < out.length; i++) out[i] = sky[i];
    field.forEach((f, i) => {
      const x = t * f.rate, k = Math.floor(x), e = ease(x - k);
      const w = hash(k, i + 7) + (hash(k + 1, i + 7) - hash(k, i + 7)) * e;
      out[f.k] = w < 0.2 ? " " : f.ch;
    });
    // A meteor every so often: a head with a tail that thins out behind it.
    const m0 = Math.max(0, Math.floor((t - 2 + 2.5) / METEOR));
    for (const m of [m0 - 1, m0]) {
      if (m < 0) continue;
      const start = 2 + m * METEOR + (m ? hash(m, 3) * 4 - 2 : 0);
      const age = (t - start) / 0.8;
      if (age <= 0 || age >= 1.45) continue;
      const dir = hash(m, 5) < 0.5 ? 1 : -1;
      const len = 18 + 8 * hash(m, 6), drop = 3 + 3 * hash(m, 7);
      const x0 = dir > 0 ? 4 + hash(m, 8) * (cols - len - 8) : cols - 5 - hash(m, 8) * (cols - len - 8);
      const y0 = 0.6 + hash(m, 9) * (rows - drop - 2.2);
      const front = Math.min(age, 1), back = Math.max(0, age - 0.45);
      for (let q = Math.ceil(back * 40); q <= front * 40; q++) {
        const f = q / 40, x = x0 + dir * len * f, y = y0 + drop * f;
        const c = Math.round(x), r = Math.floor(y), sub = y - r;
        const k = r * cols + c;
        if (c < 0 || c >= cols || r < 0 || r >= rows || "*+".includes(sky[k])) continue;
        const fresh = (f - back) / Math.max(1e-6, front - back);
        out[k] = fresh > 0.5 ? (sub < 0.34 ? "'" : sub < 0.67 ? "-" : "_") : sub < 0.5 ? "·" : ".";
      }
      if (age < 1) {
        const c = Math.round(x0 + dir * len * age), r = Math.floor(y0 + drop * age);
        if (c >= 0 && c < cols && r >= 0 && r < rows && !"*+".includes(sky[r * cols + c])) out[r * cols + c] = "o";
      }
    }
    const res: string[] = [];
    for (let r = 0; r < rows; r++) res.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return res.join("\n");
  };
}
