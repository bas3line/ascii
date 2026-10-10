// node --test src/kit/recipes/palettes.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { INK, Palette, isHex, snapshot } from "../core.ts";
import { field } from "../field.ts";
import { picture, shape, sky, water } from "../materials.ts";
import { particles, presets } from "../particles.ts";
import { banner } from "../../banner.ts";
import { palette, schemeOf, schemes, type SchemeName } from "./palettes.ts";

const names = Object.keys(schemes) as SchemeName[];

test("the palettes the looks promise are all there, each a list for a light page and one for a dark page", () => {
  for (const want of ["ocean", "sunset", "neon", "fire", "aurora", "forest", "candy", "mono", "ink", "paper", "github"]) assert.ok(names.includes(want as SchemeName), want);
  for (const n of names) {
    const { light, dark } = schemes[n];
    assert.ok(light.length >= 1 && light.length === dark.length, `${n}: as many colours for each page`);
    for (const c of [...light, ...dark]) assert.ok(isHex(c), `${n}: ${c}`);
    // Each is a palette the kit's core takes as it is.
    new Palette(palette(n));
  }
  assert.deepEqual(palette("ink"), { light: [INK.light], dark: [INK.dark] });
});

// Relative luminance, 0 (black) to 1 (white), as WCAG measures it.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test("faint to strong: on a dark page the strongest colour is the brightest, on a light page the deepest", () => {
  for (const n of names) {
    if (n === "ink") continue;
    const { light, dark } = schemes[n];
    assert.ok(luminance(dark.at(-1)!) > luminance(dark[0]), `${n} dark`);
    assert.ok(luminance(light.at(-1)!) < luminance(light[0]), `${n} light`);
    // The strongest ink reads on its page: dark enough on white, bright enough on GitHub's dark ground.
    assert.ok(luminance(light.at(-1)!) < 0.2, `${n}: the light page's strongest colour is too pale`);
    assert.ok(luminance(dark.at(-1)!) > 0.2, `${n}: the dark page's strongest colour is too dim`);
  }
});

test("palette() gives a copy, so changing it changes nothing else", () => {
  const a = palette("ocean");
  (a.light as string[])[0] = "#000000";
  assert.notEqual(palette("ocean").light[0], "#000000");
  assert.notEqual(schemes.ocean.light[0], "#000000");
});

test("palette() and schemeOf() throw, naming the palettes, for anything else", () => {
  assert.throws(() => palette("oceans"), /palette\(\) takes a palette's name, one of ocean, sunset, .* not "oceans"/);
  assert.throws(() => palette(3 as unknown as string), /not 3/);
  assert.throws(() => schemeOf("x", "blue"), /x takes a palette's name/);
  assert.throws(() => schemeOf("x", []), /1 to 32 colours/);
  assert.throws(() => schemeOf("x", ["#fff"]), /1 to 32 colours/);
  assert.throws(() => schemeOf("x", { light: ["#ffffff"], dark: [] }), /\{ light, dark \}/);
  assert.throws(() => schemeOf("x", 7), /x takes a palette's name/);
});

test("schemeOf() takes a name, one colour, a list, or { light, dark }", () => {
  assert.deepEqual(schemeOf("x", "#ff0000"), { light: ["#ff0000"], dark: ["#ff0000"] });
  assert.deepEqual(schemeOf("x", ["#ff0000", "#00ff00"]), { light: ["#ff0000", "#00ff00"], dark: ["#ff0000", "#00ff00"] });
  assert.deepEqual(schemeOf("x", { light: ["#111111"], dark: ["#eeeeee"] }), { light: ["#111111"], dark: ["#eeeeee"] });
  assert.deepEqual(schemeOf("x", "neon"), palette("neon"));
});

test("one name colours anything in the kit that takes colours: a field, a material, particles and a banner", () => {
  const f = field({ cols: 20, rows: 6, colors: palette("ocean") }, (x) => 0.5 + 0.5 * x);
  assert.ok(f.meta.palette!.includes(schemes.ocean.dark.at(-1)!));
  const glass = picture([shape(sky(), water({ colors: palette("sunset") }))], { cols: 20, rows: 6 });
  assert.ok(snapshot(glass, 1).text.trim().length > 0);
  const snow = particles({ cols: 20, rows: 6 }, presets.snow({ cols: 20, rows: 6 }).map((s) => ({ ...s, colors: palette("ice") })));
  assert.ok(snow.meta.palette!.length > 0);
  const sign = banner("hi", { color: palette("candy") });
  assert.ok(sign.meta.palette!.includes(schemes.candy.dark[0]));
});
