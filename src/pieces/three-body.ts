/*
 * three-body: three equal masses chasing each other round one figure eight,
 * the periodic orbit of the three-body problem found by Moore and Simo.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "three-body",
  category: "space",
  note: "three equal masses sharing one figure-eight orbit",
  cols: 65,
  rows: 15,
  fps: 30,
} satisfies Meta;

const PERIOD = 6.32591398; // one lap in the orbit's own units of time
const STEPS = 7200;
const N = 720; // points kept along the path, evenly spaced in time
const LAP = 11; // seconds per lap on screen
const TRAIL = 60; // points of tail behind each body

// Leapfrog over one lap, G = 1 and unit masses, keeping the first body's path.
function integrate(): Float64Array {
  const p = [0.97000436, -0.24308753, -0.97000436, 0.24308753, 0, 0];
  const v = [0.46620368, 0.43236573, 0.46620368, 0.43236573, -0.93240737, -0.86473146];
  const acc = () => {
    const a = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6; i += 2)
      for (let j = 0; j < 6; j += 2) {
        if (i === j) continue;
        const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1];
        const r2 = dx * dx + dy * dy, r3 = r2 * Math.sqrt(r2);
        a[i] += dx / r3;
        a[i + 1] += dy / r3;
      }
    return a;
  };
  const path = new Float64Array(N * 2);
  const dt = PERIOD / STEPS;
  let a = acc();
  for (let s = 0; s < STEPS; s++) {
    if (s % (STEPS / N) === 0) path.set([p[0], p[1]], (s / (STEPS / N)) * 2);
    for (let k = 0; k < 6; k++) v[k] += (a[k] * dt) / 2;
    for (let k = 0; k < 6; k++) p[k] += v[k] * dt;
    a = acc();
    for (let k = 0; k < 6; k++) v[k] += (a[k] * dt) / 2;
  }
  return path;
}

export default function threeBody(): Frame {
  const { cols, rows } = meta;
  const path = integrate();
  let xMax = 0, yMax = 0;
  for (let i = 0; i < N; i++) {
    xMax = Math.max(xMax, Math.abs(path[2 * i]));
    yMax = Math.max(yMax, Math.abs(path[2 * i + 1]));
  }
  // The eight spans the width less a margin; a cell is twice as tall as wide.
  // The height is rounded so each lobe's flat top sits mid-row.
  const sx = (cols - 7) / (2 * xMax), sy = Math.round(yMax * sx * 0.5) / yMax;
  const at = new Int32Array(N);
  const orbit = new Array<string>(cols * rows).fill(" ");
  // The orbit itself is a sparse dotted line, a dot about every two columns,
  // each taken from the point nearest its cell's centre and chosen by how
  // high in the cell the curve passes.
  const run: { c: number; r: number; off: number; sub: number }[] = [];
  for (let i = 0; i < N; i++) {
    const x = (cols - 1) / 2 + path[2 * i] * sx;
    const y = (rows - 1) / 2 - path[2 * i + 1] * sy;
    const c = Math.round(x), r = Math.round(y), sub = y - r + 0.5;
    at[i] = r * cols + c;
    const off = (x - c) ** 2 + (2 * (sub - 0.5)) ** 2;
    const last = run[run.length - 1];
    if (last && last.c === c && last.r === r) {
      if (off < last.off) Object.assign(last, { off, sub });
    } else run.push({ c, r, off, sub });
  }
  let lx = -9, ly = -9;
  for (const { c, r, sub } of run) {
    if (Math.hypot(c - lx, 2 * (r + sub - ly)) < 1.8) continue;
    [lx, ly] = [c, r + sub];
    orbit[r * cols + c] = sub < 0.36 ? "'" : sub < 0.64 ? "·" : ".";
  }
  const cell = (i: number) => at[((i % N) + N) % N];
  const out: string[] = new Array(cols * rows);

  return (t) => {
    for (let k = 0; k < out.length; k++) out[k] = orbit[k];
    const head = Math.floor(((t / LAP) % 1) * N);
    for (let b = 0; b < 3; b++) {
      const h = head + (b * N) / 3;
      // A comet: one bright cell behind the head, then a run of : thinning
      // to a run of the faintest dot before it gives way to the orbit.
      let seen = cell(h), k = 0;
      for (let i = 1; i <= TRAIL; i++) {
        const q = cell(h - i);
        if (q === seen) continue;
        seen = q;
        k++;
        out[q] = k <= 1 ? "o" : k <= 3 || i < TRAIL * 0.45 ? ":" : "·";
      }
    }
    for (let b = 0; b < 3; b++) out[cell(head + (b * N) / 3)] = "O";
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
