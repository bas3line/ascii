// ticket: a pass in banner letters, a stub and a barcode.
import assert from "node:assert/strict";
import { test } from "node:test";
import { banner } from "../banner.ts";
import { fnv1a32 } from "../kit/core.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { ticket } from "./ticket.ts";

const SOURCE = entryOf("ticket").source;
// What a fence draws.
const viaFence = (info: string, body: string): MarkdownPiece => fromFence(info, body);

const STILL = [
  "╭─ boarding pass ─────────────────────────────╮",
  "│ █ █ ███   █ █         █ █ ███   ███         │",
  "│ █ █ █ █   █ █         █ █ █ █   █           │",
  "│ █ █ █ █   ███    >    █ █ █ █   ██          │",
  "│  █  █ █     █          █  █ █     █         │",
  "│  █  ███ █   █          █  ███ █ ██          │",
  "│ markdown components                         │",
  "├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤",
  "│ gate npm  seat 1A  time 18:00   ▍█▌▍▍▍▐▌▌█▍ │",
  "╰─────────────────────────────────────────────╯",
].join("\n");

// Whether a piece draws every frame whole: its rows and columns, and only characters a cell draws.
function whole(p: MarkdownPiece) {
  const frame = p.default();
  for (let t = 0; t <= (p.meta.still ?? 0) + 0.5; t += 0.05) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, p.meta.rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, p.meta.cols, `t=${t}: ${l}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)}`);
    }
  }
}

test("ticket: the catalog's example draws its still, through plain() and a fence", () => {
  const p = ticket(SOURCE);
  assert.equal(SOURCE, 'v0.4 v0.5 "markdown components"\ngate=npm seat=1A time=18:00');
  assert.equal(plain(p), STILL);
  assert.equal(plain(viaFence("ascii ticket", SOURCE)), STILL);
  assert.equal(p.meta.cols, 47);
  assert.equal(p.meta.rows, 10);
  assert.equal(p.says, "ticket: v0.4 to v0.5, markdown components, gate npm, seat 1A, time 18:00.");
  // the barcode: bar i is bits 2i and 2i + 1 of fnv1a32 of the ends and the line
  const h = fnv1a32("v0.4 v0.5 markdown components");
  const bars = Array.from({ length: 11 }, (_, i) => "▌▐█▍"[(h >>> (2 * i)) & 3]).join("");
  assert.equal(STILL.split("\n")[8].slice(34, 45), bars);
});

test("ticket: it prints out a row at a time, the > flies across, the line types and the bars draw; then it holds", () => {
  const p = ticket(SOURCE);
  const frame = p.default();
  const { cols, rows } = p.meta;
  const at = (t: number) => frame(t, { paper: true }).split("\n").map((l) => l.trimEnd());
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    const text = frame(t, { paper: true, color });
    return { text, color: [...color] };
  };
  assert.equal(p.meta.still, 1.4);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 1.4, from: 0, once: true });
  // printed from the top: early on the first rows only, nothing under them
  const early = at(0.2);
  assert.equal(early[1], STILL.split("\n")[1]);
  assert.equal(early[4].replace(/[│ ]/g, ""), "");
  assert.equal(early[8].replace(/[│ ]/g, ""), "");
  // the > leaves the first end and comes to rest midway, a cell further each time it moves
  const arrow = (t: number) => at(t)[3].indexOf(">");
  assert.equal(arrow(0.65), -1);
  assert.ok(arrow(0.75) >= 15 && arrow(0.75) < 19, String(arrow(0.75)));
  assert.ok(arrow(0.9) >= arrow(0.75));
  assert.equal(arrow(1.1), 19);
  // the line types, and the bars draw left to right after it
  assert.equal(at(0.8)[6].replace(/[│]/g, "").trim().length < 16, true);
  assert.equal(at(1.0)[8].slice(34).replace(/[│ ]/g, ""), "");
  assert.ok(at(1.2)[8].slice(34).replace(/[│ ]/g, "").length > 0 && at(1.2)[8].slice(34).replace(/[│ ]/g, "").length < 11);
  // the still: ends and > accent, the line ink, keys soft and values ink, the perforation quiet, the bars ink
  const s = toned(1.4);
  assert.equal(s.text.split("\n").map((l) => l.trimEnd()).join("\n"), STILL);
  const line = (r: number) => s.text.split("\n")[r];
  const tone = (r: number, c: number) => s.color[r * cols + c];
  assert.equal(tone(1, 2), ACCENT);
  assert.equal(tone(3, 19), ACCENT);
  assert.equal(tone(6, 2), INK);
  assert.equal(tone(7, 5), QUIET);
  assert.equal(line(8).slice(2, 6), "gate");
  assert.equal(tone(8, 2), SOFT);
  assert.equal(tone(8, 7), INK);
  assert.equal(tone(8, 40), INK);
  assert.deepEqual(at(5), STILL.split("\n"));
  assert.match(svg(p), /1 forwards/);
  whole(p);
});

