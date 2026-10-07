/*
 * split-flap: an airport departures board. When a flight leaves, every row moves
 * up and each flap riffles through its drum, one card at a time, to land.
 */
import type { Frame, Meta } from "../types.ts";

export interface SplitFlapOptions {
  [key: string]: unknown;
  title: string;
  start: string;
  flights: [time: string, destination: string, gate: string, remark: string][];
}

export const meta = {
  name: "split-flap",
  category: "type",
  note: "a departures board whose flaps riffle to each new line",
  cols: 61,
  rows: 18,
  fps: 15,
  options: {
    title: "departures",
    start: "14:03", // the clock on the first board
    // time, destination, gate, remark; "on time" turns to boarding as the time nears
    flights: [
      ["14:05", "lisbon", "a4", "on time"],
      ["14:15", "oslo", "b12", "on time"],
      ["14:20", "nairobi", "c7", "delayed"],
      ["14:35", "lima", "a9", "on time"],
      ["14:40", "reykjavik", "d21", "on time"],
      ["14:50", "seoul", "b3", "on time"],
      ["15:00", "marrakesh", "c14", "cancelled"],
      ["15:05", "helsinki", "a2", "on time"],
      ["15:20", "auckland", "d8", "on time"],
      ["15:25", "kyoto", "b16", "delayed"],
      ["15:35", "cape town", "c11", "on time"],
      ["15:45", "montreal", "a6", "on time"],
    ],
  },
} satisfies Meta<SplitFlapOptions>;

// The cards on each kind of flap's drum, in the order they turn up.
const TEXT = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/'&";
const DIGITS = " 0123456789";
const STEP = 3; // seconds per board: a departure, then a clock and remarks update
const LEAD = 0.8; // the first flip, after a settled first frame
const RATE = 30; // cards per second
const SHOWN = 6;

const hash = (a: number, b: number, c: number): number => {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const minutes = (s: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const hhmm = (m: number): string => {
  m = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + String(m % 60).padStart(2, "0");
};

export default function splitFlap({ title = meta.options.title, start = meta.options.start, flights = meta.options.flights }: Partial<SplitFlapOptions> = {}): Frame {
  const { cols, rows } = meta;
  let list = (Array.isArray(flights) ? flights : []).filter((f) => Array.isArray(f) && !isNaN(minutes(f[0])));
  if (!list.length) list = meta.options.flights;
  const n = list.length;
  // Times run forward through the list, past midnight if they wrap, and the
  // list comes round again one lap later.
  const at: number[] = [];
  for (const f of list) {
    let m = minutes(f[0]);
    while (at.length && m < at[at.length - 1]) m += 1440;
    at.push(m);
  }
  const lap = at[n - 1] - at[0] + (n > 1 ? Math.max(5, Math.round((at[n - 1] - at[0]) / (n - 1))) : 30);
  const minute = (j: number): number => at[((j % n) + n) % n] + Math.floor(j / n) * lap;
  const flight = (j: number) => list[((j % n) + n) % n];
  const up = (s: string): string => String(s ?? "").toUpperCase();

  // Board s lists flights from s / 2. On even boards one has just left; on odd
  // ones the clock has moved on to just before the next goes.
  const first = (s: number): number => Math.floor(s / 2);
  const opening = minutes(start);
  const clock = (s: number): number => (s === 1 && !isNaN(opening) ? opening : s % 2 ? minute(first(s)) - 2 : minute(first(s) - 1) + 1);

  // Every run of flaps: [row, first column, tiles, drum, text on board s].
  const fields: [row: number, col: number, tiles: number, drum: string, text: (s: number) => string][] = [];
  const time = (r: number, c: number, m: (s: number) => number) => fields.push([r, c, 2, DIGITS, (s) => hhmm(m(s)).slice(0, 2)], [r, c + 6, 2, DIGITS, (s) => hhmm(m(s)).slice(2)]);
  time(1, cols - 11, clock);
  for (let i = 0; i < SHOWN; i++) {
    const r = 5 + i * 2;
    const live = () => i < n;
    const f = (s: number) => flight(first(s) + i);
    const remark = (s: number): string => {
      const said = up(f(s)[3]).trim();
      if (said && said !== "ON TIME") return said;
      const wait = minute(first(s) + i) - clock(s);
      return wait <= 3 ? "LAST CALL" : wait <= 12 ? "BOARDING" : wait <= 25 ? "GATE OPEN" : "ON TIME";
    };
    fields.push(
      [r, 2, 2, DIGITS, (s) => (live() ? hhmm(minute(first(s) + i)).slice(0, 2) : "")],
      [r, 8, 2, DIGITS, (s) => (live() ? hhmm(minute(first(s) + i)).slice(2) : "")],
      [r, 14, 9, TEXT, (s) => (live() ? up(f(s)[1]) : "")],
      [r, 34, 3, TEXT, (s) => (live() ? up(f(s)[2]) : "")],
      [r, 42, 9, TEXT, (s) => (live() ? remark(s) : "")],
    );
  }

  // The fixed parts of the board: frame, labels, colons and the split beneath each tile.
  const base: string[][] = [];
  for (let r = 0; r < rows; r++) base.push(("│" + " ".repeat(cols - 2) + "│").split(""));
  base[0] = ("╭" + "─".repeat(cols - 2) + "╮").split("");
  base[3] = ("├" + "─".repeat(cols - 2) + "┤").split("");
  base[rows - 1] = ("╰" + "─".repeat(cols - 2) + "╯").split("");
  const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => c + i < cols - 1 && (base[r][c + i] = ch));
  put(1, 2, [...up(title).slice(0, 18)].join(" "));
  put(4, 2, "time");
  put(4, 14, "destination");
  put(4, 34, "gate");
  put(4, 42, "remarks");
  for (const [r, c, len] of fields) for (let i = 0; i < len; i++) base[r + 1][c + 2 * i] = "▔";
  for (let i = -1; i < SHOWN; i++) if (i < n) put(i < 0 ? 1 : 5 + i * 2, i < 0 ? cols - 7 : 6, ":");

  return (t) => {
    const v = t - LEAD + STEP;
    const k = Math.floor(v / STEP);
    const since = v - k * STEP;
    const s = 1 + k;
    const grid = base.map((row) => row.slice());
    for (const [r, c, len, drum, text] of fields) {
      const to = text(s).padEnd(len).slice(0, len);
      const from = text(s - 1).padEnd(len).slice(0, len);
      for (let i = 0; i < len; i++) {
        const a = Math.max(0, drum.indexOf(from[i])), b = Math.max(0, drum.indexOf(to[i]));
        let ch = drum[b];
        if (a !== b) {
          // Each flap starts a touch after its neighbour and turns forward only;
          // while it turns, the falling card hangs over the split.
          const begin = r * 0.02 + (c + 2 * i) * 0.004 + hash(r, c + i, s) * 0.12;
          const flips = Math.floor(Math.max(0, since - begin) * RATE);
          const need = (b - a + drum.length) % drum.length;
          if (flips < need) {
            ch = drum[(a + flips) % drum.length];
            if (since >= begin) grid[r + 1][c + 2 * i] = "▀";
          }
        }
        grid[r][c + 2 * i] = ch;
      }
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
