/*
 * cdn.ascii.rest: the files the docs show, the demo videos and their posters, served from the R2 bucket
 * ascii-rest-cdn. GET and HEAD only. A Range request gets 206 and just those bytes, so a video starts at once and
 * seeks; If-None-Match gets 304. Files keep a day in caches and revalidate by their ETag, so a file uploaded again
 * under its own name shows within a day.
 *
 * Deploy: npx wrangler deploy, from this folder. Upload: npx wrangler r2 object put
 * ascii-rest-cdn/videos/<name>.mp4 --file <file> --content-type video/mp4 --remote
 */

interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

interface R2Object {
  size: number;
  httpEtag: string;
  range?: R2Range;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

interface Env {
  FILES: {
    get(key: string, options?: { range?: Headers; onlyIf?: Headers }): Promise<R2Object | R2ObjectBody | null>;
    head(key: string): Promise<R2Object | null>;
  };
}

const COMMON = {
  "Access-Control-Allow-Origin": "*",
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=86400",
  "X-Content-Type-Options": "nosniff",
};

const text = (status: number, message: string) => new Response(`${message}\n`, { status, headers: { ...COMMON, "Content-Type": "text/plain; charset=utf-8" } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") return text(405, "cdn.ascii.rest serves files: GET and HEAD only");
    let key: string;
    try {
      key = decodeURIComponent(new URL(request.url).pathname.slice(1));
    } catch {
      return text(400, "that is not a valid path");
    }
    if (!key) return text(200, "cdn.ascii.rest: the videos and files the ascii.rest docs show. The docs: https://ascii.rest/docs/");

    // The Range and If-None-Match headers go straight to R2, which reads them.
    const object = request.method === "HEAD" ? await env.FILES.head(key) : await env.FILES.get(key, { range: request.headers, onlyIf: request.headers });
    if (!object) return text(404, `no file at /${key}`);

    const headers = new Headers(COMMON);
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    // A precondition met by the cached copy: no body to send.
    if (request.method === "GET" && !("body" in object)) return new Response(null, { status: 304, headers });
    const body = "body" in object ? object.body : null;

    const range = object.range;
    if (request.method === "GET" && range && request.headers.has("Range")) {
      const start = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0);
      const length = range.suffix !== undefined ? range.suffix : (range.length ?? object.size - start);
      headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${object.size}`);
      headers.set("Content-Length", String(length));
      return new Response(body, { status: 206, headers });
    }
    headers.set("Content-Length", String(object.size));
    return new Response(body, { status: 200, headers });
  },
};
