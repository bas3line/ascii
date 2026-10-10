// node --test src/kit/math.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import type { Piece } from "../types.ts";
import * as core from "./core.ts";
import { snapshot } from "./core.ts";
import {
  TAU,
  bayer,
  camera,
  clamp,
  cycle,
  degrees,
  ease,
  fbm,
  fbm3,
  fract,
  hash,
  invLerp,
  lcm,
  lerp,
  loopNoise,
  mod,
  mulberry32,
  noise,
  noise2,
  noise3,
  noise4,
  oscillate,
  phase,
  pingpong,
  progress,
  project,
  pulse,
  radians,
  random,
  remap,
  ridged,
  rotate3,
  rotation,
  scatter,
  smoothstep,
  step,
  triangle,
  tween,
  twinkle,
  valueNoise,
  valueNoise3,
  vec2,
  vec3,
  worley,
  wrap,
  type EaseName,
  type Vec3,
} from "./math.ts";
import landscape from "../../examples/kit/math-landscape.ts";
import starfield from "../../examples/kit/math-starfield.ts";
import easing from "../../examples/kit/math-easing.ts";
import galaxy from "../../examples/kit/math-galaxy.ts";
import pool from "../../examples/kit/math-pool.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not ${b}`);

test("core's maths comes through math, the same functions", () => {
  assert.equal(TAU, core.TAU);
  for (const [name, f] of Object.entries({ clamp, lerp, smoothstep, fract, hash, mulberry32, valueNoise, bayer })) assert.equal(f, core[name as keyof typeof core], name);
});

test("invLerp, remap, mod, wrap, pingpong, step, degrees and radians", () => {
  assert.equal(invLerp(10, 20, 15), 0.5);
  assert.equal(invLerp(10, 20, 25), 1.5);
  assert.equal(invLerp(20, 10, 15), 0.5);
  assert.equal(invLerp(3, 3, 7), 0);
  assert.equal(remap(5, 0, 10, 100, 200), 150);
  assert.equal(remap(15, 0, 10, 100, 200), 250);
  assert.equal(remap(15, 0, 10, 100, 200, true), 200);
  assert.equal(remap(-5, 0, 10, 100, 200, true), 100);
  assert.equal(remap(2.5, 0, 10, 1, 0), 0.75);
  assert.equal(remap(4, 4, 4, 1, 9), 1);
  assert.equal(mod(-1, 4), 3);
  assert.equal(mod(9, 4), 1);
  assert.equal(mod(-8, 4), 0);
  assert.equal(mod(-1e-17, 4), 0, "never n itself");
  near(mod(-0.25, 1), 0.75);
  assert.equal(wrap(370, 0, 360), 10);
  assert.equal(wrap(-1, 0, 64), 63);
  assert.equal(wrap(64, 0, 64), 0);
  assert.equal(wrap(12, 10, 12), 10);
  assert.equal(wrap(5, 3, 3), 3);
  // the ends either way round
  assert.equal(wrap(-1, 64, 0), 63);
  assert.equal(wrap(370, 360, 0), 10);
  assert.equal(wrap(5, 10, 0), 5);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((v) => pingpong(v, 3)), [0, 1, 2, 3, 2, 1, 0]);
  assert.equal(pingpong(-1, 3), 1);
  assert.equal(pingpong(5, 0), 0);
  assert.deepEqual([step(1, 0.5), step(1, 1), step(1, 2)], [0, 1, 1]);
  near(degrees(Math.PI), 180);
  near(radians(90), Math.PI / 2);
  near(radians(degrees(1.234)), 1.234);
});

test("random: seeded, the same numbers for the same seed, and checked", () => {
  const a = random(42), b = random(42), c = random(43);
  assert.equal(a.seed, 42);
  const as = Array.from({ length: 50 }, () => a());
  assert.deepEqual(as, Array.from({ length: 50 }, () => b()));
  assert.notDeepEqual(as, Array.from({ length: 50 }, () => c()));
  for (const v of as) assert.ok(v >= 0 && v < 1);
  // the default seed is 1, and mulberry32 underneath
  const d = random(), m = mulberry32(1);
  assert.equal(d.seed, 1);
  assert.equal(d(), m());
  assert.throws(() => random(1.5), /ascii\.rest: random\(\) takes a whole number seed, such as 7, not 1\.5/);
  assert.throws(() => random(NaN), /whole number seed/);
  assert.throws(() => random("7" as never), /whole number seed, such as 7, not "7"/, "a string shows quoted");
  assert.throws(() => random(1).shuffle(null as never), /ascii\.rest: shuffle\(\) takes a list to shuffle in place, not null/);
  assert.throws(() => random(1).chance("0.5" as never), /chance\(\) takes a probability from 0 to 1, not "0\.5"/);
});

test("random's helpers: range, int, pick, chance, normal, sign, angle", () => {
  const r = random(9), N = 20000;
  let sum = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) {
    const v = r.range(-3, 5);
    sum += v;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  near(sum / N, 1, 0.08);
  assert.ok(lo >= -3 && hi < 5 && lo < -2.9 && hi > 4.9);

  const counts = new Map<number, number>();
  for (let i = 0; i < 6000; i++) {
    const v = r.int(1, 6);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  assert.deepEqual([...counts.keys()].sort(), [1, 2, 3, 4, 5, 6], "both ends included");
  for (const n of counts.values()) assert.ok(n > 850 && n < 1150, `int is even: ${n} of 6000`);
  assert.equal(r.int(4, 4), 4);
  assert.throws(() => r.int(3, 1), /int\(\) takes whole numbers lo and hi, with hi at least lo, not 3 and 1/);
  assert.throws(() => r.int(0.5, 2), /whole numbers/);

  const list = ["a", "b", "c", "d"], seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(r.pick(list));
  assert.deepEqual([...seen].sort(), list);
  assert.throws(() => r.pick([]), /pick\(\) takes a list of one or more things, or a string of characters, to pick from, not \[\]/);
  // a character of a string, for a glyph
  const glyphs = new Set<string>();
  for (let i = 0; i < 200; i++) glyphs.add(r.pick("*+.·"));
  assert.deepEqual([...glyphs].sort(), ["*", "+", ".", "·"]);
  assert.equal(random(4).pick("*+.·"), random(4).pick(["*", "+", ".", "·"]), "the same draw as a list of its characters");
  assert.throws(() => r.pick(""), /pick\(\) takes .*, not ""/);
  assert.throws(() => r.pick(7 as never), /pick\(\) takes .*, not 7/);

  let yes = 0;
  for (let i = 0; i < N; i++) if (r.chance(0.25)) yes++;
  near(yes / N, 0.25, 0.015);
  assert.equal(r.chance(0), false);
  assert.equal(r.chance(1), true);
  assert.throws(() => r.chance(2), /chance\(\) takes a probability from 0 to 1, not 2/);

  let s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    const v = r.normal(10, 2);
    s1 += v;
    s2 += v * v;
  }
  const mean = s1 / N;
  near(mean, 10, 0.06);
  near(Math.sqrt(s2 / N - mean * mean), 2, 0.06);
  assert.ok(Number.isFinite(r.normal()));

  const signs = new Set(Array.from({ length: 50 }, () => r.sign()));
  assert.deepEqual([...signs].sort(), [-1, 1]);
  for (let i = 0; i < 500; i++) {
    const a = r.angle();
    assert.ok(a >= 0 && a < TAU);
  }
});

