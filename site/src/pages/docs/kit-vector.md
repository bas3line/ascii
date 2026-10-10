---
layout: ../../layouts/Docs.astro
title: svg drawings
description: fromSvg() turns any SVG, from Figma, Illustrator or an icon set, into an ascii piece, and brings its parts to life by name.
---

`fromSvg()` turns SVG markup into a piece. Draw anything in Figma, Illustrator or Inkscape, or take an icon, export the SVG and pass the markup. It is drawn in its own colours, each cell the character whose shape best matches its edge. Then name its parts to set them moving.

```ts
// heart.ts
import { fromSvg } from "ascii.rest/kit";

const heart = `<svg viewBox="0 0 24 24">
  <path id="heart" fill="#e11d48" d="M12 21C12 21 2 14.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5C22 14.5 12 21 12 21z"/>
</svg>`;

export default fromSvg(heart, { name: "heart", width: 40, "#heart": "pulse" });
```

```text

      ._ppqqqq__        __ppqqqq_,
    _p88888888888q,   p88888888888q,
   q888888888888888,_888888888888888p
  \8888888888888888888888888888888888,
  d8888888888888888888888888888888888b
  d8888888888888888888888888888888888P
  |8888888888888888888888888888888888|
   8888888888888888888888888888888888
   '88888888888888888888888888888888'
    '888888888888888888888888888888'
      Y88888888888888888888888888P
       "888888888888888888888888"
         "88888888888888888888"
           "8888888888888888"
             "88888888888P"
               '"888888"'
                  "YP"

```

`"#heart"` names the path by its id, and `"pulse"` sets it beating. It reads the markup with no browser, so it works in Node too.

## Name a part

Any key of the options that starts with `#` or `.` names a part:

- `"#heart"`: the element with that id. A group's id moves the whole group.
- `".bubble"`: every element with that class, each about its own centre.
- `"#e11d48"`: every shape painted in that colour.
- `"*"`: the whole drawing.

`parseSvg(markup).parts` lists the names a drawing answers to. A name that matches nothing throws, and lists the ones it has.

## Motions

| motion | what it does | period |
| --- | --- | --- |
| `"spin"` | turns round | 4 s |
| `"flip"` | turns round its upright axis, like a coin | 4 s |
| `"bob"` | rises and falls `amount` rows (1) | 2 s |
| `"pulse"` | grows by `amount` (0.15) and back | 1.6 s |
| `"sway"` | leans each way from its bottom, like a plant | 4 s |
| `"blink"` | shuts for a fifth of a second, every `every` seconds (4) | |
| `"glint"` | a light crosses it, like the logos' glint, every `every` seconds (4) | |
| `"ripple"` | its top ripples like water | 2 s |
| `"rise"` | rises `amount` rows (4) and starts again, like a bubble | 4 s |
| `"trace"` | draws itself along its lines, as a pen would, then wipes away | 4 s |

Give a part a word, a list of words, or an object with more:

| field | what it does |
| --- | --- |
| `motion` | a word, a list, or a function of `t` giving its pose |
| `period`, `every`, `amount` | how long a loop takes, how often, how far |
| `origin` | what it turns about: `"center"`, `"bottom"`, a corner, or a point `[x, y]` in the SVG's units |
| `offset`, `stagger` | seconds added to its time, and between several matches |
| `material` | what fills it: `water()`, `glass()`, or any piece |
| `fill`, `char`, `color` | its solid character, one character for all its cells, its colour |
| `hide` | leave it out |

A line icon drawing itself, in the outline style, its `currentColor` made orange:

```ts
// cup-icon.ts
import { fromSvg } from "ascii.rest/kit";

const cup = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <path d="M8 2.5c-1 1.2 1 2.3 0 3.5M12 2.5c-1 1.2 1 2.3 0 3.5M16 2.5c-1 1.2 1 2.3 0 3.5"/>
  <path d="M4 9h14v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z"/>
  <path d="M18 11h1a3 3 0 0 1 0 6h-1.2"/>
</svg>`;

export default fromSvg(cup, { name: "coffee", style: "outline", color: "#f97316", "*": "trace" });
```

At 1 second it is halfway through drawing itself:

```text

            /        /
           |        |
            \       |\
            ||
            /|


   ________________________________
                                  |
                                  ____
                                  |   --_
                                  |      '\
                                  |       ||
                                  |        |
                                  |
                                  |
                                 /|
                                 /
                                /
```

## A motion of your own

A function of `t` gives a part's pose: moved `x` columns and `y` rows, turned `rotate` radians, grown `scale` times. Give it a `period` so the piece loops. A bouncing ball that squashes where it lands:

```ts
// ball.ts
import { fromSvg } from "ascii.rest/kit";

