// node --test src/kit/vector.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as donut from "../pieces/donut.ts";
import { svg as toSvg } from "../svg.ts";
import type { Piece } from "../types.ts";
import { EMPTY, NONE, Palette, Surface, piece, snapshot } from "./core.ts";
import { drawSvg, fromSvg, paletteOf, parseSvg, partCells, type PartCells, type PartMaterial, type PartPaint } from "./vector.ts";

// The checks scripts/check.ts makes of a frame: rows lines of cols characters, colours inside the palette.
function contract(p: Piece, times = [0, 0.5, 1, 2.5]) {
  const { meta } = p;
  for (const paper of [false, true])
    for (const mono of [false, true]) {
      const color = meta.palette && !mono ? new Uint8Array(meta.cols * meta.rows) : undefined;
      const frame = p.default({ ...meta.options });
      for (const t of times) {
        const text = frame(t, { paper, color });
        const lines = text.split("\n");
        assert.equal(lines.length, meta.rows, `t=${t}: rows`);
        for (const l of lines) assert.equal(l.length, meta.cols, `t=${t}: cols`);
        if (color) for (const c of color) assert.ok(c < meta.palette!.length, `colour ${c} past the palette`);
      }
    }
}

const close = (a: readonly number[], b: readonly number[], eps = 1e-6) =>
  assert.ok(a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= eps), `${JSON.stringify(a)} is not ${JSON.stringify(b)}`);
const box = (d: string, attrs = "") => parseSvg(`<svg viewBox="0 0 100 100"><path ${attrs} d="${d}"/></svg>`).shapes[0].box;
const lines = (text: string) => text.split("\n");
const SQUARE = `<svg viewBox="0 0 10 10"><rect id="sq" width="10" height="10" fill="#2563eb"/></svg>`;
const HEART = `<svg viewBox="0 0 24 24"><path id="heart" fill="#e11d48" d="M12 21C12 21 2 14.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5C22 14.5 12 21 12 21z"/></svg>`;

// --- reading -------------------------------------------------------------------------------------

test("parseSvg reads the viewBox, else width and height, else the ink", () => {
  assert.deepEqual(parseSvg(`<svg viewBox="-5 2 30 40"><circle r="1"/></svg>`).viewBox, [-5, 2, 30, 40]);
  assert.deepEqual(parseSvg(`<svg width="64px" height="32"><circle r="1"/></svg>`).viewBox, [0, 0, 64, 32]);
  close([...parseSvg(`<svg><rect x="3" y="4" width="5" height="6"/></svg>`).viewBox], [3, 4, 5, 6]);
  const s = parseSvg(`<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><!-- a comment --><svg:svg xmlns:svg="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><svg:title>A &amp; B</svg:title><svg:rect width="1" height="1"/></svg:svg>`);
  assert.equal(s.title, "A & B");
  assert.equal(s.shapes.length, 1);
});

test("parseSvg throws for markup with no svg, and an empty svg has no shapes", () => {
  assert.throws(() => parseSvg("<div>hello</div>"), /ascii\.rest: fromSvg takes SVG markup/);
  assert.throws(() => parseSvg(42 as unknown as string), /takes SVG markup as a string/);
  assert.deepEqual(parseSvg("<svg/>").shapes, []);
  assert.deepEqual(parseSvg(`<svg viewBox="0 0 10 10"></svg>`).parts, []);
});

test("path commands, absolute and relative, lines and curves", () => {
  close([...box("M10 10 h10 v10 h-10 z")], [10, 10, 10, 10]);
  close([...box("M10 10 H20 V20 L10 20 Z")], [10, 10, 10, 10]);
  // Pairs after a move are lines, and numbers run together as SVG allows.
  close([...box("M0 0 10 0 10 10")], [0, 0, 10, 10]);
  close([...box("M0,0L10-5.5.5 3")], [0, -5.5, 10, 8.5]);
  // A cubic with both controls at y 10 bulges to 0.75 of that (boxes of curves are as near as their flattening, 0.05).
  close([...box("M0 0 C0 10 10 10 10 0")], [0, 0, 10, 7.5], 0.05);
  close([...box("m0 0 c0 10 10 10 10 0")], [0, 0, 10, 7.5], 0.05);
  // S reflects the last control point: down, then up as far.
  close([...box("M0 0 C0 10 10 10 10 0 S20 -10 20 0")], [0, -7.5, 20, 15], 0.05);
  close([...box("M0 0 c0 10 10 10 10 0 s10 -10 10 0")], [0, -7.5, 20, 15], 0.05);
  // A quadratic reaches half way to its control; T reflects it.
  close([...box("M0 0 Q5 10 10 0 T20 0")], [0, -5, 20, 10], 0.05);
  close([...box("M0 0 q5 10 10 0 t10 0")], [0, -5, 20, 10], 0.05);
  // A command right after a close starts from where its subpath began, 5, 5, so it reaches 0, 0 (from the last point,
  // 5, 15, it would reach only 0, 10).
  close([...box("M5 5 h10 v10 z l-5 -5")], [0, 0, 15, 15]);
});

test("arcs: sweep and large flags, written run together, radii scaled up, zero radii as a line", () => {
  // From 0, 0 to 20, 0 sweeping clockwise on the page: over the top.
  close([...box("M0 10 a10 10 0 0 1 20 0")], [0, 0, 20, 10], 1e-3);
  close([...box("M0 10 A10 10 0 0 0 20 10")], [0, 10, 20, 10], 1e-3);
  // Flags written with no space between them or the next number: large 1, sweep 0, to 10, 0.
  close([...box("M0 0a5 5 0 1010 0")], [0, 0, 10, 5], 1e-3);
  // Radii too small to reach are scaled up until they just do: a half circle of radius 10.
  close([...box("M0 10 A1 1 0 0 1 20 10")], [0, 0, 20, 10], 1e-3);
  // The large arc of a circle of radius 10 through two points 10 apart goes most of the way round.
  const b = box("M0 0 A10 10 0 1 1 10 0");
  assert.ok(b[3] > 18 && b[3] <= 20.001, `large arc height ${b[3]}`);
  close([...box("M0 0 A0 5 0 0 1 10 0")], [0, 0, 10, 0]);
  // An ellipse turned 90 degrees: tall instead of wide.
  const e = box("M0 0 A20 5 90 0 1 0 40");
  assert.ok(e[2] < 6 && e[3] > 39, `rotated arc box ${e}`);
});

test("transforms on groups and shapes: translate, scale, rotate, matrix, skew", () => {
  const s = parseSvg(`<svg viewBox="0 0 100 100">
    <g transform="translate(5 5) rotate(90) scale(2)"><rect width="10" height="10"/></g>
    <rect transform="matrix(1 0 0 1 3 4)" width="2" height="2"/>
    <rect transform="rotate(180, 10, 10)" width="5" height="5"/>
    <g transform="translate(50,50)"><g transform="scale(0.5)"><circle r="10"/></g></g>
    <rect transform="skewX(45)" width="10" height="10"/>
  </svg>`);
  close([...s.shapes[0].box], [-15, 5, 20, 20], 1e-9);
  close([...s.shapes[1].box], [3, 4, 2, 2], 1e-9);
  close([...s.shapes[2].box], [15, 15, 5, 5], 1e-9);
  close([...s.shapes[3].box], [45, 45, 10, 10], 1e-6);
  close([...s.shapes[4].box], [0, 0, 20, 10], 1e-9);
});

test("rects with rounded corners, circles, ellipses, lines, polylines and polygons", () => {
  const s = parseSvg(`<svg viewBox="0 0 100 100">
    <rect x="1" y="2" width="10" height="4" rx="9"/>
    <circle cx="20" cy="20" r="5"/><ellipse cx="40" cy="40" rx="6" ry="3"/>
    <line x1="0" y1="0" x2="10" y2="10" stroke="red"/><polyline points="0,0 5,5 10,0" stroke="red" fill="none"/>
    <polygon points="0 0 10 0 5 8"/><rect width="0" height="5"/><circle r="0"/>
  </svg>`);
  assert.deepEqual(s.shapes.map((x) => x.tag), ["rect", "circle", "ellipse", "line", "polyline", "polygon"]);
  close([...s.shapes[0].box], [1, 2, 10, 4], 1e-9);
  close([...s.shapes[1].box], [15, 15, 10, 10], 1e-6);
  close([...s.shapes[2].box], [34, 37, 12, 6], 1e-6);
  // A stroke's box takes in half its width.
  close([...s.shapes[3].box], [-0.5, -0.5, 11, 11], 1e-9);
  assert.equal(s.shapes[3].fill, null);
  close([...s.shapes[5].box], [0, 0, 10, 8], 1e-9);
  // The rounded rect's outline is made of lines and cubics.
  assert.ok([...s.shapes[0].ops].includes(2));
});

