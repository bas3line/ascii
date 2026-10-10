/*
 * coin: a banner turning like a coin on a table, narrowing to its edge and
 * showing its mirrored back. A flat thing given to spinning() spins this way.
 */
import { banner } from "../../src/banner.ts";
import { spinning } from "../../src/kit/recipes/motion.ts";

export default spinning(banner("ok", { effect: "still", color: "#eab308" }));
