/*
 * hover: motions wrap each other. A cube turning on a turntable, floating up
 * and down as it turns.
 */
import { cube } from "../../src/kit/shapes3d.ts";
import { floating, spinning } from "../../src/kit/recipes/motion.ts";

export default floating(spinning(cube({ color: "#38bdf8" }), { way: "turntable" }), { height: "medium" });
