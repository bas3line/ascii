// npm run kit:docs [-- --frames]
// Checks every TypeScript block in the kit's docs pages (site/src/pages/docs/kit*.md),
// the markdown components' pages (markdown*.md), and the README's kit and markdown
// blocks against the built package, as a user's project would import it:
// "ascii.rest/kit" and the rest resolve to dist/ through package.json's exports.
// Each page's blocks are written to a folder of their own, a block whose first line
// is a comment naming a file (// sea.ts) under that name, so later blocks can import
// it. Then tsc checks them all, and node runs each .ts block, playing its default
// export, if it is a piece, through the frame contract. A ```text block after a
// block is its frame as the page shows it: it must be the frame the piece draws, in
// one ink, at the time its caption names ("at 2.5 seconds"), blank rows at either
// end and spaces at line ends aside; with no time named, that is 1 second, or for a
// markdown component its still, its finished drawing, as plain() prints it. When it
// isn't, the real frame is printed to paste in. Every ```ascii fence a markdown page
// draws is checked the same way: it must draw, and the next ```text block in its
// section must be its still. With --frames it prints each piece's frame at 1
// second. Run npm run build first.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const frames = process.argv.includes("--frames");
if (!existsSync(join(root, "dist/kit/index.js"))) {
  console.log("FAIL: no dist/kit/index.js: run npm run build first");
  process.exit(1);
}

// The pages, and the README's blocks that use the kit or the markdown components.
const docs = join(root, "site/src/pages/docs");
const sources = readdirSync(docs)
  .filter((f) => /^kit(-[a-z0-9]+)?\.md$/.test(f) || /^markdown(-[a-z0-9]+)?\.md$/.test(f))
  .sort()
  .map((f) => ({ name: f.slice(0, -3), text: readFileSync(join(docs, f), "utf8") }));
sources.push({ name: "readme", text: readFileSync(join(root, "README.md"), "utf8") });

const dir = mkdtempSync(join(tmpdir(), "ascii-kit-docs-"));
mkdirSync(join(dir, "node_modules/@types"), { recursive: true });
symlinkSync(root, join(dir, "node_modules/ascii.rest"), "dir");
symlinkSync(join(root, "node_modules/react"), join(dir, "node_modules/react"), "dir");
for (const t of ["node", "react"]) symlinkSync(join(root, "node_modules/@types", t), join(dir, "node_modules/@types", t), "dir");
writeFileSync(
  join(dir, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      jsx: "react-jsx",
      types: ["node"],
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      noEmit: true,
      skipLibCheck: false,
    },
    include: ["**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  }),
);

interface Block {
  page: string;
  n: number;
  file: string;
  ts: boolean;
  // The frame the page shows after it, and the time its caption names, null when it names none: null for no frame.
  shown: { text: string; at: number | null } | null;
}
// A frame as a page shows one: spaces at line ends and blank rows at either end left out.
const tidy = (s: string) => s.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/^\n+|\n+$/g, "");
const blocks: Block[] = [];
for (const { name, text } of sources) {
  const fence = /```(ts|tsx)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = fence.exec(text))) {
    const code = m[2];
    if (name === "readme" && !code.includes("ascii.rest/kit") && !code.includes("ascii.rest/markdown")) continue;
    n++;
    const named = /^\/\/ ([\w./-]+\.tsx?)\n/.exec(code)?.[1];
    const file = join(name, named ?? `block-${n}.${m[1]}`);
    mkdirSync(join(dir, dirname(file)), { recursive: true });
    writeFileSync(join(dir, file), code);
    // The text block that follows, before the next code block or heading, is its frame; its caption says when.
    const rest = text.slice(fence.lastIndex);
    const until = rest.search(/```(ts|tsx)\n|\n#{1,3} /);
    const after = until < 0 ? rest : rest.slice(0, until);
    const frame = /```text\n([\s\S]*?)```/.exec(after);
    const caption = frame ? after.slice(0, frame.index) : "";
    const when = /\bat (\d+(?:\.\d+)?) seconds?\b/i.exec(caption) ?? /\bat t ?= ?(\d+(?:\.\d+)?)/i.exec(caption);
    blocks.push({ page: name, n, file, ts: file.endsWith(".ts"), shown: frame ? { text: tidy(frame[1]), at: when ? Number(when[1]) : null } : null });
  }
  // A picture for the blocks that read one: an image of the python logo, as ./logo.png.
  mkdirSync(join(dir, name), { recursive: true });
  copyFileSync(join(root, "examples/kit/assets/python.png"), join(dir, name, "logo.png"));
}

let failed = 0;
// Run from the folder, so errors name the page and the block's file: kit/pulse.ts(4,58).
const tsc = spawnSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], { cwd: dir, encoding: "utf8" });
if (tsc.status !== 0) {
  failed++;
  console.log(`FAIL tsc on ${blocks.length} blocks:\n${(tsc.stdout + tsc.stderr).trim()}`);
} else console.log(`ok   tsc: ${blocks.length} blocks from ${sources.length} files typecheck against the build`);

