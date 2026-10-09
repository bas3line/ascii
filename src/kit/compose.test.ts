// node --test src/kit/compose.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { banner } from "../banner.ts";
import * as barChart from "../pieces/bar-chart.ts";
import * as donut from "../pieces/donut.ts";
import * as galaxy from "../pieces/galaxy.ts";
import * as gauge from "../pieces/gauge.ts";
import * as oceanSunset from "../pieces/ocean-sunset.ts";
import * as rust from "../pieces/rust.ts";
import { svg } from "../svg.ts";
import { still } from "../terminal.ts";
import type { Piece } from "../types.ts";
import {
  border,
  column,
  crop,
  delay,
  flip,
  freeze,
  grid,
  layer,
  named,
  over,
  pad,
  repeat,
  row,
  scale,
  sequence,
  speed,
  type Anchor,
} from "./compose.ts";
import { INK, Surface, gradient, piece, rgb, snapshot } from "./core.ts";

// The checks scripts/check.ts makes of a frame, on paper and a dark page, in colour and as text: rows lines of cols
// characters, colours inside the palette, and the same frame for the same t from a fresh player.
function contract(p: Piece, times = [0, 0.5, 1, 2.5, 7], { colourOrder = true } = {}) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      const seen: string[] = [];
      for (const t of times) {
        const text = frame(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `${meta.name} t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `${meta.name} t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `${meta.name}: colour ${c} past the palette`);
        seen.push(text + (color && colourOrder ? color.join() : ""));
      }
      // Backwards, from a fresh player: a frame depends on t alone.
      const again = p.default({ ...meta.options });
      const c2 = color && new Uint8Array(color.length);
      [...times].reverse().forEach((t, i) => {
        const text = again(t, { paper, color: c2 });
        assert.equal(text + (c2 && colourOrder ? c2.join() : ""), seen[times.length - 1 - i], `${meta.name} t=${t}: not the same frame twice`);
      });
    }
}

const frame = (p: Piece, t = 0, paper = false) => p.default({ ...p.meta.options })(t, { paper });
// A frame in colour, and each cell's colour as #rrggbb.
function colours(p: Piece, t = 0, paper = false) {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default({ ...p.meta.options })(t, { paper, color });
  return { text, hex: [...color].map((c) => p.meta.palette![c]) };
}

// Small pieces to compose.
const dots = piece({ name: "dots", cols: 6, rows: 3, fps: 0 }, (t, s) => s.fill("."));
const clock = piece({ name: "clock", cols: 4, rows: 1, fps: 10 }, (t, s) => s.write(0, 0, t.toFixed(1)));
const looper = (loop: number) => piece({ name: `loop ${loop}`, cols: 2, rows: 1, fps: 10, loop }, (t, s) => s.write(0, 0, String(Math.floor(t * 10) % 10)));
const duo = piece({ name: "duo", cols: 2, rows: 1, fps: 0, palette: ["#ff0000", "#00ff00"] }, (t, s) => {
  s.set(0, 0, "r", 0);
  s.set(1, 0, "g", 1);
});
const themed = piece({ name: "themed", cols: 1, rows: 1, fps: 0, palette: { light: ["#000000"], dark: ["#ffffff"] } }, (t, s) => s.set(0, 0, "x", 0));
const square = piece({ name: "square", cols: 4, rows: 4, fps: 0, cell: 1 }, (t, s) => s.fill("."));
const block = (ch: string) => piece({ name: ch, cols: 8, rows: 4, fps: 0 }, (t, s) => s.fill(ch));

test("layer stacks in order, spaces letting what is under show unless the mask says otherwise", () => {
  assert.equal(frame(layer(dots, { src: "ab\nc d", x: 1, y: 1 })), "......\n.ab...\n.c.d..");
  assert.equal(frame(layer(dots, { src: "ab\nc d", x: 1, y: 1, mask: null })), "......\n.ab ..\n.c d..");
  assert.equal(frame(layer(dots, { src: "ab\nc d", x: 1, y: 1, mask: "b" })), "......\n.a....\n.c.d..");
  // later layers on top, and off the edge left out
  assert.equal(frame(layer(dots, "aaa", "b", { src: "zz", x: 5, y: 2 })), "baa...\n......\n.....z");
  assert.equal(layer(dots, "aaa", "b").meta.name, '"b" over "aaa" over dots');
  // the base alone is itself, and a blank text a 1 by 1 blank
  assert.equal(frame(layer(dots)), frame(dots));
  assert.equal(frame(layer("")), " ");
  contract(layer(dots, { src: "ab\nc d", x: 1, y: 1 }));
});

test("anchors put a layer on the nine points of the piece under it, x and y moving it from there", () => {
  const spots: Record<Anchor, [number, number]> = {
    "top-left": [0, 0], top: [2, 0], "top-right": [4, 0], left: [0, 1], center: [2, 1], right: [4, 1],
    "bottom-left": [0, 2], bottom: [2, 2], "bottom-right": [4, 2],
  };
  for (const [anchor, [x, y]] of Object.entries(spots)) {
    const lines = frame(layer(dots, { src: "xy", anchor: anchor as Anchor })).split("\n");
    assert.equal(lines[y].indexOf("xy"), x, anchor);
  }
  assert.equal(frame(over("xy", dots)), "......\n..xy..\n......");
  assert.equal(frame(over("xy", dots, { anchor: "bottom-right", x: -1 })), "......\n......\n...xy.");
  assert.equal(over("xy", dots).meta.name, '"xy" over dots');
});

