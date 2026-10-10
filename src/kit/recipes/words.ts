/*
 * kit recipes, words: what the recipes take in place of numbers, and how they
 * check it. A speed is "slow", "normal" or "fast"; an easing is a name such as
 * "smooth" or "bouncy"; a thing to show is anything the kit draws: a piece, a
 * block of text, a grid, a 3D shape, an area such as heart(), or parts. The
 * recipes in motion.ts and widgets.ts share these, and so can recipes of your
 * own: pieceOf() turns any thing into a piece, and loopFor() works out a loop.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { pieceOf, spinning } from "ascii.rest/kit";
 *
 *   spinning(torus(), { speed: "slow", ease: "smooth" });
 *   pieceOf(heart());   // an area, drawn and cut to its size
 */
import type { Piece } from "../../types.ts";
import { Surface, and, asPiece, checkMeta, fail, type KitPiece, type Source } from "../core.ts";
import { crop } from "../compose.ts";
import { ease as eases, lcm, type EaseName } from "../math.ts";
import { picture, shape, type Area, type Part } from "../materials.ts";
import { scene, type Shape3d } from "../shapes3d.ts";

// --- checking what a recipe is given ----------------------------------------------------

/** A value as an error shows it: a string in quotes, a function by its name, anything else as it reads. */
export function show(v: unknown): string {
  if (typeof v === "function") return v.name ? `${v.name}, a function: call it, ${v.name}()` : "a function";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(show).join(", ")}]`;
  if (v !== null && typeof v === "object") {
    try {
      return JSON.stringify(v) ?? String(v);
    } catch {
      return "an object";
    }
  }
  return String(v);
}

// Words as a sentence offers them: "a, b or c".
export const or = (words: readonly string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words.at(-1)}` : (words[0] ?? ""));

/** An options object, checked for keys it does not take, so a typo throws instead of doing nothing. */
export function optionsOf<T extends object>(what: string, o: T | undefined, keys: readonly string[]): T {
  if (o === undefined) return {} as T;
  if (o === null || typeof o !== "object" || Array.isArray(o)) fail(`${what} takes its options as an object, such as { ${keys[0]}: ... }, not ${show(o)}`);
  for (const [k, v] of Object.entries(o)) if (v !== undefined && !keys.includes(k)) fail(`${what} has no option ${JSON.stringify(k)}: it takes ${and(keys)}`);
  return o;
}

/** A number from lo to hi, or its default. */
export function numberOf(what: string, v: unknown, def: number, lo = -Infinity, hi = Infinity): number {
  if (v === undefined) return def;
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
    fail(`${what} takes a number${hi === Infinity ? (lo === -Infinity ? "" : ` of ${lo} or more`) : ` from ${lo} to ${hi}`}, not ${show(v)}`);
  return v;
}

/** A whole number from lo to hi, or its default. */
export function wholeOf(what: string, v: unknown, def: number, lo: number, hi = Infinity): number {
  if (v === undefined) return def;
  if (!Number.isInteger(v) || (v as number) < lo || (v as number) > hi)
    fail(`${what} takes a whole number ${hi === Infinity ? `of ${lo} or more` : `from ${lo} to ${hi}`}, not ${show(v)}`);
  return v as number;
}

/** One of a list of words, or its default. */
export function wordOf<W extends string>(what: string, v: unknown, words: readonly W[], def: W): W {
  if (v === undefined) return def;
  if (!words.includes(v as W)) fail(`${what} takes ${or(words.map((w) => JSON.stringify(w)))}, not ${show(v)}`);
  return v as W;
}

/** True or false, or its default. */
export function boolOf(what: string, v: unknown, def: boolean): boolean {
  if (v === undefined) return def;
  if (typeof v !== "boolean") fail(`${what} takes true or false, not ${show(v)}`);
  return v;
}

