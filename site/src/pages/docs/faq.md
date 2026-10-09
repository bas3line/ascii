---
layout: ../../layouts/Docs.astro
title: questions
description: Short answers to the questions people ask most, each with a link to the page that has the details.
---

Short answers to common questions. Each one links to the page with the full details. If your question isn't here, [open an issue](https://github.com/bas3line/ascii/issues/new/choose) on GitHub.

## What is a piece?

A **piece** is one animation, such as [donut](/donut/) or [night coast](/night-coast/). The library has 217 of them. Each piece draws its picture as text. A **frame** is that picture at one moment: a few rows of characters.

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

A piece is a small TypeScript module with two parts. `meta` holds its name, its size in characters and its frame rate. Its default function returns `frame(t)`, which returns the picture at `t` seconds as one string:

```ts
import { donut } from "ascii.rest/pieces";

console.log(donut.meta.cols, donut.meta.rows, donut.meta.fps); // 40 22 30

// The picture at 1.5 seconds: 22 lines of 40 characters.
const frame = donut.default()(1.5);
```

There are two kinds of piece:

- 129 are **text pieces**: plain text in your page's text colour, drawn in a `<pre>`.
- 88 are **coloured pieces**: the scenes, logos, companies and distros. They have colours of their own and draw on a `<canvas>`.

A **banner** is your own text in block letters. `banner()` turns text into a piece, so everything on this page works for banners too. A banner with no colour is drawn like a text piece, and one with a colour like a coloured piece. To write a piece of your own, see [your own pieces](/docs/pieces/).

## How big is it?

Small. Each piece is its own file, and a page downloads only the pieces it uses. The package has no dependencies.

| what | size, gzipped |
| --- | --- |
| [donut](/donut/) | 1 KB |
| [rust](/rust/), a coloured logo | 2 KB |
| a typical piece: half of them are smaller | 2 KB |
| [night coast](/night-coast/), a scene | 5 KB |
| [tokyo rain](/tokyo-rain/), the largest piece | 16 KB |
| `mount()`, which plays a piece | 3 KB |
| `ascii.rest/react`, with `mount()`, `banner()` and the list of piece names, not counting React | 12 KB |
| the script tag: `ascii.js` and the files it loads before any piece | 13 KB |

These are the files as the package ships them, gzipped and rounded to the nearest KB. A bundler that minifies your code makes them smaller still, by about a third or more. 202 of the 217 pieces are under 5 KB. All 217 together come to about 553 KB, but no page loads them all.

## Does it work with server rendering?

Yes. The components and the tags are safe to render on the server. The art starts playing once the page is in the browser.

| what you use | on the server | in the browser |
| --- | --- | --- |
| React `<Ascii>` and `<Banner>` | an empty `<pre>` or `<canvas>` | plays once React hydrates the page |
| Astro `<Ascii>` and `<Banner>` | a still frame, as text. Coloured art gets an empty box in its shape. | plays |
| `import "ascii.rest/element"` | does nothing | defines `<ascii-art>` and `<ascii-banner>` |
| a piece's frame function | works: it returns a string | works |
| `mount()` | fails: it needs a browser | plays |

Call `mount()` only in code that runs in the browser, such as a `useEffect` or a client script. To put a first frame in your server's HTML, call the piece's frame function, as in [what is a piece?](#what-is-a-piece). [react](/docs/react/#show-a-first-frame-before-the-script-runs) shows how to swap it for the live piece.

## Does it work with Next.js?

Yes, with the app router and the pages router. `<Ascii>` and `<Banner>` are client components. The package already marks them with `"use client"`, so you can render them from a server component as they are:

```tsx
// app/page.tsx
import { Ascii, Banner } from "ascii.rest/react";

export default function Page() {
  return (
    <main>
      <Banner text="my project" />
      <Ascii piece="night-coast" />
    </main>
  );
}
```

One rule: in a server component, pass a piece by its name, `piece="donut"`. A piece module, `piece={donut}`, holds a function, and Next.js can't send a function from the server to the browser. To pass a module, import it in your own file that starts with `"use client"`.

A static export (`output: "export"`) works too. See [next.js](/docs/nextjs/).

## Does it work with Astro?

Yes. Import the components and use them. You don't change your Astro config.

```astro
---
import Ascii from "ascii.rest/astro";
import Banner from "ascii.rest/astro/banner";
---

<Banner text="hello" />
<Ascii piece="donut" />
```

They are Astro components, not React ones, so they need no `client:` directive. Astro puts a still frame of text art in your HTML, so it shows before any script runs. Coloured art keeps its space until the script draws it. Then the script makes the art move. See [astro](/docs/astro/).

## Can I use it with Vue, Svelte or another framework?

Yes. Import the tags once, in code that runs in the browser:

```ts
import "ascii.rest/element";
```

Then write the tags in your templates, as you would in HTML: `<ascii-art piece="donut"></ascii-art>` and `<ascii-banner text="hello"></ascii-banner>`. Some frameworks need to be told that a tag is a custom element before they accept it. Your framework's docs on custom elements say how.

You can also play a piece in any element yourself, with `mount()`:

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector<HTMLPreElement>("#art")!, donut);

