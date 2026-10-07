// node scripts/compare.ts <dir of .js originals> [slug ...]
// Plays each piece in src/pieces beside its JavaScript original for eight
// seconds, ink and paper, and fails on any frame or colour that differs.
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Piece } from "../src/types.ts";

const [dir, ...picked] = process.argv.slice(2);
if (!dir) {
  console.log("usage: node scripts/compare.ts <dir of .js originals> [slug ...]");
  process.exit(2);
}
const SRC = fileURLToPath(new URL("../src/pieces", import.meta.url));
const slugs = picked.length ? picked : readdirSync(SRC).filter((f) => f.endsWith(".ts") && f !== "index.ts").map((f) => f.slice(0, -3)).sort();

function frames(mod: Piece, paper: boolean) {
  const { meta } = mod;
  const frame = mod.default({ ...(meta.options || {}) });
  const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
  const step = meta.fps ? 1 / meta.fps : 0.5;
  const out: string[] = [];
  for (let i = 0; ; i++) {
    const t = Math.round(i * step * 1e6) / 1e6;
    if (t > 8) break;
    out.push(frame(t, { paper, color }) + (color ? "|" + color.join(",") : ""));
  }
  return out;
}

let failed = 0;
for (const slug of slugs) {
  try {
    const ts = (await import(pathToFileURL(`${SRC}/${slug}.ts`).href)) as Piece;
    const js = (await import(pathToFileURL(resolve(dir, `${slug}.js`)).href)) as Piece;
    if (JSON.stringify(ts.meta) !== JSON.stringify(js.meta)) throw new Error("meta differs");
    if (ts.meta.clock) {
      console.log(`skip ${slug}: reads the clock, frames depend on when they run`);
      continue;
    }
    for (const paper of [false, true]) {
      const a = frames(ts, paper), b = frames(js, paper);
      const i = a.findIndex((f, k) => f !== b[k]);
      if (i >= 0 || a.length !== b.length) throw new Error(`${paper ? "paper" : "ink"} frame ${i} differs`);
    }
    console.log(`same ${slug}`);
  } catch (e) {
    console.log(`DIFF ${slug}: ${(e as Error).message}`);
    failed++;
  }
}
console.log(`\n${slugs.length - failed}/${slugs.length} same`);
process.exit(failed ? 1 : 0);
