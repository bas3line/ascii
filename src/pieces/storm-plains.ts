/*
 * storm plains: an anvil thunderhead at dusk over open wheat country. The
 * sun has just set behind the farmhouse, so the storm's top and western flank
 * still catch its light while the base sinks into slate shadow. Lightning
 * flickers inside the cloud, now and then a bolt reaches the ground, rain
 * curtains drift under the base and the wheat moves in gusts.
 *
 * The cloud is built as a height field (heaped domes, a flat anvil, pouches
 * hanging under it) and lit from its surface normals. Every cell is shaded in
 * colour, then drawn as a halftone: dot size from brightness with an ordered
 * dither, colour from the palette entry nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "storm plains",
  category: "scenes",
  note: "an anvil thunderhead at dusk flickering over a wheat field",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0b0912",
  palette: [
    // night violets, zenith to dusk
    "#0f0c20", "#141029", "#1c1638", "#261c4a", "#32235a", "#40306c", "#53407e", "#6a5590", "#8670a6",
    // dusty mauve, the shaded flank
    "#7a6288", "#9a7890", "#b98e94",
    // peach and gold, the sunlit tops
    "#e6a890", "#f2bca8", "#f7d6a8", "#fbe8c6",
    // amber afterglow
    "#f8b070", "#e88a4c", "#c8643a", "#9a4630", "#6a3226",
    // wheat, gold to umber
    "#f0c868", "#d8a447", "#b7843a", "#8c6230", "#5e4226", "#3a2a1c", "#261c14",
    // rain and slate
    "#181a2c", "#2a3048", "#3a4260", "#4f5878", "#6a7392", "#8890ae", "#a2aabd", "#5d5878", "#7c7598",
    // lightning
    "#a6a2c8", "#d6d2fa", "#f4f2ff",
    // lamplight
    "#ffe08a", "#ffb84a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 64; // the horizon
const SUN = [30, 70]; // just below the horizon, behind the farmhouse
const BASE = 45; // the storm's flat base
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, PLAIN = 1, FIELD = 2, ROAD = 3, HOUSE = 4, ROOF = 5, PANE = 6, TREE = 7, PUMP = 8, BELT = 9;

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
const dome = (dx: number, dy: number, r: number) => {
  const q = 1 - dx * dx - dy * dy;
  return q > 0 ? r * Math.sqrt(q) : 0;
};

// Distance from (px, py) to the segment a-b.
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  const ex = px - ax - dx * k, ey = py - ay - dy * k;
  return Math.sqrt(ex * ex + ey * ey);
}

export default function stormPlains(): Frame {
  const P = meta.palette.map(hex);
  const STALK = meta.palette.indexOf("#8c6230");
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

  // --- the thunderhead, as a height field ----------------------------------
  const towerC = (y: number) => 138 + (BASE - y) * 0.14;
  const towerHW = (y: number) => 23 - (BASE - y) * 0.08;
  const anvilTop = (x: number) => 7.5 + 2.5 * smooth(150, 210, x) + 3 * smooth(112, 58, x);
  const anvilBot = (x: number) => 21 - 9 * smooth(124, 62, x) - 7 * smooth(152, 210, x);
  // The towers are heaps of puffs: [x, y, radius, bulge toward us]. Each puff
  // is a dome in the height field, so it gets its own lit side and shadow.
  const puffs: [number, number, number, number, number][] = [];
  let seed = 1;
  const rnd = () => hash(seed++, 911);
  for (let y = BASE - 4.5; y > 14; y -= 4.4) {
    const cx = towerC(y), hw = towerHW(y);
    const n = Math.max(2, Math.round((hw * 2) / 11));
    for (let i = 0; i < n; i++) {
      const u = ((i + 0.5) / n) * 2 - 1;
      const rr = 7 + rnd() * 4;
      puffs.push([cx + u * (hw - rr * 0.55) + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 2, rr, 4 * Math.sqrt(1 - u * u * 0.85), 1]);
    }
  }
  // the overshooting top, bulging out of the anvil
  puffs.push([141, 8.5, 9, 2, 0], [133, 9.5, 6, 1, 0], [149, 10, 6, 1, 0]);
  // the flanking line: younger towers stepping down to the west
  for (const [cx, top, w] of [
    [104, 27, 9],
    [89, 34, 6.5],
    [77, 40.5, 3.8],
  ]) {
    for (let y = BASE - w * 0.4; y > top + w * 0.6; y -= w * 0.75) puffs.push([cx + (rnd() - 0.5) * w * 0.6, y, w * (0.75 + rnd() * 0.2), 1, 1]);
    puffs.push([cx - w * 0.35, top + w * 0.75, w * 0.62, 1, 1], [cx + w * 0.3, top + w * 0.6, w * 0.7, 1.5, 1], [cx, top + w * 0.45, w * 0.55, 2, 1]);
  }
  // one continuous low base under the line, so the towers stand on something
  for (let x = 66; x < 126; x += 3.2 + rnd() * 1.6) puffs.push([x, BASE - 1.8 - rnd() * 1.2, 3 + rnd() * 1.6 + 1.6 * smooth(70, 110, x), 0.4, 1]);

  const SX = W + 4, SY = BASE + 8; // the grid, two cells of margin either side
  const sh = new Float32Array(SX * SY);
  const anv = new Float32Array(SX * SY); // how much of the height is anvil
  const lip = new Float32Array(SX * SY); // the anvil's sunlit top edge
  for (let r = 0; r < SY; r++) {
    for (let i = 0; i < SX; i++) {
      const x = i - 2 + 0.5, y = r + 0.5;
      // the towers, cut flat along the base
      let tower = 0;
      const cut = smooth(BASE + 1, BASE - 1.5, y + 1.2 * (noise(x * 0.15, 3.3, 0) - 0.5));
      for (const [px, py, pr, pz, flat] of puffs) {
        const dx = (x - px) / pr, dy = (y - py) / pr;
        if (dx * dx + dy * dy >= 1) continue;
        const v = (pr * 0.6 + pz) * Math.sqrt(1 - dx * dx - dy * dy) * (flat ? cut : 1);
        if (v > tower) tower = v;
      }
      // the anvil: flat on top, a lens in section, combed by the wind
      const fib = fbm(x * 0.035, y * 0.2, 3, 0) - 0.5;
      const top = anvilTop(x) + 2.2 * fib, bot = anvilBot(x) - 1.5 * fib - 3 * (fbm(x * 0.2, 7, 2, 0) - 0.5);
      const mid = (top + bot) / 2, half = Math.max(0.5, (bot - top) / 2);
      let anvil = dome(0, (y - mid) / half, Math.min(5, half * 0.9)) * smooth(58, 72, x + 6 * fib);
      const onTop = anvil > 0 ? smooth(top + 3.2, top + 0.6, y) : 0;
      // pouches of mammatus hanging under its western half
      if (x > 66 && x < 128 && y > bot - 2 && y < bot + 5) {
        const row = Math.floor((x - 66) / 5.2);
        const off = row * 5.2 + 66 + 2.6 + (hash(row, 3) - 0.5) * 1.2;
        const py = bot + 0.6 + hash(row, 4) * 1.2;
        anvil = Math.max(anvil, dome((x - off) / 2.7, (y - py) / 2.3, 2.2) * smooth(64, 76, x) * smooth(130, 116, x));
      }
      const solid = tower;
      let h = Math.max(solid, anvil);
      const a = anvil > solid ? smooth(0, 2, anvil - solid) : 0;
      // small billows on the towers; long streaks on the anvil, combed at a
      // slight slant so they do not line up with the rows
      const billow = fbm(x * 0.22, y * 0.24, 3, 0) - 0.5;
      const sy = y * 0.18 + 0.9 * (noise(x * 0.04, 5.5, 0) - 0.5) + x * 0.012;
      const streaky = fbm(x * 0.03 + 0.6 * noise(x * 0.08, y * 0.1, 0), sy, 3, 0) - 0.5;
      h += Math.min(1, h / 2.5) * mix(3 * billow, 2.2 * streaky, a);
      sh[r * SX + i] = Math.max(0, h);
      anv[r * SX + i] = a;
      lip[r * SX + i] = onTop * a;
    }
  }

  // --- static colour of every cell: sky, storm, land -----------------------
  const sr = new Float32Array(N), sg = new Float32Array(N), sb = new Float32Array(N);
  const mat = new Uint8Array(N);
  const cloud = new Float32Array(N); // storm cover, for the lightning
  const dark = new Float32Array(N); // base and shelf, lit from behind by a flash
  const darkSky = new Float32Array(N); // the slot under the storm
  const floorOf = new Float32Array(N);
  const jit = new Float32Array(N); // per-cell dither jitter, against contour lines
  for (let k = 0; k < N; k++) jit[k] = (hash(k % W, ((k / W) | 0) + 517) - 0.5) * (((k / W) | 0) < HZ ? 0.16 : 0.06);
  const glowSun = (x: number, y: number) => {
    const dx = x - SUN[0], dy = y - SUN[1];
    return Math.exp(-((dx / 48) ** 2) - ((dy / 10) ** 2)) * 0.9 + Math.exp(-((dx / 95) ** 2) - ((dy / 20) ** 2)) * 0.26;
  };
  const LX = -0.72, LY = -0.3, LZ = 0.62; // toward the light: west, a touch high, out of the page

  // the farmhouse, its tree and a windpump, standing on the horizon
  const ground = (x: number) => HZ + 3 - 1.2 * smooth(20, 70, x) * smooth(110, 70, x);
  const HX0 = 40, HX1 = 54, HW0 = 58; // walls from x 40 to 54, eaves at row 58
  const hb = ground(47);
  const PUMP_X = 66, PUMP_Y = hb - 15;

  // the shelf: a flat dark lip of cloud along the storm's leading edge
  const shelfTop = (x: number) => BASE - 2.4 + 1.2 * (noise(x * 0.2, 8.1, 0) - 0.5);
  const shelfBot = (x: number) => BASE + 2.4 + 1.8 * (fbm(x * 0.12, 8.7, 2, 0) - 0.5) - 2 * smooth(184, 199, x) - 2 * smooth(114, 104, x);
  const shelfOn = (x: number) => smooth(103, 112, x) * smooth(199, 190, x);

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      if (y < ground(x)) {
        // sky: indigo overhead, dusky rose lower down, amber where the sun went
        const v = y / HZ;
        const g = glowSun(x, y);
        const east = smooth(60, 190, x); // the storm side is cooler and darker
        const v2 = Math.pow(v, 2.2);
        const veil = 0.9 + 0.2 * fbm(x * 0.05, y * 0.09, 3, 0);
        let cr = (0.045 + 0.2 * v2 * (1 - 0.6 * east)) * veil + 1.0 * g;
        let cg = (0.045 + 0.09 * v2 * (1 - 0.5 * east)) * veil + 0.56 * g;
        let cb = (0.16 + 0.13 * v2 * (1 - 0.35 * east)) * veil + 0.22 * g;
        // the last light along the horizon, gone where the storm stands
        const be = smooth(45, 118, x);
        const band = Math.exp(-(HZ + 2 - y) / 11) * (1 - 0.85 * be) * (1 - 0.6 * g);
        cr += band * mix(0.5, 0.34, be), cg += band * mix(0.26, 0.21, be), cb += band * mix(0.26, 0.3, be);
        // under the storm the air itself goes dark slate, with only a thread
        // of light left along the ground behind the rain
        const under = smooth(98, 128, x + 8 * (noise(y * 0.15, 4.4, 0) - 0.5)) * smooth(BASE - 14, BASE - 1, y);
        // black under the base, opening to a dim violet glow at the ground:
        // the clear sky far beyond the storm, for the rain to hang against
        const slot = Math.pow(smooth(BASE + 1.5, HZ - 6, y), 0.5) *(0.85 + 0.3 * noise(x * 0.06, 6.6, 0));
        cr = mix(cr, mix(0.035, 0.38, slot) * veil, under * 0.92);
        cg = mix(cg, mix(0.032, 0.3, slot) * veil, under * 0.92);
        cb = mix(cb, mix(0.075, 0.56, slot) * veil, under * 0.92);
        darkSky[k] = under;
        // the storm
        if (r < SY - 1) {
          const i = x + 2, j = r * SX + i;
          const h = sh[j];
          const c = smooth(0.15, 1.6, h);
          if (c > 0) {
            const up = r > 0 ? sh[j - SX] : 0, dn = sh[j + SX];
            const gx = (sh[j + 1] - sh[j - 1]) / 2, gy = (dn - up) / 2;
            const nl = Math.sqrt(gx * gx + gy * gy + 1);
            const nx = -gx / nl, ny = -gy / nl, nz = 1 / nl;
            const an = anv[j];
            const lam = Math.pow(clamp(nx * LX + ny * LY + nz * LZ), 1.5);
            // earth's shadow climbing the tower: the tops still lit, the
            // lower bulk already in dusk
            const vis = 1 - 0.4 * smooth(22, BASE - 4, y + 5 * (noise(x * 0.12, 2.2, 0) - 0.5));
            const a = smooth(8, BASE, y);
            const near = Math.exp(-(((x - SUN[0]) / 110) ** 2));
            const flank = smooth(122, 108, x) * (1 - an); // the younger towers to the west
            // sunlight: cream-gold up high, peach lower down
            const sR = 1.0, sG = mix(0.84, 0.58, a), sB = mix(0.58, 0.45, a);
            // the tower's own bulk shades its eastern side, along a ragged edge
            const ej = 8 * (fbm(y * 0.14 + x * 0.02, 21.3, 3, 0) - 0.5);
            const lee = 1 - 0.65 * smooth(towerC(y) - 14 + ej, towerC(y) + towerHW(y) + 16 + ej, x) * (1 - an) * smooth(anvilBot(x) - 3, anvilBot(x) + 9, y + 5 * (noise(x * 0.15, 21, 0) - 0.5)) * (y < BASE ? 1 : 0);
            const sun = lam * vis * lee * (0.95 + 0.4 * near) * (1 - 0.3 * flank) * (1 - 0.2 * an);
            // skylight from above, violet; afterglow bounced up from the west
            const sky = 0.55 + 0.45 * Math.max(0, -ny);
            const bounce = Math.max(0, ny) * (0.2 + 0.45 * near) * (1 - 0.6 * flank) * (1 - 0.5 * an);
            const occ = 1 - 0.35 * smooth(4, 22, h) * (1 - lam);
            let kr = (0.27 * sky + sR * sun + 0.36 * bounce) * occ;
            let kg = (0.2 * sky + sG * sun + 0.16 * bounce) * occ;
            let kb = (0.45 * sky + sB * sun + 0.16 * bounce) * occ;
            // the anvil's underside sinks into mauve shadow; its top edge
            // catches the last direct light, cream toward the west
            const below = clamp(ny * 2.2) * an;
            kr *= 1 - 0.42 * below, kg *= 1 - 0.46 * below, kb *= 1 - 0.3 * below;
            const rim = lip[j] * smooth(196, 120, x) * (0.6 + 0.4 * lam);
            kr = mix(kr, 0.98, rim * 0.75), kg = mix(kg, 0.86, rim * 0.75), kb = mix(kb, 0.64, rim * 0.75);
            // the flankers' lower halves turn violet-grey
            const low = clamp(ny * 1.6 + 0.2) * flank;
            kr = mix(kr, 0.14, low * 0.65), kg = mix(kg, 0.11, low * 0.65), kb = mix(kb, 0.24, low * 0.65);
            // the base: dark slate where the rain hangs
            const base = smooth(BASE - 4.5, BASE - 0.5, y) * (1 - an) * (1 - 0.3 * near);
            kr = mix(kr, 0.03, base * 0.9), kg = mix(kg, 0.026, base * 0.9), kb = mix(kb, 0.06, base * 0.9);
            cr = mix(cr, kr, c), cg = mix(cg, kg, c), cb = mix(cb, kb, c);
            cloud[k] = c;
            dark[k] = base * c;
          }
        }
        // the shelf, hung along the base, a touch lighter on its leading lip
        const on = shelfOn(x);
        if (on > 0 && y > BASE - 5 && y < BASE + 5) {
          const st = shelfTop(x), sbt = shelfBot(x);
          const s = smooth(st - 1, st + 0.6, y) * smooth(sbt + 0.6, sbt - 0.8, y) * on;
          if (s > 0) {
            const n = fbm(x * 0.15, y * 0.5, 2, 0);
            // striations along its face, and a faint lip of light underneath
            const lit = 0.55 + 0.9 * n * (0.7 + 0.6 * noise(x * 0.05, y * 1.3, 0)) + 0.9 * smooth(sbt - 1.6, sbt - 0.2, y);
            cr = mix(cr, 0.06 * lit, s), cg = mix(cg, 0.056 * lit, s), cb = mix(cb, 0.12 * lit, s);
            cloud[k] = Math.max(cloud[k], s);
            dark[k] = Math.max(dark[k], s);
          }
        }
        sr[k] = cr, sg[k] = cg, sb[k] = cb;
        mat[k] = SKY;
        floorOf[k] = 0.06 - 0.06 * Math.max(darkSky[k], dark[k]);
      } else {
        // land: the afterglow caught only in the far rows near the sun
        const g = glowSun(x, HZ + 1) * Math.exp(-(y - HZ) / 3.2);
        mat[k] = y < HZ + 4 ? PLAIN : FIELD;
        sr[k] = 0.06 + 0.55 * g, sg[k] = 0.045 + 0.3 * g, sb[k] = 0.08 + 0.1 * g;
        floorOf[k] = 0.06;
      }

      // a shelterbelt of trees on the far horizon, half lost in the rain
      const belt = HZ + 2 - (1.5 + 2.2 * fbm(x * 0.3, 2, 2, 0)) * smooth(140, 150, x) * smooth(196, 186, x);
      const belt2 = HZ + 2 - (1 + 1.8 * fbm(x * 0.35, 9, 2, 0)) * smooth(0, 4, x) * smooth(18, 10, x);
      if (y >= Math.min(belt, belt2) && y < HZ + 3) mat[k] = BELT;

      // the cottonwood by the house
      const tx = (x + 0.5 - 31) / 8.5, ty = (y - (hb - 10)) / 7;
      const crown = tx * tx + ty * ty < 1 + 0.35 * (fbm(x * 0.4, y * 0.4, 2, 0) - 0.5);
      if (crown || (Math.abs(x + 0.5 - 31.5) < 1 && y > hb - 6 && y < hb + 1)) mat[k] = TREE;

      // the farmhouse: two storeys, a gable roof, a chimney, a porch
      if (x >= HX0 && x <= HX1 && y >= HW0 && y < hb + 1) mat[k] = HOUSE;
      if (y >= HW0 - 7 && y < HW0 && Math.abs(x + 0.5 - 47.5) <= 8.6 - (HW0 - y) * 1.15) mat[k] = ROOF;
      if (x >= 50 && x <= 51 && y >= HW0 - 8 && y < HW0 - 3) mat[k] = ROOF;
      if (x >= 36 && x < HX0 && y >= hb - 4 && y < hb - 3) mat[k] = ROOF;
      if (x === 36 && y >= hb - 3 && y < hb) mat[k] = HOUSE;
      if (x >= 49 && x <= 51 && y >= HW0 + 2 && y < HW0 + 5) mat[k] = PANE;
      if (x >= 43 && x <= 44 && y >= HW0 + 2 && y < HW0 + 4) mat[k] = PANE;

      // the windpump: a tapering lattice tower
      const py = y - PUMP_Y;
      if (py > 2 && y < hb + 0.5) {
        const half = 0.4 + py * 0.11;
        const dx = x + 0.5 - PUMP_X;
        if (Math.abs(Math.abs(dx) - half) < 0.55) mat[k] = PUMP;
        if (Math.abs(dx) < half && (py | 0) % 4 === 0) mat[k] = PUMP;
      }
    }
  }

  // the road: from the yard to the bottom edge, a leading line
  const roadC = (p: number) => 57 + 62 * Math.pow(p, 1.25);
  const roadW = (p: number) => 0.6 + 12 * p;
  for (let r = HZ + 3; r < H; r++) {
    const p = (r + 0.5 - HZ) / (H - HZ);
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] !== FIELD) continue;
      if (Math.abs(x + 0.5 - roadC(p)) < roadW(p) + 0.6 * (noise(x * 0.3, r * 0.3, 0) - 0.5)) mat[k] = ROAD;
    }
  }

  // wheat: stalks in perspective, their columns converging on the farmhouse,
  // tall strokes up close and a fine grain toward the horizon
  const VX = 57;
  const TW = 512;
  const wheat = new Float32Array(H * TW);
  const persp = new Float32Array(N); // each cell's column in the wheat texture
  for (let r = HZ; r < H; r++) {
    const p = (r + 0.5 - HZ) / (H - HZ);
    for (let u = 0; u < TW; u++) wheat[r * TW + u] = fbm(u * 0.55, r * (0.5 - 0.42 * p), 3, TW * 0.55);
    for (let x = 0; x < W; x++) persp[r * W + x] = ((x + 0.5 - VX) * 24) / (r + 2 - HZ) + 256;
  }
  // how much light the field holds: the sun side, the far rows, not the east
  // or the foreground, which sink into the storm's shadow
  const fieldLight = new Float32Array(N);
  for (let r = HZ; r < H; r++) {
    const y = r + 0.5;
    const p = (y - HZ) / (H - HZ);
    for (let x = 0; x < W; x++) {
      const sunW = Math.exp(-(((x - SUN[0]) / 100) ** 2));
      const east = smooth(80, 130, x + 10 * p);
      const fore = 1 - 0.6 * smooth(H - 22, H - 2, y);
      fieldLight[r * W + x] = (0.72 + 0.45 * sunW) * (1 - 0.35 * east) * fore;
    }
  }
  // gusts: soft patches of bent, brighter wheat rolling across the field
  const GW = 512;
  const gust = new Float32Array(GW * (H - HZ));
  for (let r = HZ; r < H; r++)
    for (let u = 0; u < GW; u++) gust[(r - HZ) * GW + u] = smooth(0.4, 0.7, fbm(u * 0.025, r * 0.16, 3, GW * 0.025));

  // thin glowing streaks of altostratus in the clear western sky
  const CW = 400;
  const streak = new Float32Array(CW * HZ);
  for (let r = 0; r < HZ; r++)
    for (let u = 0; u < CW; u++) {
      const n = fbm(u * 0.02, r * 0.2, 4, CW * 0.02);
      streak[r * CW + u] = smooth(0.64, 0.8, n) * smooth(40, 46, r) * smooth(HZ - 3, 52, r);
    }

  // stars in the darkest part of the sky
  const stars: [number, number, number, number][] = [];
  for (let r = 0; r < 28; r++)
    for (let x = 0; x < 100; x++)
      if (hash(x, r * 5 + 3) > 0.986 && cloud[r * W + x] < 0.05) stars.push([r * W + x, hash(x, r) * 6.28, 1 + hash(r, x) * 2.5, 0.85 * (1 - r / 28) * (1 - x / 130)]);
  const star = new Float32Array(N);

  // wheat ears right in front of us, bowing with the wind:
  // [x, stalk height, phase, foot below the frame, head length]
  const ears: [number, number, number, number, number][] = [];
  for (let x = 2; x < W; x += 5 + hash(x | 0, 60) * 4) ears.push([x, 8 + hash(x * 3, 61) * 12, hash(x * 7, 62) * 6.28, hash(x * 5, 63) * 6, 5 + (hash(x, 64) > 0.5 ? 1 : 0)]);
  const ear = new Float32Array(N); // > 0: a lit grain head; < 0: a dark stalk
  const touched: number[] = [];

  // rain: one envelope of shafts that drifts, and falling streaks inside it
  const RW = 256;
  const shafts = new Float32Array(RW);
  for (let u = 0; u < RW; u++) shafts[u] = smooth(0.47, 0.57, fbm(u * 0.09375, 0.5, 2, 24));
  const colPhase = new Float32Array(W), colSpeed = new Float32Array(W);
  for (let x = 0; x < W; x++) (colPhase[x] = hash(x, 77) * 40), (colSpeed[x] = 22 + hash(x, 78) * 14);
  const rainTop = new Float32Array(W), rainOn = new Float32Array(W);
  for (let x = 0; x < W; x++) (rainTop[x] = shelfBot(x) - 1.5), (rainOn[x] = smooth(106, 118, x) * smooth(198, 186, x));

  // lightning: a fixed schedule of flashes, some carrying a bolt
  const PERIOD = 3.1;
  const bolts: { x: number; field: Float32Array }[] = [];
  for (let i = 0; i < 4; i++) {
    const segs: [number, number, number, number, number][] = [];
    const walk = (x: number, y: number, len: number, lean: number, depth: number) => {
      for (let s = 0; s < len && y < HZ + 2; s++) {
        const nx = x + (hash(i * 97 + s, depth * 13 + 41) - 0.5) * 3.2 + lean;
        const ny = y + 0.9 + hash(i * 31 + s, depth + 42) * 1.3;
        segs.push([x, y, nx, ny, depth]);
        if (depth === 0 && hash(i * 7 + s, 43) > 0.84) walk(nx, ny, 3 + hash(s, i) * 5, (hash(s, i + 9) - 0.5) * 2.4, 1);
        (x = nx), (y = ny);
      }
    };
    walk(122 + hash(i, 40) * 34, BASE - 4, 40, (hash(i, 44) - 0.5) * 0.8, 0);
    const field = new Float32Array(N).fill(99);
    for (let r = 25; r < HZ + 4; r++)
      for (let x2 = 80; x2 < W; x2++) {
        let m = 99;
        for (const [ax, ay, bx, by, dep] of segs) {
          if (Math.abs(x2 - ax) > 14 && Math.abs(x2 - bx) > 14) continue;
          const d = segDist(x2 + 0.5, r + 0.5, ax, ay, bx, by) + dep * 0.5;
          if (d < m) m = d;
        }
        field[r * W + x2] = m;
      }
    bolts.push({ x: segs[0][0], field });
  }
  const flashAt = (t: number) => {
    const n = Math.floor(t / PERIOD);
    if (n > 0 && hash(n, 50) < 0.25) return null; // some periods stay dark
    const start = n === 0 ? -0.08 : n * PERIOD + 0.2 + hash(n, 51) * 1.6;
    const l = t - start;
    if (l < 0 || l > 0.9) return null;
    // a stroke and its restrikes, each a sharp rise and a fast decay
    let I = 0;
    const strikes = [0, 0.09 + hash(n, 52) * 0.06, 0.32 + hash(n, 53) * 0.2];
    for (let j = 0; j < 3; j++) if (l >= strikes[j]) I += Math.exp(-(l - strikes[j]) / (j === 0 ? 0.09 : 0.06)) * (j === 0 ? 1 : 0.7 - j * 0.15);
    const bolt = n === 0 || hash(n, 54) > 0.55 ? bolts[n % 4] : null;
    const cx = bolt ? bolt.x : 115 + hash(n, 55) * 45;
    const cy = bolt ? BASE - 8 : 14 + hash(n, 56) * 24;
    return { I: Math.min(1.3, I), bolt, cx, cy, boltOn: bolt && l < 0.5 ? Math.min(1, I * 1.4) : 0, inside: 0 };
  };
  // between the big flashes, the storm keeps flickering inside itself
  const FL = 1.6;
  const flickerAt = (t: number) => {
    const n0 = Math.floor(t / FL);
    for (let n = n0; n >= n0 - 1 && n >= 0; n--) {
      const l = t - (n * FL + 0.35 + hash(n, 70) * 0.75);
      if (l < 0 || l > 0.6) continue;
      let I = 0;
      const pulses = [0, 0.08 + hash(n, 71) * 0.1, 0.26 + hash(n, 72) * 0.18];
      for (let j = 0; j < 3; j++) if (l >= pulses[j]) I += Math.exp(-(l - pulses[j]) / 0.07) * (j === 1 ? 0.7 : j === 2 ? 0.45 : 1);
      return { I: Math.min(1, I) * (0.25 + 0.2 * hash(n, 73)), bolt: null, cx: 120 + hash(n, 74) * 38, cy: 15 + hash(n, 75) * 25, boltOn: 0, inside: 1 };
    }
    return null;
  };

  return (t, { color } = {}) => {
    let f = flashAt(t);
    const fl = flickerAt(t);
    if (fl && (!f || f.I < fl.I)) f = fl;
    const I = f ? f.I : 0;
    const inside = f ? f.inside : 0;
    const drift = t * 1.2;
    const shaftOff = t * 0.9;
    const gOff = t * 9;

    for (const [k, ph, sp, a] of stars) star[k] = a * (0.55 + 0.45 * Math.sin(t * sp + ph));

    // the near ears: each stalk bends from its foot, more at the tip, and the
    // gusts that roll across the field push them further
    for (const k of touched) ear[k] = 0;
    touched.length = 0;
    for (const [ex, eh, ph, foot, hl] of ears) {
      const gu = gust[(H - 1 - HZ) * GW + ((((ex | 0) - Math.floor(gOff * 1.5)) % GW) + GW) % GW];
      // the inflow blows toward the storm, so every ear bows a little east
      const lean = 0.7 + 0.7 * Math.sin(t * 1.7 + ph) + 1.8 * gu;
      const tall = eh + hl;
      for (let i = 0; i < tall; i++) {
        const y = Math.round(H + foot - i);
        if (y >= H) continue;
        const q = i / tall;
        const x = Math.round(ex + lean * q * q);
        if (x < 0 || x + 1 >= W) continue;
        const k = y * W + x;
        if (i < eh) {
          // the stalk: a thin dark line against the field
          if (ear[k] === 0) (ear[k] = -1), touched.push(k);
        } else {
          // the head: plump, two grains wide in the middle, tapering at both
          // ends, the grains alternating side to side
          const j = i - eh;
          const tip = j === hl - 1;
          const v = tip ? 0.55 : j === 0 ? 0.7 : 1 - 0.18 * (j & 1);
          if (v > ear[k]) (ear[k] = v), touched.push(k);
          if (!tip && j > 0 && v * 0.82 > ear[k + 1]) (ear[k + 1] = v * 0.82), touched.push(k + 1);
          // a whisker of awns past the tip
          if (tip && y > 0) {
            const a = k - W + (lean > 0.5 ? 1 : 0);
            if (ear[a] < 0.3) (ear[a] = 0.3), touched.push(a);
          }
        }
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      const p = (y - HZ) / (H - HZ);
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = sr[k], cg = sg[k], cb = sb[k];
        let floor = floorOf[k], fade = 1, rain = 0;

        if (m === SKY) {
          const c = cloud[k];
          if (c < 0.98 && r < HZ) {
            // the altostratus, lit gold toward the sun
            const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
            const s0 = streak[r * CW + (ix % CW)], s1 = streak[r * CW + ((ix + 1) % CW)];
            const s = (s0 + (s1 - s0) * fx) * (1 - c) * smooth(105, 55, x) * 0.75;
            if (s > 0.005) {
              const sun = Math.exp(-(((x - SUN[0]) / 80) ** 2));
              cr = mix(cr, 0.5 + 0.5 * sun, s);
              cg = mix(cg, 0.24 + 0.36 * sun, s);
              cb = mix(cb, 0.34 + 0.06 * sun, s);
            }
            if (star[k]) {
              const v = star[k] * (1 - c);
              cr = Math.max(cr, v * 0.9), cg = Math.max(cg, v * 0.88), cb = Math.max(cb, v);
            }
          }
          // rain curtains hanging from the shelf to the ground
          const on = rainOn[x];
          if (on > 0 && y > rainTop[x]) {
            const u = x + (y - BASE) * 0.42 - shaftOff;
            const ui = ((Math.floor(u) % RW) + RW) % RW;
            const env = shafts[ui] * on * smooth(rainTop[x], rainTop[x] + 3, y) * (1 - c * 0.7);
            if (env > 0.01) {
              // falling streaks, slanted with the shafts
              const col = Math.floor(x + (y - BASE) * 0.42) % W;
              const fall = (y * 0.4 - t * colSpeed[col] * 0.1 + colPhase[col] + 1000) % 4;
              const lit = fall < 1.4 ? 1 : 0;
              rain = env;
              cr = mix(cr, 0.06 + 0.07 * lit, env * 0.88);
              cg = mix(cg, 0.065 + 0.075 * lit, env * 0.88);
              cb = mix(cb, 0.12 + 0.1 * lit, env * 0.88);
            }
          }
        } else if (m === FIELD || m === PLAIN) {
          const gi = (r - HZ) * GW + ((((x - Math.floor(gOff * (0.5 + p))) % GW) + GW) % GW);
          const gu = gust[gi];
          const g = sr[k] - 0.06; // the gold glint just under the horizon
          if (m === FIELD) {
            // stalks lean with the gust and spring back
            const sway = 0.5 * Math.sin(t * 2.1 + x * 0.05 + r * 0.17) + 2.2 * gu;
            const u = persp[k] + sway;
            const ui = Math.floor(u), uf = u - ui;
            const a0 = wheat[r * TW + (ui & 511)], a1 = wheat[r * TW + ((ui + 1) & 511)];
            const tex = a0 + (a1 - a0) * uf;
            const v = clamp(0.55 + (tex - 0.5) * (0.9 + 1.4 * p));
            const L = (v * 0.7 + 0.4 * gu) * fieldLight[k];
            cr = 0.04 + 0.7 * L + 0.9 * g;
            cg = 0.03 + 0.48 * L + 0.48 * g;
            cb = 0.035 + 0.18 * L + 0.12 * g;
            fade = smooth(H + 10, H - 8, y);
          } else {
            const v = 0.75 + 0.45 * gu;
            cr *= v, cg *= v, cb *= v;
          }
          floor = 0.05;
        } else if (m === ROAD) {
          const sun = 0.5 + 0.5 * Math.exp(-(((x - SUN[0]) / 110) ** 2));
          const rut = Math.abs(Math.abs(x + 0.5 - roadC(p)) - roadW(p) * 0.45) < 0.4 + p * 0.8 ? 0.6 : 1;
          const L = (0.6 + 0.3 * noise(x * 0.5, r * 0.5, 0)) * sun * rut * (1 - 0.65 * p);
          cr = 0.08 + 0.42 * L, cg = 0.06 + 0.3 * L, cb = 0.07 + 0.26 * L;
          fade = smooth(H + 10, H - 8, y);
          floor = 0.05;
        } else if (m === BELT) {
          // far trees: dark, hazed toward the rain
          const h = smooth(130, 190, x);
          cr = mix(0.07, 0.1, h), cg = mix(0.05, 0.1, h), cb = mix(0.1, 0.17, h);
          floor = 0.06;
        } else if (m === TREE) {
          const rim = noise(x * 0.6, y * 0.6, 0);
          cr = 0.06 + 0.06 * rim, cg = 0.04 + 0.03 * rim, cb = 0.07 + 0.04 * rim;
          floor = 0.03;
        } else if (m === HOUSE || m === PUMP) {
          // back-lit by the afterglow: a dark silhouette with a warm western rim
          const rim = m === HOUSE && x === HX0 ? 0.18 : 0;
          cr = 0.07 + rim, cg = 0.05 + rim * 0.55, cb = 0.09 + rim * 0.3;
          floor = 0.03;
        } else if (m === ROOF) {
          cr = 0.1, cg = 0.06, cb = 0.1;
          floor = 0.03;
        } else if (m === PANE) {
          const g = 0.88 + 0.12 * Math.sin(t * 2.3 + x) * Math.sin(t * 3.7);
          const small = x < 46 ? 0.6 : 1;
          cr = g * small, cg = 0.72 * g * small, cb = 0.3 * g * small;
          floor = 0.3;
        }

        const e = ear[k];
        if (e > 0) {
          // a grain head, warm and brightest on its sunward edge
          const sunW = Math.exp(-(((x - SUN[0]) / 120) ** 2));
          const L = e * (0.5 + 0.5 * sunW);
          (cr = 0.95 * L), (cg = 0.68 * L), (cb = 0.3 * L), (fade = 1), (floor = 0.1);
        }

        // the windpump's wheel, turning slowly, and its tail vane
        const wx = x + 0.5 - PUMP_X, wy = y - PUMP_Y;
        if (wx > -4 && wx < 7 && wy > -4 && wy < 4) {
          const wd = Math.sqrt(wx * wx + wy * wy);
          if (wd < 3.6 && wd > 0.4 && (Math.cos((Math.atan2(wy, wx) - t * 1.6) * 8) > 0.2 || wd < 1)) (cr = 0.07), (cg = 0.05), (cb = 0.09), (floor = 0.03);
          if (wy > -1 && wy < 0.6 && wx > 2) (cr = 0.07), (cg = 0.05), (cb = 0.09), (floor = 0.03);
        }

        // the lit pane's glow on the yard and the wall around it
        const lx = x + 0.5 - 50.5, ly = y - (HW0 + 3.5);
        if (m !== PANE && lx * lx + ly * ly < 200) {
          const lg = Math.exp(-Math.sqrt(lx * lx + ly * ly * 2) / 3) * 0.5;
          cr += lg, cg += lg * 0.66, cb += lg * 0.25;
        }

        // lightning: the cloud glows from inside; the base and the rain are
        // lit from behind; a full flash reaches the land as well
        if (I > 0.01) {
          const dx = x - f!.cx, dy = (y - f!.cy) * 1.3;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const c = m === SKY ? cloud[k] : 0;
          const inner = inside ? Math.exp(-dist / 14) * c * I * 2 : Math.exp(-dist / 16) * (0.3 + 0.7 * c) * I * 1.3;
          const back = m === SKY ? (dark[k] * 0.5 + rain * 0.8) * Math.exp(-Math.abs(dx) / 34) * I * (inside ? 0.5 : 1) : 0;
          const amb = inside ? 0 : I * (m === SKY ? 0.08 : 0.05);
          const lw = inner + back;
          cr += 0.75 * lw + amb * 0.8, cg += 0.72 * lw + amb * 0.8, cb += 1.0 * lw + amb;
          if (f!.boltOn) {
            const d = f!.bolt!.field[k];
            if (d < 12 && (c < 0.6 || y > BASE - 1)) {
              const core = smooth(1.1, 0.35, d) * f!.boltOn;
              const glow = (Math.exp(-d / 2) * 0.55 + Math.exp(-d / 7) * 0.2) * f!.boltOn;
              cr += core + glow * 0.75, cg += core + glow * 0.72, cb += core + glow;
            }
          }
        }

        if (e < 0) {
          // a stalk: one unbroken line of the smallest dots in dark umber
          out[k] = DOTS[1];
          if (color) color[k] = STALK;
          continue;
        }

        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * peak * 0.97 + jit[k]) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          // a small dot is drawn brighter, a large one dimmer, so a gradient
          // stays smooth across the steps; the darkest stay dark
          const want = step ? Math.min(1, (level + 0.04) / COVER[step]) : 0;
          const s = Math.min(0.14 + 0.86 * want, 0.45 + 0.8 * level) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
