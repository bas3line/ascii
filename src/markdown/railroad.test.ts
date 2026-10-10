// railroad: a command's syntax as a railroad diagram, a dot running the track.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, drawable, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { railroad } from "./railroad.ts";

const STILL = [
  "╭─ usage ────────────────────────────────────────────╮",
  "│ ├─ ascii.rest ─ md ─ <file> ─┬─────────────────┬─┤ │",
  "│                              ├─ --ascii ───────┤   │",
  "│                              ╰─ --svg ─ <dir> ─╯   │",
  "╰────────────────────────────────────────────────────╯",
].join("\n");

const ENTRY = entryOf("railroad");
const INFO = fenceOf(ENTRY).split("\n")[0].slice(3);
const fenced = (info: string, body: string) => fromFence(info, body);
const bare = (source: string, options = {}) => plain(railroad(source, { frame: "none", ...options }));

function sane(p: MarkdownPiece, times: readonly number[] = [0, 0.2, 0.5, 1, 1.7, 2.6, 4, 6.3]) {
  const frame = p.default();
  for (const t of [...times, p.meta.still ?? 0]) {
    const rows = frame(t, { paper: true }).split("\n");
    assert.equal(rows.length, p.meta.rows, `t=${t}`);
    for (const r of rows) {
      assert.equal(r.length, p.meta.cols, `t=${t}: ${r}`);
      for (const ch of r) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)} in ${r}`);
    }
  }
}

test("railroad: the catalog's example draws its still, through plain() and a fence", () => {
  assert.equal(INFO, "ascii railroad title=usage");
  const p = railroad(ENTRY.source, { title: "usage" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, ENTRY.source)), STILL);
  assert.equal(p.says, "railroad: ascii.rest md <file>, then optionally --ascii, or --svg <dir>.");
  sane(p);
});

test("railroad: its notation: words, <values>, [optional], (one | of), [one | of], ... repeats, and | between usages", () => {
  // ( a | b ) is a choice on the track; ( a ) alone is a group
  assert.equal(bare("go (fast | slow)"), ["├─ go ─┬─ fast ─┬─┤", "       ╰─ slow ─╯"].join("\n"));
  assert.equal(bare("go (fast)"), "├─ go ─ fast ─┤");
  assert.equal(bare("go {fast | slow}"), bare("go (fast | slow)"));
  // a repeat: the item on the track and the way back under it, its < pointing home
  assert.equal(bare("ls <path>..."), ["├─ ls ─┬─ <path> ─┬─┤", "       ╰────<─────╯"].join("\n"));
  assert.equal(bare("ls <path> ..."), bare("ls <path>..."));
  // [ a ] may be left out: the way past it on the track, it under
  assert.equal(bare("ls [-l]"), ["├─ ls ─┬──────┬─┤", "       ╰─ -l ─╯"].join("\n"));
  // a | outside brackets chooses between whole usages; a <value> may hold spaces
  assert.equal(bare("start | stop <service name>"), ["├─┬─ start ─────────────────┬─┤", "  ╰─ stop ─ <service name> ─╯"].join("\n"));
  // a group of several repeated, and a choice repeated
  assert.equal(bare("set (<key> <value>)..."), ["├─ set ─┬─ <key> ─ <value> ─┬─┤", "        ╰─────────<─────────╯"].join("\n"));
  assert.equal(bare("x (a | b)..."), ["├─ x ─┬─┬─ a ─┬─┬─┤", "      │ ╰─ b ─╯ │", "      ╰────<────╯"].join("\n"));
  // nested: an optional group holding a repeat
  assert.equal(bare("cp [-r] <from>... <to>"), ["├─ cp ─┬──────┬─┬─ <from> ─┬─ <to> ─┤", "       ╰─ -r ─╯ ╰────<─────╯"].join("\n"));
  // several lines are several usages, a blank row between
  assert.equal(bare("a\nb"), "├─ a ─┤\n\n├─ b ─┤");
  assert.equal(railroad("cp [-r] <from>... <to>").says, "railroad: cp, then optionally -r, then <from>, one or more, then <to>.");
  assert.equal(railroad("go (fast | slow) now").says, "railroad: go, then one of fast, or slow, then now.");
});

test("railroad: a usage too wide wraps, the track turning down at its end and back in at the left", () => {
  const usage = "git add [-n] [-v] [--force | -f] [--interactive | -i] [--patch | -p] [--edit | -e] [--all | -A] <pathspec>...";
  const p = railroad(usage, { width: 60 });
  const rows = plain(p).split("\n");
  assert.ok(rows.every((r) => r.length === 60), rows.join("\n"));
  const turn = rows.findIndex((r) => /╮ +│$/.test(r));
  assert.ok(turn > 0, rows.join("\n"));
  assert.ok(rows.some((r) => /^│ ╭─+╯/.test(r)), rows.join("\n"));
  assert.ok(rows.some((r) => /^│ ╰─/.test(r)), rows.join("\n"));
  assert.ok(rows.some((r) => r.includes("┤")));
  // with no width, it wraps at 96 columns, not the widest a figure can be
  assert.ok(railroad(usage).meta.cols <= 100);
  sane(p);
});

test("railroad: the track draws from the left; then a dot runs every path in turn, a seamless cycle", () => {
  const p = railroad(ENTRY.source, { title: "usage" });
  const { cols, rows, still } = p.meta;
  const frame = p.default();
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    return { text: frame(t, { paper: true, color }), color: [...color] };
  };
  assert.equal(still, 0.8);
  assert.equal(p.idle, true);
  // three runs: past the options, through --ascii, through --svg <dir>
  assert.deepEqual(p.motion, { seconds: 6, from: 0.8, once: false });
  const half = plain(p, { t: 0.4 }).split("\n");
  assert.match(half[1], /^│ ├─ ascii\.rest ─ md ─ <f/);
  assert.ok(!half[2].includes("--ascii"));
  const s = toned(still!);
  assert.equal(s.text.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n"), STILL);
  assert.deepEqual(toned(still! + 6), s);
  assert.deepEqual(toned(still! + 12), s);
  // each run's dot takes its own branch: the first past the options, the second down to --ascii, the third --svg
  const dotRow = (t: number) => toned(t).text.split("\n").findIndex((l) => l.includes("●"));
  const rowsOfRun = (run: number) => new Set(Array.from({ length: 30 }, (_, i) => dotRow(still! + run * 2 + 0.15 + (i / 30) * 1.5)).filter((r) => r >= 0));
  assert.ok(!rowsOfRun(0).has(2) && !rowsOfRun(0).has(3));
  assert.ok(rowsOfRun(1).has(2) && !rowsOfRun(1).has(3));
  assert.ok(rowsOfRun(2).has(3));
  // the path behind the dot lit in the accent; the still has no accent but its values
  const lit = toned(still! + 2 + 1.5);
  assert.ok(lit.color.filter((k) => k === ACCENT).length > s.color.filter((k) => k === ACCENT).length);
  const lines = s.text.split("\n");
  assert.equal(s.color[1 * cols + lines[1].indexOf("<file>")], ACCENT);
  assert.equal(s.color[1 * cols + lines[1].indexOf("md")], INK);
  assert.equal(s.color[1 * cols + lines[1].indexOf("┬")], QUIET);
  assert.match(svg(p), /infinite/);
  sane(p);
});

test("railroad: takes its usages as data too", () => {
  assert.equal(plain(railroad({ usages: [ENTRY.source] }, { title: "usage" })), STILL);
  assert.equal(railroad({ usages: ["a", "b"] }).says, "railroad: a; b.");
});

test("railroad: never crashes on empty, long, unicode or broken input, and says what is wrong the kit's way", () => {
  assert.throws(() => railroad(""), /ascii\.rest: railroad takes a usage line/);
  assert.throws(() => railroad("ls [-l"), /railroad's line 1 opens a \[ it doesn't close with \]/);
  assert.throws(() => railroad("ls -l]"), /railroad's line 1 closes a \] it didn't open/);
  assert.throws(() => railroad("ls [-l)"), /railroad's line 1 closes a \) it didn't open, where \] closes what is open/);
  assert.throws(() => railroad("ls []"), /railroad's line 1 has an empty \[ \]/);
  assert.throws(() => railroad("ls [a |]"), /railroad's line 1 has an empty branch in \[ \]/);
  assert.throws(() => railroad("ls (a | )"), /railroad's line 1 has an empty \( \) or an empty branch in one/);
  assert.throws(() => railroad("... ls"), /railroad's line 1 has \.\.\. with nothing before it to repeat/);
  assert.throws(() => railroad("ls <file"), /railroad's line 1 opens a <value> it doesn't close/);
  assert.throws(() => railroad("ls <>"), /railroad's line 1 has an empty <>/);
  assert.throws(() => railroad("a |"), /railroad's line 1 has a \| with nothing on one side of it/);
  assert.throws(() => railroad("ls ⟨file⟩"), /ascii\.rest: railroad takes characters every monospace face draws one cell wide/);
  assert.throws(() => railroad({ usages: [] }), /railroad's usages take one usage line or more/);
  assert.throws(() => railroad({ usages: [3] } as never), /railroad's usage 1 takes a usage line/);
  assert.throws(() => railroad(7 as never), /railroad\(\) takes a usage line/);
  // one word too long to fit in any row
  assert.throws(() => railroad(`ls ${"x".repeat(160)}`), /railroad needs 166 columns for "x{160}", past the 156 it has: split it into shorter usages/);
  // a part wider than the 96 a row wraps at takes a row of its own
  const own = plain(railroad(`ls ${"x".repeat(100)} -l`, { frame: "none" })).split("\n");
  assert.deepEqual(own.map((l) => l.length), [8, 8, 106, 106, 8]);
  assert.match(own[2], /^╰─ x{100} ─╮$/);
  assert.equal(own[4], "╰─ -l ─┤");
  assert.throws(() => railroad("ls <path-to-the-file>", { width: 20 }), /railroad needs 24 columns for "<path-to-the-file>", past the 16 it has: give it a width of 28 or more/);
  // many words wrap onto rows rather than widening the figure; too many rows fails
  const long = railroad(Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "));
  assert.ok(long.meta.cols <= 100 && long.meta.rows > 3);
  sane(long);
  assert.throws(() => railroad(Array.from({ length: 70 }, (_, i) => `c${i} [x]`).join("\n")), /railroad draws \d+ rows, past the 120 a piece can have/);
});
