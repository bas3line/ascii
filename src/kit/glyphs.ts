/*
 * The shapes ascii.rest/kit's image module picks characters by, as /make/ does:
 * each character drawn in IBM Plex Mono on a cell of CW by CH pixels and its ink
 * measured in GX by GY blocks, row by row, scaled so the inkiest block of any of
 * them is 1. Made by scripts/kit/glyphs.ts with the site's own code
 * (site/src/lib/glyphs.ts), so the library needs no font: do not edit, run
 * `node scripts/kit/glyphs.ts` again.
 */

/** Blocks across and down a cell, in which a cell's ink is measured. */
export const GX = 2;
export const GY = 4;
/** The cell, in pixels, the shapes were measured on. */
export const CW = 24;
export const CH = 48;
/** What a solid cell is drawn with. */
export const FILL = "8";
/** The characters an edge may be drawn with: no backtick, so a drawing can sit in a String.raw template. */
export const EDGE = ".,:'\"^-_~=/\\|()dbqpPYoO08";

/** A character, and its ink in each of the GX by GY blocks of its cell, 0 to 1. */
export interface Glyph {
  readonly ch: string;
  readonly v: readonly number[];
}

export const GLYPHS: readonly Glyph[] = [
  { ch: ".", v: [0, 0, 0, 0, 0.15573, 0.15566, 0.10222, 0.10207] },
  { ch: ",", v: [0, 0, 0, 0, 0.1372, 0.18145, 0.41383, 0.0891] },
  { ch: ":", v: [0, 0, 0.25802, 0.2578, 0.15573, 0.15566, 0.10222, 0.10207] },
  { ch: "'", v: [0.10585, 0.10585, 0.21273, 0.21273, 0, 0, 0, 0] },
  { ch: "\"", v: [0.21147, 0.2117, 0.42502, 0.42554, 0, 0, 0, 0] },
  { ch: "^", v: [0.0888, 0.0891, 0.71744, 0.75132, 0.10874, 0.11467, 0, 0] },
  { ch: "-", v: [0, 0, 0, 0, 0.36936, 0.36936, 0, 0] },
  { ch: "_", v: [0, 0, 0, 0, 0, 0, 0.53806, 0.53806] },
  { ch: "~", v: [0, 0, 0.28456, 0.09488, 0.40323, 0.59151, 0, 0] },
  { ch: "=", v: [0, 0, 0.48973, 0.48973, 0.48973, 0.48973, 0, 0] },
  { ch: "/", v: [0, 0.24313, 0.01831, 0.63457, 0.55378, 0.09903, 0.40642, 0] },
  { ch: "\\", v: [0.24313, 0, 0.63479, 0.01823, 0.09873, 0.554, 0, 0.40642] },
  { ch: "|", v: [0.1186, 0.1186, 0.31755, 0.31755, 0.31755, 0.31755, 0.19695, 0.19695] },
  { ch: "(", v: [0, 0.26329, 0.46779, 0.17293, 0.59966, 0.0441, 0.03358, 0.39656] },
  { ch: ")", v: [0.26447, 0, 0.17278, 0.46705, 0.0441, 0.59907, 0.39767, 0.03313] },
  { ch: "d", v: [0, 0.22178, 0.62694, 0.93966, 0.84212, 0.83589, 0.24164, 0.22] },
  { ch: "b", v: [0.22178, 0, 0.94003, 0.62664, 0.83582, 0.84167, 0.22044, 0.24127] },
  { ch: "q", v: [0, 0, 0.62694, 0.62108, 0.84212, 0.83589, 0.24164, 0.70388] },
  { ch: "p", v: [0, 0, 0.62145, 0.62664, 0.83582, 0.84167, 0.70432, 0.24127] },
  { ch: "P", v: [0.31755, 0.22052, 0.93373, 1, 0.95916, 0.23097, 0.12282, 0] },
  { ch: "Y", v: [0.14432, 0.14143, 0.83041, 0.81758, 0.42762, 0.42791, 0.06137, 0.06137] },
  { ch: "o", v: [0, 0, 0.54585, 0.54555, 0.79616, 0.79668, 0.19754, 0.19739] },
  { ch: "O", v: [0.20703, 0.20695, 0.8396, 0.83952, 0.84397, 0.8439, 0.19709, 0.19702] },
  { ch: "0", v: [0.20703, 0.20695, 0.92061, 0.92047, 0.9215, 0.92128, 0.19709, 0.19702] },
  { ch: "8", v: [0.24201, 0.24186, 0.92402, 0.92373, 0.92929, 0.92862, 0.23586, 0.23453] },
];
