# ascii.rest

```text
 ██╗   ███╗  ███╗ █╗ █╗    ███╗  ████╗  ███╗ █████╗
█╔═█╗ █╔══╝ █╔══╝ █║ █║    █╔═█╗ █╔══╝ █╔══╝ ╚═█╔═╝
████║ ╚██╗  █║    █║ █║    ███╔╝ ███╗  ╚██╗    █║
█╔═█║  ╚═█╗ █║    █║ █║    █╔█║  █╔═╝   ╚═█╗   █║
█║ █║ ███╔╝ ╚███╗ █║ █║ █╗ █║╚█╗ ████╗ ███╔╝   █║
╚╝ ╚╝ ╚══╝   ╚══╝ ╚╝ ╚╝ ╚╝ ╚╝ ╚╝ ╚═══╝ ╚══╝    ╚╝
                                        by @bas3line
```

<sub>That banner is one of the pieces, frozen: <code>&lt;ascii-art piece="big-text" options='{"text":"ascii.rest"}'&gt;&lt;/ascii-art&gt;</code> plays it with a shine sweeping across.</sub>

[![by @bas3line](https://img.shields.io/badge/by-%40bas3line-181717?logo=github&logoColor=white)](https://github.com/bas3line)

Animated ascii art for web pages, written in TypeScript by [@bas3line](https://github.com/bas3line). 142 pieces, from spinning shapes and physics to loaders, charts and full-colour scenes, for React, Next.js, Astro, or a plain HTML page. See them all at [ascii.rest](https://ascii.rest).

```sh
npm install github:bas3line/ascii
```

## React and Next.js

```tsx
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

<Ascii piece={donut} />
<Ascii piece="night-coast" />                          // fetched by name when it mounts
<Ascii piece={donut} options={{ fps: 12 }} className="art" />
```

`Ascii` is a client component (`"use client"`), so it goes straight into the Next.js app router. Text pieces draw into a `<pre>` in its colour and font size; the coloured scenes draw onto a `<canvas>` as wide as its container.

## Astro

```astro
---
import Ascii from "ascii.rest/astro";
---

<Ascii piece="donut" />
<Ascii piece="big-text" options={{ text: "hello" }} class="banner" />
```

The first frame is rendered on the server, so the page is whole before any script runs; the piece starts playing once the page loads.

## HTML, no build step

```html
<script type="module" src="https://ascii.rest/ascii.js"></script>

<ascii-art piece="donut"></ascii-art>
```

The tag takes `piece`, `fps`, `options` (JSON, such as `'{"text":"hello"}'`), `label` for screen readers, and `src` to play a module of your own. Style it like text: `ascii-art { font-size: 10px; color: teal; }`. In a bundled app, `import "ascii.rest/element"` defines the same tag.

## TypeScript, anywhere

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector("pre")!, donut, { fps: 12 });
```

`mount(element, piece, options)` plays a piece in a `<pre>`, or on a `<canvas>` for the scenes, and returns a function that stops it. `load["night-coast"]()` fetches any piece by name, and `names` lists them all.

Wherever it runs, a piece only plays while it is on screen and the tab is open, and holds its first frame for anyone who prefers reduced motion. Each piece is its own module, so a bundle carries only the pieces it uses.

## Write a piece

A piece exports `meta` and a default function. The function takes the options and returns a `Frame`: `(t, env) => string`, the picture at `t` seconds as exactly `rows` lines of `cols` characters.

```ts
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "spinner",
  category: "ui",
  note: "a line turning while something loads",
  cols: 10,
  rows: 1,
  fps: 6,
} satisfies Meta;

export default function spinner(): Frame {
  return (t) => `${"|/-\\"[Math.floor(t * 3) % 4]} loading `;
}
```

- `meta`: `name`, `category` (one from the table below), `note` (up to 72 characters), `cols` and `rows` (up to 80 by 32), `fps` (0 to 60, 0 for a still), and optional `options` defaults, typed with `satisfies Meta<YourOptions>`.
- `env.paper` is true when the text is dark on a light ground, so a shaded piece can flip its ramp and keep ink meaning shadow.
- Characters: printable ASCII, `·`, `°`, and the box drawing and block elements, U+2500 to U+259F.
- Deterministic: the same `t` gives the same frame. Use a seeded PRNG, never `Math.random`, and `Date` only with `meta.clock: true`.
- Self-contained: no imports but types, and no DOM. Frame 0 should be a good still, since that is what reduced motion shows.

A scene (`category: "scenes"`) is a coloured picture. It adds `palette` (up to 64 colours as `#rrggbb`), `ground` (the colour behind it) and `cell: 1` for square cells, may be up to 320 by 120, may also use `•` and `●`, and writes each cell's palette index into `env.color`, a `Uint8Array` of `cols * rows`, row by row.

Put it in `src/pieces/`, then:

```sh
npm run gen                       # add it to the indexes
npm run check -- spinner --show   # check it, printing frames at 0, 1, 2.5 and 5 seconds
npm run typecheck
```

The checker plays each piece for six seconds and fails it on things like a wrong size, a character outside the set, a missing field, frames that differ between two runs, or frames slower than 4 ms on average (10 ms for a scene). Node 23.6 or later runs the TypeScript directly, so there is nothing to build first.

## Layout

- `src/`: the library. `mount.ts`, `ascii.ts` (the tag), `react.tsx`, `astro/Ascii.astro`, `types.ts`, and `pieces/`.
- `dist/`: what the package ships, built by `npm run build` (`tsc`): `.js` and `.d.ts` for each module.
- `site/`: [ascii.rest](https://ascii.rest), an Astro site that uses the package like any app would. `npm run dev` and `npm run deploy` inside it.

## Pieces

| category | pieces |
| --- | --- |
| scenes | [alpine dawn](https://ascii.rest/alpine-dawn/), [aurora fjord](https://ascii.rest/aurora-fjord/), [deep reef](https://ascii.rest/deep-reef/), [desert night](https://ascii.rest/desert-night/), [earthrise](https://ascii.rest/earthrise/), [kyoto dusk](https://ascii.rest/kyoto-dusk/), [marine drive](https://ascii.rest/marine-drive/), [misty forest](https://ascii.rest/misty-forest/), [night coast](https://ascii.rest/night-coast/), [ocean sunset](https://ascii.rest/ocean-sunset/), [storm plains](https://ascii.rest/storm-plains/), [taj dawn](https://ascii.rest/taj-dawn/), [varanasi ghats](https://ascii.rest/varanasi-ghats/) |
| shapes | [cube](https://ascii.rest/cube/), [dna helix](https://ascii.rest/dna-helix/), [donut](https://ascii.rest/donut/), [glxgears](https://ascii.rest/glxgears/), [gyroscope](https://ascii.rest/gyroscope/), [heart](https://ascii.rest/heart/), [icosahedron](https://ascii.rest/icosahedron/), [mobius strip](https://ascii.rest/mobius-strip/), [spring](https://ascii.rest/spring/), [tesseract](https://ascii.rest/tesseract/), [torus knot](https://ascii.rest/torus-knot/), [twisted ring](https://ascii.rest/twisted-ring/) |
| space | [black hole](https://ascii.rest/black-hole/), [earth](https://ascii.rest/earth/), [eclipse](https://ascii.rest/eclipse/), [galaxy](https://ascii.rest/galaxy/), [moon phases](https://ascii.rest/moon-phases/), [planet](https://ascii.rest/planet/), [rocket](https://ascii.rest/rocket/), [saptarishi](https://ascii.rest/saptarishi/), [solar system](https://ascii.rest/solar-system/), [starfield](https://ascii.rest/starfield/), [three-body](https://ascii.rest/three-body/) |
| physics | [bouncing balls](https://ascii.rest/bouncing-balls/), [chladni plate](https://ascii.rest/chladni/), [double pendulum](https://ascii.rest/double-pendulum/), [falling sand](https://ascii.rest/falling-sand/), [flag](https://ascii.rest/flag/), [fountain](https://ascii.rest/fountain/), [harmonograph](https://ascii.rest/harmonograph/), [lorenz attractor](https://ascii.rest/lorenz/), [newton's cradle](https://ascii.rest/newtons-cradle/), [pendulum wave](https://ascii.rest/pendulum-wave/), [plucked string](https://ascii.rest/plucked-string/), [pond ripples](https://ascii.rest/pond-ripples/), [smoke](https://ascii.rest/smoke/), [wave interference](https://ascii.rest/wave-interference/) |
| nature | [aurora](https://ascii.rest/aurora/), [bonsai](https://ascii.rest/bonsai/), [campfire](https://ascii.rest/campfire/), [cherry blossom](https://ascii.rest/cherry-blossom/), [contour map](https://ascii.rest/contour-map/), [fern](https://ascii.rest/fern/), [fireflies](https://ascii.rest/fireflies/), [fractal tree](https://ascii.rest/fractal-tree/), [landscape](https://ascii.rest/landscape/), [lightning](https://ascii.rest/lightning/), [rain](https://ascii.rest/rain/), [ruled mountains](https://ascii.rest/ruled-mountains/), [sea swell](https://ascii.rest/sea-swell/), [snowfall](https://ascii.rest/snowfall/), [sunrise](https://ascii.rest/sunrise/), [wind](https://ascii.rest/wind/) |
| creatures | [aquarium](https://ascii.rest/aquarium/), [butterfly](https://ascii.rest/butterfly/), [cat](https://ascii.rest/cat/), [fox](https://ascii.rest/fox/), [jellyfish](https://ascii.rest/jellyfish/), [owl](https://ascii.rest/owl/), [snake](https://ascii.rest/snake/), [spider](https://ascii.rest/spider/), [starlings](https://ascii.rest/starlings/), [whale](https://ascii.rest/whale/) |
| objects | [analog clock](https://ascii.rest/analog-clock/), [candle](https://ascii.rest/candle/), [coffee](https://ascii.rest/coffee/), [ferris wheel](https://ascii.rest/ferris-wheel/), [hawa mahal](https://ascii.rest/hawa-mahal/), [hourglass](https://ascii.rest/hourglass/), [kite](https://ascii.rest/kite/), [lava lamp](https://ascii.rest/lava-lamp/), [lighthouse](https://ascii.rest/lighthouse/), [skyline](https://ascii.rest/skyline/), [sundial](https://ascii.rest/sundial/), [train](https://ascii.rest/train/), [vinyl](https://ascii.rest/vinyl/), [windmill](https://ascii.rest/windmill/) |
| generative | [epicycles](https://ascii.rest/epicycles/), [flow field](https://ascii.rest/flow-field/), [glider gun](https://ascii.rest/glider-gun/), [hilbert curve](https://ascii.rest/hilbert-curve/), [julia set](https://ascii.rest/julia-set/), [langton's ant](https://ascii.rest/langtons-ant/), [mandelbrot](https://ascii.rest/mandelbrot/), [maze](https://ascii.rest/maze/), [plasma](https://ascii.rest/plasma/), [reaction diffusion](https://ascii.rest/reaction-diffusion/), [rule 30](https://ascii.rest/rule-30/), [sierpinski](https://ascii.rest/sierpinski/), [voronoi](https://ascii.rest/voronoi/) |
| effects | [doom fire](https://ascii.rest/doom-fire/), [fireworks](https://ascii.rest/fireworks/), [matrix rain](https://ascii.rest/matrix-rain/), [rotozoomer](https://ascii.rest/rotozoomer/), [sparks](https://ascii.rest/sparks/), [synthwave](https://ascii.rest/synthwave/), [tunnel](https://ascii.rest/tunnel/), [tv static](https://ascii.rest/tv-static/) |
| ui | [boot log](https://ascii.rest/boot-log/), [box frames](https://ascii.rest/box-frames/), [calendar](https://ascii.rest/calendar/), [digital clock](https://ascii.rest/digital-clock/), [dividers](https://ascii.rest/dividers/), [file tree](https://ascii.rest/file-tree/), [form controls](https://ascii.rest/form-controls/), [not found](https://ascii.rest/not-found/), [progress bar](https://ascii.rest/progress-bar/), [skeleton](https://ascii.rest/skeleton/), [spinners](https://ascii.rest/spinners/), [terminal](https://ascii.rest/terminal/) |
| data | [bar chart](https://ascii.rest/bar-chart/), [candlesticks](https://ascii.rest/candlesticks/), [cpu meters](https://ascii.rest/cpu-meters/), [equalizer](https://ascii.rest/equalizer/), [gauge](https://ascii.rest/gauge/), [heartbeat](https://ascii.rest/heartbeat/), [heatmap](https://ascii.rest/heatmap/), [radar](https://ascii.rest/radar/), [sparkline](https://ascii.rest/sparkline/), [uptime bar](https://ascii.rest/uptime-bar/) |
| type | [big text](https://ascii.rest/big-text/), [dissolve](https://ascii.rest/dissolve/), [glitch](https://ascii.rest/glitch/), [marquee](https://ascii.rest/marquee/), [morse](https://ascii.rest/morse/), [scramble](https://ascii.rest/scramble/), [split-flap](https://ascii.rest/split-flap/), [typewriter](https://ascii.rest/typewriter/), [wave text](https://ascii.rest/wave-text/) |

## Author

Made by [@bas3line](https://github.com/bas3line). If you use it, a link back is appreciated.

## License

MIT, © [@bas3line](https://github.com/bas3line)
