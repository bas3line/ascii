/*
 * ascii.rest/markdown/remark: a remark plugin that draws every ```ascii fence
 * in a markdown or MDX page as its figure, for Astro, Next.js with MDX, or
 * anything built on remark. Each fence becomes the figure's still in a
 * <pre class="ascii-md">, so the page is whole before any script runs; start()
 * from ascii.rest/markdown then plays each one as it is scrolled to. A figure
 * is handed on as HTML elements, not a string of HTML, so MDX takes it as it
 * is, with no rehype-raw. No dependencies: it walks the markdown tree remark
 * hands it. Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT
 * licensed.
 *
 *   // astro.config.mjs
 *   import ascii from "ascii.rest/markdown/remark";
 *   export default defineConfig({ markdown: { remarkPlugins: [ascii] } });
 *
 *   <!-- then, once on the page -->
 *   <script type="module">import { start } from "ascii.rest/markdown"; start();</script>
 */
import { TONES, fence, type FenceOptions } from "./core.ts";
import { tones } from "./html.ts";
import { make } from "./index.ts";

/** A node of the markdown tree (mdast), as much of it as this reads and writes. */
interface Node {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: Node[];
  /** What remark-rehype makes of a node: the element's name, its properties and its children, as HTML nodes (hast). */
  data?: { hName: string; hProperties: Record<string, unknown>; hChildren: Html[] };
}

/** A node of the HTML tree (hast): a span of one tone, or text. */
type Html = { type: "text"; value: string } | { type: "element"; tagName: "span"; properties: { className: string[] }; children: [{ type: "text"; value: string }] };

export interface RemarkOptions {
  /** The fence's language that names a figure: "ascii", as in ```ascii headline. */
  lang?: string;
  /** Options every figure takes, under the fence's own: { width: 56 }. */
  defaults?: FenceOptions;
  /** A class on every figure's <pre>, besides ascii-md. */
  class?: string;
}

/**
 * The plugin: remarkPlugins: [ascii] or [[ascii, { defaults: { width: 56 } }]]. A fence that names no figure, or
 * gives one an option it doesn't take, fails the build with the kit's error and the fence's first line, so a typo
 * never ships as a broken figure. Only fences are drawn: the rest of the page is left as it is.
 */
export default function remarkAscii(o: RemarkOptions = {}) {
  const lang = o.lang ?? "ascii";
  // The figure as markup() writes it, <pre class="ascii-md" data-md ...> around its still's spans, as an element
  // remark-rehype builds from the node's data: what an Astro page, MDX and rehype-stringify all take as they are.
  const draw = (kind: string, source: string, options: FenceOptions, where: string): Node => {
    try {
      const all = { ...o.defaults, ...options };
      const p = make(kind, source, all);
      const json = Object.keys(all).length ? JSON.stringify(all) : "";
      return {
        type: "asciiFigure",
        data: {
          hName: "pre",
          hProperties: {
            className: ["ascii-md", ...(o.class ? o.class.split(/\s+/).filter(Boolean) : [])],
            role: "img",
            ariaLabel: p.says,
            style: `--cols: ${p.meta.cols}; --rows: ${p.meta.rows}`,
            dataMd: kind,
            dataMdSource: source,
            ...(json ? { dataMdOptions: json } : {}),
          },
          hChildren: tones(p).map(([value, tone]): Html =>
            tone ? { type: "element", tagName: "span", properties: { className: [`md-${TONES[tone] ?? "ink"}`] }, children: [{ type: "text", value }] } : { type: "text", value },
          ),
        },
      };
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}\n  in ${where}`, { cause: error });
    }
  };
  const walk = (node: Node) => {
    const list = node.children;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const child = list[i];
      if (child.type === "code" && child.lang === lang) {
        const info = `${lang} ${child.meta ?? ""}`;
        const { kind, options } = fence(info);
        list[i] = draw(kind, child.value ?? "", options, `\`\`\`${info.trim()}`);
        continue;
      }
      walk(child);
    }
  };
  return (tree: Node) => walk(tree);
}
