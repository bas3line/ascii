---
layout: ../../layouts/Docs.astro
title: react
description: Any piece with <Ascii>, any text with <Banner>. Both are client components, so they work in the Next.js app router as they are.
---

```sh
npm install ascii.rest
```

## Ascii

```tsx
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

<Ascii piece={donut} />                                 // bundled with your page
<Ascii piece="night-coast" />                           // or fetched by name when it mounts
<Ascii piece={donut} options={{ fps: 12 }} className="art" />
<Ascii piece="big-text" options={{ text: "hello" }} />  // a piece's own options
<Ascii piece="rust" mono />                             // a coloured piece in one ink
```

| prop | | |
| --- | --- | --- |
| `piece` | a piece module from `ascii.rest/pieces`, a banner from `banner()`, any module that follows [the piece contract](/docs/pieces/), or a piece's name to load when it mounts | required |
| `options` | the piece's option overrides, `fps` for its frame rate, and `motion: true` to play even for readers who prefer reduced motion | |
| `label` | what the picture shows, for screen readers | the piece's name |
| `mono` | draws a coloured piece as text in one ink | `false` |
| `className`, `style` | on the element it draws into | |

**Text pieces** draw into a `<pre>`, in its colour and font size: size them with CSS, `font-size: 12px`, and colour them with `color`. A `line-height` of 1.2 keeps their rows close, as the site has them.

**Coloured pieces**, the scenes, logos, companies and distros, draw onto a `<canvas>` as wide as its container, at the height their shape gives it. Give the canvas a width, `style={{ width: 320 }}`, to make it smaller.

A piece plays only while it is on screen and the tab is open, and holds its first frame for a reader who prefers reduced motion. Changing `options` restarts it; an inline object is fine, since only a real change counts.

## Banner

Any text in block letters, every option of [banner()](/docs/banners/) a prop:

```tsx
import { Banner } from "ascii.rest/react";

<Banner text="hello" />
<Banner text="hello" color={["#f97316", "#f778ba"]} shadow="rounded" effect="type" />
<Banner text="hello" font="slim" pixel={1} fill="#" color={{ light: "#1f2328", dark: "#f0f6fc" }} />
```

| prop | |
| --- | --- |
| `text` | the text; the font's characters are drawn and the rest left out |
| every option of `banner()` | `font`, `pixel`, `gap`, `shadow`, `fill`, `effect`, `speed`, `glint`, `type`, `color`, `shadowColor`, `pad`, `size`, `max`, `name`: see [banners](/docs/banners/#options) |
| `label` | what it says, for screen readers; the text by default |
| `mono`, `fps`, `className`, `style` | as on `<Ascii>` |

With no `color` it is text in the element's own colour. With one, a fade or one for each theme, it draws onto a canvas.

## A piece of your own

Anything that follows [the piece contract](/docs/pieces/) plays in `<Ascii>`:

```tsx
import { Ascii } from "ascii.rest/react";
import type { Piece } from "ascii.rest";

const blink: Piece = {
  meta: { name: "blink", category: "effects", note: "a cursor", cols: 2, rows: 1, fps: 4 },
  default: () => (t) => (Math.floor(t * 2) % 2 ? "  " : "█ "),
};

<Ascii piece={blink} />
```

Make the piece once, outside the component or in `useMemo`: a new piece every render starts it again.

## Server rendering

`<Ascii>` and `<Banner>` render an empty `<pre>` or `<canvas>` on the server and start in the browser. For a first frame in the HTML, render it yourself: a piece's frame is a string.

```tsx
import { donut } from "ascii.rest/pieces";

const first = donut.default()(0);   // the picture at 0 seconds, as text
```

[next.js](/docs/nextjs/) has the app router, and an SVG from a route handler.
