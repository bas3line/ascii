/*
 * sea-swell: a long ocean swell seen side on, a rounded crest over a long flat
 * trough. A sailboat rides it, pitching with the slope under its hull, while
 * the crests hide and show the far horizon.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sea swell",
  category: "nature",
  note: "a long swell lifting a small sailboat as it rolls under",
  cols: 64,
  rows: 14,
  fps: 20,
} satisfies Meta;

const TAU = Math.PI * 2;
const HORIZON = 4; // row of the far sea
const MEAN = 6.1; // the still water line, in rows from the top
const SURF = "_.-'"; // the line's glyph by where it crosses its cell, bottom to top
// The boat level, bow up on the right, and bow up on the left. Row 0 is the
// hull's bottom, which sits on the water; the mast stands in column 3.
const BOAT = {
  level: ["   |\\", "   | \\", "   |__\\", "\\________/"],
  right: ["   |\\", "   | \\", "   |__\\ _/", "\\____.-'"],
  left: ["   |\\", "   | \\", "\\_ |__\\", "  '-.____/"],
};
const HULL = 10; // the hull's length in columns
const PITCH = 0.55; // rows the water rises along the hull before the boat pitches to it
const BOAT_X = 18; // column of the boat's left end
// Each wave: [length in columns, waves a second, trough to crest in rows,
// crest sharpness]. The second runs back against the first, so the crests
// rise and fall in height; both come back round every 16 seconds.
const WAVES = [
  [64, 0.0625, 3.8, 0.5],
  [32, -0.0625, 0.9, 0.3],
];
const LEAN = 2; // how far the swell's crest runs ahead of its trough, in columns
const START = 2.5; // seconds into the loop where t = 0 falls: the boat on the rising face
const K = TAU / 32; // the swell's wavenumber in rows, so the motion dies away with depth

// One trochoid, -0.5 in the trough to 0.5 on the crest.
function trochoid(u: number, q: number) {
  let v = u;
  for (let i = 0; i < 4; i++) v = u + (q / TAU) * Math.sin(TAU * v);
  return 0.5 * Math.cos(TAU * v);
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function seaSwell(): Frame {
  const { cols, rows } = meta;
  const g: string[][] = Array.from({ length: rows }, () => new Array(cols));
  const sy = new Float64Array(cols + 1);
  const rand = mulberry32(21);

  // Ripples in the water as [column, depth below the surface, glyph]: short
  // runs near the top, fewer and finer the deeper they lie. A few more lie on
  // the far sea under the horizon.
  const flecks: [number, number, string][] = [];
  for (let d = 1.5; d < 10; d += 1) {
    const glyph = d < 3 ? "~" : d < 5.5 ? "-" : "·";
    const gap = 3 + d * 2, run = d < 3 ? 3 : d < 5.5 ? 2 : 1;
    const from = Math.floor(rand() * cols);
    for (let i = 0; i < cols - run; i += Math.floor(gap * (0.6 + rand()))) {
      const n = 1 + Math.floor(rand() * run);
      for (let k = 0; k < n; k++, i++) flecks.push([(from + i) % cols, d, glyph]);
    }
  }
  const far: [number, number, string][] = [];
  for (let r = HORIZON + 1; r < HORIZON + 4; r++)
    for (let c = Math.floor(rand() * 12); c < cols; c += 11 + Math.floor(rand() * 14)) far.push([r, c, rand() < 0.5 ? "-" : "--"]);

  // The surface in rows from the top at column edge x, the swell's crest
  // sheared forward so its front face is the steeper one.
  const surface = (x: number, t: number) => {
    const [l, v, a, q] = WAVES[0];
    let h = trochoid(x / l - t * v, q);
    for (let i = 0; i < 3; i++) h = trochoid((x - LEAN * (h + 0.5)) / l - t * v, q);
    let y = MEAN - a * h;
    for (let i = 1; i < WAVES.length; i++) {
      const [l, v, a, q] = WAVES[i];
      y -= a * trochoid(x / l - t * v, q);
    }
    return y;
  };

  return (time) => {
    const t = time + START;
    for (const row of g) row.fill(" ");
    for (let x = 0; x <= cols; x++) sy[x] = surface(x, t);
    const top = (c: number) => Math.floor((sy[c] + sy[c + 1]) / 2); // the surface's row

    // The far sea shows only over the near trough, stopping a cell short of it.
    const clear = (c: number) => c < 0 || c >= cols || HORIZON < Math.min(sy[c], sy[c + 1]) - 0.9;
    for (let c = 0; c < cols; c++) if (clear(c - 1) && clear(c) && clear(c + 1)) g[HORIZON][c] = "_";
    for (const [r, c, s] of far)
      for (let k = 0; k < s.length; k++) if (c + k < cols && g[HORIZON][c + k] === "_" && r < top(c + k) - 1) g[r][c + k] = "-";

    // The near water: flecks ride the swell, less the deeper they lie.
    for (const [c, d, ch] of flecks) {
      const y = sy[c] * 0.5 + sy[c + 1] * 0.5;
      const r = Math.floor(MEAN + (y - MEAN) * Math.exp(-K * d) + d);
      if (r > top(c) && r < rows) g[r][c] = ch;
    }
    for (let c = 0; c < cols; c++) {
      const a = sy[c], b = sy[c + 1], y = (a + b) / 2, r = Math.floor(y);
      g[r][c] = Math.abs(b - a) > 0.8 ? (b < a ? "/" : "\\") : SURF[Math.min(3, Math.floor((1 - (y - r)) * 4))];
    }

    // The boat surges a little with the water, forward on the crests and back
    // in the troughs, and pitches to the slope along its hull.
    const [l, v] = WAVES[0];
    const c0 = Math.round(BOAT_X - 1.5 * Math.sin(TAU * ((BOAT_X + HULL / 2) / l - t * v)));
    const rise = surface(c0 + 1, t) - surface(c0 + HULL - 1, t);
    const tilt = rise > PITCH ? 1 : rise < -PITCH ? -1 : 0;
    const shape = tilt > 0 ? BOAT.right : tilt < 0 ? BOAT.left : BOAT.level;
    const at = tilt > 0 ? c0 + 2.5 : tilt < 0 ? c0 + HULL - 2.5 : c0 + HULL / 2;
    const water = Math.floor(surface(at, t));
    // The hull takes the place of the water line under it, with a cell clear
    // at either end, and the horizon stands back from the whole boat.
    for (let c = c0 - 3; c <= c0 + HULL + 2; c++) {
      if (c < 0 || c >= cols) continue;
      if (top(c) !== HORIZON && water - HORIZON <= 4) g[HORIZON][c] = " ";
      if (c >= c0 - 1 && c <= c0 + HULL) for (let r = water - 4; r <= Math.max(water, top(c)); r++) if (r >= 0) g[r][c] = " ";
    }
    shape.forEach((line, i) => {
      const r = water - shape.length + 1 + i;
      if (r < 0) return;
      for (let k = 0; k < line.length; k++) if (line[k] !== " ") g[r][c0 + k] = line[k];
    });
    return g.map((row) => row.join("")).join("\n");
  };
}
