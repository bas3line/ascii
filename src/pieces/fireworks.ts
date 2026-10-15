/*
 * fireworks: shells climb on a sparkling trail and burst. Every spark follows
 * a closed-form path under air drag and gravity, so any moment can be drawn
 * straight from the clock, and each shell is one of several kinds of burst.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "fireworks",
  category: "effects",
  note: "shells climb and burst as peonies, rings, willows and palms",
  cols: 64,
  rows: 24,
  fps: 30,
} satisfies Meta;

const G = 13; // gravity, in column widths a second squared (a row is two)
const EVERY = 1.25; // seconds between launches
// Shells take their kind and their spot on the skyline in turn.
const KINDS = ["peony", "willow", "ring", "palm", "saturn", "peony", "willow", "ring", "palm"];
const SPOTS = [0.3, 0.68, 0.45, 0.25, 0.62, 0.36, 0.72];
const OPEN = 0.55; // play opens this long after the first shell, a peony, bursts

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The heading of a streak picks its glyph, with rows counted double.
function streak(dx: number, dy: number): string {
  let a = Math.atan2(dy, dx);
  if (a < 0) a += Math.PI;
  return a < 0.42 || a > 2.72 ? "-" : a < 1.2 ? "/" : a < 1.94 ? "|" : "\\";
}

interface Spark {
  vx: number;
  vy: number;
  k: number;
  life: number;
  seed: number;
  look: string;
  inner?: boolean;
}

type Look = Partial<Spark> & Pick<Spark, "look">;

interface Shell {
  kind: string;
  at: number;
  x0: number;
  drift: number;
  rise: number;
  top: number;
  sparks: Spark[];
}

// One shell, everything about it drawn from its own seed.
function shell(i: number, cols: number, H: number): Shell {
  const r = mulberry32(i * 7919 + 17);
  const pick = <T>(list: T[]) => list[((i % list.length) + list.length) % list.length];
  const s: Shell = {
    kind: pick(KINDS),
    at: i * EVERY + r() * 0.25,
    x0: cols * (pick(SPOTS) + (r() - 0.5) * 0.05),
    drift: (r() - 0.5) * 2,
    rise: 1 + r() * 0.2,
    top: H * (0.62 + r() * 0.08),
    sparks: [],
  };
  const add = (vx: number, vy: number, o: Look) => s.sparks.push({ vx, vy, k: 2.2, life: 1.7, seed: (r() * 1e9) | 0, ...o });
  // A sphere seen from outside: headings evenly round the sky, and most sparks
  // out at the rim, where a sphere's sparks crowd when it is seen flat. With
  // `deep`, every third one is thrown nearer the eye and shows further in.
  const sphere = (count: number, speed: number, o: Look, deep = true) => {
    const turn = r() * 6.283;
    for (let j = 0; j < count; j++) {
      const a = turn + ((j + 0.5) / count) * 6.283;
      const inner = deep && j % 3 === 1;
      const reach = inner ? 0.5 + 0.25 * (((j * 7) % 5) / 4) : 0.94 + r() * 0.06;
      add(Math.cos(a) * speed * reach, Math.sin(a) * speed * reach, { inner, ...o });
    }
  };
  // A flat ring tipped toward the viewer, so it shows as an ellipse.
  const ring = (count: number, speed: number, o: Look, open: number) => {
    const tilt = open + r() * 0.15, roll = (r() - 0.5) * 0.5;
    for (let j = 0; j < count; j++) {
      const a = (j / count) * 6.283, x = Math.cos(a), y = Math.sin(a) * tilt;
      add((x * Math.cos(roll) - y * Math.sin(roll)) * speed, (x * Math.sin(roll) + y * Math.cos(roll)) * speed, o);
    }
  };
  if (s.kind === "peony") sphere(27, 33, { look: "peony" });
  else if (s.kind === "willow") sphere(15, 30, { look: "willow", k: 2.1, life: 3.4 }, false);
  else if (s.kind === "ring") ring(24, 28, { look: "ring", life: 1.5 }, 0.3);
  else if (s.kind === "saturn") ring(24, 30, { look: "ring", life: 1.5 }, 0.5), sphere(9, 10, { look: "core", life: 1.1 });
  else {
    // A palm: a few heavy comets fanned up and out, drooping as they slow.
    for (let j = 0; j < 7; j++) {
      const a = Math.PI / 2 + ((j - 3) / 3) * 1.15 + (r() - 0.5) * 0.08;
      add(Math.cos(a) * 36, Math.sin(a) * 36, { look: "palm", k: 2.2, life: 1.9 });
    }
  }
  return s;
}

export default function fireworks(): Frame {
  const { cols, rows } = meta;
  const H = rows * 2; // sky height in column widths
  const grid: string[] = new Array(cols * rows);
  const cache = new Map<number, Shell>();
  const get = (i: number): Shell => {
    if (!cache.has(i)) cache.set(i, shell(i, cols, H));
    return cache.get(i)!;
  };
  const cell = (x: number, y: number) => {
    const c = Math.floor(x), r = Math.floor(rows - y / 2);
    return c >= 0 && c < cols && r >= 0 && r < rows ? c + r * cols : -1;
  };
  const put = (x: number, y: number, ch: string) => {
    const k = cell(x, y);
    if (k >= 0) grid[k] = ch;
  };
  // Where a spark is b seconds after the burst. Drag spends its throw
  // exponentially, so its reach so far is (1 - e^-kb) / k of its speed.
  const at = (s: Shell, p: Spark, b: number): [number, number] => {
    const e = (1 - Math.exp(-p.k * b)) / p.k;
    return [s.x0 + s.drift * s.rise + p.vx * e, s.top + p.vy * e - (G / p.k) * (b - e)];
  };
  // The age at which a spark has gone a share q of the way out it has gone by age a.
  const back = (p: Spark, a: number, q: number) => -Math.log(1 - q * (1 - Math.exp(-p.k * a))) / p.k;
  // Lays a spark's path from age b0 to b1 into cells, one glyph a cell, back
  // from the head; style(u, dx, dy, m) picks it from how far back it is (0 to
  // 1) and which cell of the stroke it is.
  const stroke = (s: Shell, p: Spark, b0: number, b1: number, style: (u: number, dx: number, dy: number, m: number) => string) => {
    if (b1 <= b0) return;
    const n = 24;
    let last = cell(...at(s, p, b1)), m = 0;
    for (let j = 1; j <= n; j++) {
      const b = b1 - ((b1 - b0) * j) / n;
      const [x, y] = at(s, p, b), [nx, ny] = at(s, p, b + 0.01);
      const k = cell(x, y);
      if (k < 0 || k === last) continue;
      last = k;
      const g = style(j / n, nx - x, ny - y, m++);
      if (g) grid[k] = g;
    }
  };
  const lead = get(0).at + get(0).rise + OPEN;

  return (time) => {
    grid.fill(" ");
    const t = time + lead;
    const tick = Math.floor(t * 30);
    const last = Math.floor(t / EVERY);
    for (let i = last - 4; i <= last; i++) {
      const s = get(i);
      const age = t - s.at;
      if (age < 0) continue;
      if (age < s.rise) {
        // Climbing: slowing toward the top, with sparks dropping off behind.
        const g = (2 * s.top) / (s.rise * s.rise), v0 = g * s.rise;
        const pos = (a: number): [number, number] => [s.x0 + s.drift * a, v0 * a - (g * a * a) / 2];
        for (let j = 5; j >= 1; j--) {
          const a = age - j * 0.05;
          if (a < 0 || (tick + j + i) % 3 === 0) continue;
          const [x, y] = pos(a);
          put(x + (((tick * 7 + j) % 3) - 1) * 0.4, y - j * 0.3, j > 3 ? "." : ":");
        }
        put(...pos(age), "|");
        continue;
      }
      const a = age - s.rise;
      const heads: [number, number, string][] = [];
      for (const p of s.sparks) {
        if (a > p.life) continue;
        const f = a / p.life; // how spent the spark is
        let h = Math.imul(p.seed ^ Math.imul(tick, 0x9e3779b1), 0x85ebca6b);
        h = (((h ^ (h >>> 13)) >>> 0) % 1000) / 1000;
        // Near the end a spark flickers before it goes out.
        if (f > 0.7 && h < (f - 0.7) * 3) continue;
        // Packed together just after the burst, the sparks would only blot.
        if (a < 0.1) continue;
        const [x, y] = at(s, p, a);
        if (p.look === "peony") {
          // A short streak behind each rim spark, on the outer part of its path
          // only, so the middle stays open and the burst is round.
          if (!p.inner && a < 0.75) stroke(s, p, Math.max(back(p, a, 0.6), a - 0.12), a, (_, dx, dy) => streak(dx, dy));
          heads.push([x, y, a < 0.7 ? "*" : f < 0.6 ? "+" : "."]);
        } else if (p.look === "ring") {
          if (a < 0.15) continue;
          heads.push([x, y, a < 0.3 || f > 0.6 ? "." : "o"]);
        } else if (p.look === "core") {
          heads.push([x, y, f < 0.5 ? "+" : "."]);
        } else if (p.look === "willow") {
          // Gold threads that hang, thinning from a line to dots.
          stroke(s, p, Math.max(back(p, a, 0.45), a - 1.6), a, (u, dx, dy, m) => (u < 0.6 ? streak(dx, dy) : m % 2 ? "" : "."));
          heads.push([x, y, f < 0.25 ? "*" : "."]);
        } else {
          // A palm comet: one heavy head and a curved tail that tapers off.
          stroke(s, p, Math.max(back(p, a, 0.45), a - 1), a, (u, dx, dy) => (u < 0.9 ? streak(dx, dy) : "."));
          heads.push([x, y, a < 0.2 ? "*" : a < 0.45 ? "@" : f < 0.75 ? "o" : "."]);
        }
      }
      for (const [x, y, g] of heads) put(x, y, g);
      // The flash at the moment of the burst.
      if (a < 0.12) put(s.x0 + s.drift * s.rise, s.top, a < 0.06 ? "@" : "*");
    }
    for (const i of cache.keys()) if (i < last - 5) cache.delete(i);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
