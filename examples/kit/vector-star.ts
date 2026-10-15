/*
 * star: a five-pointed star from an SVG polygon, with the library logos'
 * glint crossing it every four seconds: a light band that turns its solid
 * cells to slashes and its colour lighter as it passes.
 */
import { fromSvg } from "../../src/kit/vector.ts";

const star = `<svg viewBox="0 0 24 24">
  <polygon id="star" fill="#f59e0b" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
</svg>`;

export default fromSvg(star, { name: "star", width: 40, "#star": "glint" });
