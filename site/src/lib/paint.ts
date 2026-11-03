/*
 * Code a page writes as you go, put in colour. The highlighter is imported only
 * once there is code to colour, so it is its own chunk, fetched by the pages
 * that use it and not by the others that share their modules.
 */
import type { Lang } from "./highlight";

/**
 * Puts code in a <pre> as plain text at once, then in colour once the highlighter has it, unless newer code
 * has come in meanwhile. If the highlighter can't load, the plain text stays. With no language, it stays plain.
 */
export function paint(pre: HTMLElement, code: string, lang?: Lang) {
  // Already this code, in colour from the server: nothing to fetch.
  if (lang && pre.firstElementChild && pre.textContent === code) return;
  pre.textContent = code;
  pre.dataset.code = code;
  if (!lang) return;
  import("./highlight")
    .then((m) => m.highlight(code, lang))
    .then(
      (html) => {
        if (pre.dataset.code === code) pre.innerHTML = html;
      },
      () => {},
    );
}
