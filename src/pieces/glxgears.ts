/*
 * glxgears: the three gears of gears.c, with their sizes, places and view, in
 * block shades. Each gear's face keeps one shade, as each has one colour
 * there; the walls of the teeth and the bores are bright where they catch the light.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "glxgears",
  category: "shapes",
  note: "three meshing gears turning, after glxgears",
  cols: 56,
  rows: 31,
  fps: 24,
} satisfies Meta;

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const SCALE = 4.2; // columns per unit
const DS = 0.05; // spacing of sampled points, in units
const SPEED = 17; // degrees a second, for the big gear
const SHADE = " ░▒▓█";
const DEPTH = 0.8; // tooth depth; gears.c has 0.7

interface Gear {
  r0: number;
  r: number;
  w: number;
  n: number;
  x: number;
  y: number;
  k: number;
  off: number;
  face: number;
  r1: number;
  r2: number;
}

// gear(inner, outer, width, teeth), its place, its turn as k * a + off, and
// its face's shade. Twelve and six teeth for twenty and ten, so each tooth is
// wide enough to read.
const GEARS = [
  { r0: 1.0, r: 4.0, w: 1.0, n: 12, x: -3.0, y: -2.0, k: 1, off: 0, face: 3 },
  { r0: 0.5, r: 2.0, w: 2.0, n: 6, x: 3.1, y: -2.0, k: -2, face: 2 },
  { r0: 1.3, r: 2.0, w: 0.5, n: 6, x: -3.1, y: 4.2, k: -2, face: 2 },
] as Gear[];
// Offsets that set each small gear's gap on a tooth of the big one.
for (const g of GEARS) {
  g.r1 = g.r - DEPTH / 2;
  g.r2 = g.r + DEPTH / 2;
  if (g.k === 1) continue;
  const big = GEARS[0], dir = Math.atan2(g.y - big.y, g.x - big.x);
  g.off = (dir + Math.PI - ((0.875 - (dir * big.n) / TAU + 0.375) * TAU) / g.n) / RAD;
}

// glRotatef(view_rotx = 20) then glRotatef(view_roty = 30); light at (5, 5, 10).
const cY = Math.cos(30 * RAD), sY = Math.sin(30 * RAD);
const cX = Math.cos(20 * RAD), sX = Math.sin(20 * RAD);
const LIGHT = [5, 5, 10].map((c) => c / Math.hypot(5, 5, 10));
const across = (x: number, z: number) => x * cY + z * sY;
const up = (x: number, y: number, z: number) => y * cX + (x * sY - z * cY) * sX;

// The tooth outline as radius by angle: up a flank, across, down, the root.
function radius(g: Gear, th: number): number {
  const u = (th * g.n) / TAU - Math.floor((th * g.n) / TAU);
  const rise = u < 0.25 ? u * 4 : u < 0.5 ? 1 : u < 0.75 ? (0.75 - u) * 4 : 0;
  return g.r1 + (g.r2 - g.r1) * rise;
}

export default function glxgears(): Frame {
  const { cols, rows } = meta;
  const W = cols * 2, H = rows * 2; // two samples a cell each way
  const depth = new Float32Array(W * H);
  const tone = new Int8Array(W * H); // a shade, 1 to 4
  const who = new Int8Array(W * H);
  const lines: string[] = new Array(rows);

  // Centre the gears' outer circles in the frame.
  let left = Infinity, right = -Infinity, high = -Infinity, low = Infinity;
  for (const g of GEARS) {
    for (let th = 0; th < TAU; th += 0.02) {
      for (const z of [-g.w / 2, g.w / 2]) {
        const x = g.x + g.r2 * Math.cos(th), y = g.y + g.r2 * Math.sin(th);
        left = Math.min(left, across(x, z)), (right = Math.max(right, across(x, z)));
        high = Math.max(high, up(x, y, z)), (low = Math.min(low, up(x, y, z)));
      }
    }
  }
  const LEFT = left - (cols / SCALE - (right - left)) / 2;
  const HIGH = high + ((2 * rows) / SCALE - (high - low)) / 2;

  return (t, { paper = false } = {}) => {
    const a = SPEED * t;
    depth.fill(-Infinity);
    who.fill(-1);

    // A point and its normal in gear space; a wall's normal has no z.
    function plot(i: number, x: number, y: number, z: number, nx: number, ny: number, face?: boolean) {
      const col = Math.floor((across(x, z) - LEFT) * SCALE * 2);
      const row = Math.floor((HIGH - up(x, y, z)) * SCALE);
      if (col < 0 || col >= W || row < 0 || row >= H) return;
      const k = row * W + col, d = y * sX + (z * cY - x * sY) * cX;
      if (d <= depth[k]) return;
      const vx = nx * cY, vy = ny * cX + nx * sY * sX, vz = ny * sX - nx * sY * cX;
      if (!face && vz < 0) return;
      depth[k] = d;
      who[k] = i;
      // A wall is full where it faces the light, and faint where it does not.
      tone[k] = face ? GEARS[i].face : vx * LIGHT[0] + vy * LIGHT[1] + vz * LIGHT[2] > 0.42 ? 4 : 1;
    }

    GEARS.forEach((g, i) => {
      const spin = (g.k * a + g.off) * RAD, h = g.w / 2;
      // The front face, ring by ring. The back face never turns to the eye.
      for (let r = g.r0; r < g.r2; r += DS) {
        for (let th = 0; th < TAU; th += DS / r) {
          if (r <= radius(g, th)) plot(i, g.x + r * Math.cos(th + spin), g.y + r * Math.sin(th + spin), h, 0, 0, true);
        }
      }
      // The outer wall, walked by arc length so the flanks are as dense as the tips.
      for (let th = 0; th < TAU; ) {
        const r = radius(g, th), dr = (radius(g, th + 1e-4) - radius(g, th - 1e-4)) / 2e-4;
        const l = Math.hypot(r, dr), c = Math.cos(th + spin), s = Math.sin(th + spin);
        for (let z = -h; z <= h; z += DS) plot(i, g.x + r * c, g.y + r * s, z, (r * c + dr * s) / l, (r * s - dr * c) / l);
        th += DS / l;
      }
      // The bore, facing in.
      for (let th = 0; th < TAU; th += DS / g.r0) {
        const c = Math.cos(th), s = Math.sin(th);
        for (let z = -h; z <= h; z += DS) plot(i, g.x + g.r0 * c, g.y + g.r0 * s, z, -c, -s);
      }
    });

    // A cell shows the shade that covers most of its four samples, the nearer
    // on a tie, and nothing if fewer than two are covered, so the gaps between
    // teeth stay open. On paper the shades turn over, so ink is still shadow.
    const count: number[] = new Array(15), near: number[] = new Array(15);
    for (let row = 0; row < rows; row++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        count.fill(0), near.fill(-Infinity);
        let covered = 0, best = -1;
        for (const k of [2 * row * W + 2 * col, 2 * row * W + 2 * col + 1, (2 * row + 1) * W + 2 * col, (2 * row + 1) * W + 2 * col + 1]) {
          if (who[k] < 0) continue;
          const c = who[k] * 5 + tone[k];
          covered++, count[c]++, (near[c] = Math.max(near[c], depth[k]));
          if (best < 0 || count[c] > count[best] || (count[c] === count[best] && near[c] > near[best])) best = c;
        }
        const v = best % 5;
        line += covered < 2 ? " " : SHADE[paper ? 5 - v : v];
      }
      lines[row] = line;
    }
    return lines.join("\n");
  };
}
