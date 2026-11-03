/*
 * The docs pages as an agent reads them, for /llms.txt and /llms-full.txt: a
 * page's Markdown without the HTML that only a browser shows, live examples
 * and videos, and with links made absolute, so an agent can follow them from
 * a plain text file. The making plain is in plain.ts, which the agent skill shares.
 */
import { SITE } from "./library";
import { plain, section as sectionOf, split } from "./plain";

const raw = import.meta.glob<string>("../pages/docs/*.md", { eager: true, query: "?raw", import: "default" });

/** A docs page's source file, by its URL. */
const file = (href: string) => (href === "/docs/" ? "../pages/docs/index.md" : `../pages/docs/${href.slice("/docs/".length, -1)}.md`);

/** A docs page's frontmatter description and its Markdown body, made plain. */
export function page(href: string): { description: string; body: string } {
  const { description, body } = split(raw[file(href)] ?? "");
  return { description, body: plain(body, SITE) };
}

/** A section of a docs page, from its heading to the next of the same level, without the heading. */
export function section(href: string, heading: string): string {
  return sectionOf(page(href).body, heading);
}
