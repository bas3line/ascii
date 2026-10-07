/*
 * wind: gusts drawn as streamlines of a slowly bending flow, shown only where
 * a gust is passing. The streamlines are contours of one stream function, so
 * they bend together and never cross; the long gusts curl over at their heads.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "wind",
  category: "nature",
  note: "gusts streaming along bending lines, curling at the head",
  cols: 64,
  rows: 14,
  fps: 15,
} satisfies Meta;

const GAP = 2; // rows between streamlines
const BAR = "▔─▁"; // top, middle, bottom third of a row
const END = "'·."; // a gust's trailing tip, by the same thirds
const MIN = 8; // gusts shorter than this are dropped
const TIP = 14; // only gusts this long trail a tip
const CURL = 16; // a gust this many columns long may curl over at its head
const MAX_CURLS = 3; // and only the longest few do
const FLAT = 4; // cells before a curl drawn level, so it joins its line cleanly

const hash = (x: number, y: number, z: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x2545f491);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function noise(x: number, y: number, z: number): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const u = ease(x - i), v = ease(y - j), w = ease(z - k);
  const n = (a: number, b: number, c: number) => hash(i + a, j + b, k + c);
  return mix(
    mix(mix(n(0, 0, 0), n(1, 0, 0), u), mix(n(0, 1, 0), n(1, 1, 0), u), v),
    mix(mix(n(0, 0, 1), n(1, 0, 1), u), mix(n(0, 1, 1), n(1, 1, 1), u), v),
    w,
  );
}

// The stream function, in rows: depth plus a slow bend that drifts right.
const psi = (x: number, y: number, t: number) => y + 5 * (noise(x * 0.04 - t * 0.05, y * 0.18, t * 0.02) + 0.35 * noise(x * 0.07 + 4, y * 0.4, t * 0.04));

// One streamline's gusts: the mask by column, each gust's span, the row the
// line crosses each column at, and the cells it drew as column, row pairs.
interface Streamline {
  mask: Uint8Array;
  spans: [number, number][];
  row: Int16Array;
  cells: number[];
}

export default function wind(): Frame {
  const { cols, rows } = meta;
  const g = Array.from({ length: rows }, () => new Array<string>(cols));

  // Where gusts are passing along streamline k: 0 calm, 1 a long gust's
  // trailing tip, 2 inside it, and each gust's span. Gusts thin out over the
  // last 8 columns at either edge, and short ones are dropped as dust.
  const gusts = (k: number, t: number): Streamline => {
    const mask = new Uint8Array(cols), spans: [number, number][] = [];
    for (let c = 0, from = -1; c <= cols; c++) {
      const on = c < cols && noise(c * 0.09 - t * 0.5, k * 1.7, t * 0.05) * Math.min(1, (c + 1) / 8, (cols - c) / 8) > 0.5;
      if (on && from < 0) from = c;
      if (!on && from >= 0) {
        if (c - from >= MIN) {
          mask.fill(2, from, c);
          if (c - from >= TIP) mask[from] = 1;
          spans.push([from, c - 1]);
        }
        from = -1;
      }
    }
    return { mask, spans, row: new Int16Array(cols).fill(-1), cells: [] };
  };

  const free = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && g[r][c] === " ";

  return (t) => {
    for (const row of g) row.fill(" ");
    const lines: Streamline[] = [];
    for (let c = 0; c < cols; c++) {
      // Walk down the column a third of a row at a time; a streamline crosses
      // wherever the stream function passes a multiple of GAP.
      let was = Math.floor(psi(c + 0.5, 0, t) / GAP);
      for (let j = 0; j < rows * 3; j++) {
        const now = Math.floor(psi(c + 0.5, (j + 1) / 3, t) / GAP), k = Math.max(now, was), same = now === was;
        was = now;
        if (same) continue;
        const line = (lines[k] ??= gusts(k, t));
        if (line.row[c] < 0) line.row[c] = Math.floor(j / 3);
        const on = line.mask[c];
        if (on) (g[Math.floor(j / 3)][c] = (on === 1 ? END : BAR)[j % 3]), line.cells.push(c, Math.floor(j / 3));
      }
    }
    // A gust that shows five cells or fewer is seen edge on, or mostly out of
    // the frame: drop it.
    for (const line of lines) {
      if (!line) continue;
      const { cells } = line;
      let i = 0;
      for (const [from, to] of line.spans) {
        while (i < cells.length && cells[i] < from) i += 2;
        let n = i;
        while (n < cells.length && cells[n] <= to) n += 2;
        if (n - i <= 10) for (let k = i; k < n; k += 2) g[cells[k + 1]][cells[k]] = " ";
        i = n;
      }
    }
    // The longest gusts curl over at their heads, up or down by turns.
    const heads: [number, number, number][] = [];
    lines.forEach((line, k) => {
      for (const [from, to] of line.spans) if (to - from + 1 >= CURL && line.row[to] >= 0) heads.push([to - from, k, to]);
    });
    heads.sort((a, b) => b[0] - a[0]);
    const curls: [number, number][] = [];
    // The curl's own row and the next one past it must be clear around it.
    const room = (r: number, to: number, d: number) => {
      if (!free(r + d, to - 2) || !free(r, to + 1)) return false;
      for (const rr of [r + d, r + 2 * d])
        for (let c = to - 5; c <= to + 2; c++) if (rr >= 0 && rr < rows && c >= 0 && c < cols && g[rr][c] !== " ") return false;
      return true;
    };
    for (const [, k, to] of heads) {
      const line = lines[k], r = line.row[to], d = k % 2 ? 1 : -1;
      if (curls.length >= MAX_CURLS || to < FLAT + 2 || r + d < 0 || r + d >= rows) continue;
      let level = true;
      for (let c = to - FLAT; c < to; c++) if (line.row[c] !== r || !BAR.includes(g[r][c])) level = false;
      if (!level || !room(r, to, d)) continue;
      // Two curls near each other read as a knot, so they keep well apart.
      if (curls.some(([cr, cc]) => Math.abs(cr - r) < 5 && Math.abs(cc - to) < 16)) continue;
      curls.push([r, to]);
      for (let c = to - FLAT; c < to; c++) g[r][c] = "─";
      g[r][to] = d > 0 ? "╮" : "╯";
      g[r + d][to] = d > 0 ? "╯" : "╮";
      g[r + d][to - 1] = "─";
      g[r + d][to - 2] = d > 0 ? "╰" : "╭";
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
