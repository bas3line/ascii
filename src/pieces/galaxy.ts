/*
 * galaxy: a two-armed spiral seen at a tilt. The arm pattern turns slowly as
 * a whole while its stars orbit faster near the core, as in a real disc.
 * It glows on empty sky, so on paper it keeps its ramp and prints as a negative.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "galaxy",
  category: "space",
  note: "a tilted spiral galaxy turning, its inner stars the fastest",
  cols: 64,
  rows: 26,
  fps: 20,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const TAU = Math.PI * 2;

const mulberry32 = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export default function galaxy(): Frame {
  const { cols, rows } = meta;
  const cx = cols / 2, cy = rows / 2;
  const R = 28; // disc radius in columns
  const INC = 0.78; // cos of the tilt: how round the disc looks
  const PA = -0.14; // the long axis is turned a little off level
  const cpa = Math.cos(PA), spa = Math.sin(PA);
  const WIND = 1 / Math.tan(0.5); // log spiral pitch, open enough to read as two arms
  const PATTERN = 0.1; // the arms turn as one, slowly (radians per second)
  const rand = mulberry32(11);
  // Stars that orbit on their own along the outer disc, on a flat rotation curve.
  const stars = Array.from({ length: 110 }, () => ({
    r: 0.3 + 0.62 * Math.sqrt(rand()),
    a: rand() * TAU,
    b: 0.2 + 0.2 * rand(),
  }));
  const field = new Float32Array(cols * rows);
  // Background stars, one to each patch of a 6 by 4 grid that falls clear of
  // the disc, and never on the frame's outer row or column.
  const bg: [number, string][] = [];
  for (let gy = 0; gy < 4; gy++)
    for (let gx = 0; gx < 6; gx++)
      for (let tries = 0; tries < 6; tries++) {
        const c = 1 + Math.floor(((gx + rand()) / 6) * (cols - 2));
        const r = 1 + Math.floor(((gy + rand()) / 4) * (rows - 2));
        const x = c - cx, y = (r - cy) * 2;
        const u = (x * cpa + y * spa) / R, v = (-x * spa + y * cpa) / (R * INC);
        if (u * u + v * v < 1.4) continue;
        bg.push([c + r * cols, rand() < 0.2 ? "+" : "."]);
        break;
      }

  // Brightness at a point on screen, in columns from the centre (y down, rows doubled).
  const light = (x: number, y: number, turn: number) => {
    const u = (x * cpa + y * spa) / R;
    const v = (-x * spa + y * cpa) / (R * INC);
    const r = Math.hypot(u, v);
    if (r > 1.1) return 0;
    const phi = Math.atan2(v, u);
    // The bulge is a squat ball, so on screen it looks rounder than the disc.
    const bulge = 1.6 * Math.exp(-((Math.hypot(u, v * INC * 1.4) / 0.17) ** 2));
    const disc = 0.15 * Math.exp(-r / 0.3);
    const w = 2 * (phi - turn - Math.log(r + 1e-6) * WIND);
    const arm = (0.5 + 0.5 * Math.cos(w)) ** 3.5;
    const dust = (0.5 + 0.5 * Math.cos(w - 1.3)) ** 8; // on each arm's inner edge
    // Arms grow out of the bulge, then dim and thin away to two loose tips.
    const s = Math.min(1, Math.max(0, (r - 0.12) / 0.16));
    const reach = s * s * (3 - 2 * s) * (1.3 - 0.8 * r) * Math.exp(-((r / 0.8) ** 3));
    return (bulge + disc + arm * reach) * (1 - 0.75 * dust * reach * Math.min(1, r / 0.3));
  };

  return (t) => {
    const turn = -PATTERN * t;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5 - cx;
        const y = (r + 0.25 - cy) * 2, y2 = (r + 0.75 - cy) * 2;
        field[c + r * cols] = (light(x, y, turn) + light(x, y2, turn)) / 2;
      }
    // Inner stars sweep round faster: angular speed falls off as 1 / r. Each
    // brightens what is already there, so they glint on the arms and leave
    // the dark lanes and the smooth core alone.
    for (const s of stars) {
      const a = s.a - (s.b * t) / (s.r + 0.08);
      const u = s.r * Math.cos(a) * R, v = s.r * Math.sin(a) * R * INC;
      const x = u * cpa - v * spa, y = u * spa + v * cpa;
      const c = Math.floor(cx + x), r = Math.floor(cy + y / 2);
      if (c >= 0 && c < cols && r >= 0 && r < rows) field[c + r * cols] *= 1.6;
    }
    const out: string[] = new Array(cols * rows);
    for (let k = 0; k < cols * rows; k++) {
      const b = 1 - Math.exp(-1.8 * field[k]);
      out[k] = RAMP[Math.min(RAMP.length - 1, Math.floor(b * RAMP.length))];
    }
    for (const [k, ch] of bg) if (out[k] === " ") out[k] = ch;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
