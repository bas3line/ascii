/*
 * butterfly: seen from above, beating its wings in bursts and gliding between
 * them. As a wing rises it turns edge on and narrows, its tip nearer the eye.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "butterfly",
  category: "creatures",
  note: "a butterfly flapping and gliding along a wandering path",
  cols: 64,
  rows: 24,
  fps: 30,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const LOOP = 16; // seconds; the path and the bursts all divide it
const BEAT = 2.5; // wingbeats a second
const EYE = 120; // how far the eye is above the wings, in columns
// Each wing is a teardrop, wider at its outer end: centre, length, width, tilt.
const FORE = { x: 9.6, y: 5.6, a: 11.6, b: 7.2, r: 0.5 };
const HIND = { x: 7, y: -4.6, a: 8.8, b: 7.4, r: -0.62 };

const drop = (w: typeof FORE, x: number, y: number): [number, number, number] => {
  const dx = x - w.x, dy = y - w.y, c = Math.cos(w.r), s = Math.sin(w.r);
  const p = (dx * c + dy * s) / w.a;
  const q = (dy * c - dx * s) / (w.b * (0.58 + 0.42 * Math.min(1, Math.max(0, (p + 1) / 2))));
  return [p, q, p * p + q * q];
};

// How pale the wing is at (x, y) in its own plane, or -1 off the wing.
function wing(x: number, y: number): number {
  const root = Math.hypot(x, y * 0.8) < 3.6;
  let [p, q, r] = drop(FORE, x, y);
  if (r < 1) {
    const rho = Math.sqrt(r), be = Math.atan2(q, p);
    // A dark margin round the tip, tapering towards the root, with one row of
    // pale spots in it.
    if (rho > 0.76 + 0.2 * Math.min(1, Math.max(0, (0.5 - p) / 0.8)))
      return rho > 0.8 && rho < 0.95 && p > 0.3 && Math.cos(be * 7 + 0.3) > 0.45 ? 0.9 : 0.24;
    // One pale band slanting across the middle.
    if (Math.abs(p * 0.85 + q * 0.5 - 0.02) < 0.17) return 0.9;
    return root ? 0.3 : 0.55;
  }
  [p, q, r] = drop(HIND, x, y);
  if (r >= 1) return -1;
  // A round eyespot: a pale ring round a dark middle and a bright pupil.
  const e = Math.hypot(x - 9.4, (y + 6.4) * 0.8);
  if (e < 1) return 1;
  if (e < 2.3) return 0.1;
  if (e < 3.8) return 0.9;
  if (Math.sqrt(r) > 0.8 && p > -0.3) return 0.24;
  return root ? 0.3 : 0.55;
}

export default function butterfly(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols * rows);
  const put = (x: number, y: number, ch: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < cols && y >= 0 && y < rows) out[y * cols + x] = ch;
  };

  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const w = (2 * Math.PI) / LOOP;
    // Flap for four seconds, glide for three; the glide starts with the wings low.
    const g = u % 8, flap = g < 4 ? 1 : g < 4.4 ? 1 - (g - 4) / 0.4 : g > 7.6 ? (g - 7.6) / 0.4 : 0;
    const beat = Math.cos(2 * Math.PI * BEAT * u);
    const th = flap * (0.6 - 0.72 * beat) - 0.06 * (1 - flap);
    // A slow, wide meander. Drifting sideways, it banks: the wing on that side dips.
    const bx = Math.round(cols / 2 + 9 * Math.sin(w * u) + 2 * Math.sin(3 * w * u + 0.6)) - 0.5;
    const by = rows / 2 + 0.6 + 1.4 * Math.sin(2 * w * u + 1) + 0.35 * flap * Math.sin(2 * Math.PI * BEAT * u);
    // The bank shows most in the glide; mid-beat it would throw one wing edge on.
    const bank = (0.16 - 0.1 * flap) * (Math.cos(w * u) + 0.67 * Math.cos(3 * w * u + 0.6)) / 1.67;
    const tilt = [th - bank, th + bank].map((a) => [Math.cos(a), Math.sin(a)]);
    const dim = 0.82 + 0.18 * Math.cos(th); // a raised wing catches less light

    // Where a point on screen (columns out from the body, y up) lands on the
    // raised wing, undoing the perspective; -1 if it misses.
    const sample = (X: number, Y: number): number => {
      const [ct, st] = tilt[X < 0 ? 0 : 1];
      const ax = Math.abs(X), den = EYE * ct + ax * st;
      if (den <= 0) return -1;
      const x = (ax * EYE) / den, k = EYE / (EYE - x * st);
      return wing(x, Y / k);
    };
    out.fill(" ");

    // The clubbed antennae go down first, so a raised wing hides them.
    const col = bx - 0.5;
    const sway = 0.4 * Math.sin(2 * Math.PI * 0.5 * u);
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 5; k++) {
        const f = k / 5;
        put(col + side * (0.5 + 2.6 * f + sway * f * f), by - 2 - 5 * f, k === 5 ? "o" : side > 0 ? "/" : "\\");
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0, sx = 0, sy = 0;
        for (let j = 0; j < 3; j++)
          for (let i = 0; i < 2; i++)
            if (sample(c + 0.25 + i * 0.5 - bx, (by - r - (j + 0.5) / 3) * 2) >= 0) (n++, (sx += i - 0.5), (sy += 1 - j));
        if (!n) continue;
        const at = r * cols + c;
        if (n < 5) {
          // An edge cell: the outline, facing the way the wing lies. Filled
          // low in the cell is the top of a wing, filled high its underside.
          const ux = sx / n, uy = sy / n;
          if (Math.abs(uy) > Math.abs(ux) * 2) out[at] = uy < 0 ? (n < 3 ? "." : "_") : n < 3 ? "'" : "-";
          else if (Math.abs(ux) > Math.abs(uy) * 2) out[at] = ux > 0 ? "(" : ")";
          else out[at] = ux * uy < 0 ? "/" : "\\";
          continue;
        }
        const v = sample(c + 0.5 - bx, (by - r - 0.5) * 2);
        const i = Math.max(1, Math.round(Math.max(0, v) * dim * (RAMP.length - 1)));
        out[at] = RAMP[paper ? RAMP.length - i : i];
      }
    }

    // The body, head to tail, over the wing roots.
    for (let y = 3; y >= -9; y--) put(col, by - y / 2, y > 1 ? "O" : y > -2 ? "#" : y > -8 ? "|" : "'");
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
