/*
 * The play time of the frame each playing piece shows, by the element it plays
 * in. The layout's script writes it; a piece page's downloads read it, so a
 * PNG is the frame on screen.
 */
export const shown = new WeakMap<Element, number>();
