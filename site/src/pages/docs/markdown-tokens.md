---
layout: ../../layouts/Docs.astro
title: tokens
description: Markdown figures that stand for something, a QR code a phone reads, a text's fingerprint, a rubber stamp and a pass in banner letters, each seeded so it draws the same everywhere.
---

Figures that stand for something: a QR code, a fingerprint of a name, a rubber stamp, a pass. The QR code is a real one, encoded here, and the rest are seeded from their own words with the kit's `fnv1a32()`, so the same words always draw the same token, on a page, in an SVG and as plain text. How fences work, and every place they play, is on [markdown figures](/docs/markdown/).

## qr

A QR code from a text, drawn two modules a cell in half blocks so they stay square, with the text under it: scan to install, scan for the docs.

```ascii qr
https://ascii.rest
```

Its three finders grow, the rest resolves out of seeded noise and a scan line passes down it once. Then it holds. It is a real code, encoded here in byte mode, versions 1 to 10, with Reed-Solomon error correction and the mask with the lowest penalty, so a phone can read it off a page, an SVG in a README or a terminal.

````md
```ascii qr
https://ascii.rest
```
````

Its plain text:

```text
╭───────────────────────────────╮
│                               │
│   █▀▀▀▀▀█ ▀█▄ ▀█ ▀█ █▀▀▀▀▀█   │
│   █ ███ █ ▄█▀▄▀  ▄▀ █ ███ █   │
│   █ ▀▀▀ █ █  █▀ ▀▀█ █ ▀▀▀ █   │
│   ▀▀▀▀▀▀▀ █ █▄█▄▀▄▀ ▀▀▀▀▀▀▀   │
│   ▀ ▄ ▀ ▀▀▀▄ ▀██▄▄▄█▀▀██ ▄▀   │
│   █▀▀▀▀▄▀█  ▄▀▄ ▄▀█▀▄▀ ▀█▄    │
│   █▄█▀▀▀▀▄▄ ▀ ▄▀▀▄█▀▀▀▄▀▀█▀   │
│     ▀▀█▀▀█▄  █▀█▀▀▀▀▄██▀█▄    │
│   ▀▀▀ ▀ ▀ █ █ ▀█▄▀█▀▀▀█▀▀     │
│   █▀▀▀▀▀█ ▀▄  ▄ ▄▄█ ▀ █▄▄▄▄   │
│   █ ███ █ ▀▄ ▀▄▀▀▄▀███▀▀█▄█   │
│   █ ▀▀▀ █  ▄▀█▀█▀█ ██▄▄█▄█    │
│   ▀▀▀▀▀▀▀ ▀   ▀▀ ▀ ▀▀   ▀▀▀   │
│                               │
│      https://ascii.rest       │
╰───────────────────────────────╯
```

The body is the text to encode, on one line. A quiet zone of two modules goes round the code, in a rounded frame.

| option | what it does | default |
| --- | --- | --- |
| `level` | Error correction: `l`, `m`, `q` or `h`, surviving about 7%, 15%, 25% or 30% of the code lost. A higher level takes more modules. | `m` |
| `caption` | The text under the code. `false` for the code alone. | `true` |
| `invert` | Draws the light modules in ink instead of the dark ones, for a terminal or a page in light ink on a dark ground. | `false` |

```ts
// install.ts
import { qr } from "ascii.rest/markdown";

export default qr({ text: "npx ascii.rest add markdown" }, { caption: false });
```

`encodeQr(text, level)` gives the code's modules themselves. In React it is `<Qr>`.

## sigil

A fingerprint of a text, drawn as a bishop's random walk on a 17 by 9 field, the randomart OpenSSH shows for a key. The same text always walks the same path, so a project's mark, a key or a hash can be compared by eye.

```ascii sigil
bas3line
```

The bishop walks its 64 moves as it builds, each cell it lands on thickening. Then, every 6 seconds while it is in view, it walks them again over the finished field.

````md
```ascii sigil
bas3line
```
````

Its plain text:

```text
╭─ bas3line ────────╮
│                   │
│                   │
│                   │
│           o       │
│         S. o      │
│      . . .o .     │
│     E o =..o .    │
│        B.=O .     │
│        .OB+*      │
╰───────────────────╯
```

The body is the text, on one line. Each cell is marked by how often the bishop landed there, from ` .o+=*BOX@%&#/^`, with `S` where it started and `E` where it ended, and the text, cut to 15 characters, is its title. The walk is seeded with the kit's `fnv1a32()` and `mulberry32()`. It has no options of its own. In a double frame:

```ascii sigil frame=double
ascii.rest
```

```text
╔═ ascii.rest ══════╗
║     o .   o. o.   ║
║      = .  .+E..   ║
║       + .  oooo   ║
║      . +   ..*    ║
║     . . S . + .   ║
║      . o . o      ║
║         . .       ║
║                   ║
║                   ║
╚═══════════════════╝
```

