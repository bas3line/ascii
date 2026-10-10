// typing: a line that types itself, holds, erases its quoted word and types the next.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, GLINT, INK, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { typing } from "./typing.ts";

const SOURCE = entryOf("typing").source;
const STILL = "ascii.rest draws scenes";
// What a fence draws.
const drawn = (info: string, body: string) => fromFence(info, body);
const toned = (p: MarkdownPiece, t: number) => {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, color: [...color] };
};
const at = (p: MarkdownPiece, t: number) => plain(p, { t });
// The cycle's rounds for the catalog's example: a hold of 1.6 s, an erase at 30 a second, a beat of 0.25 s, then
// the next word typed at 18 a second.
const ROUND = [1.6 + 6 / 30 + 0.25 + 7 / 18, 1.6 + 7 / 30 + 0.25 + 7 / 18, 1.6 + 7 / 30 + 0.25 + 6 / 18];

test("typing: the catalog's example draws its still, the first word typed and no cursor, through plain() and a fence", () => {
  const p = typing(SOURCE);
  assert.equal(SOURCE, 'ascii.rest draws "scenes" "banners" "figures"');
  assert.equal(plain(p), STILL);
  assert.equal(plain(drawn("ascii typing", SOURCE)), STILL);
  // unframed, one row, as wide as its longest line and a column for the cursor
  assert.equal(p.meta.cols, "ascii.rest draws banners".length + 1);
  assert.equal(p.meta.rows, 1);
  assert.equal(p.says, "typing: ascii.rest draws scenes, banners, figures.");
  assert.equal(p.kind, "typing");
});

test("typing: types the line at 18 characters a second behind its cursor; the still holds after", () => {
  const p = typing(SOURCE);
  assert.equal(p.meta.still, STILL.length / 18);
  assert.equal(at(p, 0), "▌");
  assert.equal(at(p, 0.6), "ascii.rest▌");
  assert.notEqual(at(p, 1), STILL);
  assert.equal(at(p, p.meta.still!), STILL);
  // while typing, the fixed words in ink and the word in the accent
  const mid = toned(p, 1.2);
  const k = "ascii.rest draws ".length;
  assert.equal(mid.text.slice(k, k + 2), "sc");
  assert.equal(mid.color[0], INK);
  assert.equal(mid.color[k], ACCENT);
});

test("typing: each word holds with its glint and the cursor blinking, is erased and the next typed, round to the still", () => {
  const p = typing(SOURCE);
  const intro = p.meta.still!;
  const cycle = ROUND[0] + ROUND[1] + ROUND[2];
  assert.equal(p.idle, true);
  assert.ok(Math.abs(p.motion!.seconds - cycle) < 1e-9);
  assert.equal(p.motion!.from, intro);
  assert.equal(p.motion!.once, false);
  // holding: the cursor blinks at 2 Hz, off for its first quarter second
  assert.equal(at(p, intro + 0.1), STILL);
  assert.equal(at(p, intro + 0.3), `${STILL}▌`);
  // erasing at 30 a second, a beat with nothing there, then the next typed at 18
  assert.equal(at(p, intro + 1.7), "ascii.rest draws sce▌");
  assert.equal(at(p, intro + 1.9), "ascii.rest draws ▌");
  assert.equal(at(p, intro + 2.05 + 0.25), "ascii.rest draws bann▌");
  assert.equal(at(p, intro + ROUND[0] + 0.1), "ascii.rest draws banners");
  assert.equal(at(p, intro + ROUND[0] + ROUND[1] + 0.1), "ascii.rest draws figures");
  // a glint crosses the word as it lands, never in the still
  const glints = [0.05, 0.15, 0.25, 0.35].some((u) => toned(p, intro + u).color.includes(GLINT));
  assert.ok(glints);
  const still = toned(p, intro);
  assert.ok(!still.color.includes(GLINT));
  assert.equal(still.text.trimEnd(), STILL);
  // the frame a cycle ends on is the still, colours and all, and the next one's too
  assert.deepEqual(toned(p, intro + cycle), still);
  assert.deepEqual(toned(p, intro + 2 * cycle), still);
  // svg() loops the cycle
  assert.match(svg(p), /infinite/);
});

test("typing: takes its words as data too, and a line whose word never changes types once and blinks", () => {
  assert.equal(plain(typing({ before: "ascii.rest draws", turns: ["scenes", "banners", "figures"] })), STILL);
  const fixed = typing("hello world");
  assert.equal(plain(fixed), "hello world");
  assert.equal(fixed.says, "typing: hello world.");
  // only its cursor blinks, a second a round
  assert.equal(fixed.idle, true);
  assert.equal(fixed.motion!.seconds, 1);
  assert.equal(at(fixed, fixed.meta.still! + 0.3), "hello world▌");
  // with no cursor it types once and holds
  const once = typing('one "word"', { cursor: false });
  assert.equal(once.idle, false);
  assert.equal(once.meta.cols, "one word".length);
  assert.match(svg(once), /1 forwards/);
  assert.equal(plain(typing({ turns: ["only"], after: "this" })), "only this");
});

