# ascii.rest markdown figures: the catalog

25 figures in seven groups, written in an ```` ```ascii <name> ```` fence and
drawn in text. Each is its own: its name, its idea, its input grammar and its
drawing come from ascii.rest's art and kit and from the field it draws, never
from another library's components or conventions. The engine (fence, frame,
plain text, motion, still, hosts) is section 4. `SPEC.md` beside this file is
the contract every figure is built to; this file is what each one draws.

The target stills below were drawn by a script, which also checked that every
row of a framed figure is the same width and every character is one
`drawable()` allows. A builder may change a drawing for a reason it states.
Where a figure is seeded (confetti, sigil, the ticket's barcode, the stamp's
wear, git's hashes) the seed rule is given, so the still is exact under that
rule. Two stills are only illustrative and are marked: `solid` (whatever the
kit's 3D renderer draws) and `qr` (whatever a correct encoder produces).

## 0. What makes them ours

- **They are ascii.rest pieces.** Each builds in, many keep moving while in
  view, and the same drawing is a web page, React, MDX, `<ascii-markdown>`,
  an animated SVG in a README, `play()` in a terminal, and plain text in a
  fence (`render()`, `npx ascii.rest md`).
- **They use ascii.rest's own art and kit.** `banner()` letters (headline,
  stamp, ticket), the kit's 3D renderer (solid), particles (confetti), the
  way the kit's `orbiting()` goes round (orbit), the earth piece's map
  (world), the kit's seeded random and a new `fnv1a32()` in the kit (sigil,
  confetti, the ticket's barcode, git's hashes, the stamp's wear), the kit's
  typewriter and marquee timing (typing, marquee).
- **They come alive.** Messages travel between actors, a git log scrolls in
  as a pager prints it, a signal runs through logic gates, a dot runs a
  railroad, satellites ride their rings, flaps clack, a stamp thuds, a ticket
  prints out of a slot, a bishop wanders, a creature blinks, pieces slide.
- **They borrow their notation from their own field**: PlantUML's arrows, git's commands, a man page's usage line, boolean
  algebra, Brendan Gregg's folded stacks, a datasheet's bit masks, relational
  notation, FEN and UCI. None of them is a chart or a list that markdown
  already draws well.

## 1. The grammar: lines, and each figure's own notation

A fence's body is not markdown lists. It is **lines**, one statement a line.
Most figures read them with one reader in core (`statements()`); a figure
with a notation of its own reads its own lines. There are no list rows of
labels and values, no notes after a dash, no bold or italic giving a row a
meaning, no marker for "the one to read", no family-wide arrow, no task
boxes, no `n*k` runs, no `### heading` columns, no GFM tables, and no meaning
in indentation.

What `statements()` reads:

| write | means | example |
| --- | --- | --- |
| a bare word | a name: an actor, a branch, a pin, a place, a style | `api`, `feat`, `sfo` |
| `"words in quotes"` | words to show: a message, a caption, a satellite | `"GET /users"` |
| `key=value` | an attribute, as the fence's own options are written | `gate=npm`, `v=version` |
| a blank line | the next block (a sprite's next frame) | sprite |

Rules: names are one word; words with spaces go in quotes; `\"` is a quote
inside quotes; typographic quotes fold to `"` through `clean()`. `!` and `->`
are ordinary characters to `statements()`.

The notations a figure takes from its own field, read by that figure:

| figure | notation |
| --- | --- |
| sequence | PlantUML's two-actor message, `a -> b` and `a --> b`, one arrow a line |
| git | git's own commands: `commit`, `branch`, `switch`, `merge`, `tag` |
| railroad | a usage line as man pages and docopt write it |
| logic | boolean expressions: `and`, `or`, `xor`, `not`, parentheses |
| flame | Brendan Gregg's folded stacks: `main;draw;paint 18` |
| bits | a register datasheet's bit mask: `vvvviiiiddddddee` |
| schema | textbook relational notation: `users(id*, name)`, then `ref` |
| chess | FEN and UCI moves |
| sprite | rows of pixel letters |
| headline, typing, flap, qr, sigil, stamp, say | free text |

No figure has a marker for "the one to read". Where a figure singles one
thing out, its own field decides it, by computing it or by a named fence
option: git's HEAD (where the last line leaves you), chess's last move,
flame's hottest leaf, bracket's champion, world's `here=`, pinout's `pulse=`.
Every other figure draws its parts evenly.

Options every figure takes are unchanged (`title`, `frame`, `width`, `color`,
`play`, `speed`), plus each figure's own, all on the fence's info string:
```` ```ascii flame title="render, 48 ms" unit=ms ````.

## 2. The catalog

| group | figure | what it draws | for |
| --- | --- | --- | --- |
| lettering | headline | words in block letters, a glint passing | readme, changelog |
| lettering | typing | a line that types itself and cycles its last word | readme |
| lettering | flap | a split-flap sign, every tile clacking into place | changelog, readme |
| lettering | marquee | a ticker of items scrolling past | readme, docs |
| ornaments | divider | a band of moving art between sections | readme, docs |
| ornaments | confetti | a burst of confetti over a message, settling | changelog, issue |
| ornaments | solid | a 3D shape turning, with a caption | readme |
| ornaments | say | a little creature with a speech or thought balloon | readme, agent |
| ornaments | orbit | a hub and the rings of things around it, riding | readme, docs |
| machines | sequence | messages between actors, each travelling its arrow | docs, issue, agent |
| machines | git | a branching model as `git log --graph` prints it | docs, readme |
| machines | railroad | a command's syntax as a railroad, a dot running it | docs, readme |
| machines | logic | gates from boolean expressions, a signal running through | docs, issue, agent |
| internals | flame | a profile's folded stacks as a flame graph | issue, docs |
| internals | bits | a binary layout from a bit mask, on a bit ruler | docs |
| internals | pinout | a chip and what each pin does | readme, docs |
| internals | schema | tables and their references as an ER diagram | docs, agent |
| tokens | qr | a QR code from text, in half blocks | readme, docs |
| tokens | sigil | a fingerprint of a string: a bishop's random walk | readme, issue |
| tokens | stamp | a rubber stamp that thuds onto the page | issue, changelog |
| tokens | ticket | a pass in banner letters, a stub and a barcode | changelog |
| games | chess | a position from FEN, the moves sliding in | docs, agent |
| games | bracket | a knockout bracket, winners moving on | changelog, agent |
| games | sprite | pixel art from rows of letters, animated by frames | readme |
| places | world | a world map with pins and routes | readme, docs |

Docs pages: `/docs/markdown/` (what they are, the grammar, options, hosts),
then `/docs/markdown-lettering/`, `-ornaments/`, `-machines/`,
`-internals/`, `-tokens/`, `-games/`, `-places/`, in main's own docs layout.

---

## 3. The figures

Each: what it is for, its fence, its grammar, its own options, the plain text
it prints (its still), how it plays, and its tones. "Build" is the intro, at
most 3 seconds, after which `t >= intro` is the finished figure. "Cycle" is a
seamless loop that runs after the build while the figure is in view (core's
new `Body.cycle`, section 4); its frame at `t = intro` is the still.

### 3.1 lettering

#### headline

Words in `banner()`'s block letters with its drop shadow, the glint passing
over them: a README's top, a release post's title. Default frame `none`.

```ascii headline
ascii.rest "animated ascii art for web pages"
```

Grammar: bare words are the big line (one line, up to 156 columns at one
column a pixel); a quoted text is a small line under it. Own options: `font`
(banner's: block, slim, tall, bold, round, wide, mixed, italic; block),
`shadow` (banner's: double, single, heavy, rounded, ascii, none; double),
`align` (left, center; left). Built with `banner(words, { font, shadow,
pixel: 1, gap: 1, fill: "█" })` so the page, SVG and plain text agree; too
wide for `width` fails naming the width it needs and suggesting `font=slim`.

```text
 ██╗  ███╗ ███╗█╗█╗  ███╗ ████╗ ███╗█████╗
█╔═█╗█╔══╝█╔══╝█║█║  █╔═█╗█╔══╝█╔══╝╚═█╔═╝
████║╚██╗ █║   █║█║  ███╔╝███╗ ╚██╗   █║
█╔═█║ ╚═█╗█║   █║█║  █╔█║ █╔═╝  ╚═█╗  █║
█║ █║███╔╝╚███╗█║█║█╗█║╚█╗████╗███╔╝  █║
╚╝ ╚╝╚══╝  ╚══╝╚╝╚╝╚╝╚╝ ╚╝╚═══╝╚══╝   ╚╝

animated ascii art for web pages
```

Plays: build 1.2 s, the letters drop in a column at a time left to right,
then banner's glint crosses once; the small line types in behind them. Cycle:
6 s, the glint crossing again in its first 1.2 s. Still: letters, no glint.
Tones: letters ink, shadow quiet, glint glint and accent, small line soft.
Says: `headline: ascii.rest, animated ascii art for web pages.`

#### typing

A line that types itself, holds, erases its last words and types the next:
the rotating tagline people put under a README's title. Default frame `none`.

```ascii typing
ascii.rest draws "scenes" "banners" "figures"
```

Grammar: bare words are fixed; the quoted texts are the alternatives, cycled
in the place they are written (start, middle or end). Own options: `hold`
(seconds an alternative holds, 1.6), `cursor` (true).

```text
ascii.rest draws scenes
```

Plays: build types the fixed words and the first alternative at 18
characters a second behind `▌`. Cycle: hold, erase at 30 a second, type the
next, round to the first; the cursor blinks at 2 Hz. Still: the first
alternative typed, no cursor. Width: the longest form plus one for the cursor.
Tones: fixed words ink, the alternative accent, cursor accent. Says: `typing:
ascii.rest draws scenes, banners, figures.`

#### flap

A split-flap sign: every tile flips through the alphabet and clacks onto its
letter, left to right. A release day's departures board. Default frame `none`.

```ascii flap
now boarding
v0.5 gate npm
```

Grammar: each line is a row of the sign, drawn in capitals from the flap
alphabet (A to Z, 0 to 9, space and `. - : / ' ! ? &`; anything else fails,
naming it); rows padded to the longest. Own options: none.

