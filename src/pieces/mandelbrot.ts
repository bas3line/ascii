/*
 * mandelbrot: the Mandelbrot set, zooming slowly into seahorse valley, the
 * crack between the main cardioid and the disc to its left, then back out.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "mandelbrot",
  category: "generative",
  note: "a slow zoom into seahorse valley and back out again",
  cols: 64,
  rows: 26,
  fps: 15,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const P = 48; // seconds to zoom in and back out
const T0 = 1.5; // start just after the turn, so the zoom is already under way
const DEEP = Math.log(6000); // the deepest zoom: one seahorse's curled tail
const TX = -0.74435, TY = 0.12119; // where the zoom heads: the centre of that curl
const CX = -0.75, SPAN = 3; // the centre and width of the whole set
const SS = 2; // samples per cell each way, so fine filaments blur rather than flicker
const WIDE = 3, NARROW = 1.2; // octaves of cells out from the set over which the glow fades

export default function mandelbrot(): Frame {
  const { cols, rows } = meta;
  const N = RAMP.length;
  const S = SS * SS;

  return (t, { paper = false } = {}) => {
    const z = Math.exp((DEEP * (1 - Math.cos((2 * Math.PI * (t + T0)) / P))) / 2);
    // Moving the centre with the zoom keeps the target still on screen.
    const cx = TX + (CX - TX) / z, cy = TY - TY / z;
    const dx = SPAN / z / cols, dy = dx * 2; // a cell is twice as tall as it is wide
    const max = Math.round(120 + 60 * Math.log2(z));
    const edge = WIDE + ((NARROW - WIDE) * Math.log(z)) / DEEP;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let s = "";
      for (let c = 0; c < cols; c++) {
        let ink = 0, inside = 0;
        for (let j = 0; j < S; j++) {
          const x0 = cx + (c + ((j % SS) + 0.5) / SS - cols / 2) * dx;
          const y0 = cy - (r + (Math.floor(j / SS) + 0.5) / SS - rows / 2) * dy;
          // Inside the main cardioid or the disc beside it: no need to iterate.
          const q = (x0 - 0.25) ** 2 + y0 * y0;
          if (q * (q + x0 - 0.25) < 0.25 * y0 * y0 || (x0 + 1) ** 2 + y0 * y0 < 0.0625) {
            inside++;
            continue;
          }
          // Iterate z, and its derivative for the distance to the set.
          let x = 0, y = 0, u = 0, v = 0, n = 0, m = 0;
          for (; n < max; n++) {
            const nu = 2 * (x * u - y * v) + 1;
            v = 2 * (x * v + y * u);
            u = nu;
            const xx = x * x, yy = y * y;
            y = 2 * x * y + y0;
            x = xx - yy + x0;
            m = x * x + y * y;
            if (m > 1e6) break;
          }
          if (n === max) {
            inside++;
            continue;
          }
          // A glow that hugs the boundary, measured in cells: wide on the
          // whole set, narrower deep down so the curls stay apart.
          const d = (0.5 * Math.sqrt(m) * Math.log(m)) / Math.hypot(u, v) / dx;
          ink += Math.max(0, 1 - Math.log2(1 + d) / edge);
        }
        // A cell the boundary runs through is at full glow. The set itself
        // is dark: left bare on a dark page, inked on paper.
        s += inside === S ? (paper ? "@" : " ") : RAMP[Math.min(N - 1, Math.floor(((ink + inside) / S) * N))];
      }
      lines.push(s);
    }
    return lines.join("\n");
  };
}
