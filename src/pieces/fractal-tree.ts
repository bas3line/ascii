/*
 * fractal tree: a trunk that forks, and forks again, seven times over, each
 * limb a little shorter than its parent, the outer twigs gathered into lobes
 * of leaves lit from the upper left. Wind bends every limb, the tips most.
 */
import type { Frame, Meta } from "../types.ts";

export interface FractalTreeOptions {
  [key: string]: unknown;
  seed: number;
}

export const meta = {
  name: "fractal tree",
  category: "nature",
  note: "a recursive branching tree swaying in the wind",
  cols: 60,
  rows: 24,
  fps: 15,
  options: { seed: 4 },
} satisfies Meta<FractalTreeOptions>;

const DEPTH = 7;
const LOBE = 6; // each limb this deep carries a lobe of leaves over its twigs
const LEAF = " .:oO"; // leaves in shadow to leaves in light
const LOOP = 12; // seconds; every wind term repeats within it
const TAU = Math.PI * 2;
const MAX_LEAN = 1.1; // no limb leans further than this from upright, in radians

const mulberry32 = (a: number) => (): number => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (x: number, y: number): number => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

interface Limb {
  parent: number;
  depth: number;
  turn: number;
  len: number;
}

interface Lobe {
  twigs: number[];
  ph: number;
  bump: number;
}

