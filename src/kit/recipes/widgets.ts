/*
 * kit recipes, widgets: whole things in one call, and placing things with
 * words. A clock face, a progress bar, a spinner, a gauge, a sparkline, a bar
 * chart, a panel round anything, a card, a typewriter, a marquee and a
 * countdown, each a normal piece with defaults that look right and options
 * in plain words. Each is a few lines of the kit's own drawing, rect(),
 * text(), arc(), braille(), and its own makers, border(), sequence(),
 * typeIn(), so read one to write your own. For drawing of your own, at() and
 * textAt() place by anchor words, ring() spaces points round a circle (a
 * clock's numbers), and inset(), across(), down(), tiles() and slot() cut a
 * room into parts, so a layout needs no sums.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { barChart, clockFace, gauge, progressBar, spinner } from "ascii.rest/kit";
 *
 *   export const clock = clockFace();
 *   export const load = gauge({ label: "cpu" });
 *   export const sales = barChart({ mon: 3, tue: 5, wed: 4, thu: 8, fri: 6 });
 *   export const busy = spinner("dots", { label: "installing" });
 */
import type { Piece } from "../../types.ts";
import { banner, type FontName } from "../../banner.ts";
import { INK, Palette, Surface, TAU, fail, piece, type Color, type KitPiece, type PaletteSpec, type Region } from "../core.ts";
import { arc, braille, circle, label, line, ray, rect, text, type BoxStyle, type Point } from "../draw.ts";
import { border, layer, sequence, type Anchor } from "../compose.ts";
import { typeIn } from "../fx.ts";
import { ease, loopNoise } from "../math.ts";
import { NAMING, boolOf, colorOf, numberOf, optionsOf, secondsOf, show, speedOf, titled, wholeOf, wordOf, type Speed } from "./checks.ts";
import { drifting } from "./motion.ts";
import { palette, type ColorLike, type PaletteLike } from "./palettes.ts";
import { pieceOf, type Thing } from "./words.ts";

// --- placing by words ------------------------------------------------------------------------

/** Room to place things in: the grid a drawing is given, or a region of it, such as the inside rect() returns. */
export type Room = Surface | Region | { readonly cols: number; readonly rows: number; readonly x?: number; readonly y?: number };

const ANCHORS: readonly Anchor[] = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];

// A room as a region: a grid's is all of it.
function roomOf(r: Room, what: string): Region {
  const g = r as { x?: unknown; y?: unknown; cols?: unknown; rows?: unknown };
  if (!r || typeof r !== "object" || typeof g.cols !== "number" || typeof g.rows !== "number")
    fail(`${what} takes the grid, or a region { x, y, cols, rows }, to place in, not ${show(r)}`);
  const x = r instanceof Surface ? 0 : ((g.x as number | undefined) ?? 0), y = r instanceof Surface ? 0 : ((g.y as number | undefined) ?? 0);
  return { x, y, cols: g.cols as number, rows: g.rows as number };
}

const anchorOf = (what: string, v: unknown, def: Anchor) => wordOf(what, v, ANCHORS, def);

/**
 * The point at an anchor of a room, "center" by default, `margin` cells (0) in from the edges it is against: the
 * middle of the cell in the corner or on the edge, or the room's middle. For a point to draw about, circle(s, ...at(s)),
 * or a label() centred on it; textAt() puts text against an edge instead.
 *
 *   circle(s, ...at(s), 8);                      // a circle in the middle
 *   label(s, ...at(s, "top", { margin: 1 }), "hi");
 */
export function at(room: Room, anchor: Anchor = "center", o?: { margin?: number }): Point {
  const r = roomOf(room, "at()");
  const a = anchorOf("at()'s anchor", anchor, "center");
  const m = numberOf("at()'s margin", optionsOf("at()", o, ["margin"]).margin, 0, 0);
  const x = a.endsWith("left") ? r.x + m + 0.5 : a.endsWith("right") ? r.x + r.cols - m - 0.5 : r.x + r.cols / 2;
  const y = a.startsWith("top") ? r.y + m + 0.5 : a.startsWith("bottom") ? r.y + r.rows - m - 0.5 : r.y + r.rows / 2;
  return [x, y];
}

/**
 * Text against an anchor of a room, "center" by default: in its top left corner, along its bottom edge, in its middle,
 * `margin` cells (0) in from the edges, wrapped to the room's width. Returns the region it takes, as text() does.
 *
 *   textAt(s, "score 3", "top-right", { margin: 1 });
 *   textAt(s, "press start", "bottom", { color: 1 });
 */
export function textAt(s: Surface, str: string | number, anchor: Anchor = "center", o?: { margin?: number; color?: Color; within?: Region }): Region {
  const p = optionsOf("textAt()", o, ["margin", "color", "within"]);
  const a = anchorOf("textAt()'s anchor", anchor, "center");
  const box = inset(p.within ?? s, numberOf("textAt()'s margin", p.margin, 0, 0));
  const align = a.endsWith("left") ? "left" : a.endsWith("right") ? "right" : "center";
  const valign = a.startsWith("top") ? "top" : a.startsWith("bottom") ? "bottom" : "middle";
  return text(s, box, str, { align, valign, color: p.color });
}

/**
 * `count` points evenly round a circle in a room, the first at the top and on clockwise, as a clock's numbers go: point
 * 3 of 12 is where the 3 is. The circle is about `at`, an anchor or a point ("center"), `radius` columns out (by
 * default as big as fits, a cell in from the edges), squashed down the rows so it looks round on tall cells.
 *
 *   ring(s, 12).forEach((p, hour) => label(s, ...p, hour || 12));   // a clock's numbers
 *   for (const p of ring(s, 8, { radius: 10 })) s.set(...p, "*");   // eight stars round a circle
 */
