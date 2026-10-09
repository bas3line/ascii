---
layout: ../../layouts/Docs.astro
title: examples
description: Recipes to copy and paste, one for each thing people build most, from a hero scene and a 404 page to a README banner and a CLI splash screen.
---

Each recipe below does one job. It says when you would use it, gives you code to paste, and shows the result where it runs on a page.

Two words you will see a lot. A **piece** is one animation from the library, like `donut` or `night-coast`. A **banner** is any text you choose, drawn in big block letters. Every piece's name is in [the list of every piece](/#pieces).

The web recipes use React, plain HTML or Astro. Each one works in the other two as well: `<Ascii piece="donut" />` in React is `<ascii-art piece="donut"></ascii-art>` in HTML. Every recipe that imports from `ascii.rest` needs the package installed first:

```sh
npm install ascii.rest
```

## Add a scene to the top of your landing page

Use this when you want a big moving picture behind your page's headline.

```tsx
// app/page.tsx
import { Ascii } from "ascii.rest/react";

export default function Home() {
  return (
    <main>
      <section style={{ display: "grid" }}>
        <Ascii piece="night-coast" label="a lighthouse over a dark sea" style={{ gridArea: "1 / 1", width: "100%" }} />
        <h1 style={{ gridArea: "1 / 1", placeSelf: "center", color: "white" }}>my project</h1>
      </section>
    </main>
  );
}
```

<div class="demo"><ascii-art piece="night-coast" style="width: 100%"></ascii-art></div>

The scene and the heading share one grid cell, so the heading sits on top of the scene. A scene is a coloured piece: it draws on a `<canvas>` as wide as its container, and twice as wide as it is tall. You pass its name as a string, so the piece loads as a file of its own when the component mounts. It isn't part of your page's JavaScript. It only plays while it is on screen.

Other scenes to try: `ocean-sunset`, `kyoto-dusk`, `misty-forest`, `aurora-fjord`, `tokyo-rain`.

## Show a spinner while data loads

Use this when part of your page waits on a request.

```tsx
"use client";
import { useEffect, useState } from "react";
import { Ascii } from "ascii.rest/react";

export function Posts() {
  const [posts, setPosts] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/posts")
      .then((response) => response.json())
      .then(setPosts);
  }, []);

  if (!posts) return <Ascii piece="spinners" options={{ names: ["dots"], labels: false }} label="loading" />;

  return (
    <ul>
      {posts.map((post) => (
        <li key={post}>{post}</li>
      ))}
    </ul>
  );
}
```

The `spinners` piece holds twelve spinners. These are all of them, with their names:

<div class="demo"><ascii-art piece="spinners"></ascii-art></div>

| option | what it does | default |
| --- | --- | --- |
| `names` | the spinners to show, in order: `line`, `dots`, `pipe`, `arc`, `bounce`, `clock`, `bar`, `loop`, `scan`, `wave`, `slide`, `orbit` | `[]`, which shows all twelve |
| `labels` | shows each spinner's name under it | `true` |
| `speed` | how fast they spin: `2` is twice as fast | `1` |

In plain HTML it is one tag:

```html
<ascii-art id="spinner" piece="spinners" options='{"names":["dots"],"labels":false}' label="loading"></ascii-art>
```

When your data arrives, remove it with `document.getElementById("spinner").remove()`.

## Show a progress bar

Use this to decorate a page about work going on, like a deploy screen or a "coming soon" page.

```html
<ascii-art piece="progress-bar" options='{"labels":["fetching","building","testing","shipping","done"]}'></ascii-art>
```

<div class="demo"><ascii-art piece="progress-bar" options='{"labels":["fetching","building","testing","shipping","done"]}'></ascii-art></div>

The piece draws five bars, each in a different style. Each bar fills at its own uneven pace, holds at 100%, and starts again. The bars move by themselves: they don't follow any real work. To show how far a real task has got, use the HTML `<progress>` element.

| option | what it does | default |
| --- | --- | --- |
| `labels` | the name beside each bar, top to bottom; the first nine characters of each show | `["fetching", "unpacking", "indexing", "building", "linking"]` |

## Make a 404 page

Use this for the page people see when they follow a broken link.

