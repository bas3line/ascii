/*
 * star: a gold star springing up from nothing, wobbling as it settles, held,
 * then springing up again.
 */
import { growIn, star } from "../../src/kit/index.ts";

export default growIn(star(), { ease: "springy", seconds: 1.5 });