test("a margin keeps a layer in from the edges its anchor puts it against, and only those", () => {
  const big = piece({ name: "big", cols: 8, rows: 5, fps: 0 }, (t, s) => s.fill("."));
  const spot = (anchor: Anchor, margin: number) => {
    const lines = frame(layer(big, { src: "x", anchor, margin })).split("\n");
    const y = lines.findIndex((l) => l.includes("x"));
    return [lines[y].indexOf("x"), y];
  };
  assert.deepEqual(spot("top-left", 1), [1, 1]);
  assert.deepEqual(spot("bottom-right", 1), [6, 3]);
  assert.deepEqual(spot("bottom-right", 2), [5, 2]);
  assert.deepEqual(spot("top", 2), [3, 2], "centred across, two rows down");
  assert.deepEqual(spot("right", 3), [4, 2], "centred down, three columns in");
  assert.deepEqual(spot("center", 2), [3, 2], "nothing to keep from");
  // x and y still move it from there
  assert.equal(frame(over("xy", dots, { anchor: "bottom-right", margin: 1, x: -1 })), "......\n..xy..\n......");
});

test("a layer with a move crosses the piece under it toward a side and comes round again", () => {
  // From its anchor's spot at t = 0, a cell a second here: 6 columns and its own 1 to cross in 7 seconds.
  const right = layer(dots, { src: "o", anchor: "left", move: { to: "right", period: 7 } });
  const row1 = (p: Piece, t: number) => frame(p, t).split("\n")[1];
  assert.deepEqual([0, 1, 2.5, 5, 6, 7, 8].map((t) => row1(right, t)), ["o.....", ".o....", "..o...", ".....o", "......", "o.....", ".o...."]);
  const left = layer(dots, { src: "o", anchor: "left", move: { to: "left", period: 7 } });
  assert.deepEqual([0, 1, 2].map((t) => row1(left, t)), ["o.....", "......", ".....o"]);
  // up and down, by rows: 3 rows and its own 1 in 4 seconds; the anchor still places it across
  const down = layer(dots, { src: "o", anchor: "top-right", move: { to: "down", period: 4 } });
  assert.deepEqual([0, 1, 2, 3, 4].map((t) => frame(down, t)), [".....o\n......\n......", "......\n.....o\n......", "......\n......\n.....o", "......\n......\n......", ".....o\n......\n......"]);
  const up = layer(dots, { src: "o", anchor: "bottom", move: "up" });
  assert.equal(frame(up, 0), "......\n......\n..o...");
  assert.equal(frame(up, 2), "......\n..o...\n......", "8 seconds a crossing by default: 4 rows in 8 seconds");
  // a wide layer leaves entirely before it comes back, in from the far side a cell at a time
  const wide = layer(dots, { src: "abcd", move: { to: "right", period: 10 } });
  const row0 = (t: number) => frame(wide, t).split("\n")[0];
  assert.deepEqual([0, 2, 6, 7, 8, 9, 10].map(row0), ["abcd..", "..abcd", "......", "d.....", "cd....", "bcd...", "abcd.."]);
  contract(right);
  contract(up);
});

test("a move's period is the whole's loop by the kit's time rule, and it takes frames over stills", () => {
  const ship = (period: number) => ({ src: "o", move: { to: "right" as const, period } });
  assert.equal(layer(dots, ship(7)).meta.loop, 7);
  assert.equal(layer(dots, ship(7)).meta.fps, 24, "a moving layer over a still needs frames");
  assert.equal(layer(dots, "x").meta.fps, 0);
  assert.equal(layer(looper(2), ship(3)).meta.loop, 6);
  assert.equal(layer(clock, ship(3)).meta.loop, 3, "a part that never repeats counts as repeating with the move");
  assert.equal(layer(dots, ship(2), ship(3)).meta.loop, 6, "two moves");
  assert.equal(layer(looper(7), ship(11)).meta.loop, undefined, "77 seconds is past 60");
  assert.equal(layer(dots, ship(2), { src: "z", x: (t) => t }).meta.loop, undefined, "a function of t has no period");
  assert.equal(layer(dots, { src: "o", move: "left" }).meta.loop, 8);
  assert.equal(frame(layer(dots, ship(7)), 9), frame(layer(dots, ship(7)), 2), "the same frame a loop later");
  // with no period of its own, a crossing fits the parts' loop: the whole number of it nearest 8 seconds
  const fits = (...parts: Piece[]) => layer(parts[0], ...parts.slice(1), { src: "o", move: "right" }).meta.loop;
  assert.equal(fits(looper(3)), 9);
  assert.equal(fits(looper(0.5)), 8);
  assert.equal(fits(looper(2), looper(5)), 10);
  assert.equal(fits(rust), 10, "a logo's glint every 5 seconds: two of them");
  assert.equal(fits(looper(12)), 12, "one loop when it is longer than 8 seconds");
  assert.equal(fits(clock, looper(3)), 9, "a part that never repeats aside");
  assert.equal(fits(looper(20)), 40, "past 16 seconds it is 8, and the loop their least common multiple");
});

