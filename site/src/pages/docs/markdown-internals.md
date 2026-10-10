---
layout: ../../layouts/Docs.astro
title: inside a system
description: Markdown components of what is inside a program or a machine, a flame graph, a bit layout, a chip's pinout and an ER diagram, each read from the notation its field already writes.
---

Components of what is inside a program or a machine: a profile, a binary layout, a chip's pins, a data model. Each reads the notation its field already writes, a profiler's folded stacks, a datasheet's bit mask, a pin list and relational notation, so you can paste what you have. How fences work, and every place they play, is on [markdown components](/docs/markdown/).

## flame

A profile as a flame graph, read from Brendan Gregg's folded stacks, the lines `stackcollapse-perf.pl` and the tools like it print: an issue about a slow render, a profile in docs.

```ascii flame title="render, 48 ms" unit=ms
main;parse;lex 4
main;parse 6
main;draw;layout 12
main;draw;paint 18
main;draw 4
main;flush 4
```

It builds from the root up, each level's blocks widening from their left edges, then holds.

````md
```ascii flame title="render, 48 ms" unit=ms
main;parse;lex 4
main;parse 6
main;draw;layout 12
main;draw;paint 18
main;draw 4
main;flush 4
```
````

Its plain text:

```text
╭─ render, 48 ms ──────────────────────────────╮
│ [layout   ][paint          ]       [le]      │
│ [draw                         ][fl][parse  ] │
│ [main                                      ] │
╰───────────────────────── paint, 18 of 48 ms ─╯
```

A line is a stack, its frames from the root joined by `;`, then the samples it was seen in: `main;draw;paint 18`. The same stack twice adds up. Each frame is a block as wide as its samples, its callees stacked on top of it and the root at the bottom; siblings sit in name order, as `flamegraph.pl` draws them, so left to right is not time. A frame narrower than 3 columns is left out. The hottest leaf, the frame with no callees that spent the most samples itself, is marked and named on the bottom edge with its share. It is 48 columns wide by default.

| option | what it does | default |
| --- | --- | --- |
| `unit` | What a sample is, for the bottom edge and the sentence a screen reader reads: `samples`, `ms`, `us` or any word. | `samples` |

```ts
// profile.ts
import { flame } from "ascii.rest/markdown";

export default flame(
  {
    stacks: [
      { frames: ["main", "draw", "paint"], samples: 18 },
      { frames: ["main", "flush"], samples: 4 },
    ],
  },
  { unit: "ms" },
);
```

In React it is `<Flame>`.

## bits

A binary layout, named fields on a bit ruler, drawn from a bit mask the way register datasheets write one: a packet header, a file format, a register.

```ascii bits title="ipv4 header"
vvvviiiiddddddee
llllllllllllllll
v=version i=ihl d=dscp e=ecn l=length
```

The ruler counts in, then each field's walls drop in and its name types, in order. Then it holds.

````md
```ascii bits title="ipv4 header"
vvvviiiiddddddee
llllllllllllllll
v=version i=ihl d=dscp e=ecn l=length
```
````

Its plain text:

```text
╭─ ipv4 header ─────────────────────╮
│  0                   1            │
│  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5  │
│ ┌───────┬───────┬───────────┬───┐ │
│ │version│  ihl  │   dscp    │ecn│ │
│ ├───────┴───────┴───────────┴───┤ │
│ │            length             │ │
│ └───────────────────────────────┘ │
╰─────────────── 5 fields, 32 bits ─╯
```

The mask is a letter a bit, a field a run of one letter, in rows of 8, 16 or 32 bits that are all the same length; `.` is an unused bit, drawn dotted. Then `key=value` lines name each letter. A bit is two columns, numbered from 0 at the left as RFC diagrams number them. A field that runs on into the next row is one cell across both where they meet, and a name too long for its field shows the field's letter, named in a key under the layout. It has no options of its own. One byte:

```ascii bits
vvvviiii
v=version i=ihl
```

```text
╭────────────────────╮
│  0 1 2 3 4 5 6 7   │
│ ┌───────┬───────┐  │
│ │version│  ihl  │  │
│ └───────┴───────┘  │
╰─ 2 fields, 8 bits ─╯
```

```ts
// header.ts
import { bits } from "ascii.rest/markdown";

export default bits({ rows: ["vvvviiii"], names: { v: "version", i: "ihl" } });
```

In React it is `<Bits>`.

## pinout

