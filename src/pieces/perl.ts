/*
 * perl: the Perl logo, an onion, with a glint crossing it every few seconds.
 *
 * Drawn from devicon's perl-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from perl-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface PerlOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "perl",
  category: "logos",
  note: "the onion, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 2 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#212178", "#fefefe", "#6f6fa7", "#fefefe", "#bcbcd7", "#ffffff",
    "#4f4fcf", "#fefefe", "#8d8de0", "#fefefe", "#cacaf1", "#ffffff",
  ],
} satisfies Meta<PerlOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                  __ppq8888888888qqq__
              _pp8888888888d88888888888qq_
           _p888888888888P8d888888888888888q,
         _p88888888888888b8db"888888888888888q_
       _p8888888888888888P8|8|88888888888888888q,
      q888888888888888888\8|8"8888888888888888888p
     p88888888888888888P)8Pq8 "8888888888888888888q
    q8888888888888888"_p88'8P b_"Y88888888888888888q
   q88888888888888P"_p88P'q8|  "8q,"Y888888888888888p
  \888888888888P" _p888P q88     "8q_ "88888888888888,
  d8888888888P" .p888P" p88P       "88q, "88888888888b
  8888888888"  _8888" .p888'         "88p  "8888888888
  888888888'  q8888" .p888P           "88q, "888888888
  88888888"  )8888"  q8888'            "88p  )88888888
  88888888   88888   88888              888, '88888888
  O8888888   88888   8888b              888| .8888888P
  "8888888,  O8888,  88888             .888  |8888888"
   )888888q, '8888p  "8888,            q88" .8888888P
    O888888q, "8888p  "888p           _88" _p888888P
     O8888888_  Y888q_ "888,         _8P" q8888888P
      "88888888q_'"888q_'88p       _pP"_p88888888"
       '888888888qq_"Y88qq888qq_   "_pp88888888P'
         "888888888888q8888P88888q88888888888P"
           'Y88888888888P_8bd8_888888888888P'
              ""888888888888888888888888"'
                  '"Y8888888888888PP"'

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                  __ppq8888888888qqq__
              _pp8888888888888888888888qq_
           _p888888888888888888888888888888q,
         _p8888888888888888888888888888888888q_
       _p88888888888888888888888888888888888888q,
      q888888888888888888888888888888888888888888p
     p88888888888888888888888888888888888888888888q
    q8888888888888888888888888888888888888888888888q
   q888888888888888888888888888888888888888888888888p
  \88888888888888888888888888888888888888888888888888,
  d88888888888888888888888888888888888888888888888888b
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  8888888888888888888888888888888888888888888888888888
  O88888888888888888888888888888888888888888888888888P
  "88888888888888888888888888888888888888888888888888"
   )888888888888888888888888888888888888888888888888P
    O8888888888888888888888888888888888888888888888P
     O88888888888888888888888888888888888888888888P
      "888888888888888888888888888888888888888888"
       '888888888888888888888888888888888888888P'
         "88888888888888888888888888888888888P"
           'Y888888888888888888888888888888P'
              ""888888888888888888888888"'
                  '"Y8888888888888PP"'

`;
const INK = String.raw`

                  00000000000000000000
              0000000000000000000000000000
           0000000000000000000000000000000000
         00000000000000000010100000000000000000
       000000000000000000001010000000000000000000
      00000000000000000001010100000000000000000000
     0000000000000000000100101100000000000000000000
    000000000000000001100010010110000000000000000000
   00000000000000001100001001111011100000000000000000
  0000000000000011100000100011111100111000000000000000
  0000000000001110000011000011111111001111000000000000
  0000000000111100001110000111111111110011110000000000
  0000000001111000011100001111111111111000111000000000
  0000000011110000111000001111111111111100011100000000
  0000000011100000111000001111111111111100011100000000
  0000000011100000111000001111111111111100011100000000
  0000000011100000111000001111111111111100011100000000
   00000000111000001110000111111111111110011100000000
    000000001110000011100011111111111110011100000000
     0000000011100000111000111111111110011100000000
      00000000011110000110001111111100111000000000
       000000000000110000000000111111000000000000
         00000000000000000000000000000000000000
           0000000000000010000100000000000000
              0000000000000000000000000000
                  00000000000000000000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function perl({ shine = meta.options.shine }: Partial<PerlOptions> = {}): Frame {
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
