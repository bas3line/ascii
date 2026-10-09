---
layout: ../../layouts/Docs.astro
title: next.js
description: Play pieces and banners on Next.js pages, with the app router or the pages router, and serve banners as SVG images.
---

You can play any piece and draw any banner on a Next.js page, with the app router or the pages router. You can also serve a banner as an SVG image from a route handler, or make SVG files when you build.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/react.mp4" poster="https://cdn.ascii.rest/videos/react.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>A Next.js page playing a piece and a banner, with their props changed as it runs.</figcaption>
</figure>

A **piece** is one animation, like `donut` or `night-coast`. A **banner** is any text you choose, drawn in big block letters.

## Add an animation to a page

These steps use the app router. For the pages router, see [use the pages router](#use-the-pages-router).

1. Install the package:

   ```sh
   npm install ascii.rest
   ```

2. Add `<Banner>` and `<Ascii>` to `app/page.tsx`:

   ```tsx
   // app/page.tsx
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

3. Start the dev server, then open `http://localhost:3000`:

   ```sh
   npm run dev
   ```

You see this:

<div class="demo" style="gap: 1.5rem"><ascii-banner text="my project" color="#f97316,#f778ba"></ascii-banner><ascii-art piece="night-coast"></ascii-art></div>

A text piece, like `donut`, draws in a `<pre>` and takes your page's line height. If its rows look spaced apart, see [set the size](/docs/react/#set-the-size).

`app/page.tsx` is a **server component**: it runs on the server. `<Ascii>` and `<Banner>` are **client components**: they also run in the browser, which is where they play. The package already marks them with `"use client"`, so you don't add it yourself.

On the server, they render an empty `<pre>` or `<canvas>`. They start playing once the page loads in the browser.

## Rules for server components

- `<Ascii>` and `<Banner>` work in a server component as they are. Don't add `"use client"` for them.
- In a server component, pass a piece by its name: `<Ascii piece="donut" />`. Passing the module, `<Ascii piece={donut} />`, fails.
- To pass a module, do it inside your own file that starts with `"use client"`.
- The pages router has no server components, so names and modules both work there.

## Pass a piece name from a server component

In a server component, give `<Ascii>` the piece's name, as a string.

Next.js sends a client component's props from the server to the browser. It can only send plain data, like strings, numbers, arrays and plain objects. A piece module, like `donut` from `ascii.rest/pieces`, holds a function, so Next.js stops with an error.

| in a server component | works? | why |
| --- | --- | --- |
| `<Ascii piece="donut" />` | yes | a name is a string |
| `<Ascii piece="donut" options={{ fps: 12 }} />` | yes | the options are plain data |
| `<Banner text="hi" color={["#f97316", "#f778ba"]} />` | yes | every `<Banner>` prop is plain data |
| `<Ascii piece={donut} />` | no | a piece module holds a function |
| `<Ascii piece={banner("hi")} />` | no | `banner()` returns a piece, which holds a function |

A name has two more benefits:

- The piece's code is not in your page's bundle. It loads in the browser when `<Ascii>` mounts.
- TypeScript checks the name, so a typo like `piece="dnout"` is a type error.

To choose a piece on the server and play it in your own client component, pass the name as a prop. Its type is `PieceName`:

```tsx
// player.tsx, next to app/page.tsx
"use client";
import { useState } from "react";
import { Ascii, type PieceName } from "ascii.rest/react";

export function Player({ pieces }: { pieces: PieceName[] }) {
  const [piece, setPiece] = useState(pieces[0]);
  return (
    <div>
      <Ascii piece={piece} />
      {pieces.map((name) => (
        <button key={name} onClick={() => setPiece(name)}>
          {name}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// app/page.tsx
import { Player } from "./player";

export default function Page() {
  return <Player pieces={["donut", "night-coast", "rust"]} />;
}
```

## Play a piece module in a client component

To pass a piece module, import it in a file that starts with `"use client"`. Use this to bundle a piece with your page, so it starts without loading anything more, or to play [a piece you wrote](/docs/pieces/).

```tsx
// donut.tsx, next to app/page.tsx
"use client";
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

export function Donut() {
  return <Ascii piece={donut} options={{ fps: 12 }} />;
}
```

Then use it in any server component:

```tsx
// app/page.tsx
import { Donut } from "./donut";

export default function Page() {
  return <Donut />;
}
```

The module stays inside the client component, so Next.js never has to send a function from the server.

## Use the pages router

The pages router has no server components: every page also runs in the browser. So you can pass a piece by its name or as a module.

```tsx
// pages/index.tsx
import { Ascii, Banner } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

export default function Home() {
  return (
    <main>
      <Banner text="my project" color={["#f97316", "#f778ba"]} />
      <Ascii piece={donut} />
      <Ascii piece="night-coast" />
    </main>
  );
}
```

As in the app router, the components render an empty element on the server and start playing in the browser.

## Serve a banner as an SVG from a route handler

A **route handler** is a `route.ts` file under `app/` that answers requests with your own code. It can send a banner as an animated SVG image, which you can show in an `<img>` tag or in a GitHub README, where scripts don't run. `bannerSvg()` from `ascii.rest/svg` returns the SVG as a string.

1. Create `app/banner/route.ts`:

   ```ts
   // app/banner/route.ts: serves /banner?text=hello
   import { drawable } from "ascii.rest/banner";
   import { bannerSvg } from "ascii.rest/svg";

   export function GET(request: Request) {
     const query = new URL(request.url).searchParams;
     // Keep only the characters the font can draw, and at most 20 of them.
     const text = drawable(query.get("text") ?? "").slice(0, 20);
     if (!text.trim()) {
       return new Response("Send ?text= with letters or digits.", { status: 400 });
     }
     const svg = bannerSvg(text, {
       color: ["#f97316", "#f778ba"],
       dark: query.has("dark"),
     });
     return new Response(svg, {
       headers: {
         "Content-Type": "image/svg+xml",
         "Cache-Control": "public, max-age=86400",
       },
     });
   }
   ```

2. Open `http://localhost:3000/banner?text=hello`. Add `&dark` for the colours of a dark page.

3. Show it on a page with an `<img>` tag:

   ```tsx
   <img src="/banner?text=hello" alt="hello" />
   ```

You see this:

<div class="demo"><picture><source media="(prefers-color-scheme: dark)" srcset="/banner/hello.dark.svg?color=f97316,f778ba"><img alt="HELLO in block letters, fading from orange to pink" src="/banner/hello.svg?color=f97316,f778ba" style="max-width: 100%; height: auto"></picture></div>

Keep the `drawable()` check. `bannerSvg()` throws an error when the font draws none of the text, for example for `?text=***`. `drawable()` keeps only the characters the font can draw, so the handler can answer with a clear 400 instead. The limit of 20 characters stops anyone asking for a huge image.

The `Cache-Control` header lets browsers and caches keep the image for a day.

To show it in a README, use the full URL of your site:

```md
![hello](https://your-site.com/banner?text=hello)
```

`bannerSvg()` takes every option of `banner()`, like `font`, `shadow` and `effect`. It also has options of its own, like `tagline`, `art` and `background`. They are all on [svg](/docs/svg/#make-a-banner-svg). For example, this puts the `rust` logo beside the letters, in its own colour, with a tagline:

```ts
import { rust } from "ascii.rest/pieces";
import { bannerSvg } from "ascii.rest/svg";

const svg = bannerSvg("my project", { art: rust, color: "art", tagline: "made with next.js" });
```

On the pages router, an API route in `pages/api/` can send the same string. Set the `Content-Type` header to `image/svg+xml`, then send `bannerSvg(text)`.

## Make SVG files at build time

Use this when the SVG is always the same, or when you [export a static site](#export-a-static-site). The SVG is made once, when you build, not on every request.

Logos and banners make small SVGs. A scene's SVG is 5 to 20 MB, so show a scene with `<Ascii>` instead. The sizes are in [keep the file small](/docs/svg/#keep-the-file-small).

### Make them with a route handler

Add `export const dynamic = "force-static"`, and don't read the request. Next.js runs the handler once, during `next build`, and saves its answer. The folder name is the URL, so `app/banner.svg/route.ts` serves `/banner.svg`:

```ts
// app/banner.svg/route.ts: made once, by next build
import { rust } from "ascii.rest/pieces";
import { bannerSvg } from "ascii.rest/svg";

export const dynamic = "force-static";

export function GET() {
  const svg = bannerSvg("my project", { art: rust, color: "art", tagline: "made with next.js" });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
```

Show it on a page with an `<img>` tag:

```tsx
<img src="/banner.svg" alt="my project" />
```

**Note:** if your `next.config` turns on `cacheComponents`, leave out the `dynamic` line. Next.js stops the build when it finds it there. You don't need it: with `cacheComponents`, Next.js makes a handler that doesn't read the request at build time on its own.

### Make them with a script

A script can write the files into `public/`, which Next.js serves from the root of your site. Take the script from [github readme](/docs/readme/#make-your-own-svg-and-commit-it), change `.github/` to `public/`, and run it before each build: `"build": "node scripts/banner.ts && next build"`.

## Export a static site

Use this to host your built site as plain files, with no Node server.

1. Set `output` to `"export"` in `next.config.ts`:

   ```ts
   // next.config.ts
   export default {
     output: "export",
   };
   ```

2. Run `npm run build`. Next.js writes your site to the `out` folder.

Here is what works in a static export:

| what | in a static export |
| --- | --- |
| `<Ascii>` and `<Banner>` | work: they play in the browser anyway |
| pieces passed by name | work: each loads from your own site |
| a route handler with `dynamic = "force-static"` | works: its answer is saved as a file, like `out/banner.svg` |
| a route handler that reads the request, like `/banner?text=` | doesn't work: make those SVGs [at build time](#make-svg-files-at-build-time) |

## Next

- [react](/docs/react/): every prop of `<Ascii>` and `<Banner>`, and how to size and colour them.
- [svg](/docs/svg/): every option of `svg()` and `bannerSvg()`.
- [github readme](/docs/readme/): put a banner or a logo in your README.
