---
layout: ../../layouts/Docs.astro
title: api
description: Every function, component and type the ascii.rest package exports, with its signature and the page that shows it in use.
---

This page lists everything you can import from the `ascii.rest` npm package, grouped by import path. Each entry gives its signature, one line on what it does, and the page that shows it in use.

A few words come up everywhere:

- A **piece** is one animation, like `donut`: a module with `meta` and a `default` function.
- A **frame** is the picture at one moment, as a string of text.
- A **text piece** is plain text in your page's colour, drawn in a `<pre>`.
- A **coloured piece** (the scenes, logos, companies and distros) has colours of its own and is drawn on a `<canvas>`.

The shortest working example plays a piece in a `<pre id="art">`:

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector<HTMLElement>("#art")!, donut);
```

`stop()` stops it. If you use an AI coding agent, this page is also in [llms-full.txt](https://ascii.rest/llms-full.txt), with every other docs page.

## Pick an import path

Each import path is one part of the package. Import only the ones you use.

| import | what it gives you | runs in | guide |
| --- | --- | --- | --- |
| `ascii.rest` | `mount()`, plus `load`, `names`, `isPiece` and `canvas` to find a piece by name | a browser, for `mount()`; the rest anywhere | [typescript](/docs/typescript/) |
| `ascii.rest/pieces` | all 216 pieces, as named exports | anywhere | [your own pieces](/docs/pieces/) |
| `ascii.rest/pieces/<name>` | one piece, and the type of its options | anywhere | [typescript](/docs/typescript/) |
| `ascii.rest/banner` | `banner()`: any text in block letters, as a piece | anywhere | [banners](/docs/banners/) |
| `ascii.rest/react` | the `<Ascii>` and `<Banner>` components | React 18 or later | [react](/docs/react/) |
| `ascii.rest/astro` | the `Ascii` Astro component | Astro | [astro](/docs/astro/) |
| `ascii.rest/astro/banner` | the `Banner` Astro component | Astro | [astro](/docs/astro/) |
| `ascii.rest/element` | the `<ascii-art>` and `<ascii-banner>` tags | a browser | [html](/docs/html/) |
| `ascii.rest/svg` | any piece or banner as an animated SVG | anywhere | [svg](/docs/svg/) |
| `ascii.rest/terminal` | a piece or a banner in a terminal | Node | [terminal](/docs/terminal/) |

The package has no dependencies. React is an optional peer dependency, needed only for `ascii.rest/react`. Everything is typed.

## ascii.rest

The main import: play a piece in an element, and find any piece by its name. Guide: [typescript](/docs/typescript/).

```ts
import { canvas, isPiece, load, mount, names } from "ascii.rest";

console.log(names.length); // 216

const name = new URLSearchParams(location.search).get("piece") ?? "donut";
if (isPiece(name)) {
  const el = document.createElement(canvas.has(name) ? "canvas" : "pre");
  document.body.append(el);
  mount(el, await load[name]());
}
```

### mount()

`mount(el: HTMLElement, piece: Piece | Piece["default"], options?: MountOptions): () => void`

Plays a piece in `el` and returns a function that stops it. In a `<pre>`, any piece is text in the `<pre>`'s colour. On a `<canvas>`, a coloured piece is drawn in its own colours.

It plays only while `el` is on screen and the tab is visible. For a reader who prefers reduced motion it holds one still frame, unless you pass `motion: true`. `piece` can also be a bare function that returns a frame function. Guide: [typescript](/docs/typescript/).

### load

`const load: Record<PieceName, () => Promise<Piece>>`

One function for each piece, by name. `await load["night-coast"]()` imports that piece's module. A bundler puts each piece in its own file, so a page downloads only the pieces it plays.

### names

`const names: PieceName[]`

The names of all 216 pieces, like `"night-coast"`, in alphabetical order.

### isPiece()

`isPiece(name: string): name is PieceName`

Returns `true` when a string is a piece's name. In TypeScript it also narrows the string to `PieceName`. A piece's name has dashes: `isPiece("night-coast")` is `true` and `isPiece("nightCoast")` is `false`.

### canvas

`const canvas: ReadonlySet<PieceName>`

The names of the 87 coloured pieces. Draw these on a `<canvas>` to see their colours.

### Types from ascii.rest

| type | what it is |
| --- | --- |
| `Piece<O>` | A piece module: `{ meta: Meta<O>; default(options?: Partial<O>): Frame }`. |
| `Meta<O>` | What a piece says about itself: `name`, `category`, `note`, `cols`, `rows`, `fps`, and optionally `options`, `palette`, `ground`, `cell`, `clock`, `loop` and `still`. Each field is explained on [your own pieces](/docs/pieces/#fill-in-its-meta). |
| `Frame` | A frame function: `(t: number, env?: Env) => string`. It returns the frame at `t` seconds. |
| `Env` | The frame function's second argument: `{ paper?: boolean; color?: Uint8Array }`. Set `paper` for dark text on a light page. Pass `color` to get each cell's index into `meta.palette`. |
| `Options` | Any piece's options: `Record<string, unknown>`. |
| `Category` | One of the 15 categories: `"scenes"`, `"shapes"`, `"space"`, `"physics"`, `"nature"`, `"creatures"`, `"objects"`, `"generative"`, `"effects"`, `"ui"`, `"data"`, `"type"`, `"logos"`, `"companies"` or `"distros"`. |
| `PieceName` | Every piece's name, as a union of strings: `"a0"`, `"agentmail"` and so on. |
| `MountOptions` | The third argument of `mount()`: the piece's own options, plus `fps?: number` and `motion?: boolean`. |

## ascii.rest/pieces

Every piece, as a named export. Its export is its name in camelCase: `night-coast` is `nightCoast`, and `rule-30` is `rule30`. Every piece is in [the list on the home page](/#pieces). Guide: [your own pieces](/docs/pieces/), which explains what a piece module holds.

```ts
import { bigText, donut } from "ascii.rest/pieces";

