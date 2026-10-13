/*
 * ticket: a pass for a release or an event. Its two ends in banner()'s slim
 * letters with a > flying between them, or one end for an admission; a line
 * under them; a perforation across it; and a stub with the details in one
 * strip and a barcode seeded by the kit's fnv1a32(), so the same pass always
 * prints the same bars. It prints out a row at a time, the > flies across,
 * the line types and the bars draw in; then it holds.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii ticket
 *   v0.4 v0.5 "markdown components"
 *   gate=npm seat=1A time=18:00
 *   ```
 *
 *   ticket('v1.0 "launch party"\nwhere=online time=18:00')
 *   ticket({ ends: ["v0.4", "v0.5"], line: "markdown components", fields: { gate: "npm" } })
 */
import { fail, fnv1a32 } from "../kit/core.ts";
import { banner, drawable as inFont } from "../banner.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, progress, show, shown, statements, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** A ticket as data: its ends, the line under them, and the stub's fields. */
export interface TicketData {
  /** One end, an admission, or two, where from and where to: ["v0.4", "v0.5"]. Drawn in slim banner letters. */
  ends: readonly string[];
  /** A line under the ends: "markdown components". None by default. */
  line?: string;
  /** The stub's details, in order: { gate: "npm", seat: "1A" }, or pairs, [["gate", "npm"]]. None by default. */
  fields?: Readonly<Record<string, string>> | readonly (readonly [string, string])[];
}

export interface TicketOptions extends Common {}

// The columns between two ends, the > midway; the barcode's bars and the gap before them.
const GAP = 9, BARS = 11, BAR_GAP = 3;
// A bar by two bits of the pass's hash.
const BAR_GLYPHS = "▌▐█▍";
// The build: rows print from the top, the > flies across the gap, the line types, the bars draw left to right.
const INTRO = 1.4, PRINT = 0.7, FLY: readonly [number, number] = [0.7, 1.1], TYPE: readonly [number, number] = [0.55, 1.1], CODE: readonly [number, number] = [1.0, 1.35];
// The letters' rows: slim's five.
const TALL = 5;

type Field = readonly [string, string];

// The fence's body: line 1 the ends and a quoted line; key=value fields, on it or the lines after, in order.
function parse(source: string): TicketData {
  const lines = statements(source, "ticket");
  if (!lines.length) fail(`ticket takes its ends on its first line, one or two words, such as v0.4 v0.5 "markdown components"`);
  const first = lines[0];
  const fields: Field[] = [];
  for (const s of lines)
    for (const tok of s.tokens) {
      if ("key" in tok) fields.push([tok.key, tok.value]);
      else if (s !== first) fail(`ticket's line ${s.line} has ${"word" in tok ? show(tok.word) : show(tok.text)} outside key=value: its ends and its line go on line 1, its fields as key=value`);
    }
  if (first.texts.length > 1) fail(`ticket takes one quoted line under its ends, and line ${first.line} has another: ${show(first.texts[1])}`);
  if (!first.words.length) fail(`ticket's line 1 takes its ends, one or two words, such as v0.4 v0.5, before ${show(first.raw)}`);
  if (first.words.length > 2) fail(`ticket takes one end or two on line 1, and it has ${first.words.length}: ${show(first.words.join(" "))}: for words with spaces, a quoted line under them`);
  return { ends: first.words, ...(first.texts.length ? { line: first.texts[0] } : {}), ...(fields.length ? { fields } : {}) };
}

// Data, checked: one end or two that slim letters draw, a line, and fields of words.
function check(data: TicketData): { ends: string[]; line?: string; fields: Field[] } {
  if (!data || typeof data !== "object") fail(`ticket() takes a fence's body, such as v0.4 v0.5 "markdown components", or { ends, line, fields }, not ${show(data)}`);
  if (!Array.isArray(data.ends) || data.ends.length < 1 || data.ends.length > 2) fail(`ticket's ends take one end or two, such as ["v0.4", "v0.5"], not ${show(data.ends)}`);
  const ends = data.ends.map((e, i) => {
    if (typeof e !== "string" || !e.trim()) fail(`ticket's end ${i + 1} takes words, such as "v0.5", not ${show(e)}`);
    const end = clean(e, "ticket's ends").replace(/\s+/g, " ").trim();
    for (const ch of new Set(end))
      if (ch !== " " && !inFont(ch, "slim")) fail(`ticket's slim letters have no ${show(ch)}, in ${show(end)}: they draw A to Z, 0 to 9, a space and . , ! ? ' : - + = / _`);
    return end;
  });
  if (data.line !== undefined && typeof data.line !== "string") fail(`ticket's line takes words, not ${show(data.line)}`);
  const line = data.line === undefined ? undefined : clean(data.line, "ticket's line").replace(/\s+/g, " ").trim();
  const given = data.fields === undefined ? [] : Array.isArray(data.fields) ? data.fields : typeof data.fields === "object" && data.fields ? Object.entries(data.fields) : null;
  if (!given) fail(`ticket's fields take { key: value } or [key, value] pairs, such as { gate: "npm" }, not ${show(data.fields)}`);
  const fields = (given as readonly unknown[]).map((f): Field => {
    if (!Array.isArray(f) || f.length !== 2 || typeof f[0] !== "string" || typeof f[1] !== "string" || !f[0].trim())
      fail(`ticket's fields take a key and a value of words each, such as ["gate", "npm"], not ${show(f)}`);
    return [clean(f[0], "ticket's fields").replace(/\s+/g, " ").trim(), clean(f[1], "ticket's fields").replace(/\s+/g, " ").trim()];
  });
  return { ends, ...(line ? { line } : {}), fields };
}