```text
┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
│N│O│W│ │B│O│A│R│D│I│N│G│ │
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
│V│0│.│5│ │G│A│T│E│ │N│P│M│
└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
```

Plays: build up to 2.4 s: every tile starts blank and steps through the
alphabet in its fixed order, one step each 35 ms, starting 25 ms after the
tile to its left; a flipping tile's letter is soft, a landed one ink. Still:
every tile landed. Tones: grid quiet, letters ink. Says: `flap: now boarding;
v0.5 gate npm.`

#### marquee

A ticker: items scroll past, joined by ` · `, round and round. Latest news in
a README, a docs banner.

```ascii marquee
"markdown figures" "a fence in, a picture out" "npx ascii.rest add markdown"
```

Grammar: each quoted text is an item (a line with no quotes is one item).
Own options: `sep` (` · `). Width 48 by default.

```text
╭──────────────────────────────────────────────╮
│ markdown figures · a fence in, a picture out │
╰──────────────────────────────────────────────╯
```

Plays: build 0.8 s, the strip slides in from the right and eases to rest.
Cycle: it scrolls left 8 cells a second, round the whole strip (items, a
separator after the last), so a cycle lasts the strip's length in cells
divided by 8, in seconds. Still: as many whole items as fit, from the first.
Tones: items ink, separators quiet. Says: `marquee: markdown figures; a fence
in, a picture out; npx ascii.rest add markdown.`

### 3.2 ornaments

#### divider

A band of moving art between sections, with words in its middle or none.
Default frame `none`, width 48.

```ascii divider
waves "part two"
```

Grammar: the first word is the style; a quoted text sits in the middle with
two spaces each side. Styles and their rows: `waves` 1 (`_.-'~'-.` travelling),
`stars` 3 (`* + . ·` twinkling, seeded), `rain` 3 (`' , |` falling),
`sparks` 1 (`- = *` crackling along a line), `train` 3 (a small train crossing
on a rail of `═`), `dots` 1 (`·` filling in from the middle). Own options: none.

```text
_.-'~'-._.-'~'-._.  part two  -._.-'~'-._.-'~'-.
```

Plays: build 0.7 s, drawn out from the middle to both ends, the words typing.
Cycle: the style's motion, 8 cells per loop for waves, 6 s for a train's
crossing. Still: phase 0, the train parked at the left. Tones: art quiet
(waves, rain) or accent (stars, sparks, the train), words soft. Says:
`divider: waves, part two.`

#### confetti

A burst of confetti over a message, settling around it: 1.0 is out, 1,000
stars. Default frame `none`, width 44, 5 rows.

```ascii confetti
"v1.0 is out" "1,000 stars"
```

Grammar: one or two quoted texts, centred on rows 2 and 3. Own options:
`count` (22). Seeded: `mulberry32(fnv1a32(texts joined by "\n"))` gives each
piece x, y and glyph from `*+·°•',~`, skipping the message's box and a column
either side, and any cell already used.

```text
         *      ·              +          *
             ,  ·     °,  ·        °
      *,   ,    v1.0 is out        ,°    ~
  ·       •     1,000 stars      •
     ·  '               ~
```

Plays: build 1.8 s with the kit's particles: the pieces burst from the
message's centre with gravity and drag and land exactly on their seeded cells;
the message pops in at 0.2 s. Holds. Still: as drawn. Tones: message ink and
accent, pieces cycling accent, good, warn, violet, glint by index. Says:
`confetti: v1.0 is out, 1,000 stars.`

#### solid

A 3D shape turning, lit and shaded in characters, with a caption: a README
hero ornament. Default frame `none`, 32 by 11.

```ascii solid
torus "ascii.rest"
```

