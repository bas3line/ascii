---
layout: ../../layouts/Docs.astro
title: ornaments
description: Markdown components that dress a document, a rule that moves, confetti, a turning shape, a creature with a balloon and the rings round a hub, built with ascii.rest's kit.
---

Components that dress a document: a rule that moves, a burst of confetti, a 3D shape turning, a creature with something to say, and the things around a project. They are built with ascii.rest's kit, its particles, its 3D renderer and its seeded randomness, so each one draws the same everywhere. Each one is an `ascii` fence, drawn in text: it builds in when you scroll to it, keeps moving while it is in view, and prints as the same text for a README. How fences work, and every place they play, is on [markdown components](/docs/markdown/).

## divider

A band of moving art between a document's sections, with words in its middle or none: a README's rule that moves.

```ascii divider
waves "part two"
```

It draws out from the middle to both ends in 0.7 seconds, the words typing in behind it, then keeps moving while it is in view: here the waves roll along it. Its still is the art at rest.

````md
```ascii divider
waves "part two"
```
````

Its plain text:

```text
_.-'~'-._.-'~'-._.  part two  -._.-'~'-._.-'~'-.
```

The first word is the style, and words in quotes sit in its middle, two spaces clear each side. It is 48 columns wide by default, with no frame, and it has no options of its own.

| style | what moves | rows |
| --- | --- | --- |
| `waves` | waves rolling along the rule | 1 |
| `stars` | stars twinkling | 3 |
| `rain` | rain falling | 3 |
| `sparks` | sparks crackling down a wire | 1 |
| `train` | a little train pulling out and coming round again, over a rail that carries the words | 3 |
| `dots` | a row of dots filling in, then a pulse running out along it | 1 |

A train, 60 columns wide:

```ascii divider width=60
train "next stop, the docs"
```

```text
 .--.  .--.   _n_
'o--o'-'o--o'-[o_o]>
══════════════════  next stop, the docs  ═══════════════════
```

```ts
// rule.ts
import { divider } from "ascii.rest/markdown";

export default divider({ style: "train", words: "next stop, the docs" }, { width: 60 });
```

In React it is `<Divider>`.

## confetti

A burst of confetti over a message, settling round it: a release post's 1.0, an issue's thanks.

```ascii confetti
"v1.0 is out" "1,000 stars"
```

The pieces are thrown from the message's middle as the kit's particles are, carried by gravity and slowed by drag, each a streak along its heading as it flies, and all of them land within 1.8 seconds while the message pops in. Then it holds. Where each piece lands is seeded by the message's words with the kit's `fnv1a32()` and `mulberry32()`, so the same words always settle the same way, on a page and in plain text.

````md
```ascii confetti
"v1.0 is out" "1,000 stars"
```
````

Its plain text:

```text
         *      ·              +          *
             ,  ·     °,  ·        °
      *,   ,    v1.0 is out        ,°    ~
  ·       •     1,000 stars      •
     ·  '               ~
```

The message is one line or two, each in quotes. It is 44 columns by 5 rows by default, with no frame.

| option | what it does | default |
| --- | --- | --- |
| `count` | How many pieces land round the message, 1 to 200. | `22` |

```ts
// thanks.ts
import { confetti } from "ascii.rest/markdown";

export default confetti({ lines: ["thank you"] }, { count: 30 });
```

In React it is `<Confetti>`.

## solid

A 3D shape turning, lit and shaded in characters, with a caption under it: a README's hero ornament. The shape is the kit's own, drawn by its 3D renderer.

```ascii solid
torus "ascii.rest"
```

It grows from a point while it turns, then turns once every 8 seconds while it is in view. Its still is the shape at its rest angle.

````md
```ascii solid
torus "ascii.rest"
```
````

Its plain text:

```text
            @@@@@$$#
          @$#*!!!!!***
         #!=;~---~:;===
        *=;~,,    ,-:;;;
        =;:-,      ::;:~
         ;:::;!#$@#*=;~
          ~:;!*#$#*=:,
              ,--,


           ascii.rest
```

