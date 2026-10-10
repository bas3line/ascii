/*
 * world: four regions on the earth piece's map, sfo the one you are at. The
 * land resolves out of static from the west, the pins drop in with a ring
 * closing on each and the key types beside them; then a route flies from
 * sfo to sin and from iad to fra, and sfo beacons, every 2 seconds while it
 * is in view.
 */
import { world } from "../../src/markdown/world.ts";

export default world(
  `
  sfo "us west"
  iad "us east"
  fra "eu central"
  sin "asia"
  route sfo sin
  route iad fra
  `,
  { title: "regions", here: "sfo" },
);
