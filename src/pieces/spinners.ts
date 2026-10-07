/*
 * spinners: twelve classic loading spinners in a grid, each drawn in a
 * three-row box with its name underneath. Pass names to pick some of them,
 * in that order; the frame then shrinks to fit just those.
 */
import type { Frame, Meta } from "../types.ts";

export interface SpinnersOptions {
  [key: string]: unknown;
  /** Spinners to show, in this order; empty for all twelve. */
  names: string[];
  labels: boolean;
  speed: number;
}

export const meta = {
  name: "spinners",
  category: "ui",
  note: "twelve loading spinners side by side, each with its name",
  cols: 66,
  rows: 13,
  fps: 12,
  options: { names: [], labels: true, speed: 1 },
} satisfies Meta<SpinnersOptions>;

/** A glyph at a column and row of a spinner's picture. */
type Cell = [x: number, y: number, ch: string];
/** A spinner's name, frames a step, and its picture at step i. */
type Spinner = [name: string, frames: number, draw: (i: number) => string[]];

// Quadrant blocks by which of upper left, upper right, lower left, lower
// right are filled.
const QUAD = " ▗▖▄▝▐▞▟▘▚▌▙▀▜▛█";
const quad = (ul: number, ur: number, ll: number, lr: number): string => QUAD[(ul << 3) | (ur << 2) | (ll << 1) | lr];
const ping = (n: number, i: number): number => (i % (2 * n - 2) < n ? i % (2 * n - 2) : 2 * n - 2 - (i % (2 * n - 2))); // 0..n-1..0
const blank = (w: number, h: number): string[][] => Array.from({ length: h }, () => new Array(w).fill(" "));
const rows = (g: string[][]): string[] => g.map((r) => r.join(""));
const plot = (w: number, h: number, cells: Cell[]): string[] => {
  const g = blank(w, h);
  for (const [x, y, ch] of cells) g[y][x] = ch;
  return rows(g);
};

