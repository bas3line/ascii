/*
 * ascii.rest/markdown: components you write in an ```ascii fence in markdown,
 * drawn in text. A line of words becomes a headline in banner letters with a
 * glint passing over it. Each component is an ascii.rest piece, so it builds in
 * as it is seen, many keep moving while they are in view, and it plays
 * wherever a piece plays (a page, React, MDX, an SVG in a README, a
 * terminal); it prints as plain text for a fenced block. They are their own
 * family, beside the library's pieces, not among them.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { headline, plain, fromFence } from "ascii.rest/markdown";
 *
 *   const top = headline('ascii.rest "animated ascii art for web pages"');
 *   plain(top);                                                  // the drawing as text, for a README's fence
 *   fromFence("ascii headline font=slim", "ascii.rest");          // what a ```ascii fence draws
 */
import { fail, suggest } from "../kit/core.ts";
import { KINDS, fence, plain, show, type Common, type FenceOptions, type Kind, type MarkdownPiece } from "./core.ts";
import { figure, paint, type PaintOptions } from "./html.ts";
import { headline } from "./headline.ts";
import { typing } from "./typing.ts";
import { flap } from "./flap.ts";
import { marquee } from "./marquee.ts";
import { divider } from "./divider.ts";
import { confetti } from "./confetti.ts";
import { solid } from "./solid.ts";
import { say } from "./say.ts";
import { orbit } from "./orbit.ts";
import { sequence } from "./sequence.ts";
import { git } from "./git.ts";
import { railroad } from "./railroad.ts";
import { logic } from "./logic.ts";
import { flame } from "./flame.ts";
import { bits } from "./bits.ts";
import { pinout } from "./pinout.ts";
import { schema } from "./schema.ts";
import { qr } from "./qr.ts";
import { sigil } from "./sigil.ts";
import { stamp } from "./stamp.ts";
import { ticket } from "./ticket.ts";
import { chess } from "./chess.ts";
import { bracket } from "./bracket.ts";
import { sprite } from "./sprite.ts";
import { world } from "./world.ts";

export * from "./core.ts";
export { GROUP_TITLES, catalog, entryOf, fenceOf, type Entry, type Place } from "./catalog.ts";
export { STYLE, addStyle, figure, html, paint, spans, type PaintOptions } from "./html.ts";

// lettering
export { headline, type HeadlineData, type HeadlineOptions } from "./headline.ts";
export { typing, type TypingData, type TypingOptions } from "./typing.ts";
export { FLAPS, flap, type FlapData, type FlapOptions } from "./flap.ts";
export { marquee, type MarqueeData, type MarqueeOptions } from "./marquee.ts";

// ornaments
export { divider, DIVIDER_STYLES, type DividerData, type DividerOptions, type DividerStyle } from "./divider.ts";
export { confetti, type ConfettiData, type ConfettiOptions } from "./confetti.ts";
export { solid, SOLID_SHAPES, SOLID_TEXTURES, type SolidData, type SolidOptions, type SolidShape } from "./solid.ts";
export { say, CREATURES, type Balloon, type Creature, type SayData, type SayOptions } from "./say.ts";
export { orbit, type OrbitData, type OrbitOptions } from "./orbit.ts";

// machines
export { sequence, type SequenceData, type SequenceMessage, type SequenceOptions } from "./sequence.ts";
export { git, type GitData, type GitStep, type GitOptions } from "./git.ts";
export { railroad, type RailroadData, type RailroadOptions } from "./railroad.ts";
export { logic, type LogicData, type LogicOptions } from "./logic.ts";

// inside a system
export { flame, type FlameData, type FlameOptions } from "./flame.ts";
export { bits, type BitsData, type BitsOptions } from "./bits.ts";
export { pinout, type PinoutData, type PinoutOptions } from "./pinout.ts";
export { schema, type SchemaData, type SchemaOptions } from "./schema.ts";

// tokens
export { qr, encodeQr, qrCapacity, qrEcc, qrFormatBits, qrVersionBits, QR_VERSIONS, type QrData, type QrOptions, type QrLevel, type QrCode } from "./qr.ts";
export { sigil, walkOf, SIGIL_FIELD, type SigilData, type SigilOptions } from "./sigil.ts";
export { stamp, type StampData, type StampOptions, type StampTone } from "./stamp.ts";
export { ticket, type TicketData, type TicketOptions } from "./ticket.ts";