export function ring(room: Room, count: number, o?: { radius?: number; at?: Anchor | Point }): Point[] {
  const r = roomOf(room, "ring()");
  const p = optionsOf("ring()", o, ["radius", "at"]);
  const n = wholeOf("ring()'s count", count, 12, 1, 10000);
  const aspect = room instanceof Surface ? room.aspect : 2;
  const [cx, cy] = Array.isArray(p.at) ? (p.at as Point) : at(r, anchorOf("ring()'s at", p.at, "center"));
  const fits = Math.max(0.5, Math.min(r.cols / 2 - 1, (r.rows / 2 - 1) * aspect));
  const radius = numberOf("ring()'s radius", p.radius, fits, 0);
  // A hair in from the radius, as draw's around() takes it, so cells either side of the middle mirror each other.
  const k = radius * (1 - 1e-9);
  return Array.from({ length: n }, (_, i) => [cx + Math.sin((TAU * i) / n) * k, cy - (Math.cos((TAU * i) / n) * k) / aspect] as Point);
}

/** A room with `margin` cells taken off every side, or [rows, columns] off top and bottom and off left and right. */
export function inset(room: Room, margin: number | readonly [number, number]): Region {
  const r = roomOf(room, "inset()");
  const [my, mx] = typeof margin === "number" ? [margin, margin] : Array.isArray(margin) && margin.length === 2 ? margin : fail(`inset() takes a margin in cells, or [rows, columns], not ${show(margin)}`);
  numberOf("inset()'s margin", my, 0, 0);
  numberOf("inset()'s margin", mx, 0, 0);
  return { x: r.x + mx, y: r.y + my, cols: Math.max(0, r.cols - 2 * mx), rows: Math.max(0, r.rows - 2 * my) };
}

// Lengths that share `total` cells by weight, `gap` between each, as whole cells that add up.
function share(total: number, parts: number | readonly number[], gap: number, what: string): [number, number][] {
  const weights = typeof parts === "number" ? Array(wholeOf(what, parts, 1, 1, 1000)).fill(1) : Array.isArray(parts) && parts.length ? parts : fail(`${what} takes a number of parts, or their weights such as [1, 2], not ${show(parts)}`);
  for (const w of weights) numberOf(`${what}'s weights`, w, 1, 0);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const room = Math.max(0, total - gap * (weights.length - 1));
  let at = 0, used = 0;
  return weights.map((w, i) => {
    used += w;
    const end = Math.round((room * used) / sum);
    const span: [number, number] = [at + i * gap, end - at];
    at = end;
    return span;
  });
}

/**
 * A room cut into parts side by side, left to right: `parts` of them alike, or a list of weights, [1, 2] giving the
 * second twice the first's width; `gap` blank columns between (0). Each is a region to draw in.
 *
 *   const [left, right] = across(s, [1, 2], { gap: 1 });
 *   text(s, left, "menu");
 */
export function across(room: Room, parts: number | readonly number[], o?: { gap?: number }): Region[] {
  const r = roomOf(room, "across()");
  const gap = wholeOf("across()'s gap", optionsOf("across()", o, ["gap"]).gap, 0, 0);
  return share(r.cols, parts, gap, "across()").map(([x, cols]) => ({ x: r.x + x, y: r.y, cols, rows: r.rows }));
}

/** A room cut into parts one under another, top to bottom: as across(), in rows. */
export function down(room: Room, parts: number | readonly number[], o?: { gap?: number }): Region[] {
  const r = roomOf(room, "down()");
  const gap = wholeOf("down()'s gap", optionsOf("down()", o, ["gap"]).gap, 0, 0);
  return share(r.rows, parts, gap, "down()").map(([y, rows]) => ({ x: r.x, y: r.y + y, cols: r.cols, rows }));
}

/**
 * A room cut into a grid of tiles, `columns` across and `rows` down (as many as `columns` by default), `gap` blank cells
 * between them, [rows, columns] or one number for both (0), in reading order.
 *
 *   tiles(s, { columns: 3, rows: 2, gap: 1 }).forEach((tile, i) => rect(s, tile.x, tile.y, tile.cols, tile.rows, { title: `${i + 1}` }));
 */
export function tiles(room: Room, o: { columns: number; rows?: number; gap?: number | readonly [number, number] }): Region[] {
  const p = optionsOf("tiles()", o, ["columns", "rows", "gap"]);
  const columns = wholeOf("tiles()'s columns", p.columns, 2, 1, 1000);
  const rows = wholeOf("tiles()'s rows", p.rows, columns, 1, 1000);
  const [gy, gx] = p.gap === undefined ? [0, 0] : typeof p.gap === "number" ? [p.gap, p.gap] : p.gap;
  return down(room, rows, { gap: gy }).flatMap((band) => across(band, columns, { gap: gx }));
}

/**
 * A box `cols` by `rows` at an anchor of a room ("center"), `margin` cells (0) in from the edges it is against: where
 * to put a panel in a corner, a button at the bottom.
 *
 *   const badge = slot(s, "bottom-right", { cols: 12, rows: 3, margin: 1 });
 *   rect(s, badge.x, badge.y, badge.cols, badge.rows, { style: "rounded" });
 */
export function slot(room: Room, anchor: Anchor, o: { cols: number; rows: number; margin?: number }): Region {
  const r = roomOf(room, "slot()");
  const a = anchorOf("slot()'s anchor", anchor, "center");
  const p = optionsOf("slot()", o, ["cols", "rows", "margin"]);
  const w = wholeOf("slot()'s cols", p.cols, 1, 1), h = wholeOf("slot()'s rows", p.rows, 1, 1), m = wholeOf("slot()'s margin", p.margin, 0, 0);
  const x = a.endsWith("left") ? r.x + m : a.endsWith("right") ? r.x + r.cols - w - m : r.x + Math.floor((r.cols - w) / 2);
  const y = a.startsWith("top") ? r.y + m : a.startsWith("bottom") ? r.y + r.rows - h - m : r.y + Math.floor((r.rows - h) / 2);
  return { x, y, cols: w, rows: h };
}

// --- the widgets' colours ----------------------------------------------------------------------

