/*
 * uptime-bar: a status page's 60-day uptime bars, one thin bar a day, for up
 * to three services (more are cut). A degraded day is a short bar, a down day flat.
 */
import type { Frame, Meta } from "../types.ts";

export interface UptimeBarOptions {
  [key: string]: unknown;
  services: string[];
}

export const meta = {
  name: "uptime bar",
  category: "data",
  note: "60-day uptime bars for three services, a new day slides in",
  cols: 64,
  rows: 15,
  fps: 8,
  options: { services: ["api", "website", "database"] },
} satisfies Meta<UptimeBarOptions>;

const DAYS = 60;
const MAX = 3; // services shown; the frame has room for three
const STEP = 1.25; // seconds per day
const SLIDE = 0.25; // the end of each step, when the bars sit half a cell along
const START = 2646; // today at t = 0, picked for a good opening 60 days
// Each state as a left-half bar, and as the same bar half a cell to the left.
// A down day is flat on the floor.
const BAR = ["▁", "▖", "▌"];
const MID = ["▁", "▗", "▐"];
const RATES: [number, number][] = [
  [0.03, 0.01],
  [0.045, 0.014],
  [0.025, 0.008],
];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: number, d: number, k: number) => mulberry32(s * 7919 + d * 104729 + k * 15485863)();

export default function uptimeBar({ services = meta.options.services }: Partial<UptimeBarOptions> = {}): Frame {
  const { cols, rows } = meta;
  const names = services.slice(0, MAX).map((n) => String(n).slice(0, 24));
  const left = 2;
  const W = DAYS;

  // 2 up, 1 degraded, 0 down. An outage is often followed by a degraded day.
  const base = (s: number, d: number) => {
    const [deg, down] = RATES[s % RATES.length];
    const r = hash(s, d, 1);
    return r < down ? 0 : r < down + deg ? 1 : 2;
  };
  const state = (s: number, d: number) => {
    const b = base(s, d);
    if (b < 2) return b;
    return base(s, d - 1) < 2 && hash(s, d, 2) < 0.5 ? 1 : 2;
  };
  // Percent of the day the service was up.
  const uptime = (s: number, d: number) => {
    const st = state(s, d);
    if (st === 2) return 100;
    return st === 1 ? 99.9 - hash(s, d, 3) * 0.6 : 96 - hash(s, d, 4) * 9;
  };

  const pad = (l: string, r = "") => (" ".repeat(left) + l + " ".repeat(Math.max(1, W - l.length - r.length)) + r).padEnd(cols);
  // "60 days ago ···· 99.92% uptime ···· today", dotted to the bar's width.
  const footer = (pct: number) => {
    const a = `${DAYS} days ago `, b = " today", mid = " " + pct.toFixed(2) + "% uptime ";
    const gap = W - a.length - b.length - mid.length;
    const l = gap >> 1;
    return pad(a + "·".repeat(l) + mid + "·".repeat(gap - l) + b);
  };
  // Fewer services sit in the middle of the frame.
  const top = 1 + (MAX - names.length) * 2;

  return (t) => {
    const p = (t + 0.5) / STEP;
    const today = START + Math.floor(p);
    const half = p - Math.floor(p) > 1 - SLIDE / STEP;
    const now = names.map((_, s) => state(s, today));
    const worst = Math.min(2, ...now);
    const lines: string[] = [];
    while (lines.length < top) lines.push("");
    lines.push(pad(worst === 2 ? "all systems operational" : worst === 1 ? "degraded performance" : "partial outage"));
    lines.push("");
    names.forEach((name, s) => {
      let sum = 0, bar = "";
      for (let d = today - DAYS + 1; d <= today; d++) sum += uptime(s, d);
      // Mid-slide, each cell holds the next day, drawn in its left neighbour's right half.
      for (let j = 0; j < W; j++) {
        const d = today - DAYS + 1 + j + (half ? 1 : 0);
        bar += (half ? MID : BAR)[state(s, d)];
      }
      const word = now[s] === 2 ? "operational" : now[s] === 1 ? "degraded" : "outage";
      lines.push(pad(name, word));
      lines.push(pad(bar));
      lines.push(footer(sum / DAYS));
      lines.push("");
    });
    while (lines.length < rows) lines.push("");
    return lines.slice(0, rows).map((l) => l.padEnd(cols)).join("\n");
  };
}
