// node --test src/kit/particles.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { banner } from "../banner.ts";
import { svg } from "../svg.ts";
import { play, still } from "../terminal.ts";
import type { Piece } from "../types.ts";
import { EMPTY, INK, NONE, Palette, Surface, TAU, sample, snapshot } from "./core.ts";
import { type Particle, type System, drawParticles, particlesPalette, particles, presets, streak } from "./particles.ts";

// Wall-clock budgets, as on an idle machine when KIT_PERF=1 (npm run test:perf); ten times as long otherwise, so a
// busy CI runner running the files side by side fails only on a slowdown of a different order.
const slack = process.env.KIT_PERF ? 1 : 10;

const SIZE = { cols: 64, rows: 24 };
const NAMES = Object.keys(presets) as (keyof typeof presets)[];
// A banner in a fade of many colours, for pictures.
const WORD = banner("ascii", { effect: "still", color: ["#f59e0b", "#ef4444"] });

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette.
function contract(p: Piece, times = [0, 0.5, 1, 2.5, 7]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      for (const t of times) {
        const text = frame(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `colour ${c} past the palette`);
      }
    }
}

// Cells of a surface holding a character, as [column, row].
function cells(s: Surface, ch: string): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < s.chars.length; i++) if (s.chars[i] === ch.charCodeAt(0)) out.push([i % s.cols, Math.floor(i / s.cols)]);
  return out;
}

// Draws systems into a fresh surface at t.
function drawn(systems: System | System[], t: number, cols = 40, rows = 20, o: { palette?: Palette | null; paper?: boolean; period?: number } = {}): Surface {
  const s = new Surface(cols, rows, { palette: o.palette ?? null });
  s.paper = !!o.paper;
  s.mono = !o.palette;
  drawParticles(s, systems, t, o.period ? { period: o.period } : {});
  return s;
}

// One particle, born at t = 0 at a point and thrown one way: the easiest thing to follow.
const one = (o: Partial<System> = {}): System => ({
  emitter: { point: [10, 5] },
  burst: { every: Infinity, count: 1 },
  life: 100,
  speed: 0,
  angle: 0,
  glyphs: "o",
  bounds: "none",
  ...o,
});

// The particle a system draws at t, as its glyph function sees it (the particle itself, not its trail), or undefined.
function follow(sys: System, t: number, cols = 40, rows = 20): Particle | undefined {
  let seen: Particle | undefined;
  drawn({ ...sys, glyph: (p) => (p.back === 0 && (seen = { ...p }), "o") }, t, cols, rows);
  return seen;
}

test("every preset plays, looks like something at t = 0, and keeps the frame contract", () => {
  for (const name of NAMES) {
    const p = particles({ name }, presets[name]);
    assert.deepEqual([p.meta.cols, p.meta.rows], [64, 24], name);
    assert.ok(p.meta.palette && p.meta.palette.length >= 2 && p.meta.palette.length <= 64, `${name} has colours`);
    const shown = snapshot(p, 0, { mono: true }).text.replace(/[\s]/g, "").length;
    assert.ok(shown >= 8, `${name} draws at t = 0: ${shown} cells`);
    contract(p);
  }
});

test("a frame depends only on t: drawing 5 then 1 gives what 1 gives fresh, for every preset", () => {
  for (const name of NAMES) {
    const p = particles({ name }, presets[name]);
    const color = new Uint8Array(64 * 24);
    const frame = p.default();
    frame(5, { color });
    frame(3.3, { color });
    const later = frame(1, { color });
    const fresh = snapshot(p, 1);
    assert.equal(later, fresh.text, name);
    assert.deepEqual(color, fresh.color, `${name} colours`);
    assert.equal(frame(1, { color }), later, `${name} the same twice`);
  }
});

test("rate x life particles are alive", () => {
  let heads = 0;
  const sys: System = {
    emitter: { area: { x: 0, y: 0, cols: 200, rows: 100 } },
    rate: 20,
    life: 2,
    speed: 0,
    glyph: (p) => (p.back === 0 && heads++, "#"),
  };
  for (const t of [3, 10.37, 55]) {
    heads = 0;
    drawn(sys, t, 200, 100);
    assert.ok(Math.abs(heads - 40) <= 1, `t=${t}: ${heads} alive, not about 40`);
  }
});

test("a particle follows the closed form: throw, gravity, drag and wind", () => {
  // Thrown right at 6 cells a second with gravity 4, no drag: x = 10 + 6a, y in cells = 10 + 2a^2, a row being 2 cells.
  for (const a of [0.5, 1, 1.5]) {
    const s = drawn(one({ speed: 6, gravity: 4 }), a, 60, 40);
    assert.deepEqual(cells(s, "o"), [[Math.floor(10 + 6 * a), Math.floor((10 + 2 * a * a) / 2)]], `a=${a}`);
  }
  // Gravity bends it down: its row only grows.
  let last = -1;
  for (let a = 0; a < 3; a += 0.25) {
    const [[, r]] = cells(drawn(one({ speed: 6, gravity: 4 }), a, 80, 40), "o");
    assert.ok(r >= last, "falls");
    last = r;
  }
  assert.ok(last > 5);
  // With drag k it spends its throw: x = 10 + v (1 - e^-ka) / k, and gravity's pull toward g / k.
  const k = 1.5, v = 20, g = 6;
  for (const a of [0.4, 1.2, 3]) {
    const s = drawn(one({ speed: v, drag: k, gravity: g }), a, 80, 60);
    const x = 10 + (v * (1 - Math.exp(-k * a))) / k;
    const y = 10 + (g / k) * a - (g / k) * (1 - Math.exp(-k * a)) / k;
    assert.deepEqual(cells(s, "o"), [[Math.floor(x), Math.floor(y / 2)]], `drag a=${a}`);
  }
  // Wind carries it: a constant wind and a function that is the same constant put it in the same place.
  for (const a of [0.7, 2.1]) {
    const steady = cells(drawn(one({ wind: 3 }), a, 60, 20), "o");
    const gust = cells(drawn(one({ wind: () => 3 }), a, 60, 20), "o");
    assert.deepEqual(steady, [[Math.floor(10 + 3 * a), 5]]);
    assert.deepEqual(gust, steady);
  }
  // A wind that changes is added up over the particle's life: 2t for t seconds carries it t^2.
  const s = drawn(one({ wind: (t) => 2 * t }), 3, 60, 20);
  assert.deepEqual(cells(s, "o"), [[19, 5]]);
});

test("a burst thrown the same speed every way is round on the screen", () => {
  const s = drawn({ emitter: { point: [30, 15] }, burst: { every: Infinity, count: 64 }, speed: 10, life: 9, glyphs: "o", bounds: "none" }, 1, 60, 30);
  const found = cells(s, "o");
  const w = Math.max(...found.map((c) => c[0])) - Math.min(...found.map((c) => c[0]));
  const h = Math.max(...found.map((c) => c[1])) - Math.min(...found.map((c) => c[1]));
  // 10 cells out every way: 20 columns across and 10 rows down.
  assert.ok(w >= 19 && w <= 21, `width ${w}`);
  assert.ok(h >= 9 && h <= 11, `height ${h}`);
});

test("bounds: wrap, bounce, die and none at the edges", () => {
  // Thrown right at 10 cells a second from column 10 on a 20-column grid: at 1.5 s it has gone to 25.
  const at = (bounds: System["bounds"], t = 1.5) => cells(drawn(one({ speed: 10, bounds }), t, 20, 10), "o");
  assert.deepEqual(at("wrap"), [[5, 5]]);
  assert.deepEqual(at("bounce"), [[15, 5]]);
  assert.deepEqual(at("die"), []);
  assert.deepEqual(at("none"), []);
  // Bounced back, it travels left: its velocity is turned round with it.
  let vx = 0;
  drawn(one({ speed: 10, bounds: "bounce", glyph: (p) => ((vx = p.vx), "o") }), 1.5, 20, 10);
  assert.equal(vx, -10);
  // Thrown up past the top under gravity: with "die" it is gone for good; with "none" it comes back down.
  const up = (bounds: System["bounds"]) => one({ emitter: { point: [10, 2] }, speed: 12, angle: -TAU / 4, gravity: 8, bounds });
  assert.deepEqual(cells(drawn(up("die"), 3, 20, 10), "o"), []);
  assert.equal(cells(drawn(up("none"), 3, 20, 10), "o").length, 1);
  // Bounds for each axis: wrap across, die down.
  const both = one({ speed: 10, angle: 0.3, bounds: { x: "wrap", y: "die" } });
  assert.equal(cells(drawn(both, 1.5, 20, 10), "o").length, 1);
  assert.deepEqual(cells(drawn(both, 6, 20, 10), "o"), []);
});

