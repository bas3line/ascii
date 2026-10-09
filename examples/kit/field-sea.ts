/*
 * sea: a swell rolling past, side on, a line of foam on the crests and the
 * water darkening with depth, in block characters dithered so the depth
 * shades smoothly. d is how far below the surface a cell is; above the water
 * the function returns null, so nothing is drawn there on any page. invert
 * is off, so on a light page the foam is dark ink, as an ink drawing of waves
 * would have it.
 */
import { field } from "../../src/kit/field.ts";

export default field(
  { name: "sea", note: "a swell rolling past, foam on the crests", ramp: "blocks", dither: true, invert: false, period: 4,
    colors: { light: ["#bfdbfe", "#1d4ed8", "#0b1f4d"], dark: ["#0b3d91", "#1f7ae0", "#e0f7ff"] } },
  (x, y, t) => {
    const d = y + 0.3 + 0.22 * Math.sin(x * 2 - (Math.PI * t) / 2) + 0.08 * Math.sin(x * 5 + Math.PI * t);
    return d < 0 ? null : 0.62 + 0.38 * Math.exp(-d * 9) - 0.3 * Math.min(1, d * 0.8) + 0.08 * Math.sin(x * 7 + y * 4 - Math.PI * t);
  },
);
