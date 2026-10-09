/*
 * banner: a text in big text's block letters, printed in a terminal where the
 * cursor is, for a CLI as it starts or for `npx ascii.rest banner <text>`. The
 * glint passes once and the banner stays, in the scrollback with the rest of
 * the output. Node only, and only Node's own modules; "ascii.rest/terminal"
 * exports it beside play().
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { banner } from "ascii.rest/terminal";
 *   await banner("my-cli", { color: "#ff6a00" });
 */
import process from "node:process";
import { drawable, fit } from "./pieces/big-text.ts";
import type { Output } from "./terminal.ts";

export interface BannerOptions {
  /** Seconds the glint takes to pass, once; 0 prints the banner still. 1 by default. */
  seconds?: number;
  /** The letters' colour as #rrggbb, in 24-bit colour; the terminal's own by default. The shadow is dimmed either way. */
  color?: string;
  /** For a light terminal: solid letters that the glint lightens, rather than shaded ones it brightens. */
  light?: boolean;
  /** Where to print: process.stdout by default. */
  out?: Output;
}

export interface Bannered {
  /** The banner's size in the terminal's cells; 0 by 0 when the terminal was too narrow for it and it printed its text. */
  cols: number;
  rows: number;
  /** True when Ctrl+C stopped the glint. */
  interrupted: boolean;
}

const HIDE = "\x1b[?25l", SHOW = "\x1b[?25h";
// The shadow's double lines, U+2550 to U+256C, are dimmed.
const shadow = (c: string) => c >= "═" && c <= "╬";

/**
 * Prints a banner and resolves once its glint has passed. Piped, or with NO_COLOR set, it is plain text; piped, it
 * prints at once. It throws if the text has nothing the font draws: letters, digits, spaces and . , ! ? ' : - + = / _.
 */
export async function banner(text: string, { seconds = 1, color, light = false, out = process.stdout }: BannerOptions = {}): Promise<Bannered> {
  const words = drawable(text).trim().replace(/\s+/g, " ");
  if (!words) throw new Error(`ascii.rest: there is nothing in "${text}" to draw; a banner takes letters, digits, spaces and . , ! ? ' : - + = / _`);
  const rgb = color === undefined ? null : /^#?([0-9a-f]{6})$/i.exec(color)?.[1];
  if (rgb === undefined) throw new Error(`ascii.rest: color takes #rrggbb, not "${color}"`);

  const tty = out.isTTY === true;
  const width = out.columns || 80;
  const { cols, rows, frame, glint } = fit(words, width);
  const done: Bannered = { cols, rows, interrupted: false };
  if (cols > width) {
    out.write(`${words}\n`);
    return { cols: 0, rows: 0, interrupted: false };
  }

  const plain = !tty || Boolean(process.env.NO_COLOR);
  const ink = rgb ? `\x1b[38;2;${parseInt(rgb.slice(0, 2), 16)};${parseInt(rgb.slice(2, 4), 16)};${parseInt(rgb.slice(4), 16)}m` : "";
  // Each line in runs of letters and of shadow, each run back to the terminal's own colours at its end.
  const paint = (line: string) => {
    if (plain) return line;
    let s = "", run = "", dim = false;
    const flush = () => {
      if (run.trim()) s += `${dim ? "\x1b[2m" : ink}${run}${dim || ink ? "\x1b[0m" : ""}`;
      else s += run;
      run = "";
    };
    for (const c of line) {
      if (c !== " " && shadow(c) !== dim) {
        flush();
        dim = shadow(c);
      }
      run += c;
    }
    flush();
    return s;
  };
  const lines = (t: number) => frame(t, { paper: light }).split("\n").map((line) => paint(line.trimEnd()));
  // Frame 0 is at rest, the glint out of sight.
  const rest = lines(0);
  if (!tty || !(seconds > 0)) {
    out.write(rest.join("\n") + "\n");
    return done;
  }

  return new Promise<Bannered>((resolve) => {
    let shown = rest;
    const draw = (next: string[]) => {
      if (next.every((line, i) => line === shown[i])) return;
      // back to the banner's first row, then each row over the last, cleared to its end
      out.write(`\x1b[${rows}F` + next.map((line) => `${line}\x1b[K\n`).join(""));
      shown = next;
    };
    const start = performance.now();
    const timer = setInterval(() => {
      const k = (performance.now() - start) / (seconds * 1000);
      if (k >= 1) return finish();
      draw(lines(glint.from + (glint.to - glint.from) * k));
    }, 1000 / 30);
    const show = () => out.write(SHOW);
    // Ctrl+C ends the glint, not the program: the caller decides, as with play().
    const interrupt = () => ((done.interrupted = true), finish());
    // A new width can wrap the rows, and then no redraw lands where it should, so it stops where it is.
    const resize = () => stop();
    const stop = () => {
      clearInterval(timer);
      process.off("SIGINT", interrupt);
      process.off("exit", show);
      out.off?.("resize", resize);
      show();
      resolve(done);
    };
    const finish = () => {
      draw(rest);
      stop();
    };
    process.on("SIGINT", interrupt);
    // If the program exits while the glint passes, the cursor comes back on the way out.
    process.on("exit", show);
    out.on?.("resize", resize);
    out.write(HIDE + rest.map((line) => `${line}\n`).join(""));
  });
}
