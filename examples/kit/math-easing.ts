/*
 * easing: eight of math's easings side by side, a dot for each running the
 * same track with tween(): from column 13 to 50 in two seconds, again every
 * three, so you can see what each one does: the back and the elastic
 * overshoot, the bounce bounces.
 */
import { piece } from "../../src/kit/index.ts";
import { tween } from "../../src/kit/math.ts";

const names = ["linear", "inOutSine", "outCubic", "inOutExpo", "inOutCirc", "outBack", "outElastic", "outBounce"] as const;

export default piece({ name: "easing", note: "eight easings racing the same track", cols: 64, rows: 17, loop: 3,
  palette: { light: ["#cf222e", "#57606a", "#d0d7de"], dark: ["#ff7b72", "#8b949e", "#30363d"] } }, (t, s) => {
  names.forEach((ease, i) => {
    s.write(0, 1 + 2 * i, ease.padStart(11), 1);
    s.write(13, 1 + 2 * i, "|" + "·".repeat(36) + "|", 2);
    s.set(tween(t, 13, 50, { duration: 2, period: 3, ease }), 1 + 2 * i, "●", 0);
  });
});