test("styles: inherited, attributes, style=\"\", <style> rules, colours in every notation", () => {
  const s = parseSvg(`<svg viewBox="0 0 10 10" color="#123456">
    <style>.a { fill: #00ff00 } #b { fill: rgb(255, 0, 0) } rect.c { stroke: hsl(240, 100%, 50%); stroke-width: 2 } g path { fill: red }</style>
    <g fill="gold" stroke-width="3" opacity="0.5">
      <rect width="1" height="1"/>
      <rect class="a" width="1" height="1"/>
      <rect id="b" class="a" width="1" height="1" fill="blue"/>
      <rect class="c" width="1" height="1" style="fill:#abc; fill-opacity: 0.5"/>
      <rect width="1" height="1" fill="currentColor"/>
      <rect width="1" height="1" fill="none" stroke="#ff000080"/>
      <rect width="1" height="1" display="none"/>
      <rect width="1" height="1" visibility="hidden"/>
      <rect width="1" height="1" fill-rule="evenodd" fill="rgba(0,0,255,0.5)"/>
    </g>
  </svg>`);
  const sh = s.shapes;
  assert.equal(sh.length, 7);
  assert.equal(sh[0].fill, "#ffd700");
  assert.equal(sh[0].fillOpacity, 0.5);
  assert.equal(sh[1].fill, "#00ff00");
  // An id's rule beats a class's, and a <style> rule beats an attribute.
  assert.equal(sh[2].fill, "#ff0000");
  // style="" beats them all; #abc is #aabbcc; opacity and fill-opacity multiply.
  assert.equal(sh[3].fill, "#aabbcc");
  assert.equal(sh[3].fillOpacity, 0.25);
  assert.equal(sh[3].stroke, "#0000ff");
  assert.equal(sh[3].strokeWidth, 2);
  // currentColor takes the color property when there is one.
  assert.equal(sh[4].fill, "#123456");
  assert.equal(sh[5].fill, null);
  assert.equal(sh[5].stroke, "#ff0000");
  assert.ok(Math.abs(sh[5].strokeOpacity - (0.5 * 128) / 255) < 1e-9);
  assert.equal(sh[6].fillRule, "evenodd");
  assert.equal(sh[6].fillOpacity, 0.25);
  // A shape painted currentColor with no color property is the page's own colour.
  assert.equal(parseSvg(`<svg viewBox="0 0 1 1"><rect width="1" height="1" fill="currentColor"/></svg>`).shapes[0].fill, "currentColor");
});

test("gradients are their stops' mean colour; <use> draws what it points at, moved", () => {
  const s = parseSvg(`<svg viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g"><stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
      <linearGradient id="h" href="#g"/>
      <circle id="dot" r="2" class="dot"/>
    </defs>
    <rect width="10" height="10" fill="url(#g)"/>
    <rect width="10" height="10" fill="url('#h')"/>
    <rect width="10" height="10" fill="url(#missing) #00ff00"/>
    <use href="#dot" x="10" y="20"/><use xlink:href="#dot" x="30" y="40" id="second"/>
  </svg>`);
  assert.equal(s.shapes[0].fill, "#808080");
  assert.equal(s.shapes[1].fill, "#808080");
  assert.equal(s.shapes[2].fill, "#00ff00");
  close([...s.shapes[3].box], [8, 18, 4, 4], 1e-6);
  close([...s.shapes[4].box], [28, 38, 4, 4], 1e-6);
  // Nothing in <defs> is drawn where it stands: only the two uses of the dot.
  assert.equal(s.shapes.length, 5);
  // The dots are black, the default fill, so black is a part too.
  assert.deepEqual([...s.parts].sort(), ["#000000", "#808080", "#dot", "#second", "#00ff00", ".dot"].sort());
});

test("a nested svg and a symbol fit their viewBox into their size", () => {
  const s = parseSvg(`<svg viewBox="0 0 100 100">
    <svg x="10" y="10" width="20" height="20" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>
    <symbol id="s" viewBox="0 0 2 2"><rect width="2" height="2"/></symbol>
    <use href="#s" x="50" y="50" width="10" height="10"/>
  </svg>`);
  close([...s.shapes[0].box], [10, 10, 20, 20], 1e-9);
  close([...s.shapes[1].box], [50, 50, 10, 10], 1e-9);
});

// --- drawing -------------------------------------------------------------------------------------

test("fromSvg makes a normal piece: the frame contract in colour and one ink, on paper and dark pages", () => {
  for (const p of [fromSvg(HEART), fromSvg(HEART, { "#heart": ["pulse", "glint"] }), fromSvg(SQUARE, { style: "blocks" }), fromSvg(SQUARE, { style: "braille" }), fromSvg(HEART, { style: "outline", "*": "spin" })]) contract(p);
  const p = fromSvg(HEART);
  assert.equal(p.meta.name, "vector");
  assert.equal(p.meta.category, "shapes");
  assert.equal(p.meta.fps, 0);
  assert.equal(p.meta.loop, undefined);
  assert.equal(fromSvg(`<svg viewBox="0 0 1 1"><title>Red Dot</title><circle cx=".5" cy=".5" r=".5" fill="red"/></svg>`).meta.name, "red dot");
});

test("a filled square is solid inside its margin, and width, cols and rows, and margin are kept", () => {
  const p = fromSvg(SQUARE, { width: 24 });
  assert.equal(p.meta.cols, 24);
  // 20 columns wide inside the margin, at two columns a row: 10 rows, and one each side.
  assert.equal(p.meta.rows, 12);
  const l = lines(snapshot(p).text);
  assert.equal(l[0].trim(), "");
  assert.equal(l[11].trim(), "");
  for (let r = 1; r <= 10; r++) assert.equal(l[r], "  " + "8".repeat(20) + "  ");
  const q = fromSvg(SQUARE, { cols: 30, rows: 8, margin: 0 });
  assert.deepEqual([q.meta.cols, q.meta.rows], [30, 8]);
  // Fitted: 8 rows tall, so 16 columns wide, centred.
  assert.equal(lines(snapshot(q).text)[3], " ".repeat(7) + "8".repeat(16) + " ".repeat(7));
  assert.equal(fromSvg(SQUARE, { rows: 7, margin: [1, 1] }).meta.cols, 12);
  assert.equal(lines(snapshot(fromSvg(SQUARE, { width: 12, fill: "#" })).text)[2], "  " + "#".repeat(8) + "  ");
});

test("edges take the character whose shape matches them", () => {
  // A square half a row lower than the cells: its top edge is the bottom half of a row.
  const p = fromSvg(`<svg viewBox="0 0 10 10.5"><rect y="0.5" width="10" height="10" fill="#000"/></svg>`, { width: 14, margin: [2, 0], fit: "viewBox" });
  const l = lines(snapshot(p, 0, { mono: true }).text);
  assert.match(l[0], /^ {2}[_.,qpdb]+ {2}$/);
  // A diagonal edge reads as slashes and their kin.
  const tri = lines(snapshot(fromSvg(`<svg viewBox="0 0 20 10"><polygon points="0 10 20 10 20 0" fill="#000"/></svg>`, { width: 24 })).text).join("");
  assert.match(tri, /[/dqp]/);
});

test("fill rules: even-odd leaves a hole where nonzero fills it", () => {
  const ring = (rule: string) =>
    fromSvg(`<svg viewBox="0 0 20 20"><path fill-rule="${rule}" fill="#000" d="M0 0h20v20H0zM5 5h10v10H5z"/></svg>`, { width: 24 });
  const hole = lines(snapshot(ring("evenodd")).text), full = lines(snapshot(ring("nonzero")).text);
  assert.equal(hole[5][12], " ");
  assert.equal(full[5][12], "8");
  // Drawn the other way round, the inner square cuts a hole under nonzero too.
  const back = fromSvg(`<svg viewBox="0 0 20 20"><path fill="#000" d="M0 0h20v20H0zM5 5v10h10V5z"/></svg>`, { width: 24 });
  assert.equal(lines(snapshot(back).text)[5][12], " ");
});

test("colours: the drawing's own, lifted on a dark page; the page's colour for currentColor; none when asked", () => {
  const two = `<svg viewBox="0 0 20 10"><rect width="10" height="10" fill="#000000"/><rect x="10" width="10" height="10" fill="#2563eb"/></svg>`;
  const p = fromSvg(two, { width: 24, margin: 0 });
  assert.ok(p.meta.palette!.includes("#000000") && p.meta.palette!.includes("#2563eb"));
  const dark = snapshot(p, 0), light = snapshot(p, 0, { paper: true });
  // The black half is drawn in the site's light ink on a dark page and as black on paper.
  assert.equal(p.meta.palette![dark.color![2]], "#e8ebef");
  assert.equal(p.meta.palette![light.color![2]], "#000000");
  assert.equal(p.meta.palette![dark.color![20]], "#2563eb");
  // One ink: no palette, and colours are not written.
  assert.equal(fromSvg(two, { color: false }).meta.palette, undefined);
  assert.equal(fromSvg(`<svg viewBox="0 0 2 2"><rect width="2" height="2" fill="currentColor"/></svg>`).meta.palette, undefined);
  // currentColor among colours is the page's text colour.
  const mixed = fromSvg(`<svg viewBox="0 0 20 10"><rect width="10" height="10" fill="currentColor"/><rect x="10" width="10" height="10" fill="#2563eb"/></svg>`, { width: 24, margin: 0 });
  assert.equal(mixed.meta.palette![snapshot(mixed, 0, { paper: true }).color![2]], "#1f2328");
  assert.equal(mixed.meta.palette![snapshot(mixed, 0).color![2]], "#f0f6fc");
  // A part's own colour replaces the shape's.
  const red = fromSvg(SQUARE, { "#sq": { color: "#ff0000" } });
  assert.ok(red.meta.palette!.includes("#ff0000") && !red.meta.palette!.includes("#2563eb"));
});

