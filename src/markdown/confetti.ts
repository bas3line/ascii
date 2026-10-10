/*
 * confetti: a burst of confetti over a message, settling round it. Each piece
 * is thrown from the message's middle, carried by gravity and slowed by drag
 * as the kit's particles are, drawn as a streak along its heading while it
 * flies, and lands on its own cell, seeded by the message's words, so the same
 * words always settle the same way and the plain text is the same everywhere.
 * A release post's 1.0, an issue's thanks.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii confetti
 *   "v1.0 is out" "1,000 stars"
 *   ```
 *
 *   confetti('"v1.0 is out" "1,000 stars"')
 *   confetti({ lines: ["thank you"] }, { count: 30 })
 */
import { fail, fnv1a32, mulberry32 } from "../kit/core.ts";
import { wholeOf } from "../kit/recipes/checks.ts";
import { streak } from "../kit/particles.ts";
import { ACCENT, GLINT, GOOD, INK, VIOLET, WARN, clean, component, progress, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** Confetti as data: what a fence's body says, for words already in JavaScript. */
export interface ConfettiData {
  /** The message: one line or two, centred under the burst: ["v1.0 is out", "1,000 stars"]. */
  lines: readonly string[];
}

export interface ConfettiOptions extends Common {
  /** How many pieces land round the message: 22, a whole number from 1 to 200 (no more than there are cells free). */
  count?: number;
}

// The glyphs a piece lands as, and the colours they take in turn.
const BITS = "*+·°•',~";
const INKS = [ACCENT, GOOD, WARN, VIOLET, GLINT];
// The build: the pieces thrown from 0.2 s to 0.32 s and landed by 1.8 s; the message pops out from its middle at 0.2 s.
const INTRO = 1.8, THROW = 0.2, STAGGER = 0.12, FLIGHT = 1.0, FLIGHT_MORE = 0.45, POP = 0.2, POP_FOR = 0.12;
// The air: drag, a second, and gravity in cells a second squared, a row being two cells tall as on the screen.
const DRAG = 2.2, GRAVITY = 12;
// Five rows; the message on the middle row, or the middle two.
const ROWS = 5, TOP = 2;

// The fence's body: each quoted text is a line of the message, as is a line of bare words.
function parse(source: string): ConfettiData {
  const lines: string[] = [];
  for (const s of statements(source, "confetti")) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`confetti's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii confetti ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    if (s.texts.length && s.words.length) fail(`confetti's line ${s.line} has words outside its quotes, ${show(s.words.join(" "))}: put the message in quotes, a line in each`);
    if (s.texts.length) lines.push(...s.texts);
    else lines.push(s.words.join(" "));
  }
  return { lines };
}

// Data, checked: one or two lines, cleaned.
function check(data: ConfettiData): string[] {
  if (!data || typeof data !== "object" || !Array.isArray(data.lines)) fail(`confetti() takes a fence's body, such as "v1.0 is out" "1,000 stars", or { lines }, not ${show(data)}`);
  const lines = data.lines.map((l, i) => {
    if (typeof l !== "string") fail(`confetti's line ${i + 1} takes words, not ${show(l)}`);
    return clean(l, "confetti's message").replace(/\s+/g, " ").trim();
  });
  if (!lines.length || lines.every((l) => !l)) fail(`confetti takes a message to burst over, a line or two in quotes, such as "v1.0 is out" "1,000 stars"`);
  if (lines.length > 2) fail(`confetti takes a message of one line or two, not ${lines.length}: ${show(lines[2])} is a third`);
  return lines;
}

/**
 * A burst of confetti over a message of a line or two, from a fence's body, `"v1.0 is out" "1,000 stars"`, or {
 * lines }. Unframed, 44 columns by 5 rows by default. The pieces burst from the message's middle with gravity and
 * drag, streaking as they fly, and land on cells seeded by the message's words, with the kit's fnv1a32 and mulberry32;
 * the message pops in as they go. Then it holds.
 *
 *   confetti('"shipped"', { count: 40, width: 60 })
 */
