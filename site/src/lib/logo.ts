/*
 * The drawing behind /make/, in the browser: the method the library's logos,
 * companies and distros were drawn by, ported from their generators, which ran
 * on sharp, to a canvas.
 *
 * The SVG is drawn about 2400 pixels across and trimmed to its ink, then drawn
 * again into a grid of cells CW by CH pixels, filling it inside a margin of two
 * columns and one row. Each cell's ink is measured in GX by GY blocks; a blank
 * cell stays blank, a solid one is 8, and any other takes the character whose
 * shape (lib/glyphs.ts) best matches the logo's edge through it. The logo's
 * opaque pixels are sorted into up to 8 colours, and each cell takes the one
 * most of its ink is. Where white is one of several colours, the one-ink
 * drawing leaves it out, as the generators' `knock` did, so white letters or
 * gaps in a coloured shape still show there.
 *
 * The SVG is only ever drawn as an image, which runs no script and loads
 * nothing, and nothing leaves the page.
 *
 * Any other image the browser can read, PNG, JPG, WebP, GIF (its first frame),
 * AVIF or BMP, is drawn the same way. One with no transparency usually sits on
 * a plain ground: where most of its border is one colour, that colour is taken
 * out from the edges inwards, so the logo stands alone and the same colour
 * inside it, white letters on a shape say, stays.
 */

export const GX = 2, GY = 4; // blocks a cell is measured in
export const CW = 24, CH = 48; // pixels a cell, when sampling
export const FILL = "8";
// No backtick, so the art can sit in a String.raw template in the piece's source.
export const EDGE = ".,:'\"^-_~=/\\|()dbqpPYoO08";
/** The contract's limit for a piece that is not a scene. */
export const LIMIT = { cols: 80, rows: 32 };
const MARGIN = { x: 2, y: 1 };
const SIDE = 2400; // pixels across the first drawing, the longer way
const SVG_NS = "http://www.w3.org/2000/svg";

/** A candidate character and its ink in each block of its cell. */
export type Glyph = { ch: string; v: number[] };
export type RGB = [number, number, number];

/** The image drawn large, and the box its ink fills. */
export interface Source {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The ground taken out of an image with no transparency, as #rrggbb; none for an SVG or an image with its own. */
  ground?: string;
  /** An image with no transparency and no plain ground, a photo say, which reads best in the shade style. */
  photo?: boolean;
}

/**
 * How the cells are chosen. logo: the character whose shape best matches the edge through the cell, as the library's
 * logos are drawn. shade: a character as dense as the image is bright there, from RAMP, for a photo or any image with
 * no plain ground.
 */
export type Style = "logo" | "shade";
/** Light to dense, for the shade style. Turned round in one ink on a light page, where dense reads as dark. */
export const RAMP = ".:-=+*#%@";

export interface Drawing {
  style: Style;
  cols: number;
  rows: number;
  /** The logo's colours, as drawn. */
  colors: RGB[];
  /** The characters, row by row. */
  art: string[];
  /** Each cell's colour, an index into `colors` as a base-36 digit, or a space where the art is blank. */
  ink: string[];
  /** The characters in one ink, row by row. */
  mono: string[];
  /** Whether the one-ink drawing leaves the logo's white out. */
  knocked: boolean;
}

/** Draws the SVG about 2400 pixels across and finds its ink. Throws, with a message for the page, when it can't. */
export async function render(markup: string): Promise<Source> {
  let text = markup.trim();
  if (!/<svg[\s>]/i.test(text)) throw new Error("that is not an svg");
  // Markup copied out of an HTML page often leaves out its namespaces, which an image needs.
  if (!/<svg[^>]*\sxmlns\s*=/i.test(text)) text = text.replace(/<svg(?=[\s>])/i, `<svg xmlns="${SVG_NS}"`);
  if (/\sxlink:/.test(text) && !/xmlns:xlink\s*=/.test(text)) text = text.replace(/<svg(?=[\s>])/i, `<svg xmlns:xlink="http://www.w3.org/1999/xlink"`);
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (doc.getElementsByTagName("parsererror").length || svg.localName !== "svg" || svg.namespaceURI !== SVG_NS) throw new Error("that svg could not be read");

  let vb = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(svg.getAttribute("width") ?? ""), h = parseFloat(svg.getAttribute("height") ?? "");
    if (!(w > 0 && h > 0)) throw new Error("that svg has no size: give it a viewBox");
    vb = [0, 0, w, h];
    svg.setAttribute("viewBox", vb.join(" "));
  }
  const k = SIDE / Math.max(vb[2], vb[3]);
  const W = Math.max(1, Math.round(vb[2] * k)), H = Math.max(1, Math.round(vb[3] * k));
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("that svg could not be drawn"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, W, H);
    const box = trim(ctx.getImageData(0, 0, W, H).data, W, H);
    if (!box) throw new Error("that svg draws nothing");
    return { canvas, ...box };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The box of a drawing's ink, as sharp's trim with a threshold of 1 finds it; null when it has none.
