/*
 * charming: the Charming MCP mascot, a hand-drawn orange flame with two eyes,
 * with a glint crossing it every few seconds.
 *
 * Drawn by sampling the mascot's own published icon (tambo-labs/charming-mcp)
 * onto a grid: each cell takes the shade of its ink coverage and the nearest
 * of 3 sampled colours. On a canvas it takes the logo's colours, with the
 * dark outline lifted on a dark page where it would sink into it; in a <pre>
 * it is one ink, from the same sampling. The mark is a trademark of its
 * owner, shown here to name the project.
 */
import type { Frame, Meta } from "../types.ts";

export interface CharmingOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "charming",
  category: "companies",
  note: "a hand-drawn flame mascot, two eyes, glinting now and then",
  cols: 34,
  rows: 24,
  fps: 30,
  options: { shine: 5 },
  // The logo's 3 colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#f07048", "#101010", "#f8f0d8",
    "#f5a288", "#646464", "#faf5e6",
    "#fad4c8", "#b7b7b7", "#fdfaf3",
    "#f07048", "#939393", "#f8f0d8",
    "#f5a288", "#b9b9b9", "#faf5e6",
    "#fad4c8", "#dfdfdf", "#fdfaf3",
  ],
} satisfies Meta<CharmingOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

                 .*%#:            
                :@@@@@-           
                #@@@@@@*:         
               *@@@@@@@@@@#-      
          =++=#@@@@@@@@@@@@@-     
        :%@@@@@@@@@@@@@@@@@@*     
        %@@@@@@@@@@@@@@@@@@@+     
       +@@@@@@@@@@@@@@@@@@@@-     
    ::-@@@@@@@@@@@@@@@@@@@@@      
  -@@@@@@@@@@@@@@@@@@@@@@@@@.     
 .%@@@@@@@@@@@@@@@@@@@@@@@@@@%*=  
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%:
 #@@@@@@@@@@@@  @@@  @@@@@@@@@@@@#
 -@@@@@@@@@@@@  @@@ @@@@@@@@@@@@@@
 -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*
*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@% 
%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@- 
+@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@: 
 %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@: 
  #@@@@@@@@@@@@@@@@@@@@@@@@@@@@%  
   +@@@@@@@@@@@@@@@@@@@@@@@@@@%:  
    :#@@@@@@@@@@@@@@@@@@@@@@@*.   
      :+#@@@@@@@@@@@@@@@@%#=.     
          :-+#%@@%%#*+=:          

`;

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = String.raw`

                 .*%#:            
                :@@@@@-           
                #@@@@@@*:         
               *@@@@@@@@@@#-      
          =++=#@@@@@@@@@@@@@-     
        :%@@@@@@@@@@@@@@@@@@*     
        %@@@@@@@@@@@@@@@@@@@+     
       +@@@@@@@@@@@@@@@@@@@@-     
    ::-@@@@@@@@@@@@@@@@@@@@@      
  -@@@@@@@@@@@@@@@@@@@@@@@@@.     
 .%@@@@@@@@@@@@@@@@@@@@@@@@@@%*=  
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%:
 #@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#
 -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*
*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@% 
%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@- 
+@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@: 
 %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@: 
  #@@@@@@@@@@@@@@@@@@@@@@@@@@@@%  
   +@@@@@@@@@@@@@@@@@@@@@@@@@@%:  
    :#@@@@@@@@@@@@@@@@@@@@@@@*.   
      :+#@@@@@@@@@@@@@@@@%#=.     
          :-+#%@@%%#*+=:          

`;
const INK = String.raw`

                 11111            
                1100011           
                110000111         
               1100000001111      
          1111110000022000011     
        110000000000000220011     
        100000000000000020011     
       1100000000000000000011     
    111100000000000000000001      
  110000000000000000000000011     
 1100000000000000000000000001111  
 110000000000000000000000000000111
 100000000000011000110000000000011
 110000000000011000100000000000001
 110000000000000000000000000000011
110000000000000000000000000000011 
100000000000000000000000000000011 
110000000000000000000000000000011 
 11000000000000000000000000000011 
  110000000000000000000000000011  
   11000000000000000000000000111  
    111000000000000000000000111   
      11111000000000000111111     
          11111111111111          

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0@#%*+=:.-"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function charming({ shine = meta.options.shine }: Partial<CharmingOptions> = {}): Frame {
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
