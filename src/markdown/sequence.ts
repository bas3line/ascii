/*
 * sequence: messages between actors, top to bottom in time, each one
 * travelling its arrow. How a request moves through a system, for docs, an
 * issue or an agent's explanation. Written in PlantUML's notation, one message
 * a line: a -> b "words" a call, a --> b "words" a reply, a -> a "words" a call
 * to itself.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii sequence title="list users"
 *   browser -> api "GET /users"
 *   api -> db "select users"
 *   db --> api "12 rows"
 *   api --> browser "200 ok"
 *   ```
 *
 *   sequence('browser -> api "GET /users"\napi --> browser "200 ok"')
 *   sequence({ messages: [{ from: "browser", to: "api", text: "GET /users" }, { from: "api", to: "browser", text: "200 ok", reply: true }] })
 */
import { fail } from "../kit/core.ts";
import { show } from "../kit/recipes/checks.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, progress, statements, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** A message: who sends it, who gets it, its words, and whether it answers one (drawn dashed). */
export interface SequenceMessage {
  from: string;
  to: string;
  /** Its words, over its arrow: "GET /users". None by default. */
  text?: string;
  /** True for a reply, drawn dashed, as --> writes it. */
  reply?: boolean;
}

/** A sequence as data: its messages in order, top to bottom. */
export interface SequenceData {
  messages: readonly SequenceMessage[];
}

export type SequenceOptions = Common;

// A message's words wrap at this many columns, so one long message does not make the figure wide.
const LABEL = 32;
// The build: heads and lifelines draw down, then each message in turn, its dot running its arrow, at most this long.
const HEADS = 0.3, EACH = 0.4, MOST = 3;
// The cycle: a rest, then a dot runs each message again in turn.
const REST = 1.6, REPLAY = 0.55;
// An actor: one word, not starting or ending with - and holding no arrow.
const ACTOR = /^[^\s<>"]+$/;

// Reads an actor's name off one side of an arrow.
function actorOf(at: string, side: string, name: string, raw: string): string {
  if (!name) fail(`${at} has an arrow with no actor ${side} it: ${show(raw)}, a message is from -> to "words"`);
  if (!ACTOR.test(name) || name.startsWith("-") || name.endsWith("-")) fail(`${at} names an actor ${show(name)}: an actor is one word, as browser or api`);
  return name;
}

// The fence's body: one message a line, PlantUML's arrow between two actors and its words in quotes.
function parse(source: string): SequenceMessage[] {
  const lines = statements(source, "sequence");
  if (!lines.length) fail(`sequence takes messages, one a line, as browser -> api "GET /users", or api --> browser "200 ok" for a reply`);
  return lines.map((s) => {
    const at = `sequence's line ${s.line}`;
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`${at} has ${key}=${show(s.attrs[key])}: sequence's options go on the fence, as \`\`\`ascii sequence ${key}=${s.attrs[key] || "..."}`);
    if (s.texts.length > 1) fail(`${at} has ${s.texts.length} quoted texts: a message's words are one quoted text, as browser -> api "GET /users"`);
    const head = s.words.join(" ");
    const arrows = [...head.matchAll(/-->|->/g)];
    if (arrows.length > 1) fail(`${at} has ${arrows.length === 2 ? "two" : arrows.length} arrows; a message goes from one actor to one actor`);
    if (!arrows.length) {
      if (/<-/.test(head)) fail(`${at} points its arrow left: write the sender first, as api -> browser`);
      fail(`${at} has no arrow: a message is from -> to "words", or from --> to "words" for a reply, not ${show(s.raw)}`);
    }
    const m = arrows[0];
    const from = actorOf(at, "before", head.slice(0, m.index).trim(), s.raw);
    const to = actorOf(at, "after", head.slice(m.index! + m[0].length).trim(), s.raw);
    return { from, to, ...(s.texts.length && s.texts[0].trim() ? { text: s.texts[0].replace(/\s+/g, " ").trim() } : {}), ...(m[0] === "-->" ? { reply: true } : {}) };
  });
}

