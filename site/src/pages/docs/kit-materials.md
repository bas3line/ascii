---
layout: ../../layouts/Docs.astro
title: materials
description: Build a picture by saying what is in it, a glass with water inside, a candle with a flame, a house with smoke from its chimney. No coordinates, no maths.
---

The materials let you build a picture by saying what is in it. A **shape** says where something is: a cup, a flame, a house. A **material** says what it is made of: glass, water, fire. An **emission** is what it gives off: bubbles, steam, smoke. `picture()` lays them over each other and makes a piece.

A glass of water, half full, with bubbles rising:

```ts
// glass.ts
import { bubbles, cup, emit, glass, inside, picture, shape, water } from "ascii.rest/kit";

const tumbler = cup();
const drink = inside(tumbler, { fill: "half" });

export default picture(
  [shape(tumbler, glass()), shape(drink, water()), emit(bubbles(), { inside: drink })],
  { name: "glass of water", cols: 32, rows: 16 },
);
```

```text




        .               .
        |               |
        | |             |
        | '             |
        | '             |
        \_~~O--~__~~~~-~/
         |'  O         |
         |      ~~~   °|
         |   o         |
         | ~~      °   |
         \_____________/
          \___________/
```

There are no coordinates. `cup()` stands at the bottom of the picture at a size that looks right, `inside()` knows the cup's walls and base, and the water's waves slosh against them.

## Shapes

Each shape is placed and sized by words, with a default that looks right:

| shape | what it is | made of, by default |
| --- | --- | --- |
| `cup()` | a tumbler, wider at the rim. A vessel. | glass |
| `mug()` | a mug with a handle. A vessel. | ceramic |
| `bottle()` | a bottle with a neck. A vessel. | glass |
| `straw()` | a straw leaning in a vessel, given as `within` | red stripes |
| `box()` | a box, square unless given a `ratio`. A closed vessel. | solid |
| `ball()`, `heart()`, `star()`, `leaf()`, `moon()` | each as named | solid, rose, gold, green, pale yellow |
| `blob()` | a soft lump, a different one for each `seed` | lava |
| `cloud()` | puffs on a flat base | cloud |
| `flame()` | round at the bottom, pointed at the top | fire |
| `fish()` | a fish facing right, for `move: "swim"` | goldfish |
| `house()` | walls, a roof, a chimney, a door, two windows. Each is an area too: `house().chimney`. | ceramic |
| `lamp()` | a lava lamp: a cap, a globe and a base. `lamp().globe` is a vessel. | metal |

Where a shape goes:

| option | what it does |
| --- | --- |
| `at` | where in its room: `"center"`, `"bottom"`, `"top-left"` and the rest, or a point `[x, y]` |
| `size` | its height as `"tiny"`, `"small"`, `"medium"`, `"large"`, `"huge"`, `"full"`, or a share from 0 to 1 |
| `cols`, `rows` | its size in cells, over `size` |
| `on` | another area to stand it on: a wick on a candle, a flame on the wick |
| `within` | another area to place it in, in place of the picture |
| `x`, `y` | cells to move it after placing |
| `flip` | mirror it left to right |

Other areas: `sky()` is the whole picture, `ground()` a band along the bottom, and `inside(vessel, { fill })` the room in a vessel up to a level: `"low"`, `"half"`, `"high"`, `"full"`, `"brim"` or a share. `union()`, `subtract()` and `intersect()` combine areas.

When no shape fits, `area` has primitives in cells: `area.rect()`, `area.rounded()`, `area.circle()`, `area.ellipse()`, `area.polygon()`, `area.path()` for a thick line, `area.text("OPEN")`, `area.where(test)`, and `area.fit(outline)`, a shape of your own outline placed by words like the rest.

## Materials

