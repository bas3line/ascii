/*
 * Share cards: one 1200x630 PNG a piece, served at /og/<slug>.png and drawn at
 * build time from the piece itself. A text piece is its frame in IBM Plex
 * Mono, light on the night ground, as large as fits, and a logo the same in
 * its own colours; a scene is its coloured dots, edge to edge. Along the
 * bottom, the piece's name and the credit.
 *
 * The card is built as SVG shapes, glyph outlines included, and rasterized by
 * sharp, so no system font is involved. Every character sits on its own cell,
 * which keeps the columns true, and box drawing and block characters are drawn
 * as lines and rectangles on the cell grid, so they meet across cells the way
 * a terminal draws them.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";
import sharp from "sharp";
import { load, type Meta, type PieceName } from "ascii.rest";

export const WIDTH = 1200;
export const HEIGHT = 630;

const GROUND = "#080b12";
const INK = "#e8ebef";
const MUTED = "#8c95a1";
/** The site's name over a scene, which needs more light than MUTED to stand off the dots. */
const SOFT = "#c3c9d1";
const SIDE = 64;

/*
 * The moment to show: frame 0 unless a later one reads better as a still. A
 * piece that keeps state is played up to it at its own frame rate, as a page
 * would play it.
 */
const AT: Partial<Record<string, number>> = {};

/** Pieces that read the clock see this moment, so every build draws the same card. */
const NOW = new Date(2026, 9, 7, 10, 10, 30).getTime();

// --- fonts ------------------------------------------------------------------

type Command = { type: "M" | "L" | "C" | "Q" | "Z"; x: number; y: number; x1: number; y1: number; x2: number; y2: number };
interface Glyph {
  index: number;
  advanceWidth: number;
  path: { commands: Command[] };
}
interface Font {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  charToGlyph(ch: string): Glyph;
}

const resolve = createRequire(import.meta.url).resolve;
const face = (weight: 400 | 500 | 600): Font => {
  const file = readFileSync(resolve(`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${weight}-normal.woff`));
  return opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)) as Font;
};
const REGULAR = face(400);
const MEDIUM = face(500);
/** The site card's name only. */
const SEMIBOLD = face(600);

const n = (v: number) => +v.toFixed(2);

