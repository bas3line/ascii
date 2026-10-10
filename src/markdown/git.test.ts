// git: a branching model as git log --graph prints it, from git's own commands.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fnv1a32 } from "../kit/core.ts";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, GOOD, INK, MARK, WARN, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { git } from "./git.ts";
import { fromFence, kinds } from "./index.ts";

const STILL = [
  "╭─ feature branch ──────────────────────────────────────────╮",
  "│ *   bec5657 (HEAD -> main, tag: v0.4) Merge branch 'feat' │",
  "│ |\\                                                        │",
  "│ | * ce00d81 (feat) add tests                              │",
  "│ * | 3b7dfd0 fix a typo                                    │",
  "│ | * af94e9d draw fences                                   │",
  "│ |/                                                        │",
  "│ * 1691e25 add the parser                                  │",
  "│ * 2e105e7 init                                            │",
  "╰─────────────────────────────────── 2 branches, 6 commits ─╯",
].join("\n");

const ENTRY = entryOf("git");
const INFO = fenceOf(ENTRY).split("\n")[0].slice(3);
const fenced = (info: string, body: string) => (kinds.git ? fromFence(info, body) : git(body, fence(info).options));
// The lanes and words of a log, its frame left off.
const bare = (source: string, options = {}) => plain(git(source, { frame: "none", ...options }));

