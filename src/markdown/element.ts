/*
 * <ascii-markdown>: ascii.rest's markdown components on a plain page, as one
 * tag. Its text is a fence's body and its attributes are the options, as a
 * fence's are. It draws the component's still at once, then builds it in when
 * it is first scrolled to, as paint() plays it. Importing this module defines
 * the tag; on a server, where there is no DOM, it does nothing.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import "ascii.rest/markdown/element";
 *
 *   <ascii-markdown kind="headline" font="slim">
 *     ascii.rest "animated ascii art for web pages"
 *   </ascii-markdown>
 *
 * Attributes:
 *   kind     the component: headline and the rest
 *   label    what it shows, for screen readers; its own sentence otherwise
 *   motion   plays even when the reader prefers reduced motion: only behind a control
 *            the reader chooses
 *   options  JSON for options the attributes can't name: '{"align":"center"}'
 *   any other, an option, read as a fence reads it: title, width, frame, color, play,
 *            speed and the component's own. A bare one is true, "true" and "false" are
 *            booleans and a number is a number (but a title is always words).
 *
 * The page's own attributes, class, id, style, data-* and aria-* and the rest,
 * stay the page's. Its text is read once, its shared indent left out, and kept
 * in data-source: set that to draw a new body. A < in it is written &lt;, as
 * anywhere in HTML. A body it can't draw stays as it is, and the console says
 * why.
 */
import { COMMON, linesOf, type Common, type FenceOptions, type MarkdownPiece } from "./core.ts";
import { figure, paint } from "./html.ts";
import { make } from "./index.ts";

// The tag's display, with no specificity, so any rule of the page's own wins.
const STYLE = ":where(ascii-markdown){display:block}";

// Attributes a page puts on any tag: never options.
const PAGE = new Set(["class", "id", "style", "slot", "part", "hidden", "lang", "dir", "role", "tabindex", "is", "inert", "translate", "draggable", "spellcheck", "contenteditable", "autofocus", "accesskey", "nonce", "popover", "exportparts"]);
// The tag's own attributes: never options either.
const OWN = new Set(["kind", "label", "motion", "options", "data-source"]);
const ours = (name: string) => !PAGE.has(name) && !OWN.has(name) && !/^(data-|aria-|xml|on)/.test(name);

/**
 * The components' own options, besides the options every one takes: a change to any of these, or to the tag's own
 * attributes, draws it again. element.test.ts checks every component's options are here.
 */
const OPTIONS = ["font", "shadow", "align", "hold", "cursor", "sep", "count", "turn", "rows", "creature", "balloon", "trunk", "unit", "pulse", "level", "caption", "invert", "tone", "flip", "fps", "here"];

// An attribute's value as a fence reads one: bare is true, "true" and "false" booleans, a number a number.
const valueOf = (name: string, v: string): string | number | boolean =>
  v === "" ? true : v === "true" || v === "false" ? v === "true" : name !== "title" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;

// On a server there is no HTMLElement to extend; the class is never used there.
const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

// One start for any number of changes in a row, such as every attribute's as the tag upgrades, a microtask later.
const queued = new WeakSet<HTMLElement>();
const soon = (el: HTMLElement, start: () => void) => {
  if (queued.has(el)) return;
  queued.add(el);
  queueMicrotask(() => {
    queued.delete(el);
    if (el.isConnected) start();
  });
};

export class AsciiMarkdown extends Base {
  static observedAttributes = [...OWN, ...COMMON, ...OPTIONS];
  #stop: (() => void) | null = null;
  // The source it wrote into data-source itself, which is no change to draw again for.
  #kept: string | null = null;

  connectedCallback() {
    soon(this, () => this.#start());
  }

  disconnectedCallback() {
    this.#stop?.();
    this.#stop = null;
  }

  attributeChangedCallback(name: string, _: string | null, value: string | null) {
    if (name === "data-source" && value === this.#kept) return;
    if (this.isConnected) soon(this, () => this.#start());
  }

  #start() {
    // Its markdown, kept: the text it holds now is the component's body.
    let source = this.getAttribute("data-source") ?? this.#kept;
    if (source === null) {
      const text = this.textContent ?? "";
      // A page still being read may not have reached the tag's text: again once it has.
      if (!text.trim() && typeof document !== "undefined" && document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => soon(this, () => this.#start()), { once: true });
        return;
      }
      source = linesOf(text).join("\n");
      this.#kept = source;
      this.setAttribute("data-source", source);
    }
    let piece: MarkdownPiece;
    try {
      const options: FenceOptions = { ...(JSON.parse(this.getAttribute("options") || "{}") as FenceOptions) };
      for (const name of this.getAttributeNames()) if (ours(name)) options[name] = valueOf(name, this.getAttribute(name) ?? "");
      piece = make(this.getAttribute("kind") ?? "", source, options as Common & FenceOptions);
    } catch (error) {
      console.warn(`<ascii-markdown kind="${this.getAttribute("kind") ?? ""}"> could not draw:`, error);
      return;
    }
    this.#stop?.();
    this.innerHTML = figure(piece);
    const pre = this.firstElementChild as HTMLElement;
    const label = this.getAttribute("label");
    if (label) pre.setAttribute("aria-label", label);
    const motion = this.getAttribute("motion");
    this.#stop = paint(pre, piece, { motion: motion !== null && motion !== "false" });
  }
}

/** Defines the tag, once: <ascii-markdown>, or `tag`. Importing this module calls it. */
export function define(tag = "ascii-markdown") {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  const style = document.createElement("style");
  style.textContent = tag === "ascii-markdown" ? STYLE : STYLE.replace("ascii-markdown", tag);
  document.head.append(style);
  customElements.define(tag, tag === "ascii-markdown" ? AsciiMarkdown : class extends AsciiMarkdown {});
}

define();

declare global {
  interface HTMLElementTagNameMap {
    "ascii-markdown": AsciiMarkdown;
  }
}
