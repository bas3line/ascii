/*
 * harmonograph: a pen on two pendulums, one swinging across and one up and
 * down, both slowly running down, so the figure winds in on itself to a dense
 * centre. While the next figure starts, the last is lifted from the outside in.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "harmonograph",
  category: "physics",
  note: "a pen on two decaying pendulums winding a figure inward",
  cols: 64,
  rows: 28,
  fps: 30,
} satisfies Meta;

const W = 0.6, H = 1.2; // a cell in em
const STEP = 0.0015; // pendulum time per sample, too short to skip a cell
const NEAR = 0.25; // pendulum time within which the pen coming back to a cell is the same stroke
/*
 * Swings across and up and down: frequency and phase each, how much faster the
 * up and down swing runs down, how many passes, and how far in it winds.
 */
const FIGURES = [
  { fx: 1, px: Math.PI / 2, fy: 1.02, py: 0, lean: 1.15, passes: 9, end: 0.12 },
  { fx: 2.006, px: 0, fy: 1, py: 0, lean: 1, passes: 6, end: 0.15 },
  { fx: 1, px: Math.PI / 4, fy: 0.985, py: 0, lean: 0.9, passes: 8, end: 0.15 },
];
const [DRAW, SHOW, LIFT] = [10, 2.5, 3]; // seconds; the lift runs under the next figure's start
const PERIOD = DRAW + SHOW;
const START = 6; // the first figure, a little over half drawn

interface Stroke {
  c: number;
  t0: number;
  t1: number;
  ex: number;
  ey: number;
  lx: number;
  ly: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sum: number;
  n: number;
  len: number;
  g?: string;
}

/*
 * The mark for one stroke through a cell, from where it came in and left and
 * how far it reached each way, all in cells. A stroke that turns back across
 * is a bracket, one that turns back up or down a flat mark at its height.
 */
function glyph(s: Stroke): string {
  const m = 0.06;
  const right = s.x1 - Math.max(s.ex, s.lx) > m, left = Math.min(s.ex, s.lx) - s.x0 > m;
  const turnY = s.y1 - Math.max(s.ey, s.ly) > m || Math.min(s.ey, s.ly) - s.y0 > m;
  const span = s.y1 - s.y0, mid = s.sum / s.n;
  const flat = mid < 0.3 ? "'" : mid < 0.6 ? "-" : mid < 0.82 ? "." : "_";
  if ((right || left) && !(right && left) && span * H > 0.25 * (s.x1 - s.x0) * W) return right ? ")" : "(";
  if (turnY) return flat;
  const dx = (s.lx - s.ex) * W, dy = (s.ly - s.ey) * H;
  // A steep line is drawn once a row, in the cell where it crosses the row's middle.
  if (Math.abs(dx) < 0.35 * Math.abs(dy)) return s.y0 < 0.5 && s.y1 >= 0.5 ? "|" : "";
  if (span < 0.45) return flat;
  return dx * dy > 0 ? "\\" : "/";
}

// One figure, as every stroke the pen lays, in order: the cell, when, and its mark.
function sheet(f: (typeof FIGURES)[number], cols: number, rows: number) {
  const end = 2 * Math.PI * f.passes;
  const n = Math.floor(end / STEP) + 1;
  const xs = new Float64Array(n), ys = new Float64Array(n);
  let [x0, x1, y0, y1] = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const t = i * STEP;
    // Friction at the pivots takes the same off each swing, so the passes come in evenly.
    const a = 1 - ((1 - f.end) * t) / end;
    xs[i] = a * Math.sin(f.fx * t + f.px);
    ys[i] = -(a ** f.lean) * Math.sin(f.fy * t + f.py);
    [x0, x1, y0, y1] = [Math.min(x0, xs[i]), Math.max(x1, xs[i]), Math.min(y0, ys[i]), Math.max(y1, ys[i])];
  }
  // Centred in the frame, four fifths of it across and down.
  const sx = (0.8 * cols - 1) / (x1 - x0), sy = (0.8 * rows - 0.6) / (y1 - y0);
  for (let i = 0; i < n; i++) (xs[i] = cols / 2 + (xs[i] - (x0 + x1) / 2) * sx), (ys[i] = rows / 2 + (ys[i] - (y0 + y1) / 2) * sy);

  const strokes: Stroke[] = [];
  const open = new Int32Array(cols * rows).fill(-1);
  let px = xs[0], py = ys[0];
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i], t = i * STEP;
    const c = Math.floor(y) * cols + Math.floor(x);
    const lx = x - Math.floor(x), ly = y - Math.floor(y);
    let s = open[c] >= 0 ? strokes[open[c]] : null;
    if (!s || t - s.t1 > NEAR) {
      s = { c, t0: t, t1: t, ex: lx, ey: ly, lx, ly, x0: lx, x1: lx, y0: ly, y1: ly, sum: 0, n: 0, len: 0 };
      open[c] = strokes.push(s) - 1;
    }
    s.len += Math.hypot((x - px) * W, (y - py) * H);
    [s.t1, s.lx, s.ly, s.sum, s.n] = [t, lx, ly, s.sum + ly, s.n + 1];
    [s.x0, s.x1, s.y0, s.y1] = [Math.min(s.x0, lx), Math.max(s.x1, lx), Math.min(s.y0, ly), Math.max(s.y1, ly)];
    (px = x), (py = y);
  }
  // A corner the pen only clipped is left blank.
  const keep = strokes.filter((s) => s.len > 0.12 && (s.g = glyph(s)));
  const ink: string[] = new Array(cols * rows).fill(" ");
  const when = new Float64Array(cols * rows).fill(-1);
  keep.forEach((s) => ((ink[s.c] = s.g!), (when[s.c] = s.t0)));
  return { end, xs, ys, cells: keep.map((s) => s.c), times: keep.map((s) => s.t0), marks: keep.map((s) => s.g!), ink, when };
}

export default function harmonograph(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols * rows);
  const sheets = FIGURES.map((f) => sheet(f, cols, rows));

  return (t) => {
    const tt = START + t;
    const idx = Math.floor(tt / PERIOD);
    const local = tt - idx * PERIOD;
    const s = sheets[idx % sheets.length];
    out.fill(" ");
    if (local < LIFT) {
      // The last figure, lifted in the order it went down, outer swings first.
      const old = sheets[(idx + sheets.length - 1) % sheets.length];
      const u = (local / LIFT) * old.end;
      for (let c = 0; c < cols * rows; c++) if (old.when[c] > u) out[c] = old.ink[c];
    }
    const tau = (Math.min(local, DRAW) / DRAW) * s.end;
    for (let i = 0; i < s.cells.length && s.times[i] <= tau; i++) out[s.cells[i]] = s.marks[i];
    if (local < DRAW) {
      const j = Math.min(s.xs.length - 1, Math.floor(tau / STEP));
      out[Math.floor(s.ys[j]) * cols + Math.floor(s.xs[j])] = "o";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
