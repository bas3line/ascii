---
layout: ../../layouts/Docs.astro
title: lettering
description: Markdown figures made of letters, drawn in ascii.rest's own banner fonts and built in as you scroll to them.
---

Figures made of letters, for the top of a README or a release post. Each one is an `ascii` fence, drawn in text: it builds in when you scroll to it, keeps moving while it is in view, and prints as the same text for a README. How fences work, and every place they play, is on [markdown figures](/docs/markdown/).

## headline

Words in ascii.rest's banner letters with their drop shadow, a glint passing over them, and a small line under them. For a README's top, or a release post's title.

```ascii headline
ascii.rest "animated ascii art for web pages"
```

Its columns drop in from the left, a glint crosses the letters and the small line types in, all in 1.2 seconds. Then the glint crosses again every 6 seconds while the figure is in view. The finished drawing, with no glint, is what a reader who asks for reduced motion sees, and what a README shows.

````md
```ascii headline
ascii.rest "animated ascii art for web pages"
```
````

Its plain text, for a README:

```text
 ██╗  ███╗ ███╗█╗█╗  ███╗ ████╗ ███╗█████╗
█╔═█╗█╔══╝█╔══╝█║█║  █╔═█╗█╔══╝█╔══╝╚═█╔═╝
████║╚██╗ █║   █║█║  ███╔╝███╗ ╚██╗   █║
█╔═█║ ╚═█╗█║   █║█║  █╔█║ █╔═╝  ╚═█╗  █║
█║ █║███╔╝╚███╗█║█║█╗█║╚█╗████╗███╔╝  █║
╚╝ ╚╝╚══╝  ╚══╝╚╝╚╝╚╝╚╝ ╚╝╚═══╝╚══╝   ╚╝

animated ascii art for web pages
```

The words written bare are the big line, in block letters: the letters A to Z, the digits 0 to 9, spaces, and `. , ! ? ' : - + = / _`. Lower case letters are drawn as capitals, except in the `mixed` font, and any other character stops the build with a message that names it. Words in quotes are the small line under them, wrapped if they are wider than the figure. There is no frame unless you ask for one.

| option | what it does | default |
| --- | --- | --- |
| `font` | The letters, from [banners](/docs/banners/): `block`, `slim`, `tall`, `bold`, `round`, `wide`, `mixed` or `italic`. | `block` |
| `shadow` | The drop shadow's lines: `double`, `single`, `heavy`, `rounded`, `ascii` or `none`. | `double` |
| `align` | Where the letters and the line sit in a `width` wider than they are: `left` or `center`. | `left` |

