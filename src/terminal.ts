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
// How far a colour may drift, on each channel out of 255, before its cell is sent again.
const NEAR = 6;
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

// How a run of n cells is averaged onto m: for each of the m, the cells it covers and the share of it each one is.
function spans(n: number, m: number) {
  return Array.from({ length: m }, (_, i) => {
    const a = (i * n) / m, b = ((i + 1) * n) / m, cover: [number, number][] = [];
    for (let j = Math.floor(a); j < Math.ceil(b); j++) {
      const w = Math.min(j + 1, b) - Math.max(j, a);
      if (w > 0) cover.push([j, w / (b - a)]);
    }
    return cover;
  });
}

/*
 * The terminal's cells for a piece's frames: each cell's character, and its ink and ground as 0xrrggbb, or -1 for the
 * terminal's own. A piece with character cells is drawn as it is, and cropped by play() if the terminal is smaller.
 *
 * A square-celled piece (cell: 1), a scene, is a picture of up to 320 by 120 cells, too big for most terminals, and its
 * dots are a texture that a canvas draws a few pixels across: one dot a solid cell reads as noise. So it is shrunk to
 * fit the terminal and drawn in tones. In colour, each of its cells is its ink mixed into the ground by how much its dot
 * inks, softened by a 1 4 1 blur each way, then averaged down onto the size that fits: two of those rows in each
 * terminal cell, as an upper half block whose ink is the top one and whose ground is the bottom. As text, each terminal
 * cell keeps the heaviest character of the cells it covers, so a star or a thin line survives. size() sets the room.
 */
function painter({ cols, rows, palette, ground, cell = 2 }: Meta, colour: boolean) {
  const square = cell === 1;
  const color = colour && palette ? new Uint8Array(cols * rows) : undefined;
  const inks = palette?.map(int) ?? [];
  const base = color && ground ? int(ground) : -1;
  const shades = new Map<number, number>();
  // A square cell's colour: the ground for a space, else its ink, mixed into the ground when there is one.
  const shade = (c: string, i: number) => {
    if (c === " ") return base;
    const key = i * 65536 + c.charCodeAt(0);
    let s = shades.get(key);
    if (s === undefined) shades.set(key, (s = base < 0 ? (inks[i] ?? inks[0]) : mix(base, inks[i] ?? inks[0], INK[c] ?? 0.5)));
    return s;
  };
  const weight = (c: string) => " ·•●".indexOf(c) + 1 || 2.5;
  // Tones only make sense over a ground; a square piece in colour with none keeps one cell a half, as drawn.
  const tones = square && color !== undefined && base >= 0;
  const pic = tones ? new Float32Array(cols * rows * 3) : new Float32Array(0);
  const soft = tones ? new Float32Array(cols * rows * 3) : new Float32Array(0);

  const out = { cols, rows: square ? Math.ceil(rows / 2) : rows, color, base, ch: [] as string[], fg: new Int32Array(0), bg: new Int32Array(0) };
  let across: [number, number][][] = [], down: [number, number][][] = [], half = rows;
  let wide = new Float32Array(0), small = new Float32Array(0);
  const room = (w: number, h: number) => {
    out.cols = w;
    out.rows = h;
    out.ch = new Array<string>(w * h).fill(" ");
    out.fg = new Int32Array(w * h).fill(-1);
    out.bg = new Int32Array(w * h).fill(-1);
  };
  // The room it has: a piece with character cells keeps its size, and so does a square one in colour with no ground; a
  // scene, or a square piece as text, takes the most of the terminal it can.
  const size = (W: number, H: number) => {
    if (!square || (color && !tones)) return void (out.ch.length || room(cols, square ? Math.ceil(rows / 2) : rows));
    const s = Math.min(1, W / cols, (2 * H) / rows), w = Math.max(1, Math.round(cols * s));
    half = Math.max(2, Math.round(rows * s));
    across = spans(cols, w);
    down = spans(rows, tones ? half : Math.ceil(half / 2));
    wide = new Float32Array(w * rows * 3);
    small = new Float32Array(w * half * 3);
    room(w, Math.ceil(half / 2));
  };

  // pic, blurred 1 4 1 across into soft and then down back into pic, the edges weighed by what they have
  const blur = () => {
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        for (let c = 0, i = (y * cols + x) * 3; c < 3; c++, i++) {
          let sum = 4 * pic[i], n = 4;
          if (x > 0) (sum += pic[i - 3]), n++;
          if (x < cols - 1) (sum += pic[i + 3]), n++;
          soft[i] = sum / n;
        }
    const stride = cols * 3;
    for (let y = 0; y < rows; y++)
      for (let i = y * stride; i < (y + 1) * stride; i++) {
        let sum = 4 * soft[i], n = 4;
        if (y > 0) (sum += soft[i - stride]), n++;
        if (y < rows - 1) (sum += soft[i + stride]), n++;
        pic[i] = sum / n;
      }
  };

  const paint = (text: string) => {
    const lines = text.split("\n");
    const { ch, fg, bg } = out, w = out.cols;
    if (tones) {
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const s = shade(lines[y]?.[x] ?? " ", color![y * cols + x]), i = (y * cols + x) * 3;
          pic[i] = (s >> 16) & 255;
          pic[i + 1] = (s >> 8) & 255;
          pic[i + 2] = s & 255;
        }
      blur();
      // averaged across, then down
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < w; x++)
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (const [j, k] of across[x]) sum += pic[(y * cols + j) * 3 + c] * k;
            wide[(y * w + x) * 3 + c] = sum;
          }
      for (let y = 0; y < half; y++)
        for (let x = 0; x < w; x++)
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (const [j, k] of down[y]) sum += wide[(j * w + x) * 3 + c] * k;
            small[(y * w + x) * 3 + c] = sum;
          }
      const at = (x: number, y: number) => {
        if (y >= half) return base;
        const i = (y * w + x) * 3;
        return (Math.round(small[i]) << 16) | (Math.round(small[i + 1]) << 8) | Math.round(small[i + 2]);
      };
      for (let y = 0, k = 0; y < out.rows; y++)
        for (let x = 0; x < w; x++, k++) {
          const top = at(x, 2 * y), bottom = at(x, 2 * y + 1);
          if (top === bottom) (ch[k] = " "), (fg[k] = -1), (bg[k] = top);
          else (ch[k] = "▀"), (fg[k] = top), (bg[k] = bottom);
        }
    } else if (square && color) {
      // No ground to mix into: one cell a half, as drawn, cropped by play() when it does not fit.
      for (let y = 0, k = 0; y < out.rows; y++)
        for (let x = 0; x < w; x++, k++) {
          const top = shade(lines[2 * y]?.[x] ?? " ", color[2 * y * cols + x]);
          const bottom = 2 * y + 1 < rows ? shade(lines[2 * y + 1]?.[x] ?? " ", color[(2 * y + 1) * cols + x]) : base;
          // With no ground behind a half, the other half's block is drawn alone.
          if (top === bottom) (ch[k] = " "), (fg[k] = -1), (bg[k] = top);
          else if (top < 0) (ch[k] = "▄"), (fg[k] = bottom), (bg[k] = -1);
          else (ch[k] = "▀"), (fg[k] = top), (bg[k] = bottom);
        }
    } else if (square) {
      for (let y = 0, k = 0; y < out.rows; y++)
        for (let x = 0; x < w; x++, k++) {
          let best = " ";
          for (const [j] of down[y]) for (const [i] of across[x]) {
            const c = lines[j]?.[i] ?? " ";
            if (weight(c) > weight(best)) best = c;
          }
          ch[k] = best;
        }
    } else {
      for (let y = 0, k = 0; y < rows; y++)
        for (let x = 0; x < cols; x++, k++) {
          const c = (ch[k] = lines[y]?.[x] ?? " ");
          fg[k] = color && c !== " " ? (inks[color[k]] ?? inks[0]) : -1;
          bg[k] = base;
        }
    }
  };
  return Object.assign(out, { size, paint });
}