console.log(donut.meta.cols, donut.meta.rows); // 40 22
console.log(bigText.default({ text: "hi" })(0)); // the frame at 0 seconds
```

Each piece is a module with two exports:

| export | what it is |
| --- | --- |
| `meta` | The piece's `Meta`: its size, frame rate, options and colours. |
| `default(options?)` | Takes the piece's options and returns its `Frame` function. |

### One piece on its own

`ascii.rest/pieces/<name>` is one piece's module, by the piece's name, with dashes: `ascii.rest/pieces/night-coast`. The 113 pieces that take options also export a type for them: the piece's name in PascalCase, plus `Options`. So `big-text` exports `BigTextOptions`, and `spinners` exports `SpinnersOptions`.

```ts
import * as spinners from "ascii.rest/pieces/spinners";
import type { BigTextOptions } from "ascii.rest/pieces/big-text";

const options: Partial<BigTextOptions> = { text: "hello" };
console.log(spinners.meta.options, options);
```

## ascii.rest/banner

Turn any text into a piece in block letters with a drop shadow. The result plays anywhere a piece does: `mount()`, `<Ascii>`, `svg()` and `play()`. Guide: [banners](/docs/banners/).

```ts
import { banner, drawable } from "ascii.rest/banner";

const hi = banner("hi", { shadow: "rounded" });
console.log(hi.default()(0));
console.log(drawable("héllo!")); // "hllo!": the font has no "é"
```

The first `console.log` prints:

```text
▓▓╮   ▓▓╮ ▓▓╮
▓▓│   ▓▓│ ▓▓│
▓▓▓▓▓▓▓▓│ ▓▓│
▓▓╭───▓▓│ ▓▓│
▓▓│   ▓▓│ ▓▓│
╰─╯   ╰─╯ ╰─╯
```

### banner()

`banner(text: string, options?: BannerOptions): BannerPiece`

Returns a piece that draws `text` in block letters. Every option is on [banners](/docs/banners/#options).

It throws an error, with a message that says what to change, when:

- the font can draw none of `text`, apart from spaces;
- `font` or `effect` is a name it doesn't know, or `shadow` is neither a name it knows nor 16 characters;
- a colour isn't `#rrggbb`, or `color` is an empty list;
- `fill` isn't exactly one character, or `glint.chars` isn't one or two;
- `gap`, `pad`, `pixel`, `size.cols` or `size.rows` isn't a whole number (`gap` and `pad` 0 or more, the others 1 or more);
- `speed`, `max`, `glint.sweep`, `glint.every`, `glint.width` or `type.step` isn't above 0;
- `glint.first` or `glint.slant` isn't a number.

### drawable()

`drawable(text: string, font?: FontName | Font): string`

Returns the characters of `text` that the font can draw, in the case you gave them. `banner()` leaves the rest out. The font is `"block"` by default.

### fonts

`const fonts: { block: Font; slim: Font }`

