/*
 * aquarium: a fish tank. Fish of a few kinds swim its length, drift between
 * depths and turn about, bubbles stream up from a stone, and weed sways.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "aquarium",
  category: "creatures",
  note: "fish swimming and turning in a tank, bubbles and weed",
  cols: 60,
  rows: 20,
  fps: 15,
} satisfies Meta;

const LOOP = 48; // seconds; every period below divides it
const FLIP: Record<string, string> = { "<": ">", ">": "<", "(": ")", ")": "(", "/": "\\", "\\": "/", "`": "'", "'": "`", "{": "}", "}": "{" };
// Fish, facing right, with the face-on view shown while they turn, farthest
// first: [art, face-on art, row, from column, to column, seconds there and
// back, phase, rows it drifts up and down over the loop, drift phase].
const FISH: [art: string[], turn: string[], row: number, from: number, to: number, period: number, phase: number, drift: number, dp: number][] = [
  [["><>"], ["<o>"], 5.2, 6, 54, 12, 0.8, 1.5, 1],
  [["><>"], ["<o>"], 6.6, 3, 51, 12, 0.775, 1.5, 1.1],
  [["><>"], ["<o>"], 8, 8, 56, 12, 0.79, 1.5, 0.9],
  [["><(((°>"], ["<(°o°)>"], 3.3, 3, 50, 24, 0.1, 1.2, 1],
  [["><(°>"], ["(°o°)"], 15.6, 4, 40, 48, 0.55, 0.4, 3],
  [["    /\\", " ><(  °>", "    \\/"], ["/^\\", "(°o°)", "\\v/"], 9.8, 10, 51, 24, 0.35, 0.9, 4],
  [["   _.-._", "><(     °)", "   `-.-'"], [".-^-.", "(°o°)", "`-v-'"], 12.8, 2, 46, 16, 0.6, 0.9, 4],
];
// Clumps of weed, [root column, [height, lean] for each blade, phase].
const WEEDS: [root: number, blades: [height: number, lean: number][], phase: number][] = [
  [6, [[11, 0.6], [8, -1.6], [6, 2]], 0],
  [13, [[6, 1.2], [4, -1.2]], 1.7],
  [25, [[4, -1], [3, 1]], 0.9],
  [37, [[9, 1.2], [6, -1.4], [4, 2.2]], 2.4],
  [55, [[7, -1.2], [5, 0.8]], 0.4],
];
const STONE: [row: number, col: number, art: string][] = [[15, 43, " .--._"], [16, 42, "(  .  `)"]];
const NOZZLE = 46; // where the bubbles leave the stone

const hash = (a: number, b: number): number => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const mirror = (art: string[]): string[] => {
  const w = Math.max(...art.map((l) => l.length));
  return art.map((l) => [...l.padEnd(w)].reverse().map((c) => FLIP[c] || c).join(""));
};

export default function aquarium(): Frame {
  const { cols, rows } = meta;
  const TAU = Math.PI * 2;
  const SURFACE = 1, FLOOR = 17;
  const fish = FISH.map(([art, turn, row, from, to, period, phase, drift, dp]) => ({ art, back: mirror(art), turn, row, from, to, period, phase, drift, dp }));
  // Gravel: a fine bed with coarser stones lying in it here and there.
  const gravel = [0, 1].map((k) => Array.from({ length: cols - 2 }, (_, c) => {
    const n = hash(c, k + 3);
    return k ? (n < 0.14 ? "o" : n < 0.2 ? "O" : n < 0.27 ? "°" : n < 0.4 ? "." : " ") : n < 0.55 ? "." : n < 0.75 ? "," : "·";
  }));

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    // Art is opaque from its first mark to its last on each line.
    const put = (r: number, c: number, s: string) => {
      if (r <= SURFACE || r >= rows - 1) return;
      for (let i = Math.max(0, s.search(/\S/)); i < s.trimEnd().length; i++) if (c + i > 0 && c + i < cols - 1) g[r][c + i] = s[i];
    };
    // The tank: glass, rim, and the water's surface rippling under it.
    g[0] = ["┌", ..."─".repeat(cols - 2), "┐"];
    g[rows - 1] = ["└", ..."─".repeat(cols - 2), "┘"];
    for (let r = 1; r < rows - 1; r++) g[r][0] = g[r][cols - 1] = "│";
    for (let c = 1; c < cols - 1; c++) g[SURFACE][c] = Math.sin(c * 0.55 - (u * TAU) / 4) + 0.5 * Math.sin(c * 0.23 + (u * TAU) / 6) > 0.3 ? "~" : "-";
    for (let k = 0; k < 2; k++) for (let c = 1; c < cols - 1; c++) g[FLOOR + k][c] = gravel[k][c - 1];

    // Weed: blades that rise straight from the root and bend further toward
    // the tip, the tip swinging two or three columns as the water moves.
    const weed = ([c0, blades, ph]: (typeof WEEDS)[number]) => {
      for (const [h, lean] of blades) {
        let px = c0 + 0.5;
        for (let k = 1; k <= h; k++) {
          const f = k / h, sway = 1.4 * Math.sin((u * TAU) / 6 + ph - f * 0.7 + lean * 0.2);
          const x = c0 + 0.5 + lean * f ** 1.5 + sway * f * f, d = x - px;
          put(FLOOR - k, Math.floor(x), d > 0.5 ? "/" : d > 0.17 ? "(" : d < -0.5 ? "\\" : d < -0.17 ? ")" : "|");
          px = x;
        }
      }
    };
    WEEDS.slice(0, -1).forEach(weed);
    STONE.forEach(([r, c, s]) => put(r, c, s));

    // Each fish swims there and back, easing into each turn, and drifts up
    // and down over the loop; for a moment mid-turn it faces out of the glass.
    for (const f of fish) {
      const th = TAU * (u / f.period + f.phase);
      const p = Math.asin(0.995 * Math.sin(th)) / (Math.PI / 2);
      const x = Math.round(f.from + ((p + 1) / 2) * (f.to - f.from));
      const y = Math.round(f.row + f.drift * Math.sin((TAU * u) / LOOP + f.dp) + 0.35 * Math.sin((TAU * u) / 6 + f.dp * 3));
      const art = Math.abs(Math.cos(th)) < 0.09 ? f.turn : Math.cos(th) > 0 ? f.art : f.back;
      const w = Math.max(...f.art.map((l) => l.length)), tw = Math.max(...art.map((l) => l.length));
      art.forEach((line, i) => put(y + i - (art.length >> 1), x + ((w - tw) >> 1), line));
    }

    // Bubbles leave the stone in a stream, wobbling and swelling as they rise,
    // and break at the surface.
    for (let k = 0; k < 80; k++) {
      const age = (u - k * (LOOP / 80) + LOOP) % LOOP;
      const y = 14.6 - age * (2.6 + hash(k, 1));
      if (y < SURFACE + 1) continue;
      const x = NOZZLE + Math.round(0.7 * Math.sin(age * 3.5 + k) + (hash(k, 2) - 0.5));
      const r = Math.floor(y);
      if (g[r][x] === " ") g[r][x] = y > 11 ? "." : y > 6 ? "o" : "O";
    }
    weed(WEEDS[WEEDS.length - 1]); // one in front of the fish
    return g.map((row) => row.join("")).join("\n");
  };
}
