/*
 * landscape: a range over a still lake, under the sky as it is right now for
 * whoever is looking: the sun climbing or sinking by the local hour, or the
 * moon in its real phase among the stars, with the range mirrored in the water.
 */
import type { Frame, Meta } from "../types.ts";

export interface LandscapeOptions {
  [key: string]: unknown;
  /** The hour of the day, 0 to 24; null for the local time. */
  hour: number | null;
  /** The moon's age in lunations, 0 to 1; null for its real phase now. */
  phase: number | null;
}

export const meta = {
  name: "landscape",
  category: "nature",
  note: "a range and a lake under the sun or moon of the local hour",
  cols: 64,
  rows: 18,
  fps: 8,
  options: { hour: null, phase: null },
  clock: true,
} satisfies Meta<LandscapeOptions>;

const SHORE = 11; // the bottom edge of this row is the waterline
// The sun with its rays, centred on row 2, column 5; rows 1 to 3 are its disc.
const SUN = ["  \\  |  /  ", "   .---.   ", "--(     )--", "   '---'   ", "  /  |  \\  "];
// The moon's rim, drawn where it is lit, round a face (#) that takes the light.
const MOON = ["  .-''-.  ", " /######\\ ", "|########|", " \\######/ ", "  '-..-'  "];
const MARIA = ["1,4", "2,6", "2,7", "3,3"]; // face cells in its darker seas
// Clouds with flat bases: # is a cloud's body, which hides what is behind it.
const CLOUD = ["        .-~~-.          ", "   .-~~'######'-.  .-.  ", " .'##############'~###'.", "(______________________)"];
const PUFF = ["   .-~~-.   ", " .'######'. ", "(__________)"];
// Each cloud: [shape, row, columns behind the first]. They keep their spacing
// as they drift, clear of each other and of the highest peak.
const CLOUDS: [string[], number, number][] = [[CLOUD, 0, 0], [PUFF, 2, 32]];
const DRIFT = 0.4; // columns a second
const FLIP: Record<string, string> = { "/": "\\", "\\": "/" };

const hash = (a: number, b: number) => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// The moon's age in lunations from a known new moon (6 Jan 2000, 18:14 UTC).
const lunation = (d: Date) => ((((d.getTime() / 864e5 - 10962.76) / 29.530588853) % 1) + 1) % 1;

