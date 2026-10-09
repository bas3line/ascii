/*
 * sea: a swell rolling past, side on, foam on the crests and the water
 * darkening with depth, in block characters dithered so the depth shades
 * smoothly. Above the water the function returns null: nothing is drawn
 * there on any page. invert is off, so on a light page the crests are dark
 * ink, as an ink drawing of waves would have them.
 */
import { field } from "../../src/kit/field.ts";

export default field(
  { name: "sea", note: "a swell rolling past, foam on the crests", ramp: "blocks", dither: true, invert: false, period: 4,
    colors: { light: ["#bfdbfe", "#1d4ed8", "#0b1f4d"], dark: ["#0b3d91", "#1f7ae0", "#e0f7ff"] } },
  (x, y, t) => {
    const d = y + 0.3 + 0.22 * Math.sin(x * 2 - (Math.PI * t) / 2) + 0.08 * Math.sin(x * 5 + Math.PI * t);
    return d < 0 ? null : 1 - Math.min(0.7, d * 0.45) + 0.08 * Math.sin(x * 7 + y * 4 - Math.PI * t);
  },
);
