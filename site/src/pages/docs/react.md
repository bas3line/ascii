---
layout: ../../layouts/Docs.astro
title: react
description: Play any piece, or draw any text as a banner, in a React or Next.js app.
---

Two components do everything on this page. `<Ascii>` plays a **piece**, which is one animation, such as `donut`. `<Banner>` draws any text you give it in big block letters.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/react.mp4" poster="https://cdn.ascii.rest/videos/react.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>A Next.js page with the Ascii and Banner components, changing their props.</figcaption>
</figure>

1. Install the package:

   ```sh
   npm install ascii.rest
   ```

2. Add both components to a page. Give each one the class `art`:

   ```tsx
   import { Ascii, Banner } from "ascii.rest/react";

   export default function Page() {
     return (
       <main>
         <Banner text="hello" className="art" />
         <Ascii piece="donut" className="art" />
       </main>
     );
   }
   ```

3. Add this CSS to a global stylesheet. In Next.js, that is a CSS file your root layout imports, such as `app/globals.css`. `<Ascii>` adds no CSS of its own. Without this rule, your page's line height can spread the rows apart.

   ```css
   .art {
     margin: 0;
     font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "ascii.rest mono", monospace;
     font-size: 12px;
     line-height: 1.2;
     letter-spacing: 0;
     white-space: pre;
     font-variant-ligatures: none;
   }
   ```

You see this:

<div class="demo"><ascii-banner text="hello"></ascii-banner><ascii-art piece="donut"></ascii-art></div>

