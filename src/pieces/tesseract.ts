/*
 * tesseract: a 4D hypercube turning in the xw and yz planes, projected 4D to
 * 3D to 2D. All 32 edges are drawn: solid on the side toward the 4D eye, dotted
 * on the far side, so the two cubes can be followed as they pass through.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "tesseract",
  category: "shapes",
  note: "a 4d hypercube turning, its cubes passing through each other",
  cols: 54,
  rows: 28,
  fps: 30,
} satisfies Meta;

// Rows per column at which a line changes style: flat, shallow, diagonal,
// steep, upright. A slope near a boundary keeps the style it had last frame.
const LIMITS = [0.2, 0.38, 1, 2.1];

// Draws a to b (cells: x across, y down) one glyph per column when shallow and
// one per row when steep, each glyph picked from where the line crosses its
// cell, so a run reads as one stroke. Returns the style used.
function stroke(ax: number, ay: number, bx: number, by: number, mode: number, put: (c: number, r: number, ch: string, k: number) => void): number {
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

export default function tesseract(): Frame {
  const { cols, rows } = meta;
  const V: number[][] = [];
  for (let i = 0; i < 16; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  // Edges join vertices that differ in one coordinate.
  const E: [number, number][] = [];
  for (let i = 0; i < 16; i++) for (let b = 1; b < 16; b <<= 1) if (!(i & b)) E.push([i, i | b]);
  const W = 3; // 4D eye to centre
  const D = 7; // 3D eye to centre
  const ASPECT = 0.5;
  const tilt = [Math.cos(0.5), Math.sin(0.5), Math.cos(0.32), Math.sin(0.32)];
  // A quarter turn maps the hypercube onto itself, so the motion repeats
  // after a quarter turn in yz, which is a whole turn in xw.
  const YZ = 0.0875, LOOP = Math.PI / 2 / YZ;
  const angles = (t: number): [number, number] => [0.4 + t * 4 * YZ, 0.2 + t * YZ];

  // 4D point to [x, y, z, w] in camera space, before the screen scale.
  const place = (p: number[], ca: number, sa: number, cb: number, sb: number, o: number[]) => {
    const x = p[0] * ca - p[3] * sa, w = p[0] * sa + p[3] * ca;
    const y = p[1] * cb - p[2] * sb, z = p[1] * sb + p[2] * cb;
    const f = W / (W - w);
    const X = x * f, Y = y * f, Z = z * f;
    // A fixed view from up and to the side, so the cubes read as solids.
    const X1 = X * tilt[0] + Z * tilt[1], Z1 = -X * tilt[1] + Z * tilt[0];
    o[0] = X1;
    o[1] = Y * tilt[2] - Z1 * tilt[3];
    o[2] = Y * tilt[3] + Z1 * tilt[2];
    o[3] = w;
  };
  // Each vertex as seen, before the screen scale, measured from the mean of
  // them all, so the picture stays centred as the near cube swings out.
  const R = V.map(() => [0, 0, 0, 0]);
  const P = V.map(() => [0, 0]);
  const view = (t: number) => {
    const [a, b] = angles(t);
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    let mx = 0, my = 0;
    for (let i = 0; i < 16; i++) {
      place(V[i], ca, sa, cb, sb, R[i]);
      mx += (P[i][0] = R[i][0] / (D - R[i][2])) / 16;
      my += (P[i][1] = R[i][1] / (D - R[i][2])) / 16;
    }
    for (const p of P) { p[0] -= mx; p[1] -= my; }
  };
  // Size the picture from the widest it gets over one loop of the motion.
  let ex = 0, ey = 0;
  for (let t = 0; t < LOOP; t += 0.03) {
    view(t);
    for (const p of P) { ex = Math.max(ex, Math.abs(p[0])); ey = Math.max(ey, Math.abs(p[1])); }
  }
  const K = Math.min((cols - 2) / 2 / ex, (rows - 1) / 2 / ASPECT / ey);

  const out: string[] = new Array(cols * rows);
  const S = V.map(() => [0, 0]);
  const style = new Int8Array(E.length).fill(-1);
  const solid = new Uint8Array(E.length + 16).fill(2); // 2 until first decided
  // Toward the 4D eye is solid; a band around w = 0 keeps the last choice.
  const weigh = (k: number, w: number): number => {
    if (solid[k] === 2 || Math.abs(w) > 0.12) solid[k] = w >= 0 ? 1 : 0;
    return solid[k];
  };
  const clear = (c: number, r: number): boolean => out[c + r * cols] === " " && (c === 0 || out[c - 1 + r * cols] === " ") &&
    (c === cols - 1 || out[c + 1 + r * cols] === " ");

  return (t) => {
    view(t);
    out.fill(" ");
    for (let i = 0; i < 16; i++) {
      // Edges start halfway to the vertex's cell centre, so they meet its mark.
      const x = cols / 2 + K * P[i][0], y = rows / 2 - K * ASPECT * P[i][1];
      S[i][0] = (x + Math.floor(x) + 0.5) / 2;
      S[i][1] = (y + Math.floor(y) + 0.5) / 2;
    }
    // The solid half first; the dotted half then keeps clear of it.
    for (const pass of [1, 0]) {
      for (let i = 0; i < 16; i++) {
        if (weigh(E.length + i, R[i][3]) !== pass) continue;
        const c = Math.floor(S[i][0]), r = Math.floor(S[i][1]);
        if (c >= 0 && c < cols && r >= 0 && r < rows && (pass || clear(c, r))) out[c + r * cols] = pass ? "o" : "+";
      }
      E.forEach(([i, j], e) => {
        if (weigh(e, (R[i][3] + R[j][3]) / 2) !== pass) return;
        style[e] = stroke(S[i][0], S[i][1], S[j][0], S[j][1], style[e], (c, r, ch, k) => {
          if (c < 0 || c >= cols || r < 0 || r >= rows || out[c + r * cols] !== " ") return;
          if (pass || k % 3 !== 2) out[c + r * cols] = ch;
        });
      });
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
