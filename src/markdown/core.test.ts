// The markdown family's core: the lines a fence holds, the frame, the tones, and component()'s timing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import {
  ACCENT,
  GROUPS,
  INK,
  KINDS,
  MARK,
  QUIET,
  SOFT,
  amount,
  asciiOf,
  blocks,
  clean,
  commas,
  component,
  drawable,
  fence,
  linesOf,
  num,
  plain,
  statements,
  wrap,
  type Common,
} from "./core.ts";
import * as core from "./core.ts";

test("the family: 25 figures in seven groups, each named once", () => {
  assert.equal(KINDS.length, 25);
  assert.equal(new Set(KINDS).size, 25);
  assert.deepEqual(Object.keys(GROUPS), ["lettering", "ornaments", "machines", "internals", "tokens", "games", "places"]);
  assert.deepEqual(GROUPS.lettering, ["headline", "typing", "flap", "marquee"]);
});

test("the core reads no list, table or heading, and no mark gives a word a meaning", () => {
  for (const gone of ["inline", "list", "prose", "noteOf", "pairOf", "tableOf", "sections", "numbers", "runs", "share", "big", "STATUS", "isStatus"]) assert.ok(!(gone in core), gone);
});

test("linesOf: an indented template literal reads as written", () => {
  assert.deepEqual(linesOf("\n    a b\n       c\n    d\n  "), ["a b", "   c", "d"]);
  assert.deepEqual(linesOf("a\r\nb"), ["a", "b"]);
});

test("statements: bare words, quoted texts and key=value, in order, a line each", () => {
  const [a, b] = statements(`
    browser -> api "GET /users" gate=npm
    v=version seat="1 A" "say \\"hi\\""
  `);
  assert.equal(a.line, 1);
  assert.deepEqual(a.words, ["browser", "->", "api"]);
  assert.deepEqual(a.texts, ["GET /users"]);
  assert.deepEqual(a.attrs, { gate: "npm" });
  assert.deepEqual(a.tokens, [{ word: "browser" }, { word: "->" }, { word: "api" }, { text: "GET /users" }, { key: "gate", value: "npm" }]);
  assert.equal(a.raw, 'browser -> api "GET /users" gate=npm');
  assert.equal(b.line, 2);
  assert.deepEqual(b.words, []);
  assert.deepEqual(b.attrs, { v: "version", seat: "1 A" });
  assert.deepEqual(b.texts, ['say "hi"']);
});

test("statements: ! and -> are ordinary characters, typographic quotes fold, blank lines are left out", () => {
  const [s] = statements("!running a->b");
  assert.deepEqual(s.words, ["!running", "a->b"]);
  assert.deepEqual(Object.keys(s), ["line", "words", "texts", "attrs", "tokens", "raw"]);
  assert.deepEqual(statements("“curly” words")[0].texts, ["curly"]);
  const lines = statements("one\n\ntwo");
  assert.deepEqual(lines.map((l) => [l.line, l.words[0]]), [[1, "one"], [3, "two"]]);
  // a word runs into a quote with no space: the quote starts a text
  assert.deepEqual(statements('a"b c"').map((l) => [l.words, l.texts]), [[["a"], ["b c"]]]);
  assert.deepEqual(statements(""), []);
});

