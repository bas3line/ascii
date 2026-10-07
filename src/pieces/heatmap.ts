/*
 * heatmap: a contribution calendar, weeks across and weekdays down, shaded by
 * how busy each day was. Days fill in one at a time; a full week moves it left.
 */
import type { Frame, Meta } from "../types.ts";

export interface HeatmapOptions {
  [key: string]: unknown;
  unit: string;
  seed: number;
}

export const meta = {
  name: "heatmap",
  category: "data",
  note: "contribution calendar, a day at a time, weeks scrolling left",
  cols: 66,
  rows: 12,
  fps: 10,
  options: { unit: "contributions", seed: 7 },
} satisfies Meta<HeatmapOptions>;

const WEEKS = 30;
const STEP = 0.5; // seconds per day
const START = 20150; // today at t = 0, as days since 1970-01-01
const LEVELS = "·░▒▓█";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["mon", "", "wed", "", "fri", "", ""];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Month (0 to 11) of a day counted from 1970-01-01, after Howard Hinnant.
function monthOf(z: number) {
  const doe = (((z + 719468) % 146097) + 146097) % 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  return (mp + 2) % 12;
}

export default function heatmap({ unit = meta.options.unit, seed = meta.options.seed }: Partial<HeatmapOptions> = {}): Frame {
  const { cols, rows } = meta;
  const left = 6; // weekday labels
  const hash = (d: number, k: number) => mulberry32(seed * 7919 + d * 104729 + k * 15485863)();
  // Busy and quiet stretches: value noise over weeks, eased between knots.
  const busy = (d: number) => {
    const w = d / 7 / 3;
    const i = Math.floor(w), f = w - i, e = f * f * (3 - 2 * f);
    return hash(i, 9) * (1 - e) + hash(i + 1, 9) * e;
  };
  const count = (d: number) => {
    const weekend = (d + 3) % 7 >= 5;
    const a = (0.08 + 1.05 * busy(d) ** 1.4) * (weekend ? 0.3 : 1);
    if (hash(d, 1) > a + 0.08) return 0;
    return Math.max(1, Math.round(a * (3 + 14 * hash(d, 2))));
  };
  const level = (n: number) => (n === 0 ? 0 : n < 4 ? 1 : n < 8 ? 2 : n < 12 ? 3 : 4);

  return (t) => {
    const today = START + Math.floor(t / STEP);
    const monday = today - ((today + 3) % 7);
    const first = monday - (WEEKS - 1) * 7;
    const grid = Array.from({ length: 7 }, (_, r) => (DAYS[r].padEnd(left - 2) + "  ").split(""));
    let total = 0;
    for (let w = 0; w < WEEKS; w++) {
      for (let r = 0; r < 7; r++) {
        const d = first + w * 7 + r;
        let ch = " ";
        if (d <= today) {
          const n = count(d);
          total += n;
          ch = LEVELS[level(n)];
        }
        grid[r].push(ch, " ");
      }
    }
    // A month's name sits over the first week that starts in it.
    const head: string[] = new Array(cols).fill(" ");
    let free = 0;
    for (let w = 0; w < WEEKS; w++) {
      const m = monthOf(first + w * 7);
      if (w > 0 && m === monthOf(first + (w - 1) * 7)) continue;
      const x = left + w * 2;
      if (x < free || x + 3 > cols) continue;
      if (w === 0 && monthOf(first + 14) !== m) continue;
      for (let k = 0; k < 3; k++) head[x + k] = MONTHS[m][k];
      free = x + 5;
    }
    const lines = ["", head.join("")];
    for (let r = 0; r < 7; r++) lines.push(grid[r].join(""));
    lines.push("");
    const sum = String(total).replace(/\B(?=(\d{3})+$)/g, ",") + " " + unit + " in the last " + WEEKS + " weeks";
    const key = "less " + [...LEVELS].join(" ") + " more";
    lines.push(" ".repeat(left) + sum.padEnd(cols - left - key.length - 1) + key);
    lines.push("");
    return lines.map((l) => l.slice(0, cols).padEnd(cols)).join("\n");
  };
}
