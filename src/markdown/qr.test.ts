// qr: a QR code from a text, in half blocks, that a phone reads.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence, kinds } from "./index.ts";
import { QR_VERSIONS, encodeQr, qr, qrCapacity, qrEcc, qrFormatBits, qrVersionBits, type QrLevel, type QrOptions } from "./qr.ts";

const SOURCE = entryOf("qr").source;
// A fence's figure: through fromFence() once qr is one of index.ts's kinds, and through fence() and qr() until then.
const viaFence = (info: string, body: string): MarkdownPiece => (Object.hasOwn(kinds, "qr") ? fromFence(info, body) : qr(body, fence(info).options as QrOptions));

// The catalog's example, as Apple's Core Image reader decoded it from the SVG's light, dark and inverted renders.
const STILL = [
  "╭───────────────────────────────╮",
  "│                               │",
  "│   █▀▀▀▀▀█ ▀█▄ ▀█ ▀█ █▀▀▀▀▀█   │",
  "│   █ ███ █ ▄█▀▄▀  ▄▀ █ ███ █   │",
  "│   █ ▀▀▀ █ █  █▀ ▀▀█ █ ▀▀▀ █   │",
  "│   ▀▀▀▀▀▀▀ █ █▄█▄▀▄▀ ▀▀▀▀▀▀▀   │",
  "│   ▀ ▄ ▀ ▀▀▀▄ ▀██▄▄▄█▀▀██ ▄▀   │",
  "│   █▀▀▀▀▄▀█  ▄▀▄ ▄▀█▀▄▀ ▀█▄    │",
  "│   █▄█▀▀▀▀▄▄ ▀ ▄▀▀▄█▀▀▀▄▀▀█▀   │",
  "│     ▀▀█▀▀█▄  █▀█▀▀▀▀▄██▀█▄    │",
  "│   ▀▀▀ ▀ ▀ █ █ ▀█▄▀█▀▀▀█▀▀     │",
  "│   █▀▀▀▀▀█ ▀▄  ▄ ▄▄█ ▀ █▄▄▄▄   │",
  "│   █ ███ █ ▀▄ ▀▄▀▀▄▀███▀▀█▄█   │",
  "│   █ ▀▀▀ █  ▄▀█▀█▀█ ██▄▄█▄█    │",
  "│   ▀▀▀▀▀▀▀ ▀   ▀▀ ▀ ▀▀   ▀▀▀   │",
  "│                               │",
  "│      https://ascii.rest       │",
  "╰───────────────────────────────╯",
].join("\n");

// --- a reader, written apart from the encoder, from the spec's tables ------------------------------------

// Per version 1 to 10: codewords, alignment centres, and per level the error correction codewords a block and blocks.
const SPEC = {
  codewords: [26, 44, 70, 100, 134, 172, 196, 242, 292, 346],
  align: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]],
  ecc: { l: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18], m: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24], h: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28] },
  blocks: { l: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4], m: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5], q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8], h: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8] },
};
const LEVEL_OF: Record<number, QrLevel> = { 1: "l", 0: "m", 3: "q", 2: "h" };
const MASK: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// A figure's modules read back off its still: each cell is a module's top half (▀) and the one under it (▄).
function modulesOf(p: MarkdownPiece, size: number): boolean[][] {
  const lines = plain(p).split("\n");
  const framed = lines[0].startsWith("╭");
  const x0 = (framed ? 2 : 0) + Math.floor((p.meta.cols - (framed ? 4 : 0) - (size + 4)) / 2) + 2, y0 = framed ? 1 : 0;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const ch = lines[y0 + Math.floor((y + 2) / 2)][x0 + x] ?? " ";
      return (y + 2) % 2 === 0 ? ch === "█" || ch === "▀" : ch === "█" || ch === "▄";
    }),
  );
}

