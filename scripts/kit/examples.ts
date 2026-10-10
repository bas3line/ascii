// npm run kit:examples [-- --svg <dir>] [--frames]
// Plays every example in examples/kit through scripts/kit/show.ts, on a dark
// page, on paper and in one ink, and fails if any of them breaks the frame
// contract. With --svg it also writes each example's SVG, light and dark, into
// that folder; with --frames it prints each example's frame at 1 second.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const show = join(root, "scripts/kit/show.ts");
const argv = process.argv.slice(2);
const at = argv.indexOf("--svg");
const dir = at >= 0 ? resolve(argv[at + 1] ?? "") : undefined;
const frames = argv.includes("--frames");
if (dir) mkdirSync(dir, { recursive: true });

const files = readdirSync(join(root, "examples/kit"))
  .filter((f) => f.endsWith(".ts"))
  .sort();
let failed = 0;
for (const f of files) {
  const file = join("examples/kit", f);
  const name = f.slice(0, -3);
  const runs: string[][] = [["--at", "1"], ["--at", "1", "--paper"], ["--at", "1", "--mono"]];
  if (dir) runs.push(["--at", "1", "--svg", join(dir, `${name}.svg`)], ["--at", "1", "--dark", "--svg", join(dir, `${name}.dark.svg`)]);
  for (const flags of runs) {
    const r = spawnSync(process.execPath, [show, file, ...flags], { cwd: root, encoding: "utf8" });
    const out = r.stdout.trim();
    const head = out.split("\n")[0] ?? "";
    const ok = r.status === 0;
    if (!ok) failed++;
    // One line a run; the frame only once, from the first run, when asked.
    console.log(`${head}  [${flags.filter((x) => x.startsWith("--") && x !== "--at").join(" ") || "dark"}]`);
    if (!ok) console.log(out.split("\n").slice(1).filter((l) => l.startsWith("  ")).join("\n") || r.stderr.trim());
    if (frames && flags.length === 2) console.log(out.split("\n").slice(out.split("\n").findIndex((l) => l.startsWith("at t="))).join("\n"));
    const wrote = out.split("\n").find((l) => l.startsWith("wrote "));
    if (wrote) console.log(`  ${wrote}`);
  }
}
console.log(`\n${files.length} examples, ${failed ? `${failed} runs failed` : "every run ok"}`);
process.exit(failed ? 1 : 0);
