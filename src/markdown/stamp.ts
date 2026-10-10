/*
 * stamp: a rubber stamp that thuds onto the page, a word in banner()'s slim
 * letters in a double border, with who and when under it: an issue's word, a
 * changelog's "shipped". It is all one ink, the `tone` you give it; no word
 * means anything to it. Its wear is seeded by the word with the kit's
 * fnv1a32(), so the same word always wears the same way. As it builds, its
 * shadow darkens in its place, it lands with a jolt, and the wear settles in.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii stamp
 *   approved
 *   "by @bas3line on 2026-10-10"
 *   ```
 *
 *   stamp('approved "by @bas3line on 2026-10-10"', { tone: "good" })
 *   stamp({ word: "shipped", line: "v0.5, 2026-10-11" })
 */
import { fail, fnv1a32, hash } from "../kit/core.ts";
import { wordOf } from "../kit/recipes/checks.ts";
import { banner, drawable as inFont } from "../banner.ts";
import { ACCENT, BAD, GOOD, QUIET, VIOLET, WARN, clean, component, progress, show, statements, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** A stamp as data: its word, and the small line under it. */
export interface StampData {
  /** The stamp's word, or words, in slim banner letters: "approved". */
  word: string;
  /** A small line under it: who and when. None by default. */
  line?: string;
}

/** The inks a stamp comes in. */
export type StampTone = "accent" | "good" | "warn" | "bad" | "violet";

export interface StampOptions extends Common {
  /** The stamp's ink: "accent" (the default, ascii.rest's orange, or `color`), "good", "warn", "bad" or "violet". */
  tone?: StampTone;
}

const TONES: Readonly<Record<StampTone, number>> = { accent: ACCENT, good: GOOD, warn: WARN, bad: BAD, violet: VIOLET };
// The build: the shadow darkens in the stamp's place, it lands and jolts a column for two frames, then the wear
// settles in, cell by cell.
const INTRO = 0.8, LANDS = 0.3, JOLT = 2 / 30, WEAR: readonly [number, number] = [0.42, 0.78];
// A worn cell, where the stamp's ink did not take, and the shadow before it lands.
const WORN = "▒", SHADOW = "░";
// One letter cell in this many is worn, by the word's hash.
const WEAR_ONE_IN = 9;

// The fence's body: bare words are the stamp's word, a quoted text the small line.
function parse(source: string): StampData {
  const lines = statements(source, "stamp");
  if (!lines.length) fail(`stamp takes a word for its face, and a quoted line under it if you like, such as approved "by @bas3line"`);
  let word: string | undefined, line: string | undefined;
  for (const s of lines) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`stamp's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii stamp ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    if (s.words.length) {
      if (word !== undefined) fail(`stamp's word is one line, and line ${s.line} has words too: ${show(s.words.join(" "))}`);
      word = s.words.join(" ");
    }
    for (const text of s.texts) {
      if (line !== undefined) fail(`stamp takes one quoted line under its word, and line ${s.line} has another: ${show(text)}`);
      line = text;
    }
  }
  if (word === undefined) fail(`stamp takes a word for its face, not only a quoted line: write it bare, as approved ${show(line)}`);
  return { word, ...(line !== undefined ? { line } : {}) };
}

// Data, checked: a word every slim letter has, and a line, cleaned.
function check(data: StampData): StampData {
  if (!data || typeof data !== "object") fail(`stamp() takes a fence's body, such as approved "by @bas3line", or { word, line }, not ${show(data)}`);
  if (typeof data.word !== "string" || !data.word.trim()) fail(`stamp's word takes a word for its face, such as "approved", not ${show(data.word)}`);
  if (data.line !== undefined && typeof data.line !== "string") fail(`stamp's line takes words, not ${show(data.line)}`);
  const word = clean(data.word, "stamp's word").replace(/\s+/g, " ").trim();
  for (const ch of new Set(word))
    if (ch !== " " && !inFont(ch, "slim")) fail(`stamp's slim letters have no ${show(ch)}, in ${show(word)}: they draw A to Z, 0 to 9, a space and . , ! ? ' : - + = / _`);
  const line = data.line === undefined ? undefined : clean(data.line, "stamp's line").replace(/\s+/g, " ").trim();
  return { word, ...(line ? { line } : {}) };
}

