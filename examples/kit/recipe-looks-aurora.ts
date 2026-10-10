/*
 * northern lights: curtains of aurora hanging over a sparse sky of stars,
 * two looks added together. The aurora's palette colours both.
 */
import { aurora, stars } from "../../src/kit/recipes/looks.ts";

export default aurora().add(stars({ density: "sparse" }));
