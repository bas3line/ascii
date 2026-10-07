/*
 * maze: a recursive backtracker carving a maze out of a grid, its stack shown
 * as a dotted trail, then the way through drawn in, then the walls close up
 * and a new maze starts.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "maze",
  category: "generative",
  note: "a maze carved by backtracking, then solved, then remade",
  cols: 61,
  rows: 21,
  fps: 20,
} satisfies Meta;

const MW = 15, MH = 10; // cells across and down; four columns by two rows each
const CARVE = 40; // backtracker moves a second
const SOLVE = 2.4; // seconds to draw the way through
const HOLD = 2.2;
const CLOSE = 1.2; // seconds for the walls to sweep back
const START = 5.2; // where in the first cycle play time begins, in seconds

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Maze {
  moves: number[];
  way: number[];
}

// The backtracker's moves for one maze: +n steps forward into cell n, -1 steps
// back. Then the way from the top left cell to the bottom right one.
function build(seed: number): Maze {
  const rand = mulberry32(seed);
  const N = MW * MH;
  const seen = new Uint8Array(N);
  const parent = new Int16Array(N).fill(-1);
  const moves: number[] = [];
  const stack = [0];
  seen[0] = 1;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const x = c % MW, y = (c / MW) | 0;
    const next: number[] = [];
    if (x > 0 && !seen[c - 1]) next.push(c - 1);
    if (x < MW - 1 && !seen[c + 1]) next.push(c + 1);
    if (y > 0 && !seen[c - MW]) next.push(c - MW);
    if (y < MH - 1 && !seen[c + MW]) next.push(c + MW);
    if (!next.length) {
      stack.pop();
      if (stack.length) moves.push(-1);
      continue;
    }
    const n = next[Math.floor(rand() * next.length)];
    seen[n] = 1;
    parent[n] = c;
    stack.push(n);
    moves.push(n);
  }
  const way = [N - 1];
  while (way[way.length - 1] !== 0) way.push(parent[way[way.length - 1]]);
  return { moves, way: way.reverse() };
}

const L = 1, R = 2, U = 4, D = 8;
const JOIN = [" ", "╴", "╶", "─", "╵", "┘", "└", "┴", "╷", "┐", "┌", "┬", "│", "┤", "├", "┼"];
const PATH: Record<number, string> = { [L | R]: "━", [U | D]: "┃", [R | D]: "┏", [L | D]: "┓", [R | U]: "┗", [L | U]: "┛" };

export default function maze(): Frame {
  const { cols, rows } = meta;
  const mazes = new Map<number, Maze>();
  const get = (n: number): Maze => {
    if (!mazes.has(n)) {
      if (mazes.size > 2) mazes.delete(mazes.keys().next().value!);
      mazes.set(n, build(1009 + n * 7919));
    }
    return mazes.get(n)!;
  };
  // The backtracker steps into every cell but the first once and back once.
  const CARVED = (2 * (MW * MH - 1)) / CARVE;
  const PERIOD = CARVED + SOLVE + HOLD + CLOSE;

  const H = new Uint8Array((MH + 1) * MW); // the wall above each cell, and below the last row
  const V = new Uint8Array(MH * (MW + 1)); // the wall left of each cell, and right of the last column
  const state = new Uint8Array(MW * MH); // 0 untouched, 1 on the stack, 2 done
  const grid = Array.from({ length: rows }, () => new Array<string>(cols));
  const put = (r: number, c: number, ch: string) => (grid[r][c] = ch);
  const centre = (n: number): [number, number] => [2 * ((n / MW) | 0) + 1, 4 * (n % MW) + 2];

  const draw = (m: Maze, k: number, solved: number, out: string[]) => {
    H.fill(1);
    V.fill(1);
    V[0] = 0; // the way in, top left
    V[(MH - 1) * (MW + 1) + MW] = 0; // and out, bottom right
    state.fill(0);
    state[0] = 1;
    const stack = [0];
    for (let i = 0; i < k; i++) {
      const mv = m.moves[i];
      const c = stack[stack.length - 1];
      if (mv < 0) {
        state[stack.pop()!] = 2;
        continue;
      }
      const d = mv - c;
      if (d === 1) V[((c / MW) | 0) * (MW + 1) + (c % MW) + 1] = 0;
      else if (d === -1) V[((c / MW) | 0) * (MW + 1) + (c % MW)] = 0;
      else if (d === MW) H[mv] = 0;
      else H[c] = 0;
      state[mv] = 1;
      stack.push(mv);
    }
    if (k >= m.moves.length) state[0] = 2;

    for (let r = 0; r < rows; r++) grid[r].fill(" ");
    for (let j = 0; j <= MH; j++)
      for (let i = 0; i <= MW; i++) {
        const arms =
          (i > 0 && H[j * MW + i - 1] ? L : 0) |
          (i < MW && H[j * MW + i] ? R : 0) |
          (j > 0 && V[(j - 1) * (MW + 1) + i] ? U : 0) |
          (j < MH && V[j * (MW + 1) + i] ? D : 0);
        put(2 * j, 4 * i, JOIN[arms]);
        if (i < MW && H[j * MW + i]) for (let s = 1; s < 4; s++) put(2 * j, 4 * i + s, "─");
        if (j < MH && V[j * (MW + 1) + i]) put(2 * j + 1, 4 * i, "│");
      }
    for (let n = 0; n < MW * MH; n++) {
      const [r, c] = centre(n);
      if (state[n] === 0) for (let s = -1; s <= 1; s++) put(r, c + s, "░");
    }
    // The stack as a dotted trail, through each cell and each opening.
    if (k < m.moves.length) {
      for (let i = 0; i < stack.length; i++) {
        const [r, c] = centre(stack[i]);
        put(r, c, "·");
        if (i > 0) {
          const [r0, c0] = centre(stack[i - 1]);
          put((r + r0) / 2, (c + c0) / 2, "·");
        }
      }
      const [r, c] = centre(stack[stack.length - 1]);
      put(r, c - 1, "█");
      put(r, c, "█");
      put(r, c + 1, "█");
    }
    // The way through, drawn in from the entrance as far as `solved` (0 to 1).
    if (solved > 0) {
      const way = m.way;
      const pts = [[1, -1], ...way.map(centre), [2 * MH - 1, cols]];
      const cells: [number, number, number, number][] = [];
      for (let p = 1; p < pts.length; p++) {
        const [r0, c0] = pts[p - 1], [r1, c1] = pts[p];
        const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
        for (let r = r0, c = c0; r !== r1 || c !== c1; ) {
          r += dr;
          c += dc;
          cells.push([r, c, dr, dc]);
        }
      }
      const shown = Math.round(solved * cells.length);
      for (let q = 0; q < shown && q < cells.length; q++) {
        const [r, c, dr, dc] = cells[q];
        if (c < 0 || c >= cols) continue;
        const into = dc > 0 ? L : dc < 0 ? R : dr > 0 ? U : D;
        const nx = cells[q + 1];
        const outOf = !nx || q + 1 >= shown ? (into & (L | R) ? L | R : U | D) & ~into : nx[3] > 0 ? R : nx[3] < 0 ? L : nx[2] > 0 ? D : U;
        put(r, c, PATH[into | outOf] || "━");
      }
    }
    for (let r = 0; r < rows; r++) out[r] = grid[r].join("");
  };

  const now: string[] = [], fresh: string[] = [];
  return (t) => {
    // Which maze is playing, and how far into it.
    const n = Math.floor((t + START) / PERIOD);
    const p = t + START - n * PERIOD;
    const m = get(n);
    const k = Math.min(m.moves.length, Math.floor(p * CARVE));
    const solved = Math.min(1, Math.max(0, (p - CARVED) / SOLVE));
    draw(m, k, solved, now);
    const close = (p - CARVED - SOLVE - HOLD) / CLOSE;
    if (close <= 0) return now.join("\n");
    // The walls sweep back in from the left a column of cells at a time,
    // ready for the next maze.
    draw(get(n + 1), 0, 0, fresh);
    const edge = 4 * Math.min(MW, Math.floor(close * (MW + 1))) + 1;
    return now.map((line, r) => fresh[r].slice(0, edge) + line.slice(edge)).join("\n");
  };
}
