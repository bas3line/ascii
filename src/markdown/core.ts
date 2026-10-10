/*
 * ascii.rest/markdown, core: what every markdown figure shares. The lines a
 * fence holds, read into statements; the frame they are drawn in; the ten
 * tones they are coloured with; and component(), which turns a body that
 * draws itself over time into a piece. A figure builds in once, when it is
 * first seen; one with a cycle then keeps moving in a seamless loop while it
 * is in view, and one without holds. Its still, the finished figure at the end
 * of its build, is also what reduced motion, the server, plain() and a
 * README's fence show. Every figure is a normal kit piece, so it plays
 * wherever a piece plays: mount(), <Ascii>, <ascii-art src>, svg() and play()
 * in a terminal.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { component, statements, ACCENT, INK } from "ascii.rest/markdown";
 *
 *   export function shout(source: string, options?: Common) {
 *     return component("shout", options, [], () => {
 *       const words = statements(source, "shout").flatMap((s) => s.words).map((w) => w.toUpperCase());
 *       return { cols: 30, rows: words.length, intro: 0, says: words.join(", "),
 *         draw: (s, t, at) => words.forEach((w, i) => s.write(at.x, at.y + i, w, i ? INK : ACCENT)) };
 *     });
 *   }
 */
import type { Piece } from "../types.ts";
import { MAX, Surface, colorOf, fail, mix, piece, type ColorLike, type KitPiece } from "../kit/core.ts";
import { loopOf, optionsOf, show, speedOf, wholeOf, wordOf, type Speed } from "../kit/recipes/checks.ts";

// --- the family ---------------------------------------------------------------------------

/**
 * The figures by group, in the order the site and the docs show them. A group is a docs page,
 * /docs/markdown-<group>/, with a section for each of its figures.
 */
export const GROUPS = {
  lettering: ["headline", "typing", "flap", "marquee"],
  ornaments: ["divider", "confetti", "solid", "say", "orbit"],
  machines: ["sequence", "git", "railroad", "logic"],
  internals: ["flame", "bits", "pinout", "schema"],
  tokens: ["qr", "sigil", "stamp", "ticket"],
  games: ["chess", "bracket", "sprite"],
  places: ["world"],
} as const;

/** A group of figures: "lettering", "ornaments", "machines", "internals", "tokens", "games" or "places". */
export type Group = keyof typeof GROUPS;
/** A figure's name, as a fence names it: ```ascii headline. */
export type Kind = (typeof GROUPS)[Group][number];
/** Every figure's name, in order. */
export const KINDS: readonly Kind[] = Object.values(GROUPS).flat();
/** The group a figure is in. */
export const groupOf = (kind: Kind): Group => (Object.keys(GROUPS) as Group[]).find((g) => (GROUPS[g] as readonly string[]).includes(kind))!;

// --- tones ----------------------------------------------------------------------------------

/**
 * The tones every figure colours with, as indices into its palette: a colour for a light page and one for a dark
 * page each. Shape always carries what colour carries too, so a figure reads in one ink and as plain text.
 *
 * - INK: words and the figure's own marks. SOFT: captions, labels, keys, what is secondary. QUIET: the frame, rules,
 *   rails, grids and leaders, never words.
 * - ACCENT: ascii.rest's orange (`color` changes it), for what moves and what carries a value: a travelling dot, a
 *   live wire, a hub, a route.
 * - MARK: the one thing a figure's own data singles out, computed or named by an option (git's HEAD, the last move,
 *   the hottest leaf, the champion, `here`, the pulse pin). Drawn inverted on a web page, an ink block behind it as
 *   the site marks the current page, and in the accent elsewhere. At most one run of it a row.
 * - GOOD, WARN, BAD, VIOLET: colours a figure picks for its lanes, pieces and inks (git's lanes, confetti, a sprite's
 *   letters, a stamp's ink), never a verdict.
 * - GLINT: the passing light, as a figure comes into view, pink with the accent at its edges.
 */
export const INK = 0, SOFT = 1, QUIET = 2, ACCENT = 3, GOOD = 4, WARN = 5, BAD = 6, VIOLET = 7, MARK = 8, GLINT = 9;

/** The tones by name, in palette order: an HTML renderer's class for a cell is md-<name>. */
export const TONES = ["ink", "soft", "quiet", "accent", "good", "warn", "bad", "violet", "mark", "glint"] as const;
export type Tone = (typeof TONES)[number];

