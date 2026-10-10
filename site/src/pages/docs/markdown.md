---
layout: ../../layouts/Docs.astro
title: markdown components
description: Components you write in an ascii fence in markdown, drawn in text. Each one builds in as you scroll to it, and prints as the same text for a README.
---

A **markdown component** is a fenced block whose language is `ascii`, with the component's name after it. It is drawn in text: a page shows it in colour and builds it in as you scroll to it, and a README shows the same drawing as plain text. Each component is an ascii.rest piece, so it plays wherever a piece plays: a page, React, MDX, an SVG in a README and a terminal.

```ascii headline
ascii.rest "animated ascii art for web pages"
```

That headline is this fence:

````md
```ascii headline
ascii.rest "animated ascii art for web pages"
```
````

Its plain text, for a README:

```text
 ██╗  ███╗ ███╗█╗█╗  ███╗ ████╗ ███╗█████╗
█╔═█╗█╔══╝█╔══╝█║█║  █╔═█╗█╔══╝█╔══╝╚═█╔═╝
████║╚██╗ █║   █║█║  ███╔╝███╗ ╚██╗   █║
█╔═█║ ╚═█╗█║   █║█║  █╔█║ █╔═╝  ╚═█╗  █║
█║ █║███╔╝╚███╗█║█║█╗█║╚█╗████╗███╔╝  █║
╚╝ ╚╝╚══╝  ╚══╝╚╝╚╝╚╝╚╝ ╚╝╚═══╝╚══╝   ╚╝

animated ascii art for web pages
```

## The components

There are 25, in seven groups, each with a page:

