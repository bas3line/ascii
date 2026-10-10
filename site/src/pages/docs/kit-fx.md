---
layout: ../../layouts/Docs.astro
title: effects
description: Effects that take any piece, banner or text and return a new piece, from a glint and a typing to a glitch, a wave, a rainbow and effects of your own.
---

An **effect** takes a piece and returns a new one. It works on anything: a library piece like `rust`, a `banner()`, a piece you made with the kit, or plain text. The new piece plays everywhere, keeps its source's colours on both pages, and loops when they both do.

```ts
// glint-rust.ts
import { glint } from "ascii.rest/kit";
import { rust } from "ascii.rest/pieces";

export default glint(rust, { every: 3, options: { shine: 0 } });
```

`options` passes options to the source: `shine: 0` stops the logo's own glint, so only this one shows.

Text works as it is. This types a command in, holds for 2 seconds, then types it again:

```ts
// command.ts
import { typeIn } from "ascii.rest/kit";

export default typeIn("$ npx ascii.rest add kit", { hold: 2 });
```

At 1 second it is all typed, the cursor blinking after it:

```text
$ npx ascii.rest add kit▌
```

## Every effect

| effect | what it does | its options, with defaults |
| --- | --- | --- |
| `glint(src)` | a light band crosses the ink now and then, like the logos' glint | `every` 4, `sweep`, `first` 0.5, `width` 3, `slant` 1, `chars`, `color` |
| `typeIn(src)` | typed in a character at a time behind a cursor | `speed` 40, `start` 0, `cursor` `"▌"`, `order` `"reading"`, `hold`, `seed` |
| `dissolve(src)` | comes and goes through noise, in blobs | `period` 6, `mode` `"inout"`, `blob` 7, `edge`, `seed` |
| `fade(src)` | every character steps down a ramp to nothing and back | `period` 6, `mode` `"inout"`, `ramp` `"auto"` |
| `scan(src)` | a line sweeps across it, or reveals it | `period` 3, `direction` `"down"`, `char`, `color`, `reveal` false |
| `glitch(src)` | rows slide and cells turn to junk, for a moment | `every` 2.5, `length` 0.35, `first` 0.5, `amount` 0.5, `chars`, `seed` |
| `wave(src)` | each row sways on a sine, or each column bobs | `amplitude` 2, `wavelength` 12, `period` 2, `axis` `"rows"` |
| `rainbow(src)` | its ink in bands of colour that run across it | `colors` (12 hues), `steps` 12, `period` 3, `cycles` 1, `direction` `"x"` |
| `hueCycle(src)` | the whole piece cycling through the hues | as `rainbow` |
| `shake(src)` | jolts a cell or so each way now and then | `amount` 1, `every` 2, `length` 0.3, `first` 0.5, `seed` |
| `outline(src)` | a box-drawing line round the outside of its ink | `style` `"single"`, `color`, `gap` 1 |
| `shadow(src)` | a drop shadow behind it | `dx` 1, `dy` 1, `char` `"░"`, `color`, `solid` true |

Every effect also takes `name`, `note`, and `options` for its source. `mode` is `"in"`, `"out"` or `"inout"`. Times are in seconds. An option the effect doesn't have throws, and lists the ones it has.

Effects that grow the piece, like `wave`, `shake`, `outline` and `shadow`, add room round it so nothing is cut off. Between bursts, a glint, a glitch or a shake leaves the piece exactly its source.

## chain(): one after another

`chain(src, ...effects)` gives each effect the piece the last one made. An effect with options goes in as a function:

```ts
// card.ts
import { chain, outline, shadow, typeIn } from "ascii.rest/kit";

const commands = "$ npx ascii.rest donut\n$ npx ascii.rest banner hello\n$ npx ascii.rest add donut";

export default chain(
  commands,
  (p) => typeIn(p, { name: "terminal", hold: 2 }),
  (p) => outline(p, { style: "rounded" }),
  shadow,
);
```

At 1 second, the outline grows round the commands as they type:

```text
╭──────────────────────╮
│$ npx ascii.rest donut╰───╮
│$ npx ascii.rest banner h▌│░
╰──────────────────────────╯░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

A rainbow banner that sways:

```ts
// hello.ts
import { banner } from "ascii.rest/banner";
import { chain, rainbow, wave } from "ascii.rest/kit";

export default chain(banner("hello", { effect: "still" }), rainbow, wave);
```

Its loop is worked out from both: 6 seconds, when the rainbow's 3 and the wave's 2 come round together.

## effect(): your own

`effect(src, spec?, draw)` makes an effect of your own. The kit plays the source and hands your drawing each of its frames as a grid, `src`, with an empty grid, `s`, to draw into. It works out the size, the colours and the loop.

This draws a banner over its reflection, each row of the reflection rippling:

```ts
// reflection.ts
import { banner } from "ascii.rest/banner";
import { effect } from "ascii.rest/kit";

const word = banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] });
const letter = (ch: string) => ch >= "▀" && ch <= "▟";

export default effect(word, { name: "reflection", period: 2, pad: { bottom: word.meta.rows } }, (t, s, src) => {
  s.paste(src, 0, 0);
  for (let y = 0; y < src.rows; y++) {
    const dx = Math.round(Math.sin(Math.PI * (t + y / 3)));
    for (let x = 0; x < src.cols; x++) if (letter(src.get(x, y))) s.set(x + dx, 2 * src.rows - 1 - y, "░", src.colorAt(x, y));
  }
});
```

What `effect()`'s spec takes:

| option | what it does | default |
| --- | --- | --- |
| `period` | seconds the effect repeats in, if it moves by itself | none |
| `moves` | true when it moves by itself without a period | true when there is a period |
| `still` | the moment held for reduced motion | the source's |
| `pad` | room round the source to draw in: a number, `[columns, rows]` or `{ top, right, bottom, left }` | `0` |
| `colors` | colours it draws in besides the source's, as `#rrggbb` | none |

The drawing's fourth argument, `ctx`, has `ctx.x` and `ctx.y`, where the source's top left sits in the new grid, and `ctx.at(t)`, the source's frame at another moment, for trails and echoes.

## Next

- [layouts](/docs/kit-compose/): pieces side by side, over each other, or in turn.
- [banners](/docs/banners/): every option of `banner()`.
