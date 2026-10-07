/*
 * double-pendulum: two equal rods hung end to end from one pivot, stepped
 * with RK4. Chaotic, so it never repeats; the lower bob leaves a fading trail.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "double pendulum",
  category: "physics",
  note: "a chaotic double pendulum; its tip leaves a fading trail",
  cols: 48,
  rows: 25,
  fps: 30,
} satisfies Meta;

const G = 9.81;
const H = 1 / 240; // integrator step, in seconds of model time
const SPEED = 0.6; // model seconds per second of play
const TAP = 3; // steps between trail samples
const TRAIL = 110; // trail samples kept
const FADE = "·:+*"; // trail glyphs, oldest first
const START = [2.55, 2.9, 0, 0]; // both angles from straight down, then their rates
const WARM = 7; // model seconds run before the first frame

// Unit masses and rods. s = [angle 1, angle 2, rate 1, rate 2].
function deriv([a, b, p, q]: number[]): number[] {
  const d = a - b, sd = Math.sin(d), cd = Math.cos(d), den = 3 - Math.cos(2 * d);
  return [
    p,
    q,
    (-3 * G * Math.sin(a) - G * Math.sin(a - 2 * b) - 2 * sd * (q * q + p * p * cd)) / den,
    (2 * sd * (2 * p * p + 2 * G * Math.cos(a) + q * q * cd)) / den,
  ];
}

function rk4(s: number[]): number[] {
  const add = (u: number[], k: number[], h: number) => u.map((v, i) => v + k[i] * h);
  const k1 = deriv(s);
  const k2 = deriv(add(s, k1, H / 2));
  const k3 = deriv(add(s, k2, H / 2));
  const k4 = deriv(add(s, k3, H));
  return s.map((v, i) => v + (H / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

const kinetic = ([a, b, p, q]: number[]) => p * p + 0.5 * q * q + p * q * Math.cos(a - b);
const potential = ([a, b]: number[]) => -2 * G * Math.cos(a) - G * Math.cos(b);

export default function doublePendulum(): Frame {
  const { cols, rows } = meta;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const SY = (cy - 0.6) / 2, SX = SY * 2; // both rods reach any edge but none clips
  const E0 = kinetic(START) + potential(START);
  const grid: string[] = new Array(cols * rows);
  let s: number[], trail: [number, number][], steps: number, acc: number, last: number;

  // The lower bob's place on screen.
  const tip = ([a, b]: number[]): [number, number] => [cx + SX * (Math.sin(a) + Math.sin(b)), cy + SY * (Math.cos(a) + Math.cos(b))];
  const step = () => {
    s = rk4(s);
    // Hold the energy where it began, so long runs neither die down nor run away.
    const k = kinetic(s), room = E0 - potential(s);
    if (k > 1e-9 && room > 0) {
      const f = Math.sqrt(room / k);
      s[2] *= f;
      s[3] *= f;
    }
    if (++steps % TAP === 0) {
      trail.push(tip(s));
      if (trail.length > TRAIL) trail.shift();
    }
  };
  const reset = () => {
    s = START.slice();
    trail = [];
    steps = 0;
    acc = 0;
    last = 0;
    for (let i = 0; i < WARM / H; i++) step();
  };
  reset();

  const put = (x: number, y: number, ch: string) => {
    const c = Math.round(x), r = Math.round(y);
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r * cols + c] = ch;
  };
  // A thin rod, one glyph a cell. A shallow rod is a run of dashes on each
  // row, which meets the next row low or high in the cell; a steep one is a
  // bar or a slash a row. A cell is twice as tall as it is wide, so steep
  // means more than one row in two columns.
  const rod = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0, dy = y1 - y0, up = dx * dy < 0, slash = up ? "/" : "\\";
    if (Math.abs(dx) > Math.abs(2 * dy)) {
      const c0 = Math.round(Math.min(x0, x1)), c1 = Math.round(Math.max(x0, x1));
      const row = (c: number) => Math.floor(y0 + (dy * (Math.min(c1, Math.max(c0, c)) - x0)) / dx + 0.5);
      for (let c = c0; c <= c1; c++) {
        const r = row(c), first = row(c - 1) !== r, end = row(c + 1) !== r;
        // Left to right a rising rod comes in low and leaves high; a falling one the other way round.
        let ch = "-";
        if (first && end) ch = slash;
        else if (first) ch = up ? "_" : row(c + 2) !== r ? slash : "`";
        else if (end) ch = up ? (row(c - 2) !== r ? slash : "'") : "_";
        put(c, r, ch);
      }
    } else {
      const steep = Math.abs(dx / dy) < 0.6;
      for (let r = Math.round(Math.min(y0, y1)); r <= Math.round(Math.max(y0, y1)); r++) {
        const x = x0 + (dx * (r - y0)) / dy, c = Math.floor(x + 0.5);
        put(c, r, steep && Math.abs(x - c) < 0.3 ? "|" : slash);
      }
    }
  };

  return (t) => {
    if (t < last) reset();
    acc += Math.min(Math.max(t - last, 0), 0.1) * SPEED;
    last = t;
    while (acc >= H) {
      step();
      acc -= H;
    }
    grid.fill(" ");
    // Oldest first, a segment at a time so a fast swing leaves no gaps.
    for (let i = 1; i < trail.length; i++) {
      const ch = FADE[Math.floor((i / trail.length) * FADE.length)];
      const [x0, y0] = trail[i - 1], [x1, y1] = trail[i];
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1;
      for (let j = 0; j < n; j++) put(x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n, ch);
    }
    const [a] = s;
    const x1 = cx + SX * Math.sin(a), y1 = cy + SY * Math.cos(a);
    const [x2, y2] = tip(s);
    rod(cx, cy, x1, y1);
    rod(x1, y1, x2, y2);
    put(cx - 1, cy, "(");
    put(cx, cy, "+");
    put(cx + 1, cy, ")");
    put(x1, y1, "o");
    put(x2, y2, "@");
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