function sane(p: MarkdownPiece, times: readonly number[] = [0, 0.1, 0.3, 0.7, 1.5, 3]) {
  const frame = p.default();
  for (const t of [...times, p.meta.still ?? 0]) {
    const rows = frame(t, { paper: true }).split("\n");
    assert.equal(rows.length, p.meta.rows, `t=${t}`);
    for (const r of rows) {
      assert.equal(r.length, p.meta.cols, `t=${t}: ${r}`);
      for (const ch of r) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)} in ${r}`);
    }
  }
}

test("git: the catalog's example draws its still, through plain() and a fence", () => {
  assert.equal(INFO, 'ascii git title="feature branch"');
  const p = git(ENTRY.source, { title: "feature branch" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, ENTRY.source)), STILL);
  assert.equal(
    p.says,
    "git, 2 branches, 6 commits, newest first: Merge branch 'feat' on main, tagged v0.4; add tests on feat; fix a typo on main; draw fences on feat; add the parser on main; init on main.",
  );
  sane(p);
});

test("git: each hash is the first 7 hex digits of fnv1a32 of its parents' hashes and its message", () => {
  const h = (s: string) => fnv1a32(s).toString(16).padStart(8, "0").slice(0, 7);
  const c1 = h("\ninit"), c2 = h(`${c1}\nadd the parser`), c3 = h(`${c2}\ndraw fences`), c4 = h(`${c2}\nfix a typo`), c5 = h(`${c3}\nadd tests`);
  const c6 = h(`${c4} ${c5}\nMerge branch 'feat'`);
  assert.deepEqual([c1, c2, c3, c4, c5, c6], ["2e105e7", "1691e25", "af94e9d", "3b7dfd0", "ce00d81", "bec5657"]);
});

test("git: draws what git log --graph --oneline --decorate --all --date-order prints", () => {
  // These are git 2.55's own rows for the same histories, the hashes swapped for ours. When the figure was built, a
  // differential run of 660 random histories of up to 6 branches matched git 2.55 itself row for row.
  const hash = (l: string) => l.replace(/\b[0-9a-f]{7}\b/, "#######");
  const three = bare(
    'commit "init"\nswitch -c a\ncommit "a1"\nswitch -c b\ncommit "b1"\nswitch main\ncommit "m1"\nswitch -c c\ncommit "c1"\nswitch a\ncommit "a2"\nswitch main\nmerge b\nswitch c\ncommit "c2"\nswitch main\nmerge a\nmerge c\ntag v1',
  );
  assert.deepEqual(three.split("\n").map(hash), [
    "*   ####### (HEAD -> main, tag: v1) Merge branch 'c'",
    "|\\",
    "* \\   ####### Merge branch 'a'",
    "|\\ \\",
    "| | * ####### (c) c2",
    "* | |   ####### Merge branch 'b'",
    "|\\ \\ \\",
    "| | * | ####### (a) a2",
    "| | | * ####### c1",
    "| |_|/",
    "|/| |",
    "* | | ####### m1",
    "| * | ####### (b) b1",
    "| |/",
    "| * ####### a1",
    "|/",
    "* ####### init",
  ]);
  // a merge whose second lane meets the last lane at once, and decorations in git's order: HEAD first, then by ref
  // name, last first, tags before branches
  const joined = bare(
    'commit "init"\ncommit "add the parser"\nswitch -c feat\ncommit "draw fences"\nswitch main\ncommit "fix a typo"\nswitch feat\ncommit "add tests"\nbranch zz\nbranch aa\nswitch main\nmerge feat\ntag v0.4\ntag a1\nswitch -c dev\ncommit "on dev"\nswitch feat\ncommit "more"\nswitch dev\nmerge feat',
  );
  assert.deepEqual(joined.split("\n").map(hash), [
    "*   ####### (HEAD -> dev) Merge branch 'feat' into dev",
    "|\\",
    "| * ####### (feat) more",
    "* | ####### on dev",
    "* | ####### (tag: v0.4, tag: a1, main) Merge branch 'feat'",
    "|\\|",
    "| * ####### (zz, aa) add tests",
    "* | ####### fix a typo",
    "| * ####### draw fences",
    "|/",
    "* ####### add the parser",
    "* ####### init",
  ]);
  // a branch never merged keeps its own lane, its tip where git puts it
  assert.deepEqual(bare('commit "a"\nswitch -c side\ncommit "b"\nswitch main\ncommit "c"').split("\n").map(hash), [
    "* ####### (HEAD -> main) c",
    "| * ####### (side) b",
    "|/",
    "* ####### a",
  ]);
});

test("git: the log prints in from the top, its diagonals swinging out; then it holds", () => {
  const p = git(ENTRY.source, { title: "feature branch" });
  const at = (t: number) => plain(p, { t }).split("\n");
  assert.equal(p.meta.still, 0.96);
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 0.96, from: 0, once: true });
  // two rows in, the merge row's \ still swinging out as |
  const early = at(0.12 + 0.02);
  assert.match(early[1], /^│ \*   bec5657/);
  assert.match(early[2], /^│ \|\| /);
  assert.match(early[3], /^│ +│$/);
  assert.match(at(0.12 + 0.1)[2], /^│ \|\\ /);
  assert.equal(plain(p, { t: 0.96 }), STILL);
  assert.equal(plain(p, { t: 30 }), STILL);
  assert.match(svg(p), /1 forwards/);
});

test("git: its tones, as git colours its log: lanes by colour, hashes yellow, HEAD marked, branches green", () => {
  const p = git(ENTRY.source);
  const { cols, rows } = p.meta;
  const color = new Uint8Array(cols * rows);
  const text = p.default()(p.meta.still!, { paper: true, color }).split("\n");
  const tone = (r: number, word: string, from = 0) => color[r * cols + text[r].indexOf(word, from)];
  assert.equal(tone(1, "bec5657"), WARN);
  assert.equal(tone(1, "HEAD ->"), MARK);
  assert.equal(tone(1, "main"), GOOD);
  assert.equal(tone(1, "v0.4"), WARN);
  assert.equal(tone(1, "Merge"), INK);
  assert.equal(tone(1, "*"), INK);
  // main's lane takes the first colour, feat's the next, as git hands them out
  assert.equal(tone(2, "|"), ACCENT);
  assert.equal(tone(2, "\\"), GOOD);
  // at most one run of the mark a row
  for (let r = 0; r < rows; r++) {
    const runs = [...color.slice(r * cols, (r + 1) * cols)].map((k) => (k === MARK ? 1 : 0)).join("").match(/1+/g) ?? [];
    assert.ok(runs.length <= 1, `row ${r}`);
  }
});

test("git: takes its steps as data, its trunk's name, checkout -b, merge messages, and a leading git", () => {
  const data = git({
    steps: [
      { commit: "init" },
      { commit: "add the parser" },
      { switch: "feat", create: true },
      { commit: "draw fences" },
      { switch: "main" },
      { commit: "fix a typo" },
      { switch: "feat" },
      { commit: "add tests" },
      { switch: "main" },
      { merge: "feat" },
      { tag: "v0.4" },
    ],
  }, { title: "feature branch" });
  assert.equal(plain(data), STILL);
  const same = ENTRY.source.replace("switch -c feat", "git checkout -b feat").replace(/^commit "(.*)"$/gm, 'git commit -m "$1"');
  assert.equal(plain(git(same, { title: "feature branch" })), STILL);
  const trunk = bare('commit "init"\nswitch -c feat\ncommit "x"\nswitch trunk\nmerge feat "ship x"', { trunk: "trunk" });
  assert.match(trunk.split("\n")[0], /^\*   [0-9a-f]{7} \(HEAD -> trunk\) ship x$/);
  assert.match(bare('commit "init"\nswitch -c dev\nswitch -c feat\ncommit "x"\nswitch dev\nmerge feat'), /Merge branch 'feat' into dev/);
  assert.match(bare('commit "init"\nbranch later\ntag v1'), /\(HEAD -> main, tag: v1, later\) init/);
  assert.equal(git('commit "only"').says, "git, 1 branch, 1 commit, newest first: only on main.");
});

test("git: never crashes on empty, long, unicode or broken input, and says what is wrong the kit's way", () => {
  assert.throws(() => git(""), /ascii\.rest: git takes git's own commands, one a line/);
  assert.throws(() => git("branch feat"), /git's line 1 makes the branch feat before the first commit: commit first/);
  assert.throws(() => git("tag v1"), /git's line 1 tags v1 before the first commit/);
  assert.throws(() => git('commit "a"\nrebase main'), /git's line 2 reads "rebase main": git here takes commit, branch, switch, checkout, merge, tag, not "rebase"/);
  assert.throws(() => git('commit "a"\ncomit "b"'), /not "comit" \(did you mean "commit"\?\)/);
  assert.throws(() => git("commit init"), /git's line 1 reads "commit init": a commit takes its message in quotes/);
  assert.throws(() => git('commit "a"\nswitch feat'), /git's line 2 switches to "feat", a branch there is not yet.*: switch -c feat makes it/);
  assert.throws(() => git('commit "a"\nswitch -c main'), /git's line 2 makes a branch "main", and there is one/);
  assert.throws(() => git('commit "a"\nmerge main'), /git's line 2 merges "main" into itself/);
  assert.throws(() => git('commit "a"\nbranch feat\nmerge feat'), /git's line 3 merges "feat", which has nothing main has not: commit on feat first/);
  assert.throws(() => git('commit "a"\nmerge nope'), /git's line 2 merges "nope", a branch there is not/);
  assert.throws(() => git('commit "a"\ntag v1\ntag v1'), /git's line 3 makes a tag "v1", and there is one/);
  assert.throws(() => git('commit "a"\nswitch -c ..bad'), /git's line 2 names a branch "\.\.bad"/);
  assert.throws(() => git('commit "a" x=1'), /git's line 1 has x="1": git's options go on the fence/);
  assert.throws(() => git('commit "a"\nswitch -x feat'), /git's line 2 has "-x": switch takes a branch, or -c and a new one/);
  assert.throws(() => git('commit "été"'), /ascii\.rest: git takes characters every monospace face draws one cell wide/);
  assert.throws(() => git('commit "a'), /git's line 1 opens a quote it doesn't close/);
  assert.throws(() => git({ steps: [] }), /git's steps take one step or more/);
  assert.throws(() => git({ steps: [{ commit: "a", tag: "b" }] } as never), /git's step 1 is .*: a step is one of/);
  assert.throws(() => git({} as never), /git\(\) takes git's commands/);
  assert.throws(() => git('commit "a"', { trunk: "-x" }), /git's trunk takes a branch's name/);
  // a long message is cut with ... to the width a figure can take, or the width given
  const long = git(`commit "${"word ".repeat(50).trim()}"`);
  assert.equal(long.meta.cols, 160);
  assert.match(plain(long).split("\n")[1], /^│ \* [0-9a-f]{7} \(HEAD -> main\) word word .* wor\.\.\. │$/);
  const narrow = plain(git(ENTRY.source, { width: 40 })).split("\n");
  assert.ok(narrow.every((l) => l.length <= 40));
  assert.equal(narrow[1], "│ *   bec5657 (HEAD -> main, tag: v... │");
  sane(long);
  // too many commits for the tallest a piece can be
  assert.throws(() => git(Array.from({ length: 130 }, (_, i) => `commit "c${i}"`).join("\n")), /git draws \d+ rows, past the 120 a piece can have/);
});
