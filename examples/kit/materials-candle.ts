/*
 * candle: a wax candle, a wick on it and a flame on the wick, flickering in
 * a soft glow, and a thin line of smoke curling up off the flame. on: stands
 * each part on the one below and from: sends the smoke up from the flame,
 * so nothing is placed by hand.
 */
import { box, ceramic, emit, fire, flame, picture, shape, smoke, solid } from "../../src/kit/materials.ts";

const wax = box({ at: "bottom", cols: 10, rows: 9 });
const wick = box({ on: wax, cols: 1, rows: 1 });
const tip = flame({ on: wick, cols: 9, rows: 11 });

export default picture([
  shape(wax, ceramic({ colors: "wax" })),
  shape(wick, solid({ char: "|" })),
  shape(tip, fire({ colors: "candle", glow: 1 })),
  emit(smoke({ spread: 0.15, wind: 0.1 }), { from: tip }),
], { name: "candle", cols: 30, rows: 28 });
