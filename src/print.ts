/*
 * banner in a terminal: banner() from ascii.rest/banner, printed where the
 * cursor is, for a CLI as it starts or for `npx ascii.rest banner <text>`. Its
 * glint passes once, or its letters type in, and it stays, in the scrollback
 * with the rest of the output. It takes every option banner() does. Node only,
 * and only Node's own modules; "ascii.rest/terminal" exports it beside play().
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { banner } from "ascii.rest/terminal";
 *   await banner("my-cli", { color: ["#ff6a00", "#f778ba"], tagline: "v1.0" });
 */
import process from "node:process";
import { banner as make, drawable, type BannerOptions } from "./banner.ts";
import type { Output } from "./terminal.ts";

export interface PrintOptions extends Omit<BannerOptions, "size" | "max"> {
  /** Seconds the glint takes to pass, or the letters to type in, once; 0 prints it still. 1 by default. */
  seconds?: number;
  /** A line under the banner, dimmed, once it has moved. */
  tagline?: string;
  /** For a light terminal: the light colours, and solid letters that the glint lightens. */
  light?: boolean;
  /** Where to print: process.stdout by default. */
  out?: Output;
}

export interface Bannered {
  /** The banner's size in the terminal's cells; 0 by 0 when the terminal was too narrow for it and it printed its text. */
  cols: number;
  rows: number;
  /** True when Ctrl+C stopped it moving. */
  interrupted: boolean;
}

const HIDE = "\x1b[?25l", SHOW = "\x1b[?25h";
const sgr = (hex: string) => `\x1b[38;2;${parseInt(hex.slice(1, 3), 16)};${parseInt(hex.slice(3, 5), 16)};${parseInt(hex.slice(5, 7), 16)}m`;

/**
 * Prints a banner, and its tagline under it, and resolves once it has moved. It prints from the cursor, which should be
 * at the start of a line: end any output before it with a newline, or its first row starts mid-line and moving it
 * writes over that line. Piped, it prints at once with no colour. With NO_COLOR set it has no colour but still moves.
 * A terminal too short to show it whole gets it still, and one resized while it moves stops it where it is, as the
 * rows may have wrapped. It throws when banner() would, and when `seconds` is not 0 or more.
 */
export async function banner(text: string, { seconds = 1, tagline = "", light = false, out = process.stdout, ...options }: PrintOptions = {}): Promise<Bannered> {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error(`ascii.rest: seconds takes a number of 0 or more, not ${seconds}`);
  const words = drawable(text, options.font).trim().replace(/\s+/g, " ");
  if (!words) throw new Error(`ascii.rest: the font draws none of "${text}"`);
  const tty = out.isTTY === true;
  // A column short of the width: a row that fills it leaves the cursor on its last column, and \x1b[K would clear it.
  const width = (out.columns || 80) - 1;
  const piece = make(words, { ...options, max: width });
  const { meta, motion } = piece;
  const plain = !tty || Boolean(process.env.NO_COLOR);
  const under = tagline ? `${plain ? tagline : `\x1b[2m${tagline}\x1b[0m`}\n` : "";
  if (meta.cols > width) {
    out.write(`${words}\n${under}`);
    return { cols: 0, rows: 0, interrupted: false };
  }
  const done: Bannered = { cols: meta.cols, rows: meta.rows, interrupted: false };

  // Without colour, the same banner with one, only to tell its shadow from its letters: its characters are the same.
  const colored = Boolean(meta.palette);
  const sorter = colored ? piece : make(words, { ...options, max: width, color: "#000000" });
  const frame = sorter.default();
  const palette = sorter.meta.palette!;
  const color = new Uint8Array(meta.cols * meta.rows);
  const base = light ? 0 : palette.length / 2;
  // The shadow takes its own colour only when one was asked for; otherwise it is dimmed, as it is without colour.
  const tinted = colored && options.shadowColor !== undefined;
  const ink = (k: number) => {
    const i = color[k] - base;
    return i === 0 ? (tinted ? sgr(palette[base]) : "\x1b[2m") : colored ? sgr(palette[base + i]) : "";
  };
  // Each line in runs of one ink, back to the terminal's own colours at its end.
  const paint = (lines: string[]) =>
    lines.map((line, y) => {
      line = line.trimEnd();
      if (plain) return line;
      let s = "", state = "";
      [...line].forEach((c, x) => {
        const next = c === " " ? state : ink(y * meta.cols + x);
        if (next !== state) {
          s += (state ? "\x1b[0m" : "") + next;
          state = next;
        }
        s += c;
      });
      return state ? `${s}\x1b[0m` : s;
    });
  const lines = (t: number) => {
    color.fill(0);
    return paint(frame(t, { paper: light, color }).split("\n"));
  };
  // Where it rests: the glint out of sight, every letter typed, or the still.
  const rest = lines(meta.still ?? 0);
  // It moves in place by going back up over its own rows, so a terminal too short to show them all gets the still.
  const room = !out.rows || out.rows > meta.rows + 1;
  if (!tty || seconds === 0 || !(motion.seconds > 0) || !room) {
    out.write(rest.join("\n") + "\n" + under);
    return done;
  }
  // The stretch of the piece's time it plays: the glint's first pass, or the typing.
  const [from, to] = motion.pass ?? [0, motion.seconds];

  return new Promise<Bannered>((resolve, reject) => {
    let shown = lines(from);
    let timer: ReturnType<typeof setInterval> | undefined;
    let over = false;
    const draw = (next: string[]) => {
      if (next.every((line, i) => line === shown[i])) return;
      // back to the banner's first row, then each row over the last, cleared to its end
      out.write(`\x1b[${meta.rows}F` + next.map((line) => `${line}\x1b[K\n`).join(""));
      shown = next;
    };
    const show = () => out.write(SHOW);
    // An output it can't stop listening to doesn't get listened to, so the listener can't outlive the banner.
    const listens = typeof out.on === "function" && typeof out.off === "function";
    const stop = (error?: { error: unknown }) => {
      if (over) return;
      over = true;
      clearInterval(timer);
      process.off("SIGINT", interrupt);
      process.off("exit", restore);
      if (listens) out.off!("resize", resize);
      try {
        // the tagline once it is done, so the redraws above have only the banner's rows to go back over
        if (!error) out.write(under);
        show();
      } catch (late) {
        error ??= { error: late };
      }
      if (error) reject(error.error);
      else resolve(done);
    };
    // A write that throws, to a closed stream say, ends it: the timer and the listeners go, and the call rejects.
    const safely = (fn: () => void) => {
      try {
        fn();
      } catch (error) {
        stop({ error });
      }
    };
    const finish = () => safely(() => (draw(rest), stop()));
    // Ctrl+C ends the motion, not the program: the caller decides, as with play().
    const interrupt = () => ((done.interrupted = true), finish());
    // A new width can wrap the rows, and then no redraw lands where it should, so it stops where it is.
    const resize = () => stop();
    // If the program exits while it moves, the cursor comes back on the way out.
    const restore = () => {
      try {
        show();
      } catch {}
    };
    process.on("SIGINT", interrupt);
    process.on("exit", restore);
    if (listens) out.on!("resize", resize);
    safely(() => out.write(HIDE + shown.map((line) => `${line}\n`).join("")));
    if (over) return;
    const start = performance.now();
    timer = setInterval(
      () =>
        safely(() => {
          const k = (performance.now() - start) / (seconds * 1000);
          if (k >= 1) return finish();
          draw(lines(from + (to - from) * k));
        }),
      1000 / 30,
    );
  });
}
