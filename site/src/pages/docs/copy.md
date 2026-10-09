---
layout: ../../layouts/Docs.astro
title: your own copy
description: Copy the TypeScript of any piece, the banner or the React components into your project, so you own it and can change it.
---

You can copy ascii.rest's source into your project instead of installing it from npm. The files become yours: change any line, and nothing updates unless you ask.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/copy.mp4" poster="https://cdn.ascii.rest/videos/copy.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>Adding a piece with shadcn and with npx ascii.rest add, then using and changing the copied files.</figcaption>
</figure>

A **piece** is one animation, like `donut`. A **registry item** is one thing you can copy in: a piece, a React component, or a part of the library. The **registry** is the list of every item and its files, served from `https://ascii.rest/r/`.

You copy items with one of two commands, `npx shadcn add` or `npx ascii.rest add`. Both read the same registry and copy the same files.

Run this in your project's root folder:

```sh
npx ascii.rest add ascii donut
```

It copies the `<Ascii>` component and the `donut` piece into `components/ascii/`, or `src/components/ascii/` if your project has a `src` folder. Use them like any of your own files:

```tsx
"use client";

import { Ascii } from "@/components/ascii/ascii";
import * as donut from "@/components/ascii/pieces/donut";

export default function Page() {
  return <Ascii piece={donut} />;
}
```

