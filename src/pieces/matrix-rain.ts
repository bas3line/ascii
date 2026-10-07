/*
 * matrix rain: streams of code falling down a screen, each column at its own
 * pace. The head of a stream is the heaviest glyph and the tail thins behind.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "matrix rain",
  category: "effects",
  note: "streams of glyphs falling, heavy at the head, thin behind",
  cols: 63,
  rows: 24,
  fps: 20,
} satisfies Meta;

// Glyph sets from heaviest to lightest. A near stream runs head, a lighter
// collar, a solid body, then thins through the rest; a far one is light all
// the way down, so the rain has some depth.
const HEAD = "@#%&$";
const COLLAR = "acdeghkmnorsuvxz";
const BODY = "0123456789ABCDEFHKMNPRSTXZ";
const THIN = ["acdeghkmnorsuvxz=+*<>", ":;!|il^~", ".,'`"];
const FAR_SETS = ["=+*<>|", ":;!|il", ":;!|il^~", ".,'`"];
// Speeds in rows a second, lengths in rows, and the gap after each pass as a
// share of the screen height: [least, spread].
const NEAR = { speed: [9, 9], len: [12, 10], gap: [0.15, 0.45] };
const FAR = { speed: [4, 2.5], len: [10, 6], gap: [1.1, 1.4] };

// A small integer hash, so a glyph is a function of where and when it is.
function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export default function matrixRain(): Frame {
  const { cols, rows } = meta;
  // Near streams run in the even columns and far ones in the odd. Each pass
  // down a column draws its own length and gap, and the columns start spread
  // evenly through their cycles so no stretch of the screen sits dark.
  const lanes = Array.from({ length: cols }, (_, c) => {
    const kind = c % 2 ? FAR : NEAR;
    const speed = kind.speed[0] + hash(c, 1, 0) * kind.speed[1];
    const cycle = rows * (1 + kind.gap[0] + kind.gap[1] / 2) + kind.len[0] + kind.len[1] / 2;
    return { kind, speed, phase: ((c * 0.618034 + hash(c, 3, 0) * 0.2) % 1) * cycle, k: 0, from: 0 };
  });
  const span = (c: number, k: number, kind: typeof NEAR) => rows + length(c, k, kind) + rows * (kind.gap[0] + hash(c, k, 2) * kind.gap[1]);
  const length = (c: number, k: number, kind: typeof NEAR) => kind.len[0] + Math.floor(hash(c, k, 4) * kind.len[1]);
  const grid: string[] = new Array(cols * rows);

  return (t) => {
    grid.fill(" ");
    const tick = Math.floor(t * 20);
    for (let c = 0; c < cols; c++) {
      const lane = lanes[c], { kind, speed, phase } = lane;
      // Step this column on to the pass its head is in now.
      const u = phase + t * speed;
      if (u < lane.from) (lane.k = 0), (lane.from = 0);
      for (let s: number; u - lane.from >= (s = span(c, lane.k, kind)); lane.k++) lane.from += s;
      const k = lane.k, head = Math.floor(u - lane.from), len = length(c, k, kind);
      for (let d = 0; d < len; d++) {
        const r = head - d;
        if (r < 0) break;
        if (r >= rows) continue;
        const f = d / len;
        let glyphs: string;
        if (kind === NEAR) {
          // The first half of a tail is solid; past it more and more drops out.
          if (f > 0.5 && hash(c, r, k * 31 + 7) < ((f - 0.5) / 0.5) ** 2 * 0.8) continue;
          glyphs = d === 0 ? HEAD : d < 3 ? COLLAR : f < 0.5 ? BODY : THIN[f < 0.7 ? 0 : f < 0.86 ? 1 : 2];
        } else {
          if (f > 0.7 && hash(c, r, k * 31 + 7) < (f - 0.7) * 2) continue;
          glyphs = FAR_SETS[d === 0 ? 0 : f < 0.45 ? 1 : f < 0.8 ? 2 : 3];
        }
        // Heads flicker every frame; tail glyphs change now and then.
        const when = d === 0 ? tick : Math.floor((t + hash(c, r, 5) * 9) * (0.4 + hash(c, r, 6) * 1.6));
        grid[c + r * cols] = glyphs[Math.floor(hash(c, r, when) * glyphs.length)];
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
