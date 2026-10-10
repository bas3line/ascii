/*
 * sprite: pixel art from rows of letters, each pixel two columns of block so
 * it stays square, and blank lines between frames to animate it. A README's
 * mascot, a game's character. Each letter is a tone and a block of its own
 * shade, so the art reads in one ink and as plain text too.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii sprite fps=4
 *   ..##..
 *   .#aa#.
 *   ######
 *
 *   ..##..
 *   .#aa#.
 *   #.##.#
 *   ```
 *
 *   sprite("..##..\n.#aa#.\n######")
 *   sprite({ frames: [["#a#", "###"], ["#a#", "#.#"]] }, { fps: 2 })
 */
import { fail } from "../kit/core.ts";
import { numberOf, show } from "../kit/recipes/checks.ts";
import { ACCENT, BAD, GOOD, INK, QUIET, SOFT, VIOLET, WARN, blocks, clean, component, type Common, type MarkdownPiece } from "./core.ts";

/** A sprite as data: what a fence's body says, for art already in JavaScript. */
export interface SpriteData {
  /** Its frames, each rows of pixel letters, every frame as many rows as the first: "." or a space for none, "#" ink, "a" accent and the rest of PIXELS. */
  frames: readonly (readonly string[])[];
}

export interface SpriteOptions extends Common {
  /** Frames a second while it plays its frames, 0.5 to 30: 4 by default. */
  fps?: number;
}

/**
 * The pixel letters: each a tone and the block it is drawn with, two columns a pixel, so a tone shows by its shade in
 * one ink as well as by its colour. "." and a space are no pixel.
 */
export const PIXELS: Readonly<Record<string, { readonly tone: number; readonly block: string }>> = {
  "#": { tone: INK, block: "██" },
  a: { tone: ACCENT, block: "▓▓" },
  b: { tone: BAD, block: "▓▓" },
  v: { tone: VIOLET, block: "▓▓" },
  g: { tone: GOOD, block: "▒▒" },
  w: { tone: WARN, block: "▒▒" },
  s: { tone: SOFT, block: "░░" },
};

// The build: rows print from the top, each first as a faint proof and then in its blocks two rows later. ROW is the
// seconds a row takes, less for a tall sprite so the build is at most BUILD seconds.
const ROW = 0.04, BUILD = 1.6, PROOF = 2;
const FPS = 4;
const EMPTY = new Set([".", " "]);

// The fence's body: rows of pixel letters, a blank line between frames.
function parse(source: string): SpriteData {
  const frames = blocks(source, "sprite");
  if (!frames.length) fail(`sprite takes rows of pixel letters, such as .##.\\n#aa#, and a blank line before each next frame: . is none, # ink, a accent, g green, w yellow, b red, v violet, s soft`);
  return { frames };
}

// Data, checked: every pixel a letter of PIXELS, every frame as many rows as the first, rows padded to the widest.
function check(data: SpriteData): string[][] {
  if (!data || typeof data !== "object" || !Array.isArray(data.frames)) fail(`sprite() takes a fence's body, rows of pixel letters, or { frames }, not ${show(data)}`);
  if (!data.frames.length) fail(`sprite's frames take one frame or more, each rows of pixel letters, such as [[".##.", "#aa#"]]`);
  const frames = data.frames.map((rows, f) => {
    if (!Array.isArray(rows) || !rows.length || !rows.every((r) => typeof r === "string")) fail(`sprite's frame ${f + 1} takes rows of pixel letters, such as [".##.", "#aa#"], not ${show(rows)}`);
    return rows.map((row, r) => {
      const text = clean(row, "sprite's rows").replace(/\s+$/, "");
      for (const ch of text)
        if (!EMPTY.has(ch) && !Object.hasOwn(PIXELS, ch))
          fail(`sprite's frame ${f + 1}, row ${r + 1}, has ${show(ch)}: a pixel is . or a space for none, # ink, a accent, g green, w yellow, b red, v violet or s soft`);
      return text;
    });
  });
  const tall = frames[0].length;
  frames.forEach((rows, f) => {
    if (rows.length !== tall) fail(`sprite's frame ${f + 1} has ${rows.length} row${rows.length === 1 ? "" : "s"}, and frame 1 has ${tall}: every frame is the same size, a blank line only between frames`);
  });
  if (!frames.some((rows) => rows.some((r) => [...r].some((ch) => !EMPTY.has(ch))))) fail(`sprite's frames have no pixels to draw, only . and spaces: # is ink, a accent, g green, w yellow, b red, v violet, s soft`);
  const wide = Math.max(...frames.flat().map((r) => r.length));
  return frames.map((rows) => rows.map((r) => r.padEnd(wide, ".")));
}

/**
 * Pixel art from a fence's body, rows of letters with a blank line between frames, or { frames }. Each pixel is two
 * columns of block in its letter's tone and shade (# ink █, a accent ▓, b red and v violet ▓, g green and w yellow ▒,
 * s soft ░), . or a space none. Unframed by default. The first frame prints a row at a time from the top, each row a
 * faint proof first; then, with two frames or more, it plays them in turn at `fps` while it is in view. Its still is
 * the first frame.
 *
 *   sprite("..##..\n.#aa#.\n######")
 *   sprite({ frames: [["#a#", "###"], ["#a#", "#.#"]] }, { fps: 2, frame: "rounded" })
 */
export function sprite(source: string | SpriteData, options?: SpriteOptions): MarkdownPiece {
  const frames = check(typeof source === "string" ? parse(source) : source);
  return component(
    "sprite",
    options,
    ["fps"],
    (o, room) => {
      const fps = numberOf("sprite's fps", o.fps, FPS, 0.5, 30);
      const H = frames[0].length, W = frames[0][0].length;
      const avail = room.cols ?? room.max;
      if (2 * W > avail) fail(`sprite's rows are ${W} pixels wide, ${2 * W} columns at two a pixel, and it has room for ${Math.floor(avail / 2)}: draw it smaller${o.width === undefined ? "" : ", or give it a width of more"}`);
      const row = Math.min(ROW, BUILD / (H + PROOF));
      const intro = row * (H + PROOF);
      const n = frames.length;
      const which = (t: number) => (t < intro ? 0 : Math.floor((t - intro) * fps + 1e-9) % n);
      return {
        cols: 2 * W,
        rows: H,
        intro,
        ...(n > 1 ? { cycle: n / fps } : {}),
        says: `sprite, ${W} by ${H} pixels, ${n} frame${n === 1 ? "" : "s"}.`,
        draw(s, t, at) {
          const art = frames[which(t)];
          for (let y = 0; y < H; y++) {
            // a row prints first as a proof, every pixel faint, then in its blocks
            const proof = t < intro && t < (y + PROOF) * row;
            if (t < intro && t < y * row) break;
            for (let x = 0; x < W; x++) {
              const px = PIXELS[art[y][x]];
              if (px) s.write(at.x + 2 * x, at.y + y, proof ? "░░" : px.block, proof ? QUIET : px.tone);
            }
          }
        },
      };
    },
    { frame: "none" },
  );
}
