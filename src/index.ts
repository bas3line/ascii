/*
 * ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 * mount plays a piece in an element; load fetches any piece by
 * name. The pieces themselves are in "ascii.rest/pieces", React in
 * "ascii.rest/react", the <ascii-art> tag in "ascii.rest/element" and the
 * Astro component in "ascii.rest/astro".
 */
export { mount, type MountOptions } from "./mount.ts";
export { canvas, isPiece, load, names, type PieceName } from "./library.ts";
export type { Category, Env, Frame, Meta, Options, Piece } from "./types.ts";
