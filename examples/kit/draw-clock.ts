/*
 * clock: a clock face drawn by hand with draw's shapes, placed by words. A
 * rounded frame with a title, a circle whose outline picks its own slope
 * characters round the middle at() gives, the hours on the points ring() spaces
 * round it from the top, and the hands as ray()s, each pointing a fraction of
 * the way round. It shows ten past ten, a watchmaker's favourite, and the
 * second hand goes round once a minute of play time: phase(t, 60). The same
 * clock in one call is clockFace(), in recipe-widget-clock.ts.
 */
import { at, circle, label, phase, piece, ray, rect, ring } from "../../src/kit/index.ts";

const palette = { light: ["#1f2328", "#cf222e", "#8c959f"], dark: ["#f0f6fc", "#ff7b72", "#6e7681"] };

export default piece({ name: "clock", cols: 41, rows: 21, fps: 4, loop: 60, palette }, (t, s) => {
  const [x, y] = at(s);
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "clock", color: 2 });
  circle(s, x, y, 18, { char: "auto", color: 2 });
  ring(s, 12, { radius: 15 }).forEach((point, hour) => label(s, ...point, hour || 12));
  ray(s, x, y, 7, 10 / 12); // the hour hand, at ten
  ray(s, x, y, 11, 2 / 12); // the minute hand, ten past
  ray(s, x, y, 13, phase(t, 60), { color: 1 }); // the second hand, once round a minute
  s.set(x, y, "o", 1);
});
