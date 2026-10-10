---
layout: ../../layouts/Docs.astro
title: maths
description: Noise, seeded randomness, easing, tweens, loops and a 3D camera, so a piece never writes its own.
---

These are the sums a piece would otherwise write for itself: noise for terrain and clouds, random numbers from a seed, easing, time that loops, and points in 3D. All of it is in `ascii.rest/kit`, and every function gives the same answer for the same input, in every browser and in Node.

A mountain range is one `noise()`, described rather than worked out:

```ts
// ridge.ts
import { noise, piece } from "ascii.rest/kit";

const top = noise({ kind: "ridged", size: 14, drift: -6, period: 8, range: [9, 3] });

export default piece({ name: "ridge", cols: 48, rows: 12, loop: 8 }, (t, s) => {
  for (let x = 0; x < s.cols; x++) {
    const y = Math.round(top(x, 0, t));
    s.set(x, y, "^");
    for (let r = y + 1; r < s.rows; r++) s.set(x, r, ":");
  }
});
```

```text



^
:        ^     ^     ^                         ^
:^      ^:    ^:^  ^^:^^^^^                ^ ^^:
::^     ::^^ ^::: ^::::::::^      ^^    ^  :^:::
:::^   ^::::^::::^::::::::::     ^::^^^^:^^:::::
::::^^^:::::::::::::::::::::^^^^^:::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::
```

It is ridged, about 14 cells across, slides 6 cells a second to the left, sits between rows 9 and 3, and comes round every 8 seconds, so the piece loops.

## noise(): noise you describe

`noise(options)` returns a function, `(x, y, t) => value`. Make it once, at the top of the file, then call it for each cell. Its `x` and `y` are cells, so a feature 12 cells across is 12 columns wide.

| option | what it does | default |
| --- | --- | --- |
| `size` | how big a feature is, in cells, or `[columns, rows]` | `12` |
| `kind` | `"smooth"` hills and clouds, `"ridged"` crests, `"cells"` with walls between | `"smooth"` |
| `detail` | layers of finer detail, 1 to 8 | `3` (`1` for cells) |
| `drift` | cells a second it slides, a number across or `[x, y]` | `0` |
| `morph` | how fast it changes where it is, in features a second | `0.25`, or `0` when it drifts |
| `period` | seconds after which it comes back exactly. Set the piece's `loop` to the same. | none |
| `range` | the numbers it gives, low to high: `[4, 12]` gives a row | `[0, 1]` |
| `seed` | a whole number: each seed is another pattern | `0` |

A drifting loop is a band that slides round once a period, so it repeats every `drift * period` cells. Make that the grid's width or more and the repeat never shows. It can drift or morph in a loop, not both.

The lower-level noise is there too. Each gives 0 to 1:

| function | what it is |
| --- | --- |
| `noise2(x, y, seed?)`, `noise3`, `noise4` | simplex noise in 2, 3 and 4 dimensions, about one feature a unit |
| `fbm(x, y, o?)`, `fbm3` | fractal noise: `octaves` (4) layers, each finer and fainter |
| `ridged(x, y, o?)` | sharp crests with soft valleys, for mountains and lightning |
| `worley(x, y, o?)` | cellular noise: the distance to the nearest of scattered points. `edge: true` for cracks. |
| `loopNoise(x, y, t, period, o?)` | noise that changes in place and comes back every `period` seconds |
| `valueNoise3(x, y, z, seed?)` | blockier, cheaper value noise in 3D |

## random(): numbers from a seed

`random(seed)` makes a seeded generator. Call it for a number from 0 up to 1, or use its helpers. The same seed gives the same numbers in the same order, everywhere. Draw them at the top of the file or in a piece's setup, not in its frames, so a frame depends only on `t`.

```ts
// sky.ts
import { piece, random } from "ascii.rest/kit";

const rnd = random(42);
const stars = Array.from({ length: 60 }, () => ({ x: rnd.int(0, 47), y: rnd.int(0, 9), ch: rnd.pick("*+.") }));

export default piece({ name: "sky", cols: 48, rows: 10, fps: 0 }, (t, s) => {
  for (const star of stars) s.set(star.x, star.y, star.ch);
});
```

| helper | what it gives |
| --- | --- |
| `rnd()` | a number from 0 up to 1 |
| `rnd.range(lo, hi)` | a number from `lo` up to `hi` |
| `rnd.int(lo, hi)` | a whole number from `lo` to `hi`, both included |
| `rnd.pick(list)` | one item of a list, or one character of a string |
| `rnd.chance(p)` | `true` with probability `p` |
| `rnd.normal(mean?, sd?)` | a number from a bell curve |
| `rnd.sign()` | `1` or `-1` |
| `rnd.angle()` | an angle in radians, 0 up to `TAU` |
| `rnd.shuffle(list)` | the list in a random order |
| `rnd.inCircle(r?)`, `rnd.onCircle(r?)` | a point in, or on, a circle |
| `rnd.inSphere(r?)`, `rnd.onSphere(r?)` | a point in, or on, a sphere |
| `rnd.fork(n)` | another generator, stream `n` of the same seed |

`scatter(count, { cols, rows }, o?)` spreads `count` spots evenly over an area, no clumps and no gaps: where the stars, the snow or the flowers go. Each spot is `{ x, y, i, k }`, its cell, its number, and a seeded number of its own from 0 to 1.

