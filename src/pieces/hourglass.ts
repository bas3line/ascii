/*
 * hourglass: an hourglass on its stand. Sand runs through the neck a grain at
 * a time, a crater opening above and a heap rising below; when the top runs
 * dry it is lifted, turned over on its side and set down the other way up.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "hourglass",
  category: "objects",
  note: "sand running through the neck, then turned over",
  cols: 43,
  rows: 21,
  fps: 30,
} satisfies Meta;

const W = 0.6, H = 1.2; // a cell in em; lengths are in em
const L = 9; // a bulb's length, neck to cap
const RN = 0.36, RM = 5.0, RC = 4.3; // the glass's half width at the neck, at its widest, at the cap
const PX = 6; // the posts, out from the middle
const K = 0.6; // the slope sand comes to rest at
const LT = 6.2; // how high the sand stands when it is all on top
const [RUN, HOLD] = [10.5, 1.2]; // seconds for the top to run dry, and a pause
// The turn: lifted, on its side, the other way up, each for so many seconds.
const TURN = [0.2, 0.45, 0.2];
const CYCLE = RUN + HOLD + TURN[0] + TURN[1] + TURN[2];
const START = 3.5; // a third of the way through, sand in both bulbs
const DT = 0.045; // between grains through the neck
// Eight looks into each cell, four in its upper half and four in its lower.
const LOOKS: [number, number][] = [[0.3, 0.12], [0.7, 0.12], [0.3, 0.38], [0.7, 0.38], [0.3, 0.62], [0.7, 0.62], [0.3, 0.88], [0.7, 0.88]];

// The glass's half width at a distance u from the neck: a narrow throat, a full bulb, rounded in to the cap.
const w = (u: number) => {
  const s = Math.min(1, Math.abs(u) / L);
  if (s < 0.76) return RN + (RM - RN) * Math.sin((Math.PI / 2) * (s / 0.76)) ** 1.5;
  return RM - (RM - RC) * ((s - 0.76) / 0.24) ** 2;
};
const hash = (n: number) => {
  let h = Math.imul(n ^ 0x2c1b3c6d, 0x297a2d39);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const solve = (fn: (x: number) => number, want: number, a: number, b: number) => {
  for (let i = 0; i < 30; i++) fn((a + b) / 2) < want ? (a = (a + b) / 2) : (b = (a + b) / 2);
  return (a + b) / 2;
};

// One bulb column by column, [v, lo, hi]: how far from the neck its inside runs, so sand can be weighed.
const BULB: [number, number, number][] = [];
for (let v = -RM + 0.05; v < RM; v += 0.1) {
  let [lo, hi] = [L, 0];
  for (let u = 0; u <= L; u += 0.02) if (Math.abs(v) < w(u) - 0.15) [lo, hi] = [Math.min(lo, u), u];
  if (hi > lo) BULB.push([v, lo, hi]);
}
const area = (fn: (v: number, lo: number, hi: number) => number) => BULB.reduce((a, [v, lo, hi]) => a + fn(v, lo, hi), 0);
// On top, a flat level with a crater whose floor is at c; below, a heap whose peak is p up from the floor.
const topAt = (c: number) => (u: number, v: number) => u < Math.min(LT, c + K * Math.abs(v));
const heapAt = (p: number) => (u: number, v: number) => L - u < p - K * Math.abs(v);
const topArea = (c: number) => area((v, lo, hi) => Math.max(0, Math.min(hi, LT, c + K * Math.abs(v)) - lo));
const heapArea = (p: number) => area((v, lo, hi) => Math.max(0, hi - Math.max(lo, L - p + K * Math.abs(v))));
const ALL = topArea(LT);
const CRATER: number[] = [], HEAP: number[] = [];
for (let i = 0; i <= 50; i++) {
  CRATER.push(solve(topArea, (i / 50) * ALL, -K * RM - 1, LT));
  HEAP.push(solve(heapArea, (i / 50) * ALL, 0, L + K * RM));
}
const table = (tab: number[], x: number) => {
  const f = clamp(x) * 50, i = Math.min(49, Math.floor(f));
  return tab[i] + (tab[i + 1] - tab[i]) * (f - i);
};
// On its side, the sand slumps against the lower wall of its bulb.
const SIDE = solve((lv) => area((v, lo, hi) => (v > lv ? hi - lo : 0)), ALL, RM, -RM);

/*
 * Draws a line through points into put(row, col, mark): one mark a column
 * where it runs flat, set at the height it crosses the cell, and one a row
 * where it runs steep, a bracket where it bows.
 */
