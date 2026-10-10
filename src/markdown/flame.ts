/*
 * flame: a profile as a flame graph, read from Brendan Gregg's folded stacks,
 * the lines stackcollapse-perf.pl and the pipelines like it print. Each frame
 * is a block as wide as its samples, its callees stacked on top of it, the
 * root at the bottom; siblings sit in name order, as flamegraph.pl draws them,
 * so the x axis is not time. The leaf that spent the most samples itself, the
 * hottest, is marked and named on the bottom edge. An issue about a slow
 * render, a profile in docs.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii flame title="render, 48 ms" unit=ms
 *   main;parse;lex 4
 *   main;draw;paint 18
 *   main;flush 4
 *   ```
 *
 *   flame("main;draw;paint 18\nmain;flush 4", { unit: "ms" })
 *   flame({ stacks: [{ frames: ["main", "draw", "paint"], samples: 18 }] })
 */
import { fail } from "../kit/core.ts";
import { show } from "../kit/recipes/checks.ts";
import { ACCENT, BAD, INK, MARK, SOFT, VIOLET, WARN, clean, commas, component, linesOf, progress, type Common, type MarkdownPiece } from "./core.ts";

/** A profile as data: what a fence's body says, for stacks already in JavaScript. */
export interface FlameData {
  /** Each stack, its frames from the root, and the samples it was seen in. The same stack twice adds up. */
  stacks: readonly { frames: readonly string[]; samples: number }[];
}

export interface FlameOptions extends Common {
  /** What a sample is, for the bottom edge and the words a screen reader reads: "samples" (the default), "ms", "us". */
  unit?: string;
}

// A frame in the call tree: its samples with its callees' (total), its own (self), and its callees by name.
interface Node {
  name: string;
  total: number;
  self: number;
  kids: Map<string, Node>;
}

// A block as drawn: its depth from the root, its first column and width, the words between its brackets.
interface Block {
  depth: number;
  x: number;
  w: number;
  inner: string;
  hot: boolean;
}

// The build: each level rises on the one under it, its blocks widening from their left edges, LEVEL seconds a level,
// the whole at most BUILD seconds. Then it holds.
const LEVEL = 0.3, BUILD = 2.4;
// The heat a level is drawn in, from the root up, as flamegraph.pl's colours climb: then soft, past the fourth.
const HEAT = [ACCENT, WARN, BAD, VIOLET];
// The most samples a line may hold: past it a sum stops being exact.
const MOST = 1e12;
// The frames the sentence a screen reader reads names, before it says how many more.
const SAYS = 24;

const byName = (a: Node, b: Node) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// The fence's body: a stack a line, frames joined by ; from the root, then a space and its samples, the last word.
function parse(source: string): FlameData {
  const stacks: { frames: string[]; samples: number }[] = [];
  linesOf(source).forEach((written, n) => {
    const line = clean(written, "flame").trim();
    if (!line) return;
    const at = line.lastIndexOf(" ");
    const count = at < 0 ? line : line.slice(at + 1);
    if (at < 0 || !/^\d+$/.test(count))
      fail(`flame's line ${n + 1} ends in ${show(count)}, not a number of samples: a line is a stack, its frames joined by ; from the root, then a space and its samples, as main;draw;paint 18`);
    stacks.push({ frames: line.slice(0, at).split(";"), samples: Number(count) });
  });
  if (!stacks.length) fail(`flame takes folded stacks, a stack a line, as main;draw;paint 18: the output of stackcollapse-perf.pl and the tools like it`);
  return { stacks };
}

// Data, checked: each frame's name cleaned and trimmed, each count whole.
function check(data: FlameData): FlameData {
  if (!data || typeof data !== "object" || !Array.isArray(data.stacks)) fail(`flame() takes folded stacks, such as "main;draw;paint 18", or { stacks: [{ frames, samples }] }, not ${show(data)}`);
  if (!data.stacks.length) fail(`flame's stacks take at least one stack, such as { frames: ["main", "draw"], samples: 4 }`);
  const stacks = data.stacks.map((s, i) => {
    const which = `flame's stack ${i + 1}`;
    if (!s || typeof s !== "object" || !Array.isArray(s.frames)) fail(`${which} takes { frames, samples }, as { frames: ["main", "draw"], samples: 4 }, not ${show(s)}`);
    if (!s.frames.length) fail(`${which} has no frames: a stack is its frames from the root, at least one`);
    const frames = s.frames.map((f: unknown) => {
      if (typeof f !== "string") fail(`${which} takes its frames as words, not ${show(f)}`);
      const name = clean(f, "flame").replace(/\s+/g, " ").trim();
      if (!name) fail(`${which} has an empty frame, in ${show(s.frames.join(";"))}: every frame between two ; has a name`);
      return name;
    });
    if (!Number.isInteger(s.samples) || s.samples < 0 || s.samples > MOST) fail(`${which} takes a whole number of samples from 0 to ${commas(MOST)}, not ${show(s.samples)}`);
    return { frames, samples: s.samples };
  });
  return { stacks };
}

