/*
 * glass of water: drawn as an SVG, a cup, the water in it and three bubbles,
 * brought to life with a map and no code: the water's surface ripples and is
 * drawn in waves, the bubbles rise through it, and a glint crosses the glass.
 * With ascii.rest/kit's materials, `"#water": water(), "#cup": glass()` fill
 * the same parts with real water and glass instead.
 */
import { fromSvg } from "../../src/kit/vector.ts";

const glass = `<svg viewBox="0 0 40 48">
  <path id="water" fill="#38bdf8" d="M9.9 17h20.2l-2.1 24.5h-16z"/>
  <g class="bubble" fill="#e0f2fe"><circle cx="16" cy="38" r="1.2"/><circle cx="22" cy="36" r="0.9"/><circle cx="25" cy="39" r="1.1"/></g>
  <path id="cup" fill="#cbd5e1" d="M6 3h2.6l3.2 38.5h16.4L31.4 3H34l-3.6 41.2a2 2 0 0 1-2 1.8H11.6a2 2 0 0 1-2-1.8z"/>
</svg>`;

export default fromSvg(glass, {
  name: "glass of water",
  width: 36,
  "#water": { motion: "ripple", fill: "~" },
  ".bubble": { motion: "rise", amount: 7 },
  "#cup": "glint",
});
