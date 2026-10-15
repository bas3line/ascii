/*
 * galaxy: a ready-made cloud of seeded stars on two spiral arms round a
 * bulge, turning, seen from above. Each star lights its cell and the stars in
 * a cell add up, so the core and the arms glow where they are densest, fading
 * from violet to pale pink with the light they gather. No maths.
 */
import { points, scene } from "../../src/kit/shapes3d.ts";

export default scene({ name: "galaxy", cols: 64, rows: 24, period: 8, ramp: " .·:+*#@", colors: ["#6d28d9", "#f5d0fe"], camera: { tilt: 1 } }, [
  points("galaxy", { spin: [0, 0.5, 0] }),
]);
