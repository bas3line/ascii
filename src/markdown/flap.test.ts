// flap: a split-flap sign, every tile flipping through its cards onto its letter.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, fence, plain, type MarkdownPiece } from "./core.ts";
import { FLAPS, flap, type FlapOptions } from "./flap.ts";
import { fromFence, kinds } from "./index.ts";

const SOURCE = entryOf("flap").source;
const STILL = [
  "┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐",
  "│N│O│W│ │B│O│A│R│D│I│N│G│ │",
  "├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤",
  "│V│0│.│5│ │G│A│T│E│ │N│P│M│",
  "└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘",
].join("\n");
// What a fence draws: through fromFence() once index.ts lists flap, and through fence()'s options until then.
const drawn = (info: string, body: string) => (Object.hasOwn(kinds, "flap") ? fromFence(info, body) : flap(body, fence(info).options as FlapOptions));
const toned = (p: MarkdownPiece, t: number) => {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, color: [...color] };
};
const at = (p: MarkdownPiece, t: number) => plain(p, { t });

test("flap: the catalog's example draws its still, every tile landed, through plain() and a fence", () => {
  const p = flap(SOURCE);
  assert.equal(SOURCE, "now boarding\nv0.5 gate npm");
  assert.equal(plain(p), STILL);
  assert.equal(plain(drawn("ascii flap", SOURCE)), STILL);
  assert.equal(p.meta.cols, 27);
  assert.equal(p.meta.rows, 5);
  assert.equal(p.says, "flap: now boarding; v0.5 gate npm.");
  assert.equal(p.kind, "flap");
});

test("flap: every tile starts blank and flips through its cards onto its letter, then the sign holds", () => {
  const p = flap(SOURCE);
  // the "." on row 2 is the last to land: 37 cards from blank, starting 3 tiles in
  assert.ok(Math.abs(p.meta.still! - (3 * 0.025 + FLAPS.indexOf(".") * 0.035)) < 1e-9, String(p.meta.still));
  const blank = at(p, 0).split("\n");
  assert.equal(blank[1], "│ │ │ │ │ │ │ │ │ │ │ │ │ │");
  assert.equal(blank[3], blank[1]);
  // a card at a time in the drum's order: the first tile, N, shows A, B, C as it turns
  assert.equal(at(p, 0.035 + 1e-6).split("\n")[1][1], "A");
  assert.equal(at(p, 3 * 0.035 + 1e-6).split("\n")[1][1], "C");
  const mid = at(p, 0.8);
  assert.notEqual(mid, STILL);
  assert.equal(at(p, p.meta.still!), STILL);
  assert.equal(at(p, p.meta.still! + 5), STILL);
  // turning tiles soft, a tile clacking down in the accent, landed ones in ink, the grid quiet
  const seen = new Set<number>();
  for (let t = 0; t < p.meta.still!; t += 0.02) toned(p, t).color.forEach((c) => seen.add(c));
  assert.ok(seen.has(SOFT) && seen.has(ACCENT) && seen.has(INK));
  const still = toned(p, p.meta.still!);
  const lines = still.text.split("\n");
  lines.forEach((l, y) =>
    [...l].forEach((ch, x) => {
      const tone = still.color[y * p.meta.cols + x];
      if ("┌┬┐├┼┤└┴┘│─".includes(ch)) assert.equal(tone, QUIET, `${ch} at ${x}, ${y}`);
      else if (ch !== " ") assert.equal(tone, INK, `${ch} at ${x}, ${y}`);
    }),
  );
  // it plays once and holds: no cycle, and its SVG plays its build once
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: p.meta.still, from: 0, once: true });
  assert.match(svg(p), /1 forwards/);
});

test("flap: capitals from any case, its punctuation, rows as written, and the sign as data", () => {
  assert.equal(plain(flap({ rows: ["NOW BOARDING", "V0.5 GATE NPM"] })), STILL);
  const sign = plain(flap("  gate 4: go!\n\nwhat's on? a & b / c - d")).split("\n");
  const tiles = (row: string) => `│${[...row.padEnd(24)].join("│")}│`;
  assert.equal(sign[1], tiles("  GATE 4: GO!"));
  // a blank line is a row of blank tiles
  assert.equal(sign[3], tiles(""));
  assert.equal(sign[5], tiles("WHAT'S ON? A & B / C - D"));
  assert.equal(flap("  gate 4: go!\n\nwhat's on?").says, "flap: gate 4: go!; what's on?.");
});