test("random's shuffle and fork", () => {
  const list = Array.from({ length: 30 }, (_, i) => i);
  const out = random(5).shuffle(list);
  assert.equal(out, list, "in place");
  assert.deepEqual([...out].sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i));
  assert.notDeepEqual(out, Array.from({ length: 30 }, (_, i) => i));
  assert.deepEqual(random(5).shuffle(Array.from({ length: 30 }, (_, i) => i)), out);
  assert.deepEqual(random(5).shuffle([]), []);

  const a = random(7), b = random(7);
  b();
  b();
  // a fork depends on the seed and the stream, not on what was drawn
  assert.equal(a.fork(2)(), b.fork(2)());
  assert.notEqual(a.fork(2)(), a.fork(3)());
  assert.notEqual(a.fork(0)(), random(7)());
  assert.ok(Number.isInteger(a.fork(1).seed));
  assert.throws(() => a.fork(0.5), /fork\(\) takes a whole number/);
});

// Samples a noise at 10,000 points and checks it stays in 0..1 and uses most of it.
function spread(name: string, f: (x: number, y: number, z: number) => number, wide = 0.8) {
  const r = random(11);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 10000; i++) {
    const v = f(r.range(-200, 200), r.range(-200, 200), r.range(-50, 50));
    assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), `${name}: ${v} outside 0..1`);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  assert.ok(hi - lo > wide, `${name} spans ${lo.toFixed(3)} to ${hi.toFixed(3)}, less than ${wide} of 0..1`);
}

test("every noise stays in 0..1 and spreads over most of it", () => {
  spread("noise2", (x, y) => noise2(x, y));
  spread("noise3", (x, y, z) => noise3(x, y, z));
  spread("noise4", (x, y, z) => noise4(x, y, z, x - y));
  spread("valueNoise3", (x, y, z) => valueNoise3(x, y, z));
  spread("fbm", (x, y) => fbm(x, y));
  spread("fbm3", (x, y, z) => fbm3(x, y, z));
  spread("ridged", (x, y) => ridged(x, y), 0.7);
  spread("loopNoise", (x, y, z) => loopNoise(x, y, z, 3));
  spread("loopNoise octaves", (x, y, z) => loopNoise(x, y, z, 3, { octaves: 4 }));
  spread("loopNoise ridged", (x, y, z) => loopNoise(x, y, z, 3, { ridged: true, octaves: 2 }), 0.7);
  spread("worley", (x, y) => worley(x, y));
  spread("worley edge", (x, y) => worley(x, y, { edge: true }), 0.7);
});

test("noise is continuous: a small step moves it a little", () => {
  const cells = noise({ kind: "cells" }), band = noise({ drift: 3, period: 8 });
  const fns: [string, (x: number, y: number) => number][] = [
    ["noise2", (x, y) => noise2(x, y)],
    ["noise3", (x, y) => noise3(x, y, 0.3)],
    ["noise4", (x, y) => noise4(x, y, 0.3, 0.7)],
    ["valueNoise3", (x, y) => valueNoise3(x, y, 0.3)],
    ["fbm", (x, y) => fbm(x, y)],
    ["fbm3", (x, y) => fbm3(x, y, 0.3)],
    ["ridged", (x, y) => ridged(x, y)],
    ["loopNoise", (x, y) => loopNoise(x, y, 1.3, 4)],
    ["worley", (x, y) => worley(x, y)],
    ["worley edge", (x, y) => worley(x, y, { edge: true })],
    ["noise() cells", (x, y) => cells(x * 12, y * 6, 1.3)],
    ["noise() smooth drifting loop", (x, y) => band(x * 12, y * 6, 1.3)],
  ];
  const r = random(3);
  for (const [name, f] of fns)
    for (let i = 0; i < 300; i++) {
      const x = r.range(-50, 50), y = r.range(-50, 50);
      assert.ok(Math.abs(f(x, y) - f(x + 0.001, y)) < 0.02, `${name} jumps at ${x}, ${y}`);
    }
});

test("noise is the same for the same seed, different across seeds, and fixed for good", () => {
  const pts = Array.from({ length: 200 }, (_, i) => [i * 0.37 - 30, i * 0.71 - 60] as const);
  const all = (f: (x: number, y: number) => number) => pts.map(([x, y]) => f(x, y));
  const cases: [string, (seed: number) => (x: number, y: number) => number][] = [
    ["noise2", (seed) => (x, y) => noise2(x, y, seed)],
    ["noise3", (seed) => (x, y) => noise3(x, y, 1.5, seed)],
    ["noise4", (seed) => (x, y) => noise4(x, y, 1.5, 2.5, seed)],
    ["valueNoise3", (seed) => (x, y) => valueNoise3(x, y, 1.5, seed)],
    ["fbm", (seed) => (x, y) => fbm(x, y, { seed })],
    ["ridged", (seed) => (x, y) => ridged(x, y, { seed })],
    ["loopNoise", (seed) => (x, y) => loopNoise(x, y, 0.7, 2, { seed })],
    ["worley", (seed) => (x, y) => worley(x, y, { seed })],
  ];
  for (const [name, make] of cases) {
    assert.deepEqual(all(make(7)), all(make(7)), `${name}: the same seed`);
    const a = all(make(7)), b = all(make(8));
    assert.ok(a.filter((v, i) => v !== b[i]).length > 190, `${name}: another seed is another pattern`);
  }
  // A seed's lowest 8 bits choose its table and the bits above move the pattern on it: seeds a table's length apart,
  // and negative ones, are other patterns too, and the same each time, after any other seeds.
  const first = noise2(1.1, 2.2, 5);
  for (let s = 1000; s < 1300; s++) noise2(0.5, 0.5, s);
  assert.equal(noise2(1.1, 2.2, 5), first);
  for (const f of [(s: number) => (x: number, y: number) => noise2(x, y, s), (s: number) => (x: number, y: number) => noise3(x, y, 0.5, s), (s: number) => (x: number, y: number) => noise4(x, y, 0.5, 1.5, s)]) {
    const seen = [5, 261, 517, 5 + 256 * 4000, -251, -1].map((s) => all(f(s)));
    for (let i = 0; i < seen.length; i++)
      for (let j = i + 1; j < seen.length; j++) assert.ok(seen[i].filter((v, k) => v !== seen[j][k]).length > 190, `seeds ${i} and ${j} are one pattern`);
    assert.deepEqual(all(f(261)), seen[1]);
  }
  // What pieces made with these have drawn: a change here changes people's art, so it must be on purpose.
  assert.equal(noise2(1.37, 2.71).toFixed(12), "0.545422004923");
  assert.equal(noise2(1.37, 2.71, 9).toFixed(12), "0.945392676004");
  assert.equal(noise3(1.37, 2.71, 0.53).toFixed(12), "0.170094972989");
  assert.equal(noise4(1.37, 2.71, 0.53, -4.19).toFixed(12), "0.613792542783");
  assert.equal(fbm(3.31, 1.79).toFixed(12), "0.435217880597");
  assert.equal(ridged(3.31, 1.79).toFixed(12), "0.624396570422");
  assert.equal(loopNoise(3.31, 1.79, 0.7, 2).toFixed(12), "0.359430457430");
  assert.equal(worley(3.31, 1.79).toFixed(12), "0.280966264237");
  assert.equal(random(1)().toFixed(12), "0.627073940588");
  assert.equal(noise2(1.37, 2.71, 1000).toFixed(12), "0.201672749714");
  assert.equal(noise2(1.37, 2.71, -1).toFixed(12), "0.164027066823");
});

