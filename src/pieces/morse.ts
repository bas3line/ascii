/*
 * morse: a signal lamp keys out a message. The marks run off along a tape from
 * the head, and each letter is written beneath its group once it is complete.
 */
import type { Frame, Meta } from "../types.ts";

export interface MorseOptions {
  [key: string]: unknown;
  text: string;
}

export const meta = {
  name: "morse",
  category: "type",
  note: "a lamp keying morse, the marks on a tape, letters decoded",
  cols: 64,
  rows: 19,
  fps: 15,
  options: { text: "hello world" },
} satisfies Meta<MorseOptions>;

const CODE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---",
  3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.", ".": ".-.-.-",
  ",": "--..--", "?": "..--..", "!": "-.-.--", "'": ".----.", "/": "-..-.", "-": "-....-", "&": ".-...",
};
const UNIT = 0.12; // seconds per dot
const RAMP = " ·:░▒▓█";

export default function morse({ text = meta.options.text }: Partial<MorseOptions> = {}): Frame {
  const { cols, rows } = meta;
  // Lay the message out in dot units: when each mark is on, and where each letter sits.
  const on: number[] = [];
  const letters: [string, number, number][] = [];
  let at = 0;
  for (const ch of String(text).toUpperCase()) {
    const code = CODE[ch];
    if (!code) {
      at += 4; // a word gap is seven, three already follow the letter before
      continue;
    }
    const start = at;
    for (const m of code) {
      const len = m === "." ? 1 : 3;
      for (let i = 0; i < len; i++) on[at + i] = 1;
      at += len + 1;
    }
    letters.push([ch, start, at - 1]);
    at += 2;
  }
  const L = Math.max(at + 12, 20); // a long rest before it starts again
  const lit = (x: number) => on[((x % L) + L) % L] === 1;

  const cx = 31, cy = 6; // the lamp's centre
  const head = cols - 7; // where marks land on the tape
  const tape = 16;
  // Seconds of play already sent at frame 0, chosen so the lamp is lit and the tape full.
  let warm = Math.min(45, L - 1);
  while (!lit(warm) && warm < L * 2) warm++;
  const t0 = (warm + 0.5) * UNIT;

  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) grid.push(new Array<string>(cols).fill(" "));
  const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => r >= 0 && r < rows && c + i >= 0 && c + i < cols && (grid[r][c + i] = ch));

  return (t, { paper = false } = {}) => {
    const now = (t + t0) / UNIT;
    const unit = Math.floor(now);
    // Full while keyed, with a brief afterglow as the shutter closes.
    const glow = lit(unit) ? 1 : lit(unit - 1) && now - unit < 0.5 ? 0.35 : 0;
    for (const row of grid) row.fill(" ");

    // The lamp face: a lens, a dark gap, then the housing ring.
    for (let r = 0; r < 12; r++) {
      for (let c = cx - 10; c <= cx + 10; c++) {
        const dx = (c - cx) / 2, dy = r - cy;
        const d = Math.hypot(dx, dy);
        if (d <= 2.75) {
          // Lit, the glass is brightest at the centre; dark, only a glint shows.
          const glint = dx < -0.3 && dy < -0.3 && Math.abs(d - 1.9) < 0.45 ? 0.34 : 0;
          const b = glow ? glow * (0.62 + 0.38 * (1 - (d / 2.75) ** 2)) : glint;
          const i = Math.round(b * (RAMP.length - 1));
          grid[r][c] = RAMP[paper ? RAMP.length - 1 - i : i];
        } else if (d > 3.2 && d <= 4.15) grid[r][c] = d > 3.8 ? "▓" : "█";
      }
    }
    // Rays while it shines.
    if (glow) {
      const n = glow === 1 ? 3 : 1;
      for (let k = 0; k < n; k++) {
        put(cy, cx - 13 - 2 * k, "─");
        put(cy, cx + 13 + 2 * k, "─");
        put(cy - 5 - k, cx, "│");
        put(cy - 4 - k, cx - 6 - k, "╲");
        put(cy - 4 - k, cx + 6 + k, "╱");
      }
    }
    // The yoke it swings in, a post and a foot.
    for (let r = cy; r < cy + 5; r++) put(r, cx - 10, "│"), put(r, cx + 10, "│");
    put(cy, cx - 10, "o");
    put(cy, cx + 10, "o");
    put(cy + 5, cx - 10, "╰" + "─".repeat(9) + "┬" + "─".repeat(9) + "╯");
    put(cy + 6, cx, "│");
    put(cy + 7, cx - 5, "▄▄▄▄█▀█▄▄▄▄");

    // The tape: marks behind the head, blank paper ahead of it.
    put(tape - 1, 0, "─".repeat(cols));
    put(tape + 1, 0, "─".repeat(cols));
    for (let c = 0; c <= head; c++) if (lit(unit - (head - c))) grid[tape][c] = "█";
    put(tape - 1, head, "┬");
    put(tape + 1, head, "┴");
    // Each letter under the middle of its group once its last mark is sent.
    const lap = Math.floor(unit / L);
    for (let k = lap - 1; k <= lap; k++) {
      for (const [ch, s, e] of letters) {
        const end = k * L + e;
        if (end > unit - 1) continue;
        put(tape + 2, head - (unit - Math.round(k * L + (s + e) / 2)), ch);
      }
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
