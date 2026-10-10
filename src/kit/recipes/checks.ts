/*
 * kit recipes, checks: the words every recipe takes in place of numbers, and
 * how they are checked, in one place so looks, motions and widgets read them
 * alike. A speed is "slow", "normal" or "fast" everywhere; an amount is
 * "subtle", "medium" or "strong"; a colour is #rrggbb, { light, dark } or a
 * palette's name. Not part of ascii.rest/kit's API: words.ts exports the types
 * and pieceOf() for recipes of your own.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 */
import { checkMeta, fail } from "../core.ts";
import type { Piece } from "../../types.ts";
import { ease as eases, type EaseName } from "../math.ts";
import type { Area, Part } from "../materials.ts";
import type { Shape3d } from "../shapes3d.ts";
import { schemes, type SchemeName } from "./palettes.ts";

// --- the words ----------------------------------------------------------------------------

/**
 * How fast something moves: "slow" (half as fast as normal), "normal", "fast" (twice as fast), or a number, times as
 * fast as normal: 2 is twice as fast, 0.5 half. Every recipe has its own normal and says it. `period` sets the seconds
 * of one loop yourself, over speed. A look can also be "still".
 */
export type Speed = "slow" | "normal" | "fast" | number;
/** How big a look's features are: "small", "medium" (the default), "large", "huge", or a number, 1 being medium. */
export type Scale = "small" | "medium" | "large" | "huge" | number;
/** How much: "subtle", "medium" or "strong", or a number. Each recipe says what its words stand for. */
export type Amount = "subtle" | "medium" | "strong" | number;
/** How many: "sparse", "normal", "dense", or a number, 1 being normal and 2 twice as many. */
export type Density = "sparse" | "normal" | "dense" | number;
/** A way across the picture, diagonals included. */
export type Heading = "left" | "right" | "up" | "down" | "up-left" | "up-right" | "down-left" | "down-right";
/** A way across the picture, straight. */
export type Toward = "left" | "right" | "up" | "down";
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

export const SPEEDS = { slow: 0.5, normal: 1, fast: 2 } as const;
export const SCALES = { small: 0.6, medium: 1, large: 1.6, huge: 2.5 } as const;
export const AMOUNTS = { subtle: 0.5, medium: 1, strong: 1.8 } as const;
export const DENSITIES = { sparse: 0.45, normal: 1, dense: 2 } as const;
export const HEADINGS: Readonly<Record<Heading, readonly [number, number]>> = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
  "up-left": [-Math.SQRT1_2, -Math.SQRT1_2], "up-right": [Math.SQRT1_2, -Math.SQRT1_2],
  "down-left": [-Math.SQRT1_2, Math.SQRT1_2], "down-right": [Math.SQRT1_2, Math.SQRT1_2],
};

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
// Words in quotes, as a sentence offers them.
const quoted = (words: readonly string[]) => or(words.map((w) => JSON.stringify(w)));
// Words as a list: "a, b and c".
const and = (words: readonly string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? ""));

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** An options object, checked for keys it does not take, so a typo throws instead of doing nothing. */
export function optionsOf<T extends object>(what: string, o: T | undefined, keys: readonly string[]): T {
  if (o === undefined) return {} as T;
  if (!isObject(o)) fail(`${what} takes its options as an object, such as { ${keys[0]}: ... }, not ${show(o)}`);
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
  if (!words.includes(v as W)) fail(`${what} takes ${quoted(words)}, not ${show(v)}`);
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
  if (typeof v === "string" && Object.hasOwn(words, v)) return words[v as W];
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
    fail(`${what} takes ${quoted(Object.keys(words))}, or a number${hi === Infinity ? ` of ${lo} or more` : ` from ${lo} to ${hi}`}, not ${show(v)}`);
  return v;
}

/** A whole number used as a seed, 1 by default. */
export function seedOf(what: string, v: unknown): number {
  if (v === undefined) return 1;
  if (!Number.isInteger(v)) fail(`${what}'s seed takes a whole number, such as 7, not ${show(v)}`);
  return v as number;
}

// --- speed ------------------------------------------------------------------------------

