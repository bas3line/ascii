/*
 * fireflies: a meadow at night, tufts of grass under a far treeline and a
 * crescent moon. Fireflies drift over it, each flashing on its own slow beat,
 * until one lights early and the flash runs fly to fly across the meadow.
 */
import type { Frame, Meta } from "../types.ts";

export interface FirefliesOptions {
  [key: string]: unknown;
  seed: number;
  count: number;
}

export const meta = {
  name: "fireflies",
  category: "nature",
  note: "fireflies over night grass, a flash spreading through them",
  cols: 60,
  rows: 18,
  fps: 15,
  options: { seed: 7, count: 44 },
} satisfies Meta<FirefliesOptions>;

const MOON = ["   _.._", " .' .-'", "/  /", "|  |", "\\  \\", " `._`-."];
const TREES = [
  "                  .-.                         _",
  "     .-.   .--. .'   `.  .-.       .--.    .-' `-.   .-.",
  "__.-'   `-'    `       `-'   `-.__.'    `--'      `-'   `-._",
];
const GLOW: [number, string][] = [[0.6, "*"], [0.34, "+"], [0.17, "·"], [0.07, "."]]; // a fly's light, brightest first
const HALO: [number, number, number][] = [[0, 0, 1], [-1, 0, 0.45], [1, 0, 0.45], [-2, 0, 0.13], [2, 0, 0.13], [0, -1, 0.16], [0, 1, 0.16]];
const WAVE = 11; // seconds between flashes that sweep the meadow
const SPEED = 13; // how fast one runs, in columns a second
const START = 2.4; // seconds into a sweep at t = 0
const GROUND = 17; // the ground row
const HORIZON = 8; // where the treeline meets the meadow

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (a: number, b: number) => mulberry32(Math.imul(a, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b))();

