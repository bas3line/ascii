/*
 * skeleton: the loading placeholder for a card. An avatar, a name and a
 * byline, an image and lines of text in light shade, with a shimmer
 * sweeping across them while the content is on its way.
 */
import type { Frame, Meta } from "../types.ts";

export interface SkeletonOptions {
  [key: string]: unknown;
  lines: number;
  image: boolean;
  avatar: boolean;
}

export const meta = {
  name: "skeleton",
  category: "ui",
  note: "a loading card in shade blocks with a shimmer passing over",
  cols: 52,
  rows: 23,
  fps: 24,
  options: { lines: 3, image: true, avatar: true },
} satisfies Meta<SkeletonOptions>;

const PERIOD = 1.8; // seconds from one sweep to the next
const START = 0.3; // where in the sweep play time begins
const SLANT = 0.8; // columns the band leans per row
const LEFT = 3, RIGHT = 48; // the content's first and last column inside the card

export default function skeleton({ lines = 3, image = true, avatar = true }: Partial<SkeletonOptions> = {}): Frame {
  const { cols, rows } = meta;
  const full = RIGHT - LEFT + 1;

  // Each block is a list of [row, first column, last column] runs.
  const blocks: { h: number; runs: [number, number, number][] }[] = [];
  if (avatar) {
    // A circle six rows tall, kept where a cell is at least half inside.
    const runs: [number, number, number][] = [];
    const ax = LEFT + 6, R = 3;
    for (let r = 0; r < 6; r++) {
      let c0 = -1, c1 = -1;
      for (let c = LEFT; c < LEFT + 12; c++) {
        let hit = 0;
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 4; i++) {
            const x = (c + 0.125 + i * 0.25 - ax) / 2, y = r + 0.125 + j * 0.25 - R;
            if (x * x + y * y < R * R) hit++;
          }
        if (hit >= 8) {
          if (c0 < 0) c0 = c;
          c1 = c;
        }
      }
      runs.push([r, c0, c1]);
    }
    // The name and byline sit level with the avatar's shoulders.
    runs.push([1, LEFT + 15, LEFT + 32], [4, LEFT + 15, LEFT + 26]);
    blocks.push({ h: 6, runs });
  } else {
    blocks.push({ h: 3, runs: [[0, LEFT, LEFT + 17], [2, LEFT, LEFT + 10]] });
  }
  if (image) blocks.push({ h: 6, runs: [0, 1, 2, 3, 4, 5].map((r): [number, number, number] => [r, LEFT, RIGHT]) });

  // As many lines as fit, the last one cut short like the end of a paragraph.
  const used = blocks.reduce((a, b) => a + b.h + 1, 0);
  const n = Math.max(0, Math.min(Math.floor(lines) || 0, Math.floor((rows - 4 - used + 1) / 2)));
  if (n) {
    const runs: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const f = i === n - 1 ? (n === 1 ? 0.72 : 0.58) : [1, 0.91, 0.96, 0.87][i % 4];
      runs.push([i * 2, LEFT, LEFT + Math.round(full * f) - 1]);
    }
    blocks.push({ h: n * 2 - 1, runs });
  }

  // The card is as tall as its blocks and sits in the middle of the frame.
  const inner = blocks.reduce((a, b) => a + b.h, 0) + blocks.length - 1;
  const H = inner + 4;
  const top = Math.floor((rows - H) / 2);
  const mask = new Uint8Array(cols * rows);
  let y = top + 2;
  for (const b of blocks) {
    for (const [r, c0, c1] of b.runs) for (let c = c0; c <= c1; c++) mask[(y + r) * cols + c] = 1;
    y += b.h + 1;
  }

  // The card's rounded border never changes.
  const base = new Array<string>(cols * rows).fill(" ");
  const bot = top + H - 1;
  for (let c = 1; c < cols - 1; c++) base[top * cols + c] = base[bot * cols + c] = "─";
  for (let r = top + 1; r < bot; r++) base[r * cols] = base[r * cols + cols - 1] = "│";
  base[top * cols] = "╭";
  base[top * cols + cols - 1] = "╮";
  base[bot * cols] = "╰";
  base[bot * cols + cols - 1] = "╯";

  const mid = top + H / 2;
  const out: string[] = new Array(cols * rows);
  return (t, { paper = false } = {}) => {
    // Base, edge of the band, its one-cell core. On a dark page the band
    // brightens the shade; on paper it lifts it toward the page.
    const shade = paper ? ["▒", "░", "·"] : ["░", "▒", "▓"];
    // The band runs from just off the left edge to just off the right, so the wrap is unseen.
    const x = -12 + ((t / PERIOD + START) % 1) * (cols + 24);
    for (let k = 0; k < cols * rows; k++) {
      if (!mask[k]) {
        out[k] = base[k];
        continue;
      }
      const r = (k / cols) | 0, c = k % cols;
      const d = Math.abs(c + 0.5 - x - (mid - r) * SLANT);
      out[k] = shade[d < 0.5 ? 2 : d < 4.5 ? 1 : 0];
    }
    const text: string[] = [];
    for (let r = 0; r < rows; r++) text.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return text.join("\n");
  };
}