const scene = `<svg viewBox="0 0 40 30">
  <ellipse id="shadow" cx="20" cy="29.2" rx="9" ry="1" fill="#94a3b8"/>
  <circle id="ball" cx="20" cy="20" r="8" fill="#ef4444"/>
</svg>`;

const up = (t: number) => Math.abs(Math.sin((Math.PI * t) / 1.2));
const squash = (t: number) => 0.3 * Math.max(0, 1 - 5 * up(t));

export default fromSvg(scene, {
  name: "bouncing ball",
  "#ball": { motion: (t) => ({ y: -8 * up(t), scale: [1 + squash(t), 1 - squash(t)] }), origin: "bottom", period: 1.2 },
  "#shadow": { motion: (t) => ({ scale: 1 - 0.6 * up(t) }), period: 1.2 },
  still: 0.6,
});
```

## Fill a part with a material

A part's `material` fills it, so the water in a drawn glass can be real [water](/docs/kit-materials/):

```ts
// drawn-glass.ts
import { fromSvg, glass, water } from "ascii.rest/kit";

const markup = `<svg viewBox="0 0 40 48">
  <path id="water" fill="#38bdf8" d="M9.9 17h20.2l-2.1 24.5h-16z"/>
  <path id="cup" fill="#cbd5e1" d="M6 3h2.6l3.2 38.5h16.4L31.4 3H34l-3.6 41.2a2 2 0 0 1-2 1.8H11.6a2 2 0 0 1-2-1.8z"/>
</svg>`;

export default fromSvg(markup, { name: "drawn glass", width: 36, "#water": water(), "#cup": glass() });
```

Any piece can fill a part too, playing inside it: `"#screen": donut`. A part's `color`, like the drawing's, takes `#rrggbb` or a palette's name, `"#roof": { color: "lava" }`.

For a material of your own over SVG parts, `partCells(cover, cols, rows)` works a part's cells out from how much of each cell it covers, as the materials do an area's: which cells are in, its edge, which way is in there, and each cell's depth.

## Options

| option | what it does | default |
| --- | --- | --- |
| `width` | columns, the margin included. The rows follow from the drawing's shape. | `48` |
| `cols`, `rows` | a fixed size instead: the drawing is fitted and centred | none |
| `margin` | blank cells round it: a number, or `[columns, rows]` | `[2, 1]` |
| `fit` | `"ink"`: what it draws and the room its motions need. `"viewBox"`: as drawn. | `"ink"` |
| `style` | `"logo"`: characters by the edge. `"outline"`: only the edges, as lines. `"blocks"`: quarter blocks. `"braille"`: dots. | `"logo"` |
| `fill` | the solid character in the logo style | `"8"` |
| `color` | `true`: its own colours. `false`: the page's ink. `"#rrggbb"`: the colour its `currentColor` takes. | `true` |
| `line` | the thinnest a stroke is drawn, in columns | `0.4` |
| `name`, `note`, `category` | its name, its line, its category | its `<title>`, the name, `"shapes"` |
| `fps`, `still`, `ground` | as a piece's | 30 when it moves, else 0 |

Text, images and markers in the SVG are left out, and `parseSvg(markup).skipped` names the ones it found. Masks, clip paths and filters are not applied, and a gradient is drawn as the mean of its colours.

An SVG that expands past 50,000 elements, 20,000 shapes or 200,000 line segments, as nested `<use>` elements can, throws at once rather than hanging: simplify it, or flatten its `<use>` elements first.

## drawSvg(): a drawing in your own piece

`drawSvg(s, svg, t, options?)` draws an SVG into a grid you are drawing already, fitted into a `region`. `svgPalette(svg, options)` gives the piece the drawing's colours. Read the markup once with `parseSvg()`:

```ts
// badge.ts
import { drawSvg, parseSvg, piece, svgPalette } from "ascii.rest/kit";

const heart = parseSvg(`<svg viewBox="0 0 24 24"><path id="heart" fill="#e11d48" d="M12 21C12 21 2 14.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5C22 14.5 12 21 12 21z"/></svg>`);
const beat = { "#heart": "pulse" } as const;

export default piece({ name: "badge", cols: 40, rows: 10, loop: 1.6, palette: svgPalette(heart, beat) }, (t, s) => {
  drawSvg(s, heart, t, { ...beat, region: { x: 0, y: 0, cols: 20, rows: 10 } });
  s.write(22, 4, "made with love");
});
```

```text
  __pqq_    _pqq__
.p8888888__8888888q,
d888888888888888888b
d888888888888888888P
"888888888888888888"  made with love
 "8888888888888888"
  "8888888888888P"
    "8888888888"
      "O8888P"
         ""
```

## Next

- [materials](/docs/kit-materials/): every material a part can be filled with.
- [images](/docs/kit-image/): a PNG or JPG in place of an SVG.
