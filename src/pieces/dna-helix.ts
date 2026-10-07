/*
 * dna-helix: a double helix seen side on, turning about its own axis. The near
 * half of each backbone is drawn heavy and the far half dotted, with base
 * pairs between them, and the grooves alternate wide and narrow as in B-DNA.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "dna helix",
  category: "shapes",
  note: "a double helix with base pairs, turning about its axis",
  cols: 64,
  rows: 15,
  fps: 20,
} satisfies Meta;

const A = 5; // radius in rows; a cell is twice as tall as it is wide
const PITCH = 42; // columns a turn
const K = (2 * Math.PI) / PITCH;
const GROOVE = 0.64 * Math.PI; // the second backbone trails the first by this, not by half a turn
const PAIR = 4; // columns between base pairs, ten and a half a turn
const SPEED = 0.5; // radians a second
const A0 = 2.2; // the angle at t = 0
const END = 3; // columns left clear at each end

export default function dnaHelix(): Frame {
  const { cols, rows } = meta;
  const g = new Array<string>(cols * rows);
  const depth = new Float64Array(cols * rows);
  const who = new Int8Array(cols * rows); // -1 empty, 0 a near backbone, 1 a far one, 2 a base pair
  const lo = END, hi = cols - 1 - END; // the molecule runs from column lo to hi
  const row = new Int16Array(cols), steep = new Int8Array(cols);

  // Backbone s at column x: its row, its depth from -1 behind the axis to 1 in
  // front, and the row of the crest it is nearest. Rows run down the page, so
  // this winds right-handed.
  const at = (x: number, s: number, a: number): [number, number, number] => {
    const th = K * (x - cols / 2) - a - s * GROOVE, c = Math.cos(th);
    return [rows / 2 + A * c, -Math.sin(th), rows / 2 + (c > 0 ? A : -A)];
  };

  return (t) => {
    const a = A0 + SPEED * t;
    g.fill(" ");
    depth.fill(-Infinity);
    who.fill(-1);
    const put = (col: number, r: number, z: number, ch: string, k: number) => {
      if (r < 0 || r >= rows || col < lo || col > hi) return;
      const i = r * cols + col;
      if (z <= depth[i]) return;
      g[i] = ch;
      depth[i] = z;
      who[i] = k;
    };

    // Base pairs first, each from one backbone to the other at the same place
    // on the axis: | in front of it, : behind. None in the last few columns,
    // so the ends thin out.
    for (let col = lo + 3 + (((hi - lo - 6) % PAIR) >> 1); col <= hi - 3; col += PAIR) {
      const [y0, z0] = at(col + 0.5, 0, a);
      const [y1, z1] = at(col + 0.5, 1, a);
      const r0 = Math.floor(Math.min(y0, y1)), r1 = Math.floor(Math.max(y0, y1));
      for (let r = r0 + 1; r < r1; r++) {
        const u = (r + 0.5 - y0) / (y1 - y0), z = z0 + u * (z1 - z0);
        put(col, r, z, z > 0 ? "|" : ":", 2);
      }
    }

    // Each column cuts each backbone once. Behind the axis it is a dot. In
    // front, a climbing stretch is / or \, two cells to a row, and the flat
    // top of a crest is a run of _ on the foot of the crest's row.
    for (let s = 0; s < 2; s++) {
      row.fill(-1);
      for (let col = lo; col <= hi; col++) {
        const [y, z, crest] = at(col + 0.5, s, a);
        const dy = at(col + 1, s, a)[0] - at(col, s, a)[0];
        row[col] = Math.floor(y);
        steep[col] = 0;
        const cap = Math.floor(crest - 0.25);
        if (z < -0.2) put(col, row[col], z, "·", 1);
        else if (Math.abs(dy) >= 0.3 && !(crest < y && row[col] === cap)) {
          steep[col] = dy > 0 ? 1 : -1;
          put(col, row[col], z + 0.5, dy > 0 ? "\\" : "/", 0);
        } else put(col, cap, z + 0.5, "_", 0);
      }
      // A climbing stretch alone in its row takes a second cell, on the side
      // where the line crosses the middle of the row.
      for (let col = lo; col <= hi; col++) {
        if (!steep[col] || row[col - 1] === row[col] || row[col + 1] === row[col]) continue;
        const [y, z] = at(col + 0.5, s, a);
        if (z < 0.3) continue;
        const side = (row[col] + 0.5 - y) * steep[col] > 0 ? 1 : -1;
        put(col + side, row[col], z + 0.5, steep[col] > 0 ? "\\" : "/", 0);
      }
    }

    // Behind a near backbone, the far one breaks for a cell all round.
    let out = "";
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        const i = r * cols + col;
        let ch = g[i];
        if (who[i] === 1) {
          for (let dc = -1; dc <= 1 && ch !== " "; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
              const j = (r + dr) * cols + col + dc;
              if (r + dr >= 0 && r + dr < rows && who[j] === 0 && depth[j] > 0.6) ch = " ";
            }
          }
        }
        line += ch;
      }
      out += line + (r < rows - 1 ? "\n" : "");
    }
    return out;
  };
}
