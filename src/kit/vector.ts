/*
 * vector: any SVG as a piece. Draw it in Figma, Illustrator, Inkscape or by
 * hand, export the SVG, and fromSvg() reads it with no DOM, in Node or a
 * browser: paths with every command (M L H V C S Q T A Z, relative and
 * absolute), rects with rounded corners, circles, ellipses, lines, polylines
 * and polygons, groups and <use> with their transforms, the viewBox, fills,
 * strokes, opacity, fill rules, gradients (as their mean colour) and the
 * classes of a <style>. Text, images, clip paths, masks and filters are left
 * out: turn text to outlines in your editor before you export. Each cell takes
 * the character whose shape best matches the drawing's edge through it, and 8
 * where it is solid, as the library's logos are drawn, in the drawing's own
 * colours, lifted on a dark page where they would sink into it; where two
 * colours meet, the edge between them is drawn too, so it reads in one ink.
 *
 * Every element is a part you can name by its id, its class or its colour, to
 * set it moving with a word (spin, flip, bob, pulse, sway, blink, glint,
 * ripple, rise) or a function of time of your own, about its centre or any
 * origin, or fill it with a material such as water() or glass(), or with any
 * piece, so a still drawing comes alive with no code beyond a map.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { fromSvg } from "ascii.rest/kit";
 *
 *   export default fromSvg(`<svg viewBox="0 0 24 24"><circle id="sun" cx="12" cy="12" r="9" fill="#f59e0b"/></svg>`,
 *     { "#sun": "pulse" });
 */
import type { Category } from "../types.ts";
import {
  EMPTY,
  INK,
  MAX,
  NONE,
  Surface,
  TAU,
  and,
  asPiece,
  clamp,
  code,
  fail,
  hex,
  isHex,
  mergePalettes,
  piece,
  rgb,
  sample,
  type KitPiece,
  type Region,
  type Sampler,
  type Source,
} from "./core.ts";

// --- what fromSvg reads --------------------------------------------------------------

/** One element on the way down to a shape: the svg, its groups and the shape itself, for naming parts. */
export interface SvgNode {
  /** The element's name: "g", "path", "use" and so on. */
  readonly tag: string;
  readonly id: string | null;
  readonly classes: readonly string[];
  /** A number of its own, so two <use> of one element are two parts. */
  readonly index: number;
}

/** A shape the drawing paints: a path, rect, circle, ellipse, line, polyline or polygon, read and resolved. */
export interface SvgShape {
  /** The element: "path", "rect", "circle", "ellipse", "line", "polyline" or "polygon". */
  readonly tag: string;
  /** Its id, or null. */
  readonly id: string | null;
  /** Its classes. */
  readonly classes: readonly string[];
  /** The elements from the svg down to this one, for naming parts by a group's id or class. */
  readonly chain: readonly SvgNode[];
  /** Its fill: #rrggbb, "currentColor" for the page's own colour, or null for none. */
  readonly fill: string | null;
  /** Its stroke: #rrggbb, "currentColor", or null for none. */
  readonly stroke: string | null;
  /** Its stroke's width in the viewBox's units, its transforms applied. */
  readonly strokeWidth: number;
  /** How opaque its fill and its stroke are, 0 to 1: opacity, fill-opacity, its colour's own and its groups'. */
  readonly fillOpacity: number;
  readonly strokeOpacity: number;
  /** Which of its parts are inside: "nonzero" (the default) or "evenodd". */
  readonly fillRule: "nonzero" | "evenodd";
  /** Its stroke's ends: "butt" (the default), "round" or "square". */
  readonly cap: "butt" | "round" | "square";
  /** Its outline, every transform applied, in the viewBox's units: moves (0, x, y), lines (1, x, y), cubic curves (2, x1, y1, x2, y2, x, y) and closes (3). Arcs and quadratic curves are cubics here. */
  readonly ops: Float64Array;
  /** Its box in the viewBox's units, its stroke included: [x, y, width, height]. */
  readonly box: readonly [number, number, number, number];
}

/** An SVG read into shapes: what fromSvg() and drawSvg() draw. parseSvg() makes one, to reuse. */
export interface Svg {
  /** The drawing's own box: x, y, width and height, from its viewBox, else its width and height, else its ink. */
  readonly viewBox: readonly [number, number, number, number];
  /** Every shape it paints, the first at the back. */
  readonly shapes: readonly SvgShape[];
  /** Its <title>, if it has one. */
  readonly title: string | null;
  /** Every part it can be addressed by: "#id", ".class" and each colour it paints, as #rrggbb. */
  readonly parts: readonly string[];
  /** The elements it has that fromSvg can't draw and leaves out, such as "text" and "image": none for most drawings. */
  readonly skipped: readonly string[];
}

// --- reading the markup --------------------------------------------------------------

interface XNode {
  name: string;
  attrs: Record<string, string>;
  kids: XNode[];
  text: string;
}

const NAME = /[^\s/>]+/y;
const ATTR = /\s*([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/y;
const ENTITY = /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi;
const NAMED_ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const entities = (v: string) =>
  v.replace(ENTITY, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : NAMED_ENTITY[e.toLowerCase()],
  );
// An element's name without its namespace, lowercase: "svg:linearGradient" is "lineargradient".
const local = (name: string) => name.slice(name.indexOf(":") + 1).toLowerCase();

// A forgiving XML reader: elements, attributes, text and CDATA; comments, doctypes and processing instructions skipped.
function xml(src: string): XNode {
  const root: XNode = { name: "", attrs: {}, kids: [], text: "" };
  const stack = [root];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const top = stack[stack.length - 1];
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    if (lt > i) top.text += src.slice(i, lt);
    if (src.startsWith("<!--", lt)) {
      const e = src.indexOf("-->", lt + 4);
      i = e < 0 ? n : e + 3;
    } else if (src.startsWith("<![CDATA[", lt)) {
      const e = src.indexOf("]]>", lt + 9);
      top.text += src.slice(lt + 9, e < 0 ? n : e);
      i = e < 0 ? n : e + 3;
    } else if (src[lt + 1] === "?") {
      const e = src.indexOf("?>", lt + 2);
      i = e < 0 ? n : e + 2;
    } else if (src[lt + 1] === "!") {
      // A doctype, perhaps with entities of its own in [ ].
      let j = lt + 2;
      for (let depth = 0; j < n; j++) {
        const c = src[j];
        if (c === "[") depth++;
        else if (c === "]") depth--;
        else if (c === ">" && depth <= 0) break;
      }
      i = j + 1;
    } else if (src[lt + 1] === "/") {
      const e = src.indexOf(">", lt);
      const name = local(src.slice(lt + 2, e < 0 ? n : e).trim());
      for (let k = stack.length - 1; k > 0; k--)
        if (stack[k].name === name) {
          stack.length = k;
          break;
        }
      i = e < 0 ? n : e + 1;
    } else {
      NAME.lastIndex = lt + 1;
      const m = NAME.exec(src);
      if (!m) {
        top.text += "<";
        i = lt + 1;
        continue;
      }
      const node: XNode = { name: local(m[0]), attrs: {}, kids: [], text: "" };
      let j = NAME.lastIndex;
      for (;;) {
        ATTR.lastIndex = j;
        const a = ATTR.exec(src);
        if (!a) break;
        node.attrs[a[1]] = entities(a[2] ?? a[3] ?? a[4] ?? "");
        j = ATTR.lastIndex;
      }
      while (j < n && /\s/.test(src[j])) j++;
      const closed = src[j] === "/";
      const e = src.indexOf(">", j);
      i = e < 0 ? n : e + 1;
      top.kids.push(node);
      if (!closed) stack.push(node);
    }
  }
  return root;
}

// --- styles --------------------------------------------------------------------------------

interface Rule {
  tag: string | null;
  id: string | null;
  classes: string[];
  rank: number;
  decls: Record<string, string>;
}

// The properties fromSvg reads, as attributes, in a <style> or in style="".
const PROPS = new Set([
  "fill", "stroke", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "fill-rule", "display", "visibility",
  "color", "stroke-linecap", "stop-color", "stop-opacity",
]);

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of body.split(";")) {
    const k = d.indexOf(":");
    if (k < 0) continue;
    const prop = d.slice(0, k).trim().toLowerCase();
    if (PROPS.has(prop)) out[prop] = d.slice(k + 1).replace(/!important/i, "").trim();
  }
  return out;
}

// A <style>'s rules with simple selectors (tag, .class, #id and their mixes); others, such as `g path`, are left out.
function stylesheet(text: string, rules: Rule[]) {
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    let j = open + 1;
    for (let depth = 1; j < text.length && depth; j++) depth += text[j] === "{" ? 1 : text[j] === "}" ? -1 : 0;
    const head = text.slice(i, open).slice(text.slice(i, open).lastIndexOf(";") + 1).trim();
    const decls = declarations(text.slice(open + 1, j - 1));
    i = j;
    if (head.startsWith("@")) continue;
    for (const sel of head.split(",")) {
      const m = /^([a-z][\w-]*|\*)?((?:[.#][\w-]+)*)$/i.exec(sel.trim());
      if (!m || (!m[1] && !m[2])) continue;
      const tag = m[1] && m[1] !== "*" ? m[1].toLowerCase() : null;
      const bits = m[2].match(/[.#][\w-]+/g) ?? [];
      const ids = bits.filter((b) => b[0] === "#").map((b) => b.slice(1));
      const classes = bits.filter((b) => b[0] === ".").map((b) => b.slice(1));
      if (ids.length > 1) continue;
      rules.push({ tag, id: ids[0] ?? null, classes, rank: (ids.length ? 10000 : 0) + classes.length * 100 + (tag ? 1 : 0) + rules.length / 1e6, decls });
    }
  }
}

// --- colours -------------------------------------------------------------------------------

// The CSS colour names, as name and #rrggbb's six digits.
const NAMED = new Map(
  (
    "aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 " +
    "blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 " +
    "chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b " +
    "darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b " +
    "darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f " +
    "darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 " +
    "deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 " +
    "fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f " +
    "grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa " +
    "lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff " +
    "lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a " +
    "lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de " +
    "lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa " +
    "mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee " +
    "mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa " +
    "mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 " +
    "orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee " +
    "palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 " +
    "purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 " +
    "sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd " +
    "slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 " +
    "tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32"
  )
    .split(" ")
    .reduce<[string, string][]>((out, w, i, all) => (i % 2 ? out : [...out, [w, `#${all[i + 1]}`]]), []),
);

/** A colour read: #rrggbb, "currentColor", or null for none, and its own opacity. */
interface Read {
  c: string | null;
  a: number;
}

const unit = (v: string, max: number) => (v.trim().endsWith("%") ? (parseFloat(v) / 100) * max : parseFloat(v));

function hslToRgb(h: number, s: number, l: number): number[] {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => ((t = ((t % 1) + 1) % 1) < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p);
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => v * 255);
}

// A colour as CSS writes it: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla(), a name, currentColor or
// none. Undefined for anything else.
function color(v: string): Read | undefined {
  const s = v.trim().toLowerCase();
  if (s === "none" || s === "transparent") return { c: null, a: 0 };
  if (s === "currentcolor") return { c: "currentColor", a: 1 };
  const named = NAMED.get(s);
  if (named) return { c: named, a: 1 };
  let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (m) {
    const d = m[1].length <= 4 ? [...m[1]].map((x) => x + x).join("") : m[1];
    return { c: `#${d.slice(0, 6)}`, a: d.length === 8 ? parseInt(d.slice(6), 16) / 255 : 1 };
  }
  m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s);
  if (!m) return undefined;
  const parts = m[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return undefined;
  const a = parts[3] === undefined ? 1 : clamp(unit(parts[3], 1));
  if (m[1].startsWith("rgb")) {
    const c = parts.slice(0, 3).map((p) => unit(p, 255));
    return c.some((x) => !Number.isFinite(x)) ? undefined : { c: hex(c), a };
  }
  const h = parseFloat(parts[0]) / 360, sat = clamp(parseFloat(parts[1]) / 100), l = clamp(parseFloat(parts[2]) / 100);
  return [h, sat, l].some((x) => !Number.isFinite(x)) ? undefined : { c: hex(hslToRgb(h, sat, l)), a };
}

// --- transforms ----------------------------------------------------------------------------

/** An affine transform as SVG writes it, [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f. */
type Mat = readonly [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** m after n: the transform that applies n, then m. */
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
// a b c d about a point: moved there, transformed, moved back.
const about = (x: number, y: number, a: number, b: number, c: number, d: number): Mat => [a, b, c, d, x - a * x - c * y, y - b * x - d * y];
const invert = (m: Mat): Mat => {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12;
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
};

// A transform attribute: matrix, translate, scale, rotate, skewX and skewY, one after another.
function transform(v: string | undefined): Mat {
  let out = IDENTITY;
  if (!v) return out;
  const re = /(matrix|translate|scale|rotate|skewx|skewy)\s*\(([^)]*)\)/gi;
  for (let m = re.exec(v); m; m = re.exec(v)) {
    const a = (m[2].match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    const r = (deg: number) => (deg * Math.PI) / 180;
    let t: Mat = IDENTITY;
    switch (m[1].toLowerCase()) {
      case "matrix":
        if (a.length === 6) t = [a[0], a[1], a[2], a[3], a[4], a[5]];
        break;
      case "translate":
        t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case "scale":
        t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const c = Math.cos(r(a[0] ?? 0)), s = Math.sin(r(a[0] ?? 0));
        t = about(a[1] ?? 0, a[2] ?? 0, c, s, -s, c);
        break;
      }
      case "skewx":
        t = [1, 0, Math.tan(r(a[0] ?? 0)), 1, 0, 0];
        break;
      case "skewy":
        t = [1, Math.tan(r(a[0] ?? 0)), 0, 1, 0, 0];
        break;
    }
    out = mul(out, t);
  }
  return out;
}

// --- geometry ------------------------------------------------------------------------------

// The outline's commands, as numbers in one list.
const MOVE = 0, LINE = 1, CURVE = 2, CLOSE = 3;
// A quarter circle as a cubic: its control points this far along the tangents.
const KAPPA = 0.5522847498;

// An elliptical arc as SVG's A writes it, as cubics of a quarter turn or less (the SVG spec's appendix on arcs).
function arc(out: number[], x1: number, y1: number, rx: number, ry: number, deg: number, large: boolean, sweep: boolean, x2: number, y2: number) {
  if (x1 === x2 && y1 === y2) return;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry) {
    out.push(LINE, x2, y2);
    return;
  }
  const phi = (deg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  // Radii too small to reach are scaled up until they just do.
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let k = Math.sqrt(Math.max(0, num / (den || 1)));
  if (large === sweep) k = -k;
  const cxp = (k * rx * yp) / ry, cyp = (-k * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry;
  const start = angle(1, 0, ux, uy);
  let span = angle(ux, uy, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && span > 0) span -= TAU;
  else if (sweep && span < 0) span += TAU;
  const n = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2) - 1e-9));
  const step = span / n, h = (4 / 3) * Math.tan(step / 4);
  const at = (px: number, py: number) => [cx + rx * px * cos - ry * py * sin, cy + rx * px * sin + ry * py * cos];
  for (let i = 0, a = start; i < n; i++, a += step) {
    const c1 = Math.cos(a), s1 = Math.sin(a), c2 = Math.cos(a + step), s2 = Math.sin(a + step);
    const p = i === n - 1 ? [x2, y2] : at(c2, s2);
    out.push(CURVE, ...at(c1 - h * s1, s1 + h * c1), ...at(c2 + h * s2, s2 - h * c2), p[0], p[1]);
  }
}

const NUMBER = /[\s,]*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y;
const FLAG = /[\s,]*([01])/y;
const COMMAND = /[\s,]*([MmLlHhVvCcSsQqTtAaZz])/y;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

// A path's d, every command, as absolute moves, lines and cubics. It stops at the first thing it can't read, as a
// browser draws a path up to its first error.
function pathOps(d: string, out: number[]) {
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  // The last control point, for S and T to reflect, and the command it came from.
  let qx = 0, qy = 0, cx = 0, cy = 0, last = "";
  let closed = false;
  const read = (re: RegExp) => {
    re.lastIndex = i;
    const m = re.exec(d);
    if (!m) return NaN;
    i = re.lastIndex;
    return +m[1];
  };
  for (;;) {
    COMMAND.lastIndex = i;
    const c = COMMAND.exec(d);
    if (c) {
      cmd = c[1];
      i = COMMAND.lastIndex;
    } else if (!cmd || cmd === "Z" || cmd === "z" || i >= d.length || /^[\s,]*$/.test(d.slice(i))) break;
    const up = cmd.toUpperCase(), rel = cmd !== up;
    const a: number[] = [];
    for (let k = 0; k < ARGS[up]; k++) {
      const v = up === "A" && (k === 3 || k === 4) ? read(FLAG) : read(NUMBER);
      if (Number.isNaN(v)) return;
      a.push(v);
    }
    // A drawing command right after a close starts again from where the closed subpath began.
    if (closed && up !== "M") out.push(MOVE, sx, sy);
    closed = false;
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (up) {
      case "M":
        x = a[0] + ox;
        y = a[1] + oy;
        sx = x;
        sy = y;
        out.push(MOVE, x, y);
        // Pairs after a move are lines.
        cmd = rel ? "l" : "L";
        break;
      case "L":
        out.push(LINE, (x = a[0] + ox), (y = a[1] + oy));
        break;
      case "H":
        out.push(LINE, (x = a[0] + ox), y);
        break;
      case "V":
        out.push(LINE, x, (y = a[0] + oy));
        break;
      case "C":
        cx = a[2] + ox;
        cy = a[3] + oy;
        out.push(CURVE, a[0] + ox, a[1] + oy, cx, cy, (x = a[4] + ox), (y = a[5] + oy));
        break;
      case "S": {
        const x1 = last === "C" || last === "S" ? 2 * x - cx : x, y1 = last === "C" || last === "S" ? 2 * y - cy : y;
        cx = a[0] + ox;
        cy = a[1] + oy;
        out.push(CURVE, x1, y1, cx, cy, (x = a[2] + ox), (y = a[3] + oy));
        break;
      }
      case "Q":
      case "T": {
        let px: number, py: number, ex: number, ey: number;
        if (up === "Q") (px = a[0] + ox), (py = a[1] + oy), (ex = a[2] + ox), (ey = a[3] + oy);
        else {
          const reflect = last === "Q" || last === "T";
          (px = reflect ? 2 * x - qx : x), (py = reflect ? 2 * y - qy : y), (ex = a[0] + ox), (ey = a[1] + oy);
        }
        // A quadratic is the cubic whose controls are two thirds of the way to its one.
        out.push(CURVE, x + ((px - x) * 2) / 3, y + ((py - y) * 2) / 3, ex + ((px - ex) * 2) / 3, ey + ((py - ey) * 2) / 3, ex, ey);
        qx = px;
        qy = py;
        x = ex;
        y = ey;
        break;
      }
      case "A": {
        const ex = a[5] + ox, ey = a[6] + oy;
        arc(out, x, y, a[0], a[1], a[2], a[3] === 1, a[4] === 1, ex, ey);
        x = ex;
        y = ey;
        break;
      }
      case "Z":
        out.push(CLOSE);
        x = sx;
        y = sy;
        closed = true;
        break;
    }
    last = up;
  }
}

// A length: a number, with px, pt, mm, cm, in, em or % (of `ref`).
function len(v: string | undefined, ref = 0, fallback = 0): number {
  if (v === undefined) return fallback;
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|pt|pc|mm|cm|in|em|ex|%)?\s*$/i.exec(v);
  if (!m) return fallback;
  const k: Record<string, number> = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, em: 16, ex: 8, "%": ref / 100 };
  return +m[1] * (m[2] ? k[m[2].toLowerCase()] : 1);
}

