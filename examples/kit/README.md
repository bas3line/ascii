# Kit examples

Pieces made with [ascii.rest/kit](https://ascii.rest/docs/kit/), one a file. Each file's default export is a normal piece, so it plays in React, on a page, as an SVG and in a terminal. Each starts with a comment saying how it is made.

They import the kit from `../../src/kit/`, the source in this repo. In your own project, import the same names from `ascii.rest/kit`.

Play one, with its frames printed and its SVG written:

```sh
npm run kit -- examples/kit/shapes3d-donut.ts --at 0,1,2 --svg donut.svg
```

Check every example on a dark page, on paper and in one ink:

```sh
npm run kit:examples
```

## core

| file | what it is |
| --- | --- |
| [core-orbit.ts](core-orbit.ts) | a moon going round a planet, drawn with `piece()` and nothing else |

## fields

| file | what it is |
| --- | --- |
| [field-plasma.ts](field-plasma.ts) | the demo-scene plasma in one call, coloured by value |
| [field-sea.ts](field-sea.ts) | a swell rolling past, its surface drawn with `at.char` |
| [field-pulse.ts](field-pulse.ts) | a ring of light beating out from the centre |
| [field-window.ts](field-window.ts) | a lit ball shaded by `drawField()` into a framed window |
| [field-moonlit.ts](field-moonlit.ts) | a whole scene, sky, moon and sea, from one function |
| [field-storm.ts](field-storm.ts) | a cyclone on a weather map, drawn by the way its wind blows |

## drawing

| file | what it is |
| --- | --- |
| [draw-clock.ts](draw-clock.ts) | a clock face with `circle()`, `around()`, `label()` and `ray()` |
| [draw-sine.ts](draw-sine.ts) | a sine and a cosine scrolling on the braille canvas |
| [draw-sprite.ts](draw-sprite.ts) | a pixel-art figure walking under a sun, on the half-block canvas |
| [draw-gauge.ts](draw-gauge.ts) | a dial and a braille plot of the last 8 seconds, in joined boxes |

## maths

| file | what it is |
| --- | --- |
| [math-landscape.ts](math-landscape.ts) | three mountain ranges of ridged `noise()` scrolling past |
| [math-starfield.ts](math-starfield.ts) | a seeded sky: `scatter()`, `twinkle()` and a shooting star |
| [math-galaxy.ts](math-galaxy.ts) | two thousand seeded stars turned by a `camera()` |
| [math-easing.ts](math-easing.ts) | eight easings racing the same track with `tween()` |
| [math-pool.ts](math-pool.ts) | light on the floor of a swimming pool, from cellular noise |

## 3d scenes

| file | what it is |
| --- | --- |
| [shapes3d-donut.ts](shapes3d-donut.ts) | donut.c's spinning torus in one line |
| [shapes3d-cube.ts](shapes3d-cube.ts) | a cube tumbling on two axes |
| [shapes3d-planet.ts](shapes3d-planet.ts) | a banded gas giant and a moon on a tilted orbit |
| [shapes3d-orrery.ts](shapes3d-orrery.ts) | a sun, a planet and its moon: motion inside motion with `group()` |
| [shapes3d-crystal.ts](shapes3d-crystal.ts) | a shape of your own from six corners and eight faces, with `mesh()` |
| [shapes3d-galaxy.ts](shapes3d-galaxy.ts) | a ready-made cloud of seeded stars on two spiral arms |
| [shapes3d-boing.ts](shapes3d-boing.ts) | the Amiga's bouncing ball |
| [shapes3d-loader.ts](shapes3d-loader.ts) | a cube drawn with `render3d()` inside a piece of your own, with a label |

## particles

| file | what it is |
| --- | --- |
| [particles-snow.ts](particles-snow.ts) | the snow preset behind a cabin and its pines typed as text |
| [particles-fireworks.ts](particles-fireworks.ts) | the fireworks preset over a city skyline |
| [particles-embers.ts](particles-embers.ts) | sparks rising off a fire, a system written out by hand |
| [particles-matrix.ts](particles-matrix.ts) | streams of glyphs falling |
| [particles-comet.ts](particles-comet.ts) | a comet's tail with `drawParticles()` in a piece of your own |
| [particles-sand.ts](particles-sand.ts) | a `banner()` that crumbles to sand |
| [particles-confetti.ts](particles-confetti.ts) | two party poppers fired from the bottom corners |
| [particles-banner.ts](particles-banner.ts) | sparks rising off a banner's letters |

## effects

| file | what it is |
| --- | --- |
| [fx-glint-banner.ts](fx-glint-banner.ts) | a glint crossing a gradient banner |
| [fx-dissolve-donut.ts](fx-dissolve-donut.ts) | the library's donut dissolving in and out |
| [fx-glitch-logo.ts](fx-glitch-logo.ts) | the rust logo breaking up for a moment |
| [fx-scan-logo.ts](fx-scan-logo.ts) | the go logo revealed by a scan line |
| [fx-type-terminal.ts](fx-type-terminal.ts) | three commands typed in behind a cursor |
| [fx-chain-banner.ts](fx-chain-banner.ts) | a banner in rainbow bands, swaying: `chain()` |
| [fx-chain-card.ts](fx-chain-card.ts) | commands typing in, an outline growing round them, a shadow |
| [fx-custom-reflection.ts](fx-custom-reflection.ts) | a rippling reflection, an effect of your own with `effect()` |

## layouts

| file | what it is |
| --- | --- |
| [compose-dashboard.ts](compose-dashboard.ts) | four of the library's charts in a `grid()` of titled boxes |
| [compose-logos.ts](compose-logos.ts) | three logos dissolving into each other with `sequence()` |
| [compose-starfield.ts](compose-starfield.ts) | a banner on the starfield and a ship flying past: `layer()` |
| [compose-banner-scene.ts](compose-banner-scene.ts) | a banner hung in the sky of the ocean sunset scene: `over()` |

## images

| file | what it is |
| --- | --- |
| [image-logo.ts](image-logo.ts) | the python logo from a PNG, in its own colours, glinting |
| [image-photo.ts](image-photo.ts) | the full Moon from a photo, shaded |
| [image-badge.ts](image-badge.ts) | the logo with `drawImage()` beside a REPL that types |

## materials

| file | what it is |
| --- | --- |
| [materials-glass.ts](materials-glass.ts) | a glass of water with bubbles: a cup, what is in it, what it is made of |
| [materials-coffee.ts](materials-coffee.ts) | a mug of coffee with steam |
| [materials-cola.ts](materials-cola.ts) | cola with fizz, bobbing ice and a striped straw |
| [materials-candle.ts](materials-candle.ts) | a candle, its flame and a line of smoke |
| [materials-lava-lamp.ts](materials-lava-lamp.ts) | lava rising and sinking in a lamp |
| [materials-aquarium.ts](materials-aquarium.ts) | a tank with seaweed, sand, a swimming goldfish and bubbles |
| [materials-house.ts](materials-house.ts) | a house at night: stars, a moon, a cloud, lit windows, chimney smoke |
| [materials-rocket.ts](materials-rocket.ts) | a rocket of your own outline, engines lit, with a material and an emission of your own |
| [materials-tv.ts](materials-tv.ts) | a television showing the library's donut, with `texture()` |

## svg drawings

| file | what it is |
| --- | --- |
| [vector-heart.ts](vector-heart.ts) | an SVG heart, beating |
| [vector-star.ts](vector-star.ts) | an SVG star with the logos' glint |
| [vector-logo.ts](vector-logo.ts) | a lightning bolt cut out of a rounded square, turning |
| [vector-glass.ts](vector-glass.ts) | a drawn glass: its water ripples, its bubbles rise |
| [vector-ball.ts](vector-ball.ts) | a ball that bounces and squashes, with a motion of your own |
| [vector-coffee.ts](vector-coffee.ts) | a line icon drawing itself with `"trace"` |
| [vector-tv.ts](vector-tv.ts) | a drawn television playing the library's matrix rain |

`assets/` holds the two images the image examples read: `python.png` and `moon.png`.
