/*
 * dissolve-donut: the library's donut, dissolving in and out through noise
 * every 6 seconds. The effect plays the piece and works on its frames, so
 * any piece takes it, untouched.
 */
import * as donut from "../../src/pieces/donut.ts";
import { dissolve } from "../../src/kit/fx.ts";

export default dissolve(donut);
