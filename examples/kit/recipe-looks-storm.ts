/*
 * a storm: dark clouds drifting, rain blown to the left across them, both in
 * the night palette. add() lays one look's light on another's, and the rain
 * keeps its own streaks.
 */
import { clouds, rainfall } from "../../src/kit/recipes/looks.ts";

export default clouds({ palette: "night" }).add(rainfall({ wind: "left" }));
