/*
 * sea: a swell rolling past, side on. The function draws the water's surface
 * itself with at.char, a / where it rises, a \ where it falls and a ~ along
 * the crests and troughs, and below it rows of water that roll and darken
 * with depth, shaded through a ramp of wave characters and dithered. Above
 * the water it returns null, so nothing is drawn there on any page. invert
 * is off, so on a light page the foam is dark ink, as an ink drawing of
 * waves would have it. The formula is the point here; a sea with no maths is
 * sea() or waves(), as in recipe-looks-sea.ts.
 */
import { TAU } from "../../src/kit/core.ts";
import { field } from "../../src/kit/field.ts";

export default field(
  { name: "sea", note: "a swell rolling past, foam on the crests", ramp: " .-~=≈", dither: true, invert: false, period: 4,
    colors: { light: ["#93c5fd", "#1d4ed8", "#0b1f4d"], dark: ["#0b2a5b", "#1f7ae0", "#e0f7ff"] } },
  (x, y, t, at) => {
    const w = TAU * at.phase, sea = (x: number) => -0.3 + 0.13 * Math.sin(x * 4 - w) + 0.04 * Math.sin(x * 9 - 2 * w + 1);
    const d = y - sea(x), row = at.height / at.rows; // how far below the surface, and a row's height
    if (d < -row / 2) return null;
    if (d < row / 2) {
      const slope = (sea(x + 0.01) - sea(x - 0.01)) / 0.02; // y runs down, so the surface rises where this is below 0
      return (at.char = slope < -0.45 ? "/" : slope > 0.45 ? "\\" : "~"), 1;
    }
    return 0.3 + 0.5 * Math.exp(-d * 2) + 0.2 * Math.sin(y * 16 - x * 1.5 - 2 * w);
  },
);
