/*
 * orbit: a moon going round a planet, drawn with piece() and nothing else:
 * one write and one set a frame. It loops every 4 seconds, so svg() plays
 * exactly one turn. This is the long way, angles and all, to show piece();
 * with no maths it is orbiting("@", { around: planet }), as in
 * recipe-motion-orbit.ts.
 */
import { piece, TAU } from "../../src/kit/index.ts";

export default piece(
  { name: "orbit", cols: 40, rows: 13, fps: 24, loop: 4, palette: { light: ["#1f2328", "#b45309"], dark: ["#f0f6fc", "#fbbf24"] } },
  (t, s) => {
    const a = (TAU * t) / 4;
    s.write(17, 5, " .--.\n(    )\n '--'");
    // behind the planet for the far half of the turn
    if (Math.sin(a) > 0 || Math.abs(Math.cos(a)) > 0.3) s.set(20 + 17 * Math.cos(a), 6 + 5 * Math.sin(a), "@", 1);
  },
);
