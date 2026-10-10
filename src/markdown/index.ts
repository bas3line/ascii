/*
 * ascii.rest/markdown: figures you write in an ```ascii fence in markdown,
 * drawn in text. A line of words becomes a headline in banner letters with a
 * glint passing over it. Each figure is an ascii.rest piece, so it builds in
 * as it is seen, many keep moving while they are in view, and it plays
 * wherever a piece plays (a page, React, MDX, an SVG in a README, a
 * terminal); it prints as plain text for a fenced block. They are their own
 * family, beside the library's pieces, not among them.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { headline, plain, fromFence } from "ascii.rest/markdown";
 *
 *   const top = headline('ascii.rest "animated ascii art for web pages"');
 *   plain(top);                                                  // the figure as text, for a README's fence
 *   fromFence("ascii headline font=slim", "ascii.rest");          // what a ```ascii fence draws
 */
import { fail, suggest } from "../kit/core.ts";
import { show } from "../kit/recipes/checks.ts";
import { KINDS, fence, plain, type Common, type FenceOptions, type Kind, type MarkdownPiece } from "./core.ts";
import { figure, paint, type PaintOptions } from "./html.ts";
import { headline } from "./headline.ts";

export * from "./core.ts";
export { GROUP_TITLES, catalog, entryOf, fenceOf, type Entry, type Place } from "./catalog.ts";
export { STYLE, addStyle, figure, html, paint, spans, type PaintOptions } from "./html.ts";

// lettering
export { headline, type HeadlineData, type HeadlineOptions } from "./headline.ts";

/** What every figure is: a fence's body, or its data, and options, to a piece. */
export type Maker = (source: string, options?: Common & FenceOptions) => MarkdownPiece;

/**
 * Every figure by name, as a fence names it: make(), fromFence() and the remark plugin find them here. A figure is
 * added as it is built; the catalog describes every one in GROUPS.
 */
export const kinds: Readonly<Partial<Record<Kind, Maker>>> = {
  headline: headline as Maker,
};

/**
 * A figure by its name, from a fence's body and options as a fence gives them: make("headline", "ascii.rest", {
 * font: "slim" }). Throws, naming the figures there are, for a name that is not one.
 */
export function make(kind: string, source: string, options: Common & FenceOptions = {}): MarkdownPiece {
  if (typeof kind !== "string" || !Object.hasOwn(kinds, kind)) {
    const built = Object.keys(kinds);
    fail(`there is no markdown figure ${show(kind)}${suggest(kind, [...KINDS])}: there are ${built.join(", ")}`);
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
  if (!kind) fail(`an ascii fence names its figure after ascii, as \`\`\`ascii headline: there are ${Object.keys(kinds).join(", ")}`);
  return make(kind, body, options);
}

/**
 * A figure as a page's HTML: its still in a <pre class="ascii-md">, with what start() needs to play it in a browser
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
 * A markdown document with every ```ascii fence drawn: each becomes a plain ``` fence holding the figure as text,
 * its still, which any markdown shows as it is, a README on GitHub, an issue or a chat. Everything else is left as
 * it was, a fence shown inside another fence too. With `ascii`, box drawing becomes + - |.
 *
 *   render(readFileSync("README.src.md", "utf8"))
 */
export function render(doc: string, o: { ascii?: boolean } = {}): string {
  if (typeof doc !== "string") fail(`render() takes a markdown document as a string, not ${show(doc)}`);
  let out = "", from = 0;
  for (const f of fencesOf(doc)) {
    const text = plain(fromFence(f.info, f.body), o);
    out += `${doc.slice(from, f.from)}${f.indent}${f.ticks}\n${text.split("\n").map((l) => f.indent + l).join("\n")}\n${f.indent}${f.ticks}`;
    from = f.to;
  }
  return out + doc.slice(from);
}

const started = new WeakSet<Element>();

/**
 * Plays every figure on a page that markup() or the remark plugin wrote, each <pre data-md>, as it is scrolled to,
 * with paint(). Each starts once, however often this is called, until the function this returns stops it: a later
 * call starts it again, as React's StrictMode mounts, unmounts and mounts an effect. Returns a function that stops
 * them all.
 *
 *   import { start } from "ascii.rest/markdown";
 *   start();
 */
export function start(root: ParentNode = document, o: PaintOptions = {}): () => void {
  const stops: (() => void)[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-md]")) {
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
      console.warn(`ascii.rest: could not play the ${el.dataset.md} figure:`, error);
    }
  }
  return () => stops.forEach((stop) => stop());
}