A chip and what each of its pins does, numbered the DIP way, down the left from 1 and back up the right, with pin 1's dot inside the body: a hardware README, a board's docs.

```ascii pinout title=ne555 pulse=out
gnd vcc
trig dis
out thr
reset ctrl
```

The body draws, then the pins grow out in number order, their names typing. The pin named by `pulse` has a live wire and a marked name, and a pulse runs out along it every 1.2 seconds while it is in view.

````md
```ascii pinout title=ne555 pulse=out
gnd vcc
trig dis
out thr
reset ctrl
```
````

Its plain text:

```text
╭─ ne555 ──────────────────╮
│         ╭───────╮        │
│   gnd ──┤1 ●   8├── vcc  │
│  trig ──┤2     7├── dis  │
│   out ━━┤3     6├── thr  │
│ reset ──┤4     5├── ctrl │
│         ╰───────╯        │
╰───────────────── 8 pins ─╯
```

A line is a row of the chip, its left pin and then its right pin, `-` where there is none. A name is up to 24 characters, in quotes if it has spaces.

| option | what it does | default |
| --- | --- | --- |
| `pulse` | A pin, by its name or its number, whose wire is live, a pulse running out along it. | none |

A UART header, its transmit pin live:

```ascii pinout title=uart pulse=tx
vcc gnd
rx tx
```

```text
╭─ uart ────────────────╮
│       ╭───────╮       │
│ vcc ──┤1 ●   4├── gnd │
│  rx ──┤2     3├━━ tx  │
│       ╰───────╯       │
╰────────────── 4 pins ─╯
```

```ts
// chip.ts
import { pinout } from "ascii.rest/markdown";

export default pinout({ rows: [["gnd", "vcc"], ["trig", null]] });
```

In React it is `<Pinout>`.

## schema

Tables and the references between them as an ER diagram, written in textbook relational notation: a data model in docs, an agent's plan.

```ascii schema title=blog
users(id*, name, email)
posts(id*, user_id, title)
ref posts.user_id users.id
```

The tables draw in, their columns typing, then each reference rides in. Then it holds.

````md
```ascii schema title=blog
users(id*, name, email)
posts(id*, user_id, title)
ref posts.user_id users.id
```
````

Its plain text:

```text
╭─ blog ────────────────────────╮
│ ╭─ users ─╮                   │
│ │ id*     ├┼──╮               │
│ │ name    │   │   ╭─ posts ─╮ │
│ │ email   │   │   │ id*     │ │
│ ╰─────────╯   ╰─o<┤ user_id │ │
│                   │ title   │ │
│                   ╰─────────╯ │
╰─────── 2 tables, 1 reference ─╯
```

A line is a table, `users(id*, name, email)`, a key column ending in `*`; then a `ref` line for each reference, `ref posts.user_id users.id`, the column that holds it and then the column it points at. A table sits one column right of the deepest table it references and lower than it, so the diagram reads down and to the right from the tables everything points at. A reference leaves the column it points at with a bar, one, and enters the column that holds it with a crow's foot, `o<`, zero or many; one from a table to itself loops off its right wall. A circle of references can't be placed, and the build says so. It has no options of its own. Four tables:

```ascii schema
users(id*, name)
posts(id*, user_id, title)
tags(id*, name)
post_tags(post_id, tag_id)
ref posts.user_id users.id
ref post_tags.post_id posts.id
ref post_tags.tag_id tags.id
```

```text
╭───────────────────────────────────────────────────────╮
│ ╭─ users ─╮                                           │
│ │ id*     ├┼────╮                                     │
│ │ name    │     │   ╭─ posts ─╮                       │
│ ╰─────────╯     │   │ id*     ├┼──╮                   │
│                 ╰─o<┤ user_id │   │                   │
│ ╭─ tags ─╮          │ title   │   │                   │
│ │ id*    ├┼───╮     ╰─────────╯   │                   │
│ │ name   │    │                   │   ╭─ post_tags ─╮ │
│ ╰────────╯    │                   ╰─o<┤ post_id     │ │
│               ╰─────────────────────o<┤ tag_id      │ │
│                                       ╰─────────────╯ │
╰────────────────────────────── 4 tables, 3 references ─╯
```

```ts
// model.ts
import { schema } from "ascii.rest/markdown";

export default schema({
  tables: [
    { name: "users", columns: ["id*", "name"] },
    { name: "posts", columns: ["id*", "user_id"] },
  ],
  refs: [{ from: "posts.user_id", to: "users.id" }],
});
```

In React it is `<Schema>`.
