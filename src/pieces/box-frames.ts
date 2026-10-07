/*
 * box-frames: a sheet of twelve frame styles, from box drawing lines to half
 * blocks, a title in the edge, a drop shadow and bare corners.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "box frames",
  category: "ui",
  note: "twelve frame styles to copy, each one labelled",
  cols: 78,
  rows: 20,
  fps: 0,
} satisfies Meta;

const W = 16, H = 5; // one frame, borders included
const GAP_X = 4, GAP_Y = 1;

// Corners top left, top right, bottom left, bottom right, then the top and
// bottom edge, then the sides.
const LINES: Record<string, string> = {
  single: "┌┐└┘──││",
  double: "╔╗╚╝══║║",
  rounded: "╭╮╰╯──││",
  heavy: "┏┓┗┛━━┃┃",
  dashed: "┌┐└┘┄┄┆┆",
  ascii: "++++--||",
  mixed: "╒╕╘╛══││",
  titled: "┌┐└┘──││",
  block: "▛▜▙▟▀▄▌▐",
  shadow: "┌┐└┘──││",
};
const SHEET = [
  "single", "double", "rounded", "heavy",
  "dashed", "ascii", "mixed", "titled",
  "shade", "block", "shadow", "corners",
];

export default function boxFrames(): Frame {
  const { cols, rows } = meta;
  const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(" "));
  const put = (r: number, c: number, ch: string) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = ch;
  };
  const write = (r: number, c: number, s: string) => [...s].forEach((ch, k) => put(r, c + k, ch));

  const frame = (y: number, x: number, g: string) => {
    for (let c = x + 1; c < x + W - 1; c++) (put(y, c, g[4]), put(y + H - 1, c, g[5]));
    for (let r = y + 1; r < y + H - 1; r++) (put(r, x, g[6]), put(r, x + W - 1, g[7]));
    put(y, x, g[0]);
    put(y, x + W - 1, g[1]);
    put(y + H - 1, x, g[2]);
    put(y + H - 1, x + W - 1, g[3]);
  };

  // A border of light shade, two columns wide at the sides so it is as thick
  // as the one-row top and bottom, a cell being twice as tall as it is wide.
  const shade = (y: number, x: number) => {
    for (let c = x; c < x + W; c++) (put(y, c, "░"), put(y + H - 1, c, "░"));
    for (let r = y + 1; r < y + H - 1; r++) for (const c of [x, x + 1, x + W - 2, x + W - 1]) put(r, c, "░");
  };

  // Only the corners, each with a short arm along the top or bottom edge.
  const corners = (y: number, x: number) => {
    const R = x + W - 1, B = y + H - 1;
    write(y, x, "┌──");
    write(y, R - 2, "──┐");
    write(B, x, "└──");
    write(B, R - 2, "──┘");
  };

  // A shadow one row down and two columns over, so it falls square.
  const shadow = (y: number, x: number) => {
    for (let r = y + 1; r <= y + H; r++) (put(r, x + W, "▒"), put(r, x + W + 1, "▒"));
    for (let c = x + 2; c < x + W; c++) put(y + H, c, "▒");
  };

  const left = Math.floor((cols - 4 * W - 3 * GAP_X) / 2);
  SHEET.forEach((name, i) => {
    const y = 1 + Math.floor(i / 4) * (H + GAP_Y);
    const x = left + (i % 4) * (W + GAP_X);
    if (name === "corners") corners(y, x);
    else if (name === "shade") shade(y, x);
    else frame(y, x, LINES[name]);
    if (name === "shadow") shadow(y, x);
    // The titled frame carries its name in the top edge; the rest inside.
    if (name === "titled") write(y, x + 2, ` ${name} `);
    else write(y + 2, x + Math.floor((W - name.length) / 2), name);
  });

  const picture = grid.map((row) => row.join("")).join("\n");
  return () => picture;
}
