/*
 * cat: a tabby asleep on its side, head down on its front paws. Its back
 * rises and falls with each breath, the tail tip lifts now and then, an ear
 * twitches, and a z drifts up.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cat",
  category: "creatures",
  note: "a tabby asleep on its paws, breathing slowly",
  cols: 56,
  rows: 15,
  fps: 15,
} satisfies Meta;

// Everything that keeps still: the head on its paws, the haunch, the belly
// and hind foot, and the root of the tail. The back and the tail tip are
// drawn over it.
const CAT = [
  "",
  "",
  "",
  "                                    /\\      /\\",
  "                                   /  `----'  \\",
  "                                  /            \\",
  "                                 |  `-'    `-'  |",
  "                                 |       v      |",
  "                                  \\    `-'-'   /",
  "       |          _.--._           `-._____.-'",
  "        \\       .'      `.         _(__)  (__)_",
  "         `.   /          \\_______.'            `.",
  "      `-._ `-(______.---.___________________________)",
  "          `---'",
];
// The back and its stripes from row 3, breathed out, half in and all the way
// in: the top lifts half a row, then the whole back a row, stripes and all.
const BACK = [
  [
    "",
    "               _..-------.._",
    "           _.-'   )   )   ) `-.",
    "         .'     )   )   )   )  `-",
    "        /      )   )   )   )",
    "       |",
  ],
  [
    "               ____________",
    "            _.-'            `-._",
    "          .'      )   )   )     `-",
    "         /      )   )   )   )",
    "        |      )   )   )   )",
    "       |",
  ],
  [
    "              _..--------.._",
    "          _.-'    )   )   ) `-._",
    "        .'      )   )   )   )   `-",
    "       /       )   )   )   )",
    "       |",
    "       |",
  ],
];
// The tail tip resting, half raised and raised, as [row, column, text].
const TIP: [number, number, string][][] = [
  [[10, 3, "_"], [11, 2, "( `."], [12, 3, "`."], [13, 5, "`-.__"]],
  [[9, 2, ".-."], [10, 1, "( ,'"], [11, 2, "\\ `."], [12, 3, "`."], [13, 5, "`-.__"]],
  [[7, 2, ".-."], [8, 1, "/ ,'"], [9, 1, "| |"], [10, 1, "\\ \\"], [11, 2, "\\ `."], [12, 3, "`."], [13, 5, "`-.__"]],
];
const EAR_BACK: [number, number, string][] = [[3, 44, "  _"], [4, 43, ".-' \\"]]; // the right ear laid flat
const LOOP = 16; // seconds
const BREATH = 4; // seconds a breath, four to a loop
const FLICK: [number, number][] = [[1.9, 3.4], [10.4, 11.6]];
const TWITCH: [number, number][] = [[4.5, 4.8], [4.95, 5.3], [12.8, 13.1]];
const Z_EVERY = 1.6, Z_LIFE = 3.2;

export default function cat(): Frame {
  const { cols, rows } = meta;
  const art = Array.from({ length: rows }, (_, r) => (CAT[r] || "").padEnd(cols).split(""));
  const within = (u: number, spans: [number, number][]) => spans.some(([a, b]) => u >= a && u < b);

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const g = art.map((row) => row.slice());
    const put = (r: number, c: number, s: string) => [...s].forEach((ch, i) => ch !== " " && c + i < cols && (g[r][c + i] = ch));

    // A breath: in, out a little slower, then a pause before the next.
    const p = ((u + 0.4) % BREATH) / BREATH;
    const rise = p < 0.35 ? Math.sin((Math.PI / 2) * (p / 0.35)) ** 2 : p < 0.8 ? Math.cos((Math.PI / 2) * ((p - 0.35) / 0.45)) ** 2 : 0;
    BACK[rise < 0.3 ? 0 : rise < 0.75 ? 1 : 2].forEach((line, i) => put(3 + i, 0, line));

    // The tail tip lifts and settles; now and then an ear lies back.
    const fl = FLICK.find(([a, b]) => u >= a && u < b);
    const up = fl ? Math.sin((Math.PI * (u - fl[0])) / (fl[1] - fl[0])) : 0;
    TIP[up > 0.7 ? 2 : up > 0.25 ? 1 : 0].forEach(([r, c, s]) => put(r, c, s));
    if (within(u, TWITCH)) EAR_BACK.forEach(([r, c, s]) => [...s].forEach((ch, i) => (g[r][c + i] = ch)));

    // Zs drift up from over the head, swaying and growing as they go.
    for (let k = -2; k <= LOOP / Z_EVERY; k++) {
      const age = u - k * Z_EVERY;
      if (age < 0 || age >= Z_LIFE || within((((k * Z_EVERY) % LOOP) + LOOP) % LOOP, TWITCH)) continue;
      const f = age / Z_LIFE;
      const c = Math.floor(48.5 + f * 4 + Math.sin(age * 2.6 + k) * 0.7), r = Math.floor(3.7 - f * 3.7);
      if (r >= 0 && c < cols && g[r][c] === " ") g[r][c] = f < 0.5 ? "z" : "Z";
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