/**
 * A rubber stamp from a fence's body, `approved "by @bas3line on 2026-10-10"`, or { word, line }: the word in banner's
 * slim letters, a cell in nine of them worn, and the line under it, in a double border, all in one ink. Unframed by
 * default, as it draws its own border. Its shadow darkens, it lands with a jolt and its wear settles in; then it holds.
 *
 *   stamp("shipped", { tone: "violet" })
 */
export function stamp(source: string | StampData, options?: StampOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component(
    "stamp",
    options,
    ["tone"],
    (o, room) => {
      const tone = TONES[wordOf("stamp's tone", o.tone, Object.keys(TONES) as StampTone[], "accent")];
      const art = banner(data.word, { font: "slim", shadow: "none", pixel: 1, gap: 1, fill: "█", effect: "still" });
      const letters = art.default()(0, { paper: true }).split("\n");
      const lw = art.meta.cols, lh = art.meta.rows;
      // the face: the letters, and the line wrapped to the widest a stamp can take; then the border round it
      const extra = o.width === undefined ? 0 : o.width - room.cols!;
      if (room.cols !== undefined && lw + 4 > room.cols)
        fail(`stamp needs ${lw + 4 + extra} columns for ${show(data.word)} in slim letters, and its width is ${o.width}: give it a width of ${lw + 4 + extra} or more, or a shorter word`);
      if (lw + 4 > room.max) fail(`stamp needs ${lw + 4} columns for ${show(data.word)} in slim letters, past the ${room.max} it can take: a shorter word`);
      // framed with a long title, the stamp widens with it
      const asked = (o.frame ?? "none") === "none" || o.title === false || o.title === undefined ? 0 : String(o.title).replace(/\s+/g, " ").trim().length;
      const cols = room.cols ?? Math.min(room.max, Math.max(Math.max(lw, data.line?.length ?? 0) + 4, asked + 2));
      const inner = cols - 2;
      const small = wrap(data.line ?? "", inner - 2);
      const rows = lh + small.length + 2;
      const lx = 1 + Math.floor((inner - lw) / 2);
      // the wear: a letter cell is worn when the word's hash of it says so, and gives way at a time seeded by the word
      const seed = fnv1a32(data.word);
      const wearsAt = letters.map((l, y) =>
        [...l].map((ch, x) => (ch === "█" && fnv1a32(`${data.word}:${x}:${y}`) % WEAR_ONE_IN === 0 ? WEAR[0] + hash(x, y, seed, 3) * (WEAR[1] - WEAR[0]) : Infinity)),
      );
      // the shadow comes in from the middle out, soft at its edges
      const shades = (x: number, y: number) => {
        const d = Math.max(Math.abs(x - (cols - 1) / 2) / (cols / 2), Math.abs(y - (rows - 1) / 2) / (rows / 2));
        return 0.55 * hash(x, y, seed, 5) + 0.4 * d;
      };
      return {
        cols,
        rows,
        intro: INTRO,
        says: `stamp: ${data.word}${data.line ? `, ${data.line}` : ""}.`,
        draw(s, t, at) {
          if (t < LANDS) {
            // the shadow of the stamp as it comes down, darkening in its place
            const p = progress(t, 0, LANDS);
            for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (shades(x, y) < p) s.set(at.x + x, at.y + y, SHADOW, QUIET);
            return;
          }
          // landed, and for two frames a column to the right: the thud
          const ox = at.x + (t < LANDS + JOLT ? 1 : 0), oy = at.y;
          s.write(ox, oy, `╔${"═".repeat(inner)}╗`, tone);
          s.write(ox, oy + rows - 1, `╚${"═".repeat(inner)}╝`, tone);
          for (let y = 1; y < rows - 1; y++) (s.set(ox, oy + y, "║", tone), s.set(ox + cols - 1, oy + y, "║", tone));
          letters.forEach((l, y) => {
            for (let x = 0; x < l.length; x++)
              if (l[x] === "█") s.set(ox + lx + x, oy + 1 + y, t >= wearsAt[y][x] ? WORN : "█", tone);
          });
          small.forEach((l, i) => s.write(ox + 1 + Math.floor((inner - l.length) / 2), oy + 1 + lh + i, l, tone));
        },
      };
    },
    { frame: "none" },
  );
}
