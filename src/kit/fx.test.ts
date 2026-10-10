// node --test src/kit/fx.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as donut from "../pieces/donut.ts";
import * as rust from "../pieces/rust.ts";
import { banner } from "../banner.ts";
import { loopOf, svg } from "../svg.ts";
import { still } from "../terminal.ts";
import type { Piece } from "../types.ts";
import { INK, Palette, Surface, asPiece, mix, piece, ramps } from "./core.ts";
import { chain, dissolve, effect, fade, glint, glitch, hueCycle, hues, outline, outlines, rainbow, scan, shadow, shake, typeIn, wave } from "./fx.ts";

// A frame as text, and each cell's colour as #rrggbb (null for a space, or in one ink), as a player draws it.
function look(p: Piece, t: number, { paper = false, mono = false }: { paper?: boolean; mono?: boolean } = {}) {
  const { meta } = p;
  const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows).fill(254) : undefined;
  const text = p.default({ ...meta.options })(t, { paper, color });
  const flat = text.replace(/\n/g, "");
  const hexes = [...flat].map((ch, i) => (ch === " " || !color ? null : (meta.palette![color[i]] ?? `bad ${color[i]}`)));
  return { text, hexes, color };
}

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette; and the
// same frame for the same t, drawn fresh or after other frames.
function contract(p: Piece, times = [0, 0.3, 0.6, 1, 2.5, 4]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      const seen: string[] = [];
      for (const t of times) {
        const text = frame(t, { paper, color });
        seen.push(text);
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `${meta.name} t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `${meta.name} t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `${meta.name}: colour ${c} past the palette`);
      }
      // Backwards, and fresh: a frame depends only on t.
      const again = p.default({ ...meta.options });
      for (let i = times.length - 1; i >= 0; i--) assert.equal(again(times[i], { paper, color }), seen[i], `${meta.name} t=${times[i]}: not the same frame twice`);
    }
}

// Same text, and same colours where both have ink.
function same(a: ReturnType<typeof look>, b: ReturnType<typeof look>, why: string) {
  assert.equal(a.text, b.text, why);
  assert.deepEqual(a.hexes, b.hexes, `${why}: colours`);
}

const block = Array.from({ length: 8 }, (_, y) => "#".repeat(24 + (y % 3))).join("\n");
const blocks = asPiece(block);
// rust with its own glint off, to compare an effect's frames with, and the option that turns it off in an effect.
const rust0 = { meta: { ...rust.meta, options: { shine: 0 } }, default: rust.default } as Piece;
const quietRust = (o: object = {}) => ({ ...o, options: { shine: 0 } });
const still3 = banner("kit", { effect: "still", color: "#f97316" });

test("every effect makes a piece that keeps the frame contract, in colour and mono, on paper and not", () => {
  for (const p of [
    glint(rust),
    glint("hello\nworld"),
    typeIn(still3, { hold: 1 }),
    typeIn(donut, { order: "random" }),
    dissolve(donut),
    fade(still3),
    scan(rust, { reveal: true }),
    scan("abc\ndef", { direction: "left", color: "#ff0000" }),
    glitch(rust),
    wave(still3),
    wave(donut, { axis: "columns" }),
    rainbow(still3),
    hueCycle(donut),
    shake(rust),
    outline(donut),
    shadow(still3),
    chain(donut, (p) => glint(p), (p) => wave(p)),
  ])
    contract(p);
});

test("glint: quiet between passes, a slanted band of light across the ink during one", () => {
  const p = glint(rust, quietRust());
  // Before the first pass and after one, it is the source. Across rust, 64 by 32 leaning 1 a row, the band travels 99
  // cells, which at 40 a second takes about 2.5 s, from 0.5 s.
  for (const t of [0, 0.2, 3.1, 3.9]) same(look(p, t), look(rust0, t), `t=${t}`);
  for (const t of [0, 3.1]) same(look(p, t, { paper: true }), look(rust0, t, { paper: true }), `paper t=${t}`);
  assert.notEqual(look(p, 2.5).text, look(rust0, 2.5).text, "still crossing at 2.5 s");
  // Mid pass: rust's solid characters in the band's core turn to slashes, as the logos' own glint, only where the
  // source has ink, on paper too.
  const src = look(rust0, 1.5), mid = look(p, 1.5), lit = look(p, 1.5, { paper: true });
  const flat = (s: string) => [...s.replace(/\n/g, "")];
  const a = flat(src.text), b = flat(mid.text), c = flat(lit.text);
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === " ") assert.equal(b[i], " ", "the band lights only ink");
    else if (a[i] !== b[i]) {
      changed++;
      assert.equal(b[i], "/", `dark page band: ${b[i]}`);
      assert.equal(c[i], "/", `paper band: ${c[i]}`);
    }
  }
  assert.ok(changed > 20, `the band crosses ink: ${changed} cells`);
  // The band's colours are the source's own lifted toward white.
  const tints = new Set(rust.meta.palette.flatMap((c) => [mix(c, "#ffffff", 0.6), mix(c, "#ffffff", 0.3)]));
  const added = mid.hexes.filter((h, i) => h && h !== src.hexes[i]);
  assert.ok(added.length > 20 && added.every((h) => tints.has(h!)), "lit in the tints");
  // The band leans like a slash: a row further down is lit further left.
  const col = (row: number) => b.slice(row * 64, row * 64 + 64).findIndex((ch, x) => ch !== a[row * 64 + x]);
  const top = col(9), low = col(20);
  assert.ok(top >= 0 && low >= 0 && low < top, `leans: row 9 at ${top}, row 20 at ${low}`);
});

test("glint: each character as suits it, blocks to blocks, solid to a slash, thin ones kept", () => {
  // A band wide enough to cover all of it: 8 is solid, l and the box line are thin, ▓ is a block.
  const p = glint("8l─▓.", { first: 0, sweep: 1, width: 40 });
  assert.equal(look(p, 0.5).text, "/l─█.");
  assert.equal(look(p, 0.5, { paper: true }).text, "/l─▒.");
  // Characters of your own light every cell of ink.
  assert.equal(look(glint("8l─▓.", { first: 0, sweep: 1, width: 40, chars: "*" }), 0.5).text, "*****");
  // A banner's shadow lines keep their shape under the band, and its letters' blocks turn bright.
  const b = glint(still3, { first: 0, sweep: 1, width: 400 });
  const src = [...look(still3, 0).text], lit = [...look(b, 0.5).text];
  src.forEach((ch, i) => {
    if (ch >= "─" && ch <= "╿") assert.equal(lit[i], ch, "box drawing is kept");
    if (ch === "▓") assert.equal(lit[i], "█");
  });
});