test("many colours are merged into what a palette holds", () => {
  const rects = Array.from({ length: 70 }, (_, i) => `<rect x="${i}" width="1" height="4" fill="#${(i * 3).toString(16).padStart(2, "0")}${(255 - i * 3).toString(16).padStart(2, "0")}80"/>`).join("");
  const p = fromSvg(`<svg viewBox="0 0 70 4">${rects}</svg>`, { width: 74 });
  assert.ok(p.meta.palette!.length <= 64);
  contract(p, [0]);
});

test("in one ink, white among colours is left out, and where two colours meet the edge shows", () => {
  const logo = fromSvg(`<svg viewBox="0 0 20 20"><rect width="20" height="20" fill="#7c3aed"/><rect x="5" y="5" width="10" height="10" fill="#ffffff"/></svg>`, { width: 24 });
  assert.equal(lines(snapshot(logo, 0, { mono: true }).text)[5][12], " ");
  assert.equal(lines(snapshot(logo).text)[5][12], "8");
  // A blue square over a red one, its edge mid cell: in one ink the edge between them is drawn, not solid.
  const two = fromSvg(`<svg viewBox="0 0 20 10"><rect width="20" height="10" fill="#dc2626"/><rect x="10.5" width="9.5" height="10" fill="#2563eb"/></svg>`, { width: 20, margin: 0 });
  const row = lines(snapshot(two, 0, { mono: true }).text)[3];
  assert.notEqual(row[10], "8");
  assert.equal(row[5], "8");
  assert.equal(row[15], "8");
});

test("a white cut-out stays cut out with color: false, and beside the page's colour; white alone still shows on paper", () => {
  const cut = (base: string) => `<svg viewBox="0 0 20 20"><rect width="20" height="20" fill="${base}"/><rect x="5" y="5" width="10" height="10" fill="#ffffff"/></svg>`;
  // color: false is one ink everywhere, so the white square is a hole in it, as in mono.
  const plain = fromSvg(cut("#7c3aed"), { width: 24, color: false });
  assert.equal(plain.meta.palette, undefined);
  assert.equal(lines(snapshot(plain).text)[5][12], " ");
  assert.equal(lines(snapshot(plain).text)[5][3], "8");
  // An icon in currentColor with a white mark: the mark is cut out in one ink, drawn white in colour.
  const ink = fromSvg(cut("currentColor"), { width: 24 });
  assert.equal(lines(snapshot(ink, 0, { mono: true }).text)[5][12], " ");
  assert.equal(lines(snapshot(ink).text)[5][12], "8");
  // drawSvg with color: false into a coloured grid cuts it out too.
  const s = new Surface(24, 12, { palette: new Palette(["#7c3aed"]) });
  s.mono = false;
  drawSvg(s, cut("#7c3aed"), 0, { color: false, margin: [2, 1] });
  assert.equal(s.get(12, 5), "");
  // A drawing in nothing but white is not a cut-out: on paper it is darkened until it reads.
  const white = fromSvg(`<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#ffffff"/></svg>`, { width: 20 });
  const paper = snapshot(white, 0, { paper: true });
  assert.notEqual(white.meta.palette![paper.color![5 * 20 + 10]], "#ffffff");
  assert.equal(white.meta.palette![snapshot(white).color![5 * 20 + 10]], "#ffffff");
});

