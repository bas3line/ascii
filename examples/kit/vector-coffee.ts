/*
 * coffee: a line icon drawing itself. "trace" draws each line from where it
 * starts, as a pen would, holds the whole cup, then wipes it away; the outline
 * style walks the lines as characters. Line icons (Lucide, Feather, Heroicons)
 * are drawn in currentColor, and `color` makes that a colour of your own.
 */
import { fromSvg } from "../../src/kit/vector.ts";

const cup = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <path d="M8 2.5c-1 1.2 1 2.3 0 3.5M12 2.5c-1 1.2 1 2.3 0 3.5M16 2.5c-1 1.2 1 2.3 0 3.5"/>
  <path d="M4 9h14v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z"/>
  <path d="M18 11h1a3 3 0 0 1 0 6h-1.2"/>
</svg>`;

export default fromSvg(cup, { name: "coffee", style: "outline", color: "#f97316", "*": "trace" });