export default function landscape({ hour = null, phase = null }: Partial<LandscapeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const maria = new Set(MARIA);

  // A ridge from [x, height, west, east] peaks, steep at the summit and easing
  // out, as one stroke per column (up, down or along) with the row it sits in.
  const peaks: [number, number, number, number][] = [[13, 5, 10, 5], [33, 4, 5, 6], [43, 6, 6, 11], [56, 3, 4, 5]];
  const e: number[] = [];
  for (let x = 0; x <= cols; x++) {
    const f = Math.max(0, ...peaks.map(([px, h, w, o]) => h * Math.max(0, 1 - Math.abs(x - px) / (x < px ? w : o)) ** 1.3));
    e.push(x ? Math.max(e[x - 1] - 1, Math.min(e[x - 1] + 1, Math.round(f))) : Math.round(f));
  }
  const range = Array.from({ length: cols }, (_, c): [number, string] =>
    e[c + 1] > e[c] ? [SHORE - e[c], "/"] : e[c + 1] < e[c] ? [SHORE - e[c + 1], "\\"] : [SHORE - e[c], "_"],
  );
  const top = range.map(([r]) => r); // first row of land in each column
  // The land: the ridge stroke, stippled below so it sits back.
  const land = Array.from({ length: SHORE + 1 }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (range[c][0] === r ? range[c][1] : r > range[c][0] && (c + r) % 2 ? "." : " ")),
  );
  // Its outline upside down in the water: the slopes only, the flats along the shore left out.
  const mirror: [number, number, string][] = [];
  for (let c = 0; c < cols; c++) {
    const [r, ch] = range[c];
    if (FLIP[ch]) mirror.push([2 * SHORE + 1 - r, c, FLIP[ch]]);
    else if (r < SHORE) mirror.push([2 * SHORE + 1 - r, c, "-"]);
  }

  // Stars as [row, col, glyph, how dark it must be]: the Plough first, its
  // brightest out first after sunset, then fainter ones.
  const stars: [number, number, string, number][] = [
    [0, 45, "*", 0], [2, 45, ".", 0.15], [3, 50, ".", 0.15], [2, 52, ".", 0.3], [2, 56, "*", 0], [3, 59, ".", 0.1], [4, 61, "*", 0],
    [0, 7, ".", 0.5], [1, 24, "'", 0.7], [0, 34, ".", 0.4], [2, 3, ".", 0.8], [3, 13, "'", 0.6], [2, 30, ".", 0.9],
    [4, 37, ".", 0.75], [1, 39, "'", 0.55], [3, 21, ".", 0.85], [5, 4, ".", 0.65], [0, 17, ".", 0.45],
  ];
  // Ripples: [row, start column, length, columns a second], one short one a
  // row below the first, a little longer toward the near shore.
  const ripples: [number, number, number, number][] = [];
  for (let k = 2; SHORE + k < rows; k++) ripples.push([SHORE + k, Math.floor(hash(k, 7) * cols), 2 + +(k > 4), k % 2 ? 0.3 : -0.25]);

  // Where a body stands for its hour on a 12 hour arc that starts at 0, as
  // the column and row of its middle.
  const place = (u: number): [number, number] => {
    const alt = Math.sin(Math.PI * u);
    return [Math.round(5 + (cols - 11) * u), Math.round(SHORE + 2 - SHORE * Math.max(0, alt) ** 0.45)];
  };

  return (t) => {
    const now = new Date();
    const h = hour ?? now.getHours() + now.getMinutes() / 60;
    const age = phase ?? lunation(now);
    const g = Array.from({ length: rows }, (_, r) => (r <= SHORE ? [...land[r]] : new Array<string>(cols).fill(" ")));
    const sky = (r: number, c: number) => r >= 0 && c >= 0 && c < cols && r < top[c];
    const ground = (r: number, c: number) => c >= 0 && c < cols && r >= top[c] && r <= SHORE;

    const sunU = (((h - 6) % 24) + 24) % 24 / 12; // 0 at six in the morning, 1 at six in the evening
    const day = sunU < 1;
    const dark = day ? 0 : Math.min(1, Math.sin(Math.PI * (sunU - 1)) * 5);
    const step = Math.floor(t * 2); // the water's glints change twice a second
    // The moon keeps the sun's hours, late by its age: full moons rise at dusk.
    const moonU = (((sunU - age * 2) % 2) + 2) % 2;
    const [cx, cy] = day ? place(sunU) : place(Math.min(moonU, 1.5));
    const up = day || moonU < 1;

    // Clouds drift across in front of it all, and come round again. They set
    // out from across the sky, so the first frame shows the sun or moon clear.
    const cloud = Array.from({ length: rows }, () => new Array<string>(cols).fill(""));
    const W = CLOUD[0].length, span = cols + W;
    for (const [shape, r0, d] of CLOUDS) {
      const w = shape[0].length;
      const x = Math.floor(((cx + 15 + d + W + DRIFT * t) % span) - W);
      shape.forEach((line, i) => {
        for (let k = 0; k < w; k++) if (line[k] !== " " && sky(r0 + i, x + k)) cloud[r0 + i][x + k] = line[k] === "#" ? " " : line[k];
      });
    }
    // Stars keep a cell clear of clouds and of the moon.
    const near = (r: number, c: number) => {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (cloud[r + dr]?.[c + dc]) return true;
      return up && !day && Math.abs(c - cx) <= 6 && Math.abs(r - cy) <= 3;
    };
    for (const [row, col, ch, need] of stars) {
      if (dark <= need || !sky(row, col) || near(row, col)) continue;
      g[row][col] = need > 0.3 && hash(col, step) < 0.15 ? " " : ch; // the faint ones twinkle
    }

    let lit = 0, full = 1;
    // Draws a cell of the sun or moon, counting what shows of its body. A ray
    // or rim stroke beside land or cloud would read as part of it, so it goes.
    const put = (r: number, c: number, ch: string, solid: boolean, body: boolean) => {
      if (!sky(r, c) || cloud[r][c]) return;
      if (!solid) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (ground(r + dr, c + dc) || cloud[r + dr]?.[c + dc]) return;
      g[r][c] = ch;
      if (body) lit++;
    };
    if (day) {
      SUN.forEach((line, i) => {
        for (let k = 0; k < line.length; k++) {
          const r = cy - 2 + i, c = cx - 5 + k;
          const disc = i === 2 ? k > 1 && k < 9 : i % 2 === 1 && k > 2 && k < 8;
          if (line[k] !== " ") put(r, c, line[k], disc, disc);
        }
      });
    } else if (up) {
      // Lit where the sunward side is: waxing on the right, waning on the left.
      const k = Math.cos(2 * Math.PI * (age % 0.5));
      const shine = (x: number, y: number) => x * x + y * y <= 1 && age < 0.5 === x > k * Math.sqrt(Math.max(0, 1 - y * y));
      const edge = k > 0.25 ? ")" : k < -0.25 ? "(" : "|";
      full = (1 - Math.cos(2 * Math.PI * age)) / 2;
      MOON.forEach((line, i) => {
        for (let j = 0; j < line.length; j++) {
          if (line[j] === " ") continue;
          const r = cy - 2 + i, c = cx - 5 + j;
          const x = (j + 0.5 - 5) / 5, y = (i + 0.5 - 2.5) / 2.5;
          if (line[j] !== "#") {
            // A rim cell is lit by the edge of the face it lies on.
            const s = 0.97 / Math.hypot(x, y);
            if (shine(x * s, y * s)) put(r, c, line[j], false, true);
            continue;
          }
          let on = 0;
          for (let q = 0; q < 9; q++) if (shine(x + ((q % 3) - 1) / 15, y + (Math.floor(q / 3) - 1) / 7.5)) on++;
          if (on >= 6) put(r, c, maria.has(`${i},${j}`) ? "." : ":", true, true);
          else if (on >= 2) put(r, c, edge, true, true);
          else if (sky(r, c)) g[r][c] = " ";
        }
      });
    }
    for (let r = 0; r <= SHORE; r++) for (let c = 0; c < cols; c++) if (cloud[r][c]) g[r][c] = cloud[r][c];

    // The water: the range's outline upside down, a few ripples drifting along
    // it, and a path of light under the sun or moon kept clear of the rest.
    for (const [r, c, ch] of mirror) if (r < rows) g[r][c] = ch;
    for (const [r, c0, n, v] of ripples) {
      const x = Math.floor((((c0 + v * t) % (cols + 4)) + cols + 4) % (cols + 4)) - 2;
      // A ripple keeps a cell clear of the reflection on either side.
      let clear = true;
      for (let c = x - 1; c <= x + n; c++) if (g[r][c] !== undefined && g[r][c] !== " ") clear = false;
      if (clear) for (let c = Math.max(0, x); c < Math.min(cols, x + n); c++) g[r][c] = "-";
    }
    if (lit > 2) {
      const mid = cx + 0.5;
      for (let r = SHORE + 1; r < rows; r++) {
        // A thin moon lays a narrow, broken path; the sun or a full moon a broad one.
        const w = 0.6 + (r - SHORE) * (0.15 + full * 0.45);
        for (let c = Math.floor(mid - w - 1); c <= mid + w + 1; c++) {
          if (c < 0 || c >= cols) continue;
          const d = Math.abs(c + 0.5 - mid);
          g[r][c] = d > w || hash(c * 31 + r, step) < 0.2 + 0.4 * (1 - full) ? " " : d < w * 0.5 && full > 0.5 ? "=" : "-";
        }
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
