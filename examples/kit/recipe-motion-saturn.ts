/*
 * saturn: a banded giant with a ring round it, tipped toward you, turning on
 * its axis. planet() is a sphere and a torus in a scene().
 */
import { planet } from "../../src/kit/recipes/motion.ts";

export default planet({ rings: true, name: "saturn" });