Grammar: the first word is the shape (`cube`, `torus`, `sphere`, `cone`,
`cylinder`, and the kit's clouds `galaxy`, `helix`, `ring`); a texture word
may follow (the kit's `bands`, `stripes`, `checker`, `grid`, `spots`); a quoted
text is the caption. Own options: `turn` (turntable, tumble; turntable),
`rows` (11). Built on the kit's `torus()` and friends and `spinning()`.

Illustrative still (the kit's turntable torus at t = 0, 32 by 11, blank rows
cropped; the test pins whatever the kit draws):

```text
            .....,,-
          .,-~:::::~~~
         -:;=*###*!=;;;
        ~;=*$$    $#!===
        ;=!#$      !!=!*
         =!!!=:-,.-~;=*
          *!=:~-,-~;!$
              $##$

           ascii.rest
```

Plays: build 0.9 s, the shape grows from a point while turning. Cycle: one
full turn in 8 s. Still: t = intro, the rest angle. Tones: shading soft to
ink by depth, the caption accent. Says: `solid: a torus turning, ascii.rest.`

#### say

A little creature with a balloon, after the old Unix cowsay and cowthink: a
friendly README footer, an agent's sign-off. The creature is the figure:
there is only ever one, with one balloon, and its own idle animation carries
it. Default frame `none`.

```ascii say
a fence in, a figure out.
```

Grammar: the whole body is the balloon's text as written, free text, wrapped
at 28 columns (lines joined by a space; a blank line is a paragraph break in
the balloon). There are no speakers and no turns. Own options: `creature`
(cat, owl, fox, ghost, robot, crab; cat), `balloon` (say, think; say). Each
creature is our own art, at most 4 rows, with its own idle: the cat blinks
(`o.o` to `-.-`), the owl turns its head (its eyes slide a column and back),
the fox flicks an ear, the ghost bobs a row, the robot's antenna light
blinks, the crab opens and closes its claws. `balloon=think` closes the
balloon and trails `O` and `o` down to the creature.

```text
╭───────────────────────────╮
│ a fence in, a figure out. │
╰──┬────────────────────────╯
    ╲
     /\_/\
    ( o.o )
     > ^ <
```

And ```` ```ascii say creature=owl balloon=think ````:

```text
╭─────────────────────────────╮
│ where did i put that fence? │
╰─────────────────────────────╯
   O
    o
    ,___,
    {o,o}
    /)__)
    -"-"-
```

Plays: build: the creature appears, the balloon opens, its words type at 30
characters a second (at most 2.5 s). Cycle: 4 s, the creature's idle once in
it (the cat's blink lasts 0.15 s). Still: the idle's rest frame, every word.
Tones: balloon quiet, words ink, creature soft with its eyes accent. Says:
`say: a cat says a fence in, a figure out.` (`thinks` for a thought).

#### orbit

A hub and the rings of things around it, the satellites riding their rings:
what surrounds a project (its hosts, its formats), for a README or docs. It
says what is around a thing, not what A has that B lacks. Default frame
`none`.

```ascii orbit
ascii.rest
"react" "mdx" "svg"
"readme" "terminal"
```

Grammar: line 1 is the hub, a bare word or a quoted text; each later line is
a ring, from the inside out, its satellites as quoted texts or bare words (1
to 6 a ring, 1 to 3 rings). Own options: none.

Layout: rings are ellipses of `·`, a dot on every other column counted from
the ring's left end. Ring k's x radius clears the one inside it (the hub for
ring 1) by half of each one's longest name and 3 columns:
`rx_k = ceil(rx_(k-1) + longest_(k-1) / 2 + longest_k / 2 + 3)`, with
`rx_0 = hub / 2`; its y radius is `max(2k, round(rx_k / 4))`, a ring seen at a
tilt. A satellite's name is centred on its point with a blank cell either
side; ring k's satellites are evenly spaced from a start angle at the bottom
turned (k - 1) eighths of a turn clockwise. Width `2 rx + longest + 1` of the
outer ring, rows `2 ry + 1`. Here: 11 by 3 and 21 by 5.

```text
                · · · · · · · · · ·
          · · · ·                 · terminal
        · ·         · · · · · ·         · ·
      ·         · ·             · svg       ·
    ·         mdx                   ·         ·
    ·         ·     ascii.rest      ·         ·
    ·         ·                     ·         ·
      ·         · ·             · ·         ·
        · ·         ·  react  ·         · ·
       readme · ·                 · · · ·
                · · · · · · · · · ·
