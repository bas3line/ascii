/*
 * A docs page as an agent reads it, with nothing but the language: used by
 * /llms.txt and /llms-full.txt (llms.ts) and by the agent skill's references
 * (scripts/skill.ts), which runs in Node without Vite, so this imports nothing.
 */

/** A docs page's source split into its frontmatter description and its Markdown body. */
export function split(source: string): { description: string; body: string } {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(source);
  const description = front ? (/^description:\s*(.*)$/m.exec(front[1])?.[1] ?? "") : "";
  return { description, body: front ? source.slice(front[0].length) : source };
}

/**
 * Markdown for an agent: a live example is said to be one, a video is its caption, and every site link is absolute.
 * Code blocks are left as they are.
 */
export function plain(markdown: string, site: string): string {
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
            .replace(/\]\(\//g, `](${site}/`)
            .replace(/(href|src)="\//g, `$1="${site}/`),
    )
    .join("")
    .replace(/(\(A live example plays here on the page\.\)\s*){2,}/g, "(Live examples play here on the page.)\n\n")
    .trim();
}

/** A section of a page's plain body, from its heading to the next of the same level, without the heading. */
export function section(body: string, heading: string): string {
  const at = body.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const rest = body.slice(at + heading.length + 5);
  const end = rest.search(/\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}
