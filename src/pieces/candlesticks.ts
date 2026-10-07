/*
 * candlesticks: a price chart of five-minute candles, hollow when the price
 * rose and solid when it fell. The last candle forms live, then the chart steps.
 */
import type { Frame, Meta } from "../types.ts";

export interface CandlesticksOptions {
  [key: string]: unknown;
  start: number;
  seed: number;
}

export const meta = {
  name: "candlesticks",
  category: "data",
  note: "hollow up candles, solid down ones, the last one forming live",
  cols: 70,
  rows: 22,
  fps: 15,
  options: { start: 100, seed: 3 },
} satisfies Meta<CandlesticksOptions>;

const SLOTS = 15; // candles on screen, four columns each
const PERIOD = 1.4; // seconds per candle
const TICKS = 10; // price moves per candle
const TOP = 2, H = 17; // chart rows
const STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function candlesticks({ start = 100, seed = 3 }: Partial<CandlesticksOptions> = {}): Frame {
  const { cols, rows } = meta;
  const K0 = 50; // candles already traded at t = 0
  const vol = start * 0.0017;
  const hash = (k: number) => mulberry32(seed * 7919 + k * 104729)();
  const trend = (k: number) => {
    const u = k / 9, i = Math.floor(u), f = u - i, e = f * f * (3 - 2 * f);
    return (hash(i) * (1 - e) + hash(i + 1) * e - 0.5) * vol * 0.55;
  };
  // Each candle's path of prices, made in order since it opens at the last close.
  const paths: number[][] = [];
  const path = (k: number) => {
    while (paths.length <= k) {
      const n = paths.length;
      const rand = mulberry32(seed * 15485863 + n * 2654435761);
      let p = n ? paths[n - 1][TICKS] : start;
      const out = [p];
      for (let j = 0; j < TICKS; j++) {
        const g = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
        p += g * vol + trend(n) - (p - start) * 0.006;
        out.push(p);
      }
      paths.push(out);
    }
    return paths[k];
  };
  const candle = (k: number, upto = TICKS) => {
    const p = path(k).slice(0, upto + 1);
    return { o: p[0], c: p[upto], h: Math.max(...p), l: Math.min(...p) };
  };
  const fmt = (p: number) => p.toFixed(2);
  const clock = (k: number) => {
    const m = (9 * 60 + 30 + k * 5) % 1440;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  };

  return (t) => {
    const live = K0 + Math.floor(t / PERIOD);
    const ticks = 1 + Math.floor(((t % PERIOD) / PERIOD) * TICKS);
    const cs: ReturnType<typeof candle>[] = [];
    for (let s = 0; s < SLOTS; s++) {
      const k = live - SLOTS + 1 + s;
      cs.push(k === live ? candle(k, ticks) : candle(k));
    }
    // Scale: a round price per row, centred on the finished candles.
    const done = cs.slice(0, -1);
    const hi = Math.max(...cs.map((c) => c.h)), lo = Math.min(...cs.map((c) => c.l));
    const step = STEPS.find((s) => (hi - lo) / s <= H - 2) ?? 100;
    const mid = (Math.max(...done.map((c) => c.h)) + Math.min(...done.map((c) => c.l))) / 2;
    let top = Math.round(mid / step + (H - 1) / 2) * step;
    top = Math.min(Math.max(top, Math.ceil(hi / step) * step), Math.floor(lo / step) * step + (H - 1) * step);
    const row = (p: number) => TOP + Math.round((top - p) / step);

    const g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    const put = (r: number, c: number, s: string) => {
      for (let i = 0; i < s.length; i++) if (r >= 0 && r < rows && c + i >= 0 && c + i < cols) g[r][c + i] = s[i];
    };
    // Labels at the first round interval at least three rows apart.
    const axis = SLOTS * 4 + 1;
    const every = STEPS.find((s) => s >= step * 3 - 1e-9 && Math.abs(s / step - Math.round(s / step)) < 1e-6) ?? step * 4;
    for (let r = TOP; r < TOP + H; r++) {
      const p = top - (r - TOP) * step;
      const major = Math.abs(p / every - Math.round(p / every)) < 1e-6;
      put(r, axis, major ? "┤ " + fmt(p) : "│");
    }
    // The last price as a dotted line out to the axis.
    const last = cs[SLOTS - 1];
    const lr = row(last.c);
    for (let c = SLOTS * 4 - 1; c < axis; c++) put(lr, c, "┄");
    put(lr, axis, "├ " + fmt(last.c));

    cs.forEach((c, s) => {
      const x = s * 4, up = c.c >= c.o;
      const rh = row(c.h), rl = row(c.l), rt = row(Math.max(c.o, c.c)), rb = row(Math.min(c.o, c.c));
      for (let r = rh; r <= rl; r++) put(r, x + 1, "│");
      if (!up) {
        for (let r = rt; r <= rb; r++) put(r, x, "███");
      } else if (rt === rb) {
        put(rt, x, "├" + (rh < rt ? (rl > rb ? "┼" : "┴") : rl > rb ? "┬" : "─") + "┤");
      } else {
        put(rt, x, "┌" + (rh < rt ? "┴" : "─") + "┐");
        for (let r = rt + 1; r < rb; r++) put(r, x, "│ │");
        put(rb, x, "└" + (rl > rb ? "┬" : "─") + "┘");
      }
    });

    // Time along the bottom, every fourth candle.
    const base = TOP + H;
    put(base, 0, "─".repeat(axis));
    put(base, axis, "┘");
    for (let s = 0; s < SLOTS; s++) {
      const k = live - SLOTS + 1 + s;
      if (k % 4) continue;
      put(base, s * 4 + 1, "┴");
      if (s) put(base + 1, s * 4 - 1, clock(k));
    }
    const chg = ((last.c - last.o) / last.o) * 100;
    put(0, 0, `o ${fmt(last.o)}   h ${fmt(last.h)}   l ${fmt(last.l)}   c ${fmt(last.c)}   ${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`);
    return g.map((l) => l.join("")).join("\n");
  };
}
