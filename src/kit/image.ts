/*
 * kit image: any image as ascii, drawn the way /make/ and the library's logos
 * are, in code. A logo becomes the characters whose shapes best match its
 * edges, 8 where it is solid, in its own colours (up to 8), lifted on a dark
 * page; a photo is shaded, each cell as dense as the image is bright there. A
 * plain background is taken out from the edges inwards. What comes back is a
 * normal piece, a still or glinting now and then, so it plays wherever a piece
 * does: mount(), <Ascii>, <ascii-art>, svg() for a README, play() in a
 * terminal. fromImage() reads a URL, a file, an <img> or a canvas in a
 * browser, and a PNG by its path, URL or bytes in Node; fromPixels() takes
 * pixels you have decoded already, anywhere. drawImage() draws one into a
 * piece of your own, beside anything else you draw there.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { fromImage } from "ascii.rest/kit";
 *   import { mount } from "ascii.rest";
 *
 *   mount(canvas, await fromImage("/logo.svg", { width: 40, glint: true }));
 */
import type { Category } from "../types.ts";
import { MAX, NONE, and, checkMeta, fail, hex, isHex, piece, ramp as rampOf, type KitPiece, type Palette, type PaletteSpec, type RampName, type Surface } from "./core.ts";
import { CH, CW, FILL, GLYPHS, GX, GY } from "./glyphs.ts";

/** How cells are chosen: by the shape of the image's edge through them, or by how bright it is there. */
export type ImageStyle = "logo" | "shade";

/** What fromPixels(), fromImage() and drawing() take. Every option is checked when the piece is made. */
export interface ImageOptions {
  /**
   * The most columns, its margin of 2 on each side included: 48, from 8 to 320. The image keeps its shape in whole
   * rows, so it comes out about this wide and never wider, and narrower where `height` holds it.
   */
  width?: number;
  /** The most rows, its margin of 1 above and below included: 120, the most a piece can have. 32 keeps it to the library's logos, as /make/ does. */
  height?: number;
  /**
   * "logo": each cell the character whose shape best matches the image's edge through it, 8 where it is solid, as the
   * library's logos are drawn. "shade": each cell a character of `ramp` as dense as the image is bright there, which
   * suits a photo. By default "logo", or "shade" for an image with no transparency and no plain background (a photo),
   * as /make/ chooses.
   */
  style?: ImageStyle;
  /**
   * "remove" (the default): an image with no transparency of its own whose border is mostly one colour has that colour
   * taken out, from the edges inwards, so the same colour inside it (white letters on a shape, say) stays. "keep" draws
   * the image as it is: a plain ground stays in it, drawn as a logo is, and a photo is still shaded.
   */
  background?: "remove" | "keep";
  /**
   * true (the default): the image's own colours, up to 8, each cell the one most of its ink is; on a dark page a dark
   * colour is lifted until it reads and a black is drawn in the page's light ink, as /make/ does, or as a grey where it
   * must stay dark: beside white in the same image, and in the shade style. Where the piece is drawn as text in one ink
   * (a <pre>), white among other colours is left out, so white letters or gaps in a coloured shape still show. false:
   * a piece in one ink, with no colours at all.
   */
  color?: boolean;
  /**
   * false (the default): a still. true: the library logos' glint, a slanted band that lightens the colours and turns
   * solid cells to "/" (shaded, every shade but the two lightest), crossing every 5 seconds from 0.5 s; { every } sets
   * the seconds between glints, 2.5 or more (a glint takes 2 to cross). The piece then loops every `every` seconds. An
   * image with nothing in it stays a still.
   */
  glint?: boolean | { every?: number };
  /**
   * For the shade style, the characters from light to dense: /make/'s ".:-=+*#%@" by default, or a named ramp such as
   * "blocks" or "detailed", or two or more characters of your own. One that starts with a space, as "standard" does,
   * leaves the darkest cells blank on a dark page.
   */
  ramp?: RampName | (string & {});
  /**
   * For the shade style, whether the ramp is turned round, dense where the image is dark. "auto" (the default) turns it
   * on a light page, in colour and in one ink, so what is bright in the image stays light on the page; true turns it on
   * every page; false never does, which in colour on a light page is how /make/ draws it. The logo style takes no notice.
   */
  invert?: boolean | "auto";
  /** Its name, for screen readers and titles: "image". */
  name?: string;
  /** One line, up to 72 characters, saying what you see: made from the name and the style by default. */
  note?: string;
  /** Its category: "logos". */
  category?: Category;
}

/** An image drawn as cells, as /make/'s drawing (site/src/lib/logo.ts) holds it: what fromDrawing() makes a piece of. */
export interface Drawing {
  style: ImageStyle;
  cols: number;
  rows: number;
  /** The image's colours, as [r, g, b] 0 to 255: up to 8. One, black, for an image with nothing in it. */
  colors: [number, number, number][];
  /** The characters, row by row, `cols` each; a space where the cell is blank. */
  art: string[];
  /**
   * Each cell's colour, an index into `colors` as a base-36 digit, or a space where the image has no ink: where the art
   * is blank, but for the darkest cells of a shading whose ramp starts with a space.
   */
  ink: string[];
  /** The characters in one ink, row by row: the art, with white left out where `knocked`. */
  mono: string[];
  /** Whether the one-ink drawing leaves the image's white out. */
  knocked: boolean;
  /** The plain background taken out, as #rrggbb, or null when none was. */
  ground: string | null;
  /**
   * The ramp a shaded drawing's characters come from, light to dense, so they can be turned round on a light page.
   * drawing() sets it; a drawing of your own may leave it out, and the `ramp` option is used instead.
   */
  ramp?: string;
}

/** A piece made from an image, carrying the drawing it plays, so drawImage() and imagePalette() can take it too. */
export interface ImagePiece extends KitPiece {
  readonly drawing: Drawing;
}

/** RGBA pixels, row by row, 4 bytes a pixel, as ImageData.data holds them. (draw's `Pixels` is its half-block canvas.) */
export type PixelArray = Uint8Array | Uint8ClampedArray;

/**
 * What fromImage() reads: a URL (a string or URL), SVG markup, a Blob or File, an <img>, an ImageBitmap or a canvas, or
 * an image file's bytes (a Buffer is one); in Node, a PNG's path too.
 */
export type ImageSource = string | URL | Blob | HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas | Uint8Array | ArrayBuffer;

const MARGIN = { x: 2, y: 1 };
/** /make/'s shade ramp, light to dense. */
const RAMP = ".:-=+*#%@";
// Sub-samples a block is measured in, across and down: 6 by 6 pixels of the CW by CH cell, square.
const SUB = 2;
const NEAR = 42; // how far from the ground's colour, in RGB, a pixel may be and still count as ground
const SHARE = 0.6; // how much of the border must be that one colour for it to count as a plain ground
const SIDE = 2400; // pixels along the longer side an SVG is drawn at, as /make/ draws it
const LARGEST = 4096; // fromImage draws a bigger image down to this along its longer side first

// The logos' glint, as /make/ writes it into a piece.
const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes in the logo style; thin edges keep their shape
const SLASH = 47; // "/"

type RGB = [number, number, number];

interface Settings {
  width: number;
  height: number;
  style: ImageStyle | undefined;
  keep: boolean;
  color: boolean;
  every: number;
  ramp: string;
  invert: boolean | "auto";
  name: string;
  note: string | undefined;
  category: Category;
}

// --- options ----------------------------------------------------------------------

const whole = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

