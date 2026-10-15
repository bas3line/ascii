/*
 * tv: an old television drawn as an SVG, its screen playing the library's
 * matrix rain. Any piece fills any part: "#screen" names the screen by its id
 * and the piece plays inside it, centred and clipped to its shape.
 */
import { fromSvg } from "../../src/kit/vector.ts";
import * as matrixRain from "../../src/pieces/matrix-rain.ts";

const tv = `<svg viewBox="0 0 80 60">
  <path d="M30 2l10 10 14-10" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="4" y="12" width="72" height="44" rx="6" fill="#b45309"/>
  <rect id="screen" x="10" y="17" width="48" height="34" rx="5" fill="#0f172a"/>
  <circle cx="67" cy="26" r="3.5" fill="#fde68a"/><circle cx="67" cy="38" r="3.5" fill="#fde68a"/>
</svg>`;

export default fromSvg(tv, { name: "tv", width: 48, "#screen": matrixRain });
