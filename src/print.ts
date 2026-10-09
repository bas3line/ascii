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
 * Prints a banner, and its tagline under it, and resolves once it has moved. Piped, or with NO_COLOR set, it has no
 * colour; piped, it prints at once. It throws when the font draws none of the text.
 */
export async function banner(text: string, { seconds = 1, tagline = "", light = false, out = process.stdout, ...options }: PrintOptions = {}): Promise<Bannered> {
  const words = drawable(text, options.font).trim().replace(/\s+/g, " ");
  if (!words) throw new Error(`ascii.rest: the font draws none of "${text}"`);
  const tty = out.isTTY === true;
  const width = out.columns || 80;
  const piece = make(words, { ...options, max: width });
  const { meta, motion } = piece;
  const plain = !tty || Boolean(process.env.NO_COLOR);
  const under = tagline ? `${plain ? tagline : `\x1b[2m${tagline}\x1b[0m`}\n` : "";
  if (meta.cols > width) {
    out.write(`${words}\n${under}`);
    return { cols: 0, rows: 0, interrupted: false };
  }
  const done: Bannered = { cols: meta.cols, rows: meta.rows, interrupted: false };

  const frame = piece.default();
  const { palette } = meta;
  const color = new Uint8Array(meta.cols * meta.rows);
  const base = palette && !light ? palette.length / 2 : 0;
  // The shadow takes its own colour only when one was asked for; otherwise it is dimmed, as it is without colour.
  const tinted = options.shadowColor !== undefined;
  const ink = (c: string, k: number) => {
    if (!palette) return /[─-╿]/.test(c) ? "\x1b[2m" : "";
    const i = color[k] - base;
    return i === 0 ? (tinted ? sgr(palette[base]) : "\x1b[2m") : sgr(palette[base + i]);
  };
  // Each line in runs of one ink, back to the terminal's own colours at its end.
  const paint = (lines: string[]) =>
    lines.map((line, y) => {
      line = line.trimEnd();
      if (plain) return line;
      let s = "", state = "";
      [...line].forEach((c, x) => {
        const next = c === " " ? state : ink(c, y * meta.cols + x);
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
    return paint(frame(t, { paper: light, color: palette ? color : undefined }).split("\n"));
  };
  // Where it rests: the glint out of sight, every letter typed, or the still.
  const rest = lines(motion.once ? motion.seconds : 0);
  if (!tty || !(seconds > 0) || !(motion.seconds > 0)) {
    out.write(rest.join("\n") + "\n" + under);
    return done;
  }
  // The stretch of the piece's time it plays: the glint's first pass, or the typing.
  const [from, to] = motion.pass ?? [0, motion.seconds];

  return new Promise<Bannered>((resolve) => {
    let shown = lines(from);
    const draw = (next: string[]) => {
      if (next.every((line, i) => line === shown[i])) return;
      // back to the banner's first row, then each row over the last, cleared to its end
      out.write(`\x1b[${meta.rows}F` + next.map((line) => `${line}\x1b[K\n`).join(""));
      shown = next;
    };
    const start = performance.now();
    const timer = setInterval(() => {
      const k = (performance.now() - start) / (seconds * 1000);
      if (k >= 1) return finish();
      draw(lines(from + (to - from) * k));
    }, 1000 / 30);
    const show = () => out.write(SHOW);
    // Ctrl+C ends the motion, not the program: the caller decides, as with play().
    const interrupt = () => ((done.interrupted = true), finish());
    // A new width can wrap the rows, and then no redraw lands where it should, so it stops where it is.
    const resize = () => stop();
    const stop = () => {
      clearInterval(timer);
      process.off("SIGINT", interrupt);
      process.off("exit", show);
      out.off?.("resize", resize);
      // the tagline once it is done, so the redraws above have only the banner's rows to go back over
      out.write(under);
      show();
      resolve(done);
    };
    const finish = () => {
      draw(rest);
      stop();
    };
    process.on("SIGINT", interrupt);
    // If the program exits while it moves, the cursor comes back on the way out.
    process.on("exit", show);
    out.on?.("resize", resize);
    out.write(HIDE + shown.map((line) => `${line}\n`).join(""));
  });
}
