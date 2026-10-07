/*
 * heartbeat: an ECG monitor. A PQRST trace sweeps left to right over a dotted
 * grid and its last pass, erasing a few columns ahead, beside a rate readout.
 */
import type { Frame, Meta } from "../types.ts";

export interface HeartbeatOptions {
  [key: string]: unknown;
  /** The resting rate, held to 30 to 199. */
  bpm: number;
}

export const meta = {
  name: "heartbeat",
  category: "data",
  note: "an ecg trace sweeping over its last pass, with a bpm readout",
  cols: 72,
  rows: 15,
  fps: 25,
  options: { bpm: 72 },
} satisfies Meta<HeartbeatOptions>;

const SPEED = 25; // columns per second, like 25 mm/s paper
const W = 46; // trace width
const GAP = 4; // erased columns ahead of the trace
const BASE = 10; // baseline row
// One beat as rows above the baseline at each column edge: P, PR, QRS, ST, T.
const BEAT = [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0];
// The QRS is drawn by hand, a column each: Q dips a row, R rises from that
// dip to a point, and S climbs back to the baseline.
const R_AT = 7;
const R_TOP = 7;
const QRS: Record<number, [string, string]> = { [R_AT - 1]: ["╮", "╰"], [R_AT + 1]: ["╭", "╯"] };

// Digits for the readout, 3x5, each pixel two columns wide and a row tall.
const FONT = [
  "###,#.#,#.#,#.#,###", "##.,.#.,.#.,.#.,###", "###,..#,###,#..,###", "###,..#,###,..#,###",
  "#.#,#.#,###,..#,..#", "###,#..,###,..#,###", "###,#..,###,#.#,###", "###,..#,..#,..#,..#",
  "###,#.#,###,#.#,###", "###,#.#,###,..#,###",
].map((d) => d.split(","));
// The heart swells on each beat, eases back and rests smaller between.
const HEARTS = [
  [" ▄█▄█▄ ", "  ▀█▀  ", "       "],
  ["▄██▄██▄", " ▀███▀ ", "   ▀   "],
  ["▄██▄██▄", "▀█████▀", "  ▀█▀  "],
];
// A cell's glyph from the sides its line leaves by: up, down, left, right.
const JOIN: Record<string, string> = { 1100: "│", "0011": "─", "0110": "╮", 1010: "╯", "0101": "╭", 1001: "╰" };

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function heartbeat({ bpm = meta.options.bpm }: Partial<HeartbeatOptions> = {}): Frame {
  const { cols, rows } = meta;
  const X0 = 2; // first trace column
  const PX = X0 + W + 3; // the readout panel
  const PW = cols - PX - 1;

  // Beat start times in columns, made as far as needed, left fractional so
  // the rate averages true. Breathing sways it a little.
  const rand = mulberry32(7240);
  const beats = [-400];
  const extend = (g: number) => {
    while (beats[beats.length - 1] <= g) {
      const n = beats.length;
      const rate = Math.max(30, Math.min(199, bpm)) + 2.5 * Math.sin(n * 0.8) + (rand() - 0.5) * 2;
      beats.push(beats[n - 1] + (SPEED * 60) / rate);
    }
  };
  const beatOf = (g: number) => {
    let lo = 0, hi = beats.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (beats[mid] <= g) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  // A sample's column in the beat. Beats too close for the whole beat take
  // up to two columns each out of the flat PR and ST stretches.
  const start = (n: number) => Math.ceil(beats[n]); // a beat's first column
  const cut = (n: number) => Math.max(0, Math.min(4, BEAT.length - (start(n + 1) - start(n))));
  const phase = (n: number, g: number) => {
    const c = cut(n), pr = (c + 1) >> 1;
    let k = g - start(n);
    if (k >= R_AT - 1 - pr) k += pr;
    if (k >= 12 - (c - pr)) k += c - pr;
    return k;
  };
  // Faster still, a beat's T wave runs on under the next one's P.
  const level = (g: number) => {
    const n = beatOf(g);
    return Math.max(BEAT[phase(n, g)] ?? 0, BEAT[phase(n - 1, g)] ?? 0);
  };
  const rAt = (n: number) => start(n) + R_AT - ((cut(n) + 1) >> 1);

  const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => (grid[r][c + i] = ch));

  return (t) => {
    const H = 3 * W + 31 + Math.floor(t * SPEED); // the newest sample
    extend(H + 2);
    for (const row of grid) row.fill(" ");
    put(1, X0, "ecg  ii");
    put(1, X0 + W - 7, "25 mm/s");
    for (let r = 1; r < rows - 1; r++) grid[r][PX - 2] = "│";

    const head = H % W;
    for (let c = 0; c < W; c++) {
      const ahead = (c - head + W) % W;
      if (ahead > 0 && ahead <= GAP) continue;
      const x = X0 + c;
      // A dot every five columns on every third row, under the trace and
      // clear of the baseline.
      if (c % 5 === 2) for (let r = BASE - 6; r < rows - 1; r += 3) if (r !== BASE) grid[r][x] = "·";
      const g = H - ((head - c + W) % W);
      const k = phase(beatOf(g), g);
      if (k === R_AT) {
        grid[BASE - R_TOP][x] = "╷";
        for (let r = BASE - R_TOP + 1; r <= BASE; r++) grid[r][x] = "│";
        grid[BASE + 1][x] = "┴";
        continue;
      }
      if (QRS[k]) {
        grid[BASE][x] = QRS[k][0];
        grid[BASE + 1][x] = QRS[k][1];
        continue;
      }
      // Elsewhere each column carries the line from this sample to the next.
      const a = BASE - level(g), b = BASE - level(g + 1);
      const top = Math.min(a, b), bot = Math.max(a, b);
      for (let r = top; r <= bot; r++) {
        const key = `${+(r > top)}${+(r < bot)}${+(r === a)}${+(r === b)}`;
        grid[r][x] = JOIN[key] || "─";
      }
    }

    // The rate averages the last four beats that have shown their R wave.
    let n = beatOf(H - R_AT + 2);
    if (rAt(n) > H) n--;
    const rr = (beats[n] - beats[n - 4]) / 4;
    const shown = String(Math.round((SPEED * 60) / rr));
    put(2, PX, "hr");
    put(2, PX + PW - 3, "bpm");
    const step = shown.length > 2 ? 7 : 8;
    let dx = PX + Math.floor((PW - shown.length * step + step - 6) / 2);
    for (const ch of shown) {
      const f = FONT[+ch];
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 3; c++) if (f[r][c] === "#") grid[4 + r][dx + 2 * c] = grid[4 + r][dx + 2 * c + 1] = "█";
      dx += step;
    }
    const since = H - rAt(n);
    HEARTS[since < 4 ? 2 : since < 9 ? 1 : 0].forEach((s, i) => put(10 + i, PX + Math.floor((PW - 7) / 2), s));
    return grid.map((row) => row.join("")).join("\n");
  };
}
