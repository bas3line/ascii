/*
 * progress-bar: five progress bar styles stacked. Each fills at its own uneven
 * pace, easing into short stalls the way real jobs do, holds at 100%, restarts.
 */
import type { Frame, Meta } from "../types.ts";

export interface ProgressBarOptions {
  [key: string]: unknown;
  labels: string[];
}

export const meta = {
  name: "progress bar",
  category: "ui",
  note: "five bar styles filling at uneven paces, percent at right",
  cols: 48,
  rows: 11,
  fps: 30,
  options: { labels: ["fetching", "unpacking", "indexing", "building", "linking"] },
} satisfies Meta<ProgressBarOptions>;

const W = 28; // every bar is this many cells, ends included
const EIGHTHS = " ▏▎▍▌▋▊▉";
const HOLD = 1.1; // seconds a full bar stays full
const REST = 0.4; // seconds an empty bar waits before the next run

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each style draws progress p (0 to 1) in exactly W cells.
const STYLES = [
  (p: number) => {
    const n = Math.floor(p * (W - 2));
    return "[" + "=".repeat(n) + (n < W - 2 ? ">" + " ".repeat(W - 3 - n) : "") + "]";
  },
  (p: number) => {
    const e = Math.round(p * (W - 2) * 8);
    const n = e >> 3;
    return "▕" + "█".repeat(n) + (n < W - 2 ? EIGHTHS[e & 7] + " ".repeat(W - 3 - n) : "") + "▏";
  },
  (p: number) => {
    const n = Math.floor(p * (W - 2));
    return "[" + "#".repeat(n) + ".".repeat(W - 2 - n) + "]";
  },
  (p: number) => {
    // Fourteen lamps that light in whole steps.
    const n = Math.floor(p * 14 + 1e-9);
    return ("█ ".repeat(n) + "░ ".repeat(14 - n)).slice(0, W - 1) + " ";
  },
  (p: number) => {
    const h = Math.floor(p * W * 2);
    const n = h >> 1;
    return "━".repeat(n) + (n < W ? (h & 1 ? "╾" : "─") + "─".repeat(W - 1 - n) : "");
  },
];

interface Bar {
  draw: (p: number) => string;
  fill: number;
  phase: number;
  k: number;
  knots: [number, number][] | null;
}

export default function progressBar({ labels = meta.options.labels }: Partial<ProgressBarOptions> = {}): Frame {
  const { cols, rows } = meta;
  const ease = (x: number) => x * x * (3 - 2 * x);
  // Run lengths and where each bar starts, so frame 0 shows them part way.
  const bars = STYLES.map((draw, i): Bar => ({
    draw,
    fill: [4.2, 3.4, 5.6, 3.8, 4.8][i],
    phase: [2.9, 0.7, 4.6, 1.6, 1.9][i],
    k: -1,
    knots: null,
  }));

  // One run: a few legs, each eased in and out, so the bar surges and stalls.
  const knotsFor = (i: number, k: number) => {
    const rand = mulberry32(i * 7919 + k * 104729 + 17);
    const legs = 4 + Math.floor(rand() * 3);
    const dt: number[] = [], dv: number[] = [];
    for (let j = 0; j < legs; j++) {
      dt.push(0.5 + rand());
      dv.push(0.2 + rand());
    }
    const st = dt.reduce((a, b) => a + b), sv = dv.reduce((a, b) => a + b);
    const out: [number, number][] = [[0, 0]];
    let u = 0, v = 0;
    for (let j = 0; j < legs; j++) out.push([(u += dt[j] / st), (v += dv[j] / sv)]);
    out[legs] = [1, 1];
    return out;
  };

  const progress = (bar: Bar, i: number, t: number) => {
    const cycle = bar.fill + HOLD + REST;
    const tt = t + bar.phase;
    const k = Math.floor(tt / cycle);
    const u = tt - k * cycle;
    if (u >= bar.fill + HOLD) return 0;
    if (u >= bar.fill) return 1;
    if (bar.k !== k) {
      bar.k = k;
      bar.knots = knotsFor(i, k);
    }
    const x = u / bar.fill;
    const kn = bar.knots!;
    let j = 1;
    while (kn[j][0] < x) j++;
    const [u0, v0] = kn[j - 1], [u1, v1] = kn[j];
    return v0 + (v1 - v0) * ease((x - u0) / (u1 - u0));
  };

  return (t) => {
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const i = (r - 1) / 2;
      if (r % 2 === 0 || i >= bars.length) {
        lines.push(" ".repeat(cols));
        continue;
      }
      const p = progress(bars[i], i, t);
      const label = String(labels[i] ?? "").slice(0, 9).padEnd(10);
      const pct = (Math.floor(p * 100) + "%").padStart(4);
      lines.push(("  " + label + bars[i].draw(p) + "  " + pct).padEnd(cols));
    }
    return lines.join("\n");
  };
}