/** A piece's first frame as plain text, its rows paired as on a terminal: for a pipe or a log, where nothing plays. */
export async function still(piece: Piece | PieceName, { light = false, options = {} }: Pick<PlayOptions, "light" | "options"> = {}): Promise<string> {
  const mod = await resolve(piece);
  const cells = painter(mod.meta, false);
  // its whole size: there is no terminal to fit
  cells.size(mod.meta.cols, Math.ceil(mod.meta.rows / 2));
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
  const { color } = cells;
  // A terminal that reports no size (some ptys) is taken to be 80 by 24.
  cells.size(out.columns || 80, out.rows || 24);
  const played: Played = { cropped: false, interrupted: false, piece: { cols: cells.cols, rows: cells.rows }, terminal: { cols: 0, rows: 0 } };
  if (!out.isTTY) return played;

  const frame = make({ ...meta.options, ...options });
  // A scene keeps its own ground in colour, and shades for it as it does on a canvas.
  const paper = cells.base >= 0 ? !dark(cells.base) : light;
  const rate = fps ?? meta.fps;

  let t = 0;
  // What each cell was last sent, so a frame rewrites only the cells that changed. A scene changes a few in a hundred
  // a frame, and every row of it at once, so sending whole rows would be ten times the bytes. A new terminal size can
  // give a scene a new size, so they start over with it.
  let sentCh: string[] = [], sentFg = new Int32Array(0), sentBg = new Int32Array(0), sized = "";
  const draw = () => {
    const W = out.columns || 80, H = out.rows || 24;
    if (sized !== `${W}x${H}`) {
      sized = `${W}x${H}`;
      cells.size(W, H);
      sentCh = new Array<string>(cells.cols * cells.rows).fill("");
      sentFg = new Int32Array(cells.cols * cells.rows);
      sentBg = new Int32Array(cells.cols * cells.rows);
    }
    cells.paint(frame(t, { paper, color }));
    const { cols, rows, ch, fg, bg } = cells;
    played.piece = { cols, rows };
    const w = Math.min(cols, W), h = Math.min(rows, H);
    played.terminal = { cols: W, rows: H };
    played.cropped = w < cols || h < rows;
    // Where the part that fits starts in the piece, and where it goes on the screen, 1-based.
    const sx = (cols - w) >> 1, sy = (rows - h) >> 1;
    const left = ((W - w) >> 1) + 1, top = ((H - h) >> 1) + 1;
    // A space shows no ink, so its ink is no change. A colour that moved by no more than NEAR on each channel is no change
    // either: a scene's tones shift by a step or two from frame to frame wherever anything moves near them.
    const near = (a: number, b: number) =>
      a === b ||
      (a >= 0 && b >= 0 && Math.abs((a >> 16) - (b >> 16)) <= NEAR && Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) <= NEAR && Math.abs((a & 255) - (b & 255)) <= NEAR);
    const changed = (k: number) => ch[k] !== sentCh[k] || !near(bg[k], sentBg[k]) || (ch[k] !== " " && !near(fg[k], sentFg[k]));
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

// A text in block letters, printed where the cursor is: a CLI's name as it starts.
export { banner, type BannerOptions, type Bannered } from "./banner.ts";
