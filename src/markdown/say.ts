/*
 * say: a little creature with a balloon, after the old Unix cowsay and
 * cowthink. The creature is the figure: one of six of ascii.rest's own (a cat,
 * an owl, a fox, a ghost, a robot, a crab), each with an idle of its own, and
 * one balloon of words over it, said or thought. A README's friendly footer,
 * an agent's sign-off.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii say creature=owl balloon=think
 *   where did i put that fence?
 *   ```
 *
 *   say("a fence in, a figure out.")
 *   say({ text: "beep. all tests pass." }, { creature: "robot" })
 */
import { fail } from "../kit/core.ts";
import { show, wordOf } from "../kit/recipes/checks.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, linesOf, progress, shown, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** The creatures: each ascii.rest's own art, at most 4 rows, with an idle of its own. */
export const CREATURES = ["cat", "owl", "fox", "ghost", "robot", "crab"] as const;
export type Creature = (typeof CREATURES)[number];

/** A balloon said, with a tail, or thought, with bubbles trailing down. */
export type Balloon = "say" | "think";

/** What a creature says, as data: the balloon's words, for words already in JavaScript. */
export interface SayData {
  /** The balloon's words, wrapped to fit; "\n\n" starts a new paragraph in it. */
  text: string;
}

export interface SayOptions extends Common {
  /** Who says it: "cat" (the default), "owl", "fox", "ghost", "robot" or "crab". */
  creature?: Creature;
  /** "say" (the default), a balloon with a tail; or "think", a closed one with bubbles trailing down to the creature. */
  balloon?: Balloon;
}

// A creature: its rows of art (a space is see-through), where its eyes are, [column, row], and its idle: the rows it
// draws at u, 0 to 1 through the cycle, which are the rest rows at 0, and how far it is lifted, in rows.
interface Art {
  rows: readonly string[];
  eyes: readonly (readonly [number, number])[];
  idle: (u: number) => { rows: readonly string[]; lift?: number; light?: boolean };
}

// within [a, b) of the cycle, in seconds of it
const during = (u: number, a: number, b: number) => u * CYCLE >= a && u * CYCLE < b;

const ART: Readonly<Record<Creature, Art>> = {
  // blinks, o.o to -.-, for 0.15 s
  cat: {
    rows: [" /\\_/\\", "( o.o )", " > ^ <"],
    eyes: [[2, 1], [4, 1]],
    idle: (u) => (during(u, 2, 2.15) ? { rows: [" /\\_/\\", "( -.- )", " > ^ <"] } : { rows: ART.cat.rows }),
  },
  // turns its head: its face slides a column and back
  owl: {
    rows: [",___,", "{o,o}", "/)__)", '-"-"-'],
    eyes: [[1, 1], [3, 1]],
    idle: (u) => (during(u, 1.4, 2.4) ? { rows: [",___,", " {o,o}", "/)__)", '-"-"-'] } : { rows: ART.owl.rows }),
  },
  // flicks an ear, twice
  fox: {
    rows: ["/\\   /\\", "\\ '-' /", " \\o.o/", "  `v'"],
    eyes: [[2, 2], [4, 2]],
    idle: (u) => (during(u, 1.5, 1.62) || during(u, 1.78, 1.9) ? { rows: ["/\\    /\\", "\\ '-' /", " \\o.o/", "  `v'"] } : { rows: ART.fox.rows }),
  },
  // bobs up a row and down, its hem fluttering while it floats
  ghost: {
    rows: [" .-\"-.", "( o o )", "|  O  |", "'^v^v^'"],
    eyes: [[2, 1], [4, 1]],
    idle: (u) => (during(u, 1, 2.6) ? { rows: [" .-\"-.", "( o o )", "|  O  |", "'v^v^v'"], lift: 1 } : { rows: ART.ghost.rows }),
  },
  // its antenna light blinks on, twice
  robot: {
    rows: ["   o", " .-|-.", " |o o|", " '-=-'"],
    eyes: [[2, 2], [4, 2]],
    idle: (u) => ({ rows: ART.robot.rows, light: during(u, 1, 1.25) || during(u, 1.5, 1.75) }),
  },
  // opens and closes its claws, twice
  crab: {
    rows: ["(\\/)  (\\/)", " \\_o  o_/", "  (____)", "  /|  |\\"],
    eyes: [[3, 1], [6, 1]],
    idle: (u) => (during(u, 1.2, 1.4) || during(u, 1.7, 1.9) ? { rows: ["(||)  (||)", " \\_o  o_/", "  (____)", "  /|  |\\"] } : { rows: ART.crab.rows }),
  },
};

// The column the creature stands at, under the balloon's tail; the words wrap to 28 columns by default.
const STAND = 4, WRAP = 28;
// The build: the creature appears, the balloon opens from its tail, then its words type at 30 a second, all within 2.5 s.
const APPEAR = 0.05, OPEN = 0.15, OPEN_FOR = 0.25, TYPE = 30, LONGEST = 2.5;
// The cycle: the creature's idle, once in 4 seconds.
const CYCLE = 4;

// The fence's body: free text, its lines joined by a space, a blank line a new paragraph.
function parse(source: string): SayData {
  const paras: string[][] = [[]];
  for (const line of linesOf(source)) {
    if (!line.trim()) {
      if (paras[paras.length - 1].length) paras.push([]);
    } else paras[paras.length - 1].push(line.trim());
  }
  return { text: paras.filter((p) => p.length).map((p) => p.join(" ")).join("\n\n") };
}

