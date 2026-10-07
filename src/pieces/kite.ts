/*
 * kite: a diamond kite on a long string from off the bottom left. Gusts lift
 * it and pull the string straight, lulls let it sag, and the tail flutters.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "kite",
  category: "objects",
  note: "a diamond kite riding the wind, its string sagging in lulls",
  cols: 64,
  rows: 24,
  fps: 15,
} satisfies Meta;

const P = 40; // seconds before the wind repeats
const TAU = Math.PI * 2;
// Half the spar, in columns. Above the spar the edges climb two columns a
// row, so the top is B / 2 rows up; below they drop one a row, so the bottom
// is B rows down. Width to height is about 0.7, square for square.
const B = 8;
const TAIL = 7; // rows of tail
const FILL = ":";

// Where a shallow line sits inside its cell, as the glyph that sits there.
const level = (f: number) => (f < 0.3 ? "'" : f < 0.55 ? "-" : f < 0.78 ? "." : "_");

export default function kite(): Frame {
  const { cols, rows } = meta;
  let g: string[][];
  const put = (r: number, c: number, ch: string) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = ch;
  };

  return (t) => {
    g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    const ph = (TAU * t) / P;
    const wind = 0.5 + 0.3 * Math.sin(2 * ph) + 0.2 * Math.sin(5 * ph + 1.3);

    // The kite rides up in a gust and drifts a little sideways, a whole cell
    // at a time and seldom, so its outline holds.
    const mid = Math.floor(45 + 0.7 * Math.sin(ph + 0.4));
    const rs = Math.floor(6.5 + 1.4 * (0.5 - wind)); // the spar's row
    // It rolls into the wind. A roll is drawn as the bottom half of the sail
    // standing a column off the top half, so every edge keeps an even step
    // and only the corners give.
    const roll = Math.sin(5 * ph) + 0.35 * Math.sin(13 * ph + 1);
    const up = mid; // the top half's middle
    const lo = mid + (roll > 0.55 ? -1 : roll < -0.55 ? 1 : 0); // the bottom half's

    // The sail, a row at a time out from the spar. Two opposite panels are
    // shaded, like a harlequin kite.
    for (let k = 1; k < B / 2; k++) {
      const r = rs - k, e = B - 2 * k;
      put(r, up - e - 1, ","), put(r, up - e, "'");
      put(r, up + e, "`"), put(r, up + e + 1, ".");
      for (let c = up - e + 1; c < up; c++) put(r, c, FILL);
      put(r, up, "|");
    }
    put(rs - B / 2, up - 1, "."), put(rs - B / 2, up, "^"), put(rs - B / 2, up + 1, ".");

    const a0 = Math.min(up, lo) - B, b0 = Math.max(up, lo) + B;
    for (let c = a0 + 1; c < b0; c++) put(rs, c, "-");
    put(rs, a0, "<"), put(rs, b0, ">"), put(rs, up, "+");

    for (let j = 1; j < B; j++) {
      const r = rs + j, e = B - j;
      put(r, lo - e, "\\"), put(r, lo + e, "/");
      for (let c = lo + 1; c < lo + e; c++) put(r, c, FILL);
      put(r, lo, "|");
    }

    // The tail streams downwind from the bottom corner, one glyph a row, its
    // flutter growing toward the free end, with a bow tied every few rows.
    const vr = rs + B - 1;
    const lean = 0.15 + 0.35 * wind;
    const amp = (0.35 + 0.3 * wind) / 3.5;
    const tx = (s: number) => lo + 0.5 + lean * s + amp * s * Math.sin(2.2 * s - 15 * ph);
    for (let r = vr + 1; r < Math.min(rows, vr + 1 + TAIL); r++) {
      const s = r - vr - 0.5;
      const slope = tx(s + 0.5) - tx(s - 0.5);
      const bend = tx(s + 0.5) - 2 * tx(s) + tx(s - 0.5);
      const c = Math.floor(tx(s));
      put(r, c, slope > 0.6 ? "\\" : slope < -0.6 ? "/" : bend > 0 ? "(" : ")");
      if ((r - vr) % 3 === 2) put(r, c - 1, ">"), put(r, c + 1, "<");
    }

    // The string comes in from a hand far off the bottom left, a glyph a
    // column at its height in the cell. It sags as the wind drops and pulls
    // straighter in a gust.
    const hand = [-20, rows + 3];
    const knot = [a0, rs + 0.5];
    const sag = 1.7 - 1.1 * wind;
    for (let c = 0; c < a0; c++) {
      const u = (c + 0.5 - hand[0]) / (knot[0] - hand[0]);
      const y = hand[1] + (knot[1] - hand[1]) * u + 4 * sag * u * (1 - u);
      put(Math.floor(y), c, level(y % 1));
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
