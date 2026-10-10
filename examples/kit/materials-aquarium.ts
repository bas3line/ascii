/*
 * aquarium: a glass tank of water, sand on the floor, seaweed waving, a
 * goldfish swimming back and forth and bubbles rising. Every part is placed
 * within the water, so the tank can be any size.
 */
import { box, bubbles, emit, fish, glass, grass, ground, inside, picture, sand, shape, water } from "../../src/kit/materials.ts";

const tank = box({ ratio: 1.4, size: "full" });
const sea = inside(tank, { fill: "full" });

export default picture([
  shape(tank, glass()),
  shape(sea, water({ colors: "sea", texture: 0.3 })),
  shape(ground({ within: sea, size: 0.7 }), grass({ kind: "seaweed", density: 0.25 })),
  shape(ground({ within: sea, rows: 2 }), sand()),
  shape(fish({ within: sea, rows: 5 }), { move: "swim" }),
  emit(bubbles(), { inside: sea }),
], { name: "aquarium", cols: 48, rows: 18 });