test("a layer moves by a function of t, which takes frames and leaves the loop to repeat()", () => {
  const moving = layer(dots, { src: "o", x: (t) => t * 2, y: 1 });
  assert.equal(moving.meta.fps, 24);
  assert.equal(moving.meta.loop, undefined);
  assert.equal(frame(moving, 0), "......\no.....\n......");
  assert.equal(frame(moving, 1.6), "......\n...o..\n......");
  assert.equal(frame(moving, 10), "......\n......\n......");
  assert.equal(repeat(moving, 3).meta.loop, 3);
  assert.equal(frame(repeat(moving, 3), 3.5), frame(moving, 0.5));
  contract(moving);
});

test("parts of character cells on a square grid have their rows doubled, and the other way halved", () => {
  const laid = over("ab", square);
  assert.equal(laid.meta.cell, 1);
  assert.equal(frame(laid), "....\n.ab.\n.ab.\n....");
  const side = row(["ab", square], { gap: 0 });
  assert.equal(side.meta.cell, undefined);
  assert.deepEqual([side.meta.cols, side.meta.rows], [6, 2]);
  // the square grid's 4 rows halve to 2; "ab", one row, sits at the top of the middle
  assert.equal(frame(side), "ab....\n  ....");
});

test("row, column and grid: sizes, gaps and alignment", () => {
  assert.equal(frame(row(["ab", "c\nd\ne", "f"], { gap: 1 })), "   c  \nab d f\n   e  ");
  assert.equal(frame(row(["ab", "c\nd\ne", "f"], { gap: 1, align: "top" })), "ab c f\n   d  \n   e  ");
  assert.equal(frame(row(["ab", "c\nd\ne", "f"], { gap: 1, align: "bottom" })), "   c  \n   d  \nab e f");
  assert.equal(row(["a", "b"]).meta.cols, 4, "a gap of 2 by default");
  assert.equal(frame(column(["abc", "d", "ef"], { gap: 0 })), "abc\n d \nef ");
  assert.equal(frame(column(["abc", "d", "ef"], { gap: 0, align: "right" })), "abc\n  d\n ef");
  assert.equal(frame(column(["abc", "d", "ef"], { gap: 0, align: "left" })), "abc\nd  \nef ");
  assert.equal(frame(column(["abc", "d", "ef"])), "abc\n   \n d \n   \nef ", "a gap of 1 by default");
  assert.equal(frame(grid(["a", "bb", "ccc", "d"], { columns: 2, gap: [1, 0] })), " a  bb\nccc d ");
  assert.equal(frame(grid(["a", "bb", "ccc", "d"], { columns: 2, gap: [1, 0], align: "top-left" })), "a   bb\nccc d ");
  assert.deepEqual([grid(["a", "b", "c"], { columns: 2 }).meta.cols, grid(["a", "b", "c"], { columns: 2 }).meta.rows], [4, 3]);
  // more columns than parts is one row
  assert.equal(frame(grid(["a", "b"], { columns: 5, gap: 0 })), "ab");
  assert.equal(row(["a", dots, "b"]).meta.name, '"a", dots and "b"');
  contract(grid(["a", "bb", "ccc", "d"], { columns: 2 }));
});

test("borders: a box round a piece with a title, and a grid's boxes the size of their cells", () => {
  assert.equal(frame(border("hello", { title: "hi", style: "single" })), "┌─ hi ──┐\n│ hello │\n└───────┘");
  assert.equal(frame(border(dots, { title: true })).split("\n")[0], "╭─ dots ─╮");
  assert.equal(frame(border("x", { style: "ascii", pad: 0 })), "+-+\n|x|\n+-+");
  assert.equal(frame(border("x", { style: "abcdef", pad: [1, 0] })), "aeb\nf f\nfxf\nf f\nced");
  assert.equal(frame(grid(["ab", "c"], { columns: 2, gap: [1, 0], border: { pad: 0 } })), "╭──╮ ╭─╮\n│ab│ │c│\n╰──╯ ╰─╯");
  // each box is its cell's size, so a short part sits in a box as tall as its row's
  assert.equal(frame(grid(["a", "b\nb"], { columns: 2, gap: 0, border: { pad: 0, style: "ascii" } })), "+-++-+\n|a||b|\n| ||b|\n+-++-+");
  // a coloured border in colour: the lines in it, the text in INK
  const boxed = border("ab", { color: "#ff8800", style: "ascii", pad: 0 });
  const c = colours(boxed);
  assert.equal(c.text, "+--+\n|ab|\n+--+");
  assert.equal(c.hex[0], "#ff8800");
  assert.equal(c.hex[5], INK.dark);
  assert.equal(colours(boxed, 0, true).hex[5], INK.light);
  // a border with no colour round a coloured piece is in INK, not the piece's first colour
  const plain = colours(border(duo, { pad: 0 }));
  assert.equal(plain.hex[0], INK.dark);
  assert.equal(plain.hex[5], "#ff0000");
  contract(boxed);
});

