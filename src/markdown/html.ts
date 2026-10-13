/*
 * ascii.rest/markdown, html: a markdown component as text on a page, in colour.
 * mount() draws a coloured piece on a canvas, or in a <pre> in one ink; a
 * figure from a fence wants to stay text, to select, to find on the page and
 * to read in the page's own face. So these draw a frame as runs of text, each
 * run of one tone in a <span class="md-<tone>">, and the page's CSS gives each
 * tone its colour: STYLE below for any page, or a site's own tokens. One
 * frame of HTML serves a light page and a dark one alike.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { figure, paint, headline } from "ascii.rest/markdown";
 *
 *   const html = figure(headline("ascii.rest"));  // on the server: the still, as a <pre>
 *   paint(document.querySelector("pre.ascii-md")!, headline("ascii.rest"));  // in a browser: it builds in
 */
import type { Piece } from "../types.ts";
import { fail } from "../kit/core.ts";
import { COLORS, MARK, TONES, show, type MarkdownPiece } from "./core.ts";

// Every character a frame holds is escaped, and the only markup is a span whose class is one of TONES: what paint()
// writes into an element can't carry markup from a source.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s: string) => esc(s).replace(/"/g, "&quot;");

/**
 * A frame's text as HTML: each run of one tone in a <span class="md-<tone>">, the ink's runs bare, every character
 * escaped. `color` is the palette index of each cell, row by row, as a piece writes env.color; `size` is how many
 * colours a theme has (10 for a markdown component), so a dark page's index finds the same tone.
 */
export function spans(text: string, color: ArrayLike<number> | null, size: number = TONES.length): string {
  if (!color) return esc(text);
  return toneRuns(text, color, size)
    .map(([words, tone]) => (tone ? `<span class="md-${TONES[tone] ?? "ink"}">${esc(words)}</span>` : esc(words)))
    .join("");
}

/**
 * A frame's text as runs of one tone each, [words, tone], a row's end its own run of "\n" in the ink: what spans()
 * writes as HTML, and what the remark plugin writes as a tree of nodes.
 */
export function toneRuns(text: string, color: ArrayLike<number> | null, size: number = TONES.length): [string, number][] {
  if (!color) return text ? [[text, 0]] : [];
  const out: [string, number][] = [];
  let run = "", tone = 0, i = 0;
  const flush = () => {
    if (run) out.push([run, tone]);
    run = "";
  };
  for (let k = 0; k < text.length; k++) {
    const ch = text[k];
    if (ch === "\n") {
      flush();
      out.push(["\n", 0]);
      continue;
    }
    // A space in the ink joins the run it is in, so runs aren't cut at every gap between words; not a marked run,
    // whose inverted block would then reach on to the end of the line.
    const c = (color[i++] ?? 0) % size;
    const next = ch === " " && c === 0 && tone !== MARK ? tone : c;
    if (next !== tone) flush();
    tone = next;
    run += ch;
  }
  flush();
  return out;
}

/** A piece's frame at t (its still, the finished figure, by default) as runs of one tone each: [words, tone]. */
export function tones(p: Piece, o: { t?: number } = {}): [string, number][] {
  if (!p || typeof p !== "object" || !p.meta || typeof p.default !== "function") fail(`html() takes a piece, such as headline("ascii.rest"), not ${show(p)}`);
  const { meta } = p;
  const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : null;
  const text = p.default({ ...meta.options })(o.t ?? meta.still ?? 0, { paper: false, ...(color ? { color } : {}) });
  return toneRuns(text, color, meta.palette ? meta.palette.length / 2 : TONES.length);
}

/** A piece's frame at t (its still, the finished figure, by default) as HTML runs of tones, for inside a <pre>. */
export function html(p: Piece, o: { t?: number } = {}): string {
  return tones(p, o)
    .map(([words, tone]) => (tone ? `<span class="md-${TONES[tone] ?? "ink"}">${esc(words)}</span>` : esc(words)))
    .join("");
}

/**
 * A component as a whole <pre>, ready for a page: class "ascii-md", data-md its kind, its size as --cols and --rows
 * for CSS to fit it, its sentence as the label a screen reader reads (the box drawing itself is not read out), and its
 * still inside, so the page is whole before any script runs. `attrs` adds attributes of your own, such as
 * data-md-source for start() to play it by.
 */
export function figure(p: MarkdownPiece | Piece, o: { t?: number; class?: string; attrs?: Record<string, string> } = {}): string {
  const says = (p as MarkdownPiece).says ?? p.meta.note;
  const kind = (p as MarkdownPiece).kind;
  const extra = Object.entries({ ...(typeof kind === "string" ? { "data-md": kind } : {}), ...o.attrs })
    .map(([k, v]) => ` ${k}="${attr(v)}"`)
    .join("");
  return `<pre class="ascii-md${o.class ? ` ${attr(o.class)}` : ""}" role="img" aria-label="${attr(says)}" style="--cols: ${p.meta.cols}; --rows: ${p.meta.rows}"${extra}>${html(p, o)}</pre>`;
}