// A value as an error message shows it: short, whatever it is, so a Buffer or a long array isn't printed whole.
function shown(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}...` : v);
  if (v === null || typeof v !== "object") return typeof v === "function" ? "a function" : String(v);
  const name = (v as object).constructor?.name;
  return Array.isArray(v) ? `an array of ${v.length}` : name && name !== "Object" ? `a ${name}` : "an object";
}

// An options object's keys checked against what it takes, naming the one meant where a near name was written.
const NEAR_NAMES: Record<string, string> = { colour: "color", colours: "color", colors: "color", cols: "width", columns: "width", rows: "height", fps: "glint", loop: "glint", every: "glint" };
function known(o: object, keys: readonly string[], what: string): void {
  for (const k of Object.keys(o))
    if (!keys.includes(k)) {
      const near = NEAR_NAMES[k] && keys.includes(NEAR_NAMES[k]) ? ` (did you mean ${NEAR_NAMES[k]}?)` : "";
      fail(`${what} has no option ${JSON.stringify(k)}${near}: it takes ${and(keys)}`);
    }
}

const OPTIONS = ["width", "height", "style", "background", "color", "glint", "ramp", "invert", "name", "note", "category"] as const;

// The seconds between glints a glint option asks for, 0 for none.
function glintEvery(glint: unknown): number {
  if (glint === undefined || glint === false) return 0;
  if (glint === true) return 5;
  if (!glint || typeof glint !== "object") fail(`glint takes true, false or { every: seconds }, not ${shown(glint)}`);
  known(glint, ["every"], "glint");
  const every = (glint as { every?: unknown }).every ?? 5;
  if (typeof every !== "number" || !Number.isFinite(every) || every < PASS + 0.5)
    fail(`glint.every takes a number of seconds of ${PASS + 0.5} or more (a glint takes ${PASS} to cross), not ${String(every)}`);
  return every;
}

const checkInvert = (invert: unknown) => {
  if (invert !== true && invert !== false && invert !== "auto") fail(`invert takes true, false or "auto", not ${shown(invert)}`);
};

// Every option checked, with its default, the moment a piece is asked for.
function settings(o: ImageOptions | undefined): Settings {
  if (o === undefined || o === null) o = {};
  if (typeof o !== "object") fail(`an image takes an options object, such as { width: 48 }, not ${shown(o)}`);
  known(o, OPTIONS, "an image");
  const { width = 48, height = MAX.rows, style, background = "remove", color = true, glint = false, ramp = RAMP, invert = "auto", name = "image", note, category = "logos" } = o;
  if (!whole(width, 8, MAX.cols)) fail(`width takes a whole number of columns from 8 to ${MAX.cols}, not ${String(width)}`);
  if (!whole(height, 3, MAX.rows)) fail(`height takes a whole number of rows from 3 to ${MAX.rows}, not ${String(height)}`);
  if (style !== undefined && style !== "logo" && style !== "shade") fail(`style takes "logo" or "shade", not ${JSON.stringify(style)}`);
  if (background !== "remove" && background !== "keep") fail(`background takes "remove" or "keep", not ${JSON.stringify(background)}`);
  if (typeof color !== "boolean") fail(`color takes true (the image's colours) or false (one ink), not ${JSON.stringify(color)}`);
  const every = glintEvery(glint);
  checkInvert(invert);
  if (typeof name !== "string" || !name.trim()) fail(`name takes a line of text, such as "my logo", not ${JSON.stringify(name)}`);
  if (note !== undefined && (typeof note !== "string" || !note || note.length > 72)) fail(`note takes one line of 1 to 72 characters, not ${JSON.stringify(note)}`);
  // The category is checked as a piece's meta is, so drawing() turns away the same ones as fromPixels().
  checkMeta({ name, category, note: name.slice(0, 72), cols: 1, rows: 1, fps: 0 });
  return { width, height, style, keep: background === "keep", color, every, ramp: rampOf(ramp), invert, name: name.trim(), note, category };
}

function checkPixels(rgba: PixelArray, width: number, height: number): void {
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray))
    fail("an image's pixels take a Uint8Array or Uint8ClampedArray of RGBA, 4 bytes a pixel, row by row, as ImageData.data holds them");
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    fail(`an image takes a width and height in whole pixels of 1 or more, not ${String(width)} by ${String(height)}`);
  if (rgba.length < width * height * 4)
    fail(`an image of ${width} by ${height} pixels takes ${width * height * 4} bytes of RGBA, 4 a pixel, not ${rgba.length}`);
}

// --- the drawing ------------------------------------------------------------------

/**
 * Draws RGBA pixels, row by row as ImageData.data holds them, as cells: /make/'s drawing, the same in Node and in a
 * browser, with no font and no canvas. The image is trimmed to its ink and fitted inside a margin of 2 columns and 1 row.
 * Each cell is measured in 2 by 4 blocks by averaging the image over them; a blank cell stays blank, a solid one is 8,
 * and any other takes the character whose shape best matches the image's edge through it (or, shaded, a character as
 * dense as it is bright). An image with nothing in it gives a blank drawing. Throws, saying what to change, for pixels
 * or options it can't take.
 */
export function drawing(rgba: PixelArray, width: number, height: number, o?: ImageOptions): Drawing {
  return draw(rgba, width, height, settings(o));
}

