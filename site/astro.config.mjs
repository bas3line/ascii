import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import vercel from "@astrojs/vercel";
import ascii from "ascii.rest/markdown/remark";
import { defineConfig } from "astro/config";

// The compiled library (../dist) is served from the site's root as well, so a
// page anywhere can import https://ascii.rest/mount.js or use /ascii.js.
const library = {
  name: "library",
  hooks: {
    "astro:build:done": ({ dir }) => {
      cpSync(fileURLToPath(new URL("../dist", import.meta.url)), fileURLToPath(dir), {
        recursive: true,
        filter: (src) => !src.endsWith(".d.ts"),
      });
    },
  },
};

export default defineConfig({
  site: "https://ascii.rest",
  // Vercel serves the site: every page is built ahead, but for the README banners (pages/banner/[file].ts), which a
  // function draws on request. vercel.json holds the redirects and the headers. Skew protection: a page still open from
  // an older deploy keeps getting that deploy's files and banners, for as long as the project's setting holds them.
  adapter: vercel({ skewProtection: true }),
  integrations: [library],
  markdown: {
    // The docs' code is plain, in the site's one face and ink, like the rest of its code.
    syntaxHighlight: false,
    // An ```ascii fence in the docs is drawn as its figure by the library's own remark plugin, ascii.rest/markdown/remark,
    // as a reader's site draws one; the library is built before Astro loads this. Astro 7's own Markdown processor runs
    // no remark plugins, so the docs go through remark, @astrojs/markdown-remark's unified().
    processor: unified({ remarkPlugins: [ascii] }),
  },
  // Astro 7 strips the whitespace between tags the way JSX does; the pages are written for HTML's, which keeps a space.
  compressHTML: true,
  vite: {
    // The library lives one folder up, beside the site.
    server: { fs: { allow: [".."] } },
  },
});
