/*
 * glass of water: a tumbler, water to half way with a gentle swell, and
 * bubbles rising through it. No coordinates and no maths: a cup, what is in
 * it, and what it is made of.
 */
import { bubbles, cup, emit, glass, inside, picture, shape, water } from "../../src/kit/materials.ts";

const tumbler = cup();
const drink = inside(tumbler, { fill: "half" });

export default picture(
  [shape(tumbler, glass()), shape(drink, water()), emit(bubbles(), { inside: drink })],
  { name: "glass of water", cols: 32, rows: 16 },
);
