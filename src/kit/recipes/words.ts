/*
 * kit recipes, words: what the recipes take in place of numbers. A speed is
 * "slow", "normal" or "fast" in every recipe; an amount is "subtle", "medium"
 * or "strong"; an easing is a name such as "smooth" or "bouncy"; a colour is
 * #rrggbb or a palette's name. A thing to show is anything the kit draws: a
 * piece, a block of text, a grid, a 3D shape, an area such as heart(), or
 * parts. Recipes of your own can share these: pieceOf() turns any thing into
 * a piece, and loopFor() works out a loop.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { pieceOf, spinning } from "ascii.rest/kit";
 *
 *   spinning(torus(), { speed: "slow" });
 *   pieceOf(heart());   // an area, drawn and cut to its size
 */
import type { Piece } from "../../types.ts";
import { Surface, asPiece, chained, checkMeta, fail, type KitPiece, type Source } from "../core.ts";
import { crop } from "../compose.ts";
import { picture, shape, type Area, type Part } from "../materials.ts";
import { scene, type Shape3d } from "../shapes3d.ts";
import { lcm } from "../math.ts";
import { is3d, isArea, isPart, isPiece, show } from "./checks.ts";

export { easings, type Amount, type Density, type Easing, type Heading, type Scale, type Speed, type Toward } from "./checks.ts";

/**
 * Anything the kit draws: a piece (a library piece, a banner(), anything the kit made), a block of text, a grid, a
 * 3D shape such as torus() or a list of them, an area such as heart() or cup(), or parts made with shape() and emit().
 */
export type Thing = Source | Shape3d | readonly Shape3d[] | Area | Part | readonly Part[];

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

// The room an area is drawn in before it is cut to its size: a picture's default, so a shape's "medium" is its usual size.
const ROOM = { cols: 64, rows: 24 };

/**
 * Any thing as a piece, to play, move or lay over another. A piece is itself; text and grids are stills of them; 3D
 * shapes are a scene() of them; an area is drawn with shape() in its own material (glass for a cup, fire for a flame)
 * and cut to the box it fills, a cell of room round it; parts are a picture() of them, 64 by 24. A piece file imported
 * whole, `import * as donut`, is its default export. Throws, saying what to pass, for anything else.
 *
 *   pieceOf(heart())                 // a heart, just its size
 *   pieceOf(torus({ spin: 1 }))      // a spinning donut, as a piece
 */
export function pieceOf(thing: Thing, what = "this"): KitPiece {
  // A module imported whole, as compose takes one.
  if (isObject(thing) && !isPiece(thing) && isPiece((thing as { default?: unknown }).default)) thing = (thing as unknown as { default: Piece }).default;
  if (typeof thing === "function") fail(`${what} takes a thing to show, not ${show(thing)}`);
  // Text is named by its first line, as compose names it.
  if (typeof thing === "string") return chained(asPiece(thing, thing.split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 40) ?? "text"));
  // A library piece chains too, as a copy with the kit's methods.
  if (thing instanceof Surface || isPiece(thing)) return chained(asPiece(thing as Source));
  if (isPart(thing)) return picture([thing]);
  if (Array.isArray(thing) && thing.length && thing.every(isPart)) return picture(thing as readonly Part[]);
  if (isArea(thing)) {
    // Drawn in a picture's room, then cut to the box it fills with a cell round it, so it moves as itself.
    const box = thing.place(ROOM.cols, ROOM.rows);
    const x0 = Math.max(0, Math.floor(box.x0) - 1), y0 = Math.max(0, Math.floor(box.y0) - 1);
    const x1 = Math.min(ROOM.cols, Math.ceil(box.x1) + 1), y1 = Math.min(ROOM.rows, Math.ceil(box.y1) + 1);
    const drawn = picture([shape(thing)], { name: "shape", ...ROOM });
    return x1 > x0 && y1 > y0 ? crop(drawn, { x: x0, y: y0, cols: x1 - x0, rows: y1 - y0 }) : drawn;
  }
  // Last, since areas and parts have a kind too.
  if (is3d(thing)) return scene({ name: "shapes" }, thing);
  return fail(`${what} takes a piece, text, a grid, a 3D shape such as torus(), an area such as heart(), or parts, not ${show(thing)}`);
}

/**
 * The loop of things played together, by the kit's time rule: the least common multiple of their periods when it is a
 * minute or less, else none. A still piece (fps 0) repeats on any period, and a piece that moves with no loop of its
 * own never repeats, so it gives none. Pass pieces and periods in seconds alike.
 */
export function loopFor(parts: readonly (Piece | number)[]): number | undefined {
  const periods: number[] = [];
  for (const p of parts) {
    if (typeof p === "number") periods.push(p);
    else if (p.meta.fps) {
      if (p.meta.loop === undefined) return undefined;
      periods.push(p.meta.loop);
    }
  }
  return periods.length ? lcm(periods) : undefined;
}

/**
 * A piece with its loop set to `loop` seconds, or left with none: for a layer() moved by a function of t, which knows
 * no period of its own. The piece plays as it did; only svg() and the players read the loop. A motion svg() would read
 * in its place (an effect's or a banner's) is left behind, so the loop is the one it plays.
 */
export function withLoop<P extends Piece>(p: P, loop: number | undefined): P & KitPiece {
  const { loop: _, ...meta } = p.meta;
  const { motion: __, ...rest } = p as P & { motion?: unknown };
  return chained({ ...rest, meta: checkMeta(loop === undefined ? meta : { ...meta, loop }) } as P);
}
