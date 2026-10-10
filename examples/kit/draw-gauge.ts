/*
 * gauge: a small dashboard, the kind of panel a terminal monitor shows. A
 * rounded frame split by a line down that joins it with ┬ and ┴; a dial of two
 * arc()s, a solid one for the reading over a shaded track, with the reading
 * in its middle by text() in a region; and the last 8 seconds of the same
 * reading as a braille plot in the panel beside it. The reading is two sines,
 * 8 and 2 seconds round, so it loops every 8 seconds.
 */
import { piece, TAU } from "../../src/kit/index.ts";
import { arc, braille, line, rect, text } from "../../src/kit/draw.ts";

const palette = { light: ["#1f2328", "#1a7f37", "#8c959f"], dark: ["#f0f6fc", "#3fb950", "#6e7681"] };
const load = (t: number) => 0.55 + 0.3 * Math.sin((TAU * t) / 8) + 0.12 * Math.sin((TAU * t) / 2);

export default piece({ name: "gauge", cols: 60, rows: 13, fps: 24, loop: 8, palette }, (t, s) => {
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "cpu", color: 2 });
  line(s, 23, 0, 23, s.rows - 1, { style: "single", color: 2 });
  const k = load(t);
  arc(s, 11.5, 7, 9, -0.375, 0.375, { char: "░", color: 2 });
  arc(s, 11.5, 7, 9, -0.375, -0.375 + 0.75 * k, { char: "█", color: 1 });
  text(s, { x: 1, y: 6, cols: 22, rows: 1 }, `${Math.round(k * 100)}%`, { align: "center" });
  const b = braille(s, { x: 24, y: 1, cols: 35, rows: 11 });
  b.plot(Array.from({ length: 70 }, (_, i) => load(t - 8 + (8 * i) / 69)), { y0: 0, y1: 1, color: 1 });
  b.draw();
});
