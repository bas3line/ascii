/*
 * railroad: a command's syntax as a railroad diagram, from its usage line as
 * man pages and docopt write one, and a dot running the track, every path in
 * turn. CLI usage in a README, a config grammar in docs.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii railroad title=usage
 *   ascii.rest md <file> [--ascii | --svg <dir>]
 *   ```
 *
 *   railroad("ascii.rest md <file> [--ascii | --svg <dir>]")
 *   railroad({ usages: ["git add <path>...", "git add (-A | --all)"] })
 */
import { fail } from "../kit/core.ts";
import { ACCENT, GLINT, INK, QUIET, clean, component, progress, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A railroad as data: usage lines as people write them, one diagram each, stacked. */
export interface RailroadData {
  usages: readonly string[];
}

export type RailroadOptions = Common;

// The build: the track draws from the left. The cycle: a dot runs the track, a path a run.
const DRAW = 0.8, RUN = 2, ENTER = 0.15, RIDE = 1.5, LIT = 0.2;
// A word's cell counts this much of a track cell's time as the dot crosses it.
const WORD = 0.5;
// The widest a diagram goes before it wraps, when no width is given.
const WRAP = 96;

/** A part of a usage: a word, a <value>, a sequence, a choice of branches (optional when skipping is one), a repeat. */
type Node =
  | { t: "word"; text: string; value: boolean }
  | { t: "seq"; items: Node[] }
  | { t: "choice"; branches: Node[]; optional: boolean }
  | { t: "loop"; item: Node };

// A usage line in tokens: words, <values> (spaces allowed inside), the brackets, | and ...
function tokens(line: string, at: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === " ") i++;
    else if ("[](){}|".includes(ch)) (out.push(ch), i++);
    else if (line.startsWith("...", i)) (out.push("..."), (i += 3));
    else if (ch === "<") {
      const end = line.indexOf(">", i);
      if (end < 0) fail(`${at} opens a <value> it doesn't close: ${show(line.slice(i, i + 24))}`);
      const inner = line.slice(i + 1, end).replace(/\s+/g, " ").trim();
      if (!inner) fail(`${at} has an empty <>: a value is named, as <file>`);
      out.push(`<${inner}>`);
      i = end + 1;
    } else {
      let word = "";
      while (i < line.length && !" [](){}|<".includes(line[i]) && !line.startsWith("...", i)) word += line[i++];
      out.push(word);
    }
  }
  return out;
}

const CLOSE: Record<string, string> = { "[": "]", "(": ")", "{": "}" };

// A usage line read: words in order, [ ] optional, ( ) and { } a choice when they hold a |, ... a repeat of what is
// before it. A | outside any brackets is a choice between whole usages.
function read(line: string, at: string): Node {
  const toks = tokens(line, at);
  let i = 0;
  const alt = (closer: string | null): Node[] => {
    const branches: Node[] = [];
    let items: Node[] = [];
    for (;;) {
      const tok = toks[i];
      if (tok === undefined) {
        if (closer) fail(`${at} opens a ${Object.keys(CLOSE).find((k) => CLOSE[k] === closer)} it doesn't close with ${closer}`);
        break;
      }
      if (tok === closer) break;
      if (tok === "]" || tok === ")" || tok === "}") fail(`${at} closes a ${tok} it didn't open${closer ? `, where ${closer} closes what is open` : ""}`);
      i++;
      if (tok === "|") {
        branches.push({ t: "seq", items });
        items = [];
      } else if (tok === "...") {
        const last = items.pop();
        if (!last) fail(`${at} has ... with nothing before it to repeat: write it after what repeats, as <file>...`);
        items.push({ t: "loop", item: last });
      } else if (CLOSE[tok]) {
        const inner = alt(CLOSE[tok]);
        i++;
        const empty = inner.filter((b) => b.t === "seq" && !b.items.length).length;
        if (tok === "[") {
          if (inner.every((b) => b.t === "seq" && !b.items.length)) fail(`${at} has an empty [ ]: it holds what may be left out, as [--ascii]`);
          if (empty) fail(`${at} has an empty branch in [ ]: [ a | b ] is already optional`);
          items.push({ t: "choice", branches: inner, optional: true });
        } else {
          if (empty) fail(`${at} has an empty ${tok} ${CLOSE[tok]} or an empty branch in one: write [ ] for what may be left out`);
          items.push(inner.length > 1 ? { t: "choice", branches: inner, optional: false } : inner[0]);
        }
      } else items.push({ t: "word", text: tok, value: tok.startsWith("<") });
    }
    branches.push({ t: "seq", items });
    return branches;
  };
  const top = alt(null);
  if (top.some((b) => b.t === "seq" && !b.items.length)) fail(`${at} has a | with nothing on one side of it: a | goes between two choices`);
  return top.length > 1 ? { t: "seq", items: [{ t: "choice", branches: top, optional: false }] } : top[0];
}

