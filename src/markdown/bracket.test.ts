// bracket: a knockout, a winner's line heavy and a loser's light, the champion's line glinting.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, GLINT, INK, MARK, QUIET, SOFT, fence, plain } from "./core.ts";
import { bracket } from "./bracket.ts";

const STILL = [
  "╭─ best font ───────────────╮",
  "│ block ━┓                  │",
  "│        ┡━ block ━┓        │",
  "│ slim ──┘         ┃        │",
  "│                  ┡━ block │",
  "│ round ━┓         │        │",
  "│        ┡━ round ─┘        │",
  "│ bold ──┘                  │",
  "╰────────────── block wins ─╯",
].join("\n");

const ENTRY = entryOf("bracket");
const fenced = (text: string) => {
  const [info, ...body] = text.split("\n");
  return bracket(body.slice(0, -1).join("\n"), fence(info.slice(3)).options as never);
};

test("bracket: the catalog's example draws its still through plain() and a fence", () => {
  const p = bracket(ENTRY.source, ENTRY.options as never);
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(fenceOf(ENTRY))), STILL);
  assert.equal(p.says, "bracket, best font: block beat slim, round beat bold, block beat round; block wins.");
  // in plain ASCII the heavy and light lines are both + - |, and the names still say who went through
  assert.equal(plain(p, { ascii: true }).split("\n")[2], "|        +- block -+        |");
});

test("bracket: the entrants type in, each round draws on to its next names, and the still holds", () => {
  const p = bracket(ENTRY.source, ENTRY.options as never);
  const frame = p.default();
  const at = (t: number) => frame(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  assert.equal(p.meta.still, 1.3);
  // the names typing
  assert.equal(at(0.15).split("\n")[1], "│ bl                        │");
  // the first round drawn, the second not yet
  const first = at(0.85).split("\n");
  assert.equal(first[2], "│        ┡━ block           │");
  assert.equal(first[4], "│                           │");
  assert.notEqual(at(0.85), STILL);
  assert.equal(at(1.3), STILL);
});

test("bracket: the winner's lines heavy, the champion's line accent and its name marked, losers soft, lines quiet", () => {
  const p = bracket(ENTRY.source, ENTRY.options as never);
  const { cols, rows, still } = p.meta;
  const color = new Uint8Array(cols * rows);
  const lines = p.default()(still!, { paper: true, color }).split("\n");
  const tone = (r: number, c: number) => color[r * cols + c];
  // block's line: accent all the way to the champion, who is marked
  assert.equal(lines[1].slice(8, 10), "━┓");
  assert.equal(tone(1, 8), ACCENT);
  assert.equal(tone(2, 10), ACCENT);
  assert.equal(tone(4, 19), ACCENT);
  assert.equal(tone(4, 22), MARK);
  assert.equal(tone(1, 2), INK);
  // slim lost: its name soft, its line light and quiet
  assert.equal(tone(3, 2), SOFT);
  assert.equal(tone(3, 8), QUIET);
  // round beat bold but not block: its line heavy and soft, its second line light and quiet
  assert.equal(lines[5].slice(8, 10), "━┓");
  assert.equal(tone(5, 8), SOFT);
  assert.equal(tone(6, 13), SOFT);
  assert.equal(tone(6, 18), QUIET);
});

test("bracket: with a champion, a glint runs its line every 6 seconds, seamless, never in the still", () => {
  const p = bracket(ENTRY.source, ENTRY.options as never);
  const { cols, rows, still } = p.meta;
  const frame = p.default();
  const toned = (t: number) => {
    const color = new Uint8Array(cols * rows);
    return { text: frame(t, { paper: true, color }), color: [...color] };
  };
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 6, from: 1.3, once: false });
  const s = toned(still!);
  assert.ok(!s.color.includes(GLINT));
  for (const t of [still! + 0.3, still! + 0.7, still! + 6.7]) assert.ok(toned(t).color.includes(GLINT), `t=${t}`);
  // the glint changes colours only, never a character
  assert.equal(toned(still! + 0.7).text, s.text);
  assert.deepEqual(toned(still! + 6), s);
  assert.deepEqual(toned(still! + 3), s);
  assert.match(svg(p), /infinite/);
});

