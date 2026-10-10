---
layout: ../../layouts/Docs.astro
title: machines
description: Markdown figures of how things run, a sequence of messages, a git history, a command's railroad and a rule as logic gates, each written in its own field's notation.
---

Figures of how things run: messages moving between the parts of a system, a branching history, a command's syntax, a rule as logic gates. Each is written in the notation its own field already uses, PlantUML's arrows, git's commands, a man page's usage line and boolean algebra, and each one moves the way the thing it draws does. How fences work, and every place they play, is on [markdown figures](/docs/markdown/).

## sequence

Messages between actors, top to bottom in time, each one travelling its arrow: how a request moves through a system, for docs, an issue or an agent's explanation.

```ascii sequence title="list users"
browser -> api "GET /users"
api -> db "select users"
db --> api "12 rows"
api --> browser "200 ok"
```

The heads and lifelines draw down, then a dot runs each message from its sender to its receiver, drawing the arrow behind it as its words type. Then, while it is in view, a dot runs the messages again in turn.

````md
```ascii sequence title="list users"
browser -> api "GET /users"
api -> db "select users"
db --> api "12 rows"
api --> browser "200 ok"
```
````

Its plain text:

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

It is written in PlantUML's notation, a message a line: `a -> b "words"` is a call, drawn solid; `a --> b "words"` is a reply, drawn dashed; and `a -> a "words"` is a call to itself, a loop on its lifeline. The actors stand in the order they first appear, spaced so every message's words fit over its arrow. It has no options of its own. A call to itself:

```ascii sequence
browser -> api "GET /users"
api -> api "check the token"
api --> browser "200 ok"
```

```text
╭──────────────────────────────────────────╮
│ ╭─────────╮     ╭─────╮                  │
│ │ browser │     │ api │                  │
│ ╰────┬────╯     ╰──┬──╯                  │
│      │ GET /users  │                     │
│      ├────────────>│                     │
│      │             ├──╮ check the token  │
│      │             │<─╯                  │
│      │      200 ok │                     │
│      │<┄┄┄┄┄┄┄┄┄┄┄┄┤                     │
╰───────────────────────────── 3 messages ─╯
```

```ts
// request.ts
import { sequence } from "ascii.rest/markdown";

export default sequence({
  messages: [
    { from: "browser", to: "api", text: "GET /users" },
    { from: "api", to: "browser", text: "200 ok", reply: true },
  ],
});
```

In React it is `<Sequence>`.

## git

A branching model as git itself prints it with `git log --graph --oneline --decorate`, written as git's own commands in the order you would run them.

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

The log prints in from the top, as a pager scrolls it, each fork and merge swinging out as its row lands. Then it holds.

````md
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
````

Its plain text:

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

A line is a command with `git` left off: `commit "message"`, `branch <name>`, `switch <name>` (or `checkout <name>`), `switch -c <name>`, `merge <name>` with a message in quotes if you like, always a merge commit as `--no-ff` makes one, and `tag <name>`. The lanes are laid out by a port of git's own graph drawing, so the figure is what git prints for the same history. Each commit's short hash is seeded from its parents and its message, and HEAD is where the last line leaves you.

| option | what it does | default |
| --- | --- | --- |
| `trunk` | The first branch's name, the one the first commit is on. | `main` |

```ts
// history.ts
import { git } from "ascii.rest/markdown";

export default git({
  steps: [{ commit: "init" }, { switch: "feat", create: true }, { commit: "draw fences" }, { switch: "main" }, { merge: "feat" }],
});
```

In React it is `<Git>`.

## railroad

A command's syntax as a railroad diagram, read from its usage line as man pages and docopt write one, with a dot running the track: a CLI's usage in a README, a config's grammar in docs.

```ascii railroad title=usage
ascii.rest md <file> [--ascii | --svg <dir>]
```

The track draws from the left. Then, while it is in view, a dot runs it end to end, a run every 2 seconds, each run taking the next branch of every choice until every path is run.

````md
```ascii railroad title=usage
ascii.rest md <file> [--ascii | --svg <dir>]
```
````

Its plain text:

```text
╭─ usage ────────────────────────────────────────────╮
│ ├─ ascii.rest ─ md ─ <file> ─┬─────────────────┬─┤ │
│                              ├─ --ascii ───────┤   │
│                              ╰─ --svg ─ <dir> ─╯   │
╰────────────────────────────────────────────────────╯
```

Words are literal, `<name>` is a value, `[ ... ]` may be left out, `( a | b )` is one of them, `[ a | b ]` is one of them or none, and `...` after something repeats it. Several lines are several usages, stacked. A usage too wide for the `width` wraps, its track turning down at the end and back in at the left. It has no options of its own. Two usages, one that repeats and one a choice:

```ascii railroad
git add <path>...
git add (-A | --all)
```

```text
╭──────────────────────────────╮
│ ├─ git ─ add ─┬─ <path> ─┬─┤ │
│               ╰────<─────╯   │
│                              │
│ ├─ git ─ add ─┬─ -A ────┬─┤  │
│               ╰─ --all ─╯    │
╰──────────────────────────────╯
```

```ts
// usage.ts
import { railroad } from "ascii.rest/markdown";

export default railroad({ usages: ["git add <path>...", "git commit [-m <msg>]"] });
```

In React it is `<Railroad>`.

## logic

A gate circuit from boolean expressions, its inputs stepping through their truth table and each change running along the wires: a release rule, a feature flag's condition, a permission check.

```ascii logic title=release
ready is built and (tested or not skipped)
```

The boxes draw in and the wires fill. Then, while it is in view, the inputs step through every row of their truth table in Gray code order, one input flipping at a time, and each change runs right along its wire, every gate it reaches passing its new output on. A wire carrying 1 is heavy and one carrying 0 is light, so it reads in one ink. Its still has every input at 0.

````md
```ascii logic title=release
ready is built and (tested or not skipped)
```
````

Its plain text:

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

A line is `output is expression`, of names, `and`, `or`, `xor`, `not` and brackets: `not` binds tightest, then `and`, then `xor`, then `or`. A run of one operator is one gate with more inputs. The inputs are the names no earlier line makes, 6 at most, and a name an earlier line makes is that line's output, fed in. Each line is drawn as a tree on its side: the inputs at the left with their values, the gates in columns, its output at the right.

| option | what it does | default |
| --- | --- | --- |
| `hold` | Seconds each row of the truth table holds, the change running the wires included, 0.5 to 10. | `1.5` |

Two outputs from the same inputs, a half adder:

```ascii logic
carry is a and b
sum is a xor b
```

```text
╭──────────────────────────╮
│        ┌─────┐           │
│ a 0 ───┤     │           │
│        │ and ├── carry 0 │
│ b 0 ───┤     │           │
│        └─────┘           │
│                          │
│        ┌─────┐           │
│ a 0 ───┤     │           │
│        │ xor ├── sum 0   │
│ b 0 ───┤     │           │
│        └─────┘           │
╰────── 2 inputs, 2 gates ─╯
```

```ts
// rule.ts
import { logic } from "ascii.rest/markdown";

export default logic({ outputs: { ready: "built and (tested or not skipped)" } }, { title: "release" });
```

In React it is `<Logic>`.
