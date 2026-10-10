/*
 * palettes: colours by name, each made twice, once for a light page and once
 * for a dark one, so a look reads on both without choosing colours. Every
 * palette runs from faint to strong: on a dark page from dim to bright, on a
 * light page from pale to deep, the way ink builds up on each. The names live
 * in the kit's core, so every option in the kit that takes colours takes them
 * as they are: a look's palette, field()'s colors, a material's or a particle
 * system's colors, a 3D shape's color, an effect's, a clip's. palette(name)
 * hands you the colours themselves, { light, dark }, for banner()'s color or
 * anything of your own.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { palette, plasma, torus } from "ascii.rest/kit";
 *   import { banner } from "ascii.rest/banner";
 *
 *   export default plasma({ palette: "neon" });
 *   export const ring = torus({ color: "ocean" });
 *   export const sign = banner("open", { color: palette("candy") });
 */
import { colorsOf, fail, materialColors, schemes, type PaletteLike, type PaletteSpec, type Scheme, type SchemeName } from "../core.ts";

export { schemes, type ColorLike, type ColorName, type PaletteLike, type Scheme, type SchemeName } from "../core.ts";

/**
 * The colours of a named palette for a light page and a dark one, faint to strong: { light, dark }. Any name the kit
 * knows: the looks' `schemes` and the materials' `materialColors`, the looks' first where both have it. Throws for a
 * name it does not know, offering the nearest.
 *
 *   banner("open", { color: palette("candy") })
 */
export function palette(name: SchemeName | (string & {})): Scheme & PaletteSpec {
  if (typeof name !== "string" || (!Object.hasOwn(schemes, name) && !Object.hasOwn(materialColors, name)))
    fail(`palette() takes a palette's name, one of ${Object.keys(schemes).join(", ")}, or a material's, not ${JSON.stringify(name)}`);
  return colorsOf(name, "palette()") as Scheme;
}

/**
 * Any palette a look takes as { light, dark }, faint to strong, checked: a name, one #rrggbb (the same on both pages),
 * a list of colours (the same on both pages), or { light, dark }. `what` names the option in an error.
 */
export function schemeOf(what: string, v: PaletteLike | unknown): Scheme {
  const spec = colorsOf(v, what);
  const s: Scheme = Array.isArray(spec) ? { light: spec, dark: spec } : (spec as Scheme);
  for (const list of [s.light, s.dark]) if (list.length > 32) fail(`${what} takes 1 to 32 colours for each page, not ${list.length}`);
  return s;
}
