// sequence: messages between actors, each travelling its arrow.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, drawable, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { sequence } from "./sequence.ts";

const STILL = [
  "╭─ list users ────────────────────────────╮",
  "│ ╭─────────╮     ╭─────╮          ╭────╮ │",
  "│ │ browser │     │ api │          │ db │ │",
  "│ ╰────┬────╯     ╰──┬──╯          ╰─┬──╯ │",
  "│      │ GET /users  │               │    │",
  "│      ├────────────>│               │    │",
  "│      │             │ select users  │    │",
  "│      │             ├──────────────>│    │",
  "│      │             │       12 rows │    │",
  "│      │             │<┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤    │",
  "│      │      200 ok │               │    │",
  "│      │<┄┄┄┄┄┄┄┄┄┄┄┄┤               │    │",
  "╰──────────────────────────── 4 messages ─╯",
].join("\n");

const ENTRY = entryOf("sequence");
const INFO = fenceOf(ENTRY).split("\n")[0].slice(3);
// What a ```ascii sequence fence draws.
const fenced = (info: string, body: string) => fromFence(info, body);

// Every frame of a figure the same size, rows as wide as it says, every character one a figure may draw.
function sane(p: MarkdownPiece, times: readonly number[] = [0, 0.1, 0.5, 1, 2, 5, 9]) {
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

test("sequence: the catalog's example draws its still, through plain() and a fence", () => {
  assert.equal(ENTRY.source, 'browser -> api "GET /users"\napi -> db "select users"\ndb --> api "12 rows"\napi --> browser "200 ok"');
  assert.equal(INFO, 'ascii sequence title="list users"');
  const p = sequence(ENTRY.source, { title: "list users" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, ENTRY.source)), STILL);
  assert.equal(p.says, "sequence, 4 messages: browser to api, GET /users; api to db, select users; db answers api, 12 rows; api answers browser, 200 ok.");
  // the arrow may have no spaces round it, and "sequence" from a fence reads the same
  assert.equal(plain(sequence(ENTRY.source.replace(/ -(-?)> /g, "-$1>"), { title: "list users" })), STILL);
  sane(p);
});

test("sequence: heads and lifelines draw down, then each message's dot runs its arrow; the still holds after", () => {
  const p = sequence(ENTRY.source, { title: "list users" });
  const at = (t: number) => plain(p, { t });
  assert.equal(p.meta.still, 1.9);
  // heads in, the lifelines part way down, no arrow yet
  const early = at(0.15).split("\n");
  assert.match(early[2], /│ browser │/);
  assert.ok(!at(0.15).includes(">"));
  // the second message part way: its dot on its arrow, its words typing, the third not started
  const mid = at(0.3 + 0.4 + 0.2);
  assert.ok(mid.includes("●"), mid);
  assert.ok(mid.includes("├────────────>│"));
  assert.ok(!mid.includes("12 rows"));
  assert.notEqual(mid, STILL);
  assert.equal(at(1.9), STILL);
});

test("sequence: once built, a dot runs the messages again in turn, a seamless cycle with nothing over the still", () => {
  const p = sequence(ENTRY.source, { title: "list users" });
  const { cols, rows, still } = p.meta;
  const frame = p.default();
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    return { text: frame(t, { paper: true, color }), color: [...color] };
  };
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 3.8, from: 1.9, once: false });
  const s = toned(still!);
  assert.deepEqual(toned(still! + 3.8), s);
  assert.deepEqual(toned(still! + 7.6), s);
  // in the rest at the start of a cycle, nothing moves; after it, a dot is on an arrow
  assert.equal(toned(still! + 1).text, s.text);
  const moving = toned(still! + 1.6 + 0.2);
  assert.ok(moving.text.includes("●") && moving.color.includes(ACCENT));
  // the still's tones: heads and lifelines quiet, names ink, calls ink, replies soft, nothing in the accent
  assert.ok(!s.color.includes(ACCENT));
  const lines = s.text.split("\n");
  const toneAt = (r: number, c: number) => s.color[r * cols + c];
  assert.equal(toneAt(2, lines[2].indexOf("browser")), INK);
  assert.equal(toneAt(1, lines[1].indexOf("╭─────────╮")), QUIET);
  assert.equal(toneAt(5, lines[5].indexOf("├")), INK);
  assert.equal(toneAt(9, lines[9].indexOf("┄")), SOFT);
  assert.equal(toneAt(8, lines[8].indexOf("12 rows")), SOFT);
  // svg() loops the cycle
  assert.match(svg(p), /infinite/);
  sane(p, [0, 0.2, 0.6, 1.2, 1.9, 2.5, 3.4, 4.1, 5.6]);
});

