---
layout: ../../layouts/Docs.astro
title: svg
description: Turn any piece, or a banner of your own text, into an animated SVG that plays without JavaScript.
---

`ascii.rest/svg` turns any piece, or a banner of your own text, into an animated SVG. The SVG plays where JavaScript can't run, like a GitHub README or an `<img>` tag.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/svg.mp4" poster="https://cdn.ascii.rest/videos/svg.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>bannerSvg() in a Node script writes a file, and the README shows it.</figcaption>
</figure>

Three words you will see on this page. A **piece** is one animation, like `donut` or the `rust` logo. A **banner** is any text you choose, drawn in big block letters. A **frame** is the picture at one moment.

To make your first SVG:

1. Install the package:

   ```sh
   npm install ascii.rest
   ```

2. Save this script as `make-svg.ts`:

   ```ts
   import { writeFileSync } from "node:fs";
   import { bannerSvg } from "ascii.rest/svg";

   writeFileSync("hello.svg", bannerSvg("hello", { color: ["#f97316", "#f778ba"] }));
   ```

3. Run it. Node runs a `.ts` file as it is from Node 22.18, or 23.6 in Node 23. If yours prints an error, name the file `make-svg.mjs` instead. The script has no types, so it is plain JavaScript too.

   ```sh
   node make-svg.ts
   ```

4. Open `hello.svg` in your browser, or show it on a page with `<img src="hello.svg" alt="hello">`. It looks like this:

   <div class="demo"><img src="/banner/hello.svg?color=f97316,f778ba" alt="HELLO in block letters, fading from orange to pink, with a glint crossing it"></div>

## When to use an SVG

Use an SVG wherever the page can't run JavaScript. `<Ascii>`, `<ascii-art>` and `mount()` draw each frame with JavaScript, so they can't play in these places:

