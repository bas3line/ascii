/*
 * helmcode: the Helmcode mark, a hexagon with a folded cut through it, in its
 * violet, with a glint crossing it every few seconds.
 *
 * Drawn from Helmcode's own mark, helmcode.com/brand: each cell holds the
 * character whose shape best matches the mark's edge through it, and 8 where
 * the mark is solid. On a canvas it takes the mark's colour, lifted on a dark
 * page where it would sink into it; in a <pre> it is one ink, from the same
 * drawing. The mark is a trademark of its owner, shown here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface HelmcodeOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the mark still. */
  shine: number;
}

export const meta = {
  name: "helmcode",
  category: "companies",
  note: "the helmcode hexagon in its violet, glinting now and then",
  cols: 64,
  rows: 32,
  fps: 30,
  options: { shine: 5 },
  // The mark's colour for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#4934e1", "#897beb", "#c8c2f6", "#8071ea", "#aca3f1", "#d9d4f9",
  ],
} satisfies Meta<HelmcodeOptions>;

const ART = String.raw`


                           _qq888pp_
                       _qq88888888888pp_
                    _q8888888888888888888p_
                _qq8888888888888888888888888pp_
             _q888888888888888888888888888888888p_
         _qq8888888888888888PPP'PP88888888888888888pp_
        q8888888888888888PP'       ^Pd8888888888888888p
       q8888888888888PP'              'PP88888888888888p
       8888888888PP^                      ^Pd88888888888
       888888888p_                           'PP88888888
       888888888888p_                           q8888888
       888888888888888pp_                       q8888888
       8888888888888888888pp_                   q8888888
       8888888888888888888888pp_                q8888888
       888888888888888888888888b                q8888888
       888888888888888888888888b                q8888888
       888888888888888888888888b                q8888888
       888888888888888888888888b                q8888888
       888888888888888888888888b              _qq8888888
       888888888888888888888888b           _qq8888888888
       d88888888888888888888888b       _qq8888888888888P
        P8888888888888888888888b    _qq888888888888888P
         'PP8888888888888888888b_qq8888888888888888PP'
             ^P888888888888888888888888888888888P^
                'PP8888888888888888888888888PP'
                    PP8888888888888888888PP
                       ^PP88888888888PP'
                           PPd888PPP


`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPY"; // what the glint turns to slashes; thin edges keep their shape

export default function helmcode({ shine = meta.options.shine }: Partial<HelmcodeOptions> = {}): Frame {
  const { cols, rows } = meta;
  const art = ART.slice(1, -1).split("\n").map((line) => line.padEnd(cols));
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the mark's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  art.forEach((line, y) => {
    for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
  });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = art[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
          if (color) color[y * cols + x] = (paper ? 0 : 3) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