/** A glyph's outline as path data, its baseline starting at (x, y), `size` pixels to the em. */
function outline(font: Font, ch: string, x: number, y: number, size: number): string {
  const glyph = font.charToGlyph(ch);
  if (!glyph.index) return "";
  const s = size / font.unitsPerEm;
  const X = (v: number) => n(x + v * s), Y = (v: number) => n(y - v * s);
  let d = "";
  for (const c of glyph.path.commands) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${X(c.x)} ${Y(c.y)}`;
    else if (c.type === "Q") d += `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`;
    else if (c.type === "C") d += `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`;
    else d += "Z";
  }
  return d;
}

/** A run of text set from (x, y) on its baseline, `track` pixels added after each character; returns its path and width. */
function words(font: Font, text: string, x: number, y: number, size: number, track = 0) {
  let d = "", at = x;
  for (const ch of text) {
    d += outline(font, ch, at, y, size);
    at += (font.charToGlyph(ch).advanceWidth * size) / font.unitsPerEm + track;
  }
  return { d, width: at - x };
}

// --- box drawing and blocks -------------------------------------------------

/*
 * The arms of each box drawing character, as up, right, down, left: 0 none,
 * 1 light, 2 heavy, 3 double. Dashed lines keep their dash count beside.
 */
const ARMS = new Map<number, string>();
const DASHES = new Map<number, number>();
const table = (from: number, list: string) => list.split(" ").forEach((a, i) => ARMS.set(from + i, a));
table(0x2500, "0101 0202 1010 2020 0101 0202 1010 2020 0101 0202 1010 2020");
table(
  0x250c,
  "0110 0210 0120 0220 0011 0012 0021 0022 1100 1200 2100 2200 1001 1002 2001 2002 " +
    "1110 1210 2110 1120 2120 2210 1220 2220 1011 1012 2011 1021 2021 2012 1022 2022 " +
    "0111 0112 0211 0212 0121 0122 0221 0222 1101 1102 1201 1202 2101 2102 2201 2202 " +
    "1111 1112 1211 1212 2111 1121 2121 2112 2211 1122 1221 2212 1222 2122 2221 2222",
);
table(0x254c, "0101 0202 1010 2020");
table(
  0x2550,
  "0303 3030 0310 0130 0330 0013 0031 0033 1300 3100 3300 1003 3001 3003 " +
    "1310 3130 3330 1013 3031 3033 0313 0131 0333 1303 3101 3303 1313 3131 3333",
);
table(0x2574, "0001 1000 0100 0010 0002 2000 0200 0020 0201 1020 0102 2010");
[3, 3, 3, 3, 4, 4, 4, 4].forEach((k, i) => DASHES.set(0x2504 + i, k));
[2, 2, 2, 2].forEach((k, i) => DASHES.set(0x254c + i, k));

/** Rounded corners, as the horizontal and vertical side the arc joins: ╭ ╮ ╯ ╰. */
const ARCS = new Map<number, [number, number]>([
  [0x256d, [1, 1]],
  [0x256e, [-1, 1]],
  [0x256f, [-1, -1]],
  [0x2570, [1, -1]],
]);

/** Block elements as filled fractions of the cell: [left, top, right, bottom] in eighths. */
const BLOCKS = new Map<number, number[][]>();
BLOCKS.set(0x2580, [[0, 0, 8, 4]]);
for (let k = 1; k <= 8; k++) BLOCKS.set(0x2580 + k, [[0, 8 - k, 8, 8]]); // ▁ to █
for (let k = 1; k <= 7; k++) BLOCKS.set(0x2588 + k, [[0, 0, 8 - k, 8]]); // ▉ to ▏
BLOCKS.set(0x2590, [[4, 0, 8, 8]]);
BLOCKS.set(0x2594, [[0, 0, 8, 1]]);
BLOCKS.set(0x2595, [[7, 0, 8, 8]]);
const Q = { ul: [0, 0, 4, 4], ur: [4, 0, 8, 4], ll: [0, 4, 4, 8], lr: [4, 4, 8, 8] };
BLOCKS.set(0x2596, [Q.ll]);
BLOCKS.set(0x2597, [Q.lr]);
BLOCKS.set(0x2598, [Q.ul]);
BLOCKS.set(0x2599, [Q.ul, Q.ll, Q.lr]);
BLOCKS.set(0x259a, [Q.ul, Q.lr]);
BLOCKS.set(0x259b, [Q.ul, Q.ur, Q.ll]);
BLOCKS.set(0x259c, [Q.ul, Q.ur, Q.lr]);
BLOCKS.set(0x259d, [Q.ur]);
BLOCKS.set(0x259e, [Q.ur, Q.ll]);
BLOCKS.set(0x259f, [Q.ur, Q.ll, Q.lr]);
/** ░ ▒ ▓ as flat tints of the ink. */
const SHADES = new Map([
  [0x2591, 0.25],
  [0x2592, 0.5],
  [0x2593, 0.75],
]);

const rect = (x0: number, y0: number, x1: number, y1: number) => (x1 > x0 && y1 > y0 ? `M${x0} ${y0}H${x1}V${y1}H${x0}Z` : "");

/** Paths for one picture in one ink: filled shapes, round-cornered strokes, diagonal strokes, tints. */
class Ink {
  fill = "";
  arcs = "";
  slants = "";
  tints = new Map<number, string>();
  light: number;
  heavy: number;

  constructor(light: number, heavy: number) {
    this.light = light;
    this.heavy = heavy;
  }

  /** Draws `code` in the cell [x0, x1] by [y0, y1] (whole pixels); false if it is not a line or block character. */
  cell(code: number, x0: number, y0: number, x1: number, y1: number): boolean {
    const blocks = BLOCKS.get(code);
    if (blocks) {
      const X = (e: number) => Math.round(x0 + ((x1 - x0) * e) / 8), Y = (e: number) => Math.round(y0 + ((y1 - y0) * e) / 8);
      for (const [l, t, r, b] of blocks) this.fill += rect(X(l), Y(t), X(r), Y(b));
      return true;
    }
    const shade = SHADES.get(code);
    if (shade) {
      this.tints.set(shade, (this.tints.get(shade) ?? "") + rect(x0, y0, x1, y1));
      return true;
    }
    const lt = this.light;
    // A line of thickness t centred on p, snapped to whole pixels.
    const at = (p: number, t: number) => Math.round(p - t / 2);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const arc = ARCS.get(code);
    if (arc) {
      const [h, v] = arc;
      const vx = at(cx, lt) + lt / 2, hy = at(cy, lt) + lt / 2;
      const ex = h > 0 ? x1 : x0, ey = v > 0 ? y1 : y0;
      const r = Math.min(Math.abs(ex - vx), Math.abs(ey - hy));
      const sweep = -h * v > 0 ? 1 : 0;
      this.arcs += `M${ex} ${hy}H${vx + h * r}A${r} ${r} 0 0 ${sweep} ${vx} ${hy + v * r}V${ey}`;
      return true;
    }
    if (code >= 0x2571 && code <= 0x2573) {
      if (code !== 0x2572) this.slants += `M${x0} ${y1}L${x1} ${y0}`;
      if (code !== 0x2571) this.slants += `M${x0} ${y0}L${x1} ${y1}`;
      return true;
    }
    const arms = ARMS.get(code);
    if (!arms) return false;
    const a = [...arms].map(Number);
    const thick = (s: number) => (s === 2 ? this.heavy : lt);
    const g = lt; // a double line's two strokes sit this far either side of the centre

    const dashes = DASHES.get(code);
    if (dashes) {
      const t = thick(Math.max(...a));
      if (a[1]) {
        const y = at(cy, t), seg = (x1 - x0) / dashes;
        for (let i = 0; i < dashes; i++) this.fill += rect(Math.round(x0 + i * seg + seg * 0.18), y, Math.round(x0 + (i + 1) * seg - seg * 0.18), y + t);
      } else {
        const x = at(cx, t), seg = (y1 - y0) / dashes;
        for (let i = 0; i < dashes; i++) this.fill += rect(x, Math.round(y0 + i * seg + seg * 0.18), x + t, Math.round(y0 + (i + 1) * seg - seg * 0.18));
      }
      return true;
    }

    // Each arm runs from its edge of the cell to a stop k past the centre (a
    // negative k stops short of it). Directions: 0 up, 1 right, 2 down, 3 left.
    for (let i = 0; i < 4; i++) {
      const s = a[i];
      if (!s) continue;
      const opp = a[(i + 2) % 4];
      const perp = [(i + 1) % 4, (i + 3) % 4];
      const vertical = i % 2 === 0;
      const sign = i === 0 || i === 3 ? 1 : -1; // up and left arms run toward +, the others toward -
      const centre = vertical ? cy : cx;
      const span = (k: number, cross: number, t: number) => {
        const stop = centre + sign * k;
        const c0 = at(cross, t), c1 = c0 + t;
        if (vertical) this.fill += i === 0 ? rect(c0, y0, c1, Math.round(stop)) : rect(c0, Math.round(stop), c1, y1);
        else this.fill += i === 3 ? rect(x0, c0, Math.round(stop), c1) : rect(Math.round(stop), c0, x1, c1);
      };
      const across = vertical ? cx : cy;
      if (s !== 3) {
        const t = thick(s);
        const doubles = perp.filter((p) => a[p] === 3).length;
        const widest = Math.max(0, ...perp.filter((p) => a[p] && a[p] !== 3).map((p) => thick(a[p])));
        let k = widest ? widest / 2 : t / 2;
        if (doubles === 2 && !opp) k = -g;
        else if (doubles === 1) k = g + lt / 2;
        span(k, across, t);
        continue;
      }
      // A double arm: two strokes, each on the side of one perpendicular arm.
      for (const q of perp) {
        const r = q === perp[0] ? perp[1] : perp[0];
        const side = q === 1 || q === 2 ? 1 : -1; // right and down are the + side
        let k: number;
        if (opp && a[q] !== 3) k = lt / 2;
        else if (a[q] === 3) k = -g + lt / 2;
        else if (a[q]) k = thick(a[q]) / 2;
        else if (a[r] === 3) k = g + lt / 2;
        else k = lt / 2;
        span(k, across + side * g, lt);
      }
    }
    return true;
  }

  svg(color: string): string {
    let out = "";
    if (this.fill) out += `<path fill="${color}" d="${this.fill}"/>`;
    for (const [o, d] of this.tints) out += `<path fill="${color}" fill-opacity="${o}" d="${d}"/>`;
    if (this.arcs) out += `<path fill="none" stroke="${color}" stroke-width="${this.light}" d="${this.arcs}"/>`;
    if (this.slants) out += `<path fill="none" stroke="${color}" stroke-width="${this.light}" stroke-linecap="square" d="${this.slants}"/>`;
    return out;
  }
}

// --- the piece --------------------------------------------------------------

/** The piece's frame at its chosen moment, and the colour of each cell for a coloured piece. */
async function still(slug: PieceName) {
  const mod = await load[slug]();
  const { meta } = mod;
  const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
  const t = AT[slug] ?? 0;
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args: unknown[]) {
      // @ts-expect-error: forwards whatever Date was given
      super(...(args.length ? args : [NOW]));
    }
    static now() {
      return NOW;
    }
  }
  globalThis.Date = FixedDate as DateConstructor;
  try {
    const frame = mod.default({ ...meta.options });
    const steps = meta.fps ? Math.round(t * meta.fps) : 0;
    let text = "";
    for (let k = 0; k <= steps; k++) text = frame(steps ? (k * t) / steps : t, { paper: false, color });
    return { meta, lines: text.split("\n"), color };
  } finally {
    globalThis.Date = RealDate;
  }
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * A text piece, trimmed to what it draws and set as large as fits whichever box
 * gives it more room. A logo brings the colour of each cell.
 */
function textArt(lines: string[], meta: Meta, boxes: Box[], color?: Uint8Array) {
  let top = lines.length, bottom = -1, left = Infinity, right = -1;
  lines.forEach((line, r) => {
    const chars = [...line];
    const first = chars.findIndex((c) => c !== " ");
    if (first < 0) return;
    let last = chars.length - 1;
    while (chars[last] === " ") last--;
    top = Math.min(top, r);
    bottom = r;
    left = Math.min(left, first);
    right = Math.max(right, last);
  });
  if (bottom < 0) return "";
  const cols = right - left + 1, rows = bottom - top + 1;
  const tall = meta.cell ?? 2;
  const fit = (b: Box) => Math.min(b.w / cols, b.h / (rows * tall), 40);
  const box = boxes.reduce((a, b) => (fit(b) > fit(a) ? b : a));
  const cw = fit(box);
  const ch = cw * tall;
  const ox = Math.round(box.x + (box.w - cols * cw) / 2), oy = Math.round(box.y + (box.h - rows * ch) / 2);
  const size = cw / 0.6;
  // The baseline where a browser puts it with line-height equal to the cell.
  const em = REGULAR.unitsPerEm;
  const base = (ch - ((REGULAR.ascender - REGULAR.descender) / em) * size) / 2 + (REGULAR.ascender / em) * size;
  const light = Math.max(1, Math.round(size * 0.075));
  const ink = new Ink(light, light * 2);
  // Glyph outlines by the colour they are drawn in: INK, or a palette colour.
  const glyphs = new Map<string, string>();
  for (let r = 0; r < rows; r++) {
    const chars = [...(lines[top + r] ?? "")];
    for (let c = 0; c < cols; c++) {
      const char = chars[left + c] ?? " ";
      if (char === " ") continue;
      const x0 = Math.round(ox + c * cw), x1 = Math.round(ox + (c + 1) * cw);
      const y0 = Math.round(oy + r * ch), y1 = Math.round(oy + (r + 1) * ch);
      if (ink.cell(char.codePointAt(0)!, x0, y0, x1, y1)) continue;
      const fill = color && meta.palette ? (meta.palette[color[(top + r) * meta.cols + left + c]] ?? INK) : INK;
      glyphs.set(fill, (glyphs.get(fill) ?? "") + outline(REGULAR, char, ox + c * cw, oy + r * ch + base, size));
    }
  }
  return [...glyphs].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join("") + ink.svg(INK);
}

/** Dot sizes for a scene's cells, as a fraction of the cell. */
const DOTS: Record<string, number> = { "·": 0.26, "•": 0.62, "●": 1 };

/** A scene, cropped to cover the card. */
function sceneArt(lines: string[], meta: Meta, color: Uint8Array) {
  const { cols, rows, palette = [], ground = GROUND } = meta;
  const tall = meta.cell ?? 2;
  const cw = Math.max(WIDTH / cols, HEIGHT / (rows * tall));
  const ch = cw * tall;
  const ox = (WIDTH - cols * cw) / 2, oy = (HEIGHT - rows * ch) / 2;
  const paths = new Map<number, string>();
  for (let r = 0; r < rows; r++) {
    const chars = [...(lines[r] ?? "")];
    for (let c = 0; c < cols; c++) {
      const char = chars[c] ?? " ";
      if (char === " ") continue;
      const i = color[r * cols + c];
      const x = ox + (c + 0.5) * cw, y = oy + (r + 0.5) * ch;
      const dot = DOTS[char];
      let d: string;
      if (dot) {
        const rad = n((dot * Math.min(cw, ch)) / 2);
        d = `M${n(x - rad)} ${n(y)}a${rad} ${rad} 0 1 0 ${n(2 * rad)} 0a${rad} ${rad} 0 1 0 ${n(-2 * rad)} 0`;
      } else {
        const size = cw / 0.6;
        d = outline(REGULAR, char, ox + c * cw, y + size * 0.35, size);
      }
      paths.set(i, (paths.get(i) ?? "") + d);
    }
  }
  let out = `<rect width="${WIDTH}" height="${HEIGHT}" fill="${ground}"/>`;
  for (const [i, d] of [...paths].sort((p, q) => p[0] - q[0])) out += `<path fill="${palette[i] ?? palette[0] ?? INK}" d="${d}"/>`;
  return out;
}

// --- the card ---------------------------------------------------------------

const GITHUB =
  "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";

/**
 * The bottom row: the piece's name and the site on the left, the credit on the
 * right. Returns where the left words end and the right ones begin. A page's
 * card passes the site as the name and its path as `after`, set close.
 */
function footer(name: string, scene: boolean, after = "ascii.rest", gap = 2) {
  const size = 26, y = HEIGHT - 52;
  const title = words(MEDIUM, name, SIDE, y, size);
  const siteX = SIDE + title.width + size * 0.6 * gap;
  const site = words(REGULAR, after, siteX, y, size);
  const handle = "@bas3line";
  const hw = handle.length * size * 0.6;
  const by = words(REGULAR, handle, WIDTH - SIDE - hw, y, size);
  const mark = 26, mx = WIDTH - SIDE - hw - 12 - mark, my = y - mark * 0.82;
  const svg =
    `<path fill="${INK}" d="${title.d}"/>` +
    `<path fill="${scene ? SOFT : MUTED}" d="${site.d}"/>` +
    `<path fill="${INK}" d="${by.d}"/>` +
    `<path fill="${INK}" transform="translate(${n(mx)} ${n(my)}) scale(${mark / 16})" d="${GITHUB}"/>`;
  return { svg, left: siteX + site.width, right: mx };
}

/** The share card for one piece, as PNG bytes. */
export async function card(slug: PieceName, name: string): Promise<Uint8Array> {
  const { meta, lines, color } = await still(slug);
  const scene = Boolean(color && meta.ground);
  const foot = footer(name, scene);
  let body: string;
  if (color && scene) {
    // A scene runs edge to edge; the bottom darkens just enough to carry the text.
    body =
      sceneArt(lines, meta, color) +
      `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND}" stop-opacity="0"/><stop offset="0.45" stop-color="${GROUND}" stop-opacity="0.7"/><stop offset="0.75" stop-color="${GROUND}" stop-opacity="0.9"/><stop offset="1" stop-color="${GROUND}" stop-opacity="0.94"/></linearGradient></defs>` +
      `<rect y="${HEIGHT - 200}" width="${WIDTH}" height="200" fill="url(#s)"/>`;
  } else {
    // Above the bottom row, or the full height when the picture is narrow
    // enough to stand between its two ends.
    const above = { x: SIDE, y: 52, w: WIDTH - 2 * SIDE, h: HEIGHT - 52 - 122 };
    const half = Math.min(WIDTH / 2 - foot.left, foot.right - WIDTH / 2) - 48;
    const between = { x: WIDTH / 2 - half, y: 52, w: 2 * half, h: HEIGHT - 104 };
    body = `<rect width="${WIDTH}" height="${HEIGHT}" fill="${GROUND}"/>` + textArt(lines, meta, half > 0 ? [above, between] : [above], color);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${body}${foot.svg}</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Uint8Array(png);
}

