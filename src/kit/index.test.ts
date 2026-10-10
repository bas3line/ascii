// node --test src/kit/index.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as kit from "./index.ts";

// Every module's values, so a new export can't be left out of ascii.rest/kit. glyphs.ts is image's data, not API,
// mirror.ts is flip()'s table of mirrored characters, which spinning() shares, and recipes/checks.ts is the recipes' own
// checking.
const recipes = ["recipes/palettes", "recipes/words", "recipes/looks", "recipes/motion", "recipes/widgets"];
const modules = ["core", "math", "draw", "field", "shapes3d", "particles", "fx", "compose", "image", "materials", "vector", ...recipes];

test("ascii.rest/kit exports every value of every module, each the module's own", async () => {
  for (const name of modules) {
    const mod = (await import(`./${name}.ts`)) as Record<string, unknown>;
    for (const [key, value] of Object.entries(mod)) {
      assert.ok(key in kit, `${name}.ts exports ${key}, which index.ts leaves out`);
      assert.equal((kit as Record<string, unknown>)[key], value, `index.ts's ${key} is not ${name}.ts's`);
    }
  }
});

test("no two modules export a value under one name", async () => {
  const seen = new Map<string, string>();
  for (const name of modules) {
    const mod = (await import(`./${name}.ts`)) as Record<string, unknown>;
    for (const [key, value] of Object.entries(mod)) {
      const other = seen.get(key);
      // math re-exports core's maths, the same values.
      if (other && (kit as Record<string, unknown>)[key] !== value) assert.fail(`${other}.ts and ${name}.ts both export ${key}`);
      seen.set(key, name);
    }
  }
});

test("ascii.rest/kit/recipes is the recipes and nothing else, each the kit's own", async () => {
  const sub = (await import("./recipes/index.ts")) as Record<string, unknown>;
  const all = new Set<string>();
  for (const name of recipes) for (const key of Object.keys(await import(`./${name}.ts`))) all.add(key);
  assert.deepEqual(Object.keys(sub).sort(), [...all].sort());
  for (const [key, value] of Object.entries(sub)) assert.equal((kit as Record<string, unknown>)[key], value, `recipes' ${key} is not the kit's`);
});

test("a recipe made through the index plays: a sea in one line", () => {
  const sea = kit.sea({ palette: "ocean" });
  assert.equal(kit.snapshot(sea, 1).text, kit.snapshot(sea, 1 + sea.meta.loop!).text);
  assert.equal(kit.snapshot(sea, 1).text.split("\n").length, sea.meta.rows);
});

test("one colour vocabulary: every option that takes colours takes a palette's name, the looks' and the materials' alike", () => {
  const svgIcon = `<svg viewBox="0 0 10 10"><path d="M1 1h8v8H1z" fill="currentColor"/></svg>`;
  const pieces = [
    kit.picture([kit.shape(kit.cup(), kit.water({ colors: "ocean" }))]),
    kit.sea({ palette: "water" }),
    kit.scene({}, kit.torus({ color: "ocean" })),
    kit.particles({ cols: 20, rows: 6 }, kit.presets.snow({ cols: 20, rows: 6 }, { colors: "ocean" })),
    kit.particles({ cols: 20, rows: 6 }, "snow", { colors: "ice" }),
    kit.field({ colors: "ocean" }, (x) => 0.5 + 0.5 * x),
    kit.glint("hello", { color: "gold" }),
    kit.rainbow("hello", { colors: "candy" }),
    kit.piece({ name: "dot", cols: 1, rows: 1, palette: "ocean" }, (t, s) => s.set(0, 0, "o", 3)),
    kit.scene({ colors: "ocean" }, kit.sphere()),
    kit.layer(new kit.Surface(8, 2), { src: "hi", color: "ocean" }),
    kit.fromSvg(svgIcon, { width: 8, color: "ocean" }),
    kit.spinning(kit.torus({ color: "fire" })),
    kit.gauge({ color: "cola" }),
  ];
  for (const p of pieces) {
    assert.ok(p.meta.palette && p.meta.palette.length >= 2, p.meta.name);
    assert.equal(kit.snapshot(p, 1).text.split("\n").length, p.meta.rows);
  }
  // a name in both tables is the looks' palette for a look, the material's for a material
  assert.ok(kit.flames({ palette: "fire" }).meta.palette!.includes(kit.schemes.fire.dark.at(-1)!));
  assert.deepEqual(kit.colorsOf("fire"), { light: [...kit.schemes.fire.light], dark: [...kit.schemes.fire.dark] });
  assert.deepEqual(kit.colorsOf("fire", "colors", "materials"), { light: [...kit.materialColors.fire.light], dark: [...kit.materialColors.fire.dark] });
  assert.deepEqual(kit.colorOf("ocean"), { light: "#025a8c", dark: "#00b4d8" });
  assert.deepEqual(kit.colorOf("#123456"), { light: "#123456", dark: "#123456" });
  assert.throws(() => kit.colorsOf("oceans"), /did you mean "ocean"\?/);
});

