// node --test src/kit/draw.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import type { Piece } from "../types.ts";
import { EMPTY, NONE, Palette, Surface, piece, snapshot } from "./core.ts";
import { arc, around, boxes, braille, circle, ellipse, label, line, pixels, polygon, polyline, ray, rect, stamp, text } from "./draw.ts";
import clock from "../../examples/kit/draw-clock.ts";
import gauge from "../../examples/kit/draw-gauge.ts";
import sine from "../../examples/kit/draw-sine.ts";
import sprite from "../../examples/kit/draw-sprite.ts";

// The grid's rows as text.
const rows = (s: Surface) => s.toString().split("\n");
// Every cell drawn, as [x, y].
const drawn = (s: Surface) => {
  const out: [number, number][] = [];
  for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) if (s.get(x, y)) out.push([x, y]);
  return out;
};
const coloured = (colors: readonly string[] = ["#000000", "#ff0000", "#00ff00"]) => (cols: number, rows: number) =>
  new Surface(cols, rows, { palette: new Palette(colors) });

test("line: Bresenham's, both ends drawn, fractions taken down", () => {
  const s = new Surface(8, 4);
  line(s, 0, 0, 5, 3, { char: "#" });
  assert.equal(s.get(0, 0), "#");
  assert.equal(s.get(5, 3), "#");
  // one cell a column for a line wider than it is tall, no gaps
  assert.equal(drawn(s).length, 6);
  assert.deepEqual(new Set(drawn(s).map(([x]) => x)).size, 6);
  const f = new Surface(6, 2);
  line(f, 0.9, 0.2, 3.7, 0.9, { char: "=" });
  assert.deepEqual(rows(f), ["====  ", "      "]);
});

test("line: auto picks - | / \\ and runs of _ by the slope on screen", () => {
  const h = new Surface(8, 1);
  line(h, 0, 0, 7, 0);
  assert.deepEqual(rows(h), ["--------"]);
  const v = new Surface(3, 3);
  line(v, 1, 0, 1, 2);
  assert.deepEqual(rows(v), [" | ", " | ", " | "]);
  // a cell down for a cell across is steep on a 1:2 cell: a stroke a cell
  const d = new Surface(4, 4);
  line(d, 0, 0, 3, 3);
  assert.deepEqual(rows(d), ["\\   ", " \\  ", "  \\ ", "   \\"]);
  const r = new Surface(4, 4);
  line(r, 0, 3, 3, 0);
  assert.deepEqual(rows(r), ["   /", "  / ", " /  ", "/   "]);
  // shallow: runs along the rows, stepped down with \ and up with /
  const fall = new Surface(8, 2);
  line(fall, 0, 0, 7, 1);
  assert.deepEqual(rows(fall), ["____    ", "    \\___"]);
  const back = new Surface(8, 2);
  line(back, 7, 1, 0, 0);
  assert.deepEqual(rows(back), rows(fall), "drawn from either end it looks the same");
  const rise = new Surface(8, 2);
  line(rise, 0, 1, 7, 0);
  assert.deepEqual(rows(rise), ["    ____", "___/    "]);
  // within about 14 degrees of upright it is | throughout, with its jog
  const up = new Surface(2, 6);
  line(up, 0, 0, 1, 5);
  assert.ok(rows(up).every((l) => l.trim() === "|"));
  assert.equal(rows(up)[0], "| ");
  assert.equal(rows(up)[5], " |");
  // a line of no length is a point
  const p = new Surface(3, 3);
  line(p, 1, 1, 1.5, 1.9);
  assert.deepEqual(rows(p), ["   ", " * ", "   "]);
  // on a square grid a cell across and down is 45 degrees: still a diagonal, and 1 down for 4 across is a run
  const sq = new Surface(5, 2, { aspect: 1 });
  line(sq, 0, 0, 4, 1);
  assert.equal(rows(sq)[1].trim()[0], "\\");
});

