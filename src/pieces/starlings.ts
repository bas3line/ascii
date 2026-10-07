/*
 * starlings: a murmuration. Each bird matches its neighbours' heading, keeps
 * to their middle and makes room for the one beside it, while a slow drift
 * wheels the cloud about the middle. Every so often a falcon cuts through it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "starlings",
  category: "creatures",
  note: "a murmuration wheeling about, split by a passing falcon",
  cols: 64,
  rows: 16,
  fps: 30,
} satisfies Meta;

const CW = 0.6, RH = 1.2; // a column and a row, in em
const N = 320, DT = 1 / 30;
const WARM = 200, PASS = 210; // steps before the first frame; between falcons
const FIRST = WARM - 10; // the step the first falcon comes in on
const R = 1.6, SEP = 0.85; // neighbours are this close; this close is too close
const LOOK = 0.6, TURN = 90; // how far ahead a bird looks for the edge; how hard it turns
const FLEE = 4.2; // birds this close to the falcon scatter

// A smooth wave in [-1, 1] with period p.
const osc = (t: number, p: number) => {
  const u = 1 - Math.abs(2 * (t / p - Math.floor(t / p)) - 1);
  return 2 * u * u * (3 - 2 * u) - 1;
};

export default function starlings(): Frame {
  const { cols, rows } = meta;
  const W = cols * CW, H = rows * RH;
  const MX = 1.5, MY = 1.2; // the open sky's oval, in from each side
  const GX = Math.ceil(W / R), GY = Math.ceil(H / R);
  let seed = 26;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = W * (0.3 + 0.3 * rnd());
    y[i] = H * (0.3 + 0.4 * rnd());
    vx[i] = 6 + 2 * rnd();
    vy[i] = 2 * rnd() - 1;
  }
  const head = new Int32Array(GX * GY), next = new Int32Array(N);
  let k = 0, fx = NaN, fy = 0, fd = -1;

  const step = () => {
    const t = k * DT, ph = (k - FIRST + PASS * 9) % PASS, hunting = k++ >= FIRST && ph < 90;
    const tx = W * (0.5 + 0.12 * osc(t, 23)), ty = H * (0.5 + 0.1 * osc(t + 4, 11));
    let cy = 0;
    for (let i = 0; i < N; i++) cy += y[i] / N;
    // Each falcon comes in from the side the last one left by, level with the
    // flock, and bends toward the middle of it as it goes.
    if (hunting && ph === 0) [fd, fx, fy] = [-fd, fd < 0 ? -2 : W + 2, cy];
    fx = hunting ? fx + fd * 20 * DT : NaN;
    if (hunting) fy += (cy - fy) * 3 * DT;
    head.fill(-1);
    for (let i = 0; i < N; i++) {
      const c = Math.min(GY - 1, Math.max(0, Math.floor(y[i] / R))) * GX + Math.min(GX - 1, Math.max(0, Math.floor(x[i] / R)));
      next[i] = head[c];
      head[c] = i;
    }
    for (let i = 0; i < N; i++) {
      const gx0 = Math.floor(x[i] / R), gy0 = Math.floor(y[i] / R);
      let n = 0, sx = 0, sy = 0, svx = 0, svy = 0, px = 0, py = 0;
      for (let gy = Math.max(0, gy0 - 1); gy <= Math.min(GY - 1, gy0 + 1); gy++) {
        for (let gx = Math.max(0, gx0 - 1); gx <= Math.min(GX - 1, gx0 + 1); gx++) {
          for (let j = head[gy * GX + gx]; j >= 0; j = next[j]) {
            const dx = x[j] - x[i], dy = y[j] - y[i], d2 = dx * dx + dy * dy;
            if (j === i || d2 > R * R) continue;
            n++;
            sx += dx; sy += dy; svx += vx[j]; svy += vy[j];
            if (d2 < SEP * SEP) (px -= dx / (d2 + 0.02)), (py -= dy / (d2 + 0.02));
          }
        }
      }
      // Drift; align, cohere and separate.
      let ax = (tx - x[i]) * 0.25, ay = (ty - y[i]) * 0.5;
      if (n) {
        ax += (svx / n - vx[i]) * 3 + (sx / n) * 0.5 + px * 4;
        ay += (svy / n - vy[i]) * 3 + (sy / n) * 0.5 + py * 4;
      }
      // A bird heading out of the open sky, an oval in the frame, turns back
      // toward the middle, harder the further out it is headed. It turns
      // rather than brakes, so the cloud wheels short of the edge.
      const lx = (x[i] + vx[i] * LOOK - W / 2) / (W / 2 - MX), ly = (y[i] + vy[i] * LOOK - H / 2) / (H / 2 - MY);
      const out = Math.hypot(lx, ly) - 0.6;
      if (out > 0) {
        const s = Math.hypot(vx[i], vy[i]);
        const side = vx[i] * (H / 2 - y[i]) - vy[i] * (W / 2 - x[i]) > 0 ? 1 : -1;
        ax += (-vy[i] / s) * side * TURN * out;
        ay += (vx[i] / s) * side * TURN * out;
      }
      // The falcon: birds near it break hard away and fly fast.
      let top = 10;
      const dx = x[i] - fx, dy = y[i] - fy, d2 = dx * dx + dy * dy;
      if (d2 < FLEE * FLEE) {
        ax += (dx / (d2 + 0.4)) * 90;
        ay += (dy / (d2 + 0.4)) * 90;
        top = 15;
      }
      const ux = vx[i] + ax * DT, uy = vy[i] + ay * DT;
      const s = Math.sqrt(ux * ux + uy * uy), m = s > top ? top / s : s < 5 ? 5 / s : 1;
      vx[i] = ux * m;
      vy[i] = uy * m;
    }
    for (let i = 0; i < N; i++) (x[i] += vx[i] * DT), (y[i] += vy[i] * DT);
  };
  while (k < WARM) step();

  // Each character holds two places, one over the other: ' is a bird up top,
  // . one below, : two, and heavier marks as more crowd in.
  const top = new Uint8Array(cols * rows), bot = new Uint8Array(cols * rows);
  const RAMP = "  :;+*%%##";
  const draw = () => {
    top.fill(0);
    bot.fill(0);
    for (let i = 0; i < N; i++) {
      const c = Math.floor(x[i] / CW), r = Math.floor((y[i] / RH) * 2);
      if (c >= 0 && c < cols && r >= 0 && r < rows * 2) (r & 1 ? bot : top)[(r >> 1) * cols + c]++;
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, n = top[i] + bot[i];
        line += n === 1 ? (top[i] ? "'" : ".") : RAMP[Math.min(RAMP.length - 1, n)];
      }
      lines.push(line);
    }
    // The falcon, beating its wings as it goes.
    const fc = Math.round(fx / CW), fr = Math.floor(fy / RH);
    if (fc > -2 && fc < cols + 1 && fr >= 0 && fr < rows) {
      const bird = (k >> 2) & 1 ? "\\v/" : "-v-";
      const row = lines[fr].split("");
      for (let i = 0; i < 3; i++) if (fc - 1 + i >= 0 && fc - 1 + i < cols) row[fc - 1 + i] = bird[i];
      lines[fr] = row.join("");
    }
    return lines.join("\n");
  };

  return (t) => {
    const want = WARM + Math.floor(t / DT + 1e-6);
    for (let s = 0; s < 12 && k < want; s++) step();
    return draw();
  };
}