test("noise: thousands of seeds a frame cost no more than one", () => {
  // Each of 2000 things wobbling on a seed of its own: once a table made a seed, this took 3 ms a frame.
  let sum = 0;
  for (let i = 0; i < 2000; i++) sum += noise2(0, 0.5, i) + noise3(0, 0.5, 0.5, i) + noise4(0, 0.5, 0.5, 0.5, i);
  const start = performance.now();
  for (let f = 0; f < 30; f++) for (let i = 0; i < 2000; i++) sum += noise2(f / 30, 0.5, i);
  const ms = (performance.now() - start) / 30;
  assert.ok(Number.isFinite(sum));
  assert.ok(ms < 1, `2000 seeds take ${ms.toFixed(3)} ms a frame`);
});

test("fractal noise: octaves, gain and lacunarity, checked", () => {
  // with no gain only the first octave counts
  for (const [x, y] of [[0.3, 0.9], [12.5, -3.25]]) {
    assert.equal(fbm(x, y, { gain: 0 }), fbm(x, y, { octaves: 1 }));
    assert.equal(ridged(x, y, { gain: 0 }), ridged(x, y, { octaves: 1 }));
    assert.equal(fbm3(x, y, 2, { gain: 0 }), fbm3(x, y, 2, { octaves: 1 }));
  }
  assert.notEqual(fbm(0.3, 0.9), fbm(0.3, 0.9, { octaves: 6 }));
  assert.notEqual(fbm(0.3, 0.9), fbm(0.3, 0.9, { lacunarity: 3 }));
  assert.throws(() => fbm(0, 0, { octaves: 0 }), /octaves takes a whole number from 1 to 16, not 0/);
  assert.throws(() => fbm(0, 0, { octaves: 2.5 }), /octaves takes a whole number/);
  assert.throws(() => fbm(0, 0, { octaves: 17 }), /octaves/);
  assert.throws(() => ridged(0, 0, { lacunarity: 0 }), /lacunarity takes a number above 0/);
  assert.throws(() => fbm3(0, 0, 0, { gain: -1 }), /gain takes a number of 0 or more/);
  assert.throws(() => fbm(0, 0, { seed: 1.5 }), /seed takes a whole number/);
  assert.throws(() => worley(0, 0, { seed: 0.5 }), /seed takes a whole number/);
  // a string that looks like a number is not one, and the error shows it quoted
  assert.throws(() => fbm(0, 0, { octaves: "3" as never }), /octaves takes a whole number from 1 to 16, not "3"/);
  assert.throws(() => fbm(0, 0, { lacunarity: "2" as never }), /lacunarity takes a number above 0, such as 2, not "2"/);
});

test("ridged: the finer layers sit on the crests, so the valleys between stay soft", () => {
  // Where the first layer is in a valley (under 0.05), each finer layer counts at most twice the one before, so the
  // four layers together stay under 0.11; counted everywhere, as plain fbm does, they averaged 0.22 there.
  const r = random(31);
  let n = 0, sum = 0;
  for (let i = 0; i < 200000 && n < 2000; i++) {
    const x = r.range(-100, 100), y = r.range(-100, 100);
    if (ridged(x, y, { octaves: 1 }) >= 0.05) continue;
    n++;
    const v = ridged(x, y);
    assert.ok(v < 0.11, `ridged at ${x}, ${y} is ${v} in a valley`);
    sum += v;
  }
  assert.equal(n, 2000);
  assert.ok(sum / n < 0.05, `valleys average ${sum / n}`);
  // and so do loopNoise's and noise()'s ridged kinds
  for (let i = 0; i < 2000; i++) {
    const x = r.range(-50, 50), y = r.range(-50, 50), t = r.range(0, 4);
    if (loopNoise(x, y, t, 4, { ridged: true, octaves: 1 }) < 0.05) assert.ok(loopNoise(x, y, t, 4, { ridged: true, octaves: 4 }) < 0.11);
  }
  const one = noise({ kind: "ridged", detail: 1, morph: 0 }), four = noise({ kind: "ridged", detail: 4, morph: 0 });
  for (let i = 0; i < 2000; i++) {
    const x = r.range(0, 640), y = r.range(0, 240);
    if (one(x, y) < 0.05) assert.ok(four(x, y) < 0.11, `noise ridged at ${x}, ${y}`);
  }
  // pinned in a valley, where the weighting shows: it was 0.4739 counting every layer everywhere
  assert.equal(ridged(-6.1, 2.4).toFixed(12), "0.249591677449");
});

test("loopNoise comes round exactly at its period, and changes in between", () => {
  const r = random(4);
  for (let i = 0; i < 200; i++) {
    const x = r.range(-20, 20), y = r.range(-20, 20), t = r.range(0, 10), p = r.pick([1, 2.5, 4, 7]);
    near(loopNoise(x, y, t, p), loopNoise(x, y, t + p, p), 1e-9);
    near(loopNoise(x, y, t, p, { octaves: 3 }), loopNoise(x, y, t + 2 * p, p, { octaves: 3 }), 1e-9);
    near(loopNoise(x, y, t, p, { ridged: true }), loopNoise(x, y, t - p, p, { ridged: true }), 1e-9);
  }
  // exactly, on the period itself
  assert.equal(loopNoise(1.5, 2.5, 0, 4), loopNoise(1.5, 2.5, 4, 4));
  assert.equal(loopNoise(1.5, 2.5, 0, 4), loopNoise(1.5, 2.5, 12, 4));
  const along = Array.from({ length: 8 }, (_, i) => loopNoise(1.5, 2.5, i / 2, 4));
  assert.ok(new Set(along).size === 8, "it moves within the period");
  // a bigger radius changes more over the same period
  const change = (radius: number) => Math.abs(loopNoise(1.5, 2.5, 0, 4, { radius }) - loopNoise(1.5, 2.5, 0.1, 4, { radius }));
  let small = 0, big = 0;
  for (let i = 0; i < 50; i++) (small += change(0.2)), (big += change(3));
  assert.ok(big > small);
  assert.throws(() => loopNoise(0, 0, 0, 0), /ascii\.rest: loopNoise\(\) takes a period in seconds above 0, such as 2, not 0/);
  assert.throws(() => loopNoise(0, 0, 0, undefined as never), /loopNoise\(\) takes a period/);
  assert.throws(() => loopNoise(0, 0, 0, 2, { radius: 0 }), /radius takes a number above 0/);
});

test("worley: 0 at its points, edges 0 between cells", () => {
  // the point in cell 0, 0
  const px = hash(0, 0, 0, 1), py = hash(0, 0, 0, 2);
  near(worley(px, py), 0, 1e-12);
  assert.ok(worley(px + 0.3, py) > 0.2);
  // on the line between two points, both nearest, the edge value is 0
  let min = 1;
  for (let x = 0; x < 3; x += 0.01) min = Math.min(min, worley(x, 0.5, { edge: true }));
  assert.ok(min < 0.02, `edges reach 0: ${min}`);
  // exactly the nearest and second nearest of all the points, as a search of 7 by 7 squares finds them: searching only
  // the 3 by 3 round x, y missed the second nearest now and then, a seam in the edges
  const r = random(5);
  for (let n = 0; n < 40000; n++) {
    const x = r.range(-300, 300), y = r.range(-300, 300), seed = n % 3;
    let d1 = Infinity, d2 = Infinity;
    for (let cy = Math.floor(y) - 3; cy <= Math.floor(y) + 3; cy++)
      for (let cx = Math.floor(x) - 3; cx <= Math.floor(x) + 3; cx++) {
        const d = Math.hypot(cx + hash(cx, cy, seed, 1) - x, cy + hash(cx, cy, seed, 2) - y);
        if (d < d1) (d2 = d1), (d1 = d);
        else if (d < d2) d2 = d;
      }
    near(worley(x, y, { seed }), Math.min(1, d1), 1e-12);
    near(worley(x, y, { seed, edge: true }), Math.min(1, d2 - d1), 1e-12);
  }
});

