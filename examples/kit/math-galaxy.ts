/*
 * galaxy: two thousand seeded stars in two spiral arms, scattered with
 * random().normal(), and a camera() that turns them once every 16 seconds,
 * tips them toward you and fits them to the grid in perspective. Each cell
 * shades by how much starlight lands in it.
 */
import { piece, ramps, shadeChar } from "../../src/kit/index.ts";
import { camera, random, type Vec3 } from "../../src/kit/math.ts";

const rnd = random(3), view = camera({ cols: 64, rows: 24 }, { size: 2.6, turn: -16, tilt: 0.9 }), light = new Float32Array(64 * 24);
const stars = Array.from({ length: 2000 }, (): Vec3 => {
  const r = 2.6 * rnd() ** 1.15, a = rnd.int(0, 1) * Math.PI + r * 2.4 + rnd.normal(0, 0.25);
  return [r * Math.cos(a) + rnd.normal(0, 0.05), rnd.normal(0, 0.06), r * Math.sin(a) + rnd.normal(0, 0.05)];
});

export default piece({ name: "galaxy", note: "a spiral galaxy of seeded stars turning in perspective", cols: 64, rows: 24, loop: 16,
  palette: { light: ["#8250df", "#0969da", "#1f2328"], dark: ["#8957e5", "#79c0ff", "#ffffff"] } }, (t, s) => {
  for (const star of stars) { const v = view(star, t), i = v ? s.index(v.x, v.y) : -1; if (i >= 0) light[i] += 0.11; }
  // light adds up but the eye sees it level off: one star is a dot, a crowd is bright, the core is not one blob
  light.forEach((n, i) => n && s.put(i, shadeChar(ramps.standard, 1 - Math.exp(-n)).charCodeAt(0), s.resolve(n > 1.9 ? 2 : n > 0.6 ? 1 : 0)));
  light.fill(0);
});