const numbers = (v: string | undefined) => (v?.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? []).map(Number);

// An element's outline in its own units, or null for one that draws nothing.
function shapeOps(tag: string, at: Record<string, string>, vw: number, vh: number): number[] | null {
  const out: number[] = [];
  const diag = Math.sqrt((vw * vw + vh * vh) / 2);
  const ellipse = (cx: number, cy: number, rx: number, ry: number) => {
    if (!(rx > 0 && ry > 0)) return null;
    const kx = rx * KAPPA, ky = ry * KAPPA;
    out.push(MOVE, cx + rx, cy);
    out.push(CURVE, cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry);
    out.push(CURVE, cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy);
    out.push(CURVE, cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry);
    out.push(CURVE, cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy);
    out.push(CLOSE);
    return out;
  };
  switch (tag) {
    case "path":
      pathOps(at.d ?? "", out);
      return out.length ? out : null;
    case "rect": {
      const x = len(at.x, vw), y = len(at.y, vh), w = len(at.width, vw), h = len(at.height, vh);
      if (!(w > 0 && h > 0)) return null;
      let rx = at.rx === undefined || at.rx === "auto" ? NaN : len(at.rx, vw), ry = at.ry === undefined || at.ry === "auto" ? NaN : len(at.ry, vh);
      if (Number.isNaN(rx)) rx = Number.isNaN(ry) ? 0 : ry;
      if (Number.isNaN(ry)) ry = rx;
      rx = clamp(rx, 0, w / 2);
      ry = clamp(ry, 0, h / 2);
      if (!rx || !ry) out.push(MOVE, x, y, LINE, x + w, y, LINE, x + w, y + h, LINE, x, y + h, CLOSE);
      else {
        const kx = rx * (1 - KAPPA), ky = ry * (1 - KAPPA);
        out.push(MOVE, x + rx, y, LINE, x + w - rx, y, CURVE, x + w - kx, y, x + w, y + ky, x + w, y + ry);
        out.push(LINE, x + w, y + h - ry, CURVE, x + w, y + h - ky, x + w - kx, y + h, x + w - rx, y + h);
        out.push(LINE, x + rx, y + h, CURVE, x + kx, y + h, x, y + h - ky, x, y + h - ry);
        out.push(LINE, x, y + ry, CURVE, x, y + ky, x + kx, y, x + rx, y, CLOSE);
      }
      return out;
    }
    case "circle":
      return ellipse(len(at.cx, vw), len(at.cy, vh), len(at.r, diag), len(at.r, diag));
    case "ellipse": {
      const rx = at.rx === undefined || at.rx === "auto" ? len(at.ry, vh) : len(at.rx, vw), ry = at.ry === undefined || at.ry === "auto" ? rx : len(at.ry, vh);
      return ellipse(len(at.cx, vw), len(at.cy, vh), rx, ry);
    }
    case "line":
      out.push(MOVE, len(at.x1, vw), len(at.y1, vh), LINE, len(at.x2, vw), len(at.y2, vh));
      return out;
    case "polyline":
    case "polygon": {
      const p = numbers(at.points);
      if (p.length < 4) return null;
      for (let i = 0; i + 1 < p.length; i += 2) out.push(i ? LINE : MOVE, p[i], p[i + 1]);
      if (tag === "polygon") out.push(CLOSE);
      return out;
    }
  }
  return null;
}

// Every coordinate of an outline through a transform.
function moved(ops: readonly number[], m: Mat): Float64Array {
  const out = Float64Array.from(ops);
  for (let i = 0; i < out.length; ) {
    const op = out[i++];
    const pairs = op === CURVE ? 3 : op === CLOSE ? 0 : 1;
    for (let k = 0; k < pairs; k++, i += 2) {
      const x = out[i], y = out[i + 1];
      out[i] = m[0] * x + m[2] * y + m[4];
      out[i + 1] = m[1] * x + m[3] * y + m[5];
    }
  }
  return out;
}

/** A subpath, flattened to points: x, y, x, y, and whether it closes. */
interface Sub {
  pts: Float64Array;
  closed: boolean;
}

// An outline as polylines, through a transform: each cubic in as many lines as keep it within `tol` of the curve.
function flatten(ops: Float64Array, m: Mat, tol: number): Sub[] {
  const subs: Sub[] = [];
  let pts: number[] = [];
  let x = 0, y = 0;
  const flush = (closed: boolean) => {
    if (pts.length >= 2) subs.push({ pts: Float64Array.from(pts), closed });
    pts = [];
  };
  const add = (px: number, py: number) => {
    if (pts.length && Math.abs(pts[pts.length - 2] - px) < 1e-9 && Math.abs(pts[pts.length - 1] - py) < 1e-9) return;
    pts.push(px, py);
  };
  const tx = (px: number, py: number) => m[0] * px + m[2] * py + m[4], ty = (px: number, py: number) => m[1] * px + m[3] * py + m[5];
  for (let i = 0; i < ops.length; ) {
    const op = ops[i];
    if (op === MOVE) {
      flush(false);
      x = tx(ops[i + 1], ops[i + 2]);
      y = ty(ops[i + 1], ops[i + 2]);
      add(x, y);
      i += 3;
    } else if (op === LINE) {
      x = tx(ops[i + 1], ops[i + 2]);
      y = ty(ops[i + 1], ops[i + 2]);
      if (!pts.length) pts.push(x, y);
      else add(x, y);
      i += 3;
    } else if (op === CURVE) {
      const x1 = tx(ops[i + 1], ops[i + 2]), y1 = ty(ops[i + 1], ops[i + 2]);
      const x2 = tx(ops[i + 3], ops[i + 4]), y2 = ty(ops[i + 3], ops[i + 4]);
      const x3 = tx(ops[i + 5], ops[i + 6]), y3 = ty(ops[i + 5], ops[i + 6]);
      if (!pts.length) pts.push(x, y);
      const dd = Math.max(Math.hypot(x - 2 * x1 + x2, y - 2 * y1 + y2), Math.hypot(x1 - 2 * x2 + x3, y1 - 2 * y2 + y3));
      const n = Math.max(1, Math.min(256, Math.ceil(Math.sqrt((0.75 * dd) / tol))));
      for (let k = 1; k <= n; k++) {
        const u = k / n, v = 1 - u;
        const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
        add(a * x + b * x1 + c * x2 + d * x3, a * y + b * y1 + c * y2 + d * y3);
      }
      x = x3;
      y = y3;
      i += 7;
    } else {
      flush(true);
      i += 1;
    }
  }
  flush(false);
  return subs;
}

// The box of some polylines: [x0, y0, x1, y1], or null for none.
function bounds(subs: readonly Sub[], grow = 0): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { pts } of subs)
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] < x0) x0 = pts[i];
      if (pts[i] > x1) x1 = pts[i];
      if (pts[i + 1] < y0) y0 = pts[i + 1];
      if (pts[i + 1] > y1) y1 = pts[i + 1];
    }
  return x1 < x0 ? null : [x0 - grow, y0 - grow, x1 + grow, y1 + grow];
}

// --- walking the drawing ------------------------------------------------------------------

interface Inherited {
  fill: string;
  stroke: string;
  strokeWidth: string;
  fillOpacity: number;
  strokeOpacity: number;
  fillRule: "nonzero" | "evenodd";
  cap: "butt" | "round" | "square";
  visible: boolean;
  color: string;
  // Opacity is not inherited, but a group's applies to all of it.
  opacity: number;
}

// What is drawn: these shapes, and what these groups hold. Anything else (defs, symbol, clipPath, mask, gradients,
// text, image and the rest) is not drawn where it stands; what <defs> and <symbol> hold is drawn through <use>.
const SHAPES = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const GROUPS = new Set(["g", "a", "switch", "svg"]);
// What a browser would draw that fromSvg leaves out, named in Svg.skipped and in the error for a drawing of nothing else.
const LEFT_OUT = new Set(["text", "image", "foreignobject"]);
// The most elements a drawing is walked through, each <use> counting what it draws again: a guard against markup whose
// uses multiply out to millions.
const MOST = 200000;
const DEEP = 256;

/**
 * Reads SVG markup into shapes, once, with no DOM: what fromSvg() and drawSvg() take, so one drawing can make several
 * pieces. Throws, saying what to change, for markup with no <svg> element.
 */
