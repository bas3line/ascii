/*
 * typing: a line that types itself behind a cursor, holds, then erases the
 * words in quotes and types the next, round and round: the tagline under a
 * README's title that keeps changing its word. The quoted words take turns in
 * the place they are written, at the start, the middle or the end of the line,
 * and a glint crosses each one as it lands.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii typing
 *   ascii.rest draws "scenes" "banners" "components"
 *   ```
 *
 *   typing('ascii.rest draws "scenes" "banners" "components"', { hold: 2 })
 *   typing({ before: "ascii.rest draws", turns: ["scenes", "banners", "components"] })
 */
import { fail } from "../kit/core.ts";
import { boolOf, numberOf } from "../kit/recipes/checks.ts";
import { ACCENT, GLINT, INK, clean, component, show, shown, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A typing line as data: what a fence's body says, for words already in JavaScript. */
export interface TypingData {
  /** The words before the ones that take turns: "ascii.rest draws". None by default. */
  before?: string;
  /** The words that take turns in their place, each typed, held and erased in order, then round again: ["scenes", "banners"]. */
  turns?: string[];
  /** The words after them: "for you". None by default. */
  after?: string;
}

export interface TypingOptions extends Common {
  /** Seconds each word stays typed before it is erased: 1.6, from 0.2 to 10. */
  hold?: number;
  /** A block cursor, ▌, typing ahead of the words and blinking while they hold: true. */
  cursor?: boolean;
}

// Characters a second it types and erases at, and the beat between an erase and the next word.
const TYPE = 18, ERASE = 30, BEAT = 0.25;
// The longest its build may take, typing faster for a long line; the most words that take turns; the cursor.
const LONGEST_BUILD = 3, TURNS = 12, CURSOR = "▌";
// Half blinks a second, so the cursor blinks at 2 Hz; seconds the glint takes to cross a word that has just landed.
const BLINK = 4, SWEEP = 0.45;

// Words from a source, made one line: cleaned, runs of spaces as one.
const tidy = (text: string, what: string) => clean(text, what).replace(/\s+/g, " ").trim();
const cut = (text: string) => (text.length > 40 ? `${text.slice(0, 40)}...` : text);

// The fence's body: bare words are fixed, and the quoted words, side by side, take turns where they stand.
function parse(source: string): TypingData {
  const lines = statements(source, "typing");
  if (!lines.length) fail(`typing takes a line to type, with the words that take turns in quotes, such as ascii.rest draws "scenes" "banners"`);
  if (lines.length > 1) fail(`typing types one line, and line ${lines[1].line} is a second one: ${show(cut(lines[1].raw))}. Give it a fence of its own`);
  const s = lines[0];
  const key = Object.keys(s.attrs)[0];
  if (key !== undefined) fail(`typing's line has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii typing ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
  const before: string[] = [], turns: string[] = [], after: string[] = [];
  for (const token of s.tokens) {
    if ("text" in token) {
      if (after.length) fail(`typing's quoted words take turns in one place, and ${show(token.text)} stands apart from the others, after ${show(after.join(" "))}: write them side by side`);
      turns.push(token.text);
    } else if ("word" in token) (turns.length ? after : before).push(token.word);
  }
  return { ...(before.length ? { before: before.join(" ") } : {}), turns, ...(after.length ? { after: after.join(" ") } : {}) };
}

// Data, checked: words cleaned and made one line, every turn some words.
function check(data: TypingData): { before: string; turns: string[]; after: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(`typing() takes a fence's body, such as ascii.rest draws "scenes" "banners", or { before, turns, after }, not ${show(data)}`);
  const words = (v: unknown, what: string) => {
    if (v === undefined) return "";
    if (typeof v !== "string") fail(`typing's ${what} takes words, not ${show(v)}`);
    return tidy(v, `typing's ${what}`);
  };
  const before = words(data.before, "before"), after = words(data.after, "after");
  if (data.turns !== undefined && !Array.isArray(data.turns)) fail(`typing's turns take a list of words, such as ["scenes", "banners"], not ${show(data.turns)}`);
  const turns = (data.turns ?? []).map((t, i) => {
    if (typeof t !== "string") fail(`typing's turn ${i + 1} takes words, not ${show(t)}`);
    const w = tidy(t, `typing's turn ${i + 1}`);
    if (!w) fail(`typing's turn ${i + 1} is empty: each word in quotes takes words, as "scenes"`);
    return w;
  });
  if (turns.length > TURNS) fail(`typing takes up to ${TURNS} words that take turns, not ${turns.length}: keep the ones that matter most`);
  if (!before && !turns.length && !after) fail(`typing takes words to type, such as ascii.rest draws "scenes" "banners"`);
  return { before, turns, after };
}

/**
 * A line that types itself behind a cursor, then erases its quoted words and types the next, in turn, from a fence's
 * body, `ascii.rest draws "scenes" "banners"`, or { before, turns, after }. Unframed by default. It types the line
 * at 18 characters a second, then keeps cycling while in view: each word holds, its glint crossing it and the cursor
 * blinking, is erased at 30 a second and the next typed. With one quoted word or none it types once, then only its
 * cursor blinks. Its still is the line with its first word typed and no cursor.
 *
 *   typing('ascii.rest draws "scenes" "banners" "components"')
 *   typing('"fast" "small" "plain" by default', { hold: 1, cursor: false })
 */
