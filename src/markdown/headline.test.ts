// headline: words in banner letters, a glint passing, and a small line under them.
import assert from "node:assert/strict";
import { test } from "node:test";
import { banner } from "../banner.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, GLINT, INK, QUIET, SOFT, plain } from "./core.ts";
import { headline } from "./headline.ts";
import { fromFence } from "./index.ts";

const STILL = [
  " ██╗  ███╗ ███╗█╗█╗  ███╗ ████╗ ███╗█████╗",
  "█╔═█╗█╔══╝█╔══╝█║█║  █╔═█╗█╔══╝█╔══╝╚═█╔═╝",
  "████║╚██╗ █║   █║█║  ███╔╝███╗ ╚██╗   █║",
  "█╔═█║ ╚═█╗█║   █║█║  █╔█║ █╔═╝  ╚═█╗  █║",
  "█║ █║███╔╝╚███╗█║█║█╗█║╚█╗████╗███╔╝  █║",
  "╚╝ ╚╝╚══╝  ╚══╝╚╝╚╝╚╝╚╝ ╚╝╚═══╝╚══╝   ╚╝",
  "",
  "animated ascii art for web pages",
].join("\n");

const SOURCE = entryOf("headline").source;

test("headline: the catalog's example draws its still, banner's own letters, through plain() and a fence", () => {
  const p = headline(SOURCE);
  assert.equal(SOURCE, 'ascii.rest "animated ascii art for web pages"');
  assert.equal(plain(p), STILL);
  assert.equal(plain(fromFence("ascii headline", SOURCE)), STILL);
  // unframed by default, as a banner is: the letters' 42 columns, 6 rows, a blank one and the line
  assert.equal(p.meta.cols, 42);
  assert.equal(p.meta.rows, 8);
  // the letters are banner()'s, at one column a pixel
  const art = banner("ascii.rest", { pixel: 1, gap: 1, fill: "█", effect: "still" });
  assert.deepEqual(plain(p).split("\n").slice(0, 6), plain(art).split("\n"));
  assert.equal(p.says, "headline: ascii.rest, animated ascii art for web pages.");
});

test("headline: its columns drop in from the left and the line types in; the still holds after", () => {
  const p = headline(SOURCE);
  const frame = p.default();
  const at = (t: number) => frame(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  assert.equal(p.meta.still, 1.2);
  assert.equal(at(0).trim(), "");
  // a third of the way in, the left columns are in and the right ones not yet, and the line has started
  const early = at(0.3).split("\n");
  assert.notEqual(early.join("\n"), STILL);
  assert.ok(early[5].startsWith("╚╝ ╚╝") && early[5].length < 30, early[5]);
  assert.ok(early[7].length > 0 && early[7].length < 32, early[7]);
  assert.equal(at(1.2), STILL);
});

test("headline: a glint crosses its letters as it builds, then again every 6 seconds, seamless, and never in the still", () => {
  const p = headline(SOURCE);
  const { cols, rows, still } = p.meta;
  const frame = p.default();
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    const text = frame(t, { paper: true, color });
    return { text, color: [...color] };
  };
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 6, from: 1.2, once: false });
  // in the build and in the cycle's first seconds, letter cells in the glint's pink and the accent at its edges
  for (const t of [0.9, 1.2 + 0.6, 7.2 + 0.6]) {
    const { color } = toned(t);
    assert.ok(color.includes(GLINT) && color.includes(ACCENT), `t=${t}`);
  }
  // the still: letters ink, shadow quiet, the line soft, no glint
  const s = toned(still!);
  assert.ok(!s.color.includes(GLINT) && !s.color.includes(ACCENT));
  const lines = s.text.split("\n");
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c], tone = s.color[r * cols + c];
      if (ch === "█") assert.equal(tone, INK);
      else if (r < 6 && ch !== " ") assert.equal(tone, QUIET);
      else if (r === 7 && ch !== " ") assert.equal(tone, SOFT);
    }
  // the frame a cycle ends on is the still it started from
  assert.deepEqual(toned(still! + 6), s);
  assert.deepEqual(toned(still! + 12), s);
  // later in the cycle the glint is out of sight, the letters held
  assert.equal(toned(still! + 3).text, s.text);
  // svg() loops the cycle from the end of the build, its first frame the still
  const out = svg(p);
  assert.match(out, /infinite/);
  assert.doesNotMatch(out, /forwards/);
});