export function confetti(source: string | ConfettiData, options?: ConfettiOptions): MarkdownPiece {
  const lines = check(typeof source === "string" ? parse(source) : source);
  return component(
    "confetti",
    options,
    ["count"],
    (o, room) => {
      const count = wholeOf("confetti's count", o.count, 22, 1, 200);
      const longest = Math.max(...lines.map((l) => l.length));
      const framed = o.frame !== undefined && o.frame !== "none";
      // the message and room for confetti beside it: 4 columns each side at the least
      const least = longest + 8;
      const need = longest + 4 + (o.width! - (room.cols ?? 0));
      if (room.cols !== undefined && longest + 4 > room.cols) fail(`confetti needs ${need} columns for ${show(lines.join(" / "))}, and its width is ${o.width}: give it a width of ${need} or more, or a shorter message`);
      if (least > room.max) fail(`confetti needs ${least} columns for ${show(lines.join(" / "))}, past the ${room.max} it can take: a shorter message`);
      const W = room.cols ?? Math.max(framed ? 40 : 44, least);
      // the message, each line centred, and the cells kept clear round it: its rows, a column before and two after
      const at = lines.map((l) => Math.floor((W - l.length) / 2));
      const box = Math.floor((W - longest) / 2);
      const clear = (x: number, y: number) => y >= TOP && y < TOP + lines.length && x >= box - 1 && x <= box + longest + 1;
      const free = W * ROWS - lines.length * Math.min(W, longest + 3);
      // where each piece lands: x, y and a glyph each from the message's words, skipping the clear cells and any taken
      const rnd = mulberry32(fnv1a32(lines.join("\n")));
      const taken = new Set<number>();
      const landed: { x: number; y: number; ch: string; tone: number }[] = [];
      for (let tries = 0; landed.length < Math.min(count, free) && tries < 20000; tries++) {
        const x = Math.floor(rnd() * W), y = Math.floor(rnd() * ROWS), ch = BITS[Math.floor(rnd() * BITS.length)];
        if (clear(x, y) || taken.has(y * W + x)) continue;
        taken.add(y * W + x);
        landed.push({ x, y, ch, tone: INKS[landed.length % INKS.length] });
      }
      // each piece's throw: when, how long it flies, and the speed that lands it on its cell, from the message's middle
      const air = mulberry32(fnv1a32(`${lines.join("\n")}\nthrown`));
      const x0 = W / 2, y0 = (TOP + lines.length / 2) * 2;
      const flights = landed.map((p) => {
        const from = THROW + air() * STAGGER, T = FLIGHT + air() * FLIGHT_MORE;
        const E = (1 - Math.exp(-DRAG * T)) / DRAG;
        const tx = p.x + 0.5, ty = (p.y + 0.5) * 2;
        return { from, T, vx: (tx - x0) / E, vy: (ty - y0 - (GRAVITY / DRAG) * (T - E)) / E };
      });
      return {
        cols: W,
        rows: ROWS,
        intro: INTRO,
        says: `confetti: ${lines.filter(Boolean).join(", ")}.`,
        draw(s, t, place) {
          landed.forEach((p, i) => {
            const f = flights[i];
            const age = t - f.from;
            if (age < 0) return;
            if (age >= f.T) {
              s.set(place.x + p.x, place.y + p.y, p.ch, p.tone);
              return;
            }
            // the closed form of a throw under gravity and drag, as the kit's particles move
            const decay = Math.exp(-DRAG * age), E = (1 - decay) / DRAG;
            const x = x0 + f.vx * E, y = y0 + f.vy * E + (GRAVITY / DRAG) * (age - E);
            const vx = f.vx * decay, vy = f.vy * decay + (GRAVITY / DRAG) * (1 - decay);
            // a streak along its heading while it is thrown, its own glyph as it slows and flutters down to land
            const ch = Math.hypot(vx, vy) > 6 && vy < 3 ? streak({ vx, vy }) : p.ch;
            s.set(place.x + Math.floor(x), place.y + Math.floor(y / 2), ch, p.tone);
          });
          // the message pops out from its middle as the burst goes, over the pieces
          const k = progress(t, POP, POP + POP_FOR);
          if (k > 0)
            lines.forEach((l, i) => {
              const half = Math.ceil((k * l.length) / 2);
              const mid = l.length / 2;
              for (let c = 0; c < l.length; c++) if (k >= 1 || Math.abs(c + 0.5 - mid) <= half) s.set(place.x + at[i] + c, place.y + TOP + i, l[c], i ? ACCENT : INK);
            });
        },
      };
    },
    { frame: "none" },
  );
}
