import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vercel from "@astrojs/vercel";
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
  // function draws on request. vercel.json holds the redirects and the headers.
  adapter: vercel(),
  integrations: [library],
  // The docs' code is plain, in the site's one face and ink, like the rest of its code.
  markdown: { syntaxHighlight: false },
  vite: {
    // The library lives one folder up, beside the site.
    server: { fs: { allow: [".."] } },
  },
});
