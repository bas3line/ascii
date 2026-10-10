---
layout: ../../layouts/Docs.astro
title: particles
description: particles() makes snow, rain, sparks, fireworks and systems of your own, said in words and plain numbers, looping exactly.
---

`particles()` makes a piece of particles: things born over time that move, age and die. Snow, rain, sparks, fireworks, fireflies. Eight come ready-made, and any other is a few fields of plain numbers: cells, seconds and degrees. Every frame depends only on `t`, so the piece loops exactly and plays as an SVG.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/kit-particles.mp4" poster="https://cdn.ascii.rest/videos/kit-particles.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>Snow by name, swapped for rain and then fireworks, then a system of your own, embers, built up a few fields at a time.</figcaption>
</figure>

Snow, by name:

```ts
// snow.ts
import { particles } from "ascii.rest/kit";

export default particles({ name: "snow", cols: 48, rows: 12 }, "snow", { wind: 3 });
```

```text
    .                    *
                 .                      .  +   +
                      .
    *                    .             +      .
.   .                                    +
                                            +
   *               .        .             .
                            +
        .               +        +
                           +
      .    *      .                       .
  +
```

Far flakes are small and slow, near ones large and quick. It repeats every 8 seconds.

## Presets

`particles(spec, name, options?)` plays a preset. Each fits itself to the piece's size and looks right with no options.

| preset | what it is | its options |
| --- | --- | --- |
| `snow` | snow in up to three depths, swaying, blown by a gusting wind | `wind`, `gusts`, `density`, `layers`, `colors` |
| `rain` | rain slanting in the wind, splashing on the bottom row | `wind`, `density`, `splash`, `colors` |
| `stars` | a night sky twinkling, with a shooting star now and then | `density`, `shooting`, `colors` |
| `sparks` | a fountain of sparks, cooling from white to red | `at`, `height`, `density`, `colors` |
| `fireworks` | shells that climb and burst, each in its own colour | `every`, `count`, `rise`, `colors` |
| `fireflies` | fireflies drifting, glowing and going out | `density`, `colors` |
| `bubbles` | bubbles rising and growing | `density`, `colors` |
| `matrix` | streams of glyphs falling, a bright head over a fading trail | `density`, `speed`, `colors` |

`density` is a share of the usual: `2` is twice as many.

## A picture with them

`front` and `back` draw a picture with the particles, in front of them or behind: text as you would type it, or any piece, like a `banner()`. `paint` colours some of its characters:

```ts
// city.ts
import { particles } from "ascii.rest/kit";

const city = `
        ┌───┐                         ┌───┐
        │ ▪ │           ┌───┐         │ ▪ │         ┌───┐
┌─────┐ │ ▪ │           │ ▪ │ ┌─────┐ │   │         │ ▪ │
│ ▪ ▪ │ │   │ ┌───────┐ │   │ │ ▪ ▪ │ │ ▪ │ ┌─────┐ │   │ ┌────┐
│ ▪   │ │ ▪ │ │ ▪ ▪   │ │ ▪ │ │   ▪ │ │ ▪ │ │ ▪ ▪ │ │ ▪ │ │ ▪  │`;

export default particles({ name: "fireworks over the city", front: { art: city, color: "#64748b", paint: { "▪": "#f59e0b" } } }, "fireworks");
```

```text


                       ****+
                    +**||../*++
                   *\..    ..-*
                 +-..        ..+
                  *-.        ..**
                  */..     ...**
                  +*+/...||.\++
                     +++|****
               .
               .

                         .
                       . .
                                             |
                                             :
                                             .

        ┌───┐                         ┌───┐
        │ ▪ │           ┌───┐         │ ▪ │         ┌───┐
┌─────┐ │ ▪ │           │ ▪ │ ┌─────┐ │   │         │ ▪ │
│ ▪ ▪ │ │   │ ┌───────┐ │   │ │ ▪ ▪ │ │ ▪ │ ┌─────┐ │   │ ┌────┐
│ ▪   │ │ ▪ │ │ ▪ ▪   │ │ ▪ │ │   ▪ │ │ ▪ │ │ ▪ ▪ │ │ ▪ │ │ ▪  │
```

Text sits on the bottom row by default, and a piece in the middle. `at` places it elsewhere: `"top"`, `"top-left"` and the rest.

## A system of your own

A **system** says where particles are born, how many, how they move, and how they look as they age. Only `emitter` is needed:

```ts
// embers.ts
import { particles } from "ascii.rest/kit";

export default particles({ name: "embers", cols: 48, rows: 16, period: 4 }, {
  emitter: "bottom", direction: "up", spread: 40, speed: [4, 9], life: [1.5, 3],
  sway: 1, glyphs: "*+'.", colors: ["#fde047", "#f97316", "#7f1d1d"],
});
```

A number or `[low, high]` gives each particle its own value between them. The fields:

