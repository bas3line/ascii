/*
 * radar: a round scope with range rings and a sweep turning clockwise. Its
 * afterglow trails behind; contacts light as the beam crosses them, then fade.
 */
import type { Frame, Meta } from "../types.ts";

export interface RadarOptions {
  [key: string]: unknown;
  /** The scope's range, printed in the corner; the rings are a third of it apart. */
  range: number;
  unit: string;
}

export const meta = {
  name: "radar",
  category: "data",
  note: "rotating sweep with afterglow, contacts fade between passes",
  cols: 53,
  rows: 25,
  fps: 30,
  options: { range: 24, unit: "nm" },
} satisfies Meta<RadarOptions>;

const R = 19; // scope radius in pixels; a pixel is a cell wide and half a cell tall
const TURN = 4; // seconds per revolution
const TRAIL = 0.8; // radians of afterglow behind the beam
const FADE = 2.4; // seconds for a return to fade to a third
const HALF = [" ", "▀", "▄", "█"];
const SHADE = " ░▒▓█";
const TAU = Math.PI * 2;

export default function radar({ range = 24, unit = "nm" }: Partial<RadarOptions> = {}): Frame {
  const { cols, rows } = meta;
  const CX = 26, CY = 24.5; // the centre in pixels: a column, and between two pixel rows
  const cell = (x: number, y: number): number => Math.round(x) + (Math.round(y - 0.01) >> 1) * cols;
  const bearing = (x: number, y: number): number => (Math.atan2(x - CX, CY - y) + TAU) % TAU;
  const back: string[] = new Array(cols * rows).fill(" ");
  // Each point and its mirror images across both axes, so every ring is symmetric.
  const four = (x: number, y: number, f: (c: number, p: number) => void) => {
    const c = Math.round(x), p = Math.round(y - 0.01);
    for (const [cc, pp] of [[c, p], [2 * CX - c, p], [c, 2 * CY - p], [2 * CX - c, 2 * CY - p]]) f(cc, pp);
  };

  // The bezel, a ring of half-block pixels just outside the scope.
  const ring = new Uint8Array(cols * rows * 2);
  const plot = (c: number, p: number) => {
    if (c >= 0 && c < cols && p >= 0 && p < rows * 2) ring[c + p * cols] = 1;
  };
  const RB = R + 1.5;
  for (let dx = 0; dx <= RB; dx++) four(CX + dx, CY - Math.sqrt(RB * RB - dx * dx), plot);
  for (let dy = 0.5; dy <= RB; dy++) four(CX + Math.sqrt(RB * RB - dy * dy), CY - dy, plot);
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, p = 2 * Math.floor(i / cols);
    const k = ring[c + p * cols] | (ring[c + (p + 1) * cols] << 1);
    if (k) back[i] = HALF[k];
  }
  // Two range rings, a dot in each cell they pass through, dropping the inner
  // corner of every step so the ring stays one cell thick.
  for (const rr of [R / 3, (2 * R) / 3]) {
    const path: [c: number, r: number][] = [];
    for (let i = 0; i <= 200; i++) {
      const a = (Math.PI / 2) * (i / 200);
      const x = CX + rr * Math.sin(a), y = CY - rr * Math.cos(a);
      const k: [number, number] = [Math.round(x), Math.round(y - 0.01) >> 1];
      const last = path[path.length - 1];
      if (!last || last[0] !== k[0] || last[1] !== k[1]) path.push(k);
    }
    const kept = [path[0]];
    for (let j = 1; j < path.length; j++) {
      const p = kept[kept.length - 1], n = path[j + 1];
      if (!n || Math.abs(p[0] - n[0]) > 1 || Math.abs(p[1] - n[1]) > 1) kept.push(path[j]);
    }
    for (const [c, r] of kept) four(c, 2 * r + 0.5, (cc, pp) => (back[cc + (pp >> 1) * cols] = "·"));
  }
  back[cell(CX, CY)] = "+";
  const put = (s: string, c: number, r: number) => {
    for (let i = 0; i < s.length; i++) back[c + i + r * cols] = s[i];
  };
  put("000", CX - 1, 1);
  put("180", CX - 1, rows - 2);
  put("270", 1, 12);
  put("090", cols - 4, 12);

  // Every cell inside the scope, with its bearing.
  const inside: [i: number, b: number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c, y = 2 * r + 0.5;
      if (Math.hypot(x - CX, y - CY) < R - 0.3) inside.push([c + r * cols, bearing(x, y)]);
    }
  }
  // A coast along the south-west edge: land lies beyond this range at each bearing.
  const shore = (b: number): number => R * (0.66 + 0.09 * Math.sin(b * 5 + 0.6) + 0.05 * Math.sin(b * 13) + 2.2 * Math.max(0, Math.abs(b - 4.15) - 0.62));
  const isLand = (x: number, y: number): boolean => {
    const b = bearing(x, y);
    return b > 3.3 && b < 5.0 && Math.hypot(x - CX, y - CY) > shore(b);
  };
  const land: [i: number, b: number, edge: boolean][] = [];
  for (const [i, b] of inside) {
    const c = i % cols, y = 2 * Math.floor(i / cols) + 0.5;
    if (!isLand(c, y)) continue;
    const edge = [[1, 0], [-1, 0], [0, 2], [0, -2]].some(([dx, dy]) => !isLand(c + dx, y + dy));
    land.push([i, b, edge]);
  }

  // Contacts on straight tracks across the scope; each leaves, stays out for a
  // few pixels of travel, and comes back in on the far side. Heading, offset
  // from the centre, speed in pixels a second, start along the track, size, gap.
  const tracks = [
    [1.05, -5, 1.1, 15, 2, 8],
    [3.45, 6, 0.9, -1, 2, 10],
    [5.3, 9, 1.2, 4, 1, 6],
    [2.1, -11, 0.8, -9, 1, 8],
    [0.4, 3, 1.3, -21, 1, 8],
    [4.75, 13, 0.7, 2, 1, 6],
  ].map(([h, off, v, u, size, gap]) => {
    const L = 2 * Math.sqrt(R * R - off * off) + gap;
    return { h, off, v, L, u0: u + L / 2, size };
  });
  const where = (k: number, t: number): [number, number] => {
    const { h, off, v, L, u0 } = tracks[k];
    const u = ((((u0 + v * t) % L) + L) % L) - L / 2;
    return [CX + u * Math.sin(h) + off * Math.cos(h), CY - (u * Math.cos(h) - off * Math.sin(h))];
  };
  const out: string[] = new Array(cols * rows);

  return (t) => {
    const sweep = ((t / TURN) * TAU) % TAU;
    const ago = (b: number): number => (((((sweep - b) % TAU) + TAU) % TAU) / TAU) * TURN; // seconds since the beam passed
    for (let i = 0; i < out.length; i++) out[i] = back[i];
    // Land is a faint fill; its coast flares for a moment after each pass.
    for (const [i, b, edge] of land) out[i] = SHADE[edge && ago(b) < 1.2 ? 2 : 1];
    // Afterglow: the beam itself, then a fading wedge behind it.
    for (const [i, b] of inside) {
      const a = (ago(b) / TURN) * TAU;
      if (a < TRAIL) out[i] = SHADE[a < 0.08 ? 3 : a < 0.3 ? 2 : Math.max(1, SHADE.indexOf(out[i]))];
    }
    // A contact shows where it was when the beam last crossed it, fading from
    // full to a mid shade, above anything the land or the trail can reach.
    let seen = 0;
    for (let k = 0; k < tracks.length; k++) {
      const [x0, y0] = where(k, t);
      const s = ago(bearing(x0, y0));
      const [x, y] = where(k, t - s);
      if (Math.hypot(x - CX, y - CY) > R - 1.2 || isLand(x, y)) continue;
      seen++;
      const g = Math.exp(-s / FADE);
      const ch = SHADE[g > 0.7 ? 4 : g > 0.42 ? 3 : 2];
      const i = cell(x, y);
      out[i] = ch;
      if (tracks[k].size > 1) out[i + 1] = ch;
    }
    const deg = String(Math.round((sweep * 180) / Math.PI) % 360).padStart(3, "0");
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    const corner = (r: number, l: string, rt: string) => (lines[r] = l + lines[r].slice(l.length, cols - rt.length) + rt);
    corner(1, ` brg ${deg}°`, `rng ${range} ${unit} `);
    corner(rows - 2, ` contacts ${seen}`, `rings ${Math.round(range / 3)} ${unit} `);
    return lines.join("\n");
  };
}
