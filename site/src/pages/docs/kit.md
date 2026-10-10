---
layout: ../../layouts/Docs.astro
title: the kit
description: Make your own animated ascii art with ascii.rest/kit. Start with recipes, whole things in one line with no maths, then go deeper when you want to.
---

The kit is the part of ascii.rest for making your own ascii art. Start with a **recipe**: a whole thing in one line, asked for by name, with options in plain words and no maths.

```ts
// sea.ts
import { sea } from "ascii.rest/kit";

export default sea({ palette: "ocean" });
```

That is the whole piece: the open sea to the horizon, swell coming in, in ocean blues that read on a light page and a dark one. More, each one line:

```ts
// one-liners.ts
import { banner } from "ascii.rest/banner";
import { clockFace, gauge, plasma, spinning, stars, torus } from "ascii.rest/kit";

export const donut = spinning(torus(), { speed: "slow" });
export const hot = plasma({ palette: "fire" }).mask("HOT");
export const night = stars({ density: "sparse" }).behind(banner("hello", { effect: "still" }));
export const clock = clockFace();
export const cpu = gauge({ label: "cpu" });
export default donut;
```

The donut at 1 second, in one ink:

```text
                  @@@@@@@@@@@
             @@@@@$$$$$$$$@@@@@@$#
           @@@$$#***!!!**##$$@@@@@$#
         @@@$##*!=;;:::;;=!*#$$@@@@$$*
       @@@@$#*!=:~-,,,,,-~;!*#$@@@@@$#*
      @@@@$#*!=:-,,,      ,;!#$@@@@@$$#!
     #@@@@$#*!=~,,          !#$@@@@@$$#!
     $@@@@$$#*!:,           #$@@@@@@$##!;
     $@@@@@@$$#*=         *$@@@@@@@$$#*!:
     #$@@@@@@@$$$##*! #$$@@@@@@@@@$$#*!;
     *#$$@@@@@@@@@@@@@@@@@@@@@@@$$##*!=:
      *#$$$@@@@@@@@@@@@@@@@@@$$$##**!;:
       !*##$$$$@@@@@@@@@@$$$$###*!!=;-
        ;!**####$$$$$$$$####***!==:~,
          :=!!!***********!!!=;;:-,
             :;;=========;;::~-,
                 ,------,,,
```

Everything the kit makes is a normal **piece**, the same shape as `donut` or `rust` in the library. So it plays everywhere a piece plays: in React, on any web page, as an SVG for a README, and in a terminal. Try one in your terminal as you write it, `npx ascii.rest play sea.ts --watch`, which plays the file's default export again each time you save.

## Words, not numbers

The recipes take the same words for the same things, and so do the parts under them where it makes sense:

| option | what it takes | in |
| --- | --- | --- |
| `speed` | `"slow"`, `"normal"` or `"fast"`, or times as fast: `2` is twice, `0.5` half. A look can also be `"still"`. | looks, motions, `spinner()`, `typewriter()`, `marquee()`, and the effects `glint()`, `typeIn()` and `wave()` |
| `period` | the seconds of one loop, exactly, over `speed` | looks, motions and `spinner()` |
| `amount` | `"subtle"`, `"medium"` or `"strong"`, or a number: cells for `swaying()` and `shaking()`, a share of its size for `pulsing()` | `swaying()`, `pulsing()`, `shaking()`, a look's `warp()`, `add()` and `blur()`, and the effects `glitch()`, `shake()` and `wave()` |
| `every` | `"often"`, `"sometimes"` or `"rarely"`, or seconds | the effects `glint()`, `glitch()` and `shake()` |
| `palette`, `colors` | a palette's name (below), one `#rrggbb`, colours faint to strong, or `{ light, dark }` | `palette` on looks and `piece()`; `colors` on fields, materials, particles, scenes and `rainbow()` |
| `color` | one colour: `#rrggbb`, `{ light, dark }`, or a palette's name for its strong colour | widgets, 3D shapes, effects, layout clips and borders, `fromSvg()` |
| `to` | which way it goes, in that recipe's words: `"left"` or `"right"` for `waves()`, `clouds()` and `marquee()`; up and down too for `drifting()`; `"in"` or `"out"` for `rings()`; any way, diagonals too, for `stripes()` | those recipes |
| `name`, `note` | its name, and one line saying what you see | every recipe, and `row()`, `column()`, `grid()`, `sequence()` and `over()` |

