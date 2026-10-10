/*
 * flame: a render's profile from folded stacks. The root grows from the left,
 * then each level rises on it, its blocks widening; paint, the hottest leaf,
 * is marked and named on the bottom edge. Then it holds.
 */
import { flame } from "../../src/markdown/index.ts";

export default flame(
  `main;parse;lex 4
main;parse 6
main;draw;layout 12
main;draw;paint 18
main;draw 4
main;flush 4`,
  { title: "render, 48 ms", unit: "ms" },
);
