---
layout: ../../layouts/Docs.astro
title: terminal
description: Play any piece in a terminal, print a banner where the cursor is, or give your own CLI a splash screen. Node only, and only Node's own modules.
---

## npx ascii.rest

```sh
npx ascii.rest rust                         # plays until you press a key
npx ascii.rest night-coast --seconds 10
npx ascii.rest list                         # every piece, by category
npx ascii.rest banner 'my cli' --color ff6a00,f778ba --tagline 'v1.0'
```

Every command and flag is on [cli](/docs/cli/).

The logos, companies, distros and scenes play in their own colours, in 24-bit colour. A scene is shrunk to fit the terminal and drawn in tones, so the dots it is made of blend as they do on a page. Any other piece plays centred, and if it is bigger than the terminal, shows its middle and says so when it stops. Piped or redirected, a piece prints its first frame as text.

## play

A splash screen for a CLI of your own:

```ts
import { play } from "ascii.rest/terminal";

const { interrupted } = await play("command-code", { seconds: 2 });
if (interrupted) process.exit(130);
```

`play(piece, options?)` takes a piece module or a name, plays it on the alternate screen with the cursor hidden, and resolves when it stops: after `seconds`, on any key, or on Ctrl+C. It puts the terminal back however it stops, on an error too. When the output is not a terminal it draws nothing and resolves at once, so a pipe or a CI log never gets a splash.

| option | | default |
| --- | --- | --- |
| `seconds` | how long it plays | until a key |
| `mono` | draws a coloured piece in the terminal's own colour | `false` |
| `light` | for a light terminal: the light colours, and shaded pieces flipped | `false` |
| `fps` | frames a second, instead of the piece's own | the piece's |
| `options` | the piece's option overrides: `{ text: "hello" }` | |
| `out` | where it draws | `process.stdout` |

It resolves with `{ interrupted, cropped, piece, terminal }`: `cropped` is true when the terminal was smaller than the piece, whose size and the terminal's are in `piece` and `terminal`.

## banner

A banner where the cursor is, that stays in the scrollback with the rest of your output:

```ts
import { banner } from "ascii.rest/terminal";

await banner("my-cli", { color: ["#ff6a00", "#f778ba"], shadow: "rounded", tagline: "v1.0, fast" });
```

`banner(text, options?)` takes every option of [banner()](/docs/banners/#options), the font, shadow, fill, effect and colours, and:

| option | | default |
| --- | --- | --- |
| `seconds` | how long its glint takes to pass, or its letters to type in, once; 0 prints it still | `1` |
| `tagline` | a line under it, dimmed, once it has moved | none |
| `light` | for a light terminal | `false` |
| `out` | where it prints | `process.stdout` |

It is sized to the text, with narrow pixels if the terminal is too narrow for square ones, and the plain text if it is too narrow for those. Without a colour its letters are the terminal's own and its shadow is dimmed. Piped, it prints with no colour and resolves at once; `NO_COLOR` leaves the colours out too. Ctrl+C ends the motion, not your program: it resolves `{ cols, rows, interrupted }`.

## still

```ts
import { still } from "ascii.rest/terminal";

console.log(await still("donut"));
```

A piece's first frame as plain text, its rows paired as a terminal draws them: for a log, a `--help` screen or a file.
