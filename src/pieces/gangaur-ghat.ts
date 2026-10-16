/*
 * gangaur ghat: Udaipur at night, seen from across Lake Pichola. The triple
 * arched gateway of Gangaur Ghat stands lit warm at the water's edge with its
 * steps running down into the lake, and the white havelis and temples of the
 * old city climb the hill behind it under a moon, their windows lit and their
 * parapets hung with strings of lamps. Far off to the right the City Palace
 * glows gold along the shore. Diyas drift on slow currents across the dark
 * water, and everything above the lake comes back in it, broken by ripples.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: a dot whose size is
 * the cell's brightness, ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

/** Tunable elements of gangaur ghat. Defaults are the original values. */
export interface GangaurGhatOptions {
  [key: string]: unknown;
  /** The near waterline, under the ghat. */
  waterline: number;
  /** The far shore, under the palace. */
  farShore: number;
  /** Where the old city ends and the lake reaches back. */
  cityEnd: number;
  /** The moon's column. */
  moonX: number;
  /** The moon's row. */
  moonY: number;
  /** The gateway's centre. */
  gatewayX: number;
  /** How many diyas drift across the water. */
  diyas: number;
}

export const meta = {
  name: "gangaur ghat",
  category: "scenes",
  note: "udaipur at night, a lit gateway on lake pichola and diyas on the water",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#070a18",
  palette: [
    // the night, sky and water
    "#0a1230", "#0f1a40", "#152352", "#1c2e66", "#253a7a", "#30498e", "#3e5aa2",
    // shadow
    "#0c0f1e", "#161a30", "#232842",
    // white stone under the moon
    "#4a5a86", "#6474a0", "#8291b8", "#a3afcf", "#c6cee3", "#e6ebf5",
    // lamplight, white hot to ember
    "#fff6dc", "#ffe6a8", "#ffd277", "#ffb84a", "#f29a34", "#d8782a", "#a85a26", "#7a4224",
    // floodlit sandstone
    "#e8c48c", "#c89a62", "#9a7048", "#6a4c38", "#3e2c2a",
    // starlight, set directly and never matched
    "#dfe6ff",
  ],
      options: {
        waterline: 64,
        farShore: 58,
        cityEnd: 142,
        moonX: 170,
        moonY: 13,
        gatewayX: 75,
        diyas: 52,
      },
      params: {
        waterline: { label: "waterline", min: 45, max: 75, step: 1 },
        farShore: { label: "far shore", min: 40, max: 70, step: 1 },
        cityEnd: { label: "old city", min: 110, max: 170, step: 1 },
        moonX: { label: "moon position", min: 100, max: 200, step: 1 },
        moonY: { label: "moon height", min: 4, max: 40, step: 1 },
        gatewayX: { label: "gateway", min: 40, max: 120, step: 1 },
        diyas: { label: "diyas", min: 0, max: 100, step: 1 },
      },
    } satisfies Meta<GangaurGhatOptions>;

    const W = 200, H = 100;
    const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
// how far a dot's colour may be brightened to make up for its size: small dots
// in dark areas stay dark instead of turning into a pale speckle
const LIFT = [0, 2.5, 1.7, 1.35];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const FLAME = [1, 0.62, 0.22];
const BULB = [1, 0.8, 0.45];

const SKY = 0, WATER = 1, TOWN = 2, BLD = 3, GATE = 4, ARCH = 5, STEP = 6, PALACE = 7, HILL = 8, MOONM = 9;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

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

// the crest of the old city's hill, highest a little left of the gateway
const ridgeF = (x: number) => 23 + 30 * ((x - 50) / 92) ** 2 + 3 * (fbm(x * 0.08, 1.3, 3, 0) - 0.5);
// the Aravalli hills, far behind the palace
const hillsF = (x: number) => 50 - 7 * fbm(x * 0.022, 4.1, 3, 0) - 3 * smooth(120, 175, x);

