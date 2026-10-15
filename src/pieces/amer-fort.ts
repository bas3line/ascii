/*
 * amer fort: the palace on its hill above Jaipur at night, seen across Maota
 * Lake. Floodlit sandstone ramparts and palace blocks climb the slope under a
 * row of chhatri domes, the old walls run off along the dark ridges to small
 * lit watchtowers, the Kesar Kyari garden sits out in the water, and the lake
 * carries the whole fort upside down in long rippling gold.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "amer fort",
  category: "scenes",
  note: "amer fort floodlit gold on its hill, mirrored in maota lake at night",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#060915",
  palette: [
    "#0a1230", "#101a40", "#16234f", "#1e2e62", "#283c78", "#364d8e", "#4a5f9f", "#6a7fb8",
    "#c9d4ee", "#eef1f8", "#fff6dc",
    "#3a220f", "#5a3415", "#7d4a1c", "#a06426", "#c27f32", "#dc9c44", "#ecb85c", "#f6d07e",
    "#ffe4a6", "#fff1cc",
    "#0b0f1c", "#121829", "#1a2236", "#2a2228",
    "#4a3a2c", "#4c6e34", "#6f9448", "#8fbf5a", "#b4dc7c", "#a08a62",
  ],
} satisfies Meta;

const W = 200, H = 100;
const WATER = 62; // the lake's far shore, under the lowest rampart
const ISLE_TOP = 65, ISLE_RIM = 71, ISLE_BASE = 75; // Kesar Kyari: garden top, wall face, waterline
const MOON = [172, 13];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const AIR = 0, FAR = 1, HILL = 2, STONE = 3, WINDOW = 4, DOME = 5, WALL = 6, LAMP = 7, GARDEN = 8, MOONM = 9;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f);
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
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

// The far Aravalli ridge, with Jaigarh's peak on the left, and the near hill
// the palace stands on.
const farTop = (x: number) => 33 - 21 * bump(x, 24, 24) - 12 * bump(x, 184, 30) - 5 * bump(x, 70, 14) - 4 * fbm(x * 0.07, 1.3, 3);
const nearTop = (x: number) => WATER - 40 * bump(x, 106, 62) - 2 * fbm(x * 0.12, 4.1, 2);
const sky = (x: number) => Math.min(farTop(x), nearTop(x));

// Palace blocks, left to right and low to high: x0, x1, top, bottom, rows of
// jharokha windows (their top rows), the gap between openings.
const BLOCKS: [number, number, number, number, number[], number][] = [
  [30, 176, 56, 62, [58], 6], // the long rampart above the lake
  [62, 150, 41, 51, [44], 7], // the plain substructure the palace stands on
  [70, 102, 32, 41, [35], 4], // the Diwan terrace
  [104, 142, 24, 41, [27, 33], 4], // Man Singh's palace, highest
  [150, 162, 40, 52, [43], 4], // the east wing
  [48, 62, 45, 52, [47], 4], // the gate court at the top of the ramp
];
// Round bastions on the lake rampart: centre, half width, top.
const BASTIONS: [number, number, number][] = [[31, 3.5, 53], [70, 3, 54], [118, 3, 54], [175, 3.5, 53]];
// Chhatris along the rooflines: centre, roof line they stand on, dome radius.
const CHHATRIS: [number, number, number][] = [
  [74, 32, 2.2], [84, 32, 2], [93, 32, 2], [100, 32, 2.2],
  [108, 24, 2.2], [116, 24, 2], [123, 24, 4], [131, 24, 2], [139, 24, 2.2],
  [153, 40, 2], [160, 40, 2], [55, 45, 2], [31, 53, 2.4], [175, 53, 2.4],
];
// Watchtowers on the ridge walls: x, size.
const TOWERS: [number, number][] = [[6, 1], [15, 1], [24, 2.4], [36, 1.2], [47, 1], [158, 1], [172, 1.2], [185, 1.6], [196, 1]];

export default function amerFort(): Frame {
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

  // --- everything that stands still, shaded once ---------------------------
  const mat = new Uint8Array(N);
  const shade = new Float32Array(N);
  const set = (x: number, r: number, m: number, s: number) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    mat[r * W + x] = m;
    shade[r * W + x] = s;
  };

  for (let r = 0; r < WATER; r++) {
    for (let x = 0; x < W; x++) {
      const y = r + 0.5;
      if (y >= nearTop(x)) set(x, r, HILL, fbm(x * 0.3, y * 0.3, 3));
      else if (y >= farTop(x)) set(x, r, FAR, fbm(x * 0.25, y * 0.25, 2));
    }
  }

  // The old walls along the skyline, crenellated, with towers.
  for (let x = 0; x < W; x++) {
    if (x > 60 && x < 152) continue;
    const top = sky(x + 0.5);
    const r0 = Math.floor(top);
    const far = x < 60 ? smooth(60, 20, x) : smooth(152, 190, x); // the further, the dimmer
    set(x, r0, WALL, 0.75 - 0.3 * far);
    set(x, r0 - 1, WALL, 0.85 - 0.3 * far);
    if (x % 2 === 0) set(x, r0 - 2, WALL, 0.7 - 0.3 * far);
  }
  for (const [tx, s] of TOWERS) {
    const base = Math.floor(sky(tx + 0.5));
    const hw = Math.round(s), ht = Math.round(2 + s * 2);
    for (let r = base - ht; r <= base; r++) {
      for (let x = tx - hw; x <= tx + hw; x++) set(x, r, WALL, 0.75 + 0.25 * ((x - tx + hw) / (2 * hw + 1)));
    }
    // a small cupola and its lamp
    for (let x = tx - hw + 1; x <= tx + hw - 1; x++) set(x, base - ht - 1, DOME, 0.8);
    set(tx, base - ht - 1 - (s > 2 ? 1 : 0), DOME, 0.9);
    set(tx, base - Math.round(ht / 2), LAMP, 0.8);
  }
  // Jaigarh's long front on the left peak
  {
    const base = Math.floor(sky(24.5));
    for (let r = base - 4; r <= base; r++) for (let x = 16; x <= 32; x++) if (r >= Math.floor(sky(x + 0.5)) - 4) set(x, r, WALL, 0.6 + 0.2 * hash(x, r));
    for (let x = 17; x <= 31; x += 3) set(x, base - 2, LAMP, 0.6);
  }
  // the wall climbing from the palace up to the ridge, and the zigzag ramp
  const line = (x0: number, y0: number, x1: number, y1: number, s: number) => {
    const n = Math.ceil(Math.abs(x1 - x0)) * 2;
    for (let i = 0; i <= n; i++) {
      const x = Math.round(mix(x0, x1, i / n)), y = Math.round(mix(y0, y1, i / n));
      set(x, y, WALL, s);
      set(x, y + 1, WALL, s * 0.8);
      if (x % 2 === 0) set(x, y - 1, WALL, s * 0.9);
    }
  };
  line(70, 33, 47, sky(47.5) - 1, 0.8);
  line(162, 41, 158, sky(158.5) - 1, 0.75);
  line(38, 55, 60, 50, 0.9);
  line(150, 52, 168, 55, 0.8);

  // The palace: honey sandstone washed from below by floodlight.
  BLOCKS.forEach(([x0, x1, top, bot, rows, gap], bi) => {
    const tone = [0.45, 0.3, 0.58, 0.62, 0.4, 0.5][bi]; // each block its own face, so they stack
    for (let r = top; r < bot; r++) {
      for (let x = x0; x < x1; x++) {
        const rel = (r - top) / (bot - top);
        let s = tone + 0.3 * rel + 0.06 * (fbm(x * 0.4, r * 0.4, 2) - 0.5);
        if (r === top) s = 1.05; // the cornice catches the light
        else if (r === top + 1) s *= 0.7; // its shadow
        if ((x - x0) % gap === 0) s += 0.08; // pilasters
        if (x === x0) s *= 0.75;
        set(x, r, STONE, s);
      }
    }
    for (let x = x0; x < x1; x += 2) set(x, top - 1, STONE, 0.95); // the crenellated parapet
    for (const wr of rows) {
      for (let x = x0 + 2; x + 2 < x1; x += gap) {
        const lit = hash(x, wr) > 0.86;
        // the jharokha: an arched opening, its balcony ledge, and its canopy
        set(x, wr, WINDOW, lit ? 0.9 : 0.25);
        set(x + 1, wr, WINDOW, lit ? 0.9 : 0.25);
        set(x, wr + 1, WINDOW, lit ? 1 : 0.15);
        set(x + 1, wr + 1, WINDOW, lit ? 1 : 0.15);
        set(x, wr - 1, STONE, 1.05);
        set(x + 1, wr - 1, STONE, 1.05);
        set(x, wr + 2, STONE, 1.1);
        set(x + 1, wr + 2, STONE, 1.1);
      }
    }
  });
  for (const [cx, hw, top] of BASTIONS) {
    for (let r = top; r < WATER; r++) {
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const d = (x + 0.5 - cx) / hw;
        if (Math.abs(d) > 1) continue;
        set(x, r, STONE, 0.7 + 0.35 * Math.sqrt(1 - d * d) - 0.15 * d);
      }
    }
  }
  for (const [cx, base, rad] of CHHATRIS) {
    // pillars with open arches between, a drum, then the dome and its finial
    const pw = Math.round(rad + 0.4), ph = rad > 3 ? 1 : 2;
    for (let r = base - ph; r < base; r++) {
      for (let x = cx - pw; x <= cx + pw; x++) {
        if (rad < 3 && (x - cx + pw) % 2 === 1) set(x, r, WINDOW, 0.3);
        else set(x, r, STONE, 0.95);
      }
    }
    for (let x = cx - pw - 1; x <= cx + pw + 1; x++) set(x, base - ph - 1, STONE, 1.1);
    const dy0 = base - ph - 1.5;
    for (let r = Math.floor(dy0 - rad * 1.1); r <= Math.floor(dy0); r++) {
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
        const dx = (x - cx) / rad, dy = (dy0 - (r + 0.5)) / (rad * 1.05);
        if (dx * dx + dy * dy <= 1 && dy >= 0) set(x, r, DOME, 0.75 + 0.3 * (1 - dy) - 0.2 * dx);
      }
    }
    set(cx, Math.floor(dy0 - rad * 1.1) - 1, DOME, 1);
  }
  // lamps strung along the lake rampart's foot
  for (let x = 37; x < 170; x += 3) set(x, WATER - 1, LAMP, 1);

  // Kesar Kyari: a walled garden island, the parterre's star pattern picked
  // out in lit paths, lamps on its rim.
  for (let r = ISLE_TOP; r < ISLE_BASE; r++) {
    const k = (r - ISLE_TOP) / (ISLE_RIM - ISLE_TOP);
    const x0 = Math.round(56 - 12 * Math.min(1, k)), x1 = Math.round(98 + 12 * Math.min(1, k));
    for (let x = x0; x <= x1; x++) {
      if (r < ISLE_RIM) {
        // beds laid out in diamonds, foreshortened: they widen toward us
        const u = (x - 77) / (0.7 + 0.3 * k), v = (r - ISLE_TOP) * 2.6;
        const d1 = (((u + v) % 10) + 10) % 10, d2 = (((u - v) % 10) + 10) % 10;
        const path = d1 < 0.8 || d2 < 0.8 || r === ISLE_TOP || x === x0 || x === x1 || Math.abs(x - 77) < 0.6;
        set(x, r, path ? WALL : GARDEN, path ? 0.8 + 0.2 * k : hash(x, r));
      } else if (r === ISLE_RIM) {
        set(x, r, STONE, 1.1); // the coping along the garden's edge
      } else {
        set(x, r, x % 5 === 2 ? WINDOW : STONE, x % 5 === 2 ? 0.2 : 0.75 + 0.15 * (r - ISLE_RIM) / 2);
      }
    }
    if (r === ISLE_RIM - 1) for (let x = x0; x <= x1; x += 4) set(x, r, LAMP, 0.9);
  }

  // A warm glow in the air round the lit fort: the fort's mask, blurred.
  let glow = new Float32Array(N);
  for (let k = 0; k < N; k++) glow[k] = mat[k] === STONE || mat[k] === DOME ? 1 : 0;
  for (let pass = 0; pass < 3; pass++) {
    const tmp = new Float32Array(N);
    const R = 6;
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let d = -R; d <= R; d++) {
          const xx = x + d;
          if (xx >= 0 && xx < W) (s += glow[r * W + xx]), n++;
        }
        tmp[r * W + x] = s / n;
      }
    }
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let d = -R; d <= R; d++) {
          const rr = r + d;
          if (rr >= 0 && rr < H) (s += tmp[rr * W + x]), n++;
        }
        glow[r * W + x] = s / n;
      }
    }
  }

  // The base colour of every cell above and on the water, without the stars.
  const BR = new Float32Array(N), BG = new Float32Array(N), BB = new Float32Array(N);
  for (let r = 0; r < ISLE_BASE; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const s = shade[k];
      const g = glow[k];
      let cr = 0, cg = 0, cb = 0;
      switch (mat[k]) {
        case AIR: {
          if (r >= WATER) continue;
          // deep blue overhead to a softer blue at the hills, warmed by the fort
          const v = y / WATER;
          const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
          const dm = Math.sqrt(dmx * dmx + dmy * dmy);
          const halo = Math.exp(-dm / 14) * 0.22;
          const veil = 0.9 + 0.2 * fbm(x * 0.04, y * 0.07, 3);
          cr = (0.012 + 0.04 * v * v) * veil + 0.6 * halo + 0.3 * g * g;
          cg = (0.025 + 0.06 * v * v) * veil + 0.7 * halo + 0.17 * g * g;
          cb = (0.1 + 0.14 * v * v) * veil + 0.9 * halo + 0.06 * g * g;
          // the moon, a thin crescent lit from the lower right
          const inside = smooth(5.6, 5, dm);
          const ox = x + 0.5 - (MOON[0] - 2.2), oy = y - (MOON[1] - 1.6);
          const cut = smooth(4.6, 5.4, Math.sqrt(ox * ox + oy * oy));
          if (inside * cut > 0.01) {
            mat[k] = MOONM;
            const a = inside * cut;
            cr = mix(cr, 1, a), cg = mix(cg, 0.97, a), cb = mix(cb, 0.86, a);
          }
          break;
        }
        case FAR:
          (cr = 0.02 + 0.02 * s + 0.15 * g), (cg = 0.025 + 0.025 * s + 0.09 * g), (cb = 0.06 + 0.03 * s + 0.03 * g);
          break;
        case HILL:
          (cr = 0.03 + 0.04 * s + 0.3 * g), (cg = 0.03 + 0.03 * s + 0.17 * g), (cb = 0.05 + 0.03 * s + 0.05 * g);
          break;
        case STONE:
          // sandstone: deep amber in shadow, honey in the light, cream at the top
          if (s < 0.7) (cr = mix(0.32, 0.86, s / 0.7)), (cg = mix(0.17, 0.56, s / 0.7)), (cb = mix(0.06, 0.24, s / 0.7));
          else (cr = mix(0.86, 1.0, (s - 0.7) / 0.4)), (cg = mix(0.56, 0.86, (s - 0.7) / 0.4)), (cb = mix(0.24, 0.55, (s - 0.7) / 0.4));
          break;
        case DOME:
          (cr = 0.75 + 0.25 * s), (cg = 0.5 + 0.38 * s), (cb = 0.2 + 0.32 * s);
          break;
        case WINDOW:
          if (s > 0.8) (cr = 1), (cg = 0.78), (cb = 0.42);
          else (cr = 0.2 + 0.2 * s), (cg = 0.08 + 0.08 * s), (cb = 0.04);
          break;
        case WALL:
          (cr = 0.78 * s), (cg = 0.52 * s), (cb = 0.24 * s);
          break;
        case LAMP:
          (cr = 1), (cg = 0.9 * s + 0.05), (cb = 0.6 * s);
          break;
        case GARDEN:
          (cr = 0.13 + 0.08 * s), (cg = 0.26 + 0.14 * s), (cb = 0.07 + 0.04 * s);
          break;
      }
      BR[k] = cr, BG[k] = cg, BB[k] = cb;
    }
  }

  // Bats and night birds: start x, height, speed, flap rate.
  const BIRDS = [[20, 18, 6, 9], [70, 12, 4.5, 7], [120, 20, 5.5, 8], [160, 9, 3.8, 6], [40, 8, 5, 10]];

  return (t, { color } = {}) => {
    // where the birds are this frame, as a short list of lit cells
    const birdAt = new Map<number, number>();
    for (const [bx0, by0, sp, fl] of BIRDS) {
      const span = W + 30;
      const bx = Math.round((((bx0 + sp * t) % span) + span) % span) - 15;
      const by = Math.round(by0 + 2 * Math.sin(t * 0.7 + bx0));
      const up = Math.sin(t * fl + bx0) > 0 ? 1 : 0;
      const cells = [[0, 0], [-1, -up], [1, -up], [-2, up - 1], [2, up - 1]];
      for (const [dx, dy] of cells) {
        const x = bx + dx, r = by + dy;
        if (x >= 0 && x < W && r >= 0 && r < WATER) birdAt.set(r * W + x, dx === 0 ? 1 : 0.8);
      }
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        let cr = BR[k], cg = BG[k], cb = BB[k], floor = 0.2, fade = 1;
        const m = mat[k];

        if (r < WATER || (r < ISLE_BASE && m !== AIR)) {
          if (m === AIR) {
            floor = 0.04;
            const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
            if (y < 46 && dmx * dmx + dmy * dmy > 64 && hash(x, r * 3 + 7) > 0.984) {
              const tw = 0.55 + 0.45 * Math.sin(t * (1.3 + hash(x, r) * 3) + hash(r, x) * 6.28);
              const s = (0.45 + 0.55 * tw) * smooth(46, 14, y);
              cr = Math.max(cr, s * 0.9), cg = Math.max(cg, s * 0.93), cb = Math.max(cb, s);
            }
          } else if (m === FAR || m === HILL) floor = 0;
          else if (m === GARDEN) floor = 0.1;
          else if (m === LAMP) {
            const f = 0.85 + 0.15 * Math.sin(t * 4 + x * 1.7);
            (cr *= f), (cg *= f), (cb *= f);
          } else if (m === WINDOW && BR[k] > 0.9) {
            const f = 0.9 + 0.1 * Math.sin(t * 2.5 + x * 0.9 + r);
            (cr *= f), (cg *= f), (cb *= f);
          }
          const b = birdAt.get(k);
          if (b !== undefined) (cr = 0.55 * b), (cg = 0.4 * b), (cb = 0.3 * b);
        } else {
          // The lake: still, dark blue, carrying the fort upside down. The
          // reflection is stretched into long streaks and set swaying by ripples.
          const below = r >= ISLE_BASE;
          const d = y - WATER;
          const v = d / (H - WATER);
          const wob = (0.5 + 0.06 * d) * Math.sin(y * 1.25 - t * 2.1 + 1.7 * noise(x * 0.05, y * 0.3)) + 0.6 * (noise(x * 0.03 + t * 0.1, y * 0.5 - t * 0.3) - 0.5) * (1 + 0.05 * d);
          // mirror about the island's foot where it sits in the water, else the shore
          const onIsle = below && r < ISLE_BASE + 5 && mat[(2 * ISLE_BASE - 1 - r) * W + x] !== AIR;
          const my = onIsle ? 2 * ISLE_BASE - 1 - r : Math.max(0, 2 * WATER - 1 - r);
          const sx = Math.max(0, Math.min(W - 1.001, x + wob));
          const ix = Math.floor(sx), fx = sx - ix;
          const i0 = my * W + ix;
          const rr = BR[i0] + (BR[i0 + 1] - BR[i0]) * fx;
          const rg = BG[i0] + (BG[i0 + 1] - BG[i0]) * fx;
          const rb = BB[i0] + (BB[i0 + 1] - BB[i0]) * fx;
          // long horizontal streaks, broken into dark gaps by the ripples
          const streak = 0.15 + 0.85 * smooth(0.3, 0.7, noise(x * 0.045 + t * 0.05, y * 0.8 - t * 0.6));
          // a band of shadowed water hugging the island, so it stands clear of the gold
          const hug = !onIsle && r < ISLE_TOP && x >= 54 && x <= 100 ? 0.25 : 1;
          const keep = (onIsle ? 0.45 : 0.55 - 0.2 * v) * streak * hug;
          // the dark water gives way under the gold, so the two never mix to olive
          const under = 1 - Math.min(1, rr * keep * 4);
          cr = 0.01 * under + rr * keep;
          cg = 0.02 * under + rg * keep;
          cb = (0.06 - 0.02 * v) * under + rb * keep;
          // a cold glint here and there under the moon
          const road = Math.exp(-(((x + 0.5 - MOON[0]) / (2 + d * 0.25)) ** 2));
          const glint = smooth(0.72, 0.9, noise(x * 0.25 - t * 0.2, y * 1.1 + t * 0.5)) * road * 0.6;
          cr += glint * 0.9, cg += glint * 0.92, cb += glint;
          floor = 0.07;
          fade = smooth(H, H - 18, y);
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