// Data, checked: each message from one actor to one, its words cleaned.
function check(data: SequenceData): SequenceMessage[] {
  if (!data || typeof data !== "object" || !Array.isArray(data.messages)) fail(`sequence() takes messages, such as browser -> api "GET /users", or { messages: [{ from, to, text }] }, not ${show(data)}`);
  if (!data.messages.length) fail(`sequence's messages take one message or more, such as { from: "browser", to: "api", text: "GET /users" }`);
  return data.messages.map((m, i) => {
    const at = `sequence's message ${i + 1}`;
    if (!m || typeof m !== "object") fail(`${at} is ${show(m)}: a message is { from, to, text }`);
    const name = (v: unknown, side: string) => {
      if (typeof v !== "string") fail(`${at}'s ${side} takes an actor's name, such as "api", not ${show(v)}`);
      return actorOf(at, side === "from" ? "before" : "after", clean(v, `${at}'s ${side}`).trim(), `${show(m.from)} -> ${show(m.to)}`);
    };
    if (m.text !== undefined && typeof m.text !== "string") fail(`${at}'s text takes words, not ${show(m.text)}`);
    const text = m.text === undefined ? "" : clean(m.text, `${at}'s text`).replace(/\s+/g, " ").trim();
    return { from: name(m.from, "from"), to: name(m.to, "to"), ...(text ? { text } : {}), ...(m.reply ? { reply: true } : {}) };
  });
}

/** A cell along a message's arrow, in the order its dot runs it. */
type Step = [x: number, y: number, ch: string];

/**
 * Messages between actors, top to bottom in time, from a fence's body in PlantUML's notation, one message a line:
 * `browser -> api "GET /users"` a call, drawn solid; `db --> api "12 rows"` a reply, drawn dashed; `api -> api
 * "check"` a call to itself, a loop on its lifeline. Actors stand in the order they first appear, each over its
 * lifeline, spaced so every message's words fit over its arrow. Heads and lifelines draw down, then a dot runs each
 * message from its sender to its receiver, drawing the arrow behind it as its words type; then, while it is in view, a
 * dot runs the messages again in turn.
 *
 *   sequence('browser -> api "GET /users"\napi --> browser "200 ok"', { title: "list users" })
 */