// GitHub's colours, each for paper and for a dark page: the widgets' palette, in this order.
const TONES = {
  ink: INK,
  accent: { light: "#0969da", dark: "#58a6ff" },
  muted: { light: "#8c959f", dark: "#6e7681" },
  good: { light: "#1a7f37", dark: "#3fb950" },
  warn: { light: "#9a6700", dark: "#d29922" },
  bad: { light: "#cf222e", dark: "#f85149" },
};
// A widget's colours as palette indices, the ink being 0 and the default: draw with these.
const ACCENT = 1, MUTED = 2, GOOD = 3, WARN = 4, BAD = 5;

// One colour for both pages, one for each, or a palette's strong colour on each, checked.
const themed = colorOf;

// The widgets' palette, its accent the colour given, and any colours of the widget's own after it.
function tones(accent?: { light: string; dark: string }, more: readonly { light: string; dark: string }[] = []): PaletteSpec {
  const list = [TONES.ink, accent ?? TONES.accent, TONES.muted, TONES.good, TONES.warn, TONES.bad, ...more];
  return { light: list.map((c) => c.light), dark: list.map((c) => c.dark) };
}

// Text as a grid in one colour, for a maker that takes a source: one colour for both pages or one for each.
function inked(str: string, color: { light: string; dark: string } | undefined, width?: number): Surface {
  const lines = str.replace(/\r\n?/g, "\n");
  const scratch = new Surface(width ?? Math.max(1, ...lines.split("\n").map((l) => l.length)), 120);
  const box = text(scratch, 0, 0, lines, width ? { width } : {});
  const s = new Surface(Math.max(1, width ?? box.cols), Math.max(1, box.rows), { palette: color ? new Palette({ light: [color.light], dark: [color.dark] }) : null });
  text(s, 0, 0, lines, { ...(width ? { width } : {}), ...(color ? { color: 0 } : {}) });
  return s;
}

const WIDGET = ["color", ...NAMING] as const;

// A widget's name and note: the user's, or its own.
const naming = (o: { name?: string; note?: string }, name: string, note: string) => ({ name: o.name ?? name, note: (o.note ?? note).slice(0, 72) });

// --- clock face ------------------------------------------------------------------------------------