```

Plays: build 1.0 s: the hub types, then each ring traces out round it (0.3 s a
ring), its satellites popping on. Cycle: ring k goes round once every 8k
seconds, the way the kit's `orbiting()` goes round (right, down in front,
left, up behind); a satellite on the far (upper) half is drawn under the hub
and the inner rings' satellites, on the near half over them. The cycle is
the rings' common period, 8, 16 or 48 s. Still: t = intro, the start angles.
Tones: rings quiet, hub accent, ring 1's satellites ink, ring 2's soft, ring
3's soft. Says: `orbit: around ascii.rest, react, mdx, svg; then readme,
terminal.`

### 3.3 machines

#### sequence

Messages between actors, top to bottom in time, each travelling its arrow:
how a request moves through a system, for docs, an issue, an agent's
explanation.

```ascii sequence title="list users"
browser -> api "GET /users"
api -> db "select users"
db --> api "12 rows"
api --> browser "200 ok"
```

Grammar: PlantUML's two-actor message, read by sequence itself: `from -> to
"message"` a call, solid; `from --> to "message"` a reply, dashed; `a -> a
"message"` a call to itself, a loop on its lifeline. The arrow may have
spaces round it or none (`api->db`). One arrow a line: a second fails
(`sequence's line 2 has two arrows; a message goes from one actor to one
actor`). Actors in order of first appearance. Space between two lifelines is
the longest label between them plus 4. Own options: none.

```text
╭─ list users ────────────────────────────╮
│ ╭─────────╮     ╭─────╮          ╭────╮ │
│ │ browser │     │ api │          │ db │ │
│ ╰────┬────╯     ╰──┬──╯          ╰─┬──╯ │
│      │ GET /users  │               │    │
│      ├────────────>│               │    │
│      │             │ select users  │    │
│      │             ├──────────────>│    │
│      │             │       12 rows │    │
│      │             │<┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤    │
│      │      200 ok │               │    │
│      │<┄┄┄┄┄┄┄┄┄┄┄┄┤               │    │
╰──────────────────────────── 4 messages ─╯
```

Plays: build: heads and lifelines draw down (0.3 s), then each message in
turn: a `●` runs from sender to receiver drawing the arrow behind it, the
label typing (0.4 s each, at most 3 s in all). Still: every arrow. Tones:
heads and lifelines quiet, names ink, calls ink, replies soft, the dot
accent. Says: `sequence, 4 messages: browser to api, GET /users; ...`

#### git

A branching model as git itself draws it, `git log --graph --oneline
--decorate`: feature branches, merges, tags. How a project branches, for
docs or a contributing guide.

```ascii git title="feature branch"
commit "init"
commit "add the parser"
switch -c feat
commit "draw fences"
switch main
commit "fix a typo"
switch feat
commit "add tests"
switch main
merge feat
tag v0.4
```

Grammar: git's own commands, without `git`: `commit "message"` on the branch
you are on; `branch <name>` a branch at the current commit (you stay where
you are); `switch <name>` (or `checkout <name>`) go to it; `switch -c <name>`
both; `merge <name> ["message"]` a merge commit on the current branch, its
message `Merge branch '<name>'` by default (always a merge commit, as
`--no-ff`; merging a branch with nothing new fails, naming it); `tag <name>`
on the current commit. The first branch is `main`. HEAD is where the last
line leaves you. Own options: `trunk` (the first branch's name, main).

Drawing, as git prints it: newest commit at the top; `*` a commit, `|` a
lane, `|\` a merge opening its second parent's lane, `|/` a lane closing
into the commit it forked from; a merge commit's row padded (`*   `) to the
`|\` under it. Each commit shows a 7 character hash, the first 7 hex digits of
`fnv1a32("<parents' hashes joined by a space>\n<message>")` (the first
commit's parents empty), then its decorations as git prints them
(`(HEAD -> main, tag: v0.4)`, `(feat)`), then the message. It sizes itself
to its longest line; with `width`, messages are cut with `...`.

```text
╭─ feature branch ──────────────────────────────────────────╮
│ *   bec5657 (HEAD -> main, tag: v0.4) Merge branch 'feat' │
│ |\                                                        │
│ | * ce00d81 (feat) add tests                              │
│ * | 3b7dfd0 fix a typo                                    │
│ | * af94e9d draw fences                                   │
│ |/                                                        │
│ * 1691e25 add the parser                                  │
│ * 2e105e7 init                                            │
╰─────────────────────────────────── 2 branches, 6 commits ─╯
```

Plays: build: the lines print in from the top as a pager scrolls them (0.12 s
a line, at most 2.4 s); on a fork or merge row the diagonal swings out, drawn
`|` for one frame and then `\` or `/`. Holds. Still: the whole log. Tones:
lanes in git's graph colours by lane order (accent, good, violet, warn, then
soft), hashes warn (git's yellow), `HEAD ->` mark, branch names good, tags
warn, messages ink. Says: `git, 2 branches, 6 commits, newest first: Merge
branch 'feat' on main, tagged v0.4; add tests on feat; ...`

#### railroad

A command's or a grammar's syntax as a railroad diagram; a dot runs the
track. CLI usage in a README, a config grammar in docs.

```ascii railroad title=usage
ascii.rest md <file> [--ascii | --svg <dir>]
```

Grammar: the usage line as people write it: words are literal, `<name>` a
value, `[ ... ]` optional, `( a | b )` one of, `[ a | b ]` optional one of,
`...` after an item repeats it. Several lines are several usages stacked.
A line too wide for the width wraps, the track turning down at `╮` and back in
at `╰`. Own options: none.

```text
╭─ usage ────────────────────────────────────────────╮
│ ├─ ascii.rest ─ md ─ <file> ─┬─────────────────┬─┤ │
│                              ├─ --ascii ───────┤   │
│                              ╰─ --svg ─ <dir> ─╯   │
╰────────────────────────────────────────────────────╯
```

Plays: build: the track draws from the left to the right (0.8 s), branches
dropping as the track reaches them. Cycle: a `●` runs the track end to end,
taking the first path, then the next branch on the next run, until every path
is run (2 s a run). Still: no dot. Tones: track quiet, words ink, `<values>`
accent, the dot accent. Says: `railroad: ascii.rest md <file>, then
optionally --ascii, or --svg <dir>.`

#### logic

A gate circuit drawn from boolean expressions, the inputs stepping through
their truth table and the signal running along the wires: a release rule, a
feature flag's condition, a permission check, explained in docs, an issue or
by an agent.

```ascii logic title=release
ready is built and (tested or not skipped)
```

Grammar, read by logic itself: each line is `output is expression`, the
expression of names, `and`, `or`, `xor`, `not` and parentheses (`not` binds
tightest, then `and`, `xor`, `or`); a chain of one operator is one gate with
more inputs (`a and b and c`). The inputs are the names that are not an
earlier line's output, in order of first appearance, 6 at most. An earlier
output used in a later line is an input there, its name soft. Own options:
`hold` (seconds each row of the truth table holds, 1.5).

Layout: each line is a tree laid on its side, inputs at the left, its output
at the right; lines stack with a blank row between. A name is one row; a gate
stacks its inputs' blocks top to bottom with a blank row between, and is a box
7 columns wide spanning its inputs' rows and one row above and below, its
word on its output row, midway between its first and last input (rounded
toward the top). Gates of one depth share a column, 4 columns of wire
apart, so every wire is straight. Names on the left, padded to the longest,
then the value; the output after its gate, `── ready 0`. Shape carries the
values: a wire carrying 1 is heavy (`━`, meeting a box as `┥` in and `┝`
out), one carrying 0 light (`─`, `┤`, `├`).

```text
╭─ release ────────────────────────────────────────────╮
│                                    ┌─────┐           │
│ built   0 ─────────────────────────┤     │           │
│                                    │     │           │
│                         ┌─────┐    │ and ├── ready 0 │
│ tested  0 ──────────────┤     │    │     │           │
│                         │ or  ┝━━━━┥     │           │
│              ┌─────┐    │     │    └─────┘           │
│ skipped 0 ───┤ not ┝━━━━┥     │                      │
│              └─────┘    └─────┘                      │
╰────────────────────────────────── 3 inputs, 3 gates ─╯
```

Plays: build 1.2 s: the boxes draw in by column from the left, then the wires
fill from the inputs rightward to their settled values. Cycle: the inputs
step through every row of their truth table in Gray code order, so one input
flips at a time, `hold` seconds a row; when an input flips, its new value
runs right along its wire at 30 columns a second, and each gate it reaches
passes its new output on, so the wires change in turn as the signal
propagates. The cycle is `2^n` rows. Still: every input 0, settled. Tones:
names ink, values accent when 1 and soft when 0, wires carrying 1 accent,
carrying 0 quiet, boxes quiet, gate words soft, the output's value accent when
1. Says: `logic, release: ready is built and (tested or not skipped); with
every input 0, ready is 0.`

### 3.4 internals

#### flame

A profile as a flame graph: each frame a block as wide as its samples, its
callees on top, the root at the bottom. A slow render in an issue, a profile
in docs.

```ascii flame title="render, 48 ms" unit=ms
main;parse;lex 4
main;parse 6
main;draw;layout 12
main;draw;paint 18
main;draw 4
main;flush 4
```

Grammar: Brendan Gregg's folded stacks, read by flame itself, so the output
of `stackcollapse-*` and `perf script` pipelines pastes straight in: each
line is a stack, its frames joined by `;` from the root, then a space and a
whole number of samples, the last word on the line (a frame may hold spaces).
Counts are self samples; a frame's width is the sum of its own and its
callees'; identical stacks add up. Siblings sit in name order, as
`flamegraph.pl` draws them (the x axis is not time). The root spans the
width (44 by default); a frame is `[name]`, its name cut to fit; one narrower
than 3 columns is left out. The hottest leaf, the leaf with the most self
samples (ties to the first in name order), is named on the bottom edge. Own
options: `unit` (samples).

```text
╭─ render, 48 ms ──────────────────────────────╮
│ [layout   ][paint          ]       [le]      │
│ [draw                         ][fl][parse  ] │
│ [main                                      ] │
╰───────────────────────── paint, 18 of 48 ms ─╯
```

Plays: build: the root grows from the left (0.3 s), then each level rises on
top of it, its blocks widening from their left edges (0.3 s a level). Still:
full. Tones: blocks by depth (accent, warn, bad, violet, then soft, as heat
climbs), names ink, the hottest leaf mark. Says: `flame, render, 48 ms: main
48; draw 34; layout 12; paint 18, the hottest at 38%; flush 4; parse 10; lex
4.`

#### bits

A binary layout: named fields on a bit ruler, drawn from a bit mask the way
register datasheets write them. A packet header, a file format, a register.

```ascii bits title="ipv4 header"
vvvviiiiddddddee
llllllllllllllll
v=version i=ihl d=dscp e=ecn l=length
```

Grammar, read by bits itself: rows of letters, one letter a bit, every row 8,
16 or 32 letters long (all the same; that is the bits a row); a field is a
run of one letter, going on into the next row when one row ends in it and
the next starts with it; a letter in two separate runs fails, naming it; `.`
is an unused bit, left blank. Then one or more lines of `key=value` naming
every letter (`v=version`, a name with spaces in quotes); a letter with no
name fails, naming it. Walls stand where the letter changes. Two columns a
bit. Own options: none.

```text
╭─ ipv4 header ─────────────────────╮
│  0                   1            │
│  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5  │
│ ┌───────┬───────┬───────────┬───┐ │
│ │version│  ihl  │   dscp    │ecn│ │
│ ├───────┴───────┴───────────┴───┤ │
│ │            length             │ │
│ └───────────────────────────────┘ │
╰─────────────── 5 fields, 32 bits ─╯
```

Plays: build: the ruler counts in left to right (0.4 s), then each field's
walls drop in and its name types, in order (0.2 s each). Holds. Still: full.
Tones: ruler soft, walls quiet, names ink. Says: `bits, ipv4 header, 32 bits:
version 4, ihl 4, dscp 6, ecn 2, length 16.`

#### pinout

A chip and what each pin does, numbered the DIP way: hardware READMEs.

```ascii pinout title=ne555 pulse=out
gnd vcc
trig dis
out thr
reset ctrl
```

Grammar: each line is a row: the left pin, then the right pin (`-` for no
pin); pins numbered down the left from 1 and up the right. Pin 1 has a `●`
inside the body. Own options: `pulse` (a pin's name: a pulse runs out along
its wire, the point of the figure, say an output; none).

```text
╭─ ne555 ──────────────────╮
│         ╭───────╮        │
│   gnd ──┤1 ●   8├── vcc  │
│  trig ──┤2     7├── dis  │
│   out ━━┤3     6├── thr  │
│ reset ──┤4     5├── ctrl │
│         ╰───────╯        │
╰───────────────── 8 pins ─╯
```

Plays: build: the body draws (0.3 s), then the pins grow out in number order
round the chip, each label typing (0.1 s a pin). Cycle, with `pulse`: a pulse
runs out along that pin's wire, `━` moving outward, every 1.2 s; without it
the figure holds. Still: the pulse pin's wire heavy. Tones: body quiet,
numbers soft, labels ink, the pulse pin's label mark and wire accent. Says:
`pinout, ne555, 8 pins: 1 gnd, 2 trig, 3 out, ...`

#### schema

Tables and the references between them as an ER diagram, with crow's feet:
a data model in docs or an agent's plan.

```ascii schema title=blog
users(id*, name, email)
posts(id*, user_id, title)
ref posts.user_id users.id
```

Grammar, read by schema itself: textbook relational notation, one table a
line, `name(column, column, ...)`, a key column ending in `*`; then `ref
table.column table.column`, the referencing column first and the one it
points at second (`ref posts.user_id users.id`: many posts to one user). A
ref naming a missing table or column fails, naming it. Own options: none.

Layout, placed by the reference graph: a table's column, left to right, is
its depth (0 for a table that references none, else one more than the
deepest table it references); tables in a column stack in written order, a
row apart; a referencing table is placed lower than the table it references,
so its referencing row sits 3 rows or more under the referenced row (the
boxes stagger, they are not a row of equal columns). A reference leaves the
referenced box's right wall at its row with `┼` (one), runs right, turns down,
and enters the referencing box's left wall at its row with `o<` (zero or
many). The zero is `o`, as `drawable()` has no `○`. References between the
same two columns take lanes a column apart; a self reference loops off the
right wall; a cycle of references fails, naming its tables.

```text
╭─ blog ────────────────────────╮
│ ╭─ users ─╮                   │
│ │ id*     ├┼──╮               │
│ │ name    │   │   ╭─ posts ─╮ │
│ │ email   │   │   │ id*     │ │
│ ╰─────────╯   ╰─o<┤ user_id │ │
│                   │ title   │ │
│                   ╰─────────╯ │
╰─────── 2 tables, 1 reference ─╯
```

Plays: build: tables draw in by depth, their columns typing (0.5 s each), then
each reference draws from its one end to its many end with a `●` riding it
(0.5 s each). Holds. Still: full. Tones: boxes quiet, table names accent,
columns ink, `*` soft, references soft, crow's feet ink. Says: `schema, blog:
users with id, name, email; posts with id, user_id, title; each post has one
user by user_id.`

### 3.5 tokens

#### qr

A QR code from text, two modules a cell in half blocks so they stay square,
the text under it: scan to install, scan for the docs.

```ascii qr
https://ascii.rest
```

Grammar: the line is the text (bare or quoted). Byte mode, versions 1 to 10,
the smallest that fits; mask chosen by the spec's penalty rules; quiet zone 2
modules. Own options: `level` (l, m, q, h; m), `caption` (true), `invert`
(false: dark modules drawn in ink).

Illustrative still (18 bytes at M is version 2: 25 modules and a quiet zone of
2 is 29 by 15 cells inside the frame). Each finder is exactly:

```text
█▀▀▀▀▀█
█ ███ █
█ ▀▀▀ █
▀▀▀▀▀▀▀
```

and the caption `https://ascii.rest` sits under the code. Plays: build 1.2 s:
the three finders draw, then the data modules resolve from seeded noise to
their values, then a scan line passes down once. Still: the code. Tones:
modules ink, the scan accent, caption soft. Says: `qr: a code for
https://ascii.rest.` Verification: render the still with `svg()`, open it in
the installed playwright CLI's Chromium and decode it with the
`BarcodeDetector` API; if that API is not there, say so and check format and
version bits and the Reed-Solomon codewords against the spec's tables in unit
tests. A still is not shipped as working until something decoded it.