test("a floor: bouncing off it, or landing and splashing just above it", () => {
  const ball = (o: Partial<System>) => one({ emitter: { point: [5, 1] }, speed: 0, gravity: 20, floor: 8, ...o });
  // Bouncing, it never goes into the floor's row or below, and comes back up.
  const rows = new Set<number>();
  for (let t = 0; t < 4; t += 0.05) for (const [, r] of cells(drawn(ball({ bounds: "bounce" }), t, 12, 12), "o")) rows.add(r);
  assert.ok(Math.max(...rows) <= 7, `rows ${[...rows]}`);
  assert.ok(rows.has(1) && rows.has(7));
  // Landing: falls 14 cells in sqrt(2 * 14 / 20) seconds, then a splash in row 7 for a tenth of a second a character.
  const land = Math.sqrt((2 * 14) / 20);
  const splash = ball({ splash: "ox" });
  assert.equal(cells(drawn(splash, land - 0.02, 12, 12), "o").length, 1);
  assert.deepEqual(cells(drawn(splash, land + 0.05, 12, 12), "o"), [[5, 7]]);
  assert.deepEqual(cells(drawn(splash, land + 0.15, 12, 12), "x"), [[5, 7]]);
  assert.deepEqual(drawn(splash, land + 0.25, 12, 12).toString().trim(), "");
  // With y bounds "die" the bottom edge is a floor too: the splash shows in the last row.
  const edge = one({ emitter: { point: [5, 1] }, gravity: 20, bounds: "die", splash: "~" });
  const t = Math.sqrt((2 * (24 - 2)) / 20) + 0.05;
  assert.deepEqual(cells(drawn(edge, t, 12, 12), "~"), [[5, 11]]);
});

test("emitters: a point that moves, a line, an area, and each edge throwing straight in", () => {
  const all = (emitter: System["emitter"], o: Partial<System> = {}) =>
    cells(drawn({ emitter, rate: 50, life: 0.5, speed: 0, glyphs: "o", ...o }, 3, 40, 20), "o");
  for (const [x, y] of all({ line: [[5, 5], [25, 15]] })) assert.ok(Math.abs((y - 5) * 2 - (x - 5)) <= 2, `on the line at ${x}, ${y}`);
  for (const [x, y] of all({ area: { x: 30, y: 2, cols: 6, rows: 4 } })) assert.ok(x >= 30 && x < 36 && y >= 2 && y < 6);
  const moving = all({ point: (t) => [Math.floor(t * 5), 10] });
  assert.ok(moving.every(([x]) => x >= 12 && x <= 15) && moving.length > 0, JSON.stringify(moving));
  // From an edge, straight in: after a moment each has moved off its edge toward the middle.
  const edge = (side: "top" | "bottom" | "left" | "right") => cells(drawn({ emitter: { edge: side }, rate: 40, life: 0.6, speed: 10, glyphs: "o" }, 3, 40, 20), "o");
  assert.ok(edge("top").every(([, y]) => y <= 3) && edge("top").some(([, y]) => y >= 1));
  assert.ok(edge("bottom").every(([, y]) => y >= 16) && edge("bottom").some(([, y]) => y <= 18));
  assert.ok(edge("left").every(([x]) => x <= 6) && edge("left").some(([x]) => x >= 2));
  assert.ok(edge("right").every(([x]) => x >= 33) && edge("right").some(([x]) => x <= 37));
});

test("emitters and directions in words", () => {
  const all = (o: Partial<System>, t = 3) => cells(drawn({ emitter: "center", rate: 50, life: 0.5, speed: 0, glyphs: "o", ...o } as System, t, 40, 20), "o");
  // "center" is the middle; "everywhere" is all over.
  assert.ok(all({}).every(([x, y]) => x === 20 && y === 10) && all({}).length > 0);
  const spread = all({ emitter: "everywhere", rate: 400 });
  assert.ok(Math.min(...spread.map((c) => c[0])) <= 2 && Math.max(...spread.map((c) => c[0])) >= 37);
  assert.ok(Math.min(...spread.map((c) => c[1])) <= 1 && Math.max(...spread.map((c) => c[1])) >= 18);
  // A side by name is the same as { edge }, throwing straight in.
  for (const side of ["top", "bottom", "left", "right"] as const)
    assert.deepEqual(all({ emitter: side, speed: 8 }), all({ emitter: { edge: side }, speed: 8 }), side);
  // A place by name, for a point.
  assert.ok(all({ emitter: { point: "top-left" } }).every(([x, y]) => x === 0 && y === 0));
  assert.ok(all({ emitter: { point: "bottom-right" } }).every(([x, y]) => x === 39 && y === 19));
  // A direction throws every particle that way; a spread fans them out round it; "out" is every way.
  const from = (o: Partial<System>) => all({ emitter: { point: [20, 10] }, life: 1, speed: 10, ...o });
  assert.ok(from({ direction: "up" }).every(([x, y]) => x === 20 && y <= 10));
  assert.ok(from({ direction: "right" }).every(([x, y]) => x >= 20 && y === 10));
  assert.ok(from({ direction: "down-left" }).every(([x, y]) => x <= 20 && y >= 10));
  const fan = from({ direction: "up", spread: 90 });
  assert.ok(fan.every(([, y]) => y <= 10) && fan.some(([x]) => x < 18) && fan.some(([x]) => x > 22), JSON.stringify(fan));
  const out = from({ direction: "out" });
  assert.ok(out.some(([, y]) => y > 11) && out.some(([, y]) => y < 9) && out.some(([x]) => x < 17) && out.some(([x]) => x > 23));
});

test("scenery: a picture in front of the particles or behind them, in its own colours", () => {
  // A hut on the bottom row in front, and a moon in the top right behind, in a field of particles everywhere.
  const hut = { art: " /\\\n/  \\\n|[]|", paint: { "[": "#fcd34d", "]": "#fcd34d" }, color: "#8b5cf6" };
  const field: System = { emitter: "everywhere", rate: 2000, life: 1, speed: 0, glyphs: "o", colors: ["#ffffff"] };
  const p = particles({ name: "hut", cols: 20, rows: 8, front: hut, back: { art: "(  )", at: "top-right" } }, field);
  const { text, color } = snapshot(p, 3);
  const lines = text.split("\n");
  // In front: the hut is drawn whole, centred on the bottom, and the space inside its roof hides what is behind; the
  // spaces beside the roof, with nothing of the picture above them, let the particles show.
  assert.equal(lines[5].slice(9, 11), "/\\");
  assert.equal(lines[5][8] + lines[5][11], "oo");
  assert.equal(lines[6].slice(8, 12), "/  \\");
  assert.equal(lines[7].slice(8, 12), "|[]|");
  // Behind: particles cover the moon wherever one is drawn over it; its "(" shows only where none is.
  assert.ok(lines[0].slice(16, 20).split("").every((c) => c === "o" || "( )".includes(c)));
  // Colours: the picture's colour, its painted characters, the particles', and INK for the plain moon.
  const pal = p.meta.palette!;
  const at = (x: number, y: number) => pal[color![y * 20 + x]];
  assert.equal(at(8, 7), "#8b5cf6");
  assert.equal(at(9, 7), "#fcd34d");
  assert.ok(pal.includes(INK.light) && pal.includes(INK.dark) && pal.includes("#ffffff"));
  // solid: false lets the particles show through the spaces inside the picture.
  const open = snapshot(particles({ name: "hut", cols: 20, rows: 8, front: { ...hut, solid: false } }, field), 3).text.split("\n");
  assert.equal(open[6].slice(9, 11), "oo");
  // Text alone sits on the bottom row, centred, in the ink.
  const plain = snapshot(particles({ cols: 9, rows: 3, front: "\n\n[==]\n\n" }, []), 0).text;
  assert.equal(plain, "         \n         \n  [==]   ");
});

test("a burst with every: Infinity comes once, or once each period in a piece that repeats", () => {
  const sys: System = { emitter: { point: [5, 2] }, burst: { every: Infinity, count: 1, first: 1 }, life: 1, speed: 0, glyphs: "o" };
  const looped = particles({ name: "once", cols: 10, rows: 4, period: 4 }, sys);
  const seen = (p: Piece, t: number) => snapshot(p, t).text.includes("o");
  assert.deepEqual([0.5, 1.5, 2.5, 5.5, 9.5].map((t) => seen(looped, t)), [false, true, false, true, true]);
  const once = particles({ name: "once", cols: 10, rows: 4, period: 0 }, sys);
  assert.deepEqual([0.5, 1.5, 2.5, 5.5].map((t) => seen(once, t)), [false, true, false, false]);
});

test("empty: no systems draw nothing and leave the surface as it was", () => {
  const s = new Surface(6, 2);
  s.write(0, 0, "keep");
  drawParticles(s, [], 3);
  assert.equal(s.toString(), "keep  \n      ");
  // A region with no area draws nothing either.
  drawParticles(s, { emitter: "everywhere", rate: 100, glyphs: "x" }, 3, { region: { x: 2, y: 0, cols: 0, rows: 2 } });
  assert.equal(s.toString(), "keep  \n      ");
});

