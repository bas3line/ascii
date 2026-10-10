---
layout: ../../layouts/Docs.astro
title: images
description: fromImage() turns any image, a logo or a photo, into an ascii piece in code, in the browser or in Node, with the same drawing as the make page.
---

`fromImage()` turns an image into a piece, in code. It draws it the way [ascii.rest/make](/make/) does: a logo's edges become the characters whose shape matches them, and a photo is shaded. It keeps the image's own colours, lifted on a dark page so they still read, and can glint like the library's logos.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/kit-image.mp4" poster="https://cdn.ascii.rest/videos/kit-image.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>A PNG drawn as ascii with fromImage(), in its own colours with a glint, then pixel art typed as rows with fromPixels().</figcaption>
</figure>

```ts
// logo.ts
import { fromImage } from "ascii.rest/kit";

export default await fromImage(new URL("./logo.png", import.meta.url), { name: "my logo", width: 40, glint: true });
```

With the Python logo as `logo.png`, at 1 second, its glint crossing:

```text

            _/////888888qq_
           \//""/88888888888,
           ///_.q88888888888p
           ////8888888888888P
     .______________88888888P______
   _p888/////888888888888888P|88888q,
  .88888////8888888888888888P|8888888
  q8888////88888888888888888'p8888888|
  d888////88888888888888PP"_888888888b
  d88////88P\ppqqqqqqqqqq888888888888b
  |8/////8P\8888888888888888888888888(
   /////88|d888888888888888888888888P
   '///888|d88888888888888888888888P'
     '""""'d88888888________""""""'
           d8888888888888888P
           d88888888888"  88P
           '88888888888qqp8P'
             '"Y88888888P"'

```

In colour it is blue and yellow, as the logo is. It glints every 5 seconds.

## What it reads

In a browser, `fromImage()` takes a URL, a `data:` URL, SVG markup, a `Blob` or `File` (from an `<input type="file">`, say), an `<img>`, an `ImageBitmap` or a canvas. It reads any format the browser itself decodes, PNG, JPG, WebP, GIF and SVG among them. Nothing leaves the page. Another site's URL must allow it with CORS.

In Node, it reads a **PNG**: a path, a `file:` URL like the one above, an `http(s)` URL, its bytes, or a `Blob`. It decodes the PNG itself, so a script that writes a README's SVG needs nothing else. For another format in Node, decode it with a library of your choice and pass the pixels to `fromPixels()`.

It returns a promise: `await` it.

## Options

| option | what it does | default |
| --- | --- | --- |
| `width` | the most columns, its margin included, 8 to 320 | `48` |
| `height` | the most rows, its margin included | `120` |
| `style` | `"logo"`: characters by the shape of the edge. `"shade"`: characters by brightness, for a photo. `"pixels"`: pixel art, two pixels a cell in `▀`, `▄` and `█`, scaled by whole numbers so every pixel stays square, in its top 8 colours. | by the image |
| `background` | `"remove"` takes a plain border colour out. `"keep"` draws it. | `"remove"` |
| `color` | the image's own colours, up to 8. `false`: one ink. | `true` |
| `glint` | the logos' glint, crossing every 5 seconds, or `{ every }` | `false` |
| `ramp` | for `"shade"`: the characters from light to dense | `".:-=+*#%@"` |
| `invert` | for `"shade"`: turn the ramp round. `"auto"` on a light page. | `"auto"` |
| `name`, `note`, `category` | its name, its line, its category | `"image"`, from the name, `"logos"` |

A photo is found by itself: an image with no plain background, or one whose tones change all through it. So is pixel art: an image of 16 colours or fewer, with no soft edges, small enough to draw at least twice its size. Pass `style` to choose.

A small logo is sensitive to its width, since each cell is a large part of it. Try a few widths.

## An image in your own piece

`drawImage(s, image, x, y, o?)` draws an image into a grid you are drawing already, beside text and the rest. `imagePalette(image, colors?)` gives the piece the image's colours after any of your own:

```ts
// repl.ts
import { drawImage, fromImage, imagePalette, piece } from "ascii.rest/kit";

const logo = await fromImage(new URL("./logo.png", import.meta.url), { width: 30 });
const palette = imagePalette(logo, { light: ["#1f2328", "#6e7781"], dark: ["#f0f6fc", "#8b949e"] });
const line = "print('hello, ascii')";

export default piece({ name: "python repl", cols: 58, rows: 15, loop: 5, palette }, (t, s) => {
  const k = Math.floor((t % 5) * 14);
  drawImage(s, logo, 0, 0, { t, glint: true });
  s.write(32, 5, "Python 3.14");
  s.write(32, 7, ">>>", 1);
  s.write(36, 7, line.slice(0, k));
  if (k > line.length + 4) s.write(32, 8, "hello, ascii\n>>>", 1);
});
```

```text

         _///88888qq,
        :/| |88888888,
        |//8888888888:
   ._p////qqqqq888888|qqqq,
  .88////888888888888|88888,    Python 3.14
  q8/////88888888888Pq88888p
  8/////8P"________pp8888888    >>> print('hello,
  /////8(p88888888888888888P
  '///88|888888888888888888'
   '"YPP|888888PPPPPPPPPP"'
        |888888888888:
        '88888888(.q8'
         '"8888888P"'

```

Your colours come first, so colour `0` is the text's ink and `1` its grey, on both pages.

## Pixels and drawings

| function | what it does |
| --- | --- |
| `fromPixels(rgba, width, height, o?)` | RGBA pixels, as `ImageData.data` holds them, as a piece. Works anywhere. |
| `fromPixels(rows, colors, o?)` | pixel art typed as rows of characters, each standing for a colour; `.` and a space are clear |
| `drawing(rgba, width, height, o?)` | the same pixels as a drawing: its characters and colours, row by row, with no piece |
| `fromDrawing(drawing, o?)` | a drawing as a piece |
| `readPng(bytes)` | a PNG's bytes as `{ data, width, height }`, in Node or anywhere. Up to 16384 pixels a side and 40 million in all: a bigger one, or one whose data inflates past its size, throws at once. |

Pixel art can be typed:

```ts
// invader.ts
import { fromPixels } from "ascii.rest/kit";

export default fromPixels(
  [
    "..g.....g..",
    "...g...g...",
    "..ggggggg..",
    ".gg.ggg.gg.",
    "ggggggggggg",
    "g.ggggggg.g",
    "g.g.....g.g",
    "...gg.gg...",
  ],
  { g: "#3fb950" },
  { name: "invader", width: 24 },
);
```

```text
    ▀▄   ▄▀
   ▄█▀███▀█▄
  █▀███████▀█
  ▀ ▀▄▄ ▄▄▀ ▀
```

A character in the rows with no colour throws, naming it.

A drawing is plain data: `art` holds its rows of characters, so you can print a logo as text with no player at all:

```ts
// print-logo.ts
import { readFileSync } from "node:fs";
import { drawing, readPng } from "ascii.rest/kit";

const { data, width, height } = await readPng(readFileSync(new URL("./logo.png", import.meta.url)));
console.log(drawing(data, width, height, { width: 30 }).art.join("\n"));
```

## Next

- [image to ascii](/docs/images/): the same drawing in your browser, with an embed and two SVGs to copy.
- [effects](/docs/kit-fx/): `dissolve()` or `scan()` an image piece.