/** A speed as times as fast as normal: 0.5 for "slow", 1 for "normal", 2 for "fast", or the number given. With `still`, "still" is 0. */
export function speedOf(what: string, v: unknown, o: { still?: boolean } = {}): number {
  if (o.still) return sizeOf(`${what}'s speed`, v, { still: 0, ...SPEEDS }, "normal", 0, 100);
  return sizeOf(`${what}'s speed`, v, SPEEDS, "normal", 0.01, 100);
}

/** The seconds one loop takes at a speed, from the recipe's `normal` seconds: `period` wins when given. */
export function secondsOf(what: string, o: { speed?: unknown; period?: unknown }, normal: number): number {
  if (o.period !== undefined) return numberOf(`${what}'s period`, o.period, normal, 0.05, 60);
  // Rounded to hundredths, so loops of several motions come round together, as the kit's time rule counts them.
  return Math.max(0.05, Math.round((normal / speedOf(what, o.speed)) * 100) / 100);
}

/** An easing by its name, as a function from 0..1 to 0..1. */
export function easeOf(what: string, v: unknown, def: Easing): (k: number) => number {
  const name = v === undefined ? def : v;
  if (typeof name === "string" && Object.hasOwn(easings, name)) return eases[easings[name as keyof typeof easings]];
  if (typeof name === "string" && Object.hasOwn(eases, name)) return eases[name as EaseName];
  return fail(`${what} takes ${quoted(Object.keys(easings))}, or an easing's name from math such as "outCubic", not ${show(v)}`);
}

// --- colour -----------------------------------------------------------------------------

/**
 * One colour for each page from what a recipe's `color` takes: #rrggbb (the same on both), { light, dark }, or a
 * palette's name, which gives that palette's strong colour for each page: "ocean" is a deep blue on paper and a bright
 * one on a dark page. Undefined when none is given.
 */
export function colorOf(what: string, v: unknown): { light: string; dark: string } | undefined {
  if (v === undefined) return undefined;
  const hex = (c: unknown) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
  if (hex(v)) return { light: v as string, dark: v as string };
  if (typeof v === "string" && Object.hasOwn(schemes, v)) {
    const s = schemes[v as SchemeName];
    const strong = (list: readonly string[]) => list[Math.min(list.length - 1, Math.floor(list.length * 0.6))];
    return { light: strong(s.light), dark: strong(s.dark) };
  }
  const o = v as { light?: unknown; dark?: unknown };
  if (isObject(v) && hex(o.light) && hex(o.dark)) return { light: o.light as string, dark: o.dark as string };
  return fail(`${what} takes a colour as #rrggbb, { light, dark }, or a palette's name such as "ocean", not ${show(v)}`);
}

// --- things -------------------------------------------------------------------------------

/** True for an area such as heart(), cup() or area.rect(). */
export const isArea = (v: unknown): v is Area => isObject(v) && v.kind === "area" && typeof v.place === "function";
/** True for a part made with shape() or emit(). */
export const isPart = (v: unknown): v is Part => isObject(v) && v.kind === "part" && typeof v.setup === "function";
/** True for a piece: meta and a default function. */
export const isPiece = (v: unknown): v is Piece => isObject(v) && isObject(v.meta) && typeof v.default === "function";
/** True for a 3D shape made by torus(), sphere(), cube() and the rest: scene() says if it is not one after all. */
export const isShape3d = (v: unknown): v is Shape3d =>
  isObject(v) && typeof v.kind === "string" && v.kind !== "area" && v.kind !== "part" && v.kind !== "mask" && !("meta" in v) && !("src" in v);
/** True for a 3D shape or a list of them. */
export const is3d = (v: unknown): v is Shape3d | readonly Shape3d[] => isShape3d(v) || (Array.isArray(v) && v.length > 0 && v.every(isShape3d));

// --- naming -------------------------------------------------------------------------------

/** A piece under a name and a note of its own, everything else as it was. */
export function titled<P extends Piece>(p: P, name: string | undefined, note: string | undefined): P {
  if (name === undefined && note === undefined) return p;
  if (name !== undefined && (typeof name !== "string" || !name.trim())) fail(`a name takes one line of words, such as "hello", not ${show(name)}`);
  const n = name?.trim() ?? p.meta.name;
  return { ...p, meta: checkMeta({ ...p.meta, name: n, note: (note ?? n).slice(0, 72) }) };
}

// What every recipe takes for its name and note.
export const NAMING = ["name", "note"] as const;
