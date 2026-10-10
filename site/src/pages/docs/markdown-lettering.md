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