/** A cell of the drawing: where, its character, and its tone. */
type Cell = [x: number, y: number, ch: string, tone: number];
/** A cell the dot runs over: where, and true when it is track the dot is drawn on, not a word it jumps. */
type Step = [x: number, y: number, track: boolean];
/** A part of the drawing: its size, its cells, and its path for a run (each choice takes its run-th branch). */
interface Block {
  w: number;
  h: number;
  cells: Cell[];
  path(run: number): Step[];
}

const moved = <T extends [number, number, ...unknown[]]>(list: readonly T[], dx: number, dy: number): T[] => list.map(([x, y, ...rest]) => [x + dx, y + dy, ...rest] as unknown as T);
// A sequence's parts with any ( group ) inside it run on in it.
const flat = (items: readonly Node[]): Node[] => items.flatMap((i) => (i.t === "seq" ? flat(i.items) : [i]));

// Lays a node out: a word between spaces, a sequence with track between its parts, a choice's branches stacked
// under its first with joins at both ends, a repeat with its way back under it.
function lay(n: Node): Block {
  if (n.t === "word") {
    const text = n.text;
    const w = text.length + 2;
    return {
      w,
      h: 1,
      cells: [...text].map((ch, i) => [1 + i, 0, ch, n.value ? ACCENT : INK] as Cell),
      path: () => Array.from({ length: w }, (_, x) => [x, 0, false] as Step),
    };
  }
  if (n.t === "seq") {
    const parts = flat(n.items).map(lay);
    let x = 0;
    const cells: Cell[] = [];
    const at: number[] = [];
    for (const p of parts) {
      cells.push([x, 0, "─", QUIET]);
      at.push(x + 1);
      cells.push(...moved(p.cells, x + 1, 0));
      x += 1 + p.w;
    }
    cells.push([x, 0, "─", QUIET]);
    return {
      w: x + 1,
      h: Math.max(1, ...parts.map((p) => p.h)),
      cells,
      path: (run) => {
        const steps: Step[] = [];
        parts.forEach((p, i) => steps.push([at[i] - 1, 0, true], ...moved(p.path(run), at[i], 0)));
        steps.push([x, 0, true]);
        return steps;
      },
    };
  }
  if (n.t === "choice") {
    const parts = [...(n.optional ? [lay({ t: "seq", items: [] })] : []), ...n.branches.map(lay)];
    const W = Math.max(...parts.map((p) => p.w));
    const tops: number[] = [];
    let y = 0;
    for (const p of parts) (tops.push(y), (y += p.h));
    const last = tops[tops.length - 1];
    const cells: Cell[] = [];
    for (let r = 0; r <= last; r++) {
      const k = tops.indexOf(r);
      cells.push([0, r, r === 0 ? "┬" : k < 0 ? "│" : r === last ? "╰" : "├", QUIET], [W + 1, r, r === 0 ? "┬" : k < 0 ? "│" : r === last ? "╯" : "┤", QUIET]);
    }
    parts.forEach((p, i) => {
      cells.push(...moved(p.cells, 1, tops[i]));
      for (let x = 1 + p.w; x <= W; x++) cells.push([x, tops[i], "─", QUIET]);
    });
    return {
      w: W + 2,
      h: y,
      cells,
      path: (run) => {
        const j = run % parts.length, r = tops[j];
        const steps: Step[] = [];
        for (let yy = 0; yy <= r; yy++) steps.push([0, yy, true]);
        steps.push(...moved(parts[j].path(run), 1, r));
        for (let x = 1 + parts[j].w; x <= W; x++) steps.push([x, r, true]);
        for (let yy = r; yy >= 0; yy--) steps.push([W + 1, yy, true]);
        return steps;
      },
    };
  }
  // a repeat: the item on the track, and under it the way back, its < pointing home
  const p = lay(n.item.t === "seq" ? n.item : { t: "seq", items: [n.item] });
  const W = p.w, back = p.h;
  const cells: Cell[] = moved(p.cells, 1, 0);
  for (let r = 0; r <= back; r++) cells.push([0, r, r === 0 ? "┬" : r === back ? "╰" : "│", QUIET], [W + 1, r, r === 0 ? "┬" : r === back ? "╯" : "│", QUIET]);
  for (let x = 1; x <= W; x++) cells.push([x, back, x === 1 + Math.floor((W - 1) / 2) ? "<" : "─", QUIET]);
  return {
    w: W + 2,
    h: back + 1,
    cells,
    path: (run) => {
      const through: Step[] = moved(p.path(run), 1, 0);
      const steps: Step[] = [[0, 0, true], ...through];
      if (run % 2) {
        // once round: down, back along the way under it, up, and through again
        for (let r = 0; r <= back; r++) steps.push([W + 1, r, true]);
        for (let x = W; x >= 1; x--) steps.push([x, back, true]);
        for (let r = back; r >= 0; r--) steps.push([0, r, true]);
        steps.push(...through);
      }
      steps.push([W + 1, 0, true]);
      return steps;
    },
  };
}

