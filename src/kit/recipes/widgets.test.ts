// node --test src/kit/recipes/widgets.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { loopOf, svg } from "../../svg.ts";
import type { Piece } from "../../types.ts";
import { Surface, asPiece } from "../core.ts";
import { across, at, barChart, card, clockFace, countdown, down, gauge, inset, marquee, panel, progressBar, ring, slot, sparkline, spinner, spinners, textAt, tiles, typewriter } from "./widgets.ts";

// A frame as text, and as its rows.
const frame = (p: Piece, t: number, o: { paper?: boolean; mono?: boolean } = {}) => {
  const color = p.meta.palette && !o.mono ? new Uint8Array(p.meta.cols * p.meta.rows) : undefined;
  return p.default({ ...p.meta.options })(t, { paper: o.paper, color });
};
const rows = (p: Piece, t: number) => frame(p, t).split("\n");
const ink = (text: string) => text.replace(/\s/g, "").length;

// The checks scripts/check.ts makes: rows lines of cols characters, colours inside the palette, and the same frame for
// the same t, drawn fresh or after other frames.
function contract(p: Piece, times = [0, 0.3, 0.6, 1, 2.5, 4, 7]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const play = p.default({ ...meta.options });
      const seen = times.map((t) => {
        const text = play(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `${meta.name} t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `${meta.name} t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `${meta.name}: colour ${c} past the palette`);
        return text;
      });
      const again = p.default({ ...meta.options });
      for (let i = times.length - 1; i >= 0; i--) assert.equal(again(times[i], { paper, color }), seen[i], `${meta.name} t=${times[i]}: not the same frame twice`);
    }
}

test("every widget is a normal piece that keeps the frame contract and draws as an SVG", () => {
  for (const p of [
    clockFace(),
    clockFace({ size: "small" }),
    progressBar({ label: "x" }),
    progressBar({ value: 0.3, style: "ascii" }),
    progressBar({ style: "dots" }),
    spinner(),
    spinner("arc", { label: "wait" }),
    gauge(),
    gauge({ value: 30, label: "mem" }),
    sparkline(),
    sparkline([1, 4, 2, 8], { label: "a" }),
    barChart({ a: 1, b: 3 }),
    barChart([3, 1, 2], { horizontal: true }),
    panel("hi", { title: "t" }),
    panel(),
    card({ title: "t", text: "some words here", footer: "f" }),
    typewriter("hello there"),
    marquee("news"),
    marquee("big", { big: true }),
    countdown({ from: 3 }),
  ]) {
    contract(p);
    assert.ok(svg(p).startsWith("<svg"), `${p.meta.name}: svg() draws it`);
  }
});

