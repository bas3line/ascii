/*
 * digital-clock: the local time as big seven-segment digits, HH:MM:SS, with
 * the colon blinking each second and the date set small underneath.
 */
import type { Frame, Meta } from "../types.ts";

export interface DigitalClockOptions {
  [key: string]: unknown;
  hour12: boolean;
  seconds: boolean;
  date: boolean;
}

export const meta = {
  name: "digital clock",
  category: "ui",
  note: "the local time in seven-segment digits, colon blinking",
  cols: 70,
  rows: 11,
  fps: 10,
  options: { hour12: false, seconds: true, date: true },
  clock: true,
} satisfies Meta<DigitalClockOptions>;

// A digit is 8 cells wide and 7 tall, about 4:7 once cells are drawn twice as
// tall as wide. Segments a to g as [row0, row1, col0, col1].
const DW = 8, DH = 7;
const SEGS: [number, number, number, number][] = [
  [0, 0, 2, DW - 3],
  [1, 2, DW - 2, DW - 1],
  [4, 5, DW - 2, DW - 1],
  [6, 6, 2, DW - 3],
  [4, 5, 0, 1],
  [1, 2, 0, 1],
  [3, 3, 2, DW - 3],
];
const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export default function digitalClock({ hour12 = false, seconds = true, date = true }: Partial<DigitalClockOptions> = {}): Frame {
  const { cols, rows } = meta;
  const top = date ? 1 : 2;
  const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));

  // Unlit segments stay faintly visible, like the glass of a real display.
  const digit = (x: number, n: number) => {
    const mask = n < 0 ? 0 : DIGITS[n];
    SEGS.forEach(([r0, r1, c0, c1], s) => {
      const ch = (mask >> s) & 1 ? "█" : "░";
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[top + r][x + c] = ch;
    });
  };
  const colon = (x: number, on: boolean) => {
    for (const r of [2, 4]) grid[top + r][x] = grid[top + r][x + 1] = on ? "█" : "░";
  };

  // Play time ticks the clock so it steps evenly between frames; the wall
  // clock pulls it back whenever play was paused or fell behind.
  let offset: number | null = null;
  return (t) => {
    const wall = Date.now() / 1000;
    if (offset === null || wall - (offset + t) > 0.25 || offset + t - wall > 60) offset = wall - t;
    const secs = offset + t;
    const now = new Date(secs * 1000);
    const on = secs - Math.floor(secs) < 0.5;

    let h = now.getHours();
    const pm = h >= 12;
    if (hour12) h = h % 12 || 12;
    const pairs = [h, now.getMinutes(), now.getSeconds()].slice(0, seconds ? 3 : 2);
    const width = pairs.length * (2 * DW + 2) + (pairs.length - 1) * 6;
    let x = Math.floor((cols - width) / 2);

    for (const row of grid) row.fill(" ");
    pairs.forEach((v, i) => {
      if (i) {
        colon(x + 2, on);
        x += 6;
      }
      // A 12-hour clock leaves its first digit dark rather than showing a zero.
      digit(x, i === 0 && hour12 && v < 10 ? -1 : Math.floor(v / 10));
      digit(x + DW + 2, v % 10);
      x += 2 * DW + 2;
    });

    if (date) {
      let line = DAYS[now.getDay()] + " " + now.getDate() + " " + MONTHS[now.getMonth()] + " " + now.getFullYear();
      if (hour12) line += pm ? "  pm" : "  am";
      const c0 = Math.floor((cols - line.length) / 2);
      for (let i = 0; i < line.length; i++) grid[top + DH + 1][c0 + i] = line[i];
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
