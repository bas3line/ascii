---
layout: ../../layouts/Docs.astro
title: github readme
description: Put a moving logo, or your name in big block letters, at the top of a GitHub README.
---

A GitHub README can't run scripts, so ascii.rest serves animated SVG images that you link to. You can add two kinds:

- A logo, company or Linux distro from the library, by its name. Each of these is a **piece**: one animation.
- A **banner**: any text you like, in big block letters.

<figure class="video">
  <video src="https://xd8s9bimnuiwf5ec.public.blob.vercel-storage.com/videos/banner-maker.mp4" poster="https://xd8s9bimnuiwf5ec.public.blob.vercel-storage.com/videos/banner-maker.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>The banner maker: typing a name, picking colours and a logo, copying the snippet, and the banner on GitHub.</figcaption>
</figure>

Paste this into your `README.md`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/hello.dark.svg?color=f97316,f778ba">
  <img alt="hello" src="https://ascii.rest/banner/hello.svg?color=f97316,f778ba">
</picture>
```

GitHub shows this:

<div class="demo"><img src="/banner/hello.svg?color=f97316,f778ba" alt="HELLO in block letters, fading from orange to pink"></div>

Here is how it works:

- Every image comes as two files. The `.svg` file is for GitHub's light theme. The `.dark.svg` file is for its dark theme.
- The `<picture>` tag shows the file that matches the reader's theme.
- The animation is CSS inside the SVG, so it needs no script.
- If the reader has asked their system for reduced motion, the image holds still.

## Add a logo

Every logo, company and Linux distro in the library has a README image. There are two URLs for each one:

| URL | for |
| --- | --- |
| `https://ascii.rest/svg/<name>.svg` | GitHub's light theme |
| `https://ascii.rest/svg/<name>.dark.svg` | GitHub's dark theme |

`<name>` is the piece's name, with dashes: `rust`, `arch-linux`, `vercel`. It is also the last part of the piece's URL on ascii.rest. For example:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/svg/rust.dark.svg">
  <img alt="rust" src="https://ascii.rest/svg/rust.svg" width="320">
</picture>
```

<div class="demo"><img src="/svg/rust.svg" alt="the Rust logo in ascii, with a glint crossing it" width="320"></div>

Set `width` (or `height`) on the `<img>`. Without it, a logo shows at its full size. That is 290 to 790 pixels wide, depending on the logo. Rust's is 640, so `width="320"` above shows it at half size.

You don't have to write this yourself. On every logo's page, the **readme** tab has the snippet, and **[copy readme snippet]** copies it. The snippet sets `width` to half the logo's full size.

The library's other pieces, such as [donut](/donut/), have no hosted image: `https://ascii.rest/svg/donut.svg` returns 404. To put one of those in a README, [make the SVG yourself](#make-your-own-svg-and-commit-it).

For your own logo, which isn't in the library, make the two SVGs on [image to ascii](/make/), then commit them next to your README. The [image to ascii docs](/docs/images/#add-it-to-a-github-readme) have the steps.

## Add a banner with any text

A banner is your text in big block letters. Put the text in the URL:

| URL | for |
| --- | --- |
| `https://ascii.rest/banner/<text>.svg` | GitHub's light theme |
| `https://ascii.rest/banner/<text>.dark.svg` | GitHub's dark theme |

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/your%20name.dark.svg">
  <img alt="your name" src="https://ascii.rest/banner/your%20name.svg">
</picture>
```

What the text can hold:

- Up to 20 characters.
- Letters, digits, spaces, and these marks: `. , ! ? ' : - + = / _`
- Letters are always drawn as capitals.
- Any other character is left out. If nothing is left to draw, the URL returns 404.
- Write the text the way a URL needs it: a space is `%20` and a comma is `%2C`. JavaScript's `encodeURIComponent()` does this for you.

With no colour set, the letters are in GitHub's own text colour: dark in the light theme, light in the dark theme. That is why you need both files.

## Change how a banner looks

Add your choices after a `?` at the end of the URL, joined with `&`. Put the same choices on the light URL and the dark URL.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/ferris.dark.svg?color=art&tagline=fast%2C%20safe%2C%20fun&art=rust">
  <img alt="ferris: fast, safe, fun" src="https://ascii.rest/banner/ferris.svg?color=art&tagline=fast%2C%20safe%2C%20fun&art=rust">
