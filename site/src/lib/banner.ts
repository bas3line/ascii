/*
 * A README banner: big text sized to its text (fit() in pieces/big-text.ts),
 * as an animated SVG of its glint written by lib/animated.ts, the letters in
 * one ink and their shadow in a quieter one. The Worker (src/worker.ts) serves
 * it at /banner/<text>.svg and /banner/<text>.dark.svg; the page at /banner/
 * draws the same SVG in the browser as you type.
 */
import { drawable, fit } from "ascii.rest/pieces/big-text";
import { animated } from "./animated";

// Not from lib/library.ts, which loads every piece: the Worker bundles this file.
const SITE = "https://ascii.rest";

/**
 * The most characters a banner holds: 20 of the widest, M, are 239 columns, about 1,200 pixels, and take the Worker
 * some 8 ms to draw, inside the 10 ms of CPU a request has on Workers Free.
 */
export const MAX = 20;
/** What the font draws. Anything else in a banner's text is left out. */
export const MARKS = ". , ! ? ' : - + = / _";
export const CHARS = `letters, digits, spaces and ${MARKS}`;

// GitHub's own text colours, default and muted, in its light and dark themes: a banner sits on its pages.
const INKS = { light: ["#1f2328", "#59636e"], dark: ["#f0f6fc", "#9198a1"] };
// The shadow's double lines, U+2550 to U+256C, take the quieter ink.
const shadow = (c: string) => c >= "═" && c <= "╬";

/** A banner's text as it is drawn: the characters the font has, one space between words. */
export const clean = (text: string) => drawable(text).trim().replace(/\s+/g, " ");

/** A colour for the letters: six hex digits, with or without "#", as "#rrggbb"; null for anything else. */
export const hex = (s: string | null | undefined) => (s && /^#?[0-9a-f]{6}$/i.test(s) ? `#${s.replace("#", "").toLowerCase()}` : null);

/** The URL of a banner: its text in the path, ".dark" for GitHub's dark theme, and the letters' colour if it has one. */
export const bannerPath = (text: string, dark: boolean, color?: string | null) =>
  `/banner/${encodeURIComponent(clean(text))}${dark ? ".dark" : ""}.svg${color ? `?color=${color.slice(1)}` : ""}`;

/** What goes in a README: the light banner and the dark one for GitHub's dark theme, linking here. */
export const readmeBanner = (text: string, color?: string | null) =>
  [
    `<a href="${SITE}/banner/">`,
    `  <picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${SITE}${bannerPath(text, true, color)}">`,
    `    <img alt="${clean(text)}" src="${SITE}${bannerPath(text, false, color)}">`,
    `  </picture>`,
    `</a>`,
  ].join("\n");

// In single quotes, which keep a shell's hands off ! and $; a quote in it ends them, is escaped and opens them again.
const quoted = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** The command that shows a banner in a terminal. */
export const terminalBanner = (text: string, color?: string | null) =>
  `npx ascii.rest banner ${quoted(clean(text))}${color ? ` --color ${color.slice(1)}` : ""}`;

/** The same in a CLI of your own, as it starts. */
export const cliBanner = (text: string, color?: string | null) =>
  [`import { banner } from "ascii.rest/terminal";`, ``, `await banner(${JSON.stringify(clean(text))}${color ? `, { color: "${color}" }` : ""});`].join("\n");

/**
 * The banner for a text, light or dark, as SVG with its size in cells, drawn at 5px a column so it needs no width;
 * null when the font draws none of the text. `color` is the letters' colour as "#rrggbb", GitHub's text colour by
 * default.
 */
export function banner(text: string, { dark = false, color }: { dark?: boolean; color?: string | null } = {}) {
  const words = clean(text);
  const { cols, rows, frame, glint } = fit(words);
  if (!cols) return null;
  const [ink, quiet] = INKS[dark ? "dark" : "light"];
  const at = (t: number) => {
    const text = frame(t, { paper: !dark });
    return { text, color: Uint8Array.from(text.replace(/\n/g, ""), (c) => (shadow(c) ? 1 : 0)) };
  };
  // From 0 it rests half a second, the glint crosses, and it rests again until the loop comes round.
  const svg = animated({ cols, rows, palette: [color ?? ink, quiet], every: glint.every, from: 0, at, label: `${words}, in ascii, from ascii.rest`, scale: 5 });
  return { svg, text: words, cols, rows };
}
