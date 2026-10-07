/*
 * snowfall: snow drifting down in three depths on a light wind, swaying as
 * it falls. Flakes settle where they land, building a drift in the fence's
 * lee, a ridge along each rail and a cap on every post.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "snowfall",
  category: "nature",
  note: "snow swaying down, building drifts on the ground and a fence",
  cols: 64,
  rows: 22,
  fps: 20,
} satisfies Meta;

const EIGHTHS = " ▁▂▃▄▅▆▇█";
const LINE = "▔─▁"; // on paper the drift's surface is a line, by where it crosses a cell
const POSTS = [9, 20, 31, 42]; // the fence posts' columns
const TOP = 10; // the posts' top row
const RAILS = [11, 14]; // the rails' rows
const RAIL = 2; // a bare rail's thickness, in eighths of a row
// Each depth: flakes, fall speed and drift in cells a second, sway, glyph.
const LAYERS = [
  { n: 44, v: 1.1, wind: 0.6, sway: 0.5, glyph: "." },
  { n: 30, v: 1.8, wind: 1.1, sway: 1, glyph: "+" },
  { n: 13, v: 2.8, wind: 1.8, sway: 1.6, glyph: "*" },
];

interface Flake {
  li: number;
  x: number;
  y: number;
  ph: number;
  w: number;
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

export default function snowfall(): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(7);
  // The ground's snow in rows at each column: rolling, swept into a long
  // drift in the fence's lee that ends in a steep face.
  const ground = Float64Array.from({ length: cols }, (_, c) => {
    const lee = 3.6 * smooth(36, 55, c) * (1 - smooth(55, 59, c));
    return 1 + 0.55 * Math.sin(c * 0.19 + 1.3) + 0.3 * Math.sin(c * 0.47 + 0.4) + lee;
  });
  const extra = new Float64Array(cols).fill(0.3); // fresh snow on top of it
  const wind = Float64Array.from({ length: cols }, (_, c) => 0.7 + 1.6 * Math.exp(-(((c - 52) / 7) ** 2)));
  const rail = RAILS.map((_, k) => Float64Array.from({ length: cols }, (_, c) => 2 + 0.7 * Math.sin(c * 0.45 + k * 2) + 0.4 * rand()));
  const cap = new Float64Array(POSTS.length).fill(7);
  const inFence = (c: number) => c > POSTS[0] && c < POSTS[POSTS.length - 1];

  const flakes: Flake[] = [];
  const spawn = (f: Flake, top: boolean) => {
    f.x = rand() * cols;
    f.y = top ? -rand() * 2 : rand() * rows;
    f.ph = rand() * 6.283;
    f.w = 0.8 + rand() * 0.45;
  };
  LAYERS.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const f = { li } as Flake;
      spawn(f, false);
      flakes.push(f);
    }
  });

  const step = (dt: number, t: number) => {
    for (const f of flakes) {
      const L = LAYERS[f.li];
      const y0 = f.y;
      f.y += L.v * f.w * dt;
      f.x = (((f.x + (L.wind + L.sway * Math.cos(t * f.w * 1.3 + f.ph)) * dt) % cols) + cols) % cols;
      const c = Math.floor(f.x);
      // Flakes at the fence's depth may come to rest on a rail or a post top.
      if (f.li === 1) {
        const k = RAILS.findIndex((r) => y0 < r + 0.5 && f.y >= r + 0.5);
        if (k >= 0 && inFence(c) && !POSTS.includes(c) && rand() < 0.7) {
          for (const [d, a] of [[-1, 0.3], [0, 0.6], [1, 0.3]]) rail[k][c + d] = Math.min(5, rail[k][c + d] + a);
          spawn(f, true);
          continue;
        }
        const p = POSTS.indexOf(c);
        if (p >= 0 && y0 < TOP && f.y >= TOP) {
          cap[p] = Math.min(13, cap[p] + 1);
          spawn(f, true);
          continue;
        }
      }
      if (f.y < rows - ground[c] - extra[c]) continue;
      // The two nearer depths settle where they land, more where the wind drops them.
      if (f.li > 0) extra[c] += 0.3 * wind[c];
      spawn(f, true);
    }
    // Fresh snow evens out between neighbours and packs down slowly.
    const next = Float64Array.from(extra, (e, c) => e + 1.5 * dt * ((extra[c - 1] ?? e) + (extra[c + 1] ?? e) - 2 * e));
    for (let c = 0; c < cols; c++) extra[c] = next[c] * (1 - 0.02 * dt);
    for (const r of rail) for (let c = 0; c < cols; c++) r[c] -= r[c] * 0.004 * dt;
    for (let p = 0; p < cap.length; p++) cap[p] -= cap[p] * 0.01 * dt;
  };
  for (let i = 0; i < 400; i++) step(0.05, i * 0.05); // twenty seconds of snow before the first frame

  let last = 0;
  return (time, { paper = false } = {}) => {
    let dt = Math.min(0.1, Math.max(0, time - last));
    last = time;
    for (; dt > 1e-9; dt -= 0.05) step(Math.min(dt, 0.05), 20 + time);

    const g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    // A flake shows only in open air, in front of any farther flake.
    const draw = (li: number) => {
      for (const f of flakes) {
        const r = Math.floor(f.y), c = Math.floor(f.x);
        if (f.li !== li || r < 0 || r >= rows) continue;
        const k = LAYERS.findIndex((L) => L.glyph === g[r][c]);
        if (g[r][c] === " " || (k >= 0 && k < li)) g[r][c] = LAYERS[li].glyph;
      }
    };
    draw(0);
    // The fence: posts, rails thickened by the snow lying on them, a cap on each post.
    RAILS.forEach((r, k) => {
      for (let c = POSTS[0] + 1; c < POSTS[POSTS.length - 1]; c++) g[r][c] = EIGHTHS[RAIL + Math.floor(rail[k][c])];
    });
    POSTS.forEach((c, p) => {
      for (let r = TOP; r < rows; r++) g[r][c] = "┃";
      const n = Math.floor(cap[p]);
      g[TOP - 1][c] = EIGHTHS[Math.min(8, 1 + Math.floor(n / 2))];
      if (n > 8) g[TOP - 1][c - 1] = g[TOP - 1][c + 1] = EIGHTHS[n - 8];
    });
    // The drift: on a dark ground, solid under an eighth-block surface; on
    // paper, a line over a light fill, with an edge down any step of two rows.
    const top = Array.from({ length: cols }, (_, c) => rows - ground[c] - extra[c]);
    for (let c = 0; c < cols; c++) {
      const s = top[c], r = Math.floor(s), f = s - r;
      for (let rr = r + 1; rr < rows; rr++) g[rr][c] = paper ? "░" : "█";
      if (paper) g[r][c] = LINE[Math.min(2, Math.floor(f * 3))];
      else {
        g[r][c] = EIGHTHS[Math.max(1, Math.round((1 - f) * 8))];
      }
    }
    if (paper)
      for (let c = 0; c + 1 < cols; c++) {
        const a = Math.floor(top[c]), b = Math.floor(top[c + 1]);
        for (let r = a + 1; r < b; r++) g[r][c + 1] = "▏";
        for (let r = b + 1; r < a; r++) g[r][c] = "▕";
      }
    draw(1);
    draw(2);
    return g.map((row) => row.join("")).join("\n");
  };
}