// Call stop() when you remove the element.
```

See [html](/docs/html/) for the tags and [typescript](/docs/typescript/) for `mount()`.

## Nothing shows up. What should I check?

Check these in order:

1. **The script tag has `type="module"`.** Without it, the script doesn't run.
2. **Every tag has its closing tag.** Write `<ascii-art piece="donut"></ascii-art>`. In HTML, `<ascii-art piece="donut" />` does not close the tag.
3. **The piece's name is right.** A piece's name has dashes: `night-coast`, not `nightCoast`. It is the last part of the piece's URL: ascii.rest/night-coast/ is `night-coast`. In the tag and in React, a wrong name shows nothing and logs nothing. In Astro, it throws when the page renders. `npx ascii.rest list` prints every name.
4. **The browser's console has no warning.** A banner that can't draw says why:

   ```text
   <ascii-banner> could not draw: Error: ascii.rest: a colour takes #rrggbb, not "#fff"
   ```

   Colours need all six digits: `#ffffff`, not `#fff` or `white`. React's `<Banner>` logs the same message, starting with `<Banner> could not draw:`. Astro's `<Banner>` throws the error when the page renders.
5. **A coloured piece has a width.** It fills its container's width. If the container has no width of its own, such as an item in a centred flex row, give the piece one: `width: 320px`.
6. **Your site lets ascii.rest load.** The script tag loads each piece from `https://ascii.rest`. If your site sends a `Content-Security-Policy` header, add `https://ascii.rest` to its `script-src`.

If the art shows but doesn't move, see [does it respect reduced motion?](#does-it-respect-reduced-motion) and [does it slow my page down?](#does-it-slow-my-page-down).

## How do I make it bigger or smaller?

That depends on how the art draws:

| art | draws as | set its size with |
| --- | --- | --- |
| a text piece, such as `donut`, or a banner with no colour | text in a `<pre>` | `font-size` |
| a coloured piece, such as `rust`, or a banner with a colour | a `<canvas>` that fills its container's width | `width` or `max-width` |

With the tags, use CSS:

```css
ascii-art.small {
  font-size: 8px; /* a text piece: smaller characters, smaller art */
}

ascii-art.logo {
  max-width: 240px; /* a coloured piece: its height follows its width */
}
```

In React, use `style`:

```tsx
import { Ascii, Banner } from "ascii.rest/react";

<Ascii piece="donut" style={{ fontSize: 8 }} />   // a text piece
<Ascii piece="rust" style={{ width: 240 }} />     // a coloured piece
<Banner text="hello" max={40} />                  // a banner at most 40 columns wide
```

- Don't set a height on a coloured piece. It stretches the art. The height comes from the width.
- In React, give a coloured piece its `width` in `style`, not in a class. `<Ascii>` sets `width: 100%` inline when `style` has no width, and an inline style beats a class. `max-width` in a class works.
- A banner that is too wide for a phone takes `max`, its widest in columns, or `pixel={1}` for narrower letters. `hello` is 49 columns wide, and 29 with either.

You change how big the art looks, not how many characters it has. A piece always draws `meta.cols` by `meta.rows` characters.

## Does it work in dark mode?

Yes. The art reads your page's text colour and picks its look from it. Dark text means a light page, and light text means a dark page.

- **Text pieces** draw in your CSS `color`, so they follow your theme. Shaded pieces, such as `donut`, also flip their shading on a light page.
- **Logos, companies and distros** have one set of colours for light pages and another for dark pages.
- **Scenes** paint their own background, so they look the same in both themes.
- **Banners** with no `color` are text, so they follow your theme too. A banner with a `color` uses it in both themes, unless you give one for each:

