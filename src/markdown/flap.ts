/*
 * flap: a split-flap sign, as a station's departures board is. Every tile
 * starts blank and flips through its cards, one after another in a fixed
 * order, until it clacks onto its letter, the tiles starting left to right and
 * row after row. A release day's board in a changelog, a sign on a README.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii flap
 *   now boarding
 *   v0.5 gate npm
 *   ```
 *
 *   flap("now boarding\nv0.5 gate npm")
 *   flap({ rows: ["now boarding", "v0.5 gate npm"] }, { width: 41 })
 */
import { fail } from "../kit/core.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, linesOf, show, type Common, type MarkdownPiece } from "./core.ts";

/** A sign as data: what a fence's body says, for rows already in JavaScript. */
export interface FlapData {
  /** The sign's rows, top to bottom, each drawn in capitals a tile a character: ["now boarding", "v0.5 gate npm"]. */
  rows: string[];
}

/** A flap sign takes the options every figure takes, and none of its own. */
export interface FlapOptions extends Common {}

/** The cards on every tile's drum, in the order they turn up: a blank, A to Z, 0 to 9, then . - : / ' ! ? &. */
export const FLAPS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-:/'!?&";

// Seconds a card takes to turn, and between one tile starting and the next; the longest its build may take, quicker
// cards and starts fitting a big sign into it; how long a tile that has just landed shows in the accent; the most rows.
const STEP = 0.035, STAGGER = 0.025, LONGEST_BUILD = 2.4, CLACK = 0.12, ROWS = 12;

const cut = (text: string) => (text.length > 40 ? `${text.slice(0, 40)}...` : text);

// Data, checked: each row cleaned, in capitals, every character one a tile carries.
function check(data: FlapData): { rows: string[]; said: string[] } {
  if (!data || typeof data !== "object" || !Array.isArray(data.rows)) fail(`flap() takes a fence's body, its sign's rows a line each, or { rows: ["now boarding"] }, not ${show(data)}`);
  if (!data.rows.length) fail(`flap takes the rows of its sign, a line each, such as now boarding`);
  if (data.rows.length > ROWS) fail(`flap's sign has up to ${ROWS} rows, not ${data.rows.length}: split it into two signs`);
  const said: string[] = [];
  const rows = data.rows.map((r, i) => {
    if (typeof r !== "string") fail(`flap's row ${i + 1} takes words, not ${show(r)}`);
    const row = clean(r, `flap's row ${i + 1}`).replace(/\s+$/, "");
    for (const ch of row.toUpperCase()) {
      if (!FLAPS.includes(ch))
        fail(`flap's tiles carry A to Z, 0 to 9, a space and . - : / ' ! ? &, and row ${i + 1} has ${show(ch)}${ch === '"' ? ": write the row bare, with no quotes" : ""}, in ${show(cut(row))}`);
    }
    if (row.trim()) said.push(row.trim().replace(/\s+/g, " "));
    return row.toUpperCase();
  });
  if (!said.length) fail(`flap takes the rows of its sign, a line each, such as now boarding, and these are all blank`);
  return { rows, said };
}

/**
 * A split-flap sign from a fence's body, a row a line, or { rows }. Unframed by default: the tiles' own grid is its
 * frame. Every tile flips through its cards onto its letter, the tiles starting left to right and row after row,
 * each clacking down in the accent; then it holds. With `width`, the sign has as many tiles as the width holds, the
 * rows at their left and blank tiles after them, as a board of a fixed size. Its still is every tile landed.
 *
 *   flap("now boarding\nv0.5 gate npm")
 *   flap("arrivals", { frame: "rounded", title: "release day", width: 41 })
 */
export function flap(source: string | FlapData, options?: FlapOptions): MarkdownPiece {
  const { rows, said } = check(typeof source === "string" ? { rows: linesOf(source) } : source);
  return component(
    "flap",
    options,
    [],
    (o, room) => {
      // A tile is its letter and the wall after it, with one wall more at the left: 2n + 1 columns for n tiles.
      const longest = Math.max(...rows.map((r) => r.length));
      const most = Math.floor(((room.cols ?? room.max) - 1) / 2);
      if (longest > most) {
        const row = rows.findIndex((r) => r.length === longest) + 1;
        if (room.cols !== undefined) {
          const extra = o.width! - room.cols;
          fail(`flap needs ${2 * longest + 1 + extra} columns for row ${row}'s ${longest} tiles, and its width is ${o.width}: give it a width of ${2 * longest + 1 + extra} or more, or a shorter row`);
        }
        fail(`flap's sign is up to ${most} tiles wide, and row ${row} has ${longest}: ${show(cut(rows[row - 1].toLowerCase()))}. Shorter rows, or split it into two signs`);
      }
      const tiles = room.cols !== undefined ? most : longest;
      const board = rows.map((r) => r.padEnd(tiles));
      // When each tile starts and how many cards it turns: the cards before its letter on the drum.
      const turns = board.map((r) => [...r].map((ch) => FLAPS.indexOf(ch)));
      let natural = 0;
      turns.forEach((row, y) => row.forEach((n, x) => n && (natural = Math.max(natural, (x + y) * STAGGER + n * STEP))));
      const k = natural > LONGEST_BUILD ? LONGEST_BUILD / natural : 1;
      const step = STEP * k, stagger = STAGGER * k;
      const intro = natural * k;
      const W = 2 * tiles + 1, H = 2 * rows.length + 1;
      return {
        cols: W,
        rows: H,
        intro,
        says: `flap: ${said.join("; ")}.`,
        draw(s, t, at) {
          // the grid: ┌─┬─┐ over the first row, ├─┼─┤ between rows, └─┴─┘ under the last, │ between tiles
          for (let y = 0; y < H; y++) {
            const edge = y === 0 ? "┌┬┐" : y === H - 1 ? "└┴┘" : y % 2 === 0 ? "├┼┤" : null;
            for (let x = 0; x < W; x++) {
              if (edge) s.set(at.x + x, at.y + y, x % 2 ? "─" : x === 0 ? edge[0] : x === W - 1 ? edge[2] : edge[1], QUIET);
              else if (x % 2 === 0) s.set(at.x + x, at.y + y, "│", QUIET);
            }
          }
          // the tiles: each turns a card every step from its start, soft while it turns, in the accent as it lands
          turns.forEach((row, y) =>
            row.forEach((n, x) => {
              if (!n) return;
              const from = (x + y) * stagger;
              const done = Math.max(0, Math.min(n, Math.floor((t - from) / step + 1e-9)));
              const landed = from + n * step;
              const tone = done < n ? SOFT : !at.still && t - landed < CLACK ? ACCENT : INK;
              s.set(at.x + 2 * x + 1, at.y + 2 * y + 1, FLAPS[done], tone);
            }),
          );
        },
      };
    },
    { frame: "none" },
  );
}
