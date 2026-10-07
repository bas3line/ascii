/*
 * smoke: a thread of smoke from a stick of incense. It leaves the ember as a
 * straight line, starts to waver, frays into curls and thins to nothing.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "smoke",
  category: "physics",
  note: "incense smoke rising straight, then curling and thinning",
  cols: 44,
  rows: 24,
  fps: 30,
} satisfies Meta;

// Smoke is ink on either ground, so the ramp is not flipped on paper.
const RAMP = " .·:;+"; // thin to thick
const TIP = 17; // the ember's row
const RATE = 70; // puffs a second leaving the ember
const LIFE = 8; // seconds a puff lasts
const RISE = 3.4; // rows a second, near the ember
const FRAY = [2.3, 3.6]; // ages over which the thread gives way to haze
// Loose eddies higher up, as waves of a stream function: wavelength in rows, heading, drift, strength.
const WAVES: [number, number, number, number][] = [
  [8, 0.4, 0.5, 1],
  [5.5, 2.3, -0.8, 0.9],
  [3.6, 1.1, 1.1, 0.6],
  [11, -1, 0.3, 0.8],
];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

export default function smoke(): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(11);
  const CX = Math.floor(cols / 2) + 0.5;
  const waves = WAVES.map(([len, ang, drift, amp]) => {
    const k = (2 * Math.PI) / len;
    return { kx: k * Math.cos(ang), ky: k * Math.sin(ang), w: drift, a: amp * 1.6, ph: rand() * 6.283 };
  });

  // The air at (x, y), in rows from the ember. It rises and slows as it cools.
  // A row of eddies riding up the plume makes the thread waver and roll, and
  // looser eddies above break it up.
  const flow = (x: number, y: number, t: number): [number, number] => {
    const k = 1.05, s = k * (y - RISE * 0.8 * t) + 0.4 * Math.sin(t * 0.37);
    const g = Math.exp(-((x / 2.2) ** 2)), lift = 1.7 * smooth(1.5, 7, y) * (1 - 0.5 * smooth(9, 15, y));
    let u = lift * g * Math.cos(s), v = (lift * g * Math.sin(s) * 2 * x) / (2.2 * 2.2 * k);
    const e = smooth(6, 12, y), yy = y - RISE * 0.7 * t;
    for (const q of waves) {
      const c = Math.cos(q.kx * x + q.ky * yy + q.w * t + q.ph) * q.a * e;
      u += (c * q.ky) / 1.2;
      v -= (c * q.kx) / 1.2;
    }
    return [u + 0.15 * Math.sin(t * 0.55) * smooth(0.5, 5, y), RISE * (1 - 0.35 * smooth(3, 15, y)) + 0.5 * v];
  };

  // Puffs in the order they left the ember, so neighbours trace one thread.
  // Each carries a little noise that decides where the thread breaks.
  const puffs: { x: number; y: number; age: number; n: number; cut: number }[] = [];
  let clock = 0, made = 0;
  const step = (dt: number) => {
    clock += dt;
    for (; made < clock * RATE; made++) {
      const age = clock - made / RATE;
      puffs.push({ x: 0, y: age * RISE, age, n: made, cut: rand() * 0.7 + 0.3 * Math.sin(made * 0.09) });
    }
    for (const p of puffs) {
      const [u, v] = flow(p.x, p.y, clock);
      p.x += u * dt;
      p.y += v * dt;
      p.age += dt;
    }
    while (puffs.length && (puffs[0].age > LIFE || puffs[0].y > TIP + 3)) puffs.shift();
  };
  for (let i = 0; i < 270; i++) step(1 / 30); // nine seconds, so the column is full

  const N = cols * rows;
  const haze = new Float64Array(N), line = new Float64Array(N);
  const X: number[] = [], Y: number[] = [];
  let last = 0;
  return (time) => {
    let dt = Math.min(0.1, Math.max(0, time - last));
    last = time;
    for (; dt > 1e-9; dt -= 1 / 30) step(Math.min(dt, 1 / 30));

    const n = puffs.length;
    for (let i = 0; i < n; i++) (X[i] = CX + 2 * puffs[i].x), (Y[i] = TIP + 0.5 - puffs[i].y);
    const g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    haze.fill(0);
    line.fill(0);

    // An old puff has let go of the thread and spreads as haze, thinning as it goes.
    for (let i = 0; i < n; i++) {
      const p = puffs[i], loose = smooth(FRAY[0] - 0.4, FRAY[1], p.age);
      if (loose <= 0) continue;
      const rad = 0.55 + 0.2 * (p.age - FRAY[0] + 0.4);
      const m = (loose * Math.exp(-(p.age - FRAY[0]) / 1.7)) / (rad * rad);
      const col = X[i], row = Y[i];
      for (let rr = Math.max(0, Math.floor(row - rad)); rr <= Math.min(rows - 1, row + rad); rr++)
        for (let cc = Math.max(0, Math.floor(col - 2 * rad)); cc <= Math.min(cols - 1, col + 2 * rad); cc++) {
          const d2 = (((cc + 0.5 - col) / 2) ** 2 + (rr + 0.5 - row) ** 2) / (rad * rad);
          if (d2 < 1) haze[rr * cols + cc] += m * (1 - d2) * (1 - d2);
        }
    }

    // The thread: where it crosses each row's middle, one stroke, slanted by
    // how fast it runs sideways there and bowed where it bends.
    const hits: { r: number; x: number; s: number; hold: number }[] = [];
    for (let i = 0; i + 1 < n; i++) {
      const p = puffs[i], hold = 1 - smooth(FRAY[0], FRAY[1], p.age);
      if (hold < p.cut * 0.9) continue; // broken here
      const y0 = Y[i], y1 = Y[i + 1], r = Math.floor(Math.max(y0, y1) - 0.5);
      if (r < 0 || Math.min(y0, y1) > r + 0.5 || y0 === y1) continue;
      const u = (r + 0.5 - y0) / (y1 - y0), x = X[i] + u * (X[i + 1] - X[i]);
      const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 4);
      hits.push({ r, x, s: (X[b] - X[a]) / (Y[b] - Y[a] || 1e-6), hold });
    }
    for (let h = 0; h < hits.length; h++) {
      const q = hits[h], c = Math.floor(q.x);
      if (c < 0 || c >= cols) continue;
      const k = q.r * cols + c;
      if (line[k] >= q.hold) continue;
      line[k] = q.hold;
      const up = hits[h - 1], dn = hits[h + 1];
      const bend = up && dn && up.r === q.r - 1 && dn.r === q.r + 1 ? q.x - (up.x + dn.x) / 2 : 0;
      const s = q.s;
      let ch = Math.abs(s) < 0.6 ? "|" : Math.abs(s) < 3.2 ? (s < 0 ? "/" : "\\") : "-";
      if (Math.abs(s) < 1.1 && Math.abs(bend) > 0.45) ch = bend < 0 ? "(" : ")";
      g[q.r][c] = ch;
    }

    // Haze fills in round the thread, its faintest edge dropped.
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        if (line[k] > 0) continue;
        const h = haze[k] * 0.5;
        if (h < 0.07) continue;
        g[r][c] = RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(Math.sqrt(h) * 2.3))];
      }

    // The stick and its smouldering ember, standing in a bowl of ash.
    const sc = Math.floor(CX);
    const glow = 0.55 + 0.25 * Math.sin(time * 1.9) + 0.15 * Math.sin(time * 4.7 + 1) + 0.12 * Math.sin(time * 11.3 + 2);
    g[TIP][sc] = glow > 0.5 ? "*" : glow > 0.2 ? "+" : "·";
    for (let r = TIP + 1; r < rows - 2; r++) g[r][sc] = "┃";
    ["._______┃_______.", "\\_______________/"].forEach((s, k) => {
      for (let i = 0; i < s.length; i++) g[rows - 2 + k][sc - 8 + i] = s[i];
    });
    return g.map((row) => row.join("")).join("\n");
  };
}
