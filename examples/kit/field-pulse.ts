/*
 * pulse: a heartbeat of light. A ring and its fainter echo run out from the
 * centre and fade, while the centre swells and settles, once every two
 * seconds. Everything comes from at.r, the distance from the centre, which
 * the field works out for every cell so a ring comes out round, and from
 * at.phase, how far through the beat the frame is. Held still, for reduced
 * motion, it shows the ring a third of the way out.
 */
import { TAU } from "../../src/kit/core.ts";
import { field } from "../../src/kit/field.ts";

export default field(
  { name: "pulse", note: "a ring of light beating out from the centre", period: 2, still: 0.6, invert: false,
    colors: { light: ["#fda4af", "#e11d48", "#881337"], dark: ["#881337", "#f43f5e", "#ffe4e6"] } },
  (x, y, t, at) => {
    const k = at.phase, d = at.r - k * 1.6; // how far through the beat, and from the ring
    const ring = Math.exp(-((d * 7) ** 2)) + 0.5 * Math.exp(-(((d + 0.35) * 9) ** 2));
    return ring * (1 - k) + Math.exp(-at.r * 6) * (0.6 + 0.4 * Math.cos(TAU * k));
  },
);
