/*
 * elm: the Elm logo, a tangram of seven pieces, with a glint crossing it every
 * few seconds.
 *
 * Drawn from devicon's elm-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid, with the gaps between the pieces widened so they read in one ink. On
 * a canvas it takes the logo's colours, lifted on a dark page where they would
 * sink into it; in a <pre> it is one ink, from the same drawing. The logo is a
 * trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface ElmOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "elm",
  category: "logos",
  note: "seven tangram pieces in a square, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#efa500", "#8dd737", "#60b5cc", "#34495e", "#f5c559", "#b5e57d",
    "#98cfde", "#7b8996", "#fae4b3", "#ddf3c3", "#cfe9f0", "#c2c8cf",
    "#efa500", "#8dd737", "#60b5cc", "#45617d", "#f5c559", "#b5e57d",
    "#98cfde", "#8698ab", "#fae4b3", "#ddf3c3", "#cfe9f0", "#c7d0d8",
  ],
} satisfies Meta<ElmOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

    'Y888888888888888888888pp   'Y88888888888888888888
  p,  'Y888888888888888888888pp   'Y888888888888888888
  88p,  'Y888888888888888888888pp   'Y8888888888888888
  8888p,  'Y888888888888888888888pp   'Y88888888888888
  888888p,  'Y888888888888888888888pp   'Y888888888888
  88888888p,  'YYYYYYYYYYYYYYYYYYYYYY'    'Y8888888888
  8888888888p,                              'Y88888888
  888888888888p,  'Y8888888888888888P'  .qp   'Y888888
  88888888888888p,  'Y888888888888P'  .q888pp   'Y8888
  8888888888888888p,  'Y88888888P'  .q8888888pp   'Y88
  888888888888888888p,  'Y8888P'  .q88888888888pp   'Y
  88888888888888888888p,  'YP'  .q888888888888888pp
  8888888888888888888888p,    .q8888888888888888888pp
  8888888888888888888888P'    'Y8888888888888888888PP
  88888888888888888888P'  .qp,  'Y888888888888888PP
  888888888888888888P'  .q8888p,  'Y88888888888PP   qq
  8888888888888888P'  .q88888888p,  'Y8888888PP   qq88
  88888888888888P'  .q888888888888p,  'Y888PP   qq8888
  888888888888P'  .q8888888888888888p,  'YP   qq888888
  8888888888P'  .q88888888888888888888p,    qq88888888
  88888888P'  .q888888888888888888888888p,  'Y88888888
  888888P'  .q8888888888888888888888888888p,  'Y888888
  8888P'  .q88888888888888888888888888888888p,  'Y8888
  88P'  .q888888888888888888888888888888888888p,  'Y88
  P'  .q8888888888888888888888888888888888888888p,  'Y
    .q88888888888888888888888888888888888888888888p,

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

    'Y888888888888888888888pp   'Y88888888888888888888
  p,  'Y888888888888888888888pp   'Y888888888888888888
  88p,  'Y888888888888888888888pp   'Y8888888888888888
  8888p,  'Y888888888888888888888pp   'Y88888888888888
  888888p,  'Y888888888888888888888pp   'Y888888888888
  88888888p,  'YYYYYYYYYYYYYYYYYYYYYY'    'Y8888888888
  8888888888p,                              'Y88888888
  888888888888p,  'Y8888888888888888P'  .qp   'Y888888
  88888888888888p,  'Y888888888888P'  .q888pp   'Y8888
  8888888888888888p,  'Y88888888P'  .q8888888pp   'Y88
  888888888888888888p,  'Y8888P'  .q88888888888pp   'Y
  88888888888888888888p,  'YP'  .q888888888888888pp
  8888888888888888888888p,    .q8888888888888888888pp
  8888888888888888888888P'    'Y8888888888888888888PP
  88888888888888888888P'  .qp,  'Y888888888888888PP
  888888888888888888P'  .q8888p,  'Y88888888888PP   qq
  8888888888888888P'  .q88888888p,  'Y8888888PP   qq88
  88888888888888P'  .q888888888888p,  'Y888PP   qq8888
  888888888888P'  .q8888888888888888p,  'YP   qq888888
  8888888888P'  .q88888888888888888888p,    qq88888888
  88888888P'  .q888888888888888888888888p,  'Y88888888
  888888P'  .q8888888888888888888888888888p,  'Y888888
  8888P'  .q88888888888888888888888888888888p,  'Y8888
  88P'  .q888888888888888888888888888888888888p,  'Y88
  P'  .q8888888888888888888888888888888888888888p,  'Y
    .q88888888888888888888888888888888888888888888p,

`;
const INK = String.raw`

    1111111111111111111111111   2222222222222222222222
  33  1111111111111111111111111   22222222222222222222
  3333  1111111111111111111111111   222222222222222222
  333333  1111111111111111111111111   2222222222222222
  33333333  1111111111111111111111111   22222222222222
  3333333333  111111111111111111111111    222222222222
  333333333333                              2222222222
  33333333333333  00000000000000000000  111   22222222
  3333333333333333  0000000000000000  1111111   222222
  333333333333333333  000000000000  11111111111   2222
  33333333333333333333  00000000  111111111111111   22
  3333333333333333333333  0000  1111111111111111111
  333333333333333333333333    11111111111111111111111
  333333333333333333333333    11111111111111111111111
  3333333333333333333333  2222  1111111111111111111
  33333333333333333333  22222222  111111111111111   00
  333333333333333333  222222222222  11111111111   0000
  3333333333333333  2222222222222222  1111111   000000
  33333333333333  22222222222222222222  111   00000000
  333333333333  222222222222222222222222    0000000000
  3333333333  2222222222222222222222222222  0000000000
  33333333  22222222222222222222222222222222  00000000
  333333  222222222222222222222222222222222222  000000
  3333  2222222222222222222222222222222222222222  0000
  33  22222222222222222222222222222222222222222222  00
    222222222222222222222222222222222222222222222222

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function elm({ shine = meta.options.shine }: Partial<ElmOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the logo's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
    });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
