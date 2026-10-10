// node --test src/kit/recipes/looks.test.ts
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { banner } from "../../banner.ts";
import { svg } from "../../svg.ts";
import { still } from "../../terminal.ts";
import type { Piece } from "../../types.ts";
import { snapshot } from "../core.ts";
import { area, ball, heart } from "../materials.ts";
import * as looks from "./looks.ts";
import {
  Look,
  above,
  aurora,
  below,
  checker,
  clouds,
  flames,
  galaxy,
  lavaLamp,
  letters,
  look,
  marble,
  matrix,
  outside,
  plasma,
  plume,
  rainfall,
  rings,
  ripple,
  sea,
  snowfall,
  spiral,
  stars,
  stripes,
  sun,
  sweep,
  tunnel,
  turbulence,
  vortex,
  waves,
} from "./looks.ts";

// Wall-clock budgets, as on an idle machine when KIT_PERF=1 (npm run test:perf); ten times as long otherwise, so a
// busy CI runner running the files side by side fails only on a slowdown of a different order.
const slack = process.env.KIT_PERF ? 1 : 10;

// Every look by name, each made with no options, and its loop at normal speed.
const all: Record<string, [() => Look, number]> = {
  waves: [waves, 4], sea: [sea, 8], plasma: [plasma, 8], aurora: [aurora, 8], flames: [flames, 4], clouds: [clouds, 16],
  plume: [plume, 8], ripple: [ripple, 4], rings: [rings, 4], tunnel: [tunnel, 2], spiral: [spiral, 8], vortex: [vortex, 16],
  stripes: [stripes, 2], checker: [checker, 2], sweep: [sweep, 8], turbulence: [turbulence, 8], marble: [marble, 16],
  lavaLamp: [lavaLamp, 16], stars: [stars, 4], rainfall: [rainfall, 4], snowfall: [snowfall, 16], matrix: [matrix, 8],
  galaxy: [galaxy, 16], sun: [sun, 8],
};

// The checks scripts/check.ts makes of a frame, on both pages, in colour and in one ink.
function contract(p: Piece, times = [0, 0.5, 1, 2.5]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      for (const t of times) {
        const lines = frame(t, { paper, color }).split("\n");
        assert.equal(lines.length, meta.rows, `${meta.name} t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `${meta.name} t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `${meta.name}: colour ${c} past the palette`);
      }
    }
}

const text = (p: Piece, t: number, paper = false) => snapshot(p, t, { paper }).text;
const ink = (s: string) => s.replace(/[\s]/g, "").length;

test("every look is a normal piece: 64 by 24, 24 fps, its loop, and frames that keep the contract", () => {
  for (const [name, [make, loop]] of Object.entries(all)) {
    const p = make();
    assert.ok(p instanceof Look, name);
    assert.equal(p.meta.cols, 64, name);
    assert.equal(p.meta.rows, 24, name);
    assert.equal(p.meta.fps, 24, name);
    assert.equal(p.meta.loop, loop, name);
    assert.equal(p.meta.category, "generative", name);
    assert.ok(p.meta.palette && p.meta.palette.length >= 2, name);
    contract(p);
  }
});

test("every look draws something, on a dark page and on paper", () => {
  for (const [name, [make]] of Object.entries(all)) {
    const p = make();
    for (const t of [0, 1.25]) {
      assert.ok(ink(text(p, t)) > 20, `${name} t=${t} dark: ${ink(text(p, t))} cells`);
      assert.ok(ink(text(p, t, true)) > 20, `${name} t=${t} paper`);
    }
  }
});

test("the same t gives the same frame, in any order and from a fresh player", () => {
  for (const [name, [make]] of Object.entries(all)) {
    const p = make();
    const a = p.default({}), b = p.default({});
    const at = [3.5, 0.25, 1.75];
    const first = at.map((t) => a(t, {}));
    const again = [...at].reverse().map((t) => b(t, {})).reverse();
    assert.deepEqual(first, again, name);
    // And in colour: the same colours each time.
    const c1 = new Uint8Array(64 * 24), c2 = new Uint8Array(64 * 24);
    a(2.25, { color: c1 });
    b(2.25, { color: c2 });
    assert.deepEqual(c1, c2, name);
  }
});

