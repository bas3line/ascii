/*
 * loader: 3D inside a piece of your own. render3d() draws a turning cube,
 * its faces in shaded blocks and its edges in lines, into the grid piece()
 * hands the drawing, and the drawing writes a label under it, in the empty
 * row fit leaves round the frame. scenePalette() gives the piece the cube's
 * shades, and the page's own text colour first for the label. The cube turns
 * once in 3 seconds and the dots count every 1.5, so it loops every 3.
 */
import { piece } from "../../src/kit/core.ts";
import { cube, render3d, scenePalette } from "../../src/kit/shapes3d.ts";

const box = cube({ spin: 2, color: "#38bdf8" });
const view = { period: 3, ambient: 0.2, ramp: "blocks", camera: { tilt: 0.75 } };

export default piece({ name: "loader", cols: 36, rows: 14, loop: 3, palette: scenePalette(box, view) }, (t, s) => {
  render3d(s, box, t, view);
  s.write(14, 13, "loading" + ".".repeat(Math.floor(t * 2) % 3));
});
