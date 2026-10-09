// npm run kit -- <file.ts> [--at 0,1,2.5] [--paper] [--mono] [--svg out.svg] [--dark]
// Plays a piece made with ascii.rest/kit, the default export of a file such as
// examples/kit/core-orbit.ts: checks its frames against the contract that
// scripts/check.ts holds the library's pieces to (size, colours, the same frame
// for the same t, time a frame), prints them, and with --svg writes the SVG
// svg() makes of it.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { svg } from "../../src/svg.ts";
import type { Piece } from "../../src/types.ts";

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const file = argv.find((a, i) => !a.startsWith("--") && !["--at", "--svg"].includes(argv[i - 1]));
if (!file) {
  console.log("usage: npm run kit -- <file.ts> [--at 0,1,2.5] [--paper] [--mono] [--svg out.svg] [--dark]");
  process.exit(2);
}
const at = (value("at") ?? "0,1,2.5").split(",").map(Number);
const paper = flag("paper"), mono = flag("mono");

const mod = (await import(pathToFileURL(resolve(file)).href)) as { default?: Piece } & Partial<Piece>;
// A file may export the piece as its default, or be a piece module itself: meta and a default function.
const piece: Piece | undefined = mod.default && typeof mod.default === "object" ? mod.default : mod.meta && typeof mod.default === "function" ? (mod as Piece) : undefined;
if (!piece) {
  console.log(`FAIL ${file}: no piece: export one as the default, or export meta and a default function`);
  process.exit(1);
}
const { meta } = piece;
const errors: string[] = [];
const run = (times: number[], p: boolean, m: boolean) => {
  const frame = piece.default({ ...meta.options });
  const color = meta.palette && !m ? new Uint8Array(meta.cols * meta.rows) : undefined;
  const ms: number[] = [];
  const out = times.map((t) => {
    const a = performance.now();
    const text = frame(t, { paper: p, color });
    ms.push(performance.now() - a);
    return { text, color: color?.slice() };
  });
  return { out, ms };
};
const times = [...new Set([...at, 0, 1, 2, 3, 4, 6])].sort((a, b) => a - b);
const a = run(times, paper, mono), b = run(times, paper, mono);
a.out.forEach(({ text, color }, i) => {
  const lines = text.split("\n");
  if (lines.length !== meta.rows) errors.push(`t=${times[i]}: ${lines.length} lines, meta.rows is ${meta.rows}`);
  const bad = lines.findIndex((l) => l.length !== meta.cols);
  if (bad >= 0) errors.push(`t=${times[i]}: line ${bad} is ${lines[bad].length} chars, meta.cols is ${meta.cols}`);
  if (color) {
    const k = color.findIndex((c) => c >= meta.palette!.length);
    if (k >= 0) errors.push(`t=${times[i]}: color[${k}] is ${color[k]}, past the ${meta.palette!.length}-colour palette`);
  }
  if (!meta.clock && (text !== b.out[i].text || (color && color.some((c, k) => c !== b.out[i].color![k])))) errors.push(`t=${times[i]}: not the same frame twice`);
});
const distinct = new Set(a.out.map((o) => o.text)).size;
if (meta.fps > 0 && distinct < 3) errors.push(`animated (fps ${meta.fps}) but only ${distinct} distinct frames over 6s`);
if (meta.fps === 0 && distinct > 1 && !meta.clock) errors.push("fps 0 but frames change");
const avg = a.ms.slice(1).reduce((x, y) => x + y, 0) / Math.max(1, a.ms.length - 1);

console.log(`${errors.length ? "FAIL" : "ok  "} ${file}  ${meta.name}  ${meta.cols}x${meta.rows}  ${meta.fps}fps  ${meta.palette ? `${meta.palette.length} colours  ` : ""}${avg.toFixed(2)}ms a frame`);
for (const e of errors) console.log(`  ${e}`);
const rule = "+" + "-".repeat(meta.cols) + "+";
for (const t of at) {
  const i = times.indexOf(t);
  console.log(`\nat t=${t}s${paper ? " on paper" : ""}\n${rule}`);
  for (const l of a.out[i].text.split("\n")) console.log("|" + l + "|");
  console.log(rule);
}
const out = value("svg");
if (out) {
  const s = svg(piece, { dark: flag("dark") });
  writeFileSync(out, s);
  console.log(`\nwrote ${out}: ${(s.length / 1024).toFixed(1)} KB`);
}
process.exit(errors.length ? 1 : 0);
