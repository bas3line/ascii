/*
 * palettes: colours by name, each made twice, once for a light page and once
 * for a dark one, so a look reads on both without choosing colours. Every
 * palette runs from faint to strong: on a dark page from dim to bright, on a
 * light page from pale to deep, the way ink builds up on each. palette(name)
 * gives { light, dark }, which anything in the kit that takes colours takes:
 * a look's palette, field()'s colors, a material's or a particle system's
 * colors, banner()'s color.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { palette, plasma } from "ascii.rest/kit";
 *   import { banner } from "ascii.rest/banner";
 *
 *   export default plasma({ palette: "neon" });
 *   export const sign = banner("open", { color: palette("candy") });
 */
import { INK, and, fail, isHex, type PaletteSpec } from "../core.ts";

/**
 * A palette for each page, faint to strong: `light` is drawn on a light page, `dark` on a dark one. The named ones have
 * as many colours in each, so a piece takes one as its palette as it is.
 */
export interface Scheme {
  readonly light: readonly string[];
  readonly dark: readonly string[];
}

/**
 * The named palettes. Each is a list of colours from faint to strong for a light page and for a dark one, and a look
 * spreads them along their fade to as many colours as it shades with.
 *
 * - ocean: deep navy to sea foam. sunset: violet through rose to gold. neon: violet, magenta and electric cyan.
 * - fire: embers to white heat. aurora: violet sky into green curtains. forest: moss to new leaves.
 * - candy: pink, lilac, mint and lemon. mono: greys. ink: GitHub's text colour, one colour on each page.
 * - paper: sepia, pencil and old paper. github: the contribution graph's greens.
 * - ice, gold, lava, matrix, night and space: for snow, suns, lamps, code rain, rain and galaxies.
 */
