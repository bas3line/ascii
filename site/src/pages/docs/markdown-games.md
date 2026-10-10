---
layout: ../../layouts/Docs.astro
title: games
description: Markdown figures from games, a chess position with its moves sliding in, a knockout bracket and pixel art that walks, each written the way its players write it.
---

Figures from games: a chess position with its moves, a knockout bracket, pixel art that walks. Each is written the way its players already write it, FEN and UCI for chess, a line a round for a bracket, rows of letters for a sprite. How fences work, and every place they play, is on [markdown figures](/docs/markdown/).

## chess

A chess position from FEN, and the moves played from it in UCI, each one sliding its piece square by square: an opening in docs, a puzzle, a game an agent reasons about.

```ascii chess title="ruy lopez"
r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
f1b5
```

The board draws in a rank at a time, then each move slides its piece square by square, a piece it takes blinking out. Then it holds. The last move's from square is a dot and its piece is in brackets; the top edge names the last move and the bottom edge who is to move.

````md
```ascii chess title="ruy lopez"
r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
f1b5
```
````

Its plain text:

```text
╭─ ruy lopez ───────── f1b5 ─╮
│ 8  r ░░░ b ░q░ k ░b░ n ░r░ │
│ 7 ░p░ p ░p░ p ░░░ p ░p░ p  │
│ 6    ░░░ n ░░░   ░░░   ░░░ │
│ 5 ░░░[B]░░░   ░p░   ░░░    │
│ 4    ░░░   ░░░ P ░░░   ░░░ │
│ 3 ░░░   ░░░   ░░░ N ░░░    │
│ 2  P ░P░ P ░P░   ░P░ P ░P░ │
│ 1 ░R░ N ░B░ Q ░K░ · ░░░ R  │
│    a  b  c  d  e  f  g  h  │
╰──────────── black to move ─╯
```

The body starts with a position in FEN, or `start` for the opening position, and the moves after it, on the same line or the lines after, are in UCI: `e2e4`, castling as the king's move, `e1g1`, and a promotion as `e7e8q`. White is in capitals and black in lower case, a square is 3 columns, and the dark squares are shaded `░` round their piece. Each move is checked: a piece of the side to move, going where its kind can, its way clear, en passant and castling included.

| option | what it does | default |
| --- | --- | --- |
| `flip` | Draws the board from black's side, rank 1 at the top and the h file at the left. | `false` |

From the start, three moves on one line:

```ascii chess
start e2e4 e7e5 g1f3
```

```text
╭───────────────────── g1f3 ─╮
│ 8  r ░n░ b ░q░ k ░b░ n ░r░ │
│ 7 ░p░ p ░p░ p ░░░ p ░p░ p  │
│ 6    ░░░   ░░░   ░░░   ░░░ │
│ 5 ░░░   ░░░   ░p░   ░░░    │
│ 4    ░░░   ░░░ P ░░░   ░░░ │
│ 3 ░░░   ░░░   ░░░[N]░░░    │
│ 2  P ░P░ P ░P░   ░P░ P ░P░ │
│ 1 ░R░ N ░B░ Q ░K░ B ░·░ R  │
│    a  b  c  d  e  f  g  h  │
╰──────────── black to move ─╯
```

```ts
// sicilian.ts
import { chess } from "ascii.rest/markdown";

export default chess({ fen: "start", moves: ["e2e4", "c7c5"] }, { flip: true });
```

In React it is `<Chess>`.

## bracket

A knockout, entrants in pairs and the winners moving on, round by round, to the champion: a naming vote in a changelog post, an agent's rounds of evals.

```ascii bracket title="best font"
block slim round bold
block round
block
```

The entrants type in, then round by round each pair's lines draw on to the next name. With a champion, a glint then runs the champion's line every 6 seconds while it is in view.

````md
```ascii bracket title="best font"
block slim round bold
block round
block
```
````

Its plain text:

```text
╭─ best font ───────────────╮
│ block ━┓                  │
│        ┡━ block ━┓        │
│ slim ──┘         ┃        │
│                  ┡━ block │
│ round ━┓         │        │
│        ┡━ round ─┘        │
│ bold ──┘                  │
╰────────────── block wins ─╯
```

The first line is the entrants in seed order, 2, 4, 8 or 16 of them, each a word or words in quotes. Each line after it is a round, naming who went through from each pair, and a last line of one name is the champion. A winner's line is heavy and a loser's light, so the champion's run is one heavy line from the first round to the last. It has no options of its own. Stop before the champion for a bracket still being played: the rounds to come draw with `?` for the names still to play.

```ascii bracket
a b c d
a d
```

```text
╭────────────────╮
│ a ━┓           │
│    ┡━ a ─┐     │
│ b ─┘     │     │
│          ├─ ?  │
│ c ─┐     │     │
│    ┢━ d ─┘     │
│ d ━┛           │
╰─ round 2 of 2 ─╯
```

```ts
// final.ts
import { bracket } from "ascii.rest/markdown";

export default bracket({ rounds: [["block", "slim"], ["block"]] });
```

In React it is `<Bracket>`.

## sprite

Pixel art from rows of letters, each pixel two columns of block so it stays square, with a blank line between frames to animate it: a README's mascot, a game's character.

```ascii sprite
...####...
.########.
##aa##aa##
##aa##aa##
##########
##########
##..##..##

...####...
.########.
##aa##aa##
##aa##aa##
##########
##########
.##..##..#
```

The first frame prints a row at a time from the top, each row a faint proof first. Then, with two frames or more, it plays them in turn, 4 a second, while it is in view. Its still is the first frame.

````md
```ascii sprite
...####...
.########.
##aa##aa##
##aa##aa##
##########
##########
##..##..##

...####...
.########.
##aa##aa##
##aa##aa##
##########
##########
.##..##..#
```
````

Its plain text:

```text
      ████████
  ████████████████
████▓▓▓▓████▓▓▓▓████
████▓▓▓▓████▓▓▓▓████
████████████████████
████████████████████
████    ████    ████
```

Each letter is a pixel in a tone and a shade of its own, so the art reads in one ink and as plain text too:

| letter | pixel |
| --- | --- |
| `#` | ink, `█` |
| `a` | the accent, `▓` |
| `b` and `v` | red and violet, `▓` |
| `g` and `w` | green and yellow, `▒` |
| `s` | soft, `░` |
| `.` or a space | none |

Every frame has as many rows as the first. It has no frame unless you ask for one.

| option | what it does | default |
| --- | --- | --- |
| `fps` | Frames a second while it plays its frames, 0.5 to 30. | `4` |

One frame, in a frame:

```ascii sprite frame=rounded
..##..
.#aa#.
######
```

```text
╭──────────────╮
│     ████     │
│   ██▓▓▓▓██   │
│ ████████████ │
╰──────────────╯
```

```ts
// walker.ts
import { sprite } from "ascii.rest/markdown";

export default sprite({ frames: [["#a#", "###"], ["#a#", "#.#"]] }, { fps: 2 });
```

In React it is `<Sprite>`.