#### sigil

A fingerprint of a string, drawn as a bishop's random walk on a 17 by 9 field
(the "randomart" OpenSSH shows for a key): a project's mark, a key or a hash
anyone can compare by eye.

```ascii sigil
bas3line
```

Grammar: the line is the seed text. The walk: 16 bytes from
`mulberry32(fnv1a32(text))`, each `floor(next() * 256)`; from the centre (8, 4),
each byte gives four moves from its low bits up, bit 0 right (1) or left (0),
bit 1 down (1) or up (0), held inside the field; a cell's visits pick a
character from ` .o+=*BOX@%&#/^`; `S` at the start, `E` at the end. Default
title: the text. Own options: none.

```text
╭─ bas3line ────────╮
│                   │
│                   │
│                   │
│           o       │
│         S. o      │
│      . . .o .     │
│     E o =..o .    │
│        B.=O .     │
│        .OB+*      │
╰───────────────────╯
```

Plays: build 1.6 s: the bishop (`●`, accent) walks its 64 moves, each cell
thickening as it is visited; `S` and `E` land at the end. Still: the field.
Tones: marks by visits (soft to ink to accent), `S` good, `E` bad. Says:
`sigil of bas3line.`

#### stamp

A rubber stamp that thuds onto the page, with who and when: an issue's
verdict, a changelog's "shipped". Default frame `none`; it draws its own
double border.