```tsx
// app/not-found.tsx
import { Ascii } from "ascii.rest/react";

export default function NotFound() {
  return (
    <main>
      <Ascii piece="not-found" options={{ title: "nothing here", message: "the page moved, or it never was" }} label="404: page not found" />
      <a href="/">go home</a>
    </main>
  );
}
```

<div class="demo"><ascii-art piece="not-found"></ascii-art></div>

In the Next.js app router, `app/not-found.tsx` is the page for every URL that matches nothing. In Astro, the same piece goes in `src/pages/404.astro`.

| option | what it does | default |
| --- | --- | --- |
| `code` | the big number, up to three digits | `"404"` |
| `title` | the line under the ghost, up to 60 characters | `"page not found"` |
| `message` | the line under the title, up to 60 characters | `"the page you asked for has moved or never existed"` |

## Put your name in your site's header

Use this to show your name, or your project's, in big letters at the top of every page.

```tsx
// components/header.tsx
import { Banner } from "ascii.rest/react";

export function Header() {
  return (
    <header>
      <a href="/" aria-label="home">
        <Banner text="your name" font="slim" shadow="rounded" style={{ fontSize: 8 }} />
      </a>
    </header>
  );
}
```

<div class="demo"><ascii-banner text="your name" font="slim" shadow="rounded"></ascii-banner></div>

With no colour, a banner is drawn like a text piece: plain text in your page's text colour, so it matches your header. `font="slim"` makes narrower letters, and `fontSize` sets the size. Letters are drawn as capitals. A banner draws letters, digits, spaces and `. , ! ? ' : - + = / _`, and leaves out anything else. Every option is on [banners](/docs/banners/#options).

## Change a banner's colours with light and dark mode

Use this when your site has a light and a dark theme, and one colour can't suit both.

```tsx
import { Banner } from "ascii.rest/react";

export function Logo() {
  return <Banner text="my site" color={{ light: "#c2410c", dark: "#fb923c" }} />;
}
```

<div class="demo"><ascii-banner text="my site" options='{"color":{"light":"#c2410c","dark":"#fb923c"}}'></ascii-banner></div>

Switch this site's theme with the button in its header to see the demo change.

The banner reads its own CSS `color`, which it inherits from the page. Dark text means a light page, so it uses `light`. Light text means a dark page, so it uses `dark`. It checks each time it draws a frame, so a moving banner follows a theme switch.

A still banner doesn't follow a theme switch straight away. That is a banner with `effect: "still"`, or any banner shown to a reader who prefers reduced motion. It keeps its first colours until its width changes or the page reloads.

Each side takes one colour, or a list of colours for a fade. `shadowColor` takes `{ light, dark }` too:

```tsx
import { Banner } from "ascii.rest/react";

<Banner text="my site" color={{ light: ["#c2410c", "#be185d"], dark: ["#fb923c", "#f472b6"] }} />
```

In HTML, put `{ light, dark }` in the `options` attribute, as JSON:

```html
<ascii-banner text="my site" options='{"color":{"light":"#c2410c","dark":"#fb923c"}}'></ascii-banner>
```

## Put a small logo next to text

Use this for a "built with" line or a footer credit, where a full-colour logo would be too loud.

```html
<div class="built-with">
  <ascii-art piece="rust" mono label="rust"></ascii-art>
  <span>built with rust</span>
</div>

<style>
  .built-with {
    display: flex;
    align-items: center;
    gap: 1em;
  }

  .built-with ascii-art {
    font-size: 2px;
  }
</style>
```

<div class="demo"><div style="display: flex; align-items: center; gap: 1em"><ascii-art piece="rust" mono label="rust" style="font-size: 2px"></ascii-art><span>built with rust</span></div></div>

`mono` draws a coloured piece as text in one colour: the CSS `color` of its tag, so it matches the words beside it. The rust logo is 64 columns by 32 rows, so at `font-size: 2px` it is under 80 pixels wide. In React it is `<Ascii piece="rust" mono style={{ fontSize: 2 }} />`.

## Make a piece bigger or smaller

Use this to fit a piece into its space on your page. How you size it depends on how it draws.

- **Text pieces** draw in a `<pre>`. Set `font-size`. These are every piece except the scenes, logos, companies and distros. A banner with no colour is one too, and so is any piece with `mono`.
- **Coloured pieces** draw on a `<canvas>` as wide as their tag. Set `width` or `max-width` on the tag, and the height follows. These are the scenes, logos, companies and distros, and a banner with a colour.

```css
/* a text piece: font-size sets its size */
ascii-art.small {
  font-size: 6px;
}

