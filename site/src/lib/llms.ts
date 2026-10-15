/*
 * The docs pages as an agent reads them, for /llms.txt and /llms-full.txt: a
 * page's Markdown without the HTML that only a browser shows, live examples
 * and videos, and with links made absolute, so an agent can follow them from
 * a plain text file.
 */
import { SITE } from "./library";

const raw = import.meta.glob<string>("../pages/docs/*.md", { eager: true, query: "?raw", import: "default" });

/** A docs page's source file, by its URL. */
const file = (href: string) => (href === "/docs/" ? "../pages/docs/index.md" : `../pages/docs/${href.slice("/docs/".length, -1)}.md`);

/** A docs page's frontmatter description and its Markdown body. */
export function page(href: string): { description: string; body: string } {
  const source = raw[file(href)] ?? "";
  const front = /^---\n([\s\S]*?)\n---\n/.exec(source);
  const description = front ? (/^description:\s*(.*)$/m.exec(front[1])?.[1] ?? "") : "";
  return { description, body: plain(front ? source.slice(front[0].length) : source) };
}

/**
 * Markdown for an agent: a live example is said to be one, a video is its caption, and every site link is absolute.
 * Code blocks are left as they are.
 */
export function plain(markdown: string): string {
  return markdown
    .split(/(```[\s\S]*?```)/)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/<figure class="video">[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/g, (_, caption: string) => `(A video on this page shows this: ${caption.trim()})`)
            .replace(/<div class="demo"[^>]*>[\s\S]*?<\/div>/g, "(A live example plays here on the page.)")
            // an empty element that is only a link's target
            .replace(/^<div id="[^"]*"><\/div>\n?/gm, "")
            .replace(/\]\(\//g, `](${SITE}/`)
            .replace(/(href|src)="\//g, `$1="${SITE}/`),
    )
    .join("")
    .replace(/(\(A live example plays here on the page\.\)\s*){2,}/g, "(Live examples play here on the page.)\n\n")
    .trim();
}

/** A section of a docs page, from its heading to the next of the same level, without the heading. */
export function section(href: string, heading: string): string {
  const { body } = page(href);
  const at = body.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const rest = body.slice(at + heading.length + 5);
  const end = rest.search(/\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}
