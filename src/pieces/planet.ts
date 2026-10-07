/*
 * planet: a ringed gas giant, banded and turning, lit from the upper left.
 * The rings throw a shadow across the globe and the globe one across the rings.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "planet",
  category: "space",
  note: "a banded ringed planet turning, with shadows both ways",
  cols: 64,
  rows: 18,
  fps: 20,
} satisfies Meta;

const RAMP = " .,:-=+*#%@";
const RP = 6.5; // the globe's radius, in rows
const TILT = 0.4; // how far the ring plane opens toward the eye
const ROLL = 0.2; // how far the axis leans in the picture
const DAY = 18; // seconds a turn
// The rings by radius, in globe radii: [from, to, opacity at from, at to,
// brightness]. The inner one is dark dust, a dusky band where it crosses the globe.
const RINGS: [number, number, number, number, number][] = [
  [1.22, 1.48, 0.3, 0.5, 0.1],
  [1.5, 1.9, 0.85, 1, 1],
  [1.98, 2.16, 0.8, 0.65, 0.85],
];

const unit = (v: number[]) => v.map((c) => c / Math.hypot(...v));
const SUN = unit([-0.42, 0.34, 0.84]);
const AXIS = [0, Math.cos(TILT), Math.sin(TILT)]; // the pole, in view space before the roll
const E2 = [0, -Math.sin(TILT), Math.cos(TILT)]; // the equator's direction toward the eye

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const smooth = (e0: number, e1: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
};

// Ring opacity at radius r, in globe radii, and the brightness of what is there.
let albedo = 0;
function ring(r: number) {
  for (const [a, b, p, q, w] of RINGS) if (r >= a && r < b) return (albedo = w), p + ((q - p) * (r - a)) / (b - a);
  return 0;
}

// Cloud brightness at a latitude and longitude: pale zones and dark belts
// whose edges ripple with longitude, a dark line along each edge, an oval
// storm, and darker poles.
function cloud(lat: number, lon: number) {
  const w = lat + 0.05 * Math.sin(4 * lon + 6 * lat) + 0.03 * Math.sin(9 * lon - 4 * lat + 1);
  const s = Math.cos(w * 7.2); // a pale zone on the equator, belts either side
  let v = 0.5 + 0.42 * smooth(-0.35, 0.35, s) - 0.28 * Math.exp(-((s / 0.16) ** 2));
  v += 0.06 * Math.sin(lon * 7 + lat * 21);
  const dl = ((((lon + 0.6) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const d = ((dl * Math.cos(lat)) / 0.42) ** 2 + ((lat - 0.42) / 0.12) ** 2;
  if (d < 1) v = d > 0.45 ? 0.3 : 1;
  return v * (1 - 0.35 * Math.abs(Math.sin(lat)) ** 4);
}

// A few fixed stars, from a seeded generator so every copy has the same sky.
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function planet(): Frame {
  const { cols, rows } = meta;
  const cr = Math.cos(ROLL), sr = Math.sin(ROLL);
  const lines: string[] = new Array(rows);
  const rand = mulberry32(7);
  const stars = Array.from({ length: 14 }, (): [number, number, number] => [1 + Math.floor(rand() * (cols - 2)), Math.floor(rand() * rows), rand() * 6.283]);

  // Brightness, 0 to 1, at a point on the picture in rows, or -1 for space.
  // The globe tops out below the rings, so a ring crossing it reads as brighter.
  const sample = (px: number, py: number, spin: number) => {
    const x = cr * px - sr * py, y = sr * px + cr * py; // undo the roll
    const r2 = x * x + y * y;
    let globe = -1, gz = -Infinity;
    if (r2 < RP * RP) {
      const z = Math.sqrt(RP * RP - r2), n = [x / RP, y / RP, z / RP];
      gz = z;
      const lat = Math.asin(dot(n, AXIS)), lon = Math.atan2(n[0], dot(n, E2)) - spin;
      const lit = smooth(-0.08, 0.4, dot(n, SUN));
      // The rings' shadow: follow the light from here to the ring plane.
      const s = -(y * AXIS[1] + z * AXIS[2]) / dot(SUN, AXIS);
      const shade = s > 0 ? 1 - 0.75 * ring(Math.hypot(x + s * SUN[0], y + s * SUN[1], z + s * SUN[2]) / RP) : 1;
      globe = 0.86 * cloud(lat, lon) * lit * shade * (0.7 + 0.3 * n[2]);
    }
    // The ring plane where this line of sight crosses it.
    const z = (-y * AXIS[1]) / AXIS[2];
    const op = ring(Math.sqrt(r2 + z * z) / RP);
    if (op > 0 && z > gz) {
      // The globe's shadow on the rings, on the side away from the sun.
      const b = x * SUN[0] + y * SUN[1] + z * SUN[2], c = r2 + z * z - RP * RP;
      const v = op * albedo * (b < 0 && b * b > c ? 0.04 : 1);
      return globe < 0 ? v : globe * (1 - op) + v;
    }
    return globe;
  };

  return (t, { paper = false } = {}) => {
    const spin = (2 * Math.PI * t) / DAY;
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        let sum = 0, hits = 0;
        for (let k = 0; k < 4; k++) {
          const px = (c + 0.25 + 0.5 * (k & 1) - cols / 2) * 0.5;
          const py = rows / 2 - r - 0.25 - 0.5 * (k >> 1);
          const v = sample(px, py, spin);
          if (v >= 0) (sum += v), hits++;
        }
        if (hits < 2) {
          line += " ";
          continue;
        }
        let i = Math.min(RAMP.length - 1, Math.max(1, Math.round((sum / hits) * (RAMP.length - 1))));
        if (paper) i = RAMP.length - i;
        line += RAMP[i];
      }
      lines[r] = line;
    }
    // Stars go only where nothing else is, and one in three slowly dims.
    for (const [c, r, p] of stars) {
      if (lines[r][c] !== " ") continue;
      const ch = p < 2 && Math.sin(t * 0.9 + p * 3) < -0.3 ? " " : p < 4 ? "·" : ".";
      lines[r] = lines[r].slice(0, c) + ch + lines[r].slice(c + 1);
    }
    return lines.join("\n");
  };
}
