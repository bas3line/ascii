/*
 * Code in colour, in the shades of ray.so's Resend theme (site.css holds them):
 * Shiki marks each token with a CSS variable, the same --astro-code- ones the
 * docs' Markdown gets, so light and dark follow the page. The same module runs
 * on the server, for the snippets a page is built with, and in the browser, for
 * the ones the banner maker and the image page write as you go (paint.ts). It uses Shiki's
 * JavaScript regex engine, so the browser fetches no WebAssembly, and loads each
 * language the first time it is asked for.
 */
import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const LANGS = {
  html: () => import("shiki/langs/html.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  ts: () => import("shiki/langs/typescript.mjs"),
  astro: () => import("shiki/langs/astro.mjs"),
  sh: () => import("shiki/langs/shellscript.mjs"),
  md: () => import("shiki/langs/markdown.mjs"),
};
export type Lang = keyof typeof LANGS;

const theme = createCssVariablesTheme({ name: "ascii-code", variablePrefix: "--astro-code-", variableDefaults: {}, fontStyle: true });
let highlighter: Promise<HighlighterCore> | undefined;
const loaded = new Map<Lang, Promise<void>>();

function language(lang: Lang) {
  highlighter ??= createHighlighterCore({ themes: [theme], langs: [], engine: createJavaScriptRegexEngine() });
  let ready = loaded.get(lang);
  if (!ready) {
    ready = Promise.all([highlighter, LANGS[lang]()]).then(([h, mod]) => h.loadLanguage(mod.default));
    loaded.set(lang, ready);
  }
  return ready.then(() => highlighter!);
}

/** The code as HTML for the inside of a <pre>: a span a token, the text unchanged, so copying it copies the code. */
export async function highlight(code: string, lang: Lang) {
  const h = await language(lang);
  // Shiki escapes the text it wraps, so the HTML is safe even for code that holds a visitor's own words.
  const html = h.codeToHtml(code, { lang, theme: "ascii-code" });
  return html.replace(/^<pre[^>]*><code>/, "").replace(/<\/code><\/pre>$/, "");
}
