/*
 * cherry-blossom: a flowering cherry branch reaching in from the left. Each
 * gust shakes the blossoms on their twigs, and petals come loose and tumble
 * away on the wind.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cherry blossom",
  category: "nature",
  note: "a flowering cherry branch shedding petals on the wind",
  cols: 64,
  rows: 20,
  fps: 15,
} satisfies Meta;

const LOOP = 24; // seconds; two gusts
const GUST = 12, BLOW = 4.5; // seconds between gusts, and how long one lasts
const PETALS = 14; // let go each loop

// The wood: a limb tapering in from the left, a thin limb hanging from it,
// and the twigs the blossoms sit on.
const WOOD = [
  "",
  "",
  "______",
  "      `----.___",
  "______         `---.__  |             /",
  "      `----.___       `-|.__      \\  /",
  "             | `---.___     `-.__  \\/",
  "             |         `--.__    `-.__                 /",
  "                             `-._     `--.___         /",
  "                                 \\           `---.___/",
  "                                  \\ \\                \\",
  "                                   ) )                \\",
  "                                  / /                  \\",
  "                                 / /",
  "                                ( (",
  "                                 \\ \\",
  "                                    \\_",
];
// Blossoms open, side on, small, cupped and partly shed, and buds:
// [art, row, column, how far a gust shakes it, the petal it lets go as
// [line, column, length]].
type Flower = [art: string[], row: number, col: number, flex: number, slot: [number, number, number] | null];
const OPEN = [" _(_)_", "(_)@(_)", " (_)(_)"];
const FLOWERS: Flower[] = [
  [OPEN, 1, 21, 1, [2, 4, 3]],
  [["    _", " _(_)", "(_)@", " (_)"], 1, 31, 1, [3, 1, 3]],
  [[" _ _", "(_@_)"], 2, 37, 2, [0, 3, 1]],
  [[" .-.", "(_@_)", " '|'"], 4, 54, 1, [0, 1, 3]],
  [[" _(_)", "(_)@(_)", "    (_)"], 12, 56, 2, [0, 1, 4]],
  [OPEN, 16, 30, 0, [2, 1, 3]],
  [[" _ _", "(_@_)", " (_)"], 15, 38, 0, [2, 1, 3]],
  [["(_)(_)", " (@)"], 8, 11, 1, [0, 3, 3]],
  [["o"], 19, 34, 1, null],
];
const TUMBLE = ["o", "°", "-", "~", "-", "°"]; // a petal turning over

const hash = (a: number, b: number) => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// How hard a gust is blowing, 0 to 1, and how far gusts have carried the air
// since time 0, in gust-seconds.
const gust = (t: number) => {
  const x = (((t - 1) % GUST) + GUST) % GUST;
  return x < BLOW ? Math.sin((Math.PI * x) / BLOW) ** 2 : 0;
};
const blown = (t: number) => {
  const n = Math.floor((t - 1) / GUST), x = t - 1 - n * GUST;
  return n * BLOW * 0.5 + (x < BLOW ? x / 2 - (BLOW / (2 * Math.PI)) * Math.sin((2 * Math.PI * x) / BLOW) : BLOW / 2);
};

export default function cherryBlossom(): Frame {
  const { cols, rows } = meta;
  const wood = Array.from({ length: rows }, (_, r) => (WOOD[r] || "").padEnd(cols).split(""));
  const inside = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
  // How far a blossom is shaken at time t: it trembles while a gust blows.
  const shake = (k: number, t: number) => {
    const flex = FLOWERS[k][3];
    return Math.round(Math.min(flex, flex * gust(t) * (0.8 + 0.35 * Math.sin(t * 8.5 + k * 2.3))));
  };

  // Petals leave blossoms at their own moments, more of them in the gusts,
  // and ride the wind down and away, turning over as they go.
  const from = [0, 1, 3, 2, 7, 0, 4, 1, 3, 7, 2, 0, 5, 6]; // the high blossoms shed most
  const petals = Array.from({ length: PETALS }, (_, i) => ({
    t0: i % 2 ? (Math.floor(i / 2) % 2) * GUST + 1.2 + hash(i, 2) * 2.2 : hash(i, 1) * LOOP,
    flower: from[i % from.length],
    fall: 0.42 + hash(i, 5) * 0.22, drag: 0.8 + hash(i, 6) * 0.5,
    spin: 1.2 + hash(i, 8) * 0.8, ph: hash(i, 9) * 6.3,
  }));

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const g = wood.map((row) => row.slice());

    // Blossoms sit over the wood; one that has just let a petal go shows
    // the gap for a few seconds.
    const loose = new Set<number>();
    for (const p of petals) if ((u - p.t0 + LOOP) % LOOP < 3) loose.add(p.flower);
    FLOWERS.forEach(([art, r0, c0, , slot], k) => {
      const dc = shake(k, t);
      art.forEach((line, i) => {
        for (let j = line.search(/\S/); j < line.length; j++) {
          const gap = loose.has(k) && slot && i === slot[0] && j >= slot[1] && j < slot[1] + slot[2];
          if (inside(r0 + i, c0 + j + dc) && line[j] !== " ") g[r0 + i][c0 + j + dc] = gap ? " " : line[j];
        }
      });
    });

    for (const p of petals) {
      const [art, r0, c0, , slot] = FLOWERS[p.flower];
      for (let k = 0; k < 2; k++) {
        const age = ((u - p.t0 + LOOP) % LOOP) + k * LOOP;
        const x = c0 + slot![1] + 1 + shake(p.flower, t - age) + p.drag * (0.16 * age + 2.2 * (blown(t) - blown(t - age))) + 1.1 * Math.sin(age * 0.9 + p.ph);
        const y = r0 + slot![0] + 0.5 + p.fall * age + 0.3 * Math.sin(age * 1.9 + p.ph);
        const c = Math.floor(x), r = Math.floor(y);
        if (r >= rows || c >= cols) continue;
        if (!inside(r, c) || g[r][c] !== " ") continue;
        g[r][c] = TUMBLE[Math.floor(age * p.spin + p.ph) % TUMBLE.length];
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
