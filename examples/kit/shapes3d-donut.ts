/*
 * donut: donut.c's spinning torus in one line of the kit. A torus spins on
 * two axes, lit from the upper left and fitted so it never clips. The period
 * rounds its spins to exactly two turns and one in 8 seconds, donut.c's own
 * pair, so svg() plays one seamless loop.
 */
import { scene, torus } from "../../src/kit/shapes3d.ts";

export default scene({ name: "donut", cols: 40, rows: 22, period: 8 }, [torus({ spin: [1.6, 0, 0.8] })]);
