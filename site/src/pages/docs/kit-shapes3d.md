---
layout: ../../layouts/Docs.astro
title: 3d scenes
description: scene() draws lit, spinning 3D shapes as ascii, from a donut, a planet with a moon and a cube to meshes and surfaces of your own.
---

`scene()` draws 3D shapes the way `donut.c` draws its donut: lit from one side, each cell shaded by how much light it catches, nearer surfaces hiding further ones. You name the shapes and how they move. The kit does the maths, and fits the camera so nothing leaves the frame.

The donut, in one line:

```ts
// donut.ts
import { scene, torus } from "ascii.rest/kit";

export default scene({ name: "donut", cols: 40, rows: 22, period: 8 }, torus({ spin: [1.6, 0, 0.8] }));
```

```text




                       @@@@@$$##*
                    @@@@@@@$$##*!=:
                 $@@@@@@$$$##*!!=:~
               $@@@@@@$$$##*!!=;:~.
             $@@@@@$$$##**!!=;:~-.
           $@@@@$$$$##**!!=;::-,.
          $$$$$$$##***!==;::~,..
        $$$$$####**!!==;:~~,..
       ######***!!==;;:~-,...
      ###****!!==;;::~-,...
     ***!!!!==;;::~--,...
     ======;;::~~-,....
     :;;:::~~--,....
       ---,,.....
```

That is the frame at 1 second, the torus seen nearly edge on.

`spin` is radians a second about x, y and z. `period: 8` rounds each spin to whole turns in 8 seconds, so the SVG of it loops without a jump.

## Shapes

| shape | what it is | its own options |
| --- | --- | --- |
| `torus()` | a ring with a tube round it | `radius` 2, `tube` 1 |
| `sphere()` | a ball | `radius` 1 |
| `cube()` | a cube, its edges drawn as lines | `size` 2 |
| `cylinder()` | a cylinder standing upright | `radius` 1, `height` 2 |
| `cone()` | a cone on its base | `radius` 1, `height` 2 |
| `plane()` | a flat floor in x and z | `width` 4, `depth` 4 |
| `points(list or name)` | points that glow: `"galaxy"`, `"ball"`, `"shell"`, `"ring"`, `"helix"`, or your own | `count`, `seed`, `char`, `glow` |
| `lines(paths)` | lines in 3D: a wireframe, axes, an orbit's path | `char`, `closed` |
| `mesh(vertices, faces)` | a shape of your own from its corners and faces | none |
| `parametric(fn)` | a surface of your own, `fn(u, v)` giving `[x, y, z]` | `segments` |
| `group(shapes)` | shapes that move as one | none |

Every shape also takes these:

| option | what it does | default |
| --- | --- | --- |
| `at` | where its centre is, `[x, y, z]`, or a function of `t` | `[0, 0, 0]` |
| `rotate` | its angles about x, y and z in radians, or a function of `t` | `[0, 0, 0]` |
| `spin` | radians a second about x, y and z. A number alone spins about y. | still |
| `scale` | its size, times | `1` |
| `color` | its colour, `#rrggbb`: it is drawn in shades of it | the page's ink |
| `texture` | `"bands"`, `"stripes"`, `"checker"`, `"grid"`, `"spots"`, or `(u, v, t) => brightness` | none |
| `edges` | draw its edges as lines | `true` |

Points are in units: `x` right, `y` up, `z` away from you.

## Move it

`orbit({ radius, period })` makes a position that goes round, for a shape's `at`. A group moves its shapes as one, so a moon's orbit can travel round a sun with its planet:

```ts
// orrery.ts
import { group, lines, orbit, scene, sphere } from "ascii.rest/kit";

const path = Array.from({ length: 73 }, (_, i) => [4 * Math.cos((i / 72) * 2 * Math.PI), 0, 4 * Math.sin((i / 72) * 2 * Math.PI)]);

export default scene({ name: "orrery", cols: 64, rows: 24, period: 8, camera: { tilt: 0.6, distance: 14 } }, [
  sphere({ radius: 1.4, color: "#fbbf24" }),
  lines(path, { color: "#64748b" }),
  group([sphere({ radius: 0.6, color: "#3b82f6" }), sphere({ radius: 0.2, color: "#e5e7eb", at: orbit({ radius: 1.1, period: 2 }) })], {
    at: orbit({ radius: 4, period: 8 }),
  }),
]);
```

