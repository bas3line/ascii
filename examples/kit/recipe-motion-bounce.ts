/*
 * bounce: a banner bouncing on the ground, fast at the bottom and slow at the
 * top, its shadow narrowing as it rises.
 */
import { banner } from "../../src/banner.ts";
import { bouncing } from "../../src/kit/index.ts";

export default bouncing(banner("boing", { effect: "still", color: "#f778ba" }));
