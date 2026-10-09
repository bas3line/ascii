---
layout: ../../layouts/Docs.astro
title: html
description: Two tags, <ascii-art> for any piece and <ascii-banner> for any text, from one script and no build step.
---

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>

<ascii-art piece="donut"></ascii-art>
<ascii-banner text="hello"></ascii-banner>
```

The script defines both tags and loads each piece from ascii.rest when a page first uses it. In a bundled app, `import "ascii.rest/element"` defines the same tags from npm.

## ascii-art

<div class="demo"><ascii-art piece="spinners"></ascii-art></div>

| attribute | |
| --- | --- |
| `piece` | a piece's name: `donut`, `night-coast`, `rust` |
| `src` | or the URL of any module that follows [the piece contract](/docs/pieces/): your own |
| `options` | JSON overriding the piece's options: `options='{"text":"hello"}'` |
| `fps` | its frame rate, instead of its own |
| `label` | what the picture shows, for screen readers; the piece's name otherwise |
| `mono` | draws a coloured piece as text in one ink |

Change an attribute and the piece starts again with it. Whatever the tag holds before its piece loads, a first frame rendered on your server say, stays until the piece is ready.

## ascii-banner

<div class="demo"><ascii-banner text="html" shadow="rounded" color="#22d3ee,#4493f8" effect="type"></ascii-banner></div>

```html
<ascii-banner text="html" shadow="rounded" color="#22d3ee,#4493f8" effect="type"></ascii-banner>
```

| attribute | |
| --- | --- |
| `text` | the text |
| `font`, `shadow`, `fill`, `effect` | as [banner()](/docs/banners/#options) takes them: `font="slim"`, `shadow="heavy"`, `fill="#"`, `effect="still"` |
| `speed`, `pixel`, `gap` | numbers: `speed="2"`, `pixel="1"` |
| `color` | a colour, or several for a fade, comma separated: `color="#f97316,#f778ba"` |
| `shadow-color` | the shadow's colour |
| `options` | JSON for any other option, `glint`, `pad`, or `color` for each theme: `options='{"pad":1}'` |
| `label`, `mono` | as on `<ascii-art>` |

## Styling

Text pieces draw into a `<pre>` in the tag's colour and font size; coloured ones onto a `<canvas>` as wide as the tag. The tags' own defaults use `:where()`, so any rule of yours wins:

```css
ascii-art,
ascii-banner {
  font-size: 10px;
  color: teal;
}

ascii-art canvas {
  max-width: 480px;
}
```

Where the system's monospace face lacks the box drawing and block characters, as Android's does, they come from a 3 KB font on ascii.rest, fetched only when a page needs it, so every row keeps its width.

## Pin a version

`https://ascii.rest/ascii.js` is always the latest build. To pin one, load the package's own file through a CDN, at a version, and add its `integrity` hash, which the CDN shows for each file:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/ascii.rest@0.3.0/dist/ascii.js"
  integrity="sha384-…"
  crossorigin="anonymous"
></script>
```

The pieces it loads come from the same version.

## Your own piece

```html
<ascii-art src="/art/blink.js"></ascii-art>
```

`src` takes the URL of an ES module that exports `meta` and a default function, as every piece does: [your own pieces](/docs/pieces/).
