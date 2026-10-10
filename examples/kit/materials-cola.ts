/*
 * cola: a glass of cola with fizz rising, two chunks of ice bobbing at the
 * top and a striped straw. The straw is drawn first, so the cola bends it
 * where it goes under, as a real drink does.
 */
import { box, bubbles, cup, emit, glass, ice, inside, picture, shape, straw, water } from "../../src/kit/materials.ts";

const tumbler = cup();
const cola = inside(tumbler, { fill: "high" });

export default picture([
  shape(straw({ within: tumbler })),
  shape(tumbler, glass()),
  shape(cola, water({ colors: "cola", texture: 0.3 })),
  emit(bubbles({ colors: "fizz", rate: 5 }), { inside: cola }),
  shape(box({ within: cola, at: "top-left", x: 2, y: -1, size: 0.3 }), ice(), { move: "bob" }),
  shape(box({ within: cola, at: "top-right", x: -2, size: 0.3 }), ice({ seed: 2 }), { move: "bob", period: 2 }),
], { name: "cola", cols: 36, rows: 20 });
