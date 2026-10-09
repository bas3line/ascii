/*
 * /og.png: the site's share card, drawn at build time (see lib/og.ts) with the
 * number of pieces the library has, so it never goes stale.
 */
import type { APIRoute } from "astro";
import { siteCard } from "../lib/og";
import { pieces } from "../lib/library";

export const GET: APIRoute = async () => new Response(await siteCard(pieces.length), { headers: { "Content-Type": "image/png" } });
