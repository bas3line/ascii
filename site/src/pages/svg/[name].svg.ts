/*
 * /svg/<slug>.svg and /svg/<slug>.dark.svg: each logo, company and distro as an
 * animated SVG for light and dark pages, drawn at build time (see lib/svg.ts).
 */
import type { APIRoute } from "astro";
import type { PieceName } from "ascii.rest";
import { looping, svg } from "../../lib/svg";
import { pieces } from "../../lib/library";

export function getStaticPaths() {
  return pieces
    .filter((piece) => looping(piece.category, piece.options))
    .flatMap((piece) => [
      { params: { name: piece.slug }, props: { slug: piece.slug, dark: false } },
      { params: { name: `${piece.slug}.dark` }, props: { slug: piece.slug, dark: true } },
    ]);
}

export const GET: APIRoute<{ slug: string; dark: boolean }> = async ({ props }) =>
  new Response(await svg(props.slug as PieceName, props.dark), { headers: { "Content-Type": "image/svg+xml" } });
