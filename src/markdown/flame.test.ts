// flame: folded stacks as a flame graph, the hottest leaf marked.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, BAD, INK, MARK, SOFT, VIOLET, WARN, drawable, plain, type MarkdownPiece } from "./core.ts";
import { flame } from "./flame.ts";
import { fromFence } from "./index.ts";

const STILL = [
  "╭─ render, 48 ms ──────────────────────────────╮",
  "│ [layout   ][paint          ]       [le]      │",
  "│ [draw                         ][fl][parse  ] │",
  "│ [main                                      ] │",
  "╰───────────────────────── paint, 18 of 48 ms ─╯",
].join("\n");

const entry = entryOf("flame");
const SOURCE = entry.source;
const INFO = fenceOf(entry).split("\n")[0].slice(3);
// What the fence draws.
const fenced = (info: string, body: string) => fromFence(info, body);

// Every frame at these times is its full size, a row of cols characters each, every one drawable.
function wellDrawn(p: MarkdownPiece, times: number[]) {
  const frame = p.default();
  for (const t of times) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, p.meta.rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, p.meta.cols, `t=${t}: ${l}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)} in ${l}`);
    }
  }
}

test("flame: the catalog's example draws its still through plain() and a fence", () => {
  assert.equal(INFO, 'ascii flame title="render, 48 ms" unit=ms');
  const p = flame(SOURCE, { title: "render, 48 ms", unit: "ms" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, SOURCE)), STILL);
  assert.equal(p.meta.cols, 48);
  assert.equal(p.meta.rows, 5);
  assert.equal(p.meta.category, "data");
  assert.equal(p.says, "flame, render, 48 ms: main 48; draw 34; layout 12; paint 18, the hottest at 38%; flush 4; parse 10; lex 4.");
});

test("flame: the root grows, then each level rises on it and widens; the still holds after", () => {
  const p = flame(SOURCE, { title: "render, 48 ms", unit: "ms" });
  assert.equal(p.meta.still, 0.9);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 0.9, from: 0, once: true });
  const at = (t: number) => plain(p, { t });
  // early on only the root, part of the way across
  const early = at(0.1).split("\n");
  assert.match(early[3], /^│ \[main +\] +│$/);
  assert.ok(early[3].indexOf("]") < 40, early[3]);
  assert.ok(!early[1].includes("[") && !early[2].includes("["));
  // midway, the second level is there and the top one not yet
  const mid = at(0.5).split("\n");
  assert.ok(mid[2].includes("[draw") && !mid[1].includes("["), mid.join("\n"));
  assert.notEqual(at(0.5), STILL);
  for (const t of [0.9, 1.5, 10]) assert.equal(at(t), STILL);
  wellDrawn(p, [0, 0.05, 0.2, 0.31, 0.45, 0.6, 0.75, 0.9, 3]);
  // svg() plays the build once and holds
  assert.match(svg(p), /1 forwards/);
});

test("flame: heat by depth, names ink, the hottest leaf marked", () => {
  const p = flame(SOURCE, { title: "render, 48 ms", unit: "ms" });
  const { cols, rows, still } = p.meta;
  const color = new Uint8Array(cols * rows);
  const lines = p.default()(still!, { paper: true, color }).split("\n");
  const tone = (x: number, y: number) => color[y * cols + x];
  // the root's brackets in the accent, draw's in warn, lex's in red; the names ink
  assert.equal(tone(2, 3), ACCENT);
  assert.equal(tone(3, 3), INK);
  assert.equal(tone(2, 2), WARN);
  assert.equal(tone(lines[1].indexOf("[le"), 1), BAD);
  // paint, the hottest leaf, marked as a whole: its brackets, its name and the room after it
  const at = lines[1].indexOf("[paint");
  for (let x = at; x <= lines[1].indexOf("]", at); x++) assert.equal(tone(x, 1), MARK, `x=${x}`);
  // at most one run of the mark a row
  for (let y = 0; y < rows; y++) {
    const row = [...color.slice(y * cols, (y + 1) * cols)].map((k) => k === MARK);
    assert.ok(row.filter((m, i) => m && !row[i - 1]).length <= 1, `row ${y}`);
  }
  // past four levels the heat is soft
  const tall = flame("a;b;c;d;e 4\na;b;c;d;e;f 4");
  const tc = new Uint8Array(tall.meta.cols * tall.meta.rows);
  tall.default()(tall.meta.still!, { paper: true, color: tc });
  assert.equal(tc[(tall.meta.rows - 2 - 3) * tall.meta.cols + 2], VIOLET);
  assert.equal(tc[(tall.meta.rows - 2 - 4) * tall.meta.cols + 2], SOFT);
});

