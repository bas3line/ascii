/*
 * sundial: the Samrat Yantra at Jantar Mantar, Jaipur, seen from the south.
 * The gnomon's shadow lies on the quadrants where the sun at Jaipur would put
 * it at this hour of the viewer's own clock (not Jaipur solar time).
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sundial",
  category: "objects",
  note: "jaipur's samrat yantra, its shadow set by your local time",
  cols: 65,
  rows: 23,
  fps: 10,
  clock: true,
} satisfies Meta;

const LAT = (26.92 * Math.PI) / 180; // Jaipur
const CX = 32.5, YC = 9.5; // the centre of the quadrants' arc, on the gnomon's edge
const RX = 26, RY = 11.6; // the arc's radius across and down, a cell being twice as tall as wide
const INNER = 0.77; // the inner edge of the quadrants' face, as a share of the outer
const GROUND = 22, APEX = 4, FOOT = 2.9; // the gnomon: ground row, top row, half width at the foot

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type FaceCell = [k: number, psi: number, lo: number, hi: number, hour: boolean];
type Tally = [n: number, fy: number, phi: number, west: boolean];

export default function sundial(): Frame {
  const { cols, rows } = meta;
  const grid: string[] = new Array(cols * rows);
  const put = (c: number, r: number, g: string) => {
    c = Math.floor(c), r = Math.floor(r);
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r * cols + c] = g;
  };
  const text = (c: number, r: number, s: string) => [...s].forEach((g, i) => g !== " " && put(c + i, r, g));
  const angle = (c: number, r: number) => Math.atan2((c - CX) / RX, (r - YC) / RY); // 0 straight down, east positive

  // The face of the quadrants, cell by cell: its angle round the arc, the
  // span of angles its corners cover, and whether an hour line crosses it.
  const face: FaceCell[] = [];
  for (let r = Math.floor(YC); r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = Math.hypot((c + 0.5 - CX) / RX, (r + 0.5 - YC) / RY);
      if (e >= 1 || e <= INNER) continue;
      const corners = [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]].map(([x, y]) => angle(x, y));
      const lo = Math.min(...corners), hi = Math.max(...corners);
      const hour = Math.floor(hi / (Math.PI / 12)) !== Math.floor(lo / (Math.PI / 12));
      face.push([r * cols + c, angle(c + 0.5, r + 0.5), lo, hi, hour]);
    }
  }
  // The gnomon's half width on row r, and the least angle of the face that
  // shows beside its foot.
  const half = (r: number) => 0.6 + ((FOOT - 0.6) * (r - APEX)) / (GROUND - 1 - APEX);
  let hidden = Math.PI / 2;
  for (const [k, psi] of face) {
    const r = Math.floor(k / cols), c = k % cols;
    if (c < Math.floor(CX - half(r)) || c > Math.floor(CX + half(r))) hidden = Math.min(hidden, Math.abs(psi));
  }

  // The outer rim of the face, traced as a line: one cell a row where it
  // stands upright, otherwise each cell takes the glyph for the slope and
  // height of the arc inside it, and only one cell a row takes a slant.
  const rim = new Map<number, string>();
  const UP = 0.22; // how far down the rim stands upright, as a share of its depth
  for (let r = Math.ceil(YC - 0.5); (r + 0.5 - YC) / RY < UP; r++) {
    const w = RX * Math.sqrt(1 - ((r + 0.5 - YC) / RY) ** 2);
    rim.set(r * cols + Math.floor(CX - w), "|"), rim.set(r * cols + Math.floor(CX + w), "|");
  }
  const acc = new Map<number, Tally>();
  for (let i = 0; i <= 1200; i++) {
    const p = ((i / 1200) * 2 - 1) * (Math.PI / 2);
    const x = CX + RX * Math.sin(p), y = YC + RY * Math.cos(p);
    if ((Math.floor(y) + 0.5 - YC) / RY < UP) continue;
    const k = Math.floor(y) * cols + Math.floor(x);
    const e = acc.get(k) || [0, 0, 0, p < 0];
    (e[0] += 1), (e[1] += y - Math.floor(y)), (e[2] += Math.atan2(2 * RY * Math.abs(Math.sin(p)), RX * Math.cos(p)));
    acc.set(k, e);
  }
  const most = new Map<number, number>(); // the fullest steep cell on each row and side
  for (const [k, [n, , phi, west]] of acc) {
    const id = Math.floor(k / cols) * 2 + (west ? 0 : 1);
    if (phi / n > 1.08 && n > (acc.get(most.get(id) as number)?.[0] ?? 0)) most.set(id, k);
  }
  for (const [k, [n, fy, phi, west]] of acc) {
    const s = most.get(Math.floor(k / cols) * 2 + (west ? 0 : 1));
    if (s === k) rim.set(k, west ? "\\" : "/");
    else if (s === undefined || n > acc.get(s)![0] * 0.7) rim.set(k, fy / n < 0.4 ? "'" : fy / n > 0.6 ? (phi / n > 0.2 ? "." : "_") : "-");
  }

  // Everything but the face's light and the sky, drawn once a minute.
  const base: string[] = new Array(cols * rows);
  const draw = (H: number | null) => {
    grid.fill(" ");
    // The face: lit marble with an hour line every fifteen degrees, and in
    // daylight the gnomon's shadow from its foot out to the hour angle on
    // the side away from the sun, its edge drawn hard. Near noon the edge
    // would fall behind the gnomon, so it is drawn against its foot.
    const edge = H === null ? null : Math.sign(H || -1) * Math.max(Math.abs(H), hidden);
    for (const [k, psi, lo, hi, hour] of face) {
      let g = hour ? ":" : "·";
      if (H !== null) {
        const d = (hi - lo) / 2; // a soft fringe either side of the edge
        if (lo <= edge! && edge! <= hi) g = "█";
        else if (lo - d <= edge! && edge! <= hi + d) g = "▓";
        else if (psi * H >= 0 && Math.abs(psi) <= Math.abs(H)) g = "▒";
      }
      grid[k] = g;
    }
    for (const [k, g] of rim) grid[k] = g;
    // Hour numbers just inside the face, morning on the west quadrant.
    for (let h = -6; h <= 6; h++) {
      if (!h) continue;
      const p = (h * Math.PI) / 12, s = String(h < 0 ? 12 + h : h);
      text(Math.round(CX + RX * (INNER - 0.09) * Math.sin(p) - s.length / 2), YC + RY * (INNER - 0.12) * Math.cos(p), s);
    }
    // The end walls the quadrants' tips stand on, and arches in the masonry.
    for (const s of [-1, 1]) {
      const wall = Math.floor(CX + s * RX);
      for (let r = Math.floor(YC); r < GROUND; r++) put(wall, r, "|");
      put(wall, Math.floor(YC) - 1, "_");
      for (let c = 1; c < RX * (1 - INNER) - 0.5; c++) put(wall - s * c, Math.floor(YC) - 1, "_");
      for (const dx of [16, 21]) text(Math.floor(CX + s * dx) - 1, GROUND - 2, "╭─╮"), text(Math.floor(CX + s * dx) - 1, GROUND - 1, "│ │");
    }
    for (let c = 0; c < cols; c++) put(c, GROUND, "▀");
    // The gnomon in front, narrowing as it climbs away: its stairs up the
    // middle between two rails, and the chhatri on top.
    for (let r = APEX; r < GROUND; r++) {
      const w = half(r);
      for (let c = Math.ceil(CX - w); c < CX + w; c++) put(c, r, "=");
      put(CX - w, r, "/"), put(CX + w, r, "\\");
      if (w > 2) put(CX - w + 1, r, "|"), put(CX + w - 1, r, "|");
    }
    text(Math.floor(CX) - 1, APEX - 2, "▗█▖");
    text(Math.floor(CX) - 1, APEX - 1, "│ │");
    base.splice(0, base.length, ...grid);
  };

  const rand = mulberry32(5);
  const stars = Array.from({ length: 22 }, (): [number, number, number] => [(rand() * cols) | 0, (rand() * 8) | 0, rand() * 6]);
  let key = -1;
  let H: number | null = null;
  return (t) => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const day = (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 864e5;
    const minute = Math.floor(hours * 60);
    if (minute !== key) {
      key = minute;
      // The hour angle, 15 degrees an hour from noon, and whether the sun
      // is up at Jaipur's latitude on this day of the year.
      const h = ((hours - 12) * 15 * Math.PI) / 180;
      const dec = (-23.44 * Math.PI * Math.cos((2 * Math.PI * (day + 10)) / 365)) / 180;
      const up = Math.cos(dec) * Math.cos(h) * Math.cos(LAT) + Math.sin(dec) * Math.sin(LAT) > 0;
      H = up ? Math.max(-Math.PI / 2, Math.min(Math.PI / 2, h)) : null;
      draw(H);
    }
    const out = base.slice();
    const sky = (c: number, r: number, g: string) => {
      c = Math.floor(c), r = Math.floor(r);
      if (c >= 0 && c < cols && r >= 0 && r < rows && out[r * cols + c] === " ") out[r * cols + c] = g;
    };
    if (H === null) {
      for (const [c, r, ph] of stars) sky(c, r, Math.sin(t * 1.4 + ph) > 0.5 ? "+" : "·");
    } else {
      // The sun on its arc across the sky, east to the right, its rays
      // flickering between upright, all round and slanted.
      const x = CX - 24 * Math.sin(H), y = 1.5 + 4 * (1 - Math.cos(H));
      sky(x, y, "O"), sky(x - 1, y, "("), sky(x + 1, y, ")");
      const step = Math.floor(t / 0.45) % 4;
      const rays: [number, number, string][][] = [[[0, -1, "|"], [0, 1, "|"], [-3, 0, "-"], [3, 0, "-"]], [[-2, -1, "\\"], [2, -1, "/"], [-2, 1, "/"], [2, 1, "\\"]]];
      for (const [dx, dy, g] of step === 0 ? rays[0] : step === 2 ? rays[1] : [...rays[0], ...rays[1]]) sky(x + dx, y + dy, g);
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
