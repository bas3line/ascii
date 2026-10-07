/*
 * skyline: a city at night across a river. Office windows go on and off,
 * sometimes a whole floor at once, the mast on the tallest tower blinks,
 * and the low lights and the moon are drawn down into the water as streaks.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skyline",
  category: "objects",
  note: "a city at night, windows going on and off, a blinking mast",
  cols: 64,
  rows: 23,
  fps: 10,
} satisfies Meta;

const BASE = 18; // the embankment row; towers stand on it, water below
const SHARE = 0.4; // the share of windows lit, which the night drifts back toward

// Far towers in haze: left column, width, height in rows.
const FAR: [number, number, number][] = [[3, 6, 9], [14, 6, 12], [25, 5, 9], [36, 6, 12], [48, 7, 10], [57, 6, 12]];
// Near towers: left column, width, height, then the setbacks stacked on top,
// each as [inset, rows].
const NEAR: [number, number, number, [number, number][], (keyof typeof TOPS)?][] = [
  [-3, 8, 5, []],
  [6, 7, 8, [], "tank"],
  [13, 5, 6, []],
  [19, 9, 10, [[1, 1], [1, 1], [1, 1]]],
  [29, 7, 13, [[1, 1]], "mast"],
  [37, 5, 7, []],
  [42, 7, 10, [], "spire"],
  [50, 5, 5, []],
  [55, 11, 8, [[1, 2]], "crown"],
];
// Rooftop things, bottom row first, centred over the top tier.
const TOPS = {
  tank: ["╨ ╨", "▄▄▄"],
  mast: ["╱│╲", " │ ", " │ "],
  spire: ["╱   ╲", " ╱ ╲ ", "  ╿  "],
  crown: ["╭───╮", " ╭─╮ "],
};
const STARS: [number, number][] = [[1, 18], [4, 23], [2, 27], [6, 40], [1, 45], [7, 61], [3, 56], [5, 50], [0, 36], [3, 38], [8, 1], [0, 59]];
const MOON: [number, number, number] = [9, 3.5, 1.9]; // centre column, centre row, radius in rows

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function skyline(): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(19);
  const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(" "));
  const put = (c: number, r: number, g: string) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = g;
  };

  // The still part of the city, drawn once: far towers as haze, near ones
  // as outlines round a grid of panes, each setback's walls landing on the
  // tier below it.
  const city: string[][] = Array.from({ length: BASE }, () => new Array(cols).fill(" "));
  const set = (c: number, r: number, g: string) => c >= 0 && c < cols && r >= 0 && (city[r][c] = g);
  const draw = (c: number, r: number, g: string) => g !== " " && set(c, r, g);
  const panes: [number, number, boolean, number][] = []; // [row, col, far, tower]
  for (const [x, w, h] of FAR) {
    for (let r = BASE - h; r < BASE; r++) for (let c = x; c < x + w; c++) set(c, r, "░");
    for (let r = BASE - h + 1; r < BASE; r += 2) for (let c = x + 1; c < x + w - 1; c += 2) panes.push([r, c, true, -1]);
  }
  NEAR.forEach(([x, w, h, steps, top], n) => {
    let [l, rgt, t] = [x, x + w - 1, BASE - h];
    const tier = (r: number) => {
      for (let c = l; c <= rgt; c++) set(c, r, c === l || c === rgt ? "│" : " ");
      for (let c = l + 2; c < rgt; c += 2) panes.push([r, c, false, n]);
    };
    for (let r = t + 1; r < BASE; r++) tier(r);
    for (let c = l; c <= rgt; c++) set(c, t, c === l ? "┌" : c === rgt ? "┐" : "─");
    for (const [inset, tall] of steps) {
      (l += inset), (rgt -= inset);
      set(l, t, "┴"), set(rgt, t, "┴");
      for (let r = t - tall + 1; r < t; r++) tier(r);
      t -= tall;
      for (let c = l; c <= rgt; c++) set(c, t, c === l ? "┌" : c === rgt ? "┐" : "─");
    }
    // `top` is undefined for a plain roof, and TOPS[undefined] is undefined at run time.
    (TOPS[top as keyof typeof TOPS] || []).forEach((s, i) => [...s].forEach((g, j) => draw(Math.floor((l + rgt + 1 - s.length) / 2) + j, t - 1 - i, g)));
  });
  // A far pane only shows where no near tower stands in front of it.
  const shown = panes.filter(([r, c, far]) => c >= 0 && c < cols && (!far || city[r][c] === "░"));
  const mast = NEAR.find((b) => b[4] === "mast")!;
  const light = [BASE - mast[2] - 5, mast[0] + (mast[1] >> 1)];

  // The moon, a crescent drawn in quadrant blocks: lit where inside its
  // disc and outside the shadow's.
  const QUAD = " ▗▖▄▝▐▞▟▘▚▌▙▀▜▛█";
  const moon: [number, number, string][] = [];
  const [mx, my, mr] = MOON;
  for (let r = Math.floor(my - mr); r <= my + mr; r++) {
    for (let c = Math.floor(mx - 2 * mr); c <= mx + 2 * mr; c++) {
      let q = 0;
      for (const [b, dx, dy] of [[8, 0.25, 0.25], [4, 0.75, 0.25], [2, 0.25, 0.75], [1, 0.75, 0.75]]) {
        const x = (c + dx - mx) / 2, y = r + dy - my;
        if (Math.hypot(x, y) < mr && Math.hypot(x - 1.1, y) > mr * 0.95) q |= b;
      }
      if (q) moon.push([r, c, QUAD[q]]);
    }
  }

  // Every pane keeps whether it is lit. One changes at a time, and below
  // the share, lighting one is likelier than putting one out; every couple
  // of seconds a whole floor of one near tower switches together.
  const lit = shown.map(() => rand() < SHARE);
  let next = 0.2, floor = 0.9;
  let clock = 0;
  const pick = (on: boolean, near: boolean) => {
    let w = (rand() * lit.length) | 0;
    for (let n = 0; n < lit.length && (lit[w] === on || (near && shown[w][2])); n++) w = (w + 1) % lit.length;
    return w;
  };
  const advance = (t: number) => {
    while (Math.min(next, floor) <= t) {
      const on = rand() < 0.5 + (SHARE - lit.filter(Boolean).length / lit.length) * 4;
      if (floor < next) {
        const [r, , , n] = shown[pick(on, true)];
        shown.forEach(([r2, , , n2], i) => r2 === r && n2 === n && (lit[i] = on));
        floor += 1.6 + rand() * 1.2;
      } else {
        lit[pick(on, false)] = on;
        next += 0.12 + rand() * 0.3;
      }
    }
  };

  return (t) => {
    clock += Math.min(Math.max(t - clock, 0), 1);
    advance(clock);
    for (let r = 0; r < rows; r++) grid[r].fill(" ");
    for (let r = 0; r < BASE; r++) for (let c = 0; c < cols; c++) grid[r][c] = city[r][c];
    const glow: number[] = new Array(cols).fill(0); // lit panes low enough to reach the water
    shown.forEach(([r, c, far], i) => {
      grid[r][c] = far ? (lit[i] ? "▓" : "░") : lit[i] ? "▀" : "·";
      if (lit[i] && !far && r > BASE - 4) glow[c] = Math.max(glow[c], r - (BASE - 4));
    });

    // The sky: stars that twinkle, the moon, and the blinking mast.
    for (const [r, c] of STARS) if (grid[r][c] === " ") put(c, r, Math.sin(clock * 1.3 + c * 2) > 0.7 ? "+" : "·");
    for (const [r, c, g] of moon) put(c, r, g);
    put(light[1], light[0], clock % 1.6 < 0.4 ? "*" : "·");

    // The embankment, then the water: under each low light and under the
    // moon, a streak running straight down, broken by ripples and thinning
    // with depth.
    for (let c = 0; c < cols; c++) put(c, BASE, "▀");
    for (let k = 1; k < rows - BASE; k++) {
      for (let c = 0; c < cols; c++) {
        const ripple = Math.sin(c * 1.7 + k * 2.3 - clock * 3.1) + 0.6 * Math.sin(c * 0.53 - k * 1.3 + clock * 1.9);
        const m = Math.abs(c + 0.5 - (mx - 1)) < 2.8 - k * 0.45;
        if (m && ripple > -1.1 + k * 0.35) put(c, BASE + k, k < 2 ? "═" : k < 3 ? "=" : "-");
        else if (glow[c] && ripple > -0.9 + k * 0.45 - glow[c] * 0.2) put(c, BASE + k, "╎╎┊·"[k - 1]);
      }
    }
    return grid.map((l) => l.join("")).join("\n");
  };
}