// The runs it takes for the dot to run every branch of every choice, and round every repeat once.
const runsOf = (n: Node): number =>
  n.t === "word" ? 1 : n.t === "seq" ? Math.max(1, ...n.items.map(runsOf)) : n.t === "loop" ? Math.max(2, runsOf(n.item)) : Math.max(n.branches.length + (n.optional ? 1 : 0), ...n.branches.map(runsOf));

// What a usage says, in words: for screen readers.
function said(n: Node): string {
  if (n.t === "word") return n.text;
  if (n.t === "loop") return `${said(n.item)}, one or more`;
  if (n.t === "choice") return `${n.optional ? "optionally " : "one of "}${n.branches.map(said).join(", or ")}`;
  // words run on with spaces; a choice or a repeat, and the word after one, come after ", then"
  let out = "";
  const items = flat(n.items);
  items.forEach((item, i) => {
    const plainWords = item.t === "word" && (i === 0 || items[i - 1].t === "word");
    out += !out ? said(item) : plainWords ? ` ${said(item)}` : `, then ${said(item)}`;
  });
  return out;
}

/**
 * A command's syntax as a railroad diagram, from its usage line as man pages and docopt write one: words are literal,
 * `<name>` is a value, `[ ... ]` may be left out, `( a | b )` is one of, `[ a | b ]` one of or none, and `...` after
 * something repeats it. Several lines are several usages, stacked. A usage too wide for the width wraps, the track
 * turning down at its end and back in at the left. The track draws from the left; then, while it is in view, a dot runs
 * it end to end, a run every 2 seconds, each run taking the next branch of every choice until every path is run.
 *
 *   railroad("ascii.rest md <file> [--ascii | --svg <dir>]", { title: "usage" })
 *   railroad({ usages: ["git add <path>...", "git commit [-m <msg>]"] })
 */
