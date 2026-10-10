---
layout: ../../layouts/Docs.astro
title: image to ascii
description: Turn a logo or a photo into animated ascii in your browser, then put it on a web page, in a README, or in the library.
---

[image to ascii](/make/) turns any image into animated ascii, in the image's own colours. Drop in a logo or a photo, and you get three things back: a snippet for any web page, two SVGs for a GitHub README, and a piece file. A **piece** is one of the library's animations, and the file is in the library's own format, ready to add to it.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/make.mp4" poster="https://cdn.ascii.rest/videos/make.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>Image to ascii: a logo dropped in, a JPG's white background left out, a photo shaded, the one-colour view, and the README snippet copied.</figcaption>
</figure>

It all happens in your browser. Your image is never uploaded.

The library's own logos were drawn the same way, like this one:

<div class="demo"><ascii-art piece="go"></ascii-art></div>

## Turn an image into ascii

1. Open [image to ascii](/make/). Every page of this site links to it, as **[image to ascii]** next to **[make a banner]**.
2. Give it an image, in any of these ways:
   - Drop the file anywhere on the page.
   - Press **[pick a file]** and choose one.
   - Copy an image, such as a screenshot, and paste it anywhere on the page.
   - Paste an SVG's markup into the **or paste an svg's markup** box, then press **[draw it]**.
3. The art plays in the box at the top. If the image had a plain background, a message under the art says which colour it left out.
4. Under **settings**, type a name. Change the width, style, motion and category if you want. The art redraws as you change them.
5. Copy what you need from the three boxes at the bottom of the page: **embed it**, **readme**, and the `.ts` file.

The line just under the art sums it up: its size in columns by rows, how many colours it has, how often it moves, and the size of its `.ts` file. For example: `48×32`, `8 colours`, `a glint every 5 s`, `7.4 kB`. **[another image]** on the same line opens a new file.

## Choose a style

The style sets how each cell, one character of the art, is chosen. There are two:

| style | each cell is | use it for |
| --- | --- | --- |
| **logo** | The character whose shape best matches the image's edge through the cell. A solid cell is `8`, and an empty one is a space. | Logos, icons and flat shapes with clear edges. The library's logos are drawn this way. |
| **shade** | A character from `.:-=+*#%@`, denser where the image is brighter. The image's own darkest and brightest parts set the two ends. | Photos, gradients, and anything without clear edges. |

The Go gopher at 32 columns, in the logo style, in one colour. Its white eyes are left out, so they show as gaps:

```text
        __ppq8888888qq_, __
   _p88p8P"""8888P"''"888888,
  :8888P_p,   88Pqp,   88888P
   "8888/Y'  _d8b/"   _8888"
    d8888qqpp88888qqp888888,
    888888888888Y8888888888|
    8888888888qp_8888888888P
    d8888888888888888888888P
    d8888888888888888888888b
  _pp88888888888888888888888q_
  YPO88888888888888888888888Y"
    d88888888888888888888888
    d88888888888888888888888
    888888888888888888888888
    d8888888888888888888888P
    "8888888888888888888888'
     "88888888888888888888"
     _p888888888888888888q,
     O88"'""YP888PP^"" '88"
```

A picture of a sun over hills, in the shade style, as a dark page shows it:

```text
  .::::::::-------=======++++++
  .::::::::-------=+***==++++++
  .::::::::------*@@@@@@*++++++
  .::::::::-----=@@@@@@@@++++++
  .::::::::------#@@@*-:==+++++
  .::::....::-----==......:-+++
  ............:::............-=
  .............................
  .............................
```

Each image starts in the style that suits it:

- An SVG starts in **logo**. So does an image with transparency, or with a plain background.
- An image with no transparency and no plain background, such as a photo, starts in **shade**.

Press the other style at any time to switch.

## Keep or remove the background

A JPG, or any image with no transparency, usually sits on a plain background. The page takes that background out, so the logo stands on its own.

Here is how:

- It looks at the pixels round the image's edge. If 6 in 10 of them or more are one colour, that colour is the background. If not, it takes nothing out.
- It removes that colour from the edges inwards. The same colour inside the logo, such as white letters on a shape, stays.
- It says which colour it took out, for example `left out its background, #ffffff`.

To put the background back, press **[keep the background]**. The art is drawn again from the whole image, background and all. Press **[remove the background]** to take it out again. Either button draws the image again in the **logo** style, so press **shade** again if you want it shaded.

The button shows only when a background was found. Nothing is taken out of:

- an SVG;
- an image with transparency of its own, such as a PNG whose edges are clear;
- an image whose border isn't mostly one colour, such as most photos.

## Change the settings

Every setting redraws the art and rewrites the snippets and the file.

