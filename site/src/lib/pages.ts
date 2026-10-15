/*
 * The tools' titles and descriptions, said once for the page's head and for its
 * share card (pages/og/pages/[page].png.ts), so the two never drift apart.
 */
export const PAGES = {
  make: {
    title: "image to ascii",
    description:
      "Turn any image, SVG, PNG, JPG, WebP or GIF, into an animated ascii logo in your browser: a piece for the library, an embed for any page, and SVGs for a README.",
    path: "/make/",
  },
  banner: {
    title: "readme banners",
    description:
      "Your name or your project's in animated ascii block letters, with any font, shadow, colour, tagline and logo, for a GitHub README, a web page or a terminal.",
    path: "/banner/",
  },
} as const;

export type PageName = keyof typeof PAGES;

/** A tool page's share card, for its `<Layout card>`. */
export const pageCardOf = (page: PageName) => ({
  path: `/og/pages/${page}.png`,
  alt: `${PAGES[page].title}, ascii.rest: ${PAGES[page].description}`,
});
