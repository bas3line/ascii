/*
 * landscape: three mountain ranges scrolling past under a seeded sky, the
 * near ones faster. Each range is noise() described, not worked out: ridged,
 * so many cells across, drifting left so fast, between these two rows, and
 * coming round every 16 seconds, so the piece loops exactly. Each column draws
 * the ridge from its left edge to its right as / \ or _, and blanks below so a
 * nearer range hides the ones behind it.
 */
import { piece } from "../../src/kit/index.ts";
import { noise, scatter } from "../../src/kit/math.ts";

const stars = scatter(24, { cols: 64, rows: 9 }, { seed: 4 });
const ranges = [4, 8, 12].map((speed, k) => noise({ kind: "ridged", size: 18 - 3 * k, drift: -speed, period: 16, range: [11 + 6 * k, 3 + 5 * k], seed: k }));

export default piece({ name: "landscape", note: "mountain ranges of ridged noise scrolling past at three depths", cols: 64, rows: 24, loop: 16,
  palette: { light: ["#8c959f", "#a5b4cf", "#5a7299", "#1d2b48"], dark: ["#8b949e", "#3d4f72", "#7088b3", "#c8d6f0"] } }, (t, s) => {
  for (const p of stars) s.set(p.x, p.y, p.k < 0.2 ? "+" : ".", 0);
  ranges.forEach((top, k) => {
    for (let x = 0; x < s.cols; x++) {
      const a = Math.round(top(x, 0, t)), b = Math.round(top(x + 1, 0, t)), edge = a === b ? "_" : a > b ? "/" : "\\";
      for (let y = Math.min(a, b) - (a === b ? 1 : 0); y < s.rows; y++) s.set(x, y, y < Math.max(a, b) ? edge : " ·:"[k], k + 1);
    }
  });
});
