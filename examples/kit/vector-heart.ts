/*
 * heart: an SVG icon, inline, beating. fromSvg() reads the markup with no DOM
 * and draws each cell with the character whose shape best matches the heart's
 * edge, in its own red; "#heart" names the path by its id, and "pulse" sets it
 * beating.
 */
import { fromSvg } from "../../src/kit/vector.ts";

const heart = `<svg viewBox="0 0 24 24">
  <path id="heart" fill="#e11d48" d="M12 21C12 21 2 14.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5C22 14.5 12 21 12 21z"/>
</svg>`;

export default fromSvg(heart, { name: "heart", width: 40, "#heart": "pulse" });
