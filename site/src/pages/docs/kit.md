---
layout: ../../layouts/Docs.astro
title: the kit
description: Make your own animated ascii art in a few lines with ascii.rest/kit, as pieces that play everywhere the library's do.
---

The kit is the part of ascii.rest for making your own ascii art. It does the work every piece used to do by hand: the maths, the shading, the colours, the 3D, the string building. You say what you want, and get a **piece** back.

Here is a whole piece, a sea of rolling waves in two blues:

```ts
// sea.ts
import { TAU, field } from "ascii.rest/kit";

export default field({ name: "sea", cols: 48, rows: 10, ramp: "blocks", colors: ["#0b3d91", "#7fdbff"], period: 2 },
  (x, y, t, at) => 0.5 + 0.5 * Math.sin(x * 6 + y * 2 + TAU * at.phase));
```

`field()` calls your function once for each cell, and the number it returns picks the character. Its frame at 1 second, in one ink:

```text
▒▓███▓░   ░▒███▓▒░   ▒▓███▓░   ░▒███▓▒░   ▒▓███▓
▓███▓▒    ▒▓███▓░   ░▓███▓▒   ░▒▓███▒░   ░▓███▓▒
▓███▒░   ░▓███▓▒   ░▒▓███▒░   ░▓███▓░   ░▒████▒░
███▓░   ░▒███▓▒░   ▒▓███▓░   ░▒███▓▒░   ▒▓███▓░
██▓▒    ▒▓███▓░   ░▓███▓▒   ░▒▓███▒░   ░▓███▓▒
██▒░   ░▓███▓▒   ░▒▓███▒░   ░▓███▓░   ░▒████▒░
█▓░   ░▒███▓▒░   ▒▓███▓░   ░▒███▓▒░   ▒▓███▓░
▓▒    ▒▓███▓░   ░▓███▓▒   ░▒▓███▒░   ░▓███▓▒   ░
▒░   ░▓███▓▒   ░▒▓███▒░   ░▓███▓░   ░▒████▒░   ░
░   ░▒███▓▒░   ▒▓███▓░   ░▒███▓▒░   ▒▓███▓░   ░▒
```

It repeats every 2 seconds, so an SVG of it loops without a jump. In colour, each cell takes one of 16 blues between the two you gave.

Everything the kit makes is a normal piece, the same shape as `donut` or `rust`. So it plays everywhere a piece plays: in React, on any web page, as an SVG for a README, and in a terminal.

## Install

The kit is in the npm package, from version 0.4.0:

```sh
npm install ascii.rest
```

Import it from `ascii.rest/kit`. It has no dependencies, and runs in browsers and in Node.

To copy its source into your project instead, to keep and change:

```sh
npx ascii.rest add kit
```

It lands in `components/ascii/kit/`, with the files it needs. Import from `./kit/index` there. See [your own copy](/docs/copy/).

## Play it anywhere

A piece made with the kit plays the same way as a library piece.

In React or Next.js:

```tsx
// sea-card.tsx
"use client";
import { Ascii } from "ascii.rest/react";
import sea from "./sea";

export function SeaCard() {
  return <Ascii piece={sea} />;
}
```

As an SVG for a GitHub README, in light and dark:

```ts
// make-svg.ts
import { writeFileSync } from "node:fs";
import { svg } from "ascii.rest/svg";
import sea from "./sea.ts";

writeFileSync("sea.svg", svg(sea));
writeFileSync("sea.dark.svg", svg(sea, { dark: true }));
```

Run it with `node make-svg.ts`. Node runs `.ts` files as they are from 22.18, if the import names the `.ts` file.

In a terminal, for a CLI's splash screen:

```ts
// splash.ts
import { play } from "ascii.rest/terminal";
import sea from "./sea.ts";

await play(sea, { seconds: 3 });
```

With `mount()` on any page: `mount(canvas, sea)`. More on [react](/docs/react/), [svg](/docs/svg/), [terminal](/docs/terminal/) and [typescript](/docs/typescript/).

## Pick a tool

Each tool makes a piece in one call. Each also has a drawing function, for mixing it with other drawing in one piece.

