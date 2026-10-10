---
layout: ../../layouts/Docs.astro
title: introduction
description: What ascii.rest is, the ways to use it, and what its 217 pieces are.
---

ascii.rest is a free, open-source library of animated ascii art: 217 small animations, called pieces, and block-letter banners for any text. You can play them on a web page, in a GitHub README or in a terminal.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/intro.mp4" poster="https://cdn.ascii.rest/videos/intro.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>What ascii.rest is: a library of 217 pieces, two React components, a piece of your own made with the kit, the banner maker and image to ascii in the browser, and one piece in React, on a plain page, in a README and in a terminal.</figcaption>
</figure>

To make your own, [the kit](/docs/kit/) turns one line into a piece, with no maths: `sea({ palette: "ocean" })`, `spinning(torus())`, `clockFace()`. When you want more, its parts go all the way down: a formula, a 3D scene, snow, an SVG, an effect on any piece.

ascii.rest is MIT licensed. You can use and change it in any project, free or paid.

## Try it in one minute

Paste these lines into any HTML page. There is nothing to install.

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>

<ascii-art piece="donut"></ascii-art>
<ascii-banner text="hello" color="#f97316,#f778ba" shadow="rounded"></ascii-banner>
```

They draw this:

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

<div class="demo"><ascii-banner text="hello" color="#f97316,#f778ba" shadow="rounded"></ascii-banner></div>

In a React or Next.js app, install the package:

```sh
npm install ascii.rest
```

Then use the components:

```tsx
import { Ascii, Banner } from "ascii.rest/react";