test("crop, pad, scale and flip, exactly", () => {
  assert.equal(frame(crop("abc\ndef\nghi", { x: 1, y: 1, cols: 5, rows: 5 })), "ef\nhi");
  assert.equal(frame(crop("abc\ndef\nghi", { x: -1, y: 0, cols: 2, rows: 1 })), "a");
  assert.equal(frame(pad("ab", [1, 2])), "      \n  ab  \n      ");
  assert.equal(frame(pad("ab", 1)), "    \n ab \n    ");
  assert.equal(frame(pad("ab", { left: 1, bottom: 1 })), " ab\n   ");
  assert.equal(frame(scale("ab\ncd", 2)), "aabb\naabb\nccdd\nccdd");
  assert.equal(frame(scale("ab", [3, 1])), "aaabbb");
  assert.equal(frame(flip("/(┌▀\n ab", "x")), "▀┐)\\\n da ");
  assert.equal(frame(flip("/(┌▀\n ab", "y")), " ap \n\\(└▄");
  assert.equal(frame(flip("/(┌▀\n ab", "both")), " qa \n▄┘)/");
  // braille's dots move: dot 1 to dot 4 across, to dot 7 down, to dot 8 both ways
  assert.equal(frame(flip("⠁", "x")), "⠈");
  assert.equal(frame(flip("⠁", "y")), "⡀");
  assert.equal(frame(flip("⠁", "both")), "⢀");
  // flipping twice is the piece again, a library logo in colour included
  const twice = flip(flip(rust, "both"), "both");
  assert.equal(frame(twice, 1.3), frame(rust, 1.3));
  assert.deepEqual(colours(twice, 1.3).hex, colours(rust, 1.3).hex);
  // a one-part whole takes the part's options, as the part does
  assert.deepEqual(crop(rust, { x: 0, y: 0, cols: 4, rows: 4 }).meta.options, { shine: 5 });
  for (const p of [crop(rust, { x: 10, y: 5, cols: 30, rows: 12 }), pad(rust, [1, 2]), scale(duo, 2), flip(rust, "x")]) contract(p);
});

test("colours: each part keeps its own, a part in one ink gets INK, themes resolve, and past 64 they fold", () => {
  const r = row([duo, "m"], { gap: 0 });
  assert.deepEqual(r.meta.palette, ["#ff0000", "#00ff00", INK.light, INK.dark]);
  assert.deepEqual(colours(r).hex, ["#ff0000", "#00ff00", INK.dark]);
  assert.deepEqual(colours(r, 0, true).hex, ["#ff0000", "#00ff00", INK.light]);
  // a themed part: its light colour on paper, its dark one on a dark page
  const t = layer(duo, themed);
  assert.equal(colours(t, 0, true).hex[0], "#000000");
  assert.equal(colours(t, 0, false).hex[0], "#ffffff");
  // nothing coloured: no palette, plain text
  assert.equal(row(["a", "b"]).meta.palette, undefined);
  // a library logo keeps its colours exactly, beside text in INK
  const logo = row([rust, "m"]);
  const mine = colours(logo, 1.2), its = colours(rust, 1.2);
  const lines = mine.text.split("\n");
  its.text.split("\n").forEach((line, y) => {
    assert.equal(lines[y].slice(0, rust.meta.cols), line);
    for (let x = 0; x < line.length; x++) if (line[x] !== " ") assert.equal(mine.hex[y * logo.meta.cols + x], its.hex[y * rust.meta.cols + x]);
  });
  // in one ink it is the logo's own text
  assert.equal(frame(row([rust])), snapshot(rust, 0, { mono: true }).text);
  // 80 colours between two parts fold to 64, each cell's colour near its own
  const ramp = (stops: string[]) => {
    const colors = gradient(stops, 40);
    return piece({ name: stops[0], cols: 40, rows: 1, fps: 0, palette: colors }, (t, s) => colors.forEach((c, i) => s.set(i, 0, "#", c)));
  };
  const blue = ramp(["#000000", "#0000ff"]), warm = ramp(["#ff0000", "#ffff00"]);
  const both = row([blue, warm], { gap: 0 });
  assert.equal(both.meta.palette!.length, 64);
  const got = colours(both).hex;
  const want = [...colours(blue).hex, ...colours(warm).hex];
  got.forEach((c, i) => {
    const [a, b] = [rgb(c), rgb(want[i])];
    assert.ok(a.every((v, k) => Math.abs(v - b[k]) <= 16), `cell ${i}: ${c} for ${want[i]}`);
  });
  assert.equal(got[0], "#000000", "the first part's first colour is kept exactly");
  contract(both);
});