test("at(): the point at an anchor, a margin in", () => {
  const s = new Surface(20, 10);
  assert.deepEqual(at(s), [10, 5]);
  assert.deepEqual(at(s, "top-left"), [0.5, 0.5]);
  assert.deepEqual(at(s, "bottom-right", { margin: 1 }), [18.5, 8.5]);
  assert.deepEqual(at({ x: 4, y: 2, cols: 6, rows: 4 }, "left"), [4.5, 4]);
  assert.throws(() => at(s, "middle" as never), /at\(\)'s anchor takes "top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom" or "bottom-right"/);
  assert.throws(() => at(null as never), /at\(\) takes the grid, or a region/);
});

test("textAt(): text against an edge or in the middle", () => {
  const s = new Surface(12, 5);
  textAt(s, "hi", "top-left");
  textAt(s, "yo", "bottom-right", { margin: 1 });
  textAt(s, "mid");
  const r = s.toString().split("\n");
  assert.equal(r[0], "hi          ");
  assert.equal(r[2], "    mid     ");
  assert.equal(r[3], "         yo ");
});

test("ring(): points round a circle from the top, clockwise, round on tall cells", () => {
  const s = new Surface(41, 21);
  const p = ring(s, 12, { radius: 16 });
  assert.equal(p.length, 12);
  assert.ok(Math.abs(p[0][0] - 20.5) < 1e-6 && p[0][1] < 10.5 - 7.9, "12 is at the top");
  assert.ok(Math.abs(p[3][1] - 10.5) < 1e-6 && p[3][0] > 36, "3 is on the right, 16 columns out");
  assert.ok(Math.abs(p[6][0] - 20.5) < 1e-6 && Math.abs(p[6][1] - 18.5) < 1e-6, "6 is at the bottom, 8 rows down: half the columns on tall cells");
  assert.ok(Math.abs(p[9][0] + p[3][0] - 41) < 1e-6, "9 mirrors 3");
  const fits = ring(s, 4);
  for (const [x, y] of fits) assert.ok(x >= 0 && x < 41 && y >= 0 && y < 21, "the default radius fits the room");
  assert.throws(() => ring(s, 0), /ring\(\)'s count takes a whole number from 1 to 10000/);
});

test("inset, across, down, tiles and slot cut a room with no sums", () => {
  const s = new Surface(30, 12);
  assert.deepEqual(inset(s, 2), { x: 2, y: 2, cols: 26, rows: 8 });
  assert.deepEqual(inset(s, [1, 3]), { x: 3, y: 1, cols: 24, rows: 10 });
  const thirds = across(s, 3, { gap: 0 });
  assert.deepEqual(thirds.map((r) => r.cols), [10, 10, 10]);
  const [a, b] = across(s, [1, 2], { gap: 3 });
  assert.equal(a.cols + b.cols + 3, 30, "the parts and the gap fill the room");
  assert.equal(b.x, a.x + a.cols + 3);
  assert.equal(b.cols, 18);
  const halves = down(s, 2, { gap: 2 });
  assert.deepEqual(halves.map((r) => [r.y, r.rows]), [[0, 5], [7, 5]]);
  const t = tiles(s, { columns: 3, rows: 2, gap: 1 });
  assert.equal(t.length, 6);
  assert.deepEqual([t[1].x, t[1].y], [10, 0], "reading order: the second tile is to the right of the first");
  assert.deepEqual([t[3].x, t[3].y], [0, 7], "the fourth starts the second row, 6 rows and a gap down");
  assert.deepEqual(slot(s, "bottom-right", { cols: 10, rows: 3, margin: 1 }), { x: 19, y: 8, cols: 10, rows: 3 });
  assert.deepEqual(slot(s, "center", { cols: 10, rows: 4 }), { x: 10, y: 4, cols: 10, rows: 4 });
  assert.throws(() => across(s, [] as never), /across\(\) takes a number of parts, or their weights/);
  assert.throws(() => tiles(s, { columns: 2, size: 1 } as never), /tiles\(\) has no option "size"/);
});

test("clockFace: sizes by word, a second hand going round a minute, the real time if asked", () => {
  const c = clockFace();
  assert.deepEqual([c.meta.cols, c.meta.rows, c.meta.loop], [41, 21, 60]);
  assert.deepEqual([clockFace({ size: "small" }).meta.cols, clockFace({ size: "large" }).meta.rows], [25, 29]);
  assert.notEqual(frame(c, 0), frame(c, 15), "the second hand moves");
  assert.equal(frame(c, 0), frame(c, 60), "and comes round in a minute");
  const all = frame(c, 0);
  for (const n of ["12", "3", "6", "9", "11"]) assert.ok(all.includes(n), `${n} is on the dial`);
  const quarters = frame(clockFace({ numbers: "quarters" }), 0);
  assert.ok(quarters.includes("12") && !quarters.includes("11"));
  assert.ok(frame(clockFace({ size: "small" }), 0).includes("12"), "a hand over 12 never hides it");
  assert.ok(frame(clockFace({ title: "tea" }), 0).split("\n")[0].includes(" tea "));
  const real = clockFace({ real: true });
  assert.equal(real.meta.clock, true);
  assert.equal(real.meta.loop, undefined);
  assert.throws(() => clockFace({ time: "25:00" }), /clockFace's time takes "h:mm", such as "10:10", not "25:00"/);
  assert.throws(() => clockFace({ size: "tiny" as never }), /clockFace's size takes "small", "medium" or "large"/);
});

test("progressBar: a still at a value, or filling and coming round", () => {
  const half = progressBar({ value: 0.5, width: 10 });
  assert.equal(half.meta.fps, 0);
  assert.equal(frame(half, 0), "█████░░░░░  50%");
  assert.equal(frame(progressBar({ value: 0.25, width: 10, style: "ascii", percent: false }), 0), "[##------]");
  assert.equal(frame(progressBar({ value: 0.5, width: 4, style: "dots", label: "go", percent: false }), 0), "go ●●○○");
  // a quarter of a cell past whole cells is drawn in eighths
  assert.equal(frame(progressBar({ value: 0.125, width: 4, percent: false }), 0), "▌░░░");
  const filling = progressBar({ seconds: 2 });
  assert.equal(filling.meta.loop, 3);
  assert.ok(frame(filling, 0).endsWith("  0%"));
  assert.ok(frame(filling, 2.5).endsWith("100%"), "full, and held");
  assert.equal(filling.meta.still, 2, "held still, it is full");
  // filling over 2.5 seconds and a second full makes 3.5: made up to 4, a loop other widgets share
  assert.equal(progressBar({ seconds: 2.5 }).meta.loop, 4);
  assert.throws(() => progressBar({ value: 2 }), /progressBar's value takes a number from 0 to 1, a percentage such as "64%", or a function that reads one, not 2: did you mean 0\.02, or "2%"\?/);
});

test("progressBar and gauge take a value the same ways: a number in their range, or a percentage", () => {
  assert.equal(frame(progressBar({ value: "50%", width: 10 }), 0), "█████░░░░░  50%");
  assert.equal(frame(progressBar({ value: 32, min: 0, max: 64, width: 10 }), 0), "█████░░░░░  50%");
  assert.ok(frame(gauge({ value: "64%" }), 0).includes("64%"));
  assert.ok(frame(gauge({ value: 64 }), 0).includes("64%"));
  // a share given to a gauge reading 0 to 100 is asked about, not drawn as an empty dial at 1%
  assert.throws(() => gauge({ value: 0.64 }), /gauge's value is a reading from 0 to 100, and 0\.64 is less than 1: did you mean 64, or "64%"\? Give it max: 1 for a reading from 0 to 1/);
  assert.ok(frame(gauge({ value: 0.64, max: 1, unit: "" }), 0).includes("1"), "with max: 1 it is a share");
  assert.throws(() => gauge({ value: "164%" }), /gauge's value takes a percentage from "0%" to "100%"/);
});

test("a value read by a function makes a live widget: a clock, read every frame", () => {
  let cpu = 10;
  const g = gauge({ value: () => cpu, label: "cpu" });
  assert.equal(g.meta.clock, true);
  assert.equal(g.meta.loop, undefined);
  const f = g.default();
  assert.ok(f(0).includes("10%"));
  cpu = 87;
  assert.ok(f(0).includes("87%"), "read again on the next frame");
  let done = 0.25;
  const bar = progressBar({ value: () => done, width: 8 });
  const b = bar.default();
  assert.ok(b(0).endsWith(" 25%"));
  done = 2;
  assert.ok(b(0).endsWith("100%"), "a reading past the end is the end");
  const history = [1, 2, 3];
  const spark = sparkline(() => history, { label: "q" });
  assert.equal(spark.meta.clock, true);
  const s = spark.default();
  const before = s(0);
  history.push(9);
  assert.notEqual(s(0), before);
  assert.ok(s(0).includes("9"));
});

test("spinner: its frames in turn, its turn a loop other widgets share", () => {
  // four frames: a tenth of a second each would be 0.4, so the turn is half a second, an eighth each
  const s = spinner("line", { label: "wait" });
  assert.equal(s.meta.loop, 0.5);
  assert.deepEqual([0, 0.125, 0.25, 0.375].map((t) => frame(s, t)), ["- wait", "\\ wait", "| wait", "/ wait"], "each frame at its own moment");
  assert.deepEqual([0.05, 0.49, 0.5].map((t) => frame(s, t)), ["- wait", "/ wait", "- wait"]);
  assert.equal(spinner("dots", { speed: "slow" }).meta.loop, 2);
  assert.equal(spinner("line", { period: 0.4 }).meta.loop, 0.4, "a period of your own is kept");
  for (const name of Object.keys(spinners)) contract(spinner(name as keyof typeof spinners));
  assert.throws(() => spinner("moon" as never), /spinner\(\) takes "dots", "line", "arc"/);
});

test("gauge: the reading in its middle, coloured by how high it is", () => {
  const g = gauge({ value: 72, label: "disk" });
  assert.equal(g.meta.fps, 0);
  assert.ok(frame(g, 0).includes("72%"));
  assert.ok(frame(g, 0).split("\n")[0].includes(" disk "));
  assert.ok(ink(frame(gauge({ value: 90 }), 0).replace(/░/g, "")) > ink(frame(gauge({ value: 10 }), 0).replace(/░/g, "")), "more of the dial is filled higher up");
  const live = gauge();
  assert.equal(live.meta.loop, 12);
  assert.equal(frame(live, 1), frame(live, 13));
  assert.ok(frame(gauge({ value: 5, max: 10, unit: " rpm" }), 0).includes("5 rpm"));
  assert.throws(() => gauge({ value: 120 }), /gauge's value takes a number from 0 to 100, a percentage such as "64%", or a function that reads one, not 120/);
  assert.throws(() => gauge({ min: 5, max: 5 }), /gauge's max takes a number above its min/);
  // with no frame of its own, the label sits over the dial
  const bare = rows(gauge({ value: 40, label: "mem", frame: false }), 0);
  assert.ok(!bare.join("").includes("╭") && bare[0].includes("mem"));
});

test("sparkline: numbers drawn in from the left, or a live reading scrolling", () => {
  const s = sparkline([1, 3, 2, 5, 4, 6], { label: "up", width: 20 });
  assert.equal(s.meta.loop, 5);
  assert.equal(s.meta.still, 1.5, "held still, it is drawn in");
  // numbers all alike draw a flat line, every frame, and an SVG
  const flat = sparkline([0, 0, 0, 0], { label: "errors" });
  contract(flat);
  assert.ok(svg(flat).startsWith("<svg"));
  assert.ok(frame(flat, 2).includes("0"));
  assert.ok(ink(frame(s, 0.5)) < ink(frame(s, 2)), "drawing in");
  assert.ok(frame(s, 2).includes("6"), "its latest number once drawn");
  assert.ok(frame(s, 2).startsWith("up ") || frame(s, 2).split("\n").some((r) => r.startsWith("up ")));
  const live = sparkline();
  assert.equal(live.meta.loop, 12);
  assert.notEqual(frame(live, 1), frame(live, 2));
  assert.equal(frame(live, 1), frame(live, 13));
  assert.throws(() => sparkline([1]), /sparkline\(\) takes a list of two or more numbers/);
});

test("barChart: a bar for each value, growing in, values and names", () => {
  const b = barChart({ mon: 2, tue: 4 }, { size: 4 });
  assert.equal(b.meta.rows, 6);
  assert.equal(b.meta.cols, 3 + 2 + 3);
  const grown = rows(b, 2);
  assert.equal(grown[5], "mon  tue");
  assert.equal(grown[1], "     ███", "tue is full height");
  assert.equal(grown[3], "███  ███", "mon is half");
  assert.equal(grown[0], "      4 ", "its value over it");
  assert.equal(ink(frame(b, 0)), ink("mon  tue"), "nothing grown at the start, the names already there");
  // held still, for reduced motion and an SVG's first frame, the bars are grown
  assert.deepEqual(rows(b, b.meta.still!), grown);
  assert.equal(b.meta.loop, 4, "0.8 to grow, a tenth for the second bar and 3 held: made up to 4");
  const still = barChart([1, 2], { seconds: 0 });
  assert.equal(still.meta.fps, 0);
  const h = barChart({ go: 1, rust: 2 }, { horizontal: true, size: 8, seconds: 0 });
  assert.deepEqual(rows(h, 0), ["  go ████ 1    ", "rust ████████ 2"], "names lined up at their column's right, each value at its bar's end");
  assert.throws(() => barChart({ a: -1 }), /barChart\(\) takes names and values/);
  assert.throws(() => barChart([]), /barChart\(\) takes names and values/);
});

test("panel and card: boxes round things", () => {
  const p = panel("hi", { title: "note", cols: 20, rows: 5 });
  assert.deepEqual([p.meta.cols, p.meta.rows, p.meta.name], [20, 5, "note"]);
  const r = rows(p, 0);
  assert.ok(r[0].startsWith("╭─ note ─"));
  assert.ok(r[2].includes("hi"));
  assert.equal(r[2].indexOf("hi"), 9, "in the middle");
  const own = panel(spinner());
  assert.deepEqual([own.meta.cols, own.meta.rows], [1 + 4, 1 + 2], "its own size and the border");
  assert.ok(own.meta.fps > 0, "what is in it still moves");
  const c = card({ title: "ascii.rest", text: "one two three four five six seven", footer: "end", width: 20 });
  const cr = rows(c, 0);
  assert.equal(c.meta.cols, 20);
  assert.ok(cr[1].includes("ascii.rest"));
  assert.ok(cr[2].startsWith("├") && cr[2].endsWith("┤"), "the line under the title joins the box");
  assert.equal(c.meta.rows, cr.length);
  assert.ok(cr.at(-2)!.trimEnd().endsWith("end │"), "the footer on the right");
  assert.throws(() => card({}), /card\(\) takes a title, text or a footer/);
  // with no frame, its words alone, in the room the lines took
  const bare = card({ title: "ascii.rest", text: "one two three four five six seven", footer: "end", width: 20, frame: false });
  assert.ok(bare.meta.rows <= c.meta.rows - 2);
  assert.ok(!rows(bare, 0).join("").includes("╭"));
  assert.ok(rows(bare, 0)[0].includes("ascii.rest") && rows(bare, 0).at(-1)!.trimEnd().endsWith("end"));
  // a panel too small for what is in it says so, rather than cutting it
  assert.throws(() => panel("hello there", { cols: 8 }), /panel's room inside is 4 by 1, and hello there is 11 by 1: give the panel cols 15 and rows 3 or more, or leave them out/);
});

test("words a cell can't hold are refused when a widget is made, not on its first frame", () => {
  const cases: [() => unknown, RegExp][] = [
    [() => barChart({ "🍎": 3, pear: 2 }), /barChart's names takes words a cell can hold/],
    [() => barChart({ "a\tb": 3 }), /barChart's names takes words a cell can hold.*"\\t"/],
    [() => card({ title: "launch 🚀" }), /card's title takes words a cell can hold/],
    [() => card({ footer: "🚀" }), /card's footer takes words a cell can hold/],
    [() => gauge({ label: "🔥" }), /gauge's label takes words a cell can hold/],
    [() => gauge({ unit: "°🔥" }), /gauge's unit takes words a cell can hold/],
    [() => progressBar({ label: "🚀 deploy" }), /progressBar's label takes words a cell can hold/],
    [() => spinner("dots", { label: "🚀" }), /spinner's label takes words a cell can hold/],
    [() => sparkline([1, 2], { label: "📈" }), /sparkline's label takes words a cell can hold/],
    [() => clockFace({ title: "☕🍵" }), /clockFace's title takes words a cell can hold/],
    [() => card({ title: "two\nlines" }), /card's title takes words a cell can hold, one character each from the Basic Multilingual Plane on one line/],
  ];
  for (const [make, error] of cases) assert.throws(make, error);
  // a character in the Basic Multilingual Plane is one a cell holds
  assert.ok(frame(card({ title: "✨ new" }), 0).includes("✨"));
  assert.ok(svg(gauge({ label: "✨ cpu" })).startsWith("<svg"));
});

test("text too long for a widget says so in the widget's words", () => {
  assert.throws(() => marquee("x".repeat(330)), /marquee\(\) scrolls up to 318 characters, and these words are 330/);
  assert.throws(() => marquee("x".repeat(270), { speed: "slow" }), /marquee\(\) takes 62 seconds to cross at this speed, past the minute a loop can be: at this width and speed it scrolls up to 260 columns of words/);
  assert.throws(() => typewriter("word ".repeat(4000)), /typewriter\(\) takes \d+(\.\d)? seconds to type these words at this speed, past the minute a loop can be/);
  assert.throws(() => typewriter("word ".repeat(4000), { hold: "forever" }), /typewriter\(\)'s words wrap past the 120 rows a piece can have at 40 columns/);
});

test("widgets' loops divide a minute, so a dashboard of them loops", async () => {
  const { grid, row } = await import("../compose.ts");
  const parts = [gauge(), gauge({ value: 64 }), sparkline([3, 5, 2, 8]), barChart({ mon: 3, tue: 5, wed: 4, thu: 8, fri: 6 }), spinner("dots"), clockFace({ size: "small" })];
  for (const p of parts) if (p.meta.loop) assert.equal(60 % p.meta.loop, 0, `${p.meta.name}: ${p.meta.loop}`);
  const dash = grid(parts, { columns: 3, border: { title: true } });
  assert.equal(dash.meta.loop, 60);
  assert.equal(frame(dash, 1.3), frame(dash, 61.3));
  const words = row([typewriter("hello there"), marquee("open late")]);
  assert.ok(words.meta.loop !== undefined, "a typewriter and a marquee come round together");
  for (const t of [typewriter("hello there"), typewriter("a much longer sentence to type out", { speed: "fast" }), marquee("news", { width: 30 }), marquee("x", { speed: 0.7 })])
    assert.equal(60 % t.meta.loop!, 0, `${t.meta.name}: ${t.meta.loop}`);
  // a gauge in a bordered grid draws its own frame, not two: its label once, and a box only round the plain part
  const both = frame(grid([gauge({ value: 30, label: "cpu" }), "plain"], { border: { title: true } }), 0);
  assert.equal(both.split("cpu").length - 1, 1, both);
  assert.equal(both.split("╭").length - 1, 2, both);
});

test("a widget given a colour for each page shows each page's on that page", () => {
  for (const make of [() => typewriter("hello", { color: { light: "#000000", dark: "#ffffff" }, hold: "forever" }), () => marquee("hello", { color: { light: "#000000", dark: "#ffffff" } })]) {
    const p = make();
    for (const paper of [true, false]) {
      const color = new Uint8Array(p.meta.cols * p.meta.rows);
      const text = p.default()(5, { paper, color });
      const i = [...text.replace(/\n/g, "")].findIndex((ch) => /[a-z]/.test(ch));
      assert.ok(i >= 0);
      assert.equal(p.meta.palette![color[i]], paper ? "#000000" : "#ffffff", `${p.meta.name} on ${paper ? "paper" : "a dark page"}`);
    }
  }
  const ocean = typewriter("hello", { color: "ocean", hold: "forever" });
  const color = new Uint8Array(ocean.meta.cols * ocean.meta.rows);
  ocean.default()(5, { paper: true, color });
  assert.equal(ocean.meta.palette![color[0]], "#025a8c", "ocean's paper colour on paper");
});

test("typewriter, marquee and countdown: words that move", () => {
  const t = typewriter("hello world", { width: 5, hold: 1 });
  assert.equal(t.meta.cols, 6, "wrapped to 5, and a column for the cursor");
  assert.equal(t.meta.rows, 2);
  assert.ok(ink(frame(t, 0.2)) < ink(frame(t, 0.6)), "typing");
  assert.ok(frame(t, 0.95).includes("world"));
  assert.ok(loopOf(t).every > 1);
  assert.ok(ink(frame(typewriter("hello world", { speed: "fast" }), 0.4)) > ink(frame(typewriter("hello world"), 0.4)), "faster types sooner");

  const m = marquee("news", { width: 20 });
  assert.equal(m.meta.cols, 20);
  assert.notEqual(frame(m, 0), frame(m, 1));
  assert.equal(m.meta.loop, 3, "a crossing: 20 columns and the words' 6 at 10 a second is 2.6, kept to 3, a loop widgets share");
  assert.equal(marquee("x", { width: 20, speed: "fast" }).meta.loop, 1);

  const c = countdown({ from: 3, to: 1, then: "go" });
  assert.equal(c.meta.loop, 5, "a second for each number and 2 for the words");
  const at = (t: number) => frame(c, t);
  assert.notEqual(at(0.5), at(1.5));
  assert.notEqual(at(1.5), at(2.5));
  assert.equal(at(0.5), at(5.5));
  assert.equal(countdown({ from: 2, then: false }).meta.loop, 2);
  assert.throws(() => countdown({ from: 1, to: 3 }), /countdown's to takes a number no more than its from/);
});

test("widgets check their options and say what to change", () => {
  assert.throws(() => progressBar({ colour: "#ff0000" } as never), /progressBar\(\) has no option "colour": it takes value, min, max, label, width, style, percent, seconds, color, name and note/);
  assert.throws(() => gauge({ color: "red" }), /gauge's color takes a colour as #rrggbb, \{ light, dark \}, or a palette's name such as "ocean", "fire" or "cola" \(see schemes and materialColors\), not "red"/);
  assert.throws(() => typewriter(""), /typewriter\(\) takes words to type/);
  assert.equal(panel(asPiece("x"), { color: { light: "#000000", dark: "#ffffff" } }).meta.palette!.length >= 2, true);
});

test("a widget's color takes a palette's name, as a look's palette does: its strong colour on each page", () => {
  // ocean's light list is 6 long, so its strong colour is the fourth on each page.
  const bar = progressBar({ value: 0.5, color: "ocean" });
  assert.ok(bar.meta.palette!.includes("#025a8c") && bar.meta.palette!.includes("#00b4d8"), String(bar.meta.palette));
  assert.ok(frame(countdown({ from: 2, color: "sunset" }), 0.5).trim().length > 0);
  assert.throws(() => countdown({ color: "oceans" }), /palette\(\) takes a palette's name/);
});
