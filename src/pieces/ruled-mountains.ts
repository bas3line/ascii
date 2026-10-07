/*
 * ruled-mountains: ruled lines with a range rising out of their middle, drawn
 * in the three strokes ASCII mountains use, _ / \. Each line hides what it
 * rises over, and the peaks drift slowly from the back lines to the front.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ruled mountains",
  category: "nature",
  note: "ruled lines with a range rising from them, drifting forward",
  cols: 64,
  rows: 20,
  fps: 10,
} satisfies Meta;

const N = 6; // ruled lines, back to front
const GAP = 3; // rows between neighbouring lines
const AMP = [5, 5.5, 6, 6.6, 7.2, 8]; // the tallest peak on each line, in rows: nearer stands taller
const SPEED = 0.2; // lines a second the peaks come forward
const START = 30; // seconds into the drift where t = 0 falls
const SLIVER = 3; // a line seen for fewer cells than this between nearer peaks is left out

// Each peak keeps to its lane, so the range stays balanced: [lane, in columns
// from the middle, how far it wanders, its height against the line's tallest,
// rows of steep flank west and east before it eases to a shoulder, and where a
// lesser summit sits on its flank, 0 for none]. The rest set its wandering.
const PEAKS: [number, number, number, number, number, number, number, number, number, number][] = [
  [-16, 3, 0.55, 2, 1, 0, 0.71, 0.4, 0.93, 1.9],
  [-5, 3, 0.85, 3, 2, -4, 0.53, 2.6, 1.21, 4.1],
  [6, 3, 1, 2, 4, 5, 0.97, 4.4, 0.67, 0.3],
  [18, 3, 0.6, 3, 2, 0, 0.61, 1.2, 1.07, 5.2],
];

export default function ruledMountains(): Frame {
  const { cols, rows } = meta;
  const mid = cols / 2;
  const base = Array.from({ length: N }, (_, i) => rows - 1 - (N - 1 - i) * GAP);
  const f = new Float64Array(cols + 1);
  const e = new Int16Array(cols + 1);
  const g = Array.from({ length: rows }, () => new Array<string>(cols));
  const owner = Array.from({ length: rows }, () => new Int8Array(cols));
  const horizon = new Int16Array(cols);
  const seen = new Int16Array(cols);

  // A peak's height at distance d from its summit: a row a column down its
  // steep upper flank, then half that, a _/ shoulder, to the foot.
  const tent = (h: number, d: number, steep: number) => h - (d < steep ? d : steep + (d - steep) / 2);

  // Whole-row heights along a line at column edges, the shape the peaks take
  // at drift s, all of them under one envelope.
  const profile = (s: number, amp: number) => {
    f.fill(0);
    for (const [lane, wander, tall, west, east, sub, fm, pm, fa, pa] of PEAKS) {
      const m = mid + lane + wander * Math.sin(fm * s + pm);
      const h = amp * tall * (0.55 + 0.45 * Math.sin(fa * s + pa));
      for (let x = 0; x <= cols; x++) {
        const d = x - m;
        let y = tent(h, Math.abs(d), d < 0 ? west : east);
        if (sub) y = Math.max(y, tent(h - 2, Math.abs(d - sub), 1.5));
        if (y > f[x]) f[x] = y;
      }
    }
    for (let x = 0; x <= cols; x++) e[x] = Math.max(0, Math.round(f[x]));
  };

  return (t, { paper = false } = {}) => {
    // Stipple is ink: on a light page it marks the shaded east flanks, on a
    // dark one the lit west flanks.
    const shade = paper ? -1 : 1;
    for (const row of g) row.fill(" ");
    for (const row of owner) row.fill(-1);
    horizon.fill(rows);
    // Front to back, so each line only draws where nothing nearer has.
    for (let i = N - 1; i >= 0; i--) {
      const R = base[i];
      // Line i takes the shape line i - 1 had 1 / SPEED seconds ago.
      profile((i - (START + t) * SPEED) * 0.9, AMP[i]);
      // Where this line shows over everything nearer, column by column.
      for (let c = 0; c < cols; c++) {
        const a = e[c], b = e[c + 1];
        const r = R - Math.max(a, b) + (a === b ? 0 : 1);
        seen[c] = r >= 0 && r < horizon[c] ? r : -1;
      }
      for (let c = 0; c < cols; c++) {
        const r = seen[c];
        if (r < 0) continue;
        let n = c, m = c;
        while (n > 0 && seen[n - 1] >= 0) n--;
        while (m < cols - 1 && seen[m + 1] >= 0) m++;
        const a = e[c], b = e[c + 1], below = horizon[c];
        const ch = b > a ? "/" : b < a ? "\\" : "_";
        horizon[c] = r;
        // A sliver of line between nearer peaks reads as a stray mark, and a
        // slope pressed against a nearer line's stroke as one doubled line.
        if (m - n + 1 < SLIVER && n > 0 && m < cols - 1) continue;
        if (ch !== "_" && (owner[r][c - 1] > i || owner[r][c + 1] > i)) continue;
        if (ch !== "_" && [c - 2, c + 2].some((k) => owner[r][k] > i && g[r][k] === ch)) continue;
        g[r][c] = ch;
        owner[r][c] = i;
        if (Math.sign(b - a) === shade) for (let k = r + 1; k <= R && k < below; k++) g[k][c] = ".";
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