function trim(data: Uint8ClampedArray, W: number, H: number) {
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

/** Whether a file is an SVG, by its type or its name. */
export const isSvg = (file: { type: string; name: string }) => file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

/**
 * Draws any image the browser can read about 2400 pixels across and finds its ink. With no transparency of its own,
 * a plain ground is taken out first, unless `keepGround`. Throws, with a message for the page, when it can't.
 */
export async function raster(image: Blob, { keepGround = false } = {}): Promise<Source> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(image);
  } catch {
    throw new Error("that image could not be read: try an svg, png, jpg, webp or gif");
  }
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("that image is empty");
    const k = SIDE / Math.max(bitmap.width, bitmap.height);
    const W = Math.max(1, Math.round(bitmap.width * k)), H = Math.max(1, Math.round(bitmap.height * k));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, W, H);
    const pixels = ctx.getImageData(0, 0, W, H);
    const found = clearGround(pixels.data, W, H, !keepGround);
    if (found.ground) ctx.putImageData(pixels, 0, 0);
    const box = trim(pixels.data, W, H);
    if (!box) throw new Error("that image is all background");
    return { canvas, ...box, ground: found.ground, photo: found.opaque && !found.ground && !keepGround };
  } finally {
    bitmap.close();
  }
}

const NEAR = 42; // how far from the ground's colour, in RGB, a pixel may be and still count as ground
const SHARE = 0.6; // how much of the border must be that one colour for it to count as a plain ground

/**
 * Takes a plain ground out of an image that has no transparency of its own, when `take`: the colour most of its border
 * is, from the edges inwards, and softly at the edge of what is left, where the logo's own edge was blended into it.
 * Says whether the image is opaque, and the ground it took as #rrggbb, if any: none when the image has a
 * transparency of its own or its border isn't mostly one colour.
 */
function clearGround(data: Uint8ClampedArray, W: number, H: number, take: boolean): { opaque: boolean; ground?: string } {
  const border: number[] = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 1; y < H - 1; y++) border.push(y * W, y * W + W - 1);
  // An image whose border is already mostly clear has a transparency of its own.
  if (border.filter((p) => data[p * 4 + 3] < 128).length > border.length / 2) return { opaque: false };
  if (!take) return { opaque: true };
  // The border's commonest colour, in buckets of 16 a channel, and the mean of the pixels in it.
  const buckets = new Map<number, number[]>();
  for (const p of border) {
    const i = p * 4;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(p);
  }
  const top = [...buckets.values()].sort((a, b) => b.length - a.length)[0];
  if (top.length < border.length * SHARE) return { opaque: true };
  const g = [0, 1, 2].map((c) => Math.round(top.reduce((s, p) => s + data[p * 4 + c], 0) / top.length));
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
  // Taken out; and beside it, a pixel still close to the ground's colour is the logo's edge blended into the ground,
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
  return { opaque: true, ground: `#${g.map((v) => v.toString(16).padStart(2, "0")).join("")}` };
}

/** The piece's size for a logo of this aspect, about `width` columns across, or fewer where the rows run out. */
export function size(aspect: number, width: number) {
  const maxC = Math.max(1, width - 2 * MARGIN.x), maxR = LIMIT.rows - 2 * MARGIN.y;
  let rIn = Math.max(1, Math.min(maxR, Math.round(maxC / (2 * aspect))));
  let cIn = Math.max(1, Math.round(2 * aspect * rIn));
  while (cIn + 2 * MARGIN.x > LIMIT.cols && rIn > 1) cIn = Math.max(1, Math.round(2 * aspect * --rIn));
  cIn = Math.min(cIn, LIMIT.cols - 2 * MARGIN.x);
  return { cols: cIn + 2 * MARGIN.x, rows: rIn + 2 * MARGIN.y };
}