test("typing: the quoted words take turns where they are written, the words after them moving with them", () => {
  const p = typing('"fast" "small" by default');
  assert.equal(plain(p), "fast by default");
  assert.equal(p.meta.cols, "small by default".length + 1);
  const intro = p.meta.still!;
  // erasing "fast": the cursor stands where the word was, the rest of the line closes up behind it
  assert.equal(at(p, intro + 1.6 + 0.1), "f▌by default");
  assert.equal(at(p, intro + 1.6 + 4 / 30 + 0.1), "▌by default");
  assert.equal(p.says, "typing: fast, small by default.");
});

test("typing: its own options, and the options every figure takes", () => {
  // hold: each word holds longer, and the cycle with it
  const slow = typing(SOURCE, { hold: 3 });
  assert.ok(Math.abs(slow.motion!.seconds - typing(SOURCE).motion!.seconds - 3 * 1.4) < 1e-9);
  // no cursor: a column narrower, and never a ▌
  const bare = typing(SOURCE, { cursor: false });
  assert.equal(bare.meta.cols, "ascii.rest draws banners".length);
  for (const t of [0.3, 1, 2, 3, 4, 5]) assert.doesNotMatch(at(bare, t), /▌/);
  // a width, a frame and a title
  const framed = typing(SOURCE, { width: 40, frame: "rounded", title: "tagline" });
  assert.equal(framed.meta.cols, 40);
  assert.deepEqual(plain(framed).split("\n"), [`╭─ tagline ${"─".repeat(28)}╮`, `│ ${STILL.padEnd(36)} │`, `╰${"─".repeat(38)}╯`]);
  // from a fence, its options as a fence writes them
  assert.equal(drawn("ascii typing hold=0.5 cursor=false", SOURCE).meta.cols, 24);
  // a long line types faster, done within 3 seconds
  const long = typing(`${"word ".repeat(28).trim()} "end" "stop"`);
  assert.ok(long.meta.still! <= 3 + 1e-9, String(long.meta.still));
  assert.equal(plain(long), `${"word ".repeat(28)}end`);
});

test("typing: says what is wrong, the kit's way, and never draws what it can't", () => {
  assert.throws(() => typing(""), /ascii\.rest: typing takes a line to type, with the words that take turns in quotes/);
  assert.throws(() => typing("\n  \n"), /typing takes a line to type/);
  assert.throws(() => typing("one line\nand another"), /typing types one line, and line 2 is a second one: "and another"/);
  assert.throws(() => typing('a "b" c "d"'), /typing's quoted words take turns in one place, and "d" stands apart from the others, after "c"/);
  assert.throws(() => typing('ascii.rest draws "scenes'), /typing's line 1 opens a quote it doesn't close/);
  assert.throws(() => typing('draws "scenes" hold=2'), /typing's line has hold="2": its options go on the fence, as ```ascii typing hold=2/);
  assert.throws(() => typing('ascii.rest draws "scènes"'), /typing takes characters every monospace face draws one cell wide.*"è"/);
  assert.throws(() => typing("ascii.rest draws \u{1F600}"), /typing takes characters every monospace face draws one cell wide/);
  assert.throws(() => typing('ascii.rest draws ""'), /typing's turn 1 is empty/);
  assert.throws(() => typing("x".repeat(200)), /typing types one line of up to 155 characters and its cursor, and "x{40}\.\.\." needs 200/);
  assert.throws(() => typing(SOURCE, { width: 20 }), /typing needs 25 columns for "ascii\.rest draws scenes" and its longest word and its cursor, and its width is 20/);
  assert.throws(() => typing(SOURCE, { hold: 0 }), /typing's hold takes a number from 0\.2 to 10, not 0/);
  assert.throws(() => typing(SOURCE, { cursor: "yes" as never }), /typing's cursor takes true or false, not "yes"/);
  assert.throws(() => typing(SOURCE, { holds: 2 } as never), /typing\(\) has no option "holds" \(did you mean "hold"\?\)/);
  assert.throws(() => typing({ turns: "scenes" as never }), /typing's turns take a list of words/);
  assert.throws(() => typing({ turns: [] }), /typing takes words to type/);
  assert.throws(() => typing({ turns: Array.from({ length: 13 }, (_, i) => `w${i}`) }), /typing takes up to 12 words that take turns, not 13/);
  assert.throws(() => typing({ before: 4 as never, turns: ["a"] }), /typing's before takes words, not 4/);
  assert.throws(() => typing(42 as never), /typing\(\) takes a fence's body/);
  // every frame of a cycle is one row of drawable characters, as wide as the figure
  const p = typing(SOURCE);
  for (let t = 0; t < 10; t += 0.07) {
    const f = p.default()(t, { paper: true });
    assert.equal(f.length, p.meta.cols);
    assert.match(f, /^[ -~▌]*$/);
  }
});