test("glint: the sweep takes longer across a wide piece, so the band moves at most 40 cells a second", () => {
  const lit = (p: Piece, t: number) => look(p, t).text.includes("/");
  // 10 columns: 1.2 s, over by 2 s. 100 columns: 104 cells of travel, 2.6 s, still crossing at 2 s and over by 3.2.
  assert.ok(lit(glint("8".repeat(10)), 1) && !lit(glint("8".repeat(10)), 2));
  assert.ok(lit(glint("8".repeat(100)), 2) && lit(glint("8".repeat(100)), 3) && !lit(glint("8".repeat(100)), 3.2));
  // Never past 3 s, nor three quarters of `every`; a sweep given is kept.
  assert.ok(!lit(glint("8".repeat(300)), 3.6));
  assert.ok(lit(glint("8".repeat(100), { every: 2 }), 1.9) && !lit(glint("8".repeat(100), { every: 2 }), 2.1));
  assert.ok(!lit(glint("8".repeat(100), { sweep: 1 }), 1.6));
});

test("glint: options, colours on a piece in one ink, its loop and its still", () => {
  // In one ink with no colour it stays in one ink; given a colour, it gains a palette with the kit's ink for the rest.
  assert.equal(glint("hello").meta.palette, undefined);
  const red = glint("hello", { color: "#ff0000", first: 0, sweep: 1, every: 2, width: 40 });
  assert.deepEqual(new Set(red.meta.palette), new Set(["#ff0000", INK.light, INK.dark]));
  const shot = look(red, 0.5);
  assert.ok(shot.hexes.some((h) => h === "#ff0000"));
  assert.equal(look(red, 1.5).hexes.filter(Boolean).every((h) => h === INK.dark), true, "between passes, the kit's ink on a dark page");
  assert.equal(look(red, 1.5, { paper: true }).hexes.filter(Boolean).every((h) => h === INK.light), true, "and on paper");
  // chars: null keeps the characters, and one character is core and edge.
  assert.equal(look(glint("hello", { chars: null, first: 0, width: 40 }), 0.5).text, "hello");
  assert.equal(look(glint("hello", { chars: "*", first: 0, sweep: 1, width: 40 }), 0.5).text, "*****");
  // Its loop: its own period on a still source or a piece that never repeats, the least common multiple with a loop,
  // nothing past 60 seconds.
  assert.equal(glint("x").meta.loop, 4);
  assert.equal(glint(donut).meta.loop, 4);
  assert.equal(glint(banner("x")).meta.loop, 16, "a glinting banner loops every 3.2 s");
  assert.equal(glint(banner("x"), { every: 7 }).meta.loop, undefined);
  assert.equal(glint(rust).meta.loop, 20, "rust glints every 5 s");
  // Its still is a moment no band shows.
  const s = glint(rust, quietRust()).meta.still!;
  same(look(glint(rust, quietRust()), s), look(rust0, s), "the still is quiet");
  assert.equal(glint("x").meta.fps, 24);
  assert.equal(glint(donut).meta.fps, 30);
  assert.throws(() => glint("x", { every: -1 }), /^Error: ascii\.rest: glint\.every takes a number of seconds above 0, not -1$/);
  assert.throws(() => glint("x", { chars: "abc" }), /glint\.chars takes one or two characters/);
  assert.throws(() => glint("x", { color: "red" }), /glint\.color takes a colour as #rrggbb, \{ light, dark \}, or a palette's name .* not "red"/);
  assert.throws(() => glint("x", { color: 5 as never }), /glint\.color takes a colour as #rrggbb or a palette's name such as "gold", not 5/);
  assert.ok(glint(donut, { color: "gold" }).meta.palette!.includes("#fef08a"), "a palette's name is its strong colour");
  assert.throws(() => glint("x", 5 as never), /glint\(\) takes its options as an object/);
  assert.throws(() => glint(42 as never), /glint\(\) takes a piece, a block of text or a Surface, not number/);
});

test("glint: a gradient banner's colours and their tints stay within 64", () => {
  const p = glint(banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] }));
  assert.equal(p.meta.palette!.length, 64);
  contract(p, [0, 0.7, 0.9, 1.2]);
});

test("glint: a lit cell is its own colour lifted, never another colour, and a block on paper keeps its colour", () => {
  // A gradient banner has 32 colours: their 32 core tints fill the 64 and the edges' find no room. Coloured by theme it
  // has 62, and most core tints find none either. Each lit cell is still a tint of its own colour, or its own, where
  // its characters show the band: before, a tint with no room took the nearest colour left, a pink on an orange letter.
  const gradient = banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] });
  const themed = banner("ascii.rest", { effect: "still", color: { light: ["#b45309", "#be185d"], dark: ["#f97316", "#f778ba"] } });
  for (const src of [gradient, themed])
    for (const paper of [false, true]) {
      const p = glint(src, { first: 0, sweep: 1, width: 6 });
      const before = look(src, 0, { paper }), flat = [...before.text.replace(/\n/g, "")];
      let lifted = 0;
      for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        const lit = look(p, t, { paper });
        before.hexes.forEach((h, i) => {
          if (!h) return;
          const ok = [h, mix(h, "#ffffff", 0.6), mix(h, "#ffffff", 0.3)];
          assert.ok(ok.includes(lit.hexes[i]!), `t=${t} cell ${i} ${flat[i]}: ${h} lit as ${lit.hexes[i]}`);
          if (lit.hexes[i] !== h) lifted++;
          // On paper the band's ▒▓ is the glint on a block; a tint on top all but rubbed it out.
          if (paper && flat[i] >= "▀" && flat[i] <= "▟") assert.equal(lit.hexes[i], h, `block ${i} on paper`);
        });
      }
      if (src === gradient && !paper) assert.ok(lifted > 50, `the gradient banner's band is lifted on a dark page: ${lifted} cells`);
    }
});

test("typeIn: a character at a time behind a cursor, in reading order, then the whole and a blinking cursor", () => {
  const p = typeIn("abc\nde", { speed: 10 });
  assert.equal(p.meta.cols, 4, "a column for the cursor");
  assert.equal(look(p, 0).text, "▌   \n    ");
  assert.equal(look(p, 0.25).text, "ab▌ \n    ");
  assert.equal(look(p, 0.35).text, "abc \n▌   ", "spaces take no time");
  assert.equal(look(p, 0.5).text, "abc \nde▌ ");
  assert.equal(look(p, 1.1).text, "abc \nde  ", "the cursor blinks");
  assert.equal(look(p, 1.6).text, "abc \nde▌ ");
  assert.equal(p.meta.loop, undefined, "it types once");
  assert.equal(p.meta.still, 1);
  // No cursor, no extra column; and once in, exactly the source.
  const bare = typeIn(still3, { cursor: false });
  assert.equal(bare.meta.cols, still3.meta.cols);
  same(look(bare, 10), look(still3, 10), "typed in");
  same(look(bare, 10, { paper: true }), look(still3, 10, { paper: true }), "typed in, on paper");
  // start waits, the cursor blinking where it will begin.
  const late = typeIn("ab", { start: 1, speed: 10 });
  assert.equal(look(late, 0.2).text, "▌  ");
  assert.equal(look(late, 0.7).text, "   ");
  assert.equal(look(late, 1.15).text, "a▌ ");
});

