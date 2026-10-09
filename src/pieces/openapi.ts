/*
 * openapi: the OpenAPI Initiative's gauge mark, a green segmented dial with a
 * dark pointer, with a glint crossing it every few seconds.
 *
 * Drawn by sampling the OpenAPI Initiative's own published mark (its GitHub
 * avatar, openapis.org) onto a grid: each cell takes the shade of its ink
 * coverage and the nearest of 4 sampled colours. On a canvas it takes the
 * logo's colours, with the dark pointer lifted on a dark page where it would
 * sink into it; in a <pre> it is one ink, from the same sampling. The mark is
 * a trademark of its owner, shown here to name the specification.
 */
import type { Frame, Meta } from "../types.ts";

export interface OpenapiOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "openapi",
  category: "logos",
  note: "the openapi gauge: a green dial and dark pointer, glinting now and then",
  cols: 46,
  rows: 23,
  fps: 30,
  options: { shine: 5 },
  // The logo's 4 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#485828", "#68a030", "#404040", "#90d008",
    "#92b154", "#9dd268", "#838383", "#bff847",
    "#cddbb0", "#d2eab9", "#c6c6c6", "#e2fcaa",
    "#485828", "#68a030", "#a9a9a9", "#90d008",
    "#92b154", "#9dd268", "#c7c7c7", "#bff847",
    "#cddbb0", "#d2eab9", "#e5e5e5", "#e2fcaa",
  ],
} satisfies Meta<OpenapiOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                                    -*%@@@#=  
                                   *@@@@@@@@%-
                .:::.:::.         =@@@@@@@@@@%
           -+*%@@@@@+@@@@@%*=:    =@@@@@@@@@@%
        ==*@@@@@@@@@+@@@@@@@@@@=  +@@@@@@@@@%:
      -%@@**@@@@@@@@+@@@@@@@@#- +@@@@**#%#+-  
    +@@**%@#+@@@@@@@+@@@@@@#- +@@@@*:         
  .#@@@@@**%%=%@@@@@+@@@@#- +@@@@*::**        
 .%@@@@@@@@**%=%@@%%=%@#- +@@@@*::*@@@*       
 #@@@@@@@@@@@**--       +@@@@*::*@@@@@@*      
=@@@@@@@@@@@@#  -*%@@@#@@@@*::*@@@@@@@@@:     
#@@@@@@@@@@@#  +@@@@@@@@@%: *@@@@@@@@@@@+     
%%%%%%%%%%%%- :@@@@@@@@@@@  -***********=     
*###########- :@@@@@@@@@@%  *@@@@@@@@@@@#     
*@@@@@@@@@@@#  -@@@@@@@@%: -@@@@@@@@@@@@=     
-@@@@@@@@#**#%-  -+*#*+-  =@@@@@@@@@@@@@      
 *@@@%***%@@%**%--:...:=+=**@@@@@@@@@@@=      
  ****@@@@%**@@#+@@@@@@@@%=%**@@@@@@@@+       
   +@@@@%**@@@%=@@@@@@@@@@@+%@**@@@@@-        
    :#%**@@@@@=@@@@@@@@@@@@@+#@@**@*.         
      .#@@@@@=%@@@@@@@@@@@@@@**@@*            
        .+#@+#@@@@@@@@@@@@@@@@+-              
            .=+#%@@@@@@%%*+=:                 

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                                    -*%@@@#=  
                                   *@@@@@@@@%-
                .:::.:::.         =@@@@@@@@@@%
           -+*%@@@@@+@@@@@%*=:    =@@@@@@@@@@%
        ==*@@@@@@@@@+@@@@@@@@@@=  +@@@@@@@@@%:
      -%@@**@@@@@@@@+@@@@@@@@#- +@@@@**#%#+-  
    +@@**%@#+@@@@@@@+@@@@@@#- +@@@@*:         
  .#@@@@@**%%=%@@@@@+@@@@#- +@@@@*::**        
 .%@@@@@@@@**%=%@@%%=%@#- +@@@@*::*@@@*       
 #@@@@@@@@@@@**--       +@@@@*::*@@@@@@*      
=@@@@@@@@@@@@#  -*%@@@#@@@@*::*@@@@@@@@@:     
#@@@@@@@@@@@#  +@@@@@@@@@%: *@@@@@@@@@@@+     
%%%%%%%%%%%%- :@@@@@@@@@@@  -***********=     
*###########- :@@@@@@@@@@%  *@@@@@@@@@@@#     
*@@@@@@@@@@@#  -@@@@@@@@%: -@@@@@@@@@@@@=     
-@@@@@@@@#**#%-  -+*#*+-  =@@@@@@@@@@@@@      
 *@@@%***%@@%**%--:...:=+=**@@@@@@@@@@@=      
  ****@@@@%**@@#+@@@@@@@@%=%**@@@@@@@@+       
   +@@@@%**@@@%=@@@@@@@@@@@+%@**@@@@@-        
    :#%**@@@@@=@@@@@@@@@@@@@+#@@**@*.         
      .#@@@@@=%@@@@@@@@@@@@@@**@@*            
        .+#@+#@@@@@@@@@@@@@@@@+-              
            .=+#%@@@@@@%%*+=:                 

`;
const INK = String.raw`

                                    22222222  
                                   22222222221
                111110001         122222222222
           1111111111000000000    122222222222
        331111111111100000000000  222222222221
      3333311111111110000000000 222222222222  
    0000333311111111100000000 2222221         
  1000000033311111111000000 2222221000        
 100000000003331111110000 2222221000000       
 0000000000000331       2222221000000000      
00000000000000  2222222222221000000000001     
0000000000000  222222222221 0000000000000     
0000000000001 222222222222  0000000000001     
3333333333333 122222222222  1111111111111     
3333333333333  22222222221 11111111111111     
333333333331111  2222222  11111111111111      
 333333311111100033333333101111111111111      
  3311111111000033333333333001111111111       
   11111110000033333333333330001111111        
    111100000033333333333333300001111         
      1000000033333333333333330000            
        100003333333333333333331              
            33333333333333333                 

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0@#%*+=:.-"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function openapi({ shine = meta.options.shine }: Partial<OpenapiOptions> = {}): Frame {
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
