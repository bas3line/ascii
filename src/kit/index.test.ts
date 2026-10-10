// node --test src/kit/index.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as kit from "./index.ts";

// Every module's values, so a new export can't be left out of ascii.rest/kit. glyphs.ts is image's data, not API, and
// recipes/checks.ts is the recipes' own checking.
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
    kit.particles({ cols: 20, rows: 6 }, kit.presets.snow({ cols: 20, rows: 6, colors: "ocean" })),
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
