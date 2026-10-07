// npm run check [-- --show] [-- slug ...]   no slugs = every piece
// Checks the pieces in src/pieces against the contract in the README and, with
// --show, prints frames at t = 0, 1, 2.5 and 5 seconds.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Meta, Piece } from "../src/types.ts";

const DIR = fileURLToPath(new URL("../src/pieces", import.meta.url));
const CATS = ["scenes", "shapes", "space", "physics", "nature", "creatures", "objects", "generative", "effects", "ui", "data", "type"];
const CHARSET = /^[\x20-\x7E·°─-▟]*$/;
const SCENE_CHARSET = /^[\x20-\x7E·°─-▟•●]*$/;
const SHOW_AT = [0, 1, 2.5, 5];
const SAMPLE_AT = [0, 1, 2, 3, 4, 6];

const argv = process.argv.slice(2);
const show = argv.includes("--show");
let slugs = argv.filter((a) => !a.startsWith("--"));
if (!slugs.length)
  slugs = readdirSync(DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.slice(0, -3))
    .sort();

type Run = { frames: (string | undefined)[]; colors: (Uint8Array | undefined)[]; ms: number[] };

// Plays a fresh instance from t = 0 in 1/fps steps, sampling at the given times.
function play(make: Piece["default"], meta: Meta, times: number[], paper = false): Run {
  const frame = make({ ...(meta.options || {}) });
  const fps = meta.fps || 0;
  const out = new Map<number, string>();
  const colors = new Map<number, Uint8Array>();
  const ms: number[] = [];
  const end = Math.max(...times);
  const step = fps ? 1 / fps : 0.5;
  const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
  let first = true;
  for (let i = 0; ; i++) {
    const t = Math.round(i * step * 1e6) / 1e6;
    if (t > end + 1e-9) break;
    const a = performance.now();
    const s = frame(t, { paper, color });
    const d = performance.now() - a;
    if (!first) ms.push(d);
    first = false;
    for (const want of times)
      if (Math.abs(want - t) < step / 2 + 1e-9 && !out.has(want)) {
        out.set(want, s);
        if (color) colors.set(want, color.slice());
      }
  }
  return { frames: times.map((x) => out.get(x)), colors: times.map((x) => colors.get(x)), ms };
}

