/*
 * tv-static: an old set showing snow, with a hum bar rolling through it. The
 * dial clicks over, a test card rolls into place and holds, then is lost.
 */
import type { Frame, Meta } from "../types.ts";

export interface TvStaticOptions {
  [key: string]: unknown;
  set: boolean;
}

export const meta = {
  name: "tv static",
  category: "effects",
  note: "snow on an old set that tunes into a test card and loses it",
  cols: 58,
  rows: 26,
  fps: 20,
  options: { set: true },
} satisfies Meta<TvStaticOptions>;

const RAMP = " .:+░▒▓█";
const LOOP = 10; // seconds: snow, tuning in, the card, losing it, snow
const BARS = [7, 6, 5, 4, 3, 2, 1]; // ramp levels, brightest bar first
const CASTLE = [1, 0, 3, 0, 5, 0, 7]; // the reversed strip under the bars
const BOTTOM: [number, number][] = [[0.17, 5], [0.34, 7], [0.51, 3], [0.68, 0], [0.73, 1], [0.78, 0], [0.83, 2], [1, 0]];
const SNOW = [0.36, 0.48, 0.6, 0.7, 0.8, 0.9, 0.98]; // where the snow steps up a level

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x2545f491);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (a: number, b: number, v: number) => {
  const x = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// The set: cabinet, rounded screen bezel, two knobs, a grille, legs and ears.
function drawSet(cols: number, rows: number) {
  const g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const box = (x0: number, y0: number, x1: number, y1: number, c = "╭╮╰╯─│") => {
    for (let x = x0 + 1; x < x1; x++) g[y0][x] = g[y1][x] = c[4];
    for (let y = y0 + 1; y < y1; y++) g[y][x0] = g[y][x1] = c[5];
    [g[y0][x0], g[y0][x1], g[y1][x0], g[y1][x1]] = [c[0], c[1], c[2], c[3]];
  };
  box(1, 5, 56, 23);
  box(3, 6, 43, 22);
  box(46, 8, 52, 10); // the channel knob
  box(46, 12, 52, 14); // the volume knob
  box(45, 16, 53, 21, "┌┐└┘─│"); // the speaker
  for (let y = 17; y <= 20; y++) for (let x = 46; x <= 52; x++) g[y][x] = "═";
  g[13][49] = "╲";
  const put = (x: number, y: number, s: string) => [...s].forEach((ch, i) => (g[y][x + i] = ch));
  put(25, 4, "▄▄███▄▄");
  for (let k = 1; k <= 4; k++) {
    g[4 - k][25 - k] = "╲";
    g[4 - k][31 + k] = "╱";
  }
  g[0][21] = g[0][35] = "o";
  put(5, 24, "╱");
  put(4, 25, "╱");
  put(52, 24, "╲");
  put(53, 25, "╲");
  return g;
}

// The test card: bars over a reversed strip and a bottom strip of hard-edged
// blocks, with a circle and a crosshair drawn across the middle.
function drawCard(SW: number, SH: number) {
  const card: (number | string)[][] = Array.from({ length: SH }, (_, r) =>
    Array.from({ length: SW }, (_, c) => {
      const u = (c + 0.5) / SW, v = (r + 0.5) / SH;
      const bar = Math.min(6, Math.floor(u * 7));
      if (v < 0.67) return BARS[bar];
      if (v < 0.75) return CASTLE[bar];
      return BOTTOM.find(([end]) => u < end)![1];
    }),
  );
  // The circle, row by row: its span in each row, outlined in box drawing.
  const R = Math.min(SH * 0.43, SW * 0.22) * 2, cx = SW / 2, cy = SH / 2;
  const span: ([number, number] | null)[] = [];
  for (let r = 0; r < SH; r++) {
    const y = (r + 0.5 - cy) * 2, w = R * R - y * y;
    span.push(w < 0 ? null : [Math.ceil(cx - Math.sqrt(w) - 0.5), Math.floor(cx + Math.sqrt(w) - 0.5)]);
  }
  const mid = Math.floor(SH / 2), mc = Math.floor(SW / 2);
  for (let r = 0; r < SH; r++) {
    if (!span[r]) continue;
    const [a, b] = span[r]!;
    const up = r < mid, near = up ? span[r - 1] : span[r + 1];
    // The run out to the row nearer the middle's edge, stepped with corners.
    const [na, nb] = near || [mc + 1, mc - 1];
    for (let c = a; c <= b; c++) {
      if (c > a && c < na && c < nb) card[r][c] = "─";
      else if (c < b && c > nb && c > na) card[r][c] = "─";
    }
    if (a < na) {
      card[r][a] = up ? "╭" : "╰";
      card[r][na] = up ? "╯" : "╮";
      card[r][b] = up ? "╮" : "╯";
      card[r][nb] = up ? "╰" : "╭";
    } else card[r][a] = card[r][b] = "│";
    if (!near) for (let c = a + 1; c < b; c++) card[r][c] = "─";
  }
  // The crosshair, meeting the circle in tees.
  const [a, b] = span[mid]!;
  for (let c = a + 1; c < b; c++) card[mid][c] = "─";
  for (let r = 0; r < SH; r++) if (span[r]) card[r][mc] = "│";
  card[mid][a] = "├";
  card[mid][b] = "┤";
  card[mid][mc] = "┼";
  card[span.findIndex(Boolean)][mc] = "┬";
  card[SH - 1 - [...span].reverse().findIndex(Boolean)][mc] = "┴";
  return card;
}

export default function tvStatic({ set = true }: Partial<TvStaticOptions> = {}): Frame {
  const { cols, rows, fps } = meta;
  const frame = set ? drawSet(cols, rows) : null;
  // The picture area, and which of its cells the curved tube leaves out.
  const [X0, Y0, SW, SH] = set ? [4, 7, 39, 15] : [0, 0, cols, rows];
  const inside = (c: number, r: number) => {
    if (!set) return true;
    const x = (c + 0.5 - SW / 2) / (SW / 2), y = (r + 0.5 - SH / 2) / (SH / 2);
    return x ** 6 + y ** 6 <= 1.02;
  };
  const card = drawCard(SW, SH);
  const g = Array.from({ length: rows }, () => new Array<string>(cols));
  const N = RAMP.length - 1;
  const ink = (level: number, paper: boolean) => RAMP[paper ? N - level : level];

  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const k = Math.floor(t * fps); // the snow is new every frame
    // How firmly the set holds the signal. Just before it locks, and just
    // before it is lost, the dial clicks through three stops.
    const lock = smooth(1.6, 3.4, u) * (1 - smooth(6.6, 7.8, u));
    const dial = Math.max(0, Math.min(3, Math.floor((u - 1.1) * 8), 3 - Math.floor((u - 6.4) * 8)));
    const snow = 1 - 0.97 * lock;
    // Unlocked, the picture rolls (with its blanking bar) and its lines tear.
    const roll = (1 - lock) ** 2 * (SH + 2) * 2.5;
    const tear = (1 - lock) * 9;
    const hum = ((u / LOOP + 0.45) % 1) * (SH + 6) - 3; // the hum bar's middle row, once a loop

    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g[r][c] = frame ? frame[r][c] : " ";
    if (frame) g[9][49] = "╱─╲│"[dial];
    for (let r = 0; r < SH; r++) {
      const dim = 1 - 0.45 * Math.exp(-(((r - hum) / 2.2) ** 2));
      const line = 0.9 + 0.2 * hash(k, r, 9); // each scan line a little brighter or darker
      const shift = Math.round(tear * Math.sin(r * 0.8 + u * 9) * hash(k >> 2, r, 3));
      const pr = Math.floor((r + roll) % (SH + 2)); // the card row shown here
      let prev = hash(k, r, 1);
      for (let c = 0; c < SW; c++) {
        if (!inside(c, r)) {
          g[Y0 + r][X0 + c] = " ";
          continue;
        }
        // Snow is fine grain streaked along the line, as it is on a real tube,
        // mostly dots with now and then a brighter fleck.
        const n = hash(k, r * 97 + c, 2);
        prev = 0.6 * n + 0.4 * prev;
        let ch: string;
        const noisy = hash(k, r * 97 + c, 5) < snow;
        if (noisy && hash(k, r * 97 + c, 6) >= lock ** 6) {
          const v = prev * line * dim;
          let level = 0;
          while (level < SNOW.length && v > SNOW[level]) level++;
          ch = ink(level, paper);
        } else {
          const pc = (((c + shift) % SW) + SW) % SW;
          let x = pr < SH ? card[pr][pc] : 0;
          // Once locked, what noise is left only nudges the card a shade.
          if (noisy && typeof x === "number") x = Math.max(0, Math.min(N, x + (n < 0.5 ? -1 : 1)));
          ch = typeof x === "number" ? ink(x, paper) : x;
        }
        g[Y0 + r][X0 + c] = ch;
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
