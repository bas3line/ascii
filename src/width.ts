/*
 * How many cells a character takes on screen. A piece's frame is counted in
 * cells, not in characters: a renderer that advanced one cell per character
 * would draw a full-width character (CJK) into half a cell and crush every
 * glyph after it.
 *
 * These are East Asian Width's Wide and Fullwidth classes, Basic Multilingual
 * Plane only. Characters outside it are two UTF-16 units, which the cell model
 * does not carry: a frame's columns are counted in characters.
 */

/** Cells `code` occupies: 2 when it is drawn full-width, 1 otherwise. */
export function cellWidth(code: number): 1 | 2 {
  return code >= 0x1100 &&
    (code <= 0x115f || // Hangul Jamo initials
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) || // CJK radicals through Yi
      (code >= 0xac00 && code <= 0xd7a3) || // Hangul syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK compatibility ideographs
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) || // fullwidth forms
      (code >= 0xffe0 && code <= 0xffe6))
    ? 2
    : 1;
}
