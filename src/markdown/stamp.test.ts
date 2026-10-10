// stamp: a rubber stamp that thuds onto the page.
import assert from "node:assert/strict";
import { test } from "node:test";
import { banner } from "../banner.ts";
import { fnv1a32 } from "../kit/core.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, BAD, GOOD, QUIET, VIOLET, WARN, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { stamp } from "./stamp.ts";

const SOURCE = entryOf("stamp").source;
// A fence's figure.
const viaFence = (info: string, body: string): MarkdownPiece => fromFence(info, body);

const STILL = [
  "╔═════════════════════════════════╗",
  "║  █  ██  ██  ██   █  █ █ ███ █▒  ║",
  "║ █ █ █ █ █ █ █ █ ▒ █ █ █ ▒   █ █ ║",
  "║ ███ █▒  ██  █▒  █ █ █ █ █▒  █ ▒ ║",
  "║ █ █ █   █   █ █ █ █  █  █   █ █ ║",
  "║ █ █ ▒   ▒   █ █  █   █  ███ ██  ║",
  "║   by @bas3line on 2026-10-10    ║",
  "╚═════════════════════════════════╝",
].join("\n");

// Whether a piece draws every frame whole: its rows and columns, and only characters a cell draws.
function whole(p: MarkdownPiece) {
  const frame = p.default();
  for (let t = 0; t <= (p.meta.still ?? 0) + 0.5; t += 1 / 30) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, p.meta.rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, p.meta.cols, `t=${t}: ${l}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)}`);
    }
  }
}

test("stamp: the catalog's example draws its still, banner's slim letters worn by the word's hash, through plain() and a fence", () => {
  const p = stamp(SOURCE);
  assert.equal(SOURCE, 'approved\n"by @bas3line on 2026-10-10"');
  assert.equal(plain(p), STILL);
  assert.equal(plain(viaFence("ascii stamp", SOURCE)), STILL);
  assert.equal(p.meta.cols, 35);
  assert.equal(p.meta.rows, 8);
  assert.equal(p.says, "stamp: approved, by @bas3line on 2026-10-10.");
  // the letters are banner's slim ones at a column a pixel, a cell worn where fnv1a32("approved:x:y") % 9 is 0
  const art = banner("approved", { font: "slim", shadow: "none", pixel: 1, gap: 1, fill: "█", effect: "still" });
  const letters = plain(art).split("\n");
  const rows = STILL.split("\n").slice(1, 6).map((l) => l.slice(2, 2 + 31));
  letters.forEach((l, y) =>
    [...l.padEnd(31)].forEach((ch, x) => assert.equal(rows[y][x], ch === "█" ? (fnv1a32(`approved:${x}:${y}`) % 9 === 0 ? "▒" : "█") : " ", `${x} ${y}`)),
  );
});

test("stamp: its shadow darkens, it lands with a jolt and its wear settles in; then it holds", () => {
  const p = stamp(SOURCE);
  const frame = p.default();
  const { cols, rows } = p.meta;
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    const text = frame(t, { paper: true, color });
    return { text, color: [...color] };
  };
  assert.equal(p.meta.still, 0.8);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 0.8, from: 0, once: true });
  // the shadow: only ░, quiet, thicker in the middle than at the edges, and more of it later
  const shade = (t: number) => toned(t).text.replace(/[\n ]/g, "");
  assert.equal(shade(0), "");
  assert.match(shade(0.15), /^░+$/);
  assert.ok(shade(0.25).length > shade(0.1).length);
  const half = toned(0.15).text.split("\n");
  const middle = half.slice(2, 6).map((l) => l.slice(10, 25)).join("").replace(/ /g, "").length / 60;
  const edge = [half[0], half[7]].join("").replace(/ /g, "").length / 70;
  assert.ok(middle > edge, `${middle} ${edge}`);
  assert.ok(toned(0.15).color.every((c, i) => toned(0.15).text.replace(/\n/g, "")[i] === " " || c === QUIET));
  // the thud: landed a column to the right, its right edge off the page, for two frames; no wear yet
  const thud = toned(0.31).text.split("\n");
  assert.equal(thud[0], ` ╔${"═".repeat(33)}`);
  assert.doesNotMatch(thud.join("\n"), /▒/);
  // back in its place, unworn, then worn
  const landed = toned(0.4).text.split("\n").map((l) => l.trimEnd());
  assert.equal(landed[0], STILL.split("\n")[0]);
  assert.equal(landed.join("\n").replace(/▒/g, "█"), STILL.replace(/▒/g, "█"));
  assert.doesNotMatch(landed.join("\n"), /▒/);
  // the still, all in the accent; and it holds
  const s = toned(0.8);
  assert.equal(s.text.split("\n").map((l) => l.trimEnd()).join("\n"), STILL);
  const flat = s.text.replace(/\n/g, "");
  [...flat].forEach((ch, i) => ch !== " " && assert.equal(s.color[i], ACCENT, `${i} ${ch}`));
  assert.equal(plain(p, { t: 5 }), STILL);
  assert.match(svg(p), /1 forwards/);
  whole(p);
});

