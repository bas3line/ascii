// node --test src/kit/materials.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import type { Piece } from "../types.ts";
import { INK, isHex, snapshot } from "./core.ts";
import {
  area,
  ball,
  blob,
  bottle,
  box,
  bubbles,
  ceramic,
  cellsOf,
  cloud,
  cup,
  edgeChar,
  emit,
  fire,
  fish,
  flame,
  glass,
  gradientFill,
  grass,
  ground,
  heart,
  house,
  ice,
  inside,
  intersect,
  lamp,
  lava,
  leaf,
  material,
  metal,
  moon,
  mug,
  neon,
  palettes,
  pattern,
  patterns,
  picture,
  rain,
  sand,
  shape,
  sky,
  smoke,
  snow,
  solid,
  sparks,
  star,
  starfield,
  steam,
  straw,
  subtract,
  union,
  water,
  waterGlass,
  wood,
  type Area,
  type Material,
} from "./materials.ts";
import * as aquarium from "../../examples/kit/materials-aquarium.ts";
import * as candle from "../../examples/kit/materials-candle.ts";
import * as coffee from "../../examples/kit/materials-coffee.ts";
import * as cola from "../../examples/kit/materials-cola.ts";
import * as glassOfWater from "../../examples/kit/materials-glass.ts";
import * as houseAtNight from "../../examples/kit/materials-house.ts";
import * as lavaLamp from "../../examples/kit/materials-lava-lamp.ts";

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette, on both
// pages, in colour and in one ink.
function contract(p: Piece, times = [0, 0.5, 1, 2.5]) {
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

// A picture's frame as lines.
const lines = (p: Piece, t = 0, o: { paper?: boolean; mono?: boolean } = {}) => snapshot(p, t, o).text.split("\n");
// The cells of a frame that are not spaces, as "x,y".
const drawn = (p: Piece, t = 0) => {
  const out = new Set<string>();
  lines(p, t).forEach((l, y) => [...l].forEach((ch, x) => ch !== " " && out.add(`${x},${y}`)));
  return out;
};
const count = (a: Area, cols: number, rows: number) => cellsOf(a, cols, rows).list.length;

// Frames a whole period apart are the same, but for at most a few cells where floating point rounds t / period the
// other way right at the edge of a band (fract(9.7 / 4) is not quite fract(1.7 / 4)).
function sameAfterPeriod(a: { text: string; color: Uint8Array | null }, b: { text: string; color: Uint8Array | null }, what: string) {
  let differ = 0;
  for (let i = 0; i < a.text.length; i++) if (a.text[i] !== b.text[i] || (a.color && b.color && a.color[i] !== b.color[i])) differ++;
  assert.equal(a.text.length, b.text.length, what);
  assert.ok(differ <= 3, `${what}: ${differ} cells differ`);
}

test("every named palette has colours for both pages", () => {
  for (const [name, p] of Object.entries(palettes)) {
    assert.ok(p.light.length && p.dark.length, name);
    for (const c of [...p.light, ...p.dark]) assert.ok(isHex(c), `${name}: ${c}`);
  }
});

test("area.rect covers exactly its cells; rounded cuts its corners; circle and ellipse come out round", () => {
  const r = cellsOf(area.rect(2, 1, 5, 3), 10, 6);
  assert.equal(r.list.length, 15);
  assert.deepEqual([r.x0, r.y0, r.x1, r.y1], [2, 1, 7, 4]);
  const rounded = count(area.rounded(0, 0, 12, 6, 2), 12, 6);
  assert.ok(rounded < 72 && rounded > 50, `rounded ${rounded}`);
  // a circle of radius 8 columns spans 16 columns and 8 rows: round on cells twice as tall as wide
  const c = cellsOf(area.circle(10, 5, 8), 20, 10);
  assert.ok(Math.abs(c.x1 - c.x0 - 16) <= 1 && Math.abs(c.y1 - c.y0 - 8) <= 1, `${c.x1 - c.x0} by ${c.y1 - c.y0}`);
  assert.ok(cellsOf(area.ellipse(10, 5, 4, 2), 20, 10).inside[5 * 20 + 10]);
  assert.equal(area.rect(1, 2, 3, 4).extent?.cols, 4);
  assert.throws(() => area.rect(0, 0, 0, 3), /ascii\.rest: area\.rect takes cols above 0, not 0/);
  assert.throws(() => area.circle(0, 0, Number.NaN), /area\.circle takes a number for r, not NaN/);
});

test("area.polygon fills by the even-odd rule, and area.path is one column wide on each row", () => {
  const tri = count(area.polygon([[0, 0], [10, 0], [0, 10]]), 12, 12);
  assert.ok(Math.abs(tri - 50) <= 6, `triangle ${tri}`);
  const p = cellsOf(area.path([[5.5, 0], [5.5, 9]], 1), 12, 10);
  for (let y = 0; y < 9; y++) assert.equal(p.left[y], p.right[y], `row ${y}`);
  assert.throws(() => area.polygon([[0, 0], [1, 1]]), /area\.polygon takes a list of 3 or more points/);
  assert.throws(() => area.path([[0, 0]]), /area\.path takes a list of 2 or more points/);
});

test("area.text: a cell for each character, which solid draws; big letters of 3 by 5 pixels, 2 by 1 cells each", () => {
  const p = picture([shape(area.text("HI"), solid())], { cols: 6, rows: 3 });
  assert.deepEqual(lines(p), ["      ", "  HI  ", "      "]);
  // I is "###|.#.|.#.|.#.|###": nine pixels, each two cells
  const big = cellsOf(area.text("I", { big: true }), 20, 7);
  assert.equal(big.list.length, 18);
  assert.equal(big.y1 - big.y0, 5);
  assert.throws(() => area.text(""), /area\.text takes a string of printable characters/);
  assert.throws(() => area.text("x", { big: 1.5 }), /area\.text\.big takes true or a whole number/);
});

test("area.where and area.all; sky() and ground()", () => {
  assert.equal(count(area.where((x) => x < 3), 10, 4), 12);
  const all = cellsOf(area.all(), 7, 3);
  assert.equal(all.list.length, 21);
  // an area that runs off every side has no edge at the picture's sides
  assert.equal(all.border.reduce((a, b) => a + b, 0), 0);
  assert.equal(count(sky(), 5, 5), 25);
  const g = cellsOf(ground({ rows: 3 }), 10, 8);
  assert.equal(g.list.length, 30);
  assert.equal(g.y0, 5);
  assert.equal(cellsOf(ground(), 10, 20).y1 - cellsOf(ground(), 10, 20).y0, 4);
  assert.throws(() => area.where(5 as never), /area\.where takes a function/);
});

test("union, subtract and intersect", () => {
  const a = area.rect(0, 0, 4, 2), b = area.rect(2, 0, 4, 2);
  assert.equal(count(union(a, b), 8, 2), 12);
  assert.equal(count(intersect(a, b), 8, 2), 4);
  assert.equal(count(subtract(a, b), 8, 2), 4);
  assert.throws(() => union(), /union takes one or more areas/);
  assert.throws(() => subtract(a, 3 as never), /subtract's area 2 takes an area/);
});

test("inside fills a vessel's room to a level, inside its walls", () => {
  const tumbler = cup({ rows: 10, at: "center" });
  const outer = cellsOf(tumbler, 30, 12);
  const room = cellsOf(inside(tumbler), 30, 12);
  assert.ok(room.list.length > 40);
  // in the cup and off its walls and base: an edge cell only along the open top
  for (const i of room.list) assert.ok(outer.inside[i] && (!outer.border[i] || Math.floor(i / 30) === outer.top[i % 30]), "inside the cup, off its walls");
  const counts = (["low", "half", "high", "full", "brim"] as const).map((fill) => count(inside(tumbler, { fill }), 30, 12));
  for (let k = 1; k < counts.length; k++) assert.ok(counts[k] >= counts[k - 1], `${counts}`);
  assert.equal(count(inside(tumbler, { fill: 0 }), 30, 12), 0);
  const half = inside(tumbler, { fill: "half" }).place(30, 12);
  assert.ok(half.level !== undefined && half.room !== undefined);
  // any area: taken in by a column at the sides and a row at the bottom
  assert.equal(count(inside(area.rect(0, 0, 6, 4)), 6, 4), 12);
  assert.throws(() => inside(tumbler, { fill: "lots" as never }), /inside's fill takes "low", "half", "high", "full" and "brim"/);
});

test("shapes are placed by anchor words, sizes, within, on and offsets, and flip mirrors them", () => {
  const b = cellsOf(ball({ at: "bottom", rows: 6 }), 40, 20);
  assert.equal(b.y1, 20);
  assert.ok(Math.abs((b.x0 + b.x1) / 2 - 20) <= 1);
  const tl = cellsOf(ball({ at: "top-left", rows: 4 }), 40, 20);
  assert.deepEqual([tl.x0, tl.y0], [0, 0]);
  const heights = (["tiny", "small", "medium", "large", "huge"] as const).map((size) => {
    const c = cellsOf(ball({ size }), 80, 20);
    return c.y1 - c.y0;
  });
  for (let k = 1; k < heights.length; k++) assert.ok(heights[k] > heights[k - 1], `${heights}`);
  const sq = cellsOf(box({ cols: 10, at: "top-left" }), 40, 20);
  assert.deepEqual([sq.x1 - sq.x0, sq.y1 - sq.y0], [10, 5]);
  const base = box({ at: "bottom", cols: 6, rows: 4 });
  const f = cellsOf(flame({ on: base, rows: 3 }), 20, 10);
  assert.equal(f.bottom.reduce((m, v) => Math.max(m, v), -1), 5, "the flame's last row sits on the box's first, row 6");
  const w = cellsOf(ball({ within: area.rect(10, 5, 10, 6), at: "top-left", rows: 2 }), 40, 20);
  assert.ok(w.x0 >= 10 && w.y0 >= 5);
  const moved = cellsOf(box({ at: "top-left", cols: 4, rows: 2, x: 3, y: 2 }), 20, 10);
  assert.deepEqual([moved.x0, moved.y0], [3, 2]);
  // flipped, a fish's cells are its own mirrored about the middle of its box
  const box6 = fish({ rows: 6 }).place(40, 10);
  const right = cellsOf(fish({ rows: 6 }), 40, 10), left = cellsOf(fish({ rows: 6, flip: true }), 40, 10);
  for (let y = 0; y < 10; y++)
    for (let x = box6.x0; x < box6.x1; x++) assert.equal(right.inside[y * 40 + x], left.inside[y * 40 + (box6.x0 + box6.x1 - 1 - x)], `${x},${y}`);
  assert.throws(() => ball({ at: "middle" as never }), /ascii\.rest: ball\.at takes "top-left", "top"/);
  assert.throws(() => ball({ size: 2 }), /ball\.size takes "tiny"/);
  assert.throws(() => ball({ colour: "red" } as never), /ball\(\) has no option "colour"/);
  assert.throws(() => ball({ on: 3 as never }), /ball\.on takes an area/);
});

test("every shape fills, and the ones with parts have them", () => {
  const tumbler = cup();
  const all: Record<string, Area> = {
    cup: tumbler, mug: mug(), bottle: bottle(), straw: straw({ within: tumbler }), box: box(), ball: ball(), blob: blob(),
    cloud: cloud(), flame: flame(), leaf: leaf(), heart: heart(), star: star(), moon: moon(), fish: fish(), house: house(), lamp: lamp(),
  };
  for (const [name, a] of Object.entries(all)) assert.ok(count(a, 48, 20) > 8, name);
  const h = house();
  const whole = cellsOf(h, 48, 20);
  for (const part of [h.walls, h.roof, h.chimney, h.door, h.windows]) {
    const c = cellsOf(part, 48, 20);
    assert.ok(c.list.length > 0);
    for (const i of c.list) if (part !== h.door && part !== h.windows) assert.ok(whole.inside[i]);
  }
  const l = lamp();
  for (const part of [l.cap, l.globe, l.base]) assert.ok(count(part, 48, 20) > 0);
  assert.ok(cellsOf(mug(), 48, 20).cavity, "a mug is a vessel");
  assert.equal(mug().pieces?.length, 2);
  assert.ok(cellsOf(fish({ rows: 6 }), 40, 10).char, "a fish has an eye");
  assert.throws(() => cup({ taper: 2 }), /cup\.taper takes a number from 0 to 0\.6, not 2/);
  assert.throws(() => star({ points: 4.5 }), /star\.points takes a whole number from 3 to 24, not 4\.5/);
  assert.throws(() => star({ points: 2 }), /star\.points takes a number from 3 to 24, not 2/);
});

test("cellsOf: the edge, the depth, the extents and has()", () => {
  const c = cellsOf(area.rect(2, 2, 6, 4), 10, 8);
  assert.equal(c.border.reduce((a, b) => a + b, 0), 16);
  assert.equal(c.depth[2 * 10 + 2], 0);
  assert.ok(c.depth[3 * 10 + 4] > 0);
  assert.equal(c.maxDepth, Math.max(...Array.from(c.list, (i) => c.depth[i])));
  assert.deepEqual([c.top[2], c.bottom[2], c.left[3], c.right[3]], [2, 5, 2, 7]);
  assert.equal(c.has(2, 2), true);
  assert.equal(c.has(1, 2), false);
  assert.equal(cellsOf(area.all(), 4, 4).has(-1, 0), true, "a cell past the picture is in for an area that runs off it");
  assert.equal(cellsOf(area.all(), 4, 4).has(-2, 0), false);
  // an area wholly off the picture has no cells, and nothing breaks
  const off = cellsOf(area.rect(50, 50, 3, 3), 10, 8);
  assert.equal(off.list.length, 0);
  assert.equal(off.x1, 0);
});

test("edgeChar outlines a box as .--. over |  | over |__|, and a stroke a cell thick closes with '", () => {
  const p = picture([shape(area.rect(1, 1, 6, 4), solid({ char: " ", edge: true }))], { cols: 8, rows: 6 });
  assert.deepEqual(lines(p), ["        ", " .----. ", " |    | ", " |    | ", " |____| ", "        "]);
  const c = cellsOf(area.rect(0, 0, 4, 1), 4, 3);
  assert.equal(edgeChar(c, 1), "-");
  const handle = picture([shape(mug({ rows: 10, at: "center" }))], { cols: 30, rows: 12 });
  const text = lines(handle).join("\n");
  assert.match(text, /\|---\./);
  assert.match(text, /\|---'/);
});

test("outline: a shallow slope reads _.- through cells just outside it", () => {
  const roof = cellsOf(area.polygon([[0, 6], [20, 0], [40, 6]]), 40, 8);
  const o = roof.outline();
  const outside = Array.from(o.cells).filter((i) => !roof.inside[i]);
  assert.ok(outside.length > 4, "the slope has a fringe");
  for (const i of outside) assert.ok(roof.fringe[i]);
  const chars = new Set(Array.from(o.chars, (c) => String.fromCharCode(c)));
  assert.ok(chars.has("_") || chars.has("."));
  // a flat edge has none
  assert.equal(Array.from(cellsOf(area.rect(0, 1.5, 10, 3), 10, 6).outline().cells).filter((i) => !cellsOf(area.rect(0, 1.5, 10, 3), 10, 6).inside[i]).length, 0);
});

// Every material, by name, with a period where it has one.
const materials: [string, () => Material][] = [
  ["water", () => water()], ["glass", () => glass()], ["fire", () => fire()], ["smoke", () => smoke()], ["cloud", () => cloud()],
  ["metal", () => metal()], ["wood", () => wood()], ["wood rings", () => wood({ grain: "rings" })], ["wood planks", () => wood({ grain: "planks" })],
  ["grass", () => grass()], ["seaweed", () => grass({ kind: "seaweed" })], ["reeds", () => grass({ kind: "reeds" })], ["sand", () => sand()],
  ["lava", () => lava()], ["ice", () => ice()], ["solid", () => solid()], ["gradient", () => gradientFill()], ["bricks", () => pattern("bricks")],
  ["ceramic", () => ceramic()], ["starfield", () => starfield({ density: 0.3 })], ["material", () => material((c) => (c.x % 2 ? "#" : ""))],
];

test("every material draws in its area and nowhere else but its outline, and it works on both pages and in one ink", () => {
  const where = ball({ rows: 10, at: "center" });
  const c = cellsOf(where, 40, 14);
  const allowed = new Set([...Array.from(c.list), ...Array.from(c.outline().cells)].map((i) => `${i % 40},${Math.floor(i / 40)}`));
  for (const [name, make] of materials) {
    const p = picture([shape(where, make())], { cols: 40, rows: 14 });
    contract(p);
    let any = 0;
    for (const t of [0, 0.7, 1.9]) {
      const d = drawn(p, t);
      any += d.size;
      for (const cell of d) assert.ok(allowed.has(cell), `${name} drew outside its area at ${cell}`);
    }
    assert.ok(any > 0, `${name} drew nothing`);
  }
});

test("materials are deterministic and repeat on their period", () => {
  const where = box({ rows: 8, at: "center" });
  for (const [name, make] of materials) {
    const m = make();
    const p = picture([shape(where, m)], { cols: 30, rows: 10 });
    for (const t of [0.3, 1.7, 3.1]) {
      // the same t, the same frame, from the same player and from a fresh one
      assert.deepEqual(snapshot(p, t), snapshot(p, t), `${name} at ${t}`);
      const frame = p.default();
      assert.equal(frame(t), frame(t), `${name} at ${t}, played twice`);
      if (m.period) sameAfterPeriod(snapshot(p, t + m.period), snapshot(p, t), `${name} at ${t} and a period on`);
    }
  }
  assert.equal(wood().period, undefined);
  assert.equal(water().period, 4);
  assert.throws(() => water({ period: 0 }), /water\.period takes a number of seconds above 0, up to 60, not 0/);
});

test("water rests at its level, its waves move, and it bends what is behind it", () => {
  const tumbler = cup({ rows: 12, at: "center" });
  const drink = inside(tumbler, { fill: "half" });
  const still = picture([shape(drink, water({ waves: "still", texture: 0 }))], { cols: 30, rows: 14 });
  const level = Math.floor(drink.place(30, 14).level!);
  const rows = lines(still);
  assert.match(rows[level], /^ *~+ *$/, "a still surface is one line of ~");
  for (let y = 0; y < level; y++) assert.equal(rows[y].trim(), "", "nothing above the level");
  const gentle = picture([shape(drink, water())], { cols: 30, rows: 14 });
  assert.notDeepEqual(lines(gentle, 0), lines(gentle, 1));
  // a straight stick, drawn first, is shifted where it goes under the water
  const stick = area.path([[12.5, 0], [12.5, 14]], 1);
  const tank = area.rect(0, 6, 30, 8);
  const bent = lines(picture([shape(stick, solid({ char: "|" })), shape(tank, water({ waves: "still", texture: 0 }))], { cols: 30, rows: 14 }));
  const straight = lines(picture([shape(stick, solid({ char: "|" })), shape(tank, water({ waves: "still", texture: 0, bend: 0 }))], { cols: 30, rows: 14 }));
  assert.equal(bent[2].indexOf("|"), 12, "above the water it is where it is");
  assert.ok(bent.slice(8).some((l) => l.indexOf("|") !== 12 && l.includes("|")), "under the water it is bent");
  for (const l of straight.slice(8)) assert.equal(l.indexOf("|"), 12, "with bend 0 it is straight");
  assert.throws(() => water({ waves: "huge" as never }), /water\.waves takes "still", "gentle", "slosh" and "rough", not "huge"/);
  assert.throws(() => water({ wave: "gentle" } as never), /water\(\) has no option "wave"/);
});

test("glass is see-through: it draws its walls and leaves the room and the mouth open", () => {
  const backdrop = shape(area.all(), solid({ char: "#" }));
  const tumbler = cup({ rows: 10, at: "center" });
  const p = picture([backdrop, shape(tumbler, glass({ highlight: false }))], { cols: 30, rows: 12 });
  const c = cellsOf(tumbler, 30, 12);
  const text = lines(p);
  for (const i of c.cavity!.list) assert.equal(text[Math.floor(i / 30)][i % 30], "#", "the room shows what is behind");
  const pane = picture([backdrop, shape(area.rect(2, 2, 10, 6), glass({ highlight: false }))], { cols: 14, rows: 10 });
  assert.equal(lines(pane)[4][6], "#", "a pane shows what is behind it too");
  const streak = picture([shape(tumbler, glass())], { cols: 30, rows: 12 });
  assert.match(lines(streak).join(""), /'/, "the highlight streak");
});

test("fire is fiercest low down and in the middle", () => {
  const p = picture([shape(area.rect(0, 0, 24, 12), fire())], { cols: 24, rows: 12 });
  let low = 0, high = 0;
  for (const t of [0, 0.4, 0.8, 1.2, 1.6]) lines(p, t).forEach((l, y) => (y < 6 ? (high += l.replace(/[^#%@]/g, "").length) : (low += l.replace(/[^#%@]/g, "").length)));
  assert.ok(low > high * 2, `low ${low}, high ${high}`);
  assert.throws(() => fire({ heat: 5 }), /fire\.heat takes a number from 0\.2 to 2, not 5/);
});

test("neon glows round its area and keeps text's letters; it flickers once a period", () => {
  const sign = picture([shape(area.text("OPEN"), neon({ flicker: false }))], { cols: 12, rows: 5 });
  const text = lines(sign);
  assert.equal(text[2].trim().includes("OPEN"), true);
  assert.match(text[2], /:OPEN:/);
  const flicker = picture([shape(area.text("OPEN"), neon())], { cols: 12, rows: 5 });
  assert.notEqual(lines(flicker, 0.635 * 4)[2], lines(flicker, 0)[2]);
});

test("solid: one character, a ramp from the edge in, and the edge as an outline", () => {
  const where = area.rect(0, 0, 10, 5);
  assert.deepEqual(lines(picture([shape(where, solid({ char: "#" }))], { cols: 10, rows: 5 }))[2], "##########");
  const ramp = lines(picture([shape(where, solid({ char: ".:#" }))], { cols: 10, rows: 5 }));
  assert.equal(ramp[0][0], ".");
  assert.equal(ramp[2][5], "#");
  assert.throws(() => solid({ colors: ["red"] }), /solid\.colors takes colours as #rrggbb/);
  assert.throws(() => solid({ colors: "nope" as never }), /solid\.colors takes a palette's name/);
});

test("pattern repeats its tile and scrolls one tile a period", () => {
  const p = picture([shape(area.rect(0, 0, 8, 2), pattern("bricks"))], { cols: 8, rows: 2 });
  assert.deepEqual(lines(p), ["___|___|", "_|___|__"]);
  const own = picture([shape(area.rect(0, 0, 4, 1), pattern(["ab"], { move: "left", period: 2 }))], { cols: 4, rows: 1 });
  assert.equal(lines(own, 0)[0], "abab");
  assert.equal(lines(own, 1)[0], "baba");
  assert.ok(Object.keys(patterns).length >= 10);
  assert.throws(() => pattern("plaid" as never), /pattern takes a name, one of bricks/);
});

test("material() runs your function on every cell, with its colours by index", () => {
  const checks = material((c, t) => ((c.x + c.y + Math.floor(t)) % 2 ? ["#", 1] : "."), { colors: ["#ff0000", "#00ff00"], period: 2 });
  const p = picture([shape(area.rect(0, 0, 4, 2), checks)], { cols: 4, rows: 2 });
  assert.deepEqual(lines(p, 0), [".#.#", "#.#."]);
  assert.deepEqual(lines(p, 1), ["#.#.", ".#.#"]);
  const { color } = snapshot(p, 0);
  assert.ok(color && p.meta.palette![color[1]] === "#00ff00" && p.meta.palette![color[0]] === "#ff0000");
  const bad = picture([shape(area.rect(0, 0, 2, 1), material(() => "\n"))], { cols: 2, rows: 1 });
  assert.throws(() => snapshot(bad, 0), /material drew "\\n": a cell takes one printable character/);
  assert.throws(() => material(3 as never), /material takes a function/);
});

test("bubbles are born along the bottom of their liquid, rise and stay in it", () => {
  const drink = area.rect(5, 2, 10, 8);
  const p = picture([emit(bubbles({ rate: 10 }), { inside: drink })], { cols: 20, rows: 12 });
  contract(p);
  let seen = 0;
  for (const t of [0, 0.5, 1, 1.5]) for (const cell of drawn(p, t)) {
    const [x, y] = cell.split(",").map(Number);
    assert.ok(x >= 5 && x < 15 && y >= 2 && y < 10, `a bubble out of its liquid at ${cell}`);
    seen++;
  }
  assert.ok(seen > 5);
});

test("smoke and steam rise above where they come from; rain and snow fall below; sparks fly off", () => {
  const block = box({ at: "bottom", cols: 6, rows: 3 });
  const above = (p: Piece, top: number) => {
    for (const t of [0, 1, 2]) for (const cell of drawn(p, t)) assert.ok(Number(cell.split(",")[1]) < top, `${cell} is not above row ${top}`);
  };
  const smoky = picture([emit(smoke(), { from: block })], { cols: 30, rows: 16 });
  above(smoky, 13);
  assert.ok(drawn(smoky, 1).size > 3);
  assert.match(lines(smoky, 1).join(""), /[()]/);
  above(picture([emit(steam(), { from: block })], { cols: 30, rows: 16 }), 13);
  const cloudy = cloud({ at: "top", rows: 3 });
  const wet = picture([emit(rain(), { from: cloudy })], { cols: 40, rows: 16 });
  for (const t of [0, 1]) for (const cell of drawn(wet, t)) assert.ok(Number(cell.split(",")[1]) >= 3, `rain at ${cell}`);
  assert.ok(drawn(wet, 1).size > 5);
  assert.ok(drawn(picture([emit(snow())], { cols: 40, rows: 16 }), 3).size > 5);
  assert.ok(drawn(picture([emit(sparks(), { from: block })], { cols: 30, rows: 16 }), 1).size > 2);
  // from a point and from an anchor word
  assert.ok(drawn(picture([emit(smoke(), { from: [10, 15] })], { cols: 20, rows: 16 }), 1).size > 3);
  assert.ok(drawn(picture([emit(steam(), { from: "bottom" })], { cols: 20, rows: 16 }), 1).size > 1);
});

test("emissions are deterministic and repeat on their period", () => {
  const block = box({ at: "bottom", cols: 6, rows: 3 });
  for (const [name, e] of [["bubbles", bubbles()], ["smoke", smoke()], ["steam", steam()], ["sparks", sparks()], ["rain", rain()], ["snow", snow()]] as const) {
    const p = picture([emit(e, name === "bubbles" ? { inside: area.rect(2, 2, 20, 10) } : { from: block })], { cols: 30, rows: 16 });
    // drawing t = 5 first and then 1 gives what drawing 1 fresh does: nothing carries over between frames
    const frame = p.default();
    frame(5);
    assert.equal(frame(1), p.default()(1), name);
    for (const t of [0.2, 1.3]) {
      assert.deepEqual(snapshot(p, t), snapshot(p, t), name);
      sameAfterPeriod(snapshot(p, t + e.period!), snapshot(p, t), `${name} a period on`);
    }
  }
  assert.throws(() => emit(water() as never), /emit takes an emission first/);
  assert.throws(() => emit(bubbles(), { from: "middle" as never }), /emit's from takes an area, an anchor word/);
  assert.throws(() => emit(bubbles(), { inside: 3 as never }), /emit's inside takes an area/);
  assert.throws(() => bubbles({ rate: -1 }), /bubbles\.rate takes a number from 0 to 200, not -1/);
});

test("shape(): a shape's own material, its options second, and moving as a whole", () => {
  // a flame burns by default, a cup is glass
  assert.equal((shape(flame()).what as Material).name, "fire");
  assert.equal((shape(cup()).what as Material).name, "glass");
  assert.equal((shape(area.rect(0, 0, 2, 2)).what as Material).name, "solid");
  // bob: a row down a quarter of the way round, a row up at three quarters
  const p = picture([shape(box({ cols: 4, rows: 2, at: "center" }), solid({ char: "#" }), { move: "bob", period: 4 })], { cols: 10, rows: 6 });
  const top = (t: number) => lines(p, t).findIndex((l) => l.includes("#"));
  assert.equal(top(1) - top(3), 2);
  assert.equal(p.meta.loop, 4);
  // swim: the fish's eye is on the side it is going
  const sea = area.rect(0, 0, 60, 8);
  const swim = picture([shape(fish({ within: sea, rows: 6 }), { move: "swim", period: 4 })], { cols: 60, rows: 8 });
  const eye = (t: number) => {
    const l = lines(swim, t).find((r) => r.includes("o"))!;
    const body = l.replace(/ +$/, "");
    return l.indexOf("o") - (body.length - body.trimStart().length);
  };
  assert.ok(eye(0.5) > eye(2.5), "facing right going right, left going left");
  // drift: right across and round again
  const d = picture([shape(box({ cols: 4, rows: 2, at: "left" }), solid({ char: "#" }), { move: "drift", period: 10 })], { cols: 20, rows: 4 });
  const left = (t: number) => lines(d, t).find((l) => l.includes("#"))!.indexOf("#");
  assert.ok(left(2) > left(0));
  assert.throws(() => shape(3 as never), /shape takes an area/);
  assert.throws(() => shape(cup(), 5 as never), /shape takes a material second/);
  assert.throws(() => shape(cup(), glass(), { move: "spin" as never }), /shape's move takes "none", "bob"/);
});

test("picture(): its size, its palette, its loop, a still, and its errors", () => {
  assert.deepEqual([picture([shape(ball(), solid())]).meta.cols, picture([shape(ball(), solid())]).meta.rows], [64, 24]);
  const fixed = picture([shape(area.rect(0, 0, 10, 4), solid())]);
  assert.deepEqual([fixed.meta.cols, fixed.meta.rows], [10, 4]);
  assert.deepEqual([picture([shape(ball(), solid())], { cols: 20, rows: 9 }).meta.cols, 20][0], 20);
  // a palette for each page, the ink first
  const p = picture([shape(cup(), glass()), shape(inside(cup()), water())], { cols: 30, rows: 12 });
  const pal = p.meta.palette!;
  assert.equal(pal.length % 2, 0);
  assert.equal(pal[0], INK.light);
  assert.equal(pal[pal.length / 2], INK.dark);
  // on paper, colours from the light half; on a dark page, the dark half; in one ink, none
  const n = pal.length / 2;
  for (const c of snapshot(p, 1, { paper: true }).color!) assert.ok(c < n);
  for (const c of snapshot(p, 1).color!) assert.ok(c >= n);
  assert.equal(snapshot(p, 1, { mono: true }).color, null);
  assert.equal(snapshot(p, 1, { mono: true }).text, snapshot(p, 1).text);
  // the loop: the least common multiple of the periods, when a minute or less
  assert.equal(picture([shape(area.all(), water()), shape(ball(), solid(), { move: "bob", period: 3 })]).meta.loop, 12);
  assert.equal(picture([shape(area.all(), water({ period: 7 })), shape(ball(), solid(), { move: "bob", period: 9.13 })]).meta.loop, undefined);
  const still = picture([shape(area.all(), wood())]);
  assert.equal(still.meta.fps, 0);
  assert.equal(still.meta.loop, undefined);
  assert.equal(p.meta.category, "scenes");
  assert.throws(() => picture([]), /picture takes a list of one or more parts/);
  assert.throws(() => picture([{} as never]), /picture's part 1 is not a part/);
  const many = Array.from({ length: 12 }, (_, k) => shape(area.rect(k, 0, 1, 1), solid({ colors: [`#0000${(k + 16).toString(16)}`, `#00${(k + 16).toString(16)}00`, `#${(k + 16).toString(16)}0000`] })));
  assert.throws(() => picture(many), /colours for each page between them, past the 32 a picture can have/);
});

test("every example is a normal piece: the frame contract, the same frame for the same t, a loop, and an SVG", () => {
  for (const [name, mod] of Object.entries({ aquarium, candle, coffee, cola, glassOfWater, houseAtNight, lavaLamp })) {
    const p = mod.default;
    contract(p);
    const loop = p.meta.loop;
    assert.ok(loop && loop <= 60, `${name} loops`);
    for (const t of [0.3, 1.7]) {
      assert.deepEqual(snapshot(p, t), snapshot(p, t), `${name} at ${t}`);
      sameAfterPeriod(snapshot(p, t + loop!), snapshot(p, t), `${name} at ${t} and a loop on`);
    }
    // the loop's seam: its last frame as svg() samples it runs on into its first
    sameAfterPeriod(snapshot(p, loop!), snapshot(p, 0), `${name}: its end is its start`);
    assert.match(svg(p), /^<svg/, `${name} exports to SVG`);
  }
});

test("waterGlass(): the preset is a picture of the same parts anyone can use", () => {
  const p = waterGlass();
  contract(p);
  assert.equal(p.meta.name, "glass of water");
  assert.deepEqual([p.meta.cols, p.meta.rows], [32, 16]);
  assert.match(lines(p, 1).join("\n"), /~/);
  const cola = waterGlass({ colors: "cola", fill: "high", cols: 40, rows: 20 });
  assert.deepEqual([cola.meta.cols, cola.meta.rows], [40, 20]);
  assert.notDeepEqual(cola.meta.palette, p.meta.palette);
});

test("edge cases: a one-cell picture, a shape bigger than the picture, a room with nothing in it", () => {
  contract(picture([shape(area.all(), water())], { cols: 1, rows: 1 }));
  contract(picture([shape(ball({ rows: 40 }), fire())], { cols: 10, rows: 5 }));
  const empty = picture([shape(inside(area.rect(0, 0, 2, 2)), water()), emit(bubbles(), { inside: inside(area.rect(0, 0, 2, 2)) })], { cols: 4, rows: 4 });
  contract(empty);
  assert.deepEqual(lines(empty), ["    ", "    ", "    ", "    "]);
});
