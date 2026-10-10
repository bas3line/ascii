/*
 * sunset over the waves: a sun cut off at the horizon by above(), waves kept
 * to the bottom by below(), the two added into one look in sunset colours.
 * Shapes by share of the picture, not by coordinates.
 */
import { above, below, sun, waves } from "../../src/kit/index.ts";

export default sun({ palette: "sunset" })
  .mask(above(0.55))
  .add(waves({ speed: 0.5 }).mask(below(0.45)));