```text
                       ------------------  @@
                  ------               *--!*!=.
               /---        $@@@@@$#*=     ...----
             //           $$@@@$$##*=;           \\
            //           !*#####**!=;:,           \\
           |/            ;=!!!!!==;:~,.            \\
           |              ~::::::~-,..              |
           \               ..,,......               |
            \\                                    //
             \\-                                ///
               ----                          ----
                   ------              ------
                         --------------
```

## Colour and texture

A shape with a `color` makes the scene coloured: each colour in `shades` steps, darker where less light falls. A texture by name puts a pattern on it, so a planet gets cloud bands with no maths:

```ts
// planet.ts
import { orbit, scene, sphere } from "ascii.rest/kit";

export default scene({ name: "planet", cols: 64, rows: 24, period: 6, ambient: 0.1, camera: { distance: 10 } }, [
  sphere({ radius: 1.5, rotate: [0, 0, 0.25], spin: [0, 0.5, 0], color: "#f59e0b", texture: "bands" }),
  sphere({ radius: 0.35, color: "#d1d5db", at: orbit({ radius: 2.6, period: 6, tilt: 0.3 }) }),
]);
```

`textures.bands(10)` and the rest take how many times the pattern repeats.

## Scene options

`scene(spec, shapes)` takes a piece's spec, as [piece()](/docs/kit/#piece-draw-your-own) does, with every field optional (64 by 24 by default), and these:

| option | what it does | default |
| --- | --- | --- |
| `camera` | `distance` (6), `zoom` (fitted), `tilt` (0: radians it looks down), `spin` (0: radians a second the whole scene turns) | |
| `light` | the way towards the light | `[-0.4, 1, -1]`, upper left |
| `ambient` | light everywhere, 0 to 1, so the dark side still shows | `0` |
| `ramp` | characters from unlit to lit | `".,-~:;=!*#$@"` |
| `invert` | turn the ramp round: `"auto"` on a light page | `"auto"` |
| `colorBy` | what picks a coloured cell's shade: `"shape"`, `"light"` or `"depth"` | `"shape"` |
| `colors` | one fade for the whole scene, in place of each shape's colour | none |
| `shades` | shades of each colour, 1 to 16 | `4` |
| `fit` | zoom as close as it can while nothing leaves the frame | `true` |
| `period` | seconds it repeats in: spins round to whole turns | none |

`scene(shapes)` alone works too, every option at its default. `shapes` may also be a function of `t` that returns a list, for shapes that come and go.

`plane()` and `points("galaxy")` lie flat, so seen level they are a line. Look down on them with `camera: { tilt: 0.6 }`.

## render3d(): 3D in your own piece

`render3d(s, shapes, t, options?)` draws shapes into a grid you are drawing already, beside text and the rest. `scenePalette(shapes, options)` gives the piece the colours the shapes need. Make the shapes once, outside the drawing:

```ts
// loader.ts
import { cube, piece, render3d, scenePalette } from "ascii.rest/kit";

const box = cube({ spin: 2, color: "#38bdf8" });
const view = { period: 3, ambient: 0.2, ramp: "blocks", camera: { tilt: 0.75 } };

export default piece({ name: "loader", cols: 36, rows: 14, loop: 3, palette: scenePalette(box, view) }, (t, s) => {
  render3d(s, box, t, view);
  s.write(14, 13, "loading" + ".".repeat(Math.floor(t * 2) % 3));
});
```

```text


              -------
            ---██████-----+
         ---█████████████/|
        +---███████████//░|
        |░░░-----█████/░░|
         |░░░░░░░----+/░░|
         |░░░░░░░░░░|░░░░+
          +-░░░░░░░░|░░//
            ---░░░░░|░/
               ----░|/
                   -+
              loading..
```

## Shapes of your own

`mesh()` takes corners and faces, each face a list of corner indices. A pyramid:

```ts
// pyramid.ts
import { mesh, scene } from "ascii.rest/kit";

const pyramid = mesh(
  [[0, 1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
  [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [1, 2, 3, 4]],
  { spin: [0, 1, 0], color: "#a855f7" },
);

export default scene({ name: "pyramid", cols: 32, rows: 16, period: 2 * Math.PI }, pyramid);
```

`parametric((u, v) => [x, y, z])` takes a surface, `u` and `v` each 0 to 1. A saddle: `parametric((u, v) => [u * 4 - 2, ((u * 4 - 2) * (v * 4 - 2)) / 4, v * 4 - 2])`.

## Next

- [effects](/docs/kit-fx/): a glint over a scene.
- [layouts](/docs/kit-compose/): a scene beside text, or a banner over it.