test("the loop: the least common multiple of the parts', within 60 seconds, stills counting as any", () => {
  assert.equal(layer(looper(2), looper(3)).meta.loop, 6);
  assert.equal(row([looper(0.5), "still"]).meta.loop, 0.5);
  assert.equal(layer(looper(2), clock).meta.loop, undefined, "a part that never repeats");
  assert.equal(layer(looper(7), looper(11)).meta.loop, undefined, "77 seconds is past 60");
  assert.equal(layer(looper(1 / 3), looper(1)).meta.loop, undefined, "not a whole number of hundredths");
  assert.equal(layer({ src: looper(2), speed: 2 }, looper(3)).meta.loop, 3);
  // a logo repeats on its glint, `shine` seconds
  assert.equal(row([rust, looper(2)]).meta.loop, 10);
  assert.equal(row([{ src: rust, options: { shine: 3 } }, looper(2)]).meta.loop, 6);
  // a whole of one part repeats as the part does, a logo's glint included, at the clip's speed
  assert.equal(crop(rust, { x: 0, y: 0, cols: 4, rows: 4 }).meta.loop, 5);
  assert.equal(pad({ src: rust, speed: 2 }, 1).meta.loop, 2.5);
  assert.equal(named(rust, "r").meta.loop, undefined, "renamed as it was, its meta is its own");
  assert.equal(named({ src: rust, speed: 2 }, "r").meta.loop, 2.5);
  // stills only: a still
  const s = row(["a", "b"]);
  assert.equal(s.meta.fps, 0);
  assert.equal(s.meta.loop, undefined);
  assert.equal(row([looper(2), clock]).meta.fps, 10, "the largest of the parts' frame rates");
});

test("a clip's own clock: options, offset and speed", () => {
  const p = row([{ src: clock, offset: 1 }, { src: clock, speed: 2 }, { src: clock, offset: -1 }], { gap: 1 });
  assert.equal(frame(p, 0.5), "1.5  1.0  0.0 ");
  assert.equal(frame(p, 2), "3.0  4.0  1.0 ");
  const chart = row([{ src: barChart, options: { title: "hello there" } }]);
  assert.match(frame(chart, 1), /hello there/);
});

test("a negative offset holds the first frame, so the clip no longer repeats and gives no loop", () => {
  const held = { src: looper(2), offset: -1 };
  for (const p of [row([held, "x"]), crop(held, { x: 0, y: 0, cols: 2, rows: 1 }), speed(held, 2), named(held, "held"), grid([held, looper(2)])])
    assert.equal(p.meta.loop, undefined, p.meta.name);
  // a positive offset starts further in and still repeats
  assert.equal(row([{ src: looper(2), offset: 1 }, "x"]).meta.loop, 2);
  // what the loop promises, frames keep: the same frame a loop later
  const kept = row([{ src: looper(2), offset: 0.5 }, looper(3)]);
  assert.equal(kept.meta.loop, 6);
  for (const t of [0.2, 1.7, 4.1]) assert.equal(frame(kept, t), frame(kept, t + 6), `t=${t}`);
});

test("a clip's color paints it: text and pieces in one ink, coloured pieces too, per theme", () => {
  // words in a colour over a piece in one ink, which is drawn in INK
  const words = over({ src: "ab", color: "#ff8800" }, dots);
  assert.deepEqual(words.meta.palette, ["#ff8800", INK.light, INK.dark]);
  const dark = colours(words), light = colours(words, 0, true);
  assert.equal(dark.text, "......\n..ab..\n......");
  assert.deepEqual([dark.hex[8], dark.hex[9], dark.hex[0]], ["#ff8800", "#ff8800", INK.dark]);
  assert.deepEqual([light.hex[8], light.hex[0]], ["#ff8800", INK.light]);
  // one colour for each theme
  const themedWords = row([{ src: "x", color: { light: "#111111", dark: "#eeeeee" } }]);
  assert.equal(colours(themedWords, 0, true).hex[0], "#111111");
  assert.equal(colours(themedWords, 0, false).hex[0], "#eeeeee");
  // a coloured piece is played in one ink and drawn all in the clip's colour, its own colours left out
  const blue = row([{ src: duo, color: "#0000ff" }]);
  assert.deepEqual(blue.meta.palette, ["#0000ff", "#0000ff"]);
  assert.deepEqual(colours(blue).hex, ["#0000ff", "#0000ff"]);
  const white = row([{ src: rust, color: "#ffffff" }]);
  assert.equal(colours(white, 1.2).text, snapshot(rust, 1.2, { mono: true }).text);
  assert.ok(colours(white, 1.2).hex.every((c) => c === "#ffffff"));
  // without env.color, nothing changes: the same text
  assert.equal(frame(words, 0), frame(over("ab", dots), 0));
  // everything that takes a clip takes its colour, time and shape alike
  const gold = { src: "ab", color: "#fbbf24" };
  for (const p of [crop(gold, { x: 1, y: 0, cols: 1, rows: 1 }), pad(gold, 1), scale(gold, 2), flip(gold, "x"), border(gold), speed(gold, 2), delay(gold, 1), repeat(gold, 1), freeze(gold, 1), named(gold, "gold"), sequence([gold, "cd"], { seconds: 1, transition: "cut" })]) {
    assert.ok(p.meta.palette?.includes("#fbbf24"), `${p.meta.name}: its palette has the colour`);
    const c = colours(p, 0.25);
    const at = c.text.replace(/\n/g, "").search(/[ab]/);
    assert.equal(c.hex[at], "#fbbf24", `${p.meta.name}: drawn in it`);
    contract(p);
  }
  // a moving gold ship over a starfield on a stage of its own size, colours in the palette, the same frame for the same t
  const stage = layer(new Surface(40, 10), { src: galaxy, anchor: "center" }, { src: "<o>", color: "#fbbf24", anchor: "bottom", move: "right" });
  assert.deepEqual([stage.meta.cols, stage.meta.rows], [40, 10]);
  contract(stage, [0, 0.5, 1, 2.5, 7], { colourOrder: true });
});