/** A word that stands for a number, as `{ low: 1, high: 4 }` does for a height, or a number from lo to hi itself. */
export function sizeOf<W extends string>(what: string, v: unknown, words: Readonly<Record<W, number>>, def: NoInfer<W> | number, lo = 0, hi = Infinity): number {
  if (v === undefined) return typeof def === "number" ? def : words[def];
  if (typeof v === "string") {
    if (!Object.hasOwn(words, v)) fail(`${what} takes ${or(Object.keys(words).map((w) => JSON.stringify(w)))}, or a number, not ${show(v)}`);
    return words[v as W];
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
    fail(`${what} takes ${or(Object.keys(words).map((w) => JSON.stringify(w)))}, or a number${hi === Infinity ? ` of ${lo} or more` : ` from ${lo} to ${hi}`}, not ${show(v)}`);
  return v;
}

// --- speed ------------------------------------------------------------------------------

/**
 * How fast something moves: "slow" (half as fast as normal), "normal", "fast" (twice as fast), or a number, times as
 * fast as normal: 2 is twice as fast, 0.5 half. Every motion has its own normal: a spin turns once in 6 seconds, a
 * bounce lands every 1.2. `period` sets the seconds of one loop yourself, over speed.
 */
export type Speed = "slow" | "normal" | "fast" | number;

const SPEEDS = { slow: 0.5, normal: 1, fast: 2 } as const;

/** A speed as times as fast as normal: 0.5 for "slow", 1 for "normal", 2 for "fast", or the number given. */
export function speedOf(what: string, v: unknown): number {
  return sizeOf(`${what}'s speed`, v, SPEEDS, "normal", 0.01, 100);
}

/** The seconds one loop takes at a speed, from the motion's `normal` seconds: `period` wins when given. */
export function secondsOf(what: string, o: { speed?: Speed; period?: number }, normal: number): number {
  if (o.period !== undefined) return numberOf(`${what}'s period`, o.period, normal, 0.05, 60);
  // Rounded to hundredths, so loops of several motions come round together, as the kit's time rule counts them.
  return Math.max(0.05, Math.round((normal / speedOf(what, o.speed)) * 100) / 100);
}

// --- easing -----------------------------------------------------------------------------

/**
 * How a move starts and stops, by name: "steady" (the same speed all the way), "smooth" (gentle at both ends),
 * "snappy" (quick, overshooting a little and settling), "springy" (overshooting and wobbling) or "bouncy" (landing
 * and bouncing), or any of math's easings by name, such as "outCubic".
 */
export type Easing = "steady" | "smooth" | "snappy" | "springy" | "bouncy" | EaseName;

/** The easing each plain word stands for. */
export const easings: Readonly<Record<"steady" | "smooth" | "snappy" | "springy" | "bouncy", EaseName>> = Object.freeze({
  steady: "linear",
  smooth: "inOutSine",
  snappy: "outBack",
  springy: "outElastic",
  bouncy: "outBounce",
});

/** An easing by its name, as a function from 0..1 to 0..1. */
export function easeOf(what: string, v: unknown, def: Easing): (k: number) => number {
  const name = v === undefined ? def : v;
  if (typeof name === "string" && Object.hasOwn(easings, name)) return eases[easings[name as keyof typeof easings]];
  if (typeof name === "string" && Object.hasOwn(eases, name)) return eases[name as EaseName];
  return fail(`${what} takes ${or(Object.keys(easings).map((w) => JSON.stringify(w)))}, or an easing's name from math such as "outCubic", not ${show(v)}`);
}

// --- things to show ---------------------------------------------------------------------

/**
 * Anything the kit draws: a piece (a library piece, a banner(), anything the kit made), a block of text, a grid, a
 * 3D shape such as torus() or a list of them, an area such as heart() or cup(), or parts made with shape() and emit().
 */
export type Thing = Source | Shape3d | readonly Shape3d[] | Area | Part | readonly Part[];

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const isPiece = (v: unknown): v is Piece => isObject(v) && isObject(v.meta) && typeof v.default === "function";
/** True for an area such as heart(), cup() or area.rect(). */
export const isArea = (v: unknown): v is Area => isObject(v) && v.kind === "area" && typeof v.place === "function";
/** True for a part made with shape() or emit(). */
export const isPart = (v: unknown): v is Part => isObject(v) && v.kind === "part" && typeof v.setup === "function";
/** True for a 3D shape made by torus(), sphere(), cube() and the rest: scene() says if it is not one after all. */
export const isShape3d = (v: unknown): v is Shape3d =>
  isObject(v) && typeof v.kind === "string" && v.kind !== "area" && v.kind !== "part" && !("meta" in v) && !("src" in v);
/** True for a 3D shape or a list of them. */
export const is3d = (v: unknown): v is Shape3d | readonly Shape3d[] => isShape3d(v) || (Array.isArray(v) && v.length > 0 && v.every(isShape3d));

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
export function pieceOf(thing: Thing, what = "this"): KitPiece | Piece {
  // A module imported whole, as compose takes one.
  if (isObject(thing) && !isPiece(thing) && isPiece((thing as { default?: unknown }).default)) thing = (thing as unknown as { default: Piece }).default;
  if (typeof thing === "function") fail(`${what} takes a thing to show, not ${show(thing)}`);
  // Text is named by its first line, as compose names it.
  if (typeof thing === "string") return asPiece(thing, thing.split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 40) ?? "text");
  if (thing instanceof Surface || isPiece(thing)) return asPiece(thing as Source);
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

// --- loops ------------------------------------------------------------------------------

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
export function withLoop<P extends Piece>(p: P, loop: number | undefined): P {
  const { loop: _, ...meta } = p.meta;
  const { motion: __, ...rest } = p as P & { motion?: unknown };
  return { ...rest, meta: checkMeta(loop === undefined ? meta : { ...meta, loop }) } as P;
}

/** A piece under a name and a note of its own, everything else as it was. */
export function titled<P extends Piece>(p: P, name: string | undefined, note: string | undefined): P {
  if (name === undefined && note === undefined) return p;
  if (name !== undefined && (typeof name !== "string" || !name.trim())) fail(`a name takes one line of words, such as "hello", not ${show(name)}`);
  const n = name?.trim() ?? p.meta.name;
  return { ...p, meta: checkMeta({ ...p.meta, name: n, note: (note ?? n).slice(0, 72) }) };
}

// What every recipe takes for its name and note.
export const NAMING = ["name", "note"] as const;
