/*
 * svg: any piece as an animated SVG, for places that run no script, like a
 * GitHub README, an email or an <img>. One loop of it, sampled 15 times a
 * second: each distinct frame is a group of text rows coloured run by run
 * from the piece's palette, and CSS shows each group in its turn. Rows are
 * stretched to the cell grid, so they line up in any monospace face, and for
 * reduced motion it holds one frame. Strings in, a string out: it runs in a
 * browser, on a server, in a Worker or at build time.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { svg, bannerSvg } from "ascii.rest/svg";
 *   import { rust } from "ascii.rest/pieces";
 *
 *   svg(rust, { dark: true });                       // the README SVG of a logo
 *   bannerSvg("my-project", { art: rust, color: "art", tagline: "fast, safe, fun" });
 */
import { banner, type BannerOptions, type BannerPiece, type Themed } from "./banner.ts";
import type { Options, Piece } from "./types.ts";

/** A frame: its text, and each cell's index into the palette. */
export interface Shot {
  text: string;
  color: Uint8Array;
}

/** Frames over time, as a part of an SVG. */
export interface Loop {
  cols: number;
  rows: number;
  /** Fills by palette index: colours, or a paint such as url(#g). */
  palette: readonly string[];
  /** The loop's length in seconds, and the time it starts at. */
  every: number;
  from: number;
  /** The frame at t seconds. */
  at: (t: number) => Shot;
  /** Played once, ending on its last frame, instead of over and over. */
  once?: boolean;
  /** Frames a second it is sampled at: 15. */
  fps?: number;
}

/** A picture in SVG units, its CSS and its elements, ready to sit in an SVG with others. */
export interface Part {
  width: number;
  height: number;
  css: string;
  body: string;
}

const CW = 10; // a cell's width, in SVG units; its height is `cell` widths, 2 by default, the canvas's 1:2
const FONT = `${(CW / 0.6).toFixed(2)}px ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
/** The rule every part's rows share. */
export const MONO = `text{font:${FONT};white-space:pre;dominant-baseline:central}`;
/** The faces the rows are set in, for text of another size. */
export const FACES = FONT.slice(FONT.indexOf(" ") + 1);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s: string) => esc(s).replace(/"/g, "&quot;");
// Text from outside, a tagline or a title, without what XML 1.0 can't hold: controls, U+FFFE and U+FFFF, lone surrogates.
const xml = (s: string) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "");

/**
 * Frames as a part, its classes and keyframes under `prefix`. A cell is `cell` widths tall: 2, or 1 for a square grid.
 * It throws for an `fps` that isn't 1 to 60.
 */
export function part({ cols, rows, palette, every, from: t0, at, once = false, fps = 15, cell = 2 }: Loop & { cell?: number }, prefix = ""): Part {
  if (!(fps >= 1 && fps <= 60)) throw new Error(`ascii.rest: fps takes 1 to 60, not ${fps}`);
  const CH = CW * cell;
  const n = Math.max(1, Math.round(every * fps));
  // Played once, the last shot is at the end, so it holds what the end shows, however few frames a second.
  const shots = Array.from({ length: n }, (_, i) => at(once && i === n - 1 ? t0 + every : t0 + i / fps));
  const same = (a: Shot, b: Shot) => a.text === b.text && a.color.every((v, i) => v === b.color[i]);

  // each distinct frame, with the slots it shows in
  const frames: { shot: Shot; slots: Set<number> }[] = [];
  shots.forEach((shot, i) => {
    const f = frames.find((f) => same(f.shot, shot));
    if (f) f.slots.add(i);
    else frames.push({ shot, slots: new Set([i]) });
  });

  const used = new Set<number>();
  const body = (shot: Shot) =>
    shot.text
      .split("\n")
      .map((line, y) => {
        const t = line.replace(/\s+$/, "");
        if (!t) return "";
        let out = "", run = "", cur = -1;
        const flush = () => {
          if (run) out += cur < 0 ? esc(run) : `<tspan class="${prefix}c${cur}">${esc(run)}</tspan>`;
          run = "";
        };
        for (let x = 0; x < t.length; x++) {
          const c = t[x] === " " ? cur : shot.color[y * cols + x];
          if (c !== cur) flush();
          if (c >= 0) used.add(c);
          cur = c;
          run += t[x];
        }
        flush();
        return `<text y="${(y + 0.5) * CH}" textLength="${t.length * CW}">${out}</text>`;
      })
      .join("");

  const width = cols * CW, height = rows * CH;
  const inks = () => [...used].sort((a, b) => a - b).map((c) => `.${prefix}c${c}{fill:${palette[c]}}`).join("");
  // One frame for the whole loop is a still: no animation at all.
  if (frames.length === 1) {
    const g = `<g>${body(frames[0].shot)}</g>`;
    return { width, height, css: inks(), body: g };
  }

  // Played once, the frame of the last slot stays: it is on at the end, and the fill holds it. Its 100% is written out
  // even when nothing changes there, since a keyframe left out ends on the group's own opacity, 0.
  const last = frames.findIndex((f) => f.slots.has(n - 1));
  const pct = (i: number) => `${+((i / n) * 100).toFixed(3)}%`;
  let keys = "", groups = "";
  frames.forEach((f, j) => {
    let kf = "", state = -1;
    for (let i = 0; i <= n; i++) {
      const v = i < n ? (f.slots.has(i) ? 1 : 0) : once && j === last ? 1 : 0;
      if (v !== state || (once && i === n)) (kf += `${pct(i)}{opacity:${v}}`), (state = v);
    }
    keys += `@keyframes ${prefix}k${j}{${kf}}.${prefix}k${j}{animation-name:${prefix}k${j}}`;
    groups += `<g class="${prefix}f ${prefix}k${j}">${body(f.shot)}</g>`;
  });
  // For reduced motion, the frame a loop starts on, or the one a single play ends on.
  const still = once ? last : 0;
  const css =
    inks() +
    `.${prefix}f{opacity:0;animation:${every}s step-end ${once ? "1 forwards" : "infinite"}}${keys}` +
    `@media (prefers-reduced-motion:reduce){.${prefix}f{animation:none}.${prefix}k${still}{opacity:1}}`;
  return { width, height, css, body: groups };
}

/** Parts as one SVG, `scale` pixels to a cell's width when nothing else sizes it: 10, the SVG units. */
export function wrap({ width: w, height: h, css, body }: Part, label: string, scale = CW): string {
  const px = (u: number) => +((u * scale) / CW).toFixed(2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${px(w)}" height="${px(h)}" role="img" aria-label="${attr(xml(label))}" xml:space="preserve">` +
    `<title>${esc(xml(label))}</title><style>${MONO}${css}</style>${body}</svg>`
  );
}