test("every kit piece chains: recipes, scenes, particles, layouts, effects, images and library pieces through pieceOf()", async () => {
  const donut = await import("../pieces/donut.ts");
  const love = kit.pulsing(kit.heart());
  // the line that crashed: stars().behind(...) gave a piece with no methods
  const space = kit.stars().behind(love).named("love in space");
  assert.equal(space.meta.name, "love in space");
  const made = [
    kit.spinning(kit.torus()),
    kit.gauge({ label: "cpu" }),
    kit.scene({}, kit.cube()),
    kit.particles({ cols: 20, rows: 6 }, "snow"),
    kit.picture([kit.shape(kit.cup())]),
    kit.row(["a", "b"]),
    kit.glint("hi"),
    kit.field(() => 0.5),
    kit.fromPixels(new Uint8ClampedArray(4 * 16 * 16).fill(255), 16, 16, { width: 8 }),
    kit.pieceOf(donut),
    kit.asPiece("text"),
    kit.typewriter("hello"),
    kit.over("hi", kit.sea()),
  ];
  for (const p of made) {
    for (const m of ["named", "note", "over", "behind", "speed", "delay", "repeat", "freeze", "pad", "border", "crop", "flip", "scale", "glint", "shake", "glitch", "wave", "fade", "dissolve", "rainbow", "hueCycle", "outline", "shadow", "scan", "typeIn"])
      assert.equal(typeof (p as unknown as Record<string, unknown>)[m], "function", `${p.meta.name}.${m}`);
    const q = (p as kit.KitPiece).named("renamed").border({ title: true }).glint({ every: "rarely" });
    assert.equal(kit.snapshot(q, 1).text.split("\n").length, q.meta.rows);
  }
  // spinning(...).over(sea()) and gauge().named() read as they say
  assert.equal(kit.gauge().named("cpu").meta.name, "cpu");
  assert.equal(kit.spinning(kit.torus()).over(kit.sea()).meta.cols, 64);
  assert.equal(kit.snapshot(kit.pieceOf(donut).speed(2), 1).text, kit.snapshot(donut, 2).text, "twice as fast");
  // a piece is still a plain { meta, default } to everything that plays it
  const plain = kit.chained(donut);
  assert.equal(plain.default, donut.default);
  assert.equal(kit.snapshot(plain, 1).text, kit.snapshot(donut, 1).text);
});