The first word is the shape: `torus`, `cube`, `sphere`, `cone` or `cylinder`, or one of the kit's clouds of points, `galaxy`, `helix` or `ring`. A solid shape may take one of the kit's textures after it, `bands`, `stripes`, `checker`, `grid` or `spots`, and words in quotes are the caption. It is 32 columns wide, with no frame, and the rows the shape never reaches are cut.

| option | what it does | default |
| --- | --- | --- |
| `turn` | `turntable`, round an upright axis seen from a little above, or `tumble`, over and round as the donut does, coming round in 16 seconds. | `turntable` |
| `rows` | Rows the shape is drawn in, 5 to 40, before the rows it never reaches are cut. | `11` |

A cube, tumbling:

```ascii solid turn=tumble
cube "ascii.rest"
```

```text
          +----------+
          |**********|
          |**********|
          |**********|
          |**********|
          |**********|
          +----------+


           ascii.rest
```

```ts
// planet.ts
import { solid } from "ascii.rest/markdown";

export default solid({ shape: "sphere", texture: "bands", caption: "planet" }, { turn: "tumble" });
```

In React it is `<Solid>`.

## say

A little creature with a balloon of words over it, after the old Unix cowsay and cowthink: a README's friendly footer, an agent's sign-off.

```ascii say
a fence in, a drawing out.
```

The creature appears, the balloon opens and its words type in. Then the creature idles once every 4 seconds while it is in view: the cat blinks. Its still is the creature at rest and every word.

````md
```ascii say
a fence in, a drawing out.
```
````

Its plain text:

```text
╭────────────────────────────╮
│ a fence in, a drawing out. │
╰──┬─────────────────────────╯
    ╲
     /\_/\
    ( o.o )
     > ^ <
```

The whole body is the balloon's words as written, or the words inside the quotes when the body is one quoted text, wrapped at 28 columns, or to the `width`; a blank line starts a new paragraph in the balloon. It has no frame unless you ask for one.

| option | what it does | default |
| --- | --- | --- |
| `creature` | `cat`, `owl`, `fox`, `ghost`, `robot` or `crab`, each ascii.rest's own art with an idle of its own: the owl turns its head, the fox flicks an ear, the ghost bobs, the robot's antenna light blinks, the crab snaps its claws. | `cat` |
| `balloon` | `say`, a balloon with a tail, or `think`, a closed one with bubbles trailing down to the creature. | `say` |

An owl, thinking:

```ascii say creature=owl balloon=think
where did i put that fence?
```

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

```ts
// robot.ts
import { say } from "ascii.rest/markdown";

export default say({ text: "beep. all tests pass." }, { creature: "robot" });
```

In React it is `<Say>`.

## orbit

A hub and the rings of things around it, the satellites riding their rings: what surrounds a project, its hosts and its formats, for a README or docs.

```ascii orbit
ascii.rest
"react" "mdx" "svg"
"readme" "terminal"
```

The hub types in and each ring traces out round it, its satellites popping on. Then, while it is in view, the satellites ride their rings the way the kit's `orbiting()` goes round, right, down in front, left and up behind, passing behind the hub on the far side and in front of it on the near side. The first ring goes round in 8 seconds, the second in 16 and the third in 24.

````md
```ascii orbit
ascii.rest
"react" "mdx" "svg"
"readme" "terminal"
```
````

Its plain text:

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

The first line is the hub, a word or words in quotes. Each line after it is a ring, from the inside out, its satellites as words or words in quotes: 1 to 3 rings, of 1 to 6 each. The rings are ellipses of dots seen at a tilt, each clearing the one inside it, so it is as wide as its outer ring. It has no frame, and no options of its own.

```ts
// around.ts
import { orbit } from "ascii.rest/markdown";

export default orbit({ hub: "api", rings: [["web", "cli"]] });
```

In React it is `<Orbit>`.
