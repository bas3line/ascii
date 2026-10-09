---
layout: ../../layouts/Docs.astro
title: astro
description: Components that render a piece's first frame on the server, so the page is whole before any script runs.
---

```sh
npm install ascii.rest
```

## Ascii

```astro
---
import Ascii from "ascii.rest/astro";
---

<Ascii piece="donut" />
<Ascii piece="night-coast" fps={12} />
<Ascii piece="big-text" options={{ text: "hello" }} class="banner" />
<Ascii piece="rust" mono />
```

| prop | | |
| --- | --- | --- |
| `piece` | a piece's name | required |
| `options` | the piece's option overrides | |
| `fps` | its frame rate, instead of its own | |
| `label` | what the picture shows, for screen readers | the piece's name |
| `mono` | draws a coloured piece as text in one ink | `false` |
| `class` | on the `<ascii-art>` element it renders | |

A text piece's first frame is rendered on the server into the page, so it shows before any script runs and without script at all. A coloured piece keeps its space, on its own ground if it has one, until its canvas paints. Once the page loads, the component's script plays it.

## Banner

```astro
---
import Banner from "ascii.rest/astro/banner";
---

<Banner text="hello" />
<Banner text="hello" shadow="rounded" effect="type" class="hero" />
<Banner text="hello" color={["#f97316", "#f778ba"]} />
```

Every option of [banner()](/docs/banners/#options) is a prop, with `text`, `label`, `mono` and `class` as above. Its resting frame is rendered on the server: every letter typed, or the glint out of sight.

## Styling

The components render `<ascii-art>` and `<ascii-banner>`, which hold a `<pre>` or a `<canvas>`. The defaults are set with `:where()`, so any rule of yours wins:

```css
ascii-art pre,
ascii-banner pre {
  font-size: 12px;
  color: var(--accent);
}
```
