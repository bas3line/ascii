/*
 * kit mirror: every character's mirror image, left to right and upside down, as
 * compose's flip() turns a piece and spinning() shows a coin's back. Shared by
 * the kit's modules, not part of ascii.rest/kit's API.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 */

// Characters that turn into each other mirrored left to right, and upside down.
const MIRROR_X = [
  "/\\", "()", "<>", "[]", "{}", "┌┐", "└┘", "├┤", "╭╮", "╰╯", "┏┓", "┗┛", "┣┫", "╔╗", "╚╝", "╠╣", "╒╕", "╓╖", "╘╛", "╙╜",
  "╞╡", "╟╢", "┍┑", "┎┒", "┕┙", "┖┚", "┝┥", "┠┨", "▌▐", "▖▗", "▘▝", "▙▟", "▛▜", "▚▞", "▏▕", "◀▶", "◄►", "◁▷", "◢◣", "◤◥",
  "╱╲", "⌐¬", "«»", "‹›", "bd", "pq", "↖↗", "↙↘", "←→", "⇐⇒", "╴╶", "╸╺", "◜◝", "◟◞", "⊂⊃",
];
const MIRROR_Y = [
  "/\\", "▀▄", "┌└", "┐┘", "┬┴", "╭╰", "╮╯", "┏┗", "┓┛", "┳┻", "╔╚", "╗╝", "╦╩", "╒╘", "╕╛", "╓╙", "╖╜", "╤╧", "╥╨", "┍┕",
  "┎┖", "┑┙", "┒┚", "┯┷", "┰┸", "▖▘", "▗▝", "▙▛", "▟▜", "▚▞", "▁▔", "▲▼", "△▽", "◢◥", "◣◤", "╱╲", "^v", "‾_", ".'", ",`",
  "∩∪", "bp", "dq", "MW", "nu", "↑↓", "⇑⇓", "↖↙", "↗↘", "∧∨", "╵╷", "╹╻", "◠◡", "◜◟", "◝◞", "⊓⊔", "⊤⊥",
];
// Braille's dots as bits, the pairs that swap: columns left and right, rows top and bottom.
const DOTS_X = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
const DOTS_Y = [[0x01, 0x40], [0x02, 0x04], [0x08, 0x80], [0x10, 0x20]];

let mirrors: { x: Uint16Array; y: Uint16Array } | null = null;
// Every character's mirror image, by char code, made the first time it is asked for.
export function mirror(): { x: Uint16Array; y: Uint16Array } {
  const make = (pairs: readonly string[], dots: readonly number[][]) => {
    const m = new Uint16Array(65536);
    for (let i = 0; i < m.length; i++) m[i] = i;
    for (const [a, b] of pairs) (m[a.charCodeAt(0)] = b.charCodeAt(0)), (m[b.charCodeAt(0)] = a.charCodeAt(0));
    for (let k = 0; k < 256; k++) m[0x2800 + k] = 0x2800 + dots.reduce((v, [a, b]) => v | (k & a ? b : 0) | (k & b ? a : 0), 0);
    return m;
  };
  return (mirrors ??= { x: make(MIRROR_X, DOTS_X), y: make(MIRROR_Y, DOTS_Y) });
}