/**
 * A flame graph from Brendan Gregg's folded stacks, `main;draw;paint 18` a line, or { stacks }: each frame a block as
 * wide as its samples and its callees' on top of it, the root spanning the width (44 columns, or `width`), siblings in
 * name order. A frame narrower than 3 columns is left out. The hottest leaf, the frame with no callees that spent the
 * most samples itself, is marked and named on the bottom edge with its share. It builds from the root up, each level's
 * blocks widening from their left edges, and holds.
 *
 *   flame("main;parse 6\nmain;draw;paint 18", { title: "render", unit: "ms" })
 */
export function flame(source: string | FlameData, options?: FlameOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("flame", options, ["unit"], (o, room) => {
    if (o.unit !== undefined && typeof o.unit !== "string") fail(`flame's unit takes a word for what a sample is, such as "ms", not ${show(o.unit)}`);
    const unit = o.unit === undefined ? "samples" : clean(o.unit, "flame's unit").replace(/\s+/g, " ").trim();
    if (!unit || unit.length > 16) fail(`flame's unit takes a word of 1 to 16 characters for what a sample is, such as "ms", not ${show(o.unit)}`);

    // the call tree: identical stacks add up, a frame's total is its own samples and its callees'
    const root: Node = { name: "", total: 0, self: 0, kids: new Map() };
    for (const { frames, samples } of data.stacks) {
      root.total += samples;
      let node = root;
      for (const f of frames) {
        let kid = node.kids.get(f);
        if (!kid) node.kids.set(f, (kid = { name: f, total: 0, self: 0, kids: new Map() }));
        kid.total += samples;
        node = kid;
      }
      node.self += samples;
    }
    const total = root.total;
    if (!total) fail(`flame's samples add up to 0: there is nothing to draw, give a stack 1 or more`);

    // the hottest leaf, the first in name order on a tie, and every frame in that order for the sentence
    let hottest: Node | null = null;
    const named: Node[] = [];
    (function walk(node: Node) {
      for (const kid of [...node.kids.values()].sort(byName)) {
        if (!kid.total) continue;
        named.push(kid);
        if (!kid.kids.size && (!hottest || kid.self > hottest.self)) hottest = kid;
        walk(kid);
      }
    })(root);
    const hot = hottest as Node | null;

    // the blocks: the root spans the width, each frame as wide as its samples, left out under 3 columns
    const W = room.cols ?? room.prose;
    const k = W / total;
    const blocks: Block[] = [];
    (function lay(node: Node, depth: number, from: number) {
      let at = from;
      for (const kid of [...node.kids.values()].sort(byName)) {
        const start = at;
        at += kid.total;
        const x = Math.round(start * k), w = Math.round(at * k) - x;
        if (w < 3) continue;
        blocks.push({ depth, x, w, inner: kid.name.slice(0, w - 2).padEnd(w - 2), hot: kid === hot });
        lay(kid, depth + 1, start);
      }
    })(root, 0, 0);
    const levels = Math.max(1, ...blocks.map((b) => b.depth + 1));
    const per = Math.min(LEVEL, BUILD / levels);

    // the bottom edge: the hottest leaf, its own samples and the whole; in a narrow figure its share; its name cut to
    // fit, so the words never widen the figure
    let status = "";
    if (hot) {
      const tails = [`, ${commas(hot.self)} of ${commas(total)} ${unit}`, `, ${Math.round((hot.self / total) * 100)}%`, ""];
      for (const tail of tails) {
        const fits = W - 2 - tail.length;
        const name = hot.name.length <= fits ? hot.name : fits >= 4 ? `${hot.name.slice(0, fits - 3)}...` : "";
        if (name) {
          status = `${name}${tail}`;
          break;
        }
      }
    }

    const title = typeof o.title === "string" ? o.title.trim() : "";
    const listed = named.slice(0, SAYS).map((n) => `${n.name} ${commas(n.total)}${n === hot ? `, the hottest at ${Math.round((n.self / total) * 100)}%` : ""}`);
    const more = named.length > SAYS ? `; and ${named.length - SAYS} more` : "";

    return {
      cols: W,
      rows: levels,
      // to the millisecond above, so the last level has risen by the time the build ends
      intro: Math.ceil(per * levels * 1000) / 1000,
      category: "data",
      status,
      says: `flame${title ? `, ${title}` : ""}: ${listed.join("; ")}${more}.`,
      draw(s, t, at) {
        for (const b of blocks) {
          // a level rises on the one under it, its blocks widening from their left edges
          const p = progress(t, b.depth * per, (b.depth + 1) * per);
          if (p <= 0) continue;
          const eased = 1 - (1 - p) * (1 - p);
          const v = p >= 1 ? b.w : Math.max(1, Math.ceil(eased * b.w));
          const y = at.y + levels - 1 - b.depth;
          const heat = b.hot ? MARK : (HEAT[b.depth] ?? SOFT);
          s.set(at.x + b.x, y, "[", heat);
          for (let i = 0; i < v - 2; i++) s.set(at.x + b.x + 1 + i, y, b.inner[i], b.hot ? MARK : INK);
          if (v >= 2) s.set(at.x + b.x + v - 1, y, "]", heat);
        }
      },
    };
  });
}
