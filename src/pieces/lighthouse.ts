/*
 * lighthouse: a banded lighthouse on a heap of rocks at night. Its beam turns
 * round the lantern, long when it crosses the frame and a flash when it faces
 * us, lighting the haze and the waves beneath; surf bursts on the rocks.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lighthouse",
  category: "objects",
  note: "a beam sweeping over night sea from a lighthouse on rocks",
  cols: 64,
  rows: 30,
  fps: 20,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const TC = 32; // the tower's column
const LAMP = 5; // the lamp's row
const HORIZON = 19;
const PERIOD = 8; // seconds a turn
const TOP = 9, FOOT = 24; // the shaft's rows
const WT = 2.1, WB = 3.1; // its half width at the top and the foot, in rows
const BAND = 3; // rows to a band, dark and light in turn
// Boulders heaped round the foot, back to front, as [x, y, half width, half height,
// waterline]: x in rows from the tower. The two behind it stand clear of the sea.
const ROCKS: [number, number, number, number, number][] = [
  [-3.9, 21.1, 2.3, 1.7, 99], [3.9, 20.9, 2.4, 1.8, 99], [-6.6, 22.9, 2.3, 1.6, 23.9], [6.7, 22.7, 2.2, 1.5, 23.6],
  [-1.7, 23.5, 2.7, 1.8, 24.8], [3.1, 23.8, 2.5, 1.7, 25.1], [-9.3, 24.5, 1.5, 0.9, 25], [9.2, 24.2, 1.3, 0.8, 24.7],
];
const BEHIND = 2; // the boulders the tower stands in front of
// Where surf strikes: the boulder, the side it breaks on (none for foam alone), and when in the swell.
const SURF: [number, number, number][] = [[6, -1, 0], [7, 1, 0.45], [3, 1, 0.8], [2, -1, 0.3], [4, 0, 0.62], [5, 0, 0.15]];
const SWELL = 3.2; // seconds between breakers

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export default function lighthouse(): Frame {
  const { cols, rows } = meta;
  const N = cols * rows;
  // The lighthouse and its rocks never move: light as 0..1 where they are, -1 where they are not.
  const still = new Float32Array(N).fill(-1);
  const rockAt = new Int8Array(N).fill(-1);
  const moon = (u: number, v: number, nz: number) => Math.max(0, -0.5 * u - 0.45 * v + 0.75 * nz); // lit from the upper left
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c, x = (c - TC) / 2, y = r + 0.5;
      // The rocks behind the tower first, then the tower, then the rocks before it.
      const boulder = (i: number) => {
        const [bx, by, rx, ry, wl] = ROCKS[i];
        const u = (x - bx) / rx, v = (y - by) / ry, q = u * u + v * v;
        if (q >= 1 || y > wl + 0.5) return false;
        const nz = Math.sqrt(1 - q);
        // A dark rim on each, so heaped boulders keep apart; a little grain.
        still[k] = (0.06 + 0.86 * moon(u, v, nz)) * Math.min(1, 0.15 + nz * 1.8) + 0.06 * (hash(c, r) - 0.5);
        rockAt[k] = i;
        return true;
      };
      for (let i = 0; i < BEHIND; i++) boulder(i);
      // The shaft: banded, round, a door at its foot and a slit of a light in a band.
      if (r >= TOP && r <= FOOT) {
        const w = WT + ((WB - WT) * (r - TOP)) / (FOOT - TOP);
        if (Math.abs(x) <= w) {
          const u = x / (w + 0.25), nz = Math.sqrt(1 - u * u);
          const dark = Math.floor((r - TOP) / BAND) % 2 === 1;
          let v = (dark ? 0.24 : 0.92) * (0.2 + 0.8 * moon(u, 0, nz));
          if (r >= FOOT - 3 && r < FOOT && Math.abs(x) < 0.6) v = 0.03;
          if (r === TOP + BAND + 1 && x === 0) v = 0.03;
          still[k] = v;
          rockAt[k] = -1;
        }
      }
      // The gallery: a rail of posts, and the deck under it in shadow.
      if (r === TOP - 2 && Math.abs(x) <= 2.9) still[k] = Math.abs(x) > 2.6 ? 0.55 : (c - TC) % 2 ? 0.2 : 0.6 - 0.25 * (x / 3);
      if (r === TOP - 1 && Math.abs(x) <= 3) still[k] = 0.45 * (0.25 + 0.75 * moon(x / 3.2, 0.3, Math.sqrt(1 - (x / 3.2) ** 2)));
      // The roof: a dome with a vent on top, moonlit on the left.
      if (r >= LAMP - 3 && r <= LAMP - 2) {
        const rw = r === LAMP - 2 ? 1.85 : 1.15;
        if (Math.abs(x) <= rw) {
          const u = x / (rw + 0.3);
          still[k] = 0.12 + 0.6 * moon(u, -0.4, Math.sqrt(1 - u * u));
        }
      }
      if (r === LAMP - 4 && x === 0) still[k] = 0.5;
      for (let i = BEHIND; i < ROCKS.length; i++) boulder(i);
    }
  // Stars, a few and faint.
  const stars: [number, string][] = [];
  for (let i = 0; i < 24; i++) {
    const c = Math.floor(hash(i, 1) * cols), r = Math.floor(hash(i, 2) * (HORIZON - 2));
    if (still[r * cols + c] < 0 && Math.abs(c - TC) > 4) stars.push([r * cols + c, hash(i, 3) < 0.2 ? "*" : hash(i, 3) < 0.6 ? "." : "·"]);
  }
  // The surf: where each breaker strikes, at the waterline on its boulder's outer flank.
  const surf = SURF.map(([i, side, ph]): [number, number, number, number] => {
    const [bx, , rx, , wl] = ROCKS[i];
    return [TC + 2 * (bx + rx * side * 0.95), wl - 0.2, side, ph];
  });

  // The beam in the haze through a cell: a cone seen side on, so the more it
  // turns toward or away from us the shorter, wider and brighter it looks.
  const beamAt = (dx: number, dy: number, c: number, s: number) => {
    const fore = Math.max(Math.abs(c), 0.1);
    const ax = Math.sign(c) || 1, ay = Math.min(0.35, 0.02 / fore);
    const m = Math.hypot(ax, ay), a = (dx * ax + dy * ay) / m;
    if (a <= 0) return 0;
    const across = Math.abs(dx * ay - dy * ax) / m;
    const half = 0.5 + a * (0.11 / fore);
    return Math.exp(-((across / half) ** 4)) * Math.exp(-a / (22 * fore)) * Math.min(1.6, 1 / fore ** 0.3) * (s < 0 ? 0.75 : 1);
  };
  // On paper the beam stays ink, drawn only in the light end of the ramp, a pale shaft.
  const BEAM = [" .:-=+*#", " ..::--="];

  return (t, { paper = false } = {}) => {
    const th = -0.35 + (2 * Math.PI * t) / PERIOD;
    const c = Math.cos(th), s = Math.sin(th);
    const face = Math.max(0, s) ** 10; // the lens turned square to us
    const out: string[] = new Array(N).fill(" ");
    const light = new Float32Array(cols);
    const ramp = BEAM[paper ? 1 : 0];
    for (let r = 0; r < rows; r++)
      for (let cc = 0; cc < cols; cc++) {
        const k = r * cols + cc, dx = (cc - TC) / 2, dy = r + 0.5 - (LAMP + 0.5);
        const glare = Math.exp(-((Math.hypot(dx, dy) / (1.2 + 2.2 * face)) ** 2)) * (0.5 + 1.2 * face);
        if (r < HORIZON) {
          const b = beamAt(dx, dy, c, s) + glare;
          if (r === LAMP) light[cc] = b;
          if (still[k] >= 0) continue;
          const i = Math.min(7, Math.floor(b * 6 + 0.35 * hash(cc, r)));
          if (i > 0) out[k] = ramp[i];
          continue;
        }
        // The sea: crests rolling in, finer toward the horizon, lit under the beam.
        const d = r - HORIZON + 1, x = cc / (3.2 / d + 0.6);
        const wave = Math.sin(x * 0.9 + d * 1.7 - t * 2.2 + Math.sin(x * 0.31 + d) * 1.5) + 0.6 * Math.sin(x * 0.43 - d * 0.9 + t * 1.3);
        const lit = Math.min(1, (light[cc] || 0) * 0.9 + glare * 0.5) * Math.exp(-(d - 1) / 6);
        if (wave > 0.9 - 0.5 * lit) out[k] = lit > 0.5 ? "=" : lit > 0.2 ? "~" : d < 3 ? "-" : "~";
        else if (wave > 0.4 - 0.4 * lit && (d < 3 || lit > 0.15)) out[k] = d < 3 ? "." : "-";
        else if (d === 1) out[k] = "_";
      }
    for (const [k, ch] of stars) if (out[k] === " ") out[k] = ch;
    // The lighthouse and rocks over the rest, each boulder washed by the swell at
    // its own waterline; the lantern glows from within.
    const swell = ROCKS.map((b, i) => b[4] + 0.45 * Math.sin((2 * Math.PI * t) / SWELL + i * 1.9) + 0.25 * Math.sin(t * 1.3 + i));
    for (let k = 0; k < N; k++) {
      const v = still[k];
      if (v < 0) continue;
      if (rockAt[k] >= 0 && Math.floor(k / cols) + 0.5 > swell[rockAt[k]]) continue;
      const i = Math.max(1, Math.min(9, Math.round(v * 9)));
      out[k] = RAMP[paper ? 10 - i : i];
    }
    const glow = 0.75 + 0.25 * face;
    for (let r = LAMP - 1; r <= LAMP + 1; r++)
      for (let x = -3; x <= 3; x++) {
        const edge = Math.abs(x) === 3, bar = Math.abs(x) === 2;
        const v = edge ? 0.34 : bar ? 0.2 : glow * (1 - 0.1 * Math.abs(x)) * (r === LAMP ? 1 : 0.85);
        const i = Math.max(1, Math.min(9, Math.round(v * 9)));
        // On paper the glass, being light, keeps to the pale end like the beam.
        out[r * cols + TC + x] = paper && !edge && !bar ? ramp[Math.min(7, Math.round(v * 7))] : RAMP[paper ? 10 - i : i];
      }
    // The lamp, and the rays when it faces us.
    const L = LAMP * cols + TC;
    out[L] = face > 0.3 ? "@" : s > -0.2 ? "*" : "o";
    if (face > 0.5) {
      out[L - cols] = out[L + cols] = "|";
      out[L - 1] = out[L + 1] = "=";
    }
    // Surf: a breaker bursts on a boulder, its spray thrown up in a fan that falls back as drops.
    surf.forEach(([x0, y0, side, ph], n) => {
      const u = (((t / SWELL + ph) % 1) + 1) % 1, tt = u * SWELL;
      if (tt > 1.6) return;
      // Foam spreading along the waterline where it broke.
      const fr = Math.floor(y0 + 0.7);
      for (let j = -4; j <= 4; j++) {
        const cx = Math.round(x0) + j;
        if (tt < 1.3 && Math.abs(j) <= 1 + tt * 3 && cx >= 0 && cx < cols && fr < rows) out[fr * cols + cx] = tt < 0.5 && Math.abs(j) < 2 ? "=" : "~";
      }
      if (!side) return;
      // The spray, a fan of drops thrown up and out off the rock, thick at first, falling back as it thins.
      for (let j = 0; j < 18; j++) {
        const f = j / 17, h1 = hash(j, n + 7), h2 = hash(j, n + 19);
        const vx = side * (1 + 13 * f * f) + (h1 - 0.5) * 3, vy = (11 - 6 * f) * (0.8 + 0.4 * h2);
        const up = vy - 18 * tt > 0;
        for (let back = 0; back <= (up ? 1 : 0); back++) {
          const ts = tt - back * 0.06;
          const cx = Math.round(x0 + vx * ts), cy = Math.round(y0 - vy * ts + 9 * ts * ts);
          if (ts < 0 || cy < 0 || cy >= rows || cx < 0 || cx >= cols || cy > y0 + 0.3) continue;
          const k = cy * cols + cx;
          if (rockAt[k] >= 0 && tt > 0.2) continue;
          out[k] = back ? (out[k] === " " || out[k] === "~" ? "'" : out[k]) : tt < 0.22 ? (f < 0.4 ? "#" : "*") : up ? "*" : tt < 1.15 ? ":" : ".";
        }
      }
    });
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
