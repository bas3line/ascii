/*
 * let it snow: snow falling in three depths behind a banner. The banner's own
 * max keeps it inside the look's 64 columns.
 */
import { banner } from "../../src/banner.ts";
import { snowfall } from "../../src/kit/index.ts";

export default snowfall({ density: "dense" }).behind(banner("let it snow", { effect: "still", font: "slim", max: 60 }));