A word it doesn't know throws an error that lists the ones it does, and offers the one you likely meant: `ascii.rest: plasma()'s speed takes "still", "slow", "normal" or "fast", or a number from 0 to 100, not "quick" (did you mean "fast"?)`. Writing `colour` for `color`, `middle` for `center`, `size` for a look's `scale` or `direction` for `to` is caught the same way.

## Colours by name

Every option in the kit that takes colours takes a palette's name. There are two tables of names, both in the kit's core:

- `schemes`, the looks' palettes, each a fade from faint to strong for a light page and for a dark one: `ocean`, `sunset`, `neon`, `fire`, `aurora`, `forest`, `candy`, `mono`, `ink`, `paper`, `github`, `ice`, `gold`, `lava`, `matrix`, `night` and `space`.
- `materialColors`, the materials' colours, each a list of the parts a material draws with, a water's deep, mid and surface say: `water`, `sea`, `cola`, `coffee`, `tea`, `wine`, `milk`, `glass`, `fire`, `candle`, `lava`, `smoke`, `steam`, `cloud`, `steel`, `gold`, `copper`, `wood`, `grass`, `sand`, `ice`, `neon`, `lamp`, `ceramic`, `wax`, `moon`, `night`, `stars`, `rain`, `snow`, `sunset`, `sky` and a few more.

So `torus({ color: "ocean" })`, `water({ colors: "cola" })`, `field({ colors: "ocean" }, fn)` and `rainbow(text, { colors: "candy" })` all work. A name in both tables, such as `fire`, is the materials' for a material's `colors` and the looks' everywhere else. One colour by name, as a 3D shape's or a widget's `color`, is that palette's strong colour on each page.

`colorsOf(name)` gives the colours themselves, `{ light, dark }`, and `colorOf(name)` one colour for each page; `palette("ocean")` is the same as `colorsOf()` for the looks' names, for `banner()`'s `color` or anything of your own.

## Everything chains

Every piece the kit makes has the kit's steps as methods, each returning a new piece that chains again:

```ts
// chained.ts
import { gauge, heart, pulsing, stars } from "ascii.rest/kit";

export const love = stars().behind(pulsing(heart())).named("love in space");
export const cpu = gauge({ label: "cpu", value: 64 }).glint({ every: "rarely" });
export default love;
```

The steps are `named`, `note`, `over`, `behind`, `speed`, `delay`, `repeat`, `freeze`, `pad`, `border`, `crop`, `flip` and `scale` from [layouts](/docs/kit-compose/), and `glint`, `shake`, `glitch`, `wave`, `fade`, `dissolve`, `rainbow`, `hueCycle`, `outline`, `shadow`, `scan` and `typeIn` from [effects](/docs/kit-fx/). A look has more of its own, `mask()`, `mix()`, `zoom()` and the rest. `pieceOf(thing)` turns anything the kit draws into a piece that chains, a library piece included, and `chained(piece)` gives any piece the methods. A piece is still a plain `{ meta, default }` to everything that plays it: the methods are on its prototype (the `Chainable` class).

## Build your own object

Recipes are shortcuts, not the whole kit. When you want a thing no recipe makes, say what it is made of. A glass of water is a cup, made of glass, with water inside and bubbles rising through it:

```ts
// glass.ts
import { bubbles, cup, emit, glass, inside, picture, shape, water } from "ascii.rest/kit";

