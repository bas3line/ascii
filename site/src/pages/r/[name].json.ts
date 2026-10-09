/*
 * /r/<name>.json: each registry item, its files' TypeScript in it (lib/registry.ts), and /r/all.json for everything.
 */
import type { APIRoute } from "astro";
import { all, items, type Item } from "../../lib/registry";

export function getStaticPaths() {
  return [...items, all].map((item) => ({ params: { name: item.name }, props: { item } }));
}

export const GET: APIRoute<{ item: Item }> = ({ props }) =>
  new Response(JSON.stringify(props.item, null, 2), { headers: { "Content-Type": "application/json" } });
