// divider: a band of moving art between sections, words in its middle.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, QUIET, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { DIVIDER_STYLES, divider } from "./divider.ts";
import { fromFence } from "./index.ts";

const STILL = "_.-'~'-._.-'~'-._.  part two  -._.-'~'-._.-'~'-.";
const SOURCE = entryOf("divider").source;

// Every frame the figure's size, every character one a figure may draw, through the build and round the cycle.
function sane(p: MarkdownPiece) {
  const { cols, rows } = p.meta;
  const frame = p.default();
  const end = (p.meta.still ?? 0) + (p.motion?.once === false ? p.motion.seconds : 0) + 0.5;
  for (let t = 0; t <= end; t += 0.13) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, cols, `t=${t}: ${JSON.stringify(l)}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)} in ${JSON.stringify(l)}`);
    }
  }
}
// A frame's text and the tone of each cell.
const toned = (p: MarkdownPiece, t: number) => {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, color: [...color] };
};

test("divider: the catalog's example draws its still, waves round part two, through plain() and a fence", () => {
  assert.equal(SOURCE, 'waves "part two"');
  const p = divider(SOURCE);
  assert.equal(plain(p), STILL);
  assert.equal(p.meta.cols, 48);
  assert.equal(p.meta.rows, 1);
  const { options } = fence("ascii divider");
  assert.equal(plain(divider(SOURCE, options)), STILL);
  assert.equal(p.says, "divider: waves, part two.");
});

test("divider: through fromFence()", () => {
  assert.equal(plain(fromFence("ascii divider", SOURCE)), STILL);
});

test("divider: it draws out from the middle, the words typing, and holds its still at the end of the build", () => {
  const p = divider(SOURCE);
  const at = (t: number) => p.default()(t, { paper: true });
  assert.equal(p.meta.still, 0.7);
  assert.equal(at(0).trim(), "");
  const early = at(0.3);
  assert.notEqual(early.trimEnd(), STILL);
  // drawn out from the middle: the ends still blank, the middle drawn
  assert.ok(early.startsWith("      ") && early.endsWith("      "), JSON.stringify(early));
  assert.match(early, /part|par|pa/);
  assert.equal(at(0.7).trimEnd(), STILL);
});

test("divider: every style keeps moving in a seamless cycle, its still at rest", () => {
  for (const style of DIVIDER_STYLES) {
    const p = divider(`${style} "part two"`);
    assert.equal(p.idle, true, style);
    assert.equal(p.motion!.once, false, style);
    assert.equal(p.motion!.from, 0.7, style);
    const still = toned(p, p.meta.still!);
    assert.deepEqual(toned(p, p.meta.still! + p.motion!.seconds), still, style);
    assert.deepEqual(toned(p, p.meta.still! + 2 * p.motion!.seconds), still, style);
    // it does move: some frame in the cycle differs from the still
    const moved = [0.2, 0.4, 0.6, 0.8].some((k) => toned(p, p.meta.still! + k * p.motion!.seconds).text !== still.text);
    assert.ok(moved, style);
    // the words are soft, in the middle
    assert.ok(plain(p).includes("  part two  "), style);
    sane(p);
  }
  // the waves travel 8 cells a cycle of 2 seconds
  assert.deepEqual(divider(SOURCE).motion, { seconds: 2, from: 0.7, once: false });
  // svg() loops the cycle
  assert.match(svg(divider(SOURCE)), /infinite/);
});

