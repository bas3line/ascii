// node --test src/kit/core.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as donut from "../pieces/donut.ts";
import * as rust from "../pieces/rust.ts";
import { banner } from "../banner.ts";
import { svg } from "../svg.ts";
import { play, still } from "../terminal.ts";
import type { Meta, Piece } from "../types.ts";
import {
  EMPTY,
  INK,
  NONE,
  Palette,
  Surface,
  asPiece,
  bayer,
  checkMeta,
  gradient,
  hash,
  mergePalettes,
  mix,
  mulberry32,
  piece,
  ramp,
  ramps,
  sample,
  shadeChar,
  snapshot,
  specOf,
  spread,
  valueNoise,
} from "./index.ts";

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette.
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

test("a surface sets, gets and leaves out what is outside it", () => {
  const s = new Surface(4, 3);
  s.set(1.7, 2.2, "x");
  assert.equal(s.get(1, 2), "x");
  s.set(-1, 0, "y");
  s.set(4, 0, "y");
  s.set(0, 3, "y");
  assert.equal(s.toString(), "    \n    \n x  ");
  s.set(1, 2, "");
  assert.equal(s.chars[2 * 4 + 1], EMPTY);
  s.set(0, 0, " ");
  assert.equal(s.chars[0], 32);
  assert.equal(s.get(9, 9), "");
  assert.throws(() => s.set(0, 0, "\n"), /ascii\.rest: a cell takes one printable character/);
  assert.throws(() => s.set(0, 0, "😀"), /Basic Multilingual Plane/);
});

test("write, fill, clear and clip", () => {
  const s = new Surface(6, 3);
  s.write(1, 0, "ab\ncd");
  assert.equal(s.toString(), " ab   \n cd   \n      ");
  s.fill("#", undefined, { x: 4, y: 1, cols: 5, rows: 5 });
  assert.equal(s.toString(), " ab   \n cd ##\n    ##");
  s.clear({ x: 0, y: 0, cols: 3, rows: 1 });
  assert.equal(s.toString(), "      \n cd ##\n    ##");
  assert.deepEqual(s.clip({ x: -2, y: 1, cols: 4, rows: 9 }), { x: 0, y: 1, cols: 2, rows: 2 });
  s.clear();
  assert.equal(s.toString(), "      \n      \n      ");
});

test("paste lays one grid over another, spaces and EMPTY transparent, colours mapped", () => {
  const under = Surface.from("......\n......");
  const over = new Surface(3, 2);
  over.write(0, 0, "a b");
  over.colors.fill(1);
  over.colors[1] = NONE;
  under.paste(over, 2, 1);
  assert.equal(under.toString(), "......\n..a.b.");
  const masked = Surface.from("......\n......");
  masked.paste(over, 2, 1, { mask: null });
  assert.equal(masked.toString(), "......\n..a b.");
  const mapped = Surface.from("....");
  over.colors[2] = NONE;
  mapped.paste(over, -1, 0, { map: [9, 7] });
  // "a" is off the left edge, the space lets "." show, "b" has no colour and keeps none
  assert.equal(mapped.toString(), ".b..");
  assert.equal(mapped.colors[1], NONE);
  const coloured = Surface.from("..");
  coloured.paste(Surface.from("q", [1]), 1, 0, { map: [9, 7] });
  assert.equal(coloured.colors[1], 7);
});

test("a frame reads back into a grid, spaces as EMPTY, with its colours", () => {
  const color = Uint8Array.from([1, 1, 2, 0, 3, 0]);
  const s = Surface.from("ab \n c", color);
  assert.equal(s.cols, 3);
  assert.equal(s.rows, 2);
  assert.equal(s.chars[2], EMPTY);
  assert.equal(s.colors[2], NONE);
  assert.equal(s.colors[4], 3);
  assert.equal(s.toString(), "ab \n c ");
});

