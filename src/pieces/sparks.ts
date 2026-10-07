/*
 * sparks: an angle grinder biting into a steel plate. Sparks leave the cut
 * in a tight hot cone, arc under gravity, skip on the plate and cool.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sparks",
  category: "effects",
  note: "an angle grinder throwing sparks that arc, skip and cool",
  cols: 64,
  rows: 20,
  fps: 30,
} satisfies Meta;

const FLOOR = 17; // the plate's top face, in rows: sparks skip along the row above it
const RD = 3.7; // the disc's radius, in rows (twice that in columns)
const SINK = 0.3; // how far the disc cuts into the plate, in rows
const DX = 24, DY = FLOOR - RD + SINK; // the disc's centre
// Where the rim comes up out of the cut: the sparks leave from there.
const EX = DX + 2 * Math.sqrt(RD * RD - (RD - SINK) ** 2);
const G = 30; // gravity, rows a second squared
const RATE = 320; // sparks a second at full pressure
const LIFE = 1.3; // the longest a spark glows, seconds
const BOUNCE = 0.3, SKID = 0.55; // speed kept up and along at each bounce
const SHADE = " ░▒▓█";

interface Spark {
  t0: number;
  vx: number;
  vy: number;
  life: number;
}

const hash = (i: number, s: number) => {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

// Where a spark is at age a: [x, y, vx, vy, bounces], rows down, vy upward.
// It hops along the plate, losing speed each time it lands.
const at = (s: Spark, a: number): [number, number, number, number, number] | null => {
  let x = EX, vx = s.vx, vy = s.vy;
  for (let b = 0; b < 3; b++) {
    const T = (2 * vy) / G;
    if (a < T) return [x + vx * a, FLOOR - 0.5 - vy * a + (G * a * a) / 2, vx, vy - G * a, b];
    x += vx * T;
    a -= T;
    vx *= SKID;
    vy *= BOUNCE;
  }
  return null;
};

// The grinder, as a shade (0 to 1) at a point in cells, or -1 for none:
// the disc in front, then its guard, the side handle and the motor body.
const tool = (x: number, y: number, spin: number) => {
  const X = x - DX, Y = (DY - y) * 2; // in columns, y up
  const d = Math.hypot(X, Y) / 2, ang = Math.atan2(Y, X); // d in rows
  if (d < RD) {
    if (d < 0.5) return 0.1; // the arbor nut
    if (d < 1.05) return 0.9; // the flange
    if (d > RD - 0.55) return 1; // the rim
    // The printed label: one bright arc that turns with the disc.
    const k = (((ang - spin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (d > 1.7 && d < 2.6 && k < 1.3) return 0.8;
    return 0.3;
  }
  // The guard wraps the half of the disc toward the operator.
  if (d > RD + 0.45 && d < RD + 1.35 && ang > 0.75 && ang < 3.8) return d < RD + 0.9 ? 1 : 0.7;
  // The side handle stands up from the gearhead: a knurled grip with a
  // rounded end on a short stem, lit from the left.
  const hx = x - (DX - 3.5);
  const top = 1.2, grip = 6.6, base = DY - RD - 1.2;
  if (y > top && y < base && Math.abs(hx) < (y < grip ? 1.6 : 0.9)) {
    if (y < top + 0.6 && Math.abs(hx) > 1.1) return -1; // the rounded end
    if (hx > 0.3) return 0.4;
    return y > top + 1 && y < grip - 0.5 && Math.floor(y) % 2 === 0 ? 0.7 : 0.95;
  }
  // The motor body, a cylinder lit from above, vented near the back.
  const by = (y - (DY - 0.4)) / 2;
  if (x > 1 && x < DX && Math.abs(by) < 1) {
    if (x < 2.5 && Math.abs(by) > 0.55) return -1; // the rounded end cap
    if (x > 4 && x < 11 && Math.abs(by + 0.1) < 0.4 && Math.floor(x) % 2 === 0) return 0.1;
    return by < -0.5 ? 0.95 : by < 0.1 ? 0.75 : by < 0.55 ? 0.45 : 0.25;
  }
  return -1;
};

// Quadrant blocks by which quarters of a cell are bright: top left 1, top
// right 2, bottom left 4, bottom right 8.
const QUAD = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

export default function sparks(): Frame {
  const { cols, rows } = meta;
  const g: string[][] = Array.from({ length: rows }, () => new Array(cols));
  const heat = new Float32Array(cols * rows), top = new Float32Array(cols * rows);
  // Spark i: when it left the cut, its speed, angle and how long it glows.
  // Most leave close along the tangent of the rim; the grinder bites harder
  // and softer by turns.
  const spark = (i: number): Spark | null => {
    const t0 = (i + hash(i, 1)) / RATE;
    const press = 0.72 + 0.28 * Math.sin(t0 * 1.9) * Math.sin(t0 * 0.7 + 1);
    if (hash(i, 2) > press) return null;
    let deg = 4 + 30 * ((hash(i, 3) + hash(i, 6)) / 2);
    if (hash(i, 7) < 0.1) deg += 25 * hash(i, 8); // a few kicked higher off the guard
    const ang = (deg * Math.PI) / 180, v = 34 + 44 * hash(i, 4);
    return { t0, vx: v * Math.cos(ang), vy: (v * Math.sin(ang)) / 2, life: 0.3 + (LIFE - 0.3) * hash(i, 5) ** 0.8 };
  };
  const mark = (c: number, r: number, h: number, ch: string) => {
    if (c < 0 || c >= cols || r < 0 || r >= FLOOR) return;
    const k = r * cols + c;
    heat[k] += h;
    if (h > top[k]) {
      top[k] = h;
      g[r][c] = ch;
    }
  };
  const along = (vx: number, vy: number) => {
    const a = (Math.atan2(2 * vy, vx) * 180) / Math.PI;
    return a > 60 || a < -60 ? "|" : a > 20 ? "/" : a < -20 ? "\\" : "-";
  };

  return (t, { paper = false } = {}) => {
    for (let r = 0; r < rows; r++) g[r].fill(" ");
    heat.fill(0);
    top.fill(0);
    for (let i = Math.floor((t - LIFE) * RATE) - 1; i <= Math.floor(t * RATE); i++) {
      const s = spark(i);
      if (!s) continue;
      const a = t - s.t0;
      if (a < 0 || a > s.life) continue;
      const p = at(s, a);
      if (!p) continue;
      const [x, y, vx, vy, b] = p;
      const h = (1 - a / s.life) ** 1.4 * (b ? 0.5 : 1); // landing on the plate cools it
      // In flight, a hot spark draws a streak back along its path.
      if (!b && h > 0.35) {
        const n = Math.ceil(Math.hypot(vx, 2 * vy) * 0.04 * h);
        const ch = along(vx, vy);
        for (let k = n; k >= 1; k--) {
          const q = at(s, Math.max(0, a - (k / n) * 0.04 * h))!;
          mark(Math.floor(q[0]), Math.floor(q[1]), h * 0.45, ch);
        }
      }
      mark(Math.floor(x), Math.floor(y), h, h > 0.75 ? "*" : h > 0.5 ? "+" : h > 0.25 ? "·" : ".");
    }
    // Where many hot sparks crowd, at the bite, the spray burns solid.
    for (let r = 0; r < FLOOR; r++)
      for (let c = 0; c < cols; c++) {
        const v = heat[r * cols + c];
        if (v > 4) g[r][c] = "#";
        else if (v > 1.8) g[r][c] = "*";
      }

    // The grinder, drawn over the sparks from four samples a cell: bright
    // parts as quadrant blocks for a crisp outline, dim ones as shade.
    const spin = t * 2 * Math.PI * 0.6; // the bottom of the disc runs toward the spray
    for (let r = 0; r < FLOOR; r++)
      for (let c = 0; c < cols; c++) {
        let mask = 0, hit = 0, sum = 0, lit = 0;
        for (let q = 0; q < 4; q++) {
          const v = tool(c + 0.25 + 0.5 * (q & 1), r + 0.25 + 0.5 * (q >> 1), spin);
          if (v < 0) continue;
          hit++;
          if (v >= 0.6) {
            mask |= 1 << q;
            lit += v;
          } else sum += v;
        }
        if (!hit) continue;
        if (paper) {
          const k = Math.round(((sum + lit) / hit) * 4);
          g[r][c] = hit < 2 ? " " : SHADE[Math.max(1, 4 - k)];
        } else if (mask === 15) g[r][c] = lit / 4 > 0.9 ? "█" : "▓";
        else if (mask) g[r][c] = QUAD[mask];
        else g[r][c] = SHADE[Math.round((sum / hit) * 4)];
      }
    // The bite: white heat where the rim comes out of the cut.
    const flick = hash(Math.floor(t * 30), 9);
    g[FLOOR - 1][Math.floor(EX)] = flick < 0.5 ? "@" : "#";
    // The plate: a lit top edge over its front face.
    for (let c = 0; c < cols; c++) {
      g[FLOOR][c] = "▄";
      g[FLOOR + 1][c] = SHADE[2];
      g[FLOOR + 2][c] = SHADE[paper ? 3 : 1];
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
