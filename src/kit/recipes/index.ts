/*
 * ascii.rest/kit/recipes: whole things in one line, with no maths. Looks you
 * ask for by name (sea(), plasma(), aurora()), motions in words (spinning(),
 * bouncing(), floating()), widgets in one call (clockFace(), progressBar(),
 * gauge()) and placing by words (at(), ring(), across()). Every recipe is a
 * few lines over the kit's own parts, so read one to write your own. The same
 * names come from ascii.rest/kit, beside the parts they are made of.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { sea, spinning, clockFace } from "ascii.rest/kit/recipes";
 *   import { torus } from "ascii.rest/kit";
 *
 *   export default sea({ palette: "ocean" });
 *   export const donut = spinning(torus(), { speed: "slow" });
 *   export const clock = clockFace();
 */
export * from "./palettes.ts";
export * from "./words.ts";
export * from "./looks.ts";
export * from "./motion.ts";
export * from "./widgets.ts";
