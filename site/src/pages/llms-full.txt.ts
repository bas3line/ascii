/*
 * /llms-full.txt: every docs page in one plain file, in the docs' own order (lib/docs.ts), for a coding agent to read
 * whole: each page's title, URL and description, then its Markdown as lib/llms.ts makes it for an agent, with live
 * examples and videos said in words and every link absolute. The introduction comes first, its rules for agents with it.
 */
import type { APIRoute } from "astro";
import { pages } from "../lib/docs";
import { SITE } from "../lib/library";
import { page } from "../lib/llms";

export const GET: APIRoute = () => {
  const parts = pages.map((p) => {
    const { description, body } = page(p.href);
    return `# ${p.title}\n\nURL: ${SITE}${p.href}\n${description ? `\n${description}\n` : ""}\n${body}\n`;
  });
  const head = `# ascii.rest docs, every page\n\nAnimated ascii art for web pages, READMEs and terminals. The index of these pages is ${SITE}/llms.txt.\n`;
  return new Response([head, ...parts].join("\n---\n\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
