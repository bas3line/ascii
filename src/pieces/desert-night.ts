/*
 * desert night: a moonless desert under the milky way. The galaxy's bright
 * core sits low over a lone acacia on a dune crest and arches up across the
 * sky, split by its dark dust lane; a distant town warms the far horizon and
 * catches the dunes' faces. Stars twinkle, sand glints along the ridges, and
 * now and then a meteor crosses.
 *
 * The dunes are a heightfield raymarched once, keeping each cell's depth,
 * light and shadow. The sky is drawn with a random dither so its faint glow
 * reads as star dust, softened toward an ordered one inside the band; the sand
 * keeps an ordered dither so its slopes read as smooth surfaces. Each cell is
 * one dot, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "desert night",
  category: "scenes",
  note: "the milky way over a lone acacia on moonless dunes, meteors falling",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#04060c",
  palette: [
    "#0a1024", "#101830", "#16213f", "#1e2b50", "#283864", "#34477a", "#45598f", "#5a6fa6", "#7488bd",
    "#93a5d2", "#b6c3e4", "#d8e0f2", "#f4f6fb",
    "#fff3dc", "#ffe2b4", "#f5c98e", "#e2a86e", "#c4864f", "#9c6440", "#74492f",
    "#2a2230", "#3d2f3a", "#56404a", "#735358", "#946a62", "#b6836c",
    "#4a3b48", "#6b5562", "#8a6f7a", "#a88590", "#c9a3a3", "#e2bfb4",
    "#2a2448", "#3d3466", "#57498a", "#7a68a8",
    "#ffd8a8", "#cfe0ff", "#a9c4ff",
    "#ff9a52", "#e07a3e",
    "#0d0f1a", "#151827",
  ],
} satisfies Meta;

const W = 200, H = 100;
const K = 0.62;
const HZ = 64; // eye level, in rows
const CAM = 6;
const HMAX = 16; // no dune is taller
const TOWN = [30, 66]; // the far glow, just under the horizon
const CORE = [152, 38]; // the galaxy's bright centre
const ARC = [50, 209.8, 199.8]; // the milky way's arch: centre and radius
const ARC_S = [-1.035, 0.8]; // its angle at the core, and the sweep to the west edge
const ACACIA = 150;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

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
    s += amp * noise(x * f + i * 31.7, y * f);
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

// Where a point sits across the dunes' wave: 0 at a trough, rising gently up
// the windward side to the crest at 0.72, then dropping down the slip face.
function phase(x: number, z: number): number {
  const p = x * 0.9 + z * 0.42 + 26 * fbm(x * 0.014, z * 0.014, 3);
  const q = p / 19;
  return q - Math.floor(q);
}

// The tall dune the acacia stands on: a sharp crest that snakes toward us from
// its summit, a gentle face on the town's side and a steep one on the other.
const crestX = (z: number) => {
  const k = clamp((z - 22) / 52);
  return -4 + 26 * k * k * (3 - 2 * k) + 5 * Math.sin((z - 22) * 0.09);
};
function ridge(x: number, z: number): number {
  if (z < 8) return 0;
  const hc = z <= 74 ? 0.5 + 13 * Math.pow(clamp((z - 12) / 62), 1.25) : 13.5 * (1 - (z - 74) / 9);
  const dx = x - crestX(z);
  return hc - (dx < 0 ? -dx * 0.36 : dx * 0.8);
}

function dunes(x: number, z: number): number {
  const u = phase(x, z);
  const prof = u < 0.72 ? Math.pow(u / 0.72, 1.5) : Math.pow((1 - u) / 0.28, 0.75);
  const rg = ridge(x, z);
  // the field lies low around the big dune so its faces stay clean
  const amp = (1 + 4.5 * fbm(x * 0.008 + 5, z * 0.008, 2)) * (1 - 0.8 * smooth(-3, 3, rg));
  return Math.max(prof * amp, rg) + 0.3 * fbm(x * 0.05, z * 0.05, 2);
}

function march(u: number, v: number): number {
  let z = 3, prev = z;
  for (let i = 0; i < 300 && z < 600; i++) {
    const y = CAM + v * z;
    if (v > 0 && y > HMAX) return 0;
    const gap = y - dunes(u * z, z);
    if (gap < 0) {
      let a = prev, b = z;
      for (let j = 0; j < 7; j++) {
        const m = (a + b) / 2;
        if (CAM + v * m - dunes(u * m, m) < 0) b = m;
        else a = m;
      }
      return b;
    }
    prev = z;
    z += Math.max(0.25, gap * 0.5) + z * 0.004;
  }
  return 0;
}

export default function desertNight(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);

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

  const unit = (v: number[]) => {
    const n = Math.hypot(...v);
    return v.map((c) => c / n);
  };
  // the town's light comes in low from ahead and to the left
  const L = unit([-0.8, 0.32, 0.5]);
  // the galaxy's cool fill, from up and to the right
  const G = unit([0.6, 0.5, 0.4]);

  // --- the dunes, raymarched once ------------------------------------------
  const SKY = 0, SAND = 1, TREE = 2;
  const mat = new Uint8Array(N);
  const depth = new Float32Array(N);
  const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
  const crest = new Float32Array(N);
  const top = new Int16Array(W).fill(H);
  for (let r = 0; r < H; r++) {
    const v = ((HZ - (r + 0.5)) / 100) * K;
    for (let x = 0; x < W; x++) {
      const u = ((x + 0.5 - 100) / 100) * K;
      const z = march(u, v);
      if (!z) continue;
      const k = r * W + x;
      mat[k] = SAND;
      depth[k] = z;
      if (r < top[x]) top[x] = r;
      const px = u * z, py = CAM + v * z;
      const e = 0.2;
      const hx = (dunes(px + e, z) - dunes(px - e, z)) / (2 * e);
      const hz = (dunes(px, z + e) - dunes(px, z - e)) / (2 * e);
      const nl = Math.hypot(hx, 1, hz);
      const nx = -hx / nl, ny = 1 / nl, nz = -hz / nl;
      let lit = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      if (lit > 0) {
        // a soft shadow: how close the ray to the light passes over the sand
        let sh = 1;
        for (let s = 0.6; s < 90; s += 0.5 + s * 0.05) {
          const qx = px + L[0] * s, qy = py + L[1] * s + 0.05, qz = z + L[2] * s;
          if (qy > HMAX) break;
          sh = Math.min(sh, (qy - dunes(qx, qz)) / (0.08 * s));
          if (sh <= 0) break;
        }
        lit *= clamp(sh);
      }
      lit = Math.min(1, Math.pow(lit, 1.4) * 1.45); // faces square to the light stand out
      // brightest along the crests, shading down each face into the trough
      const ph = phase(px, z);
      const onRidge = ridge(px, z) >= dunes(px, z) - 0.35;
      const dxc = px - crestX(z);
      const fall = onRidge ? 0.5 + 0.5 * Math.exp(-Math.abs(dxc) / 7) : 0.55 + 0.45 * smooth(0.2, 0.72, ph);
      const near = 0.72 + 0.28 * smooth(5, 25, z);
      const reach = (0.55 + 0.45 * Math.exp(-Math.abs(x - TOWN[0]) / 90)) * fall * near * smooth(300, 120, z);
      // starlight from the galaxy's side, and wind ripples across every slope
      const fill = 0.045 * Math.max(0, nx * G[0] + ny * G[1] + nz * G[2]);
      const ripple = (fbm(px * 0.6 + z * 0.2, z * 0.6, 2) - 0.5) * 0.05;
      const amb = (0.02 + 0.03 * ny + ripple) * near;
      let cr = amb * 0.7 + fill * 0.45 + lit * 1.0 * reach;
      let cg = amb * 0.62 + fill * 0.65 + lit * 0.63 * reach;
      let cb = amb * 1.35 + fill * 1.2 + lit * 0.53 * reach;
      // the big dune's shadowed brink catches a line of starlight
      if (onRidge && z < 76 && dxc > 0) {
        const cellW = z * K * 0.01;
        const rim = smooth(2.2 * cellW, 0.6 * cellW, dxc) * smooth(10, 20, z);
        cr += 0.1 * rim;
        cg += 0.14 * rim;
        cb += 0.24 * rim;
      }
      // distance thins the light into the horizon's haze
      const haze = clamp(1 - Math.exp(-z / 260)) * mix(0.7, 0.92, smooth(120, 300, z));
      const hg = Math.exp(-Math.abs(x - TOWN[0]) / 40) * 0.18;
      cr = mix(cr, 0.07 + hg, haze);
      cg = mix(cg, 0.085 + hg * 0.6, haze);
      cb = mix(cb, 0.15 + hg * 0.3, haze);
      sR[k] = cr;
      sG[k] = cg;
      sB[k] = cb;
      const big = ridge(px, z) > 0.5 && z < 76 ? smooth(0.9, 0, Math.abs(dxc)) : 0;
      crest[k] = Math.max(smooth(0.07, 0, Math.abs(ph - 0.72)) * smooth(260, 30, z), big) * (0.3 + 0.7 * smooth(0, 0.2, lit));
    }
  }

  // --- the acacia, on the crest under the galaxy's core ---------------------
  const bark = new Float32Array(N); // warm light from the core caught on the canopy's top
  {
    const base = top[ACACIA];
    const canopyTop = base - 16;
    // an umbrella: a low lumpy dome on top, thinning to the tips, tufts below
    const SPAN = 17;
    const canopy = (x: number, px: number, py: number) => {
      const q = (px - ACACIA) / SPAN;
      if (Math.abs(q) > 1.08) return false;
      const topY = canopyTop + 0.4 + 2.6 * q * q + 1.3 * (noise(px * 0.3, 7.1) - 0.5);
      const botY =
        canopyTop + 3.8 + 1.4 * (1 - q * q) - 1.4 * smooth(0.8, 1.08, Math.abs(q)) +
        1.2 * (noise(px * 0.45, 3.3) - 0.5) + (hash(x, 51) < 0.2 ? 0.9 : 0);
      return py > topY && py < botY;
    };
    // limbs: from the fork up and out to the canopy
    const fork: [number, number] = [ACACIA + 0.3, base - 5];
    const limbs: [[number, number], [number, number], number][] = [
      [[ACACIA, base + 1], fork, 1.3],
      [fork, [ACACIA - 9, canopyTop + 3], 0.8],
      [fork, [ACACIA + 1.5, canopyTop + 2], 0.75],
      [fork, [ACACIA + 10, canopyTop + 3.2], 0.8],
      [fork, [ACACIA - 4, canopyTop + 2.6], 0.55],
      [[ACACIA - 4, base - 9], [ACACIA - 14, canopyTop + 3.5], 0.55],
      [[ACACIA + 3, base - 8], [ACACIA + 15, canopyTop + 3.6], 0.5],
    ];
    for (let r = Math.max(0, canopyTop - 3); r <= base + 1; r++) {
      for (let x = ACACIA - 26; x <= ACACIA + 26; x++) {
        if (x < 0 || x >= W) continue;
        const px = x + 0.5, py = r + 0.5;
        let on = canopy(x, px, py);
        for (const [[ax, ay], [bx, by], w] of limbs) {
          const lx = bx - ax, ly = by - ay;
          const t = clamp(((px - ax) * lx + (py - ay) * ly) / (lx * lx + ly * ly));
          const dx = px - (ax + lx * t), dy = py - (ay + ly * t);
          if (dx * dx + dy * dy < (w * (1 - 0.4 * t)) ** 2) on = true;
        }
        if (on) mat[r * W + x] = TREE;
      }
    }
    // the canopy's upper edge, rimmed by the bulge behind it
    for (let r = 1; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (mat[k] !== TREE || mat[k - W] !== SKY) continue;
        const dx = x + 0.5 - CORE[0], dy = (r - CORE[1]) * 1.3;
        bark[k] = 0.25 + 0.75 * Math.exp(-Math.sqrt(dx * dx + dy * dy) / 18);
      }
    }
  }

  // --- the town's lights, a few pinpricks along the far horizon -------------
  const lamps: [number, number, number][] = [];
  for (let x = TOWN[0] - 9; x <= TOWN[0] + 9 && lamps.length < 5; x++) {
    const r = top[x];
    if (r >= H || depth[r * W + x] < 140 || hash(x, 91) > 0.45) continue;
    if (lamps.some(([k]) => Math.abs((k % W) - x) < 2)) continue;
    lamps.push([r * W + x, hash(x, 92) * 6.28, 0.7 + hash(x, 93) * 1.4]);
  }

  // --- the sky: gradient, the town's glow and the milky way ----------------
  const kR = new Float32Array(N), kG = new Float32Array(N), kB = new Float32Array(N);
  const air = new Float32Array(N);
  const band = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      const v = clamp(y / HZ);
      // a saturated navy, so the dither's specks read as colour
      let cr = 0.02 + 0.03 * v * v, cg = 0.035 + 0.045 * v * v, cb = 0.1 + 0.08 * v * v;
      // the town: an amber dome rising from below the horizon, its warmth
      // taking over from the navy rather than greying it
      const tx = x + 0.5 - TOWN[0], ty = (y - TOWN[1]) * 1.9;
      const td = Math.sqrt(tx * tx + ty * ty);
      const glow = Math.exp(-td / 16) * 0.4 + Math.exp(-td / 60) * 0.22;
      const cool = 1 - 0.85 * clamp(Math.exp(-td / 22) * 1.5);
      cr = cr * cool + glow;
      cg = cg * cool + glow * 0.5;
      cb = cb * cool + glow * 0.16;
      // airglow, a faint blue sheen low down, kept off the town; it drifts each frame
      // it peaks a little above the horizon, where the air below thins it, and
      // varies along the skyline so it never lies as one flat strip
      const along = 0.72 + 0.5 * fbm(x * 0.025 + 3, y * 0.04, 2);
      air[k] = Math.pow(smooth(0.3, 0.94, v), 3) * (1 - 0.3 * smooth(0.92, 1.02, v)) * 0.32 * cool * along;
      // the milky way, along an arc from the core up and over to the west
      const ax = x + 0.5 - ARC[0], ay = y - ARC[1];
      const d = Math.sqrt(ax * ax + ay * ay) - ARC[2];
      const sRaw = (ARC_S[0] - Math.atan2(ay, ax)) / ARC_S[1]; // 0 at the core end
      const s = clamp(sRaw);
      const end = sRaw < 0 ? Math.exp(-((sRaw / 0.05) ** 2)) : 1; // the band ends at the core
      const laneEnd = sRaw < 0 ? Math.exp(-((sRaw / 0.11) ** 2)) : 1;
      const w = 9 + 8 * Math.pow(1 - s, 1.4);
      const lane0 = (noise(s * 9, 3.3) - 0.5) * w * 0.5 * smooth(0, 0.25, s);
      let b = Math.exp(-((d / w) ** 2));
      const clump = fbm(x * 0.09, y * 0.09, 4);
      b *= 0.35 + 1.1 * smooth(0.3, 0.75, clump);
      b *= (0.55 + 0.55 * (1 - s)) * end;
      // the core's bulge
      const cx = x + 0.5 - CORE[0], cy = (y - CORE[1]) * 1.3;
      const cd = Math.sqrt(cx * cx + cy * cy);
      const core = Math.exp(-cd / 6) * 0.5 + Math.exp(-cd / 22) * 0.25;
      b += core;
      // the dust lane, a crisp rift through the bulge, and its filaments
      const nearCore = Math.exp(-cd / 16);
      const lane =
        Math.exp(-(((d - lane0) / (w * 0.12)) ** 2)) *
        mix((0.55 + 0.6 * fbm(x * 0.12, y * 0.12, 3)) * (0.55 + 0.45 * (1 - s)), 1, nearCore) *
        laneEnd;
      const fil = smooth(0.58, 0.78, fbm(x * 0.16 + 9, y * 0.16, 3)) * 0.6;
      b *= clamp(1 - mix(0.92, 0.97, nearCore) * lane) * (1 - fil * Math.exp(-((d / (w * 1.3)) ** 2)));
      band[k] = Math.exp(-((d / (w * 1.2)) ** 2)) * end + core;
      // warm toward the core, cool along the arm
      const warm = clamp(Math.exp(-cd / 26) * 1.2 + (1 - s) * 0.25);
      cr += b * mix(0.62, 1.0, warm) * 0.75;
      cg += b * mix(0.68, 0.9, warm) * 0.75;
      cb += b * mix(0.95, 0.74, warm) * 0.75;
      kR[k] = cr;
      kG[k] = cg;
      kB[k] = cb;
    }
  }

  // per-cell dither and floor: random in open sky, half ordered in the band
  const dith = new Float32Array(N);
  const floor0 = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const bay = BAYER[(r & 3) * 4 + (x & 3)];
      if (mat[k] === SKY) {
        // the band and the glow low down get a wider, half-ordered dither, so
        // their gradients fade out instead of stopping at an edge
        const inb = clamp(band[k]);
        const soft = Math.max(inb, clamp(air[k] / 0.2));
        const rnd = (hash(x * 3 + 1, r * 5 + 2) - 0.5) * mix(0.6, 0.94, soft);
        dith[k] = mix(rnd, bay, 0.5 * soft);
        floor0[k] = 0.1 * inb;
      } else {
        dith[k] = bay;
        floor0[k] = mat[k] === SAND ? 0.02 : 0;
      }
    }
  }

  // --- stars: thick in the band, a few bright ones everywhere ---------------
  const stars: [number, number, number[], number, number][] = [];
  for (let r = 0; r < HZ + 2; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] !== SKY) continue;
      const p = 0.015 + 0.12 * clamp(band[k]);
      if (hash(x * 7 + 3, r * 13 + 1) > p) continue;
      const m = Math.pow(hash(x * 5 + 1, r * 3 + 7), 12);
      const bright = (0.2 + 0.95 * m) * smooth(HZ + 1, HZ - 6, r + 0.5);
      const c = hash(x * 11, r * 17 + 5);
      const tint = c < 0.2 ? [0.78, 0.86, 1] : c < 0.9 ? [1, 1, 1] : [1, 0.82, 0.6];
      stars.push([k, bright, tint, 1.5 + hash(x, r * 9) * 4, hash(r, x * 3) * 6.28]);
    }
  }

  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N);
  const floor = new Float32Array(N);
  const AIR0 = Math.floor(HZ * 0.3);

  // meteor 0 is already falling; meteor n starts somewhere in its 7 second slot
  const meteor = (n: number): [number, number, number, number, number, number] => {
    const start = n === 0 ? -0.35 : 7 * (n - 1) + 2.5 + hash(n, 71) * 2.5;
    const x0 = n === 0 ? 199 : 30 + hash(n, 72) * 140;
    const y0 = n === 0 ? 4 : 4 + hash(n, 73) * 18;
    // each one heads across the sky rather than straight off its nearer edge
    const a = n === 0 ? 2.65 : (x0 > 100 ? 2.6 : 0.55) + (hash(n, 75) - 0.5) * 0.4;
    return [start, x0, y0, Math.cos(a), Math.sin(a), 52 + hash(n, 76) * 30];
  };

  return (t, { color } = {}) => {
    FR.set(kR);
    FG.set(kG);
    FB.set(kB);
    floor.set(floor0);
    // the airglow drifts slowly along the horizon
    for (let r = AIR0; r < HZ + 2; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (mat[k] !== SKY) continue;
        const a = air[k] * (0.86 + 0.28 * noise((x - t * 0.3) * 0.03, r * 0.08));
        FR[k] += a * 0.3;
        FG[k] += a * 0.5;
        FB[k] += a * 1.2;
      }
    }
    for (let k = 0; k < N; k++) {
      const m = mat[k];
      if (m === SAND) {
        FR[k] = sR[k];
        FG[k] = sG[k];
        FB[k] = sB[k];
        const c = crest[k];
        if (c > 0) {
          // sand glinting along the brink of each slip face
          const h = hash(k, 5);
          const g = c * Math.pow(Math.max(0, Math.sin(t * (0.8 + 2.2 * h) + h * 40)), 8) * 0.5;
          FR[k] += g;
          FG[k] += g * 0.85;
          FB[k] += g * 0.7;
        }
      } else if (m === TREE) {
        const e = bark[k];
        FR[k] = e * 0.42;
        FG[k] = e * 0.3;
        FB[k] = e * 0.2;
        floor[k] = e > 0 ? 0.1 : 0;
      }
    }
    for (const [k, b, tint, rate, ph] of stars) {
      const tw = b > 0.35 ? 0.72 + 0.28 * Math.sin(t * rate + ph) : 0.6 + 0.4 * Math.sin(t * rate + ph);
      const s = b * tw;
      FR[k] += s * tint[0];
      FG[k] += s * tint[1];
      FB[k] += s * tint[2];
      floor[k] = 0.28;
    }
    for (const [k, ph, rate] of lamps) {
      const g = 0.42 + 0.14 * Math.sin(t * rate + ph) * Math.sin(t * rate * 2.3 + ph * 3);
      FR[k] = g;
      FG[k] = 0.85 * g;
      FB[k] = 0.66 * g;
      floor[k] = 0.12;
    }
    // a meteor, if one is crossing
    const n = Math.floor((t - 2.5) / 7) + 1;
    for (let i = Math.max(0, n - 1); i <= n + 1; i++) {
      const [start, x0, y0, dx, dy, speed] = meteor(i);
      const age = t - start;
      if (age < 0 || age > 0.9) continue;
      const fadeIn = smooth(0, 0.12, age), fadeOut = smooth(0.9, 0.6, age);
      const hx = x0 + dx * speed * age, hy = y0 + dy * speed * age * 0.75;
      const len = Math.min(28, speed * age);
      for (let j = 0; j < len * 2; j++) {
        const f = j / (len * 2);
        const px = Math.round(hx - dx * f * len), py = Math.round(hy - dy * f * len * 0.75);
        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        const k = py * W + px;
        if (mat[k] !== SKY) continue;
        const s = (1 - f) * fadeIn * fadeOut * 1.25;
        FR[k] = Math.max(FR[k], s * 0.9);
        FG[k] = Math.max(FG[k], s * 0.96);
        FB[k] = Math.max(FB[k], s);
        floor[k] = Math.max(floor[k], s > 0.12 ? 0.4 : 0);
      }
    }

    for (let r = 0; r < H; r++) {
      const edge = smooth(H + 1, H - 12, r + 0.5);
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = FR[k], cg = FG[k], cbl = FB[k], fl = floor[k];
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const sky = mat[k] === SKY;
        const level = clamp(fl + (1 - fl) * Math.pow(peak, sky ? 0.92 : 0.75)) * edge;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
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
