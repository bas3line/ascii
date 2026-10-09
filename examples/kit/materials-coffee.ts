/*
 * coffee: a mug of coffee, steam curling up off it. The coffee is drawn
 * first and the mug over it: the mug is opaque, so the coffee shows only at
 * its open mouth, as it would. inside() knows to fill the body, not the
 * handle, and the steam rises from the mouth.
 */
import { emit, inside, mug, picture, shape, steam, water } from "../../src/kit/materials.ts";

const cup = mug();

export default picture([
  shape(inside(cup, { fill: "brim" }), water({ colors: "coffee" })),
  shape(cup),
  emit(steam(), { from: cup }),
], { name: "coffee", cols: 32, rows: 16 });
