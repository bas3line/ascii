/*
 * glitch-logo: the library's rust logo breaking up for a moment every 2.5
 * seconds, bands of rows sliding and cells turning to junk, its own glint
 * still crossing it. One loop of both is 5 seconds.
 */
import * as rust from "../../src/pieces/rust.ts";
import { glitch } from "../../src/kit/fx.ts";

export default glitch(rust);
