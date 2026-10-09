---
layout: ../../layouts/Docs.astro
title: cli
description: Every command and flag of npx ascii.rest, what each one prints, and the exit codes it returns.
---

`npx ascii.rest` runs ascii.rest from your terminal. You can play a piece, list every piece, print text as a banner, or copy source files into your project. The [terminal](/docs/terminal/) page has a video of it.

A **piece** is one animation. Play the one called `donut`:

```sh
npx ascii.rest donut
```

It plays until you press any key. You need Node 18.3 or newer. There is nothing to install first: `npx` downloads the package the first time you run it.

## Every command

| command | what it does |
| --- | --- |
| `npx ascii.rest <piece>` | plays a piece until you press a key |
| `npx ascii.rest list` | prints every piece's name, by category |
| `npx ascii.rest banner <text>` | prints your text in big block letters |
| `npx ascii.rest add <name...>` | copies the TypeScript of pieces and components into your project |
| `npx ascii.rest --help` | prints every command and flag |
| `npx ascii.rest --version` | prints the version you ran |

With no command, it prints the help. `banner` and `add` need version 0.3.0 or later. To see which version you have, run `npx ascii.rest --version`.

## Play a piece

Put the piece's name after `npx ascii.rest`:

```sh
npx ascii.rest donut
npx ascii.rest night-coast --seconds 10
npx ascii.rest rust --light
```

The piece plays in the middle of a blank screen, with the cursor hidden. Press any key to stop it. Your terminal then comes back exactly as it was. Ctrl+C stops it too.

This is `donut`:

<div class="demo"><ascii-art piece="donut"></ascii-art></div>

### Name the piece

You can name a piece in any of these ways:

- The piece's name, with dashes, as `npx ascii.rest list` prints it: `night-coast`, `newtons-cradle`.
- The name the site shows, in quotes: `"night coast"`, `"newton's cradle"`, `c++`.
- In any mix of capitals: `"Newton's Cradle"` works.

```sh
npx ascii.rest "night coast"
npx ascii.rest "newton's cradle"
```

If no piece has that name, nothing plays. It suggests the closest names instead, and exits with code 1:

```sh
npx ascii.rest rsut
```

```text
ascii.rest: there is no piece called "rsut". Did you mean rust?
npx ascii.rest list shows every piece.
```

Part of a name works the same way. `npx ascii.rest newton` asks "Did you mean newtons-cradle?".

### Flags for a piece

| flag | what it does | default |
| --- | --- | --- |
| `--seconds <n>` | stops after n seconds. Takes any number above 0, like `2.5`. | plays until you press a key |
| `--fps <n>` | draws n frames a second, above 0 and up to 60. This changes how smooth it looks, not how fast it moves. | the piece's own rate |
| `--mono` | draws a coloured piece in your terminal's own text colour | off: full colour |
| `--light` | for a terminal with a light background: coloured pieces use their light colours, and shaded pieces flip their shading | off: for a dark background |

Coloured pieces use 24-bit colour. If the colours look wrong in your terminal, add `--mono`. In colour, a scene draws on its own dark background, so `--light` leaves it as it is.

```sh
npx ascii.rest kyoto-dusk --mono
npx ascii.rest donut --fps 10 --seconds 5
```

