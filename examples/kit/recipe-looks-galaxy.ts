/*
 * a galaxy turning: a two-armed spiral round a bright core, with a scatter of
 * stars twinkling in front of it.
 */
import { galaxy, stars } from "../../src/kit/index.ts";

export default galaxy().add(stars({ density: "sparse" }));