// games
export { chess, type ChessData, type ChessOptions } from "./chess.ts";
export { bracket, type BracketData, type BracketOptions } from "./bracket.ts";
export { sprite, PIXELS, type SpriteData, type SpriteOptions } from "./sprite.ts";

// places
export { world, AIRPORTS, type WorldData, type WorldPlace, type WorldOptions } from "./world.ts";

/** What every figure is: a fence's body, or its data, and options, to a piece. */
export type Maker = (source: string, options?: Common & FenceOptions) => MarkdownPiece;

/** Every figure by name, as a fence names it: make(), fromFence() and the remark plugin find them here. */
export const kinds: Readonly<Record<Kind, Maker>> = {
  headline: headline as Maker,
  typing: typing as Maker,
  flap: flap as Maker,
  marquee: marquee as Maker,
  divider: divider as Maker,
  confetti: confetti as Maker,
  solid: solid as Maker,
  say: say as Maker,
  orbit: orbit as Maker,
  sequence: sequence as Maker,
  git: git as Maker,
  railroad: railroad as Maker,
  logic: logic as Maker,
  flame: flame as Maker,
  bits: bits as Maker,
  pinout: pinout as Maker,
  schema: schema as Maker,
  qr: qr as Maker,
  sigil: sigil as Maker,
  stamp: stamp as Maker,
  ticket: ticket as Maker,
  chess: chess as Maker,
  bracket: bracket as Maker,
  sprite: sprite as Maker,
  world: world as Maker,
};

/**
 * A figure by its name, from a fence's body and options as a fence gives them: make("headline", "ascii.rest", {
 * font: "slim" }). Throws, naming the figures there are, for a name that is not one.
 */
export function make(kind: string, source: string, options: Common & FenceOptions = {}): MarkdownPiece {
  if (typeof kind !== "string" || !Object.hasOwn(kinds, kind)) {
    const built = Object.keys(kinds);
    fail(`there is no markdown component ${show(kind)}${suggest(kind, [...KINDS])}: there are ${built.join(", ")}`);
  }
  if (typeof source !== "string") fail(`${kind}() takes its fence's body as a string, not ${show(source)}`);
  return kinds[kind as Kind]!(source, options);
}

/**
 * What a ```ascii fence draws: its info string, "ascii headline font=slim", and its body. Throws for a fence that is
 * not an ascii one, or names no figure.
 *
 *   fromFence("ascii headline font=slim", 'ascii.rest "animated ascii art"')
 */
export function fromFence(info: string, body: string): MarkdownPiece {
  const { lang, kind, options } = fence(info);
  if (lang !== "ascii") fail(`fromFence() takes a fence whose language is ascii, as \`\`\`ascii headline, not ${show(lang)}`);
  if (!kind) fail(`an ascii fence names its component after ascii, as \`\`\`ascii headline: there are ${Object.keys(kinds).join(", ")}`);
  return make(kind, body, options);
}

/**
 * A component as a page's HTML: its still in a <pre class="ascii-md">, with what start() needs to play it in a browser
 * (data-md, data-md-source and data-md-options), so it builds in when it is scrolled to. For a server, a build step or a
 * markdown plugin.
 *
 *   markup("headline", "ascii.rest", { font: "slim" })
 */
export function markup(kind: string, source: string, options: Common & FenceOptions = {}, o: { class?: string } = {}): string {
  const p = make(kind, source, options);
  const json = Object.keys(options).length ? JSON.stringify(options) : "";
  return figure(p, { ...(o.class ? { class: o.class } : {}), attrs: { "data-md": kind, "data-md-source": source, ...(json ? { "data-md-options": json } : {}) } });
}

/** An ```ascii fence in a markdown document, as fencesOf() finds it. */
export interface Fenced {
  /** Where it is: doc.slice(from, to) is the fence, from its opening line's indent to the end of its closing line. */
  from: number;
  to: number;
  /** The line it opens on, from 1, for errors. */
  line: number;
  /** The indent before its opening fence, taken off each line of its body. */
  indent: string;
  /** Its opening fence: ``` or ~~~, or a longer run. */
  ticks: string;
  /** Its info string: "ascii headline font=slim". */
  info: string;
  body: string;
}

