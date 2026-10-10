---
layout: ../../layouts/Docs.astro
title: drawing
description: Draw on a piece's grid with text, lines, boxes, circles, polygons, stamps, braille plots and pixel art, with no maths.
---

The drawing functions draw on the grid a [piece()](/docs/kit/#piece-draw-your-own) hands you. Each takes the grid first, then where, then an options object. Placing needs no geometry: a clock's hands point a fraction of the way round, a box hands back its inside to draw in, and a plot scales itself. What changes with time is your own arithmetic on `t`, as here, where `Math.floor(t) % 3` is which second of three it is.

```ts
// status.ts
import { piece, rect, text } from "ascii.rest/kit";

export default piece({ name: "status", cols: 36, rows: 7, loop: 3 }, (t, s) => {
  const inside = rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "build" });
  text(s, inside, `step ${1 + (Math.floor(t) % 3)} of 3`, { align: "center", valign: "middle" });
});
```

```text
╭─ build ──────────────────────────╮
│                                  │
│                                  │
│           step 2 of 3            │
│                                  │
│                                  │
╰──────────────────────────────────╯
```

## Text

| function | what it draws |
| --- | --- |
| `text(s, x, y, str, o?)` | text in a box from `x, y`: aligned, wrapped, placed down the box. Returns the region its lines take. |
| `text(s, region, str, o?)` | the same, in a region: the inside `rect()` returns, say |
| `label(s, x, y, str, o?)` | text centred on a point: a number on a dial, a name by a dot |

`text()`'s options:

| option | what it does | default |
| --- | --- | --- |
| `color` | an index into the palette, or `#rrggbb` | the ink |
| `align` | `"left"`, `"center"` or `"right"` across the box | `"left"` |
| `width` | the box's width: lines longer than it wrap | the rest of the row |
| `wrap` | wrap at spaces | `true` when there is a `width` |
| `valign` | `"top"`, `"middle"` or `"bottom"` down the box | `"top"` |
| `height` | the box's height | the rest of the grid |
| `transparent` | spaces leave what is under them | `false` |

`text()` centres each line on its own. To centre a block of ascii art whose lines must stay lined up, use `stamp()` with `align: "center"`.

## Lines and boxes

| function | what it draws |
| --- | --- |
| `line(s, x0, y0, x1, y1, o?)` | a straight line, one cell thick, both ends drawn |
| `polyline(s, points, o?)` | lines through `[x, y]` points in turn; `closed: true` joins the last to the first |
| `ray(s, x, y, length, turn, o?)` | a line from a point, `turn` of the way round, like a clock's hand |
| `rect(s, x, y, w, h, o?)` | a box: a border, a fill, a title. Returns the region inside the border. |

A line's `char` is `"auto"` by default: it picks `-`, `|`, `/`, `\` and runs of `_` by the slope as it goes. Or give one character as a brush, or `""` to clear. With `style` it is a box's line instead, and it joins the lines it meets with `┼`, `├` and the rest.

`rect()`'s `style` is `"single"`, `"double"`, `"rounded"`, `"heavy"`, `"ascii"`, `"none"`, or 6 characters of your own: top left, top right, bottom left, bottom right, across, down. `boxes` holds the named ones, `boxes.rounded` being `"╭╮╰╯─│"`. `fill` fills the inside, and `title` sits on the top edge. Two boxes sharing an edge join with `┬` and `┴`.

## Circles and shapes

| function | what it draws |
| --- | --- |
| `circle(s, cx, cy, r, o?)` | a circle that looks round: `r` is in columns, and rows are scaled to the cell's shape |
| `ellipse(s, cx, cy, rx, ry, o?)` | an ellipse, `rx` columns and `ry` rows from its centre |
| `arc(s, cx, cy, r, from, to, o?)` | part of a circle, clockwise from `from` to `to` of the way round. With `fill`, a slice of pie. |
| `polygon(s, points, o?)` | a closed shape through points. With `fill`, its inside, so a star's middle stays empty. |
| `around(s, cx, cy, r, turn)` | the point `turn` of the way round a circle, as `[x, y]`, to draw at |

Their options: `char` for the outline (`"*"`, or `"auto"` for slope characters), `fill` for the inside, `color` and `fillColor`.

Angles in the drawing functions are **turns**, as a clock's hand goes: 0 is the top, 0.25 the right, 0.5 the bottom. `phase(t, 60)` goes round once a minute. To place things round a circle with no angles at all, `ring(s, 12)` gives twelve points from the top, clockwise, and `at(s)` the middle. A whole clock is one call, `clockFace()`, on [widgets](/docs/kit-widgets/); this is the same drawn by hand:

```ts
// clock.ts
import { at, circle, label, phase, piece, ray, rect, ring } from "ascii.rest/kit";

const palette = { light: ["#1f2328", "#cf222e", "#8c959f"], dark: ["#f0f6fc", "#ff7b72", "#6e7681"] };

export default piece({ name: "clock", cols: 41, rows: 21, fps: 4, loop: 60, palette }, (t, s) => {
  const [x, y] = at(s);
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "clock", color: 2 });
  circle(s, x, y, 18, { char: "auto", color: 2 });
  ring(s, 12, { radius: 15 }).forEach((point, hour) => label(s, ...point, hour || 12));
  ray(s, x, y, 7, 10 / 12); // the hour hand, at ten
  ray(s, x, y, 11, 2 / 12); // the minute hand, ten past
  ray(s, x, y, 13, phase(t, 60), { color: 1 });
  s.set(x, y, "o", 1);
});
```

```text
╭─ clock ───────────────────────────────╮
│              ___________              │
│          ___/           \___          │
│       __/         12        \__       │
│     _/    11       |     1     \_     │
│    /               |             \    │
│   /  10            |           2  \   │
│  |                 |       __      |  │
│ |           __    |    ___/         | │
│ |             \__ | __/             | │
│ |  9             \o/             3  | │
│ |                                   | │
│ |                                   | │
│  |                                 |  │
│   \  8                         4  /   │
│    \                             /    │
│     \_     7             5     _/     │
│       \__         6         __/       │
│          \___           ___/          │
│              \_________/              │
╰───────────────────────────────────────╯
```

## Stamps

`stamp(s, art, x, y, o?)` lays a block of text, or another grid, over this one. Its spaces let what is under it show. With `align: "center"` and `valign: "middle"`, `x, y` is its middle. A template literal that starts with a line break has that line and the shared indent left out, so you can write art indented in your code:

```ts
// cat.ts
import { at, piece, stamp } from "ascii.rest/kit";

const cat = `
   /\\_/\\
  ( o.o )
   > ^ <`;

export default piece({ name: "cat", cols: 20, rows: 5, fps: 0 }, (t, s) => {
  stamp(s, cat, ...at(s), { align: "center", valign: "middle" });
});
```

## Braille: smooth lines and plots

`braille(s, region?)` is a canvas of 2 by 4 dots a cell, drawn with the braille characters. Lines and curves on it are far smoother than whole characters. Draw on it, then call `draw()`:

```ts
// wave.ts
import { braille, piece } from "ascii.rest/kit";

export default piece({ name: "wave", cols: 40, rows: 8, loop: 2 }, (t, s) => {
  const b = braille(s);
  b.plot((x) => Math.sin(x + Math.PI * t));
  b.draw();
});
```

```text
                         ⢀⡠⠒⠊⠉⠉⠑⠢⢄
                       ⢀⠔⠁        ⠉⠢⡀
                     ⢀⠔⠁            ⠈⢢
⡀                   ⡠⠃                ⠑⢄
⠘⢄                ⢀⠎
  ⠱⡀            ⢀⠔⠁
   ⠈⠢⣀        ⢀⠔⠁
      ⠑⠢⢄⣀⣀⡠⠤⠊⠁
```

A braille canvas has `set`, `unset`, `toggle`, `get`, `line`, `ray`, `circle`, `arc`, `rect`, `plot` and `clear`, in dots from its top left. `b.width` and `b.height` are its size in dots.

`plot()` takes a function, `y = f(x)` for `x` from `x0` to `x1` (0 to `TAU`), or a list of numbers, scaled to fit. `fill: true` fills under it, for an area chart. For a chart in one call, `sparkline([3, 5, 2, 8])` and `gauge({ label: "cpu" })` are on [widgets](/docs/kit-widgets/). This dashboard draws its own, a dial beside a plot of the last 8 seconds of a reading:

```ts
// gauge.ts
import { TAU, arc, braille, label, line, piece, rect } from "ascii.rest/kit";

const palette = { light: ["#1f2328", "#1a7f37", "#8c959f"], dark: ["#f0f6fc", "#3fb950", "#6e7681"] };
const load = (t: number) => 0.55 + 0.3 * Math.sin((TAU * t) / 8) + 0.12 * Math.sin((TAU * t) / 2);

export default piece({ name: "gauge", cols: 60, rows: 13, fps: 24, loop: 8, palette }, (t, s) => {
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "cpu", color: 2 });
  line(s, 23, 0, 23, s.rows - 1, { style: "single", color: 2 });
  const k = load(t);
  arc(s, 11.5, 7, 9, -0.375, 0.375, { char: "░", color: 2 });
  arc(s, 11.5, 7, 9, -0.375, -0.375 + 0.75 * k, { char: "█", color: 1 });
  label(s, 11.5, 6.5, `${Math.round(k * 100)}%`);
  const b = braille(s, { x: 24, y: 1, cols: 35, rows: 11 });
  b.plot(load, { x0: t - 8, x1: t, y0: 0, y1: 1, color: 1 });
  b.draw();
});
```

```text
╭─ cpu ────────────────┬───────────────────────────────────╮
│                      │     ⢀⠤⡀                           │
│      █████████       │    ⢠⠃ ⠘⡄                          │
│    ██         ██     │⢄  ⡰⠁   ⠱⡀                      ⡔⠑⠢│
│  ██             ██   │ ⠑⠊      ⢣                     ⡜   │
│  █               █   │          ⢣  ⣀⠤⡀              ⡰⠁   │
│ █       76%       ░  │           ⠉⠉  ⠈⢆            ⢠⠃    │
│ █                 ░  │                ⠘⡄     ⡠⠤⡀   ⡎     │
│  █               ░   │                 ⠱⡀   ⡰⠁ ⠈⠢⠤⠜      │
│  ██             ░░   │                  ⠱⡀ ⡜             │
│                      │                   ⠉⠉              │
│                      │                                   │
╰──────────────────────┴───────────────────────────────────╯
```

## Pixels: pixel art

`pixels(s, region?)` is a canvas of two square pixels a cell, drawn as `▀`, `▄` and `█` in colour. `sprite()` draws pixel art written as text, a character a pixel: `.` is clear, and each other character takes its colour from a map. Draw a sprite's frames side by side and pick one with `frame`; `wrap` walks it off one edge and back on at the other:

```ts
// walker.ts
import { piece, pixels } from "ascii.rest/kit";

// grass, sun, hair, skin, shirt, legs
const palette = {
  light: ["#2da44e", "#d29922", "#7d4e24", "#e0a370", "#2f81f7", "#6e7781"],
  dark: ["#3fb950", "#e3b341", "#c48a52", "#f0b88a", "#58a6ff", "#8b949e"],
};

const walker = `
  ..hhhh....hhhh..
  .hhhhhh..hhhhhh.
  .ssssss..ssssss.
  .s.ss.s..s.ss.s.
  ..ssss....ssss..
  ...ss......ss...
  .bbbbbb..bbbbbb.
  bbbbbbbbbbbbbbbb
  s.bbbb.ss.bbbb.s
  ..bbbb....bbbb..
  ..p..p.....pp...
  .p....p....pp...`;

export default piece({ name: "walker", cols: 48, rows: 12, loop: 4, palette }, (t, s) => {
  const p = pixels(s);
  p.circle(40, 6, 3, { fill: true, color: 1 });
  p.rect(0, 22, 48, 2, { fill: true, color: 0 });
  p.sprite(walker, { h: 2, s: 3, b: 4, p: 5 }, t * 12, 10, { frames: 2, frame: t * 4, wrap: true });
  p.draw();
});
```

A pixel canvas has `set`, `unset`, `get`, `line`, `ray`, `rect`, `circle`, `arc`, `sprite` and `clear`. A cell holds one colour, so where its two pixels differ it is a full block in the upper one's colour.

## Next

- [fields](/docs/kit-field/): `drawField()` shades a formula into a region, beside your drawing.
- [layouts](/docs/kit-compose/): put several pieces in boxes, side by side.