test("sequence: a call to itself loops on its lifeline, long words wrap, and the actors space out to fit them", () => {
  const p = sequence('ui -> api "login"\napi -> api "check the password against the stored hash"\napi --> ui "ok"');
  const text = plain(p).split("\n");
  assert.ok(text.some((l) => l.includes("├──╮ check the password against the")), text.join("\n"));
  assert.ok(text.some((l) => l.includes("│<─╯ stored hash")), text.join("\n"));
  assert.equal(p.says, "sequence, 3 messages: ui to api, login; api to api, check the password against the stored hash; api answers ui, ok.");
  // a message that skips an actor makes room for its words between its two lifelines
  const wide = plain(sequence('a -> b "x"\na -> c "a much longer message than the rest"', { frame: "none" })).split("\n");
  const row = wide.find((l) => l.includes("a much longer"))!;
  assert.ok(row.indexOf("a much longer") > 0);
  sane(p);
});

test("sequence: takes its messages as data too", () => {
  const p = sequence(
    {
      messages: [
        { from: "browser", to: "api", text: "GET /users" },
        { from: "api", to: "db", text: "select users" },
        { from: "db", to: "api", text: "12 rows", reply: true },
        { from: "api", to: "browser", text: "200 ok", reply: true },
      ],
    },
    { title: "list users" },
  );
  assert.equal(plain(p), STILL);
  assert.equal(sequence({ messages: [{ from: "a", to: "b" }] }).says, "sequence, 1 message: a to b.");
});

test("sequence: never crashes on empty, long, unicode or broken input, and says what is wrong the kit's way", () => {
  assert.throws(() => sequence(""), /ascii\.rest: sequence takes messages, one a line/);
  assert.throws(() => sequence("   \n\n  "), /sequence takes messages/);
  assert.throws(() => sequence('a -> b -> c "x"'), /sequence's line 1 has two arrows; a message goes from one actor to one actor/);
  assert.throws(() => sequence('a -> b "x"\nb c "y"'), /sequence's line 2 has no arrow/);
  assert.throws(() => sequence('a <- b "x"'), /sequence's line 1 points its arrow left: write the sender first/);
  assert.throws(() => sequence('-> b "x"'), /sequence's line 1 has an arrow with no actor before it/);
  assert.throws(() => sequence('a ->'), /sequence's line 1 has an arrow with no actor after it/);
  assert.throws(() => sequence('web app -> api "x"'), /sequence's line 1 names an actor "web app": an actor is one word/);
  assert.throws(() => sequence('a -> b "x" "y"'), /sequence's line 1 has 2 quoted texts/);
  assert.throws(() => sequence('a -> b "x'), /sequence's line 1 opens a quote it doesn't close/);
  assert.throws(() => sequence('a -> b color=red'), /sequence's line 1 has color="red": sequence's options go on the fence/);
  assert.throws(() => sequence('café -> b "x"'), /ascii\.rest: sequence takes characters every monospace face draws one cell wide/);
  assert.throws(() => sequence('a -> b "naïve"'), /takes characters every monospace face draws/);
  assert.throws(() => sequence(42 as never), /sequence\(\) takes messages, such as browser -> api "GET \/users", or \{ messages: \[\{ from, to, text \}\] \}, not 42/);
  assert.throws(() => sequence({ messages: [] }), /sequence's messages take one message or more/);
  assert.throws(() => sequence({ messages: [{ from: "a", to: 3 }] } as never), /sequence's message 1's to takes an actor's name/);
  assert.throws(() => sequence(ENTRY.source, { width: 30 }), /sequence needs \d+ columns for this, and its width is 30/);
  assert.throws(() => sequence(ENTRY.source, { mode: "x" } as never), /sequence\(\) has no option "mode": it takes title, frame, width, color, play and speed/);
  // too many actors for the widest a figure can be, and too many messages for the tallest
  const many = Array.from({ length: 24 }, (_, i) => `actor${i} -> actor${i + 1} "message ${i}"`).join("\n");
  assert.throws(() => sequence(many), /sequence needs \d+ columns for this, past the 160 a figure can take/);
  const tall = Array.from({ length: 70 }, (_, i) => `a -> b "m${i}"`).join("\n");
  assert.throws(() => sequence(tall), /sequence draws \d+ rows, past the 120 a piece can have/);
  // a very long message wraps rather than widening the figure past what reads
  const long = sequence(`a -> b "${"word ".repeat(60).trim()}"`);
  assert.ok(long.meta.cols < 50, String(long.meta.cols));
  sane(long);
});
