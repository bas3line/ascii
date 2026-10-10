---
layout: ../../layouts/Docs.astro
title: html
description: Add animated ascii art and text banners to any web page with one script tag, no install and no build step.
---

Add one script tag to an HTML page and you get two new tags. `<ascii-art>` plays a piece. `<ascii-banner>` draws your own text in big block letters.

<figure class="video">
  <video src="https://cdn.ascii.rest/videos/html.mp4" poster="https://cdn.ascii.rest/videos/html.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>Both tags on a plain HTML page, with their attributes changed one at a time.</figcaption>
</figure>

A **piece** is one animation from the library, like `donut` or `night-coast`. You can browse [every piece](/#pieces). A **banner** is any text you choose, drawn in block letters with a drop shadow.

Here is a whole page. Save it as `index.html` and open it in your browser. It works straight from your disk.

```html
<!doctype html>
<html>
  <body>
    <script type="module" src="https://ascii.rest/ascii.js"></script>

    <ascii-art piece="donut"></ascii-art>
    <ascii-banner text="hello"></ascii-banner>
  </body>
</html>
```

You see this:

<div class="demo" style="gap: 1.5rem"><ascii-art piece="donut"></ascii-art><ascii-banner text="hello"></ascii-banner></div>

Two rules to remember:

- Keep `type="module"` on the script tag. Without it, the script does not run.
- Always write the closing tag, `</ascii-art>` or `</ascii-banner>`. In HTML, `<ascii-art />` does not close the tag.

## What the script does

The script at `https://ascii.rest/ascii.js` does the following for you:

- It defines `<ascii-art>` and `<ascii-banner>` for the whole page, including tags you add later with JavaScript.
- It downloads a piece from ascii.rest the first time your page uses it, and only the pieces your page uses.
- It plays a piece only while it is on screen and the tab is open.
- When the reader has turned on reduced motion in their system settings, it shows one still frame instead. A typed banner shows all of its letters.
- It draws text pieces as text, in a `<pre>` inside the tag.
- It draws coloured pieces (scenes, logos, companies and distros), and banners with a colour, on a `<canvas>` inside the tag.

You size the two kinds differently: see [Style the tags with CSS](#style-the-tags-with-css).

## Play a piece

Use `<ascii-art>` to play any piece from the library. Give it the piece's name, with dashes: `night-coast`. The name is the last part of the piece's URL: [ascii.rest/night-coast/](/night-coast/) is `night-coast`.

```html
<ascii-art piece="night-coast"></ascii-art>
```

<div class="demo"><ascii-art piece="night-coast" style="width: 100%; max-width: 480px"></ascii-art></div>

These are all the attributes `<ascii-art>` takes:

| attribute | what it does | default |
| --- | --- | --- |
| `piece` | The name of the piece to play, like `donut`. | none |
| `src` | The URL of your own piece file, used instead of `piece`. See [Play your own piece](#play-your-own-piece). | none |
| `options` | JSON that changes the piece's own options. Only some pieces have options. | the piece's own |
| `fps` | How many frames a second it plays. `fps="0"` shows one still frame. | the piece's own |
| `label` | What the picture shows. Screen readers read it out. | the piece's name |
| `mono` | Draws a coloured piece as plain text in one colour. It takes no value: write just `mono`. | off |

### Change a piece's options

Some pieces take options, such as their text. Each piece's page shows its options, with their defaults, in its html example. Pass the ones you want to change as JSON in `options`:

```html
<ascii-art
  piece="typewriter"
  options='{"prefix":"i build ","phrases":["websites.","tools."]}'
></ascii-art>
```

<div class="demo"><ascii-art piece="typewriter" options='{"prefix":"i build ","phrases":["websites.","tools."]}'></ascii-art></div>

Wrap the JSON in single quotes. Then the double quotes inside it stay part of the value.

`options` also takes `motion`. Set `options='{"motion":true}'` to play the piece even for readers who turned on reduced motion. Only do this when your page has its own play or pause button.

### Show something while the piece loads

Anything you put inside the tag shows until the piece is ready. Then the piece replaces it. If the piece can't load, or the name isn't a piece, your content stays. A name that isn't a piece logs nothing.

```html
<ascii-art piece="rust">the rust logo</ascii-art>
```

## Draw text as a banner

Use `<ascii-banner>` to draw any text in block letters. By default the glint, a bright band, sweeps across the letters every few seconds.

```html
<ascii-banner text="hello" color="#f97316,#f778ba"></ascii-banner>
```

<div class="demo"><ascii-banner text="hello" color="#f97316,#f778ba" style="width: 100%; max-width: 420px"></ascii-banner></div>

These are all the attributes `<ascii-banner>` takes:

| attribute | what it does | default |
| --- | --- | --- |
| `text` | The text to draw. Lower case letters are drawn as capitals, except in the `mixed` font. | none |
| `font` | The letters: `block`, `slim`, `tall`, `bold`, `round`, `wide`, `mixed` or `italic`. [banners](/docs/banners/#change-the-font) shows each one. | `block` |
| `shadow` | The drop shadow's lines: `double`, `single`, `heavy`, `rounded`, `ascii`, `none`, or 16 characters of your own. | `double` |
| `fill` | The one character the letters are made of, like `#`. | `▓` on a dark page, `█` on a light one |
| `effect` | How it moves: `glint` (the glint sweeps across now and then), `type` (the letters type in one at a time, then stay) or `still`. | `glint` |
| `speed` | How fast it moves, as a number above 0. `2` is twice as fast. | `1` |
| `color` | The letters' colour, as `#rrggbb`. List two or more, separated by commas, for a fade from the first to the last. | the page's text colour |
| `shadow-color` | The shadow's colour, as `#rrggbb`. | a muted grey, when the banner has a colour |
| `pixel` | How many columns wide each pixel of the font is, as a whole number. `1` makes thin letters. | `2` |
| `gap` | How many columns go between letters, as a whole number. | `2` |
| `options` | JSON for the options that have no attribute of their own: `glint`, `type`, `pad`, `size`, `max`, `name`, and a `color` for each theme. | none |
| `label` | What the banner says. Screen readers read it out. | the text |
| `mono` | Draws a banner that has a colour as plain text in one colour. It takes no value. | off |

If you set the same option twice, in an attribute and inside `options`, the attribute wins. An empty attribute, like `font=""`, counts as no attribute.

The fonts draw the letters A to Z, the digits 0 to 9, spaces, and these marks: `. , ! ? ' : - + = / _`. They leave out every other character.

Sometimes a banner can't be drawn: an attribute has a value it can't take, or the text has nothing the font can draw, such as only spaces. Then the tag keeps what it showed before, such as anything you put inside it. The browser's console says why:

```text
<ascii-banner> could not draw: Error: ascii.rest: a colour takes #rrggbb, not "#fff"
```

Colours need all six digits: write `#ffffff`, not `#fff`.

### Change how a banner looks

Each of these changes one attribute. The text says which:

```html
<ascii-banner text="slim" font="slim"></ascii-banner>
<ascii-banner text="rounded" shadow="rounded"></ascii-banner>
<ascii-banner text="fill" fill="#"></ascii-banner>
<ascii-banner text="typed" effect="type"></ascii-banner>
<ascii-banner text="thin" pixel="1"></ascii-banner>
```

<div class="demo" style="gap: 1.5rem"><ascii-banner text="slim" font="slim"></ascii-banner><ascii-banner text="rounded" shadow="rounded"></ascii-banner><ascii-banner text="fill" fill="#"></ascii-banner><ascii-banner text="typed" effect="type"></ascii-banner><ascii-banner text="thin" pixel="1"></ascii-banner></div>

### Give each theme its own colour

A coloured banner reads the CSS `color` of its tag to tell a light page from a dark one. Dark text means a light page. To give each theme its own colour, pass `color` as `light` and `dark` inside `options`:

```html
<ascii-banner
  text="hi"
  options='{"color":{"light":"#0969da","dark":"#58a6ff"}}'
></ascii-banner>
```

Every other banner option, such as how often the glint comes or the space around the letters, is in [the banner options](/docs/banners/#options). Pass it the same way: `options='{"pad":1,"glint":{"every":6}}'`.

## Change a tag from JavaScript

The tags watch their attributes. When you change one, the piece or banner starts again with the new value. This button switches between three pieces:

```html
<ascii-art id="art" piece="donut"></ascii-art>
<button id="next">next piece</button>

<script type="module">
  const art = document.querySelector("#art");
  const names = ["donut", "rust", "night-coast"];
  let i = 0;
  document.querySelector("#next").addEventListener("click", () => {
    i = (i + 1) % names.length;
    art.setAttribute("piece", names[i]);
  });
</script>
```

## Style the tags with CSS

Style the tags like any other element. Their built-in styles have no specificity, so any rule of yours wins. What you set depends on how the tag draws:

- **A text piece, or a banner with no colour,** is text. `font-size` sets its size and `color` sets its colour.
- **A coloured piece, or a banner with a colour,** is a canvas that fills the tag's width. `width` or `max-width` on the tag sets its size. Its colours come from the piece, or from the banner's `color`.

```css
/* text pieces, and banners with no colour */
ascii-art,
ascii-banner {
  font-size: 10px;
  color: teal;
}

/* a coloured piece fills the tag's width */
ascii-art.logo {
  max-width: 320px;
}
```

Watch out for these:

- A banner with a colour is as wide as its container. On a wide page, a short word is drawn very large. Give the tag a `max-width`.
- Inside a grid or flex container that centres its items, a coloured tag has no width of its own to fill. Its size then depends on the screen: 300 pixels wide on some, the container's full width on others. Give the tag a `width`, such as `width: 320px`.
- Text pieces use a monospace font with `letter-spacing: 0`, so every row lines up. That font is set on the `<pre>` inside the tag, so `font-family` on the tag itself changes nothing. To change it, set `font-family` on `ascii-art pre`, and choose another monospace font.

Some systems' monospace fonts, such as Android's, have no box drawing or block characters. On those, text pieces use a 3 KB font from ascii.rest for just those characters.

## Play your own piece

Any file that follows the piece contract plays in `<ascii-art>`. Put its URL in `src`, instead of `piece`.

1. Save this file as `art/blink.js`, next to your page. It exports `meta`, the piece's size and frame rate, and a default function. That function returns `frame(t)`, which returns the picture at `t` seconds as text.

   ```js
   // art/blink.js
   export const meta = {
     name: "blink",
     category: "shapes",
     note: "a dot that blinks",
     cols: 5,
     rows: 1,
     fps: 4,
   };

   export default function blink() {
     return (t) => (Math.floor(t * 2) % 2 ? "  ●  " : "  ○  ");
   }
   ```

2. Point a tag at it:

   ```html
   <ascii-art src="art/blink.js"></ascii-art>
   ```

3. Serve the page from a web server. A page opened from your disk can't load a module like this one: browsers block it. Any local server works, for example `python3 -m http.server` run in the page's folder.

`src` works like a link: a relative URL starts from the page's own. A file on another site must allow cross-origin requests (CORS).

If the file can't load, the tag keeps what it showed before. The console logs `<ascii-art> could not load`, then the `src` you gave and the browser's reason.

Every field of `meta` is in [Fill in its meta](/docs/pieces/#fill-in-its-meta). How to add colour is in [Draw it in colour](/docs/pieces/#draw-it-in-colour).

## Pin a version

`https://ascii.rest/ascii.js` always serves the newest version, so it can change without you doing anything. To stay on one version, load the same file from npm through jsDelivr, with an integrity hash. The browser then runs the file only if it matches the hash.

1. Pick a version. `npm view ascii.rest version` prints the newest one, and [the package's versions on npm](https://www.npmjs.com/package/ascii.rest?activeTab=versions) lists them all. `<ascii-banner>` needs 0.4.0 or later.

2. Make the file's hash. Put your version in the URL:

   ```sh
   curl -s https://cdn.jsdelivr.net/npm/ascii.rest@0.4.0/dist/ascii.js | openssl dgst -sha384 -binary | openssl base64 -A
   ```

3. Put the same URL in the script tag, and paste the hash after `sha384-`:

   ```html
   <script
     type="module"
     src="https://cdn.jsdelivr.net/npm/ascii.rest@0.4.0/dist/ascii.js"
     integrity="sha384-PASTE-YOUR-HASH-HERE"
     crossorigin="anonymous"
   ></script>
   ```

The hash checks `ascii.js` only. The pieces it loads come from the same version on jsDelivr, and a version on npm never changes once it is published. The 3 KB font for box drawing and block characters still comes from ascii.rest, on the systems that need it.

## Use the tags in a bundled app

In an app with a bundler, such as Vite, install the package instead of using the script tag:

```sh
npm install ascii.rest
```

Then import the tags once, in a file that runs in the browser:

```ts
import "ascii.rest/element";
```

Now `<ascii-art>` and `<ascii-banner>` work in your HTML, and the pieces come from your own bundle, not from ascii.rest. Bundlers put each piece in its own file, which loads the first time a page uses it. On a server there is no DOM, so the import does nothing there. That makes it safe in code that runs on both.

You can change the tags from TypeScript as well:

```ts
import "ascii.rest/element";

const art = document.querySelector("ascii-art");
art?.setAttribute("piece", "rust");
```

To use `<ascii-art>` under another name too, call `define` with that name. It must have a hyphen in it, as every custom tag's name must:

```ts
import { define } from "ascii.rest/element";

define("pixel-art"); // <pixel-art piece="donut"></pixel-art> now works as well
```

In React, use the `<Ascii>` and `<Banner>` components instead: see [react](/docs/react/).

## When nothing shows

Work through the checklist in [Nothing shows up. What should I check?](/docs/faq/#nothing-shows-up-what-should-i-check), in order.

## Next

- [banners](/docs/banners/): every banner option, with examples.
- [your own pieces](/docs/pieces/): write a piece and play it anywhere.
- [react](/docs/react/): the same two tags as React components.