test("ticket: one end is an admission, and it takes data, pairs and a width", () => {
  // one end: "admit one", no >
  const one = plain(ticket('v1.0 "launch party"\nwhere=online time=18:00')).split("\n");
  assert.match(one[0], /^╭─ admit one ─+╮$/);
  assert.doesNotMatch(one.join("\n"), />/);
  // its end in banner's slim letters, at the left
  const letters = plain(banner("v1.0", { font: "slim", shadow: "none", pixel: 1, gap: 1, fill: "█", effect: "still" })).split("\n");
  letters.forEach((l, y) => assert.equal(one[1 + y].slice(2, 2 + l.length), l));
  assert.equal(ticket("v1.0").says, "ticket: v1.0.");
  // fields on the first line too, and in order with repeats
  assert.equal(plain(ticket('v0.4 v0.5 "markdown components" gate=npm\nseat=1A time=18:00')), STILL);
  // data: a record or pairs, the same pass
  assert.equal(plain(ticket({ ends: ["v0.4", "v0.5"], line: "markdown components", fields: { gate: "npm", seat: "1A", time: "18:00" } })), STILL);
  assert.equal(plain(ticket({ ends: ["v0.4", "v0.5"], line: "markdown components", fields: [["gate", "npm"], ["seat", "1A"], ["time", "18:00"]] })), STILL);
  // a value with spaces, in quotes; a key with no value
  assert.match(plain(ticket('v1 v2\nwhere="the docs" vip=')), /where the docs {2}vip/);
  // no fields: the stub is the barcode alone
  const bare = plain(ticket("v0.4 v0.5")).split("\n");
  assert.equal(bare.at(-2)!.replace(/[│ ▌▐█▍]/g, ""), "");
  // narrower, the strip wraps item by item, the barcode on each line of the stub
  const narrow = plain(ticket(SOURCE, { width: 50 })).split("\n");
  assert.equal(narrow[0].length, 50);
  const tight = plain(ticket('v1 v2\na=one b=two c=three d=four e=five f=six g=seven', { width: 40 })).split("\n");
  const stub = tight.slice(tight.findIndex((l) => l.startsWith("├")) + 1, -1);
  assert.ok(stub.length >= 2, tight.join("\n"));
  for (const l of stub) assert.equal(l.slice(-13, -2).replace(/[▌▐█▍]/g, "").length, 0, l);
  // unframed, the body draws the perforation itself
  assert.match(plain(ticket(SOURCE, { frame: "none" })), /\n┄{43}\n/);
  // its title, or one of yours, widens it so the barcode keeps to the right edge
  const titled = plain(ticket("a\nk=v", { title: "the pass to the launch of version one" })).split("\n");
  assert.equal(titled[0], "╭─ the pass to the launch of version one ─╮");
  assert.match(titled.at(-2)!, /[▌▐█▍] │$/);
});

test("ticket: says what is wrong, the kit's way", () => {
  assert.throws(() => ticket(""), /ascii\.rest: ticket takes its ends on its first line, one or two words/);
  assert.throws(() => ticket('"only a line"'), /ticket's line 1 takes its ends, one or two words, such as v0\.4 v0\.5/);
  assert.throws(() => ticket("a b c"), /ticket takes one end or two on line 1, and it has 3: "a b c"/);
  assert.throws(() => ticket('a b "one" "two"'), /ticket takes one quoted line under its ends, and line 1 has another: "two"/);
  assert.throws(() => ticket("a b\nloose words"), /ticket's line 2 has "loose" outside key=value: its ends and its line go on line 1/);
  assert.throws(() => ticket('a b\n"a quote"'), /ticket's line 2 has "a quote" outside key=value/);
  assert.throws(() => ticket("v@1"), /ticket's slim letters have no "@", in "v@1": they draw A to Z, 0 to 9/);
  assert.throws(() => ticket("café"), /ascii\.rest: ticket takes characters every monospace face draws one cell wide/);
  assert.throws(() => ticket('a "open'), /ticket's line 1 opens a quote it doesn't close/);
  assert.throws(() => ticket(SOURCE, { width: 30 }), /ticket needs 39 columns for "v0\.4 v0\.5" and its stub, and its width is 30: give it a width of 39 or more/);
  assert.throws(() => ticket("x".repeat(60)), /ticket needs 239 columns for "x{40}\.\.\." in slim letters, past the 156 it can take: shorter ends/);
  assert.throws(() => ticket({ ends: [] }), /ticket's ends take one end or two, such as \["v0\.4", "v0\.5"\], not \[\]/);
  assert.throws(() => ticket({ ends: ["a", ""] }), /ticket's end 2 takes words/);
  assert.throws(() => ticket({ ends: ["a"], fields: [["k"]] } as never), /ticket's fields take a key and a value of words each/);
  assert.throws(() => ticket({ ends: ["a"], fields: "k=v" } as never), /ticket's fields take \{ key: value \} or \[key, value\] pairs, such as \{ gate: "npm" \}, not "k=v"/);
  assert.throws(() => ticket(SOURCE, { gate: "x" } as never), /ticket\(\) has no option "gate"/);
  assert.throws(() => ticket(false as never), /ticket\(\) takes a fence's body/);
});

test("ticket: whatever it is given, it draws whole frames of drawable characters or says why not", () => {
  const sources = ["x", "a b", '""', '"a" "b"', 'a"b', "=", "a=b", "“typographic” x", "line\r\n", "\t tabbed", "...", "→", "日本", "\u{1F600}", "x".repeat(5000), `a b "${"word ".repeat(400)}"`, `a\n${"k=v ".repeat(300)}`, `a\nk="${"v".repeat(300)}"`];
  for (const src of sources) {
    let p: MarkdownPiece;
    try {
      p = ticket(src);
    } catch (e) {
      assert.match(String((e as Error).message), /^ascii\.rest: /, JSON.stringify(src));
      continue;
    }
    whole(p);
  }
});
