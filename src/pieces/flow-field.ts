/*
 * flow-field: particles carried left to right by a smooth noise field whose
 * currents pull them together, so their fading trails gather into a few
 * winding streams that merge and part as the field slowly changes.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "flow field",
  category: "generative",
  note: "particle trails gathering into winding, merging streams",
  cols: 64,
  rows: 22,
  fps: 20,
} satisfies Meta;

const STREAMS = 4; // currents across the field
const RATE = 16; // particles let go from the left edge a second
const SPEED = 9; // cell widths a second
const FADE = 1.6; // seconds for a trail to fade to about a third
const BEND = 12; // how far a current wanders up and down, in cell widths
const SCALE = 0.085; // noise cycles per cell width along a current
const PULL = 0.22; // how hard a current draws particles in, per cell width
const REACH = 7; // how far a current's pull is felt, in cell widths
const DRIFT = 0.04; // how fast the currents change
const TURN = 1.2; // the steepest heading off the horizontal, in radians
const WARM = 9; // seconds simulated before the first frame

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A fixed number in [0, 1) for each lattice point.
function hash(i: number, j: number, k: number): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(k, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// Smooth value noise along a line, changing with time z, in [0, 1).
function noise(x: number, z: number, k: number): number {
  const i = Math.floor(x), j = Math.floor(z);
  const s = (f: number) => f * f * f * (f * (f * 6 - 15) + 10);
  const u = s(x - i), v = s(z - j);
  const a = hash(i, j, k) + (hash(i + 1, j, k) - hash(i, j, k)) * u;
  const b = hash(i, j + 1, k) + (hash(i + 1, j + 1, k) - hash(i, j + 1, k)) * u;
  return a + (b - a) * v;
}

export default function flowField(): Frame {
  const { cols, rows } = meta;
  const W = cols, H = rows * 2; // the field in cell widths; a row is two of them tall
  const rand = mulberry32(0x5eed);
  const ink = new Float32Array(cols * rows);
  const dir = new Uint8Array(cols * rows);
  const ps: { x: number; y: number; o: number }[] = [];
  const ys = new Float32Array(STREAMS), ss = new Float32Array(STREAMS);

  // Where each current runs at column x, and its slope there.
  const currents = (x: number, z: number) => {
    for (let k = 0; k < STREAMS; k++) {
      // Wandering freely mid-frame, eased back in near the top and bottom.
      const at = (xx: number) => {
        const y = ((k + 0.5) / STREAMS - 0.5) * H + BEND * (2 * noise(xx * SCALE + k * 7.3, z + k * 3.1, k) - 1);
        return H / 2 + (H / 2 - 3) * Math.tanh(y / (H / 2 - 3));
      };
      ys[k] = at(x);
      ss[k] = at(x + 0.5) - at(x - 0.5);
    }
  };

  // The heading of a particle in lane `o` at (x, y): along the nearby
  // currents, and in towards them.
  const heading = (x: number, y: number, o: number, z: number): number => {
    currents(x, z);
    let num = 0, den = 1e-9, best = 0, near = 1e9;
    for (let k = 0; k < STREAMS; k++) {
      const d = ys[k] + o - y, w = Math.exp(-((d / REACH) ** 2));
      num += w * (ss[k] + PULL * d);
      den += w;
      if (Math.abs(d) < near) (near = Math.abs(d)), (best = ss[k] + PULL * d);
    }
    const slope = den > 1e-4 ? num / den : best;
    return Math.max(-TURN, Math.min(TURN, Math.atan(slope)));
  };

  // A glyph for each direction, from the true angle on screen: a cell is
  // twice as tall as it is wide, so / and \ stand at about 63 degrees.
  const STEEP = Math.atan(2);
  const glyph = (a: number): string => {
    const tilt = Math.abs(a);
    if (tilt < STEEP / 2) return "-";
    if (tilt > (Math.PI / 2 + STEEP) / 2) return "|";
    return a > 0 ? "\\" : "/"; // y grows downward
  };

  const mark = (x: number, y: number, a: number) => {
    const c = Math.floor(x), r = Math.floor(y / 2);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return;
    const k = r * cols + c;
    ink[k] = 1;
    dir[k] = glyph(a).charCodeAt(0);
  };

  let clock = 0, due = 0;
  const step = (dt: number) => {
    clock += dt;
    const keep = Math.exp(-dt / FADE);
    for (let k = 0; k < ink.length; k++) ink[k] *= keep;
    const z = clock * DRIFT;
    // New particles come in at the left edge: most near a current, some
    // anywhere, to show the field drawing them in.
    for (due -= dt; due <= 0; due += 1 / RATE) {
      currents(0, z);
      const y = rand() < 0.75 ? ys[Math.floor(rand() * STREAMS)] + (rand() - 0.5) * 8 : 2 + rand() * (H - 4);
      ps.push({ x: 0, y, o: (rand() - 0.5) * 3.2 });
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      const a = heading(p.x, p.y, p.o, z);
      const dx = Math.cos(a) * SPEED * dt, dy = Math.sin(a) * SPEED * dt;
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dy * 0.5) * 1.5));
      for (let s = 1; s <= n; s++) mark(p.x + (dx * s) / n, p.y + (dy * s) / n, a);
      p.x += dx;
      p.y += dy;
      if (p.x >= W || p.y < 0 || p.y >= H) ps.splice(i, 1);
    }
  };
  for (let i = 0; i < WARM * meta.fps; i++) step(1 / meta.fps);

  let last = 0;
  return (t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    if (dt > 0) step(dt);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let s = "";
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c, v = ink[k];
        s += v > 0.5 ? String.fromCharCode(dir[k]) : v > 0.27 ? "·" : v > 0.14 ? "." : " ";
      }
      lines.push(s);
    }
    return lines.join("\n");
  };
}
