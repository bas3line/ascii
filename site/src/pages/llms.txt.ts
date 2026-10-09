/*
 * /llms.txt: the docs as a plain index, for a coding agent to find its way: what ascii.rest is, then every docs page
 * with its one line, in the docs' own order (lib/docs.ts), and where the pieces and the registry are.
 */
import type { APIRoute } from "astro";
import { DOCS } from "../lib/docs";
import { SITE, pieces } from "../lib/library";

const files = import.meta.glob<{ frontmatter: { title: string; description: string } }>("./docs/*.md", { eager: true });
const about = (href: string) => {
  const file = href === "/docs/" ? "./docs/index.md" : `./docs/${href.slice("/docs/".length, -1)}.md`;
  return files[file]?.frontmatter.description ?? "";
};

export const GET: APIRoute = () => {
  const lines = [
    "# ascii.rest",
    "",
    `> Animated ascii art for web pages, READMEs and terminals: ${pieces.length} pieces, a banner for any text and an SVG writer, in TypeScript with no dependencies. npm install ascii.rest, one script tag, or the source copied in through a shadcn registry.`,
    "",
    ...DOCS.flatMap((section) => [`## ${section.label}`, "", ...section.pages.map((p) => `- [${p.title}](${SITE}${p.href}): ${about(p.href)}`), ""]),
    "## more",
    "",
    `- [every piece](${SITE}/#pieces): each with its own page, at ${SITE}/<name>/, and its source`,
    `- [registry index](${SITE}/r/registry.json): every shadcn registry item`,
    `- [source](https://github.com/bas3line/ascii): MIT licensed`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
