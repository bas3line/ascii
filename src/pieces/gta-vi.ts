/*
 * gta-vi: the "VI" of Grand Theft Auto VI, in the mark's sunset, with a glint
 * crossing it every few seconds.
 *
 * Drawn from Rockstar Games' Grand Theft Auto VI mark: two thick strokes
 * meeting in a point below the bar between them, each letter edged in violet
 * and filled with the Vice City sunset, blue at the top of the letters through
 * purple, pink and coral to gold at the bottom, palm crowns spread over the
 * fill. On a canvas the outline takes its violet, the palms a shade sunk into
 * the sunset, and the fill the gradient, lifted a little on a dark page; in a
 * <pre> it is one ink, from the same drawing. Grand Theft Auto is a trademark
 * of its owner, shown here to name the game.
 */
import type { Frame, Meta } from "../types.ts";

export interface GtaViOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the mark still. */
  shine: number;
}

export const meta = {
  name: "gta vi",
  category: "companies",
  note: "the vi of grand theft auto vi, in a sunset, glinting now and then",
  cols: 76,
  rows: 32,
  fps: 30,
  options: { shine: 5 },
  // Per page: the sunset's 7 stops, the palms over them, then twice lighter for the glint; the outline last.
  palette: [
    "#4a5ce6", "#7a4bd6", "#b043bc", "#e8418f", "#f87270", "#fb9c52", "#ffc95e", "#3b3294",
    "#502b8c", "#692781", "#82266c", "#893c5e", "#8a4f51", "#8c6356", "#929df0", "#af93e6",
    "#d08ed7", "#f18dbc", "#fbaaa9", "#fdc497", "#ffdf9e", "#c9cef8", "#d7c9f3", "#e7c7eb",
    "#f8c6dd", "#fdd5d4", "#fee1cb", "#ffefcf", "#5c1898", "#5566e8", "#8256d8", "#b54ec0",
    "#e94c96", "#f87a79", "#fba25c", "#ffcc68", "#403794", "#54308d", "#6b2c82", "#822b70",
    "#894062", "#8a5255", "#8c655b", "#99a3f1", "#b49ae8", "#d395d9", "#f294c0", "#fbafaf",
    "#fdc79d", "#ffe0a4", "#ccd1f8", "#daccf3", "#e9caec", "#f8c9e0", "#fdd7d7", "#fee3ce",
    "#fff0d2", "#8d3ad1",
  ],
} satisfies Meta<GtaViOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`


     88888888888888                  88888888888888    88888888888888
    8888888888888888                8888888888888888  8888888888888888
     8888888888888888              8888888888888888  888888888888888888
      888888888888888              888888888888888   888888888888888888
       888888888888888            888888888888888    888888888888888888
        88888888888888            88888888888888     888888888888888888
         88888888888888          88888888888888      888888888888888888
          88888888888888        88888888888888       888888888888888888
          88888888888888        88888888888888       888888888888888888
           88888888888888      88888888888888        888888888888888888
            88888888888888    88888888888888         888888888888888888
             8888888888888    8888888888888          888888888888888888
              8888888888888  8888888888888           888888888888888888
               888888888888  888888888888            888888888888888888
                888888888888888888888888             888888888888888888
                 8888888888888888888888              888888888888888888
                  88888888888888888888               888888888888888888
                   888888888888888888                888888888888888888
                    8888888888888888                 888888888888888888
                     88888888888888                  888888888888888888
                     88888888888888                  888888888888888888
                      888888888888                   888888888888888888
                       8888888888                    888888888888888888
                        88888888                     888888888888888888
                         888888                      888888888888888888
                          8888                        8888888888888888
                           88                          88888888888888



`;

