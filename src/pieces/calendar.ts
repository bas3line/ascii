/*
 * calendar: this month laid out like the cal command, today in brackets,
 * with the weekday and the running time along the bottom.
 */
import type { Frame, Meta } from "../types.ts";

export interface CalendarOptions {
  [key: string]: unknown;
  monday: boolean;
  time: boolean;
}

export const meta = {
  name: "calendar",
  category: "ui",
  note: "this month like cal, today bracketed, time ticking below",
  cols: 32,
  rows: 13,
  fps: 8,
  options: { monday: false, time: true },
  clock: true,
} satisfies Meta<CalendarOptions>;

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const L = 2; // left margin; the grid is 7 cells of 4

export default function calendar({ monday = false, time = true }: Partial<CalendarOptions> = {}): Frame {
  const { cols, rows } = meta;
  const pad = (s: string) => (" ".repeat(L) + s).padEnd(cols).slice(0, cols);
  const centre = (s: string) => pad(" ".repeat(Math.max(0, Math.floor((28 - s.length) / 2))) + s);
  const order = monday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  // The month only changes at midnight, so the grid is built once a day.
  let key = "";
  let page: string[] = [];
  const build = (y: number, m: number, d: number): string[] => {
    const lead = (new Date(y, m, 1).getDay() - order[0] + 7) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    const weeks: string[] = [];
    for (let w = 0; w < 6; w++) {
      let line = "";
      for (let c = 0; c < 7; c++) {
        const n = w * 7 + c - lead + 1;
        if (n < 1 || n > count) line += "    ";
        else if (n === d) line += n < 10 ? " [" + n + "]" : "[" + n + "]";
        else line += " " + String(n).padStart(2) + " ";
      }
      weeks.push(pad(line));
    }
    return [
      " ".repeat(cols),
      centre(MONTHS[m] + " " + y),
      pad("─".repeat(28)),
      pad(order.map((i) => " " + DAYS[i].slice(0, 2) + " ").join("")),
      ...weeks,
      pad("─".repeat(28)),
    ];
  };

  // Play time ticks the clock so it steps evenly between frames; the wall
  // clock pulls it back whenever play was paused or fell behind.
  let offset: number | null = null;
  return (t) => {
    const wall = Date.now() / 1000;
    if (offset === null || wall - (offset + t) > 0.25 || offset + t - wall > 60) offset = wall - t;
    const now = new Date((offset + t) * 1000);
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    if (key !== y + "-" + m + "-" + d) {
      key = y + "-" + m + "-" + d;
      page = build(y, m, d);
    }
    const two = (n: number) => String(n).padStart(2, "0");
    const day = DAYS[now.getDay()] + " " + d;
    const clock = time ? two(now.getHours()) + ":" + two(now.getMinutes()) + ":" + two(now.getSeconds()) : "";
    const foot = pad(" " + day + clock.padStart(26 - day.length));
    return [...page, foot, " ".repeat(cols)].slice(0, rows).join("\n");
  };
}
