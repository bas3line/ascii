---
layout: ../../layouts/Docs.astro
title: fields
description: field() makes ascii art from a formula of x, y and t, the way a shader draws a picture. One function, one piece.
---

A **field** is a picture from a formula. You write a function of a cell's place, `x` and `y`, and the time `t`. It returns how bright that cell is. `field()` does the rest: the characters, the colours, round circles on tall cells, and a light page.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/kit-field.mp4" poster="https://cdn.ascii.rest/videos/kit-field.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>A function of x, y and t drawn as a rolling sea, then drawn with other ramps, then coloured by value with a palette's name and with stops of your own.</figcaption>
</figure>

This is the maths under every [look](/docs/kit-looks/). For a sea, a plasma or a sky of stars, ask for it by name, `sea({ palette: "ocean" })`, and skip the formula. Write a field when you want a picture no look makes.

This draws a disc:

```ts
// disc.ts
import { field } from "ascii.rest/kit";

export default field({ name: "disc", cols: 32, rows: 10, fps: 0 }, (x, y, t, at) => at.r < 0.8);
```

```text

            @@@@@@@@
          @@@@@@@@@@@@
         @@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@
         @@@@@@@@@@@@@@
          @@@@@@@@@@@@
            @@@@@@@@

```

`at.r` is the distance from the middle. `true` is solid ink, so every cell nearer than 0.8 is `@`.

## The function

`field(fn)` calls `fn(x, y, t, at)` once for each cell, every frame.

- `x` and `y` are centred on the piece: `0, 0` is the middle, and `y` runs down. The shorter side runs from -1 to 1, and both share one unit, so a circle comes out round even though a cell is twice as tall as it is wide.
- `t` is the time in seconds.
- `at` holds more about the cell. One object is reused for every cell, so read what you need and keep nothing of it.

What the function returns:

| it returns | the cell is |
| --- | --- |
| a number, 0 to 1 | a character from the ramp: 0 is the first, 1 the densest |
| `true` | solid ink, the ramp's densest character |
| `false` | nothing |
| `null` or `NaN` | nothing, and whatever is under it shows |

A number past 0 or 1 counts as that end. To return a sine as it is, give `range: [-1, 1]`.

What `at` holds:

| field | what it is |
| --- | --- |
| `col`, `row` | the cell's column and row, from 0 |
| `u`, `v` | 0 to 1 across and down, at the cell's centre |
| `r` | the distance from the middle: `Math.hypot(x, y)` |
| `a` | the angle from the middle: `Math.atan2(y, x)`, 0 pointing right |
| `phase` | how far through `period` the frame is, 0 up to 1. 0 with no period. |
| `cols`, `rows` | the size in cells |
| `width`, `height` | the size in the units of `x` and `y` |
| `options` | the piece's options |
| `char` | set it to draw this cell's character yourself |
| `color` | set it to colour this cell yourself |

## Loop it

Give a `period` in seconds, and write the motion with `TAU * at.phase`. `at.phase` runs from 0 to 1 once a period, so the picture comes back exactly where it started, and `svg()` plays one seamless loop:

```ts
// rings.ts
import { TAU, field } from "ascii.rest/kit";

export default field({ name: "rings", cols: 40, rows: 12, ramp: "dots", range: [-1, 1], period: 2 },
  (x, y, t, at) => Math.cos(at.r * 9 - TAU * at.phase));
```

```text
•●●●·.   .·•●●●●●••••••●●●●●•·.   .·●●●•
●●•·   .·•●●●•·..      ..·•●●●•·.   ·•●●
●●·   .•●●●•·      ..      ·•●●●•.   ·●●
●•.  .·●●●·.   .·•●●●●•·.   .·●●●·.  .•●
●·   ·•●●•.   ·●●●●●●●●●●·   .•●●•·   ·●
•.   ·●●●·   .•●●•.  .•●●•.   ·●●●·   .•
•.   ·●●●·   .•●●•.  .•●●•.   ·●●●·   .•
●·   ·•●●•.   ·●●●●●●●●●●·   .•●●•·   ·●
●•.  .·●●●·.   .·•●●●●•·.   .·●●●·.  .•●
●●·   .•●●●•·      ..      ·•●●●•.   ·●●
●●•·   .·•●●●•·..      ..·•●●●•·.   ·•●●
•●●●·.   .·•●●●●●••••••●●●●●•·.   .·●●●•
```

