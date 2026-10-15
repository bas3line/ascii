/*
 * pipeline: a CI run, stage by stage. Each stage spins while it runs, fills
 * its bar at an uneven pace and notes its time; the command and its output
 * show beneath. Three runs a loop: two pass and deploy, one fails its tests.
 */
import type { Frame, Meta } from "../types.ts";

export interface PipelineOptions {
  [key: string]: unknown;
  stages: string[];
}

const STAGES = ["install", "lint", "test", "build", "deploy"];
// Seconds a stage takes to play, by name; one not named takes 2.
const TAKES = new Map([["install", 2.4], ["lint", 1.4], ["test", 3.6], ["build", 2.2], ["deploy", 2]]);
const COMMANDS = new Map([["install", "npm ci"], ["lint", "npm run lint"], ["test", "npm test"], ["build", "npm run build"], ["deploy", "npx vercel deploy --prod"]]);

interface Run {
  branch: string;
  sha: string;
  /** How fast it goes: its stages take this times their usual time. */
  speed: number;
  /** The stage that fails, if there is one by that name, and how far through it. */
  fail?: [string, number];
}

const RUNS: Run[] = [
  { branch: "main", sha: "a3f9c21", speed: 1 },
  { branch: "fix/nav", sha: "e81b4d0", speed: 0.94, fail: ["test", 0.62] },
  { branch: "fix/nav", sha: "5c27f9a", speed: 0.97 },
];
const QUEUED = 0.8; // a run waits for a runner first
const HOLD = 3; // and its result holds after

// Each run laid on the loop: when it starts and ends, where each stage begins and ends
// (null for one skipped after a failure), and which stage fails, -1 for none.
function layout(names: string[]) {
  let T = 0;
  const plan = RUNS.map((run) => {
    const fails = run.fail ? names.indexOf(run.fail[0]) : -1;
    const reach = run.fail?.[1] ?? 1;
    const start = T;
    let at = start + QUEUED;
    const spans = names.map((name, i) => {
      if (fails >= 0 && i > fails) return null;
      const take = (TAKES.get(name) ?? 2) * run.speed * (i === fails ? reach : 1);
      const span = [at, at + take];
      at += take;
      return span;
    });
    T = at + HOLD;
    return { run, start, end: at, spans, fails, reach };
  });
  return { plan, total: T };
}

export const meta = {
  name: "pipeline",
  category: "ui",
  note: "a ci run going stage by stage, one run failing its tests, then green",
  cols: 56,
  rows: 13,
  fps: 12,
  options: { stages: STAGES },
  // The three runs with the stages above; other stages make another length, so pass svg() its seconds.
  loop: layout(STAGES).total,
} satisfies Meta<PipelineOptions>;

const SCALE = 3.7; // shown seconds a played second
const BAR = 18;
const SPIN = "|/-\\";
const TESTS = 128;
const LINTED = ["src/app.ts", "src/nav.ts", "src/api/user.ts", "src/api/auth.ts", "src/lib/format.ts", "src/lib/fetch.ts"];

// A stage's bar moves in steps, as real work does: quick, a stall, quick again.
function pace(f: number, seed: number) {
  const a = 0.3 + 0.25 * ((seed * 0.618) % 1);
  return f < a ? (f / a) * 0.55 : f < a + 0.2 ? 0.55 + ((f - a) / 0.2) * 0.05 : 0.6 + ((f - a - 0.2) / (0.8 - a)) * 0.4;
}

// What the stage prints, f of the way through, or ended.
function output(stage: string, f: number, failed: boolean, reach: number) {
  const done = f >= 1;
  if (stage === "install") return done ? "added 412 packages in 9s" : `fetching packages  ${Math.floor(f * 412)}/412`;
  if (stage === "lint") return done ? "0 problems" : `checking ${LINTED[Math.min(LINTED.length - 1, Math.floor(f * LINTED.length))]}`;
  if (stage === "test") {
    const n = Math.floor(f * reach * TESTS);
    if (failed) return `${n - 2} passed, 2 failed: nav.test.ts`;
    return done ? `${TESTS} passed` : `${n}/${TESTS} passed`;
  }
  if (stage === "build") return done ? "dist/  built in 7.9s, 42 kB" : `bundling ${Math.floor(f * 86)} modules`;
  if (stage === "deploy") return done ? "ready  https://example.com" : `uploading ${Math.floor(f * 100)}%`;
  return done ? "done" : "";
}

