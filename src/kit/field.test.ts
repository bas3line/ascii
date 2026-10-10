// node --test src/kit/field.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { still } from "../terminal.ts";
import type { Piece } from "../types.ts";
import { EMPTY, NONE, Palette, Surface, TAU, gradient, ramps, sample, snapshot } from "./core.ts";
import { drawField, field, type FieldCell, type FieldFn, type FieldOptions } from "./field.ts";
import moonlit from "../../examples/kit/field-moonlit.ts";
import plasma from "../../examples/kit/field-plasma.ts";
import pulse from "../../examples/kit/field-pulse.ts";
import sea from "../../examples/kit/field-sea.ts";
import storm from "../../examples/kit/field-storm.ts";
import framed from "../../examples/kit/field-window.ts";

const examples = [plasma, pulse, sea, framed, moonlit, storm];

// Wall-clock budgets, as on an idle machine when KIT_PERF=1 (npm run test:perf); ten times as long otherwise, so a
// busy CI runner running the files side by side fails only on a slowdown of a different order.
const slack = process.env.KIT_PERF ? 1 : 10;

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette.
function contract(p: Piece, times = [0, 0.5, 1, 2.5]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      for (const t of times) {
        const lines = frame(t, { paper, color }).split("\n");
        assert.equal(lines.length, meta.rows, `t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `colour ${c} past the palette`);
      }
    }
}

type Seen = { x: number; y: number } & Omit<FieldCell, "options" | "char" | "color">;
// Every cell's x, y and cell, as drawField hands them to the function.
function seen(s: Surface, o?: FieldOptions): Seen[] {
  const out: Seen[] = [];
  drawField(s, (x, y, _t, at) => (out.push({ x, y, col: at.col, row: at.row, u: at.u, v: at.v, r: at.r, a: at.a, cols: at.cols, rows: at.rows, width: at.width, height: at.height, phase: at.phase }), 1), 0, o);
  return out;
}
const near = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 1e-9, msg ?? `${a} is not ${b}`);

// A one-cell grid's character for a value, through drawField.
function shade(v: number | null, o: FieldOptions = {}, paper = false) {
  const s = new Surface(1, 1);
  s.paper = paper;
  drawField(s, () => v, 0, o);
  return s.get(0, 0);
}

test("x and y are centred, the shorter side runs -1 to 1, and rows count at their true height", () => {
  // 64 by 24 cells of 1 by 2: 64 wide by 48 tall, so the height is the shorter side.
  const s = new Surface(64, 24);
  const cells = seen(s);
  assert.equal(cells.length, 64 * 24);
  const at = (c: number, r: number) => cells[r * 64 + c];
  near(at(0, 0).y - 1 / 24, -1, "top edge");
  near(at(0, 23).y + 1 / 24, 1, "bottom edge");
  near(at(31, 11).x + at(32, 12).x, 0, "centred across");
  near(at(31, 11).y + at(32, 12).y, 0, "centred down");
  // A row is twice a column, so a step down is twice a step across.
  near(at(1, 0).x - at(0, 0).x, 1 / 24);
  near(at(0, 1).y - at(0, 0).y, 2 / 24);

  // 10 by 20 cells: 10 wide by 40 tall, so the width is the shorter side.
  const tall = seen(new Surface(10, 20));
  near(tall[0].x - 0.1, -1, "left edge");
  near(tall[9].x + 0.1, 1, "right edge");

  // An odd grid has a middle cell at 0, 0.
  const odd = seen(new Surface(9, 5));
  const mid = odd[2 * 9 + 4];
  assert.equal(mid.x, 0);
  assert.equal(mid.y, 0);
  assert.equal(mid.r, 0);
});

test("the cell says where it is: col, row, u, v, r, a and the region's size", () => {
  const cells = seen(new Surface(8, 4));
  for (const c of cells) {
    assert.equal(c.cols, 8);
    assert.equal(c.rows, 4);
    near(c.u, (c.col + 0.5) / 8);
    near(c.v, (c.row + 0.5) / 4);
    near(c.r, Math.hypot(c.x, c.y));
    near(c.a, Math.atan2(c.y, c.x));
  }
  assert.deepEqual([cells[0].col, cells[0].row, cells[13].col, cells[13].row], [0, 0, 5, 1]);
});

test("a circle comes out round: twice as many columns across as rows down", () => {
  const p = field({ cols: 64, rows: 24, ramp: "binary" }, (x, y, t, at) => (at.r < 0.9 ? 1 : 0));
  const lines = snapshot(p).text.split("\n");
  const across = Math.max(...lines.map((l) => l.split("#").length - 1));
  const down = lines.filter((l) => l.includes("#")).length;
  assert.ok(Math.abs(across / down - 2) < 0.2, `${across} across by ${down} down`);
});

test("aspect: false runs each axis -1 to 1 whatever the shape", () => {
  const cells = seen(new Surface(8, 4), { aspect: false });
  near(cells[0].x, -0.875);
  near(cells[7].x, 0.875);
  near(cells[0].y, -0.75);
  near(cells[3 * 8].y, 0.75);
});

test("the ramp's ends, clamping, range and gamma", () => {
  const o = { ramp: "abcd", invert: false } as const;
  assert.equal(shade(0, o), "a");
  assert.equal(shade(1, o), "d");
  assert.equal(shade(0.49, o), "b");
  assert.equal(shade(0.5, o), "c");
  assert.equal(shade(7, o), "d");
  assert.equal(shade(-3, o), "a");
  assert.equal(shade(Infinity, o), "d");
  assert.equal(shade(-1, { ...o, range: [-1, 1] }), "a");
  assert.equal(shade(0, { ...o, range: [-1, 1] }), "c");
  assert.equal(shade(1, { ...o, range: [-1, 1] }), "d");
  // High before low turns it round.
  assert.equal(shade(1, { ...o, range: [1, 0] }), "a");
  // 0.5 squared is 0.25: one step down.
  assert.equal(shade(0.5, { ...o, gamma: 2 }), "b");
  assert.equal(shade(1, { ramp: "blocks" }), "█");
  assert.equal(shade(1, {}), "@", "standard by default");
  for (const name of Object.keys(ramps) as (keyof typeof ramps)[]) assert.equal(shade(1, { ramp: name }), ramps[name].at(-1));
});

test("invert: \"auto\" turns the ramp round on paper, true always, false never", () => {
  const frame = (o: FieldOptions, paper: boolean) => field({ cols: 1, rows: 1, ramp: "ab", ...o }, () => 1).default()(0, { paper });
  assert.equal(frame({}, false), "b");
  assert.equal(frame({}, true), "a");
  assert.equal(frame({ invert: true }, false), "a");
  assert.equal(frame({ invert: false }, true), "b");
});

test("a space in the ramp, null and NaN leave the cell as it was", () => {
  const s = new Surface(4, 1);
  s.write(0, 0, "wxyz");
  const values = [0, null, NaN, 1];
  drawField(s, (x, y, t, at) => values[at.col], 0);
  assert.equal(s.toString(), "wxy@");

  // On a fresh frame those cells are EMPTY, so the field layers.
  const p = field({ cols: 3, rows: 1 }, (x, y, t, at) => [0, null, 1][at.col]);
  const grid = sample(p).at(0);
  assert.deepEqual([...grid.chars], [EMPTY, EMPTY, "@".charCodeAt(0)]);
  // On paper 0 is dense ink, but null is still nothing.
  assert.equal(snapshot(p, 0, { paper: true }).text, "@  ");
  assert.equal(shade(null, {}, true), "");
});

test("a field that is all dark, or all nothing, is an empty frame", () => {
  for (const v of [0, null]) {
    const p = field({ cols: 5, rows: 2 }, () => v);
    assert.equal(snapshot(p).text, "     \n     ");
  }
});

test("colours by value reach both ends of the palette, on each page", () => {
  const p = field({ cols: 16, rows: 1, ramp: "#@", colors: { light: ["#000000", "#0000ff"], dark: ["#ffffff", "#ff0000"] }, steps: 4 }, (x, y, t, at) => at.u);
  assert.equal(p.meta.palette!.length, 8);
  assert.deepEqual(p.meta.palette!.slice(0, 4), ["#000000", "#000055", "#0000aa", "#0000ff"]);
  const dark = snapshot(p, 0).color!;
  const paper = snapshot(p, 0, { paper: true }).color!;
  assert.equal(dark[0], 4);
  assert.equal(dark[15], 7);
  assert.equal(paper[0], 0);
  assert.equal(paper[15], 3);
  // Steps rise left to right, each used.
  assert.deepEqual([...new Set(paper)], [0, 1, 2, 3]);
  contract(p);
});

test("colour by your own function picks from the palette", () => {
  const p = field({ cols: 4, rows: 1, ramp: "#@", palette: ["#ff0000", "#0000ff"], color: (v, x) => (x < 0 ? 0 : "#0000ff") }, () => 1);
  assert.deepEqual([...snapshot(p).color!], [0, 0, 1, 1]);
  // With colors too, the function picks from the spread colours.
  const q = field({ cols: 2, rows: 1, ramp: "#@", colors: ["#000000", "#ffffff"], steps: 3, color: (v, x) => (x < 0 ? 2 : 1) }, () => 0);
  assert.deepEqual([...snapshot(q).color!], [2, 1]);
});

test("in one ink no colours are written, and the text is the same", () => {
  const p = field({ cols: 8, rows: 3, colors: ["#000000", "#ffffff"] }, (x, y, t, at) => at.u);
  const mono = snapshot(p, 0, { mono: true });
  assert.equal(mono.color, null);
  assert.equal(mono.text, snapshot(p, 0).text);

  // drawField writes no colour on a surface drawn in one ink, nor on one with no palette.
  const s = new Surface(4, 1, { palette: new Palette(["#000000", "#ffffff"]) });
  drawField(s, () => 1, 0, { colors: ["#000000", "#ffffff"] });
  assert.ok(s.colors.every((c) => c === NONE));
  const plain = new Surface(4, 1);
  plain.mono = false;
  drawField(plain, () => 1, 0, { colors: ["#000000", "#ffffff"], color: () => 1 });
  assert.equal(plain.toString(), "@@@@");
  assert.ok(plain.colors.every((c) => c === NONE));
});

test("drawField finds its colours in the surface's palette, the nearest where it must", () => {
  const s = new Surface(4, 1, { palette: new Palette(["#888888", "#000000", "#ffffff"]) });
  s.mono = false;
  drawField(s, (x, y, t, at) => at.u, 0, { ramp: "#@", colors: ["#000000", "#ffffff"], steps: 2 });
  assert.deepEqual([...s.colors], [1, 1, 2, 2]);
  drawField(s, () => 1, 0, { ramp: "#@", colors: ["#fefefe"], steps: 1 });
  assert.deepEqual([...s.colors], [2, 2, 2, 2]);
  // A colour function's #rrggbb is found the same way.
  drawField(s, () => 1, 0, { ramp: "#@", color: () => "#808080" });
  assert.deepEqual([...s.colors], [0, 0, 0, 0]);
});

test("dither moves a cell only to its neighbour on the ramp, character and colour", () => {
  const ramp = ramps.standard;
  const step = (s: Surface, i: number) => (s.chars[i] === EMPTY ? 0 : ramp.indexOf(String.fromCharCode(s.chars[i])));
  const colors = gradient(["#000000", "#ffffff"], 8);
  const draw = (dither: boolean) => {
    const s = new Surface(48, 12, { palette: new Palette(colors) });
    s.mono = false;
    drawField(s, (x, y, t, at) => at.u * 0.7 + at.v * 0.3, 0, { dither, colors, steps: 8 });
    return s;
  };
  const plain = draw(false), dithered = draw(true);
  let moved = 0, recoloured = 0;
  for (let i = 0; i < plain.chars.length; i++) {
    const d = step(dithered, i) - step(plain, i);
    assert.ok(Math.abs(d) <= 1, `cell ${i} moved ${d} steps`);
    if (d) moved++;
    // An empty cell has no colour to compare.
    if (plain.chars[i] === EMPTY || dithered.chars[i] === EMPTY) continue;
    const k = dithered.colors[i] - plain.colors[i];
    assert.ok(Math.abs(k) <= 1, `cell ${i} changed colour by ${k} steps`);
    if (k) recoloured++;
  }
  assert.ok(moved > plain.chars.length / 10, `only ${moved} cells dithered`);
  assert.ok(recoloured > 0, "no colours dithered");
  // Same picture on the whole: the average step barely moves.
  const mean = (s: Surface) => Array.from(s.chars, (_, i) => step(s, i)).reduce((a, b) => a + b, 0) / s.chars.length;
  assert.ok(Math.abs(mean(dithered) - mean(plain)) < 0.6);
});

test("a region is drawn into and nothing else, its coordinates its own", () => {
  const s = new Surface(8, 4);
  const cells = seen(s, { ramp: "ab", region: { x: 2, y: 1, cols: 3, rows: 2 } });
  assert.equal(s.toString(), "        \n  bbb   \n  bbb   \n        ");
  assert.equal(cells.length, 6);
  assert.deepEqual(cells.map((c) => [c.col, c.row]), [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
  assert.ok(cells.every((c) => c.cols === 3 && c.rows === 2));
  near(cells[1].x, 0, "centred on the region");

  // Fractions are taken down to whole cells.
  const f = new Surface(8, 4);
  drawField(f, () => 1, 0, { ramp: "ab", region: { x: 2.7, y: 1.2, cols: 3.9, rows: 2.5 } });
  assert.equal(f.toString(), s.toString());

  // field() keeps its own copy: changing the object afterwards moves nothing.
  const region = { x: 2, y: 1, cols: 3, rows: 2 };
  const p = field({ cols: 8, rows: 4, ramp: "ab", region }, () => 1);
  region.x = 0;
  assert.equal(snapshot(p).text, s.toString());

  // field() tries its function once when it is made, at the region's centre, with the region's size.
  let first: number[] | undefined;
  field({ cols: 20, rows: 10, region: { x: 2, y: 2, cols: 6, rows: 4 } }, (x, y, t, at) => ((first ??= [at.cols, at.rows, at.col, at.row]), 1));
  assert.deepEqual(first, [6, 4, 3, 2]);
});

test("a region over the edge is cut there, keeping its shape", () => {
  const whole = seen(new Surface(12, 8), { region: { x: 4, y: 2, cols: 6, rows: 4 } });
  const s = new Surface(8, 4);
  const cut = seen(s, { ramp: "ab", region: { x: 4, y: 2, cols: 6, rows: 4 } });
  assert.equal(s.toString(), "        \n        \n    bbbb\n    bbbb");
  assert.equal(cut.length, 8);
  for (const c of cut) {
    const w = whole.find((o) => o.col === c.col && o.row === c.row)!;
    assert.deepEqual(c, w);
  }
  // From the left and top too.
  const t = new Surface(4, 4);
  const left = seen(t, { ramp: "ab", region: { x: -2, y: -1, cols: 4, rows: 3 } });
  assert.equal(t.toString(), "bb  \nbb  \n    \n    ");
  assert.deepEqual(left.map((c) => [c.col, c.row]), [[2, 1], [3, 1], [2, 2], [3, 2]]);
  // Wholly outside, or empty: nothing, and no error.
  for (const region of [{ x: 9, y: 0, cols: 3, rows: 3 }, { x: 0, y: -5, cols: 3, rows: 3 }, { x: 0, y: 0, cols: 0, rows: 3 }, { x: 0, y: 0, cols: 3, rows: -1 }]) {
    const e = new Surface(4, 4);
    assert.equal(seen(e, { region }).length, 0);
    assert.ok(e.chars.every((c) => c === EMPTY));
  }
});

test("many regions on one surface each draw right, the first ones again after the rest", () => {
  // More regions than a surface keeps worked out, then the first two again.
  const s = new Surface(40, 2);
  const ks = [...Array(12).keys(), 0, 1];
  for (const k of ks) drawField(s, (x, y, t, at) => (at.col === 0 ? 1 : null), 0, { ramp: "ab", region: { x: k * 3, y: k % 2, cols: 3, rows: 1 } });
  const want = new Surface(40, 2);
  for (const k of ks) want.set(k * 3, k % 2, "b");
  assert.equal(s.toString(), want.toString());
});

test("the same t gives the same frame, in any order, on any player", () => {
  for (const p of [...examples, field({ dither: true, colors: ["#000000", "#ffffff"] }, (x, y, t) => 0.5 + 0.5 * Math.sin(x * 6 + y * 2 + Math.PI * t))]) {
    const a = p.default(), b = p.default();
    const color = p.meta.palette ? new Uint8Array(p.meta.cols * p.meta.rows) : undefined;
    const fresh = (t: number, paper: boolean) => {
      const c = color && new Uint8Array(color.length);
      return { text: p.default()(t, { paper, color: c }), color: c && [...c] };
    };
    for (const [t, paper] of [[3, false], [1, true], [2.5, false], [1, false], [3, true]] as const) {
      const ca = color && new Uint8Array(color.length), cb = color && new Uint8Array(color.length);
      const ta = a(t, { paper, color: ca }), tb = b(t, { paper, color: cb });
      const f = fresh(t, paper);
      assert.equal(ta, f.text, `${p.meta.name} t=${t}`);
      assert.equal(tb, f.text);
      if (ca) assert.deepEqual([...ca], f.color);
    }
    contract(p);
  }
});

test("period sets meta.loop, and the examples loop exactly", () => {
  assert.equal(field({ period: 2 }, () => 1).meta.loop, 2);
  assert.equal(field({ loop: 3 }, () => 1).meta.loop, 3);
  assert.equal(field({}, () => 1).meta.loop, undefined);
  for (const p of examples) {
    const L = p.meta.loop!;
    assert.ok(L > 0, `${p.meta.name} has a loop`);
    for (const t of [0, 0.4, 1.3])
      for (const paper of [false, true]) {
        const a = snapshot(p, t, { paper }), b = snapshot(p, t + L, { paper });
        assert.equal(a.text, b.text, `${p.meta.name} at ${t} and ${t + L}`);
        assert.deepEqual(a.color, b.color, `${p.meta.name}'s colours at ${t} and ${t + L}`);
      }
  }
});

