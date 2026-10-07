/*
 * marine drive: the queen's necklace seen from malabar hill at night. A string
 * of sodium lamps sweeps round the bay to the towers at nariman point, cars
 * trail light along the road beneath them, and the bay carries their long
 * wavering reflections. Ships ride at anchor on the horizon.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: a dot whose size is
 * the cell's brightness, ordered-dithered, in the palette colour nearest its hue.
 * Everything along the curve is placed by distance along it, so buildings,
 * lamps and cars shrink together toward the point.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "marine drive",
  category: "scenes",
  note: "mumbai's queen's necklace at night, lamps curving round the bay",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#07080f",
  palette: [
    "#18213f", "#202c55", "#2a396d", "#374a88", "#4a60a2", "#6880bc",
    "#2c2140", "#3f2d58", "#56396b", "#6e4a7a", "#8a5f88",
    "#5a2e3c", "#7b404c", "#9e5858",
    "#55300f", "#7d4515", "#a95c1b", "#d27a24", "#ee9631", "#ffb246", "#ffcd6a", "#ffe39c", "#fff2cf",
    "#ffffff", "#dce6ff", "#a9bde8",
    "#6a181b", "#b22a28", "#ff4b3e",
    "#132c38", "#1c3f4f", "#2a5868",
    "#29283a", "#3c3a4c", "#565266", "#79738a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 40; // the sea horizon
const TIP = 176; // nariman point, where the necklace ends
const MOON = [189, 13];
const MOON_R = 4.5;
// darker seas on the moon's face: [dx, dy, radius]
const MARIA = [[-1.4, -1.2, 1.6], [1.3, 0.8, 1.4], [-0.6, 2, 1.1]];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const SODIUM = [1, 0.56, 0.18];

const SKY = 0, WATER = 1, FAR = 2, TOWER = 3, FRONT = 4, ROAD = 5, WALL = 6, POLE = 7, SHIP = 8;

function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, period: number) {
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

function fbm(x: number, y: number, octaves: number, period: number) {
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

// The shoreline: steep and near at the left, flat and far toward the point.
const shoreF = (x: number) => 50 + 34 * Math.pow(Math.max(0, 1 - x / TIP), 2.2);
// How large one unit of distance along the drive looks at column x.
const scF = (x: number) => 0.5 + 1.9 * Math.pow(Math.max(0, 1 - x / TIP), 1.5);
const seaTop = (x: number) => (x <= TIP ? shoreF(x) : Math.max(HZ, 50 - (x - TIP) * 1.6));
const wallTopF = (x: number) => shoreF(x) - Math.max(1, scF(x));
const roadTopF = (x: number) => wallTopF(x) - Math.max(1, 1.5 * scF(x));
// The city's sodium glow in the sky, weaker out over the open sea.
const glowF = (x: number, y: number) => {
  const over = 0.5 + 0.5 * smooth(TIP + 24, TIP - 16, x);
  const h = Math.max(0, HZ - y);
  return over * (Math.exp(-h / 4) * 0.5 + Math.exp(-h / 12) * 0.12);
};

interface Building {
  u0: number;
  u1: number;
  floors: number;
  tone: number;
  crown: boolean;
}

export default function marineDrive(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number) => {
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

  // --- distance along the drive -----------------------------------------
  const STEP = 0.25;
  const nU = Math.ceil((TIP + 4) / STEP) + 2;
  const Utab = new Float32Array(nU);
  for (let i = 1; i < nU; i++) {
    const x = (i - 0.5) * STEP;
    const sl = (shoreF(x + 0.05) - shoreF(x - 0.05)) / 0.1;
    Utab[i] = Utab[i - 1] + (Math.sqrt(1 + sl * sl) * STEP) / scF(x);
  }
  const Uof = (x: number) => {
    const f = Math.max(0, Math.min(nU - 1.001, x / STEP));
    const i = f | 0;
    return Utab[i] + (Utab[i + 1] - Utab[i]) * (f - i);
  };
  const xOfU = (u: number) => {
    let lo = 0, hi = TIP;
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (Uof(m) < u) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  };
  const UEND = Uof(TIP);

  // --- the lamps --------------------------------------------------------
  const lamps: [number, number, number][] = [];
  for (let u = 0.6; u < UEND - 0.4; u += 3.75) {
    const lx = xOfU(u), s = scF(lx);
    lamps.push([lx, wallTopF(lx) - 2.4 * s, s]);
  }
  const FLICK = 6; // one lamp near us is failing

  // --- the front row: art deco blocks along the drive ---------------------
  const blds: Building[] = [];
  for (let u = -4; u < UEND; ) {
    const i = blds.length;
    const w = 7 + 7 * hash(i, 21);
    // art deco blocks of five to eight storeys, and towers at the near, hilly end
    const tall = Math.round(7 * smooth(26, 2, u) * (0.6 + 0.4 * hash(i, 26)));
    blds.push({ u0: u, u1: u + w, floors: 5 + Math.floor(hash(i, 22) * 4) + tall, tone: 0.75 + 0.5 * hash(i, 23), crown: hash(i, 24) > 0.45 });
    u += w + 0.4 + 1.8 * hash(i, 25);
  }
  const colU = new Float32Array(W);
  const bldAt = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) {
    colU[x] = Uof(x + 0.5);
    if (x + 0.5 > TIP) continue;
    for (let i = 0; i < blds.length; i++) if (colU[x] >= blds[i].u0 && colU[x] < blds[i].u1) bldAt[x] = i;
  }

  // --- towers behind, a cluster at the point --------------------------------
  // [centre, half width, top row, warm light]
  const towers: [number, number, number, number][] = [
    [24, 4.5, 21, 0],
    [97, 2.5, 27, 1], [107, 2, 22, 0], [118, 3, 30, 0], [126, 2, 25, 1],
    [136, 3, 23, 0], [142.5, 2, 15, 1], [149, 3.5, 27, 0], [156, 2.5, 19, 0], [162, 3, 12, 1], [168.5, 2.5, 21, 0], [173, 2, 28, 1],
  ];

  // --- the static picture -------------------------------------------------
  const mat = new Uint8Array(N);
  const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
  const flo = new Float32Array(N);
  const lane = new Uint8Array(N); // 1 far lane, 2 near lane, 3 both
  const skyGlow = new Float32Array(N);
  const flick: [number, number, number, number, number, number, number][] = []; // rooms whose light changes: [cell, r, g, b, kind, rate, phase]
  const beacons: [number, number][] = []; // red lights on the tallest towers: [cell, phase]

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const xc = x + 0.5, y = r + 0.5;
      if (y >= seaTop(xc)) {
        mat[k] = WATER;
        continue;
      }
      let m = SKY, cr = 0, cg = 0, cb = 0, fl = 0.15;

      const blk = Math.floor((x + 40 * fbm(x * 0.02, 5, 2, 0)) / 3);
      const farTop = HZ - 0.4 - (0.4 + 5 * hash(blk, 7) ** 3) * (0.5 + 0.5 * fbm(x * 0.05, 2, 2, 0));
      if (xc < TIP + 7 && y >= farTop) {
        // the far city: low blocks in the haze, pricked with tiny lights
        m = FAR;
        const g = glowF(xc, HZ - 2);
        cr = 0.03 + 0.05 * g, cg = 0.04 + 0.03 * g, cb = 0.08 + 0.02 * g;
        const hl = hash(x * 3 + 1, r * 7 + 2);
        if (hl < 0.035) {
          const v = 0.25 + 0.45 * hash(x, r * 5 + 9);
          const cool = hash(x * 5, r) < 0.3;
          cr += v * (cool ? 0.8 : 1), cg += v * (cool ? 0.85 : 0.7), cb += v * (cool ? 1 : 0.4);
        }
        fl = 0.08;
      }

      for (let ti = 0; ti < towers.length; ti++) {
        const [tx, hw, top, warm] = towers[ti];
        const dx = xc - tx;
        if (Math.abs(dx) > hw || y < top) continue;
        m = TOWER;
        // dark glass, its moonward edge catching a little light
        cr = 0.015, cg = 0.018, cb = 0.035;
        if (dx > hw - 1) (cr += 0.04), (cg += 0.055), (cb += 0.1);
        const g = glowF(xc, y) * 0.2;
        cr += g * 0.42, cg += g * 0.21, cb += g * 0.1;
        const fr = r - top;
        if (fr === 0) (cr += 0.08), (cg += 0.1), (cb += 0.16); // the rooftop's edge
        else if (fr > 0 && fr % 2 === 1 && Math.abs(dx) < hw - 0.5) {
          const seg = Math.floor((xc - tx + hw) / 3);
          const h = hash(ti * 17 + seg, r * 13 + 3);
          if (h < 0.5) {
            const v = 0.4 + 0.3 * hash(ti * 7 + seg, r);
            const cool = warm ? h < 0.1 : h > 0.1;
            cr += v * (cool ? 0.72 : 1), cg += v * (cool ? 0.84 : 0.72), cb += v * (cool ? 1 : 0.42);
          }
        }
        if (fr === 0 && Math.abs(dx) < 0.6 && top < 20) beacons.push([k - W, ti * 1.7]);
        fl = 0.03;
      }

      if (xc <= TIP) {
        const s = scF(xc), wt = wallTopF(xc), rt = roadTopF(xc);
        const bi = bldAt[x];
        if (bi >= 0 && y < rt) {
          const b = blds[bi];
          const uu = colU[x] - b.u0, bw = b.u1 - b.u0;
          const f = (rt - y) / s; // height above the road, in storeys of 1.7
          let hgt = b.floors * 1.7 + 1.1;
          if (b.crown && uu > bw * 0.32 && uu < bw * 0.68) hgt += 1.6;
          if (f < hgt) {
            m = FRONT;
            const edge = uu < 0.5 || uu > bw - 0.5;
            const t0 = b.tone * (edge ? 1.35 : 1);
            // pale art deco plaster, warm where the street lamps reach it
            cr = 0.03 * t0, cg = 0.035 * t0, cb = 0.06 * t0;
            const up = Math.exp(-f / 2) * 0.16;
            cr += up * SODIUM[0], cg += up * SODIUM[1], cb += up * SODIUM[2];
            if (f > hgt - 0.6 / s || (f > b.floors * 1.7 + 0.6 && f < b.floors * 1.7 + 0.6 + 0.5 / s)) (cr += 0.1), (cg += 0.13), (cb += 0.22); // cornice, moonlit
            if (uu > bw - 0.7 / s - 0.2) (cr += 0.04), (cg += 0.06), (cb += 0.12); // the corner toward the moon
            const fi = Math.floor((f - 0.9) / 1.7);
            const ff = (f - 0.9) - fi * 1.7;
            const col = Math.floor((uu - 0.3) / 1.5);
            const cu = uu - 0.3 - col * 1.5;
            const fine = s * 1.7 >= 2.6;
            const inWin = fi >= 0 && fi < b.floors && uu > 0.7 && uu < bw - 0.7 && (fine ? ff > 0.45 && ff < 1.35 && cu > 0.35 && cu < 1.15 : true);
            if (inWin && !fine) {
              // too far to count rooms: each storey reads as a band of light,
              // broken where rooms are dark
              const v = 0.04 + 0.26 * hash(bi * 13 + Math.floor(uu / 3.2), fi * 7 + 1) ** 2;
              cr += v, cg += v * 0.8, cb += v * 0.55;
              if (hash(x * 7 + 3, r * 11) < 0.035) (cr += 0.4), (cg += 0.36), (cb += 0.28);
            } else if (inWin) {
              const h = hash(bi * 97 + col, fi * 31 + 5);
              const lit = h < (fine ? 0.3 : 0.2);
              if (lit) {
                const v = (0.35 + 0.3 * hash(bi * 13 + col, fi)) * (fine ? 1 : 0.7);
                const kind = hash(bi * 7 + col, fi * 3 + 1);
                let wr = 1, wg = 0.84, wb = 0.58; // tungsten, paler than the lamps
                if (kind < 0.25) (wr = 0.82), (wg = 0.9), (wb = 1); // tube light
                cr += v * wr, cg += v * wg, cb += v * wb;
                const fk = hash(bi * 5 + col, fi * 11 + 7);
                if (fk < 0.07) flick.push([k, v * wr, v * wg, v * wb, fk < 0.025 ? 1 : 0, 0.3 + fk * 9, fk * 400]);
              } else if (fine) {
                (cr *= 0.7), (cg *= 0.7), (cb *= 0.8);
              }
            }
            fl = 0.03;
          }
        }
        if (y >= rt && y < wt) {
          m = ROAD;
          cr = 0.07, cg = 0.05, cb = 0.05;
          fl = 0.1;
          const lf = (y - rt) / (wt - rt);
          lane[k] = wt - rt < 1.8 ? 3 : lf < 0.5 ? 1 : 2;
        } else if (y >= wt) {
          m = WALL; // the sea wall and the promenade along it
          cr = 0.1, cg = 0.09, cb = 0.1;
          fl = 0.1;
        }
        for (const [lx, ly, ls] of lamps) {
          if (ls > 1.15 && Math.abs(xc - lx) < 0.5 && y > ly && y < wt) (m = POLE), (cr = 0.09), (cg = 0.08), (cb = 0.09), (fl = 0.1);
        }
      }

      if (m === SKY) {
        // navy overhead to a sodium haze on the horizon
        const v = y / HZ;
        // brighter over the point, so its towers stand dark against the haze
        const g = glowF(xc, y) * (1 + 0.6 * smooth(84, 98, xc) * smooth(186, 174, xc)) + 0.2 * Math.exp(-Math.max(0, HZ - y) / 14) * smooth(84, 104, xc) * smooth(188, 172, xc);
        const veil = 0.88 + 0.24 * fbm(x * 0.05, r * 0.08, 3, 0);
        // the last of the blue hour, deepening overhead
        const vv = Math.pow(v, 1.4);
        cr = (0.03 + 0.07 * vv) * veil + g * 0.42;
        cg = (0.05 + 0.12 * vv) * veil + g * 0.22;
        cb = (0.15 + 0.24 * vv) * veil + g * 0.1;
        // a pale sea haze on the open horizon, for the ships to sit against
        const hzn = Math.exp(-Math.max(0, HZ - y) / 3.5) * smooth(172, 186, xc) * 0.16;
        cr += hzn * 0.6, cg += hzn * 0.7, cb += hzn * 0.95;
        // a hazy moon over the open sea
        const dmx = xc - MOON[0], dmy = y - MOON[1];
        const dm = Math.sqrt(dmx * dmx + dmy * dmy);
        const halo = Math.exp(-dm / 22) * 0.13 + Math.exp(-dm / 6) * 0.26;
        cr += halo * 0.9, cg += halo * 0.86, cb += halo * 0.8;
        // a darker ring just off the limb, so the disc's edge pops
        const ring = 0.03 * smooth(4.6, 5.6, dm) * smooth(8.5, 6.5, dm);
        cr -= ring, cg -= ring, cb -= ring * 0.8;
        if (dm < MOON_R) {
          let face = 0.9 + 0.1 * fbm(x * 0.6, r * 0.6, 2, 0);
          for (const [mx, my, mr] of MARIA) {
            const d2 = ((dmx - mx) ** 2 + (dmy - my) ** 2) / (mr * mr);
            if (d2 < 1) face -= 0.14 * (1 - d2);
          }
          const a = smooth(MOON_R, MOON_R - 0.8, dm);
          cr = mix(cr, face, a), cg = mix(cg, face * 0.95, a), cb = mix(cb, face * 0.86, a);
        }
        skyGlow[k] = g;
      }
      mat[k] = m;
      sR[k] = cr, sG[k] = cg, sB[k] = cb, flo[k] = fl;
    }
  }

  // ships riding at anchor beyond the point
  // [x, row, r, g, b]: white mastheads, warm deck and cabin lights, a red port light
  // a long freighter with its bridge aft, and a smaller boat further out
  const shipLights: [number, number, number, number, number][] = [
    [184, 35, 1, 1, 1], [190, 34, 1, 1, 1], [185, 37, 1, 0.78, 0.45], [187, 37, 1, 0.8, 0.5], [189, 36, 1, 0.82, 0.5], [191, 36, 1, 0.8, 0.5],
    [197, 36, 1, 1, 1], [196, 38, 1, 0.78, 0.45], [199, 38, 0.95, 0.22, 0.18],
  ];
  const hull = (x: number, r: number) =>
    (r >= 38 && x >= 182 && x <= 192) || (r === 37 && x >= 183 && x <= 192) || (r >= 35 && r <= 36 && x >= 189 && x <= 191) || (r >= 35 && r <= 36 && x === 184) ||
    (r >= 38 && x >= 195 && x <= 199) || (r === 37 && x >= 196 && x <= 197);
  for (let r = 34; r < 40; r++) {
    for (let x = 180; x < W; x++) {
      if (!hull(x, r)) continue;
      const k = r * W + x;
      mat[k] = SHIP, (sR[k] = 0.002), (sG[k] = 0.002), (sB[k] = 0.004), (flo[k] = 0);
    }
  }
  for (const [x, r, cr, cg, cb] of shipLights) {
    const k = r * W + x;
    mat[k] = SHIP, (sR[k] = cr), (sG[k] = cg), (sB[k] = cb), (flo[k] = 0.1);
  }

  // --- lamp light: a hot core, a halo, and a wide warm spill ----------------
  const lampI = new Float32Array(N);
  const lampW = new Float32Array(N); // the white-hot cores
  const flickI = new Float32Array(N);
  const flickW = new Float32Array(N);
  const refl = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  const reflFl = new Float32Array(N);
  lamps.forEach(([lx, ly, s], j) => {
    const core = 0.34 + 0.3 * s, halo = 0.4 + 0.4 * s, spill = 1.2 + 1.5 * s;
    const R = Math.ceil(spill * 3.2);
    const into = j === FLICK ? flickI : lampI;
    const hot = j === FLICK ? flickW : lampW;
    for (let r = Math.max(0, Math.floor(ly - R)); r < Math.min(H, ly + R); r++) {
      for (let x = Math.max(0, Math.floor(lx - R)); x < Math.min(W, lx + R); x++) {
        const k = r * W + x;
        if (mat[k] === WATER) continue;
        const dx = x + 0.5 - lx, dy = r + 0.5 - ly;
        const d = Math.sqrt(dx * dx + dy * dy);
        const c = Math.exp(-((d / core) ** 2)) * 2.2;
        into[k] += c * 0.7 + Math.exp(-d / halo) * 0.24 + Math.exp(-d / spill) * 0.02;
        hot[k] += c * 0.3;
      }
    }
    // its reflection: a long column broken by the swell, reaching toward us
    const sy = shoreF(lx);
    const wj = 0.4 + 0.7 * s, len = 2 + 8 * s;
    for (let r = Math.floor(sy); r < H; r++) {
      const dy = r + 0.5 - sy;
      if (dy < 0) continue;
      const a = Math.exp(-dy / (len * 1.7)) * (0.3 + 0.15 * s) * smooth(-0.5, 1.5, dy);
      if (a < 0.004) break;
      for (let x = Math.max(0, Math.floor(lx - 3 * wj - 1)); x < Math.min(W, lx + 3 * wj + 1); x++) {
        const k = r * W + x;
        if (mat[k] !== WATER) continue;
        const g = a * Math.exp(-(((x + 0.5 - lx) / wj) ** 2));
        if (j === FLICK) reflFl[k] += g;
        else (refl[0][k] += g * SODIUM[0]), (refl[1][k] += g * SODIUM[1]), (refl[2][k] += g * SODIUM[2]);
      }
    }
  });
  for (let k = 0; k < N; k++) {
    const m = mat[k];
    if (m === WATER || m === SKY) continue;
    sR[k] += lampI[k] * SODIUM[0] + lampW[k], sG[k] += lampI[k] * SODIUM[1] + lampW[k] * 0.95, sB[k] += lampI[k] * SODIUM[2] + lampW[k] * 0.8;
  }

  // the ships' lights stretch down the water too
  for (const [x, r0, cr, cg, cb] of shipLights) {
    for (let r = HZ; r < HZ + 14; r++) {
      const a = Math.exp(-(r - HZ) / 5) * 0.35;
      for (let dx = -1; dx <= 1; dx++) {
        const k = r * W + x + dx;
        if (x + dx >= W || mat[k] !== WATER) continue;
        const g = a * Math.exp(-dx * dx * 2.5);
        refl[0][k] += g * cr, refl[1][k] += g * cg, refl[2][k] += g * cb;
      }
    }
  }

  // The mirror: each water cell sees the picture above the shore, flipped and
  // stretched toward us, dimmed.
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] !== WATER) continue;
      const sy = seaTop(x + 0.5), d = r + 0.5 - sy;
      let ar = 0, ag = 0, ab = 0, n = 0;
      // only the lights carry across: the sky, the towers' lit floors, ships
      for (let o = 0; o < 3; o++) {
        const ym = Math.floor(sy - d * 0.55 - 0.3 - o * 0.7);
        if (ym < 0) continue;
        const q = ym * W + x;
        if (mat[q] === WATER) continue;
        n++;
        if (mat[q] === SKY) (ar += sR[q]), (ag += sG[q]), (ab += sB[q]);
        else if (mat[q] === TOWER || mat[q] === SHIP) (ar += Math.max(0, sR[q] - 0.25) * 0.6), (ag += Math.max(0, sG[q] - 0.25) * 0.6), (ab += Math.max(0, sB[q] - 0.25) * 0.6);
      }
      const a = 0.32 * Math.exp(-d / 30);
      if (n) (refl[0][k] += (ar / n) * a), (refl[1][k] += (ag / n) * a), (refl[2][k] += (ab / n) * a);
      // and a soft warm sheen off the whole lit shore
      if (x + 0.5 <= TIP + 4) {
        const sh = 0.025 * Math.exp(-d / 5) * smooth(TIP + 4, TIP - 6, x + 0.5);
        refl[0][k] += sh * SODIUM[0], refl[1][k] += sh * SODIUM[1], refl[2][k] += sh * SODIUM[2];
      }
    }
  }

  // --- clouds: low stratus lit from beneath by the city, wrapping -----------
  const CW = 800;
  const cover = new Float32Array(CW * HZ);
  const clit = new Float32Array(CW * HZ);
  const density = (x: number, y: number) => {
    const q = fbm(x * 0.01, y * 0.05, 3, 8);
    const d = fbm(x * 0.025 + q * 2.6, y * 0.07 + q * 1.3, 5, 20);
    const yb = y + 14 * (fbm(x * 0.005 + 3, 7, 2, 4) - 0.5); // the bank's edge rises and falls
    return d + 0.05 * smooth(2, 14, yb) - 0.1 * smooth(6, 0, y) - 0.1 * smooth(22, HZ - 4, yb);
  };
  for (let r = 0; r < HZ; r++) {
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5;
      const d = density(x, y);
      cover[r * CW + x] = smooth(0.47, 0.62, d) * 0.9;
      clit[r * CW + x] = clamp(0.5 + (d - density(x - 1, y + 2.5)) * 9 - (d - 0.6) * 1.4);
    }
  }

  // the sky behind the towers at the point is kept clear of low cloud, so the
  // dark glass reads against the city's haze
  const clear = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const x = (k % W) + 0.5, y = Math.floor(k / W) + 0.5;
    clear[k] = 1 - 0.9 * smooth(84, 96, x) * smooth(186, 176, x) * smooth(20, 28, y);
  }

  // --- cars ------------------------------------------------------------------
  const BIN = 0.2;
  const U0 = -6, NB = Math.ceil((UEND + 12) / BIN);
  const laneA = new Float32Array(NB), laneB = new Float32Array(NB);
  const cars: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) cars.push([hash(i, 51) * (UEND + 12), 4.2 + 1.6 * hash(i, 52), i & 1]);
  const binLo = new Int32Array(W), binHi = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    binLo[x] = Math.max(0, Math.floor((Uof(x) - U0) / BIN));
    binHi[x] = Math.min(NB - 1, Math.max(binLo[x], Math.floor((Uof(x + 1) - U0) / BIN)));
  }
  const colA = new Float32Array(W), colB = new Float32Array(W);

  return (t, { color } = {}) => {
    const drift = t * 1.3;
    // cars: tail lights heading out to the point, headlights coming home
    laneA.fill(0), laneB.fill(0);
    const span = UEND + 12;
    for (const [p0, v, dir] of cars) {
      const p = (((p0 + (dir ? -v : v) * t) % span) + span) % span;
      const into = dir ? laneB : laneA;
      const head = Math.floor(p / BIN);
      for (let i = 0; i < 26; i++) {
        const b = dir ? head + i : head - i;
        if (b < 0 || b >= NB) continue;
        const e = Math.exp(-i / 7) * (i < 2 ? 1.3 : 0.85);
        if (e > into[b]) into[b] = e;
      }
    }
    for (let x = 0; x < W; x++) {
      let a = 0, b = 0;
      for (let i = binLo[x]; i <= binHi[x]; i++) (a = Math.max(a, laneA[i])), (b = Math.max(b, laneB[i]));
      colA[x] = a, colB[x] = b;
    }
    // the failing lamp
    const sputter = Math.sin(t * 0.7) > 0.45;
    const lampOn = sputter ? (hash(Math.floor(t * 9), 77) > 0.45 ? 1 : 0.15) : 1;

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = sR[k], cg = sG[k], cb = sB[k], floor = flo[k], fade = 1;

        if (m === SKY) {
          const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
          const i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
          const c = (cover[i0] + (cover[i1] - cover[i0]) * fx) * clear[k];
          if (c > 0.01) {
            const l = clit[i0] + (clit[i1] - clit[i0]) * fx;
            const g = skyGlow[k];
            // grey-violet, warmed underneath by the city
            const dmx = x + 0.5 - MOON[0], dmy = y - MOON[1];
            const dm = Math.sqrt(dmx * dmx + dmy * dmy);
            const near = Math.exp(-dm / 16);
            const b = clamp(0.1 + l * (0.42 + 0.9 * g + 0.5 * near));
            const kr = b < 0.5 ? mix(0.05, 0.22, b * 2) : mix(0.22, 0.9, b * 2 - 1);
            const kg = b < 0.5 ? mix(0.06, 0.26, b * 2) : mix(0.26, 0.88, b * 2 - 1);
            const kb = b < 0.5 ? mix(0.15, 0.44, b * 2) : mix(0.44, 0.92, b * 2 - 1);
            // low cloud thins into the haze, so the horizon and the ships stay clear
            const a = Math.min(1, c * 1.1) * smooth(MOON_R, MOON_R + 4, dm) * (1 - 0.8 * smooth(27, 37, y));
            cr = mix(cr, kr, a), cg = mix(cg, kg, a), cb = mix(cb, kb, a);
          } else if (y < HZ - 14 && hash(x, r * 3 + 11) > 0.993) {
            const tw = 0.3 + 0.2 * Math.sin(t * (1.3 + hash(x, r) * 2.5) + hash(r, x) * 6.28);
            cr = Math.max(cr, tw * 0.9), cg = Math.max(cg, tw * 0.9), cb = Math.max(cb, tw);
          }
          const li = lampI[k], lw = lampW[k];
          cr += li * SODIUM[0] + lw, cg += li * SODIUM[1] + lw * 0.95, cb += li * SODIUM[2] + lw * 0.8;
          floor = 0.14;
        } else if (m === WATER) {
          const v = (y - HZ) / (H - HZ);
          const w = 0.6 * noise(x * 0.06 + t * 0.1, y * 0.5 - t * 0.5, 0) + 0.4 * noise(x * 0.18 - t * 0.2, y * 1.0 - t * 1.0, 0);
          const swell = 0.45 + 0.95 * w;
          // brighter toward the open sea and the moon
          const open = 0.85 + 0.3 * (x / W);
          cr = (0.05 - 0.01 * v) * swell * open, cg = (0.095 - 0.015 * v) * swell * open, cb = (0.23 - 0.03 * v) * swell * open;
          {
            // the moon's road on the open water
            const road = Math.exp(-(((x + 0.5 - MOON[0]) / (0.8 + (y - HZ) * 0.12)) ** 2));
            const glint = smooth(0.52, 0.8, 0.45 * w + 0.55 * noise(x * 0.3 + t * 0.3, y * 1.4 - t * 1.4, 0)) * road;
            cr += 0.9 * glint + 0.03 * road, cg += 0.88 * glint + 0.035 * road, cb += 0.8 * glint + 0.05 * road;
          }
          // the reflections, pushed sideways by the swell and broken into dashes
          const wob = (noise(x * 0.05 + 7, y * 0.32 - t * 0.7, 0) - 0.5) * (1.4 + 4.5 * v);
          let sx = x + wob;
          if (sx < 0) sx = 0;
          if (sx > W - 1.001) sx = W - 1.001;
          const i0 = r * W + (sx | 0), fx = sx - (sx | 0);
          const dash = 0.45 + 0.9 * smooth(0.2, 0.55, noise(x * 0.16 + 3, y * 0.85 - t * 1.3, 0));
          const ref = (a: Float32Array) => (a[i0] + (a[i0 + 1] - a[i0]) * fx) * dash;
          const fl = ref(reflFl) * lampOn;
          const rr = ref(refl[0]) + fl * SODIUM[0], rg = ref(refl[1]) + fl * SODIUM[1], rb = ref(refl[2]) + fl * SODIUM[2];
          // where the warm light lies on the water it replaces the blue, so the
          // streaks stay gold instead of mixing to pink
          const kill = 1 - 0.9 * clamp((rr - rb) * 3);
          cr = cr * kill + rr, cg = cg * kill + rg, cb = cb * kill + rb;
          floor = 0.16;
          fade = smooth(H + 6, H - 8, y);
        } else if (m === ROAD) {
          const L = lane[k];
          const a = L & 1 ? colA[x] : 0, b = L & 2 ? colB[x] : 0;
          cr += a * 0.8 + b * 1.0, cg += a * 0.1 + b * 0.9, cb += a * 0.08 + b * 0.72;
        }
        if (m !== WATER) {
          const f = flickI[k] * lampOn, fw = flickW[k] * lampOn;
          if (f) cr += f * SODIUM[0] + fw, cg += f * SODIUM[1] + fw * 0.95, cb += f * SODIUM[2] + fw * 0.8;
        }

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

    // rooms whose light changes, and the aviation lights
    for (const [k, wr, wg, wb, kind, rate, ph] of flick) {
      if (kind) {
        // a television: cold light that jumps
        const f = 0.5 + 0.5 * Math.sin(t * 11 + ph) * Math.sin(t * 4.3 + ph * 2);
        paint(k, sR[k] - wr + f * wr * 0.45, sG[k] - wg + f * wr * 0.6, sB[k] - wb + f * wr, 0.08, color);
      } else {
        // a light switched off for a while, then on again
        const f = Math.sin(t * rate * 0.5 + ph) > -0.6 ? 1 : 0;
        paint(k, sR[k] - wr * (1 - f), sG[k] - wg * (1 - f), sB[k] - wb * (1 - f), 0.08, color);
      }
    }
    for (const [k, ph] of beacons) {
      if (k < 0) continue;
      const on = Math.sin(t * 2.4 + ph) > 0.3;
      paint(k, on ? 1 : 0.3, on ? 0.2 : 0.06, on ? 0.15 : 0.05, 0.1, color);
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };

  function paint(k: number, cr: number, cg: number, cb: number, floor: number, color: Uint8Array | undefined) {
    cr = Math.max(0, cr), cg = Math.max(0, cg), cb = Math.max(0, cb);
    const r = (k / W) | 0, x = k % W;
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
