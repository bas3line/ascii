/*
 * bonsai: a tree in a shallow pot through a year. Its leaf pads are shaded
 * domes, lit from the upper left; in autumn they thin leaf by leaf and drop,
 * the branches stand bare, then the pads bud again from the middle out.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "bonsai",
  category: "nature",
  note: "a potted tree that sheds its leaves and leafs out again",
  cols: 52,
  rows: 19,
  fps: 10,
} satisfies Meta;

const LOOP = 26; // seconds: summer, autumn, bare, spring, summer
const AUTUMN = [3, 8.5], FADE = 2.5; // a leaf starts to turn in this span and is gone after FADE
const SPRING = [14, 18.5], GROW = 2.5; // a leaf buds in this span and is full after GROW
const DROP = 0.24; // seconds a falling leaf takes per row
const RAMP = " .,:;*%&@";

// Leaf pads: the middle of the widest row, half-width, the height of the dome
// in rows, and where the branch under it splits into twigs.
const PADS: { x: number; y: number; w: number; h: number; fan: [number, number] }[] = [
  { x: 27, y: 3, w: 7, h: 2.2, fan: [2, 27] },
  { x: 15, y: 5, w: 7.5, h: 1.3, fan: [6, 15] },
  { x: 39, y: 6, w: 7, h: 1.3, fan: [7, 39] },
  { x: 11, y: 9, w: 6.5, h: 1.3, fan: [10, 11] },
  { x: 40, y: 11, w: 6, h: 1.3, fan: [12, 40] },
];
// The trunk from the soil up: [row, first column, width]. It tapers 3, 2, 1
// and leans right, back left, then right again into the top pad.
const TRUNK: [number, number, number][] = [
  [15, 24, 3], [14, 24, 3], [13, 25, 3], [12, 26, 2], [11, 26, 2], [10, 25, 2], [9, 24, 2],
  [8, 24, 1], [7, 24, 1], [6, 25, 1], [5, 26, 1], [4, 26, 1], [3, 27, 1],
];
// Branches, each a run of strokes from the trunk out to a pad: [row, col, text].
const WOOD: [number, number, string][] = [
  [12, 28, "___________"], // to the lowest pad, right
  [11, 19, "\\______"], [10, 13, "______"], // left
  [8, 25, "_____/"], [7, 31, "______"], // right
  [7, 19, "\\____"], [6, 17, "__"], // left
];
const POT: [number, number, string][] = [
  [15, 6, ".________________/   \\________________."],
  [16, 7, "\\___________________________________/"],
  [17, 9, "`\"\"\"`                       `\"\"\"`"],
];
const SOIL: [number, number, number] = [14, 7, 43]; // where a leaf lands in the pot: the row and its columns

const hash = (a: number, b: number) => {
  let h = Math.imul(a * 374761393 + b * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

interface Leaf {
  r: number;
  c: number;
  h: number;
  pad: number;
  under: boolean;
  day: number;
  night: number;
  turn: number;
  bud: number;
}

interface Fall {
  t0: number;
  path: [number, number][];
  lie: number;
}

export default function bonsai(): Frame {
  const { cols, rows } = meta;
  const wood = Array.from({ length: rows }, () => Array<string>(cols).fill(" "));
  const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => ch !== " " && (wood[r][c + i] = ch));
  POT.forEach(([r, c, s]) => put(r, c, s));
  TRUNK.forEach(([r, c, w], i) => {
    const below = TRUNK[i - 1];
    const shift = below ? c + w / 2 - (below[1] + below[2] / 2) : 0;
    put(r, c, (shift > 0.2 ? "/" : shift < -0.2 ? "\\" : "|").repeat(w));
  });
  WOOD.forEach(([r, c, s]) => put(r, c, s));
  // Under each pad its branch splits into twigs, seen once the leaves are off.
  for (const { fan: [r, c] } of PADS) {
    put(r, c - 1, "\\|/");
    put(r - 1, c - 2, "\\   /");
  }

  // Every leaf: where it is, how dense it is lit and in shadow, and when it
  // turns and buds. Outer leaves turn first; inner ones bud first.
  const leaves: Leaf[] = [];
  PADS.forEach((p, n) => {
    for (let r = Math.ceil(p.y - p.h); r <= p.y + 1; r++) {
      for (let c = Math.floor(p.x - p.w); c <= Math.ceil(p.x + p.w); c++) {
        const dx = (c - p.x) / p.w, dy = (r - p.y) / p.h;
        // A dome above the widest row; one flat, tucked row below it.
        const rho = r <= p.y ? Math.hypot(dx, dy) : Math.max(Math.abs(dx) / 0.85, 0.72);
        if (rho > 1) continue;
        const h = hash(r * 97 + n, c);
        const mass = Math.min(1, (1 - (r <= p.y ? Math.hypot(dx, dy * 0.85) : rho)) * 2.6) * (0.85 + 0.3 * h);
        const lit = Math.max(0, Math.min(1, 0.5 - 0.35 * dx - 0.55 * (r <= p.y ? dy : 1.1)));
        leaves.push({
          r, c, h, pad: n, under: r > p.y,
          day: mass * (0.5 + 0.5 * lit),
          night: mass * (0.5 + 0.5 * (1 - lit)),
          turn: AUTUMN[0] + (AUTUMN[1] - AUTUMN[0]) * (0.7 * (1 - rho) + 0.3 * h),
          bud: SPRING[0] + (SPRING[1] - SPRING[0]) * Math.min(1, 0.75 * rho + 0.25 * h),
        });
      }
    }
  });

  // Falling leaves: a few strays in summer, and in autumn some of each pad's
  // underside as it goes. Each drops near where it left, and one that lands in
  // the pot lies there, a stray for a while and an autumn leaf until spring.
  const falls: Fall[] = [];
  const fall = (l: Leaf, t0: number, k: number, until?: number) => {
    const drift = (hash(k, 7) - 0.5) * 1.2, phase = hash(k, 9) * 6.3;
    const path: [number, number][] = [];
    for (let r = l.r + 1, i = 0; r < rows; r++, i++) {
      const c = Math.round(l.c + drift * i * DROP + Math.sin(i * 0.9 + phase));
      path.push([r, c]);
      if (r === SOIL[0] && c >= SOIL[1] && c <= SOIL[2]) break;
    }
    const lands = path[path.length - 1][0] === SOIL[0];
    falls.push({ t0, path, lie: lands ? ((until ?? t0 + path.length * DROP + 3) - t0 + LOOP) % LOOP : 0 });
  };
  const under = PADS.map((_, n) => leaves.filter((l) => l.pad === n && l.under && l.day > 0.15));
  [[-1.2, 0], [0.5, 0], [2.0, 1], [3.0, 0], [22.6, 1], [24.4, 3]].forEach(([t0, n], k) => {
    const from = under[n];
    fall(from[Math.floor(hash(k, 1) * from.length)], (t0 + LOOP) % LOOP, k);
  });
  under.flat().filter((l) => hash(l.r, l.c * 3) < 0.22).forEach((l, k) => fall(l, l.turn + FADE * 0.8, k + 10, SPRING[0] + 3 * hash(k, 3)));

  const grid = Array.from({ length: rows }, () => Array<string>(cols));
  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = wood[r][c];
    // A gust runs through the crown now and then, stirring the leaves.
    const gust = Math.max(0, Math.sin((u / LOOP) * Math.PI * 8)) ** 3;
    for (const l of leaves) {
      let f = 1;
      if (u >= l.turn && u < SPRING[0]) f = Math.max(0, 1 - (u - l.turn) / FADE);
      else if (u >= SPRING[0] && u < l.bud) f = 0;
      else if (u >= l.bud && u < l.bud + GROW) f = (u - l.bud) / GROW;
      if (f <= 0) continue;
      const stir = gust * 0.12 * Math.sin(u * 5 - l.c * 0.5 + l.h * 3);
      const i = Math.round(Math.max(0, Math.min(1, (paper ? l.night : l.day) * f + stir)) * (RAMP.length - 1));
      if (i > 0) grid[l.r][l.c] = RAMP[i];
    }
    for (const f of falls) {
      const age = (u - f.t0 + LOOP) % LOOP;
      const step = Math.floor(age / DROP);
      const [r, c] = f.path[Math.min(step, f.path.length - 1)];
      if (grid[r][c] !== " ") continue;
      if (step < f.path.length) grid[r][c] = step & 1 ? "'" : ",";
      else if (age < f.lie) grid[r][c] = ",";
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
