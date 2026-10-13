/*
 * git: a branching model as git itself draws it, git log --graph --oneline
 * --decorate --all --date-order: commits as *, lanes as |, a merge opening
 * its second parent's lane with \ and a lane closing into the commit it
 * forked from with /, each commit's short hash, its branches and tags, and
 * its message. Written as git's own commands, in the order you would run
 * them. The lanes are laid out by a port of git's graph.c, so the figure is
 * what git prints for the same history.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii git title="feature branch"
 *   commit "init"
 *   switch -c feat
 *   commit "draw fences"
 *   switch main
 *   merge feat
 *   tag v0.4
 *   ```
 *
 *   git('commit "init"\nswitch -c feat\ncommit "draw fences"\nswitch main\nmerge feat')
 *   git({ steps: [{ commit: "init" }, { switch: "feat", create: true }, { commit: "draw fences" }] })
 */
import { fail, fnv1a32, suggest } from "../kit/core.ts";
import { ACCENT, GOOD, INK, MARK, SOFT, VIOLET, WARN, clean, component, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A step of a history, as git's commands make one. */
export type GitStep =
  /** A commit with this message, on the branch you are on. */
  | { commit: string }
  /** A branch at the commit you are on; you stay where you are. */
  | { branch: string }
  /** Go to a branch; with create, make it at the commit you are on first, as switch -c does. */
  | { switch: string; create?: boolean }
  /** A merge commit on the branch you are on, of this branch: its message "Merge branch 'feat'" by default. */
  | { merge: string; message?: string }
  /** A tag on the commit you are on. */
  | { tag: string };

/** A history as data: git's commands, in the order they run. */
export interface GitData {
  steps: readonly GitStep[];
}

export interface GitOptions extends Common {
  /** The first branch's name, the one the first commit is on: "main" (the default). */
  trunk?: string;
}

// The lanes' colours, in the order git hands them out: a new lane takes the next.
const LANES = [ACCENT, GOOD, VIOLET, WARN, SOFT];
// The build: the log prints in from the top a row at a time, as a pager scrolls it, at most this long in all.
const ROW = 0.12, MOST = 2.4;
// A ref's name as git allows one, near enough: letters, digits, . _ / -, not starting with - or ending with / or .
const REF = /^[A-Za-z0-9_][A-Za-z0-9._/-]*$/;
const COMMANDS = ["commit", "branch", "switch", "checkout", "merge", "tag"];

// A step, with the line it came from for errors.
type Step = GitStep & { at: string };

// The fence's body: git's own commands, one a line, git itself left off (a leading git is allowed).
function parse(source: string): Step[] {
  const lines = statements(source, "git");
  if (!lines.length) fail(`git takes git's own commands, one a line, such as commit "init", switch -c feat, merge feat and tag v0.4`);
  return lines.map((s) => {
    const at = `git's line ${s.line}`;
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`${at} has ${key}=${show(s.attrs[key])}: git's options go on the fence, as \`\`\`ascii git ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    const words = s.words[0] === "git" ? s.words.slice(1) : s.words;
    const [command = "", ...rest] = words;
    const flags = rest.filter((w) => w.startsWith("-"));
    const names = rest.filter((w) => !w.startsWith("-"));
    const only = (allowed: readonly string[], usage: string) => {
      const bad = flags.find((f) => !allowed.includes(f));
      if (bad) fail(`${at} has ${show(bad)}: ${usage}`);
    };
    const one = (usage: string) => {
      if (names.length !== 1 || s.texts.length) fail(`${at} reads ${show(s.raw)}: ${usage}`);
      return names[0];
    };
    switch (command) {
      case "commit": {
        only(["-m"], `a commit is commit "a message"`);
        if (names.length || s.texts.length !== 1) fail(`${at} reads ${show(s.raw)}: a commit takes its message in quotes, as commit "add the parser"`);
        return { commit: s.texts[0], at };
      }
      case "branch":
        only([], "branch takes a name, as branch feat");
        return { branch: one("branch takes one name, as branch feat"), at };
      case "switch":
      case "checkout": {
        const create = command === "switch" ? "-c" : "-b";
        only([create], `${command} takes a branch, or ${create} and a new one, as ${command} ${create} feat`);
        return { switch: one(`${command} takes one branch, as ${command} main or ${command} ${create} feat`), create: flags.includes(create), at };
      }
      case "merge": {
        only(["--no-ff", "-m"], `merge takes a branch and a message in quotes if you like, as merge feat "ship it"`);
        if (names.length !== 1 || s.texts.length > 1) fail(`${at} reads ${show(s.raw)}: merge takes one branch and a message in quotes if you like, as merge feat "ship it"`);
        return { merge: names[0], ...(s.texts.length ? { message: s.texts[0] } : {}), at };
      }
      case "tag":
        only([], "tag takes a name, as tag v0.4");
        return { tag: one("tag takes one name, as tag v0.4"), at };
      default:
        return fail(`${at} reads ${show(s.raw)}: git here takes ${COMMANDS.join(", ")}${command ? `, not ${show(command)}${suggest(command, COMMANDS)}` : ""}`);
    }
  });
}

// Data, checked: each step one of git's commands, its words cleaned.
function check(data: GitData): Step[] {
  if (!data || typeof data !== "object" || !Array.isArray(data.steps)) fail(`git() takes git's commands, such as commit "init", or { steps: [{ commit: "init" }, ...] }, not ${show(data)}`);
  if (!data.steps.length) fail(`git's steps take one step or more, such as { commit: "init" }`);
  return data.steps.map((step, i) => {
    const at = `git's step ${i + 1}`;
    if (!step || typeof step !== "object") fail(`${at} is ${show(step)}: a step is { commit }, { branch }, { switch }, { merge } or { tag }`);
    const keys = Object.keys(step).filter((k) => COMMANDS.includes(k));
    if (keys.length !== 1) fail(`${at} is ${show(step)}: a step is one of { commit }, { branch }, { switch }, { merge } or { tag }`);
    const words = (v: unknown, what: string) => {
      if (typeof v !== "string" || !v.trim()) fail(`${at}'s ${what} takes words, not ${show(v)}`);
      return clean(v, `${at}'s ${what}`).replace(/\s+/g, " ").trim();
    };
    const s = step as Record<string, unknown>;
    if ("commit" in step) return { commit: words(s.commit, "commit"), at };
    if ("branch" in step) return { branch: words(s.branch, "branch"), at };
    if ("switch" in step) return { switch: words(s.switch, "switch"), create: s.create === true, at };
    if ("merge" in step) return { merge: words(s.merge, "merge"), ...(s.message !== undefined ? { message: words(s.message, "message") } : {}), at };
    return { tag: words(s.tag, "tag"), at };
  });
}

/** A commit of the history: its parents, first parent first, its message and its short hash. */
interface Commit {
  id: number;
  parents: number[];
  message: string;
  hash: string;
  /** The branch it was made on. */
  on: string;
}

// A short hash, seeded: the first 7 hex digits of fnv1a32 of its parents' hashes joined by a space, a newline and
// its message, so the same history always has the same hashes.
const hashOf = (parents: readonly string[], message: string) => fnv1a32(`${parents.join(" ")}\n${message}`).toString(16).padStart(8, "0").slice(0, 7);

// Runs the steps: the commits, where each branch and tag ends up, and where HEAD is left.
function run(steps: readonly Step[], trunk: string) {
  const commits: Commit[] = [];
  const branches = new Map<string, number | null>([[trunk, null]]);
  const tags = new Map<string, number>();
  let head = trunk;
  const named = (at: string, what: string, name: string) => {
    if (!REF.test(name) || name.endsWith("/") || name.endsWith(".") || name.includes("..")) fail(`${at} names a ${what} ${show(name)}: a ${what} is one word of letters, digits and . _ / -, as feat or v0.4`);
    return name;
  };
  const tip = (at: string, doing: string) => {
    const c = branches.get(head);
    if (c === null || c === undefined) fail(`${at} ${doing} before the first commit: commit first, as commit "init"`);
    return c;
  };
  // true when commit a is b or one of its ancestors
  const within = (a: number, b: number): boolean => {
    const seen = new Set<number>();
    const stack = [b];
    while (stack.length) {
      const c = stack.pop()!;
      if (c === a) return true;
      if (seen.has(c)) continue;
      seen.add(c);
      stack.push(...commits[c].parents);
    }
    return false;
  };
  const commit = (message: string, parents: number[]) => {
    const c: Commit = { id: commits.length, parents, message, hash: hashOf(parents.map((p) => commits[p].hash), message), on: head };
    commits.push(c);
    branches.set(head, c.id);
  };
  for (const step of steps) {
    const at = step.at;
    if ("commit" in step) {
      const parent = branches.get(head);
      commit(step.commit, parent === null || parent === undefined ? [] : [parent]);
    } else if ("branch" in step) {
      const name = named(at, "branch", step.branch);
      if (branches.has(name)) fail(`${at} makes a branch ${show(name)}, and there is one: switch ${name} goes to it`);
      branches.set(name, tip(at, `makes the branch ${name}`));
    } else if ("switch" in step) {
      const name = named(at, "branch", step.switch);
      if (step.create) {
        if (branches.has(name)) fail(`${at} makes a branch ${show(name)}, and there is one: switch ${name} goes to it`);
        branches.set(name, tip(at, `makes the branch ${name}`));
      } else if (!branches.has(name)) fail(`${at} switches to ${show(name)}, a branch there is not yet${suggest(name, [...branches.keys()])}: switch -c ${name} makes it`);
      head = name;
    } else if ("merge" in step) {
      const name = step.merge;
      if (!branches.has(name)) fail(`${at} merges ${show(name)}, a branch there is not${suggest(name, [...branches.keys()])}`);
      if (name === head) fail(`${at} merges ${show(name)} into itself: switch to the branch it goes into first`);
      const into = tip(at, `merges ${name}`);
      const from = branches.get(name)!;
      if (within(from, into)) fail(`${at} merges ${show(name)}, which has nothing ${head} has not: commit on ${name} first`);
      // git's own message, which leaves off " into main" and " into master"
      commit(step.message ?? `Merge branch '${name}'${head === "main" || head === "master" ? "" : ` into ${head}`}`, [into, from]);
    } else {
      const name = named(at, "tag", step.tag);
      if (tags.has(name)) fail(`${at} makes a tag ${show(name)}, and there is one`);
      tags.set(name, tip(at, `tags ${name}`));
    }
  }
  if (!commits.length) fail(`git draws commits, and these steps make none: start with commit "init"`);
  const made = [...branches].filter(([, c]) => c !== null) as [string, number][];
  return { commits, branches: made, tags: [...tags], head };
}

// --- the lanes: git's graph.c, ported ---------------------------------------------------------------
// git log --graph lays its lanes out with a small state machine in graph.c: for each commit, the columns of commits
// still to come, a mapping of where each lane goes on the next row, and rows of three kinds after the commit's own:
// a merge's row opening its second parent's lane, and rows collapsing lanes that now wait for the same commit. This
// is that machine for histories of one or two parents, so the rows are the ones git prints, in the same order.

/** A cell of the graph: a character and its lane's colour, an index into LANES, or -1 for none. */
type Cell = [string, number];
/** A row of the graph, and the commit on it if it is a commit's row. */
interface Row {
  cells: Cell[];
  commit?: Commit;
}

const PADDING = 0, SKIP = 1, COMMIT = 2, POST_MERGE = 3, COLLAPSING = 4;
const MERGE_CHARS = ["/", "|", "\\"];

function lanes(order: readonly Commit[]): Row[] {
  type Column = { c: number; color: number };
  const size = 4 * (order.length + 4);
  let columns: Column[] = [], newColumns: Column[] = [];
  let numColumns = 0, numNew = 0;
  let mapping: number[] = new Array(size).fill(-1), oldMapping: number[] = new Array(size).fill(-1);
  let mappingSize = 0, width = 0, commitIndex = 0, prevCommitIndex = 0, mergeLayout = 0, edgesAdded = 0, prevEdgesAdded = 0;
  let state = PADDING, prevState = PADDING, color = LANES.length - 1;
  let commit = order[0], parents: number[] = [], numParents = 0;
  let line: Cell[] = [];
  const rows: Row[] = [];

  const setState = (s: number) => ((prevState = state), (state = s));
  const write = (col: Column | undefined, ch: string) => line.push([ch, col ? col.color : -1]);
  const add = (ch: string) => line.push([ch, -1]);
  const pad = () => {
    while (line.length < width) add(" ");
  };
  const findColor = (c: number) => {
    for (let i = 0; i < numColumns; i++) if (columns[i].c === c) return columns[i].color;
    return color;
  };
  const findNew = (c: number) => {
    for (let i = 0; i < numNew; i++) if (newColumns[i].c === c) return i;
    return -1;
  };
  const correct = () => {
    for (let i = 0; i < mappingSize; i++) {
      const t = mapping[i];
      if (t >= 0 && t !== i >> 1) return false;
    }
    return true;
  };
  const insert = (c: number, idx: number) => {
    let i = findNew(c), at: number;
    if (i < 0) {
      i = numNew++;
      newColumns[i] = { c, color: findColor(c) };
    }
    if (numParents > 1 && idx > -1 && mergeLayout === -1) {
      // the first parent of a merge: the merge's row leans left when that parent is in a lane left of it
      const dist = idx - i, shift = dist > 1 ? 2 * dist - 3 : 1;
      mergeLayout = dist > 0 ? 0 : 1;
      edgesAdded = numParents + mergeLayout - 2;
      at = width + (mergeLayout - 1) * shift;
      width += 2 * mergeLayout;
    } else if (edgesAdded > 0 && width >= 2 && i === mapping[width - 2]) {
      // a lane a merge added that meets the last lane at once: |\|
      at = width - 2;
      edgesAdded = -1;
    } else {
      at = width;
      width += 2;
    }
    mapping[at] = i;
  };
  const update = (c: Commit) => {
    commit = c;
    parents = c.parents;
    numParents = parents.length;
    prevCommitIndex = commitIndex;
    [columns, newColumns] = [newColumns, columns];
    numColumns = numNew;
    numNew = 0;
    mappingSize = 2 * (numColumns + numParents);
    for (let i = 0; i < mappingSize; i++) mapping[i] = -1;
    width = 0;
    prevEdgesAdded = edgesAdded;
    edgesAdded = 0;
    let seen = false, inColumns = true;
    for (let i = 0; i <= numColumns; i++) {
      let cc: number;
      if (i === numColumns) {
        if (seen) break;
        inColumns = false;
        cc = c.id;
      } else cc = columns[i].c;
      if (cc === c.id) {
        seen = true;
        commitIndex = i;
        mergeLayout = -1;
        for (const p of parents) {
          // a merge, or a lane no later commit led into, takes the next colour
          if (numParents > 1 || !inColumns) color = (color + 1) % LANES.length;
          insert(p, i);
        }
        if (numParents === 0) width += 2;
      } else insert(cc, -1);
    }
    while (mappingSize > 1 && mapping[mappingSize - 1] < 0) mappingSize--;
    state = state !== PADDING ? SKIP : COMMIT;
  };
  const commitLine = () => {
    let seen = false;
    for (let i = 0; i <= numColumns; i++) {
      const col = columns[i];
      let cc: number;
      if (i === numColumns) {
        if (seen) break;
        cc = commit.id;
      } else cc = col.c;
      if (cc === commit.id) {
        seen = true;
        add("*");
      } else if (seen && edgesAdded > 1) write(col, "\\");
      else if (seen && edgesAdded === 1) write(col, prevState === POST_MERGE && prevEdgesAdded > 0 && prevCommitIndex < i ? "\\" : "|");
      else if (prevState === COLLAPSING && oldMapping[2 * i + 1] === i && mapping[2 * i] < i) write(col, "/");
      else write(col, "|");
      add(" ");
    }
    pad();
    setState(numParents > 1 ? POST_MERGE : correct() ? PADDING : COLLAPSING);
  };
  const postMergeLine = () => {
    let seen = false, parentCol: Column | undefined;
    for (let i = 0; i <= numColumns; i++) {
      const col = columns[i];
      let cc: number;
      if (i === numColumns) {
        if (seen) break;
        cc = commit.id;
      } else cc = col.c;
      if (cc === commit.id) {
        let idx = mergeLayout;
        seen = true;
        for (let j = 0; j < numParents; j++) {
          write(newColumns[findNew(parents[j])], MERGE_CHARS[idx]);
          if (idx === 2) {
            if (edgesAdded > 0 || j < numParents - 1) add(" ");
          } else idx++;
        }
        if (edgesAdded === 0) add(" ");
      } else if (seen) {
        write(col, edgesAdded > 0 ? "\\" : "|");
        add(" ");
      } else {
        write(col, "|");
        if (mergeLayout !== 0 || i !== commitIndex - 1) {
          if (parentCol) write(parentCol, "_");
          else add(" ");
        }
      }
      if (cc === parents[0]) parentCol = col;
    }
    pad();
    setState(correct() ? PADDING : COLLAPSING);
  };
  const collapsingLine = () => {
    let usedHorizontal = false, edge = -1, edgeTarget = -1;
    [mapping, oldMapping] = [oldMapping, mapping];
    for (let i = 0; i < mappingSize; i++) mapping[i] = -1;
    for (let i = 0; i < mappingSize; i++) {
      const target = oldMapping[i];
      if (target < 0) continue;
      if (target * 2 === i) mapping[i] = target;
      else if (mapping[i - 1] < 0) {
        // nothing to the left: move left by one
        mapping[i - 1] = target;
        if (edge === -1) {
          edge = i;
          edgeTarget = target;
          for (let j = target * 2 + 3; j < i - 2; j += 2) mapping[j] = target;
        }
      } else if (mapping[i - 1] === target) {
        // the lane to the left is the one this joins
      } else {
        // a lane to the left that is not this one's: cross it
        mapping[i - 2] = target;
        if (edge === -1) {
          edgeTarget = target;
          edge = i - 1;
          for (let j = target * 2 + 3; j < i - 2; j += 2) mapping[j] = target;
        }
      }
    }
    for (let i = 0; i < mappingSize; i++) oldMapping[i] = mapping[i];
    if (mapping[mappingSize - 1] < 0) mappingSize--;
    for (let i = 0; i < mappingSize; i++) {
      const target = mapping[i];
      if (target < 0) add(" ");
      else if (target * 2 === i) write(newColumns[target], "|");
      else if (target === edgeTarget && i !== edge - 1) {
        if (i !== target * 2 + 3) mapping[i] = -1;
        usedHorizontal = true;
        write(newColumns[target], "_");
      } else {
        if (usedHorizontal && i < edge) mapping[i] = -1;
        write(newColumns[target], "/");
      }
    }
    pad();
    if (correct()) setState(PADDING);
  };
  const next = () => {
    line = [];
    if (state === COMMIT) commitLine();
    else if (state === POST_MERGE) postMergeLine();
    else if (state === COLLAPSING) collapsingLine();
    // PADDING and SKIP never come here: a commit's rows all print before the next commit
    pad();
    return line;
  };
  for (const c of order) {
    update(c);
    rows.push({ cells: next(), commit: c });
    // the rest of this commit's rows: a merge's row, then rows collapsing lanes, as git prints its remainder
    for (let guard = 0; state !== PADDING && guard < 4 * size; guard++) rows.push({ cells: next() });
  }
  return rows;
}

// --- the figure -----------------------------------------------------------------------------------

/** Words with a tone for each run, as a commit row's text is drawn. */
type Run = [string, number];

/**
 * A branching model as git log --graph --oneline --decorate --all --date-order prints it, from git's own commands, one
 * a line, git left off: `commit "message"`, `branch <name>`, `switch <name>` (or `checkout`), `switch -c <name>`,
 * `merge <name> ["message"]`, always a merge commit, as --no-ff makes, and `tag <name>`. The first branch is main. Each
 * commit shows a short hash, seeded from its parents and message, its branches and tags as git decorates them, HEAD
 * where the last line leaves you, and its message. The log prints in from the top, as a pager scrolls it, each fork and
 * merge swinging out as its row lands; then it holds.
 *
 *   git('commit "init"\nswitch -c feat\ncommit "draw fences"\nswitch main\nmerge feat\ntag v0.4', { title: "feature branch" })
 *   git({ steps: [{ commit: "init" }, { tag: "v0.1" }] }, { trunk: "trunk" })
 */
export function git(source: string | GitData, options?: GitOptions): MarkdownPiece {
  const steps = typeof source === "string" ? parse(source) : check(source);
  return component("git", options, ["trunk"], (o, room) => {
    if (o.trunk !== undefined && (typeof o.trunk !== "string" || !REF.test(o.trunk))) fail(`git's trunk takes a branch's name, such as main or trunk, not ${show(o.trunk)}`);
    const { commits, branches, tags, head } = run(steps, o.trunk ?? "main");
    // newest first, the order the commits were made, as --date-order prints them
    const order = [...commits].reverse();
    const rows = lanes(order);
    // each commit's decorations as git prints them: HEAD -> its branch first, then the rest by ref name, last first
    const refs = (c: Commit): Run[] => {
      const here = [
        ...branches.filter(([, at]) => at === c.id).map(([name]) => ({ ref: `refs/heads/${name}`, name, tag: false })),
        ...tags.filter(([, at]) => at === c.id).map(([name]) => ({ ref: `refs/tags/${name}`, name, tag: true })),
      ].sort((a, b) => (a.ref < b.ref ? 1 : a.ref > b.ref ? -1 : 0));
      const runs: Run[] = [];
      const own = here.findIndex((r) => !r.tag && r.name === head);
      if (own >= 0) runs.push(["HEAD ->", MARK], [" ", INK], [head, GOOD]);
      for (const r of here) {
        if (!r.tag && r.name === head) continue;
        if (runs.length) runs.push([", ", WARN]);
        runs.push(...(r.tag ? ([["tag: ", WARN], [r.name, WARN]] as Run[]) : ([[r.name, GOOD]] as Run[])));
      }
      return runs.length ? [["(", WARN], ...runs, [") ", WARN]] : [];
    };
    const widest = room.cols ?? room.max;
    const laid = rows.map((r) => {
      const cells = r.cells;
      if (!r.commit) {
        // a row of lanes alone: its spaces at the end left off
        let end = cells.length;
        while (end > 0 && cells[end - 1][0] === " ") end--;
        return { cells: cells.slice(0, end), runs: [] as Run[] };
      }
      const runs: Run[] = [[r.commit.hash, WARN], [" ", INK], ...refs(r.commit), [r.commit.message, INK]];
      const left = widest - cells.length;
      if (left < r.commit.hash.length + 4) fail(`git needs ${cells.length + r.commit.hash.length + 4} columns for its lanes and a hash, and has ${widest}: give it fewer branches open at once, or more width`);
      if (runs.reduce((n, [w]) => n + w.length, 0) <= left) return { cells, runs };
      // too long for the room: the words cut with ...
      const cut: Run[] = [];
      let room = left - 3;
      for (const [w, k] of runs) {
        if (room <= 0) break;
        cut.push([w.slice(0, room), k]);
        room -= w.length;
      }
      cut.push(["...", SOFT]);
      return { cells, runs: cut };
    });
    const cols = Math.max(1, ...laid.map((r) => r.cells.length + r.runs.reduce((n, [w]) => n + w.length, 0)));
    const n = laid.length;
    const per = Math.min(ROW, MOST / n);
    const counted = `${branches.length} ${branches.length === 1 ? "branch" : "branches"}, ${commits.length} ${commits.length === 1 ? "commit" : "commits"}`;
    const told = order.map((c) => {
      const tagged = tags.filter(([, at]) => at === c.id).map(([name]) => name);
      return `${c.message} on ${c.on}${tagged.length ? `, tagged ${tagged.join(", ")}` : ""}`;
    });
    return {
      cols,
      rows: n,
      intro: Math.round(n * per * 1000) / 1000,
      status: counted,
      says: `git, ${counted}, newest first: ${told.join("; ")}.`,
      draw(s, t, at) {
        for (let y = 0; y < n; y++) {
          // a row lands as the pager reaches it, its diagonals swinging out from | in the first half of its time
          const from = y * per;
          if (!at.still && t < from) break;
          const swinging = !at.still && t < from + per / 2;
          const { cells, runs } = laid[y];
          cells.forEach(([ch, k], x) => {
            if (ch === " ") return;
            const drawn = swinging && (ch === "\\" || ch === "/") ? "|" : swinging && ch === "_" ? " " : ch;
            s.set(at.x + x, at.y + y, drawn, k < 0 ? INK : LANES[k]);
          });
          let x = cells.length;
          for (const [w, k] of runs) {
            s.write(at.x + x, at.y + y, w, k);
            x += w.length;
          }
        }
      },
    };
  });
}