- [lettering](/docs/markdown-lettering/): [headline](/docs/markdown-lettering/#headline), words in block letters; [typing](/docs/markdown-lettering/#typing), a line that types itself and keeps changing its word; [flap](/docs/markdown-lettering/#flap), a split-flap sign; [marquee](/docs/markdown-lettering/#marquee), a ticker.
- [ornaments](/docs/markdown-ornaments/): [divider](/docs/markdown-ornaments/#divider), a rule that moves; [confetti](/docs/markdown-ornaments/#confetti), a burst over a message; [solid](/docs/markdown-ornaments/#solid), a 3D shape turning; [say](/docs/markdown-ornaments/#say), a creature with a balloon; [orbit](/docs/markdown-ornaments/#orbit), the rings of things round a hub.
- [machines](/docs/markdown-machines/): [sequence](/docs/markdown-machines/#sequence), who says what to whom in a protocol; [git](/docs/markdown-machines/#git), a history as `git log --graph` prints it; [railroad](/docs/markdown-machines/#railroad), a command's syntax; [logic](/docs/markdown-machines/#logic), a rule as logic gates.
- [inside a system](/docs/markdown-internals/): [flame](/docs/markdown-internals/#flame), a flame graph; [bits](/docs/markdown-internals/#bits), a binary layout; [pinout](/docs/markdown-internals/#pinout), a chip's pins; [schema](/docs/markdown-internals/#schema), an ER diagram.
- [tokens](/docs/markdown-tokens/): [qr](/docs/markdown-tokens/#qr), a QR code; [sigil](/docs/markdown-tokens/#sigil), a text's fingerprint; [stamp](/docs/markdown-tokens/#stamp), a rubber stamp; [ticket](/docs/markdown-tokens/#ticket), a pass.
- [games](/docs/markdown-games/): [chess](/docs/markdown-games/#chess), a position and its moves; [bracket](/docs/markdown-games/#bracket), a knockout; [sprite](/docs/markdown-games/#sprite), pixel art that walks.
- [places](/docs/markdown-places/): [world](/docs/markdown-places/#world), a map with pins and routes.

They are made with ascii.rest's own art and [kit](/docs/kit/): headline, stamp and ticket in [banner](/docs/banners/) letters, solid on the kit's 3D renderer, confetti with its particles, world on the earth piece's map, and every seeded one, confetti, sigil, the stamp's wear, the ticket's bars and git's hashes, on its `fnv1a32()` and `mulberry32()`, so a component draws the same on a page, in an SVG and as text.

## Write a fence

The fence's first line is `ascii`, the component's name, then its options as `key=value`, the way an HTML tag takes attributes. A value with spaces goes in quotes, and a word on its own is `true`:

````md
```ascii headline font=slim align=center title="release notes" frame=rounded
v0.5 "markdown components"
```
````

The lines inside are the component's body, one statement a line. Most read a line the same way: a bare word is a name, such as an actor, a branch, a pin or a place; words in quotes are shown as they are written, such as a message or a caption; `key=value` is an attribute, written the way an option is; and a blank line starts the next block, such as a sprite's next frame.

A component that draws something with a notation of its own reads that notation instead: a flame graph reads a profiler's folded stacks, a chess board reads FEN. Each component's section says what it takes. A mistake stops the build with a message that names the line and says what to change:

```text
ascii.rest: headline's big line is one line, and line 2 has words too: "more words"
```

## Options every component takes

| option | what it does | default |
| --- | --- | --- |
| `title` | Words on the top edge of the frame. `false` for none. | the component's own, or none |
| `frame` | `rounded`, `single`, `heavy`, `double`, `ascii` (only `+ - \|`, for any place) or `none`. | `rounded`, or `none` for a component drawn without one, such as headline |
| `width` | Columns, the frame included, 16 to 160. | the component's own |
| `color` | The accent: `#rrggbb`, or a palette's name such as `ocean`. | ascii.rest's orange |
| `play` | `once`: builds in when first seen, then keeps moving while in view or holds. `loop`: builds, holds, and again. `still`: never moves. | `once` |
| `speed` | `slow`, `normal`, `fast`, or a number of times as fast. | `normal` |

A reader whose system asks for reduced motion gets each component's finished drawing at once, and nothing moves. The site's `[play anyway]` button plays them again, and `[hold still]` stops them.

## Draw them on a site

The remark plugin, `ascii.rest/markdown/remark`, draws every `ascii` fence in your markdown and MDX as its component, with its finished drawing in the HTML before any script runs. This site uses it in its Astro config, through Astro's remark processor:

```js
// astro.config.mjs
import { unified } from "@astrojs/markdown-remark";
import ascii from "ascii.rest/markdown/remark";
import { defineConfig } from "astro/config";

export default defineConfig({
  markdown: { processor: unified({ remarkPlugins: [ascii] }) },
});
```

Then one script on the page plays each component as it is scrolled to:

```html
<script type="module">
  import { start } from "ascii.rest/markdown";
  start();
</script>
```

## In React and Next.js

A React component for each one, a client component that renders the finished drawing on the server:

```tsx
// hero.tsx
import { Headline } from "ascii.rest/markdown/react";

export function Hero() {
  return <Headline font="slim">{`ascii.rest "animated ascii art for web pages"`}</Headline>;
}
```

The body goes in as a string in braces, so its lines stay lines. `<Markdown kind="headline">` takes any component by its name. Every option is a prop. The page's own props, `id`, `tabIndex`, `role`, `data-*`, `aria-*` and event handlers, go on the `<pre>`, as `className` and `style` do.

## On a plain page

Importing `ascii.rest/markdown/element` defines one tag, `<ascii-markdown>`, whose text is the body and whose attributes are the options:

```ts
// page.ts
import "ascii.rest/markdown/element";
```

```html
<ascii-markdown kind="headline" font="slim">
  ascii.rest "animated ascii art for web pages"
</ascii-markdown>
```

## In TypeScript

Each component is a function that takes the body, or the same thing as data, and its options, and returns a piece:

```ts
// top.ts
import { headline } from "ascii.rest/markdown";

export default headline({ words: "ascii.rest", line: "animated ascii art for web pages" });
```

Its plain text:

```text
 ██╗  ███╗ ███╗█╗█╗  ███╗ ████╗ ███╗█████╗
█╔═█╗█╔══╝█╔══╝█║█║  █╔═█╗█╔══╝█╔══╝╚═█╔═╝
████║╚██╗ █║   █║█║  ███╔╝███╗ ╚██╗   █║
█╔═█║ ╚═█╗█║   █║█║  █╔█║ █╔═╝  ╚═█╗  █║
█║ █║███╔╝╚███╗█║█║█╗█║╚█╗████╗███╔╝  █║
╚╝ ╚╝╚══╝  ╚══╝╚╝╚╝╚╝╚╝ ╚╝╚═══╝╚══╝   ╚╝

animated ascii art for web pages
```

`plain(piece)` gives that text, `fromFence("ascii headline", body)` makes the piece a fence describes, and `render(markdown)` draws every `ascii` fence in a document as text.

## In a README

GitHub shows a fenced block as it is, so a README takes the component's plain text. Write your README with `ascii` fences in a file of its own, and draw them into the README:

```sh
npx ascii.rest md README.src.md --out README.md
```

Each fence becomes a plain fenced block holding the component's text, its fence longer than any run of backticks inside it. A fence shown inside another fence, as this page shows one inside a `md` block, stays as it is. With `--svg <dir>`, each component is an animated SVG instead, one for a light page and one for a dark page, in a `<picture>`:

```sh
npx ascii.rest md README.src.md --svg .github/ascii --out README.md
```

`--ascii` draws the frames with `+ - |` for a place without box drawing (a QR code needs its blocks, so a `qr` fence stops it and asks for `--svg`), and `--play` plays each component in your terminal, a key for the next.

## Copy them into your project

```sh
npx ascii.rest add markdown
```

That copies the components' TypeScript into `components/ascii/markdown`, with the kit and the banner they are drawn with. `npx ascii.rest add markdown-react` adds the React components.
