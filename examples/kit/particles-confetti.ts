/*
 * confetti: two party poppers fired from the bottom corners. Each piece is
 * thrown up and in, slowed by the air, flutters as it falls, bounces a little
 * where it lands and settles on the floor (bounciness). Each takes its own
 * colour and shape from its id, out of the piece's palette. It repeats every
 * 5 seconds, from 1.2 seconds after the poppers fire (first: -1.2), so its
 * first frame, the one svg() holds for reduced motion, is the sky full of it.
 */
import { type System, particles } from "../../src/kit/particles.ts";

const popper = (emitter: System["emitter"], direction: System["direction"]): System => ({
  emitter, direction, burst: { every: 5, count: 90, first: -1.2 }, spread: 50, speed: [40, 80], drag: 1.2, gravity: 20, sway: 1, life: 5,
  bounds: { x: "bounce", y: "bounce" }, bounciness: 0.35, glyph: (p) => "▪▫◆◇▴"[p.id % 5], color: (p) => (p.id * 7) % 5,
});

const palette = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#d946ef"];
export default particles({ name: "confetti", note: "party poppers fired from both corners", period: 5, palette },
  [popper({ point: "bottom-left" }, "up-right"), popper({ point: "bottom-right" }, "up-left")]);
