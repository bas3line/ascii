/*
 * rule 30: an elementary cellular automaton grown from one live cell, each
 * generation a row, scrolling up. It runs rule 30, then 90, then 110, each
 * from a fresh seed. Two generations to a character, so cells are square.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "rule 30",
  category: "generative",
  note: "one cell grows a row at a time under rules 30, 90 and 110",
  cols: 64,
  rows: 20,
  fps: 8,
} satisfies Meta;

// Each rule, the column of its seed, and how many generations it runs: short
// enough that its triangle never reaches the sides. Rule 90 stops on the row
// that closes its fifth level of triangles; rule 110 grows only to the left,
// so its seed sits right of centre.
const RULES: [number, number, number][] = [
  [30, 31, 32],
  [90, 31, 32],
  [110, 51, 40],
];
const GAP = 12; // blank generations between one rule and the next
const SPEED = 8; // character rows a second, one a frame

export default function rule30(): Frame {
  const { cols, rows } = meta;
  const EXTRA = 48; // cells past each side, so the edges never show
  const W = cols + 2 * EXTRA;
  const tape: Uint8Array[] = []; // every generation of the loop, cropped to the frame

  for (const [rule, at, gens] of RULES) {
    let cur = new Uint8Array(W);
    let nxt = new Uint8Array(W);
    cur[EXTRA + at] = 1;
    for (let g = 0; g < gens; g++) {
      tape.push(cur.slice(EXTRA, EXTRA + cols));
      for (let i = 1; i < W - 1; i++) nxt[i] = (rule >> ((cur[i - 1] << 2) | (cur[i] << 1) | cur[i + 1])) & 1;
      [cur, nxt] = [nxt, cur];
    }
    for (let g = 0; g < GAP; g++) tape.push(new Uint8Array(cols));
  }
  // Every run and gap is an even number of generations, so the tape scrolls a
  // whole character row at a time and each glyph keeps the same two
  // generations from frame to frame.
  const LOOP = tape.length / 2;

  // The newest generation is always the bottom row. At t = 0 the first
  // triangle sits two rows down from the top.
  const GLYPH = [" ", "▀", "▄", "█"];
  return (t) => {
    const top = Math.floor(t * SPEED) - 2;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const k = (((top + r) % LOOP) + LOOP) % LOOP;
      const a = tape[2 * k], b = tape[2 * k + 1];
      let line = "";
      for (let c = 0; c < cols; c++) line += GLYPH[a[c] + 2 * b[c]];
      lines.push(line);
    }
    return lines.join("\n");
  };
}
