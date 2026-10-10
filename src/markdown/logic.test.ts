// logic: gates from boolean expressions, a signal running through them.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, drawable, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { logic } from "./logic.ts";

const STILL = [
  "╭─ release ────────────────────────────────────────────╮",
  "│                                    ┌─────┐           │",
  "│ built   0 ─────────────────────────┤     │           │",
  "│                                    │     │           │",
  "│                         ┌─────┐    │ and ├── ready 0 │",
  "│ tested  0 ──────────────┤     │    │     │           │",
  "│                         │ or  ┝━━━━┥     │           │",
  "│              ┌─────┐    │     │    └─────┘           │",
  "│ skipped 0 ───┤ not ┝━━━━┥     │                      │",
  "│              └─────┘    └─────┘                      │",
  "╰────────────────────────────────── 3 inputs, 3 gates ─╯",
].join("\n");

const ENTRY = entryOf("logic");
const INFO = fenceOf(ENTRY).split("\n")[0].slice(3);
const fenced = (info: string, body: string) => fromFence(info, body);
const bare = (source: string, options = {}) => plain(logic(source, { frame: "none", ...options }));

function sane(p: MarkdownPiece, times: readonly number[] = [0, 0.2, 0.7, 1.2, 2.5, 2.65, 2.7, 4.1, 9.9]) {
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

test("logic: the catalog's example draws its still, every input 0, through plain() and a fence", () => {
  assert.equal(INFO, "ascii logic title=release");
  const p = logic(ENTRY.source, { title: "release" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, ENTRY.source)), STILL);
  assert.equal(p.says, "logic, release: ready is built and (tested or not skipped); with every input 0, ready is 0.");
  sane(p);
});

test("logic: not binds tightest, then and, xor, or; a run of one operator is one gate, a bracketed one stays", () => {
  // three inputs into one and
  const chain = bare("f is a and b and c");
  assert.equal(chain.match(/┌─────┐/g)?.length, 1);
  assert.equal(chain.match(/┤/g)?.length, 3);
  // and before or: a or (b and c), two gates
  const mixed = bare("f is a or b and c").split("\n");
  assert.ok(mixed.some((l) => l.includes(" and ")) && mixed.some((l) => l.includes(" or ")));
  // brackets keep what they group: two ands, not one of three
  assert.equal(bare("f is (a and b) and c").match(/ and /g)?.length, 2);
  // a line that is one name runs straight on to its output, and operators in capitals read too
  assert.equal(bare("go is x"), "x 0 ────── go 0");
  assert.equal(bare("f is a AND NOT b"), bare("f is a and not b"));
  // an earlier output feeds a later line, its name soft
  const two = logic("carry is a and b\nsum is a xor b\nboth is carry or sum", { frame: "none" });
  assert.equal(two.says, "logic: carry is a and b; sum is a xor b; both is carry or sum; with every input 0, carry is 0, sum is 0 and both is 0.");
  const { cols, rows } = two.meta;
  const color = new Uint8Array(cols * rows);
  const text = two.default()(two.meta.still!, { paper: true, color }).split("\n");
  const r = text.findIndex((l) => l.startsWith("carry"));
  assert.equal(color[r * cols], SOFT);
  assert.match(text[1], /^a +0/);
  assert.equal(color[1 * cols], INK);
});