test("statements: a quote left open, or a character that can't be drawn, fails naming it", () => {
  assert.throws(() => statements('one\nsay "hello', "say"), /ascii\.rest: say's line 2 opens a quote it doesn't close: "say \\"hello"/);
  assert.throws(() => statements("a → b", "sequence"), /ascii\.rest: sequence takes characters .* not "→"/);
});

test("blocks: lines grouped by blank lines, their shared indent left out and their spaces kept", () => {
  assert.deepEqual(blocks("  .##.\n  #  #\n\n\n  .##.\n   ##"), [[".##.", "#  #"], [".##.", " ##"]]);
  assert.deepEqual(blocks(""), []);
});

test("clean: typographic marks fold to plain ones; arrows, checks and what can't be drawn throw", () => {
  // an em dash and an en dash, by their code points
  const em = String.fromCharCode(0x2014), en = String.fromCharCode(0x2013);
  assert.equal(clean(`it’s “fine” ${em} really… 1${en}2`), `it's "fine" - really... 1-2`);
  for (const ch of ["→", "←", "✓", "✔", "✗", "é", "\u{1F600}"]) assert.throws(() => clean(`a ${ch}`), /ascii\.rest: .*one cell wide/, ch);
  assert.ok(drawable("─") && drawable("·") && drawable("●") && !drawable("✓") && !drawable("→"));
});

test("num, amount and commas read and write numbers as people do", () => {
  assert.equal(num("12,400"), 12400);
  assert.equal(num("1.5k"), 1500);
  assert.equal(num("-6"), -6);
  assert.ok(Number.isNaN(num("1,2")));
  assert.deepEqual(amount("820 ms"), { value: 820, unit: "ms", text: "820" });
  assert.deepEqual(amount("820ms"), { value: 820, unit: "ms", text: "820" });
  assert.deepEqual(amount("+31 kb"), { value: 31, unit: "kb", text: "+31" });
  assert.equal(commas(343303), "343,303");
});

test("wrap: words to a width, long words broken, newlines kept", () => {
  assert.deepEqual(wrap("the cli copies the source", 10), ["the cli", "copies the", "source"]);
  assert.deepEqual(wrap("abcdefghijkl", 5), ["abcde", "fghij", "kl"]);
  assert.deepEqual(wrap("a\nb", 10), ["a", "b"]);
  assert.deepEqual(wrap("", 10), []);
});

test("fence: an info string's figure and options, quoted values, numbers and booleans", () => {
  assert.deepEqual(fence(`ascii flame title="render, 48 ms" width=40 unit=ms still`), {
    lang: "ascii",
    kind: "flame",
    options: { title: "render, 48 ms", width: 40, unit: "ms", still: true },
  });
  assert.deepEqual(fence("ascii world here='sfo' loud=false").options, { here: "sfo", loud: false });
  // a title is its words as written, so a version stays a version
  assert.deepEqual(fence("ascii ticket title=2.0").options, { title: "2.0" });
  assert.deepEqual(fence("ascii headline title=false").options, { title: false });
});

test("asciiOf: box drawing as + - |, one character for one", () => {
  const line = "╭─ x ─╮│ ┃ ● █░┄";
  const a = asciiOf(line);
  assert.equal(a, "+- x -+| | * #--");
  assert.equal(a.length, line.length);
});

// A small figure of our own, through component(): a word a line, the one named by `pick` marked once it is built.
function words(source: string, options?: Common & { pick?: string }) {
  return component("words", options, ["pick"], (o, room) => {
    const lines = statements(source, "words").map((s) => s.words.join(" "));
    const width = Math.max(room.cols ?? 20, 16);
    return {
      cols: width,
      rows: lines.length,
      intro: 1,
      title: "words",
      status: `${lines.length} words`,
      says: lines.join(", "),
      draw(s, t, at) {
        lines.forEach((l, i) => s.write(at.x, at.y + i, l, l === o.pick && t >= 0.5 ? MARK : i % 2 ? SOFT : INK));
      },
    };
  });
}

test("component: the frame, its title and status, padded a column each side", () => {
  const p = words("one\ntwo\nthree");
  assert.equal(p.kind, "words");
  assert.equal(p.meta.cols, 24);
  assert.equal(p.meta.rows, 5);
  assert.equal(plain(p), ["╭─ words ──────────────╮", "│ one                  │", "│ two                  │", "│ three                │", "╰──────────── 3 words ─╯"].join("\n"));
  assert.equal(p.says, "one, two, three");
  // its title, a width of its own, another frame, or none
  assert.match(plain(words("a", { title: "mine", width: 30, frame: "ascii" })).split("\n")[0], /^\+- mine -+\+$/);
  assert.equal(plain(words("a", { frame: "none" })), "a");
  assert.match(plain(words("a", { title: false })).split("\n")[0], /^╭─+╮$/);
  // a number for a title reads as its words
  assert.match(plain(words("a", { title: 2 as never })).split("\n")[0], /^╭─ 2 ─+╮$/);
});

test("component: a label with no title, and a status wider than the body, are never dropped", () => {
  const edges = (label: string, status: string) =>
    component("edges", undefined, [], () => ({ cols: 1, rows: 1, intro: 0, label, status, says: "edges", draw() {} }));
  const top = plain(edges("no readings", "")).split("\n");
  assert.equal(top[0], "╭─ no readings ─╮");
  assert.equal(top.length, 3);
  const bottom = plain(edges("", "a status longer than the body")).split("\n");
  assert.equal(bottom[2], "╰─ a status longer than the body ─╯");
  assert.equal(bottom[0].length, bottom[2].length);
});

test("component: once builds in and holds, its still the finished figure, and svg() plays it once", () => {
  const p = words("one\ntwo", { pick: "two" });
  assert.equal(p.meta.fps, 30);
  assert.equal(p.meta.still, 1);
  assert.equal(p.meta.loop, undefined);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 1, from: 0, once: true });
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const frame = p.default();
  const at = (t: number) => (frame(t, { paper: true, color }), color[2 * p.meta.cols + 2]);
  assert.equal(at(0.2), SOFT);
  assert.equal(at(0.9), MARK);
  assert.equal(at(5), MARK);
  // the glint passes over the title as it comes into view, and is gone in the still
  frame(0.3, { paper: true, color });
  assert.ok([...color.slice(3, 8)].some((c) => c === ACCENT || c === 9));
  frame(1, { paper: true, color });
  assert.ok([...color.slice(3, 8)].every((c) => c === INK));
  // the frame's lines are quiet
  assert.equal(color[0], QUIET);
  const out = svg(p, { dark: true });
  assert.match(out, /1 forwards/);
});

