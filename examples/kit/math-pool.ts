/*
 * pool: light on the floor of a swimming pool. noise() is asked for cells
 * about 10 columns across that change shape and come round every 4 seconds;
 * it is 0 on the walls between cells, where the light gathers. A wider,
 * smooth noise, on the same 4 second loop, sways where each cell reads from,
 * so the walls bend like light through moving water. The value is turned
 * round and sharpened, then shaded through a ramp and a blue gradient.
 */
import { gradient, piece, ramps, shadeChar } from "../../src/kit/index.ts";
import { noise } from "../../src/kit/math.ts";

const floor = noise({ kind: "cells", size: 10, period: 4 }), swell = noise({ size: 24, period: 4, range: [-2.5, 2.5] });

export default piece({ name: "pool", note: "light on a pool floor from cellular noise, looping", cols: 64, rows: 24, loop: 4,
  palette: { light: gradient(["#9ec5fe", "#0a58ca"], 6), dark: gradient(["#0c2d6b", "#cae8ff"], 6) } }, (t, s) => {
  for (let y = 0; y < s.rows; y++)
    for (let x = 0; x < s.cols; x++) {
      const w = swell(x, y, t), v = (1 - floor(x + w, y + w / 2, t)) ** 4;
      s.set(x, y, shadeChar(ramps.standard, v), Math.floor(v * 5.99));
    }
});