let failed = 0;
for (const slug of slugs) {
  const file = `${DIR}/${slug}.ts`;
  const errors: string[] = [];
  if (!existsSync(file)) {
    console.log(`FAIL ${slug}: no file src/pieces/${slug}.ts`);
    failed++;
    continue;
  }
  const src = readFileSync(file, "utf8");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push("file name must be kebab-case");
  if (/Math\.random/.test(src)) errors.push("Math.random (use a seeded PRNG)");
  if (/\b(document|window|requestAnimationFrame|localStorage|navigator|globalThis)\b/.test(src)) errors.push("DOM or global reference");
  // Types may be imported: they are erased, so the built piece still imports nothing.
  if (/^\s*import\s(?!type\s)/m.test(src)) errors.push("imports (pieces must be self-contained; import type is fine)");
  let mod: Piece;
  try {
    mod = (await import(pathToFileURL(file).href)) as Piece;
  } catch (e) {
    console.log(`FAIL ${slug}: import threw: ${(e as Error).message}`);
    failed++;
    continue;
  }
  const m = mod.meta;
  if (!m || typeof m !== "object") errors.push("no meta export");
  else {
    if (typeof m.name !== "string" || !m.name) errors.push("meta.name");
    if (!CATS.includes(m.category)) errors.push(`meta.category must be one of ${CATS.join(", ")}`);
    if (typeof m.note !== "string" || m.note.length > 72 || !m.note) errors.push("meta.note must be 1-72 chars");
    // Scenes are wide, dense, coloured pictures; everything else is a small mono piece.
    const scene = m.category === "scenes";
    const [maxCols, maxRows] = scene ? [320, 120] : [80, 32];
    if (!Number.isInteger(m.cols) || m.cols < 1 || m.cols > maxCols) errors.push(`meta.cols must be an integer 1-${maxCols}`);
    if (!Number.isInteger(m.rows) || m.rows < 1 || m.rows > maxRows) errors.push(`meta.rows must be an integer 1-${maxRows}`);
    if (!Number.isInteger(m.fps) || m.fps < 0 || m.fps > 60) errors.push("meta.fps must be an integer 0-60");
    if (m.options !== undefined && (typeof m.options !== "object" || m.options === null)) errors.push("meta.options must be an object");
    const hex = (c: unknown) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
    if (m.palette !== undefined && !(Array.isArray(m.palette) && m.palette.length >= 2 && m.palette.length <= 64 && m.palette.every(hex)))
      errors.push("meta.palette must be 2-64 colours as #rrggbb");
    if (m.ground !== undefined && !hex(m.ground)) errors.push("meta.ground must be #rrggbb");
    if (m.cell !== undefined && !(m.cell === 1 || m.cell === 2)) errors.push("meta.cell must be 1 (square) or 2");
    if (scene && (!m.palette || !m.ground)) errors.push("a scene needs meta.palette and meta.ground");
  }
  if (typeof mod.default !== "function") errors.push("no default export function");
  if (errors.length) {
    console.log(`FAIL ${slug}: ${errors.join("; ")}`);
    failed++;
    continue;
  }

  let run: Run, run2: Run, runPaper: Run;
  try {
    run = play(mod.default, m, SAMPLE_AT);
    run2 = play(mod.default, m, SAMPLE_AT);
    runPaper = play(mod.default, m, [0, 1], true);
  } catch (e) {
    console.log(`FAIL ${slug}: frame threw: ${(e as Error).stack?.split("\n").slice(0, 3).join(" | ")}`);
    failed++;
    continue;
  }
  run.frames.forEach((f, i) => {
    const at = `t=${SAMPLE_AT[i]}`;
    if (typeof f !== "string") return errors.push(`${at}: frame is not a string`);
    const lines = f.split("\n");
    if (lines.length !== m.rows) errors.push(`${at}: ${lines.length} lines, meta.rows is ${m.rows}`);
    const bad = lines.findIndex((l) => [...l].length !== m.cols);
    if (bad >= 0) errors.push(`${at}: line ${bad} is ${[...lines[bad]].length} chars, meta.cols is ${m.cols}`);
    // Scenes are drawn on a canvas, cell by cell, so they may also use dots.
    const set = m.category === "scenes" ? SCENE_CHARSET : CHARSET;
    if (!set.test(f.replace(/\n/g, ""))) {
      const ch = [...f.replace(/\n/g, "")].find((c) => !set.test(c))!;
      errors.push(`${at}: character outside the allowed set: ${JSON.stringify(ch)} U+${ch.codePointAt(0)!.toString(16)}`);
    }
  });
  const f0 = run.frames[0];
  if (typeof f0 === "string") {
    const cells = m.cols * m.rows;
    const ink = [...f0].filter((c) => c !== " " && c !== "\n").length;
    if (ink / cells < 0.02 && ink < 3) errors.push("first frame is nearly empty (frame 0 should be a good still)");
  }
  const distinct = new Set(run.frames).size;
  if (m.fps > 0 && distinct < 3) errors.push(`animated (fps ${m.fps}) but only ${distinct} distinct frames over 6s`);
  if (m.fps === 0 && distinct > 1 && !m.clock) errors.push("fps 0 but frames change");
  if (!m.clock && run.frames.some((f, i) => f !== run2.frames[i])) errors.push("not deterministic (seed your PRNG; Date only with meta.clock)");
  if (runPaper.frames.some((f) => typeof f !== "string")) errors.push("paper frame not a string");
  if (m.palette) {
    const n = m.palette.length;
    run.colors.forEach((c, i) => {
      const bad = c ? c.findIndex((v) => v >= n) : -1;
      if (c && bad >= 0) errors.push(`t=${SAMPLE_AT[i]}: color[${bad}] is ${c[bad]}, past the ${n}-colour palette`);
    });
    if (!m.clock && run.colors.some((c, i) => c && c.some((v, k) => v !== run2.colors[i]![k]))) errors.push("colours not deterministic");
    const used = new Set<number>();
    run.colors[0]?.forEach((v, k) => {
      if (f0![k + Math.floor(k / m.cols)] !== " ") used.add(v);
    });
    if (used.size < 4) errors.push(`only ${used.size} palette colours on inked cells in the first frame`);
  }
  if (run.ms.length) {
    const avg = run.ms.reduce((a, b) => a + b, 0) / run.ms.length;
    const max = Math.max(...run.ms);
    const [budget, worst] = m.category === "scenes" ? [10, 40] : [4, 30];
    if (avg > budget) errors.push(`slow: ${avg.toFixed(2)}ms per frame on average (budget ${budget}ms)`);
    if (max > worst) errors.push(`slow: worst frame ${max.toFixed(1)}ms (budget ${worst}ms)`);
  }

  if (errors.length) {
    console.log(`FAIL ${slug}: ${errors.join("; ")}`);
    failed++;
  } else {
    const avg = run.ms.length ? (run.ms.reduce((a, b) => a + b, 0) / run.ms.length).toFixed(2) : "0";
    console.log(`ok   ${slug}  ${m.category}  ${m.cols}x${m.rows}  ${m.fps}fps  ${avg}ms`);
  }
  if (show) {
    const frames = play(mod.default, m, SHOW_AT).frames;
    const rule = "+" + "-".repeat(m.cols) + "+";
    frames.forEach((f, i) => {
      console.log(`\n${slug} at t=${SHOW_AT[i]}s`);
      console.log(rule);
      for (const l of String(f).split("\n")) console.log("|" + l + "|");
      console.log(rule);
    });
    console.log("");
  }
}
console.log(`\n${slugs.length - failed}/${slugs.length} ok`);
process.exit(failed ? 1 : 0);
