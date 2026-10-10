---
layout: ../../layouts/Docs.astro
title: widgets
description: Whole things in one call, a clock face, a progress bar, a spinner, a gauge, a chart, a card, a countdown, and placing things by words.
---

A **widget** is a whole thing in one call, with defaults that look right: `clockFace()`, `progressBar({ label: "downloading" })`, `barChart({ mon: 3, tue: 5 })`. Each is a normal piece, in GitHub's colours for a light page and a dark one, so it plays wherever a piece does and sits in a layout with others.

```ts
// bars.ts
import { barChart } from "ascii.rest/kit";

export default barChart({ mon: 3, tue: 5, wed: 4, thu: 8, fri: 6 });
```

The bars grow in one after another, hold, and grow again. Grown:

```text
                8
               ███
               ███   6
      5        ███  ▄▄▄
     ▂▂▂       ███  ███
     ███   4   ███  ███
 3   ███  ███  ███  ███
▆▆▆  ███  ███  ███  ███
███  ███  ███  ███  ███
███  ███  ███  ███  ███
███  ███  ███  ███  ███
mon  tue  wed  thu  fri
```

## Every widget

Every widget takes `color`, as `#rrggbb`, `{ light, dark }` or a palette's name such as `"ocean"`, and `name` and `note`.

| widget | what it is | its options | one line |
| --- | --- | --- | --- |
| `clockFace()` | a round dial, its hours numbered, three hands, a second hand going round once a minute | `time`: `"10:10"`; `real`: the viewer's own time; `size`: `"small"`, `"medium"`, `"large"`; `numbers`: `"all"`, `"quarters"`, `"none"`; `frame`, `title` | `clockFace({ title: "clock" })` |
| `progressBar()` | a label, a bar and how far along. With no `value` it fills, turns green and fills again. | `value`: 0 to 1; `label`, `width`; `style`: `"blocks"`, `"ascii"`, `"dots"`; `percent`, `seconds` | `progressBar({ label: "downloading" })` |
| `spinner(kind)` | the kind a terminal shows while it works | kinds: `"dots"`, `"line"`, `"arc"`, `"circle"`, `"bounce"`, `"blocks"`, `"grow"`, `"arrows"`, `"pulse"`; `label`, `speed` | `spinner("dots", { label: "installing" })` |
| `gauge()` | a dial three quarters round, green, yellow or red by its reading. With no `value` it wanders. | `value`, `label`, `min`, `max`, `unit` | `gauge({ label: "cpu" })` |
| `sparkline(data?)` | a small smooth line chart in braille, its latest number after it. With no numbers it is a live reading. | `label`, `width`, `height`, `fill` | `sparkline([3, 5, 2, 8, 6, 9], { label: "visits" })` |
| `barChart(data)` | a bar for each value, each its own colour, growing in | `horizontal`, `size`, `max`, `values`, `seconds`, `hold` | `barChart({ rust: 42, go: 31 }, { horizontal: true })` |
| `panel(thing?)` | a box with a title round anything, or an empty one of a size | `title`; `style`: `"rounded"`, `"single"`, `"double"`, `"heavy"`, `"ascii"`; `cols`, `rows` | `panel("hello", { title: "note" })` |
| `card()` | a heading, a line under it, words wrapped to its width and a quiet footer | `title`, `text`, `footer`, `width`, `style` | `card({ title: "hi", text: "a card" })` |
| `typewriter(words)` | words typed out behind a cursor, held, and typed again | `speed`, `width`, `cursor`, `hold` | `typewriter("Hello there.")` |
| `marquee(words)` | words scrolling across, as a ticker does | `width`, `speed`; `to`: `"left"`, `"right"`; `big`: in block letters | `marquee("open late", { big: true })` |
| `countdown()` | big numbers counting down, then words | `from`, `to`, `then`, `seconds`, `font`; `transition`: `"cut"`, `"fade"`, `"dissolve"`, `"wipe"` | `countdown({ from: 5, then: "liftoff" })` |

A widget is a still unless it has something to show moving. To set a still one moving, give it to a motion: `floating(card({ title: "hi" }))`.

## Every widget in one file

```ts
// widgets.ts
import { barChart, card, clockFace, column, countdown, floating, gauge, marquee, panel, progressBar, row, sparkline,
  spinner, typewriter } from "ascii.rest/kit";

export const clock = clockFace({ title: "clock" });
export const download = progressBar({ label: "downloading" });
export const busy = spinner("dots", { label: "installing" });
export const disk = gauge({ value: 72, label: "disk" });
export const visits = sparkline([3, 5, 2, 8, 6, 9, 4, 7], { label: "visits" });
export const week = barChart({ mon: 3, tue: 5, wed: 4, thu: 8, fri: 6, sat: 2 });
export const box = panel(spinner("dots", { label: "building" }), { title: "ci", cols: 30, rows: 5 });
export const about = floating(card({ title: "ascii.rest", text: "Animated ascii art for the web.", footer: "npm i ascii.rest" }));
export const story = typewriter("It was a dark and stormy night.");
export const sign = marquee("open late", { big: true, color: "#f85149", width: 48 });
export const launch = countdown({ from: 5, then: "liftoff", color: "sunset" });
export const dashboard = column([row([gauge({ label: "cpu" }), gauge({ label: "disk", value: 72 })]), sparkline({ label: "net" })]);

export default clock;
```

## Placing by words

For drawing of your own, in a [piece()](/docs/kit/#piece-draw-your-own), these place things without counting cells. Each takes the grid, or a region of it such as the inside `rect()` returns:

| function | what it gives |
| --- | --- |
| `at(s, anchor?, { margin })` | the point at `"center"`, `"top-left"`, `"bottom"` and the rest, `margin` cells in |
| `textAt(s, str, anchor?, { margin, color })` | text against an anchor: in a corner, along an edge, in the middle |
| `ring(s, count, { radius, at })` | `count` points evenly round a circle, the first at the top, clockwise, as a clock's numbers go |
| `slot(s, anchor, { cols, rows, margin })` | a box of a size at an anchor: a panel in a corner, a button at the bottom |
| `inset(s, margin)` | the room with `margin` cells off every side |
| `across(s, parts, { gap })` | the room cut into parts side by side: `3`, or weights such as `[1, 2]` |
| `down(s, parts, { gap })` | the same, one under another |
| `tiles(s, { columns, rows, gap })` | the room cut into a grid of tiles, in reading order |

A clock of your own, its hours placed by `ring()`:

```ts
// my-clock.ts
import { at, circle, label, phase, piece, ray, rect, ring } from "ascii.rest/kit";

export default piece({ name: "clock", cols: 41, rows: 21, fps: 4, loop: 60 }, (t, s) => {
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "clock" });
  circle(s, ...at(s), 18, { char: "auto" });
  ring(s, 12, { radius: 15 }).forEach((point, hour) => label(s, ...point, hour || 12));
  ray(s, ...at(s), 13, phase(t, 60));
});
```

At 10 seconds:

```text
╭─ clock ───────────────────────────────╮
│              ___________              │
│          ___/           \___          │
│       __/         12        \__       │
│     _/    11             1     \_     │
│    /                             \    │
│   /  10                        2  \   │
│  |                          __     |  │
│ |                       ___/        | │
│ |                   ___/            | │
│ |  9              _/             3  | │
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

`ray()` points `phase(t, 60)` of the way round, once a minute: angles in the drawing functions are turns, 0 at the top. `clockFace()` is this, with hands for a time and colours.

## Next

- [layouts](/docs/kit-compose/): widgets in rows, columns and grids.
- [drawing](/docs/kit-draw/): the drawing the widgets are made of.
