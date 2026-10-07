/*
 * black-hole: a Schwarzschild black hole and its disk, seen almost edge on.
 * Rays are traced once through the bent space; then only the gas turns,
 * faster near the hole, the side coming toward us brighter.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "black hole",
  category: "space",
  note: "a black hole, its lensed disk turning, one side brighter",
  cols: 64,
  rows: 20,
  fps: 15,
} satisfies Meta;

// The disk is light, not shade, so the ramp keeps its sense on paper too.
const RAMP = " .:-=+*#%@";
const SX = 3, SY = 4; // rays per cell across and down
const D = 30, IN = 3, OUT = 9; // camera distance, the disk's inner and outer edge, in Schwarzschild radii
const TILT = 0.15; // the camera's height above the disk plane, in radians
const SPAN = 0.34; // half the view's width, as a tangent
const GAIN = 1.6, FLOOR = 0.03; // exposure, and the faintest light that shows
const LOOP = 60; // seconds until the gas comes round to where it started
const BANDS = 12; // rings of gas, each turning a whole number of times a loop
const SPIN = 7; // turns a loop at the inner edge; Kepler sets the rest
const BMAX = 12, NB = 1500, H = 0.02; // the table of paths: impact parameters and step

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A ray stays in a plane through the hole, and its path there depends only on
// its impact parameter b. In that plane u = 1/r obeys u'' = 1.5u^2 - u in the
// angle a swept from the camera; each path is stepped with RK4 until it falls
// in or leaves, and kept as u at every step.
function paths(): Float32Array[] {
  const f = (u: number) => 1.5 * u * u - u;
  const table: Float32Array[] = [];
  for (let n = 0; n < NB; n++) {
    const b = ((n + 0.5) / NB) * BMAX;
    let u = 1 / D, w = Math.sqrt(1 - (b / D) ** 2) / b;
    const us = [u];
    while (u < 1 && (u > 1 / (OUT + 1) || w > 0)) {
      const k1 = w, l1 = f(u);
      const k2 = w + (H / 2) * l1, l2 = f(u + (H / 2) * k1);
      const k3 = w + (H / 2) * l2, l3 = f(u + (H / 2) * k2);
      const k4 = w + H * l3, l4 = f(u + H * k3);
      u += (H / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      w += (H / 6) * (l1 + 2 * l2 + 2 * l3 + l4);
      us.push(u);
    }
    table.push(Float32Array.from(us));
  }
  return table;
}

export default function blackHole(): Frame {
  const { cols, rows } = meta;
  const cw = (2 * SPAN) / cols; // one cell's width as a tangent; it stands twice as tall
  const s = Math.sin(TILT), c = Math.cos(TILT);
  const table = paths();

  // Each band's gas is a ring of noise: a few whole harmonics, so it closes.
  const rand = mulberry32(17);
  const TAB = 256;
  const band: { tab: Float32Array; turns: number }[] = [];
  for (let b = 0; b < BANDS; b++) {
    const r = IN + ((OUT - IN) * b) / (BANDS - 1);
    const turns = Math.max(1, Math.round(SPIN * (IN / r) ** 1.5));
    const waves = [2, 3, 5, 8, 13].map((k): [number, number, number] => [k, rand() * 6.283, (0.5 + rand()) / Math.sqrt(k)]);
    const tab = new Float32Array(TAB);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < TAB; i++) {
      for (const [k, p, a] of waves) tab[i] += a * Math.sin((k * 2 * Math.PI * i) / TAB + p);
      lo = Math.min(lo, tab[i]);
      hi = Math.max(hi, tab[i]);
    }
    for (let i = 0; i < TAB; i++) tab[i] = 0.45 + (0.55 * (tab[i] - lo)) / (hi - lo);
    band.push({ tab, turns });
  }

  // Each ray: its plane (e1 toward the camera, e2 along the ray), then the
  // angles where its height s cos a + e2y sin a is zero, a half turn apart.
  // A crossing inside the disk keeps what never changes: bands, angle, weight.
  const cells = Array.from({ length: cols * rows }, (): number[] => []);
  const empty = new Uint8Array(cols * rows).fill(1);
  for (let j = 0; j < rows * SY; j++) {
    const y = (rows / 2 + 0.5 - (j + 0.5) / SY) * 2 * cw; // half a row high: the arc over the hole is the taller one
    for (let i = 0; i < cols * SX; i++) {
      const x = ((i + 0.5) / SX - cols / 2) * cw;
      const k = Math.floor(j / SY) * cols + Math.floor(i / SX);
      const n = Math.hypot(x, y, 1);
      const d = [x / n, (y * c - s) / n, (y * s + c) / n];
      const out = d[1] * s - d[2] * c;
      const side = Math.sqrt(1 - out * out);
      const e2 = [d[0] / side, (d[1] - out * s) / side, (d[2] + out * c) / side];
      const us = table[Math.min(NB - 1, Math.floor((D * side * NB) / BMAX))];
      if (us[us.length - 1] >= 1) empty[k] = 0;
      // Images that wind more than once round the hole are thinner than a
      // cell and only speckle the shadow, so they are left out.
      const end = Math.min((us.length - 1) * H, 5.6);
      let light = 1;
      for (let a = (Math.atan2(-s, e2[1]) + 2 * Math.PI) % Math.PI; a < end; a += Math.PI) {
        const p = a / H, q = Math.floor(p);
        const r = 1 / (us[q] + (us[q + 1] - us[q]) * (p - q));
        if (r <= IN || r >= OUT) continue;
        const phi = Math.atan2(Math.sin(a) * e2[2] - Math.cos(a) * c, Math.sin(a) * e2[0]);
        const edge = Math.min(1, (r - IN) / 0.7) * (1 - ((r - IN) / (OUT - IN)) ** 2);
        const doppler = 1 - 0.5 * Math.cos(phi);
        const pos = ((r - IN) / (OUT - IN)) * (BANDS - 1);
        const b0 = Math.min(BANDS - 2, Math.floor(pos));
        empty[k] = 0;
        cells[k].push(b0, pos - b0, phi, (light * edge * doppler * (IN / r) ** 1.5) / (SX * SY));
        light *= 0.45; // a crossing seen through the disk is dimmer
      }
    }
  }

  // A few faint stars where the sky is clear.
  const stars = new Uint8Array(cols * rows);
  for (let k = 0; k < cols * rows; k++) stars[k] = empty[k] && rand() < 0.03 ? 1 : 0;

  const at = (b: number, a: number) => {
    const i = Math.floor((a / (2 * Math.PI)) * TAB) % TAB;
    return band[b].tab[i < 0 ? i + TAB : i];
  };

  return (t) => {
    const turn = (2 * Math.PI * (t % LOOP)) / LOOP;
    let out = "";
    for (let r = 0; r < rows; r++) {
      if (r) out += "\n";
      for (let q = 0; q < cols; q++) {
        const k = r * cols + q;
        const h = cells[k];
        let sum = 0;
        for (let i = 0; i < h.length; i += 4) {
          const b = h[i], fr = h[i + 1], phi = h[i + 2];
          const g0 = at(b, phi - band[b].turns * turn), g1 = at(b + 1, phi - band[b + 1].turns * turn);
          sum += h[i + 3] * (g0 + (g1 - g0) * fr);
        }
        const v = Math.min(1, Math.max(0, sum * GAIN - FLOOR) / (1 - FLOOR)) ** 0.75;
        const ch = RAMP[Math.round(v * (RAMP.length - 1))];
        out += ch === " " && stars[k] ? "." : ch;
      }
    }
    return out;
  };
}