```ts
// key.ts
import { sigil } from "ascii.rest/markdown";

export default sigil({ text: "SHA256:2c26b46b68ffc68ff99b453c1d304134" }, { title: "release key" });
```

In React it is `<Sigil>`.

## stamp

A rubber stamp that thuds onto the page: a word in banner's slim letters in a double border, with who and when under it. An issue's verdict, a changelog's "shipped".

```ascii stamp
approved
"by @bas3line on 2026-10-10"
```

Its shadow darkens in its place, it lands with a jolt, and its wear settles in. Then it holds. The wear, one letter cell in nine, is seeded by the word with the kit's `fnv1a32()`, so the same word always wears the same way.

````md
```ascii stamp
approved
"by @bas3line on 2026-10-10"
```
````

Its plain text:

```text
╔═════════════════════════════════╗
║  █  ██  ██  ██   █  █ █ ███ █▒  ║
║ █ █ █ █ █ █ █ █ ▒ █ █ █ ▒   █ █ ║
║ ███ █▒  ██  █▒  █ █ █ █ █▒  █ ▒ ║
║ █ █ █   █   █ █ █ █  █  █   █ █ ║
║ █ █ ▒   ▒   █ █  █   █  ███ ██  ║
║   by @bas3line on 2026-10-10    ║
╚═════════════════════════════════╝
```

Words written bare are the stamp's word, in the slim letters: A to Z, 0 to 9, a space and `. , ! ? ' : - + = / _`. Words in quotes are the small line under it. It is all one ink, the `tone` you give it, and no word means anything to it. It draws its own border, so it has no frame unless you ask for one.

| option | what it does | default |
| --- | --- | --- |
| `tone` | Its ink: `accent` (ascii.rest's orange, or your `color`), `good`, `warn`, `bad` or `violet`. | `accent` |

In green:

```ascii stamp tone=good
shipped
"v0.5, 2026-10-11"
```

```text
╔═════════════════════════════╗
║  ██ █ █ ███ ▒█  ██  ███ ██  ║
║ █   █ █  █  █ █ ▒ █ █   █ █ ║
║  █  █▒█  █  ██  ██  ██  █ █ ║
║   ▒ █ █  █  █   █   █   █ █ ║
║ ██  █ ▒ █▒█ █   █   ███ ██  ║
║      v0.5, 2026-10-11       ║
╚═════════════════════════════╝
```

```ts
// shipped.ts
import { stamp } from "ascii.rest/markdown";

export default stamp({ word: "shipped", line: "v0.5, 2026-10-11" }, { tone: "violet" });
```

In React it is `<Stamp>`.

## ticket

A pass for a release or an event: its two ends in banner's slim letters with a `>` flying between them, or one end for an admission, a line under them, a perforation, and a stub with the details and a barcode.

```ascii ticket
v0.4 v0.5 "markdown figures"
gate=npm seat=1A time=18:00
```

It prints out a row at a time, the `>` flies across, the line types and the bars draw in. Then it holds. The barcode's 11 bars come from the pass's own hash, with the kit's `fnv1a32()`, so the same pass always prints the same bars.

````md
```ascii ticket
v0.4 v0.5 "markdown figures"
gate=npm seat=1A time=18:00
```
````

Its plain text:

```text
╭─ boarding pass ─────────────────────────────╮
│ █ █ ███   █ █         █ █ ███   ███         │
│ █ █ █ █   █ █         █ █ █ █   █           │
│ █ █ █ █   ███    >    █ █ █ █   ██          │
│  █  █ █     █          █  █ █     █         │
│  █  ███ █   █          █  ███ █ ██          │
│ markdown figures                            │
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
│ gate npm  seat 1A  time 18:00   ▌▐▐▌▍▍█▍▌▐▍ │
╰─────────────────────────────────────────────╯
```

The first line is its ends, one word or two written bare, and a line in quotes. The stub's details are `key=value`, on the first line or the lines after it. Its title is "boarding pass" for two ends and "admit one" for one, and it has no options of its own. One end:

```ascii ticket
v1.0 "launch party"
where=online time=18:00
```

```text
╭─ admit one ────────────────────────────╮
│ █ █  █    ███                          │
│ █ █ ██    █ █                          │
│ █ █  █    █ █                          │
│  █   █    █ █                          │
│  █  ███ █ ███                          │
│ launch party                           │
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
│ where online  time 18:00   ▐▌▍█▐█▌▐██▌ │
╰────────────────────────────────────────╯
```

```ts
// pass.ts
import { ticket } from "ascii.rest/markdown";

export default ticket({ ends: ["v0.4", "v0.5"], line: "markdown figures", fields: { gate: "npm" } });
```

In React it is `<Ticket>`.