| tool | what it makes | one call | page |
| --- | --- | --- | --- |
| fields | art from a formula of x, y and t, like a shader | `field(fn)` | [fields](/docs/kit-field/) |
| drawing | text, lines, boxes, circles, plots and pixel art on the grid | `piece(spec, draw)` | [drawing](/docs/kit-draw/) |
| maths | noise, seeded randomness, easing, loops and 3D points | `noise()`, `random()` | [maths](/docs/kit-math/) |
| 3d scenes | lit, spinning shapes: a donut, a planet, a cube | `scene(torus())` | [3d scenes](/docs/kit-shapes3d/) |
| particles | snow, rain, sparks, fireworks and systems of your own | `particles(spec, "snow")` | [particles](/docs/kit-particles/) |
| effects | a glint, a glitch, a wave or a typing on any piece or text | `glint(rust)` | [effects](/docs/kit-fx/) |
| layouts | pieces side by side, in a grid, over each other, in turn | `grid([a, b, c])` | [layouts](/docs/kit-compose/) |
| images | any PNG, JPG or SVG image as ascii | `await fromImage(url)` | [images](/docs/kit-image/) |
| materials | objects you name: a glass of water, a candle, a house | `picture([shape(cup())])` | [materials](/docs/kit-materials/) |
| svg drawings | any SVG, its parts brought to life by name | `fromSvg(markup)` | [svg drawings](/docs/kit-vector/) |

They all come from one import, `ascii.rest/kit`, and they work together: a field behind text, particles off a banner, a 3D scene in a layout, an effect on any of them.

## piece(): draw your own

`piece()` is what every tool is built on. Give it a name, a size, and a function that draws the frame at `t` seconds into a grid:

```ts
// pulse.ts
import { piece } from "ascii.rest/kit";

export default piece({ name: "pulse", cols: 32, rows: 3 }, (t, s) => {
  s.write(12, 1, Math.sin(t * 3) > 0 ? "* beat *" : "  beat  ");
});
```

The grid `s` starts empty every frame. Write into it, and the kit turns it into the frame and its colours. The third argument, `ctx`, holds the piece's `options`, `paper` (true on a light page), `mono` (true when drawn in one ink), and `cols` and `rows`.

What `piece()` takes:

| field | what it is | default |
| --- | --- | --- |
| `name` | its name, in lower case | required |
| `cols`, `rows` | its size in cells, up to 320 by 120 | required |
| `note` | one line, up to 72 characters, saying what you see | the name |
| `category` | one of the library's 15 categories | `"generative"` |
| `fps` | frames a second, `0` for a still | `30` |
| `palette` | its colours: a list, or `{ light, dark }` of the same length | none: one ink |
| `ink` | the colour of a cell drawn with none | the first colour |
| `ground` | the colour behind it, as `#rrggbb` | none |
| `cell` | `2` for character cells, `1` for a square grid | `2` |
| `loop` | seconds after which it repeats exactly: the loop `svg()` plays | none |
| `still` | the moment to hold for readers who prefer reduced motion | `0` |
| `clock` | `true` if it shows the real time | `false` |
| `options` | its options and their defaults, passed to the drawing as `ctx.options` | none |
| `clear` | empty the grid before each frame | `true` |

For work done once, pass `{ setup }` in place of the drawing. It runs once each time the piece starts playing, with the options and the size, and returns the drawing:

```ts
// dots.ts
import { piece, random } from "ascii.rest/kit";

export default piece({ name: "dots", cols: 40, rows: 8, loop: 2, options: { count: 30 } }, {
  setup: ({ count }, { cols, rows }) => {
    const rnd = random(7);
    const dots = Array.from({ length: count }, () => [rnd.int(0, cols - 1), rnd.int(0, rows - 1)]);
    return (t, s) => dots.forEach(([x, y], i) => s.set(x, y, (t + i / 10) % 2 < 1 ? "*" : "."));
  },
});
```

`piece()` checks everything when it is called and throws an error that says what to change: `ascii.rest: cols takes a whole number from 1 to 320, not 0`. Every tool in the kit does the same.

## The grid

The grid, a `Surface`, is `cols` by `rows` cells. Column 0, row 0 is the top left. Each cell holds one character and one colour. A fraction is taken down to its cell, and anything outside the grid is left out, so you never need to check bounds.

| method | what it does |
| --- | --- |
| `s.set(x, y, ch, color?)` | draws one character. `""` clears the cell. |
| `s.get(x, y)` | the character at a cell, `""` where nothing is drawn |
| `s.write(x, y, text, color?)` | writes text, `"\n"` starting the next row back at `x` |
| `s.fill(ch, color?, region?)` | fills the grid, or a region, with one character |
| `s.clear(region?)` | empties the grid, or a region |
| `s.paste(grid, x, y)` | lays another grid over this one: its empty cells and spaces let this one show |
| `s.load(text)` | reads a frame back in: spaces become empty cells |
| `s.put(i, code, color)` | the fast write, by index, for drawing loops |
| `s.colorAt(x, y)` | a cell's palette index |
| `s.clone()` | a copy |