The `"use client"` line is for the Next.js app router: it is explained [below](#in-react-and-nextjs).

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

## Choose between npm and your own copy

Copy the source when you want to own the code. You can change a piece's characters, colours or speed, or how a component renders. Nothing is added to your `package.json`, and nothing changes when a new version comes out. You only get the files you add.

Install from npm instead when you want updates with `npm update`, or the parts that are not in the registry: the `<ascii-art>` tag, the Astro components, and `play()` and `banner()` for the terminal. See [install](/docs/install/).

| | npm package | your own copy |
| --- | --- | --- |
| how you get it | `npm install ascii.rest` | `npx ascii.rest add` or `npx shadcn add` |
| change the code | no | yes, any line |
| updates | `npm update` | add the item again, see [update your copy](#update-your-copy) |
| in your `package.json` | `ascii.rest` | nothing new (the React components need `react`, which a React app already has) |
| play a piece by name, `piece="donut"` | yes | no: import the piece's file |
| `<ascii-art>`, Astro, terminal | yes | no |

## Add files with shadcn

Use this if your project already uses [shadcn](https://ui.shadcn.com), so it has a `components.json` file. There are two ways: by URL, or by a short name after you register `@ascii` once.

### By URL

Every item has its own URL, `https://ascii.rest/r/<item>.json`. Pass one or more to `shadcn add`:

```sh
npx shadcn@latest add https://ascii.rest/r/ascii.json https://ascii.rest/r/donut.json
```

shadcn lists the files it created: `types.ts`, `mount.ts`, `ascii.tsx` and `pieces/donut.ts`, all in `components/ascii/`. You asked for two items and got four files. That is because `ascii` needs `core`: the two files every item uses, `types.ts` and `mount.ts`.

### By name, with the @ascii namespace

1. Open `components.json` and add a `registries` key. Keep everything else that is in the file.

   ```json
   {
     "registries": {
       "@ascii": "https://ascii.rest/r/{name}.json"
     }
   }
   ```

2. Add items by name, with `@ascii/` in front:

   ```sh
   npx shadcn@latest add @ascii/ascii-banner @ascii/night-coast
   ```

shadcn puts the name in place of `{name}`, so `@ascii/night-coast` fetches `https://ascii.rest/r/night-coast.json`.

If a file is already there and the same, shadcn skips it. If yours is different, it asks before replacing it. Add `--overwrite` to replace it without asking, or `--diff` to see what would change without writing anything.

## Add files without shadcn

Use this in any project. You need Node 18.3 or newer, and ascii.rest 0.3.0 or later. You don't need shadcn or a `components.json`.

1. Open a terminal in your project's root folder.
2. Run `npx ascii.rest add` with the items you want, separated by spaces:

   ```sh
   npx ascii.rest add ascii donut
   ```

It prints every file it wrote, and any npm package those files import:

```text
wrote
  components/ascii/types.ts
  components/ascii/mount.ts
  components/ascii/ascii.tsx
  components/ascii/pieces/donut.ts
it needs react: npm install react

The docs for what you added: https://ascii.rest/docs/copy/
```

A React app has `react` already, so you can skip that install.

### What add does, step by step

`add` never asks a question, so a script, a CI job or a coding agent can run it. It works in this order:

1. It downloads each item you named from `https://ascii.rest/r`, and every item those need.
2. It checks every file before it writes any.
3. It writes the files into `src/components/ascii/` if your project has a `src` folder, and into `components/ascii/` if not. `--dir` picks another folder.
4. It keeps any file that is already there, unless you pass `--overwrite`.
5. It prints the files it wrote, the files it kept, and any npm package the files import.

If anything is wrong, it stops with an error and exit code 1, and writes nothing. It stops when:

- a download fails;
- a name you gave is not an item;
- a file would land outside the folder;
- a file's name has a control character in it;
- a file's content isn't text;
- an item asks for an npm package whose name isn't a valid package name.

The last four protect you from a registry someone else runs. A wrong name looks like this:

```sh
npx ascii.rest add rsut
```

```text
ascii.rest: there is no "rsut" to add (https://ascii.rest/r/rsut.json answered 404). npx ascii.rest list shows every piece.
```

### Name the items

Write a piece's name with dashes, as `npx ascii.rest list` prints it: `night-coast`, not `"night coast"`. Separate the names with spaces. Every item is listed in [every item you can add](#every-item-you-can-add).

You can also give an item's full URL, like `https://ascii.rest/r/donut.json`.

### Flags for add

| flag | what it does | default |
| --- | --- | --- |
| `--dir <path>` | puts the files in this folder, relative to where you run it | `src/components/ascii` if your project has a `src` folder, otherwise `components/ascii` |
| `--overwrite` | replaces files that are already there | off: files that are already there are kept |
| `--registry <url>` | reads the items, and the items they need, from another copy of the registry | `https://ascii.rest/r` |

`add` takes no other flag: another command's, like `--color` or `--seconds`, stops it with an error before anything is written, and so does a flag the CLI doesn't know. Which command takes which flag is on [cli](/docs/cli/#which-flags-each-command-takes).

### Put the files in another folder

The files go straight into the `--dir` folder. This writes `lib/ascii/types.ts`, `lib/ascii/mount.ts`, `lib/ascii/ascii.tsx`, `lib/ascii/banner.ts` and `lib/ascii/ascii-banner.tsx`:

```sh
npx ascii.rest add ascii-banner --dir lib/ascii
```

### Add an item again

Run `npx ascii.rest add donut` a second time, and it keeps the files you already have:

```text
kept, already there (--overwrite replaces them)
  components/ascii/types.ts
  components/ascii/mount.ts
  components/ascii/pieces/donut.ts

The docs for what you added: https://ascii.rest/docs/copy/
```

To replace them, add `--overwrite`. It replaces every file the item brings, `core` included. If you changed any of them, read [update your copy](#update-your-copy) first.

```sh
npx ascii.rest add donut --overwrite
```

## Every item you can add

Each item brings the items it needs. Adding `ascii-banner` also adds `ascii`, `banner` and `core`.

| item | what it adds | it also adds |
| --- | --- | --- |
| `core` | `types.ts`, the shape every piece has, and `mount.ts`, with `mount()` to play a piece in a `<pre>` or `<canvas>` | nothing |
| `ascii` | `ascii.tsx`: the `<Ascii>` component for React and Next.js | `core` |
| `banner` | `banner.ts`: `banner()`, which turns any text into a piece in block letters | `core` |
| `ascii-banner` | `ascii-banner.tsx`: the `<Banner>` component for React and Next.js | `ascii`, `banner`, `core` |
| `svg` | `svg.ts`: `svg()` and `bannerSvg()`, which turn a piece or a banner into an animated SVG | `banner`, `core` |
| a piece's name, like `donut` | `pieces/donut.ts`: that one piece | `core` |
| `all` | every file above and every piece | everything |

`ascii` and `ascii-banner` import `react`. The other files import nothing outside the folder.

Every piece's name is on [the home page](/#pieces), and `npx ascii.rest list` prints them. The registry's index, every item and the files it brings, is at [ascii.rest/r/registry.json](/r/registry.json).

## Where the files go

Every file goes into one folder called `ascii`, inside your components folder. With everything added, it looks like this:

```text
components/ascii/
├── types.ts            the shape every piece has (core)
├── mount.ts            mount(): plays a piece in a <pre> or <canvas> (core)
├── ascii.tsx           <Ascii> (ascii)
├── banner.ts           banner(): any text in block letters (banner)
├── ascii-banner.tsx    <Banner> (ascii-banner)
├── svg.ts              svg() and bannerSvg() (svg)
└── pieces/
    ├── donut.ts
    └── night-coast.ts
```

The files import each other by relative paths, like `./mount` and `../types`. Keep them together in this layout, or fix the imports if you move one. The imports leave off `.ts`, as most bundlers expect.

Which components folder is used depends on how you add the files:

| you add with | the folder |
| --- | --- |
| shadcn | `ascii/` inside the folder your `components` alias in `components.json` points to: `components/ascii` or `src/components/ascii` |
| `npx ascii.rest add` | `src/components/ascii` if there is a `src` folder, otherwise `components/ascii`, or the `--dir` you give |

## Use the copied files

The copied files work like the npm package, imported from your own folder. The examples use the `@/` import alias that Next.js sets up. Without it, import by a relative path, like `../components/ascii/ascii`.

### In React and Next.js

Import a piece with `import * as` and pass the whole module to `<Ascii>`:

```tsx
"use client";

import { Ascii } from "@/components/ascii/ascii";
import { Banner } from "@/components/ascii/ascii-banner";
import * as donut from "@/components/ascii/pieces/donut";
import * as nightCoast from "@/components/ascii/pieces/night-coast";

export default function Page() {
  return (
    <main>
      <Banner text="hello" color={["#f97316", "#f778ba"]} shadow="rounded" />
      <Ascii piece={donut} options={{ fps: 12 }} />
      <Ascii piece={nightCoast} />
    </main>
  );
}
```

<div class="demo" style="gap: 1.5rem"><ascii-banner text="hello" color="#f97316,#f778ba" shadow="rounded"></ascii-banner><ascii-art piece="donut"></ascii-art></div>

- The copied `<Ascii>` takes a module, not a name. Write `piece={donut}`, not `piece="donut"`. Playing a piece by name needs the npm package's list of every piece, and your copy does not have it.
- A piece module holds a function, and a Next.js server component can't pass a function to a client component. So the file that imports the pieces needs `"use client"` at its top, as above. Put the art in a component of its own if the rest of the page should stay on the server.
- `<Banner>` takes only plain values, so a server component can render it on its own.
- Every other prop is the same as in the npm package. They are all on [react](/docs/react/).

### Without React

`mount()` plays any piece in an element and returns a function that stops it:

```ts
import { mount } from "@/components/ascii/mount";
import * as donut from "@/components/ascii/pieces/donut";

const el = document.querySelector<HTMLPreElement>("#art")!;
const stop = mount(el, donut);

// Later, when you remove the element:
stop();
```

Give a text piece a `<pre>`. Give a coloured piece, one with `meta.palette`, a `<canvas>` to draw it in colour. In a `<pre>` it draws as text in one colour. More on `mount()` is on [typescript](/docs/typescript/).

### A banner

`banner()` turns text into a piece, so `mount()` and `<Ascii>` play it like any other:

```ts
import { banner } from "@/components/ascii/banner";
import { mount } from "@/components/ascii/mount";

const hello = banner("hello", { shadow: "rounded", effect: "type" });
mount(document.querySelector<HTMLPreElement>("#title")!, hello);
```

Every option is on [banners](/docs/banners/#options).

### An SVG

`bannerSvg()` returns the markup of an animated SVG, as a string:

```ts
import { bannerSvg } from "@/components/ascii/svg";

// Save it as a .svg file, or send it with Content-Type: image/svg+xml.
const svg = bannerSvg("hello", { color: ["#f97316", "#f778ba"], tagline: "made with ascii.rest" });
```

Every option is on [svg](/docs/svg/).

## Change a copied piece

A piece's file has two parts. `meta` holds its name, its size in characters, its frame rate and its colours. The default function draws each **frame**, the picture at one moment, from the time `t` in seconds.

Here is how to give the donut heavier characters and slow it down:

1. Open `components/ascii/pieces/donut.ts`.
2. Change the characters it shades with. They run from the part in shadow to the part in full light:

   ```diff
   -const RAMP = ".,-~:;=!*#$@";
   +const RAMP = ".:-=+*#%@";
   ```

3. Halve the speed it turns at. `t` is the time in seconds, so smaller numbers turn it slower:

   ```diff
   -    const A = 1 + t * 0.8;
   -    const B = 1 + t * 0.35;
   +    const A = 1 + t * 0.4;
   +    const B = 1 + t * 0.175;
   ```

4. Save the file. If your dev server is running, the page reloads with your donut.

Its first frame now looks like this, without the blank rows above and below it:

```text
              @@@@%%%%%%
         %@@@%%%%%##########
       @@@%%%####****+**++++++
     @@%%%###******++++=++==++++
    %%%%###***+++===-------======
   %%%###***++==--:::....::----==-
  %#####***+==-::...........::----
 #####**+++=-::..............:----
 ####***++=-::....     ....:::----
 *****++==-::...       ------=----
 ***++++==-:....      ###++++===-:
 **++++==--::...:   %@@@%%#*+++=:.
 +++++===--:::.:-=*#%%@@%%##*+=-.
  =======----:--==+*######**+=-.
   =====--------==++*****+*+=:
    ------------=====+=++=-:.
      :::---------=====-:.
         ...::::::::...
```

Other things you can change:

- **Colours.** A coloured piece lists its colours in `meta.palette`, as `#rrggbb`. Change one to recolour every part drawn in it.
- **Frame rate.** `meta.fps` is how many frames a second it draws, not how fast it moves. Lower it to save work on slow devices.
- **Size.** `meta.cols` and `meta.rows` are the frame's size in characters. Every frame must be exactly that size, so change the drawing with them.

Every `meta` field is explained on [your own pieces](/docs/pieces/#fill-in-its-meta).

To keep the original too, copy `donut.ts` to a new file, like `my-donut.ts`, and change `meta.name`. Adding `donut` again later never touches `my-donut.ts`. The rules a piece must follow are on [your own pieces](/docs/pieces/).

## Update your copy

Your copy never changes on its own. To take a newer version of an item, add it again and replace the files:

1. Commit your work, so you can see and undo what changes.
2. If you use shadcn, see the changes first. `--diff` prints them and writes nothing:

   ```sh
   npx shadcn@latest add @ascii/donut --diff
   ```

3. Add the item again with `--overwrite`:

   ```sh
   npx ascii.rest add donut --overwrite
   ```

   Or with shadcn:

   ```sh
   npx shadcn@latest add @ascii/donut --overwrite
   ```

4. Run `git diff`. Keep the new code you want, and put your own changes back.

`--overwrite` applies to every file the item brings with it, not only the one you named. If you changed `mount.ts`, `add donut --overwrite` replaces your `mount.ts` too.

## Keep the licence header

ascii.rest is MIT licensed. You can use the copied code in any project, free or paid, open or closed, and change it as you like. The MIT licence asks that its copyright and licence notice stay with every copy.

`mount.ts`, `banner.ts`, `svg.ts`, `ascii.tsx` and `ascii-banner.tsx` each have this line in the comment near the top:

```text
Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
```

Keep that line when you change the file. The piece files and `types.ts` have no such line, and the same licence covers them. The full text, with the copyright line, is in [LICENSE](https://github.com/bas3line/ascii/blob/main/LICENSE). The simplest way to keep the notice with your copy is to save that file next to the copied files, for example as `components/ascii/LICENSE`.

## Next

- [react](/docs/react/): every prop of `<Ascii>` and `<Banner>`.
- [your own pieces](/docs/pieces/): the rules a piece follows, to change one safely or write a new one.
- [cli](/docs/cli/): every command and flag of `npx ascii.rest`.