test("color: #rrggbb is the colour currentColor takes, the drawing's other colours kept", () => {
  const icon = `<svg viewBox="0 0 20 10" fill="none" stroke="currentColor"><path d="M1 5h8"/><rect x="11" y="1" width="8" height="8" fill="#22c55e" stroke="none"/></svg>`;
  const p = fromSvg(icon, { width: 24, color: "#F97316" });
  assert.ok(p.meta.palette!.includes("#f97316") && p.meta.palette!.includes("#22c55e"));
  assert.ok(!p.meta.palette!.includes("#1f2328"));
  // A drawing in nothing but currentColor becomes a piece in that colour.
  assert.deepEqual(fromSvg(`<svg viewBox="0 0 2 2"><rect width="2" height="2" fill="currentColor"/></svg>`, { color: "#f97316" }).meta.palette, ["#f97316", "#f97316"]);
  assert.throws(() => fromSvg(icon, { color: "orange" }), /color takes true .*, false .*, or #rrggbb for what it draws in currentColor, not "orange"/);
});

test("styles: blocks and braille use their characters, outline draws lines only", () => {
  const blocks = snapshot(fromSvg(HEART, { style: "blocks" })).text.replace(/[\s\n]/g, "");
  assert.ok(blocks.length && [...blocks].every((c) => "▘▝▀▖▌▞▛▗▚▐▜▄▙▟█".includes(c)));
  const braille = snapshot(fromSvg(HEART, { style: "braille" })).text.replace(/[\s\n]/g, "");
  assert.ok(braille.length && [...braille].every((c) => c.charCodeAt(0) > 0x2800 && c.charCodeAt(0) <= 0x28ff));
  const outline = snapshot(fromSvg(HEART, { style: "outline", width: 36 })).text;
  assert.ok([...outline.replace(/[\s\n]/g, "")].every((c) => "-_.'/\\|".includes(c)), outline);
  // The outline of a circle is round: a line each side on its middle row, nothing inside.
  const ring = lines(snapshot(fromSvg(`<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#000"/></svg>`, { style: "outline", width: 24 })).text);
  assert.equal(ring[6].trim()[0], "|");
  assert.equal(ring[6].trim().at(-1), "|");
  assert.equal(ring[6].trim().slice(1, -1).trim(), "");
});

test("strokes: hairlines still show, wide ones are solid, round caps reach past the ends", () => {
  const hair = fromSvg(`<svg viewBox="0 0 20 10"><line x1="0" y1="5" x2="20" y2="5" stroke="#000" stroke-width="0.01"/></svg>`, { width: 24, fit: "viewBox" });
  const row = lines(snapshot(hair).text).find((l) => l.trim());
  assert.ok(row && row.trim().length >= 18, `hairline ${JSON.stringify(row)}`);
  const wide = lines(snapshot(fromSvg(`<svg viewBox="0 0 20 10"><line x1="0" y1="5" x2="20" y2="5" stroke="#000" stroke-width="4"/></svg>`, { width: 24, fit: "viewBox" })).text);
  assert.ok(wide.some((l) => l.includes("8".repeat(16))));
  const butt = parseSvg(`<svg viewBox="0 0 20 10"><line x1="5" y1="5" x2="15" y2="5" stroke="#000" stroke-width="2"/></svg>`).shapes[0];
  const round = parseSvg(`<svg viewBox="0 0 20 10"><line x1="5" y1="5" x2="15" y2="5" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>`).shapes[0];
  assert.equal(butt.cap, "butt");
  assert.equal(round.cap, "round");
  // The line's row is the middle of 6 rows: how many cells of it are drawn.
  const lit = (svg: string) => lines(snapshot(fromSvg(svg, { width: 24, fit: "viewBox", margin: 0 })).text).reduce((n, l) => Math.max(n, l.trim().length), 0);
  assert.ok(lit(`<svg viewBox="0 0 20 10"><line x1="5" y1="5" x2="15" y2="5" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>`) > lit(`<svg viewBox="0 0 20 10"><line x1="5" y1="5" x2="15" y2="5" stroke="#000" stroke-width="2"/></svg>`));
});

// --- parts and motion ----------------------------------------------------------------------------

const MOTIONS = ["spin", "flip", "bob", "pulse", "sway", "blink", "glint", "ripple", "rise", "trace"] as const;

test("every motion word moves its part, the same frame for the same t, and repeats exactly at its period", () => {
  const periods: Record<string, number> = { spin: 4, flip: 4, bob: 2, pulse: 1.6, sway: 4, blink: 4, glint: 4, ripple: 2, rise: 4, trace: 4 };
  for (const m of MOTIONS) {
    const p = fromSvg(HEART, { width: 32, "#heart": m });
    assert.equal(p.meta.fps, 30, m);
    assert.equal(p.meta.loop, periods[m], m);
    const f = p.default(), g = p.default();
    const frames = new Set<string>();
    for (const t of [0, 0.3, 0.7, 1.1, 1.6, 2.2, 2.9, 3.5, 3.97]) frames.add(f(t));
    assert.ok(frames.size >= 2, `${m} does not move`);
    // A frame depends only on t: drawn after another t, or by another play, or a loop later, it is the same.
    for (const t of [0.7, 2.2]) {
      const a = f(t);
      f(t + 1.3);
      assert.equal(f(t), a, `${m} at ${t}`);
      assert.equal(g(t), a, `${m} at ${t}, another play`);
      assert.equal(f(t + periods[m]), a, `${m} a period later`);
    }
    contract(p, [0, 1.3]);
  }
});

test("trace draws a line from its start, holds it whole, then wipes it from its start; a fill is traced round, then filled", () => {
  // The columns with ink in them, first and last, or null for none.
  const span = (p: Piece, t: number) => {
    const at = new Set<number>();
    for (const l of lines(snapshot(p, t).text)) [...l].forEach((c, x) => c !== " " && at.add(x));
    return at.size ? [Math.min(...at), Math.max(...at)] : null;
  };
  const line = fromSvg(`<svg viewBox="0 0 20 4"><path id="l" d="M0 2H20" stroke="#000" stroke-width="2"/></svg>`, { cols: 22, rows: 5, margin: 1, fit: "viewBox", "#l": "trace" });
  assert.equal(line.meta.loop, 4);
  assert.equal(span(line, 0), null);
  // A quarter of the way round, half of it is traced, from its start at the left.
  const half = span(line, 1)!;
  assert.equal(half[0], 1);
  assert.ok(half[1] >= 9 && half[1] <= 12, `${half}`);
  assert.deepEqual(span(line, 2.6), [1, 20]);
  // Then it is wiped from where it began, and gone as the next tracing starts.
  const wiped = span(line, 3.6)!;
  assert.ok(wiped[0] >= 10 && wiped[0] <= 12 && wiped[1] === 20, `${wiped}`);
  assert.equal(span(line, 4), null);
  // Its still for reduced motion is a moment it is whole.
  assert.equal(line.meta.still, 2.6);
  assert.equal(fromSvg(SQUARE, { "#sq": "trace", still: 0 }).meta.still, 0);
  // A fill is a line round its edge while it is traced, and filled while it is held.
  const plain = snapshot(fromSvg(SQUARE, { width: 24 })).text;
  const sq = fromSvg(SQUARE, { width: 24, "#sq": "trace" });
  assert.equal(snapshot(sq, 2.6).text, plain);
  const tracing = lines(snapshot(sq, 1.2).text);
  assert.equal(tracing[5][12], " ");
  assert.ok(tracing.join("").trim().length > 0);
  // In the outline style its lines are traced the same way.
  const out = fromSvg(SQUARE, { width: 24, style: "outline", "#sq": "trace" });
  const count = (t: number) => snapshot(out, t).text.replace(/\s/g, "").length;
  assert.equal(snapshot(out, 2.6).text, snapshot(fromSvg(SQUARE, { width: 24, style: "outline" })).text);
  assert.ok(count(1) > 0 && count(1) < count(2.6));
  assert.equal(count(0), 0);
  contract(out, [0, 1, 2.6, 3.6]);
});

test("motions take room: a spinning square never leaves its margin", () => {
  const p = fromSvg(SQUARE, { width: 30, "#sq": "spin" });
  const f = p.default();
  for (let t = 0; t < 4; t += 0.1) {
    const l = lines(f(t));
    assert.equal(l[0].trim(), "", `t=${t} top`);
    assert.equal(l[l.length - 1].trim(), "", `t=${t} bottom`);
    for (const row of l) assert.equal(row.slice(0, 2) + row.slice(-2), "    ", `t=${t} sides`);
  }
  // With fit: "viewBox" the size is the drawing's own, motions or not.
  assert.equal(fromSvg(SQUARE, { width: 30, fit: "viewBox", "#sq": "spin" }).meta.rows, fromSvg(SQUARE, { width: 30, fit: "viewBox" }).meta.rows);
});

test("parts by id, class, colour and *: a group moves as one, a class moves each, the more specific wins", () => {
  const svg = `<svg viewBox="0 0 40 10"><g id="pair"><rect class="b" x="0" width="10" height="10" fill="#ff0000"/><rect class="b" x="30" width="10" height="10" fill="#0000ff"/></g></svg>`;
  for (const key of ["#pair", ".b", "#ff0000", "#f00", "*"]) {
    const p = fromSvg(svg, { width: 44, [key]: "bob" } as never);
    assert.equal(p.meta.fps, 30, key);
  }
  // A colour names only what is painted in it: the blue square stays still while the red one bobs.
  const p = fromSvg(svg, { width: 44, "#ff0000": "bob" }).default();
  const a = lines(p(0)), b = lines(p(0.5));
  assert.notEqual(a.map((l) => l.slice(0, 22)).join(""), b.map((l) => l.slice(0, 22)).join(""));
  assert.equal(a.map((l) => l.slice(22)).join(""), b.map((l) => l.slice(22)).join(""));
  // Hidden by false or hide: true, a part is left out, and the drawing fits what is left.
  const hidden = snapshot(fromSvg(svg, { width: 44, "#0000ff": false, fit: "viewBox" })).text;
  assert.ok(!lines(hidden).some((l) => l.slice(30).includes("8")));
  assert.deepEqual(lines(snapshot(fromSvg(svg, { width: 44, "#0000ff": { hide: true }, fit: "viewBox" })).text), lines(hidden));
  // The more specific part wins: an id's fill over a class's.
  const f = snapshot(fromSvg(`<svg viewBox="0 0 10 10"><rect id="r" class="c" width="10" height="10" fill="#000"/></svg>`, { width: 14, ".c": { fill: "@" }, "#r": { fill: "#" } })).text;
  assert.ok(f.includes("#") && !f.includes("@"));
});

test("motions nest: a shape spins about its own centre while the whole drawing carries it", () => {
  const svg = `<svg viewBox="0 0 40 40"><rect x="5" y="15" width="10" height="10" fill="#000"/><rect id="small" x="22" y="16" width="8" height="8" fill="#2563eb"/></svg>`;
  const both = lines(snapshot(fromSvg(svg, { width: 44, fit: "viewBox", "*": { motion: "bob", amount: 2 }, "#small": "spin" }), 0.5).text);
  const spin = lines(snapshot(fromSvg(svg, { width: 44, fit: "viewBox", "#small": "spin" }), 0.5).text);
  // Bobbing two rows up at a quarter of its period, the spun drawing is the spin alone, two rows higher.
  for (let r = 0; r + 2 < spin.length; r++) assert.equal(both[r], spin[r + 2], `row ${r}`);
});

test("several matched by a class can be staggered; rise shares its period out by default", () => {
  const svg = `<svg viewBox="0 0 30 30"><circle class="o" cx="5" cy="25" r="2" fill="#000"/><circle class="o" cx="15" cy="25" r="2" fill="#000"/><circle class="o" cx="25" cy="25" r="2" fill="#000"/></svg>`;
  const together = lines(fromSvg(svg, { width: 34, ".o": { motion: "bob", amount: 3 } }).default()(0.5));
  const apart = lines(fromSvg(svg, { width: 34, ".o": { motion: "bob", amount: 3, stagger: 0.5 } }).default()(0.5));
  const rowOf = (l: string[], col: number) => l.findIndex((row) => row[col] !== " ");
  assert.equal(rowOf(together, 4), rowOf(together, 29));
  assert.notEqual(rowOf(apart, 4), rowOf(apart, 29));
  const rise = lines(fromSvg(svg, { width: 34, ".o": { motion: "rise", amount: 6 } }).default()(1));
  assert.notEqual(rowOf(rise, 4), rowOf(rise, 17));
});

test("a glint changes only its part's cells, only while it crosses, and lights them in the palette's lighter runs", () => {
  const svg = `<svg viewBox="0 0 40 10"><rect id="a" width="18" height="10" fill="#2563eb"/><rect id="b" x="22" width="18" height="10" fill="#16a34a"/></svg>`;
  const p = fromSvg(svg, { width: 44, "#a": "glint" });
  assert.equal(p.meta.loop, 4);
  // Three runs of each colour for each page: as drawn, then twice lighter.
  assert.equal(p.meta.palette!.length, 6);
  const still = snapshot(p, 0).text, mid = snapshot(p, 1.2);
  assert.equal(snapshot(p, 3).text, still);
  const a = lines(still), b = lines(mid.text);
  assert.ok(b.some((l) => l.slice(0, 22).includes("/")));
  assert.deepEqual(b.map((l) => l.slice(22)), a.map((l) => l.slice(22)));
  assert.ok([...mid.color!].some((c) => p.meta.palette![c] !== "#2563eb" && p.meta.palette![c] !== "#16a34a"));
  // In one ink it still shows, by its slashes.
  assert.ok(snapshot(p, 1.2, { mono: true }).text.includes("/"));
});

test("a ripple moves a shape's top and keeps its bottom", () => {
  const p = fromSvg(`<svg viewBox="0 0 40 20"><rect id="w" width="40" height="20" fill="#0284c7"/></svg>`, { width: 44, "#w": { motion: "ripple", amount: 1 } }).default();
  const a = lines(p(0)), b = lines(p(0.5));
  const lastInk = (l: string[]) => l.reduce((last, row, i) => (row.trim() ? i : last), -1);
  assert.notEqual(a.slice(0, 4).join("\n"), b.slice(0, 4).join("\n"));
  assert.equal(a[lastInk(a)], b[lastInk(b)]);
});

test("options and parts are checked when the piece is made, with errors that say what to change", () => {
  assert.throws(() => fromSvg(HEART, { "#hart": "spin" }), /part "#hart" names nothing in this svg: it has "#heart" and "#e11d48"/);
  assert.throws(() => fromSvg(HEART, { "#heart": "twirl" as never }), /takes a motion, spin, flip, bob, pulse, sway, blink, glint, ripple, rise and trace/);
  assert.throws(() => fromSvg(HEART, { wdth: 40 } as never), /fromSvg has no option named "wdth": it takes width/);
  assert.throws(() => fromSvg(HEART, { width: 2 }), /width takes a whole number from 3 to 320, not 2/);
  assert.throws(() => fromSvg(HEART, { width: 40, cols: 40 }), /width or cols, not both/);
  assert.throws(() => fromSvg(HEART, { style: "fancy" as never }), /style takes "logo", "outline", "blocks" and "braille"/);
  assert.throws(() => fromSvg(HEART, { fill: "ab" }), /fill takes one character other than a space/);
  assert.throws(() => fromSvg(HEART, { margin: -1 }), /margin takes whole numbers of 0 or more/);
  assert.throws(() => fromSvg(HEART, { color: "yes" as never }), /color takes true/);
  assert.throws(() => fromSvg(HEART, { fit: "box" as never }), /fit takes "ink" or "viewBox"/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: "glint", period: 2 } }), /comes now and then: give it every/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: "spin", every: 2 } }), /goes round and round: give it period/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: "spin", period: 0 } }), /period takes a number above 0/);
  assert.throws(() => fromSvg(HEART, { "#heart": { spin: true } as never }), /#heart has no option named "spin"/);
  assert.throws(() => fromSvg(HEART, { "#heart": { color: "red" } }), /color takes #rrggbb/);
  assert.throws(() => fromSvg(HEART, { "#heart": { material: 5 as never } }), /material takes a material such as water\(\)/);
  assert.throws(() => fromSvg(HEART, { "#": "spin" } as never), /a part's name takes an id, a class or a colour/);
  assert.throws(() => fromSvg(`<svg viewBox="0 0 10 10"><rect width="5" height="5" fill="none"/></svg>`), /found nothing to draw/);
  assert.throws(() => fromSvg(HEART, { width: 6, margin: 3 }), /margin of 3 columns and 3 rows leaves no room/);
  assert.throws(() => fromSvg(HEART, { ground: "black" }), /ground takes a colour as #rrggbb/);
  assert.throws(() => fromSvg(HEART, { fps: 90 }), /fps takes a whole number from 0 to 60/);
});

// --- origins and motions of your own -------------------------------------------------------------------

// A hand from the middle of a 40 by 40 drawing to its right edge, and a dot that keeps the middle inked.
const DIAL = `<svg viewBox="0 0 40 40"><rect id="hand" x="20" y="19" width="16" height="2" fill="#000"/><circle cx="20" cy="20" r="1" fill="#000"/></svg>`;
const inkCols = (text: string) => {
  const cols = new Set<number>();
  for (const l of lines(text)) for (let c = 0; c < l.length; c++) if (l[c] !== " ") cols.add(c);
  return [...cols].sort((a, b) => a - b);
};

test("origin: a part turns about its centre by default, about a point or a side when given one", () => {
  const at = (origin?: unknown) =>
    snapshot(fromSvg(DIAL, { width: 44, fit: "viewBox", "#hand": { motion: "spin", ...(origin ? { origin } : {}) } } as never), 2).text;
  // Half a turn about its own centre, the hand lies where it was drawn, right of the middle (column 22).
  assert.ok(inkCols(at()).at(-1)! >= 36, at());
  // Half a turn about the middle of the dial, a clock hand's pivot, it points left.
  const pivot = inkCols(at([20, 20]));
  assert.ok(pivot[0] <= 8 && pivot.at(-1)! <= 24, at([20, 20]));
  assert.deepEqual(inkCols(at("left")), pivot);
  // Sway leans from the bottom by default; from the top it is a pendulum, its top held.
  const bar = `<svg viewBox="0 0 20 40"><rect id="p" x="9" y="0" width="2" height="40" fill="#000"/></svg>`;
  const lean = (o: object) => lines(snapshot(fromSvg(bar, { cols: 30, rows: 20, fit: "viewBox", "#p": { motion: "sway", amount: 0.3, ...o } }), 1).text);
  const plant = lean({}), pendulum = lean({ origin: "top" });
  // Where a row's ink sits, by its middle column: the bar stands at column 15.
  const mid = (l: string) => {
    const c = [...l].flatMap((ch, i) => (ch === " " ? [] : [i]));
    return (c[0] + c.at(-1)!) / 2;
  };
  assert.ok(Math.abs(mid(plant[18]) - 15) <= 1.5 && Math.abs(mid(plant[1]) - 15) >= 5, plant.join("\n"));
  assert.ok(Math.abs(mid(pendulum[1]) - 15) <= 1.5 && Math.abs(mid(pendulum[18]) - 15) >= 5, pendulum.join("\n"));
});

test("a function of t moves a part: x in columns, y in rows, turned and grown about its origin", () => {
  const svg = `<svg viewBox="0 0 40 20"><rect id="b" x="15" y="5" width="10" height="10" fill="#000"/></svg>`;
  const o = { width: 44, fit: "viewBox" } as const;
  const base = lines(snapshot(fromSvg(svg, o)).text);
  const moved = lines(snapshot(fromSvg(svg, { ...o, "#b": () => ({ x: 3, y: 2 }) })).text);
  // Exactly 3 columns right and 2 rows down.
  for (let r = 0; r + 2 < base.length; r++) assert.equal(moved[r + 2], " ".repeat(3) + base[r].slice(0, -3), `row ${r}`);
  // A quarter turn of a square is the square; scale 0 leaves nothing.
  assert.deepEqual(lines(snapshot(fromSvg(svg, { ...o, "#b": () => ({ rotate: Math.PI / 2 }) })).text), base);
  assert.equal(snapshot(fromSvg(svg, { ...o, "#b": () => ({ scale: 0 }) })).text.trim(), "");
  // Grown 1.5 times across only, about its left side, it reaches 5 columns further right.
  const wide = inkCols(snapshot(fromSvg(svg, { ...o, "#b": { motion: () => ({ scale: [1.5, 1] }), origin: "left" } })).text);
  assert.deepEqual([wide[0], wide.at(-1)], [inkCols(base.join("\n"))[0], inkCols(base.join("\n")).at(-1)! + 5]);
});

test("a function's period sets the loop, without one there is none, and its frames depend only on t", () => {
  const bounce = (t: number) => ({ y: -3 * Math.abs(Math.sin((Math.PI * t) / 1.5)) });
  const p = fromSvg(SQUARE, { width: 30, "#sq": { motion: bounce, period: 1.5 } });
  assert.equal(p.meta.loop, 1.5);
  assert.equal(p.meta.fps, 30);
  const q = fromSvg(SQUARE, { width: 30, "#sq": bounce });
  assert.equal(q.meta.loop, undefined);
  assert.equal(q.meta.fps, 30);
  // With a word that has a period, a function with none still leaves the loop unknown.
  assert.equal(fromSvg(HEART, { "#heart": "pulse", "*": (t: number) => ({ x: Math.sin(t) }) }).meta.loop, undefined);
  const f = p.default(), g = p.default();
  const a = f(0.4);
  f(1.1);
  assert.equal(f(0.4), a);
  assert.equal(g(0.4), a);
  assert.equal(f(0.4 + 1.5), a);
  assert.notEqual(f(0.75), f(0));
  contract(p, [0, 0.3, 0.75]);
  // The room it takes is measured: a bounce of 3 rows stays inside the frame.
  for (let t = 0; t < 1.5; t += 0.05) assert.equal(lines(f(t))[0].trim(), "", `t=${t}`);
});

test("a motion in rows moves that many rows when the drawing is fitted to the room it takes", () => {
  // In a fixed size the room for the bob shrinks the square, which makes a row more of the svg's units: the scale is
  // found that fits its own room, so 3 rows are 3 rows, not 2.975 (a sliver over a cell edge).
  for (const size of [{ width: 30 }, { cols: 30, rows: 14 }, { cols: 40, rows: 9 }]) {
    const p = fromSvg(SQUARE, { ...size, "#sq": { motion: "bob", amount: 3 } }).default();
    const top = (t: number) => lines(p(t)).findIndex((l) => l.trim());
    // Bob's peak is a quarter of its 2 s period in: 3 rows above where it rests at t = 0, and 3 below at three quarters.
    assert.equal(top(0) - top(0.5), 3, JSON.stringify(size));
    assert.equal(top(1.5) - top(0), 3, `${JSON.stringify(size)}\n${p(1.5)}`);
    assert.equal(lines(p(1.5)).at(-1)!.trim(), "");
    assert.equal(lines(p(0.5))[0].trim(), "");
  }
});

test("origins and motion functions are checked when the piece is made", () => {
  assert.throws(() => fromSvg(HEART, { "#heart": () => 5 as never }), /#heart's motion function returns a pose, \{ x, y, rotate, scale \}/);
  assert.throws(() => fromSvg(HEART, { "#heart": () => ({ x: "1" }) as never }), /returns a pose/);
  assert.throws(() => fromSvg(HEART, { "#heart": () => ({ spin: 1 }) as never }), /returns a pose/);
  assert.throws(() => fromSvg(HEART, { "#heart": () => ({ scale: [1] }) as never }), /returns a pose/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: () => ({}), amount: 2 } }), /amount is for motion words/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: () => ({}), every: 2 } }), /every is for blink and glint/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: "spin", origin: "middle" as never } }), /origin takes "center", "top"/);
  assert.throws(() => fromSvg(HEART, { "#heart": { motion: "spin", origin: [1] as never } }), /or a point \[x, y\]/);
  assert.throws(() => fromSvg(HEART, { "#heart": () => ({ y: 1e308 }) }), /out to infinity|names nothing|found nothing/);
  // A pose that turns to nonsense later is drawn as no move rather than breaking the frame.
  const p = fromSvg(HEART, { "#heart": { motion: (t: number) => (t > 1 ? { x: NaN } : {}), period: 2 } });
  contract(p, [0, 1.5]);
});