```tsx
import { Banner } from "ascii.rest/react";

<Banner text="hello" color={{ light: "#0969da", dark: "#58a6ff" }} />
```

<div class="demo"><ascii-banner text="hello" options='{"color":{"light":"#0969da","dark":"#58a6ff"}}'></ascii-banner></div>

Switch this site's theme, and the banner above changes colour. The art checks your text colour each time it draws a frame. A piece held still, for reduced motion or with `fps` set to `0`, draws no new frames. It keeps the shading and colours it was drawn with until the page reloads. A coloured piece also redraws when its width changes. Text in a `<pre>` still takes your CSS `color`.

An SVG can't read the page it's on, so each one comes in two files: `<name>.svg` for light pages and `<name>.dark.svg` for dark ones. [github readme](/docs/readme/) shows how to use both.

## Does it respect reduced motion?

Yes. When a reader's system is set to reduce motion, each piece holds one still frame: its first, or the moment the piece picks for this. A typed banner shows all of its letters. SVGs hold still too. If the reader changes the setting while the page is open, the art starts or stops to match.

To test it:

- On a Mac: System Settings, then Accessibility, then Display, then turn on Reduce motion.
- In Chrome: open DevTools, open the Rendering panel, and set "Emulate CSS media feature prefers-reduced-motion" to `reduce`.

If your page has its own play and pause button, you can play a piece for these readers too, with `motion`:

```tsx
import { Ascii } from "ascii.rest/react";

<Ascii piece="donut" options={{ motion: true }} />
```

On the tag, that is `<ascii-art piece="donut" options='{"motion":true}'></ascii-art>`. `<Banner>` and `<ascii-banner>` don't take `motion`.

## Does it slow my page down?

Very little. A piece works only while it is on screen and its tab is open. Scroll it out of view or switch tabs, and it stops drawing. It carries on when it comes back.

Other things keep the cost low:

- By default, a piece draws at most 30 frames a second, not at your screen's full rate. About half draw fewer.
- On a canvas, each frame redraws only the characters that changed.
- A page downloads only the pieces it uses.

To use less, lower the frame rate: `options={{ fps: 12 }}` in React, or `fps="12"` on the tag. The art moves at the same speed, just less smoothly.

## How do I stop it, or show one still frame?

- **One still frame:** set `fps` to `0`. It draws once and stops. For a banner, use `effect="still"`.
- **Stop it:** `mount()` returns a function that stops the piece. `<Ascii>` stops when it unmounts. The tags stop when you remove them from the page.

In React:

```tsx
import { Ascii, Banner } from "ascii.rest/react";

<Ascii piece="donut" options={{ fps: 0 }} />   // one still frame
<Banner text="hello" effect="still" />         // a banner that doesn't move
```

With `mount()`:

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector<HTMLPreElement>("#art")!, donut);

// Later, when you remove the element:
stop();
```

On the tag, one still frame is `<ascii-art piece="donut" fps="0"></ascii-art>`.

## Can screen readers read it?

Yes. The element each piece draws into has `role="img"` and a name, so a screen reader announces one image instead of reading out every character. The name is the piece's name, or a banner's text. Set your own with `label`:

```tsx
import { Ascii } from "ascii.rest/react";

<Ascii piece="night-coast" label="Waves on a coast at night" />
```

On the tags, `label` is an attribute: `<ascii-art piece="night-coast" label="Waves on a coast at night"></ascii-art>`. SVGs have `role="img"` and an `aria-label` too.

## Which browsers does it work in?

Every current browser, on desktop and on phones. Pieces, banners, the tags and the React components need one of these, or newer:

| browser | version |
| --- | --- |
| Chrome and Edge | 93 |
| Firefox | 92 |
| Safari, on Mac and iPhone | 15.4 |

These are the first versions with every JavaScript feature the code uses.

- Some phones' monospace fonts, such as Android's, have no box-drawing characters. There, the tags and the Astro components load a 3 KB font from ascii.rest for just those characters, so the rows line up. For React, [react](/docs/react/#text-pieces-font-size) has the CSS to add.
- Making SVGs in the browser with `ascii.rest/svg` needs Safari 16.4 or newer. The SVG files it makes play in every current browser.
- In a terminal, `npx ascii.rest` needs Node 18.3 or newer.

## Does it work offline?

It depends on how you add it:

| how you add it | works offline? |
| --- | --- |
| `npm install ascii.rest`, in an app you build | yes: the pieces are in your own build |
| your own copy, from shadcn or `npx ascii.rest add` | yes: the files are in your project |
| the script tag, `https://ascii.rest/ascii.js` | no: it loads each piece from ascii.rest |
| an SVG you made with `svg()` or `bannerSvg()` | yes: it is one file with nothing else to load |
| the SVGs hosted at `https://ascii.rest/svg/` and `https://ascii.rest/banner/` | no |
| `npx ascii.rest`, installed in your project | yes, to play pieces and print banners. `add` fetches files from `https://ascii.rest/r`. |

