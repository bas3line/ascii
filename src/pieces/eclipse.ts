/*
 * eclipse: a total solar eclipse. The new moon slides across the sun; the
 * last bead of sunlight flares into a diamond ring, the corona opens round
 * the black disk for totality, and the ring flashes again on the far side.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "eclipse",
  category: "space",
  note: "the moon slides over the sun; diamond ring, then corona",
  cols: 64,
  rows: 27,
  fps: 20,
} satisfies Meta;

// The sun and corona are light, not shade, so the ramp keeps its sense on
// paper: there the sun is a disk of ink and the corona a halo of it.
const RAMP = " .:-=+*#%@";
const R = 6; // the sun's radius in rows; it spans twice as many columns
const MOON = 1.06; // the moon's radius, in suns
const LOOP = 18; // seconds from one crossing to the next
const MID = 5.3; // the middle of totality, in seconds from t = 0
const TILT = 0.2; // the moon's path, radians below level
const MISS = 0.005; // how far off centre it passes, in suns
const SS = 3; // samples per cell each way for the sun's edge

// Streamers: angle, width at the limb in radians, how fast they fade outward
// in suns, and strength. They narrow as they go, so each ends in a point.
const STREAMERS = [[0.1, 0.42, 0.44, 0.85], [3.28, 0.45, 0.44, 0.8],[0.85, 0.15, 0.5, 0.6], [2.35, 0.16, 0.48, 0.6], [-0.6, 0.15, 0.45, 0.55], [3.9, 0.14, 0.42, 0.5]];
// Prominences: angle and size, small loops of gas just off the limb that the
// moon covers and uncovers as it passes.
const PROMS = [[2.9, 0.06], [-0.9, 0.05], [0.5, 0.04]];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export default function eclipse(): Frame {
  const { cols, rows } = meta;
  const n = RAMP.length - 1;
  const rand = mulberry32(11);
  const X = (c: number) => (c - cols / 2) / (2 * R), Y = (r: number) => (rows / 2 - r) / R;
  // The moon's limb is ragged with valleys and peaks: Baily's beads.
  const limb = Array.from({ length: 5 }, (_, k) => [3 + 4 * k + Math.floor(rand() * 3), rand() * 6.283, 0.006 / (1 + k * 0.4)]);
  const moonR = (a: number) => MOON + limb.reduce((s, [k, p, h]) => s + h * Math.sin(k * a + p), 0);

  // The corona's shape never changes, only how much of it shows: a bright
  // inner ring, a soft halo, the streamers and fine plumes at the poles.
  const corona = new Float32Array(cols * rows);
  const ring = new Float32Array(cols * rows); // the inner ring, which shimmers
  const angle = new Float32Array(cols * rows);
  const stars = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c, x = X(c + 0.5), y = Y(r + 0.5), d = Math.hypot(x, y), a = Math.atan2(y, x);
      angle[k] = a;
      if (d < 1) continue;
      let s = 0;
      for (const [at, w, fall, amp] of STREAMERS) {
        const off = wrap(a - at) / (w / d ** 1.7);
        s += amp * Math.exp(-off * off) * Math.exp(-(d - 1) / fall);
      }
      const pole = Math.exp(-(((Math.abs(a) - Math.PI / 2) / 0.4) ** 2)) * (0.5 + 0.5 * Math.cos(26 * a));
      ring[k] = Math.exp(-(d - 1) / 0.07);
      for (const [at, size] of PROMS) {
        const px = Math.cos(at) * (1 + size), py = Math.sin(at) * (1 + size);
        ring[k] += 1.4 * Math.exp(-(((x - px) / size) ** 2 + ((y - py) / (size * 0.8)) ** 2));
      }
      corona[k] = 0.25 * Math.exp(-(d - 1) / 0.16) + s + 0.3 * pole * Math.exp(-(d - 1) / 0.2);
      if (d > 1.7 && corona[k] < 0.02 && rand() < 0.014) stars[k] = 1;
    }
  stars[2 * cols + Math.round(cols / 2 - 2.4 * 2 * R)] = 2; // a planet

  return (t) => {
    const tau = ((((t - MID + LOOP / 2) % LOOP) + LOOP) % LOOP) - LOOP / 2;
    const d = 0.035 * tau + 0.00515 * tau ** 3; // slow near the middle, fast at the ends
    const mx = d * Math.cos(TILT) + MISS * Math.sin(TILT), my = -d * Math.sin(TILT) + MISS * Math.cos(TILT);
    const off = Math.hypot(mx, my);
    const gap = off + 1 - MOON; // the widest sliver of sun left, in suns; below 0 is totality
    const show = 1 - smooth(0, 0.07, gap); // the corona shows as the sunlight goes
    const flare = smooth(0, -0.03, gap);
    const bead = smooth(-0.004, 0.01, gap) * (1 - smooth(0.04, 0.09, gap));
    // The corona brightens as the eyes adapt through totality.
    const glow = 0.75 + 0.45 * smooth(0, -0.055, gap);
    const out: string[] = new Array(cols * rows);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        let lit = 0, moon = 0;
        for (let j = 0; j < SS; j++)
          for (let i = 0; i < SS; i++) {
            const x = X(c + (i + 0.5) / SS), y = Y(r + (j + 0.5) / SS);
            const dx = x - mx, dy = y - my, dm = Math.hypot(dx, dy);
            const inMoon = dm < MOON + 0.02 && (dm < MOON - 0.02 || dm < moonR(Math.atan2(dy, dx)));
            if (inMoon) moon++;
            else {
              const q = 1 - x * x - y * y;
              if (q > 0) lit += 0.72 + 0.28 * Math.sqrt(q);
            }
          }
        lit /= SS * SS;
        let i = lit > 0 ? Math.round(Math.max(lit ** 0.7, 0.2) * n) : 0;
        if (moon < SS * SS && corona[k] + ring[k] > 0) {
          const a = angle[k];
          const shimmer = 1 + 0.25 * Math.sin(9 * a + 1.9 * t) * Math.sin(5 * a - 1.2 * t);
          const cv = (corona[k] + 1.3 * ring[k] * shimmer) * glow;
          i = Math.max(i, Math.min(n, Math.floor(Math.min(1, cv * show) ** 0.8 * (1 - moon / (SS * SS)) * n + 0.1)));
        }
        if (i === 0 && stars[k] && flare > 0.4) out[k] = stars[k] === 2 ? "*" : ".";
        // Before totality the moon's rim shows faintly against the sky.
        else if (i === 0 && moon > 0 && moon < SS * SS && show < 0.5) out[k] = ".";
        else out[k] = RAMP[i];
      }
    // The diamond: one bead of sun on the limb, too bright for its cell, with
    // a short flare either side and above and below.
    if (bead > 0.05) {
      const bx = cols / 2 - (mx / off) * 2 * R, by = rows / 2 + (my / off) * R;
      const put = (dc: number, dr: number, ch: string) => {
        const c = Math.floor(bx + dc), r = Math.floor(by + dr);
        if (c >= 0 && c < cols && r >= 0 && r < rows) out[r * cols + c] = ch;
      };
      const arm = bead > 0.5 ? 2 : 1;
      for (let s = 1; s <= arm; s++) {
        const ch = s === arm ? "-" : "=";
        put(s, 0, ch);
        put(-s, 0, ch);
      }
      if (bead > 0.4) {
        put(0, -1, bead > 0.75 ? "|" : ":");
        put(0, 1, bead > 0.75 ? "|" : ":");
      }
      put(0, 0, "@");
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
