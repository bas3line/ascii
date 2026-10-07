/*
 * plucked-string: a string stretched over two bridges, slowed down. A finger
 * pulls it into a corner and lets go; the corner splits in two and runs back
 * and forth as the sum of its harmonics, the high ones dying first.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "plucked string",
  category: "physics",
  note: "a plucked string, slowed down, its harmonics fading",
  cols: 64,
  rows: 14,
  fps: 30,
} satisfies Meta;

const R0 = 6.5; // the string at rest, in rows from the top
const A = 9, B = 55; // the bridges, as column edges
const N = 32; // harmonics summed
const PERIOD = 1.6; // seconds for the fundamental, slowed down
const CYCLE = 6; // seconds between plucks
const DOWN = 0.55, PULL = 0.6; // the finger coming down, then pulling
const T0 = 1.05; // seconds in: the finger about to let go
const LINE = "▔─▁"; // the string's glyph by where it crosses its cell, top to bottom

const hash = (i: number, s: number) => {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export default function pluckedString(): Frame {
  const { cols, rows } = meta;
  const L = B - A;
  const shape: Float64Array[] = []; // sin(n pi u) at each column's middle
  for (let c = 0; c < cols; c++) {
    const u = (c + 0.5 - A) / L;
    shape.push(Float64Array.from({ length: N }, (_, n) => (u > 0 && u < 1 ? Math.sin((n + 1) * Math.PI * u) : 0)));
  }
  // Pluck k: where along the string, which way and how far, and its
  // triangle's harmonics. Plucks take turns pulling up and pressing down.
  const pluck = (k: number) => {
    const near = hash(k, 1) < 0.5;
    const p = near ? 0.2 + 0.18 * hash(k, 2) : 0.62 + 0.18 * hash(k, 2);
    const h = (k % 2 ? -1 : 1) * (3.3 + 0.5 * hash(k, 3));
    const b = Float64Array.from({ length: N }, (_, n) => {
      const m = n + 1;
      return (2 * h * Math.sin(m * Math.PI * p)) / (m * m * Math.PI * Math.PI * p * (1 - p));
    });
    return { p, h, b, col: Math.floor(A + p * L) };
  };
  // The string's height in rows at every column, s seconds after pluck k let
  // go. Damping grows gently with the harmonic, so the corner keeps its edge
  // for a few passes before it rounds off.
  const ring = (y: Float64Array, pk: ReturnType<typeof pluck>, s: number) => {
    y.fill(0);
    for (let n = 0; n < N; n++) {
      const m = n + 1;
      const a = pk.b[n] * Math.cos((2 * Math.PI * m * s) / PERIOD) * Math.exp(-(0.2 + 0.0022 * m * m) * s);
      if (Math.abs(a) < 1e-4) continue;
      for (let c = 0; c < cols; c++) y[c] += a * shape[c][n];
    }
  };
  const tri = (c: number, pk: ReturnType<typeof pluck>) => {
    const u = (c + 0.5 - A) / L;
    return u <= 0 || u >= 1 ? 0 : pk.h * (u < pk.p ? u / pk.p : (1 - u) / (1 - pk.p));
  };

  // The box with an end block and a pin at each end, and a bridge near each.
  const base = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const r0 = Math.floor(R0);
  for (const [pin, edge] of [[1, A], [cols - 2, B]]) {
    base[r0][pin] = "o";
    for (let r = r0 + 1; r < 12; r++) (base[r][pin - 1] = "▐"), (base[r][pin] = "█"), (base[r][pin + 1] = "▌");
    for (let d = 1; d <= 5; d++) {
      const rr = r0 + d;
      base[rr][edge - d] = "/";
      base[rr][edge + d - 1] = "\\";
      if (d === 5) for (let c = edge - d + 1; c < edge + d - 1; c++) base[rr][c] = "_";
    }
  }
  for (let c = 2; c < A; c++) base[r0][c] = "─";
  for (let c = B; c < cols - 2; c++) base[r0][c] = "─";
  base[12].fill("▀");
  for (let c = 2; c < cols - 2; c++) base[13][c] = c === 2 ? "\\" : c === cols - 3 ? "/" : "_";

  const y = new Float64Array(cols);
  return (time) => {
    const t = T0 + time;
    const k = Math.floor(t / CYCLE), s = t - k * CYCLE;
    const pk = pluck(k), prev = pluck(k - 1), up = pk.h > 0;
    const held = DOWN + PULL;
    // Until the finger lets go, the last pluck rings on; then the new one.
    ring(y, s < held ? prev : pk, s < held ? s + CYCLE - held : s - held);
    // The finger's tip row: it comes down to the string, hooking just under
    // it to pull up or resting on it to press down, then flicks away.
    const fc = pk.col, under = up ? 1 : 0;
    let tip = -1;
    if (s < DOWN) tip = Math.floor(R0 - y[fc]) + under - Math.round(10 * (1 - ease(s / DOWN)));
    else if (s < held) {
      const w = ease((s - DOWN) / PULL);
      for (let c = 0; c < cols; c++) y[c] = (1 - w) * y[c] + w * tri(c, pk);
      tip = Math.floor(R0 - y[fc]) + under;
    } else if (s < held + 0.4) {
      const d = s - held;
      tip = Math.floor(R0 - pk.h) + under - Math.round(25 * d + 40 * d * d);
    }

    const g = base.map((row) => row.slice());
    // The string: one glyph a column, slanted where it runs steep.
    for (let c = A; c < B; c++) {
      const row = R0 - y[c], r = Math.floor(row);
      const slope = (y[Math.min(cols - 1, c + 1)] - y[Math.max(0, c - 1)]) / 2;
      g[r][c] = Math.abs(slope) > 0.55 ? (slope > 0 ? "/" : "\\") : LINE[Math.min(2, Math.floor((row - r) * 3))];
    }
    // The finger, from above the frame down to its rounded tip, in front of the string.
    if (tip >= 0) {
      for (let r = 0; r < tip; r++) (g[r][fc - 1] = "│"), (g[r][fc] = " "), (g[r][fc + 1] = "│");
      g[tip][fc - 1] = "╰";
      g[tip][fc] = "─";
      g[tip][fc + 1] = "╯";
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