test("every look loops exactly: the frame at t and at t plus its loop are the same, and it moves within the loop", () => {
  for (const [name, [make, loop]] of Object.entries(all)) {
    const p = make();
    for (const t of [0.25, 1.5]) assert.equal(text(p, t + loop), text(p, t), `${name} at ${t}`);
    // Eighths of the loop: some looks go round twice in one (two rings out of a ripple a loop).
    const frames = new Set([0, 0.125, 0.25, 0.375].map((k) => text(p, k * loop)));
    assert.ok(frames.size >= 3, `${name}: ${frames.size} distinct frames in its loop`);
  }
});

test("a frame takes under 4 ms at 64 by 24", () => {
  for (const [name, [make]] of Object.entries(all)) {
    const f = make().default({});
    for (let i = 0; i < 5; i++) f(i * 0.1, {});
    const n = 30, start = performance.now();
    for (let i = 0; i < n; i++) f(i * 0.37, { color: new Uint8Array(64 * 24) });
    const ms = (performance.now() - start) / n;
    assert.ok(ms < 4 * slack, `${name}: ${ms.toFixed(2)} ms a frame`);
  }
});

test("speed words: slow doubles the loop, fast halves it, still is a still", () => {
  assert.equal(plasma({ speed: "slow" }).meta.loop, 16);
  assert.equal(plasma({ speed: "fast" }).meta.loop, 4);
  assert.equal(plasma({ speed: 0.5 }).meta.loop, 16);
  const s = plasma({ speed: "still" });
  assert.equal(s.meta.fps, 0);
  assert.equal(s.meta.loop, undefined);
  assert.equal(text(s, 0), text(s, 3.7));
  // A noise look holds still too.
  const c = clouds({ speed: "still" });
  assert.equal(text(c, 0), text(c, 5));
});

