---
layout: ../../layouts/Docs.astro
title: svg
description: Any piece, or a banner with a tagline and a logo, as an animated SVG that needs no script. Strings in, a string out, on a server, in a Worker or in a browser.
---

An SVG plays where no script runs: a GitHub README, an email, an `<img>`, a design tool. `ascii.rest/svg` samples one loop of a piece, keeps each distinct frame once, and shows each in its turn with CSS. It runs anywhere JavaScript does and touches no DOM.

## svg

```ts
import { svg } from "ascii.rest/svg";
import { donut, rust } from "ascii.rest/pieces";

svg(rust);                          // the README SVG of a logo, for a light page
svg(rust, { dark: true });          // and for a dark one
svg(donut, { seconds: 4, ink: "#3fb950" });
```

| option | | default |
| --- | --- | --- |
| `dark` | for a dark page: a coloured piece's dark colours, and a light ink for a text piece | `false` |
| `ink` | a text piece's colour | GitHub's text colour for the theme |
| `seconds` | the loop's length | the piece's `meta.loop`, a logo's glint or a distro's scan, else 4 |
| `from` | the time the loop starts at | `loopOf(piece).from`: between a logo's glints, else 0 |
| `fps` | frames a second it is sampled at; more is smoother and bigger | `15` |
| `once` | play once and hold the last frame, rather than loop | `false` |
| `scale` | pixels a column takes when nothing else sizes it | `10` |
| `label` | its title, for screen readers | `"<name>, in ascii, from ascii.rest"` |
| `options` | the piece's option overrides | |

For a seamless loop, `seconds` should be the piece's period: a piece that repeats exactly says so in `meta.loop`, and `loopOf(piece)` returns the loop `svg()` will use. A still piece, `fps: 0`, is a still SVG with no animation at all.

Rows are stretched to the grid with `textLength`, so they line up in whatever monospace face the viewer has. For a reader who prefers reduced motion it holds one frame.

## bannerSvg

<div class="demo"><img src="/banner/bannersvg.svg?art=rust&color=art&tagline=a%20tagline%2C%20typed%20out" alt="BANNERSVG beside the rust logo, with a tagline typed out under it"></div>

```ts
import { bannerSvg } from "ascii.rest/svg";
import { rust } from "ascii.rest/pieces";

bannerSvg("ferris", { art: rust, color: "art", tagline: "fast, safe, fun" });
bannerSvg("ferris", { dark: true, art: rust, color: "art", tagline: "fast, safe, fun" });
```

A banner, with a line of text typed out under it, a piece beside it and a card behind it if you like. It takes every option of [banner()](/docs/banners/#options), and:

| option | | default |
| --- | --- | --- |
| `dark` | for a dark page | `false` |
| `color` | as banner() takes it, or `"art"` for the art's own colour | GitHub's text colour for the theme |
| `tagline` | a line of plain text under the letters, typed out once they are in, then a blinking cursor | none |
| `taglineColor` | its colour, or `{ light, dark }` | the shadow's |
| `taglineSize` | its size, in SVG units | `28` |
| `art` | a piece to set beside the letters, any logo say, or `{ svg }`, an SVG this module wrote | none |
| `place` | where the art goes: `"left"`, `"right"`, `"above"` or `"below"` | `"left"` |
| `artSize` | the art's height against the letters and tagline | `1` beside, `2.4` above or below |
| `spacing` | room between the art and the letters, in SVG units | `32` |
| `align` | `"start"`, `"center"` or `"end"` | centred with art above or below |
| `background` | a colour behind it all, or `{ light, dark }`; the banner's colours and the art's then follow it, dark or light, whatever the page | none |
| `padding`, `radius` | the background's room round it, and its corners, in SVG units | `24`, `12` |
| `scale` | pixels a column takes when nothing else sizes it | `5` |
| `fps`, `label` | as `svg()` takes them | |

A cell is 10 by 20 SVG units, so a five-row letter is 100 units tall. `{ svg }` takes the SVG text of a logo you already have, a README SVG from `https://ascii.rest/svg/<name>.svg` say, and sets it without drawing it again: that is how ascii.rest's own banner URLs stay fast.

## Sizes

A logo's SVG is 150 to 300 KB as text and 6 to 8 KB gzipped, since its frames repeat each other: serve it compressed, as GitHub and any CDN do. A banner on its own is smaller; one with a logo is the two together. More `fps` and more `seconds` make any of them bigger.

## Serving one

From a [Next.js route handler](/docs/nextjs/#a-banner-as-an-svg-from-a-route-handler), a Worker, or any server: `svg()` returns a string, so `new Response(svg(piece), { headers: { "Content-Type": "image/svg+xml" } })` is all of it. Or skip the server: [github readme](/docs/readme/) has URLs on ascii.rest that make them for you.
