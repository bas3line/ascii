/*
 * wake up: the digital rain behind a banner. behind() lays any piece over a
 * look, centred, so a look is a backdrop in one word.
 */
import { banner } from "../../src/banner.ts";
import { matrix } from "../../src/kit/recipes/looks.ts";

export default matrix().behind(banner("wake up", { effect: "still", font: "slim" }));