This works as it is in a Next.js `app/page.tsx` and in any other React app. [Set the size](#set-the-size) says what each line of the CSS does.

## Play a piece

`<Ascii>` takes a piece and plays it. You can pass the piece itself, or its name.

```tsx
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

<Ascii piece={donut} />                         // a piece you imported
<Ascii piece="night-coast" />                   // a piece by its name
<Ascii piece="donut" options={{ fps: 12 }} />   // 12 frames a second
<Ascii piece="rust" mono />                     // a coloured piece, in one colour
<Ascii piece="donut" label="a turning donut" className="art" />
```

| prop | what it does | default |
| --- | --- | --- |
| `piece` | The piece to play. Either a piece module, such as `donut` from `ascii.rest/pieces`, or a piece's name, such as `"night-coast"`. A banner from `banner()` and [a piece of your own](#play-a-piece-of-your-own) work too. | required |
| `options` | The piece's own options, plus `fps` and `motion`. See [change a piece's options](#change-a-pieces-options). | the piece's own |
| `mono` | Draws a coloured piece as text, in your text colour. | `false` |
| `label` | What the picture shows, for screen readers. The element has `role="img"`, and this is its name. | the piece's name |
| `className` | A class for the element it draws into: a `<pre>`, or a `<canvas>` for a coloured piece. | none |
| `style` | Inline styles for that element. | none |

Every piece's name is in [the list on the home page](/#pieces).

## Import a piece or pass its name

Both ways play the same piece. They differ in when the piece's code loads.

```tsx
import { Ascii } from "ascii.rest/react";
import { nightCoast } from "ascii.rest/pieces";

<Ascii piece={nightCoast} />    // imported: part of your page's JavaScript
<Ascii piece="night-coast" />   // by name: fetched when the component mounts
```

| | import the module | pass its name |
| --- | --- | --- |
| how you write it | `piece={nightCoast}` | `piece="night-coast"` |
| which name | its export, in camelCase: `nightCoast` | the piece's name, with dashes: `night-coast` |
| when its code loads | with your page's JavaScript | as a small file of its own, when the component mounts |
| from a Next.js server component | no: see [use it in a server component](#use-it-in-a-server-component) | yes |

Pass a name to keep pieces out of your page's first load, or to choose a piece while the app runs. Import the module when you want it to draw the moment the component mounts, or when you need its `meta`, such as `donut.meta.cols`.

Each piece is also a module of its own, if you'd rather import just that file:

```tsx
import * as donut from "ascii.rest/pieces/donut";
```

## Change a piece's options

`options` changes how a piece looks or moves. It takes the piece's own options, plus two that work on every piece: `fps` and `motion`.

```tsx
import { Ascii } from "ascii.rest/react";

<Ascii piece="big-text" options={{ text: "hello" }} />      // big-text's own option
<Ascii piece="bouncing-balls" options={{ balls: 5 }} />    // five balls instead of three
<Ascii piece="donut" options={{ fps: 12 }} />               // 12 frames a second
<Ascii piece="donut" options={{ fps: 0 }} />                // one still frame
```

The first line draws this:

<div class="demo"><ascii-art piece="big-text" options='{"text":"hello"}'></ascii-art></div>

| option | what it does | default |
| --- | --- | --- |
| `fps` | Frames a second. Fewer frames use less CPU and look less smooth, but the motion keeps its speed. `0` draws one still frame. | the piece's own |
| `motion` | `true` keeps it playing for readers who set their system to reduce motion. Use it only when your page has its own play button. | `false` |
| any other name | One of the piece's own options, such as `text` for big-text. | the piece's own |

A piece lists its options in `meta.options`. You can read them in the source on the piece's page, such as [big text](/big-text/). TypeScript doesn't check these names, so a misspelt option is ignored and the piece uses its default.

Changing `options` starts the piece again from its first frame. Writing the object inline is fine: `<Ascii>` compares the values, not the object.

## Draw a coloured piece in one colour

A **coloured piece** has colours of its own, such as `rust` or `night-coast`, and draws on a `<canvas>`. Add `mono` to draw it as text instead, in your page's text colour.

```tsx
import { Ascii } from "ascii.rest/react";

<Ascii piece="rust" />        // Rust's orange, on a canvas
<Ascii piece="rust" mono />   // text, in your text colour
```

<div class="demo"><ascii-art piece="rust" mono></ascii-art></div>

With `mono`, the piece is text, so you size it with `font-size`, like any text piece. To check whether a piece has colours, use `canvas.has("rust")` from `ascii.rest`.

## Set the size

Text pieces and coloured pieces are sized in different ways. A text piece is a `<pre>` and follows `font-size`. A coloured piece is a `<canvas>` and follows its width.

### Text pieces: font-size

`<Ascii>` adds no CSS of its own, so a text piece needs the `.art` rule from the top of this page. Each line of it does one job:

- `font-size` sets the size. Larger text makes a larger piece.
- `line-height: 1.2` keeps the rows close together, as on this site.
- `margin: 0` removes the space a browser puts above and below a `<pre>`.
- `font-family` picks a monospace font, so every character takes the same width.
- `letter-spacing`, `white-space` and `font-variant-ligatures` stop your page's own CSS from wrapping rows or pulling characters out of line.

These are the same rules the `<ascii-art>` tag uses.

Some phones have a monospace font with no box or block characters, and there the rows lose their width. To fix that, also add this `@font-face`. It loads a 3 KB font from ascii.rest and uses it only for those characters. The `.art` rule already names it.

```css
@font-face {
  font-family: "ascii.rest mono";
  src: url("https://ascii.rest/fonts/ascii-rest-mono.woff2") format("woff2");
  unicode-range: U+00B0, U+00B7, U+2022, U+2500-259F, U+25CF;
  font-display: swap;
}
```

The piece's colour is your CSS `color`. The piece reads that colour too: dark text tells it the page is light, and it shades itself to suit.

### Coloured pieces: width

A coloured piece fills the width of its container. Its height follows from its shape. To make it smaller, give it a width in `style`:

```tsx
import { Ascii, Banner } from "ascii.rest/react";

<Ascii piece="rust" style={{ width: 160 }} />
<Ascii piece="night-coast" style={{ maxWidth: 480 }} />
<Banner text="hello" color="#f97316" style={{ width: 300 }} />
```

- Don't set `width` with a class, such as Tailwind's `w-40`. When `style` has no width, `<Ascii>` sets `width: 100%` inline, and inline styles beat classes. Put the width in `style`, or use `max-width` in a class.
- Don't set a height. The height comes from the width.

## Draw text as a banner

`<Banner>` draws any text in block letters. By default, a glint sweeps across it every few seconds.

```tsx
import { Banner } from "ascii.rest/react";

<Banner text="hello" />
<Banner text="hello" shadow="rounded" effect="type" />
<Banner text="hello" color={["#f97316", "#f778ba"]} />
<Banner text="hello" font="slim" pixel={1} fill="#" />
<Banner text="hello" color={{ light: "#1f2328", dark: "#f0f6fc" }} />
```

The second, third and fourth lines draw these:

<div class="demo"><ascii-banner text="hello" shadow="rounded" effect="type"></ascii-banner></div>
<div class="demo"><ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner></div>
<div class="demo"><ascii-banner text="hello" font="slim" pixel="1" fill="#"></ascii-banner></div>

The text can use the letters A to Z, the digits 0 to 9, spaces, and `. , ! ? ' : - + = / _`. Lower case letters are drawn as capitals, except in the `mixed` font. Any other character is left out.

With no `color` and no `shadowColor`, a banner is drawn like a text piece: in a `<pre>`, in your text colour, sized with `font-size`. With either one, it is drawn like a coloured piece: on a canvas, in those colours, sized with its width. See [set the size](#set-the-size).

Every option of `banner()` is a prop of `<Banner>`, with the same name and value. [Banner options](/docs/banners/#options) lists them all, with their defaults. `<Banner>` also takes these props of its own:

| prop | what it does | default |
| --- | --- | --- |
| `text` | The text to draw. | required |
| `label` | What the banner says, for screen readers. It wins over the `name` option. | `name`, or else the text |
| `mono` | Draws a coloured banner as text, in your text colour. | `false` |
| `fps` | Frames a second. `0` is ignored: for a banner that doesn't move, use `effect="still"`. | `24`, or `0` with `effect="still"` |
| `className` | A class for the element it draws into: a `<pre>`, or a `<canvas>` for a banner with a colour. | none |
| `style` | Inline styles for that element. | none |

`<Banner>` draws nothing when `banner()` throws, as it does for an option it can't take, such as the colour `"orange"`. The browser console says why, in a line that starts `<Banner> could not draw:`.

## Play a piece of your own

A piece is an object with two parts. `meta` says its size and speed. `default` returns a function that draws each **frame**, the picture at one moment, as a string. Anything that follows [the piece contract](/docs/pieces/) plays in `<Ascii>`.

```tsx
"use client";
import { Ascii } from "ascii.rest/react";
import type { Piece } from "ascii.rest";

const loading: Piece = {
  // 10 columns, 1 row, 4 frames a second.
  meta: { name: "loading", category: "ui", note: "dots that fill in, one at a time", cols: 10, rows: 1, fps: 4 },
  // The frame at t seconds: one row of exactly 10 characters.
  default: () => (t) => `loading${".".repeat(Math.floor(t * 2) % 4)}`.padEnd(10),
};

export function Loading() {
  return <Ascii piece={loading} />;
}
```

A banner from `banner()` is a piece too:

```tsx
"use client";
import { Ascii } from "ascii.rest/react";
import { banner } from "ascii.rest/banner";

const hello = banner("hello", { shadow: "rounded" });

export function Hello() {
  return <Ascii piece={hello} />;
}
```

Make the piece once, outside the component, as both examples do. A new piece on every render starts it again each time. In the Next.js app router, keep it in a file that starts with `"use client"`, because a server component can't pass a piece to `<Ascii>`.

## Use it in a server component

`<Ascii>` and `<Banner>` are client components. The package marks them with `"use client"`, so in the Next.js app router you can render them from a server component without adding it yourself.

```tsx
// app/page.tsx: a server component
import { Ascii, Banner } from "ascii.rest/react";

export default function Page() {
  return (
    <main>
      <Banner text="my project" color={["#f97316", "#f778ba"]} />
      <Ascii piece="night-coast" />
    </main>
  );
}
```

A server component can pass strings, numbers, lists and plain objects to a client component. So every `<Banner>` prop works, and so does a piece's name. A piece module, or a piece you made, is code, and it can't be passed. To use one, import it in a client component of your own:

```tsx
// app/donut.tsx
"use client";
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

export function Donut() {
  return <Ascii piece={donut} />;
}
```

Then render `<Donut />` from your server component. In a React app with no server components, such as a Vite app, `"use client"` does nothing, and both components work anywhere.

## Common problems

### Nothing shows

`<Banner>` draws nothing when `banner()` throws, and the browser console says why, in a line that starts `<Banner> could not draw:`. For the other causes, such as a misspelt piece name or a coloured piece in a container with no width, work through [the checklist in questions](/docs/faq/#nothing-shows-up-what-should-i-check).

### It doesn't move

- **Your system is set to reduce motion.** A piece then shows one still frame. A typed banner shows all its letters. Pass `options={{ motion: true }}` only if your page has its own play button.
- **It is off screen, or the tab is hidden.** A piece pauses then, and carries on when it is back in view.
- **It is meant to be still.** Its `options` set `fps: 0`, or the banner has `effect="still"`.
- **It is a typed banner.** With `effect="type"`, the letters type in once and then stay.

### It is the wrong size

- **The rows are spaced apart, or there is a gap above and below.** The `<pre>` took your page's `line-height` and the browser's margin. Add the `.art` rule from the top of this page, which sets `line-height: 1.2` and `margin: 0`.
- **A text piece is too big or too small.** Change its `font-size`.
- **A text banner is wider than a phone.** Pass `max`, the widest it may be in columns, or `pixel={1}`. `<Banner text="hello" />` is 49 columns wide, and 29 with `pixel={1}`. For text that is still too wide, use a smaller `font-size`.
- **A coloured piece is too big.** It fills its container. Set a width in `style`, not in a class: a class's `width` is overruled.
- **A coloured piece is stretched.** Remove any `height` you set on it. Its height follows its width.
- **The rows don't line up on some phones.** Add the `@font-face` from [set the size](#set-the-size).

### It starts again on every render

`<Ascii>` starts a piece again when the piece, its options or `mono` change. These can change on every render without you meaning them to:

```tsx
import { Ascii, Banner } from "ascii.rest/react";
import { banner } from "ascii.rest/banner";

// Starts again on every render: banner() makes a new piece each time.
<Ascii piece={banner("hello")} />

// Plays on: <Banner> makes a new piece only when the text or an option changes.
<Banner text="hello" />
```

- **A piece made during render.** This is `banner("hello")` in the JSX, or a piece of your own written inside the component. Make it outside the component, or in `useMemo`, or use `<Banner>`.
- **An option that changes each time.** For example, `Date.now()` or `Math.random()` in `options`. An inline object is fine. Only a changed value starts it again.
- **The component mounting again.** A `key` that changes, or a parent that removes it and adds it back, starts it from the beginning.

## Show a first frame before the script runs

This section is for server-rendered apps that want art in the HTML before any script runs. Most pages don't need it.

On the server, `<Ascii>` and `<Banner>` render an empty `<pre>` or `<canvas>`. The piece draws its first frame in the browser, after React hydrates the page. To put a first frame in the HTML, draw it yourself. A frame is just a string.

```tsx
"use client";
import { useEffect, useState } from "react";
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

// The picture at 0 seconds, as text. This runs on the server too.
const first = donut.default()(0);

export function Donut() {
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  if (!live) return <pre className="art" role="img" aria-label="donut">{first}</pre>;
  return <Ascii piece={donut} className="art" />;
}
```

1. `donut.default()` makes the piece's frame function. Calling it with `0` gives the picture at 0 seconds.
2. The server, and the browser's first render, show that picture in a plain `<pre>`.
3. Once the component mounts, `<Ascii>` takes its place and plays on from that same picture.

A few things to know:

- To pass a piece's options, give them to `default()`: `bigText.default({ text: "hello" })(0)`.
- On a light page, ask for the light version: `donut.default()(0, { paper: true })`. In the browser, `<Ascii>` works this out from your text colour, but the server can't.
- A piece that reads the clock, such as `digital-clock`, draws a different picture on the server than in the browser, and React reports a hydration mismatch. Let those start in the browser.

A coloured piece has no text to show. Keep its space instead, so the page doesn't jump when it draws:

```tsx
"use client";
import { Ascii } from "ascii.rest/react";
import { rust } from "ascii.rest/pieces";
import type { Piece } from "ascii.rest";

// Width to height of the canvas. Each cell is twice as tall as it is wide, unless meta.cell is 1.
const shape = ({ meta }: Piece) => `${meta.cols} / ${meta.rows * (meta.cell ?? 2)}`;

export function Rust() {
  return <Ascii piece={rust} style={{ width: "100%", aspectRatio: shape(rust) }} />;
}
```

This is the same shape `<Ascii>` gives the canvas once it starts, so nothing moves.

## Next

- [next.js](/docs/nextjs/): the app router, the pages router, and a banner served as an SVG from a route handler.
- [banners](/docs/banners/): fonts, shadows, colours and motion, with examples.
- [your own pieces](/docs/pieces/): write a piece from scratch.
