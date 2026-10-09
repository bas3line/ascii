/*
 * starfield: a seeded sky. scatter() spreads the stars evenly, twinkle() puts
 * each on its own beat, out of step with the rest, and every 4 seconds a
 * shooting star eases across with progress(): its head along one of two paths
 * that random(cycle()) picks each time round, its tail a cell apart behind it,
 * shortening as it slows. Everything comes round in 8 seconds.
 */
import { piece, ramps, shadeChar } from "../../src/kit/index.ts";
import { cycle, progress, random, scatter, twinkle } from "../../src/kit/math.ts";

const stars = scatter(110, { cols: 64, rows: 24 }, { seed: 7 });

export default piece({ name: "starfield", note: "seeded stars twinkling out of step, and a shooting star", cols: 64, rows: 24, loop: 8,
  palette: { light: ["#1f2328", "#0969da", "#9a6700"], dark: ["#f0f6fc", "#79c0ff", "#f2cc60"] } }, (t, s) => {
  for (const p of stars) s.set(p.x, p.y, shadeChar(ramps.stars, (0.4 + 0.6 * p.k) * twinkle(t, p.i)), p.k > 0.9 ? 2 : p.k > 0.75 ? 1 : 0);
  const go = random(cycle(t, 4) % 2), x = go.int(2, 22), y = go.int(1, 6), k = progress(t, { duration: 1.4, period: 4, ease: "outQuad" });
  // the tail first, its far end faintest, so the head is drawn over it
  for (let j = Math.round(14 * (1 - k)); k > 0 && k < 1 && j >= 0; j--) {
    const u = k - j / 36;
    if (u > 0) s.set(x + 36 * u, y + 11 * u, j ? "=-:."[Math.floor(j / 4)] : "*", j > 4 ? 1 : 0);
  }
});