export function parseSvg(markup: string): Svg {
  if (typeof markup !== "string") fail(`fromSvg takes SVG markup as a string, such as "<svg viewBox=\\"0 0 24 24\\">...</svg>", not ${markup === null ? "null" : typeof markup}`);
  const doc = xml(markup);
  // Elements in document order, walked with a stack of our own rather than by recursion, so markup nested however deep
  // can't overflow the call stack.
  const each = (from: XNode, visit: (n: XNode) => boolean | void) => {
    const stack = [...from.kids].reverse();
    while (stack.length) {
      const n = stack.pop()!;
      if (visit(n) === true) return;
      for (let k = n.kids.length - 1; k >= 0; k--) stack.push(n.kids[k]);
    }
  };
  let root: XNode | null = null;
  each(doc, (n) => n.name === "svg" && !!(root = n));
  if (!root) fail('fromSvg takes SVG markup, an <svg> element with shapes inside it, such as <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>');
  const svgRoot: XNode = root;

  // Everything with an id, for <use> and url(#...) to find, and every <style>'s rules.
  const ids = new Map<string, XNode>();
  const rules: Rule[] = [];
  let title: string | null = null;
  const index = (n: XNode) => {
    if (n.attrs.id !== undefined && !ids.has(n.attrs.id)) ids.set(n.attrs.id, n);
    if (n.name === "style") stylesheet(n.text, rules);
    if (n.name === "title" && title === null && n.text.trim()) title = entities(n.text.trim().replace(/\s+/g, " "));
  };
  index(svgRoot);
  each(svgRoot, index);
  rules.sort((a, b) => a.rank - b.rank);

  const vb0 = numbers(svgRoot.attrs.viewBox);
  const rw = len(svgRoot.attrs.width, 0, NaN), rh = len(svgRoot.attrs.height, 0, NaN);
  let viewBox: [number, number, number, number] | null =
    vb0.length === 4 && vb0[2] > 0 && vb0[3] > 0 ? [vb0[0], vb0[1], vb0[2], vb0[3]] : rw > 0 && rh > 0 ? [0, 0, rw, rh] : null;
  const vw = viewBox?.[2] ?? 100, vh = viewBox?.[3] ?? 100;

  const shapes: SvgShape[] = [];
  const skipped = new Set<string>();
  // The elements being walked, so a <use> of one of its own ancestors, which SVG leaves undrawn, is not followed.
  const open = new Set<XNode>();
  let count = 0;

  // An element's own properties: attributes, then the <style>'s rules by how specific they are, then style="".
  const own = (n: XNode) => {
    const p: Record<string, string> = {};
    for (const k in n.attrs) if (PROPS.has(k)) p[k] = n.attrs[k];
    const classes = (n.attrs.class ?? "").split(/\s+/).filter(Boolean);
    for (const r of rules)
      if ((!r.tag || r.tag === n.name) && (!r.id || r.id === n.attrs.id) && r.classes.every((c) => classes.includes(c))) Object.assign(p, r.decls);
    if (n.attrs.style) Object.assign(p, declarations(n.attrs.style));
    return p;
  };

  // A paint: a colour, none, currentColor, or a gradient or pattern by url(#id), taken as its stops' mean colour.
  const paint = (v: string, st: Inherited, depth = 0): Read => {
    const url = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)\s*(.*)$/i.exec(v.trim());
    if (url) {
      const target = ids.get(url[1]);
      let g = target;
      // A gradient may take its stops from another by href.
      for (let k = 0; g && !g.kids.some((s) => s.name === "stop") && k < 8; k++) g = ids.get((g.attrs.href ?? g.attrs["xlink:href"] ?? "").slice(1));
      const stops = g ? g.kids.filter((s) => s.name === "stop") : [];
      if (stops.length) {
        const rgbs: number[][] = [];
        let alpha = 0;
        for (const s of stops) {
          const sp = own(s);
          const c = color(sp["stop-color"] ?? "black") ?? { c: "#000000", a: 1 };
          const hexc = c.c === "currentColor" ? (color(st.color)?.c ?? null) : c.c;
          rgbs.push(hexc && hexc !== "currentColor" ? rgb(hexc) : [0, 0, 0]);
          alpha += c.a * clamp(parseFloat(sp["stop-opacity"] ?? "1"));
        }
        return { c: hex([0, 1, 2].map((i) => rgbs.reduce((s, c) => s + c[i], 0) / rgbs.length)), a: alpha / stops.length };
      }
      if (url[2]) return depth < 2 ? paint(url[2], st, depth + 1) : { c: null, a: 0 };
      // A pattern is drawn in the page's colour; a gradient with no stops, or a url to nothing, paints nothing, as in a
      // browser.
      return target?.name === "pattern" ? { c: "currentColor", a: 1 } : { c: null, a: 0 };
    }
    const c = color(v);
    if (!c) return { c: "#000000", a: 1 };
    if (c.c === "currentColor" && depth < 2) {
      const cc = color(st.color);
      if (cc && cc.c !== "currentColor") return { c: cc.c, a: cc.a };
    }
    return c;
  };

  // Groups deeper than DEEP are left out, which no drawing an editor exports comes near, so the walk can't overflow.
  const walk = (n: XNode, ctm: Mat, parent: Inherited, chain: SvgNode[], depth: number, vbw: number, vbh: number) => {
    if (depth > DEEP) return;
    if (count >= MOST) fail(`fromSvg can read up to ${MOST} elements, each <use> counting what it draws again, and this svg has more: simplify it, or flatten its <use> elements in your editor`);
    open.add(n);
    try {
      visit(n, ctm, parent, chain, depth, vbw, vbh);
    } finally {
      open.delete(n);
    }
  };

  const visit = (n: XNode, ctm: Mat, parent: Inherited, chain: SvgNode[], depth: number, vbw: number, vbh: number) => {
    const p = own(n);
    if (p.display?.trim() === "none") return;
    const pick = (v: string | undefined, inherited: string) => (v === undefined || v === "inherit" ? inherited : v);
    const op = (v: string | undefined) => (v === undefined || v === "inherit" ? 1 : clamp(unit(v, 1)));
    const st: Inherited = {
      fill: pick(p.fill, parent.fill),
      stroke: pick(p.stroke, parent.stroke),
      strokeWidth: pick(p["stroke-width"], parent.strokeWidth),
      fillOpacity: p["fill-opacity"] === undefined || p["fill-opacity"] === "inherit" ? parent.fillOpacity : op(p["fill-opacity"]),
      strokeOpacity: p["stroke-opacity"] === undefined || p["stroke-opacity"] === "inherit" ? parent.strokeOpacity : op(p["stroke-opacity"]),
      fillRule: p["fill-rule"] === "evenodd" ? "evenodd" : p["fill-rule"] === "nonzero" ? "nonzero" : parent.fillRule,
      cap: p["stroke-linecap"] === "round" || p["stroke-linecap"] === "square" || p["stroke-linecap"] === "butt" ? p["stroke-linecap"] : parent.cap,
      visible: p.visibility === undefined || p.visibility === "inherit" ? parent.visible : p.visibility === "visible",
      color: pick(p.color, parent.color),
      opacity: parent.opacity * op(p.opacity),
    };
    const node: SvgNode = { tag: n.name, id: n.attrs.id ?? null, classes: (n.attrs.class ?? "").split(/\s+/).filter(Boolean), index: count++ };
    const path = [...chain, node];
    let m = mul(ctm, transform(n.attrs.transform));

    if (n.name === "use") {
      const ref = ids.get((n.attrs.href ?? n.attrs["xlink:href"] ?? "").replace(/^#/, ""));
      if (!ref || open.has(ref)) return;
      m = mul(m, [1, 0, 0, 1, len(n.attrs.x, vbw), len(n.attrs.y, vbh)]);
      open.add(ref);
      try {
        if (ref.name === "symbol" || ref.name === "svg") nested(ref, m, st, path, depth, n.attrs.width, n.attrs.height, vbw, vbh);
        else walk(ref, m, st, path, depth + 1, vbw, vbh);
      } finally {
        open.delete(ref);
      }
      return;
    }
    if (n.name === "svg" && depth > 0) {
      nested(n, mul(m, [1, 0, 0, 1, len(n.attrs.x, vbw), len(n.attrs.y, vbh)]), st, chain, depth, n.attrs.width, n.attrs.height, vbw, vbh, node);
      return;
    }
    if (GROUPS.has(n.name)) {
      for (const k of n.kids) walk(k, m, st, path, depth + 1, vbw, vbh);
      return;
    }
    if (LEFT_OUT.has(n.name) && st.visible) skipped.add(n.name === "foreignobject" ? "foreignObject" : n.name);
    if (!SHAPES.has(n.name) || !st.visible) return;
    const ops = shapeOps(n.name, n.attrs, vbw, vbh);
    if (!ops) return;
    const f = n.name === "line" ? { c: null, a: 0 } : paint(st.fill, st);
    const s = paint(st.stroke, st);
    const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    const sw = Math.max(0, len(st.strokeWidth, Math.sqrt((vbw * vbw + vbh * vbh) / 2), 1)) * scale;
    const fill = f.c && f.a * st.fillOpacity * st.opacity > 0 ? f.c : null;
    const stroke = s.c && sw > 0 && s.a * st.strokeOpacity * st.opacity > 0 ? s.c : null;
    if (!fill && !stroke) return;
    const all = moved(ops, m);
    // A coordinate too large for a number (1e400) leaves the shape out, as a browser does.
    if (!all.every(Number.isFinite)) return;
    const subs = flatten(all, IDENTITY, Math.max(vw, vh) / 4000);
    const b = bounds(subs, stroke ? sw / 2 : 0);
    if (!b || !Number.isFinite(b[2] - b[0]) || !Number.isFinite(b[3] - b[1])) return;
    shapes.push({
      tag: n.name,
      id: node.id,
      classes: node.classes,
      chain: path,
      fill,
      stroke,
      strokeWidth: stroke ? sw : 0,
      fillOpacity: fill ? f.a * st.fillOpacity * st.opacity : 0,
      strokeOpacity: stroke ? s.a * st.strokeOpacity * st.opacity : 0,
      fillRule: st.fillRule,
      cap: st.cap,
      ops: all,
      box: [b[0], b[1], b[2] - b[0], b[3] - b[1]],
    });
  };

  // A nested <svg>, or a <symbol> by <use>: its viewBox fitted into its width and height, centred, as preserveAspectRatio's default.
  const nested = (n: XNode, m: Mat, st: Inherited, chain: SvgNode[], depth: number, w: string | undefined, h: string | undefined, pw: number, ph: number, self?: SvgNode) => {
    const vb = numbers(n.attrs.viewBox);
    const width = len(w ?? n.attrs.width, pw, pw), height = len(h ?? n.attrs.height, ph, ph);
    let inner = m;
    let iw = width, ih = height;
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
      const k = Math.min(width / vb[2], height / vb[3]);
      inner = mul(m, [k, 0, 0, k, (width - vb[2] * k) / 2 - vb[0] * k, (height - vb[3] * k) / 2 - vb[1] * k]);
      iw = vb[2];
      ih = vb[3];
    }
    const path = self ? [...chain, self] : chain;
    for (const k of n.kids) walk(k, inner, st, path, depth + 1, iw, ih);
  };

  const start: Inherited = { fill: "black", stroke: "none", strokeWidth: "1", fillOpacity: 1, strokeOpacity: 1, fillRule: "nonzero", cap: "butt", visible: true, color: "currentColor", opacity: 1 };
  walk(svgRoot, IDENTITY, start, [], 0, vw, vh);

  if (!viewBox) {
    const b = shapes.length ? shapes.reduce((a, s) => [Math.min(a[0], s.box[0]), Math.min(a[1], s.box[1]), Math.max(a[2], s.box[0] + s.box[2]), Math.max(a[3], s.box[1] + s.box[3])], [Infinity, Infinity, -Infinity, -Infinity]) : [0, 0, 1, 1];
    viewBox = [b[0], b[1], Math.max(1e-6, b[2] - b[0]), Math.max(1e-6, b[3] - b[1])];
  }
  const parts = new Set<string>();
  for (const s of shapes) {
    for (const c of s.chain) {
      if (c.id) parts.add(`#${c.id}`);
      for (const k of c.classes) parts.add(`.${k}`);
    }
    for (const c of [s.fill, s.stroke]) if (c && c !== "currentColor") parts.add(c);
  }
  return { viewBox, shapes, title, parts: [...parts], skipped: [...skipped] };
}

// --- motion ----------------------------------------------------------------------------------

/**
 * A word that sets a part moving, each on a loop. Spin, flip, pulse, sway and blink turn, grow or shut about the part's
 * origin: its centre, or for sway its bottom, unless `origin` says otherwise.
 * - spin: turns round, once a period (4 s); `amount` turns a period (1), negative the other way.
 * - flip: turns round its upright axis like a coin, once a period (4 s).
 * - bob: rises and falls `amount` rows (1), once a period (2 s).
 * - pulse: grows by `amount` (0.15) and back, once a period (1.6 s).
 * - sway: leans `amount` radians (0.15) each way, once a period (4 s): from the bottom a plant, from the top a pendulum.
 * - blink: shuts, `amount` of the way (0.9), for a fifth of a second, every `every` seconds (4).
 * - glint: a light crosses it every `every` seconds (4), as the library's logos glint.
 * - ripple: its top ripples like water's surface, `amount` rows high (0.4), a wave every period (2 s).
 * - rise: rises `amount` rows (4) over a period (4 s) and starts again, as a bubble does; several share the period out.
 */
export type Motion = "spin" | "flip" | "bob" | "pulse" | "sway" | "blink" | "glint" | "ripple" | "rise";

/**
 * Where a part turns, grows and shuts about: its centre, a side or a corner of its box, or a point [x, y] in the svg's
 * own units (a clock hand's pivot, a door's hinge).
 */
export type Origin = "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | readonly [number, number];

/**
 * A part's place at t, from where it is drawn, for a motion of your own: moved `x` columns right and `y` rows down,
 * turned `rotate` radians clockwise and grown `scale` times (or [across, down]) about its origin. Each is optional.
 */
export interface Pose {
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number | readonly [number, number];
}

/**
 * A motion of your own: the part's pose at t seconds. It should depend only on t, as every frame does. Give the part a
 * `period` if it repeats, for the piece's loop.
 *
 *   "#ball": (t) => ({ y: -4 * Math.abs(Math.sin(t * 3)) })                      // a bounce
 *   "#hand": { motion: (t) => ({ rotate: (t * Math.PI) / 30 }), origin: [12, 12], period: 60 }
 */
export type PoseFn = (t: number) => Pose;