// Plays a block's default export, if it is a piece, as scripts/kit/show.ts checks one.
const runner = join(dir, "run.mjs");
writeFileSync(
  runner,
  `import { snapshot } from "ascii.rest/kit";
const mod = await import(process.argv[2]);
const p = mod.default;
if (!p || typeof p !== "object" || !p.meta) { console.log("ran, no piece"); process.exit(0); }
const { meta } = p;
for (const paper of [false, true]) for (const mono of [false, true]) for (const t of [0, 0.5, 1, 2.5]) {
  const a = snapshot(p, t, { paper, mono }), b = snapshot(p, t, { paper, mono });
  const lines = a.text.split("\\n");
  if (lines.length !== meta.rows || lines.some((l) => l.length !== meta.cols)) throw new Error("t=" + t + ": not " + meta.rows + " lines of " + meta.cols);
  if (a.text !== b.text) throw new Error("t=" + t + ": not the same frame twice");
  if (a.color && meta.palette && a.color.some((c) => c >= meta.palette.length)) throw new Error("t=" + t + ": a colour past the palette");
}
console.log(meta.name + "  " + meta.cols + "x" + meta.rows + "  " + meta.fps + "fps" + (meta.loop ? "  loop " + meta.loop + "s" : ""));
if (process.argv[3] === "--frames") console.log(snapshot(p, 1, { mono: true }).text.split("\\n").map((l) => "    |" + l + "|").join("\\n"));
// The frame at the time its page shows, between markers and saying when, for the page's frame to be checked against.
// With no time named it is 1 second, or for a markdown component (it has a kind and says) its still, as plain() prints.
if (process.argv[4] !== undefined) {
  const named = process.argv[4] !== "unnamed";
  if (typeof p.kind === "string" && typeof p.says === "string") {
    const { plain } = await import("ascii.rest/markdown");
    const text = named ? plain(p, { t: Number(process.argv[4]) }) : plain(p);
    console.log("<<<FRAME " + (named ? "at " + process.argv[4] + "s" : "at its still, " + +(meta.still ?? 0).toFixed(3) + "s") + "\\n" + text + "\\nFRAME>>>");
  } else console.log("<<<FRAME at " + (named ? process.argv[4] : 1) + "s\\n" + snapshot(p, named ? Number(process.argv[4]) : 1, { mono: true }).text + "\\nFRAME>>>");
}
`,
);
for (const b of blocks) {
  const label = `${b.page}.md block ${b.n} (${b.file})`;
  const code = readFileSync(join(dir, b.file), "utf8");
  // .tsx needs a bundler, a terminal player takes the terminal, and mount(), paint() and start() need a page: those are
  // only typechecked.
  const skip = !b.ts ? "tsx" : /\bplay\(|\bmount\(|\bpaint\(|\bstart\(|document\./.test(code) ? "needs a terminal or a page" : "";
  if (skip) {
    console.log(`--   ${label}: typechecked only (${skip})`);
    continue;
  }
  const at = b.shown ? [b.shown.at === null ? "unnamed" : String(b.shown.at)] : [];
  const r = spawnSync(process.execPath, [runner, join(dir, b.file), frames ? "--frames" : "", ...at], { cwd: join(dir, b.page), encoding: "utf8" });
  if (r.status !== 0) {
    failed++;
    console.log(`FAIL ${label}:\n${(r.stderr || r.stdout).trim().split("\n").slice(0, 8).join("\n")}`);
    continue;
  }
  const out = r.stdout.replace(/<<<FRAME [^\n]*\n[\s\S]*?\nFRAME>>>\n?/, "").trim();
  const [, when, real] = /<<<FRAME ([^\n]*)\n([\s\S]*?)\nFRAME>>>/.exec(r.stdout) ?? [];
  if (b.shown && real !== undefined && tidy(real) !== b.shown.text) {
    failed++;
    console.log(`FAIL ${label}: the frame the page shows is not the one it draws ${when}, in one ink. The real one:\n${tidy(real)}`);
    continue;
  }
  console.log(`ok   ${label}: ${out}${b.shown && real !== undefined ? `  frame ${when} matches` : ""}`);
}
rmSync(dir, { recursive: true, force: true });

// Every ```ascii fence a markdown page draws, as its remark plugin draws it: it must draw, and the first ```text block
// after it in its section must be its still, as plain() prints it. A fence shown inside another (a ````md block) is
// that block's text, not a component, and is left alone.
const { fencesOf, fromFence, plain } = (await import(pathToFileURL(join(root, "dist/markdown/index.js")).href)) as typeof import("../../src/markdown/index.ts");
let fenced = 0;
for (const { name, text } of sources.filter((s) => s.name.startsWith("markdown"))) {
  for (const f of fencesOf(text)) {
    fenced++;
    const label = `${name}.md line ${f.line} (\`\`\`${f.info})`;
    let still: string;
    try {
      still = tidy(plain(fromFence(f.info, f.body)));
    } catch (error) {
      failed++;
      console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const rest = text.slice(f.to);
    const until = rest.search(/\n## /);
    const shown = /```text\n([\s\S]*?)```/.exec(until < 0 ? rest : rest.slice(0, until));
    if (shown && tidy(shown[1]) !== still) {
      failed++;
      console.log(`FAIL ${label}: the text the page shows after it is not its still. The real one:\n${still}`);
      continue;
    }
    console.log(`ok   ${label}: draws${shown ? ", its still matches the text after it" : ""}`);
  }
}
console.log(`\n${blocks.length} blocks and ${fenced} ascii fences, ${failed ? `${failed} failed` : "all ok"}`);
process.exit(failed ? 1 : 0);