/* a text piece that shrinks on small screens */
ascii-art.fluid {
  font-size: clamp(6px, 1.6vw, 14px);
}

/* a coloured piece fills its tag's width, so cap the tag */
ascii-art.logo {
  max-width: 240px;
}
```

<div class="demo"><div style="display: flex; align-items: center; gap: 2rem"><ascii-art piece="donut" style="font-size: 4px"></ascii-art><ascii-art piece="donut" style="font-size: 8px"></ascii-art></div></div>

With the HTML tag, size `<ascii-art>`, not the `<canvas>` inside it. The canvas has `width: 100%` set inline, which beats a `width` in your stylesheet.

In React there is no wrapper, so `style` and `className` go straight on the `<pre>` or `<canvas>`:

```tsx
import { Ascii } from "ascii.rest/react";

<Ascii piece="donut" style={{ fontSize: 6 }} />
<Ascii piece="rust" style={{ maxWidth: 240 }} />
```

Give a canvas its width in `style`. A `width` from a class loses to the `width: 100%` that `<Ascii>` sets inline. On a `<pre>`, `<Ascii>` adds no CSS at all, so give a text piece `line-height: 1.2; margin: 0` too. See [set the size](/docs/react/#set-the-size).

## Respect reduced motion

Use this to know what your readers see when they have asked their system for less motion, and how to give them a play button.

You don't need to do anything for the default:

- On a page, a piece shows one frame and stays still. A banner that types in shows all its letters.
- If the reader changes the setting while the page is open, the piece stops or starts to match.
- An SVG made by ascii.rest holds one frame.
- Every piece on a page also pauses while it is off screen or its tab is hidden.

If your system asks for reduced motion, this donut holds still:

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

The `motion` option plays a piece even for a reader who prefers reduced motion. Only use it behind a control the reader chooses, such as a play button:

```tsx
"use client";
import { useState } from "react";
import { Ascii } from "ascii.rest/react";

export function Art() {
  const [playing, setPlaying] = useState(false);

  return (
    <figure>
      <Ascii piece="donut" options={{ motion: playing }} />
      <button onClick={() => setPlaying(true)}>play</button>
    </figure>
  );
}
```

For most readers the donut plays at once, and the button only starts it again. For a reader who prefers reduced motion, it holds still until they press the button.

`motion` works in `mount(el, piece, { motion: true })`, in `<Ascii options={{ motion: true }}>` (React and Astro), and in `<ascii-art options='{"motion":true}'>`. `<Banner>` and `<ascii-banner>` don't take it. To give a banner a play button, make the banner with `banner()` and pass it to `<Ascii>`:

```tsx
"use client";
import { useState } from "react";
import { Ascii } from "ascii.rest/react";
import { banner } from "ascii.rest/banner";

// Made once, outside the component, so a re-render doesn't start it again.
const hello = banner("hello", { effect: "type" });

export function Hello() {
  const [playing, setPlaying] = useState(false);

  return (
    <figure>
      <Ascii piece={hello} options={{ motion: playing }} />
      <button onClick={() => setPlaying(true)}>play</button>
    </figure>
  );
}
```

To test it, turn on reduced motion. On a Mac: System Settings, then Accessibility, then Display, then Reduce motion. In Chrome: open DevTools, open the Rendering panel, and set "Emulate CSS media feature prefers-reduced-motion" to `reduce`.

## Start a plain HTML page from scratch

Use this when you have no build step and nothing to install. You need one `<script>` tag and one `<ascii-art>` tag.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>my page</title>
    <script type="module" src="https://ascii.rest/ascii.js"></script>
  </head>
  <body>
    <ascii-art piece="donut"></ascii-art>
  </body>
</html>
```

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

The script defines `<ascii-art>` and `<ascii-banner>`. It loads each piece from ascii.rest the first time the page uses it. To show a different piece, change `donut` to another piece's name, with dashes: `night-coast`. To add a banner, add one more tag:

