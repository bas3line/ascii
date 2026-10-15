/*
 * tv: an old television on a wooden floor, showing the library's donut.
 * texture() makes any piece a material, so a screen, a window or a sign can
 * play one: here the donut turns behind the glass of a rounded screen.
 */
import * as donut from "../../src/pieces/donut.ts";
import { area, box, ceramic, glass, ground, picture, shape, solid, texture, wood } from "../../src/kit/materials.ts";

const set = box({ cols: 50, rows: 26, at: "bottom", y: -3 });
const screen = area.fit((u, v) => ((u - 0.5) / 0.5) ** 4 + ((v - 0.5) / 0.5) ** 4 <= 1, { within: set, cols: 42, rows: 22 });

export default picture([
  shape(set, ceramic()),
  shape(screen, texture(donut)),
  shape(screen, glass()),
  shape(area.path([[26, 3.5], [21, 0]]), solid({ char: "\\" })),
  shape(area.path([[38, 3.5], [43, 0]]), solid({ char: "/" })),
  shape(ground({ rows: 3 }), wood({ grain: "planks" })),
], { name: "tv", cols: 64, rows: 33 });
