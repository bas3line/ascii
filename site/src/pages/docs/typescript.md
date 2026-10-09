---
layout: ../../layouts/Docs.astro
title: typescript
description: Play any piece on a web page with plain TypeScript and no framework, or draw its frames yourself.
---

This page is for using ascii.rest with no framework, in plain TypeScript or JavaScript. You need only a bundler that can import from npm, such as Vite. `mount()` plays a piece in a `<pre>` or on a `<canvas>` on your page. Everything in the package is typed. The examples are in TypeScript. In JavaScript, leave out the types and the `!`.

Two words used on this page. A **piece** is one animation, like `donut`. A **frame** is the picture at one moment, as a string of text.

Put a `<pre>` in your page:

```html
<pre id="art"></pre>
```

Then play a piece in it:

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

mount(document.querySelector<HTMLElement>("#art")!, donut);
```

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

## Set up a new project

These steps make a new TypeScript project with [Vite](https://vite.dev) and play `donut` in it. If you already have a project with a bundler, you only need step 2 and the code above.

1. Make the project and go into its folder. If it asks "Install with npm and start now?", answer No: you start it in step 5.

   ```sh
   npm create vite@latest my-app -- --template vanilla-ts
   cd my-app
   ```

2. Install ascii.rest. Because you skipped the install in step 1, this also installs Vite and the rest of the project.

   ```sh
   npm install ascii.rest
   ```

3. In `index.html`, replace `<div id="app"></div>` with `<pre id="art"></pre>`.

4. Replace everything in `src/main.ts` with the TypeScript above, the block that starts with `import { mount }`.

5. Start the dev server, then open the URL it prints. By default that is `http://localhost:5173`.

   ```sh
   npm run dev
   ```

The donut turns. To play another piece, import it from `ascii.rest/pieces` by its export, in camelCase: `nightCoast`, `bigText`, `rust`.

## Choose a pre or a canvas

`mount()` draws into whichever element you give it. A `<pre>` shows text. A `<canvas>` shows colour.

A piece has colours of its own when `piece.meta.palette` is set. Every logo, company, distro and scene does: these 87 are the **coloured pieces**. The other 129 are **text pieces**: plain text in your page's colour.

| element | what you get |
| --- | --- |
| `<pre>` | Text in the pre's own colour and font. Every piece works here. A coloured piece shows in that one colour. |
| `<canvas>` | A coloured piece in its own colours, over its own background if it has one. A text piece is drawn in the canvas's CSS `color`. |

Here is the `typescript` logo in a `<pre>`, then on a `<canvas>`:

<div class="demo"><div style="display: flex; align-items: center; gap: 2rem"><ascii-art piece="typescript" mono style="font-size: 5px"></ascii-art><ascii-art piece="typescript" style="width: 168px"></ascii-art></div></div>

To pick the right element for any piece:

```ts
import { mount } from "ascii.rest";
import { nightCoast } from "ascii.rest/pieces";

const el = document.createElement(nightCoast.meta.palette ? "canvas" : "pre");
el.setAttribute("role", "img");                    // so screen readers announce it as a picture
el.setAttribute("aria-label", nightCoast.meta.name);
document.body.append(el);
mount(el, nightCoast);
```

### How a canvas is sized

- It fills the width of its container. Give it a CSS `width` to make it smaller.
- Its height follows from the piece's shape. `mount()` sets its CSS `aspect-ratio` for you.
- When it changes width, it redraws at the new size, sharp on high density screens.
- Where the piece has no background colour, the canvas is transparent and your page shows through.

### Style the pre

A `<pre>` already uses a monospace font. These styles keep rows evenly spaced and stop the font from joining characters. The `<ascii-art>` tag gives its own `<pre>` the same styles.

```html
<style>
  pre {
    margin: 0;
    font: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "ascii.rest mono", monospace;
    line-height: 1.2;
    letter-spacing: 0;
    font-variant-ligatures: none;
  }

  /* Android's monospace font has no box drawing or block characters. This fills them in from a 3 KB font. */
  @font-face {
    font-family: "ascii.rest mono";
    src: url(https://ascii.rest/fonts/ascii-rest-mono.woff2) format("woff2");
    unicode-range: U+00B0, U+00B7, U+2022, U+2500-259F, U+25CF;
    font-display: swap;
  }
</style>
```

