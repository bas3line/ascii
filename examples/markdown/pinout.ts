/*
 * pinout: the 555 timer. Its body draws, its pins grow out in number order,
 * then a pulse runs out along the out pin's wire every 1.2 seconds while it is
 * in view.
 */
import { pinout } from "../../src/markdown/index.ts";

export default pinout(
  `gnd vcc
trig dis
out thr
reset ctrl`,
  { title: "ne555", pulse: "out" },
);