// A code's text, read as a reader reads it: the format, the mask off, the codewords up and down the columns, the
// blocks apart, each block's error correction checked, then byte mode's count and bytes.
function read(m: boolean[][]): { text: string; level: QrLevel; mask: number; version: number } {
  const size = m.length, version = (size - 17) / 4;
  let f = 0;
  const at = [...[0, 1, 2, 3, 4, 5].map((i) => m[i][8]), m[7][8], m[8][8], m[8][7], ...[9, 10, 11, 12, 13, 14].map((i) => m[8][14 - i])];
  at.forEach((b, i) => (f |= (b ? 1 : 0) << i));
  const level = LEVEL_OF[(f ^ 0x5412) >> 13], mask = ((f ^ 0x5412) >> 10) & 7;
  // the second copy agrees
  let g = 0;
  for (let i = 0; i < 8; i++) g |= (m[8][size - 1 - i] ? 1 : 0) << i;
  for (let i = 8; i < 15; i++) g |= (m[size - 15 + i][8] ? 1 : 0) << i;
  assert.equal(g, f, "the two copies of the format bits");
  assert.equal(m[size - 8][8], true, "the dark module");
  // which modules are the patterns'
  const fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const mark = (x: number, y: number, w: number, h: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < size && j < size) fixed[j][i] = true;
  };
  mark(0, 0, 9, 9);
  mark(size - 8, 0, 8, 9);
  mark(0, size - 8, 9, 8);
  mark(6, 0, 1, size);
  mark(0, 6, size, 1);
  const al = SPEC.align[version - 1];
  // every pair of centres but the three on a finder
  const corner = (c: number) => c === al[0] || c === al[al.length - 1];
  for (const cx of al) for (const cy of al) if (!(corner(cx) && corner(cy) && !(cx === al[al.length - 1] && cy === al[al.length - 1]))) mark(cx - 2, cy - 2, 5, 5);
  if (version >= 7) (mark(size - 11, 0, 3, 6), mark(0, size - 11, 6, 3));
  // the codewords, the mask taken off
  // two columns at a time from the right, up the first pair, down the next, and so on, stepping over column 6
  const bits: number[] = [];
  let up = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) {
      const y = up ? size - 1 - v : v;
      for (const x of [right, right - 1]) if (!fixed[y][x]) bits.push(m[y][x] !== MASK[mask](x, y) ? 1 : 0);
    }
    up = !up;
  }
  const total = SPEC.codewords[version - 1];
  const words = Array.from({ length: total }, (_, i) => bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
  const nb = SPEC.blocks[level][version - 1], ec = SPEC.ecc[level][version - 1];
  const shortData = Math.floor(total / nb) - ec, longs = total % nb;
  const lens = Array.from({ length: nb }, (_, j) => shortData + (j >= nb - longs ? 1 : 0));
  const data: number[][] = lens.map(() => []), ecc: number[][] = lens.map(() => []);
  let k = 0;
  for (let i = 0; i < shortData + 1; i++) lens.forEach((len, j) => (i < len ? data[j].push(words[k++]) : 0));
  for (let i = 0; i < ec; i++) lens.forEach((_, j) => ecc[j].push(words[k++]));
  data.forEach((d, j) => assert.deepEqual(qrEcc(d, ec), ecc[j], `block ${j}'s error correction`));
  const stream = data.flat().flatMap((w) => Array.from({ length: 8 }, (_, i) => (w >> (7 - i)) & 1));
  const take = (n: number) => stream.splice(0, n).reduce((a, b) => (a << 1) | b, 0);
  assert.equal(take(4), 0b0100, "byte mode");
  const count = take(version < 10 ? 8 : 16);
  const text = new TextDecoder().decode(new Uint8Array(Array.from({ length: count }, () => take(8))));
  return { text, level, mask, version };
}

// The text a figure's code reads back as, its size from the encoder.
const back = (p: MarkdownPiece, text: string, level: QrLevel = "m") => read(modulesOf(p, encodeQr(text, level).size)).text;

// Whether a piece draws every frame whole: its rows and columns, and only characters a cell draws.
function whole(p: MarkdownPiece) {
  const frame = p.default();
  const end = (p.meta.still ?? 0) + 1;
  for (let t = 0; t <= end; t += 0.05) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, p.meta.rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, p.meta.cols, `t=${t}: ${l}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)}`);
    }
  }
}

