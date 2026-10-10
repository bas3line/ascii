---
layout: ../../layouts/Docs.astro
title: looks
description: Moving pictures by name in one line, a sea, a plasma, aurora, flames, rain, a galaxy, with options in words and chaining like sentences.
---

A **look** is a moving picture you ask for by name: `sea()`, `plasma()`, `aurora()`. Its options are words, `{ palette: "ocean", speed: "slow", scale: "large" }`, and there is nothing to work out. A look is a normal piece, so it plays wherever one does.

```ts
// sunset.ts
import { above, below, sun, waves } from "ascii.rest/kit";

export default sun({ palette: "sunset" }).mask(above(0.55)).add(waves({ speed: 0.5 }).mask(below(0.45)));
```

A sun over the sea, at 1 second, in one ink:

```text
                    .            .             .
                     ..         .:           ..
                      :.        .:          ..
                      .-.       :-        .:.
         ..            .=.  ....--..     ::
           ...          .+:.::::*=::....=:
              .::    ...:-@===++@+==--=#:..         ....
                 :=-..:-=+*%%@@@@@@%%@%=-:...   .::.
                  ..=%*+#@%%@@@@@@@@@@%#+-:::==:.
                 ..::=+@%@@@@@@@@@@@@%@@%@@=:..
                 ..:-+%%%@@@@@@@@@@@@@@@%%+-:..
      .....::--=+*#%@@@@@@@@@@@@@@@@@@@@%%*=::.
                 .::=*%@@@@@@@@@@@@@@@@@@@@@%#*+=--::.....
%%@@@@@#*=-:..............       ..:-+#%@@@@@%@@@@@@@%%##*******
:--=+#%@@@%#*+===++***#####******#%@@@@%*+=-::::-=+#%@@@@@@@@@@@
    ..-=*%@@@@@@@@@@@@@@@@@@@@@@@%%#*+-:.          .:-+*#%%%%%%%
        .:=*#%%@@%%#*+==-::::::::...                   .:-======
           .::-----:..                                     .....
                                         ..:::-::..
:::::..                  ..:--=====--===++**#####*+=:.
*****++=-:..         .:-+*%@@@@@@@@@@@@@@@@@@@@@@@@@%*=-..
@@@@@@@@%%#*+==----=+*%@@@%#*+=====++**###########%@@@@%#+=-::::
%%%%%%%%%@@@@@@@@@@@@@%#+-:.          ..:::::::::--=+*#%@@@@%%%%
======-----===++++++=-:.                            ..:-=+*#%%@%
```

## Every look

Each line below is a whole piece. Each look has its own palette and characters by default, chosen to suit it.

| look | what it is | its own options | one line |
| --- | --- | --- | --- |
| `sea()` | the open sea to the horizon, swell coming in under an empty sky | `horizon`: `"high"`, `"middle"`, `"low"` | `sea({ palette: "ocean" })` |
| `waves()` | rolling rows of waves | `to`: `"right"`, `"left"` | `waves({ speed: "slow" })` |
| `plasma()` | the demo-scene plasma, soft blobs drifting through the palette | | `plasma({ palette: "neon", speed: "slow" })` |
| `aurora()` | curtains of northern lights | | `aurora()` |
| `flames()` | flames licking up from the bottom, white hot at their roots | | `flames()` |
| `clouds()` | soft clouds drifting across | `to`: `"right"`, `"left"` | `clouds({ palette: "night" })` |
| `plume()` | a plume of smoke curling up | | `plume()` |
| `ripple()` | rings spreading over water from drops | `drops`: 1 to 8, `seed` | `ripple({ drops: 3 })` |
| `rings()` | rings flowing from the middle without end | `to`: `"out"`, `"in"` | `rings({ to: "in" })` |
| `tunnel()` | flying down an endless tunnel of tiles | | `tunnel()` |
| `spiral()` | a spiral turning | `arms`: 1 to 12 | `spiral({ arms: 3 })` |
| `vortex()` | clouds swirling into a whirlpool | | `vortex()` |
| `stripes()` | stripes sliding along | `to`: a way, diagonals too | `stripes({ to: "up-right" })` |
| `checker()` | a checkerboard rolling by | | `checker()` |
| `sweep()` | the palette sweeping slowly back and forth | `way`: `"across"`, `"down"`, `"diagonal"`, `"round"` | `sweep({ way: "round" })` |
| `turbulence()` | noise, slowly changing | `kind`: `"smooth"`, `"ridged"`, `"cells"` | `turbulence({ kind: "cells" })` |
| `marble()` | veined marble, slowly flowing | | `marble()` |
| `lavaLamp()` | blobs rising, merging and sinking | `blobs`: 1 to 16, `seed` | `lavaLamp({ palette: "neon" })` |
| `stars()` | stars twinkling, each on its own beat | `density`, `seed` | `stars({ density: "sparse" })` |
| `rainfall()` | rain falling in streaks | `wind`: `"none"`, `"left"`, `"right"`; `density`, `seed` | `rainfall({ wind: "left" })` |
| `snowfall()` | snow falling and swaying, near and far | `density`, `seed` | `snowfall({ density: "dense" })` |
| `matrix()` | the digital rain | `density`, `seed` | `matrix()` |
| `galaxy()` | a spiral galaxy turning round a bright core | `arms`: 1 to 8, `seed` | `galaxy()` |
| `sun()` | a bright disc in a corona, its rays turning | `rays`: 0 to 48 | `sun({ palette: "sunset" })` |

