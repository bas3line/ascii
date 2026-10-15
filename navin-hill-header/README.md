# A scene as a page header, for navin_hill

Two files to drop in: `page-header.tsx` and `page-header.css` (put them in `src/components/`).

## Install

```sh
pnpm add ascii.rest
```

One package, no runtime dependencies, `react >= 18` its only peer (the app is on 19.2.8). Checked on this clone's 0.4.0 build: the compiled modules import each other with plain `.js` specifiers, so Turbopack and webpack resolve them with no config.

## Use

```tsx
// app/[category]/page.tsx — a server component
import { PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader piece="night-coast" eyebrow="manipal" title="the coast road" />
      {/* …the rest of the page */}
    </>
  );
}
```

Pass the piece **by name**, not as an imported module: `page-header.tsx` is a `"use client"` island, and props crossing in from a server component must be serializable — a piece module is a function. The name is a string, and `<Ascii>` fetches that piece's own chunk when it mounts.

## What was measured, not guessed

| | |
| --- | --- |
| Geometry | Every scene is **200×100 cells at 15fps**, `cell: 1`. `mount()` gives the canvas `width: 100%` and `aspect-ratio: 200 / 100`: exactly **2:1**. Measured in Chrome: 1280px wide → a 1280×640 canvas. At 1440px the natural hero is 720px tall. |
| The band crop | A 300px `overflow: hidden` box showed the scene's middle band cleanly, no page errors. The scene keeps drawing at the container's full width, so the horizon, moon and lighthouse stay put; only what is above and below is cut. |
| Cost | ≈5.8ms of CPU a frame for a 200×100 scene (the repo's own checker). Play time advances only while the header is on screen and the tab is visible, and stops entirely on unmount. |
| A still | `options={{ fps: 0 }}` draws one frame and never starts the loop. |
| Reduced motion | For a reader who prefers reduced motion, the piece holds its still frame on its own. Pass `options={{ motion: true }}` only behind a control the reader presses (`<PageHeader options={{ motion: playing }} … />`). |
| Don't use an SVG | `svg(nightCoast)` is **3.1 MB** and the library's own 1 MB budget warns about it. SVGs are for READMEs and single small pieces; a full scene belongs on a canvas. |

## If you would rather own the code

```sh
npx ascii.rest add ascii night-coast --dir src/components/ascii-rest
```

Writes four files (verified): `types.ts`, `mount.ts`, `ascii.tsx`, `pieces/night-coast.ts` — self-contained, imports nothing from `ascii.rest`, needs only React. Two differences: the copied component takes a **module** (`import * as nightCoast from "@/components/ascii-rest/pieces/night-coast"; <Ascii piece={nightCoast} />`), and it no longer loads pieces by name.

Give it its own folder. This repo's `src/components/ascii/` already holds `ascii.css`, `ascii-canvas.tsx` and `ascii-section.tsx` from the existing effect system, and `add`'s default `--dir` is `src/components/ascii`.

## Related

- **Text headers** (your name in block letters instead of a scene): `banner("navin hill", { font: "slim", color: ["#f97316", "#f778ba"] })` from `ascii.rest/banner`, then `<Ascii piece={banner(...)} />`. It renders in a `<pre>` and its block glyphs (U+2500–259F) need a face that has them — add the font stack the site uses:
  ```css
  @font-face {
    font-family: "ascii.rest mono";
    src: url("https://ascii.rest/fonts/ascii-rest-mono.woff2") format("woff2");
    unicode-range: U+00B0, U+00B7, U+2022, U+2500-259F, U+25CF;
  }
  .page-header__art { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "ascii.rest mono", monospace; }
  ```
  Scenes don't need this — they are canvas.
- **Previewing**: `npx ascii.rest marine-drive` plays any piece in the terminal; `npx ascii.rest list` writes every name by category.
- **All 14 scenes** (all 200×100, 15fps): alpine-dawn, aurora-fjord, deep-reef, desert-night, earthrise, kyoto-dusk, lantern-lake, marine-drive, misty-forest, night-coast, ocean-sunset, storm-plains, taj-dawn, varanasi-ghats. `tokyo-rain` also exists — it is the one scene the repo's checker flags as slow (122ms worst frame).

## Wired into your repo

`/initiatives` now renders `ocean-sunset` in its header. Changed there:

- `src/components/scene-hero/scene-hero.tsx` + `scene-hero.css` — the component. Its markup is the same `subject-hero` your image headers use, so `subject.css` keeps styling the overlay, title and meta list; only the picture is swapped for the scene.
- `src/app/[category]/page.tsx` — a `sceneHeaders` map at the top (`{ initiatives: "ocean-sunset" }`), and the hero renders `SceneHero` when the category is in it, the `<Image>` hero otherwise. Every other category is untouched.
- `ascii.rest` added to `package.json` (0.4.0, no runtime dependencies).

Measured in your app at a 1280px window: the content column is **720px**, so the canvas is **720×360** (bitmap 720×360 at DPR 1 — undistorted) inside the hero's 400px, with the scene's own ground `#0b0817` filling the rest so the band reads as one piece. No console or page errors. `pnpm exec tsc --noEmit` passes.

A scene is 200 columns wide, so at 720px each cell is 3.6px and the halftone reads quieter than it does at full width on ascii.rest — that is the piece at that size, not a setting. If you want it bolder, widen the column, or pick a scene with more contrast against your page (`marine-drive`, `tokyo-rain`, `aurora-fjord`).

## If you want the same thing on other headers

Add a line to the map in `src/app/[category]/page.tsx`. Subject and feature pages (`[category]/[subject]/page.tsx`, `.../[feature]/page.tsx`) can take the component the same way if you want scenes there too.

## The standalone version

`page-header.tsx` + `page-header.css` in this folder are the standalone header for a page that has no hero of its own: `<PageHeader piece="night-coast" eyebrow="manipal" title="the coast road" variant="band" />`. They came first; `SceneHero` is what your category pages needed.
