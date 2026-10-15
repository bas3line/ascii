/*
 * cube: a cube tumbling on two axes, each face flat and lit as one in its own
 * character and shade of orange, its twelve edges drawn as lines with + at
 * the corners, so it reads as a box even in one ink. It starts turned, so the
 * still frame shows three faces. One shape.
 */
import { cube, scene } from "../../src/kit/shapes3d.ts";

export default scene({ name: "cube", cols: 40, rows: 20, period: 8, ambient: 0.15 }, cube({ rotate: [-0.6, 0.7, 0], spin: [0.8, 1.6, 0], color: "#f97316" }));
