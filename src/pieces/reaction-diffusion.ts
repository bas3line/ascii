/*
 * reaction diffusion: a Gray-Scott reaction whose spots on the left give way
 * to stripes on the right. Every few seconds the kill rate rises, the pattern
 * dies back to a few survivors, and they grow out again.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "reaction diffusion",
  category: "generative",
  note: "gray-scott spots and stripes dying back and growing out",
  cols: 60,
  rows: 24,
  fps: 20,
} satisfies Meta;

const W = 60, H = 48; // the grid, two cells to a character so they are square
const SPOTS = [0.0367, 0.0649], STRIPES = [0.03, 0.057]; // feed and kill rates
const DU = 0.45, DV = 0.225; // diffusion
const RATE = 1000; // reaction steps a second
const CYCLE = 8000; // steps from one die back to the next
const BACK = [0.1, 0.25, 0.35, 0.48], BUMP = 0.012; // the kill rate's rise over a cycle, and its height
const SEEDS = 48, WARM = 1200; // seeds scattered at the start, and steps run before the first frame
// Concentration of the second chemical. Below the floor is bare ground; above
// it a steep curve, so every feature has a crisp edge. The pattern is the ink,
// so it keeps its ramp on paper.
const RAMP = "-=*#%@";
const FLOOR = 0.12, TOP = 0.28;

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function reactionDiffusion(): Frame {
  const { cols, rows } = meta;
  const N = W * H;
  let u = new Float32Array(N).fill(1), v = new Float32Array(N);
  let u2 = new Float32Array(N), v2 = new Float32Array(N);
  const smooth = (a: number, b: number, x: number) => {
    const s = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return s * s * (3 - 2 * s);
  };
  const feed = new Float32Array(W), kill = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const s = smooth(0.1, 0.9, (1 + Math.sin((2 * Math.PI * (x + 0.5)) / W)) / 2);
    feed[x] = STRIPES[0] + (SPOTS[0] - STRIPES[0]) * s;
    kill[x] = STRIPES[1] + (SPOTS[1] - STRIPES[1]) * s;
  }
  // The frame fades toward its edges, so the pattern thins out there.
  const fade = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const ax = Math.abs((c + 0.5) / cols - 0.5) * 2, ay = Math.abs((r + 0.5) / rows - 0.5) * 2;
      fade[r * cols + c] = 1 - 0.6 * smooth(0.55, 1, Math.cbrt(ax ** 3 + ay ** 3));
    }

  const rand = mulberry32(5);
  const seed = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const i = ((cy + dy + H) % H) * W + ((cx + dx + W) % W);
        u[i] = 0.5;
        v[i] = 0.25;
      }
  };
  for (let i = 0; i < SEEDS; i++) seed(Math.floor(rand() * W), Math.floor(rand() * H));

  // Each die back is uneven: a smooth random field, new every cycle, sets
  // how hard it bites where, so the survivors fall differently each time.
  const bite = new Float32Array(N);
  const reshape = () => {
    const waves = [0, 1, 2].map(() => {
      let kx = 0, ky = 0;
      while (!kx && !ky) (kx = Math.floor(rand() * 5) - 2), (ky = Math.floor(rand() * 5) - 2);
      return [kx, ky, rand() * 6.283];
    });
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (const [kx, ky, p] of waves) s += Math.cos(2 * Math.PI * ((kx * x) / W + (ky * y) / H) + p);
        bite[y * W + x] = 1 + s / 6;
      }
  };
  const bump = (p: number) => BUMP * smooth(BACK[0], BACK[1], p) * (1 - smooth(BACK[2], BACK[3], p));

  let n = 0, cycle = -1;
  const step = () => {
    // The cycle starts on the first frame.
    const k = Math.floor((n - WARM) / CYCLE);
    if (k !== cycle) (cycle = k), reshape();
    const p = (n - WARM) / CYCLE - k;
    const b = bump(p);
    n++;
    for (let y = 0; y < H; y++) {
      const ym = ((y + H - 1) % H) * W, y0 = y * W, yp = ((y + 1) % H) * W;
      for (let x = 0; x < W; x++) {
        const xm = (x + W - 1) % W, xp = (x + 1) % W;
        const i = y0 + x;
        const lu = 0.2 * (u[ym + x] + u[yp + x] + u[y0 + xm] + u[y0 + xp]) + 0.05 * (u[ym + xm] + u[ym + xp] + u[yp + xm] + u[yp + xp]) - u[i];
        const lv = 0.2 * (v[ym + x] + v[yp + x] + v[y0 + xm] + v[y0 + xp]) + 0.05 * (v[ym + xm] + v[ym + xp] + v[yp + xm] + v[yp + xp]) - v[i];
        const uvv = u[i] * v[i] * v[i];
        u2[i] = u[i] + DU * lu - uvv + feed[x] * (1 - u[i]);
        v2[i] = v[i] + DV * lv + uvv - (feed[x] + kill[x] + b * bite[i]) * v[i];
      }
    }
    [u, u2] = [u2, u];
    [v, v2] = [v2, v];
    // Should a die back ever take everything, start again from a few seeds.
    if (p < BACK[3] && p + 1 / CYCLE >= BACK[3] && v.reduce((s, x) => s + x, 0) < 8)
      for (let i = 0; i < 4; i++) seed(Math.floor(rand() * W), Math.floor(rand() * H));
  };
  while (n < WARM) step();

  return (t) => {
    const want = WARM + Math.floor(t * RATE);
    if (want - n > RATE / 5) n = want - Math.ceil(RATE / 5); // a long pause skips ahead rather than stalls
    while (n < want) step();
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const val = ((v[2 * r * W + c] + v[(2 * r + 1) * W + c]) / 2) * fade[r * cols + c];
        const q = Math.sqrt(Math.min(1, (val - FLOOR) / (TOP - FLOOR)));
        line += val < FLOOR ? " " : RAMP[Math.min(RAMP.length - 1, Math.floor(q * RAMP.length))];
      }
      lines.push(line);
    }
    return lines.join("\n");
  };
}
