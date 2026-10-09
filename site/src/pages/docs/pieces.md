---
layout: ../../layouts/Docs.astro
title: your own pieces
description: Write your own animation as a piece, then play it in React, on any web page, as an SVG or in a terminal.
---

A **piece** is one animation, like `donut` or `rust`. You can write your own in a few lines of TypeScript. It then plays in React, on any web page, as an SVG and in a terminal, the same way the library's pieces do.

<figure class="video">
  <video src="https://xd8s9bimnuiwf5ec.public.blob.vercel-storage.com/videos/pieces.mp4" poster="https://xd8s9bimnuiwf5ec.public.blob.vercel-storage.com/videos/pieces.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>Writing a new piece, orbit, and playing it.</figcaption>
</figure>

Here is a whole piece: a line that turns, then the word "loading". Save it as `pieces/spinner.ts`:

```ts
// pieces/spinner.ts
import type { Frame, Meta } from "ascii.rest";

export const meta = {
  name: "spinner",
  category: "ui",
  note: "a line turning while something loads",
  cols: 10,
  rows: 1,
  fps: 6,
} satisfies Meta;

export default function spinner(): Frame {
  return (t) => `${"|/-\\"[Math.floor(t * 3) % 4]} loading `;
}
```

It draws these four frames in turn, a third of a second each, then starts again:

```text
| loading
/ loading
- loading
\ loading
```

Play it in React:

```tsx
"use client";
import { Ascii } from "ascii.rest/react";
import * as spinner from "./pieces/spinner";

export function Spinner() {
  return <Ascii piece={spinner} />;
}
```

The rest of this page explains each part, then shows how to play your piece everywhere else.

## A fuller example: orbit

`orbit` draws a planet going round its sun. It takes one option, `speed`. It draws its track once, when it starts, and then only moves the planet. Save it as `pieces/orbit.ts`:

```ts
// pieces/orbit.ts
import type { Frame, Meta } from "ascii.rest";

export const meta = {
  name: "orbit",
  category: "space",
  note: "a planet going round its sun",
  cols: 21,
  rows: 9,
  fps: 30,
  loop: 4,
  options: { speed: 1 },
} satisfies Meta<{ speed: number }>;

export default function orbit({ speed = meta.options.speed } = {}): Frame {
  const { cols, rows } = meta;
  // The cell at an angle on the orbit: up to 9 columns either side of the sun, and 4 rows.
  const at = (angle: number) => [Math.round(10 + 9 * Math.cos(angle)), Math.round(4 + 4 * Math.sin(angle))];

  // Done once, out here: the sun and the dotted track never move.
  const track = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  for (let a = 0; a < 2 * Math.PI; a += 0.01) {
    const [x, y] = at(a);
    track[y][x] = "·";
  }
  track[4][10] = "*";

  // The frame at t seconds. At speed 1 the planet goes round once every 4 seconds.
  return (t) => {
    const grid = track.map((row) => [...row]);
    const [x, y] = at((t / 4) * speed * 2 * Math.PI);
    grid[y][x] = "O";
    return grid.map((row) => row.join("")).join("\n");
  };
}
```

At 0 seconds it draws this. One second later the planet is at the bottom, and after 4 seconds it is back here.

```text
      ·········
   ····       ····
  ··             ··
 ··               ··
 ·        *        O
 ··               ··
  ··             ··
   ····       ····
      ·········
```

## What a piece is made of

A piece is a module with two exports:

| export | what it is |
| --- | --- |
| `meta` | Facts about the piece: its name, its size in characters and how many frames a second it plays. |
| `default` | A function that takes the piece's options and returns `frame`. |

`frame(t)` returns the picture at `t` seconds. A **frame** is that picture: one string of `meta.rows` lines, joined with `"\n"`. Every line is exactly `meta.cols` characters long. Pad short lines with spaces.

There are two functions for a reason:

- The outer function runs once, when the piece starts. Do slow work there. `orbit` draws its track there. `spinner` has nothing to set up, so its outer function only returns `frame`.
- The inner `frame` runs for every frame, up to `fps` times a second. Draw only what moves.

Use characters that are one cell wide: ASCII, `·`, and the box and block characters like `─ │ ┌ █ ░`. Emoji and other wide characters break the grid.

A **player** is anything that plays a piece: `<Ascii>`, `<ascii-art>`, `mount()`, `svg()` or `play()`. They all call your two functions the same way, so a piece written as this page says plays in all of them.

