/*
 * plasma: the demo-scene effect in one call. Four sine waves, one of them
 * rings round a wandering centre, summed and folded through one more sine,
 * coloured by value from indigo up to amber in 8 steps. Every term turns a
 * whole number of times in 8 seconds, so it loops exactly.
 */
import { TAU } from "../../src/kit/core.ts";
import { field } from "../../src/kit/field.ts";

export default field(
  { name: "plasma", note: "soft interference blobs, coloured by brightness", cols: 64, rows: 22, fps: 24, period: 8, range: [-1, 1], steps: 8,
    colors: { light: ["#1e1b4b", "#5b21b6", "#a21caf", "#be123c", "#b45309"], dark: ["#1e1b4b", "#5b21b6", "#c026d3", "#fb7185", "#fde68a"] } },
  (x, y, t) => {
    const a = (TAU * t) / 8;
    const v = Math.sin(x * 3 + a) + Math.sin(y * 4 - 2 * a) + Math.sin((x + y) * 2.5 + 3 * a) +
      Math.sin(Math.hypot(x - Math.sin(a), y - 0.5 * Math.cos(2 * a)) * 6 - 4 * a);
    return Math.sin(v * 1.3);
  },
);
