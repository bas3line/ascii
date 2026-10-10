/*
 * logic: a gate circuit drawn from boolean expressions, its inputs stepping
 * through their truth table and each change running along the wires, gate by
 * gate. A release rule, a feature flag's condition, a permission check,
 * explained in docs, an issue or by an agent. A wire carrying 1 is heavy, one
 * carrying 0 light, so it reads in one ink and as plain text.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii logic title=release
 *   ready is built and (tested or not skipped)
 *   ```
 *
 *   logic("ready is built and (tested or not skipped)", { hold: 2 })
 *   logic({ outputs: { ready: "built and (tested or not skipped)" } })
 */
import { fail } from "../kit/core.ts";
import { numberOf } from "../kit/recipes/checks.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, progress, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** Logic as data: each output and the expression it is, in order. */
export interface LogicData {
  outputs: Readonly<Record<string, string>>;
}

export interface LogicOptions extends Common {
  /** Seconds each row of the truth table holds, the change running the wires included: 1.5 (the default), 0.5 to 10. */
  hold?: number;
}

type Op = "and" | "or" | "xor" | "not";
/** An expression, read: a name, or a gate and what goes into it. */
type Expr = { name: string } | { op: Op; kids: Expr[]; grouped?: boolean };

// A Map, so a name every object has, constructor or toString, never reads as an operator.
const PREC = new Map<string | undefined, number>([["or", 1], ["xor", 2], ["and", 3]]);
const WORDS = ["and", "or", "xor", "not", "is"];
const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
// A gate's box is this wide, gates of one depth this far apart.
const BOX = 7, GAP = 4;
// The build: boxes by column, then the wires filling from the left. The inputs: at most this many.
const BOXES = 0.6, INTRO = 1.2, MOST = 6;

// Reads `output is expression`: not binds tightest, then and, xor, or; a run of one operator is one gate, and a
// bracketed part stays as written.
function read(text: string, at: string): { output: string; expr: Expr; text: string } {
  const bad = /&&|\|\||[&|!^~=]/.exec(text);
  if (bad) fail(`${at} has ${show(bad[0])}: logic writes its gates as words, and, or, xor and not, as ready is built and not skipped`);
  if (text.includes('"')) fail(`${at} has a quote: logic's names are bare words, as ready is built and tested`);
  const toks = text.replace(/[()]/g, " $& ").trim().split(/\s+/).filter(Boolean);
  if (toks.length < 3 || toks[1].toLowerCase() !== "is") fail(`${at} reads ${show(text)}: a line is an output, is, and an expression, as ready is built and tested`);
  const output = toks[0];
  if (!NAME.test(output) || WORDS.includes(output.toLowerCase())) fail(`${at} names its output ${show(output)}: an output is one word, as ready`);
  let i = 2;
  const word = (t: string | undefined) => t?.toLowerCase();
  const atom = (): Expr => {
    const t = toks[i];
    if (t === undefined) fail(`${at} ends where a name or a bracket goes: ${show(text)}`);
    if (word(t) === "not") {
      i++;
      return { op: "not", kids: [atom()] };
    }
    if (t === "(") {
      i++;
      const e = expr(0);
      if (toks[i] !== ")") fail(`${at} opens a ( it doesn't close: ${show(text)}`);
      i++;
      return "op" in e ? { ...e, grouped: true } : e;
    }
    if (t === ")") fail(`${at} has a ) where a name goes: ${show(text)}`);
    if (PREC.has(word(t)) || word(t) === "is") fail(`${at} has ${show(t)} where a name goes: ${word(t)} takes something on each side`);
    if (!NAME.test(t)) fail(`${at} has ${show(t)}: a name is one word of letters, digits and _ . -, starting with a letter`);
    i++;
    return { name: t };
  };
  const expr = (min: number): Expr => {
    let left = atom();
    for (;;) {
      const t = word(toks[i]);
      const prec = PREC.get(t);
      if (prec === undefined || prec <= min) break;
      i++;
      const op = t as Op;
      const right = expr(prec);
      left = "op" in left && left.op === op && !left.grouped ? { op, kids: [...left.kids, right] } : { op, kids: [left, right] };
    }
    return left;
  };
  const e = expr(0);
  if (i < toks.length) fail(`${at} has ${show(toks[i])} where an and, or or xor goes: ${show(text)}`);
  return { output, expr: e, text: toks.slice(2).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")") };
}

