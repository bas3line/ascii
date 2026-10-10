// say: a little creature with a balloon of words.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence, kinds } from "./index.ts";
import { CREATURES, say } from "./say.ts";

const STILL = [
  "╭───────────────────────────╮",
  "│ a fence in, a figure out. │",
  "╰──┬────────────────────────╯",
  "    ╲",
  "     /\\_/\\",
  "    ( o.o )",
  "     > ^ <",
].join("\n");
const OWL = [
  "╭─────────────────────────────╮",
  "│ where did i put that fence? │",
  "╰─────────────────────────────╯",
  "   O",
  "    o",
  "    ,___,",
  "    {o,o}",
  "    /)__)",
  '    -"-"-',
].join("\n");
const SOURCE = entryOf("say").source;

function sane(p: MarkdownPiece) {
  const { cols, rows } = p.meta;
  const frame = p.default();
  const end = (p.meta.still ?? 0) + (p.motion?.once === false ? p.motion.seconds : 0) + 0.2;
  for (let t = 0; t <= end; t += 0.05) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, cols, `t=${t}: ${JSON.stringify(l)}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)}`);
    }
  }
}
const toned = (p: MarkdownPiece, t: number) => {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, color: [...color] };
};

test("say: the catalog's example draws its still, a cat under a balloon, through plain() and a fence", () => {
  assert.equal(SOURCE, "a fence in, a figure out.");
  const p = say(SOURCE);
  assert.equal(plain(p), STILL);
  assert.equal(plain(say(SOURCE, fence("ascii say").options)), STILL);
  assert.equal(p.says, "say: a cat says a fence in, a figure out.");
  // the catalog's owl thinking
  const { options } = fence("ascii say creature=owl balloon=think");
  const owl = say("where did i put that fence?", options);
  assert.equal(plain(owl), OWL);
  assert.equal(owl.says, "say: an owl thinks where did i put that fence?");
});

test("say: through fromFence(), once index.ts has it", { skip: !Object.hasOwn(kinds, "say") && "index.ts does not list say yet" }, () => {
  assert.equal(plain(fromFence("ascii say", SOURCE)), STILL);
});

test("say: the creature appears, the balloon opens, the words type, and the still is every word", () => {
  const p = say(SOURCE);
  const at = (t: number) => p.default()(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  // 25 characters at 30 a second, after the balloon opens at 0.4 s
  assert.ok(Math.abs(p.meta.still! - (0.4 + 25 / 30)) < 1e-9, String(p.meta.still));
  // the cat first, no balloon yet
  const first = at(0.1).split("\n");
  assert.equal(first.slice(4).join("\n"), STILL.split("\n").slice(4).join("\n"));
  assert.equal(first[0], "");
  // the balloon opening from its tail's side
  assert.match(at(0.25).split("\n")[0], /^╭─+╮$/);
  assert.ok(at(0.25).split("\n")[0].length < 29);
  // the words typing
  assert.match(at(0.6).split("\n")[1], /^│ a fen?c?\s+│$/);
  assert.equal(at(p.meta.still!), STILL);
  sane(p);
});

test("say: every creature idles once in a 4 second cycle, seamless, its still at rest", () => {
  for (const creature of CREATURES) {
    for (const balloon of ["say", "think"] as const) {
      const p = say("hello there", { creature, balloon });
      assert.equal(p.idle, true);
      assert.deepEqual(p.motion, { seconds: 4, from: p.meta.still, once: false });
      const still = toned(p, p.meta.still!);
      assert.deepEqual(toned(p, p.meta.still! + 4), still, `${creature} ${balloon}`);
      // it does move in its cycle
      const moved = [1.05, 1.3, 1.55, 1.8, 2.05].some((s) => toned(p, p.meta.still! + s).text !== still.text);
      assert.ok(moved, `${creature} ${balloon}`);
      sane(p);
    }
  }
  // the cat's blink: o.o to -.- for 0.15 s
  const cat = say(SOURCE);
  assert.match(cat.default()(cat.meta.still! + 2.05, { paper: true }), /\( -\.- \)/);
  assert.match(cat.default()(cat.meta.still! + 2.2, { paper: true }), /\( o\.o \)/);
  // svg() loops the idle
  assert.match(svg(cat), /infinite/);
});

test("say: tones, the balloon quiet, the words ink, the creature soft and its eyes the accent", () => {
  const p = say(SOURCE);
  const { text, color } = toned(p, p.meta.still!);
  const cols = p.meta.cols;
  const lines = text.split("\n");
  assert.equal(color[0], QUIET);
  assert.equal(color[cols + 2], INK);
  assert.equal(color[3 * cols + 4], QUIET);
  assert.equal(lines[5][6], "o");
  assert.equal(color[5 * cols + 6], ACCENT);
  assert.equal(color[5 * cols + 8], ACCENT);
  assert.equal(color[5 * cols + 4], SOFT);
});

test("say: takes its words as data, wraps them, and keeps paragraphs", () => {
  assert.equal(plain(say({ text: "a fence in, a figure out." })), STILL);
  // lines are joined by a space; a blank line is a new paragraph in the balloon
  const p = plain(say("one two\nthree\n\nfour")).split("\n");
  assert.deepEqual(p.slice(0, 5), ["╭───────────────╮", "│ one two three │", "│               │", "│ four          │", "╰──┬────────────╯"]);
  // wrapped at 28 columns
  const long = plain(say("the quick brown fox jumps over the lazy dog and keeps on running")).split("\n");
  assert.deepEqual(long.slice(1, 4), ["│ the quick brown fox jumps   │", "│ over the lazy dog and keeps │", "│ on running                  │"]);
  // a word longer than a line is broken across lines
  const word = say("x".repeat(70));
  assert.equal(plain(word).split("\n")[1], `│ ${"x".repeat(28)} │`);
  sane(word);
  // to the width, when given
  const wide = plain(say("the quick brown fox jumps over the lazy dog", { width: 60 })).split("\n");
  assert.equal(wide[1], "│ the quick brown fox jumps over the lazy dog │");
});

test("say: says what is wrong, the kit's way", () => {
  assert.throws(() => say(""), /ascii\.rest: say takes the words for its balloon/);
  assert.throws(() => say("   \n\n  "), /say takes the words for its balloon/);
  assert.throws(() => say("hi", { creature: "dog" as never }), /say's creature takes .* not "dog"/);
  assert.throws(() => say("hi", { creature: "robo" as never }), /did you mean "robot"/);
  assert.throws(() => say("hi", { balloon: "shout" as never }), /say's balloon takes "say" or "think", not "shout"/);
  assert.throws(() => say("hi", { mood: "happy" } as never), /say\(\) has no option "mood": it takes .* creature and balloon/);
  assert.throws(() => say("café time"), /say takes characters every monospace face draws one cell wide/);
  // a check mark, by its code point
  assert.throws(() => say(`${String.fromCharCode(0x2714)} done`), new RegExp(`not "${String.fromCharCode(0x2714)}"`));
  assert.throws(() => say("w ".repeat(2000)), /say draws \d+ rows, past the 120 a piece can have/);
  assert.throws(() => say({ text: 3 } as never), /say's text takes words, not 3/);
  assert.throws(() => say(undefined as never), /say\(\) takes a fence's body/);
  // quotes are only words here: the balloon shows them as written
  assert.match(plain(say('she said "hi"')), /│ she said "hi" │/);
});