test("a numeric speed gives a loop in whole hundredths, so a look combines with others and keeps its loop", async () => {
  const { banner } = await import("../../banner.ts");
  const { floating, bouncing } = await import("./motion.ts");
  const { over } = await import("../compose.ts");
  for (const speed of [0.7, 0.3, 0.8, 1.5, 3]) {
    const p = plasma({ speed });
    const loop = p.meta.loop!;
    assert.equal(Math.round(loop * 100), loop * 100, `speed ${speed}: ${loop}`);
    assert.equal(text(p, 0.4), text(p, 0.4 + loop), `speed ${speed} comes round on its loop`);
    assert.equal(p.behind(banner("hi", { effect: "still" })).meta.loop, loop, `speed ${speed}: behind a banner`);
  }
  // 8 / 0.8 is 10.000000000000002 to a computer: kept as 10, it meets a float's 3 and a bounce's 1.5 within a minute
  assert.equal(plasma({ speed: 0.8 }).meta.loop, 10);
  assert.equal(floating(plasma({ speed: 0.8 })).meta.loop, 30);
  assert.equal(over(bouncing("o", { speed: 0.8 }), plasma({ speed: 0.8 })).meta.loop, 30);
  assert.equal(checker({ speed: "still" }).move("left", 0.7).meta.loop, 11.43);
  assert.equal(checker({ speed: "still" }).rotate(0.7).meta.loop, 11.43);
  // slower than a minute a loop is refused, as svg() could not play it whole
  assert.throws(() => marble({ speed: 0.25 }), /marble\(\)'s speed is too slow to loop within a minute: use 0\.267 or more, or "still"/);
  assert.throws(() => plasma({ speed: 0.1 }), /plasma\(\)'s speed is too slow to loop within a minute/);
  assert.equal(marble({ speed: "slow" }).meta.loop, 32);
});

test("a large scale travels at least a feature a loop, so noise looks take every scale they offer", () => {
  for (const make of [() => clouds({ scale: 3 }), () => clouds({ scale: 4 }), () => clouds({ scale: 10 }), () => flames({ scale: 10 }), () => plume({ scale: 10 }), () => clouds({ scale: 4, period: 60 })]) {
    const p = make();
    contract(p);
    assert.equal(text(p, 0.5), text(p, 0.5 + p.meta.loop!));
  }
});

test("a mask follows a rotate, zoom or move chained after it, as a function mask does", () => {
  const board = checker({ cols: 16, rows: 6, speed: "still", ramp: "#@" });
  const bottom = text(board.mask(below(0.5)), 0).split("\n");
  assert.ok(bottom.slice(0, 3).every((l) => !l.trim()) && bottom.slice(3).every((l) => l.trim().length === 16), "the bottom half");
  // turned a quarter, the bottom half is a side: a vertical band, the top rows no longer empty
  const turned = text(board.mask(below(0.5)).rotate("quarter"), 0).split("\n");
  assert.ok(turned.slice(0, 3).some((l) => l.trim()), turned.join("\n"));
  assert.ok(turned.every((l) => l.includes(" ")), "and every row half empty");
  assert.deepEqual(turned, text(board.mask((_x, y) => y > 0).rotate("quarter"), 0).split("\n"), "as a function mask turns");
  // zoomed in, a heart in the middle is bigger
  assert.ok(ink(text(plasma().mask(heart()).zoom("in"), 1)) > ink(text(plasma().mask(heart()), 1)));
});

test("a word or a shape as a mask is filled, every cell inside drawn, so it reads with no ramp of your own", () => {
  const word = text(plasma({ palette: "fire" }).mask("HOT"), 1);
  const filled = text(plasma({ palette: "fire" }).mask((x, y, t, at) => letters("HOT").test(x, y, t, at)), 1);
  assert.ok(ink(word) > ink(filled), `${ink(word)} cells against ${ink(filled)}`);
  // every cell of the letters is drawn: the same cells as the letters in a solid look
  const solid = text(plasma({ ramp: "@@" }).mask("HOT"), 1);
  assert.equal(ink(word), ink(solid));
  // a share of the picture is not a shape to fill: dark parts of a sea stay dark
  assert.equal(text(waves().mask(below(0.5)), 1).split("\n").slice(12).join("").includes(" "), true);
});

test("sea's horizon is half way down by default, so above(\"half\") is its sky, and above(\"third\") a high one's", () => {
  const sky = (p: Look) => text(p, 1).split("\n").findIndex((l) => l.trim().length > 0);
  assert.equal(sky(sea()), 12, "a 24-row sea starts at its middle row");
  assert.equal(sky(sea({ horizon: "high" })), 8);
  assert.equal(sky(sea({ horizon: "low" })), 16);
  // stars in the sky over it, none in the water
  const both = sea().add(stars({ density: "dense" }).mask(above("half")));
  const rows = text(both, 1).split("\n");
  const water = text(sea(), 1).split("\n");
  for (let r = 12; r < 24; r++) assert.equal(rows[r], water[r], `row ${r} is the sea's own`);
  assert.ok(rows.slice(0, 12).some((l) => l.trim()), "stars above");
});

test("blur works out each sample once a frame: blurs chained cost about one look each", () => {
  const time = (p: Look) => {
    const f = p.default({});
    f(0, {});
    const start = performance.now();
    for (let i = 1; i <= 10; i++) f(i * 0.1, {});
    return (performance.now() - start) / 10;
  };
  const once = time(marble()), thrice = time(marble().blur().blur().blur());
  assert.ok(thrice < once * 12 + 1, `three blurs ${thrice.toFixed(2)} ms a frame, the look alone ${once.toFixed(2)} ms`);
  assert.ok(time(plasma({ cols: 160, rows: 60 }).blur().blur()) < 40 * slack);
  // a blur still softens, and loops
  const b = checker().blur("strong");
  assert.equal(text(b, 0.3), text(b, 0.3 + b.meta.loop!));
});

test("period sets a look's loop in seconds, over speed, as it does every recipe's", () => {
  assert.equal(plasma({ period: 4 }).meta.loop, 4);
  assert.equal(plasma({ period: 4, speed: "slow" }).meta.loop, 4);
  assert.equal(plasma({ speed: "slow" }).meta.loop, 16);
  const p = plasma({ period: 4 });
  assert.equal(text(p, 0.5), text(p, 4.5));
});

test("scale, palette, ramp, size and name are options every look takes", () => {
  const big = rings({ scale: "large" }), small = rings({ scale: "small" });
  assert.notEqual(text(big, 1), text(small, 1));
  const p = plasma({ palette: "ocean", ramp: "blocks", cols: 30, rows: 8, name: "pool", note: "a pool" });
  assert.equal(p.meta.cols, 30);
  assert.equal(p.meta.rows, 8);
  assert.equal(p.meta.name, "pool");
  assert.equal(p.meta.note, "a pool");
  assert.ok(/^[ ░▒▓█\n]+$/.test(text(p, 1)));
  assert.ok(p.meta.palette!.includes("#e0fbfc"));
  // One colour of your own, or a list.
  assert.equal(new Set(plasma({ palette: "#ff8800" }).meta.palette).size, 1);
  assert.ok(plasma({ palette: ["#000000", "#ffffff"] }).meta.palette!.includes("#ffffff"));
});

test("options are checked when the look is made, saying what to change", () => {
  assert.throws(() => sea({ colour: "ocean" } as never), /sea\(\) has no option "colour" \(did you mean "palette"\?\): it takes palette, speed, period/);
  assert.throws(() => sea({ size: "large" } as never), /sea\(\) has no option "size" \(did you mean "scale"\?\)/);
  assert.throws(() => waves({ direction: "left" } as never), /waves\(\) has no option "direction" \(did you mean "to"\?\)/);
  assert.throws(() => plasma({ speed: "quick" as never }), /plasma\(\)'s speed takes "still", "slow", "normal" or "fast", or a number from 0 to 100, not "quick" \(did you mean "fast"\?\)/);
  assert.throws(() => plasma({ period: 0 }), /plasma\(\)'s period takes a number from 0.05 to 60, not 0/);
  assert.throws(() => plasma({ scale: 0 }), /scale takes a number above 0/);
  assert.throws(() => plasma({ palette: "oceanic" }), /plasma\(\)'s palette takes a palette's name/);
  assert.throws(() => plasma({ ramp: "x" }), /a ramp takes a name/);
  assert.throws(() => plasma({ cols: 0 }), /cols as a whole number from 1 to 320/);
  assert.throws(() => plasma({ rows: 1.5 }), /rows as a whole number from 1 to 120/);
  assert.throws(() => plasma({ dither: "yes" as never }), /dither takes true or false/);
  assert.throws(() => plasma({ note: "x".repeat(80) }), /note takes one line of 1 to 72/);
  assert.throws(() => waves({ to: "up" as never }), /waves\(\)'s to takes "left" or "right"/);
  assert.throws(() => sea({ horizon: "top" as never }), /horizon takes "high", "middle" or "low"/);
  assert.throws(() => ripple({ drops: 0 }), /drops takes a whole number from 1 to 8/);
  assert.throws(() => spiral({ arms: 1.5 }), /arms takes a whole number from 1 to 12/);
  assert.throws(() => lavaLamp({ blobs: 40 }), /blobs takes a whole number from 1 to 16/);
  assert.throws(() => stars({ density: "lots" as never }), /density takes "sparse", "normal" or "dense"/);
  assert.throws(() => stars({ seed: 1.5 }), /seed takes a whole number/);
  assert.throws(() => rainfall({ wind: "up" as never }), /wind takes "none", "left" or "right"/);
  assert.throws(() => turbulence({ kind: "soft" as never }), /kind takes "smooth", "ridged" or "cells"/);
  assert.throws(() => sun({ rays: -1 }), /rays takes a whole number from 0 to 48/);
  assert.throws(() => galaxy({ arms: 9 }), /arms takes a whole number from 1 to 8/);
  assert.throws(() => plasma({ speed: 0.001 }), /too slow to loop/);
});

// Each cell's position on the ramp, for a look drawn in the ramp "0123456789".
const digits = (p: Piece, t = 1) => [...text(p, t).replace(/\n/g, "")];

test("invert() turns each value round: 9 - d on a ramp of digits", () => {
  const base = turbulence({ speed: "still", ramp: "0123456789" });
  const a = digits(base), b = digits(base.invert());
  for (let i = 0; i < a.length; i++) assert.equal(Number(a[i]) + Number(b[i]), 9, `cell ${i}: ${a[i]} and ${b[i]}`);
});

test("threshold() leaves only the ends of the ramp, posterize() only as many steps as it is given", () => {
  const base = turbulence({ ramp: "0123456789" });
  assert.deepEqual([...new Set(digits(base.threshold()))].sort(), ["0", "9"]);
  assert.ok(new Set(digits(base)).size > 5);
  assert.ok(new Set(digits(base.posterize(3))).size <= 3);
  assert.deepEqual([...new Set(digits(base.posterize(2)))].sort(), ["0", "9"]);
  assert.throws(() => base.posterize(1), /posterize\(\) takes a whole number of levels from 2 to 16, not 1/);
  assert.throws(() => base.threshold(2), /threshold\(\) takes "low", "half" or "high", or a number from 0 to 1, not 2/);
});

test("mix(), add() and multiply(): nothing of the other at 0, and the loop of both", () => {
  const a = rings(), b = plasma();
  assert.equal(text(a.mix(b, 0), 1), text(a, 1));
  assert.equal(text(a.add(b, 0), 1), text(a, 1));
  assert.equal(a.mix(b).meta.loop, 8);
  assert.notEqual(text(a.mix(b), 1), text(a, 1));
  assert.equal(a.multiply(b).meta.loop, 8);
  // Multiplying can only darken: never more ink than the brighter of the two on a ramp of digits.
  const ra = rings({ ramp: "0123456789" }), rb = plasma({ ramp: "0123456789" });
  const x = digits(ra), y = digits(rb), z = digits(ra.multiply(rb));
  for (let i = 0; i < z.length; i++) assert.ok(Number(z[i]) <= Math.min(Number(x[i]), Number(y[i])) + 1, `cell ${i}`);
  assert.throws(() => a.mix(banner("hi") as never), /mix\(\) takes another look, such as waves\(\) or clouds\(\)/);
  assert.throws(() => a.add(plasma as never, 1),/plasma, a function: call it, plasma\(\)/);
  assert.throws(() => a.mix(b, 2), /mix\(\)'s amount takes "a little", "half" or "mostly", or a number from 0 to 1/);
});

test("a look added to another keeps its own glyphs: stars stay stars, rain stays rain", () => {
  const sky = aurora().add(stars({ density: "dense" }));
  const lone = stars({ density: "dense" });
  // Every cell where a lone star shows a star glyph shows one of the star glyphs in the sum too.
  const a = text(lone, 1), b = text(sky, 1);
  let shared = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== " " && a[i] !== "\n") (shared++, assert.ok(".·+*✦".includes(b[i]), `cell ${i}: ${b[i]}`));
  assert.ok(shared > 20);
  assert.ok(/[|\\/]/.test(text(clouds().add(rainfall()), 1)));
});

test("mask(): below and above keep a share of the picture, and nothing is drawn outside", () => {
  const rows = text(plasma({ ramp: ".:-=+*#%@" }).mask(below(0.5)), 1).split("\n");
  for (let r = 0; r < 12; r++) assert.equal(rows[r].trim(), "", `row ${r}`);
  for (let r = 12; r < 24; r++) assert.equal(rows[r].length - rows[r].replace(/[^ ]/g, "").length, 64, `row ${r}`);
  const top = text(plasma({ ramp: ".:-=+*#%@" }).mask(above("third")), 1).split("\n");
  assert.ok(top.slice(0, 8).every((l) => !l.includes(" ")));
  assert.ok(top.slice(8).every((l) => l.trim() === ""));
  assert.throws(() => below(2), /below\(\) takes "third" or "half", or a number from 0 to 1, not 2/);
});

test("mask(): a material's shape, its outside, a word, a piece and a function", () => {
  const full = plasma({ ramp: ".:-=+*#%@" });
  const placed = ball().place(64, 24);
  const inBall = text(full.mask(ball()), 1).split("\n");
  const outBall = text(full.mask(outside(ball())), 1).split("\n");
  for (let r = 0; r < 24; r++)
    for (let c = 0; c < 64; c++) {
      const inside = placed.test(c + 0.5, r + 0.5);
      assert.equal(inBall[r][c] !== " ", inside, `ball ${c},${r}`);
      assert.equal(outBall[r][c] !== " ", !inside, `outside ${c},${r}`);
    }
  // A word: drawn in big letters, the look filling them.
  const word = text(full.mask("HI"), 1);
  assert.equal(word, text(full.mask(letters("HI")), 1));
  assert.ok(ink(word) > 60 && ink(word) < 64 * 24 / 2);
  assert.equal(text(full.mask(letters("HI", { big: 1 })), 1).split("\n").filter((l) => l.trim()).length, 5);
  // A heart from materials.
  assert.ok(ink(text(full.mask(heart({ size: "large" })), 1)) > 100);
  // A piece: its inked cells, centred.
  const logo = banner("ok", { effect: "still", shadow: "none" });
  const cut = text(full.mask(logo), 1);
  assert.equal(ink(cut), ink(text(logo, 0)));
  // A function of x and y: the right half.
  const half = text(full.mask((x) => x > 0), 1).split("\n");
  assert.ok(half.every((l) => l.slice(0, 32).trim() === "" && !l.slice(32).includes(" ")));
  assert.throws(() => full.mask(42 as never), /mask\(\) takes a shape: below\(0.4\), above\(0.3\), a word/);
  assert.throws(() => letters(""), /letters\(\) takes a word/);
  assert.throws(() => letters("HI", { big: 9 }), /big takes a whole number from 1 to 8/);
});

test("a mask from a moving piece moves with it, and the look loops with both", () => {
  const twinkling = stars({ cols: 30, rows: 10, density: "dense" });
  const m = plasma().mask(twinkling);
  assert.equal(m.meta.loop, 8);
  assert.notEqual(text(m, 0.5), text(m, 1.5));
  contract(m);
});

test("move(), zoom(), rotate(), warp() and blur() change the frame and keep it looping", () => {
  const base = turbulence();
  const moved = base.move("left");
  assert.equal(moved.meta.loop, 8);
  assert.equal(text(moved, 0.25), text(moved, 8.25));
  assert.notEqual(text(moved, 1), text(base, 1));
  // move() comes round without a jump: the frame just before the loop's end is close to the start.
  const end = text(moved, 8 - 1 / 24), start = text(moved, 0);
  let same = 0;
  for (let i = 0; i < start.length; i++) if (start[i] === end[i]) same++;
  assert.ok(same / start.length > 0.6, `${same} of ${start.length} cells the same across the loop's end`);
  assert.equal(text(rings().zoom(1), 1), text(rings(), 1));
  assert.notEqual(text(rings().zoom("in"), 1), text(rings(), 1));
  // A half turn of rings, which are the same all the way round, changes almost nothing.
  const r0 = text(rings(), 1), r1 = text(rings().rotate("half"), 1);
  let diff = 0;
  for (let i = 0; i < r0.length; i++) if (r0[i] !== r1[i]) diff++;
  assert.ok(diff < r0.length * 0.03, `${diff} cells differ`);
  assert.equal(stripes().rotate("slow").meta.loop, 16);
  assert.equal(stripes().rotate("fast").meta.loop, 4);
  assert.equal(stripes().rotate(-1).meta.loop, 8);
  assert.equal(text(stripes().rotate("fast"), 0.5), text(stripes().rotate("fast"), 4.5));
  assert.equal(base.warp().meta.loop, 8);
  assert.notEqual(text(base.warp(), 1), text(base, 1));
  // A blur makes in-between steps a checkerboard never has.
  const chars = (s: string) => new Set(s.replace(/\n/g, ""));
  assert.ok(chars(text(checker(), 1)).size <= 3);
  assert.ok(chars(text(checker().blur(), 1)).size > chars(text(checker(), 1)).size);
  for (const p of [moved, rings().zoom("in"), stripes().rotate("quarter"), base.warp(), checker().blur()]) contract(p);
  assert.throws(() => base.move("sideways" as never), /move\(\) takes "left", "right", "up", "down"/);
  assert.throws(() => base.zoom(0), /zoom\(\) takes "in" or "out", or a number from 0.05 to 20, not 0/);
  assert.throws(() => base.rotate("lots" as never), /rotate\(\) takes "slow", "normal" or "fast"/);
  assert.throws(() => base.warp("huge" as never), /warp\(\) takes "subtle", "medium" or "strong"/);
});

test("chaining never changes the look it starts from", () => {
  const base = plasma();
  const before = text(base, 1);
  base.mask(ball()).invert().zoom("in").palette("ocean").ramp("blocks").size(20, 6).named("other");
  assert.equal(text(base, 1), before);
  assert.equal(base.meta.cols, 64);
  const sized = base.size(20, 6).named("small plasma", "a small plasma");
  assert.equal(sized.meta.cols, 20);
  assert.equal(sized.meta.rows, 6);
  assert.equal(sized.meta.name, "small plasma");
  assert.ok(base.palette("ocean").meta.palette!.includes("#e0fbfc"));
  assert.throws(() => base.named(""), /named\(\) takes a name/);
});

test("over() and behind() lay a look and a piece together, in the bottom one's size", () => {
  const sign = banner("hi", { effect: "still" });
  const backed = stars().behind(sign);
  assert.equal(backed.meta.cols, 64);
  assert.equal(backed.meta.rows, 24);
  contract(backed);
  const laid = stars({ cols: 20, rows: 6 }).over(plasma());
  assert.equal(laid.meta.cols, 64);
  contract(laid);
});

test("a look plays wherever a piece does: svg() for a README and a still for a terminal", async () => {
  const p = waves({ cols: 24, rows: 6 });
  const out = svg(p);
  assert.ok(out.startsWith("<svg") && out.includes("</svg>"));
  assert.equal(await still(p), snapshot(p, 0, { mono: true }).text);
});

test("look(): a look of your own, made the way these are, with the options worked out for it", () => {
  const embers = (o?: looks.LookOptions & { glow?: number }) =>
    look("embers", o, { palette: "fire", period: 4, options: ["glow"] }, (k, opts) => {
      const n = k.noise({ size: [0.3, 0.3], travel: [0, -3] });
      return (x, y, t) => n(x, y, t) * (opts.glow ?? 1);
    });
  const p = embers({ speed: "slow", glow: 0.8 });
  assert.ok(p instanceof Look);
  assert.equal(p.meta.loop, 8);
  assert.equal(p.meta.name, "embers");
  assert.equal(text(p, 0.5), text(p, 8.5));
  contract(p);
  assert.ok(ink(text(p.mask(below(0.5)), 1)) > 0);
  assert.throws(() => embers({ glo: 1 } as never), /embers\(\) has no option "glo"/);
  assert.throws(() => look("", undefined, {}, () => () => 0), /look\(\) takes a name first/);
  assert.throws(() => look("x", undefined, {}, (() => 5) as never), /x\(\)'s body returns what each cell is/);
  assert.throws(() => look("x", undefined, { period: 0 }, () => () => 0), /period takes seconds above 0, up to 60/);
  // The kit's helpers: a still look's noise holds still, and column() and row() find the cell.
  const frozen = look("frozen", { speed: "still" }, {}, (k) => {
    const n = k.noise({ size: [0.5, 0.5], travel: [1, 0] });
    return (x, y, t) => n(x, y, t);
  });
  assert.equal(text(frozen, 0), text(frozen, 3));
  const diagonal = look("diagonal", { cols: 10, rows: 10 }, {}, (k) => (x, y, t, at) => (Math.floor(k.column(x, at)) === Math.floor(k.row(y, at)) ? 1 : 0));
  assert.deepEqual(text(diagonal, 0).split("\n").map((l) => l.indexOf("@")), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

// The example files, examples/kit/recipe-looks-*.ts.
const dir = join(import.meta.dirname, "../../../examples/kit");
const files = readdirSync(dir).filter((f) => f.startsWith("recipe-looks-") && f.endsWith(".ts"));

test("there are ten or more examples, each a normal piece", async () => {
  assert.ok(files.length >= 10, `${files.length} examples`);
  for (const f of files) {
    const p = ((await import(join(dir, f))) as { default: Piece }).default;
    contract(p);
    assert.ok(ink(text(p, 1)) > 20, f);
  }
});

test("every example is 1 to 3 lines with no arithmetic: no operators and no Math outside its strings", () => {
  for (const f of files) {
    const code = readFileSync(join(dir, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^import .*$/gm, "")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    const lines = code.split("\n").filter((l) => l.trim());
    assert.ok(lines.length >= 1 && lines.length <= 3, `${f}: ${lines.length} lines`);
    assert.ok(!/[-+*/%]|Math\.|\bTAU\b/.test(code), `${f}: ${code.trim()}`);
  }
});
