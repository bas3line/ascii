// bits: a binary layout from a bit mask, named fields on a bit ruler.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { bits } from "./bits.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { INK, QUIET, SOFT, drawable, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";

const STILL = [
  "╭─ ipv4 header ─────────────────────╮",
  "│  0                   1            │",
  "│  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5  │",
  "│ ┌───────┬───────┬───────────┬───┐ │",
  "│ │version│  ihl  │   dscp    │ecn│ │",
  "│ ├───────┴───────┴───────────┴───┤ │",
  "│ │            length             │ │",
  "│ └───────────────────────────────┘ │",
  "╰─────────────── 5 fields, 32 bits ─╯",
].join("\n");

const entry = entryOf("bits");
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

// A TCP header in 32-bit rows: ports, numbers, one-bit flags whose names go in the key, a run of unused bits.
const TCP = [
  "ssssssssssssssssdddddddddddddddd",
  "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "hhhh....ceukpryfwwwwwwwwwwwwwwww",
  "xxxxxxxxxxxxxxxxgggggggggggggggg",
  's="source port" d="destination port" q=sequence a=acknowledgment h=offset',
  'c=cwr e=ece u=urg k=ack p=psh r=rst y=syn f=fin w=window x=checksum g="urgent pointer"',
].join("\n");

test("bits: the catalog's example draws its still through plain() and a fence", () => {
  assert.equal(INFO, 'ascii bits title="ipv4 header"');
  const p = bits(SOURCE, { title: "ipv4 header" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, SOURCE)), STILL);
  assert.equal(p.meta.cols, 37);
  assert.equal(p.meta.rows, 9);
  assert.equal(p.says, "bits, ipv4 header, 32 bits: version 4, ihl 4, dscp 6, ecn 2, length 16.");
});

test("bits: the ruler counts in, then each field's walls drop and its name types; the still holds after", () => {
  const p = bits(SOURCE, { title: "ipv4 header" });
  assert.equal(p.meta.still, 1.4);
  assert.equal(p.idle, false);
  const at = (t: number) => plain(p, { t }).split("\n");
  // partway through the ruler: its first bits counted, the box drawn as far
  const early = at(0.2);
  assert.match(early[2], /^│ {2}0 1 2 3 4 5 6 7 {2,}│$/);
  assert.ok(!early.join("\n").includes("version"));
  // the first field in, the second typing, the third not yet
  const mid = at(0.75);
  assert.ok(mid[4].includes("│version│") && !mid[4].includes("dscp"), mid.join("\n"));
  for (const t of [1.4, 2, 9]) assert.equal(plain(p, { t }), STILL);
  wellDrawn(p, [0, 0.1, 0.39, 0.4, 0.55, 0.8, 1, 1.2, 1.4]);
  assert.match(svg(p), /1 forwards/);
});

test("bits: the ruler soft, the walls quiet, the names ink", () => {
  const p = bits(SOURCE, { title: "ipv4 header" });
  const { cols, rows, still } = p.meta;
  const color = new Uint8Array(cols * rows);
  const lines = p.default()(still!, { paper: true, color }).split("\n");
  const tone = (x: number, y: number) => color[y * cols + x];
  assert.equal(tone(3, 2), SOFT);
  assert.equal(tone(2, 3), QUIET);
  assert.equal(tone(lines[4].indexOf("version"), 4), INK);
  assert.equal(tone(lines[6].indexOf("length") + 5, 6), INK);
});

test("bits: a TCP header, its flags named in a key and its unused bits dotted", () => {
  const p = bits(TCP, { title: "tcp header" });
  const text = plain(p).split("\n");
  assert.equal(p.meta.cols, 69);
  assert.equal(text[1], "│  0                   1                   2                   3    │");
  assert.equal(text[9], "│ ├───────┬───────┬─┬─┬─┬─┬─┬─┬─┬─┬───────────────────────────────┤ │");
  assert.equal(text[10], "│ │offset │· · · ·│c│e│u│k│p│r│y│f│            window             │ │");
  assert.equal(text[11], "│ ├───────┴───────┴─┴─┴─┴─┴─┴─┴─┴─┼───────────────────────────────┤ │");
  assert.equal(text[15], "│ c cwr   e ece   u urg   k ack   p psh   r rst   y syn   f fin     │");
  assert.match(text.at(-1)!, /─ 16 fields, 160 bits ─╯$/);
  assert.match(p.says, /offset 4, 4 unused, cwr 1, ece 1/);
  wellDrawn(p, [0, 0.3, 0.6, 1, 2, p.meta.still!]);
});

test("bits: a field that runs on into the next row is one cell where they meet", () => {
  const text = plain(bits("rrrrrrrr\nffffffff\nffffffff\nffff..zz\nr=register f=\"frame counter\" z=z")).split("\n");
  // no tens row for 8 bits; the rules between f's rows open; its name on its middle row; the layout in the middle of
  // a frame its bottom edge's words widen
  assert.deepEqual(text.slice(1, 11), [
    "│   0 1 2 3 4 5 6 7   │",
    "│  ┌───────────────┐  │",
    "│  │   register    │  │",
    "│  ├───────────────┤  │",
    "│  │               │  │",
    "│  │               │  │",
    "│  │ frame counter │  │",
    "│  │       ┌───┬───┤  │",
    "│  │       │· ·│ z │  │",
    "│  └───────┴───┴───┘  │",
  ]);
  // pieces that don't meet are cells of their own, each named
  const split = plain(bits("aaaaaaaabbbbbbbb\nbbbbcccccccccccc\na=a b=bee c=sea")).split("\n");
  assert.equal(split[4], "│ │       a       │      bee      │ │");
  assert.equal(split[5], "│ ├───────┬───────┴───────────────┤ │");
  assert.equal(split[6], "│ │  bee  │          sea          │ │");
});

