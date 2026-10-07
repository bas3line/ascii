/*
 * hilbert curve: two Hilbert curves, each through every point of an 8 by 8
 * grid, joined end to end into one closed loop. Two lit runners circle it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "hilbert curve",
  category: "generative",
  note: "a closed loop of two hilbert curves, with two lit runners",
  cols: 65,
  rows: 17,
  fps: 20,
} satisfies Meta;

const GW = 16, GH = 8; // grid points across and down
const SX = 4, SY = 2; // characters from one point to the next: a square step
const OX = 2, OY = 1; // the margin round the drawing
const LEN = 30; // a runner's heavy stretch, in column widths (a row is two)
const TAIL = 4; // and its dashed tail behind that
const SPEED = 16; // column widths a second

// Jakub Cerveny's generalized Hilbert curve (gilbert2d), for any w by h grid.
function gilbert(pts: [number, number][], x: number, y: number, ax: number, ay: number, bx: number, by: number): void {
  const w = Math.abs(ax + ay), h = Math.abs(bx + by);
  const [dax, day, dbx, dby] = [ax, ay, bx, by].map(Math.sign);
  if (h === 1 || w === 1) {
    const [dx, dy, n] = h === 1 ? [dax, day, w] : [dbx, dby, h];
    for (let i = 0; i < n; i++, x += dx, y += dy) pts.push([x, y]);
    return;
  }
  let [ax2, ay2, bx2, by2] = [ax, ay, bx, by].map((v) => Math.floor(v / 2));
  if (2 * w > 3 * h) {
    if (Math.abs(ax2 + ay2) % 2 && w > 2) (ax2 += dax), (ay2 += day);
    gilbert(pts, x, y, ax2, ay2, bx, by);
    gilbert(pts, x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
  } else {
    if (Math.abs(bx2 + by2) % 2 && h > 2) (bx2 += dbx), (by2 += dby);
    gilbert(pts, x, y, bx2, by2, ax2, ay2);
    gilbert(pts, x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
    gilbert(pts, x + (ax - dax) + (bx2 - dbx), y + (ay - day) + (by2 - dby), -bx2, -by2, -(ax - ax2), -(ay - ay2));
  }
}

// Arms: left 1, right 2, up 4, down 8. For each pair of arms, the glyph with
// neither, the first, the second or both drawn heavy.
const L = 1, R = 2, U = 4, D = 8;
const GLYPHS: Record<number, string[]> = {
  [L | R]: ["─", "╾", "╼", "━"],
  [U | D]: ["│", "╿", "╽", "┃"],
  [R | D]: ["╭", "┍", "┎", "┏"],
  [L | D]: ["╮", "┑", "┒", "┓"],
  [R | U]: ["╰", "┕", "┖", "┗"],
  [L | U]: ["╯", "┙", "┚", "┛"],
};
const FIRST: Record<number, number> = { [L | R]: L, [U | D]: U, [R | D]: R, [L | D]: L, [R | U]: R, [L | U]: L };
const BACK: Record<number, number> = { [L]: R, [R]: L, [U]: D, [D]: U };
const DASH: Record<number, string> = { [L | R]: "╍", [U | D]: "╏" }; // a straight cell in a tail

// A cell of the loop: where it is, the arms it comes in and leaves by, where
// along the loop each arm's middle is, and for a straight cell the next corner's.
interface Cell {
  r: number;
  c: number;
  into: number;
  out: number;
  a?: number;
  b?: number;
  corner?: number;
}

export default function hilbertCurve(): Frame {
  const { cols, rows } = meta;
  // The left half runs down its right edge's side and the right half back up
  // its left edge's, so each ends one step from where the other starts.
  const pts: [number, number][] = [];
  gilbert(pts, GW / 2 - 1, 0, 0, GH, -GW / 2, 0);
  gilbert(pts, GW / 2, GH - 1, 0, -GH, GW / 2, 0);

  // Every cell the loop passes through, in order, with the arm it comes in by
  // and the arm it leaves by, and where along the loop each arm's middle is.
  const cells: Cell[] = [];
  const dirOf = (dx: number, dy: number) => (dx < 0 ? L : dx > 0 ? R : dy < 0 ? U : D);
  const n = pts.length;
  for (let k = 0; k < n; k++) {
    const [x, y] = pts[k], next = pts[(k + 1) % n], prev = pts[(k + n - 1) % n];
    const out = dirOf(next[0] - x, next[1] - y);
    cells.push({ r: OY + y * SY, c: OX + x * SX, into: dirOf(prev[0] - x, prev[1] - y), out });
    const [dx, dy] = out === L ? [-1, 0] : out === R ? [1, 0] : out === U ? [0, -1] : [0, 1];
    for (let s = 1; s < (out & (L | R) ? SX : SY); s++)
      cells.push({ r: OY + y * SY + dy * s, c: OX + x * SX + dx * s, into: BACK[out], out });
  }
  let d = 0;
  const half = (arm: number) => (arm & (L | R) ? 0.5 : 1);
  for (const cell of cells) {
    cell.a = d + half(cell.into) / 2;
    d += half(cell.into);
    cell.b = d + half(cell.out) / 2;
    d += half(cell.out);
  }
  const LAP = d;
  // For each straight cell, where the next corner ahead of it leaves by.
  let corner = 0;
  for (let k = 2 * cells.length - 1; k >= 0; k--) {
    const cell = cells[k % cells.length];
    if (!DASH[cell.into | cell.out]) corner = cell.b!;
    else cell.corner = corner;
  }

  // How far behind the nearer runner a point is: 0 at a head, up to half a lap.
  const behind = (at: number, head: number) => (((head - at) % (LAP / 2)) + LAP / 2) % (LAP / 2);
  const tail = (b: number) => b >= LEN && b < LEN + TAIL;

  const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(" "));
  return (t) => {
    const head = 40 + t * SPEED;
    for (const cell of cells) {
      const mask = cell.into | cell.out;
      const bi = behind(cell.a!, head), bo = behind(cell.b!, head);
      const hi = bi < LEN, ho = bo < LEN;
      // Just behind a runner, straight cells go dashed, a weight between heavy
      // and light. Corners have no dashed form, so a tail stops at one.
      if (DASH[mask] && tail(bi) && tail(bo) && !tail(behind(cell.corner!, head))) {
        grid[cell.r][cell.c] = DASH[mask];
        continue;
      }
      const [first, second] = FIRST[mask] === cell.into ? [hi, ho] : [ho, hi];
      grid[cell.r][cell.c] = GLYPHS[mask][(first ? 1 : 0) + (second ? 2 : 0)];
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
