/*
 * jellyfish: a moon jelly swimming up through dark water. The bell squeezes
 * and relaxes, the tentacles follow the rim a beat late, and specks drift by.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "jellyfish",
  category: "creatures",
  note: "a jellyfish pulsing upward, its tentacles trailing late",
  cols: 44,
  rows: 26,
  fps: 24,
} satisfies Meta;

const RAMP = " .::=+*#%@"; // no "-" inside, so only the outline uses it
const P = 2.2; // seconds per stroke
const SQ = 0.28; // share of the stroke spent squeezing

const ease = (x: number) => x * x * (3 - 2 * x);
const phase = (t: number) => (((t % P) + P) % P) / P;
// 0 relaxed, 1 fully squeezed.
const squeeze = (t: number) => {
  const p = phase(t);
  return p < SQ ? ease(p / SQ) : 1 - ease((p - SQ) / (1 - SQ));
};
// How far the stroke has carried the body up: it lurches with the squeeze and sinks back.
const lift = (t: number) => {
  const p = phase(t);
  return p < 0.4 ? ease(p / 0.4) : 1 - ease((p - 0.4) / 0.6);
};
// Where the rim sits and how wide it is, given how squeezed the bell is.
const rimAt = (t: number) => {
  const c = squeeze(t);
  const x = meta.cols / 2 + 1.5 * Math.sin((2 * Math.PI * t) / (5 * P));
  return { c, x, y: 11 - 0.8 * c - 1.4 * lift(t), half: (13 - 2.6 * c) * (1 - 0.3 * c) };
};

export default function jellyfish(): Frame {
  const { cols, rows } = meta;
  let seed = 7;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const specks = Array.from({ length: 30 }, () => ({ x: rnd() * cols, y: rnd() * rows, z: 0.4 + rnd() * 0.6, w: rnd() * 6.3 }));
  const grid: string[] = new Array(cols * rows);
  const put = (x: number, y: number, ch: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y * cols + x] = ch;
  };
  // How far the water has moved past: faster while the bell pushes.
  const travel = (t: number) => {
    const k = Math.floor(t / P), p = phase(t);
    return 0.9 * t + 2.4 * (k + (p < SQ ? 0.8 * ease(p / SQ) : 0.8 + (0.2 * (p - SQ)) / (1 - SQ)));
  };

  return (t) => {
    grid.fill(" ");
    const D = travel(t);
    for (const s of specks) {
      const y = Math.floor((((s.y + D * s.z) % rows) + rows) % rows);
      put(s.x + 0.6 * Math.sin(t * 0.5 + s.w), y, s.z > 0.8 ? "·" : ".");
    }
    const now = rimAt(t);
    const { c } = now;
    const a = 13 - 2.6 * c, b = 13 + 2 * c;
    const rim = Math.floor(now.y);
    // Each point down a tentacle hangs from where the rim was a moment ago.
    const trail = (d: number, lagPer: number) => {
      const was = rimAt(t - d * lagPer);
      return { x: was.x, y: rim + d + Math.max(0, was.y - now.y) * 0.8, half: was.half };
    };
    const cx = now.x;

    // A strand traced down from the rim, one mark per row: how far it leans
    // since the last row, and how much that lean changed, which is its bow.
    const strand = (
      len: number,
      lag: number,
      xAt: (d: number, at: ReturnType<typeof trail>) => number,
      mark: (x: number, y: number, dx: number, bow: number, d: number, f: number) => void,
    ) => {
      let d = 1, px = xAt(1, trail(1, lag)), pdx = 0;
      for (let y = rim + 1; y < rows; y++) {
        while (d < len && trail(d, lag).y < y) d += 0.25;
        if (d >= len) break;
        const x = xAt(d, trail(d, lag)), dx = x - px;
        mark(x, y, dx, dx - pdx, d, d / len);
        (px = x), (pdx = dx);
      }
    };
    // Eight threads, the outer ones shorter, so the tips stagger. A thread is
    // a plain stroke where it hangs straight and bows only where it bends.
    for (let i = 0; i < 8; i++) {
      const u = -0.92 + (1.84 * i) / 7;
      const wob = (d: number) => Math.sin(d * 0.5 - t * 3 + i * 1.9);
      const len = 8.5 + 3.2 * (1 - Math.abs(u)) + ((i * 3) % 5) * 0.8;
      strand(len, 0.06, (d, at) => at.x + u * at.half * (1 - 0.01 * d) + (0.05 + d * 0.013) * d * wob(d), (x, y, dx, bow, _d, f) => {
        const ch = f > 0.9 ? "." : f > 0.8 ? ":" : dx > 0.6 ? "\\" : dx < -0.6 ? "/" : bow > 0.22 ? "(" : bow < -0.22 ? ")" : "|";
        put(x, y, ch);
      });
    }
    // Two frilled mouth arms, each one ribbon a cell wide that widens to two
    // where it turns face on.
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      strand(10, 0.09, (d, at) => at.x + s * 2 * (1 - d * 0.06) * (at.half / 10) + 0.9 * Math.sin(d * 0.6 - t * 2.2 + i * 2.5), (x, y, _dx, _bow, d, f) => {
        const tw = Math.cos(d * 1.1 + i * 1.3 - t * 1.6);
        if (f > 0.8) return put(x, y, f > 0.9 ? "." : ":");
        if (Math.abs(tw) < 0.35) return put(x, y, ":");
        put(x, y, ";");
        if (tw > 0.5) put(x + s, y, s > 0 ? ")" : "(");
      });
    }

    // The bell: a half dome, glassy in the middle and thick at the edges. Ink
    // stands for how much jelly the eye looks through, so it reads the same
    // on paper and the ramp is not flipped.
    const width = (s: number) => a * Math.sqrt(1 - s * s) * (1 - 0.3 * c * (1 - s) ** 2);
    const inside = (X: number, yy: number) => {
      const s = ((now.y - yy) * 2) / b;
      return s >= 0 && s < 1 && Math.abs(X) < width(s);
    };
    for (let x = 0; x < cols; x++) {
      const u = (x + 0.5 - cx) / width(0);
      if (Math.abs(u) < 1) grid[rim * cols + x] = Math.abs(u) > 0.93 ? "'" : x & 1 ? "~" : "'";
    }
    for (let r = 0; r < rim; r++) {
      for (let x = 0; x < cols; x++) {
        let n = 0, sx = 0, sy = 0;
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 3; i++)
            if (inside(x + (i + 0.5) / 3 - cx, r + (j + 0.5) / 4)) (n++, (sx += i - 1), (sy += (j - 1.5) / 1.5));
        if (!n) continue;
        const k = r * cols + x;
        if (n < 10) {
          // An edge cell: draw the outline facing the way the shape lies.
          const ux = sx / n, uy = sy / n;
          if (uy > Math.abs(ux) * 1.2) grid[k] = n < 5 ? "_" : "-";
          else if (Math.abs(ux) > uy * 1.5) grid[k] = ux > 0 ? "(" : ")";
          else grid[k] = n < 4 ? "." : ux > 0 ? "/" : "\\";
          continue;
        }
        const s = Math.max(0, ((now.y - r - 0.5) * 2) / b);
        const u = Math.max(-0.999, Math.min(0.999, (x + 0.5 - cx) / width(s)));
        const nz = Math.sqrt(1 - u * u) * Math.sqrt(1 - s * s);
        // Four pale horseshoes show through the top, two of them side on.
        const ph = Math.asin(u);
        const g = Math.min(Math.abs(ph - 0.6), Math.abs(ph + 0.6));
        const ring = Math.max(0, 1 - Math.abs(Math.hypot(g / 0.36, (s - 0.45) / 0.26) - 1) * 3.5);
        // The crown is the thinnest, glassiest part, so the shade fades out up there.
        const crown = 1 - 0.6 * ease(Math.max(0, (s - 0.62) / 0.38));
        const v = Math.min(1, (0.16 + 0.07 * s + 0.6 * (1 - nz) ** 2) * crown + 0.55 * ring);
        grid[k] = RAMP[Math.max(1, Math.round(v * (RAMP.length - 1)))];
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