test("stamp: takes its word as data, its ink from tone, and stretches to a width", () => {
  assert.equal(plain(stamp({ word: "approved", line: "by @bas3line on 2026-10-10" })), STILL);
  assert.equal(plain(stamp('approved "by @bas3line on 2026-10-10"')), STILL);
  // no line: the letters alone, in the border
  const bare = plain(stamp("shipped")).split("\n");
  assert.equal(bare.length, 7);
  assert.equal(bare[0].length, 27 + 4);
  // words, as the face: a space is two columns of slim's
  assert.equal(stamp("do not merge").says, "stamp: do not merge.");
  // the tone is the ink, and the color option sets the accent
  for (const [tone, k] of [["good", GOOD], ["warn", WARN], ["bad", BAD], ["violet", VIOLET], ["accent", ACCENT]] as const) {
    const p = viaFence(`ascii stamp tone=${tone}`, "ok");
    const color = new Uint8Array(p.meta.cols * p.meta.rows);
    const text = p.default()(p.meta.still!, { paper: true, color }).replace(/\n/g, "");
    [...text].forEach((ch, i) => ch !== " " && assert.equal(color[i], k, `${tone} ${i}`));
  }
  // the same word wears the same way; another word, another way
  assert.equal(plain(stamp("approved")), plain(stamp({ word: "approved" })));
  // a width stretches the border, the face in its middle
  const wide = plain(stamp(SOURCE, { width: 45 })).split("\n");
  assert.equal(wide[0], `╔${"═".repeat(43)}╗`);
  // the border, half the room either side, then A's first pixel a column in
  assert.equal(wide[1].indexOf("█"), 1 + Math.floor((43 - 31) / 2) + 1);
  // a long line wraps inside the border
  const long = plain(stamp(`ok "${"a few more words ".repeat(12).trim()}"`)).split("\n");
  assert.ok(long.length > 8 && long.every((l) => l.length === long[0].length), long.join("\n"));
  // framed, with a long title, it widens with the title
  const titled = plain(stamp("ok", { frame: "rounded", title: "the verdict on pull request 53" })).split("\n");
  assert.equal(titled[0], "╭─ the verdict on pull request 53 ─╮");
  assert.equal(titled[1], `│ ╔${"═".repeat(30)}╗ │`);
});

test("stamp: says what is wrong, the kit's way", () => {
  assert.throws(() => stamp(""), /ascii\.rest: stamp takes a word for its face, and a quoted line under it if you like/);
  assert.throws(() => stamp('"by me"'), /stamp takes a word for its face, not only a quoted line: write it bare, as approved "by me"/);
  assert.throws(() => stamp("approved\nrejected"), /stamp's word is one line, and line 2 has words too: "rejected"/);
  assert.throws(() => stamp('ok "one" "two"'), /stamp takes one quoted line under its word, and line 1 has another: "two"/);
  assert.throws(() => stamp("ok tone=good"), /stamp's line 1 has tone="good": its options go on the fence, as ```ascii stamp tone=good/);
  assert.throws(() => stamp("@bas3line"), /stamp's slim letters have no "@", in "@bas3line": they draw A to Z, 0 to 9/);
  assert.throws(() => stamp("ok \"open"), /stamp's line 1 opens a quote it doesn't close/);
  assert.throws(() => stamp("résumé"), /ascii\.rest: stamp takes characters every monospace face draws one cell wide/);
  assert.throws(() => stamp("ok", { tone: "green" as never }), /stamp's tone takes "accent", "good", "warn", "bad" or "violet", not "green"/);
  assert.throws(() => stamp("approved", { width: 30 }), /stamp needs 35 columns for "approved" in slim letters, and its width is 30: give it a width of 35 or more, or a shorter word/);
  assert.throws(() => stamp("a".repeat(60)), /stamp needs 243 columns for "a{60}" in slim letters, past the 156 it can take: a shorter word/);
  assert.throws(() => stamp({ word: "" }), /stamp's word takes a word for its face/);
  assert.throws(() => stamp({ word: "ok", line: 3 } as never), /stamp's line takes words, not 3/);
  assert.throws(() => stamp(7 as never), /stamp\(\) takes a fence's body/);
});

test("stamp: whatever it is given, it draws whole frames of drawable characters or says why not", () => {
  const sources = ["x", "a b  c", '""', '"a" "b"', 'a"b', "=", "a=b", "“typographic”", "line\r\n", "\t tabbed", "...", "█▀▄ ●·°", "→", "日本", "\u{1F600}", "x".repeat(5000), `ok "${"word ".repeat(400)}"`, "ok!?:-+=/_.,'"];
  for (const src of sources) {
    let p: MarkdownPiece;
    try {
      p = stamp(src);
    } catch (e) {
      assert.match(String((e as Error).message), /^ascii\.rest: /, JSON.stringify(src));
      continue;
    }
    whole(p);
  }
});
