/*
 * newtons-cradle: five chrome balls, each hung on a V of two strings from an
 * A-frame. An end ball swings in and knocks; the far ball swings out and back.
 */
import type { Frame, Meta } from "../types.ts";

export interface NewtonsCradleOptions {
  [key: string]: unknown;
  lifted: number;
}

export const meta = {
  name: "newton's cradle",
  category: "physics",
  note: "five steel balls on strings passing one knock back and forth",
  cols: 74,
  rows: 17,
  fps: 30,
  options: { lifted: 1 },
} satisfies Meta<NewtonsCradleOptions>;

const RAMP = " .:-=+*#%@";
const N = 5;
const R = 2; // ball radius, in rows; a column is half a row
const L = 11; // pivot to ball centre
const TOP = 2; // the pivots sit on this row line
const AMP = (24 * Math.PI) / 180;
const PERIOD = 1.5; // seconds for one end to swing out and back
const KNOCK = 0.07; // seconds the knock takes to pass through the row
const SPAN = 3; // columns from a ball's pivot to each of its two string anchors

export default function newtonsCradle({ lifted = 1 }: Partial<NewtonsCradleOptions> = {}): Frame {
  const { cols, rows } = meta;
  const k = Math.max(1, Math.min(N - 1, Math.round(lifted)));
  const cx = cols / 2;
  const pivots = Array.from({ length: N }, (_, i) => cx + (i - (N - 1) / 2) * 4 * R);
  const BASE = TOP + L + R + 1; // the row the base sits on
  const RAIL = 26; // the top rail runs this many columns either side of centre
  const LEG = RAIL + 0.5 + 0.5 * (BASE - TOP + 0.5); // the legs step out half a column a row
  // The light is placed so a resting ball's highlight falls in one cell.
  const m = Math.hypot(-0.67, 0.45, 0.59);
  const LX = -0.67 / m, LY = 0.45 / m, LZ = 0.59 / m;
  const out: string[] = new Array(cols * rows);
  const put = (c: number, r: number, g: string) => {
    c = Math.floor(c), r = Math.floor(r);
    if (c >= 0 && c < cols && r >= 0 && r < rows) out[r * cols + c] = g;
  };

  // The swing of the left group (negative) and right group (positive), and the knock passing through the middle.
  const pose = (t: number): [number, number, number] => {
    const cyc = PERIOD + 2 * KNOCK, p = ((t % cyc) + cyc) % cyc, w = (2 * Math.PI) / PERIOD, q = PERIOD / 4;
    if (p < q) return [-AMP * Math.cos(w * p), 0, 0];
    if (p < q + KNOCK) return [0, 0, Math.sin((Math.PI * (p - q)) / KNOCK)];
    if (p < 3 * q + KNOCK) return [0, AMP * Math.sin(w * (p - q - KNOCK)), 0];
    if (p < 3 * q + 2 * KNOCK) return [0, 0, -Math.sin((Math.PI * (p - 3 * q - KNOCK)) / KNOCK)];
    return [-AMP * Math.sin(w * (p - 3 * q - 2 * KNOCK)), 0, 0];
  };

  // A line one glyph a row, or one a column where it runs flatter than a glyph.
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const s = (x1 - x0) / (y1 - y0);
    const g = Math.abs(s) < 0.2 ? "|" : s > 0 ? "\\" : "/";
    if (Math.abs(s) <= 1) {
      for (let r = Math.floor(y0); r + 0.5 < y1; r++) if (r + 0.5 >= y0) put(x0 + s * (r + 0.5 - y0), r, g);
    } else {
      const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
      for (let c = Math.floor(a); c + 0.5 < b; c++) if (c + 0.5 >= a) put(c, y0 + (c + 0.5 - x0) / s, g);
    }
  };

  // How bright chrome is at a normal: the sky above, a dark horizon band, the base below, and a hard highlight.
  const chrome = (nx: number, ny: number, nz: number) => {
    const ry = 2 * nz * ny; // where the view reflects to, up or down
    const env = ry > 0.15 ? 0.3 + 0.25 * ry : ry > -0.5 ? 0.03 : 0.5 - 0.2 * (ry + 0.5);
    const spec = Math.max(0, 2 * nz * (nx * LX + ny * LY + nz * LZ) - LZ) ** 10;
    return Math.min(1, env + 0.12 * Math.max(0, nx * LX + ny * LY + nz * LZ) + 3.5 * spec);
  };

  // A ball sampled 4x4 per cell, so it moves smoothly between cells and keeps a round rim.
  const ball = (bx: number, by: number, paper: boolean) => {
    const runs: [number, number, string][][] = [];
    for (let r = Math.floor(by - R); r < by + R; r++) {
      const run: [number, number, string][] = [];
      runs.push(run);
      for (let c = Math.floor(bx - 2 * R); c < bx + 2 * R; c++) {
        let hit = 0, v = 0, cy = 0;
        for (let j = 0; j < 4; j++) {
          for (let i = 0; i < 4; i++) {
            const nx = (c + 0.125 + i * 0.25 - bx) / 2 / R, ny = -(r + 0.125 + j * 0.25 - by) / R;
            const q = nx * nx + ny * ny;
            if (q >= 1) continue;
            v += chrome(nx, ny, Math.sqrt(1 - q));
            hit++;
            cy += j;
          }
        }
        if (hit < 4) continue;
        if (hit < 6) {
          run.push([c, r, cy / hit < 1.5 ? "'" : cy / hit > 2 ? "." : "-"]);
          continue;
        }
        const g = Math.max(1, Math.round((v / hit) * (RAMP.length - 1)));
        run.push([c, r, RAMP[paper ? RAMP.length - g : g]]);
      }
    }
    // A sliver of rim on the very top or bottom, under a full row, reads as a nub: leave it off.
    const n = runs.length;
    if (runs[0].length < 3 && runs[1].length > 5) runs[0].length = 0;
    if (runs[n - 1].length < 3 && runs[n - 2].length > 5) runs[n - 1].length = 0;
    for (const run of runs) for (const [c, r, g] of run) put(c, r, g);
  };

  return (t, { paper = false } = {}) => {
    out.fill(" ");
    const [left, right, knock] = pose(t);
    // The frame: a twin rail across the top on legs that splay out to a base.
    for (let c = cx - RAIL; c < cx + RAIL; c++) put(c, TOP - 1, "═");
    line(cx - RAIL - 0.5, TOP - 0.5, cx - LEG, BASE);
    line(cx + RAIL + 0.5, TOP - 0.5, cx + LEG, BASE);
    const b0 = Math.floor(cx - LEG) - 1, b1 = Math.ceil(cx + LEG);
    for (let c = b0; c <= b1; c++) put(c, BASE, c === b0 ? "▝" : c === b1 ? "▘" : "▀");
    for (let n = 0; n < N; n++) {
      // Only one end swings at a time, so a ball in both end groups (four lifted) takes whichever is moving.
      const th = (n < k ? left : 0) + (n >= N - k ? right : 0);
      // A knock nudges the row a fraction of a column toward the ball about to leave, which waits for it.
      const push = (knock > 0 && n < N - k) || (knock < 0 && n >= k) ? 0.5 * knock : 0;
      const sx = Math.sin(th), sy = Math.cos(th);
      const bx = pivots[n] + push + 2 * L * sx, by = TOP + L * sy;
      // Each string ties on just off the top of the ball.
      const ax = pivots[n] + push + 2 * (L - R) * sx, ay = TOP + (L - R) * sy;
      line(pivots[n] - SPAN, TOP, ax - 0.5 * sy, ay + 0.25 * sx);
      line(pivots[n] + SPAN, TOP, ax + 0.5 * sy, ay - 0.25 * sx);
      ball(bx, by, paper);
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
