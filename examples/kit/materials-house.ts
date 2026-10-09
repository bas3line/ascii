/*
 * house at night: a house on a lawn under a starry sky, a moon, a cloud
 * drifting by, lamplight glowing in the windows and smoke curling from the
 * chimney. house() has parts, so the windows, the door and the chimney are
 * each an area to fill or to send something up from.
 */
import { cloud, emit, ground, grass, house, moon, neon, picture, shape, sky, smoke, starfield, wood } from "../../src/kit/materials.ts";

const lawn = ground();
const home = house({ on: lawn, size: "medium" });

export default picture([
  shape(sky(), starfield()),
  shape(moon({ x: -6, y: 1 })),
  shape(cloud({ x: -12, y: 2, size: "tiny" }), { move: "drift" }),
  shape(home),
  shape(home.windows, neon({ colors: "lamp", char: "▒" })),
  shape(home.door, wood()),
  emit(smoke(), { from: home.chimney }),
  shape(lawn, grass()),
], { name: "house at night", cols: 64, rows: 24 });
