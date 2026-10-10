/*
 * hello: a banner sliding in from the left and landing with a bounce, held
 * for 2 seconds, then sliding in again.
 */
import { banner } from "../../src/banner.ts";
import { slideIn } from "../../src/kit/index.ts";

export default slideIn(banner("hello", { effect: "still", color: ["#58a6ff", "#bc8cff"] }), { ease: "bouncy" });
