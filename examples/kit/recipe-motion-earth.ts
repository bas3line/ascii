/*
 * earth: a blue world with continents turning on a tipped axis, and a moon
 * going round it, in front and behind. planet() is two spheres in a scene().
 */
import { planet } from "../../src/kit/recipes/motion.ts";

export default planet({ type: "earth", moon: true });
