---
layout: ../../layouts/Docs.astro
title: install
description: From npm for a bundled app, one script tag for a plain page, or the source copied into your project.
---

## From npm

```sh
npm install ascii.rest
# or: pnpm add ascii.rest, yarn add ascii.rest, bun add ascii.rest
```

It has no dependencies. React is an optional peer, needed only for `ascii.rest/react`. Every module is ES modules with its own types, written in strict TypeScript.

| import | what it is | docs |
| --- | --- | --- |
| `ascii.rest` | `mount()` and the piece loader: `load`, `names`, `isPiece` | [typescript](/docs/typescript/) |
| `ascii.rest/pieces` | every piece as a named export: `donut`, `nightCoast` | [typescript](/docs/typescript/) |
| `ascii.rest/pieces/<name>` | one piece's module | [your own pieces](/docs/pieces/) |
| `ascii.rest/react` | `<Ascii>` and `<Banner>` | [react](/docs/react/) |
| `ascii.rest/astro` | `<Ascii>` for Astro | [astro](/docs/astro/) |
| `ascii.rest/astro/banner` | `<Banner>` for Astro | [astro](/docs/astro/) |
| `ascii.rest/element` | the `<ascii-art>` and `<ascii-banner>` tags | [html](/docs/html/) |
| `ascii.rest/banner` | `banner()`: any text in block letters, as a piece | [banners](/docs/banners/) |
| `ascii.rest/svg` | `svg()` and `bannerSvg()`: animated SVG of any piece | [svg](/docs/svg/) |
| `ascii.rest/terminal` | `play()`, `still()` and `banner()` for Node | [terminal](/docs/terminal/) |

The pieces are modules with no side effects, so a bundler can leave out every piece you don't import, and `load["night-coast"]()` fetches its piece only when it is called.

## One tag, no install

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>
```

That defines `<ascii-art>` and `<ascii-banner>`, and loads each piece from ascii.rest when a page uses it. It always serves the latest build. To pin a version, load the same file from npm through a CDN, which also lets you add an `integrity` hash: see [html](/docs/html/#pin-a-version).

## Your own copy

The pieces and every part of the library are also a shadcn registry, so the TypeScript goes into your project for you to keep and change:

```sh
npx shadcn@latest add https://ascii.rest/r/ascii.json https://ascii.rest/r/donut.json
# or, without shadcn
npx ascii.rest add ascii donut
```

See [your own copy](/docs/copy/) for where the files go and how to use them.

## What it runs on

Pieces play in every current browser: they draw into a `<pre>`, or a `<canvas>` for the coloured ones, with `requestAnimationFrame`. The SVGs from `ascii.rest/svg` play in any browser and in GitHub's README viewer. `ascii.rest/terminal` and `npx ascii.rest` need Node 18.3 or newer, for its own argument parser and `fetch`.