test("flap: a width makes a board of a fixed size, and a big sign still builds within 2.4 seconds", () => {
  const board = flap("go", { width: 21 });
  assert.equal(board.meta.cols, 21);
  assert.equal(plain(board).split("\n")[1], "│G│O│ │ │ │ │ │ │ │ │");
  const framed = plain(flap("go", { width: 25, frame: "rounded", title: "gate" })).split("\n");
  assert.equal(framed[0], `╭─ gate ${"─".repeat(16)}╮`);
  assert.equal(framed[2], "│ │G│O│ │ │ │ │ │ │ │ │ │");
  // 77 tiles of the drum's last card, each turning 44 cards: quicker cards, the same build
  const big = flap("&".repeat(77));
  assert.equal(big.meta.cols, 155);
  assert.ok(Math.abs(big.meta.still! - 2.4) < 1e-9, String(big.meta.still));
  assert.equal(plain(big).split("\n")[1], `│${"&│".repeat(77)}`);
  const start = performance.now();
  for (let t = 0; t < 2.4; t += 1 / 30) big.default()(t, { paper: true });
  assert.ok(performance.now() - start < 500, "a big sign draws its build quickly");
});

test("flap: says what is wrong, the kit's way, and never draws what it can't", () => {
  assert.throws(() => flap(""), /ascii\.rest: flap takes the rows of its sign, a line each, such as now boarding/);
  assert.throws(() => flap({ rows: ["  ", ""] }), /flap takes the rows of its sign, a line each, such as now boarding, and these are all blank/);
  assert.throws(() => flap("now boarding\nhi@ascii"), /flap's tiles carry A to Z, 0 to 9, a space and \. - : \/ ' ! \? &, and row 2 has "@", in "hi@ascii"/);
  assert.throws(() => flap('"now boarding"'), /row 1 has "\\"": write the row bare, with no quotes/);
  assert.throws(() => flap("café"), /flap's row 1 takes characters every monospace face draws one cell wide.*"é"/);
  assert.throws(() => flap("go \u{1F680}"), /flap's row 1 takes characters every monospace face draws one cell wide/);
  assert.throws(() => flap(Array.from({ length: 13 }, () => "a").join("\n")), /flap's sign has up to 12 rows, not 13/);
  assert.throws(() => flap("a".repeat(78)), /flap's sign is up to 77 tiles wide, and row 1 has 78/);
  assert.throws(() => flap(SOURCE, { width: 20 }), /flap needs 27 columns for row 2's 13 tiles, and its width is 20: give it a width of 27 or more/);
  assert.throws(() => flap(SOURCE, { width: 24, frame: "rounded" }), /flap needs 31 columns for row 2's 13 tiles, and its width is 24/);
  assert.throws(() => flap(SOURCE, { tiles: 4 } as never), /flap\(\) has no option "tiles"/);
  assert.throws(() => flap({ rows: [4 as never] }), /flap's row 1 takes words, not 4/);
  assert.throws(() => flap({ rows: "go" } as never), /flap\(\) takes a fence's body/);
  assert.throws(() => flap(42 as never), /flap\(\) takes a fence's body, its sign's rows a line each, or \{ rows: \["now boarding"\] \}, not 42/);
  // every frame of the build is the grid's size, in drawable characters only
  const p = flap(SOURCE);
  for (let t = 0; t <= p.meta.still! + 0.1; t += 0.03) {
    const f = p.default()(t, { paper: true }).split("\n");
    assert.equal(f.length, 5);
    for (const l of f) {
      assert.equal(l.length, 27);
      for (const ch of l) assert.ok(FLAPS.includes(ch) || "┌┬┐├┼┤└┴┘│─".includes(ch), ch);
    }
  }
});
