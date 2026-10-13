/*
 * marquee: a ticker. Its items slide in from the right and come to rest with
 * as many as fit whole, then scroll past 8 cells a second, round and round
 * while it is in view.
 */
import { marquee } from "../../src/markdown/index.ts";

export default marquee(`"markdown components" "drawn in text" "npx ascii.rest add markdown"`);