// Data, checked: words, cleaned, spaces in a row as one, paragraphs kept.
function check(data: SayData): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(`say() takes a fence's body, the balloon's words, or { text }, not ${show(data)}`);
  if (typeof data.text !== "string") fail(`say's text takes words, not ${show(data.text)}`);
  const text = clean(data.text, "say")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  if (!text) fail(`say takes the words for its balloon, such as a fence in, a figure out.`);
  return text;
}

/**
 * A little creature with a balloon of words over it, from a fence's body, free text, or { text }: said, with a tail,
 * or thought, with bubbles trailing down. Unframed by default; the words wrap at 28 columns, or to the width. The
 * creature appears, the balloon opens and the words type in; then the creature idles, once every 4 seconds: the cat
 * blinks, the owl turns its head, the fox flicks an ear, the ghost bobs, the robot's antenna light blinks, the crab
 * snaps its claws. Its still is the creature at rest and every word.
 *
 *   say("a fence in, a figure out.")
 *   say("where did i put that fence?", { creature: "owl", balloon: "think" })
 */
export function say(source: string | SayData, options?: SayOptions): MarkdownPiece {
  const text = check(typeof source === "string" ? parse(source) : source);
  return component(
    "say",
    options,
    ["creature", "balloon"],
    (o, room) => {
      const creature = wordOf("say's creature", o.creature, CREATURES, "cat");
      const balloon = wordOf("say's balloon", o.balloon, ["say", "think"] as const, "say");
      const art = ART[creature];
      // the creature's widest, at rest or in its idle
      const reach = Math.max(...[0, 0.3, 0.375, 0.4, 0.425, 0.45, 0.5].flatMap((u) => art.idle(u).rows.map((r) => r.length)), ...art.rows.map((r) => r.length));
      const words = wrap(text, room.cols !== undefined ? Math.max(1, room.cols - 4) : WRAP);
      const inner = Math.max(...words.map((l) => l.length));
      // a balloon is wide enough for its tail at the third column, or its bubbles
      const bw = Math.max(inner + 4, 7);
      const cols = Math.max(bw, STAND + reach);
      if (room.cols !== undefined && cols > room.cols) fail(`say needs ${cols + (o.width! - room.cols)} columns for its ${creature}, and its width is ${o.width}: give it a width of ${cols + (o.width! - room.cols)} or more`);
      const bh = words.length + 2;
      // under the balloon: the tail, one row, or the bubbles, two
      const link = balloon === "say" ? 1 : 2;
      const top = bh + link;
      const typed = words.join("").length;
      const from = OPEN + OPEN_FOR;
      const rate = Math.max(TYPE, typed / (LONGEST - from));
      const intro = Math.min(LONGEST, from + typed / rate);
      return {
        cols,
        rows: top + art.rows.length,
        intro,
        cycle: CYCLE,
        fps: 20,
        says: `say: ${creature === "owl" ? "an" : "a"} ${creature} ${balloon === "say" ? "says" : "thinks"} ${text.replace(/\s+/g, " ")}`,
        draw(s, t, at) {
          const k = t <= intro ? 0 : (t - intro) / CYCLE;
          const u = k - Math.floor(k) > 1 - 1e-9 ? 0 : k - Math.floor(k);
          // the creature, at rest through the build, then in its idle
          if (t >= APPEAR) {
            const pose = art.idle(u);
            const y = at.y + top - (pose.lift ?? 0);
            pose.rows.forEach((row, r) => {
              for (let c = 0; c < row.length; c++) if (row[c] !== " ") s.set(at.x + STAND + c, y + r, row[c], SOFT);
            });
            // its eyes where they are in this pose: the rest pose's, shifted with a row that slides
            for (const [ex, ey] of art.eyes) {
              const shift = pose.rows[ey].length - art.rows[ey].length;
              const ch = pose.rows[ey][ex + shift];
              if (ch && ch !== " " && ch !== "-") s.set(at.x + STAND + ex + shift, y + ey, ch, ACCENT);
            }
            if (pose.light) s.set(at.x + STAND + 3, y, "●", ACCENT);
          }
          // the balloon opens from its tail, then its words type in
          const open = progress(t, OPEN, OPEN + OPEN_FOR);
          if (open <= 0) return;
          const w = Math.max(2, Math.round(bw * open));
          const [tl, tr, bl, br, across, down] = "╭╮╰╯─│";
          for (let c = 1; c < w - 1; c++) (s.set(at.x + c, at.y, across, QUIET), s.set(at.x + c, at.y + bh - 1, across, QUIET));
          for (let r = 1; r < bh - 1; r++) (s.set(at.x, at.y + r, down, QUIET), s.set(at.x + w - 1, at.y + r, down, QUIET));
          s.set(at.x, at.y, tl, QUIET);
          s.set(at.x + w - 1, at.y, tr, QUIET);
          s.set(at.x, at.y + bh - 1, bl, QUIET);
          s.set(at.x + w - 1, at.y + bh - 1, br, QUIET);
          if (balloon === "say") {
            if (w > 4) s.set(at.x + 3, at.y + bh - 1, "┬", QUIET);
            s.set(at.x + STAND, at.y + bh, "╲", QUIET);
          } else {
            s.set(at.x + 3, at.y + bh, "O", QUIET);
            s.set(at.x + STAND, at.y + bh + 1, "o", QUIET);
          }
          if (open < 1) return;
          let more = shown(t, from, typed, rate);
          words.forEach((l, i) => {
            s.write(at.x + 2, at.y + 1 + i, l.slice(0, Math.max(0, more)), INK);
            more -= l.length;
          });
        },
      };
    },
    { frame: "none" },
  );
}