test("a glint that comes more often than its sweep still repeats exactly", () => {
  const p = fromSvg(SQUARE, { width: 30, "#sq": { motion: "glint", every: 1 } });
  assert.equal(p.meta.loop, 1);
  const f = p.default();
  let glinted = 0;
  for (let t = 0; t < 1; t += 0.1) {
    assert.equal(f(t + 1), f(t), `t=${t}`);
    assert.equal(f(t + 3), f(t), `t=${t}`);
    if (f(t).includes("/")) glinted++;
  }
  assert.ok(glinted > 2 && glinted < 10, `glinting in ${glinted} of 10 frames`);
});

test("char draws every cell of a part in one character, in every style, and keeps a white part seen", () => {
  const svg = `<svg viewBox="0 0 40 20"><rect id="sea" width="40" height="20" fill="#0284c7"/><circle class="b" cx="12" cy="10" r="3" fill="#ffffff"/><circle class="b" cx="28" cy="8" r="2" fill="#ffffff"/></svg>`;
  const o = { width: 44, "#sea": { char: "~" }, ".b": { char: "o" } } as const;
  const text = snapshot(fromSvg(svg, o)).text;
  assert.deepEqual([...new Set(text.replace(/[\s\n]/g, ""))].sort(), ["o", "~"]);
  // In one ink white is left out, unless a part gave it a character: the bubbles still show.
  assert.ok(snapshot(fromSvg(svg, o), 0, { mono: true }).text.includes("o"));
  assert.ok(!snapshot(fromSvg(svg, { width: 44 }), 0, { mono: true }).text.includes("o"));
  // On paper a white given a character is darkened to be seen; without one it stays white, a cut-out.
  const p = fromSvg(svg, o), plain = fromSvg(svg, { width: 44 });
  const paper = snapshot(p, 0, { paper: true }), dark = snapshot(p, 0);
  // A cell of a bubble, by where its "o" is: grid cells and the frame's characters line up once newlines are out.
  const k = paper.text.replace(/\n/g, "").indexOf("o");
  assert.notEqual(p.meta.palette![paper.color![k]], "#ffffff");
  assert.equal(p.meta.palette![dark.color![k]], "#ffffff");
  assert.equal(plain.meta.palette![snapshot(plain, 0, { paper: true }).color![k]], "#ffffff");
  // Blocks, braille and outline take it too.
  for (const style of ["blocks", "braille", "outline"] as const)
    assert.deepEqual([...new Set(snapshot(fromSvg(svg, { ...o, style })).text.replace(/[\s\n]/g, ""))].sort(), ["o", "~"], style);
  assert.throws(() => fromSvg(svg, { "#sea": { char: "~~" } }), /#sea's char takes one character other than a space/);
});

// --- hostile and awkward markup ---------------------------------------------------------------------

test("markup nested however deep, uses of their own ancestors and uses that multiply out are handled", () => {
  // Deeper than any editor exports: read without overflowing the stack; past 256 groups, left out.
  assert.equal(parseSvg(`<svg viewBox="0 0 10 10">${"<g>".repeat(100000)}<rect width="5" height="5"/>${"</g>".repeat(100000)}</svg>`).shapes.length, 0);
  assert.equal(parseSvg(`${"<div>".repeat(100000)}<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>`).shapes.length, 1);
  assert.equal(parseSvg(`<svg viewBox="0 0 10 10">${"<g>".repeat(200)}<rect width="5" height="5"/>${"</g>".repeat(200)}</svg>`).shapes.length, 1);
  // A <use> of a group it is inside is not followed, as SVG says.
  assert.equal(parseSvg(`<svg viewBox="0 0 10 10"><g id="a"><rect width="1" height="1"/><use href="#a"/><use href="#a"/></g></svg>`).shapes.length, 1);
  assert.equal(parseSvg(`<svg viewBox="0 0 10 10"><symbol id="s"><rect width="1" height="1"/><use href="#s"/></symbol><use href="#s"/></svg>`).shapes.length, 1);
  // Uses of uses ten wide and nine deep, a billion rects: refused at once, saying why.
  let defs = `<g id="a0"><rect width="1" height="1"/></g>`;
  for (let i = 1; i < 10; i++) defs += `<g id="a${i}">${`<use href="#a${i - 1}"/>`.repeat(10)}</g>`;
  const t0 = performance.now();
  assert.throws(() => parseSvg(`<svg viewBox="0 0 10 10"><defs>${defs}</defs><use href="#a9"/></svg>`), /up to 200000 elements, each <use> counting what it draws again/);
  assert.ok(performance.now() - t0 < 2000);
});

test("non-finite coordinates, paint servers that are not there, and text are left out, and say so", () => {
  const s = parseSvg(`<svg viewBox="0 0 10 10"><path fill="#000" d="M0 0L1e400 5L0 10z"/><rect width="1" height="1" fill="url(#nothing)"/>
    <linearGradient id="empty"/><rect width="1" height="1" fill="url(#empty)"/><rect id="ok" width="2" height="2" fill="#f00"/></svg>`);
  assert.deepEqual(s.shapes.map((x) => x.id), ["ok"]);
  const words = `<svg viewBox="0 0 100 20"><text x="0" y="15">Hello</text><image href="a.png" width="10" height="10"/></svg>`;
  assert.deepEqual(parseSvg(words).skipped, ["text", "image"]);
  assert.throws(() => fromSvg(words), /found nothing to draw in this svg.*it has text and image, which fromSvg leaves out: turn text to outlines/);
  assert.deepEqual(parseSvg(HEART).skipped, []);
});

test("character references past the last code point, titles with control characters, and options that are not an object", () => {
  // A browser shows the replacement character; it is not an error.
  assert.equal(parseSvg(`<svg viewBox="0 0 1 1"><title>a&#x110000;b&#xD800;c&#99999999999;</title><rect width="1" height="1"/></svg>`).title, "a�b�c�");
  // The title is the piece's name: one line, its control characters and line breaks as spaces.
  const p = fromSvg(`<svg viewBox="0 0 1 1"><title> Red&#7;&#10;Dot </title><rect width="1" height="1"/></svg>`);
  assert.equal(p.meta.name, "red dot");
  // Only the drawing's own title names it, not a group's tooltip; a title of nothing is none.
  assert.equal(parseSvg(`<svg viewBox="0 0 1 1"><g><title>a tooltip</title><rect width="1" height="1"/></g></svg>`).title, null);
  assert.equal(fromSvg(`<svg viewBox="0 0 1 1"><title>&#7;</title><rect width="1" height="1"/></svg>`).meta.name, "vector");
  assert.throws(() => fromSvg(SQUARE, [] as never), /fromSvg takes options as an object/);
  assert.throws(() => drawSvg(new Surface(4, 4), SQUARE, 0, [] as never), /drawSvg takes options as an object/);
  assert.throws(() => drawSvg(new Surface(4, 4), SQUARE, 0, null as never), /drawSvg takes options as an object/);
  assert.throws(() => drawSvg(new Surface(4, 4), SQUARE, 0, { region: { x: 0, y: 0, cols: 4 } as never }), /drawSvg's region takes \{ x, y, cols, rows \}/);
  assert.throws(() => paletteOf(SQUARE, [] as never), /paletteOf takes options as an object/);
});

test("a fill or stroke a browser can't read is ignored, so the group's is taken; var() takes its fallback", () => {
  const s = parseSvg(`<svg viewBox="0 0 10 10"><g fill="#ff0000" stroke="#0000ff">
    <rect width="1" height="1" fill="bogus"/>
    <rect width="1" height="1" fill="#00ff00" style="fill: notacolour"/>
    <rect width="1" height="1" fill="var(--brand, #123456)" stroke="var(--line)"/>
    <rect width="1" height="1" fill="#00ff00" style="fill: inherit"/>
  </g></svg>`);
  assert.deepEqual(s.shapes.map((x) => x.fill), ["#ff0000", "#00ff00", "#123456", "#ff0000"]);
  assert.deepEqual(s.shapes.map((x) => x.stroke), ["#0000ff", "#0000ff", "#0000ff", "#0000ff"]);
});

test("a \"#\" name is an id when an element has it, and a colour only when none does", () => {
  // "#add" is both an id here and a colour (#aadddd's short form): the id wins, and ranks as an id, over a colour
  // given after it.
  const svg = `<svg viewBox="0 0 20 10"><rect id="add" width="10" height="10" fill="#0000ff"/><rect x="10" width="10" height="10" fill="#aadddd"/></svg>`;
  const p = fromSvg(svg, { width: 24, margin: 0, "#add": { color: "#ff0000" }, "#0000ff": { color: "#00ff00" } });
  const c = snapshot(p).color!;
  assert.equal(p.meta.palette![c[5 * 24 + 4]], "#ff0000");
  assert.equal(p.meta.palette![c[5 * 24 + 18]], "#aadddd");
  // With no element of that id, it names the colour.
  const q = fromSvg(svg.replace(`id="add" `, ""), { width: 24, margin: 0, "#add": { color: "#ff0000" } });
  assert.equal(q.meta.palette![snapshot(q, 0, { paper: true }).color![5 * 24 + 18]], "#ff0000");
});

test("rows crossed by many edges fill by their rule", () => {
  // Thirty teeth, 60 crossings a row; drawn twice over, nonzero fills them and even-odd cancels them out.
  const comb = Array.from({ length: 30 }, (_, i) => `M${i * 4} 0h2v10h-2z`).join("");
  const teeth = (rule: string, d: string) => lines(snapshot(fromSvg(`<svg viewBox="0 0 120 10"><path fill="#000" fill-rule="${rule}" d="${d}"/></svg>`, { width: 124, fit: "viewBox" })).text)[3];
  assert.equal(teeth("nonzero", comb), "  " + "88  ".repeat(30).trimEnd() + "    ");
  assert.equal(teeth("nonzero", comb + comb), teeth("nonzero", comb));
  assert.equal(teeth("evenodd", comb + comb).trim(), "");
  // And the frame stays quick for a scribble of 20,000 points.
  const pts = Array.from({ length: 20000 }, (_, i) => `${(5 + 4 * Math.cos(i)).toFixed(3)} ${(5 + 4 * Math.sin(i * 1.0001)).toFixed(3)}`).join(" ");
  const p = fromSvg(`<svg viewBox="0 0 10 10"><polygon fill="#000" points="${pts}"/></svg>`, { width: 80 });
  const t0 = performance.now();
  snapshot(p);
  assert.ok(performance.now() - t0 < 2000, `${performance.now() - t0} ms`);
});

test("thousands of colours are merged quickly into what a palette holds", () => {
  const rects = Array.from({ length: 3000 }, (_, i) => `<rect x="${i % 60}" y="${Math.floor(i / 60)}" width="1" height="1" fill="#${((i * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(-6)}"/>`).join("");
  const t0 = performance.now();
  const p = fromSvg(`<svg viewBox="0 0 60 50">${rects}</svg>`, { width: 64 });
  assert.ok(performance.now() - t0 < 2000, `${performance.now() - t0} ms`);
  assert.ok(p.meta.palette!.length <= 64);
  contract(p, [0]);
});

test("sizes: given none, a tall drawing is kept to 24 rows; given a width, it follows its shape", () => {
  const tall = `<svg viewBox="0 0 10 40"><rect width="10" height="40" fill="#000"/></svg>`;
  const p = fromSvg(tall);
  assert.equal(p.meta.rows, 24);
  // 22 rows inside the margin at two columns a row is 11 columns wide, and one each side twice.
  assert.equal(p.meta.cols, 15);
  assert.equal(fromSvg(tall, { width: 24 }).meta.rows, 42);
  // A wide drawing keeps the 48 columns.
  assert.deepEqual([fromSvg(SQUARE).meta.cols, fromSvg(SQUARE).meta.rows], [48, 24]);
});

test("on paper a colour too pale to read is darkened; white and colours that read are left as drawn", () => {
  const svg = `<svg viewBox="0 0 30 10"><rect width="10" height="10" fill="#cbd5e1"/><rect x="10" width="10" height="10" fill="#ffffff"/><rect x="20" width="10" height="10" fill="#2563eb"/></svg>`;
  const p = fromSvg(svg, { width: 34, margin: 0 });
  const paper = snapshot(p, 0, { paper: true }).color!;
  const lum = (h: string) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const grey = p.meta.palette![paper[5 * 34 + 5]];
  assert.notEqual(grey, "#cbd5e1");
  assert.ok(1.05 / (lum(grey) + 0.05) >= 2, grey);
  assert.equal(p.meta.palette![paper[5 * 34 + 15]], "#ffffff");
  assert.equal(p.meta.palette![paper[5 * 34 + 28]], "#2563eb");
  // On a dark page the grey reads as drawn.
  assert.equal(p.meta.palette![snapshot(p).color![5 * 34 + 5]], "#cbd5e1");
});

test("a moving piece with no loop of its own takes the drawing's period, as the kit's time rule says", () => {
  const svg = `<svg viewBox="0 0 40 20"><rect width="40" height="20" fill="#475569"/><circle id="window" cx="20" cy="10" r="8" fill="#000"/></svg>`;
  assert.equal((donut.meta as { loop?: number }).loop, undefined);
  assert.equal(fromSvg(svg, { width: 44, "#window": donut }).meta.loop, undefined);
  assert.equal(fromSvg(svg, { width: 44, "#window": donut, "*": "pulse" }).meta.loop, 1.6);
});

test("drawSvg tells motion functions apart, and a material can't fill the outline style", () => {
  const s = new Surface(30, 12);
  drawSvg(s, SQUARE, 0, { "#sq": () => ({ x: -4 }), margin: [6, 1] });
  const left = s.toString();
  s.clear();
  drawSvg(s, SQUARE, 0, { "#sq": () => ({ x: 4 }), margin: [6, 1] });
  assert.notEqual(s.toString(), left);
  assert.throws(() => fromSvg(SQUARE, { style: "outline", "#sq": Surface.from("ab") }), /material has nothing to fill in the "outline" style/);
});

// --- materials -------------------------------------------------------------------------------------

test("partCells works out a part's cells, its edge, which way is in and how deep", () => {
  const cover = new Float32Array(8 * 6);
  for (let y = 1; y < 5; y++) for (let x = 1; x < 7; x++) cover[y * 8 + x] = 1;
  cover[1 * 8 + 1] = 0.4;
  const c = partCells(cover, 8, 6);
  assert.equal(c.list.length, 6 * 4 - 1);
  assert.deepEqual([c.x0, c.y0, c.x1, c.y1], [1, 1, 7, 5]);
  assert.equal(c.inside[1 * 8 + 1], 0);
  assert.equal(c.border[2 * 8 + 1], 1);
  assert.equal(c.border[2 * 8 + 3], 0);
  assert.ok(c.has(2, 2) && !c.has(0, 0) && !c.has(-1, 3));
  // On the left edge, in is to the right; on the bottom, in is up.
  assert.ok(c.nx[3 * 8 + 1] > 0.9);
  assert.ok(c.ny[4 * 8 + 3] < -0.9);
  assert.equal(c.depth[2 * 8 + 1], 0);
  assert.ok(c.depth[2 * 8 + 3] > 0);
  assert.equal(c.top[3], 1);
  assert.equal(c.bottom[3], 4);
  assert.equal(c.left[2], 1);
  assert.equal(c.right[2], 6);
  assert.equal(c.level, null);
  assert.ok(c.placed.test(3.5, 2.5));
  const none = partCells(new Float32Array(6), 3, 2);
  assert.equal(none.list.length, 0);
  assert.deepEqual([none.x0, none.x1], [0, 0]);
  assert.equal(none.outline().cells.length, 0);
});

test("partCells outlines a part as the kit's materials outline an area: sides, corners, and a fringe on a shallow slope", () => {
  const cover = new Float32Array(8 * 6);
  for (let y = 1; y < 5; y++) for (let x = 1; x < 7; x++) cover[y * 8 + x] = 1;
  const c = partCells(cover, 8, 6);
  const at = (style?: "line" | "round") => {
    const o = c.outline(style), out = new Map<number, string>();
    o.cells.forEach((k, j) => out.set(k, String.fromCharCode(o.chars[j])));
    return out;
  };
  const line = at();
  assert.equal(line.get(1 * 8 + 1), ".");
  assert.equal(line.get(1 * 8 + 3), "-");
  assert.equal(line.get(4 * 8 + 3), "_");
  assert.equal(line.get(2 * 8 + 1), "|");
  assert.equal(line.get(2 * 8 + 6), "|");
  assert.equal(line.has(2 * 8 + 3), false);
  assert.equal(at("round").get(2 * 8 + 1), "(");
  assert.equal(at("round").get(2 * 8 + 6), ")");
  // Worked out once for each style.
  assert.equal(c.outline(), c.outline());
  // A top that rises across the row: the cells just above it that it passes through are its fringe, "_" then ".".
  const slope = new Float32Array(12 * 6);
  for (let x = 1; x < 11; x++) {
    slope[2 * 12 + x] = x / 12;
    for (let y = 3; y < 6; y++) slope[y * 12 + x] = 1;
  }
  const s = partCells(slope, 12, 6);
  assert.equal(s.fringe[2 * 12 + 3], 1);
  assert.equal(s.inside[2 * 12 + 3], 0);
  const f = s.outline();
  const char = (k: number) => String.fromCharCode(f.chars[[...f.cells].indexOf(k)]);
  assert.equal(char(2 * 12 + 3), "_");
  assert.equal(char(2 * 12 + 5), ".");
});

test("a material that outlines its part, as glass does, draws through fromSvg; one that never repeats leaves no loop", () => {
  const rim: PartMaterial = {
    colors: { light: ["#64748b"], dark: ["#cbd5e1"] },
    period: Infinity,
    prepare(c) {
      const o = c.outline();
      return (_t: number, p: PartPaint) => o.cells.forEach((k, j) => p.s.put(k, o.chars[j], p.color(0)));
    },
  };
  const p = fromSvg(SQUARE, { width: 24, "#sq": rim });
  assert.equal(p.meta.fps, 30);
  assert.equal(p.meta.loop, undefined);
  const l = lines(snapshot(p).text);
  assert.equal(l[5], "  |                  |  ");
  assert.match(l[1], /^ {2}\.-+\. {2}$/);
  contract(p, [0, 1]);
});

test("a material fills its part: it is prepared once with the part's cells, draws in its own colours, sees what is under it", () => {
  let prepared = 0;
  let seen: PartCells | null = null;
  const stripes: PartMaterial = {
    colors: { light: ["#0369a1", "#38bdf8"], dark: ["#38bdf8", "#bae6fd"] },
    period: 2,
    prepare(c) {
      prepared++;
      seen = c;
      return (t: number, p: PartPaint) => {
        for (const k of c.list) p.s.put(k, (Math.floor(k / c.cols + t) % 2 ? "=" : "-").charCodeAt(0), p.color(k % 2));
        assert.equal(p.under.chars.length, c.cols * c.rows);
      };
    },
  };
  const svg = `<svg viewBox="0 0 40 20"><rect width="40" height="20" fill="#475569"/><rect id="w" x="10" y="5" width="20" height="10" fill="#0284c7"/></svg>`;
  const p = fromSvg(svg, { width: 44, "#w": stripes });
  assert.equal(p.meta.loop, 2);
  assert.ok(["#0369a1", "#38bdf8", "#bae6fd"].every((c) => p.meta.palette!.includes(c)));
  const f = p.default();
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const a = f(0, { color });
  assert.ok(a.includes("=") && a.includes("-"));
  assert.ok([...color].some((c) => p.meta.palette![c] === "#bae6fd"));
  f(1, { color });
  assert.equal(prepared, 1);
  assert.ok(seen && (seen as PartCells).list.length > 50);
  // In one ink and on paper too: each of those four plays prepares it once more.
  contract(p, [0, 1]);
  assert.equal(prepared, 5);
  // The same material object drives several pieces, each prepared for its own.
  fromSvg(svg, { width: 30, "#w": stripes }).default()(0);
  assert.equal(prepared, 6);
});

test("any piece fills a part: it plays inside it, its colours added, and the drawing's loop follows it", () => {
  const svg = `<svg viewBox="0 0 40 20"><rect width="40" height="20" fill="#475569"/><circle id="window" cx="20" cy="10" r="8" fill="#000"/></svg>`;
  const p = fromSvg(svg, { width: 44, "#window": donut });
  assert.equal(p.meta.fps, 30);
  const frame = snapshot(p, 1).text;
  // The donut's characters appear inside the window, and the frame still keeps the contract.
  assert.ok(/[.,\-~:;=!*#$@]/.test(frame));
  contract(p, [0, 1]);
  assert.equal(snapshot(p, 1).text, frame);
  // A grid fills a part as a still.
  const grid = Surface.from("ab\ncd");
  const g = snapshot(fromSvg(svg, { width: 44, "#window": grid })).text;
  assert.ok(g.includes("ab") && g.includes("cd"));
});

// --- drawSvg and export ------------------------------------------------------------------------------

test("drawSvg draws into a region of a grid you have, its colours the nearest of the grid's", () => {
  const s = new Surface(30, 10, { palette: new Palette(["#000000", "#ff0000", "#00ff00"]) });
  s.paper = true;
  s.mono = false;
  drawSvg(s, HEART, 0, { region: { x: 10, y: 2, cols: 12, rows: 6 } });
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 30; x++) if (x < 10 || x >= 22 || y < 2 || y >= 8) assert.equal(s.get(x, y), "", `${x},${y}`);
  assert.ok(s.get(15, 4) !== "");
  // #e11d48 is nearest red.
  assert.equal(s.colorAt(15, 4), 1);
  // Called again, as a drawing does every frame, it draws the same.
  const once = s.toString();
  s.clear();
  drawSvg(s, HEART, 0, { region: { x: 10, y: 2, cols: 12, rows: 6 } });
  assert.equal(s.toString(), once);
  // On a grid with no palette, in one ink; in a piece with motion, frame by frame.
  const plain = new Surface(20, 8);
  drawSvg(plain, parseSvg(HEART), 0);
  assert.equal(plain.colorAt(10, 4), NONE);
  const badge = piece({ name: "badge", cols: 24, rows: 10, palette: ["#e11d48"] }, (t, g) => drawSvg(g, HEART, t, { "#heart": "pulse", margin: 1 }));
  contract(badge, [0, 0.4, 0.8]);
  assert.notEqual(snapshot(badge, 0).text, snapshot(badge, 0.4).text);
  assert.throws(() => drawSvg(null as never, HEART, 0), /drawSvg takes the grid to draw into first/);
  assert.throws(() => drawSvg(plain, HEART, 0, { width: 3 } as never), /drawSvg has no option named "width"/);
});

test("paletteOf gives a piece drawing with drawSvg the drawing's own colours, exact on both pages", () => {
  const two = `<svg viewBox="0 0 20 10"><rect width="10" height="10" fill="#000000"/><rect x="10" width="10" height="10" fill="#2563eb"/></svg>`;
  const pal = paletteOf(two)!;
  assert.deepEqual(pal, { light: ["#000000", "#2563eb"], dark: ["#e8ebef", "#2563eb"] });
  const p = piece({ name: "pair", cols: 20, rows: 10, palette: pal }, (t, s) => drawSvg(s, two, t));
  const own = fromSvg(two, { cols: 20, rows: 10, margin: 0 });
  // The same colours, cell for cell, as fromSvg draws the same drawing, on paper and on a dark page.
  for (const paper of [true, false]) {
    const a = snapshot(p, 0, { paper }), b = snapshot(own, 0, { paper });
    assert.equal(a.text, b.text);
    assert.deepEqual([...a.color!].map((i) => p.meta.palette![i]), [...b.color!].map((i) => own.meta.palette![i]));
  }
  // A glinting part brings its lighter runs; a drawing in the page's own colour has none.
  assert.equal(paletteOf(two, { "#2563eb": "glint" })!.light.length, 6);
  assert.equal(paletteOf(`<svg viewBox="0 0 2 2"><rect width="2" height="2" fill="currentColor"/></svg>`), undefined);
  assert.equal(paletteOf(two, { color: false }), undefined);
});

test("fromSvg pieces export to an SVG and leave empty cells EMPTY", () => {
  const p = fromSvg(HEART, { "#heart": "pulse" });
  const out = toSvg(p);
  assert.match(out, /^<svg/);
  assert.ok(out.length > 1000);
  const s = new Surface(p.meta.cols, p.meta.rows);
  assert.equal(s.chars[0], EMPTY);
  // The same parsed drawing makes several pieces.
  const doc = parseSvg(HEART);
  assert.equal(snapshot(fromSvg(doc, { width: 20 })).text, snapshot(fromSvg(HEART, { width: 20 })).text);
});
