/*
 * marquee: a ticker. Its items slide in from the right and come to rest with
 * as many as fit whole, then scroll past 8 cells a second, round and round
 * while it is in view.
 */
import { marquee } from "../../src/markdown/marquee.ts";

export default marquee(`"markdown figures" "a fence in, a picture out" "npx ascii.rest add markdown"`);
