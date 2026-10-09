/*
 * chain-banner: effects one after another. A still banner() in bands of
 * rainbow colour, swaying in a wave: each effect takes the piece the last one
 * made, and the loop is worked out from both, 6 seconds.
 */
import { banner } from "../../src/banner.ts";
import { chain, rainbow, wave } from "../../src/kit/fx.ts";

export default chain(banner("hello", { effect: "still" }), (p) => rainbow(p), (p) => wave(p));
