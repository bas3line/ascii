/*
 * rocket: a rocket of your own on the pad, engines lit, shaking under the
 * thrust. Nothing here is a ready-made shape: area.fit() draws the hull from
 * a few points, material() paints it, emission() blasts the exhaust out of
 * its nozzle, and a move of your own shakes it. The stars are the kit's.
 */
import { TAU } from "../../src/kit/core.ts";
import { area, box, emission, emit, ground, material, pattern, picture, shape, sky, starfield } from "../../src/kit/materials.ts";

const hull = area.fit([[0.5, 0], [0.78, 0.3], [0.78, 0.78], [1, 1], [0, 1], [0.22, 0.78], [0.22, 0.3]], { ratio: 0.45, size: 0.65, at: "bottom", y: -6 });
const paint = material((c) => c.edge || (c.v > 0.3 && c.v < 0.38 && Math.abs(c.u - 0.5) < 0.12 ? (c.u < 0.47 ? "(" : c.u > 0.53 ? ")" : "_") : c.v > 0.62 && c.v < 0.68 ? "=" : " "));
const blast = emission((p) => [p.x + (p.random(1) - 0.5) * p.age * 24, p.y + p.age * 12, "@%*+:."[Math.floor(p.k * 6)], 4 - Math.floor(p.k * 5)], { rate: 80, life: 0.5, birth: "bottom", colors: "fire" });

export default picture([
  shape(sky(), starfield()),
  shape(ground({ rows: 2 }), pattern("bricks")),
  emit(blast, { from: box({ within: hull, at: "bottom", cols: 4, rows: 1 }) }),
  shape(hull, paint, { move: (t) => [Math.sin(TAU * t * 4) > 0 ? 1 : 0, 0], period: 0.25 }),
], { name: "rocket", cols: 48, rows: 26 });