| field | what it does | default |
| --- | --- | --- |
| `emitter` | where they are born: `"top"`, `"bottom"`, `"left"`, `"right"`, `"everywhere"`, `"center"`, `{ point }`, `{ line }`, `{ area }`, `{ edge }`, `{ text }` or `{ mark }` | required |
| `rate` | particles born a second | `20`, or fitted to a side |
| `burst` | instead of a rate: `{ every, count }`, many at once every so many seconds | none |
| `life` | seconds a particle lives | `[1, 2]`, or long enough to cross the grid from a side |
| `hold` | seconds it holds still before it is thrown | `0` |
| `speed` | cells a second it is thrown at | `[2, 6]` |
| `direction` | `"up"`, `"down"`, `"left"`, `"right"`, the four between, or `"out"` | in from a side, else `"out"` |
| `spread` | degrees the throw fans out across | `0` |
| `angle` | or the way it is thrown, in radians: 0 right, `TAU / 4` down | none |
| `gravity` | cells a second squared, down. Below 0 pulls up. | `0` |
| `wind` | cells a second to the right, or a function of `t` | `0` |
| `drag` | how fast it loses its speed | `0` |
| `sway` | cells it drifts side to side, as a falling leaf | `0` |
| `glyphs` | characters by age, the first at birth | `"*+."` |
| `glyph` | or a function of the particle, for its character, such as `streak` | none |
| `colors` | colours by age, from birth to death | none: the ink |
| `palettes` | several fades: each burst takes the next | none |
| `color` | or a function of the particle, for its colour | none |
| `twinkle` | 0 to 1: how much of the time it is hidden, so it twinkles | `0` |
| `bounds` | at the edges: `"die"`, `"wrap"`, `"bounce"` or `"none"` | `"die"` |
| `bounciness` | the share of its speed kept at each bounce | `1` |
| `floor` | the row of the ground it lands on | none |
| `splash` | characters drawn where it lands | none |
| `trail` | seconds of its path drawn behind it | `0` |
| `path` | or where it is, worked out your own way: `(p) => [column, row]` | none |
| `seed` | a whole number: the same seed, the same particles | `1` |

Give a list of systems to draw several, each over the last. `system({ ... })` gives a system back as it is: written apart from `particles()`, it is checked where it is written, and `[1, 2]` reads as a range.

## Born on a mark

To say where in a picture particles come from without counting columns, type a mark there in the art and give the emitter `{ mark }`. The mark is drawn as a blank. `streak` is a `glyph` that points the way each particle goes, `-`, `\`, `|` or `/`:

```ts
// cabin.ts
import { particles, streak, system } from "ascii.rest/kit";

const cabin = `
        ^
       | |
   ____|_|____
  /           \\
 /_____________\\
  |  _     _  |
  |_|_|___|_|_|`;

const smoke = system({ emitter: { mark: "^" }, direction: "up", spread: 20, speed: [1, 2], sway: 1, life: [3, 5], glyphs: "()~-." });
const rain = system({ emitter: "top", direction: "down", speed: [10, 14], wind: 8, glyph: streak, rate: 30 });

export default particles({ name: "cabin in the rain", cols: 40, rows: 14, front: cabin }, [smoke, rain]);
```

At 1 second:

```text
    \        \\   \
     \\                   \\
     \ \  \ \                          \
         \    \\\  ..             \
                   -..  \
        \\ \       ))~~   \
         \\      \ ())
                \ \( \  \  \       \
               \   | |     \
               ____|_|____        \  \
              /           \  \
             /_____________\
              |  _     _  |  \
              |_|_|___|_|_|   \ \ \\
```

## Particles off a word

An emitter of `{ text }` gives birth on a picture's characters. With a `banner()` as both the emitter and the picture behind, sparks rise off its letters:

```ts
// spark-banner.ts
import { banner } from "ascii.rest/banner";
import { particles } from "ascii.rest/kit";

const word = banner("ascii", { effect: "still", color: ["#f59e0b", "#ef4444"] });

export default particles({ name: "spark banner", back: word }, {
  emitter: { text: word }, rate: 24, direction: "up", spread: 60, speed: [3, 8], life: [1, 2.2], gravity: -2, sway: 0.6,
  glyphs: "*+'.", colors: { light: ["#7c2d12", "#c2410c", "#ea580c", "#f59e0b"], dark: ["#fffbeb", "#fde047", "#f97316", "#b91c1c"] },
});
```

A `burst` from text puts one particle on each character, drawn as that character, so the word itself comes apart.

## Options

`particles(spec, ...)` takes a piece's spec, as [piece()](/docs/kit/#piece-draw-your-own) does, with every field optional (64 by 24 by default), and these:

| option | what it does | default |
| --- | --- | --- |
| `period` | seconds after which it repeats exactly. `0` for a piece that never repeats. | `8` |
| `front` | a picture drawn in front of the particles | none |
| `back` | a picture drawn behind them | none |

## drawParticles(): particles in your own piece

`drawParticles(s, systems, t, options?)` draws systems into a grid you are drawing already. `particlesPalette(systems)` gives the piece their colours. Make the systems once, outside the drawing:

```ts
// comet.ts
import { TAU, drawParticles, particlesPalette, piece, presets, type System } from "ascii.rest/kit";

const head = (t: number) => [32 + 27 * Math.cos((TAU * t) / 8), 12 + 9 * Math.sin((TAU * t) / 8)] as const;
const tail: System = {
  emitter: { point: head }, rate: 80, life: [0.6, 1.6], speed: [0, 1.5], glyphs: "@**++:::...",
  colors: { light: ["#0f172a", "#0369a1", "#7dd3fc"], dark: ["#ffffff", "#7dd3fc", "#1d4ed8"] },
};
const sky = [...presets.stars({ cols: 64, rows: 24, period: 8 }, { shooting: 0 }), tail];

export default piece({ name: "comet", cols: 64, rows: 24, loop: 8, palette: particlesPalette(sky, { light: ["#b45309"], dark: ["#f59e0b"] }) }, (t, s) => {
  drawParticles(s, sky, t, { period: 8 });
  s.write(26, 10, "  .----.\n=(      )=\n  '----'");
});
```

`presets.snow(size, options)` and the rest return the systems, to draw yourself or to change.

## Next

- [materials](/docs/kit-materials/): smoke, steam and bubbles that rise from a named object.
- [effects](/docs/kit-fx/): a glint or a shake on the whole piece.
