/*
 * <ascii-art>: any piece in the library, as one tag. Importing this module
 * defines the tag; on a server, where there is no DOM, it does nothing.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   <script type="module" src="https://ascii.rest/ascii.js"></script>
 *   <ascii-art piece="donut"></ascii-art>
 *
 *   import "ascii.rest/element";   // in a bundled app
 *
 * Attributes:
 *   piece    a piece's file name: "donut", "night-coast"
 *   src      or the URL of any module that follows the piece contract
 *   fps      overrides the piece's frame rate
 *   options  JSON overriding the piece's option defaults: '{"text":"hello"}'
 *   label    what the picture shows, for screen readers; the piece's name otherwise
 *
 * Text pieces draw into a <pre> in the element's colour and font size; the
 * coloured scenes draw onto a <canvas> as wide as the element. Whatever the
 * element holds before it loads (a first frame rendered on the server, say)
 * stays until the piece is ready.
 */
import { isPiece, load } from "./library.ts";
import { mount, type MountOptions } from "./mount.ts";
import type { Piece } from "./types.ts";

// :where gives these no specificity, so any rule of the page's own wins.
const STYLE =
  ':where(ascii-art){display:block}:where(ascii-art>pre){margin:0;font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;line-height:1.2;letter-spacing:0;white-space:pre;font-variant-ligatures:none}';

// On a server there is no HTMLElement to extend; the class is never used there.
const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

export class AsciiArt extends Base {
  static observedAttributes = ["piece", "src", "fps", "options", "label"];
  #stop: (() => void) | null = null;
  #run = 0;

  connectedCallback() {
    this.#start();
  }

  disconnectedCallback() {
    this.#run++;
    this.#stop?.();
    this.#stop = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#start();
  }

  async #start() {
    const run = ++this.#run;
    const name = this.getAttribute("piece") ?? "";
    const src = this.getAttribute("src");
    let piece: Piece;
    let options: MountOptions;
    try {
      if (src) piece = (await import(/* @vite-ignore */ /* webpackIgnore: true */ new URL(src, document.baseURI).href)) as Piece;
      else if (isPiece(name)) piece = await load[name]();
      else return;
      options = JSON.parse(this.getAttribute("options") || "{}") as MountOptions;
    } catch (error) {
      console.warn(`<ascii-art> could not load ${src || name}:`, error);
      return;
    }
    // Another attribute change, or removal, while this one loaded.
    if (run !== this.#run) return;
    const fps = this.getAttribute("fps");
    if (fps !== null && fps !== "" && !Number.isNaN(+fps)) options.fps = +fps;

    const el = document.createElement(piece.meta.palette ? "canvas" : "pre");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", this.getAttribute("label") || piece.meta.name);
    this.#stop?.();
    this.replaceChildren(el);
    this.#stop = mount(el, piece, options);
  }
}

/** Defines the tag, once. Importing this module calls it for "ascii-art". */
export function define(tag = "ascii-art") {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  const style = document.createElement("style");
  style.textContent = tag === "ascii-art" ? STYLE : STYLE.replaceAll("ascii-art", tag);
  document.head.append(style);
  customElements.define(tag, tag === "ascii-art" ? AsciiArt : class extends AsciiArt {});
}

define();

declare global {
  interface HTMLElementTagNameMap {
    "ascii-art": AsciiArt;
  }
}