test("line: a brush, \"\" to clear, colours, and nothing outside the grid", () => {
  const s = Surface.from("xxxxx");
  line(s, 1, 0, 3, 0, { char: "" });
  assert.equal(s.chars[1], EMPTY);
  assert.equal(s.toString(), "x   x");
  const c = coloured()(5, 1);
  line(c, 0, 0, 4, 0, { char: "o", color: "#ff0000" });
  assert.deepEqual([...c.colors], [1, 1, 1, 1, 1]);
  line(c, 0, 0, 1, 0, { char: "o" });
  assert.equal(c.colors[0], NONE);
  // far outside, and across: cut to the grid at once, not walked cell by cell
  const big = new Surface(6, 3);
  const a = performance.now();
  line(big, -1e9, 1, 1e9, 1);
  assert.ok(performance.now() - a < 50);
  assert.deepEqual(rows(big), ["      ", "------", "      "]);
  line(big, -5, -5, -1, -1);
  line(big, NaN, 0, 3, 0);
  line(big, 0, 0, Infinity, 0);
  assert.deepEqual(rows(big), ["      ", "------", "      "]);
  assert.throws(() => line(big, 0, 0, 1, 1, { char: "ab" }), /ascii\.rest: a line's char takes one character, or "" to clear, not "ab"/);
  assert.throws(() => line(big, 0, 0, 1, 1, { char: "😀" }), /Basic Multilingual Plane/);
  assert.throws(() => line(big, 0, 0, 1, 1, { color: "red" }), /a colour takes #rrggbb or an index into the palette, not "red"/);
});

test("polyline: through points in turn, closed on request", () => {
  const s = new Surface(5, 3);
  polyline(s, [[0, 0], [4, 0], [4, 2]], { char: "#" });
  assert.deepEqual(rows(s), ["#####", "    #", "    #"]);
  polyline(s, [[0, 0], [4, 0], [4, 2]], { char: "+", closed: true });
  assert.equal(s.get(2, 1), "+", "closed: the last joined back to the first");
  const one = new Surface(3, 1);
  polyline(one, [[1, 0]]);
  assert.equal(one.toString(), " * ");
  polyline(one, []);
  assert.throws(() => polyline(one, [[1]] as never), /polyline\(\) takes a list of points as \[x, y\]/);
});

test("around: a fraction of a turn as a clock goes, rows scaled so the circle looks round", () => {
  const s = new Surface(41, 21);
  const near = (p: readonly number[], q: readonly number[]) => p.every((v, i) => Math.abs(v - q[i]) < 1e-6);
  assert.ok(near(around(s, 20.5, 10.5, 16, 0), [20.5, 2.5]), "0 is up, 16 columns is 8 rows");
  assert.ok(near(around(s, 20.5, 10.5, 16, 0.25), [36.5, 10.5]), "a quarter is right");
  assert.ok(near(around(s, 20.5, 10.5, 16, 0.5), [20.5, 18.5]), "a half is down");
  assert.ok(near(around(s, 20.5, 10.5, 16, 0.75), [4.5, 10.5]), "three quarters is left");
  assert.ok(near(around(s, 20.5, 10.5, 16, 1.25), around(s, 20.5, 10.5, 16, 0.25)), "on round");
  // the cells either side of a dial mirror each other: 3 and 9 land the same distance from the middle cell
  const [x3] = around(s, 20.5, 10.5, 15, 3 / 12), [x9] = around(s, 20.5, 10.5, 15, 9 / 12);
  assert.equal(Math.floor(x3) - 20, 20 - Math.floor(x9));
  // on a square grid a row is as tall as a column is wide; a braille or pixels canvas has its own aspect
  assert.ok(near(around(new Surface(9, 9, { aspect: 1 }), 4, 4, 3, 0), [4, 1]));
  assert.ok(near(around(braille(s), 40, 40, 10, 0.5), [40, 50]), "braille dots are square");
  assert.ok(near(around(pixels(s), 20, 20, 10, 0), [20, 10]), "half-block pixels are square");
  assert.throws(() => around({} as never, 0, 0, 1, 0), /around\(\) takes the grid, or a braille\(\) or pixels\(\) canvas/);
});

test("ray: a hand from a point, a fraction of a turn round", () => {
  const s = new Surface(11, 7);
  ray(s, 5.5, 3.5, 4, 0.25);
  assert.equal(rows(s)[3], "     ----- ");
  ray(s, 5.5, 3.5, 6, 0);
  assert.deepEqual(rows(s).slice(0, 4), ["     |     ", "     |     ", "     |     ", "     |---- "]);
  const c = coloured()(11, 7);
  ray(c, 5.5, 3.5, 4, 0.5, { char: "#", color: 2 });
  assert.equal(c.get(5, 5), "#");
  assert.equal(c.colorAt(5, 5), 2);
  ray(c, NaN, 0, 4, 0);
  assert.throws(() => ray({} as never, 0, 0, 1, 0), /ray\(\) takes the Surface to draw on first/);
});

test("text: alignment in a box, the rest of the row by default", () => {
  const s = new Surface(10, 3);
  assert.deepEqual(text(s, 0, 0, "hi", { align: "center" }), { x: 4, y: 0, cols: 2, rows: 1 });
  text(s, 0, 1, "hi", { align: "right" });
  text(s, 2, 2, "abc", { width: 5, align: "right" });
  assert.deepEqual(rows(s), ["    hi    ", "        hi", "    abc   "]);
  // the box runs from x to the right edge: centred in what is left of the row
  const from = new Surface(10, 1);
  text(from, 4, 0, "ab", { align: "center" });
  assert.equal(from.toString(), "      ab  ");
  const l = new Surface(6, 1);
  assert.deepEqual(text(l, 1.9, 0.2, "ok"), { x: 1, y: 0, cols: 2, rows: 1 });
  assert.equal(l.toString(), " ok   ");
  // from left of the grid, cut by its edge; the region still says where the text is
  const off = new Surface(6, 1);
  assert.deepEqual(text(off, -2, 0, "abcd"), { x: -2, y: 0, cols: 4, rows: 1 });
  assert.equal(off.toString(), "cd    ");
  // with no wrap, a line is cut where the row ends
  const long = new Surface(6, 1);
  assert.deepEqual(text(long, 3, 0, "abcdef"), { x: 3, y: 0, cols: 3, rows: 1 });
  assert.equal(long.toString(), "   abc");
});

test("text: valign in the rest of the grid by default, so the middle of the grid is one call", () => {
  const s = new Surface(9, 5);
  assert.deepEqual(text(s, 0, 0, "hi", { align: "center", valign: "middle" }), { x: 3, y: 2, cols: 2, rows: 1 });
  text(s, 0, 0, "end", { align: "right", valign: "bottom" });
  assert.deepEqual(rows(s), ["         ", "         ", "   hi    ", "         ", "      end"]);
  const m = new Surface(4, 5);
  // two lines in five rows: one row above them, two below, the odd one over going below
  assert.deepEqual(text(m, 0, 0, "a\nb", { valign: "middle" }), { x: 0, y: 1, cols: 1, rows: 2 });
  // from row 1, the box is the four rows left
  assert.deepEqual(text(m, 0, 1, "a\nb", { valign: "middle" }), { x: 0, y: 2, cols: 1, rows: 2 });
  // past the bottom: lines left out
  const cut = new Surface(4, 2);
  assert.deepEqual(text(cut, 0, 1, "a\nb\nc"), { x: 0, y: 1, cols: 1, rows: 1 });
  assert.deepEqual(rows(cut), ["    ", "a   "]);
});

test("text: wrapping at spaces, long words broken, lines cut to the box", () => {
  const s = new Surface(10, 4);
  assert.deepEqual(text(s, 0, 0, "the quick  brown fox", { width: 9 }), { x: 0, y: 0, cols: 9, rows: 2 });
  assert.deepEqual(rows(s).slice(0, 2), ["the quick ", "brown fox "]);
  const w = new Surface(6, 4);
  text(w, 0, 0, "abcdefghijkl", { width: 5 });
  assert.deepEqual(rows(w).slice(0, 3), ["abcde ", "fghij ", "kl    "]);
  const c = new Surface(6, 2);
  text(c, 0, 0, "abcdef\nxy", { width: 3, wrap: false });
  assert.deepEqual(rows(c), ["abc   ", "xy    "]);
  // newlines always break, and wrapping centres each line
  const n = new Surface(9, 3);
  text(n, 0, 0, "a bb\nccc dd", { width: 5, align: "center" });
  // an odd column left over goes on the right
  assert.deepEqual(rows(n), ["a bb     ", " ccc     ", " dd      "]);
  // wrapping with no width given wraps at the end of the row
  const e = new Surface(5, 2);
  text(e, 0, 0, "ab cd ef", { wrap: true });
  assert.deepEqual(rows(e), ["ab cd", "ef   "]);
});

test("text: valign in a box's height, lines past it left out, transparent spaces", () => {
  const s = new Surface(3, 6);
  text(s, 0, 0, "a\nb", { height: 5, valign: "bottom" });
  assert.deepEqual(rows(s), ["   ", "   ", "   ", "a  ", "b  ", "   "]);
  const m = new Surface(3, 6);
  assert.deepEqual(text(m, 0, 1, "a\nb", { height: 5, valign: "middle" }), { x: 0, y: 2, cols: 1, rows: 2 });
  const cut = new Surface(3, 4);
  assert.deepEqual(text(cut, 0, 0, "a\nb\nc", { height: 2 }), { x: 0, y: 0, cols: 1, rows: 2 });
  assert.deepEqual(rows(cut), ["a  ", "b  ", "   ", "   "]);
  const t = Surface.from("....");
  text(t, 0, 0, "a b", { transparent: true });
  assert.equal(t.toString(), "a.b.");
  text(t, 0, 0, "a b");
  assert.equal(t.toString(), "a b.");
  assert.equal(t.chars[1], 32, "a space covers what is under it: a drawn blank, not EMPTY");
});

test("text: empty text, colours, and errors that say what to change", () => {
  const s = coloured()(4, 1);
  assert.deepEqual(text(s, 1, 0, ""), { x: 1, y: 0, cols: 0, rows: 0 });
  assert.deepEqual(text(s, 9, 0, "far"), { x: 9, y: 0, cols: 0, rows: 0 });
  text(s, 0, 0, "ab", { color: 2 });
  assert.deepEqual([...s.colors.slice(0, 2)], [2, 2]);
  assert.throws(() => text(s, 0, 0, "a\tb"), /a cell takes one printable character/);
  assert.throws(() => text(s, 0, 0, "😀"), /Basic Multilingual Plane/);
  assert.throws(() => text(s, 0, 0, "a", { align: "middle" as never }), /align takes "left", "center" or "right", not "middle"/);
  assert.throws(() => text(s, 0, 0, "a", { valign: "center" as never }), /valign takes "top", "middle" or "bottom", not "center"/);
  assert.throws(() => text(s, 0, 0, "a", { width: 0 }), /width takes a number of cells of 1 or more, not 0/);
  assert.throws(() => text(s, 0, 0, "a", { height: NaN }), /height takes a number of cells of 1 or more, not NaN/);
  assert.throws(() => text(s, 0, 0, "a", { wrap: "yes" as never }), /wrap takes true or false, not yes/);
  assert.throws(() => text(s, 0, 0, {} as never), /text\(\) takes a string to write, or a number/);
  assert.throws(() => text(s, 0, 0, "a", 3 as never), /text\(\) takes its options as an object/);
  // a bad character throws wherever the text lands, off the grid too
  assert.throws(() => text(s, 50, 50, "a\u0007"), /a cell takes one printable character/);
  // a number is written as it reads; NaN for a place draws nothing
  const n = new Surface(4, 1);
  text(n, 0, 0, 3.5);
  text(n, NaN, 0, "x");
  assert.equal(n.toString(), "3.5 ");
  // \r\n is a newline
  const w = new Surface(2, 2);
  text(w, 0, 0, "a\r\nb");
  assert.deepEqual(rows(w), ["a ", "b "]);
});

test("label: centred on a point, one character in the cell the point is in", () => {
  const s = new Surface(9, 3);
  assert.deepEqual(label(s, 4.5, 1.5, "x"), { x: 4, y: 1, cols: 1, rows: 1 });
  assert.deepEqual(label(s, 4.0, 0.2, "o"), { x: 4, y: 0, cols: 1, rows: 1 }, "as set() would draw it");
  assert.deepEqual(rows(s), ["    o    ", "    x    ", "         "]);
  // three characters: the middle one on the point's cell
  const odd = new Surface(9, 1);
  label(odd, 4.5, 0, "abc");
  assert.equal(odd.toString(), "   abc   ");
  // two: as near as whole cells allow, the extra half on the right; on a cell's edge, exactly either side of it
  const even = new Surface(9, 2);
  label(even, 4.5, 0, "12");
  label(even, 4, 1, "12");
  assert.deepEqual(rows(even), ["    12   ", "   12    "]);
  // lines centred each, and centred together on y
  const many = new Surface(7, 5);
  assert.deepEqual(label(many, 3.5, 2.5, "a\nbbb\nc"), { x: 2, y: 1, cols: 3, rows: 3 });
  assert.deepEqual(rows(many), ["       ", "   a   ", "  bbb  ", "   c   ", "       "]);
  // a number, a colour, see-through spaces, and nothing for no text or no place
  const c = coloured()(5, 1);
  c.fill(".");
  label(c, 2.5, 0, 12, { color: "#ff0000" });
  assert.equal(c.toString(), "..12.");
  assert.deepEqual([c.colorAt(2, 0), c.colorAt(3, 0)], [1, 1]);
  c.fill(".");
  label(c, 2.5, 0, "a b", { transparent: true });
  assert.equal(c.toString(), ".a.b.");
  assert.deepEqual(label(c, 2, 0, ""), { x: 2, y: 0, cols: 0, rows: 0 });
  assert.deepEqual(label(c, NaN, 0, "x"), { x: 0, y: 0, cols: 0, rows: 0 });
  assert.equal(c.toString(), ".a.b.");
  assert.throws(() => label(c, 0, 0, "😀"), /Basic Multilingual Plane/);
  assert.throws(() => label(c, 0, 0, "a", { color: "red" }), /a colour takes #rrggbb/);
  assert.throws(() => label(c, 0, 0, null as never), /label\(\) takes a string to write/);
});

test("rect: each style's corners and edges, from boxes", () => {
  for (const [style, chars] of Object.entries(boxes)) {
    const s = new Surface(5, 3);
    rect(s, 0, 0, 5, 3, { style: style as keyof typeof boxes });
    const [tl, tr, bl, br, across, down] = [...chars];
    assert.deepEqual(rows(s), [`${tl}${across.repeat(3)}${tr}`, `${down}   ${down}`, `${bl}${across.repeat(3)}${br}`], style);
  }
  const own = new Surface(4, 3);
  rect(own, 0, 0, 4, 3, { style: "1234=!" });
  assert.deepEqual(rows(own), ["1==2", "!  !", "3==4"]);
  // a box one row tall is a line across, one column wide a line down; where they meet they join, ends and all
  const flat = new Surface(4, 2);
  rect(flat, 0, 0, 4, 1);
  rect(flat, 3, 0, 1, 2, { style: "double" });
  assert.deepEqual(rows(flat), ["───╖", "   ║"]);
  const over = new Surface(4, 2);
  rect(over, 0, 0, 4, 1);
  rect(over, 3, 0, 1, 2, { style: "double", join: false });
  assert.deepEqual(rows(over), ["───║", "   ║"], "join: false draws over as it is");
  assert.throws(() => rect(own, 0, 0, 3, 3, { style: "dashed!" }), /style takes "single", "double", "rounded", "heavy", "ascii" or "none", or 6 characters of your own/);
  // six letters are a name spelt wrong, not a border
  assert.throws(() => rect(own, 0, 0, 3, 3, { style: "dotted" }), /not "dotted"/);
});

test("rect: a title on the top edge, cut to fit; fills; colours", () => {
  const s = new Surface(12, 3);
  rect(s, 0, 0, 12, 3, { title: "ab" });
  assert.equal(rows(s)[0], "┌─ ab ─────┐");
  const cut = new Surface(10, 2);
  rect(cut, 0, 0, 10, 2, { title: "abcdef" });
  assert.equal(rows(cut)[0], "┌─ abc… ─┐");
  const narrow = new Surface(6, 2);
  rect(narrow, 0, 0, 6, 2, { title: "x" });
  assert.equal(rows(narrow)[0], "┌────┐", "no room for a title");
  const f = coloured()(4, 3);
  rect(f, 0, 0, 4, 3, { fill: "#", color: 1 });
  assert.deepEqual(rows(f), ["┌──┐", "│##│", "└──┘"]);
  assert.equal(f.colorAt(1, 1), 1, "the fill takes the border's colour by default");
  rect(f, 0, 0, 4, 3, { fill: ".", color: 1, fillColor: 2 });
  assert.equal(f.colorAt(1, 1), 2);
  assert.equal(f.colorAt(0, 0), 1);
  const block = new Surface(4, 3);
  rect(block, 1, 1, 9, 9, { style: "none", fill: "░" });
  assert.deepEqual(rows(block), ["    ", " ░░░", " ░░░"]);
  rect(block, 0, 0, 0, 3, { fill: "#" });
  rect(block, 0, 0, -2, 3);
  assert.deepEqual(rows(block), ["    ", " ░░░", " ░░░"], "a box of no size draws nothing");
  assert.throws(() => rect(block, 0, 0, 2, 2, { fill: "##" }), /fill takes one character/);
  // a title's characters are checked whether or not the box has room for it
  assert.throws(() => rect(block, 0, 0, 4, 3, { title: "a\tb" }), /a cell takes one printable character/);
  assert.throws(() => rect(block, 0, 0, 2, 2, { title: "😀" }), /Basic Multilingual Plane/);
});

test("rect: returns the region inside its border, to draw in", () => {
  const s = new Surface(20, 8);
  assert.deepEqual(rect(s, 2, 1, 10, 5), { x: 3, y: 2, cols: 8, rows: 3 });
  assert.deepEqual(rect(s, 2, 1, 10, 5, { style: "none", fill: "." }), { x: 2, y: 1, cols: 10, rows: 5 }, "no border: all of it");
  assert.deepEqual(rect(s, 0, 0, 2, 2), { x: 1, y: 1, cols: 0, rows: 0 }, "no room inside");
  assert.deepEqual(rect(s, 0, 0, 0, 4), { x: 0, y: 0, cols: 0, rows: 0 });
  assert.deepEqual(rect(s, NaN, 0, 4, 4), { x: 0, y: 0, cols: 0, rows: 0 });
  // past the grid it is not cut: the region says where the inside is
  assert.deepEqual(rect(s, 15, 6, 10, 5), { x: 16, y: 7, cols: 8, rows: 3 });
  // it goes straight into braille(), pixels() and text()
  const g = new Surface(12, 4);
  const b = braille(g, rect(g, 0, 0, 12, 4, { style: "rounded" }));
  assert.deepEqual([b.width, b.height], [20, 8]);
  text(g, rect(g, 0, 0, 12, 4, { style: "rounded" }), "hi", { align: "center", valign: "middle" });
  assert.deepEqual(rows(g), ["╭──────────╮", "│    hi    │", "│          │", "╰──────────╯"]);
});

test("rect: a box far bigger than the grid costs no more than the grid", () => {
  const a = performance.now();
  const out = new Surface(20, 6);
  rect(out, -1e9, -1e9, 2e9 + 10, 2e9 + 3);
  rect(out, 2 ** 32, 0, 5, 3);
  assert.deepEqual(drawn(out), [], "its edges are all off the grid");
  const wide = new Surface(20, 3);
  rect(wide, 0, 0, 1e9, 3, { fill: ".", title: "x".repeat(100000) });
  const tall = new Surface(4, 6);
  rect(tall, 0, 0, 4, 1e9);
  assert.ok(performance.now() - a < 50, `${performance.now() - a} ms`);
  assert.deepEqual(rows(wide), ["┌─ xxxxxxxxxxxxxxxxx", "│...................", "└───────────────────"]);
  assert.deepEqual(rows(tall), ["┌──┐", "│  │", "│  │", "│  │", "│  │", "│  │"]);
});

test("line: coordinates far past the grid never wrap round into it", () => {
  // 2 ** 32 + 3 is 3 to a 32-bit integer: drawn nowhere, not at column 3
  const s = new Surface(8, 3);
  line(s, 2 ** 32 + 3, 0, 2 ** 32 + 5, 0, { char: "#" });
  line(s, 2 ** 32 + 1, 1, 2 ** 32 + 1, 1, { char: "@" });
  line(s, -(2 ** 32) + 2, 2, -(2 ** 32) + 4, 2, { style: "double" });
  polygon(s, [[2 ** 32 + 1, 1], [2 ** 32 + 5, 1], [2 ** 32 + 3, 2]], { char: "x" });
  polyline(s, [[2 ** 33, 0], [2 ** 33 + 4, 0]]);
  ray(s, 2 ** 32 + 2, 1, 3, 0.25);
  const b = braille(s);
  b.line(2 ** 33 + 1, 1, 2 ** 33 + 3, 1);
  b.draw();
  const p = pixels(s);
  p.line(2 ** 32 + 1, 1, 2 ** 32 + 3, 1);
  p.draw();
  assert.deepEqual(drawn(s), []);
  // a line from far off to the grid still reaches it
  line(s, -1e12, 1, 3, 1, { char: "=" });
  assert.equal(rows(s)[1], "====    ");
});

test("joins: box-drawing lines merge where they meet", () => {
  // a frame, then a divider across and one down from it: ├ ┤ ┬ ┴ ┼
  const s = new Surface(13, 7);
  rect(s, 0, 0, 13, 7);
  line(s, 0, 3, 12, 3, { style: "single" });
  line(s, 6, 0, 6, 6, { style: "single" });
  assert.deepEqual(rows(s), ["┌─────┬─────┐", "│     │     │", "│     │     │", "├─────┼─────┤", "│     │     │", "│     │     │", "└─────┴─────┘"]);
  // the other way round, dividers first, then the frame: loose ends are left out, so the corners stay corners
  const d = new Surface(13, 7);
  line(d, 0, 3, 12, 3, { style: "single" });
  line(d, 6, 0, 6, 6, { style: "single" });
  rect(d, 0, 0, 13, 7);
  assert.deepEqual(rows(d), rows(s));
  // two boxes sharing an edge, rounded: ┬ and ┴ where they meet, the outer corners still rounded
  const two = new Surface(9, 3);
  rect(two, 0, 0, 5, 3, { style: "rounded" });
  rect(two, 4, 0, 5, 3, { style: "rounded" });
  assert.deepEqual(rows(two), ["╭───┬───╮", "│   │   │", "╰───┴───╯"]);
  // the same box twice is the same box
  rect(two, 0, 0, 5, 3, { style: "rounded" });
  assert.deepEqual(rows(two), ["╭───┬───╮", "│   │   │", "╰───┴───╯"]);
  // weights mix where a character draws it: double with single, heavy with light
  const mix = new Surface(9, 5);
  rect(mix, 0, 0, 9, 5, { style: "double" });
  line(mix, 0, 2, 8, 2, { style: "single" });
  line(mix, 4, 0, 4, 4, { style: "single" });
  assert.deepEqual(rows(mix), ["╔═══╤═══╗", "║   │   ║", "╟───┼───╢", "║   │   ║", "╚═══╧═══╝"]);
  const heavy = new Surface(5, 3);
  rect(heavy, 0, 0, 5, 3);
  line(heavy, 2, 0, 2, 2, { style: "heavy" });
  assert.deepEqual(rows(heavy), ["┌─┰─┐", "│ ┃ │", "└─┸─┘"]);
  // heavy over double, which no character mixes, takes the new weight throughout
  const hd = new Surface(5, 3);
  rect(hd, 0, 0, 5, 3, { style: "double" });
  line(hd, 2, 0, 2, 2, { style: "heavy" });
  assert.equal(rows(hd)[0], "╔═┳═╗");
  // ascii: + where they meet
  const a = new Surface(7, 3);
  rect(a, 0, 0, 7, 3, { style: "ascii" });
  line(a, 3, 0, 3, 2, { style: "ascii" });
  assert.deepEqual(rows(a), ["+--+--+", "|  |  |", "+--+--+"]);
  // a box-drawing brush joins as it is: ─ over │ is ┼
  const b = new Surface(3, 3);
  line(b, 1, 0, 1, 2, { char: "│" });
  line(b, 0, 1, 2, 1, { char: "─" });
  assert.deepEqual(rows(b), [" │ ", "─┼─", " │ "]);
  // join: false draws over, and other characters are never joined
  const off = new Surface(5, 3);
  rect(off, 0, 0, 5, 3);
  line(off, 2, 0, 2, 2, { style: "single", join: false });
  assert.deepEqual(rows(off), ["┌─│─┐", "│ │ │", "└─│─┘"]);
  const t = Surface.from("-|+");
  line(t, 0, 0, 2, 0, { style: "single" });
  assert.equal(t.toString(), "───", "text that looks like lines is drawn over");
  assert.throws(() => line(off, 0, 0, 1, 0, { join: 1 as never }), /join takes true or false/);
});

test("line, polyline and polygon in a box style: corners where they turn, slants as auto", () => {
  const s = new Surface(12, 5);
  polyline(s, [[0, 0], [5, 0], [5, 4], [11, 4]], { style: "single" });
  assert.deepEqual(rows(s), ["─────┐      ", "     │      ", "     │      ", "     │      ", "     └──────"]);
  const r = new Surface(12, 5);
  polyline(r, [[0, 0], [5, 0], [5, 4], [11, 4]], { style: "rounded" });
  assert.deepEqual([r.get(5, 0), r.get(5, 4)], ["╮", "╰"]);
  for (const [style, corners] of [["double", "╔╗╚╝"], ["heavy", "┏┓┗┛"], ["rounded", "╭╮╰╯"], ["ascii", "++++"]] as const) {
    const p = new Surface(6, 4);
    polygon(p, [[0, 0], [5, 0], [5, 3], [0, 3]], { style });
    assert.deepEqual([p.get(0, 0), p.get(5, 0), p.get(0, 3), p.get(5, 3)].join(""), corners, style);
  }
  // an L, filled
  const room = new Surface(8, 6);
  polygon(room, [[0, 0], [7, 0], [7, 2], [3, 2], [3, 5], [0, 5]], { style: "single", fill: "." });
  assert.deepEqual(rows(room), ["┌──────┐", "│......│", "│..┌───┘", "│..│    ", "│..│    ", "└──┘    "]);
  // a slanting stretch is drawn as "auto" draws a line; the straight ones stay box lines
  const slant = new Surface(10, 3);
  polyline(slant, [[0, 2], [4, 2], [9, 0]], { style: "single" });
  assert.match(rows(slant)[2], /^────/);
  assert.ok(/[_/]/.test(rows(slant).join("")) && !/[─│]/.test(rows(slant)[0]));
  // a lone point is a short line across; a line of no length too
  const dot = new Surface(3, 1);
  line(dot, 1, 0, 1.5, 0.5, { style: "double" });
  assert.equal(dot.toString(), " ═ ");
  assert.throws(() => line(dot, 0, 0, 1, 0, { style: "dotted" as never }), /a line's style takes "single", "double", "rounded", "heavy" or "ascii", not "dotted"/);
  assert.throws(() => line(dot, 0, 0, 1, 0, { style: "single", char: "#" }), /a line takes a char or a style, not both/);
  assert.throws(() => polygon(dot, [[0, 0], [1, 0], [1, 1]], { style: "single", char: "*" }), /a polygon takes a char or a style, not both/);
});

test("text: in a region, wrapped to it and placed in it by align and valign", () => {
  const s = new Surface(12, 5);
  const box = { x: 1, y: 1, cols: 10, rows: 3 };
  assert.deepEqual(text(s, box, "one two three", { align: "center" }), { x: 2, y: 1, cols: 7, rows: 2 });
  assert.deepEqual(rows(s), ["            ", "  one two   ", "   three    ", "            ", "            "]);
  const m = new Surface(12, 5);
  text(m, box, "hi", { align: "right", valign: "bottom" });
  assert.equal(m.get(9, 3) + m.get(10, 3), "hi");
  // lines past the region's rows are left out; its options can still set the box
  const cut = new Surface(12, 5);
  assert.equal(text(cut, { x: 0, y: 0, cols: 3, rows: 2 }, "aa bb cc dd").rows, 2);
  assert.equal(text(cut, { x: 0, y: 3, cols: 3, rows: 2 }, "aaaa bbbb", { wrap: false }).cols, 3);
  // a region with no room draws nothing; one that is not a region throws
  const none = new Surface(4, 2);
  assert.deepEqual(text(none, { x: 1, y: 1, cols: 0, rows: 3 }, "x"), { x: 1, y: 1, cols: 0, rows: 0 });
  assert.equal(none.toString(), "    \n    ");
  assert.throws(() => text(none, { x: 0, y: 0, cols: NaN, rows: 1 }, "x"), /text\(\) takes a region as \{ x, y, cols, rows \}/);
  assert.throws(() => text(none, { x: 0, y: 0, cols: 2, rows: 1 }, "\u0007"), /a cell takes one printable character/);
});

test("arc: part of a circle, clockwise from the top, as around() turns", () => {
  const ring = new Surface(41, 21), part = new Surface(41, 21);
  circle(ring, 20.5, 10.5, 16);
  arc(part, 20.5, 10.5, 16, 0, 0.25);
  // every cell of the arc is on the circle, and in the top right quarter
  const cells = drawn(part);
  assert.ok(cells.length > 10);
  for (const [x, y] of cells) {
    assert.equal(ring.get(x, y), "*");
    assert.ok(x >= 20 && y <= 10, `${x}, ${y}`);
  }
  // a turn or more is the whole circle; to equal to from is nothing
  const whole = new Surface(41, 21);
  arc(whole, 20.5, 10.5, 16, 0.3, 1.3);
  assert.equal(whole.toString(), ring.toString());
  const nothing = new Surface(41, 21);
  arc(nothing, 20.5, 10.5, 16, 0.3, 0.3);
  arc(nothing, 20.5, 10.5, 16, NaN, 1);
  assert.deepEqual(drawn(nothing), []);
  // to before from goes round through the top: 0.75 to 0.25 is the top half
  const top = new Surface(41, 21);
  arc(top, 20.5, 10.5, 16, 0.75, 0.25);
  assert.ok(drawn(top).every(([, y]) => y <= 10) && drawn(top).some(([x]) => x < 10) && drawn(top).some(([x]) => x > 30));
  // with a fill, a slice of pie: its inside is in the same quarter
  const pie = new Surface(41, 21);
  arc(pie, 20.5, 10.5, 16, 0.25, 0.5, { char: "o", fill: ":" });
  assert.equal(pie.get(26, 13), ":");
  assert.equal(pie.get(14, 13), "");
  assert.equal(pie.get(26, 7), "");
  // on the canvases too
  const b = braille(new Surface(20, 10));
  b.arc(20, 20, 16, 0.5, 1);
  let left = 0, right = 0;
  for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if (b.get(x, y)) x < 20 ? left++ : right++;
  assert.ok(left > 20 && right === 0, "0.5 to 1 is the left half");
  const p = pixels(new Surface(20, 10));
  p.arc(10, 10, 8, 0, 0.5, { fill: true });
  assert.ok(p.get(14, 10) && !p.get(5, 10));
  assert.throws(() => arc(pie, 1, 1, 2, 0, 1, { char: "ab" }), /an arc's char takes one character/);
  assert.throws(() => ellipse(pie, 1, 1, 2, 2, { char: "ab" }), /an ellipse's char takes one character/);
});

test("circle and ellipse: the outline is joined at every size and centre, where the curve turns through a diagonal too", () => {
  // the turn from flat to steep can fall between the column and row samples; the cell there must still be drawn
  for (let r = 1.5; r <= 20; r += 0.25)
    for (const [cx, cy] of [[30, 15], [30.5, 15.5], [30.25, 15], [30, 15.5], [30.7, 15.3], [30.1, 15.9]])
      for (const char of ["*", "auto"]) {
        const s = new Surface(62, 32);
        circle(s, cx, cy, r, { char });
        assert.ok(joined(drawn(s)), `circle r ${r} at ${cx}, ${cy}, ${char}`);
      }
  for (let rx = 1.5; rx <= 28; rx += 1.25)
    for (let ry = 1; ry <= 14; ry += 0.75)
      for (const [cx, cy] of [[30, 15], [30.5, 15.5], [30.3, 15.8]]) {
        const s = new Surface(62, 32);
        ellipse(s, cx, cy, rx, ry);
        assert.ok(joined(drawn(s)), `ellipse ${rx} by ${ry} at ${cx}, ${cy}`);
      }
  for (let r = 2; r <= 39; r += 0.5) {
    const b = braille(new Surface(40, 20));
    b.circle(40.3, 40.8, r);
    const dots: [number, number][] = [];
    for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if (b.get(x, y)) dots.push([x, y]);
    assert.ok(joined(dots), `braille circle r ${r}`);
  }
});

test("circle: auto outlines have no doubled sides at any size or centre", () => {
  for (let r = 1.5; r <= 14; r += 0.5)
    for (const [cx, cy] of [[20, 10], [20.5, 10.5], [20.25, 10], [20, 10.5], [20.7, 10.3]]) {
      const s = new Surface(42, 22);
      circle(s, cx, cy, r, { char: "auto" });
      for (const l of rows(s)) assert.doesNotMatch(l, /\|[/\\_]|[/\\_]\||\/\/|\\\\/, `r ${r} at ${cx}, ${cy}`);
      assert.ok(joined(drawn(s)), `joined: r ${r} at ${cx}, ${cy}`);
    }
  // a small one centred on a cell: round, not a box
  const s = new Surface(13, 7);
  circle(s, 6.5, 3.5, 5, { char: "auto" });
  assert.deepEqual(rows(s).slice(1, 6), ["   _______   ", "  /       \\  ", " |         | ", "  \\       /  ", "   \\_____/   "]);
});

// The outline's cells joined: every one reached from the first through neighbours, diagonals included.
function joined(cells: [number, number][]) {
  const left = new Set(cells.map(([x, y]) => `${x},${y}`));
  const queue = [cells[0]];
  left.delete(`${cells[0][0]},${cells[0][1]}`);
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const k = `${x + dx},${y + dy}`;
        if (left.delete(k)) queue.push([x + dx, y + dy]);
      }
  }
  return left.size === 0;
}
const extent = (cells: [number, number][]) => {
  const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

test("circle: round on screen, its rows scaled by the cell's aspect, symmetric and gapless", () => {
  const s = new Surface(41, 21);
  circle(s, 20.5, 10.5, 16);
  const cells = drawn(s);
  const e = extent(cells);
  // 16 columns either side of the middle and 8 rows above and below it, the cells the curve ends in included
  const w = e.x1 - e.x0 + 1, h = e.y1 - e.y0 + 1;
  assert.equal(w, 33);
  assert.equal(h, 17);
  assert.equal(e.x0 + e.x1, 40, "symmetric about the cell 20");
  assert.equal(e.y0 + e.y1, 20, "symmetric about the row 10");
  // each row's ends mirror each other
  for (let y = e.y0; y <= e.y1; y++) {
    const xs = cells.filter(([, cy]) => cy === y).map(([x]) => x);
    assert.equal(Math.min(...xs) + Math.max(...xs), 40, `row ${y}`);
  }
  assert.ok(joined(cells), "the outline has no gaps");
  // no lone cell at the top or bottom
  assert.ok(cells.filter(([, y]) => y === e.y0).length > 3);
  // on a square grid, as tall as it is wide
  const sq = new Surface(41, 41, { aspect: 1 });
  circle(sq, 20.5, 20.5, 16);
  const q = extent(drawn(sq));
  assert.equal(q.x1 - q.x0, q.y1 - q.y0);
});

test("circle: fills, auto slope characters, tiny and empty ones", () => {
  const s = new Surface(21, 11);
  circle(s, 10.5, 5.5, 9, { char: "o", fill: "." });
  const r = rows(s);
  // the inside is filled and bounded by the outline in every row
  for (const l of r.filter((l) => l.trim())) assert.match(l.trim(), /^o+\.*o*$/);
  assert.equal(s.get(10, 5), ".");
  const a = new Surface(41, 21);
  circle(a, 20.5, 10.5, 16, { char: "auto" });
  const ar = rows(a);
  const top = ar.find((l) => l.trim())!.trim();
  assert.match(top, /^_+$/, "flat along the top");
  assert.match(ar[10].trim(), /^\|\s+\|$/, "upright at the sides");
  assert.ok(ar.some((l) => l.includes("/")) && ar.some((l) => l.includes("\\")));
  const tiny = new Surface(5, 5);
  circle(tiny, 2.2, 3.7, 0.2);
  assert.deepEqual(drawn(tiny), [[2, 3]]);
  circle(tiny, 1, 1, 0);
  circle(tiny, 1, 1, -3);
  circle(tiny, NaN, 1, 3);
  assert.deepEqual(drawn(tiny), [[2, 3]]);
  // a circle mostly outside the grid draws what falls inside
  const edge = new Surface(10, 5);
  circle(edge, 0, 2.5, 6);
  assert.ok(drawn(edge).length > 0 && drawn(edge).every(([x]) => x <= 6));
  assert.throws(() => circle(edge, 1, 1, 2, { char: "**" }), /a circle's char takes one character/);
});

test("ellipse: rx columns and ry rows", () => {
  const s = new Surface(41, 21);
  ellipse(s, 20.5, 10.5, 10, 3);
  const e = extent(drawn(s));
  assert.deepEqual([e.x1 - e.x0 + 1, e.y1 - e.y0 + 1], [21, 7]);
  assert.ok(joined(drawn(s)));
  // filled, in two colours: the outline in one, the inside in the other
  const c = coloured()(21, 9);
  ellipse(c, 10.5, 4.5, 8, 3, { char: "o", fill: "~", color: 1, fillColor: 2 });
  assert.deepEqual([c.get(10, 4), c.colorAt(10, 4)], ["~", 2]);
  assert.deepEqual([c.get(2, 4), c.colorAt(2, 4)], ["o", 1]);
  assert.equal(c.get(0, 0), "");
  ellipse(c, 10.5, 4.5, 0, 3);
  ellipse(c, 10.5, 4.5, 8, -1);
  assert.throws(() => ellipse(c, 1, 1, 2, 2, { fill: "ab" }), /fill takes one character/);
});

test("polygon: lines through its points and an even-odd fill", () => {
  const s = new Surface(8, 6);
  polygon(s, [[1, 1], [6, 1], [6, 4], [1, 4]], { fill: "#" });
  assert.deepEqual(rows(s), ["        ", " ****** ", " *####* ", " *####* ", " ****** ", "        "]);
  // a five-pointed star drawn point to every second point: its middle is outside by even-odd, its points inside
  const star = new Surface(41, 21);
  const pts = [0, 2, 4, 1, 3].map((k): [number, number] => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    return [20.5 + 18 * Math.cos(a), 10.5 + 9 * Math.sin(a)];
  });
  polygon(star, pts, { char: "*", fill: ":" });
  assert.equal(star.get(20, 10), "", "the middle pentagon is not filled");
  assert.equal(star.get(20, 4), ":", "a point is");
  const auto = new Surface(30, 12);
  polygon(auto, [[2, 10], [15, 1], [28, 10]], { char: "auto" });
  assert.match(rows(auto).join(""), /\/.*\\/s);
  polygon(auto, [[1, 1], [2, 2]], { fill: "#" });
  assert.throws(() => polygon(auto, "nope" as never), /polygon\(\) takes a list of points/);
});

test("stamp: text with its spaces see-through, or not, in a colour", () => {
  const s = Surface.from("....\n....");
  stamp(s, "a b\n c", 1, 0);
  assert.deepEqual(rows(s), [".a.b", "..c."]);
  const opaque = Surface.from("....");
  stamp(opaque, "a b", 0, 0, { mask: null });
  assert.equal(opaque.toString(), "a b.");
  const mask = Surface.from("....");
  stamp(mask, "a_b_", 0, 0, { mask: "_" });
  assert.equal(mask.toString(), "a.b.");
  const off = Surface.from("....\n....");
  stamp(off, "xy\nzw", -1, 1);
  assert.deepEqual(rows(off), ["....", "y..."]);
  const c = coloured()(3, 1);
  stamp(c, "abc", 0, 0, { color: "#00ff00" });
  assert.deepEqual([...c.colors], [2, 2, 2]);
  assert.throws(() => stamp(c, "a", 0, 0, { mask: "ab" }), /mask takes one character, or null for none/);
});

test("stamp: a grid, EMPTY cells see-through, its colours kept, mapped or found", () => {
  const pal = new Palette(["#000000", "#ff0000", "#00ff00"]);
  const src = new Surface(3, 1, { palette: pal });
  src.set(0, 0, "a", 1);
  src.set(2, 0, "c", 2);
  const same = Surface.from("...", undefined, pal);
  stamp(same, src, 0, 0);
  assert.equal(same.toString(), "a.c");
  assert.deepEqual([same.colors[0], same.colors[2]], [1, 2]);
  // another palette: each colour found in this one's
  const other = new Surface(3, 1, { palette: new Palette(["#00ff00", "#ee0000"]) });
  stamp(other, src, 0, 0);
  assert.deepEqual([other.colors[0], other.colors[2]], [1, 0]);
  const mapped = new Surface(3, 1, { palette: new Palette(["#00ff00", "#ee0000"]) });
  stamp(mapped, src, 0, 0, { map: [0, 0, 0] });
  assert.deepEqual([mapped.colors[0], mapped.colors[2]], [0, 0]);
  // on a grid in one ink, colours are left out
  const mono = new Surface(3, 1);
  stamp(mono, src, 0, 0);
  assert.equal(mono.colors[0], NONE);
  assert.throws(() => stamp(mono, 5 as never, 0, 0), /stamp\(\) takes a Surface or a string/);
});

test("braille: the bit of each dot, 1 2 3 7 down the left and 4 5 6 8 down the right", () => {
  const bits = [
    [0x01, 0x02, 0x04, 0x40],
    [0x08, 0x10, 0x20, 0x80],
  ];
  for (let x = 0; x < 2; x++)
    for (let y = 0; y < 4; y++) {
      const s = new Surface(1, 1);
      const b = braille(s);
      b.set(x, y);
      b.draw();
      assert.equal(s.get(0, 0), String.fromCharCode(0x2800 + bits[x][y]), `dot ${x}, ${y}`);
    }
  const s = new Surface(2, 2);
  const b = braille(s);
  assert.deepEqual([b.width, b.height], [4, 8]);
  for (let x = 0; x < 2; x++) for (let y = 0; y < 4; y++) b.set(x, y);
  b.set(2, 4);
  b.draw();
  assert.deepEqual(rows(s), ["⣿ ", " ⠁"]);
});

test("braille: get, unset, toggle, clear, and draw leaves dotless cells alone", () => {
  const s = Surface.from("xx");
  const b = braille(s);
  b.set(0.7, 1.2);
  assert.equal(b.get(0, 1), true);
  assert.equal(b.get(1, 1), false);
  assert.equal(b.get(-1, 0), false);
  b.toggle(1, 1);
  b.toggle(0, 1);
  assert.deepEqual([b.get(0, 1), b.get(1, 1)], [false, true]);
  b.unset(1, 1);
  b.set(9, 9);
  b.draw();
  assert.equal(s.toString(), "xx", "no dots, nothing drawn");
  b.set(0, 0);
  b.clear();
  b.draw();
  assert.equal(s.toString(), "xx");
  b.set(0, 0);
  b.draw();
  assert.equal(s.toString(), "⠁x");
});

test("braille: lines, circles, rects, a region, and the colour last set in a cell", () => {
  const s = new Surface(2, 1);
  const b = braille(s);
  b.line(0, 0, 3, 3);
  b.draw();
  assert.equal(s.toString(), String.fromCharCode(0x2800 + 0x11, 0x2800 + 0x84));
  const r = new Surface(2, 1);
  const rb = braille(r);
  rb.rect(0, 0, 4, 4);
  rb.draw();
  assert.equal(r.toString(), "⣏⣹", "the edge of 4 by 4 dots: all but the middle two of each cell's inner column");
  rb.rect(0, 0, 4, 4, { fill: true });
  rb.draw();
  assert.equal(r.toString(), "⣿⣿");
  const g = new Surface(4, 3);
  const gb = braille(g, { x: 1, y: 1, cols: 2, rows: 1 });
  assert.deepEqual([gb.width, gb.height], [4, 4]);
  gb.set(0, 0);
  gb.set(3, 3);
  gb.set(4, 0);
  gb.draw();
  assert.deepEqual(rows(g), ["    ", " ⠁⢀ ", "    "]);
  // a circle of dots is round: dots are square on a 1:2 cell
  const c = new Surface(30, 12);
  const cb = braille(c);
  cb.circle(30, 24, 20);
  const dots: [number, number][] = [];
  for (let y = 0; y < cb.height; y++) for (let x = 0; x < cb.width; x++) if (cb.get(x, y)) dots.push([x, y]);
  const e = extent(dots);
  assert.equal(e.x1 - e.x0, e.y1 - e.y0);
  assert.ok(joined(dots));
  cb.circle(30, 24, 5, { fill: true });
  assert.equal(cb.get(30, 24), true);
  // colours: a dot with a colour gives its cell that colour; one without leaves the cell's
  const k = coloured()(1, 1);
  const kb = braille(k);
  kb.set(0, 0, 1);
  kb.set(1, 0);
  kb.draw();
  assert.equal(k.colors[0], 1);
  kb.set(0, 1, "#00ff00");
  kb.draw();
  assert.equal(k.colors[0], 2);
  assert.throws(() => braille(k).circle(1, 1, 1, { fill: "yes" as never }), /circle's fill takes true or false/);
  assert.throws(() => braille({} as never), /braille\(\) takes the Surface to draw on/);
  assert.throws(() => braille(k, { x: 0 } as never), /braille\(\) takes a region as \{ x, y, cols, rows \}/);
});

test("braille: plot scales y0..y1 to the bottom and top, joins its samples and leaves gaps for NaN", () => {
  const s = new Surface(10, 2);
  const b = braille(s);
  b.plot(() => 0);
  // 0 is the middle: row 3.5 of 0..7, rounded to 4, every column
  for (let x = 0; x < b.width; x++) for (let y = 0; y < b.height; y++) assert.equal(b.get(x, y), y === 4, `${x}, ${y}`);
  const w = new Surface(20, 5);
  const wb = braille(w);
  wb.plot(Math.sin);
  const ys = new Set<number>();
  for (let x = 0; x < wb.width; x++) for (let y = 0; y < wb.height; y++) if (wb.get(x, y)) ys.add(y);
  assert.ok(ys.has(0) && ys.has(wb.height - 1), "a sine reaches the top and the bottom");
  assert.equal(ys.size, wb.height, "joined: every row between is crossed");
  const gap = new Surface(10, 2);
  const gb = braille(gap);
  gb.plot((x) => (x > Math.PI ? NaN : 0.5), { y0: 0, y1: 1 });
  assert.equal(gb.get(0, 4), true);
  assert.equal(gb.get(gb.width - 1, 4), false);
  // past y0 and y1 the curve leaves the canvas, cut where it crosses the edge
  const cut = new Surface(4, 1);
  const kb = braille(cut);
  kb.plot((x) => x, { x0: -10, x1: 10, y0: -1, y1: 1 });
  for (let y = 0; y < 4; y++) assert.equal(kb.get(0, y) || kb.get(7, y), false, "the ends are off the canvas");
  assert.equal(kb.get(3, 3), true);
  assert.equal(kb.get(4, 0), true);
  assert.throws(() => kb.plot((x) => x, { y0: 1, y1: 1 }), /plot's y0 and y1 take two different numbers/);
  assert.throws(() => kb.plot(5 as never), /plot\(\) takes a function of x/);
  assert.throws(() => kb.plot((x) => x, { x1: NaN }), /plot's x1 takes a number/);
});

test("braille: plot a list of numbers, spread across and scaled to its own range", () => {
  const s = new Surface(4, 2);
  const b = braille(s);
  b.plot([0, 10]);
  // its smallest at the bottom left, its largest at the top right, joined
  assert.equal(b.get(0, b.height - 1), true);
  assert.equal(b.get(b.width - 1, 0), true);
  for (let x = 0; x < b.width; x++) assert.ok([...Array(b.height).keys()].some((y) => b.get(x, y)), `column ${x}`);
  // y0 and y1 given: the list's own range is not used
  const f = braille(new Surface(4, 2));
  f.plot([5, 5, 5], { y0: 0, y1: 10 });
  assert.ok(f.get(0, 4) && f.get(7, 4) && !f.get(0, 7));
  // one value, or all the same: a level line in the middle; empty or no numbers: nothing
  const flat = braille(new Surface(4, 2));
  flat.plot([3, 3]);
  assert.ok(flat.get(0, 4) && flat.get(7, 4));
  const none = new Surface(4, 2);
  const nb = braille(none);
  nb.plot([]);
  nb.plot([NaN, Infinity]);
  nb.draw();
  assert.equal(none.toString(), "    \n    ");
});

test("braille: ray, and the dots' aspect on a square grid", () => {
  const s = new Surface(3, 3);
  const b = braille(s);
  assert.equal(b.aspect, 1);
  b.ray(0, 11, 8, 0.25);
  for (let x = 0; x < b.width; x++) assert.equal(b.get(x, 11), true, `dot ${x} of a ray to the right`);
  b.clear();
  b.ray(0, 11, 16, 0.125);
  const set: [number, number][] = [];
  for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if (b.get(x, y)) set.push([x, y]);
  assert.ok(set.length >= 6 && set.every(([x, y]) => Math.abs(x - (11 - y)) <= 1), "45 degrees on screen: a dot across for each dot up");
  const sq = braille(new Surface(3, 3, { aspect: 1 }));
  assert.equal(sq.aspect, 0.5, "on a square grid a dot is twice as wide as it is tall");
  sq.circle(3, 6, 2);
  const dots: [number, number][] = [];
  for (let y = 0; y < sq.height; y++) for (let x = 0; x < sq.width; x++) if (sq.get(x, y)) dots.push([x, y]);
  const e = extent(dots);
  assert.equal(e.y1 - e.y0 + 1, 2 * (e.x1 - e.x0 + 1), "twice as many dots down as across");
});

test("pixels: upper, lower and full half blocks, one colour a cell, the upper's where they differ", () => {
  const s = coloured()(4, 1);
  const p = pixels(s);
  assert.deepEqual([p.width, p.height], [4, 2]);
  p.set(0, 0, 1);
  p.set(1, 1, 2);
  p.set(2, 0, 1);
  p.set(2, 1, 1);
  p.set(3, 0, 1);
  p.set(3, 1, 2);
  p.draw();
  assert.equal(s.toString(), "▀▄██");
  assert.deepEqual([...s.colors], [1, 2, 1, 1]);
  const kept = Surface.from("ab");
  const kp = pixels(kept);
  kp.set(1, 1);
  kp.draw();
  assert.equal(kept.toString(), "a▄", "a cell with no pixel lit is left as it was");
  assert.equal(kp.get(1, 1), true);
  kp.unset(1, 1);
  assert.equal(kp.get(1, 1), false);
  kp.set(0, 0);
  kp.clear();
  assert.equal(kp.get(0, 0), false);
});

test("pixels: sprites from text, lines, rects and circles", () => {
  const s = coloured()(3, 2);
  const p = pixels(s);
  p.sprite(
    `
      .r
      g.x
    `,
    { r: 1, g: "#00ff00" },
    0,
    0,
  );
  p.draw();
  assert.deepEqual(rows(s), ["▄▀▄", "   "]);
  assert.deepEqual([...s.colors.slice(0, 3)], [2, 1, NONE], "a character with no colour is in the ink");
  const off = new Surface(2, 1);
  const op = pixels(off);
  op.sprite("##\n##", {}, -1, 1);
  op.draw();
  assert.equal(off.toString(), "▄ ");
  const l = new Surface(4, 2);
  const lp = pixels(l);
  lp.line(0, 0, 3, 3);
  lp.draw();
  assert.deepEqual(rows(l), ["▀▄  ", "  ▀▄"]);
  const r = new Surface(4, 2);
  const rp = pixels(r);
  rp.rect(0, 0, 4, 4);
  rp.draw();
  assert.deepEqual(rows(r), ["█▀▀█", "█▄▄█"]);
  const c = new Surface(21, 11);
  const cp = pixels(c);
  cp.circle(10.5, 11.5, 8, { fill: true });
  const px: [number, number][] = [];
  for (let y = 0; y < cp.height; y++) for (let x = 0; x < cp.width; x++) if (cp.get(x, y)) px.push([x, y]);
  const e = extent(px);
  assert.equal(e.x1 - e.x0, e.y1 - e.y0, "pixels are square on a 1:2 cell");
  assert.throws(() => p.sprite("r", null as never, 0, 0), /sprite\(\) takes its colours as an object/);
  assert.throws(() => p.sprite("r", { r: "red" }, 0, 0), /a colour takes #rrggbb/);
  assert.throws(() => p.sprite("r", { red: 1 }, 0, 0), /sprite\(\)'s colours take one character of the art each/);
  p.sprite("", {}, 0, 0);
  p.sprite("\n\n", {}, 0, 0);
});

test("pixels: sprite sheets by frame, a list of drawings, and wrap round the edges", () => {
  // two frames side by side: frame counts up and goes round
  const sheet = "#..#\n#..#";
  const at = (o: object) => {
    const s = new Surface(3, 1);
    const p = pixels(s);
    p.sprite(sheet, {}, 0, 0, o);
    p.draw();
    return s.toString();
  };
  assert.equal(at({ frames: 2 }), "█  ");
  assert.equal(at({ frames: 2, frame: 1 }), " █ ");
  assert.equal(at({ frames: 2, frame: 2.7 }), "█  ", "taken down and round: 2.7 is frame 0 of 2");
  assert.equal(at({ frames: 2, frame: -1 }), " █ ", "counting back goes round too");
  assert.equal(at({}), "█  ", "one frame: the whole drawing, its right column past the grid's edge");
  // a list of drawings, each in turn
  const list = new Surface(2, 1);
  const lp = pixels(list);
  lp.sprite(["#.\n#.", ".#\n.#"], {}, 0, 0, { frame: 1 });
  lp.draw();
  assert.equal(list.toString(), " █");
  // wrap: off the right edge and back on at the left, and off the bottom back at the top
  const w = new Surface(4, 1);
  const wp = pixels(w);
  wp.sprite("###", {}, 3, 0, { wrap: true });
  wp.draw();
  assert.equal(w.toString(), "▀▀ ▀");
  const v = new Surface(1, 1);
  const vp = pixels(v);
  vp.sprite("#\n#", {}, 0, 1, { wrap: true });
  vp.draw();
  assert.equal(v.toString(), "█");
  assert.throws(() => wp.sprite("#", {}, 0, 0, { frames: 0 }), /sprite's frames takes a whole number of frames side by side, 1 or more, not 0/);
  assert.throws(() => wp.sprite("#", {}, 0, 0, { frame: "1" as never }), /sprite's frame takes a number/);
  assert.throws(() => wp.sprite("#", {}, 0, 0, { wrap: 1 as never }), /sprite's wrap takes true or false/);
  assert.throws(() => wp.sprite([5] as never, {}, 0, 0), /sprite\(\) takes its art as a string/);
});

test("pixels: ray, and the pixels' aspect", () => {
  const s = new Surface(5, 3);
  const p = pixels(s);
  assert.equal(p.aspect, 1);
  p.ray(2, 5, 4, 0);
  p.draw();
  assert.deepEqual(rows(s), ["  ▄  ", "  █  ", "  █  "]);
  assert.equal(pixels(new Surface(2, 2, { aspect: 1 })).aspect, 0.5);
});

test("colours: an index or #rrggbb, by the page's theme, checked on a piece in one ink too", () => {
  const themed = new Surface(2, 1, { palette: new Palette({ light: ["#111111", "#aa0000"], dark: ["#eeeeee", "#ff5555"] }) });
  line(themed, 0, 0, 1, 0, { color: 1 });
  assert.deepEqual([...themed.colors], [3, 3], "a dark page: the dark half");
  themed.paper = true;
  line(themed, 0, 0, 1, 0, { color: "#ff5555" });
  assert.deepEqual([...themed.colors], [1, 1], "paper: the light half, the same colour by place");
  const mono = new Surface(2, 1);
  circle(mono, 1, 0.5, 1, { color: "#ff0000" });
  assert.ok([...mono.colors].every((c) => c === NONE), "no palette, no colour stored");
  assert.throws(() => rect(mono, 0, 0, 2, 1, { color: "blue" }), /a colour takes #rrggbb/);
  assert.throws(() => pixels(mono).set(0, 0, -1), /a colour takes #rrggbb/);
  assert.throws(() => line(themed, 0, 0, 1, 0, { color: 7 }), /colour 7 is not one of the palette's 2/);
});

test("a piece drawn with draw is the same frame for the same t, whatever came before", () => {
  const p = piece({ name: "mix", cols: 30, rows: 10, palette: ["#0969da", "#cf222e"] }, (t, s) => {
    const inside = rect(s, 0, 0, 30, 10, { style: "double", title: "mix" });
    line(s, 20, 0, 20, 9, { style: "single", color: 1 });
    circle(s, 15, 5, 6 + Math.sin(t), { char: "auto", color: 1 });
    arc(s, 15, 5, 4, t / 4, t / 4 + 0.3, { char: "#" });
    const b = braille(s, { x: 2, y: 2, cols: 8, rows: 3 });
    b.plot((x) => Math.sin(x + t));
    b.arc(8, 6, 5, 0, t % 1, { fill: true, color: 1 });
    b.draw();
    text(s, inside, `t ${t.toFixed(1)}`, { align: "right", valign: "bottom" });
  });
  for (const t of [0, 0.4, 3.3, 59.9]) {
    const fresh = snapshot(p, t);
    const f = p.default();
    const color = new Uint8Array(300);
    f(5, { color });
    f(1.7, { color });
    assert.equal(f(t, { color }), fresh.text, `t=${t}`);
    assert.deepEqual([...color], [...fresh.color!], `t=${t} colours`);
  }
});

// The contract scripts/kit/show.ts checks: rows lines of cols characters, colours in the palette, on both grounds and in mono.
function contract(p: Piece, times: number[]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      for (const t of times) {
        const text = frame(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows);
        for (const l of lines) assert.equal(l.length, meta.cols);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length);
      }
    }
}

test("the examples: pieces that play everywhere and look like what they are", () => {
  contract(clock, [0, 1, 30, 59.9]);
  contract(sine, [0, 0.5, 1.99]);
  contract(sprite, [0, 0.25, 3.9]);
  const c = snapshot(clock, 15).text.split("\n");
  assert.match(c[0], /^╭─ clock ─+╮$/);
  for (const h of ["12", "3", "6", "9"]) assert.ok(c.some((l) => l.includes(h)), `the hour ${h}`);
  assert.match(c[10], /o-+ 3/, "at 15 seconds the second hand points at 3");
  assert.equal(snapshot(clock, 0).text, snapshot(clock, 60).text, "it loops every 60 seconds");
  assert.equal(sine.meta.loop, 4);
  assert.equal(snapshot(sine, 0.3).text, snapshot(sine, 4.3).text, "it loops every 4 seconds");
  assert.notEqual(snapshot(sine, 0.3).text, snapshot(sine, 2.3).text, "and moves between");
  assert.ok([...snapshot(sine, 0.3).text].filter((ch) => ch >= "⠀" && ch <= "⣿").length > 150, "braille curves");
  assert.equal(snapshot(sprite, 0.6).text, snapshot(sprite, 4.6).text, "it loops every 4 seconds");
  assert.ok(/[▀▄█]/.test(snapshot(sprite, 0).text));
  assert.notEqual(snapshot(sprite, 0).text, snapshot(sprite, 0.25).text, "it walks");
  // On paper a themed piece's colours are its light half; on a dark page its dark half.
  const paper = snapshot(sine, 0.5, { paper: true }).color!, dark = snapshot(sine, 0.5).color!;
  assert.ok([...paper].every((k) => k < 3) && [...dark].every((k) => k >= 3));
  // in mono no colours are written, and the characters are the same as in colour
  for (const p of [clock, sine, sprite]) {
    const mono = snapshot(p, 1.5, { mono: true });
    assert.equal(mono.color, null);
    assert.equal(mono.text, snapshot(p, 1.5).text);
  }
  assert.match(snapshot(sprite, 3.5).text.split("\n")[5], /^▄ +▄████$/, "wrap: it walks off the right and back on at the left");
  // the gauge: the line down joins the frame, the reading is in the middle of its panel, and it loops every 8 s
  contract(gauge, [0, 1, 2.5, 7.9]);
  const g = snapshot(gauge, 2).text.split("\n");
  assert.match(g[0], /^╭─ cpu ─+┬─+╮$/);
  assert.match(g.at(-1)!, /^╰─+┴─+╯$/);
  assert.match(g[6], /^│ █ +\d+% +[█░]  │/, "the reading in the middle of the dial, in the left panel");
  assert.ok(g.join("").includes("█") && g.join("").includes("░"), "the dial's reading and its track differ by character, so mono reads too");
  assert.equal(gauge.meta.loop, 8);
  assert.equal(snapshot(gauge, 1.25).text, snapshot(gauge, 9.25).text, "it loops every 8 seconds");
  assert.notEqual(snapshot(gauge, 1).text, snapshot(gauge, 3).text);
  assert.equal(snapshot(gauge, 1.5, { mono: true }).text, snapshot(gauge, 1.5).text);
  for (const p of [clock, sine, sprite, gauge]) assert.match(svg(p), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});
