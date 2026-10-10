/*
 * compass: placing by words in a drawing of your own. ring() spaces the eight
 * points round the dial from the top, at() finds its middle, and the needle
 * goes round once in 8 seconds: phase() is how far into its turn it is.
 */
import { piece } from "../../src/kit/core.ts";
import { label, ray } from "../../src/kit/draw.ts";
import { phase } from "../../src/kit/math.ts";
import { at, ring } from "../../src/kit/recipes/widgets.ts";

export default piece({ name: "compass", cols: 31, rows: 15, loop: 8 }, (t, s) => {
  ring(s, 8).forEach((point, i) => label(s, ...point, ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][i]));
  ray(s, ...at(s), 9, phase(t, 8));
});
