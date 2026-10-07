/*
 * contour-map: an island drawn as survey lines, with a dotted line offshore,
 * its hills slowly reshaping. Each line keeps to the one cell nearest it, so
 * it stays one stroke thick at any angle.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "contour map",
  category: "nature",
  note: "an island in contour lines, its hills slowly reshaping",
  cols: 72,
  rows: 20,
  fps: 8,
} satisfies Meta;

const CW = 0.6; // cell width, in ems
const RH = 1.2; // cell height, in ems
const LEVEL = 0.26; // height between neighbouring contour lines
const START = 280; // where in the drift the loop is centred, in seconds
const PERIOD = 60; // seconds for the hills to come back round
const SWING = 1.15; // how far each swell's phase wanders, in radians
const CROWD = 1; // lines closer than this, in ems, keep only every other one
const SPECK = 4; // pieces of line shorter than this are dropped
const FLOOR = 0.55; // the least the swells leave of the hill

// Swells laid over one long hill: wavenumbers per em, phase, drift, height, and
// where in the loop each one wanders, so the shape never just plays backwards.
const WAVES: [number, number, number, number, number, number][] = [
  [0.21, 0.08, 0.0, 0.055, 0.51, 0],
  [-0.13, 0.27, 1.7, -0.035, 0.42, 2.1],
  [0.34, -0.19, 4.1, 0.025, 0.31, 4.0],
  [0.09, 0.41, 2.6, 0.045, 0.25, 1.1],
  [-0.47, -0.12, 5.3, -0.065, 0.17, 5.2],
];

export default function contourMap(): Frame {
  const { cols, rows } = meta;
  const X = (cols / 2) * CW, Y = (rows / 2) * RH; // half the frame, in ems
  const W = cols + 1, N = cols * rows;
  const h = new Float64Array(W * (rows + 1));
  const mid = new Float64Array(N), gx = new Float64Array(N), gy = new Float64Array(N);
  const lvl = new Int16Array(N); // the line each cell draws, 0 for none
  const off = new Float64Array(N); // how far the cell's centre is from that line, in ems
  const dot = new Uint8Array(N), doff = new Float64Array(N); // the same for the dotted line offshore
  const sea = new Uint8Array(N), seen = new Uint8Array(N);
  const out = new Array<string>(N);

  // The hill falls to nothing at the frame's edges, so every line closes inside
  // it. The swells never cut it below FLOOR, so the coast keeps no deep inlets.
  const height = (x: number, y: number, phases: number[]) => {
    let n = 1;
    for (let i = 0; i < WAVES.length; i++) {
      const [kx, ky, p, , a] = WAVES[i];
      n += a * Math.sin(kx * x + ky * y + p + phases[i]);
    }
    n = FLOOR + Math.log1p(Math.exp(6 * (n - FLOOR))) / 6;
    return Math.exp(-((x / 17) ** 2) - (y / 8) ** 2) * (1 - (x / X) ** 2) * (1 - (y / Y) ** 2) * n;
  };
  const steep = (i: number) => Math.abs(gx[i]) * CW > Math.abs(gy[i]) * RH; // steeper than a cell's diagonal

  // Each line keeps only the cell nearest it across its own stroke: one per
  // row where it runs steep, one per column where it runs flat. Then pieces
  // too short to read as a line are dropped.
  const thin = (lv: Int16Array | Uint8Array, of: Float64Array) => {
    const keep = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const L = lv[i];
      if (!L) continue;
      const r = (i / cols) | 0, c = i % cols;
      const [p, q] = steep(i) ? [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1] : [r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1];
      const beaten = (j: number) => j >= 0 && lv[j] === L && (of[j] < of[i] || (of[j] === of[i] && j < i));
      if (!beaten(p) && !beaten(q)) keep[i] = 1;
    }
    seen.fill(0);
    for (let i = 0; i < N; i++) {
      if (!keep[i] || seen[i]) continue;
      const part = [i];
      seen[i] = 1;
      for (let n = 0; n < part.length; n++) {
        const r = (part[n] / cols) | 0, c = part[n] % cols;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc, j = rr * cols + cc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && keep[j] && !seen[j] && lv[j] === lv[i]) (seen[j] = 1), part.push(j);
          }
      }
      if (part.length < SPECK) for (const j of part) keep[j] = 0;
    }
    return keep;
  };

  return (t) => {
    const turn = (2 * Math.PI * t) / PERIOD;
    const phases = WAVES.map(([, , , w, , psi]) => w * START + Math.sign(w) * SWING * Math.sin(turn + psi));
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++) h[r * W + c] = height((c - cols / 2) * CW, (r - rows / 2) * RH, phases);

    // The sea is the low ground reached from the frame's edge; a hollow inland is not.
    for (let r = 0, i = 0; r < rows; r++)
      for (let c = 0; c < cols; c++, i++) {
        const a = h[r * W + c], b = h[r * W + c + 1], d = h[(r + 1) * W + c], e = h[(r + 1) * W + c + 1];
        mid[i] = (a + b + d + e) / 4;
        gx[i] = (b + e - a - d) / (2 * CW);
        gy[i] = (d + e - a - b) / (2 * RH);
        lvl[i] = dot[i] = 0;
        const lo = Math.min(a, b, d, e), hi = Math.max(a, b, d, e);
        const g = Math.hypot(gx[i], gy[i]) || 1e-9;
        const L = Math.round(mid[i] / LEVEL);
        // Where lines crowd together, every other one gives way; the coast never does.
        if (L >= 1 && lo < L * LEVEL && hi >= L * LEVEL && (LEVEL / g > CROWD || L % 2 === 1))
          (lvl[i] = L), (off[i] = Math.abs(L * LEVEL - mid[i]) / g);
        if (lo < LEVEL / 2 && hi >= LEVEL / 2) (dot[i] = 1), (doff[i] = Math.abs(LEVEL / 2 - mid[i]) / g);
      }
    sea.fill(0);
    const stack: number[] = [];
    for (let i = 0; i < N; i++) {
      const r = (i / cols) | 0, c = i % cols;
      if ((r === 0 || c === 0 || r === rows - 1 || c === cols - 1) && mid[i] < LEVEL / 2) (sea[i] = 1), stack.push(i);
    }
    while (stack.length) {
      const i = stack.pop()!, r = (i / cols) | 0, c = i % cols;
      for (const j of [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1])
        if (j >= 0 && !sea[j] && mid[j] < LEVEL / 2) (sea[j] = 1), stack.push(j);
    }

    // The dotted line runs only along the open sea, not round a hollow inland.
    for (let i = 0; i < N; i++) {
      const r = (i / cols) | 0, c = i % cols;
      if (dot[i] && !sea[i] && !(c > 0 && sea[i - 1]) && !(c < cols - 1 && sea[i + 1]) && !(r > 0 && sea[i - cols]) && !(r < rows - 1 && sea[i + cols])) dot[i] = 0;
    }
    const keep = thin(lvl, off), dots = thin(dot, doff);

    for (let i = 0; i < N; i++) {
      out[i] = dots[i] ? "·" : " ";
      if (!keep[i]) continue;
      const L = lvl[i], c = i % cols;
      const angle = Math.atan2(Math.abs(gx[i]), Math.abs(gy[i])) * (180 / Math.PI); // the line, off horizontal
      // Where the line crosses the cell, 0 at its top to 1 at its bottom.
      const y = 0.5 + (L * LEVEL - mid[i]) / ((gy[i] || 1e-9) * RH);
      // A slash beside a nearer slash of the same line becomes the flat step between them.
      const twin = (j: number) => j >= 0 && keep[j] && lvl[j] === L && off[j] < off[i];
      const paired = angle > 45 && angle <= 63 && (twin(c > 0 ? i - 1 : -1) || twin(c < cols - 1 ? i + 1 : -1));
      if (angle > 76) out[i] = "|";
      else if (angle > 45 && !(paired && (y < 0.35 || y > 0.65))) out[i] = gx[i] * gy[i] > 0 ? "/" : "\\";
      else if (angle < 10 && !paired) out[i] = y < 0.6 ? "-" : "_";
      else out[i] = y < 0.3 ? "'" : y < 0.6 ? "-" : y < 0.85 ? "." : "_";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
