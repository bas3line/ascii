/*
 * type-terminal: three commands typed in behind a cursor, held for 2 seconds,
 * then typed again. Text is a source like any piece.
 */
import { typeIn } from "../../src/kit/fx.ts";

export default typeIn("$ npx ascii.rest donut\n$ npx ascii.rest banner hello\n$ npx ascii.rest add donut", { hold: 2 });