`import * as orbit` gives you an object with `meta` and `default`. Any object of that shape is a piece, so you can also write one inline, typed as `Piece` from `ascii.rest`.

## Fill in its meta

`meta` tells every player how to show your piece. The first six fields are required.

| field | what it does | default |
| --- | --- | --- |
| `name` | The name people see, in lower case: `"newton's cradle"`. In the library, the piece's name, with dashes, comes from its file name instead: `newtons-cradle`. | required |
| `category` | Its group. One of `scenes`, `shapes`, `space`, `physics`, `nature`, `creatures`, `objects`, `generative`, `effects`, `ui`, `data`, `type`, `logos`, `companies`, `distros`. | required |
| `note` | One lower-case line, up to 72 characters, saying what you see. | required |
| `cols` | Its width in characters. Every line of every frame is this long. | required |
| `rows` | Its height in lines. Every frame has this many lines. | required |
| `fps` | Frames a second. `0` makes a still picture, drawn once. | required |
| `options` | The default value of each option your function takes. See [give it options](#give-it-options). | none |
| `loop` | For a piece that repeats exactly: how many seconds one repeat takes. An SVG of it plays that long, then starts again. | none |
| `still` | The moment, in seconds, to show when it can't move: for readers who prefer reduced motion, and for `still()` in a terminal. | `0` |
| `clock` | Set it to `true` if the picture shows the real time or date. | `false` |
| `palette` | 2 to 64 colours, each as `#rrggbb`. A piece with a palette is a coloured piece: it draws in colour on a `<canvas>`. See [draw it in colour](#draw-it-in-colour). | none |
| `ground` | The colour behind a coloured piece, as `#rrggbb`, on a canvas and in a terminal. Without it, the page shows through. | none |
| `cell` | How tall a cell is compared to its width, on a canvas and in an SVG. `2` is a character's shape. `1` makes square cells. | `2` |

## Give it options

Options let people change your piece without editing it, like `orbit`'s `speed`. Set them up in two places:

1. List each option's default in `meta.options`: `options: { speed: 1 }`.
2. Take each option in the default function, with the same default: `function orbit({ speed = meta.options.speed } = {})`.

Every player starts from the defaults in `meta.options`, puts the options it was given on top, and calls your function with the result. The default in the function covers a direct call, like `orbit.default()`.

People pass options like this:

| where | how |
| --- | --- |
| React | `<Ascii piece={orbit} options={{ speed: 2 }} />` |
| `mount()` | `mount(el, orbit, { speed: 2 })` |
| `<ascii-art>` | the `options` attribute, as JSON: `options='{"speed":2}'` |
| `svg()` | `svg(orbit, { options: { speed: 2 } })` |
| `play()` | `play(orbit, { options: { speed: 2 } })` |

Don't name an option `fps` or `motion`. `mount()`, `<Ascii>` and `<ascii-art>` use those two names for themselves.

## Draw it in colour

A piece can colour each cell on its own. Give it a `palette`, then write a palette index for each cell into `env.color`. `env` is the second argument of `frame(t, env)`.

| `env` field | what it is |
| --- | --- |
| `color` | A `Uint8Array` with one number for each cell, `cols * rows` in all, row by row. Write each cell's palette index into it: the cell at column `x`, row `y` is `color[y * cols + x]`. It is `undefined` when the piece is drawn in one colour. |
| `paper` | `true` when the piece is drawn dark on a light background. Use it to pick colours that show up there. |

This is `orbit` in colour. Its palette holds three colours for a light page, then the same three for a dark page. `paper` picks the half.

```ts
// pieces/orbit-color.ts
import type { Frame, Meta } from "ascii.rest";

export const meta = {
  name: "orbit in colour",
  category: "space",
  note: "a blue planet going round a yellow sun",
  cols: 21,
  rows: 9,
  fps: 30,
  loop: 4,
  // The track, the sun and the planet: three colours for a light page, then three for a dark one.
  palette: ["#6e7781", "#9a6700", "#0969da", "#8b949e", "#e3b341", "#58a6ff"],
} satisfies Meta;

export default function orbitColor(): Frame {
  const { cols, rows } = meta;
  const at = (angle: number) => [Math.round(10 + 9 * Math.cos(angle)), Math.round(4 + 4 * Math.sin(angle))];

  const track = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  for (let a = 0; a < 2 * Math.PI; a += 0.01) {
    const [x, y] = at(a);
    track[y][x] = "·";
  }
  track[4][10] = "*";

  return (t, { paper = false, color } = {}) => {
    const grid = track.map((row) => [...row]);
    const [px, py] = at((t / 4) * 2 * Math.PI);
    grid[py][px] = "O";

    // Only when it is drawn in colour: a palette index for every cell, row by row.
    if (color) {
      const half = paper ? 0 : 3; // paper is true on a light page: use the first three colours
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) color[y * cols + x] = half + Math.max(0, "·*O".indexOf(grid[y][x]));
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
```

Where colour shows:

- `<Ascii>` and `<ascii-art>` see the `palette` and draw on a `<canvas>`. With `mount()`, pass it a `<canvas>` yourself.
- In a `<pre>`, or with `mono`, the piece is text in one colour and `env.color` is `undefined`. So draw the same text either way, and only write colours when `color` is there.
- `svg()` draws in colour. So does `play()`, unless you pass `mono: true`.

Where `paper` comes from:

| where it plays | `paper` is `true` when |
| --- | --- |
| a `<pre>` or `<canvas>` on a page | the element's text colour is dark. On a canvas, a piece with a `ground` goes by that instead: `paper` is true when the ground is light. |
| `svg()` | you don't pass `dark: true` |
| `play()` in a terminal | you pass `light: true`. A coloured piece with a `ground`, played in colour, goes by its ground instead. |

`paper` matters for text pieces too. On a dark page a dense character like `@` looks bright. On a light page it looks dark. So a piece that shades with characters, from a light `.` to a dense `@`, reverses that order when `paper` is true. `donut` does it like this: `RAMP[paper ? RAMP.length - 1 - i : i]`.

## Keep it a function of time

Played twice from the start, a piece must draw the same frames both times. A frame that only reads `t`, like `orbit`'s, does this on its own.

This matters because players call `frame(t)` when they need to. `mount()` pauses when the piece is off screen. It holds one frame for readers who prefer reduced motion. `svg()` samples 15 frames a second to make its loop.

Three rules keep it true:

1. Don't call `Math.random()`. Make random numbers from a seed instead, once, in the outer function.
2. Don't read the date or time, unless the piece shows it. Then set `clock: true` in `meta`.
3. A simulation may keep state between frames and step it forward as `t` grows, as `doom-fire` does. Seed its randomness too.

This piece puts stars in random places, from a seed:

```ts
// pieces/twinkle.ts
import type { Frame, Meta } from "ascii.rest";

export const meta = {
  name: "twinkle",
  category: "space",
  note: "stars that twinkle",
  cols: 30,
  rows: 6,
  fps: 10,
} satisfies Meta;

// Random numbers from a seed: the same seed gives the same numbers, every time.
const mulberry32 = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export default function twinkle(): Frame {
  const { cols, rows } = meta;
  // Chosen once, from the seed: where each star is, and when it twinkles.
  const random = mulberry32(7);
  const stars = Array.from({ length: 24 }, () => ({
    x: Math.floor(random() * cols),
    y: Math.floor(random() * rows),
    phase: random() * 2 * Math.PI,
  }));

  // The frame only reads t, so the same t always gives the same picture.
  return (t) => {
    const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    for (const s of stars) grid[s.y][s.x] = Math.sin(3 * t + s.phase) > 0.5 ? "*" : "·";
    return grid.map((row) => row.join("")).join("\n");
  };
}
```

## TypeScript notes

Two things to know when you type a piece.

Write `satisfies Meta` after `meta`, as the examples on this page do, rather than `const meta: Meta = ...`. It checks every field and keeps the exact values, so `meta.options.speed` is a `number`. With `: Meta`, TypeScript says `meta.options` is possibly `undefined`.

To describe the options with an `interface`, add `[key: string]: unknown;` to it, as the library's pieces do. Without that line, `Meta<YourOptions>` doesn't compile. A `type`, or an inline type like `orbit`'s, works as it is.

## Play it in React or Next.js

`<Ascii>` takes your piece module like any other. Its props are on [react](/docs/react/).

```tsx
"use client";
import { Ascii } from "ascii.rest/react";
import * as orbit from "./pieces/orbit";
import * as orbitColor from "./pieces/orbit-color";

export function Orbits() {
  return (
    <>
      <Ascii piece={orbit} options={{ speed: 2 }} label="a planet going round its sun" />
      <Ascii piece={orbitColor} />
      <Ascii piece={orbitColor} mono />
    </>
  );
}
```

In the Next.js app router, keep the `"use client"` line. A server component can't pass a piece module to `<Ascii>`, because the module holds a function. Put the component in its own file, like this one, then use `<Orbits />` from any page. Other React apps ignore the line. More on [next.js](/docs/nextjs/).

## Play it on any web page

There are three ways, depending on how your page is built.

### With mount()

`mount()` plays a piece in an element you choose. Use a `<pre>` for text and a `<canvas>` for colour.

```ts
import { mount } from "ascii.rest";
import * as orbit from "./pieces/orbit";
import * as orbitColor from "./pieces/orbit-color";

// As text, in the pre's own colour.
const stop = mount(document.querySelector("pre")!, orbit, { speed: 2 });

// In colour.
mount(document.querySelector("canvas")!, orbitColor);

// Later, to stop the first one:
stop();
```

It plays only while the element is on screen and the tab is open. For readers who prefer reduced motion, it holds one frame. More on [typescript](/docs/typescript/).

### In Astro

The Astro `<Ascii>` component only takes the name of a library piece. For your own, call `mount()` in a script:

```astro
---
// src/pages/index.astro
---
<pre id="orbit"></pre>

<script>
  import { mount } from "ascii.rest";
  import * as orbit from "../pieces/orbit";

  mount(document.getElementById("orbit")!, orbit);
</script>
```

### With the ascii-art tag

`<ascii-art>` loads a piece from a URL with `src`:

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>

<ascii-art src="/pieces/orbit.js" options='{"speed":2}'></ascii-art>
```

- The file must be JavaScript, because the browser loads it as it is. Serve your build's output, or write the piece in plain JavaScript: the same code without `import type`, `satisfies` and the type annotations. [html](/docs/html/#play-your-own-piece) has an example.
- `src` works like a link: a relative URL starts from the page's own URL.
- A file on another site must allow cross-origin requests (CORS).
- `piece="orbit"` doesn't work: `piece` only takes the names of library pieces.

## Make an SVG of it

`svg()` turns your piece into an animated SVG file. An SVG plays where scripts can't run, like a GitHub README.

```ts
// make-svg.ts
import { writeFileSync } from "node:fs";
import { svg } from "ascii.rest/svg";
import * as orbit from "./pieces/orbit";

writeFileSync("orbit.svg", svg(orbit)); // for a light page
writeFileSync("orbit.dark.svg", svg(orbit, { dark: true })); // for a dark page
```

To run it with `node make-svg.ts`, write the import as `"./pieces/orbit.ts"`. Node runs a `.ts` file as it is from Node 22.18, or 23.6 in Node 23. It needs the file extension in the import. A bundler finds the file without it.

The SVG plays one loop, then starts again. A piece with `fps: 0` makes a still SVG instead. `svg()` picks the loop's length from the first of these that applies:

1. `meta.loop`, in seconds.
2. For a piece in the `logos` or `companies` category, the time between its glints. For `distros`, the time between its scans.
3. 4 seconds.

Make `loop` the time your piece takes to come back to where it started, so the SVG doesn't jump. If you change an option that changes that time, pass `seconds` too: `svg(orbit, { options: { speed: 0.5 }, seconds: 8 })`.

Every option of `svg()` is on [svg](/docs/svg/). To show the two files in a README, see [github readme](/docs/readme/).

## Play it in a terminal

`play()` plays your piece in a terminal, for a CLI's splash screen:

```ts
// splash.ts
import { play } from "ascii.rest/terminal";
import * as orbit from "./pieces/orbit";

await play(orbit, { seconds: 3 });
```

It plays for 3 seconds, or until a key is pressed, then puts the terminal back. A coloured piece plays in its dark colours, or its light ones with `light: true`. As with the SVG script, use `"./pieces/orbit.ts"` to run it with Node directly. More on [terminal](/docs/terminal/).

## Start from one of ours

Every piece's page shows its source, for example [donut](/donut/). To get a copy you can edit, run:

```sh
npx ascii.rest add donut
```

Then change its characters, its colours or its speed. Keep the rules on this page and it still plays everywhere. See [your own copy](/docs/copy/).

## Add it to the library

To share your piece with everyone, add it to [the repo](https://github.com/bas3line/ascii) in a pull request.

You need Node 23.6 or later. The repo's scripts are `.ts` files that Node runs with no build step, and [CONTRIBUTING](https://github.com/bas3line/ascii/blob/main/CONTRIBUTING.md) sets 23.6 as the lowest version for that. The repo's CI runs Node 24.

1. Clone the repo and install it:

   ```sh
   git clone https://github.com/bas3line/ascii
   cd ascii
   npm install
   ```

2. Save your piece as `src/pieces/orbit.ts`. The file name, without `.ts`, becomes the piece's name, with dashes: `orbit`, or `night-coast`. Use only lower-case letters and digits, with single dashes between words.
3. Change its import to `import type { Frame, Meta } from "../types.ts";`. The library's pieces import their types from there.
4. Add it to the library's lists:

   ```sh
   npm run gen
   ```

5. Check it, and print its frames at 0, 1, 2.5 and 5 seconds:

   ```sh
   npm run check -- orbit --show
   ```

6. Check the types:

   ```sh
   npm run typecheck
   ```

7. See it on a page. Start the site, then open `http://localhost:4321/orbit/`:

   ```sh
   cd site
   npm install
   npm run dev
   ```

8. Open a pull request with one piece in it. Paste the frames from step 5.

### What npm run check fails

`npm run check` reads the file, then plays the piece twice from 0 to 6 seconds at its `fps` (every half second when `fps` is 0). It looks at the frames at 0, 1, 2, 3, 4 and 6 seconds. It also plays every piece with `paper: true`. A piece with a `palette` is played once more with no `env.color`, as in a `<pre>`, and those frames must pass the size and character rules too.

It fails a piece when any of these is true:

| rule | it fails when |
| --- | --- |
| file name | The file name isn't lower-case letters and digits with single dashes between words, like `orbit` or `night-coast`. |
| no imports | The file has an `import` that isn't `import type`. |
| no browser | The file has the word `document`, `window`, `globalThis`, `navigator`, `localStorage` or `requestAnimationFrame` anywhere, even in a comment. |
| no `Math.random` | The file has `Math.random` anywhere. |
| it loads | The file throws when it is imported. |
| exports | There is no `meta` object, or no default function. |
| `name` | It is empty, or not a string. |
| `category` | It isn't one of the 15 in [fill in its meta](#fill-in-its-meta). |
| `note` | It is empty, or over 72 characters. |
| size | `cols` isn't a whole number from 1 to 80, or `rows` from 1 to 32. A scene (`category: "scenes"`) can be up to 320 by 120. |
| `fps` | It isn't a whole number from 0 to 60. |
| `options` | It is set, but isn't an object. |
| `palette` | It is set, but isn't 2 to 64 colours, each as `#rrggbb`. |
| `ground` | It is set, but isn't `#rrggbb`. |
| `cell` | It is set, but isn't `1` or `2`. |
| scene colours | A scene has no `palette`, or no `ground`. |
| it runs | The default function or a frame throws, or a frame isn't a string. |
| exact size | A frame isn't exactly `rows` lines of `cols` characters. |
| characters | A frame has a character that isn't printable ASCII, `·`, `°`, or a box drawing or block character (U+2500 to U+259F). A scene may also use `•` and `●`. |
| first frame | The frame at 0 seconds is nearly blank: under 3 characters that aren't spaces, and under 2% of its cells. |
| moves | `fps` is above 0, but there are fewer than 3 different frames among the 6 it looks at. |
| holds still | `fps` is 0, but the frame changes. A piece with `clock: true` is let off. |
| same frames | The two plays give different frames, or different colours. A piece with `clock: true` is let off. |
| palette index | A frame writes a colour index into `env.color` that is past the end of the `palette`. |
| a scene's colours | A scene's first frame uses fewer than 4 palette colours on cells that aren't spaces. |
| fast | A frame takes over 4 ms on average, or the slowest takes over 30 ms. A scene gets 10 ms and 40 ms. |

The checker checks only these rules. A reviewer also looks at the frames: the piece should be easy to recognise, move the way its subject would, and loop without a visible jump. [CONTRIBUTING](https://github.com/bas3line/ascii/blob/main/CONTRIBUTING.md) has the rest. Your piece is released under the MIT licence.

## Next

- [your own copy](/docs/copy/): copy a library piece into your project and change it.
- [react](/docs/react/): every prop of `<Ascii>`.
- [svg](/docs/svg/): every option of `svg()`, and serving SVGs.
