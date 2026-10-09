---
layout: ../../layouts/Docs.astro
title: banners
description: Any text in block letters with a drop shadow, as a piece. The font, the shadow, the characters, the motion and the colours are all options.
---

<div class="demo"><ascii-banner text="banners" color="#f97316,#f778ba,#ab7df8" shadow="rounded" effect="type"></ascii-banner></div>

`banner(text, options?)` returns a piece, so a banner plays everywhere a piece does:

```ts
import { banner } from "ascii.rest/banner";

const hello = banner("hello", { color: ["#f97316", "#f778ba"], shadow: "rounded" });
```

| where | how |
| --- | --- |
| react, next.js | `<Banner text="hello" shadow="rounded" />`, or `<Ascii piece={hello} />` |
| astro | `<Banner text="hello" shadow="rounded" />` from `ascii.rest/astro/banner` |
| html | `<ascii-banner text="hello" shadow="rounded"></ascii-banner>` |
| typescript | `mount(canvas, hello)` |
| an svg | `svg(hello)`, or `bannerSvg("hello", { … })` with a tagline and a logo: [svg](/docs/svg/) |
| a readme | `https://ascii.rest/banner/hello.svg?shadow=rounded`: [github readme](/docs/readme/#banners) |
| a terminal | `banner("hello", { … })` from `ascii.rest/terminal`, or `npx ascii.rest banner hello` |

It throws when the font draws none of the text. `drawable(text, font?)` returns the characters it can draw, in the case they came in.

## Options

| option | | default |
| --- | --- | --- |
| `font` | `"block"`, `"slim"`, or [a font of your own](#fonts) | `"block"` |
| `pixel` | columns a pixel of the font takes; 2 makes it square on a character cell, 1 narrow | `2` |
| `gap` | columns between letters | `2` |
| `shadow` | the drop shadow's lines: `"double"`, `"single"`, `"heavy"`, `"rounded"`, `"ascii"`, 16 characters of your own, or `"none"` | `"double"` |
| `fill` | the letters' character, or `{ dark, light }` for each ground | `"▓"` dark, `"█"` light |
| `effect` | `"glint"`, a glint crossing now and then; `"type"`, the letters typing in once and staying; or `"still"` | `"glint"` |
| `speed` | how fast it moves: 2 is twice as fast | `1` |
| `glint` | `{ first, sweep, every, width, slant, chars }`: when it first crosses and how long it takes, in seconds, how often it comes round, its width and slant in cells, and its two characters, core then edge, or `{ dark, light }` | `{ 0.5, 2.4, 3.2, 2.4, 1.2 }` |
| `type` | `{ step }`: seconds for each letter | `{ step: 0.133 }` |
| `color` | the letters' colour, several for a fade along them, or `{ light, dark }` for each theme | the page's own |
| `shadowColor` | the shadow's colour, or `{ light, dark }` | a muted grey when it has colour |
| `pad` | blank cells round it, one number, or `[rows, columns]` | `0` |
| `size` | `{ cols, rows }`: a fixed size to centre it in, with narrow pixels if it would not fit | its own |
| `max` | the widest it may be, in columns: narrower pixels when it would be wider | none |
| `name` | its name, for screen readers and titles | the text |

With no `color` and no `shadowColor` it is text: it draws into a `<pre>` in the page's colour and follows your CSS. With either, it has a palette and draws on a canvas, in the colours you gave for a light page or a dark one.

## Fonts

<div class="demo"><ascii-banner text="block" ></ascii-banner></div>
<div class="demo"><ascii-banner text="slim" font="slim"></ascii-banner></div>

Both have the letters A to Z, the digits and `. , ! ? ' : - + = / _`, five rows tall. A font of your own is an object:

```ts
import { banner, type Font } from "ascii.rest/banner";

const tiny: Font = {
  height: 3,
  glyphs: {
    H: "#.#|###|#.#",
    I: "###|.#.|###",
    " ": "..",
  },
};

banner("hi", { font: tiny });
```

Each glyph is its rows joined by `|`, `#` for a pixel and anything else for none, every row as wide as the first. Text is drawn in capitals unless the font says `cased: true`, and has lower-case glyphs of its own. `fonts.block` and `fonts.slim` are there to start from: `{ ...fonts.block.glyphs, "@": "…" }` adds a character.

## Shadows

| name | lines |
| --- | --- |
| `double` | `═ ║ ╔ ╗ ╚ ╝` |
| `single` | `─ │ ┌ ┐ └ ┘` |
| `heavy` | `━ ┃ ┏ ┓ ┗ ┛` |
| `rounded` | `─ │ ╭ ╮ ╰ ╯` |
| `ascii` | `- \| +` |
| `none` | no shadow, and no column for it |

The shadow is the letters' outline moved half a cell right and down. 16 characters of your own draw it in anything: each is the cell for the edges that meet in it, up 1, down 2, left 4 and right 8, so the double style is `" ║║║═╝╗╣═╚╔╠═╩╦╬"`. `shadows` has every built-in one.

## Colour

```ts
banner("one", { color: "#3fb950" });
banner("fade", { color: ["#f97316", "#f778ba", "#ab7df8"] });       // up to 30 steps along it
banner("themes", { color: { light: "#1f2328", dark: "#f0f6fc" }, shadowColor: { light: "#d0d7de", dark: "#30363d" } });
```

A coloured banner's palette has a half for a light page and a half for a dark one, as every coloured piece's does. `<Ascii>`, `<ascii-banner>` and `mount()` pick the half from the page's own text colour, so it follows a theme switch.

## Motion

```ts
banner("slow", { speed: 0.5 });
banner("often", { glint: { every: 1.6, sweep: 1 } });
banner("typed", { effect: "type", type: { step: 0.08 } });
banner("still", { effect: "still" });
```

A banner tells you how it moves in `piece.motion`: `{ seconds, from, once, pass }`, a loop of `seconds` for a glint whose first pass runs between the two times in `pass`, or one play of `seconds` for typing. `svg()` and the terminal use it to play exactly one loop, or one pass.

## In a fixed size

```ts
banner("hello", { size: { cols: 66, rows: 8 } });   // centred in 66 by 8, as the big text piece is
banner("a long name", { max: 80 });                 // narrow pixels if it would pass 80 columns
```

The [big text](/big-text/) piece draws the same frames as `banner(text, { size: { cols: 66, rows: 8 } })`, as a piece of its own with nothing to import.
