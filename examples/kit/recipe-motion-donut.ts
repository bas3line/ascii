/*
 * donut: the spinning donut in one line. spinning() puts a 3D shape in a
 * group that tumbles once round in 6 seconds, and plays it as a scene.
 */
import { torus } from "../../src/kit/shapes3d.ts";
import { spinning } from "../../src/kit/recipes/motion.ts";

export default spinning(torus({ color: "#f97316" }));
