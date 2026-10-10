/*
 * divider: a band of moving art between a document's sections, with words in
 * its middle or none. Waves roll along it, stars twinkle, rain falls, sparks
 * crackle down a wire, a little train pulls out and comes round again, or a
 * row of dots fills in and a pulse runs out along it. A README's rule that
 * moves; in a fence it prints as the rule it is.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii divider
 *   waves "part two"
 *   ```
 *
 *   divider('waves "part two"')
 *   divider({ style: "train", words: "next stop, the docs" }, { width: 60 })
 */
import { fail, fnv1a32, hash, mulberry32 } from "../kit/core.ts";
import { wordOf } from "../kit/recipes/checks.ts";
import { ACCENT, PROSE, QUIET, SOFT, WARN, clean, component, progress, show, shown, statements, type Common, type MarkdownPiece } from "./core.ts";

/** The divider's styles: what moves along it. */
export const DIVIDER_STYLES = ["waves", "stars", "rain", "sparks", "train", "dots"] as const;
export type DividerStyle = (typeof DIVIDER_STYLES)[number];

/** A divider as data: what a fence's body says, for words already in JavaScript. */
export interface DividerData {
  /** What moves along it: "waves" (the default), "stars", "rain", "sparks", "train" or "dots". */
  style?: DividerStyle;
  /** Words in its middle, two spaces clear each side: "part two". None by default. */
  words?: string;
}

/** A divider's options: the ones every figure takes. It has none of its own. */
export interface DividerOptions extends Common {}

// The build: the art drawn out from the middle to both ends, the words typing in behind it.
const INTRO = 0.7, WORDS_FROM = 0.1;
// Each style: its rows, its cycle in seconds, its frames a second.
const STYLES: Readonly<Record<DividerStyle, { rows: number; cycle: number; fps: number }>> = {
  waves: { rows: 1, cycle: 2, fps: 12 },
  stars: { rows: 3, cycle: 4, fps: 12 },
  rain: { rows: 3, cycle: 2, fps: 15 },
  sparks: { rows: 1, cycle: 2.4, fps: 10 },
  train: { rows: 3, cycle: 6, fps: 15 },
  dots: { rows: 1, cycle: 3, fps: 15 },
};
// The waves' pattern, 8 cells, travelling a cell to the right each eighth of the cycle.
const WAVE = "_.-'~'-.";
// The train, facing right: two cars and the engine, its chimney up. It rides above its rail of ═, which carries the
// words, so it never runs into them.
const TRAIN = [" .--.  .--.   _n_  ", "'o--o'-'o--o'-[o_o]>"];
// Sparks: steps of crackle a cycle.
const CRACKLE = 24;

// The fence's body: the style's name, and a quoted text for the middle.
function parse(source: string): DividerData {
  let style: string | undefined, words: string | undefined;
  for (const s of statements(source, "divider")) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`divider's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii divider ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    for (const w of s.words) {
      if (style !== undefined) fail(`divider takes one style and quoted words, and line ${s.line} has another word, ${show(w)}: put words to show in quotes, as waves "part two"`);
      style = w;
    }
    for (const text of s.texts) {
      if (words !== undefined) fail(`divider takes one quoted text for its middle, and line ${s.line} has another: ${show(text)}`);
      words = text;
    }
  }
  return { ...(style !== undefined ? { style: style as DividerStyle } : {}), ...(words !== undefined ? { words } : {}) };
}

// Data, checked: a style it has, words cleaned onto one line.
function check(data: DividerData): { style: DividerStyle; words: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(`divider() takes a fence's body, such as waves "part two", or { style, words }, not ${show(data)}`);
  const style = wordOf("divider's style", data.style, DIVIDER_STYLES, "waves");
  if (data.words !== undefined && typeof data.words !== "string") fail(`divider's words take words, not ${show(data.words)}`);
  const words = data.words === undefined ? "" : clean(data.words, "divider").replace(/\s+/g, " ").trim();
  return { style, words };
}

/**
 * A band of moving art between sections, from a fence's body, `waves "part two"`, or { style, words }: waves (the
 * default), stars, rain, sparks, a train or dots, with words in the middle or none. Unframed and 48 columns by default.
 * It draws out from the middle to both ends, then keeps moving while it is in view; its still is the art at rest, the
 * train parked at the left.
 *
 *   divider('stars "the docs"')
 *   divider({ style: "dots" }, { width: 30 })
 */
