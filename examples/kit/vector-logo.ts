/*
 * spark: a simple logo, a lightning bolt cut out of a rounded square, turning
 * like a coin. "#mark" names the group by its id, so the square and the bolt
 * turn as one; in one ink the white bolt is left out, so it still reads.
 */
import { fromSvg } from "../../src/kit/vector.ts";

const logo = `<svg viewBox="0 0 64 64">
  <g id="mark">
    <rect x="4" y="4" width="56" height="56" rx="14" fill="#7c3aed"/>
    <path fill="#ffffff" d="M36 10 16 36h14l-4 18 22-28H34z"/>
  </g>
</svg>`;

export default fromSvg(logo, { name: "spark", width: 40, "#mark": "flip" });
