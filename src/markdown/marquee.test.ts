// marquee: a ticker, its items scrolling past behind a window, round and round.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { marquee } from "./marquee.ts";

const SOURCE = entryOf("marquee").source;
const STILL = [
  "╭──────────────────────────────────────────────╮",
  "│ markdown figures · a fence in, a picture out │",
  "╰──────────────────────────────────────────────╯",
].join("\n");
// What a fence draws.
const drawn = (info: string, body: string) => fromFence(info, body);
const toned = (p: MarkdownPiece, t: number) => {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, color: [...color] };
};
// The window's row at t: the body inside the frame and its padding.
const windowAt = (p: MarkdownPiece, t: number) => p.default()(t, { paper: true }).split("\n")[1].slice(2, p.meta.cols - 2);

test("marquee: the catalog's example draws its still, the items that fit whole, through plain() and a fence", () => {
  const p = marquee(SOURCE);
  assert.equal(SOURCE, '"markdown figures" "a fence in, a picture out" "npx ascii.rest add markdown"');
  assert.equal(plain(p), STILL);
  assert.equal(plain(drawn("ascii marquee", SOURCE)), STILL);
  assert.equal(p.meta.cols, 48);
  assert.equal(p.meta.rows, 3);
  assert.equal(p.says, "marquee: markdown figures; a fence in, a picture out; npx ascii.rest add markdown.");
  assert.equal(p.kind, "marquee");
  // items in ink, the dots between them in the accent
  const still = toned(p, p.meta.still!);
  const row = still.text.split("\n")[1];
  assert.equal(still.color[48 + row.indexOf("·")], ACCENT);
  assert.equal(still.color[48 + row.indexOf("m")], INK);
});

test("marquee: slides in from the right and eases to rest; the still holds at the end of the build", () => {
  const p = marquee(SOURCE);
  assert.equal(p.meta.still, 0.8);
  assert.equal(windowAt(p, 0).trim(), "");
  const early = windowAt(p, 0.3);
  assert.notEqual(early, windowAt(p, 0.8));
  assert.match(early, /^ +markdown figures/);
  assert.equal(plain(p, { t: 0.8 }), STILL);
});

test("marquee: scrolls 8 cells a second round the whole strip, a cell at a time, back to its still", () => {
  const p = marquee(SOURCE);
  const intro = p.meta.still!;
  // the strip: the three items, a mark after each: 77 cells, a loop of 77 / 8 seconds
  const cycle = 77 / 8;
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: cycle, from: intro, once: false });
  assert.equal(windowAt(p, intro + 1), " figures · a fence in, a picture out · npx a");
  // every step is the window moved one cell left, a new cell at its right: nothing pops in
  for (let k = 1; k <= 77; k++) {
    const before = windowAt(p, intro + (k - 1) / 8 + 0.01), after = windowAt(p, intro + k / 8 + 0.01);
    assert.equal(after.slice(0, -1), before.slice(1), `step ${k}`);
  }
  assert.deepEqual(toned(p, intro + cycle), toned(p, intro));
  assert.deepEqual(toned(p, intro + 3 * cycle), toned(p, intro));
  assert.match(svg(p), /infinite/);
});

test("marquee: at rest it shows only whole items, keeping the blank after them in the strip so none pops in", () => {
  const p = marquee('"v0.5 is out" "npx ascii.rest add markdown"', { width: 40 });
  assert.equal(plain(p).split("\n")[1], "│ v0.5 is out                          │");
  const intro = p.meta.still!;
  // 11 + the 25 blank to the window's edge + a mark, then the second item and a mark: 69 cells
  assert.equal(p.motion!.seconds, 69 / 8);
  for (let k = 1; k <= 69; k++) {
    const before = windowAt(p, intro + (k - 1) / 8 + 0.01), after = windowAt(p, intro + k / 8 + 0.01);
    assert.equal(after.slice(0, -1), before.slice(1), `step ${k}`);
  }
  assert.equal(windowAt(p, intro + 0.5), ` is out${" ".repeat(25)} · n`);
  assert.deepEqual(toned(p, intro + p.motion!.seconds), toned(p, intro));
  // every item fits: blank to the edge and a mark, then round
  const all = marquee('"ship it"');
  assert.equal(plain(all).split("\n")[1], `│ ship it${" ".repeat(37)} │`);
  assert.equal(all.motion!.seconds, 47 / 8);
  // a first item wider than the window shows its start, and still scrolls round seamlessly
  const wide = marquee(`"${"a long item ".repeat(5).trim()}" "next"`);
  assert.equal(windowAt(wide, wide.meta.still!), "a long item a long item a long item a long i");
  assert.deepEqual(toned(wide, wide.meta.still! + wide.motion!.seconds), toned(wide, wide.meta.still!));
});

