/*
 * /og/<slug>.png: each piece's share card, drawn at build time (see lib/og.ts).
 */
import type { APIRoute } from "astro";
import type { PieceName } from "ascii.rest";
import { card } from "../../lib/og";
import { pieces, type Piece } from "../../lib/library";

export function getStaticPaths() {
  return pieces.map((piece) => ({ params: { slug: piece.slug }, props: { piece } }));
}

export const GET: APIRoute<{ piece: Piece }> = async ({ props }) =>
  new Response(await card(props.piece.slug as PieceName, props.piece.name), { headers: { "Content-Type": "image/png" } });
