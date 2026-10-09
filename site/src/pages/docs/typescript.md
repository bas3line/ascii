---
layout: ../../layouts/Docs.astro
title: typescript
description: mount() plays any piece in any element, with no framework. Everything is typed.
---

## mount

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector("pre")!, donut, { fps: 12 });
// later
stop();
```

`mount(element, piece, options?)` plays a piece in a `<pre>` as text in its colour, or on a `<canvas>` in the piece's colours, and returns a function that stops it.

| option | |
| --- | --- |
| any option of the piece | `{ text: "hello" }` for big text, `{ shine: 3 }` for a logo; `piece.meta.options` has the defaults |
| `fps` | its frame rate, instead of `piece.meta.fps` |
| `motion` | `true` plays it even for a reader who prefers reduced motion. Only for a page with its own play control |

It plays only while the element is on screen and the tab is open, and keeps the first frame for a reader who prefers reduced motion. On a canvas it fills the canvas's width, each cell `meta.cell` widths tall, and redraws only the cells that changed.

`piece` can also be a piece's default function alone, `(options) => (t) => string`, for a picture you draw yourself with no `meta`: it plays at 30 frames a second, on an 80 by 24 grid.

## Loading pieces by name

```ts
import { canvas, isPiece, load, names } from "ascii.rest";

names;                                  // every piece's name, as a typed list
isPiece("donut");                       // true, and narrows the string to PieceName
const nightCoast = await load["night-coast"]();
canvas.has("night-coast");              // true: it draws on a canvas, so give it one
```

`load` holds a function for each piece that imports it on demand, so a bundler splits each piece into its own chunk.

## A frame by hand

A piece is a pure function of time. Call it to get its picture at any moment, as text:

```ts
import { bigText, donut } from "ascii.rest/pieces";

const frame = donut.default();
const text = frame(1.5, { paper: false });          // the picture at 1.5 seconds
const hello = bigText.default({ text: "hello" })(0); // a piece with options takes them here
```

`paper: true` asks for a frame drawn for a light ground, so shaded pieces flip their ramp. For a coloured piece, pass `color: new Uint8Array(cols * rows)` and the frame writes each cell's palette index into it.

## Types

```ts
import type { Category, Env, Frame, Meta, Options, Piece, PieceName } from "ascii.rest";
import type { BannerOptions, BannerPiece, Font } from "ascii.rest/banner";
import type { SvgOptions, BannerSvgOptions } from "ascii.rest/svg";
```

Each is described on [api](/docs/api/), and the contract they make up on [your own pieces](/docs/pieces/).
