/*
 * slow neon plasma: the demo-scene effect by name, in the neon palette, at
 * half speed. On a light page the ramp and the colours turn round by
 * themselves, so bright still reads as bright.
 */
import { plasma } from "../../src/kit/recipes/looks.ts";

export default plasma({ palette: "neon", speed: "slow" });
