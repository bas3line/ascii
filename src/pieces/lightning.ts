/*
 * lightning: a storm over low hills in driving rain. Every few seconds a bolt
 * zigzags down from the cloud to the ground, forks as it strikes, flickers
 * through a restrike, lights the cloud and the land, and fades.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lightning",
  category: "nature",
  note: "a forked bolt striking out of a storm cloud in the rain",
  cols: 64,
  rows: 22,
  fps: 20,
} satisfies Meta;

// Cloud, thin to thick. A flash is light, not shade, so it keeps its sense on paper.
const CLOUD = " .:-=+*#%@";
const EDGE = "'-._"; // the cloud's underside by where it crosses a cell, top to bottom
const LOOP = 12; // seconds
// Strikes: [start within the loop, column the bolt leaves the cloud].
const STRIKES: [number, number][] = [[11.94, 27], [2.44, 44], [4.62, 17], [7.6, 51], [9.9, 34]];
const DECK = 2.6; // the row the cloud's flat base sits on, where no billow hangs
const DRIFT = 0.35; // columns a second the billows drift
const DROPS = 130;

const mulberry32 = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (x: number, y: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number) {
  const i = Math.floor(x), j = Math.floor(y), u = ease(x - i), v = ease(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// How bright a strike is, a seconds after it starts: a faint leader, the
// return stroke, a dark gap, a restrike, then a fading afterglow.
const flash = (a: number) => (a < 0 || a > 1 ? 0 : a < 0.05 ? 0.3 : a < 0.15 ? 1 : a < 0.2 ? 0.15 : a < 0.3 ? 0.9 : 0.9 * Math.exp(-(a - 0.3) / 0.18));

export default function lightning(): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(7);
  const hill = (c: number) => rows - 3.6 - 1.2 * Math.sin(c * 0.07 + 0.8) - 0.5 * Math.sin(c * 0.19 + 2.1);

  // The cloud: a flat base with billows hanging from it, each a lobe with a
  // rounded underside, drifting along on the wind. It thins toward the sides.
  const billows: { x: number; w: number; d: number }[] = [];
  const WRAP = cols + 24;
  for (let x = 0; x < WRAP - 4; x += 6 + rand() * 5) billows.push({ x, w: 3.5 + rand() * 3.5, d: 1 + rand() * 2.6 });
  const side = (c: number) => Math.min(1, Math.min(c + 1, cols - c) / 16);
  const bottom = (c: number, t: number) => {
    let y = DECK - 1.2 * (1 - side(c));
    for (const b of billows) {
      const x = ((((c + 0.5 - b.x + t * DRIFT) % WRAP) + WRAP) % WRAP) - 12;
      if (Math.abs(x) < b.w) y = Math.max(y, DECK + b.d * side(c) * Math.sqrt(1 - (x / b.w) ** 2));
    }
    return y;
  };

  // A bolt: one cell a row from the cloud to the ground, kicked a column or
  // two at a time in runs that switch side, always going down. Forks leave
  // it partway, run a few rows away from it, and give out in the air.
  const bolts = STRIKES.map(([start, x0], n) => {
    const rand = mulberry32(31 + n * 17);
    const r0 = Math.floor(bottom(x0, start)) + 1, ground = Math.floor(hill(x0 + 0.5));
    const walk = (c: number, from: number, to: number, lean: number, cells: [number, number, string][], main: boolean) => {
      let dir = lean, run = 0;
      for (let r = from; r < to; r++) {
        if (run-- <= 0) {
          dir = main ? (rand() < 0.5 ? -dir : dir) || 1 : lean;
          run = 1 + Math.floor(rand() * 3);
        }
        const dx = rand() < (main ? 0.22 : 0.15) ? 0 : dir * (rand() < 0.3 ? 2 : 1);
        if (c >= 0 && c < cols) cells.push([c, r, dx < 0 ? "/" : dx > 0 ? "\\" : "|"]);
        c += dx;
      }
      return c;
    };
    const main: [number, number, string][] = [], forks: [number, number, string][] = [];
    const x1 = walk(x0, r0, ground, rand() < 0.5 ? -1 : 1, main, true);
    for (let f = 0, n = 2 + Math.floor(rand() * 2); f < n; f++) {
      const [c, r, ch] = main[Math.floor(main.length * (0.2 + 0.5 * rand()))];
      const lean = ch === "/" ? 1 : ch === "\\" ? -1 : f % 2 ? 1 : -1;
      walk(c + lean, r + 1, Math.min(ground - 2, r + 3 + Math.floor(rand() * 4)), lean, forks, false);
    }
    return { start, x0, x1, ground, main, forks };
  });

  // Rain on the wind, a column left for every row it falls: far drops short
  // and slow, near ones longer streaks and faster.
  const drops = Array.from({ length: DROPS }, () => {
    const near = rand();
    return { x: rand() * (cols + 20), y: rand(), speed: 0.9 + near * 0.9, len: near < 0.25 ? 1 : near < 0.7 ? 2 : 3 };
  });

  const out: string[] = new Array(cols * rows);
  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    let lit = 0, bolt: (typeof bolts)[number] | null = null, age = 0;
    for (const b of bolts)
      for (const a of [u - b.start, u - b.start + LOOP]) {
        const f = flash(a);
        if (f > lit) [lit, bolt, age] = [f, b, a];
      }
    out.fill(" ");
    // Rain first, from the cloud to the hills.
    const fall = rows - 3;
    for (const d of drops) {
      const y = 3 + ((d.y + t * d.speed * 0.8) % 1) * fall;
      for (let i = 0; i < d.len; i++) {
        const r = Math.floor(y) - i;
        const c = Math.floor(((((d.x - (y - 3) + i) % (cols + 20)) + cols + 20) % (cols + 20)) - 10);
        if (c >= 0 && c < cols && r >= 0 && r < hill(c + 0.5) - 0.6) out[c + r * cols] = d.len > 1 ? "," : ".";
      }
    }
    // The cloud, dim until a flash lights it all over, brightest over the
    // bolt; its underside drawn as an edge.
    for (let c = 0; c < cols; c++) {
      const y = bottom(c, t);
      const near = bolt ? Math.exp(-(((c - bolt.x0) / 12) ** 2)) : 0;
      const light = 0.5 + 0.35 * lit + 0.6 * lit * near;
      for (let r = 0; r <= y; r++) {
        const k = c + r * cols;
        if (r + 1 > y) {
          out[k] = EDGE[Math.min(3, Math.floor((y - r) * 4))];
          continue;
        }
        // Thicker toward the underside, broken into rags toward the sides.
        const n = noise(c * 0.2 + t * DRIFT * 0.2, r * 0.8 + 3);
        if (n < 0.45 - 0.2 * r + 0.5 * (1 - side(c))) continue;
        const v = (0.3 + 0.3 * Math.max(0, 1 - (y - r - 1) / 2.5) + 0.6 * (n - 0.5)) * light * (0.5 + 0.5 * side(c));
        out[k] = CLOUD[Math.max(1, Math.min(CLOUD.length - 1, Math.round(v * (CLOUD.length - 1))))];
      }
    }
    // The land: a dark outline of hills; a flash lights the slopes from the
    // skyline down, more of them the brighter it is.
    for (let c = 0; c < cols; c++) {
      const y = hill(c + 0.5), r = Math.floor(y);
      out[c + r * cols] = "_.-'"[Math.min(3, Math.floor((1 - (y - r)) * 4))];
      for (let rr = r + 1; rr < rows; rr++) {
        const g = lit * (1.1 - (rr - y) / 4) - 0.2;
        out[c + rr * cols] = g > 0.55 ? "=" : g > 0.3 ? "-" : g > 0.08 ? "." : " ";
      }
    }
    if (bolt && lit > 0.12) {
      // The leader only gets partway down; the strokes show it all, forks too
      // while it is brightest; the afterglow keeps just the channel.
      const reach = age < 0.05 ? bolt.main.length * (age / 0.05) * 0.8 : bolt.main.length;
      bolt.main.forEach(([c, r, ch], i) => {
        if (i < reach) out[c + r * cols] = lit > 0.4 ? ch : ":";
      });
      if (lit > 0.6) for (const [c, r, ch] of bolt.forks) out[c + r * cols] = ch;
      // Where it strikes, a splash of light on the ground.
      if (lit > 0.4 && age >= 0.05) {
        const c = bolt.x1, r = bolt.ground;
        for (const [dc, ch] of [[-2, "-"], [-1, "\\"], [0, "*"], [1, "/"], [2, "-"]] satisfies [number, string][]) if (c + dc >= 0 && c + dc < cols) out[c + dc + r * cols] = ch;
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
