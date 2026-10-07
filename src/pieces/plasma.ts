/*
 * plasma: the old demo-scene effect. Four sine fields, one a set of rings
 * round a wandering centre, summed and read as soft blobs of density.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "plasma",
  category: "generative",
  note: "soft interference blobs drifting and pulsing",
  cols: 64,
  rows: 22,
  fps: 24,
} satisfies Meta;

const RAMP = ".,-~:;=+*#%@";
const P = 30; // seconds; every term turns a whole number of times in one loop
const W = (2 * Math.PI) / P;
const GAIN = 0.32; // ramp sweeps per unit of the summed field: low, so the blobs are broad

export default function plasma(): Frame {
  const { cols, rows } = meta;
  const N = RAMP.length;
  const out = new Array<string>(cols);
  // Cell centres in cell widths, the rows stretched to their true height.
  const X = Float32Array.from({ length: cols }, (_, c) => c + 0.5 - cols / 2);
  const Y = Float32Array.from({ length: rows }, (_, r) => (r + 0.5 - rows / 2) * 2);

  return (t, { paper = false } = {}) => {
    const a = W * t;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cx = 14 * Math.sin(a), cy = 9 * Math.cos(2 * a); // the rings' centre
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const y = Y[r];
      for (let c = 0; c < cols; c++) {
        const x = X[c];
        let v = Math.sin(x * 0.11 + 3 * a);
        v += Math.sin(y * 0.13 - 2 * a);
        v += Math.sin((x * ca + y * sa) * 0.09 + 4 * a);
        v += Math.sin(Math.hypot(x - cx, y - cy) * 0.17 - 5 * a);
        // Up the ramp and back down, evenly, drifting through it once a loop.
        const u = v * GAIN + a / Math.PI;
        const k = Math.abs(u - 2 * Math.floor(u / 2 + 0.5));
        const i = Math.min(N - 1, Math.floor(k * N));
        out[c] = RAMP[paper ? N - 1 - i : i];
      }
      lines.push(out.join(""));
    }
    return lines.join("\n");
  };
}