test("typeIn: hold loops it; columns and random orders; big pieces type in within 3 seconds", () => {
  const p = typeIn("abcd", { speed: 4, hold: 1 });
  assert.equal(p.meta.loop, 2);
  for (const t of [0.3, 0.8, 1.5]) assert.equal(look(p, t).text, look(p, t + 2).text, `t=${t} repeats`);
  assert.equal(look(p, 2.3).text, "a▌   ");
  const cols = typeIn("ab\ncd", { order: "columns", speed: 10, cursor: false });
  assert.equal(look(cols, 0.25).text, "a \nc ");
  const r1 = typeIn(block, { order: "random", speed: 100, seed: 1 }), r2 = typeIn(block, { order: "random", speed: 100, seed: 2 });
  assert.equal(look(r1, 0.5).text, look(r1, 0.5).text);
  assert.notEqual(look(r1, 0.5).text, look(r2, 0.5).text);
  assert.equal(look(r1, 0.5).text.replace(/[^#]/g, "").length, 50, "50 cells at 100 a second, no cursor in random order");
  // rust has more than a thousand characters: they are all in by 3 seconds, the still just after.
  const big = typeIn(rust, quietRust());
  assert.ok(big.meta.still! > 3 && big.meta.still! < 3.6, `still ${big.meta.still}`);
  same(look(typeIn(rust, quietRust({ cursor: false })), 3.01), look(rust0, 3.01), "rust typed in");
  // A source that starts empty is counted at its held moment.
  assert.equal(typeIn(dissolve(block)).meta.still, 3.5, "199 cells, in within 3 seconds, not none");
  assert.throws(() => typeIn("x", { order: "spiral" as never }), /typeIn\.order takes "reading", "random" or "columns", not "spiral"/);
  assert.throws(() => typeIn("x", { cursor: "ab" }), /typeIn\.cursor takes one character/);
  assert.throws(() => typeIn("x", { speed: 0 }), /typeIn\.speed takes a number above 0, not 0/);
});

test("dissolve: in, held whole, out and gone; only the source's cells, deterministic by seed", () => {
  const p = dissolve(block);
  assert.equal(p.meta.loop, 6);
  assert.equal(p.meta.still, 2.7);
  same(look(p, 2.7), look(blocks, 0), "held, it is the source");
  assert.equal(look(p, 0).text.trim(), "", "gone at the start of a period");
  assert.equal(look(p, 5.7).text.trim(), "", "and at the end");
  const count = (t: number) => look(p, t).text.replace(/[^#.:]/g, "").length;
  // In: more each step; out: fewer.
  const ins = [0.2, 0.6, 1, 1.4].map(count), outs = [3.8, 4.2, 4.6, 5].map(count);
  for (let i = 1; i < 4; i++) assert.ok(ins[i] > ins[i - 1] && outs[i] < outs[i - 1], `in ${ins} out ${outs}`);
  // Part way, every cell shown is the source's, or an edge character where the source has ink.
  const src = [...look(blocks, 0).text], mid = [...look(p, 0.9).text];
  for (let i = 0; i < src.length; i++) if (mid[i] !== " ") assert.ok(mid[i] === src[i] || (src[i] === "#" && ".:".includes(mid[i])), `cell ${i}`);
  assert.ok(mid.includes(":") && mid.includes("."), "an edge where it crosses");
  // Seeds.
  assert.equal(look(dissolve(block, { seed: 3 }), 0.9).text, look(dissolve(block, { seed: 3 }), 0.9).text);
  assert.notEqual(look(dissolve(block, { seed: 3 }), 0.9).text, look(p, 0.9).text);
  // Modes: in holds at the end, out is whole at the start.
  same(look(dissolve(block, { mode: "in" }), 5.9), look(blocks, 0), "in, held");
  same(look(dissolve(block, { mode: "out" }), 0), look(blocks, 0), "out, whole first");
  assert.equal(look(dissolve(block, { edge: "" }), 0.9).text.replace(/[#\s]/g, ""), "", "no edge");
  // A coloured source keeps its colours.
  const d = dissolve(rust, quietRust());
  same(look(d, 2.7), look(rust0, 2.7), "rust held");
  const half = look(d, 0.9), whole = look(rust0, 0.9);
  half.hexes.forEach((h, i) => h && assert.equal(h, whole.hexes[i]));
  assert.throws(() => dissolve("x", { mode: "sideways" as never }), /dissolve\.mode takes "in", "out" or "inout", not "sideways"/);
  assert.throws(() => dissolve("x", { blob: 0.5 }), /dissolve\.blob takes a number of cells, 1 or more, not 0\.5/);
});

test("dissolve: blob is the size of the patches that come and go together, in cells", () => {
  const wide = Array.from({ length: 16 }, () => "#".repeat(64)).join("\n");
  // Cells shown part way that have a shown neighbour to the right: patches hold together, speckle doesn't.
  const together = (blob: number) => {
    const rows = look(dissolve(wide, { blob, edge: "" }), 1).text.split("\n");
    let shown = 0, pairs = 0;
    rows.forEach((l) => {
      for (let x = 0; x < l.length - 1; x++) if (l[x] === "#") (shown++, l[x + 1] === "#" && pairs++);
    });
    return pairs / shown;
  };
  const big = together(12), fine = together(1);
  assert.ok(big > fine + 0.15, `patches of 12 hold together more than 1: ${big.toFixed(2)} against ${fine.toFixed(2)}`);
});

test("dissolve: an SVG's loop starts on the held moment, so its reduced-motion frame is whole", () => {
  const p = dissolve(donut);
  assert.deepEqual(loopOf(p), { every: 6, from: 2.7, once: false });
  assert.match(svg(p, { dark: true }), /^<svg /);
});

test("fade: each character steps down its ramp to a space, blocks in blocks, lines whole, colours kept", () => {
  const p = fade(still3);
  same(look(p, 2.7), look(still3, 0), "held");
  same(look(p, 2.7, { paper: true }), look(still3, 0, { paper: true }), "held, on paper");
  assert.equal(look(p, 0).text.trim(), "", "gone");
  // Part way, a block steps down the blocks, low early and higher later; a box line is itself or gone, thinning out
  // rather than turning to dots.
  const src = look(still3, 0), cells = [...src.text];
  const isBlock = (ch: string) => ch >= "▀" && ch <= "▟";
  for (const [t, want] of [[0.7, "░"], [1.2, "▒"]] as const) {
    const mid = look(p, t);
    const b = [...mid.text];
    let lines = 0, shown = 0;
    b.forEach((ch, i) => {
      if (!isBlock(cells[i]) && cells[i] !== " " && cells[i] !== "\n") (lines++, ch === cells[i] && shown++);
      if (ch === " " || ch === "\n" || ch === cells[i]) return;
      assert.ok(isBlock(cells[i]) && ramps.blocks.includes(ch), `${cells[i]} steps down to ${ch}`);
    });
    assert.ok(shown > 0 && shown < lines, `t=${t}: ${shown} of ${lines} box lines shown part way`);
    for (const ch of want) assert.ok(b.includes(ch), `t=${t}: ${ch} part way down`);
    if (t < 1) assert.ok(!b.includes("▓"), `t=${t}: below its start`);
    mid.hexes.forEach((h, i) => h && assert.equal(h, src.hexes[i]));
  }
  // Plain ascii steps down the standard ramp.
  const word = fade("hello@world", { mode: "out", period: 10 });
  const part = look(word, 8).text;
  assert.match(part, /^[ .:\-=+*#hellowrd@]+$/);
  assert.ok([...part].some((ch) => ".:-=+*#".includes(ch)), part);
  // On its top step a character is itself, so the fade meets the whole piece without a jump.
  const ink = cells.filter((ch) => ch !== " " && ch !== "\n").length;
  const near = [...look(p, 1.7).text].filter((ch, i) => ch !== " " && ch !== "\n" && ch === cells[i]).length;
  assert.ok(near > 0.8 * ink, `${near} of ${ink} cells already themselves just before it holds`);
  // A ramp named for every character: the blocks step down the standard ramp.
  const std = [...look(fade(still3, { ramp: "standard" }), 1.2).text];
  std.forEach((ch, i) => ch !== " " && ch !== "\n" && ch !== cells[i] && assert.ok(ramps.standard.includes(ch), `${ch} on the standard ramp`));
  assert.ok(std.some((ch) => "+*=".includes(ch)));
  // A character on the ramp starts from its own place.
  const dots = fade(":::::", { mode: "out", period: 10 });
  assert.equal(look(dots, 0).text, ":::::");
  assert.match(look(dots, 8).text, /^[ .:]+$/);
  assert.throws(() => fade("x", { ramp: "ab" }), /fade\.ramp starts with a space/);
  assert.throws(() => fade("x", { ramp: "x" }), /a ramp takes a name/);
});

test("scan: a line across the piece, over it or revealing it, every way", () => {
  const p = scan(block);
  assert.equal(p.meta.loop, 3);
  same(look(p, 0), look(blocks, 0), "before the line is on");
  const lines = look(p, 1.5).text.split("\n");
  assert.equal(lines.filter((l) => /^─+$/.test(l)).length, 1, "one line, the width across");
  const src = look(blocks, 0).text.split("\n");
  lines.forEach((l, y) => /─/.test(l) || assert.equal(l, src[y]));
  // Revealing: what the line hasn't reached is empty, and after it, whole.
  const r = scan(block, { reveal: true, direction: "up" });
  const part = look(r, 0.9).text.split("\n");
  const at = part.findIndex((l) => l.includes("─"));
  assert.ok(at > 0 && at < 7, `the line at row ${at}`);
  part.forEach((l, y) => (y < at ? assert.equal(l.trim(), "") : y > at && assert.equal(l, src[y])));
  same(look(r, 2.5), look(blocks, 0), "held whole");
  // Across: a column of │, in its own colour.
  const c = scan("abc\ndef", { direction: "right", color: "#00ff00", period: 1 });
  // Halfway through a period it is at column 1: it runs from one off the left edge to one off the right.
  const shot = look(c, 0.5);
  assert.equal(shot.text, "a│c\nd│f");
  assert.deepEqual(shot.hexes, [INK.dark, "#00ff00", INK.dark, INK.dark, "#00ff00", INK.dark]);
  assert.throws(() => scan("x", { direction: "sideways" as never }), /scan\.direction takes "down", "up", "right" or "left"/);
  assert.throws(() => scan("x", { reveal: 1 as never }), /scan\.reveal takes true or false, not 1/);
});

test("glitch: whole between bursts, broken during one, the same for the same t and seed", () => {
  const p = glitch(rust, quietRust());
  assert.equal(p.meta.loop, 2.5);
  for (const t of [0, 0.4, 1, 2.9]) same(look(p, t), look(rust0, t), `t=${t} quiet`);
  const burst = look(p, 0.6), src = look(rust0, 0.6);
  assert.notEqual(burst.text, src.text);
  // Every character is the source's or junk.
  const junk = "#%&@$/\\|<>";
  const known = new Set([...src.text]);
  for (const ch of burst.text) assert.ok(known.has(ch) || junk.includes(ch), `${ch}`);
  // Colours only from the source's palette.
  for (const h of burst.hexes) if (h) assert.ok(rust.meta.palette.includes(h));
  // Deterministic, and seeded.
  assert.equal(look(glitch(rust, quietRust()), 0.6).text, burst.text);
  assert.notEqual(look(glitch(rust, quietRust({ seed: 9 })), 0.6).text, burst.text);
  // amount 0: bursts do nothing.
  same(look(glitch(rust, quietRust({ amount: 0 })), 0.6), src, "amount 0");
  // Its own loop with rust's glint, every 5 s, is 5 s.
  assert.equal(glitch(rust).meta.loop, 5);
  assert.throws(() => glitch("x", { amount: 2 }), /glitch\.amount takes a number from 0 to 1, not 2/);
  assert.throws(() => glitch("x", { chars: "" }), /glitch\.chars takes one or more characters/);
});

test("wave: rows sway within the room it adds, nothing cut off", () => {
  const p = wave(still3);
  assert.equal(p.meta.cols, still3.meta.cols + 4);
  assert.equal(p.meta.rows, still3.meta.rows);
  assert.equal(p.meta.loop, 2);
  const src = look(still3, 0).text.split("\n");
  const offs = new Set<number>();
  for (const t of [0, 0.25, 0.5, 1, 1.5]) {
    look(p, t)
      .text.split("\n")
      .forEach((l, y) => {
        const off = l.length - l.trimStart().length - (src[y].length - src[y].trimStart().length);
        assert.ok(off >= 0 && off <= 4, `row ${y} at ${off}`);
        assert.equal(l.slice(off, off + src[y].length), src[y], `row ${y} is the source's, moved`);
        offs.add(off);
      });
  }
  assert.ok(offs.size >= 4, "it sways");
  const cols = wave(still3, { axis: "columns" });
  assert.equal(cols.meta.rows, still3.meta.rows + 2);
  assert.equal(cols.meta.cols, still3.meta.cols);
  assert.throws(() => wave("x", { amplitude: 0 }), /wave\.amplitude takes a number above 0, not 0/);
  assert.throws(() => wave("x".repeat(318), { amplitude: 2 }), /wave\(\) makes a piece 322 by 1 from one 318 by 1, past the 320 by 120/);
});

test("rainbow and hueCycle: the ink in a cycle of colours, the source's characters kept", () => {
  const p = rainbow("hello world");
  assert.equal(look(p, 1).text, "hello world");
  assert.equal(look(p, 1, { mono: true }).text, "hello world");
  const dark = new Set(hues.dark), light = new Set(hues.light);
  const on = look(p, 1), paper = look(p, 1, { paper: true });
  for (const h of on.hexes) if (h) assert.ok(dark.has(h), h);
  for (const h of paper.hexes) if (h) assert.ok(light.has(h), h);
  assert.ok(new Set(on.hexes.filter(Boolean)).size >= 3, "bands of colour");
  assert.notDeepEqual(look(p, 0).hexes, look(p, 1).hexes, "they move");
  assert.deepEqual(look(p, 0.5).hexes, look(p, 3.5).hexes, "every 3 s");
  // hueCycle: one colour at a time.
  const h = hueCycle("hello world");
  for (const t of [0, 0.7, 1.9]) assert.equal(new Set(look(h, t).hexes.filter(Boolean)).size, 1);
  // Your own colours, faded round to `steps`, twice across.
  const two = rainbow("abcdefgh", { colors: ["#ff0000", "#0000ff"], steps: 4, cycles: 2 });
  assert.deepEqual(look(two, 0).hexes, ["#ff0000", "#800080", "#0000ff", "#800080", "#ff0000", "#800080", "#0000ff", "#800080"]);
  // By default every colour fits once across the piece, whatever its size; down it with direction "y".
  for (const w of [12, 60]) {
    const seen = new Set(look(rainbow("#".repeat(w)), 0).hexes);
    assert.equal(seen.size, 12, `all 12 hues across ${w} columns`);
  }
  const tall = rainbow(Array(12).fill("#").join("\n"), { direction: "y" });
  assert.equal(new Set(look(tall, 0).hexes).size, 12, "all 12 down 12 rows");
  assert.throws(() => rainbow("x", { colors: ["red"] }), /rainbow\.colors takes a list of colours as #rrggbb/);
  assert.throws(() => rainbow("x", { steps: 40 }), /rainbow\.steps takes a whole number from 1 to 32, not 40/);
  assert.throws(() => rainbow("x", { cycles: -1 }), /rainbow\.cycles takes a number, 0 or more, not -1/);
  assert.throws(() => hueCycle("x", { direction: "z" as never }), /hueCycle\.direction takes "x", "y" or "diagonal"/);
});

test("shake: still in the middle of its room, jolted during a shake", () => {
  const p = shake("ab\ncd", { amount: 2 });
  assert.equal(p.meta.cols, 6);
  assert.equal(p.meta.rows, 6);
  assert.equal(look(p, 0).text, "      \n      \n  ab  \n  cd  \n      \n      ");
  const where = (t: number) => {
    const lines = look(p, t).text.split("\n");
    const y = lines.findIndex((l) => l.includes("a"));
    return [lines[y].indexOf("a") - 2, y - 2];
  };
  const moves = new Set<string>();
  for (let t = 0.5; t < 0.8; t += 0.05) {
    const [dx, dy] = where(t);
    assert.ok(Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && (dx || dy), `jolted ${dx}, ${dy}`);
    moves.add(`${dx},${dy}`);
  }
  assert.ok(moves.size >= 3, "it jolts about");
  assert.deepEqual(where(1.2), [0, 0]);
  assert.equal(p.meta.loop, 2);
  assert.throws(() => shake("x", { amount: 1.5 }), /shake\.amount takes a whole number of cells, 1 or more, not 1\.5/);
});

test("outline: box drawing round the outside of the ink, gaps closed, holes left alone", () => {
  assert.equal(look(outline("ab"), 0).text, "┌──┐\n│ab│\n└──┘");
  assert.equal(look(outline("ab cd"), 0).text, "┌─────┐\n│ab cd│\n└─────┘");
  assert.equal(look(outline("ab cd", { gap: 0 }), 0).text, "┌──┬──┐\n│ab│cd│\n└──┴──┘");
  assert.equal(look(outline("###\n# #\n###", { style: "double" }), 0).text, "╔═══╗\n║###║\n║# #║\n║###║\n╚═══╝");
  assert.equal(look(outline("a\n\nb", { style: "ascii" }), 0).text, "+-+\n|a|\n+-+\n|b|\n+-+");
  assert.equal(outline("x").meta.fps, 0, "a still stays still");
  assert.equal(outline(donut).meta.fps, 30);
  // On a coloured piece, the colour of the ink beside it; or the one given.
  const c = look(outline(rust, quietRust()), 0);
  const lines = new Set([...outlines.single]);
  c.hexes.forEach((h, i) => [...c.text.replace(/\n/g, "")][i] !== " " && assert.ok(h && rust.meta.palette.includes(h), `${h}`));
  assert.ok([...c.text].some((ch) => lines.has(ch) && ch !== " "));
  const given = look(outline("ab", { color: "#ff0000" }), 0);
  assert.equal(given.hexes[0], "#ff0000");
  assert.equal(given.hexes[6], INK.dark);
  assert.throws(() => outline("x", { style: "fancy" }), /outline\.style takes "single", "double", "rounded", "heavy" or "ascii", or 16 characters of your own, not "fancy"/);
});

test("shadow: the ink moved right and down, behind it, a muted grey on a coloured piece", () => {
  assert.equal(look(shadow("ab\nc"), 0).text, "ab \nc░░\n ░ ");
  assert.equal(look(shadow("ab", { dx: -2, dy: 0, char: "." }), 0).text, "..ab");
  assert.equal(shadow("ab").meta.palette, undefined);
  const k = shadow(still3);
  const on = look(k, 0), paper = look(k, 0, { paper: true });
  const flat = [...on.text.replace(/\n/g, "")];
  flat.forEach((ch, i) => ch === "░" && assert.equal(on.hexes[i], "#9198a1"));
  [...paper.text.replace(/\n/g, "")].forEach((ch, i) => ch === "░" && assert.equal(paper.hexes[i], "#59636e"));
  assert.ok(flat.includes("░"));
  assert.throws(() => shadow("x", { dx: 0.5 }), /shadow\.dx takes a whole number of cells, not 0\.5/);
  assert.throws(() => shadow("x", { char: "ab" }), /shadow\.char takes one character/);
});

test("shadow: cast by the piece as one solid shape, none in the spaces it encloses, unless solid is false", () => {
  // A ring's hole and a boxed word's inside get no shadow: it falls only outside, as behind a card.
  assert.equal(look(shadow("###\n# #\n###"), 0).text, "### \n# #░\n###░\n ░░░");
  assert.equal(look(shadow("###\n# #\n###", { solid: false }), 0).text, "### \n#░#░\n###░\n ░░░");
  assert.equal(look(shadow(outline("a b", { gap: 0 })), 0).text, "┌─┬─┐ \n│a│b│░\n└─┴─┘░\n ░░░░░");
  // An open gap is outside: the shadow falls into it.
  assert.equal(look(shadow("# #\n# #\n###"), 0).text, "# # \n#░#░\n###░\n ░░░");
  // Spaces that a logo's ink encloses, rust's inside its cog, stay clear.
  const holes = (o: object) => look(shadow(rust, quietRust(o)), 0).text.split("\n").slice(12, 13)[0];
  assert.match(holes({}), /88p {2}8888888888 {8}'"8888888888 {2}p8\| {2}\|888/);
  assert.match(holes({ solid: false }), /88p░░8888888888░{8}'"8888888888░ p8\|░░\|888/);
  assert.throws(() => shadow("x", { solid: "yes" as never }), /shadow\.solid takes true or false, not "yes"/);
});

test("chain: effects one after another, the same as calling them in turn", () => {
  const a = chain("hi\nyo", (p) => glint(p, { first: 0 }), (p) => wave(p));
  const b = wave(glint("hi\nyo", { first: 0 }));
  for (const t of [0, 0.3, 1]) assert.equal(look(a, t).text, look(b, t).text);
  // An effect with no options goes in by its name.
  const bare = chain(still3, rainbow, wave), wrapped = chain(still3, (p) => rainbow(p), (p) => wave(p));
  for (const t of [0, 0.7]) same(look(bare, t), look(wrapped, t), `t=${t}`);
  assert.equal(chain(donut), donut);
  assert.throws(() => chain("x", 5 as never), /chain\(\) takes effects as functions/);
  assert.throws(() => chain("x", () => 5 as never), /chain\(\)'s effect 1 returns a piece/);
});

test("sources: text, a grid with colours, and the source's options passed through", () => {
  const g = new Surface(3, 1, { palette: new Palette(["#000000", "#ff0000"]) });
  g.set(0, 0, "x", "#ff0000");
  g.set(2, 0, "y", 0);
  const p = glint(g);
  assert.deepEqual(look(p, 0).hexes, ["#ff0000", null, "#000000"]);
  contract(p);
  // The source's options are the piece's: rust's glint is off, so between bursts it is rust with its glint off.
  const off = glitch(rust, { options: { shine: 0 } });
  assert.deepEqual(off.meta.options, { shine: 0 });
  assert.equal(look(off, 1.3).text, look(rust0, 1.3).text);
  assert.notEqual(look(glitch(rust), 1.3).text, look(rust0, 1.3).text, "with its glint on, it crosses at 1.3 s");
  // And a player can still change them.
  assert.equal(off.default({ shine: 5 })(1.3), look(rust, 1.3).text);
  assert.throws(() => glitch(rust, { options: 3 as never }), /glitch\.options takes the source's options as an object/);
});

test("names, notes, categories and the size limit", () => {
  const p = dissolve(donut);
  assert.equal(p.meta.name, "donut");
  assert.equal(p.meta.note, "donut, dissolving in and out");
  assert.equal(p.meta.category, "shapes");
  assert.equal(glint("hello\nworld").meta.name, "hello");
  assert.equal(glint("x", { name: "shiny", note: "a shiny x" }).meta.note, "a shiny x");
  assert.ok(glint("x".repeat(100)).meta.note.length <= 72);
  assert.throws(() => glint("x", { note: "n".repeat(80) }), /note takes one line of 1 to 72 characters/);
  assert.throws(() => outline("x".repeat(319)), /outline\(\) makes a piece 321 by 3/);
});

test("effects play through svg() and the terminal", async () => {
  for (const p of [glint(rust), glitch(banner("hi")), shadow("hi"), typeIn("hello", { hold: 1 })]) {
    const out = svg(p, { dark: true });
    assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(out, /<\/svg>$/);
  }
  assert.match(svg(glint(rust)), /animation:20s step-end infinite/);
  assert.equal(await still(dissolve(block)), look(dissolve(block), 2.7, { mono: true }).text);
});

test("a misspelt option throws, naming the options there are, rather than being left out", () => {
  assert.throws(() => glint("x", { evry: 2 } as never), /^Error: ascii\.rest: glint\(\) has no option "evry": it takes every, sweep, first, width, slant, chars, color, name, note or options$/);
  assert.throws(() => dissolve("x", { sed: 2 } as never), /dissolve\(\) has no option "sed": it takes period, mode, blob, edge, seed/);
  assert.throws(() => rainbow("x", { step: 2 } as never), /rainbow\(\) has no option "step": it takes colors, steps, period, cycles, direction/);
  // The names the spec first gave say what to write now.
  assert.throws(() => dissolve("x", { scale: 0.15 } as never), /dissolve\(\) has no option "scale": write blob, the patches' size in cells across, which is 1 \/ scale: 7 for 0\.15$/);
  assert.throws(() => rainbow("x", { spread: 0.03 } as never), /rainbow\(\) has no option "spread": write cycles, the times the colours fit across the piece/);
  assert.throws(() => hueCycle("x", { spread: 0.03 } as never), /hueCycle\(\) has no option "spread": write cycles/);
  assert.throws(() => hueCycle("x", { speed: 2 } as never), /hueCycle\(\) has no option "speed"/);
  for (const [fx, make] of [
    ["typeIn", typeIn],
    ["fade", fade],
    ["scan", scan],
    ["glitch", glitch],
    ["wave", wave],
    ["shake", shake],
    ["outline", outline],
    ["shadow", shadow],
  ] as const)
    assert.throws(() => (make as (s: string, o: object) => Piece)("x", { colour: "#ff0000" }), new RegExp(`^Error: ascii\\.rest: ${fx}\\(\\) has no option "colour"`));
  // An option left undefined is no option at all.
  assert.equal(look(glint("x", { every: undefined, evry: undefined } as never), 0).text, "x");
});

test("text with Windows line ends and tabs is taken as a terminal shows it", () => {
  assert.equal(look(outline("ab\r\ncd"), 0).text, "┌──┐\n│ab│\n│cd│\n└──┘");
  assert.equal(look(shadow("a\tb", { dx: 0, dy: 1 }), 0).text, "a       b\n░       ░");
  assert.equal(glint("12345678\tx").meta.cols, 17);
  assert.equal(look(typeIn("ab\r\ncd", { speed: 100 }), 1).text, "ab \ncd ");
  assert.throws(() => glint("a\u0007b"), /text takes printable characters/);
  // An emoji is two cells' worth of a frame, which an effect would part.
  assert.throws(() => glint("a😀b"), /glint\(\) takes text of characters from the Basic Multilingual Plane, one a cell, not emoji: "a😀b"/);
  // list.map(glint) passes an index as the options: the error says what to write.
  assert.throws(() => ["a", "b"].map(glint as never), /glint\(\) takes its options as an object, not 0: over a list, write list\.map\(\(p\) => glint\(p\)\)/);
});

test("typeIn: an SVG plays it once and holds, as a page does; looping with hold", () => {
  assert.deepEqual(loopOf(typeIn("hello")), { every: 0.625, from: 0, once: true });
  assert.match(svg(typeIn("hello")), /1 forwards/);
  // With hold it loops, from the middle of the hold, so the frame held for reduced motion is all typed.
  assert.deepEqual(loopOf(typeIn("hello", { hold: 1 })), { every: 1.125, from: 0.625, once: false });
  // On a moving source it plays once too. It looped every 4 s from 0, so reduced motion showed a lone cursor; and on a
  // logo it started at 4.5 s, where rust's own glint loop does, after the typing was over.
  const ink = (p: Piece, t: number) => look(p, t, { mono: true }).text.replace(/[\s▌]/g, "").length;
  for (const p of [typeIn(donut), typeIn(rust)]) {
    const l = loopOf(p);
    assert.equal(l.once, true, p.meta.name);
    assert.equal(l.from, 0, p.meta.name);
    assert.ok(ink(p, l.from + l.every) > 0.95 * ink(p.meta.name === "rust" ? rust : donut, l.from + l.every), `${p.meta.name} ends typed`);
    assert.ok(ink(p, 1) < 0.5 * ink(p, l.every), `${p.meta.name} is typing at 1 s`);
  }
});

test("an effect of a piece made with piece() keeps its colours by theme", () => {
  const duo = piece({ name: "duo", cols: 4, rows: 1, fps: 0, palette: { light: ["#111111", "#aa0000"], dark: ["#eeeeee", "#ff5555"] } }, (t, s) => {
    s.write(0, 0, "ab");
    s.set(2, 0, "c", 1);
  });
  for (const paper of [false, true]) same(look(scan(duo), 0, { paper }), look(duo, 0, { paper }), `paper ${paper}`);
  assert.deepEqual(look(shadow(duo), 0).hexes.slice(0, 3), ["#eeeeee", "#eeeeee", "#ff5555"]);
});

test("a cell an effect draws with no colour takes the source's main colour for the page's theme", () => {
  // A scan line across empty cells of a piece coloured by theme: light ink on a dark page, dark ink on paper. It was
  // drawn in the palette's first colour, the light page's, and so all but vanished on a dark page.
  const duo = piece({ name: "duo", cols: 8, rows: 3, fps: 0, palette: { light: ["#111111", "#aa0000"], dark: ["#eeeeee", "#ff5555"] } }, (t, s) => {
    s.write(2, 1, "ab");
    s.set(4, 1, "c", 1);
  });
  const line = (paper: boolean) => new Set(look(scan(duo, { period: 3 }), 1.2, { paper }).hexes.slice(8, 16));
  assert.deepEqual(line(false), new Set(["#eeeeee", "#ff5555"]));
  assert.deepEqual(line(true), new Set(["#111111", "#aa0000"]));
  // A logo's own main colour, by theme.
  const r = look(scan(rust, quietRust({ period: 3 })), 1.5);
  const row = r.text.split("\n").findIndex((l) => /─{64}/.test(l));
  const counts = new Map<string, number>();
  for (const h of r.hexes.slice(row * 64, row * 64 + 64)) counts.set(h!, (counts.get(h!) ?? 0) + 1);
  assert.ok(row >= 0 && [...counts.keys()].every((h) => rust.meta.palette.slice(rust.meta.palette.length / 2).includes(h)), `${[...counts.keys()]}`);
});

test("dissolve: blocks cross the edge as lighter blocks, other characters as dots, or as you say", () => {
  const edgeOf = (src: string, o = {}) => new Set(look(dissolve(src, { edge: undefined, ...o }), 0.9).text.replace(/[\s#▓]/g, ""));
  const wall = (ch: string) => Array.from({ length: 8 }, () => ch.repeat(40)).join("\n");
  assert.deepEqual(edgeOf(wall("▓")), new Set(["░", "▒"]));
  assert.deepEqual(edgeOf(wall("#")), new Set([".", ":"]));
  assert.deepEqual(edgeOf(wall("▓"), { edge: "*" }), new Set(["*"]));
});

test("typeIn: typing that runs past a minute plays svg()'s 4 seconds from its held moment, rather than sampled whole", () => {
  assert.deepEqual(loopOf(typeIn("hello", { speed: 0.05 })), { every: 4, from: 100.5, once: false });
  assert.match(svg(typeIn("hello", { speed: 1e-6 })), /^<svg /);
  assert.equal(loopOf(typeIn("x".repeat(59), { speed: 1 })).once, true, "59.5 s plays once");
  assert.deepEqual(loopOf(typeIn("x".repeat(60), { speed: 1 })), { every: 4, from: 60.5, once: false }, "60.5 s is past a minute");
});

test("effect(): an effect of your own, sized, coloured, timed and checked as the kit's are", () => {
  // The simplest: a drawing alone. It moves as its source does, and copying the source is the source.
  const copy = effect(donut, (t, s, src) => s.paste(src, 0, 0));
  assert.equal(copy.meta.fps, 30);
  assert.equal(copy.meta.loop, undefined);
  for (const t of [0, 0.7]) same(look(copy, t), look(donut, t), `t=${t}`);
  // A period makes it move by itself: 24 frames a second on a still, the loop by the time rule.
  const blink = effect("hi", { period: 1 }, (t, s, src) => {
    if (t % 1 < 0.5) s.paste(src, 0, 0);
  });
  assert.equal(blink.meta.fps, 24);
  assert.equal(blink.meta.loop, 1);
  assert.equal(look(blink, 0.2).text, "hi");
  assert.equal(look(blink, 0.7).text, "  ");
  assert.equal(effect(rust, { period: 2 }, () => {}).meta.loop, 10, "with rust's glint, every 5 s");
  assert.equal(effect("hi", { moves: true }, () => {}).meta.loop, undefined, "moves, never repeats");
  // pad: room round the source, which sits at ctx.x, ctx.y.
  const framed = effect("ab", { pad: { left: 2, bottom: 1 } }, (t, s, src, ctx) => {
    s.fill(".");
    s.paste(src, ctx.x, ctx.y);
  });
  assert.equal(framed.meta.cols, 4);
  assert.equal(look(framed, 0).text, "..ab\n....");
  assert.equal(effect("ab", { pad: [1, 2] }, () => {}).meta.rows, 5);
  assert.equal(effect("ab", { pad: 3 }, () => {}).meta.cols, 8);
  // colors: drawn by #rrggbb; on a piece in one ink the rest is in the kit's ink.
  const red = effect("ab", { colors: ["#ff0000"] }, (t, s, src) => {
    s.paste(src, 0, 0);
    s.set(1, 0, "!", "#ff0000");
  });
  assert.deepEqual(look(red, 0).hexes, [INK.dark, "#ff0000"]);
  assert.deepEqual(look(red, 0, { paper: true }).hexes, [INK.light, "#ff0000"]);
  assert.equal(look(red, 0, { mono: true }).text, "a!");
  // ctx.at reads the source at another moment: an echo of donut half a second back.
  const echo = effect(donut, (t, s, src, ctx) => s.paste(ctx.at(t - 0.5), 0, 0));
  for (const t of [0.5, 1.3]) same(look(echo, t), look(donut, t - 0.5), `echo t=${t}`);
  // { setup } runs once a play, for buffers.
  let setups = 0;
  const kept = effect("ab", {
    setup: () => {
      setups++;
      return (t, s, src) => s.paste(src, 0, 0);
    },
  });
  const play = kept.default();
  play(0);
  play(1);
  assert.equal(setups, 1);
  // Name, note, the source's options, still; and it keeps the contract and chains.
  const named = effect(rust, { name: "mine", still: 1.5, options: { shine: 0 } }, (t, s, src) => s.paste(src, 0, 0));
  assert.equal(named.meta.name, "mine");
  assert.equal(named.meta.note, "mine, with an effect");
  assert.equal(named.meta.still, 1.5);
  assert.deepEqual(named.meta.options, { shine: 0 });
  contract(effect(rust, { period: 1, pad: 1, colors: ["#00ff00"] }, (t, s, src, ctx) => {
    s.paste(src, ctx.x, ctx.y);
    s.set(0, 0, "*", "#00ff00");
  }));
  const twice = chain("hi", (p) => effect(p, { pad: 1 }, (t, s, src) => s.paste(src, 1, 1)), outline);
  assert.equal(twice.meta.cols, 6);
  // What it checks.
  assert.throws(() => effect("x", 5 as never), /^Error: ascii\.rest: effect\(\) takes a drawing, \(t, s, src, ctx\) => \{ \.\.\. \}, or \{ setup: \(\) => drawing \}/);
  assert.throws(() => effect("x", { period: 1 }, null as never), /effect\(\) takes a drawing/);
  assert.throws(() => effect("x", { perod: 1 } as never, () => {}), /effect\(\) has no option "perod": it takes period, moves, still, pad, colors, name, note or options/);
  assert.throws(() => effect("x", { period: 0 }, () => {}), /effect\.period takes a number of seconds above 0, not 0/);
  assert.throws(() => effect("x", { pad: -1 }, () => {}), /effect\.pad takes a whole number of cells, 0 or more, not -1/);
  assert.throws(() => effect("x", { pad: { up: 1 } as never }, () => {}), /effect\.pad takes a whole number of cells, 0 or more, \[columns, rows\], or \{ top, right, bottom, left \}/);
  assert.throws(() => effect("x", { colors: ["red"] }, () => {}), /effect\.colors takes a list of colours as #rrggbb/);
  assert.throws(() => effect("x", { moves: 1 as never }, () => {}), /effect\.moves takes true or false/);
  assert.throws(() => effect("x".repeat(300), { pad: 20 }, () => {}), /effect\(\) makes a piece 340 by 41/);
  assert.throws(() => effect("x", { setup: () => 5 as never }).default()(0), /effect\(\)'s setup returns the drawing/);
});

test("rainbow: a source in sixty colours still shows every hue, its own colours left out", () => {
  // Coloured by theme, a gradient banner has 62 colours. Kept, they left two places for 24 hues, and the rest were drawn
  // in the nearest of the banner's oranges and pinks: six colours where there should be twelve.
  const full = banner("ascii.rest", { effect: "still", color: { light: ["#b45309", "#be185d"], dark: ["#f97316", "#f778ba"] } });
  assert.equal(full.meta.palette!.length, 62);
  const r = rainbow(full);
  for (const paper of [false, true]) {
    const seen = new Set(look(r, 0, { paper }).hexes.filter(Boolean));
    assert.deepEqual(seen, new Set(paper ? hues.light : hues.dark), `paper ${paper}`);
  }
  assert.ok(!r.meta.palette!.includes("#f97316"), "none of the banner's own");
  assert.equal(look(r, 0, { mono: true }).text, look(full, 0, { mono: true }).text);
  contract(r);
});

test("loops: an effect's piece keeps to its own loop, not a logo's shine, in a chain and in an SVG", () => {
  // Every 13 s with rust's 5 is 65 s, past a minute: no loop. It kept rust's `shine`, so svg() played rust's 5 s from
  // 4.5 s, a window with no glint of its own in it, and an effect on top of it took 5 s as its period.
  const slow = glint(rust, { every: 13 });
  assert.equal(slow.meta.loop, undefined);
  const l = loopOf(slow);
  assert.deepEqual(l, { every: 4, from: slow.meta.still, once: false });
  const lit = (t: number) => look(slow, t).text !== look(rust, t).text;
  assert.ok([1, 1.5, 2].some(lit), "its glint crosses within the SVG's 4 seconds");
  // A source with no loop counts as having the effect's period, by the kit's time rule: 2, not lcm(5, 2).
  assert.equal(wave(slow).meta.loop, 2);
  assert.equal(glint(slow, { every: 3 }).meta.loop, 3);
  // An effect that doesn't move plays as its source: the outline of a typed banner types in once and holds.
  const typed = banner("hi", { effect: "type" });
  assert.deepEqual(loopOf(outline(typed)), loopOf(typed));
  assert.deepEqual(loopOf(shadow(banner("hi"))), loopOf(banner("hi")));
});

test("shake and glitch repeat exactly on the loop they claim: every burst is the same", () => {
  for (const p of [shake("HELLO WORLD\nSECOND LINE", { amount: 2 }), glitch("HELLO WORLD\nSECOND LINE"), shake(rust, { every: 1.5, seed: 4 })]) {
    const loop = p.meta.loop!;
    assert.ok(loop > 0, p.meta.name);
    for (let i = 0; i < 60; i++) {
      const t = (i / 60) * loop;
      assert.equal(look(p, t).text, look(p, t + loop).text, `${p.meta.name} at ${t.toFixed(3)}`);
      assert.equal(look(p, t).text, look(p, t + 3 * loop).text, `${p.meta.name} three loops on at ${t.toFixed(3)}`);
    }
  }
});

test("any t gives a whole frame: before 0, not a number, and a long way on", () => {
  const sources: Piece[] = [rust, still3, asPiece("ab\ncd")];
  const makers = [glint, typeIn, dissolve, fade, scan, glitch, wave, rainbow, hueCycle, shake, outline, shadow] as ((s: Piece) => Piece)[];
  for (const src of sources)
    for (const make of makers) {
      const p = make(src);
      contract(p, [-3, Number.NaN, 1e9, 0, 123456.789]);
    }
});