`period` also sets the piece's `loop`. Every term should turn a whole number of times over the period, as `TAU * at.phase` and `2 * TAU * at.phase` do.

## Colour it

`colors` colours each cell by its value: give two or more stops, from the lowest value to the highest. They are spread to `steps` colours, 16 by default.

```ts
// plasma.ts
import { TAU, field } from "ascii.rest/kit";

export default field(
  { name: "plasma", cols: 64, rows: 22, period: 8, range: [-1, 1], steps: 8,
    colors: { light: ["#1e1b4b", "#5b21b6", "#a21caf", "#be123c", "#b45309"], dark: ["#1e1b4b", "#5b21b6", "#c026d3", "#fb7185", "#fde68a"] } },
  (x, y, t, at) => {
    const a = TAU * at.phase;
    const v = Math.sin(x * 3 + a) + Math.sin(y * 4 - 2 * a) + Math.sin((x + y) * 2.5 + 3 * a) +
      Math.sin(Math.hypot(x - Math.sin(a), y - 0.5 * Math.cos(2 * a)) * 6 - 4 * a);
    return Math.sin(v * 1.3);
  },
);
```

`{ light, dark }` gives stops for each page, so the colours read on both. For a rule of your own, pass a `palette` and either a `color` function, `(value, x, y, t, at) => color`, or set `at.color` inside your function.

## Draw a scene with at.char

Set `at.char` to pick a cell's character yourself. Here the surface of the sea is `/`, `\` and `~` by its slope, and the water under it is shaded. Above the water the function returns `null`, so nothing is drawn there:

```ts
// swell.ts
import { TAU, field } from "ascii.rest/kit";

export default field(
  { name: "swell", cols: 64, rows: 16, ramp: " .-~=≈", dither: true, invert: false, period: 4,
    colors: { light: ["#93c5fd", "#1d4ed8", "#0b1f4d"], dark: ["#0b2a5b", "#1f7ae0", "#e0f7ff"] } },
  (x, y, t, at) => {
    const w = TAU * at.phase;
    const sea = (x: number) => -0.3 + 0.13 * Math.sin(x * 4 - w) + 0.04 * Math.sin(x * 9 - 2 * w + 1);
    const d = y - sea(x), row = at.height / at.rows;
    if (d < -row / 2) return null;
    if (d < row / 2) {
      const slope = (sea(x + 0.01) - sea(x - 0.01)) / 0.02;
      at.char = slope < -0.45 ? "/" : slope > 0.45 ? "\\" : "~";
      return 1;
    }
    return 0.3 + 0.5 * Math.exp(-d * 2) + 0.2 * Math.sin(y * 16 - x * 1.5 - 2 * w);
  },
);
```

```text




     ~~~~~~\                 //~~~\\                 //~~~\\
~~~~~=≈=====\\         ~~~~//-~-~-~~\\\           ///=≈=≈=≈≈\~~~
~=~==========≈\\~~~~~~~≈=≈====~~~~~~~=~~~~~~~~~~~~-~-------~~~~~
-------.----~-~~=~=~=~=~=======~====≈=≈=≈≈≈=≈=≈=≈==~=~~-~-~-~-~-
~~~~~~-~-------~------.-.-.-.......----~-~~~~~~=~=~=~=~=~=~=~===
~~~~~~=~=~=~=~=======~=~~~~~~-~------.---.-.-.-.-.-.-.-.-.----~-
.. ..........-.--~-~-~-~~~~~~~~~~~~~~=~=~=~~~~~~-~----.-.-......
~-~-~----.-.-.-.-...............-.-.----~-~-~~~~~~~~=~~~~~~~=~~~
-~-~-~~~-~~~~~~~~~~~-~------.-...... ... . . . . ... ......-.---
. ... ....-.-.----~-~-~-~~~~~~~~~~~~~~~~~-~-~----.-.-........ .
--.-.-.... . . . . . . . . . . ....-.-.----~-~-~-~-~~~-~-~-~-~--
~~~-~~~~~~~-~~~-~-~-~----.-.-...... . . . . . . ........-.------
```