const ORIGINS = ["center", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"];

const MOTIONS: Record<Motion, { period: number; amount: number; every?: boolean }> = {
  spin: { period: 4, amount: 1 },
  flip: { period: 4, amount: 1 },
  bob: { period: 2, amount: 1 },
  // 1.6 s: a pulse looks the same a third and two thirds of the way round, so a period that whole seconds split
  // into thirds would show only two frames to anything that looks once a second.
  pulse: { period: 1.6, amount: 0.15 },
  sway: { period: 4, amount: 0.15 },
  blink: { period: 4, amount: 0.9, every: true },
  glint: { period: 4, amount: 1, every: true },
  ripple: { period: 2, amount: 0.4 },
  rise: { period: 4, amount: 4 },
};

// --- materials ---------------------------------------------------------------------------------

/**
 * A part's cells as a material reads them, worked out the way ascii.rest/kit's materials work out an area: which cells
 * are in it, how much of each it covers, its edge and which way is in, and how deep each cell is. Arrays have one entry
 * a cell of the grid, row by row.
 */
export interface PartCells {
  /** The grid's size. */
  readonly cols: number;
  readonly rows: number;
  /** The index of every cell in the part (half or more of it covered), row by row. */
  readonly list: Int32Array;
  /** 1 for a cell in the part, 0 for one out of it. */
  readonly inside: Uint8Array;
  /** How much of each cell the part covers, 0 to 1. */
  readonly cover: Float32Array;
  /** 1 for a cell on the part's edge: in it, with a cell above, below, left or right that is not. */
  readonly border: Uint8Array;
  /** True for a cell in the part; false outside the grid, since a drawing's part stops at it. */
  has(x: number, y: number): boolean;
  /** Which way is in at the edge, on the page (a row counts 2): a unit vector, 0, 0 off the edge. */
  readonly nx: Float32Array;
  readonly ny: Float32Array;
  /** How far a cell is from the part's edge, in columns (a row counts 2): 0 on the edge. */
  readonly depth: Float32Array;
  /** The deepest a cell is. */
  readonly maxDepth: number;
  /** The box of its cells: columns x0 to x1 - 1, rows y0 to y1 - 1. Empty when x1 <= x0. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** For each column, the first and last row in the part, and for each row the first and last column: -1 for none. */
  readonly top: Int16Array;
  readonly bottom: Int16Array;
  readonly left: Int16Array;
  readonly right: Int16Array;
  /** A liquid's resting level, a vessel's room inside, an open top, a text's characters: a drawing's part has none. */
  readonly level: number | null;
  readonly room: PartCells | null;
  readonly cavity: PartCells | null;
  readonly open: boolean;
  readonly char: ((x: number, y: number) => string) | null;
  /** The part as a test of any point, x columns and y rows, and its box. */
  readonly placed: { test(x: number, y: number): boolean; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
}

/** What a material draws with each frame: the grid, the page, its colours' palette indices, and what was under it. */
export interface PartPaint {
  readonly s: Surface;
  readonly paper: boolean;
  readonly mono: boolean;
  /** The palette index of the material's colour `i`, in its own list's order, for this frame's page. */
  color(i: number): number;
  /** The grid's characters and colours before the part drew: what a see-through material shows. */
  readonly under: { readonly chars: Uint16Array; readonly colors: Uint8Array };
}

/**
 * A material as ascii.rest/kit's materials make them (water(), glass(), fire() and the rest): its colours for each
 * page, how often it repeats, and prepare(), which gets ready for a part's cells and returns its drawing of a frame.
 */
export interface PartMaterial {
  readonly colors: { readonly light: readonly string[]; readonly dark: readonly string[] };
  readonly period?: number;
  prepare(cells: PartCells): (t: number, paint: PartPaint) => void;
}

/**
 * What draws a part instead of its own characters: a material (water(), glass(), fire() from ascii.rest/kit's
 * materials, or one of your own), or any piece, a library piece such as plasma or one made with the kit, or a grid,
 * which plays inside the part, centred on it and tiled.
 */
export type Material = PartMaterial | Piece | Surface;

const isPartMaterial = (v: unknown): v is PartMaterial => {
  const m = v as PartMaterial;
  return !!m && typeof m === "object" && typeof m.prepare === "function" && !!m.colors && Array.isArray(m.colors.light) && Array.isArray(m.colors.dark);
};
const isSource = (v: unknown): v is Piece | Surface => v instanceof Surface || (!!v && typeof v === "object" && "meta" in (v as object) && typeof (v as Piece).default === "function");
type Piece = import("../types.ts").Piece;

// --- options ----------------------------------------------------------------------------------

/** How a part looks and moves: a motion, a material, its own character or colour, or hidden. */
export interface PartOptions {
  /** How it moves: a word, several, or a function of t giving its pose, for any motion the words don't have. */
  motion?: Motion | readonly Motion[] | PoseFn;
  /**
   * Seconds a loop of its motion: spin 4, flip 4, bob 2, pulse 1.6, sway 4, ripple 2, rise 4. For a function, the
   * seconds before it repeats, if it does: without, the piece has no loop.
   */
  period?: number;
  /** Seconds between blinks or glints: 4. */
  every?: number;
  /** How far it moves, as each word says (see Motion): turns for spin and flip, rows for bob, ripple and rise. */
  amount?: number;
  /** What it turns, grows and shuts about: "center", or for sway "bottom". */
  origin?: Origin;
  /** Seconds added to its time, to set it apart from others: 0. */
  offset?: number;
  /**
   * Seconds between one match's start and the next's, when a class or a colour names several: 0, and for rise the
   * period shared out among them.
   */
  stagger?: number;
  /**
   * What draws it instead of its own characters, in the cells it covers half of or more: a material such as water()
   * or glass(), or any piece or grid. A material is prepared once for a part that stays where it is, and again each
   * frame for one that moves. Not in the "outline" style, which has no inside to fill.
   */
  material?: Material;
  /** The character its solid cells take, instead of the drawing's ("8" unless `fill` says otherwise). */
  fill?: string;
  /**
   * One character for every cell it draws, edges and all, in any style: "o" for bubbles, "*" for stars, "~" for water.
   * Small parts read better so than as the letters their edges match, and a white part given one still shows in one
   * ink, where white is otherwise left out.
   */
  char?: string;
  /** Its colour, as #rrggbb, instead of its own. */
  color?: string;
  /** Left out of the drawing. */
  hide?: boolean;
}

/** What a part is given: a motion word or several, a function of t giving its pose, a material, its options, or false to leave it out. */
export type Part = Motion | readonly Motion[] | PoseFn | Material | PartOptions | false;

/** How the cells are chosen. */
export type VectorStyle = "logo" | "outline" | "blocks" | "braille";

/** fromSvg()'s options. Besides these, any key that starts "#" or "." names a part, and "*" names the whole drawing. */
export interface VectorOptions {
  /**
   * Columns, the margin included: 48. The rows follow from the drawing's shape, at two columns a row, up to the 120
   * rows a piece may have (fewer columns then). Given no size at all, a tall drawing is kept to 24 rows, a terminal's
   * height, with fewer columns.
   */
  width?: number;
  /** A fixed size instead, in columns and rows: the drawing is fitted inside its margin and centred. One of them alone keeps its shape. */
  cols?: number;
  rows?: number;
  /** Blank cells round it: one number for every side, or [columns, rows]: [2, 1]. */
  margin?: number | readonly [number, number];
  /**
   * What is fitted to the size: "ink" (the default), the box of what it draws and the room its motions take, so
   * nothing moves out of the frame; or the "viewBox", as drawn, margins and all, motions or not.
   */
  fit?: "ink" | "viewBox";
  /**
   * How the cells are chosen. "logo" (the default): the character whose shape best matches the edge through each
   * cell, and the fill where it is solid. "outline": only the shapes' edges, walked as lines, _ . - ' on gentle slopes,
   * / and \ on steep ones, | upright. "blocks": quarter blocks, ▘ ▀ ▙ █ and the rest. "braille": 2 by 4 dots a cell.
   */
  style?: VectorStyle;
  /** The character for solid cells in the "logo" style: "8", as the library's logos. The other styles have their own. */
  fill?: string;
  /** The drawing's own colours: true. false draws it in the page's own colour. */
  color?: boolean;
  /** The thinnest a stroke is drawn, in columns, so a hairline still shows: 0.4. */
  line?: number;
  /** Lowercase display name: its <title>, else "vector". */
  name?: string;
  /** One line, up to 72 characters, saying what you see: the name. */
  note?: string;
  /** "shapes" by default. */
  category?: Category;
  /** Frames a second: 30 when something moves, 0 for a still. */
  fps?: number;
  /** The moment to show held still, for reduced motion: 0. */
  still?: number;
  /** The colour behind it, as #rrggbb; it is then drawn for that ground whatever the page. */
  ground?: string;
  /** Parts, by "#id", ".class", "#rrggbb" (shapes of that colour) or "*" (all of it). */
  [part: `#${string}`]: Part;
  [part: `.${string}`]: Part;
  "*"?: Part;
}

/** drawSvg()'s options: fromSvg()'s ways of drawing and its parts, and where in the grid. */
export type DrawSvgOptions = Omit<VectorOptions, "width" | "cols" | "rows" | "name" | "note" | "category" | "fps" | "still" | "ground" | "margin"> & {
  /** Where in the grid it is fitted and centred: all of it. */
  region?: Region;
  /** Blank cells round it inside the region: one number, or [columns, rows]: 0. */
  margin?: number | readonly [number, number];
};

const OPTIONS = ["width", "cols", "rows", "margin", "fit", "style", "fill", "color", "line", "name", "note", "category", "fps", "still", "ground", "region"];
const PART_KEYS = new Set(["motion", "period", "every", "amount", "origin", "offset", "stagger", "material", "fill", "char", "color", "hide"]);
const STYLES: readonly VectorStyle[] = ["logo", "outline", "blocks", "braille"];

const whole = (v: unknown, name: string, lo: number, hi: number) =>
  v === undefined ? undefined : Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : fail(`${name} takes a whole number from ${lo} to ${hi}, not ${String(v)}`);
const above0 = (v: unknown, name: string) =>
  v === undefined ? undefined : typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fail(`${name} takes a number above 0, not ${String(v)}`);
const finite = (v: unknown, name: string) => (v === undefined ? undefined : typeof v === "number" && Number.isFinite(v) ? v : fail(`${name} takes a number, not ${String(v)}`));
const oneChar = (v: unknown, name: string) => {
  if (v === undefined) return undefined;
  if (typeof v !== "string" || v.length !== 1 || v === " ") fail(`${name} takes one character other than a space, not ${JSON.stringify(v)}`);
  code(v as string);
  return v as string;
};

// --- the plan: a drawing fitted to its cells, its parts worked out --------------------------------

/** A part as worked out: what its selector named, how it moves and what fills it. */
interface PartPlan {
  key: string;
  // A word's motion, or "pose" for a function's; a function with no period has NaN, so the piece has no loop.
  motions: { motion: Motion | "pose"; fn: PoseFn | null; period: number; amount: number; offset: number; stagger: number }[];
  origin: Origin | null;
  material: Material | null;
  fill: string | null;
  char: string | null;
  color: string | null;
  hide: boolean;
  rank: number;
}

// One moving thing: a part's motion, about the box of what it names.
interface Mover {
  motion: Motion | "pose";
  fn: PoseFn | null;
  period: number;
  amount: number;
  offset: number;
  // how deep the element it is on lies, -1 for the whole drawing
  depth: number;
  // its box in the viewBox's units, and the point it turns about
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  ox: number;
  oy: number;
}

// One paint: a shape's fill or its stroke, as polygons in samples, or in the outline style as lines.
interface Paint {
  rings: Float64Array[];
  // For lines: whether each closes; null for polygons.
  closed: boolean[] | null;
  // a copy to move each frame, when it moves
  moved: Float64Array[] | null;
  evenodd: boolean;
  slot: number;
  group: number;
  alpha: number;
  knock: boolean;
  movers: Mover[];
  ripple: Mover | null;
  part: number;
  fill: number;
  // The one character every cell of it takes, or 0 for the characters its edges match.
  char: number;
}

/** A part filled by a material or a piece, as one play of the drawing fills it. */
interface Filling {
  part: number;
  material: PartMaterial | null;
  sampler: Sampler | null;
  // Whether the part moves, so its cells are worked out again each frame.
  moves: boolean;
  // The part's cover over the grid drawn into, its cells, its drawing, and what was under it, made once and reused.
  cover: Float32Array | null;
  cells: PartCells | null;
  run: ((t: number, paint: PartPaint) => void) | null;
  under: { chars: Uint16Array; colors: Uint8Array } | null;
  // A palette index for the material's colour i, or the piece's palette index i, on this page.
  index: (i: number, paper: boolean) => number;
}

// The shapes the "logo" style picks characters by, as /make/ and the library's logos do: each character drawn in IBM
// Plex Mono, its ink measured in 2 by 4 blocks of its cell, row by row, scaled so the inkiest block of any is 1. The
// same numbers as ascii.rest/kit's image module (src/kit/glyphs.ts there, made from site/src/lib/glyphs.ts).
const SHAPE_TABLE: readonly (readonly [string, readonly number[]])[] = [
  [".", [0, 0, 0, 0, 0.15573, 0.15566, 0.10222, 0.10207]],
  [",", [0, 0, 0, 0, 0.1372, 0.18145, 0.41383, 0.0891]],
  [":", [0, 0, 0.25802, 0.2578, 0.15573, 0.15566, 0.10222, 0.10207]],
  ["'", [0.10585, 0.10585, 0.21273, 0.21273, 0, 0, 0, 0]],
  ['"', [0.21147, 0.2117, 0.42502, 0.42554, 0, 0, 0, 0]],
  ["^", [0.0888, 0.0891, 0.71744, 0.75132, 0.10874, 0.11467, 0, 0]],
  ["-", [0, 0, 0, 0, 0.36936, 0.36936, 0, 0]],
  ["_", [0, 0, 0, 0, 0, 0, 0.53806, 0.53806]],
  ["~", [0, 0, 0.28456, 0.09488, 0.40323, 0.59151, 0, 0]],
  ["=", [0, 0, 0.48973, 0.48973, 0.48973, 0.48973, 0, 0]],
  ["/", [0, 0.24313, 0.01831, 0.63457, 0.55378, 0.09903, 0.40642, 0]],
  ["\\", [0.24313, 0, 0.63479, 0.01823, 0.09873, 0.554, 0, 0.40642]],
  ["|", [0.1186, 0.1186, 0.31755, 0.31755, 0.31755, 0.31755, 0.19695, 0.19695]],
  ["(", [0, 0.26329, 0.46779, 0.17293, 0.59966, 0.0441, 0.03358, 0.39656]],
  [")", [0.26447, 0, 0.17278, 0.46705, 0.0441, 0.59907, 0.39767, 0.03313]],
  ["d", [0, 0.22178, 0.62694, 0.93966, 0.84212, 0.83589, 0.24164, 0.22]],
  ["b", [0.22178, 0, 0.94003, 0.62664, 0.83582, 0.84167, 0.22044, 0.24127]],
  ["q", [0, 0, 0.62694, 0.62108, 0.84212, 0.83589, 0.24164, 0.70388]],
  ["p", [0, 0, 0.62145, 0.62664, 0.83582, 0.84167, 0.70432, 0.24127]],
  ["P", [0.31755, 0.22052, 0.93373, 1, 0.95916, 0.23097, 0.12282, 0]],
  ["Y", [0.14432, 0.14143, 0.83041, 0.81758, 0.42762, 0.42791, 0.06137, 0.06137]],
  ["o", [0, 0, 0.54585, 0.54555, 0.79616, 0.79668, 0.19754, 0.19739]],
  ["O", [0.20703, 0.20695, 0.8396, 0.83952, 0.84397, 0.8439, 0.19709, 0.19702]],
  ["0", [0.20703, 0.20695, 0.92061, 0.92047, 0.9215, 0.92128, 0.19709, 0.19702]],
  ["8", [0.24201, 0.24186, 0.92402, 0.92373, 0.92929, 0.92862, 0.23586, 0.23453]],
];
const GLYPH_CODES = Uint16Array.from(SHAPE_TABLE, ([ch]) => ch.charCodeAt(0));
const GLYPH_INK = Float64Array.from(SHAPE_TABLE.flatMap(([, v]) => v));
// What a glint turns to a slash: solid characters; thin edges keep their shape.
const SOLID = new Set([..."8dbqpPYOo0"].map((c) => c.charCodeAt(0)));
const SLASH = "/".charCodeAt(0);
// The quarter blocks by which quarters are set: top left 1, top right 2, bottom left 4, bottom right 8.
const QUARTERS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

// --- colours on a dark page, as /make/ lifts them, and on paper ----------------------------------------

const PAGE = [19, 21, 24]; // the site's dark page
const LIGHT = [232, 235, 239]; // a black is drawn in this on a dark page
const lum = (c: readonly number[]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a: readonly number[], b: readonly number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
function toHsl(c: readonly number[]) {
  const [r, g, b] = c.map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
const greyish = (c: readonly number[]) => Math.max(...c) - Math.min(...c) < 24 || (Math.max(...c) - Math.min(...c)) / Math.max(...c) < 0.3;
/** On a dark page a dark colour is lifted until it reads: a colour to 2.8 against the page, a grey to 2.4, a black to the page's ink. */
function lift(c: string): string {
  const v = rgb(c);
  if (Math.max(...v) < 64 && Math.max(...v) - Math.min(...v) < 24) return hex(LIGHT);
  const [h, s, l] = toHsl(v);
  const g = greyish(v), want = g ? 2.4 : 2.8;
  let k = l, out = v;
  while (contrast(out, PAGE) < want && k < 0.8) out = hslToRgb(h, g ? 0 : s, (k += 0.01)).map(Math.round) as [number, number, number];
  return hex(out);
}
const white = (c: string) => {
  const v = rgb(c);
  return v[0] > 215 && v[1] > 215 && v[2] > 215;
};
const PAPER = [255, 255, 255];
/**
 * On paper a colour too pale to read as thin characters (a light grey glass, a pale yellow sun) is darkened until it
 * does, to 2 against white. A white is left as it is, as a cut-out, as the logos' white reads on paper, unless it is
 * `shown`: a part gave it a character of its own to be seen in.
 */
function sink(c: string, shown = false): string {
  const v = rgb(c);
  if ((white(c) && !shown) || contrast(v, PAPER) >= 2) return c;
  const [h, s, l] = toHsl(v);
  let k = l, out = v;
  while (contrast(out, PAPER) < 2 && k > 0.15) out = hslToRgb(h, s, (k -= 0.01)).map(Math.round) as [number, number, number];
  return hex(out);
}
const tint = (c: string, k: number) => hex(rgb(c).map((v) => v + (255 - v) * k));

// --- the rasteriser -------------------------------------------------------------------------------

/**
 * Samples a cell is measured in: `sx` across, `sx * aspect` down, square on the page. Each sample holds the paint on
 * top there, 0 for none, filled scanline by scanline at the samples' centres.
 */
class Raster {
  readonly W: number;
  readonly H: number;
  readonly ids: Uint16Array;
  #ya = new Float64Array(64);
  #yb = new Float64Array(64);
  #xa = new Float64Array(64);
  #dx = new Float64Array(64);
  #dir = new Int8Array(64);
  #order = new Uint32Array(64);
  #act = new Int32Array(64);
  #up = new Float64Array(64);
  #down = new Float64Array(64);

  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.ids = new Uint16Array(W * H);
  }

  #grow(n: number) {
    if (n <= this.#ya.length) return;
    const k = Math.max(n, this.#ya.length * 2);
    this.#ya = new Float64Array(k);
    this.#yb = new Float64Array(k);
    this.#xa = new Float64Array(k);
    this.#dx = new Float64Array(k);
    this.#dir = new Int8Array(k);
    this.#order = new Uint32Array(k);
    this.#act = new Int32Array(k);
    this.#up = new Float64Array(k);
    this.#down = new Float64Array(k);
  }

  /** Fills closed polygons with a paint's id, by the nonzero or even-odd rule. */
  fill(rings: readonly Float64Array[], evenodd: boolean, id: number) {
    let n = 0;
    for (const r of rings) n += r.length >> 1;
    this.#grow(n);
    const ya = this.#ya, yb = this.#yb, xa = this.#xa, dx = this.#dx, dir = this.#dir;
    let e = 0, lo = Infinity, hi = -Infinity;
    for (const r of rings) {
      const k = r.length >> 1;
      for (let i = 0; i < k; i++) {
        const j = i + 1 === k ? 0 : i + 1;
        const x0 = r[2 * i], y0 = r[2 * i + 1], x1 = r[2 * j], y1 = r[2 * j + 1];
        if (y0 === y1 || !(Number.isFinite(y0) && Number.isFinite(y1) && Number.isFinite(x0) && Number.isFinite(x1))) continue;
        const down = y1 > y0;
        ya[e] = down ? y0 : y1;
        yb[e] = down ? y1 : y0;
        xa[e] = down ? x0 : x1;
        dx[e] = (x1 - x0) / (y1 - y0);
        dir[e] = down ? 1 : -1;
        if (ya[e] < lo) lo = ya[e];
        if (yb[e] > hi) hi = yb[e];
        e++;
      }
    }
    if (!e) return;
    const order = this.#order.subarray(0, e);
    for (let i = 0; i < e; i++) order[i] = i;
    order.sort((a, b) => ya[a] - ya[b]);
    const act = this.#act, up = this.#up, down = this.#down, ids = this.ids, W = this.W;
    let na = 0, next = 0;
    const r0 = Math.max(0, Math.ceil(lo - 0.5)), r1 = Math.min(this.H - 1, Math.ceil(hi - 0.5) - 1);
    for (let row = r0; row <= r1; row++) {
      const yc = row + 0.5;
      while (next < e && ya[order[next]] <= yc) act[na++] = order[next++];
      // Crossings of this row's centre, the edges going down and those going up apart, each sorted along the row.
      let nu = 0, nd = 0;
      for (let k = 0; k < na; k++) {
        const i = act[k];
        if (yb[i] <= yc) {
          act[k--] = act[--na];
          continue;
        }
        if (ya[i] > yc) continue;
        const x = xa[i] + (yc - ya[i]) * dx[i];
        if (dir[i] > 0) down[nd++] = x;
        else up[nu++] = x;
      }
      sortFirst(down, nd);
      sortFirst(up, nu);
      // Walked in order, the two merged: the span after each crossing is inside by the winding so far.
      let wind = 0, crossed = 0, a = 0, b = 0, prev = 0;
      while (a < nd || b < nu) {
        const isDown = b >= nu || (a < nd && down[a] <= up[b]);
        const x = isDown ? down[a++] : up[b++];
        if (crossed && (evenodd ? crossed & 1 : wind !== 0)) {
          const c0 = Math.max(0, Math.ceil(prev - 0.5)), c1 = Math.min(W, Math.ceil(x - 0.5));
          if (c1 > c0) ids.fill(id, row * W + c0, row * W + c1);
        }
        wind += isDown ? 1 : -1;
        crossed++;
        prev = x;
      }
    }
  }
}

// Sorts the first n numbers of a list: by insertion for the few a row of most drawings crosses, natively for many.
function sortFirst(a: Float64Array, n: number) {
  if (n > 24) {
    a.subarray(0, n).sort();
    return;
  }
  for (let i = 1; i < n; i++) {
    const v = a[i];
    let j = i;
    for (; j > 0 && a[j - 1] > v; j--) a[j] = a[j - 1];
    a[j] = v;
  }
}

// A circle as a polygon, counter-clockwise on the page as every stroke's pieces are, so they unite under nonzero.
function disc(out: Float64Array[], x: number, y: number, r: number) {
  const n = Math.max(8, Math.min(32, Math.ceil(r * 1.2)));
  const p = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    p[2 * i] = x + r * Math.cos((-i * TAU) / n);
    p[2 * i + 1] = y + r * Math.sin((-i * TAU) / n);
  }
  out.push(p);
}

// A polygon turned so its signed area is negative, as disc() makes them.
function oriented(p: Float64Array): Float64Array {
  let a = 0;
  const n = p.length >> 1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
  }
  if (a <= 0) return p;
  const q = new Float64Array(p.length);
  for (let i = 0; i < n; i++) {
    q[2 * i] = p[2 * (n - 1 - i)];
    q[2 * i + 1] = p[2 * (n - 1 - i) + 1];
  }
  return q;
}

// A stroke as polygons: a quad along each line, a disc where it bends and, for round caps, at its ends.
function strokeRings(subs: readonly Sub[], hw: number, cap: "butt" | "round" | "square"): Float64Array[] {
  const out: Float64Array[] = [];
  for (const { pts, closed } of subs) {
    const n = pts.length >> 1;
    if (n === 1) {
      if (cap === "round") disc(out, pts[0], pts[1], hw);
      else if (cap === "square") out.push(oriented(Float64Array.of(pts[0] - hw, pts[1] - hw, pts[0] + hw, pts[1] - hw, pts[0] + hw, pts[1] + hw, pts[0] - hw, pts[1] + hw)));
      continue;
    }
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % n;
      let ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * j], by = pts[2 * j + 1];
      const l = Math.hypot(bx - ax, by - ay);
      if (l < 1e-9) continue;
      const ux = (bx - ax) / l, uy = (by - ay) / l;
      if (!closed && cap === "square") {
        if (i === 0) (ax -= ux * hw), (ay -= uy * hw);
        if (i === segs - 1) (bx += ux * hw), (by += uy * hw);
      }
      const nx = -uy * hw, ny = ux * hw;
      out.push(oriented(Float64Array.of(ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny)));
    }
    // Joins: a disc wherever the line turns enough to leave a notch.
    for (let i = 0; i < n; i++) {
      const end = !closed && (i === 0 || i === n - 1);
      if (end) {
        if (cap === "round") disc(out, pts[2 * i], pts[2 * i + 1], hw);
        continue;
      }
      const p = (i - 1 + n) % n, q = (i + 1) % n;
      const ax = pts[2 * i] - pts[2 * p], ay = pts[2 * i + 1] - pts[2 * p + 1], bx = pts[2 * q] - pts[2 * i], by = pts[2 * q + 1] - pts[2 * i + 1];
      const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
      if (cos < 0.985) disc(out, pts[2 * i], pts[2 * i + 1], hw);
    }
  }
  return out;
}

