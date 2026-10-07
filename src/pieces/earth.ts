/*
 * earth: the globe turning west to east under a sun low on its left, its
 * continents read off a hand-made map of the world at five degrees a cell.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "earth",
  category: "space",
  note: "a lit globe turning, continents from a five-degree map",
  cols: 60,
  rows: 30,
  fps: 20,
} satisfies Meta;

// Equirectangular, 180 W at the left, the north pole at the top; # is land.
const MAP = [
  "                                                                        ",
  "                     ##   ######                                        ",
  "             ###################       #                #               ",
  "           ###########   #######                  ###########           ",
  "#  ##############   ###  #####         #################################",
  "   ##############    ##   ##    #    ### ############################## ",
  "    #    #########  ####           # ## ########################   ##   ",
  "          ###############         ## ###########################        ",
  "           #############           #############################        ",
  "           ###########            ### ####  ## ###############  #       ",
  "           ##########             ##     ################### #          ",
  "            ########              ##### #  #################  #         ",
  "             ####  #             ###########################            ",
  "               ##                ###############  #########             ",
  "                ###              ##############    ##  ###  #           ",
  "                  ##             #############     #    ##  #           ",
  "                    #####         ############          #   #           ",
  "                    ######            #######          ## ##            ",
  "                    ########          ######            # ### ##        ",
  "                    #########         ######             ##    ###      ",
  "                     ########          #####                  #         ",
  "                      ######          ###### #               ####       ",
  "                      ######           ####  #             #######      ",
  "                      ####             ####                ########     ",
  "                     ####              ###                 #######      ",
  "                     ###                                        ##      ",
  "                     ##                                               # ",
  "                     ##                                                 ",
  "                     #                                                  ",
  "                                                                        ",
  "                                                                        ",
  "                       #                       ##################       ",
  "                    ####        ######################################  ",
  "  ####################################################################  ",
  "########################################################################",
  "########################################################################",
];
const MW = 72, MH = 36;

// Land and sea keep apart at every light: land is the dense family and goes
// on into the dusk, sea is a light texture that fades into the night first.
const LAND = ":+*#%@";
const PAPER_LAND = "##%%%@"; // on paper land stays heavy, darkest at the dusk
const DAY = 36; // seconds per turn
const START = 20; // longitude facing us at t = 0, degrees east
const TILT = 0.3; // the north pole leans this far toward us, radians
const SS = 2; // samples per cell each way

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function earth(): Frame {
  const { cols, rows } = meta;
  const cx = cols / 2, cy = rows / 2;
  const R = rows / 2 - 1; // radius in rows; it spans twice as many columns
  const land = new Float32Array(MW * MH);
  for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) land[r * MW + c] = MAP[r][c] === "#" ? 1 : 0;
  // How much land is at a point of the map, blended between cells.
  const at = (u: number, v: number) => {
    const x = u - 0.5, y = Math.min(MH - 1, Math.max(0, v - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, y1 = Math.min(MH - 1, y0 + 1);
    const a = ((x0 % MW) + MW) % MW, b = (a + 1) % MW;
    const top = land[y0 * MW + a] * (1 - fx) + land[y0 * MW + b] * fx;
    const bot = land[y1 * MW + a] * (1 - fx) + land[y1 * MW + b] * fx;
    return top * (1 - fy) + bot * fy;
  };

  // Each sample keeps where it falls on the globe, how much sun it gets and
  // how much of the sun the sea there would mirror back at us.
  // The sun is behind us and a little left and above, so the whole disc is
  // lit but for a thin crescent of night on the right.
  const m = Math.hypot(-0.42, 0.28, 0.86);
  const [lx, ly, lz] = [-0.42 / m, 0.28 / m, 0.86 / m];
  const hm = Math.hypot(lx, ly, lz + 1);
  const [hx, hy, hz] = [lx / hm, ly / hm, (lz + 1) / hm];
  const cells: number[][] = [];
  const cT = Math.cos(TILT), sT = Math.sin(TILT);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const s: number[] = [];
      for (let j = 0; j < SS; j++)
        for (let i = 0; i < SS; i++) {
          const x = (c + (i + 0.5) / SS - cx) / (2 * R), y = (cy - r - (j + 0.5) / SS) / R;
          const d = x * x + y * y;
          if (d >= 1) continue;
          const z = Math.sqrt(1 - d);
          const py = y * cT + z * sT, pz = z * cT - y * sT;
          const lat = Math.asin(py), lon = Math.atan2(x, pz);
          s.push(lon, ((Math.PI / 2 - lat) / Math.PI) * MH, Math.max(0, x * lx + y * ly + z * lz), Math.max(0, x * hx + y * hy + z * hz) ** 300);
        }
      cells.push(s);
    }
  const inside = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows && cells[r * cols + c].length * 2 >= 4 * SS * SS;
  // The limb: every globe cell with open space on any side, corners included,
  // so the edge of the night side is one unbroken ring.
  const limb = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (inside(c, r))
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!inside(c + dc, r + dr)) limb[r * cols + c] = 1;
  const rim = (c: number, r: number) => limb[r * cols + c] === 1;
  // A few faint stars, kept clear of the globe.
  const rand = mulberry32(5);
  const stars = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (Math.hypot((c + 0.5 - cx) / (2 * R), (cy - r - 0.5) / R) > 1.1 && rand() < 0.03) stars[r * cols + c] = 1;
  // A fixed scatter of wave crests on the sea, so the texture turns with the globe.
  const crest = (u: number, v: number) => {
    const h = Math.sin(Math.floor(u * 1.5) * 12.9898 + Math.floor(v * 1.5) * 78.233) * 43758.5453;
    return h - Math.floor(h) < 0.12;
  };

  return (t, { paper = false } = {}) => {
    const turn = ((START - (360 * (t % DAY)) / DAY) * Math.PI) / 180;
    let out = "";
    for (let r = 0; r < rows; r++) {
      if (r) out += "\n";
      for (let c = 0; c < cols; c++) {
        if (!inside(c, r)) {
          out += stars[r * cols + c] ? "." : " ";
          continue;
        }
        const s = cells[r * cols + c];
        let v = 0, l = 0, g = 0, u0 = 0;
        for (let i = 0; i < s.length; i += 4) {
          let u = (((s[i] + turn) / (2 * Math.PI) + 0.5) * MW) % MW;
          if (u < 0) u += MW;
          if (!i) u0 = u;
          l += at(u, s[i + 1]);
          v += s[i + 2];
          g += s[i + 3];
        }
        const k = s.length / 4;
        v /= k;
        l /= k;
        g /= k;
        if (l >= 0.5) {
          // Land shows down to a sliver of light, past where the sea goes dark,
          // and stays faintly there through the night so the globe reads whole.
          if (v < 0.03) out += rim(c, r) ? "." : "·";
          else out += (paper ? PAPER_LAND : LAND)[Math.min(LAND.length - 1, Math.floor((paper ? 1 - v : v) * 1.15 * LAND.length))];
        } else if (v < 0.1) out += rim(c, r) ? "." : " ";
        // The sea: dots, dashes in fuller light, a few crests, and the sun's glint.
        else if (g > 0.4) out += "=";
        else if (v > 0.5 && (g > 0.08 || crest(u0, s[1]))) out += "~";
        else out += v > 0.5 ? "-" : ".";
      }
    }
    return out;
  };
}