test("qr: the catalog's example draws its still, a code that reads back as its text, through plain() and a fence", () => {
  const p = qr(SOURCE);
  assert.equal(SOURCE, "https://ascii.rest");
  assert.equal(plain(p), STILL);
  assert.equal(plain(viaFence("ascii qr", SOURCE)), STILL);
  // 18 bytes at level m is version 2: 25 modules and a quiet zone of 2, 29 by 15 cells, then the caption
  assert.equal(p.meta.cols, 33);
  assert.equal(p.meta.rows, 18);
  const r = read(modulesOf(p, 25));
  assert.deepEqual(r, { text: "https://ascii.rest", level: "m", mask: encodeQr(SOURCE).mask, version: 2 });
  assert.equal(p.says, "qr: a code for https://ascii.rest.");
  // each finder exactly, at its corner
  const lines = plain(p).split("\n");
  const FINDER = ["█▀▀▀▀▀█", "█ ███ █", "█ ▀▀▀ █", "▀▀▀▀▀▀▀"];
  FINDER.forEach((f, i) => {
    assert.equal(lines[2 + i].slice(4, 11), f);
    assert.equal(lines[2 + i].slice(22, 29), f);
    assert.equal(lines[11 + i].slice(4, 11), f);
  });
});

test("qr: encodes by the spec, the format and version bits, Reed-Solomon, and the capacities", () => {
  // the format bits for every level and mask, as the spec's table writes them
  const FORMATS: Record<QrLevel, string[]> = {
    l: ["111011111000100", "111001011110011", "111110110101010", "111100010011101", "110011000101111", "110001100011000", "110110001000001", "110100101110110"],
    m: ["101010000010010", "101000100100101", "101111001111100", "101101101001011", "100010111111001", "100000011001110", "100111110010111", "100101010100000"],
    q: ["011010101011111", "011000001101000", "011111100110001", "011101000000110", "010010010110100", "010000110000011", "010111011011010", "010101111101101"],
    h: ["001011010001001", "001001110111110", "001110011100111", "001100111010000", "000011101100010", "000001001010101", "000110100001100", "000100000111011"],
  };
  for (const level of ["l", "m", "q", "h"] as const) FORMATS[level].forEach((bits, mask) => assert.equal(qrFormatBits(level, mask), parseInt(bits, 2), `${level} ${mask}`));
  // the version bits for 7 to 10
  assert.equal(qrVersionBits(7), parseInt("000111110010010100", 2));
  assert.equal(qrVersionBits(8), parseInt("001000010110111100", 2));
  assert.equal(qrVersionBits(9), parseInt("001001101010011001", 2));
  assert.equal(qrVersionBits(10), parseInt("001010010011010011", 2));
  // the spec's worked example: HELLO WORLD at 1-M, its 16 data codewords and their 10 of error correction
  assert.deepEqual(qrEcc([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  // byte mode's capacities
  assert.deepEqual([1, 2, 5, 10].map((v) => qrCapacity(v, "l")), [17, 32, 106, 271]);
  assert.deepEqual([1, 2, 5, 10].map((v) => qrCapacity(v, "m")), [14, 26, 84, 213]);
  assert.deepEqual([1, 2, 5, 10].map((v) => qrCapacity(v, "q")), [11, 20, 60, 151]);
  assert.deepEqual([1, 2, 5, 10].map((v) => qrCapacity(v, "h")), [7, 14, 44, 119]);
  assert.equal(QR_VERSIONS, 10);
});

test("qr: every version and level reads back as its text, the masks varied", () => {
  const masks = new Set<number>();
  for (const level of ["l", "m", "q", "h"] as const)
    for (let v = 1; v <= QR_VERSIONS; v++) {
      // as many bytes as the version holds, so it is the version chosen
      const n = qrCapacity(v, level);
      const text = Array.from({ length: n }, (_, i) => "ascii.rest draws in text "[(i * 7 + v) % 25]).join("");
      const code = encodeQr(text, level);
      assert.equal(code.version, v, `${level} ${n} bytes`);
      assert.equal(code.size, 17 + 4 * v);
      const p = qr({ text }, { level, caption: false, play: "still" });
      assert.deepEqual(read(modulesOf(p, code.size)), { text, level, mask: code.mask, version: v });
      masks.add(code.mask);
    }
  assert.ok(masks.size >= 4, [...masks].join(" "));
  // UTF-8: the box drawing and dots a cell draws are bytes beyond ASCII
  const dots = "a ● and · and ° in a code";
  assert.equal(back(qr({ text: dots }, { caption: false }), dots), dots);
});

test("qr: the finders grow, the rest resolves out of noise, a scan line passes down; then it holds", () => {
  const p = qr(SOURCE);
  const frame = p.default();
  const { cols, rows } = p.meta;
  const at = (t: number) => frame(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    const text = frame(t, { paper: true, color });
    return { text, color: [...color] };
  };
  assert.equal(p.meta.still, 1.2);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 1.2, from: 0, once: true });
  // at first, an empty frame
  assert.equal(at(0).split("\n").slice(1, -1).join("").replace(/[│ ]/g, ""), "");
  // early on, only the finders, growing from their middles: nothing past their corners, and no caption yet
  const early = at(0.15).split("\n");
  assert.equal(early[3].slice(4, 11), "  ███  ");
  assert.equal(early[8].replace(/[│ ]/g, ""), "");
  assert.doesNotMatch(early.join("\n"), /https/);
  // midway the data modules flicker: the frame is neither empty nor the code
  const mid = at(0.5);
  assert.notEqual(mid, STILL);
  assert.notEqual(at(0.5), at(0.56));
  // the scan line: a row of cells in the accent, lower as it goes
  const rowOf = (t: number) => Math.floor(toned(t).color.findIndex((c) => c === ACCENT) / cols);
  assert.ok(rowOf(0.95) >= 1 && rowOf(1.1) > rowOf(0.95), `${rowOf(0.95)} ${rowOf(1.1)}`);
  // the still: modules ink, the caption soft, nothing in the accent; and it holds
  const s = toned(1.2);
  assert.equal(s.text.split("\n").map((l) => l.trimEnd()).join("\n"), STILL);
  assert.ok(!s.color.includes(ACCENT));
  const lines = s.text.split("\n");
  for (let r = 1; r < rows - 1; r++)
    for (let c = 1; c < cols - 1; c++) {
      const ch = lines[r][c];
      if ("▀▄█".includes(ch)) assert.equal(s.color[r * cols + c], INK);
      else if (/[a-z:/.]/.test(ch)) assert.equal(s.color[r * cols + c], SOFT);
    }
  assert.equal(at(5), STILL);
  // svg() plays the build once and holds
  assert.match(svg(p), /1 forwards/);
  whole(p);
});

test("qr: takes its text as data, in quotes, and of several lines as data", () => {
  assert.equal(plain(qr({ text: "https://ascii.rest" })), STILL);
  assert.equal(plain(qr('"https://ascii.rest"')), STILL);
  assert.equal(plain(qr("  https://ascii.rest  ")), STILL);
  // a text in quotes with spaces in it, and typographic quotes, are the words inside them
  assert.equal(back(qr('"npx ascii.rest add markdown"', { caption: false }), "npx ascii.rest add markdown"), "npx ascii.rest add markdown");
  assert.equal(back(qr("“two words”", { caption: false }), "two words"), "two words");
  // a line with key=value in it is its text, as a link's query is
  assert.equal(back(qr("https://x.dev/?a=b", { caption: false }), "https://x.dev/?a=b"), "https://x.dev/?a=b");
  // several lines, as data
  assert.equal(back(qr({ text: "line one\nline two" }, { caption: false }), "line one\nline two"), "line one\nline two");
  assert.equal(qr({ text: "x".repeat(100) }).says, `qr: a code for ${"x".repeat(57)}....`);
});

test("qr: its own options, the level, the caption, inverted, and where it sits in a width", () => {
  // a higher level is a larger code for the same text
  assert.equal(encodeQr(SOURCE, "l").version, 2);
  assert.equal(encodeQr(SOURCE, "h").version, 3);
  assert.equal(read(modulesOf(qr(SOURCE, { level: "h", caption: false }), 29)).level, "h");
  assert.equal(read(modulesOf(viaFence("ascii qr level=q caption=false", SOURCE), 25)).level, "q");
  // the level in capitals too, as a fence may write it
  assert.equal(read(modulesOf(qr(SOURCE, { level: "Q" as never, caption: false }), 25)).level, "q");
  // no caption: the code alone
  const bare = qr(SOURCE, { caption: false });
  assert.equal(bare.meta.rows, 17);
  assert.doesNotMatch(plain(bare), /https/);
  // inverted: the light modules and the quiet zone in ink, every other cell flipped
  const inv = plain(qr(SOURCE, { invert: true })).split("\n");
  const flip: Record<string, string> = { " ": "█", "█": " ", "▀": "▄", "▄": "▀" };
  const lines = STILL.split("\n");
  for (let r = 1; r <= 14; r++) for (let c = 2; c <= 30; c++) assert.equal(inv[r].padEnd(33)[c], flip[lines[r][c]], `${r} ${c}`);
  // the half row past the quiet zone at the foot stays blank: the zone's last row is ▀
  assert.equal(inv[15].slice(2, 31), "▀".repeat(29));
  // a width centres it, the caption too
  const wide = plain(qr(SOURCE, { width: 45 })).split("\n");
  assert.equal(wide[0].length, 45);
  assert.equal(wide[2].slice(10, 17), "█▀▀▀▀▀█");
  assert.equal(wide[16].indexOf("https"), 2 + Math.floor((41 - 18) / 2));
  // a caption longer than three lines of the code's width is cut
  const long = plain(qr({ text: "word ".repeat(40) })).split("\n");
  const cut = long[long.length - 2];
  assert.ok(cut.slice(2, -1).trimEnd().endsWith(" word..."), cut);
  assert.equal(long.filter((l) => /word/.test(l)).length, 3);
  assert.equal(long[0].length, 65);
  // unframed, with a title
  assert.equal(plain(qr(SOURCE, { frame: "none" })).split("\n")[1].slice(2, 9), "█▀▀▀▀▀█");
  assert.match(plain(qr(SOURCE, { title: "install" })).split("\n")[0], /^╭─ install ─+╮$/);
});

test("qr: says what is wrong, the kit's way", () => {
  assert.throws(() => qr(""), /ascii\.rest: qr takes a text to encode, such as https:\/\/ascii\.rest/);
  assert.throws(() => qr("   \n  \n"), /qr takes a text to encode/);
  assert.throws(() => qr("one\ntwo"), /qr takes one line of text, and line 2 has more: "two": for a text of several lines, give qr\(\) \{ text \}/);
  assert.throws(() => qr("level=h"), /qr's line 1 is "level=h": its options go on the fence, as ```ascii qr level=h/);
  assert.throws(() => qr('"unclosed'), /qr's line 1 opens a quote it doesn't close/);
  assert.throws(() => qr("café"), /ascii\.rest: qr takes characters every monospace face draws one cell wide/);
  assert.throws(() => qr("x".repeat(300)), /qr holds up to 213 bytes at level m, and this is 300: a shorter text/);
  assert.throws(() => qr("x".repeat(250)), /qr holds up to 213 bytes at level m, and this is 250: a shorter text, or level=l, which holds 271/);
  assert.throws(() => qr(SOURCE, { level: "x" as never }), /qr's level takes "l", "m", "q" or "h", not "x"/);
  assert.throws(() => qr(SOURCE, { caption: "yes" as never }), /qr's caption takes true or false, not "yes"/);
  assert.throws(() => qr(SOURCE, { invert: 1 as never }), /qr's invert takes true or false/);
  assert.throws(() => qr(SOURCE, { width: 30 }), /qr needs 33 columns for a version 2 code, and its width is 30: give it a width of 33 or more/);
  assert.throws(() => qr(SOURCE, { levl: "h" } as never), /qr\(\) has no option "levl" \(did you mean "level"\?\)/);
  assert.throws(() => qr({ text: "" }), /qr's text takes words to encode/);
  assert.throws(() => qr({ text: 5 } as never), /qr's text takes words to encode/);
  assert.throws(() => qr(null as never), /qr\(\) takes a fence's body, such as https:\/\/ascii\.rest, or \{ text \}/);
  assert.throws(() => qr(42 as never), /qr\(\) takes a fence's body/);
});

test("qr: whatever it is given, it draws whole frames of drawable characters or says why not", () => {
  const sources = ["x", "a b  c", "\"\"", '"a" "b"', 'a"b', "=", "a=b", "“typographic”", "line\r\n", "\t tabbed", "...", "█▀▄ ●·°", "→", "✓", "日本", "\u{1F600}", "\u0000", "x".repeat(213), "x".repeat(5000)];
  for (const src of sources) {
    let p: MarkdownPiece;
    try {
      p = qr(src);
    } catch (e) {
      assert.match(String((e as Error).message), /^ascii\.rest: /, JSON.stringify(src));
      continue;
    }
    whole(p);
  }
});

test("qr: a version 10 code draws a frame in well under a millisecond's budget", () => {
  const p = qr({ text: "x".repeat(213) });
  assert.equal(p.meta.cols, 65);
  const frame = p.default();
  const t0 = performance.now();
  for (let i = 0; i < 60; i++) frame(i / 50, { paper: true });
  assert.ok((performance.now() - t0) / 60 < 5, `${((performance.now() - t0) / 60).toFixed(2)} ms a frame`);
});
