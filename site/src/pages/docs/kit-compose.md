---
layout: ../../layouts/Docs.astro
title: layouts
description: Pieces made of other pieces, side by side, in a grid with borders, layered over each other, played in turn, cropped, scaled and retimed.
---

The layout functions make a piece out of other pieces. Each part keeps its own player, options and colours, and the whole is one piece that plays everywhere. A part can be a piece, a block of text, or a grid.

Three logos in a row:

```ts
// logos.ts
import { row } from "ascii.rest/kit";
import { go, python, rust } from "ascii.rest/pieces";

export default row([rust, go, python], { gap: 4 });
```

A dashboard of four of the library's charts, each in a titled box:

```ts
// dashboard.ts
import { grid } from "ascii.rest/kit";
import { barChart, gauge, heartbeat, sparkline } from "ascii.rest/pieces";

export default grid(
  [
    { src: barChart, color: { light: "#0969da", dark: "#58a6ff" } },
    { src: gauge, color: { light: "#1a7f37", dark: "#3fb950" } },
    { src: sparkline, color: { light: "#9a6700", dark: "#d29922" } },
    { src: heartbeat, color: { light: "#cf222e", dark: "#f85149" } },
  ],
  { border: { title: true, color: { light: "#8c959f", dark: "#6e7681" } } },
);
```

The grid is two a row, as square as four parts allow. Each chart keeps its own player and options, and its clip's `color` paints it in one colour for each page.

## Side by side

| function | what it makes |
| --- | --- |
| `row(parts, o?)` | parts left to right, `gap` columns apart (2), aligned `"top"`, `"middle"` or `"bottom"` (`"middle"`) |
| `column(parts, o?)` | parts top to bottom, `gap` rows apart (1), aligned `"left"`, `"center"` or `"right"` (`"center"`) |
| `grid(parts, o?)` | parts in a grid of `columns` a row (as square as they allow), `gap` (`[2, 1]`), `align`, and a `border` round each cell |
| `border(src, o?)` | a box round a piece: `style` (`"rounded"`), `title`, `color`, `pad` (`[0, 1]`) |

`title: true` puts the piece's name on its box.

## Over each other

`layer(base, ...over)` stacks parts in the first one's size, each later one over those before it. A part's spaces let the parts under it show. `over(top, bottom, o?)` is two of them, the top one centred:

```ts
// hello-stars.ts
import { banner } from "ascii.rest/banner";
import { layer, named } from "ascii.rest/kit";
import { starfield } from "ascii.rest/pieces";

const hello = banner("hello", { color: { light: ["#0891b2", "#9333ea"], dark: ["#67e8f9", "#c084fc"] } });

const scene = layer(
  { src: starfield, color: { light: "#57606a", dark: "#8b949e" } },
  { src: hello, anchor: "center" },
  { src: " __\n|__>=-", color: { light: "#bf8700", dark: "#fbbf24" }, anchor: "bottom-left", margin: 1, move: "right" },
);

export default named(scene, "hello among the stars");
```

The banner sits in the middle of the stars, and the ship flies along the bottom, out past the right edge and back in from the left. A crossing takes three of the banner's 3.2 second glints, 9.6 seconds, so the two come round together and that is the whole's loop.

What a layer takes, besides `src`:

| field | what it does | default |
| --- | --- | --- |
| `anchor` | the point of the base it sits on: `"top-left"`, `"top"`, `"center"`, `"bottom-right"` and the rest | `"top-left"` (`over()` centres) |
| `margin` | cells kept between it and the edges its anchor puts it against | `0` |
| `move` | travel toward `"left"`, `"right"`, `"up"` or `"down"`, out one edge and back in the other. `{ to, period }` sets the seconds. | none |
| `x`, `y` | columns right and rows down from there, or a function of `t` | `0` |
| `mask` | what of it is see-through: `" "` its blank cells, or `null` for nothing, as a card | `" "` |

For an empty stage of your own size, make the first part a blank grid: `new Surface(80, 24)`.

## A clip: a part with its own settings

Wherever a layout takes a part, it also takes a **clip**: `{ src, options, offset, speed, color }`. `options` are the part's own, `offset` starts it further in, `speed` runs its time faster or slower, and `color` paints all of it in one colour, or one for each page as `{ light, dark }`.

## In turn

`sequence(steps, o?)` plays pieces one after another, each turning into the next:

```ts
// logo-show.ts
import { sequence } from "ascii.rest/kit";
import { go, python, rust } from "ascii.rest/pieces";

export default sequence([rust, go, python], { seconds: 3 });
```

| option | what it does | default |
| --- | --- | --- |
| `seconds` | how long each step lasts. A step can say its own: `{ src, seconds }`. | `4` |
| `transition` | `"dissolve"`, `"fade"`, `"wipe"` or `"cut"` | `"dissolve"` |
| `overlap` | seconds a transition takes | `0.8` |
| `loop` | the last step turns back into the first | `true` |
| `seed` | the dissolve's pattern | `1` |

## Reshape and retime

| function | what it makes |
| --- | --- |
| `crop(src, { x, y, cols, rows })` | a part of a piece |
| `pad(src, n)` | blank cells round it: a number, `[rows, columns]` or `{ top, right, bottom, left }` |
| `scale(src, factor)` | bigger by whole numbers, each cell repeated. Block art scales best. |
| `flip(src, axis)` | mirrored: `"x"`, `"y"` or `"both"`. `/` becomes `\` and `(` becomes `)`. |
| `speed(src, factor)` | played faster or slower |
| `delay(src, seconds)` | waits on its first frame before it plays |
| `repeat(src, seconds)` | its first `seconds` over and over, which becomes its loop |
| `freeze(src, at)` | a still of its frame at `at` seconds |
| `named(src, name, o?)` | the same piece under another name, `note` and `category` |

A whole loops when its parts do: its loop is the time after which they all come round together, up to 60 seconds. Its colours are its parts' merged, and past the 64 a piece can hold, the nearest ones are folded together.

## Next

- [effects](/docs/kit-fx/): a glint or an outline on a layout.
- [particles](/docs/kit-particles/): `front` and `back` lay a picture with particles, too.