const NAMES: EaseName[] = [
  "linear", "inQuad", "outQuad", "inOutQuad", "inCubic", "outCubic", "inOutCubic", "inQuart", "outQuart", "inOutQuart",
  "inSine", "outSine", "inOutSine", "inExpo", "outExpo", "inOutExpo", "inCirc", "outCirc", "inOutCirc",
  "inBack", "outBack", "inOutBack", "inElastic", "outElastic", "inOutElastic", "inBounce", "outBounce", "inOutBounce",
];

test("every easing starts at 0 and ends at 1 exactly, clamped outside", () => {
  assert.deepEqual(Object.keys(ease).sort(), [...NAMES].sort());
  assert.ok(Object.isFrozen(ease));
  for (const name of NAMES) {
    const f = ease[name];
    assert.equal(f(0), 0, `${name}(0)`);
    assert.equal(f(1), 1, `${name}(1)`);
    assert.equal(f(-2), 0, `${name}(-2)`);
    assert.equal(f(3), 1, `${name}(3)`);
    assert.equal(f(NaN), 0, `${name}(NaN)`);
    for (let k = 0.01; k < 1; k += 0.01) assert.ok(Number.isFinite(f(k)), `${name}(${k})`);
  }
  // the symmetric ones are halfway at halfway
  for (const name of NAMES.filter((n) => n.startsWith("inOut"))) near(ease[name](0.5), 0.5, 1e-12);
  near(ease.linear(0.3), 0.3);
  near(ease.inQuad(0.5), 0.25);
  near(ease.outQuad(0.5), 0.75);
  near(ease.inCubic(0.5), 0.125);
  // the plain ones only ever rise
  for (const name of NAMES.filter((n) => !/Back|Elastic|Bounce/.test(n))) {
    let last = 0;
    for (let k = 0.01; k <= 1.0001; k += 0.01) {
      const v = ease[name](k);
      assert.ok(v >= last - 1e-12, `${name} falls at ${k}`);
      last = v;
    }
  }
  // back and elastic overshoot, bounce touches the ground between bounces
  const peak = (name: EaseName) => Math.max(...Array.from({ length: 99 }, (_, i) => ease[name]((i + 1) / 100)));
  assert.ok(peak("outBack") > 1.05);
  assert.ok(peak("outElastic") > 1.2);
  assert.ok(Math.min(...Array.from({ length: 99 }, (_, i) => ease.inBack((i + 1) / 100))) < -0.05);
  near(ease.outBounce(1 / 2.75), 1, 1e-12);
  for (let k = 0.01; k < 1; k += 0.01) assert.ok(ease.outBounce(k) <= 1 + 1e-12);
});

