/*
 * typing: a line that types itself, then keeps changing its word. Each quoted
 * word holds while a glint crosses it and the cursor blinks, is erased and
 * the next typed, round and round while it is in view.
 */
import { typing } from "../../src/markdown/index.ts";

export default typing(`ascii.rest draws "scenes" "banners" "components"`);