| setting | what it does | default |
| --- | --- | --- |
| name | The piece's name. It names the files and sets the text screen readers read. File names are in lower case with dashes between words: `Acme Co!` makes `acme-co.ts`. A name can have up to 32 characters: letters a to z, digits, spaces and `. + # ! _ ' -`. Any other character becomes a space. A name that starts with a digit gets `logo-` in front: `7up` makes `logo-7up.ts`. | The image's file name, without its extension, or `my logo`. Once you type a name, a new image keeps it. Pasted markup keeps the name already there. |
| width | About how many columns wide the art is, from 16 to 80. A tall image comes out narrower, because a piece has at most 32 rows. Below 16 counts as 16, and above 80 as 80. 0 or an empty box counts as 64. | 64 |
| style | **logo** or **shade**. See [choose a style](#choose-a-style). | **logo**, or **shade** for a photo |
| motion | **glint**: a bright band that sweeps across the art. **scan**: a line that runs down it and scrambles the characters it passes. | **glint** |
| every | The seconds from one glint or scan to the next, from 3 to 60. | 5 |
| category | Which of the library's categories the piece is in: **companies**, **logos** (programming languages and web tools) or **distros** (Linux distributions). It is written into the `.ts` file. | **companies** |
| [mono] | Shows the art in one colour, the page's text colour, in a `<pre>`. **[colour]** shows it in its own colours again, on a `<canvas>`. The embed snippet follows your choice, and the site remembers it. | colour |

Motion and category go together, as they do in the library: a distro scans, and a company or a language glints. Picking **distros** picks **scan**, and picking **scan** picks **distros**. Picking **glint** on a distro makes it a company.

In one colour, the art changes in two ways so it still reads:

- In the logo style, a logo with white among its colours leaves the white out. White letters on a coloured shape show as gaps.
- In the shade style, on a light page, the characters swap ends: the densest now mark the darkest parts, because dark ink on a light page reads as dark. Otherwise the picture would show as a negative.

## Embed it on any web page

The **embed it** box holds a snippet for any HTML page. It needs no install and no build step. Press **[copy]**, then paste it where you want the art.

The snippet is an element and a script. The script loads `mount()` from `https://ascii.rest/mount.js` and plays your piece, which is written out in full inside it. Shortened, a piece named `acme` looks like this:

```html
<canvas id="ascii-acme" role="img" aria-label="acme" style="width: 100%; max-width: 480px"></canvas>
<script type="module">
import { mount } from "https://ascii.rest/mount.js";

// acme, drawn in ascii on https://ascii.rest/make/
const meta = {
  name: "acme",
  category: "companies",
  ...
};
// ... the art, its colours, and the code that draws it at each moment ...
mount(document.getElementById("ascii-acme"), { meta, default: acme });
</script>
```

What it does on your page:

- In colour, it draws on a `<canvas>`. With **[mono]** on, the snippet uses a `<pre>` in your page's text colour instead.
- It reads your page's text colour to tell a light page from a dark one, and uses the colours made for that page.
- It plays only while it is on screen and its tab is open. For readers who prefer reduced motion, it holds still.

To change it:

- **Make it smaller or bigger:** change `max-width` on the `<canvas>`. On the `<pre>`, change the `10px` in its `font`.
- **Put two on one page:** give each its own name. The element's `id` is `ascii-` and the name, so two with the same name clash.