```html
<ascii-banner text="my page" color="#f97316,#f778ba"></ascii-banner>
```

`https://ascii.rest/ascii.js` is always the latest build. To load one fixed version with an `integrity` hash instead, see [pin a version](/docs/html/#pin-a-version). Every attribute is on [html](/docs/html/).

## Build an Astro landing page

Use this for an Astro site. A text piece's first frame is drawn on the server, so it shows before any script runs. A coloured piece keeps its space on the page until it draws.

```astro
---
// src/pages/index.astro
import Ascii from "ascii.rest/astro";
import Banner from "ascii.rest/astro/banner";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>my project</title>
  </head>
  <body>
    <header>
      <Banner text="my project" color={["#f97316", "#f778ba"]} shadow="rounded" effect="type" />
      <p>One line on what it does.</p>
    </header>
    <div class="hero">
      <Ascii piece="night-coast" label="a lighthouse over a dark sea" />
    </div>
  </body>
</html>

<style>
  .hero {
    max-width: 960px;
  }
</style>
```

<div class="demo"><ascii-banner text="my project" color="#f97316,#f778ba" shadow="rounded" effect="type"></ascii-banner></div>

`effect="type"` types the letters in once, and they stay. A scoped `<style>` doesn't reach the tags a component renders, so the example sizes the `<div>` around `<Ascii>`, not `<Ascii>` itself. Every prop is on [astro](/docs/astro/).

## Put your logo beside your name in a README

Use this at the top of a project's README. A README runs no script, so this is an animated SVG that ascii.rest draws for you from a URL.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/my%20project.dark.svg?color=art&art=rust">
  <img alt="my project" src="https://ascii.rest/banner/my%20project.svg?color=art&art=rust">
</picture>
```

<div class="demo"><picture><source media="(prefers-color-scheme: dark)" srcset="/banner/my%20project.dark.svg?color=art&art=rust"><img alt="MY PROJECT beside the rust logo" src="/banner/my%20project.svg?color=art&art=rust" style="max-width: 100%; height: auto"></picture></div>

1. Put your text in the path, up to 20 characters: `/banner/my%20project.svg`. Write each space as `%20`.
2. Add `art=` and the name of any logo, company or distro: `rust`, `typescript`, `arch-linux`.
3. Add `color=art` to colour the letters in the logo's own colour. Or give a colour as six hex digits: `color=f97316`.
4. Paste the snippet into your `README.md`. GitHub shows the `.dark.svg` in its dark theme and the other one in its light theme.

`place=right`, `place=above` or `place=below` moves the logo. Every key is on [github readme](/docs/readme/). [The banner maker](/banner/) builds this snippet for you as you click.

## Add a banner to your GitHub profile

Use this for the README that shows on your GitHub profile page.

1. Make a public repository with exactly the same name as your GitHub username.
2. Add a `README.md` to it. GitHub shows that file at the top of your profile.
3. Paste this into it. Change `your%20name` and the tagline to your own:

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/your%20name.dark.svg?color=f97316,f778ba&tagline=building%20things%20for%20the%20web">
    <img alt="your name: building things for the web" src="https://ascii.rest/banner/your%20name.svg?color=f97316,f778ba&tagline=building%20things%20for%20the%20web">
  </picture>
</p>
```

<div class="demo"><picture><source media="(prefers-color-scheme: dark)" srcset="/banner/your%20name.dark.svg?color=f97316,f778ba&tagline=building%20things%20for%20the%20web"><img alt="YOUR NAME with the tagline: building things for the web" src="/banner/your%20name.svg?color=f97316,f778ba&tagline=building%20things%20for%20the%20web" style="max-width: 100%; height: auto"></picture></div>

The tagline is typed out under your name, up to 60 characters. Write each space as `%20` and each comma as `%2C`. Two or more colours, up to eight, make a fade. `<p align="center">` centres it.

## Serve an SVG from a Next.js route handler

Use this to make the SVGs on your own server, under your own domain.

```ts
// app/ascii/route.ts: /ascii?piece=rust, and &dark for a dark page
import { isPiece, load } from "ascii.rest";
import { svg } from "ascii.rest/svg";

const LOGOS = ["logos", "companies", "distros"];

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const name = query.get("piece") ?? "";
  if (!isPiece(name)) return new Response("there is no piece by that name", { status: 404 });

  const piece = await load[name]();
  if (!LOGOS.includes(piece.meta.category)) return new Response("this route serves logos, companies and distros", { status: 400 });

  return new Response(svg(piece, { dark: query.has("dark") }), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
```

<div class="demo"><picture><source media="(prefers-color-scheme: dark)" srcset="/svg/rust.dark.svg"><img alt="the rust logo, in ascii" src="/svg/rust.svg" width="240" style="max-width: 100%; height: auto"></picture></div>

Use it like any image: `<img src="/ascii?piece=rust" alt="rust">`.

`isPiece()` checks the name, and `load` loads that one piece. The route serves only logos, companies and distros, because their SVGs are small: rust's is 156 KB. A scene's SVG is 5 to 20 MB: see [keep the file small](/docs/svg/#keep-the-file-small).

For a banner, use `bannerSvg()` the same way: [next.js](/docs/nextjs/#serve-a-banner-as-an-svg-from-a-route-handler) has that route. Every option of `svg()` is on [svg](/docs/svg/).

## Make SVGs at build time

Use this to make SVG files once, with no server, from a short Node script: [make your own SVG and commit it](/docs/readme/#make-your-own-svg-and-commit-it) has the script and the steps. For a site, write the files into its static folder, such as `public/`, instead of `.github/`.

## Show a splash screen when your CLI starts

Use this to open your command-line tool with a piece, for a moment, before it gets to work.

```ts
import { play } from "ascii.rest/terminal";

const { interrupted } = await play("rust", { seconds: 2 });
if (interrupted) process.exit(130);

console.log("ready");
```

`play()` shows the piece on its own screen for two seconds, or until any key is pressed. Then the terminal goes back to how it was. Ctrl+C stops it and sets `interrupted`, so the example exits the way Ctrl+C normally does. In a pipe or a CI log, `play()` draws nothing and returns at once. Every option is on [terminal](/docs/terminal/#options-for-play).

To see a piece in your terminal first, run `npx ascii.rest rust`.

## Print a banner when your CLI starts

Use this to print your tool's name in big letters at the top of its output. Unlike a splash screen, it stays in the scrollback with the rest of the output.

```ts
import { banner } from "ascii.rest/terminal";

await banner("my-cli", { color: ["#ff6a00", "#f778ba"], tagline: "v1.0.0" });
console.log("ready");
```

A glint crosses it once, in colour, and then it stays. Here it is without its colours:

```text
▓▓╗     ▓▓╗ ▓▓╗     ▓▓╗           ▓▓▓▓▓▓╗ ▓▓╗       ▓▓╗
▓▓▓▓╗ ▓▓▓▓║ ╚═▓▓╗ ▓▓╔═╝         ▓▓╔═════╝ ▓▓║       ▓▓║
▓▓╔═▓▓╔═▓▓║   ╚═▓▓╔═╝   ▓▓▓▓▓▓╗ ▓▓║       ▓▓║       ▓▓║
▓▓║ ╚═╝ ▓▓║     ▓▓║     ╚═════╝ ▓▓║       ▓▓║       ▓▓║
▓▓║     ▓▓║     ▓▓║             ╚═▓▓▓▓▓▓╗ ▓▓▓▓▓▓▓▓╗ ▓▓║
╚═╝     ╚═╝     ╚═╝               ╚═════╝ ╚═══════╝ ╚═╝
v1.0.0
```

Call it at the start of a line: end any output before it with a newline. It takes every option of [banner()](/docs/banners/#options) except `size` and `max`. It also takes `seconds`, `tagline`, `light` and `out`: see [terminal](/docs/terminal/#options-for-banner).

- In a pipe, it prints at once, with no colour.
- With `NO_COLOR` set, it still moves, but with no colour.
- In a terminal too narrow for it, it prints your text as one plain line.
- Ctrl+C ends the glint, not your program.

To try one without writing code:

```sh
npx ascii.rest banner 'my-cli' --color ff6a00,f778ba --tagline 'v1.0.0'
```

## Next

- [banners](/docs/banners/): every option of a banner, one at a time.
- [github readme](/docs/readme/): every key a banner URL takes.
- [terminal](/docs/terminal/): every option of `play()` and `banner()` in a terminal.