test("bits: takes its mask and names as data too, spaces in rows for reading", () => {
  const data = { rows: ["vvvviiiiddddddee", "llllllllllllllll"], names: { v: "version", i: "ihl", d: "dscp", e: "ecn", l: "length" } };
  assert.equal(plain(bits(data, { title: "ipv4 header" })), STILL);
  assert.equal(plain(bits("vvvv iiii dddddd ee\nllll llll llll llll\nv=version i=ihl d=dscp e=ecn l=length", { title: "ipv4 header" })), STILL);
  // a name too long for the key's line wraps under itself
  const long = plain(bits("a.......\na=\"a name long enough to wrap\"", { frame: "none" })).split("\n");
  assert.deepEqual(long.slice(-2), ["a a name long", "  enough to wrap"], long.join("\n"));
  assert.ok(long.every((l) => l.length <= 17), long.join("\n"));
});

test("bits: a width centres it, frame none takes the layout's own width", () => {
  const p = bits(SOURCE, { width: 50 });
  assert.equal(p.meta.cols, 50);
  assert.match(plain(p).split("\n")[3], /^│ {7}┌/);
  assert.equal(bits(SOURCE, { frame: "none" }).meta.cols, 33);
  assert.throws(() => bits(TCP, { width: 40 }), /bits needs 69 columns for this, and its width is 40/);
});

test("bits: says what is wrong, the kit's way", () => {
  assert.throws(() => bits(""), /ascii\.rest: bits takes a bit mask, a letter a bit in rows of 8, 16 or 32/);
  assert.throws(() => bits("vvvv\nv=version"), /bits' row 1 is 4 bits, "vvvv": a row is 8, 16 or 32 bits/);
  assert.throws(() => bits("vvvvvvvv\nvvvvvvvvvvvvvvvv\nv=v"), /bits' row 2 is 16 bits and row 1 is 8: every row is the same width/);
  assert.throws(() => bits("vvvv1vvv\nv=v"), /bits' row 1 has "1", in "vvvv1vvv": a mask is a letter a bit, and \. for an unused bit/);
  assert.throws(() => bits("vvvviiiivvvvvvvv\nv=v i=i"), /bits' letter "v" is in two separate runs, from bit 0 of row 1 and from bit 8 of row 1/);
  assert.throws(() => bits("vvvviiii\nv=version"), /bits' letter "i" has no name: name every letter on a line after the mask, as i=flags/);
  assert.throws(() => bits("vvvviiii\nv=version i=ihl q=nope"), /bits names "q", which is not a letter of the mask: it has v, i/);
  assert.throws(() => bits("vvvviiii\nv=version\nv=again i=i"), /bits' line 3 names "v" again/);
  assert.throws(() => bits("vvvviiii\nver=version i=i"), /bits' line 2 names "ver": a name is for one letter of the mask/);
  assert.throws(() => bits("vvvviiii\nv=version i=ihl\niiiiiiii"), /bits' line 3 is a row of the mask after its names/);
  assert.throws(() => bits("vvvviiii\nv=version i=ihl extra"), /bits' line 2 has "extra" among its names/);
  assert.throws(() => bits(`vvvviiii\nv="${"x".repeat(40)}" i=i`), /bits' name for "v" takes 1 to 32 characters/);
  assert.throws(() => bits("vvvviiii\nv=vérsion i=i"), /ascii\.rest: bits takes characters every monospace face draws one cell wide/);
  assert.throws(() => bits({ rows: [], names: {} }), /bits' rows take at least one row/);
  assert.throws(() => bits(null as never), /bits\(\) takes a bit mask and its names/);
  assert.throws(() => bits(SOURCE, { ruler: false } as never), /bits\(\) has no option "ruler"/);
});

test("bits: never draws garbage, however long or odd its input", () => {
  // forty 32-bit rows, every letter of both cases a field
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rows: string[] = [];
  let k = 0;
  for (let r = 0; r < 40; r++) {
    let row = "";
    while (row.length < 32) row += letters[Math.min(letters.length - 1, Math.floor(k++ / 25))];
    rows.push(row);
  }
  const names = [...new Set(rows.join(""))].map((c) => `${c}=f${c}`).join(" ");
  const big = bits(`${rows.join("\n")}\n${names}`);
  // the ruler, 40 rows and their rules, and a key for the pieces too narrow for their names
  assert.ok(big.meta.rows > 2 + 81 + 1, String(big.meta.rows));
  wellDrawn(big, [0, 0.4, 1, 2, big.meta.still!]);
  // one bit a field everywhere: the names go to the key
  const flags = bits("abcdefgh\na=a1 b=b1 c=c1 d=d1 e=e1 f=f1 g=g1 h=h1");
  assert.match(plain(flags), /│a│b│c│d│e│f│g│h│/);
  wellDrawn(flags, [0, 0.5, flags.meta.still!]);
  // all unused
  assert.match(plain(bits("........")), /│· · · · · · · ·│/);
});
