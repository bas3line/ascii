---
layout: ../../layouts/Docs.astro
title: banners
description: Draw any text in big block letters, then change its font, shadow, colours, motion and size.
---

A banner is any text you choose, drawn in big block letters with a drop shadow. By default it has a glint: a bright band that sweeps across the letters every few seconds. Every part of it is an option: the font, the shadow, the colours, the motion and the size.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/banners.mp4" poster="https://cdn.ascii.rest/videos/banners.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>A banner's options changed one at a time: font, shadow, fill, colours, effect and speed.</figcaption>
</figure>

Pick the example for where you want your banner.

On an HTML page, load the script once, then use the tag:

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>
<ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner>
```

In React or Next.js, run `npm install ascii.rest`, then use the component:

```tsx
import { Banner } from "ascii.rest/react";

export const Hero = () => <Banner text="hello" color={["#f97316", "#f778ba"]} />;
```

The tag and the component both draw this:

<div class="demo"><ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner></div>

In a GitHub README, use the banner's URL as an image. In a URL, a colour has no `#`:

```md
![hello](https://ascii.rest/banner/hello.svg?color=f97316,f778ba)
```

The URL gives this SVG image:

<div class="demo"><img src="/banner/hello.svg?color=f97316,f778ba" alt="HELLO in block letters, fading from orange to pink"></div>

## See the raw text

`banner()` from `ascii.rest/banner` returns a piece: one animation. Its `default()` returns a function that draws a frame, the picture at one moment, as text. Give that function a time in seconds. This prints the first frame in Node:

```ts
import { banner } from "ascii.rest/banner";

const frame = banner("hi").default();
console.log(frame(0));
```

It prints:

```text
▓▓╗   ▓▓╗ ▓▓╗
▓▓║   ▓▓║ ▓▓║
▓▓▓▓▓▓▓▓║ ▓▓║
▓▓╔═══▓▓║ ▓▓║
▓▓║   ▓▓║ ▓▓║
╚═╝   ╚═╝ ╚═╝
```

## Show a banner anywhere

`banner(text, options)` returns a piece, so anything that plays a piece also plays a banner.

| where | how | more |
| --- | --- | --- |
| React, Next.js | `<Banner text="hello" />` from `ascii.rest/react` | [react](/docs/react/) |
| Astro | `<Banner text="hello" />` from `ascii.rest/astro/banner` | [astro](/docs/astro/) |
| HTML | `<ascii-banner text="hello"></ascii-banner>` | [html](/docs/html/) |
| TypeScript | `mount(el, banner("hello"))` from `ascii.rest` | [typescript](/docs/typescript/) |
| an SVG file | `svg(banner("hello"))` or `bannerSvg("hello")` from `ascii.rest/svg` | [svg](/docs/svg/) |
| a GitHub README | `https://ascii.rest/banner/hello.svg` | [github readme](/docs/readme/) |
| a terminal | `npx ascii.rest banner hello`, or `banner("hello")` from `ascii.rest/terminal` | [terminal](/docs/terminal/) |

Two things here are easy to miss.

The terminal has its own `banner()`. The one in `ascii.rest/terminal` is a different function from the one in `ascii.rest/banner`. It prints the banner, lets the glint cross once (or the letters type in), then leaves it in the output. It takes every option on this page except `size` and `max`, because it fits the banner to the terminal's width. See [terminal](/docs/terminal/#print-a-banner-from-your-cli).

In React, make a banner once, outside your component. `<Banner>` does this for you. But if you call `banner()` yourself and pass the result to `<Ascii>`, call it outside the component. A new banner on every render starts its motion over each time.

```tsx
import { Ascii } from "ascii.rest/react";
import { banner } from "ascii.rest/banner";

const hello = banner("hello", { shadow: "rounded" });

export const Hero = () => <Ascii piece={hello} />;
```

## Options

