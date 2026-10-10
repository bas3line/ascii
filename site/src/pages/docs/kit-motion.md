---
layout: ../../layouts/Docs.astro
title: motion
description: Set anything moving in words, spinning, orbiting, bouncing, floating, pulsing, drifting, sliding in, with no angles and no maths.
---

A **motion** takes a thing and gives it back moving: `spinning(torus())`, `bouncing(banner("boing"))`, `floating(heart())`. There are no angles, no sines and no frames to count. The thing can be anything the kit draws:

- a piece: a library piece, a `banner()`, a look, anything the kit made;
- text, or a grid;
- a 3D shape such as `torus()`, `cube()` or `sphere()`, or a list of them;
- a shape from [materials](/docs/kit-materials/) such as `heart()`, `flame()` or `cup()`, drawn in its own material;
- parts made with `shape()` and `emit()`.

```ts
// bounce.ts
import { banner } from "ascii.rest/banner";
import { bouncing } from "ascii.rest/kit";

export default bouncing(banner("boing", { effect: "still" }));
```

The top of a bounce, at 0.6 seconds, its shadow narrowed on the ground below:

```text
▓▓▓▓▓▓╗     ▓▓▓▓╗   ▓▓╗ ▓▓╗     ▓▓╗   ▓▓▓▓▓▓╗
▓▓╔═══▓▓╗ ▓▓╔═══▓▓╗ ▓▓║ ▓▓▓▓╗   ▓▓║ ▓▓╔═════╝
▓▓▓▓▓▓╔═╝ ▓▓║   ▓▓║ ▓▓║ ▓▓╔═▓▓╗ ▓▓║ ▓▓║ ▓▓▓▓╗
▓▓╔═══▓▓╗ ▓▓║   ▓▓║ ▓▓║ ▓▓║ ╚═▓▓▓▓║ ▓▓║ ╚═▓▓║
▓▓▓▓▓▓╔═╝ ╚═▓▓▓▓╔═╝ ▓▓║ ▓▓║   ╚═▓▓║ ╚═▓▓▓▓▓▓║
╚═════╝     ╚═══╝   ╚═╝ ╚═╝     ╚═╝   ╚═════╝






               ▔▔▔▔▔▔▔▔▔▔▔▔▔▔
```

Motions wrap each other, so `floating(spinning(cube()))` is a cube turning as it hovers.

## Every motion

Every motion takes `speed` (`"slow"`, `"normal"`, `"fast"`, or times as fast), `period` (the seconds of one loop, exactly), `name` and `note`.

| motion | what it does | its own options | one line |
| --- | --- | --- | --- |
| `spinning(thing)` | a 3D shape turns in 3D; a flat thing turns like a coin, its back mirrored. Once in 6 seconds. | `way`: `"tumble"`, `"turntable"`, `"wheel"`, `"flip"`; `cols`, `rows` | `spinning(torus())` |
| `orbiting(thing)` | goes round in a circle, in front below and behind above. Once in 6 seconds. | `around`: a thing at the middle; `radius`: `"close"`, `"medium"`, `"far"` | `orbiting("*", { around: "sun" })` |
| `bouncing(thing)` | bounces on the ground with its shadow, landing every 1.2 seconds | `height`: `"low"`, `"medium"`, `"high"`; `shadow` | `bouncing(ball())` |
| `floating(thing)` | rises and sinks gently, once in 3 seconds | `height`: `"low"`, `"medium"`, `"high"` | `floating(heart())` |
| `swaying(thing)` | leans side to side as a tree does, or swings as a sign hangs | `amount`: `"subtle"`, `"medium"`, `"strong"`; `from`: `"bottom"`, `"top"` | `swaying(flame())` |
| `pulsing(thing)` | grows and shrinks about its middle, breathing or beating | `amount`; `beat`: `"breath"`, `"heart"` | `pulsing(heart(), { beat: "heart" })` |
| `blinking(thing)` | on and off, softly, once in 1.2 seconds | `on`: the share of a blink it shows for | `blinking("● REC")` |
| `shaking(thing)` | jolts for a moment every 2 seconds, or all the time | `amount`; `nonstop` | `shaking("boom", { amount: "strong" })` |
| `drifting(thing)` | crosses its stage and comes round again, in 8 seconds | `to`: `"right"`, `"left"`, `"up"`, `"down"`; `across`: what it crosses; `lane` | `drifting(cloud(), { across: sky() })` |
| `growIn(thing)` | grows from nothing, holds, and grows again | `seconds`, `hold` (or `"forever"`), `ease` | `growIn(star(), { ease: "springy" })` |
| `slideIn(thing)` | slides in from an edge, holds, and slides in again | `from`: `"left"`, `"right"`, `"top"`, `"bottom"`; `seconds`, `hold`, `ease` | `slideIn("hello", { ease: "bouncy" })` |
| `slideOut(thing)` | holds, slides out to an edge, and comes back | `to`; `seconds`, `hold`, `ease` | `slideOut("bye", { to: "bottom" })` |
| `planet()` | a whole world turning, with a moon and a ring if you like | `type`: `"gas"`, `"earth"`, `"mars"`, `"ice"`; `moon`, `rings`, `color` | `planet({ type: "earth", moon: true })` |