test("at.phase runs 0 to 1 through the period, the same for every cell, and 0 without one", () => {
  const phases = (o: FieldOptions, t: number) => {
    const seen = new Set<number>();
    drawField(new Surface(4, 2), (x, y, _t, at) => (seen.add(at.phase), 1), t, o);
    return [...seen];
  };
  assert.deepEqual(phases({}, 3.7), [0]);
  assert.deepEqual(phases({ period: 2 }, 0), [0]);
  assert.deepEqual(phases({ period: 2 }, 0.5), [0.25]);
  assert.deepEqual(phases({ period: 2 }, 5), [0.5]);
  // Before 0 too, still 0 up to 1.
  assert.deepEqual(phases({ period: 4 }, -1), [0.75]);
  // field() hands it on, and a function of TAU * at.phase repeats exactly at meta.loop.
  const p = field({ cols: 16, rows: 4, period: 3, range: [-1, 1] }, (x, y, t, at) => Math.sin(x * 5 - TAU * at.phase));
  assert.equal(p.meta.loop, 3);
  for (const t of [0, 0.5, 1.25, 2.9]) assert.equal(snapshot(p, t).text, snapshot(p, t + 3).text, `t=${t}`);
  assert.notEqual(snapshot(p, 0).text, snapshot(p, 1).text, "it moves");
  // The period is checked for drawField too.
  assert.throws(() => drawField(new Surface(1, 1), () => 1, 0, { period: 0 }), /period takes the field's loop in seconds, a number above 0, not 0/);
});

test("a field is a normal piece: its meta, svg(), a terminal and sample()", async () => {
  const p = field({ name: "sea", note: "waves", cols: 32, rows: 10, ramp: "blocks", colors: ["#0b3d91", "#7fdbff"], period: 2 }, (x, y, t) => 0.5 + 0.5 * Math.sin(x * 6 + y * 2 + Math.PI * t));
  assert.deepEqual({ ...p.meta, palette: undefined }, { name: "sea", category: "generative", note: "waves", cols: 32, rows: 10, fps: 30, loop: 2, palette: undefined });
  assert.equal(p.meta.palette!.length, 16);
  // svg() draws for a light page unless told: the ramp turned round, so the brightest cells, the last colour, are blank
  // there and the first colour is dense ink. On a dark page the last colour shows.
  const light = svg(p), dark = svg(p, { dark: true });
  assert.ok(light.startsWith("<svg") && dark.startsWith("<svg"));
  assert.ok(light.includes("#0b3d91") && !light.includes("#7fdbff"), "light: the first colour, not the last");
  assert.ok(dark.includes("#7fdbff"), "dark: the last colour");
  assert.equal(await still(p), snapshot(p, 0, { mono: true }).text);
  assert.equal(sample(p).at(1.5).toString(), snapshot(p, 1.5).text);
  // Defaults: 64 by 24, named "field".
  const d = field({}, () => 1);
  assert.deepEqual([d.meta.name, d.meta.cols, d.meta.rows], ["field", 64, 24]);
});

test("the piece's options reach the function as at.options", () => {
  const p = field({ cols: 3, rows: 1, options: { level: 0 } }, (x, y, t, at) => at.options.level);
  assert.equal(p.default()(0), "   ");
  assert.equal(p.default({ level: 1 })(0), "@@@");
  assert.equal(snapshot(p, 0, { options: { level: 0.5 } }).text, "+++");
  // drawField gives an empty object.
  drawField(new Surface(1, 1), (x, y, t, at) => (assert.deepEqual(at.options, {}), 1), 0);
});

test("one cell object serves every cell of a frame", () => {
  const objects = new Set<object>();
  const p = field({ cols: 6, rows: 3 }, (x, y, t, at) => (objects.add(at), 1));
  const frame = p.default();
  objects.clear();
  frame(0);
  frame(1);
  assert.equal(objects.size, 1);
});

test("true is solid ink on every page and false is nothing: a shape needs no invert", () => {
  const disc = field({ cols: 24, rows: 8, ramp: "binary" }, (x, y, t, at) => at.r < 0.8);
  const dark = snapshot(disc).text, paper = snapshot(disc, 0, { paper: true }).text;
  assert.equal(paper, dark, "the same disc on both pages");
  assert.ok(dark.includes("#") && dark.includes(" "));
  // invert true still draws ink, and dither never thins it.
  const inverted = field({ cols: 24, rows: 8, ramp: "binary", invert: true, dither: true }, (x, y, t, at) => at.r < 0.8);
  assert.equal(snapshot(inverted).text, dark);
  // Its colour is the top step, on each page.
  const coloured = field({ cols: 4, rows: 1, colors: { light: ["#000000", "#111111"], dark: ["#eeeeee", "#ffffff"] }, steps: 2 }, (x) => x < 0);
  assert.deepEqual([...snapshot(coloured).color!].slice(0, 2), [3, 3]);
  assert.deepEqual([...snapshot(coloured, 0, { paper: true }).color!].slice(0, 2), [1, 1]);
  assert.equal(snapshot(coloured).text, "@@  ");
  // false leaves what is under it, as null does.
  const s = new Surface(3, 1);
  s.write(0, 0, "abc");
  drawField(s, (x, y, t, at) => [true, false, null][at.col], 0);
  assert.equal(s.toString(), "@bc");
});

test("at.char draws a cell's own character, the value still picking its colour", () => {
  const p = field({ cols: 6, rows: 1, ramp: "ab", colors: ["#000000", "#ffffff"], steps: 2 }, (x, y, t, at) => {
    if (at.col === 1) at.char = "<";
    if (at.col === 2) at.char = "";
    if (at.col === 3) at.char = "x"; // but null: nothing
    if (at.col === 4) at.char = "^";
    return at.col === 3 ? null : at.col === 4 ? 0 : 1;
  });
  for (const paper of [false, true]) {
    const { text, color } = snapshot(p, 0, { paper });
    // Col 0 and 5 from the ramp, turned round on paper; col 1 and 4 their own character on any page; col 2 and 3 nothing.
    assert.equal(text, paper ? "a<  ^a" : "b<  ^b");
    assert.deepEqual([color![1], color![4]], [1, 0], "colour by the value");
  }
  // A space covers what is under it; "" leaves it.
  const s = new Surface(3, 1);
  s.write(0, 0, "abc");
  drawField(s, (x, y, t, at) => ((at.char = [" ", "", "*"][at.col]), 1), 0);
  assert.deepEqual([...s.chars], [32, "b".charCodeAt(0), "*".charCodeAt(0)]);
  // A flow of slashes by angle: a drawing no ramp could make.
  const swirl = field({ cols: 9, rows: 5, aspect: false }, (x, y, t, at) => ((at.char = "-\\|/"[Math.round((at.a / Math.PI) * 4 + 8) % 4]), 1));
  const lines = snapshot(swirl).text.split("\n");
  assert.equal(lines[2], "---------");
  assert.deepEqual([lines[0][4], lines[4][4], lines[0][0], lines[0][8], lines[4][0], lines[4][8]], ["|", "|", "\\", "/", "/", "\\"]);
});

test("at.color colours a cell itself, over colours by value", () => {
  // invert: false, so the bright cells are ink on paper too.
  const p = field({ cols: 4, rows: 1, invert: false, colors: ["#000000", "#ffffff"], steps: 2, palette: { light: ["#aa0000"], dark: ["#ff0000"] } }, (x, y, t, at) => {
    if (at.col === 0) at.color = 2;
    if (at.col === 1) at.color = "#fe0000";
    return 1;
  });
  // The spread colours, then the palette's: 3 a page.
  assert.deepEqual(p.meta.palette, ["#000000", "#ffffff", "#aa0000", "#000000", "#ffffff", "#ff0000"]);
  assert.deepEqual([...snapshot(p).color!], [5, 5, 4, 4]);
  assert.deepEqual([...snapshot(p, 0, { paper: true }).color!], [2, 2, 1, 1]);
  // In one ink, none.
  assert.equal(snapshot(p, 0, { mono: true }).color, null);
  // It wins over a color function too, which is not called for that cell.
  let called = 0;
  const q = field({ cols: 2, rows: 1, palette: ["#000000", "#ff0000", "#0000ff"], color: () => (called++, 2) }, (x, y, t, at) => {
    if (at.col === 0) at.color = 1;
    return 1;
  });
  assert.deepEqual([...snapshot(q).color!], [1, 2]);
  assert.equal(called, 1);
  // drawField finds it in the surface's palette, the nearest; on a surface in one ink it writes none.
  const s = new Surface(2, 1, { palette: new Palette(["#000000", "#00ff00"]) });
  s.mono = false;
  drawField(s, (x, y, t, at) => ((at.color = at.col ? "#10e010" : 0), 1), 0);
  assert.deepEqual([...s.colors], [0, 1]);
  s.mono = true;
  drawField(s, (x, y, t, at) => ((at.color = 1), 1), 0);
  assert.deepEqual([...s.colors], [NONE, NONE]);
});

test("colors and palette together: the palette's colours come after the spread ones", () => {
  const plain = field({ ramp: "#@", colors: ["#000000", "#ffffff"], steps: 3, palette: ["#ff0000"] }, () => 1);
  assert.deepEqual(plain.meta.palette, ["#000000", "#808080", "#ffffff", "#ff0000"]);
  const themed = field({ ramp: "#@", colors: { light: ["#000000"], dark: ["#ffffff"] }, steps: 2, palette: ["#ff0000"] }, () => 1);
  assert.deepEqual(themed.meta.palette, ["#000000", "#000000", "#ff0000", "#ffffff", "#ffffff", "#ff0000"]);
  // A color function's index counts the spread colours first.
  const q = field({ cols: 2, rows: 1, ramp: "#@", colors: ["#000000", "#ffffff"], steps: 2, palette: ["#ff0000"], color: (v, x) => (x < 0 ? 2 : 0) }, () => 1);
  assert.deepEqual([...snapshot(q).color!], [2, 0]);
});

test("width and height say where the region's edges are in x and y", () => {
  const wide = seen(new Surface(64, 24));
  near(wide[0].width, 64 / 24);
  near(wide[0].height, 2);
  // A cell is 1 / 24 across, so its centre is half that in from the edge.
  near(wide[0].x - 1 / 48, -wide[0].width / 2, "left edge");
  near(wide[63].x + 1 / 48, wide[0].width / 2, "right edge");
  near(wide[0].y - 1 / 24, -wide[0].height / 2, "top edge");
  // 10 by 20 cells are 10 wide by 40 tall: a unit is 5 cell widths, a row 0.4 of one.
  const tall = seen(new Surface(10, 20));
  near(tall[0].width, 2);
  near(tall[0].height, 8);
  near(tall[0].y - 0.2, -4, "top edge");
  near(tall[tall.length - 1].y + 0.2, 4, "bottom edge");
  const flat = seen(new Surface(64, 24), { aspect: false });
  assert.deepEqual([flat[0].width, flat[0].height], [2, 2]);
  // A region's own: 30 by 10 cells are 30 by 20, a unit 10.
  const inner = seen(new Surface(40, 20), { region: { x: 0, y: 0, cols: 30, rows: 10 } });
  assert.deepEqual([inner[0].width, inner[0].height], [3, 2]);
  // On a square grid (cell: 1) a row is one cell width: 30 by 10 cells are 30 by 10, a unit 5.
  const square = seen(new Surface(30, 10, { aspect: 1 }));
  assert.deepEqual([square[0].width, square[0].height], [6, 2]);
  near(square[1].x - square[0].x, square[30].y - square[0].y, "a row as tall as a column is wide");
});

test("a square grid (cell: 1) keeps a circle round with as many rows as columns", () => {
  const p = field({ cols: 30, rows: 30, cell: 1, ramp: "binary" }, (x, y, t, at) => at.r < 0.8);
  const lines = snapshot(p).text.split("\n");
  const across = Math.max(...lines.map((l) => l.split("#").length - 1));
  const down = lines.filter((l) => l.includes("#")).length;
  assert.equal(across, down);
  assert.equal(across, 24);
});

test("field(fn) alone takes every default", () => {
  const p = field((x, y, t, at) => at.r < 0.5);
  assert.deepEqual([p.meta.name, p.meta.cols, p.meta.rows, p.meta.fps, p.meta.palette, p.meta.loop], ["field", 64, 24, 30, undefined, undefined]);
  assert.ok(snapshot(p).text.includes("@"));
  contract(p);
});

test("drawField takes t as given, and 0 for anything not a number", () => {
  const ts: number[] = [];
  const s = new Surface(1, 1);
  drawField(s, (x, y, t) => (ts.push(t), 1), 2.5);
  drawField(s, (x, y, t) => (ts.push(t), 1), NaN);
  assert.deepEqual(ts, [2.5, 0]);
});

test("every option is checked when the piece is made, with what to change", () => {
  const fn: FieldFn = () => 1;
  const bad: [unknown, RegExp][] = [
    [{ ramp: "x" }, /ascii\.rest: a ramp takes a name/],
    [{ ramp: 3 }, /ascii\.rest: a ramp takes a name/],
    [{ colors: ["#000000"], steps: 0 }, /steps takes a whole number of colours from 1 to 64, not 0/],
    [{ steps: 1.5 }, /steps takes a whole number/],
    [{ steps: 65 }, /steps takes a whole number/],
    [{ colors: { light: ["#000000"], dark: ["#ffffff"] }, steps: 33 }, /steps takes up to 32 when colors has a light and a dark list/],
    [{ colors: "red" }, /colors takes a list of #rrggbb, or \{ light, dark \}, not "red"/],
    [{ colors: null }, /colors takes a list/],
    [{ colors: ["red"] }, /a colour takes #rrggbb, not "red"/],
    [{ colors: [] }, /a gradient takes one or more colours/],
    [{ color: 5 }, /color takes a function of the value/],
    [{ color: () => 0 }, /color function picks from the piece's colours: give the spec a palette/],
    [{ colors: ["#000000"], palette: "red" }, /palette takes a list of #rrggbb, or \{ light, dark \}, not "red"/],
    [{ colors: ["#000000"], palette: ["red"] }, /a palette takes colours as #rrggbb, not "red"/],
    [{ colors: ["#000000", "#ffffff"], steps: 64, palette: ["#ff0000"] }, /a palette takes up to 64 colours, light and dark together, not 65/],
    [{ dither: "yes" }, /dither takes true or false, not "yes"/],
    [{ invert: "always" }, /invert takes true, false or "auto", not "always"/],
    [{ aspect: 1 }, /aspect takes true \(circles round\) or false/],
    [{ gamma: 0 }, /gamma takes a number above 0/],
    [{ gamma: -1 }, /gamma takes a number above 0/],
    [{ gamma: NaN }, /gamma takes a number above 0/],
    [{ range: [1, 1] }, /range takes the lowest and highest values/],
    [{ range: [0] }, /range takes the lowest and highest values/],
    [{ range: [0, Infinity] }, /range takes the lowest and highest values/],
    [{ region: { x: NaN, y: 0, cols: 1, rows: 1 } }, /region takes \{ x, y, cols, rows \} in cells/],
    [{ region: 4 }, /region takes/],
    [{ period: 0 }, /period takes the field's loop in seconds, a number above 0, not 0/],
    [{ period: -2 }, /period takes/],
    [{ period: Infinity }, /period takes/],
    // Without the wipe a frame would show the one before wherever the field draws nothing.
    [{ clear: false }, /field\(\) starts every frame empty, so a frame depends only on t.*not false/],
    [{ clear: 0 }, /field\(\) starts every frame empty/],
    [{ cols: 0 }, /cols takes a whole number from 1 to 320, not 0/],
    [{ fps: 61 }, /fps takes a whole number/],
    [null, /field\(\) takes a spec object/],
  ];
  for (const [spec, message] of bad) assert.throws(() => field(spec as never, fn), message, JSON.stringify(spec));
  assert.doesNotThrow(() => field({ clear: true }, fn));
  // A value JSON can't write is still named in the message, not a TypeError of its own.
  const loop: Record<string, unknown> = {};
  loop.self = loop;
  assert.throws(() => field({ region: loop as never }, fn), /ascii\.rest: region takes \{ x, y, cols, rows \} in cells, all numbers, not an object that contains itself/);
  assert.throws(() => field({ gamma: 2n as never }, fn), /ascii\.rest: gamma takes a number above 0, such as 1\.5, not 2n/);
  assert.throws(() => field({}, () => 1n as never), /ascii\.rest: a field's function returns a brightness.*not 1n/);
  assert.throws(() => field({}, () => loop as never), /ascii\.rest: a field's function returns a brightness.*not an object that contains itself/);
  assert.throws(() => field({}, 5 as never), /field\(\) takes a function of x, y and t that returns a brightness 0 to 1, after a spec/);
  assert.throws(() => field({} as never), /field\(\) takes a function of x, y and t/);
  assert.throws(() => field(5 as never), /field\(\) takes a function of x, y and t/);
  assert.throws(() => field({}, (() => undefined) as never), /not undefined: does every path through it return a value\?/);
  assert.throws(() => field({}, (() => "1") as never), /a field's function returns a brightness, a number 0 to 1, true for solid ink, or null where there is nothing, not "1"/);
  // What the function sets for the cell is checked at the centre too.
  assert.throws(() => field({}, (x, y, t, at) => ((at.char = 5 as never), 1)), /at\.char takes one character as a string, such as "\*", or "" for nothing, not 5/);
  assert.throws(() => field({}, (x, y, t, at) => ((at.char = "\n"), 1)), /a cell takes one printable character/);
  assert.throws(() => field({}, (x, y, t, at) => ((at.color = "#ff0000"), 1)), /at\.color picks from the piece's colours: give the spec a palette/);
  assert.throws(() => field({ palette: ["#ff0000"] }, (x, y, t, at) => ((at.color = "red"), 1)), /a colour takes #rrggbb or an index into the palette, not "red"/);
  assert.throws(() => field({ palette: ["#ff0000"] }, (x, y, t, at) => ((at.color = 3), 1)), /colour 3 is not one of the palette's 1/);
  // null, false and true at the centre are fine.
  assert.doesNotThrow(() => field({}, () => null));
  assert.doesNotThrow(() => field({}, () => false));
  assert.doesNotThrow(() => field(() => true));
});

test("a wrong return anywhere in the frame throws, not only at the centre", () => {
  // These are right at the centre, where field() tries the function, and wrong to the right of it.
  for (const [v, message] of [
    [undefined, /not undefined: does every path through it return a value\?/],
    ["1", /not "1"/],
    [{}, /not \{\}/],
  ] as const) {
    const p = field({ cols: 6, rows: 1 }, (x) => (x <= 0 ? 1 : (v as never)));
    assert.throws(() => snapshot(p), message);
  }
});

test("drawField checks what it is given", () => {
  const s = new Surface(2, 2);
  assert.throws(() => drawField({} as never, () => 1, 0), /drawField\(\) takes the Surface to draw into first/);
  // Shaped like a grid but with no way to find a colour: refused up front, not a TypeError mid-frame.
  const shaped = { cols: 2, rows: 1, chars: new Uint16Array(2), colors: new Uint8Array(2), aspect: 2, paper: false, mono: false, palette: null };
  assert.throws(() => drawField(shaped as never, () => 1, 0), /drawField\(\) takes the Surface to draw into first/);
  assert.throws(() => drawField(s, 5 as never, 0), /drawField\(\) takes a function of x, y and t/);
  assert.throws(() => drawField(s, (() => undefined) as never, 0), /not undefined: does every path through it return a value\?/);
  assert.throws(() => drawField(s, (x, y, t, at) => ((at.char = [] as never), 1), 0), /at\.char takes one character as a string/);
  assert.throws(() => drawField(s, () => 1, 0, "blocks" as never), /drawField\(\) takes its options as an object/);
  assert.throws(() => drawField(s, () => 1, 0, { ramp: "" }), /a ramp takes/);
  assert.throws(() => drawField(s, () => 1, 0, { invert: 1 as never }), /invert takes/);
});

test("fast: 64 by 24 well under 4 ms a frame, 200 by 100 under 10 ms", () => {
  const fn: FieldFn = (x, y, t) => Math.sin(Math.sin(x * 3 + t) + Math.sin(y * 4 - 2 * t) + Math.sin(Math.hypot(x, y) * 6 - 4 * t));
  for (const [cols, rows, limit] of [[64, 24, 4], [200, 100, 10]]) {
    const p = field({ cols, rows, range: [-1, 1], dither: true, colors: ["#000000", "#ff0000", "#ffffff"] }, fn);
    const frame = p.default();
    const color = new Uint8Array(cols * rows);
    for (let i = 0; i < 10; i++) frame(i / 30, { color });
    const n = 60, start = performance.now();
    for (let i = 0; i < n; i++) frame(i / 30, { color });
    const ms = (performance.now() - start) / n;
    assert.ok(ms < limit * slack, `${cols} by ${rows}: ${ms.toFixed(2)} ms a frame`);
  }
});
