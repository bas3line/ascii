/*
 * HOT: plasma in fire colours masked by a word. A string given to mask() is
 * drawn in big letters, as large as fits, and the look fills them. A ramp
 * with no space in it draws every cell, so the letters stay whole where the
 * plasma is dark.
 */
import { plasma } from "../../src/kit/index.ts";

export default plasma({ palette: "fire", ramp: ".:-=+*#%@" }).mask("HOT");
