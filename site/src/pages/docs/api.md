---
layout: ../../layouts/Docs.astro
title: api
description: Everything the package exports, by the module it comes from.
---

## ascii.rest

| export | |
| --- | --- |
| `mount(el, piece, options?)` | plays a piece in a `<pre>` or on a `<canvas>`; returns a function that stops it. [typescript](/docs/typescript/#mount) |
| `load` | `{ [name]: () => Promise<Piece> }`: every piece, imported on demand |
| `names` | every piece's name |
| `isPiece(name)` | whether a string names a piece, narrowing it to `PieceName` |
| `canvas` | the set of pieces that draw on a canvas, in colour |
| `type Piece`, `Meta`, `Frame`, `Env`, `Options`, `Category` | [the piece contract](/docs/pieces/) |
| `type PieceName`, `MountOptions` | a piece's name; `mount()`'s options |

## ascii.rest/pieces

Every piece as a named export, its name in camel case: `donut`, `nightCoast`, `bigText`, `rust`. Each is a module, `{ meta, default }`. `ascii.rest/pieces/<name>` is one piece's module on its own.

## ascii.rest/react

| export | |
| --- | --- |
| `Ascii` | any piece: `piece`, `options`, `label`, `mono`, `className`, `style`. [react](/docs/react/#ascii) |
| `Banner` | any text: `text` and every option of `banner()`, with `label`, `mono`, `fps`, `className`, `style`. [react](/docs/react/#banner) |
| `type AsciiProps`, `BannerProps` | their props |

## ascii.rest/astro, ascii.rest/astro/banner

Each default exports an Astro component: `Ascii` with `piece`, `options`, `fps`, `label`, `mono`, `class`, and `Banner` with `text` and every option of `banner()`. [astro](/docs/astro/)

## ascii.rest/element

| export | |
| --- | --- |
| the `<ascii-art>` and `<ascii-banner>` tags | defined on import. [html](/docs/html/) |
| `AsciiArt`, `AsciiBanner` | their classes |
| `define(tag?)` | defines them, `<ascii-art>` under another name if you give one |

## ascii.rest/banner

| export | |
| --- | --- |
| `banner(text, options?)` | any text in block letters, as a `BannerPiece`. [banners](/docs/banners/) |
| `drawable(text, font?)` | the characters of a text a font draws, in the case they came in |
| `fonts` | the built-in fonts: `block`, `slim` |
| `shadows` | the built-in shadows' 16 characters each: `double`, `single`, `heavy`, `rounded`, `ascii` |
| `type BannerOptions`, `BannerPiece`, `Font`, `FontName`, `ShadowName`, `Effect`, `Colors`, `Themed` | |

A `BannerPiece` is a piece with `text`, what it drew, and `motion`, `{ seconds, from, once, pass }`.

## ascii.rest/svg

| export | |
| --- | --- |
| `svg(piece, options?)` | a piece as an animated SVG. [svg](/docs/svg/#svg) |
| `bannerSvg(text, options?)` | a banner as an animated SVG, with a tagline, art and a background. [svg](/docs/svg/#bannersvg) |
| `loopOf(piece, options?)` | the loop `svg()` plays: `{ every, from }` |
| `part(loop, prefix?)`, `wrap(part, label, scale?)` | the writer underneath, for putting frames of your own in an SVG: `part()` makes frames into a part, its classes under `prefix`; `wrap()` puts parts in one SVG |
| `namespaced(svg, prefix)` | an SVG this module wrote, back as a part, so it can sit beside others |
| `inkOf(part)` | the colour that inks the most of a part's first frame |
| `darkColor(hex)` | whether a `#rrggbb` colour is dark: what a banner on a background takes its colours from |
| `MONO`, `FACES` | the CSS rule every part's rows share, and the monospace faces it names |
| `type SvgOptions`, `BannerSvgOptions`, `BannerSvgColor`, `Loop`, `Part`, `Shot` | |

## ascii.rest/terminal

| export | |
| --- | --- |
| `play(piece, options?)` | a piece on the alternate screen: a splash screen. [terminal](/docs/terminal/#play) |
| `banner(text, options?)` | a banner where the cursor is. [terminal](/docs/terminal/#banner) |
| `still(piece, options?)` | a piece's first frame as plain text |
| `type PlayOptions`, `Played`, `PrintOptions`, `Bannered`, `Output` | |

## Over HTTP

| URL | |
| --- | --- |
| `https://ascii.rest/ascii.js` | the tags, for a page with no build. [html](/docs/html/) |
| `https://ascii.rest/svg/<name>.svg`, `.dark.svg` | a logo, company or distro's README SVG. [github readme](/docs/readme/#logos) |
| `https://ascii.rest/banner/<text>.svg`, `.dark.svg` | a banner, its choices in the query. [github readme](/docs/readme/#banners) |
| `https://ascii.rest/r/<name>.json` | a registry item, for shadcn or `npx ascii.rest add`. [your own copy](/docs/copy/) |
| `https://ascii.rest/og/<name>.png` | a piece's share card, 1200 by 630 |
