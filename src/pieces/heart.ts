/*
 * heart: the implicit heart surface (x² + 9/4 y² + z² - 1)³ = x²z³ + 9/80 y²z³,
 * ray-marched per cell, swaying from side to side and beating lub-dub.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "heart",
  category: "shapes",
  note: "a glossy 3d heart swaying and beating lub-dub",
  cols: 52,
  rows: 24,
  fps: 30,
} satisfies Meta;

const RAMP = ".,-~:;=+*#%@";

// The same surface with the cube root taken, which keeps the gradient sane
// along the waist. Inside is negative; z is up and y is the thin axis.
const field = (x: number, y: number, z: number) => x * x + 2.25 * y * y + z * z - 1 - z * Math.cbrt(x * x + 0.1125 * y * y);

export default function heart(): Frame {
  const { cols, rows } = meta;
  const K = 18; // cells per unit across
  const cx = cols / 2, cy = rows / 2 + 1.3;
  const out = new Array<string>(cols * rows);
  const m = Math.hypot(-0.4, -1, 0.65);
  const light: [number, number, number] = [-0.4 / m, -1 / m, 0.65 / m]; // upper left, in front (front is -y)

  return (t, { paper = false } = {}) => {
    // Lub, then a softer dub, once a second.
    const p = t % 1;
    const s = 1 + 0.075 * Math.exp(-(((p - 0.1) / 0.055) ** 2)) + 0.045 * Math.exp(-(((p - 0.32) / 0.06) ** 2));
    const yaw = 0.62 * Math.sin((t / 8) * Math.PI * 2);
    const tilt = 0.18;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    // Light and eye moved into the heart's own frame.
    const toObj = (x: number, y: number, z: number) => {
      const y1 = ct * y - st * z, z1 = st * y + ct * z;
      return [cyw * x + syw * y1, -syw * x + cyw * y1, z1];
    };
    const [lx, ly, lz] = toObj(...light);
    const [dx, dy, dz] = toObj(0, 1, 0); // the view ray
    let hx = lx - dx, hy = ly - dy, hz = lz - dz;
    const hm = Math.hypot(hx, hy, hz);
    hx /= hm, hy /= hm, hz /= hm;
    out.fill(" ");
    for (let r = 0; r < rows; r++) {
      const v = ((cy - r - 0.5) * 2) / K / s;
      if (v < -1.15 || v > 1.4) continue;
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5 - cx) / K / s;
        if (u < -1.3 || u > 1.3) continue;
        // March the ray (u, d, v) from in front; ox + d * dx is the point in object space.
        const [ox, oy, oz] = toObj(u, -1.6, v);
        let d0 = 0, hit = -1;
        for (let d = 0.04; d <= 3.2; d += 0.04) {
          if (field(ox + d * dx, oy + d * dy, oz + d * dz) < 0) {
            let a = d0, b = d;
            for (let k = 0; k < 10; k++) {
              const mid = (a + b) / 2;
              if (field(ox + mid * dx, oy + mid * dy, oz + mid * dz) < 0) b = mid;
              else a = mid;
            }
            hit = b;
            break;
          }
          d0 = d;
        }
        if (hit < 0) continue;
        const x = ox + hit * dx, y = oy + hit * dy, z = oz + hit * dz;
        const q = x * x + 0.1125 * y * y + 1e-9;
        const w = z / (3 * Math.cbrt(q * q));
        let nx = 2 * x - w * 2 * x;
        let ny = 4.5 * y - w * 0.225 * y;
        let nz = 2 * z - Math.cbrt(q);
        const nm = Math.hypot(nx, ny, nz) || 1;
        nx /= nm, ny /= nm, nz /= nm;
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const spec = Math.max(0, nx * hx + ny * hy + nz * hz) ** 40;
        const b = Math.min(1, 0.1 + 0.62 * diff + 0.4 * spec);
        const i = Math.round(b * (RAMP.length - 1));
        out[c + r * cols] = RAMP[paper ? RAMP.length - 1 - i : i];
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
