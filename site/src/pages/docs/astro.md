---
layout: ../../layouts/Docs.astro
title: astro
description: Add an animation or a text banner to an Astro page, with its first frame already in the HTML.
---

Two components add ascii art to an Astro page. `<Ascii>` plays a **piece**, which is one animation, such as `donut`. `<Banner>` draws any text you give it in big block letters.

1. Install the package in your Astro project:

   ```sh
   npm install ascii.rest
   ```

2. Add the components to a page, such as `src/pages/index.astro`. The imports go between the `---` lines at the top:

   ```astro
   ---
   import Ascii from "ascii.rest/astro";
   import Banner from "ascii.rest/astro/banner";
   ---

   <Banner text="hello" />
   <Ascii piece="donut" />
   ```

3. Run `npm run dev` and open `http://localhost:4321`. You see this:

   <div class="demo" style="gap: 1.5rem"><ascii-banner text="hello"></ascii-banner><ascii-art piece="donut"></ascii-art></div>

Astro draws the first **frame**, the picture at one moment, on the server and puts it in your HTML. Readers see the art before any script runs. Then a script makes it move. A coloured piece, like `night-coast`, shows as an empty box until the script draws it: see [what shows before the script runs](#see-what-shows-before-the-script-runs).

You don't need to change your Astro config. The components are plain `.astro` files inside the package.

## Play a piece with Ascii

`<Ascii>` plays one piece from the library, by its name.

```astro
---
import Ascii from "ascii.rest/astro";
---

<Ascii piece="donut" />
<Ascii piece="night-coast" fps={12} />
<Ascii piece="big-text" options={{ text: "astro" }} />
<Ascii piece="rust" mono />
```

- `donut` plays with its own settings.
- `night-coast` plays at 12 frames a second instead of its own rate.
- `big-text` draws "astro" instead of its default text.
- `rust` is a coloured logo. `mono` draws it as text in your text colour.

The last two draw these:

<div class="demo"><ascii-art piece="big-text" options='{"text":"astro"}'></ascii-art></div>
<div class="demo"><ascii-art piece="rust" mono></ascii-art></div>

| prop | what it does | default |
| --- | --- | --- |
| `piece` | The piece to play, by its name, such as `"donut"` or `"night-coast"`. | required |
| `options` | The piece's own options, such as `{ text: "astro" }` for `big-text`. It also takes `motion: true`, which keeps the piece playing for readers who set their system to reduce motion. Use that only if your page has its own way to stop it. | the piece's own |
| `fps` | Frames a second, instead of the piece's own rate. `0` draws one still frame. | the piece's own |
| `label` | What the picture shows, for screen readers. | the piece's name |
| `mono` | Draws a coloured piece as text, in your text colour. | `false` |
| `class` | A class for the `<ascii-art>` element it renders. | none |

To find a name, browse [every piece](/#pieces) or run `npx ascii.rest list`. Each piece's page, such as [big text](/big-text/), has an **astro** tab with the code ready to copy, options included.

If a name is wrong, Astro prints this error in your terminal, and `astro build` stops:

```text
ascii.rest: there is no piece named "donnut"
```

## Draw your own text with Banner

`<Banner>` draws any text in block letters with a drop shadow. By default, a glint crosses it every few seconds.

```astro
---
import Banner from "ascii.rest/astro/banner";
---

<Banner text="hello" />
<Banner text="hello" shadow="rounded" effect="type" />
<Banner text="hello" font="slim" shadow="none" />
<Banner text="hello" color={["#f97316", "#f778ba"]} />
```

The second, third and fourth lines draw these:

<div class="demo"><ascii-banner text="hello" shadow="rounded" effect="type"></ascii-banner></div>
<div class="demo"><ascii-banner text="hello" font="slim" shadow="none"></ascii-banner></div>
<div class="demo"><ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner></div>

The text can use the letters A to Z, the digits 0 to 9, spaces, and `. , ! ? ' : - + = / _`. Lower case letters are drawn as capitals, except in the `mixed` font. Any other character is left out. If none of your text can be drawn, Astro prints this error, and `astro build` stops:

```text
ascii.rest: the font draws none of "日本"
```

Every option of `banner()` is a prop of `<Banner>`, with the same name and value. [Banner options](/docs/banners/#options) lists them all, with their defaults. `<Banner>` also takes these props of its own:

| prop | what it does | default |
| --- | --- | --- |
| `text` | The text to draw. | required |
| `label` | What the banner says, for screen readers. It wins over the `name` option. | `name`, or else the text |
| `mono` | Draws a coloured banner as text, in your text colour. | `false` |
| `class` | A class for the `<ascii-banner>` element it renders. | none |

### Use the same look on every page

Keep the options in one file:

```ts
// src/brand.ts
import type { BannerOptions } from "ascii.rest/banner";

export const brand: BannerOptions = {
  font: "slim",
  shadow: "rounded",
  effect: "type",
};
```

Then spread them onto each `<Banner>`, here from a page in `src/pages/`:

```astro
---
import Banner from "ascii.rest/astro/banner";
import { brand } from "../brand";
---

<Banner text="docs" {...brand} />
```

## See what shows before the script runs

Astro runs each component on the server when it builds or serves the page. What goes into the HTML depends on whether the art has colour.

| art | what the HTML holds before any script runs |
| --- | --- |
| a text piece, such as `donut` | its first frame, as text in a `<pre>` |
| a coloured piece, such as `night-coast` or `rust` | an empty box the shape of the art, filled with its background colour if it has one |
| a coloured piece with `mono` | its first frame, as text |
| a banner with no `color` and no `shadowColor` | the whole banner, as text |
| a banner with `color` or `shadowColor` | an empty box the shape of the banner |

Coloured art draws on a `<canvas>`, which needs the browser. The empty box keeps its space, so the page doesn't jump when the art appears. If you need the art in the HTML, use `mono`, or leave `color` off a banner and colour it with CSS.

For example, `<Banner text="hi" />` puts this in your page:

```html
<ascii-banner text="hi">
  <pre role="img" aria-label="hi">▓▓╗   ▓▓╗ ▓▓╗
▓▓║   ▓▓║ ▓▓║
▓▓▓▓▓▓▓▓║ ▓▓║
▓▓╔═══▓▓║ ▓▓║
▓▓║   ▓▓║ ▓▓║
╚═╝   ╚═╝ ╚═╝</pre>
</ascii-banner>
```

A typed banner is drawn with every letter showing. With the default timing, a glinting banner is drawn before its first glint.

Each component also adds one script to the page, however many times you use it. In the browser, that script:

- swaps the server's frame for the moving art;
- plays it only while it is on screen and the tab is open;
- holds one frame still if the reader's system is set to reduce motion. A typed banner then shows every letter.

The server draws each frame as it looks on a dark page. On a light page, some art changes its characters when the script starts. A banner's `▓` becomes `█`, and shaded pieces such as `donut` flip their shading to suit.

Your build output gets one file for every piece in the library. The browser downloads only the pieces your page uses.

## Style the art

Each component renders a custom element: `<ascii-art>` for `<Ascii>`, and `<ascii-banner>` for `<Banner>`. Inside it is a `<pre>` for text, or a `<canvas>` for coloured art.

The components add these defaults. They are inside `:where()`, which has no specificity, so any rule of yours wins.

| element | default |
| --- | --- |
| `ascii-art`, `ascii-banner` | `display: block` |
| the `<pre>` inside | `margin: 0`, the same font size as the element, a monospace font, `line-height: 1.2`, `letter-spacing: 0`, `white-space: pre`, no ligatures |

The monospace font is your system's own. Where it lacks the box and block characters, a 3 KB font from ascii.rest fills them in, so every row keeps its width.

### Change the size and colour

Text art takes its size and colour from the element. Set `font-size` and `color` on its class:

```astro
---
import Ascii from "ascii.rest/astro";
---

<Ascii piece="donut" class="art" />

<style is:global>
  .art {
    font-size: 10px;
    color: #f97316;
  }
</style>
```

Coloured art fills the element's width, and its height follows from its shape. Set a `width` or `max-width` to size it. Don't set a height.

```astro
---
import Ascii from "ascii.rest/astro";
---

<Ascii piece="night-coast" class="scene" />

<style is:global>
  .scene {
    max-width: 480px;
  }
</style>
```

A coloured banner reads your text colour to pick its colours. With `color={{ light: "#1f2328", dark: "#f0f6fc" }}`, it uses `light` when your text is dark, and `dark` when your text is light.

### Use a global style

Astro scopes a plain `<style>` block to the elements written in the same file. The components write `<ascii-art>` and `<ascii-banner>` themselves, so a scoped rule never reaches them. Use one of these instead:

```astro
<!-- the whole block is global -->
<style is:global>
  .art {
    font-size: 10px;
  }
</style>

<!-- the block stays scoped, and this one rule is global -->
<style>
  :global(.art) {
    font-size: 10px;
  }
</style>
```

## Build a landing page

This is a whole page. Paste it into `src/pages/index.astro`. It has a typed banner for the name, a line of text, and a coloured scene.

```astro
---
import Ascii from "ascii.rest/astro";
import Banner from "ascii.rest/astro/banner";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>my app</title>
  </head>
  <body>
    <main>
      <Banner text="my app" effect="type" shadow="rounded" class="logo" />
      <p>A short line about what your app does.</p>
      <Ascii piece="night-coast" label="A coast at night" class="scene" />
    </main>
  </body>
</html>

<style is:global>
  body {
    margin: 0;
    background: #0d1117;
    color: #f0f6fc;
    font-family: system-ui, sans-serif;
  }

  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 16px;
  }

  .logo {
    font-size: 12px;
    color: #f97316;
  }

  .scene {
    margin-top: 32px;
  }
</style>
```

<div class="demo" style="gap: 1.5rem"><ascii-banner text="my app" effect="type" shadow="rounded" style="color: #f97316"></ascii-banner><ascii-art piece="night-coast" style="width: 100%; max-width: 480px"></ascii-art></div>

- The banner has no `color`, so its letters are in the HTML as text. The `.logo` rule makes them orange.
- The scene is coloured, so the HTML holds a dark box in its shape. The script paints the scene into it.
- All the CSS is in `<style is:global>`, so it reaches the elements the components render.

## Common problems

- **A style has no effect.** It is probably in a scoped `<style>` block. Use `<style is:global>` or `:global()`, as in [use a global style](#use-a-global-style).
- **The rows are spaced apart.** Your rules win over the defaults, so a site-wide rule such as `pre { line-height: 1.8 }` reaches the art too. Reset it for the art: `ascii-art pre, ascii-banner pre { margin: 0; line-height: 1.2; }`.
- **Coloured art is an empty box.** The script hasn't run yet, or JavaScript is off. Use `mono`, or a banner without `color`, to have text in the HTML.
- **It doesn't move.** The reader's system is set to reduce motion, the art is off screen, or it is a banner with `effect="type"` or `effect="still"`. A typed banner types in once, then stays.
- **The build stops, or the terminal shows an error.** A piece name is wrong, or a banner can't draw your text or take an option, such as `color="orange"` (it takes `#rrggbb`). The message says what to change.

If nothing shows at all, work through [the checklist in questions](/docs/faq/#nothing-shows-up-what-should-i-check).

## Next

- [banners](/docs/banners/): fonts, shadows, colours and motion, with examples.
- [html](/docs/html/): the `<ascii-art>` and `<ascii-banner>` tags these components render.
- [examples](/docs/examples/): more small examples to copy.
