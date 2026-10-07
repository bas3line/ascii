/*
 * icosahedron: a wireframe icosahedron turning on two axes. Edges on the
 * near side are solid lines, the hidden ones behind are dotted.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "icosahedron",
  category: "shapes",
  note: "a wireframe icosahedron turning, its hidden edges dotted",
  cols: 46,
  rows: 22,
  fps: 30,
} satisfies Meta;

// Rows per column at which a line changes style: flat, shallow, diagonal,
// steep, upright. A slope near a boundary keeps the style it had last frame.
const LIMITS = [0.2, 0.38, 1, 2.1];

// Draws a to b (cells: x across, y down) one glyph per column when shallow and
// one per row when steep, each glyph picked from where the line crosses its
// cell, so a run reads as one stroke. Returns the style used.
function stroke(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  mode: number,
  put: (col: number, row: number, glyph: string, step: number) => void,
): number {
  if (bx < ax) [ax, ay, bx, by] = [bx, by, ax, ay];
  const dx = bx - ax, dy = by - ay;
  if (dx < 1e-6 && Math.abs(dy) < 1e-6) return mode;
  const q = Math.abs(dy) / Math.max(dx, 1e-6);
  if (!(mode >= 0 && q > (LIMITS[mode - 1] || 0) / 1.1 && q < (LIMITS[mode] || Infinity) * 1.1)) {
    mode = 0;
    while (mode < 4 && q >= LIMITS[mode]) mode++;
  }
  // put(col, row, glyph, step): step counts along the line in screen cells.
  if (mode < 2) {
    // Quarter or half row heights: _ at the foot of a cell, . low, - middle, ' high.
    const n = mode ? 4 : 2;
    const g = mode ? ["_", dy > 0 ? "`" : "'", "-", ".", "_"] : ["_", "-", "_"];
    for (let c = Math.ceil(ax - 0.5); c <= Math.floor(bx - 0.5); c++) {
      const y = ay + (dy * (c + 0.5 - ax)) / dx, r = Math.floor(y), i = Math.round((y - r) * n);
      put(c, i ? r : r - 1, g[i], c);
    }
  } else if (mode === 2) {
    // Corner to corner: _ where the line holds its row, / or \ where it changes.
    for (let X = Math.round(ax); X < Math.round(bx); X++) {
      const ya = Math.round(ay + (dy * (X - ax)) / dx), yb = Math.round(ay + (dy * (X + 1 - ax)) / dx);
      if (yb > ya) put(X, ya, "\\", X);
      else put(X, ya - 1, yb < ya ? "/" : "_", X);
    }
  } else {
    const ch = mode === 4 ? "|" : dy < 0 ? "/" : "\\";
    for (let r = Math.ceil(Math.min(ay, by) - 0.5); r <= Math.floor(Math.max(ay, by) - 0.5); r++) {
      put(Math.floor(ax + (dx * (r + 0.5 - ay)) / dy), r, ch, r);
    }
  }
  return mode;
}

export default function icosahedron(): Frame {
  const { cols, rows } = meta;
  const P = (1 + Math.sqrt(5)) / 2;
  const n = 1 / Math.hypot(1, P);
  const V: [number, number, number][] = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) V.push([0, a * n, b * P * n], [a * n, b * P * n, 0], [b * P * n, 0, a * n]);
  }
  // Edges join vertices one edge length (2n) apart; faces are triangles of edges.
  const near = (i: number, j: number) => Math.abs(Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]) - 2 * n) < 1e-6;
  const E: [number, number][] = [], F: [number, number, number][] = [];
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      if (!near(i, j)) continue;
      E.push([i, j]);
      for (let k = j + 1; k < 12; k++) if (near(i, k) && near(j, k)) F.push([i, j, k]);
    }
  }
  const EF = E.map(([i, j]) => F.flatMap((f, m) => (f.includes(i) && f.includes(j) ? [m] : [])));
  const VF = V.map((_, i) => F.flatMap((f, m) => (f.includes(i) ? [m] : [])));
  const D = 4; // eye to centre, in circumradii
  const ASPECT = 0.5;
  const K = Math.min((cols - 3) / 2, (rows - 2) / 2 / ASPECT) * Math.sqrt(D * D - 1);
  const out: string[] = new Array(cols * rows);
  const R = V.map(() => [0, 0, 0]);
  const S = V.map(() => [0, 0]);
  const seen = new Uint8Array(F.length);
  const style = new Int8Array(E.length).fill(-1);

  return (t) => {
    const A = 0.6 + t * 0.25;
    const B = 0.3 + t * 0.15;
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    out.fill(" ");
    for (let i = 0; i < 12; i++) {
      const [x, y, z] = V[i];
      const x1 = x * cB + z * sB, z1 = -x * sB + z * cB;
      const r = R[i];
      r[0] = x1;
      r[1] = y * cA - z1 * sA;
      r[2] = y * sA + z1 * cA;
      const f = K / (D - r[2]);
      // Edges start halfway to the vertex's cell centre, so they meet its mark.
      // The picture sits a little low so opposite vertices change row apart.
      const sx = cols / 2 + f * r[0], sy = rows / 2 + 0.3 - f * ASPECT * r[1];
      S[i][0] = (sx + Math.floor(sx) + 0.5) / 2;
      S[i][1] = (sy + Math.floor(sy) + 0.5) / 2;
    }
    // A face is in view when its outward normal (its centre, here) points to the eye.
    F.forEach((f, m) => {
      let cx = 0, cy = 0, cz = 0;
      for (const i of f) { cx += R[i][0]; cy += R[i][1]; cz += R[i][2]; }
      seen[m] = -cx * cx - cy * cy + cz * (3 * D - cz) > 0 ? 1 : 0;
    });
    // Visible edges first; hidden ones are dotted and stand clear of them.
    const clear = (c: number, r: number) => out[c + r * cols] === " " && (c === 0 || out[c - 1 + r * cols] === " ") &&
      (c === cols - 1 || out[c + 1 + r * cols] === " ");
    for (const pass of [1, 0]) {
      for (let i = 0; i < 12; i++) {
        if (VF[i].some((m) => seen[m]) !== !!pass) continue;
        const c = Math.floor(S[i][0]), r = Math.floor(S[i][1]);
        if (c >= 0 && c < cols && r >= 0 && r < rows && (pass || clear(c, r))) out[c + r * cols] = pass ? (R[i][2] > 0.45 ? "@" : "o") : "+";
      }
      E.forEach(([i, j], e) => {
        if ((seen[EF[e][0]] | seen[EF[e][1]]) !== pass) return;
        style[e] = stroke(S[i][0], S[i][1], S[j][0], S[j][1], style[e], (c, r, ch, k) => {
          if (c < 0 || c >= cols || r < 0 || r >= rows || out[c + r * cols] !== " ") return;
          if (pass || ((k & 1) === 0 && clear(c, r))) out[c + r * cols] = ch;
        });
      });
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