It takes [the options every figure takes](/docs/markdown/#options-every-figure-takes) too. In slim letters, centred in a frame of 40 columns with a title:

```ascii headline font=slim align=center width=40 frame=rounded title=release
v0.5 "markdown figures"
```

Its plain text:

```text
╭─ release ────────────────────────────╮
│            █╗█╗███╗  ███╗            │
│            █║█║█╔█║  █╔═╝            │
│            █║█║█║█║  ██╗             │
│            ╚█╔╝█║█║  ╚═█╗            │
│             █║ ███║█╗██╔╝            │
│             ╚╝ ╚══╝╚╝╚═╝             │
│                                      │
│           markdown figures           │
╰──────────────────────────────────────╯
```

Words too wide for the `width` stop the build with the width they need, and suggest `font=slim`, whose letters are narrower.

```ts
// headline.ts
import { headline } from "ascii.rest/markdown";

export default headline(`ascii.rest "animated ascii art for web pages"`);
```

Its plain text, as `plain()` prints it:

```text
 ██╗  ███╗ ███╗█╗█╗  ███╗ ████╗ ███╗█████╗
█╔═█╗█╔══╝█╔══╝█║█║  █╔═█╗█╔══╝█╔══╝╚═█╔═╝
████║╚██╗ █║   █║█║  ███╔╝███╗ ╚██╗   █║
█╔═█║ ╚═█╗█║   █║█║  █╔█║ █╔═╝  ╚═█╗  █║
█║ █║███╔╝╚███╗█║█║█╗█║╚█╗████╗███╔╝  █║
╚╝ ╚╝╚══╝  ╚══╝╚╝╚╝╚╝╚╝ ╚╝╚═══╝╚══╝   ╚╝

animated ascii art for web pages
```

As data, `headline({ words: "ascii.rest", line: "animated ascii art for web pages" })` draws the same. In React it is `<Headline>`, from `ascii.rest/markdown/react`.

## typing

A line that types itself behind a cursor, then erases its words in quotes and types the next, round and round: the tagline under a README's title that keeps changing its word.

```ascii typing
ascii.rest draws "scenes" "banners" "figures"
```

It types the line at 18 characters a second behind a `▌` cursor. Then, while it is in view, each word in quotes holds for 1.6 seconds while a glint crosses it and the cursor blinks, is erased, and the next one types. Its still is the line with its first word typed and no cursor.

````md
```ascii typing
ascii.rest draws "scenes" "banners" "figures"
```
````

Its plain text:

```text
ascii.rest draws scenes
```

Words written bare stay where they are. The words in quotes, side by side, take turns in the place they are written: at the start of the line, in its middle or at its end. It types one line, with up to 12 words in quotes, and has no frame unless you ask for one.

| option | what it does | default |
| --- | --- | --- |
| `hold` | Seconds each word stays typed before it is erased, 0.2 to 10. | `1.6` |
| `cursor` | The `▌` cursor, typing ahead of the words and blinking while they hold. | `true` |

The words in quotes first, with no cursor:

```ascii typing cursor=false
"fast" "small" "plain" by default
```

```text
fast by default
```

```ts
// tagline.ts
import { typing } from "ascii.rest/markdown";

export default typing({ before: "ascii.rest draws", turns: ["scenes", "banners", "figures"] });
```

In React it is `<Typing>`.

## flap

A split-flap sign, as a station's departures board is: every tile flips through its cards and clacks onto its letter. A release day's board in a changelog, a sign on a README.

```ascii flap
now boarding
v0.5 gate npm
```

Every tile starts blank and steps through its drum, a blank, A to Z, 0 to 9, then `. - : / ' ! ? &`, until it lands on its letter, the tiles starting left to right and row after row. A flipping tile is soft, and each one clacks down in the accent. The whole sign lands within 2.4 seconds, then holds.

````md
```ascii flap
now boarding
v0.5 gate npm
```
````

Its plain text:

```text
┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
│N│O│W│ │B│O│A│R│D│I│N│G│ │
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
│V│0│.│5│ │G│A│T│E│ │N│P│M│
└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
```

Each line is a row of the sign, up to 12 rows, drawn in capitals a tile a character, the shorter rows filled out with blank tiles. A tile carries A to Z, 0 to 9, a space and `. - : / ' ! ? &`, and any other character stops the build with a message that names it. The tiles' own grid is its frame, so it has no other unless you ask, and it has no options of its own. With a `width`, the board has as many tiles as the width holds, the rows at their left, as a board of a fixed size does:

```ascii flap frame=rounded title="release day" width=41
arrivals
```

```text
╭─ release day ─────────────────────────╮
│ ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐ │
│ │A│R│R│I│V│A│L│S│ │ │ │ │ │ │ │ │ │ │ │
│ └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘ │
╰───────────────────────────────────────╯
```

```ts
// board.ts
import { flap } from "ascii.rest/markdown";

export default flap({ rows: ["now boarding", "v0.5 gate npm"] });
```

In React it is `<Flap>`.

## marquee

A ticker: its items scroll past behind a window, a dot in the accent between each, round and round. The latest news at the top of a README, a banner across docs.

```ascii marquee
"markdown figures" "a fence in, a picture out" "npx ascii.rest add markdown"
```

The items slide in from the right in 0.8 seconds and come to rest. Then, while it is in view, they scroll left 8 cells a second, round and round. At rest it shows as many whole items as fit, from the first, so its plain text never cuts a word.

````md
```ascii marquee
"markdown figures" "a fence in, a picture out" "npx ascii.rest add markdown"
```
````

Its plain text:

```text
╭──────────────────────────────────────────────╮
│ markdown figures · a fence in, a picture out │
╰──────────────────────────────────────────────╯
```

Each item is in quotes, side by side or a line each, and a line with no quotes is one item, up to 24 items. It is 48 columns wide by default, in a rounded frame.

| option | what it does | default |
| --- | --- | --- |
| `sep` | The mark between two items, up to 3 characters, with a space each side. `sep=""` for the spaces alone. | `·` |

```ts
// news.ts
import { marquee } from "ascii.rest/markdown";

export default marquee({ items: ["markdown figures", "a fence in, a picture out"] });
```

In React it is `<Marquee>`.
