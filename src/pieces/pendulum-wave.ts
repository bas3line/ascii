/*
 * pendulum-wave: a row of pendulums seen from above, hung from one rail. Bob
 * n swings 60 + n times every 150 seconds, so the row drifts from one wave
 * into two, three, a braid and a zigzag, then lines up again once a cycle.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pendulum wave",
  category: "physics",
  note: "a row of pendulums drifting in and out of step, from above",
  cols: 67,
  rows: 19,
  fps: 30,
} satisfies Meta;

const N = 21; // bobs
const GAP = 3; // columns from one bob to the next
const CYCLE = 150; // seconds until every bob lines up again
const BASE = 60; // swings the slowest bob makes in one cycle
const BLUR = 0.07; // seconds of motion blur behind each bob
const T0 = (1.5 * CYCLE) / (N - 1); // a wave and a half across the row

export default function pendulumWave(): Frame {
  const { cols, rows } = meta;
  const left = Math.floor((cols - (N - 1) * GAP - 1) / 2);
  const mid = (rows - 1) / 2; // the rail, straight above every bob at rest
  // The rail runs the length of the row, a little past each end.
  const right = left + (N - 1) * GAP;
  const rail = new Array<string>(cols).fill(" ");
  for (let c = left - 1; c <= right + 1; c++) rail[c] = "─";
  rail[left - 1] = "╶";
  rail[right + 1] = "╴";
  const out: string[] = new Array(cols * rows);
  // The swing spans every row but the first and last.
  const row = (n: number, t: number) => 1 + ((1 - Math.cos((2 * Math.PI * (BASE + n) * t) / CYCLE)) * (rows - 3)) / 2;

  return (time) => {
    const t = time + T0;
    out.fill(" ");
    for (let c = 0; c < cols; c++) out[mid * cols + c] = rail[c];
    for (let n = 0; n < N; n++) {
      const c = left + n * GAP;
      const now = Math.round(row(n, t));
      // The cells the bob crossed in the last instant smear into a faint
      // streak; the rail shows through it.
      const then = Math.round(row(n, t - BLUR));
      const [a, b] = now < then ? [now + 1, then] : [then, now - 1];
      for (let r = a; r <= b; r++) if (r !== mid) out[r * cols + c] = Math.abs(r - now) === 1 ? ":" : "·";
      out[now * cols + c] = "o";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
