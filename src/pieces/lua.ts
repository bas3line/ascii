/*
 * lua: the Lua logo, a moon beside a planet lettered Lua, with a glint
 * crossing it every few seconds.
 *
 * Drawn from devicon's lua-original.svg (MIT): each cell holds the character
 * whose shape best matches the logo's edge through it, and 8 where the logo is
 * solid. On a canvas it takes the logo's colours, lifted on a dark page where
 * they would sink into it; in a <pre> it is one ink, from lua-plain.svg. The
 * logo is a trademark of its owner, shown here to name the language.
 */
import type { Frame, Meta } from "../types.ts";

export interface LuaOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "lua",
  category: "logos",
  note: "a planet and its moon, glinting now and then",
  cols: 56,
  rows: 28,
  fps: 30,
  options: { shine: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#818186", "#ffffff", "#000080", "#adadb0", "#ffffff", "#5959ac",
    "#d9d9db", "#ffffff", "#b3b3d9", "#818186", "#ffffff", "#3e3eff",
    "#adadb0", "#ffffff", "#8282ff", "#d9d9db", "#ffffff", "#c5c5ff",
  ],
} satisfies Meta<LuaOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                    ~o= '""  """ :o-        _ppqqqq_
                ="'                   "=  _p88888888q,
            ~Y'                           d8888888888p
         _p         __ppq888888qqq__      88888888888P
         "      __p888888888888888888qq,  "8888888888'
      _Y      _p888888888888888888888888q_  "88888P"
            _p888888888888888888P"'   ""88q_
    p"     q8888888888888888888"         O88p     '(
          p8888888888888888888P           888q     '
  .P     q88888888888888888888p          .8888p     q,
        |8888888888888888888888p        _p88888,    ''
  p     d88888P"88888888888888888q____pp8888888b     q
  "     888888P 88888888888888888888888888888888     "
  p     888888P 88888888")8888")888""__""8888888     _
  "     d88888P 88888888||8888||88_p8888 d88888P     O
  _,    "88888P 88888888||8888||888P""__ d88888"     ,
  'b     O8888P 88888888||8888'|88 q8888 d8888P     d'
    ,     8888P """""")8p,"^"_,|88_"^Y"_,"888P
    ).     Y888888888888888q88888888q8888q88P     _P
      _     "888888888888888888888888888888"
      "(      "88888888888888888888888888"      )"
        ._      '"88888888888888888888"'      _
         '"         ""Y8888888888P""         ^'
            "o                           _o^
                o(                   _p=
                    ^Y: .__  __. ~Y"

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                    ~o=  ""  """ :o~        _pp88qq_
                ="'                   "=  _p88888888q,
            ~Y'                           d8888888888p
         _p         __ppq888888qqq__      88888888888P
         "      _pp888888888888888888qq,  "8888888888'
      _(      _p888888888888888888888888q_  "88888P"
            _p8888888888888888888888888888q_
    p"     q88888888888888888888888888888888p     'q
          p8888888888888888888888888888888888q     '
  .P     q888888888888888888888888888888888888p     q,
        |88888888888888888888888888888888888888,    ''
  p     d88888888888888888888888888888888888888b     q
  "     8888888888888888888888888888888888888888     "
  /     8888888888888888888888888888888888888888     _
  "     d88888888888888888888888888888888888888P     O
  _,    "88888888888888888888888888888888888888"
  'b     O888888888888888888888888888888888888P     d'
    ,     88888888888888888888888888888888888P
    ).     Y88888888888888888888888888888888P     _P
      _     "888888888888888888888888888888"
      "(      "8888888888888888888888888P"      )"
        ._      '"88888888888888888888"'      _
         '"         ""Y888888888PP""         ^'
            ^o                           _o"
                =(                   _)=
                    ^Y: .__  __. ~Y"

`;
const INK = String.raw`

                    000  00  000 000        22222222
                000                   00  222222222222
            000                           222222222222
         00         2222222222222222      222222222222
         0      222222222222222222222222  222222222222
      00      2222222222222222222222222222  22222222
            22222222222222222222211111112222
    00     2222222222222222222211111111112222     00
          222222222222222222221111111111112222     0
  00     22222222222222222222221111111111122222     00
        2222222222222222222222211111111112222222    00
  0     2222222122222222222222222211111222222222     0
  0     2222222122222222222222222222222222222222     0
  0     2222222122222222122222122221111112222222     0
  0     2222222122222222112222112211222212222222     0
  00    2222222122222222112222112222111112222222
  00     22222212222222211222211221122221222222     00
    0     222221111111222112111122111211112222
    00     2222222222222222222222222222222222     00
      0     22222222222222222222222222222222
      00      2222222222222222222222222222      00
        00      222222222222222222222222      0
         00         2222222222222222         00
            00                           000
                00                   000
                    000 000  000 000

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function lua({ shine = meta.options.shine }: Partial<LuaOptions> = {}): Frame {
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
