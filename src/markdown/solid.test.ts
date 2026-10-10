// solid: a 3D shape turning, drawn by the kit's renderer, with a caption.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Surface } from "../kit/core.ts";
import { group, render3d, torus } from "../kit/shapes3d.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence, kinds } from "./index.ts";
import { SOLID_SHAPES, solid } from "./solid.ts";

// What the kit's renderer draws for a turntable torus at its rest angle, 32 by 11, its unreached rows cut, and the
// caption under it. The test pins whatever the kit draws.
const STILL = [
  "            @@@@@$$#",
  "          @$#*!!!!!***",
  "         #!=;~---~:;===",
  "        *=;~,,    ,-:;;;",
  "        =;:-,      ::;:~",
  "         ;:::;!#$@#*=;~",
  "          ~:;!*#$#*=:,",
  "              ,--,",
  "",
  "",
  "           ascii.rest",
].join("\n");
const SOURCE = entryOf("solid").source;

function sane(p: MarkdownPiece, step = 0.17) {
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

test("solid: the catalog's example draws the kit's torus at rest over its caption, through plain() and a fence", () => {
  assert.equal(SOURCE, 'torus "ascii.rest"');
  const p = solid(SOURCE);
  assert.equal(plain(p), STILL);
  assert.equal(p.meta.cols, 32);
  assert.equal(plain(solid(SOURCE, fence("ascii solid").options)), STILL);
  assert.equal(p.says, "solid: a torus turning, ascii.rest.");
});

test("solid: through fromFence(), once index.ts has it", { skip: !Object.hasOwn(kinds, "solid") && "index.ts does not list solid yet" }, () => {
  assert.equal(plain(fromFence("ascii solid", SOURCE)), STILL);
});

test("solid: the shape is the kit's own, as render3d() draws it on a turntable", () => {
  // the same torus, turned the same way, drawn straight into a surface by the kit: the figure's rows are its rows
  const s = new Surface(32, 11);
  render3d(s, group([torus()], { spin: [0, Math.PI / 4, 0], center: true }), 0, { camera: { tilt: "above" }, ambient: "soft", period: 8, invert: false });
  const kit = s.toString().split("\n").map((l) => l.trimEnd());
  const mine = STILL.split("\n").slice(0, 8);
  assert.deepEqual(kit.slice(1, 9), mine);
});

test("solid: it grows from a point while it turns, then turns once in 8 seconds, seamless", () => {
  const p = solid(SOURCE);
  const at = (t: number) => p.default()(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  assert.equal(p.meta.still, 0.9);
  assert.equal(at(0).trim(), "");
  // small, at the middle, early in the build
  const early = at(0.2).split("\n").filter((l) => l.trim());
  assert.ok(early.length > 0 && early.length < 7, early.join("\n"));
  assert.ok(early.every((l) => l.trim().length < 12), early.join("\n"));
  assert.equal(at(0.9), STILL);
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 8, from: 0.9, once: false });
  const still = toned(p, 0.9);
  assert.deepEqual(toned(p, 8.9), still);
  assert.notEqual(toned(p, 2.9).text, still.text);
  // a tumble comes round in 16
  const tumble = solid(SOURCE, { turn: "tumble" });
  assert.deepEqual(tumble.motion, { seconds: 16, from: 0.9, once: false });
  assert.deepEqual(toned(tumble, 16.9), toned(tumble, 0.9));
  assert.equal(tumble.says, "solid: a torus tumbling, ascii.rest.");
  assert.match(svg(p), /infinite/);
  sane(p);
});

test("solid: tones, the dim half of the ramp soft, the bright half ink, the caption accent", () => {
  const p = solid(SOURCE);
  const { text, color } = toned(p, 0.9);
  const lines = text.split("\n"), cols = p.meta.cols;
  lines.forEach((l, y) =>
    [...l].forEach((ch, x) => {
      const k = color[y * cols + x];
      if (".,-~:;".includes(ch) && ch !== " " && y < 8) assert.equal(k, SOFT, `${ch} at ${x},${y}`);
      if ("=!*#$@".includes(ch) && ch !== " ") assert.equal(k, INK, `${ch} at ${x},${y}`);
    }),
  );
  assert.equal(color[10 * cols + lines[10].indexOf("ascii.rest")], ACCENT);
});

test("solid: every shape and texture, turning and tumbling, draws whole frames", () => {
  for (const shape of SOLID_SHAPES) {
    const p = solid(`${shape} "x"`);
    assert.ok(plain(p).trim().length > 3, shape);
    sane(p, 0.41);
  }
  for (const texture of ["bands", "stripes", "checker", "grid", "spots"]) sane(solid(`sphere ${texture}`, { turn: "tumble" }), 0.83);
  assert.equal(solid("sphere bands").says, "solid: a sphere with bands turning.");
});

test("solid: takes its shape as data, an empty fence as a torus, and its size", () => {
  assert.equal(plain(solid({ shape: "torus", caption: "ascii.rest" })), STILL);
  // the rows its turn reaches stay, the last empty at rest
  assert.equal(plain(solid("")), STILL.split("\n").slice(0, 9).join("\n"));
  assert.equal(solid("").says, "solid: a torus turning.");
  const big = solid('cube "a cube"', { width: 48, rows: 21 });
  assert.equal(big.meta.cols, 48);
  assert.ok(big.meta.rows > 11 && big.meta.rows <= 23);
  sane(big, 0.53);
  // a long caption widens it, up to the 156 a figure takes
  assert.equal(solid(`torus "${"c".repeat(80)}"`).meta.cols, 80);
  const framed = plain(solid(SOURCE, { frame: "rounded", title: "donut" })).split("\n");
  assert.match(framed[0], /^╭─ donut ─+╮$/);
  assert.equal(framed[0].length, 32);
});

test("solid: says what is wrong, the kit's way", () => {
  assert.throws(() => solid("toruss"), /ascii\.rest: solid's shape takes .* not "toruss" \(did you mean "torus"\?\)/);
  assert.throws(() => solid("torus plaid"), /solid's texture takes .* not "plaid"/);
  assert.throws(() => solid("galaxy bands"), /solid's texture is for a solid shape, and a galaxy is a cloud of points/);
  assert.throws(() => solid("torus bands extra"), /solid takes a shape and a texture, then a quoted caption, and has "extra" too/);
  assert.throws(() => solid('torus "a" "b"'), /solid takes one quoted caption, and line 1 has another: "b"/);
  assert.throws(() => solid("torus turn=tumble"), /solid's line 1 has turn="tumble": its options go on the fence/);
  assert.throws(() => solid('torus "unclosed'), /solid's line 1 opens a quote it doesn't close/);
  assert.throws(() => solid('torus "¿qué?"'), /solid takes characters every monospace face draws one cell wide/);
  assert.throws(() => solid(SOURCE, { turn: "spin" as never }), /solid's turn takes "turntable" or "tumble", not "spin"/);
  assert.throws(() => solid(SOURCE, { rows: 3 }), /solid's rows takes a whole number from 5 to 40, not 3/);
  assert.throws(() => solid(`torus "${"c".repeat(157)}"`), /solid needs 157 columns for its caption "c+", past the 156 it can take/);
  assert.throws(() => solid('torus "a caption of words"', { width: 16 }), /solid needs 18 columns for its caption "a caption of words", and its width is 16: give it a width of 18 or more/);
  assert.throws(() => solid([] as never), /solid\(\) takes a fence's body/);
  assert.throws(() => solid(null as never), /solid\(\) takes a fence's body/);
});
