/*
 * headline: words in ascii.rest's banner letters, with their drop shadow and
 * a glint passing over them, and a small line under them. A README's top, a
 * release post's title. The letters are banner()'s own, so the page, the SVG
 * and the plain text agree.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii headline
 *   ascii.rest "animated ascii art for web pages"
 *   ```
 *
 *   headline('ascii.rest "animated ascii art for web pages"', { font: "slim" })
 *   headline({ words: "ascii.rest", line: "animated ascii art for web pages" })
 */
import { fail } from "../kit/core.ts";
import { show, wordOf } from "../kit/recipes/checks.ts";
import { banner, drawable as inFont, fonts, shadows, type Font, type FontName, type ShadowName } from "../banner.ts";
import { ACCENT, GLINT, INK, QUIET, SOFT, clean, component, progress, shown, statements, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** A headline as data: what a fence's body says, for words already in JavaScript. */
export interface HeadlineData {
  /** The big line, in banner letters: "ascii.rest". */
  words: string;
  /** A small line under it, in the page's own face: "animated ascii art for web pages". None by default. */
  line?: string;
}

export interface HeadlineOptions extends Common {
  /** banner()'s letters: "block" (the default), "slim", "tall", "bold", "round", "wide", "mixed" or "italic". */
  font?: FontName;
  /** banner()'s drop shadow: "double" (the default), "single", "heavy", "rounded", "ascii" or "none". */
  shadow?: ShadowName | "none";
  /** Where the letters and the line sit in a width wider than they are: "left" (the default) or "center". */
  align?: "left" | "center";
}

const FONTS = Object.keys(fonts) as FontName[];
const SHADOWS = [...(Object.keys(shadows) as ShadowName[]), "none"] as const;

// The build: each column of the letters drops in from above, left to right, then the glint crosses once; the small
// line types in behind them. Then a cycle: the glint crossing again at its start, and a rest.
const INTRO = 1.2, DROPS = 0.48, FALL = 0.12, GLINT_FROM = 0.6, LINE_FROM = 0.15, CYCLE = 6, SWEEP = 1.2;
// The glint's band, as banner()'s: its width in cells and its slant, a cell right for every row down.
const BAND = 2.4, SLANT = 1.2;

// The fence's body: bare words are the big line, a quoted text the small line under it.
function parse(source: string): HeadlineData {
  const lines = statements(source, "headline");
  if (!lines.length) fail(`headline takes words for its big line, and a quoted line under them if you like, such as ascii.rest "animated ascii art"`);
  let words: string | undefined, line: string | undefined;
  for (const s of lines) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`headline's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii headline ${key}=${s.attrs[key] || "..."}`);
    if (s.words.length) {
      if (words !== undefined) fail(`headline's big line is one line, and line ${s.line} has words too: ${show(s.words.join(" "))}`);
      words = s.words.join(" ");
    }
    for (const text of s.texts) {
      if (line !== undefined) fail(`headline takes one quoted line under its words, and line ${s.line} has another: ${show(text)}`);
      line = text;
    }
  }
  if (words === undefined) fail(`headline takes words for its big line, not only a quoted one: write them bare, as ascii.rest ${show(line)}`);
  return { words, ...(line !== undefined ? { line } : {}) };
}

// Data, checked: words, cleaned.
function check(data: HeadlineData): HeadlineData {
  if (!data || typeof data !== "object") fail(`headline() takes a fence's body, such as ascii.rest "a line", or { words, line }, not ${show(data)}`);
  if (typeof data.words !== "string" || !data.words.trim()) fail(`headline's words take words for its big line, such as "ascii.rest", not ${show(data.words)}`);
  if (data.line !== undefined && typeof data.line !== "string") fail(`headline's line takes words, not ${show(data.line)}`);
  const words = clean(data.words, "headline's words").replace(/\s+/g, " ").trim();
  const line = data.line === undefined ? undefined : clean(data.line, "headline's line").replace(/\s+/g, " ").trim();
  return { words, ...(line ? { line } : {}) };
}

