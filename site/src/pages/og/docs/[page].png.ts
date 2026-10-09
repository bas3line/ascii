/*
 * /og/docs/<page>.png: each docs page's share card, its title and description,
 * drawn at build time (see lib/og.ts). The introduction, /docs/, is index.
 */
import type { APIRoute } from "astro";
import { pageCard } from "../../../lib/og";

type Page = { frontmatter: { title: string; description: string } };

export function getStaticPaths() {
  const files = import.meta.glob<Page>("../../docs/*.md", { eager: true });
  return Object.entries(files).map(([file, { frontmatter }]) => {
    const page = file.slice("../../docs/".length, -".md".length);
    return { params: { page }, props: { ...frontmatter, path: page === "index" ? "/docs/" : `/docs/${page}/` } };
  });
}

type Props = { title: string; description: string; path: string };

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(await pageCard(props.title, props.description, props.path), { headers: { "Content-Type": "image/png" } });
