// sprite: pixel art from rows of letters, two columns a pixel, frames played in turn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, BAD, GOOD, INK, QUIET, SOFT, VIOLET, WARN, fence, plain } from "./core.ts";
import { sprite } from "./sprite.ts";

const STILL = [
  "      ████████",
  "  ████████████████",
  "████▓▓▓▓████▓▓▓▓████",
  "████▓▓▓▓████▓▓▓▓████",
  "████████████████████",
  "████████████████████",
  "████    ████    ████",
].join("\n");

const ENTRY = entryOf("sprite");
const fenced = (text: string) => {
  const [info, ...body] = text.split("\n");
  return sprite(body.slice(0, -1).join("\n"), fence(info.slice(3)).options as never);
};

test("sprite: the catalog's example draws its still through plain() and a fence", () => {
  const p = sprite(ENTRY.source);
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(fenceOf(ENTRY))), STILL);
  // unframed by default, two columns a pixel
  assert.equal(p.meta.cols, 20);
  assert.equal(p.meta.rows, 7);
  assert.equal(p.says, "sprite, 10 by 7 pixels, 2 frames.");
  assert.equal(plain(p, { ascii: true }).split("\n")[2], "####################");
});

test("sprite: prints a row at a time, each a proof first, then plays its frames, seamless, at fps", () => {
  const p = sprite(ENTRY.source);
  const frame = p.default();
  const at = (t: number) => frame(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  const still = p.meta.still!;
  assert.ok(Math.abs(still - 0.36) < 1e-9, String(still));
  // early: the top row printed, the next two proofs, the rest not yet
  assert.equal(at(0.1), ["      ████████", "  ░░░░░░░░░░░░░░░░", "░░░░░░░░░░░░░░░░░░░░", "", "", "", ""].join("\n"));
  assert.equal(at(still), STILL);
  // its frames in turn, four a second: the second frame's legs, then the first again
  assert.equal(at(still + 0.3).split("\n")[6], "  ████    ████    ██");
  assert.equal(at(still + 0.5), STILL);
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 0.5, from: still, once: false });
  assert.match(svg(p), /infinite/);
  // the frame a cycle ends on is the still, colours too
  const { cols, rows } = p.meta;
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    return { text: frame(t, { paper: true, color }), color: [...color] };
  };
  assert.deepEqual(toned(still + 0.5), toned(still));
  assert.deepEqual(toned(still + 5), toned(still));
});

test("sprite: each letter its tone and its shade, and fps sets the pace", () => {
  const p = sprite("#abvgws");
  assert.equal(plain(p), "██▓▓▓▓▓▓▒▒▒▒░░");
  const color = new Uint8Array(p.meta.cols);
  p.default()(p.meta.still!, { paper: true, color });
  assert.deepEqual([...color].filter((_, i) => i % 2 === 0), [INK, ACCENT, BAD, VIOLET, GOOD, WARN, SOFT]);
  // a proof is quiet
  const proof = new Uint8Array(p.meta.cols);
  p.default()(0.03, { paper: true, color: proof });
  assert.equal(proof[0], QUIET);
  // fps
  const slow = sprite(ENTRY.source, { fps: 2 });
  assert.deepEqual(slow.motion, { seconds: 1, from: slow.meta.still, once: false });
  assert.equal(plain(fenced("```ascii sprite fps=8\n#.\n\n.#\n```")), "██");
  assert.deepEqual(fenced("```ascii sprite fps=8\n#.\n\n.#\n```").motion?.seconds, 0.25);
});

test("sprite: one frame holds; spaces and short rows are empty pixels; data works too", () => {
  const one = sprite(".#.\n###\n#.#");
  assert.equal(plain(one), ["  ██", "██████", "██  ██"].join("\n"));
  assert.equal(one.idle, false);
  assert.match(svg(one), /1 forwards/);
  assert.equal(one.says, "sprite, 3 by 3 pixels, 1 frame.");
  // a space is no pixel; a row's missing end is empty; the indent every row shares goes
  assert.equal(plain(sprite("    # #\n    ###\n    #")), ["██  ██", "██████", "██"].join("\n"));
  assert.equal(plain(sprite({ frames: [["#a#", "###"], ["#a#", "#.#"]] })), ["██▓▓██", "██████"].join("\n"));
  assert.equal(sprite({ frames: [["#a#", "###"], ["#a#", "#.#"]] }, { fps: 2 }).motion?.seconds, 1);
  // framed when asked
  assert.equal(plain(sprite("#", { frame: "rounded" })), ["╭────╮", "│ ██ │", "╰────╯"].join("\n"));
});

test("sprite: a tall sprite builds in under two seconds, and a wide one fits the room a figure can take", () => {
  const tall = sprite(Array.from({ length: 100 }, (_, i) => (i % 2 ? "#a#a" : "a#a#")).join("\n"));
  assert.ok(tall.meta.still! <= 1.6 + 1e-9);
  assert.equal(tall.meta.rows, 100);
  const wide = sprite("#".repeat(78));
  assert.equal(wide.meta.cols, 156);
  const frame = tall.default();
  for (let t = 0; t <= 2; t += 0.1) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, 100);
    assert.ok(lines.every((l) => l.length === 8));
  }
});

test("sprite: says what is wrong, the kit's way", () => {
  assert.throws(() => sprite(""), /ascii\.rest: sprite takes rows of pixel letters/);
  assert.throws(() => sprite("\n\n  \n"), /sprite takes rows of pixel letters/);
  assert.throws(() => sprite("..\n.."), /sprite's frames have no pixels to draw, only \. and spaces/);
  assert.throws(() => sprite("#x#"), /sprite's frame 1, row 1, has "x": a pixel is \. or a space for none, # ink, a accent/);
  assert.throws(() => sprite("##\n\n#A"), /sprite's frame 2, row 1, has "A"/);
  assert.throws(() => sprite("##\n##\n\n##"), /sprite's frame 2 has 1 row, and frame 1 has 2: every frame is the same size/);
  assert.throws(() => sprite("#█#"), /sprite's frame 1, row 1, has "█"/);
  assert.throws(() => sprite("#\u{1F47E}#"), /sprite takes characters every monospace face draws one cell wide/);
  assert.throws(() => sprite("#".repeat(79)), /sprite's rows are 79 pixels wide, 158 columns at two a pixel, and it has room for 78: draw it smaller/);
  assert.throws(() => sprite("#".repeat(20), { width: 30 }), /sprite's rows are 20 pixels wide, 40 columns at two a pixel, and it has room for 15: draw it smaller, or give it a width of more/);
  assert.throws(() => sprite(Array.from({ length: 121 }, () => "#").join("\n")), /sprite draws 121 rows, past the 120 a piece can have/);
  assert.throws(() => sprite("#", { fps: 0 }), /sprite's fps takes a number from 0\.5 to 30, not 0/);
  assert.throws(() => sprite("#", { fps: "fast" as never }), /sprite's fps takes a number from 0\.5 to 30, not "fast"/);
  assert.throws(() => sprite("#", { scale: 2 } as never), /sprite\(\) has no option "scale"/);
  assert.throws(() => sprite({ frames: [] }), /sprite's frames take one frame or more/);
  assert.throws(() => sprite({ frames: [[]] }), /sprite's frame 1 takes rows of pixel letters/);
  assert.throws(() => sprite(7 as never), /sprite\(\) takes a fence's body/);
});
