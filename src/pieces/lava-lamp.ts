/*
 * lava-lamp: a lava lamp on its base. Wax pools on the floor of the glass,
 * blobs swell off it, climb, meet and part, and sink again, lit from the bulb
 * underneath.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lava lamp",
  category: "objects",
  note: "wax blobs rising, merging and sinking in a lit glass",
  cols: 30,
  rows: 27,
  fps: 15,
} satisfies Meta;

const RAMP = ".:-=+*#%@";
const CW = 0.6, CH = 1.2; // a cell in em; the wax is measured in em
const T0 = 9; // seconds in: one blob near the cap, one climbing, one leaving the pool
const THRESH = 0.3;
const TOP = 8.6, FLOOR = 24.4; // the highest a blob's centre goes, and the glass floor, in em
// Seconds per trip, where in the trip, side of the middle, sway, reach.
const BLOBS: [number, number, number, number, number][] = [
  [24, 0.42, -0.5, 0.7, 3.0],
  [27, 0.08, 0.6, 0.6, 2.7],
  [31, 0.74, 0.1, 0.8, 3.3],
];
const GLASS = [4, 21]; // the rows of the glass, its floor row last

// The lamp's half width at each row, in columns: cap, glass, waist, base.
const half = (r: number) => (r < 1 ? 1.9 : r < 4 ? 0.9 + r : r < 20 ? 4.1 + 0.26 * (r - 4) : r < 21 ? 7.6 : 6.8 + (r - 21));
const fall = (q: number) => (q < 1 ? (1 - q) * (1 - q) : 0);
const smooth = (e: number) => (e <= 0 ? 0 : e >= 1 ? 1 : e * e * (3 - 2 * e));

export default function lavaLamp(): Frame {
  const { cols, rows } = meta;
  const mid = cols / 2;
  const m = Math.hypot(0, 0.5, 0.85);
  const [ly, lz] = [0.5 / m, 0.85 / m]; // toward the light: below, and in front

  // The lamp, drawn once: an edge per row from the half width, a thin bar set
  // where the glass actually stands in the cell, a slash where it leans.
  const shell = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const flip: Record<string, string> = { "/": "\\", "\\": "/", "▏": "▕", "▕": "▏", "│": "│", _: "_" };
  for (let r = 0; r < rows; r++) {
    const x = mid - half(r), lean = half(r + 0.5) - half(r - 0.5);
    let c = Math.floor(x), g: string;
    if (r === 0) g = "_";
    else if (r < GLASS[0] || r >= GLASS[1] - 1) g = lean > 0 || r < GLASS[0] ? "/" : "\\";
    else {
      const f = x - c;
      g = f < 0.34 ? "▏" : f < 0.67 ? "│" : "▕";
    }
    if (r === 0) for (let k = c; k < cols - c; k++) shell[r][k] = "_";
    shell[r][c] = g;
    shell[r][cols - 1 - c] = flip[g];
    // The cap's rim, the glass's floor sitting in the base, and the base's foot.
    if (r === 3 || r === 21 || r === rows - 1) for (let k = c + 1; k < cols - 1 - c; k++) shell[r][k] = "_";
    if (r >= GLASS[0] && r < GLASS[1]) for (let k = c + 1; k < cols - 1 - c; k++) shell[r][k] = "~";
  }
  // The inside of the glass, in em from the middle, at a row.
  const room = (r: number) => (half(Math.min(GLASS[1] - 1, Math.max(GLASS[0], r))) - 1.1) * CW;

  return (t, { paper = false } = {}) => {
    const tt = T0 + t;
    const balls = BLOBS.map(([period, phase, side, sway, rad]) => {
      const a = 2 * Math.PI * (tt / period + phase);
      const y = TOP + ((FLOOR - TOP) * (1 + Math.cos(a))) / 2;
      // Drawn out by the climb, round again at the turns.
      const stretch = 1 + 0.3 * Math.abs(Math.sin(a));
      const sx = stretch, sy = 1 / (stretch * stretch);
      // Kept clear of the glass at the narrowest row it reaches, and smaller where the glass is.
      const top = Math.floor((y - 0.67 * rad / Math.sqrt(sy)) / CH);
      const fit = room(top);
      const r = Math.min(rad, (fit * Math.sqrt(sx)) / 0.85);
      const reach = (0.8 * r) / Math.sqrt(sx);
      const x = side + sway * Math.sin(a * 0.5 + phase * 9);
      return { x: Math.max(reach - fit, Math.min(fit - reach, x)), y, r2: r * r, sx, sy };
    });
    // The pool: three low lumps either side of the middle, shifting their weight.
    for (let j = -1; j <= 1; j++) {
      const x = j * 2.5 + 0.35 * Math.sin(tt * 0.31 + j * 2.1);
      balls.push({ x, y: FLOOR + 0.6 + 0.3 * Math.sin(tt * 0.43 + j * 1.3), r2: 2.6 * 2.6, sx: 0.3, sy: 1 });
    }
    const field = (x: number, y: number) => {
      let f = 0;
      for (const b of balls) {
        const dx = x - b.x, dy = y - b.y;
        f += fall((dx * dx * b.sx + dy * dy * b.sy) / b.r2);
      }
      // A meniscus: the pool climbs a little up the glass at either side.
      const edge = Math.min(1, Math.abs(x) / room(GLASS[1] - 1));
      return f + 0.55 * smooth((y - FLOOR + 0.9 + 2 * edge ** 4) / 1.1);
    };

    const F = new Float64Array(rows * cols);
    for (let r = GLASS[0]; r < GLASS[1]; r++)
      for (let c = 0; c < cols; c++) if (shell[r][c] === "~") F[r * cols + c] = field((c + 0.5 - mid) * CW, (r + 0.5) * CH);
    const wax = (r: number, c: number) => shell[r][c] !== "~" || F[r * cols + c] >= THRESH;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const row = shell[r].slice();
      for (let c = 0; c < cols; c++) {
        if (row[c] !== "~") continue;
        const x = (c + 0.5 - mid) * CW, y = (r + 0.5) * CH;
        const f = F[r * cols + c];
        if (f < THRESH) {
          row[c] = " ";
          continue;
        }
        // The wax as a dome over its outline, its slope from the field's.
        const gx = (field(x + 0.3, y) - field(x - 0.3, y)) / 0.6;
        const gy = (field(x, y + 0.3) - field(x, y - 0.3)) / 0.6;
        const k = 0.8 / Math.sqrt(f - THRESH + 0.04);
        const nx = -gx * k, ny = -gy * k;
        const lit = Math.max(0, (ny * ly + lz) / Math.hypot(nx, ny, 1));
        const warm = smooth((y - TOP) / (FLOOR - TOP)); // brighter nearer the bulb
        // Where the wax meets clear oil, an outline that follows the way the edge faces.
        const up = !wax(r - 1, c), dn = !wax(r + 1, c), lf = !wax(r, c - 1), rt = !wax(r, c + 1);
        if (up || dn || lf || rt) {
          row[c] = up && dn ? (lf ? "(" : rt ? ")" : "-") : up ? (lf || rt ? "." : "-") : dn ? (lf || rt ? "'" : "-") : lf && rt ? "|" : lf ? "(" : ")";
          continue;
        }
        const i = 1 + Math.round(Math.min(1, 0.05 + 0.75 * lit + 0.2 * warm) * (RAMP.length - 2));
        row[c] = RAMP[paper ? RAMP.length - 1 - i : i];
      }
      lines.push(row.join(""));
    }
    return lines.join("\n");
  };
}
