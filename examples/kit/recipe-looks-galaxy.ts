/*
 * a galaxy turning: a two-armed spiral round a bright core, with a scatter of
 * stars twinkling in front of it.
 */
import { galaxy, stars } from "../../src/kit/recipes/looks.ts";

export default galaxy().add(stars({ density: "sparse" }));