test("a palette finds colours, the nearest, and the theme's half", () => {
  const p = new Palette(["#000000", "#ff0000", "#00ff00"]);
  assert.equal(p.index("#FF0000"), 1);
  assert.equal(p.index("#ee1111"), 1);
  assert.equal(p.index(2), 2);
  assert.throws(() => p.index(3), /colour 3 is not one of the palette's 3/);
  assert.throws(() => p.index("red"), /takes #rrggbb/);
  const t = new Palette({ light: ["#111111", "#222222"], dark: ["#eeeeee", "#dddddd"] });
  assert.deepEqual(t.colors, ["#111111", "#222222", "#eeeeee", "#dddddd"]);
  assert.equal(t.index(1, true), 1);
  assert.equal(t.index(1, false), 3);
  assert.equal(t.index("#dddddd", false), 3);
  assert.equal(t.index("#dddddd", true), 1);
  assert.deepEqual(new Palette(["#123456"]).colors, ["#123456", "#123456"]);
  assert.throws(() => new Palette({ light: ["#000000"], dark: [] }), /same number of colours/);
  assert.throws(() => new Palette(gradient(["#000000", "#ffffff"], 65)), /up to 64 colours/);
  const inked = new Palette(["#000000", "#ffffff"], { light: 0, dark: 1 });
  assert.equal(inked.ink(true), 0);
  assert.equal(inked.ink(false), 1);
});

test("gradients, mixes and merged palettes", () => {
  assert.deepEqual(gradient(["#000000", "#ffffff"], 3), ["#000000", "#808080", "#ffffff"]);
  assert.deepEqual(gradient(["#ff0000"], 2), ["#ff0000", "#ff0000"]);
  assert.equal(mix("#000000", "#ffffff", 0.25), "#404040");
  const m = mergePalettes([["#000000", "#ff0000"], undefined, ["#FF0000", "#00ff00"]]);
  assert.deepEqual(m.palette, ["#000000", "#ff0000", "#00ff00", INK.light, INK.dark]);
  assert.deepEqual([...m.maps[0]], [0, 1]);
  assert.deepEqual([...m.maps[1]], []);
  assert.deepEqual([...m.maps[2]], [1, 2]);
  assert.deepEqual(m.ink, { light: 3, dark: 4 });
  assert.equal(mergePalettes([undefined, undefined]).ink, null);
  assert.deepEqual(spread({ light: ["#000000"], dark: ["#ffffff", "#000000"] }, 2), { light: ["#000000", "#000000"], dark: ["#ffffff", "#000000"] });
  assert.deepEqual(specOf({ cols: 10 }, "field"), { cols: 10, rows: 24, name: "field" });
  assert.throws(() => specOf(5 as never, "field"), /field\(\) takes a spec object/);
  assert.throws(() => mergePalettes([gradient(["#000000", "#0000ff"], 40), gradient(["#ff0000", "#ffff00"], 40)]), /past the 64/);
});

test("ramps shade, flip on paper and dither", () => {
  assert.equal(ramp("blocks"), " ░▒▓█");
  assert.equal(ramp("ab"), "ab");
  assert.throws(() => ramp("x"), /two or more characters/);
  assert.equal(shadeChar(ramps.standard, 0), " ");
  assert.equal(shadeChar(ramps.standard, 1), "@");
  assert.equal(shadeChar(ramps.standard, 1, true), " ");
  assert.equal(shadeChar(ramps.standard, 2), "@");
  const all = new Set<number>();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) all.add(bayer(x, y));
  assert.equal(all.size, 16);
  assert.ok(Math.min(...all) > -0.5 && Math.max(...all) < 0.5);
});

test("the maths is seeded and the same every time", () => {
  const a = mulberry32(7), b = mulberry32(7);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(hash(1, 2, 3), hash(1, 2, 3));
  assert.notEqual(hash(1, 2, 3), hash(1, 2, 4));
  for (let i = 0; i < 200; i++) {
    const v = valueNoise(i * 0.37, i * 0.11, 3);
    assert.ok(v >= 0 && v <= 1);
  }
  // continuous: a small step moves it a little
  assert.ok(Math.abs(valueNoise(3.5, 2.25) - valueNoise(3.501, 2.25)) < 0.01);
});

test("piece() fills in the meta and checks it as check.ts does", () => {
  const p = piece({ name: "dot", cols: 10, rows: 4 }, (t, s) => s.set(t, 1, "*"));
  assert.deepEqual(p.meta, { name: "dot", category: "generative", note: "dot", cols: 10, rows: 4, fps: 30 });
  assert.throws(() => piece({ name: "", cols: 10, rows: 4 }, () => {}), /takes a name/);
  assert.throws(() => piece({ name: "x", cols: 0, rows: 4 }, () => {}), /cols takes a whole number from 1 to 320/);
  assert.throws(() => piece({ name: "x", cols: 4, rows: 4, fps: 61 }, () => {}), /fps takes a whole number from 0/);
  assert.throws(() => piece({ name: "x", cols: 4, rows: 4, note: "n".repeat(73) }, () => {}), /note takes one line/);
  assert.throws(() => piece({ name: "x", cols: 4, rows: 4, loop: -1 }, () => {}), /loop takes a number of seconds above 0/);
  assert.throws(() => piece({ name: "x", cols: 4, rows: 4, palette: ["#fff"] }, () => {}), /#rrggbb/);
  assert.throws(() => piece({ name: "x", cols: 4, rows: 4, palette: ["#ffffff"], ink: 3 }, () => {}), /colour 3/);
  assert.throws(() => piece({ name: "x", cols: 4, rows: 4 }, 5 as never), /takes a drawing/);
  assert.throws(() => checkMeta({ name: "x", category: "nope", note: "x", cols: 1, rows: 1, fps: 0 } as unknown as Meta), /category takes one of/);
  const f = p.default();
  assert.equal(f(3), "          \n   *      \n          \n          ");
  assert.equal(f(5), "          \n     *    \n          \n          ");
  contract(p);
});

test("a coloured piece writes env.color, by theme, the ink where a cell has none", () => {
  const p = piece(
    { name: "duo", cols: 3, rows: 1, palette: { light: ["#000000", "#aa0000"], dark: ["#ffffff", "#ff5555"] } },
    (t, s, ctx) => {
      s.set(0, 0, "a");
      s.set(1, 0, "b", 1);
      s.set(2, 0, ctx.mono ? "m" : "c", "#ff5555");
    },
  );
  assert.deepEqual(p.meta.palette, ["#000000", "#aa0000", "#ffffff", "#ff5555"]);
  const color = new Uint8Array(3);
  const f = p.default();
  assert.equal(f(0, { color }), "abc");
  assert.deepEqual([...color], [2, 3, 3]);
  f(0, { paper: true, color });
  assert.deepEqual([...color], [0, 1, 1]);
  assert.equal(f(0), "abm");
  contract(p);
});

test("setup runs once a play, options merge, and clear: false keeps what was drawn", () => {
  let setups = 0;
  const p = piece<{ ch: string }>(
    { name: "trail", cols: 5, rows: 1, options: { ch: "o" }, clear: false },
    {
      setup: (o) => {
        setups++;
        return (t, s) => s.set(t, 0, o.ch);
      },
    },
  );
  const f = p.default({ ch: "x" });
  f(0);
  assert.equal(f(2), "x x  ");
  p.default();
  assert.equal(setups, 2);
});

test("sources: text and grids as stills, a library piece sampled into grids", () => {
  const t = asPiece("hi\nthere");
  assert.equal(t.meta.cols, 5);
  assert.equal(t.default()(0), "hi   \nthere");
  contract(t);
  const g = new Surface(3, 1, { palette: new Palette(["#000000", "#ff0000"]) });
  g.set(0, 0, "x", "#ff0000");
  const gp = asPiece(g);
  const color = new Uint8Array(3);
  assert.equal(gp.default()(0, { color }), "x  ");
  assert.equal(color[0], 1);

  // A logo in colour: the grid holds the same characters and colours its frame wrote.
  const r = sample(rust);
  const shot = snapshot(rust, 1.2);
  const grid = r.at(1.2);
  assert.equal(grid.toString(), shot.text);
  for (let i = 0; i < grid.chars.length; i++) if (grid.chars[i] !== EMPTY) assert.equal(grid.colors[i], shot.color![i]);
  assert.equal(r.at(1.2, { mono: true }).colors.every((c) => c === NONE), true);
  // A piece in one ink.
  assert.equal(sample(donut).at(0.5).toString(), snapshot(donut, 0.5).text);
});

// A small coloured piece that loops, for the players below.
const orbit = piece({ name: "orbit", cols: 24, rows: 9, fps: 15, loop: 2, palette: { light: ["#b45309", "#1f2328"], dark: ["#fbbf24", "#f0f6fc"] }, ink: 1 }, (t, s) => {
  const a = (t / 2) * Math.PI * 2;
  s.write(9, 4, "(  )");
  s.set(12 + 10 * Math.cos(a), 4 + 3.5 * Math.sin(a), "@", 0);
});

test("a kit piece plays through svg()", () => {
  contract(orbit);
  const out = svg(orbit, { dark: true });
  assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(out, /animation:2s step-end infinite/);
  assert.match(out, /fill:#fbbf24/);
  assert.ok((out.match(/<g class="f k\d+">/g) ?? []).length > 10, "frames of the loop");
  const paper = svg(orbit);
  assert.match(paper, /fill:#b45309/);
  // and a banner, the library's own maker, beside it in a layout: just a sanity check that both are pieces
  assert.match(svg(banner("kit", { effect: "still" })), /<svg/);
});

test("a kit piece plays through mount() in a <pre>, with the browser stubbed", async () => {
  const g = globalThis as Record<string, unknown>;
  const saved = Object.fromEntries(["HTMLCanvasElement", "getComputedStyle", "matchMedia", "IntersectionObserver", "requestAnimationFrame", "cancelAnimationFrame", "document"].map((k) => [k, g[k]]));
  const frames: ((now: number) => void)[] = [];
  let observer: ((e: { isIntersecting: boolean }[]) => void) | null = null;
  Object.assign(g, {
    HTMLCanvasElement: class {},
    getComputedStyle: () => ({ color: "rgb(31, 35, 40)" }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    IntersectionObserver: class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        observer = cb;
      }
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (cb: (now: number) => void) => frames.push(cb),
    cancelAnimationFrame: () => {},
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
  });
  try {
    const { mount } = await import("../mount.ts");
    const pre = { textContent: "" } as unknown as HTMLElement;
    const stop = mount(pre, orbit);
    // The first frame, on paper: the stubbed text colour is dark.
    assert.equal(pre.textContent, snapshot(orbit, 0, { paper: true, mono: true }).text);
    observer!([{ isIntersecting: true }]);
    const start = performance.now();
    for (let i = 1; i <= 3; i++) frames.shift()!(start + i * 500);
    assert.notEqual(pre.textContent, snapshot(orbit, 0, { paper: true, mono: true }).text);
    assert.equal(pre.textContent!.split("\n").length, orbit.meta.rows);
    stop();
  } finally {
    Object.assign(g, saved);
  }
});

test("a kit piece plays through the terminal", async () => {
  const text = await still(orbit);
  assert.equal(text, snapshot(orbit, 0, { mono: true }).text);
  let written = "";
  const out = { isTTY: true, columns: 80, rows: 24, write: (s: string) => (written += s) };
  const played = await play(orbit, { seconds: 0.3, out });
  assert.deepEqual(played.piece, { cols: 24, rows: 9 });
  assert.equal(played.cropped, false);
  assert.match(written, /\x1b\[38;2;251;191;36m@/, "the moon in its dark-terminal colour");
  assert.match(written, /\(  \)/);
});
