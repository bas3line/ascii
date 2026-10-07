# ascii.rest

```text
        @@@@$$$$
    @@$$##*****#####
   $##***************!
 ###**!=;:::::==!*****!
 ##*!!;~-....,~:=!****!=
***!!;~,..    .~;!!***!=
****!=;:-      =**#***!;,
!*****!!==    #$$##**!=;
;!*****###$@@@@$$#***!;~
 ;!****##$$$$$$#*!!*!;~
  ~=!!*******!!*!!!=:,
    -:==!!!!!!!==:~,
        ,--~~--..
```

<sub>The <a href="https://ascii.rest/donut/">donut</a>, drawn small. On a page it turns: <code>&lt;ascii-art piece="donut"&gt;&lt;/ascii-art&gt;</code></sub>

[![by @bas3line](https://img.shields.io/badge/by-%40bas3line-181717?logo=github&logoColor=white)](https://github.com/bas3line)
[![CI](https://github.com/bas3line/ascii/actions/workflows/ci.yml/badge.svg)](https://github.com/bas3line/ascii/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-181717)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-181717?logo=typescript&logoColor=white)](src/types.ts)

Animated ascii art for web pages, written in TypeScript by [@bas3line](https://github.com/bas3line). 142 pieces, from spinning shapes and physics to loaders, charts and full-colour scenes, for React, Next.js, Astro, or a plain HTML page. See them all at [ascii.rest](https://ascii.rest).

## Why

I've always been a fan of Markdown files and terminal-style websites: plain text, one monospace face, nothing that moves without a reason. The kind of quiet web that [planetscale.com](https://planetscale.com) does well. So I made this, a way to put a little motion on pages like that without giving up the style. If you like minimalism, this library is for you.

## Install

```sh
npm install github:bas3line/ascii
```

It installs as `ascii.rest` and builds itself on install. Or skip installing: the [HTML tag](#html-no-build-step) loads everything from ascii.rest.

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

Style it like text: `ascii-art { font-size: 10px; color: teal; }`. In a bundled app, `import "ascii.rest/element"` defines the same tag.

## TypeScript, anywhere

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector("pre")!, donut, { fps: 12 });
```

## API

### `mount(element, piece, options?)`

Plays `piece` in `element` and returns a function that stops it.

- `element`: a `<pre>` for text pieces, a `<canvas>` for the coloured scenes (`canvas.has(name)` tells you which).
- `piece`: a piece module, such as `donut` from `ascii.rest/pieces`.
- `options`: overrides the piece's option defaults, plus `fps` to change its frame rate.

### `load`, `names`, `canvas`, `isPiece`

From `ascii.rest`. `load["night-coast"]()` imports any piece by name, `names` lists every name, `canvas` is the set of pieces drawn on a canvas, and `isPiece(name)` narrows a string to a piece name.

### `<Ascii>` (React)

| prop | type | |
| --- | --- | --- |
| `piece` | piece module or name | a module is bundled, a name is fetched when it mounts |
| `options` | object | option overrides, and `fps` |
| `label` | string | what it shows, for screen readers; the piece's name by default |
| `className`, `style` | | passed to the `<pre>` or `<canvas>` |

### `<Ascii>` (Astro)

`piece` (a name), `options`, `fps`, `label` and `class`.

### `<ascii-art>`

| attribute | |
| --- | --- |
| `piece` | a piece's name: `donut`, `night-coast` |
| `src` | or the URL of any module that follows the piece contract |
| `fps` | overrides the frame rate |
| `options` | JSON overriding the option defaults: `'{"text":"hello"}'` |
| `label` | what it shows, for screen readers |

## Browser support

Any current browser: it needs ES modules, custom elements and `IntersectionObserver`, plus `ResizeObserver` for the scenes. Importing any module on a server, for server rendering, is safe: nothing touches the DOM until a piece is mounted.

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

## Contributing

New pieces, fixes and ideas are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the piece contract, the checks and how to open a pull request, and the [code of conduct](CODE_OF_CONDUCT.md) applies everywhere. Found a security problem? See [SECURITY.md](SECURITY.md).

## Author

Made by [@bas3line](https://github.com/bas3line). If you use it, a link back is appreciated, and so is a star.

## License

MIT, © [@bas3line](https://github.com/bas3line)
