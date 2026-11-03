/*
 * git-graph: git log --graph, with new commits arriving at the top. Feature
 * branches fork off main and merge back; HEAD rides the newest commit, whose
 * message types itself in. The history is a ring, so the scroll never ends.
 */
import type { Frame, Meta } from "../types.ts";


const EVERY = 1.1; // seconds a line
const TYPE = 0.55; // of which the newest message takes to type

// The history, newest first. A run of plain commits, or a merge: its commits on the
// branch and, if it has one, the commit main gained meanwhile. Every one starts and
// ends on a single lane, so they join in any order and the last wraps to the first.
type Part = string[] | { branch: string; on: string[]; main?: string };
const HISTORY: Part[] = [
  { branch: "feat/search", on: ["search: rank names before notes", "search: / focuses the field"], main: "docs: the install page" },
  ["fix: keep the sidebar's scroll"],
  { branch: "feat/stars", on: ["header: show the repo's stars", "header: wait before asking again"] },
  ["release 0.4.0", "readme: a banner in both themes"],
  { branch: "fix/safari", on: ["mount: reload on a failed import"], main: "ci: node 24" },
  ["pieces: add pipeline", "pieces: add sparkline"],
  { branch: "feat/kit", on: ["kit: particles", "kit: fields and looks", "kit: a frame contract"], main: "site: dark theme" },
  ["chore: bump typescript"],
];

interface Line {
  graph: string;
  message?: string;
  tag?: string;
  branch?: string;
}

function lines(): Line[] {
  const out: Line[] = [];
  for (const part of HISTORY) {
    if (Array.isArray(part)) {
      for (const message of part) out.push({ graph: "*", message, tag: message.startsWith("release ") ? `tag: v${message.slice(8)}` : undefined });
      continue;
    }
    out.push({ graph: "*   ", message: `merge ${part.branch}`, branch: part.branch });
    out.push({ graph: "|\\  " });
    for (const message of part.on) out.push({ graph: "| * ", message, branch: part.branch });
    if (part.main) out.push({ graph: "* | ", message: part.main });
    out.push({ graph: "|/  " });
  }
  return out;
}

export const meta = {
  name: "git graph",
  category: "ui",
  note: "git log --graph scrolling, branches forking off main and merging back",
  cols: 60,
  rows: 16,
  fps: 15,
  // A commit a step, round the ring.
  loop: EVERY * lines().filter((line) => line.message).length,
} satisfies Meta;

// Short hashes that hold still for each line, from a hash of its place.
function sha(i: number) {
  let h = Math.imul(i + 1, 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

export default function gitGraph(): Frame {
  const { cols, rows } = meta;
  const log = lines();
  const n = log.length;
  const shas = log.map((_, i) => sha(i));
  const view = rows - 2;
  // Only a commit can be the newest line; the lines joining lanes come in with it.
  const tops = log.flatMap((line, i) => (line.message ? [i] : []));

  return (t) => {
    // Frame 0 is a step far enough in that its message has typed.
    const at = t / EVERY + 0.6;
    const step = Math.floor(at);
    const into = at - step;
    // Each step brings a commit in at the top: the view walks back through the ring.
    const top = tops[(((-step) % tops.length) + tops.length) % tops.length];
    const out = ["$ git log --graph --oneline".padEnd(cols), " ".repeat(cols)];
    let head = true;
    const merged = new Set<string>();
    let tip = true;
    for (let r = 0; r < view; r++) {
      const i = (top + r) % n;
      const line = log[i];
      let s = line.graph.padEnd(5);
      if (line.message) {
        const onMain = line.graph.startsWith("*");
        // HEAD on main's newest commit, and a branch not merged yet named at its tip.
        const named = !onMain && tip && line.branch && !merged.has(line.branch) ? line.branch : "";
        const marks = [onMain && head ? "HEAD -> main" : "", named, line.tag ?? ""].filter(Boolean).join(", ");
        // The newest message types in after its marks; the rest have landed.
        const typed = r === 0 ? line.message.slice(0, Math.ceil(line.message.length * Math.min(1, into / TYPE))) : line.message;
        const message = (marks ? `(${marks}) ` : "") + typed;
        if (onMain) head = false;
        else tip = false;
        if (onMain && line.branch) merged.add(line.branch);
        s += `${shas[i]} ${message}`;
      }
      out.push(s.slice(0, cols).padEnd(cols));
    }
    return out.join("\n");
  };
}