A piece refuses the flags of `banner` and `add`. See [which flags each command takes](#which-flags-each-command-takes).

### When the window is too small

Scenes shrink to fit your window. Scenes are the wide pictures listed under `scenes`, like `night-coast`. Every other piece keeps its size. If your window is smaller than the piece, you see its middle. When it stops, it prints a note like this on stderr:

```text
donut is 40x22 and this terminal is 40x12, so only its middle showed. A bigger window shows all of it.
```

Make the window bigger and run it again. If you resize the window while it plays, the piece moves to the new middle.

### When there is no terminal

If the output goes to a file, a pipe or another program, nothing plays. It prints one frame as plain text, with no colour, and exits at once:

```sh
npx ascii.rest donut > donut.txt
```

`donut.txt` then holds one frame of the donut, 22 lines of 40 characters. Here it is without the blank line above the donut and the three below it:

```text
              @@@$$$$$##
         $@@@$$$####********
       @@$$$##***!!!!=========
     $$$$##**!!!!!!==;;:;;;:;;;;
    $$##***!!!=;;;::~~~~~~~::::::
   $###**!!==;;:~~-,,...,,,-~~~::~
  ###***!!=;;:~-,...........,--~~~
 *#***!!==;:~-,.............,--~~~
 ****!!=;;:~-,....     ....,--~~~-
 !*!!===;:~-,...       ---~~~~~~~-
 !!!===;::~-....      ##*==;;;::~,
 ====;;::~--,...-   #$@@$#*!==;:-.
 ;=;;;;::~~-,,.--:=*#$@$$#**!=:-.
  ;;;::::~~----~:;=!*####*!!=:-.
   :::::~~~~~~~~::;==!!!=;=;:-
    ~~~~~~~~~~~~:::::;;;;:~,.
      ,-------~~~~:::::~-.
         ...,,,,,,,,,..
```

A scene printed this way keeps its full width, which can be wider than your screen.

## List every piece

`list` prints every piece's name, grouped by category:

```sh
npx ascii.rest list
```

It starts like this:

```text
scenes      alpine-dawn  aurora-fjord  deep-reef  desert-night  earthrise
            kyoto-dusk  lantern-lake  marine-drive  misty-forest  night-coast
            ocean-sunset  storm-plains  taj-dawn  tokyo-rain  varanasi-ghats
ui          boot-log  box-frames  calendar  digital-clock  dividers  file-tree
            form-controls  not-found  progress-bar  skeleton  spinners  terminal
```

And it ends with the count:

```text
217 pieces. npx ascii.rest <piece> plays one.
```

The lines wrap to your window, up to 100 columns wide. When the output is piped, they wrap at 80. Every name it prints works with `npx ascii.rest <piece>` and with `npx ascii.rest add`. You can also see every piece playing on [the home page](/#pieces).

## Print a banner

`banner` prints your text in big block letters where the cursor is. A glint, a bright band, sweeps across the letters once. Then the banner stays in your terminal with the rest of your output.

```sh
npx ascii.rest banner 'my cli'
```

```text
▓▓╗     ▓▓╗ ▓▓╗     ▓▓╗         ▓▓▓▓▓▓╗ ▓▓╗       ▓▓╗
▓▓▓▓╗ ▓▓▓▓║ ╚═▓▓╗ ▓▓╔═╝       ▓▓╔═════╝ ▓▓║       ▓▓║
▓▓╔═▓▓╔═▓▓║   ╚═▓▓╔═╝         ▓▓║       ▓▓║       ▓▓║
▓▓║ ╚═╝ ▓▓║     ▓▓║           ▓▓║       ▓▓║       ▓▓║
▓▓║     ▓▓║     ▓▓║           ╚═▓▓▓▓▓▓╗ ▓▓▓▓▓▓▓▓╗ ▓▓║
╚═╝     ╚═╝     ╚═╝             ╚═════╝ ╚═══════╝ ╚═╝
```

Give it colours, a font, a shadow and a line under it:

```sh
npx ascii.rest banner 'my cli' --color ff6a00,f778ba --font slim --shadow rounded --tagline 'v1.0, fast'
```

```text
▓▓╮ ▓▓╮ ▓▓╮ ▓▓╮         ▓▓▓▓╮ ▓▓╮     ▓▓▓▓▓▓╮
▓▓▓▓▓▓│ ▓▓│ ▓▓│       ▓▓╭───╯ ▓▓│     ╰─▓▓╭─╯
▓▓╭─▓▓│ ╰─▓▓╭─╯       ▓▓│     ▓▓│       ▓▓│
▓▓│ ▓▓│   ▓▓│         ▓▓│     ▓▓│       ▓▓│
▓▓│ ▓▓│   ▓▓│         ╰─▓▓▓▓╮ ▓▓▓▓▓▓╮ ▓▓▓▓▓▓╮
╰─╯ ╰─╯   ╰─╯           ╰───╯ ╰─────╯ ╰─────╯
v1.0, fast
```

The text above is the shape it leaves behind. In your terminal the letters fade from orange to pink, and the tagline is dimmed. On a web page, the `<ascii-banner>` tag draws the same banner:

<div class="demo"><ascii-banner text="my cli" color="#ff6a00,#f778ba" font="slim" shadow="rounded"></ascii-banner></div>

### Write the text

- Every word after `banner` is part of the text, so `banner my cli` and `banner 'my cli'` print the same.
- Quote the text when it has characters your shell reads, like `!` or `$`. Single quotes are the safest. Use double quotes for text with an apostrophe.
- The letters cover A to Z, digits, spaces and `. , ! ? ' : - + = / _`. Lower case prints as capitals.
- Other characters are left out. If nothing is left, it stops with an error and exit code 1. No text, or only spaces, gets the same error:

```text
ascii.rest: a banner takes letters, digits, spaces and . , ! ? ' : - + = / _: npx ascii.rest banner 'my cli'
```

### Flags for a banner

| flag | what it does | default |
| --- | --- | --- |
| `--color <hex>` | colours the letters. One colour is six hex digits, like `ff6a00`. Two or more, comma separated, like `ff6a00,f778ba`, fade from one to the next. A `#` in front is fine. | no colour: your terminal's text colour, with the shadow dimmed |
| `--tagline <text>` | prints a dimmed line under the banner | no tagline |
| `--font <name>` | the letters: `block` or `slim` | `block` |
| `--shadow <name>` | the lines of the drop shadow: `double`, `single`, `heavy`, `rounded`, `ascii` or `none` | `double` |
| `--effect <name>` | how it moves: `glint` (a bright band sweeps across once), `type` (the letters type in) or `still` (no motion) | `glint` |
| `--seconds <n>` | how long the glint or the typing takes. `0` prints it at once, still. Takes any number of 0 or more. | `1` |
| `--light` | for a terminal with a light background: light colours, and solid `█` letters instead of `▓` | off |

A banner refuses `--mono` and `--fps`, which are for a piece, and the flags of `add`. See [which flags each command takes](#which-flags-each-command-takes).

More examples:

```sh
npx ascii.rest banner hello --effect type --seconds 2
npx ascii.rest banner hello --shadow none
npx ascii.rest banner 'v2 is out' --color 22c55e --font slim --seconds 0
```

Each font, shadow and effect is shown on [banners](/docs/banners/).

### Where it prints

The banner prints from the line the cursor is on, so it suits the start of a command's output. It changes to fit the place it prints:

- **Piped or saved to a file:** it prints at once, with no colour and no motion.
- **With `NO_COLOR` set:** it has no colour, but still moves.
- **A narrow window:** it draws narrower letters, to fit one column short of the window's width. If even those don't fit, it prints your text as one plain line.
- **A window too short for it:** it prints at once, still.
- **The window resized while it moves:** it stops where it is.

Ctrl+C finishes the motion at once and leaves the banner on the screen.

## Copy source into your project

`add` copies the TypeScript source of pieces and components into your project, so you can change it. Run it in your project's root folder:

```sh
npx ascii.rest add ascii donut
```

This writes four files into `components/ascii/`, or `src/components/ascii/` if your project has a `src` folder. They are the `<Ascii>` component, the `donut` piece, and `types.ts` and `mount.ts`, which every item needs.

`add` has three flags of its own:

- `--dir <path>` puts the files in another folder.
- `--overwrite` replaces files that are already there. Without it, `add` keeps them.
- `--registry <url>` reads the items from another copy of the registry, instead of `https://ascii.rest/r`.

Every item you can add, each flag's default, what `add` prints and when it stops are on [your own copy](/docs/copy/#add-files-without-shadcn).

## Print the help and the version

```sh
npx ascii.rest --help
npx ascii.rest --version
```

`-h` is short for `--help`, and `-v` for `--version`. The help lists every command and flag, with examples. The version is one line, like `0.3.0`. Either flag works after any command, and then the command doesn't run.

`npx` runs the version installed in your project, if there is one. To run the newest version on npm instead, add `@latest`:

```sh
npx ascii.rest@latest banner hello
```

## Which flags each command takes

Each flag belongs to one or two commands. Every command refuses a flag that isn't its own, with an error and exit code 1.

| flag | a piece | a banner | add |
| --- | --- | --- | --- |
| `--seconds`, `--light` | yes | yes | refused |
| `--fps`, `--mono` | yes | refused | refused |
| `--color`, `--tagline`, `--font`, `--shadow`, `--effect` | refused | yes | refused |
| `--dir`, `--overwrite`, `--registry` | refused | refused | yes |

`list` uses none of these flags. It refuses the banner flags and the add flags, as a piece does. A flag the CLI doesn't know at all is an error for every command, `add` included.

A banner flag on a piece:

```sh
npx ascii.rest donut --color ff6a00
```

```text
ascii.rest: --color, --tagline, --font, --shadow and --effect are for a banner: npx ascii.rest banner <text> --color ff6a00
```

A piece flag on a banner:

```sh
npx ascii.rest banner hello --fps 10
```

```text
ascii.rest: --mono and --fps are for a piece: a banner has no colour unless you give it one, and moves for --seconds
```

An add flag on a piece, a banner or `list`:

```sh
npx ascii.rest donut --dir src/ascii
```

```text
ascii.rest: --dir, --overwrite and --registry are for add: npx ascii.rest add donut --dir src/ascii
```

Another command's flag on `add`:

```sh
npx ascii.rest add donut --mono
```

```text
ascii.rest: add takes only --dir, --overwrite and --registry: npx ascii.rest add donut --dir src/ascii
```

## Exit codes and errors

| code | when |
| --- | --- |
| `0` | it worked: a piece stopped on a key or after `--seconds`, a banner finished, or `list`, `add`, `--help` or `--version` ran |
| `1` | something was wrong: an unknown piece or item, a bad flag or value, a flag for another command, or a failed download. The reason is on stderr. |
| `130` | you pressed Ctrl+C while a piece played or a banner moved |

Errors go to stderr and start with `ascii.rest:`. The note about a window too small for a piece goes to stderr too. Everything else goes to stdout.

## Run it from a script, CI or an agent

Every command runs without input, so scripts, CI jobs and coding agents can call it. Here is what to expect:

- **No questions.** No command waits for an answer. Everything comes from the flags.
- **No terminal, no animation.** When stdout is not a terminal, a piece prints one frame as plain text and exits at once. A banner prints still, with no colour.
- **npx's own prompt.** In a terminal, `npx` asks before it downloads a package the first time. Add `--yes` before the package name to skip it. When its input is not a terminal, or in CI, `npx` assumes yes.
- **Check the exit code.** `0` means it worked and `1` means it did not. The reason is on stderr.
- **`add` needs the network.** It downloads from `https://ascii.rest/r`, or from `--registry`. Run it in the project's root folder, because paths are relative to the current folder.

```sh
npx --yes ascii.rest donut > donut.txt
npx --yes ascii.rest banner 'my cli' > banner.txt
npx --yes ascii.rest add ascii-banner --dir src/components/ascii
```

## Use it in your own CLI

The command is built on `ascii.rest/terminal`, which you can import in your own Node program. Install the package, then play a piece as a splash screen and print a banner:

```sh
npm install ascii.rest
```

```ts
import { banner, play } from "ascii.rest/terminal";

// Plays rust for 2 seconds, or until a key is pressed.
await play("rust", { seconds: 2 });

// Prints a banner with a glint, then a tagline under it.
await banner("my cli", { color: ["#ff6a00", "#f778ba"], tagline: "v1.0, fast" });
```

Every option of `play()` and `banner()` is on [terminal](/docs/terminal/).

## Next

- [terminal](/docs/terminal/): `play()`, `banner()` and `still()` in your own Node program.
- [your own copy](/docs/copy/): use and change the files that `add` copies in.
- [banners](/docs/banners/): every font, shadow, colour and effect, shown.