function draw(rgba: PixelArray, W: number, H: number, set: Settings): Drawing {
  checkPixels(rgba, W, H);
  const found = clearGround(rgba, W, H, !set.keep);
  const data = found.data;
  // A photo: opaque, with no plain ground, whether or not a ground would have been taken out.
  const photo = found.opaque && !found.plain;
  const style: ImageStyle = set.style ?? (photo ? "shade" : "logo");
  const ground = found.ground ?? null;
  const box = trim(data, W, H);
  if (!box) {
    const { cols, rows } = size(W / H, set.width, set.height);
    const blank = Array.from({ length: rows }, () => " ".repeat(cols));
    return { style, cols, rows, colors: [[0, 0, 0]], art: blank, ink: blank.slice(), mono: blank.slice(), knocked: false, ground, ramp: set.ramp };
  }

  const { cols, rows } = size(box.w / box.h, set.width, set.height);
  // As large as fits inside the margin and centred in it, in pixels of a CW by CH cell, as /make/ draws it on a canvas.
  const iw = (cols - 2 * MARGIN.x) * CW, ih = (rows - 2 * MARGIN.y) * CH;
  const k = Math.min(iw / box.w, ih / box.h);
  const dw = Math.max(1, Math.round(box.w * k)), dh = Math.max(1, Math.round(box.h * k));
  const ox = MARGIN.x * CW + Math.floor((iw - dw) / 2), oy = MARGIN.y * CH + Math.floor((ih - dh) / 2);

  // The image averaged over a grid of small squares, SUB by SUB to a block, straight from its pixels: alpha 0 to 1,
  // and colour premultiplied by it.
  const SX = cols * GX * SUB, SY = rows * GY * SUB;
  const tx = taps(SX, CW / (GX * SUB), ox, dw, box.w), ty = taps(SY, CH / (GY * SUB), oy, dh, box.h);
  const A = new Float32Array(SX * SY), R = new Float32Array(SX * SY), G = new Float32Array(SX * SY), B = new Float32Array(SX * SY);
  for (let j = 0; j < SY; j++)
    for (let p = ty.from[j]; p < ty.from[j + 1]; p++) {
      const wy = ty.w[p] / 255, row = (box.y + ty.at[p]) * W + box.x;
      for (let i = 0; i < SX; i++) {
        let a = 0, r = 0, g = 0, b = 0;
        for (let q = tx.from[i]; q < tx.from[i + 1]; q++) {
          const o = (row + tx.at[q]) * 4, al = data[o + 3] * tx.w[q];
          a += al;
          r += al * data[o];
          g += al * data[o + 1];
          b += al * data[o + 2];
        }
        if (!a) continue;
        const s = j * SX + i;
        A[s] += a * wy;
        R[s] += r * wy;
        G[s] += g * wy;
        B[s] += b * wy;
      }
    }
  const red = (s: number) => R[s] / A[s], green = (s: number) => G[s] / A[s], blue = (s: number) => B[s] / A[s];

  const colors = quantize(data, W, box);
  const near = new Map<number, number>();
  const nearest = (s: number) => {
    const r = Math.round(red(s)), g = Math.round(green(s)), b = Math.round(blue(s));
    const key = (r << 16) | (g << 8) | b;
    let q = near.get(key);
    if (q === undefined) {
      q = 0;
      let bd = Infinity;
      for (let j = 0; j < colors.length; j++) {
        const c = colors[j], d = 0.3 * (c[0] - r) ** 2 + 0.59 * (c[1] - g) ** 2 + 0.11 * (c[2] - b) ** 2;
        if (d < bd) (bd = d), (q = j);
      }
      near.set(key, q);
    }
    return q;
  };

  // In one ink, white among other colours is left out: drawn solid, it would fill the letters and gaps it makes. Shaded,
  // white is the brightest shade, and stays.
  const knocked = style === "logo" && colors.some((c) => white(...c)) && !colors.every((c) => white(...c));

  // Each cell's colour, the one most of its ink is; its ink in each block, all of it and without white; and for the
  // shade style how much ink it has and how bright it is.
  const n = cols * rows, per = GX * GY;
  const best = new Uint8Array(n), cover = new Float32Array(n), light = new Float32Array(n);
  const blocks = new Float32Array(n * per), inked = new Float32Array(n * per);
  const votes = new Uint32Array(colors.length);
  const area = SUB * SUB;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const c = y * cols + x;
      votes.fill(0);
      let sa = 0, sl = 0;
      for (let by = 0; by < GY; by++)
        for (let bx = 0; bx < GX; bx++) {
          let v = 0, w = 0;
          for (let sy = 0; sy < SUB; sy++)
            for (let sx = 0; sx < SUB; sx++) {
              const s = ((y * GY + by) * SUB + sy) * SX + (x * GX + bx) * SUB + sx;
              const a = A[s];
              if (!a) continue;
              if (a * 255 >= 128) votes[nearest(s)]++;
              sa += a;
              sl += (0.2126 * R[s] + 0.7152 * G[s] + 0.0722 * B[s]) / 255;
              v += a;
              if (!(knocked && white(red(s), green(s), blue(s)))) w += a;
            }
          blocks[c * per + by * GX + bx] = v / area;
          inked[c * per + by * GX + bx] = w / area;
        }
      let b = 0;
      for (let q = 1; q < votes.length; q++) if (votes[q] > votes[b]) b = q;
      best[c] = b;
      cover[c] = sa / (per * area);
      light[c] = sa ? sl / sa : 0;
    }

  // Shaded, the image's own range of brightness, its darkest and brightest cells but the odd few, spans the ramp. An
  // image of one brightness has no range to span, so it is shaded by how bright it is: white dense, black light.
  const shades = set.ramp;
  const lit = [...light].filter((_, c) => cover[c] >= 0.1).sort((a, b) => a - b);
  let lo = lit[Math.floor(lit.length * 0.02)] ?? 0, hi = lit[Math.floor(lit.length * 0.98)] ?? 1;
  if (hi - lo < 0.02) (lo = 0), (hi = 1);
  const shade = (c: number) => shades[Math.max(0, Math.min(shades.length - 1, Math.floor(((light[c] - lo) / Math.max(1e-6, hi - lo)) * shades.length)))];

  const art: string[] = [], ink: string[] = [], mono: string[] = [];
  for (let y = 0; y < rows; y++) {
    let a = "", i = "", m = "";
    for (let x = 0; x < cols; x++) {
      const c = y * cols + x;
      let ch: string;
      if (style === "shade") {
        ch = cover[c] < 0.1 ? " " : shade(c);
        m += ch;
      } else {
        ch = pick(blocks, c * per);
        m += knocked ? pick(inked, c * per) : ch;
      }
      a += ch;
      // Shaded with a ramp that starts with a space, the darkest cells are spaces that still have ink: they keep a colour,
      // so they can turn dense on a light page.
      i += (style === "shade" ? cover[c] < 0.1 : ch === " ") ? " " : best[c].toString(36);
    }
    art.push(a);
    ink.push(i);
    mono.push(m);
  }
  return { style, cols, rows, colors, art, ink, mono, knocked, ground, ramp: shades };
}

/**
 * The piece's size for an image of this aspect (width over height), about `width` columns across and no wider, or
 * fewer where the rows run out, as /make/ sizes it.
 */
function size(aspect: number, width: number, height: number) {
  const maxC = Math.max(1, width - 2 * MARGIN.x), maxR = Math.max(1, height - 2 * MARGIN.y);
  const rIn = Math.max(1, Math.min(maxR, Math.round(maxC / (2 * aspect))));
  // Rounding the rows can make it a column wider than asked, where /make/ lets it be: kept to the width, the image is
  // still drawn in its own shape, a little smaller inside the margin.
  const cIn = Math.max(1, Math.min(maxC, Math.round(2 * aspect * rIn)));
  return { cols: cIn + 2 * MARGIN.x, rows: rIn + 2 * MARGIN.y };
}

/**
 * For each of `n` steps along one side of the grid, `step` pixels of the CW by CH cell each, the image's pixels it
 * covers and how much of each: the image is drawn `drawn` cell pixels long from `off`, over `length` of its own. A step
 * that spans a pixel or more averages the pixels under it, as a high-quality downscale does; a shorter one blends the
 * two nearest, as an upscale does. A step partly off the image counts that part as clear.
 */
function taps(n: number, step: number, off: number, drawn: number, length: number) {
  const scale = length / drawn;
  const from = new Int32Array(n + 1);
  const at: number[] = [], w: number[] = [];
  for (let j = 0; j < n; j++) {
    from[j] = at.length;
    const a = (j * step - off) * scale, b = ((j + 1) * step - off) * scale;
    const lo = Math.max(a, 0), hi = Math.min(b, length);
    if (hi <= lo) continue;
    const span = b - a;
    if (span >= 1) {
      for (let p = Math.floor(lo); p < hi; p++) {
        const k = (Math.min(hi, p + 1) - Math.max(lo, p)) / span;
        if (k > 0) at.push(p), w.push(k);
      }
    } else {
      const f = (hi - lo) / span;
      const m = Math.min(length - 1, Math.max(0, (lo + hi) / 2 - 0.5));
      const p = Math.floor(m), k = m - p;
      at.push(p), w.push(f * (1 - k));
      if (k > 0) at.push(Math.min(length - 1, p + 1)), w.push(f * k);
    }
  }
  from[n] = at.length;
  return { from, at: Int32Array.from(at), w: Float64Array.from(w) };
}

// The box of an image's ink, as sharp's trim with a threshold of 1 finds it; null when it has none.
function trim(data: PixelArray, W: number, H: number) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] > 1) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Takes a plain ground out of an image that has no transparency of its own, when `take`: the colour most of its border
 * is, from the edges inwards, and softly at the edge of what is left, where the image's own edge was blended into it.
 * Works on a copy, so the caller's pixels are never changed. Says whether the image is opaque, whether its border is
 * a plain ground (mostly one colour), and the ground it took as #rrggbb, if any: none when the image has a transparency
 * of its own, its border isn't plain, or it was asked not to.
 */
function clearGround(src: PixelArray, W: number, H: number, take: boolean): { data: PixelArray; opaque: boolean; plain: boolean; ground?: string } {
  const border: number[] = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 1; y < H - 1; y++) border.push(y * W, y * W + W - 1);
  // An image whose border is already mostly clear has a transparency of its own.
  if (border.filter((p) => src[p * 4 + 3] < 128).length > border.length / 2) return { data: src, opaque: false, plain: false };
  // The border's commonest colour, in buckets of 16 a channel, and the mean of the pixels in it.
  const buckets = new Map<number, number[]>();
  for (const p of border) {
    const i = p * 4;
    const key = ((src[i] >> 4) << 8) | ((src[i + 1] >> 4) << 4) | (src[i + 2] >> 4);
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(p);
  }
  const top = [...buckets.values()].sort((a, b) => b.length - a.length)[0];
  if (top.length < border.length * SHARE) return { data: src, opaque: true, plain: false };
  if (!take) return { data: src, opaque: true, plain: true };
  const g = [0, 1, 2].map((c) => Math.round(top.reduce((s, p) => s + src[p * 4 + c], 0) / top.length));
  const data = new Uint8ClampedArray(src.subarray(0, W * H * 4));
  const far = (p: number) => Math.hypot(data[p * 4] - g[0], data[p * 4 + 1] - g[1], data[p * 4 + 2] - g[2]);

  // From every border pixel near the ground's colour, the ground spreads to its neighbours that are near it too.
  const out = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0, tail = 0;
  for (const p of border) if (!out[p] && far(p) < NEAR) (out[p] = 1), (queue[tail++] = p);
  const spread = (q: number) => {
    if (!out[q] && far(q) < NEAR) (out[q] = 1), (queue[tail++] = q);
  };
  while (head < tail) {
    const p = queue[head++];
    const x = p % W;
    if (x > 0) spread(p - 1);
    if (x < W - 1) spread(p + 1);
    if (p >= W) spread(p - W);
    if (p + W < W * H) spread(p + W);
  }
  // Taken out; and beside it, a pixel still close to the ground's colour is the image's edge blended into the ground,
  // so it keeps only as much ink as it is far from that colour.
  for (let p = 0; p < W * H; p++) {
    if (out[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    const x = p % W;
    const beside = (x > 0 && out[p - 1]) || (x < W - 1 && out[p + 1]) || (p >= W && out[p - W]) || (p + W < W * H && out[p + W]);
    if (beside) data[p * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (far(p) - NEAR) / NEAR)));
  }
  return { data, opaque: true, plain: true, ground: hex(g) };
}

