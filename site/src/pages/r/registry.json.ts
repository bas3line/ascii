/*
 * /r/registry.json: the registry's index, every item and the files it brings (lib/registry.ts).
 */
import type { APIRoute } from "astro";
import { index } from "../../lib/registry";

export const GET: APIRoute = () => new Response(JSON.stringify(index, null, 2), { headers: { "Content-Type": "application/json" } });