// Long edges cut into short ones, so a ripple bends them. An open line's last point has no edge after it.
function subdivide(rings: Float64Array[], most: number, closed: readonly boolean[] | null): Float64Array[] {
  return rings.map((r, ri) => {
    const n = r.length >> 1, out: number[] = [];
    const shut = closed ? closed[ri] : true;
    for (let i = 0; i < n; i++) {
      if (!shut && i === n - 1) {
        out.push(r[2 * i], r[2 * i + 1]);
        break;
      }
      const j = (i + 1) % n;
      const ax = r[2 * i], ay = r[2 * i + 1], bx = r[2 * j], by = r[2 * j + 1];
      const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / most));
      for (let s = 0; s < k; s++) out.push(ax + ((bx - ax) * s) / k, ay + ((by - ay) * s) / k);
    }
    return Float64Array.from(out);
  });
}

// The outline style's character for a line through a cell, by its slope on the page (0 flat, 90 upright, in degrees)
// and where it crosses the cell, 0 at the top to 1 at the bottom: - _ for flat; _ . - ' for shallow and . ' for a
// diagonal, so slopes read as the classic _.-' and .' steps; / \ for steep; | upright.
function lineChar(slope: number, rising: boolean, at: number): number {
  if (slope < 15) return at < 0.7 ? 45 : 95;
  if (slope < 32) return at > 0.75 ? 95 : at > 0.6 ? 46 : at > 0.3 ? 45 : 39;
  if (slope < 56) return at >= 0.5 ? 46 : 39;
  if (slope < 74) return rising ? 47 : 92;
  return 124;
}

// The least common multiple of some periods, on hundredths of a second, if it is 60 s or less; none when one of them
// is not known (NaN, a motion function's with no period).
function loopOf(periods: readonly number[]): number | undefined {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  let l = 1;
  for (const p of periods) {
    if (Number.isNaN(p)) return undefined;
    const h = Math.round(p * 100);
    if (h <= 0) continue;
    l = (l / gcd(l, h)) * h;
    if (l > 6000) return undefined;
  }
  return periods.length ? l / 100 : undefined;
}

// A number from a pose, or its default when the function gave none or something that is not a finite number.
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** A motion's transform at t, in the viewBox's units: `rowUnits` and `colUnits` of them make a row and a column. */
function motionAt(m: Mover, t: number, rowUnits: number, colUnits: number): Mat {
  const u = (t + m.offset) / m.period;
  const { ox, oy } = m;
  switch (m.motion) {
    case "spin": {
      const a = TAU * m.amount * u;
      return about(ox, oy, Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a));
    }
    case "flip": {
      // Edge on, a coin still shows a sliver.
      const k = Math.cos(TAU * m.amount * u);
      return about(ox, oy, Math.abs(k) < 0.08 ? (k < 0 ? -0.08 : 0.08) : k, 0, 0, 1);
    }
    case "bob":
      return [1, 0, 0, 1, 0, -m.amount * rowUnits * Math.sin(TAU * u)];
    case "pulse": {
      const k = 1 + m.amount * (0.5 - 0.5 * Math.cos(TAU * u));
      return about(ox, oy, k, 0, 0, k);
    }
    case "sway": {
      const a = m.amount * Math.sin(TAU * u);
      return about(ox, oy, Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a));
    }
    case "blink": {
      // Shut for a fifth of a second at the end of each wait, so it is open at the start.
      const w = m.period * (u - Math.floor(u)), shut = 0.2;
      const k = w > m.period - shut ? 1 - m.amount * Math.sin((Math.PI * (w - (m.period - shut))) / shut) : 1;
      return about(ox, oy, 1, 0, 0, k);
    }
    case "rise":
      return [1, 0, 0, 1, 0, -m.amount * rowUnits * (u - Math.floor(u))];
    case "pose": {
      // Scaled, then turned, about the origin, then moved.
      const p = m.fn!(t + m.offset) ?? {};
      const a = num(p.rotate, 0), sc = p.scale;
      const sx = num(Array.isArray(sc) ? sc[0] : sc, 1), sy = num(Array.isArray(sc) ? sc[1] : sc, 1);
      const c = Math.cos(a), s = Math.sin(a);
      const r = about(ox, oy, c * sx, s * sx, -s * sy, c * sy);
      return [r[0], r[1], r[2], r[3], r[4] + num(p.x, 0) * colUnits, r[5] + num(p.y, 0) * rowUnits];
    }
    default:
      return IDENTITY;
  }
}

// --- the plan -----------------------------------------------------------------------------------

interface PlanOptions {
  cols?: number;
  rows?: number;
  width?: number;
  margin: [number, number];
  fit: "ink" | "viewBox";
  style: VectorStyle;
  fill: string;
  color: boolean;
  line: number;
  aspect: number;
  parts: PartPlan[];
}

/** A drawing fitted to its cells, ready to draw at any t. */
interface Plan {
  cols: number;
  rows: number;
  /** The colours, theme by theme: slot i is light[i] on paper and dark[i] on a dark page, each with its glint tints. */
  light: string[];
  dark: string[];
  /** 3 when a part glints (each colour, then twice lighter), else 1. */
  runs: number;
  /** True when anything in it moves. */
  moving: boolean;
  /** The periods of its motions, for the loop. */
  periods: number[];
  /** The parts a material or a piece fills, the backmost first. */
  textured: { part: number; material: Material; moves: boolean; first: number }[];
  draw: () => Drawer;
}

/**
 * A frame of a plan: a character a cell, its colour (a slot, plus the slots in a run for a glint's tints, or -1), the
 * part with a material, glint or fill of its own that most of it is (or -1), and how much of each cell each part covers.
 */
interface Rendered {
  chars: Uint16Array;
  slots: Int16Array;
  parts: Int16Array;
  cover: Float32Array[];
}

/** Draws a plan's frames: one for each play, with its own buffers. */
interface Drawer {
  render(t: number, mono: boolean): Rendered;
}

// Normalises what a part was given.
function partOf(key: string, v: unknown, rank: number): PartPlan {
  const plan: PartPlan = { key, motions: [], origin: null, material: null, fill: null, char: null, color: null, hide: false, rank };
  const takes = `${key} takes a motion, ${and(Object.keys(MOTIONS))}, a function of t giving its pose, a material, or { motion, origin, material, fill, char, color, hide }`;
  const words = (w: unknown) => {
    const list = typeof w === "string" ? [w] : Array.isArray(w) ? w : fail(`${key}'s motion takes a word, ${and(Object.keys(MOTIONS))}, a list of them, or a function of t, not ${JSON.stringify(w)}`);
    for (const m of list) if (typeof m !== "string" || !Object.hasOwn(MOTIONS, m)) fail(`${takes}, not ${JSON.stringify(m)}`);
    return list as Motion[];
  };
  if (v === false) {
    plan.hide = true;
    return plan;
  }
  let o: PartOptions;
  if (typeof v === "function") o = { motion: v as PoseFn };
  else if (typeof v === "string" || Array.isArray(v)) o = { motion: words(v) };
  else if (isSource(v) || isPartMaterial(v)) o = { material: v as Material };
  else if (v && typeof v === "object") {
    for (const k of Object.keys(v))
      if (!PART_KEYS.has(k)) fail(`${key} has no option named ${JSON.stringify(k)}: a part takes ${and([...PART_KEYS])}`);
    o = v as PartOptions;
  } else return fail(`${takes}, not ${String(v)}`);
  const fn = typeof o.motion === "function" ? o.motion : null;
  const list = o.motion === undefined || fn ? [] : words(o.motion);
  const period = above0(o.period, `${key}'s period`), every = above0(o.every, `${key}'s every`);
  const amount = finite(o.amount, `${key}'s amount`), offset = finite(o.offset, `${key}'s offset`) ?? 0;
  const stagger = finite(o.stagger, `${key}'s stagger`);
  if (period !== undefined && list.length && list.every((m) => MOTIONS[m].every)) fail(`${key}'s ${and(list)} comes now and then: give it every, the seconds between, not period`);
  if (every !== undefined && list.length && list.every((m) => !MOTIONS[m].every)) fail(`${key}'s ${and(list)} goes round and round: give it period, the seconds a loop, not every`);
  for (const m of list) {
    const d = MOTIONS[m];
    const p = (d.every ? every : period) ?? d.period;
    plan.motions.push({ motion: m, fn: null, period: p, amount: amount ?? d.amount, offset, stagger: stagger ?? (m === "rise" ? NaN : 0) });
  }
  if (fn) {
    if (every !== undefined) fail(`${key}'s every is for blink and glint: give a function period, the seconds before it repeats`);
    if (amount !== undefined) fail(`${key}'s amount is for motion words: a function says how far it moves itself`);
    // Called once now, so a function that gives something other than a pose fails here, not on the first frame.
    const pose: unknown = fn(0);
    const ok = (k: string, x: unknown) => x === undefined || (typeof x === "number" && Number.isFinite(x)) || (k === "scale" && Array.isArray(x) && x.length === 2 && x.every((y) => typeof y === "number" && Number.isFinite(y)));
    if (!pose || typeof pose !== "object" || Object.entries(pose).some(([k, x]) => !["x", "y", "rotate", "scale"].includes(k) || !ok(k, x)))
      fail(`${key}'s motion function returns a pose, { x, y, rotate, scale } of numbers (columns, rows, radians, times), not ${JSON.stringify(pose) ?? String(pose)}`);
    plan.motions.push({ motion: "pose", fn, period: period ?? NaN, amount: 0, offset, stagger: stagger ?? 0 });
  }
  if (o.origin !== undefined) {
    const g = o.origin;
    if (!(typeof g === "string" ? ORIGINS.includes(g) : Array.isArray(g) && g.length === 2 && g.every((x) => typeof x === "number" && Number.isFinite(x))))
      fail(`${key}'s origin takes ${and(ORIGINS.map((w) => JSON.stringify(w)))}, or a point [x, y] in the svg's units, not ${JSON.stringify(g)}`);
    plan.origin = g;
  }
  if (o.material !== undefined) {
    if (!isSource(o.material) && !isPartMaterial(o.material))
      fail(`${key}'s material takes a material such as water() or glass() from ascii.rest/kit, a piece or a Surface, not ${JSON.stringify(o.material) ?? String(o.material)}`);
    if (isPartMaterial(o.material))
      for (const c of [...o.material.colors.light, ...o.material.colors.dark]) if (!isHex(c)) fail(`${key}'s material has a colour that is not #rrggbb: ${JSON.stringify(c)}`);
    plan.material = o.material;
  }
  plan.fill = oneChar(o.fill, `${key}'s fill`) ?? null;
  plan.char = oneChar(o.char, `${key}'s char`) ?? null;
  if (o.color !== undefined && !isHex(o.color)) fail(`${key}'s color takes #rrggbb, not ${JSON.stringify(o.color)}`);
  plan.color = o.color?.toLowerCase() ?? null;
  plan.hide = o.hide === true;
  return plan;
}

// Which shapes a part names, and as which owners: the element the name is on, so a group moves as one.
function matches(svg: Svg, key: string): Map<number, number[]> {
  const owners = new Map<number, number[]>();
  const add = (owner: number, shape: number) => (owners.get(owner) ?? owners.set(owner, []).get(owner)!).push(shape);
  const colour = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key) ? (color(key)?.c ?? null) : null;
  svg.shapes.forEach((s, i) => {
    if (key === "*") return add(-1, i);
    const name = key.slice(1);
    for (let k = s.chain.length - 1; k >= 0; k--) {
      const c = s.chain[k];
      if (key[0] === "#" ? c.id === name : c.classes.includes(name)) return add(c.index, i);
    }
    if (colour && (s.fill === colour || s.stroke === colour)) add(-2 - i, i);
  });
  return owners;
}

