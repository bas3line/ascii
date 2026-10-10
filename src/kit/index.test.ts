// node --test src/kit/index.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as kit from "./index.ts";

// Every module's values, so a new export can't be left out of ascii.rest/kit. glyphs.ts is image's data, not API.
const modules = ["core", "math", "draw", "field", "shapes3d", "particles", "fx", "compose", "image", "materials", "vector"];

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
