/*
 * crystal: a shape of your own from six corners and eight faces, a long
 * octahedron, turning on a turntable. Each face is flat and lit as one, and
 * colours by light carry its brightest faces on to a pale highlight.
 */
import { mesh, scene, type Vec3 } from "../../src/kit/shapes3d.ts";

const corners: Vec3[] = [[0, 1.6, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, -1.6, 0]];
const faces = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]];

export default scene({ name: "crystal", cols: 32, rows: 20, period: 6, colorBy: "light", camera: { tilt: 0.3, distance: 9 } }, [
  mesh(corners, faces, { spin: [0, 1, 0], color: "#22d3ee" }),
]);
