/*
 * clock: a clock face drawn with draw's shapes and no maths. A rounded frame
 * with a title, a circle whose outline picks its own slope characters, the
 * hours placed round it with around() and label(), and the hands as ray()s,
 * each pointing a fraction of the way round: h / 12 for an hour, t / 60 for
 * the seconds. It shows ten past ten, a watchmaker's favourite, and the second
 * hand goes round once a minute of play time, not the real time: 60 seconds is
 * its loop.
 */
import { piece } from "../../src/kit/index.ts";
import { around, circle, label, ray, rect } from "../../src/kit/draw.ts";

const palette = { light: ["#1f2328", "#cf222e", "#8c959f"], dark: ["#f0f6fc", "#ff7b72", "#6e7681"] };

export default piece({ name: "clock", cols: 41, rows: 21, fps: 4, loop: 60, palette }, (t, s) => {
  const x = s.cols / 2, y = s.rows / 2;
  rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: "clock", color: 2 });
  circle(s, x, y, 18, { char: "auto", color: 2 });
  for (let h = 1; h <= 12; h++) label(s, ...around(s, x, y, 15, h / 12), h);
  ray(s, x, y, 7, 10 / 12); // the hour hand, at ten
  ray(s, x, y, 11, 2 / 12); // the minute hand, ten past
  ray(s, x, y, 13, t / 60, { color: 1 }); // the second hand, once round a minute
  s.set(x, y, "o", 1);
});