function trace(pts: [number, number][], put: (r: number, c: number, m: string) => void): void {
  const steep: [number, number, number][] = [];
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], dx = x1 - x0, dy = y1 - y0;
    if (Math.abs(dy) <= 1.4 * Math.abs(dx))
      for (let c = Math.floor(Math.min(x0, x1) / W - 0.5) + 1; c <= Math.floor(Math.max(x0, x1) / W - 0.5); c++) {
        const y = (y0 + (dy * ((c + 0.5) * W - x0)) / dx) / H, r = Math.floor(y), f = y - r;
        put(r, c, f < 0.3 ? "'" : f < 0.6 ? "-" : f < 0.85 ? "." : "_");
      }
    if (Math.abs(dy) >= 0.8 * Math.abs(dx))
      for (let r = Math.floor(Math.min(y0, y1) / H - 0.5) + 1; r <= Math.floor(Math.max(y0, y1) / H - 0.5); r++)
        steep.push([r, x0 + (dx * ((r + 0.5) * H - y0)) / dy, dx / dy]);
  }
  steep.forEach(([r, x, s], i) => {
    let m = Math.abs(s) > 0.3 ? (s > 0 ? "\\" : "/") : "|";
    const a: [number, number, number] | undefined = steep[i - 1], b: [number, number, number] | undefined = steep[i + 1];
    if (m === "|" && a && b && Math.abs(a[0] - r) === 1 && Math.abs(b[0] - r) === 1) {
      const bow = x - (a[1] + b[1]) / 2;
      if (bow > 0.1) m = ")";
      else if (bow < -0.1) m = "(";
    }
    put(r, Math.floor(x / W), m);
  });
}