| material | what it draws | moves |
| --- | --- | --- |
| `water()` | waves, darker with depth, bending what is behind it | `waves`: `"still"`, `"gentle"`, `"slosh"`, `"rough"` |
| `glass()` | see-through, an outline and a highlight with a glint | the glint |
| `fire()` | flames, hottest at the base, licking up | flickers. `heat`, `glow`. |
| `smoke()` | drifting smoke | drifts |
| `metal()` | shaded round, with a sheen | the sheen sweeps |
| `wood()` | grain, `"planks"` or a log's `"rings"` | still |
| `grass()` | a `"lawn"`, `"reeds"` or `"seaweed"` | sways |
| `sand()` | a stipple of grains with ripples | still |
| `lava()` | blobs that rise and sink | rises |
| `ice()` | a clear block with a facet | a glint |
| `neon()` | a bright tube with a glow | flickers |
| `solid()` | one character, or shaded from the edge by a `ramp` | still |
| `gradientFill()` | colours fading across, in a `direction` | still |
| `pattern()` | a tile repeated: `"bricks"`, `"tiles"`, `"checks"`, `"waves"` and more | scrolls with `move` |
| `ceramic()` | opaque and glazed, shaded down one side | still |
| `starfield()` | stars twinkling, for a night sky | twinkles |
| `texture(piece)` | any piece playing inside the area: a screen showing the donut | plays |
| `material(fn)` | one of your own: a function of each cell and `t` | as you like |

Every material takes `colors`: a palette's name, one colour, or your own stops. The names include `water`, `sea`, `cola`, `coffee`, `tea`, `wine`, `fire`, `candle`, `lava`, `smoke`, `steel`, `gold`, `copper`, `wood`, `grass`, `sand`, `ice`, `neon`, `lamp`, `wax`, `moon`, `sunset` and `sky`. `palettes` lists them all, each a list for a light page and one for a dark page.

## Emissions

`emit(emission, { from, inside })` adds what something gives off. Smoke and steam rise from the top of `from`; bubbles are born at the bottom of `inside` and pop at its surface.

| emission | what it is |
| --- | --- |
| `bubbles()` | rising through a liquid, wobbling, popping at the top |
| `steam()` | curling wisps over a hot drink |
| `smoke()` | a column leaning in the wind and opening out |
| `sparks()` | flying up off a fire and falling back |
| `rain()` | falling from a cloud, splashing at the bottom |
| `snow()` | drifting down, each flake swaying |
| `emission(fn)` | one of your own |

A candle, each part standing on the one below, smoke rising from the flame:

```ts
// candle.ts
import { box, ceramic, emit, fire, flame, picture, shape, smoke, solid } from "ascii.rest/kit";

const wax = box({ at: "bottom", cols: 10, rows: 9 });
const wick = box({ on: wax, cols: 1, rows: 1 });
const tip = flame({ on: wick, cols: 9, rows: 11 });

export default picture([
  shape(wax, ceramic({ colors: "wax" })),
  shape(wick, solid({ char: "|" })),
  shape(tip, fire({ colors: "candle", glow: 1 })),
  emit(smoke({ spread: 0.15, wind: 0.1 }), { from: tip }),
], { name: "candle", cols: 30, rows: 28 });
```

## Move a shape

`shape(area, material, { move })` moves a shape as a whole, on top of what its material does: `"bob"` up and down, `"sway"` side to side, `"swim"` across and back, turning round, or `"drift"` right across the picture and round again. `amount` and `period` change how far and how fast. Or give a function, `t => [dx, dy]`, with a `period`.

```ts
// aquarium.ts
import { box, bubbles, emit, fish, glass, grass, ground, inside, picture, sand, shape, water } from "ascii.rest/kit";

const tank = box({ ratio: 1.4, size: "full" });
const sea = inside(tank, { fill: "full" });

export default picture([
  shape(tank, glass()),
  shape(sea, water({ colors: "sea", texture: 0.3 })),
  shape(ground({ within: sea, size: 0.7 }), grass({ kind: "seaweed", density: 0.25 })),
  shape(ground({ within: sea, rows: 2 }), sand()),
  shape(fish({ within: sea, rows: 5 }), { move: "swim" }),
  emit(bubbles(), { inside: sea }),
], { name: "aquarium", cols: 48, rows: 18 });
```