// On a canvas, and the colour of each cell: an index into the mark's colours.
const ART = String.raw`


     88888888888888                  88888888888888    88888888888888
    8888888888888888                8888888888888888  8888888888888888
     8888888888888888              8888888888888888  888888888888888888
      888888888888888              888888888888888   888888888888888888
       888888888888888            888888888888888    888888888888888888
        88888888888888            88888888888888     888888888888888888
         88888888888888          88888888888888      888888888888888888
          88888888888888        88888888888888       888888888888888888
          88888888888888        88888888888888       888888888888888888
           88888888888888      88888888888888        888888888888888888
            88888888888888    88888888888888         888888888888888888
             8888888888888    8888888888888          888888888888888888
              8888888888888  8888888888888           888888888888888888
               888888888888  888888888888            888888888888888888
                888888888888888888888888             888888888888888888
                 8888888888888888888888              888888888888888888
                  88888888888888888888               888888888888888888
                   888888888888888888                888888888888888888
                    8888888888888888                 888888888888888888
                     88888888888888                  888888888888888888
                     88888888888888                  888888888888888888
                      888888888888                   888888888888888888
                       8888888888                    888888888888888888
                        88888888                     888888888888888888
                         888888                      888888888888888888
                          8888                        8888888888888888
                           88                          88888888888888



`;
const INK = String.raw`



    0000000000000000                0000000000000000  0000000000000000
     0000000000000000              0000000000000000  000000000000000000
      000000000000000              000000000000000   000000000000000000
       000000000000000            000000000000000    000000000000000000
        11111111111111            11111111111111     111111111111111111
         11111111111111          11111111111111      111111111111111111
          11111111111111        11111111111111       111111111111111111
          11111111111111        11111111111111       111111111111111111
           22222222222222      22222222222222        222222222222222222
            22222222222222    22222222222222         222222222222222222
             2222222222222    2222222222222          222222222222222222
              2222222222222  2222222222222           222222222222222222
               333333333333  333333333333            333333333333333333
                333333333333333333333333             333333333333333333
                 3333333333333333333333              333333333333333333
                  44444444444444444444               444444444444444444
                   444444444444444444                444444444444444444
                    4444444444444444                 444444444444444444
                     44444444444444                  444444444444444444
                     55555555555555                  555555555555555555
                      555555555555                   555555555555555555
                       5555555555                    555555555555555555
                        55555555                     555555555555555555
                         666666                      666666666666666666
                          6666                        6666666666666666
                           66                          66666666666666



`;
// f fill, p palm, o outline.
const LAYER = String.raw`


     oooooooooooooo                  oooooooooooooo    oooooooooooooo
    offffffffffffffo                offffffffffffffo  offfffpffpffpppo
     offffffffffffffo              oppffffffffffffo  offffffppppfppfffo
      offfffffffffffo              offfffffffffffo   opppppppppppfffffo
       offfffffffppppo            offfffffffffffo    offffffppppppppffo
        offffffffpfffo            oppffffffffffo     offffffffppfffpppo
         offfffffffffpo          offppppffffffo      offffffffffppffffo
          offfffffppppfo        offffffpppfffo       offfffffffffppfffo
          offfffpppffffo        oppffffffpfffo       offffffffffffppffo
           offfppfffffffo      offpppfffffffo        offfffffffffffppfo
            ofppfffffffffo    oppfffppfffffo         offffffffffffffppo
             offfffffffffo    ofppffffppffo          offffffffpffffffpo
              offffffffppfo  offfppffffppo           offffffffpfffffffo
               offfffffppfo  offffppffffo            offffffffpfffffffo
                offffffppffooffffffpfffo             offffffffpfffffffo
                 offfffppffffffffffppfo              offffffffpfffffffo
                  offffppfffffffffffpo               offffffffpfffffffo
                   offppffffffffffffo                offffffffpfffffffo
                    ofppfffffffffffo                 offffffffpfffffffo
                     oppffffffffffo                  offffffffpfffffffo
                     oppffffffffffo                  offffffffpfffffffo
                      opfffffffffo                   offffffffpfffffffo
                       offffffffo                    offffffffpfffffffo
                        offffffo                     offffffffffffffffo
                         offffo                      offffffffffffffffo
                          offo                        offffffffffffffo
                           oo                          oooooooooooooo



`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function gtaVi({ shine = meta.options.shine }: Partial<GtaViOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK), lay = lines(LAYER);
  const n = (meta.palette.length - 2) / 8; // colours a gradient stop group holds
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the mark's ink, edge to edge, rather than the whole frame.
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
          if (color) {
            const l = lay[y][x];
            color[y * cols + x] = l === "o" ? (paper ? 4 * n : 8 * n + 1)
              : (paper ? 0 : 4 * n + 1) + ((l === "p" ? 1 : 0) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0)) * n + parseInt(ink[y][x], 36);
          }
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