export function sequence(source: string | SequenceData, options?: SequenceOptions): MarkdownPiece {
  const messages = typeof source === "string" ? parse(source) : check(source);
  return component("sequence", options, [], () => {
    const actors: string[] = [];
    for (const m of messages) for (const a of [m.from, m.to]) if (!actors.includes(a)) actors.push(a);
    const index = (a: string) => actors.indexOf(a);
    // each actor's head box, and its lifeline down the middle of it
    const w = actors.map((a) => a.length + 4);
    const mid = w.map((n) => Math.floor((n - 1) / 2));
    const lines = messages.map((m) => wrap(m.text ?? "", LABEL));
    // the space between two lifelines: the boxes two spaces apart, and every message's words between them, plus 4
    const gaps = actors.slice(1).map((_, i) => w[i] - 1 - mid[i] + 3 + mid[i + 1]);
    const widest = (k: number) => Math.max(0, ...lines[k].map((l) => l.length));
    let right = 0;
    const spans = messages.map((m, k) => ({ a: Math.min(index(m.from), index(m.to)), b: Math.max(index(m.from), index(m.to)), k }));
    for (const { a, b, k } of [...spans].sort((p, q) => p.b - p.a - (q.b - q.a))) {
      if (a === b) {
        // a call to itself loops out to the right of its lifeline, its words beside the loop
        const need = 5 + widest(k) + 2;
        if (a < gaps.length) gaps[a] = Math.max(gaps[a], need);
        else right = Math.max(right, 5 + widest(k));
        continue;
      }
      const need = widest(k) + 4;
      const have = gaps.slice(a, b).reduce((n, g) => n + g, 0);
      if (have < need) gaps[b - 1] += need - have;
    }
    const lx = [mid[0]];
    gaps.forEach((g, i) => lx.push(lx[i] + g));
    const last = actors.length - 1;
    const cols = Math.max(lx[last] + (w[last] - mid[last]), lx[last] + 1 + right);

    // each message's rows: its words over its arrow, or a loop beside its words
    let y = 3;
    const laid = messages.map((m, k) => {
      const a = lx[index(m.from)], b = lx[index(m.to)];
      const across = m.reply ? "┄" : "─";
      const tone = m.reply ? SOFT : INK;
      const steps: Step[] = [];
      const words: [number, number, string][] = [];
      let rows: number;
      if (a === b) {
        rows = Math.max(2, lines[k].length);
        steps.push([a, y, "├"], [a + 1, y, across], [a + 2, y, across], [a + 3, y, "╮"], [a + 3, y + 1, "╯"], [a + 2, y + 1, across], [a + 1, y + 1, "<"]);
        lines[k].forEach((l, i) => words.push([a + 5, y + i, l]));
      } else {
        rows = lines[k].length + 1;
        const arrow = y + lines[k].length;
        if (a < b) {
          lines[k].forEach((l, i) => words.push([a + 2, y + i, l]));
          steps.push([a, arrow, "├"]);
          for (let x = a + 1; x < b - 1; x++) steps.push([x, arrow, across]);
          steps.push([b - 1, arrow, ">"]);
        } else {
          lines[k].forEach((l, i) => words.push([a - 1 - l.length, y + i, l]));
          steps.push([a, arrow, "┤"]);
          for (let x = a - 1; x > b + 1; x--) steps.push([x, arrow, across]);
          steps.push([b + 1, arrow, "<"]);
        }
      }
      y += rows;
      return { steps, words, tone, typed: words.reduce((n, [, , l]) => n + l.length, 0) };
    });
    const rows = y;
    const n = messages.length;
    const each = Math.min(EACH, (MOST - HEADS) / n);
    const intro = Math.round((HEADS + n * each) * 1000) / 1000;
    const cycle = Math.round((REST + n * REPLAY) * 1000) / 1000;
    const said = messages.map((m) => `${m.from} ${m.reply ? "answers" : "to"} ${m.to}${m.text ? `, ${m.text}` : ""}`);
    return {
      cols,
      rows,
      intro,
      cycle,
      status: `${n} ${n === 1 ? "message" : "messages"}`,
      says: `sequence, ${n} ${n === 1 ? "message" : "messages"}: ${said.join("; ")}.`,
      draw(s, t, at) {
        if (t <= 0) return;
        const X = at.x, Y = at.y;
        // heads, then the lifelines drawing down under them
        actors.forEach((name, i) => {
          const x = lx[i] - mid[i];
          s.write(X + x, Y, `╭${"─".repeat(w[i] - 2)}╮`, QUIET);
          s.write(X + x, Y + 1, "│ ", QUIET);
          s.write(X + x + 2, Y + 1, name, INK);
          s.write(X + x + w[i] - 2, Y + 1, " │", QUIET);
          s.write(X + x, Y + 2, `╰${"─".repeat(w[i] - 2)}╯`, QUIET);
          s.set(X + lx[i], Y + 2, "┬", QUIET);
        });
        const down = Math.ceil(progress(t, 0, HEADS) * (rows - 3));
        for (const x of lx) for (let r = 3; r < 3 + down; r++) s.set(X + x, Y + r, "│", QUIET);
        // each message: its dot running from sender to receiver, the arrow drawn behind it, its words typing
        const replay = t >= intro && !at.still ? ((t - intro) % cycle) - REST : -1;
        laid.forEach((m, k) => {
          const from = HEADS + k * each;
          const p = at.still ? 1 : progress(t, from, from + each * 0.85);
          if (p <= 0) return;
          const shown = Math.ceil(p * m.steps.length);
          for (let i = 0; i < shown; i++) {
            const [x, yy, ch] = m.steps[i];
            s.set(X + x, Y + yy, ch, m.tone);
          }
          if (p < 1) s.set(X + m.steps[Math.min(shown, m.steps.length - 1)][0], Y + m.steps[Math.min(shown, m.steps.length - 1)][1], "●", ACCENT);
          let typed = Math.floor(p * m.typed + 1e-9);
          for (const [x, yy, l] of m.words) {
            s.write(X + x, Y + yy, l.slice(0, Math.max(0, typed)), m.tone);
            typed -= l.length;
          }
          // once built, a dot runs the messages again in turn, a rest between the rounds
          if (replay >= k * REPLAY && replay < (k + 1) * REPLAY) {
            const q = (replay - k * REPLAY) / (REPLAY * 0.8);
            if (q < 1) {
              const [x, yy] = m.steps[Math.min(m.steps.length - 1, Math.floor(q * m.steps.length))];
              s.set(X + x, Y + yy, "●", ACCENT);
            }
          }
        });
      },
    };
  });
}