If nothing shows, work through [nothing shows up](/docs/faq/#nothing-shows-up-what-should-i-check). If your site sends a `Content-Security-Policy` header, its `script-src` must allow `https://ascii.rest` and this inline script: add the script's hash, a nonce, or `'unsafe-inline'`.

## Add it to a GitHub README

A README can't run scripts, so the page makes two animated SVG files: one for GitHub's light theme and one for its dark theme.

1. Press **[light svg]**. It saves `<name>.svg`.
2. Press **[dark svg]**. It saves `<name>.dark.svg`.
3. Put both files in your repository, next to `README.md`, and commit them.
4. Copy the snippet from the **readme** box into your README. For `acme`, it is:

   ```html
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="acme.dark.svg">
     <img alt="acme" src="acme.svg" width="240">
   </picture>
   ```

How it works:

- GitHub shows `acme.dark.svg` in its dark theme, and `acme.svg` in its light theme.
- Each SVG plays one loop of the glint or the scan, again and again, with no script. For readers who prefer reduced motion, it holds still.
- `width` is 5 pixels for each column. Change it to show the art bigger or smaller.
- To keep the files in another folder, change both paths, for example to `.github/acme.svg` and `.github/acme.dark.svg`.

[github readme](/docs/readme/) has more on images in a README.

## Add it to the library

The last box holds `<name>.ts`: the piece in the library's own format. It has the piece's `meta`, the art, its colours, and the same glint or scan code as the library's logos. Press **[download]** to save it, or **[copy]**.

The library takes the logos of programming languages and web tools, of companies, and of Linux distributions. To add one:

1. Start from the official logo, such as an SVG from its owner's brand page, Simple Icons or devicon.
2. Pick its category, and keep the **logo** style.
3. Give it a name the library doesn't have yet. If the name is taken, the page says so: `the library already has a piece called python: give this one another name to add it`.
4. Download the `.ts` file.
5. In the comment at the top of the file, say where the logo's artwork came from.
6. Save it in the repo as `src/pieces/<name>.ts`, check it, and open a pull request. [Add it to the library](/docs/pieces/#add-it-to-the-library) has every step. The file already imports its types from `../types.ts`, as the library's pieces do, so skip step 3 there.

In short, with Node 23.6 or later:

```sh
git clone https://github.com/bas3line/ascii
cd ascii
npm install
# save the file as src/pieces/acme.ts, then:
npm run gen
npm run check -- acme --show
npm run typecheck
```

To play the file in your own app instead, change its import line to `import type { Frame, Meta } from "ascii.rest";`. Then use it as you would any piece you wrote: [play it in React or Next.js](/docs/pieces/#play-it-in-react-or-nextjs).

## Formats it takes

Any image your browser can open works. Each format is drawn like this:

| format | what happens |
| --- | --- |
| SVG | Drawn as an image, so no script in it runs and it loads nothing. It needs a `viewBox`, or a `width` and a `height`. Up to 4 MB. |
| PNG, WebP | A clear background stays clear. With no transparency, the plain background is left out. |
| JPG | Its plain background, if it has one, is left out. |
| GIF | Only its first frame is drawn. |
| any other image, such as AVIF or BMP | Drawn the same way as a PNG. |

- Images other than SVGs can be up to 40 MB. The page first draws every image 2400 pixels across, the longer way, so a larger image adds no detail.
- SVG markup copied out of a web page often has no `xmlns`. The page adds it for you.

## Your image stays in your browser

The page does all of its work in your browser:

- Your image is never uploaded, and nothing about it is sent anywhere.
- The SVGs and the `.ts` file are made on your computer and saved from your browser.
- An SVG is drawn as an image, which runs none of its scripts and loads nothing from elsewhere.

Of what the page gives you, only the embed snippet loads anything from elsewhere: on your own page, it loads `mount.js` from ascii.rest.

## Common problems

A message under the art says what went wrong. Each message, and the other things people run into:

| you see | why | fix |
| --- | --- | --- |
| `that is not an image: try an svg, png, jpg, webp or gif` | The file isn't an image. | Pick an image file. |
| `that image could not be read: try an svg, png, jpg, webp or gif` | Your browser can't open the file. It may be damaged, or in a format your browser doesn't support. | Open it in an image editor and save it as a PNG. |
| `that image is over 40 MB: try a smaller one` | The file is too big. | Make it smaller. 2400 pixels across is plenty. |
| `that svg is over 4 MB, which is a lot for a logo` | The SVG is too big. | Simplify it, or save it as a PNG. |
| `that svg has no size: give it a viewBox` | The `<svg>` tag has no `viewBox`, and no `width` and `height`. | Add a `viewBox`, such as `viewBox="0 0 24 24"`, with your drawing's own width and height. |
| `that is not an svg` or `that svg could not be read` | The pasted text has no `<svg>` tag, or the markup has a mistake in it. | Paste the whole `<svg>` element, from `<svg` to `</svg>`. |
| `that svg could not be drawn` | Your browser couldn't draw it as an image. | Export it again from your design tool, or save it as a PNG. |
| `that svg draws nothing` or `that image is all background` | Nothing is left to draw. | Check the image shows something. A logo the same colour as its background is all background. |
| a box or a colour stays round the logo | The image's border isn't mostly one colour, so nothing was taken out. A gradient, a shadow or a photo behind the logo does this. | Crop the image closer to the logo, or use a PNG with a clear background, or an SVG. |
| part of the logo is missing | That part is the background's colour and touches it, so it was taken out too. | Press **[keep the background]**, or use a PNG with a clear background. |
| the art is narrower than the width you set | The image is tall, and a piece has at most 32 rows. | Nothing is wrong. |
| `the library already has a piece called ...` | A library piece has that name. It matters only if you add yours to the library. | Type another name. |
| the art doesn't move | Your system asks for reduced motion. | Press **[play anyway]** at the top of the page. |

## Next

- [images in the kit](/docs/kit-image/): the same drawing in code, with `fromImage()`, in a browser or in Node.
- [github readme](/docs/readme/): more ways to put art in a README, and banners with your own text.
- [your own pieces](/docs/pieces/): what a piece is made of, to change the `.ts` file by hand.
- [html](/docs/html/): the library's tags, for pieces on any web page.