export function railroad(source: string | RailroadData, options?: RailroadOptions): MarkdownPiece {
  let usages: { node: Node; text: string }[];
  if (typeof source === "string") {
    const lines = statements(source, "railroad");
    if (!lines.length) fail(`railroad takes a usage line, as ascii.rest md <file> [--ascii | --svg <dir>]`);
    usages = lines.map((s) => ({ node: read(s.raw, `railroad's line ${s.line}`), text: s.raw }));
  } else {
    if (!source || typeof source !== "object" || !Array.isArray(source.usages)) fail(`railroad() takes a usage line, such as ascii.rest md <file>, or { usages: [...] }, not ${show(source)}`);
    if (!source.usages.length) fail(`railroad's usages take one usage line or more, such as "ascii.rest md <file>"`);
    usages = source.usages.map((u, i) => {
      if (typeof u !== "string" || !u.trim()) fail(`railroad's usage ${i + 1} takes a usage line, such as "ascii.rest md <file>", not ${show(u)}`);
      const text = clean(u, `railroad's usage ${i + 1}`).replace(/\s+/g, " ").trim();
      return { node: read(text, `railroad's usage ${i + 1}`), text };
    });
  }
  return component("railroad", options, [], (o, room) => {
    // rows wrap at the width given, or at 96 columns; a part too wide for that takes a row of its own, up to the most
    const avail = room.cols ?? Math.min(room.max, WRAP);
    const most = room.cols ?? room.max;
    const cells: Cell[] = [];
    const paths: ((run: number) => Step[])[] = [];
    let y = 0, cols = 1;
    // each usage: its parts in rows that fit, ├ at its start and ┤ at its end, a row that wraps ending ╮, the track
    // running back under it ╭───╯, and the next row starting ╰
    usages.forEach(({ node }, u) => {
      if (u) y++;
      const items = node.t === "seq" ? flat(node.items) : [node];
      // a row is ├, each part with the track before it, the track after the last, and its end: 3 columns and the parts
      const chunks: Node[][] = [[]];
      let used = 3;
      for (const item of items) {
        const w = 1 + lay(item).w;
        if (3 + w > most)
          fail(`railroad needs ${3 + w} columns for ${show(said(item))}, past the ${most} it has: ${room.cols === undefined ? "split it into shorter usages" : `give it a width of ${3 + w + ((o.width as number) - room.cols)} or more`}`);
        if (used + w > avail && chunks[chunks.length - 1].length) (chunks.push([]), (used = 3));
        chunks[chunks.length - 1].push(item);
        used += w;
      }
      const rows: { block: Block; top: number; end: number; turn: number }[] = [];
      chunks.forEach((chunk, k) => {
        const block = lay({ t: "seq", items: chunk });
        const end = 1 + block.w, last = k === chunks.length - 1;
        cells.push([0, y, k ? "╰" : "├", QUIET], ...moved(block.cells, 1, y), [end, y, last ? "┤" : "╮", QUIET]);
        cols = Math.max(cols, end + 1);
        const top = y;
        y += block.h;
        if (!last) {
          for (let r = top + 1; r < y; r++) cells.push([end, r, "│", QUIET]);
          cells.push([0, y, "╭", QUIET], [end, y, "╯", QUIET]);
          for (let x = 1; x < end; x++) cells.push([x, y, "─", QUIET]);
          y++;
        }
        rows.push({ block, top, end, turn: last ? -1 : y - 1 });
      });
      paths.push((run) => {
        const steps: Step[] = [];
        for (const { block, top, end, turn } of rows) {
          steps.push([0, top, true], ...moved(block.path(run), 1, top), [end, top, true]);
          if (turn >= 0) {
            for (let r = top + 1; r <= turn; r++) steps.push([end, r, true]);
            for (let x = end - 1; x >= 0; x--) steps.push([x, turn, true]);
          }
        }
        return steps;
      });
    });
    const runs = Math.max(...usages.map((u) => runsOf(u.node)));
    // how far along the track is laid when a cell draws: left to right, a choice's branches dropping as it is reached
    const reach = cells.map(([x]) => x / cols);
    const told = usages.map((u) => said(u.node));
    return {
      cols,
      rows: y,
      intro: DRAW,
      cycle: runs * RUN,
      says: `railroad: ${told.join("; ")}.`,
      draw(s, t, at) {
        const p = progress(t, 0, DRAW);
        cells.forEach(([x, yy, ch, k], i) => {
          if (p >= 1 || reach[i] <= p) s.set(at.x + x, at.y + yy, ch, k);
        });
        if (at.still || t < DRAW) return;
        // a run: the dot enters, rides the path its run takes, the path lit behind it, then the light goes out
        const phase = (t - DRAW) % (runs * RUN);
        const run = Math.floor(phase / RUN), q = phase - run * RUN;
        if (q < ENTER || q >= ENTER + RIDE + LIT) return;
        for (const path of paths) {
          const steps = path(run);
          // where the dot is: it rides track at an even pace and crosses a word at twice it
          let total = 0;
          const upto = steps.map(([, , track]) => (total += track ? 1 : WORD));
          const want = ((q - ENTER) / RIDE) * total;
          const head = q >= ENTER + RIDE ? steps.length : upto.findIndex((w) => w > want);
          for (let i = 0; i < head; i++) {
            const [x, yy, track] = steps[i];
            if (track) s.set(at.x + x, at.y + yy, s.get(at.x + x, at.y + yy) || "─", ACCENT);
          }
          if (head < 0 || head >= steps.length) continue;
          if (steps[head][2]) {
            s.set(at.x + steps[head][0], at.y + steps[head][1], "●", ACCENT);
            continue;
          }
          // inside a word: the word lights as the dot passes through it, its letters as they are
          let from = head, to = head;
          while (from > 0 && !steps[from - 1][2]) from--;
          while (to < steps.length - 1 && !steps[to + 1][2]) to++;
          for (let i = from; i <= to; i++) {
            const ch = s.get(at.x + steps[i][0], at.y + steps[i][1]);
            if (ch && ch !== " ") s.set(at.x + steps[i][0], at.y + steps[i][1], ch, GLINT);
          }
        }
      },
    };
  });
}