export default function fractalTree({ seed = 4 }: Partial<FractalTreeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(seed);
  const GROUND = rows - 1; // the row the trunk stands on
  const FORK = 15; // the row the trunk first forks at
  const X0 = cols / 2 - 0.5;

  // The limbs, parents before children: depth, turn from the parent, length
  // (in columns; a row is two). The first forks are the widest.
  const limbs: Limb[] = [];
  const grow = (parent: number, depth: number, len: number): void => {
    for (const side of [-1, 1]) {
      const spread = (depth === 1 ? 0.58 : depth === 2 ? 0.48 : 0.4 + rand() * 0.14) * side + (rand() - 0.5) * 0.12;
      const i = limbs.push({ parent, depth, turn: spread, len: len * (0.92 + rand() * 0.16) }) - 1;
      if (depth < DEPTH) grow(i, depth + 1, len * 0.84);
    }
  };
  grow(-1, 1, 6);
  // A lobe is the twigs above one limb: it sits over their ends.
  const lobes: Lobe[] = [];
  limbs.forEach((l, i) => {
    if (l.depth !== LOBE) return;
    const twigs = [i];
    for (let j = i + 1; j < limbs.length && limbs[j].depth > LOBE; j++) twigs.push(j);
    lobes.push({ twigs, ph: rand() * TAU, bump: 0.12 + rand() * 0.1 });
  });

  const ink: string[] = new Array(cols * rows);
  const depthAt = new Uint8Array(cols * rows);
  const shade = new Float32Array(cols * rows);
  const inner = new Float32Array(cols * rows); // how far inside the crown
  const px = new Float32Array(limbs.length), py = new Float32Array(limbs.length), pa = new Float32Array(limbs.length);
  const put = (c: number, r: number, ch: string, d: number) => {
    if (c < 0 || c >= cols || r < 0 || r >= rows) return;
    const k = c + r * cols;
    if (depthAt[k] && depthAt[k] <= d) return;
    depthAt[k] = d;
    ink[k] = ch;
  };

  // A limb, one cell a row where the line crosses the middle of the row, in
  // a glyph by its slant. A shallow limb steps with underscores between rows;
  // a thick one has a heavy core on its inner side.
  const stroke = (x0: number, y0: number, x1: number, y1: number, depth: number) => {
    const s = (x1 - x0) / (y0 - y1); // columns a row, rightward going up
    const ch = Math.abs(s) < 0.42 ? "|" : s > 0 ? "/" : "\\";
    const rTop = Math.round(y1), rBot = Math.round(y0) - 1;
    let last: number | null = null;
    for (let r = rBot; r >= rTop; r--) {
      const c = Math.floor(x0 + s * (y0 - (r + 0.5)));
      put(c, r, ch, depth + 1);
      if (depth === 1) put(c - Math.sign(s || 1), r, "#", depth + 1);
      if (last !== null) for (let b = Math.min(c, last) + 1; b < Math.max(c, last); b++) put(s > 0 ? b - 1 : b + 1, r + 1, "_", depth + 1);
      last = c;
    }
  };

  return (t, { paper = false } = {}) => {
    ink.fill(" ");
    depthAt.fill(0);
    shade.fill(-1);
    inner.fill(0);
    // The wind: a slow sway, a quicker shiver and a gust, all within LOOP,
    // reaching each limb a moment after its parent.
    const wind = (u: number) => 0.65 * Math.sin((TAU * u) / 6) + 0.25 * Math.sin((TAU * u) / 2.4 + 1) + 0.2 * Math.sin((TAU * u) / LOOP) ** 3;
    // The trunk: two cells of heartwood between its edges, flaring into
    // roots at the foot.
    for (let r = FORK; r <= GROUND; r++) {
      const c = Math.round(X0 - 1), flare = Math.max(0, r - GROUND + 2);
      for (let i = -flare; i < 2 + flare; i++) put(c + i, r, "#", 1);
      put(c - 1 - flare, r, flare ? "/" : "|", 1);
      put(c + 2 + flare, r, flare ? "\\" : "|", 1);
    }
    for (let i = 0; i < limbs.length; i++) {
      const l = limbs[i];
      const bend = (0.02 + 0.035 * l.depth) * (0.25 + wind(t - l.depth * 0.12));
      let x: number, y: number, a: number;
      if (l.parent < 0) [x, y, a] = [X0 + 0.5, FORK + 0.5, 0];
      else [x, y, a] = [px[l.parent], py[l.parent], pa[l.parent]];
      // Limbs reach for the light: each turns a little back toward upright.
      a = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, a * (l.depth > 2 ? 0.85 : 1) + l.turn + bend));
      const x1 = x + Math.sin(a) * l.len, y1 = y - (Math.cos(a) * l.len) / 2;
      if (l.depth < LOBE + 1) stroke(x, y, x1, y1, l.depth);
      px[i] = x1;
      py[i] = y1;
      pa[i] = a;
    }
    // The lobes, highest first, so each lower one stands in front of the
    // shaded underside of the one above it. The light falls on the crown as
    // a whole from the upper left, and on each lobe the same way.
    let x0 = cols, x1 = 0, y0 = rows, y1 = 0;
    for (const b of lobes) for (const j of b.twigs) (x0 = Math.min(x0, px[j])), (x1 = Math.max(x1, px[j])), (y0 = Math.min(y0, py[j])), (y1 = Math.max(y1, py[j]));
    const gx = (x0 + x1) / 2, gy = (y0 + y1) / 2, grx = (x1 - x0) / 2 + 3, gry = (y1 - y0) / 2 + 1.5;
    const order = lobes.map((b) => {
      // Over the twigs' ends and the fork they spring from.
      const p = limbs[b.twigs[0]].parent, ends = b.twigs.map((j) => [px[j], py[j]]).concat([[px[p], py[p]]]);
      let sx = 0, sy = 0, wx = 0, wy = 0;
      for (const [x, y] of ends) (sx += x), (sy += y);
      const cx = sx / ends.length, cy = sy / ends.length;
      for (const [x, y] of ends) (wx = Math.max(wx, Math.abs(x - cx))), (wy = Math.max(wy, Math.abs(y - cy)));
      return { b, cx, cy: cy - 0.4, rx: 1.8 + wx * 0.9, ry: 1.0 + wy * 0.9 };
    }).sort((p, q) => p.cy - q.cy);
    for (const { b, cx, cy, rx, ry } of order)
      for (let r = Math.floor(cy - ry - 1); r <= cy + ry + 1; r++)
        for (let c = Math.floor(cx - rx - 1); c <= cx + rx + 1; c++) {
          if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
          const nx = (c + 0.5 - cx) / rx, ny = (r + 0.5 - cy) / ry;
          const edge = 1 + b.bump * Math.sin(Math.atan2(ny, nx) * 3 + b.ph + (TAU * t) / LOOP);
          const d2 = (nx * nx + ny * ny) / (edge * edge);
          if (d2 >= 1) continue;
          const gnx = (c + 0.5 - gx) / grx, gny = (r + 0.5 - gy) / gry;
          const k = c + r * cols;
          const v = 0.36 - 0.12 * gnx - 0.16 * gny - 0.24 * nx - 0.4 * ny + 0.16 * (hash(c, r) - 0.5);
          shade[k] = Math.max(0, Math.min(1, v));
          inner[k] = Math.max(inner[k], 1 - d2);
        }
    // Leaves hide the twigs; the main limbs show where the leaves are dark.
    // At the rim of the crown light shows between the leaves, on any page;
    // inside it, on paper, the shaded side takes the dense glyphs.
    for (let k = 0; k < cols * rows; k++) {
      const v = shade[k];
      if (v < 0 || (depthAt[k] && depthAt[k] <= 3) || (depthAt[k] === 4 && v < 0.45)) continue;
      const i = Math.min(2, Math.floor(v * 3));
      ink[k] = LEAF[inner[k] < 0.22 ? (v < 0.4 ? 1 : 2) : paper ? 4 - i : 2 + i];
    }
    // The ground either side of the roots.
    for (let c = 3; c < cols - 3; c++) if (ink[c + GROUND * cols] === " ") ink[c + GROUND * cols] = c < 6 || c > cols - 7 ? "." : "_";
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(ink.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