test("logic: the inputs step through their truth table in Gray code, each change running the wires gate by gate", () => {
  const p = logic(ENTRY.source, { title: "release" });
  const { cols, rows, still } = p.meta;
  const frame = p.default();
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    return { text: frame(t, { paper: true, color }), color: [...color] };
  };
  assert.equal(still, 1.2);
  assert.equal(p.idle, true);
  // 3 inputs, 8 rows, 1.5 seconds a row
  assert.deepEqual(p.motion, { seconds: 12, from: 1.2, once: false });
  const s = toned(still!);
  assert.deepEqual(toned(still! + 12), s);
  assert.deepEqual(toned(still! + 24), s);
  // the build: boxes in by column, then the wires filling from the left
  assert.notEqual(plain(p, { t: 0.3 }), STILL);
  assert.ok(!plain(p, { t: 0.3 }).includes("ready"));
  // row 0 holds, then built flips to 1 and its heavy wire runs right, the and's output following once it arrives
  assert.equal(toned(still! + 0.5).text, s.text);
  const at = (t: number) => plain(p, { t }).split("\n");
  const flipping = at(still! + 1.5 - 0.5);
  assert.match(flipping[2], /built   1 ━+─+┤/);
  assert.match(flipping[4], /├── ready 0/);
  const row1 = at(still! + 1.5 + 0.1);
  assert.match(row1[2], /built   1 ━+┥/);
  assert.match(row1[4], /┝━━ ready 1/);
  // every row of the table appears once a cycle, one input flipping at a time
  const states = Array.from({ length: 8 }, (_, r) =>
    at(still! + r * 1.5 + 0.2)
      .map((l) => /^│ ([a-z]+) +([01]) /.exec(l))
      .filter((m) => m)
      .map((m) => `${m![1]}=${m![2]}`)
      .join(" "),
  );
  assert.equal(new Set(states).size, 8);
  for (let r = 0; r < 8; r++) {
    const a = states[r].split(" "), b = states[(r + 1) % 8].split(" ");
    assert.equal(a.filter((v, i) => v !== b[i]).length, 1, `${states[r]} to ${states[(r + 1) % 8]}`);
  }
  // tones: a wire carrying 1 in the accent, carrying 0 quiet; values accent at 1, soft at 0
  const lines = s.text.split("\n");
  assert.equal(s.color[6 * cols + lines[6].indexOf("━")], ACCENT);
  assert.equal(s.color[2 * cols + lines[2].indexOf("─")], QUIET);
  assert.equal(s.color[2 * cols + lines[2].indexOf("0")], SOFT);
  assert.equal(s.color[2 * cols + lines[2].indexOf("built")], INK);
  assert.match(svg(p), /infinite/);
  sane(p);
});

test("logic: its hold, and its expressions as data", () => {
  const p = logic(ENTRY.source, { hold: 2 });
  assert.deepEqual(p.motion, { seconds: 16, from: 1.2, once: false });
  assert.equal(plain(logic({ outputs: { ready: "built and (tested or not skipped)" } }, { title: "release" })), STILL);
  assert.throws(() => logic(ENTRY.source, { hold: 0.1 }), /logic's hold takes a number from 0.5 to 10/);
});

test("logic: never crashes on empty, long, unicode or broken input, and says what is wrong the kit's way", () => {
  assert.throws(() => logic(""), /ascii\.rest: logic takes expressions, one a line/);
  assert.throws(() => logic("ready built and tested"), /logic's line 1 reads "ready built and tested": a line is an output, is, and an expression/);
  assert.throws(() => logic("ready is built &&  tested"), /logic's line 1 has "&&": logic writes its gates as words/);
  assert.throws(() => logic("ready is !built"), /logic's line 1 has "!"/);
  assert.throws(() => logic("ready is built and"), /logic's line 1 ends where a name or a bracket goes/);
  assert.throws(() => logic("ready is and built"), /logic's line 1 has "and" where a name goes: and takes something on each side/);
  assert.throws(() => logic("ready is (built and tested"), /logic's line 1 opens a \( it doesn't close/);
  assert.throws(() => logic("ready is built tested"), /logic's line 1 has "tested" where an and, or or xor goes/);
  assert.throws(() => logic("ready is 2fast"), /logic's line 1 has "2fast": a name is one word/);
  assert.throws(() => logic("a is b\na is c"), /logic's line 2 makes "a", which line 1 makes already/);
  assert.throws(() => logic("a is b and c\nb is d"), /logic's line 2 makes "b", which an earlier line takes as an input/);
  assert.throws(() => logic("a is a and b"), /logic's line 1 makes "a" out of itself/);
  assert.throws(() => logic("f is a and b and c and d and e and g and h"), /logic steps its inputs through their whole truth table, 6 inputs at most, and logic's line 1 brings them to 7/);
  assert.throws(() => logic('f is a and "b"'), /logic's line 1 has a quote/);
  assert.throws(() => logic("f is a and bé"), /ascii\.rest: logic takes characters every monospace face draws one cell wide/);
  assert.throws(() => logic({ outputs: {} }), /logic's outputs take one output or more/);
  assert.throws(() => logic({ outputs: { f: 3 } } as never), /logic's output "f" takes an expression/);
  assert.throws(() => logic(5 as never), /logic\(\) takes expressions/);
  assert.throws(() => logic(ENTRY.source, { width: 30 }), /logic needs \d+ columns for this, and its width is 30/);
  // long names and deep nesting draw, every frame clean; too tall fails as a piece does
  const deep = logic("f is not not not not not not (a_very_long_input_name or b) and c");
  sane(deep);
  assert.throws(() => logic(Array.from({ length: 40 }, (_, i) => `o${i} is a and b`).join("\n")), /logic draws \d+ rows, past the 120 a piece can have/);
});