/** White, as the logo generators' knock took it. */
function white(r: number, g: number, b: number) {
  return r > 215 && g > 215 && b > 215;
}

// The character for a cell's ink in its blocks, from `at` in `v`: blank, solid, or the glyph whose shape is nearest.
function pick(v: Float32Array, at: number) {
  const len = GX * GY;
  let min = 1, max = 0;
  for (let i = at; i < at + len; i++) (min = Math.min(min, v[i])), (max = Math.max(max, v[i]));
  if (max < 0.1) return " ";
  if (min > 0.8) return FILL;
  let best = " ", bd = Infinity;
  for (const g of GLYPHS) {
    let d = 0;
    for (let i = 0; i < len; i++) d += (v[at + i] - g.v[i]) ** 2;
    if (d < bd) (bd = d), (best = g.ch);
  }
  // an empty cell beats a glyph that is mostly in the wrong place
  let e = 0;
  for (let i = at; i < at + len; i++) e += v[i] * v[i];
  return e < bd ? " " : best;
}

const d2 = (a: ArrayLike<number>, b: ArrayLike<number>) => 0.3 * (a[0] - b[0]) ** 2 + 0.59 * (a[1] - b[1]) ** 2 + 0.11 * (a[2] - b[2]) ** 2;

/**
 * The image's colours, up to k: k-means over the opaque pixels in its box, merged until every colour is distinct and
 * used, as /make/ does it. The image's own pixels, not the averaged squares, so an edge blending two colours doesn't
 * count as a third; past half a million of them, an even spread of about that many. The pixels are counted by colour
 * first, which gives the same means as going through them one by one, in a fraction of the time.
 */
function quantize(data: PixelArray, W: number, box: { x: number; y: number; w: number; h: number }, k = 8): RGB[] {
  const px: RGB[] = [];
  const counts = new Map<number, number>();
  let total = 0;
  const step = Math.max(1, Math.ceil(Math.sqrt((box.w * box.h) / 5e5)));
  for (let y = box.y; y < box.y + box.h; y += step)
    for (let x = box.x; x < box.x + box.w; x += step) {
      const i = (y * W + x) * 4;
      if (data[i + 3] <= 200) continue;
      // every 7th, which the first guesses are chosen from
      if (total++ % 7 === 0) px.push([data[i], data[i + 1], data[i + 2]]);
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  if (!total) return [[0, 0, 0]];
  // Each colour once, with how many pixels are it, in flat arrays for the loops below.
  const m = counts.size;
  const pr = new Float64Array(m), pg = new Float64Array(m), pb = new Float64Array(m), pw = new Float64Array(m);
  let j = 0;
  for (const [key, w] of counts) (pr[j] = key >> 16), (pg[j] = (key >> 8) & 255), (pb[j] = key & 255), (pw[j++] = w);

  let C: number[][] = [px[0]];
  while (C.length < k) {
    let far = px[0], fd = -1;
    for (const p of px) {
      let d = Infinity;
      for (const c of C) d = Math.min(d, d2(c, p));
      if (d > fd) (fd = d), (far = p);
    }
    if (fd < 40) break;
    C.push(far);
  }
  for (let it = 0; it < 12; it++) {
    const n = C.length;
    const cr = Float64Array.from(C, (c) => c[0]), cg = Float64Array.from(C, (c) => c[1]), cb = Float64Array.from(C, (c) => c[2]);
    const sum = new Float64Array(n * 4);
    for (let q = 0; q < m; q++) {
      const r = pr[q], g = pg[q], b = pb[q];
      let bi = 0, bd = Infinity;
      for (let i = 0; i < n; i++) {
        const d = 0.3 * (cr[i] - r) ** 2 + 0.59 * (cg[i] - g) ** 2 + 0.11 * (cb[i] - b) ** 2;
        if (d < bd) (bd = d), (bi = i);
      }
      const w = pw[q];
      sum[bi * 4] += r * w;
      sum[bi * 4 + 1] += g * w;
      sum[bi * 4 + 2] += b * w;
      sum[bi * 4 + 3] += w;
    }
    C = [];
    for (let i = 0; i < n; i++) {
      const w = sum[i * 4 + 3];
      if (w > total * 0.004) C.push([sum[i * 4] / w, sum[i * 4 + 1] / w, sum[i * 4 + 2] / w]);
    }
  }
  // merge near twins
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < C.length && !merged; i++)
      for (let j = i + 1; j < C.length && !merged; j++)
        if (d2(C[i], C[j]) < 260) {
          C[i] = C[i].map((v, q) => (v + C[j][q]) / 2);
          C.splice(j, 1);
          merged = true;
        }
  }
  return C.map((c) => c.map(Math.round) as RGB);
}

// --- colours on a dark page, and a shading's on a light one -----------------------------

const PAGE: RGB = [19, 21, 24]; // the site's dark page
const PAPER: RGB = [255, 255, 255];
/** The site's ink on its dark page: a black is drawn in it there, as the vercel and apple logos are. */
const LIGHT: RGB = [232, 235, 239];

const lum = (c: RGB) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a: RGB, b: RGB) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
function hsl(c: RGB): RGB {
  const [r, g, b] = c.map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl([h, s, l]: RGB): RGB {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => ((t = (t + 1) % 1) < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p);
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)) as RGB;
}
const grey = (c: RGB) => Math.max(...c) - Math.min(...c) < 24 || (Math.max(...c) - Math.min(...c)) / Math.max(...c) < 0.3;
const black = (c: RGB) => Math.max(...c) < 64 && Math.max(...c) - Math.min(...c) < 24;

/**
 * On a dark page a dark colour is lifted until it reads: a brand colour to 2.8 against the page, a grey to 2.4, and a
 * black is the page's ink. With `dim`, a black is lifted as a grey instead, so it stays dark: where the image has white
 * too, which it would vanish into (a gopher's pupils in its white eyes, white letters on a black shape), and in a
 * shading, where black is the darkest shade rather than a shape's ink.
 */
function lift(c: RGB, dim = false): RGB {
  if (black(c) && !dim) return LIGHT;
  const [h, s, l] = hsl(c);
  const g = grey(c);
  const want = g ? 2.4 : 2.8;
  let k = l, out = c;
  while (contrast(out, PAGE) < want && k < 0.8) out = fromHsl([h, g ? 0 : s, (k += 0.01)]);
  return out;
}

/**
 * A shading's light colour darkened on a light page until it reads, as lift() does on a dark one: a grey to 2.4
 * against the paper, a colour to 2.8. A photo's brightest parts are a few light characters there, and drawn in near
 * white as well they would vanish.
 */
function sink(c: RGB): RGB {
  const [h, s, l] = hsl(c);
  const g = grey(c);
  const want = g ? 2.4 : 2.8;
  let k = l, out = c;
  while (contrast(out, PAPER) < want && k > 0.2) out = fromHsl([h, g ? 0 : s, (k -= 0.01)]);
  return out;
}