## Time

Every one of these comes back exactly, so a piece that uses them loops.

| function | what it gives |
| --- | --- |
| `phase(t, period)` | how far through a cycle, 0 up to 1, back to 0 every period |
| `cycle(t, period)` | which turn of the cycle `t` is in: 0, 1, 2 |
| `oscillate(t, period, lo?, hi?, offset?)` | a sine wave between `lo` and `hi` |
| `triangle(t, period)` | 0 up to 1 and back down, in straight lines |
| `pulse(t, period, width?)` | 1 for the first `width` seconds of every period, then 0 |
| `twinkle(t, id, o?)` | a brightness for twinkling things, each `id` on its own beat |
| `lcm(periods)` | when several loops come round together, up to 60 seconds |

## Easing and tweens

`ease` holds the standard easings by name, as easings.net has them: `ease.outCubic(k)` for `k` from 0 to 1. Every one starts at 0 and ends at 1.

`tween(t, from, to, o?)` moves a number, or a point `[x, y]`, from `from` to `to` over time, eased. `progress(t, o?)` gives how far a move has got, 0 to 1. Both take `start` (0), `duration` (1 second), `ease` (`"inOutSine"`) and `period` (none: once).

```ts
// easing.ts
import { piece, tween } from "ascii.rest/kit";

const names = ["linear", "inOutSine", "outCubic", "outBack", "outElastic", "outBounce"] as const;

export default piece({ name: "easing", cols: 52, rows: 12, loop: 3 }, (t, s) => {
  names.forEach((ease, i) => {
    s.write(0, 2 * i, ease.padStart(10));
    s.write(12, 2 * i, "|" + "·".repeat(36) + "|");
    s.set(tween(t, 12, 49, { duration: 2, period: 3, ease }), 2 * i, "●");
  });
});
```

At 1 second, halfway through the move, each dot is somewhere else on the same track:

```text
    linear  |·················●··················|

 inOutSine  |·················●··················|

  outCubic  |·······························●····|

   outBack  |····································|

outElastic  |····································●

 outBounce  |···························●········|
```

`outBack` has overshot past the end of its track, off the grid, and comes back.

For there and back again, ease a triangle: `lerp(a, b, ease.inOutSine(triangle(t, 4)))`.

## Remapping numbers

| function | what it gives |
| --- | --- |
| `remap(v, inLo, inHi, outLo, outHi, clamped?)` | `v` taken from one range to another, as p5's `map()` |
| `invLerp(a, b, v)` | where `v` sits from `a` to `b`: 0 at `a`, 1 at `b` |
| `wrap(v, lo, hi)` | `v` wrapped round into `lo..hi` |
| `mod(a, n)` | `a` modulo `n`, never negative |
| `pingpong(v, length)` | `v` bounced between 0 and `length` |
| `step(edge, v)` | 0 below `edge`, 1 from it on |
| `degrees(rad)`, `radians(deg)` | angles from one unit to the other |

## 3D points

`vec2` and `vec3` hold vector sums: `add`, `sub`, `scale`, `dot`, `length`, `normalize`, `lerp`, `dist`, and `cross` in 3D. `rotate3(v, angles)` turns a point, and `rotation(angles)` makes a function that turns many points by the same angles.

`camera({ cols, rows }, o?)` puts 3D points on the grid in perspective. Points are `[x, y, z]`, `y` up. It fits them so nothing within `size` leaves the grid, and `turn` spins them once every so many seconds:

```ts
// globe.ts
import { camera, piece, random } from "ascii.rest/kit";

const rnd = random(5);
const dots = Array.from({ length: 500 }, () => rnd.onSphere());
const view = camera({ cols: 40, rows: 16 }, { turn: 8 });

export default piece({ name: "globe", cols: 40, rows: 16, loop: 8 }, (t, s) => {
  for (const d of dots) {
    const v = view(d, t);
    if (v) s.set(v.x, v.y, v.near > 0.5 ? "o" : ".");
  }
});
```

```text
              ooooo.ooo.oo
            . o .   o.. .oo
         o oo... . . . ..o...o.
       o....o . .  o. . o.oo.o.oo
       o..oo  . . .   .   ....o.oo
     oo... .  . .   . .o o. o ..ooo
     .  oo...  . .....o .. o  .o..o
     o ... .oo   ..  o. .o..o.. . oo
    o.o .. . . .. . o .. .o..  oo o
     o . .. .   ...o. .o .  o  . o.
     oo  o .. .. o.  ....  . ....oo
      o oo.. ..  .. o  o ..oo  ..o
       oo..   .o  . .o.oo.  .o.oo
          oo...oo  o.  ..o..oo o
           oo o... ..o.. .ooo
               o.oooo.oo
```

A view is `{ x, y, depth, near }`: its cell, its distance, and how near it is from 0 to 1, for shading the far side fainter. For lit, solid shapes, use [3d scenes](/docs/kit-shapes3d/) instead.

`project(point, { cols, rows })` is the plain perspective step, with no turning or fitting.

## Next

- [fields](/docs/kit-field/): noise in a field. `noise()` takes cells, so pass `at.col` and `at.row`.
- [particles](/docs/kit-particles/): seeded systems with no maths at all.
