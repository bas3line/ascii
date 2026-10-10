/*
 * marquee: a ticker. Its items scroll past behind a window, a dot in the
 * accent between each, round and round: latest news at the top of a README, a
 * banner across docs. At rest it shows the items that fit whole, from the
 * first, so its plain text never cuts a word.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii marquee
 *   "markdown components" "drawn in text" "npx ascii.rest add markdown"
 *   ```
 *
 *   marquee('"markdown components" "drawn in text"', { sep: "/" })
 *   marquee({ items: ["markdown components", "drawn in text"] })
 */
import { fail } from "../kit/core.ts";
import { ACCENT, INK, clean, component, progress, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A ticker as data: what a fence's body says, for items already in JavaScript. */
export interface MarqueeData {
  /** The items, in the order they pass: ["markdown components", "drawn in text"]. */
  items: string[];
}

export interface MarqueeOptions extends Common {
  /** The mark between two items, up to 3 characters, drawn with a space each side: "·". "" for spaces alone. */
  sep?: string;
}

// Cells a second it scrolls at; seconds its build takes, sliding in from the right; the longest its loop may be, a
// minute of scrolling; the most items.
const RATE = 8, SLIDE = 0.8, LONGEST_LOOP = 60 * RATE, ITEMS = 24;

const tidy = (text: string, what: string) => clean(text, what).replace(/\s+/g, " ").trim();

// The fence's body: each quoted text an item, and a line with no quotes one item, as it is written.
function parse(source: string): MarqueeData {
  const items: string[] = [];
  for (const s of statements(source, "marquee")) {
    if (!s.texts.length) {
      items.push(s.raw);
      continue;
    }
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`marquee's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii marquee ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    if (s.words.length) fail(`marquee's line ${s.line} has ${show(s.words.join(" "))} beside its quoted items: put it in quotes too, or on a line of its own`);
    items.push(...s.texts);
  }
  if (!items.length) fail(`marquee takes items to scroll, each in quotes, such as "markdown components" "drawn in text"`);
  return { items };
}

// Data, checked: every item some words, on one line.
function check(data: MarqueeData): string[] {
  if (!data || typeof data !== "object" || !Array.isArray(data.items)) fail(`marquee() takes a fence's body, its items in quotes, or { items: ["markdown components"] }, not ${show(data)}`);
  if (!data.items.length) fail(`marquee takes items to scroll, each in quotes, such as "markdown components" "drawn in text"`);
  if (data.items.length > ITEMS) fail(`marquee takes up to ${ITEMS} items, not ${data.items.length}: keep the newest`);
  return data.items.map((item, i) => {
    if (typeof item !== "string") fail(`marquee's item ${i + 1} takes words, not ${show(item)}`);
    const words = tidy(item, `marquee's item ${i + 1}`);
    if (!words) fail(`marquee's item ${i + 1} is empty: each item takes words, as "markdown components"`);
    return words;
  });
}

/**
 * A ticker from a fence's body, `"an item" "another"`, or { items }: the items scroll left behind a window, 48
 * columns wide by default, a mark between each, round and round. Its build slides them in from the right in 0.8
 * seconds; then they scroll 8 cells a second for as long as it is in view, a loop lasting the strip's length over 8.
 * At rest, and in its still, it shows as many whole items as fit, from the first, and blank after them: the strip
 * keeps that blank before the next item, so the loop comes round to it seamlessly.
 *
 *   marquee('"markdown components" "drawn in text" "npx ascii.rest add markdown"')
 *   marquee("shipping today", { width: 30, frame: "heavy" })
 */
export function marquee(source: string | MarqueeData, options?: MarqueeOptions): MarkdownPiece {
  const items = check(typeof source === "string" ? parse(source) : source);
  return component(
    "marquee",
    options,
    ["sep"],
    (o, room) => {
      if (o.sep !== undefined && typeof o.sep !== "string") fail(`marquee's sep takes a mark of up to 3 characters, such as "·" or "/", or "" for spaces alone, not ${show(o.sep)}`);
      const mark = o.sep === undefined ? "·" : tidy(o.sep, "marquee's sep");
      if (mark.length > 3) fail(`marquee's sep takes a mark of up to 3 characters, drawn with a space each side, such as "·" or "/", not ${show(o.sep)}`);
      const sep = mark ? ` ${mark} ` : "   ";
      const W = room.cols ?? room.prose;
      // The items that fit whole at rest, from the first, and the columns they take with the marks between them.
      let fit = 0, used = 0;
      while (fit < items.length && used + (fit ? sep.length : 0) + items[fit].length <= W) used += (fit ? sep.length : 0) + items[fit++].length;
      // The strip, round: the items at rest, blank to the window's edge, then a mark, the rest of the items, a mark
      // after each. A first item wider than the window has no rest of whole items: its strip is the items and marks.
      const strip: [string, number][] = [];
      const put = (text: string, tone: number) => {
        for (const ch of text) strip.push([ch, tone]);
      };
      items.forEach((item, i) => {
        if (i === fit && fit) put(" ".repeat(W - used), INK);
        if (i) put(sep, ACCENT);
        put(item, INK);
      });
      if (fit === items.length) put(" ".repeat(W - used), INK);
      put(sep, ACCENT);
      const L = strip.length;
      if (L > LONGEST_LOOP) fail(`marquee loops up to ${LONGEST_LOOP} cells, a minute at ${RATE} a second, and these items take ${L}: fewer items, or shorter ones`);
      const cycle = L / RATE;
      const ease = (k: number) => 1 - (1 - k) ** 3;
      return {
        cols: W,
        rows: 1,
        intro: SLIDE,
        cycle,
        says: `marquee: ${items.join("; ")}.`,
        draw(s, t, at) {
          // how far along the strip the window's left edge is: from a window's width before it, sliding in to rest at 0,
          // then a cell every 1 / 8 seconds, round the strip
          let offset: number;
          if (t < SLIDE) offset = -Math.round(W * (1 - ease(progress(t, 0, SLIDE))));
          else {
            let u = (t - SLIDE) % cycle;
            if (u < 0 || u > cycle - 1e-6) u = 0;
            offset = Math.floor(u * RATE + 1e-6) % L;
          }
          for (let x = 0; x < W; x++) {
            const p = offset + x;
            if (p < 0) continue;
            const [ch, tone] = strip[p % L];
            if (ch !== " ") s.set(at.x + x, at.y, ch, tone);
          }
        },
      };
    },
  );
}
