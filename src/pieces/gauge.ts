/*
 * gauge: a semicircle dial in half-block pixels, a band filled up to the
 * reading, and a needle that springs to each new value, overshoots, and settles.
 */
import type { Frame, Meta } from "../types.ts";

export interface GaugeOptions {
  [key: string]: unknown;
  label: string;
  unit: string;
  min: number;
  max: number;
}

export const meta = {
  name: "gauge",
  category: "data",
  note: "semicircle dial, the needle overshoots each new reading",
  cols: 55,
  rows: 18,
  fps: 30,
  options: { label: "load", unit: "%", min: 0, max: 100 },
} satisfies Meta<GaugeOptions>;

const HOLD = 2.6; // seconds per reading
const ZETA = 0.38; // damping: about a quarter overshoot
const W0 = 5.2; // natural frequency, rad/s
const HALF = [" ", "▀", "▄", "█"];
const R = 22; // rim radius in pixels; a pixel is a cell wide and half a cell tall

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function gauge({ label = "load", unit = "%", min = 0, max = 100 }: Partial<GaugeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const H = rows * 2;
  const CX = 27, CY = 27; // the pivot pixel
  const angleOf = (v: number) => Math.PI * (1 - v / 100);
  const plot = (buf: Uint8Array, x: number, y: number) => {
    const c = Math.round(x), r = Math.round(y);
    if (c >= 0 && c < cols && r >= 0 && r < H) buf[c + r * cols] = 1;
  };

  // Pixels that never move: the rim, stepping along whichever axis moves
  // faster, a two-pixel tick every 10, and the hub.
  const fixed = new Uint8Array(cols * H);
  for (let x = -R; x <= R; x++) plot(fixed, CX + x, CY - Math.sqrt(R * R - x * x));
  for (let y = 0; y <= R; y++) {
    const x = Math.sqrt(R * R - y * y);
    plot(fixed, CX - x, CY - y);
    plot(fixed, CX + x, CY - y);
  }
  for (let v = 0; v <= 100; v += 10) {
    const a = angleOf(v);
    for (const r of [R - 8, R - 7]) plot(fixed, CX + r * Math.cos(a), CY - r * Math.sin(a));
  }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) plot(fixed, CX + x, CY + y);

  // By cell: numbers, a dot between ticks, and the band's cells by angle.
  const text: string[] = new Array(cols * rows).fill("");
  const put = (s: string, c0: number, r: number) => {
    for (let i = 0; i < s.length; i++) if (c0 + i >= 0 && c0 + i < cols) text[c0 + i + r * cols] = s[i];
  };
  const dots: string[] = new Array(cols * rows).fill("");
  for (let v = 5; v < 100; v += 10) {
    const a = angleOf(v);
    dots[Math.round(CX + (R - 7.5) * Math.cos(a)) + Math.floor((CY - (R - 7.5) * Math.sin(a) + 0.5) / 2) * cols] = "·";
  }
  const band = new Float32Array(cols * rows).fill(NaN);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - CX, dy = CY - (2 * r + 0.5);
      const d = Math.hypot(dx, dy);
      if (dy > -0.6 && d > R - 4.1 && d < R - 2.1) band[c + r * cols] = Math.atan2(Math.max(0, dy), dx);
    }
  }
  // Numbers every 20 just outside the rim; the two ends sit under it.
  for (let v = 0; v <= 100; v += 20) {
    const a = angleOf(v);
    const s = String(Math.round(min + ((max - min) * v) / 100));
    const rr = v % 100 ? R + 2.5 : R;
    const x = CX + rr * Math.cos(a) + (v % 100 ? (s.length / 2) * Math.cos(a) : 0);
    const y = v % 100 ? CY - (rr + 1) * Math.sin(a) : CY + 3;
    put(s, Math.round(x - (s.length - 1) / 2), Math.floor((y + 0.5) / 2));
  }

  // Readings and the spring that chases them, solved exactly per reading.
  const rand = mulberry32(42);
  const targets = [55];
  const states: [number, number][] = [[30, 0]]; // value and velocity as each reading begins
  const a = ZETA * W0, w = W0 * Math.sqrt(1 - ZETA * ZETA);
  const spring = (x0: number, v0: number, T: number, s: number): [number, number] => {
    const A = x0 - T, B = (v0 + a * A) / w, e = Math.exp(-a * s), c = Math.cos(w * s), n = Math.sin(w * s);
    return [T + e * (A * c + B * n), e * (-a * (A * c + B * n) + w * (-A * n + B * c))];
  };
  const value = (t: number) => {
    const k = Math.floor(t / HOLD);
    while (targets.length <= k) {
      const last = targets[targets.length - 1];
      let next: number;
      do next = 12 + rand() * 76; while (Math.abs(next - last) < 22);
      states.push(spring(...states[states.length - 1], last, HOLD));
      targets.push(next);
    }
    return spring(...states[k], targets[k], t - k * HOLD)[0];
  };

  const px = new Uint8Array(cols * H);
  const out: string[] = new Array(cols * rows);
  const centre = (s: string, r: number) => {
    s = s.slice(0, cols);
    const c0 = Math.round(CX + 0.5 - s.length / 2);
    for (let j = 0; j < s.length; j++) if (c0 + j >= 0 && c0 + j < cols) out[c0 + j + r * cols] = s[j];
  };

  return (t) => {
    const v = Math.max(-1, Math.min(101, value(t + HOLD - 0.4)));
    const an = angleOf(v);
    px.set(fixed);
    for (let r = 2; r <= R - 6; r += 0.25) plot(px, CX + r * Math.cos(an), CY - r * Math.sin(an));
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols, y = 2 * Math.floor(i / cols);
      const k = px[c + y * cols] | (px[c + (y + 1) * cols] << 1);
      const b = band[i];
      out[i] = text[i] || (k ? HALF[k] : dots[i] || (b === b ? (b >= an - 0.02 ? "▓" : "░") : " "));
    }
    const shown = Math.round(min + ((max - min) * Math.max(0, Math.min(100, v))) / 100);
    centre(shown + (/^[%°]/.test(unit) || !unit ? unit : " " + unit), (CY >> 1) + 2);
    centre(String(label), (CY >> 1) + 3);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