## A light page

On a dark page, a dense `@` looks bright. On a light page it looks dark. So by default (`invert: "auto"`) a field turns its ramp round on a light page, and bright stays bright.

That suits light: a plasma, a lit ball. When your number means how much ink, like a glow on an empty ground, give `invert: false`. Otherwise the light page draws the empty ground as solid ink:

```ts
// glow.ts
import { TAU, field } from "ascii.rest/kit";

export default field({ name: "glow", cols: 40, rows: 12, invert: false, period: 2 },
  (x, y, t, at) => Math.exp(-at.r * (3 + Math.sin(TAU * at.phase))));
```

`svg()` draws for a light page unless you pass `dark: true`, so check this before you put a field in a README.

## Options

`field(spec, fn)` takes a piece's spec, as [piece()](/docs/kit/#piece-draw-your-own) does, with every field optional, and these:

| option | what it does | default |
| --- | --- | --- |
| `cols`, `rows` | its size | 64 by 24 |
| `ramp` | the characters from no ink to the most: a ramp's name or your own | `"standard"` |
| `colors` | stops from the lowest value to the highest, or `{ light, dark }` | none: one ink |
| `steps` | how many colours `colors` is spread to, 1 to 64 | `16` |
| `color` | a function of `(value, x, y, t, at)` that returns a colour | none |
| `dither` | ordered dithering between neighbouring characters, for smooth slopes | `false` |
| `invert` | turn the ramp round: `"auto"` on a light page, `true` always, `false` never | `"auto"` |
| `aspect` | `x` and `y` share one unit, so circles are round. `false`: each runs -1 to 1. | `true` |
| `gamma` | the value is raised to this power before shading | `1` |
| `range` | the lowest and highest values your function returns | `[0, 1]` |
| `region` | draw only in this part of the grid | all of it |
| `period` | seconds a loop takes: sets `at.phase` and the piece's `loop` | none |

`field(fn)` alone is 64 by 24 with every default. Every frame starts empty, so a frame depends only on `t`.

## drawField(): a field inside your own piece

`drawField(s, fn, t, options?)` draws a field into a grid you are drawing already, all of it or a `region`. Use it for a field in a frame, behind text, or several in one piece:

```ts
// window.ts
import { TAU, drawField, gradient, piece, rect } from "ascii.rest/kit";

const colors = gradient(["#312e81", "#db2777", "#fbbf24"], 12);

export default piece({ name: "window", cols: 40, rows: 14, loop: TAU, palette: ["#8b949e", ...colors] }, (t, s) => {
  const inside = rect(s, 0, 0, 40, 13, { color: 0 });
  drawField(s, (x, y, t, at) => x * Math.sin(t) - 0.4 * y + Math.cos(t) * Math.sqrt(1 - at.r * at.r), t,
    { region: inside, colors, ramp: ".:-=+*#%@" });
  s.write(2, 13, "a moon, lit as it turns", 0);
});
```

Off the ball, the square root is `NaN`, so nothing is drawn there. Colours are found in the piece's palette. `rect()` is from [drawing](/docs/kit-draw/).

## Next

- [maths](/docs/kit-math/): noise to put in a field, `noise({ size: 10 })(at.col, at.row, t)`. Noise takes cells, so pass `at.col` and `at.row`, not `x` and `y`.
- [effects](/docs/kit-fx/): a glint or a wave on a field.
