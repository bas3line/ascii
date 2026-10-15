/*
 * candle: a flame swaying from its base as if in a draught. flame() is an area
 * that brings its own fire, which flickers by itself; swaying() leans it.
 */
import { flame, swaying } from "../../src/kit/index.ts";

export default swaying(flame());
