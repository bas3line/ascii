/*
 * /llms.txt: the docs as a plain index, for a coding agent to find its way: what ascii.rest is, the introduction's
 * rules for agents, then every docs page with its one line, in the docs' own order (lib/docs.ts), each markdown
 * figure with what it draws and the fence that draws it, and where the pieces and the registry are.
 */
import type { APIRoute } from "astro";
import { catalog, fenceOf } from "ascii.rest/markdown";
import { DOCS } from "../lib/docs";
import { SITE, pieces } from "../lib/library";
import { page, section } from "../lib/llms";

const about = (href: string) => page(href).description;

// Each markdown figure: its name linking its docs, what it draws, where it suits and how it moves, and its first
// example as the fence an agent writes.
const figures = catalog.flatMap((e) => [`### ${e.kind}`, "", `[${e.kind}](${SITE}/docs/markdown-${e.group}/#${e.kind}): ${e.about}. For ${e.for.join(", ")}; ${e.moves}.`, "", fenceOf(e), ""]);

export const GET: APIRoute = () => {
  const rules = section("/docs/", "Rules for AI coding agents");
  const lines = [
    "# ascii.rest",
    "",
    `> Animated ascii art for web pages, READMEs and terminals: ${pieces.length} pieces, a banner for any text, an SVG writer, and a kit (ascii.rest/kit) for making your own pieces in a few lines, in TypeScript with no dependencies. npm install ascii.rest, one script tag, or the source copied in through a shadcn registry.`,
    "",
    ...(rules ? ["## rules for AI coding agents", "", rules, ""] : []),
    ...DOCS.flatMap((section) => [`## ${section.label}`, "", ...section.pages.map((p) => `- [${p.title}](${SITE}${p.href}): ${about(p.href)}`), ""]),
    "## markdown figures",
    "",
    `Figures written in markdown and drawn in text, from ascii.rest/markdown. To draw one, write a fenced block whose language is ascii, with the figure's name and its options after it, key=value, as each one below shows. The remark plugin, ascii.rest/markdown/remark, draws the fences of a site's Markdown or MDX, and start() from ascii.rest/markdown builds them in on the page; npx ascii.rest md README.src.md --out README.md draws them as text for a README. The grammar and the options every figure takes: [markdown figures](${SITE}/docs/markdown/).`,
    "",
    ...figures,
    "## more",
    "",
    `- [every docs page in one file](${SITE}/llms-full.txt): to read the whole of the docs at once`,
    `- [every piece](${SITE}/#pieces): each with its own page, at ${SITE}/<name>/, and its source`,
    `- [registry index](${SITE}/r/registry.json): every shadcn registry item`,
    `- [source](https://github.com/bas3line/ascii): MIT licensed`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