export default function hourglass(): Frame {
  const { cols, rows } = meta;
  const N = cols * rows;
  const CX = (cols / 2) * W, CY = (rows / 2) * H; // the neck
  const pc = Math.round(PX / W); // the posts, in columns from the middle
  const mid = Math.floor(cols / 2);

  // The glass and stand upright, lifted by `lift` rows, or on its side.
  const shell = (side: boolean, lift: number) => {
    const g = new Array<string>(N).fill(""), by = new Int8Array(N);
    const put = (r: number, c: number, m: string) => r >= 0 && r < rows && c >= 0 && c < cols && (g[r * cols + c] = m);
    const at = (u: number, v: number): [number, number] => (side ? [CX + u, CY + v] : [CX + v, CY - lift * H - u]);
    for (const sv of [-1, 1]) {
      const pts: [number, number][] = [];
      for (let u = -L; u <= L + 1e-9; u += 0.04) pts.push(at(u, sv * w(u)));
      // Where both walls run flat through one cell, at the neck on its side, they make a "=".
      trace(pts, (r, c, m) => {
        const i = r * cols + c, flat = "'-._".includes(m);
        put(r, c, flat && by[i] === -sv ? "=" : m);
        if (flat && i >= 0 && i < N) by[i] = by[i] === -sv ? 2 : sv;
      });
    }
    const n0 = Math.round(CY / H - 0.5); // the neck's row, upright
    if (!side) {
      // Plates with turned ends, the posts let into them.
      const top = n0 - lift - 8, bot = n0 - lift + 8, hw = pc + 2;
      for (let c = mid - hw; c <= mid + hw; c++) {
        const end = c === mid - hw ? 0 : c === mid + hw ? 1 : -1, post = Math.abs(c - mid) === pc;
        put(top - 1, c, end < 0 ? "═" : "╒╕"[end]);
        put(top, c, end < 0 ? (post ? "╤" : "═") : "╘╛"[end]);
        put(bot, c, end < 0 ? (post ? "╧" : "═") : "╒╕"[end]);
        put(bot + 1, c, end < 0 ? "═" : "╘╛"[end]);
      }
      for (let r = top + 1; r < bot; r++) put(r, mid - pc, "│"), put(r, mid + pc, "│");
    } else {
      // On its side the plates stand up at either end and the posts run across.
      const hr = Math.round(PX / H), ends = [mid - 16, mid + 16];
      for (const [k, c] of ends.entries()) {
        for (let r = n0 - hr - 1; r <= n0 + hr + 1; r++) {
          const edge = r === n0 - hr - 1 ? 0 : r === n0 + hr + 1 ? 1 : -1, post = Math.abs(r - n0) === hr;
          put(r, c - 1, edge < 0 ? (post && k ? "╢" : "║") : "╓╙"[edge]);
          put(r, c, edge < 0 ? " " : "─");
          put(r, c + 1, edge < 0 ? (post && !k ? "╟" : "║") : "╖╜"[edge]);
        }
      }
      for (let c = ends[0] + 2; c < ends[1] - 1; c++) put(n0 - hr, c, "─"), put(n0 + hr, c, "─");
    }
    return g;
  };
  const still = [shell(false, 0), shell(false, 1), shell(true, 0)];

  return (t) => {
    const k = (((START + t) % CYCLE) + CYCLE) % CYCLE;
    const turn = k - RUN - HOLD; // into the turn, once it starts
    const phase = turn < 0 ? -1 : turn < TURN[0] ? 0 : turn < TURN[0] + TURN[1] ? 1 : 2;
    const side = phase === 1, lift = phase === 0 || phase === 2 ? 1 : 0;
    const left = phase === 2 ? 1 : clamp(1 - k / RUN); // the share of sand still on top
    let sand: (u: number, v: number) => boolean;
    if (side) sand = (u, v) => u < 0 && v > SIDE;
    else {
      const top = topAt(table(CRATER, left)), heap = heapAt(table(HEAP, 1 - left));
      sand = (u, v) => (u > 0 ? top(u, v) : heap(-u, v));
    }

    // Sand: a grain in each half cell where most of its looks land in sand.
    const bits = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      let hi = 0, lo = 0;
      for (const [a, b] of LOOKS) {
        const x = ((i % cols) + a) * W - CX, y = CY - lift * H - (Math.floor(i / cols) + b) * H;
        const u = side ? x : y, v = side ? -y : x;
        if (Math.abs(u) < L && Math.abs(v) < w(u) - 0.15 && sand(u, v)) b < 0.5 ? hi++ : lo++;
      }
      bits[i] = (hi > 2 ? 1 : 0) | (lo > 2 ? 2 : 0);
    }
    // The stream: grains leave the neck one by one and speed up as they fall onto the heap.
    if (phase < 0) {
      const peak = -L + table(HEAP, 1 - left);
      for (let i = Math.max(0, Math.floor((k - 0.8) / DT)); i * DT <= Math.min(k, RUN); i++) {
        const a = k - i * DT - hash(i + 7919) * DT * 0.7;
        const u = 0.1 - 3 * a - 18 * a * a;
        if (hash(i) < 0.18 || a < 0 || u < peak) continue;
        const y = (CY - u) / H;
        bits[Math.floor(y) * cols + mid] |= y % 1 < 0.5 ? 1 : 2;
      }
    }

    const glass = still[side ? 2 : lift];
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) line += glass[r * cols + c] || " '.:"[bits[r * cols + c]];
      lines.push(line);
    }
    return lines.join("\n");
  };
}