export default function gangaurGhat(o: Partial<GangaurGhatOptions> = {}): Frame {
  const HZ = o.waterline ?? meta.options.waterline;
  const FAR = o.farShore ?? meta.options.farShore;
  const SHORE = o.cityEnd ?? meta.options.cityEnd;
  const MOON = [o.moonX ?? meta.options.moonX, o.moonY ?? meta.options.moonY];
  const GX = o.gatewayX ?? meta.options.gatewayX;
  const DIYAS = o.diyas ?? meta.options.diyas;

  const wlF = (x: number) => (x < SHORE ? HZ : FAR);
  // The night sky: ink overhead, a lighter blue at the horizon.
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / FAR);
    const dmx = x - MOON[0], dmy = y - MOON[1];
    const halo = Math.exp(-Math.sqrt(dmx * dmx + dmy * dmy) / 14) * 0.16;
    // the palace and the town lift the horizon a little, warm
    const city = Math.exp(-Math.max(0, FAR - y) / 7) * (0.05 + 0.05 * smooth(130, 175, x));
    return [0.03 + 0.08 * v * v + 0.7 * halo + city * 0.9, 0.045 + 0.12 * v * v + 0.8 * halo + city * 0.6, 0.15 + 0.24 * Math.pow(v, 1.5) + halo + city * 0.35];
  };

  const P = meta.palette.map(hex);
  const STAR = P.length - 1;
  const N = W * H;
  const out = new Array<string>(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < STAR; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  const mat = new Uint8Array(N);
  const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
  const flo = new Float32Array(N);
  const set = (k: number, m: number, r: number, g: number, b: number, f: number) => {
    mat[k] = m, sR[k] = r, sG[k] = g, sB[k] = b, flo[k] = f;
  };
  const bulbs: [number, number, number][] = []; // string lights: x, y, phase

  // --- sky, far hills and the town's dark mass ------------------------------
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const xc = x + 0.5, y = r + 0.5;
      if (y >= wlF(xc)) {
        set(k, WATER, 0, 0, 0, 0.12);
        continue;
      }
      const [cr, cg, cb] = skyAt(xc, y);
      const veil = 0.92 + 0.16 * fbm(x * 0.04, r * 0.09, 3, 0);
      set(k, SKY, cr * veil, cg * veil, cb * veil, 0.18);
      const dm = Math.hypot(xc - MOON[0], y - MOON[1]);
      // a thin crescent, its dark side toward the town
      if (dm < 3.7 && Math.hypot(xc - MOON[0] + 1.7, y - MOON[1] + 0.9) > 3.4) set(k, MOONM, 1, 0.97, 0.86, 0.2);
      if (y >= hillsF(xc) && xc > 96) {
        const s = 0.85 + 0.3 * fbm(x * 0.15, r * 0.2, 2, 0);
        set(k, HILL, 0.045 * s, 0.06 * s, 0.14 * s, 0.1);
      }
      if (xc < SHORE && y >= ridgeF(xc)) {
        // the town between the houses: lanes and back walls in deep shadow
        set(k, TOWN, 0.06, 0.07, 0.16, 0.1);
        if (hash(x * 5 + 1, r * 9) < 0.035 && y > ridgeF(xc) + 2) set(k, TOWN, 0.75, 0.48, 0.2, 0.1);
      }
    }
  }

  // --- the havelis -------------------------------------------------------------
  // [x0, x1, top, base, seed], stacked up the hill, drawn back to front
  const blds: [number, number, number, number, number][] = [];
  const keepOut = (yb: number) => {
    // the gateway and its steps own the middle of the lower town
    if (yb <= 41) return [999, -999];
    return [50 - (yb - 41) * 0.55, 100 + (yb - 41) * 0.55];
  };
  for (let yb = 27, row = 0; yb <= HZ; yb += 2.7, row++) {
    const base = yb > HZ - 2.7 ? HZ : yb;
    const front = base === HZ;
    const sc = 0.7 + 0.55 * (base - 27) / (HZ - 27);
    for (let x = -3 + hash(row, 1) * 6; x < SHORE; ) {
      const w = (5 + 9 * hash(x | 0, row * 3 + 2)) * sc;
      const h = (front ? 9 + 8 * hash(x | 0, row + 50) : 4.5 + 6 * hash(x | 0, row * 3 + 4)) * sc;
      const x1 = Math.min(SHORE + (front ? 1 : 0), x + w);
      const [ko0, ko1] = keepOut(base);
      const mid = (x + x1) / 2;
      if (base > ridgeF(mid) + h * 0.6 && !(x1 > ko0 && x < ko1)) blds.push([x, x1, base - h, base, hash(x | 0, row * 7 + 9)]);
      x += w + (front ? 0 : hash(x | 0, row + 20) * 2.5);
    }
  }

  // one pane of glass, lit warm or dark
  const pane = (k: number, seed: number, near: number) => {
    if (hash(seed * 997 | 0, k) < 0.36) {
      const cream = hash(k, 3) < 0.4;
      set(k, BLD, cream ? 1 : 0.95, cream ? 0.86 : 0.66, cream ? 0.6 : 0.3, 0.14);
    } else set(k, BLD, 0.07 + 0.03 * near, 0.08 + 0.03 * near, 0.19, 0.12);
  };

  blds.sort((a, b) => a[3] - b[3]);
  blds.forEach(([x0, x1, top, base, sd], bi) => {
    const sc = 0.7 + 0.55 * (base - 27) / (HZ - 27);
    const depth = 1 - (base - 27) / (HZ - 27); // 1 at the crest, 0 at the water
    const style = sd < 0.3 ? 1 : sd < 0.55 ? 0 : sd < 0.75 ? 3 : 2;
    const mid = (x0 + x1) / 2;
    const tw = (x1 - x0) * 0.55; // an upper storey, set back
    const cw = Math.max(1.6, 1.8 * sc); // a chhatri's half width
    for (let r = Math.floor(top - 5 * sc); r < base; r++) {
      if (r < 0) continue;
      for (let x = Math.floor(x0); x < x1; x++) {
        if (x < 0 || x >= W) continue;
        const k = r * W + x;
        const xc = x + 0.5, y = r + 0.5;
        let inside = y >= top;
        let part = 0; // 0 the facade, 1 a roof ornament
        if (!inside) {
          if (style === 0 && y >= top - 1 && (x & 1) === 0) (inside = true), (part = 1); // crenellations
          if (style === 1) {
            // a chhatri: a dome on four slim posts
            const dx = Math.abs(xc - mid) / cw;
            const dy = top - 1.5 * sc - y;
            if (dx < 1 && dy >= 0 && dy < 2.2 * sc * Math.sqrt(1 - dx * dx)) (inside = true), (part = 1);
            if (dx < 1.15 && y >= top - 1.5 * sc - 0.6 && y < top - 1.5 * sc + 0.4) (inside = true), (part = 1);
            if ((Math.abs(dx - 0.85) < 0.25 || Math.abs(dx) < 0.15) && y >= top - 1.5 * sc) (inside = true), (part = 1);
            if (dx < 0.2 && dy >= 2.2 * sc && dy < 2.2 * sc + 1) (inside = true), (part = 1);
          }
          if (style === 3 && Math.abs(xc - mid) < tw / 2 && y >= top - 3.5 * sc) (inside = true), (part = 2);
        }
        if (!inside) continue;
        // moonlight from the upper right: the left wall in shade, the top lit
        const fy = (y - top) / Math.max(1, base - top);
        let l = (0.7 + 0.45 * sd) * (0.95 - 0.3 * fy);
        if (xc < x0 + 1.2 + (sc > 1 ? 1 : 0)) l *= 0.36;
        else if (xc > x1 - 1) l *= 1.12;
        if (part === 0 && y < top + 1) l *= 1.25;
        else if (part === 0 && y < top + 2 && style !== 3) l *= 0.6; // under the cornice
        if (part === 0 && y > base - 1) l *= 0.6; // the foot, in the shade of the house below
        if (part === 1) l *= 0.95;
        if (part === 2 && xc < mid - tw / 2 + 1) l *= 0.5;
        const hz = 0.4 * depth;
        const cr = mix(0.6 * l, 0.12, hz), cg = mix(0.67 * l, 0.17, hz), cb = mix(0.84 * l, 0.38, hz);
        set(k, BLD, cr, cg, cb, 0.14);
        // windows: small and many up the hill, taller and arched near the water
        if (part === 0 && y > top + 2 && y < base - 1 && xc > x0 + 1.5 && xc < x1 - 1) {
          const lx = Math.floor(xc - x0), ly = Math.floor(base - y);
          if (sc > 1.05) {
            if (lx % 3 === 1 && ly % 4 >= 1 && ly % 4 <= 2) pane(k, sd * 1000 + bi, 1 - depth);
          } else if (lx % 3 === 1 && ly % 3 === 1) pane(k, sd * 1000 + bi, 1 - depth);
        }
        if (part === 2 && y > top - 2.2 * sc && y < top - 0.8 && Math.abs(xc - mid) < tw / 2 - 1 && Math.floor(xc) % 2 === 0) pane(k, sd * 1000 + bi + 5, 1 - depth);
      }
    }
    // lamps strung along the parapets of the lower houses
    if (base > 40 && hash(bi, 71) < 0.55) {
      for (let x = x0 + 1; x < x1 - 0.5; x += 2) bulbs.push([x, top - (style === 0 ? 1.5 : 0.5), hash(x | 0, bi) * 40]);
    }
  });

  // --- the temple up the hill, a white shikhara ----------------------------------
  const TX = 38, TB = 33, TH = 19, TW = 5.5;
  for (let r = Math.floor(TB - TH - 3); r < TB + 4; r++) {
    for (let x = Math.floor(TX - 12); x < TX + 12; x++) {
      const k = r * W + x;
      const xc = x + 0.5, y = r + 0.5;
      const h = TB - y, dx = xc - TX;
      const f = h / TH;
      let hw = f <= 1 && f >= 0 ? TW * Math.pow(Math.max(0, 1 - Math.pow(f, 1.7)), 0.55) : -1;
      if (f > 0.9 && f < 1.03) hw = Math.max(hw, TW * 0.4); // the amalaka disc
      if (f >= 1.03 && h < TH + 2.2) hw = 0.6;
      if (h < 0 && h > -4) hw = TW * 1.25; // the plinth
      // the mandapa in front, a low dome
      const md = Math.hypot((xc - (TX + 8)) / 4.2, (y - (TB - 2)) / 3.4);
      const inM = (md < 1 && y < TB - 2) || (Math.abs(xc - (TX + 8)) < 4.6 && y >= TB - 2 && y < TB + 4);
      if (Math.abs(dx) <= hw || inM) {
        // vertical ribs and horizontal courses, lit from the right
        const rib = Math.abs(dx) < hw * 0.3 ? 1.08 : dx < 0 ? 0.62 : 0.95;
        const course = !inM && Math.floor(h / 1.5) % 2 ? 0.85 : 1;
        const l = rib * course * (inM ? (xc < TX + 6 ? 0.65 : 0.9) : 1);
        set(k, BLD, 0.72 * l, 0.77 * l, 0.9 * l, 0.14);
      }
      // its flag
      if (h > TH + 1.6 && h < TH + 3.8 && dx > 0.4 && dx < 3 - (h - TH - 1.6) * 0.3) set(k, BLD, 0.85, 0.45, 0.2, 0.1);
    }
  }

  // --- the gateway: three pointed arches, a cornice, a parapet and chhatris ----
  const G0 = 53, G1 = 97, GT = 38, GB = 57; // its wall
  const arches: [number, number, number][] = [[GX, 6, 51.5], [GX - 14.5, 4.2, 53], [GX + 14.5, 4.2, 53]];
  // the open space under an arch, as a distance inside it (negative is outside)
  const archIn = (xc: number, y: number) => {
    let best = -9;
    for (const [cx, hw, spring] of arches) {
      const R = hw * 1.55, dx = Math.abs(xc - cx);
      let d: number;
      if (y >= spring) d = Math.min(hw - dx, GB - y + 0.5);
      else d = R - Math.hypot(dx + (R - hw), y - spring);
      best = Math.max(best, d);
    }
    return best;
  };
  for (let r = 24; r < GB + 1; r++) {
    for (let x = G0 - 2; x < G1 + 2; x++) {
      const k = r * W + x;
      const xc = x + 0.5, y = r + 0.5;
      let inside = xc >= G0 && xc < G1 && y >= GT && y < GB;
      let l = 1, dome = false;
      // the cornice juts out, with a shadow under it
      if (xc >= G0 - 1 && xc < G1 + 1 && y >= GT && y < GT + 1.2) (inside = true), (l = 1.1);
      if (y >= GT + 1.2 && y < GT + 2.2) l = 0.55;
      // the parapet, pierced, and the chhatris at the corners and the middle
      if (y >= GT - 2 && y < GT && xc >= G0 && xc < G1) (inside = true), (l = (x % 3 === 0 && y < GT - 1) ? 0.5 : 0.95);
      for (const cx of [G0 + 2.5, GX, G1 - 2.5]) {
        const big = cx === GX ? 1.6 : 1.15;
        const dx = Math.abs(xc - cx) / (2.6 * big);
        const db = GT - 2 - 2.4 * big; // the dome's base
        // the domes catch the floodlight on their right flank, a crescent of shade on the left
        if (dx < 1 && y < db && y >= db - 2.8 * big * Math.sqrt(1 - dx * dx)) (inside = true), (dome = true), (l = xc < cx - 1.2 * big ? 0.55 : 1.15);
        if (dx < 0.18 && y < db - 2.8 * big && y >= db - 2.8 * big - 1.2) (inside = true), (dome = true), (l = 1.2); // the finial
        if (dx < 1.18 && y >= db && y < db + 0.8) (inside = true), (dome = true), (l = 1.1); // the eave
        if (y >= db + 0.8 && y < GT - 2 && (Math.abs(dx - 0.8) < 0.2 || Math.abs(dx + 0.8) < 0.2)) (inside = true), (dome = true), (l = 0.9);
        else if (dx < 0.6 && y >= db + 0.8 && y < GT - 2) (inside = true), (dome = true), (l = 0.22); // the dark under the dome
      }
      if (!inside) {
        // a rim of shadow round the roofline, so the domes stand clear of the pale town
        let rim = y >= GT - 3 && y < GT - 2 && xc >= G0 - 1 && xc < G1 + 1;
        for (const cx of [G0 + 2.5, GX, G1 - 2.5]) {
          const big = cx === GX ? 1.6 : 1.15;
          const db = GT - 2 - 2.4 * big;
          const dx = Math.abs(xc - cx) / (2.6 * big + 1.2);
          if (dx < 1 && y < GT - 2 && y >= db - (2.8 * big + 1.4) * Math.sqrt(1 - dx * dx)) rim = true;
        }
        if (rim && mat[k] !== SKY) set(k, TOWN, 0.05, 0.06, 0.14, 0.08);
        continue;
      }
      const ai = archIn(xc, y);
      if (ai > 0 && y >= GT + 2) {
        // through the arch: a dim warm passage, brighter toward the floor
        const g = 0.07 + 0.22 * smooth(GB - 9, GB, y);
        set(k, ARCH, g * 1.1, g * 0.62, g * 0.32, 0.06);
        continue;
      }
      // floodlit from below: sandstone gold at the foot, cooler up top
      const lift = dome ? 0.55 : smooth(GT - 6, GB, y);
      const mould = ai > -1.2 && ai <= 0 && y >= GT + 2 ? 1.18 : 1; // the moulding round each arch
      const pil = Math.abs(xc - (GX - 8.3)) < 1 || Math.abs(xc - (GX + 8.3)) < 1 ? 1.1 : 1; // pilasters
      const b = l * mould * pil * (0.62 + 0.42 * lift);
      set(k, GATE, mix(0.74, 0.98, lift) * b, mix(0.62, 0.74, lift) * b, mix(0.58, 0.46, lift) * b, 0.16);
    }
  }
  // the gateway's outline in lamps: along the parapet and round the arches
  for (let x = G0 + 0.5; x < G1; x += 2) bulbs.push([x, GT - 2.5, hash(x | 0, 333) * 40]);
  for (const [cx, hw, spring] of arches) {
    // each half of a pointed arch is an arc round a centre on the other side
    const R = hw * 1.55, o = R - hw, Ro = R + 1.2;
    const end = Math.acos(o / Ro), n = Math.max(2, Math.round((end * Ro) / 2));
    for (let j = 0; j < n; j++) {
      const a = (end * j) / n;
      for (const s of [-1, 1]) bulbs.push([cx + s * (Ro * Math.cos(a) - o), spring - Ro * Math.sin(a), hash(cx * 7 + s, j) * 40]);
    }
    bulbs.push([cx, spring - Ro * Math.sin(end), hash(cx, 5) * 40]);
  }

  // --- the steps, wider at the water ---------------------------------------------
  for (let r = GB; r < HZ; r++) {
    const y = r + 0.5;
    const half = 26 + (y - GB) * 1.3;
    for (let x = Math.floor(GX - half); x < GX + half; x++) {
      const k = r * W + x;
      const xc = x + 0.5;
      // the gateway's floodlights spill down the treads, fading toward the ends
      const warm = Math.exp(-(((xc - GX) / 26) ** 2)) * (1 - 0.05 * (y - GB));
      const tread = (r - GB) % 2 === 0;
      const l = (tread ? 1 : 0.38) * (0.55 + 0.45 * warm);
      const wet = r >= HZ - 1 ? 0.6 : 1;
      set(k, STEP, mix(0.42, 0.95, warm) * l * wet, mix(0.47, 0.68, warm) * l * wet, mix(0.62, 0.4, warm) * l * wet, 0.14);
    }
  }

  // --- the City Palace, far off along the shore ----------------------------------
  const wings: [number, number, number][] = [[147, 155, 50], [155, 163, 48], [163, 171, 46.5], [171, 179, 49], [179, 187, 45.5], [187, 195, 48], [195, 201, 50.5]];
  for (const [x0, x1, top] of wings) {
    const mid = (x0 + x1) / 2;
    for (let r = Math.floor(top - 5); r < FAR; r++) {
      for (let x = Math.floor(x0); x < x1 && x < W; x++) {
        const k = r * W + x;
        const xc = x + 0.5, y = r + 0.5;
        let inside = y >= top;
        // a cupola over each tower wing
        const tall = top < 48;
        if (tall) {
          const dx = Math.abs(xc - mid) / 2.2;
          if (dx < 1 && y < top && y >= top - 0.8 - 2.4 * Math.sqrt(1 - dx * dx)) inside = true;
          if (dx < 0.25 && y < top && y >= top - 4.2) inside = true;
        }
        if (!inside) continue;
        // floodlit stone, darker low down where the lights don't reach
        const l = (xc < x0 + 1 ? 0.55 : 1) * (y < top + 1 ? 1.15 : 1) * (1 - 0.35 * smooth(top, FAR, y));
        set(k, PALACE, 0.6 * l, 0.46 * l, 0.32 * l, 0.14);
        // rows of lit windows, gold and glittering
        if (y > top + 1.5 && y < FAR - 1.5 && (x - Math.floor(x0)) % 3 === 1 && (FAR - r) % 2 === 0) {
          const lit = hash(x * 3, r * 11) < 0.75;
          if (lit) set(k, PALACE, 1, 0.84, 0.5, 0.14);
          else set(k, PALACE, 0.22, 0.16, 0.14, 0.1);
        }
      }
    }
    for (let x = x0 + 1.5; x < Math.min(W, x1 - 1); x += 3) bulbs.push([x, top + 0.5, hash(x | 0, 909) * 40]);
  }

  // a few lamp strings sagging between the lakeside houses
  const strands: [number, number, number, number][] = [];
  for (let i = 0; i + 1 < blds.length; i++) {
    const a = blds[i], b = blds[i + 1];
    if (a[3] === HZ && b[3] === HZ && hash(i, 401) < 0.6) strands.push([a[1] - 1, a[2] + 0.5, b[1] - 1, b[2] + 0.5]);
  }
  for (const [xa, ya, xb, yb] of strands) {
    const n = Math.max(2, Math.round(Math.abs(xb - xa) / 2));
    for (let j = 0; j <= n; j++) {
      const u = j / n;
      bulbs.push([mix(xa, xb, u), mix(ya, yb, u) + 2.2 * 4 * u * (1 - u), hash(j, xa * 13) * 40]);
    }
  }

  // --- the floating diyas: each rides a slow, winding current ---------------------
  const diyas: [number, number, number, number, number][] = [];
  for (let i = 0; i < DIYAS; i++) {
    const q = hash(i, 61);
    const y = HZ + 3 + 32 * Math.pow(q, 0.95);
    const dir = hash(i, 65) < 0.62 ? 1 : -1;
    diyas.push([hash(i, 62) * 260, y, hash(i, 63) * 50, 0.7 + 0.5 * hash(i, 64), dir]);
  }

  const dyn = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  const dref = new Float32Array(N); // the diyas' own streaks on the water
  const addGlow = (fx: number, fy: number, core: number, halo: number, amp: number, c: number[]) => {
    const R = Math.ceil(halo * 3);
    for (let r = Math.max(0, Math.floor(fy - R)); r < Math.min(H, fy + R); r++) {
      for (let x = Math.max(0, Math.floor(fx - R)); x < Math.min(W, fx + R); x++) {
        const k = r * W + x;
        const dx = x + 0.5 - fx, dy = r + 0.5 - fy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const h = Math.exp(-((d / core) ** 2)) * 1.8 * amp, v = Math.exp(-d / halo) * 0.3 * amp;
        dyn[0][k] += h + v * c[0], dyn[1][k] += h * 0.88 + v * c[1], dyn[2][k] += h * 0.6 + v * c[2];
      }
    }
  };
  const addStreak = (fx: number, y0: number, width: number, len: number, amp: number) => {
    for (let r = Math.max(0, Math.floor(y0)); r < H; r++) {
      const dy = r + 0.5 - y0;
      const a = Math.exp(-dy / len) * amp * smooth(-0.5, 1, dy);
      if (a < 0.01) break;
      for (let x = Math.max(0, Math.floor(fx - 3 * width - 1)); x < Math.min(W, fx + 3 * width + 1); x++) {
        dref[r * W + x] += a * Math.exp(-(((x + 0.5 - fx) / width) ** 2));
      }
    }
  };

  return (t, { color } = {}) => {
    for (let c = 0; c < 3; c++) dyn[c].fill(0);
    dref.fill(0);

    // the string lights, each lamp breathing on its own
    for (const [bx, by, ph] of bulbs) {
      const x = Math.floor(bx), r = Math.floor(by);
      if (x < 1 || x >= W - 1 || r < 1 || r >= H - 1) continue;
      const v = 0.62 + 0.38 * Math.sin(t * (1.6 + (ph % 1.7)) + ph);
      const k = r * W + x;
      dyn[0][k] += v * BULB[0], dyn[1][k] += v * BULB[1], dyn[2][k] += v * BULB[2];
      for (const o of [-1, 1, -W, W]) (dyn[0][k + o] += 0.12 * v), (dyn[1][k + o] += 0.08 * v), (dyn[2][k + o] += 0.03 * v);
    }
    // a lantern hanging in the middle arch
    addGlow(GX, 46.5, 0.9, 2.6, 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 4.3), FLAME);

    // diyas: drifting along their current, bobbing, flickering
    for (const [x0, y0, ph, sz, dir] of diyas) {
      const near = (y0 - HZ) / (H - HZ);
      const x = ((((x0 + dir * t * (0.35 + 0.8 * near)) % 260) + 260) % 260) - 30;
      const y = y0 + (1 + 1.6 * near) * Math.sin(x * 0.045 + ph);
      if (x < -3 || x > W + 3 || y < wlF(x) + 1) continue;
      const fl = 0.78 + 0.22 * Math.sin(t * 9 + ph) * Math.sin(t * 5.3 + ph * 2);
      const s = (0.35 + 0.9 * near) * sz;
      addGlow(x, y - 0.4, 0.5 + 0.45 * s, 0.9 + 1.8 * s, fl * 1.3, FLAME);
      // the leaf cup under the flame
      const cr = Math.floor(y + 0.4);
      for (let xx = Math.floor(x - 0.8 - s); xx <= x + 0.8 + s; xx++) {
        if (xx < 0 || xx >= W || cr >= H) continue;
        const k = cr * W + xx;
        dyn[0][k] += 0.28 * fl, dyn[1][k] += 0.12 * fl, dyn[2][k] += 0.04 * fl;
      }
      addStreak(x, y + 0.6, 0.35 + 0.35 * s, 2 + 5 * s, 0.55 * fl);
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = sR[k], cg = sG[k], cb = sB[k], floor = flo[k], fade = 1, star = false;

        if (m === SKY && y < 48 && hash(x, r * 3 + 11) > 0.986) {
          const dm = Math.hypot(x - MOON[0], y - MOON[1]);
          const tw = (0.45 + 0.4 * Math.sin(t * (1.2 + hash(x, r) * 2.5) + hash(r, x) * 6.28)) * smooth(48, 18, y) * smooth(6, 16, dm);
          if (tw > 0.12) (cr = Math.max(cr, tw * 0.9)), (cg = Math.max(cg, tw * 0.92)), (cb = Math.max(cb, tw)), (star = true);
        } else if (m === WATER) {
          const wl = wlF(x + 0.5);
          const d = y - wl, v = (y - FAR) / (H - FAR);
          const w = 0.6 * noise(x * 0.05 + t * 0.07, y * 0.45 - t * 0.4, 0) + 0.4 * noise(x * 0.16 - t * 0.13, y * 0.95 - t * 0.85, 0);
          const swell = 0.55 + 0.9 * w;
          cr = 0.025 * swell, cg = 0.04 * swell, cb = 0.12 * swell;
          // the mirror, nudged by the ripples sideways and up and down
          const wx = (noise(x * 0.05 + 7, y * 0.35 - t * 0.6, 0) - 0.5) * (1.5 + 4 * v);
          const wy = (noise(x * 0.09 + 3, y * 0.6 - t * 0.9, 0) - 0.5) * (1 + 2.5 * v);
          const ym = wl - d * 0.92 - 0.6 + wy;
          let sx = Math.round(x + wx);
          if (sx < 0) sx = 0;
          if (sx > W - 1) sx = W - 1;
          const q = ym < 0 ? -1 : Math.floor(ym) * W + sx;
          if (q >= 0 && mat[q] !== WATER) {
            // broken into horizontal bands; lamps and lit windows carry, pale stone fades
            const dash = smooth(0.3, 0.75, noise(x * 0.09 + 3, y * 0.9 - t * 1.0, 0));
            const da = (0.12 + 0.88 * dash) * (0.85 - 0.3 * smooth(HZ, H, y));
            const sp = Math.max(sR[q], sG[q], sB[q]);
            const keep = (0.24 + 0.55 * smooth(0.5, 0.9, sR[q] - sB[q] + 0.6)) * (sp > 1 ? 1 / sp : 1);
            cr += (sR[q] * keep + dyn[0][q]) * da, cg += (sG[q] * keep + dyn[1][q]) * da, cb += (sB[q] * keep + dyn[2][q]) * da;
          }
          const fl = dref[k] * (0.25 + 1.0 * smooth(0.3, 0.7, w));
          cr += fl * FLAME[0], cg += fl * FLAME[1], cb += fl * FLAME[2];
          floor = 0.12;
          fade = smooth(H + 4, H - 14, y);
        }

        cr += dyn[0][k], cg += dyn[1][k], cb += dyn[2][k];

        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.72) * 0.95) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          if (star) color[k] = STAR;
          else {
            const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
            const s = Math.min(LIFT[step], (0.3 + 0.7 * want) / peak);
            color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
          }
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