/** Draws the logo into a grid about `width` columns across, in the style asked for. */
export function draw(src: Source, width: number, glyphs: Glyph[], style: Style = "logo"): Drawing {
  const { cols, rows } = size(src.w / src.h, width);
  const W = cols * CW, H = rows * CH;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  // As large as fits inside the margin and centred in it, as sharp's resize with fit "contain" does.
  const iw = (cols - 2 * MARGIN.x) * CW, ih = (rows - 2 * MARGIN.y) * CH;
  const k = Math.min(iw / src.w, ih / src.h);
  const dw = Math.max(1, Math.round(src.w * k)), dh = Math.max(1, Math.round(src.h * k));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.canvas, src.x, src.y, src.w, src.h, MARGIN.x * CW + Math.floor((iw - dw) / 2), MARGIN.y * CH + Math.floor((ih - dh) / 2), dw, dh);
  const data = ctx.getImageData(0, 0, W, H).data;

  const colors = quantize(data);
  const near = new Map<number, number>();
  const nearest = (i: number) => {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let q = near.get(key);
    if (q === undefined) {
      q = 0;
      let bd = Infinity;
      colors.forEach((c, j) => {
        const d = 0.3 * (c[0] - data[i]) ** 2 + 0.59 * (c[1] - data[i + 1]) ** 2 + 0.11 * (c[2] - data[i + 2]) ** 2;
        if (d < bd) (bd = d), (q = j);
      });
      near.set(key, q);
    }
    return q;
  };

  // In one ink, white among other colours is left out: drawn solid, it would fill the letters and gaps it makes. Shaded,
  // white is the brightest shade, and stays.
  const knocked = style === "logo" && colors.some((c) => white(...c)) && !colors.every((c) => white(...c));
  const alpha = (i: number) => data[i + 3] / 255;
  const inkAlpha = (i: number) => (knocked && white(data[i], data[i + 1], data[i + 2]) ? 0 : data[i + 3] / 255);

  // Each cell's colour, the one most of its ink is, and for the shade style how much ink it has and how bright it is.
  const best = new Uint8Array(cols * rows), cover = new Float32Array(cols * rows), light = new Float32Array(cols * rows);
  const votes = new Uint32Array(colors.length);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      votes.fill(0);
      let sa = 0, sl = 0;
      for (let py = y * CH; py < (y + 1) * CH; py++)
        for (let px = x * CW; px < (x + 1) * CW; px++) {
          const i = (py * W + px) * 4;
          if (data[i + 3] >= 128) votes[nearest(i)]++;
          const a = data[i + 3] / 255;
          sa += a;
          sl += (a * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])) / 255;
        }
      let b = 0;
      for (let q = 1; q < votes.length; q++) if (votes[q] > votes[b]) b = q;
      const k = y * cols + x;
      best[k] = b;
      cover[k] = sa / (CW * CH);
      light[k] = sa ? sl / sa : 0;
    }
  // Shaded, the image's own range of brightness, its darkest and brightest cells but the odd few, spans the ramp.
  const inked = [...light].filter((_, k) => cover[k] >= 0.1).sort((a, b) => a - b);
  const lo = inked[Math.floor(inked.length * 0.02)] ?? 0, hi = inked[Math.floor(inked.length * 0.98)] ?? 1;
  const shade = (k: number) => RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(((light[k] - lo) / Math.max(1e-6, hi - lo)) * RAMP.length)))];

  const art: string[] = [], ink: string[] = [], mono: string[] = [];
  for (let y = 0; y < rows; y++) {
    let a = "", c = "", m = "";
    for (let x = 0; x < cols; x++) {
      const k = y * cols + x;
      let ch: string;
      if (style === "shade") {
        ch = cover[k] < 0.1 ? " " : shade(k);
        m += ch;
      } else {
        ch = pick(coverage(data, cols, x, y, alpha), glyphs);
        m += knocked ? pick(coverage(data, cols, x, y, inkAlpha), glyphs) : ch;
      }
      a += ch;
      c += ch === " " ? " " : best[k].toString(36);
    }
    art.push(a);
    ink.push(c);
    mono.push(m);
  }
  return { style, cols, rows, colors, art, ink, mono, knocked };
}

/** White, as the generators' knock took it. */
function white(r: number, g: number, b: number) {
  return r > 215 && g > 215 && b > 215;
}

