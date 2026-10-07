/*
 * flag: a striped flag on a pole in a steady wind. Folds run from the pole to the free
 * edge and grow as they go; faces turned to the light are bright, the far sides of folds dark.
 */
import type { Frame, Meta } from "../types.ts";

export interface FlagOptions {
  [key: string]: unknown;
  stripes: number;
}

export const meta = {
  name: "flag",
  category: "physics",
  note: "a striped flag rippling on a pole, folds catching the light",
  cols: 62,
  rows: 21,
  fps: 30,
  options: { stripes: 5 },
} satisfies Meta<FlagOptions>;

const RAMP = " .:-=+*#%@";
const RISE = "▁▂▃▄▅▆▇"; // a top hem part way down a cell
const LOOP = 12; // seconds; every rate below fits a whole number of times
const WAVES = 2.3; // folds along the cloth
const RATE = 17 / LOOP; // folds passing a point each second
const SKEW = 1.4; // radians the folds lag from the top hem to the bottom one, so they run on a slant
const LONG = 29; // the cloth's length, in rows (a column is half a row)
const HIGH = 13; // its height at the pole, in rows
const SWING = 4; // how far the free edge billows toward and away from us, in rows
const STRIPS = 300;

export default function flag({ stripes = 5 }: Partial<FlagOptions> = {}): Frame {
  const { cols, rows } = meta;
  const POLE = 4; // the pole's column
  const TOP = 2.5; // the top hem at the pole, in rows
  const bands = Math.max(2, Math.round(stripes));
  const xs = new Float64Array((STRIPS + 1) * rows); // where each strip crosses each row
  const lit = new Float32Array(cols * rows); // summed brightness of the strips landing in a cell
  const hits = new Uint16Array(cols * rows);
  const odd = new Uint16Array(cols * rows); // how many of them fell in a dark stripe
  const cover = new Float32Array(cols * rows); // how much of the cell's height the cloth covers
  const out: string[] = new Array(cols * rows);

  return (t, { paper = false } = {}) => {
    const gust = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / LOOP);
    const ph = (u: number, v: number) => 2 * Math.PI * (WAVES * u - RATE * t) - SKEW * v;
    // How far the cloth stands out of its plane, and its slope along the length.
    const z = (u: number, v: number) => gust * SWING * u * Math.sin(ph(u, v));
    const dz = (u: number, v: number) => (gust * SWING * (Math.sin(ph(u, v)) + u * 2 * Math.PI * WAVES * Math.cos(ph(u, v)))) / LONG;
    // The cloth can't stretch, so a strip turned away from us takes less room across the frame.
    for (let r = 0; r < rows; r++) {
      const v = Math.min(1, Math.max(0, (r + 0.5 - TOP) / HIGH));
      xs[r] = POLE + 1;
      for (let i = 1; i <= STRIPS; i++) {
        const w = (2 * LONG) / STRIPS / Math.hypot(1, dz((i - 0.5) / STRIPS, v));
        xs[i * rows + r] = xs[(i - 1) * rows + r] + w;
      }
    }
    lit.fill(0), hits.fill(0), odd.fill(0), cover.fill(0);
    for (let i = 0; i <= STRIPS; i++) {
      const u = i / STRIPS;
      // Nearer parts look taller, the hems rise and fall with each fold, and the free end droops.
      const zm = z(u, 0.5);
      const h = HIGH * (1 + 0.04 * zm) - 0.8 * u;
      const top = TOP + 1.2 * u * u + 0.8 * u * gust * Math.sin(ph(u, 0.5) + 0.8) - (h - HIGH) / 2;
      for (let r = Math.max(0, Math.floor(top)); r < Math.min(rows, top + h); r++) {
        const c = Math.floor(xs[i * rows + r]);
        if (c >= cols) continue;
        const k = r * cols + c;
        const v = Math.min(1, Math.max(0, (r + 0.5 - top) / h));
        // Light comes from the left and in front, so a face turned toward the pole is lit.
        const s = dz(u, v);
        lit[k] += Math.max(0, Math.min(1, (0.95 * s + 0.65) / Math.hypot(1, s) + 0.1));
        hits[k]++;
        odd[k] += Math.floor(v * bands * 0.9999) % 2;
        cover[k] = Math.max(cover[k], Math.min(r + 1, top + h) - Math.max(r, top));
      }
    }
    out.fill(" ");
    for (let k = 0; k < cols * rows; k++) {
      if (!hits[k]) continue;
      const f = cover[k];
      const below = k + cols < cols * rows && cover[k + cols] > 0.94;
      // A hem crossing the cell: a block filled to where the cloth reaches, from below or above.
      if (f < 0.8 && below) {
        out[k] = RISE[Math.min(6, Math.floor(f * 8))];
        continue;
      }
      if (f < 0.7 && !below) {
        out[k] = f < 0.3 ? "▔" : "▀";
        continue;
      }
      // The light stripes take the top of the ramp and the dark ones the bottom, so folds show in both.
      const l = lit[k] / hits[k];
      const b = odd[k] * 2 > hits[k] ? 0.1 + 0.34 * l : 0.52 + 0.48 * l;
      const g = Math.max(1, Math.min(9, Math.round(b * 9)));
      out[k] = RAMP[paper ? 10 - g : g];
    }
    // The pole, its cap, and the ground it stands in.
    out[Math.floor(TOP - 1) * cols + POLE] = "o";
    for (let r = Math.floor(TOP); r < rows - 1; r++) out[r * cols + POLE] = "┃";
    for (let c = POLE - 3; c <= POLE + 3; c++) out[(rows - 1) * cols + c] = c === POLE ? "┸" : "▁";
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