test("vec2 and vec3 make new vectors and leave theirs alone", () => {
  const a: [number, number] = [3, 4], b: [number, number] = [1, -2];
  assert.deepEqual(vec2.add(a, b), [4, 2]);
  assert.deepEqual(vec2.sub(a, b), [2, 6]);
  assert.deepEqual(vec2.scale(a, 2), [6, 8]);
  assert.equal(vec2.dot(a, b), -5);
  assert.equal(vec2.length(a), 5);
  assert.deepEqual(vec2.normalize(a), [0.6, 0.8]);
  assert.deepEqual(vec2.normalize([0, 0]), [0, 0]);
  const r = vec2.rotate([1, 0], Math.PI / 2);
  near(r[0], 0);
  near(r[1], 1);
  assert.deepEqual(vec2.lerp(a, b, 0.5), [2, 1]);
  assert.equal(vec2.dist(a, b), Math.hypot(2, 6));
  assert.deepEqual(a, [3, 4]);

  const x: Vec3 = [1, 0, 0], y: Vec3 = [0, 1, 0], v: Vec3 = [1, 2, 2];
  assert.deepEqual(vec3.add(x, y), [1, 1, 0]);
  assert.deepEqual(vec3.sub(v, x), [0, 2, 2]);
  assert.deepEqual(vec3.scale(v, -1), [-1, -2, -2]);
  assert.equal(vec3.dot(v, v), 9);
  assert.deepEqual(vec3.cross(x, y), [0, 0, 1]);
  assert.deepEqual(vec3.cross(y, x), [0, 0, -1]);
  assert.equal(vec3.length(v), 3);
  assert.deepEqual(vec3.normalize(v), [1 / 3, 2 / 3, 2 / 3]);
  assert.deepEqual(vec3.normalize([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(vec3.lerp(x, y, 0.25), [0.75, 0.25, 0]);
  assert.equal(vec3.dist(x, y), Math.SQRT2);
  assert.deepEqual(v, [1, 2, 2]);
});

test("rotate3 keeps length, turns about x, then y, then z, and rotation() agrees", () => {
  const r = random(12);
  for (let i = 0; i < 300; i++) {
    const v: Vec3 = [r.range(-5, 5), r.range(-5, 5), r.range(-5, 5)], a: Vec3 = [r.angle(), r.angle(), r.angle()];
    const w = rotate3(v, a);
    near(vec3.length(w), vec3.length(v), 1e-9);
    const m = rotation(a)(v);
    for (let k = 0; k < 3; k++) near(m[k], w[k], 1e-9);
    // x first, then y, then z: the same as three turns one after another
    const step3 = rotate3(rotate3(rotate3(v, [a[0], 0, 0]), [0, a[1], 0]), [0, 0, a[2]]);
    for (let k = 0; k < 3; k++) near(step3[k], w[k], 1e-9);
  }
  const q = Math.PI / 2;
  const turned = (v: Vec3, a: Vec3) => rotate3(v, a).map((n) => Math.round(n * 1e9) / 1e9 + 0);
  assert.deepEqual(turned([0, 1, 0], [q, 0, 0]), [0, 0, 1], "about x, y turns toward z");
  assert.deepEqual(turned([0, 0, 1], [0, q, 0]), [1, 0, 0], "about y, z turns toward x");
  assert.deepEqual(turned([1, 0, 0], [0, 0, q]), [0, 1, 0], "about z, x turns toward y");
  const out: Vec3 = [9, 9, 9];
  assert.equal(rotate3([1, 2, 3], [0, 0, 0], out), out);
  assert.deepEqual(out, [1, 2, 3]);
  const turn = rotation([0.1, 0.2, 0.3]);
  assert.equal(turn([1, 2, 3], out), out);
});

test("project: the origin at the centre, further is smaller, null behind the eye", () => {
  const o = { cols: 64, rows: 24 };
  assert.deepEqual(project([0, 0, 0], o), { x: 32, y: 12, depth: 5 });
  // at z = 0 a unit is rows / 3 rows up and twice that across
  assert.deepEqual(project([1, 1, 0], o), { x: 32 + 16, y: 12 - 8, depth: 5 });
  assert.deepEqual(project([1, 1, 0], { ...o, scale: 2, aspect: 1 }), { x: 34, y: 10, depth: 5 });
  const far = project([1, 1, 5], o)!, close = project([1, 1, -2.5], o)!;
  assert.ok(far.x - 32 < 16 && close.x - 32 > 16, "perspective");
  assert.equal(far.depth, 10);
  near(far.x, 32 + 8);
  assert.equal(project([0, 0, -5], o), null, "at the eye");
  assert.equal(project([0, 0, -6], o), null, "behind it");
  assert.equal(project([0, 0, -6], { ...o, distance: 7 })!.depth, 1);
  const out = { x: 0, y: 0, depth: 0 };
  assert.equal(project([0, 0, 0], o, out), out);
  assert.throws(() => project([0, 0, 0], { ...o, distance: 0 }), /distance takes a number above 0/);
  assert.throws(() => project([0, 0, 0], undefined as never), /project\(\) takes the grid's size/);
});

test("phase, oscillate, triangle, pulse and cycle come round exactly", () => {
  assert.equal(phase(5, 2), 0.5);
  assert.equal(phase(0, 3), 0);
  assert.equal(phase(3, 3), 0);
  assert.equal(phase(-0.5, 2), 0.75);
  for (let t = 0; t < 20; t += 0.37) {
    const p = phase(t, 1.5);
    assert.ok(p >= 0 && p < 1);
    near(p, phase(t + 1.5, 1.5), 1e-12);
    near(oscillate(t, 2), oscillate(t + 2, 2), 1e-12);
    const o = oscillate(t, 2, 3, 7, 0.4);
    assert.ok(o >= 3 && o <= 7);
    near(cycle(t, 1.5) + phase(t, 1.5), t / 1.5, 1e-9);
  }
  near(oscillate(0, 2), 0, 1e-12);
  near(oscillate(0.5, 2), 1, 1e-12);
  near(oscillate(0, 2, 0, 1, 0.25), 1, 1e-12);
  near(oscillate(0, 2, 0, 10), 5, 1e-12);
  assert.ok(oscillate(0.1, 2) > 0, "rising from the middle");
  assert.equal(triangle(0, 4), 0);
  assert.equal(triangle(2, 4), 1);
  assert.equal(triangle(1, 4), 0.5);
  assert.equal(triangle(3, 4), 0.5);
  assert.equal(triangle(4, 4), 0);
  assert.deepEqual([0, 0.9, 1, 1.9, 2].map((t) => pulse(t, 2)), [1, 1, 0, 0, 1]);
  assert.deepEqual([0, 0.2, 0.3, 4.1].map((t) => pulse(t, 4, 0.25)), [1, 1, 0, 1]);
  assert.deepEqual([0, 3.9, 4, 8.5, -0.1].map((t) => cycle(t, 4)), [0, 0, 1, 2, -1]);
  for (const f of [phase, triangle, cycle, pulse, (t: number, p: number) => oscillate(t, p)])
    for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => f(1, bad), /takes a period in seconds above 0/);
});

test("lcm: when periods come round together, as meta.loop takes it", () => {
  assert.equal(lcm([2, 3, 4]), 12);
  assert.equal(lcm([2, 3, 4, 6]), 12);
  assert.equal(lcm([1.5, 2]), 6);
  assert.equal(lcm([0.5, 0.2]), 1);
  assert.equal(lcm([7]), 7);
  assert.equal(lcm([7, 11]), undefined, "77 seconds is past 60");
  assert.equal(lcm([7, 11], 100), 77);
  // periods that aren't round hundredths: each is still a whole number of turns of the answer
  assert.equal(lcm([0.333]), 0.333, "not rounded to 0.33, which 0.333 doesn't divide");
  assert.equal(lcm([1 / 3, 1]), 1);
  assert.equal(lcm([1 / 3, 0.25]), 1);
  assert.equal(lcm([0.7, 0.3]), 2.1);
  assert.equal(lcm([0.333, 1]), undefined, "333 seconds is past 60");
  for (const periods of [[0.7, 0.3], [1 / 3, 0.25, 2], [1.6, 2.4, 0.8], [0.15, 0.4]]) {
    const l = lcm(periods)!;
    for (const p of periods) near(l / p, Math.round(l / p), 1e-6);
  }
  assert.throws(() => lcm([]), /lcm\(\) takes a list of one or more periods/);
  assert.throws(() => lcm([2, 0]), /period in seconds above 0/);
  assert.throws(() => lcm([2, "3" as never]), /period in seconds above 0, such as 2, not "3"/);
});

test("random's points: on and in circles and spheres, spread evenly", () => {
  const r = random(21), N = 20000;
  let disc = 0, height = 0, up = 0, ball = 0;
  for (let i = 0; i < N; i++) {
    near(vec2.length(r.onCircle(3)), 3, 1e-9);
    const c = r.inCircle(2);
    assert.ok(vec2.length(c) <= 2);
    disc += vec2.length(c) ** 2;
    const p = r.onSphere(1.5);
    near(vec3.length(p), 1.5, 1e-9);
    height += p[1];
    up += Math.abs(p[1]) / 1.5;
    const b = r.inSphere();
    assert.ok(vec3.length(b) <= 1 + 1e-12);
    ball += vec3.length(b) ** 3;
  }
  // even over a disc of radius 2: the mean of the distance squared is half of 4
  near(disc / N, 2, 0.05);
  // even over a sphere: heights are even from -r to r (Archimedes)
  near(height / N, 0, 0.03);
  near(up / N, 0.5, 0.01);
  // even through a ball: the distance cubed is even from 0 to 1
  near(ball / N, 0.5, 0.01);
  near(vec2.length(r.onCircle()), 1, 1e-9);
  near(vec3.length(r.onSphere()), 1, 1e-9);
});

test("noise(): in its range, every kind, and the same for the same options", () => {
  const r = random(8);
  for (const kind of ["smooth", "ridged", "cells"] as const) {
    const n = noise({ kind, range: [4, 12] });
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 5000; i++) {
      const v = n(r.range(-300, 300), r.range(-300, 300), r.range(0, 20));
      assert.ok(v >= 4 && v <= 12, `${kind}: ${v} outside 4..12`);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    assert.ok(lo < 5 && hi > 11, `${kind} spans only ${lo.toFixed(2)} to ${hi.toFixed(2)} of 4..12`);
  }
  // a range may run downwards: high values high up the grid, for a skyline
  const sky = noise({ range: [20, 2] });
  for (let x = 0; x < 64; x++) assert.ok(sky(x) <= 20 && sky(x) >= 2);
  // y and t are 0 when left out
  const n = noise({ seed: 3 });
  assert.equal(n(5.5), n(5.5, 0, 0));
  assert.equal(n(5.5, 2), n(5.5, 2, 0));
  assert.equal(noise({ seed: 3 })(1, 2, 3), n(1, 2, 3), "the same options, the same noise");
  assert.notEqual(noise({ seed: 4 })(1, 2, 3), n(1, 2, 3), "another seed, another pattern");
  // cells are 0 on their walls
  const cells = noise({ kind: "cells" });
  let wall = 1;
  for (let x = 0; x < 64; x += 0.25) wall = Math.min(wall, cells(x, 3));
  assert.ok(wall < 0.03, `the walls reach ${wall}`);
});

test("noise(): size is how many cells a feature is across", () => {
  // the mean step from one cell to the next is about inverse to the size
  const steps = (size: number) => {
    const n = noise({ size, morph: 0 });
    let sum = 0;
    for (let x = 0; x < 2000; x++) sum += Math.abs(n(x + 1, 7) - n(x, 7));
    return sum / 2000;
  };
  const small = steps(6), big = steps(24);
  assert.ok(small > 2.5 * big, `size 6 steps ${small.toFixed(4)} a cell, size 24 steps ${big.toFixed(4)}`);
  // a number is round on the grid, rows half its columns: the same as [size, size / 2]
  const round = noise({ size: 12, morph: 0 }), stretched = noise({ size: [12, 6], morph: 0 });
  for (let i = 0; i < 50; i++) assert.equal(round(i * 1.7, i * 0.9), stretched(i * 1.7, i * 0.9));
});

test("noise(): drift slides it, morph changes it in place, and morph 0 holds it still", () => {
  const still = noise({ morph: 0 });
  for (const t of [0, 1.5, 9]) assert.equal(still(3.3, 4.4, t), still(3.3, 4.4, 0));
  // what is at x, y at t = 0 is at x + drift * t at t
  const right = noise({ drift: 5 }), diagonal = noise({ drift: [3, -2], kind: "ridged" }), cells = noise({ drift: -4, kind: "cells" });
  for (let i = 0; i < 100; i++) {
    const x = i * 0.73, y = i * 0.31, t = i * 0.07;
    near(right(x + 5 * t, y, t), right(x, y, 0), 1e-9);
    near(diagonal(x + 3 * t, y - 2 * t, t), diagonal(x, y, 0), 1e-9);
    near(cells(x - 4 * t, y, t), cells(x, y, 0), 1e-9);
  }
  // morph: it changes where it is, smoothly, by default (0.25 features a second)
  for (const kind of ["smooth", "ridged", "cells"] as const) {
    const morph = noise({ kind });
    assert.notEqual(morph(3, 4, 0), morph(3, 4, 2), kind);
    assert.ok(Math.abs(morph(3, 4, 1) - morph(3, 4, 1.01)) < 0.02, `${kind} jumps`);
  }
  // faster morph changes more in the same time
  const change = (morph: number) => {
    const n = noise({ morph });
    let sum = 0;
    for (let x = 0; x < 200; x++) sum += Math.abs(n(x, 3, 0.2) - n(x, 3, 0));
    return sum;
  };
  assert.ok(change(1) > change(0.1) * 3);
});

test("noise(): with a period it comes round exactly, drifting or morphing, every kind", () => {
  const r = random(17);
  const cases: [string, NonNullable<Parameters<typeof noise>[0]>][] = [
    ["smooth morph", { period: 4 }],
    ["ridged morph", { kind: "ridged", period: 3 }],
    ["cells morph", { kind: "cells", period: 2.5 }],
    ["smooth drift", { drift: -6, period: 8 }],
    ["ridged drift", { kind: "ridged", drift: -4, period: 16 }],
    ["cells drift", { kind: "cells", drift: [3, 1], period: 5 }],
    ["smooth diagonal drift, 5 layers", { drift: [2, 2], period: 6, detail: 5 }],
  ];
  for (const [name, o] of cases) {
    const n = noise(o), p = o.period!;
    for (let i = 0; i < 200; i++) {
      const x = r.range(0, 64), y = r.range(0, 24), t = r.range(0, 10);
      assert.ok(Math.abs(n(x, y, t + p) - n(x, y, t)) < 1e-9, `${name} at ${x}, ${y}, ${t}`);
      assert.ok(Math.abs(n(x, y, t + 3 * p) - n(x, y, t)) < 1e-9, `${name} three periods on`);
    }
    const along = Array.from({ length: 6 }, (_, i) => n(10, 5, (i * p) / 6));
    assert.equal(new Set(along).size, 6, `${name} moves within its period`);
  }
  // a drift that loops still slides at its speed
  const sea = noise({ drift: 6, period: 8 });
  for (let i = 0; i < 50; i++) near(sea(i * 0.9 + 6 * 1.3, 4, 1.3), sea(i * 0.9, 4, 0), 1e-9);
});

test("noise() checks its options when it is made", () => {
  assert.throws(() => noise({ kind: "bumpy" as never }), /ascii\.rest: noise's kind takes "smooth", "ridged" and "cells", not "bumpy"/);
  for (const size of [0, -3, NaN, [1], [4, 0]]) assert.throws(() => noise({ size: size as never }), /noise's size takes cells above 0/);
  for (const detail of [0, 9, 1.5]) assert.throws(() => noise({ detail }), /noise's detail takes a whole number from 1 to 8/);
  for (const drift of ["x", [1, NaN], [1]]) assert.throws(() => noise({ drift: drift as never }), /noise's drift takes cells a second/);
  assert.throws(() => noise({ morph: -1 }), /noise's morph takes features a second, 0 or more/);
  for (const period of [0, -2, Infinity]) assert.throws(() => noise({ period }), /noise's period takes seconds above 0/);
  assert.throws(() => noise({ drift: 2, morph: 0.5, period: 4 }), /noise\(\) can loop a pattern that drifts or one that morphs, not both at once/);
  assert.throws(() => noise({ range: [1] as never }), /noise's range takes \[low, high\]/);
  assert.throws(() => noise({ seed: 1.5 }), /noise's seed takes a whole number/);
  assert.throws(() => noise(null as never), /noise\(\) takes options/);
  // strings that look like numbers are refused, not coerced
  assert.throws(() => noise({ period: "4" as never }), /noise's period takes seconds above 0, such as 8, not "4"/);
  assert.throws(() => noise({ morph: "1" as never }), /noise's morph takes features a second, 0 or more, such as 0\.25, not "1"/);
  assert.throws(() => noise({ size: ["4", "2"] as never }), /noise's size takes cells above 0/);
  // a drifting loop repeats every drift * period cells: under one feature it would be flat along the drift, so it throws
  assert.throws(
    () => noise({ drift: 0.5, period: 2 }),
    /ascii\.rest: noise\(\) drifting 0\.5 cells a second with a period of 2 s repeats every 1 cell, under one feature \(12 cells\), and flattens out: make period 24 s or more, or drift faster/,
  );
  assert.throws(() => noise({ drift: [0, 1], period: 4, kind: "cells" }), /repeats every 4 cells, under one feature \(6 cells\).*make period 6 s or more/);
  // one feature or more is fine, and loops
  const band = noise({ drift: 2, period: 6 });
  near(band(3, 4, 1.5), band(3, 4, 7.5), 1e-9);
  near(band(3, 4, 0), band(15, 4, 0), 1e-9);
  // and nothing when it is called: a cell anywhere gives a value
  const n = noise();
  for (const x of [-1e6, -1, 0, 0.5, 1e6]) assert.ok(Number.isFinite(n(x, x, x)));
});

test("progress and tween: in seconds, eased, once or every period", () => {
  assert.equal(progress(-1), 0);
  assert.equal(progress(0), 0);
  near(progress(0.5), 0.5, 1e-12);
  assert.equal(progress(1), 1);
  assert.equal(progress(7), 1, "held at the end");
  near(progress(1, { duration: 2, ease: "linear" }), 0.5);
  near(progress(1, { duration: 2, ease: "inQuad" }), 0.25);
  assert.equal(progress(0.9, { start: 1 }), 0, "nothing before start");
  near(progress(1.5, { start: 1, ease: "linear" }), 0.5);
  near(progress(0.5, { ease: (k) => k * k * k }), 0.125);
  // with a period it plays again and again
  const o = { start: 0.5, duration: 1, period: 3, ease: "outCubic" } as const;
  for (let t = 0; t < 9; t += 0.23) near(progress(t + 3, o), progress(t, o), 1e-9);
  assert.equal(progress(2.9, o), 1);
  assert.equal(progress(3.2, o), 0);
  near(progress(4, o), ease.outCubic(0.5), 1e-12);
  // tween: numbers and points, and the points it is given are left alone
  assert.equal(tween(0, 10, 20), 10);
  assert.equal(tween(5, 10, 20), 20);
  near(tween(1, 10, 20, { duration: 2, ease: "linear" }), 15);
  const from: [number, number] = [0, 0], to: [number, number] = [10, 4];
  assert.deepEqual(tween(1, from, to, { duration: 2, ease: "linear" }), [5, 2]);
  assert.deepEqual(from, [0, 0]);
  assert.deepEqual(tween(9, [1, 2, 3], [4, 5, 6]), [4, 5, 6]);
  assert.deepEqual(tween(0.5, [], []), []);
  // outBack goes past the end on the way
  assert.ok(tween(0.6, 0, 10, { ease: "outBack" }) > 10);
  // there and back again, as tween's doc says: an eased triangle
  assert.deepEqual([0, 1, 2, 3, 4].map((t) => +lerp(3, 9, ease.inOutSine(triangle(t, 4))).toFixed(12)), [3, 6, 9, 6, 3]);
});

test("progress and tween check their options", () => {
  assert.throws(() => progress(0, { duration: 0 }), /ascii\.rest: progress\(\)'s duration takes seconds above 0, such as 1, not 0/);
  assert.throws(() => tween(0, 0, 1, { start: NaN }), /tween\(\)'s start takes seconds/);
  assert.throws(() => progress(0, { period: 0 }), /period takes seconds above 0/);
  assert.throws(() => progress(0, { start: 2, duration: 2, period: 3 }), /plays from start to start \+ duration inside each period: 2 \+ 2 doesn't fit in 3 seconds/);
  assert.throws(() => progress(0, { ease: "outWobble" as never }), /ease takes an easing's name, such as "outCubic", or a function, not "outWobble"/);
  assert.throws(() => tween(0, [0, 0], [1, 2, 3] as never), /two points of the same length/);
  assert.throws(() => tween(0, 0, [1] as never), /tween\(\) takes two numbers/);
  assert.throws(() => progress(0, null as never), /progress\(\) takes options/);
});

test("camera(): the centre in the middle, and everything within size on the grid at every turn", () => {
  const view = camera({ cols: 64, rows: 24 }, { size: 2, turn: [5, 8, 0] });
  const c = view([0, 0, 0], 1.7)!;
  assert.deepEqual([c.x, c.y, c.near], [32, 12, 0.5]);
  assert.equal(view([0, 0, 0]), view([1, 1, 1]), "one View object, reused");
  const r = random(6);
  let top = 24, bottom = 0;
  for (let i = 0; i < 4000; i++) {
    const v = view(r.onSphere(2), r.range(0, 40))!;
    assert.ok(v.x >= 0 && v.x < 64 && v.y >= 0 && v.y < 24, `${v.x}, ${v.y} is off the grid`);
    assert.ok(v.near >= 0 && v.near <= 1);
    top = Math.min(top, v.y);
    bottom = Math.max(bottom, v.y);
  }
  // fitted: it fills nearly all of the shorter way
  assert.ok(top < 1.5 && bottom > 22.5, `rows ${top} to ${bottom}`);
  assert.equal(view([0, 0, -100]), null, "behind the eye");
});

test("camera(): turn, tilt and distance", () => {
  // a turn every 8 s about the upright: a quarter of it brings the right side to the front, and it comes round
  const spin = camera({ cols: 64, rows: 24 }, { turn: 8, tilt: 0 });
  near(spin([1, 0, 0], 2)!.x, 32, 1e-9);
  near(spin([1, 0, 0], 2)!.near, 1, 1e-9);
  const right = spin([1, 0, 0], 0)!.x;
  near(spin([1, 0, 0], 4)!.x, 64 - right, 1e-9);
  for (let t = 0; t < 16; t += 0.7) near(spin([0.3, 0.5, -0.2], t + 8)!.x, spin([0.3, 0.5, -0.2], t)!.x, 1e-9);
  near(camera({ cols: 64, rows: 24 }, { turn: -8, tilt: 0 })([1, 0, 0], 2)!.near, 0, 1e-9);
  // still without a turn
  const still = camera({ cols: 64, rows: 24 });
  assert.equal(still([1, 0, 0], 0)!.x, still([1, 0, 0], 3)!.x);
  // the default tilt looks down on it: the near side of a disc is lower on the grid, the top leans toward you
  assert.ok(still([0, 0, -1])!.y > 12 && still([0, 0, 1])!.y < 12);
  assert.ok(still([0, 1, 0])!.near > 0.5);
  // negative tilt looks up from below
  assert.ok(camera({ cols: 64, rows: 24 }, { tilt: -0.3 })([0, 0, -1])!.y < 12);
  // nearer looks deeper: the front of a ball is bigger against its back
  const depth = (distance: number) => {
    const v = camera({ cols: 64, rows: 24 }, { distance, tilt: 0 });
    return (v([0.5, 0, -1])!.x - 32) / (v([0.5, 0, 1])!.x - 32);
  };
  assert.ok(depth(2) > depth(10));
  // a square grid (aspect 1) is as wide as it is tall
  const square = camera({ cols: 24, rows: 24 }, { aspect: 1, tilt: 0 });
  near(square([1, 0, 0])!.x - 12, 12 - square([0, 1, 0])!.y, 1e-9);
});

test("camera() checks its options when it is made", () => {
  assert.throws(() => camera({ cols: 0, rows: 24 }), /ascii\.rest: camera\(\) takes the grid's size first/);
  assert.throws(() => camera(undefined as never), /camera\(\) takes the grid's size first/);
  assert.throws(() => camera({ cols: 64, rows: 24 }, null as never), /camera\(\) takes options second/);
  assert.throws(() => camera({ cols: 64, rows: 24 }, { size: 0 }), /camera's size takes units above 0/);
  assert.throws(() => camera({ cols: 64, rows: 24 }, { distance: 1 }), /camera's distance takes units more than its size \(1\)/);
  for (const turn of ["x", [1, 2], [1, NaN, 0]]) assert.throws(() => camera({ cols: 64, rows: 24 }, { turn: turn as never }), /camera's turn takes seconds a turn/);
  assert.throws(() => camera({ cols: 64, rows: 24 }, { tilt: NaN }), /camera's tilt takes radians/);
  assert.throws(() => camera({ cols: 64, rows: 24 }, { aspect: 0 }), /camera's aspect takes/);
});

test("twinkle: each thing on its own beat, from min to 1, all coming round every period", () => {
  let lo = 1, hi = 0;
  for (let id = 0; id < 50; id++)
    for (let t = 0; t < 8; t += 0.05) {
      const v = twinkle(t, id);
      assert.ok(v >= 0.2 && v <= 1, `${v}`);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      near(twinkle(t + 4, id), v, 1e-9);
    }
  assert.ok(lo < 0.21 && hi > 0.99, `${lo} to ${hi}`);
  // out of step: at any one moment they are at many brightnesses
  assert.ok(new Set(Array.from({ length: 50 }, (_, id) => twinkle(1.3, id).toFixed(3))).size > 40);
  // a fraction (a spot's k) is an id too
  assert.notEqual(twinkle(1, 0.25), twinkle(1, 0.5));
  // its options
  for (let t = 0; t < 4; t += 0.3) near(twinkle(t + 2, 7, { period: 2 }), twinkle(t, 7, { period: 2 }), 1e-9);
  let out = 1;
  for (let t = 0; t < 4; t += 0.01) out = Math.min(out, twinkle(t, 3, { min: 0 }));
  assert.ok(out < 0.01, "min 0 goes out");
  assert.throws(() => twinkle(0, 1, { period: 0 }), /twinkle\(\) takes a period in seconds above 0/);
  assert.throws(() => twinkle(0, 1, { min: 2 }), /twinkle's min takes a brightness from 0 to 1/);
  assert.throws(() => twinkle(0, NaN), /twinkle\(\) takes a number for each thing/);
  assert.throws(() => twinkle(0, 1, null as never), /twinkle\(\) takes options third/);
});

test("scatter: spots on different cells of an area, seeded and even", () => {
  const area = { cols: 64, rows: 24 };
  const spots = scatter(96, area, { seed: 5 });
  assert.equal(spots.length, 96);
  assert.equal(new Set(spots.map((p) => p.y * 64 + p.x)).size, 96, "no two on one cell");
  spots.forEach((p, i) => {
    assert.equal(p.i, i);
    assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < 64 && p.y >= 0 && p.y < 24);
    assert.ok(p.k >= 0 && p.k < 1);
  });
  assert.deepEqual(scatter(96, area, { seed: 5 }), spots, "the same seed, the same spots");
  assert.notDeepEqual(scatter(96, area, { seed: 6 }), spots);
  // even: each eighth of the grid, 16 by 12 cells, holds about an eighth of them
  const eighths = (list: { x: number; y: number }[]) => {
    const n = new Array(8).fill(0);
    for (const p of list) n[Math.floor(p.x / 16) + 4 * Math.floor(p.y / 12)]++;
    return n;
  };
  for (let seed = 1; seed <= 20; seed++)
    for (const n of eighths(scatter(96, area, { seed }))) assert.ok(n >= 8 && n <= 16, `seed ${seed}: an eighth holds ${n} of 96`);
  // by chance: still on different cells, in the area
  const loose = scatter(200, area, { even: false, seed: 2 });
  assert.equal(new Set(loose.map((p) => p.y * 64 + p.x)).size, 200);
  // a region with x and y: inside it
  for (const even of [true, false])
    for (const p of scatter(30, { x: 10, y: 5, cols: 20, rows: 6 }, { even })) assert.ok(p.x >= 10 && p.x < 30 && p.y >= 5 && p.y < 11);
  // every cell, and none
  assert.equal(new Set(scatter(12, { cols: 4, rows: 3 }).map((p) => p.y * 4 + p.x)).size, 12);
  assert.equal(scatter(1, { cols: 1, rows: 1 })[0].x, 0);
  assert.deepEqual(scatter(0, area), []);
  assert.throws(() => scatter(13, { cols: 4, rows: 3 }), /ascii\.rest: scatter\(\) takes a whole number of spots from 0 to 12, one a cell of 4 by 3, not 13/);
  assert.throws(() => scatter(1.5, area), /scatter\(\) takes a whole number of spots/);
  assert.throws(() => scatter(3, { cols: 0, rows: 3 }), /scatter\(\) takes an area/);
  assert.throws(() => scatter(3, area, { seed: 0.5 }), /scatter's seed takes a whole number/);
  assert.throws(() => scatter(3, area, null as never), /scatter\(\) takes options third/);
});

// The checks scripts/check.ts makes of a frame, on a light page and a dark one, in colour and in one ink.
function contract(p: Piece) {
  const { meta } = p;
  const times = [0, 0.4, 1, 2.5, 7.3, meta.loop ?? 4];
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      for (const t of times) {
        const text = frame(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `${meta.name} t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `${meta.name} t=${t}: cols`);
        assert.ok(text.replace(/[\s\n]/g, "").length > 20, `${meta.name} t=${t}: something drawn`);
        if (color) {
          for (const c of color) assert.ok(c < meta.palette!.length, `${meta.name}: colour ${c} past the palette`);
          // a themed palette's light half on paper, its dark half on a dark page
          const half = meta.palette!.length / 2, cells = text.replace(/\n/g, "");
          for (let i = 0; i < color.length; i++) if (cells[i] !== " ") assert.ok(paper ? color[i] < half : color[i] >= half, `${meta.name}: colour for the theme`);
        }
      }
    }
}

const examples = { landscape, starfield, easing, galaxy, pool } as Record<string, Piece>;

test("the examples keep the frame contract, in colour and one ink, on paper and dark", () => {
  for (const p of Object.values(examples)) contract(p);
});

test("the examples: the same frame for the same t, in any order, and they loop exactly", () => {
  for (const [name, p] of Object.entries(examples)) {
    const loop = p.meta.loop!;
    assert.ok(loop > 0, `${name} sets its loop`);
    const times = [0, 1.25, 3.5, loop / 2, loop - 0.1];
    const forward = times.map((t) => snapshot(p, t));
    const fresh = p.default();
    // backwards and on one player: no frame depends on the one before
    for (let i = times.length - 1; i >= 0; i--) {
      const color = new Uint8Array(p.meta.cols * p.meta.rows);
      assert.equal(fresh(times[i], { color }), forward[i].text, `${name} at ${times[i]}`);
      assert.deepEqual(color, forward[i].color, `${name}'s colours at ${times[i]}`);
    }
    for (const t of [0, 1.25, 3.5]) assert.equal(snapshot(p, t + loop).text, snapshot(p, t).text, `${name} comes round at ${loop}s`);
    assert.ok(new Set(times.map((t) => snapshot(p, t).text)).size >= 4, `${name} moves`);
  }
});

test("the examples are quick: a frame well under the library's 4 ms", () => {
  for (const [name, p] of Object.entries(examples)) {
    const f = p.default(), color = new Uint8Array(p.meta.cols * p.meta.rows);
    f(0, { color });
    const start = performance.now();
    for (let i = 0; i < 60; i++) f(i / 30, { color });
    const ms = (performance.now() - start) / 60;
    assert.ok(ms < 4, `${name}: ${ms.toFixed(2)} ms a frame`);
  }
});

test("the examples export to svg(), animated over their loop", () => {
  for (const [name, p] of Object.entries(examples)) {
    for (const dark of [false, true]) {
      const out = svg(p, { dark });
      assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, name);
      assert.match(out, new RegExp(`animation:${p.meta.loop}s step-end infinite`), `${name} plays its loop`);
      assert.ok((out.match(/<g class="f k\d+">/g) ?? []).length > 10, `${name}: frames`);
      // its colours for the theme
      const palette = p.meta.palette!, half = palette.length / 2;
      const theme = dark ? palette.slice(half) : palette.slice(0, half);
      assert.ok(theme.some((c) => out.includes(`fill:${c}`)), `${name}: its ${dark ? "dark" : "light"} colours in the SVG`);
    }
  }
});