Every option is optional. With none, you get the block font, a double-line shadow, and a glint every 3.2 seconds, in your page's text colour.

| option | what it does | default |
| --- | --- | --- |
| `font` | the letters: `"block"`, `"slim"`, or [a font of your own](#use-a-font-of-your-own) | `"block"` |
| `shadow` | the shadow's line style: `"double"`, `"single"`, `"heavy"`, `"rounded"`, `"ascii"`, `"none"`, or [16 characters of your own](#draw-the-shadow-with-your-own-characters) | `"double"` |
| `fill` | the one character the letters are drawn with, or `{ dark, light }` for each kind of page | `"▓"` on a dark page, `"█"` on a light one |
| `color` | the letters' colour: one `#rrggbb`, a list of them for a fade, or `{ light, dark }` | none: the page's text colour |
| `shadowColor` | the shadow's colour, or `{ light, dark }` | a muted grey, once the banner has a colour |
| `effect` | how it moves: `"glint"`, `"type"` or `"still"` | `"glint"` |
| `speed` | how fast it moves: 2 is twice as fast, 0.5 half as fast | `1` |
| `glint` | the glint's timing and look: `{ first, sweep, every, width, slant, chars }`. See [change the glint](#change-the-glint) | a glint every 3.2 seconds |
| `type` | `{ step }`: seconds to type each letter | `{ step: 2 / 15 }`, about 0.133 |
| `pixel` | columns one pixel of the font takes | `2` |
| `gap` | columns between letters | `2` |
| `pad` | blank cells around it: one number for every side, or `[rows, columns]` | `0` |
| `size` | `{ cols, rows }`: a fixed size to centre the banner in. See [set its size](#set-its-size) | its own size |
| `max` | the most columns it should take, padding included. See [set its size](#set-its-size) | no limit |
| `name` | its name, for screen readers and titles | the text it draws |

`banner()` throws an error for a value it can't take. [Fix an error from banner()](#fix-an-error-from-banner) lists what each option takes.

## Use the same options everywhere

Every option has the same name and value in `banner()` and as a prop of `<Banner>`, in React and in Astro. Each `<Banner>` also has a few props of its own, such as `label` and `mono`. See [react](/docs/react/#draw-text-as-a-banner) and [astro](/docs/astro/#draw-your-own-text-with-banner).

The `<ascii-banner>` tag takes the common options as attributes, and any other option as JSON in its `options` attribute:

| `banner()` and `<Banner>` | `<ascii-banner>` |
| --- | --- |
| `font: "slim"` | `font="slim"` |
| `shadow: "rounded"` | `shadow="rounded"` |
| `fill: "#"` | `fill="#"` |
| `effect: "type"` | `effect="type"` |
| `speed: 2` | `speed="2"` |
| `pixel: 1` | `pixel="1"` |
| `gap: 1` | `gap="1"` |
| `color: ["#f97316", "#f778ba"]` | `color="#f97316,#f778ba"` |
| `shadowColor: "#30363d"` | `shadow-color="#30363d"` |
| any other option, like `pad: 1` | `options='{"pad":1}'` |

Colours for a light and a dark page, `{ light, dark }`, also go in `options`: `options='{"color":{"light":"#c2410c","dark":"#fb923c"}}'`.

An empty attribute counts as no attribute. If an attribute and `options` set the same option, the attribute wins.

A README URL takes a few named choices, not every option. [github readme](/docs/readme/#change-how-a-banner-looks) lists them, and the [banner maker](/banner/) writes the URL for you.

## Change the font

Two fonts are built in: `block`, the default, and `slim`, which is narrower. Both are five rows tall. Both draw the letters A to Z, the digits 0 to 9, spaces, and `. , ! ? ' : - + = / _`.

```ts
import { banner } from "ascii.rest/banner";

banner("block");
banner("slim", { font: "slim" });
```

<div class="demo" style="gap: 1rem"><ascii-banner text="block"></ascii-banner><ascii-banner text="slim" font="slim"></ascii-banner></div>

The built-in fonts draw every letter as a capital. A character the font doesn't have is left out.

### Use a font of your own

A font is an object with two fields. `height` is the number of rows. `glyphs` is a drawing of each character: write each row with `#` for a filled pixel and `.` for an empty one, then join the rows with `|`. Every row must be as wide as the first.

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

<div class="demo"><ascii-banner text="hi" options='{"font":{"height":3,"glyphs":{"H":"#.#|###|#.#","I":"###|.#.|###"," ":".."}}}'></ascii-banner></div>

A few rules for your own font:

- Text is turned into capitals first, so capital letters are enough.
- To draw lower case too, add `cased: true` and lower-case glyphs. Each case then draws its own glyph.
- Add a `" "` glyph if your text has spaces. It sets how wide a space is.

To add one character to a built-in font, copy its glyphs and add yours:

```ts
import { banner, fonts, type Font } from "ascii.rest/banner";

const withStar: Font = {
  height: 5,
  glyphs: { ...fonts.block.glyphs, "*": "..#..|#.#.#|.###.|#.#.#|..#.." },
};

banner("a*b", { font: withStar });
```

## Change the shadow

The shadow is a line along the bottom and right of each letter. It is the letters' outline, moved half a cell right and down. Pick its style with `shadow`. Here is each style, drawn narrow (`pixel: 1`) so all six fit:

<div class="demo" style="gap: 1rem"><ascii-banner text="double" pixel="1" effect="still"></ascii-banner><ascii-banner text="single" shadow="single" pixel="1" effect="still"></ascii-banner><ascii-banner text="heavy" shadow="heavy" pixel="1" effect="still"></ascii-banner><ascii-banner text="rounded" shadow="rounded" pixel="1" effect="still"></ascii-banner><ascii-banner text="ascii" shadow="ascii" pixel="1" effect="still"></ascii-banner><ascii-banner text="none" shadow="none" pixel="1" effect="still"></ascii-banner></div>

| `shadow` | the characters it draws with |
| --- | --- |
| `"double"`, the default | `═ ║ ╔ ╗ ╚ ╝` |
| `"single"` | `─ │ ┌ ┐ └ ┘` |
| `"heavy"` | `━ ┃ ┏ ┓ ┗ ┛` |
| `"rounded"` | `─ │ ╭ ╮ ╰ ╯` |
| `"ascii"` | `- \| +` |
| `"none"` | no shadow. The banner is one row shorter and one column narrower. |

```ts
import { banner } from "ascii.rest/banner";

banner("hello", { shadow: "rounded" });
banner("hello", { shadow: "none" });
```

### Draw the shadow with your own characters

Pass a string of 16 characters instead of a name. Each position in the string, counting from 0, is the character for one way the shadow's lines meet in a cell. A position is the sum of the directions the lines leave the cell: up is 1, down is 2, left is 4, right is 8.

A banner only draws seven of the 16 positions:

| position | lines leave the cell | `double` draws |
| --- | --- | --- |
| 0 | none: any empty cell | a space |
| 3 | up and down | `║` |
| 5 | up and left | `╝` |
| 6 | down and left | `╗` |
| 9 | up and right | `╚` |
| 10 | down and right | `╔` |
| 12 | left and right | `═` |

The other nine positions are never drawn, but the string still needs all 16 characters. Keep position 0 a space, or every empty cell shows that character.

The `double` style is `" ║║║═╝╗╣═╚╔╠═╩╦╬"`. Every built-in style is in `shadows`, so you can start from one. For a soft, shaded shadow, use a space and then one character 15 times:

```ts
import { banner, shadows } from "ascii.rest/banner";

banner("hi", { shadow: " " + "░".repeat(15) });

console.log(shadows.rounded); // " │││─╯╮┤─╰╭├─┴┬┼"
```

In `<ascii-banner>`, pass your own shadow in `options`. The tag trims spaces from the ends of its attributes, which would remove the first character:

```html
<ascii-banner text="hi" options='{"shadow":" ░░░░░░░░░░░░░░░"}'></ascii-banner>
```

<div class="demo"><ascii-banner text="hi" options='{"shadow":" ░░░░░░░░░░░░░░░"}'></ascii-banner></div>

## Draw the letters with another character

`fill` sets the one character the letters are drawn with. By default it is `▓` on a dark page, so the glint can look brighter than the letters, and `█` on a light page.

```ts
import { banner } from "ascii.rest/banner";

banner("hi", { fill: "#" });
banner("hi", { fill: { dark: "▒", light: "█" } });
```

<div class="demo" style="gap: 1rem"><ascii-banner text="hi" fill="#"></ascii-banner><ascii-banner text="hi" options='{"fill":{"dark":"▒","light":"█"}}'></ascii-banner></div>

A fill must be exactly one character. The banner decides whether the page is dark or light from its text colour, as [colours](#add-colour) explains.

## Add colour

With no colour, a banner is drawn like a [text piece](/docs/#browse-the-216-pieces): plain text in a `<pre>`, in your page's text colour, so your CSS styles it. Give it a colour and it is drawn like a coloured piece: on a `<canvas>`, in that colour.

`<Banner>` and `<ascii-banner>` pick the `<pre>` or the `<canvas>` for you. With `mount()`, you pass the element: on a `<canvas>` it shows its colours, and in a `<pre>` it draws everything in the pre's one colour.

```ts
import { banner } from "ascii.rest/banner";

// one colour
banner("one", { color: "#3fb950" });

// two or more fade from the first to the last, left to right
banner("fade", { color: ["#f97316", "#f778ba", "#ab7df8"] });

// one colour for a light page and one for a dark page
banner("themes", { color: { light: "#c2410c", dark: "#fb923c" } });

// the shadow's colour, one for each kind of page here too
banner("shadow", { color: "#f97316", shadowColor: { light: "#d0d7de", dark: "#30363d" } });
```

<div class="demo" style="gap: 1rem"><ascii-banner text="one" color="#3fb950"></ascii-banner><ascii-banner text="fade" color="#f97316,#f778ba,#ab7df8"></ascii-banner><ascii-banner text="themes" options='{"color":{"light":"#c2410c","dark":"#fb923c"}}'></ascii-banner><ascii-banner text="shadow" color="#f97316" options='{"shadowColor":{"light":"#d0d7de","dark":"#30363d"}}'></ascii-banner></div>

Some details:

- A colour is `#rrggbb`: a `#` and six hex digits. A name like `red` or a short form like `#f00` throws an error.
- A fade changes colour in up to 30 steps across the banner.
- `{ light, dark }` can hold a fade too: `{ light: ["#c2410c", "#be185d"], dark: ["#fb923c", "#f472b6"] }`.
- If you leave out `light` or `dark`, that page gets GitHub's text colour: `#1f2328` on light, `#f0f6fc` on dark.
- Without `shadowColor`, a coloured banner's shadow is a muted grey: `#59636e` on light, `#9198a1` on dark.
- A `shadowColor` on its own also makes a coloured banner. Its letters then take GitHub's text colours.
- `mono` on `<Banner>` and `<ascii-banner>` draws a coloured banner as plain text in one colour.

A coloured banner has one set of colours for light pages and one for dark pages. It picks by reading its own CSS `color`: dark text means a light page. A moving banner checks on every frame, so it follows your theme when the text colour changes.

## Change how it moves

`effect` picks the motion:

| `effect` | what it does |
| --- | --- |
| `"glint"`, the default | a glint sweeps across the letters every few seconds |
| `"type"` | the letters type in one at a time, then stay |
| `"still"` | no motion |

```ts
import { banner } from "ascii.rest/banner";

banner("glint");
banner("type", { effect: "type" });
banner("still", { effect: "still" });
```

<div class="demo" style="gap: 1rem"><ascii-banner text="glint"></ascii-banner><ascii-banner text="type" effect="type"></ascii-banner><ascii-banner text="still" effect="still"></ascii-banner></div>

On a page, a banner only moves while it is on screen, so a typed banner types in when it first comes into view. If the reader's system asks for reduced motion, the banner holds still: a glint banner shows no glint, and a typed banner shows every letter.

### Speed it up or slow it down

`speed` changes every timing at once. 2 is twice as fast, and 0.5 is half as fast.

```ts
import { banner } from "ascii.rest/banner";

banner("slow", { speed: 0.5 }); // a glint every 6.4 seconds
banner("fast", { speed: 2 }); // a glint every 1.6 seconds
```

<div class="demo" style="gap: 1rem"><ascii-banner text="slow" speed="0.5"></ascii-banner><ascii-banner text="fast" speed="2"></ascii-banner></div>

### Change the glint

`glint` sets when the glint crosses and how it looks. Times are in seconds at `speed` 1.

| option | what it does | default |
| --- | --- | --- |
| `first` | when the first glint starts | `0.5` |
| `sweep` | how long one glint takes to cross | `2.4` |
| `every` | the time from the start of one glint to the start of the next. Keep it longer than `sweep`, or each glint starts over before it is across | `3.2` |
| `width` | how wide it is, in columns | `2.4` |
| `slant` | how far it leans, in columns for each row | `1.2` |
| `chars` | one or two characters: the middle, then the edges. Or `{ dark, light }` | `"██"` on a dark page, `"▒▓"` on a light one |

```ts
import { banner } from "ascii.rest/banner";

// a quick glint, twice as often
banner("quick", { glint: { sweep: 1, every: 1.6 } });

// a thin glint in lighter shades
banner("thin", { glint: { width: 1.2, chars: "▒░" } });
```

<div class="demo" style="gap: 1rem"><ascii-banner text="quick" options='{"glint":{"sweep":1,"every":1.6}}'></ascii-banner><ascii-banner text="thin" options='{"glint":{"width":1.2,"chars":"▒░"}}'></ascii-banner></div>

### Change the typing speed

`type.step` is how long each letter takes to type in. The default is 2/15 of a second, about 0.133.

```ts
import { banner } from "ascii.rest/banner";

banner("hello", { effect: "type", type: { step: 0.08 } });
```

<div class="demo"><ascii-banner text="hello" effect="type" options='{"type":{"step":0.08}}'></ascii-banner></div>

## Set its size

A banner is as big as its text needs. These options change that. The numbers in the comments are what each one returns.

```ts
import { banner } from "ascii.rest/banner";

banner("hello").meta.cols; // 49 columns (and 6 rows)
banner("hello", { pixel: 1 }).meta.cols; // 29
banner("hello", { gap: 1 }).meta.cols; // 45
banner("hello", { pad: 1 }).meta.cols; // 51 (and 8 rows)
banner("hello", { pad: [1, 4] }).meta.cols; // 57 (and 8 rows)
banner("hello", { size: { cols: 80, rows: 10 } }).meta.cols; // 80 (and 10 rows)
banner("hello", { size: { cols: 20, rows: 4 } }).meta.cols; // 20, cropped
banner("hello", { max: 40 }).meta.cols; // 29
banner("hello", { max: 10 }).meta.cols; // 29, still wider than 10
```

What each one does:

- `pixel` is how many columns one pixel of the font takes. At 2, the default, pixels look square, because a character is about twice as tall as it is wide. 1 makes narrow letters.
- `gap` is the number of columns between letters.
- `pad` adds blank cells around the banner: one number for every side, or `[rows, columns]`.
- `max` is the most columns the banner should take, padding included. While the banner is wider than `max`, its pixels get narrower, one column at a time. At one column a pixel it can still be wider than `max`. To crop it to a width, use `size`.
- `size` gives the banner a fixed size and centres it inside. `pad` does not apply. If the banner doesn't fit, its pixels get narrower, one column at a time, until it fits with a blank column on each side. If it still doesn't fit at one column a pixel, it is cropped.

`pixel`, `gap`, `pad` and the numbers in `size` take whole numbers. `max` takes any number above 0.

Here is `"hello"` as it comes, with `pixel: 1`, and with `gap: 1`:

<div class="demo" style="gap: 1rem"><ascii-banner text="hello"></ascii-banner><ascii-banner text="hello" pixel="1"></ascii-banner><ascii-banner text="hello" gap="1"></ascii-banner></div>

These options set the banner's size in characters. On a page, a coloured banner's canvas fills the width of its container, and a banner with no colour is as big as its font size. Set either with CSS.

The [big text](/big-text/) piece is a banner at a fixed 66 by 8. It draws the same frames as `banner(text, { size: { cols: 66, rows: 8 } })`.

## Check what it can draw

`drawable(text, font)` returns the characters of `text` that a font can draw, in the case they came in. `banner()` leaves out the rest.

```ts
import { drawable } from "ascii.rest/banner";

drawable("héllo, wörld!"); // "hllo, wrld!"
drawable("hi", "slim"); // "hi"
```

A banner also tells you its size and what it drew:

```ts
import { banner } from "ascii.rest/banner";

const hi = banner("hi");
hi.meta.cols; // 13
hi.meta.rows; // 6
hi.text; // "hi": the characters it drew
```

It also has a `motion` field, which says how its motion runs. See [api](/docs/api/#bannerpiece-motion).

## Fix an error from banner()

`banner()` throws an error when it can't draw what you asked for. The message starts with `ascii.rest:` and says what to change.

```ts
import { banner } from "ascii.rest/banner";

try {
  banner("hi", { fill: "##" });
} catch (error) {
  console.log((error as Error).message); // ascii.rest: fill takes one character, not "##"
}
```

It throws unless each value is one it takes:

| what you pass | what it takes |
| --- | --- |
| the text | at least one character the font can draw. Spaces alone count as none. |
| `font` | `"block"`, `"slim"`, or a font of your own |
| `shadow` | `"double"`, `"single"`, `"heavy"`, `"rounded"`, `"ascii"`, `"none"`, or exactly 16 characters |
| `fill` | exactly one character |
| `glint.chars` | one or two characters |
| `effect` | `"glint"`, `"type"` or `"still"` |
| `color` | a colour as `#rrggbb`, or a list of one or more |
| `shadowColor` | a colour as `#rrggbb` |
| `gap` | a whole number, 0 or more |
| `pad` | a whole number, 0 or more, or `[rows, columns]` of two |
| `pixel` | a whole number, 1 or more |
| `size` | `{ cols, rows }`, both of them, each a whole number, 1 or more |
| `speed`, `max`, `type.step`, `glint.sweep`, `glint.every`, `glint.width` | a number above 0 |
| `glint.first`, `glint.slant` | a number |

Where an option also takes `{ light, dark }`, each of the two follows the same rule, and you can leave either one out. The characters of `fill`, `glint.chars` and `shadow` can't be control characters, such as a newline.

`<Banner>` in React and the `<ascii-banner>` tag don't throw. They draw nothing, and `console.warn` says why: `<Banner> could not draw: ...` or `<ascii-banner> could not draw: ...`. Astro's `<Banner>` calls `banner()` on the server, so it throws when the page renders.

## Next

- [github readme](/docs/readme/): put a banner at the top of your README.
- [svg](/docs/svg/): a banner with a tagline and a logo, as one SVG file.
- [terminal](/docs/terminal/): print a banner when your CLI starts.