export const schemes = {
  ocean: {
    light: ["#7fb8d6", "#3a8fc4", "#0077b6", "#025a8c", "#023e6b", "#03045e"],
    dark: ["#0a1f5c", "#0353a4", "#0077b6", "#00b4d8", "#90e0ef", "#e0fbfc"],
  },
  sunset: {
    light: ["#f4a261", "#e76f51", "#c9184a", "#9d0b4a", "#6a0d6b", "#3b0f5c"],
    dark: ["#3b0f5c", "#7b2cbf", "#c9184a", "#ff6b35", "#ffb627", "#ffe8a3"],
  },
  neon: {
    light: ["#c77dff", "#9d4edd", "#e0218a", "#b5179e", "#7209b7", "#3a0ca3"],
    dark: ["#3c096c", "#7b2ff7", "#f107a3", "#ff5edf", "#00e5ff", "#e0ffff"],
  },
  fire: {
    light: ["#fbbf24", "#f59e0b", "#ea580c", "#c2410c", "#991b1b", "#5b0f0f"],
    dark: ["#4a0d02", "#991b1b", "#dc2626", "#f97316", "#facc15", "#fef9c3"],
  },
  aurora: {
    light: ["#a78bfa", "#7c3aed", "#0d9488", "#047857", "#065f46", "#064e3b"],
    dark: ["#312e81", "#0e7490", "#059669", "#22c55e", "#86efac", "#ecfdf5"],
  },
  forest: {
    light: ["#a3d9a5", "#4ade80", "#16a34a", "#15803d", "#166534", "#14532d"],
    dark: ["#052e16", "#14532d", "#15803d", "#22c55e", "#86efac", "#dcfce7"],
  },
  candy: {
    light: ["#f9a8d4", "#f472b6", "#db2777", "#a21caf", "#7e22ce", "#0e7490"],
    dark: ["#831843", "#db2777", "#f472b6", "#c084fc", "#67e8f9", "#fef08a"],
  },
  mono: {
    light: ["#d4d4d8", "#a1a1aa", "#71717a", "#3f3f46", "#18181b"],
    dark: ["#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#fafafa"],
  },
  ink: { light: [INK.light], dark: [INK.dark] },
  paper: {
    light: ["#d6c4a8", "#b08d62", "#8b6a43", "#5c4630", "#3b2a1d"],
    dark: ["#3f2d20", "#6b4f3a", "#a07850", "#d4b483", "#f3e3c3"],
  },
  github: {
    light: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  ice: {
    light: ["#7dd3fc", "#38bdf8", "#0284c7", "#075985", "#0c4a6e"],
    dark: ["#0c4a6e", "#0369a1", "#38bdf8", "#bae6fd", "#f0f9ff"],
  },
  gold: {
    light: ["#facc15", "#eab308", "#ca8a04", "#a16207", "#713f12"],
    dark: ["#713f12", "#ca8a04", "#facc15", "#fef08a", "#fffbeb"],
  },
  lava: {
    light: ["#fdba74", "#f97316", "#dc2626", "#991b1b", "#450a0a"],
    dark: ["#450a0a", "#991b1b", "#ef4444", "#f97316", "#fde047"],
  },
  matrix: {
    light: ["#86efac", "#4ade80", "#16a34a", "#15803d", "#14532d"],
    dark: ["#022c0f", "#15803d", "#22c55e", "#86efac", "#f0fdf4"],
  },
  night: {
    light: ["#93c5fd", "#60a5fa", "#2563eb", "#1e40af", "#172554"],
    dark: ["#1e293b", "#1e40af", "#3b82f6", "#93c5fd", "#f8fafc"],
  },
  space: {
    light: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#6d28d9", "#4338ca", "#1e1b4b"],
    dark: ["#2e1065", "#5b21b6", "#7c3aed", "#60a5fa", "#e0e7ff", "#fff7ed"],
  },
} as const satisfies Record<string, Scheme>;

/** The name of a palette in `schemes`: "ocean", "sunset", "neon", "fire", "aurora", "forest", "candy", "mono" and the rest. */
export type SchemeName = keyof typeof schemes;

/** What a look takes as its palette: a name, one colour as #rrggbb, colours of your own faint to strong, or { light, dark }. */
export type PaletteLike = SchemeName | (string & {}) | readonly string[] | Scheme;

/**
 * The colours of a named palette for a light page and a dark one, faint to strong: { light, dark }. Anything in the kit
 * that takes colours takes it, so one name colours a field, a material, a particle system or a banner. Throws for a
 * name it does not know, listing the ones it does.
 *
 *   field({ colors: palette("ocean") }, (x, y) => 0.5 + 0.5 * Math.sin(x * 6));
 */
export function palette(name: SchemeName | (string & {})): Scheme & PaletteSpec {
  if (typeof name !== "string" || !Object.hasOwn(schemes, name)) fail(`palette() takes a palette's name, one of ${and(Object.keys(schemes))}, not ${JSON.stringify(name)}`);
  const s = schemes[name as SchemeName];
  return { light: [...s.light], dark: [...s.dark] };
}

/**
 * Any palette a look takes as { light, dark }, faint to strong, checked: a name, one #rrggbb (the same on both pages),
 * a list of colours (the same on both pages), or { light, dark }. `what` names the option in an error.
 */
export function schemeOf(what: string, v: unknown): Scheme {
  if (typeof v === "string") {
    if (isHex(v)) return { light: [v], dark: [v] };
    if (Object.hasOwn(schemes, v)) return palette(v);
    fail(`${what} takes a palette's name, one of ${and(Object.keys(schemes))}, colours as #rrggbb, or { light, dark }, not ${JSON.stringify(v)}`);
  }
  if (Array.isArray(v)) {
    if (!v.length || v.length > 32 || !v.every(isHex)) fail(`${what} takes 1 to 32 colours as #rrggbb, faint to strong, not ${JSON.stringify(v)}`);
    return { light: [...v], dark: [...v] };
  }
  if (v !== null && typeof v === "object" && Array.isArray((v as Scheme).light) && Array.isArray((v as Scheme).dark)) {
    const { light, dark } = v as Scheme;
    for (const list of [light, dark])
      if (!list.length || list.length > 32 || !list.every(isHex)) fail(`${what} takes { light, dark }, each 1 to 32 colours as #rrggbb, not ${JSON.stringify(v)}`);
    return { light: [...light], dark: [...dark] };
  }
  return fail(`${what} takes a palette's name, one of ${and(Object.keys(schemes))}, colours as #rrggbb, or { light, dark }, not ${JSON.stringify(v)}`);
}