`s.paper` and `s.mono` say how this frame is drawn. A region is `{ x, y, cols, rows }`.

Use characters that are one cell wide: ASCII, box drawing and blocks. `s.set` throws for a tab, a newline, or an emoji.

## Colours

A piece with a `palette` is a coloured piece. It draws on a `<canvas>`, in a terminal and in an SVG in colour, and as text in one ink in a `<pre>`.

A colour, where the kit takes one, is either:

- a number: an index into the palette, `0` for the first colour;
- `"#rrggbb"`: found in the palette, the nearest if it isn't one of them.

A palette can be one list for both pages, or `{ light, dark }` with a list for each, the same length. Index `1` is then the light list's second colour on a light page and the dark list's on a dark one, so one drawing reads on both:

```ts
// two-pages.ts
import { piece } from "ascii.rest/kit";

const palette = { light: ["#1f2328", "#cf222e"], dark: ["#f0f6fc", "#ff7b72"] };

export default piece({ name: "alert", cols: 20, rows: 1, fps: 0, palette }, (t, s) => {
  s.write(0, 0, "status:");
  s.write(8, 0, "failing", 1);
});
```

A cell drawn with no colour takes the piece's `ink`, the first colour by default. `INK` is GitHub's text colours, `{ light: "#1f2328", dark: "#f0f6fc" }`, for text that should look like the page's own.

A piece has at most 64 colours. Helpers for making them: `gradient(stops, n)` gives `n` colours along a fade, `spread(palette, n)` does it for each page, `mix(a, b, k)` blends two, and `rgb()` and `hex()` convert.

## Shading with ramps

A **ramp** is a string of characters from no ink to the most. The kit names nine:

| name | characters |
| --- | --- |
| `standard` | ` .:-=+*#%@` |
| `detailed` | 70 characters, from ` .'` to `$` |
| `donut` | ` .,-~:;=!*#$@` |
| `blocks` | ` ░▒▓█` |
| `eighths` | ` ▁▂▃▄▅▆▇█` |
| `dots` | ` .·•●` |
| `lines` | ` .-=≡` |
| `stars` | ` .·+*` |
| `binary` | ` #` |

`shadeChar(ramp, v)` gives the character for a brightness `v` from 0 to 1. Its third argument turns the ramp round, for a light page: there, a dense `@` reads as dark, not bright. Its fourth dithers between neighbouring characters, with `bayer(x, y)`. Any tool that shades takes `ramp` as a name or as two or more characters of your own, and turns it round on paper by itself.

## Time and loops

A frame should depend only on `t`. Players draw frames when they need them: `mount()` pauses off screen, `svg()` samples 15 frames a second, and reduced motion holds one. So:

- Make random numbers from a seed, with `random(seed)`, never `Math.random()`.
- Give `loop` (or a tool's `period`) when the piece repeats, so the SVG plays one seamless loop.
- When two loops combine, as in a layout or an effect, the kit finds the time after which both come round together, up to 60 seconds.

## Small helpers

Besides the tools, `ascii.rest/kit` has the maths every piece needs:

| helper | what it does |
| --- | --- |
| `TAU` | a whole turn in radians, `2 * Math.PI` |
| `clamp(v, lo?, hi?)` | `v` kept between `lo` and `hi`, 0 and 1 by default |
| `lerp(a, b, k)` | from `a` to `b` by `k` |
| `smoothstep(e0, e1, v)` | 0 below `e0`, 1 above `e1`, a smooth S between |
| `fract(v)` | the part after the point, 0 to 1 |
| `hash(a, b?, c?, d?)` | a number 0 to 1 from whole numbers: the same in, the same out |
| `mulberry32(seed)` | a seeded generator of numbers 0 to 1 |
| `valueNoise(x, y, seed?)` | smooth noise 0 to 1 |
| `sample(piece).at(t)` | any piece's frame at `t` as a grid, to read or lay over |
| `snapshot(piece, t)` | any piece's frame at `t` as text and colours, for tests |
| `asPiece(text)` | text or a grid as a still piece |

[maths](/docs/kit-math/) has much more: simplex noise, easing, tweens, a camera.

## Next

- [fields](/docs/kit-field/): a picture from a formula, the shortest way in.
- [3d scenes](/docs/kit-shapes3d/): the donut in one line.
- [your own pieces](/docs/pieces/): the piece contract the kit builds on.
