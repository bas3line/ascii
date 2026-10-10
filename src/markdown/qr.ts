/*
 * qr: a QR code from a text, drawn two modules a cell in half blocks so they
 * stay square, with the text under it: scan to install, scan for the docs. It
 * is a real code, encoded here (byte mode, versions 1 to 10, Reed-Solomon,
 * the mask with the lowest penalty), so a phone reads it off a page, an SVG
 * in a README or a terminal. As it builds, its three finders grow, the rest
 * resolves out of seeded noise and a scan line passes down it once.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii qr
 *   https://ascii.rest
 *   ```
 *
 *   qr("https://ascii.rest", { level: "h" })
 *   qr({ text: "npx ascii.rest add markdown" }, { caption: false })
 */
import { fail, hash, fnv1a32 } from "../kit/core.ts";
import { boolOf, show, wordOf } from "../kit/recipes/checks.ts";
import { ACCENT, INK, SOFT, clean, component, linesOf, progress, shown, statements, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** A QR code as data: the text it holds. */
export interface QrData {
  /** What the code holds: a link, a command, any text. Its UTF-8 bytes are encoded. */
  text: string;
}

/** How much of a code can be lost and still read: about 7% (l), 15% (m), 25% (q) or 30% (h). */
export type QrLevel = "l" | "m" | "q" | "h";

export interface QrOptions extends Common {
  /** Error correction: "l", "m" (the default), "q" or "h". Higher survives more damage and takes more modules. */
  level?: QrLevel;
  /** The text under the code, in the soft tone: true (the default), or false for the code alone. */
  caption?: boolean;
  /**
   * false (the default): dark modules drawn in ink, a code for a light ground. true: the light ones and the quiet
   * zone drawn in ink, so a terminal or page in light ink on a dark ground shows dark modules on a light code.
   */
  invert?: boolean;
}

/** A QR code's modules, true for dark, row by row from the top, and what it was made with. */
export interface QrCode {
  version: number;
  level: QrLevel;
  mask: number;
  /** Modules on a side: 21 for version 1, 4 more for each version after. */
  size: number;
  modules: boolean[][];
}

const LEVELS = ["l", "m", "q", "h"] as const;
// Per level, versions 1 to 10: error correction codewords in each block, and the number of blocks (ISO/IEC 18004,
// table 9).
const ECC: Readonly<Record<QrLevel, readonly number[]>> = {
  l: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  m: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  h: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};
const BLOCKS: Readonly<Record<QrLevel, readonly number[]>> = {
  l: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  m: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  h: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};
// The level's two bits in the format information.
const FORMAT: Readonly<Record<QrLevel, number>> = { l: 1, m: 0, q: 3, h: 2 };
/** The largest version qr() draws: 57 modules on a side, 213 bytes at level m. */
export const QR_VERSIONS = 10;

// The modules a version has for data and error correction, once its patterns are drawn.
function rawModules(v: number): number {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2;
    r -= (25 * a - 10) * a - 55;
    if (v >= 7) r -= 36;
  }
  return r;
}
const codewords = (v: number) => Math.floor(rawModules(v) / 8);
const dataCodewords = (v: number, l: QrLevel) => codewords(v) - ECC[l][v - 1] * BLOCKS[l][v - 1];

/** The most bytes a version holds at a level, in byte mode: 14 for version 1 at m, 213 for version 10. */
export const qrCapacity = (version: number, level: QrLevel) => Math.floor((dataCodewords(version, level) * 8 - 4 - (version < 10 ? 8 : 16)) / 8);

// --- Reed-Solomon over GF(256), the field QR codes use: x^8 + x^4 + x^3 + x^2 + 1 ---------------------

const gmul = (x: number, y: number) => {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
};

// The generator polynomial of a degree, its leading 1 left out.
function divisor(degree: number): number[] {
  const out = new Array<number>(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = gmul(out[j], root);
      if (j + 1 < degree) out[j] ^= out[j + 1];
    }
    root = gmul(root, 2);
  }
  return out;
}