`amount` is `"subtle"`, `"medium"` or `"strong"` in every motion that takes it, or a number: cells for `swaying()` and `shaking()`, a share of its size for `pulsing()`, `0.1` growing it a tenth. `height` is in rows, `radius` in columns for a flat orbit, when you give a number.

An easing, `ease`, says how a move starts and stops: `"steady"`, `"smooth"`, `"snappy"` (overshooting a little and settling), `"springy"` or `"bouncy"`, or any easing from [maths](/docs/kit-math/) by name, such as `"outCubic"`.

## Every motion in one file

```ts
// motion.ts
import { banner } from "ascii.rest/banner";
import { ball, blinking, bouncing, cloud, cube, drifting, flame, floating, growIn, heart, orbiting, planet, pulsing,
  shaking, sky, slideIn, slideOut, spinning, star, starfield, shape, swaying, torus } from "ascii.rest/kit";

export const donut = spinning(torus({ color: "#f97316" }));
export const coin = spinning(banner("ok", { effect: "still", color: "#eab308" }));
export const moon = orbiting("*", { around: banner("sun", { effect: "still", color: "#f59e0b" }) });
export const boing = bouncing(ball(), { height: "high" });
export const hover = floating(spinning(cube({ color: "#38bdf8" }), { way: "turntable" }), { height: "medium" });
export const candle = swaying(flame());
export const heartbeat = pulsing(heart(), { beat: "heart" });
export const rec = blinking("● REC", { speed: "slow" });
export const boom = shaking(banner("boom", { effect: "still", color: "#f85149" }), { amount: "strong", speed: "fast" });
export const sail = drifting(cloud(), { across: shape(sky(), starfield()), lane: "top" });
export const pop = growIn(star(), { ease: "springy", seconds: 1.5 });
export const hello = slideIn(banner("hello", { effect: "still" }), { ease: "bouncy" });
export const bye = slideOut("see you", { to: "bottom" });
export const earth = planet({ type: "earth", moon: true });
export const saturn = planet({ rings: true, color: "gold", name: "saturn" });

export default donut;
```

## A motion of your own

Each motion is a few lines over the kit's own parts, so read one to write your own: `spinning()` is a `scene()` and a `group()` for a 3D shape, and `row()`, `flip()` and `effect()` for a coin; `drifting()` is `layer()` with a `move`; `shaking()` is the effect `shake()` with its numbers in words. Their source is in `src/kit/recipes/motion.ts`.

`pieceOf(thing)` turns any thing a motion takes into a piece, `loopFor([a, b])` works out the loop of things played together, and `withLoop(piece, seconds)` gives a piece the loop you worked out, so a motion of your own takes what these do:

```ts
// wobble.ts
import { effect, pieceOf, type Thing } from "ascii.rest/kit";

// A thing nudged one cell right every other half second.
export const wobbling = (thing: Thing) =>
  effect(pieceOf(thing), { period: 1, pad: [1, 0] }, (t, s, g, ctx) => s.paste(g, ctx.x + (t % 1 < 0.5 ? 0 : 1), ctx.y));

export default wobbling("<o>");
```

## Next

- [widgets](/docs/kit-widgets/): clocks, bars and gauges in one call, to set moving.
- [effects](/docs/kit-fx/): `effect()` and the effects the motions are made of.
- [3d scenes](/docs/kit-shapes3d/): the scenes under `spinning()` and `planet()`.
