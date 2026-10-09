/*
 * sine: a sine and a cosine scrolling on the braille canvas, 2 by 4 dots a
 * cell, so the curves are smooth where whole characters would step. Each
 * curve is one plot(), which does the scaling: give it a function and the
 * span of x, and it fits the curve to the canvas. Both waves slide a quarter
 * of a wave a second, so it loops every 4 seconds.
 */
import { piece } from "../../src/kit/index.ts";
import { braille, rect } from "../../src/kit/draw.ts";

const palette = { light: ["#0969da", "#bf3989", "#8c959f"], dark: ["#58a6ff", "#f778ba", "#6e7681"] };

export default piece({ name: "sine", cols: 48, rows: 12, loop: 4, palette }, (t, s) => {
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "sin and cos", color: 2 });
  const b = braille(s, { x: 1, y: 1, cols: s.cols - 2, rows: s.rows - 2 });
  const k = (t * Math.PI) / 2; // a quarter of a wave a second
  b.line(0, b.height / 2, b.width, b.height / 2, 2); // the axis
  b.plot((x) => Math.sin(x - k), { x1: 12, color: 0 });
  b.plot((x) => Math.cos(x - k) / 2, { x1: 12, color: 1 });
  b.draw();
});
