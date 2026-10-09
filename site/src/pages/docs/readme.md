---
layout: ../../layouts/Docs.astro
title: github readme
description: URLs on ascii.rest that are animated SVGs, for a README, which runs no script. Every logo, company and distro, and a banner for any text.
---

A README runs no script, so ascii.rest serves its art as animated SVGs, one for GitHub's light theme and one for its dark theme. A `<picture>` shows the right one:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/svg/rust.dark.svg">
  <img alt="rust" src="https://ascii.rest/svg/rust.svg" width="320">
</picture>
```

GitHub fetches it through its own image proxy and caches it. For anyone who prefers reduced motion, it holds still.

## Logos

`https://ascii.rest/svg/<name>.svg`, and `<name>.dark.svg`, for every logo, company and distro, one loop of its own glint or scan. Each piece's page has its snippet under `readme`, and its `[copy readme snippet]` button.

## Banners

<div class="demo"><img src="/banner/your%20name.svg?color=f97316,f778ba&tagline=and%20a%20line%20about%20you" alt="YOUR NAME in block letters with a tagline"></div>

`https://ascii.rest/banner/<text>.svg`, and `<text>.dark.svg`: any text, up to 20 characters, in block letters. Letters, digits, spaces and `. , ! ? ' : - + = / _` are drawn, in capitals; anything else is left out. The query carries the rest:

| key | values | default |
| --- | --- | --- |
| `color` | `f97316`; up to eight, comma separated, for a fade: `f97316,f778ba`; or `art`, the art's own colour | GitHub's text colour |
| `effect` | `glint`, `type` (types in once and stays), `still` | `glint` |
| `speed` | `slow`, `normal`, `fast` | `normal` |
| `font` | `block`, `slim` | `block` |
| `shadow` | `double`, `single`, `heavy`, `rounded`, `ascii`, `none` | `double` |
| `fill` | `shade` ▓, `block` █, `light` ▒, `hash` #, `at` @ | `shade` |
| `tagline` | a line under it, typed out, up to 60 characters | none |
| `art` | any logo, company or distro: `rust`, `arch-linux`, `vercel` | none |
| `place` | where the art goes: `left`, `right`, `above`, `below` | `left` |
| `size` | `s`, `m`, `l`: how big a README shows it | `m` |
| `bg` | a colour behind it, as a card: `0d1117`. Its colours, and the art's, follow the card, dark or light | none |

```html
<a href="https://ascii.rest/banner/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/ferris.dark.svg?color=art&art=rust&tagline=fast%2C%20safe%2C%20fun">
    <img alt="ferris: fast, safe, fun" src="https://ascii.rest/banner/ferris.svg?color=art&art=rust&tagline=fast%2C%20safe%2C%20fun">
  </picture>
</a>
```

[ascii.rest/banner](/banner/) makes one as you click, and gives the HTML, the Markdown, the URL, and the same banner in React, in your own code and in a terminal. A wrong key or value answers 400 with what it takes.

In Markdown, one image for both themes:

```md
[![ferris](https://ascii.rest/banner/ferris.svg?color=art&art=rust)](https://ascii.rest/banner/)
```

## Your own

To change anything a URL can't, make the SVG yourself with [bannerSvg()](/docs/svg/#bannersvg) or [svg()](/docs/svg/#svg), commit the file, and point the README at it:

```ts
import { writeFileSync } from "node:fs";
import { bannerSvg } from "ascii.rest/svg";

for (const dark of [false, true])
  writeFileSync(`.github/banner${dark ? ".dark" : ""}.svg`, bannerSvg("my project", { dark, font: "slim", glint: { every: 6 } }));
```

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/banner.dark.svg">
  <img alt="my project" src=".github/banner.svg">
</picture>
```