/**
 * The tones' colours for a light page and a dark one, measured on ascii.rest's grounds (#f5f6f7 and #131518): ink,
 * soft and every colour a word is drawn in are 4.5:1 or more on both; quiet is for lines only. The accent is the
 * banners' orange, at a tone dark enough for text on a light page; the glint is their pink.
 */
export const COLORS: Readonly<Record<Tone, { readonly light: string; readonly dark: string }>> = {
  ink: { light: "#1f2328", dark: "#f0f6fc" },
  soft: { light: "#59636e", dark: "#9198a1" },
  quiet: { light: "#8c959f", dark: "#6e7681" },
  accent: { light: "#c2410c", dark: "#f97316" },
  good: { light: "#1a7f37", dark: "#3fb950" },
  warn: { light: "#9a6700", dark: "#d29922" },
  bad: { light: "#cf222e", dark: "#f85149" },
  violet: { light: "#8250df", dark: "#bc8cff" },
  mark: { light: "#c2410c", dark: "#f97316" },
  glint: { light: "#be185d", dark: "#f778ba" },
};

// A figure's palette: the tones, its accent and mark the colour given, its glint a lighter one of it.
function paletteOf(accent?: { light: string; dark: string }) {
  const tones = TONES.map((t) => COLORS[t]);
  if (accent) {
    tones[ACCENT] = tones[MARK] = accent;
    tones[GLINT] = { light: mix(accent.light, "#000000", 0.25), dark: mix(accent.dark, "#ffffff", 0.45) };
  }
  return { light: tones.map((c) => c.light), dark: tones.map((c) => c.dark) };
}

// --- glyphs ---------------------------------------------------------------------------------

/**
 * True for a character every figure may draw: printable ASCII, · ° • ●, and the box drawing and block elements,
 * U+2500 to U+259F. These are what Paper Mono draws at one advance and what the "ascii.rest mono" fallback covers, so
 * every row keeps its width on any page, in an SVG and in a terminal. Words from the source are checked with it too.
 */
export const drawable = (ch: string) => {
  const c = ch.charCodeAt(0);
  return ch.length === 1 && ((c >= 32 && c < 127) || c === 0xb7 || c === 0xb0 || c === 0x2022 || c === 0x25cf || (c >= 0x2500 && c <= 0x259f));
};

// Characters a source may hold that draw as others: typographic quotes and dashes (the en and em dash, by their code
// points), an ellipsis, a no-break space, a tab.
const FOLD: Readonly<Record<string, string>> = {
  "‘": "'", "’": "'", "“": '"', "”": '"', [String.fromCharCode(0x2013)]: "-", [String.fromCharCode(0x2014)]: "-", "…": "...", " ": " ", "\t": "  ",
};

/**
 * Words from a source made drawable: typographic quotes and dashes and an ellipsis become their plain forms, a tab
 * two spaces. Throws, naming the character, for one that still can't be drawn (an emoji, an arrow, a letter outside
 * ASCII such as é), so a figure never draws a row wider than the rest.
 */
export function clean(text: string, what = "this"): string {
  let out = "";
  for (const ch of text) {
    const f = FOLD[ch];
    if (f !== undefined) out += f;
    else if (drawable(ch) || ch === "\n") out += ch;
    else fail(`${what} takes characters every monospace face draws one cell wide: ASCII, the box drawing characters and · ° • ●, not ${JSON.stringify(ch)} in ${show(text.length > 40 ? text.slice(0, 40) + "..." : text)}`);
  }
  return out;
}

// --- a fence's lines --------------------------------------------------------------------------

/**
 * A source's lines: \r\n as \n, and as a template literal is written, its blank first and last lines and the indent
 * its lines share left out, so a source can be indented with the code around it.
 */
export function linesOf(source: string): string[] {
  if (typeof source !== "string") fail(`a markdown source is a string, not ${show(source)}`);
  let lines = source.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = lines.reduce((n, l) => (l.trim() ? Math.min(n, l.length - l.trimStart().length) : n), Infinity);
  if (Number.isFinite(indent) && indent > 0) lines = lines.map((l) => l.slice(indent));
  return lines;
}

/** A part of a statement, in the order written: a bare word, a "quoted text", or key=value. */
export type Token = { word: string } | { text: string } | { key: string; value: string };

