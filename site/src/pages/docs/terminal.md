---
layout: ../../layouts/Docs.astro
title: terminal
description: Play any piece in your terminal, print your text as a banner, or add a splash screen to your own command-line tool.
---

ascii.rest works in a terminal as well as on a web page. You can play any piece with one command, print your text in big block letters, or show an animation when your own command-line tool starts. You need Node 18.3 or newer, and nothing else.

<figure class="video">
  <video src="https://xd8s9bimnuiwf5ec.public.blob.vercel-storage.com/videos/terminal.mp4" poster="https://xd8s9bimnuiwf5ec.public.blob.vercel-storage.com/videos/terminal.jpg" autoplay muted loop playsinline controls width="1280" height="720"></video>
  <figcaption>npx ascii.rest donut, the banner command, and a splash screen for a CLI made with play().</figcaption>
</figure>

Try it now. The donut turns until you press any key:

```sh
npx ascii.rest donut
```

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

A **piece** is one animation, like `donut` or `rust`. A **frame** is the picture at one moment. A **banner** is your own text drawn in block letters. A banner's [glint](/docs/banners/#change-the-glint) is a bright band that sweeps across the letters.

## Choose what to use

You can use it in two ways: the `npx ascii.rest` command, or three functions you import from `ascii.rest/terminal` into your own Node program.

| you want | use |
| --- | --- |
| to see a piece or a banner, with no code | `npx ascii.rest` |
| a piece on the whole screen for a moment, then gone, like a splash screen | `play()` |
| your text in block letters that stays in the output, like a CLI's header | `banner()` |
| one frame as a plain string, for a log, a `--help` screen or a file | `still()` |

`play()` and `banner()` behave differently. `play()` takes over the screen and gives it back when it stops, so nothing is left behind. `banner()` prints where the cursor is, moves once, and stays in the scrollback with the rest of your output.

## Play a piece with npx

Use these to see any piece without writing code.

```sh
npx ascii.rest donut                      # plays until you press a key
npx ascii.rest night-coast --seconds 10   # stops after 10 seconds
npx ascii.rest list                       # the name of every piece, by category
```

Coloured pieces (scenes, logos, companies and distros) play in their own colours. Every other piece is a text piece, and plays in your terminal's own text colour.

