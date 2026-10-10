// node --test src/kit/recipes/motion.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { banner } from "../../banner.ts";
import { loopOf, svg } from "../../svg.ts";
import type { Piece } from "../../types.ts";
import { Surface, asPiece } from "../core.ts";
import { flip } from "../compose.ts";
import { cloud, heart, shape, sky, starfield } from "../materials.ts";
import { cube, sphere, torus } from "../shapes3d.ts";
import { blinking, bouncing, drifting, floating, growIn, orbiting, planet, pulsing, shaking, slideIn, slideOut, spinning, swaying } from "./motion.ts";
import { easeOf, secondsOf, speedOf } from "./checks.ts";
import { easings, loopFor, pieceOf, withLoop } from "./words.ts";

// A frame as text.
const at = (p: Piece, t: number, o: { paper?: boolean; mono?: boolean } = {}) => {
  const color = p.meta.palette && !o.mono ? new Uint8Array(p.meta.cols * p.meta.rows) : undefined;
  return p.default({ ...p.meta.options })(t, { paper: o.paper, color });
};
// Cells with ink in a frame.
const ink = (text: string) => text.replace(/[\s]/g, "").length;
// The rows of a frame.
const lines = (p: Piece, t: number) => at(p, t).split("\n");

// The checks scripts/check.ts makes: rows lines of cols characters, colours inside the palette, and the same frame for
// the same t, drawn fresh or after other frames.
function contract(p: Piece, times = [0, 0.3, 0.6, 1, 2.5, 4, 7]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      const seen = times.map((t) => {
        const text = frame(t, { paper, color });
        const rows = text.split("\n");
        assert.equal(rows.length, meta.rows, `${meta.name} t=${t}: rows`);
        for (const l of rows) assert.equal(l.length, meta.cols, `${meta.name} t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `${meta.name}: colour ${c} past the palette`);
        return text;
      });
      const again = p.default({ ...meta.options });
      for (let i = times.length - 1; i >= 0; i--) assert.equal(again(times[i], { paper, color }), seen[i], `${meta.name} t=${times[i]}: not the same frame twice`);
    }
}

const word = banner("ok", { effect: "still", color: "#eab308" });
const block = asPiece("#####\n#####\n#####");

test("every motion makes a normal piece that keeps the frame contract, in colour and mono, on paper and not", () => {
  const all: Piece[] = [
    spinning(torus()),
    spinning(word),
    spinning(cube({ color: "#38bdf8" }), { way: "turntable" }),
    orbiting(sphere({ radius: 0.3 }), { around: sphere({ color: "#3b82f6" }) }),
    orbiting("*", { around: word }),
    bouncing(word),
    floating(heart()),
    swaying(block),
    pulsing(heart(), { beat: "heart" }),
    blinking("● REC"),
    shaking(word),
    drifting("<o>"),
    drifting(cloud(), { across: shape(sky(), starfield()) }),
    growIn(word),
    slideIn(word),
    slideOut(word),
    planet({ moon: true, rings: true }),
    floating(spinning(torus(), { speed: "fast" })),
  ];
  for (const p of all) {
    contract(p);
    assert.ok(p.meta.fps > 0, `${p.meta.name} moves`);
    assert.ok(svg(p).startsWith("<svg"), `${p.meta.name}: svg() draws it`);
  }
});

test("speeds and periods are words or seconds, checked", () => {
  assert.equal(secondsOf("x", {}, 6), 6);
  assert.equal(secondsOf("x", { speed: "slow" }, 6), 12);
  assert.equal(secondsOf("x", { speed: "fast" }, 6), 3);
  assert.equal(secondsOf("x", { speed: 3 }, 6), 2);
  assert.equal(secondsOf("x", { speed: "fast", period: 5 }, 6), 5, "period wins over speed");
  assert.equal(speedOf("x", "slow"), 0.5);
  assert.throws(() => secondsOf("spinning()", { speed: "quick" as never }, 6), /spinning\(\)'s speed takes "slow", "normal" or "fast", or a number/);
  assert.throws(() => secondsOf("x", { speed: 0 }, 6), /speed takes/);
  assert.throws(() => secondsOf("x", { period: -1 }, 6), /period takes a number from 0.05 to 60/);
});

test("easings have plain names, each starting at 0 and ending at 1", () => {
  for (const name of [...Object.keys(easings), "outCubic"]) {
    const f = easeOf("x", name, "smooth");
    assert.equal(f(0), 0, name);
    assert.equal(f(1), 1, name);
  }
  assert.ok(easeOf("x", "snappy", "smooth")(0.6) > 1, "snappy overshoots");
  assert.throws(() => easeOf("slideIn's ease", "wobbly", "smooth"), /slideIn's ease takes "steady", "smooth", "snappy", "springy" or "bouncy"/);
});

test("pieceOf turns any thing into a piece: an area is cut to its size, a function is called out", () => {
  const h = pieceOf(heart());
  assert.ok(h.meta.cols < 64 && h.meta.rows < 24, "a heart is cut from its 64 by 24 room");
  assert.ok(ink(at(h, 0)) > 20);
  assert.equal(pieceOf("hi\nthere").meta.name, "hi");
  assert.equal(pieceOf(torus()).meta.category, "shapes");
  assert.throws(() => pieceOf(heart as never, "floating()"), /floating\(\) takes a thing to show, not heart, a function: call it, heart\(\)/);
  assert.throws(() => pieceOf(42 as never), /takes a piece, text, a grid, a 3D shape/);
});

test("loops follow the kit's time rule", () => {
  assert.equal(loopFor([2, 3]), 6);
  assert.equal(loopFor([2, asPiece("still")]), 2, "a still repeats on any period");
  assert.equal(loopFor([2, { meta: { ...word.meta, fps: 30, loop: undefined }, default: word.default }]), undefined, "a piece that moves with no loop never repeats");
  assert.equal(withLoop(asPiece("x"), 4).meta.loop, 4);
  assert.equal(withLoop(withLoop(asPiece("x"), 4), undefined).meta.loop, undefined);
});

test("spinning: a 3D shape tumbles, or turns as asked, once a period; a flat thing turns like a coin", () => {
  assert.equal(spinning(torus()).meta.loop, 12, "a tumble's second axis turns half as fast, so it loops in two turns");
  assert.equal(spinning(torus(), { way: "turntable" }).meta.loop, 6);
  assert.equal(spinning(torus(), { way: "wheel", speed: "fast" }).meta.loop, 3);
  assert.equal(spinning(torus(), { period: 4, way: "flip" }).meta.loop, 4);
  assert.equal(spinning(torus(), { cols: 30, rows: 12 }).meta.cols, 30);
  assert.notEqual(at(spinning(torus()), 0), at(spinning(torus()), 1));

  const coin = spinning(word);
  assert.equal(coin.meta.cols, word.meta.cols);
  assert.equal(coin.meta.rows, word.meta.rows);
  assert.equal(coin.meta.loop, 6);
  assert.equal(at(coin, 0), at(word, 0), "face on at the start");
  assert.equal(at(coin, 3), at(flip(word, "x"), 0), "its mirrored back half way round");
  assert.ok(ink(at(coin, 1.4)) < ink(at(coin, 0)) / 2, "narrow nearly edge on");
  // A flat thing wider than 160 columns spins too, up to the 320 a piece can be: its back was a mirrored copy laid beside
  // it, a piece twice as wide, which threw.
  for (const wide of [asPiece(`(${"=".repeat(198)}>`), asPiece(`[${"-".repeat(318)}/`)]) {
    const spun = spinning(wide);
    assert.deepEqual([spun.meta.cols, spun.meta.rows], [wide.meta.cols, 1]);
    assert.equal(at(spun, 0), at(wide, 0), "face on at the start");
    assert.equal(at(spun, 3), at(flip(wide, "x"), 0), "its mirrored back half way round");
    contract(spun);
  }
  assert.throws(() => spinning(word, { way: "wheel" }), /spinning's way "wheel" is for a 3D shape/);
  assert.throws(() => spinning(torus(), { way: "sideways" as never }), /spinning's way takes "tumble", "turntable", "wheel" or "flip"/);
  assert.throws(() => spinning(torus(), { spin: 1 } as never), /spinning\(\) has no option "spin"/);
});

test("orbiting: round what it is around, in front below and hidden behind above", () => {
  const o = orbiting("*", { around: "@@@\n@@@\n@@@", period: 4 });
  assert.equal(o.meta.loop, 4);
  assert.equal(o.meta.name, "* round @@@");
  const find = (t: number) => {
    const rows = lines(o, t);
    const y = rows.findIndex((r) => r.includes("*"));
    return y < 0 ? null : [rows[y].indexOf("*"), y];
  };
  const mid = [Math.floor(o.meta.cols / 2), Math.floor(o.meta.rows / 2)];
  const right = find(0)!, below = find(1)!, left = find(2)!;
  assert.ok(right[0] > mid[0] && Math.abs(right[1] - mid[1]) <= 1, "it starts on the right");
  assert.ok(below[1] > mid[1], "a quarter round it is below, in front");
  assert.ok(left[0] < mid[0], "half round it is on the left");
  assert.ok(find(3)![1] < mid[1], "three quarters round it is above");
  // round something taller than its circle, it passes behind it at the top, where the middle's cells cover it, and in
  // front of it at the bottom
  const tower = Array(15).fill("@".repeat(12)).join("\n");
  const behind = orbiting("*", { around: tower, radius: "close", period: 4 });
  assert.ok(lines(behind, 3).every((r) => !r.includes("*")), "behind the middle it is hidden");
  assert.ok(lines(behind, 1).some((r) => r.includes("*")), "in front of the middle it shows");
  // 3D round 3D is a scene, the moon's orbit the period
  const moon = orbiting(sphere({ radius: 0.3, color: "#d1d5db" }), { around: sphere({ color: "#3b82f6" }), speed: "slow" });
  assert.equal(moon.meta.loop, 12);
  assert.equal(moon.meta.category, "shapes");
  assert.throws(() => orbiting("*", { radius: "huge" as never }), /orbiting's radius takes "close", "medium" or "far", or a number/);
});

test("bouncing: on the ground at the start, its full height half way, a shadow narrowing as it rises", () => {
  const b = bouncing(block, { height: "low", period: 2 });
  assert.equal(b.meta.rows, block.meta.rows + 3 + 1, "room above for the bounce and a row for the shadow");
  assert.equal(b.meta.loop, 2);
  const ground = lines(b, 0), top = lines(b, 1);
  assert.equal(ground.findIndex((r) => r.includes("#")), 3, "resting on the ground");
  assert.equal(top.findIndex((r) => r.includes("#")), 0, "3 rows up at the top");
  const shadow = (rows: string[]) => (rows.at(-1)!.match(/▔/g) ?? []).length;
  assert.ok(shadow(top) < shadow(ground), "the shadow narrows as it rises");
  assert.equal(shadow(lines(bouncing(block, { shadow: false }), 0)), 0);
  assert.equal(bouncing(block).meta.loop, 1.2);
  assert.throws(() => bouncing(block, { height: 0 }), /bouncing's height takes "low", "medium" or "high", or a number from 1 to 100/);
});

test("floating rises and sinks; swaying leans from the end held still", () => {
  const f = floating(block, { height: "medium", period: 4 });
  const top = (rows: string[]) => rows.findIndex((r) => r.includes("#"));
  assert.equal(top(lines(f, 0)), 2);
  assert.equal(top(lines(f, 1)), 0, "a quarter round it is 2 rows up");
  assert.equal(top(lines(f, 3)), 4, "three quarters round it is 2 rows down");

  const tall = asPiece("#\n#\n#\n#\n#");
  const s = swaying(tall, { amount: "strong", period: 4 });
  const col = (rows: string[], y: number) => rows[y].indexOf("#");
  const still = lines(s, 0), leaning = lines(s, 1);
  assert.equal(col(leaning, 4), col(still, 4), "the bottom stays put");
  assert.equal(col(leaning, 0) - col(still, 0), 4, "the top leans the whole amount");
  const hung = lines(swaying(tall, { amount: "strong", period: 4, from: "top" }), 1);
  assert.equal(col(hung, 0), col(still, 0), "hung from the top, the top stays put");
});

test("pulsing swells about its middle; blinking goes off; shaking jolts", () => {
  const p = pulsing(block, { amount: "strong", period: 2 });
  assert.ok(ink(at(p, 1)) > ink(at(p, 0)), "breathing in, it is bigger half way");
  const beat = pulsing(heart(), { beat: "heart" });
  assert.equal(beat.meta.loop, 1.2);
  assert.ok(ink(at(beat, 0.144)) > ink(at(beat, 0.7)), "bigger on the beat than in the rest");

  const b = blinking("● REC", { period: 2 });
  assert.equal(at(b, 0), "● REC");
  assert.equal(at(b, 1.5).trim(), "", "off in the second half");
  assert.equal(at(b, 1.25), "· ···", "a ghost of itself as it goes out");
  assert.throws(() => blinking("x", { on: 1 }), /blinking's on takes a number from 0.05 to 0.9/);

  const s = shaking(block, { amount: "medium" });
  assert.equal(s.meta.cols, block.meta.cols + 4);
  const all = new Set([0.55, 0.6, 0.65, 0.7, 0.75].map((t) => at(s, t)));
  assert.ok(all.size > 1, "it jolts about during a shake");
  const nonstop = shaking(block, { nonstop: true });
  assert.ok(new Set([3, 3.05, 3.1, 3.15, 3.2].map((t) => at(nonstop, t))).size > 1, "nonstop shakes all the time");
  assert.equal(new Set([1, 1.05, 1.1, 1.15, 1.2].map((t) => at(s, t))).size, 1, "now and then, it is still between shakes");
});

test("drifting crosses its stage and comes round again; across sets the stage", () => {
  const d = drifting("<o>", { period: 4, cols: 20 });
  assert.equal(d.meta.cols, 20);
  assert.equal(d.meta.loop, 4);
  const x = (t: number) => at(d, t).indexOf("<o>");
  assert.equal(x(0), 0, "it starts at the left edge going right");
  assert.ok(x(1) > x(0), "it moves right");
  assert.equal(at(d, 4), at(d, 0), "a crossing is a loop");
  const up = drifting("o", { to: "up", period: 4 });
  assert.equal(at(up, 0).split("\n").findIndex((r) => r.includes("o")), up.meta.rows - 1, "going up it starts at the bottom");
  const sky = drifting("<o>", { across: asPiece(".".repeat(30)) });
  assert.equal(sky.meta.cols, 30);
  assert.throws(() => drifting("x", { to: "north" as never }), /drifting's to takes "right", "left", "up" or "down"/);
  assert.throws(() => drifting("x", { lane: "left" }), /drifting's lane takes "top", "middle" or "bottom"/);
});

test("growIn, slideIn and slideOut come and go on time, and loop on their hold", () => {
  const g = growIn(block, { seconds: 1, hold: 2 });
  assert.equal(g.meta.loop, 3);
  assert.equal(ink(at(g, 0)), 0, "nothing at the start");
  assert.equal(ink(at(g, 1.5)), ink(at(block, 0)), "its own size once grown");
  assert.equal(growIn(block, { hold: "forever" }).meta.loop, undefined);

  const s = slideIn(block, { seconds: 1, hold: 1, from: "left", ease: "smooth" });
  assert.equal(ink(at(s, 0)), 0, "off the left edge at the start");
  assert.equal(at(s, 1.5), at(block, 0), "in place after a second");
  assert.ok(at(s, 0.5).split("\n")[0].startsWith("#") && ink(at(s, 0.5)) < ink(at(block, 0)), "half way, coming in from the left");

  const o = slideOut(block, { seconds: 1, hold: 1, to: "bottom" });
  assert.equal(o.meta.loop, 2.5);
  assert.equal(at(o, 0.5), at(block, 0), "in place while held");
  assert.equal(ink(at(o, 2.2)), 0, "gone after sliding out");
  assert.throws(() => slideOut(block, { hold: "forever" }), /slideOut's hold takes seconds/);
  assert.throws(() => slideIn(block, { seconds: 1, period: 1 }), /takes seconds or period, which are the same, not both/);
});

test("planet: a world in one call, with a moon and rings in colour", () => {
  const plain = planet(), full = planet({ type: "earth", moon: true, rings: true });
  assert.equal(plain.meta.loop, 8);
  assert.equal(planet({ speed: "slow" }).meta.loop, 16);
  assert.ok(full.meta.palette!.length > plain.meta.palette!.length, "a moon and a ring add colours");
  assert.ok(planet({ moon: true }).meta.palette!.length > plain.meta.palette!.length, "a moon adds its grey");
  assert.notEqual(at(full, 0), at(plain, 0));
  assert.throws(() => planet({ type: "pluto" as never }), /planet's type takes "gas", "earth", "mars" or "ice"/);
  assert.throws(() => planet({ moons: 2 } as never), /planet\(\) has no option "moons"/);
});

test("names and notes: the thing's own, or the ones given", () => {
  assert.equal(bouncing(word).meta.name, "ok");
  assert.equal(bouncing(word).meta.note, "ok, bouncing");
  assert.equal(bouncing(word, { name: "hop", note: "a hop" }).meta.name, "hop");
  assert.equal(drifting("<o>", { name: "ship" }).meta.name, "ship");
  assert.equal(loopOf(bouncing(word)).every, 1.2, "svg() plays the motion's loop");
  assert.equal(loopOf(orbiting("*", { around: word, period: 5 })).every, 5);
});

test("motions take Surfaces and text, and a still thing in a motion still loops on the motion", () => {
  const grid = new Surface(4, 2);
  grid.fill("x");
  assert.equal(floating(grid).meta.loop, 3);
  assert.equal(floating("hello").meta.loop, 3);
});