test("flame: reads folded stacks as perf pipelines print them", () => {
  // identical stacks add up, a frame may hold spaces, siblings sort by name whatever order they come in
  const a = flame("main;b 10\nmain;a 5\nmain;b 10\nmain;some frame (inlined) 25");
  const text = plain(a);
  assert.ok(text.includes("[a ][b") && text.includes("][some frame (inlined)]"), text);
  assert.equal(a.says, "flame: main 50; a 5; b 20; some frame (inlined) 25, the hottest at 50%.");
  // the bottom edge counts in samples by default, with commas
  assert.match(plain(flame("main;spin 12400\nmain;wait 600")), /spin, 12,400 of 13,000 samples ─╯$/);
  // a frame narrower than 3 columns is left out, and what it calls with it
  const thin = plain(flame("main;big 1000\nmain;tiny;tinier 1"));
  assert.ok(!thin.includes("tin"), thin);
  // stacks with 0 samples add nothing; \r\n and an indent are fine
  assert.equal(plain(flame("  main;a 4\r\n  main;b 0\r\n")), plain(flame("main;a 4")));
});

test("flame: takes its stacks as data too", () => {
  const data = {
    stacks: [
      { frames: ["main", "parse", "lex"], samples: 4 },
      { frames: ["main", "parse"], samples: 6 },
      { frames: ["main", "draw", "layout"], samples: 12 },
      { frames: ["main", "draw", "paint"], samples: 18 },
      { frames: ["main", "draw"], samples: 4 },
      { frames: ["main", "flush"], samples: 4 },
    ],
  };
  assert.equal(plain(flame(data, { title: "render, 48 ms", unit: "ms" })), STILL);
  assert.equal(flame({ stacks: [{ frames: ["main"], samples: 1 }] }).says, "flame: main 1, the hottest at 100%.");
});

test("flame: its width and its unit", () => {
  const wide = flame(SOURCE, { width: 80, unit: "ms" });
  assert.equal(wide.meta.cols, 80);
  assert.match(plain(wide).split("\n")[3], /^│ \[main {70}\] │$/);
  // narrow, the bottom edge gives the hottest leaf's share
  const narrow = plain(flame(SOURCE, { width: 20 }));
  assert.match(narrow, /─ paint, 38% ─╯$/);
  for (const l of narrow.split("\n")) assert.equal(l.length, 20, l);
  // a long hottest name is cut on the bottom edge rather than widening the figure
  const long = flame(`main;${"x".repeat(60)} 9\nmain;y 1`);
  assert.equal(long.meta.cols, 48);
  assert.match(plain(long), /x+\.\.\., 9 of 10 samples ─╯$/);
  assert.equal(flame(SOURCE, { frame: "none" }).meta.cols, 44);
});

test("flame: says what is wrong, the kit's way", () => {
  assert.throws(() => flame(""), /ascii\.rest: flame takes folded stacks, a stack a line, as main;draw;paint 18/);
  assert.throws(() => flame("main;draw"), /flame's line 1 ends in "main;draw", not a number of samples/);
  assert.throws(() => flame("main;draw 4\nmain;paint four"), /flame's line 2 ends in "four", not a number of samples/);
  assert.throws(() => flame("main;draw 4.5"), /flame's line 1 ends in "4\.5"/);
  assert.throws(() => flame("main;;draw 4"), /flame's stack 1 has an empty frame, in "main;;draw"/);
  assert.throws(() => flame("main 0"), /flame's samples add up to 0/);
  assert.throws(() => flame("main;café 4"), /ascii\.rest: flame takes characters every monospace face draws one cell wide/);
  assert.throws(() => flame("main 4", { unit: 3 as never }), /flame's unit takes a word/);
  assert.throws(() => flame("main 4", { unit: "x".repeat(20) }), /flame's unit takes a word of 1 to 16 characters/);
  assert.throws(() => flame("main 4", { units: "ms" } as never), /flame\(\) has no option "units" \(did you mean "unit"\?\)/);
  assert.throws(() => flame({ stacks: [] }), /flame's stacks take at least one stack/);
  assert.throws(() => flame({ stacks: [{ frames: [], samples: 1 }] }), /flame's stack 1 has no frames/);
  assert.throws(() => flame({ stacks: [{ frames: ["a"], samples: -1 }] }), /flame's stack 1 takes a whole number of samples/);
  assert.throws(() => flame(42 as never), /flame\(\) takes folded stacks/);
});

test("flame: never draws garbage, however long or odd its input", () => {
  // many stacks, deep and wide: drawn whole, every frame a full row of drawable characters
  const lines: string[] = [];
  for (let i = 0; i < 400; i++) lines.push(`main;${["parse", "draw", "flush", "wait"][i % 4]};f${i % 37};g${i % 11} ${1 + (i % 9)}`);
  const big = flame(lines.join("\n"), { title: "big" });
  wellDrawn(big, [0, 0.2, 0.5, big.meta.still!]);
  // a stack too deep for a figure says so rather than drawing past its rows
  const deep = Array.from({ length: 130 }, (_, i) => `f${i}`).join(";");
  assert.throws(() => flame(`${deep} 5`), /flame draws \d+ rows, past the 120 a piece can have/);
  // typographic quotes fold, brackets and punctuation in names are only words
  const odd = plain(flame("main;std::vector<int>::push_back 4\nmain;“quoted” 2"));
  assert.match(odd, /\["quoted" +\]\[std::vector<int>::push_back\]/);
  assert.match(odd, /std::vector<int>::push_\.\.\., 4 of 6 samples ─╯$/);
  // a single frame, a single sample
  assert.equal(plain(flame("x 1", { frame: "none" })), `[x${" ".repeat(41)}]`);
});