```ascii stamp
approved
"by @bas3line on 2026-10-10"
```

Grammar: the first line is the stamp's word, drawn in banner's `slim` letters
at one column a pixel; a quoted text is the small line. Any word is only
lettering: there is no vocabulary of verdicts and no word picks a colour.
Own options: `tone` (accent, good, warn, bad, violet; accent), the stamp's
ink. Wear, seeded: a letter cell at (x, y) is `▒` when
`fnv1a32("<word>:x:y") % 9 === 0`.

```text
╔═════════════════════════════════╗
║  █  ██  ██  ██   █  █ █ ███ █▒  ║
║ █ █ █ █ █ █ █ █ ▒ █ █ █ ▒   █ █ ║
║ ███ █▒  ██  █▒  █ █ █ █ █▒  █ ▒ ║
║ █ █ █   █   █ █ █ █  █  █   █ █ ║
║ █ █ ▒   ▒   █ █  █   █  ███ ██  ║
║   by @bas3line on 2026-10-10    ║
╚═════════════════════════════════╝
```

Plays: build 0.8 s: an outline two cells larger each side closes in on the
stamp's place (0.25 s), it lands (the letters appear at once, the whole stamp
offset a column for two frames, the thud), then the wear settles in. Still:
landed. Tones: border, letters and small line all in the stamp's `tone`.
Says: `stamp: approved, by @bas3line on 2026-10-10.`

#### ticket

A pass for a release or an event: its two ends in banner letters with a `>`
flying between them, a perforation, and a stub with the details in one strip
and a barcode. A release post, a launch invite.

```ascii ticket
v0.4 v0.5 "markdown figures"
gate=npm seat=1A time=18:00
```

Grammar: line 1 is the ends, one or two bare words, and an optional quoted
subtitle; the lines after it are `key=value` fields, in order. The ends are
drawn in banner's `slim` letters (a character the font lacks fails, naming
it), two ends with a `>` midway in a 9 column gap; one end is an admission.
The subtitle sits under them. A dashed perforation crosses the pass; under
it the stub prints the fields in one strip, `key value` joined by two spaces,
and at its right a barcode of 11 bars from `▌▐█▍`, bar i being bits 2i and
2i+1 of `fnv1a32("<ends joined by a space> <subtitle>")`. Default title:
`boarding pass` with two ends, `admit one` with one. Own options: none.
Uses core's `Body.joins` (section 4) so the frame meets the perforation
with `├┄` and `┄┤`.

```text
╭─ boarding pass ─────────────────────────────╮
│ █ █ ███   █ █         █ █ ███   ███         │
│ █ █ █ █   █ █         █ █ █ █   █           │
│ █ █ █ █   ███    >    █ █ █ █   ██          │
│  █  █ █     █          █  █ █     █         │
│  █  ███ █   █          █  ███ █ ██          │
│ markdown figures                            │
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
│ gate npm  seat 1A  time 18:00   ▌▐▐▌▍▍█▍▌▐▍ │
╰─────────────────────────────────────────────╯
```

Plays: build 1.4 s: printed out of a slot, a row at a time from the top; the
`>` flies across the gap from the first end and comes to rest midway (0.4 s);
the subtitle types; the barcode's bars draw left to right. Holds. Still:
printed. Tones: ends accent, `>` accent, subtitle ink, field keys soft and
values ink, perforation quiet, barcode ink. Says: `ticket: v0.4 to v0.5,
markdown figures, gate npm, seat 1A, time 18:00.`

### 3.6 games

#### chess

A chess position from FEN, and moves played from it: an opening in docs, a
puzzle, a game an agent reasons about.

```ascii chess title="ruy lopez"
r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
f1b5
```

Grammar: the first line is a FEN (or `start`); words after it are moves in
UCI (`e2e4`, castling as the king's move `e1g1`, promotion `e7e8q`), checked
as legal enough: a piece of the side to move on the from square. White
capitals, black lower case; a square 3 columns, dark squares `░` round their
piece; the last move's from square `·`, its piece in `[ ]`. Label: the last
move; status: who is to move. Own options: `flip` (false: white at the
bottom).

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

Plays: build: the FEN's position drops in a rank at a time from the top (0.4
s), then each move slides its piece square by square along its path (0.5 s a
move), a capture blinking out. Still: the final position, the last move
marked. Tones: white pieces ink, black soft, `░` quiet, the moved piece mark,
labels soft. Says: `chess, black to move after f1b5: white king e1, ...`

#### bracket

A knockout bracket: entrants in pairs, winners moving on to the champion. A
naming vote in a changelog post, an agent's eval rounds.

```ascii bracket title="best font"
block slim round bold
block round
block
```

Grammar: each line is a round: the first line the entrants in seed order
(2, 4, 8 or 16), each next line the ones who went through, one from each pair
of the line before, in order (anything else fails, naming the pair). The
champion is the last line's one name. Own options: none.

```text
╭─ best font ───────────────╮
│ block ─┐                  │
│        ├─ block ─┐        │
│ slim  ─┘         │        │
│                  ├─ block │
│ round ─┐         │        │
│        ├─ round ─┘        │
│ bold  ─┘                  │
╰────────────── block wins ─╯
```

