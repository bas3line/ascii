/*
 * candle: a wax candle with a flame standing on it, flickering, and a thin
 * line of smoke curling up off the flame. on: puts the flame on the candle
 * and from: sends the smoke up from the flame, so nothing is placed by hand.
 */
import { box, ceramic, emit, fire, flame, picture, shape, smoke } from "../../src/kit/materials.ts";

const wax = box({ at: "bottom", cols: 8, rows: 9 });
const tip = flame({ on: wax, cols: 5, rows: 7 });

export default picture([
  shape(wax, ceramic({ colors: "wax" })),
  shape(tip, fire({ colors: "candle" })),
  emit(smoke({ spread: 0.15, wind: 0.1 }), { from: tip }),
], { name: "candle", cols: 30, rows: 24 });
