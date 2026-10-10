// orbit: a hub and the rings of things round it, riding.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence, kinds } from "./index.ts";
import { orbit } from "./orbit.ts";

const STILL = [
  "                · · · · · · · · · ·",
  "          · · · ·                 · terminal",
  "        · ·         · · · · · ·         · ·",
  "      ·         · ·             · svg       ·",
  "    ·         mdx                   ·         ·",
  "    ·         ·     ascii.rest      ·         ·",
  "    ·         ·                     ·         ·",
  "      ·         · ·             · ·         ·",
  "        · ·         ·  react  ·         · ·",
  "       readme · ·                 · · · ·",
  "                · · · · · · · · · ·",
].join("\n");
const SOURCE = entryOf("orbit").source;

function sane(p: MarkdownPiece, step = 0.11) {
  const { cols, rows } = p.meta;
  const frame = p.default();
  const end = (p.meta.still ?? 0) + (p.motion?.once === false ? p.motion.seconds : 0);
  for (let t = 0; t <= end; t += step) {
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

test("orbit: the catalog's example draws its still, two dotted rings round the hub, through plain() and a fence", () => {
  assert.equal(SOURCE, 'ascii.rest\n"react" "mdx" "svg"\n"readme" "terminal"');
  const p = orbit(SOURCE);
  assert.equal(plain(p), STILL);
  // 2 rx + the longest name + 1 by 2 ry + 1, the rings 11 by 3 and 21 by 5
  assert.equal(p.meta.cols, 51);
  assert.equal(p.meta.rows, 11);
  assert.equal(plain(orbit(SOURCE, fence("ascii orbit").options)), STILL);
  assert.equal(p.says, "orbit: around ascii.rest, react, mdx, svg; then readme, terminal.");
});

test("orbit: through fromFence(), once index.ts has it", { skip: !Object.hasOwn(kinds, "orbit") && "index.ts does not list orbit yet" }, () => {
  assert.equal(plain(fromFence("ascii orbit", SOURCE)), STILL);
});

test("orbit: the hub types in, each ring traces out round it with its satellites, and the still holds the start", () => {
  const p = orbit(SOURCE);
  const at = (t: number) => p.default()(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  assert.equal(p.meta.still, 1);
  assert.equal(at(0).trim(), "");
  // the hub typing, no ring yet, no satellite yet
  const hub = at(0.15);
  assert.match(hub, /ascii/);
  assert.doesNotMatch(hub, /[·a-z]*(react|readme)/);
  // ring 1 tracing: react, at its start, is on; readme's ring hasn't begun
  const ring = at(0.5);
  assert.match(ring, /react/);
  assert.doesNotMatch(ring, /readme|terminal/);
  assert.equal(at(1), STILL);
});

test("orbit: the satellites ride their rings, ring k once in 8k seconds, seamless over the rings' common period", () => {
  const p = orbit(SOURCE);
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 16, from: 1, once: false });
  const still = toned(p, 1);
  assert.deepEqual(toned(p, 17), still);
  assert.deepEqual(toned(p, 33), still);
  // ring 1 is round once in 8 s, but ring 2 only halfway: not the still
  assert.notEqual(toned(p, 9).text, still.text);
  // a quarter turn of ring 1: react, from the bottom, has gone round to the left
  const quarter = plain(p, { t: 3 }).split("\n");
  assert.match(quarter[5], /react\s+ascii\.rest/);
  // one ring loops in 8 seconds, three in 48
  assert.equal(orbit('hub\n"a" "b"').motion!.seconds, 8);
  assert.equal(orbit('hub\n"a"\n"b"\n"c"').motion!.seconds, 48);
  sane(p, 0.13);
  assert.match(svg(orbit('hub\n"a" "b"')), /infinite/);
});

test("orbit: ring 1 clears the hub, so the hub is whole in every frame of the cycle", () => {
  const p = orbit(SOURCE);
  const frame = p.default();
  for (let t = 1; t <= 17; t += 0.1) assert.ok(frame(t, { paper: true }).split("\n")[5].includes(" ascii.rest "), `t=${t}`);
});

test("orbit: tones, the rings quiet, the hub accent, ring 1 ink, the rings beyond soft", () => {
  const p = orbit(SOURCE);
  const { text, color } = toned(p, 1);
  const lines = text.split("\n"), cols = p.meta.cols;
  const tone = (word: string) => {
    const y = lines.findIndex((l) => l.includes(word));
    return color[y * cols + lines[y].indexOf(word)];
  };
  assert.equal(tone("ascii.rest"), ACCENT);
  assert.equal(tone("react"), INK);
  assert.equal(tone("readme"), SOFT);
  assert.equal(color[16], QUIET);
});

test("orbit: takes its names as data too, quoted or bare, and sits in a width", () => {
  assert.equal(plain(orbit({ hub: "ascii.rest", rings: [["react", "mdx", "svg"], ["readme", "terminal"]] })), STILL);
  assert.equal(plain(orbit('"ascii.rest"\nreact mdx svg\nreadme "terminal"')), STILL);
  // centred in a width wider than it needs
  const wide = orbit(SOURCE, { width: 61 });
  assert.equal(wide.meta.cols, 61);
  plain(wide)
    .split("\n")
    .forEach((l, i) => assert.equal(l, STILL.split("\n")[i] ? `     ${STILL.split("\n")[i]}` : ""));
  // three rings of six, the most it takes, every name a word long
  const big = orbit(`hub\n${'"a" '.repeat(6)}\n${'"bb" '.repeat(6)}\n${'"ccc" '.repeat(6)}`);
  sane(big, 0.37);
  assert.equal(orbit({ hub: "x", rings: [["y"]] }).says, "orbit: around x, y.");
});

test("orbit: says what is wrong, the kit's way", () => {
  assert.throws(() => orbit(""), /ascii\.rest: orbit takes a hub on its first line and a ring of names on each line after it/);
  assert.throws(() => orbit("ascii.rest"), /orbit takes a ring of names round its hub "ascii\.rest", on the line after it/);
  assert.throws(() => orbit('hub\n"a"\n"b"\n"c"\n"d"'), /orbit takes 1 to 3 rings, not 4/);
  assert.throws(() => orbit('hub\n"a" "b" "c" "d" "e" "f" "g"'), /orbit's ring 1 takes 1 to 6 names, not 7/);
  assert.throws(() => orbit('"one" "two"\n"a"'), /orbit's hub is one name, and line 1 has more/);
  assert.throws(() => orbit('hub\n"a" size=3'), /orbit's line 2 has size="3": write a name bare, or in quotes/);
  assert.throws(() => orbit('hub\n"react'), /orbit's line 2 opens a quote it doesn't close/);
  assert.throws(() => orbit('hub\n"réact"'), /orbit takes characters every monospace face draws one cell wide/);
  assert.throws(() => orbit(`hub\n"${"n".repeat(60)}"\n"${"m".repeat(60)}"`), /orbit needs \d+ columns for these rings, past the 156 it can take: shorter names, or fewer rings/);
  assert.throws(() => orbit(SOURCE, { width: 40 }), /orbit needs 51 columns for these rings, and its width is 40: give it a width of 51 or more/);
  assert.throws(() => orbit({ hub: "", rings: [["a"]] }), /orbit's hub takes a name/);
  assert.throws(() => orbit({ hub: "x", rings: [["a", ""]] }), /orbit's ring 1 takes names, not ""/);
  assert.throws(() => orbit(7 as never), /orbit\(\) takes a fence's body/);
  assert.throws(() => orbit(SOURCE, { rings: 2 } as never), /orbit\(\) has no option "rings"/);
});
