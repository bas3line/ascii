/*
 * window: a field as one part of a drawing. drawField() shades a lit ball
 * into a region of a piece() grid, inside a frame and over a caption written
 * as text. Off the ball the square root is NaN, so nothing is drawn there,
 * and the ramp has no space, so the whole ball shows, its dark side too.
 */
import { TAU, gradient, piece } from "../../src/kit/core.ts";
import { drawField } from "../../src/kit/field.ts";

const colors = gradient(["#312e81", "#db2777", "#fbbf24"], 12);
export default piece({ name: "window", note: "a lit ball in a framed window", cols: 40, rows: 14, fps: 24, loop: TAU, palette: ["#8b949e", ...colors] }, (t, s) => {
  s.write(0, 0, `┌${"─".repeat(38)}┐\n${`│${" ".repeat(38)}│\n`.repeat(11)}└${"─".repeat(38)}┘`, 0);
  // The ball's surface faces x, y, z; the light goes round it once every TAU seconds, as the moon's phases do.
  drawField(s, (x, y, t, at) => x * Math.sin(t) - 0.4 * y + Math.cos(t) * Math.sqrt(1 - at.r * at.r), t,
    { region: { x: 1, y: 1, cols: 38, rows: 11 }, colors, ramp: ".:-=+*#%@" });
  s.write(2, 13, "drawField(s, ball, t, { region })", 0);
});
