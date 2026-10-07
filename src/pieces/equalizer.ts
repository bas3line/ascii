/*
 * equalizer: a spectrum analyser over a short drum and bass loop. Bars jump to
 * each band's level and sink back, and peak caps hold, then drop slowly.
 */
import type { Frame, Meta } from "../types.ts";

export interface EqualizerOptions {
  [key: string]: unknown;
  /** Tempo, held to 60 to 180. */
  bpm: number;
}

export const meta = {
  name: "equalizer",
  category: "data",
  note: "spectrum bars bouncing to a beat, peak caps falling slowly",
  cols: 62,
  rows: 16,
  fps: 30,
  options: { bpm: 120 },
} satisfies Meta<EqualizerOptions>;

const BANDS = 19; // half octaves from 31 Hz to 16 kHz
const LABELS = ["31", "63", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];
const PH = 12; // plot height in rows
const EIGHTHS = "▁▂▃▄▅▆▇";
const FALL = 2.2; // bar fall, heights per second
const HOLD = 0.5; // seconds a peak cap waits before it drops
const GRAVITY = 1.1; // how fast a dropping cap speeds up
const KICK_GAIN = 1.4, BASS_GAIN = 0.34, SNARE_GAIN = 0.95, HAT_GAIN = 0.75, CHORD_GAIN = 0.15, KNEE = 1.4;
const HEADROOM = 0.95; // the loudest a band reaches, so caps always show

// Sixteen steps a bar. The loop is four bars, the last with a fill.
const KICK = ["x.....x.x...x...", "x.....x.x.....x.", "x.....x.x...x...", "x.....x.x.x.x.xx"];
const SNARE = ["....x.......x...", "....x.......x..x", "....x.......x...", "....x..x..x.xxxx"];
const HAT = "x.x.x.xxx.x.x.xx";
const BASS = [0, 0, 2, 3, 1, 1, 3, 2, 0, 0, 2, 4, 3, 2, 1, 0]; // band per beat
const CHORDS = [[8, 10, 13], [7, 10, 12], [9, 11, 13], [8, 11, 14]];

function hash(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
// Smooth flutter per band, a pure function of time.
function flutter(b: number, x: number) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(b * 7919 + i) * (1 - u) + hash(b * 7919 + i + 1) * u;
}

export default function equalizer({ bpm = meta.options.bpm }: Partial<EqualizerOptions> = {}): Frame {
  const { cols, rows } = meta;
  const STEP = 15 / Math.max(60, Math.min(180, bpm)); // seconds per sixteenth
  const X0 = Math.floor((cols - (BANDS * 3 - 1)) / 2);
  const bar = new Float32Array(BANDS), peak = new Float32Array(BANDS);
  const vel = new Float32Array(BANDS), held = new Float32Array(BANDS);
  const level = new Float32Array(BANDS);

  // Time since the last hit of a pattern, looking back up to a bar.
  const since = (t: number, pat: string | string[]) => {
    const s = Math.floor(t / STEP);
    for (let k = 0; k < 16; k++) {
      const j = s - k, which = ((Math.floor(j / 16) % 4) + 4) % 4;
      const p = typeof pat === "string" ? pat : pat[which];
      if (p[((j % 16) + 16) % 16] === "x") return t - j * STEP;
    }
    return 9;
  };

  const spectrum = (t: number) => {
    const kick = Math.exp(-since(t, KICK) / 0.14);
    const snare = Math.exp(-since(t, SNARE) / 0.11);
    const hat = Math.exp(-since(t, HAT) / 0.045);
    const beat = Math.floor(t / (STEP * 4));
    const beatFrac = t / (STEP * 4) - beat;
    const bass = BASS[((beat % 16) + 16) % 16] + 0.6;
    const chord = CHORDS[((Math.floor(beat / 4) % 4) + 4) % 4];
    // The chord ducks under each beat and swells back, as if sidechained.
    const pump = 0.5 + 0.5 * (1 - Math.exp(-beatFrac * 4));
    for (let b = 0; b < BANDS; b++) {
      const n = flutter(b, t * 9);
      let sum =
        0.03 + 0.08 * n - 0.001 * b + // the room
        KICK_GAIN * kick * Math.exp(-(((b - 1.2) / 1.4) ** 2)) +
        // The bass note and its octave, two bands up.
        BASS_GAIN * (0.45 + 0.55 * Math.exp(-beatFrac * 3)) * (Math.exp(-(((b - bass) / 0.9) ** 2)) + 0.5 * Math.exp(-(((b - bass - 2) / 1.1) ** 2))) +
        SNARE_GAIN * (0.75 + 0.25 * n) * snare * Math.exp(-(((b - 9) / 4.2) ** 2)) +
        HAT_GAIN * hat * Math.exp(-(((b - 16) / 2.2) ** 2)) * (0.6 + 0.4 * n);
      // The chord rings in the mids, each tone with a weaker overtone.
      for (const c of chord) sum += CHORD_GAIN * pump * (0.7 + 0.3 * n) * (Math.exp(-((b - c) ** 2)) + 0.5 * Math.exp(-((b - c - 2) ** 2)));
      // A soft knee, so loud bands still move instead of pinning at the top.
      level[b] = HEADROOM * (1 - Math.exp(-KNEE * sum));
    }
  };

  let last = 0;
  const step = (t: number) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    spectrum(t);
    for (let b = 0; b < BANDS; b++) {
      bar[b] = Math.max(level[b], bar[b] - FALL * dt);
      if (bar[b] >= peak[b]) {
        peak[b] = bar[b];
        held[b] = HOLD;
        vel[b] = 0;
      } else if ((held[b] -= dt) < 0) {
        vel[b] += GRAVITY * dt;
        peak[b] = Math.max(bar[b], peak[b] - vel[b] * dt);
      }
    }
  };
  // Play a few bars in so frame 0 is mid song, just after a kick, then count
  // time from there.
  const WARM = STEP * (16 * 3 + 6) + 0.04;
  for (let i = 0; i <= 90; i++) step((WARM * i) / 90);

  const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const AY = 1 + PH; // axis row
  for (let c = X0 - 1; c <= X0 + BANDS * 3 - 1; c++) grid[AY][c] = "─";
  LABELS.forEach((s, i) => {
    const c = X0 + i * 6 + 1 - Math.floor(s.length / 2);
    [...s].forEach((ch, j) => (grid[AY + 1][c + j] = ch));
  });

  return (t) => {
    if (t + WARM < last) {
      last = 0;
      bar.fill(0), peak.fill(0), vel.fill(0), held.fill(0);
      for (let i = 0; i <= 90; i++) step((WARM * i) / 90);
    }
    step(t + WARM);
    for (let r = 0; r < AY; r++) grid[r].fill(" ");
    for (let b = 0; b < BANDS; b++) {
      const x = X0 + b * 3;
      const h = Math.round(Math.min(1, bar[b]) * PH * 8);
      const full = h >> 3, part = h & 7;
      for (let r = 0; r < full; r++) grid[AY - 1 - r][x] = grid[AY - 1 - r][x + 1] = "█";
      if (part) grid[AY - 1 - full][x] = grid[AY - 1 - full][x + 1] = EIGHTHS[part - 1];
      // The cap is one thin line, drawn once a clear cell parts it from the bar.
      const pr = Math.min(PH * 8 - 1, Math.round(Math.min(1, peak[b]) * PH * 8)) >> 3;
      if (pr >= (part ? full : full - 1) + 2) grid[AY - 1 - pr][x] = grid[AY - 1 - pr][x + 1] = "▁";
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