test("bracket: a bracket still being played draws ? for who is to play, holds, and says what is left", () => {
  const p = bracket("a b c d e f g h\na d f g");
  assert.equal(
    plain(p),
    [
      "╭─────────────────────╮",
      "│ a ━┓                │",
      "│    ┡━ a ─┐          │",
      "│ b ─┘     │          │",
      "│          ├─ ? ─┐    │",
      "│ c ─┐     │     │    │",
      "│    ┢━ d ─┘     │    │",
      "│ d ━┛           │    │",
      "│                ├─ ? │",
      "│ e ─┐           │    │",
      "│    ┢━ f ─┐     │    │",
      "│ f ━┛     │     │    │",
      "│          ├─ ? ─┘    │",
      "│ g ━┓     │          │",
      "│    ┡━ g ─┘          │",
      "│ h ─┘                │",
      "╰────── round 2 of 3 ─╯",
    ].join("\n"),
  );
  assert.equal(p.says, "bracket: a beat b, d beat c, f beat e, g beat h; a and d, f and g to play.");
  assert.equal(p.idle, false);
  assert.match(svg(p), /1 forwards/);
  assert.equal(bracket("a b").says, "bracket: a and b to play.");
});

test("bracket: takes names in quotes, rounds as data, and cuts long names to the room", () => {
  assert.equal(
    plain(bracket('"paper mono" "iosevka"\n"paper mono"')),
    [
      "╭───────────────────────────╮",
      "│ paper mono ━┓             │",
      "│             ┡━ paper mono │",
      "│ iosevka ────┘             │",
      "╰───────── paper mono wins ─╯",
    ].join("\n"),
  );
  assert.equal(plain(bracket({ rounds: [["block", "slim", "round", "bold"], ["block", "round"], ["block"]] }, { title: "best font" })), STILL);
  // sixteen long names in 60 columns: cut with ..., every row the width
  const names = Array.from({ length: 16 }, (_, i) => `entrant number ${i + 1} of the vote`);
  const rounds = [names];
  while (rounds.at(-1)!.length > 1) rounds.push(rounds.at(-1)!.filter((_, i) => i % 2 === 0));
  const cut = bracket({ rounds }, { width: 60 });
  const lines = plain(cut).split("\n");
  assert.equal(cut.meta.cols, 60);
  assert.equal(lines.length, 33);
  assert.match(lines[1], /^│ entr\.\.\. ━┓/);
  assert.match(lines.at(-1)!, /─ entr\.\.\. wins ─╯$/);
  // with the room a figure can take, the same names fit longer
  const wide = bracket({ rounds });
  assert.equal(wide.meta.cols, 159);
  assert.equal(plain(wide).split("\n")[1], `│ entrant number 1 of the ... ━┓${" ".repeat(126)}│`);
});

test("bracket: says what is wrong, the kit's way", () => {
  assert.throws(() => bracket(""), /ascii\.rest: bracket takes its entrants on a line, 2, 4, 8 or 16 of them/);
  assert.throws(() => bracket("a b c"), /bracket's first line has 3 entrants, and a knockout takes 2, 4, 8 or 16/);
  assert.throws(() => bracket("a"), /bracket's first line has 1 entrant, and a knockout takes 2, 4, 8 or 16/);
  assert.throws(() => bracket(Array.from({ length: 32 }, (_, i) => `n${i}`).join(" ")), /has 32 entrants/);
  assert.throws(() => bracket("a b c d\na b"), /bracket's line 2 names "b" from the pair "c" and "d": a winner is one of its pair/);
  assert.throws(() => bracket("a b c d\na"), /bracket's line 2 has 1 name, and line 1's 4 make 2 pairs: a round names one from each pair, in order/);
  assert.throws(() => bracket("a b\na\na"), /bracket's line 3 comes after "a" won on line 2: the champion is the last line/);
  assert.throws(() => bracket("a a"), /bracket's first line names "a" twice/);
  assert.throws(() => bracket('a ""'), /bracket's line 1 has an empty name/);
  assert.throws(() => bracket("café thé"), /bracket takes characters every monospace face draws one cell wide/);
  assert.throws(() => bracket('a "b'), /bracket's line 1 opens a quote it doesn't close/);
  assert.throws(() => bracket("a b seed=1"), /bracket's line 1 has seed="1": its options go on the fence/);
  assert.throws(() => bracket({ rounds: [] }), /bracket's rounds take its entrants first/);
  assert.throws(() => bracket({ rounds: [["a", 2 as never]] }), /bracket's round 1 takes names/);
  assert.throws(() => bracket(null as never), /bracket\(\) takes a fence's body/);
  assert.throws(() => bracket(Array.from({ length: 16 }, (_, i) => `n${i}`).join(" "), { width: 20 }), /bracket needs \d+ columns for 16 entrants with their names cut to 4 characters, and has 20/);
  assert.throws(() => bracket("a b", { flip: true } as never), /bracket\(\) has no option "flip"/);
});