/** A gate or a name laid on its side: its rows, its depth (its column), and where its output leaves it. */
interface Laid {
  e: Expr;
  level: number;
  top: number;
  bottom: number;
  out: number;
  kids: Laid[];
  /** The column its output leaves from: a name's value, a gate's right wall. Set once the columns are known. */
  x: number;
}

// draw.mjs's layout: a name is a row; a gate stacks its inputs' blocks a blank row apart, its box spanning their rows
// and one above and below, its output midway between its first and last input.
function lay(e: Expr): Laid {
  if ("name" in e) return { e, level: 0, top: 0, bottom: 0, out: 0, kids: [], x: 0 };
  const kids: Laid[] = [];
  let y = 0;
  for (const k of e.kids) {
    const l = lay(k);
    shift(l, y - l.top);
    kids.push(l);
    y = l.bottom + 2;
  }
  const first = kids[0].out, last = kids[kids.length - 1].out;
  return { e, level: 1 + Math.max(...kids.map((k) => k.level)), top: Math.min(kids[0].top, first - 1), bottom: Math.max(kids[kids.length - 1].bottom, last + 1), out: Math.floor((first + last) / 2), kids, x: 0 };
}

function shift(l: Laid, dy: number) {
  l.top += dy;
  l.bottom += dy;
  l.out += dy;
  l.kids.forEach((k) => shift(k, dy));
}

const gates = (e: Expr): number => ("name" in e ? 0 : 1 + e.kids.reduce((n, k) => n + gates(k), 0));

/**
 * A gate circuit from boolean expressions, one a line: `output is expression`, of names, and, or, xor, not and
 * brackets, not binding tightest, then and, xor, or. A run of one operator is one gate with more inputs. The inputs
 * are the names no earlier line makes, 6 at most; a name an earlier line makes is that line's output, fed in. Each
 * line is a tree on its side: inputs at the left with their values, gates in columns by depth, its output at the
 * right. Its still has every input 0. The boxes draw in and the wires fill; then, while it is in view, the inputs step
 * through every row of their truth table in Gray code order, one input flipping at a time, and each change runs right
 * along its wire, every gate it reaches passing its new output on.
 *
 *   logic("ready is built and (tested or not skipped)", { title: "release" })
 *   logic("carry is a and b\nsum is a xor b", { hold: 2 })
 */