const tint = (c: RGB, k: number) => c.map((v) => Math.round(v + (255 - v) * k)) as RGB;

/**
 * The piece's colours, as /make/ writes them: for a light page, the image's colours as drawn and then twice lighter for
 * the glint; for a dark page the same, lifted. Colour i is the drawn one, n + i and 2n + i its glint. A shading's light
 * colours are darkened until they read on paper, which /make/ leaves as they are.
 */
function palette(colors: readonly RGB[], style: ImageStyle) {
  const runs = (cs: readonly RGB[]) => [...cs, ...cs.map((c) => tint(c, 0.35)), ...cs.map((c) => tint(c, 0.7))].map(hex);
  const dim = style === "shade" || colors.some((c) => white(...c));
  return { light: runs(style === "shade" ? colors.map(sink) : colors), dark: runs(colors.map((c) => lift(c, dim))) };
}

// --- the piece ----------------------------------------------------------------------

// A drawing passed in by hand, checked: rows of cols characters, and colours its ink can index.
function checkDrawing(d: Drawing, fn: string): void {
  if (!d || typeof d !== "object") fail(`${fn}() takes a drawing, as drawing() returns it, or a piece fromImage() made, not ${shown(d)}`);
  const { cols, rows, colors, art, ink, mono } = d;
  if (d.ramp !== undefined) rampOf(d.ramp);
  if (!whole(cols, 1, MAX.cols) || !whole(rows, 1, MAX.rows)) fail(`a drawing takes whole numbers of columns from 1 to ${MAX.cols} and rows from 1 to ${MAX.rows}, not ${String(cols)} by ${String(rows)}`);
  if (d.style !== "logo" && d.style !== "shade") fail(`a drawing's style takes "logo" or "shade", not ${JSON.stringify(d.style)}`);
  if (!Array.isArray(colors) || !colors.length || colors.length > 10 || !colors.every((c) => Array.isArray(c) && c.length === 3 && c.every((v) => whole(v, 0, 255))))
    fail("a drawing's colors take 1 to 10 colours, each [r, g, b] of whole numbers 0 to 255");
  for (const [what, lines] of [["art", art], ["ink", ink], ["mono", mono]] as const) {
    if (!Array.isArray(lines) || lines.length !== rows) fail(`a drawing's ${what} takes ${rows} rows, one a line, not ${Array.isArray(lines) ? lines.length : String(lines)}`);
    lines.forEach((l, y) => {
      if (typeof l !== "string" || l.length !== cols) fail(`a drawing's ${what} takes rows of ${cols} characters: row ${y} is ${typeof l === "string" ? l.length : String(l)}`);
      if (/[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/.test(l)) fail(`a drawing's ${what} takes printable characters from the Basic Multilingual Plane: row ${y} has another`);
    });
  }
  ink.forEach((l, y) => {
    for (let x = 0; x < cols; x++)
      if ((art[y][x] !== " " || l[x] !== " ") && !(parseInt(l[x], 36) < colors.length))
        fail(`a drawing's ink takes, for each drawn cell, a digit for one of its ${colors.length} colours: row ${y}, column ${x} is ${JSON.stringify(l[x])}`);
  });
}

// A drawing worked out once, to be drawn frame after frame: its cells as char codes for each way it is drawn (in colour,
// in one ink, and turned round), each cell's colour, the solid cells the glint turns to slashes, where along the glint
// each cell lies, and the 3n colours for each theme.
interface Prepared {
  cols: number;
  rows: number;
  n: number;
  shade: boolean;
  art: Uint16Array;
  mono: Uint16Array;
  turned: Uint16Array;
  ink: Uint8Array;
  hard: Uint8Array[];
  pos: Float32Array;
  /** The ink's first and last place along the glint; lo is above hi when there is no ink. */
  lo: number;
  hi: number;
  light: string[];
  dark: string[];
  /** drawImage()'s palette index for each of the 3n colours, for each palette it draws into, on paper and dark. */
  index: WeakMap<Palette, (Uint8Array | undefined)[]>;
}

// Each drawing's workings, by the ramp asked for (the drawing's own, or else the option's).
const prepared = new WeakMap<Drawing, Map<string, Prepared>>();

// The drawing a piece fromImage() made plays, or a drawing as it is.
function drawingOf(img: Drawing | ImagePiece, fn: string): Drawing {
  if (img && typeof img === "object" && "meta" in img) {
    if ("drawing" in img) return img.drawing;
    fail(`${fn}() takes a drawing or a piece fromImage() made, not another piece: lay that one over with compose's layer() or over()`);
  }
  return img as Drawing;
}

// A drawing checked and worked out, once for each drawing (and ramp), so drawing it each frame allocates nothing.
function prepare(d: Drawing, ramp: string, fn: string): Prepared {
  const asked = d && typeof d === "object" && d.ramp !== undefined ? d.ramp : ramp;
  const had = d && typeof d === "object" ? prepared.get(d)?.get(asked) : undefined;
  if (had) return had;
  checkDrawing(d, fn);
  const { cols, rows, style } = d;
  const cells = cols * rows;
  const shades = rampOf(asked);
  // What the glint turns to slashes: solid shapes, or every shade but the two lightest.
  const solid = style === "shade" ? shades.slice(2).replace(/ /g, "") : SOLID;

  const art = new Uint16Array(cells), mono = new Uint16Array(cells), turned = new Uint16Array(cells), ink = new Uint8Array(cells);
  const hard = [new Uint8Array(cells), new Uint8Array(cells), new Uint8Array(cells)];
  const pos = new Float32Array(cells);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x, a = d.art[y][x], m = d.mono[y][x], inked = d.ink[y][x] !== " ";
      // Shaded, a cell with ink turned round: dense where the image is dark, as a light page wants.
      const at = style === "shade" && inked ? shades.indexOf(m) : -1;
      const p = at >= 0 ? shades[shades.length - 1 - at] : m;
      art[i] = a.charCodeAt(0);
      mono[i] = m.charCodeAt(0);
      turned[i] = p.charCodeAt(0);
      ink[i] = inked ? parseInt(d.ink[y][x], 36) : 0;
      hard[0][i] = +solid.includes(a);
      hard[1][i] = +solid.includes(m);
      hard[2][i] = +solid.includes(p);
      pos[i] = x + LEAN * y;
      // The glint crosses the image's ink, edge to edge, rather than the whole frame.
      if (inked || a !== " " || m !== " ") (lo = Math.min(lo, pos[i])), (hi = Math.max(hi, pos[i]));
    }
  const { light, dark } = palette(d.colors, style);
  const p: Prepared = { cols, rows, n: d.colors.length, shade: style === "shade", art, mono, turned, ink, hard, pos, lo, hi, light, dark, index: new WeakMap() };
  if (!prepared.has(d)) prepared.set(d, new Map());
  prepared.get(d)!.set(asked, p);
  return p;
}

/**
 * Draws a prepared drawing into s with its top left at x, y, as its frame at t: blank cells left as they are, the glint
 * crossing every `every` seconds (0 for none), the shades turned round as `invert` says, and each cell in the palette
 * index `idx` gives for its place among the 3n colours, or in none.
 */