test("glyphs and colours by age, in the palette, on paper and on a dark page", () => {
  const sys: System = { ...one(), life: 3, glyphs: "abc", colors: { light: ["#000000", "#0000ff"], dark: ["#ffffff", "#ffff00"] }, steps: 3 };
  const p = particles({ name: "age", cols: 20, rows: 10 }, sys);
  assert.deepEqual(p.meta.palette, ["#000000", "#000080", "#0000ff", "#ffffff", "#ffff80", "#ffff00"]);
  for (const [t, ch, k] of [[0.5, "a", 0], [1.5, "b", 1], [2.5, "c", 2]] as const) {
    for (const paper of [true, false]) {
      const { text, color } = snapshot(p, t, { paper });
      const i = text.replace(/\n/g, "").indexOf(ch);
      assert.equal(i, 5 * 20 + 10, `t=${t}`);
      assert.equal(color![i], (paper ? 0 : 3) + k, `t=${t} paper=${paper}`);
    }
  }
  // After its life it is gone; a space in the glyphs shows nothing.
  assert.equal(snapshot(p, 3.5).text.trim(), "");
  assert.deepEqual(cells(drawn({ ...one(), life: 2, glyphs: " x" }, 0.5), "x"), []);
  assert.deepEqual(cells(drawn({ ...one(), life: 2, glyphs: " x" }, 1.5), "x"), [[10, 5]]);
});

test("mono and paper change colours, never characters", () => {
  for (const name of ["fireworks", "stars", "matrix"] as const) {
    const p = particles({ name }, presets[name]);
    const dark = snapshot(p, 2.2), light = snapshot(p, 2.2, { paper: true }), mono = snapshot(p, 2.2, { mono: true });
    assert.equal(light.text, dark.text, name);
    assert.equal(mono.text, dark.text, name);
    assert.equal(mono.color, null);
    assert.notDeepEqual(light.color, dark.color, `${name}: themed colours differ`);
    // A themed palette: paper takes the light half, a dark page the dark half, where a particle is drawn.
    const half = p.meta.palette!.length / 2;
    const flat = dark.text.replace(/\n/g, "");
    for (let i = 0; i < flat.length; i++)
      if (flat[i] !== " ") {
        assert.ok(light.color![i] < half, `${name} paper colour ${light.color![i]}`);
        assert.ok(dark.color![i] >= half, `${name} dark colour ${dark.color![i]}`);
      }
  }
});

test("a glyph or colour function sees the particle", () => {
  const seen: Particle[] = [];
  const pal = new Palette(["#111111", "#222222", "#333333"]);
  const s = drawn(
    one({ speed: 4, life: 4, glyph: (p) => (seen.push({ ...p }), "Q"), color: (p) => (p.k < 0.5 ? 2 : 1) }),
    1,
    40,
    20,
    { palette: pal },
  );
  assert.equal(seen.length, 1);
  const p = seen[0];
  assert.deepEqual([p.id, p.age, p.life, p.k, p.x, p.y, p.vx, p.vy, p.t, p.back], [0, 1, 4, 0.25, 14, 5, 4, 0, 1, 0]);
  assert.ok(p.rand >= 0 && p.rand < 1);
  // Where and how it was born: its place, its throw, no hold, and no character from text.
  assert.deepEqual([p.x0, p.y0, p.angle, p.speed, p.hold, p.char], [10, 5, 0, 4, 0, ""]);
  assert.equal(s.colorAt(14, 5), 2);
});

test("a glyph function may draw nothing: undefined, null or an empty string; an emoji throws, naming it", () => {
  for (const g of [undefined, null, ""]) assert.equal(drawn(one({ glyph: () => g as unknown as string }), 1).toString().trim(), "", String(g));
  assert.equal(drawn(one({ glyph: () => 7 as unknown as string }), 1).get(10, 5), "7");
  assert.throws(() => drawn(one({ glyph: () => "😀" }), 1), /ascii\.rest: a glyph function returns one character from the Basic Multilingual Plane, not "😀"/);
});

test("twinkle hides a share of particles each tenth of a second", () => {
  const field = (twinkle: number) => ({ emitter: { area: { x: 0, y: 0, cols: 100, rows: 50 } }, rate: 400, life: 2, speed: 0, glyphs: "o", twinkle });
  const count = (twinkle: number, t: number) => cells(drawn(field(twinkle), t, 100, 50), "o").length;
  assert.equal(count(1, 4), 0);
  const all = count(0, 4), half = count(0.5, 4);
  assert.ok(all > 700, `${all}`);
  assert.ok(half > all * 0.4 && half < all * 0.6, `${half} of ${all}`);
  // Different tenths hide different ones.
  const a = drawn(field(0.5), 4.01, 100, 50).toString(), b = drawn(field(0.5), 4.11, 100, 50).toString();
  assert.notEqual(a, b);
});

test("trails: a line along the heading thinning to dots, or glyphs and colours of your own", () => {
  // Moving right at 10 cells a second with a 0.6 s trail: six cells behind it, a line along its heading and a dot at
  // the far end.
  const s = drawn(one({ speed: 10, trail: 0.6 }), 2, 40, 10);
  assert.equal(s.get(30, 5), "o");
  assert.deepEqual([29, 28, 27, 26].map((x) => s.get(x, 5)), ["-", "-", "-", "-"]);
  assert.equal(s.get(24, 5), ".");
  assert.equal(s.get(23, 5), "");
  // Falling, the line turns upright; going down and right, it leans.
  assert.equal(drawn(one({ speed: 10, angle: TAU / 4, trail: 0.3 }), 0.5, 40, 20).get(10, 6), "|");
  assert.equal(drawn(one({ speed: 10, angle: TAU / 8, trail: 0.3 }), 0.5, 40, 20).get(12, 6), "\\");
  // Never further back than its birth: at 0.2 s it has come two cells, so the trail is two cells long.
  const young = drawn(one({ speed: 10, trail: 0.6 }), 0.2, 40, 10);
  assert.equal(young.toString().replace(/\s/g, ""), "--o");
  assert.equal(young.get(10, 5), "-");
  // Glyphs and colours of its own, from just behind the head to the end.
  const pal = new Palette(["#000000", "#ff0000", "#00ff00"]);
  const own = drawn(one({ speed: 10, trail: 0.4, trailGlyphs: "=~", colors: ["#000000"], trailColors: ["#ff0000", "#00ff00"], steps: 2 }), 2, 40, 10, { palette: pal });
  assert.deepEqual([own.get(30, 5), own.get(29, 5), own.get(28, 5), own.get(27, 5), own.get(26, 5)], ["o", "=", "=", "~", "~"]);
  assert.deepEqual([own.colorAt(30, 5), own.colorAt(29, 5), own.colorAt(26, 5)], [0, 1, 2]);
});

test("streak points the way a particle goes on the screen", () => {
  assert.equal(streak({ vx: 5, vy: 0 }), "-");
  assert.equal(streak({ vx: -5, vy: 0.5 }), "-");
  assert.equal(streak({ vx: 0, vy: 5 }), "|");
  assert.equal(streak({ vx: 0, vy: -5 }), "|");
  assert.equal(streak({ vx: 5, vy: 5 }), "\\");
  assert.equal(streak({ vx: -5, vy: -5 }), "\\");
  assert.equal(streak({ vx: 5, vy: -5 }), "/");
  assert.equal(streak({ vx: -5, vy: 5 }), "/");
});

test("bursts: in turn through their palettes, once, from a start, and climbing first with rise", () => {
  const sys: System = {
    emitter: { point: [20, 5] },
    burst: { every: 2, count: 1, first: 0.5 },
    life: 1,
    speed: 0,
    glyphs: "o",
    palettes: [["#ff0000"], ["#00ff00"], ["#0000ff"]],
  };
  const p = particles({ name: "turns", cols: 40, rows: 12 }, sys);
  const pal = p.meta.palette!;
  const colourAt = (t: number) => pal[snapshot(p, t).color![5 * 40 + 20]];
  assert.deepEqual([colourAt(0.6), colourAt(2.6), colourAt(4.6), colourAt(6.6)], ["#ff0000", "#00ff00", "#0000ff", "#ff0000"]);
  assert.equal(snapshot(p, 1.6).text.trim(), "");
  // Every: Infinity is one burst only.
  const once = { ...sys, burst: { every: Infinity, count: 1, first: 1 } };
  assert.equal(cells(drawn(once, 1.5), "o").length, 1);
  assert.equal(cells(drawn(once, 3.5), "o").length, 0);
  assert.equal(cells(drawn(once, 0.5), "o").length, 0);
  // Nothing from before `start`.
  const late: System = { emitter: { point: [5, 5] }, rate: 10, life: 5, speed: 0, glyphs: "o", start: 2 };
  assert.equal(cells(drawn(late, 1.9), "o").length, 0);
  assert.equal(cells(drawn(late, 2.15), "o").length, 1);
  // With rise, the shell climbs from the bottom as a "|" before it bursts.
  const shell: System = { emitter: { point: [20, 4] }, burst: { every: 3, count: 8, first: 2, rise: 1 }, speed: 0, life: 1, glyphs: "o" };
  const climbing = drawn(shell, 1.6, 40, 20);
  const [[x, y]] = cells(climbing, "|");
  assert.ok(Math.abs(x - 20) <= 2 && y > 4 && y < 19, `rising at ${x}, ${y}`);
  assert.equal(cells(drawn(shell, 2.1, 40, 20), "|").length, 0);
  assert.equal(cells(drawn(shell, 2.1, 40, 20), "o").length, 1);
});

