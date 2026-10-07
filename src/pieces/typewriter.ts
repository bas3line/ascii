/*
 * typewriter: types each phrase a key at a time at an uneven human pace, now
 * and then fixing a typo, holds it under a blinking cursor, deletes it, types the next.
 */
import type { Frame, Meta } from "../types.ts";

export interface TypewriterOptions {
  [key: string]: unknown;
  /** Typed before every phrase and never deleted. */
  prefix: string;
  phrases: string[];
}

export const meta = {
  name: "typewriter",
  category: "type",
  note: "phrases typed and deleted in turn behind a blinking cursor",
  cols: 44,
  rows: 3,
  fps: 20,
  options: { prefix: "i make ", phrases: ["small tools.", "quiet websites.", "things that last.", "notes for later."] },
} satisfies Meta<TypewriterOptions>;

const CURSOR = "▌";
const HOLD = 2.2; // seconds a finished phrase stays
const EMPTY = 0.5; // seconds the line waits empty before the next phrase
// Keys next to each other on a keyboard, for believable slips.
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slip(ch: string, rand: () => number): string | null {
  for (const row of ROWS) {
    const i = row.indexOf(ch);
    if (i >= 0) return row[i === 0 ? 1 : i === row.length - 1 ? i - 1 : i + (rand() < 0.5 ? -1 : 1)];
  }
  return null;
}

export default function typewriter({ prefix = meta.options.prefix, phrases = meta.options.phrases }: Partial<TypewriterOptions> = {}): Frame {
  const { cols, rows } = meta;
  const head = String(prefix);
  const list = (phrases.length ? phrases : [""]).map((p) => String(p).slice(0, Math.max(0, cols - 4 - head.length)));
  const rand = mulberry32(31);

  // The whole loop as a list of [time, text on the line], laid out once.
  const events: [number, string][] = [];
  let at = 0, text = "";
  const key = (next: string, wait: number) => {
    at += wait;
    text = next;
    events.push([at, text]);
  };
  const typeDelay = (ch: string) => 0.06 + rand() * 0.09 + (ch === " " ? 0.05 + rand() * 0.08 : 0) + (rand() < 0.05 ? 0.3 : 0);
  const done: number[] = [];
  for (const phrase of list) {
    // Some phrases get one slip: a wrong key, a key or two more, a pause, then backspaces.
    const typo = rand() < 0.5 && phrase.length > 5 ? 3 + Math.floor(rand() * (phrase.length - 4)) : -1;
    for (let i = 0; i < phrase.length; i++) {
      const wrong = i === typo ? slip(phrase[i], rand) : null;
      if (wrong) {
        const more = Math.min(Math.floor(rand() * 3), phrase.length - i - 1);
        key(text + wrong, typeDelay(phrase[i]));
        for (let k = 1; k <= more; k++) key(text + phrase[i + k], typeDelay(phrase[i + k]));
        at += 0.25 + rand() * 0.2;
        for (let k = 0; k <= more; k++) key(text.slice(0, -1), k ? 0.07 : 0.1);
      }
      key(text + phrase[i], typeDelay(phrase[i]) + (i && ".,!?".includes(phrase[i - 1]) ? 0.15 : 0));
    }
    done.push(at);
    // Held backspace: one press, a beat, then it repeats.
    at += HOLD;
    for (let k = 0; k < phrase.length; k++) key(text.slice(0, -1), k === 0 ? 0 : k === 1 ? 0.18 : 0.045);
    at += EMPTY;
  }
  const period = at;
  // Frame 0 shows the first phrase finished, cursor lit, shortly before it is deleted.
  const offset = done[0] + HOLD - 0.75;

  const width = head.length + Math.max(...list.map((p) => p.length)) + 1;
  const x = Math.max(0, Math.floor((cols - width) / 2));
  const blank = " ".repeat(cols);
  return (t) => {
    const now = (((t + offset) % period) + period) % period;
    let line = "", last = 0;
    for (const [when, s] of events) {
      if (when > now) break;
      line = s;
      last = when;
    }
    // Solid while keys land, blinking once the cursor has sat still.
    const idle = now - last;
    const lit = idle < 0.45 || (idle - 0.45) % 1.06 > 0.53;
    const body = head + line + (lit ? CURSOR : "");
    const out = (" ".repeat(x) + body).slice(0, cols).padEnd(cols);
    return Array.from({ length: rows }, (_, r) => (r === rows >> 1 ? out : blank)).join("\n");
  };
}
