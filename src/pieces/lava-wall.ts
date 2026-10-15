/*
 * lava wall: the lobby wall of lava lamps that Cloudflare films for entropy.
 * Shelves of lamps fill the dark room, a little larger toward us, each with
 * its own wax rising, stretching, splitting and sinking. The orange cloud
 * hangs over them as a backlit sign, and a camera on a tripod watches.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lava wall",
  category: "scenes",
  note: "a wall of lava lamps under the glowing orange cloud, watched by a camera",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  loop: 30,
  ground: "#08070a",
  palette: [
    "#16121a", "#221c22", "#33282a", "#4a3a32", "#6e5442", "#9a7658",
    "#404041", "#707074", "#a9a9ae", "#e8e4de",
    "#5c1616", "#9e211d", "#dc362b", "#ff6a52",
    "#7c3510", "#c4570f", "#f38020", "#faae40", "#ffd27c", "#fff1c8",
    "#e6c02a",
    "#0f3a3c", "#18786f", "#43d6c0",
    "#2f1842", "#6b2f92", "#b45ddc", "#e2508c",
    "#1d3768", "#3f80d2",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 30;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const WALL = 0, GLASS = 1, METAL = 2, SHELF = 3, LIP = 4, SIGN = 5, CAM = 6, LENS = 7;

// The cloud from the library's own cloudflare piece. Its text cells are twice
// as tall as wide, so each is read as two square halves, top and bottom.
const LOGO = String.raw`

                                  ._ppp8888888qqq_,
                               _pp88888888888888888q_,
                             _p88888888888888888888888q,
                           .p888888888888888888888888888p
                          _888888888888888888888888888888q,
                __ppqqqq__88888888888888888888888888888888q,
              _p8888888888888888888888888888888888888888888p
             q888888888888888888888888888888888888888888888P pqqqq__
            .888888888888888888888888888888888888888888888P q88888888q_,
            :888888888888888888888888888888888888888888888'.888888888888q,
        _pppq8888888888888888888888888888888888888888888P  '88888888888888_
     _p88888888888888888888888888888888888888888888888"'    "88888888888888p
   .p88888888888888888P""""""""""""""""""""""""""""'          '"""""""888888,
  .p8888888888888888888888888888888888888888888qqqqq_      _pppq888888888888b
  q88888888888888888888888888888888888888888888888888p   _p888888888888888888
  8888888888888888888888888888888888888888888888888888 .p88888888888888888888
  888888888888888888888888888888888888888888888888888" d88888888888888888888P

`;
// How much of the top and the bottom half of a cell each character fills.
const HALVES: Record<string, [number, number]> = {
  "8": [1, 1], b: [1, 1], d: [1, 1], p: [0.5, 1], q: [0.5, 1], P: [1, 0.5],
  _: [0, 0.6], ",": [0, 0.5], ".": [0, 0.5], "'": [0.7, 0], '"': [1, 0], ":": [0.8, 0.8],
};

// The wax and the liquid of each kind of lamp: mostly warm, a few cool.
const KINDS: [number[], number[]][] = [
  [[1, 0.2, 0.14], [0.55, 0.36, 0.08]], // red in amber
  [[1, 0.52, 0.12], [0.5, 0.1, 0.12]], // orange in red
  [[1, 0.82, 0.22], [0.55, 0.2, 0.05]], // yellow in orange
  [[0.95, 0.16, 0.12], [0.6, 0.5, 0.12]], // red in yellow
  [[1, 0.6, 0.18], [0.42, 0.14, 0.05]], // tangerine in brown
  [[0.26, 0.86, 0.75], [0.07, 0.17, 0.38]], // teal in blue
  [[0.75, 0.36, 0.9], [0.14, 0.07, 0.32]], // purple in indigo
  [[1, 0.32, 0.55], [0.3, 0.08, 0.32]], // pink in plum
];
const WARM = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];

// Shelves, back to front: lamp scale and the row the lamp tops start on.
const SHELVES = [
  { s: 0.85, top: 9 },
  { s: 1.0, top: 30 },
  { s: 1.15, top: 50.5 },
  { s: 1.3, top: 74 },
];
const LAMP_H = 16; // a lamp's height in lamp units: base 0..4, glass 4..14, cap above
const GLASS_LO = 4, GLASS_HI = 14;
const SIGN_W = 62, SIGN_X = 100 - SIGN_W / 2, SIGN_Y = 1;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// A lamp's half width at height v, in lamp units: a cone of a base, the
// bottle swelling low and narrowing up, and a small cap.
function halfWidth(v: number): number {
  if (v < 0) return -1;
  if (v < GLASS_LO) return v < 0.5 ? 3.2 : 3.0 - 1.1 * (v / GLASS_LO);
  if (v < GLASS_HI) {
    const g = (v - GLASS_LO) / (GLASS_HI - GLASS_LO);
    return 2.0 + 0.9 * smooth(0, 0.3, g) - 1.55 * smooth(0.3, 1, g);
  }
  if (v < LAMP_H) return 1.35 - 0.55 * ((v - GLASS_HI) / (LAMP_H - GLASS_HI)) - (v > LAMP_H - 0.6 ? 0.3 : 0);
  return -1;
}

// Box blur in place, horizontally then vertically, radius r.
function blur(a: Float32Array, r: number): void {
  const tmp = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += a[y * W + Math.min(W - 1, Math.max(0, x + d))];
      tmp[y * W + x] = s / (2 * r + 1);
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += tmp[Math.min(H - 1, Math.max(0, y + d)) * W + x];
      a[y * W + x] = s / (2 * r + 1);
    }
}

export default function lavaWall(): Frame {
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

  // --- the logo as a mask of square half cells ----------------------------
  const rows = LOGO.slice(1, -1).split("\n");
  const GW = 79, GH = rows.length * 2;
  const cov = new Float32Array(GW * GH);
  const back = new Uint8Array(GW * GH);
  // The small cloud behind is everything right of the seam between the two,
  // found row by row as the space inside the ink, and bridged where it closes.
  const seam: number[] = rows.map((line) => {
    const first = line.search(/\S/), last = line.trimEnd().length - 1;
    let at = -1;
    for (let x = first + 1; x < last; x++) if (line[x] === " ") at = x;
    return at;
  });
  for (let y = 0; y < rows.length; y++) {
    if (seam[y] >= 0 || y < 8) continue;
    let a = y - 1, b = y + 1;
    while (b < rows.length && seam[b] < 0) b++;
    seam[y] = b < rows.length ? (seam[a] + seam[b]) / 2 : seam[a];
  }
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < GW; x++) {
      const h = HALVES[rows[y][x] ?? " "] ?? [0, 0];
      const isBack = y >= 8 && seam[y] >= 0 && x > seam[y] ? 1 : 0;
      cov[2 * y * GW + x] = h[0];
      cov[(2 * y + 1) * GW + x] = h[1];
      back[2 * y * GW + x] = back[(2 * y + 1) * GW + x] = isBack;
    }
  const logoAt = (gx: number, gy: number) => {
    const xi = Math.floor(gx), yi = Math.floor(gy);
    const fx = gx - xi, fy = gy - yi;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= GW || y >= GH ? 0 : cov[y * GW + x]);
    return mix(mix(at(xi, yi), at(xi + 1, yi), fx), mix(at(xi, yi + 1), at(xi + 1, yi + 1), fx), fy);
  };
  const LK = SIGN_W / 76; // cells for one half cell of the logo
  const signCov = new Float32Array(N);
  const signBack = new Uint8Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const gx = 1.5 + (x + 0.5 - SIGN_X) / LK, gy = 2 + (r + 0.5 - SIGN_Y) / LK;
      if (gx < -1 || gy < -1 || gx > GW || gy > GH) continue;
      // four samples a cell, for a clean edge
      let c = 0;
      for (const [ox, oy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]])
        c += logoAt(gx - 0.5 + ox / LK, gy - 0.5 + oy / LK);
      signCov[r * W + x] = smooth(0.35, 0.7, c / 4);
      const bx = Math.round(gx - 0.5), by = Math.round(gy - 0.5);
      if (bx >= 0 && by >= 0 && bx < GW && by < GH) signBack[r * W + x] = back[by * GW + bx];
    }
  // the sign's glow on the wall, close and wide
  const haloNear = Float32Array.from(signCov), haloFar = Float32Array.from(signCov);
  blur(haloNear, 2), blur(haloNear, 2);
  blur(haloFar, 7), blur(haloFar, 7);

  // --- the lamps --------------------------------------------------------
  type Lamp = { cx: number; bottom: number; s: number; wax: number[]; liq: number[]; glow: number[]; blobs: number[][] };
  const lamps: Lamp[] = [];
  const mat = new Uint8Array(N);
  const lampOf = new Int16Array(N).fill(-1);
  const lu = new Float32Array(N), lv = new Float32Array(N);
  const shelfOf = new Int8Array(N).fill(-1);
  SHELVES.forEach(({ s, top }, j) => {
    const bottom = top + LAMP_H * s;
    const sp = 10.5 * s;
    for (let i = -12; i <= 12; i++) {
      const cx = 100 + (i + (j % 2) * 0.5 - 0.25) * sp;
      if (cx < -5 || cx > W + 5) continue;
      if (j === 0 && Math.abs(cx - 100) < SIGN_W / 2 + 5) continue; // the sign hangs here
      const h = hash(i + 40, j + 7);
      const kind = h < 0.78 ? WARM[Math.floor(hash(i, j * 13) * WARM.length)] : 5 + Math.floor(hash(j, i * 5) * 3);
      const [wax, liq] = KINDS[kind];
      // a resting pool at the bottom, a smaller one under the cap, and three
      // blobs that rise and sink, each on a period that divides the loop
      const blobs: number[][] = [[0, 4.5, 2.0, 0.5, 0, 0], [0, 13.7, 1.0, 0.6, 0, 0]];
      for (let b = 0; b < 3; b++) {
        const q = hash(i * 31 + b, j * 17 + 3);
        blobs.push([1 + Math.floor(q * 3), hash(b, i * 7 + j), 0.8 + 0.45 * hash(i + b * 9, j), 1, hash(i * 3, b + j * 11), 1]);
      }
      const glow = wax.map((w, c) => 0.65 * w + 0.5 * liq[c]);
      lamps.push({ cx, bottom, s, wax, liq, glow, blobs });
    }
    // the shelf under them
    for (let r = Math.floor(bottom); r < Math.min(H, bottom + 2.3 * s + 1); r++)
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        if (y >= bottom && y < bottom + 2.3 * s) {
          mat[k] = y < bottom + 0.7 ? LIP : SHELF;
          shelfOf[k] = j;
        }
      }
  });
  lamps.forEach((L, id) => {
    const { cx, bottom, s } = L;
    for (let r = Math.floor(bottom - LAMP_H * s); r < Math.ceil(bottom); r++)
      for (let x = Math.floor(cx - 3.5 * s); x <= Math.ceil(cx + 3.5 * s); x++) {
        if (r < 0 || r >= H || x < 0 || x >= W) continue;
        const k = r * W + x;
        const v = (bottom - (r + 0.5)) / s, u = (x + 0.5 - cx) / s;
        const hw = halfWidth(v);
        if (hw < 0 || Math.abs(u) > hw) continue;
        mat[k] = v >= GLASS_LO && v < GLASS_HI ? GLASS : METAL;
        lampOf[k] = id;
        lu[k] = u / hw;
        lv[k] = v;
      }
  });

  // Light spilled by every lamp onto the wall and shelves, from the length of
  // its glass, kept out from under the shelf above.
  const spill = new Float32Array(N * 3);
  for (const L of lamps) {
    const y0 = L.bottom - GLASS_HI * L.s, y1 = L.bottom - GLASS_LO * L.s;
    const reach = 5 * L.s;
    for (let r = Math.max(0, Math.floor(y0 - 26)); r < Math.min(H, y1 + 14); r++) {
      const y = r + 0.5;
      const dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
      for (let x = Math.max(0, Math.floor(L.cx - 26)); x < Math.min(W, L.cx + 26); x++) {
        const dx = x + 0.5 - L.cx;
        const d = Math.sqrt(dx * dx + dy * dy * 1.6);
        const e = Math.exp(-d / reach) * 0.6 + Math.exp(-d / (reach * 3)) * 0.04;
        const k = r * W + x;
        spill[k * 3] += L.glow[0] * e;
        spill[k * 3 + 1] += L.glow[1] * e;
        spill[k * 3 + 2] += L.glow[2] * e;
      }
    }
  }

  // --- the camera on its tripod, a silhouette in front ------------------
  const camRim = new Float32Array(N);
  const inCam = (x: number, y: number): number => {
    // the body seen from behind, corners rounded, the screen on its back
    const bx = Math.max(0, Math.abs(x - 168) - 16), by = Math.max(0, Math.abs(y - 73) - 6.5);
    if (bx * bx + by * by < 4) return x >= 154 && x < 176 && y >= 67.5 && y < 79 ? LENS : CAM;
    // the prism hump on top, and the dials either side of it
    if (y >= 59.5 && y < 66 && Math.abs(x - 166) < 5.5 + (y - 59.5) * 0.45) return CAM;
    if (y >= 63.5 && y < 66 && ((x >= 153 && x < 158) || (x >= 177 && x < 182))) return CAM;
    if (x >= 162 && x < 174 && y >= 80 && y < 86) return CAM; // the tripod head
    // the legs, splayed from the head to the floor
    for (const fx of [138, 200]) {
      const k = (y - 85) / 15;
      if (k >= 0 && k <= 1.1 && Math.abs(x - mix(168, fx, k)) < 1.3 + 0.5 * k) return CAM;
    }
    if (y >= 85 && Math.abs(x - 168) < 1) return CAM; // the centre column
    return 0;
  };
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const c = inCam(x + 0.5, r + 0.5);
      if (!c) continue;
      mat[r * W + x] = c;
      // a rim of lamplight on the edges facing the wall
      const open =
        (inCam(x + 0.5, r - 0.5) ? 0 : 1) + (inCam(x - 0.5, r + 0.5) ? 0 : 0.7) + (inCam(x + 1.5, r + 0.5) ? 0 : 0.7) + (inCam(x + 0.5, r + 1.5) ? 0 : 0.4);
      camRim[r * W + x] = Math.min(1, open);
    }
  const SIGN_C = [0.953, 0.502, 0.125], BACK_C = [0.98, 0.682, 0.251];
  // The screen on its back shows what it films, tiny: the cloud, and under
  // it a row of lamps in the colours of the real ones on a shelf.
  const screen = new Float32Array(N * 3);
  const MINI = 10 / 76;
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      if (mat[r * W + x] !== LENS) continue;
      const k = r * W + x;
      const row = r - 67, col = x - 154;
      let c = [0.025, 0.035, 0.07];
      const sc = smooth(0.3, 0.6, logoAt(1.5 + (col + 0.5 - 6) / MINI - 0.5, 2 + (row + 0.5 - 0.6) / MINI - 0.5));
      if (sc > 0) c = (row > 2 && col > 11 ? BACK_C : SIGN_C).map((v) => v * sc + 0.02);
      if (row >= 6 && row < 9 && col % 3 !== 2) {
        const L = lamps[Math.floor(hash(Math.floor(col / 3), 3) * lamps.length)];
        const g = row === 6 ? 0.5 : 1;
        c = L.glow.map((v) => v * g);
      } else if (row === 9) c = [0.2, 0.11, 0.07];
      (screen[k * 3] = c[0]), (screen[k * 3 + 1] = c[1]), (screen[k * 3 + 2] = c[2]);
    }
  for (let k = 0; k < N; k++) if (signCov[k] > 0.02 && mat[k] !== CAM && mat[k] !== LENS) mat[k] = SIGN;

  const NB = 5; // two pools and three blobs a lamp
  const blobX = new Float32Array(lamps.length * NB), blobY = new Float32Array(lamps.length * NB);
  const blobR = new Float32Array(lamps.length * NB), blobS = new Float32Array(lamps.length * NB);

  return (t, { color } = {}) => {
    const tt = ((t % LOOP) + LOOP) % LOOP;
    // the glint crossing the sign every ten seconds
    const glintAt = ((tt % 10) / 2.2) * (SIGN_W + 40) + SIGN_X - 20;
    const hum = 0.96 + 0.04 * Math.sin((tt / LOOP) * Math.PI * 2 * 6);
    // where every lamp's wax is now
    lamps.forEach((L, id) => {
      for (let b = 0; b < NB; b++) {
        const B = L.blobs[b], i = id * NB + b;
        if (B[5] === 0) {
          (blobX[i] = 0), (blobY[i] = B[1]), (blobR[i] = B[2] * B[2]), (blobS[i] = 1 / B[3]);
          continue;
        }
        const a = ((tt / LOOP) * B[0] + B[1]) * Math.PI * 2;
        const by = 5.3 + (0.5 - 0.5 * Math.cos(a)) * 7.2;
        const hw = halfWidth(by);
        const br = B[2] * (0.8 + 0.2 * Math.sin(a * 0.5 + B[4]) ** 2) * Math.min(1, hw / 2.2);
        blobX[i] = 0.45 * hw * Math.sin(a * 2 + B[4] * 6.28);
        blobY[i] = by;
        blobR[i] = br * br;
        blobS[i] = 1 / (1 + 0.75 * Math.abs(Math.sin(a))); // drawn out while it moves fast
      }
    });

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const y = r + 0.5;
        const m = mat[k];
        let cr = 0, cg = 0, cb = 0, floor = 0;

        // the room: the dark wall, the lamps' light on it, and the sign's
        const sr = spill[k * 3], sg = spill[k * 3 + 1], sb = spill[k * 3 + 2];
        const hn = haloNear[k], hf = haloFar[k];
        // a ring of glow round the sign, kept out of the seams inside it
        const halo = hf * 0.3 * (1 - 0.85 * smooth(0.15, 0.6, hn)) * hum;
        const wr = 0.006 + sr * 0.075 + halo * SIGN_C[0];
        const wg = 0.005 + sg * 0.075 + halo * SIGN_C[1];
        const wb = 0.008 + sb * 0.075 + halo * SIGN_C[2];

        if (m === WALL || m === SIGN) {
          // faint panel seams on the wall
          const seamV = (x % 25 === 0 ? 0.6 : 1) * (0.92 + 0.08 * hash(x >> 2, r >> 3));
          (cr = wr * seamV), (cg = wg * seamV), (cb = wb * seamV);
          if (m === SIGN) {
            const c = signCov[k];
            const C = signBack[k] ? BACK_C : SIGN_C;
            // backlit: lit full and even, as a lightbox is
            let lum = 1.3 * hum;
            const g = Math.abs(x + 0.5 + (y - SIGN_Y) * 0.6 - glintAt);
            const glint = g < 5 ? 1 - smooth(0, 5, g) : 0;
            lum += 0.35 * glint;
            const fr = Math.min(1.2, C[0] * lum + glint * 0.25), fg = Math.min(1.2, C[1] * lum + glint * 0.3), fb = C[2] * lum + glint * 0.25;
            (cr = mix(cr, fr, c)), (cg = mix(cg, fg, c)), (cb = mix(cb, fb, c));
            floor = 0.2 * c;
          }
        } else if (m === GLASS || m === METAL) {
          const id = lampOf[k];
          const L = lamps[id];
          const u = lu[k], v = lv[k];
          if (m === GLASS) {
            const g = (v - GLASS_LO) / (GLASS_HI - GLASS_LO);
            const px = u * halfWidth(v);
            let f = 0;
            for (let i = id * NB; i < id * NB + NB; i++) {
              const dx = px - blobX[i], dy = (v - blobY[i]) * blobS[i];
              f += blobR[i] / (dx * dx + dy * dy + 0.05);
            }
            // the liquid, lit by the bulb below, darker toward the glass edge
            const bulb = 0.3 + 0.6 * Math.exp(-g * 2.4);
            const rim = 1 - 0.5 * smooth(0.55, 1, Math.abs(u));
            (cr = L.liq[0] * bulb * rim), (cg = L.liq[1] * bulb * rim), (cb = L.liq[2] * bulb * rim);
            // the wax, glowing hotter where it is thick and low
            const wax = smooth(0.8, 1.25, f);
            const wl = (0.62 + 0.45 * Math.exp(-g * 1.6) + 0.2 * clamp(f - 1.4)) * (0.75 + 0.25 * rim);
            (cr = mix(cr, L.wax[0] * wl, wax)), (cg = mix(cg, L.wax[1] * wl, wax)), (cb = mix(cb, L.wax[2] * wl, wax));
            // a sheen down the glass on the left
            const sheen = Math.exp(-(((u + 0.5) / 0.14) ** 2)) * 0.28 * smooth(0.95, 0.1, g);
            (cr += sheen), (cg += sheen), (cb += sheen * 1.05);
            floor = 0.3;
          } else {
            // brushed metal, a round highlight, and the glass's colour where it
            // meets the bottle
            const hl = Math.exp(-(((u + 0.3) / 0.3) ** 2));
            const near = v < GLASS_LO ? smooth(GLASS_LO - 2, GLASS_LO, v) : smooth(GLASS_HI + 1.6, GLASS_HI, v);
            const base = 0.4 + 0.3 * (1 - u * u) + 0.45 * hl + 0.35 * near;
            (cr = 0.12 * hl + L.glow[0] * base * 0.4), (cg = 0.12 * hl + L.glow[1] * base * 0.4), (cb = 0.13 * hl + L.glow[2] * base * 0.4);
            floor = 0.25;
          }
        } else if (m === LIP || m === SHELF) {
          // the shelf's top edge catches the lamps; its face is in their glow
          const j = shelfOf[k];
          const lit = m === LIP ? 0.95 : 0.32;
          const grain = 0.9 + 0.1 * hash(x >> 1, r * 7 + j);
          cr = (0.07 + sr * lit) * grain;
          cg = (0.05 + sg * lit * 0.92) * grain;
          cb = (0.04 + sb * lit * 0.85) * grain;
          floor = 0.08;
        } else if (m === CAM || m === LENS) {
          const rim = camRim[k];
          // black, with a cool edge of light where it faces the glow
          const e = rim * (0.9 + 0.6 * smooth(85, 70, y));
          cr = 0.012 + (sr * 0.5 + 0.05) * e;
          cg = 0.012 + (sg * 0.5 + 0.05) * e;
          cb = 0.016 + (sb * 0.5 + 0.06) * e;
          if (m === CAM && (x === 179 || x === 181) && (r === 72 || r === 75)) (cr = 0.16), (cg = 0.15), (cb = 0.15); // buttons
          if (m === LENS) {
            const s = 0.9 + 0.1 * hum;
            (cr = screen[k * 3] * s), (cg = screen[k * 3 + 1] * s), (cb = screen[k * 3 + 2] * s);
          }
          if (x === 180 && r === 68) {
            // the tally light, recording
            const on = Math.sin(tt * Math.PI * 2) > -0.2;
            (cr = on ? 1 : 0.3), (cg = on ? 0.22 : 0.06), (cb = on ? 0.18 : 0.05);
          }
        }

        // the room falls off toward the corners and the floor
        const vx = (x - 100) / 100, vy = (y - 46) / 62;
        const vig = 1 - 0.4 * (vx * vx + vy * vy);
        if (m !== CAM && m !== LENS && m !== SIGN) (cr *= vig), (cg *= vig), (cb *= vig);

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
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
