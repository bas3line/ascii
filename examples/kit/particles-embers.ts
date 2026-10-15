/*
 * embers: sparks rising off a fire, a particle system written out by hand
 * with no preset: born along a line, thrown up and a little out, slowed by
 * the air, swaying as they climb and cooling from yellow to red as they age.
 * The fire itself is three glyph lines along the bottom.
 */
import { particles } from "../../src/kit/particles.ts";

export default particles({ name: "embers", note: "sparks rising off a fire, swaying and cooling", cols: 48, rows: 20, period: 4 }, [
  {
    emitter: { line: [[16, 17], [32, 17]] },
    rate: 18, life: [2, 3.5], speed: [8, 16], angle: [-1.9, -1.25], drag: 0.6, gravity: -1,
    sway: { amount: 1.2, speed: 0.5 }, glyphs: "*+'.", colors: ["#f59e0b", "#f97316", "#dc2626", "#991b1b"],
  },
  { emitter: { line: [[15, 19], [33, 19]] }, rate: 200, life: 0.3, speed: 0, glyphs: "▓▒", colors: ["#ea580c", "#9a3412"] },
  { emitter: { line: [[17, 18], [31, 18]] }, rate: 120, life: 0.25, speed: 0, glyphs: "▲^", colors: ["#f59e0b", "#f97316"] },
]);