/**
 * Words in banner letters with their drop shadow, a glint passing over them, and a small line under them, from a
 * fence's body, `ascii.rest "a small line"`, or { words, line }. Unframed by default, as a banner is. Its columns drop
 * in from the left, the glint crosses and the line types in; then the glint crosses again every 6 seconds while it is
 * in view. Its still is the letters with no glint.
 *
 *   headline('ascii.rest "animated ascii art for web pages"')
 *   headline({ words: "v0.5" }, { font: "tall", align: "center", width: 60 })
 */
export function headline(source: string | HeadlineData, options?: HeadlineOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component(
    "headline",
    options,
    ["font", "shadow", "align"],
    (o, room) => {
      const font = wordOf("headline's font", o.font, FONTS, "block");
      const shadow = wordOf("headline's shadow", o.shadow, SHADOWS, "double");
      const align = wordOf("headline's align", o.align, ["left", "center"] as const, "left");
      // Every character of the words, in a font that has it: banner() leaves out the rest, a headline says so.
      for (const ch of new Set(data.words)) {
        if (ch !== " " && !inFont(ch, font))
          fail(`headline's ${font} letters have no ${show(ch)}, in ${show(data.words)}: they draw ${(fonts[font] as Font).cased ? "A to Z, a to z" : "A to Z"}, 0 to 9, a space and . , ! ? ' : - + = / _`);
      }
      const art = banner(data.words, { font, shadow, pixel: 1, gap: 1, fill: "█", effect: "still" });
      const rows = art.default()(0, { paper: true }).split("\n");
      const W = art.meta.cols, H = art.meta.rows;
      // the columns a width leaves, the frame and its padding taken off, and what this needs
      const extra = o.width === undefined ? 0 : o.width - room.cols!;
      if (room.cols !== undefined && W > room.cols) fail(`headline needs ${W + extra} columns for ${show(data.words)} in ${font} letters, and its width is ${o.width}: give it a width of ${W + extra} or more, or font=slim`);
      if (W > room.max) fail(`headline needs ${W} columns for ${show(data.words)} in ${font} letters, past the ${room.max} it can take: fewer words, or font=slim`);
      const cols = room.cols ?? Math.min(room.max, Math.max(W, data.line?.length ?? 0));
      const small = wrap(data.line ?? "", cols);
      const typed = small.join("").length;
      const dx = align === "center" ? Math.floor((cols - W) / 2) : 0;
      // Where the glint's band is at t, its middle in cells along a row; null when it is out of sight.
      const left = -BAND - 1, right = W + SLANT * H + BAND + 1;
      const glintAt = (t: number, still: boolean): number | null => {
        if (still) return null;
        const u = t < INTRO ? (t - GLINT_FROM) / (INTRO - GLINT_FROM) : ((t - INTRO) % CYCLE) / SWEEP;
        return u >= 0 && u < 1 ? left + (right - left) * u : null;
      };
      return {
        cols,
        rows: H + (small.length ? 1 + small.length : 0),
        intro: INTRO,
        cycle: CYCLE,
        says: `headline: ${data.words}${data.line ? `, ${data.line}` : ""}.`,
        draw(s, t, at) {
          const glint = glintAt(t, at.still);
          for (let c = 0; c < W; c++) {
            // a column drops in from above, left to right
            const from = W > 1 ? (c / (W - 1)) * DROPS : 0;
            const p = progress(t, from, from + FALL);
            if (p <= 0) continue;
            const up = p >= 1 ? 0 : Math.ceil((1 - p) * H);
            for (let r = 0; r < H; r++) {
              const ch = rows[r][c];
              if (!ch || ch === " " || r - up < 0) continue;
              let tone = ch === "█" ? INK : QUIET;
              if (tone === INK && glint !== null) {
                const d = Math.abs(c + SLANT * r - glint);
                if (d < BAND / 2) tone = GLINT;
                else if (d < BAND) tone = ACCENT;
              }
              s.set(at.x + dx + c, at.y + r - up, ch, tone);
            }
          }
          // the small line types in behind the letters, done as the build ends
          let more = shown(t, LINE_FROM, typed, typed / (INTRO - LINE_FROM - 0.05));
          small.forEach((l, i) => {
            const part = l.slice(0, Math.max(0, more));
            more -= l.length;
            const x = align === "center" ? Math.floor((cols - l.length) / 2) : 0;
            s.write(at.x + x, at.y + H + 1 + i, part, SOFT);
          });
        },
      };
    },
    { frame: "none" },
  );
}
