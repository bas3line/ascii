/*
 * donut: the spinning donut in one line. spinning() puts a 3D shape in a
 * group that tumbles once round in 6 seconds, and plays it as a scene.
 */
import { spinning, torus } from "../../src/kit/index.ts";

export default spinning(torus({ color: "#f97316" }));
