/*
 * /sitemap.xml: the home page, the author page, the logo maker and every
 * piece's page, for search engines. robots.txt points to it.
 */
import type { APIRoute } from "astro";
import { SITE, pieces } from "../lib/library";

export const GET: APIRoute = () => {
  const paths = ["/", "/author/", "/make/", ...pieces.map((piece) => `/${piece.slug}/`)];
  const urls = paths.map((path) => `  <url><loc>${new URL(path, SITE)}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml" },
  });
};