Plays: build: the entrants type in (0.3 s), then round by round each winner's
line draws from its name to the join and on, and its name types at the next
column, the loser's line staying quiet (0.5 s a round); the champion glints.
Still: full. Tones: lines quiet, a winner's path accent, losers soft, the
champion mark. Says: `bracket, best font: block beat slim, round beat bold,
block beat round; block wins.`

#### sprite

Pixel art from rows of letters, each pixel two columns of block; blank lines
between frames animate it. A README mascot, a game's character.

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

Grammar: rows of pixels, `.` empty (a space too, though the indent every row
shares is taken off, so lead with `.`); `#` ink, `a` accent, `g` good, `w`
warn, `b` bad, `v` violet, `s` soft; a blank line starts the next frame;
frames the same size (else it fails naming the frame). For one ink, each tone
has its block too: `#` `██`, `a` `▓▓`, `b` and `v` `▓▓`, `g` and `w` `▒▒`, `s`
`░░`. Default frame `none`. Own options: `fps` (frames a second, 4).

```text
      ████████
  ████████████████
████▓▓▓▓████▓▓▓▓████
████▓▓▓▓████▓▓▓▓████
████████████████████
████████████████████
████    ████    ████
```

Plays: build: the first frame prints a row at a time from the top (40 ms a
row). Cycle (two frames or more): the frames in turn at `fps`. Still: frame
one. Tones: by letter. Says: `sprite, 10 by 7 pixels, 2 frames.`

### 3.7 places

#### world

A world map with pins and routes and a key: where the servers are, where the
users are, where you are.

```ascii world title=regions here=sfo
sfo "us west"
iad "us east"
fra "eu central"
sin "asia"
```

Grammar: each line is a place, a three letter airport code from a built-in
list of about 60 (sfo, iad, fra, sin, lhr, nrt, syd, gru, bom, ...) or two
numbers `lat lon`, then a quoted label; `route <a> <b>` draws a route between
two places named on other lines. Own options: `here` (a place: drawn `●` on
the map and in the key, the others numbered from 1 in order; none). The map
is the earth piece's 5 degree land map (copied into the component, or moved
into the kit for both) sampled to 88 by 22 points and drawn 44 by 11 in
quadrant blocks (`▘▝▀▖▌▞▛▗▚▐▜▄▙▟█`), which keeps the projection's aspect. A
route is `·` dots on the straight line between its two pins, on sea cells
only, so the land stays readable.

```text
╭─ regions ────────────────────────────────────╮
│         ▄▄▄▄▄▄▄▄▄▄▄▖    ▖         ▄          │
│ ▘ ████████▌ ▀█ ▝█▀▘▗  ▗▄▛██████████████████▛ │
│       ▜██████▛▀▘     █▞2█▛▀█▜█████████▀▖     │
│       ▝●██▛▜1       ▄█▄▄▄███████████▌▝       │
│          ▀▘▄        ████████▀▘▝█▀▀█▛▗▖       │
│             ████▄      ████▘     ▝3▐▙▖▄      │
│              ▜███▘      ██▛▗        ▄▄▙▄▖    │
│              ▟▛▀        ▀▀▘         ▀▀▀█▛    │
│              ▛                               │
│               ▖             ▗▄▄▄▄▄▄▄▄▄▄▖     │
│ ▄██████████████████████████████████████████▄ │
│                                              │
│ ● sfo  us west                               │
│ 1 iad  us east                               │
│ 2 fra  eu central                            │
│ 3 sin  asia                                  │
╰──────────────────────────────────────────────╯
```

Plays: build: the land fades in as noise resolving to the map (0.6 s), then
the pins drop in order, each with a ring `( )` closing on it (0.2 s each).
Cycle, with `here` or a route: the `here` pin pulses (`●` and `•`, 1.2 s); a
`●` travels each route from one pin to the other, 2 s a trip; without either
the figure holds. Still: pins, no pulse. Tones: land quiet, pins accent, the
`here` pin mark, routes soft, key ink with codes soft. Says: `world, 4
places: sfo, us west, here; iad, us east; ...`

---

## 4. The engine: how a figure plugs in

### 4.1 A figure

```ts
// src/markdown/<name>.ts
export interface <Name>Data { ... }                     // the parsed form, for data already in JavaScript
export interface <Name>Options extends Common { ... }   // its own options, each default in its comment
export function <name>(source: string | <Name>Data, options?: <Name>Options): MarkdownPiece {
  const data = typeof source === "string" ? parse(source) : check(source);   // statements() or its own reader, then check
  return component("<name>", options, ["own", "options"], (o, room) => ({
    cols, rows, intro, cycle, says, title, label, status, joins,
    draw(s, t, at) { /* s.write(at.x + x, at.y + y, words, TONE) */ },
  }), { frame: "none" });   // defaults, only for figures that are not framed by default
}
```

- Lay out once in the callback; `draw(s, t, at)` depends on `t` only (seeded
  randomness with the kit's `fnv1a32` and `mulberry32`, never `Math.random` or
  `Date`). `t >= intro` is the finished figure; with `cycle`, `draw` must give
  the same frame at `intro` and `intro + cycle`. `at.still` is true for the
  still: nothing passing over it.
- Imports: `./core.ts`, `../kit/core.ts`, `../kit/recipes/checks.ts`, the
  kit's drawing and maths, and for the figures that use them `../banner.ts`
  (headline, stamp, ticket), `../kit/shapes3d.ts` and
  `../kit/recipes/motion.ts` (solid), `../kit/particles.ts` (confetti).
  Never another figure, never `src/pieces/` (world copies the land map, or it
  moves into the kit).
- Only `drawable()` characters; every word through `clean()`; shape says
  what colour says, so `plain()` reads alone; `MARK` at most one run a row.
- No figure reads a marker for "the one to read" and none gives a word a
  meaning by itself (no status vocabularies); emphasis comes from the
  figure's own field, computed or set by a named option (section 1).
- Every option and datum checked when the piece is made, with `fail()`, the
  kit's way (`sequence's line 2 has two arrows; a message goes from one
  actor to one actor`).
- Wiring (integration does this, a builder lists it in its report): the name
  in `GROUPS` (core), `kinds` and an export line in `index.ts`, a `catalog.ts`
  entry, the named React component (`<Sequence>`), `examples/markdown/<name>.ts`,
  `src/markdown/<name>.test.ts`, a `## <name>` section of
  `site/src/pages/docs/markdown-<group>.md`.
- Tests: the catalog's example draws the target still exactly through
  `plain()` and through `fromFence()`; a frame mid build differs and the
  still holds after; for a `cycle`, the frame at `intro + cycle` equals the
  frame at `intro`; `says`; the data form; own options; three errors at
  least; `svg(piece)` plays once (`/1 forwards/`) or loops for a cycle; `npm
  run kit -- examples/markdown/<name>.ts --at 0,0.3,1` passes.

### 4.2 core.ts