The browser downloads that font only when the fonts before it lack a character.

## Change a piece's options

Pass options as the third argument to `mount()`.

```ts
import { mount } from "ascii.rest";
import { archLinux, bigText, donut } from "ascii.rest/pieces";

mount(document.querySelector<HTMLElement>("#title")!, bigText, { text: "hello" });
mount(document.querySelector<HTMLCanvasElement>("#logo")!, archLinux, { scan: 0 }); // no scan line: the logo holds still
mount(document.querySelector<HTMLElement>("#art")!, donut, { fps: 12 });
```

<div class="demo"><ascii-art piece="big-text" options='{"text":"hello"}'></ascii-art></div>

| option | what it does | default |
| --- | --- | --- |
| any option of the piece | Changes the piece. `bigText` takes `text`. `archLinux` takes `scan`: the seconds between the lines that sweep down the logo. | the piece's `meta.options` |
| `fps` | Frames a second. Fewer frames means less work: the piece moves at the same speed, less smoothly. `0` draws one frame and stops. | the piece's `meta.fps`, or 30 |
| `motion` | `true` plays the piece even when the reader has asked for reduced motion. Use it only on a page with its own play button. | `false` |

To see which options a piece takes, and their defaults, read `meta.options`:

```ts
import { archLinux, bigText } from "ascii.rest/pieces";

console.log(bigText.meta.options);   // { text: "hello" }
console.log(archLinux.meta.options); // { scan: 5 }
```

### Have TypeScript check the options

`mount()` accepts any options object, so it doesn't check the values you pass. Every piece that takes options exports a type for them, named after the piece: `BigTextOptions`, `SpinnersOptions`. Import it from the piece's own module and type your options with it:

```ts
import { mount } from "ascii.rest";
import { bigText } from "ascii.rest/pieces";
import type { BigTextOptions } from "ascii.rest/pieces/big-text";

const options: Partial<BigTextOptions> = { text: "hello" };
mount(document.querySelector<HTMLElement>("#title")!, bigText, options);
```

Now `{ text: 42 }` is an error, because `text` takes a string. These types allow extra keys, so a misspelt option name, like `{ txt: "hello" }`, still compiles.

## Stop it

`mount()` returns a function. Call it to stop the piece.

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const pre = document.querySelector<HTMLElement>("#art")!;
const stop = mount(pre, donut);

document.querySelector("#stop")!.addEventListener("click", () => stop());
```

Stopping does three things:

- It stops drawing frames.
- It removes the observers and listeners `mount()` added.
- It leaves the last frame in the element. Set `pre.textContent = ""` to clear it.

Call `stop()` before you mount another piece in the same element. If you don't, both keep drawing into it. This swaps one piece for another:

```ts
import { mount, type Piece } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const pre = document.querySelector<HTMLElement>("#art")!;
let stop = mount(pre, donut);

function show(piece: Piece) {
  stop();
  stop = mount(pre, piece);
}
```

Mounting a piece again starts it from the beginning.

## When it plays and when it pauses

`mount()` saves work for you. You don't have to do anything for this.

- It plays only while the element is on screen. When you scroll it out of view, it pauses.
- It pauses while the browser tab is hidden.
- While it is paused, its time stops too. When it plays again, it carries on from the same moment.
- If the reader has asked for reduced motion in their system settings, it shows one still frame and doesn't play. That is the moment the piece names in `meta.still`, or its first frame. A banner that types itself in shows every letter.
- If the reader changes that setting while the page is open, it starts or stops to match.

## Play a banner

`banner()` from `ascii.rest/banner` turns any text into a piece, so `mount()` plays it like any other.

```ts
import { mount } from "ascii.rest";
import { banner } from "ascii.rest/banner";

mount(document.querySelector<HTMLElement>("#title")!, banner("hello", { shadow: "rounded" }));
```

<div class="demo"><ascii-banner text="hello" shadow="rounded"></ascii-banner></div>

A banner with a `color` is a coloured piece, so mount it on a `<canvas>` to see the colours. The canvas's CSS `color` tells the banner whether your page is light or dark: dark text means a light page.

```ts
import { mount } from "ascii.rest";
import { banner } from "ascii.rest/banner";

