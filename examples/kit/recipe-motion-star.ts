/*
 * star: a gold star springing up from nothing, wobbling as it settles, held,
 * then springing up again.
 */
import { star } from "../../src/kit/materials.ts";
import { growIn } from "../../src/kit/recipes/motion.ts";

export default growIn(star(), { ease: "springy", seconds: 1.5 });
