// confetti: a burst over a message, landing on seeded cells.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fnv1a32, mulberry32 } from "../kit/core.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, GLINT, GOOD, INK, VIOLET, WARN, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { confetti } from "./confetti.ts";
import { fromFence } from "./index.ts";

const STILL = [
  "         *      ·              +          *",
  "             ,  ·     °,  ·        °",
  "      *,   ,    v1.0 is out        ,°    ~",
  "  ·       •     1,000 stars      •",
  "     ·  '               ~",
].join("\n");
const SOURCE = entryOf("confetti").source;

function sane(p: MarkdownPiece) {
  const { cols, rows } = p.meta;
  const frame = p.default();
  for (let t = 0; t <= (p.meta.still ?? 0) + 0.5; t += 0.07) {
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

test("confetti: the catalog's example lands on its seeded still, through plain() and a fence", () => {
  assert.equal(SOURCE, '"v1.0 is out" "1,000 stars"');
  const p = confetti(SOURCE);
  assert.equal(plain(p), STILL);
  assert.equal(p.meta.cols, 44);
  assert.equal(p.meta.rows, 5);
  assert.equal(plain(confetti(SOURCE, fence("ascii confetti").options)), STILL);
  assert.equal(p.says, "confetti: v1.0 is out, 1,000 stars.");
});

test("confetti: through fromFence()", () => {
  assert.equal(plain(fromFence("ascii confetti", SOURCE)), STILL);
});

test("confetti: its pieces are where the seed puts them, mulberry32(fnv1a32(the lines)), clear of the message", () => {
  // the rule as the catalog writes it, drawn here on its own
  const W = 44, H = 5, msg = ["v1.0 is out", "1,000 stars"];
  const g = Array.from({ length: H }, () => Array<string>(W).fill(" "));
  msg.forEach((m, i) => [...m].forEach((c, x) => (g[2 + i][Math.floor((W - m.length) / 2) + x] = c)));
  const rnd = mulberry32(fnv1a32(msg.join("\n")));
  for (let placed = 0; placed < 22; ) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), ch = "*+·°•',~"[Math.floor(rnd() * 8)];
    if ((y === 2 || y === 3) && x >= 15 && x <= 28) continue;
    if (g[y][x] !== " ") continue;
    g[y][x] = ch;
    placed++;
  }
  assert.equal(g.map((r) => r.join("").trimEnd()).join("\n"), STILL);
  // the same words, the same confetti; other words, other confetti
  assert.equal(plain(confetti(SOURCE)), plain(confetti(SOURCE)));
  assert.notEqual(plain(confetti('"v1.0 is out"')), plain(confetti('"v1.1 is out"')));
});

test("confetti: it bursts from the message, streaking, and holds once landed", () => {
  const p = confetti(SOURCE);
  const at = (t: number) => p.default()(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  assert.equal(p.meta.still, 1.8);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 1.8, from: 0, once: true });
  assert.equal(at(0).trim(), "");
  // the message pops out from its middle at 0.2 s
  assert.equal(at(0.1).trim(), "");
  assert.match(at(0.4), /v1\.0 is out/);
  // pieces in flight are drawn as streaks along their heading
  const mid = at(0.6);
  assert.notEqual(mid, STILL);
  assert.match(mid, /[\\/|-]/);
  assert.equal(at(1.8), STILL);
  assert.equal(at(5), STILL);
  // svg() plays the burst once and holds
  assert.match(svg(p), /1 forwards|forwards/);
  sane(p);
});

test("confetti: tones, the message ink then accent, the pieces taking accent, good, warn, violet and glint in turn", () => {
  const p = confetti(SOURCE);
  const { text, color } = toned(p, p.meta.still!);
  const lines = text.split("\n");
  const cols = p.meta.cols;
  assert.equal(color[2 * cols + 16], INK);
  assert.equal(color[3 * cols + 16], ACCENT);
  const used = new Set<number>();
  lines.forEach((l, y) =>
    [...l].forEach((ch, x) => {
      if (ch !== " " && !(y >= 2 && y <= 3 && x >= 16 && x < 27)) used.add(color[y * cols + x]);
    }),
  );
  assert.deepEqual([...used].sort(), [ACCENT, GOOD, WARN, VIOLET, GLINT].sort());
});

test("confetti: takes its message as data, one line or two, and bare words", () => {
  assert.equal(plain(confetti({ lines: ["v1.0 is out", "1,000 stars"] })), STILL);
  const one = plain(confetti('"thank you"')).split("\n");
  assert.equal(one.length, 5);
  assert.ok(one[2].includes("thank you"));
  assert.equal(plain(confetti("thank you")), plain(confetti('"thank you"')));
  assert.equal(confetti({ lines: ["shipped"] }).says, "confetti: shipped.");
});

test("confetti: its count, its width, and a message long enough to widen it", () => {
  const count = (p: MarkdownPiece) => plain(p).replace(/v1\.0 is out|1,000 stars|\s/g, "").length;
  assert.equal(count(confetti(SOURCE)), 22);
  assert.equal(count(confetti(SOURCE, { count: 40 })), 40);
  assert.equal(count(confetti(SOURCE, { count: 1 })), 1);
  // more than there are free cells: as many as there are, never stuck
  const full = confetti('"hi"', { count: 200, width: 16 });
  assert.equal(full.meta.cols, 16);
  sane(full);
  assert.equal(confetti(SOURCE, { width: 60 }).meta.cols, 60);
  const long = `"${"x".repeat(100)}"`;
  assert.equal(confetti(long).meta.cols, 108);
  sane(confetti(long));
  const framed = plain(confetti(SOURCE, { frame: "rounded" })).split("\n");
  assert.equal(framed.length, 7);
  assert.equal(framed[0].length, 44);
});

test("confetti: says what is wrong, the kit's way", () => {
  assert.throws(() => confetti(""), /ascii\.rest: confetti takes a message to burst over/);
  assert.throws(() => confetti('""'), /confetti takes a message to burst over/);
  assert.throws(() => confetti('"a" "b" "c"'), /confetti takes a message of one line or two, not 3: "c" is a third/);
  assert.throws(() => confetti('"v1.0 is out'), /confetti's line 1 opens a quote it doesn't close/);
  assert.throws(() => confetti('ok "v1.0"'), /confetti's line 1 has words outside its quotes, "ok"/);
  assert.throws(() => confetti('"v1.0" count=5'), /confetti's line 1 has count="5": its options go on the fence/);
  assert.throws(() => confetti('"\u{1F389} shipped"'), /confetti takes characters every monospace face draws one cell wide/);
  assert.throws(() => confetti('"naïve"'), /not "ï"/);
  assert.throws(() => confetti(SOURCE, { count: 0 }), /confetti's count takes a whole number from 1 to 200, not 0/);
  assert.throws(() => confetti(SOURCE, { count: 2.5 }), /confetti's count takes a whole number/);
  assert.throws(() => confetti(SOURCE, { counts: 3 } as never), /did you mean "count"/);
  assert.throws(() => confetti(`"${"x".repeat(150)}"`), /confetti needs 158 columns for "x+", past the 156 it can take: a shorter message/);
  assert.throws(() => confetti('"a long message here"', { width: 20 }), /confetti needs 23 columns for "a long message here", and its width is 20: give it a width of 23 or more/);
  assert.throws(() => confetti({ lines: "hi" } as never), /confetti\(\) takes a fence's body/);
  assert.throws(() => confetti({ lines: [3] } as never), /confetti's line 1 takes words, not 3/);
});
