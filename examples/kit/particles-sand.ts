/*
 * sand: a banner() that crumbles. Every cell of the word is a particle born
 * on it (emitter: { text }), drawn as its own character while it holds still,
 * each for its own moment (hold), then falling as grains that land on the
 * floor and settle (bounciness). It repeats every 6 seconds.
 */
import { banner } from "../../src/banner.ts";
import { particles } from "../../src/kit/particles.ts";

export default particles({ name: "sand", note: "a word that crumbles to sand and settles", period: 6 }, {
  emitter: { text: banner("ascii", { effect: "still", shadow: "none" }) }, burst: { every: 6 }, life: 6, hold: [0.8, 3.5],
  direction: "down", spread: 70, speed: [1, 4], gravity: 18, bounds: { x: "die", y: "bounce" }, bounciness: 0.3,
  glyph: (p) => (p.age < p.hold ? p.char : p.vy === 0 ? "_" : ".:'"[p.id % 3]),
  colors: { light: ["#92400e", "#b45309", "#d97706"], dark: ["#fde68a", "#f59e0b", "#b45309"] },
});
