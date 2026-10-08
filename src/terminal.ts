/*
 * play: a piece in a terminal, for a CLI's splash screen or for
 * `npx ascii.rest <piece>`. Node only, and only Node's own modules.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 * A coloured piece is drawn in truecolor from its palette, the half meant for a
 * dark terminal unless `light`; with `mono` it is text in the terminal's own
 * colour, as every other piece is. It plays centred on the alternate screen
 * with the cursor hidden, cropped to its middle when the terminal is smaller,
 * and the terminal is put back however it stops: after `seconds`, on a key, on
 * Ctrl+C or on an error. With no terminal to draw on, a pipe or a log, it draws
 * nothing and resolves at once.
 *
 *   import { play } from "ascii.rest/terminal";
 *   await play("rust", { seconds: 2 });
 */
import process from "node:process";
import { isPiece, load, type PieceName } from "./library.ts";
import type { Meta, Options, Piece } from "./types.ts";

/** Where a piece is drawn: process.stdout, or a stream shaped like it. */
export interface Output {
  write(text: string): unknown;
  isTTY?: boolean;
  columns?: number;
  rows?: number;
  on?(event: "resize", listener: () => void): unknown;
  off?(event: "resize", listener: () => void): unknown;
}

export interface PlayOptions {
  /** Seconds to play. Until a key is pressed, by default. */
  seconds?: number;
  /** Draws a coloured piece as text in the terminal's own colour. */
  mono?: boolean;
  /** For a light terminal: a coloured piece takes its light colours, a shaded one flips its ramp. */
  light?: boolean;
  /** Frames a second, instead of the piece's own. */
  fps?: number;
  /** The piece's option overrides. Kept apart from the rest because two clocks have a `seconds` option of their own. */
  options?: Options;
  /** Where to draw: process.stdout by default. Keys are read from process.stdin. */
  out?: Output;
}

export interface Played {
  /** True when the terminal was smaller than the piece as it stopped, so only the piece's middle showed. */
  cropped: boolean;
  /** True when Ctrl+C stopped it. */
  interrupted: boolean;
  /** The piece's size in the terminal's cells. */
  piece: { cols: number; rows: number };
  /** The terminal's size as it stopped. */
  terminal: { cols: number; rows: number };
}

// The alternate screen, the cursor hidden and no wrapping, so a glyph a terminal draws two cells wide can only clip its own row.
const ENTER = "\x1b[?1049h\x1b[?25l\x1b[?7l\x1b[2J";
const LEAVE = "\x1b[0m\x1b[?7h\x1b[?25h\x1b[?1049l";
// Unchanged cells a run of changed ones is carried over, rather than jumping the cursor past them.
const GAP = 4;
// How much of a square cell each of a scene's dots inks, for mixing its colour into the ground.
const INK: Record<string, number> = { " ": 0, "·": 0.15, "•": 0.45, "●": 0.9, "░": 0.25, "▒": 0.5, "▓": 0.75, "█": 1 };

const int = (hex: string) => parseInt(hex.slice(1, 7), 16);
const mix = (a: number, b: number, k: number) =>
  [16, 8, 0].reduce((out, s) => out | (Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k) << s), 0);
const sgr = (layer: 38 | 48, c: number) => `\x1b[${layer};2;${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}m`;
const dark = (c: number) => 0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255) < 128;

async function resolve(piece: Piece | PieceName): Promise<Piece> {
  if (typeof piece !== "string") return piece;
  if (!isPiece(piece)) throw new Error(`ascii.rest: no piece named "${piece}"`);
  return load[piece]();
}

/*
 * The terminal's cells for a piece's frames: each cell's character, and its ink and ground as 0xrrggbb, or -1 for the
 * terminal's own. A terminal's cells are twice as tall as they are wide, so a square-celled piece (cell: 1) shows two of
 * its rows in each of them. In colour that is an upper half block, its ink the top row's colour and its ground the
 * bottom's, each the dot's colour mixed into the scene's ground by how much it inks. As text, each column keeps the
 * heavier of its two characters, so a star or a thin line in either row survives.
 */
