// npm run added: writes src/data/added.json, the day each piece came into the
// library, from git: the commit that added src/pieces/<slug>.ts, carried through
// renames. The site marks the recent ones new. The build reads this file and
// never git, because Workers Builds may clone only the last commit. Run it after
// pieces land; until then a piece missing from the file counts as new.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = fileURLToPath(new URL("../src/data/added.json", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });

if (git("rev-parse", "--is-shallow-repository").trim() === "true") {
  console.error("added: this clone is shallow, so it does not know when the older pieces came. Run git fetch --unshallow first.");
  process.exit(1);
}

const slug = (path) => path.match(/^src\/pieces\/([^/]+)\.ts$/)?.[1];
// Oldest first, so a rename takes the day its old name was added.
const log = git("log", "--reverse", "-M", "--diff-filter=AR", "--name-status", "--format=@%cs", "--", "src/pieces");
const added = new Map();
let day = "";
for (const line of log.split("\n")) {
  const [status, from, to] = line.split("\t");
  if (status.startsWith("@")) day = status.slice(1);
  else if (status === "A" && slug(from)) added.set(slug(from), day);
  else if (status.startsWith("R") && slug(to)) added.set(slug(to), added.get(slug(from)) ?? day);
}

const pieces = readdirSync(`${ROOT}/src/pieces`)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .map((f) => f.slice(0, -3))
  .sort();
const out = Object.fromEntries(pieces.filter((p) => added.has(p)).map((p) => [p, added.get(p)]));
const missing = pieces.filter((p) => !added.has(p));

mkdirSync(fileURLToPath(new URL("../src/data", import.meta.url)), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`added: ${Object.keys(out).length} pieces dated, the latest on ${Object.values(out).sort().at(-1)}`);
if (missing.length) console.log(`added: not committed yet, so new: ${missing.join(", ")}`);