test("marquee: a line with no quotes is one item, and the items as data", () => {
  assert.equal(plain(marquee("shipping today")).split("\n")[1], "│ shipping today                               │");
  assert.equal(marquee("v=1 is   out\n\"two\"").says, "marquee: v=1 is out; two.");
  assert.equal(plain(marquee({ items: ["markdown figures", "a fence in, a picture out", "npx ascii.rest add markdown"] })), STILL);
});

test("marquee: its own options, and the options every figure takes", () => {
  // sep: its mark with a space each side, or spaces alone
  assert.equal(plain(marquee(SOURCE, { sep: "/" })).split("\n")[1], "│ markdown figures / a fence in, a picture out │");
  assert.equal(plain(marquee(SOURCE, { sep: "" })).split("\n")[1], "│ markdown figures   a fence in, a picture out │");
  assert.equal(plain(drawn('ascii marquee sep="|"', SOURCE)).split("\n")[1], "│ markdown figures | a fence in, a picture out │");
  // a width, no frame, a title
  const bare = marquee(SOURCE, { frame: "none", width: 30 });
  assert.equal(bare.meta.cols, 30);
  assert.equal(plain(bare), "markdown figures");
  assert.match(plain(marquee(SOURCE, { title: "news" })).split("\n")[0], /^╭─ news ─+╮$/);
  // faster: the same loop in half the time
  assert.equal(marquee(SOURCE, { speed: 2 }).motion!.seconds, 77 / 16);
});

test("marquee: says what is wrong, the kit's way, and never draws what it can't", () => {
  assert.throws(() => marquee(""), /ascii\.rest: marquee takes items to scroll, each in quotes/);
  assert.throws(() => marquee('news "a" "b"'), /marquee's line 1 has "news" beside its quoted items: put it in quotes too, or on a line of its own/);
  assert.throws(() => marquee('"a" sep=|'), /marquee's line 1 has sep="\|": its options go on the fence, as ```ascii marquee sep=\|/);
  assert.throws(() => marquee('"a fence in'), /marquee's line 1 opens a quote it doesn't close/);
  assert.throws(() => marquee('"news" ""'), /marquee's item 2 is empty/);
  assert.throws(() => marquee('"naïve"'), /marquee takes characters every monospace face draws one cell wide.*"ï"/);
  assert.throws(() => marquee('"ship \u{1F6A2}"'), /marquee takes characters every monospace face draws one cell wide/);
  assert.throws(() => marquee(Array.from({ length: 10 }, (_, i) => `"${String(i).repeat(50)}"`).join(" ")), /marquee loops up to 480 cells, a minute at 8 a second, and these items take 530: fewer items, or shorter ones/);
  assert.throws(() => marquee({ items: Array.from({ length: 25 }, () => "a") }), /marquee takes up to 24 items, not 25/);
  assert.throws(() => marquee(SOURCE, { sep: "----" }), /marquee's sep takes a mark of up to 3 characters/);
  assert.throws(() => marquee(SOURCE, { sep: 4 as never }), /marquee's sep takes a mark of up to 3 characters, such as "·" or "\/", or "" for spaces alone, not 4/);
  assert.throws(() => marquee(SOURCE, { seps: "/" } as never), /marquee\(\) has no option "seps" \(did you mean "sep"\?\)/);
  assert.throws(() => marquee({ items: [] }), /marquee takes items to scroll/);
  assert.throws(() => marquee({ items: [7 as never] }), /marquee's item 1 takes words, not 7/);
  assert.throws(() => marquee(42 as never), /marquee\(\) takes a fence's body/);
  // every frame is the figure's size, in drawable characters only
  const p = marquee(SOURCE);
  for (let t = 0; t < 12; t += 0.09) {
    const f = p.default()(t, { paper: true }).split("\n");
    assert.equal(f.length, 3);
    for (const l of f) assert.equal(l.length, 48);
    assert.match(f[1], /^│[ -~·]*│$/);
  }
});