- **A GitHub README.** GitHub runs no scripts in a README, but it shows SVG images and plays their CSS animation.
- **An `<img>` tag.** A browser never runs scripts inside an image, but it does play an SVG's CSS animation.
- **Email.** This depends on the email app. Apple Mail shows SVG images. Gmail turns them into a still PNG ([caniemail](https://www.caniemail.com/features/image-svg/)). Test in the apps your readers use.

On a page that can run JavaScript, use [react](/docs/react/) or [html](/docs/html/) instead. They play the piece live, so it never has to loop.

The SVG holds each frame as text, and CSS shows the frames in turn, so it needs no script. The details are in [how the SVG works](#how-the-svg-works).

`svg()` and `bannerSvg()` take values and return a string. They never touch a page, so they run anywhere JavaScript does: in Node, in a browser, in a Cloudflare Worker, or in a build script.

<div id="svg"></div>

## Turn a piece into an SVG

`svg(piece, options)` returns one piece as an SVG, in a string. Import the piece from `ascii.rest/pieces` by its export, in camelCase: `nightCoast` for the piece named `night-coast`.

```ts
import { svg } from "ascii.rest/svg";
import { donut, rust } from "ascii.rest/pieces";

const logo = svg(rust); // the rust logo, for a light page
const logoDark = svg(rust, { dark: true }); // the same logo, for a dark page
const spin = svg(donut, { ink: "#3fb950", seconds: 2 }); // a green donut that loops every 2 seconds
```

This is `svg(rust)`. ascii.rest serves the same file at `https://ascii.rest/svg/rust.svg`:

<div class="demo"><img src="/svg/rust.svg" width="240" alt="the rust logo in ascii, with a glint crossing it now and then"></div>

| option | what it does | default |
| --- | --- | --- |
| `dark` | Draws it for a dark page: light text, and a coloured piece's dark colours. | `false` |
| `ink` | The colour of a text piece, as `#rrggbb`. A text piece is drawn in one colour, like `donut`. A coloured piece, like a logo, keeps its own colours. | GitHub's text colour: `#1f2328`, or `#f0f6fc` with `dark` |
| `seconds` | How long one loop lasts, in seconds. | the piece's own loop, or `4`: see [make the loop seamless](#make-the-loop-seamless) |
| `from` | The moment in the piece where the loop starts, in seconds. | the piece's own loop, or `0` |
| `fps` | Frames it takes each second, from 1 to 60. More is smoother, and makes a bigger file. | `15` |
| `once` | Plays the loop once, then stays on its last frame. | `false`, or `true` for a banner with `effect: "type"` |
| `scale` | Pixels per column, when nothing else sets the image's size. | `10` |
| `label` | What screen readers say. | `"<name>, in ascii, from ascii.rest"` |
| `options` | Options for the piece itself, like `{ scan: 3 }` for a distro that scans every 3 seconds. | the piece's own |

A scene has a background colour of its own, its `meta.ground`. Its SVG draws that colour behind it, so it looks the same on a light page and a dark one. The same goes for a scene beside a banner in `bannerSvg()`.

`svg()` throws an error when:

- `ink` isn't `#rrggbb`.
- `fps` isn't between 1 and 60.
- `scale` isn't a number of 0 or more.

### Make the loop seamless

An SVG plays one loop over and over. If the piece looks different at the end of the loop than at the start, you see a jump. `svg()` picks a loop with no jump when it knows one:

- A banner: the time between two glints, or one play of its typing.
- A piece that sets `meta.loop`: that many seconds.
- A logo, or a company's logo: the time between two glints. That is 5 seconds, unless you change the option for it listed in the logo's `meta.options`.
- A Linux distro: the time between two scans, set by its `scan` option. A scan is a line that runs down the logo.
- Anything else: 4 seconds. If the piece doesn't repeat every 4 seconds, it jumps once a loop. Pass `seconds` to change the length.

`loopOf(piece)` tells you which loop `svg()` will play:

```ts
import { loopOf } from "ascii.rest/svg";
import { donut, rust } from "ascii.rest/pieces";

loopOf(rust); // { every: 5, from: 4.5 }: 5 seconds, starting between two glints
loopOf(donut); // { every: 4, from: 0 }
```

A piece that doesn't move, like [box-frames](/box-frames/), becomes a still SVG with no animation in it.

<div id="bannersvg"></div>

## Make a banner SVG

`bannerSvg(text, options)` draws your text as a banner and returns it as an SVG string. It can also add a tagline under the letters, a piece beside them, and a coloured card behind them.

```ts
import { bannerSvg } from "ascii.rest/svg";
import { rust } from "ascii.rest/pieces";

const light = bannerSvg("ferris", { art: rust, color: "art", tagline: "fast, safe, fun" });
const dark = bannerSvg("ferris", { art: rust, color: "art", tagline: "fast, safe, fun", dark: true });
```

<div class="demo"><img src="/banner/ferris.svg?color=art&art=rust&tagline=fast%2C%20safe%2C%20fun" alt="FERRIS in orange block letters beside the rust logo, with the tagline fast, safe, fun typed out under it"></div>

`art: rust` puts the rust logo beside the letters. `color: "art"` gives the letters the logo's own colour. With no `color`, the letters are in GitHub's text colour and the shadow is in GitHub's muted grey, so the banner looks at home in a README.

`bannerSvg()` takes every option of `banner()`, such as `font`, `shadow`, `fill`, `effect` and `speed`. They are all on [banners](/docs/banners/#options). These options are only for the SVG:

| option | what it does | default |
| --- | --- | --- |
| `dark` | Draws it for a dark page. | `false` |
| `color` | The letters' colour, as `banner()` takes it: one `#rrggbb`, a list of them for a fade, or `{ light, dark }`. Or `"art"`, for the art's own colour, which is GitHub's text colour when there is no art. | GitHub's text colour: `#1f2328`, or `#f0f6fc` with `dark` |
| `tagline` | A line of plain text under the letters. It types out once the letters are in, then a cursor blinks after it. | none |
| `taglineColor` | The tagline's colour, as `#rrggbb` or `{ light, dark }`. | the shadow's colour |
| `taglineSize` | The tagline's font size, in SVG units. | `28` |
| `art` | A piece to show with the letters, like a logo. Or `{ svg }`, an SVG that `svg()` made. | none |
| `place` | Where the art goes: `"left"`, `"right"`, `"above"` or `"below"`. | `"left"` |
| `artSize` | The art's height, as a multiple of the letters and tagline together. | `1` beside them, `2.4` above or below |
| `spacing` | The gap between the art and the letters, in SVG units. | `32` |
| `align` | Lines up the letters, the tagline and the art across the width: `"start"`, `"center"` or `"end"`. | `"center"` when the art is above or below, else `"start"` |
| `background` | The colour of a card behind everything, as `#rrggbb` or `{ light, dark }`. | none |
| `padding` | The space between the card's edge and what is on it, in SVG units. | `24` |
| `radius` | How round the card's corners are, in SVG units. | `12` |
| `scale` | Pixels per column, when nothing else sets the image's size. | `5` |
| `fps` | Frames it takes each second, from 1 to 60. | `15` |
| `label` | What screen readers say. | `"<text>, in ascii, from ascii.rest"`, with `: <tagline>` after the text when there is one |

`bannerSvg()` throws an error when:

- The font can draw none of the text, like `"é"` or `"***"`. Text of only spaces counts as none.
- `background` or `taglineColor` isn't `#rrggbb`, for either theme, even one it doesn't use.
- `taglineSize`, `artSize`, `spacing`, `padding`, `radius` or `scale` isn't a number of 0 or more.
- `place` isn't `"left"`, `"right"`, `"above"` or `"below"`, or `align` isn't `"start"`, `"center"` or `"end"`.
- `fps` isn't between 1 and 60.
- `art` is `{ svg }` with an SVG that ascii.rest/svg didn't write.
- An option of `banner()` is one it can't take, like an unknown font. See [banners](/docs/banners/#options).

### Add a tagline

A tagline is a line of plain text under the letters. It types out after the letters appear, then a cursor blinks at its end. With `effect: "still"`, it shows all at once, with no cursor.

```ts
import { bannerSvg } from "ascii.rest/svg";

const banner = bannerSvg("my project", { tagline: "a line about it", color: "#f97316" });
```

<div class="demo"><img src="/banner/my%20project.svg?color=f97316&tagline=a%20line%20about%20it" alt="MY PROJECT in orange block letters, with a line about it typed out under it"></div>

Change its colour with `taglineColor` and its size with `taglineSize`.

### Put a piece beside the letters

`art` takes any piece. A logo works best, because its loop has no jump. `place` puts it on any side:

```ts
import { bannerSvg } from "ascii.rest/svg";
import { rust } from "ascii.rest/pieces";

const banner = bannerSvg("ferris", { art: rust, color: "art", place: "above" });
```

<div class="demo"><img src="/banner/ferris.svg?color=art&art=rust&place=above" alt="the rust logo above FERRIS in orange block letters"></div>

Beside the letters, the art is as tall as the letters and tagline together. Above or below them, it is 2.4 times as tall. Change that with `artSize`. `spacing` sets the gap between the art and the letters, and `align` lines them up across the width.

### Put a card behind it

`background` draws a card with rounded corners behind everything. On a card, the colours follow the card, not the page: a dark card gets light letters, even without `dark`. So one SVG looks right on both light and dark pages.

```ts
import { bannerSvg } from "ascii.rest/svg";
import { rust } from "ascii.rest/pieces";

const banner = bannerSvg("ferris", { art: rust, color: "art", background: "#0d1117" });
```

<div class="demo"><img src="/banner/ferris.svg?color=art&art=rust&bg=0d1117" alt="FERRIS in orange block letters beside the rust logo, on a dark card"></div>

`padding` sets the space inside the card's edge, and `radius` rounds its corners.

### Reuse a logo SVG you already have

`art` also takes `{ svg }`: an SVG that `svg()` made, such as a logo from `https://ascii.rest/svg/<name>.svg`. `bannerSvg()` reuses that SVG's frames instead of drawing the piece again. The result is the same SVG, made several times faster: see the times in [keep the file small](#keep-the-file-small).

```ts
import { bannerSvg } from "ascii.rest/svg";

const rustSvg = await (await fetch("https://ascii.rest/svg/rust.svg")).text();
const banner = bannerSvg("ferris", { art: { svg: rustSvg }, color: "art" });
```

For a dark banner, use the dark logo, `https://ascii.rest/svg/rust.dark.svg`. An SVG that ascii.rest/svg didn't write throws an error.

## Set the size

An SVG stays sharp at any size. You can set its size in two places.

On the page, give the `<img>` a `width`. The height follows:

```html
<img src="hello.svg" alt="hello" width="400">
```

In the file, `scale` sets how many pixels wide each column is, when nothing else sets the size. `svg()` uses 10 and `bannerSvg()` uses 5:

```ts
import { bannerSvg, svg } from "ascii.rest/svg";
import { rust } from "ascii.rest/pieces";

svg(rust); // 64 columns: 640 by 640 pixels
svg(rust, { scale: 5 }); // 320 by 320 pixels
bannerSvg("hello"); // 49 columns: 245 by 60 pixels
bannerSvg("hello", { scale: 8 }); // 392 by 96 pixels
```

`taglineSize`, `spacing`, `padding` and `radius` are in SVG units. One cell, the space of one character, is 10 units wide and 20 units tall. A letter of the `block` font is 5 cells tall, so 100 units. A `taglineSize` of 28 is a little over a quarter of that.

## Serve an SVG from your server

Both functions return a string, so any server can send one. Send it with the header `Content-Type: image/svg+xml`, so browsers treat it as an image.

To make a banner from the text in the URL, see the route handler on [next.js](/docs/nextjs/#serve-a-banner-as-an-svg-from-a-route-handler). The handler uses only `Request` and `Response`, so the same code works in a Cloudflare Worker's `fetch`.

When the SVG never changes, make it once, when the server starts, not on every request. This Cloudflare Worker makes the rust logo once and sends the same string to every request:

```ts
import { svg } from "ascii.rest/svg";
import * as rust from "ascii.rest/pieces/rust";

const light = svg(rust);
const dark = svg(rust, { dark: true });

export default {
  fetch(request: Request) {
    const body = new URL(request.url).searchParams.has("dark") ? dark : light;
    return new Response(body, { headers: { "Content-Type": "image/svg+xml" } });
  },
};
```

A few things help:

- **Cache it.** The same options always make the same SVG, so let browsers and CDNs keep it with a `Cache-Control` header.
- **Compress it.** Most of an SVG is frames that look like each other, so gzip makes it far smaller (see [keep the file small](#keep-the-file-small)). Check that your server compresses it: the reply should have a `content-encoding` header.

  ```sh
  curl -sI -H "Accept-Encoding: gzip" "https://example.com/banner?text=hello"
  ```

- **Make slow ones ahead of time.** Most pieces take under 25 ms to make, but a scene takes 0.2 to 0.5 seconds. The times are in [keep the file small](#keep-the-file-small).

You may not need a server at all: [github readme](/docs/readme/) lists URLs on ascii.rest that make banners and logos for you.

## Make SVG files with a script

When the SVG never changes, make it once in a script and commit the file, so you need no server. The script is on [github readme](/docs/readme/#make-your-own-svg-and-commit-it), with the `<picture>` tag that shows a dark file on GitHub's dark theme.

## Keep the file small

An SVG holds every different frame of its loop as text, so it can get big. This table shows how big, and how long each one took to make.

- The sizes were measured from the package as it is built, as text and after `gzip -9`. 1 KB is 1,024 bytes.
- The times are the middle value of 31 runs, in Node 26 on an Apple M4 laptop. `night-coast` had 3 runs. Your times will differ.

| what | as text | gzipped | time to make |
| --- | --- | --- | --- |
| `svg(rust)` | 156.3 KB | 6.3 KB | 5 ms |
| `svg(archLinux)` | 87.2 KB | 3.1 KB | 3 ms |
| `svg(spinners)` | 58.4 KB | 3.4 KB | 2 ms |
| `svg(donut)` | 110.9 KB | 12.5 KB | 25 ms |
| `svg(donut, { seconds: 2 })` | 56.1 KB | 6.8 KB | 15 ms |
| `svg(donut, { fps: 8 })` | 59.4 KB | 7.6 KB | 15 ms |
| `svg(nightCoast)` | 9,563.8 KB | 356.3 KB | 290 ms |
| `bannerSvg("hello")` | 90.0 KB | 2.4 KB | 1 ms |
| `bannerSvg("hello", { effect: "type" })` | 9.3 KB | 0.9 KB | under 1 ms |
| `bannerSvg("hello", { effect: "still" })` | 3.0 KB | 0.5 KB | under 1 ms |
| `bannerSvg("ferris", { art: rust, color: "art", tagline: "fast, safe, fun" })` | 261.2 KB | 8.8 KB | 6 ms |
| the same ferris banner, with `art: { svg: rustSvg }` from [reuse a logo SVG](#reuse-a-logo-svg-you-already-have) | 261.2 KB | 8.8 KB | 1 ms |

What that means for you:

- **Serve it compressed.** gzip made these files between 5 and 38 times smaller. ascii.rest sends `rust.svg` as 6,484 bytes gzipped, down from 160,026.
- **Use a shorter loop or fewer frames.** Halving `seconds`, or taking 8 frames a second instead of 15, about halves the file.
- **Let a banner stop.** `effect: "type"` plays once and stays, so it has few frames. `effect: "still"` has one.
- **Keep to small pieces.** A scene's SVG is 5 to 20 MB. Every other piece makes an SVG under 400 KB. SVGs suit logos, banners and small pieces best.

## Put two SVGs straight into one HTML page

Usually you show an SVG with `<img>`, and then you need none of this: each image is its own document.

Every SVG from `svg()` uses the same CSS class names. Paste two into one HTML page and their styles clash. Give one a prefix with `namespaced()`, then rebuild it with `wrap()`:

```ts
import { namespaced, svg, wrap } from "ascii.rest/svg";
import { donut, rust } from "ascii.rest/pieces";

const first = svg(donut);
const second = wrap(namespaced(svg(rust), "r")!, "rust");
```

- `namespaced()` returns `null` for an SVG that ascii.rest/svg didn't write. That is why the code has `!`.
- For three or more SVGs, give each one but the first its own prefix.
- `wrap()` takes a label for screen readers, then the pixels per column: 10 if you leave it out. Pass 5 for a banner, to keep its size.
- This works for any SVG from `svg()`, and for a banner with no tagline and no art. A banner with a tagline or art keeps some shared class names, so show it with `<img>`.

## How the SVG works

You don't need this to use `svg()`. It explains what is in the file.

- `svg()` plays one loop of the piece and takes a frame 15 times a second, unless you set `fps`.
- It keeps each different frame once, as text. CSS shows the frames in turn.
- There is no script and no font file. The rows use the reader's own monospace font, stretched so they line up.
- For a reader who has turned on reduced motion, the SVG holds one still frame.

## Next

- [github readme](/docs/readme/): ready-made SVG URLs for your README, with no code.
- [banners](/docs/banners/): every banner option, from fonts and shadows to colours and motion.
- [next.js](/docs/nextjs/): serve a banner SVG from a route handler, or make SVG files when you build.