test("divider: its styles' stills: stars, rain and the train in three rows, sparks and dots in one", () => {
  assert.equal(divider("stars").meta.rows, 3);
  assert.equal(divider("rain").meta.rows, 3);
  assert.equal(divider("sparks").meta.rows, 1);
  assert.equal(divider("dots").meta.rows, 1);
  // the train parks at the left above its rail, which carries the words
  const train = plain(divider('train "next stop"')).split("\n");
  assert.equal(train.length, 3);
  assert.equal(train[0], " .--.  .--.   _n_");
  assert.equal(train[1], "'o--o'-'o--o'-[o_o]>");
  // the odd column left over goes to the right
  assert.equal(train[2], `${"═".repeat(17)}  next stop  ${"═".repeat(18)}`);
  // dots every other column, meeting the words alike on both sides
  assert.equal(plain(divider('dots "part two"')), " · · · · · · · · ·  part two  · · · · · · · · ·");
  // stars and sparks are seeded by the words: the same words, the same sky
  assert.equal(plain(divider('stars "a"')), plain(divider('stars "a"')));
  assert.notEqual(plain(divider('stars "a"')), plain(divider('stars "b"')));
  // tones: the waves quiet, the words soft; the train in the accent
  const w = toned(divider(SOURCE), 0.7);
  STILL.split("").forEach((ch, i) => assert.equal(w.color[i], ch === " " ? w.color[i] : i >= 20 && i < 28 ? SOFT : QUIET, `${i}`));
  const t = toned(divider("train"), 0.7);
  assert.equal(t.color[1], ACCENT);
});

test("divider: takes its words as data too, and no words at all", () => {
  assert.equal(plain(divider({ style: "waves", words: "part two" })), STILL);
  assert.equal(plain(divider({})), "_.-'~'-.".repeat(6));
  // an empty fence is a plain wave
  assert.equal(plain(divider("")), "_.-'~'-.".repeat(6));
  assert.equal(divider("").says, "divider: waves.");
});

test("divider: the width, a frame, and words long enough to widen it", () => {
  assert.equal(plain(divider("waves", { width: 16 })), "_.-'~'-._.-'~'-.");
  assert.equal(divider('stars "x"', { width: 80 }).meta.cols, 80);
  const framed = plain(divider("dots", { frame: "rounded", title: "next" })).split("\n");
  assert.match(framed[0], /^╭─ next ─+╮$/);
  assert.equal(framed[1].length, 48);
  // words longer than 48 columns leave room round them, up to the 156 a figure takes
  const long = "w".repeat(100);
  assert.equal(divider(`waves "${long}"`).meta.cols, 106);
  sane(divider(`rain "${long}"`));
  sane(divider(`train "${long}"`));
});

test("divider: says what is wrong, the kit's way, and never draws a broken row", () => {
  assert.throws(() => divider("wavs"), /ascii\.rest: divider's style takes .* not "wavs" \(did you mean "waves"\?\)/);
  assert.throws(() => divider('waves "a" "b"'), /divider takes one quoted text for its middle, and line 1 has another: "b"/);
  assert.throws(() => divider("waves stars"), /divider takes one style and quoted words, and line 1 has another word, "stars"/);
  assert.throws(() => divider("waves width=30"), /divider's line 1 has width="30": its options go on the fence/);
  assert.throws(() => divider('waves "part two'), /divider's line 1 opens a quote it doesn't close/);
  assert.throws(() => divider('waves "café"'), /divider takes characters every monospace face draws one cell wide/);
  assert.throws(() => divider('waves "go → there"'), /not "→"/);
  assert.throws(() => divider(`waves "${"w".repeat(151)}"`), /divider needs 157 columns for "w+", past the 156 it can take: fewer words/);
  assert.throws(() => divider('waves "part two now"', { width: 16 }), /divider needs 18 columns for "part two now", and its width is 16: give it a width of 18 or more/);
  assert.equal(plain(divider('waves "part two"', { width: 16 })), "_.  part two  -.");
  assert.throws(() => divider("train", { width: 20 }), /divider needs 22 columns for its train/);
  assert.throws(() => divider("waves", { speed: "quick" as never }), /divider\(\)'s speed|speed takes/);
  assert.throws(() => divider({ style: 3 as never }), /divider's style takes/);
  assert.throws(() => divider(null as never), /divider\(\) takes a fence's body/);
  assert.throws(() => divider(["waves"] as never), /divider\(\) takes a fence's body/);
  // typographic quotes and dashes fold
  assert.equal(plain(divider("waves “part two”")), STILL);
});