/**
 * An SVG that this module wrote, as a part again with its classes, keyframes and gradient under `prefix`, so it can sit
 * beside another: its size from its viewBox, its CSS without the rule all rows share, and its groups. Null for any other
 * SVG. The same goes for two of these SVGs inlined in one HTML page: their classes are bare, f, k0, c1 and so on, and a
 * page's styles reach every inline SVG on it, so give all but one a prefix.
 */
export function namespaced(svg: string, prefix: string): Part | null {
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const style = /<style>([\s\S]*?)<\/style>/.exec(svg);
  if (!box || !style || !style[1].startsWith(MONO)) return null;
  const css = style[1]
    .slice(MONO.length)
    .replace(/\.([ck]\d+|f)\{/g, `.${prefix}$1{`)
    .replace(/@keyframes k(\d+)/g, `@keyframes ${prefix}k$1`)
    .replace(/animation-name:k(\d+)/g, `animation-name:${prefix}k$1`)
    .replace(/url\(#g\)/g, `url(#${prefix}g)`);
  const body = svg
    .slice(style.index + style[0].length, svg.lastIndexOf("</svg>"))
    .replace(/class="f k(\d+)"/g, `class="${prefix}f ${prefix}k$1"`)
    .replace(/class="c(\d+)"/g, `class="${prefix}c$1"`)
    .replace(/<linearGradient id="g"/g, `<linearGradient id="${prefix}g"`);
  return { width: +box[1], height: +box[2], css, body };
}

/** The colour that inks the most cells of a part's first frame: a logo's own colour. */
export function inkOf({ css, body }: Part): string | null {
  const first = /<g[^>]*>([\s\S]*?)<\/g>/.exec(body)?.[1] ?? "";
  const count = new Map<string, number>();
  for (const m of first.matchAll(/<tspan class="([^"]+)">([^<]*)<\/tspan>/g)) count.set(m[1], (count.get(m[1]) ?? 0) + m[2].replace(/\s/g, "").length);
  const top = [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
  return top ? (new RegExp(`\\.${top}\\{fill:(#[0-9a-fA-F]{6})\\}`).exec(css)?.[1] ?? null) : null;
}

// The categories whose pieces loop with a fixed period, and the option that sets it.
const LOOPS: Record<string, string> = { logos: "shine", companies: "shine", distros: "scan" };

/**
 * The loop a piece's SVG plays: a banner's own motion, its `loop`, a logo's glint or a distro's scan, or 4 seconds; 0 for
 * a still. `once` when it plays once and stays, as a typed banner does.
 */
export function loopOf(piece: Piece, options: Options = {}): { every: number; from: number; once?: boolean } {
  const { meta } = piece;
  const motion = (piece as Partial<BannerPiece>).motion;
  if (motion) return { every: motion.seconds, from: motion.from, once: motion.once };
  if (!meta.fps) return { every: 0, from: 0 };
  if (meta.loop) return { every: meta.loop, from: 0 };
  const key = LOOPS[meta.category];
  const every = key ? ({ ...meta.options, ...options } as Record<string, unknown>)[key] : undefined;
  // A second of still, then the pass, then still again: the loop starts and ends between passes.
  if (typeof every === "number" && every > 0) return { every, from: 0.5 + every - 1 };
  return { every: 4, from: 0 };
}

export interface SvgOptions {
  /** For a dark page: a coloured piece's dark colours and, for a text piece, a light ink. */
  dark?: boolean;
  /** A text piece's colour: GitHub's own text colour for the page's theme by default. */
  ink?: string;
  /** The loop's length in seconds, and when it starts: loopOf() by default. */
  seconds?: number;
  from?: number;
  /** Frames a second it is sampled at: 15. More is smoother and bigger. */
  fps?: number;
  /** Play once and hold the last frame, rather than loop. */
  once?: boolean;
  /** Pixels a cell's width when nothing else sizes it: 10. */
  scale?: number;
  /** Its title, for screen readers: "<name>, in ascii, from ascii.rest" by default. */
  label?: string;
  /** The piece's option overrides. */
  options?: Options;
}

const INK = { light: "#1f2328", dark: "#f0f6fc" };
const HEX = /^#[0-9a-f]{6}$/i;
// A colour or a size from a caller, checked before it is written into the SVG.
const hex = (v: unknown, name: string) => {
  if (v !== undefined && (typeof v !== "string" || !HEX.test(v))) throw new Error(`ascii.rest: ${name} takes a colour as #rrggbb, not ${JSON.stringify(v)}`);
  return v as string | undefined;
};
const num = (v: unknown, name: string) => {
  if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) throw new Error(`ascii.rest: ${name} takes a number of 0 or more, not ${String(v)}`);
  return v as number | undefined;
};

/** A piece as a part, in the colours of `dark` or light. */
function pieceLoop(piece: Piece, o: SvgOptions): Loop {
  const { meta } = piece;
  hex(o.ink, "ink");
  const options = { ...meta.options, ...o.options };
  const frame = piece.default(options);
  // One buffer for every frame, as a piece writes only its inked cells: the README SVGs have always been made this way.
  const color = new Uint8Array(meta.cols * meta.rows);
  const at = (t: number) => ({ text: frame(t, { paper: !o.dark, color: meta.palette ? color : undefined }), color: color.slice() });
  const loop = loopOf(piece, options);
  const every = o.seconds ?? loop.every;
  return {
    cols: meta.cols,
    rows: meta.rows,
    palette: meta.palette ?? [o.ink ?? INK[o.dark ? "dark" : "light"]],
    every: every > 0 ? every : 1,
    from: o.from ?? loop.from,
    at: every > 0 ? at : () => at(o.from ?? 0),
    once: o.once ?? loop.once,
    fps: o.fps,
  };
}

/**
 * A piece as an animated SVG. Its classes are bare, so to inline two in one HTML page, give one a prefix with
 * namespaced(). It throws for an `ink` that isn't #rrggbb or an `fps` that isn't 1 to 60.
 */
export function svg(piece: Piece, options: SvgOptions = {}): string {
  return wrap(part({ ...pieceLoop(piece, options), cell: piece.meta.cell ?? 2 }), options.label ?? `${piece.meta.name}, in ascii, from ascii.rest`, num(options.scale, "scale"));
}

export interface BannerSvgOptions {
  /** For GitHub's dark theme, or any dark page: the dark colours. */
  dark?: boolean;
  /** A line of plain text under the letters, typed out once they are in. */
  tagline?: string;
  /** The tagline's colour: the shadow's by default. */
  taglineColor?: Themed<string>;
  /** Its size, in SVG units: 28, about a third of a letter's height. */
  taglineSize?: number;
  /** A piece to set beside the letters, any logo say, or an SVG this module wrote, as { svg }. */
  art?: Piece | { svg: string } | null;
  /** Where the art goes: "left" by default, "right", "above" or "below". */
  place?: "left" | "right" | "above" | "below";
  /** The art's height against the letters and tagline: 1 beside them, 2.4 above or below. */
  artSize?: number;
  /** Room between the art and the letters, in SVG units: 32. */
  spacing?: number;
  /** How the letters, tagline and art line up across the picture: "start", "center" or "end"; centred when the art is above or below. */
  align?: "start" | "center" | "end";
  /**
   * A colour behind it all, with `padding` SVG units round it and corners of `radius`. None by default. As #rrggbb, the
   * banner's colours, and the art's, follow it, dark or light, whatever the page.
   */
  background?: Themed<string>;
  padding?: number;
  radius?: number;
  /** Pixels a cell's width when nothing else sizes it: 5, half the SVG units, the size a README shows a logo at. */
  scale?: number;
  /** Frames a second it is sampled at: 15. */
  fps?: number;
  /** Its title, for screen readers. */
  label?: string;
}

/** A banner's letters take "art" for the art's own colour, here as well as the colours banner() takes. */
export type BannerSvgColor = BannerOptions["color"] | "art";

const QUIET = { light: "#59636e", dark: "#9198a1" };
const themed = <T>(v: Themed<T> | undefined, dark: boolean): T | undefined =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as { light?: T; dark?: T })[dark ? "dark" : "light"] : (v as T | undefined);

/** Whether a colour as #rrggbb is dark: what a banner on it takes its colours from. */
export const darkColor = (hex: string) =>
  0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16) < 128;

/**
 * A banner as an animated SVG, with a tagline under it, a piece beside or above it and a background if you like.
 * Without a colour it is in GitHub's own text colours for the theme. It throws when banner() would, for a background or
 * tagline colour that isn't #rrggbb, and for art as { svg } that ascii.rest/svg didn't write.
 */
export function bannerSvg(text: string, options: Omit<BannerOptions, "color"> & { color?: BannerSvgColor } & BannerSvgOptions = {}): string {
  // On a background its colours follow the background, dark or light, not the page: a dark card on a light README
  // takes the dark ones.
  const ground = hex(themed(options.background, options.dark ?? false), "background");
  const dark = ground ? darkColor(ground) : (options.dark ?? false);
  const theme = dark ? "dark" : "light";
  for (const k of ["taglineSize", "spacing", "padding", "radius", "artSize"] as const) num(options[k], k);
  let art: Part | null = null;
  if (options.art && "svg" in options.art) {
    art = namespaced(options.art.svg, "a");
    if (!art) throw new Error("ascii.rest: art takes a piece, or { svg } of an SVG that ascii.rest/svg wrote");
  } else if (options.art) art = part({ ...pieceLoop(options.art, { dark }), cell: options.art.meta.cell ?? 2 }, "a");
  // A still banner holds its art still too, on its first frame.
  if (art && options.effect === "still") art.css += `.af{animation:none}.ak0{opacity:1}`;

  // The letters' colours: the art's own, a fade, one colour, or GitHub's text colour.
  const asked = options.color === "art" ? ((art && inkOf(art)) ?? INK[theme]) : (themed(options.color, dark) ?? INK[theme]);
  const quiet = themed(options.shadowColor, dark) ?? QUIET[theme];
  const piece = banner(text, { ...options, color: asked, shadowColor: quiet });
  const { meta, motion } = piece;
  const fade = Array.isArray(asked) && asked.length > 1 ? asked : null;
  const frame = piece.default();
  const color = new Uint8Array(meta.cols * meta.rows);
  // The palette's half for the theme, so the shadow is 0 and the letters 1 on, each letter's column its own colour.
  const at = (t: number): Shot => {
    color.fill(0);
    const text = frame(t, { paper: !dark, color });
    const c = color.slice();
    const base = dark ? meta.palette!.length / 2 : 0;
    // A fade is one paint, a gradient along the letters, so every letter's cell takes the same class.
    for (let i = 0; i < c.length; i++) c[i] = c[i] - base > 0 ? (fade ? 1 : c[i] - base) : 0;
    return { text, color: c };
  };
  const palette = meta.palette!.slice(dark ? meta.palette!.length / 2 : 0);
  if (fade) palette[1] = "url(#g)";
  const letters = part({ cols: meta.cols, rows: meta.rows, palette, every: motion.seconds || 1, from: motion.from, at, once: motion.once, fps: options.fps });
  // The fade runs from the middle of the letters' first column to the middle of their last, as it does on a canvas:
  // the columns of the cells a letter inks once they are all in.
  let lo = meta.cols, hi = 0;
  if (fade) {
    const all = at(meta.still ?? motion.from);
    for (let i = 0; i < all.color.length; i++) if (all.color[i]) (lo = Math.min(lo, i % meta.cols)), (hi = Math.max(hi, i % meta.cols));
  }
  if (fade)
    letters.body =
      `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${(lo + 0.5) * CW}" y1="0" x2="${(hi + 0.5) * CW}" y2="0">` +
      fade.map((c, i) => `<stop offset="${+(i / (fade.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join("") +
      `</linearGradient></defs>${letters.body}`;

  // The tagline, a character at a time once the letters are in, then a cursor that blinks; all at once if nothing moves.
  let line: Part | null = null;
  const tagline = xml(options.tagline ?? "").trim();
  if (tagline) {
    const size = options.taglineSize ?? 28;
    const chars = [...tagline];
    const moves = (options.effect ?? "glint") !== "still";
    const start = motion.once ? motion.seconds : 0.4;
    const at = (i: number) => +(start + i * 0.045).toFixed(3);
    const spans = chars.map((c, i) => (moves ? `<tspan style="animation-delay:${at(i)}s">${esc(c)}</tspan>` : esc(c))).join("");
    const cursor = moves ? `<tspan class="sc" style="animation-delay:${at(chars.length)}s">▍</tspan>` : "";
    const tall = Math.round(size * 1.43);
    line = {
      width: (chars.length + (moves ? 1 : 0)) * size * 0.6,
      height: tall,
      css:
        `.st{font:${size}px ${FACES};fill:${hex(themed(options.taglineColor, dark), "taglineColor") ?? quiet}}` +
        (moves
          ? `.st tspan{opacity:0;animation:si 1ms forwards}.st .sc{animation:sb 1.06s step-end infinite}@keyframes si{to{opacity:1}}@keyframes sb{0%{opacity:1}50%{opacity:0}}` +
            `@media (prefers-reduced-motion:reduce){.st tspan{animation:none;opacity:1}.st .sc{display:none}}`
          : ""),
      body: `<text class="st" y="${tall / 2}">${spans}${cursor}</text>`,
    };
  }

  // The letters with the tagline under them: a block. The art beside it or above it.
  const place = options.place ?? "left";
  const across = place === "above" || place === "below";
  const align = options.align ?? (art && across ? "center" : "start");
  const gapUnder = 16;
  const blockW = Math.max(letters.width, line?.width ?? 0);
  const blockH = letters.height + (line ? gapUnder + line.height : 0);
  const shift = (w: number, room: number) => (align === "center" ? (room - w) / 2 : align === "end" ? room - w : 0);
  const block = (x: number, y: number, room: number) => {
    let s = `<g transform="translate(${+(x + shift(letters.width, room)).toFixed(2)},${y})">${letters.body}</g>`;
    if (line) s += `<g transform="translate(${+(x + shift(line.width, room)).toFixed(2)},${y + letters.height + gapUnder})">${line.body}</g>`;
    return s;
  };
  const spacing = options.spacing ?? 32;
  let width = blockW, height = blockH, body = "";
  if (!art) body = block(0, 0, blockW);
  else {
    const h = +(blockH * (options.artSize ?? (across ? 2.4 : 1))).toFixed(2);
    const w = +((art.width * h) / art.height).toFixed(2);
    const nest = (x: number, y: number) => `<svg x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${w}" height="${h}" viewBox="0 0 ${art.width} ${art.height}">${art.body}</svg>`;
    if (across) {
      width = Math.max(w, blockW);
      height = h + spacing + blockH;
      const artX = shift(w, width);
      body = place === "above" ? nest(artX, 0) + block(0, h + spacing, width) : block(0, 0, width) + nest(artX, blockH + spacing);
    } else {
      width = w + spacing + blockW;
      height = Math.max(h, blockH);
      const top = (u: number) => (height - u) / 2;
      body = place === "left" ? nest(0, top(h)) + block(w + spacing, top(blockH), blockW) : block(0, top(blockH), blockW) + nest(blockW + spacing, top(h));
    }
  }

  // A background behind it all, with padding round it.
  if (ground) {
    const pad = options.padding ?? 24;
    body = `<rect width="${width + 2 * pad}" height="${height + 2 * pad}" rx="${options.radius ?? 12}" fill="${attr(ground)}"/><g transform="translate(${pad},${pad})">${body}</g>`;
    width += 2 * pad;
    height += 2 * pad;
  }
  const label = options.label ?? `${piece.text}${tagline ? `: ${tagline}` : ""}, in ascii, from ascii.rest`;
  return wrap({ width, height, css: letters.css + (line?.css ?? "") + (art?.css ?? ""), body }, label, options.scale ?? 5);
}