/**
 * The tones' colours for any page, as CSS: each md-<tone> class in its colour for a light page and a dark one by the
 * page's color-scheme (light-dark()), and md-mark inverted, the page's text colour behind it. A page sets its own
 * with --md-<tone> custom properties, such as --md-accent: #0969da. A QR code's rows sit flush, line-height 1, so no
 * seam between its half blocks stops a phone reading it. paint() adds it to the page once.
 */
export const STYLE =
  ".ascii-md{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,\"Liberation Mono\",\"ascii.rest mono\",monospace;line-height:1.2;letter-spacing:0;white-space:pre;font-variant-ligatures:none;tab-size:2}" +
  ".ascii-md[data-md=qr]{line-height:1}" +
  TONES.filter((t) => t !== "ink" && t !== "mark")
    .map((t) => `.ascii-md .md-${t}{color:var(--md-${t},light-dark(${COLORS[t].light},${COLORS[t].dark}))}`)
    .join("") +
  ".ascii-md .md-mark{color:var(--md-mark-ink,Canvas);background:var(--md-mark,CanvasText);box-shadow:0.25ch 0 0 var(--md-mark,CanvasText),-0.25ch 0 0 var(--md-mark,CanvasText)}" +
  '@font-face{font-family:"ascii.rest mono";src:url(https://ascii.rest/fonts/ascii-rest-mono.woff2) format("woff2");unicode-range:U+00B0,U+00B7,U+2022,U+2500-259F,U+25CF;font-display:swap}';

let styled = false;
/** Adds STYLE to the page, once: paint() calls it. Pass false to paint()'s `style` to style the tones yourself. */
export function addStyle(): void {
  if (styled || typeof document === "undefined") return;
  styled = true;
  const el = document.createElement("style");
  el.dataset.asciiMd = "";
  el.textContent = STYLE;
  document.head.prepend(el);
}

/** What paint() takes. */
export interface PaintOptions {
  /** Plays even when the reader prefers reduced motion: only behind a control the reader chooses. false. */
  motion?: boolean;
  /** Frames a second, instead of the piece's own. */
  fps?: number;
  /** Adds STYLE to the page: true. false when the page styles the md-<tone> classes itself. */
  style?: boolean;
}

/**
 * Plays a piece in an element as text in colour: the frame's runs as spans, redrawn only when they change. Its time
 * runs only while the element is on screen and the tab is open, so a component builds in when it is first scrolled
 * to, and one with a cycle keeps moving only while it is in view. Until it is first seen it shows its still, the
 * finished drawing, so finding in the page, printing and a full-page capture read every one. A reader who prefers
 * reduced motion gets the still and keeps it, unless `motion`; a piece that shows the time still shows it, redrawn
 * once a second. One that is built and has nothing left to move stops drawing. Returns a function that stops it.
 *
 *   const stop = paint(document.querySelector("pre")!, headline(source));
 */
export function paint(el: HTMLElement, p: Piece, { motion = false, fps, style = true }: PaintOptions = {}): () => void {
  if (!p || typeof p !== "object" || !p.meta || typeof p.default !== "function") fail(`paint() takes an element and a piece, such as headline("ascii.rest"), not ${show(p)}`);
  if (style) addStyle();
  const { meta } = p;
  const frame = p.default({ ...meta.options });
  const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : null;
  const size = meta.palette ? meta.palette.length / 2 : TONES.length;
  const still = meta.still ?? 0;
  const lasting = !!((p as MarkdownPiece).idle || meta.clock || meta.loop);
  let last = "";
  const draw = (t: number) => {
    const out = spans(frame(t, { paper: false, ...(color ? { color } : {}) }), color, size);
    if (out !== last) el.innerHTML = last = out;
  };
  const reduced = !motion && typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  draw(still);
  if (!meta.fps || (reduced && !meta.clock)) return () => {};
  let t = 0, raf = 0, at = 0, seen = false, done = false, first = true;
  const every = 1000 / (reduced ? 1 : (fps ?? meta.fps));
  // A frame moves it on by the time since the last, so its pace is the same at any frame rate; a stall past two
  // frames' worth (100 ms at the least) counts as that, so it doesn't jump to its end.
  const most = Math.max(100, 2 * every);
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = now - at;
    if (dt < every - 2) return;
    at = now;
    // A clock under reduced motion: its time, with nothing rolling.
    t = reduced ? still : t + Math.min(dt, most) / 1000;
    if (!lasting && t >= still) {
      draw(still);
      done = true;
      run();
      return;
    }
    draw(t);
  };
  const run = () => {
    const go = seen && !done && typeof document !== "undefined" && !document.hidden;
    if (go && !raf) {
      at = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!go && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver((entries) => {
    seen = entries[entries.length - 1].isIntersecting;
    // the first time it is seen, its build starts from its first frame
    if (seen && first) {
      first = false;
      if (!reduced) draw(0);
    }
    run();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", run);
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener("visibilitychange", run);
  };
}
