/*
 * heartbeat: a heart beating, two quick beats and a rest. heart() is an area
 * from materials; pulsing() draws it in its own material and swells it.
 */
import { heart, pulsing } from "../../src/kit/index.ts";

export default pulsing(heart(), { beat: "heart" });
