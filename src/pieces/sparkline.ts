/*
 * sparkline: live metrics as one-row block sparklines, scrolling left as new
 * samples arrive, each with its label, its latest value and the span's range.
 */
import type { Frame, Meta } from "../types.ts";

export interface SparklineSeries {
  label?: string;
  unit?: string;
  lo?: number;
  hi?: number;
  digits?: number;
  format?: (v: number) => unknown;
  values?: ArrayLike<number>;
}

export interface SparklineOptions {
  [key: string]: unknown;
  series: SparklineSeries[];
  range: boolean;
  rate: number;
}

export const meta = {
  name: "sparkline",
  category: "data",
  note: "three live block sparklines scrolling left, values at right",
  cols: 72,
  rows: 9,
  fps: 12,
  // A series with `values` shows the newest of them, read every frame, so
  // pushing to the array moves the line; without, it plays a sample signal.
  // `lo` and `hi` fix the scale (else it fits what is shown), `unit` and
  // `digits` format the value, or pass `format` as a function. Up to five
  // series fit, spaced a row apart when there are three or fewer. Without
  // `range` the min and max columns go and the lines grow longer. `rate` is
  // samples a second, which labels the time axis.
  options: {
    series: [
      { label: "cpu", unit: "%", lo: 0, hi: 100 },
      { label: "memory", unit: " gb", lo: 1.2, hi: 3.4, digits: 1 },
      { label: "requests", unit: "/s", lo: 0, hi: 260 },
    ],
    range: true,
    rate: 4,
  },
} satisfies Meta<SparklineOptions>;

const BARS = "▁▂▃▄▅▆▇█";
const LW = 10, VW = 7, RW = 5; // label, value and min/max widths
const SLOTS = 5; // rows the series share

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SignalState {
  v: number;
  busy: number;
  cap: number;
  n: number;
}

// Sample signals, each 0..1 from its own seeded state, scaled into lo..hi.
const SIGNALS: ((s: SignalState, rand: () => number) => number)[] = [
  // Mostly idle, with bursts of work that come and go.
  (s, rand) => {
    if (s.busy > 0) s.busy--;
    else if (rand() < 0.06) s.busy = 4 + Math.floor(rand() * 9);
    s.v += ((s.busy ? 0.78 : 0.22) - s.v) * 0.55 + (rand() - 0.5) * 0.3;
    return (s.v = Math.max(0.02, Math.min(0.99, s.v)));
  },
  // A heap that fills unevenly and falls back when it is collected.
  (s, rand) => {
    s.v += 0.01 + rand() * 0.035;
    if (s.v > s.cap) {
      s.v = 0.1 + rand() * 0.14;
      s.cap = 0.73 + rand() * 0.22;
    }
    return s.v;
  },
  // A slow swell in traffic with jitter on every sample.
  (s, rand) => {
    const base = 0.48 + 0.27 * Math.sin(s.n++ / 14);
    s.v += (base - s.v) * 0.7 + (rand() + rand() - 1) * 0.23;
    return (s.v = Math.max(0.015, Math.min(1, s.v)));
  },
];

export default function sparkline({
  series = meta.options.series,
  range = meta.options.range,
  rate = meta.options.rate,
}: Partial<SparklineOptions> = {}): Frame {
  const { cols, rows } = meta;
  rate = Math.max(0.05, +rate || meta.options.rate);
  const x0 = 2 + LW;
  const W = cols - x0 - 2 - VW - (range ? 2 + RW + 1 + RW : 0) - 2; // samples on screen
  series = (series || []).slice(0, SLOTS);
  // The header, the series and the time axis sit centred as one block.
  const gap = series.length <= 3 ? 2 : 1;
  const span = (Math.max(1, series.length) - 1) * gap + 1;
  const top = Math.floor((rows - span - 2) / 2) + 1; // the first series row
  const blank = " ".repeat(cols);
  const fit = (s: string) => s.slice(0, cols).padEnd(cols);
  const header = range ? fit(" ".repeat(x0 + W + 2 + VW + 2) + "min".padStart(RW) + " " + "max".padStart(RW)) : blank;
  const axis = fit(" ".repeat(x0) + (Math.round(W / rate) + "s ago").padEnd(W - 2) + "now");

  const fmt = (s: SparklineSeries, v: number, unit: boolean) =>
    typeof s.format === "function" ? String(s.format(v)) : v.toFixed(s.digits ?? 0) + (unit ? s.unit ?? "" : "");

  // A ring of the last W samples per signal; play time decides how many exist.
  let made: number, rings: Float32Array[], states: SignalState[], rands: (() => number)[];
  const reset = () => {
    made = 0;
    rings = series.map(() => new Float32Array(W));
    rands = series.map((_, i) => mulberry32(911 + i * 7919));
    states = series.map(() => ({ v: 0.4, busy: 0, cap: 0.82, n: 0 }));
  };
  const fill = (need: number) => {
    if (need < made) reset();
    for (; made < need; made++)
      series.forEach((s, i) => {
        if (!s.values) rings[i][made % W] = SIGNALS[i % SIGNALS.length](states[i], rands[i]);
      });
  };
  reset();
  const win = new Array<number>(W);

  return (t) => {
    fill(W * 2 + Math.floor(t * rate));
    const lines = new Array<string>(rows).fill(blank);
    lines[top - 1] = header;
    lines[top + span] = axis;
    series.forEach((s, i) => {
      // What is on screen, oldest first, in the series' own units.
      let n = 0;
      if (s.values) {
        const v = s.values;
        for (let j = Math.max(0, v.length - W); j < v.length; j++) win[n++] = +v[j];
      } else {
        const lo = s.lo ?? 0, hi = s.hi ?? 100;
        for (let j = 0; j < W; j++) win[n++] = lo + rings[i][(made + j) % W] * (hi - lo);
      }
      let min = Infinity, max = -Infinity;
      for (let j = 0; j < n; j++) if (Number.isFinite(win[j])) (min = Math.min(min, win[j])), (max = Math.max(max, win[j]));
      const lo = s.lo ?? min, hi = s.hi ?? (max > lo ? max : lo + 1);
      const d = hi - lo || 1;

      let bars = " ".repeat(W - n);
      for (let j = 0; j < n; j++) {
        if (!Number.isFinite(win[j])) bars += " ";
        else bars += BARS[Math.max(0, Math.min(7, Math.round(((win[j] - lo) / d) * 7)))];
      }
      const last = win[n - 1];
      const label = String(s.label ?? "").slice(0, LW - 1).padEnd(LW);
      const value = (n && Number.isFinite(last) ? fmt(s, last, true) : "").padStart(VW);
      let line = "  " + label + bars + "▏ " + value;
      if (range && min <= max) line += "  " + fmt(s, min, false).padStart(RW) + " " + fmt(s, max, false).padStart(RW);
      lines[top + i * gap] = fit(line);
    });
    return lines.join("\n");
  };
}
