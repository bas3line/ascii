/*
 * glint-banner: a still banner() in a fade from orange to pink, with a glint
 * crossing it in 2 seconds, every 3, lit in a lighter tint of each letter's
 * own colour.
 */
import { banner } from "../../src/banner.ts";
import { glint } from "../../src/kit/fx.ts";

export default glint(banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] }), { every: 3, sweep: 2 });