function plan(svg: Svg, o: PlanOptions): Plan {
  const { aspect, style } = o;
  const shapes = svg.shapes;
  // Each shape's parts, most specific last: "*", then colours, classes and ids, in the order given.
  const partsOf = shapes.map(() => [] as { part: number; owner: number }[]);
  // Each part's owners: the element its name is on, and how deep that element is, -1 for "*" (the whole drawing),
  // so an outer group's motion carries an inner one's.
  const owners = new Map<string, { part: number; shapes: number[]; index: number; count: number; depth: number }>();
  o.parts.forEach((p, pi) => {
    const found = matches(svg, p.key);
    if (!found.size) {
      const known = svg.parts.length ? `it has ${and(svg.parts.slice(0, 12).map((k) => JSON.stringify(k)))}${svg.parts.length > 12 ? " and more" : ""}` : "it names no parts";
      fail(`fromSvg's part ${JSON.stringify(p.key)} names nothing in this svg: ${known}`);
    }
    let index = 0;
    for (const [owner, list] of found) {
      const k = `${pi}:${owner}`;
      const chain = svg.shapes[list[0]].chain;
      const depth = owner === -1 ? -1 : owner <= -2 ? chain.length : chain.findIndex((c) => c.index === owner);
      owners.set(k, { part: pi, shapes: list, index: index++, count: found.size, depth });
      for (const s of list) partsOf[s].push({ part: pi, owner });
    }
  });
  for (const list of partsOf) list.sort((a, b) => o.parts[a.part].rank - o.parts[b.part].rank);
  const hidden = shapes.map((_, i) => partsOf[i].some((p) => o.parts[p.part].hide));
  const last = <K extends keyof PartPlan>(i: number, k: K): PartPlan[K] | null => {
    let v: PartPlan[K] | null = null;
    for (const p of partsOf[i]) if (o.parts[p.part][k] !== null && o.parts[p.part][k] !== false) v = o.parts[p.part][k];
    return v;
  };

  // The box each owner's motions turn about, from its shapes as drawn.
  const boxOf = (list: readonly number[]) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const i of list) {
      const b = shapes[i].box;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[0] + b[2]);
      y1 = Math.max(y1, b[1] + b[3]);
    }
    return { x0, y0, x1, y1 };
  };
  // The point a part turns about: its origin as a point, or a side or corner of its box, its centre by default.
  const pivot = (b: { x0: number; y0: number; x1: number; y1: number }, g: Origin) =>
    typeof g === "string"
      ? { ox: g.includes("left") ? b.x0 : g.includes("right") ? b.x1 : (b.x0 + b.x1) / 2, oy: g.includes("top") ? b.y0 : g.includes("bottom") ? b.y1 : (b.y0 + b.y1) / 2 }
      : { ox: g[0], oy: g[1] };
  const movers = shapes.map(() => [] as Mover[]);
  const ripples: (Mover | null)[] = shapes.map(() => null);
  const glints = new Map<number, { every: number; offset: number }>();
  // The periods of the motions, NaN for a function's that has none.
  const periods: number[] = [];
  for (const [, ow] of owners) {
    const p = o.parts[ow.part];
    const box = boxOf(ow.shapes);
    for (const m of p.motions) {
      periods.push(m.period);
      const stagger = Number.isNaN(m.stagger) ? m.period / ow.count : m.stagger;
      const at = pivot(box, p.origin ?? (m.motion === "sway" ? "bottom" : "center"));
      const mover: Mover = { motion: m.motion, fn: m.fn, period: m.period, amount: m.amount, offset: m.offset + stagger * ow.index, depth: ow.depth, ...box, ...at };
      if (m.motion === "glint") {
        glints.set(ow.part, { every: m.period, offset: m.offset });
        continue;
      }
      for (const s of ow.shapes) {
        if (m.motion === "ripple") ripples[s] = mover;
        else movers[s].push(mover);
      }
    }
  }
  // A shape's own motions first, then its groups' outwards: a group's motion carries what moves inside it.
  for (const list of movers) list.sort((a, b) => b.depth - a.depth);

  // The box fitted to the cells, and the room the motions take.
  let box: [number, number, number, number];
  const ink = () => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    shapes.forEach((s, i) => {
      if (hidden[i]) return;
      x0 = Math.min(x0, s.box[0]);
      y0 = Math.min(y0, s.box[1]);
      x1 = Math.max(x1, s.box[0] + s.box[2]);
      y1 = Math.max(y1, s.box[1] + s.box[3]);
    });
    return x1 < x0 ? null : ([x0, y0, x1 - x0, y1 - y0] as [number, number, number, number]);
  };
  const vb = svg.viewBox;
  if (o.fit === "viewBox") box = [vb[0], vb[1], vb[2], vb[3]];
  else {
    const b = ink();
    if (!b) {
      const left = svg.skipped?.length ? ` (it has ${and(svg.skipped)}, which fromSvg leaves out: turn text to outlines in your editor before you export)` : "";
      fail(`fromSvg found nothing to draw in this svg: no path, rect, circle, ellipse, line, polyline or polygon with a fill or a stroke${left}`);
    }
    box = b;
  }

  // The size: given, or `width` columns and the rows the drawing's shape takes.
  const [mx, my] = o.margin;
  const sizeFor = (b: readonly number[]) => {
    let cols: number, rows: number;
    const w = Math.max(b[2], 1e-9), h = Math.max(b[3], 1e-9);
    if (o.cols !== undefined && o.rows !== undefined) (cols = o.cols), (rows = o.rows);
    else if (o.rows !== undefined) {
      rows = o.rows;
      cols = Math.max(1, Math.round(((rows - 2 * my) * aspect * w) / h)) + 2 * mx;
    } else {
      cols = o.cols ?? o.width ?? 48;
      rows = Math.max(1, Math.round((cols - 2 * mx) * (h / w) / aspect)) + 2 * my;
      // Given no size, a tall drawing is kept to a terminal's 24 rows, with fewer columns.
      if (o.cols === undefined && o.width === undefined && rows > 24) {
        rows = 24;
        cols = Math.max(1, Math.round(((rows - 2 * my) * aspect * w) / h)) + 2 * mx;
      }
    }
    // Kept within the largest a piece may be, the drawing's shape kept.
    if (rows > MAX.rows && o.rows === undefined) {
      rows = MAX.rows;
      if (o.cols === undefined) cols = Math.max(1, Math.round(((rows - 2 * my) * aspect * w) / h)) + 2 * mx;
    }
    if (cols > MAX.cols) cols = MAX.cols;
    if (cols - 2 * mx < 1 || rows - 2 * my < 1) fail(`fromSvg's margin of ${mx} columns and ${my} rows leaves no room in ${cols} by ${rows} cells: give it a smaller margin or more room`);
    return { cols, rows };
  };
  // Square units a viewBox unit, and where the box's corner lands, in columns.
  const fitTo = (b: readonly number[], cols: number, rows: number) => {
    const iw = cols - 2 * mx, ih = (rows - 2 * my) * aspect;
    const k = Math.min(iw / Math.max(b[2], 1e-9), ih / Math.max(b[3], 1e-9));
    return { k, ox: mx + (iw - b[2] * k) / 2 - b[0] * k, oy: my * aspect + (ih - b[3] * k) / 2 - b[1] * k };
  };
  let size = sizeFor(box);
  let fit = fitTo(box, size.cols, size.rows);
  // A row and a column in the viewBox's units, at the scale the motions' room was measured at.
  let rowUnits = aspect / fit.k;
  if (o.fit === "ink" && (movers.some((m) => m.length) || ripples.some(Boolean))) {
    // How far each moving shape reaches: its box's corners through its motions, over the loop (or 12 s for a
    // function with no period, more finely), at the scale k. Fitted with that room the drawing is smaller, so a motion
    // given in rows reaches further: the scale that fits its own room is found by the secant method, so a bob of 3
    // rows is drawn 3 rows, and the room is always measured at the scale the motions are drawn at, so nothing clips.
    const unknown = periods.some(Number.isNaN), known = loopOf(periods.filter((p) => !Number.isNaN(p)));
    const loop = unknown ? Math.max(12, known ?? 0) : (known ?? 12), steps = unknown ? 240 : 96;
    const ink0 = box;
    const measure = (k: number) => {
      rowUnits = aspect / k;
      let x0 = ink0[0], y0 = ink0[1], x1 = ink0[0] + ink0[2], y1 = ink0[1] + ink0[3];
      shapes.forEach((s, i) => {
        if (hidden[i] || (!movers[i].length && !ripples[i])) return;
        const b = s.box, grow = ripples[i] ? ripples[i]!.amount * rowUnits : 0;
        const corners = [b[0], b[1] - grow, b[0] + b[2], b[1] - grow, b[0], b[1] + b[3], b[0] + b[2], b[1] + b[3]];
        for (let n = 0; n < steps; n++) {
          let m = IDENTITY;
          for (const mv of movers[i]) m = mul(motionAt(mv, (loop * n) / steps, rowUnits, rowUnits / aspect), m);
          for (let c = 0; c < 8; c += 2) {
            const x = m[0] * corners[c] + m[2] * corners[c + 1] + m[4], y = m[1] * corners[c] + m[3] * corners[c + 1] + m[5];
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
        }
      });
      if (![x0, y0, x1, y1].every(Number.isFinite)) fail("fromSvg's motions move a part out to infinity: give a motion function numbers it can draw");
      box = [x0, y0, x1 - x0, y1 - y0];
      size = sizeFor(box);
      return fitTo(box, size.cols, size.rows);
    };
    let k0 = fit.k, f0 = measure(k0), k1 = f0.k, f1 = measure(k1);
    for (let pass = 0; pass < 12 && Math.abs(f1.k - k1) > k1 * 1e-5; pass++) {
      const g0 = f0.k - k0, g1 = f1.k - k1;
      const k2 = g1 !== g0 ? k1 - (g1 * (k1 - k0)) / (g1 - g0) : f1.k;
      (k0 = k1), (f0 = f1);
      k1 = Number.isFinite(k2) && k2 > 0 ? k2 : f1.k;
      f1 = measure(k1);
    }
    // The last measure leaves rowUnits at k1 and the room and size it gave: draw at that.
    fit = f1;
  }
  const colUnits = rowUnits / aspect;
  const { cols, rows } = size;
  // Samples a column: finer for small drawings, coarser for big ones, so a frame stays quick.
  const sx = cols * rows <= 4096 ? 8 : 4;
  const sy = Math.max(4, Math.round(sx * aspect / 4) * 4);
  const ky = sy / aspect; // samples a square unit down
  const toSamples: Mat = [fit.k * sx, 0, 0, fit.k * ky, fit.ox * sx, fit.oy * ky];
  const fromSamples = invert(toSamples);

  // Colours: each shape's fill and stroke, a part's own if it gives one, the page's ink for currentColor.
  const used: string[] = [];
  const seen = new Map<string, number>();
  const want = (c: string) => {
    const k = c.toLowerCase();
    if (!seen.has(k)) seen.set(k, used.push(k) - 1);
    return seen.get(k)!;
  };
  const paints: Paint[] = [];
  const raw: { shape: number; c: string; alpha: number; rings: Float64Array[]; lines: Sub[] | null; evenodd: boolean }[] = [];
  const tol = 0.2;
  const outline = style === "outline";
  shapes.forEach((s, i) => {
    if (hidden[i]) return;
    const recolor = last(i, "color") as string | null;
    const subs = flatten(s.ops, toSamples, tol);
    const hwMin = (o.line * sx) / 2;
    // In the outline style a shape is its edges, walked as lines: a fill's edges closed, a stroke as it runs.
    if (s.fill) {
      const c = recolor ?? s.fill;
      if (outline) raw.push({ shape: i, c, alpha: s.fillOpacity, rings: [], lines: subs.map((x) => ({ pts: x.pts, closed: true })), evenodd: false });
      else raw.push({ shape: i, c, alpha: s.fillOpacity, rings: subs.map((x) => x.pts), lines: null, evenodd: s.fillRule === "evenodd" });
    }
    if (s.stroke) {
      const hw = Math.max(hwMin, (s.strokeWidth * fit.k * sx) / 2);
      if (outline) raw.push({ shape: i, c: recolor ?? s.stroke, alpha: s.strokeOpacity, rings: [], lines: subs, evenodd: false });
      else raw.push({ shape: i, c: recolor ?? s.stroke, alpha: s.strokeOpacity, rings: strokeRings(subs, hw, s.cap), lines: null, evenodd: false });
    }
  });

  // Colours past what the palette can hold are merged into their nearest, the less used into the more.
  const glinting = glints.size > 0;
  const runs = glinting ? 3 : 1;
  const counts = new Map<string, number>();
  for (const r of raw) if (r.c !== "currentColor") counts.set(r.c, (counts.get(r.c) ?? 0) + 1);
  const hasInk = raw.some((r) => r.c === "currentColor");
  let colours = [...counts.keys()];
  const room = Math.max(1, Math.floor((48 - (hasInk ? runs * 2 : 0)) / (2 * runs)));
  const merged = new Map<string, string>();
  const into = (drop: string, keep: string) => {
    merged.set(drop, keep);
    counts.set(keep, counts.get(keep)! + counts.get(drop)!);
  };
  // Hundreds of colours, as an illustration's shading has, are first cut down by boxes of the colour cube, an eighth of
  // each channel, then a quarter: the most used colour of each box takes the rest of it.
  for (const shift of [5, 6]) {
    if (colours.length <= 96) break;
    const best = new Map<number, string>();
    const box = (c: string) => {
      const v = rgb(c);
      return ((v[0] >> shift) << 6) | ((v[1] >> shift) << 3) | (v[2] >> shift);
    };
    for (const c of colours) {
      const b = best.get(box(c));
      if (!b || counts.get(c)! > counts.get(b)!) best.set(box(c), c);
    }
    for (const c of colours) if (best.get(box(c)) !== c) into(c, best.get(box(c))!);
    colours = [...best.values()];
  }
  // Then the nearest two at a time, the less used into the more.
  const rgbs = colours.map(rgb);
  while (colours.length > room) {
    let bi = 0, bj = 1, bd = Infinity;
    for (let i = 0; i < colours.length; i++)
      for (let j = i + 1; j < colours.length; j++) {
        const x = rgbs[i], y = rgbs[j];
        const d = 0.3 * (x[0] - y[0]) ** 2 + 0.59 * (x[1] - y[1]) ** 2 + 0.11 * (x[2] - y[2]) ** 2;
        if (d < bd) (bd = d), (bi = i), (bj = j);
      }
    const [keep, drop] = counts.get(colours[bi])! >= counts.get(colours[bj])! ? [bi, bj] : [bj, bi];
    into(colours[drop], colours[keep]);
    colours.splice(drop, 1);
    rgbs.splice(drop, 1);
  }
  // A colour merged into one that was merged in turn ends at the last.
  const final = (c: string) => {
    for (let k = 0; merged.has(c) && k < 1024; k++) c = merged.get(c)!;
    return c;
  };
  const coloured = o.color && colours.length > 0;
  const knockable = coloured && colours.some(white) && !colours.every(white);
  for (const c of colours) want(c);
  if (coloured && hasInk) want("currentcolor");
  const light: string[] = [], dark: string[] = [];
  // The colours of parts given a character of their own, to be seen on paper even when white.
  const shown = new Set(raw.filter((r) => last(r.shape, "char")).map((r) => (r.c === "currentColor" ? "currentcolor" : final(r.c))));
  if (coloured) {
    for (let run = 0; run < runs; run++)
      for (const c of used) {
        const l = c === "currentcolor" ? INK.light : sink(c, shown.has(c)), d = c === "currentcolor" ? INK.dark : lift(c);
        light.push(run ? tint(l, run * 0.35) : l);
        dark.push(run ? tint(d, run * 0.35) : d);
      }
  }

  // The paints in order, each with its colour slot, its colour's group (for edges between colours, in one ink too),
  // its parts and its motions.
  const fillCode = o.fill.charCodeAt(0);
  const groups: string[] = [];
  const groupSlot: number[] = [];
  for (const r of raw) {
    const c = r.c === "currentColor" ? "currentcolor" : final(r.c);
    const slot = coloured ? seen.get(c)! : -1;
    let group = groups.indexOf(c);
    if (group < 0) {
      group = groups.push(c) - 1;
      groupSlot.push(slot);
    }
    const ms = movers[r.shape], rp = ripples[r.shape];
    let rings = r.lines ? r.lines.map((x) => x.pts) : r.rings;
    if (rp) rings = subdivide(rings, sx, r.lines ? r.lines.map((x) => x.closed) : null);
    let part = -1;
    for (const p of partsOf[r.shape]) if (o.parts[p.part].material || glints.has(p.part) || o.parts[p.part].fill) part = p.part;
    const ownFill = last(r.shape, "fill") as string | null, ownChar = last(r.shape, "char") as string | null;
    paints.push({
      rings,
      closed: r.lines ? r.lines.map((x) => x.closed) : null,
      moved: ms.length || rp ? rings.map((x) => new Float64Array(x.length)) : null,
      evenodd: r.evenodd,
      slot,
      group,
      alpha: r.alpha,
      // White is left out in one ink, unless a part gave it a character of its own to be drawn in.
      knock: !!knockable && r.c !== "currentColor" && white(final(r.c)) && !ownChar,
      movers: ms,
      ripple: rp,
      part,
      fill: ownFill ? ownFill.charCodeAt(0) : fillCode,
      char: ownChar ? ownChar.charCodeAt(0) : 0,
    });
  }
  if (paints.length > 65534) fail(`fromSvg can draw up to 65534 fills and strokes, not ${paints.length}: simplify the svg`);
  const moving = paints.some((p) => p.moved) || glints.size > 0;
  const firstMoving = paints.findIndex((p) => p.moved);

  // The parts a material or a piece fills, the backmost first, and whether each moves.
  const textured: { part: number; material: Material; moves: boolean; first: number }[] = [];
  o.parts.forEach((pp, pi) => {
    if (!pp.material) return;
    const first = paints.findIndex((p) => p.part === pi);
    if (first >= 0) textured.push({ part: pi, material: pp.material, moves: paints.some((p) => p.part === pi && !!p.moved), first });
  });
  textured.sort((a, b) => a.first - b.first);

  // A part's box in cells, for glints and materials: from its shapes as drawn.
  const partBox = new Map<number, Region>();
  for (const [pi] of o.parts.entries()) {
    const list = shapes.map((_, i) => i).filter((i) => !hidden[i] && partsOf[i].some((p) => p.part === pi));
    if (!list.length) continue;
    const b = boxOf(list);
    const x0 = (b.x0 * fit.k + fit.ox), x1 = (b.x1 * fit.k + fit.ox), y0 = (b.y0 * fit.k + fit.oy) / aspect, y1 = (b.y1 * fit.k + fit.oy) / aspect;
    partBox.set(pi, { x: Math.floor(x0), y: Math.floor(y0), cols: Math.max(1, Math.ceil(x1) - Math.floor(x0)), rows: Math.max(1, Math.ceil(y1) - Math.floor(y0)) });
  }

  const draw = (): Drawer => {
    // The outline style walks lines straight into cells and needs no samples.
    const raster = outline ? new Raster(1, 1) : new Raster(cols * sx, rows * sy);
    const base = firstMoving > 0 ? new Uint16Array(raster.ids.length) : null;
    const nParts = o.parts.length;
    const chars = new Uint16Array(cols * rows), slots = new Int16Array(cols * rows), owner = new Int16Array(cols * rows);
    const cover = Array.from({ length: nParts }, () => new Float32Array(cols * rows));
    const alpha = new Float32Array(paints.length + 1), knock = new Uint8Array(paints.length + 1), slotOf = new Int16Array(paints.length + 1);
    const partOfPaint = new Int16Array(paints.length + 1).fill(-1), fillOf = new Uint16Array(paints.length + 1), charOf = new Uint16Array(paints.length + 1);
    paints.forEach((p, i) => {
      alpha[i + 1] = p.alpha;
      knock[i + 1] = p.knock ? 1 : 0;
      slotOf[i + 1] = p.slot;
      partOfPaint[i + 1] = p.part;
      fillOf[i + 1] = p.fill;
      charOf[i + 1] = p.char;
    });
    const groupOf = new Uint16Array(paints.length + 1);
    paints.forEach((p, i) => (groupOf[i + 1] = p.group));
    const v = new Float64Array(8);
    const votes = new Uint16Array(groups.length + 1);
    const partVotes = new Uint16Array(nParts + 1);
    // The colours and parts a cell has samples of, as stacks reused from cell to cell.
    const touched = new Int16Array(votes.length), seenParts = new Int16Array(nParts + 1);
    const W = raster.W, ids = raster.ids;
    const bw = sx / 2, bh = sy / 4, per = bw * bh;
    let based = false;

    // The samples at t: every paint in order, moved where it moves. What lies under the first moving paint is drawn
    // once and copied each frame.
    // A moving paint's points at t, into its own copy: its motions, outer last, and a ripple along its top.
    const place = (p: Paint, t: number) => {
      let m = IDENTITY;
      for (const mv of p.movers) m = mul(motionAt(mv, t, rowUnits, colUnits), m);
      const s = mul(toSamples, mul(m, fromSamples));
      const rp = p.ripple;
      // A ripple: the top of the shape rises and falls in two waves along it, the bottom held still.
      let top = 0, depth = 1, amp = 0, phase = 0, wave = 1;
      if (rp) {
        top = (rp.y0 * fit.k + fit.oy) * ky;
        depth = Math.max(1, ((rp.y1 - rp.y0) * fit.k * ky) / 2);
        amp = rp.amount * aspect * ky;
        phase = (TAU * (t + rp.offset)) / rp.period;
        wave = 12 * sx;
      }
      p.rings.forEach((r, k) => {
        const out = p.moved![k];
        for (let j = 0; j < r.length; j += 2) {
          const x = r[j];
          let y = r[j + 1];
          if (rp) {
            const w = clamp(1 - (y - top) / depth);
            // Two waves, the second shorter, running the other way twice as fast: both come round each period.
            y += w * amp * (Math.sin((TAU * x) / wave - phase) + 0.5 * Math.sin((TAU * x) / (wave * 0.53) + 2 * phase)) / 1.5;
          }
          out[j] = s[0] * x + s[2] * y + s[4];
          out[j + 1] = s[1] * x + s[3] * y + s[5];
        }
      });
      return p.moved!;
    };

    const rasterise = (t: number) => {
      if (base && !based) {
        ids.fill(0);
        for (let i = 0; i < firstMoving; i++) raster.fill(paints[i].rings, paints[i].evenodd, i + 1);
        base.set(ids);
        based = true;
      }
      if (base) ids.set(base);
      else ids.fill(0);
      for (let i = Math.max(0, firstMoving); i < paints.length; i++) {
        const p = paints[i];
        raster.fill(p.moved ? place(p, t) : p.rings, p.evenodd, i + 1);
      }
    };

    // The outline style: each paint's edges walked one cell a step along the way they mostly run, each cell the
    // character for the line's slope there. Later paints draw over earlier ones.
    const sure = new Uint32Array(cols * rows);
    let stamp = 0;
    const outlines = (t: number) => {
      stamp++;
      chars.fill(EMPTY);
      slots.fill(-1);
      owner.fill(-1);
      for (const c of cover) c.fill(0);
      const set = (x: number, y: number, ch: number, i: number) => {
        if (x < 0 || y < 0 || x >= cols || y >= rows) return;
        const k = y * cols + x;
        chars[k] = ch;
        slots[k] = slotOf[i + 1];
        owner[k] = partOfPaint[i + 1];
      };
      // A segment, its slope taken from tx, ty: its own way, or for a short piece of a curve, the curve's way round it.
      const segment = (x0: number, y0: number, x1: number, y1: number, tx: number, ty: number, i: number) => {
        const dx = x1 - x0, dy = y1 - y0;
        if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
        const slope = (Math.atan2(Math.abs(ty) * aspect, Math.abs(tx)) * 180) / Math.PI;
        const rising = tx * ty < 0;
        const across = Math.abs(dx) >= Math.abs(dy);
        const a = across ? Math.min(x0, x1) : Math.min(y0, y1), b = across ? Math.max(x0, x1) : Math.max(y0, y1);
        for (let c = Math.floor(a); c <= Math.floor(b - 1e-9) || c === Math.floor(a); c++) {
          // The line at the middle of this column (or row), kept on the segment.
          const m = clamp(c + 0.5, a, b);
          const x = across ? m : x0 + ((m - y0) * dx) / dy, y = across ? y0 + ((m - x0) * dy) / dx : m;
          const cx = Math.floor(x), cy = Math.floor(y), at = y - cy;
          // A flat line near a cell's top reads best as the row above's underscore.
          // Where the line truly crosses this column's middle, it wins the cell over a neighbour's end that only
          // touches it.
          const exact = m === c + 0.5;
          const up = slope < 15 && at < 0.3;
          const tx0 = cx, ty0 = up ? cy - 1 : cy;
          if (tx0 < 0 || ty0 < 0 || tx0 >= cols || ty0 >= rows) continue;
          const k = ty0 * cols + tx0;
          if (!exact && sure[k] === stamp) continue;
          if (exact) sure[k] = stamp;
          set(tx0, ty0, charOf[i + 1] || (up ? 95 : lineChar(slope, rising, at)), i);
        }
      };
      paints.forEach((p, i) => {
        const rings = p.moved ? place(p, t) : p.rings;
        rings.forEach((r, k) => {
          const n = r.length >> 1;
          const shut = p.closed ? p.closed[k] : true;
          const segs = shut ? n : n - 1;
          // How far along the line each point is, on the page, in columns.
          const along = new Float64Array(n + 1);
          for (let j = 0; j < segs; j++) {
            const q = (j + 1) % n;
            along[j + 1] = along[j] + Math.hypot((r[2 * q] - r[2 * j]) / sx, ((r[2 * q + 1] - r[2 * j + 1]) / sy) * aspect);
          }
          const total = along[segs];
          // The point `d` columns along the line, round again on a closed one.
          const at = (d: number): [number, number] => {
            d = shut ? ((d % total) + total) % total : clamp(d, 0, total);
            let lo = 0, hi = segs;
            while (hi - lo > 1) {
              const mid = (lo + hi) >> 1;
              if (along[mid] <= d) lo = mid;
              else hi = mid;
            }
            const q = (lo + 1) % n, f = (d - along[lo]) / (along[lo + 1] - along[lo] || 1);
            return [(r[2 * lo] + (r[2 * q] - r[2 * lo]) * f) / sx, (r[2 * lo + 1] + (r[2 * q + 1] - r[2 * lo + 1]) * f) / sy];
          };
          for (let j = 0; j < segs; j++) {
            const q = (j + 1) % n;
            const x0 = r[2 * j] / sx, y0 = r[2 * j + 1] / sy, x1 = r[2 * q] / sx, y1 = r[2 * q + 1] / sy;
            let tx = x1 - x0, ty = y1 - y0;
            if (along[j + 1] - along[j] < 3 && total > 4) {
              const mid = (along[j] + along[j + 1]) / 2, a = at(mid - 1.5), b = at(mid + 1.5);
              tx = b[0] - a[0];
              ty = b[1] - a[1];
            }
            segment(x0, y0, x1, y1, tx, ty, i);
          }
        });
      });
    };

    // Each cell from its samples: the colour most of it is, that colour's ink in 2 by 4 blocks (so where two colours
    // meet, the edge between them shows, in one ink too), and how much of it each part with a material covers.
    const cellsOf = (mono: boolean) => {
      for (const c of cover) c.fill(0);
      for (let cy = 0; cy < rows; cy++)
        for (let cx = 0; cx < cols; cx++) {
          const k = cy * cols + cx;
          const at0 = cy * sy * W + cx * sx;
          let nt = 0, np = 0;
          for (let yy = 0; yy < sy; yy++)
            for (let xx = 0, i = at0 + yy * W; xx < sx; xx++, i++) {
              const id = ids[i];
              if (!id) continue;
              const pt = partOfPaint[id];
              if (pt >= 0) {
                if (!partVotes[pt]) seenParts[np++] = pt;
                partVotes[pt]++;
              }
              // White left out in one ink casts no vote.
              if (mono && knock[id]) continue;
              const g = groupOf[id];
              if (!votes[g]) touched[nt++] = g;
              votes[g]++;
            }
          let best = -1, bv = 0;
          for (let q = 0; q < nt; q++) {
            const g = touched[q];
            if (votes[g] > bv) (bv = votes[g]), (best = g);
            votes[g] = 0;
          }
          let bp = -1, pv = 0;
          for (let q = 0; q < np; q++) {
            const pt = seenParts[q];
            cover[pt][k] = partVotes[pt] / (per * 8);
            if (partVotes[pt] > pv) (pv = partVotes[pt]), (bp = pt);
            partVotes[pt] = 0;
          }
          owner[k] = bp;
          if (best < 0) {
            chars[k] = EMPTY;
            slots[k] = -1;
            continue;
          }
          // The winning colour's ink, block by block, the solid character of what it is, and its one character if a
          // part gave it one.
          let solid = 0, one = 0;
          for (let by = 0; by < 4; by++)
            for (let bx = 0; bx < 2; bx++) {
              let sum = 0;
              for (let yy = 0; yy < bh; yy++)
                for (let xx = 0, i = at0 + (by * bh + yy) * W + bx * bw; xx < bw; xx++, i++) {
                  const id = ids[i];
                  if (!id || groupOf[id] !== best || (mono && knock[id])) continue;
                  sum += alpha[id];
                  if (!solid) (solid = fillOf[id]), (one = charOf[id]);
                }
              v[by * 2 + bx] = sum / per;
            }
          const picked = pick(v, style, solid || fillCode);
          chars[k] = one && picked !== EMPTY ? one : picked;
          slots[k] = chars[k] === EMPTY ? -1 : groupSlot[best];
        }
    };

    let still: { colour: Uint16Array; colourSlots: Int16Array; mono: Uint16Array; owners: Int16Array; covers: Float32Array[] } | null = null;
    return {
      render(t, mono) {
        if (!moving || (firstMoving < 0 && glints.size)) {
          // Nothing moves but glints: the cells are drawn once for each ink.
          if (!still) {
            if (outline) outlines(0);
            else {
              rasterise(0);
              cellsOf(false);
            }
            const colour = chars.slice(), colourSlots = slots.slice(), owners = owner.slice(), covers = cover.map((c) => c.slice());
            if (!outline) cellsOf(true);
            still = { colour, colourSlots, mono: chars.slice(), owners, covers };
          }
          chars.set(mono ? still.mono : still.colour);
          slots.set(still.colourSlots);
          owner.set(still.owners);
          still.covers.forEach((c, i) => cover[i].set(c));
        } else if (outline) outlines(t);
        else {
          rasterise(t);
          cellsOf(mono);
        }
        // Glints: a band leaning like a slash crosses each glinting part, solid cells turning to slashes.
        if (glints.size) {
          for (const [pi, g] of glints) {
            const b = partBox.get(pi);
            if (!b) continue;
            // As the library's logos glint: first at half a second, two seconds across (less when it comes more often
            // than every 2.5 s, so it rests between), leaning like a slash.
            const half = clamp(b.cols / 8, 2, 5), lean = 0.9, sweep = Math.min(2, g.every * 0.8), first = 0.5;
            const lo = b.x - half, span = b.cols + lean * b.rows + 2 * half;
            const since = t + g.offset - first;
            const u = (((since % g.every) + g.every) % g.every) / sweep;
            if (!(u < 1)) continue;
            const at = lo + span * u;
            for (let y = Math.max(0, b.y); y < Math.min(rows, b.y + b.rows); y++)
              for (let x = Math.max(0, b.x); x < Math.min(cols, b.x + b.cols); x++) {
                const k = y * cols + x;
                if (owner[k] !== pi || chars[k] === EMPTY) continue;
                const d = Math.abs(x - b.x + lean * (y - b.y) - (at - b.x));
                let kk = d < half ? 1 - d / half : 0;
                kk = kk * kk * (3 - 2 * kk);
                if (kk > 0.55 && (SOLID.has(chars[k]) || chars[k] === fillCode)) chars[k] = SLASH;
                if (slots[k] >= 0 && runs === 3) slots[k] = (slots[k] % (light.length / 3)) + (kk > 0.6 ? 2 : kk > 0.25 ? 1 : 0) * (light.length / 3);
              }
          }
        }
        return { chars, slots, parts: owner, cover };
      },
    };
  };

  return { cols, rows, light, dark, runs, moving, periods, textured, draw };
}