const seconds = (s: number) => `${(s * SCALE).toFixed(1)}s`;
const clock = (s: number) => {
  const n = Math.floor(s * SCALE);
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};

export default function pipeline({ stages = meta.options.stages }: Partial<PipelineOptions> = {}): Frame {
  const { cols, rows } = meta;
  const names = (stages.length ? stages : STAGES).slice(0, 5);
  const { plan, total } = layout(names);
  // Frame 0 is the first run in the middle of its tests.
  const begin = plan[0].spans[Math.min(2, names.length - 1)]![0] + 1.4;

  const grid = Array.from({ length: rows }, () => new Array<string>(cols));
  const text = (r: number, c: number, s: string) => {
    for (let i = 0; i < s.length && c + i < cols - 1; i++) grid[r][c + i] = s[i];
  };

  return (t) => {
    const p = (t + begin) % total;
    let now = plan[0];
    for (const x of plan) if (x.start <= p) now = x;
    const { run, start, end, spans, fails, reach } = now;
    for (const row of grid) row.fill(" ");
    for (let c = 1; c < cols - 1; c++) grid[0][c] = grid[rows - 1][c] = "─";
    for (let r = 1; r < rows - 1; r++) grid[r][0] = grid[r][cols - 1] = "│";
    grid[0][0] = "╭";
    grid[0][cols - 1] = "╮";
    grid[rows - 1][0] = "╰";
    grid[rows - 1][cols - 1] = "╯";
    text(0, 2, ` ci · ${run.branch} · ${run.sha} `);

    const spin = SPIN[Math.floor(p * 8) % 4];
    let live = -1;
    let last = -1;
    names.forEach((name, i) => {
      const r = 2 + i;
      const span = spans[i];
      const failed = i === fails;
      text(r, 5, name.slice(0, 9));
      if (!span) {
        text(r, 3, p < end ? "·" : "-");
        text(r, 15, "·".repeat(BAR));
        text(r, 44, p < end ? "queued" : "skipped");
        return;
      }
      const f = Math.max(0, Math.min(1, (p - span[0]) / (span[1] - span[0])));
      if (p < span[0]) {
        text(r, 3, "·");
        text(r, 15, "·".repeat(BAR));
        text(r, 44, "queued");
        return;
      }
      const shown = failed ? reach * pace(f, i + 1) : pace(f, i + 1);
      const k = Math.round(shown * BAR);
      text(r, 15, "█".repeat(k) + "░".repeat(BAR - k));
      text(r, 35, seconds(Math.min(p, span[1]) - span[0]).padStart(7));
      last = i;
      if (f < 1) {
        live = i;
        text(r, 3, spin);
        text(r, 44, "running");
      } else {
        text(r, 3, failed ? "x" : "+");
        text(r, 44, failed ? "failed" : "passed");
      }
    });

    // The command of the stage running, or of the last one to finish.
    const at = live >= 0 ? live : last;
    const span = spans[at];
    if (at >= 0 && span) {
      const f = Math.max(0, Math.min(1, (p - span[0]) / (span[1] - span[0])));
      const failing = at === fails;
      text(8, 3, `$ ${COMMANDS.get(names[at]) ?? `npm run ${names[at]}`}`);
      text(9, 5, output(names[at], f < 1 ? pace(f, at + 1) : 1, failing && f >= 1, failing ? reach : 1));
    }

    let status: string;
    if (p < start + QUEUED) status = "queued · waiting for a runner";
    else if (p < end) status = `running · stage ${live + 1} of ${names.length} · ${clock(p - start - QUEUED)}`;
    else if (fails >= 0) status = `failed at ${names[fails]} · ${clock(end - start - QUEUED)}`;
    else status = `passed · ${names.includes("deploy") ? "deployed" : "done"} in ${clock(end - start - QUEUED)}`;
    text(11, 3, status);
    return grid.map((row) => row.join("")).join("\n");
  };
}
