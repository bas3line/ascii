/*
 * logos: three of the library's logos, three seconds each, dissolving into
 * one another in patches and round again. Each logo glints on its own clock,
 * which starts when it first shows; their colours share one palette.
 */
import { sequence } from "../../src/kit/compose.ts";
import { go, python, rust } from "../../src/pieces/index.ts";

export default sequence([rust, go, python], { seconds: 3 });
