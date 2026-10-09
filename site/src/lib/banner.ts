/*
 * A README banner: big text sized to its text (fit() in pieces/big-text.ts),
 * as an animated SVG written by lib/animated.ts, the letters in one ink or a
 * fade and their shadow in a quieter one. It can carry a tagline typed out
 * under it, and any logo, company or distro of the library beside or above it,
 * that piece's own README SVG set in the same picture. The Worker
 * (src/worker.ts) serves it at /banner/<text>.svg and /banner/<text>.dark.svg
 * with the choices in the query; the page at /banner/ draws the same SVG in
 * the browser as you type. Both read and write the URL with read() and
 * bannerPath() here, so a banner has one URL.
 */
import { drawable, fit } from "ascii.rest/pieces/big-text";
import { FACES, attr, esc, inkOf, namespaced, part, wrap, type Part, type Shot } from "./animated";

// Not from lib/library.ts, which loads every piece: the Worker bundles this file.
const SITE = "https://ascii.rest";

/**
 * The most characters a banner holds: 20 of the widest, M, are 239 columns, about 1,200 pixels, and take the Worker
 * some 8 ms to draw, inside the 10 ms of CPU a request has on Workers Free.
 */
export const MAX = 20;
/** The longest tagline, in characters. */
export const TAGLINE = 60;
/** What the font draws. Anything else in a banner's text is left out. */
export const MARKS = ". , ! ? ' : - + = / _";
export const CHARS = `letters, digits, spaces and ${MARKS}`;

export type Effect = "glint" | "type" | "still";
/** glint: a glint passes every few seconds. type: the letters type in once and stay. still: nothing moves. */
export const EFFECTS: readonly Effect[] = ["glint", "type", "still"];
export type Place = "left" | "above";
export const PLACES: readonly Place[] = ["left", "above"];
export type Size = "s" | "m" | "l";
export const SIZES: readonly Size[] = ["s", "m", "l"];
// Pixels a column, as a README shows it with no width of its own.
const SCALE: Record<Size, number> = { s: 3, m: 5, l: 8 };

/** The letters' colour: GitHub's own text colour, one colour, a fade from one to another, or the art's own colour. */
export type Ink = null | "art" | readonly [string] | readonly [string, string];

export interface Look {
  color: Ink;
  effect: Effect;
  /** A line of plain text under the letters, typed out; "" for none. */
  tagline: string;
  /** The slug of a logo, company or distro to set beside or above the letters; "" for none. */
  art: string;
  place: Place;
  size: Size;
}

export const PLAIN: Look = { color: null, effect: "glint", tagline: "", art: "", place: "left", size: "m" };

// GitHub's own text colours, default and muted, in its light and dark themes: a banner sits on its pages.
const INKS = { light: ["#1f2328", "#59636e"], dark: ["#f0f6fc", "#9198a1"] };
// The shadow's double lines, U+2550 to U+256C, take the quieter ink.
const shadow = (c: string) => c >= "═" && c <= "╬";

/** A banner's text as it is drawn: the characters the font has, one space between words. */
export const clean = (text: string) => drawable(text).trim().replace(/\s+/g, " ");

