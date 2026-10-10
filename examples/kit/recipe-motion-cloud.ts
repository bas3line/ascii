/*
 * cloud: a cloud drifting right across a night sky of twinkling stars, off
 * one edge and back in at the other. The sky is a part, a shape filled with a
 * material; the cloud is an area in its own material.
 */
import { cloud, shape, sky, starfield } from "../../src/kit/materials.ts";
import { drifting } from "../../src/kit/recipes/motion.ts";

export default drifting(cloud(), { across: shape(sky(), starfield()), lane: "top" });