/** A cell's ink in each of its blocks, 0 to 1. */
function coverage(data: Uint8ClampedArray, cols: number, cx: number, cy: number, alpha: (i: number) => number) {
  const v = new Float32Array(GX * GY);
  for (let by = 0; by < GY; by++)
    for (let bx = 0; bx < GX; bx++) {
      let sum = 0, n = 0;
      for (let y = cy * CH + (by * CH) / GY; y < cy * CH + ((by + 1) * CH) / GY; y++)
        for (let x = cx * CW + (bx * CW) / GX; x < cx * CW + ((bx + 1) * CW) / GX; x++) {
          sum += alpha((y * cols * CW + x) * 4);
          n++;
        }
      v[by * GX + bx] = sum / n;
    }
  return v;
}

function pick(c: Float32Array, glyphs: Glyph[]) {
  let min = 1, max = 0;
  for (const x of c) (min = Math.min(min, x)), (max = Math.max(max, x));
  if (max < 0.1) return " ";
  if (min > 0.8) return FILL;
  let best = " ", bd = Infinity;
  for (const g of glyphs) {
    let d = 0;
    for (let i = 0; i < c.length; i++) d += (c[i] - g.v[i]) ** 2;
    if (d < bd) (bd = d), (best = g.ch);
  }
  // an empty cell beats a glyph that is mostly in the wrong place
  let e = 0;
  for (const x of c) e += x * x;
  return e < bd ? " " : best;
}

const d2 = (a: ArrayLike<number>, b: ArrayLike<number>) => 0.3 * (a[0] - b[0]) ** 2 + 0.59 * (a[1] - b[1]) ** 2 + 0.11 * (a[2] - b[2]) ** 2;

/**
 * k-means over the opaque pixels, merged until every colour is distinct and used. The pixels are counted by colour
 * first, which gives the same means as going through them one by one, in a fraction of the time.
 */
function quantize(data: Uint8ClampedArray, k = 8): RGB[] {
  const px: RGB[] = [];
  const counts = new Map<number, number>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] > 200) {
      // every 7th, which the first guesses are chosen from
      if (total++ % 7 === 0) px.push([data[i], data[i + 1], data[i + 2]]);
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  if (!total) return [[0, 0, 0]];
  const keys = [...counts.keys()];
  const colors = keys.map((key): RGB => [key >> 16, (key >> 8) & 255, key & 255]);
  const weights = keys.map((key) => counts.get(key)!);

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
    const sum = C.map(() => [0, 0, 0, 0]);
    colors.forEach((p, j) => {
      let bi = 0, bd = Infinity;
      C.forEach((c, i) => {
        const d = d2(c, p);
        if (d < bd) (bd = d), (bi = i);
      });
      const w = weights[j];
      sum[bi][0] += p[0] * w;
      sum[bi][1] += p[1] * w;
      sum[bi][2] += p[2] * w;
      sum[bi][3] += w;
    });
    C = sum.filter((s) => s[3] > total * 0.004).map((s) => [s[0] / s[3], s[1] / s[3], s[2] / s[3]]);
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

// --- colours on a dark page ----------------------------------------------------

const PAGE: RGB = [19, 21, 24]; // the site's dark page
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
function rgb([h, s, l]: RGB): RGB {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => ((t = (t + 1) % 1) < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p);
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)) as RGB;
}
const grey = (c: RGB) => Math.max(...c) - Math.min(...c) < 24 || (Math.max(...c) - Math.min(...c)) / Math.max(...c) < 0.3;
/** A black or near it, which the page's ink stands in for on a dark page. */
export const black = (c: RGB) => Math.max(...c) < 64 && Math.max(...c) - Math.min(...c) < 24;

/** On a dark page a dark colour is lifted until it reads: a brand colour to 2.8 against the page, a grey to 2.4, and a black is the page's ink. */
function lift(c: RGB): RGB {
  if (black(c)) return LIGHT;
  const [h, s, l] = hsl(c);
  const g = grey(c);
  const want = g ? 2.4 : 2.8;
  let k = l, out = c;
  while (contrast(out, PAGE) < want && k < 0.8) out = rgb([h, g ? 0 : s, (k += 0.01)]);
  return out;
}

const tint = (c: RGB, k: number) => c.map((v) => Math.round(v + (255 - v) * k)) as RGB;
const hex = (c: RGB) => "#" + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");

/**
 * The piece's palette, 6 runs of the logo's n colours: for a light page as drawn, then twice lighter for the glint or
 * scan, then the same for a dark page.
 */
export function palette(colors: RGB[]): string[] {
  const dark = colors.map(lift);
  return [...colors, ...colors.map((c) => tint(c, 0.35)), ...colors.map((c) => tint(c, 0.7)), ...dark, ...dark.map((c) => tint(c, 0.35)), ...dark.map((c) => tint(c, 0.7))].map(hex);
}
