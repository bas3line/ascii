/*
 * The docs' index, in reading order: the sidebar of every docs page, its
 * previous and next links, the sitemap and llms.txt all come from here. Each
 * page is a Markdown file in pages/docs/ laid out by layouts/Docs.astro.
 */
export const DOCS = [
  {
    label: "start",
    pages: [
      { href: "/docs/", title: "introduction" },
      { href: "/docs/quickstart/", title: "quick start" },
      { href: "/docs/install/", title: "install" },
      { href: "/docs/examples/", title: "examples" },
    ],
  },
  {
    label: "use it in",
    pages: [
      { href: "/docs/react/", title: "react" },
      { href: "/docs/nextjs/", title: "next.js" },
      { href: "/docs/astro/", title: "astro" },
      { href: "/docs/html/", title: "html" },
      { href: "/docs/typescript/", title: "typescript" },
      { href: "/docs/copy/", title: "your own copy" },
    ],
  },
  {
    label: "make",
    pages: [
      { href: "/docs/banners/", title: "banners" },
      { href: "/docs/images/", title: "image to ascii" },
      { href: "/docs/svg/", title: "svg" },
      { href: "/docs/readme/", title: "github readme" },
      { href: "/docs/terminal/", title: "terminal" },
      { href: "/docs/pieces/", title: "your own pieces" },
    ],
  },
  {
    label: "reference",
    pages: [
      { href: "/docs/api/", title: "api" },
      { href: "/docs/cli/", title: "cli" },
      { href: "/docs/faq/", title: "questions" },
    ],
  },
] as const;

/** Every docs page, in order. */
export const pages = DOCS.flatMap((section) => section.pages);
