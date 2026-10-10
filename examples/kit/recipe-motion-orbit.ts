/*
 * orbit: a star going round a banner, in front of it below and behind it
 * above. Flat things orbit flat, the circle squashed to look round.
 */
import { banner } from "../../src/banner.ts";
import { orbiting } from "../../src/kit/index.ts";

export default orbiting("*", { around: banner("sun", { effect: "still", color: "#f59e0b" }) });
