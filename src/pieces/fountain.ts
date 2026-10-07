/*
 * fountain: a tall jet and two pairs of arcs leave a nozzle, break into drops
 * on the way down and splash into a brim-full basin, rippling its surface.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "fountain",
  category: "physics",
  note: "arcs of water from a nozzle falling as drops into a basin",
  cols: 57,
  rows: 22,
  fps: 30,
} satisfies Meta;

const G = 30; // gravity, rows a second squared
const RATE = 80; // drops leaving each jet a second
const WATER = 17; // the row of the water line
const NOZ = 6.5; // the nozzle's mouth above the water, rows
const T0 = 8; // seconds in, so every arc is already full
// Each jet: angle from upright in degrees, where its middle meets the water
// in rows from the post (0 for the upright jet, which is aimed by height),
// how much its drops wander in angle and speed, and one drop in how many
// stays in sight once it breaks up on the way down.
const JETS: [number, number, number, number, number][] = [
  [0, 0, 0.004, 0.035, 3],
  [-17, -7, 0.006, 0.008, 4],
  [17, 7, 0.006, 0.008, 4],
  [-42, -10.4, 0.005, 0.006, 5],
  [42, 10.4, 0.005, 0.006, 5],
];
const TOP = 8.4; // how far the upright jet climbs above the nozzle
const BASIN = [
  "▀".repeat(49),
  "\\" + "_".repeat(45) + "/",
  "|" + " ".repeat(13) + "|",
  "___|" + "_".repeat(13) + "|___",
];
// "#" is the post's hollow middle: blank, and drops pass behind it.
const POST = ["_/^\\_", " |#| ", " |#| ", " |#| ", " |#| ", " |#| ", "_/#\\_"];

const hash = (i: number, s: number) => {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
// Seconds from leaving the nozzle with upward speed vy until meeting the water.
const flight = (vy: number) => (vy + Math.sqrt(vy * vy + 2 * G * NOZ)) / G;

export default function fountain(): Frame {
  const { cols, rows } = meta;
  const CX = Math.floor(cols / 2) + 0.5; // the middle of the nozzle's cell
  // The launch speed that lands each arc where it should, by bisection.
  const jets = JETS.map(([deg, land, wa, wv, keep], j) => {
    const a = (deg * Math.PI) / 180;
    let v = Math.sqrt(2 * G * TOP);
    if (deg) {
      let lo = 1, hi = 60;
      for (let k = 0; k < 40; k++) {
        v = (lo + hi) / 2;
        Math.abs(v * Math.sin(a) * flight(v * Math.cos(a))) < Math.abs(land) ? (lo = v) : (hi = v);
      }
    }
    return { a, v, wa, wv, keep, j };
  });
  jets.push(jets.shift()!); // the upright jet is drawn last, so it runs whole down to the nozzle

  // Drop i of a jet: when it left, its velocity, and how long it flies. The
  // upright jet's pressure swells and eases every five seconds.
  const drop = (jet: (typeof jets)[number], i: number) => {
    const s = jet.j * 7 + 1;
    const pulse = jet.j ? 1 : 0.95 + 0.05 * Math.sin((i / RATE) * 1.2566);
    const a = jet.a + (hash(i, s) - 0.5) * 2 * jet.wa * Math.PI;
    const v = jet.v * pulse * (1 + (hash(i, s + 1) - 0.5) * 2 * jet.wv);
    const vx = v * Math.sin(a), vy = v * Math.cos(a);
    return { t0: (i + hash(i, s + 2) * 0.6) / RATE, vx, vy, end: flight(vy) };
  };

  return (time) => {
    const t = T0 + time;
    const g = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    const solid = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
    const put = (c: number, r: number, ch: string) => {
      if (r >= 0 && r < rows && c >= 0 && c < cols && !solid[r][c]) g[r][c] = ch;
    };
    const stamp = (art: string[], r0: number) =>
      art.forEach((line, k) => {
        const c0 = Math.floor(CX) - (line.length - 1) / 2; // every line is odd and centred on the post
        for (let c = 0; c < line.length; c++) {
          if (line[c] === " ") continue;
          g[r0 + k][c0 + c] = line[c] === "#" ? " " : line[c];
          solid[r0 + k][c0 + c] = true;
        }
      });
    stamp(BASIN, WATER + 1);
    stamp(POST, WATER - POST.length + 1);

    const rings: [number, number][] = [], hits: number[] = [], crowns: [number, number, number, number][] = [];
    for (const jet of jets) {
      for (let i = Math.floor((t - 3.2) * RATE); i <= Math.ceil(t * RATE); i++) {
        const d = drop(jet, i), age = t - d.t0;
        if (age < 0) continue;
        if (age >= d.end) {
          const k = age - d.end, x = d.vx * d.end;
          if (k < 1.4 && hash(i, jet.j + 60) < 0.018) rings.push([x, k]);
          if (k < 0.07 && i % jet.keep === 0) hits.push(x);
          if (k < 0.4 && hash(i, jet.j + 70) < 0.03) crowns.push([x, k, i, jet.j]);
          continue;
        }
        const vy = d.vy - G * age;
        // The stream rises whole and breaks into drops past the top, a few in sight.
        if (vy < 0 && i % jet.keep) continue;
        const row = WATER - NOZ - d.vy * age + (G * age * age) / 2;
        if (vy < 0 && !jet.j && row > WATER - NOZ - 1) continue; // fallen back into the nozzle's throat
        const speed = Math.hypot(d.vx, vy), ang = (Math.atan2(vy, d.vx) * 180) / Math.PI;
        // Rising, the stream's glyph runs along it, and the upright one stays
        // upright, beading where it slows at the top. Falling, a drop is a dot,
        // drawn out once it is fast.
        let ch: string;
        if (vy < 0) ch = speed > 17 ? ":" : "·";
        else if (!jet.j) ch = speed > 7 ? "|" : speed > 3 ? "·" : "°";
        else if (Math.abs(ang - 90) < 22) ch = "|";
        else if (ang < 28 || ang > 152) ch = row % 1 < 0.5 ? "-" : "_";
        else ch = ang < 90 ? "/" : "\\";
        put(Math.floor(CX + 2 * d.vx * age), Math.floor(row), ch);
      }
    }

    // The water line: calm, with a wavelet running out each way from a landing.
    const lo = Math.floor(CX) - 23, hi = Math.floor(CX) + 23;
    for (let c = lo; c <= hi; c++) {
      if (solid[WATER][c]) continue;
      const x = (c + 0.5 - CX) / 2;
      let h = 0;
      for (const [x0, k] of rings) {
        const d = Math.abs(Math.abs(x - x0) - 0.5 - 2.6 * k);
        if (d < 0.4) h += (1 - d * 2.5) * (1 - k / 1.4);
      }
      g[WATER][c] = h > 0.3 ? "~" : "-";
    }
    // Where a drop strikes, the surface jumps; a crown of two drops is thrown
    // up either side and falls back in.
    for (const x of hits) {
      const c = Math.floor(CX + 2 * x);
      if (c >= lo && c <= hi && !solid[WATER][c]) g[WATER][c] = "^";
    }
    for (const [x, k, i, j] of crowns) {
      for (const side of [-1, 1]) {
        const vx = side * (1.2 + hash(i, j + 40) * 1.4), vy = 7 + hash(i, j + 50 + side) * 4;
        const y = vy * k - (G * k * k) / 2;
        if (y <= 0.2) continue;
        put(Math.floor(CX + 2 * (x + vx * k)), Math.floor(WATER - y), vy - G * k > 0 ? "'" : ".");
      }
    }
    return g.map((row) => row.join("")).join("\n");
  };
}
