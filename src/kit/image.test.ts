// node --test src/kit/image.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
import { svg } from "../svg.ts";
import type { Piece } from "../types.ts";
import { mulberry32, piece, rgb, snapshot } from "./core.ts";
import { CH, CW, FILL, GLYPHS, GX, GY } from "./glyphs.ts";
import { drawImage, drawing, fromDrawing, fromImage, fromPixels, imagePalette, readPng, type Drawing, type ImagePiece } from "./image.ts";

type RGBA = [number, number, number, number];

// An image w by h from a colour for each pixel.
function image(w: number, h: number, at: (x: number, y: number) => RGBA): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(at(x, y), (y * w + x) * 4);
  return data;
}
const CLEAR: RGBA = [0, 0, 0, 0];
const inside = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1;
// A 64 by 64 image clear but for a red square from 16 to 48.
const square = () => image(64, 64, (x, y) => (inside(x, y, 16, 16, 48, 48) ? [220, 30, 30, 255] : CLEAR));

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

// --- a PNG writer, to test the reader against ---------------------------------------------------------------

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(kind: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  out.set([...kind].map((c) => c.charCodeAt(0)), 4);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((at, p) => (out.set(p, at), at + p.length), 0);
  return out;
};
const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PASSES = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

interface Png {
  width: number;
  height: number;
  depth: number;
  type: number;
  /** The samples of each pixel, as stored: `channels` of them, 0 to 2^depth - 1. */
  at: (x: number, y: number) => number[];
  plte?: number[][];
  trns?: number[];
  interlace?: boolean;
}