/** A line of a fence's body, read: one statement. */
export interface Statement {
  /** The line it is on, from 1, for errors. */
  line: number;
  /** Its bare words, in order: names, as `api`, `feat`, `sfo`. */
  words: string[];
  /** Its "quoted" texts, in order, without their quotes: words to show, a message, a caption. */
  texts: string[];
  /** Its key=value attributes, key="with spaces" too, as the fence's own options are written. */
  attrs: Record<string, string>;
  /** All of it, in the order written. */
  tokens: Token[];
  /** The line as written, typographic marks folded (see clean()), leading spaces left out: for a notation of its own. */
  raw: string;
}

// A key, as an attribute's: a letter or _ first, then letters, digits, _, - and dots.
const KEY = /^([A-Za-z_][\w.-]*)=/;

/**
 * A fence's body read as lines, one statement a line, blank lines left out: bare words are names, "words in quotes"
 * are words to show (\" is a quote inside them), and key=value is an attribute. Every word is cleaned (see clean()),
 * so typographic quotes fold to ". No character has a meaning of its own beyond these: ! and -> stay inside the words
 * they are written in. Throws, naming the line, for a quote left open.
 *
 *   statements('browser -> api "GET /users"\ngate=npm seat="1 A"')
 */
export function statements(source: string, what = "this"): Statement[] {
  const out: Statement[] = [];
  linesOf(source).forEach((written, n) => {
    if (!written.trim()) return;
    const raw = clean(written, what).trimStart();
    const line = n + 1;
    const s: Statement = { line, words: [], texts: [], attrs: {}, tokens: [], raw };
    // A quoted text from i, the opening quote: its words and where it ends.
    const quoted = (i: number): [string, number] => {
      let text = "";
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j] === "\\" && raw[j + 1] === '"') {
          text += '"';
          j++;
        } else if (raw[j] === '"') return [text, j + 1];
        else text += raw[j];
      }
      return fail(`${what}'s line ${line} opens a quote it doesn't close: ${show(raw.length > 40 ? raw.slice(0, 40) + "..." : raw)}`);
    };
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === " ") {
        i++;
        continue;
      }
      if (raw[i] === '"') {
        const [text, end] = quoted(i);
        s.texts.push(text);
        s.tokens.push({ text });
        i = end;
        continue;
      }
      const key = KEY.exec(raw.slice(i));
      if (key) {
        let value = "";
        let j = i + key[0].length;
        if (raw[j] === '"') [value, j] = quoted(j);
        else for (; j < raw.length && raw[j] !== " " && raw[j] !== '"'; j++) value += raw[j];
        s.attrs[key[1]] = value;
        s.tokens.push({ key: key[1], value });
        i = j;
        continue;
      }
      let word = "";
      for (; i < raw.length && raw[i] !== " " && raw[i] !== '"'; i++) word += raw[i];
      s.words.push(word);
      s.tokens.push({ word });
    }
    out.push(s);
  });
  return out;
}

/**
 * A fence's body as blocks of lines, a blank line between each: the frames of a sprite. Each line is cleaned (see
 * clean()) and keeps its spaces but the indent every line shares.
 */
export function blocks(source: string, what = "this"): string[][] {
  const out: string[][] = [];
  let block: string[] = [];
  for (const line of linesOf(source)) {
    if (!line.trim()) {
      if (block.length) out.push(block);
      block = [];
    } else block.push(clean(line, what));
  }
  if (block.length) out.push(block);
  return out;
}

/**
 * A number as people write one: 12400, 12,400, 1.5k, 2m, 3b, -6, +31. NaN for anything else. A value with a unit
 * after it, "820 ms", is amount().
 */
export function num(word: string): number {
  const m = /^\s*([+-]?)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)\s*([kmb])?\s*$/i.exec(String(word));
  if (!m) return NaN;
  const v = parseFloat(m[2].replace(/,/g, "")) * (m[3] ? { k: 1e3, m: 1e6, b: 1e9 }[m[3].toLowerCase() as "k" | "m" | "b"] : 1);
  return m[1] === "-" ? -v : v;
}

/**
 * A value and the unit after it: "820 ms" is { value: 820, unit: "ms", text: "820" }, "+31 kb" keeps its sign, and
 * "1.5k visits" is 1500. A k, m or b right after the number is a multiple only when no letter follows it, so "820ms"
 * is 820 of ms. Null when it doesn't start with a number.
 */