/** A tagline as it is set: no control characters or broken surrogates, one space between words. */
export const cleanTagline = (text: string) =>
  text
    .replace(/[\u0000-\u001f\u007f-\u009f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "")
    .trim()
    .replace(/\s+/g, " ");

/** A colour: six hex digits, with or without "#", as "#rrggbb"; null for anything else. */
export const hex = (s: string | null | undefined) => (s && /^#?[0-9a-f]{6}$/i.test(s) ? `#${s.replace("#", "").toLowerCase()}` : null);

/** The choices in a banner's query, or what is wrong with them. Anything left out is the plain banner's. */
export function read(query: URLSearchParams): Look | string {
  const look: Look = { ...PLAIN };
  const color = query.get("color");
  if (color === "art") look.color = "art";
  else if (color !== null) {
    const parts = color.split(",").map(hex);
    if (!(parts.length === 1 || parts.length === 2) || parts.some((c) => !c)) return "color takes six hex digits, like ff6a00, two for a fade, like ff6a00,f778ba, or art";
    look.color = parts as [string] | [string, string];
  }
  const effect = query.get("effect");
  if (effect !== null) {
    if (!EFFECTS.includes(effect as Effect)) return `effect takes ${EFFECTS.join(", ")}`;
    look.effect = effect as Effect;
  }
  const tagline = query.get("tagline");
  if (tagline !== null) {
    look.tagline = cleanTagline(tagline);
    if ([...look.tagline].length > TAGLINE) return `a tagline takes up to ${TAGLINE} characters`;
  }
  const art = query.get("art");
  if (art !== null) {
    if (!/^[a-z0-9-]{1,40}$/.test(art)) return "art takes the name of a logo, company or distro, like rust";
    look.art = art;
  }
  if (look.color === "art" && !look.art) return "color=art takes its colour from the art, so it needs art too";
  const place = query.get("place");
  if (place !== null) {
    if (!PLACES.includes(place as Place)) return `place takes ${PLACES.join(" or ")}`;
    look.place = place as Place;
  }
  const size = query.get("size");
  if (size !== null) {
    if (!SIZES.includes(size as Size)) return `size takes ${SIZES.join(", ")}`;
    look.size = size as Size;
  }
  return look;
}

/** The query for a look, in one order with the plain banner's choices left out, so each banner has one URL. */
export function query(look: Look): string {
  const q: string[] = [];
  // Brackets escaped too, so the URL can end a Markdown link; commas kept, for a fade's two colours.
  const put = (key: string, value: string) =>
    q.push(`${key}=${encodeURIComponent(value).replace(/[()'*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%2C/g, ",")}`);
  if (look.color) put("color", look.color === "art" ? "art" : look.color.map((c) => c.slice(1)).join(","));
  if (look.effect !== PLAIN.effect) put("effect", look.effect);
  if (look.tagline) put("tagline", look.tagline);
  if (look.art) {
    put("art", look.art);
    if (look.place !== PLAIN.place) put("place", look.place);
  }
  if (look.size !== PLAIN.size) put("size", look.size);
  return q.length ? `?${q.join("&")}` : "";
}

/** The URL of a banner: its text in the path, ".dark" for GitHub's dark theme, and its choices in the query. */
export const bannerPath = (text: string, dark: boolean, look: Look = PLAIN) =>
  `/banner/${encodeURIComponent(clean(text))}${dark ? ".dark" : ""}.svg${query(look)}`;

/** The README snippet: the light banner and the dark one for GitHub's dark theme, linking here; centred if asked. */
export function readmeBanner(text: string, look: Look = PLAIN, center = false) {
  const lines = [
    `<a href="${SITE}/banner/">`,
    `  <picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${SITE}${bannerPath(text, true, look)}">`,
    `    <img alt="${attr(alt(clean(text), look))}" src="${SITE}${bannerPath(text, false, look)}">`,
    `  </picture>`,
    `</a>`,
  ];
  return center ? [`<p align="center">`, ...lines.map((l) => `  ${l}`), `</p>`].join("\n") : lines.join("\n");
}

/** The same in Markdown, one image for both themes. */
export const markdownBanner = (text: string, look: Look = PLAIN) =>
  `[![${alt(clean(text), look).replace(/[[\]]/g, "")}](${SITE}${bannerPath(text, false, look)})](${SITE}/banner/)`;

// In single quotes, which keep a shell's hands off ! and $; a quote in it ends them, is escaped and opens them again.
const quoted = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
// What a terminal can show of a look: the letters' colours and the tagline.
const shades = (look: Look) => (look.color && look.color !== "art" ? look.color : null);

/** The command that shows a banner in a terminal. */
export function terminalBanner(text: string, look: Look = PLAIN) {
  const colors = shades(look);
  return (
    `npx ascii.rest banner ${quoted(clean(text))}` +
    (colors ? ` --color ${colors.map((c) => c.slice(1)).join(",")}` : "") +
    (look.tagline ? ` --tagline ${quoted(look.tagline)}` : "")
  );
}

/** The same in a CLI of your own, as it starts. */
export function cliBanner(text: string, look: Look = PLAIN) {
  const colors = shades(look);
  const options = [
    colors ? `color: ${colors.length === 1 ? JSON.stringify(colors[0]) : `[${colors.map((c) => JSON.stringify(c)).join(", ")}]`}` : "",
    look.tagline ? `tagline: ${JSON.stringify(look.tagline)}` : "",
  ].filter(Boolean);
  return [`import { banner } from "ascii.rest/terminal";`, ``, `await banner(${JSON.stringify(clean(text))}${options.length ? `, { ${options.join(", ")} }` : ""});`].join("\n");
}

// What the banner says, for a README's alt text, and with where it is from for the SVG's own title.
const alt = (words: string, look: Look) => `${words}${look.tagline ? `: ${look.tagline}` : ""}`;
const label = (words: string, look: Look) => `${alt(words, look)}, in ascii, from ascii.rest`;

// A tagline's type, in SVG units, and how far below the letters it sits.
const TAG = 28, TAG_GAP = 16, TAG_LINE = 40;
// Between the art and the letters.
const ART_GAP = 32;
// The art above the letters is this tall, about two and a half times the letters.
const ABOVE = 288;
// A letter types in every two frames of the SVG's fifteen a second.
const STEP = 2 / 15;

/**
 * The banner for a text, light or dark, as SVG with its size in SVG units; null when the font draws none of the text.
 * `art` is the README SVG of the logo, company or distro the look names, in the same theme, when it has one.
 */
export function banner(text: string, { dark = false, look = PLAIN, art = null }: { dark?: boolean; look?: Look; art?: string | null } = {}) {
  const words = clean(text);
  const { cols, rows, frame, glint } = fit(words);
  if (!cols) return null;
  const [ink, quiet] = INKS[dark ? "dark" : "light"];
  const picture = look.art && art ? namespaced(art, "a") : null;

  // The letters' fill: GitHub's ink, a colour, the art's own colour, or a fade along them.
  const color = look.color;
  const fade = Array.isArray(color) && color.length === 2 ? (color as readonly [string, string]) : null;
  const fill = fade ? "url(#g)" : color === "art" ? ((picture && inkOf(picture)) ?? ink) : color ? color[0] : ink;

  const paint = (lines: string) => ({ text: lines, color: Uint8Array.from(lines.replace(/\n/g, ""), (c) => (shadow(c) ? 1 : 0)) });
  const rest = frame(0, { paper: !dark });
  let loop: { every: number; from: number; once?: boolean; at: (t: number) => Shot };
  if (look.effect === "type") {
    // Each letter in turn, the columns up to the end of its shadow, then the whole word held.
    const ends = [...words].map((_, k) => fit(words.slice(0, k + 1)).cols);
    const lines = rest.split("\n");
    const upTo = (w: number) => paint(lines.map((line) => line.slice(0, w).padEnd(cols)).join("\n"));
    loop = { every: (2 * ends.length + 4) / 15, from: 0, once: true, at: (t: number) => upTo(ends[Math.min(ends.length - 1, Math.floor(t / STEP + 1e-9))]) };
  } else if (look.effect === "still") loop = { every: 1, from: 0, at: () => paint(rest) };
  // From 0 it rests half a second, the glint crosses, and it rests again until the loop comes round.
  else loop = { every: glint.every, from: 0, at: (t: number) => paint(frame(t, { paper: !dark })) };
  const letters = part({ cols, rows, palette: [fill, quiet], ...loop });
  if (fade) letters.body = `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${letters.width}" y2="0"><stop offset="0" stop-color="${fade[0]}"/><stop offset="1" stop-color="${fade[1]}"/></linearGradient></defs>${letters.body}`;

  // The tagline, a character at a time once the letters are in, then a cursor that blinks; at once if nothing moves.
  let line: Part | null = null;
  if (look.tagline) {
    const chars = [...look.tagline];
    const moves = look.effect !== "still";
    const start = look.effect === "type" ? loop.every : 0.4;
    const at = (i: number) => +(start + i * 0.045).toFixed(3);
    const spans = chars.map((c, i) => (moves ? `<tspan style="animation-delay:${at(i)}s">${esc(c)}</tspan>` : esc(c))).join("");
    const cursor = moves ? `<tspan class="sc" style="animation-delay:${at(chars.length)}s">▍</tspan>` : "";
    line = {
      width: (chars.length + (moves ? 1 : 0)) * TAG * 0.6,
      height: TAG_LINE,
      css:
        `.st{font:${TAG}px ${FACES};fill:${quiet}}` +
        (moves
          ? `.st tspan{opacity:0;animation:si 1ms forwards}.st .sc{animation:sb 1.06s step-end infinite}@keyframes si{to{opacity:1}}@keyframes sb{0%{opacity:1}50%{opacity:0}}` +
            `@media (prefers-reduced-motion:reduce){.st tspan{animation:none;opacity:1}.st .sc{display:none}}`
          : ""),
      body: `<text class="st" y="${TAG_LINE / 2}">${spans}${cursor}</text>`,
    };
  }

  // The letters with the tagline under them, each centred in the block when the art is above, else from its left.
  const centred = Boolean(picture) && look.place === "above";
  const blockW = Math.max(letters.width, line?.width ?? 0);
  const blockH = letters.height + (line ? TAG_GAP + line.height : 0);
  const block = (x: number, y: number) => {
    const dx = (w: number) => x + (centred ? (blockW - w) / 2 : 0);
    let s = `<g transform="translate(${dx(letters.width)},${y})">${letters.body}</g>`;
    if (line) s += `<g transform="translate(${dx(line.width)},${y + letters.height + TAG_GAP})">${line.body}</g>`;
    return s;
  };
  let width = blockW, height = blockH, body: string;
  if (!picture) body = block(0, 0);
  else {
    const h = centred ? ABOVE : blockH;
    const w = +((picture.width * h) / picture.height).toFixed(2);
    const nest = (x: number, y: number) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${picture.width} ${picture.height}">${picture.body}</svg>`;
    if (centred) {
      width = Math.max(w, blockW);
      height = h + ART_GAP + blockH;
      body = nest((width - w) / 2, 0) + block((width - blockW) / 2, h + ART_GAP);
    } else {
      width = w + ART_GAP + blockW;
      body = nest(0, 0) + block(w + ART_GAP, 0);
    }
  }
  const css = letters.css + (line?.css ?? "") + (picture?.css ?? "");
  const svg = wrap({ width, height, css, body }, label(words, look), SCALE[look.size]);
  return { svg, text: words, width, height };
}