/** Splits text into lines of at most `max` characters, at spaces. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The share card for a page that shows no one piece, a docs page or a tool:
 * its title as large as fits and its description under it, in the box the
 * piece cards give their art, and along the bottom the site with the page's
 * path, and the credit. The description is left off if it takes more than
 * three lines.
 */
export async function pageCard(title: string, description: string, path: string): Promise<Uint8Array> {
  const foot = footer("ascii.rest", false, path, 0);
  const box = { x: SIDE, y: 52, w: WIDTH - 2 * SIDE, h: HEIGHT - 52 - 122 };
  const size = Math.min(96, box.w / ([...title].length * 0.6));
  const small = 30, leading = small * 1.45, gap = 30;
  const lines = wrap(description, Math.floor(box.w / (small * 0.6)));
  const told = lines.length <= 3 ? lines : [];
  // The block's height from the title's cap height to the last line's baseline, centred in the box.
  const cap = size * 0.7;
  const tall = cap + (told.length ? gap + small * 0.7 + (told.length - 1) * leading : 0);
  const top = box.y + (box.h - tall) / 2;
  let body = `<path fill="${INK}" d="${words(MEDIUM, title, SIDE, top + cap, size).d}"/>`;
  told.forEach((line, i) => {
    body += `<path fill="${MUTED}" d="${words(REGULAR, line, SIDE, top + cap + gap + small * 0.7 + i * leading, small).d}"/>`;
  });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${GROUND}"/>${body}${foot.svg}</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Uint8Array(png);
}