test("a piece file imported whole is its default export, and grid's columns default to a square", () => {
  assert.equal(frame(row([{ default: dots } as never, "x"])), frame(row([dots, "x"])));
  assert.equal(frame(layer({ src: { default: dots } as never })), frame(dots));
  assert.equal(frame(grid(["a", "b", "c", "d"], { gap: 0 })), "ab\ncd");
  assert.equal(frame(grid(["a", "b", "c", "d", "e"], { gap: 0 })), "abc\nde ");
  assert.equal(frame(grid(["a"])), "a");
  assert.equal(grid(Array(9).fill("x"), { gap: 0 }).meta.cols, 3);
});

test("a frame at about 80 by 24 takes well under 4 ms, transitions and moves included", () => {
  const title = banner("kit", { color: ["#67e8f9", "#c084fc"] });
  const scene = layer(new Surface(80, 24), { src: donut, anchor: "left", margin: 2 }, { src: title, anchor: "top-right", margin: 1 }, { src: "<o>", color: "#fbbf24", anchor: "bottom", move: "right" });
  const shows = sequence([scene, galaxy, grid([rust, "ascii.rest"])], { seconds: 1, overlap: 0.5 });
  for (const p of [scene, shows]) {
    const color = new Uint8Array(p.meta.cols * p.meta.rows);
    const f = p.default({ ...p.meta.options });
    for (let i = 0; i < 30; i++) f(i / 30, { color });
    const start = performance.now();
    for (let i = 0; i < 300; i++) f(i / 30, { color });
    const ms = (performance.now() - start) / 300;
    assert.ok(ms < 4, `${p.meta.name}: ${ms.toFixed(3)} ms a frame`);
  }
});

test("sequence: steps in turn, each in its own time, looping or holding the last", () => {
  const cut = sequence(["1", "2", "3"], { seconds: 1, transition: "cut" });
  assert.equal(cut.meta.loop, 3);
  assert.equal(cut.meta.fps, 24);
  assert.deepEqual([0.5, 1.5, 2.5, 3.5, 4.2].map((t) => frame(cut, t)), ["1", "2", "3", "1", "2"]);
  assert.equal(cut.meta.name, '"1", then "2", then "3"');
  const once = sequence(["1", "2", "3"], { seconds: 1, transition: "cut", loop: false });
  assert.equal(once.meta.loop, undefined);
  assert.equal(once.meta.still, 2);
  assert.equal(frame(once, 9), "3");
  // the size of the largest, each centred
  const sized = sequence(["a", "bbb\nbbb"], { transition: "cut" });
  assert.deepEqual([sized.meta.cols, sized.meta.rows], [3, 2]);
  assert.equal(frame(sized, 0), " a \n   ");
  // a step's own seconds
  const steps = sequence([{ src: "1", seconds: 2 }, "2"], { seconds: 1, transition: "cut" });
  assert.equal(steps.meta.loop, 3);
  assert.deepEqual([1.5, 2.5].map((t) => frame(steps, t)), ["1", "2"]);
  // each step's time starts when it first shows: looping, the first shows in the last's transition
  const timed = sequence([clock, clock], { seconds: 2, overlap: 0.5, transition: "cut" });
  assert.deepEqual([0.3, 2.3].map((t) => frame(timed, t)), ["0.3 ", "0.3 "]);
  const melt = sequence([clock, clock], { seconds: 2, overlap: 0.5 });
  assert.equal(frame(melt, 1), "1.5 ");
  assert.equal(frame(melt, 2.3), "0.8 ");
  assert.equal(melt.meta.loop, 4);
  // one step that cuts back to itself moves only if it does
  assert.equal(sequence(["a"], { transition: "cut" }).meta.fps, 0);
  contract(cut);
  contract(melt);
});