test("npx ascii.rest play and svg take a file of your own: its default export", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const cli = fileURLToPath(new URL("../cli.ts", import.meta.url));
  const index = fileURLToPath(new URL("./index.ts", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "kit-cli-"));
  try {
    const file = join(dir, "sea.ts");
    writeFileSync(file, `import { sea } from ${JSON.stringify(index)};\nexport default sea({ cols: 30, rows: 8 });\n`);
    const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    // piped, play prints its still; a path alone plays as play does
    const still = run("play", "sea.ts");
    assert.equal(still.replace(/\n$/, "").split("\n").length, 8, "its 8 rows");
    assert.equal(run("./sea.ts"), still);
    // svg writes the SVG of it, for a dark page with --dark
    assert.match(run("svg", "sea.ts", "--out", "sea.svg"), /^wrote sea\.svg: sea, [\d.]+ KB\n$/);
    assert.match(readFileSync(join(dir, "sea.svg"), "utf8"), /^<svg [^>]*aria-label="sea, in ascii, from ascii\.rest"/);
    assert.ok(run("svg", "sea.ts", "--dark").startsWith("<svg"));
    // what it can't play it says so
    writeFileSync(join(dir, "none.ts"), "export const x = 1;\n");
    assert.throws(() => run("play", "none.ts"), (e: { stderr: string }) => /none\.ts has no piece: export one as its default/.test(e.stderr));
    assert.throws(() => run("play", "missing.ts"), (e: { stderr: string }) => /there is no file missing\.ts/.test(e.stderr));
    assert.throws(() => run("svg", "sea.ts", "--watch"), (e: { stderr: string }) => /--watch, --mono and --light are for play/.test(e.stderr));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("npx ascii.rest play --watch plays every save, an editor's that writes a new file over the old one too", async () => {
  const { spawn } = await import("node:child_process");
  const { mkdtempSync, renameSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const cli = fileURLToPath(new URL("../cli.ts", import.meta.url));
  const index = fileURLToPath(new URL("./index.ts", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "kit-watch-"));
  const file = join(dir, "sea.ts");
  // Each version says so on stderr as it loads.
  const version = (v: string) => `import { sea } from ${JSON.stringify(index)};\nprocess.stderr.write("loaded ${v}\\n");\nexport default sea({ cols: 30, rows: 8 });\n`;
  // As most editors save: the new text written to a file of its own, then renamed over the old one.
  const save = (v: string) => {
    writeFileSync(`${file}.tmp`, version(v));
    renameSync(`${file}.tmp`, file);
  };
  writeFileSync(file, version("a"));
  // play draws only on a terminal, so this one is told stdout is one.
  const tty = `data:text/javascript,${encodeURIComponent("process.stdout.isTTY = true;")}`;
  const child = spawn(process.execPath, ["--import", tty, cli, "play", "sea.ts", "--watch"], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.resume();
  let said = "";
  child.stderr.on("data", (d: Buffer) => (said += d));
  const loaded = async (v: string) => {
    for (const end = Date.now() + 10_000; !said.includes(`loaded ${v}\n`); ) {
      if (Date.now() > end || child.exitCode !== null) assert.fail(`${v} never played: ${said}`);
      await new Promise((r) => setTimeout(r, 20));
    }
  };
  try {
    await loaded("a");
    save("b");
    await loaded("b");
    // The watch on the file itself was left on the old one by the first save, so this one was missed.
    save("c");
    await loaded("c");
    // and a save that writes the file in place still plays
    writeFileSync(file, version("d"));
    await loaded("d");
  } finally {
    child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a piece made through the index plays: the three-line field", () => {
  const sea = kit.field({ name: "sea", cols: 48, rows: 10, ramp: "blocks", colors: ["#0b3d91", "#7fdbff"], period: 2 }, (x, y, t, at) =>
    0.5 + 0.5 * Math.sin(x * 6 + y * 2 + kit.TAU * at.phase),
  );
  assert.equal(sea.meta.loop, 2);
  const { text } = kit.snapshot(sea, 1);
  assert.equal(text.split("\n").length, 10);
  assert.ok(text.split("\n").every((l) => l.length === 48));
  assert.equal(kit.snapshot(sea, 1).text, kit.snapshot(sea, 3).text);
});