Every flag, like `--mono` for no colour and `--light` for a light terminal, is on [cli](/docs/cli/#play-a-piece). So is what happens in a small window.

## Print a banner with npx

Use `npx ascii.rest banner` to print any text in block letters. A glint crosses it once, then it stays in your terminal.

```sh
npx ascii.rest banner hi
```

```text
▓▓╗   ▓▓╗ ▓▓╗
▓▓║   ▓▓║ ▓▓║
▓▓▓▓▓▓▓▓║ ▓▓║
▓▓╔═══▓▓║ ▓▓║
▓▓║   ▓▓║ ▓▓║
╚═╝   ╚═╝ ╚═╝
```

Add colours, a line under it, and another shadow:

```sh
npx ascii.rest banner 'my cli' --color ff6a00,f778ba --shadow rounded --tagline 'v1.0'
```

Put the text in single quotes, so your shell leaves `!` and `$` alone. Every flag, and the characters a banner can draw, are on [cli](/docs/cli/#print-a-banner).

## Add a splash screen to your CLI

Use `play()` to show a piece for a moment when your tool starts.

1. Install the package in your CLI's project:

   ```sh
   npm install ascii.rest
   ```

2. Make your entry file an ES module: name it with `.mjs`, or add `"type": "module"` to your `package.json`. ascii.rest is an ES module, and the examples on this page use `await` at the top level.

3. At the top of your CLI's entry file, play a piece:

   ```ts
   import { play } from "ascii.rest/terminal";

   const { interrupted } = await play("donut", { seconds: 2 });
   if (interrupted) process.exit(130);

   console.log("ready");
   ```

4. Run your CLI. The donut plays on a clear screen for two seconds, or until you press a key. Then your terminal shows what it showed before, and your program goes on.

Here is what `play()` does:

- It draws on the alternate screen, the separate screen that programs like `less` and `vim` use, with the cursor hidden.
- It stops after `seconds`, when someone presses any key, or on Ctrl+C. Without `seconds`, it plays until a key.
- Ctrl+C does not end your program. `play()` resolves with `interrupted: true`, and you decide what to do. Exit code 130 is the usual one for Ctrl+C.
- It puts the terminal back however it stops: on an error, if your program exits while it plays, or if the process gets SIGTERM.
- Keys are read from `process.stdin`, and only when it is a terminal. If it isn't, only `seconds` or Ctrl+C can stop it, so always pass `seconds` for a splash screen.

### Options for play()

`play(piece, options)` takes the piece's name, with dashes, like `"night-coast"`. It also takes a piece you imported, like `donut` from `ascii.rest/pieces`, or a banner.

| option | what it does | default |
| --- | --- | --- |
| `seconds` | how long it plays, in seconds | until a key is pressed |
| `mono` | draws a coloured piece in the terminal's own text colour, with no colour codes | `false` |
| `light` | for a light terminal: a coloured piece takes its light colours, and a shaded piece flips its shading | `false` |
| `fps` | frames a second, instead of the piece's own | the piece's own |
| `options` | the piece's own options, like `{ text: "hello" }` for `marquee` | the piece's defaults |
| `out` | the stream it draws on | `process.stdout` |

It resolves with an object:

| field | what it is |
| --- | --- |
| `interrupted` | `true` when Ctrl+C stopped it |
| `cropped` | `true` when the terminal was smaller than the piece, so only its middle showed |
| `piece` | the piece's size in terminal cells, `{ cols, rows }` |
| `terminal` | the terminal's size when it stopped, `{ cols, rows }`. 0 by 0 when it drew nothing. |

### Give a piece its own options

Some pieces take options. `marquee` scrolls a line of text you choose:

```ts
import { play } from "ascii.rest/terminal";

await play("marquee", { seconds: 3, options: { text: "my-cli v1.0 is ready" } });
```

### Play your own banner as the splash

A banner from `ascii.rest/banner` is a piece too, so `play()` can play it on the whole screen:

```ts
import { banner } from "ascii.rest/banner";
import { play } from "ascii.rest/terminal";

await play(banner("my-cli", { color: ["#ff6a00", "#f778ba"] }), { seconds: 2 });
```

## Print a banner from your CLI

Use `banner()` from `ascii.rest/terminal` to print your tool's name in block letters where the cursor is. A glint crosses it once, or its letters type in, and then it stays with the rest of your output.

```ts
import { banner } from "ascii.rest/terminal";

await banner("my-cli", { color: ["#ff6a00", "#f778ba"], shadow: "rounded", tagline: "v1.0, fast" });
console.log("ready");
```

It fits itself to your terminal, and keeps one column free at the right edge. It draws wide letters when there is room, and narrower letters in a narrow terminal. If even those don't fit, it prints your text as one plain line.

With no `color` and no `shadowColor`, the letters are in your terminal's own text colour and the shadow is dimmed. With a `color`, the shadow stays dimmed unless you also set `shadowColor`.

### Options for banner()

`banner(text, options)` takes every option of [banner()](/docs/banners/#options) except `size` and `max`, because it fits the banner to the terminal's width itself. A `color` of `{ light, dark }` uses the one that matches the `light` option below.

These four options are only for the terminal:

| option | what it does | default |
| --- | --- | --- |
| `seconds` | how long the glint takes to cross once, or the letters to type in. `0` prints it still. | `1` |
| `tagline` | a line printed under it, dimmed, once it has moved | none |
| `light` | for a light terminal: the light colours, and solid `█` letters instead of `▓` | `false` |
| `out` | the stream it prints to | `process.stdout` |

In a terminal it moves once, over `seconds`, so `speed` makes no difference. Change `seconds` instead.

It resolves with `{ cols, rows, interrupted }`. `cols` and `rows` are the banner's size in terminal cells, or 0 if it printed plain text. `interrupted` is `true` if Ctrl+C stopped it moving. Like `play()`, Ctrl+C does not end your program:

```ts
import { banner } from "ascii.rest/terminal";

const { interrupted } = await banner("my-cli", { effect: "type", seconds: 2 });
if (interrupted) process.exit(130);
```

It throws an error when:

- an option is wrong, such as an unknown font or shadow, or a colour that isn't `#rrggbb`. See [fix an error from banner()](/docs/banners/#fix-an-error-from-banner).
- the font can draw none of the text. Spaces alone count as none.
- `seconds` is below 0, `NaN` or `Infinity`.

The message says what to change.

### Start it at the beginning of a line

`banner()` prints from where the cursor is, so end anything you print before it with a newline. `console.log()` adds the newline for you. `process.stdout.write()` does not.

```ts
import { banner } from "ascii.rest/terminal";

console.log("starting my-cli"); // ends the line, so the banner starts on a new one
await banner("my-cli");
```

If the cursor is in the middle of a line, the banner's first row starts after that text, out of line with the rest. When the banner moves, it draws over that line, and the text is gone.

### Keep your real output clean

Pass `out: process.stderr` to print the banner on stderr. Your program's own output on stdout then stays clean for pipes and files:

```ts
import { banner } from "ascii.rest/terminal";

await banner("my-cli", { out: process.stderr });
process.stdout.write(JSON.stringify({ ok: true }) + "\n");
```

`play()` takes `out` the same way.

## Know what happens in pipes, CI and small terminals

ascii.rest checks where it is drawing before it draws. A splash screen or a banner never fills a log or a file with escape codes, the hidden codes that move the cursor and set colours.

| when | `play()` | `banner()` |
| --- | --- | --- |
| the output is piped or redirected, as in most CI logs | draws nothing and resolves at once | prints the banner still, with no colour, at once |
| `NO_COLOR` is set | still draws in colour. Pass `mono: true` for none. | prints with no colour, and still moves |
| the terminal is too narrow | a scene shrinks to fit. Any other piece shows its middle, and `cropped` is `true`. | narrower letters, then the plain text |
| the terminal is too short | a scene shrinks to fit. Any other piece shows its middle. | prints the banner still. It needs two rows more than its height to move: 8 rows for a default banner, which is 6 tall. |
| the terminal is resized | draws the piece again in the middle | stops moving where it is |
| Ctrl+C is pressed | stops, with `interrupted: true` | jumps to the end, with `interrupted: true` |
| any other key is pressed | stops | carries on: it doesn't read keys |

To follow `NO_COLOR` in a splash screen too, pass it to `mono`:

```ts
import { play } from "ascii.rest/terminal";

await play("rust", { seconds: 2, mono: Boolean(process.env.NO_COLOR) });
```

The `npx ascii.rest` command checks the same way. Piped or redirected, it doesn't play a piece. It prints one frame as text instead, so this saves the donut to a file:

```sh
npx ascii.rest donut > donut.txt
```

## Get a frame as text with still()

Use `still()` to get one frame of a piece as a plain string, with no colour codes. Print it in a log, a `--help` screen or a file.

```ts
import { still } from "ascii.rest/terminal";

console.log(await still("donut"));
```

The frame is the one the piece shows when it can't move, set by its `meta.still`. For most pieces that is the first frame. A typed banner shows every letter.

A scene comes out at its full size, two rows of its picture on each line of text, so it can be wider than your terminal.

| option | what it does | default |
| --- | --- | --- |
| `light` | for a light background: a shaded piece flips its shading | `false` |
| `options` | the piece's own options | the piece's defaults |

For example, a `--help` screen with a picture at the top:

```ts
import { still } from "ascii.rest/terminal";

if (process.argv.includes("--help")) {
  console.log(await still("rust"));
  console.log("usage: my-cli <file>");
}
```

## Next

- [cli](/docs/cli/): every command and flag of `npx ascii.rest`.
- [banners](/docs/banners/): every banner option, with examples of fonts, shadows, colours and effects.
- [api](/docs/api/): every export of the package, with its types.
