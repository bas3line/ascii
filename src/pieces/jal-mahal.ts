/*
 * jal mahal: the water palace in Jaipur at a misty sunrise. Its top floors sit
 * out in the middle of Man Sagar Lake, four domed chhatris on the corners and
 * rows of arches along the front, mirrored in glassy water. The Aravalli hills
 * behind fade in layers of haze, the sun comes up pale gold through the mist,
 * birds cross the sky and egrets skim the lake past a lone wooden boat.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "jal mahal",
  category: "scenes",
  note: "the jaipur water palace floating on a misty lake at sunrise",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#16141f",
  palette: [
    "#3e4a6b", "#56628a", "#7180a6", "#8e9cc0", "#aab6d4", "#c6cfe3", "#e2e7f1",
    "#6b4a66", "#8a5f7c", "#a87891", "#c895a6", "#e2b4bd", "#f2d0d0",
    "#fff3d6", "#ffe3a6", "#f6c87a", "#e8a865", "#c98552",
    "#5a3e3a", "#7d5848", "#a47a5e", "#c99d78", "#e4c29c",
    "#2a2f45", "#3a3550", "#4d4660",
    "#4a3226", "#6e4a32",
    "#fbfaf7",
  ],
} satisfies Meta;

const W = 200, H = 100;
const WATER = 62; // the waterline
const SUN = [148, 30];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

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

// The sky at a row, before the sun: misty blue overhead, rose in the middle,
// pale gold low down where the light comes through.
function skyAt(y: number): [number, number, number] {
  const v = clamp(y / WATER);
  if (v < 0.45) {
    const k = smooth(0, 0.45, v);
    return [mix(0.4, 0.86, k), mix(0.47, 0.62, k), mix(0.68, 0.68, k)];
  }
  const k = smooth(0.45, 0.95, v);
  return [mix(0.86, 1.0, k), mix(0.62, 0.84, k), mix(0.68, 0.6, k)];
}

export default function jalMahal(): Frame {
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

  // --- everything above the water that never moves, shaded once ----------
  // Sky, sun, hills and the palace go into one picture; the lake mirrors it.
  const SR = new Float32Array(WATER * W), SG = new Float32Array(WATER * W), SB = new Float32Array(WATER * W);
  const solid = new Uint8Array(WATER * W); // 1 where the palace stands, for the mist to know

  // three ridges of the Aravallis, the far ones palest, lower toward the sun
  // each ridge a few broad humps with a rough edge; Nahargarh the tall one
  // on the left
  const hump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
  const ridges = [
    { top: (x: number) => 45 - 15 * hump(x, 32, 30) - 9 * hump(x, 98, 22) - 6 * hump(x, 188, 18) - 4 * hump(x, 138, 12) - 3 * fbm(x * 0.09, 1.3, 3, 0), tone: [0.5, 0.5, 0.68] },
    { top: (x: number) => 52 - 9 * hump(x, 8, 20) - 7 * hump(x, 62, 16) - 6 * hump(x, 172, 15) - 2.5 * fbm(x * 0.11, 4.1, 3, 0), tone: [0.36, 0.34, 0.52] },
    { top: (x: number) => 58.5 - 3 * hump(x, 36, 28) - 3 * hump(x, 152, 24) - 1.6 * fbm(x * 0.14, 7.7, 3, 0), tone: [0.24, 0.2, 0.3] },
  ];
  // the fort walls along Nahargarh's crest, bastions every so often
  const fortTop = (x: number) => {
    if (x < 6 || x > 60) return 1e9;
    const base = ridges[0].top(x);
    const bastion = Math.abs(((x - 6) % 13) - 6.5) > 5 ? 3 : 1.6;
    return base - bastion;
  };

  for (let r = 0; r < WATER; r++) {
    const y = r + 0.5;
    const [sr, sg, sb] = skyAt(y);
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
      const ds = Math.sqrt(dx * dx + dy * dy);
      const glow = Math.exp(-ds / 34) * 0.3 + Math.exp(-ds / 11) * 0.45;
      const streak = 0.08 * (fbm(x * 0.025, y * 0.3, 3, 0) - 0.5);
      let cr = sr + glow * 0.6 + streak, cg = sg + glow * 0.48 + streak * 0.9, cb = sb + glow * 0.2 + streak;
      // long thin streaks of cloud, their undersides lit rose and gold
      const cl = smooth(0.56, 0.74, fbm(x * 0.012, y * 0.32, 4, 0)) * smooth(8, 16, y) * smooth(38, 28, y);
      if (cl > 0) {
        const warm = Math.exp(-ds / 40);
        cr = mix(cr, 1.0, cl * 0.55), cg = mix(cg, 0.76 + 0.12 * warm, cl * 0.55), cb = mix(cb, 0.74 - 0.1 * warm, cl * 0.55);
      }
      if (ds < 7.5) {
        // the sun, softened by the mist, a little paler at its middle
        const a = smooth(7.5, 6.2, ds);
        cr = mix(cr, 1.0, a), cg = mix(cg, 0.9 + 0.08 * smooth(7, 0, ds), a), cb = mix(cb, 0.6 + 0.3 * smooth(7, 0, ds), a);
      }
      // hills, front to back; each fades toward the sky colour at its foot,
      // where the mist pools in the valleys
      for (let i = ridges.length - 1; i >= 0; i--) {
        const R = ridges[i];
        const t0 = R.top(x);
        if (y < t0) continue;
        const lit = 0.06 * (fbm(x * 0.12, y * 0.2, 3, 0) - 0.5) + 0.05 * smooth(t0 + 2.5, t0, y);
        const pool = smooth(t0 + 2, t0 + 12, y) * 0.5;
        const h = pool;
        cr = mix(R.tone[0] + lit, sr + glow * 0.4, h);
        cg = mix(R.tone[1] + lit, sg + glow * 0.32, h);
        cb = mix(R.tone[2] + lit, sb + glow * 0.15, h);
        break;
      }
      const ft = fortTop(x);
      if (y >= ft && y < ridges[0].top(x) + 0.5 && y < ridges[1].top(x)) {
        // the wall, catching the low sun on its face, merlons along the top
        if (!(y < ft + 0.8 && x % 3 === 0)) (cr = 0.72), (cg = 0.56), (cb = 0.62);
      }
      SR[k] = cr, SG[k] = cg, SB[k] = cb;
    }
  }

  // The palace: a long two-storey front in rose sandstone, its lower storey
  // half under water. Light comes from the sun on the right.
  const STONE = [1.0, 0.76, 0.58], SHADE = [0.6, 0.42, 0.42], HOLE = [0.2, 0.13, 0.19], DOME = [1.0, 0.9, 0.74];
  const paint = (x: number, r: number, c: number[], s: number) => {
    if (x < 0 || x >= W || r < 0 || r >= WATER) return;
    const k = r * W + x;
    SR[k] = c[0] * s, SG[k] = c[1] * s, SB[k] = c[2] * s;
    solid[k] = 1;
  };
  const L = 64, Rt = 136, ROOF = 47;
  for (let r = 40; r < WATER; r++) {
    const y = r + 0.5;
    for (let x = L - 2; x <= Rt + 2; x++) {
      const fx = x + 0.5;
      const grain = 0.94 + 0.08 * hash(x * 3, r * 7);
      // parapet with small merlons, and the cornice under it
      if (y >= ROOF - 2 && y < ROOF - 0.5 && fx >= L && fx <= Rt && Math.floor(fx) % 3 !== 0) paint(x, r, STONE, 0.95 * grain);
      if (y >= ROOF - 0.5 && y < ROOF + 1 && fx >= L - 1.5 && fx <= Rt + 1.5) paint(x, r, DOME, 0.98);
      if (y < ROOF + 1 || fx < L || fx > Rt) continue;
      // the shadowed return of the left wing gives the block some depth
      let c = STONE, s = grain * (0.9 + 0.1 * smooth(L, Rt, fx));
      if (fx < L + 4) (c = SHADE), (s = grain);
      // a string course between the storeys
      if (y >= 53 && y < 54.2) (c = DOME), (s = 0.95);
      // upper arcade: small cusped arches
      const up = ((fx - L - 6) % 4.5 + 4.5) % 4.5 - 2.25;
      if (y >= 48.6 && y < 52.6 && fx > L + 5 && fx < Rt - 4 && Math.abs(up) < 1.05 && y > 49.4 + up * up * 0.5) (c = HOLE), (s = 1);
      // lower arcade: wider arches, opening onto the water
      const lo = ((fx - L - 7) % 6 + 6) % 6 - 3;
      if (y >= 55.2 && fx > L + 5 && fx < Rt - 4 && Math.abs(lo) < 1.5 && y > 56.2 + lo * lo * 0.45) (c = HOLE), (s = 0.9);
      // pilasters catch the light
      if (y >= 54.2 && Math.abs(lo) > 2.6 && fx > L + 5) s *= 1.06;
      // the stone darkened where the lake has stood against it for centuries
      if (y > WATER - 2) s *= 0.62;
      paint(x, r, c, s);
    }
  }

  // An octagonal chhatri: an arched drum, a broad eave, a dome and a finial.
  // `far` pushes the rear ones back into the haze.
  const chhatri = (cx: number, base: number, sc: number, far: number) => {
    const drumH = 7 * sc, hw = 3.6 * sc, eave = 4.9 * sc, domeH = 6.6 * sc, domeW = 4.3 * sc;
    const eaveY = base - drumH, domeBase = eaveY - 1.2 * sc;
    for (let r = Math.floor(domeBase - domeH - 4 * sc); r < Math.ceil(base); r++) {
      const y = r + 0.5;
      for (let x = Math.floor(cx - eave - 1); x <= Math.ceil(cx + eave + 1); x++) {
        const dx = x + 0.5 - cx;
        let c: number[] | null = null, s = 1;
        if (y >= eaveY && y < base && Math.abs(dx) <= hw) {
          // three faces of the octagon: the near one lit, left one in shade
          const face = dx < -hw * 0.45 ? 0.72 : dx > hw * 0.45 ? 1.02 : 0.92;
          c = STONE, s = face;
          const open = Math.abs(dx) < 0.9 * sc + 0.15 && y > eaveY + 2 * sc + dx * dx * 0.4;
          if (open && y < base - 0.8) (c = HOLE), (s = 1);
          if (Math.abs(Math.abs(dx) - hw * 0.45) < 0.3) s *= 0.88; // the corner pillars
        } else if (y >= eaveY - 1.2 * sc && y < eaveY && Math.abs(dx) <= eave - (eaveY - y) * 0.6) {
          (c = DOME), (s = 0.9 + 0.08 * Math.sign(dx));
        } else if (y < domeBase && y >= domeBase - domeH) {
          // onion profile: swells a little above the neck, then closes to a point
          const v = (domeBase - y) / domeH;
          const w = domeW * Math.sqrt(Math.max(0, 1 - Math.pow(v, 1.6))) * (0.88 + 0.22 * Math.sin(Math.min(1, v * 2.2) * Math.PI * 0.5));
          if (Math.abs(dx) <= w) (c = DOME), (s = 0.78 + 0.26 * (dx / Math.max(w, 0.5)) * 0.5 + 0.2 * v);
        } else if (y < domeBase - domeH && y >= domeBase - domeH - 3.4 * sc && Math.abs(dx) < 0.55) {
          (c = [0.98, 0.82, 0.5]), (s = 1);
        }
        if (!c) continue;
        const sky = skyAt(y);
        paint(x, r, [mix(c[0] * s, sky[0], far), mix(c[1] * s, sky[1], far), mix(c[2] * s, sky[2], far)], 1);
      }
    }
  };
  // the rear pair first, smaller and paler, then the central pavilion, then
  // the front corners
  chhatri(83, ROOF - 1.5, 0.85, 0.22);
  chhatri(117, ROOF - 1.5, 0.85, 0.22);
  // the central pavilion with a curved bangla roof
  for (let r = 34; r < ROOF; r++) {
    const y = r + 0.5;
    for (let x = 88; x <= 112; x++) {
      const dx = x + 0.5 - 100;
      const roofTop = 37 + 2.4 * (dx / 11) ** 2;
      if (y >= 41 && y < ROOF - 1.5 && Math.abs(dx) <= 9) {
        const bay = ((dx + 9) % 6 + 6) % 6 - 3;
        const open = Math.abs(bay) < 1.3 && y > 42.4 + bay * bay * 0.45;
        paint(x, r, open ? HOLE : STONE, open ? 1 : dx < -6 ? 0.78 : 0.96);
      } else if (y >= roofTop && y < 41 && Math.abs(dx) <= 11) {
        paint(x, r, DOME, 0.86 + 0.08 * (dx / 11) + 0.08 * (41 - y) / 4);
      }
    }
  }
  chhatri(67.5, ROOF - 1.5, 1, 0);
  chhatri(132.5, ROOF - 1.5, 1, 0);

  // --- mist: wrapping heaps of noise that drift slowly to the right -------
  const MW = 480;
  const mist = new Float32Array(MW * H);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < MW; x++) mist[r * MW + x] = smooth(0.44, 0.72, fbm(x * 0.02, r * 0.14, 4, MW * 0.02));
  // where the mist lies: low on the water, a thin band through the hills
  const band = new Float32Array(H);
  for (let r = 0; r < H; r++) {
    const y = r + 0.5;
    band[r] = 0.95 * Math.exp(-(((y - WATER) / 4.5) ** 2)) + 0.6 * Math.exp(-(((y - 51) / 3) ** 2)) + 0.3 * Math.exp(-(((y - 40) / 3.5) ** 2));
  }

  // --- the flocks ---------------------------------------------------------
  // ducks and egrets high up as dark marks, egrets low over the water in white
  const birds: { x0: number; y0: number; v: number; ph: number; span: number; low: boolean }[] = [];
  for (let i = 0; i < 9; i++) {
    // a loose skein crossing the sun's side of the sky
    birds.push({ x0: 40 + i * 6 + hash(i, 1) * 4, y0: 14 + Math.abs(i - 4) * 2.2 + hash(i, 2) * 1.5, v: 4.2, ph: hash(i, 3) * 6.28, span: 2, low: false });
  }
  for (let i = 0; i < 4; i++) birds.push({ x0: 160 + i * 9, y0: 22 + hash(i, 4) * 6, v: 3.1, ph: hash(i, 5) * 6.28, span: 2, low: false });
  for (let i = 0; i < 5; i++) birds.push({ x0: i * 14 + hash(i, 6) * 6, y0: 67 + hash(i, 7) * 5, v: 6.5, ph: hash(i, 8) * 6.28, span: 3, low: true });

  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N);
  const set = (x: number, r: number, c: number[], a = 1) => {
    x = Math.round(x), r = Math.round(r);
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    FR[k] = mix(FR[k], c[0], a), FG[k] = mix(FG[k], c[1], a), FB[k] = mix(FB[k], c[2], a);
  };

  return (t, { color } = {}) => {
    const drift = t * 1.6;

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      const mo = Math.floor(drift * (0.6 + 0.4 * band[r]));
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr: number, cg: number, cb: number;
        if (r < WATER) {
          cr = SR[k], cg = SG[k], cb = SB[k];
        } else {
          // The lake: the picture above, mirrored and pulled sideways by the
          // ripples, more so toward us, a shade darker and bluer.
          const d = y - WATER;
          const w = noise(x * 0.05 + t * 0.15, d * 0.7 - t * 0.9, 0) - 0.5 + 0.5 * (noise(x * 0.16 - t * 0.3, d * 1.6 - t * 1.6, 0) - 0.5);
          const amp = 0.15 + d * 0.07;
          const sx = Math.max(0, Math.min(W - 1, Math.round(x + w * amp * 3)));
          const sr = Math.max(0, Math.min(WATER - 1, Math.round(WATER - 1 - d + w * (0.3 + d * 0.05))));
          const j = sr * W + sx;
          // the lake also holds the dawn's warmth, a rose wash over the mirror
          // the palace mirrored a step darker, so the waterline reads; a pale
          // line of sky lies right along it
          const dim = (0.86 - 0.12 * smooth(0, 38, d)) * (solid[j] ? 0.8 : 1);
          const edge = d < 1 ? 0.14 : 0;
          cr = SR[j] * dim + 0.07 + edge, cg = SG[j] * dim + 0.02 + edge, cb = SB[j] * dim + 0.02 + edge * 1.1;
          // ripple lines: thin lighter and darker streaks along the surface
          const line = noise(x * 0.03 - t * 0.05, d * 2.4 - t * 0.6, 0);
          const ln = (smooth(0.6, 0.85, line) - smooth(0.4, 0.15, line) * 0.7) * (0.04 + 0.08 * smooth(0, 30, d));
          cr += ln, cg += ln, cb += ln * 1.1;
          // the sun's path: a column of gold glints under the sun
          const pathW = 4 + d * 0.45;
          const path = Math.exp(-(((x + 0.5 - SUN[0] - w * 2) / pathW) ** 2));
          const glint = smooth(0.55, 0.82, noise(x * 0.3 + t * 0.4, d * 1.4 - t * 1.2, 0)) * path;
          cr += 0.55 * glint + 0.2 * path, cg += 0.45 * glint + 0.15 * path, cb += 0.22 * glint + 0.04 * path;
        }
        // drifting mist, in front of everything; thinner over the palace body
        const mv = mist[r * MW + ((x - mo) % MW + MW) % MW] * band[r];
        if (mv > 0.01) {
          const a = mv * (r < WATER && solid[k] ? 0.4 : 0.75);
          cr = mix(cr, 0.98, a), cg = mix(cg, 0.86, a), cb = mix(cb, 0.86, a);
        }
        FR[k] = cr, FG[k] = cg, FB[k] = cb;
      }
    }

    // the boat, dark against the sun's path, rocking a little as it drifts,
    // with its boatman and pole
    const bx = 158 + 4 * Math.sin(t * 0.08), by = 79 + 0.4 * Math.sin(t * 1.3);
    const WOOD = [0.24, 0.15, 0.12], WOOD2 = [0.4, 0.26, 0.18], MAN = [0.2, 0.15, 0.19];
    // rings spreading out from the pole, behind the hull
    for (let ring = 0; ring < 2; ring++) {
      const rad = ((t * 1.4 + ring * 4.5) % 9) + 1;
      for (let a = 0; a < 60; a++) {
        const ang = (a / 60) * Math.PI * 2;
        set(bx - 9 + Math.cos(ang) * rad * 2, by + 5 + Math.sin(ang) * rad * 0.4, [0.98, 0.9, 0.86], 0.6 * (1 - rad / 10));
      }
    }
    for (let i = -12; i <= 12; i++) {
      // a long low hull, prow and stern curling up
      const rise = Math.pow(Math.abs(i) / 12, 3) * 3.2;
      set(bx + i, by - rise, WOOD2);
      if (Math.abs(i) < 11.5) set(bx + i, by + 1 - rise * 0.3, WOOD);
      if (Math.abs(i) < 9.5) set(bx + i, by + 2, WOOD);
      // its broken reflection
      if (Math.abs(i) < 10 && hash(i + Math.floor(t * 4), 9) > 0.3) set(bx + i + Math.sin(t * 2 + i) * 0.6, by + 4, [0.32, 0.26, 0.32], 0.7);
    }
    // the boatman, leaning on his pole
    for (let j = 0; j < 9; j++) set(bx + 3, by - 1 - j, MAN), j > 1 && j < 7 && set(bx + 4, by - 1 - j, MAN);
    set(bx + 5, by - 6, MAN), set(bx + 6, by - 7, MAN);
    set(bx + 3, by - 11, MAN), set(bx + 4, by - 11, MAN);
    set(bx + 3, by - 12, [0.9, 0.3, 0.28]), set(bx + 4, by - 12, [0.9, 0.3, 0.28]); // a red turban
    for (let j = 0; j < 24; j++) set(bx + 8 - j * 0.7, by - 13 + j * 0.85, [0.3, 0.22, 0.18]);

    // birds: a V that flaps; dark against the sky, white over the water
    for (const b of birds) {
      const x = ((b.x0 + b.v * t) % 260 + 260) % 260 - 30;
      const f = Math.sin(t * (b.low ? 7 : 5) + b.ph);
      const y = b.y0 + 0.8 * Math.sin(t * 0.7 + b.ph);
      const ink = b.low ? [1, 0.99, 0.96] : [0.3, 0.27, 0.36];
      set(x, y, ink);
      for (let i = 1; i <= b.span; i++) {
        const lift = -f * i * 0.7;
        set(x - i, y + lift + (i === b.span ? 0.3 : 0), ink);
        set(x + i, y + lift + (i === b.span ? 0.3 : 0), ink);
      }
      if (b.low) {
        set(x + 1, y + 0.6, ink), set(x + 2, y + 0.4, [0.95, 0.75, 0.3]); // the neck and the bill
        // its reflection just under it
        if (y + 6 < H) set(x, y + 5, [0.9, 0.88, 0.88], 0.45);
      }
    }

    for (let r = 0; r < H; r++) {
      const fade = smooth(H, H - 22, r + 0.5); // the bottom rows thin out into the ground
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = FR[k], cg = FG[k], cbl = FB[k];
        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cbl, 1e-4);
        const level = Math.pow(clamp((peak - 0.18) / 0.78), 1.15) * fade;
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