export default function fireflies({ seed = 7, count = 44 }: Partial<FirefliesOptions> = {}): Frame {
  const { cols, rows } = meta;
  const rnd = mulberry32(seed);
  const TAU = Math.PI * 2;
  const sky = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));

  // The sky, drawn once: stars, the moon, and the far treeline.
  const stars = Array.from({ length: 16 }, (): [number, number, number] => [Math.floor(rnd() * 5), Math.floor(rnd() * (cols - 14)), rnd()]);
  MOON.forEach((line, i) => [...line].forEach((ch, j) => ch !== " " && (sky[i][cols - 12 + j] = ch)));
  TREES.forEach((line, i) => [...line].forEach((ch, j) => ch !== " " && (sky[HORIZON - 3 + i][j] = ch)));
  sky[GROUND].fill("_");

  // Grass in tufts with room between them: blades fanning out from one root,
  // a straight one in the middle the tallest.
  const blades: { c: number; h: number; lean: number; ph: number }[] = [];
  const FANS = [[-1, 0, 1], [-1, 0, 1], [0, 1], [-1, 0], [-1, 1]];
  for (let x = 2 + rnd() * 3; x < cols - 2; x += 4 + rnd() * 7) {
    const h = 2 + Math.floor(rnd() * 4), c = Math.floor(x), ph = x * 0.23;
    for (const lean of FANS[Math.floor(rnd() * FANS.length)]) blades.push({ c, h: lean ? Math.max(1, h - 1 - Math.floor(rnd() * 1.6)) : h, lean, ph });
  }

  // Each fly wanders on a few slow waves over the meadow and the grass tips.
  const flies = Array.from({ length: count }, () => ({
    x: 3 + rnd() * (cols - 6), y: 9.3 + rnd() * 4.6,
    w: [0.05 + rnd() * 0.08, 0.11 + rnd() * 0.1, 0.07 + rnd() * 0.08],
    p: [rnd() * TAU, rnd() * TAU, rnd() * TAU],
  }));
  const place = (f: (typeof flies)[number], s: number): [number, number] => [
    f.x + 6 * Math.sin(f.w[0] * s + f.p[0]) + 2.5 * Math.sin(f.w[1] * s + f.p[1]),
    f.y + 1.4 * Math.sin(f.w[2] * s + f.p[2]) + 0.6 * Math.sin(f.w[1] * 1.7 * s + f.p[0]),
  ];
  // How bright a fly is a fraction ph through its beat: a quick rise, then a
  // slower fade.
  const glow = (ph: number) => (ph < 0.04 ? ph / 0.04 : Math.exp(-(ph - 0.04) / 0.13));
  // Each sweep starts at the fly furthest to one side, the sides taking
  // turns, and reaches every other fly as the flash travels; after it, each
  // fly keeps a beat of its own until the next.
  const hits = new Map<number, { t: number; rate: number }[]>();
  const sweep = (w: number) => {
    if (hits.has(w)) return hits.get(w)!;
    const at = flies.map((f) => place(f, w * WAVE));
    const o = at.reduce((b, p) => ((w & 1 ? p[0] > b[0] : p[0] < b[0]) ? p : b));
    const out = at.map(([x, y], i) => ({ t: w * WAVE + Math.hypot(x - o[0], 2 * (y - o[1])) / SPEED, rate: 1 / (5 + 3.5 * hash(seed + i, w)) }));
    hits.set(w, out);
    if (hits.size > 4) hits.delete(hits.keys().next().value!);
    return out;
  };
  const bright = (i: number, s: number) => {
    const w = Math.floor(s / WAVE);
    let h = sweep(w)[i];
    if (s < h.t) h = sweep(w - 1)[i];
    const ph = (s - h.t) * h.rate;
    return ph < 0 ? 0 : glow(ph - Math.floor(ph));
  };

  const field = new Float32Array(cols * rows);
  const light = (x: number, y: number, v: number) => {
    const c = Math.floor(x), r = Math.floor(y);
    for (const [dc, dr, k] of HALO) {
      const cc = c + dc, rr = r + dr;
      if (cc >= 0 && cc < cols && rr >= HORIZON && rr < GROUND) field[rr * cols + cc] = Math.max(field[rr * cols + cc], v * k);
    }
  };

  return (t) => {
    const s = WAVE * 3 + START + t;
    const g = sky.map((row) => row.slice());
    for (const [r, c, p] of stars) g[r][c] = p < 0.25 && Math.sin(t * 1.3 + p * 50) > 0.3 ? "+" : ".";
    for (const b of blades) {
      const sway = 0.6 * Math.sin(s * 0.8 - b.ph);
      let px = b.c + 0.5;
      for (let k = 1; k <= b.h; k++) {
        const x = b.c + 0.5 + b.lean * k + sway * (k / b.h) ** 2, d = x - px;
        const c = Math.floor(x);
        if (c >= 0 && c < cols) g[GROUND - k][c] = d > 0.5 ? "/" : d < -0.5 ? "\\" : "|";
        px = x;
      }
    }

    // Each fly's light, with a faint trail where it was brighter a moment
    // ago; the glow's faint edge stays behind the grass.
    field.fill(0);
    flies.forEach((f, i) => {
      const v = bright(i, s);
      if (v > 0.05) light(...place(f, s), v);
      for (let k = 1; k <= 4; k++) {
        const old = bright(i, s - k * 0.3);
        if (old > v) {
          const [x, y] = place(f, s - k * 0.3);
          const c = Math.floor(x), r = Math.floor(y), at = r * cols + c;
          if (c >= 0 && c < cols && r >= HORIZON && r < GROUND) field[at] = Math.max(field[at], 0.25 * old);
        }
      }
    });
    for (let r = HORIZON; r < GROUND; r++)
      for (let c = 0; c < cols; c++) {
        const v = field[r * cols + c], lv = GLOW.find(([min]) => v >= min);
        if (lv && (g[r][c] === " " || v >= 0.34)) g[r][c] = lv[1];
      }
    return g.map((row) => row.join("")).join("\n");
  };
}