function painter({ cols, rows, palette, ground, cell = 2 }: Meta, colour: boolean) {
  const square = cell === 1;
  const height = square ? Math.ceil(rows / 2) : rows;
  const ch = new Array<string>(cols * height).fill(" ");
  const fg = new Int32Array(cols * height).fill(-1);
  const bg = new Int32Array(cols * height).fill(-1);
  const color = colour && palette ? new Uint8Array(cols * rows) : undefined;
  const inks = palette?.map(int) ?? [];
  const base = color && ground ? int(ground) : -1;
  const shades = new Map<number, number>();
  // A square cell's colour: the ground for a space, else its ink, mixed into the ground when there is one.
  const shade = (lines: string[], y: number, x: number) => {
    const c = lines[y]?.[x] ?? " ";
    if (c === " ") return base;
    const i = color![y * cols + x], key = i * 65536 + c.charCodeAt(0);
    let s = shades.get(key);
    if (s === undefined) shades.set(key, (s = base < 0 ? (inks[i] ?? inks[0]) : mix(base, inks[i] ?? inks[0], INK[c] ?? 0.5)));
    return s;
  };
  const weight = (c: string) => " ·•●".indexOf(c) + 1 || 2.5;

  const paint = (text: string) => {
    const lines = text.split("\n");
    for (let y = 0, k = 0; y < height; y++)
      for (let x = 0; x < cols; x++, k++) {
        if (square && color) {
          const top = shade(lines, 2 * y, x), bottom = 2 * y + 1 < rows ? shade(lines, 2 * y + 1, x) : base;
          // With no ground behind a half, the other half's block is drawn alone.
          if (top === bottom) (ch[k] = " "), (fg[k] = -1), (bg[k] = top);
          else if (top < 0) (ch[k] = "▄"), (fg[k] = bottom), (bg[k] = -1);
          else (ch[k] = "▀"), (fg[k] = top), (bg[k] = bottom);
        } else if (square) {
          const a = lines[2 * y]?.[x] ?? " ", b = lines[2 * y + 1]?.[x] ?? " ";
          ch[k] = weight(b) > weight(a) ? b : a;
        } else {
          const c = (ch[k] = lines[y]?.[x] ?? " ");
          fg[k] = color && c !== " " ? (inks[color[k]] ?? inks[0]) : -1;
          bg[k] = base;
        }
      }
  };
  return { cols, rows: height, color, base, ch, fg, bg, paint };
}

/** A piece's first frame as plain text, its rows paired as on a terminal: for a pipe or a log, where nothing plays. */
export async function still(piece: Piece | PieceName, { light = false, options = {} }: Pick<PlayOptions, "light" | "options"> = {}): Promise<string> {
  const mod = await resolve(piece);
  const cells = painter(mod.meta, false);
  cells.paint(mod.default({ ...mod.meta.options, ...options })(0, { paper: light }));
  return Array.from({ length: cells.rows }, (_, y) => cells.ch.slice(y * cells.cols, (y + 1) * cells.cols).join("")).join("\n");
}

