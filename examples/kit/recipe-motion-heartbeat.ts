/*
 * heartbeat: a heart beating, two quick beats and a rest. heart() is an area
 * from materials; pulsing() draws it in its own material and swells it.
 */
import { heart } from "../../src/kit/materials.ts";
import { pulsing } from "../../src/kit/recipes/motion.ts";

export default pulsing(heart(), { beat: "heart" });
