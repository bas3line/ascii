// node scripts/kit/glyphs.ts [--check]
// Writes src/kit/glyphs.ts: the shapes ascii.rest/kit's image module picks
// characters by, measured by the site's own code (site/src/lib/glyphs.ts, IBM
// Plex Mono drawn with opentype.js and read back with sharp), so the library
// needs no font at runtime and draws the same characters /make/ does. Needs the
// site's dependencies: `npm ci` in site/ first. With --check it only says
// whether the committed file is still what the site's code gives.
import { readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const lib = resolve(root, "site/src/lib");
const out = resolve(root, "src/kit/glyphs.ts");

// The site's modules import each other without an extension, as its bundler allows; node wants one, so a relative
// import from the site's lib that doesn't resolve as written is tried again as .ts.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".") || /\.[a-z]+$/i.test(specifier) || !context.parentURL?.startsWith(pathToFileURL(lib).href)) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

interface Glyph {
  ch: string;
  v: number[];
}
// Loaded by path, so the root typecheck doesn't reach into the site and its dependencies.
const glyphs = (await import(pathToFileURL(resolve(lib, "glyphs.ts")).href)) as { glyphShapes(): Promise<Glyph[]> };
const logo = (await import(pathToFileURL(resolve(lib, "logo.ts")).href)) as { GX: number; GY: number; CW: number; CH: number; FILL: string; EDGE: string };
const shapes = await glyphs.glyphShapes();

const text = `/*
 * The shapes ascii.rest/kit's image module picks characters by, as /make/ does:
 * each character drawn in IBM Plex Mono on a cell of CW by CH pixels and its ink
 * measured in GX by GY blocks, row by row, scaled so the inkiest block of any of
 * them is 1. Made by scripts/kit/glyphs.ts with the site's own code
 * (site/src/lib/glyphs.ts), so the library needs no font: do not edit, run
 * \`node scripts/kit/glyphs.ts\` again.
 */

/** Blocks across and down a cell, in which a cell's ink is measured. */
export const GX = ${logo.GX};
export const GY = ${logo.GY};
/** The cell, in pixels, the shapes were measured on. */
export const CW = ${logo.CW};
export const CH = ${logo.CH};
/** What a solid cell is drawn with. */
export const FILL = ${JSON.stringify(logo.FILL)};
/** The characters an edge may be drawn with: no backtick, so a drawing can sit in a String.raw template. */
export const EDGE = ${JSON.stringify(logo.EDGE)};

/** A character, and its ink in each of the GX by GY blocks of its cell, 0 to 1. */
export interface Glyph {
  readonly ch: string;
  readonly v: readonly number[];
}

export const GLYPHS: readonly Glyph[] = [
${shapes.map((g) => `  { ch: ${JSON.stringify(g.ch)}, v: [${g.v.join(", ")}] },`).join("\n")}
];
`;

if (process.argv.includes("--check")) {
  let now = "";
  try {
    now = readFileSync(out, "utf8");
  } catch {}
  console.log(now === text ? `ok   ${out} is what the site's code gives` : `FAIL ${out} is not what the site's code gives: run node scripts/kit/glyphs.ts`);
  process.exit(now === text ? 0 : 1);
}
writeFileSync(out, text);
console.log(`wrote ${out}: ${shapes.length} glyphs, ${logo.GX} by ${logo.GY} blocks`);
