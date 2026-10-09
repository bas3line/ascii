/*
 * rain: slanting rain in three depths over open ground. Each drop ends where
 * it meets the ground at its own depth, throwing up a crown on the ground or
 * opening a ring where it falls in a puddle.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "rain",
  category: "nature",
  note: "slanting rain in three depths, crowns and puddle rings",
  cols: 64,
  rows: 20,
  fps: 30,
} satisfies Meta;

const HORIZON = 11; // the far edge of the ground
// Each depth, far to near: drops, rows a second, streak length, the rows it
// lands between, and its glyph.
const LAYERS = [
  { n: 46, v: 11, len: 1, from: 12, to: 13.9, glyph: "," },
  { n: 30, v: 19, len: 2, from: 14, to: 16.9, glyph: "/" },
  { n: 16, v: 30, len: 4, from: 17, to: 19.9, glyph: "╱" },
];
// Puddles, flat ovals in perspective: middle column and row, half width in columns, half height in rows.
const PUDDLES = [
  [45, 13.5, 6, 0.7],
  [17, 15.5, 10, 1.6],
  [44, 18.5, 14, 1.6],
];

const hash = (i: number, s: number): number => {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

export default function rain(): Frame {
  const { cols, rows } = meta;
  // The ground: a horizon, a scatter of grit that grows coarser nearer, and
  // each puddle as a sheet of still water with a ragged edge.
  const base = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const pool = Array.from({ length: rows }, () => new Array<number>(cols).fill(-1));
  base[HORIZON].fill("_");
  PUDDLES.forEach(([cx, cy, rx, ry], p) => {
    for (let r = Math.floor(cy - ry); r <= cy + ry; r++) {
      const v = (r + 0.5 - cy) / ry;
      if (Math.abs(v) >= 1) continue;
      const w = rx * Math.sqrt(1 - v * v);
      const a = Math.round(cx - w + (hash(r, p + 20) - 0.5) * 2.5), b = Math.round(cx + w + (hash(r, p + 30) - 0.5) * 2.5);
      for (let c = Math.max(0, a); c < Math.min(cols, b); c++) {
        base[r][c] = "─";
        pool[r][c] = p;
      }
    }
  });
  const wet = (r: number, c: number): boolean => [-1, 0, 1].some((d) => pool[r][c + d] >= 0 || pool[r - 1]?.[c + d] >= 0 || pool[r + 1]?.[c + d] >= 0);
  for (let r = HORIZON + 1; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const h = hash(r * cols + c, 3), near = (r - HORIZON) / (rows - HORIZON);
      if (h < 0.035 && !wet(r, c)) base[r][c] = near > 0.5 && h < 0.012 ? "`" : ".";
    }

  return (t) => {
    const g = base.map((row) => row.slice());
    const put = (c: number, r: number, ch: string) => {
      c = Math.floor(c);
      r = Math.floor(r);
      if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = ch;
    };
    // Spray lands on open ground only, never in the water or on the horizon.
    const dry = (c: number, r: number): boolean => r > HORIZON && r < rows && c >= 0 && c < cols && pool[r][c] < 0;
    const spray = (c: number, r: number, ch: string) => {
      c = Math.floor(c);
      r = Math.floor(r);
      if (dry(c, r)) g[r][c] = ch;
    };
    const splashes: [x: number, y: number, age: number, li: number, id: number][] = [];
    LAYERS.forEach((L, li) => {
      const cycle = (L.to + L.len) / L.v + 0.6;
      for (let i = 0; i < L.n; i++) {
        const tt = t + hash(i, li * 3) * cycle;
        const k = Math.floor(tt / cycle), u = tt - k * cycle;
        const id = i * 977 + k * 13 + li;
        // Where this drop lands: its depth sets the row.
        const land = Math.floor(L.from + (L.to - L.from) * hash(id, 1));
        const lx = Math.floor(hash(id, 2) * (cols + 2)) - 1;
        const head = -L.len + L.v * u;
        if (head < land) {
          // The streak runs up and to the right of its head, a column a row,
          // and passes behind the horizon and the water's edge.
          for (let j = 0; j < L.len; j++) {
            const r = Math.floor(head) - j, c = lx + (land - r);
            if (r >= 0 && r < land && c >= 0 && c < cols && r !== HORIZON && pool[r][c] < 0) g[r][c] = L.glyph;
          }
        } else splashes.push([lx, land, (head - land) / L.v, li, id]);
      }
    });

    for (const [x, y, age, li] of splashes) {
      if (x < 0 || x >= cols) continue;
      const p = pool[y][x];
      if (p >= 0) {
        // A ring on the water: a bead, then two marks walking apart and fading.
        const life = [0.35, 0.6, 0.85][li];
        if (age > life) continue;
        const d = Math.floor((age / life) * (2 + 3 * li));
        const mark = age > life * 0.7 ? "·" : null;
        if (!d) put(x, y, "o");
        else if (pool[y][x - d] === p && pool[y][x + d] === p) {
          put(x - d, y, mark || "(");
          put(x + d, y, mark || ")");
        }
        continue;
      }
      // On the ground: far drops just bead; nearer ones throw up a crown that
      // breaks into drops falling back either side.
      if (li === 0) {
        if (age < 0.1) spray(x, y, ".");
      } else if (li === 1) {
        if (age < 0.08) spray(x, y, "v");
        else if (age < 0.22) spray(x - 1, y, "."), spray(x + 1, y, ".");
      } else if (age < 0.09) {
        spray(x - 1, y - 1, "\\"), spray(x, y - 1, "|"), spray(x + 1, y - 1, "/"), spray(x, y, ".");
      } else if (age < 0.2) {
        spray(x - 2, y - 1, "'"), spray(x + 2, y - 1, "'");
      } else if (age < 0.32) {
        spray(x - 2, y, "."), spray(x + 2, y, ".");
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
