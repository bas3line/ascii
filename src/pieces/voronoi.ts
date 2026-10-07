/*
 * voronoi: the plane split into cells, each the ground nearest one drifting
 * seed. Every border is a straight edge, drawn one stroke thick.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "voronoi",
  category: "generative",
  note: "cells of ground nearest each drifting seed",
  cols: 64,
  rows: 22,
  fps: 15,
} satisfies Meta;

const CW = 0.6, RH = 1.2; // a character cell, in ems
const PERIOD = 30; // seconds for every seed to come back round

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function voronoi(): Frame {
  const { cols, rows } = meta;
  const X = cols * CW, Y = rows * RH;
  // Homes on a staggered grid of 4, 5 and 4; each seed circles its home a
  // whole number of times a period, so the loop closes.
  const rand = mulberry32(7);
  const seeds: { hx: number; hy: number; r: number; turns: number; p: number }[] = [];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  [4, 5, 4].forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      const hx = ((i + 0.5 + (rand() - 0.5) * 0.5) / n) * X, hy = ((row + 0.5 + (rand() - 0.5) * 0.4) / 3) * Y;
      const r = 2.2 + rand() * 1.4;
      seeds.push({
        hx: clamp(hx, r + 1, X - r - 1),
        hy: clamp(hy, 0.8 * r + 0.8, Y - 0.8 * r - 0.8),
        r,
        turns: (rand() < 0.5 ? 1 : -1) * (1 + Math.floor(rand() * 2)),
        p: rand() * 6.283,
      });
    }
  });
  const N = seeds.length;
  const sx = new Float64Array(N), sy = new Float64Array(N);
  const grid: string[] = new Array(cols * rows);

  // The cell of seed i: the frame clipped by the half plane nearer i than j,
  // for every j. Each vertex remembers which neighbour made the edge after it.
  const cell = (i: number) => {
    let poly: [number, number, number][] = [[0, 0, -1], [X, 0, -1], [X, Y, -1], [0, Y, -1]];
    for (let j = 0; j < N && poly.length; j++) {
      if (j === i) continue;
      const nx = sx[j] - sx[i], ny = sy[j] - sy[i];
      const c = (nx * (sx[i] + sx[j])) / 2 + (ny * (sy[i] + sy[j])) / 2;
      const out: [number, number, number][] = [];
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k], b = poly[(k + 1) % poly.length];
        const da = a[0] * nx + a[1] * ny - c, db = b[0] * nx + b[1] * ny - c;
        if (da <= 0) out.push(a);
        if ((da <= 0) !== (db <= 0)) {
          const f = da / (da - db);
          out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, da <= 0 ? j : a[2]]);
        }
      }
      poly = out;
    }
    return poly;
  };

  const put = (c: number, r: number, ch: string) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r * cols + c] = ch;
  };
  // An edge in cell units. Steep ones get a stroke a row, | or a slash where
  // they step a column; flat ones a stroke a column, _ or a slash where they
  // step a row, so the line never doubles or breaks.
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    if (Math.abs(x1 - x0) <= Math.abs(y1 - y0)) {
      if (y1 < y0) [x0, y0, x1, y1] = [x1, y1, x0, y0];
      const k = (x1 - x0) / (y1 - y0);
      for (let r = Math.ceil(y0 - 0.5); r + 0.5 <= y1; r++) {
        const xa = x0 + k * (r - y0), xb = x0 + k * (r + 1 - y0);
        const ch = Math.floor(xa) === Math.floor(xb) ? "|" : k > 0 ? "\\" : "/";
        put(Math.floor(x0 + k * (r + 0.5 - y0)), r, ch);
      }
    } else {
      if (x1 < x0) [x0, y0, x1, y1] = [x1, y1, x0, y0];
      const k = (y1 - y0) / (x1 - x0);
      const first = Math.ceil(x0 - 0.5);
      for (let c = first; c + 0.5 <= x1; c++) {
        // The end columns take the level of the corner they run into.
        const la = Math.round(c === first ? y0 : y0 + k * (c - x0));
        const lb = Math.round(c + 1.5 > x1 ? y1 : y0 + k * (c + 1 - x0));
        if (la === lb) put(c, la - 1, "_");
        else if (lb < la) put(c, lb, "/");
        else put(c, la, "\\");
      }
    }
  };

  return (t, { paper = false } = {}) => {
    const a = (2 * Math.PI * t) / PERIOD;
    seeds.forEach((s, i) => {
      sx[i] = s.hx + s.r * Math.cos(s.turns * a + s.p);
      sy[i] = s.hy + s.r * 0.8 * Math.sin(s.turns * a + s.p);
    });

    // Shade each cell by how far it is from its seed toward the border:
    // 0 at the seed, 1 on the border.
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const px = (c + 0.5) * CW, py = (r + 0.5) * RH;
        let d1 = Infinity, d2 = Infinity;
        for (let i = 0; i < N; i++) {
          const d = (px - sx[i]) ** 2 + (py - sy[i]) ** 2;
          if (d < d1) (d2 = d1), (d1 = d);
          else if (d < d2) d2 = d;
        }
        const f = Math.sqrt(d1 / d2);
        // On paper the light is the ground, so the seed is clear and the rim
        // takes the tone, stopping short of the border.
        const lv = paper ? (f < 0.45 ? 0 : f < 0.62 ? 1 : f < 0.84 ? 2 : 0) : f < 0.22 ? 3 : f < 0.42 ? 2 : f < 0.62 ? 1 : 0;
        grid[r * cols + c] = lv === 3 ? ":" : lv === 2 || (lv === 1 && (r + c) % 2) ? "·" : " ";
      }

    const corners: [number, number, number][] = [];
    for (let i = 0; i < N; i++) {
      const poly = cell(i);
      for (let k = 0; k < poly.length; k++) {
        const p = poly[k], q = poly[(k + 1) % poly.length];
        const j = p[2];
        if (j > i) edge(p[0] / CW, p[1] / RH, q[0] / CW, q[1] / RH);
        // A corner between two seed edges, inside the frame, is a junction.
        const prev = poly[(k + poly.length - 1) % poly.length][2];
        if (j >= 0 && prev >= 0 && i < j && i < prev) corners.push(p);
      }
    }
    // On the row a flat edge's _ would take, so flat edges run into it.
    for (const [x, y] of corners) put(Math.floor(x / CW), Math.round(y / RH) - 1, "+");
    // Each seed, with the shading cleared either side so it stands alone.
    for (let i = 0; i < N; i++) {
      const c = Math.floor(sx[i] / CW), r = Math.floor(sy[i] / RH);
      for (const d of [-1, 1]) if (":·".includes(grid[r * cols + c + d])) put(c + d, r, " ");
      put(c, r, "@");
    }

    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