The two built-in fonts. Both are five rows tall. Most `block` letters are four or five pixels wide. `slim` letters are three.

### shadows

`const shadows: Record<ShadowName, string>`

The built-in shadow styles, `double`, `single`, `heavy`, `rounded` and `ascii`. Each is a string of 16 line-drawing characters: `shadows.rounded` is `" │││─╯╮┤─╰╭├─┴┬┼"`.

### Types from ascii.rest/banner

| type | what it is |
| --- | --- |
| `BannerOptions` | Every option of `banner()`: `font`, `pixel`, `gap`, `shadow`, `fill`, `effect`, `speed`, `glint`, `type`, `color`, `shadowColor`, `pad`, `size`, `max` and `name`. Each is explained on [banners](/docs/banners/#options). |
| `BannerPiece` | A `Piece` with two more fields: `text`, the characters it drew, and `motion`, `{ seconds, from, once, pass? }`. See [BannerPiece motion](#bannerpiece-motion). |
| `Font` | A pixel font of your own: `{ height: number; glyphs: Record<string, string>; cased?: boolean }`. Each glyph is its rows joined by a pipe character, with `#` for a pixel. Without `cased`, text is drawn in capitals. |
| `FontName` | `"block"` or `"slim"`. |
| `ShadowName` | `"double"`, `"single"`, `"heavy"`, `"rounded"` or `"ascii"`. |
| `Effect` | How a banner moves: `"glint"`, `"type"` or `"still"`. |
| `Colors` | One colour as `#rrggbb`, or an array of two or more for a fade: `string` or `readonly string[]`. |
| `Themed<T>` | `T`, or `{ light?: T; dark?: T }` for one value for each theme. `color` and `shadowColor` take it. |

### BannerPiece motion

A banner's `motion` field says how it moves. `svg()` reads it to play exactly one loop. The terminal `banner()` reads it to play the first glint, or the typing, once.

| `effect` | what `motion` holds |
| --- | --- |
| `"glint"` | `seconds` is the time from one glint to the next. The first glint crosses between the two times in `pass`. `from` is a moment when the glint is out of sight: an SVG's loop starts there, and a banner held still shows it. `once` is `false`. |
| `"type"` | `seconds` is how long the letters take to type in, plus a short pause. `from` is 0 and `once` is `true`. |
| `"still"` | `seconds` and `from` are 0, and `once` is `false`. |

```ts
import { banner } from "ascii.rest/banner";

banner("hi").motion; // { seconds: 3.2, from: 0, once: false, pass: [0.5, 2.9] }
banner("hi", { glint: { first: 0 } }).motion.from; // 2.8: at 0 the glint is in sight
banner("hi", { effect: "type" }).motion; // { seconds: 0.533..., from: 0, once: true }
```

## ascii.rest/react

Two React components. Both are client components (`"use client"`), so they also work in the Next.js app router. Guides: [react](/docs/react/) and [next.js](/docs/nextjs/).

```tsx
import { Ascii, Banner } from "ascii.rest/react";

export default function Page() {
  return (
    <>
      <Banner text="hello" color={["#f97316", "#f778ba"]} shadow="rounded" />
      <Ascii piece="donut" />
    </>
  );
}
```

### Ascii

`function Ascii(props: AsciiProps): JSX.Element`

Plays a piece. It renders a `<pre>`, or a `<canvas>` for a coloured piece, with `role="img"`. Guide: [react](/docs/react/).

| prop | type | what it does |
| --- | --- | --- |
| `piece` | `Piece` or `PieceName` | The piece to play: a module, or a name to load when it mounts. Required. |
| `options` | `MountOptions` | The piece's own options, plus `fps` and `motion`. |
| `label` | `string` | What the picture shows, for screen readers. The piece's name by default. |
| `mono` | `boolean` | Draws a coloured piece as text in one colour, in a `<pre>`. |
| `className` | `string` | A class for the `<pre>` or `<canvas>`. |
| `style` | `CSSProperties` | Inline styles for the `<pre>` or `<canvas>`. |

### Banner

`function Banner(props: BannerProps): JSX.Element | null`

Draws any text as a banner. Every option of `banner()` is a prop. If `banner()` throws, it renders nothing, and the console says why with `console.warn`: `<Banner> could not draw: ...`. Guide: [react](/docs/react/).

| prop | type | what it does |
| --- | --- | --- |
| `text` | `string` | The text. Required. |
| every `BannerOptions` field | see [banners](/docs/banners/#options) | `color`, `shadow`, `font`, `effect` and the rest. |
| `label` | `string` | What the picture shows, for screen readers. The text by default. |
| `mono` | `boolean` | Draws a coloured banner as text in one colour, in a `<pre>`. |
| `fps` | `number` | Overrides its frame rate. `0` is ignored: for a banner that doesn't move, use `effect="still"`. |
| `className` | `string` | A class for the `<pre>` or `<canvas>`. |
| `style` | `CSSProperties` | Inline styles for the `<pre>` or `<canvas>`. |

### Types from ascii.rest/react

`AsciiProps` and `BannerProps` are the props above. `BannerOptions`, `MountOptions`, `Piece` and `PieceName` are exported here too, so one import is enough.

## ascii.rest/astro

Two Astro components, each the default export of its own path. For a text piece or banner, a still frame is rendered on the server, so the page shows it before any script runs. A coloured one keeps its space until its canvas draws. Guide: [astro](/docs/astro/).

```astro
---
import Ascii from "ascii.rest/astro";
import Banner from "ascii.rest/astro/banner";
---

<Banner text="hello" shadow="rounded" />
<Ascii piece="night-coast" fps={12} />
```

### Ascii

`import Ascii from "ascii.rest/astro"`

Plays a piece. It renders an `<ascii-art>` tag.

| prop | type | what it does |
| --- | --- | --- |
| `piece` | `PieceName` | The piece's name. It takes a name only, not a module. An unknown name throws when the page renders. Required. |
| `options` | `MountOptions` | The piece's own options, plus `fps` and `motion`. |
| `fps` | `number` | Overrides its frame rate. |
| `label` | `string` | What the picture shows, for screen readers. The piece's name by default. |
| `mono` | `boolean` | Draws a coloured piece as text in one colour. |
| `class` | `string` | A class for the `<ascii-art>` tag. |

### Banner

`import Banner from "ascii.rest/astro/banner"`

Draws any text as a banner. It renders an `<ascii-banner>` tag. If `banner()` throws, the error is thrown when the page renders.

| prop | type | what it does |
| --- | --- | --- |
| `text` | `string` | The text. Required. |
| every `BannerOptions` field | see [banners](/docs/banners/#options) | `color`, `shadow`, `font`, `effect` and the rest. |
| `label` | `string` | What the picture shows, for screen readers. The text by default. |
| `mono` | `boolean` | Draws a coloured banner as text in one colour. |
| `class` | `string` | A class for the `<ascii-banner>` tag. |

This `Banner` has no `fps` prop.

## ascii.rest/element

Importing this module defines two HTML tags, `<ascii-art>` and `<ascii-banner>`. On a server, where there is no DOM, it does nothing. The script `https://ascii.rest/ascii.js` is the same module, for a page with no build step. Guide: [html](/docs/html/).

```ts
import "ascii.rest/element";

const art = document.createElement("ascii-art"); // typed as AsciiArt
art.setAttribute("piece", "donut");
document.body.append(art);
```

### AsciiArt

`class AsciiArt extends HTMLElement`

The `<ascii-art>` tag. Its attributes are `piece`, `src`, `fps`, `options`, `label` and `mono`. An unknown `piece` draws nothing and logs nothing. Guide: [html](/docs/html/).

### AsciiBanner

`class AsciiBanner extends HTMLElement`

The `<ascii-banner>` tag. Its attributes are `text`, `font`, `shadow`, `fill`, `effect`, `speed`, `color`, `shadow-color`, `pixel`, `gap`, `options`, `label` and `mono`. An empty attribute counts as no attribute, except `mono`, which is on whenever it is there. If `banner()` throws, the tag draws nothing, and the console says why with `console.warn`: `<ascii-banner> could not draw: ...`. Guide: [html](/docs/html/).

### define()

`define(tag?: string): void`

Defines `<ascii-art>` under the name `tag`, and `<ascii-banner>`, if they aren't defined yet. `tag` is `"ascii-art"` by default. Importing the module already calls `define()`, so call it yourself only to add another name, like `define("my-art")`.

The module also tells TypeScript about both tags, so `document.querySelector("ascii-art")` has the type `AsciiArt | null`.

## ascii.rest/svg

Turn any piece, or a banner, into an animated SVG string. An SVG plays where scripts can't run, like a GitHub README or an `<img>`. It works in a browser, in Node, in a Worker or at build time. Guides: [svg](/docs/svg/) and [github readme](/docs/readme/).

Most people only need `svg()` and `bannerSvg()`. The rest, from `part()` on, is for building your own SVG.

```ts
import { writeFileSync } from "node:fs";
import { bannerSvg, svg } from "ascii.rest/svg";
import { rust } from "ascii.rest/pieces";

writeFileSync("rust.svg", svg(rust));
writeFileSync("rust.dark.svg", svg(rust, { dark: true }));
writeFileSync("banner.svg", bannerSvg("my-project", { art: rust, color: "art", tagline: "fast, safe, fun" }));
```

### svg()

`svg(piece: Piece, options?: SvgOptions): string`

Returns one loop of a piece as an animated SVG. It throws for an `ink` that isn't `#rrggbb`, a `scale` that isn't a number of 0 or more, or an `fps` outside 1 to 60. Guide: [svg](/docs/svg/).

### bannerSvg()

`bannerSvg(text: string, options?: Omit<BannerOptions, "color"> & { color?: BannerSvgColor } & BannerSvgOptions): string`

Returns a banner as an animated SVG, with an optional tagline under it, a piece beside or above it, and a background. Its options are every option of `banner()`, plus `BannerSvgOptions`. Its `color` also takes `"art"`, the art's own colour. Guide: [svg](/docs/svg/).

It throws when `banner()` would, and also when:

- `background` or `taglineColor` isn't `#rrggbb`, for either theme, whether or not it is used;
- `taglineSize`, `spacing`, `padding`, `radius`, `artSize` or `scale` isn't a number of 0 or more;
- `place` isn't `"left"`, `"right"`, `"above"` or `"below"`, or `align` isn't `"start"`, `"center"` or `"end"`;
- `fps` is outside 1 to 60;
- `art` is `{ svg }` with an SVG that `ascii.rest/svg` didn't write.

### loopOf()

`loopOf(piece: Piece, options?: Options): { every: number; from: number; once?: boolean }`

The loop `svg()` plays: `every`, its length in seconds, and `from`, the time it starts. It is the first of these that applies:

1. a banner's own `motion` (see [BannerPiece motion](#bannerpiece-motion));
2. `every: 0`, for a still piece, one whose `meta.fps` is 0;
3. the piece's `meta.loop`;
4. for a logo, company or distro, the time between its glints or scans;
5. 4 seconds.

### part()

`part(loop: Loop & { cell?: number }, prefix?: string): Part`

Samples a `Loop` into frames and returns them as a `Part`, with its CSS class names starting with `prefix`. It throws for an `fps` outside 1 to 60. Use it to put frames of your own in an SVG.

### wrap()

`wrap(part: Part, label: string, scale?: number): string`

Puts a `Part` in a complete `<svg>`, titled `label` for screen readers. `scale` is the pixels per cell width, 10 by default.

### namespaced()

`namespaced(svg: string, prefix: string): Part | null`

Turns an SVG that this module wrote back into a `Part`, with its class names, and its fade's gradient, under `prefix`. Use it to put two in one SVG, or two inline in one HTML page. It returns `null` for any other SVG.

### inkOf()

`inkOf(part: Part): string | null`

The colour that inks the most cells of a part's first frame, such as a logo's main colour. `bannerSvg()` uses it for `color: "art"`.

### darkColor()

`darkColor(hex: string): boolean`

Returns `true` when a `#rrggbb` colour is dark. `bannerSvg()` uses it to pick light or dark colours for a `background`.

### MONO and FACES

`const MONO: string` and `const FACES: string`

`MONO` is the CSS rule that every part's text rows share. `part()` leaves it out of a part's `css`, and `wrap()` adds it. Add it to your SVG's `<style>` yourself if you put parts in an SVG without `wrap()`.

`FACES` is the list of monospace fonts that `MONO` names. Use it to set text of your own, such as a caption, in the same fonts at another size.

### Types from ascii.rest/svg

| type | what it is |
| --- | --- |
| `SvgOptions` | The options of `svg()`: `dark`, `ink`, `seconds`, `from`, `fps`, `once`, `scale`, `label` and `options`. |
| `BannerSvgOptions` | What `bannerSvg()` adds to the banner options: `dark`, `tagline`, `taglineColor`, `taglineSize`, `art`, `place`, `artSize`, `spacing`, `align`, `background`, `padding`, `radius`, `scale`, `fps` and `label`. |
| `BannerSvgColor` | What the `color` of `bannerSvg()` takes: anything the `color` of `banner()` takes, or `"art"`. |
| `Loop` | Frames over time, for `part()`: `cols`, `rows`, `palette`, `every`, `from` and `at(t)`, and optionally `once` and `fps`. |
| `Part` | A picture ready to sit in an SVG: `{ width, height, css, body }`, in SVG units. |
| `Shot` | One frame: `{ text: string; color: Uint8Array }`. `color` holds each cell's palette index. |

## ascii.rest/terminal

Play a piece, or print a banner, in a terminal: a splash screen for your CLI. It runs in Node and uses only Node's built-in modules. Guide: [terminal](/docs/terminal/).

```ts
import { banner, play, still } from "ascii.rest/terminal";

await banner("my-cli", { color: ["#ff6a00", "#f778ba"], tagline: "v1.0" });
await play("donut", { seconds: 2 });
console.log(await still("donut"));
```

### play()

`play(piece: Piece | PieceName, options?: PlayOptions): Promise<Played>`

Plays a piece in the middle of the terminal's alternate screen. It resolves when it stops: after `seconds`, on any key, or on Ctrl+C. The terminal is put back however it stops. With no terminal to draw on, such as a pipe, it draws nothing and resolves at once. Guide: [terminal](/docs/terminal/).

### banner()

`banner(text: string, options?: PrintOptions): Promise<Bannered>`

Prints a banner where the cursor is, moves it once, and leaves it in the scrollback. Piped, it prints at once with no colour. It keeps the banner a column narrower than the terminal. If even its narrowest letters don't fit, it prints the text as one plain line. This is not the `banner()` from `ascii.rest/banner`: that one returns a piece, and this one prints. Guide: [terminal](/docs/terminal/).

### still()

`still(piece: Piece | PieceName, options?: { light?: boolean; options?: Options }): Promise<string>`

Returns one frame as plain text, for a pipe or a log. It is the frame at `meta.still`, or the first. For a typed banner, that frame shows every letter.

### Types from ascii.rest/terminal

| type | what it is |
| --- | --- |
| `PlayOptions` | The options of `play()`: `seconds`, `mono`, `light`, `fps`, `options` (the piece's own) and `out`. |
| `Played` | What `play()` resolves to: `cropped`, `interrupted`, `piece: { cols, rows }` and `terminal: { cols, rows }`. |
| `PrintOptions` | The options of the terminal `banner()`: every `BannerOptions` field except `size` and `max`, plus `seconds` (1 by default), `tagline`, `light` and `out`. |
| `Bannered` | What the terminal `banner()` resolves to: `cols`, `rows` and `interrupted`. `cols` and `rows` are 0 when the terminal was too narrow and it printed plain text. |
| `Output` | Where to draw: `process.stdout` by default, or any object with `write(text)` and optionally `isTTY`, `columns`, `rows`, `on` and `off`. |

## Over HTTP

Some of the package is also served from ascii.rest itself, with nothing to install. Every path below is on `https://ascii.rest`.

| path | what it is | guide |
| --- | --- | --- |
| `/ascii.js` | The `ascii.rest/element` module, for a `<script type="module">` tag. | [html](/docs/html/) |
| `/<module>.js` | Every compiled module, such as `/mount.js`, `/banner.js` or `/pieces/donut.js`, to import on a page with no build step. | [html](/docs/html/) |
| `/svg/<name>.svg` | Each of the 72 logos, companies and distros as an animated SVG. Add `.dark` before `.svg` for dark pages. | [github readme](/docs/readme/) |
| `/banner/<text>.svg` | A banner as an animated SVG. Add `.dark` before `.svg` for dark pages. Its options go in the query: `color`, `bg`, `font`, `shadow`, `fill`, `effect`, `speed`, `tagline`, `art`, `place` and `size`. | [github readme](/docs/readme/), [banner maker](/banner/) |
| `/r/<name>.json` | A shadcn registry item, for `npx shadcn add` or `npx ascii.rest add`. `/r/registry.json` lists them all. | [your own copy](/docs/copy/) |
| `/og/<name>.png` | A piece's share image, 1200 by 630 pixels. | |
| `/llms.txt`, `/llms-full.txt` | The docs as plain text, for an AI coding agent. | [introduction](/docs/) |

## Next

- [typescript](/docs/typescript/): `mount()`, frames and the types, with examples.
- [banners](/docs/banners/): every option of `banner()`.
- [cli](/docs/cli/): the `npx ascii.rest` command.