// A line that opens a fence: its indent, three or more ` or ~, and its info string. A ` fence's info holds no `.
const OPEN = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
// A line that may close one: a run of ` or ~ and nothing after but spaces.
const CLOSE = /^([ \t]*)(`{3,}|~{3,})[ \t]*$/;

/**
 * Every ```ascii fence in a markdown document, read as CommonMark reads fences: one opens with three or more ` or ~,
 * and closes at a run of the same character at least as long, indented no more than three columns past it. A fence
 * inside another fence is that fence's text, so a README that shows an ```ascii fence in a ````md block keeps it as
 * written. An ascii fence never closed is left out. What render() and `npx ascii.rest md` draw.
 *
 *   fencesOf("```ascii headline\nascii.rest\n```")   // [{ info: "ascii headline", body: "ascii.rest", line: 1, ... }]
 */
export function fencesOf(doc: string): Fenced[] {
  if (typeof doc !== "string") fail(`fencesOf() takes a markdown document as a string, not ${show(doc)}`);
  const out: Fenced[] = [];
  const lines = doc.split("\n");
  let open: { indent: string; ticks: string; info: string; from: number; line: number } | null = null;
  for (let i = 0, at = 0; i < lines.length; at += lines[i].length + 1, i++) {
    const l = lines[i];
    if (!open) {
      const m = OPEN.exec(l);
      if (m && !(m[2][0] === "`" && m[3].includes("`"))) open = { indent: m[1], ticks: m[2], info: m[3].trim(), from: at, line: i + 1 };
      continue;
    }
    const m = CLOSE.exec(l);
    if (!m || m[2][0] !== open.ticks[0] || m[2].length < open.ticks.length || m[1].length > open.indent.length + 3) continue;
    if (/^ascii(?:[ \t]|$)/.test(open.info)) {
      const indent = new RegExp(`^${open.indent}`);
      const body = lines.slice(open.line, i).map((b) => b.replace(indent, "")).join("\n");
      out.push({ from: open.from, to: at + l.length, line: open.line, indent: open.indent, ticks: open.ticks, info: open.info, body });
    }
    open = null;
  }
  return out;
}

/**
 * A markdown document with every ```ascii fence drawn: each becomes a plain ``` fence holding the drawing as text,
 * its still, which any markdown shows as it is, a README on GitHub, an issue or a chat. Its fence is longer than any
 * run of its character a line of the text starts with, so the text can't close it. Everything else is left as it
 * was, a fence shown inside another fence too. With `ascii`, box drawing becomes + - |, and a qr fence, which no
 * reader could scan that way, throws.
 *
 *   render(readFileSync("README.src.md", "utf8"))
 */
export function render(doc: string, o: { ascii?: boolean } = {}): string {
  if (typeof doc !== "string") fail(`render() takes a markdown document as a string, not ${show(doc)}`);
  let out = "", from = 0;
  for (const f of fencesOf(doc)) {
    const p = fromFence(f.info, f.body);
    if (o.ascii && p.kind === "qr") fail(`qr needs its blocks to scan, and ascii has none: the fence on line ${f.line} draws a code no reader can read in + - |`);
    const text = plain(p, o);
    const ch = f.ticks[0];
    const run = Math.max(0, ...text.split("\n").map((l) => (ch === "`" ? /^\s*(`*)/ : /^\s*(~*)/).exec(l)![1].length));
    const ticks = ch.repeat(Math.max(f.ticks.length, run + 1));
    out += `${doc.slice(from, f.from)}${f.indent}${ticks}\n${text.split("\n").map((l) => f.indent + l).join("\n")}\n${f.indent}${ticks}`;
    from = f.to;
  }
  return out + doc.slice(from);
}

const started = new WeakSet<Element>();

/**
 * Plays every component on a page that markup() or the remark plugin wrote, each <pre data-md data-md-source>, as it
 * is scrolled to, with paint(). Each starts once, however often this is called, until the function this returns stops
 * it: a later call starts it again, as React's StrictMode mounts, unmounts and mounts an effect, or as a page's own
 * motion switch restarts them with `motion` changed. Returns a function that stops them all. React's and
 * <ascii-markdown>'s own <pre>s carry data-md but no source, and play themselves.
 *
 *   import { start } from "ascii.rest/markdown";
 *   start();
 */
export function start(root: ParentNode = document, o: PaintOptions = {}): () => void {
  const stops: (() => void)[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-md][data-md-source]")) {
    if (started.has(el)) continue;
    started.add(el);
    try {
      const options = JSON.parse(el.dataset.mdOptions || "{}") as FenceOptions;
      const stop = paint(el, make(el.dataset.md ?? "", el.dataset.mdSource ?? "", options), o);
      stops.push(() => {
        stop();
        started.delete(el);
      });
    } catch (error) {
      console.warn(`ascii.rest: could not play the ${el.dataset.md} component:`, error);
    }
  }
  return () => stops.forEach((stop) => stop());
}
