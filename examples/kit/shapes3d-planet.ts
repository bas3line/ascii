/*
 * planet: a banded gas giant turning on a tipped axis, and a pale moon going
 * round it on a tilted orbit, passing in front of it and hidden behind it by
 * the depth buffer. Two spheres and a texture by name: no maths.
 */
import { orbit, scene, sphere } from "../../src/kit/shapes3d.ts";

export default scene({ name: "planet", cols: 64, rows: 24, period: 6, ambient: 0.1, camera: { distance: 10 } }, [
  sphere({ radius: 1.5, rotate: [0, 0, 0.25], spin: [0, 0.5, 0], color: "#f59e0b", texture: "bands" }),
  sphere({ radius: 0.35, color: "#d1d5db", at: orbit({ radius: 2.6, period: 6, tilt: 0.3 }) }),
]);
