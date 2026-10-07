/*
 * dividers: a sheet of rules to set between sections of a page, from a plain
 * line through short centred rules down to ornaments, chains and waves.
 */
import type { Frame, Meta } from "../types.ts";

export interface DividersOptions {
  [key: string]: unknown;
  width: number;
}

export const meta = {
  name: "dividers",
  category: "ui",
  note: "rules and ornaments for between sections, plain to fancy",
  cols: 63,
  rows: 25,
  fps: 0,
  options: { width: 59 },
} satisfies Meta<DividersOptions>;

// `unit` repeated to n characters.
const rep = (unit: string, n: number) => unit.repeat(Math.max(0, Math.ceil(n / unit.length))).slice(0, Math.max(0, n));
// The same string seen in a mirror, so its slanted and pointed glyphs turn too.
const FLIP: Record<string, string> = { "<": ">", ">": "<", "╱": "╲", "╲": "╱", "╶": "╴", "╴": "╶", "╡": "╞", "╞": "╡" };
const mirror = (s: string) => [...s].reverse().map((c) => FLIP[c] || c).join("");
// A left half, an optional middle cell and the half again in the mirror.
const sym = (half: string, mid = "") => half + mid + mirror(half);

// A centrepiece with a rule run out to either side, n wide.
const around = (mid: string, fill: string, n: number) => {
  const side = Math.floor((n - [...mid].length) / 2);
  return sym(rep(fill, side), [...mid].length + 2 * side < n ? fill + mid : mid);
};

// Thin at the ends, heavy in the middle: dots, then dashes, then rules.
const tapered = (n: number) => {
  const h = Math.floor(n / 2);
  if (h < 12) return rep("─", n);
  const run = h - 8, thin = Math.ceil(run * 0.45);
  return sym("· · ─ ─ " + rep("─", thin) + rep("━", run - thin), n % 2 ? "━" : "");
};

export default function dividers({ width = 59 }: Partial<DividersOptions> = {}): Frame {
  const { cols, rows } = meta;
  const W = Math.max(13, Math.min(cols, Math.floor(width) || 59));
  // The ornaments run a fraction of the measure, so they shrink with it.
  const part = (f: number) => Math.max(5, Math.round(W * f));
  const odd = (n: number) => n - (n % 2 ? 0 : 1);

  const SHEET = [
    rep("─", W),
    rep("═", W),
    rep("· ", odd(W)),
    rep("━", odd(part(0.25))), // a short rule, centred
    tapered(W),
    around(" · ° · ", "─", W),
    "*     *     *",
    sym("╶" + rep("─", (odd(part(0.5)) - 5) / 2) + " ", "°"),
    around("╡ ° ╞", "═", odd(part(0.7))),
    sym(rep("─<>", Math.floor((part(0.73) - 1) / 6) * 3), "─"),
    rep("╱╲", part(0.55) - (part(0.55) % 2)), // even, so it ends on the half it began with, mirrored
    rep("_.·°·.", Math.floor((part(0.73) - 1) / 6) * 6) + "_",
  ];

  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const s = r % 2 === 1 ? SHEET[(r - 1) / 2] || "" : "";
    const left = Math.floor((cols - [...s].length) / 2);
    lines.push((" ".repeat(Math.max(0, left)) + s).padEnd(cols).slice(0, cols));
  }
  const picture = lines.join("\n");
  return () => picture;
}
