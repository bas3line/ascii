/*
 * sunrise: the sun coming up out of the sea at dawn. The glow along the
 * horizon gathers into bands, the sun climbs out of it and sinks back as dusk,
 * and its path glitters on the water.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sunrise",
  category: "nature",
  note: "the sun lifting off a sea horizon, its path glittering",
  cols: 60,
  rows: 20,
  fps: 15,
} satisfies Meta;

// The sun, its glow and its glints are light, not shade, so they keep their
// sense on paper and print as a negative, like eclipse.
const SKY = " .·:-="; // the glow bands, faint to strong
const LOOP = 48; // seconds, from one dawn to the next
const DAY = 0.85; // the part of the loop the sun is up
const HZ = 12; // the horizon row
const R = 2.6; // the sun's radius, in rows
const TOP = 6.6; // the sun's highest, in rows above the horizon
const CX = 30, WX = 8; // the middle of its arc and how far it travels each way
const START = 2.2; // seconds into the loop at t = 0, the sun a third up
const GAP = 0.32; // the dark rim between the disc and its corona, in rows

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x2545f491);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
// Value noise along x for row r, sliding with time.
const noise = (x: number, r: number, z: number) => {
  const i = Math.floor(x), j = Math.floor(z);
  const u = smooth(0, 1, x - i), v = smooth(0, 1, z - j);
  const n = (a: number, b: number) => hash(i + a, r, j + b);
  return (n(0, 0) * (1 - u) + n(1, 0) * u) * (1 - v) + (n(0, 1) * (1 - u) + n(1, 1) * u) * v;
};

// Where the sun is a fraction s through the loop: up in an arc for the day,
// then a short dip under the sea, its speed matched where the two meet.
const sun = (s: number): [number, number] => {
  if (s < DAY) {
    const p = Math.PI * (s / DAY);
    return [CX - WX * Math.cos(p), -R + (TOP + R) * Math.sin(p)];
  }
  const q = Math.PI * ((s - DAY) / (1 - DAY));
  return [CX + WX * Math.cos(q), -R - (TOP + R) * ((1 - DAY) / DAY) * Math.sin(q)];
};

export default function sunrise(): Frame {
  const { cols, rows } = meta;
  const g = Array.from({ length: rows }, () => new Array<string>(cols));
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 22; i++) stars.push([Math.floor(hash(i, 1, 7) * cols), Math.floor(hash(i, 2, 7) * 7), hash(i, 3, 7)]);

  return (t) => {
    const u = (((t + START) % LOOP) + LOOP) % LOOP;
    const [sx, h] = sun(u / LOOP);
    const sy = HZ - h;
    // The glow is broad and dim before dawn, strongest as the sun breaks the
    // sea, and draws down into tighter bands as it climbs.
    const glow = 0.72 + 0.28 * smooth(-4, 0, h) - 0.25 * smooth(1, TOP, h);
    const height = 3.8 - 1.9 * smooth(0, TOP, h);
    const night = 1 - smooth(-3, 3, h);
    const lit = clamp((h + R) / (2 * R)); // how much of the disc is above the sea

    for (let r = 0; r < rows; r++) g[r].fill(" ");
    for (const [c, r, p] of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1.1 + p) + p * 40);
      if ((0.25 + night) * tw > 0.6 + r * 0.04) g[r][c] = p < 0.15 ? "+" : p < 0.55 ? "·" : ".";
    }

    for (let r = 0; r < HZ; r++) {
      const y = r + 0.5;
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5;
        // The disc, sampled 3 by 4 in the cell so the horizon cuts it flat; a
        // cell at least half covered is sun, and one that comes near it is
        // left dark, so the disc keeps a clean edge.
        let cov = 0, near = 0;
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 3; j++) {
            const yy = r + (i + 0.5) / 4;
            const e = Math.hypot((c + (j + 0.5) / 3 - sx) / 2, yy - sy) - R;
            if (yy < HZ && e < 0) cov++;
            if (e < GAP) near++;
          }
        if (cov >= 6) g[r][c] = "@";
        if (cov >= 6 || (near && lit > 0)) continue;
        // Outside it, bands that bow up toward the sun, and a soft corona.
        const d = Math.hypot((x - sx) / 2, y - sy) - R;
        const bow = 0.62 + 0.38 * Math.exp(-(((x - sx) / 17) ** 2));
        const v = Math.max(glow * Math.exp(-(HZ - y) / height) * bow, 0.42 * lit * Math.exp(-(d - GAP) / 1.5));
        const k = Math.min(SKY.length - 1, Math.floor(v * SKY.length));
        if (k > 0) g[r][c] = SKY[k];
      }
    }

    // The sea, in perspective: short close-set dashes out by the horizon,
    // longer and sparser swells nearer, each run slowly lengthening and
    // shrinking. Under the sun its path breaks into glints that come and go.
    g[HZ].fill("▔");
    for (let r = HZ + 1; r < rows; r++) {
      const k = r - HZ;
      const scale = 0.6 * k ** 1.2, cut = 0.43 + 0.028 * k;
      const drift = t * (0.15 + 0.06 * k);
      const wide = 2.4 + k * 1.2;
      const bright = (0.25 + 0.75 * lit) * (1.05 - k * 0.05) * (0.4 + 0.6 * glow);
      let run = 0;
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5;
        // A crest, unless it has already run longer than a wave this far out.
        let wave = noise((x + drift) / scale, r, t * 0.22 + k * 3.1) > cut;
        run = wave ? run + 1 : 0;
        if (run > (1.4 + 1.2 * k) * (0.7 + 0.6 * hash(Math.floor(x + drift), r, 9))) wave = false, run = 0;
        const path = Math.exp(-(((x - sx) / wide) ** 2)) * bright;
        const glint = noise(x * (1.3 / Math.sqrt(k)), r + 40, t * 2.2 + k) * path;
        if (glint > 0.45) g[r][c] = "=";
        else if (glint > 0.3 || (wave && path > 0.3)) g[r][c] = "-";
        else if (glint > 0.2) g[r][c] = "·";
        else if (wave) g[r][c] = k > 3 ? "~" : "-";
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
