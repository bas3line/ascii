// node --test src/kit/materials.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import type { Piece } from "../types.ts";
import { INK, Surface, isHex, piece, snapshot } from "./core.ts";
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
  drawParts,
  edgeChar,
  emission,
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
  partsPalette,
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
  texture,
  union,
  water,
  waterGlass,
  wood,
  type Area,
  type Material,
} from "./materials.ts";
import * as rust from "../pieces/rust.ts";
import * as aquarium from "../../examples/kit/materials-aquarium.ts";
import * as candle from "../../examples/kit/materials-candle.ts";
import * as coffee from "../../examples/kit/materials-coffee.ts";
import * as cola from "../../examples/kit/materials-cola.ts";
import * as glassOfWater from "../../examples/kit/materials-glass.ts";
import * as houseAtNight from "../../examples/kit/materials-house.ts";
import * as lavaLamp from "../../examples/kit/materials-lava-lamp.ts";
import * as rocket from "../../examples/kit/materials-rocket.ts";
import * as tv from "../../examples/kit/materials-tv.ts";

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

// Frames a whole period apart are the same, character for character and colour for colour: each part's t is brought
// into its period before it draws, so floating point cannot round t / period the other way at the edge of a band
// (fract(9.7 / 4) is not quite fract(1.7 / 4)).
function sameAfterPeriod(a: { text: string; color: Uint8Array | null }, b: { text: string; color: Uint8Array | null }, what: string) {
  assert.equal(a.text, b.text, what);
  assert.deepEqual(a.color, b.color, `${what}: colours`);
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
  const ramp = lines(picture([shape(where, solid({ ramp: ".:#" }))], { cols: 10, rows: 5 }));
  assert.equal(ramp[0][0], ".");
  assert.equal(ramp[2][5], "#");
  // a ramp by name, as everywhere in the kit; one character is a char, more is a ramp
  assert.equal(lines(picture([shape(where, solid({ ramp: "blocks" }))], { cols: 10, rows: 5 }))[2][5], "█");
  assert.throws(() => solid({ char: ".:#" }), /solid\.char takes one printable character, not "\.:#"/);
  assert.throws(() => solid({ ramp: "x" }), /solid\.ramp takes a ramp's name, standard, detailed/);
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
  assert.throws(() => shape(ball(), house() as never), /shape takes a material second, not another area: give each area a shape\(\) of its own/);
  // cloud() and smoke() are materials too
  assert.equal((shape(ball(), cloud()).what as Material).name, "cloud");
  assert.equal((shape(ball(), smoke()).what as Material).name, "smoke");
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
  for (const [name, mod] of Object.entries({ aquarium, candle, coffee, cola, glassOfWater, houseAtNight, lavaLamp, rocket, tv })) {
    const p = mod.default;
    contract(p);
    // nothing carries over between frames, moving shapes included: t = 5 and then 1.3 gives what 1.3 fresh does
    const frame = p.default();
    frame(5);
    assert.equal(frame(1.3), p.default()(1.3), `${name}: a frame depends only on t`);
    for (const t of [0.3, 1.7]) assert.deepEqual(snapshot(p, t), snapshot(p, t), `${name} at ${t}`);
    assert.match(svg(p), /^<svg/, `${name} exports to SVG`);
    // the tv plays the donut, which does not loop, so neither does it; the rest loop
    if (mod === tv) {
      assert.equal(p.meta.loop, undefined);
      assert.equal(p.meta.fps, 24);
      continue;
    }
    const loop = p.meta.loop;
    assert.ok(loop && loop <= 60, `${name} loops`);
    for (const t of [0.3, 1.7]) sameAfterPeriod(snapshot(p, t + loop!), snapshot(p, t), `${name} at ${t} and a loop on`);
    // the loop's seam: its last frame as svg() samples it runs on into its first
    sameAfterPeriod(snapshot(p, loop!), snapshot(p, 0), `${name}: its end is its start`);
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
  assert.throws(() => waterGlass({ fil: "half" } as never), /waterGlass\(\) has no option "fil"/);
});

// The cell index of "x,y" in a picture `cols` wide.
const at = (cell: string, cols: number) => {
  const [x, y] = cell.split(",").map(Number);
  return y * cols + x;
};

test("an open vessel opens only at its mouth: a bottle's shoulders stay walls, outlined", () => {
  const where = bottle({ rows: 14, at: "center" });
  const b = cellsOf(where, 30, 16), cav = b.cavity!;
  // the room reaches the vessel's top row only in the neck, its mouth
  const mouth: number[] = [], body: number[] = [];
  for (let x = cav.x0; x < cav.x1; x++) if (cav.top[x] >= 0) (cav.top[x] === b.top[x] ? mouth : body).push(x);
  assert.ok(mouth.length > 0 && mouth.length < body.length, `mouth ${mouth.length} columns, body ${body.length}`);
  // and every column of the body has the glass drawn above its room: the shoulders
  const text = lines(picture([shape(where, glass({ highlight: false }))], { cols: 30, rows: 16 }));
  for (const x of body) {
    const above = text.slice(b.top[x], cav.top[x]).map((l) => l[x]).join("");
    assert.match(above, /[^ ]/, `column ${x} is open above its room`);
  }
});

test("a moving shape is the same shape moved: at no offset it is the still one; drift comes round; moves of your own", () => {
  const backdrop = shape(area.all(), solid({ char: "#" }));
  const tumbler = cup({ rows: 8, at: "center" });
  const still = picture([backdrop, shape(tumbler, glass({ highlight: false }))], { cols: 30, rows: 12 });
  // bob is at no offset at t = 0: the moving glass keeps its open mouth and its see-through room, as the still one
  const bobbing = picture([backdrop, shape(tumbler, glass({ highlight: false }), { move: "bob" })], { cols: 30, rows: 12 });
  assert.deepEqual(lines(bobbing, 0), lines(still, 0));
  // at a quarter of the way round it is a row down: the still frame moved
  assert.deepEqual(lines(bobbing, 1).slice(3, 11), lines(still, 0).slice(2, 10));
  // drifting off the right, it comes back in from the left
  const d = picture([shape(area.rect(14, 0, 4, 2), solid({ char: "#" }), { move: "drift", period: 20 })], { cols: 20, rows: 2 });
  assert.equal(lines(d, 4)[0], "##                ##");
  // a move of your own: three columns right, a row up after a second, turned round at the end
  const block = box({ cols: 4, rows: 2, at: "top-left" });
  const own = picture([shape(block, solid({ char: "#" }), { move: (t) => [3, t >= 1 ? 1 : 0], period: 2 })], { cols: 10, rows: 4 });
  assert.deepEqual(lines(own, 0), ["   ####   ", "   ####   ", "          ", "          "]);
  assert.deepEqual(lines(own, 1.5), ["          ", "   ####   ", "   ####   ", "          "]);
  assert.equal(own.meta.loop, 2);
  const sea = area.rect(0, 0, 40, 8);
  const eye = (p: Piece) => lines(p).find((l) => l.includes("o"))!.indexOf("o");
  const fwd = picture([shape(fish({ within: sea, rows: 6 }), { move: () => [0, 0] })], { cols: 40, rows: 8 });
  const back = picture([shape(fish({ within: sea, rows: 6 }), { move: () => [0, 0, true] })], { cols: 40, rows: 8 });
  assert.ok(eye(back) < eye(fwd), "turned round, it faces left");
  // no period: it plays but sets no loop
  const endless = picture([shape(block, solid(), { move: (t) => [Math.floor(t) % 5, 0] })], { cols: 10, rows: 4 });
  assert.equal(endless.meta.loop, undefined);
  assert.equal(endless.meta.fps, 24);
  const bad = picture([shape(block, solid(), { move: () => [1] as never })], { cols: 10, rows: 4 });
  assert.throws(() => snapshot(bad, 0), /shape's move gave \[1\] at t = 0: a move of your own returns \[dx, dy\]/);
});

test("material() that takes t moves even with no period; one that does not is a still", () => {
  const anim = material((c, t) => (Math.floor(t * 2 + c.x) % 2 ? "#" : "."));
  assert.equal(anim.period, Infinity);
  const p = picture([shape(area.rect(0, 0, 4, 1), anim)]);
  assert.equal(p.meta.fps, 24);
  assert.equal(p.meta.loop, undefined);
  assert.notEqual(lines(p, 0)[0], lines(p, 0.5)[0]);
  const flat = material(() => "#");
  assert.equal(flat.period, undefined);
  assert.equal(picture([shape(area.rect(0, 0, 4, 1), flat)]).meta.fps, 0);
  assert.equal(picture([shape(area.rect(0, 0, 4, 1), material((c, t) => (t > 1 ? "#" : "."), { period: 2 }))]).meta.loop, 2);
});

test("area.fit: a shape of your own, from points or a function, placed and sized by words like the rest", () => {
  const tri = cellsOf(area.fit([[0.5, 0], [1, 1], [0, 1]], { rows: 10, at: "bottom" }), 40, 12);
  assert.equal(tri.y1, 12, "at the bottom");
  assert.ok(Math.abs(tri.x1 - tri.x0 - 20) <= 1, "ratio 1: as wide on screen as it is tall, 20 columns for 10 rows");
  assert.ok(tri.right[tri.y0] - tri.left[tri.y0] < tri.right[tri.y1 - 1] - tri.left[tri.y1 - 1], "a point at the top, wide at the bottom");
  // the same triangle as a function, cell for cell: a point on a polygon's edge is in, on either side
  const fn = cellsOf(area.fit((u, v) => Math.abs(u - 0.5) <= v / 2, { rows: 10, at: "bottom" }), 40, 12);
  assert.deepEqual(fn.inside, tri.inside);
  // so a polygon symmetric about its middle comes out symmetric: a star, and a house's roof
  for (const a of [star({ rows: 9, at: "center" }), house({ rows: 12, at: "center" }).roof]) {
    const c = cellsOf(a, 40, 12), mid = c.x0 + c.x1 - 1;
    for (const i of c.list) assert.ok(c.inside[i - (i % 40) + mid - (i % 40)], `${i % 40},${Math.floor(i / 40)} has no mirror`);
  }
  // ratio, within, size and flip, as any shape
  const wide = cellsOf(area.fit((u) => u < 0.5, { ratio: 2, rows: 4, at: "top-left" }), 40, 12);
  assert.deepEqual([wide.x0, wide.x1, wide.y1 - wide.y0], [0, 8, 4]);
  const flipped = cellsOf(area.fit((u) => u < 0.5, { ratio: 2, rows: 4, at: "top-left", flip: true }), 40, 12);
  assert.deepEqual([flipped.x0, flipped.x1], [8, 16]);
  const inner = cellsOf(area.fit([[0, 0], [1, 0], [0, 1]], { within: area.rect(20, 2, 10, 8), size: "full" }), 40, 12);
  assert.ok(inner.x0 >= 20 && inner.x1 <= 30 && inner.y0 >= 2 && inner.y1 <= 10);
  // filled like any other area
  assert.ok(drawn(picture([shape(area.fit([[0.5, 0], [1, 1], [0, 1]]), fire())]), 1).size > 20);
  assert.throws(() => area.fit([[0, 0], [1, 1]]), /area\.fit takes a list of 3 or more points \[u, v\], 0 to 1 across and down its box/);
  assert.throws(() => area.fit([[0, 0], [1, 0], [0, 1]], { ratio: 0 }), /area\.fit\.ratio takes a number from 0\.05 to 20, not 0/);
  assert.throws(() => area.fit((u) => u > 0, { colour: 1 } as never), /area\.fit\(\) has no option "colour"/);
});

test("emission(): particles of your own, born where it comes from, the same for the same t, repeating, checked", () => {
  const block = box({ at: "bottom", cols: 6, rows: 3 });
  const c = cellsOf(block, 30, 16);
  const rising = emission((p) => [p.x, p.y - p.age * 4, p.k < 0.5 ? "*" : "."], { rate: 8, life: 1.5 });
  const p = picture([emit(rising, { from: block })], { cols: 30, rows: 16 });
  contract(p);
  // born along the top of the block, rising: above it and in its columns
  for (const t of [0, 0.7, 1.9]) for (const cell of drawn(p, t)) {
    const [x, y] = cell.split(",").map(Number);
    assert.ok(y <= c.y0 && x >= c.x0 && x < c.x1, `${cell} is not over the block`);
  }
  assert.ok(drawn(p, 1).size > 3);
  const frame = p.default();
  frame(5);
  assert.equal(frame(1), p.default()(1), "nothing carries over between frames");
  sameAfterPeriod(snapshot(p, 5.2), snapshot(p, 1.2), "a period on");
  // anywhere inside an area, drawn only there, in a colour by index
  const pool = area.rect(5, 5, 10, 4);
  const fizz = picture([emit(emission((q) => [q.x + 2, q.y - q.age * 6, "o", 1], { rate: 20, birth: "anywhere", colors: ["#ff0000", "#00ff00"] }), { inside: pool })], { cols: 30, rows: 16 });
  const pal = fizz.meta.palette!;
  for (const t of [0.4, 1.1]) {
    const { color } = snapshot(fizz, t);
    for (const cell of drawn(fizz, t)) {
      const [x, y] = cell.split(",").map(Number);
      assert.ok(x >= 5 && x < 15 && y >= 5 && y < 9, `${cell} is out of the pool`);
      assert.equal(pal[color![at(cell, 30)]], "#00ff00");
    }
  }
  assert.ok(drawn(fizz, 1.1).size > 2);
  // from a point
  assert.ok(drawn(picture([emit(rising, { from: [10, 12] })], { cols: 20, rows: 16 }), 1).size > 2);
  // a rate of 0 gives none, here and in the kit's own
  assert.equal(drawn(picture([emit(emission((q) => [q.x, q.y, "*"], { rate: 0 }))], { cols: 10, rows: 4 }), 1).size, 0);
  assert.equal(drawn(picture([emit(bubbles({ rate: 0 }), { inside: area.rect(0, 0, 10, 4) })], { cols: 10, rows: 4 }), 1).size, 0);
  assert.throws(() => emission(3 as never), /emission takes a function/);
  assert.throws(() => emission((q) => [q.x, q.y, "*"], { birth: "side" as never }), /emission\.birth takes "top", "bottom" and "anywhere", not "side"/);
  assert.throws(() => emission((q) => [q.x, q.y, "*"], { life: 0 }), /emission\.life takes a number from 0\.05 to 60, not 0/);
  const bad = picture([emit(emission(() => [1, 1] as never))], { cols: 4, rows: 4 });
  assert.throws(() => snapshot(bad, 1), /emission gave \[1, 1\]: an emission's function returns \[x, y, character\]/);
});

test("texture(): any piece as a material, in its own colours, centred or tiled, keeping its loop", () => {
  // the rust logo over the whole picture is the logo, colour for colour, on both pages
  const { cols, rows } = rust.meta;
  const tex = picture([shape(area.all(), texture(rust))], { cols, rows });
  for (const paper of [false, true]) {
    const a = snapshot(tex, 0.5, { paper }), b = snapshot(rust, 0.5, { paper });
    assert.equal(a.text, b.text);
    for (let i = 0; i < cols * rows; i++) if (b.text[i + Math.floor(i / cols)] !== " ") assert.equal(tex.meta.palette![a.color![i]], rust.meta.palette![b.color![i]]);
  }
  // text: centred in its area and cut to it, or tiled; opaque, or letting what is under it show through its spaces
  assert.deepEqual(lines(picture([shape(area.rect(0, 0, 9, 3), texture("ab\ncd"))], { cols: 9, rows: 3 })), ["   ab    ", "   cd    ", "         "]);
  assert.equal(lines(picture([shape(area.rect(0, 0, 5, 1), texture("ab", { tile: true }))], { cols: 5, rows: 1 }))[0], "babab");
  const backdrop = shape(area.all(), solid({ char: "#" }));
  assert.equal(lines(picture([backdrop, shape(area.rect(0, 0, 3, 1), texture("a b"))], { cols: 5, rows: 1 }))[0], " a b#".replace(/^ /, "a").slice(0, 0) + "a b##");
  assert.equal(lines(picture([backdrop, shape(area.rect(0, 0, 3, 1), texture("a b", { opaque: false }))], { cols: 5, rows: 1 }))[0], "a#b##");
  // its period: the piece's loop at its speed; a still for a still; none for one that moves without a loop
  const blink = piece({ name: "blink", cols: 2, rows: 1, loop: 2 }, (t, s) => s.write(0, 0, t % 2 < 1 ? "on" : "  "));
  assert.equal(texture(blink, { speed: 2 }).period, 1);
  assert.equal(texture("still").period, undefined);
  assert.equal(texture(rust).period, Infinity);
  assert.equal(lines(picture([shape(area.all(), texture(blink, { speed: 2 }))], { cols: 2, rows: 1 }), 0.75)[0], "  ");
  assert.throws(() => texture(3 as never), /texture takes a piece \(such as one from ascii\.rest\/pieces\), a block of text or a Surface, not 3/);
  assert.throws(() => texture(rust, { speed: 0 }), /texture\.speed takes a number from 0\.01 to 100, not 0/);
  assert.throws(() => texture(rust, { option: 1 } as never), /texture\(\) has no option "option"/);
});

test("drawParts() draws parts in a piece of your own: with partsPalette() it is the picture, colour for colour", () => {
  const tumbler = cup({ rows: 10, at: "center" });
  const drink = inside(tumbler, { fill: "half" });
  const parts = [shape(tumbler, glass()), shape(drink, water()), emit(bubbles(), { inside: drink }), shape(cloud({ rows: 3, at: "top-left" }), { move: "drift" })];
  const pic = picture(parts, { cols: 30, rows: 12 });
  const own = piece({ name: "own", cols: 30, rows: 12, palette: partsPalette(parts) }, (t, s) => drawParts(s, parts, t));
  for (const paper of [false, true])
    for (const t of [0, 1.3, 7]) {
      const a = snapshot(pic, t, { paper }), b = snapshot(own, t, { paper });
      assert.equal(b.text, a.text, `t=${t}`);
      for (let i = 0; i < 360; i++) assert.equal(own.meta.palette![b.color![i]], pic.meta.palette![a.color![i]]);
    }
  // with drawing of your own over it
  const label = piece({ name: "label", cols: 30, rows: 12, palette: partsPalette(parts) }, (t, s) => {
    drawParts(s, parts, t);
    s.write(0, 11, "fresh");
  });
  assert.equal(lines(label, 1)[11].slice(0, 5), "fresh");
  // on a grid with no palette: the same characters, in its ink
  const plain = piece({ name: "plain", cols: 30, rows: 12 }, (t, s) => drawParts(s, parts, t));
  assert.equal(snapshot(plain, 1.3).text, snapshot(pic, 1.3).text);
  assert.equal(partsPalette(parts).light[0], INK.light);
  assert.throws(() => drawParts({} as never, parts, 0), /drawParts takes the grid to draw into first/);
  assert.throws(() => drawParts(new Surface(4, 2), [], 0), /drawParts takes a list of one or more parts/);
});

test("picture() checks its spec: no unknown keys, no palette of its own, cells twice as tall, a size it can be", () => {
  assert.throws(() => picture([shape(ball())], { colour: 1 } as never), /picture\(\)'s spec has no option "colour"/);
  assert.throws(() => picture([shape(ball())], { palette: ["#000000"] }), /picture\(\) makes its palette from its parts' colours/);
  assert.throws(() => picture([shape(ball())], { cell: 1 }), /its cell can only be 2, not 1/);
  assert.throws(() => picture([shape(area.rect(0, 0, 400, 3))]), /picture's parts reach 400 by 3 cells, past the 320 by 120 a piece can be/);
  // given something else than a part, it says how to make one of it
  assert.throws(() => picture([water() as never]), /picture's part 1 is a material: fill an area with it, shape\(area, water\(\)\)/);
  assert.throws(() => picture([shape(ball()), cup() as never]), /picture's part 2 is an area: draw it with shape\(area\)/);
  assert.throws(() => picture([bubbles() as never]), /picture's part 1 is an emission: send it out with emit\(bubbles\(\), \{ from: area \}\)/);
  // a list in an error shows its items as they are: NaN as NaN
  const nan = picture([emit(emission(() => [Number.NaN, 0, "*"]))], { cols: 4, rows: 2 });
  assert.throws(() => snapshot(nan, 1), /emission gave \[NaN, 0, "\*"\]/);
});

test("ramps by name, as everywhere in the kit; a gradient reads in one ink too", () => {
  const where = area.rect(0, 0, 12, 6);
  assert.match(lines(picture([shape(where, fire({ ramp: "blocks" }))], { cols: 12, rows: 6 }), 0.5).join(""), /^[ ░▒▓█]+$/);
  assert.match(lines(picture([shape(where, metal({ ramp: "dots", sheen: false, edge: false }))], { cols: 12, rows: 6 })).join(""), /^[ .·•●]+$/);
  assert.throws(() => fire({ ramp: "x" }), /fire\.ramp takes a ramp's name, standard, detailed/);
  // metal's lit side reads as lit on paper too: its ramp turned round there, unless invert says otherwise
  const can = picture([shape(where, metal({ sheen: false, edge: false }))], { cols: 12, rows: 6 });
  const lit = (paper: boolean) => lines(can, 0, { paper })[3][4];
  assert.deepEqual([lit(false), lit(true)], ["█", "░"]);
  assert.equal(lines(picture([shape(where, metal({ sheen: false, edge: false, invert: false }))], { cols: 12, rows: 6 }), 0, { paper: true })[3][4], "█");
  assert.throws(() => metal({ invert: "yes" as never }), /metal\.invert takes true or false, not "yes"/);
  const g = lines(picture([shape(where, gradientFill())], { cols: 12, rows: 6 }));
  assert.ok(new Set(g.map((l) => l[0])).size >= 3, g.join("\n"));
  assert.equal(lines(picture([shape(where, gradientFill({ ramp: "#" }))], { cols: 12, rows: 6 })).join(""), "#".repeat(72));
});

test("a lawn: short blades along the top, a line of turf under them and earth below; the blades sway", () => {
  const p = picture([shape(ground({ rows: 6 }), grass())], { cols: 40, rows: 10 });
  const rows = lines(p, 0);
  // the band is rows 4 to 9: blades in its top two, turf in its third, earth under that
  assert.equal(rows.slice(0, 4).join("").trim(), "");
  for (const r of rows.slice(4, 6)) assert.match(r, /^[ |/\\,']+$/);
  assert.match(rows[6], /^["',]+$/);
  for (const r of rows.slice(7)) assert.match(r, /^[ .,']+$/);
  assert.match(rows.slice(4, 6).join(""), /[|/\\]/);
  assert.notDeepEqual(lines(p, 0).slice(4, 6), lines(p, 1).slice(4, 6));
  assert.equal(picture([shape(ground({ rows: 6 }), grass({ sway: 0 }))], { cols: 40, rows: 10 }).meta.fps, 0);
});

test("a cloud is drawn as ascii clouds are: puffs over a flat base, round at the sides; and fire can glow", () => {
  const rows = lines(picture([shape(cloud({ rows: 5, at: "center" }))], { cols: 30, rows: 7 }));
  assert.deepEqual(rows.slice(1, 6).map((r) => r.trim()), [".-~~-.", ".'      '.", ".--'          '-~~-.", "(                    )", "'__________________'"]);
  assert.equal(cloud().period, undefined);
  assert.throws(() => cloud({ period: 4 } as never), /cloud\(\) has no option "period"/);
  // a glow of "." round a flame, only outside it
  const tip = flame({ rows: 8, at: "center" });
  const c = cellsOf(tip, 20, 10);
  const glowing = picture([shape(tip, fire({ glow: 1 }))], { cols: 20, rows: 10 });
  let outside = 0;
  for (const cell of drawn(glowing, 0)) {
    if (c.inside[at(cell, 20)]) continue;
    outside++;
    const [x, y] = cell.split(",").map(Number);
    assert.equal(lines(glowing, 0)[y][x], ".");
  }
  assert.ok(outside > 6, `${outside} cells of glow`);
  assert.throws(() => fire({ glow: -1 }), /fire\.glow takes a number from 0 to 6, not -1/);
});

test("every example repeats exactly on its loop, at every frame svg() samples, a loop and three loops on", () => {
  // before each part's t was brought into its period, the house differed in 16 of these frames and the aquarium in 63
  for (const [name, mod] of Object.entries({ aquarium, candle, coffee, cola, glassOfWater, houseAtNight, lavaLamp, rocket })) {
    const p = mod.default, loop = p.meta.loop!;
    const a = p.default(), b = p.default();
    const ca = new Uint8Array(p.meta.cols * p.meta.rows), cb = new Uint8Array(p.meta.cols * p.meta.rows);
    for (let k = 0; k < Math.round(loop * 15); k++)
      for (const m of [1, 3]) {
        const t = k / 15;
        assert.equal(a(t, { color: ca }), b(t + m * loop, { color: cb }), `${name} at ${t} and ${m} loops on`);
        assert.deepEqual(ca, cb, `${name}'s colours at ${t} and ${m} loops on`);
      }
  }
});

test("a moon is a crescent: lit on its left, both horns coming to points, mirrored top to bottom", () => {
  const where = moon({ rows: 10, at: "center" });
  const c = cellsOf(where, 40, 12), box = where.place(40, 12);
  const mid = c.y0 + c.y1 - 1;
  for (const i of c.list) {
    const x = i % 40, y = Math.floor(i / 40);
    assert.ok(c.inside[(mid - y) * 40 + x], `${x},${y} has no mirror below the middle`);
  }
  // on the left across the middle, a third of its disc thick; its horns reach round past the disc's middle, top and bottom
  const middle = Math.floor((c.y0 + c.y1) / 2), centre = (box.x0 + box.x1) / 2;
  assert.equal(c.left[middle], box.x0);
  assert.ok(c.right[middle] - c.left[middle] + 1 < (box.x1 - box.x0) / 2, "a crescent, not a disc");
  assert.ok(c.right[c.y0] > centre && c.right[c.y1 - 1] > centre, "horns at the top and the bottom");
});

test("the checks added in review: what your functions return, options that would do nothing, and colours as one #rrggbb", () => {
  const cell = area.rect(0, 0, 2, 1);
  const drawOf = (m: Material) => () => snapshot(picture([shape(cell, m)], { cols: 2, rows: 1 }), 0);
  assert.throws(drawOf(material(() => 5 as never)), /material gave 5: a material's function returns a character, \[character, colour index\] or ""/);
  assert.throws(drawOf(material(() => [7, 0] as never)), /material gave \[7, 0\]/);
  assert.throws(drawOf(material(() => "\u007f")), /a cell takes one printable character, and U\+007F is not one/);
  assert.throws(drawOf(material(() => ["#", 1])), /material gave colour 1: it has one colour, 0, from its colors/);
  assert.throws(drawOf(material(() => ["#", 2], { colors: ["#ff0000", "#00ff00"] })), /it has 2 colours, 0 to 1/);
  assert.equal(drawOf(material(() => ["#"]))().text, "##", "no colour index is colour 0");
  const spark = (r: unknown) => () => snapshot(picture([emit(emission(() => r as never, { rate: 20 }))], { cols: 4, rows: 4 }), 1);
  assert.throws(spark([1, 1, "*", 3]), /emission gave colour 3: it has one colour, 0/);
  assert.throws(spark([1, 1, "\u0085"]), /emission drew .*U\+0085 is not one/);
  // a particle's k never reaches 1, so it can index a string
  const ks: number[] = [];
  snapshot(picture([emit(emission((p) => (ks.push(p.k), [p.x, p.y, ".:*"[Math.floor(p.k * 3)]]), { rate: 40, life: 0.5 }))], { cols: 8, rows: 4 }), 2);
  assert.ok(ks.length > 5 && ks.every((k) => k >= 0 && k < 1), `k from ${Math.min(...ks)} to ${Math.max(...ks)}`);
  // area.where's box is checked whole
  assert.throws(() => area.where(() => true, null as never), /area\.where's box takes \{ x, y, cols, rows \} in cells, not null/);
  assert.throws(() => area.where(() => true, { x: 0, y: 0 } as never), /area\.where's box takes a number for cols, not undefined/);
  // an emission is not a material, and how far or how often means nothing without a move
  assert.throws(() => shape(cup(), bubbles() as never), /shape takes a material second, and bubbles is an emission: send it out with emit\(bubbles\(\), \{ from: area \}\)/);
  assert.equal((shape(cup(), smoke()).what as Material).name, "smoke", "smoke is both, so it may fill an area");
  assert.throws(() => shape(ball(), { amount: 3 }), /shape's amount is for a move: give it move "bob", "sway", "swim" or "drift"/);
  assert.throws(() => shape(ball(), solid(), { period: 3 }), /shape's period is for a move/);
  assert.throws(() => solid({ char: "#", ramp: "blocks" }), /solid takes a char or a ramp, not both/);
  assert.throws(() => picture([shape(ball())], { clear: false }), /picture\(\) empties its grid before each frame, so a frame depends only on t: leave clear out/);
  // one colour as #rrggbb, for both pages
  const red = picture([shape(cell, solid({ colors: "#ff0000" }))], { cols: 2, rows: 1 });
  const { color } = snapshot(red, 0);
  assert.equal(red.meta.palette![color![0]], "#ff0000");
  assert.equal(red.meta.palette![snapshot(red, 0, { paper: true }).color![0]], "#ff0000");
  assert.throws(() => solid({ colors: "#ff00" as never }), /solid\.colors takes a palette's name/);
  // a maker passed without calling it is named, not printed as its source
  assert.throws(() => shape(cup as never), /shape takes an area, such as cup\(\), .* not cup, a function: call it, cup\(\)$/);
  assert.throws(() => shape(cup(), glass as never), /not glass, a function: call it, glass\(\)$/);
  assert.throws(() => emit(bubbles as never), /not bubbles, a function: call it, bubbles\(\)$/);
  assert.throws(() => picture([cup as never]), /picture's part 1 is cup, a function: call it, cup\(\), and give what it makes to shape\(\) or emit\(\)/);
});

test("drawParts(): two lists of parts drawn into one grid are each set up once and keep their own", () => {
  const a = [shape(area.rect(0, 0, 4, 1), solid({ char: "a" }))], b = [shape(area.rect(2, 1, 4, 1), solid({ char: "b" }))];
  let setups = 0;
  const counted = (parts: ReturnType<typeof shape>[]) => parts.map((p) => ({ ...p, setup: (c: number, r: number) => (setups++, p.setup(c, r)) }));
  const ca = counted(a), cb = counted(b);
  const both = piece({ name: "both", cols: 6, rows: 2 }, (t, s) => {
    drawParts(s, ca, t);
    drawParts(s, cb, t);
  });
  const frame = both.default();
  for (const t of [0, 0.5, 1, 1.5]) assert.equal(frame(t), "aaaa  \n  bbbb");
  assert.equal(setups, 2, "each list set up once, not once a frame");
});

test("edge cases: a one-cell picture, a shape bigger than the picture, a room with nothing in it", () => {
  contract(picture([shape(area.all(), water())], { cols: 1, rows: 1 }));
  contract(picture([shape(ball({ rows: 40 }), fire())], { cols: 10, rows: 5 }));
  const empty = picture([shape(inside(area.rect(0, 0, 2, 2)), water()), emit(bubbles(), { inside: inside(area.rect(0, 0, 2, 2)) })], { cols: 4, rows: 4 });
  contract(empty);
  assert.deepEqual(lines(empty), ["    ", "    ", "    ", "    "]);
});
