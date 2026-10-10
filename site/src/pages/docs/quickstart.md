---
layout: ../../layouts/Docs.astro
title: quick start
description: Get an animation on your page in under two minutes, with one script tag, with React or Next.js, or in your terminal.
---

Pick the way that fits your project and follow its steps. Each one ends with something moving on your screen.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/quickstart-2.mp4" poster="https://cdn.ascii.rest/videos/quickstart-2.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>One script tag on a plain page, then npm install and both components in React, then a piece and a banner in the terminal.</figcaption>
</figure>

Two words you will see on every page. A **piece** is one animation, like `donut` or `night-coast`. A **banner** is any text you choose, drawn in big block letters.

## On a plain HTML page

Use this for an HTML file with no build step. There is nothing to install.

1. Add the script tag to your page. It can go in the `<head>` or the `<body>`.

   ```html
   <script type="module" src="https://ascii.rest/ascii.js"></script>
   ```

2. Add a tag where you want the animation. `<ascii-art>` plays a piece. `<ascii-banner>` draws your text as a banner.

   ```html
   <ascii-art piece="donut"></ascii-art>
   <ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner>
   ```

3. Open the page in your browser. The donut turns. A bright band, the glint, sweeps across the banner every few seconds:

   <div class="demo" style="gap: 1.5rem"><ascii-art piece="donut"></ascii-art><ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner></div>

Here is the whole page. Save it as `index.html` and open it. It works straight from your disk, with no local server.

```html
<!doctype html>
<html>
  <body>
    <script type="module" src="https://ascii.rest/ascii.js"></script>

    <ascii-art piece="donut"></ascii-art>
    <ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner>
  </body>
</html>
```

The script loads each piece from ascii.rest the first time your page uses it. To play another piece, change `donut` to any name from [the list of every piece](/#pieces). Every attribute is on [html](/docs/html/).

## In React or Next.js

Use this in a React or Next.js app. The components come from npm.

1. Install the package:

   ```sh
   npm install ascii.rest
   ```

2. Add `<Banner>` and `<Ascii>` to a page. In Next.js, use `app/page.tsx`. In any other React app, use any component.

   ```tsx
   import { Ascii, Banner } from "ascii.rest/react";

   export default function Page() {
     return (
       <main>
         <Banner text="hello" color={["#f97316", "#f778ba"]} />
         <Ascii piece="donut" />
       </main>
     );
   }
   ```

3. Keep the donut's rows close together. The donut is a text piece, drawn in a `<pre>`. `<Ascii>` adds no CSS of its own. So the `<pre>` takes your page's line height and the browser's margin. Change the `<Ascii>` line to this:

   ```tsx
   import { Ascii } from "ascii.rest/react";

   <Ascii piece="donut" style={{ lineHeight: 1.2, margin: 0 }} />
   ```

   The banner needs no change. It has a colour, so it draws on a `<canvas>`. To do this with a class instead, see [set the size](/docs/react/#set-the-size).

4. Run your dev server, then open the URL it prints. For Next.js, that is `http://localhost:3000`.

   ```sh
   npm run dev
   ```

You see this:

<div class="demo" style="gap: 1.5rem"><ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner><ascii-art piece="donut"></ascii-art></div>

`<Banner>` draws any text you give it. `<Ascii>` plays a piece by its name. It loads that piece in the browser when the component mounts. Both are client components, so a Next.js server component can use them without adding `"use client"` yourself. Their props are on [react](/docs/react/). Server components are on [next.js](/docs/nextjs/).

## In your terminal

Use this to see a piece without writing any code. You need Node 18.3 or newer. The first time, `npx` asks to download the package: press `y`.

Play a piece. It plays until you press any key:

```sh
npx ascii.rest donut
```

Print a banner. The glint sweeps across it once. Then the banner stays in your terminal with the rest of your output:

```sh
npx ascii.rest banner "hi"
```

```text
▓▓╗   ▓▓╗ ▓▓╗
▓▓║   ▓▓║ ▓▓║
▓▓▓▓▓▓▓▓║ ▓▓║
▓▓╔═══▓▓║ ▓▓║
▓▓║   ▓▓║ ▓▓║
╚═╝   ╚═╝ ╚═╝
```

Add colour with `--color`. Two or more colours make a fade:

```sh
npx ascii.rest banner "hi" --color f97316,f778ba
```

To see the name of every piece, run `npx ascii.rest list`. Every command and flag is on [cli](/docs/cli/).

## Next

- [examples](/docs/examples/): more small examples you can copy.
- [banners](/docs/banners/): change a banner's font, shadow, colours and motion.
- [github readme](/docs/readme/): put a banner or a logo in your README, as an animated SVG.
