/*
 * matrix: streams of glyphs falling, each with a flickering head and a trail
 * that fades behind it, in one line: the matrix preset, which is a single
 * particle system whose glyph function picks each trail cell's character.
 */
import { particles, presets } from "../../src/kit/particles.ts";

export default particles({ name: "matrix", note: "streams of glyphs falling, bright at the head", period: 4 }, presets.matrix);
