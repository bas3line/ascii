/*
 * /og/pages/<page>.png: the share card of a tool page, /make/ or /banner/, its
 * title and description (lib/pages.ts), drawn at build time (see lib/og.ts).
 * Its own folder, so a page's name can never land on a piece's card at /og/<slug>.png.
 */
import type { APIRoute } from "astro";
import { pageCard } from "../../../lib/og";
import { PAGES, type PageName } from "../../../lib/pages";

export function getStaticPaths() {
  return (Object.keys(PAGES) as PageName[]).map((page) => ({ params: { page }, props: PAGES[page] }));
}

type Props = { title: string; description: string; path: string };

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(await pageCard(props.title, props.description, props.path), { headers: { "Content-Type": "image/png" } });
