/*
 * chladni: sand on a square plate ringing in one of its modes. It lies on the
 * lines where two crossed standing waves cancel; when the tone moves on, the
 * grains are shaken loose and travel to the lines of the next figure.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "chladni plate",
  category: "physics",
  note: "sand travelling to the nodal lines of a ringing plate",
  cols: 45,
  rows: 23,
  fps: 12,
} satisfies Meta;

/*
 * Each mode is cos(n pi x) cos(m pi y) + sign cos(m pi x) cos(n pi y). With n
 * and m both odd every figure is mirrored both ways.
 */
const MODES: [number, number, number][] = [
  [1, 3, -1],
  [1, 5, -1],
  [3, 5, -1],
  [3, 7, -1],
  [5, 7, -1],
  [3, 7, 1],
  [3, 5, 1],
  [1, 5, 1],
];
const MOVE = 2.8; // seconds the sand takes to find the next figure
const HOLD = 2.2; // seconds a figure rests
const CYCLE = MOVE + HOLD;
const START = 4 * CYCLE - 0.2; // the fourth figure at rest, just before the tone moves
const GRAINS = 1000;
const LOOSE = 0.1; // share of the sand lying just off the lines
const P = Math.PI;

// One mode at (x, y) on a 1 by 1 plate, and its slope each way.
function wave([n, m, s]: [number, number, number], x: number, y: number): [number, number, number] {
  const a = Math.cos(n * P * x), b = Math.cos(m * P * y);
  const c = Math.cos(m * P * x), d = Math.cos(n * P * y);
  return [
    a * b + s * c * d,
    -P * (n * Math.sin(n * P * x) * b + s * m * Math.sin(m * P * x) * d),
    -P * (m * a * Math.sin(m * P * y) + s * n * c * Math.sin(n * P * y)),
  ];
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * A mode's figure on an ic by ir plate: a mark in every cell a line is drawn
 * through. A steep line is drawn once a row, in the cell nearer to where it
 * crosses between two cell centres, and a flat one once a column; "+" where two
 * lines cross, "*" where the diagonals cross as well.
 */
function figure(mode: [number, number, number], ic: number, ir: number) {
  const N = ic * ir;
  const V = new Float64Array(N), EX = new Float64Array(N), EY = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const [v, fx, fy] = wave(mode, ((i % ic) + 0.5) / ic, (Math.floor(i / ic) + 0.5) / ir);
    // The slope per em each way: a column is 0.6em, a row 1.2em.
    (V[i] = Math.abs(v) < 1e-9 ? 0 : v), (EX[i] = fx / ic / 0.6), (EY[i] = fy / ir / 1.2);
  }
  const marks = new Array<string>(N).fill("");
  const at = new Float64Array(N).fill(NaN); // where a steep line crosses its row, in columns
  const slant = (i: number) => (EX[i] * EY[i] > 0 ? "/" : "\\");
  const steep = (i: number, x: number) => {
    at[i] = x;
    marks[i] = Math.abs(EY[i]) > 0.4 * Math.abs(EX[i]) ? slant(i) : "|";
  };
  const flat = (i: number, oy: number) => {
    if (marks[i]) return;
    marks[i] = Math.abs(EX[i]) > 0.7 * Math.abs(EY[i]) ? slant(i) : oy < -0.22 ? "'" : oy < 0.14 ? "-" : oy < 0.34 ? "." : "_";
  };
  for (let i = 0; i < N; i++) {
    const c = i % ic, r = Math.floor(i / ic);
    if (V[i] === 0) {
      // A line through the cell's centre, or two crossing there.
      if (Math.hypot(EX[i], EY[i]) < 1e-6) marks[i] = Math.abs(wave(mode, (c + 0.85) / ic, (r + 0.85) / ir)[0]) < 1e-6 ? "*" : "+";
      else if (Math.abs(EX[i]) >= Math.abs(EY[i])) steep(i, c + 0.5);
      else flat(i, 0);
      continue;
    }
    const j = i + 1, k = i + ic;
    if (c < ic - 1 && V[i] * V[j] < 0 && Math.abs(EX[i] + EX[j]) >= 0.8 * Math.abs(EY[i] + EY[j])) {
      const u = V[i] / (V[i] - V[j]);
      steep(u < 0.5 ? i : j, c + 0.5 + u);
    }
    if (r < ir - 1 && V[i] * V[k] < 0 && Math.abs(EY[i] + EY[k]) >= 0.8 * Math.abs(EX[i] + EX[k])) {
      const u = V[i] / (V[i] - V[k]);
      u < 0.5 ? flat(i, u) : flat(k, u - 1);
    }
  }
  // Near upright, a bracket where the line bows against its crossings in the rows above and below.
  const near = (r: number, x: number) => {
    for (let c = Math.floor(x) - 1; c <= Math.floor(x) + 1; c++) if (r >= 0 && r < ir && c >= 0 && c < ic && at[r * ic + c] === at[r * ic + c]) return at[r * ic + c];
    return NaN;
  };
  for (let i = 0; i < N; i++) {
    if (marks[i] !== "|") continue;
    const r = Math.floor(i / ic), bow = at[i] - (near(r - 1, at[i]) + near(r + 1, at[i])) / 2;
    if (bow > 0.2) marks[i] = ")";
    else if (bow < -0.2) marks[i] = "(";
  }
  return { marks, EX, EY };
}

