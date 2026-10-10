/*
 * orrery: a sun, a planet going round it on a drawn path, and a moon going
 * round the planet as the planet goes round the sun. The planet and its moon
 * are a group(), so the moon's orbit travels with the planet: motion inside
 * motion, with no maths beyond a circle for the path.
 */
import { group, lines, orbit, scene, sphere } from "../../src/kit/shapes3d.ts";

const circle = Array.from({ length: 73 }, (_, i) => [4 * Math.cos((i / 72) * 2 * Math.PI), 0, 4 * Math.sin((i / 72) * 2 * Math.PI)]);

export default scene({ name: "orrery", cols: 64, rows: 24, period: 8, camera: { tilt: 0.6, distance: 14 } }, [
  sphere({ radius: 1.4, color: "#fbbf24" }),
  lines(circle, { color: "#64748b" }),
  group([sphere({ radius: 0.6, color: "#3b82f6" }), sphere({ radius: 0.2, color: "#e5e7eb", at: orbit({ radius: 1.1, period: 2 }) })], {
    at: orbit({ radius: 4, period: 8 }),
  }),
]);