function paint(s: Surface, p: Prepared, x: number, y: number, t: number, every: number, invert: boolean | "auto", idx: Uint8Array | null): void {
  const turn = p.shade && (invert === true || (invert === "auto" && s.paper));
  const chars = turn ? p.turned : idx ? p.art : p.mono;
  const solidAt = p.hard[turn ? 2 : idx ? 0 : 1];
  const { cols, n, pos, ink } = p;
  // Nothing drawn, nothing to glint.
  const at = every && p.lo <= p.hi && t >= START ? p.lo - HALF + ((p.hi - p.lo + 2 * HALF) * ((t - START) % every)) / PASS : -Infinity;
  x = Math.floor(x);
  y = Math.floor(y);
  const c0 = Math.max(0, -x), c1 = Math.min(cols, s.cols - x), r1 = Math.min(p.rows, s.rows - y);
  for (let r = Math.max(0, -y); r < r1; r++)
    for (let c = c0, i = r * cols + c0; c < c1; c++, i++) {
      let ch = chars[i];
      // a blank cell is left as it is, so the image lays over whatever is under it
      if (ch === 32) continue;
      let k = 0;
      const dist = Math.abs(pos[i] - at);
      if (dist < HALF) {
        k = 1 - dist / HALF;
        k = k * k * (3 - 2 * k);
      }
      if (k > 0.55 && solidAt[i]) ch = SLASH;
      s.put((r + y) * s.cols + c + x, ch, idx ? idx[(k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + ink[i]] : NONE);
    }
}

/**
 * A drawing as a piece: a still, or glinting now and then with `glint`. Takes the same options as fromPixels(), of
 * which the size, style and background were for the drawing and are not used here. Its shades are turned round
 * (`invert`) by the ramp drawing() recorded in it; for a drawing of your own with none, give `ramp`.
 */
export function fromDrawing(d: Drawing, o?: ImageOptions): ImagePiece {
  return pieceOf(d, settings(o), "fromDrawing");
}

function pieceOf(d: Drawing, set: Settings, fn: string): ImagePiece {
  const p = prepare(d, set.ramp, fn);
  // Nothing drawn, nothing to glint: a still.
  const every = p.lo <= p.hi ? set.every : 0;
  const kind = p.shade ? "shaded" : "drawn";
  const note = set.note ?? `${set.name}, ${kind} in ascii${every ? ", glinting now and then" : ""}`.slice(0, 72);

  const spec = { name: set.name, note, category: set.category, cols: p.cols, rows: p.rows, fps: every ? 30 : 0, ...(every ? { loop: every } : {}) };
  const made = piece(set.color ? { ...spec, palette: { light: p.light, dark: p.dark } } : spec, {
    setup: () => {
      // Each theme's palette index for colour j of the 3n (drawn, half lit, lit), made on the first frame in the theme.
      const index: (Uint8Array | undefined)[] = [undefined, undefined];
      return (t, s, ctx) => {
        const idx = s.palette && !ctx.mono ? (index[+ctx.paper] ??= Uint8Array.from({ length: 3 * p.n }, (_, j) => s.palette!.index(j, ctx.paper))) : null;
        paint(s, p, 0, 0, t, every, set.invert, idx);
      };
    },
  });
  return { ...made, drawing: d };
}

/** What drawImage() takes besides where, all of it optional. */
export interface DrawImageOptions {
  /** The frame's time in seconds, for the glint: 0. */
  t?: number;
  /**
   * The logos' glint, as fromImage() takes it: false. The piece drawing it sets its own fps, and its loop to the
   * glint's `every`, 5 seconds by default.
   */
  glint?: boolean | { every?: number };
  /** Whether a shading's shades are turned round, as fromImage() takes it: "auto", on a light page. */
  invert?: boolean | "auto";
}

/**
 * Draws an image into a surface you have, its top left (its margin included) at column x, row y, so it sits beside
 * whatever else your piece draws: text, boxes, a field, particles. Takes a piece fromImage() or fromPixels() made, or a
 * drawing. Its blank cells are left as they are, so it lays over what is under it, and what falls outside the surface is
 * left out. In colour, each cell takes the piece's colour nearest its own: give the piece imagePalette() and they are
 * the image's own, lifted on a dark page as fromImage() lifts them. In a piece in one ink, or one played as text, it is
 * drawn as fromImage() draws it in one ink. A drawing is worked out the first time it is drawn: draw a changed one as a
 * new object.
 *
 *   const logo = await fromImage("/logo.png", { width: 24 });
 *   export default piece({ name: "card", cols: 60, rows: 12, loop: 5, palette: imagePalette(logo) }, (t, s) => {
 *     drawImage(s, logo, 0, 0, { t, glint: true });
 *     s.write(26, 5, "my project");
 *   });
 */
export function drawImage(s: Surface, img: Drawing | ImagePiece, x = 0, y = 0, o?: DrawImageOptions): void {
  if (!s || typeof s !== "object" || typeof s.put !== "function" || !Number.isInteger(s.cols) || !Number.isInteger(s.rows))
    fail(`drawImage() takes the surface to draw on first, as a piece's drawing is given it: (t, s) => drawImage(s, logo), not ${shown(s)}`);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`drawImage() takes the column and row of the image's top left as numbers, not ${shown(x)} and ${shown(y)}`);
  let t = 0, every = 0, invert: boolean | "auto" = "auto";
  if (o !== undefined) {
    if (!o || typeof o !== "object") fail(`drawImage() takes its options as an object, such as { t, glint: true }, not ${shown(o)}`);
    known(o, ["t", "glint", "invert"], "drawImage()");
    if (o.t !== undefined && typeof o.t !== "number") fail(`drawImage()'s t takes the frame's time in seconds, not ${shown(o.t)}`);
    // a time that isn't finite is the first frame, as piece() takes it
    t = Number.isFinite(o.t) ? (o.t as number) : 0;
    every = glintEvery(o.glint);
    if (o.invert !== undefined) checkInvert((invert = o.invert));
  }
  const p = prepare(drawingOf(img, "drawImage"), RAMP, "drawImage");
  let idx: Uint8Array | null = null;
  const pal = s.palette;
  if (pal && !s.mono) {
    let themes = p.index.get(pal);
    if (!themes) p.index.set(pal, (themes = [undefined, undefined]));
    const paper = s.paper;
    idx = themes[+paper] ??= Uint8Array.from(paper ? p.light : p.dark, (c) => pal.index(c, paper));
  }
  paint(s, p, x, y, t, every, invert, idx);
}

/**
 * The colours for a piece that draws an image with drawImage(), so the image keeps its own: for each theme, any of your
 * own first, so your colour i is index i on both themes and the first is the piece's ink, then the image's colours and
 * their glint, as fromImage() makes them. Yours are one list for both themes, or { light, dark } of the same length.
 *
 *   palette: imagePalette(logo, { light: ["#1f2328"], dark: ["#f0f6fc"] })
 */
export function imagePalette(img: Drawing | ImagePiece, colors?: PaletteSpec): { light: string[]; dark: string[] } {
  const p = prepare(drawingOf(img, "imagePalette"), RAMP, "imagePalette");
  if (colors === undefined) return { light: [...p.light], dark: [...p.dark] };
  const mine = (Array.isArray(colors) ? { light: colors, dark: colors } : colors) as { light: readonly string[]; dark: readonly string[] };
  const list = (l: unknown) => Array.isArray(l) && l.every(isHex);
  if (!mine || typeof mine !== "object" || !list(mine.light) || !list(mine.dark) || mine.light.length !== mine.dark.length)
    fail(`imagePalette() takes colours of your own as a list of #rrggbb, or { light, dark } lists of the same length, not ${shown(colors)}`);
  const room = 32 - p.light.length;
  if (mine.light.length > room)
    fail(`this image's ${p.n} colours and their glint take ${2 * p.light.length} of the 64 a piece can have, which leaves room for ${room} of your own, not ${mine.light.length}`);
  return { light: [...mine.light, ...p.light], dark: [...mine.dark, ...p.dark] };
}

/**
 * RGBA pixels as a piece: drawing() and fromDrawing() in one call. Pure, so it works in Node (decode a PNG or JPEG
 * with sharp, say) and in browsers (ImageData.data) alike. Throws, saying what to change, for pixels or options it
 * can't take.
 *
 *   const { data, info } = await sharp("logo.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
 *   export default fromPixels(data, info.width, info.height, { name: "my logo", glint: true });
 */
export function fromPixels(rgba: PixelArray, width: number, height: number, o?: ImageOptions): ImagePiece {
  const set = settings(o);
  return pieceOf(draw(rgba, width, height, set), set, "fromPixels");
}

// --- reading an image ---------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";
const isMarkup = (text: string) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text);

