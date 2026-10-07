/*
 * bar-chart: a vertical bar chart with a value axis, gridlines and category
 * labels. The bars ease from one dataset to the next with their values on top.
 */
import type { Frame, Meta } from "../types.ts";

export interface BarChartDataset {
  name: string;
  values: number[];
}

export interface BarChartOptions {
  [key: string]: unknown;
  title: string;
  labels: string[];
  datasets: BarChartDataset[];
}

export const meta = {
  name: "bar chart",
  category: "data",
  note: "bars easing between three datasets, values riding on top",
  cols: 60,
  rows: 19,
  fps: 24,
  options: {
    title: "visits by day",
    labels: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    datasets: [
      { name: "week 1", values: [320, 410, 380, 460, 540, 240, 180] },
      { name: "week 2", values: [210, 480, 300, 560, 390, 340, 150] },
      { name: "week 3", values: [450, 290, 520, 380, 580, 160, 270] },
    ],
  },
} satisfies Meta<BarChartOptions>;

const EIGHTHS = "▁▂▃▄▅▆▇";
const PH = 12; // plot height in rows
const BW = 4; // bar width
const HOLD = 1.4, MOVE = 1.0; // seconds each dataset rests, then moves
const START = 0.8; // where in the first rest play time begins

// The smallest round step that splits the range into at most four bands.
function niceStep(max: number): number {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= raw) return m * mag;
  return 10 * mag;
}

export default function barChart({
  title = meta.options.title,
  labels = meta.options.labels,
  datasets = meta.options.datasets,
}: Partial<BarChartOptions> = {}): Frame {
  const { cols, rows } = meta;
  const n = labels.length;
  const peak = Math.max(1, ...datasets.flatMap((d) => d.values));
  const step = niceStep(peak);
  const top = Math.ceil(peak / step) * step;
  const ticks = top / step;
  const tickLabels = Array.from({ length: ticks + 1 }, (_, i) => String(i * step));
  const LW = Math.max(...tickLabels.map((s) => s.length));

  // Layout: tick labels, the axis, then the bars with a gap's width either side.
  const gap = Math.max(1, Math.min(3, Math.floor((cols - 4 - LW - n * BW) / (n + 1))));
  const PW = n * BW + (n + 1) * gap;
  const X0 = Math.floor((cols - (LW + 1 + PW)) / 2), AX = X0 + LW;
  const bx = Array.from({ length: n }, (_, i) => AX + 1 + gap + i * (BW + gap));
  const AY = 4 + PH; // the axis row, which is the zero line
  const gridRows: number[] = [];

  const base = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => c + i < cols && (base[r][c + i] = ch));
  put(1, X0, String(title));
  for (let r = 4; r < AY; r++) base[r][AX] = "│";
  tickLabels.forEach((s, i) => {
    const r = AY - Math.round((i * PH) / ticks);
    put(r, AX - 1 - s.length, s);
    if (i === 0) return;
    base[r][AX] = "┤";
    gridRows.push(r);
  });
  base[AY][AX] = "└";
  for (let c = AX + 1; c <= AX + PW; c++) base[AY][c] = "─";
  labels.forEach((s, i) => put(AY + 1, bx[i] + Math.floor((BW - String(s).length) / 2), String(s).slice(0, BW + gap)));

  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const grid = base.map((row) => row.slice());

  return (t) => {
    const cycle = HOLD + MOVE;
    const tt = t + START;
    const k = Math.floor(tt / cycle);
    const u = Math.max(0, (tt - k * cycle - HOLD) / MOVE);
    const a = datasets[k % datasets.length], b = datasets[(k + 1) % datasets.length];
    const e = ease(u);
    const live = e < 0.5 ? k % datasets.length : (k + 1) % datasets.length;

    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = base[r][c];

    // The dataset names as tabs, the live one in brackets.
    const tabs = datasets.map((d, i) => (i === live ? "[" + d.name + "]" : " " + d.name + " ")).join(" ");
    [...tabs].forEach((ch, i) => (grid[1][AX + PW + 1 - tabs.length + i] = ch));

    const tops: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const v = (a.values[i] ?? 0) * (1 - e) + (b.values[i] ?? 0) * e;
      const h = Math.round((v / top) * PH * 8);
      const full = h >> 3, part = h & 7;
      for (let r = 0; r < full; r++) for (let c = 0; c < BW; c++) grid[AY - 1 - r][bx[i] + c] = "█";
      if (part) for (let c = 0; c < BW; c++) grid[AY - 1 - full][bx[i] + c] = EIGHTHS[part - 1];
      tops.push([v, AY - 1 - full - (part ? 1 : 0)]);
    }
    // Dashed gridlines behind the bars, kept a cell clear of each bar and value.
    for (const r of gridRows)
      for (let c = AX + 1; c <= AX + PW; c++) {
        const near = bx.some((x, i) => c >= x - 1 && c <= x + BW && r >= tops[i][1]);
        if (!near) grid[r][c] = "┈";
      }
    tops.forEach(([v, lr], i) => {
      const label = String(Math.round(v));
      [...label].forEach((ch, j) => (grid[lr][bx[i] + Math.floor((BW - label.length) / 2) + j] = ch));
    });
    return grid.map((row) => row.join("")).join("\n");
  };
}
