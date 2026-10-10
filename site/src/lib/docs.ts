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
    label: "make your own",
    pages: [
      { href: "/docs/kit/", title: "the kit" },
      { href: "/docs/kit-looks/", title: "looks" },
      { href: "/docs/kit-motion/", title: "motion" },
      { href: "/docs/kit-widgets/", title: "widgets" },
      { href: "/docs/kit-field/", title: "fields" },
      { href: "/docs/kit-draw/", title: "drawing" },
      { href: "/docs/kit-math/", title: "maths" },
      { href: "/docs/kit-shapes3d/", title: "3d scenes" },
      { href: "/docs/kit-particles/", title: "particles" },
      { href: "/docs/kit-fx/", title: "effects" },
      { href: "/docs/kit-compose/", title: "layouts" },
      { href: "/docs/kit-image/", title: "images" },
      { href: "/docs/kit-materials/", title: "materials" },
      { href: "/docs/kit-vector/", title: "svg drawings" },
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
