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
import { chain, dissolve, fade, glint, glitch, hueCycle, hues, outline, outlines, rainbow, scan, shadow, shake, typeIn, wave } from "./fx.ts";

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
  // Before the first pass and after one, it is the source.
  for (const t of [0, 0.2, 2, 3.9]) same(look(p, t), look(rust0, t), `t=${t}`);
  for (const t of [0, 2]) same(look(p, t, { paper: true }), look(rust0, t, { paper: true }), `paper t=${t}`);
  // Mid pass: some cells are the band's characters, only where the source has ink.
  const src = look(rust0, 1.1), mid = look(p, 1.1), lit = look(p, 1.1, { paper: true });
  const flat = (s: string) => [...s.replace(/\n/g, "")];
  const a = flat(src.text), b = flat(mid.text), c = flat(lit.text);
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === " ") assert.equal(b[i], " ", "the band lights only ink");
    else if (a[i] !== b[i]) {
      changed++;
      assert.ok("█▓".includes(b[i]), `dark page band: ${b[i]}`);
      assert.ok("▒▓".includes(c[i]), `paper band: ${c[i]}`);
    }
  }
  assert.ok(changed > 20, `the band crosses ink: ${changed} cells`);
  // The band's colours are the source's own lifted toward white.
  const tints = new Set(rust.meta.palette.flatMap((c) => [mix(c, "#ffffff", 0.6), mix(c, "#ffffff", 0.3)]));
  const added = mid.hexes.filter((h, i) => h && h !== src.hexes[i]);
  assert.ok(added.length > 20 && added.every((h) => tints.has(h!)), "lit in the tints");
  // The band leans like a slash: a row further down is lit further left.
  const col = (row: number) => b.slice(row * 64, row * 64 + 64).indexOf("█");
  const top = col(9), low = col(20);
  assert.ok(top >= 0 && low >= 0 && low < top, `leans: row 9 at ${top}, row 20 at ${low}`);
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
  assert.throws(() => glint("x", { color: "red" }), /glint\.color takes a colour as #rrggbb, not "red"/);
  assert.throws(() => glint("x", 5 as never), /glint\(\) takes its options as an object/);
  assert.throws(() => glint(42 as never), /glint\(\) takes a piece, a block of text or a Surface, not number/);
});

test("glint: a gradient banner's colours and their tints stay within 64", () => {
  const p = glint(banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] }));
  assert.equal(p.meta.palette!.length, 64);
  contract(p, [0, 0.7, 0.9, 1.2]);
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
  assert.throws(() => dissolve("x", { scale: 2 }), /dissolve\.scale takes a number above 0, up to 1, not 2/);
});

test("dissolve: an SVG's loop starts on the held moment, so its reduced-motion frame is whole", () => {
  const p = dissolve(donut);
  assert.deepEqual(loopOf(p), { every: 6, from: 2.7, once: false });
  assert.match(svg(p, { dark: true }), /^<svg /);
});

test("fade: each character steps down the ramp to a space, colours kept", () => {
  const p = fade(still3);
  same(look(p, 2.7), look(still3, 0), "held");
  same(look(p, 2.7, { paper: true }), look(still3, 0, { paper: true }), "held, on paper");
  assert.equal(look(p, 0).text.trim(), "", "gone");
  const std = ramps.standard;
  // Part way, every character is on the ramp: ▓ starts from #, box lines from -; low early, higher later.
  const src = look(still3, 0);
  for (const [t, want] of [[0.7, ":-"], [1.2, "+*"]] as const) {
    const mid = look(p, t);
    const b = [...mid.text];
    for (const ch of b) if (ch !== " " && ch !== "\n") assert.ok(std.includes(ch), `${ch} is on the ramp`);
    assert.ok([...want].some((ch) => b.includes(ch)), `t=${t}: ${want} part way down`);
    assert.ok(!b.includes("#") && !b.includes("@"), `t=${t}: below its start`);
    mid.hexes.forEach((h, i) => h && assert.equal(h, src.hexes[i]));
  }
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
  // Your own colours, faded round to `steps`.
  const two = rainbow("abcdefgh", { colors: ["#ff0000", "#0000ff"], steps: 4, spread: 0.25 });
  assert.deepEqual(new Set(look(two, 0).hexes), new Set(["#ff0000", "#800080", "#0000ff"]));
  assert.throws(() => rainbow("x", { colors: ["red"] }), /rainbow\.colors takes a list of colours as #rrggbb/);
  assert.throws(() => rainbow("x", { steps: 40 }), /rainbow\.steps takes a whole number from 1 to 32, not 40/);
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

test("chain: effects one after another, the same as calling them in turn", () => {
  const a = chain("hi\nyo", (p) => glint(p, { first: 0 }), (p) => wave(p));
  const b = wave(glint("hi\nyo", { first: 0 }));
  for (const t of [0, 0.3, 1]) assert.equal(look(a, t).text, look(b, t).text);
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

test("an effect of a piece made with piece() keeps its colours by theme", () => {
  const duo = piece({ name: "duo", cols: 4, rows: 1, fps: 0, palette: { light: ["#111111", "#aa0000"], dark: ["#eeeeee", "#ff5555"] } }, (t, s) => {
    s.write(0, 0, "ab");
    s.set(2, 0, "c", 1);
  });
  for (const paper of [false, true]) same(look(scan(duo), 0, { paper }), look(duo, 0, { paper }), `paper ${paper}`);
  assert.deepEqual(look(shadow(duo), 0).hexes.slice(0, 3), ["#eeeeee", "#eeeeee", "#ff5555"]);
});
