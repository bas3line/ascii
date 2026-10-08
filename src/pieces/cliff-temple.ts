/*
 * cliff temple: a domed temple on a sea cliff, drawn like a hand-coloured
 * engraving. Cypresses stand by it, a road winds down the headland, a sailboat
 * crosses the bay under heaped cumulus, and gulls wheel over the cliff.
 *
 * Every stroke is a character, as an engraver's would be a line. Each cell is
 * looked at in two by four parts: where a shape's edge crosses it, it takes a
 * stroke along the edge, or the character whose shape matches it; inside a
 * shape, it is hatched as that shape is: the sky ruled in dots, the clouds
 * shaded in them under lit tops, the hills along their slopes, the sea in level
 * lines that thicken towards the shore, the rock in upright strokes and the
 * woods in round ones, each in its own ink over cream paper. The land is drawn
 * once; each frame redraws what moves: the clouds, the sea, the boat, the gulls.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cliff temple",
  category: "scenes",
  note: "a domed temple on a sea cliff, drawn like a hand-coloured engraving",
  cols: 176,
  rows: 44,
  fps: 12,
  ground: "#f2ead8",
  // Inks deep enough that a character's thin strokes still carry their colour when the picture is drawn small.
  palette: [
    // sky, palest to deepest
    "#9db7d6", "#819fcb", "#6889bd", "#5374ad",
    // clouds: shading, deeper shading, outline
    "#8f9cb4", "#7584a0", "#5d6b89",
    // hills in haze, near to far
    "#6c679a", "#837dae", "#9893c0",
    // sea, palest to deepest
    "#7db1c5", "#5d9bb7", "#4384a5", "#2e6c91", "#21587d", "#173f5c",
    // rock, palest to deepest
    "#c49752", "#ae7f3c", "#93682f", "#785225", "#5a3c1b", "#3d2913",
    // woods and grass, palest to deepest
    "#95a853", "#789242", "#5d7834", "#466129", "#32481f", "#213316",
    // cypress, lit to dark
    "#3f5c32", "#2b4426", "#1b2d19",
    // temple: stone, shade, dome, dome shade, openings, cross
    "#c4ad7e", "#977f52", "#b5552b", "#83381e", "#3d2e21", "#2d241d",
    // road edge, boat hull, sail
    "#9a7c52", "#5a391f", "#86704f",
    // gulls, foam
    "#3a3a41", "#7aadc0",
  ],
} satisfies Meta;

const W = 176, H = 44;
// parts of a cell looked at: two across, four down
const SX = 2, SY = 4;
const HORIZON = 0.585;
// a unit of u is this many units of v, on the page
const AR = (W * 0.6) / (H * 1.2);

// palette indices
const SKY = 0, CLOUD = 4, CLOUD_LINE = 6, HILL = 7, SEA = 10, ROCK = 16, WOOD = 22, CYPRESS = 28;
const STONE = 31, SHADE = 32, DOME = 33, DOME_SHADE = 34, OPENING = 35, CROSS = 36;
const ROAD_EDGE = 37, HULL = 38, SAIL = 39, GULL = 40, FOAM = 41;

// What each character inks in two by four parts of its cell, against the inkiest part of any, as the site's mono face
// draws it; measured the way the companies generator measures them.
const GLYPHS: [string, number[]][] = [
  [".", [0, 0, 0, 0, 0.16, 0.16, 0.1, 0.1]],
  [",", [0, 0, 0, 0, 0.14, 0.18, 0.41, 0.09]],
  [":", [0, 0, 0.26, 0.26, 0.16, 0.16, 0.1, 0.1]],
  ["'", [0.11, 0.11, 0.21, 0.21, 0, 0, 0, 0]],
  ["^", [0.09, 0.09, 0.72, 0.75, 0.11, 0.11, 0, 0]],
  ["-", [0, 0, 0, 0, 0.37, 0.37, 0, 0]],
  ["_", [0, 0, 0, 0, 0, 0, 0.54, 0.54]],
  ["~", [0, 0, 0.28, 0.09, 0.4, 0.59, 0, 0]],
  ["=", [0, 0, 0.49, 0.49, 0.49, 0.49, 0, 0]],
  ["/", [0, 0.24, 0.02, 0.63, 0.55, 0.1, 0.41, 0]],
  ["\\", [0.24, 0, 0.63, 0.02, 0.1, 0.55, 0, 0.41]],
  ["|", [0.12, 0.12, 0.32, 0.32, 0.32, 0.32, 0.2, 0.2]],
  ["(", [0, 0.26, 0.47, 0.17, 0.6, 0.04, 0.03, 0.4]],
  [")", [0.26, 0, 0.17, 0.47, 0.04, 0.6, 0.4, 0.03]],
  ["d", [0, 0.22, 0.63, 0.94, 0.84, 0.84, 0.24, 0.22]],
  ["b", [0.22, 0, 0.94, 0.63, 0.84, 0.84, 0.22, 0.24]],
  ["q", [0, 0, 0.63, 0.62, 0.84, 0.84, 0.24, 0.7]],
  ["p", [0, 0, 0.62, 0.63, 0.84, 0.84, 0.7, 0.24]],
  ["P", [0.32, 0.22, 0.93, 1, 0.96, 0.23, 0.12, 0]],
  ["Y", [0.14, 0.14, 0.83, 0.82, 0.43, 0.43, 0.06, 0.06]],
  ["o", [0, 0, 0.55, 0.55, 0.8, 0.8, 0.2, 0.2]],
  ["O", [0.21, 0.21, 0.84, 0.84, 0.84, 0.84, 0.2, 0.2]],
  ["0", [0.21, 0.21, 0.92, 0.92, 0.92, 0.92, 0.2, 0.2]],
  ["8", [0.24, 0.24, 0.92, 0.92, 0.93, 0.93, 0.24, 0.23]],
  ["[", [0.25, 0.38, 0.63, 0, 0.63, 0, 0.4, 0.38]],
  ["]", [0.38, 0.25, 0, 0.63, 0, 0.63, 0.38, 0.4]],
];

// the character whose ink best matches a cell's eight parts, or none when nothing matches better than paper
function match(c: ArrayLike<number>): string {
  let best = " ", bd = 0;
  for (let i = 0; i < 8; i++) bd += c[i] * c[i];
  for (const [ch, v] of GLYPHS) {
    let d = 0;
    for (let i = 0; i < 8; i++) d += (c[i] - v[i]) ** 2;
    if (d < bd) (bd = d), (best = ch);
  }
  return best;
}

// An outline through a cell, from which of its eight parts lie outside the shape: a stroke along the edge, at right
// angles to where the outside is.
function stroke(outside: ArrayLike<number>): string {
  let dx = 0, dy = 0, n = 0;
  for (let j = 0; j < SY; j++)
    for (let i = 0; i < SX; i++)
      if (outside[j * SX + i]) (dx += i - 0.5), (dy += (j - 1.5) / 2), n++;
  if (!n) return " ";
  const a = Math.atan2(dy, dx) / Math.PI; // 0 right, 0.5 down, -0.5 up
  if (a > -0.125 && a <= 0.125) return ")";
  if (a > 0.125 && a <= 0.375) return "/";
  if (a > 0.375 && a <= 0.625) return "_";
  if (a > 0.625 && a <= 0.875) return "\\";
  if (a > 0.875 || a <= -0.875) return "(";
  if (a > -0.875 && a <= -0.625) return "/";
  if (a > -0.625 && a <= -0.375) return "-";
  return "\\";
}

// A cloud's outline, which is all curves: its sides in brackets, its billowed top in dots and dashes, its base ruled.
function curl(outside: ArrayLike<number>, x: number): string {
  let dx = 0, dy = 0, n = 0;
  for (let j = 0; j < SY; j++)
    for (let i = 0; i < SX; i++)
      if (outside[j * SX + i]) (dx += i - 0.5), (dy += (j - 1.5) / 2), n++;
  if (!n) return " ";
  const a = Math.atan2(dy, dx) / Math.PI;
  if (a > 0.3 && a < 0.7) return x % 4 === 3 ? "." : "_";
  if (a < -0.35 && a > -0.65) return x % 3 ? "-" : ".";
  return Math.abs(a) > 0.5 ? "(" : ")";
}

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
const bump = (u: number, c: number, w: number) => Math.exp(-(((u - c) / w) ** 2));
// one of n inks in a run, by tone
const ink = (first: number, n: number, k: number) => first + Math.min(n - 1, Math.max(0, Math.floor(k * n)));
// one of a ramp's characters, by tone
const ramp = (set: string, k: number) => set[Math.min(set.length - 1, Math.max(0, Math.floor(k * set.length)))];

// --- the land, in u (0 left, 1 right) and v (0 top, 1 bottom) ---------------------------------------------

// the hills' crest: far ridges across the bay, and a nearer hill behind the temple
const crest = (u: number) =>
  HORIZON -
  Math.max(0, 0.14 * bump(u, 0.52, 0.15) + 0.075 * bump(u, 0.29, 0.09) + 0.045 * bump(u, 0.13, 0.06) + 0.085 * bump(u, 0.93, 0.1) + 0.04 * bump(u, 0.74, 0.06) + 0.02 * (fbm(u * 16, 3.1, 3) - 0.5) - 0.008);

// the plateau the temple stands on, rising a little to the right
const plateau = (u: number) => 0.6 - 0.035 * smooth(0.7, 1, u) + 0.003 * Math.sin(u * 47);

// the top of the land: the low shelf on the left, the cliff's edge rising to the plateau
function top(u: number): number {
  if (u < 0.34) return 2;
  if (u < 0.47) return 0.672 - 0.028 * smooth(0.34, 0.47, u) + 0.014 * (fbm(u * 60, 7.3, 2) - 0.5);
  if (u < 0.61) return mix(0.644, plateau(0.61), smooth(0.47, 0.61, u)) + 0.008 * (fbm(u * 50, 2.2, 2) - 0.5);
  return plateau(u);
}

// the cliff's face: from its left edge, leaning out to the left as it falls, to its right one
const faceLeft = (v: number) => 0.475 - (v - 0.64) * 0.3 + 0.012 * (fbm(v * 30, 5.5, 2) - 0.5);
const faceRight = (v: number) => 0.66 - (v - 0.6) * 0.1 + 0.01 * (fbm(v * 25, 9.1, 2) - 0.5);
// the shelf's foot, where its own low cliff meets the sea
const shelfFoot = (u: number) => 0.765 + 0.025 * smooth(0.34, 0.46, u) + 0.012 * (fbm(u * 40, 4.4, 2) - 0.5);

// the road from the temple's door, round to the right and down the slope: its middle and half its width
function road(v: number): [number, number] {
  const k = smooth(0.6, 1.04, v);
  return [0.79 + 0.17 * Math.sin(k * 2.5) - 0.07 * k * k, 0.006 + 0.032 * k];
}

// cypresses: where they stand and how tall, in v
const CYPRESSES = [
  { u: 0.665, h: 0.2 },
  { u: 0.688, h: 0.13 },
  { u: 0.868, h: 0.22 },
  { u: 0.902, h: 0.14 },
  { u: 0.952, h: 0.17 },
];

// Layers of the land. Sky and sea are drawn each frame.
const SKY_L = 1, SEA_L = 2, HILL_L = 3, ROCK_L = 4, WOOD_L = 5, GRASS_L = 6, ROAD_L = 7, CYP_L = 8, SLOPE_L = 9;

// What a point of the scene is, and how much ink it takes there, 0 paper to 1 the deepest.
function land(u: number, v: number): [number, number] {
  // the cypresses, flames of dark green, over all
  for (const c of CYPRESSES) {
    const foot = plateau(c.u), a = (foot - v) / c.h;
    if (a < 0 || a > 1) continue;
    const half = (0.0085 * Math.sin(Math.PI * Math.min(1, (1 - a) * 1.18)) ** 0.85 + 0.0015) * (c.h / 0.2);
    if (Math.abs(u - c.u) < half) return [CYP_L, 0.7 + 0.3 * smooth(-half, half, u - c.u)];
  }
  const t = top(u), n = fbm(u * W * 0.13, v * H * 0.27, 3);
  if (v < t) {
    if (v < crest(u)) return [SKY_L, 0];
    if (v >= HORIZON) return [SEA_L, 0];
    // the hills: hazier far off and high up
    const c = crest(u), depth = (v - c) / Math.max(0.01, HORIZON - c);
    const slope = (crest(u + 0.004) - crest(u - 0.004)) / 0.008;
    return [HILL_L, clamp(0.42 + 0.22 * depth + (slope > 0 ? 0.14 : -0.1) + 0.3 * (n - 0.5))];
  }
  const fl = faceLeft(v), fr = faceRight(v), foot = shelfFoot(u);
  if (u >= 0.34 && u < fl) {
    if (v >= foot) return [SEA_L, 0];
    // the shelf's own low cliff, just above its foot
    if (v > foot - 0.035) return [ROCK_L, clamp(0.45 + 0.35 * smooth(foot - 0.035, foot, v) + 0.4 * (n - 0.5))];
  }
  if (v > t + 0.016 && u >= fl && u <= fr && v > 0.62) {
    // the rock face: darker low down and in its clefts, lit on its left
    const cleft = fbm(u * W * 0.45, v * H * 0.06, 2);
    return [ROCK_L, clamp(0.05 + 0.4 * smooth(0.62, 1, v) + 0.8 * (cleft - 0.5) + 0.25 * ((u - fl) / (fr - fl)) + 0.15 * (n - 0.5))];
  }
  const [rc, rw] = road(v);
  if (u > fr && v > t + 0.012 && Math.abs(u - rc) < rw) return [ROAD_L, 0];
  if (v < t + 0.03 || (u >= 0.34 && u < fl)) {
    // grass on the tops, bushes in clumps
    const clump = fbm(u * W * 0.22, v * H * 0.45, 3);
    return [GRASS_L, clamp((clump - 0.45) * 2.6)];
  }
  // the slope to the right of the face: woods and rock, deeper towards the foot
  const clump = fbm(u * W * 0.2, v * H * 0.4, 3);
  return [SLOPE_L, clamp(0.08 + 0.6 * smooth(0.62, 1, v) + 1.1 * (clump - 0.5) + 0.2 * (n - 0.5))];
}

// --- the parts drawn by hand ---------------------------------------------------------------------------

// The temple. Each row says what it is, which says each character's ink.
const TEMPLE: [string, string][] = [
  ["cross", "       +"],
  ["lantern", "      (_)"],
  ["dome", "    .-'^'-."],
  ["dome", "   / : : : \\"],
  ["dome", "  /_:_:_:_:_\\"],
  ["drum", "  |=========|"],
  ["drum", "  |() () ()||"],
  ["portico", " /___________\\"],
  ["portico", " | | | | | | |"],
  ["base", "[_|_|_|_|_|_|_]"],
];

const HOUSE: [string, string][] = [
  ["roof", "  ____"],
  ["roof", " /___/\\"],
  ["drum", " |[]|[|"],
];

// a part's ink: openings dark, the right of the dome and the stone in shade
function partInk(what: string, ch: string, right: boolean): number {
  if (what === "cross") return CROSS;
  if ("()[]".includes(ch) && what !== "base" && what !== "lantern") return OPENING;
  if (what === "dome" || what === "roof") return right && ch !== "_" ? DOME_SHADE : DOME;
  return right ? SHADE : STONE;
}

const BOAT: [string, string][] = [
  ["sail", " |\\"],
  ["sail", " |_\\"],
  ["hull", "\\___/"],
];

// the clouds: cumulus banks, heaps of puffs on flat bases, drifting right, in u and v
interface Bank { u: number; base: number; width: number; height: number; speed: number }
const BANKS: Bank[] = [
  { u: 0.22, base: 0.44, width: 0.085, height: 0.22, speed: 0.0011 },
  { u: 0.06, base: 0.3, width: 0.03, height: 0.06, speed: 0.0015 },
  { u: 0.81, base: 0.38, width: 0.1, height: 0.33, speed: 0.0009 },
  { u: 0.47, base: 0.31, width: 0.035, height: 0.07, speed: 0.0013 },
  { u: 0.63, base: 0.17, width: 0.025, height: 0.05, speed: 0.0012 },
];

// A bank drawn once on its own grid of parts: whether each part is cloud, and how deep its shade. Its shape is a dome
// on a flat base, its edge broken into billows by noise. Light comes from the upper left: a part's shade is how far it
// lies inside the cloud on the way to the light, so the tops and the left are bare paper, the lower right in dots, and
// the whole bank deepens towards its base.
function bank(b: Bank, seed: number) {
  const halfW = Math.ceil(b.width * 1.3 * W * SX), h = Math.ceil(b.height * 1.35 * H * SY);
  const w = 2 * halfW;
  const inside = new Uint8Array(w * h), shade = new Float32Array(w * h);
  // in page units, v-sized, from the middle of the bank's base
  const page = (i: number, j: number): [number, number] => [((i - halfW + 0.5) / (W * SX)) * AR, (j - h + 0.5) / (H * SY)];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const [px, py] = page(i, j);
      const across = px / (b.width * AR), up = -py / b.height;
      const dome = 1 - across * across - up * up * 0.9;
      // billows the size of a few cells, and smaller ones on them
      const billow = fbm((px + seed * 3.1) * 15, py * 15 + seed, 3) - 0.5;
      if (dome + 1.1 * billow > 0.15) inside[j * w + i] = 1;
    }
  // how many parts in from the edge, towards the light (up and to the left)
  const steps = Math.round(0.035 * H * SY);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!inside[k]) continue;
      let d = 0;
      while (d < steps) {
        const ii = i - Math.round(d * 0.8), jj = j - d;
        if (ii < 0 || jj < 0 || !inside[jj * w + ii]) break;
        d++;
      }
      const [, py] = page(i, j);
      shade[k] = clamp((d / steps) * 0.6 + 0.4 * smooth(-b.height * 0.4, 0, py) - 0.2);
    }
  return { w, h, inside, shade, left: Math.round(b.u * W * SX) - halfW, topRow: Math.round(b.base * H * SY) - h };
}

export default function cliffTemple(): Frame {
  const N = W * H;
  const chars = new Array<string>(N).fill(" ");
  const inks = new Uint8Array(N);
  // what each cell is, for what is drawn each frame: 0 drawn once, 1 sky, 2 sea
  const kind = new Uint8Array(N);
  const parts = new Float32Array(8), out8 = new Uint8Array(8);

  // --- the land, once -------------------------------------------------------------------------------------
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let skyParts = 0, seaParts = 0, layer = 0, sum = 0, inked = 0;
      const counts = new Map<number, number>();
      for (let j = 0; j < SY; j++)
        for (let q = 0; q < SX; q++) {
          const [l, k] = land((x + (q + 0.5) / SX) / W, (y + (j + 0.5) / SY) / H);
          const p = j * SX + q;
          if (l === SKY_L) skyParts++;
          if (l === SEA_L) seaParts++;
          const open = l === SKY_L || l === SEA_L || l === ROAD_L;
          parts[p] = open ? 0 : 0.35 + 0.65 * k;
          out8[p] = open ? 1 : 0;
          if (!open) (sum += k), inked++, counts.set(l, (counts.get(l) ?? 0) + 1);
          else counts.set(l, (counts.get(l) ?? 0) + 0.5);
        }
      if (skyParts === 8) {
        kind[i] = 1;
        continue;
      }
      if (seaParts === 8) {
        kind[i] = 2;
        continue;
      }
      let most = -1;
      for (const [l, c] of counts) if (c > most && l !== SKY_L && l !== SEA_L) (most = c), (layer = l);
      const k = inked ? sum / inked : 0;
      const u = (x + 0.5) / W, v = (y + 0.5) / H, grain = hash(x, y);
      if (inked > 0 && inked < 8) {
        // an edge through the cell: against sky, sea or road, a stroke for the hills and the matching shape for the rest
        chars[i] = layer === HILL_L ? stroke(out8) : match(parts);
        if (chars[i] === " ") chars[i] = stroke(out8);
      } else if (layer === ROAD_L) {
        chars[i] = grain < 0.1 ? "." : " ";
      } else if (layer === HILL_L) {
        const slope = (crest(u + 0.004) - crest(u - 0.004)) / 0.008;
        const s = slope < -0.3 ? "/" : slope > 0.3 ? "\\" : "^";
        chars[i] = k < 0.28 ? (grain < 0.45 ? "." : " ") : k < 0.42 ? ":" : k < 0.6 ? s : grain < 0.6 ? "A" : s;
      } else if (layer === ROCK_L) {
        chars[i] = ramp(" ..''|||!I1[]#", k);
        if (chars[i] === " " && grain < 0.5) chars[i] = "'";
      } else if (layer === GRASS_L) {
        chars[i] = k < 0.12 ? (grain < 0.3 ? "," : grain < 0.5 ? "." : " ") : ramp(" .,oOO08", k);
      } else if (layer === CYP_L) {
        chars[i] = grain < 0.5 ? "8" : "%";
      } else {
        // the slope: woods in round strokes, rock in crossed ones, as the engraver's X and 0
        const woods = fbm(x * 0.17, y * 0.33, 2) > 0.48;
        chars[i] = woods ? ramp("  .oo0088@", k) : ramp("  .:xxX%#", k);
        layer = woods ? WOOD_L : ROCK_L;
      }
      inks[i] =
        layer === HILL_L ? ink(HILL, 3, 1 - (0.35 + 0.65 * (v - 0.44) / 0.15)) :
        layer === ROCK_L ? ink(ROCK, 6, k) :
        layer === GRASS_L || layer === WOOD_L ? ink(WOOD, 6, 0.1 + 0.9 * k) :
        layer === CYP_L ? CYPRESS + Math.min(2, Math.floor(k * 3)) :
        layer === ROAD_L ? ROAD_EDGE :
        ink(WOOD, 6, k);
      if (layer === ROAD_L && chars[i] !== " ") inks[i] = ROAD_EDGE;
    }

  // the temple and the house, over the land
  const place = (art: [string, string][], cu: number, baseRow: number) => {
    const w = Math.max(...art.map(([, line]) => line.length));
    const x0 = Math.round(cu * W - w / 2), y0 = baseRow - art.length + 1, mid = w / 2;
    art.forEach(([what, line], r) => {
      for (let c = 0; c < line.length; c++) {
        const x = x0 + c, y = y0 + r, ch = line[c];
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const i = y * W + x;
        // inside the outline the building is solid: its blanks are wall, not the land behind
        const inside = line.slice(0, c).trimStart().length > 0 && line.slice(c + 1).trim().length > 0;
        if (ch === " " && !inside) continue;
        chars[i] = ch;
        inks[i] = partInk(what, ch, c > mid + 1);
        kind[i] = 0;
      }
    });
  };
  place(TEMPLE, 0.765, Math.round(plateau(0.765) * H));
  place(HOUSE, 0.93, Math.round(plateau(0.93) * H));

  const clouds = BANKS.map((b, s) => ({ ...b, ...bank(b, s + 1) }));
  const SPAN = W * SX * 1.4;
  const out = new Array<string>(N);
  const GULLS = [
    { u: 0.57, v: 0.24, phase: 0 },
    { u: 0.61, v: 0.28, phase: 1.7 },
    { u: 0.4, v: 0.19, phase: 3.1 },
  ];

  return (t, { color } = {}) => {
    // where each bank is now, drifting right and coming round again
    const at = clouds.map((c) => {
      const left = c.left + c.speed * t * W * SX;
      return ((((left + c.w) % SPAN) + SPAN) % SPAN) - c.w;
    });
    const cloudPart = (sx: number, sy: number): number => {
      // the front-most bank with cloud here: its shade, or -1
      for (let b = clouds.length - 1; b >= 0; b--) {
        const c = clouds[b], lx = Math.floor(sx - at[b]), ly = sy - c.topRow;
        if (lx < 0 || lx >= c.w || ly < 0 || ly >= c.h) continue;
        const k = ly * c.w + lx;
        if (c.inside[k]) return c.shade[k];
      }
      return -1;
    };

    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x, v = (y + 0.5) / H;
        const k = kind[i];
        if (k === 0) {
          out[i] = chars[i];
          if (color) color[i] = inks[i];
          continue;
        }
        if (k === 1) {
          let n = 0, sum = 0;
          for (let j = 0; j < SY; j++)
            for (let q = 0; q < SX; q++) {
              const s = cloudPart(x * SX + q, y * SY + j), p = j * SX + q;
              out8[p] = s < 0 ? 1 : 0;
              if (s >= 0) (n++, (sum += s));
            }
          if (n === 8) {
            // inside a cloud: lit paper, stippled in dots lower down
            const s = sum / 8 + 0.15 * (hash(x, y) - 0.5);
            out[i] = s < 0.35 ? " " : s < 0.55 ? ((x + y) % 3 ? " " : ".") : s < 0.72 ? (x % 2 ? " " : ".") : x % 2 ? "." : ":";
            if (color) color[i] = CLOUD + (s < 0.62 ? 0 : 1);
          } else if (n > 0) {
            // its outline
            out[i] = curl(out8, x);
            if (color) color[i] = CLOUD_LINE;
          } else {
            // the sky: a ruled grid of dots, deeper overhead
            const deep = 1 - v / HORIZON;
            out[i] = x % 2 ? " " : deep < 0.15 ? (hash(x, y) < 0.3 ? "." : " ") : deep < 0.75 ? "." : ":";
            if (color) color[i] = ink(SKY, 4, deep * 0.8);
          }
          continue;
        }
        // the sea: level lines, closer and heavier towards the shore, broken where the swell catches the light
        const depth = clamp((v - HORIZON) / (1 - HORIZON));
        const swell = Math.sin(x * 0.19 + y * 2.3 + t * 0.9 + 6 * fbm(x * 0.05, y * 0.4 + t * 0.05, 2));
        const kk = clamp(0.12 + 0.8 * depth + 0.2 * swell * (0.4 + depth));
        let ch = kk < 0.22 ? (y % 2 || hash(x, y) < 0.5 ? " " : "-") : kk < 0.45 ? (y % 2 ? " " : "-") : kk < 0.7 ? "-" : "=";
        if (swell > 0.8) ch = " ";
        out[i] = ch;
        if (color) color[i] = ink(SEA, 6, kk);
      }

    // the horizon, ruled
    const hy = Math.floor(HORIZON * H);
    for (let x = 0; x < W; x++) {
      const i = hy * W + x;
      if (kind[i] === 2 && out[i] === " " && x % 3 !== 2) {
        out[i] = "_";
        if (color) color[i] = SEA + 2;
      }
    }

    // foam along the foot of the rock, coming and going
    for (let y = hy + 1; y < H; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (kind[i] !== 2 || kind[i + 1] !== 0) continue;
        const swash = Math.sin(t * 1.3 + y * 0.8);
        if (swash > -0.4) {
          out[i] = "~";
          if (color) color[i] = FOAM;
          if (swash > 0.45 && kind[i - 1] === 2) {
            out[i - 1] = "~";
            if (color) color[i - 1] = FOAM;
          }
        }
      }

    // the sailboat, crossing slowly, and its reflection
    const bx = Math.round((0.14 + 0.06 * Math.sin(t * 0.04)) * W), by = Math.round(0.668 * H);
    BOAT.forEach(([what, line], r) => {
      for (let c = 0; c < line.length; c++) {
        if (line[c] === " ") continue;
        const x = bx + c, y = by - BOAT.length + 1 + r;
        if (x < 0 || x >= W || y < 0 || y >= H || kind[y * W + x] !== 2) continue;
        const i = y * W + x;
        out[i] = line[c];
        if (color) color[i] = what === "sail" ? SAIL : HULL;
      }
    });
    for (let c = 1; c < 6; c++) {
      const x = bx + c, i = (by + 1) * W + x;
      if (x >= 0 && x < W && by + 1 < H && kind[i] === 2 && Math.sin(t * 2 + c) > -0.2) {
        out[i] = c % 2 ? "~" : "-";
        if (color) color[i] = SEA + 3;
      }
    }

    // gulls, wheeling: wings up, wings level
    for (const g of GULLS) {
      const gx = Math.round((g.u + 0.04 * Math.sin(t * 0.13 + g.phase)) * W);
      const gy = Math.round((g.v + 0.02 * Math.sin(t * 0.31 + g.phase)) * H);
      const i = gy * W + gx;
      if (gx > 0 && gx < W && gy > 0 && gy < H && kind[i] === 1) {
        out[i] = Math.sin(t * 4 + g.phase * 3) > 0 ? "v" : "~";
        if (color) color[i] = GULL;
      }
    }

    let s = "";
    for (let y = 0; y < H; y++) {
      s += out.slice(y * W, (y + 1) * W).join("");
      if (y < H - 1) s += "\n";
    }
    return s;
  };
}
