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
  /**
   * The letters' colour as #rrggbb, in 24-bit colour, or two for a fade from the first letter to the last; the
   * terminal's own by default. The shadow is dimmed either way.
   */
  color?: string | readonly [string] | readonly [string, string];
  /** A line under the banner, dimmed, once the glint has passed. */
  tagline?: string;
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
 * Prints a banner, and its tagline under it, and resolves once its glint has passed. Piped, or with NO_COLOR set, it
 * has no colour; piped, it prints at once. It throws if the text has nothing the font draws: letters, digits, spaces
 * and . , ! ? ' : - + = / _.
 */
export async function banner(text: string, { seconds = 1, color, tagline = "", light = false, out = process.stdout }: BannerOptions = {}): Promise<Bannered> {
  const words = drawable(text).trim().replace(/\s+/g, " ");
  if (!words) throw new Error(`ascii.rest: there is nothing in "${text}" to draw; a banner takes letters, digits, spaces and . , ! ? ' : - + = / _`);
  const asked = color === undefined ? [] : typeof color === "string" ? [color] : [...color];
  const rgbs = asked.map((c) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
    if (!m) throw new Error(`ascii.rest: color takes #rrggbb, or two of them for a fade, not "${c}"`);
    return m.slice(1).map((h) => parseInt(h, 16));
  });
  if (rgbs.length > 2) throw new Error(`ascii.rest: color takes one colour, or two for a fade, not ${rgbs.length}`);

  const tty = out.isTTY === true;
  const width = out.columns || 80;
  const { cols, rows, frame, glint } = fit(words, width);
  const done: Bannered = { cols, rows, interrupted: false };
  const plain = !tty || Boolean(process.env.NO_COLOR);
  const under = tagline ? `${plain ? tagline : `\x1b[2m${tagline}\x1b[0m`}\n` : "";
  if (cols > width) {
    out.write(`${words}\n${under}`);
    return { cols: 0, rows: 0, interrupted: false };
  }

  // The letters' ink at a column: none, the one colour, or the fade's colour that far along.
  const ink = (x: number) => {
    if (!rgbs.length) return "";
    const [a, b = a] = rgbs, k = cols > 1 ? x / (cols - 1) : 0;
    const [r, g, bl] = a.map((v, i) => Math.round(v + (b[i] - v) * k));
    return `\x1b[38;2;${r};${g};${bl}m`;
  };
  // Each line in runs of one ink, letters or dimmed shadow, back to the terminal's own colours at its end.
  const paint = (line: string) => {
    if (plain) return line;
    let s = "", state = "";
    [...line].forEach((c, x) => {
      const next = c === " " ? state : shadow(c) ? "\x1b[2m" : ink(x);
      if (next !== state) {
        s += (state ? "\x1b[0m" : "") + next;
        state = next;
      }
      s += c;
    });
    return state ? `${s}\x1b[0m` : s;
  };
  const lines = (t: number) => frame(t, { paper: light }).split("\n").map((line) => paint(line.trimEnd()));
  // Frame 0 is at rest, the glint out of sight.
  const rest = lines(0);
  if (!tty || !(seconds > 0)) {
    out.write(rest.join("\n") + "\n" + under);
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
      // the tagline once the glint is done, so the redraws above have only the banner's rows to go back over
      out.write(under);
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
