/*
 * The Worker in front of ascii.rest's built files. It draws the README
 * banners, /banner/<text>.svg and /banner/<text>.dark.svg, with the choices in
 * the query that lib/banner.ts reads: color, effect, speed, font, shadow, fill,
 * tagline, art, place, size and bg. Art is a logo's own README SVG, read from
 * the built files, so no logo is drawn again here. It keeps
 * each banner it draws in the edge cache. Every other request goes on to the
 * built site, the page at /banner/ among them; wrangler.jsonc sends it only
 * what is under /banner/.
 */
import { CHARS, MAX, artDark, banner, bannerPath, clean, read } from "./lib/banner";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface Context {
  waitUntil(promise: Promise<unknown>): void;
}

// The edge cache of the data centre the request came to.
const edge = () => (caches as unknown as { default: Cache }).default;

const HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // A day, as the README SVGs keep. GitHub's image proxy asks again after that.
  "Cache-Control": "public, max-age=86400",
  "Access-Control-Allow-Origin": "*",
  "X-Content-Type-Options": "nosniff",
  // Opened on its own, the SVG runs nothing and loads nothing.
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
};

const refuse = (status: number, message: string) =>
  new Response(`${message}\n`, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });

async function draw(request: Request, url: URL, name: string, env: Env, ctx: Context): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return refuse(405, "a banner is only for GET");
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

  // One key for each banner, whatever else the URL carries or however it orders its query.
  const key = new Request(new URL(bannerPath(words, dark, look), url).href);
  const kept = await edge().match(key);
  if (kept) return request.method === "HEAD" ? new Response(null, kept) : kept;

  let art: string | null = null;
  if (look.art) {
    const found = await env.ASSETS.fetch(new Request(new URL(`/svg/${look.art}${artDark(look, dark) ? ".dark" : ""}.svg`, url)));
    if (!found.ok) return refuse(400, `there is no logo, company or distro called "${look.art}"; https://ascii.rest/banner/ lists them`);
    art = await found.text();
  }
  const response = new Response(banner(words, { dark, look, art })!.svg, { headers: HEADERS });
  ctx.waitUntil(edge().put(key, response.clone()));
  return request.method === "HEAD" ? new Response(null, response) : response;
}

export default {
  async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
    const url = new URL(request.url);
    const name = /^\/banner\/(.+)\.svg$/.exec(url.pathname)?.[1];
    return name ? draw(request, url, name, env, ctx) : env.ASSETS.fetch(request);
  },
};