export default function chladni(): Frame {
  const { cols, rows } = meta;
  const IC = cols - 2, IR = rows - 2; // the plate inside its rim, about square
  const N = IC * IR;
  const rnd = mulberry32(18);
  const figs = MODES.map((m) => figure(m, IC, IR));

  // Where the sand lies on each figure, in cells: spread evenly along its lines, a little loose beside them.
  const rest = figs.map(({ marks, EX, EY }) => {
    const on: number[] = [];
    marks.forEach((m, i) => m && on.push(i));
    for (let i = on.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [on[i], on[j]] = [on[j], on[i]];
    }
    const xy = new Float64Array(2 * GRAINS);
    for (let g = 0; g < GRAINS; g++) {
      const loose = rnd() < LOOSE;
      const i = loose ? on[Math.floor(rnd() * on.length)] : on[g % on.length];
      let c = i % IC, r = Math.floor(i / IC);
      if (loose) {
        // One cell off the line, across it.
        const ex = EX[i], ey = EY[i], side = rnd() < 0.5 ? -1 : 1;
        if (Math.abs(ex) >= Math.abs(ey)) c += side;
        else r += side;
        if (Math.abs(ex) > 0.4 * Math.abs(ey) && Math.abs(ey) > 0.4 * Math.abs(ex)) (c += side), (r -= side * Math.sign(ex * ey));
        c = Math.min(IC - 1, Math.max(0, c));
        r = Math.min(IR - 1, Math.max(0, r));
      }
      xy[2 * g] = c + 0.15 + 0.7 * rnd();
      xy[2 * g + 1] = r + 0.15 + 0.7 * rnd();
    }
    return xy;
  });

  /*
   * For each change of figure, which resting place each grain makes for: the
   * nearest one still free, taken in a shuffled order, and when it sets off.
   */
  const trips = MODES.map((_, k) => {
    const a = rest[(k + MODES.length - 1) % MODES.length], b = rest[k];
    const to = new Int32Array(GRAINS), free = new Uint8Array(GRAINS).fill(1);
    const order = Array.from({ length: GRAINS }, (_, g) => g);
    for (let g = GRAINS - 1; g > 0; g--) {
      const j = Math.floor(rnd() * (g + 1));
      [order[g], order[j]] = [order[j], order[g]];
    }
    for (const g of order) {
      let best = -1, bd = Infinity;
      for (let h = 0; h < GRAINS; h++) {
        if (!free[h]) continue;
        const dx = (b[2 * h] - a[2 * g]) * 0.6, dy = (b[2 * h + 1] - a[2 * g + 1]) * 1.2;
        const d = dx * dx + dy * dy;
        if (d < bd) (bd = d), (best = h);
      }
      free[best] = 0;
      to[g] = best;
    }
    // Sand where the new tone shakes hardest leaves first; a grain already on a line barely stirs.
    const delay = new Float64Array(GRAINS), span = new Float64Array(GRAINS), sway = new Float64Array(GRAINS);
    for (let g = 0; g < GRAINS; g++) {
      const shake = Math.min(1, Math.abs(wave(MODES[k], a[2 * g] / IC, a[2 * g + 1] / IR)[0]) / 0.9);
      const len = Math.hypot((b[2 * to[g]] - a[2 * g]) * 0.6, (b[2 * to[g] + 1] - a[2 * g + 1]) * 1.2);
      delay[g] = 0.15 + 0.8 * (1 - shake) + 0.3 * rnd();
      span[g] = len < 0.8 ? 1e-6 : Math.min(MOVE - 0.2 - delay[g], 0.35 + 0.16 * len + 0.2 * rnd());
      sway[g] = (rnd() - 0.5) * 1.6;
    }
    return { a, b, to, delay, span, sway };
  });

  // Grains in each cell: still lying where they were, landed, or in the air.
  const lying = new Uint16Array(N), landed = new Uint16Array(N), all = new Uint16Array(N);
  return (t) => {
    const tt = START + t;
    const n = Math.floor(tt / CYCLE), tau = tt - n * CYCLE;
    const k = n % MODES.length;
    const { a, b, to, delay, span, sway } = trips[k];
    lying.fill(0), landed.fill(0), all.fill(0);
    for (let g = 0; g < GRAINS; g++) {
      const u = Math.min(1, Math.max(0, (tau - delay[g]) / span[g]));
      const e = u * u * (3 - 2 * u);
      const x0 = a[2 * g], y0 = a[2 * g + 1], x1 = b[2 * to[g]], y1 = b[2 * to[g] + 1];
      // Thrown a little off the straight way while it hops, landing true.
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) + 1e-9;
      const s = sway[g] * Math.sin(P * e) * Math.min(1, len / 3);
      const x = x0 + dx * e - (dy / len) * s * 0.5, y = y0 + dy * e + (dx / len) * s * 0.25;
      const c = Math.min(IC - 1, Math.max(0, Math.floor(x))), r = Math.min(IR - 1, Math.max(0, Math.floor(y)));
      const i = r * IC + c;
      all[i]++;
      if (u === 0) lying[i]++;
      else if (u === 1) landed[i]++;
    }
    const was = figs[(k + MODES.length - 1) % MODES.length].marks, is = figs[k].marks;
    const lines = ["┌" + "─".repeat(IC) + "┐"];
    for (let r = 0; r < IR; r++) {
      let row = "│";
      for (let c = 0; c < IC; c++) {
        const i = r * IC + c, q = all[i];
        row += (landed[i] && is[i]) || (lying[i] && was[i]) || (q === 0 ? " " : q < 3 ? "·" : ":");
      }
      lines.push(row + "│");
    }
    lines.push("└" + "─".repeat(IC) + "┘");
    return lines.join("\n");
  };
}
