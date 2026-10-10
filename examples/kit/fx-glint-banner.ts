/*
 * glint-banner: a still banner() in a fade from orange to pink, with a glint
 * crossing it every 4 seconds, lit in a lighter tint of each letter's own
 * colour. No options: across its 83 columns the glint takes about 2.4 seconds,
 * so it sweeps rather than flickers.
 */
import { banner } from "../../src/banner.ts";
import { glint } from "../../src/kit/fx.ts";

export default glint(banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] }));