export function typing(source: string | TypingData, options?: TypingOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component(
    "typing",
    options,
    ["hold", "cursor"],
    (o, room) => {
      const hold = numberOf("typing's hold", o.hold, 1.6, 0.2, 10);
      const cursor = boolOf("typing's cursor", o.cursor, true);
      // The line is head, then the word in turn, then tail. A line with no quoted words is all head, its slot empty at
      // its end.
      const slot = data.turns.length > 0;
      const head = slot ? (data.before ? `${data.before} ` : "") : [data.before, data.after].filter(Boolean).join(" ");
      const tail = slot && data.after ? ` ${data.after}` : "";
      const turns = slot ? data.turns : [""];
      const longest = head.length + Math.max(...turns.map((w) => w.length)) + tail.length;
      const need = longest + (cursor ? 1 : 0);
      const extra = o.width === undefined ? 0 : o.width - room.cols!;
      const line = `${head}${turns[0]}${tail}`;
      if (room.cols !== undefined && need > room.cols)
        fail(`typing needs ${need + extra} columns for ${show(cut(line))}${turns.length > 1 ? " and its longest word" : ""}${cursor ? " and its cursor" : ""}, and its width is ${o.width}: give it a width of ${need + extra} or more, or fewer words`);
      if (need > room.max) fail(`typing types one line of up to ${room.max - (cursor ? 1 : 0)} characters${cursor ? " and its cursor" : ""}, and ${show(cut(line))} needs ${longest}: fewer words, or a fence for each line`);

      // The build types the first whole line, faster for a long one so it is done within 3 seconds.
      const first = line.length;
      const rate = Math.max(TYPE, first / LONGEST_BUILD);
      const intro = first / rate;
      // Then each word in turn: it holds, is erased, a beat, and the next is typed. A line whose word never changes
      // only blinks its cursor, a second a round.
      const turning = turns.length > 1;
      const rounds = turns.map((w, i) => {
        const next = turns[(i + 1) % turns.length];
        return { word: w, next, held: hold, erased: w.length / ERASE, typed: next.length / TYPE };
      });
      const cycle = turning ? rounds.reduce((n, r) => n + r.held + r.erased + BEAT + r.typed, 0) : cursor ? 1 : undefined;

      return {
        cols: room.cols ?? need,
        rows: 1,
        intro,
        ...(cycle !== undefined ? { cycle } : {}),
        says: `typing: ${[data.before, data.turns.join(", "), data.after].filter(Boolean).join(" ")}.`,
        draw(s, t, at) {
          // the word in its slot, the cursor and whether it shows, and where the glint is along the word
          let word: string, caret: number | null, glint: number | null = null;
          if (t < intro) {
            // the build: the first whole line typed left to right, the cursor solid ahead of it
            const k = shown(t, 0, first, rate);
            for (let i = 0; i < k; i++) s.set(at.x + i, at.y, line[i], i >= head.length && i < head.length + turns[0].length ? ACCENT : INK);
            if (cursor && !at.still) s.set(at.x + k, at.y, CURSOR, ACCENT);
            return;
          }
          let u = cycle === undefined ? 0 : (t - intro) % cycle;
          if (cycle !== undefined && (u < 0 || u > cycle - 1e-6)) u = 0;
          const blink = (h: number) => (Math.floor(h * BLINK) % 2 === 1 ? head.length + word.length : null);
          if (!turning) {
            word = turns[0];
            caret = blink(u);
          } else {
            let r = 0;
            while (r < rounds.length - 1 && u >= rounds[r].held + rounds[r].erased + BEAT + rounds[r].typed) {
              const d = rounds[r];
              u -= d.held + d.erased + BEAT + d.typed;
              r++;
            }
            const d = rounds[r];
            if (u < d.held) {
              // holding: the word typed, its glint crossing it once, the cursor blinking after it
              word = d.word;
              caret = blink(u);
              if (u < SWEEP) glint = -2 + (word.length + 4) * (u / SWEEP);
            } else if (u < d.held + d.erased) {
              word = d.word.slice(0, d.word.length - shown(u, d.held, d.word.length, ERASE));
              caret = head.length + word.length;
            } else if (u < d.held + d.erased + BEAT) {
              word = "";
              caret = head.length;
            } else {
              word = d.next.slice(0, shown(u, d.held + d.erased + BEAT, d.next.length, TYPE));
              caret = head.length + word.length;
            }
          }
          s.write(at.x, at.y, head, INK);
          for (let i = 0; i < word.length; i++) s.set(at.x + head.length + i, at.y, word[i], glint !== null && Math.abs(i - glint) < 1 ? GLINT : ACCENT);
          s.write(at.x + head.length + word.length, at.y, tail, INK);
          if (cursor && caret !== null && !at.still) s.set(at.x + caret, at.y, CURSOR, ACCENT);
        },
      };
    },
    { frame: "none" },
  );
}
