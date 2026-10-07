/*
 * vinyl: a record turning on a turntable, seen from above. The label and a
 * few specks of dust turn at 33 1/3 rpm, the sheen on the grooves stays put,
 * and a J-shaped tonearm rests in the outer grooves.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "vinyl",
  category: "objects",
  note: "a record turning under the tonearm, seen from above",
  cols: 64,
  rows: 25,
  fps: 24,
} satisfies Meta;

const RAMP = " .·:-=+*#%@";
const SPIN = (2 * Math.PI * 100) / 3 / 60; // 33 1/3 rpm, in radians per second
const R = 9; // the record, in rows
const RIM = 9.9; // the platter's edge
const LABEL = 4;
const GAPS = [6.2, 7.5]; // the smooth bands between tracks
const DUST: [number, number][] = [[6.8, 0.4], [8.2, 2.9], [5.4, 4.4]]; // radius, angle

// The label's print, in its own frame (rows, x across): a title band above
// the spindle and a round mark off to one side below it.
const printed = (x: number, y: number): boolean => (y > -2.9 && y < -1.45 && Math.abs(x) < 2.7) || Math.hypot(x - 1.5, y - 1.9) < 0.75;

type Cell = [k: number, d: number, th: number, h: number, sub: [number, number][]];
type Tally = [n: number, fy: number, c: number, fall: number];

export default function vinyl(): Frame {
  const { cols, rows } = meta;
  const cx = 22.5, cy = 12.5; // the spindle, in cells
  const out: string[] = new Array(cols * rows);
  const put = (c: number, r: number, g: string) => {
    c = Math.floor(c), r = Math.floor(r);
    if (c >= 0 && c < cols && r >= 0 && r < rows) out[r * cols + c] = g;
  };
  const text = (c: number, r: number, s: string) => [...s].forEach((g, i) => g !== " " && put(c + i, r, g));

  // Per cell: radius in rows, angle, and the cell's radial depth, so a ring
  // drawn within half of it is one cell thick all the way round. Label cells
  // keep sixteen sample points so the print keeps its shape as it turns.
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c + 0.5 - cx) / 2, dy = r + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > R + 0.1) continue;
      const th = Math.atan2(dy, dx);
      const h = 0.5 * Math.abs(Math.cos(th)) + Math.abs(Math.sin(th));
      const sub: [number, number][] = [];
      if (d < LABEL) for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) sub.push([dx + (i - 1.5) / 8, dy + (j - 1.5) / 4]);
      cells.push([r * cols + c, d, th, h, sub]);
    }
  }

  // The platter's edge, traced once as an outline, each cell taking the
  // glyph for the slope and height of the curve inside it. Its upright
  // sides take one cell a row, and so does each slant.
  const rim = new Map<number, Tally>();
  const side = RIM * 0.3;
  for (let r = Math.ceil(cy - side - 0.5); r + 0.5 < cy + side; r++) {
    const w = 2 * Math.sqrt(RIM * RIM - (r + 0.5 - cy) ** 2);
    for (const c of [cx - w, cx + w]) rim.set(r * cols + Math.floor(c), [1, 0.5, 1, 0]);
  }
  for (let i = 0; i < 2000; i++) {
    const p = (i / 2000) * 2 * Math.PI;
    const x = cx + 2 * RIM * Math.cos(p), y = cy + RIM * Math.sin(p);
    if (Math.abs(Math.floor(y) + 0.5 - cy) < side) continue;
    const k = Math.floor(y) * cols + Math.floor(x);
    const e = rim.get(k) || [0, 0, 0, 0];
    (e[0] += 1), (e[1] += y - Math.floor(y)), (e[2] += Math.abs(Math.cos(p))), (e[3] += Math.sin(p) * Math.cos(p) < 0 ? 1 : 0);
    rim.set(k, e);
  }
  const most = new Map<number, number>(); // the fullest slanted cell on each row and side
  const phiOf = ([n, , c]: Tally): number => (Math.atan2(c / n, Math.sqrt(Math.max(0, 1 - (c / n) ** 2))) * 180) / Math.PI;
  for (const [k, e] of rim) {
    const id = Math.floor(k / cols) * 2 + (k % cols < cx ? 0 : 1), phi = phiOf(e);
    if (phi > 50 && phi <= 72 && e[0] > (rim.get(most.get(id) as number)?.[0] ?? 0)) most.set(id, k);
  }
  const edge = [...rim].map(([k, e]): [number, string] => {
    const [n, fy, , fall] = e, phi = phiOf(e);
    const slant = most.get(Math.floor(k / cols) * 2 + (k % cols < cx ? 0 : 1)) === k;
    const g = phi > 72 ? "|" : slant ? (fall / n > 0.5 ? "\\" : "/") : fy / n < 0.42 ? "'" : fy / n > 0.58 ? (phi > 10 ? "." : "_") : "-";
    return [k, g];
  });

  // Light bars: two opposite wedges where the grooves catch a lamp to the
  // upper left. They stay put while the record turns under them.
  const sheen = (th: number) => {
    const d = (((th + 0.8) % Math.PI) + Math.PI) % Math.PI - Math.PI / 2;
    return Math.exp(-((d * 2.4) ** 2));
  };

  return (t, { paper = false } = {}) => {
    const a = SPIN * t, ca = Math.cos(a), sa = Math.sin(a);
    out.fill(" ");
    for (const [k, g] of edge) out[k] = g;
    for (const [k, r, th, h, sub] of cells) {
      const ring = (g: number) => Math.abs(r - g) < h / 2;
      const s = sheen(th);
      let b: number;
      if (r < 0.6) continue;
      else if (r < LABEL) {
        // Turn each sample back into the label's frame and count the print.
        let ink = 0;
        for (const [x, y] of sub) ink += printed(x * ca + y * sa, y * ca - x * sa) ? 1 : 0;
        b = ink > sub.length / 2 ? 5 : 9;
      } else if (r > R - 0.45) b = 4 + Math.round(2 * s);
      else if (r < LABEL + 1) b = 2 + Math.round(2 * s);
      else if (GAPS.some(ring)) b = 2 + Math.round(3 * s);
      else b = 3 + Math.round(4 * s);
      out[k] = RAMP[paper ? RAMP.length - 1 - b : b];
    }
    put(cx, cy, "o");
    // Dust riding round with the record.
    for (const [r, p] of DUST) put(cx + 2 * r * Math.cos(p + a), cy + r * Math.sin(p + a), "°");

    // The plinth, its start and speed buttons, and the pitch slider.
    for (let c = 1; c < cols - 1; c++) (put(c, 0, "─"), put(c, rows - 1, "─"));
    for (let r = 1; r < rows - 1; r++) (put(0, r, "│"), put(cols - 1, r, "│"));
    put(0, 0, "╭"), put(cols - 1, 0, "╮"), put(0, rows - 1, "╰"), put(cols - 1, rows - 1, "╯");
    text(2, 21, "┌──┐"), text(2, 22, "└──┘");
    text(47, 21, "┌┐┌┐"), text(47, 22, "└┘└┘");
    for (let r = 12; r <= 22; r++) put(59, r, r === 17 ? "═" : "┊");

    // The tonearm: counterweight behind the pivot, the pivot in its ring,
    // a tube down and round to the headshell, and the cue lever beside it.
    text(49, 2, "▗▄▄▄▖");
    text(49, 3, "▝▀█▀▘");
    text(48, 4, "╭──╨──╮");
    text(48, 5, "│  O  │");
    text(48, 6, "╰──╥──╯");
    for (let r = 7; r < 16; r++) put(51, r, "║");
    text(41, 16, "══════════╝");
    text(36, 16, "▐███▌");
    text(54, 9, "╭╮"), text(54, 10, "││"), text(54, 11, "╰╯");

    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
