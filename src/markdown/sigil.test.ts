// sigil: a text's fingerprint, a bishop's random walk.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fnv1a32, mulberry32 } from "../kit/core.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, BAD, GOOD, INK, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { SIGIL_FIELD, sigil, walkOf } from "./sigil.ts";

const SOURCE = entryOf("sigil").source;
// A fence's figure.
const viaFence = (info: string, body: string): MarkdownPiece => fromFence(info, body);

const STILL = [
  "╭─ bas3line ────────╮",
  "│                   │",
  "│                   │",
  "│                   │",
  "│           o       │",
  "│         S. o      │",
  "│      . . .o .     │",
  "│     E o =..o .    │",
  "│        B.=O .     │",
  "│        .OB+*      │",
  "╰───────────────────╯",
].join("\n");

// Whether a piece draws every frame whole: its rows and columns, and only characters a cell draws.
function whole(p: MarkdownPiece) {
  const frame = p.default();
  const end = (p.meta.still ?? 0) + (p.motion && !p.motion.once ? p.motion.seconds : 0) + 0.5;
  for (let t = 0; t <= end; t += 0.1) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, p.meta.rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, p.meta.cols, `t=${t}: ${l}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)}`);
    }
  }
}

test("sigil: the catalog's example draws its still, through plain() and a fence", () => {
  const p = sigil(SOURCE);
  assert.equal(SOURCE, "bas3line");
  assert.equal(plain(p), STILL);
  assert.equal(plain(viaFence("ascii sigil", SOURCE)), STILL);
  assert.equal(p.meta.cols, 21);
  assert.equal(p.meta.rows, 11);
  assert.equal(p.says, "sigil of bas3line.");
});

test("sigil: the walk is the catalog's rule, 16 bytes of mulberry32(fnv1a32(text)), four diagonal moves a byte", () => {
  const { path, visits } = walkOf("bas3line");
  assert.deepEqual(SIGIL_FIELD, { cols: 17, rows: 9 });
  assert.equal(path.length, 65);
  assert.deepEqual(path[0], [8, 4]);
  assert.equal(visits.reduce((a, b) => a + b, 0), 64);
  // the same rule, written out again
  const next = mulberry32(fnv1a32("bas3line"));
  let x = 8, y = 4;
  for (let i = 0; i < 16; i++) {
    const b = Math.floor(next() * 256);
    for (let k = 0; k < 4; k++) {
      const m = (b >> (2 * k)) & 3;
      x = Math.min(16, Math.max(0, x + (m & 1 ? 1 : -1)));
      y = Math.min(8, Math.max(0, y + (m & 2 ? 1 : -1)));
      assert.deepEqual(path[i * 4 + k + 1], [x, y]);
    }
  }
  // each move is a bishop's, one step on each axis, unless a wall holds it on that axis
  for (const text of ["bas3line", "ascii.rest", "a", "SHA256:2c26b46b68ffc68ff99b453c1d304134"])
    walkOf(text).path.forEach(([x, y], i, path) => {
      if (!i) return;
      const [px, py] = path[i - 1];
      assert.ok(Math.abs(x - px) === 1 || ((px === 0 || px === 16) && x === px), `${text} move ${i}`);
      assert.ok(Math.abs(y - py) === 1 || ((py === 0 || py === 8) && y === py), `${text} move ${i}`);
    });
  // the same text, the same sigil; another text, another
  assert.equal(plain(sigil("bas3line")), plain(sigil({ text: "bas3line" })));
  assert.notEqual(plain(sigil("bas3line", { title: false })), plain(sigil("bas3lime", { title: false })));
});

test("sigil: the bishop walks as it builds, S and E land last; then every 6 seconds it walks again, seamless", () => {
  const p = sigil(SOURCE);
  const frame = p.default();
  const { cols, rows } = p.meta;
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    const text = frame(t, { paper: true, color });
    return { text: text.split("\n").map((l) => l.trimEnd()).join("\n"), color: [...color] };
  };
  assert.equal(p.meta.still, 1.6);
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 6, from: 1.6, once: false });
  // at first, the bishop alone on its square in the middle
  const first = toned(0).text.split("\n");
  assert.equal(first.slice(1, -1).join("").replace(/[│ ]/g, ""), "●");
  assert.equal(first[5].indexOf("●"), 2 + 8);
  // on the way, the bishop and the cells it has passed, no S or E yet
  const mid = toned(0.7);
  assert.match(mid.text, /●/);
  assert.doesNotMatch(mid.text, /[SE]/);
  assert.equal(mid.color[mid.text.split("\n").join("").indexOf("●")], ACCENT);
  // the still: no bishop, S good, E bad, the marks soft, ink or accent by visits
  const s = toned(1.6);
  assert.equal(s.text, STILL);
  const flat = s.text.split("\n").map((l) => l.padEnd(cols)).join("");
  assert.equal(s.color[flat.indexOf("S")], GOOD);
  assert.equal(s.color[flat.indexOf("E")], BAD);
  assert.equal(s.color[flat.indexOf(".")], SOFT);
  assert.equal(s.color[flat.indexOf("B")], INK);
  // the cycle: the bishop walks again, its last cells lit, and the frame a cycle ends on is the still
  const again = toned(1.6 + 1.5);
  assert.match(again.text, /●/);
  assert.ok(again.color.includes(ACCENT));
  assert.equal(again.text.replace("●", "").replace(/ /g, "").length, STILL.replace(/ /g, "").length - 1);
  assert.deepEqual(toned(1.6 + 6), s);
  assert.deepEqual(toned(1.6 + 12), s);
  // at rest in the cycle, the field held
  assert.deepEqual(toned(1.6 + 4), s);
  // svg() loops the cycle
  assert.match(svg(p), /infinite/);
  whole(p);
});