test("transitions: dissolve, fade and wipe run from one step to the next", () => {
  const a = block("a"), b = block("b");
  const at = (transition: "dissolve" | "fade" | "wipe", t: number) => frame(sequence([a, b], { seconds: 2, overlap: 1, transition }), t);
  const A = frame(a), B = frame(b);
  for (const tr of ["dissolve", "fade", "wipe"] as const) {
    assert.equal(at(tr, 0.99), A, `${tr}: before`);
    assert.equal(at(tr, 1), A, `${tr}: at the start`);
    assert.equal(at(tr, 1.9999), B, `${tr}: at the end`);
    assert.equal(at(tr, 2.5), B, `${tr}: after`);
  }
  // halfway through a dissolve both show, with an edge where cells are crossing
  const mid = at("dissolve", 1.5);
  for (const ch of "ab") assert.ok(mid.includes(ch), `dissolve shows ${ch}`);
  assert.match(mid, /[.:]/);
  // the dissolve's patches are its seed's
  const seeded = (seed: number) => frame(sequence([a, b], { seconds: 2, overlap: 1, seed }), 1.5);
  assert.equal(seeded(4), seeded(4));
  assert.notEqual(seeded(4), seeded(5));
  // a fade thins down the ramp to nothing at its middle, then thickens
  assert.match(at("fade", 1.25), /^[ .:\-=+*#%@\n]+$/);
  assert.equal(at("fade", 1.5).trim(), "");
  // a wipe: the next step on the left, a band, this one on the right
  const lines = at("wipe", 1.5).split("\n");
  assert.ok(lines.every((l) => /^b*[░▒▓]+a*$/.test(l)), lines.join("|"));
  assert.throws(() => sequence(["a"], { seconds: 1, overlap: 2 }), /overlap, 2 seconds, is longer than step 1's 1/);
});

test("time: speed, delay, repeat and freeze", () => {
  assert.equal(frame(speed(clock, 2), 1), "2.0 ");
  assert.equal(speed(looper(2), 2).meta.loop, 1);
  assert.equal(speed(rust, 2).meta.loop, 2.5, "a logo's glint period too");
  const late = delay(clock, 1);
  assert.deepEqual([0.5, 1.5].map((t) => frame(late, t)), ["0.0 ", "0.5 "]);
  assert.equal(delay(looper(2), 1).meta.loop, undefined);
  const again = repeat(clock, 1.5);
  assert.equal(again.meta.loop, 1.5);
  assert.equal(frame(again, 2), "0.5 ");
  assert.equal(repeat("still", 2).meta.loop, undefined, "a still repeated is still a still");
  const held = freeze(clock, 3);
  assert.equal(held.meta.fps, 0);
  assert.deepEqual([0, 5].map((t) => frame(held, t)), ["3.0 ", "3.0 "]);
  // time passes frames straight through: a logo's colours are its own
  assert.deepEqual(colours(speed(rust, 2), 1).hex, colours(rust, 2).hex);
  const typed = banner("hi", { effect: "type" });
  assert.equal(delay(typed, 1).meta.still, (typed.meta.still ?? 0) + 1);
  for (const p of [speed(clock, 2), late, again, held]) contract(p);
});

test("named renames a piece and keeps the rest, a banner's motion too", () => {
  const typed = banner("hi", { effect: "type" });
  const n = named(typed, "greeting", { note: "hi, typed" });
  assert.equal(n.meta.name, "greeting");
  assert.equal(n.meta.note, "hi, typed");
  assert.equal(n.meta.still, typed.meta.still);
  assert.deepEqual((n as unknown as typeof typed).motion, typed.motion);
  assert.equal(frame(n, 0.5), frame(typed, 0.5));
  assert.equal(named(over("x", dots), "x on dots").meta.note, "x on dots");
});

test("library pieces compose and play through svg() and the terminal", async () => {
  // a dashboard: each chart's own frame, in its cell
  const dash = grid([barChart, gauge], { columns: 2 });
  assert.deepEqual([dash.meta.cols, dash.meta.rows], [60 + 2 + 55, 19]);
  const lines = frame(dash, 1).split("\n");
  frame(barChart, 1).split("\n").forEach((l, y) => assert.equal(lines[y].slice(0, 60), l));
  frame(gauge, 1).split("\n").forEach((l, y) => assert.equal(lines[y].slice(62), l));
  // a gradient banner over a scene: 105 colours folded to 64, the scene's ground kept, the banner's rows doubled
  const title = banner("hi", { color: ["#fde68a", "#fb7185"] });
  const sky = over(title, oceanSunset, { y: -30 });
  assert.equal(sky.meta.ground, oceanSunset.meta.ground);
  assert.equal(sky.meta.cell, 1);
  assert.ok(sky.meta.palette!.length <= 64);
  assert.match(frame(sky, 0), /▓▓▓▓/);
  // The scene's own colours at t depend on the frames it drew before (about 600 of its cells, played on its own), so
  // only the text is held to the same frame out of order here; in order, as the players play, colours match too.
  contract(sky, [0, 1.5], { colourOrder: false });
  const inOrder = (p: Piece) => {
    const color = new Uint8Array(p.meta.cols * p.meta.rows);
    const f = p.default({ ...p.meta.options });
    return [0, 0.5, 1].map((t) => f(t, { color }) + color.join());
  };
  assert.deepEqual(inOrder(sky), inOrder(sky));
  // svg(): a sequence animates over its loop, a still is one frame
  const seq = sequence([rust, "hello"], { seconds: 2 });
  const out = svg(seq, { dark: true });
  assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(out, /animation:4s step-end infinite/);
  assert.match(out, /fill:#f74c00/);
  assert.doesNotMatch(svg(row(["a", "b"])), /animation/);
  // the terminal holds it still at its still moment
  assert.equal(await still(seq), snapshot(seq, seq.meta.still ?? 0, { mono: true }).text);
});

test("every option is checked when the piece is made, with an error that says what to change", () => {
  const bad: [() => unknown, RegExp][] = [
    [() => row([]), /row\(\) takes a list of one or more parts/],
    [() => row([5 as never]), /row\(\) takes pieces, text, Surfaces or \{ src \} clips, not 5/],
    [() => row([{ default: 5 } as never]), /row\(\) takes pieces, text, Surfaces or \{ src \} clips, not an object/],
    [() => row(["a"], { gap: -1 }), /row's gap takes a whole number of 0 or more, not -1/],
    [() => row(["a"], { align: "up" as never }), /row's align takes "top", "middle" or "bottom", not "up"/],
    [() => column(["a"], { gap: 0.5 }), /column's gap takes a whole number/],
    [() => grid(["a"], 2 as never), /grid\(\) takes an object of options, not 2/],
    [() => grid(["a"], { columns: 0 }), /grid's columns takes a whole number of 1 or more, not 0/],
    [() => grid(["a"], { columns: 1, gap: [1] as never }), /grid's gap takes a number, or \[columns, rows\]/],
    [() => grid(["a"], { columns: 1, border: { style: "abc" } }), /a border's style takes "single", "double", "rounded", "heavy" or "ascii", or 6 characters/],
    [() => layer("a", { src: "b", anchor: "middle" as never }), /a layer's anchor takes "top-left"/],
    [() => layer("a", { src: "b", mask: "ab" }), /a layer's mask takes one character, or null/],
    [() => layer("a", { src: "b", x: () => NaN }), /returns a number, not NaN at t = 0/],
    [() => layer("a", { src: "b", y: "2" as never }), /a layer's y takes a number of cells/],
    [() => layer("a", { src: "b", speed: 0 }), /a clip's speed takes a number above 0, not 0/],
    [() => layer("a", { src: "b", offset: NaN }), /a clip's offset takes a number of seconds, not NaN/],
    [() => layer("a", { src: "b", color: "gold" }), /a clip's color takes #rrggbb, or \{ light, dark \}, not "gold"/],
    [() => row(["a", { src: "b", color: { light: "#000000" } as never }]), /a clip's color takes #rrggbb, or \{ light, dark \}, not an object/],
    [() => over("🚀", "....."), /text takes characters from the Basic Multilingual Plane, one a cell, so not emoji/],
    [() => flip("a🚀", "x"), /so not emoji/],
    [() => layer("a", { src: "b", margin: -1 }), /a layer's margin takes a whole number of 0 or more, not -1/],
    [() => layer("a", { src: "b", move: "sideways" as never }), /a layer's move takes "left", "right", "up" or "down", or \{ to, period \}, not "sideways"/],
    [() => layer("a", { src: "b", move: { period: 2 } as never }), /a layer's move.to takes "left", "right", "up" or "down", not undefined/],
    [() => layer("a", { src: "b", move: { to: "up", period: 0 } }), /a layer's move period takes a number of seconds above 0, not 0/],
    [() => layer("a", { src: "b", options: 3 as never }), /a clip's options take an object/],
    [() => row([crop(oceanSunset, { x: 0, y: 0, cols: 200, rows: 2 }), crop(oceanSunset, { x: 0, y: 0, cols: 200, rows: 2 })], { gap: 0 }), /row\(\) makes a piece 400 by 2, past the 320 by 120/],
    [() => sequence([]), /sequence\(\) takes a list of one or more parts/],
    [() => sequence(["a"], { transition: "spin" as never }), /sequence's transition takes "cut", "dissolve", "fade" or "wipe", not "spin"/],
    [() => sequence(["a"], { seconds: 0 }), /sequence's seconds takes a number of seconds above 0, not 0/],
    [() => sequence([{ src: "a", seconds: -2 }]), /step 1's seconds takes a number of seconds above 0, not -2/],
    [() => sequence(["a"], { loop: "yes" as never }), /sequence's loop takes true or false/],
    [() => crop("abc", { x: 5, y: 0, cols: 1, rows: 1 }), /crop's region, 1 by 1 at 5, 0, misses "abc", which is 3 by 1/],
    [() => crop("abc", { x: 0, y: 0, cols: 0, rows: 1 }), /crop's region.cols takes a whole number of 1 or more, not 0/],
    [() => pad("a", -1), /pad takes a whole number of 0 or more, not -1/],
    [() => pad("a", "1" as never), /pad takes a number, \[rows, columns\] or \{ top, right, bottom, left \}/],
    [() => scale("a", 0), /scale's factor takes a whole number of 1 or more, not 0/],
    [() => scale("a", 1.5), /scale's factor takes a whole number of 1 or more, not 1.5/],
    [() => flip("a", undefined as never), /flip\(\) takes an axis/],
    [() => flip("a", "z" as never), /flip's axis takes "x", "y" or "both", not "z"/],
    [() => border("a", { color: "red" }), /a border's color takes #rrggbb, or \{ light, dark \}, not "red"/],
    [() => border("a", { title: "\u0007" }), /a cell takes one printable character/],
    [() => border("a", { pad: [1, -1] }), /a border's pad columns takes a whole number of 0 or more, not -1/],
    [() => speed("a", 0), /speed takes a number above 0/],
    [() => delay("a", -1), /delay takes a number of seconds of 0 or more, not -1/],
    [() => repeat("a", 0), /repeat takes a number of seconds above 0, not 0/],
    [() => freeze("a", Infinity), /freeze takes a number of seconds of 0 or more, not Infinity/],
    [() => named("a", " "), /named\(\) takes a name/],
    [() => over("a", "b", 3 as never), /over\(\) takes an object of options/],
  ];
  for (const [make, message] of bad) assert.throws(make, message);
});