export interface ClockFaceOptions {
  /** The time the hour and minute hands show, as "h:mm": "10:10", a watchmaker's favourite. The second hand goes round once a minute of play. */
  time?: string;
  /** true: the viewer's real time instead, from their clock (the piece is then a clock: svg() can't loop it): false. */
  real?: boolean;
  /** "small" (25 by 13, the quarters numbered), "medium" (41 by 21, the default) or "large" (61 by 29). */
  size?: "small" | "medium" | "large";
  /** Which hours are numbered: "all" (the default, but "quarters" when small), "quarters" (12, 3, 6, 9) or "none". */
  numbers?: "all" | "quarters" | "none";
  /** A rounded frame round it, with `title` on its top edge: true. */
  frame?: boolean;
  /** Words on the frame's top edge: none. */
  title?: string;
  /** The second hand's colour, as #rrggbb, { light, dark } or a palette's name: red. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * A clock face: a round dial, its hours numbered, three hands and a red second hand going round once a minute. With no
 * options it shows ten past ten, and loops on the minute; `real: true` shows the time where it is seen.
 *
 *   clockFace()
 *   clockFace({ size: "small", time: "4:20", title: "tea" })
 */
export function clockFace(o?: ClockFaceOptions): KitPiece {
  const p = optionsOf("clockFace()", o, ["time", "real", "size", "numbers", "frame", "title", ...WIDGET]);
  const size = wordOf("clockFace's size", p.size, ["small", "medium", "large"] as const, "medium");
  const numbers = wordOf("clockFace's numbers", p.numbers, ["all", "quarters", "none"] as const, size === "small" ? "quarters" : "all");
  const real = boolOf("clockFace's real", p.real, false);
  const framed = boolOf("clockFace's frame", p.frame, true);
  if (p.title !== undefined && typeof p.title !== "string") fail(`clockFace's title takes words, not ${show(p.title)}`);
  const time = p.time ?? "10:10";
  const hm = /^(\d{1,2}):(\d{2})$/.exec(String(time));
  if (!hm || +hm[1] > 23 || +hm[2] > 59) fail(`clockFace's time takes "h:mm", such as "10:10", not ${show(time)}`);
  const [h0, m0] = [+hm![1] % 12, +hm![2]];
  const { cols, rows } = { small: { cols: 25, rows: 13 }, medium: { cols: 41, rows: 21 }, large: { cols: 61, rows: 29 } }[size];
  const second = themed("clockFace's color", p.color) ?? TONES.bad;
  return piece({ ...naming(p, "clock", real ? "a clock face showing the time" : `a clock face at ${time}, its second hand going round`), category: "objects", cols, rows, fps: 4, palette: tones(second), ...(real ? { clock: true } : { loop: 60 }) }, (t, s) => {
    const [x, y] = at(s);
    if (framed) rect(s, 0, 0, cols, rows, { style: "rounded", title: p.title, color: MUTED });
    // the dial's radius in columns: the frame's inside, or the whole
    const r = (rows / 2 - (framed ? 1.5 : 0.5)) * s.aspect;
    circle(s, x, y, r, { char: "auto", color: MUTED });
    // the time: the one given and the play time's seconds, or the real time
    const now = real ? new Date() : null;
    const sec = now ? now.getSeconds() : Math.floor(t) % 60;
    const min = now ? now.getMinutes() : m0, hr = now ? now.getHours() % 12 : h0;
    ray(s, x, y, r * 0.4, (hr + min / 60) / 12);
    ray(s, x, y, r * 0.62, min / 60);
    ray(s, x, y, r * 0.72, sec / 60, { color: ACCENT });
    s.set(x, y, "o", ACCENT);
    // the numbers last, so a hand passing never hides one
    ring(s, 12, { radius: r - 3 }).forEach((point, hour) => {
      if (numbers === "all" || (numbers === "quarters" && hour % 3 === 0)) label(s, ...point, hour || 12);
    });
  });
}

// --- progress bar ------------------------------------------------------------------------------------

export interface ProgressBarOptions {
  /** How far along, 0 to 1: a still bar at that. None by default: it fills over `seconds`, holds a second, and fills again. */
  value?: number;
  /** Words before the bar: none. */
  label?: string;
  /** The bar's length in columns: 30. */
  width?: number;
  /** "blocks" (the default): a smooth bar of █ in eighths over ░; "ascii": [####----]; "dots": ●●●○○○. */
  style?: "blocks" | "ascii" | "dots";
  /** The percentage after the bar: true. */
  percent?: boolean;
  /** Seconds it takes to fill when it has no value: 4. */
  seconds?: number;
  /** The bar's colour, as #rrggbb, { light, dark } or a palette's name: blue, and green once full. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

const EIGHTHS = "▏▎▍▌▋▊▉█";

/**
 * A progress bar: a label, a bar and how far along, in one row. With a `value` it is a still at that; without, it fills
 * smoothly over 4 seconds, turns green, and fills again.
 *
 *   progressBar({ label: "downloading" })
 *   progressBar({ value: 0.42, style: "ascii" })
 */
export function progressBar(o?: ProgressBarOptions): KitPiece {
  const p = optionsOf("progressBar()", o, ["value", "label", "width", "style", "percent", "seconds", ...WIDGET]);
  const value = p.value === undefined ? undefined : numberOf("progressBar's value", p.value, 0, 0, 1);
  if (p.label !== undefined && typeof p.label !== "string") fail(`progressBar's label takes words, not ${show(p.label)}`);
  const label = p.label ? `${p.label} ` : "";
  const width = wholeOf("progressBar's width", p.width, 30, 3, 300);
  const style = wordOf("progressBar's style", p.style, ["blocks", "ascii", "dots"] as const, "blocks");
  const percent = boolOf("progressBar's percent", p.percent, true);
  const fill = numberOf("progressBar's seconds", p.seconds, 4, 0.1, 59);
  const smooth = ease.inOutSine;
  const loop = fill + 1;
  const cols = label.length + width + (percent ? 5 : 0);
  return piece({ ...naming(p, label.trim() || "progress", value === undefined ? "a progress bar filling" : `a progress bar at ${Math.round(value * 100)}%`), category: "ui", cols, rows: 1, fps: value === undefined ? 24 : 0, palette: tones(themed("progressBar's color", p.color)), ...(value === undefined ? { loop } : {}) }, (t, s) => {
    const k = value ?? smooth(Math.min(1, (((t % loop) + loop) % loop) / fill));
    const color = k >= 1 ? GOOD : ACCENT;
    s.write(0, 0, label);
    const x = label.length;
    if (style === "ascii") {
      const n = Math.round(k * (width - 2));
      s.write(x, 0, "[", MUTED);
      for (let i = 0; i < width - 2; i++) s.set(x + 1 + i, 0, i < n ? "#" : "-", i < n ? color : MUTED);
      s.write(x + width - 1, 0, "]", MUTED);
    } else if (style === "dots") {
      const n = Math.round(k * width);
      for (let i = 0; i < width; i++) s.set(x + i, 0, i < n ? "●" : "○", i < n ? color : MUTED);
    } else {
      // whole cells of █, then the eighth the next cell is filled to, then the track
      const eighths = Math.round(k * width * 8);
      for (let i = 0; i < width; i++) {
        const e = eighths - i * 8;
        s.set(x + i, 0, e >= 8 ? "█" : e > 0 ? EIGHTHS[e - 1] : "░", e > 0 ? color : MUTED);
      }
    }
    if (percent) s.write(x + width, 0, `${Math.round(k * 100)}%`.padStart(5));
  });
}

// --- spinner -------------------------------------------------------------------------------------------

/** The spinners by name, each its frames in order: the ones terminals show while they wait. */
export const spinners = {
  dots: "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏",
  line: "-\\|/",
  arc: "◜◠◝◞◡◟",
  circle: "◐◓◑◒",
  bounce: "⠁⠂⠄⡀⢀⠠⠐⠈",
  blocks: "▖▘▝▗",
  grow: "▁▂▃▄▅▆▇█▇▆▅▄▃▂",
  arrows: "←↖↑↗→↘↓↙",
  pulse: "·•●•",
} as const;

/** A spinner's name, a key of `spinners`. */
export type SpinnerName = keyof typeof spinners;

export interface SpinnerOptions {
  /** Words after it: none. */
  label?: string;
  /** How fast: "slow", "normal" (a frame every tenth of a second) or "fast", or times as fast. */
  speed?: Speed;
  /** Its colour, as #rrggbb, { light, dark } or a palette's name: blue. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * A spinner, the kind a terminal shows while it works: "dots" (the default), "line", "arc", "circle", "bounce",
 * "blocks", "grow", "arrows" or "pulse", with words after it if you like.
 *
 *   spinner("dots", { label: "installing" })
 */
export function spinner(kind: SpinnerName = "dots", o?: SpinnerOptions): KitPiece {
  const name = wordOf("spinner()", kind, Object.keys(spinners) as SpinnerName[], "dots");
  const p = optionsOf("spinner()", o, ["label", "speed", ...WIDGET]);
  if (p.label !== undefined && typeof p.label !== "string") fail(`spinner's label takes words, not ${show(p.label)}`);
  const frames = spinners[name];
  const loop = secondsOf("spinner()", p, frames.length / 10);
  const words = p.label ? ` ${p.label}` : "";
  return piece({ ...naming(p, p.label || `${name} spinner`, `a ${name} spinner${words ? `,${words}` : ""}`), category: "ui", cols: 1 + words.length, rows: 1, fps: 30, palette: tones(themed("spinner's color", p.color)), loop }, (t, s) => {
    // the frame t is in, a hair past each step so a frame's own moment shows it
    const k = Math.floor(((((t % loop) + loop) % loop) * frames.length) / loop + 1e-9);
    s.set(0, 0, frames[Math.min(frames.length - 1, k)], ACCENT);
    s.write(1, 0, words);
  });
}

// --- gauge -------------------------------------------------------------------------------------------

export interface GaugeOptions {
  /** The reading, from `min` to `max`: a still at that. None by default: a live reading wandering up and down, looping every 8 seconds. */
  value?: number;
  /** Its name, on the frame's top edge: none. */
  label?: string;
  /** The reading's lowest and highest: 0 and 100. */
  min?: number;
  max?: number;
  /** After the number: "%". */
  unit?: string;
  /** The dial's colour, as #rrggbb, { light, dark } or a palette's name: by the reading, green, then yellow past 60%, then red past 85%. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * A gauge: a dial three quarters round, filled to its reading, the number in its middle, in a rounded frame with its
 * label. Green, yellow and red by how high the reading is.
 *
 *   gauge({ label: "cpu" })
 *   gauge({ value: 72, label: "disk" })
 */
export function gauge(o?: GaugeOptions): KitPiece {
  const p = optionsOf("gauge()", o, ["value", "label", "min", "max", "unit", ...WIDGET]);
  const min = numberOf("gauge's min", p.min, 0), max = numberOf("gauge's max", p.max, 100);
  if (!(max > min)) fail(`gauge's max takes a number above its min, ${min}, not ${show(p.max)}`);
  const value = p.value === undefined ? undefined : numberOf("gauge's value", p.value, min, min, max);
  if (p.label !== undefined && typeof p.label !== "string") fail(`gauge's label takes words, not ${show(p.label)}`);
  const unit = p.unit === undefined ? "%" : typeof p.unit === "string" ? p.unit : fail(`gauge's unit takes words, such as "%", not ${show(p.unit)}`);
  const own = themed("gauge's color", p.color);
  const loop = 8;
  // A live reading: smooth noise that comes round every loop, kept between a sixth and nineteen twentieths.
  const live = (t: number) => 0.15 + 0.8 * loopNoise(0.3, 0.7, t, loop, { radius: 0.9 });
  return piece({ ...naming(p, p.label || "gauge", value === undefined ? "a gauge, its reading rising and falling" : `a gauge reading ${value}${unit}`), category: "data", cols: 25, rows: 12, fps: value === undefined ? 24 : 0, palette: tones(own), ...(value === undefined ? { loop } : {}) }, (t, s) => {
    const k = value === undefined ? live(t) : (value - min) / (max - min);
    const color = own ? ACCENT : k > 0.85 ? BAD : k > 0.6 ? WARN : GOOD;
    rect(s, 0, 0, s.cols, s.rows, { style: "rounded", title: p.label, color: MUTED });
    arc(s, 12.5, 7, 9, -0.375, 0.375, { char: "░", color: MUTED });
    arc(s, 12.5, 7, 9, -0.375, -0.375 + 0.75 * k, { char: "█", color });
    label(s, 12.5, 7, `${Math.round(min + k * (max - min))}${unit}`);
  });
}

// --- sparkline -----------------------------------------------------------------------------------------

export interface SparklineOptions {
  /** Words before it: none. */
  label?: string;
  /** Its length in columns: 32. */
  width?: number;
  /** Its height in rows: 3. */
  height?: number;
  /** Shades the area under the line: true. */
  fill?: boolean;
  /** Its colour, as #rrggbb, { light, dark } or a palette's name: blue. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * A sparkline: a small, smooth line chart in braille, its latest number after it. Given numbers, it draws itself in
 * from the left, holds, and draws again; given none, it is a live reading scrolling left, looping every 12 seconds.
 *
 *   sparkline([3, 5, 2, 8, 6, 9, 4, 7], { label: "visits" })
 *   sparkline({ label: "net" })   // live
 */
export function sparkline(data?: readonly number[] | SparklineOptions, o?: SparklineOptions): KitPiece {
  // Options alone, for a live reading.
  if (data !== undefined && data !== null && typeof data === "object" && !Array.isArray(data)) {
    if (o !== undefined) fail("sparkline() takes numbers then options, or options alone for a live reading, not two lots of options");
    [data, o] = [undefined, data as SparklineOptions];
  }
  const p = optionsOf("sparkline()", o, ["label", "width", "height", "fill", ...WIDGET]);
  if (data !== undefined && (!Array.isArray(data) || data.length < 2 || !data.every((v) => typeof v === "number" && Number.isFinite(v))))
    fail(`sparkline() takes a list of two or more numbers, such as [3, 5, 2, 8], not ${show(data)}`);
  if (p.label !== undefined && typeof p.label !== "string") fail(`sparkline's label takes words, not ${show(p.label)}`);
  const words = p.label ? `${p.label} ` : "";
  const width = wholeOf("sparkline's width", p.width, 32, 2, 300), height = wholeOf("sparkline's height", p.height, 3, 1, 100);
  const fill = boolOf("sparkline's fill", p.fill, true);
  const list = data ? [...data] : null;
  const lo = list ? Math.min(...list) : 0, hi = list ? Math.max(...list) : 1;
  // Drawing in takes 1.5 seconds and holds 3; the live reading comes round every 12.
  const loop = list ? 4.5 : 12;
  const reading = (x: number) => 0.1 + 0.8 * loopNoise(0.4, 0.2, x, loop, { radius: 1.4 });
  const last = list ? String(+list[list.length - 1].toFixed(2)) : "100";
  const cols = words.length + width + 1 + last.length;
  return piece({ ...naming(p, p.label || "sparkline", list ? "a sparkline drawing itself in" : "a sparkline of a live reading"), category: "data", cols, rows: height, fps: 24, palette: tones(themed("sparkline's color", p.color)), loop }, (t, s) => {
    const u = ((t % loop) + loop) % loop;
    textAt(s, words, "left");
    const area = { x: words.length, y: 0, cols: width, rows: height };
    const b = braille(s, area);
    if (list) b.plot(list, { y0: lo, y1: hi, fill, color: ACCENT });
    else b.plot(reading, { x0: t - width / 4, x1: t, y0: 0, y1: 1, fill, color: ACCENT });
    b.draw();
    if (list) {
      // drawn in from the left: the cells past the edge so far are cleared
      const edge = Math.round(width * Math.min(1, u / 1.5));
      s.clear({ x: area.x + edge, y: 0, cols: width - edge, rows: height });
      if (edge >= width) textAt(s, last, "right");
    } else textAt(s, String(Math.round(reading(t) * 100)), "right");
  });
}

// --- bar chart ------------------------------------------------------------------------------------------

export interface BarChartOptions {
  /** Bars lying along rows, their names on the left: false, standing up, their names under them. */
  horizontal?: boolean;
  /** The longest bar's length: 10 rows standing up, 30 columns lying down. */
  size?: number;
  /** The value a full bar stands for: the largest value. */
  max?: number;
  /** Each bar's value at its end: true. */
  values?: boolean;
  /** One colour for every bar, as #rrggbb, { light, dark } or a palette's name: by default each bar its own. */
  color?: ColorLike;
  /** Seconds the bars take to grow in, one just after another: 0.8. 0 draws them grown, a still. */
  seconds?: number;
  /** Seconds they stay before growing again: 3. */
  hold?: number;
  name?: string;
  note?: string;
}

// Each bar's own colour, by turns: blue, green, yellow, red, purple, pink.
const BARS = [
  { light: "#0969da", dark: "#58a6ff" },
  { light: "#1a7f37", dark: "#3fb950" },
  { light: "#9a6700", dark: "#d29922" },
  { light: "#cf222e", dark: "#f85149" },
  { light: "#8250df", dark: "#bc8cff" },
  { light: "#bf3989", dark: "#ff80c8" },
];

const RISE = "▁▂▃▄▅▆▇█";

/**
 * A bar chart: a bar for each value, each in its own colour, growing in one after another with a little overshoot,
 * holding, and growing again. Give it names and values, { mon: 3, tue: 5 }, or a list of values, numbered.
 *
 *   barChart({ mon: 3, tue: 5, wed: 4, thu: 8, fri: 6 })
 *   barChart({ rust: 42, go: 31, zig: 12 }, { horizontal: true })
 */
export function barChart(data: Readonly<Record<string, number>> | readonly number[], o?: BarChartOptions): KitPiece {
  const p = optionsOf("barChart()", o, ["horizontal", "size", "max", "values", "seconds", "hold", ...WIDGET]);
  const entries: [string, number][] = Array.isArray(data) ? data.map((v, i) => [String(i + 1), v]) : data && typeof data === "object" ? Object.entries(data as Record<string, number>) : [];
  if (!entries.length || entries.length > 64 || !entries.every(([, v]) => typeof v === "number" && Number.isFinite(v) && v >= 0))
    fail(`barChart() takes names and values, such as { mon: 3, tue: 5 }, or a list of values, 1 to 64 of them, each 0 or more, not ${show(data)}`);
  const horizontal = boolOf("barChart's horizontal", p.horizontal, false);
  const size = wholeOf("barChart's size", p.size, horizontal ? 30 : 10, 1, 300);
  const top = numberOf("barChart's max", p.max, Math.max(...entries.map(([, v]) => v)) || 1, 0);
  const values = boolOf("barChart's values", p.values, true);
  const grow = numberOf("barChart's seconds", p.seconds, 0.8, 0, 30);
  const hold = numberOf("barChart's hold", p.hold, 3, 0, 60);
  const own = themed("barChart's color", p.color);
  const snappy = ease.outBack;
  const shown = entries.map(([, v]) => String(+v.toFixed(2)));
  const names = entries.map(([k]) => k);
  // Bars start a tenth of a second apart; the loop is the last one grown, and the hold.
  const loop = grow ? Math.round((grow + 0.1 * (entries.length - 1) + hold) * 100) / 100 : undefined;
  const lengthAt = (i: number, t: number) => {
    const full = Math.min(1, entries[i][1] / top);
    if (!loop) return full;
    const u = (((t % loop) + loop) % loop) - 0.1 * i;
    return full * Math.min(1.08, snappy(Math.max(0, Math.min(1, u / grow))));
  };
  const colorOf = (i: number) => (own ? ACCENT : 6 + (i % BARS.length));
  const palette = tones(own, own ? [] : BARS);
  const spec = { ...naming(p, "bar chart", `a bar chart of ${entries.length} bars${loop ? ", growing in" : ""}`), category: "data" as const, fps: loop ? 24 : 0, palette, ...(loop ? { loop } : {}) };
  if (horizontal) {
    const nameW = Math.max(...names.map((n) => n.length)), valueW = values ? Math.max(...shown.map((v) => v.length)) + 1 : 0;
    return piece({ ...spec, cols: nameW + 1 + size + valueW, rows: entries.length }, (t, s) => {
      entries.forEach((_, i) => {
        s.write(nameW - names[i].length, i, names[i]);
        const eighths = Math.round(lengthAt(i, t) * size * 8);
        for (let x = 0; x * 8 < eighths; x++) s.set(nameW + 1 + x, i, eighths - x * 8 >= 8 ? "█" : EIGHTHS[eighths - x * 8 - 1], colorOf(i));
        if (values) s.write(nameW + 2 + Math.ceil(eighths / 8), i, shown[i], MUTED);
      });
    });
  }
  const bar = Math.max(3, ...names.map((n) => n.length), ...(values ? shown.map((v) => v.length) : [])), gap = 2;
  return piece({ ...spec, cols: entries.length * (bar + gap) - gap, rows: size + 2 }, (t, s) => {
    entries.forEach((_, i) => {
      const x = i * (bar + gap);
      const eighths = Math.min(size * 8, Math.round(lengthAt(i, t) * size * 8));
      // whole cells from the bottom up, then the eighth the top cell is filled to
      for (let y = 0; y * 8 < eighths; y++) {
        const e = eighths - y * 8;
        for (let c = 0; c < bar; c++) s.set(x + c, size - y, e >= 8 ? "█" : RISE[e - 1], colorOf(i));
      }
      if (values && eighths) text(s, x, size - Math.ceil(eighths / 8), shown[i], { width: bar, align: "center", color: MUTED });
      text(s, x, size + 1, names[i], { width: bar, align: "center" });
    });
  });
}

// --- panel and card ---------------------------------------------------------------------------------------

export interface PanelOptions {
  /** Words on its top edge: none. */
  title?: string;
  /** Its lines: "rounded" (the default), "single", "double", "heavy" or "ascii". */
  style?: BoxStyle;
  /** Its size, border included: the thing's own and the border. Bigger, the thing sits in its middle. */
  cols?: number;
  rows?: number;
  /** Its lines' colour, as #rrggbb, { light, dark } or a palette's name: the ink. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * A panel: a box with a title round anything, a piece, text, a widget or a 3D shape, or round nothing, a size you
 * give. compose's border() with a size of its own.
 *
 *   panel(spinner("dots", { label: "building" }), { title: "ci", cols: 30, rows: 5 })
 *   panel("hello there", { title: "note", style: "double" })
 */
export function panel(content?: Thing, o?: PanelOptions): KitPiece {
  const p = optionsOf("panel()", o, ["title", "style", "cols", "rows", ...WIDGET]);
  if (p.title !== undefined && typeof p.title !== "string") fail(`panel's title takes words, not ${show(p.title)}`);
  const style = wordOf("panel's style", p.style, ["rounded", "single", "double", "heavy", "ascii"] as const, "rounded");
  const inner = content === undefined ? null : pieceOf(content, "panel()");
  const cols = wholeOf("panel's cols", p.cols, (inner?.meta.cols ?? 20) + 4, 3, 320), rows = wholeOf("panel's rows", p.rows, (inner?.meta.rows ?? 4) + 2, 3, 120);
  // The room inside the lines and a column of padding each side, the thing in its middle.
  const room = new Surface(Math.max(1, cols - 4), Math.max(1, rows - 2));
  const filled = inner ? layer(room, { src: inner, anchor: "center" }) : room;
  const color = themed("panel's color", p.color);
  const boxed = border(filled, { style, pad: [0, 1], ...(p.title ? { title: p.title } : {}), ...(color ? { color } : {}) });
  const name = p.name ?? p.title ?? inner?.meta.name ?? "panel";
  return titled(boxed, name, p.note ?? `${name}, in a box`);
}

export interface CardOptions {
  /** Its heading, in the accent colour: none. */
  title?: string;
  /** Its words, wrapped to its width: none. */
  text?: string;
  /** A line at the bottom, muted and on the right: none. */
  footer?: string;
  /** Its width in columns, border included: 36. */
  width?: number;
  /** Its lines: "rounded" (the default), "single", "double", "heavy" or "ascii". */
  style?: BoxStyle;
  /** The heading's colour, as #rrggbb, { light, dark } or a palette's name: blue. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * A card: a heading, a line under it, words wrapped to its width and a quiet footer, in a box. A still: give it to a
 * motion, floating(card({ ... })), to set it moving.
 *
 *   card({ title: "ascii.rest", text: "Animated ascii art for the web, in one line.", footer: "npm i ascii.rest" })
 */
export function card(o: CardOptions): KitPiece {
  const p = optionsOf("card()", o, ["title", "text", "footer", "width", "style", ...WIDGET]);
  for (const k of ["title", "text", "footer"] as const) if (p[k] !== undefined && typeof p[k] !== "string") fail(`card's ${k} takes words, not ${show(p[k])}`);
  if (!p.title && !p.text && !p.footer) fail("card() takes a title, text or a footer, such as { title: \"hello\", text: \"...\" }");
  const style = wordOf("card's style", p.style, ["rounded", "single", "double", "heavy", "ascii"] as const, "rounded");
  const width = wholeOf("card's width", p.width, 36, 8, 320);
  const room = width - 4;
  // How many rows the words wrap to, found by writing them on a scratch grid.
  const body = p.text ? text(new Surface(room, 120), 0, 0, p.text, { width: room }).rows : 0;
  const head = p.title ? 2 : 0, foot = p.footer ? (body ? 2 : 1) : 0;
  const rows = 2 + head + body + foot;
  return piece({ ...naming(p, p.title || "card", p.title ? `a card: ${p.title}` : "a card"), category: "ui", cols: width, rows, fps: 0, palette: tones(themed("card's color", p.color)) }, (_, s) => {
    const inside = rect(s, 0, 0, width, rows, { style, color: MUTED });
    const [x, w] = [inside.x + 1, room];
    let y = inside.y;
    if (p.title) {
      text(s, x, y, p.title, { width: w, wrap: false, color: ACCENT });
      line(s, 0, y + 1, width - 1, y + 1, { style: style === "rounded" ? "single" : style, color: MUTED });
      y += 2;
    }
    if (p.text) y += text(s, x, y, p.text, { width: w }).rows;
    if (p.footer) text(s, x, rows - 2, p.footer, { width: w, align: "right", wrap: false, color: MUTED });
  });
}

// --- words that move --------------------------------------------------------------------------------------

export interface TypewriterOptions {
  /** How fast it types: "slow", "normal" (14 characters a second, a quick typist) or "fast", or times as fast. */
  speed?: Speed;
  /** The width it wraps to, in columns: 40, or the text's own when narrower. */
  width?: number;
  /** A cursor at the next character, blinking once it is all typed: true. */
  cursor?: boolean;
  /** Seconds it stays typed before typing again: 3. "forever" types it once and stays. */
  hold?: number | "forever";
  /** Its colour, as #rrggbb, { light, dark } or a palette's name: the page's ink. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * Words typed out a character at a time behind a cursor, wrapped to a width, held, and typed again: fx's typeIn() at a
 * typist's pace.
 *
 *   typewriter("Hello. This sentence types itself out, as if someone were at the keys.")
 */
export function typewriter(words: string, o?: TypewriterOptions): KitPiece {
  if (typeof words !== "string" || !words.trim()) fail(`typewriter() takes words to type, not ${show(words)}`);
  const p = optionsOf("typewriter()", o, ["speed", "width", "cursor", "hold", ...WIDGET]);
  const longest = Math.max(...words.split("\n").map((l) => l.length));
  const width = Math.min(longest, wholeOf("typewriter's width", p.width, 40, 4, 300));
  const cursor = boolOf("typewriter's cursor", p.cursor, true);
  const hold = p.hold === "forever" ? undefined : numberOf("typewriter's hold", p.hold, 3, 0, 60);
  // characters a second: 14 at normal speed
  const speed = 14 * speedOf("typewriter()", p.speed);
  // a column more than the words, for the cursor to blink in at the end of the longest line
  const page = inked(words, themed("typewriter's color", p.color), width + (cursor ? 1 : 0));
  const first = words.trim().split("\n")[0].slice(0, 40);
  return typeIn(page, { speed, cursor: cursor ? "▌" : false, ...(hold !== undefined ? { hold } : {}), ...naming(p, first, `${first}, typed out`) });
}

export interface MarqueeOptions {
  /** Its width in columns: 40. */
  width?: number;
  /** How fast it scrolls: "slow", "normal" (10 columns a second) or "fast", or times as fast. */
  speed?: Speed;
  /** Which way it scrolls: "left" (the default) or "right". */
  to?: "left" | "right";
  /** In big block letters, a banner(): false. */
  big?: boolean;
  /** Its colour, as #rrggbb, { light, dark } or a palette's name: the page's ink. */
  color?: ColorLike;
  name?: string;
  note?: string;
}

/**
 * Words scrolling across, off one edge and in at the other, as a ticker or a shop sign does: drifting() of text. With
 * `big`, in block letters.
 *
 *   marquee("breaking: ascii is back")
 *   marquee("sale", { big: true, color: "#f85149" })
 */
export function marquee(words: string, o?: MarqueeOptions): KitPiece {
  if (typeof words !== "string" || !words.trim()) fail(`marquee() takes words to scroll, not ${show(words)}`);
  const p = optionsOf("marquee()", o, ["width", "speed", "to", "big", ...WIDGET]);
  const width = wholeOf("marquee's width", p.width, 40, 4, 320);
  const to = wordOf("marquee's to", p.to, ["left", "right"] as const, "left");
  const color = themed("marquee's color", p.color);
  const big = boolOf("marquee's big", p.big, false);
  const src: Piece | Surface = big ? banner(words, { effect: "still", ...(color ? { color: color } : {}) }) : inked(` ${words.replace(/\n/g, " ")} `, color);
  const length = src instanceof Surface ? src.cols : src.meta.cols;
  // a crossing, the width and the words' own length, at 10 columns a second
  const period = secondsOf("marquee()", { speed: p.speed }, (width + length) / 10);
  return drifting(src, { to, period, cols: width, ...naming(p, words.slice(0, 40), `${words.slice(0, 40)}, scrolling ${to}`) });
}

export interface CountdownOptions {
  /** The number it counts down from: 10. */
  from?: number;
  /** The last number it shows: 1. */
  to?: number;
  /** Words it shows after, for 2 seconds: "go!". false for none. */
  then?: string | false;
  /** Seconds each number shows: 1. */
  seconds?: number;
  /** banner()'s font: "block". */
  font?: FontName;
  /** The numbers' colour as #rrggbb, a fade along them as a list, or a palette's name for its fade on each page: the page's ink. */
  color?: PaletteLike;
  /** How one number turns into the next: "cut" (the default), "fade", "dissolve" or "wipe". */
  transition?: "cut" | "fade" | "dissolve" | "wipe";
  name?: string;
  note?: string;
}

/**
 * A countdown in big numbers, a second each, then words, and round again: banners in a sequence().
 *
 *   countdown({ from: 5, then: "liftoff" })
 */
export function countdown(o?: CountdownOptions): KitPiece {
  const p = optionsOf("countdown()", o, ["from", "to", "then", "seconds", "font", "transition", ...WIDGET]);
  const from = wholeOf("countdown's from", p.from, 10, 0, 999), to = wholeOf("countdown's to", p.to, 1, 0, 999);
  if (to > from) fail(`countdown's to takes a number no more than its from, ${from}, not ${to}`);
  if (from - to > 99) fail(`countdown() counts up to 100 numbers: from ${from} to ${to} is ${from - to + 1}`);
  const then = p.then === undefined ? "go!" : p.then;
  if (then !== false && (typeof then !== "string" || !then.trim())) fail(`countdown's then takes words, or false for none, not ${show(then)}`);
  const seconds = numberOf("countdown's seconds", p.seconds, 1, 0.2, 60);
  const transition = wordOf("countdown's transition", p.transition, ["cut", "fade", "dissolve", "wipe"] as const, "cut");
  // A palette's name is its fade for each page, as banner() takes { light, dark }; anything else goes to banner() as it is.
  const color = typeof p.color === "string" && !p.color.startsWith("#") ? palette(p.color) : p.color;
  const look = { effect: "still" as const, ...(p.font ? { font: p.font } : {}), ...(color !== undefined ? { color } : {}) };
  const steps = Array.from({ length: from - to + 1 }, (_, i) => ({ src: banner(String(from - i), look), seconds }));
  const all = then === false ? steps : [...steps, { src: banner(then, look), seconds: Math.max(2, seconds) }];
  const counted = sequence(all, { transition, overlap: transition === "cut" ? 0 : Math.min(0.3, seconds / 2) });
  return titled(counted, p.name ?? "countdown", p.note ?? `counting down from ${from}${then ? `, then ${then}` : ""}`);
}