const canvas = document.querySelector<HTMLCanvasElement>("#title")!;
canvas.style.width = "24rem";
mount(canvas, banner("hello", { color: ["#f97316", "#f778ba"], shadow: "rounded" }));
```

<div class="demo"><ascii-banner text="hello" color="#f97316,#f778ba" shadow="rounded"></ascii-banner></div>

`banner()` throws if an option is wrong, such as a font name it doesn't know. The error says what to change. Every banner option, from fonts to colours, is on [banners](/docs/banners/#options).

## Load a piece by its name

Use these when the piece is chosen while the page runs, for example from a menu or the URL. They all come from `ascii.rest`.

| export | what it is |
| --- | --- |
| `load` | One function for each piece, by name. `await load["night-coast"]()` imports that piece. |
| `names` | The names of all 216 pieces, in alphabetical order. |
| `isPiece(name)` | `true` if a string is a piece's name. In TypeScript, it also narrows the string to the `PieceName` type. |
| `canvas` | A `Set` of the names of the coloured pieces: the ones to draw on a `<canvas>`. |

These use the piece's name, with dashes: `night-coast`. The export from `ascii.rest/pieces` is the same piece in camelCase: `nightCoast`. So `isPiece("night-coast")` is `true` and `isPiece("nightCoast")` is `false`.

`load` imports a piece only when you call its function. Bundlers such as Vite put each piece in its own file, so your page downloads only the pieces it plays.

This page plays the piece named in its URL, like `?piece=night-coast`:

```ts
import { canvas, isPiece, load, mount } from "ascii.rest";

const name = new URLSearchParams(location.search).get("piece") ?? "donut";

if (isPiece(name)) {
  const piece = await load[name]();
  const el = document.createElement(canvas.has(name) ? "canvas" : "pre");
  document.body.append(el);
  mount(el, piece);
}
```

This one makes a menu of every piece and plays the one you pick:

```ts
import { canvas, isPiece, load, mount, names } from "ascii.rest";

const select = document.createElement("select");
for (const name of names) select.add(new Option(name));
const box = document.createElement("div");
document.body.append(select, box);

let stop = () => {};

select.addEventListener("change", async () => {
  const name = select.value;
  if (!isPiece(name)) return;
  const piece = await load[name]();
  stop();
  const el = document.createElement(canvas.has(name) ? "canvas" : "pre");
  box.replaceChildren(el);
  stop = mount(el, piece);
});
```

## Draw a frame yourself

You don't need `mount()` to get a frame. A piece is a module with `meta` and a `default` function:

1. Call `default()` with the piece's options. It returns the piece's frame function.
2. Call the frame function with a time in seconds. It returns the frame at that moment, as a string.

```ts
import { banner } from "ascii.rest/banner";

const frame = banner("hi", { shadow: "rounded" }).default();
console.log(frame(0));
```

That prints:

```text
▓▓╮   ▓▓╮ ▓▓╮
▓▓│   ▓▓│ ▓▓│
▓▓▓▓▓▓▓▓│ ▓▓│
▓▓╭───▓▓│ ▓▓│
▓▓│   ▓▓│ ▓▓│
╰─╯   ╰─╯ ╰─╯
```

The same works for every piece in `ascii.rest/pieces`:

```ts
import { bigText, donut } from "ascii.rest/pieces";

const frame = donut.default();
const text = frame(1.5);                             // the donut at 1.5 seconds
const hello = bigText.default({ text: "hello" })(0); // options go to default()
console.log(text, hello);
```

What to know about frames:

- A frame is `meta.rows` lines of `meta.cols` characters, joined with `\n`. There is no newline at the end.
- Drawing a frame needs no browser. It works in Node, in a web worker and on a server.
- Most pieces give the same frame for the same time, whatever you drew before. A few are simulations, like `falling-sand` and `doom-fire`: each call moves them on from the call before. Call those with a rising time, as `mount()` does.
- A piece with `meta.clock` set, like `digital-clock`, shows the real time or date.

### Tell a frame about the page

The frame function takes a second argument, an `Env` object:

| field | what it does | default |
| --- | --- | --- |
| `paper` | Set it to `true` when you draw dark text on a light background. Pieces drawn in shades, like `donut`, swap their light and dark characters so they still read. | `false` |
| `color` | For a coloured piece: a `Uint8Array` of `cols * rows` numbers. The frame writes each cell's colour into it, as an index into `meta.palette`. | none |

```ts
import { donut } from "ascii.rest/pieces";

