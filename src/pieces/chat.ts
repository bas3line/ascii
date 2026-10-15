/*
 * chat: a conversation in bubbles. Each message of yours is typed into the box
 * below and sent; the reply shows three dots while it is being written, then
 * streams in. The talk scrolls up as it grows, and starts over beneath itself.
 */
import type { Frame, Meta } from "../types.ts";

export interface ChatOptions {
  [key: string]: unknown;
  /** The messages in turn, yours first. */
  messages: string[];
}

const WIDE = 26; // the most text a bubble line holds
const KEY = 0.055; // seconds a typed character
const STREAM = 0.025; // seconds a streamed one
const VIEW = 14; // rows of talk above the box

const MESSAGES = [
  "can you help me name my cli?",
  "sure. what does it do?",
  "it turns images into ascii art",
  "how about glyph, inkdrop or asciify?",
  "glyph. that's the one",
  "nice pick. want a logo to go with it?",
];

// When each message is typed and sent, or thought about and streamed, and the
// length of the whole talk.
function timing(talk: string[]) {
  let T = 0.6;
  const plan = talk.map((text, i) => {
    if (i % 2 === 0) {
      const typed = T;
      T += text.length * KEY + 0.35;
      return { typed, shows: T, done: T };
    }
    const dots = T + 0.5;
    const shows = dots + 1.3;
    T = shows + text.length * STREAM;
    const done = T;
    T += 1;
    return { typed: dots, shows, done };
  });
  return { plan, total: T + 2 };
}

export const meta = {
  name: "chat",
  category: "ui",
  note: "a chat in bubbles: typed, sent, three dots, then the reply streaming",
  cols: 48,
  rows: 18,
  fps: 20,
  options: { messages: MESSAGES },
  // The talk above; other messages make another length, so pass svg() its seconds.
  loop: timing(MESSAGES).total,
} satisfies Meta<ChatOptions>;

function wrap(text: string) {
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > WIDE) {
      if (line) lines.push(line), (line = "");
      lines.push(word.slice(0, WIDE));
      word = word.slice(WIDE);
    }
    if (line && line.length + 1 + word.length > WIDE) lines.push(line), (line = "");
    line = line ? `${line} ${word}` : word;
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

// A bubble at its full width, showing the first `shown` characters of its lines:
// yours square at the right, the reply rounded at the left.
function bubble(lines: string[], mine: boolean, cols: number, shown = Infinity) {
  const w = Math.max(...lines.map((l) => l.length));
  const [tl, tr, bl, br] = mine ? "┌┐└┘" : "╭╮╰╯";
  const out = [tl + "─".repeat(w + 2) + tr];
  let left = shown;
  for (const line of lines) {
    if (left <= 0 && out.length > 1) break;
    out.push("│ " + line.slice(0, Math.max(0, left)).padEnd(w) + " │");
    left -= line.length + 1;
  }
  out.push(bl + "─".repeat(w + 2) + br);
  const pad = mine ? cols - 1 - (w + 4) : 1;
  return out.map((s) => (" ".repeat(pad) + s).padEnd(cols));
}

export default function chat({ messages = meta.options.messages }: Partial<ChatOptions> = {}): Frame {
  const { cols, rows } = meta;
  // One line a message: it is typed into a box one line high.
  const talk = (messages.length ? messages : MESSAGES).map((m) => m.replace(/\s+/g, " ").trim());
  const wrapped = talk.map(wrap);
  const full = wrapped.map((lines, i) => bubble(lines, i % 2 === 0, cols));
  const blank = " ".repeat(cols);

  const { plan, total } = timing(talk);
  // Before the first message, the whole talk of the last time round.
  const before = full.flatMap((b) => [blank, ...b]);

  return (t) => {
    const p = t % total;
    const lines = [...before];
    let input = "";
    let typing = -1;
    talk.forEach((text, i) => {
      const { typed, shows, done } = plan[i];
      if (p < typed) return;
      if (i % 2 === 0) {
        if (p < shows) {
          input = text.slice(0, Math.min(text.length, Math.floor((p - typed) / KEY) + 1));
          typing = typed;
        } else lines.push(blank, ...full[i]);
        return;
      }
      lines.push(blank);
      if (p >= done) lines.push(...full[i]);
      else if (p >= shows) lines.push(...bubble(wrapped[i], false, cols, Math.floor((p - shows) / STREAM) + 1));
      else lines.push(...bubble(["·".repeat(1 + (Math.floor((p - typed) / 0.3) % 3)).padEnd(3)], false, cols));
    });

    const out = lines.slice(-VIEW);
    while (out.length < VIEW) out.unshift(blank);
    out.push(blank);
    // The box: a solid caret while keys come, blinking when they stop.
    const caret = typing >= 0 || Math.floor(p / 0.5) % 2 === 0 ? "█" : " ";
    const inner = cols - 4;
    const field = (input ? `> ${input}` : "> ").slice(-(inner - 6)) + caret;
    out.push("╭" + "─".repeat(cols - 2) + "╮");
    out.push("│ " + field.padEnd(inner - 4) + "send │");
    out.push("╰" + "─".repeat(cols - 2) + "╯");
    return out.slice(0, rows).join("\n");
  };
}