/** Plays a piece in the terminal. Resolves when it stops: after `seconds`, on a key or on Ctrl+C. */
export async function play(
  piece: Piece | PieceName,
  { seconds, mono = false, light = false, fps, options = {}, out = process.stdout }: PlayOptions = {},
): Promise<Played> {
  const { meta, default: make } = await resolve(piece);
  const cells = painter(meta, !mono);
  const { cols, rows, color, ch, fg, bg } = cells;
  const played: Played = { cropped: false, interrupted: false, piece: { cols, rows }, terminal: { cols: 0, rows: 0 } };
  if (!out.isTTY) return played;

  const frame = make({ ...meta.options, ...options });
  // A scene keeps its own ground in colour, and shades for it as it does on a canvas.
  const paper = cells.base >= 0 ? !dark(cells.base) : light;
  const rate = fps ?? meta.fps;

  let t = 0;
  // What each cell was last sent, so a frame rewrites only the cells that changed. A scene changes a few in a hundred
  // a frame, and every row of it at once, so sending whole rows would be ten times the bytes.
  const sentCh = new Array<string>(cols * rows).fill("");
  const sentFg = new Int32Array(cols * rows);
  const sentBg = new Int32Array(cols * rows);
  const draw = () => {
    cells.paint(frame(t, { paper, color }));
    // A terminal that reports no size (some ptys) is taken to be 80 by 24.
    const W = out.columns || 80, H = out.rows || 24;
    const w = Math.min(cols, W), h = Math.min(rows, H);
    played.terminal = { cols: W, rows: H };
    played.cropped = w < cols || h < rows;
    // Where the part that fits starts in the piece, and where it goes on the screen, 1-based.
    const sx = (cols - w) >> 1, sy = (rows - h) >> 1;
    const left = ((W - w) >> 1) + 1, top = ((H - h) >> 1) + 1;
    // A space shows no ink, so its ink is no change.
    const changed = (k: number) => ch[k] !== sentCh[k] || bg[k] !== sentBg[k] || (ch[k] !== " " && fg[k] !== sentFg[k]);
    let s = "";
    for (let y = 0; y < h; y++) {
      const row = (sy + y) * cols;
      for (let x = sx; x < sx + w; ) {
        if (!changed(row + x)) {
          x++;
          continue;
        }
        // A run of changed cells, carried over short stretches of unchanged ones, which cost about what a jump does.
        let end = x + 1;
        for (let j = x + 1, gap = 0; j < sx + w && gap <= GAP; j++) {
          if (changed(row + j)) (end = j + 1), (gap = 0);
          else gap++;
        }
        // Each run starts in the terminal's own colours and goes back to them, so no run depends on another.
        let run = `\x1b[${top + y};${left + x - sx}H`, ink = -1, under = -1;
        for (let k = row + x; k < row + end; k++) {
          if (bg[k] !== under) (run += bg[k] < 0 ? "\x1b[49m" : sgr(48, bg[k])), (under = bg[k]);
          if (ch[k] !== " " && fg[k] !== ink) (run += fg[k] < 0 ? "\x1b[39m" : sgr(38, fg[k])), (ink = fg[k]);
          run += ch[k];
          sentCh[k] = ch[k];
          sentFg[k] = fg[k];
          sentBg[k] = bg[k];
        }
        s += ink >= 0 || under >= 0 ? `${run}\x1b[0m` : run;
        x = end;
      }
    }
    if (s) out.write(s);
  };

  return new Promise<Played>((done, fail) => {
    const stdin = process.stdin;
    const keys = stdin.isTTY === true && typeof stdin.setRawMode === "function";
    const wasRaw = stdin.isRaw;
    const flowing = stdin.readableFlowing === true;
    let timer: ReturnType<typeof setInterval> | undefined;
    let end: ReturnType<typeof setTimeout> | undefined;
    let over = false;

    const restore = () => out.write(LEAVE);
    const stop = (error?: { error: unknown }) => {
      if (over) return;
      over = true;
      clearInterval(timer);
      clearTimeout(end);
      out.off?.("resize", resize);
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", terminate);
      process.off("exit", restore);
      if (keys) {
        stdin.off("data", key);
        stdin.setRawMode(wasRaw);
        if (!flowing) stdin.pause();
      }
      restore();
      if (error) fail(error.error);
      else done(played);
    };
    const safely = (fn: () => void) => {
      try {
        fn();
      } catch (error) {
        stop({ error });
      }
    };
    // In raw mode Ctrl+C arrives as a key, not a signal. Any key ends it: a splash screen is there to be skipped.
    const key = (data: Uint8Array) => {
      if (data.includes(3)) played.interrupted = true;
      stop();
    };
    const interrupt = () => {
      played.interrupted = true;
      stop();
    };
    // Listening for SIGTERM stops Node exiting on it, so once the terminal is back the signal is sent again, unless
    // the program has its own handler for it.
    const terminate = () => {
      stop();
      if (!process.listenerCount("SIGTERM")) process.kill(process.pid, "SIGTERM");
    };
    // The piece moves on the screen, so it is drawn again whole.
    const resize = () =>
      safely(() => {
        sentCh.fill("");
        out.write("\x1b[2J");
        draw();
      });

    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    // If the program exits while it plays, the terminal is put back on the way out.
    process.on("exit", restore);
    out.on?.("resize", resize);
    if (keys) {
      stdin.setRawMode(true);
      stdin.on("data", key);
      stdin.resume();
    }

    out.write(ENTER);
    safely(draw);
    if (over) return;
    if (rate > 0) {
      let last = performance.now();
      timer = setInterval(
        () =>
          safely(() => {
            const now = performance.now();
            t += Math.min(now - last, 100) / 1000;
            last = now;
            draw();
          }),
        1000 / rate,
      );
    }
    // setTimeout fires at once for anything past 2^31 ms, so a longer play has no end but a key.
    if (seconds !== undefined && seconds * 1000 < 2 ** 31) end = setTimeout(() => stop(), Math.max(0, seconds * 1000));
  });
}
