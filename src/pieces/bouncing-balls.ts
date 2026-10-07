/*
 * bouncing-balls: rubber balls dropping onto a floor and knocking into each
 * other, squashing on every landing; a ball that comes to rest crouches and leaps.
 */
import type { Frame, Meta } from "../types.ts";

export interface BouncingBallsOptions {
  [key: string]: unknown;
  balls: number;
}

export const meta = {
  name: "bouncing balls",
  category: "physics",
  note: "rubber balls bouncing lower each time, squashing on landing",
  cols: 64,
  rows: 22,
  fps: 30,
  options: { balls: 3 },
} satisfies Meta<BouncingBallsOptions>;

const RAMP = " .:-=+*#%@";
const G = 80; // gravity, rows per second squared
const H = 1 / 900; // physics step
const STIFF = 120; // contact stiffness: a ball of radius r rings at STIFF / r
const SIZES = [3, 2.3, 1.7, 2.6, 2]; // radii, in rows; a column is half a row
const BOUNCE = [0.84, 0.82, 0.8, 0.83, 0.81];
const SPREAD = 2.1; // seconds between the balls' first leaps
const WARM = 9.1; // seconds played before the first frame
const SHADOW = "▀▒░"; // a shadow's glyphs, from a ball on the floor to one high above it

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Ball {
  r: number;
  k: number;
  c: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rest: number;
  crouch: number | null;
  sq: number;
}

