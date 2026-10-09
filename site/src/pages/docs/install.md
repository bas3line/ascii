---
layout: ../../layouts/Docs.astro
title: install
description: Add ascii.rest to your project from npm, with one script tag, or as source files you own.
---

There are three ways to add ascii.rest. Pick the one that fits your project:

| way | use it when | how |
| --- | --- | --- |
| npm | your app has a build step, like Next.js, Vite or Astro | [Install from npm](#install-from-npm) |
| one script tag | you have a plain HTML page with no build step | [Add one script tag](#add-one-script-tag) |
| your own copy | you want to own and change the code | [Copy the source into your project](#copy-the-source-into-your-project) |

## Install from npm

Run the command for your package manager:

| package manager | command |
| --- | --- |
| npm | `npm install ascii.rest` |
| pnpm | `pnpm add ascii.rest` |
| yarn | `yarn add ascii.rest` |
| bun | `bun add ascii.rest` |

The package has no dependencies of its own. You need React only if you import `ascii.rest/react`. The package is ES modules, so load it with `import`.

To check that it works, play a piece on your page. A piece is one animation. This one is a spinning donut:

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const pre = document.createElement("pre");
document.body.append(pre);
mount(pre, donut);
```

`mount()` plays the piece in the element and returns a function that stops it. In React, use `<Ascii piece="donut" />` instead: see [react](/docs/react/).

## Add one script tag

Use this on a plain HTML page with no build step. The script defines two tags: `<ascii-art>` plays any piece, and `<ascii-banner>` draws any text in big block letters.

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>

<ascii-art piece="donut"></ascii-art>
```

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

The script loads each piece from ascii.rest the first time your page uses it. Every attribute of both tags is on [html](/docs/html/).

`https://ascii.rest/ascii.js` always serves the newest version, so it can change without you doing anything. To stay on one version, with an integrity hash, see [Pin a version](/docs/html/#pin-a-version).

## Copy the source into your project

Copy the TypeScript into your project when you want to own and change the code. With [shadcn](https://ui.shadcn.com):

```sh
npx shadcn@latest add https://ascii.rest/r/ascii.json https://ascii.rest/r/donut.json
```

Or with the ascii.rest command, no shadcn needed:

```sh
npx ascii.rest add ascii donut
```

Both add the `<Ascii>` React component (the `ascii` item) and the donut piece (the `donut` item). The files go in `components/ascii/`, or `src/components/ascii/` if your project has a `src` folder: see [Where the files go](/docs/copy/#where-the-files-go). [Your own copy](/docs/copy/) lists every item and shows how to use the files.

## Find the right import

Each part of the library has its own import path. Import only the parts you use.

| import | what it gives you | docs |
| --- | --- | --- |
| `ascii.rest` | `mount()`, which plays a piece in an element, plus `load`, `names`, `isPiece` and `canvas`, to find a piece by its name | [typescript](/docs/typescript/) |
| `ascii.rest/pieces` | every piece, each by its export in camelCase: `donut`, `nightCoast` | [typescript](/docs/typescript/) |
| `ascii.rest/pieces/<name>` | one piece, by the piece's name, with dashes: `ascii.rest/pieces/night-coast` | [your own pieces](/docs/pieces/) |
| `ascii.rest/react` | the `<Ascii>` and `<Banner>` components for React and Next.js | [react](/docs/react/) |
| `ascii.rest/astro` | the `<Ascii>` component for Astro | [astro](/docs/astro/) |
| `ascii.rest/astro/banner` | the `<Banner>` component for Astro | [astro](/docs/astro/) |
| `ascii.rest/element` | the `<ascii-art>` and `<ascii-banner>` tags, defined as soon as you import it | [html](/docs/html/) |
| `ascii.rest/banner` | `banner()`, which turns any text into a piece in block letters | [banners](/docs/banners/) |
| `ascii.rest/svg` | `svg()` and `bannerSvg()`, which turn a piece or a banner into an animated SVG | [svg](/docs/svg/) |
| `ascii.rest/terminal` | `play()`, `still()` and `banner()`, which draw in a terminal from Node | [terminal](/docs/terminal/) |

The package also has a command, `npx ascii.rest`, which plays pieces and prints banners in your terminal: see [cli](/docs/cli/).

Each piece is its own module, so your bundle holds only the pieces you import. To choose a piece by its name while the page runs, use `load`: see [Load a piece by its name](/docs/typescript/#load-a-piece-by-its-name).

## Check what it needs

| part | needs |
| --- | --- |
| pieces on a web page | any current browser |
| `ascii.rest/react` | React 18 or newer. No other import needs React. |
| `ascii.rest/terminal` and `npx ascii.rest` | Node 18.3 or newer |
| types | nothing to install: they come with the package. If TypeScript can't find `ascii.rest`, set `moduleResolution` to `bundler`, `node16` or `nodenext` in your `tsconfig.json`. |

## Next

- [quick start](/docs/quickstart/): a banner and a piece on your page in a minute
- [react](/docs/react/): `<Ascii>` and `<Banner>` in React and Next.js
- [html](/docs/html/): every attribute of the two tags