/**
 * Any image, as a piece. In a browser: a URL (fetched, so another site's must allow it with CORS), a data: URL, SVG
 * markup, a Blob or File (an <input type="file">'s, say), an <img>, an ImageBitmap, or a canvas. PNG, JPG, WebP, GIF
 * (its first frame), AVIF and BMP are decoded with createImageBitmap; SVG is drawn 2400 pixels along its longer side, as
 * /make/ draws it, and needs a page (not a worker). Nothing leaves the page.
 *
 * In Node (and wherever else there is no createImageBitmap), a PNG: by its path, a file: URL such as
 * `new URL("./logo.png", import.meta.url)`, an http(s) URL, its bytes (readFileSync's Buffer), or a Blob, decoded by
 * the kit itself, so a script that writes a README's SVG needs nothing else. Any other format there takes a decoder of
 * your own and fromPixels().
 *
 * The piece carries its drawing, so drawImage() can draw it into a piece of your own as well. Rejects, saying what went
 * wrong, for options or an image it can't take.
 *
 *   const logo = await fromImage(input.files[0], { width: 40, glint: true });
 *   export default await fromImage(new URL("./logo.png", import.meta.url), { glint: true });
 */
export async function fromImage(src: ImageSource, o?: ImageOptions): Promise<ImagePiece> {
  const set = settings(o);
  const { data, width, height } = await pixelsOf(src);
  return pieceOf(draw(data, width, height, set), set, "fromImage");
}

/** An image's pixels as ImageData holds them: RGBA, row by row, 4 bytes a pixel. */
export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const SOURCES = "a URL, a path, SVG markup, a file's bytes, a Blob, an <img>, an ImageBitmap or a canvas";

async function pixelsOf(src: ImageSource): Promise<PixelData> {
  if (typeof src === "string") {
    if (isMarkup(src)) return svg(src);
    const s = src.trim();
    if (!s) fail(`fromImage() takes ${SOURCES}, not an empty string`);
    // Off a page, a string with no scheme (C:\ is a drive, not one) is a file's path, and a file: URL is read from disk.
    if (files() && (!/^[a-z][a-z\d+.-]+:/i.test(s) || /^file:/i.test(s))) return blob(await file(/^file:/i.test(s) ? new URL(s) : s));
    return blob(await load(s));
  }
  if (typeof URL !== "undefined" && src instanceof URL) return blob(src.protocol === "file:" && files() ? await file(src) : await load(src.href));
  if (typeof Blob !== "undefined" && src instanceof Blob) return blob(src);
  // An image file's bytes, as readFileSync() or a fetch's arrayBuffer() gives them.
  if (src instanceof Uint8Array || src instanceof ArrayBuffer) return blob(new Blob([src as Uint8Array<ArrayBuffer>]));
  if (src instanceof Uint8ClampedArray) fail("fromImage() takes an image file, not pixels: for RGBA pixels, as ImageData.data holds them, use fromPixels(data, width, height)");
  if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) return image(src);
  if (src && typeof src === "object" && typeof (src as { width?: unknown }).width === "number" && typeof (src as { height?: unknown }).height === "number")
    return drawn(src as CanvasImageSource, (src as ImageBitmap).width, (src as ImageBitmap).height);
  fail(`fromImage() takes ${SOURCES}, not ${shown(src)}`);
}

// A URL as an error message shows it: a data: URL's data left out.
const where = (url: string) => (url.length > 80 ? `${url.slice(0, 60)}...` : url);