```text

.----------------------------------------------.
|                                              |
|____~~~~----~~~~~~~~~~~_______~~~~~~~~~~-----~|
|'                ~~o           O          o   |
||             O           ~-              -~  |
|'          ~~                      ~          |
|'   ~          o    ~~      O                 |
|'(          )       ..     _.---._            |
|'(    )o    )      ) --\ /-       -\ o~~      |
|(     )~~   (       ) )|-         o \         |
|)      )   (   )~-  )--/ \_       _/          |
|')~    ((  O   )  ) .- ((~ '-___-')      ~~   |
| )     (  (~ o  )  ) ( ((          )          |
|  )   ((  )      ) )~(((           (      °   |
|_.,..,,...,.,.o,,,,,,,_,__..,,..._._.,_.,_._..|
| ::.:::~~ :..:::.:::. :~.:.::.:°  :::~~:.::: :|
|______________________________________________|
```

## A house at night

`house()` has parts, so its windows can glow and its chimney can smoke:

```ts
// house.ts
import { cloud, emit, ground, grass, house, moon, neon, picture, shape, sky, smoke, starfield, wood } from "ascii.rest/kit";

const lawn = ground();
const home = house({ on: lawn, size: "medium" });

export default picture([
  shape(sky(), starfield()),
  shape(moon({ x: -3, y: 1 })),
  shape(cloud({ x: -12, y: 2, size: "tiny" }), { move: "drift" }),
  shape(home),
  shape(home.windows, neon({ colors: "lamp", char: "▒" })),
  shape(home.door, wood()),
  emit(smoke(), { from: home.chimney }),
  shape(lawn, grass()),
], { name: "house at night", cols: 64, rows: 24 });
```

```text
           · +                           )         +     ..
                                   .     )      ██████
  + .          ·    .-~-.               )     ██████ +      ·
                  .'     '.   .              █████
              .--'         '-' '.       (   ██████    +
             (                   )    +(    ██████       .
      +       '_________________'     .-.  · █████
+    +                       +        | |     ██████
                            ._----_   | |      .██████
      +                    _-      -_ | |                 +
   .                     .-          -. |
     +     .          _--              --_  *  .         +
+                   _-                    -_
                   --______________________--               ·
                     | ▒▒▒▒▒        ▒▒▒▒▒:|         ·   .
                     | ▒▒▒▒▒  .--.  ▒▒▒▒▒:|          ·         .
·                    | ▒▒▒▒▒  |==|  ▒▒▒▒▒:|      +
                     |        |-~|      .:|                +
 *  ·                |________|__|________|
  //  |\    \ | \   /| ||  |   |    |   /| /    |   | | \ | /  /
//||, ||\\ \| |'|' /|| ||/'|,  |',\'|   || |/'  |'  |\| | |'|''|
'""'"'"'"""',""""'"'"''""",''"""',"",'""''","'"',""""'",""','",'
      ,     ., , .  '  ' . . ,,        ,     .            ,    .
  ..   .,'  . .   .  .  '  ,     ,         '       .. '
```

## A material of your own

`material(fn, o?)` calls `fn(cell, t)` for each cell of the area. Return a character, `[character, colour index]`, or `""` to leave the cell. `cell` has `x`, `y`, `u` and `v` (0 to 1 across the area), `depth` from its edge, and `edge`, the outline character there:

```ts
// checks.ts
import { area, material, picture, shape } from "ascii.rest/kit";

const checks = material((c, t) => ((c.x + c.y + Math.floor(t * 2)) % 2 ? "#" : "."), { period: 1 });

export default picture([shape(area.rounded(2, 1, 28, 8, 2), checks)], { name: "checks", cols: 32, rows: 10 });
```

## picture() options

`picture(parts, spec?)` takes a piece's spec, every field optional. Its size is `cols` by `rows` if given, else just big enough when every part is in fixed cells, else 64 by 24. It holds up to 32 colours a page, and loops when its parts' periods come round together within a minute.

`drawParts(s, parts, t)` draws parts into a piece of your own, with `partsPalette(parts)` as its palette. `waterGlass({ fill, waves, colors })` is the glass of water above in one call.

## Next

- [svg drawings](/docs/kit-vector/): fill a part of an SVG with `water()` or `glass()`.
- [particles](/docs/kit-particles/): more particle systems, with every field to tune.
