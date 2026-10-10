/*
 * boing: the Amiga's bouncing ball. A checkered ball on a tipped axis spins,
 * bounces every second and a half and drifts from side to side over a floor
 * grid of lines, drawn - | / and \ by their slope as they run away from the
 * camera. Its place is a function of t that repeats every 3 seconds, the
 * scene's period, so it loops.
 */
import { lines, scene, sphere, textures } from "../../src/kit/shapes3d.ts";

const steps = [-2, -1, 0, 1, 2];
const floor = lines([...steps.map((z) => [[-4, -1.6, z], [4, -1.6, z]]), ...[-4, -3, ...steps, 3, 4].map((x) => [[x, -1.6, -2], [x, -1.6, 2]])], { color: "#a855f7" });

export default scene({ name: "boing", cols: 64, rows: 24, period: 3, ambient: 0.25, camera: { tilt: 0.3 } }, [
  floor,
  sphere({ radius: 1.2, color: "#ef4444", texture: textures.checker(8, 4), rotate: [0, 0, 0.35], spin: 3,
    at: (t) => [2.4 * Math.sin((2 * Math.PI * t) / 3), 1.4 * Math.abs(Math.sin((Math.PI * t) / 1.5)) - 0.4, 0] }),
]);
