// node --test src/kit/shapes3d.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { still } from "../terminal.ts";
import type { Piece } from "../types.ts";
import { Surface, TAU, piece, snapshot } from "./core.ts";
import { cone, cube, cylinder, group, lines, mesh, orbit, parametric, plane, points, render3d, scene, scenePalette, sphere, textures, torus, type Shape3d, type Vec3 } from "./shapes3d.ts";

// Wall-clock budgets, as on an idle machine when KIT_PERF=1 (npm run test:perf); ten times as long otherwise, so a
// busy CI runner running the files side by side fails only on a slowdown of a different order.
const slack = process.env.KIT_PERF ? 1 : 10;

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette, the same
// frame for the same t, on paper and on a dark page, in colour and in one ink.
function contract(p: Piece, times = [0, 0.5, 1, 2.5, 7]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const a = p.default({ ...meta.options }), b = p.default({ ...meta.options });
      for (const t of times) {
        const text = a(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `colour ${c} past the palette`);
        const kept = color?.slice();
        assert.equal(b(t, { paper, color }), text, `t=${t}: the same frame from a second play`);
        if (kept) assert.deepEqual(color, kept, `t=${t}: the same colours from a second play`);
      }
    }
}

// The cells drawn in a frame: the first and last column and row with anything in them, and how many.
function extent(text: string) {
  const lines = text.split("\n");
  let c0 = Infinity, c1 = -1, r0 = Infinity, r1 = -1, n = 0;
  lines.forEach((l, r) => {
    for (let c = 0; c < l.length; c++)
      if (l[c] !== " ") {
        (c0 = Math.min(c0, c)), (c1 = Math.max(c1, c)), (r0 = Math.min(r0, r)), (r1 = Math.max(r1, r));
        n++;
      }
  });
  return { c0, c1, r0, r1, n, cols: c1 - c0 + 1, rows: r1 - r0 + 1 };
}

// Shapes drawn into a fresh surface in one ink, at t.
function drawn(shapes: readonly Shape3d[], t = 0, o: Parameters<typeof render3d>[3] = {}, cols = 40, rows = 20): Surface {
  const s = new Surface(cols, rows);
  render3d(s, shapes, t, o);
  return s;
}

const at = (text: string, x: number, y: number) => text.split("\n")[y][x];
const DONUT = ".,-~:;=!*#$@";

// --- the shapes -------------------------------------------------------------------

