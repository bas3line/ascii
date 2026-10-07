/*
 * night coast: a lighthouse on a wooded headland under moonlit clouds. The
 * beam turns every eight seconds, the clouds drift, and the sea carries the
 * moon's road and the lamp's reflection.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "night coast",
  category: "scenes",
  note: "a lighthouse turning its beam under moonlit clouds over a dark sea",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#080b12",
  palette: [
    "#15203d", "#1b2a50", "#223463", "#2b4077", "#364e8b", "#445f9f", "#5874b2", "#7089c0",
    "#8a9cc4", "#a3b1cf", "#bec9dc", "#d8dfea", "#eef1f6", "#f7f8fc",
    "#ffe9ae", "#ffd27c", "#f3a64a", "#c46c2d",
    "#121c1b", "#182724", "#203530", "#2c473d", "#3c5c4c",
    "#232a36", "#363e4c", "#555d6c", "#2a3550", "#3a4868",
    "#9c4136", "#ff5d4d",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HORIZON = 60;
const MOON = [150, 19];
const LAMP_X = 30;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const AIR = 0, LAND = 1, TREE = 2, TOWER = 3, LANTERN = 4, CAP = 5, WALL = 6, PANE = 7, ROOF = 8, ISLE = 9;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise, wrapping every `period` lattice cells in x when period > 0.
function noise(x: number, y: number, period: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let x0 = xi, x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }
  const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, period: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, period * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

export default function nightCoast(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);

  // Nearest palette colour, cached on a 32-step cube.
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the land, built once -----------------------------------------------
  const top = (x: number) => HORIZON - 15 * smooth(86, 50, x) * (1 - 0.12 * smooth(24, 0, x)) - 1.6 * fbm(x * 0.15, 3.7, 3, 0);
  const mat = new Uint8Array(N);
  const shade = new Float32Array(N);
  const base = top(LAMP_X);
  const towerTop = base - 15;
  const trees: [number, number, number][] = [];
  for (let x = 1; x < 76; x += 2.6 + hash(x * 7, 1) * 2.6) {
    if (x > 22 && x < 49) continue; // the clearing for the tower and the cottage
    trees.push([x + hash(x, 2) * 1.2, (4 + hash(x, 3) * 7) * smooth(78, 56, x), 2 + hash(x, 4) * 1.6]);
  }
  const cottage = top(41);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const t0 = top(x);
      const isle = HORIZON - 4.5 * Math.max(0, 1 - ((x - 180) / 26) ** 2) - 1.4 * fbm(x * 0.2, 9, 2, 0);
      if (y >= t0 && y < HORIZON + 4 && x < 90) {
        mat[k] = LAND;
        // rock and scrub, the brow of the slope catching the moon
        shade[k] = 0.2 + 0.45 * fbm(x * 0.35, y * 0.35, 3, 0) + 0.5 * smooth(t0 + 3, t0, y) - 0.2 * smooth(HORIZON - 4, HORIZON + 4, y);
      } else if (x > 148 && y >= isle && y < HORIZON) {
        mat[k] = ISLE;
      }
      for (const [tx, th, tw] of trees) {
        if (th < 1) continue;
        const tb = top(tx);
        const dy = y - (tb - th);
        if (dy >= 0 && y < tb + 2 && Math.abs(x + 0.5 - tx) <= (dy / th) * tw + 0.4) {
          mat[k] = TREE;
          shade[k] = 0.1 + 0.35 * hash(x * 13 + r, 5) + (x + 0.5 > tx ? 0.35 : 0);
        }
      }
      // the tower: tapered, white, lit from the moon on its right
      const dx = x + 0.5 - LAMP_X;
      if (y >= towerTop && y < base + 2) {
        const hw = 3 - 1.1 * smooth(base, towerTop, y);
        if (Math.abs(dx) <= hw) {
          mat[k] = TOWER;
          shade[k] = 0.45 + 0.5 * (dx / hw);
        }
      }
      if (y >= towerTop - 1 && y < towerTop + 1 && Math.abs(dx) <= 3.6) (mat[k] = CAP), (shade[k] = 0.55);
      if (y >= towerTop - 7 && y < towerTop - 1 && Math.abs(dx) <= 2) mat[k] = LANTERN;
      if (y >= towerTop - 10 && y < towerTop - 7 && Math.abs(dx) <= 2.8 - (towerTop - 7 - y) * 0.8) (mat[k] = CAP), (shade[k] = 0.4);
      // the keeper's cottage, lit inside
      if (x >= 36 && x <= 47 && y >= cottage - 5 && y < cottage + 1) {
        mat[k] = WALL;
        shade[k] = 0.3 + 0.4 * (x - 36) / 11;
        if ((x === 39 || x === 44) && y >= cottage - 4 && y < cottage - 1.5) mat[k] = PANE;
      }
      if (y >= cottage - 10 && y < cottage - 5 && Math.abs(x + 0.5 - 42) <= 7.5 - (cottage - 5 - y) * 1.2) mat[k] = ROOF;
    }
  }

  // a faint unevenness in the clear sky, so it is never one flat tone
  const haze = new Float32Array(N);
  for (let k = 0; k < N; k++) haze[k] = fbm((k % W) * 0.05, Math.floor(k / W) * 0.08, 3, 0);

  // --- the clouds: heaps of noise that wrap, so they can drift forever ----
  const CW = 640;
  const cover = new Float32Array(CW * HORIZON);
  const lit = new Float32Array(CW * HORIZON);
  const density = (x: number, y: number) => {
    const q = fbm(x * 0.008, y * 0.02, 3, CW * 0.008);
    const d = fbm(x * 0.018 + q * 2.4, y * 0.036 + q * 1.1, 5, CW * 0.018);
    // heaped mid-sky, thinner overhead, wisps at the horizon
    return d + 0.05 * smooth(8, 22, y) - 0.04 * smooth(10, 0, y) - 0.16 * smooth(36, HORIZON - 4, y);
  };
  for (let r = 0; r < HORIZON; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const d = density(x, y);
      cover[r * CW + x] = smooth(0.52, 0.63, d);
      // Lit on the side facing the moon (up and right), shadowed underneath,
      // a little darker deep inside.
      const toward = density(x + 2.5, y - 3);
      lit[r * CW + x] = clamp(0.5 + (d - toward) * 11 - (d - 0.6) * 1.2);
    }
  }

  return (t, { color } = {}) => {
    const beam = (t / 8) * Math.PI * 2 - 0.75; // starts out over the sea
    const cb = Math.cos(beam), sb = Math.sin(beam);
    const flash = Math.pow(Math.max(0, sb), 14) * 2.2; // pointed at us
    const lampY = towerTop - 4;
    const drift = t * 1.4;

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        const m = mat[k];
        let cr = 0, cg = 0, cbl = 0, floor = 0.3, fade = 1;
        const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
        const dm = Math.sqrt(dmx * dmx + dmy * dmy);

        if (y < HORIZON && m === AIR) {
          // sky: deep navy up top to a hazy horizon, brighter round the moon
          const v = y / HORIZON;
          const halo = Math.exp(-dm / 24) * 0.35 + Math.exp(-dm / 9) * 0.45;
          const glowH = Math.pow(v, 3) * 0.24; // the horizon's last light
          const veil = 0.85 + 0.3 * haze[r * W + x];
          cr = (0.04 + 0.1 * v * v + glowH * 0.9) * veil + 0.3 * halo;
          cg = (0.07 + 0.13 * v * v + glowH) * veil + 0.35 * halo;
          cbl = (0.17 + 0.2 * v * v + glowH * 1.1) * veil + 0.42 * halo;
          floor = 0.15;
          const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
          const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
          // a break in the cloud round the moon
          const c = (cover[i0] + (cover[i1] - cover[i0]) * fx) * (0.15 + 0.85 * smooth(7, 24, dm));
          const l = lit[i0] + (lit[i1] - lit[i0]) * fx;
          if (dm < 6) {
            // the moon, dimmed where cloud crosses it
            const face = 0.86 + 0.14 * fbm(x * 0.5, y * 0.5, 2, 0);
            const a = (1 - c * 0.8) * smooth(6, 5, dm);
            cr = mix(cr, 0.96 * face, a);
            cg = mix(cg, 0.97 * face, a);
            cbl = mix(cbl, 1.0 * face, a);
          } else if (c < 0.05 && hash(x, r * 3 + 11) > 0.982) {
            const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + hash(x, r) * 3) + hash(r, x) * 6.28);
            const s = (0.5 + 0.5 * tw) * (1 - halo) * smooth(HORIZON, 20, y);
            cr = Math.max(cr, s * 0.92), cg = Math.max(cg, s * 0.94), cbl = Math.max(cbl, s);
          }
          if (c > 0.01) {
            // shadow slate, through moonlit grey, to a silver rim near the moon;
            // low cloud is lit from below by the horizon and stays hazy
            const near = Math.exp(-dm / 30);
            const b = clamp(l * (0.5 + 0.6 * near) + 0.25 * smooth(30, HORIZON, y));
            const kr = b < 0.5 ? mix(0.1, 0.36, b * 2) : mix(0.36, 0.95, (b - 0.5) * 2);
            const kg = b < 0.5 ? mix(0.13, 0.42, b * 2) : mix(0.42, 0.96, (b - 0.5) * 2);
            const kb = b < 0.5 ? mix(0.25, 0.58, b * 2) : mix(0.58, 1.0, (b - 0.5) * 2);
            const a = Math.min(1, c * 1.1);
            cr = mix(cr, kr, a);
            cg = mix(cg, kg, a);
            cbl = mix(cbl, kb, a);
          }
        } else if (y >= HORIZON && (m === AIR || m === LAND) && !(m === LAND && y < HORIZON + 4)) {
          // sea: cold, darker toward us, waves stretched along the swell
          const v = (y - HORIZON) / (H - HORIZON);
          const w = 0.6 * noise(x * 0.07 + t * 0.12, y * 0.45 - t * 0.6, 0) + 0.4 * noise(x * 0.2 - t * 0.25, y * 0.9 - t * 1.1, 0);
          const swell = 0.45 + 0.95 * w;
          cr = (0.08 - 0.04 * v) * swell;
          cg = (0.13 - 0.06 * v) * swell;
          cbl = (0.28 - 0.12 * v) * swell;
          // the moon's road: wider toward us, broken into glints
          const roadW = 3 + (y - HORIZON) * 0.55;
          const road = Math.exp(-(((x + 0.5 - MOON[0]) / roadW) ** 2));
          const glint = smooth(0.5, 0.8, w) * road;
          cr += 0.95 * glint + 0.07 * road;
          cg += 0.95 * glint + 0.09 * road;
          cbl += 0.95 * glint + 0.15 * road;
          // the lamp's reflection, warm, under the tower
          const lw = 1.3 + (y - HORIZON) * 0.22;
          const refl = Math.exp(-(((x + 0.5 - LAMP_X) / lw) ** 2)) * smooth(0.45, 0.8, w) * (0.75 + 0.6 * flash);
          cr += refl;
          cg += 0.72 * refl;
          cbl += 0.32 * refl;
          // surf where the headland meets the water
          if (y < HORIZON + 8 && x < 90) {
            const edge = smooth(90, 74, x) * smooth(HORIZON + 8, HORIZON + 3, y);
            const foam = smooth(0.5, 0.85, noise(x * 0.45 - t * 0.6, y * 0.8 + t * 0.4, 0)) * edge;
            cr += 0.65 * foam, cg += 0.7 * foam, cbl += 0.75 * foam;
          }
          const haze = Math.exp(-(y - HORIZON) / 2.5) * 0.16;
          cr += haze * 0.8, cg += haze * 0.9, cbl += haze;
          floor = 0.18;
          fade = smooth(H, H - 26, y); // the bottom rows thin out into the ground
        } else if (m === LAND) {
          const s = shade[k];
          (cr = 0.05 + 0.14 * s), (cg = 0.09 + 0.2 * s), (cbl = 0.1 + 0.18 * s);
          floor = 0.1;
        } else if (m === TREE) {
          const s = shade[k];
          (cr = 0.03 + 0.07 * s), (cg = 0.07 + 0.14 * s), (cbl = 0.07 + 0.1 * s);
          floor = 0.06;
        } else if (m === ISLE) {
          (cr = 0.06), (cg = 0.08), (cbl = 0.15);
          floor = 0.1;
          if (x === 184 && r === 55) {
            // a buoy light out on the point, blinking
            const on = Math.sin(t * 2.2) > 0.55;
            (cr = on ? 1 : 0.35), (cg = on ? 0.36 : 0.12), (cbl = on ? 0.3 : 0.1);
          }
        } else if (m === TOWER || m === CAP) {
          const s = shade[k];
          (cr = 0.4 + 0.58 * s), (cg = 0.42 + 0.56 * s), (cbl = 0.48 + 0.52 * s);
          if (m === CAP) (cr *= 0.7), (cg *= 0.66), (cbl *= 0.68);
        } else if (m === LANTERN) {
          const g = 0.85 + 0.15 * Math.min(1, flash);
          (cr = g), (cg = 0.84 * g), (cbl = 0.5 * g);
        } else if (m === WALL) {
          const s = shade[k];
          (cr = 0.3 + 0.4 * s), (cg = 0.32 + 0.4 * s), (cbl = 0.38 + 0.4 * s);
        } else if (m === PANE) {
          const g = 0.85 + 0.15 * Math.sin(t * 3 + x);
          (cr = g), (cg = 0.72 * g), (cbl = 0.32 * g);
        } else if (m === ROOF) {
          (cr = 0.4), (cg = 0.17), (cbl = 0.14);
        }

        // The beam: a soft cone from the lamp to one side, shortened as it
        // turns toward or away from us, and a glow that flares when it faces us.
        const bx = x + 0.5 - LAMP_X, by = y - lampY;
        if (m !== TOWER && m !== CAP && m !== LANTERN) {
          if (bx * cb > 0) {
            const along = Math.abs(bx) / (Math.abs(cb) * 115 + 1);
            if (along < 1) {
              const spread = 1.4 + Math.abs(bx) * 0.11;
              const b = Math.pow(1 - along, 1.8) * Math.exp(-((by / spread) ** 2)) * 0.85;
              cr += b, cg += b * 0.84, cbl += b * 0.5;
            }
          }
          const dl = Math.sqrt(bx * bx + by * by);
          const glow = Math.exp(-dl / (3.5 + 3 * flash)) * (0.5 + 0.6 * flash) + Math.exp(-dl / 14) * 0.12;
          cr += glow, cg += glow * 0.82, cbl += glow * 0.5;
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cbl * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