test("component: a cycle keeps moving once built, seamless, its still at the end of the build, and svg() loops it", () => {
  // a dot going round a ring of 8 cells, once every 2 seconds, after a build of 1
  const ring = (options?: Common) =>
    component("ring", options, [], () => ({
      cols: 8,
      rows: 1,
      intro: 1,
      cycle: 2,
      says: "a dot going round",
      draw(s, t, at) {
        s.write(at.x, at.y, "·".repeat(8), QUIET);
        if (!at.still && t > 1) s.set(at.x + (Math.floor(((t - 1) / 2) * 8) % 8), at.y, "●", ACCENT);
        if (t < 1) s.write(at.x, at.y, " ".repeat(Math.ceil((1 - t) * 8)));
      },
    }));
  const p = ring();
  assert.equal(p.idle, true);
  assert.equal(p.meta.still, 1);
  assert.equal(p.meta.loop, undefined);
  assert.deepEqual(p.motion, { seconds: 2, from: 1, once: false });
  const frame = p.default();
  const text = (t: number) => frame(t, { paper: true });
  // the still has no dot; past it the dot goes round, and comes back to where the cycle started
  assert.equal(plain(p), "╭──────────╮\n│ ········ │\n╰──────────╯");
  assert.match(text(1.5), /●/);
  assert.equal(text(1.25), text(3.25));
  assert.equal(text(1 + 1e-6).replace("●", "·"), text(1));
  // at speed, the build and the cycle scale together
  assert.deepEqual(ring({ speed: 2 }).motion, { seconds: 1, from: 0.5, once: false });
  // svg() loops the cycle from the end of the build
  assert.match(svg(p), /infinite/);
  // play "still" never moves, a cycle or not
  assert.equal(ring({ play: "still" }).idle, false);
  assert.equal(ring({ play: "still" }).motion, undefined);
  assert.throws(() => component("bad", undefined, [], () => ({ cols: 1, rows: 1, intro: 0, cycle: 0, says: "x", draw() {} })), /a cycle is a number of seconds above 0, or none/);
});

test("component: a figure's own defaults for frame and play, which options still change", () => {
  const bare = (options?: Common) => component("bare", options, [], () => ({ cols: 3, rows: 1, intro: 0, says: "abc", draw: (s, _, at) => s.write(at.x, at.y, "abc") }), { frame: "none" });
  assert.equal(plain(bare()), "abc");
  assert.equal(plain(bare({ frame: "single" })), "┌─────┐\n│ abc │\n└─────┘");
});

test("component: a dashed rule across the body meets the frame at its joins", () => {
  const stub = (options?: Common) =>
    component(
      "stub",
      options,
      [],
      () => ({ cols: 6, rows: 3, intro: 0, joins: [1], says: "a stub", draw: (s, _, at) => (s.write(at.x, at.y, "admit"), s.write(at.x, at.y + 1, "┄".repeat(6), QUIET), s.write(at.x, at.y + 2, "one")) }),
    );
  assert.equal(plain(stub()), ["╭────────╮", "│ admit  │", "├┄┄┄┄┄┄┄┄┤", "│ one    │", "╰────────╯"].join("\n"));
  assert.equal(plain(stub({ frame: "double" })).split("\n")[2], "╟┄┄┄┄┄┄┄┄╢");
  assert.equal(plain(stub({ frame: "none" })), ["admit", "┄┄┄┄┄┄", "one"].join("\n"));
});

test("component: loop comes round on a loop that divides a minute; still never moves; speed scales the build", () => {
  const loop = words("a", { play: "loop" });
  assert.equal(loop.meta.loop, 4);
  assert.deepEqual(loop.motion, { seconds: 4, from: 0, once: false });
  const still = words("a", { play: "still" });
  assert.equal(still.meta.fps, 0);
  assert.equal(still.motion, undefined);
  assert.equal(words("a", { speed: "fast" }).meta.still, 0.5);
});

test("component: options are checked when it is made, the kit's way", () => {
  assert.throws(() => words("a", { play: "loops" } as never), /ascii\.rest: words's play takes "once", "loop" or "still", not "loops" \(did you mean "loop"\?\)/);
  assert.throws(() => words("a", { colour: "ocean" } as never), /has no option "colour" \(did you mean "color"\?\)/);
  assert.throws(() => words("a", { width: 8 }), /width takes a whole number from 16 to 160/);
  assert.throws(() => words("a", { width: 18 }), /needs 20 columns for this, and its width is 18/);
  // a body that sizes itself past the 160 columns a figure can take says so, rather than losing what is past them
  const wide = (cols: number) => component("wide", undefined, [], () => ({ cols, rows: 1, intro: 0, says: "wide", draw: (s, _, at) => s.write(at.x, at.y, "x".repeat(cols)) }));
  assert.equal(wide(156).meta.cols, 160);
  assert.throws(() => wide(157), /ascii\.rest: wide needs 161 columns for this, past the 160 a figure can take: give it less to show, or shorter words/);
  assert.throws(() => words("a", { color: "#nope" }), /ascii\.rest:/);
  // a colour of its own replaces the accent, and a palette's name is its strong colour
  const own = words("a", { color: "#0969da" });
  assert.equal(own.meta.palette![ACCENT], "#0969da");
});