export default function Page() {
  return (
    <>
      <Ascii piece="donut" style={{ lineHeight: 1.2, margin: 0 }} />
      <Banner text="hello" color={["#f97316", "#f778ba"]} shadow="rounded" />
    </>
  );
}
```

`<Ascii>` adds no CSS of its own. The `style` keeps the donut's rows close together.

In a terminal, `npx` plays a piece without installing anything first. You need Node 18.3 or newer. Press any key to stop it.

```sh
npx ascii.rest donut
```

The [quick start](/docs/quickstart/) goes through each of these step by step.

## Choose how to use it

Pick the row that fits your project. Each page has a full example.

| way | best for | docs |
| --- | --- | --- |
| npm package | React, Next.js and Astro apps, or any project with a bundler | [install](/docs/install/), then [react](/docs/react/), [next.js](/docs/nextjs/) or [astro](/docs/astro/) |
| one script tag | a plain HTML page with no build step | [html](/docs/html/) |
| your own copy | the source files in your project, to change as you like | [your own copy](/docs/copy/) |
| an SVG | a GitHub README, or anywhere scripts can't run | [github readme](/docs/readme/), [svg](/docs/svg/) |
| the terminal | a splash screen or a banner for your CLI | [terminal](/docs/terminal/) |
| your own image | your logo or a photo as animated ascii, made in your browser, for a page or a README | [image to ascii](/docs/images/) |
| the kit | your own ascii art in one line: looks, motions and widgets by name, then fields, 3D scenes, particles, effects, layouts, images and SVGs | [the kit](/docs/kit/) |

## Browse the pieces

There are 217 pieces in 15 categories. Each one has its own page at `ascii.rest/<name>/`, where it plays next to the code to use it. You can also [see them all on one page](/#pieces).

| category | pieces | what it holds |
| --- | --- | --- |
| scenes | 15 | full-colour places that move: [night coast](/night-coast/), [tokyo rain](/tokyo-rain/), a misty forest, the Taj Mahal at dawn |
| ui | 12 | parts for a page: [spinners](/spinners/), progress bars, a skeleton loader, a 404, a file tree, a clock |
| data | 10 | live charts and meters: a [bar chart](/bar-chart/), candlesticks, a gauge, sparklines, a heatmap |
| type | 9 | moving text that takes your own words: a [typewriter](/typewriter/), a split-flap board, a marquee, a glitch |
| logos | 29 | logos of programming languages and web tools: [rust](/rust/), [python](/python/), go, typescript and more |
| companies | 21 | company and product logos, like [vercel](/vercel/) and [cloudflare](/cloudflare/) |
| distros | 23 | Linux distribution logos: [arch linux](/arch-linux/), debian, ubuntu, nixos, and [tux](/tux/) the penguin |
| shapes | 12 | 3D shapes that turn: the [donut](/donut/), a cube, a tesseract, a DNA helix |
| space | 11 | planets, a [black hole](/black-hole/), a galaxy, an eclipse, a rocket launch |
| physics | 14 | simulations: a [double pendulum](/double-pendulum/), falling sand, Newton's cradle, smoke |
| nature | 16 | weather, fire and plants: [rain](/rain/), snowfall, an aurora, a campfire, a bonsai |
| creatures | 10 | animals: a sleeping [cat](/cat/), a fox, an owl, a whale, an aquarium |
| objects | 14 | everyday things: an [analog clock](/analog-clock/), a cup of coffee, a lava lamp, a train |
| generative | 13 | maths art: the [mandelbrot](/mandelbrot/) set, a maze, a Game of Life glider gun, Voronoi cells |
| effects | 8 | classic demo effects: [doom fire](/doom-fire/), matrix rain, fireworks, synthwave |

The pieces come in two kinds, and each kind draws in its own way:

- A **text piece** is plain text in your page's colour and font, drawn in a `<pre>`. 129 pieces are text pieces.
- A **coloured piece** has colours of its own and is drawn on a `<canvas>`. The 88 scenes, logos, companies and distros are coloured pieces.

A banner with no colour is drawn like a text piece. A banner with a colour is drawn like a coloured piece.

On a web page, a piece stops and starts on its own:

- It plays only while it is on screen and its tab is open.
- For readers who prefer reduced motion, it holds one still frame.

Besides the pieces, you can turn any text into a banner. Read [banners](/docs/banners/), or make one in the [banner maker](/banner/).

## Use it with an AI coding agent

Give your agent one of these plain-text files. Both are built from these docs pages.

- [ascii.rest/llms.txt](https://ascii.rest/llms.txt): an index, with one line and a link for each docs page. It includes the rules below.
- [ascii.rest/llms-full.txt](https://ascii.rest/llms-full.txt): every docs page in one file, to read all at once.

For example, tell it: "Read https://ascii.rest/llms-full.txt, then add the night-coast piece to my home page."

## Rules for AI coding agents

If your agent can't read web pages, paste these rules into its prompt.

- The npm package is `ascii.rest`. It has no dependencies, and only `ascii.rest/react` needs React.
- A piece's name has dashes, like `night-coast`. Its export from `ascii.rest/pieces` is in camelCase, like `nightCoast`.
- `npx ascii.rest list` prints every piece's name.
- React: `import { Ascii, Banner } from "ascii.rest/react"`. Both are client components already (`"use client"`).
- In a React server component, pass a piece's name, `<Ascii piece="night-coast" />`, not an imported module.
- Plain HTML: `<script type="module" src="https://ascii.rest/ascii.js"></script>`, then `<ascii-art piece="donut"></ascii-art>` or `<ascii-banner text="hello"></ascii-banner>`. Always write the closing tag.
- Astro: `import Ascii from "ascii.rest/astro"` and `import Banner from "ascii.rest/astro/banner"`.
- Text pieces draw in a `<pre>`. Coloured pieces (scenes, logos, companies, distros) and banners with a colour draw on a `<canvas>`.
- React's `<Ascii>` adds no CSS to a text piece's `<pre>`: set `line-height: 1.2; margin: 0` on it. The HTML tags and the Astro components set both for you.
- Size a text piece with `font-size`. Size a coloured piece with `width` (in React, in `style`, not a class), and never set its height.
- Colours are six-digit hex, like `#f97316`. `#fff` and `orange` don't work.
- `banner()` throws on an option it can't take. `<Banner>` and `<ascii-banner>` then draw nothing and `console.warn` why.
- To turn an image into ascii in code, use `fromImage()` from `ascii.rest/kit`: any image in a browser, PNG in Node. The page https://ascii.rest/make/ does the same with no code.
- To make a new piece, use `ascii.rest/kit` (version 0.4.0 or later). Start with a recipe, one call by name with options in words: looks such as `sea({ palette: "ocean" })` or `plasma().mask("HI")`, motions such as `spinning(torus())` or `floating(heart())`, widgets such as `clockFace()`, `gauge({ label: "cpu", value: "64%" })` or `progressBar()`. Only when no recipe fits, go down to `field()`, `scene()`, `particles()`, `picture()`, `fromSvg()`, effects such as `glint()`, layouts such as `grid()`, or `piece()` to draw on a grid.
- Everything the kit makes is a normal piece: pass it to `<Ascii piece={...}>`, `mount()`, `svg()` or `play()`. It also chains: `stars().behind(pulsing(heart())).named("love")`.
- Kit options take words: `speed: "slow"`, `amount: "subtle"`, `every: "rarely"`, a look's `scale: "large"`. Wherever it takes colours it takes a palette's name, such as `"ocean"`, `"fire"` or `"cola"`, as well as `#rrggbb`. A misspelt option or word throws with the ones it takes and a "did you mean".
- The kit's `barChart`, `gauge`, `sparkline`, `marquee`, `typewriter`, `heart` and others share names with library pieces. In one file, `import * as lib from "ascii.rest/pieces"` and use `lib.gauge` beside the kit's `gauge()`.
- In the kit, a frame should depend only on `t`. Use `random(seed)`, never `Math.random()`, and give `period` or `loop` so an SVG loops. `npx ascii.rest play file.ts --watch` plays a file's default export in the terminal as you edit it.

## Next

- [quick start](/docs/quickstart/): from nothing to a piece on your page, one step at a time.
- [examples](/docs/examples/): more examples to copy and paste.
- [banners](/docs/banners/): any text in block letters, with every option.