// --- the site's card --------------------------------------------------------

/*
 * The site's own card, /og.png: night coast as a page paints it on a canvas
 * 1260 wide, its middle in the card, shaded toward the bottom, under the
 * name, the count of pieces, the frameworks and the credit. Its look was set
 * by a screenshot of that page, so the scene's dots here are the ones the
 * canvas draws (mount.ts), not the piece cards' circles: SF Mono's three dot
 * glyphs at 10.5px, each centred in a 7px box at whole pixels, with the
 * browser's text antialiasing, which lifts a partly covered pixel to the
 * square root of its coverage. The text is laid out as that page's CSS laid
 * it out.
 */

/** SF Mono's dot glyphs, in ems: width, height, and the centre's height above the baseline. */
const CANVAS_DOTS: Record<string, [number, number, number]> = {
  "·": [0.1323, 0.1323, 0.3621],
  "•": [0.4023, 0.4023, 0.312],
  "●": [0.6182, 0.6089, 0.3518],
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A scene painted as the canvas paints it, `span` pixels wide from `left`, as RGB bytes the size of the card. */
function canvasScene(lines: string[], meta: Meta, color: Uint8Array, span: number, left: number): Buffer {
  const { cols, rows, palette = [], ground = GROUND } = meta;
  const out = new Float32Array(WIDTH * HEIGHT * 3);
  const back = rgb(ground);
  for (let i = 0; i < WIDTH * HEIGHT; i++) out.set(back, i * 3);
  const inks = palette.map(rgb);
  const w = span / cols, box = Math.ceil(w), size = w / 0.6;
  // The glyph's baseline in its box: the box's middle, plus the 4px the font's middle stands over its baseline, to a whole pixel.
  const base = Math.ceil(box / 2 + 4);
  const ss = 6; // samples a pixel, each way
  for (let r = 0; r < rows; r++) {
    const gy = Math.round(r * w + (w - box) / 2);
    const chars = [...(lines[r] ?? "")];
    for (let c = 0; c < cols; c++) {
      const dot = CANVAS_DOTS[chars[c]];
      if (!dot) continue;
      const gx = Math.round(c * w + (w - box) / 2);
      const cx = gx + box / 2, cy = gy + base - dot[2] * size;
      const rx = (dot[0] * size) / 2, ry = (dot[1] * size) / 2;
      const ink = inks[color[r * cols + c]] ?? inks[0] ?? rgb(INK);
      // Each glyph's whole box is copied, a little wider than its cell, so a big dot's edge runs into the next
      // cell's, as the canvas drew it when the card was set (mount.ts before it kept each cell to its own pixels).
      for (let Y = Math.max(0, gy); Y < gy + box && Y < HEIGHT; Y++) {
        for (let X = gx; X < gx + box; X++) {
          const px = X + left;
          if (px < 0 || px >= WIDTH) continue;
          let hit = 0;
          for (let a = 0; a < ss; a++) {
            for (let b = 0; b < ss; b++) {
              const u = (X + (a + 0.5) / ss - cx) / rx, v = (Y + (b + 0.5) / ss - cy) / ry;
              if (u * u + v * v <= 1) hit++;
            }
          }
          if (!hit) continue;
          const k = Math.sqrt(hit / (ss * ss));
          const o = (Y * WIDTH + px) * 3;
          for (let q = 0; q < 3; q++) out[o + q] = out[o + q] * (1 - k) + ink[q] * k;
        }
      }
    }
  }
  return Buffer.from(Uint8Array.from(out, (v) => Math.round(v)));
}

/** The site's share card with the number of pieces the library has, as PNG bytes. */
export async function siteCard(count: number): Promise<Uint8Array> {
  const { meta, lines, color } = await still("night-coast");
  const scene = canvasScene(lines, meta, color!, 1260, -30);
  // The text block sits 52px off the bottom. From the bottom up: the row of
  // frameworks and the credit (22px), 26px, the count (28px), 18px, the name
  // (84px, set solid, -1px apart). Each line box is the font's own line height.
  const em = REGULAR.unitsPerEm, A = REGULAR.ascender / em, D = -REGULAR.descender / em;
  const rowTop = HEIGHT - 52 - 22 * (A + D);
  const countTop = rowTop - 26 - 28 * (A + D);
  const nameTop = countTop - 18 - 84;
  // Baselines to whole pixels, as the screenshot has them.
  const nameBase = Math.floor(nameTop + (84 - 84 * (A + D)) / 2 + 84 * A);
  const countBase = Math.floor(countTop + 28 * A);
  const rowBase = Math.round(rowTop + 22 * A);
  const name = words(SEMIBOLD, "ascii.rest", SIDE, nameBase, 84, -1);
  const line = words(REGULAR, `${count} animated ascii pieces for the web`, SIDE, countBase, 28);
  const row = words(REGULAR, "React · Next.js · Astro · HTML", SIDE, rowBase, 22);
  const handle = "@bas3line";
  const hw = handle.length * 22 * 0.6;
  const by = words(MEDIUM, handle, WIDTH - SIDE - hw, rowBase, 22);
  const mark = 24, mx = WIDTH - SIDE - hw - 10 - mark, my = rowTop + (22 * (A + D) - mark) / 2;
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`;
  const shade =
    open +
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0.38" stop-color="${GROUND}" stop-opacity="0"/><stop offset="0.68" stop-color="${GROUND}" stop-opacity="0.72"/><stop offset="1" stop-color="${GROUND}" stop-opacity="0.94"/></linearGradient></defs>` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#s)"/></svg>`;
  const text =
    open +
    `<path fill="${INK}" d="${name.d}"/>` +
    `<path fill="${SOFT}" d="${line.d}"/>` +
    `<path fill="${MUTED}" d="${row.d}"/>` +
    `<path fill="${INK}" d="${by.d}"/>` +
    `<path fill="${INK}" transform="translate(${n(mx)} ${n(my)}) scale(${mark / 16})" d="${GITHUB}"/>` +
    `</svg>`;
  // The words' edges lifted as the browser lifts its text's: a partly covered pixel to the square root of its coverage.
  const lit = await sharp(Buffer.from(text)).ensureAlpha().raw().toBuffer();
  for (let i = 3; i < lit.length; i += 4) lit[i] = Math.round(255 * Math.sqrt(lit[i] / 255));
  const png = await sharp(scene, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
    .composite([{ input: Buffer.from(shade) }, { input: lit, raw: { width: WIDTH, height: HEIGHT, channels: 4 } }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Uint8Array(png);
}
