/*
 * windmill: a Dutch smock mill on a low rise, its four lattice sails turning
 * in front of the cap, a stage round its waist and clouds drifting behind.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "windmill",
  category: "objects",
  note: "four lattice sails turning on a dutch mill, clouds passing",
  cols: 64,
  rows: 28,
  fps: 20,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const HX = 32, HY = 11.5; // the hub, column and row
const SAIL = 10.8; // a sail's reach from the hub, in rows
const WIDTH = 3; // the lattice's width
const LATH = 2.25; // between the laths
const FOOT = 1.8; // where the lattice starts along the stock
const PERIOD = 9; // seconds a turn
const TOP = 12, GROUND = 24.5; // the body's rows
const WT = 3.6, WB = 5.6; // its half width at the top and foot, in rows
const STAGE = 18; // the row of the stage round its waist
// Clouds: puffs as [x, y, radius] about an origin; row, speed in columns a second, start.
const CLOUDS: [[number, number, number][], number, number, number][] = [
  [[[0, 0, 1.6], [2.2, -0.9, 2.3], [4.7, -0.4, 2], [6.7, 0.2, 1.4]], 4.4, 1.1, 26],
  [[[0, 0, 1.3], [1.8, -0.6, 1.7], [3.5, 0, 1.3]], 2.4, 0.7, 64],
  [[[0, 0, 1.4], [2, -0.8, 2], [4.1, -0.5, 1.7], [5.8, 0.2, 1.2]], 17.4, 1.5, 84],
];

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
// The one glyph a straight stroke at this heading is drawn in: "/" and "\"
// climb a row a column, so a line much flatter than a row every two columns runs as "-".
const stroke = (a: number) => {
  const d = ((((a * 180) / Math.PI) % 180) + 180) % 180;
  return d < 40 || d >= 140 ? "-" : d < 76.7 ? "/" : d < 103.3 ? "|" : "\\";
};

export default function windmill(): Frame {
  const { cols, rows } = meta;
  const N = cols * rows;

  // The mill itself does not change: the body, cap, stage and the land.
  const still: (number | string | null)[] = new Array(N).fill(null);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c, x = (c + 0.5 - HX) / 2, y = r + 0.5;
      const g = GROUND;
      // The land: a level line, and grass thinning toward us.
      if (r === Math.floor(g)) {
        still[k] = hash(c, 9) < 0.12 ? "," : "_";
        continue;
      }
      if (r > g) {
        const h = hash(c, r), d = r - g + 0.5;
        still[k] = h < 0.2 / d ? "," : h < 0.32 / d ? "'" : h < 0.4 / d ? "." : " ";
        continue;
      }
      // The body: three faces of an octagon in boards, lit from the left.
      if (y > TOP && y < g) {
        const w = WT + ((WB - WT) * (y - TOP)) / (GROUND - TOP);
        if (Math.abs(x) < w) {
          const u = x / w;
          let v = u < -0.4 ? 0.8 : u < 0.4 ? 0.55 : 0.3;
          if (r % 2) v -= 0.08;
          if (Math.abs(x) < 0.8 && y > GROUND - 2.2) v = 0.08; // the door
          if (Math.abs(x + 0.2) < 0.4 && (r === TOP + 2 || r === STAGE + 2)) v = 0.08; // windows
          still[k] = v;
          continue;
        }
      }
      // The cap: a rounded hood over the top, lit from the upper left.
      const q = Math.hypot(x / (WT + 0.6), (y - TOP - 0.2) / 3.8);
      if (y <= TOP + 0.5 && q < 1) {
        const nx = x / (WT + 0.6), ny = (TOP + 0.2 - y) / 3.8, nz = Math.sqrt(Math.max(0, 1 - q * q));
        still[k] = 0.15 + 0.75 * Math.max(0, -0.5 * nx + 0.5 * ny + 0.7 * nz);
      }
    }
  // The stage: a deck on struts, a rail along it.
  const sw = WT + ((WB - WT) * (STAGE - TOP)) / (GROUND - TOP) + 1.8;
  for (let c = Math.round(HX - 2 * sw); c <= Math.round(HX + 2 * sw); c++) {
    still[STAGE * cols + c] = "=";
    still[(STAGE - 1) * cols + c] = (c - HX) % 2 === 0 ? "|" : "_";
  }
  still[(STAGE + 1) * cols + Math.round(HX - 2 * sw) + 1] = "\\";
  still[(STAGE + 1) * cols + Math.round(HX + 2 * sw) - 1] = "/";

  // The clouds: how much of each cell they cover, eight looks a cell, and how
  // lit they are there, as heaps of round puffs lit from above with flat undersides.
  const cover = new Float32Array(N), shade = new Float32Array(N);
  const clouds = (t: number) => {
    cover.fill(0);
    shade.fill(0);
    for (const [puffs, row, speed, start] of CLOUDS) {
      const span = cols + 36, ox = ((((start + speed * t) % span) + span) % span) - 22;
      for (let r = Math.floor(row - 4); r <= row + 1; r++)
        for (let c = Math.floor(ox - 6); c < ox + 22; c++) {
          if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
          const k = r * cols + c;
          for (let j = 0; j < 4; j++)
            for (let i = 0; i < 2; i++) {
              const px = (c + 0.25 + i * 0.5 - ox) / 2, py = r + 0.125 + j * 0.25 - row;
              if (py > 0.8) continue;
              let lit = -1;
              for (const [a, b, rad] of puffs) {
                const nx = (px - a) / rad, ny = (py - b) / rad, q = nx * nx + ny * ny;
                if (q < 1) lit = Math.max(lit, -0.3 * nx - 0.8 * ny + 0.5 * Math.sqrt(1 - q));
              }
              if (lit < -0.5) continue;
              cover[k] += 1 / 8;
              shade[k] = Math.max(shade[k], lit);
            }
        }
    }
  };

  return (t, { paper = false } = {}) => {
    const out: string[] = new Array(N).fill(" ");
    clouds(t);
    // Clouds: soft, brightest along their tops, a thin rim where they thin out.
    for (let k = 0; k < N; k++) {
      const f = cover[k];
      if (f < 0.2) continue;
      const v = f * (0.3 + 0.4 * shade[k]);
      out[k] = " .·:-"[Math.max(1, Math.min(4, Math.round(v * 5.5)))];
    }
    for (let k = 0; k < N; k++) {
      const v = still[k];
      if (v === null) continue;
      if (typeof v === "string") out[k] = v;
      else {
        const i = Math.max(1, Math.min(9, Math.round(v * 9)));
        out[k] = RAMP[paper ? 10 - i : i];
      }
    }

    // The sails: for each, a stock from the hub and a ladder of laths on its
    // trailing side, over a light fill of the lattice so it reads as a blade.
    const turn = (2 * Math.PI * t) / PERIOD; // square to the frame at the start
    const sails = [0, 1, 2, 3].map((i) => {
      const a = turn + (i * Math.PI) / 2, ax = Math.cos(a), ay = Math.sin(a);
      // A line takes one cell a row where it runs steep, one a column where it runs flat.
      const reachV = Math.abs(ay) > 2 * Math.abs(ax) ? 0.25 * Math.abs(ay) : 0.5 * Math.abs(ax);
      const reachU = Math.abs(ax) > 2 * Math.abs(ay) ? 0.25 * Math.abs(ax) : 0.5 * Math.abs(ay);
      return { ax, ay, reachV, reachU, edge: stroke(a), lath: stroke(a + Math.PI / 2) };
    });
    // On a line where the cell is as near one side as the other, the small bias picks one.
    const on = (d: number, reach: number) => Math.abs(d + 0.013) <= reach;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = (c - HX) / 2, y = HY - (r + 0.5);
        if (x * x + y * y > (SAIL + 1) ** 2) continue;
        let hit: string | null = null, rank = 0;
        for (const { ax, ay, reachV, reachU, edge, lath } of sails) {
          const u = x * ax + y * ay, v = x * ay - y * ax; // along the stock, and across to the lattice
          if (u < 0.6 || u > SAIL + 0.6 || v < -0.8 || v > WIDTH + 0.8) continue;
          let ch: string | null = null, k = 0;
          if (on(v, reachV) && u < SAIL + 0.3) (ch = "#"), (k = 4);
          else if (u > FOOT - 0.2 && u < SAIL + 0.3 && on(v - WIDTH, reachV)) (ch = edge), (k = 3);
          else if (v > 0.45 && v < WIDTH - 0.45 && u > FOOT - 0.5 && u < SAIL + 0.3) {
            const off = ((u - FOOT + LATH / 2) % LATH) - LATH / 2; // to the nearest lath
            if (on(off, reachU)) (ch = lath), (k = 2);
          }
          if (!ch) {
            // How much of the cell the lattice covers, from eight looks.
            let n = 0;
            for (let j = 0; j < 4; j++)
              for (let i = 0; i < 2; i++) {
                const px = x + (i - 0.5) * 0.25, py = y - (j - 1.5) * 0.25;
                const uu = px * ax + py * ay, vv = px * ay - py * ax;
                if (uu > FOOT && uu < SAIL && vv > 0 && vv < WIDTH) n++;
              }
            if (n >= 4) (ch = "."), (k = 1);
          }
          if (k > rank) (hit = ch), (rank = k);
        }
        if (hit) out[r * cols + c] = hit;
      }
    out[Math.floor(HY) * cols + HX - 1] = "(";
    out[Math.floor(HY) * cols + HX] = "@";
    out[Math.floor(HY) * cols + HX + 1] = ")";
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