test("headline: takes its words as data too", () => {
  assert.equal(plain(headline({ words: "ascii.rest", line: "animated ascii art for web pages" })), STILL);
  assert.equal(plain(headline({ words: "ascii.rest" })), STILL.split("\n").slice(0, 6).join("\n"));
  assert.equal(headline({ words: "v0.5" }).says, "headline: v0.5.");
});

test("headline: its own options, banner's fonts and shadows, and where it sits in a width", () => {
  const slim = plain(headline("v0.5", { font: "slim", shadow: "none" })).split("\n");
  assert.equal(slim.length, 5);
  assert.ok(slim.every((l) => /^[█ ]*$/.test(l)), slim.join("\n"));
  const tall = headline("ok", { font: "tall" });
  assert.equal(tall.meta.rows, 8);
  // centred in a width: the letters and the line in the middle of it
  const ok = headline("ok");
  const centred = headline('ok "a line"', { width: 30, align: "center" });
  assert.equal(centred.meta.cols, 30);
  const rows = plain(centred).split("\n");
  plain(ok)
    .split("\n")
    .forEach((l, r) => assert.equal(rows[r], `${" ".repeat(Math.floor((30 - ok.meta.cols) / 2))}${l}`.trimEnd()));
  assert.equal(rows[rows.length - 1], `${" ".repeat(Math.floor((30 - 6) / 2))}a line`);
  // left, by default: the same rows from the first column
  assert.deepEqual(plain(headline('ok "a line"', { width: 30 })).split("\n").slice(0, 6), plain(ok).split("\n"));
  // framed, with a title: the frame drawn round it
  const framed = plain(headline("ok", { frame: "rounded", title: "release" })).split("\n");
  assert.match(framed[0], /^╭─ release ─+╮$/);
  // a line wider than the letters widens the figure, and wraps at the width a figure can take
  assert.equal(headline('ok "a line longer than the letters are"').meta.cols, "a line longer than the letters are".length);
  const long = headline(`ok "${"word ".repeat(40).trim()}"`);
  assert.equal(long.meta.cols, 156);
  assert.ok(long.meta.rows > 8);
});

test("headline: says what is wrong, the kit's way", () => {
  assert.throws(() => headline(""), /ascii\.rest: headline takes words for its big line/);
  assert.throws(() => headline('"only a quoted line"'), /headline takes words for its big line, not only a quoted one/);
  assert.throws(() => headline("ascii.rest\nmore words"), /headline's big line is one line, and line 2 has words too: "more words"/);
  assert.throws(() => headline('ascii.rest "one" "two"'), /headline takes one quoted line under its words, and line 1 has another: "two"/);
  assert.throws(() => headline("ascii.rest font=slim"), /headline's line 1 has font="slim": its options go on the fence, as ```ascii headline font=slim/);
  assert.throws(() => headline("a#b"), /headline's block letters have no "#", in "a#b": they draw A to Z, 0 to 9/);
  assert.throws(() => headline("café"), /ascii\.rest: headline takes characters every monospace face draws one cell wide/);
  assert.throws(() => headline("ascii.rest", { font: "slimm" as never }), /headline's font takes .* not "slimm" \(did you mean "slim"\?\)/);
  assert.throws(() => headline("ascii.rest", { shadow: "soft" as never }), /headline's shadow takes/);
  assert.throws(() => headline("ascii.rest", { align: "right" as never }), /headline's align takes "left" or "center", not "right"/);
  assert.throws(() => headline("ascii.rest", { width: 30 }), /headline needs 42 columns for "ascii.rest" in block letters, and its width is 30: give it a width of 42 or more, or font=slim/);
  assert.throws(() => headline("ascii.rest", { width: 40, frame: "rounded" }), /headline needs 46 columns for "ascii.rest" in block letters, and its width is 40/);
  assert.throws(() => headline("a".repeat(40)), /headline needs \d+ columns for "a{40}" in block letters, past the 156 it can take: fewer words, or font=slim/);
  assert.throws(() => headline({ words: "" }), /headline's words take words for its big line/);
  assert.throws(() => headline(42 as never), /headline\(\) takes a fence's body/);
});