// The character for a cell's ink in its 2 by 4 blocks, by the style.
function pick(v: Float64Array, style: VectorStyle, solid: number): number {
  if (style === "blocks") {
    const q = ((v[0] + v[2]) / 2 >= 0.5 ? 1 : 0) | ((v[1] + v[3]) / 2 >= 0.5 ? 2 : 0) | ((v[4] + v[6]) / 2 >= 0.5 ? 4 : 0) | ((v[5] + v[7]) / 2 >= 0.5 ? 8 : 0);
    return q ? QUARTERS.charCodeAt(q) : EMPTY;
  }
  if (style === "braille") {
    // Dots 1, 2, 3 and 7 down the left, 4, 5, 6 and 8 down the right.
    const bits = [0x01, 0x08, 0x02, 0x10, 0x04, 0x20, 0x40, 0x80];
    let b = 0;
    for (let i = 0; i < 8; i++) if (v[i] >= 0.5) b |= bits[i];
    return b ? 0x2800 + b : EMPTY;
  }
  let min = 1, max = 0;
  for (let i = 0; i < 8; i++) {
    if (v[i] < min) min = v[i];
    if (v[i] > max) max = v[i];
  }
  if (max < 0.1) return EMPTY;
  if (min > 0.8) return solid;
  let best = 0, bd = Infinity;
  for (let g = 0; g < GLYPH_CODES.length; g++) {
    let d = 0;
    for (let i = 0; i < 8; i++) d += (v[i] - GLYPH_INK[g * 8 + i]) ** 2;
    if (d < bd) (bd = d), (best = g);
  }
  // An empty cell beats a character that is mostly in the wrong place.
  let e = 0;
  for (let i = 0; i < 8; i++) e += v[i] * v[i];
  return e < bd ? EMPTY : GLYPH_CODES[best] === 56 ? solid : GLYPH_CODES[best];
}

// --- options into a plan ------------------------------------------------------------------------

function planOptions(o: Record<string, unknown>, drawing: boolean, aspect: number): PlanOptions {
  if (o === null || typeof o !== "object") fail(`${drawing ? "drawSvg" : "fromSvg"} takes options as an object, such as { width: 40, "#star": "spin" }`);
  const parts: PartPlan[] = [];
  let rank = 0;
  for (const key of Object.keys(o)) {
    if (key === "*" || key.startsWith("#") || key.startsWith(".")) {
      if (key.length < 2 && key !== "*") fail(`a part's name takes an id, a class or a colour after "${key}", such as "#cup" or ".flame"`);
      // "*" first, then colours, classes and ids, each in the order given: the later and more specific win.
      const kind = key === "*" ? 0 : /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key) ? 1 : key[0] === "." ? 2 : 3;
      parts.push(partOf(key, o[key], kind * 1000 + rank++));
    } else if (!OPTIONS.includes(key) || (drawing && ["width", "cols", "rows", "name", "note", "category", "fps", "still", "ground"].includes(key)) || (!drawing && key === "region"))
      fail(`${drawing ? "drawSvg" : "fromSvg"} has no option named ${JSON.stringify(key)}: it takes ${and(OPTIONS.filter((k) => (drawing ? !["width", "cols", "rows", "name", "note", "category", "fps", "still", "ground"].includes(k) : k !== "region")))}, and parts by "#id", ".class", a colour or "*"`);
  }
  const m = o.margin;
  const margin =
    m === undefined
      ? drawing
        ? [0, 0]
        : [2, 1]
      : typeof m === "number"
        ? [m, m]
        : Array.isArray(m) && m.length === 2
          ? [m[0], m[1]]
          : fail(`margin takes a number of cells, or [columns, rows], not ${JSON.stringify(m)}`);
  for (const v of margin) if (!Number.isInteger(v) || v < 0) fail(`margin takes whole numbers of 0 or more, not ${JSON.stringify(m)}`);
  const style = (o.style ?? "logo") as VectorStyle;
  if (!STYLES.includes(style)) fail(`style takes ${and(STYLES.map((s) => JSON.stringify(s)))}, not ${JSON.stringify(o.style)}`);
  for (const p of parts)
    if (p.material && style === "outline") fail(`${p.key}'s material has nothing to fill in the "outline" style, which draws only edges: use "logo", "blocks" or "braille"`);
  const fit = o.fit ?? "ink";
  if (fit !== "ink" && fit !== "viewBox") fail(`fit takes "ink" or "viewBox", not ${JSON.stringify(o.fit)}`);
  if (o.color !== undefined && typeof o.color !== "boolean") fail(`color takes true (the drawing's own colours) or false (the page's), not ${JSON.stringify(o.color)}`);
  const width = whole(o.width, "width", 3, MAX.cols);
  const cols = whole(o.cols, "cols", 1, MAX.cols), rows = whole(o.rows, "rows", 1, MAX.rows);
  if (width !== undefined && cols !== undefined) fail("fromSvg takes width or cols, not both: width sizes it by its shape, cols with rows fixes it");
  return {
    width,
    cols,
    rows,
    margin: margin as [number, number],
    fit: fit as "ink" | "viewBox",
    style,
    fill: oneChar(o.fill, "fill") ?? "8",
    color: (o.color as boolean | undefined) ?? true,
    line: above0(o.line, "line") ?? 0.4,
    aspect,
    parts,
  };
}

const svgOf = (svg: string | Svg): Svg => {
  if (typeof svg === "string") return parseSvg(svg);
  if (!svg || typeof svg !== "object" || !Array.isArray(svg.shapes) || !Array.isArray(svg.viewBox))
    fail("fromSvg takes SVG markup as a string, or what parseSvg() made of it");
  return svg;
};

/**
 * A part's cells from how much of each cell it covers, as ascii.rest/kit's materials work out an area's: in where it
 * covers half a cell, its edge, which way is in there (from the cover's slope), and each cell's depth (a chamfer
 * distance, a row counting 2).
 */
