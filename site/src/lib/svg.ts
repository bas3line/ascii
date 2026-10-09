/*
 * A logo as an animated SVG, for places that run no script, like a GitHub
 * README: one loop of the piece's own glint or scan, written by svg() from
 * ascii.rest/svg, which anyone can call for any piece. Light pages get the
 * palette's light half, dark pages the dark half.
 */
import type { PieceName } from "ascii.rest";
import { load } from "ascii.rest";
import { svg as draw } from "ascii.rest/svg";

/** The categories that loop with a fixed period, and the option that sets it. */
const LOOPS: Record<string, string> = { logos: "shine", companies: "shine", distros: "scan" };
const START = 0.5; // the pieces' first pass, in seconds

/** Whether a piece of this category and these options has a README SVG. */
export const looping = (category: string, options?: Record<string, unknown>) =>
  category in LOOPS && typeof options?.[LOOPS[category]] === "number" && (options[LOOPS[category]] as number) > 0;

/**
 * One loop of such a piece: its period in seconds and the time it starts. A second of still, then the pass, then
 * still again: the loop starts and ends between passes. The README SVG and the downloads both play this loop.
 */
export function loop(category: string, options?: Record<string, unknown>) {
  if (!looping(category, options)) return null;
  const every = options![LOOPS[category]] as number;
  return { every, from: START + every - 1 };
}

export async function svg(slug: PieceName, dark: boolean): Promise<string> {
  const piece = await load[slug]();
  const { meta } = piece;
  const span = loop(meta.category, meta.options);
  if (!span || !meta.palette) throw new Error(`svg: ${slug} does not loop`);
  const { every, from } = span;
  const frame = piece.default(meta.options);
  const color = new Uint8Array(meta.cols * meta.rows);
  const at = (t: number) => (frame(t, { paper: !dark, color }), color.slice());
  const inked = (a: Uint8Array, b: Uint8Array) => a.every((v, i) => v === b[i]);
  // The pass must come round every `every` seconds. Its colours show where it is; a distro's scan scrambles the letters
  // under it with noise that differs from pass to pass, so the letters are not compared.
  if (![0.37, 1.53, 2.21].every((x) => inked(at(from + x), at(from + x + every)))) throw new Error(`svg: ${slug} does not repeat every ${every} s`);
  return draw(piece, { dark });
}