test("every shape maker makes a shape that draws, with its defaults", () => {
  const makers: [string, () => Shape3d][] = [
    ["torus", () => torus()],
    ["sphere", () => sphere()],
    ["cube", () => cube({ rotate: [0.5, 0.6, 0] })],
    ["cylinder", () => cylinder({ rotate: [0.4, 0, 0] })],
    ["cone", () => cone({ rotate: [0.4, 0, 0] })],
    ["plane", () => plane({ rotate: [0.6, 0, 0] })],
    ["points", () => points("ball")],
    ["mesh", () => mesh([[0, 1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [1, 2, 3, 4]], { rotate: [0.3, 0.5, 0] })],
    ["parametric", () => parametric((u, v) => [u * 2 - 1, 0, v * 2 - 1], { rotate: [0.6, 0, 0] })],
  ];
  for (const [kind, make] of makers) {
    const shape = make();
    assert.equal(shape.kind, kind);
    assert.ok(Object.isFrozen(shape), `${kind} is opaque and frozen`);
    const e = extent(drawn([shape]).frame());
    assert.ok(e.n > 30, `${kind} draws (${e.n} cells)`);
    // fitted, with the outer ring of cells left empty
    assert.ok(e.c0 >= 1 && e.c1 <= 38 && e.r0 >= 1 && e.r1 <= 18, `${kind} keeps clear of the edges: ${JSON.stringify(e)}`);
  }
});

test("shapes check what they are given, saying what to change", () => {
  const bad: [() => unknown, RegExp][] = [
    [() => torus({ radius: -1 }), /ascii\.rest: torus's radius takes a number above 0, not -1/],
    [() => torus({ tube: 0 }), /torus's tube takes a number above 0, not 0/],
    [() => sphere({ radius: Number.NaN }), /sphere's radius takes a number above 0, not NaN/],
    [() => sphere({ color: "red" }), /sphere's color takes a colour as #rrggbb, \{ light, dark \}, or a palette's name such as "ocean", .* not "red": a colour of your own is #rrggbb/],
    [() => sphere({ color: 3 as never }), /sphere's color takes a colour as #rrggbb or a palette's name such as "ocean", not 3/],
    [() => cube({ size: 0 }), /cube's size takes a number above 0/],
    [() => cylinder({ height: "2" as unknown as number }), /cylinder's height takes a number above 0, not "2"/],
    [() => cone({ radius: Infinity }), /cone's radius takes a number above 0/],
    [() => plane({ depth: -4 }), /plane's depth takes a number above 0/],
    [() => sphere({ scale: 0 }), /sphere's scale takes a number above 0/],
    [() => sphere({ at: [0, 0] as unknown as Vec3 }), /sphere's at takes \[x, y, z\], three numbers, not \[0,0\]/],
    [() => sphere({ at: () => [0, Number.NaN, 0] }), /sphere's at, a function of t, at t = 0, takes \[x, y, z\]/],
    [() => sphere({ rotate: "x" as unknown as Vec3 }), /sphere's rotate takes a turn's name, "upside-down", .* or "turned-round", \[x, y, z\] in radians, \{ turns: \[x, y, z\] \} or \{ degrees: \[x, y, z\] \}, not "x"/],
    [() => sphere({ rotate: "upsidedown" as never }), /not "upsidedown" \(did you mean "upside-down"\?\)/],
    [() => sphere({ rotate: { turn: [0.5, 0, 0] } as never }), /sphere's rotate takes \[x, y, z\] in radians, \{ turns: \[x, y, z\] \}/],
    [() => sphere({ spin: "quick" as never }), /sphere's spin takes "slow", "normal" or "fast", .* not "quick" \(did you mean "fast"\?\)/],
    [() => scene({ ambient: "dim" as never }, sphere()), /ambient takes "none", "soft" or "bright", or a number from 0 to 1, not "dim"/],
    [() => scene({ camera: { tilt: "up" as never } }, sphere()), /camera's tilt takes "level", "above", "high" or "below", or radians, not "up"/],
    [() => sphere({ spin: [1, 2, Infinity] }), /sphere's spin takes \[x, y, z\]/],
    [() => sphere({ texture: "marble" as "bands" }), /sphere's texture takes "bands", "stripes", "checker", "grid" and "spots", or a function/],
    [() => sphere(null as unknown as {}), /sphere\(\) takes an options object/],
    [() => points("nebula" as "galaxy"), /points\(\) takes a cloud's name, "galaxy", "ball", "shell", "ring" and "helix", or a list of points/],
    [() => points([[0, 0, 0], [1, 2]] as unknown as Vec3[]), /points' point 1 takes \[x, y, z\]/],
    [() => points(() => "no" as unknown as Vec3[]), /points\(\) takes a cloud's name, a list of points.*at t = 0/],
    [() => points([[0, 0, 0]], { char: "ab" }), /points' char takes one character that isn't a space/],
    [() => points([[0, 0, 0]], { char: " " }), /points' char takes one character that isn't a space/],
    [() => points([[0, 0, 0]], { glow: 0 }), /points' glow takes a number above 0 and up to 1/],
    [() => points([[0, 0, 0]], { glow: 1.5 }), /points' glow takes a number above 0 and up to 1/],
    [() => points([[0, 0, 0]], { count: 5 }), /points' count and seed are for a named cloud/],
    [() => points("ball", { count: 0 }), /points' count takes a whole number from 1 to 20000, not 0/],
    [() => points("ball", { texture: "bands" }), /points\(\) takes no texture/],
    [() => mesh([], [[0, 1, 2]]), /mesh\(\) takes a list of vertices/],
    [() => mesh([[0, 0, 0], [1, 0, 0], [0, 1, 0]], []), /mesh\(\) takes faces/],
    [() => mesh([[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1, 3]]), /mesh's face 0 takes three or more whole numbers from 0 to 2/],
    [() => mesh([[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1]]), /mesh's face 0 takes three or more/],
    [() => parametric("u" as unknown as () => Vec3), /parametric\(\) takes a function \(u, v\) => \[x, y, z\]/],
    [() => parametric(() => [0, 0] as unknown as Vec3), /parametric's function at u 0, v 0 and t 0 takes \[x, y, z\]/],
    [() => parametric((u, v) => [u, v, 0], { segments: 0 }), /parametric's segments takes a whole number from 1 to 512, or \[u, v\] of them, not 0/],
    [() => textures.bands(0), /textures\.bands takes a whole number from 1 to 64, not 0/],
    [() => textures.checker(8, 1.5), /textures\.checker's along takes a whole number from 1 to 64/],
  ];
  for (const [make, message] of bad) assert.throws(make, message);
});

test("orbit goes round its centre every period, tipped by its tilt, from its phase", () => {
  const o = orbit({ radius: 2, period: 4 });
  const near = (a: Vec3, b: Vec3) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${a} is ${b}`));
  near(o(0), [2, 0, 0]);
  // right, then away behind the centre, then left, then in front
  near(o(1), [0, 0, 2]);
  near(o(2), [-2, 0, 0]);
  near(o(3), [0, 0, -2]);
  near(o(4), o(0));
  near(o(-1), o(3));
  // the same numbers every turn, so a loop is exact
  assert.deepEqual(o(1.3), o(5.3));
  const tipped = orbit({ radius: 2, period: 4, tilt: Math.PI / 6, center: [1, 2, 3], phase: Math.PI / 2 });
  near(tipped(0), [1, 2 + 2 * Math.sin(Math.PI / 6), 3 + 2 * Math.cos(Math.PI / 6)]);
  assert.throws(() => orbit({ radius: 2 } as { radius: number; period: number }), /ascii\.rest: orbit's period takes a number above 0, not undefined/);
  assert.throws(() => orbit({ radius: 0, period: 2 }), /orbit's radius takes a number above 0/);
  assert.throws(() => orbit({ radius: 1, period: 2, tilt: Number.NaN }), /orbit's tilt takes a number, not NaN/);
  assert.throws(() => orbit({ radius: 1, period: 2, center: [0, 0] as unknown as Vec3 }), /orbit's center takes \[x, y, z\]/);
  assert.throws(() => orbit(undefined as unknown as { radius: number; period: number }), /orbit\(\) takes \{ radius, period \}/);
});

test("textures stay 0 to 1, repeat round u, and the named ones are the defaults", () => {
  const all = [textures.bands(), textures.stripes(), textures.checker(), textures.grid(), textures.spots(), textures.spots(5, 9)];
  for (const tex of all) {
    let lo = 1, hi = 0;
    for (let j = 0; j <= 40; j++)
      for (let i = 0; i <= 80; i++) {
        const v = tex(i / 80, j / 40, 0);
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
        // u 0 and u 1 are the same place on a shape that goes round
        if (i === 0) assert.ok(Math.abs(v - tex(1, j / 40, 0)) < 1e-9, "meets itself round u");
      }
    assert.ok(lo >= 0 && hi <= 1, `in 0..1: ${lo}..${hi}`);
    assert.ok(hi - lo > 0.3, `shows a pattern: ${lo}..${hi}`);
  }
  assert.equal(textures.stripes(2)(0.25, 0.5, 0), 1);
  assert.equal(textures.stripes(2)(0.75, 0.5, 0), 0.45);
  assert.notEqual(textures.checker(2, 2)(0.25, 0.25, 0), textures.checker(2, 2)(0.75, 0.25, 0));
  // seeds move the coastlines
  const a = textures.spots(5, 1), b = textures.spots(5, 2);
  let differ = 0;
  for (let i = 0; i < 100; i++) if (a(i / 100, 0.5, 0) !== b(i / 100, 0.5, 0)) differ++;
  assert.ok(differ > 20, "another seed, other continents");
  // a texture by name is that texture with its default count: the same frame
  const named = drawn([sphere({ texture: "bands", spin: [0, 1, 0] })], 1).frame();
  const made = drawn([sphere({ texture: textures.bands(), spin: [0, 1, 0] })], 1).frame();
  assert.equal(named, made);
  // a texture darkens what it covers, never lightens it
  const plain = drawn([sphere()]).frame(), striped = drawn([sphere({ texture: "stripes" })]).frame();
  for (let i = 0; i < plain.length; i++) if (plain[i] !== "\n" && plain[i] !== " ") assert.ok(DONUT.indexOf(striped[i]) <= DONUT.indexOf(plain[i]));
  assert.notEqual(plain, striped);
});

// --- drawing ----------------------------------------------------------------------

test("a sphere's silhouette is round on screen, a cell being two widths tall", () => {
  for (const [cols, rows] of [[120, 60], [61, 33]]) {
    const s = new Surface(cols, rows);
    render3d(s, [sphere({ radius: 1 })], 0, { camera: { distance: 40, zoom: rows / 2.5 } });
    const e = extent(s.frame());
    // as wide in columns as it is tall in rows times two, to within a cell either way
    assert.ok(Math.abs(e.cols - 2 * e.rows) <= 2, `${e.cols} columns by ${e.rows} rows`);
    // and centred
    assert.ok(Math.abs((e.c0 + e.c1 + 1) / 2 - cols / 2) <= 0.5 && Math.abs((e.r0 + e.r1 + 1) / 2 - rows / 2) <= 0.5, JSON.stringify(e));
    // each row a solid run, widest in the middle row: a disc, not a square
    const lines = s.frame().split("\n").filter((l) => l.trim());
    const widths = lines.map((l) => l.trim().length);
    assert.ok(widths.every((w, i) => lines[i].trim().indexOf(" ") < 0 && w > 0));
    assert.equal(Math.max(...widths), widths[Math.floor(widths.length / 2)]);
    assert.ok(widths[0] < widths[Math.floor(widths.length / 2)] / 2);
  }
  // on a square grid (meta.cell 1) it is as many rows as columns
  const sq = new Surface(60, 60, { aspect: 1 });
  render3d(sq, [sphere()], 0, { camera: { distance: 40, zoom: 20 } });
  const e = extent(sq.frame());
  assert.ok(Math.abs(e.cols - e.rows) <= 1, `${e.cols} by ${e.rows}`);
});

test("light from the front gives the brightest ramp step at the centre, and the ramp turns round on paper", () => {
  const front = { light: [0, 0, -1] as Vec3, camera: { distance: 20, zoom: 8 } };
  const s = drawn([sphere()], 0, front);
  assert.equal(at(s.frame(), 20, 10), "@");
  // and dimmer out to the edge
  const row = s.frame().split("\n")[10];
  for (let c = 20; c < 27; c++) assert.ok(DONUT.indexOf(row[c + 1]) <= DONUT.indexOf(row[c]), row);
  // lit from the right, the left half is turned away: the darkest step, which still shows, as donut's ramp has no space
  const side = drawn([sphere()], 0, { ...front, light: [1, 0, 0] }).frame().split("\n")[10];
  assert.equal(side.slice(14, 19), ".....");
  assert.ok(DONUT.indexOf(side[26]) >= 9, side);
  s.paper = true;
  render3d(s, [sphere()], 0, front);
  assert.equal(at(s.frame(), 20, 10), ".", "auto turns the ramp round on paper");
  for (const [invert, paper, centre] of [[true, false, "."], [false, true, "@"]] as const) {
    const t = new Surface(40, 20);
    t.paper = paper;
    render3d(t, [sphere()], 0, { ...front, invert });
    assert.equal(at(t.frame(), 20, 10), centre, `invert ${invert} on ${paper ? "paper" : "a dark page"}`);
  }
  // a ramp of your own, and a ramp whose darkest step is a space leaves those cells empty for what is under them
  const own = drawn([sphere()], 0, { ...front, ramp: "ab" });
  assert.equal(at(own.frame(), 20, 10), "b");
  const under = new Surface(40, 20);
  under.fill("x");
  render3d(under, [sphere()], 0, { ...front, ramp: " #", light: [1, 0, 0] });
  assert.equal(under.get(20 - 5, 10), "x", "the dark side's space lets what is under it show");
  assert.equal(under.get(20 + 5, 10), "#");
  // ambient 1 lights every side fully
  const lit = drawn([sphere()], 0, { ...front, ambient: 1 }).frame();
  assert.deepEqual(new Set(lit.replace(/[\n ]/g, "")), new Set(["@"]));
});

test("the depth buffer hides the far shape, whichever is drawn first", () => {
  const red = sphere({ at: [0, 0, -1], color: "#ff0000" }), blue = sphere({ at: [0, 0, 2], radius: 2, color: "#0000ff" });
  for (const list of [[red, blue], [blue, red]]) {
    const p = scene({ name: "pair", cols: 40, rows: 20, camera: { zoom: 6 }, light: [0, 0, -1] }, list);
    const { text, color } = snapshot(p, 0);
    const pal = p.meta.palette!;
    // the middle is the near red sphere's; further out only the big blue one shows (lightened a little to read on a
    // dark page), and past it nothing
    const hue = (x: number) => pal[color![10 * 40 + x]];
    const isRed = (h: string) => parseInt(h.slice(1, 3), 16) > 0 && h.slice(3) === "0000";
    const isBlue = (h: string) => parseInt(h.slice(5, 7), 16) > 2 * parseInt(h.slice(1, 3), 16);
    for (const x of [20, 15, 26]) assert.ok(isRed(hue(x)), `red in front at ${x}: ${hue(x)}`);
    for (const x of [11, 12, 28]) assert.ok(isBlue(hue(x)), `blue round it at ${x}: ${hue(x)}`);
    assert.equal(at(text, 29, 10), " ");
    assert.notEqual(at(text, 28, 10), " ");
  }
  // a moon passing behind a planet is hidden, and in front it covers it
  const moon = sphere({ radius: 0.3, at: orbit({ radius: 2, period: 4 }), color: "#ffffff" });
  const planet = sphere({ color: "#ff8800" });
  const p = scene({ name: "orbit", cols: 40, rows: 20, camera: { zoom: 6 } }, [planet, moon]);
  const whites = (t: number) => [...snapshot(p, t).color!].filter((c) => p.meta.palette![c].slice(1, 3) === p.meta.palette![c].slice(3, 5) && p.meta.palette![c].slice(3, 5) === p.meta.palette![c].slice(5, 7)).length;
  assert.equal(whites(1), 0, "behind the planet at a quarter turn");
  assert.ok(whites(3) > 0, "in front at three quarters");
});

test("points add up their light, hide behind surfaces and not behind each other", () => {
  const o = { camera: { distance: 20, zoom: 4 } };
  // one point, then four in the same place: the four make a denser character
  const one = at(drawn([points([[0, 0, 0]])], 0, o).frame(), 20, 10);
  const four = at(drawn([points([[0, 0, 0], [0, 0, 0.01], [0.01, 0, 0], [0, 0.01, 0]])], 0, o).frame(), 20, 10);
  assert.ok(DONUT.indexOf(four) > DONUT.indexOf(one), `${four} is denser than ${one}`);
  // a brighter glow, a denser character; one character for all of them with char
  const bright = at(drawn([points([[0, 0, 0]], { glow: 1 })], 0, o).frame(), 20, 10);
  assert.equal(bright, "@");
  assert.equal(at(drawn([points([[0, 0, 0]], { char: "*" })], 0, o).frame(), 20, 10), "*");
  // behind a sphere they are hidden, in front of it they show
  const behind = drawn([sphere(), points([[0, 0, 3]], { char: "*" })], 0, o).frame();
  assert.notEqual(at(behind, 20, 10), "*");
  const before = drawn([points([[0, 0, -3]], { char: "*" }), sphere()], 0, o).frame();
  assert.equal(at(before, 20, 10), "*");
  // a point behind the camera, or that a function of t later gives as something that isn't numbers, is left out
  const later = (t: number) => (t ? [[0, 0, -30], [Number.NaN, 0, 0], undefined, [0, 0, 0]] : [[0, 0, 0]]) as Vec3[];
  const odd = drawn([points(later, { char: "*" })], 1, o).frame();
  assert.equal(extent(odd).n, 1);
  assert.equal(at(odd, 20, 10), "*");
  // named clouds are the same for the same seed and differ across seeds; count is how many there are
  assert.equal(drawn([points("galaxy")], 0, o).frame(), drawn([points("galaxy")], 0, o).frame());
  assert.notEqual(drawn([points("galaxy", { seed: 2 })], 0, o).frame(), drawn([points("galaxy")], 0, o).frame());
  assert.ok(extent(drawn([points("ball", { count: 5 })], 0, o).frame()).n <= 5);
  for (const name of ["galaxy", "ball", "shell", "ring", "helix"] as const) assert.ok(extent(drawn([points(name, { rotate: [0.6, 0, 0] })]).frame()).n > 40, name);
});

test("a cube's faces are flat and lit apart; a mesh's faces show whichever way they wind", () => {
  const box = drawn([cube({ rotate: [-0.6, 0.7, 0], edges: false })], 0, { ambient: 0.15 }).frame();
  // three faces in view, each one character
  const seen = new Set(box.replace(/[\n ]/g, ""));
  assert.equal(seen.size, 3, `faces: ${[...seen].join("")}`);
  const tri = (faces: number[][]) => drawn([mesh([[0, 1, 0], [-1, -1, 0], [1, -1, 0]], faces, { edges: false })], 0, { camera: { zoom: 6 } }).frame();
  assert.equal(tri([[0, 1, 2]]), tri([[0, 2, 1]]));
  assert.ok(extent(tri([[0, 1, 2]])).n > 20);
});

test("edges: a cube's twelve as lines by their slope over its faces, only the ones in view, and none inside a flat face", () => {
  const o = { ambient: 0.15 };
  const plain = drawn([cube({ rotate: [-0.6, 0.7, 0], edges: false })], 0, o).frame();
  const lined = drawn([cube({ rotate: [-0.6, 0.7, 0] })], 0, o).frame();
  const slopes = (text: string) => new Set(text.replace(/[^-|/\\]/g, ""));
  // the faces' characters are the same, and lines are drawn over their borders
  assert.ok(slopes(lined).size >= 3, `edges in several slopes: ${[...slopes(lined)].join("")}`);
  assert.ok([...new Set(plain.replace(/[\n ]/g, ""))].every((c) => lined.includes(c)), "every face still shows");
  // the same outline: an edge never draws past the faces by more than a cell
  const a = extent(plain), b = extent(lined);
  assert.ok(Math.abs(a.c0 - b.c0) <= 1 && Math.abs(a.c1 - b.c1) <= 1 && Math.abs(a.r0 - b.r0) <= 1 && Math.abs(a.r1 - b.r1) <= 1, `${JSON.stringify(a)} against ${JSON.stringify(b)}`);
  // seen square on, one face: only its border, a box of - and | with + at its corners, nothing drawn across it, so the
  // edges behind it are hidden
  const square = drawn([cube()], 0, { camera: { zoom: 6, distance: 40 }, light: [0, 0, -1] }).frame().split("\n").filter((l) => l.trim());
  assert.match(square[0].trim(), /^\+-+\+$/);
  assert.match(square.at(-1)!.trim(), /^\+-+\+$/);
  for (const l of square.slice(1, -1)) assert.match(l.trim(), /^\|@+\|$/, l);
  // a rim curves on round: no + along it
  assert.doesNotMatch(drawn([cylinder({ rotate: [0.5, 0, 0] })]).frame(), /\+/);
  // a quad mesh cut into two triangles has no line across it, and two coplanar faces none between them
  const quad = drawn([mesh([[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], [[0, 1, 2, 3]])], 0, { camera: { zoom: 6, distance: 40 }, light: [0, 0, -1] }).frame();
  const halves = drawn([mesh([[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], [[0, 1, 2], [0, 2, 3]])], 0, { camera: { zoom: 6, distance: 40 }, light: [0, 0, -1] }).frame();
  assert.equal(halves, quad);
  assert.doesNotMatch(quad.split("\n")[10], /[/\\]/);
  // a cylinder's rims, a cone's rim and a plane's border are drawn; a sphere and a torus have none
  for (const shape of [cylinder({ rotate: [0.5, 0, 0] }), cone({ rotate: [0.5, 0, 0] }), plane({ rotate: [0.6, 0, 0] })]) assert.ok(slopes(drawn([shape]).frame()).size >= 2, shape.kind);
  assert.equal(drawn([sphere()]).frame(), drawn([sphere({ edges: false })]).frame());
  // an edge hidden behind a nearer shape stays hidden
  const behind = drawn([sphere({ at: [0, 0, -2], radius: 1.5 }), cube({ at: [0, 0, 2] })], 0, { camera: { zoom: 5 }, light: [0, 0, -1] }).frame();
  assert.equal(at(behind, 20, 10), "@");
  assert.throws(() => cube({ edges: 1 as unknown as boolean }), /ascii\.rest: cube's edges takes true or false, not 1/);
});

test("parametric surfaces draw, and one of t moves", () => {
  const still = parametric((u, v) => [u * 4 - 2, Math.sin(u * 6) * 0.3, v * 4 - 2], { rotate: [0.7, 0, 0] });
  assert.equal(drawn([still], 0).frame(), drawn([still], 3).frame());
  const sea = parametric((u, v, t) => [u * 4 - 2, Math.sin(u * 6 + t * 3) * 0.3, v * 4 - 2], { rotate: [0.7, 0, 0] });
  assert.notEqual(drawn([sea], 0).frame(), drawn([sea], 0.5).frame());
  // its own segments, a number for both or [u, v]
  assert.ok(extent(drawn([parametric((u, v) => [u * 2 - 1, v * 2 - 1, 0], { segments: [2, 3] })]).frame()).n > 30);
  // a point that isn't numbers is taken as the centre, never a crash: NaN, null, undefined, a number or a string
  for (const odd of [[Number.NaN, 0, 0], null, undefined, 3, "x"]) {
    const holey = parametric((u, v) => (u > 0.5 ? odd : [u * 2 - 1, v * 2 - 1, 0]) as Vec3);
    assert.ok(extent(drawn([holey]).frame()).n > 0, String(odd));
    assert.ok(extent(drawn([parametric((u, v, t) => (u > 0.5 ? odd : [u * 2 - 1, v * 2 - 1, t]) as Vec3)], 1).frame()).n > 0, `${odd}, moving`);
  }
});

test("lines: paths drawn by their slope or in one character, closed or not, hidden behind nearer surfaces", () => {
  const o = { camera: { zoom: 4, distance: 40 } };
  // one path, or a list of paths, is the same
  assert.equal(drawn([lines([[-2, 0, 0], [2, 0, 0]])], 0, o).frame(), drawn([lines([[[-2, 0, 0], [2, 0, 0]]])], 0, o).frame());
  const one = (a: Vec3, b: Vec3, extra = {}) => drawn([lines([a, b], extra)], 0, o).frame().replace(/[\n ]/g, "");
  assert.match(one([-2, 0, 0], [2, 0, 0]), /^-+$/);
  assert.match(one([0, -2, 0], [0, 2, 0]), /^\|+$/);
  assert.match(one([-1, -2, 0], [1, 2, 0]), /^\/+$/);
  assert.match(one([-1, 2, 0], [1, -2, 0]), /^\\+$/);
  assert.match(one([-2, 0, 0], [2, 0, 0], { char: "=" }), /^=+$/);
  // a square path: three sides open, four closed, and no + where they meet
  const square: Vec3[] = [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]];
  const open = drawn([lines(square)], 0, o).frame(), shut = drawn([lines(square, { closed: true })], 0, o).frame();
  assert.ok(extent(shut).n > extent(open).n);
  assert.doesNotMatch(shut, /\+/);
  // behind a sphere hidden, in front of it drawn, whichever is drawn first
  const across = lines([[-3, 0, 0], [3, 0, 0]], { char: "=" });
  for (const z of [-3, 3]) {
    const line = lines([[-3, 0, z], [3, 0, z]], { char: "=" });
    for (const list of [[sphere(), line], [line, sphere()]]) assert.equal(at(drawn(list, 0, o).frame(), 20, 10) === "=", z < 0, `a line at z ${z}`);
  }
  // a function of t moves it, and a point that isn't numbers breaks its path there
  const hand = lines((t) => [[0, 0, 0], [Math.cos(t), Math.sin(t), 0]]);
  assert.notEqual(drawn([hand], 0, o).frame(), drawn([hand], 1, o).frame());
  const broken = lines((t) => [[-2, 0, 0], t ? [Number.NaN, 0, 0] : [0, 0, 0], [2, 0, 0]] as Vec3[], { char: "=" });
  assert.ok(extent(drawn([broken], 1, o).frame()).n === 0 && extent(drawn([broken], 0, o).frame()).n > 10);
  // a line reaching behind the camera is cut where it passes it, not left out
  assert.ok(extent(drawn([lines([[0, -1, 0], [0, -1, -60]])], 0, o).frame()).n > 3);
  // coloured, in its colour's full shade
  const p = scene({ cols: 30, rows: 10 }, [across, lines([[0, -2, 0], [0, 2, 0]], { color: "#22c55e" })]);
  const { color } = snapshot(p, 0);
  assert.ok(color!.some((c) => p.meta.palette![c] === "#22c55e"));
  const bad: [() => unknown, RegExp][] = [
    [() => lines("x" as unknown as Vec3[]), /ascii\.rest: lines\(\) takes a list of points, each \[x, y, z\], a list of such lists/],
    [() => lines([[0, 0, 0], [1, 1]] as unknown as Vec3[]), /lines' path 0, point 1, takes \[x, y, z\]/],
    [() => lines([[0, 0, 0]], { char: "ab" }), /lines' char takes one character that isn't a space/],
    [() => lines([[0, 0, 0]], { closed: 1 as unknown as boolean }), /lines' closed takes true or false, not 1/],
    [() => lines([[0, 0, 0]], { texture: "bands" }), /lines\(\) takes no texture/],
  ];
  for (const [make, message] of bad) assert.throws(make, message);
});

test("group: shapes placed, turned and spun as one, groups in groups, colours passed down", () => {
  const o = { camera: { zoom: 4, distance: 40 } };
  const ball = sphere({ at: [3, 0, 0], radius: 0.6 });
  // turned half round about y, the ball on the right is on the left; moved, everything moves with it
  const right = extent(drawn([group([ball])], 0, o).frame()), left = extent(drawn([group([ball], { rotate: [0, Math.PI, 0] })], 0, o).frame());
  assert.ok(right.c0 > 20 && left.c1 < 20, `${right.c0} and ${left.c1}`);
  assert.equal(drawn([group([sphere()], { at: [3, 0, 0] })], 0, o).frame(), drawn([sphere({ at: [3, 0, 0] })], 0, o).frame());
  // its scale sizes what is in it and their places
  assert.equal(drawn([group([sphere({ at: [1, 0, 0], radius: 0.5 })], { scale: 2 })], 0, o).frame(), drawn([sphere({ at: [2, 0, 0] })], 0, o).frame());
  // a moon round a planet that goes round a sun: the moon is where both orbits put it
  const moon = sphere({ radius: 0.1, at: orbit({ radius: 1, period: 2 }) });
  const system = scene({ cols: 60, rows: 30, camera: { zoom: 4, distance: 40 }, fit: false }, [group([moon], { at: orbit({ radius: 4, period: 8 }) })]);
  const lone = (t: number) => {
    const sun = orbit({ radius: 4, period: 8 })(t), m = orbit({ radius: 1, period: 2 })(t);
    return snapshot(scene({ cols: 60, rows: 30, camera: { zoom: 4, distance: 40 }, fit: false }, [sphere({ radius: 0.1, at: [sun[0] + m[0], sun[1] + m[1], sun[2] + m[2]] })]), 0).text;
  };
  for (const t of [0, 1.5, 3.25]) assert.equal(snapshot(system, t).text, lone(t), `t=${t}`);
  // the loop: a spin of the group and an orbit in it, a turn in 2 s and an orbit of 3 s, meet at 6 s
  assert.ok(Math.abs(scene({}, [group([moon, sphere({ at: orbit({ radius: 2, period: 3 }) })], { spin: [0, Math.PI, 0] })]).meta.loop! - 6) < 1e-9);
  // and an orbit inside a group is checked against the period
  assert.throws(() => scene({ period: 5 }, [group([moon])]), /an orbit going round every 2 seconds doesn't go round a whole number of times/);
  // colours: the group's for the shapes with none, their own for the rest; the shape itself is left as it was
  const plain = sphere({ at: [-2, 0, 0] });
  const p = scene({ cols: 40, rows: 20 }, [group([plain, sphere({ at: [2, 0, 0], color: "#ff0000" })], { color: "#0000ff" })]);
  assert.equal(p.meta.palette!.length, 2 * 2 * 4, "two colours, four shades, two pages, and no ink: every shape has a colour");
  assert.equal(scene({}, [plain]).meta.palette, undefined);
  // fitted, a spinning group stays inside the frame
  const spun = scene({ cols: 40, rows: 20, period: 4 }, [group([cube({ at: [2, 0, 0], size: 1 }), sphere({ at: [-2, 0, 0], radius: 0.5 })], { spin: [0.3, 1, 0] })]);
  const f = spun.default();
  for (let i = 0; i < 40; i++) {
    const e = extent(f(i / 10));
    assert.ok(e.c0 >= 1 && e.c1 <= 38 && e.r0 >= 1 && e.r1 <= 18, `t=${i / 10}: ${JSON.stringify(e)}`);
  }
  contract(spun);
  assert.throws(() => group("x" as unknown as Shape3d[]), /ascii\.rest: group\(\) takes a list of shapes/);
  assert.throws(() => group([sphere(), {} as Shape3d]), /group\(\) takes shapes made by/);
  assert.throws(() => group([sphere()], { texture: "bands" }), /group\(\) takes no texture/);
});

test("the near plane cuts what reaches behind the camera, so a floor to the horizon draws", () => {
  const floor = plane({ at: [0, -1, 0], width: 60, depth: 60, texture: textures.checker(30, 30) });
  const s = drawn([floor], 0, { camera: { tilt: 0.35, zoom: 6 } }, 40, 16);
  const lines = s.frame().split("\n");
  // the bottom rows, nearest the camera, are covered from side to side
  for (const l of lines.slice(-4)) assert.equal(l.trim().length, 40, l);
  // and the checks shrink towards the horizon: more changes of character a row far away than near
  const changes = (l: string) => [...l].filter((c, i) => i && c !== l[i - 1]).length;
  assert.ok(changes(lines.at(-1)!) < changes(lines[Math.floor(lines.length / 2)]), "perspective");
});

test("spin as one number turns about y; a texture of t moves; a shape alone is a list of one", () => {
  const a = scene({ cols: 30, rows: 12, period: 4 }, [cube({ spin: 1.2 })]), b = scene({ cols: 30, rows: 12, period: 4 }, [cube({ spin: [0, 1.2, 0] })]);
  for (const t of [0, 1, 2.5]) assert.equal(snapshot(a, t).text, snapshot(b, t).text);
  assert.throws(() => cube({ spin: Number.NaN }), /ascii\.rest: cube's spin takes radians a second about y, or \[x, y, z\] about each, not NaN/);
  const lava = scene({ cols: 30, rows: 12, period: 2 }, [sphere({ texture: (u, v, t) => 0.5 + 0.5 * Math.sin(TAU * (u * 4 + t / 2)) })]);
  assert.notEqual(snapshot(lava, 0).text, snapshot(lava, 0.5).text);
  assert.equal(lava.meta.fps, 30);
  assert.equal(snapshot(scene({ cols: 30, rows: 12 }, torus()), 0).text, snapshot(scene({ cols: 30, rows: 12 }, [torus()]), 0).text);
});

test("a scene with a huge spinning surface is made quickly: it counts as its ball", () => {
  const start = performance.now();
  const p = scene({ period: 60 }, [parametric((u, v) => [Math.cos(u * TAU) * (1 + v), v, Math.sin(u * TAU)], { segments: 512, spin: [1, 0.3, 0] })]);
  const ms = performance.now() - start;
  assert.ok(ms < 1500 * slack, `made in ${ms.toFixed(0)} ms`);
  const f = p.default();
  for (let i = 0; i < 20; i++) {
    const e = extent(f(i * 3));
    assert.ok(e.c0 >= 1 && e.c1 <= 62 && e.r0 >= 1 && e.r1 <= 22, JSON.stringify(e));
  }
});

test("a shape too small to cover a cell's centre still shows as one cell, and hides as a shape does", () => {
  const o = { camera: { zoom: 4, distance: 40 } };
  // alone: one cell, where its centre is, lit as the side facing the camera
  const tiny = drawn([sphere({ radius: 0.02 })], 0, o).frame();
  assert.equal(extent(tiny).n, 1);
  assert.equal(at(tiny, 20, 10), "*");
  // behind a larger shape it is hidden, so the frame is the larger one's alone
  const big = drawn([sphere()], 0, o).frame();
  assert.equal(drawn([sphere(), sphere({ radius: 0.02, at: [0, 0, 3] })], 0, o).frame(), big);
  assert.equal(drawn([sphere({ radius: 0.02, at: [0, 0, 3] }), sphere()], 0, o).frame(), big);
  // in front of it, it shows, in its own colour
  const pair = scene({ cols: 40, rows: 20, ...o }, [sphere({ color: "#ff0000" }), sphere({ radius: 0.02, at: [0, 0, -3], color: "#ffffff" })]);
  const { color } = snapshot(pair, 0);
  assert.match(pair.meta.palette![color![10 * 40 + 20]], /^#(\w\w)\1\1$/, "the near speck is the white one's");
  // a moon going round never blinks out: one cell in every frame of its orbit
  const moon = scene({ cols: 40, rows: 20, camera: { zoom: 6 } }, [sphere({ radius: 0.05, at: orbit({ radius: 2, period: 4, tilt: 0.3 }) })]);
  const f = moon.default();
  for (let i = 0; i < 60; i++) assert.equal(extent(f((i * 4) / 60)).n, 1, `t=${(i * 4) / 60}`);
  // off the grid, behind the camera, or seen from inside: nothing
  assert.equal(extent(drawn([sphere({ radius: 0.02, at: [100, 0, 0] })], 0, o).frame()).n, 0);
  assert.equal(extent(drawn([sphere({ radius: 0.02, at: [0, 0, -50] })], 0, o).frame()).n, 0);
  assert.equal(extent(drawn([sphere()], 0, { camera: { zoom: 4, distance: 0.5 } }).frame()).n, 0);
  // seen edge on, a plane is its border line and no speck
  assert.match(drawn([plane()], 0, o).frame().replace(/[\n ]/g, ""), /^-+$/);
});

test("render3d measures shapes made anew each frame once when they are made alike, and anew when it can't tell", () => {
  // a loop of 4 pi seconds, which the fit follows moment by moment: the slow way to measure
  const once = [torus({ spin: [1, 0, 0.5] }), sphere({ radius: 0.4, at: orbit({ radius: 3, period: TAU }) })];
  const kept = piece({ name: "kept", cols: 64, rows: 24 }, (t, s) => render3d(s, once, t));
  const anew = piece({ name: "anew", cols: 64, rows: 24 }, (t, s) => render3d(s, [torus({ spin: [1, 0, 0.5] }), sphere({ radius: 0.4, at: orbit({ radius: 3, period: TAU }) })], t));
  for (const t of [0, 0.7, 3.1, 11]) assert.equal(snapshot(anew, t).text, snapshot(kept, t).text, `t=${t}`);
  // and as quick: measured once, not every frame (made anew, it took 60 times as long before: 6.9 ms against 0.11)
  const time = (p: Piece) => {
    const f = p.default();
    f(0);
    const start = performance.now();
    for (let i = 1; i <= 60; i++) f(i / 30);
    return (performance.now() - start) / 60;
  };
  const a = time(kept), b = time(anew);
  assert.ok(b < a * 4 + 0.5 * slack, `made anew ${b.toFixed(2)} ms a frame, made once ${a.toFixed(2)} ms`);
  // shapes made differently never share a view: drawn after another, a shape is drawn as it is into a fresh surface
  const pairs: [() => Shape3d, () => Shape3d][] = [
    [() => sphere(), () => sphere({ at: [3, 0, 0] })],
    [() => sphere(), () => sphere({ radius: 2 })],
    [() => cube({ spin: 1 }), () => cube({ spin: 2 })],
    [() => sphere({ at: orbit({ radius: 2, period: 4 }) }), () => sphere({ at: orbit({ radius: 3, period: 4 }) })],
    [() => points("galaxy"), () => points("galaxy", { seed: 2 })],
    [() => mesh([[0, 1, 0], [-1, -1, 0], [1, -1, 0]], [[0, 1, 2]]), () => mesh([[0, 2, 0], [-1, -1, 0], [1, -1, 0]], [[0, 1, 2]])],
    [() => group([sphere({ at: [1, 0, 0] })]), () => group([sphere({ at: [2, 0, 0] })])],
  ];
  for (const [x, y] of pairs) {
    const s = new Surface(40, 20);
    render3d(s, x(), 0.5);
    s.clear();
    render3d(s, y(), 0.5);
    assert.equal(s.frame(), drawn([y()], 0.5).frame(), `${x().kind} then another`);
  }
  // one placed by a function of its own, made anew each frame, is measured each frame: the same frame for the same t
  const own = piece({ name: "own", cols: 40, rows: 20 }, (t, s) => render3d(s, sphere({ at: (u) => [2 * Math.sin(u), 0, 0], radius: 0.5 }), t));
  const f = own.default();
  for (const t of [3, 1, 2]) assert.equal(f(t), snapshot(own, t).text, `t=${t}`);
});

test("options are checked by name when a shape or scene is made: a typo says what was meant", () => {
  const bad: [() => unknown, RegExp][] = [
    [() => sphere({ colour: "#ff0000" } as {}), /ascii\.rest: sphere\(\) has no option "colour" \(did you mean color\?\): it takes at, rotate, spin, scale, color, texture, edges and radius/],
    [() => sphere({ size: 2 } as {}), /sphere\(\) has no option "size" \(did you mean radius\?\)/],
    [() => cube({ radius: 2 } as {}), /cube\(\) has no option "radius" \(did you mean size\?\)/],
    [() => torus({ thickness: 0.5 } as {}), /torus\(\) has no option "thickness" \(did you mean tube\?\)/],
    [() => cube({ position: [1, 0, 0] } as {}), /cube\(\) has no option "position" \(did you mean at\?\)/],
    [() => cube({ rotation: [1, 0, 0] } as {}), /cube\(\) has no option "rotation" \(did you mean rotate\?\)/],
    [() => parametric((u, v) => [u, v, 0], { resolution: 8 } as {}), /parametric\(\) has no option "resolution" \(did you mean segments\?\)/],
    [() => points("ball", { edges: false }), /points\(\) has no option "edges": it takes at, rotate, spin, scale, color, char, count, seed and glow/],
    [() => group([sphere()], { edges: false }), /group\(\) has no option "edges"/],
    [() => scene({ zoom: 4 } as {}, sphere()), /scene\(\) has no option "zoom" \(did you mean camera: \{ zoom \}\?\)/],
    [() => scene({ colour: ["#000000"] } as {}, sphere()), /scene\(\) has no option "colour" \(did you mean colors\?\)/],
    [() => scene({ width: 40 } as {}, sphere()), /scene\(\) has no option "width" \(did you mean cols\?\)/],
    [() => scene({ camera: { fov: 60 } as {} }, sphere()), /camera has no option "fov" \(did you mean zoom\?\): it takes distance, zoom, tilt and spin/],
    [() => orbit({ radius: 1, period: 2, centre: [0, 0, 0] } as { radius: number; period: number }), /orbit\(\) has no option "centre" \(did you mean center\?\)/],
    [() => render3d(new Surface(10, 4), sphere(), 0, { name: "x" } as {}), /render3d\(\) has no option "name": it takes camera, light/],
  ];
  for (const [make, message] of bad) assert.throws(make, message);
});

// --- scenes -----------------------------------------------------------------------

test("scene() takes the shapes alone, every option its default; with a spec, the spec comes first", () => {
  const alone = scene(torus({ spin: [0.8, 0, 0.35] }));
  assert.deepEqual({ ...alone.meta }, { ...scene({}, torus({ spin: [0.8, 0, 0.35] })).meta });
  assert.equal(alone.meta.name, "scene");
  assert.equal(snapshot(alone, 1.5).text, snapshot(scene({}, torus({ spin: [0.8, 0, 0.35] })), 1.5).text);
  assert.equal(scene([sphere(), cube({ at: [2, 0, 0] })]).meta.fps, 0);
  assert.equal(scene((t) => [sphere({ at: [Math.sin(t), 0, 0] })]).meta.fps, 30);
  assert.throws(() => (scene as (a: unknown, b: unknown) => unknown)(torus(), {}), /ascii\.rest: scene\(\) takes its spec first and its shapes second/);
  assert.throws(() => scene({ cols: 20 } as never), /scene\(\) takes a shape, a list of shapes.*not undefined/);
});

test("scene() makes a normal piece: 64 by 24, shapes category, 30 fps moving, a still when nothing moves", () => {
  const donut = scene({ name: "donut", cols: 40, rows: 22 }, [torus({ spin: [0.8, 0, 0.35] })]);
  assert.deepEqual(
    { ...donut.meta },
    { name: "donut", category: "shapes", note: "donut", cols: 40, rows: 22, fps: 30 },
    "no loop: 0.8 and 0.35 a second don't meet within a minute",
  );
  contract(donut);
  const plain = scene({}, [sphere()]);
  assert.equal(plain.meta.name, "scene");
  assert.equal(plain.meta.cols, 64);
  assert.equal(plain.meta.rows, 24);
  assert.equal(plain.meta.fps, 0, "nothing moves: a still");
  contract(plain);
  const own = scene({ name: "mine", category: "space", note: "a ball", fps: 12 }, [sphere({ spin: [0, 1, 0] })]);
  assert.equal(own.meta.category, "space");
  assert.equal(own.meta.note, "a ball");
  assert.equal(own.meta.fps, 12);
  // the scene's options are checked when it is made
  const bad: [() => unknown, RegExp][] = [
    [() => scene({ ambient: 2 }, [sphere()]), /ascii\.rest: ambient takes a number from 0 to 1, not 2/],
    [() => scene({ light: [0, 0, 0] }, [sphere()]), /light takes a direction towards the light, not \[0, 0, 0\]/],
    [() => scene({ ramp: "x" }, [sphere()]), /a ramp takes a name/],
    [() => scene({ invert: "yes" as "auto" }, [sphere()]), /invert takes true, false or "auto", not "yes"/],
    [() => scene({ colorBy: "hue" as "shape" }, [sphere()]), /colorBy takes "shape", "depth" and "light", not "hue"/],
    [() => scene({ shades: 0 }, [sphere()]), /shades takes a whole number from 1 to 16, not 0/],
    [() => scene({ colors: ["blue"] }, [sphere()]), /colors takes colours as #rrggbb, one or more, not \["blue"\]/],
    [() => scene({ fit: 1 as unknown as boolean }, [sphere()]), /fit takes true or false, not 1/],
    [() => scene({ period: 0 }, [sphere()]), /period takes a number above 0, not 0/],
    [() => scene({ camera: { distance: -6 } }, [sphere()]), /camera's distance takes a number above 0, not -6/],
    [() => scene({ camera: { zoom: 0 } }, [sphere()]), /camera's zoom takes a number above 0, not 0/],
    [() => scene({ camera: { tilt: Number.NaN } }, [sphere()]), /camera's tilt takes a number, not NaN/],
    [() => scene({ camera: [] as unknown as {} }, [sphere()]), /camera takes \{ distance, zoom, tilt, spin \}/],
    [() => scene({}, "torus" as unknown as Shape3d[]), /scene\(\) takes a shape, a list of shapes, such as \[torus\(\)\], or a function of t that gives a list, not "torus"/],
    [() => scene({}, [{ kind: "torus" }]), /a scene takes shapes made by torus\(\), sphere\(\)/],
    [() => scene({ cols: 0 }, [sphere()]), /cols takes a whole number from 1 to 320, not 0/],
    [() => scene({ period: 5 }, [sphere({ at: orbit({ radius: 2, period: 2 }) })]), /an orbit going round every 2 seconds doesn't go round a whole number of times in the scene's period of 5: make the period a multiple of 2/],
    [() => scene({}, () => [sphere(), 3 as unknown as Shape3d]), /a scene takes shapes made by/],
  ];
  for (const [make, message] of bad) assert.throws(make, message);
});

test("period rounds spins to whole turns so the scene loops exactly, and a scene finds its own loop", () => {
  const p = scene({ name: "loop", cols: 30, rows: 14, period: 8 }, [torus({ spin: [0.8, 0, 0.35] })]);
  assert.equal(p.meta.loop, 8);
  const f = p.default();
  for (const t of [0, 1.3, 5.75]) assert.equal(f(t), f(t + 8), `t=${t} and t+8`);
  // (half way, a half turn on both axes is a half turn about y, which a torus looks the same after)
  assert.notEqual(f(0), f(2));
  // spins that meet within a minute make a loop on their own: once round in TAU seconds, twice, so TAU
  const own = scene({}, [cube({ spin: [0, 1, 0] }), sphere({ spin: [2, 0, 0], at: [3, 0, 0] })]);
  assert.ok(Math.abs(own.meta.loop! - TAU) < 1e-9, String(own.meta.loop));
  // an orbit and a spin: a 3 s orbit and a turn in 2 s meet at 6 s
  const moon = scene({}, [sphere({ spin: [0, Math.PI, 0] }), sphere({ radius: 0.2, at: orbit({ radius: 2, period: 3 }) })]);
  assert.ok(Math.abs(moon.meta.loop! - 6) < 1e-9, String(moon.meta.loop));
  const g = moon.default();
  assert.equal(g(1), g(7));
  // a loop of the spec's own wins
  assert.equal(scene({ loop: 3, period: 8 }, [torus({ spin: [1, 0, 0] })]).meta.loop, 3);
  // shapes from a function of t, or a rotate of t, leave the loop unset
  assert.equal(scene({}, (t) => [sphere({ at: [Math.sin(t), 0, 0] })]).meta.loop, undefined);
  assert.equal(scene({}, [cube({ rotate: (t) => [t, 0, 0] })]).meta.loop, undefined);
});

test("fit keeps every shape inside the frame at every angle, with the outer ring empty, and fills it", () => {
  const cases: [string, Parameters<typeof scene>[0], Shape3d[]][] = [
    ["a torus on two axes, looping", { period: 8 }, [torus({ spin: [0.8, 0, 0.35] })]],
    ["a torus on two axes, never repeating", {}, [torus({ spin: [0.8, 0, 0.35] })]],
    ["a long cylinder", { period: 6 }, [cylinder({ height: 5, spin: [1, 0, 0.5] })]],
    ["a cube", { period: 8 }, [cube({ spin: [0.8, 1.6, 0] })]],
    ["a planet and its moon", { period: 6, camera: { distance: 10 } }, [sphere({ radius: 1.4, spin: [0, 1, 0] }), sphere({ radius: 0.3, at: orbit({ radius: 2.7, period: 6, tilt: 0.3 }) })]],
    ["a turntable", { period: 6, camera: { tilt: 0.5, spin: 1 } }, [cone({ at: [1.5, 0, 0] }), cube({ at: [-1.5, 0, 0], size: 1 })]],
    ["a square grid", { period: 8, cell: 1 }, [torus({ spin: [0.8, 0, 0.35] })]],
    ["a fast spin over a long loop", { period: 60 }, [cube({ spin: [12, 7, 0] })]],
    ["a turntable with no loop", { camera: { tilt: 0.4, spin: 0.7 } }, [cylinder({ at: [1.2, 0, 0], height: 3 }), sphere({ at: [-1, 0.5, 0.5], radius: 0.6 })]],
  ];
  for (const [what, spec, shapes] of cases)
    for (const [cols, rows] of [[40, 22], [64, 16], [24, 30]]) {
      const p = scene({ ...spec, cols, rows }, shapes);
      const f = p.default();
      const span = p.meta.loop ?? 30;
      let c0 = Infinity, c1 = -1, r0 = Infinity, r1 = -1;
      for (let i = 0; i < 300; i++) {
        const e = extent(f((i * span) / 300 + 0.0123));
        (c0 = Math.min(c0, e.c0)), (c1 = Math.max(c1, e.c1)), (r0 = Math.min(r0, e.r0)), (r1 = Math.max(r1, e.r1));
      }
      assert.ok(c0 >= 1 && c1 <= cols - 2 && r0 >= 1 && r1 <= rows - 2, `${what} at ${cols} by ${rows} clips: columns ${c0} to ${c1}, rows ${r0} to ${r1}`);
      // and it is as large as that allows, along one side or the other
      assert.ok(c0 <= 3 || c1 >= cols - 4 || r0 <= 2 || r1 >= rows - 3, `${what} at ${cols} by ${rows} is fitted loosely: columns ${c0} to ${c1}, rows ${r0} to ${r1}`);
    }
});

test("zoom, distance and fit: false change the size, and shapes off screen or behind the camera are left out", () => {
  const small = extent(drawn([sphere()], 0, { camera: { zoom: 4 } }).frame());
  const big = extent(drawn([sphere()], 0, { camera: { zoom: 8 } }).frame());
  assert.ok(big.cols > small.cols * 1.7, `${big.cols} against ${small.cols}`);
  // without fit or zoom a unit is an eighth of the frame's height: a sphere of radius 1 a quarter of it
  const unfit = extent(drawn([sphere()], 0, { fit: false, camera: { distance: 100 } }, 40, 40).frame());
  assert.ok(Math.abs(unfit.rows - 10) <= 1, `${unfit.rows} rows`);
  // nearer, the same sphere at the same zoom looks bigger
  const near = extent(drawn([sphere({ at: [0, 0, -3] })], 0, { camera: { zoom: 4 } }).frame());
  assert.ok(near.cols > small.cols, `${near.cols} against ${small.cols}`);
  // off to the side, behind the camera, straddling it: nothing drawn where it can't be, and no error
  assert.equal(extent(drawn([sphere({ at: [100, 0, 0] })], 0, { camera: { zoom: 4 } }).frame()).n, 0);
  assert.equal(extent(drawn([sphere({ at: [0, 0, -10] })], 0, { camera: { zoom: 4 } }).frame()).n, 0);
  const straddle = drawn([plane({ width: 40, depth: 40, rotate: [0.3, 0, 0] })], 0, { camera: { zoom: 4 } }).frame();
  assert.equal(straddle.split("\n").length, 20);
  // nothing at all
  assert.equal(drawn([]).frame(), new Surface(40, 20).frame());
  const empty = scene({ cols: 10, rows: 4 }, []);
  assert.equal(empty.meta.fps, 0);
  assert.equal(snapshot(empty).text, "          \n          \n          \n          ");
  assert.equal(snapshot(scene({ cols: 10, rows: 4 }, [points([])])).text.trim(), "");
});

test("colours: each shape in shades of its own, on both pages, inside the palette; none written in one ink", () => {
  const p = scene({ name: "two", cols: 40, rows: 20 }, [cube({ at: [-1.5, 0, 0], rotate: [-0.6, 0.7, 0], color: "#f97316" }), sphere({ at: [1.5, 0, 0], color: "#3b82f6" }), torus({ at: [0, 3, 0], radius: 0.6, tube: 0.2 })]);
  const pal = p.meta.palette!;
  // two colours in 4 shades, and the ink for the torus with none, for each page
  assert.equal(pal.length, 2 * (2 * 4 + 1));
  const size = pal.length / 2;
  contract(p);
  for (const paper of [false, true]) {
    const used = new Set(snapshot(p, 0, { paper }).color);
    for (const c of used) assert.ok(paper ? c < size : c >= size, `colour ${c} is the ${paper ? "light" : "dark"} page's`);
    assert.ok(used.size >= 5, `several shades in use: ${used.size}`);
  }
  // mono: the same characters, and no colours
  assert.equal(snapshot(p, 0, { mono: true }).text, snapshot(p, 0).text);
  assert.equal(snapshot(p, 0, { mono: true }).color, null);
  // no colours anywhere: no palette, text in the page's own colour
  assert.equal(scene({}, [torus()]).meta.palette, undefined);
  // one fade for the whole scene, by depth: the near ball brighter than the far one
  const deep = scene({ cols: 40, rows: 20, colors: ["#000044", "#8888ff"], shades: 6, colorBy: "depth", camera: { zoom: 3 } }, [sphere({ at: [-2, 0, -2] }), sphere({ at: [2, 0, 3] })]);
  assert.equal(deep.meta.palette!.length, 12, "the fade for each page");
  const d = snapshot(deep, 0);
  const middle = d.text.split("\n")[10], nearCell = middle.search(/\S/), farCell = middle.trimEnd().length - 1;
  assert.ok(d.color![10 * 40 + nearCell] > d.color![10 * 40 + farCell], `near ${d.color![10 * 40 + nearCell]}, far ${d.color![10 * 40 + farCell]}`);
  // each made to read on its page: a pale stop is darkened on paper, a dark one lightened on a dark page
  const pale = scene({ colors: ["#000000", "#fff0f8"] }, [sphere()]).meta.palette!;
  assert.notEqual(pale[1], "#fff0f8");
  assert.notEqual(pale[2], "#000000");
  // a fade for each page is used as given
  const given = scene({ colors: { light: ["#000000", "#fff0f8"], dark: ["#000000", "#fff0f8"] }, shades: 2 }, [sphere()]).meta.palette!;
  assert.deepEqual(given, ["#000000", "#fff0f8", "#000000", "#fff0f8"]);
  // colorBy light: past the colour to a pale highlight on a dark page
  const glow = scene({ colorBy: "light" }, [sphere({ color: "#2266cc" })]);
  const dark = glow.meta.palette!.slice(4);
  assert.ok(dark.some((h) => parseInt(h.slice(1, 3), 16) > 0x60), `a pale highlight: ${dark.join(" ")}`);
  // too many colours for a piece is a clear error
  const many = Array.from({ length: 9 }, (_, i) => sphere({ color: `#${(i * 28).toString(16).padStart(2, "0")}0000` }));
  assert.throws(() => scene({}, many), /this scene's colours come to 36 a page, 9 colours in 4 shades each, past the 32 a page a piece can have/);
  // shapes from a function: their colours are collected at t = 0
  const fn = scene({ cols: 20, rows: 10 }, (t) => [sphere({ color: "#00ff00", at: [Math.sin(t), 0, 0] })]);
  assert.equal(fn.meta.palette!.length, 8);
  contract(fn);
});

test("render3d draws over what is in a surface, inside any piece, and keeps its view for the same shapes", () => {
  const shapes = [cube({ spin: [0.5, 0.7, 0], color: "#f97316" })];
  const box = piece({ name: "box", cols: 40, rows: 20, palette: ["#f97316", "#1f2328"] }, (t, s) => {
    s.fill(".");
    render3d(s, shapes, t, { ambient: 0.2 });
    s.write(1, 19, "a cube");
  });
  contract(box);
  const { text, color } = snapshot(box, 1);
  assert.match(text, /^\.+$/m, "the fill shows round it");
  assert.match(text, /a cube/);
  assert.ok([...color!].some((c) => c === 0), "the cube in its colour");
  // the same shapes and options of the same values, written out again each frame, draw the same
  const s = new Surface(40, 20);
  const once = [torus({ spin: [1, 0, 0] })];
  render3d(s, once, 2, { ambient: 0.1 });
  const first = s.frame();
  s.clear();
  render3d(s, [once[0]], 2, { ambient: 0.1 });
  assert.equal(s.frame(), first);
  assert.throws(() => render3d({} as Surface, once, 0), /ascii\.rest: render3d\(\) takes the surface to draw into first/);
  assert.throws(() => render3d(s, "x" as unknown as Shape3d[], 0), /render3d\(\) takes a shape or a list of shapes/);
  // one shape is a list of one
  s.clear();
  render3d(s, once[0], 2, { ambient: 0.1 });
  assert.equal(s.frame(), first);
  assert.throws(() => render3d(s, once, 0, null as unknown as {}), /render3d\(\) takes its options as an object/);
  // a time that isn't a number is taken as 0
  s.clear();
  render3d(s, once, Number.NaN);
  const nan = s.frame();
  s.clear();
  render3d(s, once, 0);
  assert.equal(nan, s.frame());
});

test("scenePalette gives a piece of your own the colours scene() would draw the shapes in, ink first", () => {
  type Pair = { readonly light: readonly string[]; readonly dark: readonly string[] };
  const box = cube({ rotate: [-0.6, 0.7, 0], color: "#f97316" });
  const pal = scenePalette(box) as Pair;
  assert.equal(pal.light.length, 5);
  assert.equal(pal.light[0], "#1f2328");
  assert.equal(pal.dark[0], "#f0f6fc");
  // render3d into a piece with it draws every cell in the very colour scene() draws it in, and text with none in the ink
  const own = piece({ name: "own", cols: 40, rows: 20, palette: pal }, (t, s) => {
    render3d(s, box, t);
    s.write(0, 0, "hi");
  });
  const made = scene({ cols: 40, rows: 20 }, box);
  for (const paper of [false, true]) {
    const a = snapshot(own, 0, { paper }), b = snapshot(made, 0, { paper });
    const ap = own.meta.palette!, bp = made.meta.palette!;
    for (let i = 2; i < 40 * 20; i++) if (b.text.replace(/\n/g, "")[i] !== " ") assert.equal(ap[a.color![i]], bp[b.color![i]], `cell ${i} on ${paper ? "paper" : "a dark page"}`);
    assert.equal(ap[a.color![0]], paper ? "#1f2328" : "#f0f6fc", "the text in the page's ink");
  }
  // nothing coloured: none, unless you give your own; your own come first; a scene's fade; options as render3d's
  assert.equal(scenePalette([sphere(), torus()]), undefined);
  assert.deepEqual(scenePalette(sphere(), {}, ["#123456"]), { light: ["#123456"], dark: ["#123456"] });
  assert.equal((scenePalette(box, {}, { light: ["#000000"], dark: ["#ffffff"] }) as Pair).dark[0], "#ffffff");
  assert.equal((scenePalette(sphere(), { colors: ["#000044", "#8888ff"], shades: 6 }) as Pair).light.length, 7);
  assert.throws(() => scenePalette(box, { zoom: 2 } as {}), /ascii\.rest: scenePalette\(\) has no option "zoom" \(did you mean camera: \{ zoom \}\?\)/);
  assert.throws(() => scenePalette(box, {}, ["blue"]), /a palette takes colours as #rrggbb, not "blue"/);
  assert.throws(() => scenePalette("x" as unknown as Shape3d), /scenePalette\(\) takes a shape, a list of shapes/);
  const many = Array.from({ length: 8 }, (_, i) => sphere({ color: `#${(i * 30).toString(16).padStart(2, "0")}0000` }));
  assert.throws(() => scenePalette(many), /scenePalette\(\): these colours come to 33 a page, 8 colours in 4 shades each and 1 first, past the 32/);
});

test("a frame depends only on t: drawn out of order, it is the same", () => {
  const p = scene({ name: "all", cols: 48, rows: 20, period: 6, colors: ["#334155", "#f8fafc"] }, [
    torus({ spin: [0.8, 0, 0.35], scale: 0.6 }),
    sphere({ radius: 0.3, at: orbit({ radius: 2.5, period: 3, tilt: 0.4 }), texture: "spots" }),
    points("helix", { spin: [0, 1, 0], scale: 0.5, at: [2.5, 0, 0] }),
    parametric((u, v, t) => [u * 2 - 1, 0.2 * Math.sin(6 * u + t), v * 2 - 1], { at: [-2.5, 0, 0], rotate: [0.6, 0, 0] }),
    group([cube({ size: 0.6, spin: 2 }), lines((t) => [[0, 0, 0], [Math.cos(t), 1, 0]])], { at: orbit({ radius: 1.5, period: 6 }), spin: [1, 0, 0] }),
    plane({ at: [0, -2, 0], width: 40, depth: 40, texture: (u, v, t) => 0.5 + 0.5 * Math.sin(TAU * (u * 8 + t / 6)) }),
  ]);
  const fresh = (t: number) => snapshot(p, t);
  const f = p.default();
  const color = new Uint8Array(48 * 20);
  for (const t of [5, 1, 3.3, 0, 1]) {
    const text = f(t, { color });
    const want = fresh(t);
    assert.equal(text, want.text, `t=${t}`);
    assert.deepEqual(color, want.color, `t=${t} colours`);
  }
});

test("scenes play everywhere a piece does: svg() for a README and the terminal", async () => {
  const donut = scene({ name: "donut", cols: 30, rows: 14, period: 2 }, [torus({ spin: [Math.PI, 0, Math.PI] })]);
  const out = svg(donut, { dark: true });
  assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(out, /animation:2s step-end infinite/);
  assert.ok((out.match(/<g class="f k\d+">/g) ?? []).length > 10, "frames of the loop");
  const coloured = scene({ name: "ball", cols: 20, rows: 10 }, [sphere({ color: "#3b82f6" })]);
  assert.match(svg(coloured, { dark: true }), /fill:#3b82f6/);
  assert.equal(await still(donut), snapshot(donut, 0, { mono: true }).text);
});

test("frames are quick: under 4 ms at 64 by 24 and 10 ms at 200 by 100", () => {
  const shapes = () => [torus({ spin: [0.8, 0, 0.35], color: "#f97316" }), sphere({ radius: 0.4, at: orbit({ radius: 3.4, period: 4 }), color: "#3b82f6" }), points("ring", { scale: 1.6, spin: [0, 1, 0] })];
  for (const [cols, rows, budget] of [[64, 24, 4], [200, 100, 10]]) {
    const p = scene({ cols, rows, period: 8 }, shapes());
    const f = p.default();
    const color = new Uint8Array(cols * rows);
    f(0, { color });
    const start = performance.now();
    for (let i = 1; i <= 60; i++) f(i / 30, { color });
    const ms = (performance.now() - start) / 60;
    assert.ok(ms < budget * slack, `${cols} by ${rows}: ${ms.toFixed(2)} ms a frame`);
  }
});

test("the examples are pieces that pass the contract", async () => {
  for (const name of ["donut", "cube", "planet", "crystal", "galaxy", "orrery", "boing", "loader"]) {
    const p = (await import(`../../examples/kit/shapes3d-${name}.ts`)).default as Piece;
    assert.ok(p.meta.loop, `${name} loops`);
    contract(p);
  }
});

test("angles in words, turns or degrees: the same shape as in radians, with no Math.PI", () => {
  const frame = (o: object) => snapshot(scene({ cols: 30, rows: 14 }, cone(o)), 0).text;
  assert.equal(frame({ rotate: "upside-down" }), frame({ rotate: [Math.PI, 0, 0] }));
  assert.equal(frame({ rotate: { turns: [0.5, 0, 0] } }), frame({ rotate: [Math.PI, 0, 0] }));
  assert.equal(frame({ rotate: { degrees: [180, 0, 0] } }), frame({ rotate: [Math.PI, 0, 0] }));
  assert.equal(frame({ rotate: "on-its-side" }), frame({ rotate: [0, 0, Math.PI / 2] }));
  // a spin by word, once round about y in 12, 6 or 3 seconds, so a scene of it loops on that
  for (const [word, loop] of [["slow", 12], ["normal", 6], ["fast", 3]] as const) assert.equal(scene({}, torus({ spin: word })).meta.loop, loop, word);
  assert.equal(scene({}, torus({ spin: { turns: [0, 0.25, 0] } })).meta.loop, 4);
  // light and tilt in words
  const soft = snapshot(scene({ ambient: "soft" }, sphere()), 0).text, none = snapshot(scene({}, sphere()), 0).text;
  assert.notEqual(soft, none);
  assert.equal(snapshot(scene({ camera: { tilt: "above" } }, cube({ spin: 1 })), 1).text, snapshot(scene({ camera: { tilt: 0.45 } }, cube({ spin: 1 })), 1).text);
});

test("a group can turn about the middle of what it holds: an ice cream fills its frame", async () => {
  const { spinning } = await import("./recipes/motion.ts");
  const parts = () => [cone({ rotate: "upside-down" }), sphere({ at: [0, 1.2, 0] })];
  const inkRows = (p: Piece) => {
    const rows = snapshot(p, 1, { mono: true }).text.split("\n");
    const ink = rows.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0);
    return [ink[0], ink.at(-1)!];
  };
  const [top, bottom] = inkRows(spinning(group(parts()), { way: "turntable" }));
  // it was rows 2 to 13 of 22, its origin at the cone's middle; centred on what it holds, it reaches far lower
  assert.ok(bottom - top >= 14, `rows ${top} to ${bottom}`);
  assert.ok(top <= 3 && bottom >= 16, `rows ${top} to ${bottom}`);
  // centred, an orbit still loops
  const orbiting = scene({}, group([sphere(), sphere({ radius: 0.2, at: orbit({ radius: 2, period: 4 }) })], { center: true }));
  assert.equal(orbiting.meta.loop, 4);
  assert.throws(() => group([sphere()], { center: "yes" as never }), /group's center takes true or false/);
});
