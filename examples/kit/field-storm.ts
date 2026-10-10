/*
 * storm: a cyclone on a weather map, drawn by the way its wind blows. The
 * function sets at.char to the stroke, - \ | or /, nearest the wind's
 * direction at each cell, round the eye and a little inwards, something no
 * ramp can do. It draws more strokes where the wind is strong, in a ring
 * round the eye with gusts in it, returning null for the calm cells between,
 * and the strength picks the colour. The gusts turn with the storm, a whole
 * turn every 8 seconds, so it loops exactly.
 */
import { TAU, hash, valueNoise } from "../../src/kit/core.ts";
import { field } from "../../src/kit/field.ts";

export default field(
  { name: "storm", note: "a cyclone drawn by the way its wind blows", period: 8, fps: 24, invert: false, steps: 8,
    colors: { light: ["#94a3b8", "#0e7490", "#134e4a"], dark: ["#1e3a5f", "#22d3ee", "#ecfeff"] } },
  (x, y, t, at) => {
    const turn = at.a + TAU * at.phase, gust = valueNoise(3 * at.r * Math.cos(turn) + 9, 3 * at.r * Math.sin(turn) + 9, 4);
    const strength = Math.exp(-(((at.r - 0.55) * 2.2) ** 2)) * (0.45 + 0.75 * gust);
    if (hash(at.col, at.row, 5) > strength) return null;
    const way = at.a + Math.PI / 2 + 0.4; // round the eye, a little inwards
    at.char = "-\\|/"[((Math.round(way / (Math.PI / 4)) % 4) + 4) % 4];
    return strength;
  },
);
