/*
 * starfield: a seeded sky. scatter() spreads the stars evenly, twinkle() puts
 * each on its own beat, out of step with the rest, and a shooting star eases
 * across now and then with progress(), taking one of two paths that
 * random(cycle()) picks each time round. Everything comes round in 8 seconds.
 */
import { piece, ramps, shadeChar } from "../../src/kit/index.ts";
import { cycle, progress, random, scatter, twinkle } from "../../src/kit/math.ts";

const stars = scatter(110, { cols: 64, rows: 24 }, { seed: 7 });

export default piece({ name: "starfield", note: "seeded stars twinkling out of step, and a shooting star", cols: 64, rows: 24, loop: 8,
  palette: { light: ["#1f2328", "#0969da", "#9a6700"], dark: ["#f0f6fc", "#79c0ff", "#f2cc60"] } }, (t, s) => {
  for (const p of stars) s.set(p.x, p.y, shadeChar(ramps.stars, (0.4 + 0.6 * p.k) * twinkle(t, p.i)), p.k > 0.9 ? 2 : p.k > 0.75 ? 1 : 0);
  // the first second of every four: the head, then a tail of where it was a moment before
  const go = random(cycle(t, 4) % 2), x = go.int(4, 30), y = go.int(1, 8);
  for (let j = 0; j < 10; j++) {
    const k = progress(t - j * 0.02, { duration: 1, period: 4, ease: "outCubic" });
    if (k > 0 && k < 1) s.set(x + 30 * k, y + 9 * k, j ? (j < 5 ? "-" : ".") : "*", j ? 1 : 0);
  }
});
