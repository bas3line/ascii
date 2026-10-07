/*
 * wave-interference: two dippers in a round ripple tank, seen from above. Where their waves
 * cancel the water lies still, and those calm lines fan out and swing as the dippers drift.
 */
import type { Frame, Meta } from "../types.ts";

export interface WaveInterferenceOptions {
  [key: string]: unknown;
  wavelength: number;
  separation: number;
}

export const meta = {
  name: "wave interference",
  category: "physics",
  note: "two sources in a ripple tank, still lines fanning out",
  cols: 72,
  rows: 26,
  fps: 24,
  options: { wavelength: 5, separation: 2.2 },
} satisfies Meta<WaveInterferenceOptions>;

// Troughs run dark through to calm water at ":", crests bright above it; a short ramp keeps each band bold.
const RAMP = " .:=*#";
const CALM = 2;
const PERIOD = 1; // seconds per wave

// wavelength is in rows (a column is half a row); separation is how many wavelengths apart the dippers sit.
export default function waveInterference({ wavelength = 5, separation = 2.2 }: Partial<WaveInterferenceOptions> = {}): Frame {
  const { cols, rows } = meta;
  const lam = Math.max(3, wavelength);
  const k = (2 * Math.PI) / lam;
  const cx = cols / 4, cy = rows / 2; // the tank's middle, in rows
  const A = cx - 0.6, B = cy - 0.4; // and its half width and height
  const out: string[] = new Array(cols * rows);

  return (t, { paper = false } = {}) => {
    const w = (2 * Math.PI * t) / PERIOD;
    // The dippers drift apart and together and their axis rocks; both repeat within 90 seconds.
    const half = Math.min(B - 1.5, (lam * Math.abs(separation) * (1 + 0.2 * Math.sin((2 * Math.PI * t) / 30))) / 2);
    const tilt = 0.25 * Math.sin((2 * Math.PI * t) / 45);
    const sx = [cx - half * Math.sin(tilt), cx + half * Math.sin(tilt)];
    const sy = [cy - half * Math.cos(tilt), cy + half * Math.cos(tilt)];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) / 2, y = r + 0.5;
        const q = Math.hypot((x - cx) / A, (y - cy) / B);
        if (q >= 1) {
          out[r * cols + c] = " ";
          continue;
        }
        const d1 = Math.hypot(x - sx[0], y - sy[0]), d2 = Math.hypot(x - sx[1], y - sy[1]);
        const a1 = 1 / Math.sqrt(1 + d1 * 0.1), a2 = 1 / Math.sqrt(1 + d2 * 0.1);
        // The surface height, out of the most two waves can give; the shallows by the rim calm it.
        const calm = Math.min(1, (1 - q) / 0.2);
        let h = ((a1 * Math.cos(k * d1 - w) + a2 * Math.cos(k * d2 - w)) / (a1 + a2)) * calm * calm * (3 - 2 * calm);
        if (paper) h = -h;
        const i = h < 0 ? Math.round(CALM * (1 + h)) : Math.round(CALM + (RAMP.length - 1 - CALM) * h);
        out[r * cols + c] = RAMP[i];
      }
    }
    // Each dipper bobs in a little calm of its own.
    for (let i = 0; i < 2; i++) {
      const c = Math.floor(sx[i] * 2), r = Math.floor(sy[i]);
      out[r * cols + c - 1] = out[r * cols + c + 1] = " ";
      out[r * cols + c] = "O";
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