async function load(url: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    fail(`fromImage() could not load ${where(url)}: ${files() ? "check the address and the network" : "from another site, it must allow it (CORS); or pass a Blob or an <img>"}`);
  }
  if (!res.ok) fail(`fromImage() could not load ${where(url)}: ${res.status} ${res.statusText}`.trim());
  const b = await res.blob();
  // A server that says nothing of the type: an .svg URL is still read as SVG.
  return !b.type && /\.svg(?:[?#]|$)/i.test(url) ? new Blob([b], { type: "image/svg+xml" }) : b;
}

async function blob(b: Blob): Promise<PixelData> {
  const named = (b as File).name;
  const head = new Uint8Array(await b.slice(0, PNG.length).arrayBuffer());
  const png = PNG.every((v, i) => head[i] === v);
  const isSvg = !png && (b.type === "image/svg+xml" || (typeof named === "string" && /\.svg$/i.test(named)) || (!b.type && isMarkup(await b.slice(0, 512).text())));
  if (isSvg) return svg(await b.text());
  // With nothing to decode with, as in Node, the kit reads a PNG itself.
  if (typeof createImageBitmap !== "function") {
    if (png) return readPng(new Uint8Array(await b.arrayBuffer()));
    fail("fromImage() reads only PNG where there is no browser to decode an image, as in Node: decode a JPEG, WebP or GIF yourself (sharp does) and pass its pixels to fromPixels()");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(b);
  } catch {
    fail("fromImage() could not read that image: try an svg, png, jpg, webp or gif");
  }
  try {
    return drawn(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function image(img: HTMLImageElement): Promise<PixelData> {
  if (!img.complete || !img.naturalWidth) {
    try {
      await img.decode();
    } catch {
      fail(`fromImage() could not load the <img> ${img.currentSrc || img.src}`);
    }
  }
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  // An SVG has no pixels of its own: it is drawn as large as /make/ draws one.
  if (/\.svg(?:[?#]|$)|^data:image\/svg/i.test(img.currentSrc || img.src) && w && h) {
    const k = SIDE / Math.max(w, h);
    (w = Math.round(w * k)), (h = Math.round(h * k));
  }
  return drawn(img, w, h);
}

// SVG markup drawn as an image, which runs no script and loads nothing, about SIDE pixels along its longer side.
async function svg(markup: string): Promise<PixelData> {
  if (typeof DOMParser === "undefined" || typeof Image === "undefined")
    fail("fromImage() draws SVG on a page, so not in Node or a worker: pass a PNG of it instead (sharp makes one), or draw it on a page");
  let text = markup.trim();
  // Markup copied out of an HTML page often leaves out its namespaces, which an image needs.
  if (!/<svg[^>]*\sxmlns\s*=/i.test(text)) text = text.replace(/<svg(?=[\s>])/i, `<svg xmlns="${SVG_NS}"`);
  if (/\sxlink:/.test(text) && !/xmlns:xlink\s*=/.test(text)) text = text.replace(/<svg(?=[\s>])/i, `<svg xmlns:xlink="http://www.w3.org/1999/xlink"`);
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (doc.getElementsByTagName("parsererror").length || root.localName !== "svg" || root.namespaceURI !== SVG_NS) fail("fromImage() could not read that svg");
  let vb = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(root.getAttribute("width") ?? ""), h = parseFloat(root.getAttribute("height") ?? "");
    if (!(w > 0 && h > 0)) fail("that svg has no size: give it a viewBox");
    vb = [0, 0, w, h];
    root.setAttribute("viewBox", vb.join(" "));
  }
  const k = SIDE / Math.max(vb[2], vb[3]);
  const W = Math.max(1, Math.round(vb[2] * k)), H = Math.max(1, Math.round(vb[3] * k));
  root.setAttribute("width", String(W));
  root.setAttribute("height", String(H));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("ascii.rest: fromImage() could not draw that svg"));
      img.src = url;
    });
    return drawn(img, W, H);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Draws an image onto a canvas of its own size, or down to LARGEST along its longer side, and reads its pixels back.
function drawn(src: CanvasImageSource, w: number, h: number): PixelData {
  if (!(w > 0 && h > 0)) fail("fromImage() was given an image with no pixels: wait for it to load, or check it has a size");
  const k = Math.min(1, LARGEST / Math.max(w, h));
  const W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
  const canvas =
    typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(W, H)
      : typeof document !== "undefined"
        ? Object.assign(document.createElement("canvas"), { width: W, height: H })
        : fail("fromImage() needs a canvas, an OffscreenCanvas or a page's, to read an image's pixels");
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) fail("fromImage() could not get a 2d canvas to read the image's pixels");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, W, H);
  try {
    return { data: ctx.getImageData(0, 0, W, H).data, width: W, height: H };
  } catch {
    fail("fromImage() could not read that image's pixels: it comes from another site that doesn't allow it (CORS). Serve it from your own, or pass a Blob");
  }
}

// --- without a browser ----------------------------------------------------------------

// Node's file system, reached through process rather than an import, so a bundle for the browser never sees it; null
// on a page or wherever there is none.
const files = () =>
  typeof document === "undefined" && typeof process !== "undefined" && typeof process.getBuiltinModule === "function" ? (process.getBuiltinModule("node:fs/promises") ?? null) : null;

// A file read from disk, by its path (from the working directory) or a file: URL.
async function file(path: string | URL): Promise<Blob> {
  const fs = files();
  if (!fs) fail(`fromImage() could not read ${String(path)}: there is no file system here`);
  let bytes: Uint8Array;
  try {
    bytes = await fs.readFile(path);
  } catch (e) {
    fail(`fromImage() could not read ${String(path)}: ${(e as { code?: string }).code === "ENOENT" ? "there is no such file" : String((e as Error).message)}`);
  }
  // Its name, so an .svg is known for one.
  return new File([bytes as Uint8Array<ArrayBuffer>], String(path).split(/[\\/]/).pop() ?? "");
}

// The eight bytes every PNG file starts with.
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
// Adam7's seven passes over an interlaced PNG: the first column and row of each, and its step across and down.
const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
// Channels a pixel for each PNG colour type: grey, -, RGB, palette, grey and alpha, -, RGBA.
const CHANNELS = [1, 0, 3, 1, 2, 0, 4];

/**
 * A PNG file's bytes as pixels, in Node or anywhere: what fromImage() reads a PNG with where there is no browser to
 * decode it, for a script that wants drawing() rather than a piece. Every kind of PNG: grey, colour or a palette, with
 * or without alpha (tRNS included), 1 to 16 bits a channel, interlaced or not. 16 bits are cut to 8; a colour profile
 * or gamma, if it has one, is not applied, as a browser would. Rejects, saying why, for bytes that aren't a PNG it can
 * read.
 *
 *   const { data, width, height } = await readPng(readFileSync("logo.png"));
 *   const { art } = drawing(data, width, height, { width: 40 });
 */
export async function readPng(bytes: Uint8Array | ArrayBuffer): Promise<PixelData> {
  if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
  if (!(bytes instanceof Uint8Array)) fail("readPng() takes a PNG file's bytes, as a Uint8Array (a Buffer is one) or an ArrayBuffer");
  const bad = (why: string): never => fail(`could not read that PNG: ${why}`);
  if (bytes.length < 8 || PNG.some((v, i) => bytes[i] !== v)) bad("it is not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0, depth = 0, type = -1, interlace = 0;
  let plte: Uint8Array | null = null, trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  // Chunks: a length, a four-letter kind, the body and a checksum, which isn't checked: inflating finds damage.
  for (let p = 8; p + 8 <= bytes.length; ) {
    const length = view.getUint32(p);
    const kind = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    const body = bytes.subarray(p + 8, p + 8 + length);
    if (body.length < length) bad("it is cut short");
    if (kind === "IHDR" && length >= 13) (width = view.getUint32(p + 8)), (height = view.getUint32(p + 12)), (depth = body[8]), (type = body[9]), (interlace = body[12]);
    else if (kind === "PLTE") plte = body;
    else if (kind === "tRNS") trns = body;
    else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
    p += 12 + length;
  }
  const channels = CHANNELS[type] ?? 0;
  if (!width || !height) bad("it has no size");
  if (!channels || !(type === 0 ? [1, 2, 4, 8, 16] : type === 3 ? [1, 2, 4, 8] : [8, 16]).includes(depth)) bad(`colour type ${type} at ${depth} bits is not a kind of PNG`);
  if (interlace > 1) bad(`interlace method ${interlace} is not a PNG one`);
  if (type === 3 && !plte) bad("it has a palette's indices but no palette");
  if (!idat.length) bad("it has no image data");
  if (width * height > 1 << 28) bad(`at ${width} by ${height} pixels it is too large to read here`);

  const all = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  idat.reduce((at, c) => (all.set(c, at), at + c.length), 0);
  // The bytes the rows take, each with its filter byte, so data that inflates to far more is never read whole.
  let need = 0;
  for (const [x0, y0, dx, dy] of interlace ? ADAM7 : [[0, 0, 1, 1]]) {
    const w = Math.ceil((width - x0) / dx), h = Math.ceil((height - y0) / dy);
    if (w > 0 && h > 0) need += h * (1 + Math.ceil((w * channels * depth) / 8));
  }
  const raw = await inflate(all, need);

  // A sample as stored (1 to 16 bits) and as 8 bits.
  const sample = (line: Uint8Array, k: number) =>
    depth === 16 ? (line[2 * k] << 8) | line[2 * k + 1] : depth === 8 ? line[k] : (line[(k * depth) >> 3] >> (8 - depth - ((k * depth) & 7))) & ((1 << depth) - 1);
  const max = (1 << depth) - 1;
  const eight = (v: number) => (depth === 16 ? v >> 8 : depth === 8 ? v : (v * 255) / max);
  // The one grey or colour tRNS makes clear, as stored, for grey and RGB.
  const key = trns && (type === 0 || type === 2) ? Array.from({ length: channels }, (_, i) => ((trns![2 * i] << 8) | trns![2 * i + 1]) & max) : null;

  const out = new Uint8ClampedArray(width * height * 4);
  const bits = channels * depth;
  const back = Math.max(1, bits >> 3); // bytes back to the same channel of the pixel before, which the filters use
  let at = 0;
  for (const [x0, y0, dx, dy] of interlace ? ADAM7 : [[0, 0, 1, 1]]) {
    const w = Math.ceil((width - x0) / dx), h = Math.ceil((height - y0) / dy);
    if (w <= 0 || h <= 0) continue;
    const stride = Math.ceil((w * bits) / 8);
    let above = new Uint8Array(stride), line = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      if (at + 1 + stride > raw.length) bad("its image data is cut short");
      // Each row starts with its filter: each byte was stored less the one to its left, above, their mean, or the nearest of the three.
      const filter = raw[at++];
      if (filter > 4) bad(`a row has filter ${filter}, which PNG has none of`);
      for (let i = 0; i < stride; i++) {
        const a = i >= back ? line[i - back] : 0, b = above[i], c = i >= back ? above[i - back] : 0;
        let v = raw[at + i];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += (a + b) >> 1;
        else if (filter === 4) {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        line[i] = v;
      }
      at += stride;
      for (let x = 0; x < w; x++) {
        const o = ((y0 + y * dy) * width + x0 + x * dx) * 4, k = x * channels;
        if (type === 3) {
          const i = sample(line, x);
          (out[o] = plte![3 * i] ?? 0), (out[o + 1] = plte![3 * i + 1] ?? 0), (out[o + 2] = plte![3 * i + 2] ?? 0), (out[o + 3] = trns?.[i] ?? 255);
        } else if (type === 0 || type === 4) {
          const g = sample(line, k);
          out[o] = out[o + 1] = out[o + 2] = eight(g);
          out[o + 3] = type === 4 ? eight(sample(line, k + 1)) : key && g === key[0] ? 0 : 255;
        } else {
          const r = sample(line, k), g = sample(line, k + 1), b = sample(line, k + 2);
          (out[o] = eight(r)), (out[o + 1] = eight(g)), (out[o + 2] = eight(b));
          out[o + 3] = type === 6 ? eight(sample(line, k + 3)) : key && r === key[0] && g === key[1] && b === key[2] ? 0 : 255;
        }
      }
      [above, line] = [line, above];
    }
  }
  return { data: out, width, height };
}

// zlib's inflate, with the DecompressionStream that Node and browsers both have. Read to its end, so its checksum is
// checked, unless it runs well past the `need` bytes the rows take: then the rest, however much, is never read.
async function inflate(data: Uint8Array, need: number): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") fail("reading a PNG needs DecompressionStream, which this runtime lacks: decode it yourself and pass its pixels to fromPixels()");
  const parts: Uint8Array[] = [];
  let got = 0;
  try {
    const reader = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      if (got > need + 65536) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } catch {
    return fail("could not read that PNG: its image data is damaged");
  }
  const out = new Uint8Array(got);
  parts.reduce((at, p) => (out.set(p, at), at + p.length), 0);
  return out;
}
