/*
 * The Worker in front of ascii.rest's built files. It draws the README
 * banners, /banner/<text>.svg and /banner/<text>.dark.svg with ?color=rrggbb
 * for the letters, and keeps each one it draws in the edge cache. Every other
 * request goes on to the built site, the page at /banner/ among them;
 * wrangler.jsonc sends it only what is under /banner/.
 */
import { CHARS, MAX, banner, bannerPath, clean, hex } from "./lib/banner";

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

async function draw(request: Request, url: URL, name: string, ctx: Context): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return refuse(405, "a banner is only for GET");
  let text: string;
  try {
    text = decodeURIComponent(name);
  } catch {
    return refuse(400, "the banner's text is not a valid URL path");
  }
  const dark = text.endsWith(".dark");
  if (dark) text = text.slice(0, -".dark".length);
  const words = clean(text);
  if (!words) return refuse(404, `nothing to draw: a banner's text takes ${CHARS}`);
  if (words.length > MAX) return refuse(400, `a banner takes up to ${MAX} characters, and this one has ${words.length}`);
  const asked = url.searchParams.get("color");
  const color = hex(asked);
  if (asked !== null && !color) return refuse(400, "color takes six hex digits, like ?color=ff6a00");

  // One key for each banner, whatever else the URL carries.
  const key = new Request(new URL(bannerPath(words, dark, color), url).href);
  const kept = await edge().match(key);
  if (kept) return request.method === "HEAD" ? new Response(null, kept) : kept;
  const response = new Response(banner(words, { dark, color })!.svg, { headers: HEADERS });
  ctx.waitUntil(edge().put(key, response.clone()));
  return request.method === "HEAD" ? new Response(null, response) : response;
}

export default {
  async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
    const url = new URL(request.url);
    const name = /^\/banner\/(.+)\.svg$/.exec(url.pathname)?.[1];
    return name ? draw(request, url, name, ctx) : env.ASSETS.fetch(request);
  },
};
