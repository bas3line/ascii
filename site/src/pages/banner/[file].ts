/*
 * The README banners, /banner/<text>.svg and /banner/<text>.dark.svg, drawn on
 * request by a Vercel function: the one route of the site that isn't built
 * ahead. The choices are in the query that lib/banner.ts reads: color, effect,
 * speed, font, shadow, fill, tagline, art, place, size and bg. The art is the
 * logo's README SVG, drawn here by lib/svg.ts as the build draws it. Vercel's
 * CDN keeps each banner a day, a cache each deploy starts afresh; the page at
 * /banner/ is built ahead like the rest.
 */
import type { APIRoute } from "astro";
import { isPiece } from "ascii.rest";
import { CHARS, MAX, artDark, banner, clean, read } from "../../lib/banner";
import { svg } from "../../lib/svg";

export const prerender = false;

const HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // A day, as the README SVGs keep, for browsers and for GitHub's image proxy, which asks again after that.
  "Cache-Control": "public, max-age=86400",
  // And a day in Vercel's CDN, which every deploy starts afresh, so a fix to how banners are drawn shows at once.
  "Vercel-CDN-Cache-Control": "public, max-age=86400",
  "Access-Control-Allow-Origin": "*",
  "X-Content-Type-Options": "nosniff",
  // Opened on its own, the SVG runs nothing and loads nothing.
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
};

const refuse = (status: number, message: string) =>
  new Response(`${message}\n`, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });

async function draw(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const name = /^\/banner\/([^/]+)\.svg$/.exec(url.pathname)?.[1];
  if (!name) return refuse(404, "a banner is at /banner/<text>.svg, or /banner/<text>.dark.svg for a dark page");
  // The theme is read off the path as it came, before decoding: a text ending in ".dark" has that dot as %2E there.
  const dark = name.endsWith(".dark");
  let text: string;
  try {
    text = decodeURIComponent(dark ? name.slice(0, -".dark".length) : name);
  } catch {
    return refuse(400, "the banner's text is not a valid URL path");
  }
  const look = read(url.searchParams);
  if (typeof look === "string") return refuse(400, look);
  const words = clean(text, look.font);
  if (!words) return refuse(404, `nothing to draw: a banner's text takes ${CHARS}`);
  if (words.length > MAX) return refuse(400, `a banner takes up to ${MAX} characters, and this one has ${words.length}`);

  let art: string | null = null;
  if (look.art) {
    const missing = `there is no logo, company or distro called "${look.art}"; https://ascii.rest/banner/ lists them`;
    if (!isPiece(look.art)) return refuse(400, missing);
    try {
      art = await svg(look.art, artDark(look, dark));
    } catch {
      // a piece, but not one with a README SVG: not a logo, company or distro
      return refuse(400, missing);
    }
  }
  return new Response(banner(words, { dark, look, art })!.svg, { headers: HEADERS });
}

export const GET: APIRoute = ({ request }) => draw(request);

export const HEAD: APIRoute = async ({ request }) => {
  const response = await draw(request);
  return new Response(null, { status: response.status, headers: response.headers });
};

export const ALL: APIRoute = () => refuse(405, "a banner is only for GET");