// Each spinner: its name, frames a step at 12 fps, and the picture at step
// i as one to three rows.
const SPINNERS: Spinner[] = [
  ["line", 2, (i) => plot(5, 3, ([
    [[2, 0, "│"], [2, 1, "│"], [2, 2, "│"]],
    [[3, 0, "╱"], [2, 1, "╱"], [1, 2, "╱"]],
    [[0, 1, "─"], [1, 1, "─"], [2, 1, "─"], [3, 1, "─"], [4, 1, "─"]],
    [[1, 0, "╲"], [2, 1, "╲"], [3, 2, "╲"]],
  ] satisfies Cell[][])[i % 4])],
  ["dots", 2, (i) => {
    // Three dots hopping in turn, half a row at a time.
    const g = blank(5, 2);
    for (let d = 0; d < 3; d++) {
      const h = [0, 1, 2, 1, 0, 0, 0][(i - d * 2 + 70) % 7]; // half rows up
      g[h === 2 ? 0 : 1][d * 2] = h === 1 ? "▀" : "▄";
    }
    return rows(g);
  }],
  ["pipe", 2, (i) => {
    // A junction turning, its arms reaching out from the middle.
    const arms = [[1, 1, 0, 1], [1, 1, 0, 0], [1, 1, 1, 0], [1, 0, 1, 0], [1, 0, 1, 1], [0, 0, 1, 1], [0, 1, 1, 1], [0, 1, 0, 1]][i % 8]; // up, left, right, down
    const [u, l, r, d] = arms;
    const hub = "┼├┤│┴└┘╵┬┌┐╷─╶╴ "[((1 - u) << 3) | ((1 - d) << 2) | ((1 - r) << 1) | (1 - l)];
    return plot(5, 3, [[2, 1, hub], ...(u ? [[2, 0, "│"]] satisfies Cell[] : []), ...(d ? [[2, 2, "│"]] satisfies Cell[] : []), ...(l ? [[0, 1, "─"], [1, 1, "─"]] satisfies Cell[] : []), ...(r ? [[3, 1, "─"], [4, 1, "─"]] satisfies Cell[] : [])]);
  }],
  ["arc", 1, (i) => {
    // An arc chasing round a rounded box, stretching and shrinking as it goes.
    const ring: Cell[] = [[0, 0, "╭"], [1, 0, "─"], [2, 0, "─"], [3, 0, "─"], [4, 0, "╮"], [4, 1, "│"], [4, 2, "╯"], [3, 2, "─"], [2, 2, "─"], [1, 2, "─"], [0, 2, "╰"], [0, 1, "│"]];
    const n = 3 + Math.round((ping(8, i) * 4) / 7);
    return plot(5, 3, [...Array(n)].map((_, k) => ring[(i + 12 - k) % 12]));
  }],
  ["bounce", 1, (i) => ["[" + " ".repeat(ping(6, i)) + "o" + " ".repeat(5 - ping(6, i)) + "]"]],
  ["clock", 3, (i) => {
    // One hand from the middle to the rim, a quarter turn a step.
    const g = [[..."╭─────╮"], [..."│     │"], [..."╰─────╯"]];
    const hand = ([[[3, 0, "┬"], [3, 1, "╵"]], [[3, 1, "╶"], [4, 1, "─"], [5, 1, "─"], [6, 1, "┤"]], [[3, 1, "╷"], [3, 2, "┴"]], [[0, 1, "├"], [1, 1, "─"], [2, 1, "─"], [3, 1, "╴"]]] satisfies Cell[][])[i % 4];
    for (const [x, y, ch] of hand) g[y][x] = ch;
    return rows(g);
  }],
  ["bar", 1, (i) => {
    // A bar three rows tall filling and draining in eighths.
    const level = Math.round((ping(12, i + 2) * 24) / 11);
    return [2, 1, 0].map((k) => " ▁▂▃▄▅▆▇█"[Math.max(0, Math.min(8, level - 8 * k))].repeat(3));
  }],
  ["loop", 1, (i) => {
    // A snake of four quadrants running round a three-cell strip.
    const path = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1]];
    const on = new Set([0, 1, 2, 3].map((k) => path[(i + k) % 12].join()));
    const at = (x: number, y: number): number => (on.has(`${x},${y}`) ? 1 : 0);
    return [[0, 2, 4].map((x) => quad(at(x, 0), at(x + 1, 0), at(x, 1), at(x + 1, 1))).join("")];
  }],
  ["scan", 1, (i) => {
    const head = ping(7, i), dir = i % 12 < 6 ? -1 : 1;
    return [[...Array(7)].map((_, x) => (x === head ? "█" : x === head + dir ? "▓" : x === head + 2 * dir ? "░" : "·")).join("")];
  }],
  ["wave", 1, (i) => [[0, 1, 2, 3, 4, 5, 6].map((x) => "▁▂▃▄▅▆▇█"[Math.round(3.5 + 3.5 * Math.sin(((x - i) * Math.PI) / 4))]).join("")]],
  ["slide", 1, (i) => ["[" + [...Array(8)].map((_, x) => (x - ((i % 10) - 2) >= 0 && x - ((i % 10) - 2) < 3 ? "=" : " ")).join("") + "]"]],
  ["orbit", 1, (i) => {
    const ring = [[1, 0], [2, 0], [3, 0], [4, 1], [3, 2], [2, 2], [1, 2], [0, 1]];
    return plot(5, 3, ring.map(([x, y], k) => [x, y, k === i % 8 ? "o" : k === (i + 7) % 8 ? "°" : "·"]));
  }],
];

export default function spinners({ names = meta.options.names, labels = meta.options.labels, speed = meta.options.speed }: Partial<SpinnersOptions> = {}): Frame {
  // filter(Boolean) drops the names that match no spinner.
  const chosen = names && names.length ? names.map((n) => SPINNERS.find((s) => s[0] === n)).filter(Boolean) as Spinner[] : SPINNERS;
  const all = chosen === SPINNERS;
  // Slots eleven columns wide, six to a row; a block is the art's three
  // rows, a blank row and the label.
  const slot = 11, per = all ? 6 : Math.min(6, chosen.length);
  const block = labels || all ? 5 : 3;
  const cols = all ? meta.cols : per * slot;
  const height = all ? meta.rows : Math.ceil(chosen.length / per) * (block + 1) + 1;

  return (t) => {
    const grid: string[][] = Array.from({ length: height }, () => new Array(cols).fill(" "));
    chosen.forEach(([name, frames, draw], n) => {
      const x0 = (n % per) * slot, y0 = 1 + Math.floor(n / per) * (block + 1);
      const art = draw(Math.floor((t * meta.fps * speed) / frames + 1e-3));
      const top = y0 + Math.floor((3 - art.length) / 2);
      art.forEach((line, j) => {
        const left = x0 + Math.floor((slot - [...line].length) / 2);
        [...line].forEach((g, i) => (grid[top + j][left + i] = g));
      });
      if (labels) [...name].forEach((g, i) => (grid[y0 + 4][x0 + Math.floor((slot - name.length) / 2) + i] = g));
    });
    return grid.map((l) => l.join("")).join("\n");
  };
}
