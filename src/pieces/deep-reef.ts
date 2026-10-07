/*
 * deep reef: looking along a coral reef from a few metres down. The sun is a
 * bright blaze in the rippled surface, shafts of light fan down from it,
 * kelp sways in the swell, a school of fish wheels through the dark water,
 * bubbles rise and caustics crawl over the sand.
 *
 * The water, the sand and the reef are shaded once; each frame adds the light
 * that moves (shafts, ripples, caustics) and draws what swims or sways on top.
 * Every cell is then a halftone dot sized by its brightness, ordered-dithered,
 * in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "deep reef",
  category: "scenes",
  note: "light shafts, swaying kelp and a turning school of fish over a reef",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03101a",
  // A dot is never drawn darker than about half brightness (dot size carries
  // the darkness), so the palette starts at mid tones.
  palette: [
    "#114a66", "#165c78", "#1d708a", "#27869b", "#3a9fae", "#58b9c0", "#80d2d2", "#b0e8e2", "#e2fbf5",
    "#5e6b62", "#87927f", "#aab39a", "#cfd2b4",
    "#38461a", "#5a6420", "#857f2a", "#b0a03c", "#d6c25a", "#efe08e",
    "#8e3355", "#c4506a", "#e0786e", "#f0a070",
    "#6a3a78", "#9a5aa8", "#c88ad0",
    "#6f8a98", "#9fb8c6", "#cfe3ea",
  ],
} satisfies Meta;

const W = 200, H = 100;
const SURF = 15; // the surface band
const HZ = 61; // where the sea floor would meet the haze
const SUNX = 136; // where the sun shows through the surface
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const NONE = 0, SAND = 1, REEF = 2, FAR = 3, FAN = 4;

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

const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number): number => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
const hex = (s: string): number[] => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// A seeded generator for laying things out.
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function deepReef(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;

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

  // --- caustics: a tiling web of bright lines (cell edges of a Voronoi) -----
  const CT = 64, CC = 6, CS = CT / CC;
  const caus = new Float32Array(CT * CT);
  {
    const rnd = prng(7);
    const pts: [number, number][] = [];
    for (let j = 0; j < CC; j++) for (let i = 0; i < CC; i++) pts.push([(i + 0.15 + 0.7 * rnd()) * CS, (j + 0.15 + 0.7 * rnd()) * CS]);
    for (let y = 0; y < CT; y++) {
      for (let x = 0; x < CT; x++) {
        let f1 = 1e9, f2 = 1e9;
        for (const [px, py] of pts) {
          for (let oy = -CT; oy <= CT; oy += CT) {
            for (let ox = -CT; ox <= CT; ox += CT) {
              const dx = x + 0.5 - px - ox, dy = y + 0.5 - py - oy;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < f1) (f2 = f1), (f1 = d);
              else if (d < f2) f2 = d;
            }
          }
        }
        caus[y * CT + x] = Math.pow(1 - smooth(0, 0.42 * CS, f2 - f1), 2.2);
      }
    }
  }
  const causAt = (u: number, v: number): number => {
    u = ((u % CT) + CT) % CT;
    v = ((v % CT) + CT) % CT;
    const x0 = u | 0, y0 = v | 0, ax = u - x0, ay = v - y0;
    const x1 = (x0 + 1) % CT, y1 = (y0 + 1) % CT;
    const a = caus[y0 * CT + x0], b = caus[y0 * CT + x1], c = caus[y1 * CT + x0], d = caus[y1 * CT + x1];
    return a + (b - a) * ax + (c - a) * ay + (a - b - c + d) * ax * ay;
  };

  // --- the water: deep navy, lit from the surface and the sun ----------------
  const wr = new Float32Array(N), wg = new Float32Array(N), wb = new Float32Array(N);
  // which shaft each cell sits in: shafts fan out from the sun, above the frame
  const rayAt = new Uint16Array(N);
  const SUNY = -12, RAYS = 320;
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x, v = (r + 0.5) / H;
      const up = Math.pow(1 - v, 2.2);
      const sun = Math.exp(-(((x - SUNX) / 52) ** 2) - (((r - 4) / 34) ** 2));
      // looking level, the distance is a lit blue haze the reefs stand against
      const haze = Math.exp(-(((r - 54) / 15) ** 2)) * (1 - 0.6 * smooth(30, 100, Math.abs(x - 112)));
      // darker toward the sides and the floor, but the upper water stays lit
      // so the kelp stands dark against it
      const edge = 1 - 0.4 * smooth(50, 104, Math.abs(x - 112)) * smooth(8, 70, r) - 0.3 * smooth(66, 100, r);
      // soft clouds of plankton haze, so open water is never one flat tone
      const veil = 0.78 + 0.44 * fbm(x * 0.022 + 5, r * 0.04, 4);
      wr[k] = (0.012 + 0.09 * up + 0.05 * sun + 0.04 * haze) * edge * veil;
      wg[k] = (0.1 + 0.32 * up + 0.14 * sun + 0.15 * haze) * edge * veil;
      wb[k] = (0.15 + 0.27 * up + 0.12 * sun + 0.17 * haze) * edge * veil;
      const a = Math.atan2(x + 0.5 - SUNX, r + 0.5 - SUNY);
      rayAt[k] = Math.max(0, Math.min(RAYS - 1, Math.round((a + 1.6) * 100)));
    }
  }
  const RAY0 = 160; // the shaft straight down from the sun

  // --- the static scene: sand, the reef, a far reef in the haze, a sea fan --
  const mat = new Uint8Array(N);
  const ar = new Float32Array(N), ag = new Float32Array(N), ab = new Float32Array(N); // lit colour
  const fog = new Float32Array(N); // how much water stands between us and it
  const cu = new Float32Array(N), cv = new Float32Array(N), cw = new Float32Array(N); // caustic coords, weight
  // both reefs are rounded masses, shouldering down toward the open sand
  const dome = (u: number): number => 1 - Math.sqrt(Math.max(0, 1 - u * u));
  const leftTop = (x: number): number => 47 + 56 * dome(Math.min(1, x / 86)) - 8 * fbm(x * 0.06, 3.1, 4) + 3 * Math.max(0, (10 - x) / 10);
  const rightTop = (x: number): number => 69 + 34 * dome(Math.min(1, (196 - x) / 48)) - 5 * fbm(x * 0.08, 8.3, 3) - 3 * Math.exp(-(((x - 191) / 6) ** 2));
  const farTop = (x: number): number => HZ - 1 - 6 * fbm(x * 0.035 + 2, 1.7, 3) - 3 * Math.exp(-(((x - 120) / 18) ** 2));
  // brain corals: domes on the crests
  // [x, depth of the centre below the crest, radius, kind]
  const domes = [[16, 3, 7, 0], [41, 2.5, 6.5, 1], [53, 2, 4.5, 3], [65, 2, 5, 2], [158, 2, 4, 2], [186, 3, 5, 1], [196, 3, 4.5, 3]]
    .map(([x, d, r, kind]) => [x, (x < 100 ? leftTop(x) : rightTop(x)) + d, r, kind]);
  const coral = [
    [0.86, 0.36, 0.44], [0.93, 0.55, 0.3], [0.6, 0.36, 0.72], [0.78, 0.7, 0.35],
  ];
  const rock = [0.016, 0.03, 0.042];
  // [x, crest row, half width, fog, coral kind]
  const BOMMIES = [[114, 69, 9, 0.18, 0], [94, 63.6, 4, 0.5, 2], [139, 64.4, 4, 0.42, 1]];
  const FAN_C = [167, rightTop(167) + 1.5], FAN_R = 27;
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5;
      // the sea floor, a plane running off into the haze
      if (r >= HZ + 2) {
        const d = y - HZ;
        const z = 300 / d; // distance
        // the floor is seen at a low angle, so its pattern squeezes toward the
        // haze; spacing grows as it comes nearer, and fades out before it
        // gets too fine to draw
        const near = 0.4 + 0.6 * (d / 38);
        const sx = (x + 0.5 - 100) / near;
        const sy = 30 * Math.log(d);
        const aa = smooth(2.2, 1.4, 30 / d);
        // ripples in the sand run across our view, bending a little: thin
        // bright crests over darker troughs
        const ph = sy + 7 * fbm(sx * 0.07, sy * 0.06, 2) + sx * 0.05;
        const crest = Math.pow(0.5 + 0.5 * Math.sin(ph), 3) * smooth(0.3, 0.6, fbm(sx * 0.09 + 7, sy * 0.12, 2));
        const rip = 0.74 + aa * (0.5 * crest - 0.12) + 0.12 * (fbm(sx * 0.08, sy * 0.15, 3) - 0.5);
        mat[k] = SAND;
        const lit = 0.6 + 0.15 * smooth(100, 130, x) - 0.3 * smooth(84, 100, r);
        ar[k] = 0.38 * rip * lit, ag[k] = 0.37 * rip * lit, ab[k] = 0.3 * rip * lit;
        fog[k] = 1 - Math.exp(-z / 40);
        cu[k] = sx * 0.9, cv[k] = sy * 2.3, cw[k] = 0.5 * smooth(14, 26, d);
      }
      if (y >= farTop(x) && r < HZ + 6) {
        mat[k] = FAR;
        // lit along its crest, dim below, half lost in the blue
        const s = (0.45 + 0.55 * fbm(x * 0.15, y * 0.15, 2)) * (0.5 + 0.8 * Math.exp(-(y - farTop(x)) / 2));
        ar[k] = 0.06 * s, ag[k] = 0.11 * s, ab[k] = 0.14 * s;
        fog[k] = 0.68;
        cw[k] = 0;
      }
      // the sea fan: a thin lattice of veins spreading up from its root
      {
        const dx = x + 0.5 - FAN_C[0], dy = FAN_C[1] - y;
        const d = Math.hypot(dx, dy), a = Math.atan2(dx, dy);
        const reach = FAN_R * (0.68 + 0.36 * fbm(a * 2.6 + 5, 1, 3));
        if (dy > -1 && Math.abs(a) < 1.2 && d < reach) {
          const aw = a + 0.08 * (fbm(d * 0.2, a * 2, 2) - 0.5) * 4;
          const ray = Math.abs(((aw * 7.5) / Math.PI + 100) % 1 - 0.5);
          const ring = Math.abs(((d / 3.2) + 100) % 1 - 0.5);
          const mesh = hash(x * 3, r * 5) < 0.08;
          const vein = ray > 0.42 || (ring > 0.45 && d > 5) || mesh || (d < 4 && Math.abs(dx) < 1.2) || d > reach - 1.2;
          mat[k] = FAN;
          // dark at the root, catching the light toward its rim; between the
          // veins a thin dim web the water shows through
          const o = smooth(2, reach, d);
          const s = (0.35 + 0.75 * o) * (vein ? 1 : 0.22);
          ar[k] = mix(0.32, 0.72, o) * s, ag[k] = mix(0.12, 0.38, o) * s, ab[k] = mix(0.38, 0.8, o) * s;
          fog[k] = vein ? 0.2 : 0.4;
          cw[k] = 0;
        }
      }
      // small coral heads out on the sand, half lost in the blue
      for (const [bx, crest, hw, f0, kind] of BOMMIES) {
        const u = (x + 0.5 - bx) / hw;
        const top = crest + u * u * u * u * hw * 0.5 - 1.6 * fbm(x * 0.35, crest, 2);
        if (Math.abs(u) < 1.1 && y >= top && y < crest + hw * 0.5 + 1.5 * fbm(x * 0.3, crest + 5, 2) - 0.6 * u * u) {
          mat[k] = REEF;
          const below = y - top;
          const living = smooth(2.2, 0.6, below) * smooth(0.45, 0.6, fbm(x * 0.25 + bx, y * 0.3, 2));
          const lit = 0.3 + 0.6 * Math.exp(-below / 1.5);
          const [cr0, cg0, cb0] = coral[kind];
          ar[k] = mix(rock[0], cr0, living) * lit;
          ag[k] = mix(rock[1], cg0, living) * lit;
          ab[k] = mix(rock[2], cb0, living) * lit;
          fog[k] = f0;
          cu[k] = x * 0.5, cv[k] = y * 0.9, cw[k] = 0.5 * Math.exp(-below / 1.5);
        }
      }
      // reef masses, left and right: dark rock, rimmed with lit coral
      const tl = leftTop(x), tr = rightTop(x);
      const top = x < 100 ? tl : tr;
      if (y >= top && (x < 87 || x > 147)) {
        mat[k] = REEF;
        const below = y - top;
        const n = fbm(x * 0.18, y * 0.22, 4);
        // lumps of rock and coral heads, each lit on its upper side
        const lump = fbm(x * 0.07, y * 0.1, 3), lumpUp = fbm(x * 0.07, (y - 1.5) * 0.1, 3);
        const face = clamp(0.5 + (lumpUp - lump) * 14);
        const lit = (0.25 + 0.5 * face + 0.6 * Math.exp(-below / 5) + 0.14 * (n - 0.5)) * (0.55 + 0.45 * smooth(100, 40, r));
        // patches of living coral, thick along the crest, a few sponges below
        const kind = Math.floor(fbm(x * 0.06 + 11, y * 0.09, 3) * 7) % 4;
        const patch = fbm(x * 0.12 + 4, y * 0.12, 3);
        const living = Math.max(smooth(0.44, 0.56, patch) * smooth(7, 1.5, below),smooth(0.66, 0.72, patch) * 0.35 * smooth(24, 6, below));
        const [cr0, cg0, cb0] = coral[kind];
        // a cool rim of light along the bare rock of the crest
        const rim = smooth(2.4, 0.3, below) * 0.6;
        // and the upper lips of ledges down the face catch a little of it
        const ledge = smooth(0.66, 0.9, face) * smooth(3, 8, below) * 0.55;
        const rr = mix(mix(rock[0], 0.05, ledge), 0.12, rim), rg = mix(mix(rock[1], 0.11, ledge), 0.24, rim), rb = mix(mix(rock[2], 0.13, ledge), 0.25, rim);
        ar[k] = mix(rr, cr0, living) * lit;
        ag[k] = mix(rg, cg0, living) * lit;
        ab[k] = mix(rb, cb0, living) * lit;
        fog[k] = x < 100 ? 0.04 + 0.04 * smooth(0, 80, x) : 0.08;
        cu[k] = x * 0.5, cv[k] = y * 0.9, cw[k] = 0.8 * Math.exp(-below / 1.5);
      }
      for (const [dx0, dy0, dr, kind] of domes) {
        const dx = x + 0.5 - dx0, dy = y - dy0;
        const d = Math.hypot(dx, dy * 1.25);
        if (d < dr && dy < dr * 0.3) {
          mat[k] = REEF;
          const nz = Math.sqrt(Math.max(0, 1 - (d / dr) ** 2));
          const lamb = clamp(0.15 + 0.85 * (nz * 0.6 - (dy / dr) * 0.55 + (dx / dr) * 0.25));
          const groove = 0.75 + 0.25 * Math.sin(d * 2.4 + 2 * fbm(x * 0.3, y * 0.3, 2) * 3);
          const [cr0, cg0, cb0] = coral[(kind + 1) % 4];
          const s = (0.15 + 0.9 * lamb) * groove;
          ar[k] = cr0 * s, ag[k] = cg0 * s, ab[k] = cb0 * s;
          fog[k] = dx0 < 100 ? 0.04 + 0.04 * smooth(0, 80, dx0) : 0.08;
          cu[k] = x * 0.5, cv[k] = y * 0.9, cw[k] = 0.5 * clamp(-dy / dr + 0.6);
        }
      }
    }
  }
  // branching coral standing up off both crests
  for (const [seed, count, x0, span, topAt] of [[31, 10, 3, 60, leftTop], [53, 3, 178, 20, rightTop]] satisfies [seed: number, count: number, x0: number, span: number, topAt: (x: number) => number][]) {
    const rnd = prng(seed);
    for (let i = 0; i < count; i++) {
      const bx = x0 + rnd() * span;
      if (Math.abs(bx - FAN_C[0]) < 3) continue; // leave the fan's root clear
      const base = topAt(bx);
      const h = 2 + rnd() * 3.5;
      const lean = (rnd() - 0.5) * 0.5;
      const kind = rnd() < 0.5 ? 1 : 3;
      for (let s = 0; s < h; s += 0.5) {
        const x = Math.round(bx + lean * s + (s > h * 0.55 ? (i % 2 ? 1 : -1) * (s - h * 0.55) * 0.6 : 0));
        const r = Math.round(base - s);
        if (x < 0 || x >= W || r < 0) continue;
        const k = r * W + x;
        mat[k] = REEF;
        const tip = s / h;
        const [cr0, cg0, cb0] = coral[kind];
        const sh = 0.4 + 0.6 * tip;
        ar[k] = cr0 * sh, ag[k] = cg0 * sh, ab[k] = cb0 * sh;
        fog[k] = 0.06;
        cu[k] = x * 0.5, cv[k] = r * 0.9, cw[k] = 0.4;
      }
    }
  }
  // the water's colour filters what is behind it: reds go first
  const br = new Float32Array(N), bg = new Float32Array(N), bb = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    if (mat[k] === NONE) {
      br[k] = wr[k], bg[k] = wg[k], bb[k] = wb[k];
      continue;
    }
    const f = fog[k];
    const tint = 1 - f;
    const ex = 1.9; // shallow water: the reef takes plenty of light
    br[k] = mix(ar[k] * ex * (0.55 + 0.45 * tint), wr[k], f);
    bg[k] = mix(ag[k] * ex * (0.85 + 0.15 * tint), wg[k], f);
    bb[k] = mix(ab[k] * ex, wb[k], f);
  }

  // --- the moving things, laid out once ------------------------------------
  const rnd = prng(1234);
  const gauss = (): number => {
    let s = 0;
    for (let i = 0; i < 4; i++) s += rnd();
    return (s - 2) * 1.7;
  };
  const fish: { a: number; b: number; ph: number; sp: number }[] = [];
  for (let i = 0; i < 150; i++) fish.push({ a: gauss() * 10, b: gauss() * 3.8, ph: rnd() * 6.28, sp: 0.8 + rnd() * 0.6 });
  // kelp: x, base row, length, width, phase, and how much water hides it
  const kelp: { bx: number; base: number; len: number; sz: number; ph: number; haze: number }[] = [];
  for (const [bx, base, len, sz, ph, haze] of [
    [14, 100, 96, 3.5, 0.0, 0], [189, 100, 96, 3.5, 5.2, 0],
  ])
    kelp.push({ bx, base, len, sz, ph, haze });
  const streams = [[44, 52, 8], [168, 66, 7], [116, 96, 6]];
  const bubbles: { x0: number; y0: number; ph: number; sp: number; w: number }[] = [];
  for (const [x0, y0, n] of streams) for (let i = 0; i < n; i++) bubbles.push({ x0, y0, ph: rnd(), sp: 4 + rnd() * 3, w: rnd() * 6.28 });
  const snow: { x: number; y: number; sp: number; ph: number; b: number }[] = [];
  for (let i = 0; i < 90; i++) snow.push({ x: rnd() * W, y: rnd() * H, sp: 0.3 + rnd() * 0.7, ph: rnd() * 6.28, b: 0.12 + rnd() * 0.22 });

  // --- each frame ------------------------------------------------------------
  const cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N), floor = new Float32Array(N);
  const rays = new Float32Array(RAYS);
  const out: string[] = new Array(N);
  const add = (x: number, r: number, R: number, G: number, B: number) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    cr[k] += R, cg[k] += G, cb[k] += B;
  };
  const put = (x: number, r: number, R: number, G: number, B: number, a: number) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    cr[k] = mix(cr[k], R, a), cg[k] = mix(cg[k], G, a), cb[k] = mix(cb[k], B, a);
  };

  return (t, { color } = {}) => {
    // shafts: a slow pattern across the surface, shimmering as the waves pass,
    // strongest straight under the sun
    for (let u = 0; u < RAYS; u++) {
      const s = Math.pow(smooth(0.5, 0.62, fbm(u * 0.06 + t * 0.025, 3.3, 3)), 1.2);
      const shimmer = 0.6 + 0.4 * noise(u * 0.18 - t * 0.7, t * 0.3);
      rays[u] = s * shimmer * (0.35 + 0.65 * Math.exp(-(((u - RAY0) / 60) ** 2)));
    }
    const cx0 = t * 0.9, cy0 = t * 0.35, cx1 = -t * 0.6 + 21, cy1 = t * 0.5 + 9;
    // the sun's blaze wobbles as the swell passes over it
    const hx = SUNX + 1.6 * Math.sin(t * 0.6) + 0.8 * Math.sin(t * 1.7 + 1);

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      const depthFade = Math.exp(-r / 30) * smooth(0, 14, r + 6);
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let R = br[k], G = bg[k], B = bb[k];
        const m = mat[k];
        const ray = rays[rayAt[k]] * depthFade;
        if (m === NONE) {
          if (r < SURF + 6) {
            // the underside of the surface: a rippling ceiling, pressed flat toward the haze
            const dist = SURF + 7 - y;
            const q = 30 / dist;
            const a = causAt(((x - 100) / dist) * 1.6 + t * 1.6, q * 6 + t * 0.8);
            const b2 = causAt(((x - 100) / dist) * 1.2 - t * 1.1 + 31, q * 4.5 - t * 0.6 + 17);
            const lit = Math.pow(smooth(SURF + 6, 0, y), 1.3);
            const c = Math.pow(Math.max(a, b2), 1.6);
            const near = Math.exp(-(((x - hx) / 34) ** 2));
            // troughs darken the water under them, crests focus light into lines
            const dim = 1 - lit * 0.7 * (1 - c);
            R *= dim, G *= dim, B *= dim;
            const v = lit * c * (0.1 + 0.42 * near);
            // the sun: a compact blaze through the surface, broken by the ripples
            const dx = x + 0.5 - hx;
            const hot = Math.exp(-((dx / 8) ** 2) - (((y - 6) / 3.6) ** 2)) * (1 + 0.3 * c);
            const halo = Math.exp(-((dx / 15) ** 2) - (((y - 6) / 7) ** 2)) * 0.3 * (0.6 + 0.6 * c);
            R += 0.55 * v + 0.9 * hot + 0.35 * halo;
            G += 0.85 * v + 1.0 * hot + 0.6 * halo;
            B += 0.8 * v + 0.97 * hot + 0.58 * halo;
          }
          R += 0.42 * ray, G += 0.86 * ray, B += 0.78 * ray;
          floor[k] = 0;
        } else {
          const f = fog[k];
          if (cw[k] > 0) {
            const c = Math.min(causAt(cu[k] + cx0, cv[k] + cy0), 1) * 0.6 + causAt(cu[k] * 0.8 + cx1, cv[k] * 0.8 + cy1) * 0.6;
            const s = cw[k] * c * c * (1 - f) * (0.6 + 0.6 * ray + 0.3 * depthFade);
            // on the sand the light comes back warm, on the reef cool
            if (m === SAND) R += 0.62 * s, G += 0.66 * s, B += 0.5 * s;
            else R += 0.55 * s, G += 0.72 * s, B += 0.62 * s;
          }
          R += 0.16 * ray * f, G += 0.3 * ray * f, B += 0.28 * ray * f;
          floor[k] = 0.02;
        }
        cr[k] = R, cg[k] = G, cb[k] = B;
      }
    }

    // the school: one body turning along a slow loop, each fish a beat behind
    const pathX = (s: number): number => 95 + 24 * Math.sin(0.11 * s + 0.4);
    const pathY = (s: number): number => 44 + 8 * Math.sin(0.17 * s + 2.2);
    for (const f of fish) {
      const s = t - f.a * 0.08;
      const vx = 24 * 0.11 * Math.cos(0.11 * s + 0.4), vy = 8 * 0.17 * Math.cos(0.17 * s + 2.2);
      const th = Math.atan2(vy, vx);
      const ct = Math.cos(th), st = Math.sin(th);
      const wob = Math.sin(t * 1.3 * f.sp + f.ph);
      const px = pathX(s) + f.a * ct - f.b * st + wob * 0.6;
      const py = pathY(s) + f.a * st + f.b * ct + Math.cos(t * f.sp + f.ph) * 0.4;
      const h = th + 0.15 * wob;
      const dx = Math.cos(h), dy = Math.sin(h);
      // dark shapes against the light, until a fish turns its silver flank to it
      const flash = smooth(0.72, 0.97, Math.abs(Math.sin(th * 1.6 + f.a * 0.35 + f.b * 0.4 - t * 0.5 + 0.6)));
      const R0 = mix(0.008, 0.85, flash), G0 = mix(0.018, 0.97, flash), B0 = mix(0.026, 1.0, flash);
      for (let j = 0; j < 2; j++) {
        const gx = Math.round(px - dx * j * 0.9), gy = Math.round(py - dy * j * 0.9);
        put(gx, gy, R0, G0, B0, j === 0 ? 1 : 0.85);
      }
    }

    // kelp: dark fronds framing the view, a gold edge only where a shaft hits
    for (const kp of kelp) {
      const { bx, base, len, sz, ph, haze } = kp;
      const side = bx < 100 ? 1 : -1; // which way the sun lies
      for (let r = base - 1; r >= base - len; r--) {
        if (r < 0) break;
        const s01 = (base - r) / len;
        const lean = side * 2.5 * sz * s01 * s01;
        // the swell runs up the frond, so it bends in an S rather than tipping like a stick
        const bend = Math.sin(t * 0.55 + ph - s01 * 4.2) * 2.2 * sz * Math.pow(s01, 1.2) + Math.sin(t * 0.21 + ph) * 1.5 * s01 + lean;
        const x = bx + bend;
        // the frond: a stipe with blades off alternate sides, each blade a lobe
        // that swells and tapers, trailing a little behind the stipe's sway
        const stem = 0.8 + 0.4 * sz * (1 - s01);
        const beat = s01 * len * 0.32 + ph;
        const lobeL = Math.pow(Math.max(0, Math.sin(beat)), 1.2) * sz * 2.3 * (1 - 0.35 * s01);
        const lobeR = Math.pow(Math.max(0, -Math.sin(beat)), 1.2) * sz * 2.3 * (1 - 0.35 * s01);
        const drag = Math.cos(t * 0.55 + ph - s01 * 4.2) * 0.8 * sz;
        const x0 = x - stem - lobeL + Math.min(0, drag), x1 = x + stem + lobeR + Math.max(0, drag);
        const ray = rays[rayAt[r * W + Math.max(0, Math.min(W - 1, Math.round(x)))]] * Math.exp(-r / 30);
        const lit = smooth(0.3, 0.6, ray);
        const xa = Math.round(x0), xb = Math.round(x1);
        for (let xx = xa; xx <= xb; xx++) {
          if (xx < 0 || xx >= W) continue;
          const k = r * W + xx;
          // backlit: dark through the middle, the edges glowing, the sun-facing
          // edge most of all and gold where a shaft catches it
          const sun = side > 0 ? xx === xb : xx === xa;
          const rim = xx === xa || xx === xb;
          const blade = Math.abs(xx - x) > stem ? 1 : 0;
          // the stipe is black, the blades let a little olive light through
          const through = blade * 0.12 * smooth(0, 1, Math.abs(xx - x) - stem) * (0.5 + 0.5 * hash(xx * 7, r * 3));
          const g = 0.02 + through + (rim ? 0.16 : 0) + (sun ? 0.34 + 0.66 * lit * (0.4 + 0.6 * blade) : 0);
          put(xx, r, mix(0.62 * g, wr[k], haze), mix(0.58 * g, wg[k], haze), mix(0.18 * g, wb[k], haze), 1);
          floor[k] = 0.02;
        }
      }
    }

    // bubbles: wobbling up to the surface, growing as they rise
    for (const b of bubbles) {
      const span = b.y0 - SURF;
      const p = ((t * b.sp) / span + b.ph) % 1;
      const y = b.y0 - p * span;
      const x = b.x0 + Math.sin(y * 0.35 + b.w) * 1.2 + p * 3;
      const v = 0.55 + 0.45 * p;
      add(Math.round(x), Math.round(y), 0.7 * v, 0.95 * v, 1.0 * v);
    }
    // specks drifting in the water
    for (const s of snow) {
      const x = (((s.x + t * s.sp + 2 * Math.sin(t * 0.3 + s.ph)) % W) + W) % W;
      const y = (((s.y + t * s.sp * 0.4) % H) + H) % H;
      add(Math.floor(x), Math.floor(y), s.b * 0.7, s.b * 0.9, s.b);
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const R = cr[k], G = cg[k], B = cb[k];
        const peak = Math.max(R, G, B, 1e-4);
        const level = clamp(floor[k] + (1 - floor[k]) * Math.pow(peak, 0.85) * 0.95);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(R * s), clamp(G * s), clamp(B * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
