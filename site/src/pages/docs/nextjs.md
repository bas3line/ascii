---
layout: ../../layouts/Docs.astro
title: next.js
description: The app router, the pages router, a banner served as an SVG from a route handler, and static export.
---

## The app router

`<Ascii>` and `<Banner>` are client components, marked `"use client"` in the package, so a server component can render them as they are:

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

A piece passed by name, `piece="night-coast"`, is fetched in the browser when it mounts, so it adds nothing to the first load. Passing a module, `piece={nightCoast}`, bundles it with the page instead.

A piece module is code, not data, so it can't cross from a server component into a client one as a prop. Pass its name across, or import the module in the client component that uses it.

## The pages router

The same components, in any page:

```tsx
// pages/index.tsx
import { Ascii } from "ascii.rest/react";

export default function Home() {
  return <Ascii piece="donut" />;
}
```

## A banner as an SVG, from a route handler

`bannerSvg()` and `svg()` return a string, so a route handler can serve one, for a README, an email or an `<img>`:

```ts
// app/banner/route.ts: /banner?text=hello, and &dark for a dark page
import { drawable } from "ascii.rest/banner";
import { rust } from "ascii.rest/pieces";
import { bannerSvg } from "ascii.rest/svg";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const text = drawable(query.get("text") ?? "").slice(0, 20);
  if (!text.trim()) return new Response("a banner takes letters and digits", { status: 400 });
  const svg = bannerSvg(text, { dark: query.has("dark"), art: rust, color: "art", tagline: "made with next.js" });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
```

`bannerSvg()` throws when the font draws none of the text, so the handler keeps only what `drawable()` says it can draw. Every option is on [svg](/docs/svg/#bannersvg).

## At build time

`svg()` and `bannerSvg()` run anywhere JavaScript does. To make a file once, in a script or `generateStaticParams`:

```ts
import { writeFileSync } from "node:fs";
import { svg } from "ascii.rest/svg";
import { donut } from "ascii.rest/pieces";

writeFileSync("public/donut.svg", svg(donut, { seconds: 4 }));
```

## Static export

With `output: "export"` the components work as they do anywhere: they start in the browser. A route handler that makes SVGs needs a server, so render those at build time instead.