`density` is `"sparse"`, `"normal"` or `"dense"`, or a number, 2 being twice as many. `seed` is a whole number for another sky, another lamp.

What every look takes:

| option | what it does | default |
| --- | --- | --- |
| `palette` | its colours: a palette's name, one `#rrggbb`, colours faint to strong, or `{ light, dark }` | the look's own |
| `speed` | `"still"`, `"slow"`, `"normal"`, `"fast"`, or times as fast | `"normal"` |
| `period` | the seconds of one loop, over `speed` | the look's own |
| `scale` | how big its features are: `"small"`, `"medium"`, `"large"`, `"huge"`, or a number | `"medium"` |
| `ramp` | its characters, faint to strong: a ramp's name, or your own | the look's own |
| `dither` | ordered dithering between neighbouring characters | the look's own: `true` for `sweep()`, `false` for the rest |
| `cols`, `rows` | its size | 64 by 24 |
| `name`, `note` | its name, and a line saying what it shows | the look's own |

Every look loops, so an SVG of it plays without a jump. A slower speed makes a longer loop, and a longer SVG: give `period` to keep it short.

## Chaining

A look is a `Look`, a piece with methods of its own besides [the kit's steps](/docs/kit/#everything-chains). Each returns a new look and leaves the one it starts from as it was, so a chain reads as a sentence:

| method | what it does |
| --- | --- |
| `mix(other, amount?)` | part this, part another: `"a little"`, `"half"`, `"mostly"`, or 0 to 1 |
| `add(other, amount?)` | another on top, brightest where both are. Stars, rain, snow and the matrix keep their own glyphs. |
| `multiply(other)` | bright only where both are |
| `mask(shape)` | only inside a shape: see below |
| `move(to?, speed?)` | sliding `"left"`, `"up-right"` or any way, coming round seamlessly |
| `zoom(amount?)` | `"in"`, `"out"`, or times as big |
| `rotate(by?)` | turning for ever at `"slow"`, `"normal"` or `"fast"`, or turned by `"eighth"`, `"quarter"` or `"half"` and held |
| `warp(amount?)` | bent as if through moving water: `"subtle"`, `"medium"`, `"strong"` |
| `blur(amount?)` | softened |
| `threshold(level?)` | hard edged: `"low"`, `"half"`, `"high"`, or 0 to 1 |
| `invert()` | bright where it was dark |
| `posterize(levels?)` | in a few flat bands, 4 by default |
| `palette(p)`, `ramp(r)`, `size(cols, rows)`, `named(name, note?)` | the same look in other colours, characters, size or name |
| `over(piece)`, `behind(piece)` | laid over another piece, or another piece laid over it, centred |

A combined look takes the first look's palette and characters. To keep each part's own colours, lay them with `over()` or `layer()` from [layouts](/docs/kit-compose/) instead.

## Masks

`mask()` keeps a look inside a shape, and draws nothing outside it. A shape is any of:

- `below(0.4)` and `above(0.3)`: the bottom or top share of the picture, or `"third"` and `"half"`; `sea()`'s `horizon` is at a third, a half or two thirds, so `above("half")` is its sky;
- a word, `"HI"`, in big letters as large as fit, or `letters("HI", { big: 2 })` for a size;
- a shape from [materials](/docs/kit-materials/): `heart()`, `ball()`, `star()`, `cup()`;
- any piece or text: its inked cells, centred, moving with it if it moves;
- `outside(shape)` for everywhere the shape is not;
- a function `(x, y, t) => true` where to draw.

A word or a materials shape is filled: every cell inside it is drawn, its darkest parts in the ramp's faintest character, so the shape reads whole. The other masks only cut: most looks leave dark parts empty, so there the dark parts stay holes. A mask turns, zooms, moves and bends with the look when `rotate()`, `zoom()`, `move()` or `warp()` comes after it.

## Every look in one file

Each of these is a piece, ready to export or play:

```ts
// looks.ts
import { banner } from "ascii.rest/banner";
import { aurora, checker, clouds, flames, galaxy, heart, lavaLamp, marble, matrix, plasma, plume, rainfall, rings, ripple,
  sea, snowfall, spiral, stars, stripes, sun, sweep, tunnel, turbulence, vortex, waves } from "ascii.rest/kit";

export const open = sea({ palette: "ocean" });
export const rolling = waves({ speed: "slow" });
export const glow = plasma({ palette: "neon", speed: "slow" });
export const north = aurora().add(stars({ density: "sparse" }));
export const fire = flames();
export const storm = clouds({ palette: "night" }).add(rainfall({ wind: "left" }));
export const smoke = plume();
export const pond = ripple({ drops: 3 });
export const target = rings({ to: "in" });
export const warp = tunnel().rotate("slow");
export const hypno = spiral({ arms: 3 });
export const whirl = vortex();
export const candy = stripes({ to: "up-right" });
export const board = checker();
export const dusk = sweep({ way: "round" });
export const cells = turbulence({ kind: "cells", palette: "github", ramp: "blocks" }).posterize(4);
export const stone = marble();
export const lamp = lavaLamp({ palette: "neon" }).warp("subtle");
export const sky = stars({ density: "sparse" });
export const winter = snowfall({ density: "dense" }).behind(banner("let it snow", { effect: "still", font: "slim", max: 60 }));
export const code = matrix().behind(banner("wake up", { effect: "still", font: "slim" }));
export const milkyWay = galaxy().add(stars({ density: "sparse" }));
export const noon = sun({ palette: "gold" });
export const love = plasma({ palette: "candy", ramp: ".:-=+*#%@" }).mask(heart({ size: "large" }));

export default open;
```

## A look of your own

`look()` is how every look here is made, and it is yours to use. Give it one object: a name, how it looks by default, and a body. The body gets a kit of helpers and returns how much is at each cell, 0 to 1:

```ts
// embers.ts
import { look, type LookOptions } from "ascii.rest/kit";

export const embers = (o?: LookOptions) =>
  look({ name: "embers", palette: "fire", period: 4, body: (k) => k.noise({ travel: "up", size: "small" }) }, o);

export default embers({ speed: "slow", scale: "large" });
```

The options a user passed go second. Speed, period, scale, palette, ramp, size and name are checked and worked out for you, and the result chains like any look. Besides `name` and `body`, the object takes `note`, `palette` (`"mono"` by default), `ramp` (`"standard"`), `light` (`true` for brightness that fills the picture, so its ramp turns round on a light page), `period` (8 seconds), `dither` (`false`) and `options`, the names of options of its own, so a misspelt one throws. `look(name, o, how, body)` is the same, in four arguments. The kit hands the body:

| helper | what it is |
| --- | --- |
| `k.noise({ size, travel, change })` | noise that loops with the look: `travel` is the way it slides, `"up"`, `"down"`, `"left"` or `"right"`; `change` how often it turns into new shapes in place, `"slowly"`, `"steadily"` or `"quickly"`; `size` is `"fine"`, `"small"`, `"medium"`, `"large"` or `"huge"`. Numbers work too. |
| `k.phase(t)` | where in its loop `t` is, 0 up to 1 |
| `k.scale`, `k.speed`, `k.period` | the options asked for, as numbers |
| `k.column(x, at)`, `k.row(y, at)` | the cell a point falls in |

`x` and `y` are as [fields](/docs/kit-field/) give them: 0, 0 in the middle, the shorter side from -1 to 1. Every look here is a few lines in [looks.ts](https://github.com/bas3line/ascii/blob/main/src/kit/recipes/looks.ts), a template for one of your own; a copy made with `npx ascii.rest add kit` has it at `components/ascii/kit/recipes/looks.ts`.

## Next

- [motion](/docs/kit-motion/): set any piece moving in words.
- [fields](/docs/kit-field/): the formula under every look.