const onWhite = donut.default()(1.5, { paper: true });
console.log(onWhite);
```

To get the colours of a coloured piece, pass a `color` array and read it back. Cell `x, y` is at index `y * cols + x`:

```ts
import { typescript } from "ascii.rest/pieces";

const { cols, rows, palette } = typescript.meta;
const color = new Uint8Array(cols * rows);
const lines = typescript.default()(0, { color }).split("\n");

const x = 10, y = 5;
console.log(lines[y][x], palette[color[y * cols + x]]); // 8 #007acc: a cell of the blue square
```

### Run your own loop

This loop is a bare version of `mount()`, with no pausing, no colour and no canvas:

```ts
import { donut } from "ascii.rest/pieces";

const pre = document.querySelector<HTMLElement>("#art")!;
const frame = donut.default();
const start = performance.now();

function tick(now: number) {
  pre.textContent = frame((now - start) / 1000);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

### Play a frame function of your own

`mount()` also takes a plain function instead of a piece. That function must return a frame function. With no `meta`, it plays at 30 frames a second, and a canvas gets 80 columns by 24 rows.

```ts
import { mount } from "ascii.rest";

const dots = () => (t: number) => ".".repeat(1 + (Math.floor(t * 4) % 10));
mount(document.querySelector<HTMLElement>("#art")!, dots);
```

To give your own picture a size, colours and options, write it as a piece: see [your own pieces](/docs/pieces/).

## Use the types

These types come from `ascii.rest`:

| type | what it is |
| --- | --- |
| `Piece` | A piece module: `{ meta, default }`. `Piece<O>` gives its options the type `O`. |
| `Meta` | What a piece says about itself, as `piece.meta`: its name, size, frame rate, options and colours. |
| `Frame` | A frame function: `(t: number, env?: Env) => string`. |
| `Env` | The frame function's second argument: `{ paper?: boolean; color?: Uint8Array }`. |
| `Options` | Any piece's options: `Record<string, unknown>`. |
| `Category` | The 15 categories, like `"scenes"`, `"logos"` and `"distros"`. |
| `PieceName` | The name of every piece, as a union of strings. |
| `MountOptions` | The third argument of `mount()`: a piece's options, plus `fps` and `motion`. |

Every field of `Meta`, what it does and its default, is in [fill in its meta](/docs/pieces/#fill-in-its-meta).

A helper that takes any piece and plays it in the right element:

```ts
import { mount, type MountOptions, type Piece } from "ascii.rest";

export function addPiece(parent: HTMLElement, piece: Piece, options?: MountOptions): () => void {
  const el = document.createElement(piece.meta.palette ? "canvas" : "pre");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", piece.meta.name);
  parent.append(el);
  return mount(el, piece, options);
}
```

`PieceName` catches a misspelt name before the page runs:

```ts
import type { PieceName } from "ascii.rest";

const favourites: PieceName[] = ["donut", "night-coast", "rust"];
console.log(favourites);
```

The other modules export their own types:

```ts
import type { BannerOptions, BannerPiece, Colors, Effect, Font, FontName, ShadowName, Themed } from "ascii.rest/banner";
import type { BannerSvgColor, BannerSvgOptions, Loop, Part, Shot, SvgOptions } from "ascii.rest/svg";
import type { Bannered, Output, Played, PlayOptions, PrintOptions } from "ascii.rest/terminal";
```

Each is described on [api](/docs/api/).

## Next

- [your own pieces](/docs/pieces/): write a piece and play it with `mount()`.
- [banners](/docs/banners/): every option of `banner()`.
- [api](/docs/api/): everything each module exports.