One small exception: the tags and the Astro components point to the 3 KB font on ascii.rest. The browser fetches it only when the system's monospace font lacks box-drawing characters. Offline, those characters come from another font, and the rows may not line up.

## Can I use it in a commercial project?

Yes. ascii.rest is MIT licensed. You can use it in any project, free or paid, open or closed, and change it as you like. The licence asks one thing: keep its copyright and licence notice with every copy of the code. The full text is in [LICENSE](https://github.com/bas3line/ascii/blob/main/LICENSE).

The licence covers the code. The logos of languages, companies and distros are trademarks of their owners. The library shows them to name the language, the company or the distribution. Follow each owner's brand rules when you use one.

## How do I update copied files?

Files you copied never change on their own. Add the item again with `--overwrite`, then check `git diff`: [your own copy](/docs/copy/#update-your-copy) has the steps.

To update the npm package, run `npm install ascii.rest@latest`. The script tag at `https://ascii.rest/ascii.js` always serves the newest version.

## Can I put it in a GitHub README?

Yes, as an animated SVG image. A README can't run scripts, but it can show an SVG:

```md
![rust](https://ascii.rest/svg/rust.svg)
![hello](https://ascii.rest/banner/hello.svg?color=f97316,f778ba)
```

Every logo, company and distro has an SVG at `https://ascii.rest/svg/<name>.svg`. Any text becomes a banner at `https://ascii.rest/banner/<text>.svg`, or you can make one by clicking at the [banner maker](/banner/). For other pieces, make the SVG yourself with `svg()` and commit it. See [github readme](/docs/readme/).

## How do I ask for a logo?

Open a [logo request](https://github.com/bas3line/ascii/issues/new?template=logo.yml) on GitHub. You need a GitHub account. The form asks for:

- whose logo it is;
- what kind: a company, a language, a Linux distro, or other;
- where the official logo is: the owner's brand or press page, or an SVG on Simple Icons or devicon.

To ask for something else to be drawn, [suggest a piece](https://github.com/bas3line/ascii/issues/new?template=piece.yml) instead.

## Where is the source?

On GitHub, at [bas3line/ascii](https://github.com/bas3line/ascii).

| folder | what it holds |
| --- | --- |
| `src/` | the library: `mount()`, `banner()`, `svg()`, the React and Astro components, the tags, `play()` for a terminal, and the `npx ascii.rest` command |
| `src/pieces/` | one file for each piece, such as `src/pieces/donut.ts` |
| `site/` | the ascii.rest website, with these docs in `site/src/pages/docs/` |

Each piece's page on this site shows its source too, with a [copy] button and a link to the file on GitHub. Each docs page has a link to edit it.

## How do I use it with an AI coding agent?

Give your agent one of these plain-text files. Both are made from these docs pages, so they match them.

- [ascii.rest/llms.txt](https://ascii.rest/llms.txt): a list of every docs page, each with one line and a link, and the rules for agents.
- [ascii.rest/llms-full.txt](https://ascii.rest/llms-full.txt): every docs page in one file. Use this one if your agent can read a long page.

Then ask for what you want. For example:

```text
Read https://ascii.rest/llms-full.txt. Then add a typed banner that says "my app" to the top of my home page.
```

If your agent can't read web pages, paste the [rules for AI coding agents](/docs/#rules-for-ai-coding-agents) into your prompt.

## Next

- [install](/docs/install/): every way to add ascii.rest, and which import gives you what.
- [examples](/docs/examples/): recipes to copy and paste, from a hero scene to a CLI splash screen.
- [api](/docs/api/): every function, component and type the package exports.
