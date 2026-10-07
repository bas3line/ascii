/*
 * rocket: a night launch. Boil-off vents from the upper stage, the arm swings
 * back, the engine lights, exhaust billows out of the trench and the rocket
 * climbs out of the frame. It comes back down on a landing burn and settles.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "rocket",
  category: "space",
  note: "a rocket lifting off its pad at night, then landing back",
  cols: 48,
  rows: 28,
  fps: 20,
} satisfies Meta;

// w is white paint, k the dark interstage, g the bare metal of the bell; each
// is shaded as a cylinder lit from the tower's floodlights on the left.
const ROCKET = [
  "      /\\      ",
  "     /ww\\     ",
  "    /wwww\\    ",
  "   /wwwwww\\   ",
  "   |wwwwww|   ",
  "   |wwwwww|   ",
  "   \\wwwwww/   ",
  "    |wwww|    ",
  "    |wwww|    ",
  "   /kkkkkk\\   ",
  "   |wwwwww|   ",
  "   |wwwwww|   ",
  "   |wwwwww|   ",
  "   |wwwwww|   ",
  "   |wwwwww|   ",
  "  /|wwwwww|\\  ",
  " /f|wwwwww|f\\ ",
  "/ff|wwwwww|ff\\",
  "    \\gggg/    ",
  "    /gggg\\    ",
  "   /gggggg\\   ",
];
const TONE: Record<string, number> = { w: 1, k: 0.42, g: 0.62, f: 0.6 };
const BODY = " .:-=+*#%";
// Smoke is drawn as how much of it there is, not as light, so its ramp keeps
// its sense on paper, and it stops at % so the clouds stay soft.
const SMOKE = " .:-=+*#%";
const FLAME = "░▒▓█";
const LOOP = 18;
const ARM = 0.8; // the service arm starts to swing away
const IGNITE = 1.5; // engine lights
const LIFT = 3; // the clamps let go
const CLIMB = 2.6; // rows per second squared on the way up
const OUT = 40; // rows above the pad where it is well out of sight
const LAND = 14.6; // touchdown
const DECEL = 4.4; // braking on the landing burn, which starts out of sight
const BURN = Math.sqrt((2 * OUT) / DECEL);
const RATE = 36; // exhaust puffs a second

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rows the rocket's base stands above the pad at time t in the loop, or -1
// while it is out of sight.
function height(t: number): number {
  if (t < LIFT || t >= LAND) return 0;
  const up = 0.5 * CLIMB * (t - LIFT) ** 2;
  if (up < OUT) return up;
  const left = LAND - t;
  return left < BURN ? 0.5 * DECEL * left * left : -1;
}
const burning = (t: number) => t >= IGNITE && t < LAND && height(t) >= 0;
const onPad = (t: number) => t < ARM - 0.3 || t >= LAND + 1;

export default function rocket(): Frame {
  const { cols, rows } = meta;
  const W = ROCKET[0].length, HT = ROCKET.length;
  const left = Math.floor((cols - W) / 2), mid = left + W / 2 - 0.5;
  const pad = rows - 2; // the pad's deck; the base of the rocket sits on the row above
  const tower = left - 8;
  const armRow = pad - HT + 8; // level with the upper stage
  const rand = mulberry32(3);

  // The sprite, shaded once for a dark page and once for paper.
  const sprite = [false, true].map((paper) =>
    ROCKET.map((line) => {
      const a = line.search(/[wkg]/), b = line.lastIndexOf(line[a]) + 1;
      return [...line].map((ch, c) => {
        if (!TONE[ch]) return ch;
        const x = (c + 0.5 - W / 2) / ((b - a) / 2 + 0.5);
        // The fins are flat, so each takes one tone.
        const lit = ch === "f" ? (x < 0 ? 0.75 : 0.3) : Math.max(0, -0.72 * x + 0.69 * Math.sqrt(Math.max(0, 1 - x * x)));
        const i = Math.max(1, Math.round(TONE[ch] * (0.12 + 0.88 * lit) * (BODY.length - 1)));
        return BODY[paper ? BODY.length - i : i];
      });
    }),
  );
  // The rocket is solid from its first mark to its last on every row.
  const span = ROCKET.map((s) => [s.search(/\S/), s.trimEnd().length]);
  // Stars, kept off the rocket, its vapour and the tower's top so none reads
  // as a spark.
  const stars: [number, number, number, boolean][] = [];
  for (let r = 0; r < pad - 9; r++)
    for (let c = 0; c < cols; c++) {
      const byRocket = c >= left - 2 && c <= left + W + 1 + (Math.abs(r - armRow) < 4 ? 12 : 0) && r >= pad - HT - 2;
      const byTower = Math.abs(c - tower - 1) < 4 && r >= pad - 24;
      if (rand() < 0.026 && !byRocket && !byTower) stars.push([c, r, rand() * 6.283, rand() < 0.2]);
    }
  // Every puff of exhaust keeps its own spread, speed and life.
  const puffs = Array.from({ length: Math.ceil(LOOP * RATE) }, () => ({
    jx: (rand() - 0.5) * 2.4, side: rand() < 0.5 ? -1 : 1, fan: 14 + rand() * 12,
    rise: 0.5 + rand() * 0.9, life: 2.2 + rand() * 1.4, grow: 0.6 + rand() * 0.6,
  }));

  const grid = new Array<string>(cols * rows);
  const fog = new Float32Array(cols * rows);
  const put = (x: number, y: number, ch: string) => {
    const c = Math.round(x), r = Math.round(y);
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r * cols + c] = ch;
  };
  const splat = (x: number, y: number, rad: number, s: number) => {
    const ry = rad / 2;
    for (let r = Math.max(0, Math.ceil(y - ry)); r <= Math.min(rows - 1, Math.floor(y + ry)); r++)
      for (let c = Math.max(0, Math.ceil(x - rad)); c <= Math.min(cols - 1, Math.floor(x + rad)); c++) {
        const q = ((c - x) / rad) ** 2 + ((r - y) / ry) ** 2;
        if (q < 1) fog[r * cols + c] += s * (1 - q);
      }
  };

  // A puff leaves the nozzle going down; where it meets the deck it fans out
  // sideways, and either way it slows, swells, rises and thins.
  const puff = (p: (typeof puffs)[number], x0: number, y0: number, age: number, thick: number) => {
    const down = 26 * 0.2 * (1 - Math.exp(-age / 0.2));
    let x = x0 + p.jx * (1 + age), y = y0 + down;
    if (y > pad) {
      const hit = -0.2 * Math.log(1 - (pad - y0) / (26 * 0.2));
      y = pad - 0.2;
      x = x0 + p.jx + p.side * p.fan * 0.7 * (1 - Math.exp(-(age - hit) / 0.7));
    }
    y -= p.rise * age * age * 0.5 + 0.3 * age;
    const fade = Math.max(0, 1 - age / p.life);
    splat(x + 0.8 * age, y, 1.2 + p.grow * age * 2.2, 0.9 * thick * fade * fade);
  };

  return (time, { paper = false } = {}) => {
    const t = ((time % LOOP) + LOOP) % LOOP;
    grid.fill(" ");
    fog.fill(0);
    for (const [c, r, ph, big] of stars) {
      const tw = Math.sin(time * 1.7 + ph);
      put(c, r, big ? (tw > 0.3 ? "+" : "*") : tw > -0.6 ? "." : " ");
    }

    // Tower, its beacon and the service arm.
    for (let r = pad - 20; r <= pad; r++) {
      put(tower, r, "|");
      put(tower + 2, r, "|");
      put(tower + 1, r, r % 2 ? "/" : "\\");
    }
    put(tower + 1, pad - 21, "|");
    put(tower + 1, pad - 22, Math.floor(time * 1.25) % 2 ? "*" : ".");
    const swing = t < ARM ? 1 : t < IGNITE ? 1 - (t - ARM) / (IGNITE - ARM) : t < LAND + 1 ? 0 : Math.min(1, (t - LAND - 1) / 0.6);
    for (let i = 0; i < Math.round(swing * (left + 1 - tower)); i++) put(tower + 3 + i, armRow, "=");
    // The deck, with the flame trench under the engine.
    for (let c = 0; c < cols; c++) put(c, rows - 1, "▀");
    for (let c = 2; c < cols - 2; c++) put(c, pad, Math.abs(c - mid) < 4 ? " " : "_");

    // Exhaust, from every puff still alive. Births are on a fixed beat, so a
    // puff's age and where it was born follow from t alone.
    for (let k = 0; k < puffs.length; k++) {
      const born = k / RATE, age = t - born;
      if (age < 0 || age > puffs[k].life || !burning(born)) continue;
      const h = height(born);
      // Coming down it flies into its own plume, so only the last rows of the burn leave smoke.
      if (pad - 1 - h >= -2) puff(puffs[k], mid, pad - 0.5 - h, age, Math.exp(-h / (born > LAND - BURN ? 4 : 9)));
    }
    for (let k = 0; k < cols * rows; k++)
      if (fog[k] > 0.06) grid[k] = SMOKE[1 + Math.min(SMOKE.length - 2, Math.floor((1 - Math.exp(-fog[k] / 0.9)) * (SMOKE.length - 1)))];
    // The two stands the fins rest on.
    for (let r = pad - 3; r < pad; r++) {
      put(left, r, "[");
      put(left + W - 1, r, "]");
    }

    const h = height(t);
    if (h >= 0) {
      const base = pad - 1 - Math.round(h);
      const art = sprite[paper ? 1 : 0];
      for (let r = 0; r < HT; r++)
        for (let c = span[r][0]; c < span[r][1]; c++) put(left + c, base - HT + 1 + r, art[r][c]);
      // While it waits on the pad, liquid oxygen boils off through a vent on
      // the upper stage in a thin wisp that drifts away on the wind.
      for (let k = 23; k >= 0; k--) {
        const born = (Math.floor(time / 0.1) - k) * 0.1, age = time - born;
        if (!onPad(((born % LOOP) + LOOP) % LOOP) || age > 2.4) continue;
        const f = age / 2.4, gust = 1 + 0.3 * Math.sin(0.9 * born);
        const y = base - HT + 9 - 0.4 * age - 0.2 * age * age + 1.1 * Math.sin(2.3 * born) * f;
        put(left + W - 4 + gust * (3 * age + 0.6 * age * age), y, f < 0.2 ? "~" : f < 0.45 ? "-" : f < 0.75 ? "." : "·");
      }
      if (burning(t)) {
        // Short at ignition, long in the climb, shorter braking.
        const len = t < LIFT ? 1 + 2.5 * ((t - IGNITE) / (LIFT - IGNITE)) : t < LAND - BURN ? 6 : 4.5;
        const f = Math.floor(time * 20);
        for (let k = 1; k <= len + ((f * 7) % 3) - 1; k++) {
          const heat = 1 - (k - 1) / (len + 1);
          const half = 0.4 + 2.8 * heat ** 0.6;
          for (let c = Math.ceil(mid - half); c <= Math.floor(mid + half); c++) {
            const edge = Math.abs(c - mid) / (half + 0.5);
            const i = Math.floor((heat * 0.8 + 0.35 - edge * 0.5 + (((f + c * 3 + k) * 13) % 5) * 0.03) * FLAME.length);
            if (i >= 0) put(c, base + k, FLAME[Math.min(FLAME.length - 1, i)]);
          }
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
