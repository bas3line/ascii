/*
 * hawa mahal: the palace of winds in Jaipur at night. Five storeys of narrow
 * and wide bays step up to a domed crown, with kiosks on every terrace. The
 * windows are jali screens, and lamps behind them come and go.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "hawa mahal",
  category: "objects",
  note: "jaipur's palace of winds at night, lamps behind the jali",
  cols: 61,
  rows: 24,
  fps: 10,
} satisfies Meta;

// Every "+" is a lattice cell. The top three storeys wear pointed hoods, the
// fourth sits under a balcony with rounded ones, and the first has tall
// arched windows on a plinth.
const FACADE = String.raw`
                        '
                       .^.
                 '   .-' '-.   '
                .^.  (+++++)  .^.
              __|_|__|+++++|__|_|__
              .-^-..^..-^-..^..-^-.
          '   (+++)(+)(+++)(+)(+++)   '
         .^.  |+++||+||+++||+||+++|  .^.
        _|_|__|___________________|__|_|_
        .^..^..-^-..^..-^-..^..-^-..^..^.
   '    (+)(+)(+++)(+)(+++)(+)(+++)(+)(+)    '
  .^.   |+||+||+++||+||+++||+||+++||+||+|   .^.
__|_|___|_______________________________|___|_|__
.^..-^-..^..^..-^-..^..-^-..^..-^-..^..^..-^-..^.
(+)(+++)(+)(+)(+++)(+)(+++)(+)(+++)(+)(+)(+++)(+)
|+||+++||+||+||+++||+||+++||+||+++||+||+||+++||+|
=================================================
.-..---..-..-..---..-..---..-..---..-..-..---..-.
(+)(+++)(+)(+)(+++)(+)(+++)(+)(+++)(+)(+)(+++)(+)
|+||+++||+||+||+++||+||+++||+||+++||+||+||+++||+|
/^\/'^'\/^\/^\/'^'\/^\/'^'\/^\/'^'\/^\/^\/'^'\/^\
|+||+++||+||+||+++||+||+++||+||+++||+||+||+++||+|
|+||+++||+||+||+++||+||+++||+||+++||+||+||+++||+|
|_||___||_||_||___||_||___||_||___||_||_||___||_|`.slice(1).split("\n");

// Stars in the open sky either side of the steps: row, col, twinkle rate, phase.
const STARS = [
  [0, 4, 0.9, 0],
  [1, 15, 1.3, 2],
  [3, 8, 0.7, 4],
  [6, 2, 1.1, 1],
  [0, 53, 1.2, 3],
  [2, 45, 0.8, 5],
  [4, 57, 1.0, 0.5],
  [7, 52, 1.4, 2.5],
];
const SHARE = 0.3; // the share of lamps lit, which the night drifts back toward
const RISE = 0.3; // seconds for a lamp to come up
const FADE = 1.8; // seconds for one to go out
// A screen by brightness, dark to lit, as a checker of two glyphs.
const JALI = [["·", ":"], [":", "+"], ["+", "#"]];

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (x: number, y: number) => {
  let h = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export default function hawaMahal(): Frame {
  const { cols, rows } = meta;
  const left = Math.floor((cols - 49) / 2);
  const rand = mulberry32(8);

  // The still picture: the facade on a ground line, the balcony running a
  // column past each side.
  const base = Array.from({ length: rows }, (_, r) => {
    const line = [...(" ".repeat(left) + (FACADE[r] ?? "")).padEnd(cols)];
    if (r === rows - 1) for (let c = 0; c < cols; c++) if (line[c] === " ") line[c] = "_";
    return line;
  });
  const band = FACADE.findIndex((l) => l.startsWith("="));
  base[band][left - 1] = base[band][left + 49] = "=";

  // A jharokha is a run of "+" and the run straight below it.
  const cells: [number, number, number, number][] = []; // [row, col, jharokha, checker]
  const at = new Map<string, number>();
  let count = 0;
  FACADE.forEach((line, y) => {
    for (const m of line.matchAll(/\++/g)) {
      const w = at.get(`${y - 1},${m.index}`) ?? count++;
      at.set(`${y},${m.index}`, w);
      for (let i = 0; i < m[0].length; i++) cells.push([y, left + m.index + i, w, (m.index + i + y) & 1]);
    }
  });

  // Each lamp keeps whether it is lit and when that last changed. The night
  // opens with the share lit and a few lamps still going out.
  const lit = new Array<boolean>(count).fill(false);
  for (let n = Math.round(SHARE * count); n > 0; ) {
    const w = (rand() * count) | 0;
    if (!lit[w]) (lit[w] = true), n--;
  }
  const since = new Float64Array(count).fill(-99);
  for (let n = 3; n > 0; ) {
    const w = (rand() * count) | 0;
    if (!lit[w] && since[w] < -9) (since[w] = -FADE * (0.3 + 0.5 * rand())), n--;
  }
  let next = 0.2;
  let clock = 0;

  // One lamp changes at a time, a fraction of a second apart. Below the
  // share, lighting one is likelier than putting one out.
  const advance = (t: number) => {
    while (next <= t) {
      const share = lit.filter(Boolean).length / count;
      const light = rand() < 0.5 + (SHARE - share) * 3;
      const pool: number[] = [];
      for (let w = 0; w < count; w++) if (lit[w] !== light) pool.push(w);
      const w = pool[(rand() * pool.length) | 0];
      if (w !== undefined) {
        lit[w] = light;
        since[w] = next;
      }
      next += 0.3 + rand() * 0.5;
    }
  };

  // A lamp comes up through a glow and goes out through one, and a lit lamp
  // now and then gutters for a moment.
  const level = (w: number) => {
    const age = clock - since[w];
    if (!lit[w]) return age < 0.2 ? 2 : age < FADE ? 1 : 0;
    if (age < RISE) return 1;
    return hash(w, Math.floor(clock * 10 + 1e-6)) < 0.03 ? 1 : 2;
  };

  return (t) => {
    clock += Math.min(Math.max(t - clock, 0), 1);
    advance(clock);
    const grid = base.map((line) => line.slice());
    for (const [y, x, w, k] of cells) grid[y][x] = JALI[level(w)][k];
    for (const [r, c, f, p] of STARS) {
      const b = Math.sin(f * clock + p);
      grid[r][c] = b > 0.85 ? "*" : b > -0.3 ? "·" : ".";
    }
    return grid.map((l) => l.join("")).join("\n");
  };
}