test("a period makes it repeat exactly, and sets the loop", () => {
  for (const name of NAMES) {
    const p = particles({ name, period: 5 }, presets[name]);
    assert.equal(p.meta.loop, 5);
    for (const t of [0, 1.3, 3.71]) {
      const a = snapshot(p, t), b = snapshot(p, t + 5), c = snapshot(p, t + 15);
      assert.equal(b.text, a.text, `${name} at ${t}`);
      assert.deepEqual(b.color, a.color, `${name} colours at ${t}`);
      assert.equal(c.text, a.text, `${name} three periods on`);
    }
  }
  // Without one, frames a period apart differ.
  const free = particles({ name: "snow" }, presets.snow);
  assert.notEqual(snapshot(free, 5).text, snapshot(free, 0).text);
});

test("seeds: the same seed, the same particles; another, others", () => {
  const field = (seed?: number): System => ({ emitter: { area: { x: 0, y: 0, cols: 40, rows: 20 } }, rate: 30, speed: [1, 3], seed });
  assert.equal(drawn(field(7), 2).toString(), drawn(field(7), 2).toString());
  assert.notEqual(drawn(field(7), 2).toString(), drawn(field(8), 2).toString());
  // Two systems alike but for their place in a list don't draw the same particles.
  const [a, b] = [field(), field()];
  const s = new Surface(40, 20);
  drawParticles(s, [a, b], 2);
  assert.notEqual(drawn(a, 2).toString(), s.toString());
});

test("a region: the systems live inside it and draw nowhere else", () => {
  const region = { x: 10, y: 4, cols: 12, rows: 6 };
  const sys: System = { emitter: { edge: "top" }, rate: 80, life: 3, speed: 4, glyphs: "o", bounds: { x: "wrap", y: "die" }, wind: 5 };
  const s = new Surface(40, 20);
  drawParticles(s, sys, 4, { region });
  const found = cells(s, "o");
  assert.ok(found.length > 10);
  for (const [x, y] of found) assert.ok(x >= 10 && x < 22 && y >= 4 && y < 10, `${x}, ${y}`);
  // A region off the surface draws nothing.
  const off = new Surface(10, 5);
  drawParticles(off, sys, 4, { region: { x: 20, y: 20, cols: 5, rows: 5 } });
  assert.equal(off.toString().trim(), "");
});

test("particlesPalette: your colours first, each colour once, INK for the plain ones", () => {
  const red: System = { emitter: { point: [1, 1] }, colors: ["#ff0000", "#000000"], steps: 3 };
  const plain: System = { emitter: { point: [1, 1] } };
  assert.equal(particlesPalette(plain), undefined);
  assert.deepEqual(particlesPalette(red), ["#ff0000", "#800000", "#000000"]);
  assert.deepEqual(particlesPalette([red, red]), ["#ff0000", "#800000", "#000000"]);
  assert.deepEqual(particlesPalette([plain, red]), { light: [INK.light, "#ff0000", "#800000", "#000000"], dark: [INK.dark, "#ff0000", "#800000", "#000000"] });
  assert.deepEqual(particlesPalette(red, ["#123456"]), ["#123456", "#ff0000", "#800000", "#000000"]);
  const many: System = { emitter: { point: [1, 1] }, palettes: Array.from({ length: 9 }, (_, i) => ({ light: [`#0000${(i + 16).toString(16)}`], dark: [`#00${(i + 16).toString(16)}00`] })), steps: 1 };
  assert.equal((particlesPalette(many) as { light: readonly string[] }).light.length, 9);
  const tooMany: System = { ...many, palettes: Array.from({ length: 40 }, (_, i) => ({ light: [`#0000${(i + 16).toString(16)}`], dark: [`#00${(i + 16).toString(16)}00`] })) };
  assert.throws(() => particlesPalette(tooMany), /ascii\.rest: particlesPalette\(\): these particles have 80 colours between them, light and dark, past the 64/);
  // A trail's colours are in it too, after the particle's.
  assert.deepEqual(particlesPalette({ ...red, steps: 1, colors: ["#ff0000"], trailColors: ["#00ff00"] }), ["#ff0000", "#00ff00"]);
  // Empty: nothing to colour.
  assert.equal(particlesPalette([]), undefined);
});