const tumbler = cup();
const drink = inside(tumbler, { fill: "half" });

export default picture(
  [shape(tumbler, glass()), shape(drink, water()), emit(bubbles(), { inside: drink })],
  { name: "glass of water", cols: 32, rows: 16 },
);
```

```text
        .---------------.
        |'--.._____..--'|
        |  !            |
        |  !            |
        |  |            |
        |-~~O--~__~~~~-‾|
        |~~|~O~~-.---~~||
        |~~|≈~≈≈~~~-~~°~|
        |≈≈|≈o≈≈~~≈~≈≈≈||
        |≈≈|≈≈≈≈≈≈≈°≈≈≈≈|
        |===============|
        \_______________/
```

There are no coordinates and no maths. `cup()` stands at the bottom at a size that looks right, `inside()` knows its walls and base, the glass shows the water through it, and the bubbles rise inside the water and nowhere else. Swap `water()` for `water({ colors: "cola" })`, add `ice()` and a `straw()`, and it is a cola. [materials](/docs/kit-materials/) has every shape, material and emission.

Parts sit against each other by name, never by counting cells: every shape has `.at("bottom-left")` and the rest, a point another shape can sit on, and `emit()` takes `at` and `toward`, where on the shape it comes out and which way it goes:

```ts
// car.ts
import { ball, box, emit, picture, shape, smoke, solid } from "ascii.rest/kit";

const body = box({ ratio: 2.5, size: "small", at: "center" });

export default picture(
  [
    shape(body, solid()),
    shape(ball({ at: body.at("bottom-left"), size: "tiny" }), solid()),
    shape(ball({ at: body.at("bottom-right"), size: "tiny" }), solid()),
    emit(smoke(), { from: body, at: "left", toward: "left" }),
  ],
  { name: "car", cols: 48, rows: 16 },
);
```

Then set anything moving with a motion, which takes any thing the kit draws, a piece, text, a shape or a 3D shape:

```ts
// floating-glass.ts
import { floating } from "ascii.rest/kit";
import glass from "./glass.ts";

export default floating(glass, { height: "medium" });
```

## A look of your own

Each recipe is a few lines over the same parts, `field()`, `scene()`, `layer()`, `effect()` and the drawing functions, so its source is a template for one of your own. `look()` is the maker every look uses, open to you. Give it a name, how it looks by default and a body; its noise takes words too:

```ts
// embers.ts
import { look } from "ascii.rest/kit";

export const embers = look({ name: "embers", palette: "fire", period: 4, body: (k) => k.noise({ travel: "up", size: "small" }) });