// Writes a PNG: each row filtered by the next of the five filters in turn, the data split over two IDATs.
function writePng(p: Png): Uint8Array<ArrayBuffer> {
  const channels = CHANNELS[p.type], bits = channels * p.depth, bpp = Math.max(1, bits >> 3);
  const rows: Uint8Array[] = [];
  let n = 0;
  for (const [x0, y0, dx, dy] of p.interlace ? PASSES : [[0, 0, 1, 1]]) {
    const w = Math.ceil((p.width - x0) / dx), h = Math.ceil((p.height - y0) / dy);
    if (w <= 0 || h <= 0) continue;
    const stride = Math.ceil((w * bits) / 8);
    let prev = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const raw = new Uint8Array(stride);
      for (let x = 0; x < w; x++)
        p.at(x0 + x * dx, y0 + y * dy).forEach((v, c) => {
          const k = x * channels + c;
          if (p.depth === 16) (raw[2 * k] = v >> 8), (raw[2 * k + 1] = v & 255);
          else if (p.depth === 8) raw[k] = v;
          else raw[(k * p.depth) >> 3] |= v << (8 - p.depth - ((k * p.depth) & 7));
        });
      const filter = n++ % 5, out = new Uint8Array(stride + 1);
      out[0] = filter;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? raw[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
        out[i + 1] = (raw[i] - pred) & 255;
      }
      rows.push(out);
      prev = raw;
    }
  }
  const z = deflateSync(concat(rows));
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, p.width);
  new DataView(ihdr.buffer).setUint32(4, p.height);
  ihdr.set([p.depth, p.type, 0, 0, p.interlace ? 1 : 0], 8);
  const half = z.length >> 1;
  return concat([
    Uint8Array.from(SIGNATURE),
    chunk("IHDR", ihdr),
    ...(p.plte ? [chunk("PLTE", Uint8Array.from(p.plte.flat()))] : []),
    ...(p.trns ? [chunk("tRNS", Uint8Array.from(p.trns))] : []),
    chunk("IDAT", z.subarray(0, half)),
    chunk("IDAT", z.subarray(half)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

// What a reader should give for a PNG: RGBA, 8 bits a channel.
function expected(p: Png): Uint8Array {
  const max = (1 << p.depth) - 1;
  const eight = (v: number) => (p.depth === 16 ? v >> 8 : Math.round((v * 255) / max));
  // tRNS for grey and RGB: the one sample value, 16 bits stored, that is clear
  const key = p.trns && (p.type === 0 || p.type === 2) ? Array.from({ length: CHANNELS[p.type] }, (_, i) => (p.trns![2 * i] << 8) | p.trns![2 * i + 1]) : null;
  return image(p.width, p.height, (x, y) => {
    const s = p.at(x, y);
    if (p.type === 3) return [...(p.plte![s[0]] as [number, number, number]), p.trns?.[s[0]] ?? 255];
    if (p.type === 0) return [eight(s[0]), eight(s[0]), eight(s[0]), key && s[0] === key[0] ? 0 : 255];
    if (p.type === 4) return [eight(s[0]), eight(s[0]), eight(s[0]), eight(s[1])];
    const a = p.type === 6 ? eight(s[3]) : key && s.every((v, i) => v === key[i]) ? 0 : 255;
    return [eight(s[0]), eight(s[1]), eight(s[2]), a];
  });
}

// Seeded samples, so every pixel is different and the filters have something to do.
function samples(seed: number, channels: number, depth: number) {
  const r = mulberry32(seed);
  const cache = new Map<string, number[]>();
  return (x: number, y: number) => {
    const k = `${x},${y}`;
    if (!cache.has(k)) cache.set(k, Array.from({ length: channels }, () => Math.floor(r() * (1 << depth))));
    return cache.get(k)!;
  };
}

// --- the glyphs and the drawing ---------------------------------------------------------------------------

test("the glyph table is what the image module measures by: 2 by 4 blocks of 0 to 1, the inkiest 1", () => {
  assert.equal(GX * GY, 8);
  assert.deepEqual([CW, CH, FILL], [24, 48, "8"]);
  assert.equal(GLYPHS.length, 25);
  assert.ok(GLYPHS.some((g) => g.ch === FILL));
  for (const g of GLYPHS) {
    assert.equal(g.ch.length, 1);
    assert.equal(g.v.length, GX * GY);
    for (const v of g.v) assert.ok(v >= 0 && v <= 1, `${g.ch}: ${v}`);
  }
  assert.equal(Math.max(...GLYPHS.flatMap((g) => g.v)), 1);
  // "_" is ink at the bottom only, "'" at the top only.
  const under = GLYPHS.find((g) => g.ch === "_")!.v, tick = GLYPHS.find((g) => g.ch === "'")!.v;
  assert.ok(under[6] > 0.4 && under[0] === 0);
  assert.ok(tick[0] > 0 && tick[6] === 0);
});

test("a filled square is all FILL inside a margin of 2 columns and 1 row", () => {
  const d = drawing(square(), 64, 64);
  assert.equal(d.style, "logo");
  assert.deepEqual([d.cols, d.rows], [48, 24]);
  assert.equal(d.art[0].trim(), "");
  assert.equal(d.art[d.rows - 1].trim(), "");
  for (let y = 1; y < d.rows - 1; y++) assert.equal(d.art[y], "  " + FILL.repeat(d.cols - 4) + "  ", `row ${y}`);
  assert.equal(d.colors.length, 1);
  assert.deepEqual(d.colors[0], [220, 30, 30]);
  assert.equal(d.knocked, false);
  assert.equal(d.ground, null);
  // one colour: every drawn cell is colour 0
  for (const l of d.ink) assert.match(l, /^[ 0]+$/);
});

test("an edge takes the glyph whose shape matches it", () => {
  // a disc: solid inside, and round its edge the characters whose ink lies where the disc's does
  const disc = image(96, 96, (x, y) => (Math.hypot(x - 47.5, y - 47.5) < 44 ? [0, 0, 0, 255] : CLEAR));
  const d = drawing(disc, 96, 96, { width: 24 });
  const chars = new Set(d.art.join(""));
  assert.ok(chars.has(FILL));
  assert.ok([...chars].every((ch) => ch === " " || GLYPHS.some((g) => g.ch === ch)), [...chars].join(""));
  assert.ok(chars.size >= 6, `round its edge: ${[...chars].join("")}`);
  // the top row's ink is low in its cells, the bottom row's high: "_" or "." above, "'" or '"' below, never the other way
  const lines = d.art.filter((l) => l.trim());
  const top = d.art.indexOf(lines[0]), bottom = d.art.lastIndexOf(lines[lines.length - 1]);
  assert.match(d.art[top].trim(), /^[_.,pqdbo]+/);
  assert.doesNotMatch(d.art[top], /['"^]/);
  assert.doesNotMatch(d.art[bottom], /[_.,]/);
});

test("a transparent image is blank, and so is its piece", () => {
  const d = drawing(new Uint8Array(40 * 20 * 4), 40, 20);
  assert.deepEqual([d.cols, d.rows], [48, 13]);
  for (const l of [...d.art, ...d.mono, ...d.ink]) assert.equal(l, " ".repeat(d.cols));
  assert.deepEqual(d.colors, [[0, 0, 0]]);
  // nothing to glint across: a still, whatever was asked
  const p = fromPixels(new Uint8Array(40 * 20 * 4), 40, 20, { glint: true });
  assert.equal(p.meta.fps, 0);
  assert.equal(p.meta.loop, undefined);
  assert.equal(snapshot(p, 3).text.trim(), "");
  contract(p);
});

test("a plain background is taken out from the edges inwards, and the same colour inside stays", () => {
  // a blue disc on white, with a white dot in it
  const disc = image(60, 60, (x, y) => {
    const r = Math.hypot(x - 30, y - 30);
    return r < 4 ? [255, 255, 255, 255] : r < 22 ? [30, 80, 200, 255] : [255, 255, 255, 255];
  });
  const before = disc.slice();
  const d = drawing(disc, 60, 60, { width: 30 });
  assert.deepEqual(disc, before, "the caller's pixels are left as they were");
  assert.equal(d.ground, "#ffffff");
  assert.equal(d.style, "logo");
  // trimmed to the disc: its corners are clear
  assert.equal(d.art[1][2], " ");
  // the white dot is one of its colours, and in one ink it is left out
  assert.equal(d.colors.length, 2);
  assert.ok(d.colors.some(([r, g, b]) => r > 215 && g > 215 && b > 215));
  assert.equal(d.knocked, true);
  const mid = Math.floor(d.rows / 2), c = Math.floor(d.cols / 2);
  assert.equal(d.art[mid][c], FILL);
  assert.equal(d.mono[mid][c], " ");
  assert.equal(d.ink[mid][c], String(d.colors.findIndex(([r]) => r > 215)));

  // kept, the whole image is drawn: solid edge to edge, and it is not taken for a photo
  const kept = drawing(disc, 60, 60, { width: 30, background: "keep" });
  assert.equal(kept.ground, null);
  assert.equal(kept.style, "logo");
  for (let y = 1; y < kept.rows - 1; y++) assert.equal(kept.art[y].trim(), FILL.repeat(kept.cols - 4));
});

test("an image all one colour is all background, and blank, unless the background is kept", () => {
  const solid = image(8, 8, () => [10, 200, 90, 255]);
  const d = drawing(solid, 8, 8);
  assert.equal(d.ground, "#0ac85a");
  assert.equal(d.art.join("").trim(), "");
  const one = drawing(image(1, 1, () => [10, 200, 90, 255]), 1, 1, { background: "keep", width: 10 });
  assert.deepEqual([one.cols, one.rows], [10, 5]);
  for (let y = 1; y < 4; y++) assert.equal(one.art[y], "  888888  ");
});

test("an image with no plain ground is a photo, shaded by brightness; the ramp turns round on paper", () => {
  // dark to light across, its border not one colour
  const ramp = image(80, 40, (x) => [x * 3, x * 3, x * 3, 255]);
  const d = drawing(ramp, 80, 40, { width: 24 });
  assert.equal(d.style, "shade");
  assert.equal(d.ground, null);
  const row = d.art[Math.floor(d.rows / 2)].trim();
  assert.equal(row[0], ".");
  assert.equal(row.at(-1), "@");
  const order = ".:-=+*#%@";
  for (let i = 1; i < row.length; i++) assert.ok(order.indexOf(row[i]) >= order.indexOf(row[i - 1]), row);

  const p = fromPixels(ramp, 80, 40, { width: 24, color: false });
  const y = Math.floor(d.rows / 2);
  const dark = snapshot(p, 0).text.split("\n")[y], light = snapshot(p, 0, { paper: true }).text.split("\n")[y];
  assert.equal(dark.trim(), row);
  assert.equal(light.trim()[0], "@");
  assert.equal(light.trim().at(-1), ".");
  // in colour too, by default; invert: false keeps it as drawn, and true turns it on a dark page as well
  const coloured = fromPixels(ramp, 80, 40, { width: 24 });
  assert.equal(snapshot(coloured, 0, { paper: true }).text.split("\n")[y], light);
  assert.equal(snapshot(fromPixels(ramp, 80, 40, { width: 24, invert: false }), 0, { paper: true }).text.split("\n")[y], dark);
  assert.equal(snapshot(fromPixels(ramp, 80, 40, { width: 24, invert: true }), 0).text.split("\n")[y], light);

  // a ramp that starts with a space: the darkest cells are spaces, but they have ink, so on paper they turn dense
  const spaced = drawing(ramp, 80, 40, { width: 24, ramp: "standard" });
  assert.equal(spaced.art[y][2], " ");
  assert.notEqual(spaced.ink[y][2], " ");
  const std = fromPixels(ramp, 80, 40, { width: 24, ramp: "standard", color: false });
  assert.equal(snapshot(std, 0).text.split("\n")[y].slice(2, 3), " ");
  assert.equal(snapshot(std, 0, { paper: true }).text.split("\n")[y].slice(2, 3), "@");
  // and the margin stays blank on paper
  assert.equal(snapshot(std, 0, { paper: true }).text.split("\n")[0].trim(), "");

  // a ramp of your own, and the logo style asked for on a photo
  assert.match(drawing(ramp, 80, 40, { width: 24, ramp: "blocks" }).art.join(""), /█/);
  assert.equal(drawing(ramp, 80, 40, { width: 24, style: "logo" }).art[y].trim(), FILL.repeat(20));
  // and the shade style asked for on a logo: the red square, one brightness, is one shade
  assert.match(drawing(square(), 64, 64, { style: "shade" }).art[5].trim(), /^(.)\1+$/);
  // a shading records its ramp, so it can be turned round from the drawing alone
  assert.equal(d.ramp, order);
  assert.equal(spaced.ramp, " .:-=+*#%@");
});

test("a photo keeps being shaded with its background kept; a logo on a plain ground is drawn as one", () => {
  // noise: no plain ground, so a photo either way
  const noise = mulberry32(7);
  const photo = image(80, 40, () => [noise() * 255, noise() * 255, noise() * 255, 255]);
  assert.equal(drawing(photo, 80, 40, { width: 20 }).style, "shade");
  assert.equal(drawing(photo, 80, 40, { width: 20, background: "keep" }).style, "shade");
  // a disc on white: a logo, its ground taken out or kept
  const disc = image(60, 60, (x, y) => (Math.hypot(x - 30, y - 30) < 22 ? [30, 80, 200, 255] : [255, 255, 255, 255]));
  assert.equal(drawing(disc, 60, 60, { width: 30 }).style, "logo");
  assert.equal(drawing(disc, 60, 60, { width: 30, background: "keep" }).style, "logo");
});

test("an image of one brightness is shaded by how bright it is, not all in one end of the ramp", () => {
  const flat = (v: number) => image(40, 40, () => [v, v, v, 255]);
  const row = (v: number) => drawing(flat(v), 40, 40, { style: "shade", background: "keep", width: 12 }).art[2].trim();
  assert.match(row(255), /^@+$/);
  assert.match(row(0), /^\.+$/);
  assert.match(row(128), /^[=+]+$/);
});

test("a shading's colours read on a light page; a logo's are its own", () => {
  const lum = (h: string) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const [r, g, b] = rgb(h);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const onWhite = (h: string) => 1.05 / (lum(h) + 0.05);
  // light greys, shaded: drawn on paper no lighter than a grey of 2.4 against it
  const ramp = image(80, 40, (x) => [160 + x, 160 + x, 160 + x, 255]);
  const d = drawing(ramp, 80, 40, { width: 24 });
  const n = d.colors.length;
  assert.ok(d.colors.some((c) => onWhite(hexOf(c)) < 2), `a light grey among ${JSON.stringify(d.colors)}`);
  const pal = fromPixels(ramp, 80, 40, { width: 24 }).meta.palette!;
  for (const c of pal.slice(0, n)) assert.ok(onWhite(c) >= 2.39, `${c} on paper: ${onWhite(c).toFixed(2)}`);
  // a logo's yellow stays its own yellow on paper, as /make/ draws it
  const yellow = fromPixels(image(20, 20, (x, y) => (inside(x, y, 4, 4, 16, 16) ? [255, 212, 59, 255] : CLEAR)), 20, 20, { width: 16 }).meta.palette!;
  assert.equal(yellow[0], "#ffd43b");
});
const hexOf = (c: readonly number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

test("colours are quantised to the image's own, and every cell's colour is in the palette", () => {
  // three bars, red, green and blue, with clear gaps between them so no pixel blends two
  const bars: RGBA[] = [[230, 40, 40, 255], [40, 200, 60, 255], [40, 60, 230, 255]];
  const img = image(100, 34, (x, y) => (y >= 2 && y < 32 && x >= 2 && (x - 2) % 34 < 28 ? bars[Math.floor((x - 2) / 34)] : CLEAR));
  const d = drawing(img, 100, 34, { width: 40 });
  assert.equal(d.style, "logo");
  assert.equal(d.colors.length, 3, JSON.stringify(d.colors));
  for (const bar of bars) assert.ok(d.colors.some((c) => c.every((v, i) => Math.abs(v - bar[i]) < 4)), `${bar} in ${JSON.stringify(d.colors)}`);
  // each bar's cells take its colour
  const y = Math.floor(d.rows / 2);
  // trimmed to the bars, 96 pixels from x = 2, across the columns inside the margin
  const at = (k: number) => d.colors[parseInt(d.ink[y][Math.floor(2 + ((d.cols - 4) * (34 * k + 14)) / 96)], 36)];
  bars.forEach((bar, k) => assert.ok(at(k).every((v, i) => Math.abs(v - bar[i]) < 4), `bar ${k}: ${at(k)}`));

  const p = fromPixels(img, 100, 34, { width: 40 });
  const n = 3;
  assert.equal(p.meta.palette!.length, 6 * n);
  contract(p);
  // drawn colours only, no glint: 0 to n - 1 on paper, 3n to 4n - 1 on a dark page
  const onPaper = snapshot(p, 0, { paper: true }).color!, onDark = snapshot(p, 0).color!;
  for (const c of onPaper) assert.ok(c < n);
  for (const c of onDark) assert.ok(c >= 3 * n && c < 4 * n);
  assert.equal(new Set(onPaper).size, 3);

  // more colours than 8 come down to 8 at most
  const many = image(90, 30, (x) => [(x * 37) % 256, (x * 91) % 256, (x * 53) % 256, 255]);
  const m = drawing(many, 90, 30, { width: 40, style: "logo", background: "keep" });
  assert.ok(m.colors.length >= 2 && m.colors.length <= 8, `${m.colors.length} colours`);
  for (const l of m.ink) for (const ch of l) assert.ok(ch === " " || parseInt(ch, 36) < m.colors.length);
});

test("on a dark page a black is drawn light and a dark colour is lifted; beside white, or shaded, a black stays a grey", () => {
  const black = image(20, 20, (x, y) => (inside(x, y, 4, 4, 16, 16) ? [0, 0, 0, 255] : CLEAR));
  const p = fromPixels(black, 20, 20, { width: 16 });
  const pal = p.meta.palette!;
  assert.equal(pal[0], "#000000");
  assert.equal(pal[3], "#e8ebef");
  const navy = fromPixels(image(20, 20, (x, y) => (inside(x, y, 4, 4, 16, 16) ? [20, 30, 110, 255] : CLEAR)), 20, 20, { width: 16 }).meta.palette!;
  assert.equal(navy[0], "#141e6e");
  assert.notEqual(navy[3], "#141e6e");

  // a black shape with a white one in it: drawn light, the black would swallow the white on a dark page
  const eye = image(40, 40, (x, y) => (inside(x, y, 14, 14, 26, 26) ? [255, 255, 255, 255] : inside(x, y, 4, 4, 36, 36) ? [0, 0, 0, 255] : CLEAR));
  const both = fromPixels(eye, 40, 40, { width: 24 });
  const d = drawing(eye, 40, 40, { width: 24 });
  const n = d.colors.length, k = d.colors.findIndex(([r]) => r < 64);
  assert.equal(n, 2);
  const lifted = both.meta.palette![3 * n + k];
  assert.notEqual(lifted, "#e8ebef");
  assert.match(lifted, /^#([0-9a-f]{2})\1\1$/, `a grey: ${lifted}`);
  assert.ok(parseInt(lifted.slice(1, 3), 16) < 128, `and a dark one: ${lifted}`);
  // shaded, a black is the darkest shade, so it stays dark too
  const ramp = image(80, 40, (x) => [x * 3, x * 3, x * 3, 255]);
  const shaded = drawing(ramp, 80, 40, { width: 24 });
  const j = shaded.colors.findIndex((c) => Math.max(...c) < 64);
  assert.ok(j >= 0, JSON.stringify(shaded.colors));
  const sp = fromPixels(ramp, 80, 40, { width: 24 }).meta.palette!;
  assert.ok(parseInt(sp[3 * shaded.colors.length + j].slice(1, 3), 16) < 128, sp[3 * shaded.colors.length + j]);
});

test("width and height are respected: never wider or taller than asked, the image's shape kept", () => {
  for (const [w, h] of [[64, 64], [200, 50], [30, 300], [1, 1], [500, 1], [640, 400]]) {
    const img = image(w, h, () => [200, 100, 50, 255]);
    for (const width of [8, 9, 17, 48, 49, 64, 80, 320]) {
      const d = drawing(img, w, h, { width, background: "keep" });
      assert.ok(d.cols <= width, `${w}x${h} at ${width}: ${d.cols} cols`);
      assert.ok(d.rows <= 120, `${w}x${h} at ${width}: ${d.rows} rows`);
      assert.equal(d.art.length, d.rows);
      for (const l of d.art) assert.equal(l.length, d.cols);
    }
    const d = drawing(img, w, h, { width: 80, height: 20, background: "keep" });
    assert.ok(d.rows <= 20 && d.cols <= 80);
  }
  // a square fills the width; a cell is twice as tall as wide, so it has half as many rows
  const sq = drawing(square(), 64, 64, { width: 30 });
  assert.deepEqual([sq.cols, sq.rows], [30, 15]);
  // 8 by 5 fills 64 columns (/make/ makes it 65, a column past what was asked)
  assert.deepEqual([drawing(image(640, 400, () => [200, 100, 50, 255]), 640, 400, { width: 64, background: "keep" }).cols], [64]);
  // a tall image is limited by the rows, as /make/ keeps a logo to 32 with height: 32
  const tall = drawing(image(10, 100, () => [200, 100, 50, 255]), 10, 100, { width: 80, height: 32, background: "keep" });
  assert.equal(tall.rows, 32);
  assert.ok(tall.cols < 20);
});

// --- the piece --------------------------------------------------------------------------------------------

test("the glint crosses on its period, changes frames only in its band, and loops", () => {
  const p = fromPixels(square(), 64, 64, { width: 40, glint: { every: 4 } });
  assert.equal(p.meta.fps, 30);
  assert.equal(p.meta.loop, 4);
  assert.match(p.meta.note, /glinting/);
  contract(p, [0, 0.3, 0.9, 1.4, 2.2, 3.9, 4.6]);
  const d = drawing(square(), 64, 64, { width: 40 });
  let lo = Infinity, hi = -Infinity;
  d.art.forEach((l, y) => [...l].forEach((ch, x) => ch !== " " && ((lo = Math.min(lo, x + 0.9 * y)), (hi = Math.max(hi, x + 0.9 * y)))));
  const still = snapshot(p, 0);
  for (const t of [0.2, 0.49]) assert.deepEqual(snapshot(p, t), still, `no glint before 0.5 s: t=${t}`);
  let changed = 0;
  for (const t of [0.8, 1.3, 1.9, 2.4]) {
    const at = lo - 5 + ((hi - lo + 10) * (t - 0.5)) / 2;
    const f = snapshot(p, t);
    const lines = f.text.split("\n"), base = still.text.split("\n");
    for (let y = 0; y < d.rows; y++)
      for (let x = 0; x < d.cols; x++) {
        const i = y * d.cols + x;
        if (lines[y][x] === base[y][x] && f.color![i] === still.color![i]) continue;
        changed++;
        assert.ok(Math.abs(x + 0.9 * y - at) < 5, `t=${t}: cell ${x},${y} changed outside the band at ${at.toFixed(2)}`);
        assert.ok(lines[y][x] === "/" || lines[y][x] === base[y][x]);
        // lit, in the lighter runs of the same colour: n and 2n on from it, for the image's n colours
        const n = d.colors.length;
        assert.ok(f.color![i] === still.color![i] + n || f.color![i] === still.color![i] + 2 * n, `t=${t}: colour ${f.color![i]} from ${still.color![i]}`);
      }
    // and it repeats every 4 seconds
    assert.deepEqual(snapshot(p, t + 4), f);
    assert.deepEqual(snapshot(p, t + 8, { paper: true }), snapshot(p, t, { paper: true }));
  }
  assert.ok(changed > 20, `${changed} cells changed`);
  // past the far edge the frame is the still again
  assert.deepEqual(snapshot(p, 3), still);
  // in one ink the glint is the slashes alone
  assert.match(snapshot(p, 1.3, { mono: true }).text, /\//);
  // true is every 5 seconds
  assert.equal(fromPixels(square(), 64, 64, { glint: true }).meta.loop, 5);
});

test("one ink: no palette, the drawing with its white left out, the same on every player", () => {
  const disc = image(60, 60, (x, y) => {
    const r = Math.hypot(x - 30, y - 30);
    return r < 4 ? [255, 255, 255, 255] : r < 22 ? [30, 80, 200, 255] : CLEAR;
  });
  const d = drawing(disc, 60, 60, { width: 30 });
  const mono = fromPixels(disc, 60, 60, { width: 30, color: false });
  assert.equal(mono.meta.palette, undefined);
  assert.equal(snapshot(mono, 0).text, d.mono.join("\n"));
  contract(mono);
  // a coloured piece played as text in one ink draws the same
  const coloured = fromPixels(disc, 60, 60, { width: 30 });
  assert.equal(snapshot(coloured, 0, { mono: true }).text, d.mono.join("\n"));
  assert.equal(snapshot(coloured, 0).text, d.art.join("\n"));
});

test("determinism: the same t gives the same frame, in any order, on any player", () => {
  const p = fromPixels(square(), 64, 64, { glint: true });
  const a = p.default(), b = p.default();
  const color = new Uint8Array(p.meta.cols * p.meta.rows), again = new Uint8Array(color.length);
  const at1 = a(1.2, { color }), first = color.slice();
  b(4.4, { color: again });
  b(0.1, { color: again });
  assert.equal(b(1.2, { color: again }), at1);
  assert.deepEqual(again, first);
  // the same pixels make the same piece
  assert.deepEqual(drawing(square(), 64, 64, { glint: true }), drawing(square(), 64, 64));
  assert.equal(snapshot(fromPixels(square(), 64, 64, { glint: true }), 1.2).text, at1);
  // a non-finite time is the first frame
  assert.equal(a(NaN), a(0));
});

test("Uint8ClampedArray pixels, as ImageData holds them, and longer buffers are read the same", () => {
  const data = square();
  const clamped = new Uint8ClampedArray(data);
  const longer = new Uint8Array(data.length + 100);
  longer.set(data);
  assert.deepEqual(drawing(clamped, 64, 64), drawing(data, 64, 64));
  assert.deepEqual(drawing(longer, 64, 64), drawing(data, 64, 64));
});

test("a frame is quick: under 4 ms at 64 by 24, under 10 ms at 200 by 100", () => {
  for (const width of [64, 200]) {
    const img = image(256, width === 64 ? 192 : 256, (x, y) => [x, y, (x * y) & 255, inside(x, y, 8, 8, 248, 248) ? 255 : 0]);
    const p = fromPixels(img, 256, width === 64 ? 192 : 256, { width, glint: true });
    const frame = p.default();
    const color = new Uint8Array(p.meta.cols * p.meta.rows);
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) frame(i / 30, { color });
    const ms = (performance.now() - t0) / 100;
    assert.ok(ms < (width === 64 ? 4 : 10), `${p.meta.cols}x${p.meta.rows}: ${ms.toFixed(2)} ms a frame`);
  }
});

test("it is a normal piece: svg() writes it, still or glinting", () => {
  const still = svg(fromPixels(square(), 64, 64, { width: 20, name: "red square" }));
  assert.match(still, /^<svg/);
  assert.match(still, /red square/);
  const glinting = svg(fromPixels(square(), 64, 64, { width: 20, glint: true }), { dark: true });
  assert.match(glinting, /^<svg/);
  assert.ok(glinting.length > still.length);
});

test("name, note and category go into the meta", () => {
  const p = fromPixels(square(), 64, 64, { name: "  red  ", category: "shapes" });
  assert.equal(p.meta.name, "red");
  assert.equal(p.meta.category, "shapes");
  assert.equal(p.meta.note, "red, drawn in ascii");
  assert.equal(fromPixels(square(), 64, 64).meta.name, "image");
  assert.equal(fromPixels(square(), 64, 64).meta.category, "logos");
  assert.equal(fromPixels(square(), 64, 64, { note: "a red square" }).meta.note, "a red square");
  assert.equal(fromPixels(square(), 64, 64, { name: "x".repeat(100) }).meta.note.length, 72);
});

test("fromDrawing makes the same piece as fromPixels, and takes a drawing of your own", () => {
  const d = drawing(square(), 64, 64, { width: 20 });
  const a = fromPixels(square(), 64, 64, { width: 20, glint: true }), b = fromDrawing(d, { glint: true });
  assert.deepEqual(b.meta, a.meta);
  for (const t of [0, 1, 1.5]) assert.deepEqual(snapshot(b, t), snapshot(a, t));
  // by hand: two colours, a hole in one ink
  const mine: Drawing = { style: "logo", cols: 3, rows: 1, colors: [[255, 0, 0], [255, 255, 255]], art: ["8o8"], ink: ["010"], mono: ["8 8"], knocked: true, ground: null };
  const p = fromDrawing(mine);
  assert.deepEqual(snapshot(p, 0, { paper: true }), { text: "8o8", color: Uint8Array.from([0, 1, 0]) });
  assert.equal(snapshot(p, 0, { mono: true }).text, "8 8");
  contract(p);
});

// --- an image in a piece of your own ----------------------------------------------------------------------

// A blue disc with a white dot in it: two colours, and a hole in one ink.
const dotted = () =>
  image(60, 60, (x, y) => {
    const r = Math.hypot(x - 30, y - 30);
    return r < 4 ? [255, 255, 255, 255] : r < 22 ? [30, 80, 200, 255] : CLEAR;
  });

test("the piece carries its drawing", () => {
  const p: ImagePiece = fromPixels(dotted(), 60, 60, { width: 30 });
  assert.deepEqual(p.drawing, drawing(dotted(), 60, 60, { width: 30 }));
  assert.equal(fromDrawing(p.drawing).drawing, p.drawing);
});

test("drawImage draws an image into a piece of your own, as fromPixels draws it, wherever it is put", () => {
  const logo = fromPixels(dotted(), 60, 60, { width: 20, glint: true });
  const d = logo.drawing;
  const at = [7, 3];
  const host = piece({ name: "host", cols: 40, rows: 16, loop: 5, palette: imagePalette(logo, ["#808080"]) }, (t, s) => {
    s.fill(".", 0);
    drawImage(s, logo, at[0], at[1], { t, glint: true });
  });
  for (const paper of [false, true])
    for (const t of [0, 1, 1.4, 2.2]) {
      const mine = snapshot(logo, t, { paper }), there = snapshot(host, t, { paper });
      const own = mine.text.split("\n"), lines = there.text.split("\n");
      for (let y = 0; y < d.rows; y++)
        for (let x = 0; x < d.cols; x++) {
          const i = (y + at[1]) * 40 + x + at[0];
          if (own[y][x] === " ") {
            // blank cells leave what was under them
            assert.equal(lines[y + at[1]][x + at[0]], ".");
            assert.equal(host.meta.palette![there.color![i]], "#808080");
            continue;
          }
          assert.equal(lines[y + at[1]][x + at[0]], own[y][x], `t=${t} ${x},${y}`);
          // the same colour, as #rrggbb, glint and all
          assert.equal(host.meta.palette![there.color![i]], logo.meta.palette![mine.color![y * d.cols + x]], `t=${t} ${x},${y}${paper ? " on paper" : ""}`);
        }
      // and nothing else changed
      assert.equal(lines[0], ".".repeat(40));
    }
  // in one ink, the one-ink drawing: the white dot left out
  const mono = snapshot(host, 0, { mono: true }).text.split("\n");
  d.mono.forEach((l, y) => [...l].forEach((ch, x) => ch !== " " && assert.equal(mono[y + at[1]][x + at[0]], ch)));
  assert.notDeepEqual(d.mono, d.art);
});

test("drawImage clips at the edges, takes a drawing, and draws in one ink or the nearest colours", () => {
  const logo = fromPixels(dotted(), 60, 60, { width: 20 });
  const d = logo.drawing;
  // part off every edge: the part inside is drawn, nothing throws
  for (const [x, y] of [[-5, -2], [12, 6], [-30, 0], [0, -20], [40, 16]]) {
    const p = piece({ name: "edge", cols: 16, rows: 8 }, (_, s) => drawImage(s, d, x, y));
    const lines = snapshot(p).text.split("\n");
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 16; c++) {
        const want = d.mono[r - y]?.[c - x] ?? " ";
        assert.equal(lines[r][c], want, `at ${x},${y}: ${c},${r}`);
      }
  }
  // a piece with no palette: the one-ink drawing, by fractions floored
  const plain = piece({ name: "plain", cols: d.cols + 4, rows: d.rows + 2 }, (_, s) => drawImage(s, logo, 2.7, 1.2));
  const lines = snapshot(plain).text.split("\n");
  assert.equal(lines.slice(1, 1 + d.rows).map((l) => l.slice(2, 2 + d.cols)).join("\n"), d.mono.join("\n"));
  assert.equal(lines[0].trim() + lines.at(-1)!.trim(), "");
  // a palette of your own: each cell the nearest of its colours
  const own = piece({ name: "own", cols: d.cols, rows: d.rows, palette: ["#000000", "#2050c0", "#ffffff"] }, (_, s) => drawImage(s, logo));
  const { text, color } = snapshot(own, 0, { paper: true });
  const blue = d.colors.findIndex(([r]) => r < 100);
  for (let i = 0; i < text.length; i++) {
    const y = Math.floor(i / (d.cols + 1)), x = i % (d.cols + 1);
    if (x === d.cols || text[i] === " ") continue;
    assert.equal(color![y * d.cols + x], d.ink[y][x] === String(blue) ? 1 : 2, `${x},${y}`);
  }
  // a shading, turned round on paper as fromPixels turns it
  const ramp = image(80, 40, (x) => [x * 3, x * 3, x * 3, 255]);
  const shaded = fromPixels(ramp, 80, 40, { width: 24, color: false });
  const host = piece({ name: "shaded", cols: shaded.meta.cols, rows: shaded.meta.rows }, (_, s) => drawImage(s, shaded));
  for (const paper of [false, true]) assert.equal(snapshot(host, 0, { paper }).text, snapshot(shaded, 0, { paper }).text);
  const kept = piece({ name: "kept", cols: shaded.meta.cols, rows: shaded.meta.rows }, (_, s) => drawImage(s, shaded, 0, 0, { invert: false }));
  assert.equal(snapshot(kept, 0, { paper: true }).text, snapshot(shaded, 0).text);
});

test("drawImage says what is wrong with what it is given", () => {
  const logo = fromPixels(square(), 64, 64, { width: 12 });
  const run = (draw: (s: never) => void) => snapshot(piece({ name: "x", cols: 20, rows: 10 }, (_, s) => draw(s as never)));
  assert.throws(() => drawImage(null as never, logo), /drawImage\(\) takes the surface to draw on first/);
  assert.throws(() => run((s) => drawImage(s, logo, NaN, 0)), /takes the column and row of the image's top left as numbers, not NaN and 0/);
  assert.throws(() => run((s) => drawImage(s, {} as never)), /a drawing takes whole numbers of columns/);
  assert.throws(() => run((s) => drawImage(s, null as never)), /drawImage\(\) takes a drawing, as drawing\(\) returns it, or a piece fromImage\(\) made, not null/);
  assert.throws(() => run((s) => drawImage(s, piece({ name: "other", cols: 4, rows: 2 }, () => {}) as never)), /not another piece: lay that one over with compose's layer\(\) or over\(\)/);
  assert.throws(() => run((s) => drawImage(s, logo, 0, 0, { period: 2 } as never)), /drawImage\(\) has no option "period": it takes t, glint and invert/);
  assert.throws(() => run((s) => drawImage(s, logo, 0, 0, { t: "1" } as never)), /t takes the frame's time in seconds, not "1"/);
  assert.throws(() => run((s) => drawImage(s, logo, 0, 0, { glint: { every: 1 } })), /glint\.every takes a number of seconds of 2\.5 or more/);
  assert.throws(() => run((s) => drawImage(s, logo, 0, 0, { invert: "yes" as never })), /invert takes true, false or "auto", not "yes"/);
  // a time that isn't finite is the first frame
  assert.doesNotThrow(() => run((s) => drawImage(s, logo, 0, 0, { t: Infinity, glint: true })));
});

test("imagePalette: your colours first, then the image's and their glint, for each theme", () => {
  const logo = fromPixels(dotted(), 60, 60, { width: 20 });
  const own = logo.meta.palette!, n3 = own.length / 2;
  assert.deepEqual(imagePalette(logo), { light: own.slice(0, n3), dark: own.slice(n3) });
  assert.deepEqual(imagePalette(logo.drawing), imagePalette(logo));
  const one = imagePalette(logo, ["#123456"]);
  assert.deepEqual([one.light[0], one.dark[0]], ["#123456", "#123456"]);
  assert.deepEqual(one.light.slice(1), own.slice(0, n3));
  const two = imagePalette(logo, { light: ["#000000"], dark: ["#ffffff"] });
  assert.deepEqual([two.light[0], two.dark[0]], ["#000000", "#ffffff"]);
  // a piece made with it takes text in your first colour
  const p = piece({ name: "card", cols: 4, rows: 1, palette: two }, (_, s) => s.write(0, 0, "hi"));
  assert.equal(p.meta.palette![snapshot(p, 0, { paper: true }).color![0]], "#000000");
  assert.equal(p.meta.palette![snapshot(p, 0).color![0]], "#ffffff");
  assert.throws(() => imagePalette(logo, ["red"]), /imagePalette\(\) takes colours of your own as a list of #rrggbb, or \{ light, dark \} lists of the same length, not an array of 1/);
  assert.throws(() => imagePalette(logo, { light: ["#000000"], dark: [] }), /lists of the same length/);
  // this image's 2 colours take 12 of the 64, which leaves 26
  assert.throws(() => imagePalette(logo, Array.from({ length: 27 }, () => "#000000")), /this image's 2 colours and their glint take 12 of the 64 a piece can have, which leaves room for 26 of your own, not 27/);
  assert.equal(imagePalette(logo, Array.from({ length: 26 }, () => "#000000")).light.length, 32);
});

test("every option is checked when the piece is made, with what to change", () => {
  const sq = square();
  const bad: [object, RegExp][] = [
    [{ width: 7 }, /width takes a whole number of columns from 8 to 320, not 7/],
    [{ width: 321 }, /width takes .* not 321/],
    [{ width: 40.5 }, /width takes .* not 40\.5/],
    [{ height: 2 }, /height takes a whole number of rows from 3 to 120, not 2/],
    [{ style: "photo" }, /style takes "logo" or "shade", not "photo"/],
    [{ background: "drop" }, /background takes "remove" or "keep", not "drop"/],
    [{ color: "yes" }, /color takes true .* or false .*, not "yes"/],
    [{ glint: "yes" }, /glint takes true, false or \{ every: seconds \}, not "yes"/],
    [{ glint: { every: 1 } }, /glint\.every takes a number of seconds of 2\.5 or more \(a glint takes 2 to cross\), not 1/],
    [{ glint: { every: Infinity } }, /glint\.every takes/],
    [{ invert: "on" }, /invert takes true, false or "auto", not "on"/],
    [{ name: "  " }, /name takes a line of text/],
    [{ note: "x".repeat(73) }, /note takes one line of 1 to 72 characters/],
    [{ ramp: "x" }, /a ramp takes a name/],
    [{ category: "pictures" }, /category takes one of/],
    // an option it doesn't take is named, and the one meant where it is near
    [{ colour: false }, /an image has no option "colour" \(did you mean color\?\): it takes width, height, style, .* and category/],
    [{ fps: 12 }, /no option "fps" \(did you mean glint\?\)/],
    [{ size: 40 }, /an image has no option "size": it takes width/],
    [{ glint: { period: 2 } }, /glint has no option "period": it takes every/],
  ];
  for (const [o, re] of bad) {
    assert.throws(() => fromPixels(sq, 64, 64, o as never), re, JSON.stringify(o));
    assert.throws(() => drawing(sq, 64, 64, o as never), /ascii\.rest: /, JSON.stringify(o));
  }
  assert.throws(() => fromPixels(sq, 64, 64, "big" as never), /an image takes an options object/);
  // every message starts the kit's way
  assert.throws(() => fromPixels(sq, 64, 64, { width: 7 }), /^Error: ascii\.rest: /);
});

test("pixels it can't take: the wrong type, too few bytes, no size", () => {
  assert.throws(() => drawing([1, 2, 3, 4] as never, 1, 1), /pixels take a Uint8Array or Uint8ClampedArray of RGBA/);
  assert.throws(() => drawing(new Uint8Array(15), 2, 2), /an image of 2 by 2 pixels takes 16 bytes of RGBA, 4 a pixel, not 15/);
  assert.throws(() => drawing(new Uint8Array(0), 0, 0), /takes a width and height in whole pixels of 1 or more, not 0 by 0/);
  assert.throws(() => fromPixels(new Uint8Array(16), 2.5, 2), /whole pixels of 1 or more, not 2\.5 by 2/);
  assert.throws(() => fromPixels(new Uint8Array(16), NaN, 2), /not NaN by 2/);
});

test("a drawing of your own is checked", () => {
  const ok: Drawing = { style: "logo", cols: 2, rows: 1, colors: [[0, 0, 0]], art: ["88"], ink: ["00"], mono: ["88"], knocked: false, ground: null };
  assert.doesNotThrow(() => fromDrawing(ok));
  const bad: [Partial<Drawing>, RegExp][] = [
    [{ cols: 0 }, /whole numbers of columns/],
    [{ style: "x" as never }, /style takes "logo" or "shade"/],
    [{ colors: [] }, /colors take 1 to 10 colours/],
    [{ colors: [[0, 0, 256]] }, /colors take 1 to 10 colours/],
    [{ art: ["888"] }, /art takes rows of 2 characters: row 0 is 3/],
    [{ mono: [] }, /mono takes 1 rows, one a line, not 0/],
    [{ ink: ["01"] }, /ink takes, for each drawn cell, a digit for one of its 1 colours: row 0, column 1 is "1"/],
    [{ ink: ["0 "] }, /ink takes, for each drawn cell, a digit for one of its 1 colours: row 0, column 1 is " "/],
    [{ art: ["8 "], ink: ["0x"] }, /row 0, column 1 is "x"/],
    [{ art: ["8\n"] }, /printable characters/],
  ];
  for (const [change, re] of bad) assert.throws(() => fromDrawing({ ...ok, ...change }), re, JSON.stringify(change));
  assert.throws(() => fromDrawing(null as never), /fromDrawing\(\) takes a drawing/);
});

// --- reading a PNG ------------------------------------------------------------------------------------------

test("readPng reads every kind of PNG: each colour type and depth, a palette, tRNS, every filter, interlaced or not", async () => {
  const W = 13, H = 11; // odd sizes, so rows end part way through a byte and some interlace passes are short
  const pal = Array.from({ length: 256 }, (_, i) => [i, (i * 7) & 255, 255 - i]);
  const kinds: Png[] = [];
  for (const interlace of [false, true]) {
    for (const depth of [1, 2, 4, 8, 16]) kinds.push({ width: W, height: H, depth, type: 0, at: samples(depth, 1, depth), interlace });
    for (const depth of [8, 16]) {
      kinds.push({ width: W, height: H, depth, type: 2, at: samples(20 + depth, 3, depth), interlace });
      kinds.push({ width: W, height: H, depth, type: 4, at: samples(40 + depth, 2, depth), interlace });
      kinds.push({ width: W, height: H, depth, type: 6, at: samples(60 + depth, 4, depth), interlace });
    }
    for (const depth of [1, 2, 4, 8])
      kinds.push({ width: W, height: H, depth, type: 3, at: samples(80 + depth, 1, depth), plte: pal.slice(0, 1 << depth), trns: depth > 1 ? [0, 128, 255] : undefined, interlace });
  }
  // tRNS for grey and RGB: one value that is clear
  kinds.push({ width: 4, height: 1, depth: 8, type: 0, at: (x) => [x * 60], trns: [0, 60] });
  kinds.push({ width: 4, height: 1, depth: 16, type: 2, at: (x) => [x * 1000, 7, 9], trns: [3, 232, 0, 7, 0, 9] });
  // one pixel, interlaced: six of its seven passes are empty
  kinds.push({ width: 1, height: 1, depth: 8, type: 6, at: () => [1, 2, 3, 4], interlace: true });
  kinds.push({ width: 3, height: 2, depth: 2, type: 3, at: (x, y) => [(x + y) % 4], plte: pal.slice(0, 4), interlace: true });

  for (const p of kinds) {
    const what = `type ${p.type} at ${p.depth} bits${p.interlace ? ", interlaced" : ""}${p.trns ? ", tRNS" : ""}, ${p.width} by ${p.height}`;
    const got = await readPng(writePng(p));
    assert.deepEqual([got.width, got.height], [p.width, p.height], what);
    assert.ok(got.data instanceof Uint8ClampedArray);
    assert.deepEqual(Uint8Array.from(got.data), expected(p), what);
  }
  // an ArrayBuffer and a Buffer are read the same
  const bytes = writePng(kinds[9]);
  assert.deepEqual(await readPng(bytes.slice().buffer), await readPng(bytes));
  assert.deepEqual(await readPng(Buffer.from(bytes)), await readPng(bytes));
});

test("readPng says what is wrong with bytes it can't read", async () => {
  const ok = writePng({ width: 4, height: 4, depth: 8, type: 6, at: samples(1, 4, 8) });
  await assert.rejects(readPng(new Uint8Array([1, 2, 3])), /^Error: ascii\.rest: could not read that PNG: it is not a PNG$/);
  await assert.rejects(readPng("png" as never), /readPng\(\) takes a PNG file's bytes/);
  // cut off part way through the first IDAT, then just after the IHDR
  await assert.rejects(readPng(ok.subarray(0, 50)), /it is cut short/);
  await assert.rejects(readPng(ok.subarray(0, 8 + 25)), /it has no image data/);
  await assert.rejects(readPng(writePng({ width: 2, height: 2, depth: 4, type: 2, at: () => [1, 2, 3] })), /colour type 2 at 4 bits is not a kind of PNG/);
  await assert.rejects(readPng(writePng({ width: 2, height: 2, depth: 8, type: 3, at: () => [0] })), /a palette's indices but no palette/);
  // the image data damaged, then cut short, then a row with a filter PNG has none of
  const damaged = ok.slice();
  const at = damaged.length - 12 - 12 - 4; // inside the second IDAT
  damaged[at] ^= 0xff;
  damaged[at - 1] ^= 0xff;
  await assert.rejects(readPng(damaged), /its image data is (damaged|cut short)/);
  const short = (p: Png, raw: Uint8Array) => {
    const png = writePng(p);
    const head = png.subarray(0, 8 + 25);
    return concat([head, chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))]);
  };
  const two = { width: 2, height: 2, depth: 8, type: 0, at: () => [5] };
  await assert.rejects(readPng(short(two, Uint8Array.from([0, 5, 5]))), /its image data is cut short/);
  await assert.rejects(readPng(short(two, Uint8Array.from([7, 5, 5, 0, 5, 5]))), /a row has filter 7, which PNG has none of/);
  // image data that inflates to far more than its rows: the rows are read, and the rest never is
  const rows = Uint8Array.from([0, 5, 6, 0, 7, 8]);
  const long = new Uint8Array(32 << 20);
  long.set(rows);
  const read = await readPng(short(two, long));
  assert.deepEqual([...read.data].filter((_, i) => i % 4 === 0), [5, 6, 7, 8]);
});

test("fromImage in Node reads a PNG by its path, a file: URL, a Blob or a data: URL, as fromPixels draws it", async () => {
  const p: Png = { width: 64, height: 64, depth: 8, type: 6, at: (x, y) => (inside(x, y, 16, 16, 48, 48) ? [220, 30, 30, 255] : [0, 0, 0, 0]) };
  const bytes = writePng(p);
  const want = snapshot(fromPixels(square(), 64, 64, { width: 30, glint: true }), 1.3);
  const dir = mkdtempSync(join(tmpdir(), "kit-image-"));
  try {
    const file = join(dir, "square.png");
    writeFileSync(file, bytes);
    // its path, its URL, its bytes as a Uint8Array, a Buffer and an ArrayBuffer, a Blob, a data: URL
    const sources = [file, pathToFileURL(file), pathToFileURL(file).href, bytes, Buffer.from(bytes), bytes.slice().buffer, new Blob([bytes]), `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`];
    for (const src of sources) {
      const piece = await fromImage(src as never, { width: 30, glint: true });
      assert.deepEqual(snapshot(piece, 1.3), want, String(src).slice(0, 40));
    }
    // pixels are fromPixels()'s, and what it can't take is described in a few words, not printed whole
    await assert.rejects(fromImage(new Uint8ClampedArray(16) as never), /fromImage\(\) takes an image file, not pixels: .* use fromPixels\(data, width, height\)/);
    await assert.rejects(fromImage(Array.from({ length: 5000 }, (_, i) => i) as never), /, not an array of 5000$/);
    await assert.rejects(fromImage(new Map() as never), /, not a Map$/);
    await assert.rejects(fromImage(join(dir, "nope", "x".repeat(200) + ".png")), /there is no such file/);
    // the options are checked before the image is read
    await assert.rejects(fromImage(join(dir, "missing.png"), { width: 3 }), /width takes a whole number of columns/);
    await assert.rejects(fromImage(join(dir, "missing.png")), /fromImage\(\) could not read .*missing\.png: there is no such file/);
    // a JPEG takes a decoder of your own here, and SVG a page to draw it on
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0]);
    writeFileSync(join(dir, "photo.jpg"), jpeg);
    await assert.rejects(fromImage(join(dir, "photo.jpg")), /reads only PNG where there is no browser to decode an image, as in Node: .* fromPixels\(\)/);
    await assert.rejects(fromImage('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'), /draws SVG on a page, so not in Node or a worker/);
    writeFileSync(join(dir, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
    await assert.rejects(fromImage(join(dir, "logo.svg")), /draws SVG on a page/);
    await assert.rejects(fromImage("  "), /not an empty string/);
    await assert.rejects(fromImage(42 as never), /fromImage\(\) takes a URL, a path, SVG markup, a file's bytes, a Blob, an <img>, an ImageBitmap or a canvas, not 42/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A PNG beside the kit's examples, read.
const asset = async (name: string) => readPng(await readFile(new URL(`../../examples/kit/assets/${name}`, import.meta.url)));

test("the example assets: the python logo in its two colours, the moon in greys", async () => {
  const python = await asset("python.png");
  const d = drawing(python.data, python.width, python.height);
  assert.equal(d.style, "logo");
  assert.deepEqual([d.cols, d.rows], [48, 24]);
  assert.ok(d.colors.some(([r, g, b]) => b > r + 60), `a blue in ${JSON.stringify(d.colors)}`);
  assert.ok(d.colors.some(([r, g, b]) => r > 200 && g > 180 && b < 120), `a yellow in ${JSON.stringify(d.colors)}`);
  assert.equal(d.knocked, false);
  // its two eyes are holes in the snakes: blank cells inside the ink of the top rows
  assert.match(d.art[3], /8\S*\s+\S*8/);
  const moon = await asset("moon.png");
  const m = drawing(moon.data, moon.width, moon.height, { width: 64, style: "shade" });
  // its black sky taken out
  assert.ok(m.ground && Math.max(...[1, 3, 5].map((i) => parseInt(m.ground!.slice(i, i + 2), 16))) < 16, `ground ${m.ground}`);
  assert.deepEqual([m.cols, m.rows], [64, 32]);
  for (const [r, g, b] of m.colors) assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 24, `a grey: ${[r, g, b]}`);
  // a round moon: its middle row is wider than its top row, and every shade of the ramp is used
  const span = (l: string) => l.trim().length;
  assert.ok(span(m.art[16]) > 2 * span(m.art[1]));
  for (const ch of ".:-=+*#%@") assert.ok(m.art.join("").includes(ch), ch);
});

test("the examples: each exports a piece as its default, which keeps the frame contract", async () => {
  const load = async (name: string) => (await import(`../../examples/kit/${name}`)).default as ImagePiece;
  const logo = await load("image-logo.ts"), photo = await load("image-photo.ts"), badge = await load("image-badge.ts");
  for (const p of [logo, photo, badge]) {
    assert.equal(typeof p.default, "function");
    contract(p, [0, 0.7, 1.3, 2.4, 4.1, 5.3]);
  }
  assert.deepEqual([logo.meta.cols, logo.meta.rows, logo.meta.loop], [48, 24, 5]);
  assert.deepEqual([photo.meta.cols, photo.meta.rows, photo.meta.fps], [64, 32, 0]);
  // the badge: the logo at its top left, then a line typed and answered, over again every 5 seconds
  const python = (await asset("python.png")) as { data: Uint8ClampedArray; width: number; height: number };
  const small = drawing(python.data, python.width, python.height, { width: 32 });
  const at = (t: number) => snapshot(badge, t, { mono: true }).text.split("\n");
  small.mono.forEach((l, y) => assert.equal(at(4)[y].slice(0, small.cols), l, `row ${y}`));
  assert.equal(at(0.5)[8].slice(34).trim(), "");
  assert.match(at(0.5)[7], />>> print\('_ *$/);
  assert.equal(at(4)[8].slice(34).trim(), "hello, ascii");
  assert.deepEqual(at(9), at(4));
});

// --- in a browser ---------------------------------------------------------------------------------------------

test("fromImage reads a Blob, a URL, an <img>, a bitmap and a canvas through createImageBitmap and a canvas", async () => {
  const pixels = new Uint8ClampedArray(square());
  // the browser's parts, as small as this needs: a bitmap of the square, and a canvas that hands back what was drawn on it
  class Bitmap {
    width = 64;
    height = 64;
    closed = false;
    close() {
      this.closed = true;
    }
  }
  const drawn: { w: number; h: number; src: unknown }[] = [];
  // a canvas with another site's image drawn on it won't give its pixels up
  let tainted = false;
  class Offscreen {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
        drawImage: (src: unknown, _x: number, _y: number, w: number, h: number) => drawn.push({ src, w, h }),
        getImageData: (_x: number, _y: number, w: number, h: number) => {
          if (tainted) throw new Error("SecurityError");
          return { data: w === 64 && h === 64 ? pixels : new Uint8ClampedArray(w * h * 4), width: w, height: h };
        },
      };
    }
  }
  class Img {
    complete = true;
    naturalWidth = 64;
    naturalHeight = 64;
    width = 64;
    height = 64;
    src: string;
    currentSrc: string;
    constructor(src: string) {
      this.src = this.currentSrc = src;
    }
    async decode() {}
  }
  const g = globalThis as Record<string, unknown>;
  const saved = { createImageBitmap: g.createImageBitmap, OffscreenCanvas: g.OffscreenCanvas, fetch: g.fetch, HTMLImageElement: g.HTMLImageElement };
  const bitmaps: Bitmap[] = [];
  g.createImageBitmap = async (b: unknown) => {
    if (b instanceof Blob && (await b.text()) === "not an image") throw new Error("decode");
    const m = new Bitmap();
    bitmaps.push(m);
    return m;
  };
  g.OffscreenCanvas = Offscreen;
  g.HTMLImageElement = Img;
  const fetched: string[] = [];
  g.fetch = async (url: string) => {
    fetched.push(url);
    return url.endsWith("missing.png") ? new Response("", { status: 404, statusText: "Not Found" }) : new Response(new Blob(["png bytes"], { type: "image/png" }));
  };
  try {
    const want = snapshot(fromPixels(square(), 64, 64, { width: 30 }), 0).text;
    for (const src of [new Blob(["png bytes"], { type: "image/png" }), "https://example.com/logo.png", new URL("https://example.com/logo.png"), new Img("logo.png"), new Bitmap(), new Offscreen(64, 64)]) {
      const p = await fromImage(src as never, { width: 30 });
      assert.equal(snapshot(p, 0).text, want, String(src));
      assert.equal(drawn.at(-1)!.w, 64);
    }
    assert.deepEqual(fetched, ["https://example.com/logo.png", "https://example.com/logo.png"]);
    assert.equal(bitmaps.length, 3);
    assert.ok(bitmaps.every((b) => b.closed), "each bitmap it decoded is closed");
    // an <img> of an SVG has no pixels of its own: it is drawn 2400 along its longer side, as /make/ draws one
    await fromImage(Object.assign(new Img("logo.svg"), { naturalWidth: 32, naturalHeight: 16 }) as never).catch(() => {});
    assert.deepEqual([drawn.at(-1)!.w, drawn.at(-1)!.h], [2400, 1200]);
    await assert.rejects(fromImage("https://example.com/missing.png"), /could not load https:\/\/example\.com\/missing\.png: 404 Not Found/);
    await assert.rejects(fromImage(new Blob(["not an image"], { type: "image/png" })), /could not read that image: try an svg, png, jpg, webp or gif/);
    await assert.rejects(fromImage(42 as never), /fromImage\(\) takes a URL, a path, SVG markup, a file's bytes, a Blob/);
    // SVG is drawn as an image on a page, which Node has none of
    await assert.rejects(fromImage('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'), /draws SVG on a page/);
    await assert.rejects(fromImage(new Blob(["<svg/>"], { type: "image/svg+xml" })), /draws SVG on a page/);
    // a huge image is drawn down to 4096 along its longer side before it is read
    await fromImage(Object.assign(new Bitmap(), { width: 8192, height: 2048 }) as never).catch(() => {});
    assert.deepEqual([drawn.at(-1)!.w, drawn.at(-1)!.h], [4096, 1024]);
    tainted = true;
    await assert.rejects(fromImage(new Bitmap() as never), /could not read that image's pixels: it comes from another site/);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete g[k];
      else g[k] = v;
    }
  }
});