export default function bouncingBalls({ balls = 3 }: Partial<BouncingBallsOptions> = {}): Frame {
  const { cols, rows } = meta;
  const W = cols / 2; // the floor's width, in rows
  const FLOOR = rows - 1; // the floor line sits on the top edge of this row
  const m = Math.hypot(-0.45, 0.55, 0.7);
  const [lx, ly, lz] = [-0.45 / m, 0.55 / m, 0.7 / m];
  const hm = Math.hypot(lx, ly, lz + 1);
  const [hx, hy, hz] = [lx / hm, ly / hm, (lz + 1) / hm]; // halfway between the light and the eye
  const rand = mulberry32(11);
  const n = Math.max(1, Math.min(SIZES.length, Math.round(balls)));
  const bs: Ball[] = Array.from({ length: n }, (_, i) => {
    const r = SIZES[i], w = STIFF / r, e = BOUNCE[i];
    const z = -Math.log(e) / Math.hypot(Math.PI, Math.log(e));
    const x = W * (0.2 + (0.6 * i) / Math.max(1, n - 1));
    // They start resting on the floor and take turns to leap, so they never move in step.
    return { r, k: w * w, c: 2 * z * w, x, y: r, vx: 0, vy: 0, rest: 0, crouch: -SPREAD * i, sq: 0 };
  });

  const launch = (b: Ball) => {
    // High enough to fill the frame, never so high the ball leaves it.
    b.vy = Math.sqrt(2 * G * (FLOOR - 1.5 - 2 * b.r) * (0.75 + 0.25 * rand()));
    b.vx = (W / 2 - b.x) * 0.3 + (rand() - 0.5) * 10;
    b.y = b.r; // spring straight back to round
    b.crouch = null;
    b.rest = 0;
  };

  const step = () => {
    for (const b of bs) {
      if (b.crouch !== null) {
        // Settled: crouch into the floor for a moment, then spring up.
        b.crouch += H;
        const u = Math.max(0, Math.min(1, b.crouch / 0.45));
        b.sq = 0.3 * b.r * u * u * (3 - 2 * u);
        b.y = b.r - b.sq;
        b.vx *= 1 - 6 * H;
        if (u >= 1) launch(b);
        continue;
      }
      b.vy -= G * H;
      const d = b.r - b.y;
      if (d > 0) {
        b.vy += Math.max(0, b.k * d - b.c * b.vy) * H;
        b.vx *= 1 - 0.8 * H;
        b.rest += H;
        if (b.rest > 0.3 && b.crouch === null) b.crouch = 0;
      } else b.rest = 0;
      b.sq = Math.max(0, d);
      // A knock from below never sends a ball out of the top of the frame.
      b.vy = Math.min(b.vy, Math.sqrt(2 * G * Math.max(0, FLOOR - 1.2 - b.r - b.y)));
      b.x += b.vx * H;
      b.y += b.vy * H;
      if (b.x < b.r) (b.x = b.r), (b.vx = Math.abs(b.vx) * 0.85);
      if (b.x > W - b.r) (b.x = W - b.r), (b.vx = -Math.abs(b.vx) * 0.85);
    }
    // Balls that touch trade momentum along the line between their centres.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = bs[i], b = bs[j];
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), gap = a.r + b.r - dist;
        if (gap <= 0 || dist === 0) continue;
        const nx = dx / dist, ny = dy / dist;
        const ma = a.r * a.r, mb = b.r * b.r;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const jm = (-1.85 * vn) / (1 / ma + 1 / mb);
          (a.vx -= (jm * nx) / ma), (a.vy -= (jm * ny) / ma), (b.vx += (jm * nx) / mb), (b.vy += (jm * ny) / mb);
        }
        const pa = mb / (ma + mb), pb = ma / (ma + mb);
        (a.x -= nx * gap * pa), (a.y -= ny * gap * pa), (b.x += nx * gap * pb), (b.y += ny * gap * pb);
        if (a.crouch !== null && ny < 0) a.crouch = null;
        if (b.crouch !== null && ny > 0) b.crouch = null;
      }
    }
  };

  const advance = (dt: number) => {
    for (let i = 0; i < Math.round(dt / H); i++) step();
  };
  for (let i = 0; i < WARM * 30; i++) advance(1 / 30);
  let last = 0;

  const out: string[] = new Array(cols * rows);
  // How bright rubber is at a normal: soft light from the upper left, a small highlight set in from the rim.
  const shade = (nx: number, ny: number, nz: number) => {
    const d = Math.max(0, nx * lx + ny * ly + nz * lz);
    const s = Math.max(0, nx * hx + ny * hy + nz * hz) ** 40;
    return Math.min(1, 0.14 + 0.66 * d + 0.5 * s + 0.12 * Math.max(0, -ny)); // the floor lights the underside a little
  };

  const draw = (b: Ball, paper: boolean) => {
    // A squashed ball keeps its area: shorter by what it has sunk, wider to match.
    const ry = b.r - b.sq, rx = (b.r * b.r) / ry;
    const cy = FLOOR - ry - Math.max(0, b.y - b.r), cx = b.x * 2;
    const runs: [number, string][][] = [];
    for (let r = Math.floor(cy - ry); r <= cy + ry; r++) {
      const run: [number, string][] = [];
      runs.push(run);
      if (r < 0 || r >= FLOOR) continue;
      for (let c = Math.floor(cx - 2 * rx); c <= cx + 2 * rx; c++) {
        if (c < 0 || c >= cols) continue;
        let hit = 0, v = 0;
        for (let j = 0; j < 4; j++) {
          for (let i = 0; i < 4; i++) {
            const u = (c + 0.125 + i * 0.25 - cx) / 2 / rx, w = (r + 0.125 + j * 0.25 - cy) / ry;
            const q = u * u + w * w;
            if (q < 1) (hit++, (v += shade(u, -w, Math.sqrt(1 - q))));
          }
        }
        if (hit < 4) continue;
        // A cell the rim only clips gets a lighter glyph, so the edge is smooth rather than outlined.
        const ink = paper ? 1.1 - v / hit : v / hit;
        const g = Math.round(Math.min(1, ink) * Math.sqrt(hit / 16) * (RAMP.length - 1));
        if (g > 0) run.push([r * cols + c, RAMP[g]]);
      }
    }
    // A sliver of a row on the very top or bottom, over a much wider one, reads as a nub: leave it off.
    const n = runs.length;
    if (n > 2 && runs[0].length < 3 && runs[1].length > 5) runs[0].length = 0;
    if (n > 2 && runs[n - 1].length < 3 && runs[n - 2].length > 5) runs[n - 1].length = 0;
    for (const run of runs) for (const [k, g] of run) out[k] = g;
  };

  return (t, { paper = false } = {}) => {
    advance(Math.min(0.1, Math.max(0, t - last)));
    last = t;
    out.fill(" ");
    for (let c = 0; c < cols; c++) out[FLOOR * cols + c] = "▔";
    for (const b of bs) {
      // The shadow narrows and pales as the ball rises.
      const h = Math.max(0, b.y - b.r) / (FLOOR - 2 * b.r);
      const rx = (b.r * b.r) / (b.r - b.sq), sw = rx * 2 * (1 - 0.6 * h);
      for (let c = Math.ceil(b.x * 2 - sw); c < b.x * 2 + sw; c++) {
        const edge = Math.abs(c + 0.5 - b.x * 2) / sw;
        const g = Math.min(SHADOW.length - 1, Math.floor(h * 2.6 + edge * 1.3));
        if (c >= 0 && c < cols) out[FLOOR * cols + c] = SHADOW[g];
      }
    }
    // Smaller balls are nearer, so they draw last.
    for (const b of [...bs].sort((p, q) => q.r - p.r)) draw(b, paper);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