export default embers;
```

To give your look options, a recipe of its own, pass what its user asked for second, `(o) => look({ ... }, o)`. It then takes `speed`, `period`, `scale`, `palette` and the rest, checked, and chains like any look. What look() takes, besides `name` and `body`:

| field | what it is | default |
| --- | --- | --- |
| `note` | one line saying what it shows | its name |
| `palette` | its colours, as a look's `palette` takes them | `"mono"` |
| `ramp` | its characters, faint to strong | `"standard"` |
| `light` | `true` for brightness that fills the picture, a plasma say, so its ramp turns round on a light page; `false` for ink on an empty ground, stars or flames | `false` |
| `period` | its loop at normal speed, in seconds, up to 60 | `8` |
| `dither` | ordered dithering between characters | `false` |
| `options` | the names of options of its own, `["heat"]`, so a user may pass them and a misspelt one throws | none |

The `body` gets a `LookKit` and the options once, and returns a function `(x, y, t) => 0 to 1`, or `null` where nothing is drawn. The kit's `noise()` slides and changes in a loop: `travel` is `"up"`, `"down"`, `"left"` or `"right"`, `change` is `"slowly"`, `"steadily"` or `"quickly"`, and `size` runs `"fine"` to `"huge"`. `k.scale`, `k.phase(t)`, `k.column()` and `k.row()` are there for the maths, when you want it. [looks](/docs/kit-looks/#a-look-of-your-own) has more.

## The recipes

| recipes | what they make | one line | page |
| --- | --- | --- | --- |
| looks | moving pictures by name: a sea, a plasma, aurora, flames, rain, a galaxy, a sun | `sea({ palette: "ocean" })` | [looks](/docs/kit-looks/) |
| motion | anything set moving: spinning, orbiting, bouncing, floating, pulsing, sliding in | `spinning(torus())` | [motion](/docs/kit-motion/) |
| widgets | whole things in one call: a clock face, a progress bar, a gauge, a chart, a card | `clockFace()` | [widgets](/docs/kit-widgets/) |

Looks chain further: `plasma().mask("HI")`, `sun().add(waves())`, `tunnel().rotate("slow")`. Motions wrap each other: `floating(spinning(cube()))`. Words and banners laid over a moving piece get a cell cleared round them so they read, and are refused, not cut, when they are wider than what they sit on.

## Install

The kit is in the npm package, from version 0.4.0:

```sh
npm install ascii.rest
```

Import it from `ascii.rest/kit`. The recipes alone are also at `ascii.rest/kit/recipes`. It has no dependencies, and runs in browsers and in Node.

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

As an SVG for a GitHub README, in light and dark, from the command line, `npx ascii.rest svg sea.ts --out sea.svg` and `--dark`, or from a script:

```ts
// make-svg.ts
import { writeFileSync } from "node:fs";
import { svg } from "ascii.rest/svg";
import sea from "./sea.ts";

writeFileSync("sea.svg", svg(sea));
writeFileSync("sea.dark.svg", svg(sea, { dark: true }));
```

Run it with `node make-svg.ts`. Node runs `.ts` files as they are from 22.18, if the import names the `.ts` file. `svg()` keeps an SVG to about a megabyte: past that it samples fewer frames a second, then folds a coloured piece's colours, and says on the console why it is still big if it is. A shorter loop, the recipe's `period`, makes it smaller.

In a terminal, for a CLI's splash screen:

```ts
// splash.ts
import { play } from "ascii.rest/terminal";
import sea from "./sea.ts";

await play(sea, { seconds: 3 });
```

With `mount()` on any page: `mount(canvas, sea)`. More on [react](/docs/react/), [svg](/docs/svg/), [terminal](/docs/terminal/) and [typescript](/docs/typescript/).

## Go deeper

The recipes are made of these parts, and so is anything you make that no recipe does. Each makes a piece in one call, and each also has a drawing function, for mixing it with other drawing in one piece. Here is where the maths lives, for when you want it.

| part | what it makes | one call | page |
| --- | --- | --- | --- |
| fields | art from a formula of x, y and t, like a shader | `field(fn)` | [fields](/docs/kit-field/) |
| drawing | text, lines, boxes, circles, plots and pixel art on the grid | `piece(spec, draw)` | [drawing](/docs/kit-draw/) |
| maths | noise, seeded randomness, easing, loops and 3D points | `noise()`, `random()` | [maths](/docs/kit-math/) |
| 3d scenes | lit shapes in a scene: a donut, a planet, a cube | `scene(torus())` | [3d scenes](/docs/kit-shapes3d/) |
| particles | snow, rain, sparks, fireworks and systems of your own | `particles(spec, "snow")` | [particles](/docs/kit-particles/) |
| effects | a glint, a glitch, a wave or a typing on any piece or text | `glint(rust)` | [effects](/docs/kit-fx/) |
| layouts | pieces side by side, in a grid, over each other, in turn | `grid([a, b, c])` | [layouts](/docs/kit-compose/) |
| images | any PNG, JPG or SVG image as ascii, and pixel art | `await fromImage(url)` | [images](/docs/kit-image/) |
| materials | objects you name: a glass of water, a candle, a house | `picture([shape(cup())])` | [materials](/docs/kit-materials/) |
| svg drawings | any SVG, its parts brought to life by name | `fromSvg(markup)` | [svg drawings](/docs/kit-vector/) |

They all come from one import, `ascii.rest/kit`, and they work together: a field behind text, particles off a banner, a 3D scene in a layout, an effect on any of them.

Some recipes share a name with a library piece: `aurora`, `barChart`, `cube`, `dissolve`, `galaxy`, `gauge`, `glitch`, `heart`, `lavaLamp`, `marquee`, `planet`, `plasma`, `progressBar`, `rain`, `smoke`, `snowfall`, `sparkline`, `sparks`, `spinners`, `starfield`, `tunnel` and `typewriter` are in both `ascii.rest/pieces` and `ascii.rest/kit`. In one file, import the library's as a whole, `import * as lib from "ascii.rest/pieces"`, and use `lib.gauge` beside the kit's `gauge()`.

## piece(): draw your own

`piece()` is what every tool is built on. Give it a name, a size, and a function that draws the frame at `t` seconds into a grid. Place things by words, with `at()` for a point and `ring()` for points round a circle:

```ts
// compass.ts
import { at, label, phase, piece, ray, ring } from "ascii.rest/kit";