export function divider(source: string | DividerData, options?: DividerOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component(
    "divider",
    options,
    [],
    (o, room) => {
      const { style, words } = data;
      const { rows, cycle, fps } = STYLES[style];
      const framed = o.frame !== undefined && o.frame !== "none";
      // the words need two spaces each side and a cell of art past them; a train needs room to park beside them
      const least = Math.max(words ? words.length + 6 : 8, style === "train" ? TRAIN[1].length + 2 : 0);
      if (room.cols !== undefined && least > room.cols) fail(`divider needs ${least + (o.width! - room.cols)} columns for ${words ? show(words) : `its ${style}`}, and its width is ${o.width}: give it a width of ${least + (o.width! - room.cols)} or more, or fewer words`);
      if (least > room.max) fail(`divider needs ${least} columns for ${show(words)}, past the ${room.max} it can take: fewer words`);
      const W = room.cols ?? Math.max(framed ? room.prose : PROSE, least);
      // the row the words sit in: the middle one, or a train's rail
      const mid = rows === 1 ? 0 : style === "train" ? 2 : 1;
      // the words' gap in the middle row: the words with two spaces each side
      const gap = words ? words.length + 4 : 0;
      const left = Math.floor((W - gap) / 2);
      const inGap = (c: number, r: number) => gap > 0 && r === mid && c >= left && c < left + gap;
      const rand = mulberry32(fnv1a32(`${style}\n${words}\n${W}`));

      // stars: seeded cells, each twinkling in its own time; rain: seeded columns, each falling in its own time
      const stars: { c: number; r: number; phase: number; f: number }[] = [];
      const drops: { c: number; phase: number; f: number }[] = [];
      if (style === "stars")
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < W; c++) {
            const on = rand() < 0.24, phase = rand(), f = 1 + Math.floor(rand() * 2);
            if (on && !inGap(c, r)) stars.push({ c, r, phase, f });
          }
      if (style === "rain")
        for (let c = 0; c < W; c++) {
          const on = rand() < 0.5, phase = rand(), f = 2 + Math.floor(rand() * 2);
          if (on) drops.push({ c, phase, f });
        }
      const seed = fnv1a32(`${style}:${words}`) | 0;
      const centre = (W - 1) / 2;

      // the art at u, 0 to 1 through the cycle, one cell
      const art = (c: number, r: number, u: number): [string, number] | null => {
        switch (style) {
          case "waves":
            return [WAVE[(((c - Math.floor(u * WAVE.length)) % WAVE.length) + WAVE.length) % WAVE.length], QUIET];
          case "dots": {
            // every other column, counted out from the words' edges so both sides meet them alike
            const d = !gap ? c : c < left ? left - c : c - left - gap + 1;
            if (d % 2 !== (gap ? 1 : 0)) return null;
            // a pulse runs out from the middle to both ends in the first 60% of the cycle
            const run = u > 0 && u < 0.6 ? (u / 0.6) * (W / 2 + 2) : -9;
            const off = Math.abs(c - centre) - run;
            return off > -1 && off <= 1 ? ["•", ACCENT] : off > -3 && off <= -1 ? ["•", SOFT] : ["·", SOFT];
          }
          case "sparks": {
            // a spark runs the wire left to right, a short trail behind it; the wire crackles round it
            const head = Math.floor(-3 + u * (W + 6));
            if (c === head) return ["*", ACCENT];
            if (c === head - 1 || c === head - 2) return ["=", WARN];
            const k = hash(c, Math.floor(u * CRACKLE) % CRACKLE, seed);
            return k < 0.05 ? ["*", ACCENT] : k < 0.12 ? ["=", WARN] : ["-", QUIET];
          }
          case "train":
            return r === 2 ? ["═", QUIET] : null;
          default:
            return null;
        }
      };

      return {
        cols: W,
        rows,
        intro: INTRO,
        cycle,
        fps,
        says: `divider: ${style}${words ? `, ${words}` : ""}.`,
        draw(s, t, at) {
          // u: how far through the cycle, 0 at the end of the build, which is the still, and 0 again a cycle on
          const k = t <= INTRO ? 0 : (t - INTRO) / cycle;
          const u = k - Math.floor(k) > 1 - 1e-9 ? 0 : k - Math.floor(k);
          // the build: cells within reach of the middle, out to both ends
          const reach = progress(t, 0, INTRO) * (W / 2 + 1);
          const near = (c: number) => Math.abs(c + 0.5 - W / 2) <= reach;
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < W; c++) {
              if (!near(c) || inGap(c, r)) continue;
              const cell = art(c, r, u);
              if (cell) s.set(at.x + c, at.y + r, cell[0], cell[1]);
            }
          if (style === "stars")
            for (const st of stars) {
              if (!near(st.c)) continue;
              const b = 0.5 + 0.5 * Math.cos(2 * Math.PI * (st.f * u + st.phase));
              const [ch, tone] = b > 0.82 ? ["*", ACCENT] : b > 0.5 ? ["+", SOFT] : b > 0.2 ? ["·", SOFT] : [".", QUIET];
              s.set(at.x + st.c, at.y + st.r, ch, tone);
            }
          if (style === "rain")
            for (const d of drops) {
              if (!near(d.c)) continue;
              // four steps a fall: the three rows, then a beat out of sight
              const y = Math.floor((((d.f * u + d.phase) % 1) + 1) % 1 * 4);
              if (y > 2 || inGap(d.c, y)) continue;
              s.set(at.x + d.c, at.y + y, "',|"[y === 0 ? 0 : y === 2 ? 1 : 2], y === 2 ? SOFT : QUIET);
            }
          if (style === "train") {
            // parked at the left at rest; it pulls away, leaves at the right, and comes round to park again
            const span = W + TRAIN[1].length;
            const k = u * u * (3 - 2 * u);
            const along = Math.floor(k * span);
            const x = along <= W ? along : along - span;
            if (t >= INTRO * 0.5)
              TRAIN.forEach((row, r) => {
                for (let i = 0; i < row.length; i++) if (row[i] !== " " && near(x + i)) s.set(at.x + x + i, at.y + r, row[i], ACCENT);
              });
          }
          // the words type in behind the art, in the middle of the middle row
          const typed = shown(t, WORDS_FROM, words.length, words.length / (INTRO - WORDS_FROM - 0.05));
          if (typed) s.write(at.x + left + 2, at.y + mid, words.slice(0, typed), SOFT);
        },
      };
    },
    { frame: "none" },
  );
}
