/*
 * falling-sand: sand pouring from a spout onto a shelf, as a cellular automaton two grains to a
 * character. The heap grows at its angle of repose; then the shelf opens, it drains, and it pours again.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "falling sand",
  category: "physics",
  note: "sand pouring into a heap, then draining through the shelf",
  cols: 55,
  rows: 22,
  fps: 20,
} satisfies Meta;

const STEPS = 4; // automaton steps a frame
const RATE = 0.92; // chance a grain leaves the nozzle each step
const LAYER = 150; // steps of pouring before the sand changes shade
const WARM = 290; // steps played before the first frame

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function fallingSand(): Frame {
  const { cols, rows } = meta;
  const W = cols, H = rows * 2; // a character holds two grains, one above the other
  const SHELF = H - 2; // the shelf is the bottom row; sand that misses it leaves the frame
  const MID = (W - 1) / 2, END = 5; // the nozzle's column, and the shelf runs from END to W - 1 - END
  const OPEN = MID - END + 0.5; // how far each half slides back, into its end cap, to open
  const NOZZLE = 5; // the row grains leave the spout from
  const rand = mulberry32(7);
  const grid = new Uint8Array(W * H); // 0 empty, else 1 + shade
  const moved = new Int32Array(W * H).fill(-9);
  let step = 0, phase = "pour", clock = 0, slide = 0, shade = 0, poured = 0, spilled = 0, held = 0;

  // Opening, each half of the shelf slides back toward its end, from the middle out.
  const solid = (x: number, y: number) => y >= SHELF && x >= END && x <= W - 1 - END && Math.abs(x - MID) >= slide;
  const free = (x: number, y: number) => y < H && (x < 0 || x >= W || (!grid[y * W + x] && !solid(x, y)));
  const move = (a: number, x: number, y: number) => {
    if (x >= 0 && x < W) {
      grid[y * W + x] = grid[a];
      moved[y * W + x] = step;
    }
    grid[a] = 0;
  };

  const tick = () => {
    step++;
    let top = H;
    held = 0;
    for (let y = H - 1; y >= 0; y--) {
      const flip = (step + y) & 1;
      for (let i = 0; i < W; i++) {
        const x = flip ? W - 1 - i : i, a = y * W + x;
        if (!grid[a] || moved[a] === step) continue;
        held++;
        if (y === H - 1) {
          grid[a] = 0; // gone out of the bottom of the frame, off an end of the shelf or through it
          spilled++;
          continue;
        }
        if (free(x, y + 1)) {
          move(a, x, y + 1);
          continue;
        }
        const d = rand() < 0.5 ? -1 : 1;
        if (free(x + d, y + 1)) move(a, x + d, y + 1);
        else if (free(x - d, y + 1)) move(a, x - d, y + 1);
        // A grain on a steep slope slides a step sideways before it rolls on down.
        else if (rand() < 0.35 && free(x + d, y) && free(x + 2 * d, y + 1)) move(a, x + d, y);
        else if (moved[a] < step - 2 && y < top) top = y;
      }
    }
    // The spout never stops; while the shelf is open the stream runs straight through it.
    if (rand() < RATE && free(MID, NOZZLE)) {
      grid[NOZZLE * W + MID] = 1 + shade;
      moved[NOZZLE * W + MID] = step;
    }
    if (++poured % LAYER === 0) shade ^= 1;
    // Full once the heap runs off both ends of the shelf, or stands too near the spout.
    if (phase === "pour" && (spilled > 50 || top < NOZZLE + 10)) (phase = "hold"), (clock = 0);
    else if (phase === "hold" && ++clock > 40) phase = "open";
    else if (phase === "open") {
      slide = Math.min(OPEN, slide + 0.35);
      // Close again once the heap has run out and only the stream is left.
      if (slide === OPEN && held < 110) (phase = "close"), (spilled = 0);
    } else if (phase === "close") {
      slide = Math.max(0, slide - 0.5);
      if (!slide) phase = "pour";
    }
  };
  for (let i = 0; i < WARM; i++) tick();

  let last = 0;
  return (t) => {
    const n = Math.min(12, Math.max(0, Math.round((t - last) * meta.fps)));
    last += n / meta.fps;
    for (let i = 0; i < n * STEPS; i++) tick();
    const lines: string[] = [];
    // A grain is in the air if it moved a moment ago and has no resting sand, or shelf, under it to roll on.
    const rests = (x: number, y: number) => y < H && (solid(x, y) || (x >= 0 && x < W && grid[y * W + x] && moved[y * W + x] < step - 2));
    const air = (x: number, y: number) => grid[y * W + x] && moved[y * W + x] >= step - 2 && !rests(x, y + 1) && !rests(x - 1, y + 1) && !rests(x + 1, y + 1);
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < W; c++) {
        const a = 2 * r * W + c, b = a + W;
        if (solid(c, 2 * r)) {
          line += "▀";
          continue;
        }
        const fa = air(c, 2 * r), fb = air(c, 2 * r + 1);
        const sa = grid[a] && !fa, sb = grid[b] && !fb;
        if (c === MID && (fa || fb) && !sa && !sb) line += "┊"; // the falling stream
        else if (sa && (sb || fb)) line += grid[a] === 1 ? "█" : "▓";
        else if (sb && fa) line += "█";
        else if (sa) line += "▀";
        else if (sb) line += "▄";
        else if (fa && fb) line += ":";
        else if (fa) line += "'";
        else if (fb) line += ".";
        else line += " ";
      }
      lines.push(line);
    }
    // The spout: a hopper down from the top, sand showing inside it while it pours; and the shelf's end caps.
    const p = MID - 2, fill = "░";
    const put = (r: number, at: number, s: string) => (lines[r] = lines[r].slice(0, at) + s + lines[r].slice(at + s.length));
    put(0, p - 1, "│" + fill.repeat(5) + "│");
    put(1, p - 1, "╰╮" + fill.repeat(3) + "╭╯");
    put(2, p, " ╰" + fill + "╯ ");
    put(rows - 1, END - 1, "▐");
    put(rows - 1, W - END, "▌");
    return lines.join("\n");
  };
}
