/*
 * fox: a fox asleep, curled up with its chin on its tail. Its flank rises and
 * falls; now and then it opens one eye and looks about, or flicks an ear.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "fox",
  category: "creatures",
  note: "a fox asleep on its tail, breathing, peeking now and then",
  cols: 47,
  rows: 16,
  fps: 10,
} satisfies Meta;

const FOX = [
  "           /\\          /\\",
  "          /  \\        /  \\",
  "         /    `.____.'    \\",
  "        /                  \\",
  "       ;    `-'      `-'    ;",
  "        `.     \\    /     .'`-.._",
  "     _.-' `-.   \\../   .-'       ``-._",
  "  .-'        `-. \\/ .-'               `.",
  " /   _..--''``-.`--'.-''``--..__        \\",
  "|  .'   ,                       ``-.     |",
  "| (    (                            `.   |",
  "|  `.   `.                            \\  |",
  " \\   `-..__                            \\ |",
  "  `-..__   ``---...______________...----'",
];
const OX = 2, OY = 1; // where the drawing sits in the frame

const LOOP = 12; // seconds
const BREATH = 4; // seconds a breath; the flank is out for the middle of it
// Breathing in, the flank swells out a column: [row, col, glyphs] over the art.
const SWELL: [number, number, string][] = [[7, 38, "`-."], [8, 40, " \\"], [9, 41, " |"], [10, 41, " |"], [11, 41, " |"], [12, 41, " |"], [13, 40, "-'"]];
const EYE: [number, number] = [4, 21];
// One eye opens, looks one way and the other, and shuts: [from, to, glyphs, shift].
const PEEK: [number, number, string, number][] = [
  [2.2, 2.5, "`o'", 0], [2.5, 3.0, "(o)", 0], [3.0, 3.5, "(o)", -1],
  [3.5, 4.0, "(o)", 1], [4.0, 4.3, "(o)", 0], [4.3, 4.6, "`o'", 0],
];
const EAR: [number, number][] = [[7.0, 7.2], [7.45, 7.65]]; // the right ear's tip folds over
// Each z drifts up and away from the head a cell at a time, growing as it goes.
const Z_EVERY = 2, Z_LIFE = 4;
const Z_PATH: [number, number][] = [[4, 31], [3, 32], [3, 33], [3, 34], [2, 35], [2, 36], [2, 37], [1, 38], [1, 39], [1, 40]];

export default function fox(): Frame {
  const { cols, rows } = meta;
  const awake = (u: number) => u >= PEEK[0][0] - 0.3 && u < PEEK[PEEK.length - 1][1] + 0.6;

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(" "));
    const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => (grid[OY + r][OX + c + i] = ch));
    FOX.forEach((line, r) => put(r, 0, line));

    const b = u % BREATH;
    if (b >= 0.6 && b < 2.4) for (const [r, c, s] of SWELL) put(r, c, s);

    const peek = PEEK.find(([a, z]) => u >= a && u < z);
    if (peek) put(EYE[0], EYE[1] - 1, " ".repeat(5)), put(EYE[0], EYE[1] + peek[3], peek[2]);
    if (EAR.some(([a, z]) => u >= a && u < z)) put(0, 23, "/-");

    // A z is only let out while both eyes are shut.
    for (let k = -2; k <= Math.ceil(LOOP / Z_EVERY); k++) {
      const born = k * Z_EVERY, age = u - born;
      if (age < 0 || age >= Z_LIFE || awake(((born % LOOP) + LOOP) % LOOP)) continue;
      const i = Math.floor((age / Z_LIFE) * Z_PATH.length);
      const [r, c] = Z_PATH[i];
      grid[r][c] = i < 6 ? "z" : "Z";
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