</picture>
```

<div class="demo"><img src="/banner/ferris.svg?color=art&tagline=fast%2C%20safe%2C%20fun&art=rust" alt="FERRIS in block letters beside the Rust logo, with the tagline fast, safe, fun"></div>

Every key a banner URL takes:

| key | what it does | values | default |
| --- | --- | --- | --- |
| `color` | The letters' colour. Two or more colours make a fade from the first to the last. `art` uses the main colour of the logo you set with `art`. | Six hex digits, without `#`: `f97316`. Up to eight, separated by commas: `f97316,f778ba`. Or `art`. | GitHub's text colour |
| `effect` | How it moves. | `glint`: a bright band, the glint, sweeps across the letters every few seconds. `type`: the letters type in once, then stay. `still`: no motion. | `glint` |
| `speed` | How fast it moves. | `slow`, `normal`, `fast`. `slow` is 0.6 times as fast as `normal`, and `fast` is 1.8 times. | `normal` |
| `font` | The shape of the letters. | `block`: wide letters, most of them 8 or 10 columns. `slim`: narrow letters, every one 6 columns. | `block` |
| `shadow` | The lines of the drop shadow. | `double` (║ ═), `single` (│ ─), `heavy` (┃ ━), `rounded` (╭ ╯), `ascii` (\| - +), `none` | `double` |
| `fill` | The character the letters are made of. | `shade`: ▓ in the dark theme, █ in the light theme. `block`: █. `light`: ▒. `hash`: #. `at`: @. | `shade` |
| `tagline` | A line of plain text under the letters. It types out one character at a time, then a cursor blinks after it. With `effect=still`, it shows at once, with no cursor. | Any text, up to 60 characters. | none |
| `art` | A logo, company or distro next to the letters. | The name of any [logo image](#add-a-logo): `rust`, `arch-linux`, `vercel`. | none |
| `place` | Where the art goes. Only used with `art`. | `left`, `right`, `above`, `below` | `left` |
| `size` | How big GitHub shows it. | `s`, `m`, `l`: 3, 5 or 8 pixels per column. `hello` is 147, 245 or 392 pixels wide. | `m` |
| `bg` | A background card behind it all. The letters and the art switch to the colours that read on the card, whatever GitHub's theme. | Six hex digits, without `#`: `0d1117`. | none |

A few rules:

- Leave a key out to keep its default.
- Write a space in the tagline as `%20` and a comma as `%2C`. The commas between colours stay as plain commas.
- A value the URL can't take returns 400 with one line that says what it takes, for example `font takes block, slim`.
- A key the URL doesn't know is ignored. A misspelt key gives you the default, not an error.

More examples, each with its URL:

```text
https://ascii.rest/banner/bas3line.svg?color=f97316,f778ba&tagline=making%20ascii.rest
```

<div class="demo"><img src="/banner/bas3line.svg?color=f97316,f778ba&tagline=making%20ascii.rest" alt="BAS3LINE in block letters, fading from orange to pink, with the tagline making ascii.rest"></div>

```text
https://ascii.rest/banner/i%20use%20arch.svg?color=art&effect=type&art=arch-linux&place=above
```

<div class="demo"><img src="/banner/i%20use%20arch.svg?color=art&effect=type&art=arch-linux&place=above" alt="I USE ARCH typing in under the Arch Linux logo"></div>

```text
https://ascii.rest/banner/hello%20world.svg?color=22d3ee,4493f8&font=slim&shadow=rounded&tagline=a%20card%20of%20its%20own&bg=0d1117
```

<div class="demo"><img src="/banner/hello%20world.svg?color=22d3ee,4493f8&font=slim&shadow=rounded&tagline=a%20card%20of%20its%20own&bg=0d1117" alt="HELLO WORLD in slim letters with a rounded shadow, on a dark card"></div>

```text
https://ascii.rest/banner/old%20school.svg?color=3fb950&effect=still&shadow=ascii&fill=hash
```

<div class="demo"><img src="/banner/old%20school.svg?color=3fb950&effect=still&shadow=ascii&fill=hash" alt="OLD SCHOOL in green letters made of hash signs, held still"></div>

## Make a banner by clicking

The [banner maker](/banner/) writes the snippet for you. It shows the banner in both themes as you click.

1. Open [ascii.rest/banner](/banner/).
2. Type your text, and a tagline if you want one.
3. Pick a colour, font, shadow, letters, motion, speed and size. Each one sets a key from the table above: **letters** sets `fill`, and **motion** sets `effect`.
4. To add a logo, pick one under **art**, then pick where it goes.
5. To add a background card, pick one under **card**.
6. Under **use it**, open the **html** tab. Press **centred** if you want it centred.
7. Press **[copy]** and paste the snippet into your README.

The snippet from the maker also wraps the banner in a link to the maker. You can keep the link or remove it.

The other tabs give you the same banner in other forms:

| tab | what you get |
| --- | --- |
| **markdown** | One Markdown image. See [Markdown or HTML](#choose-markdown-or-html). |
| **url** | The light banner's URL on its own. |
| **react** | A `<Banner>` component for a web page. See [react](/docs/react/). |
| **svg** | The `bannerSvg()` code that makes the same SVG in your own code. |
| **terminal** | The `npx ascii.rest banner` command that prints it in a terminal. |
| **cli** | The code that prints it when your own CLI starts. See [terminal](/docs/terminal/). |

Under each preview, **[download svg]** saves that SVG file, so you can commit it to your repository.

The maker's own URL keeps every choice you made. Bookmark it, or send it to someone, to come back to the same banner. If a link to the maker has a value it can't take, the maker keeps the rest of the link and says what it left out.

Every logo's page also has a **[make a banner with it]** link. It opens the maker with the logo's name as the text, the logo as the art, and the logo's colour.

## Choose Markdown or HTML

GitHub READMEs take both Markdown and HTML. Use the HTML `<picture>` snippet when you can.

| | HTML `<picture>` | Markdown image |
| --- | --- | --- |
| light and dark themes | a different image for each | the same image for both |
| set the size | `width` or `height` on the `<img>` | not possible |
| centre it | wrap it in `<p align="center">` | not possible |

The same banner in Markdown, linking to the maker:

```md
[![ferris: fast, safe, fun](https://ascii.rest/banner/ferris.svg?color=art&tagline=fast%2C%20safe%2C%20fun&art=rust)](https://ascii.rest/banner/)
```

Markdown uses the light image in both themes. Its default letters are dark, so they are hard to read in GitHub's dark theme. Set a `color` that reads on both, or set `bg` for a card. With `bg`, the light and dark images are the same anyway.

## Make a profile README

Your GitHub profile shows the README of a public repository named after your username. For the user `sam`, that is the repository `sam/sam`.

1. Create a public repository with the same name as your username.
2. Add a `README.md` file at the top of it.
3. Paste this at the top of the file, with your own text:

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/banner/hi%2C%20i'm%20sam.dark.svg?color=22d3ee,4493f8&effect=type&tagline=i%20build%20tools%20for%20the%20terminal">
    <img alt="hi, i'm sam: i build tools for the terminal" src="https://ascii.rest/banner/hi%2C%20i'm%20sam.svg?color=22d3ee,4493f8&effect=type&tagline=i%20build%20tools%20for%20the%20terminal">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/svg/rust.dark.svg">
    <img alt="rust" src="https://ascii.rest/svg/rust.svg" height="80">
  </picture>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/svg/typescript.dark.svg">
    <img alt="typescript" src="https://ascii.rest/svg/typescript.svg" height="80">
  </picture>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ascii.rest/svg/arch-linux.dark.svg">
    <img alt="arch linux" src="https://ascii.rest/svg/arch-linux.svg" height="80">
  </picture>
</p>
```

The banner types in once each time the page loads, then the tagline types out under it:

<div class="demo"><img src="/banner/hi%2C%20i'm%20sam.svg?color=22d3ee,4493f8&effect=type&tagline=i%20build%20tools%20for%20the%20terminal" alt="HI, I'M SAM typing in, with the tagline i build tools for the terminal"></div>

The row under it is three logos, each 80 pixels tall. Swap in the languages and tools you use.

## Make your own SVG and commit it

The URLs cover the common choices. For anything else, make the SVG in your own code with `bannerSvg()` from `ascii.rest/svg`. Then commit the files to your repository, so your README loads nothing from ascii.rest.

Things `bannerSvg()` can do that a URL can't:

- Time the glint: `glint: { every: 6 }` makes it cross every 6 seconds.
- Make the letters from any character: `fill: "*"`.
- Draw the shadow with 16 characters of your own, or the letters in a font of your own.
- Set the tagline's colour (`taglineColor`), the art's size (`artSize`), and the card's `padding` and `radius`.
- Line everything up at the start, centre or end (`align`).

Every option is on the [svg](/docs/svg/) page.

1. Install the package:

   ```sh
   npm install --save-dev ascii.rest
   ```

2. Save this as `scripts/banner.ts`:

   ```ts
   import { mkdirSync, writeFileSync } from "node:fs";
   import { bannerSvg } from "ascii.rest/svg";
   import { rust } from "ascii.rest/pieces";

   const options = {
     font: "slim",
     color: ["#f97316", "#f778ba"],
     tagline: "fast, safe, fun",
     art: rust,
     glint: { every: 6 },
   } as const;

   mkdirSync(".github", { recursive: true });
   writeFileSync(".github/banner.svg", bannerSvg("my project", options));
   writeFileSync(".github/banner.dark.svg", bannerSvg("my project", { ...options, dark: true }));
   ```

   In code, colours are written with `#`. `dark: true` makes the dark theme's file.

3. Run it. Node runs a `.ts` file as it is from Node 22.18, or 23.6 in Node 23.

   ```sh
   node scripts/banner.ts
   ```

   It writes `.github/banner.svg` and `.github/banner.dark.svg`. If Node warns that the module type isn't specified, add `"type": "module"` to your `package.json`. On an older Node, save the script as `scripts/banner.mjs`, delete `as const`, and run `node scripts/banner.mjs`.

4. Commit both files.

5. Point your README at them with relative paths. GitHub turns these into links to the files in your repository:

   ```html
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset=".github/banner.dark.svg">
     <img alt="my project: fast, safe, fun" src=".github/banner.svg">
   </picture>
   ```

When you change the script, run it again and commit the new files.

The same works for any piece, not only banners. `svg()` turns a piece into an SVG, so you can put [donut](/donut/), which has no hosted image, in a README:

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { svg } from "ascii.rest/svg";
import { donut } from "ascii.rest/pieces";

mkdirSync(".github", { recursive: true });
writeFileSync(".github/donut.svg", svg(donut, { scale: 5 }));
writeFileSync(".github/donut.dark.svg", svg(donut, { dark: true, scale: 5 }));
```

`scale: 5` makes it 5 pixels per column, so the donut is 200 pixels wide.

## If an image doesn't show

Open the image's URL in a browser tab. If a banner URL is wrong, it answers with one line of plain text that says what.

| you see | why | fix |
| --- | --- | --- |
| 400 `font takes block, slim` (or another key) | A value the URL can't take. | Use one of the values in [the table](#change-how-a-banner-looks). |
| 400 `a banner takes up to 20 characters` | The text is too long. | Shorten it. |
| 400 `a tagline takes up to 60 characters` | The tagline is too long. | Shorten it. |
| 400 `there is no logo, company or distro called ...` or `art takes the name of a logo ...` | `art` isn't the name of a logo image. Use the piece's name, with dashes: `arch-linux`. | Use a name from [the logo images](#add-a-logo). |
| 400 `color=art takes its colour from the art, so it needs art too` | `color=art` without `art`. | Add `art`, or pick a hex colour. |
| 404 `nothing to draw` | The text has none of the characters a banner can draw. | Use letters, digits or the marks listed [above](#add-a-banner-with-any-text). |
| 404 on `https://ascii.rest/svg/<name>.svg` | That piece has no logo image, or the name is misspelt. | Check the name on the piece's page, or [make the SVG yourself](#make-your-own-svg-and-commit-it). |
| a plain banner, not the one you asked for | A key is misspelt, so it is ignored. | Check each key against [the table](#change-how-a-banner-looks). |
| it doesn't move | Reduced motion is on, `effect` is `still`, or `effect` is `type`, which plays once and stays. | Nothing is broken. To see it move, turn reduced motion off, or use `effect=glint`. |

## Next

- [banners](/docs/banners/): every option of `banner()`, for web pages and terminals.
- [svg](/docs/svg/): `svg()` and `bannerSvg()`, with every option.
- [terminal](/docs/terminal/): print the same banner in a terminal.
