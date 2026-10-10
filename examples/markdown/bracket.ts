/*
 * bracket: four of banner's fonts in a knockout. The names type in, each round
 * draws on to the next names, the winners' lines heavy; then a glint runs the
 * champion's line every 6 seconds while it is in view.
 */
import { bracket } from "../../src/markdown/bracket.ts";

export default bracket(
  `block slim round bold
block round
block`,
  { title: "best font" },
);