// An end's letters, as rows of text.
function lettersOf(end: string): string[] {
  const p = banner(end, { font: "slim", shadow: "none", pixel: 1, gap: 1, fill: "█", effect: "still" });
  return p.default()(0, { paper: true }).split("\n");
}

/**
 * A pass from a fence's body, its ends and a quoted line on line 1 and key=value fields after them, or { ends, line,
 * fields }: the ends in slim banner letters, a > between two of them, the line under them, a perforation, and a stub
 * with the fields in a strip and a barcode of 11 bars from the pass's hash. Its title is "boarding pass" for two
 * ends and "admit one" for one. It prints out, the > flies across, and it holds.
 *
 *   ticket("v1.0 \"launch party\"\nwhere=online")
 */
export function ticket(source: string | TicketData, options?: TicketOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("ticket", options, [], (o, room) => {
    const [a, b] = data.ends.map(lettersOf);
    const aw = a[0].length, bw = b ? b[0].length : 0;
    const endsW = b ? aw + GAP + bw : aw;
    // the stub's items, `key value`, two spaces between
    const items = data.fields.map(([k, v]) => (v ? `${k} ${v}` : k));
    const strip = items.join("  ");
    const stub = BAR_GAP + BARS;
    const extra = o.width === undefined ? 0 : o.width - room.cols!;
    const least = Math.max(endsW, stub + (items.length ? Math.min(strip.length, 8) : 0));
    if (room.cols !== undefined && least > room.cols) fail(`ticket needs ${least + extra} columns for ${show(data.ends.join(" "))} and its stub, and its width is ${o.width}: give it a width of ${least + extra} or more`);
    if (least > room.max) fail(`ticket needs ${least} columns for ${show(data.ends.join(" "))} in slim letters, past the ${room.max} it can take: shorter ends`);
    // its title, its own or the reader's, widens it, so the barcode stays at the right edge
    const title = b ? "boarding pass" : "admit one";
    const asked = o.frame === "none" || o.title === false ? 0 : o.title === undefined ? title.length : String(o.title).replace(/\s+/g, " ").trim().length;
    const cols = room.cols ?? Math.min(room.max, Math.max(endsW, data.line?.length ?? 0, (items.length ? strip.length : 0) + stub, asked + 2));
    // the strip wrapped item by item to the room the barcode leaves; an item too long for a line cut with ...
    const roomy = cols - stub;
    const lines: string[] = [];
    for (const item of items) {
      const it = item.length > roomy ? `${item.slice(0, Math.max(0, roomy - 3))}...` : item;
      const l = lines.length ? lines[lines.length - 1] : undefined;
      if (l !== undefined && l.length + 2 + it.length <= roomy) lines[lines.length - 1] = `${l}  ${it}`;
      else lines.push(it);
    }
    const stubLines = Math.max(1, lines.length);
    const under = wrap(data.line ?? "", cols);
    const perforation = TALL + under.length;
    const rows = perforation + 1 + stubLines;
    // the barcode: bar i is bits 2i and 2i + 1 of the pass's hash
    const h = fnv1a32(`${data.ends.join(" ")}${data.line ? ` ${data.line}` : ""}`);
    const code = Array.from({ length: BARS }, (_, i) => BAR_GLYPHS[(h >>> (2 * i)) & 3]).join("");
    const typed = under.join("").length;
    const bx = aw + Math.floor(GAP / 2);
    return {
      cols,
      rows,
      intro: INTRO,
      title,
      joins: [perforation],
      says: `ticket: ${b ? `${data.ends[0]} to ${data.ends[1]}` : data.ends[0]}${data.line ? `, ${data.line}` : ""}${data.fields.length ? `, ${items.join(", ")}` : ""}.`,
      draw(s, t, at) {
        // rows print from the top
        const printed = t >= INTRO ? rows : Math.min(rows, Math.floor((t / PRINT) * rows + 1e-9) + 1);
        const out = (y: number) => y < printed;
        for (let y = 0; y < TALL; y++) {
          if (!out(y)) continue;
          for (let x = 0; x < aw; x++) if (a[y][x] === "█") s.set(at.x + x, at.y + y, "█", ACCENT);
          if (b) for (let x = 0; x < bw; x++) if (b[y][x] === "█") s.set(at.x + aw + GAP + x, at.y + y, "█", ACCENT);
        }
        // the > flies from the first end and comes to rest midway, easing in
        if (b && out(2) && t >= FLY[0]) {
          const p = progress(t, FLY[0], FLY[1]);
          s.set(at.x + aw + Math.round((1 - (1 - p) ** 3) * (bx - aw)), at.y + 2, ">", ACCENT);
        }
        let more = shown(t, TYPE[0], typed, typed / (TYPE[1] - TYPE[0]));
        under.forEach((l, i) => {
          if (out(TALL + i)) s.write(at.x, at.y + TALL + i, l.slice(0, Math.max(0, more)), INK);
          more -= l.length;
        });
        if (out(perforation)) s.write(at.x, at.y + perforation, "┄".repeat(cols), QUIET);
        for (let i = 0; i < stubLines; i++) {
          const y = perforation + 1 + i;
          if (!out(y)) continue;
          // the strip: keys soft, values ink
          let x = 0;
          for (const item of (lines[i] ?? "").split("  ")) {
            if (x) x += 2;
            const sp = item.indexOf(" ");
            s.write(at.x + x, at.y + y, sp < 0 ? item : item.slice(0, sp), SOFT);
            if (sp >= 0) s.write(at.x + x + sp, at.y + y, item.slice(sp), INK);
            x += item.length;
          }
          const bars = shown(t, CODE[0], BARS, BARS / (CODE[1] - CODE[0]));
          s.write(at.x + cols - BARS, at.y + y, code.slice(0, bars), INK);
        }
      },
    };
  });
}