test("sigil: takes its text as data, in quotes, with its own title or none, in a width", () => {
  assert.equal(plain(sigil({ text: "bas3line" })), STILL);
  assert.equal(plain(sigil('"bas3line"')), STILL);
  assert.equal(plain(sigil("  bas3line ")), STILL);
  // a text with spaces, its title the text, cut to the field's width
  assert.equal(plain(sigil('"release key"')).split("\n")[0], "╭─ release key ─────╮");
  assert.equal(plain(sigil('"release key 2026"')).split("\n")[0], "╭─ release key... ──╮");
  // a long text is cut on the title, and in what it says, and the field keeps its frame
  const long = sigil({ text: "SHA256:" + "a1b2c3d4".repeat(8) });
  assert.equal(plain(long).split("\n")[0], "╭─ SHA256:a1b2c... ─╮");
  assert.equal(long.meta.cols, 21);
  assert.equal(long.says, `sigil of ${("SHA256:" + "a1b2c3d4".repeat(8)).slice(0, 57)}....`);
  // a title of your own, or none; a long one widens the frame and the field stays in the middle
  assert.match(plain(sigil(SOURCE, { title: "deploy key" })).split("\n")[0], /^╭─ deploy key ─+╮$/);
  assert.equal(plain(sigil(SOURCE, { title: false })).split("\n")[0], `╭${"─".repeat(19)}╮`);
  const titled = plain(sigil(SOURCE, { title: "the release signing key, 2026" })).split("\n");
  assert.equal(titled[0], "╭─ the release signing key, 2026 ─╮");
  assert.equal(titled[5].indexOf("S"), 2 + Math.floor((31 - 17) / 2) + 8);
  // a width centres the field
  const wide = plain(sigil(SOURCE, { width: 31 })).split("\n");
  assert.equal(wide[0].length, 31);
  assert.equal(wide[5].indexOf("S"), 2 + Math.floor((27 - 17) / 2) + 8);
  // unframed
  assert.equal(plain(sigil(SOURCE, { frame: "none" })).split("\n").length, 9);
  assert.equal(plain(viaFence("ascii sigil frame=double", SOURCE)).split("\n")[0].slice(0, 2), "╔═");
});

test("sigil: says what is wrong, the kit's way", () => {
  assert.throws(() => sigil(""), /ascii\.rest: sigil takes a text to draw the fingerprint of, such as bas3line/);
  assert.throws(() => sigil("one\n\ntwo"), /sigil takes one line, the text it is the fingerprint of, and line 3 has more: "two"/);
  assert.throws(() => sigil('"open'), /sigil's line 1 opens a quote it doesn't close/);
  assert.throws(() => sigil("naïve"), /ascii\.rest: sigil takes characters every monospace face draws one cell wide/);
  assert.throws(() => sigil(SOURCE, { width: 18 }), /sigil needs 21 columns for its field, and its width is 18: give it a width of 21 or more/);
  assert.throws(() => sigil(SOURCE, { seed: 2 } as never), /sigil\(\) has no option "seed"/);
  assert.throws(() => sigil({ text: " " }), /sigil's text takes words to draw the fingerprint of/);
  assert.throws(() => sigil([] as never), /sigil's text takes words/);
  assert.throws(() => sigil(undefined as never), /sigil\(\) takes a fence's body, such as bas3line, or \{ text \}/);
});

test("sigil: whatever it is given, it draws whole frames of drawable characters or says why not", () => {
  const sources = ["x", "a b  c", '""', '"a" "b"', 'a"b', "=", "a=b", "“typographic”", "line\r\n", "\t tabbed", "█▀▄ ●·°", "→", "日本", "\u{1F600}", "x".repeat(5000), "word ".repeat(400)];
  for (const src of sources) {
    let p: MarkdownPiece;
    try {
      p = sigil(src);
    } catch (e) {
      assert.match(String((e as Error).message), /^ascii\.rest: /, JSON.stringify(src));
      continue;
    }
    whole(p);
  }
});
