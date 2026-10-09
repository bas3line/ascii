---
layout: ../../layouts/Docs.astro
title: introduction
description: Animated ascii art for web pages, READMEs and terminals. 216 pieces, a banner for any text, and an SVG writer, in TypeScript with no dependencies.
---

<div class="demo"><ascii-banner text="ascii.rest" color="#f97316,#f778ba" shadow="rounded"></ascii-banner></div>

ascii.rest is a library of animated ascii art: scenes, loaders, charts, type, logos, distros, shapes, physics and more, 216 pieces in all, each a small TypeScript module with no dependencies. On top of the pieces it draws any text as a banner and turns any piece into an animated SVG, so the same art plays on a page, in a GitHub README and in a terminal.

Use it the way your project wants it:

| way | for | start here |
| --- | --- | --- |
| npm | React, Next.js, Astro, any bundler | [install](/docs/install/) |
| one tag | a plain HTML page, no build | [html](/docs/html/) |
| your own copy | the source in your project, to change as you like, via shadcn or the CLI | [your own copy](/docs/copy/) |
| an SVG | a README, an email, an `<img>`, anywhere without script | [svg](/docs/svg/), [github readme](/docs/readme/) |
| a terminal | a CLI's splash screen or banner | [terminal](/docs/terminal/) |

## In a minute

On any page, one tag loads it from ascii.rest:

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>

<ascii-art piece="donut"></ascii-art>
<ascii-banner text="hello" color="#f97316"></ascii-banner>
```

In React or Next.js:

```sh
npm install ascii.rest
```

```tsx
import { Ascii, Banner } from "ascii.rest/react";

export default function Page() {
  return (
    <>
      <Ascii piece="night-coast" />
      <Banner text="hello" color={["#f97316", "#f778ba"]} effect="type" />
    </>
  );
}
```

In a terminal, with nothing installed:

```sh
npx ascii.rest donut
npx ascii.rest banner 'my cli' --color ff6a00
```

## Where to look

- **Every piece**, playing, with the code to use it: [ascii.rest](/#pieces). Each piece's page has its snippet for every way above.
- **A framework**: [react](/docs/react/), [next.js](/docs/nextjs/), [astro](/docs/astro/), [html](/docs/html/), [typescript](/docs/typescript/).
- **Banners**: any text in block letters, with every part of it an option: [banners](/docs/banners/), or make one by clicking at [ascii.rest/banner](/banner/).
- **SVGs and READMEs**: [svg](/docs/svg/) for your own code, [github readme](/docs/readme/) for the hosted URLs.
- **Your own art**: the piece contract, to write pieces of your own: [your own pieces](/docs/pieces/).
- **Everything exported**, by module: [api](/docs/api/). Every command and flag: [cli](/docs/cli/).

Every piece plays only while it is on screen and the tab is open, and holds its first frame for anyone who prefers reduced motion. It is MIT licensed: use it, change it, ship it.
