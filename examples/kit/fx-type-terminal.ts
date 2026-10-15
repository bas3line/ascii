/*
 * type-terminal: three commands typed in behind a cursor, held for 2 seconds,
 * then typed again. Text is a source like any piece; without a name, it would
 * be named after its first line.
 */
import { typeIn } from "../../src/kit/fx.ts";

export default typeIn("$ npx ascii.rest donut\n$ npx ascii.rest banner hello\n$ npx ascii.rest add donut", { name: "terminal", hold: 2 });
