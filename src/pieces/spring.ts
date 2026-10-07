/*
 * spring: a coil spring seen from a little above, a weight hanging from it
 * and bouncing in simple harmonic motion. The coils bunch and stretch.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "spring",
  category: "shapes",
  note: "a weight bouncing on a coil spring, its coils bunching",
  cols: 40,
  rows: 28,
  fps: 30,
} satisfies Meta;

const RAMP = ".:-=+*#%@";

// Draws a polyline (cells: x across, y down) as line art: one glyph per
// column where it runs flat, one per row where it runs steep, each picked
// from where the line crosses its cell. put(col, row, glyph, point) is told
// which point of the polyline the glyph sits nearest.
function curve(P: number[][], put: (col: number, row: number, glyph: string, point: number) => void): void {
  const steep = (i: number) => Math.abs(P[i + 1][1] - P[i][1]) > Math.abs(P[i + 1][0] - P[i][0]);
  const dir = (i: number) => Math.sign(P[i + 1][steep(i) ? 1 : 0] - P[i][steep(i) ? 1 : 0]);
  for (let s = 0; s < P.length - 1; ) {
    let e = s + 1;
    while (e < P.length - 1 && steep(e) === steep(s) && dir(e) === dir(s)) e++;
    run(P, s, e, steep(s), put);
    s = e;
  }
}

// One stretch of the polyline that runs one way along its main axis.
function run(P: number[][], s: number, e: number, steep: boolean, put: (col: number, row: number, glyph: string, point: number) => void): void {
  const A = steep ? 1 : 0, B = 1 - A;
  const lo = Math.min(P[s][A], P[e][A]), hi = Math.max(P[s][A], P[e][A]);
  // The cross-axis value at m, the slope there, and the nearest point.
  const at = (m: number): [number, number, number] => {
    m = Math.max(lo, Math.min(hi, m));
    for (let i = s; i < e; i++) {
      const p = P[i], q = P[i + 1];
      if (m >= Math.min(p[A], q[A]) - 1e-9 && m <= Math.max(p[A], q[A]) + 1e-9) {
        const d = q[A] - p[A] || 1e-9, u = (m - p[A]) / d;
        return [p[B] + (q[B] - p[B]) * u, (q[B] - p[B]) / d, u < 0.5 ? i : i + 1];
      }
    }
    return [P[s][B], 0, s];
  };
  for (let k = Math.ceil(lo - 0.5); k <= Math.floor(hi - 0.5); k++) {
    const [v, d, i] = at(k + 0.5);
    if (steep) {
      put(Math.floor(v), k, Math.abs(d) < 0.48 ? "|" : d < 0 ? "/" : "\\", i);
    } else if (Math.abs(d) < 0.38) {
      // Half or quarter row heights: _ at the foot of a cell, . low, - middle, ' high.
      const n = Math.abs(d) < 0.2 ? 2 : 4;
      const g = n === 4 ? ["_", d > 0 ? "`" : "'", "-", ".", "_"] : ["_", "-", "_"];
      const r = Math.floor(v), j = Math.round((v - r) * n);
      put(k, j ? r : r - 1, g[j], i);
    } else {
      // Corner to corner: _ where the line holds its row, / or \ where it changes.
      const ya = Math.round(at(k)[0]), yb = Math.round(at(k + 1)[0]);
      if (yb > ya) put(k, ya, "\\", i);
      else put(k, ya - 1, yb < ya ? "/" : "_", i);
    }
  }
}

// The weight, drawn once: a drum with its lid tipped toward the eye. Side
// cells hold a digit, the place in the light ramp, lit from the left.
const DRUM = [
  "  .-----------.  ",
  " (      o      ) ",
  " |`-----------'| ",
  " |9887766543210| ",
  " |9887766543210| ",
  "  `-----------'  ",
];

export default function spring(): Frame {
  const { cols, rows } = meta;
  const cx = cols / 2;
  const TURNS = 3.5; // from the top of the coil at the back to its foot at the front
  const RC = 7.5; // coil radius, in columns
  const BULGE = 1.75; // how far the near side of a coil sits below the far side, in rows
  const P0 = 3.5, AMP = 0.6, PERIOD = 1.4; // rows per turn at rest, and its swing
  const TOP = 3; // the top of the coil
  const STEPS = 160;
  const out: string[] = new Array(cols * rows);
  const front = new Uint8Array(cols * rows);
  const N = RAMP.length - 1;
  const ceiling = "/".repeat(22), plate = "─".repeat(11) + "┬" + "─".repeat(10);
  const near = new Uint8Array(STEPS + 1);
  const th0 = -Math.PI / 2;
  for (let i = 0; i <= STEPS; i++) near[i] = Math.sin(th0 + (i / STEPS) * TURNS * 6.2832) > 0 ? 1 : 0;
  const inside = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;

  return (t, { paper = false } = {}) => {
    const pitch = P0 + AMP * Math.cos((t / PERIOD) * 6.2832);
    out.fill(" ");
    front.fill(0);
    // Each turn starts on a whole row, so every coil is drawn alike and the
    // spring stretches by moving whole coils.
    const lift = (u: number) => {
      const k = Math.min(Math.floor(u), Math.ceil(TURNS) - 1), y0 = Math.round(k * pitch);
      return TOP + y0 + (Math.round((k + 1) * pitch) - y0) * (u - k);
    };
    const P: [number, number][] = [];
    for (let i = 0; i <= STEPS; i++) {
      const th = th0 + (i / STEPS) * TURNS * 6.2832;
      P.push([cx + RC * Math.cos(th), lift((th - th0) / 6.2832) + BULGE * (Math.sin(th) + 1)]);
    }
    const foot = P[STEPS][1], lid = Math.round(foot + 2.3);
    // The wire turns the left side of each coil as one "(": the turn is too
    // tight there for the line art, which keeps to its right.
    const edge = Math.floor(cx - RC + 0.5);
    for (let k = 0; k < TURNS - 0.5; k++) {
      const r = Math.floor(lift(k + 0.75) + BULGE);
      if (inside(edge, r)) { out[edge + r * cols] = "("; front[edge + r * cols] = 1; }
    }
    // Near strands next; far ones keep a cell clear either side of them, so
    // the near strand reads as passing in front.
    curve(P, (c, r, ch, i) => {
      if (!near[i] || !inside(c, r) || c < edge || out[c + r * cols] === "(") return;
      out[c + r * cols] = ch;
      front[c + r * cols] = 1;
    });
    curve(P, (c, r, ch, i) => {
      const q = c + r * cols;
      if (near[i] || !inside(c, r) || c < edge || front[q] || (c > 0 && front[q - 1]) || (c < cols - 1 && front[q + 1])) return;
      out[q] = ch;
    });
    out[Math.floor(cx) + 2 * cols] = "|";

    const dx = Math.floor(cx) - 8;
    DRUM.forEach((line, j) => {
      const r = lid - 1 + j;
      if (r < 0 || r >= rows) return;
      for (let k = 0; k < line.length; k++) {
        let ch = line[k];
        if (ch >= "0" && ch <= "9") {
          const i = Math.round((+ch / 9) * N);
          ch = RAMP[paper ? N - i : i];
        }
        // The drum's outline and inside replace whatever is behind; its corners do not.
        if (ch !== " " || (k > 1 && k < line.length - 2)) out[dx + k + r * cols] = ch;
      }
    });
    // The hook, from the foot of the coil to the eye on the lid.
    for (let r = Math.floor(foot) + 1; r < lid; r++) if (inside(0, r)) out[Math.floor(cx) + r * cols] = "|";

    // The ceiling the spring hangs from.
    const left = Math.floor(cx - ceiling.length / 2);
    for (let i = 0; i < ceiling.length; i++) {
      out[left + i] = ceiling[i];
      out[cols + left + i] = plate[i];
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