export function partCells(cover: Float32Array, cols: number, rows: number, aspect = 2): PartCells {
  const n = cols * rows;
  const inside = new Uint8Array(n);
  const list: number[] = [];
  let x0 = cols, y0 = rows, x1 = 0, y1 = 0;
  const top = new Int16Array(cols).fill(-1), bottom = new Int16Array(cols).fill(-1), left = new Int16Array(rows).fill(-1), right = new Int16Array(rows).fill(-1);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (cover[i] < 0.5) continue;
      inside[i] = 1;
      list.push(i);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x + 1);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y + 1);
      if (top[x] < 0) top[x] = y;
      bottom[x] = y;
      if (left[y] < 0) left[y] = x;
      right[y] = x;
    }
  const cv = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : cover[y * cols + x]);
  const isIn = (x: number, y: number) => (cv(x, y) >= 0.5 ? 1 : 0);
  const border = new Uint8Array(n), nx = new Float32Array(n), ny = new Float32Array(n);
  for (const i of list) {
    const x = i % cols, y = (i - x) / cols;
    if (isIn(x - 1, y) && isIn(x + 1, y) && isIn(x, y - 1) && isIn(x, y + 1)) continue;
    border[i] = 1;
    // In is up the cover's slope, a Sobel of the cells round it.
    let gx = cv(x + 1, y - 1) + 2 * cv(x + 1, y) + cv(x + 1, y + 1) - cv(x - 1, y - 1) - 2 * cv(x - 1, y) - cv(x - 1, y + 1);
    let gy = (cv(x - 1, y + 1) + 2 * cv(x, y + 1) + cv(x + 1, y + 1) - cv(x - 1, y - 1) - 2 * cv(x, y - 1) - cv(x + 1, y - 1)) / aspect;
    if (Math.abs(gx) + Math.abs(gy) < 1e-6) {
      gx = isIn(x + 1, y) - isIn(x - 1, y);
      gy = (isIn(x, y + 1) - isIn(x, y - 1)) / aspect;
    }
    const l = Math.hypot(gx, gy) || 1;
    nx[i] = gx / l;
    ny[i] = gy / l;
  }
  // Depth: two passes of a chamfer, a column 1, a row `aspect`, a diagonal between.
  const depth = new Float32Array(n);
  const D = Math.hypot(1, aspect), far = 4 * (cols + rows * aspect);
  for (const i of list) depth[i] = far;
  const d = (x: number, y: number, w: number) => (x < 0 || x >= cols || y < 0 || y >= rows ? 0 : depth[y * cols + x]) + w;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = y * cols + x;
      if (inside[i]) depth[i] = Math.min(depth[i], d(x - 1, y, 1), d(x, y - 1, aspect), d(x - 1, y - 1, D), d(x + 1, y - 1, D));
    }
  for (let y = y1 - 1; y >= y0; y--)
    for (let x = x1 - 1; x >= x0; x--) {
      const i = y * cols + x;
      if (inside[i]) depth[i] = Math.min(depth[i], d(x + 1, y, 1), d(x, y + 1, aspect), d(x + 1, y + 1, D), d(x - 1, y + 1, D));
    }
  let maxDepth = 0;
  for (const i of list) {
    depth[i] = border[i] ? 0 : Math.max(0, depth[i] - 1);
    maxDepth = Math.max(maxDepth, depth[i]);
  }
  const empty = x1 <= x0;
  return {
    cols, rows, list: Int32Array.from(list), inside, cover, border, has: (x, y) => isIn(Math.floor(x), Math.floor(y)) === 1, nx, ny, depth, maxDepth,
    x0: empty ? 0 : x0, y0: empty ? 0 : y0, x1: empty ? 0 : x1, y1: empty ? 0 : y1,
    top, bottom, left, right, level: null, room: null, cavity: null, open: false, char: null,
    placed: { test: (x, y) => isIn(Math.floor(x), Math.floor(y)) === 1, x0: empty ? 0 : x0, y0: empty ? 0 : y0, x1: empty ? 0 : x1, y1: empty ? 0 : y1 },
  };
}

// The parts a material or a piece fills, drawn over the drawing's cells in the grid, the backmost first. The drawing
// sits at ox, oy in the grid.
function fillParts(s: Surface, ox: number, oy: number, cols: number, rows: number, r: Rendered, t: number, fills: readonly Filling[]) {
  for (const f of fills) {
    const own = r.cover[f.part];
    if (!f.cells || f.moves) {
      // The part's cover over the whole grid; worked out once for a part that stays where it is.
      const cover = (f.cover ??= new Float32Array(s.cols * s.rows));
      cover.fill(0);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const v = own[y * cols + x];
          const i = v > 0 && r.parts[y * cols + x] === f.part ? s.index(ox + x, oy + y) : -1;
          if (i >= 0) cover[i] = v;
        }
      f.cells = partCells(cover, s.cols, s.rows, s.aspect);
      f.run = f.material ? f.material.prepare(f.cells) : null;
    }
    const c = f.cells;
    if (!c.list.length) continue;
    if (f.sampler) {
      // A piece: centred on the part, tiled, in the part's cells.
      const g = f.sampler.at(t, { paper: s.paper, mono: s.mono });
      const gx0 = Math.round((c.x0 + c.x1 - g.cols) / 2), gy0 = Math.round((c.y0 + c.y1 - g.rows) / 2);
      for (const k of c.list) {
        const x = k % s.cols, y = (k - x) / s.cols;
        const gi = ((((y - gy0) % g.rows) + g.rows) % g.rows) * g.cols + ((((x - gx0) % g.cols) + g.cols) % g.cols);
        const ch = g.chars[gi];
        s.put(k, ch, ch === EMPTY ? NONE : f.index(g.colors[gi], s.paper));
      }
    } else if (f.run) {
      // A material: the part's own characters taken out, so what was under it is what it sees, then its frame.
      for (const k of c.list) s.put(k, EMPTY, NONE);
      const under = (f.under ??= { chars: new Uint16Array(s.chars.length), colors: new Uint8Array(s.colors.length) });
      under.chars.set(s.chars);
      under.colors.set(s.colors);
      const paper = s.paper;
      f.run(t, { s, paper, mono: s.mono, color: (i) => f.index(i, paper), under });
    }
  }
}

// --- the maker and the drawing function -----------------------------------------------------------

/**
 * A piece from an SVG: draw anything in Figma, Illustrator, Inkscape or any editor, export it, and pass the markup
 * (or what parseSvg() made of it). It is drawn in its own colours, each cell the character whose shape best matches
 * its edge, and plays wherever a piece does.
 *
 * Any key of the options that starts "#" or "." names a part, by an element's id, its class, or a colour it is
 * painted in ("#e11d48"); "*" names the whole drawing. Give a part a motion word, several in a list, a function of t
 * giving its pose (moved, turned, grown) for any motion of your own, a material (water(), glass() and the rest from
 * ascii.rest/kit's materials, or any piece, which plays inside it), false to leave it out, or { motion, period, every,
 * amount, origin, offset, stagger, material, fill, color, hide }. A name on a group moves the group as one; a class on
 * several elements moves each about its own centre; a group's motion carries the motions of what is inside it.
 * `origin` sets what a part turns about: a clock hand's pivot, a pendulum's top. `parseSvg(markup).parts` lists the
 * names a drawing answers to.
 *
 * Its loop is the least common multiple of its motions' and materials' periods when that is 60 seconds or less, and
 * none when a motion function has no period. It is 30 frames a second when anything moves, else a still.
 *
 * Throws, saying what to change, for markup it can't read, a drawing with nothing to draw, a part that names nothing
 * (with the parts the drawing has), and any option it can't take.
 *
 *   export default fromSvg(star, { width: 32, "#star": ["spin", "glint"] });
 *   export default fromSvg(drawingOfACup, { "#water": water(), "#cup": glass(), ".bubble": "rise" });
 *   export default fromSvg(pendulum, { "#bob": { motion: "sway", amount: 0.4, origin: "top" } });
 *   export default fromSvg(ball, { "#ball": (t) => ({ y: -6 * Math.abs(Math.sin(t * 3)) }) });
 */
export function fromSvg(svg: string | Svg, options: VectorOptions = {}): KitPiece {
  const doc = svgOf(svg);
  const o = planOptions(options as Record<string, unknown>, false, 2);
  const p = plan(doc, o);
  const opts = options as VectorOptions;
  const fps = whole(opts.fps, "fps", 0, 60);
  const still = opts.still === undefined ? undefined : typeof opts.still === "number" && Number.isFinite(opts.still) && opts.still >= 0 ? opts.still : fail(`still takes a number of seconds of 0 or more, not ${String(opts.still)}`);
  if (opts.ground !== undefined && !isHex(opts.ground)) fail(`ground takes a colour as #rrggbb, not ${JSON.stringify(opts.ground)}`);
  if (opts.name !== undefined && (typeof opts.name !== "string" || !opts.name.trim())) fail(`name takes one line, such as "heart", not ${JSON.stringify(opts.name)}`);

  // What fills parts: materials bring their colours for each page, pieces their palettes; all join the drawing's.
  const sources = p.textured.map(({ part, material, moves }) => ({ part, moves, material: isPartMaterial(material) ? material : null, src: isPartMaterial(material) ? null : asPiece(material as Source) }));
  const mine = [...p.light, ...p.dark];
  const lists = sources.map((f) => (f.material ? [...f.material.colors.light, ...f.material.colors.dark].map((c) => c.toLowerCase()) : f.src!.meta.palette ? [...f.src!.meta.palette] : undefined));
  let palette: string[] | undefined;
  let maps: Uint8Array[] = [];
  let inkAt: { light: number; dark: number } | null = null;
  if (o.color && (mine.length > 0 || lists.some(Boolean))) {
    // The drawing's colours first, then each fill's; a piece in one ink (undefined) is drawn in INK.
    const m = mergePalettes([mine.length ? mine : undefined, ...lists]);
    palette = m.palette;
    maps = m.maps;
    inkAt = m.ink;
  }
  // A slot's index in the palette, by theme, and the ink of anything with no colour of its own among colours.
  const slotIndex = (slot: number, paper: boolean) => maps[0][(paper ? 0 : p.light.length) + slot];
  const inkIndex = (paper: boolean) => (inkAt ? (paper ? inkAt.light : inkAt.dark) : mine.length ? slotIndex(0, paper) : 0);
  // A fill's colour i on this page: a material's i of its light or dark list, a piece's palette index i.
  const indexOf = (n: number, f: (typeof sources)[number]) => (i: number, paper: boolean) => {
    const map = maps[n + 1];
    if (!palette || !map) return NONE;
    if (f.material) return map[(paper ? 0 : f.material.colors.light.length) + Math.min(i, f.material.colors.light.length - 1)] ?? NONE;
    return i === NONE ? inkIndex(paper) : (map[i] ?? NONE);
  };

  // The loop: the motions' periods and each fill's own, by the kit's time rule: a moving piece with no loop of its own
  // counts as having the drawing's periods, and leaves the loop unknown when the drawing has none.
  const loops = [...p.periods];
  let unknown = false;
  for (const f of sources) {
    const l = f.material ? f.material.period : f.src!.meta.loop;
    if (l !== undefined && l > 0) loops.push(l);
    else if (f.src && f.src.meta.fps > 0 && !p.periods.length) unknown = true;
  }
  const moving = p.moving || sources.some((f) => (f.src ? f.src.meta.fps > 0 : f.material!.period !== undefined));
  const loop = moving && !unknown ? loopOf(loops) : undefined;
  const name = (opts.name ?? doc.title ?? "vector").trim().toLowerCase().slice(0, 72);

  return piece(
    {
      name,
      note: opts.note,
      category: opts.category ?? "shapes",
      cols: p.cols,
      rows: p.rows,
      fps: fps ?? (moving ? 30 : 0),
      ...(palette ? { palette, ink: { light: inkIndex(true), dark: inkIndex(false) } } : {}),
      ...(opts.ground !== undefined ? { ground: opts.ground } : {}),
      ...(loop !== undefined ? { loop } : {}),
      ...(still !== undefined ? { still } : {}),
    },
    {
      setup: () => {
        const drawer = p.draw();
        // Each play has its own players for its pieces and its own drawings for its materials.
        const fills: Filling[] = sources.map((f, n) => ({
          part: f.part,
          material: f.material,
          sampler: f.src ? sample(f.src) : null,
          moves: f.moves,
          cover: null,
          cells: null,
          run: null,
          under: null,
          index: indexOf(n, f),
        }));
        return (t, s, ctx) => {
          const r = drawer.render(t, ctx.mono);
          for (let k = 0; k < r.chars.length; k++) s.put(k, r.chars[k], r.slots[k] < 0 || !palette ? NONE : slotIndex(r.slots[k], ctx.paper));
          if (fills.length) fillParts(s, 0, 0, p.cols, p.rows, r, t, fills);
        };
      },
    },
  );
}

// Plans for drawSvg, kept by drawing and options, so drawing every frame reads and fits the svg once.
interface Entry {
  plan: Plan;
  drawer: Drawer;
  fills: Filling[];
  // The grid it is drawing into this call, whose palette the colours are found in.
  target: Surface | null;
}
const parsed = new Map<string, Svg>();
const plans = new WeakMap<Svg, Map<string, Entry>>();
const identities = new WeakMap<object, number>();
let identity = 0;
// Options as a key: pieces, materials and motion functions, which JSON can't write, by a number for each.
const keyOf = (o: Record<string, unknown>, s: Surface, region: Region) =>
  JSON.stringify([s.cols, s.rows, s.aspect, region, o], (_, v) =>
    typeof v === "function" || (v && typeof v === "object" && !Array.isArray(v) && (isSource(v) || isPartMaterial(v)))
      ? `#${identities.get(v) ?? (identities.set(v, ++identity), identity)}`
      : v,
  );

/**
 * Draws an SVG into a grid you already have, at t seconds: fitted inside `region` (all of it by default) and centred,
 * its colours found in the grid's palette (the nearest of them), or in the grid's one ink. Parts move and fill as in
 * fromSvg(). The svg is read and fitted once for each drawing and options, then reused, so call it every frame. A
 * motion function is told apart by which function it is, so make it once, outside the drawing: one written inside it
 * is a new function each frame, and the drawing is fitted again each time.
 *
 *   piece({ name: "badge", cols: 40, rows: 12, palette: ["#e11d48"] }, (t, s) => drawSvg(s, heart, t, { "#heart": "pulse" }));
 */
export function drawSvg(s: Surface, svg: string | Svg, t: number, options: DrawSvgOptions = {}): void {
  if (!(s instanceof Surface)) fail("drawSvg takes the grid to draw into first: drawSvg(s, svg, t)");
  let doc: Svg;
  if (typeof svg === "string") {
    doc = parsed.get(svg) ?? parseSvg(svg);
    if (!parsed.has(svg)) {
      if (parsed.size >= 16) parsed.delete(parsed.keys().next().value!);
      parsed.set(svg, doc);
    }
  } else doc = svgOf(svg);
  const region = s.clip(options.region);
  if (!region.cols || !region.rows) return;
  const key = keyOf(options as Record<string, unknown>, s, region);
  let byKey = plans.get(doc);
  if (!byKey) plans.set(doc, (byKey = new Map()));
  let entry = byKey.get(key);
  if (!entry) {
    const { region: _, ...rest } = options;
    const o = planOptions(rest as Record<string, unknown>, true, s.aspect);
    o.cols = region.cols;
    o.rows = region.rows;
    const p = plan(doc, o);
    const made: Entry = { plan: p, drawer: p.draw(), fills: [], target: null };
    // Colours are found in the grid's own palette, the nearest of them; none on a grid in one ink.
    const find = (c: string | undefined) => (made.target?.palette && c ? made.target.resolve(c) : NONE);
    made.fills = p.textured.map(({ part, material, moves }) => {
      const m = isPartMaterial(material) ? material : null;
      const sampler = m ? null : sample(material as Source);
      return {
        part,
        material: m,
        sampler,
        moves,
        cover: null,
        cells: null,
        run: null,
        under: null,
        index: (i: number, paper: boolean) => (m ? find((paper ? m.colors.light : m.colors.dark)[i]) : i === NONE || !sampler!.palette ? NONE : find(sampler!.palette[i])),
      };
    });
    entry = made;
    if (byKey.size >= 8) byKey.delete(byKey.keys().next().value!);
    byKey.set(key, entry);
  }
  const { plan: p, drawer, fills } = entry;
  entry.target = s;
  const r = drawer.render(Number.isFinite(t) ? t : 0, s.mono);
  const theme = s.paper ? p.light : p.dark;
  for (let y = 0; y < p.rows; y++)
    for (let x = 0; x < p.cols; x++) {
      const k = y * p.cols + x;
      if (r.chars[k] === EMPTY) continue;
      const i = s.index(region.x + x, region.y + y);
      if (i >= 0) s.put(i, r.chars[k], r.slots[k] < 0 || !s.palette ? NONE : s.resolve(theme[r.slots[k]]));
    }
  if (fills.length) fillParts(s, region.x, region.y, p.cols, p.rows, r, t, fills);
}