test("particles(): its meta, a size for the systems, and the players", async () => {
  let given: unknown;
  const p = particles({ name: "embers", note: "embers rising", cols: 30, rows: 12, fps: 24, period: 3 }, (size) => ((given = size), presets.sparks(size)));
  // The size, and the period, so a system can time its changes to it.
  assert.deepEqual(given, { cols: 30, rows: 12, period: 3 });
  assert.equal(p.meta.name, "embers");
  assert.equal(p.meta.note, "embers rising");
  assert.equal(p.meta.fps, 24);
  assert.equal(p.meta.loop, 3);
  assert.equal(p.meta.category, "generative");
  // A loop of your own wins over the period's.
  assert.equal(particles({ period: 3, loop: 6 }, presets.snow).meta.loop, 6);
  const plain = particles({}, { emitter: { point: [32, 12] } });
  assert.deepEqual([plain.meta.name, plain.meta.cols, plain.meta.rows, plain.meta.palette, plain.meta.loop], ["particles", 64, 24, undefined, 8]);
  // Period 0: it never repeats, and has no loop.
  assert.equal(particles({ period: 0 }, presets.snow).meta.loop, undefined);
  // A preset by name, its options third, is the same as the preset function with them.
  const byName = particles({ name: "storm" }, "snow", { wind: 5, density: 2 });
  const byFn = particles({ name: "storm" }, presets.snow, { wind: 5, density: 2 });
  assert.equal(snapshot(byName, 2.5).text, snapshot(byFn, 2.5).text);
  assert.notEqual(snapshot(byName, 2.5).text, snapshot(particles({ name: "storm" }, "snow"), 2.5).text);
  // No systems: blank frames.
  assert.equal(snapshot(particles({ name: "none", cols: 4, rows: 2 }, []), 1).text, "    \n    ");
  // It plays wherever a piece does: svg(), a terminal, and kit's own sampler.
  assert.match(svg(p), /^<svg[\s\S]*<\/svg>$/);
  assert.ok((await still(p)).trim().length > 0);
  let written = "";
  const out = { isTTY: true, columns: 80, rows: 24, write: (s: string) => (written += s) };
  const played = await play(p, { seconds: 0.2, out: out as unknown as NodeJS.WriteStream });
  assert.equal(played.cropped, false);
  assert.match(written, /\x1b\[38;2;/);
  assert.ok(sample(p).at(1).chars.some((c) => c !== EMPTY));
});

test("drawn on a surface with no palette, or in mono, particles take the ink", () => {
  const s = drawn({ ...one(), colors: ["#ff0000"] }, 1);
  assert.equal(s.get(10, 5), "o");
  assert.equal(s.colorAt(10, 5), NONE);
  const pal = new Palette(["#00ff00", "#ff0000"]);
  const mono = new Surface(40, 20, { palette: pal });
  drawParticles(mono, { ...one(), colors: ["#ff0000"] }, 1);
  assert.equal(mono.colorAt(10, 5), NONE);
  const colored = new Surface(40, 20, { palette: pal });
  colored.mono = false;
  drawParticles(colored, { ...one(), colors: ["#ff0000"] }, 1);
  assert.equal(colored.colorAt(10, 5), 1);
});

test("a frame is quick: under 4 ms at 64 by 24 for every preset", () => {
  for (const name of NAMES) {
    const p = particles({ name }, presets[name]);
    const frame = p.default();
    const color = new Uint8Array(64 * 24);
    for (let i = 0; i < 20; i++) frame(i / 30, { color });
    const start = performance.now();
    for (let i = 0; i < 120; i++) frame(1 + i / 30, { color });
    const ms = (performance.now() - start) / 120;
    assert.ok(ms < 4 * slack, `${name}: ${ms.toFixed(2)} ms a frame`);
  }
});

test("every option is checked when the piece is made, saying what to change", () => {
  const ok: System = { emitter: { point: [1, 1] } };
  const bad = (o: Record<string, unknown>, re: RegExp) => assert.throws(() => particles({}, { ...ok, ...o } as System), re);
  bad({ emitter: undefined }, /ascii\.rest: particles\(\)\.emitter takes "top", "bottom", "left", "right", "everywhere" and "center", or \{ point \}, \{ line \}, \{ area \}, \{ edge \} or \{ text \}, not undefined/);
  bad({ emitter: "sky" }, /emitter takes "top", .* not "sky"/);
  bad({ emitter: { point: "middle" } }, /emitter\.point takes a place, "center", "top", .* not "middle"/);
  bad({ direction: "north" }, /direction takes "right", "down-right", .* "out", not "north"/);
  bad({ direction: "up", angle: 1 }, /takes a direction or an angle, not both/);
  bad({ direction: "up", spread: 400 }, /spread takes degrees from 0 to 360, not 400/);
  bad({ spread: 30 }, /spread fans out round a direction: give one too/);
  bad({ angle: 1, spread: 30 }, /spread goes with a direction: with an angle, give \[low, high\] instead/);
  bad({ emitter: { point: [1, 1], edge: "top" } }, /emitter takes one of point, line, area, edge and text, not point and edge/);
  bad({ emitter: { point: [1] } }, /emitter\.point takes a place such as "center", \[column, row\], or a function of the time, not \[1\]/);
  bad({ emitter: { point: () => "x" } }, /emitter\.point as a function takes the time and returns \[column, row\]/);
  bad({ emitter: { line: [[1, 1]] } }, /emitter\.line takes two points/);
  bad({ emitter: { area: { x: 0, y: 0, cols: 0, rows: 2 } } }, /emitter\.area takes a region/);
  bad({ emitter: { edge: "middle" } }, /emitter\.edge takes "top", "bottom", "left" and "right", not "middle"/);
  bad({ rate: 0 }, /rate takes a number of particles a second above 0, not 0/);
  bad({ rate: 5, burst: { every: 1, count: 3 } }, /takes a rate or a burst, not both/);
  bad({ burst: { every: 0, count: 3 } }, /burst\.every takes a number of seconds above 0 \(Infinity for once\), not 0/);
  bad({ burst: { every: 1, count: 2.5 } }, /burst\.count takes a whole number/);
  bad({ burst: { every: 1, count: 2, rise: 1, scatter: true } }, /rise launches a burst from one place, so it can't scatter/);
  bad({ life: 0 }, /life takes a number above 0/);
  bad({ life: [3, 1] }, /life takes a number above 0, or \[low, high\] with low no more than high, not \[3,1\]/);
  bad({ speed: -1 }, /speed takes a number of 0 or more/);
  bad({ angle: "up" }, /angle takes a number, or \[low, high\]/);
  bad({ gravity: NaN }, /gravity takes a number of cells a second squared/);
  bad({ wind: "east" }, /wind takes a number of cells a second or a function of the time/);
  bad({ wind: () => NaN }, /wind as a function takes the time and returns cells a second, not NaN/);
  bad({ drag: -1 }, /drag takes a number of 0 or more/);
  bad({ sway: { amount: 1 } }, /sway takes cells each way, or \{ amount, speed \} in cells and swings a second of 0 or more, not \{"amount":1\}/);
  bad({ sway: -2 }, /sway takes cells each way, 0 or more, or \{ amount, speed \}, not -2/);
  bad({ glyphs: "" }, /glyphs takes a string of one or more characters/);
  bad({ glyphs: "a\u0007" }, /a cell takes one printable character/);
  bad({ glyphs: "😀" }, /Basic Multilingual Plane/);
  bad({ glyph: "x" }, /glyph takes a function of the particle/);
  bad({ color: "#ff0000" }, /color takes a function of the particle that returns a colour: for colours by age, use colors/);
  bad({ colors: ["red"] }, /colors takes colours as #rrggbb/);
  bad({ colors: { light: ["#000000"], dark: ["#ffffff", "#eeeeee"] } }, /colors takes colours as #rrggbb: a list, or \{ light, dark \} lists of the same length/);
  bad({ colors: ["#000000"], palettes: [["#ffffff"]] }, /takes colors or palettes, not both/);
  bad({ palettes: [] }, /palettes takes a list of one or more fades/);
  bad({ steps: 0 }, /steps takes a whole number from 1 to 32, not 0/);
  bad({ twinkle: 2 }, /twinkle takes a share from 0 to 1, not 2/);
  bad({ bounds: "stick" }, /bounds takes "die", "wrap", "bounce" and "none", not "stick"/);
  bad({ bounds: { y: "loop" } }, /bounds\.y takes "die", "wrap", "bounce" and "none", not "loop"/);
  bad({ floor: "ground" }, /floor takes a row/);
  bad({ splash: 3 }, /splash takes a string/);
  bad({ trail: -1 }, /trail takes a number of seconds of 0 or more/);
  bad({ trailGlyphs: "" }, /trailGlyphs takes a string of one or more characters/);
  bad({ start: "now" }, /start takes a number of seconds/);
  bad({ seed: 1.5 }, /seed takes a whole number, not 1\.5/);
  bad({ rate: 10000, life: 5 }, /would keep 50000 particles alive at once, past the 20000 a frame can draw in time: lower its rate, count or life/);
  bad({ bounciness: 2 }, /bounciness takes a share of its speed from 0 to 1, not 2/);
  bad({ bounciness: 0.5, bounds: "bounce", wind: () => 1 }, /bounciness can't slow a bounce off the sides in a wind that is a function/);
  bad({ hold: -1 }, /hold takes a number of 0 or more, or \[low, high\]/);
  bad({ path: [1, 2] }, /path takes a function of the particle that returns \[column, row\]$/);
  bad({ path: () => "here" }, /path takes a function of the particle that returns \[column, row\], not one that returns "here"/);
  bad({ emitter: { text: "   \n  " } }, /emitter\.text takes text with at least one character that isn't a space/);
  bad({ emitter: { text: 5 } }, /emitter\.text takes text, a piece such as banner\("hi"\), or a Surface, not 5/);
  bad({ emitter: { text: "hi", at: "middle" } }, /emitter\.at takes a place, "center", .* not "middle"/);
  bad({ emitter: { text: "hi" }, burst: { every: 2, rise: 1 } }, /rise launches a burst from one place, so it can't come from text/);
  bad({ burst: { every: 2 } }, /burst\.count takes a whole number of particles of 1 or more, not undefined/);
  // In a list, the system is named by its place.
  assert.throws(() => particles({}, [ok, { ...ok, rate: -1 }]), /ascii\.rest: particles\(\) \(system 2\)\.rate takes/);
  assert.throws(() => particles({}, 7 as unknown as System), /particles\(\) takes a system, \{ emitter, \.\.\. \}, or a list of them, not 7/);
  assert.throws(() => particles({}, "snowy" as "snow"), /particles\(\) takes a preset by name, "snow", "rain", .* or systems of your own, not "snowy"/);
  const loose = particles as (spec: object, systems: System, options: object) => unknown;
  assert.throws(() => loose({}, ok, { wind: 3 }), /particles\(\) takes options third only for a preset/);
  assert.throws(() => particles({ period: -1 }, ok), /particles\(\)'s period takes a number of seconds, 0 for none, not -1/);
  assert.throws(() => particles({ cols: 0 }, ok), /takes whole numbers of columns and rows/);
  assert.throws(() => particles({ front: 3 as never }, ok), /particles\(\)'s front takes text, a piece, a Surface, or \{ art, at, color, paint, solid \}, not 3/);
  assert.throws(() => particles({ back: { art: 3 } as never }, ok), /particles\(\)'s back takes text, a piece, a Surface, or \{ art, at, color, paint, solid \}/);
  assert.throws(() => particles({ back: { art: "x", at: "middle" as never } }, ok), /particles\(\)'s back\.at takes a place/);
  assert.throws(() => particles({ front: { art: "x", color: "grey" } }, ok), /front\.color takes #rrggbb or \{ light, dark \}/);
  assert.throws(() => particles({ front: { art: "x", paint: { ab: "#ffffff" } } }, ok), /front\.paint takes one character a key, not "ab"/);
  assert.throws(() => particles({ front: { art: "x", paint: { x: "gold" } } }, ok), /front\.paint\["x"\] takes #rrggbb/);
  // drawParticles checks its own arguments.
  assert.throws(() => drawParticles({} as Surface, ok, 0), /drawParticles\(\) takes a Surface first/);
  assert.throws(() => drawParticles(new Surface(4, 4), ok, 0, { region: { x: 0 } as never }), /region takes \{ x, y, cols, rows \}/);
  assert.throws(() => drawParticles(new Surface(4, 4), ok, 0, { period: -2 }), /drawParticles\(\)'s period takes a number of seconds, 0 for none, not -2/);
  // And the presets theirs.
  assert.throws(() => presets.snow({ cols: 0, rows: 4 }), /presets\.snow takes the piece's size, \{ cols, rows \}/);
  assert.throws(() => presets.snow(SIZE, { layers: 4 }), /presets\.snow's layers takes 1, 2 or 3, not 4/);
  assert.throws(() => presets.snow(SIZE, { density: -1 }), /presets\.snow's density takes a number above 0, not -1/);
  assert.throws(() => presets.rain(SIZE, { wind: Infinity }), /presets\.rain's wind takes a number of cells a second/);
  assert.throws(() => presets.stars(SIZE, { shooting: -1 }), /presets\.stars' shooting takes seconds between shooting stars, 0 for none/);
  assert.throws(() => presets.sparks(SIZE, { at: [1] as never }), /presets\.sparks' at takes \[column, row\]/);
  assert.throws(() => presets.fireworks(SIZE, { colors: ["gold"] }), /presets\.fireworks' colors takes a list of #rrggbb/);
  assert.throws(() => presets.fireworks(SIZE, { count: 0 }), /presets\.fireworks' count takes a whole number of sparks/);
  assert.throws(() => presets.matrix(SIZE, { colors: ["#00ff00"] }), /presets\.matrix's colors takes two or more colours: the head's, then the trail's/);
  assert.throws(() => presets.bubbles(SIZE, "many" as never), /presets\.bubbles takes its options as an object/);
});

test("preset options change what they say", () => {
  const count = (systems: System[], t = 3) => {
    const s = new Surface(64, 24);
    drawParticles(s, systems, t);
    return s.toString().replace(/\s/g, "").length;
  };
  assert.ok(count(presets.snow(SIZE, { density: 2 })) > count(presets.snow(SIZE)) * 1.5);
  assert.equal(presets.snow(SIZE, { layers: 1 }).length, 1);
  assert.equal(presets.snow(SIZE, { layers: 1 })[0].glyphs, "*");
  assert.equal(presets.stars(SIZE, { shooting: 0 }).length, 1);
  assert.equal(presets.rain(SIZE, { splash: "" })[1].splash, "");
  // Snow blown by the wind drifts the way it blows: the flakes' mean heading leans with it.
  let vx = 0, n = 0;
  const lean = presets.snow(SIZE, { wind: 6, layers: 1 }).map((s) => ({ ...s, glyph: (p: Particle) => ((vx += p.vx), n++, "*") }));
  count(lean);
  assert.ok(vx / n > 3, `mean vx ${vx / n}`);
  // A fountain from where you put it: the white-hot sparks low down, just thrown, rise from right above it; and
  // `height` sets how high it climbs.
  const fountain = (o: Parameters<typeof presets.sparks>[1], t = 2) => {
    const s = new Surface(64, 24);
    drawParticles(s, presets.sparks(SIZE, o), t);
    return s;
  };
  const low = cells(fountain({ at: [10, 23] }), "*").filter(([, y]) => y >= 20);
  assert.ok(low.length > 2 && low.every(([x]) => Math.abs(x - 10) <= 3), JSON.stringify(low));
  const top = (s: Surface) => Math.min(...[...s.toString().replace(/\n/g, "")].flatMap((c, i) => (c !== " " ? [Math.floor(i / 64)] : [])));
  assert.ok(top(fountain({})) <= 6, `climbs to row ${top(fountain({}))}`);
  assert.ok(top(fountain({ height: 0.4 })) >= 11, `climbs to row ${top(fountain({ height: 0.4 }))}`);
  // Fireworks in your colours, a fade for each.
  const fw = presets.fireworks(SIZE, { colors: ["#ff0000", "#00ff00"] });
  assert.equal(fw[0].palettes!.length, 2);
  // The matrix in your colours: the head, then the trail.
  const mx = presets.matrix(SIZE, { colors: ["#ffffff", "#00ff00", "#003300"] });
  assert.deepEqual(mx[0].colors, { light: ["#ffffff"], dark: ["#ffffff"] });
});

test("bounce under gravity: a dropped ball comes back up to where it fell from, again and again", () => {
  // Dropped from row 1 (2 cells down) onto a floor at row 10 (20 cells) under gravity 20: it falls 18 cells in
  // sqrt(1.8) seconds at 20 sqrt(1.8) cells a second, and its bounces repeat every twice that.
  const ball = one({ emitter: { point: [5, 1] }, gravity: 20, floor: 10, bounds: "bounce" });
  const fall = Math.sqrt(1.8), v = 20 * fall;
  const expected = (t: number) => {
    const s = t % (2 * fall);
    return s < fall ? 2 + 10 * s * s : 20 - v * (s - fall) + 10 * (s - fall) ** 2;
  };
  for (const t of [0.3, 1.2, 1.5, 2.6, 3.1, 7.77, 41.3, 99.9]) {
    const p = follow(ball, t, 12, 12)!;
    assert.ok(Math.abs(p.y * 2 - expected(t)) < 1e-6, `t=${t}: ${p.y * 2} cells down, not ${expected(t)}`);
  }
  // Falling just before the floor, rising just after, at the speed it hit at.
  assert.ok(Math.abs(follow(ball, fall - 1e-3, 12, 12)!.vy - v) < 0.1);
  assert.ok(Math.abs(follow(ball, fall + 1e-3, 12, 12)!.vy + v) < 0.1);
  // Never above the row it fell from, nor into the floor.
  for (let t = 0; t < 12; t += 0.05) {
    const { y } = follow(ball, t, 12, 12)!;
    assert.ok(y >= 1 - 1e-9 && y < 10, `t=${t}: row ${y}`);
  }
});

test("bounciness: each bounce lower than the last, then at rest on the floor", () => {
  // Half the speed it hit at goes a quarter as high: 18 cells, then 4.5, then 1.125.
  const ball = one({ emitter: { point: [5, 1] }, gravity: 20, floor: 10, bounds: "bounce", bounciness: 0.5 });
  const tops: number[] = [];
  let rising = false;
  for (let t = 0; t < 4; t += 0.002) {
    const { y, vy } = follow(ball, t, 12, 12)!;
    if (rising && vy >= 0) tops.push(20 - y * 2);
    rising = vy < 0;
  }
  assert.ok(tops.length >= 3, JSON.stringify(tops));
  assert.ok(Math.abs(tops[0] - 4.5) < 0.01 && Math.abs(tops[1] - 1.125) < 0.01, JSON.stringify(tops));
  // It settles in about 4 seconds, in the last row above the floor, still.
  const rest = follow(ball, 5, 12, 12)!;
  assert.deepEqual([Math.floor(rest.y), rest.vy], [9, 0]);
  assert.deepEqual(cells(drawn(ball, 50, 12, 12), "o"), [[5, 9]]);
});

test("bounciness across, and resting on the bottom edge when there is no floor", () => {
  // Thrown right at 10 cells a second from column 10 between the sides at 0 and 20: it meets the right at 1 s and comes
  // back at half the speed, meets the left at 5 s and goes on at a quarter.
  const at = (t: number) => follow(one({ speed: 10, bounds: "bounce", bounciness: 0.5 }), t, 20, 10)!;
  assert.deepEqual([at(0.5).x, at(0.5).vx], [15, 10]);
  assert.deepEqual([at(2).x, at(2).vx], [15, -5]);
  assert.deepEqual([at(6).x, at(6).vx], [2.5, 2.5]);
  // No floor: it rests in the last row, where it can be seen.
  const ball = one({ gravity: 30, bounds: "bounce", bounciness: 0.3 });
  const p = follow(ball, 20, 20, 10)!;
  assert.deepEqual([Math.floor(p.y), p.vy], [9, 0]);
  assert.deepEqual(cells(drawn(ball, 20, 20, 10), "o"), [[10, 9]]);
});

test("hold: a particle holds still where it was born, then sets off as if thrown then", () => {
  const sys = one({ speed: 10, hold: 1 });
  assert.equal(follow(sys, 0.5)!.x, 10);
  assert.equal(follow(sys, 1.5)!.x, 15);
  assert.equal(follow(sys, 1.5)!.hold, 1);
  // A wind that grows carries it from when it sets off: 2t from 1 s to 3 s is 8 cells.
  assert.ok(Math.abs(follow(one({ wind: (t) => 2 * t, hold: 1 }), 3, 60, 20)!.x - 18) < 1e-6);
  // A range: each its own hold.
  const holds = new Set<number>();
  drawn({ emitter: { point: [10, 5] }, burst: { every: Infinity, count: 20 }, life: 9, speed: 10, hold: [0.5, 2], glyph: (p) => (holds.add(p.hold), "o") }, 1);
  assert.equal(holds.size, 20);
  assert.ok([...holds].every((h) => h >= 0.5 && h <= 2));
});

test("path: where a particle is, worked out your own way, its velocity from where it was a moment before", () => {
  const ring = one({ path: (p) => [20 + 8 * Math.cos(p.age), 10 + 4 * Math.sin(p.age)] });
  const p = follow(ring, 1)!;
  assert.ok(Math.abs(p.x - (20 + 8 * Math.cos(1))) < 1e-9 && Math.abs(p.y - (10 + 4 * Math.sin(1))) < 1e-9);
  // Velocity in cells a second, y down, a row being two cells.
  assert.ok(Math.abs(p.vx + 8 * Math.sin(1)) < 0.05 && Math.abs(p.vy - 8 * Math.cos(1)) < 0.05, `${p.vx}, ${p.vy}`);
  // It is told where the particle was born and how it was thrown.
  const thrown = one({ speed: 4, angle: TAU / 4, path: (q) => [q.x0 + q.speed * q.age * Math.cos(q.angle), q.y0 + (q.speed * q.age * Math.sin(q.angle)) / 2] });
  assert.deepEqual(cells(drawn(thrown, 2), "o"), [[10, 9]]);
  // The edges still count: "die" drops it once it is out, "wrap" brings it round.
  const run = (bounds: System["bounds"]) => one({ bounds, path: (q) => [q.x0 + 10 * q.age, q.y0] });
  assert.deepEqual(cells(drawn(run("die"), 0.5, 20, 10), "o"), [[15, 5]]);
  assert.deepEqual(cells(drawn(run("die"), 1.5, 20, 10), "o"), []);
  assert.deepEqual(cells(drawn(run("wrap"), 1.5, 20, 10), "o"), [[5, 5]]);
  // A trail follows the path back.
  const tail = drawn(one({ trail: 0.4, path: (q) => [q.x0 + 10 * q.age, q.y0] }), 1, 40, 10);
  assert.deepEqual([20, 19, 18, 17, 16].map((x) => tail.get(x, 5)), ["o", "-", "-", "-", "."]);
});

test("text: particles born on its characters, a burst one on each, drawn as the character itself", () => {
  // Still, a burst of text is the text: in the middle of the grid, each character in its place.
  const still = (o: Partial<System> = {}) => drawn({ emitter: { text: "AB\n C" }, burst: { every: Infinity }, speed: 0, life: 9, ...o } as System, 1, 10, 5);
  assert.equal(still().toString(), "          \n    AB    \n     C    \n          \n          ");
  assert.equal(still({ emitter: { text: "AB\n C", at: "top-left" } }).toString(), "AB        \n C        \n          \n          \n          ");
  // glyphs say otherwise; a glyph function sees the character.
  assert.equal(still({ glyphs: "o" }).toString().replace(/\s/g, ""), "ooo");
  assert.equal(still({ glyph: (p) => p.char.toLowerCase() }).toString().replace(/\s/g, ""), "abc");
  // A rate: every particle on a character, never on a space.
  const rate = cells(drawn({ emitter: { text: "A B" }, rate: 300, life: 0.4, speed: 0, glyphs: "o" }, 2, 9, 3), "o");
  assert.deepEqual(rate.sort(), [[3, 1], [5, 1]]);
  // Thrown out, each flies away from the middle of the text: a burst of text holds a second first, so the word is seen.
  const boom: System = { emitter: { text: "A   B" }, burst: { every: Infinity }, speed: 10, life: 9 };
  assert.equal(drawn(boom, 0.9, 30, 5).toString().split("\n")[2], "            A   B             ");
  const out = drawn(boom, 1.5, 30, 5);
  assert.ok(cells(out, "A")[0][0] < 12 && cells(out, "B")[0][0] > 18, out.toString());
  assert.deepEqual(cells(drawn({ ...boom, hold: 0 }, 0.5, 30, 5), "A"), cells(out, "A"));
  // Its life counts from its birth, the hold included; left to its default, it is 1 to 2 s after the hold.
  assert.equal(cells(drawn(boom, 8.9, 300, 60), "B").length, 1);
  assert.equal(cells(drawn(boom, 9.1, 300, 60), "B").length, 0);
  const plain: System = { emitter: { text: "A   B" }, burst: { every: Infinity }, speed: 10 };
  assert.equal(cells(drawn(plain, 1.95, 300, 60), "B").length + cells(drawn(plain, 1.95, 300, 60), "A").length, 2);
  assert.equal(drawn(plain, 3.01, 300, 60).toString().trim(), "");
  // A piece's still frame, such as a banner's, or a grid, is text too.
  const word = banner("hi", { effect: "still", shadow: "none" });
  const blown = particles({ cols: word.meta.cols, rows: word.meta.rows }, { emitter: { text: word }, burst: { every: Infinity }, speed: 0, life: 99 });
  assert.equal(snapshot(blown, 1, { mono: true }).text.replace(/\s/g, ""), snapshot(word, 0, { mono: true }).text.replace(/\s/g, ""));
  assert.equal(still({ emitter: { text: Surface.from("xy\nz") } }).toString().replace(/\s/g, ""), "xyz");
});

test("a loop only when the piece can repeat: a start, or a point or a wind that doesn't, turn it off, or throw when asked for", () => {
  const sys: System = { emitter: "center", rate: 5, life: 1, speed: 0 };
  const wandering: System = { ...sys, emitter: { point: (t) => [t % 40, 2] } };
  // Left to the default, a piece that can't repeat has no loop.
  assert.equal(particles({}, { ...sys, start: 1 }).meta.loop, undefined);
  assert.equal(particles({}, wandering).meta.loop, undefined);
  assert.equal(particles({}, { ...sys, wind: (t) => t }).meta.loop, undefined);
  // Asked for, it throws, saying what stops it.
  assert.throws(() => particles({ period: 4 }, { ...sys, start: 1 }), /ascii\.rest: particles\(\) can't repeat every 4 seconds as period asks: it has a start, and nothing comes before it\. Change that, or give period: 0/);
  assert.throws(() => particles({ period: 8 }, [sys, wandering]), /particles\(\) \(system 2\) can't repeat every 8 seconds as period asks: its emitter\.point is at \[0,2\] at 0 s but \[8,2\] at 8 s/);
  assert.throws(() => particles({ period: 8 }, { ...sys, wind: (t) => t }), /its wind is 0 at 0 s but 8 at 8 s/);
  // A point and a wind that repeat with it keep the loop, and the piece repeats exactly.
  const round = particles({}, { ...sys, emitter: { point: (t) => [20 + 10 * Math.cos((TAU * t) / 8), 12] }, wind: (t) => Math.sin((TAU * t) / 4) });
  assert.equal(round.meta.loop, 8);
  for (const t of [0.4, 3.3]) assert.equal(snapshot(round, t + 8).text, snapshot(round, t).text);
  // A wind added up over a period that isn't a whole number of thirtieths of a second still repeats exactly.
  const snow = particles({ period: 4.33 }, "snow");
  for (const t of [0.1, 1.7, 3.2]) {
    const a = snapshot(snow, t), b = snapshot(snow, t + 3 * 4.33);
    assert.equal(b.text, a.text);
    assert.deepEqual(b.color, a.color);
  }
  // A period can make bursts come more often than `every` says, so what stays alive is checked with it.
  assert.throws(() => particles({ period: 2 }, { emitter: "center", burst: { every: Infinity, count: 15000 }, life: 100 }), /would keep 765000 particles alive at once, repeating every 2 seconds, past the 20000/);
});

test("the new tools keep a frame to t alone, and quick: bounces with trails, holds, paths and text", () => {
  const pieces = [
    particles({ name: "balls" }, {
      emitter: { area: { x: 2, y: 1, cols: 60, rows: 4 } }, rate: 20, life: 10, speed: [3, 12], direction: "down", spread: 120,
      gravity: 30, drag: 0.3, bounds: "bounce", bounciness: 0.8, trail: 0.3, glyphs: "o",
    }),
    particles({ name: "crumble", period: 6 }, {
      emitter: { text: banner("ascii", { effect: "still" }) }, burst: { every: 6 }, hold: [0.5, 2.5], speed: [0, 2], gravity: 14, life: 6,
      floor: 23, bounds: { x: "die", y: "bounce" }, bounciness: 0.2,
    }),
    particles({ name: "spiral" }, {
      emitter: "center", rate: 60, life: 4, speed: 4,
      path: (p) => [p.x0 + p.speed * p.age * Math.cos(p.angle + p.age), p.y0 + (p.speed * p.age * Math.sin(p.angle + p.age)) / 2],
    }),
    particles({ name: "falling" }, [{ emitter: "top", glyphs: "*" }, { emitter: "left", wind: 2, colors: ["#ff0000", "#0000ff"] }]),
    particles({ name: "sparkle", back: WORD }, { emitter: { text: WORD }, direction: "up", spread: 50, colors: ["#fffbeb", "#f59e0b"] }),
  ];
  for (const p of pieces) {
    contract(p);
    const frame = p.default();
    frame(5);
    frame(3.3);
    assert.equal(frame(1), snapshot(p, 1).text, p.meta.name);
    for (let i = 0; i < 20; i++) frame(i / 30);
    const start = performance.now();
    for (let i = 0; i < 120; i++) frame(5 + i / 30);
    const ms = (performance.now() - start) / 120;
    assert.ok(ms < 4 * slack, `${p.meta.name}: ${ms.toFixed(2)} ms a frame`);
  }
});

test("drag as small as you like keeps the closed form exact", () => {
  // The plain formula loses every digit to rounding by drag 1e-9 (a particle 280 rows from where it should be), so a
  // drag this small must give the path with none.
  for (const drag of [1e-15, 1e-12, 1e-9, 1e-7, 1e-5]) {
    const fall = follow(one({ gravity: 20, drag }), 1)!;
    assert.ok(Math.abs(fall.y - 10) < 1e-3 && Math.abs(fall.vy - 20) < 1e-3, `drag ${drag}: row ${fall.y}, ${fall.vy} cells a second`);
    const thrown = follow(one({ speed: 10, drag }), 1)!;
    assert.ok(Math.abs(thrown.x - 20) < 1e-3, `drag ${drag}: column ${thrown.x}`);
    // Thrown up from 8 cells down at 20 cells a second under gravity 20, the top of its arc is 2 cells above the grid,
    // so with "die" it is gone, though where it is now is inside.
    const up = one({ emitter: { point: [10, 4] }, speed: 20, angle: -TAU / 4, gravity: 20, drag, bounds: "die" });
    assert.equal(follow(up, 1.8), undefined, `drag ${drag}: past the top`);
    assert.ok(follow({ ...up, bounds: "none" }, 1.8)!.y > 2, `drag ${drag}: inside now`);
  }
});

test("from a side with no life, particles cross the whole grid, about as thick at any size", () => {
  const rows = (sys: System, cols: number, n: number, t = 30) => cells(drawn(sys, t, cols, n), "o").map(([, y]) => y);
  // What falls from the top reaches the bottom, and from the left the right.
  assert.ok(Math.max(...rows({ emitter: "top", glyphs: "o" }, 64, 24)) >= 21);
  assert.ok(Math.max(...cells(drawn({ emitter: "left", glyphs: "o" }, 30, 64, 24), "o").map(([x]) => x)) >= 58);
  // Gravity alone carries it across too; with neither speed nor gravity it can't, and keeps the usual life.
  assert.ok(Math.max(...rows({ emitter: "top", glyphs: "o", speed: 0, gravity: 10 }, 64, 24)) >= 21);
  const still = rows({ emitter: "top", glyphs: "o", speed: 0 }, 64, 24);
  assert.ok(still.every((y) => y === 0) && still.length > 10 && still.length <= 41, `${still.length} on the top row`);
  // About as thick at any size: twice the width and height, about four times as many.
  const small = rows({ emitter: "top", glyphs: "o" }, 64, 24).length, big = rows({ emitter: "top", glyphs: "o" }, 128, 48).length;
  assert.ok(small > 50 && small < 130 && big / small > 3 && big / small < 5, `${small} at 64 by 24, ${big} at 128 by 48`);
  // A life of your own is kept, and so is the usual rate with it: 1 s at 2 to 6 cells a second is 3 rows at most.
  const short = rows({ emitter: "top", glyphs: "o", life: 1 }, 64, 24);
  assert.ok(short.every((y) => y <= 3) && short.length > 12, `${short.length}, down to row ${Math.max(...short)}`);
  // In a region, it crosses the region.
  const s = new Surface(40, 20);
  drawParticles(s, { emitter: "top", glyphs: "o" }, 30, { region: { x: 5, y: 4, cols: 20, rows: 8 } });
  const inside = cells(s, "o");
  assert.ok(inside.every(([x, y]) => x >= 5 && x < 25 && y >= 4 && y < 12) && inside.some(([, y]) => y >= 10));
  // Fitted when the piece is made, so too many alive throws then: a minute's life at a thousand a second.
  assert.throws(() => particles({}, { emitter: "top", rate: 1000, speed: 0.5 }), /would keep 60000 particles alive at once/);
});

test("text: a rate sends sparks off it; a burst with no life lives a second or two after its hold", () => {
  const sparks = drawn({ emitter: { text: "AB" }, rate: 50, speed: 0, life: 1 }, 3, 10, 3);
  assert.equal(cells(sparks, "A").length + cells(sparks, "B").length, 0);
  assert.ok(cells(sparks, "*").length > 0, sparks.toString());
  // As letters, when asked.
  assert.ok(cells(drawn({ emitter: { text: "AB" }, rate: 50, speed: 0, life: 1, glyph: (p) => p.char }, 3, 10, 3), "A").length > 0);
  // Any hold: the life left to its default counts on from the longest.
  const held = { emitter: { point: [10, 5] }, burst: { every: Infinity, count: 1 }, speed: 0, glyphs: "o", hold: 2 } satisfies System;
  assert.equal(cells(drawn(held, 2.9), "o").length, 1);
  assert.equal(cells(drawn(held, 4.01), "o").length, 0);
});

test("a picture from a piece or a grid, in its own colours, where an emitter of it puts its particles", () => {
  // A grid in two colours sits in the middle, its colours kept.
  const surf = Surface.from("ab\ncd", [0, 1, 1, 0], new Palette(["#ff0000", "#00ff00"]));
  const p = particles({ cols: 6, rows: 4, back: surf }, []);
  const { text, color } = snapshot(p, 0);
  assert.equal(text, "      \n  ab  \n  cd  \n      ");
  const at = (x: number, y: number) => p.meta.palette![color![y * 6 + x]];
  assert.deepEqual([at(2, 1), at(3, 1), at(2, 2), at(3, 2)], ["#ff0000", "#00ff00", "#00ff00", "#ff0000"]);
  // A banner in a colour for each theme keeps them, on paper and on a dark page.
  const word = banner("hi", { effect: "still", shadow: "none", color: { light: "#aa0000", dark: "#ffaaaa" } });
  const q = particles({ cols: 40, rows: 9, back: word }, []);
  for (const [paper, want] of [[true, "#aa0000"], [false, "#ffaaaa"]] as const) {
    const shot = snapshot(q, 0, { paper });
    const flat = shot.text.replace(/\n/g, "");
    assert.equal(flat.replace(/\s/g, ""), snapshot(word, 0, { mono: true }).text.replace(/\s/g, ""));
    for (let i = 0; i < flat.length; i++) if (flat[i] !== " ") assert.equal(q.meta.palette![shot.color![i]], want, `paper ${paper}`);
  }
  // The picture and an emitter of the same piece line up: a burst drawing "#" on each character covers it exactly.
  const covered = snapshot(particles({ back: WORD }, { emitter: { text: WORD }, burst: { every: Infinity }, speed: 0, life: 99, glyphs: "#" }), 1, { mono: true }).text;
  assert.equal(covered.replace(/[\s#]/g, ""), "");
  assert.equal(covered.replace(/[^#]/g, "").length, snapshot(WORD, 0, { mono: true }).text.replace(/\s/g, "").length);
});

test("a picture in more colours than leave room keeps fewer of its own, rather than throwing", () => {
  // The fade's 30 or so colours, light and dark, and the sparks' 8 come to more than 64: the picture gives way.
  const own = new Set(WORD.meta.palette);
  const p = particles({ back: WORD }, { emitter: { text: WORD }, rate: 10, glyphs: " ", colors: { light: ["#b45309", "#fbbf24"], dark: ["#fffbeb", "#f59e0b"] } });
  assert.ok(p.meta.palette!.length <= 64, `${p.meta.palette!.length} colours`);
  for (const paper of [true, false]) {
    const { text, color } = snapshot(p, 1, { paper });
    const flat = text.replace(/\n/g, "");
    let shown = 0;
    for (let i = 0; i < flat.length; i++) if (flat[i] !== " ") assert.ok(own.has(p.meta.palette![color![i]]), `${p.meta.palette![color![i]]} is not the banner's`), shown++;
    assert.ok(shown > 50);
    // Still a fade: several of its colours, not one.
    assert.ok(new Set(Array.from(flat, (c, i) => (c === " " ? -1 : color![i]))).size > 6);
  }
});

test("a colour function needs a palette to pick from, and says so", () => {
  assert.throws(() => particles({}, { emitter: "center", color: () => 0 }), /ascii\.rest: particles\(\)\.color picks each particle's colour from the piece's palette, and it has none: give particles\(\) a palette/);
  assert.doesNotThrow(() => particles({ palette: ["#ff0000", "#00ff00"] }, { emitter: "center", color: () => 1 }));
});

test("fireworks fit a bigger sky: more sparks a shell, more shells across a wide one", () => {
  const burst = (cols: number, rows: number) => presets.fireworks({ cols, rows })[0].burst!;
  assert.deepEqual([burst(64, 24).every, burst(64, 24).count], [1.4, 40]);
  const wide = burst(120, 36);
  assert.equal(wide.count, 60);
  assert.ok(Math.abs(wide.every - 1.12) < 1e-9, `${wide.every}`);
  assert.equal(burst(320, 120).count, 80);
  assert.equal(presets.fireworks({ cols: 120, rows: 36 }, { every: 3, count: 9 })[0].burst!.every, 3);
});

test("a system is read once, the first time it is drawn: changing it after changes nothing", () => {
  const sys: System = { emitter: "center", rate: 10, speed: 0, glyphs: "a" };
  const before = drawn(sys, 1).toString();
  sys.glyphs = "b";
  assert.equal(drawn(sys, 1).toString(), before);
  assert.equal(drawn({ ...sys }, 1).toString(), before.replace(/a/g, "b"));
});