export function amount(word: string): { value: number; unit: string; text: string } | null {
  const m = /^\s*([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[kmb](?![a-z]))?)\s*(.*?)\s*$/i.exec(String(word));
  if (!m) return null;
  const value = num(m[1]);
  return Number.isNaN(value) ? null : { value, unit: m[2], text: m[1] };
}

/**
 * Words wrapped at spaces to `width` columns, a word longer than a line broken across lines; "\n" starts a new line.
 * An empty string is no lines.
 */
export function wrap(words: string, width: number): string[] {
  if (!words) return [];
  const w = Math.max(1, Math.floor(width));
  const out: string[] = [];
  for (const para of words.split("\n")) {
    let line = "";
    for (let word of para.split(" ").filter(Boolean)) {
      while (word.length > w) {
        if (line) out.push(line);
        line = "";
        out.push(word.slice(0, w));
        word = word.slice(w);
      }
      if (!word) continue;
      if (!line) line = word;
      else if (line.length + 1 + word.length <= w) line += ` ${word}`;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** A number with commas between its thousands: 12400 as "12,400". Fractions keep up to `places` (2). */
export function commas(n: number, places = 2): string {
  const [whole, frac] = String(+n.toFixed(places)).split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? `.${frac}` : "");
}

// --- a fence ----------------------------------------------------------------------------------

/** A fence's options from its info string, each value as written: true for a bare word, a number when it reads as one. */
export type FenceOptions = Record<string, string | number | boolean>;

/**
 * A fence's info string read: "ascii headline font=slim title=\"v 2\"" is { lang: "ascii", kind: "headline",
 * options: { font: "slim", title: "v 2" } }. A value in double or single quotes may hold spaces; a word with no = is
 * true; "true" and "false" are booleans and a number is a number. A title is always its words as written, so
 * title=2.0 stays "2.0". The kind is the second word, unchecked: make() and fromFence() check it.
 */
export function fence(info: string): { lang: string; kind: string; options: FenceOptions } {
  const words = [...String(info).trim().matchAll(/([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S*)))?/g)];
  const [lang = "", kind = ""] = words.slice(0, 2).map((w) => w[0]);
  const options: FenceOptions = {};
  for (const w of words.slice(2)) {
    const raw = w[2] ?? w[3] ?? w[4];
    if (raw === undefined) options[w[1]] = true;
    else if (w[1] === "title" && raw !== "false") options[w[1]] = raw;
    else if (w[2] === undefined && w[3] === undefined && (raw === "true" || raw === "false")) options[w[1]] = raw === "true";
    else if (w[2] === undefined && w[3] === undefined && /^-?\d+(\.\d+)?$/.test(raw)) options[w[1]] = Number(raw);
    else options[w[1]] = raw;
  }
  return { lang, kind, options };
}

// --- time ------------------------------------------------------------------------------------

/** How far along from `from` to `to` seconds t is, 0 to 1. */
export const progress = (t: number, from: number, to: number) => (to <= from ? (t >= to ? 1 : 0) : Math.max(0, Math.min(1, (t - from) / (to - from))));

/** How many of `count` things have shown by t, one every 1 / perSecond seconds from `from`: for typing and filling. */
export const shown = (t: number, from: number, count: number, perSecond: number) => Math.max(0, Math.min(count, Math.floor((t - from) * perSecond + 1e-9)));

/** Seconds the title's glint takes to pass as a figure comes into view. */
export const GLINT_SECONDS = 0.7;

// --- the frame -------------------------------------------------------------------------------

/** A figure's frame: rounded corners by default, a box's other lines, plain ASCII + - | for any place, or none. */
export type FrameStyle = "rounded" | "single" | "heavy" | "double" | "ascii" | "none";
const FRAMES = ["rounded", "single", "heavy", "double", "ascii", "none"] as const;

/** Each frame's lines: top left, top right, bottom left, bottom right, across, down. */
export const BOXES: Readonly<Record<Exclude<FrameStyle, "none">, string>> = {
  rounded: "╭╮╰╯─│",
  single: "┌┐└┘─│",
  heavy: "┏┓┗┛━┃",
  double: "╔╗╚╝═║",
  ascii: "++++-|",
};

// Where a dashed rule across the body meets each frame's sides: left, right, and the dash in the padding between.
const JOINS: Readonly<Record<Exclude<FrameStyle, "none">, string>> = {
  rounded: "├┤┄",
  single: "├┤┄",
  heavy: "┠┨┄",
  double: "╟╢┄",
  ascii: "++-",
};

/** Words on an edge with a tone for each run: a string in one tone, or runs of [words, tone]. */
export type Runs = string | readonly (readonly [string, number])[];
const runsOf = (r: Runs | undefined, tone: number): [string, number][] => (r === undefined ? [] : typeof r === "string" ? (r ? [[r, tone]] : []) : r.map(([w, k]) => [w, k]));
const widthOf = (r: [string, number][]) => r.reduce((n, [w]) => n + w.length, 0);

/**
 * A box drawn in a style's lines, w by h with its top left at x, y, in a tone: the frame's own drawing, for boxes
 * inside a figure too (a gate, a table, a tile). A box one row tall is a line across.
 */
export function box(s: Surface, x: number, y: number, w: number, h: number, style: Exclude<FrameStyle, "none"> = "rounded", tone = QUIET): void {
  const [tl, tr, bl, br, across, down] = BOXES[style];
  if (w < 2 || h < 1) return;
  if (h === 1) {
    for (let i = 0; i < w; i++) s.set(x + i, y, across, tone);
    return;
  }
  for (let i = 1; i < w - 1; i++) (s.set(x + i, y, across, tone), s.set(x + i, y + h - 1, across, tone));
  for (let j = 1; j < h - 1; j++) (s.set(x, y + j, down, tone), s.set(x + w - 1, y + j, down, tone));
  s.set(x, y, tl, tone);
  s.set(x + w - 1, y, tr, tone);
  s.set(x, y + h - 1, bl, tone);
  s.set(x + w - 1, y + h - 1, br, tone);
}

// Writes runs from x, y, cut at `room` columns.
function writeRuns(s: Surface, x: number, y: number, runs: [string, number][], room: number) {
  for (const [w, k] of runs) {
    const part = w.slice(0, Math.max(0, room));
    s.write(x, y, part, k);
    x += part.length;
    room -= part.length;
  }
}

// --- the component -------------------------------------------------------------------------------

/**
 * How a figure moves: builds in once, then keeps moving in its cycle or holds (the default); builds and holds in a
 * loop, again and again; or never moves.
 */
export type Play = "once" | "loop" | "still";

/** The options every figure takes, besides its own. */
export interface Common {
  /** Words on the top edge, at the left, in lower case as written: the figure's own default, or none. false for none. */
  title?: string | false;
  /** Its frame: "rounded" (the default for most), "single", "heavy", "double", "ascii" (+ - |, for any place) or "none". */
  frame?: FrameStyle;
  /**
   * Its width in columns, the frame included, 16 to 160: what the figure takes by default, 48 for a figure of words,
   * which wrap to it, or its content's own width, up to 160.
   */
  width?: number;
  /** The accent: #rrggbb, { light, dark }, or a palette's name such as "ocean": the banners' orange by default. */
  color?: ColorLike;
  /**
   * "once" (the default): builds in when first seen, then keeps moving in its cycle, or holds; "loop": builds, holds,
   * and again; "still": never moves.
   */
  play?: Play;
  /** How fast it builds and moves: "slow", "normal" or "fast", or times as fast. */
  speed?: Speed;
}

/** The options every figure takes, by name, for optionsOf(). */
export const COMMON = ["title", "frame", "width", "color", "play", "speed"] as const;

/** A figure's own defaults for the options every figure takes: headline is unframed, as a banner is. */
export interface Defaults {
  frame?: FrameStyle;
  play?: Play;
}

/** The width a figure of words takes when none is given: 48 columns, frame included. */
export const PROSE = 48;
/** The widest a figure may be, frame included. */
export const WIDEST = 160;

/** The room a figure's body is laid out in: the columns inside the frame and its padding. */
export interface Room {
  /** The columns asked for with `width`, frame and padding taken off; undefined when the figure sizes itself. */
  cols: number | undefined;
  /** The columns a figure of words wraps to when it sizes itself: 44, inside a 48-column figure. */
  prose: number;
  /** The most it may take when it sizes itself: 156, inside a 160-column figure. */
  max: number;
}

/** Where a body draws and whether it is the still. */
export interface At {
  /** Its top left: the first column and row inside the frame's padding. */
  x: number;
  y: number;
  /** True for the still: the finished figure, held, with nothing passing over it (no cursor, no glint, no dot). */
  still: boolean;
}

/** What a figure draws inside its frame: its size, how long it takes to build, how it keeps moving, and the drawing. */
export interface Body {
  /** Its size inside the frame's padding. With `width` given it may be narrower than the room, never wider. */
  cols: number;
  rows: number;
  /** Seconds it takes to build in at normal speed: 0 for one that never moves. t at or past it is the finished figure. */
  intro: number;
  /**
   * Seconds of a seamless loop it keeps playing after its build while it is in view: undefined for a figure that
   * holds once built. draw() must give the same frame at t = intro and t = intro + cycle; its still stays at intro.
   */
  cycle?: number;
  /** With play "loop", seconds it holds the finished figure before building again: 3. */
  hold?: number;
  /** Frames a second while it moves: 30. */
  fps?: number;
  /** Its title when the reader gives none. */
  title?: string;
  /** Words on the top edge at the right, soft: a last move, a date. */
  label?: Runs;
  /** Words on the bottom edge at the right, soft, maybe changing as it builds: a count, who is to move. */
  status?: Runs | ((t: number, still: boolean) => Runs);
  /**
   * Body rows a dashed rule crosses, from 0, as a ticket's perforation: the frame meets each with ├┄ on its left and
   * ┄┤ on its right, and the body draws the ┄ between. With no frame the body alone draws it.
   */
  joins?: readonly number[];
  /** One sentence saying what the figure shows, for screen readers and meta.note. */
  says: string;
  /** "ui" (the default) or "data", for meta.category. */
  category?: "ui" | "data";
  /**
   * Draws the body at t seconds, its top left at at.x, at.y, in tones: s.write(x, y, words, SOFT). It depends on t
   * alone: anything random is seeded (the kit's fnv1a32 and mulberry32), never Math.random or the date.
   */
  draw(s: Surface, t: number, at: At): void;
}

/** A markdown figure: a kit piece, and what it is. */
export interface MarkdownPiece extends KitPiece {
  /** The figure it is: "headline". */
  readonly kind: Kind | (string & {});
  /** One sentence saying what it shows, for screen readers: a figure's aria-label. */
  readonly says: string;
  /** True when it keeps moving once it is built, in its cycle: a player keeps drawing it. */
  readonly idle: boolean;
  /**
   * Its motion, as a banner's is: svg() plays its build once and holds, or loops its cycle from the end of its build,
   * or loops a play "loop". Absent for a still.
   */
  readonly motion?: { seconds: number; from: number; once: boolean };
}

/**
 * Makes a markdown figure: checks the options every figure takes and the figure's `own`, lays its body out in the
 * room the width leaves, and returns a piece that draws the frame, its title (with a glint passing over it as it
 * comes into view), its labels and the body over time. With play "once" it builds in, then plays its cycle or holds,
 * its still the finished figure; "loop" builds, holds and comes round on a loop that divides a minute; "still" never
 * moves. `defaults` are the figure's own for the options every figure takes, as an unframed figure's frame "none".
 * Throws, the kit's way, for an option it doesn't take, a body too wide for the width asked or past 160 columns, or
 * one past 120 rows.
 */
export function component<O extends object>(
  kind: Kind | (string & {}),
  options: (O & Common) | undefined,
  own: readonly string[],
  make: (o: O & Common, room: Room) => Body,
  defaults: Defaults = {},
): MarkdownPiece {
  const what = `${kind}()`;
  const o = optionsOf(what, options, [...COMMON, ...own]) as O & Common;
  const frame = wordOf(`${kind}'s frame`, o.frame, FRAMES, defaults.frame ?? "rounded");
  const pad = frame === "none" ? 0 : 2;
  const width = o.width === undefined ? undefined : wholeOf(`${kind}'s width`, o.width, PROSE, 16, WIDEST);
  const accent = o.color === undefined ? undefined : colorOf(o.color, `${kind}'s color`);
  const play = wordOf(`${kind}'s play`, o.play, ["once", "loop", "still"] as const, defaults.play ?? "once");
  const speed = speedOf(what, o.speed);
  // a number reads as its words, so a version given as title: 2 or from data is a title
  const titled = typeof o.title === "number" && Number.isFinite(o.title) ? String(o.title) : o.title;
  if (titled !== undefined && titled !== false && typeof titled !== "string") fail(`${kind}'s title takes words, or false for none, not ${show(o.title)}`);
  const asked = typeof titled === "string" ? clean(titled, `${kind}'s title`).replace(/\s+/g, " ").trim() : undefined;

  const body = make(o, { cols: width === undefined ? undefined : width - 2 * pad, prose: PROSE - 4, max: WIDEST - 4 });
  if (!(Number.isInteger(body.cols) && body.cols >= 1 && Number.isInteger(body.rows) && body.rows >= 1)) fail(`${kind} laid out a body of ${body.cols} by ${body.rows}: a body is whole columns and rows, 1 or more`);
  if (width !== undefined && body.cols > width - 2 * pad) fail(`${kind} needs ${body.cols + 2 * pad} columns for this, and its width is ${width}: give it a width of ${body.cols + 2 * pad} or more, or less to show`);
  // Sizing itself, a body past the widest a figure can take would lose what is past it: say so, as rows do.
  if (body.cols + 2 * pad > WIDEST) fail(`${kind} needs ${body.cols + 2 * pad} columns for this, past the ${WIDEST} a figure can take: give it less to show, or shorter words`);
  if (body.cycle !== undefined && !(Number.isFinite(body.cycle) && body.cycle > 0)) fail(`${kind} laid out a cycle of ${body.cycle} seconds: a cycle is a number of seconds above 0, or none`);

  const title = o.title === false || asked === "" ? undefined : (asked ?? body.title);
  const label = runsOf(body.label, SOFT);
  // The edges' words need room: a corner and a stroke either side of each, and a stroke between. The status on the
  // bottom edge is measured as the still shows it.
  const ends = runsOf(typeof body.status === "function" ? body.status(body.intro, true) : body.status, SOFT);
  const need = frame === "none" ? 0 : Math.max(2 + (title ? title.length + 3 : 0) + (label.length ? widthOf(label) + 3 : 0) + 1, ends.length ? widthOf(ends) + 6 : 0);
  const cols = width ?? Math.min(WIDEST, Math.max(body.cols + 2 * pad, need));
  const rows = body.rows + (frame === "none" ? 0 : 2);
  if (rows > MAX.rows) fail(`${kind} draws ${rows} rows, past the ${MAX.rows} a piece can have: give it less to show, or split it in two`);

  const intro = Math.max(0, body.intro) / speed;
  const cycle = body.cycle === undefined ? undefined : body.cycle / speed;
  const moves = play !== "still" && (intro > 0 || cycle !== undefined);
  const period = play === "loop" && moves ? loopOf(intro + (body.hold ?? 3), true) : undefined;
  // With play "once", a figure with a cycle keeps moving once it is built.
  const lasting = moves && !period && cycle !== undefined;
  const timing = !moves ? { fps: 0 } : { fps: body.fps ?? 30, still: intro, ...(period ? { loop: period } : {}) };
  const says = clean(body.says, `${kind}'s words`).replace(/\s+/g, " ").trim();
  const style = frame === "none" ? null : BOXES[frame];
  const tl = style ? style[0] : "", tr = style ? style[1] : "", bl = style ? style[2] : "", br = style ? style[3] : "", across = style ? style[4] : "", down = style ? style[5] : "";
  const joins = frame === "none" ? null : JOINS[frame];
  const joined = new Set((body.joins ?? []).map((r) => r + 1));

  const made = piece(
    { name: title ?? kind, note: says.slice(0, 72) || kind, category: body.category ?? "ui", cols, rows, palette: paletteOf(accent), ...timing },
    (t, s) => {
      // build time: the speed's, and round the loop
      const bt = !moves ? body.intro : (period ? ((t % period) + period) % period : Math.max(0, t)) * speed;
      // The still: the finished figure with nothing passing over it. A figure that keeps moving once built is still
      // only at the moment its build ends, the moment a player holds for reduced motion and plain() prints.
      const isStill = !moves || Math.abs(bt - body.intro) < 1e-9 || (!lasting && !period && bt >= body.intro);
      body.draw(s, isStill ? body.intro : bt, { x: pad, y: style ? 1 : 0, still: isStill });
      if (!style || !joins) return;
      // the frame over the body's edges, so nothing drawn reaches past them
      for (let x = 1; x < cols - 1; x++) (s.set(x, 0, across, QUIET), s.set(x, rows - 1, across, QUIET));
      for (let y = 1; y < rows - 1; y++) {
        if (joined.has(y)) {
          // a dashed rule across the body meets the frame: ├┄ ... ┄┤
          s.set(0, y, joins[0], QUIET);
          s.set(1, y, joins[2], QUIET);
          s.set(cols - 2, y, joins[2], QUIET);
          s.set(cols - 1, y, joins[1], QUIET);
        } else (s.set(0, y, down, QUIET), s.set(cols - 1, y, down, QUIET));
      }
      s.set(0, 0, tl, QUIET);
      s.set(cols - 1, 0, tr, QUIET);
      s.set(0, rows - 1, bl, QUIET);
      s.set(cols - 1, rows - 1, br, QUIET);
      // the label at the top right, ─ label ─╮, then the title at the left, cut to the room the label leaves
      const lw = widthOf(label);
      if (lw && cols - lw - 4 >= 2) writeRuns(s, cols - lw - 4, 0, [[" ", QUIET], ...label, [" ", QUIET]], lw + 2);
      const room = cols - 6 - (lw ? lw + 3 : 0);
      if (title && room > 0) {
        const words = title.length > room ? (room > 3 ? `${title.slice(0, room - 3)}...` : title.slice(0, Math.max(0, room))) : title;
        s.write(2, 0, ` ${words} `, INK);
        // the glint: a band of the glint's colour with the accent at its edges, passing once from the left
        if (moves && !isStill && bt < GLINT_SECONDS) {
          const at = (bt / GLINT_SECONDS) * (words.length + 6) - 3;
          for (let i = 0; i < words.length; i++) {
            const d = Math.abs(i - at);
            if (d < 1.5) s.set(3 + i, 0, words[i], GLINT);
            else if (d < 3) s.set(3 + i, 0, words[i], ACCENT);
          }
        }
      }
      // the status at the bottom right, ─ status ─╯
      const st = runsOf(typeof body.status === "function" ? body.status(isStill ? body.intro : bt, isStill) : body.status, SOFT);
      const sw = widthOf(st);
      if (sw && cols - sw - 4 >= 2) writeRuns(s, cols - sw - 4, rows - 1, [[" ", QUIET], ...st, [" ", QUIET]], sw + 2);
    },
  );
  // svg() reads this as it reads a banner's: the cycle looped from the end of the build, a play "loop", or one play
  // of the build, held at its end
  const motion = !moves ? undefined : period ? { seconds: period, from: 0, once: false } : cycle !== undefined ? { seconds: cycle, from: intro, once: false } : { seconds: intro, from: 0, once: true };
  return Object.assign(made, { kind, says, idle: lasting, ...(motion ? { motion } : {}) }) as MarkdownPiece;
}

// --- reading a figure back ---------------------------------------------------------------------

/**
 * A figure as plain text: its still, the finished figure, in one ink, spaces at line ends left out. What to paste into
 * a fenced block in a README, an issue or a chat. With `ascii`, box drawing and blocks become + - | # = and the
 * like, for a place that has no box drawing.
 *
 *   plain(headline("ascii.rest"))
 */
export function plain(p: Piece, o: { ascii?: boolean; t?: number } = {}): string {
  if (!p || typeof p !== "object" || !p.meta || typeof p.default !== "function") fail(`plain() takes a piece, such as headline("ascii.rest"), not ${show(p)}`);
  const text = p.default({ ...p.meta.options })(o.t ?? p.meta.still ?? 0, { paper: true });
  const lines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
  return o.ascii ? lines.map(asciiOf).join("\n") : lines.join("\n");
}

// Box drawing and blocks as plain ASCII, one character for one, so each line keeps its width.
const ASCII = new Map<string, string>([
  ...[..."─━═┄┅┈┉╌╍╴╶╸╺╼╾"].map((c) => [c, "-"] as const),
  ...[..."│┃║┆┇┊┋╎╏╵╷╹╻╽╿"].map((c) => [c, "|"] as const),
  ...[..."▁▂▃▄"].map((c) => [c, "_"] as const),
  ...[..."▅▆▇█▉▊▋▌▍▎▏▐▀▓▙▛▜▟▚▞"].map((c) => [c, "#"] as const),
  ["▒", "="], ["░", "-"], ["▖", "."], ["▗", "."], ["▘", "'"], ["▝", "'"], ["●", "*"], ["•", "*"], ["·", "."], ["°", "o"],
]);

/** A line of a figure in plain ASCII: corners and joins as +, lines across as -, down as |, blocks as # = - and the like. */
export function asciiOf(line: string): string {
  let out = "";
  for (const ch of line) {
    const c = ch.charCodeAt(0);
    out += ASCII.get(ch) ?? (c >= 0x2500 && c <= 0x257f ? "+" : c >= 0x2580 && c <= 0x259f ? "#" : ch);
  }
  return out;
}