export function logic(source: string | LogicData, options?: LogicOptions): MarkdownPiece {
  let lines: { output: string; expr: Expr; text: string }[];
  if (typeof source === "string") {
    const written = statements(source, "logic");
    if (!written.length) fail(`logic takes expressions, one a line, as ready is built and (tested or not skipped)`);
    lines = written.map((s) => read(s.raw, `logic's line ${s.line}`));
  } else {
    if (!source || typeof source !== "object" || !source.outputs || typeof source.outputs !== "object") fail(`logic() takes expressions, such as ready is built and tested, or { outputs: { ready: "built and tested" } }, not ${show(source)}`);
    const entries = Object.entries(source.outputs);
    if (!entries.length) fail(`logic's outputs take one output or more, such as { ready: "built and tested" }`);
    lines = entries.map(([output, e], i) => {
      if (typeof e !== "string") fail(`logic's output ${show(output)} takes an expression, such as "built and tested", not ${show(e)}`);
      return read(clean(`${output} is ${e}`, `logic's output ${output}`), `logic's output ${i + 1}`);
    });
  }
  // the inputs, in order of first appearance, and the outputs each line makes
  const inputs: string[] = [];
  const made = new Map<string, number>();
  lines.forEach((l, k) => {
    const at = `logic's line ${k + 1}`;
    if (made.has(l.output)) fail(`${at} makes ${show(l.output)}, which line ${made.get(l.output)! + 1} makes already`);
    if (inputs.includes(l.output)) fail(`${at} makes ${show(l.output)}, which an earlier line takes as an input: put the line making it first`);
    (function walk(e: Expr) {
      if ("op" in e) return e.kids.forEach(walk);
      if (e.name === l.output) fail(`${at} makes ${show(l.output)} out of itself: an output can't be one of its own inputs`);
      if (!made.has(e.name) && !inputs.includes(e.name)) inputs.push(e.name);
    })(l.expr);
    if (inputs.length > MOST) fail(`logic steps its inputs through their whole truth table, ${MOST} inputs at most, and ${at} brings them to ${inputs.length}: ${inputs.join(", ")}`);
    made.set(l.output, k);
  });

  return component("logic", options, ["hold"], (o) => {
    const hold = numberOf("logic's hold", o.hold, 1.5, 0.5, 10);
    // every value, with the inputs as given: each line in turn, an earlier output feeding a later line. The values sit
    // on an object with no prototype, so an output named __proto__ is a value like any other.
    const evaluate = (env: Record<string, number>): Record<string, number> => {
      const v: Record<string, number> = Object.assign(Object.create(null), env);
      const of = (e: Expr): number => ("name" in e ? v[e.name] : e.op === "not" ? 1 - of(e.kids[0]) : e.op === "and" ? +e.kids.every((k) => of(k)) : e.op === "or" ? +e.kids.some((k) => of(k)) : e.kids.reduce((a, k) => a ^ of(k), 0));
      for (const l of lines) v[l.output] = of(l.expr);
      return v;
    };
    const leaves: string[] = [];
    lines.forEach((l) => (function walk(e: Expr) {
      if ("op" in e) e.kids.forEach(walk);
      else leaves.push(e.name);
    })(l.expr));
    const nameW = Math.max(...leaves.map((n) => n.length));
    const x0 = nameW + 3;
    const colOf = (level: number) => x0 + GAP - 1 + (level - 1) * (BOX + GAP);

    // each line laid out under the one before, a blank row between, and where its output's words go
    let rowsAt = 0, W = 0;
    const laid = lines.map((l) => {
      const root = lay(l.expr);
      shift(root, rowsAt - root.top);
      (function place(n: Laid) {
        n.x = n.kids.length ? colOf(n.level) + BOX - 1 : x0 - 1;
        n.kids.forEach(place);
      })(root);
      // a line that is one name: its wire runs straight on to its output
      const end = root.kids.length ? colOf(root.level) + BOX : x0 + GAP;
      W = Math.max(W, end + 3 + l.output.length + 2);
      rowsAt = root.bottom + 2;
      return { ...l, root, end };
    });
    const rows = rowsAt - 1;

    // A change runs right along the wires at `speed` columns a second, each gate passing its new output on as it
    // reaches it; a line's output feeds a later line from the end of its own. Out of `distance`, the columns the
    // change runs to reach each place, comes how fast it must run to settle well inside a row's hold.
    const lineReach: number[] = [];
    laid.forEach((l, k) => {
      const far = (n: Laid): number => {
        if (!n.kids.length) {
          const from = made.get((n.e as { name: string }).name);
          return from !== undefined && from < k ? lineReach[from] : 0;
        }
        return Math.max(...n.kids.map((c) => far(c) + colOf(n.level) - c.x)) + BOX - 1;
      };
      lineReach.push(far(l.root) + l.end + 2 - l.root.x);
    });
    const speed = Math.max(30, Math.max(...lineReach) / (0.6 * hold));
    const settle = Math.max(...lineReach) / speed + 0.05;
    const N = 2 ** inputs.length;

    // The values a transition shows tau seconds after an input flips from `before` to `after`: an input's value is new
    // at once; a gate's output is its function of what has reached its inputs; a wire's cell shows what has reached it.
    type Values = Record<string, number>;
    const outAt = (n: Laid, k: number, tau: number, before: Values, after: Values): number => {
      if (!n.kids.length) {
        const name = (n.e as { name: string }).name;
        const from = made.get(name);
        if (from !== undefined && from < k) {
          const l = laid[from];
          return outAt(l.root, from, tau - (l.end + 2 - l.root.x) / speed, before, after);
        }
        return tau >= 0 ? after[name] : before[name];
      }
      const gx = colOf(n.level);
      const ins = n.kids.map((c) => outAt(c, k, tau - (gx - c.x + BOX - 1) / speed, before, after));
      const op = (n.e as { op: Op }).op;
      return op === "not" ? 1 - ins[0] : op === "and" ? +ins.every(Boolean) : op === "or" ? +ins.some(Boolean) : ins.reduce((a, b) => a ^ b, 0);
    };
    const envOf = (row: number): Values => {
      const g = row ^ (row >> 1);
      return Object.fromEntries(inputs.map((name, j) => [name, (g >> j) & 1]));
    };
    const still = evaluate(envOf(0));
    const said = laid.map((l) => `${l.output} is ${l.text}`).join("; ");
    const outs = laid.map((l) => `${l.output} is ${still[l.output]}`);
    const total = laid.reduce((n, l) => n + gates(l.expr), 0);
    const title = typeof o.title === "string" && o.title.trim() ? `, ${clean(o.title, "logic's title").trim()}` : "";
    return {
      cols: W,
      rows,
      intro: INTRO,
      cycle: N * hold,
      status: `${inputs.length} ${inputs.length === 1 ? "input" : "inputs"}, ${total} ${total === 1 ? "gate" : "gates"}`,
      says: `logic${title}: ${said}; with every input 0, ${outs.length > 1 ? `${outs.slice(0, -1).join(", ")} and ${outs[outs.length - 1]}` : outs[0]}.`,
      draw(s, t, at) {
        if (t <= 0) return;
        const X = at.x, Y = at.y;
        // where the cycle is: the row of the truth table, and how far a change into the next row has run
        let before = still, after = still, tau = Infinity;
        if (!at.still && t >= INTRO) {
          const phase = (t - INTRO) % (N * hold);
          const row = Math.floor(phase / hold), local = phase - row * hold;
          before = after = evaluate(envOf(row));
          if (local >= hold - settle) {
            after = evaluate(envOf((row + 1) % N));
            tau = local - (hold - settle);
          }
        }
        // the build: boxes by column, then the wires filling from the left
        const maxLevel = Math.max(...laid.map((l) => l.root.level), 1);
        const boxesIn = (level: number) => at.still || t >= INTRO || t >= (BOXES * (level - 1)) / maxLevel;
        const front = at.still ? Infinity : x0 + (W - x0) * progress(t, BOXES, INTRO);
        const wire = (x: number, y: number, v: number) => x <= front && s.set(X + x, Y + y, v ? "━" : "─", v ? ACCENT : QUIET);
        laid.forEach((l, k) => {
          const value = (n: Laid, dt: number) => outAt(n, k, tau - dt, before, after);
          (function draw(n: Laid) {
            if (!n.kids.length) {
              const name = (n.e as { name: string }).name;
              const v = value(n, 0);
              s.write(X, Y + n.out, name, made.has(name) && made.get(name)! < k ? SOFT : INK);
              s.set(X + nameW + 1, Y + n.out, String(v), v ? ACCENT : SOFT);
              return;
            }
            const gx = colOf(n.level);
            const top = Math.min(...n.kids.map((c) => c.out)) - 1, bottom = Math.max(...n.kids.map((c) => c.out)) + 1;
            if (boxesIn(n.level)) {
              s.write(X + gx, Y + top, `┌${"─".repeat(BOX - 2)}┐`, QUIET);
              s.write(X + gx, Y + bottom, `└${"─".repeat(BOX - 2)}┘`, QUIET);
              for (let y = top + 1; y < bottom; y++) (s.set(X + gx, Y + y, "│", QUIET), s.set(X + gx + BOX - 1, Y + y, "│", QUIET));
              s.write(X + gx + 2, Y + n.out, (n.e as { op: Op }).op, SOFT);
            }
            for (const c of n.kids) {
              draw(c);
              // the wire from what goes in to the gate: each cell what has reached it
              for (let x = c.x + 1; x < gx; x++) wire(x, c.out, value(c, (x - c.x) / speed));
              if (boxesIn(n.level) && gx <= front) {
                const v = value(c, (gx - c.x) / speed);
                s.set(X + gx, Y + c.out, v ? "┥" : "┤", v ? ACCENT : QUIET);
              }
            }
            if (boxesIn(n.level) && gx + BOX - 1 <= front) {
              const v = value(n, 0);
              s.set(X + gx + BOX - 1, Y + n.out, v ? "┝" : "├", v ? ACCENT : QUIET);
            }
          })(l.root);
          // the output: its wire on from the last gate, its name and its value
          const r = l.root;
          for (let x = r.x + 1; x < l.end + 2; x++) wire(x, r.out, value(r, (x - r.x) / speed));
          if (l.end + 2 <= front) {
            const v = value(r, (l.end + 2 - r.x) / speed);
            s.write(X + l.end + 3, Y + r.out, l.output, INK);
            s.set(X + l.end + 4 + l.output.length, Y + r.out, String(v), v ? ACCENT : SOFT);
          }
        });
      },
    };
  });
}
