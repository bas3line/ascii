---
layout: ../../layouts/Docs.astro
title: cli
description: npx ascii.rest plays pieces, prints banners and copies source into your project. Nothing to install first.
---

```sh
npx ascii.rest <piece>          # plays a piece until you press a key
npx ascii.rest list             # every piece, by category
npx ascii.rest banner <text>    # your text in block letters, with a glint
npx ascii.rest add <name...>    # copies pieces' TypeScript into your project
npx ascii.rest --help
npx ascii.rest --version
```

## Playing a piece

```sh
npx ascii.rest donut
npx ascii.rest "night coast"     # its name as the site shows it works too
npx ascii.rest rsut              # a typo: it asks whether you meant rust
```

| flag | |
| --- | --- |
| `--seconds <n>` | stops after n seconds; until a key by default |
| `--fps <n>` | frames a second, up to 60, instead of the piece's own |
| `--mono` | a coloured piece in the terminal's own colour, for a terminal without 24-bit colour |
| `--light` | for a light terminal: the light colours, and shading flipped |

Ctrl+C stops it and exits with 130. Piped or redirected, it prints the piece's first frame as text.

## A banner

```sh
npx ascii.rest banner 'my cli'
npx ascii.rest banner 'my cli' --color ff6a00,f778ba --font slim --shadow rounded --tagline 'v1.0, fast'
npx ascii.rest banner hello --effect type --seconds 2
```

| flag | |
| --- | --- |
| `--color <hex>` | its letters' colour, `ff6a00`, or more, comma separated, for a fade |
| `--tagline <text>` | a line under it |
| `--font <name>` | `block` or `slim` |
| `--shadow <name>` | `double`, `single`, `heavy`, `rounded`, `ascii` or `none` |
| `--effect <name>` | `glint`, `type` or `still` |
| `--seconds <n>` | how long it moves; 1 by default |
| `--light` | for a light terminal |

The words after `banner` are its text, as the shell splits them, so quote it. Single quotes keep a shell from reading `!` and `$`.

## add

```sh
npx ascii.rest add ascii donut
npx ascii.rest add all --dir app/ascii
npx ascii.rest add banner --overwrite
```

Copies registry items, the pieces and parts of the library, and the items they need, into your project. [your own copy](/docs/copy/) lists them.

| flag | |
| --- | --- |
| `--dir <path>` | where they go: `components/ascii`, or `src/components/ascii` when there is a `src` folder |
| `--overwrite` | replaces files already there; without it they are kept, and listed |
