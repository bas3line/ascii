<div align="center">

# ascii.rest

<a href="https://ascii.rest/donut/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/donut-dark.svg">
    <img src=".github/donut-light.svg" alt="A lit donut turning, drawn in ascii">
  </picture>
</a>

<sub>Sponsored by <a href="https://www.cloudflare.com"><img src=".github/cloudflare.svg" height="14" align="center" alt=""> Cloudflare</a></sub>

<br>

Animated ascii art for web pages.<br>
169 pieces for React, Next.js, Astro or plain HTML.

[ascii.rest](https://ascii.rest) · [install](#install) · [pieces](#pieces) · [contributing](CONTRIBUTING.md)

[![by @bas3line](https://img.shields.io/badge/by-%40bas3line-181717?logo=github&logoColor=white)](https://github.com/bas3line)
[![CI](https://github.com/bas3line/ascii/actions/workflows/ci.yml/badge.svg)](https://github.com/bas3line/ascii/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-181717)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-181717?logo=typescript&logoColor=white)](src/types.ts)

</div>

<br>

Written in TypeScript by [@bas3line](https://github.com/bas3line). 196 pieces, from full-colour scenes to loaders, charts, language logos, Linux distros, spinning shapes and physics. The donut above turns on a page with one tag: `<ascii-art piece="donut"></ascii-art>`. See them all at [ascii.rest](https://ascii.rest).

<p align="center">
  <a href="https://ascii.rest/night-coast/"><img src="https://ascii.rest/og/night-coast.png" width="32%" alt="night coast"></a>
  <a href="https://ascii.rest/aurora-fjord/"><img src="https://ascii.rest/og/aurora-fjord.png" width="32%" alt="aurora fjord"></a>
  <a href="https://ascii.rest/earthrise/"><img src="https://ascii.rest/og/earthrise.png" width="32%" alt="earthrise"></a>
  <a href="https://ascii.rest/kyoto-dusk/"><img src="https://ascii.rest/og/kyoto-dusk.png" width="32%" alt="kyoto dusk"></a>
  <a href="https://ascii.rest/torus-knot/"><img src="https://ascii.rest/og/torus-knot.png" width="32%" alt="torus knot"></a>
  <a href="https://ascii.rest/taj-dawn/"><img src="https://ascii.rest/og/taj-dawn.png" width="32%" alt="taj dawn"></a>
</p>

## Why

I've always been a fan of Markdown files and terminal-style websites: plain text, one monospace face, nothing that moves without a reason. The kind of quiet web that [planetscale.com](https://planetscale.com) does well. So I made this, a way to put a little motion on pages like that without giving up the style. If you like minimalism, this library is for you.

## Install

```sh
npm install ascii.rest
```

Or skip installing: the [HTML tag](#html-no-build-step) loads everything from ascii.rest.

## React and Next.js

```tsx
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

<Ascii piece={donut} />
<Ascii piece="night-coast" />                          // fetched by name when it mounts
<Ascii piece={donut} options={{ fps: 12 }} className="art" />
<Ascii piece="rust" mono />                            // a logo in one ink
```

`Ascii` is a client component (`"use client"`), so it goes straight into the Next.js app router. Text pieces draw into a `<pre>` in its colour and font size; the coloured ones, scenes, logos, companies and distros, draw onto a `<canvas>` as wide as its container, or into a `<pre>` in one ink with `mono`.

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

Style it like text: `ascii-art { font-size: 10px; color: teal; }`. The logos, companies and distros come in their own colours; add `mono`, `<ascii-art piece="rust" mono>`, to draw one in the text's colour instead. In a bundled app, `import "ascii.rest/element"` defines the same tag.

## In a GitHub README

A README runs no script, so every logo, company and distro also comes as an animated SVG, one loop of its glint or scan, at `https://ascii.rest/svg/<name>.svg` for light pages and `<name>.dark.svg` for dark ones:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/svg/rust.dark.svg">
  <img alt="rust" src="https://ascii.rest/svg/rust.svg" width="320">
</picture>
```

GitHub shows the dark one in its dark theme. Each piece's page on ascii.rest has its snippet under `readme`.

## TypeScript, anywhere

```ts
import { mount } from "ascii.rest";
import { donut } from "ascii.rest/pieces";

const stop = mount(document.querySelector("pre")!, donut, { fps: 12 });
```

## API

### `mount(element, piece, options?)`

Plays `piece` in `element` and returns a function that stops it.

- `element`: a `<pre>` for text pieces, a `<canvas>` for the coloured ones (`canvas.has(name)` tells you which). A coloured piece in a `<pre>` is drawn in one ink.
- `piece`: a piece module, such as `donut` from `ascii.rest/pieces`.
- `options`: overrides the piece's option defaults, plus `fps` to change its frame rate, and `motion: true` to play even when the reader prefers reduced motion. Pieces hold their first frame for those readers by default; set `motion` only behind a control the reader chooses, like the site's `[play anyway]`.

### `load`, `names`, `canvas`, `isPiece`

From `ascii.rest`. `load["night-coast"]()` imports any piece by name, `names` lists every name, `canvas` is the set of pieces drawn on a canvas, and `isPiece(name)` narrows a string to a piece name.

### `<Ascii>` (React)

| prop | type | |
| --- | --- | --- |
| `piece` | piece module or name | a module is bundled, a name is fetched when it mounts |
| `options` | object | option overrides, and `fps` |
| `label` | string | what it shows, for screen readers; the piece's name by default |
| `mono` | boolean | draws a coloured piece in one ink, in a `<pre>` |
| `className`, `style` | | passed to the `<pre>` or `<canvas>` |

### `<Ascii>` (Astro)

`piece` (a name), `options`, `fps`, `label`, `mono` and `class`.

### `<ascii-art>`

| attribute | |
| --- | --- |
| `piece` | a piece's name: `donut`, `night-coast` |
| `src` | or the URL of any module that follows the piece contract |
| `fps` | overrides the frame rate |
| `options` | JSON overriding the option defaults: `'{"text":"hello"}'` |
| `label` | what it shows, for screen readers |
| `mono` | draws a coloured piece in one ink, the text's colour |

## Browser support

Any current browser: it needs ES modules, custom elements and `IntersectionObserver`, plus `ResizeObserver` for the coloured pieces. Importing any module on a server, for server rendering, is safe: nothing touches the DOM until a piece is mounted.

Many pieces draw with box drawing and block glyphs (`─ │ ╭ █ ▄ ░`). Where the system monospace face has none, as on Android, the tag and the Astro component take them from "ascii.rest mono", a 3 KB cut of [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (OFL) served by ascii.rest, so every row keeps its width. Only a browser that lacks the glyphs fetches it. With React, put it in your own `<pre>`'s font stack:

```css
@font-face {
  font-family: "ascii.rest mono";
  src: url("https://ascii.rest/fonts/ascii-rest-mono.woff2") format("woff2");
  unicode-range: U+00B0, U+00B7, U+2022, U+2500-259F, U+25CF;
}
pre.art { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "ascii.rest mono", monospace; }
```

## Pieces

| category | pieces |
| --- | --- |
| scenes | [alpine dawn](https://ascii.rest/alpine-dawn/), [aurora fjord](https://ascii.rest/aurora-fjord/), [deep reef](https://ascii.rest/deep-reef/), [desert night](https://ascii.rest/desert-night/), [earthrise](https://ascii.rest/earthrise/), [kyoto dusk](https://ascii.rest/kyoto-dusk/), [marine drive](https://ascii.rest/marine-drive/), [misty forest](https://ascii.rest/misty-forest/), [night coast](https://ascii.rest/night-coast/), [ocean sunset](https://ascii.rest/ocean-sunset/), [storm plains](https://ascii.rest/storm-plains/), [taj dawn](https://ascii.rest/taj-dawn/), [varanasi ghats](https://ascii.rest/varanasi-ghats/) |
| ui | [boot log](https://ascii.rest/boot-log/), [box frames](https://ascii.rest/box-frames/), [calendar](https://ascii.rest/calendar/), [digital clock](https://ascii.rest/digital-clock/), [dividers](https://ascii.rest/dividers/), [file tree](https://ascii.rest/file-tree/), [form controls](https://ascii.rest/form-controls/), [not found](https://ascii.rest/not-found/), [progress bar](https://ascii.rest/progress-bar/), [skeleton](https://ascii.rest/skeleton/), [spinners](https://ascii.rest/spinners/), [terminal](https://ascii.rest/terminal/) |
| data | [bar chart](https://ascii.rest/bar-chart/), [candlesticks](https://ascii.rest/candlesticks/), [cpu meters](https://ascii.rest/cpu-meters/), [equalizer](https://ascii.rest/equalizer/), [gauge](https://ascii.rest/gauge/), [heartbeat](https://ascii.rest/heartbeat/), [heatmap](https://ascii.rest/heatmap/), [radar](https://ascii.rest/radar/), [sparkline](https://ascii.rest/sparkline/), [uptime bar](https://ascii.rest/uptime-bar/) |
| type | [big text](https://ascii.rest/big-text/), [dissolve](https://ascii.rest/dissolve/), [glitch](https://ascii.rest/glitch/), [marquee](https://ascii.rest/marquee/), [morse](https://ascii.rest/morse/), [scramble](https://ascii.rest/scramble/), [split-flap](https://ascii.rest/split-flap/), [typewriter](https://ascii.rest/typewriter/), [wave text](https://ascii.rest/wave-text/) |
| logos | [c](https://ascii.rest/c/), [c#](https://ascii.rest/csharp/), [c++](https://ascii.rest/cpp/), [clojure](https://ascii.rest/clojure/), [css](https://ascii.rest/css/), [dart](https://ascii.rest/dart/), [elixir](https://ascii.rest/elixir/), [erlang](https://ascii.rest/erlang/), [go](https://ascii.rest/go/), [haskell](https://ascii.rest/haskell/), [html](https://ascii.rest/html/), [java](https://ascii.rest/java/), [javascript](https://ascii.rest/javascript/), [julia](https://ascii.rest/julia/), [kotlin](https://ascii.rest/kotlin/), [lua](https://ascii.rest/lua/), [ocaml](https://ascii.rest/ocaml/), [perl](https://ascii.rest/perl/), [php](https://ascii.rest/php/), [python](https://ascii.rest/python/), [r](https://ascii.rest/r/), [ruby](https://ascii.rest/ruby/), [rust](https://ascii.rest/rust/), [scala](https://ascii.rest/scala/), [swift](https://ascii.rest/swift/), [typescript](https://ascii.rest/typescript/), [zig](https://ascii.rest/zig/) |
| companies | [apple](https://ascii.rest/apple/), [cloudflare](https://ascii.rest/cloudflare/), [command code](https://ascii.rest/command-code/), [playstation](https://ascii.rest/playstation/), [vercel](https://ascii.rest/vercel/) |
| distros | [almalinux](https://ascii.rest/almalinux/), [alpine linux](https://ascii.rest/alpine-linux/), [arch linux](https://ascii.rest/arch-linux/), [centos](https://ascii.rest/centos/), [debian](https://ascii.rest/debian/), [deepin](https://ascii.rest/deepin/), [elementary os](https://ascii.rest/elementary-os/), [endeavouros](https://ascii.rest/endeavouros/), [fedora](https://ascii.rest/fedora/), [gentoo](https://ascii.rest/gentoo/), [kali linux](https://ascii.rest/kali-linux/), [linux mint](https://ascii.rest/linux-mint/), [manjaro](https://ascii.rest/manjaro/), [nixos](https://ascii.rest/nixos/), [opensuse](https://ascii.rest/opensuse/), [pop!_os](https://ascii.rest/pop-os/), [red hat](https://ascii.rest/red-hat/), [rocky linux](https://ascii.rest/rocky-linux/), [tux](https://ascii.rest/tux/), [ubuntu](https://ascii.rest/ubuntu/), [void linux](https://ascii.rest/void-linux/), [zorin os](https://ascii.rest/zorin-os/) |
| shapes | [cube](https://ascii.rest/cube/), [dna helix](https://ascii.rest/dna-helix/), [donut](https://ascii.rest/donut/), [glxgears](https://ascii.rest/glxgears/), [gyroscope](https://ascii.rest/gyroscope/), [heart](https://ascii.rest/heart/), [icosahedron](https://ascii.rest/icosahedron/), [mobius strip](https://ascii.rest/mobius-strip/), [spring](https://ascii.rest/spring/), [tesseract](https://ascii.rest/tesseract/), [torus knot](https://ascii.rest/torus-knot/), [twisted ring](https://ascii.rest/twisted-ring/) |
| space | [black hole](https://ascii.rest/black-hole/), [earth](https://ascii.rest/earth/), [eclipse](https://ascii.rest/eclipse/), [galaxy](https://ascii.rest/galaxy/), [moon phases](https://ascii.rest/moon-phases/), [planet](https://ascii.rest/planet/), [rocket](https://ascii.rest/rocket/), [saptarishi](https://ascii.rest/saptarishi/), [solar system](https://ascii.rest/solar-system/), [starfield](https://ascii.rest/starfield/), [three-body](https://ascii.rest/three-body/) |
| physics | [bouncing balls](https://ascii.rest/bouncing-balls/), [chladni plate](https://ascii.rest/chladni/), [double pendulum](https://ascii.rest/double-pendulum/), [falling sand](https://ascii.rest/falling-sand/), [flag](https://ascii.rest/flag/), [fountain](https://ascii.rest/fountain/), [harmonograph](https://ascii.rest/harmonograph/), [lorenz attractor](https://ascii.rest/lorenz/), [newton's cradle](https://ascii.rest/newtons-cradle/), [pendulum wave](https://ascii.rest/pendulum-wave/), [plucked string](https://ascii.rest/plucked-string/), [pond ripples](https://ascii.rest/pond-ripples/), [smoke](https://ascii.rest/smoke/), [wave interference](https://ascii.rest/wave-interference/) |
| nature | [aurora](https://ascii.rest/aurora/), [bonsai](https://ascii.rest/bonsai/), [campfire](https://ascii.rest/campfire/), [cherry blossom](https://ascii.rest/cherry-blossom/), [contour map](https://ascii.rest/contour-map/), [fern](https://ascii.rest/fern/), [fireflies](https://ascii.rest/fireflies/), [fractal tree](https://ascii.rest/fractal-tree/), [landscape](https://ascii.rest/landscape/), [lightning](https://ascii.rest/lightning/), [rain](https://ascii.rest/rain/), [ruled mountains](https://ascii.rest/ruled-mountains/), [sea swell](https://ascii.rest/sea-swell/), [snowfall](https://ascii.rest/snowfall/), [sunrise](https://ascii.rest/sunrise/), [wind](https://ascii.rest/wind/) |
| creatures | [aquarium](https://ascii.rest/aquarium/), [butterfly](https://ascii.rest/butterfly/), [cat](https://ascii.rest/cat/), [fox](https://ascii.rest/fox/), [jellyfish](https://ascii.rest/jellyfish/), [owl](https://ascii.rest/owl/), [snake](https://ascii.rest/snake/), [spider](https://ascii.rest/spider/), [starlings](https://ascii.rest/starlings/), [whale](https://ascii.rest/whale/) |
| objects | [analog clock](https://ascii.rest/analog-clock/), [candle](https://ascii.rest/candle/), [coffee](https://ascii.rest/coffee/), [ferris wheel](https://ascii.rest/ferris-wheel/), [hawa mahal](https://ascii.rest/hawa-mahal/), [hourglass](https://ascii.rest/hourglass/), [kite](https://ascii.rest/kite/), [lava lamp](https://ascii.rest/lava-lamp/), [lighthouse](https://ascii.rest/lighthouse/), [skyline](https://ascii.rest/skyline/), [sundial](https://ascii.rest/sundial/), [train](https://ascii.rest/train/), [vinyl](https://ascii.rest/vinyl/), [windmill](https://ascii.rest/windmill/) |
| generative | [epicycles](https://ascii.rest/epicycles/), [flow field](https://ascii.rest/flow-field/), [glider gun](https://ascii.rest/glider-gun/), [hilbert curve](https://ascii.rest/hilbert-curve/), [julia set](https://ascii.rest/julia-set/), [langton's ant](https://ascii.rest/langtons-ant/), [mandelbrot](https://ascii.rest/mandelbrot/), [maze](https://ascii.rest/maze/), [plasma](https://ascii.rest/plasma/), [reaction diffusion](https://ascii.rest/reaction-diffusion/), [rule 30](https://ascii.rest/rule-30/), [sierpinski](https://ascii.rest/sierpinski/), [voronoi](https://ascii.rest/voronoi/) |
| effects | [doom fire](https://ascii.rest/doom-fire/), [fireworks](https://ascii.rest/fireworks/), [matrix rain](https://ascii.rest/matrix-rain/), [rotozoomer](https://ascii.rest/rotozoomer/), [sparks](https://ascii.rest/sparks/), [synthwave](https://ascii.rest/synthwave/), [tunnel](https://ascii.rest/tunnel/), [tv static](https://ascii.rest/tv-static/) |

The logos and distros are drawn from [devicon](https://github.com/devicons/devicon) (MIT) and [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0). The companies are drawn from Simple Icons too, and command code from its own mark on [commandcode.ai](https://commandcode.ai). Each is a trademark of its owner, shown here to name the language, the distribution or the company.

## Contributing

New pieces, fixes and ideas are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the piece contract, the checks and how to open a pull request, and the [code of conduct](CODE_OF_CONDUCT.md) applies everywhere. Found a security problem? See [SECURITY.md](SECURITY.md).

## Author

Made by [@bas3line](https://github.com/bas3line). If you use it, a link back is appreciated, and so is a star.

To support it: [GitHub Sponsors](https://github.com/sponsors/bas3line), [Buy Me a Coffee](https://buymeacoffee.com/bas3line) or [PayPal](https://paypal.me/ShubhamYadav886).

## License

MIT, © [@bas3line](https://github.com/bas3line)
