/*
 * cube: a cube drawn the way a drafting sheet draws it, in parallel projection
 * with only the near edges and faces stippled by the light, turning by quarters.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cube",
  category: "shapes",
  note: "a stippled hidden-line cube turning a quarter at a time",
  cols: 32,
  rows: 18,
  fps: 24,
} satisfies Meta;

const CW = 0.5; // cell width over cell height
const S = 4.95; // rows per half-edge
const REST = 0.21; // the resting yaw: long edges flat, receding edges one column a row
const PITCH = -0.43; // looking down on the top face
const TURN = 4; // seconds to turn a quarter
const HOLD = 2; // seconds at rest after each turn

// A face's stipple by the light it catches, least ink to most: a sparse
// lattice of dots, a checker of dots, a checker of colons.
const TONES = [
  (c: number, r: number) => ((c + 2 * r) % 4 === 0 ? "." : " "),
  (c: number, r: number) => ((c + r) & 1 ? "." : " "),
  (c: number, r: number) => ((c + r) & 1 ? ":" : " "),
];

const V: [number, number, number][] = [];
for (let i = 0; i < 8; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
const E: [number, number][] = [];
for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) E.push([i, i | b]);
// Each face as its axis, its sign and its four corners in order around it.
const F: [number, number, number[]][] = [];
for (let k = 0; k < 3; k++) {
  const [a, b] = [1, 2, 4].filter((_, j) => j !== k);
  for (const s of [0, 1]) {
    const base = s << k;
    F.push([k, s ? 1 : -1, [base, base | a, base | a | b, base | b]]);
  }
}
const unit = (v: number[]) => v.map((c) => c / Math.hypot(...v));
const LIGHT = unit([-0.35, 0.6, -0.72]); // from the upper left, toward the eye at -z

// One edge, between its corner cells but not on them. A shallow edge is runs
// of - only, a row apart; a steeper one takes one / or \ a row, with _
// carrying the edge along the foot of the row to where the next row picks up,
// and one within a few degrees of upright is |.
function line([c0, r0]: [number, number], [c1, r1]: [number, number], put: (c: number, r: number, ch: string) => unknown) {
  if (r1 < r0) [c0, r0, c1, r1] = [c1, r1, c0, r0];
  const dc = c1 - c0, dr = r1 - r0, s = Math.sign(dc);
  if (5 * dr < Math.abs(dc) * CW * 2) {
    for (let c = c0 + s; c !== c1; c += s) put(c, Math.round(r0 + (dr * (c - c0)) / dc), "-");
    return;
  }
  const ch = 3 * Math.abs(dc) <= dr ? "|" : s > 0 ? "\\" : "/";
  const at = (r: number) => Math.round(c0 + (dc * (r - r0)) / dr);
  for (let r = r0; r < r1; r++) {
    if (r > r0) put(at(r), r, ch);
    for (let c = at(r) + s; (at(r + 1) - c) * s > 0; c += s) put(c, r, "_");
  }
}

// Is (c, r) inside the convex quad q, by more than m cells?
function inside(q: [number, number][], c: number, r: number, m: number) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % 4];
    const ex = (x1 - x0) * CW, ey = y1 - y0;
    const d = ((c - x0) * CW * ey - (r - y0) * ex) / Math.hypot(ex, ey);
    if (Math.abs(d) < m) return false;
    if (sign && Math.sign(d) !== sign) return false;
    sign = Math.sign(d);
  }
  return true;
}

export default function cube(): Frame {
  const { cols, rows } = meta;
  const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (6 * u - 15) + 10));
  const grid: string[][] = Array.from({ length: rows }, () => new Array(cols));

  return (t, { paper = false } = {}) => {
    const n = Math.floor(t / (TURN + HOLD));
    const yaw = REST + (Math.PI / 2) * (n + ease((t - n * (TURN + HOLD)) / TURN));
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    const turn = ([x, y, z]: number[]) => {
      const z1 = z * cy - x * sy;
      return [x * cy + z * sy, y * cp - z1 * sp, y * sp + z1 * cp];
    };
    const P = V.map((v): [number, number] => {
      const [x, y] = turn(v);
      return [Math.round(cols / 2 - 0.5 + (x * S) / CW), Math.round(rows / 2 - 0.5 - y * S)];
    });
    for (const row of grid) row.fill(" ");
    const put = (c: number, r: number, ch: string) => r >= 0 && r < rows && c >= 0 && c < cols && (grid[r][c] = ch);

    // A face shows when it turns toward the eye by more than a sliver; an edge
    // shows when either of its faces does.
    const shown = F.map(([k, s]) => turn([0, 1, 2].map((j) => (j === k ? s : 0))));
    const seen = E.map(([a, b]) => F.some(([, , q], f) => shown[f][2] < -0.12 && q.includes(a) && q.includes(b)));
    E.forEach(([a, b], i) => seen[i] && line(P[a], P[b], put));
    E.forEach(([a, b], i) => seen[i] && (put(...P[a], "+"), put(...P[b], "+")));

    // Every face in view takes a tone by the light it catches, ink meaning
    // light on a screen and shadow on paper.
    F.forEach(([, , q], f) => {
      if (shown[f][2] >= -0.12) return;
      const lit = Math.max(0, shown[f][0] * LIGHT[0] + shown[f][1] * LIGHT[1] + shown[f][2] * LIGHT[2]);
      const k = Math.min(2, Math.floor(lit * 3));
      const tone = TONES[paper ? 2 - k : k];
      const quad = q.map((i) => P[i]);
      const ys = quad.map((p) => p[1]), xs = quad.map((p) => p[0]);
      for (let r = Math.min(...ys); r <= Math.max(...ys); r++) {
        for (let c = Math.min(...xs); c <= Math.max(...xs); c++) {
          if (grid[r]?.[c] === " " && inside(quad, c, r, 0.45)) grid[r][c] = tone(c, r);
        }
      }
    });
    return grid.map((row) => row.join("")).join("\n");
  };
}