Core reads no list, table, heading or inline mark: there is no reader for
bold, italic, task boxes, notes after `//` or a dash, `label: value` rows,
GFM tables, `###` sections or `n*k` runs, no status vocabulary, and no rail,
clock or idle flag on a body (a figure is a function of `t`; one that keeps
moving does so in a `cycle`). `clean()` folds typographic quotes, dashes and
an ellipsis, and nothing else: an arrow or a check mark (`→`, `←`, `✓`, `✔`,
`✗`) fails as undrawable.

What it has for reading a fence's body:

```ts
/** A line of a fence's body, read: one statement. */
export interface Statement {
  line: number;                       // from 1, for errors
  words: string[];                    // bare words in order
  texts: string[];                    // "quoted" texts in order, cleaned
  attrs: Record<string, string>;      // key=value, key="with spaces"
  tokens: ({ word: string } | { text: string } | { key: string; value: string })[];   // all of it, in order
  raw: string;                        // as written, leading spaces off
}
export function statements(source: string, what?: string): Statement[];   // blank lines left out
export function blocks(source: string, what?: string): string[][];        // raw lines grouped by blank lines (sprite)
```

and in `src/kit/core.ts`, `export function fnv1a32(text: string): number`, a
text's FNV-1a hash over its code points, the seed every seeded figure takes.
`statements()` has no focus field and no indent, and gives `!` and `->` no
meaning: they stay inside the words they are written in.

And for drawing one:

- `GROUPS`: `lettering: [headline, typing, flap, marquee]`, `ornaments:
  [divider, confetti, solid, say, orbit]`, `machines: [sequence, git,
  railroad, logic]`, `internals: [flame, bits, pinout, schema]`, `tokens: [qr,
  sigil, stamp, ticket]`, `games: [chess, bracket, sprite]`, `places:
  [world]`.
- `component(kind, options, own, make, defaults?: { frame?: FrameStyle; play?:
  Play })`: a figure's own defaults, as headline, typing, flap, divider,
  confetti, solid, say, orbit, stamp and sprite are unframed.
- `Body.cycle?: number`: seconds of a seamless loop after the build. It makes
  the piece idle while in view (`MarkdownPiece.idle` stays, true when `cycle`
  is set, as the hosts read it), its still stays at `intro`, and its `motion`
  is `{ seconds: cycle, from: intro, once: false }` so a README's SVG loops the
  cycle rather than holding. `play: "loop"` still means rebuild and hold.
- `Body.joins?: number[]`: body rows where a dashed rule crosses the figure;
  the frame meets it with `├┄` on the left and `┄┤` on the right, the body
  draws the `┄` between (the ticket's perforation). With frame `none` the body
  alone draws it.
- The tones: ACCENT is ascii.rest's orange for what moves and what carries a
  value (a travelling dot, a live wire, a hub, a route); MARK is drawn
  inverted on a web page and in the accent elsewhere, for the one thing a
  figure's own data singles out (HEAD, the last move, the hottest leaf, the
  champion, `here`, the pulse pin); GOOD, WARN, BAD and VIOLET are colours a
  figure picks for lanes, pieces and inks (git's lanes, confetti, sprite
  letters, the stamp's `tone`), never a verdict. Tones' colours, frames,
  `box()`, `clean()`, `drawable()`, `linesOf()`, `wrap()`, `commas()`,
  `fence()`, `progress()`, `shown()`, `GLINT_SECONDS`, `plain()` and
  `asciiOf()` are there for every figure.
- A body that sizes itself past `WIDEST` (160) fails, naming the columns it
  needs, rather than losing what is past them.

### 4.3 index.ts, html.ts, remark.ts and the hosts

- `index.ts`: each figure's export and its `kinds` entry, added as it is
  built; `fencesOf()` and `Fenced` (CommonMark fences: a fence inside another
  is its text, a closing fence may be longer than its opener), `render()` on
  it, and `start()` forgetting a figure when its stop runs, so React
  StrictMode's mount, unmount, mount plays it.
- `html.ts`: `paint()` moves a figure on by the time since the last frame,
  up to two frames' worth (100 ms at the least), so a low fps keeps its pace.
- `remark.ts`: fences only; the rest of a page is left as it is.
- `catalog.ts`: `Entry` is `{ kind, group, about, for, moves, options,
  source }`: `for` the places it suits (readme, docs, changelog, issue,
  agent), `moves` one line on how it plays. `GROUP_TITLES`: lettering,
  ornaments, machines, inside a system, tokens, games, places.
- `react.tsx`: one named component per figure (`<Headline>` ... `<World>`),
  added as each is built; `<Markdown kind>` takes any. `element.ts` needs no
  per-figure change (it calls `make()`), but its `OPTIONS` list names every
  figure's own options so a change to one draws it again.
- `src/cli.ts` `md`: finds fences with `fencesOf()`.
- Registry item `markdown` (`npx ascii.rest add markdown`): every figure's
  file and the engine, needing `core`, `kit` and `banner`; `markdown-react`
  adds the React components.
- `scripts/kit/docs.ts` (`kit:docs`): checks `/docs/markdown/` and every group
  page, `markdown-lettering`, `-ornaments`, `-machines`, `-internals`,
  `-tokens`, `-games`, `-places`, as each is written: each `ts` block through
  the frame contract against the text after it, and each ```` ```ascii ````
  fence drawn and checked against the first `text` block after it in its
  section.

### 4.4 The site, on main's design

Nothing of the redesign. The home page gets `<section id="markdown">` just
below the scenes, built as main's category sections are (its `## markdown`
head, count from `catalog.length`, the same cards), each card a figure baked
with `markup()` and played by `start(section, { style: false, motion })`
loaded with a dynamic `import()` near the viewport; the tones map to main's
own tokens. Docs: `/docs/markdown/` and the seven group pages in main's
`Docs.astro` layout, each figure's section with the fence drawn by the remark
plugin, its source, options, a `ts` use and its plain text.

## 5. Builders

Seven groups for builders in parallel. Core's engine (section 4.2) and
`fnv1a32` in the kit are in, so every builder has `statements()`, `cycle`,
`joins`, the defaults and the hash; `headline` is built end to end as the
pattern (`headline.ts`, `headline.test.ts`, `examples/markdown/headline.ts`
and its section of `/docs/markdown-lettering/`).

| group | figures | heaviest part |
| --- | --- | --- |
| lettering | headline, typing, flap, marquee | headline on `banner()` with a fixed fill |
| ornaments | divider, confetti, solid, say, orbit | six creatures and their idles; confetti's particles landing on seeded cells |
| machines | sequence, git, railroad, logic | git's lane drawing as git prints it; logic's parser and propagation |
| internals | flame, bits, pinout, schema | schema's placement by the reference graph and its lanes |
| tokens | qr, sigil, stamp, ticket | the QR encoder and its decode check |
| games | chess, bracket, sprite | chess's moves |
| places | world | the map's sampling, about 60 airport codes, routes over the sea |