export default piece({ name: "compass", cols: 31, rows: 15, loop: 8 }, (t, s) => {
  ring(s, 8).forEach((point, i) => label(s, ...point, ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][i]));
  ray(s, ...at(s), 9, phase(t, 8));
});
```

```text
               N
     NW                 NE

                    __
                  _/
                _/
  W            /            E




     SW                 SE
               S
```

The grid `s` starts empty every frame. Write into it, and the kit turns it into the frame and its colours. The third argument, `ctx`, holds the piece's `options`, `paper` (true on a light page), `mono` (true when drawn in one ink), and `cols` and `rows`.

What `piece()` takes:

| field | what it is | default |
| --- | --- | --- |
| `name` | its name, in lower case | required |
| `cols`, `rows` | its size in cells, up to `MAX`, 320 by 120 | required |
| `note` | one line, up to 72 characters, saying what you see | the name |
| `category` | one of the library's 15 categories | `"generative"` |
| `fps` | frames a second, `0` for a still | `30` |
| `palette` | its colours: a list, `{ light, dark }` of the same length, or a palette's name | none: one ink |
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

`piece()` checks everything when it is called and throws an error that says what to change: `ascii.rest: cols takes a whole number from 1 to 320, not 0`. Every tool in the kit does the same: its options are checked when it is made, so a misspelt one throws rather than doing nothing. For makers of your own, `fail(what)` throws the kit's kind of error, `checkMeta(meta)` checks a meta as the library checks its pieces', `metaOf(spec)` and `specOf(spec, name)` turn a spec into a checked meta and fill in a maker's defaults, and `suggest(word, words)` gives the `(did you mean "center"?)` hint.

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
| `s.put(i, code, color)` | the fast write, by index and char code, for drawing loops |
| `s.colorAt(x, y)` | a cell's palette index |
| `s.clone()` | a copy |

`s.paper` and `s.mono` say how this frame is drawn. A region is `{ x, y, cols, rows }`. In the grid's own arrays, `s.chars` and `s.colors`, a cell with nothing drawn is `EMPTY` (0) and a cell with no colour of its own is `NONE` (255): what `s.colorAt()` returns for one, and what `s.put()` takes for the piece's ink.

To place by words instead of counting cells: `at(s, "top-right", { margin: 1 })` is a point, `textAt(s, "score 3", "top-right")` puts text against an edge, `slot(s, "bottom", { cols: 12, rows: 3 })` is a box at an anchor, and `across(s, [1, 2])`, `down(s, 3)` and `tiles(s, { columns: 3 })` cut the grid into regions. See [widgets](/docs/kit-widgets/#placing-by-words).

Use characters that are one cell wide: ASCII, box drawing and blocks. `s.set` throws for a tab, a newline, or a character outside the Basic Multilingual Plane, such as most emoji; `"✨"` is inside it, and works.

## Colours

A piece with a `palette` is a coloured piece. It draws on a `<canvas>`, in a terminal and in an SVG in colour, and as text in one ink in a `<pre>`.

A colour, where the kit takes one, is either:

- a number: an index into the palette, `0` for the first colour;
- `"#rrggbb"`: found in the palette, the nearest if it isn't one of them.

A palette can be one list for both pages, or `{ light, dark }` with a list for each, the same length. Index `1` is then the light list's second colour on a light page and the dark list's on a dark one, so one drawing reads on both. `palette("ocean")` is one of the named palettes in that form:

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

A piece has at most 64 colours, light and dark together, so 32 a page when its palette is `{ light, dark }`. `Palette` is the class a piece's colours are kept in, and finds a colour's index for a page. Helpers for making colours: `gradient(stops, n)` gives `n` colours along a fade, `spread(palette, n)` does it for each page, `mix(a, b, k)` blends two, `nearest(colors, color)` finds the closest, `mergePalettes(lists)` joins several pieces' colours into one palette, `isHex(v)` checks one, and `rgb()` and `hex()` convert.

## Shading with ramps

A **ramp** is a string of characters from no ink to the most. The kit names nine, in `ramps`:

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
- When two loops combine, as in a layout or an effect, the kit finds the time after which both come round together, if it is a minute or less.

Every recipe loops by itself, and works out the loop of whatever it is given, with three kinds of exception: one that holds forever (a `typewriter()` or `growIn()` with `hold: "forever"`), a clock showing the real time (`clockFace({ real: true })`) and a live widget reading a `value` function have no loop, and recipes whose loops meet only after more than a minute, a `sea({ period: 7 })` added to `stars({ period: 9 })` say, have none together. Widgets keep to loops that divide a minute, so a dashboard of them always loops. `row()`, `column()` and `grid()` take a `loop` of their own for parts that don't meet. `svg()` says on the console when it is given a piece that moves with no loop, which it plays for 4 seconds.

`loopFor(pieces)` works out the loop of things played together, and `withLoop(piece, seconds)` gives a piece one.

## Angles

Angles come in the unit each part was made with, and every one of them takes words where it can:

- Turns in drawing, `ring()` and `at()`: `ray(s, x, y, length, 0.25)` points right, a quarter of the way round from the top.
- Radians in maths, fields (`at.a`) and SVG drawings' poses: `TAU` is a whole turn. `radians()` and `degrees()` convert.
- 3D shapes take words, `rotate: "upside-down"` or `spin: "slow"`, or `{ turns: [x, y, z] }` or `{ degrees: [x, y, z] }`, or radians as `[x, y, z]`.
- Degrees in particles' `spread`, and radians in their `angle`.
- Looks take words: `rotate("quarter")`.

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
| `pieceOf(thing)` | any thing a recipe takes, a shape, a 3D shape, text, as a piece that chains |
| `and(words)` | words as a sentence lists them, `"a, b and c"` |
| `easings` | the easing each plain word stands for: `smooth` is `inOutSine`, `bouncy` is `outBounce` |
| `schemeOf(what, v)` | any colours a look takes as `{ light, dark }`, checked, `what` naming the option in an error |

[maths](/docs/kit-math/) has much more: simplex noise, easing, tweens, a camera.

## Next

- [looks](/docs/kit-looks/): every look, its options and how they chain.
- [motion](/docs/kit-motion/): set anything moving in words.
- [widgets](/docs/kit-widgets/): clocks, bars, gauges and charts in one call.
- [fields](/docs/kit-field/): a picture from a formula, when you want the maths.
- [your own pieces](/docs/pieces/): the piece contract the kit builds on.