/** The Reed-Solomon error correction codewords for a block of data codewords: `degree` of them. */
export function qrEcc(data: readonly number[], degree: number): number[] {
  const div = divisor(degree);
  const out = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ out.shift()!;
    out.push(0);
    div.forEach((c, i) => (out[i] ^= gmul(c, factor)));
  }
  return out;
}

/** The format information's 15 bits: the level and mask, BCH coded and masked with 101010000010010. */
export function qrFormatBits(level: QrLevel, mask: number): number {
  const data = (FORMAT[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** The version information's 18 bits, BCH coded, for version 7 and up. */
export function qrVersionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

// Where the alignment patterns' centres are, across and down: none for version 1.
function alignments(v: number): number[] {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, size = v * 4 + 17;
  const step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

// The eight masks: true where a data module is flipped, at column x and row y.
const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// The penalty the spec scores a masked code by, lower being easier to read: runs of five or more, 2 by 2 blocks of
// one colour, shapes like a finder, and dark and light out of balance.
function penalty(m: boolean[][]): number {
  const n = m.length;
  let p = 0, dark = 0;
  const at = (x: number, y: number, across: boolean) => (across ? m[y][x] : m[x][y]);
  const FINDERISH = [
    [true, false, true, true, true, false, true, false, false, false, false],
    [false, false, false, false, true, false, true, true, true, false, true],
  ];
  for (const across of [true, false]) {
    for (let y = 0; y < n; y++) {
      let run = 1;
      for (let x = 1; x <= n; x++) {
        if (x < n && at(x, y, across) === at(x - 1, y, across)) run++;
        else {
          if (run >= 5) p += 3 + run - 5;
          run = 1;
        }
      }
      for (let x = 0; x + 11 <= n; x++)
        for (const f of FINDERISH) if (f.every((v, i) => at(x + i, y, across) === v)) p += 40;
    }
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (m[y][x]) dark++;
      if (x + 1 < n && y + 1 < n && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
  const total = n * n;
  return p + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
}

/**
 * A text as a QR code's modules: its UTF-8 bytes in byte mode, in the smallest version from 1 to 10 that holds them at
 * the level, with the mask whose penalty is lowest. Throws for a text too long for version 10.
 *
 *   encodeQr("https://ascii.rest").size   // 25: version 2
 */
export function encodeQr(text: string, level: QrLevel = "m"): QrCode {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 1;
  while (version <= QR_VERSIONS && qrCapacity(version, level) < bytes.length) version++;
  if (version > QR_VERSIONS) {
    const more = LEVELS.filter((l) => qrCapacity(QR_VERSIONS, l) >= bytes.length && l !== level);
    fail(
      `qr holds up to ${qrCapacity(QR_VERSIONS, level)} bytes at level ${level}, and this is ${bytes.length}: a shorter text${more.length ? `, or level=${more[0]}, which holds ${qrCapacity(QR_VERSIONS, more[0])}` : ""}`,
    );
  }

  // the bits: byte mode, the count, the bytes, a terminator, then pad bytes to the version's capacity
  const bits: number[] = [];
  const push = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const room = dataCodewords(version, level) * 8;
  push(0, Math.min(4, room - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < room; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // split into blocks, each with its error correction, then interleaved
  const nb = BLOCKS[level][version - 1], ecLen = ECC[level][version - 1], all = codewords(version);
  const short = nb - (all % nb), shortLen = Math.floor(all / nb);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - ecLen + (i < short ? 0 : 1));
    k += dat.length;
    const ecc = qrEcc(dat, ecLen);
    if (i < short) dat.push(0);
    blocks.push([...dat, ...ecc]);
  }
  // a short block's placeholder byte, at the end of its data, is left out
  const words: number[] = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((b, j) => {
      if (i !== shortLen - ecLen || j >= short) words.push(b[i]);
    });

  // the patterns
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    fixed[y][x] = true;
  };
  for (let i = 0; i < size; i++) (set(6, i, i % 2 === 0), set(i, 6, i % 2 === 0));
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
  const pos = alignments(version), last = pos.length - 1;
  pos.forEach((cx, i) =>
    pos.forEach((cy, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );
  const format = (mask: number) => {
    const f = qrFormatBits(level, mask);
    const bit = (i: number) => ((f >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  format(0);
  if (version >= 7) {
    const v = qrVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const b = ((v >>> i) & 1) !== 0, a = size - 11 + (i % 3), c = Math.floor(i / 3);
      set(a, c, b);
      set(c, a, b);
    }
  }

  // the codewords, two columns at a time from the bottom right, up and down in turn, skipping column 6
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!fixed[y][x] && i < words.length * 8) {
          modules[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
  }

  // the mask with the lowest penalty
  const flip = (mask: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
  };
  let best = 0, least = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    flip(mask);
    format(mask);
    const p = penalty(modules);
    if (p < least) (best = mask), (least = p);
    flip(mask);
  }
  flip(best);
  format(best);
  return { version, level, mask: best, size, modules };
}

// --- the figure ---------------------------------------------------------------------------------

// The modules round the code, each side.
const QUIET_ZONE = 2;
// The build: the finders grow from their centres, the rest resolves out of noise, then a scan line passes down once.
const INTRO = 1.2, GROW = 0.3, NOISE = 0.25, RESOLVE: readonly [number, number] = [0.35, 0.9], SCAN = 0.9;
// The caption types in from and to these seconds.
const CAPTION: readonly [number, number] = [0.55, 1.1];
// The noise's flicker, steps a second, and the share of its modules that are dark.
const FLICKER = 20, DARK = 0.45;
// The caption's most lines; past them the last is cut with ...
const CAPTION_LINES = 3;
const OWN = ["level", "caption", "invert"] as const;

// The fence's body: one line, the text, as written, or in quotes.
function parse(source: string): QrData {
  const lines = linesOf(source)
    .map((l, i) => ({ l, line: i + 1 }))
    .filter(({ l }) => l.trim());
  if (!lines.length) fail(`qr takes a text to encode, such as https://ascii.rest`);
  if (lines.length > 1)
    fail(`qr takes one line of text, and line ${lines[1].line} has more: ${show(lines[1].l.trim())}: for a text of several lines, give qr() { text } with \\n in it`);
  const raw = clean(lines[0].l, "qr").trim();
  if (raw.startsWith('"')) {
    const [s] = statements(raw, "qr");
    if (s.tokens.length === 1 && s.texts.length === 1) return { text: s.texts[0] };
  }
  const option = /^([a-z]+)=(\S*)$/.exec(raw);
  if (option && (OWN as readonly string[]).includes(option[1])) fail(`qr's line 1 is ${show(raw)}: its options go on the fence, as \`\`\`ascii qr ${raw}`);
  return { text: raw };
}

// Data, checked: a text with something in it, every character one a cell can draw.
function check(data: QrData): QrData {
  if (!data || typeof data !== "object") fail(`qr() takes a fence's body, such as https://ascii.rest, or { text }, not ${show(data)}`);
  if (typeof data.text !== "string" || !data.text.trim()) fail(`qr's text takes words to encode, such as "https://ascii.rest", not ${show(data.text)}`);
  return { text: clean(data.text.replace(/\r\n?/g, "\n"), "qr's text") };
}

/**
 * A QR code from a fence's body, the text on one line, or { text }, drawn in half blocks, two modules a cell, with a
 * quiet zone of two modules round it and the text under it. Framed by default. Its finders grow, the rest resolves out
 * of noise and a scan line passes down it; then it holds, the code a phone reads.
 *
 *   qr("https://ascii.rest")
 *   qr({ text: "https://ascii.rest/docs/markdown-tokens/" }, { level: "l", caption: false })
 */
export function qr(source: string | QrData, options?: QrOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("qr", options, OWN, (o, room) => {
    const level = wordOf("qr's level", typeof o.level === "string" ? o.level.toLowerCase() : o.level, LEVELS, "m");
    const caption = boolOf("qr's caption", o.caption, true);
    const invert = boolOf("qr's invert", o.invert, false);
    const code = encodeQr(data.text, level);
    const span = code.size + 2 * QUIET_ZONE;
    const extra = o.width === undefined ? 0 : o.width - room.cols!;
    if (room.cols !== undefined && span > room.cols) fail(`qr needs ${span + extra} columns for a version ${code.version} code, and its width is ${o.width}: give it a width of ${span + extra} or more`);
    // a long title widens it, the code centred under it
    const asked = o.frame === "none" || o.title === false || o.title === undefined ? 0 : String(o.title).replace(/\s+/g, " ").trim().length;
    const cols = room.cols ?? Math.min(room.max, Math.max(span, asked + 2));
    const dx = Math.floor((cols - span) / 2);
    const codeRows = Math.ceil(span / 2);
    // the caption, wrapped to the code's width, at most three lines
    let under = caption ? wrap(data.text.replace(/\n/g, " ").replace(/\s+/g, " ").trim(), cols) : [];
    if (under.length > CAPTION_LINES) {
      under = under.slice(0, CAPTION_LINES);
      // cut at a space where there is one, so no word is cut in two
      const cut = under[CAPTION_LINES - 1].slice(0, Math.max(0, cols - 3));
      const space = cut.lastIndexOf(" ");
      under[CAPTION_LINES - 1] = `${space > 0 ? cut.slice(0, space) : cut}...`;
    }
    // A module of the code with its quiet zone, inked or not; past the zone, at the foot of an odd row, never.
    const n = code.size;
    const value = (mx: number, my: number): boolean => {
      if (mx < 0 || my < 0 || mx >= span || my >= span) return false;
      const x = mx - QUIET_ZONE, y = my - QUIET_ZONE;
      const dark = x >= 0 && y >= 0 && x < n && y < n && code.modules[y][x];
      return invert ? !dark : dark;
    };
    // Each module's place in the build: a finder's grows with it, the rest resolve one by one at a seeded time.
    const seed = fnv1a32(data.text);
    const finder = (x: number, y: number): number => {
      for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
        const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        if (d <= 3) return d;
      }
      return -1;
    };
    const when = (mx: number, my: number) => RESOLVE[0] + hash(mx, my, seed, 1) * (RESOLVE[1] - RESOLVE[0]);
    const inked = (mx: number, my: number, t: number): boolean => {
      if (t >= INTRO) return value(mx, my);
      const x = mx - QUIET_ZONE, y = my - QUIET_ZONE;
      const inside = x >= 0 && y >= 0 && x < n && y < n;
      if (!inside) return invert && mx >= 0 && my >= 0 && mx < span && my < span ? t >= NOISE : false;
      const d = finder(x, y);
      if (d >= 0) return d < progress(t, 0, GROW) * 4 ? value(mx, my) : false;
      if (t < NOISE) return false;
      if (t >= when(mx, my)) return value(mx, my);
      const noise = hash(mx, my, Math.floor(t * FLICKER), seed) < DARK;
      return invert ? !noise : noise;
    };
    const HALVES = [" ", "▄", "▀", "█"];
    const typed = under.join("").length;
    return {
      cols,
      rows: codeRows + under.length,
      intro: INTRO,
      says: `qr: a code for ${data.text.length > 60 ? `${data.text.slice(0, 57)}...` : data.text}.`,
      draw(s, t, at) {
        // the scan line, a row of cells in the accent, passing down once as the build ends
        const p = progress(t, SCAN, INTRO);
        const scan = at.still || p <= 0 || p >= 1 ? -1 : Math.floor(p * codeRows);
        for (let r = 0; r < codeRows; r++)
          for (let c = 0; c < span; c++) {
            const ch = HALVES[(inked(c, 2 * r, t) ? 2 : 0) + (inked(c, 2 * r + 1, t) ? 1 : 0)];
            if (ch !== " ") s.set(at.x + dx + c, at.y + r, ch, r === scan ? ACCENT : INK);
          }
        // the caption types in as the code resolves
        let more = shown(t, CAPTION[0], typed, typed / (CAPTION[1] - CAPTION[0]));
        under.forEach((l, i) => {
          s.write(at.x + Math.floor((cols - l.length) / 2), at.y + codeRows + i, l.slice(0, Math.max(0, more)), SOFT);
          more -= l.length;
        });
      },
    };
  });
}
