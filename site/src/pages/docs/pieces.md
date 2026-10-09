---
layout: ../../layouts/Docs.astro
title: your own pieces
description: A piece is a module with its size and a function of time that returns text. Write one and it plays in every place the library's own do.
---

## The contract

A piece module exports `meta` and a default function. The function takes the piece's options and returns `frame(t, env)`, which returns the picture at `t` seconds: one string of exactly `rows` lines of `cols` characters.

```ts
// pieces/orbit.ts
import type { Frame, Meta } from "ascii.rest";

export const meta = {
  name: "orbit",
  category: "space",
  note: "a dot going round",
  cols: 21,
  rows: 9,
  fps: 30,
  options: { speed: 1 },
} satisfies Meta<{ speed: number }>;

export default function orbit({ speed = meta.options.speed } = {}): Frame {
  const { cols, rows } = meta;
  return (t) => {
    const x = Math.round(10 + 9 * Math.cos(t * speed));
    const y = Math.round(4 + 3.5 * Math.sin(t * speed));
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) line += c === x && r === y ? "●" : c === 10 && r === 4 ? "+" : " ";
      lines.push(line);
    }
    return lines.join("\n");
  };
}
```

That is all of it. It plays anywhere:

```tsx
import { Ascii } from "ascii.rest/react";
import * as orbit from "./pieces/orbit";

<Ascii piece={orbit} options={{ speed: 2 }} />
```

```ts
import { mount } from "ascii.rest";
import { svg } from "ascii.rest/svg";
import { play } from "ascii.rest/terminal";
import * as orbit from "./pieces/orbit";

mount(document.querySelector("pre")!, orbit);   // on a page
svg(orbit, { seconds: 2 * Math.PI });            // an SVG of one turn, a seamless loop
await play(orbit, { seconds: 5 });               // in a terminal, in Node
```

```html
<ascii-art src="/pieces/orbit.js"></ascii-art>
```

## meta

| field | |
| --- | --- |
| `name` | its name, lower case: `"newton's cradle"` |
| `category` | `scenes`, `ui`, `data`, `type`, `logos`, `companies`, `distros`, `shapes`, `space`, `physics`, `nature`, `creatures`, `objects`, `generative` or `effects` |
| `note` | one lower-case line, up to 72 characters, saying what you see |
| `cols`, `rows` | its size in cells; every frame is exactly this size |
| `fps` | frames a second; 0 for a still |
| `options` | the default of every option the function takes |
| `palette` | up to 64 colours as `#rrggbb`, for a piece in colour: see below |
| `ground` | the colour behind a coloured piece, for a scene |
| `cell` | a cell's height in widths on a canvas: 2, the shape of a character, or 1 for a square grid |
| `clock` | true when it reads the real time |
| `loop` | when it repeats exactly: its period in seconds, the loop an SVG of it plays |

## The frame's env

`frame(t, env)` gets `{ paper, color }`:

- **`paper`** is true when it is drawn dark on a light ground, so a shaded piece can flip its ramp: what reads as bright on a dark page is the lighter character on a light one.
- **`color`**, for a piece with a palette drawn in colour, is a `Uint8Array` of `cols * rows`: write each cell's palette index into it, row by row. The library's coloured pieces keep two halves in their palette, one for a light page and one for a dark one, and pick by `paper`.

## Keep it a function of time

The same `t` must give the same frame: seed any randomness, and read the date only with `clock: true`. That is what lets a piece be paused, sampled for an SVG, and checked. The library's own pieces go through `npm run check` in [the repo](https://github.com/bas3line/ascii), which plays each one and checks its size, its determinism and its frames, and [CONTRIBUTING](https://github.com/bas3line/ascii/blob/main/CONTRIBUTING.md) has the rest, to add yours to the library.

## Starting from one of ours

Every piece's source is on its page, and `npx ascii.rest add <name>` copies it into your project: [your own copy](/docs/copy/). Change its characters, its palette, its speed, and keep the contract.
