/*
 * moonlit: a whole scene from one function, the way a shader draws one. Above
 * the horizon it returns true for the moon (solid ink on any page) with
 * at.char shading it from a bright middle to a soft rim, sets at.char for
 * stars that twinkle, and returns null for the empty sky; below, waves that
 * grow as they come nearer, shaded and coloured by value, with the moon's
 * light broken across them in the moon's own colour (at.color).
 */
import { TAU, hash } from "../../src/kit/core.ts";
import { field } from "../../src/kit/field.ts";

const MOON = 6, STAR = 7; // the palette's colours, which come after the 6 spread from `colors`
export default field(
  { name: "moonlit", note: "a moon over the sea, its light broken on the waves", period: 4, fps: 24, invert: false, steps: 6, ramp: " .-~=≈",
    colors: { light: ["#bfdbfe", "#2563eb", "#172554"], dark: ["#172554", "#2563eb", "#bfdbfe"] }, palette: { light: ["#b45309", "#64748b"], dark: ["#fde68a", "#cbd5e1"] } },
  (x, y, t, at) => {
    const w = TAU * at.phase, near = y - 0.02, sky = near < 0.03, m = Math.hypot(x - 0.8, y + 0.5) / 0.26; // near: 0 at the horizon, 1 at the bottom
    if (sky && m < 1) return (at.char = "@%#*+=-:."[Math.floor(m * m * 9)]), (at.color = MOON), true;
    if (sky) return hash(at.col, at.row, 7) < 0.035 ? ((at.char = hash(at.col, at.row, 8 + Math.floor(at.phase * 8)) < 0.25 ? "*" : "."), (at.color = STAR), true) : null;
    const v = 0.5 + 0.5 * Math.sin(6 / near + 2 * Math.sin(x * 2 + w) - 2 * w);
    if (Math.abs(x - 0.8 + 0.06 * Math.sin(y * 40 + w)) < 0.05 + 0.3 * near && v > 0.45) at.color = MOON;
    return v * (0.35 + 0.65 * Math.min(1, near * 1.5));
  },
);
