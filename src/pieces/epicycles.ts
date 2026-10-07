/*
 * epicycles: a five-pointed star as a Fourier series. Each circle turns at a
 * whole multiple of the first while riding the rim of the one before, and
 * the tip of the chain traces the star.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "epicycles",
  category: "generative",
  note: "a chain of turning circles whose tip traces a star",
  cols: 60,
  rows: 24,
  fps: 30,
} satisfies Meta;

const TERMS = 16; // circles in the chain: every term a five-fold star has up to k = 39
const PERIOD = 10; // seconds to trace the figure once
const TRAIL = 0.9; // share of the figure kept behind the tip
const FADE = 0.8; // past this share of the trail it fades
const SAMPLES = 2400; // points along one trace when it is laid into cells
const ASPECT = 0.5; // a cell is about twice as tall as it is wide
const RIMS = [1]; // only these circles, counted from the largest, show their rims
const JOINT = 1.5; // arms shorter than this, in columns, are not drawn apart
const PHASE = 0.12; // where on the figure the tip is at t = 0: along the left arm

// The star's outline, sampled evenly by length, as [x, y] with y up.
function star(n: number): [number, number][] {
  const v: [number, number][] = [];
  for (let j = 0; j < 10; j++) {
    const a = Math.PI / 2 + (j * Math.PI) / 5;
    const r = j % 2 ? 0.4 : 1;
    v.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const d = (i / n) * 10;
    const j = Math.floor(d), f = d - j;
    const [a, b] = [v[j], v[(j + 1) % 10]];
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return pts;
}

// The heading of a stroke picks its glyph, with rows counted double. Shallow
// strokes sit high, middle or low in the cell, wherever the line crosses it.
function pen(dx: number, dy: number, f = 0.5): string {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a < 0) a += 180;
  const flat = Math.min(a, 180 - a);
  if (flat < 8) return f < 0.62 ? "-" : "_";
  if (flat < 42) return f < 0.3 ? "'" : f < 0.68 ? "-" : "_";
  return a < 80 ? "/" : a < 100 ? "|" : "\\";
}

export default function epicycles(): Frame {
  const { cols, rows } = meta;
  const pts = star(500);
  const N = pts.length;
  // Discrete Fourier transform: every term is a circle of radius |c| turning
  // k times per trace. Keep the biggest, largest first.
  const terms: { k: number; re: number; im: number; r: number }[] = [];
  for (let k = -40; k <= 40; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const a = (-2 * Math.PI * k * n) / N;
      const [x, y] = pts[n];
      re += x * Math.cos(a) - y * Math.sin(a);
      im += x * Math.sin(a) + y * Math.cos(a);
    }
    terms.push({ k, re: re / N, im: im / N, r: Math.hypot(re, im) / N });
  }
  terms.sort((a, b) => b.r - a.r);
  const chain = terms.slice(0, TERMS);
  const sum = (theta: number, upto: number): [number, number] => {
    let x = 0, y = 0;
    for (let j = 0; j < upto; j++) {
      const { k, re, im } = chain[j];
      const c = Math.cos(k * theta), s = Math.sin(k * theta);
      x += re * c - im * s;
      y += re * s + im * c;
    }
    return [x, y];
  };

  // Fit the traced figure to the frame.
  const path: [number, number][] = [];
  let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
  for (let i = 0; i < SAMPLES; i++) {
    const [x, y] = sum((i / SAMPLES) * 2 * Math.PI, TERMS);
    path.push([x, y]);
    x0 = Math.min(x0, x), x1 = Math.max(x1, x), y0 = Math.min(y0, y), y1 = Math.max(y1, y);
  }
  // The points reach just past a cell's centre line, so each ends in one cell.
  const S = Math.min((cols - 8) / (x1 - x0), (rows - 2.3) / ASPECT / (y1 - y0));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const toCol = (x: number) => cols / 2 + (x - mx) * S;
  const toRow = (y: number) => rows / 2 - (y - my) * S * ASPECT;

  // Lay the trace into cells once. Where it runs shallow it takes the cell
  // it crosses each column's centre in, where steep the cell for each row's
  // centre, so every edge is one cell wide; any gap left is bridged.
  const P = path.map(([x, y]) => [toCol(x), toRow(y)]);
  const cells: { c: number; r: number; i: number; g: string; at?: number }[] = [], figure = new Set<number>();
  const add = (c: number, r: number, i: number, g: string) => {
    const last = cells[cells.length - 1];
    if (last && last.c === c && last.r === r) return;
    for (let p = last; p && Math.max(Math.abs(c - p.c), Math.abs(r - p.r)) > 1; p = cells[cells.length - 1])
      cells.push({ c: p.c + Math.sign(c - p.c), r: p.r + Math.sign(r - p.r), i, g });
    cells.push({ c, r, i, g });
  };
  for (let i = 0; i < SAMPLES; i++) {
    const [ax, ay] = P[i], [bx, by] = P[(i + 1) % SAMPLES];
    const [px, py] = P[(i - 2 + SAMPLES) % SAMPLES], [nx, ny] = P[(i + 3) % SAMPLES];
    const steep = Math.abs(by - ay) > Math.abs(bx - ax);
    const [a, b] = steep ? [ay, by] : [ax, bx];
    for (let k = Math.ceil(Math.min(a, b) - 0.5); k + 0.5 < Math.max(a, b); k++) {
      const s = (k + 0.5 - a) / (b - a), x = ax + (bx - ax) * s, y = ay + (by - ay) * s;
      const g = pen(nx - px, (py - ny) / ASPECT, y - Math.floor(y));
      steep ? add(Math.floor(x), k, i, g) : add(k, Math.floor(y), i, g);
    }
  }
  while (cells.length > 1 && cells[0].c === cells[cells.length - 1].c && cells[0].r === cells[cells.length - 1].r) cells.pop();
  for (const p of cells) figure.add((p.at = p.c + p.r * cols));

  const grid = new Array<string>(cols * rows);
  const put = (c: number, r: number, ch: string) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid[c + r * cols] = ch;
  };
  // The mechanism is dotted, rims and arms alike, and never covers the figure.
  const dot = (x: number, y: number) => {
    const c = Math.floor(x), r = Math.floor(y);
    if (c >= 0 && c < cols && r >= 0 && r < rows && !figure.has(c + r * cols)) grid[c + r * cols] = "·";
  };

  return (t) => {
    grid.fill(" ");
    const u = (t / PERIOD + PHASE) % 1;
    const head = u * SAMPLES;
    const theta = u * 2 * Math.PI;
    const joints = [[toCol(0), toRow(0)]];
    for (let j = 1; j <= TERMS; j++) {
      const [x, y] = sum(theta, j);
      if (j === TERMS || chain[j - 1].r * S > JOINT) joints.push([toCol(x), toRow(y)]);
    }
    // A rim takes one cell a column where it runs flat and one a row where
    // it runs steep, so it stays a single dotted line all the way round.
    for (const j of RIMS) {
      const a = chain[j].r * S, b = a * ASPECT, [pc, pr] = joints[j];
      for (let c = Math.ceil(pc - a - 0.5); c + 0.5 < pc + a; c++) {
        const u = (c + 0.5 - pc) / a, s = Math.sqrt(1 - u * u);
        if ((b / a) * Math.abs(u) <= s) dot(c + 0.5, pr - b * s), dot(c + 0.5, pr + b * s);
      }
      for (let r = Math.ceil(pr - b - 0.5); r + 0.5 < pr + b; r++) {
        const v = (r + 0.5 - pr) / b, s = Math.sqrt(1 - v * v);
        if ((a / b) * Math.abs(v) <= s) dot(pc - a * s, r + 0.5), dot(pc + a * s, r + 0.5);
      }
    }
    for (let j = 0; j + 1 < joints.length; j++) {
      const [ax, ay] = joints[j], [bx, by] = joints[j + 1];
      for (let s = 1, n = Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay))); s < n; s++) dot(ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n);
    }
    // The trace behind the tip, its far end fading through ':' to '.'.
    for (const { at, i, g } of cells) {
      const age = ((head - i + SAMPLES) % SAMPLES) / SAMPLES / TRAIL;
      if (age <= 1) grid[at!] = age < FADE ? g : age < 0.95 ? ":" : ".";
    }
    // The centre, and a pivot at the middle of each circle that shows its rim.
    put(Math.floor(joints[0][0]), Math.floor(joints[0][1]), "+");
    for (const j of RIMS) put(Math.floor(joints[j][0]), Math.floor(joints[j][1]), "o");
    const [tc, tr] = joints[joints.length - 1];
    put(Math.floor(tc), Math.floor(tr), "@");
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
